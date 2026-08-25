import type { GenerateOptions, MarkerExpectedKind, ReplacementMap, TemplateMode } from '../core/types.js'
import type { SupportedJsonSchema } from './schemaTypes.js'

/** Syntactic region kind accepted by graph ports and generated fragments. */
export type RegionKind = MarkerExpectedKind

/** Version of the parser-wrapper and AST-context contract for region kinds. */
export const REGION_SYNTAX_ENGINE_VERSION = 2 as const

/** Runtime list of supported graph region kinds, aligned with `RegionKind`. */
export const REGION_KIND_VALUES = [
	'identifier',
	'expression',
	'expressionSuffix',
	'statement',
	'array',
	'object',
	'string',
	'number',
	'boolean',
	'null',
	'objectProperty',
	'type',
	'typeMember',
	'typeParameter',
	'parameter',
	'constructorParameter',
	'heritageType',
	'declaration',
	'classMember',
	'enumMember',
	'importSpecifier',
	'exportSpecifier',
	'sourceFile'
] as const satisfies readonly RegionKind[]

/** Region kinds that carry TypeScript code rather than JSON literal values. */
export const TYPED_SYNTAX_REGION_KIND_VALUES = [
	'type', 'typeMember', 'typeParameter', 'parameter', 'constructorParameter',
	'heritageType', 'declaration', 'classMember', 'enumMember', 'importSpecifier', 'exportSpecifier',
	'sourceFile'
] as const satisfies readonly RegionKind[]

export type TypedSyntaxRegionKind = typeof TYPED_SYNTAX_REGION_KIND_VALUES[number]

/** Built-in diagnostic codes emitted by catalog, graph, artifact, and runner APIs. */
export const BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES = [
	'AmbiguousArtifactInputAlias',
	'ArtifactAlreadyComplete',
	'ArtifactAssemblyHashMismatch',
	'ArtifactBaseFileHashMismatch',
	'ArtifactCreateFileExists',
	'ArtifactInputIdCollision',
	'ArtifactLedgerBaseHashMismatch',
	'ArtifactLedgerGraphHashMismatch',
	'ArtifactLedgerResultHashMismatch',
	'ArtifactLedgerUnknownArtifact',
	'ArtifactMarkerArityMismatch',
	'ArtifactMarkerKindMismatch',
	'ArtifactSetCatalogInvalid',
	'ArtifactSetTypeScriptSemanticError',
	'ArtifactSetTypeScriptSyntaxError',
	'ArtifactTargetKindMismatch',
	'ArtifactTargetPathCollision',
	'CatalogContractNotSerializable',
	'CatalogDigestMismatch',
	'CatalogManifestDigestMismatch',
	'CompilationScopeInvalid',
	'CompleteArtifactContainsMarkers',
	'ConflictingArtifactFillKeys',
	'ConflictingSchemaMetadata',
	'CycleDetected',
	'DuplicateNodeId',
	'DuplicateArtifactId',
	'DuplicateWorkspaceFilePath',
	'DuplicateTemplateId',
	'DuplicateUnresolvedInputId',
	'EmptyUnionPort',
	'FinalGoalKindMismatch',
	'FinalGoalSchemaMismatch',
	'FinalGoalTypeMismatch',
	'GeneratedTypeScriptInvalid',
	'GraphPatchInputNotFound',
	'GraphPatchTypeArgumentNotFound',
	'GraphPatchTargetAmbiguous',
	'GraphPatchTargetNotFound',
	'IncompatibleCollectionSize',
	'IncompatibleFragmentKind',
	'IncompatibleFragmentSource',
	'IncompatibleFragmentType',
	'IncompatibleInputKind',
	'IncompatibleSourceOutputKind',
	'IncompatibleSourceSchema',
	'IncompatibleSourceType',
	'IncompatibleSourceFileMetadata',
	'ImportReconciliationHashMismatch',
	'ImportReconciliationPathMismatch',
	'InvalidCollectionBounds',
	'InvalidCollectionMaximum',
	'InvalidCollectionMinimum',
	'InvalidCallableScope',
	'InvalidGraphRunnerAction',
	'InvalidGeneratedSourceMap',
	'InvalidActualSchema',
	'InvalidExpectedSchema',
	'InvalidArtifactGraph',
	'InvalidArtifactId',
	'InvalidArtifactSetPlan',
	'InvalidArtifactTarget',
	'InvalidArtifactTargetPath',
	'InvalidArtifactTargetRange',
	'InvalidConstraintBoundStaticAcceptance',
	'InvalidJsonSchema',
	'InvalidJsonValue',
	'InvalidLiteralInput',
	'InvalidNominalType',
	'InvalidRawCodeMaxLength',
	'InvalidRawCodePattern',
	'InvalidRawCodePolicy',
	'InvalidImportReconciliationEdit',
	'InvalidRunnerTransition',
	'InvalidSemanticTarget',
	'InvalidTemplateManifest',
	'InvalidTemplateManifestSource',
	'InvalidTypeScriptProjectConfigurationPath',
	'InvalidTypeArgument',
	'InvalidTypeScriptType',
	'InvalidTypeParameterName',
	'GenericTypeParameterConstraint',
	'MalformedArtifactMarkers',
	'MalformedTemplateArtifact',
	'MissingArtifactMarker',
	'MissingArtifactBaseFile',
	'MissingRequiredInput',
	'MissingTypeScriptProjectConfiguration',
	'MissingTypeArgument',
	'MissingTypeScriptTypeArgument',
	'MissingTemplateManifestIdentity',
	'MissingWorkspaceSnapshotIdentity',
	'NominalTypeMismatch',
	'ArtifactCatalogRequired',
	'TemplateManifestDigestMismatch',
	'MixedUnionRegionKinds',
	'JsonSchemaMismatch',
	'JsonSchemaValueMismatch',
	'PartialArtifactHasNoUnresolvedInputs',
	'OverlappingArtifactTargets',
	'RawCodeRejected',
	'SchemaCompatibilityIndeterminate',
	'TypeScriptSemanticError',
	'TypeScriptProjectConfigurationError',
	'TypeScriptGlobalError',
	'TypeScriptTypeMismatch',
	'UnknownArtifactFillKey',
	'UnknownArtifactMarker',
	'UnknownFinalNode',
	'UnknownInput',
	'UnknownReference',
	'UnknownSourceModelId',
	'UnknownTemplate',
	'UnknownTemplateReplacement',
	'UnknownTypeArgument',
	'UndeclaredTypeParameter',
	'UnusedTypeParameter',
	'UntrustedTemplateCatalogView',
	'UntrustedTemplateDefinition',
	'UnresolvedArtifactSetInputs',
	'EmptyArtifactSetPlan',
	'InvalidWorkspaceFilePath',
	'InvalidWorkspaceFileSource',
	'InvalidWorkspaceManifest',
	'InvalidWorkspaceManifestFileIdentity',
	'InvalidWorkspaceManifestOrder',
	'InvalidWorkspaceManifestPath',
	'InvalidUnavailableTextPath',
	'InvalidUnavailableTextPathOrder',
	'UnavailableTextPathMissingFromManifest',
	'UnavailableTextPathsRequireWorkspaceManifest',
	'WorkspaceAnalysisFileUnavailable',
	'WorkspaceFileMissingFromManifest',
	'WorkspaceManifestFileIdentityMismatch',
	'WorkspaceManifestFileUnrepresented',
	'WorkspaceManifestTypeScriptConfigurationMismatch',
	'WorkspaceSnapshotHashMismatch',
	'WorkspaceTextPartitionOverlap',
	'UnresolvedLocalSchemaReference',
	'UnresolvedJsonSchemaReference',
	'UnresolvedTemplateInputs',
	'UnresolvedTypeScriptType',
	'UnsupportedSchemaKeyword',
	'UnsupportedJsonSchemaKeyword',
	'UnsupportedJsonSchemaReference',
	'ForbiddenAnyType',
	'IncompatibleTypeArgument'
] as const

