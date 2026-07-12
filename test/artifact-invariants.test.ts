import { describe, expect, it } from 'vitest'
import {
	compileGraph,
	createTemplateRegistry,
	defineTemplate,
	fillTemplateArtifact,
	finalizeTemplateArtifact,
	fragmentCollectionPort,
	fragmentPort,
	rawCodePort,
	type CompleteTemplateArtifact,
	type GraphCompileOptions,
	type GraphPartialCompilationResult,
	type PartialTemplateArtifact,
	type SynthesisGraph,
	type TemplateArtifactResult,
	type TemplateRegistry,
	type UnresolvedTemplateInput
} from '../src/index.js'

function partialOptions(compilationScope?: string): GraphCompileOptions & { mode: 'partial' } {
	return {
		mode: 'partial',
		...(compilationScope === undefined ? {} : { compilationScope })
	} as GraphCompileOptions & { mode: 'partial' }
}

function compilePartialGraph(
	graph: SynthesisGraph,
	registry: TemplateRegistry,
	options = partialOptions()
): GraphPartialCompilationResult {
	// The runtime overload is selected by `mode`; this cast can be removed if the
	// broad optional-options overload is moved after the partial-mode overload.
	return compileGraph(graph, registry, options) as unknown as GraphPartialCompilationResult
}

function marker(id: string, kind = 'expression', body = 'undefined'): string {
	return `/** @TYPE ${kind} id=${id} **/${body}/** @END **/`
}

function rawInput(
	id: string,
	inputName = 'value',
	nodeId = 'node',
	regionKind: 'expression' | 'statement' = 'expression'
): UnresolvedTemplateInput {
	return {
		id,
		inputName,
		nodeId,
		templateId: 'RawTemplate',
		port: rawCodePort({ regionKind }),
		path: `nodes.${nodeId}.inputs.${inputName}`
	}
}

function partialExpression(
	code: string,
	unresolvedInputs: UnresolvedTemplateInput[],
	id = 'artifact'
): PartialTemplateArtifact {
	return {
		id,
		code,
		kind: 'expression',
		source: { templateId: 'ExpressionArtifact' },
		complete: false,
		unresolvedInputs
	}
}

function completeExpression(code = 'value'): CompleteTemplateArtifact {
	return {
		id: 'complete',
		code,
		kind: 'expression',
		source: { templateId: 'CompleteExpression' },
		complete: true
	}
}

function expectDiagnostic(result: TemplateArtifactResult, code: string): void {
	expect(result.ok).toBe(false)
	expect(result.diagnostics).toEqual(expect.arrayContaining([
		expect.objectContaining({ code, severity: 'error' })
	]))
}

function requirePartial(result: GraphPartialCompilationResult): PartialTemplateArtifact {
	expect(result.ok).toBe(true)
	if (!result.ok) throw new Error('Expected partial graph compilation to succeed.')
	expect(result.finalArtifact.complete).toBe(false)
	if (result.finalArtifact.complete !== false) throw new Error('Expected an unresolved artifact.')
	return result.finalArtifact
}

function singleInputFixture(nodeId = 'value') {
	const template = defineTemplate({
		modelId: 'DeterministicInput',
		inputs: {
			value: rawCodePort({ regionKind: 'expression' })
		},
		output: { kind: 'expression' },
		template: region => region('value')
	})
	const graph: SynthesisGraph = {
		nodes: [{ id: nodeId, templateId: template.modelId, inputs: {} }],
		finalNodeId: nodeId
	}
	return { template, graph }
}

