import { isMatching, P } from 'ts-pattern'
import {
	CompleteTemplateArtifactSchema,
	PartialTemplateArtifactSchema,
	SynthesisGraphSchema,
	checkContract
} from './graphContracts.js'
import type {
	CompleteTemplateArtifact,
	FragmentInputPort,
	FragmentCollectionInputPort,
	GeneratedFragment,
	GraphCompilationResult,
	GraphPartialCompilationResult,
	GraphTemplateDefinition,
	InputPort,
	LiteralInputPort,
	NormalizedSynthesisInput,
	OutputPort,
	PartialTemplateArtifact,
	RawCodeInputPort,
	RegionKind,
	ResolvedGraphInput,
	SynthesisDiagnostic,
	SynthesisGoal,
	SynthesisGraph,
	SynthesisInput,
	SynthesisNode,
	SynthesisRepairHint,
	TemplateArtifact,
	TemplateArtifactInput,
	TemplateArtifactResult,
	TypeDescriptor,
	UnionInputPort,
	UnresolvedTemplateInput
} from './graphTypes.js'

/** Runtime `ts-pattern` pattern for supported graph region kinds. */
export const regionKindPattern: P.Pattern<RegionKind> = P.union(
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
	'objectProperty'
) satisfies P.Pattern<RegionKind>

/** Runtime `ts-pattern` pattern for graph type metadata. */
export const typeDescriptorPattern: P.Pattern<TypeDescriptor> = {
	ts: P.optional(P.string),
	schema: P.optional(P._)
} satisfies P.Pattern<TypeDescriptor>

/** Runtime `ts-pattern` pattern for planner-facing repair hints. */
export const synthesisRepairHintPattern: P.Pattern<SynthesisRepairHint> = {
	kind: P.string,
	message: P.string
} satisfies P.Pattern<SynthesisRepairHint>

/** Runtime `ts-pattern` pattern for graph diagnostic objects. */
export const synthesisDiagnosticPattern: P.Pattern<SynthesisDiagnostic> = {
	stage: P.union('graph', 'template', 'input', 'port', 'region', 'ast', 'type', 'policy'),
	code: P.string,
	severity: P.union('error', 'warning'),
	message: P.string,
	nodeId: P.optional(P.string),
	templateId: P.optional(P.string),
	inputName: P.optional(P.string),
	path: P.optional(P.string),
	expected: P.optional(P._),
	actual: P.optional(P._),
	repairHints: P.optional(P.array(synthesisRepairHintPattern)),
	compilerCode: P.optional(P.number),
	compilerCategory: P.optional(P.union('error', 'warning', 'suggestion', 'message')),
	line: P.optional(P.number),
	column: P.optional(P.number)
} satisfies P.Pattern<SynthesisDiagnostic>

const synthesisDiagnosticsPattern = P.array(synthesisDiagnosticPattern)

const inputPortMetadataPattern = {
	required: P.optional(P.boolean),
	description: P.optional(P.string)
}

type GuardPattern<T> = ReturnType<typeof P.when<unknown, (value: unknown) => value is T>>

type GeneratedFragmentDiscriminatingObjectPattern = {
	code: P.Pattern<string>
	kind: P.Pattern<RegionKind>
	source: P.Pattern<GeneratedFragment['source']>
}

type CompleteTemplateArtifactObjectPattern = GeneratedFragmentDiscriminatingObjectPattern & {
	complete?: P.Pattern<true | undefined>
}

type PartialTemplateArtifactObjectPattern = GeneratedFragmentDiscriminatingObjectPattern & {
	complete: false
	unresolvedInputs: GuardPattern<UnresolvedTemplateInput[]>
}

type GraphCompilationSuccessObjectPattern = {
	kind: 'graphCompilation'
	mode: 'strict'
	ok: true
	finalArtifact: GuardPattern<CompleteTemplateArtifact>
	artifacts: P.Pattern<Record<string, TemplateArtifact>>
	diagnostics: P.Pattern<SynthesisDiagnostic[]>
}

type GraphCompilationFailureObjectPattern = {
	kind: 'graphCompilation'
	mode: 'strict'
	ok: false
	diagnostics: P.Pattern<SynthesisDiagnostic[]>
	partialArtifacts?: P.Pattern<Record<string, TemplateArtifact> | undefined>
}

