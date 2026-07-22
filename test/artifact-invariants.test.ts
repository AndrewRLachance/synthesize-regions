import { describe, expect, it } from 'vitest'
import {
	compileGraph,
	createTemplateRegistry,
	defineTemplate,
	fillTemplateArtifact,
	fillTemplateArtifactWithCatalog,
	finalizeTemplateArtifact,
	fragmentCollectionPort,
	fragmentPort,
	rawCodePort,
	validateTemplateArtifactIntegrity,
	type CompleteTemplateArtifact,
	type GraphCompileOptions,
	type GraphPartialCompilationResult,
	type PartialTemplateArtifact,
	type SynthesisGraph,
	type TemplateArtifactResult,
	type TemplateRegistry,
	type UnresolvedTemplateInput
} from '../src/index.js'

const TEST_MANIFEST_DIGEST = `t3_${'0'.repeat(64)}`

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
		source: { templateId: 'ExpressionArtifact', templateManifestDigest: TEST_MANIFEST_DIGEST },
		complete: false,
		unresolvedInputs
	}
}

function completeExpression(code = 'value'): CompleteTemplateArtifact {
	return {
		id: 'complete',
		code,
		kind: 'expression',
		source: { templateId: 'CompleteExpression', templateManifestDigest: TEST_MANIFEST_DIGEST },
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
		source: "/** @TYPE expression id=value **/undefined/** @END **/"
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
			source: "/** @TYPE expression id=value **/undefined/** @END **/"
		})
		const pair = defineTemplate({
			modelId: 'CollisionPair',
			inputs: {
				left: fragmentPort({ regionKind: 'expression', accepts: {} }),
				right: fragmentPort({ regionKind: 'expression', accepts: {} })
			},
			output: { kind: 'expression' },
			source: `(${"/** @TYPE expression id=left **/undefined/** @END **/"}) + (${"/** @TYPE expression id=right **/undefined/** @END **/"})`
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
	it('keeps legacy artifacts inspectable but refuses to resume them without exact manifest identity', () => {
		const artifact = partialExpression(marker('legacy'), [rawInput('legacy')])
		const legacy = { ...artifact, source: { templateId: artifact.source.templateId } }
		const result = fillTemplateArtifact(legacy, { legacy: { kind: 'rawCode', code: '1' } })
		expect(result).toMatchObject({
			ok: false,
			classification: 'terminalFailure',
			diagnostics: [expect.objectContaining({ code: 'MissingTemplateManifestIdentity' })]
		})
		expect(validateTemplateArtifactIntegrity(legacy)).toEqual([])
	})

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
		const template = defineTemplate({
			modelId: 'RepeatedFillPair',
			inputs: {
				left: rawCodePort({ regionKind: 'expression' }),
				right: rawCodePort({ regionKind: 'expression' })
			},
			output: { kind: 'expression' },
			source: `(${marker('left')}) + (${marker('right')})`
		})
		const artifact = requirePartial(compilePartialGraph(
			{ nodes: [{ id: 'pair', templateId: template.modelId, inputs: {} }], finalNodeId: 'pair' },
			createTemplateRegistry([template])
		))
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

		const filled = fillTemplateArtifact(artifact, inputs)
		expectDiagnostic(filled, 'ArtifactAlreadyComplete')
		if (!filled.ok) expect(filled.classification).toBe('terminalFailure')
		expectDiagnostic(finalizeTemplateArtifact(artifact, inputs), 'ArtifactAlreadyComplete')
	})

	it('treats semantic corruption in an already-complete persisted artifact as terminal', () => {
		const artifact: CompleteTemplateArtifact = {
			...completeExpression('"wrong"'),
			type: { ts: 'number' }
		}
		const result = fillTemplateArtifact(artifact, {}, { checkSemanticDiagnostics: true })
		expectDiagnostic(result, 'TypeScriptSemanticError')
		if (!result.ok) expect(result.classification).toBe('terminalFailure')
	})
})

