import { describe, expect, it } from 'vitest'

import {
	compileGraph,
	createTemplateRegistry,
	defineTemplate,
	type GraphCompilationResult,
	type SynthesisInput,
	type SynthesisNode
} from '../src/index.js'
import { effectApplicationGraphTemplateInputs } from '../core-templates/effect-application-templates.js'
import { effectConcurrencyGraphTemplateInputs } from '../core-templates/effect-concurrency-templates.js'
import { effectConfigV4GraphTemplateInputs } from '../core-templates/effect-config-templates.js'
import { effectCoordinationGraphTemplateInputs } from '../core-templates/effect-coordination-templates.js'
import { effectErrorGraphTemplateInputs } from '../core-templates/effect-error-management-v4-templates.js'
import { effectObservabilityGraphTemplateInputs } from '../core-templates/effect-observability-v4-templates.js'
import { effectResourceGraphTemplateInputs } from '../core-templates/effect-resource-templates.js'
import { effectScheduleGraphTemplateInputs } from '../core-templates/effect-schedule-templates.js'
import { effectSchemaGraphTemplateInputs } from '../core-templates/effect-schema-templates.js'
import { effectServiceLayerGraphTemplateInputs } from '../core-templates/effect-service-layer-templates.js'
import { effectStreamV4GraphTemplateInputs } from '../core-templates/effect-stream-v4-templates.js'
import { effectV4TestingFoundationalGraphTemplateInputs } from '../core-templates/effect-v4-testing-foundational-templates.js'
import { effectGraphTemplateInputs } from '../core-templates/effect-ts.js'
import {
	effectWorkflowGraphTemplateInputs
} from '../core-templates/effect-workflow-templates.js'

const existingEffectTemplates = [
	...effectGraphTemplateInputs,
	...effectSchemaGraphTemplateInputs,
	...effectServiceLayerGraphTemplateInputs,
	...effectApplicationGraphTemplateInputs,
	...effectErrorGraphTemplateInputs,
	...effectConcurrencyGraphTemplateInputs,
	...effectScheduleGraphTemplateInputs,
	...effectResourceGraphTemplateInputs,
	...effectConfigV4GraphTemplateInputs,
	...effectCoordinationGraphTemplateInputs,
	...effectObservabilityGraphTemplateInputs,
	...effectStreamV4GraphTemplateInputs,
	...effectV4TestingFoundationalGraphTemplateInputs
]

const registry = createTemplateRegistry([...existingEffectTemplates, ...effectWorkflowGraphTemplateInputs])
const raw = (code: string): SynthesisInput => ({ kind: 'rawCode', code })
const literal = (value: unknown): SynthesisInput => ({ kind: 'literal', value })
const ref = (nodeId: string): SynthesisInput => ({ kind: 'ref', nodeId })
const collection = (...nodeIds: string[]): SynthesisInput => ({
	kind: 'fragmentCollection',
	items: nodeIds.map(nodeId => ({ kind: 'ref', nodeId }))
})

const defaultTypeArguments = (templateId: string) => {
	const template = effectWorkflowGraphTemplateInputs.find(candidate => candidate.modelId === templateId)
	if (!template?.typeParameters) return undefined
	return Object.fromEntries(Object.keys(template.typeParameters).map(name => [
		name,
		{ ts: name.startsWith('R') || name === 'ELayer' || name === 'EProgram' ? 'never' : 'unknown' }
	]))
}

function compile(
	templateId: string,
	inputs: Record<string, SynthesisInput>,
	supportingNodes: readonly SynthesisNode[] = []
): GraphCompilationResult {
	const typeArguments = defaultTypeArguments(templateId)
	const subject: SynthesisNode = {
		id: 'subject', templateId, inputs,
		...(typeArguments === undefined ? {} : { typeArguments })
	}
	return compileGraph({
		nodes: [...supportingNodes, subject],
		finalNodeId: 'subject',
		...(templateId === 'ApplicationMain' ? { goal: { outputKind: 'sourceFile' as const } } : {})
	}, registry)
}

function expectCode(
	templateId: string,
	inputs: Record<string, SynthesisInput>,
	expected: string,
	supportingNodes: readonly SynthesisNode[] = []
): void {
	const result = compile(templateId, inputs, supportingNodes)
	expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
	if (result.ok) expect(result.finalArtifact.code).toBe(expected)
}

