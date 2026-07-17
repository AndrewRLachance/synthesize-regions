# Copied synthesize-regions Contracts for the Synthesis Workflow

**Snapshot package version:** 0.1.0

This file explicitly copies the current public declaration bodies and TypeBox
schema definitions used by the Synthesis Workflow. It contains no package-root
barrel exports and is not an implementation module.

The authoritative allowlist, ownership, and security boundaries remain in the
[implementation inventory](./synthesis-workflow-implementation-inventory.md).
Some supporting declarations are copied with their source module so referenced
types remain understandable; their presence here does not add them to the
runtime allowlist. Contracts marked future or runtime-owned in the inventory
are not defined here.

This is a point-in-time snapshot. Regenerate and review it whenever the
`synthesize-regions` public surface or package version changes.

## Consolidated function signatures used by the workflow

The declarations below collect the callable package surface selected by the
implementation inventory. The later source snapshots preserve the declarations
in their original module context.

### Catalog capture, identity, and planner schemas

```ts
export declare function createTemplateRegistryFromManifests(
  manifests: readonly GraphTemplateManifest[]
): TemplateRegistry;

export interface TemplateRegistry {
  snapshot(): TemplateRegistrySnapshot;
}

export declare function graphTemplateDefinitionToNodeSchema(
  template: GraphTemplateDefinition<any, string>
): Record<string, unknown>;

export declare function graphTemplateDefinitionToJsonSchema(
  template: GraphTemplateDefinition<any, string>
): Record<string, unknown>;

export declare function templateRegistryToSynthesisGraphJsonSchema(
  registry: TemplateCatalogView
): Record<string, unknown>;

export declare function templateRegistryToPartialSynthesisGraphJsonSchema(
  registry: TemplateCatalogView
): Record<string, unknown>;

export declare function templateCatalogDigest(
  templates: readonly GraphTemplateDefinition<any, string, any>[]
): string;

export declare function templateCatalogManifestDigest(
  templates: readonly GraphTemplateDefinition<any, string, any>[]
): string;

export declare function templateManifestDigest(
  template: Pick<GraphTemplateDefinition<any, string, any>, "source" | "summary">
): string;
```

### Graph compilation, patching, filling, and integrity

```ts
export declare function normalizeSynthesisGraph(
  graph: SynthesisGraph
): GraphNormalizationResult;

export declare function applyGraphPatch(
  graph: SynthesisGraph,
  action: GraphPatchAction
): GraphPatchResult;

export declare function compileGraph(
  graph: SynthesisGraph,
  registry: TemplateCatalogView,
  options?: GraphCompileOptions
): GraphCompilationResult;

export declare function compileGraph(
  graph: SynthesisGraph,
  registry: TemplateCatalogView,
  options: GraphCompileOptions & { mode: "partial" }
): GraphPartialCompilationResult;

export declare function fillTemplateArtifactWithCatalog(
  artifact: TemplateArtifact,
  inputs: TemplateArtifactInputMap,
  catalog: TemplateCatalogView,
  options?: CatalogArtifactFillOptions
): TemplateArtifactResult;

export declare function finalizeTemplateArtifactWithCatalog(
  artifact: TemplateArtifact,
  inputs: TemplateArtifactInputMap,
  catalog: TemplateCatalogView,
  options?: CatalogArtifactFillOptions
): TemplateArtifactResult;

export declare function validateTemplateArtifactAgainstCatalog(
  artifact: TemplateArtifact,
  catalog: TemplateCatalogView,
  options?: TemplateArtifactCatalogValidationOptions
): SynthesisDiagnostic[];

export declare function validateTemplateArtifactIntegrity(
  value: unknown
): SynthesisDiagnostic[];
```

### Artifact-set compilation, assembly, static acceptance, and hashing

```ts
export declare function normalizeArtifactTargetPath(input: string): string;

export declare function createArtifactSetFileHash(sourceText: string): string;

export declare function createArtifactSetGraphHash(
  graph: SynthesisGraph
): string;

export declare function createArtifactSetArtifactHash(
  artifact: TemplateArtifact
): string;

export declare function createArtifactSetChangeSetHash(
  changes: readonly ArtifactSetChange[],
  identity?: Omit<ArtifactSetAcceptanceIdentity, "staticPolicyVersion"> & {
    staticPolicyVersion?: number;
  }
): string;

export declare function createArtifactSetWorkspaceSnapshotHash(
  workspaceFiles: Readonly<Record<string, string>>,
  workspaceSnapshotId?: string,
  tsConfigFilePath?: string,
  workspaceManifest?: ArtifactSetWorkspaceManifest,
  unavailableTextPaths?: readonly string[]
): string;

export declare function assembleArtifactSetTargets(
  units: readonly ArtifactSetAssemblyUnit[],
  catalog:
    | TemplateCatalogView
    | readonly GraphTemplateDefinition<any, string, any>[],
  options?: ArtifactSetAssemblyOptions
): ArtifactSetAssemblyResult;

export declare function compileArtifactSet(
  plan: ArtifactSetPlan,
  catalog:
    | TemplateCatalogView
    | readonly GraphTemplateDefinition<any, string, any>[],
  options?: Omit<ArtifactSetCompileOptions, "mode"> & { mode?: "strict" }
): ArtifactSetStrictCompilationResult;

export declare function compileArtifactSet(
  plan: ArtifactSetPlan,
  catalog:
    | TemplateCatalogView
    | readonly GraphTemplateDefinition<any, string, any>[],
  options: Omit<ArtifactSetCompileOptions, "mode"> & { mode: "partial" }
): ArtifactSetPartialCompilationResult;

export declare function compileArtifactSetGraphs(
  plan: ArtifactSetPlan,
  catalog:
    | TemplateCatalogView
    | readonly GraphTemplateDefinition<any, string, any>[],
  options?: ArtifactSetCompileOptions
): ArtifactSetGraphCompilationResult;

export declare function validateArtifactSetSemantics(
  plan: ArtifactSetPlan,
  catalog:
    | TemplateCatalogView
    | readonly GraphTemplateDefinition<any, string, any>[],
  options?: Omit<ArtifactSetCompileOptions, "mode">
): ArtifactSetSemanticValidationResult;

export declare function finalizeArtifactSetStatic(
  plan: ArtifactSetPlan,
  catalog:
    | TemplateCatalogView
    | readonly GraphTemplateDefinition<any, string, any>[],
  options?: Omit<ArtifactSetCompileOptions, "mode">,
  constraintAcceptance?: ConstraintBoundStaticAcceptance
): ArtifactSetStaticValidationResult;

export declare function validateArtifactSetStatic(
  plan: ArtifactSetPlan,
  catalog:
    | TemplateCatalogView
    | readonly GraphTemplateDefinition<any, string, any>[],
  options?: Omit<ArtifactSetCompileOptions, "mode">
): ArtifactSetStaticValidationResult;

export declare const SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG:
  Readonly<Record<BuiltInSynthesisDiagnosticCode, SynthesisFailureClassification>>;

export declare function classifySynthesisDiagnosticCode(
  code: string
): SynthesisFailureClassification;
```

### Schema and type compatibility

```ts
export declare function canonicalizeSupportedJsonSchema(
  schema: SupportedJsonSchema
): SupportedJsonSchema;

export declare function canonicalJsonSchemaString(
  schema: SupportedJsonSchema
): string;

export declare function validateSupportedJsonSchema(
  schema: unknown,
  path?: string
): SupportedJsonSchemaValidationResult;

export declare function validateJsonValueAgainstSchema(
  value: unknown,
  schema: unknown,
  path?: string
): JsonSchemaValueValidationResult;

export declare function compareJsonSchemas(
  actualSchema: unknown,
  expectedSchema: unknown
): SchemaComparisonResult;

export declare function validateTypeScriptType(
  typeExpression: string,
  path?: string
): TypeScriptTypeValidationResult;

export declare function compareTypeScriptTypes(
  expected: string | undefined,
  actual: string | undefined
): TypeScriptTypeCompatibilityResult;

export declare function compareTypeDescriptors(
  actual: TypeDescriptor | undefined,
  expected: TypeDescriptor | undefined
): TypeDescriptorCompatibilityResult;

export declare function resolveEffectiveTypeDescriptor(
  type: TypeDescriptor | undefined,
  legacySchema: SupportedJsonSchema | undefined
): EffectiveTypeDescriptorResult;

export declare function isTypeCompatible(
  expected: TypeDescriptor | undefined,
  actual: TypeDescriptor | undefined
): boolean;
```

### Contract checking and runtime guards

```ts
export declare const checkContract: <TSchemaType extends TSchema>(
  schema: TSchemaType,
  value: unknown
) => value is Static<TSchemaType>;

export declare function isGeneratedSourceSpan(
  value: unknown
): value is GeneratedSourceSpan;

export declare function isGeneratedSourceMap(
  value: unknown
): value is GeneratedSourceMap;

export declare function isInputPort(value: unknown): value is InputPort;

export declare function isTemplateArtifactInputMap(
  inputs: unknown
): inputs is Record<string, any>;

export declare function isTemplateArtifact(
  value: unknown
): value is TemplateArtifact;

export declare function isSynthesisNode(
  value: unknown
): value is SynthesisNode;

export declare function isSynthesisGraph(
  value: unknown
): value is SynthesisGraph;

export declare function isGraphPatchAction(
  value: unknown
): value is GraphPatchAction;

export declare function isGraphPatchResult(
  value: unknown
): value is GraphPatchResult;

export declare function isGraphCompilationResult(
  value: unknown
): value is GraphCompilationResult;

export declare function isGraphPartialCompilationResult(
  value: unknown
): value is GraphPartialCompilationResult;

export declare function isTemplateArtifactResult(
  value: unknown
): value is TemplateArtifactResult;
```

## Core supporting public types

Copied from `dist/core/types.d.ts`.

```ts
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
export type MarkerExpectedKindType = "type";
export type MarkerExpectedKindTypeMember = "typeMember";
export type MarkerExpectedKindTypeParameter = "typeParameter";
export type MarkerExpectedKindParameter = "parameter";
export type MarkerExpectedKindConstructorParameter = "constructorParameter";
export type MarkerExpectedKindHeritageType = "heritageType";
export type MarkerExpectedKindDeclaration = "declaration";
export type MarkerExpectedKindClassMember = "classMember";
export type MarkerExpectedKindEnumMember = "enumMember";
export type MarkerExpectedKindImportSpecifier = "importSpecifier";
export type MarkerExpectedKindExportSpecifier = "exportSpecifier";
export type MarkerExpectedKindSourceFile = "sourceFile";
/**
 * The syntactic category promised by a `@TYPE` marker or inferred from its
 * placeholder body.
 */
export type MarkerExpectedKind = MarkerExpectedKindIdentifier | MarkerExpectedKindExpression | MarkerExpectedKindExpressionSuffix | MarkerExpectedKindStatement | MarkerExpectedKindArray | MarkerExpectedKindObject | MarkerExpectedKindString | MarkerExpectedKindNumber | MarkerExpectedKindBoolean | MarkerExpectedKindNull | MarkerExpectedKindObjectProperty | MarkerExpectedKindType | MarkerExpectedKindTypeMember | MarkerExpectedKindTypeParameter | MarkerExpectedKindParameter | MarkerExpectedKindConstructorParameter | MarkerExpectedKindHeritageType | MarkerExpectedKindDeclaration | MarkerExpectedKindClassMember | MarkerExpectedKindEnumMember | MarkerExpectedKindImportSpecifier | MarkerExpectedKindExportSpecifier | MarkerExpectedKindSourceFile;
export type MarkerArityOne = "one";
export type MarkerArityMany = "many";
/**
 * Single markers consume one replacement object. Many markers consume a
 * non-empty replacement array and splice it with kind-specific separators.
 */
export type MarkerArity = MarkerArityOne | MarkerArityMany;
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
export type ReplacementExpression = ReplacementExpressionIdentifier | ReplacementExpressionExpression | ReplacementExpressionArray | ReplacementExpressionObject | ReplacementExpressionString | ReplacementExpressionNumber | ReplacementExpressionBoolean | ReplacementExpressionNull;
export type ReplacementExpressionSuffix = {
    kind: "expressionSuffix";
    code: string;
};
export type ReplacementStatement = {
    kind: "statement";
    code: string;
};
export type TypeCode = string;
export type TypeMemberCode = string;
export type TypeParameterCode = string;
export type ParameterCode = string;
export type ConstructorParameterCode = string;
export type HeritageTypeCode = string;
export type DeclarationCode = string;
export type ClassMemberCode = string;
export type EnumMemberCode = string;
export type ImportSpecifierCode = string;
export type ExportSpecifierCode = string;
export type SourceFileCode = string;
export type ReplacementType = {
    kind: "type";
    code: TypeCode;
};
export type ReplacementTypeMember = {
    kind: "typeMember";
    code: TypeMemberCode;
};
export type ReplacementTypeParameter = {
    kind: "typeParameter";
    code: TypeParameterCode;
};
export type ReplacementParameter = {
    kind: "parameter";
    code: ParameterCode;
};
export type ReplacementConstructorParameter = {
    kind: "constructorParameter";
    code: ConstructorParameterCode;
};
export type ReplacementHeritageType = {
    kind: "heritageType";
    code: HeritageTypeCode;
};
export type ReplacementDeclaration = {
    kind: "declaration";
    code: DeclarationCode;
};
export type ReplacementClassMember = {
    kind: "classMember";
    code: ClassMemberCode;
};
export type ReplacementEnumMember = {
    kind: "enumMember";
    code: EnumMemberCode;
};
export type ReplacementImportSpecifier = {
    kind: "importSpecifier";
    code: ImportSpecifierCode;
};
export type ReplacementExportSpecifier = {
    kind: "exportSpecifier";
    code: ExportSpecifierCode;
};
export type ReplacementSourceFile = {
    kind: "sourceFile";
    code: SourceFileCode;
};
export type ReplacementTypedSyntax = ReplacementType | ReplacementTypeMember | ReplacementTypeParameter | ReplacementParameter | ReplacementConstructorParameter | ReplacementHeritageType | ReplacementDeclaration | ReplacementClassMember | ReplacementEnumMember | ReplacementImportSpecifier | ReplacementExportSpecifier | ReplacementSourceFile;
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
export type Replacement = ReplacementExpression | ReplacementExpressionSuffix | ReplacementStatement | ReplacementObjectProperty | ReplacementTypedSyntax;
export type SingleReplacement = Replacement;
/** Replacement variants that support variadic marker arity. */
export type ManyReplacementItem = Exclude<Replacement, ReplacementSourceFile>;
export type ManyReplacement = ManyReplacementItem[];
export type ReplacementValue = SingleReplacement | ManyReplacement;
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
export type TemplateModeType = {
    kind: "type";
};
export type TemplateModeTypeMemberList = {
    kind: "typeMemberList";
};
export type TemplateModeTypeParameterList = {
    kind: "typeParameterList";
};
export type TemplateModeParameterList = {
    kind: "parameterList";
};
export type TemplateModeConstructorParameterList = {
    kind: "constructorParameterList";
};
export type TemplateModeHeritageTypeList = {
    kind: "heritageTypeList";
};
export type TemplateModeDeclarationList = {
    kind: "declarationList";
};
export type TemplateModeClassMemberList = {
    kind: "classMemberList";
};
export type TemplateModeEnumMemberList = {
    kind: "enumMemberList";
};
export type TemplateModeImportSpecifierList = {
    kind: "importSpecifierList";
};
export type TemplateModeExportSpecifierList = {
    kind: "exportSpecifierList";
};
/**
 * Context used to validate templates that are not complete TypeScript files.
 */
export type TemplateMode = TemplateModeFile | TemplateModeExpression | TemplateModeExpressionSuffix | TemplateModeStatementList | TemplateModeObjectPropertyList | TemplateModeType | TemplateModeTypeMemberList | TemplateModeTypeParameterList | TemplateModeParameterList | TemplateModeConstructorParameterList | TemplateModeHeritageTypeList | TemplateModeDeclarationList | TemplateModeClassMemberList | TemplateModeEnumMemberList | TemplateModeImportSpecifierList | TemplateModeExportSpecifierList;
export interface DiscoverOptions {
    /** Used in diagnostics and for ts-morph source-file identity. */
    filePath?: string;
    /** Optional project config for parser/compiler options. */
    tsConfigFilePath?: string;
    /** Synthetic wrapper used when discovering regions in fragments. */
    templateMode?: TemplateMode;
}
/** Options for discovering explicitly bounded templates inside a source file. */
export interface DiscoverSourceTemplatesOptions {
    /** Used in diagnostics and retained on discovered template records. */
    filePath?: string;
    /** Optional project config used to validate each extracted template. */
    tsConfigFilePath?: string;
}
/**
 * One paired `@TEMPLATE` / `@END_TEMPLATE` source boundary before its body is
 * parsed for replacement regions.
 */
export interface SourceTemplateBoundary {
    id: string;
    outputKind: MarkerExpectedKind;
    /** Parser context declared by `mode=` or inferred from `outputKind`. */
    templateMode: TemplateMode;
    startCommentStart: number;
    startCommentEnd: number;
    bodyStart: number;
    bodyEnd: number;
    endCommentStart: number;
    endCommentEnd: number;
    line: number;
    column: number;
}
/** An explicitly bounded source template and the replacement regions inside it. */
export interface DiscoveredSourceTemplate extends SourceTemplateBoundary {
    /** Complete containing source retained for insertion-site validation. */
    containingSourceText: string;
    /** Exact text between the boundary comments; whitespace is preserved. */
    sourceText: string;
    /** Replacement-region offsets relative to `sourceText`. */
    regions: ReplacementRegion[];
    /** The same replacement regions translated to offsets in the containing file. */
    fileRegions: ReplacementRegion[];
    /** Source-file identity supplied by the caller, when available. */
    filePath?: string;
}
/** Generation options for an already discovered source template. */
export type GenerateDiscoveredSourceTemplateOptions = Omit<GenerateOptions, "templateMode">;
export type GenerateFormatPreserve = "preserve";
export type GenerateFormatTsMorph = "ts-morph";
export type GenerateFormat = GenerateFormatPreserve | GenerateFormatTsMorph;
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
export declare const markerExpectedKinds: readonly ["identifier", "expression", "expressionSuffix", "statement", "array", "object", "string", "number", "boolean", "null", "objectProperty", "type", "typeMember", "typeParameter", "parameter", "constructorParameter", "heritageType", "declaration", "classMember", "enumMember", "importSpecifier", "exportSpecifier", "sourceFile"];
/**
 * Replacement kinds that are legal wherever an expression marker is expected.
 */
export declare const expressionReplacementKinds: readonly ["identifier", "expression", "array", "object", "string", "number", "boolean", "null"];
export type ExpressionReplacementKindIdentifier = "identifier";
export type ExpressionReplacementKindExpression = "expression";
export type ExpressionReplacementKindArray = "array";
export type ExpressionReplacementKindObject = "object";
export type ExpressionReplacementKindString = "string";
export type ExpressionReplacementKindNumber = "number";
export type ExpressionReplacementKindBoolean = "boolean";
export type ExpressionReplacementKindNull = "null";
export type ExpressionReplacementKind = ExpressionReplacementKindIdentifier | ExpressionReplacementKindExpression | ExpressionReplacementKindArray | ExpressionReplacementKindObject | ExpressionReplacementKindString | ExpressionReplacementKindNumber | ExpressionReplacementKindBoolean | ExpressionReplacementKindNull;
```

## Supported JSON Schema types