describe('artifact marker invariants', () => {
	it('rejects persisted source spans that are reversed or outside artifact code', () => {
		const artifact: CompleteTemplateArtifact = {
			...completeExpression(),
			sourceMap: {
				version: 1,
				spans: [
					{
						kind: 'node', start: 4, end: 2, nestingDepth: 0,
						nodeId: 'complete', templateId: 'CompleteExpression'
					},
					{
						kind: 'input', start: 0, end: 99, nestingDepth: 0,
						nodeId: 'complete', templateId: 'CompleteExpression', inputName: 'value'
					}
				]
			}
		}

		const result = fillTemplateArtifact(artifact, {})
		expectDiagnostic(result, 'InvalidGeneratedSourceMap')
		if (!result.ok) expect(result.classification).toBe('terminalFailure')
		expect(result.diagnostics.filter(diagnostic => diagnostic.code === 'InvalidGeneratedSourceMap'))
			.toHaveLength(2)
	})

	it('keeps an invalid source map on a supplied child artifact fillable', () => {
		const slot: UnresolvedTemplateInput = {
			id: 'slot', inputName: 'slot', nodeId: 'outer', templateId: 'Outer',
			port: fragmentPort({ regionKind: 'expression', accepts: {} })
		}
		const outer = partialExpression(marker('slot'), [slot], 'outer')
		const invalidChild: CompleteTemplateArtifact = {
			id: 'child', code: '1', kind: 'expression',
			source: { templateId: 'ManualChild', templateManifestDigest: TEST_MANIFEST_DIGEST }, complete: true,
			sourceMap: {
				version: 1,
				spans: [{
					kind: 'node', start: 0, end: 2, nestingDepth: 0,
					nodeId: 'child', templateId: 'ManualChild'
				}]
			}
		}

		const result = fillTemplateArtifact(outer, {
			slot: { kind: 'fragment', fragment: invalidChild }
		})
		expectDiagnostic(result, 'InvalidGeneratedSourceMap')
		if (!result.ok) {
			expect(result.classification).toBe('artifactFillable')
			expect(result.artifact).toBe(outer)
		}
	})

	it('treats invalid persisted output and unresolved-port metadata as terminal corruption', () => {
		const unresolved: UnresolvedTemplateInput = {
			id: 'value',
			inputName: 'value',
			nodeId: 'artifact',
			templateId: 'InvalidMetadataArtifact',
			port: rawCodePort({
				regionKind: 'expression',
				type: { ts: 'any' },
				policy: { forbiddenPatterns: ['['] }
			})
		}
		const artifact: PartialTemplateArtifact = {
			...partialExpression(marker('value'), [unresolved]),
			type: { ts: 'any' }
		}

		const result = fillTemplateArtifact(artifact, {})
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(result.classification).toBe('terminalFailure')
		expect(result.diagnostics.map(diagnostic => diagnostic.code)).toEqual(
			expect.arrayContaining(['ForbiddenAnyType', 'InvalidRawCodePolicy'])
		)
	})

	it('classifies malformed persisted and child port shapes without throwing', () => {
		const malformedInput = {
			...rawInput('value'),
			port: { kind: 'union', options: null }
		} as unknown as UnresolvedTemplateInput
		const malformedParent = partialExpression(marker('value'), [malformedInput])
		const malformedOutput = {
			...malformedParent,
			type: { ts: 42 }
		} as unknown as PartialTemplateArtifact

		const parentResult = fillTemplateArtifact(malformedOutput, {})
		expectDiagnostic(parentResult, 'MalformedTemplateArtifact')
		if (!parentResult.ok) expect(parentResult.classification).toBe('terminalFailure')

		const slot: UnresolvedTemplateInput = {
			id: 'slot', inputName: 'slot', nodeId: 'outer', templateId: 'Outer',
			port: fragmentPort({ regionKind: 'expression', accepts: {} })
		}
		const outer = partialExpression(marker('slot'), [slot], 'outer')
		const malformedChild = partialExpression(marker('value'), [malformedInput], 'child')
		const childResult = fillTemplateArtifact(outer, {
			slot: { kind: 'fragment', fragment: malformedChild }
		})
		expectDiagnostic(childResult, 'MalformedTemplateArtifact')
		if (!childResult.ok) {
			expect(childResult.classification).toBe('artifactFillable')
			expect(childResult.artifact).toBe(outer)
		}
	})

	it('preserves metadata diagnostics when persisted marker discovery also fails', () => {
		const artifact: PartialTemplateArtifact = {
			...partialExpression('/** @TYPE expression id=value **/undefined', [rawInput('value')]),
			type: { ts: 'any' }
		}
		const result = fillTemplateArtifact(artifact, {})
		expect(result.ok).toBe(false)
		expect(result.diagnostics.map(diagnostic => diagnostic.code)).toEqual(
			expect.arrayContaining(['ForbiddenAnyType', 'MalformedArtifactMarkers'])
		)
	})

	it('reports invalid legacy artifact schema details at the persisted alias path', () => {
		const artifact = {
			...completeExpression(),
			schema: { type: 'not-a-json-schema-type' }
		} as unknown as CompleteTemplateArtifact

		const diagnostics = validateTemplateArtifactIntegrity(artifact)
		const schemaDiagnostics = diagnostics.filter(diagnostic => diagnostic.code === 'InvalidJsonSchema')
		expect(schemaDiagnostics.length).toBeGreaterThan(0)
		expect(schemaDiagnostics.every(diagnostic => diagnostic.path === 'schema.type')).toBe(true)
	})

	it('keeps invalid metadata on a supplied child fragment artifact-fillable', () => {
		const slot: UnresolvedTemplateInput = {
			id: 'slot',
			inputName: 'slot',
			nodeId: 'outer',
			templateId: 'Outer',
			port: fragmentPort({ regionKind: 'expression', accepts: {} })
		}
		const outer = partialExpression(marker('slot'), [slot], 'outer')
		const invalidChild: CompleteTemplateArtifact = {
			id: 'child',
			code: '1',
			kind: 'expression',
			source: { templateId: 'ManualChild', templateManifestDigest: TEST_MANIFEST_DIGEST },
			type: { ts: 'any' },
			complete: true
		}

		const result = fillTemplateArtifact(outer, {
			slot: { kind: 'fragment', fragment: invalidChild }
		})
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(result.classification).toBe('artifactFillable')
		expect(result.artifact).toBe(outer)
		expect(result.diagnostics.map(diagnostic => diagnostic.code)).toContain('ForbiddenAnyType')
	})

	it('rejects duplicate unresolved metadata IDs', () => {
		const artifact = partialExpression(marker('duplicate'), [
			rawInput('duplicate', 'first', 'firstNode'),
			rawInput('duplicate', 'second', 'secondNode')
		])
		const result = fillTemplateArtifact(artifact, {})
		expectDiagnostic(result, 'DuplicateUnresolvedInputId')
		if (!result.ok) expect(result.classification).toBe('terminalFailure')
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
			source: { templateId: 'StatementArtifact', templateManifestDigest: TEST_MANIFEST_DIGEST },
			complete: false,
			unresolvedInputs: [rawInput('value', 'value', 'statement', 'statement')]
		}
		expectDiagnostic(fillTemplateArtifact(artifact, {}), 'ArtifactMarkerKindMismatch')
	})

	it('allows repeated physical regions for one logical unresolved ID', () => {
		const child = defineTemplate({
			modelId: 'RepeatedPhysicalChild',
			inputs: { shared: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'expression' },
			source: marker('shared')
		})
		const pair = defineTemplate({
			modelId: 'RepeatedPhysicalPair',
			inputs: {
				left: fragmentPort({
					regionKind: 'expression',
					accepts: { outputKind: 'expression', sourceModelIds: [child.modelId] }
				}),
				right: fragmentPort({
					regionKind: 'expression',
					accepts: { outputKind: 'expression', sourceModelIds: [child.modelId] }
				})
			},
			output: { kind: 'expression' },
			source: `(${marker('left')}) + (${marker('right')})`
		})
		const artifact = requirePartial(compilePartialGraph(
			{
				nodes: [
					{ id: 'shared', templateId: child.modelId, inputs: {} },
					{
						id: 'repeated', templateId: pair.modelId,
						inputs: { left: { $ref: 'shared' }, right: { $ref: 'shared' } }
					}
				],
				finalNodeId: 'repeated'
			},
			createTemplateRegistry([child, pair])
		))
		const result = fillTemplateArtifact(artifact, {
			shared: { kind: 'rawCode', code: 'value' }
		})

		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.artifact.complete).toBe(true)
		expect(result.artifact.code).toBe('(value) + (value)')
	})

	it('rejects a partial child whose ID collides with a different remaining input', () => {
		const childTemplate = defineTemplate({
			modelId: 'CollisionPartialChild',
			inputs: { childValue: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'expression' },
			source: marker('childValue')
		})
		const outerTemplate = defineTemplate({
			modelId: 'CollisionPartialOuter',
			inputs: {
				slot: fragmentPort({
					regionKind: 'expression',
					accepts: { outputKind: 'expression', sourceModelIds: [childTemplate.modelId] }
				}),
				existing: rawCodePort({ regionKind: 'expression' })
			},
			output: { kind: 'expression' },
			source: `pair(${marker('slot')}, ${marker('existing')})`
		})
		const catalog = createTemplateRegistry([childTemplate, outerTemplate]).snapshot()
		const outer = requirePartial(compilePartialGraph(
			{ nodes: [{ id: 'outer', templateId: outerTemplate.modelId, inputs: {} }], finalNodeId: 'outer' },
			createTemplateRegistry([childTemplate, outerTemplate])
		))
		const child = requirePartial(compilePartialGraph(
			{ nodes: [{ id: 'child', templateId: childTemplate.modelId, inputs: {} }], finalNodeId: 'child' },
			createTemplateRegistry([childTemplate, outerTemplate])
		))
		const slot = outer.unresolvedInputs.find(input => input.inputName === 'slot')!
		const existing = outer.unresolvedInputs.find(input => input.inputName === 'existing')!
		const childInput = child.unresolvedInputs[0]!
		const collidingChild: PartialTemplateArtifact = {
			...child,
			code: child.code.replaceAll(childInput.id, existing.id),
			unresolvedInputs: [{ ...childInput, id: existing.id }]
		}

		const result = fillTemplateArtifactWithCatalog(outer, {
			[slot.id]: { kind: 'fragment', fragment: collidingChild }
		}, catalog, { trustedBaseArtifact: true })
		expectDiagnostic(result, 'ArtifactInputIdCollision')
		if (!result.ok) expect(result.classification).toBe('artifactFillable')
	})
})