type GraphPartialCompilationSuccessObjectPattern = {
	kind: 'graphCompilation'
	mode: 'partial'
	ok: true
	finalArtifact: GuardPattern<TemplateArtifact>
	artifacts: P.Pattern<Record<string, TemplateArtifact>>
	diagnostics: P.Pattern<SynthesisDiagnostic[]>
}

type GraphPartialCompilationCompleteSuccess = Extract<GraphPartialCompilationResult, { ok: true }> & {
	finalArtifact: CompleteTemplateArtifact & { complete: true }
}

type GraphPartialCompilationFailureObjectPattern = {
	kind: 'graphCompilation'
	mode: 'partial'
	ok: false
	diagnostics: P.Pattern<SynthesisDiagnostic[]>
	partialArtifacts?: P.Pattern<Record<string, TemplateArtifact> | undefined>
}

type TemplateArtifactSuccessObjectPattern = {
	kind: 'templateArtifact'
	ok: true
	artifact: GuardPattern<TemplateArtifact>
	diagnostics: P.Pattern<SynthesisDiagnostic[]>
}

type TemplateArtifactCompleteSuccess = Extract<TemplateArtifactResult, { ok: true }> & {
	artifact: CompleteTemplateArtifact
}

type TemplateArtifactFailureObjectPattern = {
	kind: 'templateArtifact'
	ok: false
	diagnostics: P.Pattern<SynthesisDiagnostic[]>
}

/** Runtime `ts-pattern` pattern for literal input ports. */
export const literalInputPortPattern: P.Pattern<LiteralInputPort> = {
	kind: 'literal',
	regionKind: regionKindPattern,
	schema: P.optional(P._),
	...inputPortMetadataPattern
} satisfies P.Pattern<LiteralInputPort>

/** Runtime `ts-pattern` pattern for fragment input ports. */
export const fragmentInputPortPattern: P.Pattern<FragmentInputPort> = {
	kind: 'fragment',
	regionKind: regionKindPattern,
	accepts: {
		outputKind: P.optional(regionKindPattern),
		type: P.optional(typeDescriptorPattern),
		sourceModelIds: P.optional(P.array(P.string))
	},
	...inputPortMetadataPattern
} satisfies P.Pattern<FragmentInputPort>

export const fragmentCollectionInputPortPattern: P.Pattern<FragmentCollectionInputPort> = {
	kind: 'fragmentCollection',
	regionKind: regionKindPattern,
	accepts: {
		outputKind: P.optional(regionKindPattern),
		type: P.optional(typeDescriptorPattern),
		sourceModelIds: P.optional(P.array(P.string))
	},
	separator: P.optional(P.string),
	minItems: P.optional(P.number),
	maxItems: P.optional(P.number),
	...inputPortMetadataPattern
} satisfies P.Pattern<FragmentCollectionInputPort>

/** Runtime `ts-pattern` pattern for raw-code input ports. */
export const rawCodeInputPortPattern: P.Pattern<RawCodeInputPort> = {
	kind: 'rawCode',
	regionKind: regionKindPattern,
	policy: P.optional({
		description: P.optional(P.string),
		maxLength: P.optional(P.number),
		allowNewlines: P.optional(P.boolean),
		forbiddenSubstrings: P.optional(P.array(P.string)),
		forbiddenPatterns: P.optional(P.array(P.string))
	}),
	type: P.optional(typeDescriptorPattern),
	...inputPortMetadataPattern
} satisfies P.Pattern<RawCodeInputPort>

/** Runtime `ts-pattern` pattern for union input ports. */
export const unionInputPortPattern: P.Pattern<UnionInputPort> = {
	kind: 'union',
	options: P.when((value): value is InputPort[] => Array.isArray(value) && value.every(isInputPort)),
	...inputPortMetadataPattern
} satisfies P.Pattern<UnionInputPort>

/** Runtime `ts-pattern` pattern for any graph input port. */
export const inputPortPattern: P.Pattern<InputPort> = P.union(
	literalInputPortPattern,
	fragmentInputPortPattern,
	fragmentCollectionInputPortPattern,
	rawCodeInputPortPattern,
	unionInputPortPattern
) satisfies P.Pattern<InputPort>

/** Runtime type guard for input ports. */
export function isInputPort(value: unknown): value is InputPort {
	return isMatching(inputPortPattern, value)
}

/** Runtime `ts-pattern` pattern for template output ports. */
export const outputPortPattern: P.Pattern<OutputPort> = {
	kind: regionKindPattern,
	type: P.optional(typeDescriptorPattern),
	schema: P.optional(P._),
	description: P.optional(P.string)
} satisfies P.Pattern<OutputPort>