Copied from `dist/templates/schemaTypes.d.ts`.

```ts
/** The only JSON Schema dialect accepted by the synthesis contract engine. */
export declare const JSON_SCHEMA_DIALECT_URI: "https://json-schema.org/draft/2020-12/schema";
/** Alias used when embedding the supported dialect in planner-facing contracts. */
export declare const SUPPORTED_JSON_SCHEMA_DIALECT: "https://json-schema.org/draft/2020-12/schema";
/** Version of the library's supported Draft 2020-12 keyword profile. */
export declare const SUPPORTED_JSON_SCHEMA_VERSION: "1";
/** Version of the canonicalization and schema-subsumption behavior. */
export declare const JSON_SCHEMA_COMPATIBILITY_ENGINE_VERSION: "1";
/** JSON Schema primitive and container names accepted by this profile. */
export declare const SUPPORTED_JSON_SCHEMA_TYPE_VALUES: readonly ["null", "boolean", "object", "array", "number", "string", "integer"];
export type SupportedJsonSchemaType = typeof SUPPORTED_JSON_SCHEMA_TYPE_VALUES[number];
/**
 * Closed keyword set accepted by `SupportedJsonSchema`.
 *
 * IDs, anchors, dynamic references, remote vocabularies, and legacy draft
 * keywords are intentionally absent. `format` and content keywords are
 * retained as annotations by the runtime validator.
 */
export declare const SUPPORTED_JSON_SCHEMA_KEYWORD_VALUES: readonly ["$schema", "$ref", "$defs", "$comment", "title", "description", "default", "deprecated", "readOnly", "writeOnly", "examples", "type", "const", "enum", "multipleOf", "maximum", "exclusiveMaximum", "minimum", "exclusiveMinimum", "maxLength", "minLength", "pattern", "format", "contentEncoding", "contentMediaType", "contentSchema", "maxItems", "minItems", "uniqueItems", "maxContains", "minContains", "prefixItems", "items", "contains", "unevaluatedItems", "maxProperties", "minProperties", "required", "properties", "patternProperties", "additionalProperties", "propertyNames", "dependentRequired", "dependentSchemas", "unevaluatedProperties", "allOf", "anyOf", "oneOf", "not", "if", "then", "else"];
export type SupportedJsonSchemaKeyword = typeof SUPPORTED_JSON_SCHEMA_KEYWORD_VALUES[number];
/** A scalar representable in JSON. */
export type JsonPrimitive = string | number | boolean | null;
/** A JSON object. Values are recursively constrained to the JSON data model. */
export interface JsonObject {
    readonly [key: string]: JsonValue;
}
/** A value representable in JSON (therefore excluding undefined and non-finite numbers). */
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
/**
 * The library's closed, typed Draft 2020-12 profile.
 *
 * Runtime validation additionally requires `$ref` to be `#` or a local JSON
 * Pointer beginning with `#/`, and resolves it against the containing schema
 * document. Annotation keywords never affect value or compatibility checks.
 */
export interface SupportedJsonSchemaObject {
    readonly $schema?: typeof JSON_SCHEMA_DIALECT_URI;
    readonly $ref?: string;
    readonly $defs?: Readonly<Record<string, SupportedJsonSchema>>;
    readonly $comment?: string;
    readonly title?: string;
    readonly description?: string;
    readonly default?: JsonValue;
    readonly deprecated?: boolean;
    readonly readOnly?: boolean;
    readonly writeOnly?: boolean;
    readonly examples?: readonly JsonValue[];
    readonly type?: SupportedJsonSchemaType | readonly [SupportedJsonSchemaType, ...SupportedJsonSchemaType[]];
    readonly const?: JsonValue;
    readonly enum?: readonly [JsonValue, ...JsonValue[]];
    readonly multipleOf?: number;
    readonly maximum?: number;
    readonly exclusiveMaximum?: number;
    readonly minimum?: number;
    readonly exclusiveMinimum?: number;
    readonly maxLength?: number;
    readonly minLength?: number;
    readonly pattern?: string;
    /** Annotation only; the runtime deliberately does not install format validators. */
    readonly format?: string;
    /** Annotation only. */
    readonly contentEncoding?: string;
    /** Annotation only. */
    readonly contentMediaType?: string;
    /** Annotation only. */
    readonly contentSchema?: SupportedJsonSchema;
    readonly maxItems?: number;
    readonly minItems?: number;
    readonly uniqueItems?: boolean;
    readonly maxContains?: number;
    readonly minContains?: number;
    readonly prefixItems?: readonly [SupportedJsonSchema, ...SupportedJsonSchema[]];
    readonly items?: SupportedJsonSchema;
    readonly contains?: SupportedJsonSchema;
    readonly unevaluatedItems?: SupportedJsonSchema;
    readonly maxProperties?: number;
    readonly minProperties?: number;
    readonly required?: readonly string[];
    readonly properties?: Readonly<Record<string, SupportedJsonSchema>>;
    readonly patternProperties?: Readonly<Record<string, SupportedJsonSchema>>;
    readonly additionalProperties?: SupportedJsonSchema;
    readonly propertyNames?: SupportedJsonSchema;
    readonly dependentRequired?: Readonly<Record<string, readonly string[]>>;
    readonly dependentSchemas?: Readonly<Record<string, SupportedJsonSchema>>;
    readonly unevaluatedProperties?: SupportedJsonSchema;
    readonly allOf?: readonly [SupportedJsonSchema, ...SupportedJsonSchema[]];
    readonly anyOf?: readonly [SupportedJsonSchema, ...SupportedJsonSchema[]];
    readonly oneOf?: readonly [SupportedJsonSchema, ...SupportedJsonSchema[]];
    readonly not?: SupportedJsonSchema;
    readonly if?: SupportedJsonSchema;
    readonly then?: SupportedJsonSchema;
    readonly else?: SupportedJsonSchema;
}
/** A boolean schema or a closed object from the supported Draft 2020-12 profile. */
export type SupportedJsonSchema = boolean | SupportedJsonSchemaObject;
```

## Graph, catalog, artifact, and provenance types

Copied from `dist/templates/graphCoreTypes.d.ts`.

```ts
import type { GenerateOptions, MarkerExpectedKind, ReplacementMap, TemplateMode } from '../core/types.js';
import type { SupportedJsonSchema } from './schemaTypes.js';
/** Syntactic region kind accepted by graph ports and generated fragments. */
export type RegionKind = MarkerExpectedKind;
/** Version of the parser-wrapper and AST-context contract for region kinds. */
export declare const REGION_SYNTAX_ENGINE_VERSION: 1;
/** Runtime list of supported graph region kinds, aligned with `RegionKind`. */
export declare const REGION_KIND_VALUES: readonly ["identifier", "expression", "expressionSuffix", "statement", "array", "object", "string", "number", "boolean", "null", "objectProperty", "type", "typeMember", "typeParameter", "parameter", "constructorParameter", "heritageType", "declaration", "classMember", "enumMember", "importSpecifier", "exportSpecifier", "sourceFile"];
/** Region kinds that carry TypeScript code rather than JSON literal values. */
export declare const TYPED_SYNTAX_REGION_KIND_VALUES: readonly ["type", "typeMember", "typeParameter", "parameter", "constructorParameter", "heritageType", "declaration", "classMember", "enumMember", "importSpecifier", "exportSpecifier", "sourceFile"];
export type TypedSyntaxRegionKind = typeof TYPED_SYNTAX_REGION_KIND_VALUES[number];
/** Built-in diagnostic codes emitted by catalog, graph, artifact, and runner APIs. */
export declare const BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES: readonly ["AmbiguousArtifactInputAlias", "ArtifactAlreadyComplete", "ArtifactAssemblyHashMismatch", "ArtifactBaseFileHashMismatch", "ArtifactCreateFileExists", "ArtifactInputIdCollision", "ArtifactLedgerBaseHashMismatch", "ArtifactLedgerGraphHashMismatch", "ArtifactLedgerResultHashMismatch", "ArtifactLedgerUnknownArtifact", "ArtifactMarkerArityMismatch", "ArtifactMarkerKindMismatch", "ArtifactSetCatalogInvalid", "ArtifactSetTypeScriptSemanticError", "ArtifactSetTypeScriptSyntaxError", "ArtifactTargetKindMismatch", "ArtifactTargetPathCollision", "CatalogContractNotSerializable", "CatalogDigestMismatch", "CatalogManifestDigestMismatch", "CompilationScopeInvalid", "CompleteArtifactContainsMarkers", "ConflictingArtifactFillKeys", "ConflictingSchemaMetadata", "CycleDetected", "DuplicateNodeId", "DuplicateArtifactId", "DuplicateWorkspaceFilePath", "DuplicateTemplateId", "DuplicateUnresolvedInputId", "EmptyUnionPort", "FinalGoalKindMismatch", "FinalGoalSchemaMismatch", "FinalGoalTypeMismatch", "GeneratedTypeScriptInvalid", "GraphPatchInputNotFound", "GraphPatchTargetAmbiguous", "GraphPatchTargetNotFound", "IncompatibleCollectionSize", "IncompatibleFragmentKind", "IncompatibleFragmentSource", "IncompatibleFragmentType", "IncompatibleInputKind", "IncompatibleSourceOutputKind", "IncompatibleSourceSchema", "IncompatibleSourceType", "IncompatibleSourceFileMetadata", "InvalidCollectionBounds", "InvalidCollectionMaximum", "InvalidCollectionMinimum", "InvalidGraphRunnerAction", "InvalidGeneratedSourceMap", "InvalidActualSchema", "InvalidExpectedSchema", "InvalidArtifactGraph", "InvalidArtifactId", "InvalidArtifactSetPlan", "InvalidArtifactTarget", "InvalidArtifactTargetPath", "InvalidArtifactTargetRange", "InvalidConstraintBoundStaticAcceptance", "InvalidJsonSchema", "InvalidJsonValue", "InvalidLiteralInput", "InvalidRawCodeMaxLength", "InvalidRawCodePattern", "InvalidRawCodePolicy", "InvalidRunnerTransition", "InvalidSemanticTarget", "InvalidTemplateManifest", "InvalidTemplateManifestSource", "InvalidTypeScriptProjectConfigurationPath", "InvalidTypeScriptType", "MalformedArtifactMarkers", "MalformedTemplateArtifact", "MissingArtifactMarker", "MissingArtifactBaseFile", "MissingRequiredInput", "MissingTypeScriptProjectConfiguration", "MissingTemplateManifestIdentity", "MissingWorkspaceSnapshotIdentity", "ArtifactCatalogRequired", "TemplateManifestDigestMismatch", "MixedUnionRegionKinds", "JsonSchemaMismatch", "JsonSchemaValueMismatch", "PartialArtifactHasNoUnresolvedInputs", "OverlappingArtifactTargets", "RawCodeRejected", "SchemaCompatibilityIndeterminate", "TypeScriptSemanticError", "TypeScriptTypeMismatch", "UnknownArtifactFillKey", "UnknownArtifactMarker", "UnknownFinalNode", "UnknownInput", "UnknownReference", "UnknownSourceModelId", "UnknownTemplate", "UnknownTemplateReplacement", "UntrustedTemplateCatalogView", "UntrustedTemplateDefinition", "UnresolvedArtifactSetInputs", "EmptyArtifactSetPlan", "InvalidWorkspaceFilePath", "InvalidWorkspaceFileSource", "InvalidWorkspaceManifest", "InvalidWorkspaceManifestFileIdentity", "InvalidWorkspaceManifestOrder", "InvalidWorkspaceManifestPath", "InvalidUnavailableTextPath", "InvalidUnavailableTextPathOrder", "UnavailableTextPathMissingFromManifest", "UnavailableTextPathsRequireWorkspaceManifest", "WorkspaceAnalysisFileUnavailable", "WorkspaceFileMissingFromManifest", "WorkspaceManifestFileIdentityMismatch", "WorkspaceManifestFileUnrepresented", "WorkspaceManifestTypeScriptConfigurationMismatch", "WorkspaceSnapshotHashMismatch", "WorkspaceTextPartitionOverlap", "UnresolvedLocalSchemaReference", "UnresolvedJsonSchemaReference", "UnresolvedTemplateInputs", "UnresolvedTypeScriptType", "UnsupportedSchemaKeyword", "UnsupportedJsonSchemaKeyword", "UnsupportedJsonSchemaReference", "ForbiddenAnyType"];
/** Closed union of package-provided diagnostics; custom diagnostics remain supported. */
export type BuiltInSynthesisDiagnosticCode = typeof BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES[number];
/** Contextual repair channel attached to failed operations and actionable runner states. */
export declare const SYNTHESIS_FAILURE_CLASSIFICATION_VALUES: readonly ["graphRepairable", "artifactFillable", "templatePolicyFailure", "terminalFailure"];
export type SynthesisFailureClassification = typeof SYNTHESIS_FAILURE_CLASSIFICATION_VALUES[number];
export declare const SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG: Readonly<Record<BuiltInSynthesisDiagnosticCode, SynthesisFailureClassification>>;
export declare function classifySynthesisDiagnosticCode(code: string): SynthesisFailureClassification;
/** Graph patch actions accepted by the runner repair protocol. */
export declare const GRAPH_PATCH_ACTION_KIND_VALUES: readonly ["addNode", "removeNode", "setInput", "removeInput", "setFinalNode", "setGoal", "removeGoal"];
export type GraphPatchActionKind = typeof GRAPH_PATCH_ACTION_KIND_VALUES[number];
/** All explicit actions accepted by GraphRunner.advance(). */
export declare const GRAPH_RUNNER_ACTION_KIND_VALUES: readonly ["addNode", "removeNode", "setInput", "removeInput", "setFinalNode", "setGoal", "removeGoal", "replaceGraph", "fill"];
export type GraphRunnerActionKind = typeof GRAPH_RUNNER_ACTION_KIND_VALUES[number];
/** Version of the persisted generated-source mapping format. */
export declare const GENERATED_SOURCE_MAP_VERSION: 1;
/** Runtime list of ownership variants recorded by generated-source maps. */
export declare const GENERATED_SOURCE_SPAN_KIND_VALUES: readonly ["node", "input"];
export type GeneratedSourceSpanKind = typeof GENERATED_SOURCE_SPAN_KIND_VALUES[number];
/** Shared identity and range metadata for one generated-source span. */
interface BaseGeneratedSourceSpan {
    /** Zero-based UTF-16 offset at which the span begins in artifact `code`. */
    start: number;
    /** Exclusive zero-based UTF-16 offset at which the span ends in artifact `code`. */
    end: number;
    /** Composition depth, where the final/root node begins at depth zero. */
    nestingDepth: number;
    /** Graph node that contributed the span, when generated within a graph. */
    nodeId?: string;
    /** Template model that contributed the span. */
    templateId: string;
}
/** Source owned by a template node's generated body. */
export interface GeneratedNodeSourceSpan extends BaseGeneratedSourceSpan {
    kind: 'node';
}
/** Source produced for one concrete or unresolved template input. */
export interface GeneratedInputSourceSpan extends BaseGeneratedSourceSpan {
    kind: 'input';
    /** Input on the contributing template that owns this source. */
    inputName: string;
}
/** One persisted ownership range within generated artifact code. */
export type GeneratedSourceSpan = GeneratedNodeSourceSpan | GeneratedInputSourceSpan;
/**
 * Persisted graph provenance used to attribute compiler diagnostics.
 *
 * Spans may overlap: nested child spans have a greater `nestingDepth` than the
 * containing input and node spans.
 */
export interface GeneratedSourceMap {
    version: typeof GENERATED_SOURCE_MAP_VERSION;
    spans: GeneratedSourceSpan[];
}
/**
 * Optional type metadata used for graph compatibility checks.
 *
 * `ts` is a self-contained TypeScript type expression, while `schema` uses the
 * package's supported Draft 2020-12 profile.
 */
export interface TypeDescriptor {
    /** Self-contained TypeScript type expression enforced through compiler assignability. */
    ts?: string;
    /** Canonical JSON Schema contract used for value and fragment compatibility. */
    schema?: SupportedJsonSchema;
}
/** Planner-facing suggestion for how to repair a diagnostic. */
export interface SynthesisRepairHint {
    /** Machine-readable repair category. */
    kind: string;
    /** Human-readable repair suggestion. */
    message: string;
    /** Additional repair-specific metadata. */
    [key: string]: unknown;
}
/** Structured validation or compilation issue emitted by graph compilation. */
export interface SynthesisDiagnostic {
    /** Pipeline stage that produced the diagnostic. */
    stage: 'graph' | 'template' | 'input' | 'port' | 'region' | 'ast' | 'type' | 'policy';
    /** Machine-readable diagnostic code. */
    code: string;
    /** Diagnostic severity. */
    severity: 'error' | 'warning';
    /** Human-readable diagnostic message. */
    message: string;
    /** Graph node ID associated with the diagnostic, when available. */
    nodeId?: string;
    /** Template model ID associated with the diagnostic, when available. */
    templateId?: string;
    /** Template input name associated with the diagnostic, when available. */
    inputName?: string;
    /** Path to the problematic graph or input value, when available. */
    path?: string;
    /** Expected value, type, schema, or port metadata. */
    expected?: unknown;
    /** Actual value, type, schema, or error metadata. */
    actual?: unknown;
    /** Optional suggestions for repairing planner-provided input. */
    repairHints?: SynthesisRepairHint[];
    /** TypeScript compiler diagnostic code, when emitted by semantic validation. */
    compilerCode?: number;
    /** TypeScript compiler diagnostic category, when emitted by semantic validation. */
    compilerCategory?: 'error' | 'warning' | 'suggestion' | 'message';
    /** One-based line within generated artifact code, when available. */
    line?: number;
    /** One-based column within generated artifact code, when available. */
    column?: number;
}
/**
 * Code produced by a graph template invocation.
 *
 * Fragments carry their syntactic region kind plus optional type/schema
 * metadata so downstream fragment ports can validate compatibility.
 */
export interface GeneratedFragment {
    /** Graph node ID that produced the fragment, when available. */
    id?: string;
    /** Generated TypeScript source fragment. */
    code: string;
    /** Syntactic region kind of the generated fragment. */
    kind: RegionKind;
    /** Template identity that produced the fragment. */
    source: {
        /** Template model ID that produced the fragment. */
        templateId: string;
        /** Template version that produced the fragment, when provided. */
        templateVersion?: string;
        /**
         * Exact executable template-manifest identity that produced the fragment.
         *
         * Newly generated fragments always include this field. It remains optional
         * so artifacts persisted before manifest identities were introduced remain
         * readable.
         */
        templateManifestDigest?: string;
    };
    /** Optional TypeScript/JSON-schema type metadata for compatibility checks. */
    type?: TypeDescriptor;
    /** @deprecated Put generated-value schema metadata in `type.schema`. */
    schema?: SupportedJsonSchema;
    /** Optional lineage metadata for downstream inspection. */
    provenance?: {
        /** Graph node ID that produced the fragment. */
        nodeId?: string;
        /** Referenced fragment IDs consumed by this fragment. */
        inputRefs?: string[];
        /** Literal input values consumed by the template. */
        literalInputs?: Record<string, unknown>;
    };
    /** Persisted source ownership ranges for graph-aware diagnostic attribution. */
    sourceMap?: GeneratedSourceMap;
    /** Diagnostics attached to this fragment, if a producer supplies them. */
    diagnostics?: SynthesisDiagnostic[];
}
/** A fill value supplied directly to an unresolved template artifact input. */
export type TemplateArtifactInput = {
    /** Fill the unresolved input with a JSON-like literal value. */
    kind: 'literal';
    /** Literal value supplied to a literal-compatible unresolved input. */
    value: unknown;
} | {
    /** Fill the unresolved input with caller-provided TypeScript source. */
    kind: 'rawCode';
    /** Raw TypeScript source supplied to a raw-code-compatible unresolved input. */
    code: string;
} | {
    /** Fill the unresolved input with an already generated or partial fragment. */
    kind: 'fragment';
    /** Fragment or partial artifact supplied to a fragment-compatible unresolved input. */
    fragment: TemplateArtifact;
} | {
    /** Fill an unresolved variadic input with ordered generated fragments. */
    kind: 'fragmentCollection';
    fragments: TemplateArtifact[];
};
/**
 * Template artifact fill values keyed by unresolved opaque ID or by an input
 * name that is unique within the artifact. Unknown and ambiguous keys are
 * rejected transactionally.
 */
