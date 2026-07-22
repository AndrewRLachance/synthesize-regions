import {
	GRAPH_PATCH_ACTION_KIND_VALUES,
	type GraphPatchAction,
	type GraphPatchResult,
	type SynthesisDiagnostic,
	type SynthesisGraph,
	type SynthesisNode
} from './graphCoreTypes.js'
import { GraphPatchActionSchema, checkContract } from './graphContracts.js'
import { synthesisDiagnosticOriginForCode } from './diagnosticCatalog.js'

type NodeOccurrence = {
	node: SynthesisNode
	path: string
	container:
		| { kind: 'topLevel'; index: number }
		| { kind: 'inlineInput'; parent: SynthesisNode; inputName: string }
		| { kind: 'collectionItem'; parent: SynthesisNode; inputName: string; index: number }
}

function diagnostic(
	code: string,
	message: string,
	details: Pick<SynthesisDiagnostic, 'nodeId' | 'inputName' | 'typeParameterName' | 'path' | 'expected' | 'actual'> = {}
): SynthesisDiagnostic {
	return { origin: synthesisDiagnosticOriginForCode(code), stage: 'graph', code, severity: 'error', message, ...details }
}

function failed(graph: SynthesisGraph, diagnostics: SynthesisDiagnostic[]): GraphPatchResult {
	return { kind: 'graphPatch', ok: false, graph, diagnostics, classification: 'graphRepairable' }
}

function succeeded(graph: SynthesisGraph): GraphPatchResult {
	return { kind: 'graphPatch', ok: true, graph, diagnostics: [] }
}

function collectNodeOccurrences(graph: SynthesisGraph): NodeOccurrence[] {
	const occurrences: NodeOccurrence[] = []

	function visitNode(node: SynthesisNode, path: string, container: NodeOccurrence['container']): void {
		occurrences.push({ node, path, container })

		for (const [inputName, input] of Object.entries(node.inputs)) {
			if ('kind' in input && input.kind === 'inline') {
				visitNode(input.node, `${path}.inputs.${inputName}.node`, { kind: 'inlineInput', parent: node, inputName })
				continue
			}
			if (!('kind' in input) || input.kind !== 'fragmentCollection') continue
			input.items.forEach((item, index) => {
				if ('kind' in item && item.kind === 'inline') {
					visitNode(item.node, `${path}.inputs.${inputName}.items.${index}.node`, {
						kind: 'collectionItem', parent: node, inputName, index
					})
				}
			})
		}
	}

	graph.nodes.forEach((node, index) => visitNode(node, `nodes.${index}`, { kind: 'topLevel', index }))
	return occurrences
}

function occurrencesById(graph: SynthesisGraph): Map<string, NodeOccurrence[]> {
	const byId = new Map<string, NodeOccurrence[]>()
	for (const occurrence of collectNodeOccurrences(graph)) {
		const group = byId.get(occurrence.node.id) ?? []
		group.push(occurrence)
		byId.set(occurrence.node.id, group)
	}
	return byId
}

function targetOccurrence(graph: SynthesisGraph, nodeId: string): NodeOccurrence | SynthesisDiagnostic {
	const matches = occurrencesById(graph).get(nodeId) ?? []
	if (matches.length === 0) {
		return diagnostic('GraphPatchTargetNotFound', `Graph patch target ${nodeId} does not exist.`, {
			nodeId,
			path: 'action.nodeId',
			expected: 'an existing authored node ID',
			actual: nodeId
		})
	}
	if (matches.length > 1) {
		return diagnostic('GraphPatchTargetAmbiguous', `Graph patch target ${nodeId} is ambiguous.`, {
			nodeId,
			path: 'action.nodeId',
			expected: 'one authored node',
			actual: matches.map(match => match.path)
		})
	}
	return matches[0]!
}

function isDiagnostic(value: NodeOccurrence | SynthesisDiagnostic): value is SynthesisDiagnostic {
	return 'stage' in value
}