/** Runtime `ts-pattern` pattern for graph fragment source metadata. */
export const generatedFragmentSourcePattern: P.Pattern<GeneratedFragment['source']> = {
	templateId: P.string,
	templateVersion: P.optional(P.string)
} satisfies P.Pattern<GeneratedFragment['source']>

/** Runtime `ts-pattern` pattern for fragment provenance metadata. */
export const generatedFragmentProvenancePattern: P.Pattern<NonNullable<GeneratedFragment['provenance']>> = {
	nodeId: P.optional(P.string),
	inputRefs: P.optional(P.array(P.string)),
	literalInputs: P.optional(P._)
} satisfies P.Pattern<NonNullable<GeneratedFragment['provenance']>>

/** Runtime `ts-pattern` pattern for generated graph fragments. */
export const generatedFragmentPattern: P.Pattern<GeneratedFragment> = {
	id: P.optional(P.string),
	code: P.string,
	kind: regionKindPattern,
	source: generatedFragmentSourcePattern,
	type: P.optional(typeDescriptorPattern),
	schema: P.optional(P._),
	provenance: P.optional(generatedFragmentProvenancePattern),
	diagnostics: P.optional(synthesisDiagnosticsPattern)
} satisfies P.Pattern<GeneratedFragment>

/** Runtime `ts-pattern` pattern for unresolved partial-artifact inputs. */
export const unresolvedTemplateInputPattern: P.Pattern<UnresolvedTemplateInput> = {
	id: P.string,
	inputName: P.string,
	nodeId: P.optional(P.string),
	templateId: P.string,
	port: inputPortPattern,
	path: P.optional(P.string)
} satisfies P.Pattern<UnresolvedTemplateInput>

const unresolvedTemplateInputArrayPattern: GuardPattern<UnresolvedTemplateInput[]> = P.when((value): value is UnresolvedTemplateInput[] =>
	Array.isArray(value) && value.every((entry) => isMatching(unresolvedTemplateInputPattern, entry))
)

const completeTemplateArtifactShapePattern: P.Pattern<TemplateArtifact> = {
	...generatedFragmentPattern,
	complete: true
} satisfies P.Pattern<TemplateArtifact>

/** Runtime `ts-pattern` pattern for complete template artifacts. */
export const completeTemplateArtifactPattern: GuardPattern<CompleteTemplateArtifact> = P.when(
	(value): value is CompleteTemplateArtifact => checkContract(CompleteTemplateArtifactSchema, value)
)

const partialTemplateArtifactShapePattern: P.Pattern<PartialTemplateArtifact> = {
	...generatedFragmentPattern,
	complete: false,
	unresolvedInputs: unresolvedTemplateInputArrayPattern
} satisfies P.Pattern<PartialTemplateArtifact>

/** Runtime `ts-pattern` pattern for partial template artifacts. */
export const partialTemplateArtifactPattern: GuardPattern<PartialTemplateArtifact> = P.when(
	(value): value is PartialTemplateArtifact => checkContract(PartialTemplateArtifactSchema, value)
)

export function isTemplateArtifactInputMap(inputs: unknown) {
	return isMatching(P.record(P.string, templateArtifactInputPattern), inputs)
}

/** Runtime `ts-pattern` pattern for either complete or partial artifacts. */
export const templateArtifactPattern: P.Pattern<TemplateArtifact> = P.union(
	completeTemplateArtifactPattern,
	partialTemplateArtifactPattern
) satisfies P.Pattern<TemplateArtifact>

/** Runtime type guard for complete or partial template artifacts. */
export function isTemplateArtifact(value: unknown): value is TemplateArtifact {
	return isMatching(templateArtifactPattern, value)
}

const templateArtifactGuardPattern: GuardPattern<TemplateArtifact> = P.when(isTemplateArtifact)

/** Runtime `ts-pattern` pattern for literal values used to fill unresolved artifact inputs. */
export const literalTemplateArtifactInputPattern: P.Pattern<Extract<TemplateArtifactInput, { kind: 'literal' }>> = {
	kind: 'literal',
	value: P._
} satisfies P.Pattern<Extract<TemplateArtifactInput, { kind: 'literal' }>>