const resilientInputs = {
	call: raw('clientCall'), timeout: literal(1000), baseDelay: literal(100), factor: literal(2),
	retries: literal(3), tag: literal('ClientError'), recover: raw('error => recover(error)')
}

describe('Effect workflow template catalog', () => {
	it('registers ten stable workflow models and 399 total Effect models without collisions', () => {
		expect(effectWorkflowGraphTemplateInputs.map(template => template.modelId)).toEqual([
			'SchemaValidatedServiceOperation',
			'ServiceWithLiveAndTestLayers',
			'ConfigToApplicationLayer',
			'ResilientClientCall',
			'BoundedParallelTraverse',
			'ScopedResourceService',
			'QueueWorkerWithScopedFiber',
			'SchemaValidatedHttpEndpoint',
			'StreamIngestionPipeline',
			'ApplicationMain'
		])
		expect(existingEffectTemplates).toHaveLength(388)
		expect(new Set([...existingEffectTemplates, ...effectWorkflowGraphTemplateInputs].map(template => template.modelId)).size).toBe(398)
		expect(() => createTemplateRegistry([...existingEffectTemplates, ...effectWorkflowGraphTemplateInputs])).not.toThrow()
	})

	it.each([
		[
			'SchemaValidatedServiceOperation',
			{ inputSchema: raw('InputSchema'), outputSchema: raw('OutputSchema'), input: raw('input'), operation: raw('operate') },
			'Effect.flatMap(Schema.decodeUnknownEffect(InputSchema)(input), value => Effect.flatMap((operate)(value), Schema.encodeUnknownEffect(OutputSchema)))'
		],
		[
			'ServiceWithLiveAndTestLayers',
			{ liveName: literal('ServiceLive'), testName: literal('ServiceTest'), liveTag: raw('Service'), testTag: raw('Service'), liveService: raw('liveService'), testService: raw('testService') },
			'export const ServiceLive = Layer.succeed(Service, liveService), ServiceTest = Layer.succeed(Service, testService);'
		],
		[
			'ConfigToApplicationLayer',
			{ tag: raw('Service'), config: raw('AppConfig'), makeService: raw('config => makeService(config)') },
			'Layer.effect(Service, Effect.map(AppConfig, config => makeService(config)))'
		],
		[
			'ResilientClientCall', resilientInputs,
			'Effect.retry(Effect.timeout(clientCall, 1000), Schedule.jittered(Schedule.max([Schedule.exponential(100, 2), Schedule.recurs(3)]))).pipe(Effect.catchTag("ClientError", error => recover(error)))'
		],
		[
			'BoundedParallelTraverse',
			{ iterable: raw('values'), body: raw('value => handleValue(value)'), concurrency: literal(4) },
			'Effect.forEach(values, value => handleValue(value), { concurrency: 4 })'
		],
		[
			'ScopedResourceService',
			{ tag: raw('Service'), acquire: raw('acquire'), release: raw('(service, exit) => release(service, exit)') },
			'Layer.effect(Service, Effect.acquireRelease(acquire, (service, exit) => release(service, exit)))'
		],
		[
			'QueueWorkerWithScopedFiber',
			{ queue: raw('queue'), worker: raw('value => handleValue(value)') },
			'Effect.forkScoped(Effect.forever(Effect.flatMap(Queue.take(queue), value => handleValue(value))))'
		],
		[
			'SchemaValidatedHttpEndpoint',
			{ requestSchema: raw('RequestSchema'), responseSchema: raw('ResponseSchema'), extract: raw('request => request.body'), operation: raw('handle'), respond: raw('body => ({ body })') },
			'(request => Effect.flatMap(Schema.decodeUnknownEffect(RequestSchema)((request => request.body)(request)), value => Effect.flatMap((handle)(value), result => Effect.map(Schema.encodeUnknownEffect(ResponseSchema)(result), body => ({ body })))))'
		],
		[
			'StreamIngestionPipeline',
			{ stream: raw('source'), schema: raw('ItemSchema') },
			'Stream.mapEffect(source, (value) => Schema.decodeUnknownEffect(ItemSchema)(value))'
		]
	] as const)('compiles %s to its exact workflow', (templateId, inputs, expected) => {
		expectCode(templateId, inputs, expected)
	})

	it('assembles ApplicationMain with an empty declaration collection and a closed Layer', () => {
		const layer: SynthesisNode = {
			id: 'layer', templateId: 'LayerSucceed',
			typeArguments: { I: { ts: 'unknown' }, S: { ts: 'unknown' } },
			inputs: { tag: raw('Service'), service: raw('service') }
		}
		const result = compile('ApplicationMain', {
			declarations: collection(), layers: collection('layer'), program: raw('program')
		}, [layer])
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (!result.ok) return
		expect(result.finalArtifact.code).toBe(
			'import { Config, Context, Deferred, Effect, Fiber, Layer, ManagedRuntime, Metric, Option, PubSub, Queue, Ref, Schedule, Schema, Stream } from "effect"\n\n' +
			'const ApplicationLayer = Layer.mergeAll(Layer.succeed(Service, service))\n' +
			'const ApplicationRuntime = ManagedRuntime.make(ApplicationLayer)\n' +
			'const ApplicationProgram = program\n' +
			'void ApplicationRuntime.runPromise(ApplicationProgram).finally(() => ApplicationRuntime.dispose())'
		)
	})

	it('type-checks a generated ApplicationMain against Effect v4 declarations', () => {
		const nodes: SynthesisNode[] = [
			{
				id: 'tag', templateId: 'ContextTagDeclaration',
				inputs: {
					name: literal('WorkflowService'), key: literal('WorkflowService'),
					serviceType: raw('{ readonly value: number }')
				}
			},
			{
				id: 'layer', templateId: 'LayerSucceed',
				typeArguments: { I: { ts: 'unknown' }, S: { ts: '{ readonly value: number }' } },
				inputs: { tag: raw('WorkflowService'), service: raw('{ value: 1 }') }
			},
			{
				id: 'main', templateId: 'ApplicationMain',
				typeArguments: {
					A: { ts: 'unknown' }, EProgram: { ts: 'never' }, P: { ts: 'unknown' }, ELayer: { ts: 'never' }
				},
				inputs: {
					declarations: collection('tag'), layers: collection('layer'),
					program: raw('WorkflowService')
				}
			}
		]
		const result = compileGraph({
			nodes, finalNodeId: 'main', goal: { outputKind: 'sourceFile' }
		}, registry, {
			checkSemanticDiagnostics: true,
			tsConfigFilePath: 'tsconfig.typecheck.json',
			filePath: 'test/generated-effect-workflow-main.ts'
		})
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
	})

	it('type-checks resilient-client and framework-neutral endpoint workflows against Effect v4', () => {
		const semanticOptions = {
			checkSemanticDiagnostics: true,
			tsConfigFilePath: 'tsconfig.typecheck.json',
			semanticContext: { prelude: 'import { Effect, Schedule, Schema } from "effect"' }
		} as const
		const resilient = compileGraph({
			nodes: [{
				id: 'subject', templateId: 'ResilientClientCall',
				typeArguments: {
					A: { ts: 'number' }, E: { ts: '{ readonly _tag: "ClientError" }' }, R: { ts: 'never' },
					B: { ts: 'number' }, E2: { ts: 'never' }, R2: { ts: 'never' },
					EOut: { ts: '{ readonly _tag: "TimeoutException" }' }
				},
				inputs: {
					call: raw('Effect.fail({ _tag: "ClientError" as const })'),
					timeout: literal(1000), baseDelay: literal(100), factor: literal(2), retries: literal(3),
					tag: literal('ClientError'), recover: raw('() => Effect.succeed(1)')
				}
			}],
			finalNodeId: 'subject'
		}, registry, { ...semanticOptions, filePath: 'test/generated-resilient-client-workflow.ts' })
		expect(resilient.ok, JSON.stringify(resilient.diagnostics, null, 2)).toBe(true)

		const endpoint = compileGraph({
			nodes: [{
				id: 'subject', templateId: 'SchemaValidatedHttpEndpoint',
				typeArguments: {
					Request: { ts: '{ readonly body: unknown }' }, Response: { ts: '{ readonly body: number }' },
					A: { ts: 'number' }, I: { ts: 'number' }, B: { ts: 'number' }, O: { ts: 'number' },
					E: { ts: 'never' }, RDecode: { ts: 'never' }, ROperation: { ts: 'never' }, REncode: { ts: 'never' }
				},
				inputs: {
					requestSchema: raw('Schema.Number'), responseSchema: raw('Schema.Number'),
					extract: raw('request => request.body'), operation: raw('value => Effect.succeed(value)'),
					respond: raw('body => ({ body })')
				}
			}],
			finalNodeId: 'subject'
		}, registry, { ...semanticOptions, filePath: 'test/generated-schema-http-workflow.ts' })
		expect(endpoint.ok, JSON.stringify(endpoint.diagnostics, null, 2)).toBe(true)
	})

	it('propagates validated Stream element and requirement channels', () => {
		const result = compileGraph({
			nodes: [
				{
					id: 'source', templateId: 'StreamFromIterable',
					typeArguments: { A: { ts: 'unknown' } }, inputs: { iterable: literal([1, 2]) }
				},
				{
					id: 'pipeline', templateId: 'StreamIngestionPipeline',
					typeArguments: {
						A: { ts: 'number' }, I: { ts: 'number' }, ESource: { ts: 'never' },
						RSource: { ts: 'never' }, RSchema: { ts: 'never' }
					},
					inputs: { stream: ref('source'), schema: raw('Schema.Number') }
				}
			],
			finalNodeId: 'pipeline'
		}, registry)
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (result.ok) expect(result.finalArtifact.type).toMatchObject({
			nominal: 'effect/Stream', ts: expect.stringContaining('__streamSuccess?: () => (number)')
		})
	})

	it('rejects cross-family values at Schema and Queue workflow boundaries', () => {
		const plain = defineTemplate({
			modelId: 'WorkflowPlainExpression', inputs: {},
			output: { kind: 'expression', type: { ts: 'number' } }, source: '1'
		})
		const localRegistry = createTemplateRegistry([...existingEffectTemplates, ...effectWorkflowGraphTemplateInputs, plain])
		const schemaResult = compileGraph({
			nodes: [
				{ id: 'plain', templateId: plain.modelId, inputs: {} },
				{
					id: 'subject', templateId: 'StreamIngestionPipeline',
					typeArguments: { A: { ts: 'number' }, I: { ts: 'number' }, ESource: { ts: 'never' }, RSource: { ts: 'never' }, RSchema: { ts: 'never' } },
					inputs: { stream: ref('plain'), schema: raw('Schema.Number') }
				}
			], finalNodeId: 'subject'
		}, localRegistry)
		expect(schemaResult.ok).toBe(false)
		expect(schemaResult.diagnostics).toContainEqual(expect.objectContaining({
			code: 'IncompatibleFragmentType', nodeId: 'subject', inputName: 'stream'
		}))

		const queueResult = compileGraph({
			nodes: [
				{ id: 'plain', templateId: plain.modelId, inputs: {} },
				{
					id: 'subject', templateId: 'QueueWorkerWithScopedFiber',
					typeArguments: { A: { ts: 'number' }, E: { ts: 'never' }, R: { ts: 'never' } },
					inputs: { queue: ref('plain'), worker: raw('value => Effect.void') }
				}
			], finalNodeId: 'subject'
		}, localRegistry)
		expect(queueResult.ok).toBe(false)
		expect(queueResult.diagnostics).toContainEqual(expect.objectContaining({
			code: 'IncompatibleFragmentType', nodeId: 'subject', inputName: 'queue'
		}))
	})

	it.each([
		['BoundedParallelTraverse', { iterable: raw('values'), body: raw('value => Effect.succeed(value)'), concurrency: literal(0) }],
		['BoundedParallelTraverse', { iterable: raw('values'), body: raw('value => Effect.succeed(value)'), concurrency: literal(-1) }],
		['BoundedParallelTraverse', { iterable: raw('values'), body: raw('value => Effect.succeed(value)'), concurrency: literal(1.5) }],
		['ResilientClientCall', { ...resilientInputs, factor: literal(0) }],
		['ResilientClientCall', { ...resilientInputs, factor: literal(-1) }],
		['ResilientClientCall', { ...resilientInputs, retries: literal(-1) }],
		['ResilientClientCall', { ...resilientInputs, retries: literal(1.5) }]
	] as const)('rejects invalid strict numeric policy for %s', (templateId, inputs) => {
		const result = compile(templateId, inputs)
		expect(result.ok).toBe(false)
		expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'InvalidLiteralInput' }))
	})
})
