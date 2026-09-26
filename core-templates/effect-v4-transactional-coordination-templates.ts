import { defineTemplate } from '../src/templates.js'
import { effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	layerType,
	marker,
	tagType,
	typeParameters,
	typedExpressionInput
} from './effect-template-helpers.js'
import {
	txDeferredType,
	txPubSubType,
	txQueueType,
	txRefType,
	txSemaphoreType,
	txSubscriptionRefType
} from './effect-transaction-template-helpers.js'

/**
 * Effect v4 real-world transactional coordination compositions.
 *
 * Runtime contract:
 *   import { Effect, Layer, TxDeferred, TxPubSub, TxQueue, TxRef, TxSemaphore, TxSubscriptionRef } from 'effect'
 */

const VERSION = '1.0.0' as const
const txRefInput = (description: string, value = 'unknown') => typedExpressionInput(description, txRefType(value))
const txQueueInput = (description: string, value = 'unknown', error = 'never') => typedExpressionInput(description, txQueueType(value, error))
const txDeferredInput = (description: string, success = 'unknown', error = 'never') => typedExpressionInput(description, txDeferredType(success, error))
const txSemaphoreInput = (description: string) => typedExpressionInput(description, txSemaphoreType())
const txSubscriptionRefInput = (description: string, value = 'unknown') => typedExpressionInput(description, txSubscriptionRefType(value))
const serviceTagInput = (description: string, identifier: string, service: string) => typedExpressionInput(description, tagType(identifier, service))

export const AtomicBalanceTransferTemplate = defineTemplate({
	modelId: 'AtomicBalanceTransfer',
	version: VERSION,
	description: 'Atomically transfers an amount between two numeric TxRefs and rolls back when funds are insufficient.',
	typeParameters: typeParameters(['E', 'Insufficient-balance error type.']),
	inputs: {
		from: txRefInput('Source balance TxRef.', 'number'),
		to: txRefInput('Destination balance TxRef.', 'number'),
		amount: effectValueInput('Positive transfer amount.', { ts: 'number' }),
		insufficient: effectValueInput('Failure returned when the source balance cannot cover the transfer.', { ts: '{{E}}' })
	},
	output: expressionOutput('Atomic transfer Effect.', effectType('{ readonly from: number; readonly to: number }', '{{E}}', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const from = ${marker('expression', 'from', 'from')}
	const to = ${marker('expression', 'to', 'to')}
	const amount = ${marker('expression', 'amount', '1')}
	const insufficient = ${marker('expression', 'insufficient', 'undefined')}
	const fromBalance = yield* TxRef.get(from)
	if (fromBalance < amount) return yield* Effect.fail(insufficient)
	const toBalance = yield* TxRef.get(to)
	yield* TxRef.set(from, fromBalance - amount)
	yield* TxRef.set(to, toBalance + amount)
	return { from: fromBalance - amount, to: toBalance + amount }
}))`
})

export const WaitForTransactionalConditionTemplate = defineTemplate({
	modelId: 'WaitForTransactionalCondition',
	version: VERSION,
	description: 'Reads a TxRef and transactionally suspends with Effect.txRetry until a predicate becomes true.',
	typeParameters: typeParameters(['A', 'Observed state type.']),
	inputs: {
		ref: txRefInput('Transactional state to observe.', '{{A}}'),
		predicate: callbackInput('Condition that must hold before the transaction may complete.', { ts: '(value: {{A}}) => boolean' })
	},
	output: expressionOutput('Effect yielding the first committed state satisfying the condition.', effectType('{{A}}', 'never', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const ref = ${marker('expression', 'ref', 'ref')}
	const predicate = ${marker('expression', 'predicate', '() => true')}
	const value = yield* TxRef.get(ref)
	if (!predicate(value)) return yield* Effect.txRetry
	return value
}))`
})