describe('nested partial filling and persistence', () => {
	it('preserves marker metadata through structured fragment composition', () => {
		const array = defineTemplate({
			modelId: 'PartialStructuredArray',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'array' },
			source: `[${"/** @TYPE expression id=value **/undefined/** @END **/"}]`
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
			source: `consume(${"/** @TYPE array id=value **/[]/** @END **/"})`
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
		const childTemplate = defineTemplate({
			modelId: 'NestedPartialChild',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'expression' },
			source: marker('value')
		})
		const outerTemplate = defineTemplate({
			modelId: 'NestedPartialOuter',
			inputs: {
				slot: fragmentPort({
					regionKind: 'expression',
					accepts: { outputKind: 'expression', sourceModelIds: [childTemplate.modelId] }
				})
			},
			output: { kind: 'expression' },
			source: `wrap(${marker('slot')})`
		})
		const registry = createTemplateRegistry([childTemplate, outerTemplate])
		const outer = requirePartial(compilePartialGraph(
			{ nodes: [{ id: 'outer', templateId: outerTemplate.modelId, inputs: {} }], finalNodeId: 'outer' },
			registry
		))
		const child = requirePartial(compilePartialGraph(
			{ nodes: [{ id: 'child', templateId: childTemplate.modelId, inputs: {} }], finalNodeId: 'child' },
			registry
		))
		const slotId = outer.unresolvedInputs.find(input => input.inputName === 'slot')!.id

		const composed = fillTemplateArtifact(outer, {
			[slotId]: { kind: 'fragment', fragment: child }
		})
		expect(composed.ok).toBe(true)
		if (!composed.ok) return
		expect(composed.artifact.complete).toBe(false)
		if (composed.artifact.complete !== false) return
		const childValueId = composed.artifact.unresolvedInputs[0]!.id
		expect(composed.artifact.unresolvedInputs.map(input => input.inputName)).toEqual(['value'])
		expect(composed.artifact.code).toContain(`id=${childValueId}`)

		const completed = fillTemplateArtifact(composed.artifact, {
			[childValueId]: { kind: 'rawCode', code: 'value' }
		})
		expect(completed.ok).toBe(true)
		if (!completed.ok) return
		expect(completed.artifact.complete).toBe(true)
		expect(completed.artifact.code).toBe('wrap(value)')
	})

	it('propagates unresolved inputs from every fragment-collection item', () => {
		const statementTemplate = defineTemplate({
			modelId: 'NestedPartialStatement',
			inputs: { statement: rawCodePort({ regionKind: 'statement' }) },
			output: { kind: 'statement' },
			source: marker('statement', 'statement', 'throw new Error("pending");')
		})
		const collectionTemplate = defineTemplate({
			modelId: 'NestedStatementCollection',
			inputs: {
				statements: fragmentCollectionPort({
					regionKind: 'statement',
					accepts: { outputKind: 'statement', sourceModelIds: [statementTemplate.modelId] },
					minItems: 1,
					separator: '\n'
				})
			},
			output: { kind: 'statement' },
			source: marker('statements', 'statement', 'throw new Error("pending");')
		})
		const registry = createTemplateRegistry([statementTemplate, collectionTemplate])
		const outer = requirePartial(compilePartialGraph(
			{ nodes: [{ id: 'outer', templateId: collectionTemplate.modelId, inputs: {} }], finalNodeId: 'outer' },
			registry
		))
		const statementChild = (id: string): PartialTemplateArtifact => requirePartial(compilePartialGraph(
			{ nodes: [{ id, templateId: statementTemplate.modelId, inputs: {} }], finalNodeId: id },
			registry,
			partialOptions(`statement-${id}`)
		))
		const collectionId = outer.unresolvedInputs[0]!.id

		const composed = fillTemplateArtifact(outer, {
			[collectionId]: {
				kind: 'fragmentCollection',
				fragments: [statementChild('first'), statementChild('second')]
			}
		})
		expect(composed.ok).toBe(true)
		if (!composed.ok) return
		expect(composed.artifact.complete).toBe(false)
		if (composed.artifact.complete !== false) return
		expect(new Set(composed.artifact.unresolvedInputs.map(input => input.nodeId)))
			.toEqual(new Set(['first', 'second']))
		const firstId = composed.artifact.unresolvedInputs.find(input => input.nodeId === 'first')!.id
		const secondId = composed.artifact.unresolvedInputs.find(input => input.nodeId === 'second')!.id

		const completed = fillTemplateArtifact(composed.artifact, {
			[firstId]: { kind: 'rawCode', code: 'one();' },
			[secondId]: { kind: 'rawCode', code: 'two();' }
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
			source: `${"/** @TYPE expression id=left **/undefined/** @END **/"} + ${"/** @TYPE expression id=right **/undefined/** @END **/"}`
		})
		const graph: SynthesisGraph = {
			nodes: [{ id: 'pair', templateId: template.modelId, inputs: {} }],
			finalNodeId: 'pair'
		}
		const registry = createTemplateRegistry([template])
		const compiled = requirePartial(compilePartialGraph(
			graph,
			registry,
			partialOptions('persisted-repair')
		))
		const restored = JSON.parse(JSON.stringify(compiled)) as PartialTemplateArtifact
		expect(restored).toEqual(compiled)

		const leftId = restored.unresolvedInputs.find(input => input.inputName === 'left')?.id
		expect(leftId).toBeDefined()
		expectDiagnostic(fillTemplateArtifact(restored, {
			[leftId!]: { kind: 'rawCode', code: 'leftValue' }
		}), 'ArtifactCatalogRequired')
		const first = fillTemplateArtifactWithCatalog(restored, {
			[leftId!]: { kind: 'rawCode', code: 'leftValue' }
		}, registry.snapshot())
		expect(first.ok).toBe(true)
		if (!first.ok || first.artifact.complete !== false) return

		const restoredAgain = JSON.parse(JSON.stringify(first.artifact)) as PartialTemplateArtifact
		expect(restoredAgain).toEqual(first.artifact)
		const rightId = restoredAgain.unresolvedInputs.find(input => input.inputName === 'right')?.id
		expect(rightId).toBeDefined()
		const completed = fillTemplateArtifactWithCatalog(restoredAgain, {
			[rightId!]: { kind: 'rawCode', code: 'rightValue' }
		}, registry.snapshot())
		expect(completed.ok).toBe(true)
		if (!completed.ok) return
		expect(completed.artifact.complete).toBe(true)
		expect(completed.artifact.code).toBe('leftValue + rightValue')
	})
})
