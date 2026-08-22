import type {
  FragmentInputPort,
  FragmentCollectionInputPort,
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
  TypedSyntaxRegionKind,
  UnionInputPort
} from "./graphTypes.js";
import type { SupportedJsonSchema } from "./schemaTypes.js";
import {
  compareJsonSchemas,
  validateJsonValueAgainstSchema,
  validateSupportedJsonSchema,
  type SchemaComparisonResult,
  type SupportedJsonSchemaIssue
} from "./schemaCompatibility.js";
import {
  compareTypeScriptTypes,
  validateTypeScriptType,
  type TypeScriptTypeCompatibilityResult,
  type TypeScriptTypeIssue
} from "./typeScriptCompatibility.js";
import { defaultFragmentCollectionSeparator } from "./rendering.js";

type StrictPortInput<T extends InputPort, P extends Omit<T, "kind">> =
  P & (Exclude<keyof P, keyof Omit<T, "kind">> extends never ? unknown : never);

type StrictSourceFileFragmentPortInput<P extends Omit<FragmentInputPort, "kind">> =
  P["regionKind"] extends "sourceFile"
    ? P["accepts"] extends { readonly outputKind: infer TOutputKind extends RegionKind }
      ? TOutputKind extends "sourceFile"
        ? P["accepts"] extends { readonly type: unknown } ? never : P
        : never
      : P["accepts"] extends { readonly type: unknown } ? never : P
    : P["accepts"] extends { readonly outputKind: "sourceFile" } ? never : P;

/** Stable result values returned by descriptor compatibility checks. */
export const TYPE_DESCRIPTOR_COMPATIBILITY_STATUS_VALUES = [
  "compatible",
  "incompatible",
  "indeterminate",
  "invalid"
] as const;

export type TypeDescriptorCompatibilityStatus =
  typeof TYPE_DESCRIPTOR_COMPATIBILITY_STATUS_VALUES[number];

export interface TypeDescriptorCompatibilityIssue {
  readonly code: string;
  readonly message: string;
  readonly path: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
  readonly compilerCode?: number;
  readonly compilerCategory?: "error" | "warning" | "suggestion" | "message";
  readonly line?: number;
  readonly column?: number;
}

export interface TypeDescriptorCompatibilityResult {
  readonly status: TypeDescriptorCompatibilityStatus;
  readonly issues: readonly TypeDescriptorCompatibilityIssue[];
  readonly typeScript?: TypeScriptTypeCompatibilityResult;
  readonly schema?: SchemaComparisonResult;
}

/** Public comparison-result name used by package consumers. */
export type TypeDescriptorComparisonResult = TypeDescriptorCompatibilityResult;