export type TemplateArtifactInputMap = Record<string, TemplateArtifactInput>;
/** An input marker that is still open in a partial template artifact. */
export interface UnresolvedTemplateInput {
    /** Stable opaque replacement ID used by the marker in `code`. */
    id: string;
    /** Original template input name. */
    inputName: string;
    /** Graph node that produced this unresolved input, when available. */
    nodeId?: string;
    /** Template model ID that owns this unresolved input. */
    templateId: string;
    /** Port contract that a later fill must satisfy. */
    port: InputPort;
    /** JSON-path-like location of the unresolved graph input, when available. */
    path?: string;
}
/** A fully resolved template artifact. */
export interface CompleteTemplateArtifact extends GeneratedFragment {
    /** Complete artifacts have no unresolved inputs. */
    complete: true;
}
/** Template-like generated code that still contains fillable marker regions. */
export interface PartialTemplateArtifact extends Omit<GeneratedFragment, 'diagnostics'> {
    /** Partial artifacts still contain unresolved marker regions. */
    complete: false;
    /** Inputs that must be filled before finalization. */
    unresolvedInputs: UnresolvedTemplateInput[];
    /** Diagnostics attached to this partial artifact, if any. */
    diagnostics?: SynthesisDiagnostic[];
}
/** Generated template state that may be complete or still fillable. */
export type TemplateArtifact = CompleteTemplateArtifact | PartialTemplateArtifact;
/**
 * Opt-in restrictions for raw-code graph inputs before they reach generation.
 *
 * Raw code is still parsed and checked by the normal replacement security
 * policy after graph validation; this policy is an earlier planner-facing gate.
 */
export interface RawCodePolicy {
    /** Human-readable policy description for planners and summaries. */
    description?: string;
    /** Maximum number of characters accepted for the raw-code input. */
    maxLength?: number;
    /** Set to false to reject raw-code inputs containing CR or LF characters. */
    allowNewlines?: boolean;
    /** Literal substrings that must not appear in the raw-code input. */
    forbiddenSubstrings?: string[];
    /** Regular expression source strings matched with the `u` flag. */
    forbiddenPatterns?: string[];
}
/**
 * A template input contract. Each variant describes one accepted graph input
 * shape and the replacement region kind it will feed in the template source.
 */
export type InputPort = LiteralInputPort | FragmentInputPort | FragmentCollectionInputPort | RawCodeInputPort | UnionInputPort;
/** Common metadata shared by all input port shapes. */
interface BaseInputPort {
    /** Whether this input must be present; defaults to true. */
    required?: boolean;
    /** Human-readable input description for planners and summaries. */
    description?: string;
}
/** Common contract for input ports that feed a concrete replacement region. */
interface RegionInputPort extends BaseInputPort {
    /** Replacement region kind this input will feed. */
    regionKind: RegionKind;
}
/** A JSON-like value validated with the supported schema subset. */
export interface LiteralInputPort extends RegionInputPort {
    /** Port discriminator for JSON-like literal inputs. */
    kind: 'literal';
    /** Optional supported JSON Schema used to validate the literal value. */
    schema?: SupportedJsonSchema;
}
/** A reference to another generated fragment with kind/type/source checks. */
export interface FragmentInputPort extends RegionInputPort {
    /** Port discriminator for graph fragment references. */
    kind: 'fragment';
    /** Fragment compatibility requirements. */
    accepts: {
        /** Required output kind of the referenced fragment; defaults to `regionKind`. */
        outputKind?: RegionKind;
        /** Optional type metadata the referenced fragment must satisfy. */
        type?: TypeDescriptor;
        /** Optional allowlist of template model IDs that may produce the fragment. */
        sourceModelIds?: string[];
    };
}
/** An ordered, variadic collection of references to compatible generated fragments. */
export interface FragmentCollectionInputPort extends RegionInputPort {
    /** Port discriminator for graph fragment-reference collections. */
    kind: 'fragmentCollection';
    /** Fragment compatibility requirements applied independently to every item. */
    accepts: FragmentInputPort['accepts'];
    /**
     * Text placed between fragment sources when replacing the collection region.
     * The default follows the region's syntax context (for example, newline for
     * statements and comma-space for parameters).
     */
    separator?: string;
    /** Minimum number of referenced fragments. Defaults to zero. */
    minItems?: number;
    /** Maximum number of referenced fragments, when bounded. */
    maxItems?: number;
}
/** A caller-provided TypeScript snippet gated by an optional raw-code policy. */
export interface RawCodeInputPort extends RegionInputPort {
    /** Port discriminator for raw TypeScript snippets. */
    kind: 'rawCode';
    /** Optional planner-facing raw-code restrictions. */
    policy?: RawCodePolicy;
    /** Optional type metadata describing the raw-code snippet. */
    type?: TypeDescriptor;
}
/**
 * A port that accepts any one of several concrete input port shapes.
 *
 * The region builder currently emits one marker using the first option's
 * `regionKind`, so options should share a region kind unless the template body
 * is intentionally relying on that first-option marker.
 */
export interface UnionInputPort extends BaseInputPort {
    /** Port discriminator for multi-shape inputs. */
    kind: 'union';
    /** Ordered concrete port options accepted for this input. */
    options: InputPort[];
}
/** Output contract advertised by a graph template. */
export interface OutputPort {
    /** Syntactic region kind produced by the template. */
    kind: RegionKind;
    /** Optional TypeScript/JSON-schema type metadata for compatibility checks. */
    type?: TypeDescriptor;
    /** @deprecated Put generated-output schema metadata in `type.schema`. */
    schema?: SupportedJsonSchema;
    /** Human-readable output description for planners and summaries. */
    description?: string;
}
/** Declarative graph of template nodes with one requested final node. */
export interface SynthesisGraph {
    /** Nodes available to compile. */
    nodes: SynthesisNode[];
    /** Node ID whose fragment should be returned as the final result. */
    readonly finalNodeId: string;
    /** Optional constraints for the final generated fragment. */
    readonly goal?: SynthesisGoal;
}
/** One graph node: select a template and provide inputs by template port name. */
export interface SynthesisNode {
    /** Unique node identifier within the graph. */
    id: string;
    /** Template model ID to invoke for this node. */
    templateId: string;
    /** Inputs keyed by the selected template's port names. */
    inputs: Record<string, SynthesisInput>;
}
/**
 * Input value syntax accepted in graph definitions.
 *
 * `$ref` is shorthand for `{ kind: "ref", nodeId }`; `inline` nodes are
 * normalized into standalone nodes before validation.
 */
export type SynthesisInput = {
    /** Input discriminator for an ordered collection of graph fragment references. */
    kind: 'fragmentCollection';
    /** References or inline nodes whose generated sources are joined in order. */
    items: Array<{
        kind: 'ref';
        nodeId: string;
    } | {
        kind: 'inline';
        node: SynthesisNode;
    } | {
        $ref: string;
    }>;
} | {
    /** Input discriminator for JSON-like literal values. */
    kind: 'literal';
    /** Literal value supplied to a literal port. */
    value: unknown;
} | {
    /** Input discriminator for references to another graph node. */
    kind: 'ref';
    /** Node ID whose generated fragment should feed the input. */
    nodeId: string;
} | {
    /** Input discriminator for caller-provided TypeScript snippets. */
    kind: 'rawCode';
    /** Raw TypeScript source supplied to a raw-code port. */
    code: string;
} | {
    /** Input discriminator for nested nodes normalized before validation. */
    kind: 'inline';
    /** Inline node definition to compile as an input dependency. */
    node: SynthesisNode;
} | {
    /** Shorthand node reference equivalent to `{ kind: "ref", nodeId }`. */
    $ref: string;
};
/** Graph input shape after shorthand refs and inline nodes are expanded. */
export type NormalizedSynthesisInput = Exclude<SynthesisInput, {
    $ref: string;
} | {
    kind: 'inline';
    node: SynthesisNode;
} | {
    kind: 'fragmentCollection';
}> | {
    kind: 'fragmentCollection';
    items: Array<{
        kind: 'ref';
        nodeId: string;
    }>;
};
/** Result of graph normalization before validation and compilation. */
export interface GraphNormalizationResult {
    /** Graph after shorthand refs and inline nodes have been expanded. */
    graph: SynthesisGraph;
}
/** Optional final-fragment constraints checked after graph compilation. */
export interface SynthesisGoal {
    /** Final fragment region kind. */
    outputKind?: RegionKind;
    /** Final fragment type metadata. */
    type?: TypeDescriptor;
    /** @deprecated Put final-fragment schema metadata in `type.schema`. */
    schema?: SupportedJsonSchema;
}
/** Immutable, local graph edits accepted by the runner repair protocol. */
export type GraphPatchAction = {
    kind: 'addNode';
    node: SynthesisNode;
} | {
    kind: 'removeNode';
    nodeId: string;
} | {
    kind: 'setInput';
    nodeId: string;
    inputName: string;
    input: SynthesisInput;
} | {
    kind: 'removeInput';
    nodeId: string;
    inputName: string;
} | {
    kind: 'setFinalNode';
    nodeId: string;
} | {
    kind: 'setGoal';
    goal: SynthesisGoal;
} | {
    kind: 'removeGoal';
};
/** Any explicit action accepted by `GraphRunner.advance()`. */
export type GraphRunnerAction = GraphPatchAction | {
    kind: 'replaceGraph';
    graph: SynthesisGraph;
} | {
    kind: 'fill';
    inputs: TemplateArtifactInputMap;
};
/** Transactional result returned by `applyGraphPatch()`. */
export type GraphPatchResult = {
    kind: 'graphPatch';
    ok: true;
    graph: SynthesisGraph;
    diagnostics: SynthesisDiagnostic[];
} | {
    kind: 'graphPatch';
    ok: false;
    classification: 'graphRepairable';
    graph: SynthesisGraph;
    diagnostics: SynthesisDiagnostic[];
};
/** Minimal graph shape accepted by typed graph authoring helpers. */
export type AuthoredGraphNode = {
    readonly id: string;
    readonly templateId: string;
    readonly inputs: Record<string, unknown>;
};
/** Minimal full graph input shape accepted by typed graph authoring helpers. */
export type AuthoredGraphInput = {
    readonly nodes: readonly AuthoredGraphNode[];
    readonly finalNodeId: string;
    readonly goal?: SynthesisGoal;
};
/** Public, implementation-free template metadata for planners and UIs. */
export interface TemplateSummary {
    /** Template model ID. */
    modelId: string;
    /** Template version, when provided by the definition. */
    version?: string;
    /** Human-readable template description. */
    description?: string;
    /** Summaries of accepted inputs keyed by input name. */
    inputs: Record<string, InputPortSummary>;
    /** Summary of the generated output. */
    output: OutputPortSummary;
}
/** Read-only validated template catalog accepted by graph compilation. */
export interface TemplateCatalogView {
    /** Stable digest of the normalized planner-facing catalog contract. */
    readonly contractDigest: string;
    /** Stable digest of the catalog's executable declarative template manifests. */
    readonly manifestDigest: string;
    /** Look up a template by model ID. */
    get(templateId: string): GraphTemplateDefinition<any, string> | undefined;
    /** Return all templates sorted by model ID. */
    list(): GraphTemplateDefinition<any, string>[];
    /** Return planner-facing summaries sorted by model ID. */
    summaries(): TemplateSummary[];
}
/** Immutable registry membership and planner contract captured at one point in time. */
export interface TemplateRegistrySnapshot extends TemplateCatalogView {
}
/** Mutable validated registry used to construct template catalog snapshots. */
export interface TemplateRegistry extends TemplateCatalogView {
    /** Insert a template whose model ID is not already registered. */
    register(template: GraphTemplateDefinition<any, string>): void;
    /** Atomically insert a batch, allowing references among templates in the batch. */
    registerAll(templates: readonly GraphTemplateDefinition<any, string>[]): void;
    /** Explicitly replace an existing template and revalidate all dependents. */
    replace(template: GraphTemplateDefinition<any, string>): void;
    /** Capture immutable membership, summaries, and contract digest. */
    snapshot(): TemplateRegistrySnapshot;
}
/** Compilation behavior selected for graph execution. */
export type GraphCompilationMode = 'strict' | 'partial';
/** Artifact type produced by a compilation mode. */
export type GraphArtifactForMode<M extends GraphCompilationMode> = M extends 'strict' ? CompleteTemplateArtifact : TemplateArtifact;
/** Unified success or failure result returned by graph compilation. */
export type GraphCompilationResult<M extends GraphCompilationMode = 'strict'> = {
    kind: 'graphCompilation';
    mode: M;
    ok: true;
    finalArtifact: GraphArtifactForMode<M>;
    artifacts: Record<string, GraphArtifactForMode<M>>;
    diagnostics: SynthesisDiagnostic[];
} | {
    kind: 'graphCompilation';
    mode: M;
    ok: false;
    classification: Exclude<SynthesisFailureClassification, 'artifactFillable'>;
    diagnostics: SynthesisDiagnostic[];
    partialArtifacts?: Record<string, GraphArtifactForMode<M>>;
};
/** Partial-mode specialization used by runner state types. */
export type GraphPartialCompilationResult = GraphCompilationResult<'partial'>;
/** Success or failure result returned by template artifact fill/finalize APIs. */
export type TemplateArtifactResult = {
    /** Result family discriminator. */
    kind: 'templateArtifact';
    /** Success discriminator. */
    ok: true;
    /** Filled artifact, which may still contain unresolved inputs. */
    artifact: TemplateArtifact;
    /** Non-fatal diagnostics collected while filling. */
    diagnostics: SynthesisDiagnostic[];
} | {
    /** Result family discriminator. */
    kind: 'templateArtifact';
    /** Failure discriminator. */
    ok: false;
    /** Contextual repair channel for this failed artifact operation. */
    classification: Exclude<SynthesisFailureClassification, 'graphRepairable'>;
    /** Error and warning diagnostics collected while filling. */
    diagnostics: SynthesisDiagnostic[];
    /** Best-effort artifact produced before failure, when available. */
    artifact?: TemplateArtifact;
};
/** Concrete graph input after validation has matched it to a concrete port. */
export type ResolvedGraphInput = {
    /** Resolved input discriminator for literal values. */
    kind: 'literal';
    /** Validated literal value. */
    value: unknown;
    /** Concrete literal port that accepted the value. */
    port: LiteralInputPort;
} | {
    /** Resolved input discriminator for generated fragments. */
    kind: 'fragment';
    /** Referenced fragment that satisfied the fragment port. */
    fragment: TemplateArtifact;
    /** Concrete fragment port that accepted the fragment. */
    port: FragmentInputPort;
} | {
    /** Resolved input discriminator for ordered fragment collections. */
    kind: 'fragmentCollection';
    /** Referenced fragments in authored order. */
    fragments: TemplateArtifact[];
    /** Collection port that accepted every fragment. */
    port: FragmentCollectionInputPort;
} | {
    /** Resolved input discriminator for raw-code snippets. */
    kind: 'rawCode';
    /** Raw TypeScript source accepted by the raw-code port. */
    code: string;
    /** Concrete raw-code port that accepted the snippet. */
    port: RawCodeInputPort;
};
/** Common invocation payload for graph template generation. */
interface BaseGraphTemplateInvocation {
    /** Graph node ID for provenance, when invoked from graph compilation. */
    nodeId?: string;
    /** Inputs resolved and matched to concrete ports. */
    inputs: Record<string, ResolvedGraphInput>;
    /** Generation options forwarded to the replacement engine. */
    options?: GenerateOptions;
}
/** Invocation payload for strict graph template generation. */
export interface GraphTemplateInvocation extends BaseGraphTemplateInvocation {
}
/** Invocation payload for graph template generation that may leave holes open. */
export interface GraphTemplatePartialInvocation extends BaseGraphTemplateInvocation {
    /** Missing required inputs to preserve as marker regions. */
    unresolvedInputs: Record<string, UnresolvedTemplateInput>;
}
/** Serializable author-owned portion of a graph template definition. */
export interface GraphTemplateManifest<I extends Record<string, InputPort> = Record<string, InputPort>, M extends string = string, O extends OutputPort = OutputPort> {
    /** Stable template/model identifier used by graph nodes. */
    readonly modelId: M;
    /** Optional template version copied into generated fragment provenance. */
    readonly version?: string;
    /** Optional human-readable summary for planners and registries. */
    readonly description?: string;
    /** Named input ports accepted by this template. */
    readonly inputs: I;
    /** Output fragment contract produced by the template. */
    readonly output: O;
    /** Complete marked TypeScript source used for every invocation. */
    readonly source: string;
}
/**
 * Executable graph template definition.
 *
 * `defineTemplate` creates this shape from a declarative template definition
 * and wires invocation through the lower-level replacement engine.
 */