/** Closed union of package-provided diagnostics; custom diagnostics remain supported. */
export type BuiltInSynthesisDiagnosticCode = typeof BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES[number]

/** Authority boundary that owns the condition represented by a diagnostic. */
export const SYNTHESIS_DIAGNOSTIC_ORIGIN_VALUES = [
	'candidate',
	'catalog',
	'workspace',
	'deployment',
	'integrity',
	'internal'
] as const

export type SynthesisDiagnosticOrigin = typeof SYNTHESIS_DIAGNOSTIC_ORIGIN_VALUES[number]

/** Contextual repair channel attached to failed operations and actionable runner states. */
export const SYNTHESIS_FAILURE_CLASSIFICATION_VALUES = [
	'graphRepairable',
	'artifactFillable',
	'templatePolicyFailure',
	'terminalFailure'
] as const

export type SynthesisFailureClassification = typeof SYNTHESIS_FAILURE_CLASSIFICATION_VALUES[number]

/**
 * Candidate-authored diagnostics that have an explicit non-terminal repair
 * channel. Every code omitted from these lists is classified terminally.
 */
const GRAPH_REPAIRABLE_DIAGNOSTIC_CODES = new Set<BuiltInSynthesisDiagnosticCode>([
	'AmbiguousArtifactInputAlias',
	'ArtifactCreateFileExists',
	'ArtifactSetTypeScriptSemanticError',
	'ArtifactSetTypeScriptSyntaxError',
	'ArtifactTargetKindMismatch',
	'ArtifactTargetPathCollision',
	'CycleDetected',
	'DuplicateArtifactId',
	'DuplicateNodeId',
	'EmptyArtifactSetPlan',
	'FinalGoalKindMismatch',
	'FinalGoalSchemaMismatch',
	'FinalGoalTypeMismatch',
	'GeneratedTypeScriptInvalid',
	'GraphPatchInputNotFound',
	'GraphPatchTypeArgumentNotFound',
	'GraphPatchTargetAmbiguous',
	'GraphPatchTargetNotFound',
	'IncompatibleCollectionSize',
	'IncompatibleFragmentKind',
	'IncompatibleFragmentSource',
	'IncompatibleFragmentType',
	'IncompatibleInputKind',
	'IncompatibleTypeArgument',
	'IncompatibleSourceOutputKind',
	'IncompatibleSourceSchema',
	'IncompatibleSourceType',
	'InvalidArtifactGraph',
	'InvalidArtifactId',
	'InvalidArtifactSetPlan',
	'InvalidArtifactTarget',
	'InvalidArtifactTargetPath',
	'InvalidArtifactTargetRange',
	'InvalidGraphRunnerAction',
	'InvalidLiteralInput',
	'InvalidRunnerTransition',
	'InvalidSemanticTarget',
	'InvalidTypeArgument',
	'JsonSchemaMismatch',
	'MissingTypeArgument',
	'MissingTypeScriptTypeArgument',
	'MissingArtifactBaseFile',
	'NominalTypeMismatch',
	'OverlappingArtifactTargets',
	'RawCodeRejected',
	'UnknownTypeArgument',
	'TypeScriptSemanticError',
	'TypeScriptTypeMismatch',
	'UnknownFinalNode',
	'UnknownInput',
	'UnknownReference',
	'UnknownTemplate'
])

