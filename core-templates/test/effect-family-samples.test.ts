import { describe, expect, it } from 'vitest'

import {
	compileGraph,
	createTemplateRegistry,
	type GraphTemplateDefinition,
	type SynthesisInput,
	type SynthesisNode
} from 'synthesize-regions'

import { effectApplicationGraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/application'
import { effectConcurrencyGraphTemplateInputs, effectCoordinationGraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/concurrency'
import { effectConfigV4GraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/config'
import { effectGraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/core'
import { effectErrorGraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/errors'
import { effectServiceLayerGraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/layer'
import { effectObservabilityGraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/observability'
import { effectResourceGraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/resources'
import { effectScheduleGraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/schedule'
import { effectSchemaGraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/schema'
import { effectStreamV4GraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/stream'
import { effectV4TestingFoundationalGraphTemplateInputs } from '@synthesize-regions/core-templates/effect-v4/testing'

type AnyExecutableTemplate = GraphTemplateDefinition<any, string, any, any>

const families: ReadonlyArray<readonly [string, readonly AnyExecutableTemplate[], readonly string[]]> = [
	['schema', effectSchemaGraphTemplateInputs, [
		'SchemaString', 'SchemaFinite', 'SchemaBoolean', 'SchemaBigInt', 'SchemaSymbol', 'SchemaObjectKeyword', 'SchemaUndefined', 'SchemaVoid', 'SchemaAny', 'SchemaUnknown', 'SchemaNever', 'SchemaNull', 'SchemaNonEmptyString', 'SchemaInt', 'SchemaTrim', 'SchemaFiniteFromString', 'SchemaDate', 'SchemaDateFromString', 'SchemaDuration', 'SchemaDurationFromString', 'SchemaDurationFromMillis', 'SchemaDurationFromNanos', 'SchemaRevealCodec', 'SchemaUniqueSymbol', 'SchemaTemplateLiteral', 'SchemaTemplateLiteralParser', 'SchemaEnum', 'SchemaMutable', 'SchemaInstanceOf', 'SchemaDeclare', 'SchemaSuspend', 'SchemaLiteral', 'SchemaLiterals', 'SchemaUnion', 'SchemaNullOr', 'SchemaUndefinedOr', 'SchemaTuple', 'SchemaTupleWithRest', 'SchemaArray', 'SchemaNonEmptyArray', 'SchemaRecord', 'SchemaStruct', 'SchemaStructWithRest', 'SchemaOptional', 'SchemaOptionalKey', 'SchemaTag', 'SchemaTagDefaultOmit', 'SchemaTaggedStruct', 'SchemaAnnotate', 'SchemaAnnotateEncoded', 'SchemaAnnotateKey', 'SchemaEncodeKeys', 'SchemaMakeFilter', 'SchemaCheck', 'SchemaIsMinLength', 'SchemaIsMaxLength', 'SchemaIsLengthBetween', 'SchemaIsBetween', 'SchemaIsInt', 'SchemaWithConstructorDefault', 'SchemaWithDecodingDefaultType', 'SchemaWithDecodingDefaultTypeKey', 'SchemaBrand', 'SchemaMake', 'SchemaMakeOption', 'SchemaMakeEffect', 'SchemaDecodeUnknown', 'SchemaEncode', 'SchemaDecodeUnknownSync', 'SchemaDecodeUnknownExit', 'SchemaDecodeUnknownOption', 'SchemaDecodeUnknownResult', 'SchemaDecodeUnknownEffect', 'SchemaDecodeUnknownPromise', 'SchemaEncodeSync', 'SchemaEncodeExit', 'SchemaEncodeOption', 'SchemaEncodeResult', 'SchemaEncodeEffect', 'SchemaEncodePromise', 'SchemaIs', 'SchemaToCodecJson', 'SchemaToEquivalence', 'SchemaToFormatter', 'SchemaToArbitrary', 'SchemaOverrideToEquivalence', 'SchemaOverrideToFormatter', 'SchemaIssueFormatterDefault', 'SchemaIssueFormatterStandardSchemaV1', 'SchemaOption', 'SchemaOptionFromOptionalKey', 'SchemaOptionFromNullishOr', 'SchemaResult', 'SchemaExit', 'SchemaReadonlySet', 'SchemaReadonlyMap', 'SchemaHashSet', 'SchemaHashMap', 'SchemaRedacted', 'SchemaRedactedFromValue', 'SchemaClassDeclaration', 'SchemaTaggedClassDeclaration', 'SchemaTaggedErrorDeclaration'
	]],
	['service-layer', effectServiceLayerGraphTemplateInputs, [
		'ContextTagDeclaration', 'EffectServiceDeclaration', 'LayerSucceed', 'LayerEffect', 'LayerScoped', 'LayerMerge', 'LayerProvide', 'EffectProvideLayer'
	]],
	['application', effectApplicationGraphTemplateInputs, [
		'EffectFnDeclaration', 'EffectProgramDeclaration', 'EffectNodeMainSourceFile', 'EffectManagedRuntime', 'LayerLaunch'
	]],
	['error', effectErrorGraphTemplateInputs, [
		'EffectFailSync', 'EffectGenYieldError', 'EffectResult', 'EffectOption', 'EffectCatch', 'EffectCatchTag', 'EffectCatchTags', 'EffectCatchIf', 'EffectCatchFilter', 'EffectCatchReason', 'EffectMapError', 'EffectMapBoth', 'EffectFilterOrFail', 'EffectFilterOrFailNarrow', 'EffectTapError', 'EffectTapErrorTag', 'EffectTapCause', 'EffectTapDefect', 'EffectFlip', 'EffectOrElseSucceed', 'EffectFirstSuccessOf', 'EffectMatch', 'EffectMatchEffect', 'EffectMatchCause', 'EffectMatchCauseEffect', 'EffectIgnore', 'EffectIgnoreCause', 'EffectValidate', 'EffectPartition', 'EffectRetry', 'EffectRetryOrElse', 'EffectTimeout', 'EffectTimeoutOption', 'EffectTimeoutOrElse', 'EffectDie', 'EffectOrDie', 'EffectExit', 'EffectCatchDefect', 'EffectCatchCause', 'EffectSandbox', 'EffectFailCause', 'CauseHasFails', 'CauseHasDies', 'CauseHasInterrupts'
	]],
	['concurrency', effectConcurrencyGraphTemplateInputs, [
		'EffectForEach', 'EffectFork', 'EffectForkScoped', 'FiberJoin', 'FiberInterrupt', 'EffectRaceAll', 'EffectMakeSemaphore'
	]],
	['schedule', effectScheduleGraphTemplateInputs, [
		'ScheduleForever', 'ScheduleOnce', 'ScheduleDuration', 'ScheduleRecurs', 'ScheduleSpaced', 'ScheduleFixed', 'ScheduleExponential', 'ScheduleFibonacci', 'ScheduleIdentity', 'ScheduleMin', 'ScheduleMax', 'ScheduleConcat', 'ScheduleJittered', 'ScheduleWhile', 'ScheduleAddDelay', 'ScheduleModifyDelay', 'ScheduleTap', 'ScheduleUpToTimes', 'CronMake', 'CronParse', 'CronParseUnsafe', 'CronMatch', 'CronNext', 'CronSequence', 'ScheduleCron', 'EffectRepeat', 'EffectRepeatTimes', 'EffectSchedule', 'EffectRepeatWhile', 'EffectRepeatUntil', 'EffectRepeatOrElse', 'EffectRetrySchedule', 'EffectRetryTimes', 'EffectRetryWhile'
	]],
	['resource', effectResourceGraphTemplateInputs, [
		'EffectAcquireUseRelease', 'EffectAddFinalizer', 'EffectOnInterrupt', 'EffectUninterruptibleMask'
	]],
	['config', effectConfigV4GraphTemplateInputs, [
		'ConfigString', 'ConfigNonEmptyString', 'ConfigFinite', 'ConfigInt', 'ConfigPort', 'ConfigBoolean', 'ConfigLiteral', 'ConfigLiterals', 'ConfigDuration', 'ConfigDate', 'ConfigUrl', 'ConfigLogLevel', 'ConfigRedacted', 'ConfigSchema', 'ConfigArraySchema', 'ConfigRecordSchema', 'ConfigAll', 'ConfigNested', 'ConfigUnwrap', 'ConfigWithDefault', 'ConfigOption', 'ConfigOrElse', 'ConfigMap', 'ConfigMapOrFail', 'ConfigParse', 'ConfigAsEffect', 'ConfigProviderFromEnv', 'ConfigProviderFromUnknown', 'ConfigProviderFromDotEnvContents', 'ConfigProviderFromDotEnv', 'ConfigProviderFromDir', 'ConfigProviderNested', 'ConfigProviderConstantCase', 'ConfigProviderMapInput', 'ConfigProviderOrElse', 'ConfigProviderLayer', 'ConfigProviderLayerAdd', 'ConfigProviderLayerAddPrimary'
	]],
	['coordination', effectCoordinationGraphTemplateInputs, [
		'RefMake', 'RefGet', 'RefSet', 'RefUpdate', 'RefModify', 'DeferredMake', 'DeferredAwait', 'DeferredSucceed', 'QueueBounded', 'QueueOffer', 'QueueTake', 'QueueShutdown', 'PubSubPublish', 'PubSubSubscribe'
	]],
	['observability', effectObservabilityGraphTemplateInputs, [
		'EffectLog', 'EffectLogDebug', 'EffectLogInfo', 'EffectLogWarning', 'EffectLogError', 'EffectLogFatal', 'EffectAnnotateLogs', 'EffectAnnotateLogsRecord', 'EffectAnnotateLogsScoped', 'EffectWithLogSpan', 'EffectProvideMinimumLogLevel', 'LoggerMake', 'LoggerLayer', 'LoggerDefault', 'LoggerTracer', 'LoggerConsoleLogFmt', 'LoggerConsolePretty', 'LoggerConsoleStructured', 'LoggerConsoleJson', 'EffectWithSpan', 'EffectAnnotateCurrentSpan', 'MetricCounter', 'MetricGauge', 'MetricLinearBoundaries', 'MetricHistogram', 'MetricTimer', 'MetricSummary', 'MetricFrequency', 'MetricWithConstantInput', 'MetricWithAttributes', 'MetricValue', 'EffectTrackSuccesses', 'EffectTrackDuration', 'EffectProvideMetricAttributes', 'FiberSetMake', 'FiberSetRun', 'FiberSetAdd', 'FiberSetSize', 'FiberSetJoin', 'FiberSetAwaitEmpty'
	]],
	['stream', effectStreamV4GraphTemplateInputs, [
		'StreamEmpty', 'StreamSucceed', 'StreamMake', 'StreamFail', 'StreamFromArray', 'StreamFromIterable', 'StreamFromEffect', 'StreamFromEffectRepeat', 'StreamTick', 'StreamUnfold', 'StreamIterate', 'StreamRange', 'StreamPaginate', 'StreamFromQueue', 'StreamFromPubSub', 'StreamFromSchedule', 'StreamScoped', 'StreamMap', 'StreamMapEffect', 'StreamMapEffectConcurrent', 'StreamTap', 'StreamFilter', 'StreamTake', 'StreamTakeWhile', 'StreamFlattenIterable', 'StreamMapAccum', 'StreamGroupedWithin', 'StreamBuffer', 'StreamSchedule', 'StreamRetry', 'StreamZip', 'StreamZipWith', 'StreamTransduce', 'StreamRun', 'StreamRunCollect', 'StreamRunDrain', 'StreamRunHead', 'StreamRunLast', 'StreamRunCount', 'StreamRunSum', 'StreamRunFold', 'StreamRunFoldEffect', 'StreamRunForEach'
	]],
	['testing', effectV4TestingFoundationalGraphTemplateInputs, [
		'EffectVitestEffectTest', 'EffectVitestLiveTest', 'EffectVitestLayerSuite', 'EffectVitestEffectProperty', 'TestClockAdjust', 'TestClockSetTime', 'TestClockWithLive', 'TestClockLayer', 'TestConsoleLayer', 'TestConsoleLogLines', 'TestConsoleErrorLines', 'RandomWithSeed', 'AssertOk', 'AssertStrictEqual', 'AssertDeepStrictEqual', 'EffectVitestSourceFile'
	]],
]

const extendedEffectTemplates = [...effectGraphTemplateInputs, ...families.flatMap(([, templates]) => templates)]
const registry = createTemplateRegistry(extendedEffectTemplates)
const raw = (code: string): SynthesisInput => ({ kind: 'rawCode', code })
const literal = (value: unknown): SynthesisInput => ({ kind: 'literal', value })
const ref = (nodeId: string): SynthesisInput => ({ kind: 'ref', nodeId })

describe('extended Effect v4 template families', () => {
	it.each(families)('registers the %s family in stable order', (_name, templates, expectedIds) => {
		expect(templates.map(template => template.modelId)).toEqual(expectedIds)
	})

	it('registers all 356 additions alongside the core catalog without collisions', () => {
		const added = families.flatMap(([, templates]) => templates)
		expect(added).toHaveLength(356)
		expect(new Set(extendedEffectTemplates.map(template => template.modelId)).size).toBe(388)
		expect(() => createTemplateRegistry(extendedEffectTemplates)).not.toThrow()
	})

	it('propagates decoded Schema types into the Effect success channel', () => {
		const nodes: SynthesisNode[] = [
			{ id: 'item', templateId: 'SchemaStruct', typeArguments: { A: { ts: '{ readonly name: string }' }, I: { ts: '{ readonly name: string }' }, RD: { ts: 'never' }, RE: { ts: 'never' } }, inputs: { fields: raw('{ name: Schema.String }') } },
			{ id: 'array', templateId: 'SchemaArray', typeArguments: { A: { ts: '{ readonly name: string }' }, I: { ts: '{ readonly name: string }' }, RD: { ts: 'never' }, RE: { ts: 'never' } }, inputs: { item: ref('item') } },
			{ id: 'decode', templateId: 'SchemaDecodeUnknown', typeArguments: { A: { ts: 'ReadonlyArray<{ readonly name: string }>' }, I: { ts: 'ReadonlyArray<{ readonly name: string }>' }, RD: { ts: 'never' }, RE: { ts: 'never' } }, inputs: { schema: ref('array'), value: raw('input') } }
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
