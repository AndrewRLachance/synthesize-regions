import { describe, expect, it } from 'vitest'
import {
	compileGraph,
	createTemplateRegistry,
	defineTemplate,
	fillTemplateArtifactWithCatalog,
	fragmentCollectionPort,
	fragmentPort,
	rawCodePort,
	type GraphCompilationResult,
	type SynthesisDiagnostic,
	type SynthesisGraph
} from '../src/index.js'

function semanticErrors(result: Pick<GraphCompilationResult, 'diagnostics'>): SynthesisDiagnostic[] {
	return result.diagnostics.filter(diagnostic => diagnostic.code === 'TypeScriptSemanticError')
}

function nestedExpressionTemplates(prefix: string) {
	const leaf = defineTemplate({
		modelId: `${prefix}Leaf`,
		inputs: { value: rawCodePort({ regionKind: 'expression' }) },
		output: { kind: 'expression' },
		source: "/** @TYPE expression id=value **/undefined/** @END **/"
	})
	const middle = defineTemplate({
		modelId: `${prefix}Middle`,
		inputs: {
			child: fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression' } })
		},
		output: { kind: 'expression' },
		source: `(${"/** @TYPE expression id=child **/undefined/** @END **/"})`
	})
	const root = defineTemplate({
		modelId: `${prefix}Root`,
		inputs: {
			child: fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression' } })
		},
		output: { kind: 'statement' },
		source: `const generated: number = ${"/** @TYPE expression id=child **/undefined/** @END **/"};`
	})
	return { leaf, middle, root, catalog: [leaf, middle, root] as const }
}

function nestedGraph(
	prefix: string,
	leafInputs: SynthesisGraph['nodes'][number]['inputs']
): SynthesisGraph {
	return {
		nodes: [
			{ id: `${prefix}LeafNode`, templateId: `${prefix}Leaf`, inputs: leafInputs },
			{
				id: `${prefix}MiddleNode`,
				templateId: `${prefix}Middle`,
				inputs: { child: { $ref: `${prefix}LeafNode` } }
			},
			{
				id: `${prefix}RootNode`,
				templateId: `${prefix}Root`,
				inputs: { child: { $ref: `${prefix}MiddleNode` } }
			}
		],
		finalNodeId: `${prefix}RootNode`
	}
}