/** Runtime `ts-pattern` pattern for raw code used to fill unresolved artifact inputs. */
export const rawCodeTemplateArtifactInputPattern: P.Pattern<Extract<TemplateArtifactInput, { kind: 'rawCode' }>> = {
	kind: 'rawCode',
	code: P.string
} satisfies P.Pattern<Extract<TemplateArtifactInput, { kind: 'rawCode' }>>

/** Runtime `ts-pattern` pattern for fragments used to fill unresolved artifact inputs. */
export const fragmentTemplateArtifactInputPattern: P.Pattern<Extract<TemplateArtifactInput, { kind: 'fragment' }>> = {
	kind: 'fragment',
	fragment: P.when(isTemplateArtifact)
} satisfies P.Pattern<Extract<TemplateArtifactInput, { kind: 'fragment' }>>

export const fragmentCollectionTemplateArtifactInputPattern: P.Pattern<Extract<TemplateArtifactInput, { kind: 'fragmentCollection' }>> = {
	kind: 'fragmentCollection',
	fragments: P.array(P.when(isTemplateArtifact))
} satisfies P.Pattern<Extract<TemplateArtifactInput, { kind: 'fragmentCollection' }>>

/** Runtime `ts-pattern` pattern for values used to fill unresolved artifact inputs. */
export const templateArtifactInputPattern: P.Pattern<TemplateArtifactInput> = P.union(
	literalTemplateArtifactInputPattern,
	rawCodeTemplateArtifactInputPattern,
	fragmentTemplateArtifactInputPattern,
	fragmentCollectionTemplateArtifactInputPattern
) satisfies P.Pattern<TemplateArtifactInput>

/** Runtime `ts-pattern` pattern for resolved literal graph inputs. */
export const resolvedLiteralGraphInputPattern: P.Pattern<Extract<ResolvedGraphInput, { kind: 'literal' }>> = {
	kind: 'literal',
	value: P._,
	port: literalInputPortPattern
} satisfies P.Pattern<Extract<ResolvedGraphInput, { kind: 'literal' }>>

/** Runtime `ts-pattern` pattern for resolved fragment graph inputs. */
export const resolvedFragmentGraphInputPattern: P.Pattern<Extract<ResolvedGraphInput, { kind: 'fragment' }>> = {
	kind: 'fragment',
	fragment: templateArtifactPattern,
	port: fragmentInputPortPattern
} satisfies P.Pattern<Extract<ResolvedGraphInput, { kind: 'fragment' }>>

export const resolvedFragmentCollectionGraphInputPattern: P.Pattern<Extract<ResolvedGraphInput, { kind: 'fragmentCollection' }>> = {
	kind: 'fragmentCollection',
	fragments: P.array(templateArtifactPattern),
	port: fragmentCollectionInputPortPattern
} satisfies P.Pattern<Extract<ResolvedGraphInput, { kind: 'fragmentCollection' }>>

/** Runtime `ts-pattern` pattern for resolved raw-code graph inputs. */
export const resolvedRawCodeGraphInputPattern: P.Pattern<Extract<ResolvedGraphInput, { kind: 'rawCode' }>> = {
	kind: 'rawCode',
	code: P.string,
	port: rawCodeInputPortPattern
} satisfies P.Pattern<Extract<ResolvedGraphInput, { kind: 'rawCode' }>>

/** Runtime `ts-pattern` pattern for any resolved graph input. */
export const resolvedGraphInputPattern: P.Pattern<ResolvedGraphInput> = P.union(
	resolvedLiteralGraphInputPattern,
	resolvedFragmentGraphInputPattern,
	resolvedFragmentCollectionGraphInputPattern,
	resolvedRawCodeGraphInputPattern
) satisfies P.Pattern<ResolvedGraphInput>

/** Runtime `ts-pattern` pattern for final graph constraints. */
export const synthesisGoalPattern: P.Pattern<SynthesisGoal> = {
	outputKind: P.optional(regionKindPattern),
	type: P.optional(typeDescriptorPattern),
	schema: P.optional(P._)
} satisfies P.Pattern<SynthesisGoal>

/** Runtime `ts-pattern` pattern for authored literal graph inputs. */
export const literalSynthesisInputPattern = literalTemplateArtifactInputPattern as unknown as P.Pattern<
	Extract<SynthesisInput, { kind: 'literal' }>
>

/** Runtime `ts-pattern` pattern for authored graph node references. */
export const refSynthesisInputPattern: P.Pattern<Extract<SynthesisInput, { kind: 'ref' }>> = {
	kind: 'ref',
	nodeId: P.string
} satisfies P.Pattern<Extract<SynthesisInput, { kind: 'ref' }>>