export const TransactionalCompareAndSetTemplate = defineTemplate({
	modelId: 'TransactionalCompareAndSet',
	version: VERSION,
	description: 'Atomically replaces a TxRef value only when it matches an expected value.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: {
		ref: txRefInput('Transactional reference.', '{{A}}'),
		expected: effectValueInput('Expected current value.', { ts: '{{A}}' }),
		next: effectValueInput('Replacement value.', { ts: '{{A}}' }),
		equals: callbackInput('Equality predicate.', { ts: '(current: {{A}}, expected: {{A}}) => boolean' })
	},
	output: expressionOutput('Whether the replacement was committed.', effectType('boolean', 'never', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const ref = ${marker('expression', 'ref', 'ref')}
	const expected = ${marker('expression', 'expected', 'undefined')}
	const next = ${marker('expression', 'next', 'undefined')}
	const equals = ${marker('expression', 'equals', '(current, expected) => current === expected')}
	const current = yield* TxRef.get(ref)
	if (!equals(current, expected)) return false
	yield* TxRef.set(ref, next)
	return true
}))`
})

export const TransactionalBoundedCounterUpdateTemplate = defineTemplate({
	modelId: 'TransactionalBoundedCounterUpdate',
	version: VERSION,
	description: 'Atomically updates a numeric TxRef while enforcing inclusive lower and upper bounds.',
	typeParameters: typeParameters(['E', 'Out-of-bounds error type.']),
	inputs: {
		ref: txRefInput('Counter TxRef.', 'number'),
		delta: effectValueInput('Signed counter change.', { ts: 'number' }),
		minimum: effectValueInput('Inclusive minimum.', { ts: 'number' }),
		maximum: effectValueInput('Inclusive maximum.', { ts: 'number' }),
		outOfBounds: effectValueInput('Failure returned when the next value violates the bounds.', { ts: '{{E}}' })
	},
	output: expressionOutput('Committed counter value.', effectType('number', '{{E}}', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const ref = ${marker('expression', 'ref', 'ref')}
	const delta = ${marker('expression', 'delta', '1')}
	const minimum = ${marker('expression', 'minimum', '0')}
	const maximum = ${marker('expression', 'maximum', '100')}
	const outOfBounds = ${marker('expression', 'outOfBounds', 'undefined')}
	const current = yield* TxRef.get(ref)
	const next = current + delta
	if (next < minimum || next > maximum) return yield* Effect.fail(outOfBounds)
	yield* TxRef.set(ref, next)
	return next
}))`
})

export const TransactionalTakeAndCountTemplate = defineTemplate({
	modelId: 'TransactionalTakeAndCount',
	version: VERSION,
	description: 'Atomically takes one TxQueue item and increments a processed-count TxRef.',
	typeParameters: typeParameters(['A', 'Queue item type.'], ['E', 'Queue terminal error type.']),
	inputs: {
		queue: txQueueInput('Transactional input queue.', '{{A}}', '{{E}}'),
		count: txRefInput('Processed-item counter.', 'number')
	},
	output: expressionOutput('Taken item after the counter update commits.', effectType('{{A}}', '{{E}}', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const queue = ${marker('expression', 'queue', 'queue')}
	const count = ${marker('expression', 'count', 'count')}
	const item = yield* TxQueue.take(queue)
	yield* TxRef.update(count, (value) => value + 1)
	return item
}))`
})

export const TransactionalStateTransitionWithEventTemplate = defineTemplate({
	modelId: 'TransactionalStateTransitionWithEvent',
	version: VERSION,
	description: 'Atomically validates and updates state while enqueueing a derived event; any failed enqueue rolls back the state change.',
	typeParameters: typeParameters(
		['S', 'State type.'],
		['Event', 'Event type.'],
		['EQueue', 'Queue terminal error type.'],
		['ETransition', 'Rejected-transition error type.'],
		['EEnqueue', 'Rejected-enqueue error type.']
	),
	inputs: {
		state: txRefInput('Transactional state.', '{{S}}'),
		outbox: txQueueInput('Transactional event outbox.', '{{Event}}', '{{EQueue}}'),
		canTransition: callbackInput('Pure transition guard.', { ts: '(current: {{S}}) => boolean' }),
		transition: callbackInput('Pure next-state function.', { ts: '(current: {{S}}) => {{S}}' }),
		toEvent: callbackInput('Pure event constructor.', { ts: '(previous: {{S}}, next: {{S}}) => {{Event}}' }),
		rejected: effectValueInput('Failure for a disallowed state transition.', { ts: '{{ETransition}}' }),
		enqueueRejected: effectValueInput('Failure when the queue strategy rejects the event.', { ts: '{{EEnqueue}}' })
	},
	output: expressionOutput('Committed next state.', effectType('{{S}}', '{{ETransition}} | {{EEnqueue}}', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const state = ${marker('expression', 'state', 'state')}
	const outbox = ${marker('expression', 'outbox', 'outbox')}
	const canTransition = ${marker('expression', 'canTransition', '() => true')}
	const transition = ${marker('expression', 'transition', '(current) => current')}
	const toEvent = ${marker('expression', 'toEvent', '(_previous, next) => next')}
	const rejected = ${marker('expression', 'rejected', 'undefined')}
	const enqueueRejected = ${marker('expression', 'enqueueRejected', 'undefined')}
	const previous = yield* TxRef.get(state)
	if (!canTransition(previous)) return yield* Effect.fail(rejected)
	const next = transition(previous)
	yield* TxRef.set(state, next)
	const accepted = yield* TxQueue.offer(outbox, toEvent(previous, next))
	if (!accepted) return yield* Effect.fail(enqueueRejected)
	return next
}))`
})