function updateNode(
	node: SynthesisNode,
	target: SynthesisNode,
	update: (node: SynthesisNode) => SynthesisNode
): { node: SynthesisNode; changed: boolean } {
	if (node === target) return { node: update(node), changed: true }

	let changed = false
	let inputs = node.inputs
	for (const [inputName, input] of Object.entries(node.inputs)) {
		if ('kind' in input && input.kind === 'inline') {
			const child = updateNode(input.node, target, update)
			if (!child.changed) continue
			if (!changed) inputs = { ...inputs }
			inputs[inputName] = { ...input, node: child.node }
			changed = true
			continue
		}
		if (!('kind' in input) || input.kind !== 'fragmentCollection') continue

		let items = input.items
		let collectionChanged = false
		input.items.forEach((item, index) => {
			if (!('kind' in item) || item.kind !== 'inline') return
			const child = updateNode(item.node, target, update)
			if (!child.changed) return
			if (!collectionChanged) items = [...items]
			items[index] = { ...item, node: child.node }
			collectionChanged = true
		})
		if (!collectionChanged) continue
		if (!changed) inputs = { ...inputs }
		inputs[inputName] = { ...input, items }
		changed = true
	}

	return changed ? { node: { ...node, inputs }, changed: true } : { node, changed: false }
}

function updateTargetNode(
	graph: SynthesisGraph,
	target: SynthesisNode,
	update: (node: SynthesisNode) => SynthesisNode
): SynthesisGraph {
	let changed = false
	const nodes = graph.nodes.map(node => {
		const result = updateNode(node, target, update)
		changed ||= result.changed
		return result.node
	})
	return changed ? { ...graph, nodes } : graph
}

function removeInlineNode(node: SynthesisNode, target: SynthesisNode): { node: SynthesisNode; changed: boolean } {
	let changed = false
	let inputs = node.inputs

	for (const [inputName, input] of Object.entries(node.inputs)) {
		if ('kind' in input && input.kind === 'inline') {
			if (input.node === target) {
				if (!changed) inputs = { ...inputs }
				delete inputs[inputName]
				changed = true
				continue
			}
			const child = removeInlineNode(input.node, target)
			if (!child.changed) continue
			if (!changed) inputs = { ...inputs }
			inputs[inputName] = { ...input, node: child.node }
			changed = true
			continue
		}
		if (!('kind' in input) || input.kind !== 'fragmentCollection') continue

		const directIndex = input.items.findIndex(item => 'kind' in item && item.kind === 'inline' && item.node === target)
		if (directIndex >= 0) {
			if (!changed) inputs = { ...inputs }
			inputs[inputName] = { ...input, items: input.items.filter((_, index) => index !== directIndex) }
			changed = true
			continue
		}

		let items = input.items
		let collectionChanged = false
		input.items.forEach((item, index) => {
			if (!('kind' in item) || item.kind !== 'inline') return
			const child = removeInlineNode(item.node, target)
			if (!child.changed) return
			if (!collectionChanged) items = [...items]
			items[index] = { ...item, node: child.node }
			collectionChanged = true
		})
		if (!collectionChanged) continue
		if (!changed) inputs = { ...inputs }
		inputs[inputName] = { ...input, items }
		changed = true
	}

	return changed ? { node: { ...node, inputs }, changed: true } : { node, changed: false }
}

function removeTargetNode(graph: SynthesisGraph, occurrence: NodeOccurrence): SynthesisGraph {
	if (occurrence.container.kind === 'topLevel') {
		const targetIndex = occurrence.container.index
		return { ...graph, nodes: graph.nodes.filter((_, index) => index !== targetIndex) }
	}

	let changed = false
	const nodes = graph.nodes.map(node => {
		const result = removeInlineNode(node, occurrence.node)
		changed ||= result.changed
		return result.node
	})
	return changed ? { ...graph, nodes } : graph
}

function duplicateDiagnostics(before: SynthesisGraph, after: SynthesisGraph): SynthesisDiagnostic[] {
	const beforeCounts = new Map([...occurrencesById(before)].map(([id, values]) => [id, values.length]))
	return [...occurrencesById(after)]
		.filter(([id, values]) => values.length > 1 && values.length > (beforeCounts.get(id) ?? 0))
		.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
		.map(([id, values]) => diagnostic(
			'DuplicateNodeId',
			`Graph patch would introduce duplicate node ID ${id}.`,
			{ nodeId: id, path: values[1]?.path ?? values[0]!.path, expected: 'a globally unique node ID', actual: id }
		))
}