/** Package diagnostics that authorize a bounded unresolved-input fill. */
const ARTIFACT_FILLABLE_DIAGNOSTIC_CODES = new Set<BuiltInSynthesisDiagnosticCode>([
	'ConflictingArtifactFillKeys',
	'MissingRequiredInput',
	'UnknownArtifactFillKey',
	'UnresolvedArtifactSetInputs',
	'UnresolvedTemplateInputs'
])

/** Package diagnostics that indicate a deployment-owned template-policy defect. */
const TEMPLATE_POLICY_DIAGNOSTIC_CODE_VALUES = new Set<BuiltInSynthesisDiagnosticCode>([
	'CatalogContractNotSerializable',
	'GenericTypeParameterConstraint',
	'InvalidTemplateManifest',
	'InvalidTemplateManifestSource',
	'InvalidCallableScope',
	'InvalidTypeParameterName',
	'UndeclaredTypeParameter',
	'UnusedTypeParameter',
	'UntrustedTemplateCatalogView',
	'UntrustedTemplateDefinition'
])

/**
 * Closed classification for every package-owned diagnostic code.
 *
 * The construction intentionally defaults to `terminalFailure`; adding a new
 * diagnostic therefore cannot accidentally grant model repair authority.
 */
export const SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG = Object.freeze(
	Object.fromEntries(BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES.map(code => [
		code,
		ARTIFACT_FILLABLE_DIAGNOSTIC_CODES.has(code)
			? 'artifactFillable'
			: GRAPH_REPAIRABLE_DIAGNOSTIC_CODES.has(code)
				? 'graphRepairable'
				: TEMPLATE_POLICY_DIAGNOSTIC_CODE_VALUES.has(code)
					? 'templatePolicyFailure'
					: 'terminalFailure'
	]))
) as Readonly<Record<BuiltInSynthesisDiagnosticCode, SynthesisFailureClassification>>

/** Return the package classification for a diagnostic, failing closed on unknown codes. */
export function classifySynthesisDiagnosticCode(code: string): SynthesisFailureClassification {
	return Object.prototype.hasOwnProperty.call(SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG, code)
		? SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG[code as BuiltInSynthesisDiagnosticCode]
		: 'terminalFailure'
}

/** Graph patch actions accepted by the runner repair protocol. */
export const GRAPH_PATCH_ACTION_KIND_VALUES = [
	'addNode',
	'removeNode',
	'setInput',
	'removeInput',
	'setTypeArgument',
	'removeTypeArgument',
	'setFinalNode',
	'setGoal',
	'removeGoal'
] as const

export type GraphPatchActionKind = typeof GRAPH_PATCH_ACTION_KIND_VALUES[number]

/** All explicit actions accepted by GraphRunner.advance(). */
export const GRAPH_RUNNER_ACTION_KIND_VALUES = [
	...GRAPH_PATCH_ACTION_KIND_VALUES,
	'replaceGraph',
	'fill'
] as const

export type GraphRunnerActionKind = typeof GRAPH_RUNNER_ACTION_KIND_VALUES[number]

/** Version of the persisted generated-source mapping format. */
export const GENERATED_SOURCE_MAP_VERSION = 1 as const

/** Runtime list of ownership variants recorded by generated-source maps. */
export const GENERATED_SOURCE_SPAN_KIND_VALUES = ['node', 'input'] as const

export type GeneratedSourceSpanKind = typeof GENERATED_SOURCE_SPAN_KIND_VALUES[number]

/** Shared identity and range metadata for one generated-source span. */
interface BaseGeneratedSourceSpan {
	/** Zero-based UTF-16 offset at which the span begins in artifact `code`. */
	start: number
	/** Exclusive zero-based UTF-16 offset at which the span ends in artifact `code`. */
	end: number
	/** Composition depth, where the final/root node begins at depth zero. */
	nestingDepth: number
	/** Graph node that contributed the span, when generated within a graph. */
	nodeId?: string
	/** Template model that contributed the span. */
	templateId: string
}

/** Source owned by a template node's generated body. */
export interface GeneratedNodeSourceSpan extends BaseGeneratedSourceSpan {
	kind: 'node'
}

/** Source produced for one concrete or unresolved template input. */
export interface GeneratedInputSourceSpan extends BaseGeneratedSourceSpan {
	kind: 'input'
	/** Input on the contributing template that owns this source. */
	inputName: string
}

/** One persisted ownership range within generated artifact code. */
export type GeneratedSourceSpan = GeneratedNodeSourceSpan | GeneratedInputSourceSpan

/**
 * Persisted graph provenance used to attribute compiler diagnostics.
 *
 * Spans may overlap: nested child spans have a greater `nestingDepth` than the
 * containing input and node spans.
 */
export interface GeneratedSourceMap {
	version: typeof GENERATED_SOURCE_MAP_VERSION
	spans: GeneratedSourceSpan[]
}

/**
 * Optional type metadata used for graph compatibility checks.
 *
 * `ts` is a self-contained TypeScript type expression, while `schema` uses the
 * package's supported Draft 2020-12 profile.
 */
export interface TypeDescriptor {
	/** Optional catalog-level nominal family used to distinguish structurally similar library values. */
	nominal?: string
	/** Self-contained TypeScript type expression enforced through compiler assignability. */
	ts?: string
	/** Canonical JSON Schema contract used for value and fragment compatibility. */
	schema?: SupportedJsonSchema
}

/** One named generic type accepted by a template manifest. */
export interface TemplateTypeParameterDefinition {
	/** Human-readable purpose shown to planners and catalog consumers. */
	description?: string
	/** Optional concrete upper-bound contract for explicit node type arguments. */
	constraint?: TypeDescriptor
}

/** Planner-facing suggestion for how to repair a diagnostic. */
export interface SynthesisRepairHint {
	/** Machine-readable repair category. */
	kind: string
	/** Human-readable repair suggestion. */
	message: string
	/** Additional repair-specific metadata. */
	[key: string]: unknown
}