export type EffectiveTypeDescriptorResult =
  | { readonly ok: true; readonly type?: TypeDescriptor }
  | {
      readonly ok: false;
      readonly reason: "invalid" | "conflict";
      readonly type?: TypeDescriptor;
      readonly issues: readonly TypeDescriptorCompatibilityIssue[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeScriptIssues(
  issues: readonly TypeScriptTypeIssue[],
  side: "actual" | "expected"
): TypeDescriptorCompatibilityIssue[] {
  return issues.map(issue => ({
    ...issue,
    path: `${side}.${issue.path}`
  }));
}

function schemaIssues(
  issues: readonly SupportedJsonSchemaIssue[],
  side: "actual" | "expected"
): TypeDescriptorCompatibilityIssue[] {
  return issues.map(issue => ({
    code: issue.code,
    message: issue.message,
    path: `${side}.${issue.path}`,
    ...(issue.actual === undefined ? {} : { actual: issue.actual })
  }));
}

function validateDescriptor(
  descriptor: TypeDescriptor | undefined,
  side: "actual" | "expected"
): TypeDescriptorCompatibilityIssue[] {
  if (!descriptor) return [];
  const issues: TypeDescriptorCompatibilityIssue[] = [];
  if (!isRecord(descriptor)) {
    return [{
      code: "InvalidTypeScriptType",
      message: "A type descriptor must be an object.",
      path: side,
      actual: descriptor
    }];
  }
  if (descriptor.nominal !== undefined && (typeof descriptor.nominal !== "string" || descriptor.nominal.trim().length === 0)) {
    issues.push({
      code: "InvalidNominalType",
      message: "TypeDescriptor.nominal must be a non-empty string.",
      path: `${side}.nominal`,
      actual: descriptor.nominal
    });
  }
  if (descriptor.ts !== undefined) {
    if (typeof descriptor.ts !== "string") {
      issues.push({
        code: "InvalidTypeScriptType",
        message: "TypeDescriptor.ts must be a string.",
        path: `${side}.ts`,
        actual: descriptor.ts
      });
    } else {
      const validation = validateTypeScriptType(descriptor.ts, "ts");
      if (!validation.ok) issues.push(...typeScriptIssues(validation.issues, side));
    }
  }
  if (descriptor.schema !== undefined) {
    const validation = validateSupportedJsonSchema(descriptor.schema, "schema");
    if (!validation.ok) issues.push(...schemaIssues(validation.issues, side));
  }
  return issues;
}

/**
 * Compare a producer descriptor (`actual`) to a consumer descriptor (`expected`).
 * Invalid metadata dominates incompatibility, which dominates indeterminacy.
 */
export function compareTypeDescriptors(
  actual: TypeDescriptor | undefined,
  expected: TypeDescriptor | undefined
): TypeDescriptorCompatibilityResult {
  const validationIssues = [
    ...validateDescriptor(actual, "actual"),
    ...validateDescriptor(expected, "expected")
  ];
  if (validationIssues.length > 0) return { status: "invalid", issues: validationIssues };

  const typeScript = compareTypeScriptTypes(expected?.ts, actual?.ts);
  const issues: TypeDescriptorCompatibilityIssue[] = [];
  const nominalCompatible = expected?.nominal === undefined || actual?.nominal === expected.nominal;
  if (!nominalCompatible) {
    issues.push({
      code: "NominalTypeMismatch",
      message: actual?.nominal === undefined
        ? "The producer does not advertise the nominal type required by the consumer."
        : "The producer nominal type does not match the consumer nominal type.",
      path: "nominal",
      expected: expected?.nominal,
      ...(actual?.nominal === undefined ? {} : { actual: actual.nominal })
    });
  }
  if (typeScript.status === "invalid") {
    issues.push(...typeScriptIssues(typeScript.issues, "expected"));
  } else if (typeScript.status === "incompatible") {
    issues.push({
      code: "TypeScriptTypeMismatch",
      message: typeScript.reason === "missingActualType"
        ? "The producer does not advertise the TypeScript type required by the consumer."
        : "The producer TypeScript type is not assignable to the consumer type.",
      path: "ts",
      expected: typeScript.expected,
      actual: typeScript.actual
    });
  }

  let schema: SchemaComparisonResult | undefined;
  if (expected?.schema !== undefined) {
    if (actual?.schema === undefined) {
      issues.push({
        code: "JsonSchemaMismatch",
        message: "The producer does not advertise the JSON Schema required by the consumer.",
        path: "schema",
        expected: expected.schema
      });
    } else {
      schema = compareJsonSchemas(actual.schema, expected.schema);
      issues.push(...schema.issues.map(issue => ({ ...issue, path: `schema${issue.path === "$" ? "" : issue.path.slice(1)}` })));
    }
  }

  if (typeScript.status === "invalid") return { status: "invalid", issues, typeScript, ...(schema ? { schema } : {}) };
  if (!nominalCompatible || typeScript.status === "incompatible" || (expected?.schema !== undefined && actual?.schema === undefined)
    || schema?.compatibility === "incompatible") {
    return { status: "incompatible", issues, typeScript, ...(schema ? { schema } : {}) };
  }
  if (schema?.compatibility === "indeterminate") {
    return { status: "indeterminate", issues, typeScript, schema };
  }
  return { status: "compatible", issues, typeScript, ...(schema ? { schema } : {}) };
}

/**
 * Resolve the deprecated standalone schema alias into `TypeDescriptor.schema`.
 * When both declarations are present they must be provably equivalent.
 */
export function resolveEffectiveTypeDescriptor(
  type: TypeDescriptor | undefined,
  legacySchema: SupportedJsonSchema | undefined
): EffectiveTypeDescriptorResult {
  const authoredTypeIssues = validateDescriptor(type, "actual");
  if (authoredTypeIssues.length > 0) {
    return {
      ok: false,
      reason: "invalid",
      ...(isRecord(type) ? { type: type as TypeDescriptor } : {}),
      issues: authoredTypeIssues
    };
  }
  const effective = legacySchema === undefined || type?.schema !== undefined
    ? type
    : { ...(type ?? {}), schema: legacySchema };
  const validationIssues = effective === type ? [] : validateDescriptor(effective, "actual");
  if (legacySchema !== undefined && type?.schema !== undefined) {
    const aliasValidation = validateSupportedJsonSchema(legacySchema, "schema");
    if (!aliasValidation.ok) validationIssues.push(...schemaIssues(aliasValidation.issues, "actual"));
  }
  if (validationIssues.length > 0) {
    return { ok: false, reason: "invalid", ...(effective ? { type: effective } : {}), issues: validationIssues };
  }

  if (type?.schema !== undefined && legacySchema !== undefined) {
    const forward = compareJsonSchemas(type.schema, legacySchema);
    const reverse = compareJsonSchemas(legacySchema, type.schema);
    if (forward.compatibility !== "compatible" || reverse.compatibility !== "compatible") {
      return {
        ok: false,
        reason: "conflict",
        type,
        issues: [{
          code: "ConflictingSchemaMetadata",
          message: "type.schema and the deprecated schema alias must describe equivalent value sets.",
          path: "schema",
          expected: type.schema,
          actual: legacySchema
        }]
      };
    }
  }
  return { ok: true, ...(effective ? { type: effective } : {}) };
}

/** @deprecated Use `compareTypeDescriptors(actual, expected)` for structured results. */
export function isTypeCompatible(
  expected: TypeDescriptor | undefined,
  actual: TypeDescriptor | undefined
): boolean {
  return compareTypeDescriptors(actual, expected).status === "compatible";
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

/** @deprecated Use `validateJsonValueAgainstSchema()` for structured issues. */
export function validateJsonSchemaSubset(value: unknown, schema: unknown, path = "$"): SchemaValidationResult {
  if (schema === undefined) return { ok: true };
  const result = validateJsonValueAgainstSchema(value, schema, path);
  if (result.ok) return { ok: true };
  const issue = result.issues[0];
  return {
    ok: false,
    message: issue?.message ?? "Value does not satisfy the JSON Schema.",
    path: issue?.path ?? path,
    expected: schema,
    actual: value
  };
}

export function literalPort<const P extends Omit<LiteralInputPort, "kind">>(
  port: P["regionKind"] extends TypedSyntaxRegionKind ? never : StrictPortInput<LiteralInputPort, P>
): LiteralInputPort & P & { readonly kind: "literal" } {
  return { ...port, kind: "literal" } as unknown as LiteralInputPort & P & { readonly kind: "literal" };
}

export function fragmentPort<const P extends Omit<FragmentInputPort, "kind">>(
  port: StrictSourceFileFragmentPortInput<P> extends never ? never : StrictPortInput<FragmentInputPort, P>
): FragmentInputPort & P & { readonly kind: "fragment" } {
  return { ...port, kind: "fragment" } as unknown as FragmentInputPort & P & { readonly kind: "fragment" };
}

export function fragmentCollectionPort<const P extends Omit<FragmentCollectionInputPort, "kind">>(
  port: P["regionKind"] extends "sourceFile"
    ? never
    : P["accepts"] extends { readonly outputKind: "sourceFile" }
      ? never
      : StrictPortInput<FragmentCollectionInputPort, P>
): FragmentCollectionInputPort & P & { readonly kind: "fragmentCollection" } {
  return { ...port, kind: "fragmentCollection" } as unknown as FragmentCollectionInputPort & P & { readonly kind: "fragmentCollection" };
}

export function fragmentPortOutputKind(port: FragmentInputPort | FragmentCollectionInputPort): RegionKind {
  return port.accepts.outputKind ?? port.regionKind;
}

export function rawCodePort<const P extends Omit<RawCodeInputPort, "kind">>(
  port: P["regionKind"] extends "sourceFile" ? never : StrictPortInput<RawCodeInputPort, P>
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
    case "fragmentCollection":
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
    case "fragmentCollection":
      return {
        kind: "fragmentCollection",
        regionKind: port.regionKind,
        required,
        ...(port.description ? { description: port.description } : {}),
        accepts: {
          outputKind: fragmentPortOutputKind(port),
          ...(port.accepts.type ? { type: port.accepts.type } : {}),
          ...(port.accepts.sourceModelIds ? { sourceModelIds: port.accepts.sourceModelIds } : {})
        },
        separator: port.separator ?? defaultFragmentCollectionSeparator(port.regionKind),
        minItems: port.minItems ?? 0,
        ...(port.maxItems === undefined ? {} : { maxItems: port.maxItems })
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