/** Runtime `ts-pattern` pattern for authored raw-code graph inputs. */
export const rawCodeSynthesisInputPattern = rawCodeTemplateArtifactInputPattern as unknown as P.Pattern<
	Extract<SynthesisInput, { kind: 'rawCode' }>
>

/** Runtime `ts-pattern` pattern for authored inline graph inputs. */
export const inlineSynthesisInputPattern: P.Pattern<Extract<SynthesisInput, { kind: 'inline' }>> = {
	kind: 'inline',
	node: P.when(isSynthesisNode)
} satisfies P.Pattern<Extract<SynthesisInput, { kind: 'inline' }>>

/** Runtime `ts-pattern` pattern for authored shorthand graph references. */
export const refShorthandSynthesisInputPattern: P.Pattern<Extract<SynthesisInput, { $ref: string }>> = {
	$ref: P.string
} satisfies P.Pattern<Extract<SynthesisInput, { $ref: string }>>

export const fragmentCollectionSynthesisInputPattern: P.Pattern<Extract<SynthesisInput, { kind: 'fragmentCollection' }>> = {
	kind: 'fragmentCollection',
	items: P.array(P.union(refSynthesisInputPattern, inlineSynthesisInputPattern, refShorthandSynthesisInputPattern))
} satisfies P.Pattern<Extract<SynthesisInput, { kind: 'fragmentCollection' }>>

const normalizedFragmentCollectionSynthesisInputPattern: P.Pattern<Extract<NormalizedSynthesisInput, { kind: 'fragmentCollection' }>> = {
	kind: 'fragmentCollection',
	items: P.array(refSynthesisInputPattern)
} satisfies P.Pattern<Extract<NormalizedSynthesisInput, { kind: 'fragmentCollection' }>>

/** Runtime `ts-pattern` pattern for graph inputs after normalization. */
export const normalizedSynthesisInputPattern: P.Pattern<NormalizedSynthesisInput> = P.union(
	literalSynthesisInputPattern,
	refSynthesisInputPattern,
	rawCodeSynthesisInputPattern,
	normalizedFragmentCollectionSynthesisInputPattern
) satisfies P.Pattern<NormalizedSynthesisInput>

/** Runtime `ts-pattern` pattern for any authored graph input. */
export const synthesisInputPattern: P.Pattern<SynthesisInput> = P.union(
	normalizedSynthesisInputPattern,
	fragmentCollectionSynthesisInputPattern,
	inlineSynthesisInputPattern,
	refShorthandSynthesisInputPattern
) satisfies P.Pattern<SynthesisInput>

/** Return true when a value is a non-null, non-array object. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Return true when a value is a string-keyed record whose values pass a guard. */
function recordWithValues<TValue>(
	value: unknown,
	matchesValue: (entryValue: unknown) => entryValue is TValue
): value is Record<string, TValue> {
	return isPlainRecord(value) && Object.values(value).every(matchesValue)
}

/** Runtime `ts-pattern` pattern for synthesis graph nodes. */
export const synthesisNodePattern: P.Pattern<SynthesisNode> = {
	id: P.string,
	templateId: P.string,
	inputs: P.when((value): value is Record<string, SynthesisInput> =>
		recordWithValues(value, (entryValue): entryValue is SynthesisInput =>
			isMatching(synthesisInputPattern, entryValue)
		)
	)
} satisfies P.Pattern<SynthesisNode>

/** Runtime type guard for synthesis graph nodes. */
export function isSynthesisNode(value: unknown): value is SynthesisNode {
	return isMatching(synthesisNodePattern, value)
}

const synthesisGraphShapePattern: P.Pattern<SynthesisGraph> = {
	nodes: P.array(synthesisNodePattern),
	finalNodeId: P.string,
	goal: P.optional(synthesisGoalPattern)
} satisfies P.Pattern<SynthesisGraph>

/** Runtime `ts-pattern` pattern for synthesis graphs. */
export const synthesisGraphPattern: GuardPattern<SynthesisGraph> = P.when((value): value is SynthesisGraph =>
	checkContract(SynthesisGraphSchema, value)
)

export type AnyTemplateCatalog = readonly GraphTemplateDefinition<any, string, any>[]

