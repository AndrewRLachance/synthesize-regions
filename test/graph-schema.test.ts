import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ValidateFunction } from 'ajv'
import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import {
	compileGraph,
	createTemplateRegistry,
	defineTemplate,
	fragmentCollectionPort,
	fragmentPort,
	graphTemplateDefinitionToJsonSchema,
	literalPort,
	rawCodePort,
	REGION_KIND_VALUES,
	templateRegistryToSynthesisGraphJsonSchema,
	unionPort
} from '../src/index.js'
import type { SynthesisGraph } from '../src/index.js'

const currentDir = fileURLToPath(new URL('.', import.meta.url))
const rootDir = join(currentDir, '..')
const publishedSchemaPaths = [
	'schemas/supported-json-schema.schema.json',
	'schemas/synthesis-graph.schema.json',
	'schemas/template-summary.schema.json',
	'schemas/graph-compilation-result.schema.json',
	'schemas/graph-runner-action.schema.json',
	'schemas/graph-runner-state.schema.json'
] as const

function readJson(path: string): Record<string, unknown> {
	return JSON.parse(readFileSync(join(rootDir, path), 'utf8')) as Record<string, unknown>
}

function compilePublishedSchema(path: string): {
	schema: Record<string, unknown>
	validate: ValidateFunction<unknown>
} {
	const ajv = new Ajv2020({ allErrors: true, strict: true })
	const schemas = new Map(publishedSchemaPaths.map(schemaPath => [schemaPath, readJson(schemaPath)]))
	for (const publishedSchema of schemas.values()) ajv.addSchema(publishedSchema)

	const schema = schemas.get(path)
	if (!schema || typeof schema.$id !== 'string') throw new Error(`Unknown published schema: ${path}`)
	const validate = ajv.getSchema(schema.$id)
	if (!validate) throw new Error(`Ajv did not compile published schema: ${path}`)
	return { schema, validate }
}

function expectValid(validate: ValidateFunction<unknown>, value: unknown): void {
	const valid = validate(value)
	expect(valid, JSON.stringify(validate.errors, null, 2)).toBe(true)
}

function expectInvalid(validate: ValidateFunction<unknown>, value: unknown): void {
	expect(validate(value)).toBe(false)
	expect(validate.errors).not.toBeNull()
}

const SummaryShowcase = defineTemplate({
	modelId: 'SummaryShowcase',
	version: '1.2.3',
	description: 'Exercises every planner-facing input-port summary.',
	inputs: {
		literal: literalPort({
			regionKind: 'expression',
			required: false,
			description: 'A bounded number.',
			schema: { type: 'number', minimum: 0 }
		}),
		fragment: fragmentPort({
			regionKind: 'expression',
			required: false,
			description: 'A numeric expression fragment.',
			accepts: {
				outputKind: 'expression',
				type: { ts: 'number', schema: { type: 'number' } },
				sourceModelIds: ['NumberExpression']
			}
		}),
		fragments: fragmentCollectionPort({
			regionKind: 'expression',
			required: false,
			description: 'An ordered collection of numeric expressions.',
			accepts: {
				outputKind: 'expression',
				type: { ts: 'number' },
				sourceModelIds: ['NumberExpression']
			},
			maxItems: 4
		}),
		raw: rawCodePort({
			regionKind: 'expression',
			required: false,
			description: 'A constrained numeric expression.',
			policy: {
				description: 'Single-line arithmetic only.',
				maxLength: 80,
				allowNewlines: false,
				forbiddenSubstrings: ['eval', 'Function'],
				forbiddenPatterns: ['\\bprocess\\b']
			},
			type: { ts: 'number' }
		}),
		choice: unionPort({
			required: false,
			description: 'A recursively summarized union.',
			options: [
				literalPort({
					regionKind: 'expression',
					schema: { type: 'number' }
				}),
				unionPort({
					options: [
						rawCodePort({ regionKind: 'expression' }),
						fragmentPort({
							regionKind: 'expression',
							accepts: { outputKind: 'expression' }
						})
					]
				})
			]
		})
	},
	output: {
		kind: 'expression',
		type: { ts: 'number' },
		schema: { type: 'number' },
		description: 'A numeric expression.'
	},
	template: region => region('choice')
})