/** Structured validation or compilation issue emitted by graph compilation. */
export interface SynthesisDiagnostic {
	/** Authority boundary that owns the diagnosed condition. */
	origin: SynthesisDiagnosticOrigin
	/** Pipeline stage that produced the diagnostic. */
	stage: 'graph' | 'template' | 'input' | 'port' | 'region' | 'ast' | 'type' | 'policy'
	/** Machine-readable diagnostic code. */
	code: string
	/** Diagnostic severity. */
	severity: 'error' | 'warning'
	/** Human-readable diagnostic message. */
	message: string
	/** Graph node ID associated with the diagnostic, when available. */
	nodeId?: string
	/** Template model ID associated with the diagnostic, when available. */
	templateId?: string
	/** Template input name associated with the diagnostic, when available. */
	inputName?: string
	/** Generic template parameter associated with the diagnostic, when available. */
	typeParameterName?: string
	/** Path to the problematic graph or input value, when available. */
	path?: string
	/** Expected value, type, schema, or port metadata. */
	expected?: unknown
	/** Actual value, type, schema, or error metadata. */
	actual?: unknown
	/** Optional suggestions for repairing planner-provided input. */
	repairHints?: SynthesisRepairHint[]
	/** TypeScript compiler diagnostic code, when emitted by semantic validation. */
	compilerCode?: number
	/** TypeScript compiler diagnostic category, when emitted by semantic validation. */
	compilerCategory?: 'error' | 'warning' | 'suggestion' | 'message'
	/** One-based line within generated artifact code, when available. */
	line?: number
	/** One-based column within generated artifact code, when available. */
	column?: number
}

/**
 * Code produced by a graph template invocation.
 *
 * Fragments carry their syntactic region kind plus optional type/schema
 * metadata so downstream fragment ports can validate compatibility.
 */
export interface GeneratedFragment {
	/** Graph node ID that produced the fragment, when available. */
	id?: string
	/** Generated TypeScript source fragment. */
	code: string
	/** Syntactic region kind of the generated fragment. */
	kind: RegionKind
	/** Template identity that produced the fragment. */
	source: {
		/** Template model ID that produced the fragment. */
		templateId: string
		/** Template version that produced the fragment, when provided. */
		templateVersion?: string
		/**
		 * Exact executable template-manifest identity that produced the fragment.
		 *
		 * Newly generated fragments always include this field. It remains optional
		 * so artifacts persisted before manifest identities were introduced remain
		 * readable.
		 */
		templateManifestDigest?: string
	}
	/** Optional TypeScript/JSON-schema type metadata for compatibility checks. */
	type?: TypeDescriptor
	/** @deprecated Put generated-value schema metadata in `type.schema`. */
	schema?: SupportedJsonSchema
	/** Optional lineage metadata for downstream inspection. */
	provenance?: {
		/** Graph node ID that produced the fragment. */
		nodeId?: string
		/** Referenced fragment IDs consumed by this fragment. */
		inputRefs?: string[]
		/** Literal input values consumed by the template. */
		literalInputs?: Record<string, unknown>
		/** Concrete generic type arguments used to instantiate this fragment. */
		typeArguments?: Record<string, TypeDescriptor>
	}
	/** Persisted source ownership ranges for graph-aware diagnostic attribution. */
	sourceMap?: GeneratedSourceMap
	/** Diagnostics attached to this fragment, if a producer supplies them. */
	diagnostics?: SynthesisDiagnostic[]
}

/** A fill value supplied directly to an unresolved template artifact input. */
export type TemplateArtifactInput =
	| {
			/** Fill the unresolved input with a JSON-like literal value. */
			kind: 'literal'
			/** Literal value supplied to a literal-compatible unresolved input. */
			value: unknown
	  }
	| {
			/** Fill the unresolved input with caller-provided TypeScript source. */
			kind: 'rawCode'
			/** Raw TypeScript source supplied to a raw-code-compatible unresolved input. */
			code: string
	  }
	| {
			/** Fill the unresolved input with an already generated or partial fragment. */
			kind: 'fragment'
			/** Fragment or partial artifact supplied to a fragment-compatible unresolved input. */
			fragment: TemplateArtifact
	  }
	| {
			/** Fill an unresolved variadic input with ordered generated fragments. */
			kind: 'fragmentCollection'
			fragments: TemplateArtifact[]
	  }

/**
 * Template artifact fill values keyed by unresolved opaque ID or by an input
 * name that is unique within the artifact. Unknown and ambiguous keys are
 * rejected transactionally.
 */
export type TemplateArtifactInputMap = Record<string, TemplateArtifactInput>

/** An input marker that is still open in a partial template artifact. */
export interface UnresolvedTemplateInput {
	/** Stable opaque replacement ID used by the marker in `code`. */
	id: string
	/** Original template input name. */
	inputName: string
	/** Graph node that produced this unresolved input, when available. */
	nodeId?: string
	/** Template model ID that owns this unresolved input. */
	templateId: string
	/** Port contract that a later fill must satisfy. */
	port: InputPort
	/** JSON-path-like location of the unresolved graph input, when available. */
	path?: string
}

/** A fully resolved template artifact. */
export interface CompleteTemplateArtifact extends GeneratedFragment {
	/** Complete artifacts have no unresolved inputs. */
	complete: true
}

/** Template-like generated code that still contains fillable marker regions. */
export interface PartialTemplateArtifact extends Omit<GeneratedFragment, 'diagnostics'> {
	/** Partial artifacts still contain unresolved marker regions. */
	complete: false
	/** Inputs that must be filled before finalization. */
	unresolvedInputs: UnresolvedTemplateInput[]
	/** Diagnostics attached to this partial artifact, if any. */
	diagnostics?: SynthesisDiagnostic[]
}