export interface GraphTemplateDefinition<I extends Record<string, InputPort> = Record<string, InputPort>, M extends string = string, O extends OutputPort = OutputPort> extends GraphTemplateManifest<I, M, O> {
    /** Digest of this template's normalized contract and exact executable source. */
    readonly manifestDigest: string;
    /** Invoke the template with already-resolved graph inputs. */
    invoke(invocation: GraphTemplateInvocation): GeneratedFragment;
    /** Invoke the template while preserving missing required inputs as markers. */
    invokePartial(invocation: GraphTemplatePartialInvocation): TemplateArtifact;
    /** Convert already-resolved graph inputs to a low-level replacement map. */
    toReplacementMap(inputs: Record<string, ResolvedGraphInput>): ReplacementMap;
    /** Produce planner-facing metadata without exposing template source. */
    summary(): TemplateSummary;
}
/** A real or caller-supplied target file into which an artifact is virtually inserted. */
export interface SemanticTargetFileContext {
    /** Target source-file identity used by TypeScript and graph diagnostics. */
    filePath: string;
    /** Zero-based UTF-16 offset at which the insertion/replacement starts. */
    start: number;
    /** Exclusive replacement end offset; defaults to `start` for pure insertion. */
    end?: number;
    /** Optional unsaved target source; omit to load `filePath` from disk. */
    sourceText?: string;
}
/** Optional insertion-site context used by graph semantic validation. */
export interface GraphSemanticContext {
    /** Declarations or imports made available to a synthetic validation wrapper. */
    prelude?: string;
    /** Real file context used for virtual insertion and local-scope resolution. */
    targetFile?: SemanticTargetFileContext;
}
/** Graph compilation options are the normal generation options. */
export interface GraphCompileOptions extends GenerateOptions {
    /** @deprecated Graph compilation derives validation wrappers from each artifact kind. */
    templateMode?: TemplateMode;
    /**
     * Stable caller-selected namespace for unresolved artifact input IDs.
     *
     * Supply distinct values when separately compiled instances of the same
     * graph may later be merged. Omitting it derives a reproducible scope from
     * the graph itself.
     */
    compilationScope?: string;
    /** Reject compilation when the active catalog does not match this digest. */
    expectedCatalogDigest?: string;
    /** Reject compilation when executable template manifests differ from this digest. */
    expectedCatalogManifestDigest?: string;
    /** Optional declarations or imports prepended during graph semantic validation. */
    semanticContext?: GraphSemanticContext;
}
/** Options for the unified graph compiler. */
export interface ModeAwareGraphCompileOptions extends GraphCompileOptions {
    mode: GraphCompilationMode;
}
/** Serialized input-port metadata without template implementation details. */
export type InputPortSummary = LiteralInputPortSummary | FragmentInputPortSummary | FragmentCollectionInputPortSummary | RawCodeInputPortSummary | UnionInputPortSummary;
export interface BasePortSummary {
    /** Summary discriminator matching the original port kind. */
    kind: string;
    /** Whether the summarized input is required. */
    required: boolean;
    /** Human-readable input description, when provided. */
    description?: string;
}
export interface LiteralInputPortSummary extends BasePortSummary {
    /** Summary discriminator for literal ports. */
    kind: 'literal';
    /** Replacement region kind the literal feeds. */
    regionKind: RegionKind;
    /** Supported JSON Schema used to validate literal values, when provided. */
    schema?: SupportedJsonSchema;
}
export interface FragmentInputPortSummary extends BasePortSummary {
    /** Summary discriminator for fragment ports. */
    kind: 'fragment';
    /** Replacement region kind the referenced fragment feeds. */
    regionKind: RegionKind;
    /** Fragment compatibility requirements. */
    accepts: {
        /** Required output kind of referenced fragments, resolved from the port default. */
        outputKind: RegionKind;
        /** Type metadata referenced fragments must satisfy, when provided. */
        type?: TypeDescriptor;
        /** Template model IDs allowed as fragment sources, when provided. */
        sourceModelIds?: string[];
    };
}
export interface FragmentCollectionInputPortSummary extends BasePortSummary {
    kind: 'fragmentCollection';
    regionKind: RegionKind;
    accepts: FragmentInputPortSummary['accepts'];
    separator: string;
    minItems: number;
    maxItems?: number;
}
export interface RawCodeInputPortSummary extends BasePortSummary {
    /** Summary discriminator for raw-code ports. */
    kind: 'rawCode';
    /** Replacement region kind the raw code feeds. */
    regionKind: RegionKind;
    /** Planner-facing raw-code restrictions, when provided. */
    policy?: RawCodePolicy;
    /** Type metadata describing accepted raw code, when provided. */
    type?: TypeDescriptor;
}
export interface UnionInputPortSummary extends BasePortSummary {
    /** Summary discriminator for union ports. */
    kind: 'union';
    /** Summaries of the concrete port options accepted by the union. */
    options: InputPortSummary[];
}
export interface OutputPortSummary {
    /** Syntactic region kind produced by the template. */
    kind: RegionKind;
    /** Type metadata advertised by the template output, when provided. */
    type?: TypeDescriptor;
    /** Deprecated schema alias advertised by the template output, when provided. */
    schema?: SupportedJsonSchema;
    /** Human-readable output description, when provided. */
    description?: string;
}
export {};
```

## TypeBox contract and schema definitions

Copied from `src/templates/graphContracts.ts`.

```ts
import { Type, type Static, type TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { SUPPORTED_JSON_SCHEMA_CONTRACT_DEFINITIONS } from './schemaContract.js'
import type {
	GraphTemplateManifest,
	GraphPatchAction,
	GraphPatchResult,
	GraphRunnerAction,
	SynthesisGraph
} from './graphCoreTypes.js'
import type { GraphRunnerState } from './runner.js'
import type {
	ArtifactFillLedgerEntry,
	ArtifactSetCompilationResult,
	ArtifactSetPlan,
	ArtifactSetStaticValidationResult,
	ValidatedArtifactChangeSet
} from './artifactSet.js'

const RegionKindDefinition = Type.Union([
	Type.Literal('identifier'), Type.Literal('expression'), Type.Literal('expressionSuffix'),
	Type.Literal('statement'), Type.Literal('array'), Type.Literal('object'), Type.Literal('string'),
	Type.Literal('number'), Type.Literal('boolean'), Type.Literal('null'), Type.Literal('objectProperty'),
	Type.Literal('type'), Type.Literal('typeMember'), Type.Literal('typeParameter'),
	Type.Literal('parameter'), Type.Literal('constructorParameter'), Type.Literal('heritageType'),
	Type.Literal('declaration'), Type.Literal('classMember'), Type.Literal('enumMember'),
	Type.Literal('importSpecifier'), Type.Literal('exportSpecifier'), Type.Literal('sourceFile')
])

const TypeDescriptorDefinition = Type.Object({
	ts: Type.Optional(Type.String()),
	schema: Type.Optional(Type.Ref('SupportedJsonSchema'))
}, { additionalProperties: false })

const RawCodePolicyDefinition = Type.Object({
	description: Type.Optional(Type.String()),
	maxLength: Type.Optional(Type.Integer({ minimum: 0 })),
	allowNewlines: Type.Optional(Type.Boolean()),
	forbiddenSubstrings: Type.Optional(Type.Array(Type.String())),
	forbiddenPatterns: Type.Optional(Type.Array(Type.String()))
}, { additionalProperties: false })

const FragmentAcceptsDefinition = Type.Object({
	outputKind: Type.Optional(Type.Ref('CompilationRegionKind')),
	type: Type.Optional(Type.Ref('CompilationTypeDescriptor')),
	sourceModelIds: Type.Optional(Type.Array(Type.String()))
}, { additionalProperties: false })

const GeneratedFragmentProperties = {
	id: Type.Optional(Type.String()),
	code: Type.String(),
	kind: Type.Ref('CompilationRegionKind'),
	source: Type.Object({
		templateId: Type.String(),
		templateVersion: Type.Optional(Type.String()),
		templateManifestDigest: Type.Optional(Type.String())
	}, { additionalProperties: false }),
	type: Type.Optional(Type.Ref('CompilationTypeDescriptor')),
	schema: Type.Optional(Type.Ref('SupportedJsonSchema')),
	provenance: Type.Optional(Type.Object({
		nodeId: Type.Optional(Type.String()), inputRefs: Type.Optional(Type.Array(Type.String())),
		literalInputs: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
	}, { additionalProperties: false })),
	sourceMap: Type.Optional(Type.Ref('GeneratedSourceMap')),
	diagnostics: Type.Optional(Type.Array(Type.Ref('SynthesisDiagnostic')))
} as const

const SynthesisDiagnosticProperties = {
	stage: Type.Union([
		Type.Literal('graph'), Type.Literal('template'), Type.Literal('input'), Type.Literal('port'),
		Type.Literal('region'), Type.Literal('ast'), Type.Literal('type'), Type.Literal('policy')
	]),
	code: Type.String(),
	severity: Type.Union([Type.Literal('error'), Type.Literal('warning')]),
	message: Type.String(),
	nodeId: Type.Optional(Type.String()),
	templateId: Type.Optional(Type.String()),
	inputName: Type.Optional(Type.String()),
	path: Type.Optional(Type.String()),
	expected: Type.Optional(Type.Unknown()),
	actual: Type.Optional(Type.Unknown()),
	repairHints: Type.Optional(Type.Array(Type.Ref('SynthesisRepairHint'))),
	compilerCode: Type.Optional(Type.Number()),
	compilerCategory: Type.Optional(Type.Union([
		Type.Literal('error'), Type.Literal('warning'), Type.Literal('suggestion'), Type.Literal('message')
	])),
	line: Type.Optional(Type.Number()),
	column: Type.Optional(Type.Number())
} as const

const GraphContractDefinitions = {
	...SUPPORTED_JSON_SCHEMA_CONTRACT_DEFINITIONS,
	GraphRegionKind: RegionKindDefinition,
	GraphTypeDescriptor: TypeDescriptorDefinition,
	SynthesisInput: Type.Union([
		Type.Object({ kind: Type.Literal('literal'), value: Type.Unknown() }, { additionalProperties: false }),
		Type.Object({ kind: Type.Literal('ref'), nodeId: Type.String() }, { additionalProperties: false }),
		Type.Object({ kind: Type.Literal('rawCode'), code: Type.String() }, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('fragmentCollection'),
			items: Type.Array(Type.Union([
				Type.Object({ kind: Type.Literal('ref'), nodeId: Type.String() }, { additionalProperties: false }),
				Type.Object({ $ref: Type.String() }, { additionalProperties: false }),
				Type.Object({ kind: Type.Literal('inline'), node: Type.Ref('SynthesisNode') }, { additionalProperties: false })
			]))
		}, { additionalProperties: false }),
		Type.Object({ $ref: Type.String() }, { additionalProperties: false }),
		Type.Object({ kind: Type.Literal('inline'), node: Type.Ref('SynthesisNode') }, { additionalProperties: false })
	]),
	SynthesisNode: Type.Object({
		id: Type.String(),
		templateId: Type.String(),
		inputs: Type.Record(Type.String(), Type.Ref('SynthesisInput'))
	}, { additionalProperties: false }),
	SynthesisGoal: Type.Object({
		outputKind: Type.Optional(Type.Ref('GraphRegionKind')),
		type: Type.Optional(Type.Ref('GraphTypeDescriptor')),
		schema: Type.Optional(Type.Ref('SupportedJsonSchema'))
	}, { additionalProperties: false }),
	SynthesisGraph: Type.Object({
		nodes: Type.Array(Type.Ref('SynthesisNode')),
		finalNodeId: Type.String(),
		goal: Type.Optional(Type.Ref('SynthesisGoal'))
	}, { additionalProperties: false })
} as const

const GraphContractModule = Type.Module(GraphContractDefinitions)

const SummaryContractModule = Type.Module({
	...SUPPORTED_JSON_SCHEMA_CONTRACT_DEFINITIONS,
	SummaryRegionKind: RegionKindDefinition,
	SummaryTypeDescriptor: TypeDescriptorDefinition,
	SummaryRawCodePolicy: RawCodePolicyDefinition,
	FragmentAcceptsSummary: Type.Object({
		outputKind: Type.Ref('SummaryRegionKind'),
		type: Type.Optional(Type.Ref('SummaryTypeDescriptor')),
		sourceModelIds: Type.Optional(Type.Array(Type.String()))
	}, { additionalProperties: false }),
	LiteralInputPortSummary: Type.Object({
		kind: Type.Literal('literal'), regionKind: Type.Ref('SummaryRegionKind'), required: Type.Boolean(),
		description: Type.Optional(Type.String()), schema: Type.Optional(Type.Ref('SupportedJsonSchema'))
	}, { additionalProperties: false }),
	FragmentInputPortSummary: Type.Object({
		kind: Type.Literal('fragment'), regionKind: Type.Ref('SummaryRegionKind'), required: Type.Boolean(),
		description: Type.Optional(Type.String()), accepts: Type.Ref('FragmentAcceptsSummary')
	}, { additionalProperties: false }),
	FragmentCollectionInputPortSummary: Type.Object({
		kind: Type.Literal('fragmentCollection'), regionKind: Type.Ref('SummaryRegionKind'), required: Type.Boolean(),
		description: Type.Optional(Type.String()), accepts: Type.Ref('FragmentAcceptsSummary'),
		separator: Type.String(), minItems: Type.Integer({ minimum: 0 }),
		maxItems: Type.Optional(Type.Integer({ minimum: 0 }))
	}, { additionalProperties: false }),
	RawCodeInputPortSummary: Type.Object({
		kind: Type.Literal('rawCode'), regionKind: Type.Ref('SummaryRegionKind'), required: Type.Boolean(),
		description: Type.Optional(Type.String()), policy: Type.Optional(Type.Ref('SummaryRawCodePolicy')),
		type: Type.Optional(Type.Ref('SummaryTypeDescriptor'))
	}, { additionalProperties: false }),
	UnionInputPortSummary: Type.Object({
		kind: Type.Literal('union'), required: Type.Boolean(), description: Type.Optional(Type.String()),
		options: Type.Array(Type.Ref('InputPortSummary'), { minItems: 1 })
	}, { additionalProperties: false }),
	InputPortSummary: Type.Union([
		Type.Ref('LiteralInputPortSummary'),
		Type.Ref('FragmentInputPortSummary'),
		Type.Ref('FragmentCollectionInputPortSummary'),
		Type.Ref('RawCodeInputPortSummary'),
		Type.Ref('UnionInputPortSummary')
	]),
	OutputPortSummary: Type.Object({
		kind: Type.Ref('SummaryRegionKind'),
		type: Type.Optional(Type.Ref('SummaryTypeDescriptor')),
		schema: Type.Optional(Type.Ref('SupportedJsonSchema')),
		description: Type.Optional(Type.String())
	}, { additionalProperties: false }),
	TemplateSummary: Type.Object({
		modelId: Type.String(),
		version: Type.Optional(Type.String()),
		description: Type.Optional(Type.String()),
		inputs: Type.Record(Type.String(), Type.Ref('InputPortSummary')),
		output: Type.Ref('OutputPortSummary')
	}, { additionalProperties: false })
})

