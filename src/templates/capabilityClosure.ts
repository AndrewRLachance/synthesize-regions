import type { TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

import { canonicalizeJson } from './artifactIdentity.js'
import { compareCodeUnits } from './deterministic.js'
import { compareTypeDescriptors } from './compatibility.js'
import { validateCallableScope } from './callableScope.js'
import { instantiateTemplateContracts, validateTemplateTypeParameters } from './genericTypes.js'
import {
	SynthesisGraphSchema,
	TemplateSummarySchema
} from './graphContracts.js'
import type {
	InputPort,
	InputPortSummary,
	OutputPort,
	OutputPortSummary,
	RegionKind,
	SynthesisGoal,
	SynthesisGraph,
	SynthesisNode,
	TemplateSummary,
	TypeDescriptor
} from './graphTypes.js'

const TYPE_PARAMETER_PLACEHOLDER_PATTERN = /\{\{[^{}]+\}\}/u

/** Check a runtime contract without exposing TypeBox's recursive inferred type to callers. */
function matchesContract(schema: TSchema, value: unknown): boolean {
	return Value.Check(schema, value)
}

/** The planner or repair context from which a source-free capability closure is derived. */
export type TemplateCapabilityClosureRoot =
	| { readonly kind: 'goal'; readonly goal?: SynthesisGoal }
	| { readonly kind: 'graph'; readonly graph: SynthesisGraph }

interface ProducerRequirement {
	readonly outputKind: RegionKind
	readonly type?: TypeDescriptor
	readonly sourceModelIds?: readonly string[]
}

interface TemplateContractView {
	readonly inputs: Readonly<Record<string, InputPort | InputPortSummary>>
	readonly output: OutputPort | OutputPortSummary
}

/** Clone JSON-shaped summaries while imposing deterministic object-key ordering. */
function cloneSummaries(summaries: readonly TemplateSummary[]): TemplateSummary[] {
	try {
		return JSON.parse(canonicalizeJson(summaries)) as TemplateSummary[]
	} catch (error) {
		throw new TypeError(
			`Template capability summaries must be canonical JSON data: ${error instanceof Error ? error.message : String(error)}`
		)
	}
}

/** Report whether a descriptor contains an unresolved generic placeholder. */
function containsTypeParameterPlaceholder(type: TypeDescriptor | undefined): boolean {
	return type?.ts !== undefined && TYPE_PARAMETER_PLACEHOLDER_PATTERN.test(type.ts)
}

/** Combine current type metadata with the deprecated standalone schema alias. */
function effectiveType(
	type: TypeDescriptor | undefined,
	schema: OutputPortSummary['schema'] | SynthesisGoal['schema']
): TypeDescriptor | undefined {
	if (schema === undefined || type?.schema !== undefined) return type
	return { ...(type ?? {}), schema }
}

/** Collect every type descriptor advertised by a source-free input summary. */
function inputTypeDescriptors(port: InputPortSummary): readonly TypeDescriptor[] {
	switch (port.kind) {
		case 'fragment':
		case 'fragmentCollection': return port.accepts.type === undefined ? [] : [port.accepts.type]
		case 'rawCode': return port.type === undefined ? [] : [port.type]
		case 'union': return port.options.flatMap(inputTypeDescriptors)
		case 'literal': return []
	}
}

/** Validate that every summary is a source-free, semantically valid planner contract. */
export function validateTemplateCapabilityCatalog(
	summaries: readonly TemplateSummary[]
): TemplateSummary[] {
	const clones = cloneSummaries(summaries)
	const seen = new Set<string>()
	for (const [index, summary] of clones.entries()) {
		if (!matchesContract(TemplateSummarySchema, summary)) {
			throw new TypeError(`Template capability summary at index ${index} is not a closed TemplateSummary.`)
		}
		if (seen.has(summary.modelId)) {
			throw new TypeError(`Template capability summaries contain duplicate modelId ${JSON.stringify(summary.modelId)}.`)
		}
		seen.add(summary.modelId)
		const callableScopeIssues = validateCallableScope(summary.callableScope, summary.inputs)
		if (callableScopeIssues.length > 0) {
			throw new TypeError(
				`Template capability summary ${JSON.stringify(summary.modelId)} has invalid callable metadata: ${callableScopeIssues
					.map(issue => `${issue.code} at ${issue.path}`)
					.join(', ')}.`
			)
		}
		const genericIssues = validateTemplateTypeParameters(
			summary.typeParameters,
			summary.inputs,
			summary.output
		)
		if (genericIssues.length > 0) {
			throw new TypeError(
				`Template capability summary ${JSON.stringify(summary.modelId)} has invalid generic contracts: ${genericIssues
					.map(issue => `${issue.code} at ${issue.path}`)
					.join(', ')}.`
			)
		}
		const descriptors = [
			...Object.values(summary.inputs).flatMap(inputTypeDescriptors),
			...(effectiveType(summary.output.type, summary.output.schema) === undefined
				? []
				: [effectiveType(summary.output.type, summary.output.schema)!])
		]
		if (descriptors.some(descriptor => !containsTypeParameterPlaceholder(descriptor)
			&& compareTypeDescriptors(descriptor, undefined).status === 'invalid')) {
			throw new TypeError(`Template capability summary ${JSON.stringify(summary.modelId)} contains invalid type metadata.`)
		}
	}
	return clones.sort((left, right) => compareCodeUnits(left.modelId, right.modelId))
}

/** Extract every fragment producer alternative represented by a summarized or instantiated input. */
function producerRequirements(port: InputPort | InputPortSummary): readonly ProducerRequirement[] {
	switch (port.kind) {
		case 'fragment':
		case 'fragmentCollection':
			return [{
				outputKind: port.accepts.outputKind ?? port.regionKind,
				...(port.accepts.type === undefined ? {} : { type: port.accepts.type }),
				...(port.accepts.sourceModelIds === undefined ? {} : { sourceModelIds: port.accepts.sourceModelIds })
			}]
		case 'union': return port.options.flatMap(producerRequirements)
		case 'literal':
		case 'rawCode': return []
	}
}

/** Treat unresolved generic and indeterminate comparisons conservatively. */
function typesMayBeCompatible(actual: TypeDescriptor | undefined, expected: TypeDescriptor | undefined): boolean {
	const actualHasPlaceholder = containsTypeParameterPlaceholder(actual)
	const expectedHasPlaceholder = containsTypeParameterPlaceholder(expected)
	const withoutTypeScript = (descriptor: TypeDescriptor | undefined): TypeDescriptor | undefined => {
		if (descriptor?.ts === undefined) return descriptor
		const { ts: _ts, ...remaining } = descriptor!
		return Object.keys(remaining).length === 0 ? undefined : remaining
	}
	const comparison = actualHasPlaceholder || expectedHasPlaceholder
		? compareTypeDescriptors(withoutTypeScript(actual), withoutTypeScript(expected))
		: compareTypeDescriptors(actual, expected)
	if (comparison.status === 'incompatible' || comparison.status === 'invalid') return false
	if (actualHasPlaceholder || expectedHasPlaceholder) return true
	return comparison.status === 'compatible' || comparison.status === 'indeterminate'
}

/** Report whether one source-free template can produce a fragment accepted by a requirement. */
function satisfiesRequirement(summary: TemplateSummary, requirement: ProducerRequirement): boolean {
	if (summary.output.kind !== requirement.outputKind) return false
	if (requirement.sourceModelIds !== undefined && !requirement.sourceModelIds.includes(summary.modelId)) return false
	return typesMayBeCompatible(effectiveType(summary.output.type, summary.output.schema), requirement.type)
}

/** Report whether one source-free template may produce the final fragment requested by a goal. */
function satisfiesGoal(summary: TemplateSummary, goal: SynthesisGoal): boolean {
	if (goal.outputKind !== undefined && summary.output.kind !== goal.outputKind) return false
	return typesMayBeCompatible(
		effectiveType(summary.output.type, summary.output.schema),
		effectiveType(goal.type, goal.schema)
	)
}

/** Recursively collect top-level and inline graph nodes without changing graph order. */
function graphNodes(graph: SynthesisGraph): SynthesisNode[] {
	const nodes: SynthesisNode[] = []
	const visit = (node: SynthesisNode): void => {
		nodes.push(node)
		for (const input of Object.values(node.inputs)) {
			if ('kind' in input && input.kind === 'inline') {
				visit(input.node)
			} else if ('kind' in input && input.kind === 'fragmentCollection') {
				for (const item of input.items) {
					if ('kind' in item && item.kind === 'inline') visit(item.node)
				}
			}
		}
	}
	for (const node of graph.nodes) visit(node)
	return nodes
}

/** Instantiate one graph-bound summary exactly, retaining its generic contract when the binding needs repair. */
function boundContractView(summary: TemplateSummary, node: SynthesisNode): TemplateContractView {
	const instantiated = instantiateTemplateContracts(
		summary.typeParameters,
		summary.inputs,
		summary.output,
		node.typeArguments
	)
	return instantiated.contracts ?? summary
}

/** Return the input-contract variants represented by existing nodes of one selected template. */
function selectedContractViews(
	summary: TemplateSummary,
	nodesByTemplate: ReadonlyMap<string, readonly SynthesisNode[]>
): readonly TemplateContractView[] {
	const nodes = nodesByTemplate.get(summary.modelId)
	return nodes === undefined || nodes.length === 0
		? [summary]
		: nodes.map(node => boundContractView(summary, node))
}

/**
 * Derive the deterministic, source-free template capability closure needed by a
 * graph planner or graph-bound repair role.
 *
 * Existing graph nodes narrow their consumer requirements through exact generic
 * bindings. Missing or invalid bindings retain the uninstantiated contract so a
 * repair role never loses the producers it may need. Generic producer summaries
 * remain conservative because a planner may introduce a new, differently bound
 * instance of that template.
 */
export function deriveTemplateCapabilityClosure(
	summaries: readonly TemplateSummary[],
	root: TemplateCapabilityClosureRoot
): TemplateSummary[] {
	const authorized = validateTemplateCapabilityCatalog(summaries)
	const byId = new Map(authorized.map(summary => [summary.modelId, summary] as const))
	let nodesByTemplate = new Map<string, readonly SynthesisNode[]>()
	let seedModelIds: string[]

	if (root.kind === 'goal') {
		seedModelIds = root.goal === undefined
			? authorized.map(summary => summary.modelId)
			: authorized.filter(summary => satisfiesGoal(summary, root.goal!)).map(summary => summary.modelId)
	} else {
		if (!matchesContract(SynthesisGraphSchema, root.graph)) {
			throw new TypeError('Template capability graph is not a closed SynthesisGraph.')
		}
		const nodes = graphNodes(root.graph)
		if (nodes.some(node => !byId.has(node.templateId))) return cloneSummaries(authorized)
		const grouped = new Map<string, SynthesisNode[]>()
		for (const node of nodes) {
			const group = grouped.get(node.templateId) ?? []
			group.push(node)
			grouped.set(node.templateId, group)
		}
		nodesByTemplate = grouped
		seedModelIds = [
			...nodes.map(node => node.templateId),
			...(root.graph.goal === undefined
				? []
				: authorized.filter(summary => satisfiesGoal(summary, root.graph.goal!)).map(summary => summary.modelId))
		]
	}

	const selected = new Set<string>()
	const pending = [...new Set(seedModelIds)].sort(compareCodeUnits)
	while (pending.length > 0) {
		const modelId = pending.shift()!
		if (selected.has(modelId)) continue
		const summary = byId.get(modelId)
		if (summary === undefined) continue
		selected.add(modelId)
		const requirements = selectedContractViews(summary, nodesByTemplate)
			.flatMap(view => Object.values(view.inputs).flatMap(producerRequirements))
		for (const producer of authorized) {
			if (!selected.has(producer.modelId)
				&& requirements.some(requirement => satisfiesRequirement(producer, requirement))) {
				pending.push(producer.modelId)
			}
		}
		pending.sort(compareCodeUnits)
	}

	return cloneSummaries(authorized.filter(summary => selected.has(summary.modelId)))
}
