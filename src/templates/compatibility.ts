import type {
  FragmentInputPort,
  InputPort,
  InputPortSummary,
  LiteralInputPort,
  OutputPortSummary,
  OutputPort,
  RawCodeInputPort,
  RegionKind,
  StrictOutputPort,
  StrictUnionPortInput,
  TypeDescriptor,
  UnionInputPort
} from "./graphTypes.js";
import type { Exact } from "type-fest";

type StrictPortInput<T extends InputPort, P extends Omit<T, "kind">> =
  P & Exact<Omit<T, "kind">, P>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function schemaType(schema: unknown): string | undefined {
  return isRecord(schema) && typeof schema.type === "string" ? schema.type : undefined;
}

function schemaTypes(schema: unknown): string[] {
  if (!isRecord(schema)) return [];
  if (typeof schema.type === "string") return [schema.type];
  if (Array.isArray(schema.type)) return schema.type.filter((item): item is string => typeof item === "string");
  return [];
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function schemaConstCompatible(expected: unknown, actual: unknown): boolean {
  if (!isRecord(expected) || !Object.prototype.hasOwnProperty.call(expected, "const")) return true;
  if (!isRecord(actual) || !Object.prototype.hasOwnProperty.call(actual, "const")) return false;
  return valuesEqual(expected.const, actual.const);
}

function schemaEnumCompatible(expected: unknown, actual: unknown): boolean {
  if (!isRecord(expected) || !Array.isArray(expected.enum)) return true;
  if (!isRecord(actual) || !Array.isArray(actual.enum)) return false;
  const expectedValues = expected.enum as unknown[];
  const actualValues = actual.enum as unknown[];
  return actualValues.every(actualValue => expectedValues.some(expectedValue => valuesEqual(expectedValue, actualValue)));
}

function schemasCompatible(expected: unknown, actual: unknown): boolean {
  if (expected === undefined) return true;
  if (actual === undefined) return false;

  if (isRecord(expected) && Array.isArray(expected.anyOf)) {
    return expected.anyOf.some(option => schemasCompatible(option, actual));
  }

  if (isRecord(expected) && Array.isArray(expected.oneOf)) {
    return expected.oneOf.some(option => schemasCompatible(option, actual));
  }

  if (isRecord(actual) && Array.isArray(actual.anyOf)) {
    return actual.anyOf.every(option => schemasCompatible(expected, option));
  }

  if (isRecord(actual) && Array.isArray(actual.oneOf)) {
    return actual.oneOf.every(option => schemasCompatible(expected, option));
  }

  if (!schemaConstCompatible(expected, actual) || !schemaEnumCompatible(expected, actual)) return false;

  const expectedTypes = schemaTypes(expected);
  const actualTypes = schemaTypes(actual);

  if (expectedTypes.length === 0) return false;
  if (actualTypes.length === 0) return false;
  if (!actualTypes.every(actualType => expectedTypes.includes(actualType))) return false;

  if (expectedTypes.includes("array")) {
    const expectedItems = isRecord(expected) ? expected.items : undefined;
    const actualItems = isRecord(actual) ? actual.items : undefined;
    return expectedItems === undefined || schemasCompatible(expectedItems, actualItems);
  }

  if (expectedTypes.includes("object")) {
    const expectedProperties = isRecord(expected) && isRecord(expected.properties) ? expected.properties : undefined;
    const actualProperties = isRecord(actual) && isRecord(actual.properties) ? actual.properties : undefined;
    if (!expectedProperties) return true;
    if (!actualProperties) return false;

    for (const [key, expectedProperty] of Object.entries(expectedProperties)) {
      if (!schemasCompatible(expectedProperty, actualProperties[key])) return false;
    }
    return true;
  }

  return actualTypes.every(actualType => ["string", "number", "integer", "boolean", "null"].includes(actualType));
}

function splitTopLevelUnion(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of value) {
    if (char === "<" || char === "(") depth += 1;
    if (char === ">" || char === ")") depth -= 1;

    if (char === "|" && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function normalizeTsType(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function stripOuterParens(value: string): string {
  let current = normalizeTsType(value);
  while (current.startsWith("(") && current.endsWith(")")) {
    current = normalizeTsType(current.slice(1, -1));
  }
  return current;
}

function arrayElementType(value: string): string | undefined {
  const normalized = stripOuterParens(value).replace(/^readonly\s+/u, "");
  if (normalized.endsWith("[]")) return normalized.slice(0, -2).trim();

  const arrayMatch = normalized.match(/^(?:ReadonlyArray|Array)<(.+)>$/u);
  return arrayMatch?.[1]?.trim();
}

function tsTypeCompatible(expected: string | undefined, actual: string | undefined): boolean {
  if (!expected) return true;
  const normalizedExpected = stripOuterParens(expected);
  if (normalizedExpected === "unknown" || normalizedExpected === "any") return true;
  if (!actual) return false;

  const normalizedActual = stripOuterParens(actual);
  if (normalizedExpected === normalizedActual) return true;

  const expectedUnion = splitTopLevelUnion(normalizedExpected);
  if (expectedUnion.length > 1) {
    return expectedUnion.some(option => tsTypeCompatible(option, normalizedActual));
  }

  const actualUnion = splitTopLevelUnion(normalizedActual);
  if (actualUnion.length > 1) {
    return actualUnion.every(option => tsTypeCompatible(normalizedExpected, option));
  }

  const expectedElement = arrayElementType(normalizedExpected);
  const actualElement = arrayElementType(normalizedActual);
  if (expectedElement !== undefined) {
    return actualElement !== undefined && tsTypeCompatible(expectedElement, actualElement);
  }

  return false;
}

export function isTypeCompatible(
  expected: TypeDescriptor | undefined,
  actual: TypeDescriptor | undefined
): boolean {
  if (!expected) return true;
  if (expected.ts !== undefined && !tsTypeCompatible(expected.ts, actual?.ts)) return false;
  if (expected.schema !== undefined && !schemasCompatible(expected.schema, actual?.schema)) return false;

  return true;
}

export type SchemaValidationResult =
  | {
      /** Success discriminator. */
      ok: true;
    }
  | {
      /** Failure discriminator. */
      ok: false;
      /** Human-readable validation failure message. */
      message: string;
      /** JSON-path-like location of the invalid value. */
      path: string;
      /** Expected schema or value metadata. */
      expected?: unknown;
      /** Actual value or metadata that failed validation. */
      actual?: unknown;
    };

export function validateJsonSchemaSubset(value: unknown, schema: unknown, path = "$"): SchemaValidationResult {
  if (schema === undefined) return { ok: true };
  if (!isRecord(schema)) {
    return { ok: false, message: "Unsupported schema shape.", path, expected: schema, actual: value };
  }

  if (isRecord(schema) && Object.prototype.hasOwnProperty.call(schema, "const")) {
    return valuesEqual(value, schema.const)
      ? { ok: true }
      : { ok: false, message: "Value does not match const.", path, expected: schema, actual: value };
  }

  if (isRecord(schema) && Array.isArray(schema.enum)) {
    return schema.enum.some(item => valuesEqual(item, value))
      ? { ok: true }
      : { ok: false, message: "Value is not one of the allowed enum values.", path, expected: schema, actual: value };
  }

  if (isRecord(schema) && Array.isArray(schema.anyOf)) {
    return schema.anyOf.some(option => validateJsonSchemaSubset(value, option, path).ok)
      ? { ok: true }
      : { ok: false, message: "Value does not match any allowed schema.", path, expected: schema, actual: value };
  }

  if (isRecord(schema) && Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter(option => validateJsonSchemaSubset(value, option, path).ok);
    return matches.length === 1
      ? { ok: true }
      : { ok: false, message: "Value must match exactly one allowed schema.", path, expected: schema, actual: value };
  }

  const types = schemaTypes(schema);
  if (types.length === 0) {
    return { ok: false, message: "Schema must include a string type.", path, expected: schema, actual: value };
  }

  if (types.length > 1) {
    return types.some(type => validateJsonSchemaSubset(value, { ...schema, type }, path).ok)
      ? { ok: true }
      : { ok: false, message: "Value does not match any allowed schema type.", path, expected: schema, actual: value };
  }

  const type = types[0]!;

  if (type === "null") {
    return value === null
      ? { ok: true }
      : { ok: false, message: "Expected null.", path, expected: schema, actual: value };
  }

  if (type === "array") {
    if (!Array.isArray(value)) {
      return { ok: false, message: "Expected array.", path, expected: schema, actual: value };
    }
    if (schema.items === undefined) return { ok: true };
    for (let index = 0; index < value.length; index += 1) {
      const result = validateJsonSchemaSubset(value[index], schema.items, `${path}[${index}]`);
      if (!result.ok) return result;
    }
    return { ok: true };
  }

  if (type === "object") {
    if (!isRecord(value)) {
      return { ok: false, message: "Expected object.", path, expected: schema, actual: value };
    }
    const properties = isRecord(schema.properties) ? schema.properties : undefined;
    if (!properties) return { ok: true };
    const required = Array.isArray(schema.required) ? schema.required.filter(item => typeof item === "string") : [];

    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        return { ok: false, message: `Missing required property ${key}.`, path: `${path}.${key}`, expected: schema, actual: undefined };
      }
    }

    for (const [key, propertySchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const result = validateJsonSchemaSubset(value[key], propertySchema, `${path}.${key}`);
        if (!result.ok) return result;
      }
    }
    return { ok: true };
  }

  if (type === "integer") {
    return Number.isInteger(value)
      ? { ok: true }
      : { ok: false, message: "Expected integer.", path, expected: schema, actual: value };
  }

  if (["string", "number", "boolean"].includes(type)) {
    return typeof value === type
      ? { ok: true }
      : { ok: false, message: `Expected ${type}.`, path, expected: schema, actual: value };
  }

  return { ok: false, message: `Unsupported schema type ${type}.`, path, expected: schema, actual: value };
}

export function literalPort<const P extends Omit<LiteralInputPort, "kind">>(
  port: StrictPortInput<LiteralInputPort, P>
): LiteralInputPort & P & { readonly kind: "literal" } {
  return { ...port, kind: "literal" } as unknown as LiteralInputPort & P & { readonly kind: "literal" };
}

export function fragmentPort<const P extends Omit<FragmentInputPort, "kind">>(
  port: StrictPortInput<FragmentInputPort, P>
): FragmentInputPort & P & { readonly kind: "fragment" } {
  return { ...port, kind: "fragment" } as unknown as FragmentInputPort & P & { readonly kind: "fragment" };
}

export function fragmentPortOutputKind(port: FragmentInputPort): RegionKind {
  return port.accepts.outputKind ?? port.regionKind;
}

export function rawCodePort<const P extends Omit<RawCodeInputPort, "kind">>(
  port: StrictPortInput<RawCodeInputPort, P>
): RawCodeInputPort & P & { readonly kind: "rawCode" } {
  return { ...port, kind: "rawCode" } as unknown as RawCodeInputPort & P & { readonly kind: "rawCode" };
}

export function unionPort<const P extends Omit<UnionInputPort, "kind">>(
  port: StrictUnionPortInput<P>
): UnionInputPort & P & { readonly kind: "union" } {
  return { ...port, kind: "union" } as unknown as UnionInputPort & P & { readonly kind: "union" };
}

export function outputPort<const P extends OutputPort>(port: StrictOutputPort<P>): OutputPort {
  return port;
}

export function portIsRequired(port: InputPort): boolean {
  return port.required !== false;
}

export function portRegionKind(port: InputPort): RegionKind {
  switch (port.kind) {
    case "union":
      return port.options[0] ? portRegionKind(port.options[0]) : "expression";
    case "literal":
    case "fragment":
    case "rawCode":
      return port.regionKind;
  }
}

export function summarizeInputPort(port: InputPort): InputPortSummary {
  const required = portIsRequired(port);

  switch (port.kind) {
    case "literal":
      return {
        kind: "literal",
        regionKind: port.regionKind,
        required,
        ...(port.description ? { description: port.description } : {}),
        ...(port.schema === undefined ? {} : { schema: port.schema })
      };
    case "fragment":
      return {
        kind: "fragment",
        regionKind: port.regionKind,
        required,
        ...(port.description ? { description: port.description } : {}),
        accepts: {
          outputKind: fragmentPortOutputKind(port),
          ...(port.accepts.type ? { type: port.accepts.type } : {}),
          ...(port.accepts.sourceModelIds ? { sourceModelIds: port.accepts.sourceModelIds } : {})
        }
      };
    case "rawCode":
      return {
        kind: "rawCode",
        regionKind: port.regionKind,
        required,
        ...(port.description ? { description: port.description } : {}),
        ...(port.policy ? { policy: port.policy } : {}),
        ...(port.type ? { type: port.type } : {})
      };
    case "union":
      return {
        kind: "union",
        required,
        ...(port.description ? { description: port.description } : {}),
        options: port.options.map(summarizeInputPort)
      };
  }
}

export function summarizeOutputPort(port: OutputPort): OutputPortSummary {
  return {
    kind: port.kind,
    ...(port.type ? { type: port.type } : {}),
    ...(port.schema === undefined ? {} : { schema: port.schema }),
    ...(port.description ? { description: port.description } : {})
  };
}