/** Generated template state that may be complete or still fillable. */
export type TemplateArtifact = CompleteTemplateArtifact | PartialTemplateArtifact

/**
 * Opt-in restrictions for raw-code graph inputs before they reach generation.
 *
 * Raw code is still parsed and checked by the normal replacement security
 * policy after graph validation; this policy is an earlier planner-facing gate.
 */
export interface RawCodePolicy {
	/** Human-readable policy description for planners and summaries. */
	description?: string
	/** Maximum number of characters accepted for the raw-code input. */
	maxLength?: number
	/** Set to false to reject raw-code inputs containing CR or LF characters. */
	allowNewlines?: boolean
	/** Literal substrings that must not appear in the raw-code input. */
	forbiddenSubstrings?: string[]
	/** Regular expression source strings matched with the `u` flag. */
	forbiddenPatterns?: string[]
}

/**
 * A template input contract. Each variant describes one accepted graph input
 * shape and the replacement region kind it will feed in the template source.
 */
export type InputPort = LiteralInputPort | FragmentInputPort | FragmentCollectionInputPort | RawCodeInputPort | UnionInputPort

/** Common metadata shared by all input port shapes. */
interface BaseInputPort {
	/** Whether this input must be present; defaults to true. */
	required?: boolean
	/** Human-readable input description for planners and summaries. */
	description?: string
}

/** Common contract for input ports that feed a concrete replacement region. */
interface RegionInputPort extends BaseInputPort {
	/** Replacement region kind this input will feed. */
	regionKind: RegionKind
}

/** A JSON-like value validated with the supported schema subset. */
export interface LiteralInputPort extends RegionInputPort {
	/** Port discriminator for JSON-like literal inputs. */
	kind: 'literal'
	/** Optional supported JSON Schema used to validate the literal value. */
	schema?: SupportedJsonSchema
}

/** A reference to another generated fragment with kind/type/source checks. */
export interface FragmentInputPort extends RegionInputPort {
	/** Port discriminator for graph fragment references. */
	kind: 'fragment'
	/** Fragment compatibility requirements. */
	accepts: {
		/** Required output kind of the referenced fragment; defaults to `regionKind`. */
		outputKind?: RegionKind
		/** Optional type metadata the referenced fragment must satisfy. */
		type?: TypeDescriptor
		/** Optional allowlist of template model IDs that may produce the fragment. */
		sourceModelIds?: string[]
	}
}

/** An ordered, variadic collection of references to compatible generated fragments. */
export interface FragmentCollectionInputPort extends RegionInputPort {
	/** Port discriminator for graph fragment-reference collections. */
	kind: 'fragmentCollection'
	/** Fragment compatibility requirements applied independently to every item. */
	accepts: FragmentInputPort['accepts']
	/**
	 * Text placed between fragment sources when replacing the collection region.
	 * The default follows the region's syntax context (for example, newline for
	 * statements and comma-space for parameters).
	 */
	separator?: string
	/** Minimum number of referenced fragments. Defaults to zero. */
	minItems?: number
	/** Maximum number of referenced fragments, when bounded. */
	maxItems?: number
}

/** A caller-provided TypeScript snippet gated by an optional raw-code policy. */
export interface RawCodeInputPort extends RegionInputPort {
	/** Port discriminator for raw TypeScript snippets. */
	kind: 'rawCode'
	/** Optional planner-facing raw-code restrictions. */
	policy?: RawCodePolicy
	/** Optional type metadata describing the raw-code snippet. */
	type?: TypeDescriptor
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
	kind: 'union'
	/** Ordered concrete port options accepted for this input. */
	options: InputPort[]
}

/** Output contract advertised by a graph template. */
export interface OutputPort {
	/** Syntactic region kind produced by the template. */
	kind: RegionKind
	/** Optional TypeScript/JSON-schema type metadata for compatibility checks. */
	type?: TypeDescriptor
	/** @deprecated Put generated-output schema metadata in `type.schema`. */
	schema?: SupportedJsonSchema
	/** Human-readable output description for planners and summaries. */
	description?: string
}

/** Declarative graph of template nodes with one requested final node. */
export interface SynthesisGraph {
	/** Nodes available to compile. */
	nodes: SynthesisNode[]
	/** Node ID whose fragment should be returned as the final result. */
	readonly finalNodeId: string
	/** Optional constraints for the final generated fragment. */
	readonly goal?: SynthesisGoal
}

/** One graph node: select a template and provide inputs by template port name. */
export interface SynthesisNode {
	/** Unique node identifier within the graph. */
	id: string
	/** Template model ID to invoke for this node. */
	templateId: string
	/** Explicit concrete bindings for every generic parameter declared by the template. */
	typeArguments?: Record<string, TypeDescriptor>
	/** Inputs keyed by the selected template's port names. */
	inputs: Record<string, SynthesisInput>
}

/**
 * Input value syntax accepted in graph definitions.
 *
 * `$ref` is shorthand for `{ kind: "ref", nodeId }`; `inline` nodes are
 * normalized into standalone nodes before validation.
 */
export type SynthesisInput =
	| {
			/** Input discriminator for an ordered collection of graph fragment references. */
			kind: 'fragmentCollection'
			/** References or inline nodes whose generated sources are joined in order. */
			items: Array<
				| { kind: 'ref'; nodeId: string }
				| { kind: 'inline'; node: SynthesisNode }
				| { $ref: string }
			>
	  }
	| {
			/** Input discriminator for JSON-like literal values. */
			kind: 'literal'
			/** Literal value supplied to a literal port. */
			value: unknown
	  }
	| {
			/** Input discriminator for references to another graph node. */
			kind: 'ref'
			/** Node ID whose generated fragment should feed the input. */
			nodeId: string
	  }
	| {
			/** Input discriminator for caller-provided TypeScript snippets. */
			kind: 'rawCode'
			/** Raw TypeScript source supplied to a raw-code port. */
			code: string
	  }
	| {
			/** Input discriminator for nested nodes normalized before validation. */
			kind: 'inline'
			/** Inline node definition to compile as an input dependency. */
			node: SynthesisNode
	  }
	| {
			/** Shorthand node reference equivalent to `{ kind: "ref", nodeId }`. */
			$ref: string
	  }

