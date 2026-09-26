import {
	defineTemplate,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from '../src/templates.js'
import type { TypeDescriptor } from '../src/templates.js'
import {
	effectDurationInput,
	effectExpressionPolicy,
	effectValueInput
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	layerType,
	marker,
	scheduleType,
	statementOutput,
	stringInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	circuitBreakerType,
	rateLimiterType
} from './effect-v4-resilience-worker-templates.js'
import { faultInjectorType } from './effect-v4-fault-injection-templates.js'

/**
 * High-level behavioral tests for production Effect v4 patterns.
 *
 * These templates intentionally use it.effect so TestClock, TestConsole, and a
 * Scope are already installed by @effect/vitest.
 *
 * Runtime contract:
 *   import {
 *     Clock, Console, Deferred, Effect, Exit, Fiber, Layer, PubSub, Queue, Ref,
 *     Schedule, Stream
 *   } from 'effect'
 *   import { TestClock, TestConsole } from 'effect/testing'
 *   import { assert, it } from '@effect/vitest'
 */

const VERSION = '1.0.0' as const

const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

const layerInput = (
	description: string,
	provided = 'unknown',
	error = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, layerType(provided, error, requirements))

const scheduleInput = (
	description: string,
	output = 'unknown',
	input = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, scheduleType(output, input, requirements))

const numericInput = (
	description: string,
	schema: Readonly<Record<string, unknown>>,
	type: TypeDescriptor = { ts: 'number' }
) => unionPort({
	options: [
		literalPort({ regionKind: 'expression', schema, description }),
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type }, description }),
		rawCodePort({ regionKind: 'expression', policy: effectExpressionPolicy, type, description })
	],
	description
})

const positiveIntegerInput = (description: string) => numericInput(description, {
	type: 'integer',
	minimum: 1
})

const nonNegativeIntegerInput = (description: string) => numericInput(description, {
	type: 'integer',
	minimum: 0
})

export const RetryEventuallySucceedsTestTemplate = defineTemplate({
	modelId: 'RetryEventuallySucceedsTest',
	version: VERSION,
	description: 'Deterministically verifies that a retry policy survives a configured number of transient failures and returns the eventual success.',
	typeParameters: typeParameters(
		['A', 'Eventual success type.'],
		['E', 'Transient failure type.'],
		['Out', 'Retry Schedule output type.']
	),
	inputs: {
		name: stringInput('Test name.'),
		failures: nonNegativeIntegerInput('Number of transient failures before success.'),
		failure: effectValueInput('Transient failure value.', { ts: '{{E}}' }),
		success: valueInput('Eventual success value.', { ts: '{{A}}' }),
		schedule: scheduleInput('Retry Schedule that can accommodate the requested failures.', '{{Out}}', '{{E}}', 'never'),
		advance: effectDurationInput('TestClock advancement sufficient to cover all scheduled retry delays.')
	},
	output: statementOutput('Deterministic retry behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"retries transient failures"')}, () => Effect.gen(function* () {\n\tconst failures = ${marker('expression', 'failures', '2')}\n\tconst success = ${marker('expression', 'success', '"ok"')}\n\tconst attempts = yield* Ref.make(0)\n\tconst operation = Effect.flatMap(Ref.updateAndGet(attempts, n => n + 1), attempt =>\n\t\tattempt <= failures\n\t\t\t? Effect.fail(${marker('expression', 'failure', '"transient"')})\n\t\t\t: Effect.succeed(success)\n\t)\n\tconst fiber = yield* Effect.forkChild(Effect.retry(operation, ${marker('expression', 'schedule', 'Schedule.spaced("100 millis")')}))\n\tyield* TestClock.adjust(${marker('expression', 'advance', '"1 second"')})\n\tconst value = yield* Fiber.join(fiber)\n\tconst count = yield* Ref.get(attempts)\n\tassert.deepStrictEqual(value, success)\n\tassert.strictEqual(count, failures + 1)\n}))`
})

export const TimeoutWithTestClockTestTemplate = defineTemplate({
	modelId: 'TimeoutWithTestClockTest',
	version: VERSION,
	description: 'Verifies timeout behavior without waiting for real time by forking the timed Effect and advancing TestClock.',
	inputs: {
		name: stringInput('Test name.'),
		sourceDelay: effectDurationInput('Delay of the source operation; should be longer than the timeout.'),
		timeout: effectDurationInput('Timeout duration.')
	},
	output: statementOutput('Deterministic timeout behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"times out deterministically"')}, () => Effect.gen(function* () {\n\tconst timeout = ${marker('expression', 'timeout', '"1 second"')}\n\tconst fiber = yield* Effect.forkChild(\n\t\tEffect.timeout(Effect.sleep(${marker('expression', 'sourceDelay', '"5 seconds"')}), timeout)\n\t)\n\tyield* TestClock.adjust(timeout)\n\tconst exit = yield* Fiber.await(fiber)\n\tassert.ok(Exit.isFailure(exit))\n}))`
})

