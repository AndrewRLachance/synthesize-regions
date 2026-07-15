import { describe, expect, it } from 'vitest'

import {
	buildGraphCompiler,
	compileArtifactSet,
	compileGraph,
	createGraphRunner,
	createTemplateRegistry,
	defineTemplate,
	fragmentCollectionPort,
	fragmentPort,
	literalPort,
	rawCodePort,
	templateCatalogDigest,
	templateCatalogManifestDigest,
	TemplateCatalogValidationError,
	type ArtifactSetPlan,
	type GraphCompiler,
	type GraphTemplateDefinition,
	type SynthesisGraph,
	type TemplateCatalogView
} from '../src/index.js'

type AnyTemplate = GraphTemplateDefinition<any, string, any>

function staticExpression(
	modelId: string,
	options: {
		version?: string
		description?: string
		code?: string
	} = {}
): AnyTemplate {
	return defineTemplate({
		modelId,
		...(options.version === undefined ? {} : { version: options.version }),
		...(options.description === undefined ? {} : { description: options.description }),
		inputs: {},
		output: { kind: 'expression' },
		source: options.code ?? 'undefined'
	})
}

function expressionConsumer(modelId: string, sourceModelIds: string[]): AnyTemplate {
	return defineTemplate({
		modelId,
		inputs: {
			value: fragmentPort({
				regionKind: 'expression',
				accepts: { outputKind: 'expression', sourceModelIds }
			})
		},
		output: { kind: 'expression' },
		source: "/** @TYPE expression id=value **/undefined/** @END **/"
	})
}

function catalogError(fn: () => unknown): TemplateCatalogValidationError {
	try {
		fn()
		throw new Error('Expected template catalog validation to fail.')
	} catch (error) {
		expect(error).toBeInstanceOf(TemplateCatalogValidationError)
		return error as TemplateCatalogValidationError
	}
}