const NumberExpression = defineTemplate({
	modelId: 'NumberExpression',
	inputs: {
		value: literalPort({
			regionKind: 'number',
			schema: { type: 'number' }
		})
	},
	output: {
		kind: 'expression',
		type: { ts: 'number', schema: { type: 'number' } },
		schema: { type: 'number' }
	},
	template: region => region('value')
})

const RequiredExpression = defineTemplate({
	modelId: 'RequiredExpression',
	inputs: {
		value: rawCodePort({
			regionKind: 'expression',
			policy: { allowNewlines: false },
			type: { ts: 'number' }
		})
	},
	output: { kind: 'expression', type: { ts: 'number' } },
	template: region => region('value')
})

const SemanticMismatch = defineTemplate({
	modelId: 'SemanticMismatch',
	inputs: {},
	output: { kind: 'statement' },
	template: () => 'const value: number = "wrong";'
})

const graphFixture = {
	nodes: [
		{
			id: 'source',
			templateId: 'NumberExpression',
			inputs: {
				value: { kind: 'literal', value: 1 }
			}
		},
		{
			id: 'root',
			templateId: 'StructuralShowcase',
			inputs: {
				literal: { kind: 'literal', value: { enabled: true } },
				raw: { kind: 'rawCode', code: 'externalValue + 1' },
				explicitReference: { kind: 'ref', nodeId: 'source' },
				shorthandReference: { $ref: 'source' },
				inline: {
					kind: 'inline',
					node: {
						id: 'inlineParent',
						templateId: 'InlineParent',
						inputs: {
							child: {
								kind: 'inline',
								node: {
									id: 'inlineChild',
									templateId: 'InlineChild',
									inputs: {
										value: { kind: 'literal', value: 'nested' }
									}
								}
							}
						}
					}
				},
				collection: {
					kind: 'fragmentCollection',
					items: [
						{ kind: 'ref', nodeId: 'source' },
						{ $ref: 'source' },
						{
							kind: 'inline',
							node: {
								id: 'inlineCollectionItem',
								templateId: 'NumberExpression',
								inputs: {
									value: { kind: 'literal', value: 2 },
									raw: { kind: 'rawCode', code: '2 + 2' }
								}
							}
						}
					]
				}
			}
		}
	],
	finalNodeId: 'root',
	goal: {
		outputKind: 'expression',
		type: { ts: 'number', schema: { type: 'number' } },
		schema: { type: 'number' }
	}
} satisfies SynthesisGraph

const mappedCompleteArtifact = {
	id: 'mapped',
	code: 'value',
	kind: 'expression',
	source: { templateId: 'MappedExpression' },
	sourceMap: {
		version: 1,
		spans: [
			{
				kind: 'node', start: 0, end: 5, nestingDepth: 0,
				nodeId: 'mapped', templateId: 'MappedExpression'
			},
			{
				kind: 'input', start: 0, end: 5, nestingDepth: 1,
				nodeId: 'mapped', templateId: 'MappedExpression', inputName: 'value'
			}
		]
	},
	complete: true
} as const