/** Runtime `ts-pattern` pattern for graphs returned by `defineGraph`. */
export const definedSynthesisGraphPattern: typeof synthesisGraphPattern = synthesisGraphPattern

/** Runtime `ts-pattern` pattern for compile-time checked authored graphs. */
export const strictSynthesisGraphPattern: typeof synthesisGraphPattern = synthesisGraphPattern

/** Runtime type guard for synthesis graphs. */
export function isSynthesisGraph(value: unknown): value is SynthesisGraph {
	return isMatching(synthesisGraphPattern, value)
}

/** Return true when a value is a string-keyed map whose values pass a guard. */
function recordResultWithValues<TValue>(
	value: unknown,
	matchesValue: (entryValue: unknown) => entryValue is TValue
): value is Record<string, TValue> {
	return isPlainRecord(value) && Object.values(value).every(matchesValue)
}

/** Runtime `ts-pattern` pattern for fragment records in strict graph results. */
export const generatedFragmentRecordPattern: P.Pattern<Record<string, GeneratedFragment>> = P.when(
	(value): value is Record<string, GeneratedFragment> =>
		recordResultWithValues(value, (entryValue): entryValue is GeneratedFragment =>
			isMatching(generatedFragmentPattern, entryValue)
		)
)

/** Runtime `ts-pattern` pattern for artifact records in partial graph results. */
export const templateArtifactRecordPattern: P.Pattern<Record<string, TemplateArtifact>> = P.when(
	(value): value is Record<string, TemplateArtifact> => recordResultWithValues(value, isTemplateArtifact)
)

const graphCompilationSuccessShapePattern: P.Pattern<Extract<GraphCompilationResult, { ok: true }>> = {
	kind: 'graphCompilation',
	mode: 'strict',
	ok: true,
	finalArtifact: completeTemplateArtifactPattern,
	artifacts: templateArtifactRecordPattern,
	diagnostics: synthesisDiagnosticsPattern
} satisfies P.Pattern<Extract<GraphCompilationResult, { ok: true }>>

/** Runtime `ts-pattern` pattern for successful strict graph compilation. */
export const graphCompilationSuccessPattern: GuardPattern<Extract<GraphCompilationResult, { ok: true }>> = P.when(
	(value): value is Extract<GraphCompilationResult, { ok: true }> =>
		isMatching(graphCompilationSuccessShapePattern, value)
)

const graphCompilationFailureShapePattern: P.Pattern<Extract<GraphCompilationResult, { ok: false }>> = {
	kind: 'graphCompilation',
	mode: 'strict',
	ok: false,
	diagnostics: synthesisDiagnosticsPattern,
	partialArtifacts: P.optional(templateArtifactRecordPattern)
} satisfies P.Pattern<Extract<GraphCompilationResult, { ok: false }>>

/** Runtime `ts-pattern` pattern for failed strict graph compilation. */
export const graphCompilationFailurePattern: GuardPattern<Extract<GraphCompilationResult, { ok: false }>> = P.when(
	(value): value is Extract<GraphCompilationResult, { ok: false }> =>
		isMatching(graphCompilationFailureShapePattern, value)
)

/** Runtime `ts-pattern` pattern for strict graph compilation results. */
export const graphCompilationResultPattern: P.Pattern<GraphCompilationResult> = P.union(
	graphCompilationSuccessPattern,
	graphCompilationFailurePattern
) satisfies P.Pattern<GraphCompilationResult>

/** Runtime type guard for strict graph compilation results. */
export function isGraphCompilationResult(value: unknown): value is GraphCompilationResult {
	return isMatching(graphCompilationResultPattern, value)
}

const graphPartialCompilationSuccessShapePattern: P.Pattern<Extract<GraphPartialCompilationResult, { ok: true }>> = {
	kind: 'graphCompilation',
	mode: 'partial',
	ok: true,
	finalArtifact: templateArtifactGuardPattern,
	artifacts: templateArtifactRecordPattern,
	diagnostics: synthesisDiagnosticsPattern
} satisfies P.Pattern<Extract<GraphPartialCompilationResult, { ok: true }>>

/** Runtime `ts-pattern` pattern for successful partial graph compilation. */
export const graphPartialCompilationSuccessPattern: GuardPattern<Extract<GraphPartialCompilationResult, { ok: true }>> =
	P.when((value): value is Extract<GraphPartialCompilationResult, { ok: true }> =>
		isMatching(graphPartialCompilationSuccessShapePattern, value)
	)