/** Graph input shape after shorthand refs and inline nodes are expanded. */
export type NormalizedSynthesisInput =
	| Exclude<SynthesisInput, { $ref: string } | { kind: 'inline'; node: SynthesisNode } | { kind: 'fragmentCollection' }>
	| { kind: 'fragmentCollection'; items: Array<{ kind: 'ref'; nodeId: string }> }

/** Result of graph normalization before validation and compilation. */
export interface GraphNormalizationResult {
	/** Graph after shorthand refs and inline nodes have been expanded. */
	graph: SynthesisGraph
}

/** Optional final-fragment constraints checked after graph compilation. */
export interface SynthesisGoal {
	/** Final fragment region kind. */
	outputKind?: RegionKind
	/** Final fragment type metadata. */
	type?: TypeDescriptor
	/** @deprecated Put final-fragment schema metadata in `type.schema`. */
	schema?: SupportedJsonSchema
}

/** Immutable, local graph edits accepted by the runner repair protocol. */
export type GraphPatchAction =
	| { kind: 'addNode'; node: SynthesisNode }
	| { kind: 'removeNode'; nodeId: string }
	| { kind: 'setInput'; nodeId: string; inputName: string; input: SynthesisInput }
	| { kind: 'removeInput'; nodeId: string; inputName: string }
	| { kind: 'setTypeArgument'; nodeId: string; parameterName: string; typeArgument: TypeDescriptor }
	| { kind: 'removeTypeArgument'; nodeId: string; parameterName: string }
	| { kind: 'setFinalNode'; nodeId: string }
	| { kind: 'setGoal'; goal: SynthesisGoal }
	| { kind: 'removeGoal' }

/** Any explicit action accepted by `GraphRunner.advance()`. */
export type GraphRunnerAction =
	| GraphPatchAction
	| { kind: 'replaceGraph'; graph: SynthesisGraph }
	| { kind: 'fill'; inputs: TemplateArtifactInputMap }

/** Transactional result returned by `applyGraphPatch()`. */
export type GraphPatchResult =
	| {
			kind: 'graphPatch'
			ok: true
			graph: SynthesisGraph
			diagnostics: SynthesisDiagnostic[]
	  }
	| {
			kind: 'graphPatch'
			ok: false
			classification: 'graphRepairable'
			graph: SynthesisGraph
			diagnostics: SynthesisDiagnostic[]
	  }

/** Minimal graph shape accepted by typed graph authoring helpers. */
export type AuthoredGraphNode = {
	readonly id: string
	readonly templateId: string
	readonly typeArguments?: Readonly<Record<string, TypeDescriptor>>
	readonly inputs: Record<string, unknown>
}

/** Minimal full graph input shape accepted by typed graph authoring helpers. */
export type AuthoredGraphInput = {
	readonly nodes: readonly AuthoredGraphNode[]
	readonly finalNodeId: string
	readonly goal?: SynthesisGoal
}

/** Explicit input ownership metadata for one callable template scope. */
export interface CallableScope<InputName extends string = string> {
	/** Input that contains the callable's declared parameters. */
	readonly parametersInput: InputName
	/** Input that contains the callable's implementation body. */
	readonly bodyInput: InputName
}

/**
 * One deterministic source import required by a template when its output is
 * assembled into a project source file.
 *
 * Requirements are declarative metadata only. They do not grant permission to
 * import a module; callers must separately provide matching
 * `ArtifactImportAuthority` before reconciliation.
 */
export interface TemplateImportRequirement {
	readonly schemaVersion: 1
	readonly moduleSpecifier: string
	readonly importKind: 'named' | 'default' | 'namespace' | 'sideEffect'
	readonly importedName?: string
	readonly localName?: string
	readonly typeOnly: boolean
}

/** Public, implementation-free template metadata for planners and UIs. */
export interface TemplateSummary {
	/** Template model ID. */
	modelId: string
	/** Template version, when provided by the definition. */
	version?: string
	/** Human-readable template description. */
	description?: string
	/** Generic parameters that graph nodes must bind explicitly. */
	typeParameters?: Record<string, TemplateTypeParameterDefinition>
	/** Explicit parameter-to-body ownership for callable templates. */
	callableScope?: CallableScope
	/** Deterministic imports required when the generated output is assembled. */
	importRequirements?: TemplateImportRequirement[]
	/** Summaries of accepted inputs keyed by input name. */
	inputs: Record<string, InputPortSummary>
	/** Summary of the generated output. */
	output: OutputPortSummary
}

/** Read-only validated template catalog accepted by graph compilation. */
export interface TemplateCatalogView {
	/** Stable digest of the normalized planner-facing catalog contract. */
	readonly contractDigest: string
	/** Stable digest of the catalog's executable declarative template manifests. */
	readonly manifestDigest: string
	/** Look up a template by model ID. */
	get(templateId: string): GraphTemplateDefinition<any, string> | undefined
	/** Return all templates sorted by model ID. */
	list(): GraphTemplateDefinition<any, string>[]
	/** Return planner-facing summaries sorted by model ID. */
	summaries(): TemplateSummary[]
}

/** Immutable registry membership and planner contract captured at one point in time. */
export interface TemplateRegistrySnapshot extends TemplateCatalogView {}