describe('deterministic unresolved-input identities', () => {
	it('produces the same default IDs regardless of unrelated compilation history', () => {
		const fixture = singleInputFixture('stable')
		const first = requirePartial(compilePartialGraph(
			fixture.graph,
			createTemplateRegistry([fixture.template]),
			partialOptions()
		))

		const unrelated = singleInputFixture('unrelated')
		requirePartial(compilePartialGraph(
			unrelated.graph,
			createTemplateRegistry([unrelated.template]),
			partialOptions()
		))

		const second = requirePartial(compilePartialGraph(
			fixture.graph,
			createTemplateRegistry([fixture.template]),
			partialOptions()
		))
		expect(second.unresolvedInputs.map(input => input.id)).toEqual(
			first.unresolvedInputs.map(input => input.id)
		)
		expect(second.code).toBe(first.code)
	})

	it('uses compilationScope to reproduce or separate independently persisted artifacts', () => {
		const fixture = singleInputFixture('scoped')
		const compile = (compilationScope: string) => requirePartial(compilePartialGraph(
			fixture.graph,
			createTemplateRegistry([fixture.template]),
			partialOptions(compilationScope)
		))

		const first = compile('repair-session-a')
		const repeated = compile('repair-session-a')
		const independent = compile('repair-session-b')

		expect(repeated.unresolvedInputs[0]?.id).toBe(first.unresolvedInputs[0]?.id)
		expect(independent.unresolvedInputs[0]?.id).not.toBe(first.unresolvedInputs[0]?.id)
	})

	it('does not collide after marker-safe encoding of distinct authored node IDs', () => {
		const child = defineTemplate({
			modelId: 'CollisionChild',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'expression' },
			template: region => region('value')
		})
		const pair = defineTemplate({
			modelId: 'CollisionPair',
			inputs: {
				left: fragmentPort({ regionKind: 'expression', accepts: {} }),
				right: fragmentPort({ regionKind: 'expression', accepts: {} })
			},
			output: { kind: 'expression' },
			template: region => `(${region('left')}) + (${region('right')})`
		})
		const graph: SynthesisGraph = {
			nodes: [
				{ id: 'a-b', templateId: child.modelId, inputs: {} },
				{ id: 'a_b', templateId: child.modelId, inputs: {} },
				{
					id: 'pair',
					templateId: pair.modelId,
					inputs: { left: { $ref: 'a-b' }, right: { $ref: 'a_b' } }
				}
			],
			finalNodeId: 'pair'
		}
		const result = requirePartial(compilePartialGraph(
			graph,
			createTemplateRegistry([child, pair]),
			partialOptions('collision-test')
		))

		expect(result.unresolvedInputs).toHaveLength(2)
		expect(new Set(result.unresolvedInputs.map(input => input.id)).size).toBe(2)
		expect(new Set(result.unresolvedInputs.map(input => input.nodeId))).toEqual(new Set(['a-b', 'a_b']))
	})
})

describe('artifact fill-key resolution', () => {
	it('rejects unknown fill keys instead of silently ignoring them', () => {
		const artifact = partialExpression(marker('known'), [rawInput('known')])
		const result = fillTemplateArtifact(artifact, {
			typo: { kind: 'rawCode', code: 'value' }
		})

		expectDiagnostic(result, 'UnknownArtifactFillKey')
		expect(result.artifact).toEqual(artifact)
		expectDiagnostic(finalizeTemplateArtifact(artifact, {
			typo: { kind: 'rawCode', code: 'value' }
		}), 'UnknownArtifactFillKey')
	})

	it('rejects an ambiguous input-name alias and exposes the exact IDs', () => {
		const artifact = partialExpression(
			`(${marker('left')}) + (${marker('right')})`,
			[rawInput('left', 'value', 'leftNode'), rawInput('right', 'value', 'rightNode')]
		)
		const result = fillTemplateArtifact(artifact, {
			value: { kind: 'rawCode', code: 'replacement' }
		})

		expectDiagnostic(result, 'AmbiguousArtifactInputAlias')
		const expected = JSON.stringify(
			result.diagnostics.find(diagnostic => diagnostic.code === 'AmbiguousArtifactInputAlias')?.expected
		)
		expect(expected).toContain('left')
		expect(expected).toContain('right')
	})

	it('rejects exact and alias keys that target the same unresolved input', () => {
		const artifact = partialExpression(marker('opaque_id'), [rawInput('opaque_id', 'value')])
		const result = fillTemplateArtifact(artifact, {
			opaque_id: { kind: 'rawCode', code: 'exactValue' },
			value: { kind: 'rawCode', code: 'aliasValue' }
		})

		expectDiagnostic(result, 'ConflictingArtifactFillKeys')
	})

	it('diagnoses a consumed ID supplied again during a repeated fill', () => {
		const artifact = partialExpression(
			`(${marker('left')}) + (${marker('right')})`,
			[rawInput('left', 'left'), rawInput('right', 'right')]
		)
		const first = fillTemplateArtifact(artifact, {
			left: { kind: 'rawCode', code: 'one' }
		})
		expect(first.ok).toBe(true)
		if (!first.ok) return

		const repeated = fillTemplateArtifact(first.artifact, {
			left: { kind: 'rawCode', code: 'stale' },
			right: { kind: 'rawCode', code: 'two' }
		})
		expectDiagnostic(repeated, 'UnknownArtifactFillKey')
		expect(repeated.artifact).toEqual(first.artifact)
	})

	it('rejects nonempty fill and finalize calls for complete artifacts', () => {
		const artifact = completeExpression()
		const inputs = { value: { kind: 'rawCode' as const, code: 'ignored' } }

		expectDiagnostic(fillTemplateArtifact(artifact, inputs), 'ArtifactAlreadyComplete')
		expectDiagnostic(finalizeTemplateArtifact(artifact, inputs), 'ArtifactAlreadyComplete')
	})
})

