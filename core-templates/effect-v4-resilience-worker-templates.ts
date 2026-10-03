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
	effectSourceInput,
	effectStructuralType,
	effectType,
	effectValueInput
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	metricType,
	nominalType,
	scheduleType,
	tagType,
	typeParameters,
	typedExpressionInput
} from './effect-template-helpers.js'
import { semaphoreType } from './effect-v4-operations-foundational-templates.js'

/**
 * Effect v4 resilience and supervised-worker compositions.
 *
 * These templates intentionally implement circuit breaking and in-process rate
 * limiting from stable core primitives instead of depending on unstable APIs.
 *
 * Runtime contract:
 *   import {
 *     Clock, Duration, Effect, Layer, Metric, Ref, Schedule, Semaphore
 *   } from 'effect'
 */

const VERSION = '1.0.0' as const
const timeoutError = '{ readonly _tag: "TimeoutError" }'

export const circuitBreakerType = (openError = 'unknown'): TypeDescriptor => ({
	nominal: 'effect-template/CircuitBreaker',
	ts: `{ readonly protect: <A, E, R>(source: ${effectStructuralType('A', 'E', 'R')}) => ${effectStructuralType('A', `E | ${openError}`, 'R')} }`
})

export const rateLimiterType = (): TypeDescriptor => ({
	nominal: 'effect-template/RateLimiter',
	ts: `{ readonly withPermit: <A, E, R>(source: ${effectStructuralType('A', 'E', 'R')}) => ${effectStructuralType('A', 'E', 'R')} }`
})

const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

const circuitBreakerInput = (description: string, openError = 'unknown') =>
	typedExpressionInput(description, circuitBreakerType(openError))

const rateLimiterInput = (description: string) =>
	typedExpressionInput(description, rateLimiterType())

const semaphoreInput = (description: string) =>
	typedExpressionInput(description, semaphoreType())

const scheduleInput = (
	description: string,
	output = 'unknown',
	input = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, scheduleType(output, input, requirements))

const metricInput = (description: string, input = 'unknown', output = 'unknown') =>
	typedExpressionInput(description, metricType(input, output))

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

// Circuit breaker ------------------------------------------------------------

