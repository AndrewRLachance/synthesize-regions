import { describe, expect, it } from 'vitest'
import { applyGraphPatch } from '../src/templates/graphPatch.js'
import type { GraphPatchResult, SynthesisGraph, SynthesisNode } from '../src/templates/graphCoreTypes.js'

function graphFixture(): SynthesisGraph {
	return {
		nodes: [
			{
				id: 'root',
				templateId: 'Root',
				inputs: {
					direct: {
						kind: 'inline',
						node: {
							id: 'direct',
							templateId: 'Direct',
							inputs: {
								nested: {
									kind: 'inline',
									node: { id: 'nested', templateId: 'Nested', inputs: {} }
								}
							}
						}
					},
					collection: {
						kind: 'fragmentCollection',
						items: [
							{ $ref: 'external' },
							{
								kind: 'inline',
								node: { id: 'collectionChild', templateId: 'CollectionChild', inputs: {} }
							},
							{ kind: 'ref', nodeId: 'external' }
						]
					}
				}
			},
			{ id: 'external', templateId: 'External', inputs: {} }
		],
		finalNodeId: 'root',
		goal: { outputKind: 'statement' }
	}
}

function success(result: GraphPatchResult): Extract<GraphPatchResult, { ok: true }> {
	expect(result.ok).toBe(true)
	if (!result.ok) throw new Error(`Expected successful patch: ${result.diagnostics[0]?.message}`)
	return result
}

function failure(result: GraphPatchResult, code: string): Extract<GraphPatchResult, { ok: false }> {
	expect(result.ok).toBe(false)
	if (result.ok) throw new Error('Expected failed patch')
	expect(result.classification).toBe('graphRepairable')
	expect(result.diagnostics.map(diagnostic => diagnostic.code)).toContain(code)
	return result
}

function rootNode(graph: SynthesisGraph): SynthesisNode {
	return graph.nodes.find(node => node.id === 'root')!
}

