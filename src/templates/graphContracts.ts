import { Type, type Static, type TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

export const RegionKindSchema = Type.Union([
	Type.Literal('identifier'), Type.Literal('expression'), Type.Literal('expressionSuffix'),
	Type.Literal('statement'), Type.Literal('array'), Type.Literal('object'), Type.Literal('string'),
	Type.Literal('number'), Type.Literal('boolean'), Type.Literal('null'), Type.Literal('objectProperty')
])

export const TypeDescriptorSchema = Type.Object({
	ts: Type.Optional(Type.String()),
	schema: Type.Optional(Type.Unknown())
}, { additionalProperties: false })

export const SynthesisDiagnosticSchema = Type.Object({
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
	repairHints: Type.Optional(Type.Array(Type.Object({
		kind: Type.String(),
		message: Type.String()
	}, { additionalProperties: true })))
}, { additionalProperties: false })

export const InputPortSchema: TSchema = Type.Recursive(Self => Type.Union([
	Type.Object({
		kind: Type.Literal('literal'), regionKind: RegionKindSchema,
		required: Type.Optional(Type.Boolean()), description: Type.Optional(Type.String()),
		schema: Type.Optional(Type.Unknown())
	}, { additionalProperties: false }),
	Type.Object({
		kind: Type.Literal('fragment'), regionKind: RegionKindSchema,
		required: Type.Optional(Type.Boolean()), description: Type.Optional(Type.String()),
		accepts: Type.Object({
			outputKind: Type.Optional(RegionKindSchema), type: Type.Optional(TypeDescriptorSchema),
			sourceModelIds: Type.Optional(Type.Array(Type.String()))
		}, { additionalProperties: false })
	}, { additionalProperties: false }),
	Type.Object({
		kind: Type.Literal('rawCode'), regionKind: RegionKindSchema,
		required: Type.Optional(Type.Boolean()), description: Type.Optional(Type.String()),
		policy: Type.Optional(Type.Object({
			description: Type.Optional(Type.String()), maxLength: Type.Optional(Type.Number()),
			allowNewlines: Type.Optional(Type.Boolean()), forbiddenSubstrings: Type.Optional(Type.Array(Type.String())),
			forbiddenPatterns: Type.Optional(Type.Array(Type.String()))
		}, { additionalProperties: false })),
		type: Type.Optional(TypeDescriptorSchema)
	}, { additionalProperties: false }),
	Type.Object({
		kind: Type.Literal('union'), required: Type.Optional(Type.Boolean()),
		description: Type.Optional(Type.String()), options: Type.Array(Self)
	}, { additionalProperties: false })
]))

const FragmentFields = {
	id: Type.Optional(Type.String()), code: Type.String(), kind: RegionKindSchema,
	source: Type.Object({ templateId: Type.String(), templateVersion: Type.Optional(Type.String()) }, { additionalProperties: false }),
	type: Type.Optional(TypeDescriptorSchema), schema: Type.Optional(Type.Unknown()),
	provenance: Type.Optional(Type.Object({
		nodeId: Type.Optional(Type.String()), inputRefs: Type.Optional(Type.Array(Type.String())),
		literalInputs: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
	}, { additionalProperties: false })),
	diagnostics: Type.Optional(Type.Array(SynthesisDiagnosticSchema))
} as const

export const GeneratedFragmentSchema = Type.Object(FragmentFields, { additionalProperties: false })

export const CompleteTemplateArtifactSchema = Type.Object({
	...FragmentFields,
	complete: Type.Literal(true)
}, { additionalProperties: false })

export const PartialTemplateArtifactSchema = Type.Object({
	...FragmentFields,
	complete: Type.Literal(false),
	unresolvedInputs: Type.Array(Type.Object({
		id: Type.String(), inputName: Type.String(), nodeId: Type.Optional(Type.String()),
		templateId: Type.String(), port: InputPortSchema, path: Type.Optional(Type.String())
	}, { additionalProperties: false }))
}, { additionalProperties: false })

export const TemplateArtifactSchema = Type.Union([CompleteTemplateArtifactSchema, PartialTemplateArtifactSchema])

export const TemplateArtifactInputSchema = Type.Union([
	Type.Object({ kind: Type.Literal('literal'), value: Type.Unknown() }, { additionalProperties: false }),
	Type.Object({ kind: Type.Literal('rawCode'), code: Type.String() }, { additionalProperties: false }),
	Type.Object({ kind: Type.Literal('fragment'), fragment: TemplateArtifactSchema }, { additionalProperties: false })
])

export const TemplateArtifactInputMapSchema = Type.Record(Type.String(), TemplateArtifactInputSchema)

export const SynthesisInputSchema: TSchema = Type.Recursive(Self => Type.Union([
	Type.Object({ kind: Type.Literal('literal'), value: Type.Unknown() }, { additionalProperties: false }),
	Type.Object({ kind: Type.Literal('ref'), nodeId: Type.String() }, { additionalProperties: false }),
	Type.Object({ kind: Type.Literal('rawCode'), code: Type.String() }, { additionalProperties: false }),
	Type.Object({ $ref: Type.String() }, { additionalProperties: false }),
	Type.Object({ kind: Type.Literal('inline'), node: Type.Object({
		id: Type.String(), templateId: Type.String(), inputs: Type.Record(Type.String(), Self)
	}, { additionalProperties: false }) }, { additionalProperties: false })
]))

export const SynthesisGraphSchema = Type.Object({
	nodes: Type.Array(Type.Object({
		id: Type.String(), templateId: Type.String(), inputs: Type.Record(Type.String(), SynthesisInputSchema)
	}, { additionalProperties: false })),
	finalNodeId: Type.String(),
	goal: Type.Optional(Type.Object({
		outputKind: Type.Optional(RegionKindSchema), type: Type.Optional(TypeDescriptorSchema),
		schema: Type.Optional(Type.Unknown())
	}, { additionalProperties: false }))
}, { additionalProperties: false })

const GraphCompilationFailureFields = {
	kind: Type.Literal('graphCompilation'),
	ok: Type.Literal(false),
	diagnostics: Type.Array(SynthesisDiagnosticSchema)
} as const

export const StrictGraphCompilationResultSchema = Type.Union([
	Type.Object({
		kind: Type.Literal('graphCompilation'), mode: Type.Literal('strict'), ok: Type.Literal(true),
		finalArtifact: CompleteTemplateArtifactSchema,
		artifacts: Type.Record(Type.String(), CompleteTemplateArtifactSchema),
		diagnostics: Type.Array(SynthesisDiagnosticSchema)
	}, { additionalProperties: false }),
	Type.Object({
		...GraphCompilationFailureFields, mode: Type.Literal('strict'),
		partialArtifacts: Type.Optional(Type.Record(Type.String(), CompleteTemplateArtifactSchema))
	}, { additionalProperties: false })
])

export const PartialGraphCompilationResultSchema = Type.Union([
	Type.Object({
		kind: Type.Literal('graphCompilation'), mode: Type.Literal('partial'), ok: Type.Literal(true),
		finalArtifact: TemplateArtifactSchema,
		artifacts: Type.Record(Type.String(), TemplateArtifactSchema),
		diagnostics: Type.Array(SynthesisDiagnosticSchema)
	}, { additionalProperties: false }),
	Type.Object({
		...GraphCompilationFailureFields, mode: Type.Literal('partial'),
		partialArtifacts: Type.Optional(Type.Record(Type.String(), TemplateArtifactSchema))
	}, { additionalProperties: false })
])

export const GraphCompilationResultSchema = Type.Union([
	StrictGraphCompilationResultSchema,
	PartialGraphCompilationResultSchema
])

export type ContractGeneratedFragment = Static<typeof GeneratedFragmentSchema>
export type ContractCompleteTemplateArtifact = Static<typeof CompleteTemplateArtifactSchema>
export type ContractPartialTemplateArtifact = Static<typeof PartialTemplateArtifactSchema>
export type ContractSynthesisGraph = Static<typeof SynthesisGraphSchema>
export type ContractGraphCompilationResult = Static<typeof GraphCompilationResultSchema>

export const checkContract = <TSchemaType extends TSchema>(schema: TSchemaType, value: unknown): value is Static<TSchemaType> =>
	Value.Check(schema, value)