export const TransactionalOutboxEnqueueTemplate = defineTemplate({
	modelId: 'TransactionalOutboxEnqueue',
	version: VERSION,
	description: 'Atomically mutates in-memory transactional state and appends the corresponding event to a TxQueue outbox.',
	typeParameters: typeParameters(['S', 'State type.'], ['Event', 'Outbox event type.'], ['EQueue', 'Queue terminal error type.'], ['E', 'Rejected enqueue error type.']),
	inputs: {
		state: txRefInput('Transactional state.', '{{S}}'),
		outbox: txQueueInput('Transactional outbox queue.', '{{Event}}', '{{EQueue}}'),
		update: callbackInput('Pure next-state function.', { ts: '(current: {{S}}) => {{S}}' }),
		toEvent: callbackInput('Pure event constructor.', { ts: '(previous: {{S}}, next: {{S}}) => {{Event}}' }),
		enqueueRejected: effectValueInput('Failure when the queue rejects the event.', { ts: '{{E}}' })
	},
	output: expressionOutput('Committed next state.', effectType('{{S}}', '{{E}}', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const state = ${marker('expression', 'state', 'state')}
	const outbox = ${marker('expression', 'outbox', 'outbox')}
	const update = ${marker('expression', 'update', '(current) => current')}
	const toEvent = ${marker('expression', 'toEvent', '(_previous, next) => next')}
	const enqueueRejected = ${marker('expression', 'enqueueRejected', 'undefined')}
	const previous = yield* TxRef.get(state)
	const next = update(previous)
	yield* TxRef.set(state, next)
	const accepted = yield* TxQueue.offer(outbox, toEvent(previous, next))
	if (!accepted) return yield* Effect.fail(enqueueRejected)
	return next
}))`
})

export const TransactionalReservationTemplate = defineTemplate({
	modelId: 'TransactionalReservation',
	version: VERSION,
	description: 'Atomically decrements available stock and enqueues a reservation, rolling back both actions on rejection.',
	typeParameters: typeParameters(['Reservation', 'Reservation payload type.'], ['EQueue', 'Queue terminal error type.'], ['EStock', 'Insufficient-stock error type.'], ['EEnqueue', 'Rejected-enqueue error type.']),
	inputs: {
		stock: txRefInput('Available stock counter.', 'number'),
		reservations: txQueueInput('Transactional reservation queue.', '{{Reservation}}', '{{EQueue}}'),
		amount: effectValueInput('Reserved quantity.', { ts: 'number' }),
		reservation: effectValueInput('Reservation payload.', { ts: '{{Reservation}}' }),
		insufficient: effectValueInput('Failure when insufficient stock is available.', { ts: '{{EStock}}' }),
		enqueueRejected: effectValueInput('Failure when the reservation queue rejects the value.', { ts: '{{EEnqueue}}' })
	},
	output: expressionOutput('Accepted reservation.', effectType('{{Reservation}}', '{{EStock}} | {{EEnqueue}}', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const stock = ${marker('expression', 'stock', 'stock')}
	const reservations = ${marker('expression', 'reservations', 'reservations')}
	const amount = ${marker('expression', 'amount', '1')}
	const reservation = ${marker('expression', 'reservation', 'undefined')}
	const insufficient = ${marker('expression', 'insufficient', 'undefined')}
	const enqueueRejected = ${marker('expression', 'enqueueRejected', 'undefined')}
	const available = yield* TxRef.get(stock)
	if (available < amount) return yield* Effect.fail(insufficient)
	yield* TxRef.set(stock, available - amount)
	const accepted = yield* TxQueue.offer(reservations, reservation)
	if (!accepted) return yield* Effect.fail(enqueueRejected)
	return reservation
}))`
})

