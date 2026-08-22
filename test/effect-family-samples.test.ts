import { describe, expect, it } from 'vitest'

import {
	compileGraph,
	createTemplateRegistry,
	type GraphTemplateDefinition,
	type SynthesisInput,
	type SynthesisNode
} from '../src/index.js'
import { effectApplicationGraphTemplateInputs } from '../samples/effect-application-templates.js'
import { effectConcurrencyGraphTemplateInputs } from '../samples/effect-concurrency-templates.js'
import { effectConfigGraphTemplateInputs } from '../samples/effect-config-templates.js'
import { effectCoordinationGraphTemplateInputs } from '../samples/effect-coordination-templates.js'
import { effectErrorGraphTemplateInputs } from '../samples/effect-error-templates.js'
import { effectObservabilityGraphTemplateInputs } from '../samples/effect-observability-templates.js'
import { effectResourceGraphTemplateInputs } from '../samples/effect-resource-templates.js'
import { effectScheduleGraphTemplateInputs } from '../samples/effect-schedule-templates.js'
import { effectSchemaGraphTemplateInputs } from '../samples/effect-schema-templates.js'
import { effectServiceLayerGraphTemplateInputs } from '../samples/effect-service-layer-templates.js'
import { effectStreamGraphTemplateInputs } from '../samples/effect-stream-templates.js'
import { effectTestingGraphTemplateInputs } from '../samples/effect-testing-templates.js'
import { effectGraphTemplateInputs } from '../samples/effect-ts.js'

type AnyExecutableTemplate = GraphTemplateDefinition<any, string, any, any>

const families: ReadonlyArray<readonly [string, readonly AnyExecutableTemplate[], readonly string[]]> = [
	['schema', effectSchemaGraphTemplateInputs, ['SchemaStruct', 'SchemaArray', 'SchemaUnion', 'SchemaOptional', 'SchemaDecodeUnknown', 'SchemaEncode', 'SchemaTaggedErrorDeclaration']],
	['service-layer', effectServiceLayerGraphTemplateInputs, ['ContextTagDeclaration', 'EffectServiceDeclaration', 'LayerSucceed', 'LayerEffect', 'LayerScoped', 'LayerMerge', 'LayerProvide', 'EffectProvideLayer']],
	['application', effectApplicationGraphTemplateInputs, ['EffectFnDeclaration', 'EffectProgramDeclaration', 'EffectNodeMainSourceFile', 'EffectManagedRuntime', 'LayerLaunch']],
	['error', effectErrorGraphTemplateInputs, ['EffectCatchTags', 'EffectCatchIf', 'EffectFilterOrFail', 'EffectTapError', 'EffectTapErrorCause', 'EffectExit', 'EffectSandbox', 'EffectOrDie']],
	['concurrency', effectConcurrencyGraphTemplateInputs, ['EffectForEach', 'EffectFork', 'EffectForkScoped', 'FiberJoin', 'FiberInterrupt', 'EffectRaceAll', 'EffectMakeSemaphore']],
	['schedule', effectScheduleGraphTemplateInputs, ['ScheduleRecurs', 'ScheduleSpaced', 'ScheduleExponential', 'ScheduleJittered', 'EffectRepeat', 'EffectRetryOrElse', 'EffectTimeoutOption']],
	['resource', effectResourceGraphTemplateInputs, ['EffectAcquireUseRelease', 'EffectAddFinalizer', 'EffectOnInterrupt', 'EffectUninterruptibleMask']],
	['config', effectConfigGraphTemplateInputs, ['ConfigString', 'ConfigNumber', 'ConfigBoolean', 'ConfigSecret', 'ConfigOptional', 'ConfigNested', 'ConfigAll', 'EffectConfig']],
	['coordination', effectCoordinationGraphTemplateInputs, ['RefMake', 'RefGet', 'RefSet', 'RefUpdate', 'RefModify', 'DeferredMake', 'DeferredAwait', 'DeferredSucceed', 'QueueBounded', 'QueueOffer', 'QueueTake', 'QueueShutdown', 'PubSubPublish', 'PubSubSubscribe']],
	['observability', effectObservabilityGraphTemplateInputs, ['EffectLogInfo', 'EffectLogWarn', 'EffectLogError', 'EffectAnnotateLogs', 'EffectWithSpan', 'MetricCounter', 'MetricHistogram']],
	['stream', effectStreamGraphTemplateInputs, ['StreamFromIterable', 'StreamFromEffect', 'StreamPaginate', 'StreamMapEffect', 'StreamFilter', 'StreamRetry', 'StreamRunCollect', 'StreamRunForEach']],
	['testing', effectTestingGraphTemplateInputs, ['EffectVitestTest', 'EffectVitestScopedTest', 'TestClockAdjust', 'TestLayerProvide', 'TestServiceFake']]
]

