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