describe('artifact marker invariants', () => {
	it('rejects duplicate unresolved metadata IDs', () => {
		const artifact = partialExpression(marker('duplicate'), [
			rawInput('duplicate', 'first', 'firstNode'),
			rawInput('duplicate', 'second', 'secondNode')
		])
		expectDiagnostic(fillTemplateArtifact(artifact, {}), 'DuplicateUnresolvedInputId')
	})

	it('rejects unresolved metadata without a corresponding marker', () => {
		const artifact = partialExpression('existingValue', [rawInput('missing')])
		expectDiagnostic(fillTemplateArtifact(artifact, {}), 'MissingArtifactMarker')
	})

	it('rejects markers without corresponding unresolved metadata', () => {
		const artifact = partialExpression(marker('unknown'), [])
		expectDiagnostic(fillTemplateArtifact(artifact, {}), 'UnknownArtifactMarker')
	})

	it('rejects complete artifacts that still contain marker regions', () => {
		const artifact = completeExpression(marker('ghost'))
		expectDiagnostic(fillTemplateArtifact(artifact, {}), 'CompleteArtifactContainsMarkers')
	})

	it('rejects marker kinds that disagree with unresolved port metadata', () => {
		const artifact: PartialTemplateArtifact = {
			id: 'statement',
			code: `${marker('value', 'expression')};`,
			kind: 'statement',
			source: { templateId: 'StatementArtifact' },
			complete: false,
			unresolvedInputs: [rawInput('value', 'value', 'statement', 'statement')]
		}
		expectDiagnostic(fillTemplateArtifact(artifact, {}), 'ArtifactMarkerKindMismatch')
	})

	it('allows repeated physical regions for one logical unresolved ID', () => {
		const artifact = partialExpression(
			`(${marker('shared')}) + (${marker('shared')})`,
			[rawInput('shared')]
		)
		const result = fillTemplateArtifact(artifact, {
			shared: { kind: 'rawCode', code: 'value' }
		})

		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.artifact.complete).toBe(true)
		expect(result.artifact.code).toBe('(value) + (value)')
	})

	it('rejects a partial child whose ID collides with a different remaining input', () => {
		const slot: UnresolvedTemplateInput = {
			id: 'slot',
			inputName: 'slot',
			nodeId: 'outer',
			templateId: 'Outer',
			port: fragmentPort({ regionKind: 'expression', accepts: {} })
		}
		const existing = rawInput('shared', 'existing', 'outer')
		const outer = partialExpression(
			`pair(${marker('slot')}, ${marker('shared')})`,
			[slot, existing],
			'outer'
		)
		const child = partialExpression(marker('shared'), [rawInput('shared', 'childValue', 'child')], 'child')

		const result = fillTemplateArtifact(outer, {
			slot: { kind: 'fragment', fragment: child }
		})
		expectDiagnostic(result, 'ArtifactInputIdCollision')
	})
})

