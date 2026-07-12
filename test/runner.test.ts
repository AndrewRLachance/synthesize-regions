import { describe, expect, it } from 'vitest'
import {
	createGraphRunner,
	defineTemplate,
	fragmentPort,
	literalPort,
	type SynthesisGraph
} from '../src/index.js'

const Source = defineTemplate({
	modelId: 'Source',
	inputs: { value: literalPort({ regionKind: 'expression' }) },
	output: { kind: 'expression' },
	template: r => r('value')
})

const Consumer = defineTemplate({
	modelId: 'Consumer',
	inputs: { value: fragmentPort({ regionKind: 'expression', accepts: {} }) },
	output: { kind: 'expression' },
	template: r => `consume(${r('value')})`
})

describe('graph runner', () => {
	it('repairs a graph and reaches a complete artifact', () => {
		const graph: SynthesisGraph = {
			nodes: [{ id: 'consumer', templateId: 'Consumer', inputs: { value: { $ref: 'source' } } }],
			finalNodeId: 'consumer'
		}
		const runner = createGraphRunner([Source, Consumer], graph)

		expect(runner.advance().kind).toBe('needsGraphRepair')
		const repaired: SynthesisGraph = {
			...graph,
			nodes: [...graph.nodes, { id: 'source', templateId: 'Source', inputs: { value: { kind: 'literal', value: 1 } } }]
		}
		const state = runner.advance({ kind: 'replaceGraph', graph: repaired })
		expect(state.kind).toBe('complete')
		if (state.kind === 'complete') expect(state.artifact.code).toBe('consume(1)')
	})

	it('fills a partial artifact and rejects invalid transitions structurally', () => {
		const graph: SynthesisGraph = {
			nodes: [{ id: 'consumer', templateId: 'Consumer', inputs: {} }],
			finalNodeId: 'consumer'
		}
		const runner = createGraphRunner([Source, Consumer], graph)
		const pending = runner.advance()
		expect(pending.kind).toBe('needsArtifactInputs')
		if (pending.kind !== 'needsArtifactInputs') return

		const state = runner.advance({
			kind: 'fill',
			inputs: {
				[pending.artifact.unresolvedInputs[0]!.id]: {
					kind: 'fragment',
					fragment: {
						code: '1', kind: 'expression', source: { templateId: 'manual' }, complete: true
					}
				}
			}
		})
		expect(state.kind).toBe('complete')
		expect(runner.advance().kind).toBe('failed')
		expect(runner.state.diagnostics[0]?.code).toBe('InvalidRunnerTransition')
	})

	it('fails after a fill introduces a TypeScript semantic error', () => {
		const InvalidAfterFill = defineTemplate({
			modelId: 'InvalidAfterFill',
			inputs: { value: literalPort({ regionKind: 'string', schema: { type: 'string' } }) },
			output: { kind: 'statement' },
			template: r => `const count: number = ${r('value')};`
		})
		const graph: SynthesisGraph = {
			nodes: [{ id: 'invalid', templateId: 'InvalidAfterFill', inputs: {} }],
			finalNodeId: 'invalid'
		}
		const runner = createGraphRunner([InvalidAfterFill], graph, { checkSemanticDiagnostics: true })
		const pending = runner.advance()
		expect(pending.kind).toBe('needsArtifactInputs')
		if (pending.kind !== 'needsArtifactInputs') return

		const failed = runner.advance({ kind: 'fill', inputs: { value: { kind: 'literal', value: 'wrong' } } })
		expect(failed.kind).toBe('failed')
		expect(failed.diagnostics.some(diagnostic => diagnostic.compilerCode === 2322)).toBe(true)
	})
})