export const CircuitBreakerLayerTemplate = defineTemplate({
	modelId: 'CircuitBreakerLayer',
	version: VERSION,
	description: 'Creates a shared closed/open/half-open circuit breaker backed by Ref and Clock.',
	typeParameters: typeParameters(
		['I', 'Provided circuit-breaker service identifier type.'],
		['EOpen', 'Typed error produced while the circuit is open.']
	),
	inputs: {
		service: serviceKeyInput('Context.Service key whose implementation is the circuit breaker.', '{{I}}', circuitBreakerType('{{EOpen}}').ts),
		failureThreshold: positiveIntegerInput('Consecutive typed failures required to open the circuit.'),
		resetAfter: effectDurationInput('How long the circuit remains open before one half-open probe is admitted.'),
		openError: callbackInput('Lazy typed error constructor used when calls are rejected by an open circuit.', { ts: '() => {{EOpen}}' })
	},
	output: expressionOutput('Circuit-breaker service Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'service', 'CircuitBreaker')}, Effect.gen(function* () {
	const failureThreshold = ${marker('expression', 'failureThreshold', '5')}
	const resetAfterMillis = Math.max(1, Duration.toMillis(${marker('expression', 'resetAfter', '"30 seconds"')}))
	const openError = ${marker('expression', 'openError', '() => ({ _tag: "CircuitBreakerOpen" })')}
	const state = yield* Ref.make<
		| { readonly _tag: "Closed"; readonly failures: number }
		| { readonly _tag: "Open"; readonly openedAt: number }
		| { readonly _tag: "HalfOpen" }
	>({ _tag: "Closed", failures: 0 })

	const protect = <A, E, R>(source: Effect.Effect<A, E, R>) =>
		Effect.gen(function* () {
			const now = yield* Clock.currentTimeMillis
			const decision = yield* Ref.modify(state, current => {
				if (current._tag === "Closed") return ["run", current] as const
				if (current._tag === "HalfOpen") return ["reject", current] as const
				if (now - current.openedAt >= resetAfterMillis) {
					return ["probe", { _tag: "HalfOpen" } as const] as const
				}
				return ["reject", current] as const
			})

			if (decision === "reject") return yield* Effect.fail(openError())

			return yield* Effect.matchEffect(source, {
				onFailure: error => Effect.gen(function* () {
					yield* Ref.update(state, current => {
						if (decision === "probe") return { _tag: "Open", openedAt: now } as const
						if (current._tag !== "Closed") return current
						const failures = current.failures + 1
						return failures >= failureThreshold
							? { _tag: "Open", openedAt: now } as const
							: { _tag: "Closed", failures } as const
					})
					return yield* Effect.fail(error)
				}),
				onSuccess: value => Effect.gen(function* () {
					yield* Ref.update(state, current => {
						if (decision === "probe" || current._tag === "HalfOpen") {
							return { _tag: "Closed", failures: 0 } as const
						}
						return current._tag === "Closed"
							? { _tag: "Closed", failures: 0 } as const
							: current
					})
					return value
				})
			})
		})

	return { protect }
}))`
})

export const CircuitBreakerProtectTemplate = defineTemplate({
	modelId: 'CircuitBreakerProtect',
	version: VERSION,
	description: 'Runs an Effect through a shared circuit breaker.',
	typeParameters: typeParameters(
		['A', 'Protected Effect success type.'],
		['E', 'Protected Effect error type.'],
		['R', 'Protected Effect requirements.'],
		['EOpen', 'Open-circuit rejection error type.']
	),
	inputs: {
		breaker: circuitBreakerInput('Shared circuit breaker.', '{{EOpen}}'),
		source: effectSourceInput('Effect protected by the circuit breaker.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Circuit-breaker protected Effect.', effectType('{{A}}', '{{E}} | {{EOpen}}', '{{R}}')),
	source: `${marker('expression', 'breaker', 'breaker')}.protect(${marker('expression', 'source', 'Effect.void')})`
})

export const CircuitBreakerObservedOperationTemplate = defineTemplate({
	modelId: 'CircuitBreakerObservedOperation',
	version: VERSION,
	description: 'Runs a circuit-breaker protected Effect inside a tracing span with structured log annotations.',
	typeParameters: typeParameters(
		['A', 'Operation success type.'],
		['E', 'Operation error type.'],
		['R', 'Operation requirements.'],
		['EOpen', 'Open-circuit rejection error type.']
	),
	inputs: {
		breaker: circuitBreakerInput('Shared circuit breaker.', '{{EOpen}}'),
		source: effectSourceInput('Operation protected by the circuit breaker.', effectType('{{A}}', '{{E}}', '{{R}}')),
		spanName: effectValueInput('Tracing span name.', { ts: 'string' }),
		annotations: effectValueInput('Structured log annotations.', { ts: 'Readonly<Record<string, unknown>>' })
	},
	output: expressionOutput('Observed circuit-breaker protected Effect.', effectType('{{A}}', '{{E}} | {{EOpen}}', '{{R}}')),
	source: `Effect.annotateLogs(
	Effect.withSpan(
		${marker('expression', 'breaker', 'breaker')}.protect(${marker('expression', 'source', 'Effect.void')}),
		${marker('expression', 'spanName', '"circuit.operation"')}
	),
	${marker('expression', 'annotations', '{}')}
)`
})

// Rate limiting --------------------------------------------------------------

export const FixedWindowRateLimiterLayerTemplate = defineTemplate({
	modelId: 'FixedWindowRateLimiterLayer',
	version: VERSION,
	description: 'Creates a shared in-process fixed-window rate limiter that delays callers instead of failing them.',
	typeParameters: typeParameters(['I', 'Provided rate-limiter service identifier type.']),
	inputs: {
		service: serviceKeyInput('Context.Service key whose implementation is the rate limiter.', '{{I}}', rateLimiterType().ts),
		limit: positiveIntegerInput('Maximum admitted operations per window.'),
		window: effectDurationInput('Fixed rate-limit window duration.')
	},
	output: expressionOutput('Fixed-window rate-limiter Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'service', '(undefined as any)')}, Effect.gen(function* () {
	const limit = ${marker('expression', 'limit', '100')}
	const windowMillis = Math.max(1, Duration.toMillis(${marker('expression', 'window', '"1 second"')}))
	const startedAt = yield* Clock.currentTimeMillis
	const state = yield* Ref.make({ windowStartedAt: startedAt, used: 0 })

	const acquire: Effect.Effect<void> = Effect.suspend(() => Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis
		const wait = yield* Ref.modify(state, current => {
			if (now - current.windowStartedAt >= windowMillis) {
				return [0, { windowStartedAt: now, used: 1 }] as const
			}
			if (current.used < limit) {
				return [0, { windowStartedAt: current.windowStartedAt, used: current.used + 1 }] as const
			}
			return [Math.max(1, windowMillis - (now - current.windowStartedAt)), current] as const
		})
		if (wait > 0) {
			yield* Effect.sleep(wait)
			return yield* acquire
		}
	}))

	const withPermit = <A, E, R>(source: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
		Effect.flatMap(acquire, () => source)

	return { withPermit }
}))`
})

