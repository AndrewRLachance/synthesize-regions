import { describe, expect, it } from 'vitest'
import {
	createGraphRunner,
	defineTemplate,
	fragmentPort,
	literalPort,
	rawCodePort,
	TemplateCatalogValidationError,
	type SynthesisGraph
} from '../src/index.js'

const Source = defineTemplate({
	modelId: 'Source',
	inputs: { value: literalPort({ regionKind: 'expression' }) },
	output: { kind: 'expression' },
	template: r => r('value')
})

const NumberSource = defineTemplate({
	modelId: 'NumberSource',
	inputs: {
		value: literalPort({ regionKind: 'expression', schema: { type: 'number' } })
	},
	output: { kind: 'expression' },
	template: r => r('value')
})

const Consumer = defineTemplate({
	modelId: 'Consumer',
	inputs: { value: fragmentPort({ regionKind: 'expression', accepts: {} }) },
	output: { kind: 'expression' },
	template: r => `consume(${r('value')})`
})

const Sum = defineTemplate({
	modelId: 'Sum',
	inputs: {
		left: literalPort({ regionKind: 'expression', schema: { type: 'number' } }),
		right: literalPort({ regionKind: 'expression', schema: { type: 'number' } })
	},
	output: { kind: 'expression' },
	template: r => `${r('left')} + ${r('right')}`
})

const RawExpression = defineTemplate({
	modelId: 'RawExpression',
	inputs: {
		value: rawCodePort({
			regionKind: 'expression',
			policy: { allowNewlines: false, forbiddenSubstrings: ['eval'] }
		})
	},
	output: { kind: 'expression' },
	template: r => `consume(${r('value')})`
})

function sourceGraph(value?: unknown): SynthesisGraph {
	return {
		nodes: [{
			id: 'source',
			templateId: 'Source',
			inputs: value === undefined ? {} : { value: { kind: 'literal', value } }
		}],
		finalNodeId: 'source'
	}
}