export const TransactionalPermitAndQueueReservationTemplate = defineTemplate({
	modelId: 'TransactionalPermitAndQueueReservation',
	version: VERSION,
	description: 'Atomically acquires one TxSemaphore permit and enqueues work, rolling the permit back if enqueue is rejected.',
	typeParameters: typeParameters(['A', 'Queued work type.'], ['EQueue', 'Queue terminal error type.'], ['E', 'Rejected-enqueue error type.']),
	inputs: {
		semaphore: txSemaphoreInput('Transactional permit pool.'),
		queue: txQueueInput('Transactional work queue.', '{{A}}', '{{EQueue}}'),
		value: effectValueInput('Work item.', { ts: '{{A}}' }),
		enqueueRejected: effectValueInput('Failure when the queue rejects the item.', { ts: '{{E}}' })
	},
	output: expressionOutput('Atomic permit-and-enqueue Effect.', effectType('void', '{{E}}', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const semaphore = ${marker('expression', 'semaphore', 'semaphore')}
	const queue = ${marker('expression', 'queue', 'queue')}
	const value = ${marker('expression', 'value', 'undefined')}
	const enqueueRejected = ${marker('expression', 'enqueueRejected', 'undefined')}
	yield* TxSemaphore.acquire(semaphore)
	const accepted = yield* TxQueue.offer(queue, value)
	if (!accepted) return yield* Effect.fail(enqueueRejected)
}))`
})

export const TransactionalDeferredCompleteOnceTemplate = defineTemplate({
	modelId: 'TransactionalDeferredCompleteOnce',
	version: VERSION,
	description: 'Completes a TxDeferred inside a transaction and fails if another transaction already completed it.',
	typeParameters: typeParameters(['A', 'Deferred success type.'], ['EDeferred', 'Deferred failure type.'], ['EAlready', 'Already-completed error type.']),
	inputs: {
		deferred: txDeferredInput('Transactional deferred.', '{{A}}', '{{EDeferred}}'),
		value: effectValueInput('Success value.', { ts: '{{A}}' }),
		alreadyCompleted: effectValueInput('Failure when completion was already won.', { ts: '{{EAlready}}' })
	},
	output: expressionOutput('Successful one-time completion Effect.', effectType('void', '{{EAlready}}', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const deferred = ${marker('expression', 'deferred', 'deferred')}
	const value = ${marker('expression', 'value', 'undefined')}
	const alreadyCompleted = ${marker('expression', 'alreadyCompleted', 'undefined')}
	const completed = yield* TxDeferred.succeed(deferred, value)
	if (!completed) return yield* Effect.fail(alreadyCompleted)
}))`
})

export const TransactionalObservableUpdateWithAuditTemplate = defineTemplate({
	modelId: 'TransactionalObservableUpdateWithAudit',
	version: VERSION,
	description: 'Atomically updates a TxSubscriptionRef and appends a derived audit event to a transactional outbox.',
	typeParameters: typeParameters(['S', 'Observable state type.'], ['Event', 'Audit event type.'], ['EQueue', 'Queue terminal error type.'], ['E', 'Rejected-enqueue error type.']),
	inputs: {
		state: txSubscriptionRefInput('Observable transactional state.', '{{S}}'),
		audit: txQueueInput('Transactional audit queue.', '{{Event}}', '{{EQueue}}'),
		update: callbackInput('Pure next-state function.', { ts: '(current: {{S}}) => {{S}}' }),
		toAudit: callbackInput('Pure audit-event constructor.', { ts: '(previous: {{S}}, next: {{S}}) => {{Event}}' }),
		enqueueRejected: effectValueInput('Failure when the audit event cannot be accepted.', { ts: '{{E}}' })
	},
	output: expressionOutput('Committed observable next state.', effectType('{{S}}', '{{E}}', 'never')),
	source: `Effect.tx(Effect.gen(function* () {
	const state = ${marker('expression', 'state', 'state')}
	const audit = ${marker('expression', 'audit', 'audit')}
	const update = ${marker('expression', 'update', '(current) => current')}
	const toAudit = ${marker('expression', 'toAudit', '(_previous, next) => next')}
	const enqueueRejected = ${marker('expression', 'enqueueRejected', 'undefined')}
	const previous = yield* TxSubscriptionRef.get(state)
	const next = update(previous)
	yield* TxSubscriptionRef.set(state, next)
	const accepted = yield* TxQueue.offer(audit, toAudit(previous, next))
	if (!accepted) return yield* Effect.fail(enqueueRejected)
	return next
}))`
})