const CompilationContractModule = Type.Module({
	...GraphContractDefinitions,
	CompilationRegionKind: RegionKindDefinition,
	CompilationTypeDescriptor: TypeDescriptorDefinition,
	CompilationRawCodePolicy: RawCodePolicyDefinition,
	SynthesisFailureClassification: Type.Union([
		Type.Literal('graphRepairable'),
		Type.Literal('artifactFillable'),
		Type.Literal('templatePolicyFailure'),
		Type.Literal('terminalFailure')
	]),
	GraphCompilationFailureClassification: Type.Union([
		Type.Literal('graphRepairable'),
		Type.Literal('templatePolicyFailure'),
		Type.Literal('terminalFailure')
	]),
	TemplateArtifactFailureClassification: Type.Union([
		Type.Literal('artifactFillable'),
		Type.Literal('templatePolicyFailure'),
		Type.Literal('terminalFailure')
	]),
	SynthesisRepairHint: Type.Object({
		kind: Type.String(),
		message: Type.String()
	}, { additionalProperties: true }),
	SynthesisDiagnostic: Type.Object(SynthesisDiagnosticProperties, { additionalProperties: false }),
	GeneratedNodeSourceSpan: Type.Object({
		kind: Type.Literal('node'),
		start: Type.Integer({ minimum: 0 }),
		end: Type.Integer({ minimum: 0 }),
		nestingDepth: Type.Integer({ minimum: 0 }),
		nodeId: Type.Optional(Type.String()),
		templateId: Type.String()
	}, { additionalProperties: false }),
	GeneratedInputSourceSpan: Type.Object({
		kind: Type.Literal('input'),
		start: Type.Integer({ minimum: 0 }),
		end: Type.Integer({ minimum: 0 }),
		nestingDepth: Type.Integer({ minimum: 0 }),
		nodeId: Type.Optional(Type.String()),
		templateId: Type.String(),
		inputName: Type.String()
	}, { additionalProperties: false }),
	GeneratedSourceSpan: Type.Union([
		Type.Ref('GeneratedNodeSourceSpan'), Type.Ref('GeneratedInputSourceSpan')
	]),
	GeneratedSourceMap: Type.Object({
		version: Type.Literal(1),
		spans: Type.Array(Type.Ref('GeneratedSourceSpan'))
	}, { additionalProperties: false }),
	FragmentAccepts: FragmentAcceptsDefinition,
	InputPort: Type.Union([
		Type.Object({
			kind: Type.Literal('literal'), regionKind: Type.Ref('CompilationRegionKind'),
			required: Type.Optional(Type.Boolean()), description: Type.Optional(Type.String()),
			schema: Type.Optional(Type.Ref('SupportedJsonSchema'))
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('fragment'), regionKind: Type.Ref('CompilationRegionKind'),
			required: Type.Optional(Type.Boolean()), description: Type.Optional(Type.String()),
			accepts: Type.Ref('FragmentAccepts')
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('fragmentCollection'), regionKind: Type.Ref('CompilationRegionKind'),
			required: Type.Optional(Type.Boolean()), description: Type.Optional(Type.String()),
			accepts: Type.Ref('FragmentAccepts'), separator: Type.Optional(Type.String()),
			minItems: Type.Optional(Type.Integer({ minimum: 0 })),
			maxItems: Type.Optional(Type.Integer({ minimum: 0 }))
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('rawCode'), regionKind: Type.Ref('CompilationRegionKind'),
			required: Type.Optional(Type.Boolean()), description: Type.Optional(Type.String()),
			policy: Type.Optional(Type.Ref('CompilationRawCodePolicy')), type: Type.Optional(Type.Ref('CompilationTypeDescriptor'))
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('union'), required: Type.Optional(Type.Boolean()), description: Type.Optional(Type.String()),
			options: Type.Array(Type.Ref('InputPort'), { minItems: 1 })
		}, { additionalProperties: false })
	]),
	OutputPort: Type.Object({
		kind: Type.Ref('CompilationRegionKind'),
		type: Type.Optional(Type.Ref('CompilationTypeDescriptor')),
		schema: Type.Optional(Type.Ref('SupportedJsonSchema')),
		description: Type.Optional(Type.String())
	}, { additionalProperties: false }),
	GraphTemplateManifest: Type.Object({
		modelId: Type.String({ minLength: 1 }),
		version: Type.Optional(Type.String()),
		description: Type.Optional(Type.String()),
		inputs: Type.Record(Type.String(), Type.Ref('InputPort')),
		output: Type.Ref('OutputPort'),
		source: Type.String()
	}, { additionalProperties: false }),
	ArtifactTarget: Type.Union([
		Type.Object({
			kind: Type.Literal('createFile'), path: Type.String({ minLength: 1 })
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('replaceRange'), path: Type.String({ minLength: 1 }),
			start: Type.Integer({ minimum: 0 }), end: Type.Integer({ minimum: 0 }),
			baseFileHash: Type.String(), regionKind: Type.Ref('CompilationRegionKind')
		}, { additionalProperties: false })
	]),
	ArtifactSetUnit: Type.Object({
		id: Type.String({ minLength: 1 }), graph: Type.Ref('SynthesisGraph'), target: Type.Ref('ArtifactTarget')
	}, { additionalProperties: false }),
	ArtifactSetPlan: Type.Object({
		artifacts: Type.Array(Type.Ref('ArtifactSetUnit'), { minItems: 1 })
	}, { additionalProperties: false }),
	ArtifactFillLedgerEntry: Type.Object({
		artifactId: Type.String({ minLength: 1 }), graphHash: Type.String(), baseArtifactHash: Type.String(),
		inputs: Type.Ref('TemplateArtifactInputMap'), resultingArtifactHash: Type.String()
	}, { additionalProperties: false }),
	ArtifactSetDiagnostic: Type.Object({
		...SynthesisDiagnosticProperties,
		artifactId: Type.Optional(Type.String())
	}, { additionalProperties: false }),
	ArtifactSetTextEdit: Type.Object({
		artifactId: Type.String(), start: Type.Integer({ minimum: 0 }), end: Type.Integer({ minimum: 0 }),
		resultStart: Type.Integer({ minimum: 0 }), resultEnd: Type.Integer({ minimum: 0 }),
		replacement: Type.String(), artifactHash: Type.String()
	}, { additionalProperties: false }),
	ArtifactSetChange: Type.Union([
		Type.Object({
			kind: Type.Literal('createFile'), path: Type.String(), resultingFileHash: Type.String(),
			sourceText: Type.String(), edits: Type.Array(Type.Ref('ArtifactSetTextEdit'))
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('modifyFile'), path: Type.String(), baseFileHash: Type.String(),
			resultingFileHash: Type.String(), sourceText: Type.String(),
			edits: Type.Array(Type.Ref('ArtifactSetTextEdit'))
		}, { additionalProperties: false })
	]),
	ValidatedArtifactChangeSet: Type.Object({
		validation: Type.Literal('static'),
		changes: Type.Array(Type.Ref('ArtifactSetChange')), changeSetHash: Type.String(),
		contractDigest: Type.String({ pattern: '^c4_[a-f0-9]{64}$' }),
		manifestDigest: Type.String({ pattern: '^m1_[a-f0-9]{64}$' }),
		workspaceSnapshotHash: Type.String({ pattern: '^ws1_[a-f0-9]{64}$' }),
		staticPolicyVersion: Type.Integer({ minimum: 1 })
	}, { additionalProperties: false }),
	ArtifactSetStaticValidationResult: Type.Union([
		Type.Object({
			ok: Type.Literal(true), validation: Type.Literal('static'),
			changes: Type.Array(Type.Ref('ArtifactSetChange')), changeSetHash: Type.String(),
			contractDigest: Type.String({ pattern: '^c4_[a-f0-9]{64}$' }),
			manifestDigest: Type.String({ pattern: '^m1_[a-f0-9]{64}$' }),
			workspaceSnapshotHash: Type.String({ pattern: '^ws1_[a-f0-9]{64}$' }),
			staticPolicyVersion: Type.Integer({ minimum: 1 }),
			diagnostics: Type.Array(Type.Ref('ArtifactSetDiagnostic'))
		}, { additionalProperties: false }),
		Type.Object({
			ok: Type.Literal(false),
			classification: Type.Ref('SynthesisFailureClassification'),
			changes: Type.Tuple([]), diagnostics: Type.Array(Type.Ref('ArtifactSetDiagnostic'))
		}, { additionalProperties: false })
	]),
	GeneratedFragment: Type.Object(GeneratedFragmentProperties, { additionalProperties: false }),
	CompleteTemplateArtifact: Type.Object({
		...GeneratedFragmentProperties,
		complete: Type.Literal(true)
	}, { additionalProperties: false }),
	PartialTemplateArtifact: Type.Object({
		...GeneratedFragmentProperties,
		complete: Type.Literal(false),
		unresolvedInputs: Type.Array(Type.Object({
			id: Type.String(), inputName: Type.String(), nodeId: Type.Optional(Type.String()),
			templateId: Type.String(), port: Type.Ref('InputPort'), path: Type.Optional(Type.String())
		}, { additionalProperties: false }), { minItems: 1 })
	}, { additionalProperties: false }),
	TemplateArtifact: Type.Union([
		Type.Ref('CompleteTemplateArtifact'), Type.Ref('PartialTemplateArtifact')
	]),
	TemplateArtifactInput: Type.Union([
		Type.Object({ kind: Type.Literal('literal'), value: Type.Unknown() }, { additionalProperties: false }),
		Type.Object({ kind: Type.Literal('rawCode'), code: Type.String() }, { additionalProperties: false }),
		Type.Object({ kind: Type.Literal('fragment'), fragment: Type.Ref('TemplateArtifact') }, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('fragmentCollection'), fragments: Type.Array(Type.Ref('TemplateArtifact'))
		}, { additionalProperties: false })
	]),
	TemplateArtifactInputMap: Type.Record(Type.String(), Type.Ref('TemplateArtifactInput')),
	TemplateArtifactResult: Type.Union([
		Type.Object({
			kind: Type.Literal('templateArtifact'), ok: Type.Literal(true),
			artifact: Type.Ref('TemplateArtifact'), diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic'))
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('templateArtifact'), ok: Type.Literal(false),
			classification: Type.Ref('TemplateArtifactFailureClassification'),
			diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic')),
			artifact: Type.Optional(Type.Ref('TemplateArtifact'))
		}, { additionalProperties: false })
	]),
	StrictGraphCompilationSuccess: Type.Object({
		kind: Type.Literal('graphCompilation'), mode: Type.Literal('strict'), ok: Type.Literal(true),
		finalArtifact: Type.Ref('CompleteTemplateArtifact'),
		artifacts: Type.Record(Type.String(), Type.Ref('CompleteTemplateArtifact')),
		diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic'))
	}, { additionalProperties: false }),
	StrictGraphCompilationFailure: Type.Object({
		kind: Type.Literal('graphCompilation'), mode: Type.Literal('strict'), ok: Type.Literal(false),
		classification: Type.Ref('GraphCompilationFailureClassification'),
		diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic')),
		partialArtifacts: Type.Optional(Type.Record(Type.String(), Type.Ref('CompleteTemplateArtifact')))
	}, { additionalProperties: false }),
	StrictGraphCompilationResult: Type.Union([
		Type.Ref('StrictGraphCompilationSuccess'), Type.Ref('StrictGraphCompilationFailure')
	]),
	PartialGraphCompilationSuccess: Type.Object({
		kind: Type.Literal('graphCompilation'), mode: Type.Literal('partial'), ok: Type.Literal(true),
		finalArtifact: Type.Ref('TemplateArtifact'),
		artifacts: Type.Record(Type.String(), Type.Ref('TemplateArtifact')),
		diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic'))
	}, { additionalProperties: false }),
	PartialGraphCompilationFailure: Type.Object({
		kind: Type.Literal('graphCompilation'), mode: Type.Literal('partial'), ok: Type.Literal(false),
		classification: Type.Ref('GraphCompilationFailureClassification'),
		diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic')),
		partialArtifacts: Type.Optional(Type.Record(Type.String(), Type.Ref('TemplateArtifact')))
	}, { additionalProperties: false }),
	GraphRepairablePartialCompilationFailure: Type.Object({
		kind: Type.Literal('graphCompilation'), mode: Type.Literal('partial'), ok: Type.Literal(false),
		classification: Type.Literal('graphRepairable'),
		diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic')),
		partialArtifacts: Type.Optional(Type.Record(Type.String(), Type.Ref('TemplateArtifact')))
	}, { additionalProperties: false }),
	PartialGraphCompilationResult: Type.Union([
		Type.Ref('PartialGraphCompilationSuccess'), Type.Ref('PartialGraphCompilationFailure')
	]),
	GraphCompilationResult: Type.Union([
		Type.Ref('StrictGraphCompilationResult'), Type.Ref('PartialGraphCompilationResult')
	]),
	ArtifactSetUnitCompilation: Type.Object({
		artifactId: Type.String(), graphHash: Type.String(), target: Type.Ref('ArtifactTarget'),
		compilation: Type.Ref('PartialGraphCompilationResult'), artifact: Type.Optional(Type.Ref('TemplateArtifact')),
		artifactHash: Type.Optional(Type.String()), appliedFills: Type.Array(Type.Ref('ArtifactFillLedgerEntry')),
		diagnostics: Type.Array(Type.Ref('ArtifactSetDiagnostic'))
	}, { additionalProperties: false }),
	ArtifactSetStrictCompleteResult: Type.Object({
		kind: Type.Literal('artifactSetCompilation'), mode: Type.Literal('strict'),
		ok: Type.Literal(true), complete: Type.Literal(true), plan: Type.Ref('ArtifactSetPlan'),
		units: Type.Array(Type.Ref('ArtifactSetUnitCompilation')),
		validation: Type.Literal('static'),
		changes: Type.Array(Type.Ref('ArtifactSetChange')), changeSetHash: Type.String(),
		contractDigest: Type.String({ pattern: '^c4_[a-f0-9]{64}$' }),
		manifestDigest: Type.String({ pattern: '^m1_[a-f0-9]{64}$' }),
		workspaceSnapshotHash: Type.String({ pattern: '^ws1_[a-f0-9]{64}$' }),
		staticPolicyVersion: Type.Integer({ minimum: 1 }),
		diagnostics: Type.Array(Type.Ref('ArtifactSetDiagnostic'))
	}, { additionalProperties: false }),
	ArtifactSetPartialCompleteResult: Type.Object({
		kind: Type.Literal('artifactSetCompilation'), mode: Type.Literal('partial'),
		ok: Type.Literal(true), complete: Type.Literal(true), plan: Type.Ref('ArtifactSetPlan'),
		units: Type.Array(Type.Ref('ArtifactSetUnitCompilation')),
		validation: Type.Literal('static'),
		changes: Type.Array(Type.Ref('ArtifactSetChange')), changeSetHash: Type.String(),
		contractDigest: Type.String({ pattern: '^c4_[a-f0-9]{64}$' }),
		manifestDigest: Type.String({ pattern: '^m1_[a-f0-9]{64}$' }),
		workspaceSnapshotHash: Type.String({ pattern: '^ws1_[a-f0-9]{64}$' }),
		staticPolicyVersion: Type.Integer({ minimum: 1 }),
		diagnostics: Type.Array(Type.Ref('ArtifactSetDiagnostic'))
	}, { additionalProperties: false }),
	ArtifactSetPartialIncompleteResult: Type.Object({
		kind: Type.Literal('artifactSetCompilation'), mode: Type.Literal('partial'),
		ok: Type.Literal(true), complete: Type.Literal(false), plan: Type.Ref('ArtifactSetPlan'),
		units: Type.Array(Type.Ref('ArtifactSetUnitCompilation')), changes: Type.Tuple([]),
		contractDigest: Type.String({ pattern: '^c4_[a-f0-9]{64}$' }),
		manifestDigest: Type.String({ pattern: '^m1_[a-f0-9]{64}$' }),
		workspaceSnapshotHash: Type.String({ pattern: '^ws1_[a-f0-9]{64}$' }),
		diagnostics: Type.Array(Type.Ref('ArtifactSetDiagnostic'))
	}, { additionalProperties: false }),
	ArtifactSetStrictFailureResult: Type.Object({
		kind: Type.Literal('artifactSetCompilation'), mode: Type.Literal('strict'),
		ok: Type.Literal(false), complete: Type.Literal(false), classification: Type.Ref('SynthesisFailureClassification'),
		plan: Type.Ref('ArtifactSetPlan'), units: Type.Array(Type.Ref('ArtifactSetUnitCompilation')),
		changes: Type.Tuple([]), diagnostics: Type.Array(Type.Ref('ArtifactSetDiagnostic')),
		contractDigest: Type.Optional(Type.String()), manifestDigest: Type.Optional(Type.String()),
		workspaceSnapshotHash: Type.Optional(Type.String())
	}, { additionalProperties: false }),
	ArtifactSetPartialFailureResult: Type.Object({
		kind: Type.Literal('artifactSetCompilation'), mode: Type.Literal('partial'),
		ok: Type.Literal(false), complete: Type.Literal(false), classification: Type.Ref('SynthesisFailureClassification'),
		plan: Type.Ref('ArtifactSetPlan'), units: Type.Array(Type.Ref('ArtifactSetUnitCompilation')),
		changes: Type.Tuple([]), diagnostics: Type.Array(Type.Ref('ArtifactSetDiagnostic')),
		contractDigest: Type.Optional(Type.String()), manifestDigest: Type.Optional(Type.String()),
		workspaceSnapshotHash: Type.Optional(Type.String())
	}, { additionalProperties: false }),
	ArtifactSetCompilationResult: Type.Union([
		Type.Ref('ArtifactSetStrictCompleteResult'), Type.Ref('ArtifactSetPartialCompleteResult'),
		Type.Ref('ArtifactSetPartialIncompleteResult'), Type.Ref('ArtifactSetStrictFailureResult'),
		Type.Ref('ArtifactSetPartialFailureResult')
	]),
	GraphPatchAction: Type.Union([
		Type.Object({ kind: Type.Literal('addNode'), node: Type.Ref('SynthesisNode') }, { additionalProperties: false }),
		Type.Object({ kind: Type.Literal('removeNode'), nodeId: Type.String() }, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('setInput'), nodeId: Type.String(), inputName: Type.String(),
			input: Type.Ref('SynthesisInput')
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('removeInput'), nodeId: Type.String(), inputName: Type.String()
		}, { additionalProperties: false }),
		Type.Object({ kind: Type.Literal('setFinalNode'), nodeId: Type.String() }, { additionalProperties: false }),
		Type.Object({ kind: Type.Literal('setGoal'), goal: Type.Ref('SynthesisGoal') }, { additionalProperties: false }),
		Type.Object({ kind: Type.Literal('removeGoal') }, { additionalProperties: false })
	]),
	GraphRunnerAction: Type.Union([
		Type.Ref('GraphPatchAction'),
		Type.Object({ kind: Type.Literal('replaceGraph'), graph: Type.Ref('SynthesisGraph') }, { additionalProperties: false }),
		Type.Object({ kind: Type.Literal('fill'), inputs: Type.Ref('TemplateArtifactInputMap') }, { additionalProperties: false })
	]),
	GraphPatchResult: Type.Union([
		Type.Object({
			kind: Type.Literal('graphPatch'), ok: Type.Literal(true), graph: Type.Ref('SynthesisGraph'),
			diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic'))
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('graphPatch'), ok: Type.Literal(false), graph: Type.Ref('SynthesisGraph'),
			classification: Type.Literal('graphRepairable'), diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic'))
		}, { additionalProperties: false })
	]),
	GraphRunnerState: Type.Union([
		Type.Object({
			kind: Type.Literal('ready'), graph: Type.Ref('SynthesisGraph')
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('needsGraphRepair'), graph: Type.Ref('SynthesisGraph'),
			result: Type.Ref('GraphRepairablePartialCompilationFailure'),
			diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic')),
			classification: Type.Literal('graphRepairable')
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('needsArtifactInputs'), graph: Type.Ref('SynthesisGraph'),
			artifact: Type.Ref('PartialTemplateArtifact'),
			diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic')),
			classification: Type.Literal('artifactFillable')
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('complete'), graph: Type.Ref('SynthesisGraph'),
			artifact: Type.Ref('CompleteTemplateArtifact'), diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic'))
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('failed'), graph: Type.Ref('SynthesisGraph'),
			diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic')),
			classification: Type.Union([Type.Literal('templatePolicyFailure'), Type.Literal('terminalFailure')])
		}, { additionalProperties: false })
	])
})

export const RegionKindSchema = GraphContractModule.Import('GraphRegionKind')
export const TypeDescriptorSchema = GraphContractModule.Import('GraphTypeDescriptor')
export const SynthesisInputSchema = GraphContractModule.Import('SynthesisInput')
export const SynthesisGraphSchema = Type.Unsafe<SynthesisGraph>(GraphContractModule.Import('SynthesisGraph'))

export const RawCodePolicySchema = SummaryContractModule.Import('SummaryRawCodePolicy')
export const LiteralInputPortSummarySchema = SummaryContractModule.Import('LiteralInputPortSummary')
export const FragmentInputPortSummarySchema = SummaryContractModule.Import('FragmentInputPortSummary')
export const FragmentCollectionInputPortSummarySchema = SummaryContractModule.Import('FragmentCollectionInputPortSummary')
export const RawCodeInputPortSummarySchema = SummaryContractModule.Import('RawCodeInputPortSummary')
export const UnionInputPortSummarySchema = SummaryContractModule.Import('UnionInputPortSummary')
export const InputPortSummarySchema = SummaryContractModule.Import('InputPortSummary')
export const OutputPortSummarySchema = SummaryContractModule.Import('OutputPortSummary')
export const TemplateSummarySchema = SummaryContractModule.Import('TemplateSummary')

export const SynthesisDiagnosticSchema = CompilationContractModule.Import('SynthesisDiagnostic')
export const GeneratedSourceSpanSchema = CompilationContractModule.Import('GeneratedSourceSpan')
export const GeneratedSourceMapSchema = CompilationContractModule.Import('GeneratedSourceMap')
export const InputPortSchema = CompilationContractModule.Import('InputPort')
export const OutputPortSchema = CompilationContractModule.Import('OutputPort')
export const GraphTemplateManifestSchema = Type.Unsafe<GraphTemplateManifest>(CompilationContractModule.Import('GraphTemplateManifest'))
export const GeneratedFragmentSchema = CompilationContractModule.Import('GeneratedFragment')
export const CompleteTemplateArtifactSchema = CompilationContractModule.Import('CompleteTemplateArtifact')
export const PartialTemplateArtifactSchema = CompilationContractModule.Import('PartialTemplateArtifact')
export const TemplateArtifactSchema = CompilationContractModule.Import('TemplateArtifact')
export const TemplateArtifactInputSchema = CompilationContractModule.Import('TemplateArtifactInput')
export const TemplateArtifactInputMapSchema = CompilationContractModule.Import('TemplateArtifactInputMap')
export const TemplateArtifactResultSchema = CompilationContractModule.Import('TemplateArtifactResult')
export const SynthesisFailureClassificationSchema = CompilationContractModule.Import('SynthesisFailureClassification')
export const StrictGraphCompilationResultSchema = CompilationContractModule.Import('StrictGraphCompilationResult')
export const PartialGraphCompilationResultSchema = CompilationContractModule.Import('PartialGraphCompilationResult')
export const GraphCompilationResultSchema = CompilationContractModule.Import('GraphCompilationResult')
export const ArtifactTargetSchema = CompilationContractModule.Import('ArtifactTarget')
export const ArtifactSetUnitSchema = CompilationContractModule.Import('ArtifactSetUnit')
export const ArtifactSetPlanSchema = Type.Unsafe<ArtifactSetPlan>(CompilationContractModule.Import('ArtifactSetPlan'))
export const ArtifactFillLedgerEntrySchema = Type.Unsafe<ArtifactFillLedgerEntry>(CompilationContractModule.Import('ArtifactFillLedgerEntry'))
export const ArtifactSetDiagnosticSchema = CompilationContractModule.Import('ArtifactSetDiagnostic')
export const ArtifactSetTextEditSchema = CompilationContractModule.Import('ArtifactSetTextEdit')
export const ArtifactSetChangeSchema = CompilationContractModule.Import('ArtifactSetChange')
export const ValidatedArtifactChangeSetSchema = Type.Unsafe<ValidatedArtifactChangeSet>(CompilationContractModule.Import('ValidatedArtifactChangeSet'))
export const ArtifactSetStaticValidationResultSchema = Type.Unsafe<ArtifactSetStaticValidationResult>(CompilationContractModule.Import('ArtifactSetStaticValidationResult'))
export const ArtifactSetCompilationResultSchema = Type.Unsafe<ArtifactSetCompilationResult>(CompilationContractModule.Import('ArtifactSetCompilationResult'))
// Pin recursive protocol schemas to their public core types. Inferring Static
// through SynthesisInput -> inline node -> SynthesisInput otherwise makes the
// compiler truncate later union members after sufficiently deep expansion.
export const GraphPatchActionSchema = Type.Unsafe<GraphPatchAction>(CompilationContractModule.Import('GraphPatchAction'))
export const GraphRunnerActionSchema = Type.Unsafe<GraphRunnerAction>(CompilationContractModule.Import('GraphRunnerAction'))
export const GraphPatchResultSchema = Type.Unsafe<GraphPatchResult>(CompilationContractModule.Import('GraphPatchResult'))
export const GraphRunnerStateSchema = Type.Unsafe<GraphRunnerState>(CompilationContractModule.Import('GraphRunnerState'))