/** Mutable validated registry used to construct template catalog snapshots. */
export interface TemplateRegistry extends TemplateCatalogView {
	/** Insert a template whose model ID is not already registered. */
	register(template: GraphTemplateDefinition<any, string>): void
	/** Atomically insert a batch, allowing references among templates in the batch. */
	registerAll(templates: readonly GraphTemplateDefinition<any, string>[]): void
	/** Explicitly replace an existing template and revalidate all dependents. */
	replace(template: GraphTemplateDefinition<any, string>): void
	/** Capture immutable membership, summaries, and contract digest. */
	snapshot(): TemplateRegistrySnapshot
}

/** Compilation behavior selected for graph execution. */
export type GraphCompilationMode = 'strict' | 'partial'

/** Artifact type produced by a compilation mode. */
export type GraphArtifactForMode<M extends GraphCompilationMode> = M extends 'strict'
	? CompleteTemplateArtifact
	: TemplateArtifact

/** Unified success or failure result returned by graph compilation. */
export type GraphCompilationResult<M extends GraphCompilationMode = 'strict'> =
	| {
			kind: 'graphCompilation'
			mode: M
			ok: true
			finalArtifact: GraphArtifactForMode<M>
			artifacts: Record<string, GraphArtifactForMode<M>>
			diagnostics: SynthesisDiagnostic[]
	  }
	| {
			kind: 'graphCompilation'
			mode: M
			ok: false
			classification: Exclude<SynthesisFailureClassification, 'artifactFillable'>
			diagnostics: SynthesisDiagnostic[]
			partialArtifacts?: Record<string, GraphArtifactForMode<M>>
	  }

/** Partial-mode specialization used by runner state types. */
export type GraphPartialCompilationResult = GraphCompilationResult<'partial'>

/** Success or failure result returned by template artifact fill/finalize APIs. */
export type TemplateArtifactResult =
	| {
			/** Result family discriminator. */
			kind: 'templateArtifact'
			/** Success discriminator. */
			ok: true
			/** Filled artifact, which may still contain unresolved inputs. */
			artifact: TemplateArtifact
			/** Non-fatal diagnostics collected while filling. */
			diagnostics: SynthesisDiagnostic[]
	  }
	| {
			/** Result family discriminator. */
			kind: 'templateArtifact'
			/** Failure discriminator. */
			ok: false
			/** Contextual repair channel for this failed artifact operation. */
			classification: Exclude<SynthesisFailureClassification, 'graphRepairable'>
			/** Error and warning diagnostics collected while filling. */
			diagnostics: SynthesisDiagnostic[]
			/** Best-effort artifact produced before failure, when available. */
			artifact?: TemplateArtifact
	  }

/** Concrete graph input after validation has matched it to a concrete port. */
export type ResolvedGraphInput =
	| {
			/** Resolved input discriminator for literal values. */
			kind: 'literal'
			/** Validated literal value. */
			value: unknown
			/** Concrete literal port that accepted the value. */
			port: LiteralInputPort
	  }
	| {
			/** Resolved input discriminator for generated fragments. */
			kind: 'fragment'
			/** Referenced fragment that satisfied the fragment port. */
			fragment: TemplateArtifact
			/** Concrete fragment port that accepted the fragment. */
			port: FragmentInputPort
	  }
	| {
			/** Resolved input discriminator for ordered fragment collections. */
			kind: 'fragmentCollection'
			/** Referenced fragments in authored order. */
			fragments: TemplateArtifact[]
			/** Collection port that accepted every fragment. */
			port: FragmentCollectionInputPort
	  }
	| {
			/** Resolved input discriminator for raw-code snippets. */
			kind: 'rawCode'
			/** Raw TypeScript source accepted by the raw-code port. */
			code: string
			/** Concrete raw-code port that accepted the snippet. */
			port: RawCodeInputPort
	  }

/** Common invocation payload for graph template generation. */
interface BaseGraphTemplateInvocation {
	/** Graph node ID for provenance, when invoked from graph compilation. */
	nodeId?: string
	/** Validated concrete generic bindings for this invocation. */
	typeArguments?: Record<string, TypeDescriptor>
	/** Inputs resolved and matched to concrete ports. */
	inputs: Record<string, ResolvedGraphInput>
	/** Generation options forwarded to the replacement engine. */
	options?: GenerateOptions
}

/** Invocation payload for strict graph template generation. */
export interface GraphTemplateInvocation extends BaseGraphTemplateInvocation {}

/** Invocation payload for graph template generation that may leave holes open. */
export interface GraphTemplatePartialInvocation extends BaseGraphTemplateInvocation {
	/** Missing required inputs to preserve as marker regions. */
	unresolvedInputs: Record<string, UnresolvedTemplateInput>
}

/** Serializable author-owned portion of a graph template definition. */
export interface GraphTemplateManifest<
	I extends Record<string, InputPort> = Record<string, InputPort>,
	M extends string = string,
	O extends OutputPort = OutputPort,
	P extends Record<string, TemplateTypeParameterDefinition> | undefined = Record<string, TemplateTypeParameterDefinition> | undefined
> {
	/** Stable template/model identifier used by graph nodes. */
	readonly modelId: M
	/** Optional template version copied into generated fragment provenance. */
	readonly version?: string
	/** Optional human-readable summary for planners and registries. */
	readonly description?: string
	/** Named generic parameters referenced as `{{Name}}` in TypeDescriptor.ts strings. */
	readonly typeParameters?: P
	/** Explicit parameter-to-body ownership for callable templates. */
	readonly callableScope?: CallableScope<Extract<keyof I, string>>
	/** Imports required by this template, subject to separate caller authority. */
	readonly importRequirements?: readonly TemplateImportRequirement[]
	/** Named input ports accepted by this template. */
	readonly inputs: I
	/** Output fragment contract produced by the template. */
	readonly output: O
	/** Complete marked TypeScript source used for every invocation. */
	readonly source: string
}