describe('nested partial filling and persistence', () => {
	it('preserves marker metadata through structured fragment composition', () => {
		const array = defineTemplate({
			modelId: 'PartialStructuredArray',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'array' },
			template: region => `[${region('value')}]`
		})
		const consumer = defineTemplate({
			modelId: 'ConsumePartialStructuredArray',
			inputs: {
				value: fragmentPort({
					regionKind: 'array',
					accepts: { outputKind: 'array' }
				})
			},
			output: { kind: 'expression' },
			template: region => `consume(${region('value')})`
		})
		const compiled = requirePartial(compileGraph({
			nodes: [
				{ id: 'array', templateId: array.modelId, inputs: {} },
				{ id: 'consumer', templateId: consumer.modelId, inputs: { value: { $ref: 'array' } } }
			],
			finalNodeId: 'consumer'
		}, [array, consumer], { mode: 'partial' }))

		expect(compiled.unresolvedInputs).toHaveLength(1)
		const unresolvedId = compiled.unresolvedInputs[0]!.id
		expect(compiled.code).toContain(`id=${unresolvedId}`)
		const filled = fillTemplateArtifact(compiled, {
			[unresolvedId]: { kind: 'rawCode', code: 'item' }
		})
		expect(filled.ok).toBe(true)
		if (!filled.ok) return
		expect(filled.artifact.complete).toBe(true)
		expect(filled.artifact.code).toBe('consume([item])')
	})

	it('propagates a partial child input and completes only after the child is filled', () => {
		const outerInput: UnresolvedTemplateInput = {
			id: 'slot',
			inputName: 'slot',
			nodeId: 'outer',
			templateId: 'Outer',
			port: fragmentPort({ regionKind: 'expression', accepts: {} })
		}
		const outer = partialExpression(`wrap(${marker('slot')})`, [outerInput], 'outer')
		const child = partialExpression(marker('childValue'), [rawInput('childValue', 'value', 'child')], 'child')

		const composed = fillTemplateArtifact(outer, {
			slot: { kind: 'fragment', fragment: child }
		})
		expect(composed.ok).toBe(true)
		if (!composed.ok) return
		expect(composed.artifact.complete).toBe(false)
		if (composed.artifact.complete !== false) return
		expect(composed.artifact.unresolvedInputs.map(input => input.id)).toEqual(['childValue'])
		expect(composed.artifact.code).toContain('id=childValue')

		const completed = fillTemplateArtifact(composed.artifact, {
			childValue: { kind: 'rawCode', code: 'value' }
		})
		expect(completed.ok).toBe(true)
		if (!completed.ok) return
		expect(completed.artifact.complete).toBe(true)
		expect(completed.artifact.code).toBe('wrap(value)')
	})

	it('propagates unresolved inputs from every fragment-collection item', () => {
		const collectionInput: UnresolvedTemplateInput = {
			id: 'statements',
			inputName: 'statements',
			nodeId: 'outer',
			templateId: 'StatementCollection',
			port: fragmentCollectionPort({
				regionKind: 'statement',
				accepts: { outputKind: 'statement' },
				minItems: 1,
				separator: '\n'
			})
		}
		const outer: PartialTemplateArtifact = {
			id: 'outer',
			code: marker('statements', 'statement', 'throw new Error("pending");'),
			kind: 'statement',
			source: { templateId: 'StatementCollection' },
			complete: false,
			unresolvedInputs: [collectionInput]
		}
		const statementChild = (id: string): PartialTemplateArtifact => ({
			id,
			code: marker(id, 'statement', 'throw new Error("pending");'),
			kind: 'statement',
			source: { templateId: 'PartialStatement' },
			complete: false,
			unresolvedInputs: [rawInput(id, 'statement', id, 'statement')]
		})

		const composed = fillTemplateArtifact(outer, {
			statements: {
				kind: 'fragmentCollection',
				fragments: [statementChild('first'), statementChild('second')]
			}
		})
		expect(composed.ok).toBe(true)
		if (!composed.ok) return
		expect(composed.artifact.complete).toBe(false)
		if (composed.artifact.complete !== false) return
		expect(new Set(composed.artifact.unresolvedInputs.map(input => input.id)))
			.toEqual(new Set(['first', 'second']))

		const completed = fillTemplateArtifact(composed.artifact, {
			first: { kind: 'rawCode', code: 'one();' },
			second: { kind: 'rawCode', code: 'two();' }
		})
		expect(completed.ok).toBe(true)
		if (!completed.ok) return
		expect(completed.artifact.complete).toBe(true)
		expect(completed.artifact.code).toContain('one();')
		expect(completed.artifact.code).toContain('two();')
	})

	it('survives JSON round trips before and between incremental fills', () => {
		const template = defineTemplate({
			modelId: 'RoundTripPair',
			inputs: {
				left: rawCodePort({ regionKind: 'expression' }),
				right: rawCodePort({ regionKind: 'expression' })
			},
			output: { kind: 'expression' },
			template: region => `${region('left')} + ${region('right')}`
		})
		const graph: SynthesisGraph = {
			nodes: [{ id: 'pair', templateId: template.modelId, inputs: {} }],
			finalNodeId: 'pair'
		}
		const compiled = requirePartial(compilePartialGraph(
			graph,
			createTemplateRegistry([template]),
			partialOptions('persisted-repair')
		))
		const restored = JSON.parse(JSON.stringify(compiled)) as PartialTemplateArtifact
		expect(restored).toEqual(compiled)

		const leftId = restored.unresolvedInputs.find(input => input.inputName === 'left')?.id
		expect(leftId).toBeDefined()
		const first = fillTemplateArtifact(restored, {
			[leftId!]: { kind: 'rawCode', code: 'leftValue' }
		})
		expect(first.ok).toBe(true)
		if (!first.ok || first.artifact.complete !== false) return

		const restoredAgain = JSON.parse(JSON.stringify(first.artifact)) as PartialTemplateArtifact
		expect(restoredAgain).toEqual(first.artifact)
		const rightId = restoredAgain.unresolvedInputs.find(input => input.inputName === 'right')?.id
		expect(rightId).toBeDefined()
		const completed = fillTemplateArtifact(restoredAgain, {
			[rightId!]: { kind: 'rawCode', code: 'rightValue' }
		})
		expect(completed.ok).toBe(true)
		if (!completed.ok) return
		expect(completed.artifact.complete).toBe(true)
		expect(completed.artifact.code).toBe('leftValue + rightValue')
	})
})