export type ContractGeneratedFragment = Static<typeof GeneratedFragmentSchema>
export type ContractGraphTemplateManifest = Static<typeof GraphTemplateManifestSchema>
export type ContractGeneratedSourceSpan = Static<typeof GeneratedSourceSpanSchema>
export type ContractGeneratedSourceMap = Static<typeof GeneratedSourceMapSchema>
export type ContractCompleteTemplateArtifact = Static<typeof CompleteTemplateArtifactSchema>
export type ContractPartialTemplateArtifact = Static<typeof PartialTemplateArtifactSchema>
export type ContractSynthesisGraph = Static<typeof SynthesisGraphSchema>
export type ContractTemplateSummary = Static<typeof TemplateSummarySchema>
export type ContractGraphCompilationResult = Static<typeof GraphCompilationResultSchema>
export type ContractArtifactSetPlan = Static<typeof ArtifactSetPlanSchema>
export type ContractArtifactSetCompilationResult = Static<typeof ArtifactSetCompilationResultSchema>
export type ContractArtifactSetStaticValidationResult = Static<typeof ArtifactSetStaticValidationResultSchema>
export type ContractSynthesisFailureClassification = Static<typeof SynthesisFailureClassificationSchema>
export type ContractGraphPatchAction = Static<typeof GraphPatchActionSchema>
export type ContractGraphRunnerAction = Static<typeof GraphRunnerActionSchema>
export type ContractGraphPatchResult = Static<typeof GraphPatchResultSchema>
export type ContractGraphRunnerState = Static<typeof GraphRunnerStateSchema>

export const checkContract = <TSchemaType extends TSchema>(schema: TSchemaType, value: unknown): value is Static<TSchemaType> =>
	Value.Check(schema, value)
```

## Registry and planner-schema API declarations

Copied from `dist/templates/registry.d.ts`.

```ts
import type { GraphTemplateDefinition, TemplateCatalogView, TemplateRegistry } from "./graphTypes.js";
import type { StrictTemplateCatalog } from "./graphStrictTypes.js";
/**
 * Build the structural JSON Schema for a graph node that invokes one template.
 *
 * This intentionally does not include `$schema` or `$defs`, so it can be reused
 * inside whole-graph schemas. Use `graphTemplateDefinitionToJsonSchema` when a
 * standalone schema document is needed.
 */
export declare function graphTemplateDefinitionToNodeSchema(template: GraphTemplateDefinition<any, string>): Record<string, unknown>;
/**
 * Build a standalone structural JSON Schema for a graph node that invokes one
 * template.
 */
export declare function graphTemplateDefinitionToJsonSchema(template: GraphTemplateDefinition<any, string>): Record<string, unknown>;
/**
 * Build a structural JSON Schema for a full SynthesisGraph whose nodes may
 * invoke any template currently registered in `registry`.
 *
 * This is a planner-facing shape/schema gate. It validates graph document shape,
 * template IDs, required/unknown inputs, literal input schemas, raw-code surface
 * policy, and recursive inline nodes. It intentionally does not replace
 * `compileGraph`: reference existence, duplicate node IDs, cycle detection,
 * fragment type/source compatibility, and final-goal compatibility remain
 * compiler/semantic checks.
 */
export declare function templateRegistryToSynthesisGraphJsonSchema(registry: TemplateCatalogView): Record<string, unknown>;
/**
 * Build a catalog-specific schema for repairable partial graphs.
 *
 * Supplied inputs remain catalog-checked, while required template inputs may
 * be omitted and reference/final IDs may remain dangling for graph repair.
 */
export declare function templateRegistryToPartialSynthesisGraphJsonSchema(registry: TemplateCatalogView): Record<string, unknown>;
/** Alias with the shorter name used by callers that already work in registry scope. */
export declare const registryToGraphJsonSchema: typeof templateRegistryToSynthesisGraphJsonSchema;
export declare const registryToPartialGraphJsonSchema: typeof templateRegistryToPartialSynthesisGraphJsonSchema;
export declare function defineTemplateCatalog<const T extends readonly GraphTemplateDefinition<any, string, any>[]>(templates: StrictTemplateCatalog<T>): T;
/** Compile and validate JSON-safe manifests into one captured template registry. */
export declare function createTemplateRegistryFromManifests(manifests: readonly import('./graphTypes.js').GraphTemplateManifest[]): TemplateRegistry;
export declare function createTemplateRegistry(): TemplateRegistry;
export declare function createTemplateRegistry<const T extends readonly GraphTemplateDefinition<any, string, any>[]>(initialTemplates: StrictTemplateCatalog<T>): TemplateRegistry;
```

## Catalog digest declarations

Copied from `dist/templates/catalogDigest.d.ts`.

```ts
import type { GraphTemplateDefinition, TemplateSummary } from './graphTypes.js';
/** Version of one executable template-manifest digest. */
export declare const TEMPLATE_MANIFEST_DIGEST_VERSION: 1;
/** Version of the aggregate executable catalog-manifest digest. */
export declare const TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION: 1;
type TemplateManifestDigestInput = Pick<GraphTemplateDefinition<any, string, any>, 'source' | 'summary'>;
/** Normalize planner-facing summaries before hashing or snapshotting them. */
export declare function normalizeTemplateSummaries(summaries: readonly TemplateSummary[]): Record<string, unknown>[];
/** Compute a digest from already captured, validated template summaries. */
export declare function templateSummaryContractDigest(summaries: readonly TemplateSummary[]): string;
/** Compute the identity of one exact executable template manifest. */
export declare function templateManifestDigest(template: TemplateManifestDigestInput): string;
/** Compute an order-independent identity for all executable manifests in a catalog. */
export declare function templateCatalogManifestDigest(templates: readonly GraphTemplateDefinition<any, string, any>[]): string;
/** Compute a stable planner-contract digest for a valid template catalog. */
export declare function templateCatalogDigest(templates: readonly GraphTemplateDefinition<any, string, any>[]): string;
/** Clone JSON-shaped planner metadata with canonical object-key ordering. */
export declare function cloneTemplateSummaries(summaries: readonly TemplateSummary[]): TemplateSummary[];
export {};
```

## Graph compilation and fill API declarations

Copied from `dist/templates/graph.d.ts`.

```ts
import type { AuthoredGraphInput, DefinedPartialSynthesisGraph, DefinedSynthesisGraph, GraphCompilationResult, GraphCompileOptions, GraphPartialCompilationResult, GraphTemplateDefinition, GraphNormalizationResult, StrictSynthesisGraph, StrictPartialSynthesisGraph, StrictTemplateCatalog, SynthesisDiagnostic, SynthesisGraph, SynthesisInput, TemplateArtifact, TemplateArtifactInputMap, TemplateArtifactResult, TemplateCatalogView, TemplateRegistrySnapshot } from './graphTypes.js';
/** Options for validating externally supplied artifact data against a catalog. */
export interface TemplateArtifactCatalogValidationOptions extends GraphCompileOptions {
    /** Disable only when the artifact was produced inside the current trusted compilation. */
    screenSecurity?: boolean;
}
/**
 * Validate persisted or caller-supplied artifact data against one captured catalog.
 *
 * This is stronger than structural integrity: template identities, output and
 * unresolved-port contracts, syntax, and source security are checked together.
 */
export declare function validateTemplateArtifactAgainstCatalog(artifact: TemplateArtifact, catalog: TemplateCatalogView, options?: TemplateArtifactCatalogValidationOptions): SynthesisDiagnostic[];
/** Normalize shorthand references into the explicit graph input form. */
export declare function normalizeSynthesisInput(input: SynthesisInput): Exclude<SynthesisInput, {
    $ref: string;
}>;
/** Type-check a graph against a template catalog without compiling it yet. */
export declare function defineGraph<const TTemplates extends readonly GraphTemplateDefinition<any, string>[], const TGraph extends AuthoredGraphInput>(templates: TTemplates & StrictTemplateCatalog<TTemplates>, graph: StrictSynthesisGraph<TTemplates, TGraph>): DefinedSynthesisGraph<TTemplates>;
/** Type-check an intentionally incomplete graph against a template catalog. */
export declare function definePartialGraph<const TTemplates extends readonly GraphTemplateDefinition<any, string>[], const TGraph extends AuthoredGraphInput>(templates: TTemplates & StrictTemplateCatalog<TTemplates>, graph: StrictPartialSynthesisGraph<TTemplates, TGraph>): DefinedPartialSynthesisGraph<TTemplates>;
/** Callable graph compiler with strict and partial compilation entrypoints. */
export type GraphCompiler<TTemplates extends readonly GraphTemplateDefinition<any, string>[]> = {
    /** Stable planner-contract digest captured when this compiler was built. */
    readonly contractDigest: string;
    /** Stable executable-manifest digest captured when this compiler was built. */
    readonly manifestDigest: string;
    /** Immutable catalog captured by this compiler for trusted artifact validation. */
    readonly catalog: TemplateRegistrySnapshot;
    /** Compile a previously defined graph with strict required-input behavior. */
    (graph: DefinedSynthesisGraph<TTemplates>): GraphCompilationResult;
    /** Compile an inline typed graph with strict required-input behavior. */
    <const TGraph extends AuthoredGraphInput>(graph: StrictSynthesisGraph<TTemplates, TGraph>): GraphCompilationResult;
    /** Compile while preserving unresolved required inputs. */
    (graph: DefinedPartialSynthesisGraph<TTemplates>, options: GraphCompileOptions & {
        mode: 'partial';
    }): GraphPartialCompilationResult;
    /** Compile an inline catalog-aware partial graph. */
    <const TGraph extends AuthoredGraphInput>(graph: StrictPartialSynthesisGraph<TTemplates, TGraph>, options: GraphCompileOptions & {
        mode: 'partial';
    }): GraphPartialCompilationResult;
    /** Compile a dynamic graph while preserving unresolved required inputs. */
    (graph: SynthesisGraph, options: GraphCompileOptions & {
        mode: 'partial';
    }): GraphPartialCompilationResult;
    /** Type-check a graph against this compiler's template catalog. */
    defineGraph<const TGraph extends AuthoredGraphInput>(graph: StrictSynthesisGraph<TTemplates, TGraph>): DefinedSynthesisGraph<TTemplates>;
    /** Type-check an intentionally incomplete graph against this compiler's catalog. */
    definePartialGraph<const TGraph extends AuthoredGraphInput>(graph: StrictPartialSynthesisGraph<TTemplates, TGraph>): DefinedPartialSynthesisGraph<TTemplates>;
};
/** Build a typed compiler from an authored template catalog. */
export declare function buildGraphCompiler<const TTemplates extends readonly GraphTemplateDefinition<any, string>[]>(templates: TTemplates & StrictTemplateCatalog<TTemplates>, options?: GraphCompileOptions): GraphCompiler<TTemplates>;
/** Build a runtime compiler from an already validated catalog view. */
export declare function buildGraphCompiler(templates: TemplateCatalogView, options?: GraphCompileOptions): GraphCompiler<readonly GraphTemplateDefinition<any, string>[]>;
/** Expand inline nodes and shorthand references before validation/execution. */
export declare function normalizeSynthesisGraph(graph: SynthesisGraph): GraphNormalizationResult;
/**
 * Transactionally fill matching unresolved inputs in a template artifact.
 *
 * Inputs may be keyed by the opaque marker ID exposed in `unresolvedInputs`, or
 * by the original input name when that name appears only once in the artifact.
 * Unknown, ambiguous, conflicting, and already-consumed keys are rejected.
 */
export declare function fillTemplateArtifact(artifact: TemplateArtifact, inputs: TemplateArtifactInputMap, options?: GraphCompileOptions): TemplateArtifactResult;
/** Catalog-aware fill options for persisted or externally supplied artifacts. */
export interface CatalogArtifactFillOptions extends GraphCompileOptions {
    /** Set only when the base artifact was produced inside the current trusted compilation session. */
    trustedBaseArtifact?: boolean;
}
/**
 * Fill an artifact while binding all artifact provenance and persisted ports to
 * one captured catalog. Caller-supplied nested fragments are always security
 * screened, even when the base artifact is trusted.
 */
export declare function fillTemplateArtifactWithCatalog(artifact: TemplateArtifact, inputs: TemplateArtifactInputMap, catalog: TemplateCatalogView, options?: CatalogArtifactFillOptions): TemplateArtifactResult;
/**
 * Fill a template artifact and require that no unresolved inputs remain.
 *
 * This is the terminal artifact API: it returns a structured diagnostic instead
 * of throwing when required inputs are still open.
 */
export declare function finalizeTemplateArtifact(artifact: TemplateArtifact, inputs?: TemplateArtifactInputMap, options?: GraphCompileOptions): TemplateArtifactResult;
/** Catalog-bound terminal artifact fill/finalization. */
export declare function finalizeTemplateArtifactWithCatalog(artifact: TemplateArtifact, inputs: TemplateArtifactInputMap, catalog: TemplateCatalogView, options?: CatalogArtifactFillOptions): TemplateArtifactResult;
/** Strictly compile a defined graph against an authored template catalog. */
export declare function compileGraph<const TTemplates extends readonly GraphTemplateDefinition<any, string>[]>(graph: DefinedSynthesisGraph<any>, templates: TTemplates & StrictTemplateCatalog<TTemplates>, options?: GraphCompileOptions): GraphCompilationResult;
/** Strictly compile a graph against a runtime template registry. */
export declare function compileGraph(graph: SynthesisGraph, registry: TemplateCatalogView, options?: GraphCompileOptions): GraphCompilationResult;
/** Compile a graph while preserving unresolved required inputs. */
export declare function compileGraph(graph: SynthesisGraph, registry: TemplateCatalogView, options: GraphCompileOptions & {
    mode: 'partial';
}): GraphPartialCompilationResult;
/** Compile a graph against an authored catalog while preserving unresolved required inputs. */
export declare function compileGraph<const TTemplates extends readonly GraphTemplateDefinition<any, string>[]>(graph: DefinedSynthesisGraph<any> | DefinedPartialSynthesisGraph<any>, templates: TTemplates & StrictTemplateCatalog<TTemplates>, options: GraphCompileOptions & {
    mode: 'partial';
}): GraphPartialCompilationResult;
/** Partially compile an inline catalog-aware incomplete graph. */
export declare function compileGraph<const TTemplates extends readonly GraphTemplateDefinition<any, string>[], const TGraph extends AuthoredGraphInput>(graph: StrictPartialSynthesisGraph<TTemplates, TGraph>, templates: TTemplates & StrictTemplateCatalog<TTemplates>, options: GraphCompileOptions & {
    mode: 'partial';
}): GraphPartialCompilationResult;
/** Strictly compile an inline typed graph against an authored template catalog. */
export declare function compileGraph<const TTemplates extends readonly GraphTemplateDefinition<any, string>[], const TGraph extends AuthoredGraphInput>(graph: StrictSynthesisGraph<TTemplates, TGraph>, templates: TTemplates & StrictTemplateCatalog<TTemplates>, options?: GraphCompileOptions): GraphCompilationResult;
```

## Graph patch API declarations

Copied from `dist/templates/graphPatch.d.ts`.

```ts
import { type GraphPatchAction, type GraphPatchResult, type SynthesisGraph } from './graphCoreTypes.js';
/**
 * Apply one immutable graph mutation transactionally.
 *
 * Failed patches return the exact input graph object. Successful patches
 * preserve authored inline structure and never normalize or cascade refs.
 */
export declare function applyGraphPatch(graph: SynthesisGraph, action: GraphPatchAction): GraphPatchResult;
```

## Artifact integrity API declarations

Copied from `dist/templates/artifactIntegrity.d.ts`.

```ts
import type { SynthesisDiagnostic } from './graphTypes.js';
/**
 * Validate the structural and marker invariants of a persisted template artifact.
 *
 * Correspondence is defined at the logical marker-ID level. A partial artifact
 * has exactly one unresolved-input descriptor for each unique marker ID, while
 * the same ID may occur in multiple physical regions when a child fragment is
 * composed more than once. A single later fill intentionally replaces all of
 * those occurrences.
 */
export declare function validateTemplateArtifactIntegrity(value: unknown): SynthesisDiagnostic[];
```

## Artifact-set types and API declarations

Copied from `dist/templates/artifactSet.d.ts`.

```ts
import type { CompleteTemplateArtifact, GraphCompileOptions, GraphPartialCompilationResult, GraphTemplateDefinition, RegionKind, SynthesisDiagnostic, SynthesisFailureClassification, SynthesisGraph, TemplateArtifact, TemplateArtifactInputMap, TemplateCatalogView } from './graphTypes.js';
/** Version of the mandatory checks represented by a validated change set. */
export declare const ARTIFACT_SET_STATIC_POLICY_VERSION = 1;
/** A workspace-relative destination for one generated graph artifact. */
export type ArtifactTarget = {
    kind: 'createFile';
    path: string;
} | {
    kind: 'replaceRange';
    path: string;
    /** Inclusive UTF-16 offset in the captured base file. */
    start: number;
    /** Exclusive UTF-16 offset in the captured base file. */
    end: number;
    /** Hash returned by `createArtifactSetFileHash()` for the captured base file. */
    baseFileHash: string;
    /** Exact syntax context expected at the replacement site. */
    regionKind: RegionKind;
};
/** One independently compiled graph and the workspace location that consumes it. */
export interface ArtifactSetUnit {
    id: string;
    graph: SynthesisGraph;
    target: ArtifactTarget;
}
/** Ordered collection of graph artifacts compiled as one candidate change set. */
export interface ArtifactSetPlan {
    artifacts: ArtifactSetUnit[];
}
/**
 * A replayable fill applied to a partial artifact.
 *
 * Hashes bind the fill to one graph and one exact base/result artifact pair.
 */
