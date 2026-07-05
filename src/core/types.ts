/**
 * Marker and replacement types shared by the scanner, validator, and generator.
 *
 * The core model deliberately separates marker intent from replacement shape:
 * marker kinds describe where code may be inserted, while replacement objects
 * describe the structured value that will be serialized into that location.
 */
export type MarkerExpectedKindNull = "null";
export type MarkerExpectedKindNumber = "number";
export type MarkerExpectedKindBoolean = "boolean";
export type MarkerExpectedKindString = "string";
export type MarkerExpectedKindArray = "array";
export type MarkerExpectedKindObject = "object";
export type MarkerExpectedKindObjectProperty = "objectProperty";
export type MarkerExpectedKindIdentifier = "identifier";
export type MarkerExpectedKindExpression = "expression";
export type MarkerExpectedKindStatement = "statement";
export type MarkerExpectedKindExpressionSuffix = "expressionSuffix";

/**
 * The syntactic category promised by a `@TYPE` marker or inferred from its
 * placeholder body.
 */
export type MarkerExpectedKind =
  | MarkerExpectedKindIdentifier
  | MarkerExpectedKindExpression
  | MarkerExpectedKindExpressionSuffix
  | MarkerExpectedKindStatement
  | MarkerExpectedKindArray
  | MarkerExpectedKindObject
  | MarkerExpectedKindString
  | MarkerExpectedKindNumber
  | MarkerExpectedKindBoolean
  | MarkerExpectedKindNull
  | MarkerExpectedKindObjectProperty;

export type MarkerArityOne = "one";
export type MarkerArityMany = "many";

/**
 * Single markers consume one replacement object. Many markers consume a
 * non-empty replacement array and splice it with kind-specific separators.
 */
export type MarkerArity =
  | MarkerArityOne
  | MarkerArityMany;

export type ReplacementExpressionIdentifier = {
  kind: "identifier";
  name: string;
};

export type ReplacementExpressionExpression = {
  kind: "expression";
  code: string;
};

export type ReplacementExpressionArray = {
  kind: "array";
  elements: ReplacementExpression[];
};

export type ReplacementExpressionObject = {
  kind: "object";
  properties: Record<string, ReplacementExpression>;
};

export type ReplacementExpressionString = {
  kind: "string";
  value: string;
};

export type ReplacementExpressionNumber = {
  kind: "number";
  value: number;
};

export type ReplacementExpressionBoolean = {
  kind: "boolean";
  value: boolean;
};

export type ReplacementExpressionNull = {
  kind: "null";
};

/**
 * Replacement variants that serialize to valid TypeScript expressions.
 */
export type ReplacementExpression =
  | ReplacementExpressionIdentifier
  | ReplacementExpressionExpression
  | ReplacementExpressionArray
  | ReplacementExpressionObject
  | ReplacementExpressionString
  | ReplacementExpressionNumber
  | ReplacementExpressionBoolean
  | ReplacementExpressionNull;

export type ReplacementExpressionSuffix = {
  kind: "expressionSuffix";
  code: string;
};

export type ReplacementStatement = {
  kind: "statement";
  code: string;
};

export type ReplacementObjectProperty = {
  kind: "objectProperty";
  name: string;
  value: ReplacementExpression;
  computed?: boolean;
};

/**
 * Any replacement object accepted by the generator after marker compatibility
 * and raw syntax checks pass.
 */
export type Replacement =
  | ReplacementExpression
  | ReplacementExpressionSuffix
  | ReplacementStatement
  | ReplacementObjectProperty;

export type SingleReplacement = Replacement;
export type ManyReplacement = Replacement[];

export type ReplacementValue =
  | SingleReplacement
  | ManyReplacement;

/**
 * Replacement values keyed by marker `id`.
 *
 * Duplicate regions can share an ID; every occurrence receives the same value.
 */
export type ReplacementMap = Record<string, ReplacementValue>;

/**
 * Optional checks applied to raw-code replacements after syntax parsing.
 */
export interface SecurityPolicyOptions {
  forbidImports?: boolean;
  forbidDynamicImport?: boolean;
  forbidEval?: boolean;
  forbidNewFunction?: boolean;
  forbidProcessAccess?: boolean;
  forbidGlobalThis?: boolean;
  forbidRequire?: boolean;
}