describe('published graph JSON Schemas', () => {
	it('publishes and compiles each canonical schema as draft 2020-12', () => {
		for (const path of publishedSchemaPaths) {
			const { schema, validate } = compilePublishedSchema(path)
			expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
			expect(validate).toBeTypeOf('function')
		}
	})

	it('exports every published schema from a package subpath', () => {
		const packageJson = readJson('package.json')
		const exportsMap = packageJson.exports as Record<string, unknown>

		expect(exportsMap['./schemas/replacement-map.schema.json']).toBe('./schemas/replacement-map.schema.json')
		expect(exportsMap['./schemas/supported-json-schema.schema.json']).toBe('./schemas/supported-json-schema.schema.json')
		expect(exportsMap['./schemas/synthesis-graph.schema.json']).toBe('./schemas/synthesis-graph.schema.json')
		expect(exportsMap['./schemas/template-summary.schema.json']).toBe('./schemas/template-summary.schema.json')
		expect(exportsMap['./schemas/graph-compilation-result.schema.json']).toBe('./schemas/graph-compilation-result.schema.json')
		expect(exportsMap['./schemas/graph-runner-action.schema.json']).toBe('./schemas/graph-runner-action.schema.json')
		expect(exportsMap['./schemas/graph-runner-state.schema.json']).toBe('./schemas/graph-runner-state.schema.json')
	})

	it('publishes the closed supported JSON Schema dialect', () => {
		const { validate } = compilePublishedSchema('schemas/supported-json-schema.schema.json')
		expectValid(validate, {
			$defs: { item: { type: 'string', minLength: 1 } },
			type: 'array',
			prefixItems: [{ $ref: '#/$defs/item' }],
			items: false,
			minItems: 1,
			maxItems: 1
		})
		expectInvalid(validate, { $ref: 'https://example.com/remote.json' })
		expectInvalid(validate, { type: 'string', minLenght: 1 })
		expectInvalid(validate, { definitions: { item: { type: 'string' } } })
	})

	it('validates every graph runner action and rejects malformed actions', () => {
		const { validate } = compilePublishedSchema('schemas/graph-runner-action.schema.json')
		const node = { id: 'source', templateId: 'Source', inputs: {} }
		const graph = { nodes: [node], finalNodeId: 'source' }
		const actions = [
			{ kind: 'addNode', node },
			{ kind: 'removeNode', nodeId: 'source' },
			{
				kind: 'setInput', nodeId: 'source', inputName: 'value',
				input: {
					kind: 'inline',
					node: { id: 'inline', templateId: 'Inline', inputs: {} }
				}
			},
			{ kind: 'removeInput', nodeId: 'source', inputName: 'value' },
			{ kind: 'setFinalNode', nodeId: 'source' },
			{ kind: 'setGoal', goal: { outputKind: 'expression' } },
			{ kind: 'removeGoal' },
			{ kind: 'replaceGraph', graph },
			{ kind: 'fill', inputs: { value: { kind: 'literal', value: 42 } } }
		]
		for (const action of actions) expectValid(validate, action)

		for (const action of [
			{ kind: 'unknown' },
			{ kind: 'setInput', nodeId: 'source', inputName: 'value' },
			{ kind: 'removeNode' },
			{ kind: 'removeGoal', unexpected: true }
		]) expectInvalid(validate, action)
	})

	it('validates every classified graph runner state and rejects invalid channels', () => {
		const { validate } = compilePublishedSchema('schemas/graph-runner-state.schema.json')
		const graph = { nodes: [], finalNodeId: 'root' }
		const diagnostic = {
			stage: 'graph', code: 'UnknownTemplate', severity: 'error', message: 'Unknown template.'
		}
		const partialArtifact = {
			id: 'root', code: '/* unresolved */', kind: 'expression',
			source: { templateId: 'Root' }, complete: false,
			unresolvedInputs: [{
				id: 'value', inputName: 'value', nodeId: 'root', templateId: 'Root',
				port: { kind: 'rawCode', regionKind: 'expression' }
			}]
		}
		const completeArtifact = {
			id: 'root', code: '42', kind: 'expression',
			source: { templateId: 'Root' }, complete: true
		}
		const compilationFailure = {
			kind: 'graphCompilation', mode: 'partial', ok: false,
			classification: 'graphRepairable', diagnostics: [diagnostic]
		}
		const states = [
			{ kind: 'ready', graph },
			{
				kind: 'needsGraphRepair', graph, result: compilationFailure,
				diagnostics: [diagnostic], classification: 'graphRepairable'
			},
			{
				kind: 'needsArtifactInputs', graph, artifact: partialArtifact,
				diagnostics: [], classification: 'artifactFillable'
			},
			{ kind: 'complete', graph, artifact: completeArtifact, diagnostics: [] },
			{ kind: 'failed', graph, diagnostics: [diagnostic], classification: 'terminalFailure' },
			{ kind: 'failed', graph, diagnostics: [diagnostic], classification: 'templatePolicyFailure' }
		]
		for (const state of states) expectValid(validate, state)

		expectInvalid(validate, {
			kind: 'needsArtifactInputs', graph, artifact: partialArtifact,
			diagnostics: [], classification: 'graphRepairable'
		})
		expectInvalid(validate, {
			kind: 'needsGraphRepair', graph,
			result: { ...compilationFailure, classification: 'terminalFailure' },
			diagnostics: [diagnostic], classification: 'graphRepairable'
		})
		expectInvalid(validate, {
			kind: 'failed', graph, diagnostics: [diagnostic], classification: 'artifactFillable'
		})
		expectInvalid(validate, { kind: 'ready', graph, unexpected: true })
	})

	it('publishes source-map v1 in compilation, action, and runner-state artifacts', () => {
		const graph = { nodes: [], finalNodeId: 'mapped' }
		const compilation = {
			kind: 'graphCompilation', mode: 'strict', ok: true,
			finalArtifact: mappedCompleteArtifact,
			artifacts: { mapped: mappedCompleteArtifact },
			diagnostics: []
		}
		const fillAction = {
			kind: 'fill',
			inputs: { value: { kind: 'fragment', fragment: mappedCompleteArtifact } }
		}
		const completeState = {
			kind: 'complete', graph, artifact: mappedCompleteArtifact, diagnostics: []
		}

		expectValid(
			compilePublishedSchema('schemas/graph-compilation-result.schema.json').validate,
			compilation
		)
		expectValid(
			compilePublishedSchema('schemas/graph-runner-action.schema.json').validate,
			fillAction
		)
		expectValid(
			compilePublishedSchema('schemas/graph-runner-state.schema.json').validate,
			completeState
		)

		const compilationValidator = compilePublishedSchema(
			'schemas/graph-compilation-result.schema.json'
		).validate
		for (const invalidSourceMap of [
			{ version: 2, spans: [] },
			{
				version: 1,
				spans: [{
					kind: 'input', start: 0, end: 5, nestingDepth: 1,
					nodeId: 'mapped', templateId: 'MappedExpression'
				}]
			},
			{
				version: 1,
				spans: [{
					kind: 'node', start: -1, end: 5, nestingDepth: 0,
					nodeId: 'mapped', templateId: 'MappedExpression'
				}]
			},
			{
				version: 1,
				spans: [{
					kind: 'node', start: 0, end: 5, nestingDepth: 0,
					nodeId: 'mapped', templateId: 'MappedExpression', unexpected: true
				}]
			}
		]) {
			expectInvalid(compilationValidator, {
				...compilation,
				finalArtifact: { ...mappedCompleteArtifact, sourceMap: invalidSourceMap }
			})
		}
	})

	it('validates every authored graph input form, including recursive inline collection items', () => {
		const { validate } = compilePublishedSchema('schemas/synthesis-graph.schema.json')
		expectValid(validate, graphFixture)
	})

	it('publishes every first-class region kind across graph protocol schemas', () => {
		const graphValidator = compilePublishedSchema('schemas/synthesis-graph.schema.json').validate
		const summaryValidator = compilePublishedSchema('schemas/template-summary.schema.json').validate
		const resultValidator = compilePublishedSchema('schemas/graph-compilation-result.schema.json').validate
		for (const kind of REGION_KIND_VALUES) {
			const graph = { nodes: [{ id: 'node', templateId: 'Template', inputs: {} }], finalNodeId: 'node', goal: { outputKind: kind } }
			const summary = { modelId: 'Template', inputs: {}, output: { kind } }
			const artifact = { code: 'placeholder', kind, source: { templateId: 'Template' }, complete: true }
			expectValid(graphValidator, graph)
			expectValid(summaryValidator, summary)
			expectValid(resultValidator, {
				kind: 'graphCompilation', mode: 'strict', ok: true,
				finalArtifact: artifact, artifacts: { node: artifact }, diagnostics: []
			})
		}
	})

	it('rejects malformed graph inputs, missing fields, and additional properties', () => {
		const { validate } = compilePublishedSchema('schemas/synthesis-graph.schema.json')

		expectInvalid(validate, {
			nodes: [{
				id: 'list',
				templateId: 'StatementList',
				inputs: {
					statements: {
						kind: 'fragmentCollection',
						items: [{ kind: 'literal', value: 'not a collection reference' }]
					}
				}
			}],
			finalNodeId: 'list'
		})
		expectInvalid(validate, {
			nodes: [{ id: 'unknown', templateId: 'Unknown', inputs: { value: { kind: 'mystery' } } }],
			finalNodeId: 'unknown'
		})
		expectInvalid(validate, {
			nodes: [{
				id: 'inline',
				templateId: 'Inline',
				inputs: {
					value: { kind: 'inline', node: { id: 'missingInputs', templateId: 'Nested' } }
				}
			}],
			finalNodeId: 'inline'
		})
		expectInvalid(validate, { ...graphFixture, unexpected: true })
	})

	it('validates real registry summaries for every port kind and recursive unions', () => {
		const { validate } = compilePublishedSchema('schemas/template-summary.schema.json')
		const registry = createTemplateRegistry([NumberExpression, SummaryShowcase])
		const summaries = registry.summaries()
		const showcase = summaries.find(summary => summary.modelId === SummaryShowcase.modelId)!

		expect(summaries).toHaveLength(2)
		expect(showcase.inputs.fragments).toMatchObject({
			kind: 'fragmentCollection',
			required: false,
			separator: '\n',
			minItems: 0,
			maxItems: 4
		})
		expect(showcase.inputs.choice).toMatchObject({
			kind: 'union',
			options: [
				{ kind: 'literal' },
				{ kind: 'union', options: [{ kind: 'rawCode' }, { kind: 'fragment' }] }
			]
		})
		for (const summary of summaries) expectValid(validate, summary)
	})

	it('rejects incomplete, unknown, and extended template summary variants', () => {
		const { validate } = compilePublishedSchema('schemas/template-summary.schema.json')
		const summary = createTemplateRegistry([NumberExpression, SummaryShowcase])
			.summaries().find(candidate => candidate.modelId === SummaryShowcase.modelId)!

		expectInvalid(validate, {
			...summary,
			inputs: {
				...summary.inputs,
				fragments: {
					kind: 'fragmentCollection',
					regionKind: 'expression',
					required: true,
					accepts: { outputKind: 'expression' }
				}
			}
		})
		expectInvalid(validate, {
			...summary,
			inputs: { unknown: { kind: 'unknown', required: true } }
		})
		expectInvalid(validate, { ...summary, unexpected: true })
	})

	it('rejects empty unions and non-integer or negative summary bounds', () => {
		const { validate } = compilePublishedSchema('schemas/template-summary.schema.json')
		const summary = createTemplateRegistry([NumberExpression, SummaryShowcase])
			.summaries().find(candidate => candidate.modelId === SummaryShowcase.modelId)!
		const withInput = (input: unknown) => ({
			...summary,
			inputs: { constrained: input }
		})

		for (const maxLength of [-1, 1.5]) {
			expectInvalid(validate, withInput({
				kind: 'rawCode',
				regionKind: 'expression',
				required: true,
				policy: { maxLength }
			}))
		}

		const collection = (minItems: number, maxItems?: number) => ({
			kind: 'fragmentCollection',
			regionKind: 'statement',
			required: true,
			accepts: { outputKind: 'statement' },
			separator: '\n',
			minItems,
			...(maxItems === undefined ? {} : { maxItems })
		})
		for (const input of [collection(-1), collection(1.5), collection(0, -1), collection(0, 1.5)]) {
			expectInvalid(validate, withInput(input))
		}

		expectInvalid(validate, withInput({ kind: 'union', required: true, options: [] }))
		expectInvalid(validate, withInput({
			kind: 'union',
			required: true,
			options: [{ kind: 'union', required: true, options: [] }]
		}))
	})

	it('validates real strict and partial compilation successes and failures', () => {
		const { validate } = compilePublishedSchema('schemas/graph-compilation-result.schema.json')
		const registry = createTemplateRegistry([NumberExpression, RequiredExpression, SemanticMismatch])
		const strictSuccess = compileGraph({
			nodes: [{
				id: 'number',
				templateId: 'NumberExpression',
				inputs: { value: { kind: 'literal', value: 42 } }
			}],
			finalNodeId: 'number'
		}, registry)
		const partialSuccess = compileGraph({
			nodes: [{ id: 'partial', templateId: 'RequiredExpression', inputs: {} }],
			finalNodeId: 'partial'
		}, registry, { mode: 'partial' })
		const strictFailure = compileGraph({
			nodes: [{ id: 'missing', templateId: 'MissingTemplate', inputs: {} }],
			finalNodeId: 'missing'
		}, registry)
		const partialFailure = compileGraph({
			nodes: [{ id: 'invalid', templateId: 'SemanticMismatch', inputs: {} }],
			finalNodeId: 'invalid'
		}, registry, { mode: 'partial', checkSemanticDiagnostics: true })

		expect(strictSuccess.ok).toBe(true)
		expect(partialSuccess.ok).toBe(true)
		if (partialSuccess.ok) expect(partialSuccess.finalArtifact.complete).toBe(false)
		expect(strictFailure.ok).toBe(false)
		expect(partialFailure.ok).toBe(false)
		if (!partialFailure.ok) expect(partialFailure.partialArtifacts).toHaveProperty('invalid')
		for (const result of [strictSuccess, partialSuccess, strictFailure, partialFailure]) {
			expectValid(validate, result)
		}
	})

	it('validates structured TypeScript semantic diagnostic fields', () => {
		const { validate } = compilePublishedSchema('schemas/graph-compilation-result.schema.json')
		const result = compileGraph({
			nodes: [{ id: 'invalid', templateId: 'SemanticMismatch', inputs: {} }],
			finalNodeId: 'invalid'
		}, [SemanticMismatch], {
			checkSemanticDiagnostics: true,
			filePath: 'generated/schema-fixture.ts'
		})

		expect(result.ok).toBe(false)
		expect(result.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({
				stage: 'type',
				code: 'TypeScriptSemanticError',
				severity: 'error',
				nodeId: 'invalid',
				templateId: 'SemanticMismatch',
				path: 'generated/schema-fixture.ts',
				compilerCode: 2322,
				compilerCategory: 'error',
				line: 1
			})
		]))
		expectValid(validate, result)
		expectValid(validate, {
			kind: 'graphCompilation',
			mode: 'strict',
			ok: false,
			classification: 'graphRepairable',
			diagnostics: [{
				stage: 'type',
				code: 'TypeScriptSemanticError',
				severity: 'error',
				message: 'Every structured diagnostic field is represented.',
				nodeId: 'invalid',
				templateId: 'SemanticMismatch',
				inputName: 'value',
				path: 'generated/schema-fixture.ts',
				expected: { ts: 'number' },
				actual: { ts: 'string' },
				repairHints: [{
					kind: 'replaceInput',
					message: 'Supply a numeric expression.',
					candidateNodeIds: ['number']
				}],
				compilerCode: 2322,
				compilerCategory: 'error',
				line: 1,
				column: 7
			}]
		})
	})

	it('rejects inconsistent results, invalid diagnostics, and additional properties', () => {
		const { validate } = compilePublishedSchema('schemas/graph-compilation-result.schema.json')
		const completeArtifact = {
			id: 'value',
			code: '1',
			kind: 'expression',
			source: { templateId: 'NumberExpression' },
			complete: true
		}

		expectInvalid(validate, {
			kind: 'graphCompilation',
			mode: 'strict',
			ok: true,
			finalArtifact: { ...completeArtifact, complete: false, unresolvedInputs: [] },
			artifacts: {},
			diagnostics: []
		})
		expectInvalid(validate, {
			kind: 'graphCompilation',
			mode: 'strict',
			ok: false,
			diagnostics: [{
				stage: 'type',
				code: 'TypeScriptSemanticError',
				severity: 'error',
				message: 'Invalid compiler category.',
				compilerCategory: 'fatal'
			}]
		})
		expectInvalid(validate, {
			kind: 'graphCompilation',
			mode: 'partial',
			ok: false,
			diagnostics: [],
			unexpected: true
		})
	})

	it('rejects empty unions and non-integer or negative artifact-port bounds', () => {
		const { validate } = compilePublishedSchema('schemas/graph-compilation-result.schema.json')
		const resultWithPort = (port: unknown) => {
			const artifact = {
				id: 'partial',
				code: '/* unresolved */',
				kind: 'statement',
				source: { templateId: 'Partial' },
				complete: false,
				unresolvedInputs: [{
					id: 'partial:value',
					inputName: 'value',
					templateId: 'Partial',
					port
				}]
			}
			return {
				kind: 'graphCompilation',
				mode: 'partial',
				ok: true,
				finalArtifact: artifact,
				artifacts: { partial: artifact },
				diagnostics: []
			}
		}

		for (const maxLength of [-1, 1.5]) {
			expectInvalid(validate, resultWithPort({
				kind: 'rawCode',
				regionKind: 'expression',
				policy: { maxLength }
			}))
		}

		const collection = (minItems: number, maxItems?: number) => ({
			kind: 'fragmentCollection',
			regionKind: 'statement',
			accepts: { outputKind: 'statement' },
			minItems,
			...(maxItems === undefined ? {} : { maxItems })
		})
		for (const port of [collection(-1), collection(1.5), collection(0, -1), collection(0, 1.5)]) {
			expectInvalid(validate, resultWithPort(port))
		}

		expectInvalid(validate, resultWithPort({ kind: 'union', options: [] }))
		expectInvalid(validate, resultWithPort({
			kind: 'union',
			options: [{ kind: 'union', options: [] }]
		}))
	})

	it('continues to derive catalog-specific raw-code and union schemas', () => {
		const schema = graphTemplateDefinitionToJsonSchema(SummaryShowcase)
		const properties = schema.properties as Record<string, unknown>
		const inputs = properties.inputs as Record<string, unknown>
		const inputProperties = inputs.properties as Record<string, unknown>
		const raw = inputProperties.raw as Record<string, unknown>
		const rawProperties = raw.properties as Record<string, unknown>
		const code = rawProperties.code as Record<string, unknown>
		const choice = inputProperties.choice as Record<string, unknown>

		expect(code).toMatchObject({
			type: 'string',
			maxLength: 80,
			pattern: '^[^\\r\\n]*$'
		})
		expect(choice).toHaveProperty('anyOf')
	})

	it('keeps authored local references inside deterministic planner-schema resources', () => {
		const LocalReferenceLiteral = defineTemplate({
			modelId: 'LocalReferenceLiteral',
			version: '1',
			inputs: {
				value: literalPort({
					regionKind: 'expression',
					schema: {
						$defs: { nonempty: { type: 'string', minLength: 1 } },
						$ref: '#/$defs/nonempty'
					}
				}),
				choice: unionPort({
					options: [
						literalPort({
							regionKind: 'expression',
							schema: {
								$defs: { selected: { const: 'left' } },
								$ref: '#/$defs/selected'
							}
						}),
						literalPort({
							regionKind: 'expression',
							schema: {
								$defs: { selected: { const: 'right' } },
								$ref: '#/$defs/selected'
							}
						})
					]
				})
			},
			output: { kind: 'expression' },
			template: region => region('value')
		})
		const registry = createTemplateRegistry([LocalReferenceLiteral])
		const firstSchema = templateRegistryToSynthesisGraphJsonSchema(registry)
		const secondSchema = templateRegistryToSynthesisGraphJsonSchema(registry)
		expect(secondSchema).toEqual(firstSchema)

		const ajv = new Ajv2020({ allErrors: true, strict: true })
		const validate = ajv.compile(firstSchema)
		const graph = (value: unknown, choice: unknown) => ({
			nodes: [{
				id: 'local', templateId: 'LocalReferenceLiteral',
				inputs: {
					value: { kind: 'literal', value },
					choice: { kind: 'literal', value: choice }
				}
			}],
			finalNodeId: 'local'
		})
		expectValid(validate, graph('value', 'left'))
		expectValid(validate, graph('value', 'right'))
		expectInvalid(validate, graph('', 'left'))
		expectInvalid(validate, graph('value', 'other'))
	})
})