export const CircuitBreakerOpensTestTemplate = defineTemplate({
	modelId: 'CircuitBreakerOpensTest',
	version: VERSION,
	description: 'Trips a provided circuit-breaker Layer with repeated failures and verifies that the next otherwise-successful operation is rejected as open.',
	typeParameters: typeParameters(
		['I', 'Circuit-breaker service identifier type.'],
		['EOpen', 'Open-circuit error type.'],
		['ESource', 'Source failure type.'],
		['ELayer', 'Circuit-breaker Layer construction error type.']
	),
	inputs: {
		name: stringInput('Test name.'),
		service: serviceKeyInput('Circuit-breaker service key.', '{{I}}', circuitBreakerType('{{EOpen}}').ts),
		layer: layerInput('Closed circuit-breaker Layer under test.', '{{I}}', '{{ELayer}}', 'never'),
		tripAttempts: positiveIntegerInput('Number of failing calls required to reach the configured open state.'),
		sourceFailure: effectValueInput('Failure used to trip the breaker.', { ts: '{{ESource}}' }),
		isOpenError: callbackInput('Predicate identifying the configured open-circuit rejection.', { ts: '(error: unknown) => boolean' })
	},
	output: statementOutput('Circuit-breaker open-state behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"opens the circuit"')}, () => Effect.provide(Effect.gen(function* () {\n\tconst breaker = yield* ${marker('expression', 'service', 'CircuitBreaker')}\n\tyield* Effect.forEach(\n\t\tArray.from({ length: ${marker('expression', 'tripAttempts', '3')} }),\n\t\t() => Effect.catch(breaker.protect(Effect.fail(${marker('expression', 'sourceFailure', '"boom"')})), () => Effect.void)\n\t)\n\tconst rejected = yield* Effect.catch(\n\t\tEffect.as(breaker.protect(Effect.void), false),\n\t\terror => Effect.succeed((${marker('expression', 'isOpenError', '() => true')})(error))\n\t)\n\tassert.ok(rejected)\n}), ${marker('expression', 'layer', 'Layer.empty')}))`
})

export const CircuitBreakerRecoversAfterResetTestTemplate = defineTemplate({
	modelId: 'CircuitBreakerRecoversAfterResetTest',
	version: VERSION,
	description: 'Trips a circuit breaker, advances TestClock beyond its reset interval, verifies the half-open probe succeeds, and confirms the breaker closes again.',
	typeParameters: typeParameters(
		['I', 'Circuit-breaker service identifier type.'],
		['EOpen', 'Open-circuit error type.'],
		['ESource', 'Source failure type.'],
		['A', 'Probe success type.'],
		['ELayer', 'Circuit-breaker Layer construction error type.']
	),
	inputs: {
		name: stringInput('Test name.'),
		service: serviceKeyInput('Circuit-breaker service key.', '{{I}}', circuitBreakerType('{{EOpen}}').ts),
		layer: layerInput('Closed circuit-breaker Layer under test.', '{{I}}', '{{ELayer}}', 'never'),
		tripAttempts: positiveIntegerInput('Number of failing calls required to open the circuit.'),
		sourceFailure: effectValueInput('Failure used to trip the breaker.', { ts: '{{ESource}}' }),
		resetAfter: effectDurationInput('Clock advancement that reaches or exceeds the breaker reset interval.'),
		probeValue: valueInput('Value returned by the successful half-open probe.', { ts: '{{A}}' })
	},
	output: statementOutput('Circuit-breaker recovery behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"recovers after reset"')}, () => Effect.provide(Effect.gen(function* () {\n\tconst breaker = yield* ${marker('expression', 'service', 'CircuitBreaker')}\n\tconst probeValue = ${marker('expression', 'probeValue', '"ok"')}\n\tyield* Effect.forEach(\n\t\tArray.from({ length: ${marker('expression', 'tripAttempts', '3')} }),\n\t\t() => Effect.catch(breaker.protect(Effect.fail(${marker('expression', 'sourceFailure', '"boom"')})), () => Effect.void)\n\t)\n\tyield* TestClock.adjust(${marker('expression', 'resetAfter', '"30 seconds"')})\n\tconst probe = yield* breaker.protect(Effect.succeed(probeValue))\n\tconst next = yield* breaker.protect(Effect.succeed(probeValue))\n\tassert.deepStrictEqual(probe, probeValue)\n\tassert.deepStrictEqual(next, probeValue)\n}), ${marker('expression', 'layer', 'Layer.empty')}))`
})