const extendedEffectTemplates = [...effectGraphTemplateInputs, ...families.flatMap(([, templates]) => templates)]
const registry = createTemplateRegistry(extendedEffectTemplates)
const raw = (code: string): SynthesisInput => ({ kind: 'rawCode', code })
const literal = (value: unknown): SynthesisInput => ({ kind: 'literal', value })
const ref = (nodeId: string): SynthesisInput => ({ kind: 'ref', nodeId })

describe('extended Effect v3 template families', () => {
	it.each(families)('registers the %s family in stable order', (_name, templates, expectedIds) => {
		expect(templates.map(template => template.modelId)).toEqual(expectedIds)
	})

	it('registers all 88 additions alongside the core catalog without collisions', () => {
		const added = families.flatMap(([, templates]) => templates)
		expect(added).toHaveLength(88)
		expect(new Set(extendedEffectTemplates.map(template => template.modelId)).size).toBe(128)
		expect(() => createTemplateRegistry(extendedEffectTemplates)).not.toThrow()
	})

	it('propagates decoded Schema types into the Effect success channel', () => {
		const nodes: SynthesisNode[] = [
			{ id: 'item', templateId: 'SchemaStruct', typeArguments: { A: { ts: '{ readonly name: string }' }, I: { ts: '{ readonly name: string }' }, R: { ts: 'never' } }, inputs: { fields: raw('{ name: Schema.String }') } },
			{ id: 'array', templateId: 'SchemaArray', typeArguments: { A: { ts: '{ readonly name: string }' }, I: { ts: '{ readonly name: string }' }, R: { ts: 'never' } }, inputs: { item: ref('item') } },
			{ id: 'decode', templateId: 'SchemaDecodeUnknown', typeArguments: { A: { ts: 'ReadonlyArray<{ readonly name: string }>' }, I: { ts: 'ReadonlyArray<{ readonly name: string }>' }, R: { ts: 'never' } }, inputs: { schema: ref('array'), value: raw('input') } }
		]
		const result = compileGraph({ nodes, finalNodeId: 'decode' }, registry)
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (result.ok) expect(result.finalArtifact.type).toMatchObject({ nominal: 'effect/Effect', ts: expect.stringContaining('ReadonlyArray') })
	})

	it('composes Stream construction, filtering, and collection with correlated channels', () => {
		const nodes: SynthesisNode[] = [
			{ id: 'stream', templateId: 'StreamFromIterable', typeArguments: { A: { ts: 'number' } }, inputs: { iterable: literal([1, 2, 3]) } },
			{ id: 'filtered', templateId: 'StreamFilter', typeArguments: { A: { ts: 'number' }, E: { ts: 'never' }, R: { ts: 'never' } }, inputs: { stream: ref('stream'), predicate: raw('value => value > 1') } },
			{ id: 'collect', templateId: 'StreamRunCollect', typeArguments: { A: { ts: 'number' }, E: { ts: 'never' }, R: { ts: 'never' } }, inputs: { stream: ref('filtered') } }
		]
		const result = compileGraph({ nodes, finalNodeId: 'collect' }, registry)
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (result.ok) expect(result.finalArtifact.type).toMatchObject({ nominal: 'effect/Effect' })
	})

	it('assembles declaration statements into the Node application source-file template', () => {
		const nodes: SynthesisNode[] = [
			{ id: 'program', templateId: 'EffectProgramDeclaration', typeArguments: { A: { ts: 'void' }, E: { ts: 'never' }, R: { ts: 'never' } }, inputs: { name: literal('program'), program: raw('Effect.void') } },
			{ id: 'file', templateId: 'EffectNodeMainSourceFile', inputs: { body: { kind: 'fragmentCollection', items: [{ kind: 'ref', nodeId: 'program' }] } } }
		]
		const result = compileGraph({ nodes, finalNodeId: 'file', goal: { outputKind: 'sourceFile' } }, registry)
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (result.ok) {
			expect(result.finalArtifact.code).toContain('import { Config, Context, Deferred, Effect')
			expect(result.finalArtifact.code).toContain('export const program = Effect.void')
		}
	})
})