export interface ArtifactFillLedgerEntry {
    artifactId: string;
    graphHash: string;
    baseArtifactHash: string;
    inputs: TemplateArtifactInputMap;
    resultingArtifactHash: string;
}
/** Additional caller-owned state used to validate and assemble artifact targets. */
export interface ArtifactSetCompileOptions extends GraphCompileOptions {
    mode?: 'strict' | 'partial';
    /** Captured workspace files keyed by workspace-relative path. */
    workspaceFiles?: Readonly<Record<string, string>>;
    /** Sorted manifest paths whose exact bytes are not UTF-8 text. */
    unavailableTextPaths?: readonly string[];
    /** Filesystem root used only as TypeScript source-file identity. */
    workspaceRoot?: string;
    /** Identity of the immutable workspace snapshot supplied by the caller. */
    workspaceSnapshotId?: string;
    /** Canonical runtime capture manifest used to verify snapshot identity. */
    workspaceManifest?: ArtifactSetWorkspaceManifest;
    /** Ordered, hash-chained fills to replay after partial graph compilation. */
    fillLedger?: readonly ArtifactFillLedgerEntry[];
}
export interface ArtifactSetWorkspaceManifest {
    schemaVersion: 1;
    revision: string;
    tsConfigFilePath: string;
    files: readonly {
        path: string;
        byteLength: number;
        contentHash: string;
        blobHash: string;
    }[];
    symlinks: readonly {
        path: string;
        target: string;
    }[];
}
/** Artifact-set diagnostic with optional attribution to one authored unit. */
export interface ArtifactSetDiagnostic extends SynthesisDiagnostic {
    artifactId?: string;
}
/** One replacement represented in both base-file and assembled-file coordinates. */
export interface ArtifactSetTextEdit {
    artifactId: string;
    start: number;
    end: number;
    resultStart: number;
    resultEnd: number;
    replacement: string;
    artifactHash: string;
}
/** One complete file produced by assembling one or more artifact targets. */
export type ArtifactSetChange = {
    kind: 'createFile';
    path: string;
    resultingFileHash: string;
    sourceText: string;
    /** Edits remain in authored artifact order. */
    edits: ArtifactSetTextEdit[];
} | {
    kind: 'modifyFile';
    path: string;
    baseFileHash: string;
    resultingFileHash: string;
    sourceText: string;
    /** Edits remain in authored artifact order. */
    edits: ArtifactSetTextEdit[];
};
/** Identities captured by the static acceptance gate. */
export interface ArtifactSetAcceptanceIdentity {
    contractDigest: string;
    manifestDigest: string;
    workspaceSnapshotHash: string;
    staticPolicyVersion: number;
    constraintAcceptance?: ConstraintBoundStaticAcceptance;
}
export interface ConstraintBoundStaticAcceptance {
    schemaVersion: 1;
    constraintEntryPath: string;
    constraintDigest: string;
    constraintSourceSnapshotHash: string;
    constraintEngineVersion: 3;
    analysisSnapshotHash: string;
    phaseResultBlobHashes: {
        plan: string;
        artifact: string;
        assembled: string;
        semantic: string;
    };
}
/** A complete, statically accepted set of in-memory workspace changes. */
export interface ValidatedArtifactChangeSet {
    validation: 'static';
    changes: ArtifactSetChange[];
    changeSetHash: string;
    contractDigest: string;
    manifestDigest: string;
    workspaceSnapshotHash: string;
    staticPolicyVersion: number;
    constraintAcceptance?: ConstraintBoundStaticAcceptance;
}
/** Compilation and optional fill result for one artifact-set unit. */
export interface ArtifactSetUnitCompilation {
    artifactId: string;
    graphHash: string;
    target: ArtifactTarget;
    compilation: GraphPartialCompilationResult;
    artifact?: TemplateArtifact;
    artifactHash?: string;
    appliedFills: ArtifactFillLedgerEntry[];
    diagnostics: ArtifactSetDiagnostic[];
}
interface ArtifactSetCompilationResultBase {
    kind: 'artifactSetCompilation';
    mode: 'strict' | 'partial';
    plan: ArtifactSetPlan;
    units: ArtifactSetUnitCompilation[];
    diagnostics: ArtifactSetDiagnostic[];
    /** Present whenever catalog capture succeeded. */
    contractDigest?: string;
    /** Present whenever catalog capture succeeded. */
    manifestDigest?: string;
    /** Present whenever caller-owned workspace data could be normalized. */
    workspaceSnapshotHash?: string;
}
/** A complete, assembled artifact set. */
export type ArtifactSetCompleteCompilationResult = ArtifactSetCompilationResultBase & ValidatedArtifactChangeSet & {
    ok: true;
    complete: true;
};
/** A valid partial result whose unresolved inputs have not all been filled. */
export interface ArtifactSetIncompleteCompilationResult extends ArtifactSetCompilationResultBase {
    mode: 'partial';
    ok: true;
    complete: false;
    changes: [];
}
/** A failed plan, graph compilation, ledger replay, target assembly, or static check. */
export interface ArtifactSetFailedCompilationResult extends ArtifactSetCompilationResultBase {
    ok: false;
    complete: false;
    classification: SynthesisFailureClassification;
    changes: [];
}
export type ArtifactSetStrictCompilationResult = (ArtifactSetCompleteCompilationResult & {
    mode: 'strict';
}) | (ArtifactSetFailedCompilationResult & {
    mode: 'strict';
});
export type ArtifactSetPartialCompilationResult = (ArtifactSetCompleteCompilationResult & {
    mode: 'partial';
}) | ArtifactSetIncompleteCompilationResult | (ArtifactSetFailedCompilationResult & {
    mode: 'partial';
});
export type ArtifactSetCompilationResult = ArtifactSetStrictCompilationResult | ArtifactSetPartialCompilationResult;
interface ArtifactSetGraphCompilationResultBase {
    kind: 'artifactSetGraphCompilation';
    mode: 'strict' | 'partial';
    plan: ArtifactSetPlan;
    units: ArtifactSetUnitCompilation[];
    diagnostics: ArtifactSetDiagnostic[];
    contractDigest?: string;
    manifestDigest?: string;
    workspaceSnapshotHash?: string;
}
export type ArtifactSetGraphCompilationResult = (ArtifactSetGraphCompilationResultBase & {
    ok: true;
    complete: true;
}) | (ArtifactSetGraphCompilationResultBase & {
    ok: true;
    complete: false;
    mode: 'partial';
}) | (ArtifactSetGraphCompilationResultBase & {
    ok: false;
    complete: false;
    classification: SynthesisFailureClassification;
});
/** Complete artifact input accepted by the pure target assembler. */
export interface ArtifactSetAssemblyUnit {
    id: string;
    target: ArtifactTarget;
    artifact: CompleteTemplateArtifact;
    artifactHash?: string;
}
/** Caller-owned workspace state used by the pure target assembler. */
export interface ArtifactSetAssemblyOptions {
    workspaceFiles?: Readonly<Record<string, string>>;
    unavailableTextPaths?: readonly string[];
    workspaceRoot?: string;
    /** Required for project-backed acceptance; omitted only for standalone new files. */
    workspaceSnapshotId?: string;
    workspaceManifest?: ArtifactSetWorkspaceManifest;
    tsConfigFilePath?: string;
    /** Fixed raw/generated-source security policy used by static acceptance. */
    securityPolicy?: NonNullable<GraphCompileOptions['securityPolicy']>;
}
export type ArtifactSetAssemblyResult = {
    ok: true;
    validation: 'syntax';
    changes: ArtifactSetChange[];
    changeSetHash: string;
    contractDigest: string;
    manifestDigest: string;
    workspaceSnapshotHash: string;
    diagnostics: ArtifactSetDiagnostic[];
} | {
    ok: false;
    classification: 'graphRepairable' | 'terminalFailure';
    changes: [];
    diagnostics: ArtifactSetDiagnostic[];
};
export type ArtifactSetStaticValidationResult = ({
    ok: true;
    diagnostics: ArtifactSetDiagnostic[];
} & ValidatedArtifactChangeSet) | {
    ok: false;
    classification: SynthesisFailureClassification;
    changes: [];
    diagnostics: ArtifactSetDiagnostic[];
};
export type ArtifactSetSemanticValidationResult = {
    ok: true;
    validation: 'semantic';
    changes: ArtifactSetChange[];
    contractDigest: string;
    manifestDigest: string;
    workspaceSnapshotHash: string;
    diagnostics: ArtifactSetDiagnostic[];
} | {
    ok: false;
    classification: SynthesisFailureClassification;
    changes: [];
    diagnostics: ArtifactSetDiagnostic[];
};
/** Normalize a caller-provided path into the artifact protocol's workspace form. */
export declare function normalizeArtifactTargetPath(input: string): string;
/** Hash captured file text for optimistic target validation. */
export declare function createArtifactSetFileHash(sourceText: string): string;
/** Hash graph semantics independently of top-level node array order. */
export declare function createArtifactSetGraphHash(graph: SynthesisGraph): string;
/** Hash a persisted complete or partial artifact, including its unresolved contract. */
export declare function createArtifactSetArtifactHash(artifact: TemplateArtifact): string;
/** Compute the stable identity of an already assembled change set. */
export declare function createArtifactSetChangeSetHash(changes: readonly ArtifactSetChange[], identity?: Omit<ArtifactSetAcceptanceIdentity, 'staticPolicyVersion'> & {
    staticPolicyVersion?: number;
}): string;
/** Hash a normalized immutable workspace snapshot for candidate binding. */
export declare function createArtifactSetWorkspaceSnapshotHash(workspaceFiles: Readonly<Record<string, string>>, workspaceSnapshotId?: string, tsConfigFilePath?: string, workspaceManifest?: ArtifactSetWorkspaceManifest, unavailableTextPaths?: readonly string[]): string;
/**
 * Validate targets and assemble complete artifacts without writing files.
 *
 * Paths and ranges are checked before any candidate source is returned.
 */
export declare function assembleArtifactSetTargets(units: readonly ArtifactSetAssemblyUnit[], catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[], options?: ArtifactSetAssemblyOptions): ArtifactSetAssemblyResult;
/** Strictly compile every graph and return one validated, in-memory change set. */
export declare function compileArtifactSet(plan: ArtifactSetPlan, catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[], options?: Omit<ArtifactSetCompileOptions, 'mode'> & {
    mode?: 'strict';
}): ArtifactSetStrictCompilationResult;
/** Compile every graph while preserving unresolved template inputs. */
export declare function compileArtifactSet(plan: ArtifactSetPlan, catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[], options: Omit<ArtifactSetCompileOptions, 'mode'> & {
    mode: 'partial';
}): ArtifactSetPartialCompilationResult;
export declare function compileArtifactSetGraphs(plan: ArtifactSetPlan, catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[], options?: ArtifactSetCompileOptions): ArtifactSetGraphCompilationResult;
/**
 * Compile one authoritative plan and require the mandatory static acceptance
 * pipeline. Unlike the lower-level assembler, this entry point does not accept
 * caller-constructed artifacts detached from their graphs and fill ledger.
 */