describe('validated template registries', () => {
	it('rejects structural catalog impostors before invoking their executable definitions', () => {
		let catalogMethodCalls = 0
		let templateInvocationCalls = 0
		const forgedTemplate = {
			modelId: 'Source',
			inputs: {},
			output: { kind: 'expression' },
			source: 'forgedSource()',
			manifestDigest: `t1_${'0'.repeat(64)}`,
			invoke() {
				templateInvocationCalls += 1
				return {
					code: 'forgedSource()', kind: 'expression', complete: true,
					source: { templateId: 'Source', templateManifestDigest: `t1_${'0'.repeat(64)}` }
				}
			},
			invokePartial() {
				templateInvocationCalls += 1
				return {
					code: 'forgedSource()', kind: 'expression', complete: true,
					source: { templateId: 'Source', templateManifestDigest: `t1_${'0'.repeat(64)}` }
				}
			},
			toReplacementMap() { return {} },
			summary() { return { modelId: 'Source', inputs: {}, output: { kind: 'expression' } } }
		} as AnyTemplate
		const impostor = {
			contractDigest: `c4_${'0'.repeat(64)}`,
			manifestDigest: `m1_${'0'.repeat(64)}`,
			get() { catalogMethodCalls += 1; return forgedTemplate },
			list() { catalogMethodCalls += 1; return [forgedTemplate] },
			summaries() { catalogMethodCalls += 1; return [forgedTemplate.summary()] },
			snapshot() { catalogMethodCalls += 1; return this }
		} as unknown as TemplateCatalogView & { snapshot(): TemplateCatalogView }
		const forgedGraph: SynthesisGraph = {
			nodes: [{ id: 'forged', templateId: 'Source', inputs: {} }],
			finalNodeId: 'forged'
		}

		for (const operation of [
			() => buildGraphCompiler(impostor),
			() => compileGraph(forgedGraph, impostor),
			() => createGraphRunner(impostor, forgedGraph)
		]) {
			const error = catalogError(operation)
			expect(error.diagnostics).toMatchObject([{ code: 'UntrustedTemplateCatalogView' }])
		}

		const plan: ArtifactSetPlan = {
			artifacts: [{
				id: 'forged', graph: forgedGraph,
				target: { kind: 'createFile', path: 'generated/forged.ts' }
			}]
		}
		const artifactSet = compileArtifactSet(plan, impostor)
		expect(artifactSet).toMatchObject({
			ok: false,
			classification: 'templatePolicyFailure',
			diagnostics: [{ code: 'UntrustedTemplateCatalogView' }]
		})

		const arrayError = catalogError(() => compileGraph(forgedGraph, [forgedTemplate]))
		expect(arrayError.diagnostics).toMatchObject([{ code: 'UntrustedTemplateDefinition' }])
		expect(catalogMethodCalls).toBe(0)
		expect(templateInvocationCalls).toBe(0)
	})

	it('rejects callable graph-compiler impostors before a runner can invoke them', () => {
		const source = staticExpression('CompilerTrustSource', { code: '1' })
		const catalog = createTemplateRegistry([source]).snapshot()
		let calls = 0
		const impostor = Object.assign(
			() => {
				calls += 1
				throw new Error('forged compiler executed')
			},
			{
				contractDigest: catalog.contractDigest,
				manifestDigest: catalog.manifestDigest,
				catalog,
				defineGraph: (graph: unknown) => graph,
				definePartialGraph: (graph: unknown) => graph
			}
		) as unknown as GraphCompiler<readonly AnyTemplate[]>
		const graph: SynthesisGraph = {
			nodes: [{ id: 'source', templateId: source.modelId, inputs: {} }],
			finalNodeId: 'source'
		}

		expect(() => createGraphRunner(impostor, graph)).toThrow(/only compiler closures created/u)
		expect(calls).toBe(0)
	})

	it('rejects duplicate IDs in an initial widened catalog', () => {
		const first = staticExpression('Duplicate', { code: '1' })
		const second = staticExpression('Duplicate', { code: '2' })
		const widened: readonly AnyTemplate[] = [first, second]

		const error = catalogError(() => createTemplateRegistry(widened))
		expect(error.diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([{
			code: 'DuplicateTemplateId',
			path: 'templates[1].modelId'
		}])
	})

	it('keeps register insert-only and returns deterministic sorted views', () => {
		const registry = createTemplateRegistry()
		const zebra = staticExpression('Zebra')
		const alpha = staticExpression('Alpha')

		registry.register(zebra)
		registry.register(alpha)

		expect(registry.list().map(template => template.modelId)).toEqual(['Alpha', 'Zebra'])
		expect(registry.summaries().map(summary => summary.modelId)).toEqual(['Alpha', 'Zebra'])

		const digestBefore = registry.contractDigest
		const templatesBefore = registry.list()
		const error = catalogError(() => registry.register(staticExpression('Alpha', { version: '2' })))

		expect(error.diagnostics.map(diagnostic => diagnostic.code)).toContain('DuplicateTemplateId')
		expect(registry.contractDigest).toBe(digestBefore)
		expect(registry.list()).toEqual(templatesBefore)
	})

	it('registers forward and mutually referencing templates as one atomic batch', () => {
		const registry = createTemplateRegistry()
		const alpha = expressionConsumer('Alpha', ['Beta'])
		const beta = expressionConsumer('Beta', ['Alpha'])

		const singleError = catalogError(() => registry.register(alpha))
		expect(singleError.diagnostics.map(diagnostic => diagnostic.code)).toEqual(['UnknownSourceModelId'])
		expect(registry.list()).toEqual([])

		registry.registerAll([alpha, beta])
		expect(registry.list().map(template => template.modelId)).toEqual(['Alpha', 'Beta'])

		const digestBefore = registry.contractDigest
		const summariesBefore = registry.summaries()
		const invalid = expressionConsumer('Invalid', ['Missing'])
		const batchError = catalogError(() => registry.registerAll([
			staticExpression('Additional'),
			invalid
		]))

		expect(batchError.diagnostics.map(diagnostic => diagnostic.code)).toEqual(['UnknownSourceModelId'])
		expect(registry.contractDigest).toBe(digestBefore)
		expect(registry.summaries()).toEqual(summariesBefore)
		expect(registry.get('Additional')).toBeUndefined()
	})

	it('replaces only existing templates and revalidates every dependent atomically', () => {
		const source = staticExpression('Source', { version: '1' })
		const consumer = expressionConsumer('Consumer', ['Source'])
		const registry = createTemplateRegistry([consumer, source])
		const digestBefore = registry.contractDigest
		const templatesBefore = registry.list()

		const unknownError = catalogError(() => registry.replace(staticExpression('Unknown')))
		expect(unknownError.diagnostics.map(diagnostic => diagnostic.code)).toEqual(['UnknownTemplateReplacement'])
		expect(registry.contractDigest).toBe(digestBefore)

		const incompatibleSource = defineTemplate({
			modelId: 'Source',
			version: '2',
			inputs: {},
			output: { kind: 'statement' },
			source: 'void 0;'
		})
		const dependentError = catalogError(() => registry.replace(incompatibleSource))
		expect(dependentError.diagnostics.map(diagnostic => diagnostic.code)).toEqual([
			'IncompatibleSourceOutputKind'
		])
		expect(registry.contractDigest).toBe(digestBefore)
		expect(registry.list()).toEqual(templatesBefore)
		expect(registry.get('Source')).toBe(source)

		const replacement = staticExpression('Source', { version: '2', code: '2' })
		registry.replace(replacement)
		expect(registry.get('Source')).toBe(replacement)
		expect(registry.contractDigest).not.toBe(digestBefore)
	})

	it('captures immutable snapshots whose membership, summaries, and digest do not drift', () => {
		const registry = createTemplateRegistry([
			staticExpression('Zebra'),
			staticExpression('Alpha')
		])
		const snapshot = registry.snapshot()
		const snapshotDigest = snapshot.contractDigest
		const snapshotTemplates = snapshot.list()

		const returnedSummaries = snapshot.summaries()
		returnedSummaries[0]!.modelId = 'MutatedCopy'
		registry.register(staticExpression('Middle'))

		expect(Object.isFrozen(snapshot)).toBe(true)
		expect('register' in snapshot).toBe(false)
		expect(snapshot.contractDigest).toBe(snapshotDigest)
		expect(snapshot.list()).toEqual(snapshotTemplates)
		expect(snapshot.summaries().map(summary => summary.modelId)).toEqual(['Alpha', 'Zebra'])
		expect(registry.list().map(template => template.modelId)).toEqual(['Alpha', 'Middle', 'Zebra'])
		expect(registry.contractDigest).not.toBe(snapshotDigest)
	})
})

interface RichContractOptions {
	version?: string
	templateDescription?: string
	inputDescription?: string
	literalSchema?: unknown
	required?: boolean
	fragmentType?: string
	sourceModelIds?: string[]
	separator?: string
	minItems?: number
	maxItems?: number
	rawMaxLength?: number
	rawType?: string
	outputDescription?: string
	outputType?: string
	outputSchema?: unknown
	reverseInputs?: boolean
	reverseSetValues?: boolean
	implementation?: string
}

function richCatalog(options: RichContractOptions = {}): AnyTemplate[] {
	const sourceAlpha = defineTemplate({
		modelId: 'SourceAlpha',
		inputs: {},
		output: { kind: 'expression', type: { ts: 'string' } },
		source: '"alpha"'
	})
	const sourceBeta = defineTemplate({
		modelId: 'SourceBeta',
		inputs: {},
		output: { kind: 'expression', type: { ts: 'string' } },
		source: '"beta"'
	})
	const sourceModelIds = options.sourceModelIds
		?? (options.reverseSetValues ? ['SourceBeta', 'SourceAlpha'] : ['SourceAlpha', 'SourceBeta'])
	const forbiddenSubstrings = options.reverseSetValues ? ['Function', 'eval'] : ['eval', 'Function']
	const forbiddenPatterns = options.reverseSetValues ? ['process', 'require'] : ['require', 'process']

	const literal = literalPort({
		regionKind: 'expression',
		description: options.inputDescription ?? 'Literal input',
		required: options.required ?? true,
		schema: options.literalSchema ?? { type: 'string', minLength: 1 }
	})
	const fragment = fragmentPort({
		regionKind: 'expression',
		accepts: {
			outputKind: 'expression',
			type: { ts: options.fragmentType ?? 'string' },
			sourceModelIds
		}
	})
	const collection = fragmentCollectionPort({
		regionKind: 'expression',
		accepts: { outputKind: 'expression', sourceModelIds },
		separator: options.separator ?? ', ',
		minItems: options.minItems ?? 1,
		maxItems: options.maxItems ?? 3
	})
	const raw = rawCodePort({
		regionKind: 'expression',
		type: { ts: options.rawType ?? 'string' },
		policy: {
			allowNewlines: false,
			maxLength: options.rawMaxLength ?? 100,
			forbiddenSubstrings,
			forbiddenPatterns
		}
	})
	const entries = options.reverseInputs
		? { raw, collection, fragment, literal }
		: { literal, fragment, collection, raw }

	const rich = defineTemplate({
		modelId: 'Rich',
		version: options.version ?? '1',
		description: options.templateDescription ?? 'Rich planner contract',
		inputs: entries,
		output: {
			kind: 'expression',
			description: options.outputDescription ?? 'Rich output',
			type: { ts: options.outputType ?? 'readonly string[]' },
			schema: options.outputSchema ?? { type: 'array', items: { type: 'string' } }
		},
		source: `[${"/** @TYPE expression id=literal **/undefined/** @END **/"}, ${"/** @TYPE expression id=fragment **/undefined/** @END **/"}, ${"/** @TYPE expression id=collection **/undefined/** @END **/"}, ${"/** @TYPE expression id=raw **/undefined/** @END **/"}${options.implementation === undefined ? '' : `, ${options.implementation}`}]`
	})

	return [sourceAlpha, sourceBeta, rich]
}

describe('template catalog digests', () => {
	it('is stable across catalog insertion, object-key, and set-like metadata order', () => {
		const canonical = richCatalog()
		const reordered = richCatalog({ reverseInputs: true, reverseSetValues: true, implementation: 'different()' })

		expect(templateCatalogDigest([...canonical].reverse())).toBe(templateCatalogDigest(reordered))
		expect(createTemplateRegistry(canonical).contractDigest).toBe(templateCatalogDigest(canonical))
		expect(templateCatalogDigest(canonical)).toMatch(/^c4_[a-f0-9]{64}$/u)
		expect(templateCatalogManifestDigest(canonical)).toMatch(/^m1_[a-f0-9]{64}$/u)
		expect(templateCatalogManifestDigest(canonical)).not.toBe(templateCatalogManifestDigest(reordered))
	})

	it('canonicalizes schema ordering, legacy aliases, and surrounding TypeScript whitespace', () => {
		const canonical = defineTemplate({
			modelId: 'CanonicalMetadata',
			inputs: {
				value: literalPort({
					regionKind: 'expression',
					schema: {
						type: ['string', 'null'],
						anyOf: [{ const: 'value' }, { type: 'null' }]
					}
				})
			},
			output: {
				kind: 'expression',
				type: { ts: 'string | null', schema: { type: ['string', 'null'] } }
			},
			source: "/** @TYPE expression id=value **/undefined/** @END **/"
		})
		const reorderedAndLegacy = defineTemplate({
			modelId: 'CanonicalMetadata',
			inputs: {
				value: literalPort({
					regionKind: 'expression',
					schema: {
						anyOf: [{ type: 'null' }, { const: 'value' }],
						type: ['null', 'string']
					}
				})
			},
			output: {
				kind: 'expression',
				type: { ts: '  string | null  ' },
				schema: { type: ['null', 'string'] }
			},
			source: "/** @TYPE expression id=value **/undefined/** @END **/"
		})

		expect(templateCatalogDigest([reorderedAndLegacy]))
			.toBe(templateCatalogDigest([canonical]))
	})

	it('changes for planner-facing versions, descriptions, ports, policies, schemas, types, sources, and outputs', () => {
		const base = templateCatalogDigest(richCatalog())
		const changedCatalogs: Array<[string, AnyTemplate[]]> = [
			['version', richCatalog({ version: '2' })],
			['template description', richCatalog({ templateDescription: 'Changed template' })],
			['input description', richCatalog({ inputDescription: 'Changed input' })],
			['required default', richCatalog({ required: false })],
			['literal schema', richCatalog({ literalSchema: { type: 'number' } })],
			['fragment type', richCatalog({ fragmentType: 'unknown' })],
			['source allowlist', richCatalog({ sourceModelIds: ['SourceAlpha'] })],
			['collection separator', richCatalog({ separator: '\n' })],
			['collection minimum', richCatalog({ minItems: 0 })],
			['collection maximum', richCatalog({ maxItems: 4 })],
			['raw-code policy', richCatalog({ rawMaxLength: 101 })],
			['raw-code type', richCatalog({ rawType: 'unknown' })],
			['output description', richCatalog({ outputDescription: 'Changed output' })],
			['output type', richCatalog({ outputType: 'unknown' })],
			['output schema', richCatalog({ outputSchema: { type: 'object' } })]
		]

		for (const [label, catalog] of changedCatalogs) {
			expect(templateCatalogDigest(catalog), label).not.toBe(base)
		}
	})

	it('normalizes explicit defaults and ignores implementation-only changes', () => {
		const implicitDefaults = defineTemplate({
			modelId: 'Defaults',
			inputs: {
				fragment: fragmentPort({ regionKind: 'expression', accepts: {} }),
				collection: fragmentCollectionPort({ regionKind: 'expression', accepts: {} }),
				raw: rawCodePort({ regionKind: 'expression' }),
				literal: literalPort({ regionKind: 'expression' })
			},
			output: { kind: 'expression' },
			source: `[${"/** @TYPE expression id=fragment **/undefined/** @END **/"}, ${"/** @TYPE expression id=collection **/undefined/** @END **/"}, ${"/** @TYPE expression id=raw **/undefined/** @END **/"}, ${"/** @TYPE expression id=literal **/undefined/** @END **/"}]`
		})
		const explicitDefaults = defineTemplate({
			modelId: 'Defaults',
			inputs: {
				fragment: fragmentPort({
					regionKind: 'expression',
					required: true,
					accepts: { outputKind: 'expression' }
				}),
				collection: fragmentCollectionPort({
					regionKind: 'expression',
					required: true,
					accepts: { outputKind: 'expression' },
					separator: '\n',
					minItems: 0
				}),
				raw: rawCodePort({
					regionKind: 'expression',
					required: true,
					policy: { allowNewlines: true, forbiddenPatterns: [], forbiddenSubstrings: [] }
				}),
				literal: literalPort({ regionKind: 'expression', required: true })
			},
			output: { kind: 'expression' },
			source: `[${"/** @TYPE expression id=fragment **/undefined/** @END **/"}, ${"/** @TYPE expression id=collection **/undefined/** @END **/"}, ${"/** @TYPE expression id=raw **/undefined/** @END **/"}, ${"/** @TYPE expression id=literal **/undefined/** @END **/"}, differentImplementation()]`
		})

		expect(templateCatalogDigest([implicitDefaults])).toBe(templateCatalogDigest([explicitDefaults]))
		expect(templateCatalogManifestDigest([implicitDefaults]))
			.not.toBe(templateCatalogManifestDigest([explicitDefaults]))

		const firstImplementation = staticExpression('Implementation', { version: '1', code: 'first()' })
		const secondImplementation = staticExpression('Implementation', { version: '1', code: 'second()' })
		const versionBump = staticExpression('Implementation', { version: '2', code: 'second()' })
		expect(templateCatalogDigest([firstImplementation])).toBe(templateCatalogDigest([secondImplementation]))
		expect(templateCatalogDigest([firstImplementation])).not.toBe(templateCatalogDigest([versionBump]))
	})

	it('distinguishes an omitted source allowlist from an explicit empty allowlist', () => {
		const templateWithSources = (sourceModelIds?: string[]) => defineTemplate({
			modelId: 'Consumer',
			inputs: {
				value: fragmentPort({
					regionKind: 'expression',
					accepts: sourceModelIds === undefined ? {} : { sourceModelIds }
				})
			},
			output: { kind: 'expression' },
			source: "/** @TYPE expression id=value **/undefined/** @END **/"
		})

		expect(templateCatalogDigest([templateWithSources()]))
			.not.toBe(templateCatalogDigest([templateWithSources([])]))
	})
})

describe('catalog capture in graph sessions', () => {
	const graph: SynthesisGraph = {
		nodes: [{ id: 'source', templateId: 'Source', inputs: {} }],
		finalNodeId: 'source',
		goal: { outputKind: 'expression' }
	}

	it('captures registry membership and implementations for runner sessions', () => {
		const original = staticExpression('Source', { version: '1', code: 'oldValue' })
		const replacement = staticExpression('Source', { version: '2', code: 'newValue' })
		const registry = createTemplateRegistry([original])
		const runner = createGraphRunner(registry, graph)
		const capturedDigest = runner.contractDigest

		registry.replace(replacement)

		expect(registry.contractDigest).not.toBe(capturedDigest)
		expect(runner.contractDigest).toBe(capturedDigest)
		const state = runner.advance()
		expect(state.kind).toBe('complete')
		if (state.kind === 'complete') expect(state.artifact.code).toBe('oldValue')

		const current = compileGraph(graph, registry)
		expect(current.ok).toBe(true)
		if (current.ok) expect(current.finalArtifact.code).toBe('newValue')
	})

	it('captures a compiler catalog independently of a later source-registry mutation', () => {
		const original = staticExpression('Source', { version: '1', code: 'oldValue' })
		const replacement = staticExpression('Source', { version: '2', code: 'newValue' })
		const registry = createTemplateRegistry([original])
		const compiler = buildGraphCompiler(registry)
		const capturedDigest = compiler.contractDigest
		registry.replace(replacement)

		const result = compiler(graph)
		expect(registry.contractDigest).not.toBe(capturedDigest)
		expect(compiler.contractDigest).toBe(capturedDigest)
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.finalArtifact.code).toBe('oldValue')
	})

	it('accepts a matching expected digest and fails compilers and runners on a mismatch', () => {
		const source = staticExpression('Source', { code: 'value' })
		const registry = createTemplateRegistry([source])
		const matching = compileGraph(graph, registry.snapshot(), {
			expectedCatalogDigest: registry.contractDigest
		})
		expect(matching.ok).toBe(true)

		const mismatch = compileGraph(graph, registry, { expectedCatalogDigest: 'c1_stale' })
		expect(mismatch.ok).toBe(false)
		if (!mismatch.ok) {
			expect(mismatch.classification).toBe('terminalFailure')
			expect(mismatch.diagnostics).toMatchObject([{
				stage: 'template',
				code: 'CatalogDigestMismatch',
				expected: 'c1_stale',
				actual: registry.contractDigest
			}])
		}

		const compiler = buildGraphCompiler([source], { expectedCatalogDigest: 'c1_stale' })
		const compilerResult = compiler(graph)
		expect(compilerResult.ok).toBe(false)
		if (!compilerResult.ok) expect(compilerResult.diagnostics[0]?.code).toBe('CatalogDigestMismatch')

		const runner = createGraphRunner(registry.snapshot(), graph, {
			expectedCatalogDigest: 'c1_stale'
		})
		expect(runner.advance()).toMatchObject({
			kind: 'failed',
			diagnostics: [{ code: 'CatalogDigestMismatch' }]
		})
	})

	it('includes the catalog digest in default partial-artifact input identities', () => {
		const missingInputTemplate = (version: string) => defineTemplate({
			modelId: 'MissingInput',
			version,
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'expression' },
			source: "/** @TYPE expression id=value **/undefined/** @END **/"
		})
		const partialGraph: SynthesisGraph = {
			nodes: [{ id: 'partial', templateId: 'MissingInput', inputs: {} }],
			finalNodeId: 'partial'
		}
		const first = compileGraph(partialGraph, [missingInputTemplate('1')], { mode: 'partial' })
		const second = compileGraph(partialGraph, [missingInputTemplate('2')], { mode: 'partial' })

		expect(first.ok).toBe(true)
		expect(second.ok).toBe(true)
		if (!first.ok || !second.ok
			|| first.finalArtifact.complete !== false
			|| second.finalArtifact.complete !== false) return
		expect(first.finalArtifact.unresolvedInputs[0]?.id)
			.not.toBe(second.finalArtifact.unresolvedInputs[0]?.id)
	})
})