describe('graph semantic diagnostic attribution', () => {
	it('attributes a three-level nested semantic error to the deepest raw input', () => {
		const prefix = 'NestedAttribution'
		const templates = nestedExpressionTemplates(prefix)
		const graph = nestedGraph(prefix, { value: { kind: 'rawCode', code: 'missingNestedValue' } })
		const result = compileGraph(graph, templates.catalog, { checkSemanticDiagnostics: true })

		expect(result.ok).toBe(false)
		expect(semanticErrors(result)).toEqual(expect.arrayContaining([
			expect.objectContaining({
				compilerCode: 2304,
				nodeId: `${prefix}LeafNode`,
				templateId: templates.leaf.modelId,
				inputName: 'value'
			})
		]))
	})

	it('preserves variadic collection order and attributes the failing item', () => {
		const first = defineTemplate({
			modelId: 'AttributionFirstStatement',
			inputs: {},
			output: { kind: 'statement' },
			source: 'const first = 1;'
		})
		const bad = defineTemplate({
			modelId: 'AttributionBadStatement',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'statement' },
			source: `const second: number = ${"/** @TYPE expression id=value **/undefined/** @END **/"};`
		})
		const third = defineTemplate({
			modelId: 'AttributionThirdStatement',
			inputs: {},
			output: { kind: 'statement' },
			source: 'const third = 3;'
		})
		const collection = defineTemplate({
			modelId: 'AttributionStatementCollection',
			inputs: {
				statements: fragmentCollectionPort({
					regionKind: 'statement',
					accepts: { outputKind: 'statement' },
					separator: '\n',
					minItems: 1
				})
			},
			output: { kind: 'statement' },
			source: "/** @TYPE statement id=statements **/throw new Error(\"placeholder\");/** @END **/"
		})
		const catalog = [first, bad, third, collection] as const
		const graph: SynthesisGraph = {
			nodes: [
				{ id: 'firstItem', templateId: first.modelId, inputs: {} },
				{ id: 'badItem', templateId: bad.modelId, inputs: { value: { kind: 'rawCode', code: 'missingCollectionValue' } } },
				{ id: 'thirdItem', templateId: third.modelId, inputs: {} },
				{
					id: 'collection',
					templateId: collection.modelId,
					inputs: {
						statements: {
							kind: 'fragmentCollection',
							items: [{ $ref: 'firstItem' }, { $ref: 'badItem' }, { $ref: 'thirdItem' }]
						}
					}
				}
			],
			finalNodeId: 'collection'
		}

		const unchecked = compileGraph(graph, catalog)
		expect(unchecked.ok).toBe(true)
		if (unchecked.ok) {
			const code = unchecked.finalArtifact.code
			expect(code.indexOf('const first')).toBeLessThan(code.indexOf('const second'))
			expect(code.indexOf('const second')).toBeLessThan(code.indexOf('const third'))
		}

		const checked = compileGraph(graph, catalog, { checkSemanticDiagnostics: true })
		expect(checked.ok).toBe(false)
		expect(semanticErrors(checked)).toEqual(expect.arrayContaining([
			expect.objectContaining({
				compilerCode: 2304,
				nodeId: 'badItem',
				templateId: bad.modelId,
				inputName: 'value'
			})
		]))
	})

	it('retains deepest attribution after ts-morph formatting changes offsets', () => {
		const formatted = defineTemplate({
			modelId: 'FormattedAttributionStatement',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'statement' },
			source: `function generated(){\nconst formatted:number=${"/** @TYPE expression id=value **/undefined/** @END **/"};\n}`
		})
		const graph: SynthesisGraph = {
			nodes: [{
				id: 'formattedNode',
				templateId: formatted.modelId,
				inputs: { value: { kind: 'rawCode', code: 'missingFormattedValue' } }
			}],
			finalNodeId: 'formattedNode'
		}

		const rendered = compileGraph(graph, [formatted], { format: 'ts-morph' })
		expect(rendered.ok).toBe(true)
		if (rendered.ok) {
			expect(rendered.finalArtifact.code).toContain('const formatted: number = missingFormattedValue;')
			expect(rendered.finalArtifact.sourceMap?.spans).toEqual(expect.arrayContaining([
				expect.objectContaining({
					kind: 'node', nodeId: 'formattedNode', nestingDepth: 0,
					start: 0, end: rendered.finalArtifact.code.length
				}),
				expect.objectContaining({
					kind: 'input', nodeId: 'formattedNode', inputName: 'value', nestingDepth: 1
				})
			]))
		}

		const checked = compileGraph(graph, [formatted], {
			format: 'ts-morph',
			checkSemanticDiagnostics: true
		})
		expect(checked.ok).toBe(false)
		expect(semanticErrors(checked)).toEqual(expect.arrayContaining([
			expect.objectContaining({
				compilerCode: 2304,
				nodeId: 'formattedNode',
				templateId: formatted.modelId,
				inputName: 'value'
			})
		]))
	})

	it('preserves nested ownership through JSON roundtrip and final artifact filling', () => {
		const prefix = 'FilledAttribution'
		const templates = nestedExpressionTemplates(prefix)
		const catalog = createTemplateRegistry(templates.catalog).snapshot()
		const graph = nestedGraph(prefix, {})
		const partial = compileGraph(graph, catalog, {
			mode: 'partial',
			checkSemanticDiagnostics: true,
			compilationScope: 'semantic-attribution-roundtrip'
		})
		expect(partial.ok).toBe(true)
		if (!partial.ok || partial.finalArtifact.complete !== false) return

		const restored = JSON.parse(JSON.stringify(partial.finalArtifact)) as typeof partial.finalArtifact
		const unresolved = restored.unresolvedInputs.find(input => input.nodeId === `${prefix}LeafNode` && input.inputName === 'value')
		expect(unresolved).toBeDefined()
		const filled = fillTemplateArtifactWithCatalog(restored, {
			[unresolved!.id]: { kind: 'rawCode', code: 'missingFilledValue' }
		}, catalog, { checkSemanticDiagnostics: true })

		expect(filled.ok).toBe(false)
		if (!filled.ok) expect(filled.classification).toBe('artifactFillable')
		expect(filled.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({
				code: 'TypeScriptSemanticError',
				compilerCode: 2304,
				nodeId: `${prefix}LeafNode`,
				templateId: templates.leaf.modelId,
				inputName: 'value'
			})
		]))
	})

	it('attributes virtual target errors to generated children and filters baseline errors', () => {
		const leaf = defineTemplate({
			modelId: 'VirtualTargetLeaf',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'expression' },
			source: "/** @TYPE expression id=value **/undefined/** @END **/"
		})
		const parent = defineTemplate({
			modelId: 'VirtualTargetParent',
			inputs: { child: fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression' } }) },
			output: { kind: 'expression' },
			source: `(${"/** @TYPE expression id=child **/undefined/** @END **/"})`
		})
		const graph: SynthesisGraph = {
			nodes: [
				{
					id: 'virtualLeaf',
					templateId: leaf.modelId,
					inputs: { value: { kind: 'rawCode', code: 'localValue + missingValue' } }
				},
				{ id: 'virtualParent', templateId: parent.modelId, inputs: { child: { $ref: 'virtualLeaf' } } }
			],
			finalNodeId: 'virtualParent'
		}
		const placeholder = 'PLACEHOLDER'
		const sourceText = [
			'const existing: number = "already wrong";',
			'declare const localValue: number;',
			`const generated = ${placeholder};`
		].join('\n')
		const start = sourceText.indexOf(placeholder)
		const result = compileGraph(graph, [leaf, parent], {
			checkSemanticDiagnostics: true,
			semanticContext: {
				targetFile: {
					filePath: '/virtual/semantic-attribution.ts',
					sourceText,
					start,
					end: start + placeholder.length
				}
			}
		})

		expect(result.ok).toBe(false)
		const diagnostics = semanticErrors(result)
		expect(diagnostics.some(diagnostic => diagnostic.message.includes('already wrong'))).toBe(false)
		expect(diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({
				compilerCode: 2304,
				nodeId: 'virtualLeaf',
				templateId: leaf.modelId,
				inputName: 'value',
				path: '/virtual/semantic-attribution.ts'
			})
		]))
	})

	it('derives every graph semantic wrapper from artifact kind despite caller overrides', () => {
		const cases = [
			{
				modelId: 'OverrideIgnoredExpression', kind: 'expression' as const,
				output: { kind: 'expression' as const, type: { ts: 'number' } },
				code: '"wrong"', override: { kind: 'statementList' as const }
			},
			{
				modelId: 'OverrideIgnoredStatement', kind: 'statement' as const,
				output: { kind: 'statement' as const },
				code: 'missingStatement();', override: { kind: 'expression' as const }
			},
			{
				modelId: 'OverrideIgnoredProperty', kind: 'objectProperty' as const,
				output: { kind: 'objectProperty' as const },
				code: 'value: missingProperty', override: { kind: 'expressionSuffix' as const }
			},
			{
				modelId: 'OverrideIgnoredSuffix', kind: 'expressionSuffix' as const,
				output: { kind: 'expressionSuffix' as const, type: { ts: 'boolean' } },
				code: '.length', override: { kind: 'objectPropertyList' as const }
			}
		]

		for (const item of cases) {
			const template = defineTemplate({
				modelId: item.modelId,
				inputs: {},
				output: item.output,
				source: item.code
			})
			const nodeId = `advertised-${item.kind}`
			const result = compileGraph({
				nodes: [{ id: nodeId, templateId: template.modelId, inputs: {} }],
				finalNodeId: nodeId
			}, [template], {
				checkSemanticDiagnostics: true,
				templateMode: item.override
			})

			expect(result.ok, item.kind).toBe(false)
			expect(semanticErrors(result), item.kind).toEqual(expect.arrayContaining([
				expect.objectContaining({ nodeId, templateId: template.modelId })
			]))
		}
	})

	it('classifies invalid virtual target configuration as terminal', () => {
		const template = defineTemplate({
			modelId: 'InvalidTargetExpression',
			inputs: {},
			output: { kind: 'expression' },
			source: '1'
		})
		const result = compileGraph({
			nodes: [{ id: 'invalidTarget', templateId: template.modelId, inputs: {} }],
			finalNodeId: 'invalidTarget'
		}, [template], {
			checkSemanticDiagnostics: true,
			semanticContext: {
				targetFile: { filePath: '/virtual/invalid-target.ts', sourceText: 'const value = 0;', start: 99 }
			}
		})

		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.classification).toBe('terminalFailure')
		expect(result.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({ code: 'InvalidSemanticTarget', nodeId: 'invalidTarget' })
		]))
	})
})
