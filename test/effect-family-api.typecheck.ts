/* Compile-only coverage for the Effect 4.0.0-rc.117 APIs emitted by the extended sample catalog. */
import {
	Config,
	Context,
	Deferred,
	Effect,
	Fiber,
	Layer,
	ManagedRuntime,
	Metric,
	Option,
	PubSub,
	Queue,
	Ref,
	Schedule,
	Schema,
	Semaphore,
	Stream
} from 'effect'
import { TestClock } from 'effect/testing'

declare const effectAny: Effect.Effect<any, any, never>
declare const scopedEffectAny: Effect.Effect<any, any, any>
declare const layerAny: Layer.Layer<any, any, never>
declare const fiberAny: Fiber.Fiber<any, any>
declare const refAny: Ref.Ref<any>
declare const deferredAny: Deferred.Deferred<any, any>
declare const queueAny: Queue.Queue<any>
declare const pubSubAny: PubSub.PubSub<any>
declare const streamAny: Stream.Stream<any, any, never>

class ApiTag extends Context.Service<ApiTag, { readonly value: number }>()('ApiTag') {}
class ApiService extends Context.Service<ApiService, { readonly value: number }>()('ApiService', { make: Effect.succeed({ value: 1 }) }) {}
class ApiError extends Schema.TaggedError<ApiError>()('ApiError', { message: Schema.String }) {}
class ClientError { readonly _tag = 'ClientError' as const }

const struct = Schema.Struct({ value: Schema.Number })
const array = Schema.Array(struct)
void Schema.Union<readonly [typeof Schema.String, typeof Schema.Number]>([Schema.String, Schema.Number])
void Schema.optional(Schema.String)
void Schema.decodeUnknownEffect(array)([])
void Schema.encodeUnknownEffect(array)([{ value: 1 }])

const serviceLayer = Layer.succeed(ApiTag, { value: 1 })
void Layer.effect(ApiTag, Effect.succeed({ value: 1 }))
void Layer.effect(ApiTag, scopedEffectAny)
void Layer.merge(serviceLayer, serviceLayer)
void Layer.provide(serviceLayer, layerAny)
void Effect.provide(effectAny, layerAny)
void ManagedRuntime.make(serviceLayer)
void Layer.launch(layerAny)
void Effect.fn(function* () { return 1 })

void Effect.catchTags(effectAny, {})
void Effect.catchIf(effectAny, () => true, () => Effect.void)
void Effect.filterOrFail(effectAny, () => true, () => 'filtered')
void Effect.tapError(effectAny, () => Effect.void)
void Effect.tapCause(effectAny, () => Effect.void)
void Effect.exit(effectAny)
void Effect.sandbox(effectAny)
void Effect.orDie(effectAny)

void Effect.forEach([1], value => Effect.succeed(value), { concurrency: 1 })
void Effect.forkChild(effectAny)
void Effect.forkScoped(effectAny)
void Fiber.join(fiberAny)
void Fiber.interrupt(fiberAny)
void Effect.raceAll([effectAny])
void Semaphore.make(1)

const recurs = Schedule.recurs(1)
void Schedule.spaced(1000)
void Schedule.exponential(1000, 2)
void Schedule.jittered(recurs)
void Effect.repeat(effectAny, recurs)
void Effect.retryOrElse(effectAny, recurs, () => Effect.void)
void Effect.timeoutOption(effectAny, 1000)

void Effect.acquireUseRelease(Effect.succeed(1), value => Effect.succeed(value), () => Effect.void)
void Effect.addFinalizer(() => Effect.void)
void Effect.onInterrupt(effectAny, () => Effect.void)
void Effect.uninterruptibleMask(restore => restore(effectAny))

const stringConfig = Config.String('NAME')
void Config.Number('PORT')
void Config.Boolean('ENABLED')
void Config.Redacted('TOKEN')
void Config.option(stringConfig)
void Config.nested(stringConfig, 'APP')
void Effect.suspend(() => stringConfig)

void Ref.make(0)
void Ref.get(refAny)
void Ref.set(refAny, 1)
void Ref.update(refAny, value => value)
void Ref.modify(refAny, value => [value, value] as const)
void Deferred.make<unknown, unknown>()
void Deferred.into(Effect.succeed(1), deferredAny)
void Deferred.succeed(deferredAny, 1)
void Queue.bounded<unknown>(1)
void Queue.offer(queueAny, 1)
void Queue.take(queueAny)
void Queue.shutdown(queueAny)
void PubSub.publish(pubSubAny, 1)
void PubSub.subscribe(pubSubAny)

void Effect.logInfo('message')
void Effect.logWarning('message')
void Effect.logError('message')
void Effect.annotateLogs(effectAny, 'key', 'value')
void Effect.withSpan(effectAny, 'operation')
void Metric.counter('counter')
void Metric.histogram('histogram', { boundaries: Metric.linearBoundaries({ start: 0, width: 1, count: 10 }) })

const iterableStream = Stream.fromIterable([1, 2])
void Stream.fromEffect(effectAny)
void Stream.paginate<readonly number[], number>([], state => Effect.succeed([state, Option.none<readonly number[]>()] as const))
void Stream.mapEffect(iterableStream, value => Effect.succeed(value))
void Stream.filter(iterableStream, value => value > 0)
void Stream.retry(streamAny, recurs)
void Stream.runCollect(streamAny)
void Stream.runForEach(streamAny, () => Effect.void)

void TestClock.adjust(1000)
void Effect.provide(effectAny, serviceLayer)
void ApiService.make
void ApiError

// Compound workflow call shapes.
void Effect.flatMap(
	Schema.decodeUnknownEffect(struct)({ value: 1 }),
	value => Effect.flatMap(Effect.succeed(value), Schema.encodeUnknownEffect(struct))
)
export const ApiLive = Layer.succeed(ApiTag, { value: 1 }), ApiTest = Layer.succeed(ApiTag, { value: 0 })
void Layer.effect(ApiTag, Effect.map(Config.Number('VALUE'), value => ({ value })))
const boundedBackoff = Schedule.jittered(Schedule.max([Schedule.exponential(100, 2), Schedule.recurs(3)]))
void Effect.retry(
	Effect.timeout(Effect.fail(new ClientError()), 1000),
	boundedBackoff
).pipe(Effect.catchTag('ClientError', () => Effect.void))
void Effect.forEach([1, 2], value => Effect.succeed(value), { concurrency: 2 })
void Layer.effect(
	ApiTag,
	Effect.acquireRelease(Effect.succeed({ value: 1 }), () => Effect.void)
)
void Effect.forkScoped(Effect.forever(Effect.flatMap(Queue.take(queueAny), () => Effect.void)))
void ((request: { readonly body: unknown }) => Effect.flatMap(
	Schema.decodeUnknownEffect(struct)(request.body),
	value => Effect.flatMap(
		Effect.succeed(value),
		result => Effect.map(Schema.encodeUnknownEffect(struct)(result), body => ({ body }))
	)
))
void Stream.mapEffect(Stream.fromIterable<unknown>([{ value: 1 }]), value => Schema.decodeUnknownEffect(struct)(value))
const WorkflowRuntime = ManagedRuntime.make(Layer.mergeAll(serviceLayer))
void WorkflowRuntime.runPromise(ApiTag).finally(() => WorkflowRuntime.dispose())
