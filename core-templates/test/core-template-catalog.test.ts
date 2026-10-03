import { describe, expect, it } from 'vitest'

import { coreTemplateFamilies, coreTemplateManifests, createCoreTemplateRegistry } from '@synthesize-regions/core-templates'
import { compileGraph, type SynthesisInput } from 'synthesize-regions'

const expectedFamilies = [
	['base-patterns', 'e-samplesBasePatterns', 33],
	['concurrency', 'effect-concurrency-templates', 7],
	['coordination', 'effect-coordination-templates', 14],
	['effect-es-toolkit', 'effect-es-toolkit-templates', 14],
	['resource', 'effect-resource-templates', 4],
	['schema', 'effect-schema-templates', 103],
	['stream', 'effect-stream-v4-templates', 43],
	['testing', 'effect-v4-testing-foundational-templates', 16],
	['workflow', 'effect-workflow-templates', 10],
	['application', 'effect-application-templates', 5],
	['config', 'effect-config-templates', 38],
	['error', 'effect-error-management-v4-templates', 44],
	['observability', 'effect-observability-v4-templates', 40],
	['schedule', 'effect-schedule-templates', 34],
	['service-layer', 'effect-service-layer-templates', 8],
	['effect', 'effect-ts', 32],
	['es-toolkit', 'es-toolkit-templates', 34]
] as const

describe('curated core-template catalog', () => {
	it('registers the seventeen maintained families in stable order', () => {
		expect(coreTemplateFamilies.map(({ family, module, templates }) => [family, module, templates.length]))
			.toEqual(expectedFamilies.map(entry => [...entry]))
	})

	it('registers 479 unique models with no cross-family collision', () => {
		const registry = createCoreTemplateRegistry()
		const modelIds = registry.list().map(definition => definition.modelId)
		expect(registry.list()).toHaveLength(479)
		expect(new Set(modelIds).size).toBe(479)
		expect(registry.summaries()).toHaveLength(479)
	})

	it('pins the catalog and manifest digests', () => {
		const registry = createCoreTemplateRegistry()
		expect(registry.contractDigest).toBe('c7_3d3fccd38307a6ab55faabd64982abce146c0b8b9344855ec39001ee2ac0e260')
		expect(registry.manifestDigest).toBe('m4_fb79dd43260d1a11c89cad8a12a791046474c809c0bdfe0476857491ab97a0da')
	})

	it('exports manifest-only entries sorted by modelId', () => {
		const manifests = coreTemplateManifests()
		expect(manifests).toHaveLength(479)
		expect(manifests.map(manifest => manifest.modelId))
			.toEqual([...manifests.map(manifest => manifest.modelId)].sort())
		for (const manifest of manifests) {
			expect(Object.keys(manifest)).toEqual(
				expect.arrayContaining(['modelId', 'inputs', 'output', 'source'])
			)
			expect(Object.keys(manifest)).not.toContain('manifestDigest')
			expect(Object.keys(manifest)).not.toContain('invoke')
			expect(Object.keys(manifest)).not.toContain('summary')
		}
	})

	it('compiles cross-family graphs from the shared registry alone', () => {
		const registry = createCoreTemplateRegistry()
		const raw = (code: string): SynthesisInput => ({ kind: 'rawCode', code })
		const literal = (value: unknown): SynthesisInput => ({ kind: 'literal', value })
		const collection = (...nodeIds: string[]): SynthesisInput => ({
			kind: 'fragmentCollection',
			items: nodeIds.map(nodeId => ({ kind: 'ref', nodeId }))
		})

		const application = compileGraph({
			nodes: [
				{
					id: 'tag',
					templateId: 'ContextTagDeclaration',
					inputs: {
						name: literal('CatalogService'),
						key: literal('CatalogService'),
						serviceType: raw('{ readonly greet: (name: string) => string }')
					}
				},
				{
					id: 'layer',
					templateId: 'LayerSucceed',
					typeArguments: { I: { ts: 'never' }, S: { ts: '{ readonly greet: (name: string) => string }' } },
					inputs: { tag: raw('CatalogService'), service: raw('{ greet: (name) => name }') }
				},
				{
					id: 'main',
					templateId: 'ApplicationMain',
					typeArguments: {
						A: { ts: 'string' }, EProgram: { ts: 'never' },
						P: { ts: 'unknown' }, ELayer: { ts: 'never' }
					},
					inputs: {
						declarations: collection('tag'),
						layers: collection('layer'),
						program: raw('CatalogService')
					}
				}
			],
			finalNodeId: 'main',
			goal: { outputKind: 'sourceFile' }
		}, registry)

		expect(application.ok, JSON.stringify(application.diagnostics, null, 2)).toBe(true)
		if (!application.ok) return
		expect(application.finalArtifact.code).toContain(
			'export class CatalogService extends Context.Service<any, { readonly greet: (name: string) => string }>()("CatalogService")'
		)
		expect(application.finalArtifact.code).toContain(
			'const ApplicationLayer = Layer.mergeAll(Layer.succeed(CatalogService, { greet: (name) => name }))'
		)

		const workflow = compileGraph({
			nodes: [
				{
					id: 'call',
					templateId: 'EffectSucceed',
					typeArguments: { A: { ts: 'number' } },
					inputs: { value: literal(1) }
				},
				{
					id: 'resilient',
					templateId: 'ResilientClientCall',
					typeArguments: {
						A: { ts: 'number' }, E: { ts: 'never' }, R: { ts: 'never' },
						B: { ts: 'number' }, E2: { ts: 'never' }, R2: { ts: 'never' },
						EOut: { ts: 'never' }
					},
					inputs: {
						call: { kind: 'ref', nodeId: 'call' },
						timeout: literal(1000),
						baseDelay: literal(100),
						factor: literal(2),
						retries: literal(3),
						tag: literal('ClientError'),
						recover: raw('() => Effect.succeed(0)')
					}
				}
			],
			finalNodeId: 'resilient'
		}, registry)

		expect(workflow.ok, JSON.stringify(workflow.diagnostics, null, 2)).toBe(true)
		if (!workflow.ok) return
		expect(workflow.finalArtifact.code).toBe(
			'Effect.retry(Effect.timeout(Effect.succeed(1), 1000), ' +
			'Schedule.jittered(Schedule.max([Schedule.exponential(100, 2), Schedule.recurs(3)])))' +
			'.pipe(Effect.catchTag("ClientError", () => Effect.succeed(0)))'
		)
	})
})