export const TransactionalStateServiceLayerTemplate = defineTemplate({
	modelId: 'TransactionalStateServiceLayer',
	version: VERSION,
	description: 'Creates a Layer that provides a TxRef initialized with application state.',
	typeParameters: typeParameters(['I', 'Service identifier type.'], ['A', 'State value type.']),
	inputs: {
		tag: serviceTagInput('Service tag for the TxRef.', '{{I}}', txRefType('{{A}}').ts),
		initial: effectValueInput('Initial state value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Layer providing transactional state.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'tag', 'State')}, TxRef.make(${marker('expression', 'initial', 'undefined')}))`
})

export const TransactionalQueueServiceLayerTemplate = defineTemplate({
	modelId: 'TransactionalQueueServiceLayer',
	version: VERSION,
	description: 'Creates a Layer that provides a bounded TxQueue.',
	typeParameters: typeParameters(['I', 'Service identifier type.'], ['A', 'Queue item type.'], ['E', 'Queue terminal error type.']),
	inputs: {
		tag: serviceTagInput('Service tag for the TxQueue.', '{{I}}', txQueueType('{{A}}', '{{E}}').ts),
		capacity: effectValueInput('Queue capacity.', { ts: 'number' })
	},
	output: expressionOutput('Layer providing a bounded transactional queue.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'tag', 'WorkQueue')}, TxQueue.bounded(${marker('expression', 'capacity', '64')}))`
})

export const TransactionalPubSubServiceLayerTemplate = defineTemplate({
	modelId: 'TransactionalPubSubServiceLayer',
	version: VERSION,
	description: 'Creates a Layer that provides a bounded TxPubSub.',
	typeParameters: typeParameters(['I', 'Service identifier type.'], ['A', 'Published value type.']),
	inputs: {
		tag: serviceTagInput('Service tag for the TxPubSub.', '{{I}}', txPubSubType('{{A}}').ts),
		capacity: effectValueInput('Per-subscriber capacity.', { ts: 'number' })
	},
	output: expressionOutput('Layer providing transactional PubSub.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'tag', 'Events')}, TxPubSub.bounded(${marker('expression', 'capacity', '64')}))`
})

export const TransactionalDeferredServiceLayerTemplate = defineTemplate({
	modelId: 'TransactionalDeferredServiceLayer',
	version: VERSION,
	description: 'Creates a Layer that provides a TxDeferred coordination gate.',
	typeParameters: typeParameters(['I', 'Service identifier type.'], ['A', 'Deferred success type.'], ['E', 'Deferred failure type.']),
	inputs: {
		tag: serviceTagInput('Service tag for the TxDeferred.', '{{I}}', txDeferredType('{{A}}', '{{E}}').ts)
	},
	output: expressionOutput('Layer providing a transactional deferred.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'tag', 'Ready')}, TxDeferred.make())`
})

export const TransactionalSemaphoreServiceLayerTemplate = defineTemplate({
	modelId: 'TransactionalSemaphoreServiceLayer',
	version: VERSION,
	description: 'Creates a Layer that provides a shared TxSemaphore.',
	typeParameters: typeParameters(['I', 'Service identifier type.']),
	inputs: {
		tag: serviceTagInput('Service tag for the TxSemaphore.', '{{I}}', txSemaphoreType().ts),
		permits: effectValueInput('Semaphore capacity.', { ts: 'number' })
	},
	output: expressionOutput('Layer providing a transactional semaphore.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'tag', 'Permits')}, TxSemaphore.make(${marker('expression', 'permits', '1')}))`
})

export const effectV4TransactionalCoordinationTemplateInputs = [
	AtomicBalanceTransferTemplate,
	WaitForTransactionalConditionTemplate,
	TransactionalCompareAndSetTemplate,
	TransactionalBoundedCounterUpdateTemplate,
	TransactionalTakeAndCountTemplate,
	TransactionalStateTransitionWithEventTemplate,
	TransactionalOutboxEnqueueTemplate,
	TransactionalReservationTemplate,
	TransactionalPermitAndQueueReservationTemplate,
	TransactionalDeferredCompleteOnceTemplate,
	TransactionalObservableUpdateWithAuditTemplate,
	TransactionalStateServiceLayerTemplate,
	TransactionalQueueServiceLayerTemplate,
	TransactionalPubSubServiceLayerTemplate,
	TransactionalDeferredServiceLayerTemplate,
	TransactionalSemaphoreServiceLayerTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