/**
 * Executable graph template definition.
 *
 * `defineTemplate` creates this shape from a declarative template definition
 * and wires invocation through the lower-level replacement engine.
 */
export interface GraphTemplateDefinition<
	I extends Record<string, InputPort> = Record<string, InputPort>,
	M extends string = string,
	O extends OutputPort = OutputPort,
	P extends Record<string, TemplateTypeParameterDefinition> | undefined = Record<string, TemplateTypeParameterDefinition> | undefined
> extends GraphTemplateManifest<I, M, O, P> {
	/** Digest of this template's normalized contract and exact executable source. */
	readonly manifestDigest: string
	/** Invoke the template with already-resolved graph inputs. */
	invoke(invocation: GraphTemplateInvocation): GeneratedFragment
	/** Invoke the template while preserving missing required inputs as markers. */
	invokePartial(invocation: GraphTemplatePartialInvocation): TemplateArtifact
	/** Convert already-resolved graph inputs to a low-level replacement map. */
	toReplacementMap(inputs: Record<string, ResolvedGraphInput>): ReplacementMap
	/** Produce planner-facing metadata without exposing template source. */
	summary(): TemplateSummary
}

/** A real or caller-supplied target file into which an artifact is virtually inserted. */
export interface SemanticTargetFileContext {
	/** Target source-file identity used by TypeScript and graph diagnostics. */
	filePath: string
	/** Zero-based UTF-16 offset at which the insertion/replacement starts. */
	start: number
	/** Exclusive replacement end offset; defaults to `start` for pure insertion. */
	end?: number
	/** Optional unsaved target source; omit to load `filePath` from disk. */
	sourceText?: string
}

/** Optional insertion-site context used by graph semantic validation. */
export interface GraphSemanticContext {
	/** Declarations or imports made available to a synthetic validation wrapper. */
	prelude?: string
	/** Real file context used for virtual insertion and local-scope resolution. */
	targetFile?: SemanticTargetFileContext
}

/** Graph compilation options are the normal generation options. */
export interface GraphCompileOptions extends GenerateOptions {
	/** @deprecated Graph compilation derives validation wrappers from each artifact kind. */
	templateMode?: TemplateMode
	/**
	 * Stable caller-selected namespace for unresolved artifact input IDs.
	 *
	 * Supply distinct values when separately compiled instances of the same
	 * graph may later be merged. Omitting it derives a reproducible scope from
	 * the graph itself.
	 */
	compilationScope?: string
	/** Reject compilation when the active catalog does not match this digest. */
	expectedCatalogDigest?: string
	/** Reject compilation when executable template manifests differ from this digest. */
	expectedCatalogManifestDigest?: string
	/** Optional declarations or imports prepended during graph semantic validation. */
	semanticContext?: GraphSemanticContext
}

/** Options for the unified graph compiler. */
export interface ModeAwareGraphCompileOptions extends GraphCompileOptions {
	mode: GraphCompilationMode
}

/** Serialized input-port metadata without template implementation details. */
export type InputPortSummary =
	| LiteralInputPortSummary
	| FragmentInputPortSummary
	| FragmentCollectionInputPortSummary
	| RawCodeInputPortSummary
	| UnionInputPortSummary

export interface BasePortSummary {
	/** Summary discriminator matching the original port kind. */
	kind: string
	/** Whether the summarized input is required. */
	required: boolean
	/** Human-readable input description, when provided. */
	description?: string
}

export interface LiteralInputPortSummary extends BasePortSummary {
	/** Summary discriminator for literal ports. */
	kind: 'literal'
	/** Replacement region kind the literal feeds. */
	regionKind: RegionKind
	/** Supported JSON Schema used to validate literal values, when provided. */
	schema?: SupportedJsonSchema
}

export interface FragmentInputPortSummary extends BasePortSummary {
	/** Summary discriminator for fragment ports. */
	kind: 'fragment'
	/** Replacement region kind the referenced fragment feeds. */
	regionKind: RegionKind
	/** Fragment compatibility requirements. */
	accepts: {
		/** Required output kind of referenced fragments, resolved from the port default. */
		outputKind: RegionKind
		/** Type metadata referenced fragments must satisfy, when provided. */
		type?: TypeDescriptor
		/** Template model IDs allowed as fragment sources, when provided. */
		sourceModelIds?: string[]
	}
}

export interface FragmentCollectionInputPortSummary extends BasePortSummary {
	kind: 'fragmentCollection'
	regionKind: RegionKind
	accepts: FragmentInputPortSummary['accepts']
	separator: string
	minItems: number
	maxItems?: number
}

export interface RawCodeInputPortSummary extends BasePortSummary {
	/** Summary discriminator for raw-code ports. */
	kind: 'rawCode'
	/** Replacement region kind the raw code feeds. */
	regionKind: RegionKind
	/** Planner-facing raw-code restrictions, when provided. */
	policy?: RawCodePolicy
	/** Type metadata describing accepted raw code, when provided. */
	type?: TypeDescriptor
}

export interface UnionInputPortSummary extends BasePortSummary {
	/** Summary discriminator for union ports. */
	kind: 'union'
	/** Summaries of the concrete port options accepted by the union. */
	options: InputPortSummary[]
}

export interface OutputPortSummary {
	/** Syntactic region kind produced by the template. */
	kind: RegionKind
	/** Type metadata advertised by the template output, when provided. */
	type?: TypeDescriptor
	/** Deprecated schema alias advertised by the template output, when provided. */
	schema?: SupportedJsonSchema
	/** Human-readable output description, when provided. */
	description?: string
}