/**
 * Apply one immutable graph mutation transactionally.
 *
 * Failed patches return the exact input graph object. Successful patches
 * preserve authored inline structure and never normalize or cascade refs.
 */
export function applyGraphPatch(graph: SynthesisGraph, action: GraphPatchAction): GraphPatchResult {
	if (!checkContract(GraphPatchActionSchema, action)) {
		return failed(graph, [diagnostic(
			'InvalidGraphRunnerAction',
			'Graph patch action does not match a supported action shape.',
			{ path: 'action', expected: GRAPH_PATCH_ACTION_KIND_VALUES, actual: action }
		)])
	}

	switch (action.kind) {
		case 'addNode': {
			const patched = { ...graph, nodes: [...graph.nodes, action.node] }
			const duplicates = duplicateDiagnostics(graph, patched)
			return duplicates.length > 0 ? failed(graph, duplicates) : succeeded(patched)
		}
		case 'removeNode': {
			const target = targetOccurrence(graph, action.nodeId)
			return isDiagnostic(target) ? failed(graph, [target]) : succeeded(removeTargetNode(graph, target))
		}
		case 'setInput': {
			const target = targetOccurrence(graph, action.nodeId)
			if (isDiagnostic(target)) return failed(graph, [target])
			const patched = updateTargetNode(graph, target.node, node => ({
				...node,
				inputs: { ...node.inputs, [action.inputName]: action.input }
			}))
			const duplicates = duplicateDiagnostics(graph, patched)
			return duplicates.length > 0 ? failed(graph, duplicates) : succeeded(patched)
		}
		case 'removeInput': {
			const target = targetOccurrence(graph, action.nodeId)
			if (isDiagnostic(target)) return failed(graph, [target])
			if (!Object.hasOwn(target.node.inputs, action.inputName)) {
				return failed(graph, [diagnostic(
					'GraphPatchInputNotFound',
					`Input ${action.inputName} does not exist on graph node ${action.nodeId}.`,
					{
						nodeId: action.nodeId,
						inputName: action.inputName,
						path: 'action.inputName',
						expected: Object.keys(target.node.inputs).sort(),
						actual: action.inputName
					}
				)])
			}
			return succeeded(updateTargetNode(graph, target.node, node => {
				const inputs = { ...node.inputs }
				delete inputs[action.inputName]
				return { ...node, inputs }
			}))
		}
		case 'setTypeArgument': {
			const target = targetOccurrence(graph, action.nodeId)
			if (isDiagnostic(target)) return failed(graph, [target])
			return succeeded(updateTargetNode(graph, target.node, node => ({
				...node,
				typeArguments: { ...node.typeArguments, [action.parameterName]: action.typeArgument }
			})))
		}
		case 'removeTypeArgument': {
			const target = targetOccurrence(graph, action.nodeId)
			if (isDiagnostic(target)) return failed(graph, [target])
			if (!Object.hasOwn(target.node.typeArguments ?? {}, action.parameterName)) {
				return failed(graph, [diagnostic(
					'GraphPatchTypeArgumentNotFound',
					`Type argument ${action.parameterName} does not exist on graph node ${action.nodeId}.`,
					{
						nodeId: action.nodeId,
						typeParameterName: action.parameterName,
						path: 'action.parameterName',
						actual: action.parameterName
					}
				)])
			}
			return succeeded(updateTargetNode(graph, target.node, node => {
				const typeArguments = { ...node.typeArguments }
				delete typeArguments[action.parameterName]
				if (Object.keys(typeArguments).length > 0) return { ...node, typeArguments }
				const { typeArguments: _typeArguments, ...withoutTypeArguments } = node
				return withoutTypeArguments
			}))
		}
		case 'setFinalNode': {
			const target = targetOccurrence(graph, action.nodeId)
			return isDiagnostic(target) ? failed(graph, [target]) : succeeded({ ...graph, finalNodeId: action.nodeId })
		}
		case 'setGoal':
			return succeeded({ ...graph, goal: action.goal })
		case 'removeGoal': {
			const { goal: _goal, ...withoutGoal } = graph
			return succeeded(withoutGoal)
		}
	}
}