export const RateLimiterBlocksUntilWindowTestTemplate = defineTemplate({
	modelId: 'RateLimiterBlocksUntilWindowTest',
	version: VERSION,
	description: 'Verifies that a shared one-per-window rate limiter suspends the next call and releases it only after TestClock advances the refill window.',
	typeParameters: typeParameters(
		['I', 'Rate-limiter service identifier type.'],
		['ELayer', 'Rate-limiter Layer construction error type.']
	),
	inputs: {
		name: stringInput('Test name.'),
		service: serviceKeyInput('Rate-limiter service key.', '{{I}}', rateLimiterType().ts),
		layer: layerInput('Closed limiter Layer configured for one immediately available permit.', '{{I}}', '{{ELayer}}', 'never'),
		window: effectDurationInput('Clock advancement that refills / opens the next permit window.')
	},
	output: statementOutput('Rate-limiter timing behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"blocks until refill"')}, () => Effect.provide(Effect.gen(function* () {\n\tconst limiter = yield* ${marker('expression', 'service', 'RateLimiter')}\n\tyield* limiter.withPermit(Effect.void)\n\tconst completed = yield* Ref.make(false)\n\tconst fiber = yield* Effect.forkChild(\n\t\tEffect.flatMap(limiter.withPermit(Effect.void), () => Ref.set(completed, true))\n\t)\n\tyield* Effect.yieldNow\n\tassert.strictEqual(yield* Ref.get(completed), false)\n\tyield* TestClock.adjust(${marker('expression', 'window', '"1 second"')})\n\tyield* Fiber.join(fiber)\n\tassert.strictEqual(yield* Ref.get(completed), true)\n}), ${marker('expression', 'layer', 'Layer.empty')}))`
})

export const SupervisedWorkerRestartsTestTemplate = defineTemplate({
	modelId: 'SupervisedWorkerRestartsTest',
	version: VERSION,
	description: 'Exercises the supervised-worker restart algorithm with deterministic failures, retry Schedule, cooldown, and TestClock advancement.',
	typeParameters: typeParameters(
		['E', 'Worker failure type.'],
		['Out', 'Retry Schedule output type.']
	),
	inputs: {
		name: stringInput('Test name.'),
		failure: effectValueInput('Failure emitted by each worker start.', { ts: '{{E}}' }),
		retrySchedule: scheduleInput('Retry Schedule used inside each supervision cycle.', '{{Out}}', '{{E}}', 'never'),
		cooldown: effectDurationInput('Cooldown after retry exhaustion.'),
		advance: effectDurationInput('TestClock advancement covering enough restart cycles.'),
		minimumStarts: positiveIntegerInput('Minimum worker starts expected after the clock advancement.')
	},
	output: statementOutput('Supervised-worker restart behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"restarts failed workers"')}, () => Effect.gen(function* () {\n\tconst starts = yield* Ref.make(0)\n\tconst worker = Effect.flatMap(Ref.updateAndGet(starts, n => n + 1), () => Effect.fail(${marker('expression', 'failure', '"boom"')}))\n\tconst cycle = Effect.catch(\n\t\tEffect.retry(worker, ${marker('expression', 'retrySchedule', 'Schedule.spaced("100 millis")')}),\n\t\t() => Effect.sleep(${marker('expression', 'cooldown', '"1 second"')})\n\t)\n\tconst fiber = yield* Effect.forkChild(Effect.forever(cycle))\n\tyield* TestClock.adjust(${marker('expression', 'advance', '"5 seconds"')})\n\tconst count = yield* Ref.get(starts)\n\tyield* Fiber.interrupt(fiber)\n\tassert.ok(count >= ${marker('expression', 'minimumStarts', '2')})\n}))`
})