export const TokenBucketRateLimiterLayerTemplate = defineTemplate({
	modelId: 'TokenBucketRateLimiterLayer',
	version: VERSION,
	description: 'Creates a shared in-process token-bucket rate limiter with bounded burst capacity and periodic refill.',
	typeParameters: typeParameters(['I', 'Provided rate-limiter service identifier type.']),
	inputs: {
		service: serviceKeyInput('Context.Service key whose implementation is the rate limiter.', '{{I}}', rateLimiterType().ts),
		capacity: positiveIntegerInput('Maximum token-bucket capacity and burst size.'),
		refillTokens: positiveIntegerInput('Tokens added at each refill interval.'),
		refillEvery: effectDurationInput('Token refill interval.')
	},
	output: expressionOutput('Token-bucket rate-limiter Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'service', '(undefined as any)')}, Effect.gen(function* () {
	const capacity = ${marker('expression', 'capacity', '20')}
	const refillTokens = ${marker('expression', 'refillTokens', '5')}
	const refillMillis = Math.max(1, Duration.toMillis(${marker('expression', 'refillEvery', '"1 second"')}))
	const startedAt = yield* Clock.currentTimeMillis
	const state = yield* Ref.make({ tokens: capacity, lastRefill: startedAt })

	const acquire: Effect.Effect<void> = Effect.suspend(() => Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis
		const wait = yield* Ref.modify(state, current => {
			const elapsed = Math.max(0, now - current.lastRefill)
			const periods = Math.floor(elapsed / refillMillis)
			const lastRefill = periods > 0
				? current.lastRefill + periods * refillMillis
				: current.lastRefill
			const tokens = Math.min(capacity, current.tokens + periods * refillTokens)
			if (tokens > 0) {
				return [0, { tokens: tokens - 1, lastRefill }] as const
			}
			return [Math.max(1, refillMillis - (now - lastRefill)), { tokens, lastRefill }] as const
		})
		if (wait > 0) {
			yield* Effect.sleep(wait)
			return yield* acquire
		}
	}))

	const withPermit = <A, E, R>(source: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
		Effect.flatMap(acquire, () => source)

	return { withPermit }
}))`
})

export const RateLimitedOperationTemplate = defineTemplate({
	modelId: 'RateLimitedOperation',
	version: VERSION,
	description: 'Runs an Effect only after a shared rate limiter admits one operation.',
	typeParameters: typeParameters(
		['A', 'Rate-limited Effect success type.'],
		['E', 'Rate-limited Effect error type.'],
		['R', 'Rate-limited Effect requirements.']
	),
	inputs: {
		limiter: rateLimiterInput('Shared rate limiter.'),
		source: effectSourceInput('Effect executed after admission.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Rate-limited Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'limiter', 'limiter')}.withPermit(${marker('expression', 'source', 'Effect.void')})`
})