export declare function finalizeArtifactSetStatic(plan: ArtifactSetPlan, catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[], options?: Omit<ArtifactSetCompileOptions, 'mode'>, constraintAcceptance?: ConstraintBoundStaticAcceptance): ArtifactSetStaticValidationResult;
export declare function validateArtifactSetStatic(plan: ArtifactSetPlan, catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[], options?: Omit<ArtifactSetCompileOptions, 'mode'>): ArtifactSetStaticValidationResult;
export declare function validateArtifactSetSemantics(plan: ArtifactSetPlan, catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[], options?: Omit<ArtifactSetCompileOptions, 'mode'>): ArtifactSetSemanticValidationResult;
export {};
```

## Pattern and guard declarations

Copied from `dist/templates/graphPatterns.d.ts`.

```ts
import { P } from 'ts-pattern';
import type { SupportedJsonSchema } from './schemaTypes.js';
import type { GraphRunnerState } from './runner.js';
import type { CompleteTemplateArtifact, FragmentInputPort, FragmentCollectionInputPort, GeneratedFragment, GeneratedSourceMap, GeneratedSourceSpan, GraphCompilationResult, GraphPatchAction, GraphPatchResult, GraphPartialCompilationResult, GraphRunnerAction, GraphTemplateDefinition, InputPort, LiteralInputPort, NormalizedSynthesisInput, OutputPort, PartialTemplateArtifact, RawCodeInputPort, RegionKind, ResolvedGraphInput, SynthesisDiagnostic, SynthesisFailureClassification, SynthesisGoal, SynthesisGraph, SynthesisInput, SynthesisNode, SynthesisRepairHint, TemplateArtifact, TemplateArtifactInput, TemplateArtifactResult, TypeDescriptor, UnionInputPort, UnresolvedTemplateInput } from './graphTypes.js';
/** Runtime `ts-pattern` pattern for supported graph region kinds. */
export declare const regionKindPattern: P.Pattern<RegionKind>;
/** Runtime `ts-pattern` pattern for graph type metadata. */
export declare const supportedJsonSchemaPattern: P.Pattern<SupportedJsonSchema>;
/** Runtime `ts-pattern` pattern for graph type metadata. */
export declare const typeDescriptorPattern: P.Pattern<TypeDescriptor>;
/** Runtime `ts-pattern` pattern for planner-facing repair hints. */
export declare const synthesisRepairHintPattern: P.Pattern<SynthesisRepairHint>;
/** Runtime pattern for contextual failure classifications. */
export declare const synthesisFailureClassificationPattern: P.Pattern<SynthesisFailureClassification>;
/** Runtime `ts-pattern` pattern for graph diagnostic objects. */
export declare const synthesisDiagnosticPattern: P.Pattern<SynthesisDiagnostic>;
type GuardPattern<T> = ReturnType<typeof P.when<unknown, (value: unknown) => value is T>>;
/** Runtime pattern for one persisted generated-source ownership span. */
export declare const generatedSourceSpanPattern: GuardPattern<GeneratedSourceSpan>;
/** Runtime type guard for generated-source ownership spans. */
export declare function isGeneratedSourceSpan(value: unknown): value is GeneratedSourceSpan;
/** Runtime pattern for a versioned persisted generated-source map. */
export declare const generatedSourceMapPattern: GuardPattern<GeneratedSourceMap>;
/** Runtime type guard for persisted generated-source maps. */
export declare function isGeneratedSourceMap(value: unknown): value is GeneratedSourceMap;
type GraphPartialCompilationCompleteSuccess = Extract<GraphPartialCompilationResult, {
    ok: true;
}> & {
    finalArtifact: CompleteTemplateArtifact & {
        complete: true;
    };
};
type TemplateArtifactCompleteSuccess = Extract<TemplateArtifactResult, {
    ok: true;
}> & {
    artifact: CompleteTemplateArtifact;
};
/** Runtime `ts-pattern` pattern for literal input ports. */
export declare const literalInputPortPattern: P.Pattern<LiteralInputPort>;
/** Runtime `ts-pattern` pattern for fragment input ports. */
export declare const fragmentInputPortPattern: P.Pattern<FragmentInputPort>;
export declare const fragmentCollectionInputPortPattern: P.Pattern<FragmentCollectionInputPort>;
/** Runtime `ts-pattern` pattern for raw-code input ports. */
export declare const rawCodeInputPortPattern: P.Pattern<RawCodeInputPort>;
/** Runtime `ts-pattern` pattern for union input ports. */
export declare const unionInputPortPattern: P.Pattern<UnionInputPort>;
/** Runtime `ts-pattern` pattern for any graph input port. */
export declare const inputPortPattern: P.Pattern<InputPort>;
/** Runtime type guard for input ports. */
export declare function isInputPort(value: unknown): value is InputPort;
/** Runtime `ts-pattern` pattern for template output ports. */
export declare const outputPortPattern: P.Pattern<OutputPort>;
/** Runtime `ts-pattern` pattern for graph fragment source metadata. */
export declare const generatedFragmentSourcePattern: P.Pattern<GeneratedFragment['source']>;
/** Runtime `ts-pattern` pattern for fragment provenance metadata. */
export declare const generatedFragmentProvenancePattern: P.Pattern<NonNullable<GeneratedFragment['provenance']>>;
/** Runtime `ts-pattern` pattern for generated graph fragments. */
export declare const generatedFragmentPattern: P.Pattern<GeneratedFragment>;
/** Runtime `ts-pattern` pattern for unresolved partial-artifact inputs. */
export declare const unresolvedTemplateInputPattern: P.Pattern<UnresolvedTemplateInput>;
/** Runtime `ts-pattern` pattern for complete template artifacts. */
export declare const completeTemplateArtifactPattern: GuardPattern<CompleteTemplateArtifact>;
/** Runtime `ts-pattern` pattern for partial template artifacts. */
export declare const partialTemplateArtifactPattern: GuardPattern<PartialTemplateArtifact>;
export declare function isTemplateArtifactInputMap(inputs: unknown): inputs is Record<string, any>;
/** Runtime `ts-pattern` pattern for either complete or partial artifacts. */
export declare const templateArtifactPattern: P.Pattern<TemplateArtifact>;
/** Runtime type guard for complete or partial template artifacts. */
export declare function isTemplateArtifact(value: unknown): value is TemplateArtifact;
/** Runtime `ts-pattern` pattern for literal values used to fill unresolved artifact inputs. */
export declare const literalTemplateArtifactInputPattern: P.Pattern<Extract<TemplateArtifactInput, {
    kind: 'literal';
}>>;
/** Runtime `ts-pattern` pattern for raw code used to fill unresolved artifact inputs. */
export declare const rawCodeTemplateArtifactInputPattern: P.Pattern<Extract<TemplateArtifactInput, {
    kind: 'rawCode';
}>>;
/** Runtime `ts-pattern` pattern for fragments used to fill unresolved artifact inputs. */
export declare const fragmentTemplateArtifactInputPattern: P.Pattern<Extract<TemplateArtifactInput, {
    kind: 'fragment';
}>>;
export declare const fragmentCollectionTemplateArtifactInputPattern: P.Pattern<Extract<TemplateArtifactInput, {
    kind: 'fragmentCollection';
}>>;
/** Runtime `ts-pattern` pattern for values used to fill unresolved artifact inputs. */
export declare const templateArtifactInputPattern: P.Pattern<TemplateArtifactInput>;
/** Runtime `ts-pattern` pattern for resolved literal graph inputs. */
export declare const resolvedLiteralGraphInputPattern: P.Pattern<Extract<ResolvedGraphInput, {
    kind: 'literal';
}>>;
/** Runtime `ts-pattern` pattern for resolved fragment graph inputs. */
export declare const resolvedFragmentGraphInputPattern: P.Pattern<Extract<ResolvedGraphInput, {
    kind: 'fragment';
}>>;
export declare const resolvedFragmentCollectionGraphInputPattern: P.Pattern<Extract<ResolvedGraphInput, {
    kind: 'fragmentCollection';
}>>;
/** Runtime `ts-pattern` pattern for resolved raw-code graph inputs. */
export declare const resolvedRawCodeGraphInputPattern: P.Pattern<Extract<ResolvedGraphInput, {
    kind: 'rawCode';
}>>;
/** Runtime `ts-pattern` pattern for any resolved graph input. */
export declare const resolvedGraphInputPattern: P.Pattern<ResolvedGraphInput>;
/** Runtime `ts-pattern` pattern for final graph constraints. */
export declare const synthesisGoalPattern: P.Pattern<SynthesisGoal>;
/** Runtime `ts-pattern` pattern for authored literal graph inputs. */
export declare const literalSynthesisInputPattern: P.Pattern<Extract<SynthesisInput, {
    kind: "literal";
}>>;
/** Runtime `ts-pattern` pattern for authored graph node references. */
export declare const refSynthesisInputPattern: P.Pattern<Extract<SynthesisInput, {
    kind: 'ref';
}>>;
/** Runtime `ts-pattern` pattern for authored raw-code graph inputs. */
export declare const rawCodeSynthesisInputPattern: P.Pattern<Extract<SynthesisInput, {
    kind: "rawCode";
}>>;
/** Runtime `ts-pattern` pattern for authored inline graph inputs. */
export declare const inlineSynthesisInputPattern: P.Pattern<Extract<SynthesisInput, {
    kind: 'inline';
}>>;
/** Runtime `ts-pattern` pattern for authored shorthand graph references. */
export declare const refShorthandSynthesisInputPattern: P.Pattern<Extract<SynthesisInput, {
    $ref: string;
}>>;
export declare const fragmentCollectionSynthesisInputPattern: P.Pattern<Extract<SynthesisInput, {
    kind: 'fragmentCollection';
}>>;
/** Runtime `ts-pattern` pattern for graph inputs after normalization. */
export declare const normalizedSynthesisInputPattern: P.Pattern<NormalizedSynthesisInput>;
/** Runtime `ts-pattern` pattern for any authored graph input. */
export declare const synthesisInputPattern: P.Pattern<SynthesisInput>;
/** Runtime `ts-pattern` pattern for synthesis graph nodes. */
export declare const synthesisNodePattern: P.Pattern<SynthesisNode>;
/** Runtime type guard for synthesis graph nodes. */
export declare function isSynthesisNode(value: unknown): value is SynthesisNode;
/** Runtime `ts-pattern` pattern for synthesis graphs. */
export declare const synthesisGraphPattern: GuardPattern<SynthesisGraph>;
export type AnyTemplateCatalog = readonly GraphTemplateDefinition<any, string, any>[];
/** Runtime `ts-pattern` pattern for graphs returned by `defineGraph`. */
export declare const definedSynthesisGraphPattern: typeof synthesisGraphPattern;
/** Runtime `ts-pattern` pattern for compile-time checked authored graphs. */
export declare const strictSynthesisGraphPattern: typeof synthesisGraphPattern;
/** Runtime type guard for synthesis graphs. */
export declare function isSynthesisGraph(value: unknown): value is SynthesisGraph;
/** Runtime pattern for one immutable graph patch action. */
export declare const graphPatchActionPattern: GuardPattern<GraphPatchAction>;
/** Runtime type guard for immutable graph patch actions. */
export declare function isGraphPatchAction(value: unknown): value is GraphPatchAction;
/** Runtime pattern for any explicit action accepted by `GraphRunner.advance()`. */
export declare const graphRunnerActionPattern: GuardPattern<GraphRunnerAction>;
/** Runtime type guard for graph runner actions. */
export declare function isGraphRunnerAction(value: unknown): value is GraphRunnerAction;
/** Runtime pattern for transactional graph patch results. */
export declare const graphPatchResultPattern: GuardPattern<GraphPatchResult>;
/** Runtime type guard for transactional graph patch results. */
export declare function isGraphPatchResult(value: unknown): value is GraphPatchResult;
/** Runtime pattern for graph runner transition outputs. */
export declare const graphRunnerStatePattern: GuardPattern<GraphRunnerState>;
/** Runtime type guard for graph runner transition outputs. */
export declare function isGraphRunnerState(value: unknown): value is GraphRunnerState;
/** Runtime `ts-pattern` pattern for fragment records in strict graph results. */
export declare const generatedFragmentRecordPattern: P.Pattern<Record<string, GeneratedFragment>>;
/** Runtime `ts-pattern` pattern for artifact records in partial graph results. */
export declare const templateArtifactRecordPattern: P.Pattern<Record<string, TemplateArtifact>>;
/** Runtime `ts-pattern` pattern for successful strict graph compilation. */
export declare const graphCompilationSuccessPattern: GuardPattern<Extract<GraphCompilationResult, {
    ok: true;
}>>;
/** Runtime `ts-pattern` pattern for failed strict graph compilation. */
export declare const graphCompilationFailurePattern: GuardPattern<Extract<GraphCompilationResult, {
    ok: false;
}>>;
/** Runtime `ts-pattern` pattern for strict graph compilation results. */
export declare const graphCompilationResultPattern: P.Pattern<GraphCompilationResult>;
/** Runtime type guard for strict graph compilation results. */
export declare function isGraphCompilationResult(value: unknown): value is GraphCompilationResult;
/** Runtime `ts-pattern` pattern for successful partial graph compilation. */
export declare const graphPartialCompilationSuccessPattern: GuardPattern<Extract<GraphPartialCompilationResult, {
    ok: true;
}>>;
/** Runtime `ts-pattern` pattern for successful partial graph compilation with an explicitly complete final artifact. */
export declare const graphPartialCompilationCompleteSuccessPattern: GuardPattern<GraphPartialCompilationCompleteSuccess>;
/** Runtime `ts-pattern` pattern for failed partial graph compilation. */
export declare const graphPartialCompilationFailurePattern: GuardPattern<Extract<GraphPartialCompilationResult, {
    ok: false;
}>>;
/** Runtime `ts-pattern` pattern for partial graph compilation results. */
export declare const graphPartialCompilationResultPattern: P.Pattern<GraphPartialCompilationResult>;
/** Runtime type guard for partial graph compilation results. */
export declare function isGraphPartialCompilationResult(value: unknown): value is GraphPartialCompilationResult;
/** Runtime `ts-pattern` pattern for successful artifact fill/finalize results. */
export declare const templateArtifactSuccessPattern: GuardPattern<Extract<TemplateArtifactResult, {
    ok: true;
}>>;
/** Runtime `ts-pattern` pattern for successful artifact results whose artifact is complete. */
export declare const templateArtifactCompleteSuccessPattern: GuardPattern<TemplateArtifactCompleteSuccess>;
/** Runtime `ts-pattern` pattern for failed artifact fill/finalize results. */
export declare const templateArtifactFailurePattern: GuardPattern<Extract<TemplateArtifactResult, {
    ok: false;
}>>;
/** Runtime `ts-pattern` pattern for artifact fill/finalize results. */
export declare const templateArtifactResultPattern: P.Pattern<TemplateArtifactResult>;
/** Runtime type guard for artifact fill/finalize results. */
export declare function isTemplateArtifactResult(value: unknown): value is TemplateArtifactResult;
export {};
```

## Supported JSON Schema TypeBox contracts

Copied from `dist/templates/schemaContract.d.ts`.

```ts
import { type JsonValue, type SupportedJsonSchema } from './schemaTypes.js';
/** JSON Pointer fragment accepted by the supported schema dialect. */
export declare const LOCAL_JSON_SCHEMA_REFERENCE_PATTERN = "^#(?:|/(?:[^~/]|~[01])*(?:/(?:[^~/]|~[01])*)*)$";
/** Reusable definitions for embedding the dialect in other TypeBox modules. */
export declare const SUPPORTED_JSON_SCHEMA_CONTRACT_DEFINITIONS: {
    readonly JsonValue: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNull, import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TString, import("@sinclair/typebox").TArray<import("@sinclair/typebox").TRef<"JsonValue">>, import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TRef<"JsonValue">>]>;
    readonly SupportedJsonSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TBoolean, import("@sinclair/typebox").TObject<{
        $schema: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TLiteral<"https://json-schema.org/draft/2020-12/schema">>;
        $ref: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        $defs: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TRef<"SupportedJsonSchema">>>;
        $comment: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        title: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        default: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"JsonValue">>;
        deprecated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        readOnly: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        writeOnly: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        examples: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TRef<"JsonValue">>>;
        type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"null">, import("@sinclair/typebox").TLiteral<"boolean">, import("@sinclair/typebox").TLiteral<"object">, import("@sinclair/typebox").TLiteral<"array">, import("@sinclair/typebox").TLiteral<"number">, import("@sinclair/typebox").TLiteral<"string">, import("@sinclair/typebox").TLiteral<"integer">]>, import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"null">, import("@sinclair/typebox").TLiteral<"boolean">, import("@sinclair/typebox").TLiteral<"object">, import("@sinclair/typebox").TLiteral<"array">, import("@sinclair/typebox").TLiteral<"number">, import("@sinclair/typebox").TLiteral<"string">, import("@sinclair/typebox").TLiteral<"integer">]>>]>>;
        const: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"JsonValue">>;
        enum: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TRef<"JsonValue">>>;
        multipleOf: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        maximum: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        exclusiveMaximum: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        minimum: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        exclusiveMinimum: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        maxLength: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        minLength: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        pattern: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        format: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        contentEncoding: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        contentMediaType: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        contentSchema: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
        prefixItems: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>>;
        items: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
        contains: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
        minContains: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        maxContains: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        minItems: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        maxItems: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        uniqueItems: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        unevaluatedItems: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
        properties: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TRef<"SupportedJsonSchema">>>;
        patternProperties: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TRef<"SupportedJsonSchema">>>;
        additionalProperties: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
        propertyNames: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
        required: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        minProperties: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        maxProperties: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        dependentRequired: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>>;
        dependentSchemas: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TRef<"SupportedJsonSchema">>>;
        unevaluatedProperties: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
        allOf: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>>;
        anyOf: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>>;
        oneOf: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>>;
        not: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
        if: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
        then: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
        else: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRef<"SupportedJsonSchema">>;
    }>]>;
};
/** Canonical recursive TypeBox contract for JSON-compatible values. */
export declare const JsonValueSchema: import("@sinclair/typebox").TUnsafe<JsonValue>;
/** Canonical recursive TypeBox contract for the supported Draft 2020-12 profile. */
export declare const SupportedJsonSchemaSchema: import("@sinclair/typebox").TUnsafe<SupportedJsonSchema>;
/** Static JSON value shape produced by the canonical contract. */
export type ContractJsonValue = JsonValue;
/** Static supported-schema shape produced by the canonical contract. */
export type ContractSupportedJsonSchema = SupportedJsonSchema;
/** Return whether a value is structurally valid JSON data. */
export declare const isJsonValueContract: (value: unknown) => value is JsonValue;
/** Return whether a value satisfies the closed supported-schema contract. */
export declare const isSupportedJsonSchemaContract: (value: unknown) => value is SupportedJsonSchema;
```

## JSON Schema compatibility contracts

Copied from `dist/templates/schemaCompatibility.d.ts`.

```ts
import { type JsonValue, type SupportedJsonSchema } from './schemaTypes.js';
export type SupportedJsonSchemaIssueCode = 'InvalidJsonSchema' | 'UnsupportedJsonSchemaKeyword' | 'UnsupportedJsonSchemaReference' | 'UnresolvedJsonSchemaReference';
export interface SupportedJsonSchemaIssue {
    readonly code: SupportedJsonSchemaIssueCode;
    readonly message: string;
    readonly path: string;
    readonly keyword?: string;
    readonly actual?: unknown;
}
export type SupportedJsonSchemaValidationResult = {
    readonly ok: true;
    readonly schema: SupportedJsonSchema;
    readonly canonicalSchema: SupportedJsonSchema;
    readonly canonicalJson: string;
} | {
    readonly ok: false;
    readonly issues: readonly SupportedJsonSchemaIssue[];
};
export interface JsonSchemaValueIssue {
    readonly code: 'InvalidJsonValue' | 'JsonSchemaValueMismatch';
    readonly message: string;
    /** JSON-path-like location within the validated value. */
    readonly path: string;
    readonly schemaPath?: string;
    readonly keyword?: string;
    readonly actual?: unknown;
}
export type JsonSchemaValueValidationResult = {
    readonly ok: true;
    readonly value: JsonValue;
} | {
    readonly ok: false;
    readonly issues: readonly (SupportedJsonSchemaIssue | JsonSchemaValueIssue)[];
};
export declare const SCHEMA_COMPATIBILITY_VALUES: readonly ["compatible", "incompatible", "indeterminate"];
export type SchemaCompatibility = typeof SCHEMA_COMPATIBILITY_VALUES[number];
export interface SchemaCompatibilityIssue {
    readonly code: 'InvalidActualSchema' | 'InvalidExpectedSchema' | 'SchemaConstraintMismatch' | 'SchemaCompatibilityIndeterminate';
    readonly message: string;
    readonly path: string;
    readonly expected?: unknown;
    readonly actual?: unknown;
}
export interface SchemaComparisonResult {
    readonly compatibility: SchemaCompatibility;
    readonly issues: readonly SchemaCompatibilityIssue[];
}
/** Deterministically orders object keys and set-like arrays without mutating the input. */
export declare function canonicalizeSupportedJsonSchema(schema: SupportedJsonSchema): SupportedJsonSchema;
export declare function canonicalJsonSchemaString(schema: SupportedJsonSchema): string;
/** Validate an authored schema against the closed dialect and return every discovered issue. */
export declare function validateSupportedJsonSchema(schema: unknown, path?: string): SupportedJsonSchemaValidationResult;
/** Validate a JSON value with cached Ajv 2020 compilation; formats and content remain annotations. */
export declare function validateJsonValueAgainstSchema(value: unknown, schema: unknown, path?: string): JsonSchemaValueValidationResult;
/**
 * Add a generated JSON Schema resource boundary before embedding an authored
 * schema in a larger planner document. Authored `$id` remains unsupported.
 */
export declare function schemaWithResourceId(schema: SupportedJsonSchema, id: string): Record<string, unknown>;
/** Compare producer (`actual`) values to a consumer (`expected`) contract. */
export declare function compareJsonSchemas(actualSchema: unknown, expectedSchema: unknown): SchemaComparisonResult;
```

## TypeScript compatibility contracts

Copied from `dist/templates/typeScriptCompatibility.d.ts`.

```ts
/** Version of the TypeScript descriptor compatibility rules used by catalog digests. */
export declare const TYPESCRIPT_COMPATIBILITY_ENGINE_VERSION: "ts1";
/** Stable issue codes produced while validating TypeScript type descriptors. */
export declare const TYPESCRIPT_TYPE_ISSUE_CODE_VALUES: readonly ["InvalidTypeScriptType", "UnresolvedTypeScriptType", "ForbiddenAnyType"];
export type TypeScriptTypeIssueCode = typeof TYPESCRIPT_TYPE_ISSUE_CODE_VALUES[number];
export type TypeScriptCompilerDiagnosticCategory = 'error' | 'warning' | 'suggestion' | 'message';
/** A JSON-friendly problem found in an authored TypeScript type expression. */
export interface TypeScriptTypeIssue {
    code: TypeScriptTypeIssueCode;
    message: string;
    path: string;
    compilerCode?: number;
    compilerCategory?: TypeScriptCompilerDiagnosticCategory;
    line?: number;
    column?: number;
}
/** Structured result returned when a TypeScript type descriptor is validated. */
export type TypeScriptTypeValidationResult = {
    ok: true;
    typeExpression: string;
} | {
    ok: false;
    typeExpression: string;
    issues: readonly TypeScriptTypeIssue[];
};
export declare const TYPESCRIPT_TYPE_COMPATIBILITY_STATUS_VALUES: readonly ["compatible", "incompatible", "invalid"];
export type TypeScriptTypeCompatibilityStatus = typeof TYPESCRIPT_TYPE_COMPATIBILITY_STATUS_VALUES[number];
export type TypeScriptTypeCompatibilityResult = {
    status: 'compatible';
    reason: 'noExpectedType' | 'assignable';
    expected?: string;
    actual?: string;
} | {
    status: 'incompatible';
    reason: 'missingActualType' | 'notAssignable';
    expected: string;
    actual?: string;
} | {
    status: 'invalid';
    reason: 'invalidType';
    expected?: string;
    actual?: string;
    issues: readonly TypeScriptTypeIssue[];
};
/**
 * Validate a self-contained TypeScript type expression against the ES2022
 * standard library. Project-local declarations are intentionally unavailable.
 */
export declare function validateTypeScriptType(typeExpression: string, path?: string): TypeScriptTypeValidationResult;
/**
 * Compare TypeScript descriptor strings using compiler assignability.
 *
 * Compatibility is directional: the actual producer type must be assignable
 * to the expected consumer type.
 */
export declare function compareTypeScriptTypes(expected: string | undefined, actual: string | undefined): TypeScriptTypeCompatibilityResult;
```

## Type-descriptor compatibility contracts

Copied from `dist/templates/compatibility.d.ts`.

```ts
import type { FragmentInputPort, FragmentCollectionInputPort, InputPort, InputPortSummary, LiteralInputPort, OutputPortSummary, OutputPort, RawCodeInputPort, RegionKind, StrictOutputPort, StrictUnionPortInput, TypeDescriptor, TypedSyntaxRegionKind, UnionInputPort } from "./graphTypes.js";
import type { SupportedJsonSchema } from "./schemaTypes.js";
import { type SchemaComparisonResult } from "./schemaCompatibility.js";
import { type TypeScriptTypeCompatibilityResult } from "./typeScriptCompatibility.js";
type StrictPortInput<T extends InputPort, P extends Omit<T, "kind">> = P & (Exclude<keyof P, keyof Omit<T, "kind">> extends never ? unknown : never);
type StrictSourceFileFragmentPortInput<P extends Omit<FragmentInputPort, "kind">> = P["regionKind"] extends "sourceFile" ? P["accepts"] extends {
    readonly outputKind: infer TOutputKind extends RegionKind;
} ? TOutputKind extends "sourceFile" ? P["accepts"] extends {
    readonly type: unknown;
} ? never : P : never : P["accepts"] extends {
    readonly type: unknown;
} ? never : P : P["accepts"] extends {
    readonly outputKind: "sourceFile";
} ? never : P;
/** Stable result values returned by descriptor compatibility checks. */
export declare const TYPE_DESCRIPTOR_COMPATIBILITY_STATUS_VALUES: readonly ["compatible", "incompatible", "indeterminate", "invalid"];
export type TypeDescriptorCompatibilityStatus = typeof TYPE_DESCRIPTOR_COMPATIBILITY_STATUS_VALUES[number];
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
export type EffectiveTypeDescriptorResult = {
    readonly ok: true;
    readonly type?: TypeDescriptor;
} | {
    readonly ok: false;
    readonly reason: "invalid" | "conflict";
    readonly type?: TypeDescriptor;
    readonly issues: readonly TypeDescriptorCompatibilityIssue[];
};
/**
 * Compare a producer descriptor (`actual`) to a consumer descriptor (`expected`).
 * Invalid metadata dominates incompatibility, which dominates indeterminacy.
 */
export declare function compareTypeDescriptors(actual: TypeDescriptor | undefined, expected: TypeDescriptor | undefined): TypeDescriptorCompatibilityResult;
/**
 * Resolve the deprecated standalone schema alias into `TypeDescriptor.schema`.
 * When both declarations are present they must be provably equivalent.
 */
export declare function resolveEffectiveTypeDescriptor(type: TypeDescriptor | undefined, legacySchema: SupportedJsonSchema | undefined): EffectiveTypeDescriptorResult;
/** @deprecated Use `compareTypeDescriptors(actual, expected)` for structured results. */
export declare function isTypeCompatible(expected: TypeDescriptor | undefined, actual: TypeDescriptor | undefined): boolean;
export type SchemaValidationResult = {
    /** Success discriminator. */
    ok: true;
} | {
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
export declare function validateJsonSchemaSubset(value: unknown, schema: unknown, path?: string): SchemaValidationResult;
export declare function literalPort<const P extends Omit<LiteralInputPort, "kind">>(port: P["regionKind"] extends TypedSyntaxRegionKind ? never : StrictPortInput<LiteralInputPort, P>): LiteralInputPort & P & {
    readonly kind: "literal";
};
export declare function fragmentPort<const P extends Omit<FragmentInputPort, "kind">>(port: StrictSourceFileFragmentPortInput<P> extends never ? never : StrictPortInput<FragmentInputPort, P>): FragmentInputPort & P & {
    readonly kind: "fragment";
};
export declare function fragmentCollectionPort<const P extends Omit<FragmentCollectionInputPort, "kind">>(port: P["regionKind"] extends "sourceFile" ? never : P["accepts"] extends {
    readonly outputKind: "sourceFile";
} ? never : StrictPortInput<FragmentCollectionInputPort, P>): FragmentCollectionInputPort & P & {
    readonly kind: "fragmentCollection";
};
export declare function fragmentPortOutputKind(port: FragmentInputPort | FragmentCollectionInputPort): RegionKind;
export declare function rawCodePort<const P extends Omit<RawCodeInputPort, "kind">>(port: P["regionKind"] extends "sourceFile" ? never : StrictPortInput<RawCodeInputPort, P>): RawCodeInputPort & P & {
    readonly kind: "rawCode";
};
export declare function unionPort<const P extends Omit<UnionInputPort, "kind">>(port: StrictUnionPortInput<P>): UnionInputPort & P & {
    readonly kind: "union";
};
export declare function outputPort<const P extends OutputPort>(port: StrictOutputPort<P>): OutputPort;
export declare function portIsRequired(port: InputPort): boolean;
export declare function portRegionKind(port: InputPort): RegionKind;
export declare function summarizeInputPort(port: InputPort): InputPortSummary;
export declare function summarizeOutputPort(port: OutputPort): OutputPortSummary;
export {};
```