export const ScopedFiberInterruptedTestTemplate = defineTemplate({
	modelId: 'ScopedFiberInterruptedTest',
	version: VERSION,
	description: 'Verifies that a forkScoped child is interrupted when its owning Scope closes by observing its guaranteed finalizer.',
	inputs: {
		name: stringInput('Test name.')
	},
	output: statementOutput('Scoped-fiber lifecycle behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"interrupts scoped children"')}, () => Effect.gen(function* () {\n\tconst finalized = yield* Deferred.make<void>()\n\tyield* Effect.scoped(Effect.gen(function* () {\n\t\tyield* Effect.forkScoped(Effect.ensuring(Effect.never, Deferred.succeed(finalized, undefined)))\n\t}))\n\tassert.strictEqual(yield* Deferred.isDone(finalized), true)\n}))`
})

export const QueueBackpressureTestTemplate = defineTemplate({
	modelId: 'QueueBackpressureTest',
	version: VERSION,
	description: 'Verifies bounded Queue backpressure by showing a second offer remains suspended until space is freed.',
	typeParameters: typeParameters(['A', 'Queue element type.']),
	inputs: {
		name: stringInput('Test name.'),
		first: valueInput('First queued value.', { ts: '{{A}}' }),
		second: valueInput('Second queued value.', { ts: '{{A}}' })
	},
	output: statementOutput('Bounded Queue backpressure behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"applies queue backpressure"')}, () => Effect.gen(function* () {\n\tconst firstValue = ${marker('expression', 'first', '1')}\n\tconst secondValue = ${marker('expression', 'second', '2')}\n\tconst queue = yield* Queue.bounded<unknown>(1)\n\tyield* Queue.offer(queue, firstValue)\n\tconst completed = yield* Ref.make(false)\n\tconst offer = yield* Effect.forkChild(\n\t\tEffect.flatMap(Queue.offer(queue, secondValue), () => Ref.set(completed, true))\n\t)\n\tyield* Effect.yieldNow\n\tassert.strictEqual(yield* Ref.get(completed), false)\n\tconst first = yield* Queue.take(queue)\n\tyield* Fiber.join(offer)\n\tconst second = yield* Queue.take(queue)\n\tassert.deepStrictEqual(first, firstValue)\n\tassert.deepStrictEqual(second, secondValue)\n\tassert.strictEqual(yield* Ref.get(completed), true)\n}))`
})