describe('applyGraphPatch', () => {
	it('adds top-level nodes without mutating the authored graph', () => {
		const graph = graphFixture()
		const added = { id: 'added', templateId: 'Added', inputs: {} }

		const result = success(applyGraphPatch(graph, { kind: 'addNode', node: added }))

		expect(result.graph).not.toBe(graph)
		expect(result.graph.nodes).toEqual([...graph.nodes, added])
		expect(graph.nodes).toHaveLength(2)
		expect(result.diagnostics).toEqual([])
	})

	it('rejects existing and internally duplicated IDs atomically', () => {
		const graph = graphFixture()
		const existing = failure(applyGraphPatch(graph, {
			kind: 'addNode',
			node: { id: 'added', templateId: 'Added', inputs: {
				child: { kind: 'inline', node: { id: 'external', templateId: 'Child', inputs: {} } }
			} }
		}), 'DuplicateNodeId')
		expect(existing.graph).toBe(graph)

		const internallyDuplicated = failure(applyGraphPatch(graph, {
			kind: 'addNode',
			node: { id: 'added', templateId: 'Added', inputs: {
				left: { kind: 'inline', node: { id: 'same', templateId: 'Child', inputs: {} } },
				right: { kind: 'inline', node: { id: 'same', templateId: 'Child', inputs: {} } }
			} }
		}), 'DuplicateNodeId')
		expect(internallyDuplicated.graph).toBe(graph)
	})

	it('removes top-level and recursively inline nodes using their authored containers', () => {
		const graph = graphFixture()

		const topLevel = success(applyGraphPatch(graph, { kind: 'removeNode', nodeId: 'external' })).graph
		expect(topLevel.nodes.map(node => node.id)).toEqual(['root'])
		expect((rootNode(topLevel).inputs.collection as { items: unknown[] }).items).toHaveLength(3)

		const direct = success(applyGraphPatch(graph, { kind: 'removeNode', nodeId: 'direct' })).graph
		expect(rootNode(direct).inputs).not.toHaveProperty('direct')

		const nested = success(applyGraphPatch(graph, { kind: 'removeNode', nodeId: 'nested' })).graph
		const directNode = (rootNode(nested).inputs.direct as { kind: 'inline'; node: SynthesisNode }).node
		expect(directNode.inputs).not.toHaveProperty('nested')

		const collection = success(applyGraphPatch(graph, { kind: 'removeNode', nodeId: 'collectionChild' })).graph
		const collectionInput = rootNode(collection).inputs.collection
		expect(collectionInput).toEqual({
			kind: 'fragmentCollection',
			items: [{ $ref: 'external' }, { kind: 'ref', nodeId: 'external' }]
		})
	})

	it('sets inputs on any recursively authored node while preserving inline structure', () => {
		const graph = graphFixture()
		const result = success(applyGraphPatch(graph, {
			kind: 'setInput',
			nodeId: 'collectionChild',
			inputName: 'value',
			input: {
				kind: 'inline',
				node: { id: 'newNested', templateId: 'NewNested', inputs: { text: { kind: 'literal', value: 'ok' } } }
			}
		})).graph

		const collection = rootNode(result).inputs.collection
		if (collection === undefined || !('kind' in collection) || collection.kind !== 'fragmentCollection') {
			throw new Error('Expected collection')
		}
		const childItem = collection.items[1]
		if (!childItem || !('kind' in childItem) || childItem.kind !== 'inline') throw new Error('Expected inline item')
		expect(childItem.node.inputs.value).toEqual({
			kind: 'inline',
			node: { id: 'newNested', templateId: 'NewNested', inputs: { text: { kind: 'literal', value: 'ok' } } }
		})
		expect(rootNode(graph).inputs.collection).not.toBe(collection)
	})

	it('rejects a setInput that introduces a duplicate recursive ID', () => {
		const graph = graphFixture()
		const result = failure(applyGraphPatch(graph, {
			kind: 'setInput',
			nodeId: 'nested',
			inputName: 'cycleById',
			input: { kind: 'inline', node: { id: 'root', templateId: 'Duplicate', inputs: {} } }
		}), 'DuplicateNodeId')

		expect(result.graph).toBe(graph)
		expect((rootNode(graph).inputs.direct as { kind: 'inline'; node: SynthesisNode }).node.inputs.nested).toBeDefined()
	})

	it('removes existing inputs and rejects absent inputs atomically', () => {
		const graph = graphFixture()
		const removed = success(applyGraphPatch(graph, {
			kind: 'removeInput', nodeId: 'root', inputName: 'direct'
		})).graph
		expect(rootNode(removed).inputs).not.toHaveProperty('direct')

		const absent = failure(applyGraphPatch(graph, {
			kind: 'removeInput', nodeId: 'root', inputName: 'missing'
		}), 'GraphPatchInputNotFound')
		expect(absent.graph).toBe(graph)
	})

	it('sets only existing final node IDs and sets or removes goals', () => {
		const graph = graphFixture()
		const inlineFinal = success(applyGraphPatch(graph, {
			kind: 'setFinalNode', nodeId: 'collectionChild'
		})).graph
		expect(inlineFinal.finalNodeId).toBe('collectionChild')

		const missing = failure(applyGraphPatch(graph, {
			kind: 'setFinalNode', nodeId: 'missing'
		}), 'GraphPatchTargetNotFound')
		expect(missing.graph).toBe(graph)

		const withGoal = success(applyGraphPatch(graph, {
			kind: 'setGoal', goal: { outputKind: 'expression', type: { ts: 'string' } }
		})).graph
		expect(withGoal.goal).toEqual({ outputKind: 'expression', type: { ts: 'string' } })
		expect(success(applyGraphPatch(withGoal, { kind: 'removeGoal' })).graph).not.toHaveProperty('goal')
	})

	it('rejects missing, ambiguous, and malformed targets without changing the graph', () => {
		const graph = graphFixture()
		const missing = failure(applyGraphPatch(graph, { kind: 'removeNode', nodeId: 'missing' }), 'GraphPatchTargetNotFound')
		expect(missing.graph).toBe(graph)

		const ambiguousGraph: SynthesisGraph = {
			...graph,
			nodes: [...graph.nodes, { id: 'nested', templateId: 'DuplicateNested', inputs: {} }]
		}
		const ambiguous = failure(applyGraphPatch(ambiguousGraph, {
			kind: 'removeInput', nodeId: 'nested', inputName: 'anything'
		}), 'GraphPatchTargetAmbiguous')
		expect(ambiguous.graph).toBe(ambiguousGraph)

		const malformed = failure(applyGraphPatch(graph, {
			kind: 'removeNode', nodeId: 'root', unexpected: true
		} as never), 'InvalidGraphRunnerAction')
		expect(malformed.graph).toBe(graph)
	})
})