export type TemplateModeFile = {
  kind: "file";
};

export type TemplateModeExpression = {
  kind: "expression";
};

export type TemplateModeExpressionSuffix = {
  kind: "expressionSuffix";
};

export type TemplateModeStatementList = {
  kind: "statementList";
};

export type TemplateModeObjectPropertyList = {
  kind: "objectPropertyList";
};

/**
 * Context used to validate templates that are not complete TypeScript files.
 */
export type TemplateMode =
  | TemplateModeFile
  | TemplateModeExpression
  | TemplateModeExpressionSuffix
  | TemplateModeStatementList
  | TemplateModeObjectPropertyList;

export interface DiscoverOptions {
  /** Used in diagnostics and for ts-morph source-file identity. */
  filePath?: string;
  /** Optional project config for parser/compiler options. */
  tsConfigFilePath?: string;
  /** Synthetic wrapper used when discovering regions in fragments. */
  templateMode?: TemplateMode;
}

export type GenerateFormatPreserve = "preserve";
export type GenerateFormatTsMorph = "ts-morph";

export type GenerateFormat =
  | GenerateFormatPreserve
  | GenerateFormatTsMorph;

export interface GenerateOptions {
  /** Used in diagnostics and for ts-morph source-file identity. */
  filePath?: string;
  /** Optional project config for parser/compiler options. */
  tsConfigFilePath?: string;
  /** Include semantic diagnostics in final validation. */
  checkSemanticDiagnostics?: boolean;
  /** Preserve replacement spacing by default or reformat with ts-morph. */
  format?: GenerateFormat;
  /** Allow replacement-map keys that are not referenced by any region. */
  allowUnusedReplacements?: boolean;
  /** Override the default raw-code security checks. */
  securityPolicy?: SecurityPolicyOptions;
  /** Synthetic wrapper used when generating from fragments. */
  templateMode?: TemplateMode;
}

/**
 * A paired marker region with offsets in the caller-provided source text.
 */
export interface ReplacementRegion {
  id: string;
  explicitType?: MarkerExpectedKind;
  inferredType?: MarkerExpectedKind;
  effectiveType: MarkerExpectedKind;
  arity: MarkerArity;

  startCommentStart: number;
  startCommentEnd: number;
  bodyStart: number;
  bodyEnd: number;
  endCommentStart: number;
  endCommentEnd: number;

  bodyText: string;
  line: number;
  column: number;
}

export interface DiagnosticSummary {
  syntactic: string[];
  semantic?: string[];
}

/**
 * Successful generation result. `code` never includes marker comments.
 */
export interface GenerateResult {
  code: string;
  regions: ReplacementRegion[];
  diagnostics: DiagnosticSummary;
}

export const markerExpectedKinds = [
  "identifier",
  "expression",
  "expressionSuffix",
  "statement",
  "array",
  "object",
  "string",
  "number",
  "boolean",
  "null",
  "objectProperty"
] as const satisfies readonly MarkerExpectedKind[];

/**
 * Replacement kinds that are legal wherever an expression marker is expected.
 */
export const expressionReplacementKinds = [
  "identifier",
  "expression",
  "array",
  "object",
  "string",
  "number",
  "boolean",
  "null"
] as const;

export type ExpressionReplacementKindIdentifier = "identifier";
export type ExpressionReplacementKindExpression = "expression";
export type ExpressionReplacementKindArray = "array";
export type ExpressionReplacementKindObject = "object";
export type ExpressionReplacementKindString = "string";
export type ExpressionReplacementKindNumber = "number";
export type ExpressionReplacementKindBoolean = "boolean";
export type ExpressionReplacementKindNull = "null";

export type ExpressionReplacementKind =
  | ExpressionReplacementKindIdentifier
  | ExpressionReplacementKindExpression
  | ExpressionReplacementKindArray
  | ExpressionReplacementKindObject
  | ExpressionReplacementKindString
  | ExpressionReplacementKindNumber
  | ExpressionReplacementKindBoolean
  | ExpressionReplacementKindNull;