describe('graph runner', () => {
	it('classifies graph repair and applies or rejects patches transactionally', () => {
		const graph: SynthesisGraph = {
			nodes: [{ id: 'consumer', templateId: 'Consumer', inputs: { value: { $ref: 'source' } } }],
			finalNodeId: 'consumer'
		}
		const runner = createGraphRunner([Source, Consumer], graph)

		const pending = runner.advance()
		expect(pending.kind).toBe('needsGraphRepair')
		if (pending.kind !== 'needsGraphRepair') return
		expect(pending.classification).toBe('graphRepairable')

		const rejected = runner.advance({ kind: 'removeNode', nodeId: 'missing' })
		expect(rejected.kind).toBe('needsGraphRepair')
		if (rejected.kind !== 'needsGraphRepair') return
		expect(rejected.classification).toBe('graphRepairable')
		expect(rejected.graph).toBe(graph)
		expect(rejected.result).toBe(pending.result)
		expect(rejected.diagnostics.some(diagnostic => diagnostic.code === 'GraphPatchTargetNotFound')).toBe(true)

		const malformed = runner.advance({ kind: 'removeNode', nodeId: 'consumer', unexpected: true } as never)
		expect(malformed.kind).toBe('needsGraphRepair')
		if (malformed.kind !== 'needsGraphRepair') return
		expect(malformed.graph).toBe(graph)
		expect(malformed.result).toBe(pending.result)
		expect(malformed.diagnostics.some(diagnostic => diagnostic.code === 'InvalidGraphRunnerAction')).toBe(true)

		const withGoal = runner.advance({ kind: 'setGoal', goal: { outputKind: 'expression' } })
		expect(withGoal.kind).toBe('needsGraphRepair')
		expect(withGoal.graph.goal).toEqual({ outputKind: 'expression' })

		const withoutGoal = runner.advance({ kind: 'removeGoal' })
		expect(withoutGoal.kind).toBe('needsGraphRepair')
		expect(withoutGoal.graph).not.toHaveProperty('goal')

		const complete = runner.advance({
			kind: 'addNode',
			node: { id: 'source', templateId: 'Source', inputs: { value: { kind: 'literal', value: 1 } } }
		})
		expect(complete.kind).toBe('complete')
		if (complete.kind === 'complete') expect(complete.artifact.code).toBe('consume(1)')
	})

	it('accepts replacement graphs from both actionable states', () => {
		const repairGraph: SynthesisGraph = {
			nodes: [{ id: 'consumer', templateId: 'Consumer', inputs: { value: { $ref: 'source' } } }],
			finalNodeId: 'consumer'
		}
		const repairing = createGraphRunner([Source, Consumer], repairGraph)
		expect(repairing.advance().kind).toBe('needsGraphRepair')
		const repaired = repairing.advance({
			kind: 'replaceGraph',
			graph: {
				...repairGraph,
				nodes: [
					...repairGraph.nodes,
					{ id: 'source', templateId: 'Source', inputs: { value: { kind: 'literal', value: 1 } } }
				]
			}
		})
		expect(repaired.kind).toBe('complete')

		const filling = createGraphRunner([Source], sourceGraph())
		expect(filling.advance().kind).toBe('needsArtifactInputs')
		const replaced = filling.advance({ kind: 'replaceGraph', graph: sourceGraph(2) })
		expect(replaced.kind).toBe('complete')
		if (replaced.kind === 'complete') expect(replaced.artifact.code).toBe('2')
	})

	it('recompiles and discards the pending artifact after successful graph patches', () => {
		const graph: SynthesisGraph = {
			nodes: [
				{ id: 'target', templateId: 'Source', inputs: {} },
				{ id: 'spare', templateId: 'Source', inputs: { value: { kind: 'literal', value: 9 } } }
			],
			finalNodeId: 'target'
		}
		const runner = createGraphRunner([Source], graph)
		const initial = runner.advance()
		expect(initial.kind).toBe('needsArtifactInputs')
		if (initial.kind !== 'needsArtifactInputs') return
		expect(initial.classification).toBe('artifactFillable')

		const withoutSpare = runner.advance({ kind: 'removeNode', nodeId: 'spare' })
		expect(withoutSpare.kind).toBe('needsArtifactInputs')
		if (withoutSpare.kind !== 'needsArtifactInputs') return
		expect(withoutSpare.artifact).not.toBe(initial.artifact)
		expect(withoutSpare.graph.nodes.map(node => node.id)).toEqual(['target'])

		const withSpare = runner.advance({
			kind: 'addNode',
			node: { id: 'spare', templateId: 'Source', inputs: { value: { kind: 'literal', value: 9 } } }
		})
		expect(withSpare.kind).toBe('needsArtifactInputs')
		if (withSpare.kind !== 'needsArtifactInputs') return
		expect(withSpare.artifact).not.toBe(withoutSpare.artifact)

		const redirected = runner.advance({ kind: 'setFinalNode', nodeId: 'spare' })
		expect(redirected.kind).toBe('complete')
		if (redirected.kind === 'complete') expect(redirected.artifact.code).toBe('9')
	})

	it('preserves pending state after a rejected patch and supports input edits', () => {
		const graph: SynthesisGraph = {
			nodes: [{
				id: 'sum', templateId: 'Sum',
				inputs: { left: { kind: 'literal', value: 1 } }
			}],
			finalNodeId: 'sum'
		}
		const runner = createGraphRunner([Sum], graph)
		const initial = runner.advance()
		expect(initial.kind).toBe('needsArtifactInputs')
		if (initial.kind !== 'needsArtifactInputs') return

		const rejected = runner.advance({ kind: 'removeInput', nodeId: 'sum', inputName: 'missing' })
		expect(rejected.kind).toBe('needsArtifactInputs')
		if (rejected.kind !== 'needsArtifactInputs') return
		expect(rejected.graph).toBe(graph)
		expect(rejected.artifact).toBe(initial.artifact)
		expect(rejected.diagnostics.map(diagnostic => diagnostic.code)).toContain('GraphPatchInputNotFound')

		const removed = runner.advance({ kind: 'removeInput', nodeId: 'sum', inputName: 'left' })
		expect(removed.kind).toBe('needsArtifactInputs')
		if (removed.kind !== 'needsArtifactInputs') return
		expect(removed.artifact.unresolvedInputs.map(input => input.inputName).sort()).toEqual(['left', 'right'])

		const restored = runner.advance({
			kind: 'setInput', nodeId: 'sum', inputName: 'left', input: { kind: 'literal', value: 2 }
		})
		expect(restored.kind).toBe('needsArtifactInputs')
		if (restored.kind !== 'needsArtifactInputs') return
		expect(restored.artifact.unresolvedInputs.map(input => input.inputName)).toEqual(['right'])

		const complete = runner.advance({
			kind: 'setInput', nodeId: 'sum', inputName: 'right', input: { kind: 'literal', value: 3 }
		})
		expect(complete.kind).toBe('complete')
		if (complete.kind === 'complete') expect(complete.artifact.code).toBe('2 + 3')
	})

	it('keeps an invalid literal fill retryable and accepts a correction', () => {
		const graph: SynthesisGraph = {
			nodes: [{ id: 'number', templateId: 'NumberSource', inputs: {} }],
			finalNodeId: 'number'
		}
		const runner = createGraphRunner([NumberSource], graph)
		const pending = runner.advance()
		expect(pending.kind).toBe('needsArtifactInputs')
		if (pending.kind !== 'needsArtifactInputs') return
		const inputId = pending.artifact.unresolvedInputs[0]!.id

		const rejected = runner.advance({
			kind: 'fill', inputs: { [inputId]: { kind: 'literal', value: 'not a number' } }
		})
		expect(rejected.kind).toBe('needsArtifactInputs')
		if (rejected.kind !== 'needsArtifactInputs') return
		expect(rejected.classification).toBe('artifactFillable')
		expect(rejected.artifact).toBe(pending.artifact)
		expect(rejected.diagnostics.map(diagnostic => diagnostic.code)).toContain('InvalidLiteralInput')

		const complete = runner.advance({
			kind: 'fill', inputs: { [inputId]: { kind: 'literal', value: 42 } }
		})
		expect(complete.kind).toBe('complete')
		if (complete.kind === 'complete') expect(complete.artifact.code).toBe('42')
	})

	it('keeps incompatible fragment and rejected raw-code fills retryable', () => {
		const fragmentRunner = createGraphRunner([Consumer], {
			nodes: [{ id: 'consumer', templateId: 'Consumer', inputs: {} }],
			finalNodeId: 'consumer'
		})
		const fragmentPending = fragmentRunner.advance()
		expect(fragmentPending.kind).toBe('needsArtifactInputs')
		if (fragmentPending.kind !== 'needsArtifactInputs') return
		const fragmentInputId = fragmentPending.artifact.unresolvedInputs[0]!.id
		const wrongFragment = fragmentRunner.advance({
			kind: 'fill',
			inputs: {
				[fragmentInputId]: {
					kind: 'fragment',
					fragment: {
						code: 'const value = 1;', kind: 'statement',
						source: { templateId: 'manual' }, complete: true
					}
				}
			}
		})
		expect(wrongFragment.kind).toBe('needsArtifactInputs')
		expect(wrongFragment.diagnostics.map(diagnostic => diagnostic.code)).toContain('IncompatibleFragmentKind')
		const invalidMetadata = fragmentRunner.advance({
			kind: 'fill',
			inputs: {
				[fragmentInputId]: {
					kind: 'fragment',
					fragment: {
						code: '1', kind: 'expression', type: { ts: 'any' },
						source: { templateId: 'manual' }, complete: true
					}
				}
			}
		})
		expect(invalidMetadata.kind).toBe('needsArtifactInputs')
		if (invalidMetadata.kind !== 'needsArtifactInputs') return
		expect(invalidMetadata.classification).toBe('artifactFillable')
		expect(invalidMetadata.artifact).toBe(fragmentPending.artifact)
		expect(invalidMetadata.diagnostics.map(diagnostic => diagnostic.code)).toContain('ForbiddenAnyType')
		const fragmentComplete = fragmentRunner.advance({
			kind: 'fill',
			inputs: {
				[fragmentInputId]: {
					kind: 'fragment',
					fragment: { code: '1', kind: 'expression', source: { templateId: 'manual' }, complete: true }
				}
			}
		})
		expect(fragmentComplete.kind).toBe('complete')

		const rawRunner = createGraphRunner([RawExpression], {
			nodes: [{ id: 'raw', templateId: 'RawExpression', inputs: {} }],
			finalNodeId: 'raw'
		})
		const rawPending = rawRunner.advance()
		expect(rawPending.kind).toBe('needsArtifactInputs')
		if (rawPending.kind !== 'needsArtifactInputs') return
		const rawInputId = rawPending.artifact.unresolvedInputs[0]!.id
		const rawRejected = rawRunner.advance({
			kind: 'fill', inputs: { [rawInputId]: { kind: 'rawCode', code: 'eval("1")' } }
		})
		expect(rawRejected.kind).toBe('needsArtifactInputs')
		expect(rawRejected.diagnostics.map(diagnostic => diagnostic.code)).toContain('RawCodeRejected')
		const rawComplete = rawRunner.advance({
			kind: 'fill', inputs: { [rawInputId]: { kind: 'rawCode', code: 'value + 1' } }
		})
		expect(rawComplete.kind).toBe('complete')
		if (rawComplete.kind === 'complete') expect(rawComplete.artifact.code).toBe('consume(value + 1)')
	})

	it('keeps semantic fill errors retryable and accepts valid generated TypeScript', () => {
		const Assignment = defineTemplate({
			modelId: 'Assignment',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'statement' },
			template: r => `const count: number = ${r('value')};`
		})
		const graph: SynthesisGraph = {
			nodes: [{ id: 'assignment', templateId: 'Assignment', inputs: {} }],
			finalNodeId: 'assignment'
		}
		const runner = createGraphRunner([Assignment], graph, { checkSemanticDiagnostics: true })
		const pending = runner.advance()
		expect(pending.kind).toBe('needsArtifactInputs')
		if (pending.kind !== 'needsArtifactInputs') return
		const inputId = pending.artifact.unresolvedInputs[0]!.id

		const rejected = runner.advance({
			kind: 'fill', inputs: { [inputId]: { kind: 'rawCode', code: '"wrong"' } }
		})
		expect(rejected.kind).toBe('needsArtifactInputs')
		if (rejected.kind !== 'needsArtifactInputs') return
		expect(rejected.classification).toBe('artifactFillable')
		expect(rejected.artifact).toBe(pending.artifact)
		expect(rejected.diagnostics.some(diagnostic => diagnostic.compilerCode === 2322)).toBe(true)

		const complete = runner.advance({
			kind: 'fill', inputs: { [inputId]: { kind: 'rawCode', code: '1' } }
		})
		expect(complete.kind).toBe('complete')
		if (complete.kind === 'complete') expect(complete.artifact.code).toBe('const count: number = 1;')
	})

	it('classifies digest mismatches and invalid transitions as terminal', () => {
		const digestRunner = createGraphRunner([Source], sourceGraph(1), {
			expectedCatalogDigest: 'c1_not-the-captured-digest'
		})
		const mismatch = digestRunner.advance()
		expect(mismatch.kind).toBe('failed')
		if (mismatch.kind !== 'failed') return
		expect(mismatch.classification).toBe('terminalFailure')
		expect(mismatch.diagnostics.map(diagnostic => diagnostic.code)).toContain('CatalogDigestMismatch')

		const invalidRunner = createGraphRunner([Source], sourceGraph(1))
		const invalid = invalidRunner.advance({ kind: 'fill', inputs: {} })
		expect(invalid.kind).toBe('failed')
		if (invalid.kind !== 'failed') return
		expect(invalid.classification).toBe('terminalFailure')
		expect(invalid.diagnostics[0]?.code).toBe('InvalidRunnerTransition')

		const completedRunner = createGraphRunner([Source], sourceGraph(1))
		expect(completedRunner.advance().kind).toBe('complete')
		const afterCompletion = completedRunner.advance()
		expect(afterCompletion.kind).toBe('failed')
		if (afterCompletion.kind === 'failed') expect(afterCompletion.classification).toBe('terminalFailure')
	})

	it('surfaces invalid catalog policy through the classified catalog error', () => {
		let thrown: unknown
		try {
			createGraphRunner([Source, Source], sourceGraph(1))
		} catch (error) {
			thrown = error
		}

		expect(thrown).toBeInstanceOf(TemplateCatalogValidationError)
		expect((thrown as TemplateCatalogValidationError).classification).toBe('templatePolicyFailure')
		expect((thrown as TemplateCatalogValidationError).diagnostics.map(diagnostic => diagnostic.code))
			.toContain('DuplicateTemplateId')
	})
})
