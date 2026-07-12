import { Type, type Static, type TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

const RegionKindDefinition = Type.Union([
	Type.Literal('identifier'), Type.Literal('expression'), Type.Literal('expressionSuffix'),
	Type.Literal('statement'), Type.Literal('array'), Type.Literal('object'), Type.Literal('string'),
	Type.Literal('number'), Type.Literal('boolean'), Type.Literal('null'), Type.Literal('objectProperty')
])

const TypeDescriptorDefinition = Type.Object({
	ts: Type.Optional(Type.String()),
	schema: Type.Optional(Type.Unknown())
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
		templateId: Type.String(), templateVersion: Type.Optional(Type.String())
	}, { additionalProperties: false }),
	type: Type.Optional(Type.Ref('CompilationTypeDescriptor')),
	schema: Type.Optional(Type.Unknown()),
	provenance: Type.Optional(Type.Object({
		nodeId: Type.Optional(Type.String()), inputRefs: Type.Optional(Type.Array(Type.String())),
		literalInputs: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
	}, { additionalProperties: false })),
	diagnostics: Type.Optional(Type.Array(Type.Ref('SynthesisDiagnostic')))
} as const

const GraphContractModule = Type.Module({
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
		schema: Type.Optional(Type.Unknown())
	}, { additionalProperties: false }),
	SynthesisGraph: Type.Object({
		nodes: Type.Array(Type.Ref('SynthesisNode')),
		finalNodeId: Type.String(),
		goal: Type.Optional(Type.Ref('SynthesisGoal'))
	}, { additionalProperties: false })
})

const SummaryContractModule = Type.Module({
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
		description: Type.Optional(Type.String()), schema: Type.Optional(Type.Unknown())
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
		schema: Type.Optional(Type.Unknown()),
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
	CompilationRegionKind: RegionKindDefinition,
	CompilationTypeDescriptor: TypeDescriptorDefinition,
	CompilationRawCodePolicy: RawCodePolicyDefinition,
	SynthesisRepairHint: Type.Object({
		kind: Type.String(),
		message: Type.String()
	}, { additionalProperties: true }),
	SynthesisDiagnostic: Type.Object({
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
	}, { additionalProperties: false }),
	FragmentAccepts: FragmentAcceptsDefinition,
	InputPort: Type.Union([
		Type.Object({
			kind: Type.Literal('literal'), regionKind: Type.Ref('CompilationRegionKind'),
			required: Type.Optional(Type.Boolean()), description: Type.Optional(Type.String()),
			schema: Type.Optional(Type.Unknown())
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
	StrictGraphCompilationResult: Type.Union([
		Type.Object({
			kind: Type.Literal('graphCompilation'), mode: Type.Literal('strict'), ok: Type.Literal(true),
			finalArtifact: Type.Ref('CompleteTemplateArtifact'),
			artifacts: Type.Record(Type.String(), Type.Ref('CompleteTemplateArtifact')),
			diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic'))
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('graphCompilation'), mode: Type.Literal('strict'), ok: Type.Literal(false),
			diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic')),
			partialArtifacts: Type.Optional(Type.Record(Type.String(), Type.Ref('CompleteTemplateArtifact')))
		}, { additionalProperties: false })
	]),
	PartialGraphCompilationResult: Type.Union([
		Type.Object({
			kind: Type.Literal('graphCompilation'), mode: Type.Literal('partial'), ok: Type.Literal(true),
			finalArtifact: Type.Ref('TemplateArtifact'),
			artifacts: Type.Record(Type.String(), Type.Ref('TemplateArtifact')),
			diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic'))
		}, { additionalProperties: false }),
		Type.Object({
			kind: Type.Literal('graphCompilation'), mode: Type.Literal('partial'), ok: Type.Literal(false),
			diagnostics: Type.Array(Type.Ref('SynthesisDiagnostic')),
			partialArtifacts: Type.Optional(Type.Record(Type.String(), Type.Ref('TemplateArtifact')))
		}, { additionalProperties: false })
	]),
	GraphCompilationResult: Type.Union([
		Type.Ref('StrictGraphCompilationResult'), Type.Ref('PartialGraphCompilationResult')
	])
})

export const RegionKindSchema = GraphContractModule.Import('GraphRegionKind')
export const TypeDescriptorSchema = GraphContractModule.Import('GraphTypeDescriptor')
export const SynthesisInputSchema = GraphContractModule.Import('SynthesisInput')
export const SynthesisGraphSchema = GraphContractModule.Import('SynthesisGraph')

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
export const InputPortSchema = CompilationContractModule.Import('InputPort')
export const GeneratedFragmentSchema = CompilationContractModule.Import('GeneratedFragment')
export const CompleteTemplateArtifactSchema = CompilationContractModule.Import('CompleteTemplateArtifact')
export const PartialTemplateArtifactSchema = CompilationContractModule.Import('PartialTemplateArtifact')
export const TemplateArtifactSchema = CompilationContractModule.Import('TemplateArtifact')
export const TemplateArtifactInputSchema = CompilationContractModule.Import('TemplateArtifactInput')
export const TemplateArtifactInputMapSchema = Type.Record(Type.String(), TemplateArtifactInputSchema)
export const StrictGraphCompilationResultSchema = CompilationContractModule.Import('StrictGraphCompilationResult')
export const PartialGraphCompilationResultSchema = CompilationContractModule.Import('PartialGraphCompilationResult')
export const GraphCompilationResultSchema = CompilationContractModule.Import('GraphCompilationResult')

export type ContractGeneratedFragment = Static<typeof GeneratedFragmentSchema>
export type ContractCompleteTemplateArtifact = Static<typeof CompleteTemplateArtifactSchema>
export type ContractPartialTemplateArtifact = Static<typeof PartialTemplateArtifactSchema>
export type ContractSynthesisGraph = Static<typeof SynthesisGraphSchema>
export type ContractTemplateSummary = Static<typeof TemplateSummarySchema>
export type ContractGraphCompilationResult = Static<typeof GraphCompilationResultSchema>

export const checkContract = <TSchemaType extends TSchema>(schema: TSchemaType, value: unknown): value is Static<TSchemaType> =>
	Value.Check(schema, value)