export const PubSubFanoutTestTemplate = defineTemplate({
	modelId: 'PubSubFanoutTest',
	version: VERSION,
	description: 'Verifies that one PubSub publication is delivered independently to two scoped subscribers.',
	typeParameters: typeParameters(['A', 'Published value type.']),
	inputs: {
		name: stringInput('Test name.'),
		value: valueInput('Value published to both subscribers.', { ts: '{{A}}' })
	},
	output: statementOutput('PubSub fan-out behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"fans out pubsub messages"')}, () => Effect.gen(function* () {\n\tconst published = ${marker('expression', 'value', '"event"')}\n\tconst pubsub = yield* PubSub.unbounded<unknown>()\n\tconst left = yield* PubSub.subscribe(pubsub)\n\tconst right = yield* PubSub.subscribe(pubsub)\n\tyield* PubSub.publish(pubsub, published)\n\tassert.deepStrictEqual(yield* Queue.take(left), published)\n\tassert.deepStrictEqual(yield* Queue.take(right), published)\n}))`
})

export const StreamPipelineFailureTestTemplate = defineTemplate({
	modelId: 'StreamPipelineFailureTest',
	version: VERSION,
	description: 'Verifies that an effectful Stream stage propagates its typed failure to stream execution.',
	typeParameters: typeParameters(
		['A', 'Stream element type.'],
		['E', 'Injected stream-stage failure type.']
	),
	inputs: {
		name: stringInput('Test name.'),
		items: effectValueInput('Stream input elements.', { ts: 'Iterable<{{A}}>' }),
		shouldFail: callbackInput('Predicate selecting the element that triggers failure.', { ts: '(value: {{A}}) => boolean' }),
		failure: effectValueInput('Failure emitted by the effectful stream stage.', { ts: '{{E}}' })
	},
	output: statementOutput('Stream failure-propagation behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"propagates stream failures"')}, () => Effect.gen(function* () {\n\tconst stream = Stream.mapEffect(\n\t\tStream.fromIterable(${marker('expression', 'items', '[1, 2, 3]')}),\n\t\tvalue => (${marker('expression', 'shouldFail', 'value => value === 2')})(value)\n\t\t\t? Effect.fail(${marker('expression', 'failure', '"stream failure"')})\n\t\t\t: Effect.succeed(value)\n\t)\n\tconst exit = yield* Effect.exit(Stream.runCollect(stream))\n\tassert.ok(Exit.isFailure(exit))\n}))`
})

export const TestConsoleCaptureTestTemplate = defineTemplate({
	modelId: 'TestConsoleCaptureTest',
	version: VERSION,
	description: 'Verifies that it.effect installs TestConsole by asserting a Console.log value is captured in memory.',
	inputs: {
		name: stringInput('Test name.'),
		message: valueInput('Value written through Console.log.')
	},
	output: statementOutput('TestConsole capture behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"captures console output"')}, () => Effect.gen(function* () {\n\tconst message = ${marker('expression', 'message', '"hello"')}\n\tyield* Console.log(message)\n\tconst logs = yield* TestConsole.logLines\n\tassert.deepStrictEqual(logs, [message])\n}))`
})

export const FailFirstNFaultInjectorTestTemplate = defineTemplate({
	modelId: 'FailFirstNFaultInjectorTest',
	version: VERSION,
	description: 'Verifies that a provided fail-first-N fault injector fails the expected initial calls and delegates the following call.',
	typeParameters: typeParameters(
		['I', 'Fault-injector service identifier type.'],
		['EFault', 'Injected failure type.'],
		['A', 'Successful source value type.'],
		['ELayer', 'Fault-injector Layer construction error type.']
	),
	inputs: {
		name: stringInput('Test name.'),
		service: serviceKeyInput('Fault-injector service key.', '{{I}}', faultInjectorType('{{EFault}}').ts),
		layer: layerInput('Closed fail-first-N fault-injector Layer.', '{{I}}', '{{ELayer}}', 'never'),
		expectedFailures: nonNegativeIntegerInput('Expected number of failing calls.'),
		value: valueInput('Value returned by the delegated source Effect.', { ts: '{{A}}' })
	},
	output: statementOutput('Fail-first-N fault-injector behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"fails first N calls"')}, () => Effect.provide(Effect.gen(function* () {\n\tconst injector = yield* ${marker('expression', 'service', 'FaultInjector')}\n\tconst expectedFailures = ${marker('expression', 'expectedFailures', '2')}\n\tconst expectedValue = ${marker('expression', 'value', '"ok"')}\n\tfor (let index = 0; index < expectedFailures; index++) {\n\t\tconst exit = yield* Effect.exit(injector.run(Effect.succeed(expectedValue)))\n\t\tassert.ok(Exit.isFailure(exit))\n\t}\n\tconst value = yield* injector.run(Effect.succeed(expectedValue))\n\tassert.deepStrictEqual(value, expectedValue)\n}), ${marker('expression', 'layer', 'Layer.empty')}))`
})