/** Runtime `ts-pattern` pattern for successful partial graph compilation with an explicitly complete final artifact. */
export const graphPartialCompilationCompleteSuccessPattern: GuardPattern<GraphPartialCompilationCompleteSuccess> =
	P.when((value): value is GraphPartialCompilationCompleteSuccess =>
		isMatching(graphPartialCompilationSuccessShapePattern, value) && value.finalArtifact.complete === true
	)

const graphPartialCompilationFailureShapePattern: P.Pattern<Extract<GraphPartialCompilationResult, { ok: false }>> = {
	kind: 'graphCompilation',
	mode: 'partial',
	ok: false,
	diagnostics: synthesisDiagnosticsPattern,
	partialArtifacts: P.optional(templateArtifactRecordPattern)
} satisfies P.Pattern<Extract<GraphPartialCompilationResult, { ok: false }>>

/** Runtime `ts-pattern` pattern for failed partial graph compilation. */
export const graphPartialCompilationFailurePattern: GuardPattern<Extract<GraphPartialCompilationResult, { ok: false }>> =
	P.when((value): value is Extract<GraphPartialCompilationResult, { ok: false }> =>
		isMatching(graphPartialCompilationFailureShapePattern, value)
	)

/** Runtime `ts-pattern` pattern for partial graph compilation results. */
export const graphPartialCompilationResultPattern: P.Pattern<GraphPartialCompilationResult> = P.union(
	graphPartialCompilationSuccessPattern,
	graphPartialCompilationFailurePattern
) satisfies P.Pattern<GraphPartialCompilationResult>

/** Runtime type guard for partial graph compilation results. */
export function isGraphPartialCompilationResult(value: unknown): value is GraphPartialCompilationResult {
	return isMatching(graphPartialCompilationResultPattern, value)
}

const templateArtifactSuccessShapePattern: P.Pattern<Extract<TemplateArtifactResult, { ok: true }>> = {
	kind: 'templateArtifact',
	ok: true,
	artifact: templateArtifactGuardPattern,
	diagnostics: synthesisDiagnosticsPattern
} satisfies P.Pattern<Extract<TemplateArtifactResult, { ok: true }>>

/** Runtime `ts-pattern` pattern for successful artifact fill/finalize results. */
export const templateArtifactSuccessPattern: GuardPattern<Extract<TemplateArtifactResult, { ok: true }>> = P.when(
	(value): value is Extract<TemplateArtifactResult, { ok: true }> =>
		isMatching(templateArtifactSuccessShapePattern, value)
)

const templateArtifactCompleteSuccessShapePattern: P.Pattern<TemplateArtifactCompleteSuccess> = {
	kind: 'templateArtifact',
	ok: true,
	artifact: completeTemplateArtifactPattern,
	diagnostics: synthesisDiagnosticsPattern
} satisfies P.Pattern<TemplateArtifactCompleteSuccess>

/** Runtime `ts-pattern` pattern for successful artifact results whose artifact is complete. */
export const templateArtifactCompleteSuccessPattern: GuardPattern<TemplateArtifactCompleteSuccess> = P.when(
	(value): value is TemplateArtifactCompleteSuccess =>
		isMatching(templateArtifactCompleteSuccessShapePattern, value)
)

const templateArtifactFailureShapePattern: P.Pattern<Extract<TemplateArtifactResult, { ok: false }>> = {
	kind: 'templateArtifact',
	ok: false,
	diagnostics: synthesisDiagnosticsPattern
} satisfies P.Pattern<Extract<TemplateArtifactResult, { ok: false }>>

/** Runtime `ts-pattern` pattern for failed artifact fill/finalize results. */
export const templateArtifactFailurePattern: GuardPattern<Extract<TemplateArtifactResult, { ok: false }>> = P.when(
	(value): value is Extract<TemplateArtifactResult, { ok: false }> =>
		isMatching(templateArtifactFailureShapePattern, value)
)

/** Runtime `ts-pattern` pattern for artifact fill/finalize results. */
export const templateArtifactResultPattern: P.Pattern<TemplateArtifactResult> = P.union(
	templateArtifactSuccessPattern,
	templateArtifactFailurePattern
) satisfies P.Pattern<TemplateArtifactResult>

/** Runtime type guard for artifact fill/finalize results. */
export function isTemplateArtifactResult(value: unknown): value is TemplateArtifactResult {
	return isMatching(templateArtifactResultPattern, value)
}
