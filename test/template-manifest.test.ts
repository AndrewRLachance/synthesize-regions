import { describe, expect, it } from 'vitest'

import {
	BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES,
	buildGraphCompiler,
	compileGraph,
	createGraphRunner,
	createTemplateRegistry,
	createTemplateRegistryFromManifests,
	defineTemplate,
	literalPort,
	rawCodePort,
	templateCatalogDigest,
	templateCatalogManifestDigest,
	templateManifestDigest,
	TemplateCatalogValidationError,
	type SynthesisGraph
} from '../src/index.js'

const expressionMarker = (id: string, body = 'undefined') =>
	`/** @TYPE expression id=${id} **/${body}/** @END **/`

function expressionTemplate(modelId: string, source = expressionMarker('value')) {
	return defineTemplate({
		modelId,
		inputs: { value: rawCodePort({ regionKind: 'expression' }) },
		output: { kind: 'expression' },
		source
	})
}

describe('declarative graph template manifests', () => {
	it('captures source, clones and freezes contracts, and exposes a stable template digest', () => {
		const schema = { type: 'string' as const, enum: ['alpha', 'beta'] }
		const input = literalPort({ regionKind: 'expression', schema })
		const template = defineTemplate({
			modelId: 'FrozenManifest',
			inputs: { value: input },
			output: { kind: 'expression', type: { ts: 'string' } },
			source: expressionMarker('value', '"fallback"')
		})

		schema.enum.push('later')
		;(input as { required?: boolean }).required = false

		expect(template.source).toContain('id=value')
		expect(template.inputs.value).not.toBe(input)
		expect(template.inputs.value.required).toBeUndefined()
		expect((template.inputs.value.schema as { enum: string[] }).enum).toEqual(['alpha', 'beta'])
		expect(Object.isFrozen(template)).toBe(true)
		expect(Object.isFrozen(template.inputs)).toBe(true)
		expect(Object.isFrozen(template.inputs.value)).toBe(true)
		expect(Object.isFrozen((template.inputs.value.schema as { enum: string[] }).enum)).toBe(true)
		expect(template.manifestDigest).toMatch(/^t2_[a-f0-9]{64}$/u)
		expect(templateManifestDigest(template)).toBe(template.manifestDigest)

		const lf = expressionTemplate('LineEndings', `(\n${expressionMarker('value')}\n)`)
		const crlf = expressionTemplate('LineEndings', `(\r\n${expressionMarker('value')}\r\n)`)
		expect(lf.manifestDigest).toBe(crlf.manifestDigest)
	})

	it('loads closed JSON manifests and rejects author-provided executable properties', () => {
		const manifest = {
			modelId: 'LoadedJsonManifest',
			inputs: { value: { kind: 'rawCode', regionKind: 'expression' } },
			output: { kind: 'expression' },
			source: `${expressionMarker('value')}\r\n`
		} as const
		const registry = createTemplateRegistryFromManifests(JSON.parse(JSON.stringify([manifest])))
		expect(registry.get('LoadedJsonManifest')?.source.endsWith('\r\n')).toBe(false)

		expect(() => defineTemplate({
			...manifest,
			invoke: () => ({})
		} as never)).toThrow(/unknown property invoke/u)
	})

	it('requires one scalar marker of the port kind for every declared input', () => {
		expect(() => defineTemplate({
			modelId: 'MissingMarker',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'expression' },
			source: 'undefined'
		})).toThrow(/exactly one marker.*found 0/u)

		expect(() => expressionTemplate(
			'DuplicateMarker',
			`${expressionMarker('value')} + ${expressionMarker('value')}`
		)).toThrow(/exactly one marker.*found 2/u)

		expect(() => defineTemplate({
			modelId: 'UnknownMarker',
			inputs: {},
			output: { kind: 'expression' },
			source: expressionMarker('unknown')
		})).toThrow(/no declared input port/u)

		expect(() => defineTemplate({
			modelId: 'WrongMarkerKind',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'expression' },
			source: '/** @TYPE identifier id=value **/fallback/** @END **/'
		})).toThrow(/requires expression/u)

		expect(() => defineTemplate({
			modelId: 'ManyMarker',
			inputs: { value: rawCodePort({ regionKind: 'expression' }) },
			output: { kind: 'expression' },
			source: '/** @TYPE expression[] id=value **/undefined/** @END **/'
		})).toThrow(/must have scalar arity/u)
	})

	it('separates planner-contract and executable-manifest catalog identities', () => {
		const first = expressionTemplate('Identity', expressionMarker('value', 'first'))
		const second = expressionTemplate('Identity', expressionMarker('value', 'second'))

		expect(templateCatalogDigest([first])).toBe(templateCatalogDigest([second]))
		expect(templateCatalogDigest([first])).toMatch(/^c5_[a-f0-9]{64}$/u)
		expect(first.manifestDigest).not.toBe(second.manifestDigest)
		expect(templateCatalogManifestDigest([first])).not.toBe(templateCatalogManifestDigest([second]))
		expect(templateCatalogManifestDigest([first])).toMatch(/^m2_[a-f0-9]{64}$/u)

		const alpha = expressionTemplate('Alpha')
		const registry = createTemplateRegistry([first, alpha])
		const snapshot = registry.snapshot()
		expect(registry.manifestDigest).toBe(templateCatalogManifestDigest([alpha, first]))
		expect(snapshot.manifestDigest).toBe(registry.manifestDigest)
		expect(templateCatalogManifestDigest([first, alpha])).toBe(templateCatalogManifestDigest([alpha, first]))
	})

	it('rejects a forged definition whose source no longer matches its library-owned manifest', () => {
		const original = expressionTemplate('Tampered')
		const tampered = {
			...original,
			source: expressionMarker('value', 'tampered')
		}

		try {
			createTemplateRegistry([tampered])
			throw new Error('Expected registry construction to fail.')
		} catch (error) {
			expect(error).toBeInstanceOf(TemplateCatalogValidationError)
			expect((error as TemplateCatalogValidationError).diagnostics).toMatchObject([{
				code: 'UntrustedTemplateDefinition'
			}])
		}
	})

	it('captures manifest identity on compilers and runners and rejects stale expectations', () => {
		const first = expressionTemplate('CapturedManifest', expressionMarker('value', 'first'))
		const second = expressionTemplate('CapturedManifest', expressionMarker('value', 'second'))
		const registry = createTemplateRegistry([first])
		const graph: SynthesisGraph = {
			nodes: [{ id: 'root', templateId: first.modelId, inputs: {} }],
			finalNodeId: 'root',
			goal: { outputKind: 'expression' }
		}
		const compiler = buildGraphCompiler(registry)
		const runner = createGraphRunner(registry, graph)
		const capturedManifestDigest = registry.manifestDigest

		registry.replace(second)

		expect(registry.contractDigest).toBe(compiler.contractDigest)
		expect(registry.manifestDigest).not.toBe(capturedManifestDigest)
		expect(compiler.manifestDigest).toBe(capturedManifestDigest)
		expect(runner.manifestDigest).toBe(capturedManifestDigest)

		const mismatch = compileGraph(graph, registry, {
			mode: 'partial',
			expectedCatalogManifestDigest: capturedManifestDigest
		})
		expect(mismatch).toMatchObject({
			ok: false,
			classification: 'terminalFailure',
			diagnostics: [{
				code: 'CatalogManifestDigestMismatch',
				path: 'options.expectedCatalogManifestDigest',
				expected: capturedManifestDigest,
				actual: registry.manifestDigest
			}]
		})
		const strictMismatch = compileGraph(graph, registry, {
			expectedCatalogManifestDigest: capturedManifestDigest
		})
		expect(strictMismatch).toMatchObject({
			mode: 'strict',
			ok: false,
			classification: 'terminalFailure',
			diagnostics: [{ code: 'CatalogManifestDigestMismatch' }]
		})
		expect(compileGraph(graph, registry, {
			mode: 'partial',
			expectedCatalogManifestDigest: registry.manifestDigest
		}).ok).toBe(true)

		const mismatchedRunner = createGraphRunner(registry, graph, {
			expectedCatalogManifestDigest: capturedManifestDigest
		})
		expect(mismatchedRunner.advance()).toMatchObject({
			kind: 'failed',
			classification: 'terminalFailure',
			diagnostics: [{ code: 'CatalogManifestDigestMismatch' }]
		})
		expect(BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES).toContain('CatalogManifestDigestMismatch')
	})

	it('binds partial artifact identities and artifact provenance to executable manifests', () => {
		const first = expressionTemplate('ScopedManifest', expressionMarker('value', 'first'))
		const second = expressionTemplate('ScopedManifest', expressionMarker('value', 'second'))
		const graph: SynthesisGraph = {
			nodes: [{ id: 'root', templateId: first.modelId, inputs: {} }],
			finalNodeId: 'root'
		}
		const compile = (template: typeof first) => compileGraph(graph, createTemplateRegistry([template]), {
			mode: 'partial',
			compilationScope: 'same-authored-job'
		})
		const firstResult = compile(first)
		const secondResult = compile(second)

		expect(firstResult.ok).toBe(true)
		expect(secondResult.ok).toBe(true)
		if (!firstResult.ok || !secondResult.ok) return

		expect(firstResult.finalArtifact.source.templateManifestDigest).toBe(first.manifestDigest)
		expect(secondResult.finalArtifact.source.templateManifestDigest).toBe(second.manifestDigest)
		expect(firstResult.finalArtifact.unresolvedInputs[0]?.id)
			.not.toBe(secondResult.finalArtifact.unresolvedInputs[0]?.id)
	})
})
