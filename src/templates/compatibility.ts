import type {
  FragmentInputPort,
  InputPort,
  LiteralInputPort,
  OutputPort,
  RawCodeInputPort,
  RegionKind,
  TypeDescriptor,
  UnionInputPort
} from "./graphTypes.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function schemaType(schema: unknown): string | undefined {
  return isRecord(schema) && typeof schema.type === "string" ? schema.type : undefined;
}

function schemasCompatible(expected: unknown, actual: unknown): boolean {
  if (expected === undefined) return true;
  if (actual === undefined) return false;

  const expectedType = schemaType(expected);
  const actualType = schemaType(actual);

  if (!expectedType) return false;
  if (expectedType !== actualType) return false;

  if (expectedType === "array") {
    const expectedItems = isRecord(expected) ? expected.items : undefined;
    const actualItems = isRecord(actual) ? actual.items : undefined;
    return expectedItems === undefined || schemasCompatible(expectedItems, actualItems);
  }

  if (expectedType === "object") {
    const expectedProperties = isRecord(expected) && isRecord(expected.properties) ? expected.properties : undefined;
    const actualProperties = isRecord(actual) && isRecord(actual.properties) ? actual.properties : undefined;
    if (!expectedProperties) return true;
    if (!actualProperties) return false;

    for (const [key, expectedProperty] of Object.entries(expectedProperties)) {
      if (!schemasCompatible(expectedProperty, actualProperties[key])) return false;
    }
    return true;
  }

  return ["string", "number", "boolean", "null"].includes(expectedType);
}

export function isTypeCompatible(
  expected: TypeDescriptor | undefined,
  actual: TypeDescriptor | undefined
): boolean {
  if (!expected) return true;
  if (expected.ts === "unknown") return true;

  if (expected.ts !== undefined) {
    return actual?.ts === expected.ts;
  }

  if (expected.schema !== undefined) {
    return schemasCompatible(expected.schema, actual?.schema);
  }

  return true;
}

export type SchemaValidationResult =
  | { ok: true }
  | { ok: false; message: string; path: string; expected?: unknown; actual?: unknown };

export function validateJsonSchemaSubset(value: unknown, schema: unknown, path = "$"): SchemaValidationResult {
  if (schema === undefined) return { ok: true };
  if (!isRecord(schema)) {
    return { ok: false, message: "Unsupported schema shape.", path, expected: schema, actual: value };
  }

  const type = schemaType(schema);
  if (type === undefined) {
    return { ok: false, message: "Schema must include a string type.", path, expected: schema, actual: value };
  }

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

  if (["string", "number", "boolean"].includes(type)) {
    return typeof value === type
      ? { ok: true }
      : { ok: false, message: `Expected ${type}.`, path, expected: schema, actual: value };
  }

  return { ok: false, message: `Unsupported schema type ${type}.`, path, expected: schema, actual: value };
}

export function literalPort(port: Omit<LiteralInputPort, "kind">): LiteralInputPort {
  return { ...port, kind: "literal" };
}

export function fragmentPort(port: Omit<FragmentInputPort, "kind">): FragmentInputPort {
  return { ...port, kind: "fragment" };
}

export function rawCodePort(port: Omit<RawCodeInputPort, "kind">): RawCodeInputPort {
  return { ...port, kind: "rawCode" };
}

export function unionPort(port: Omit<UnionInputPort, "kind">): UnionInputPort {
  return { ...port, kind: "union" };
}

export function outputPort(port: OutputPort): OutputPort {
  return port;
}

export function portIsRequired(port: InputPort): boolean {
  return port.required !== false;
}

export function portRegionKind(port: InputPort): RegionKind {
  if (port.kind === "union") {
    return port.options[0] ? portRegionKind(port.options[0]) : "expression";
  }
  return port.regionKind;
}