export const DelayFaultInjectorTestTemplate = defineTemplate({
	modelId: 'DelayFaultInjectorTest',
	version: VERSION,
	description: 'Verifies with TestClock that a delay fault injector keeps the wrapped operation pending until the configured delay elapses.',
	typeParameters: typeParameters(
		['I', 'Fault-injector service identifier type.'],
		['A', 'Successful source value type.'],
		['ELayer', 'Fault-injector Layer construction error type.']
	),
	inputs: {
		name: stringInput('Test name.'),
		service: serviceKeyInput('Delay fault-injector service key.', '{{I}}', faultInjectorType('never').ts),
		layer: layerInput('Closed delay fault-injector Layer.', '{{I}}', '{{ELayer}}', 'never'),
		delay: effectDurationInput('Configured injected delay.'),
		value: valueInput('Value returned after the delay.', { ts: '{{A}}' })
	},
	output: statementOutput('Delay fault-injector behavioral test.'),
	source: `it.effect(${marker('string', 'name', '"injects deterministic latency"')}, () => Effect.provide(Effect.gen(function* () {\n\tconst injector = yield* ${marker('expression', 'service', 'FaultInjector')}\n\tconst expectedValue = ${marker('expression', 'value', '"ok"')}\n\tconst completed = yield* Ref.make(false)\n\tconst fiber = yield* Effect.forkChild(\n\t\tEffect.flatMap(injector.run(Effect.succeed(expectedValue)), value =>\n\t\t\tEffect.as(Ref.set(completed, true), value)\n\t\t)\n\t)\n\tyield* Effect.yieldNow\n\tassert.strictEqual(yield* Ref.get(completed), false)\n\tyield* TestClock.adjust(${marker('expression', 'delay', '"1 second"')})\n\tassert.deepStrictEqual(yield* Fiber.join(fiber), expectedValue)\n\tassert.strictEqual(yield* Ref.get(completed), true)\n}), ${marker('expression', 'layer', 'Layer.empty')}))`
})

export const effectV4BehavioralTestingGraphTemplateInputs = [
	RetryEventuallySucceedsTestTemplate,
	TimeoutWithTestClockTestTemplate,
	CircuitBreakerOpensTestTemplate,
	CircuitBreakerRecoversAfterResetTestTemplate,
	RateLimiterBlocksUntilWindowTestTemplate,
	SupervisedWorkerRestartsTestTemplate,
	ScopedFiberInterruptedTestTemplate,
	QueueBackpressureTestTemplate,
	PubSubFanoutTestTemplate,
	StreamPipelineFailureTestTemplate,
	TestConsoleCaptureTestTemplate,
	FailFirstNFaultInjectorTestTemplate,
	DelayFaultInjectorTestTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