export const RateLimitedObservedOperationTemplate = defineTemplate({
	modelId: 'RateLimitedObservedOperation',
	version: VERSION,
	description: 'Runs a rate-limited Effect inside a tracing span with structured log annotations.',
	typeParameters: typeParameters(
		['A', 'Operation success type.'],
		['E', 'Operation error type.'],
		['R', 'Operation requirements.']
	),
	inputs: {
		limiter: rateLimiterInput('Shared rate limiter.'),
		source: effectSourceInput('Operation executed after rate-limit admission.', effectType('{{A}}', '{{E}}', '{{R}}')),
		spanName: effectValueInput('Tracing span name.', { ts: 'string' }),
		annotations: effectValueInput('Structured log annotations.', { ts: 'Readonly<Record<string, unknown>>' })
	},
	output: expressionOutput('Observed rate-limited Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.annotateLogs(
	Effect.withSpan(
		${marker('expression', 'limiter', 'limiter')}.withPermit(${marker('expression', 'source', 'Effect.void')}),
		${marker('expression', 'spanName', '"rate-limited.operation"')}
	),
	${marker('expression', 'annotations', '{}')}
)`
})

// Supervised background workers ---------------------------------------------

export const SupervisedWorkerLayerTemplate = defineTemplate({
	modelId: 'SupervisedWorkerLayer',
	version: VERSION,
	description: 'Starts a scoped long-lived worker that reports typed failures, retries with a Schedule, and restarts after retry exhaustion.',
	typeParameters: typeParameters(
		['E', 'Worker typed error type.'],
		['R', 'Worker requirements.'],
		['RetryOut', 'Retry Schedule output type.'],
		['RRetry', 'Retry Schedule requirements.'],
		['RReport', 'Failure-reporting requirements.']
	),
	inputs: {
		worker: effectSourceInput('Long-lived worker Effect. Its successful channel should ordinarily be never.', effectType('never', '{{E}}', '{{R}}')),
		retrySchedule: scheduleInput('Backoff / retry Schedule consuming worker errors.', '{{RetryOut}}', '{{E}}', '{{RRetry}}'),
		cooldown: effectDurationInput('Delay before a fresh supervision cycle after the retry Schedule is exhausted.'),
		onFailure: callbackInput('Infallible observer invoked for every typed worker failure.', effectReturningCallbackType('error: {{E}}', 'void', 'never', '{{RReport}}'))
	},
	output: expressionOutput('Scoped supervised-worker Layer.', layerType('never', 'never', '{{R}} | {{RRetry}} | {{RReport}}')),
	source: `Layer.effectDiscard(Effect.gen(function* () {
	const worker = ${marker('expression', 'worker', 'Effect.never')}
	const retrySchedule = ${marker('expression', 'retrySchedule', 'Schedule.exponential("100 millis")')}
	const cooldown = ${marker('expression', 'cooldown', '"5 seconds"')}
	const onFailure = ${marker('expression', 'onFailure', '() => Effect.void')}

	const cycle = Effect.catch(
		Effect.retry(Effect.tapError(worker, onFailure), retrySchedule),
		() => Effect.sleep(cooldown)
	)

	yield* Effect.forkScoped(Effect.forever(cycle))
}))`
})

export const SupervisedWorkerPoolLayerTemplate = defineTemplate({
	modelId: 'SupervisedWorkerPoolLayer',
	version: VERSION,
	description: 'Starts a fixed number of independently supervised copies of a long-lived worker in Layer scope.',
	typeParameters: typeParameters(
		['E', 'Worker typed error type.'],
		['R', 'Worker requirements.'],
		['RetryOut', 'Retry Schedule output type.'],
		['RRetry', 'Retry Schedule requirements.'],
		['RReport', 'Failure-reporting requirements.']
	),
	inputs: {
		workers: positiveIntegerInput('Number of supervised worker fibers.'),
		worker: effectSourceInput('Long-lived worker Effect executed independently by every supervisor.', effectType('never', '{{E}}', '{{R}}')),
		retrySchedule: scheduleInput('Per-worker backoff / retry Schedule.', '{{RetryOut}}', '{{E}}', '{{RRetry}}'),
		cooldown: effectDurationInput('Delay before a fresh supervision cycle after retry exhaustion.'),
		onFailure: callbackInput('Infallible observer invoked for every typed worker failure.', effectReturningCallbackType('error: {{E}}', 'void', 'never', '{{RReport}}'))
	},
	output: expressionOutput('Scoped supervised worker-pool Layer.', layerType('never', 'never', '{{R}} | {{RRetry}} | {{RReport}}')),
	source: `Layer.effectDiscard(Effect.gen(function* () {
	const workerCount = ${marker('expression', 'workers', '4')}
	const worker = ${marker('expression', 'worker', 'Effect.never')}
	const retrySchedule = ${marker('expression', 'retrySchedule', 'Schedule.exponential("100 millis")')}
	const cooldown = ${marker('expression', 'cooldown', '"5 seconds"')}
	const onFailure = ${marker('expression', 'onFailure', '() => Effect.void')}

	const cycle = Effect.catch(
		Effect.retry(Effect.tapError(worker, onFailure), retrySchedule),
		() => Effect.sleep(cooldown)
	)

	yield* Effect.forEach(
		Array.from({ length: workerCount }),
		() => Effect.forkScoped(Effect.forever(cycle)),
		{ concurrency: "unbounded" }
	)
}))`
})

export const SupervisedPollingWorkerLayerTemplate = defineTemplate({
	modelId: 'SupervisedPollingWorkerLayer',
	version: VERSION,
	description: 'Repeats a polling operation on a success Schedule while independently supervising typed failures with retry backoff.',
	typeParameters: typeParameters(
		['A', 'Polling operation success type.'],
		['E', 'Polling operation error type.'],
		['R', 'Polling operation requirements.'],
		['RepeatOut', 'Success Schedule output type.'],
		['RRepeat', 'Success Schedule requirements.'],
		['RetryOut', 'Retry Schedule output type.'],
		['RRetry', 'Retry Schedule requirements.'],
		['RReport', 'Failure-reporting requirements.']
	),
	inputs: {
		poll: effectSourceInput('One polling iteration.', effectType('{{A}}', '{{E}}', '{{R}}')),
		repeatSchedule: scheduleInput('Schedule controlling successful polling repetitions.', '{{RepeatOut}}', '{{A}}', '{{RRepeat}}'),
		retrySchedule: scheduleInput('Schedule controlling retries after typed polling failures.', '{{RetryOut}}', '{{E}}', '{{RRetry}}'),
		cooldown: effectDurationInput('Delay before restarting the poll loop if its retry policy is exhausted.'),
		onFailure: callbackInput('Infallible typed-failure observer.', effectReturningCallbackType('error: {{E}}', 'void', 'never', '{{RReport}}'))
	},
	output: expressionOutput('Scoped supervised polling-worker Layer.', layerType('never', 'never', '{{R}} | {{RRepeat}} | {{RRetry}} | {{RReport}}')),
	source: `Layer.effectDiscard(Effect.gen(function* () {
	const poll = ${marker('expression', 'poll', 'Effect.void')}
	const repeatSchedule = ${marker('expression', 'repeatSchedule', 'Schedule.fixed("30 seconds")')}
	const retrySchedule = ${marker('expression', 'retrySchedule', 'Schedule.exponential("100 millis")')}
	const cooldown = ${marker('expression', 'cooldown', '"5 seconds"')}
	const onFailure = ${marker('expression', 'onFailure', '() => Effect.void')}

	const cycle = Effect.catch(
		Effect.retry(
			Effect.repeat(Effect.tapError(poll, onFailure), repeatSchedule),
			retrySchedule
		),
		() => Effect.sleep(cooldown)
	)

	yield* Effect.forkScoped(Effect.forever(cycle))
}))`
})

// Combined production boundary ----------------------------------------------

export const ProtectedExternalCallTemplate = defineTemplate({
	modelId: 'ProtectedExternalCall',
	version: VERSION,
	description: 'Combines rate limiting, bulkhead isolation, per-attempt timeout, retries, circuit breaking, tracing, log annotations, and duration metrics for an external call.',
	typeParameters: typeParameters(
		['A', 'External-call success type.'],
		['E', 'External-call error type.'],
		['R', 'External-call requirements.'],
		['EOpen', 'Open-circuit rejection error type.'],
		['RetryOut', 'Retry Schedule output type.'],
		['RRetry', 'Retry Schedule requirements.'],
		['MetricState', 'Duration Metric state type.']
	),
	inputs: {
		limiter: rateLimiterInput('Shared rate limiter.'),
		breaker: circuitBreakerInput('Shared circuit breaker.', '{{EOpen}}'),
		semaphore: semaphoreInput('Shared Semaphore bulkhead.'),
		permits: positiveIntegerInput('Bulkhead permits consumed by each external attempt.'),
		call: effectSourceInput('External call Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		timeout: effectDurationInput('Per-attempt timeout.'),
		retrySchedule: scheduleInput('Retry policy consuming call and timeout failures.', '{{RetryOut}}', `{{E}} | ${timeoutError}`, '{{RRetry}}'),
		spanName: effectValueInput('Tracing span name.', { ts: 'string' }),
		annotations: effectValueInput('Structured log annotations.', { ts: 'Readonly<Record<string, unknown>>' }),
		timer: metricInput('Duration Metric for the complete logical call.', 'unknown', '{{MetricState}}')
	},
	output: expressionOutput(
		'Fully protected external-call Effect.',
		effectType('{{A}}', `{{E}} | ${timeoutError} | {{EOpen}}`, '{{R}} | {{RRetry}}')
	),
	source: `Effect.trackDuration(
	Effect.annotateLogs(
		Effect.withSpan(
			${marker('expression', 'breaker', 'breaker')}.protect(
				Effect.retry(
					${marker('expression', 'limiter', 'limiter')}.withPermit(
						${marker('expression', 'semaphore', 'semaphore')}.withPermits(${marker('expression', 'permits', '1')})(
							Effect.timeout(${marker('expression', 'call', 'Effect.void')}, ${marker('expression', 'timeout', '"5 seconds"')})
						)
					),
					${marker('expression', 'retrySchedule', 'Schedule.recurs(3)')}
				)
			),
			${marker('expression', 'spanName', '"external.call"')}
		),
		${marker('expression', 'annotations', '{}')}
	),
	${marker('expression', 'timer', 'Metric.timer("external_call_duration", { boundaries: [1, 10, 100, 1000] })')}
)`
})

export const effectV4ResilienceWorkerGraphTemplateInputs = [
	CircuitBreakerLayerTemplate,
	CircuitBreakerProtectTemplate,
	CircuitBreakerObservedOperationTemplate,
	FixedWindowRateLimiterLayerTemplate,
	TokenBucketRateLimiterLayerTemplate,
	RateLimitedOperationTemplate,
	RateLimitedObservedOperationTemplate,
	SupervisedWorkerLayerTemplate,
	SupervisedWorkerPoolLayerTemplate,
	SupervisedPollingWorkerLayerTemplate,
	ProtectedExternalCallTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
