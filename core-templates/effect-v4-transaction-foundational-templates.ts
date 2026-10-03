import { defineTemplate } from './sample-definition.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	marker,
	statementCollectionInput,
	typeParameters,
	typedExpressionInput,
	valueInput,
	streamType
} from './effect-template-helpers.js'
import {
	transactionRequirement,
	txDeferredType,
	txPubSubType,
	txQueueType,
	txRefType,
	txSemaphoreType,
	txSubscriptionRefType
} from './effect-transaction-template-helpers.js'

/**
 * Effect v4 transaction / STM foundational templates.
 *
 * Runtime contract:
 *   import { Effect, TxDeferred, TxPubSub, TxQueue, TxRef, TxSemaphore, TxSubscriptionRef } from 'effect'
 */

const VERSION = '1.0.0' as const
const scopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'
const txRefInput = (description: string, value = 'unknown') => typedExpressionInput(description, txRefType(value))
const txQueueInput = (description: string, value = 'unknown', error = 'never') => typedExpressionInput(description, txQueueType(value, error))
const txDeferredInput = (description: string, success = 'unknown', error = 'never') => typedExpressionInput(description, txDeferredType(success, error))
const txSemaphoreInput = (description: string) => typedExpressionInput(description, txSemaphoreType())
const txPubSubInput = (description: string, value = 'unknown') => typedExpressionInput(description, txPubSubType(value))
const txSubscriptionRefInput = (description: string, value = 'unknown') => typedExpressionInput(description, txSubscriptionRefType(value))

export const EffectTxTemplate = defineTemplate({
	modelId: 'EffectTx', version: VERSION, description: 'Runs an Effect as an atomic transaction, composing nested Effect.tx calls into the active transaction.',
	typeParameters: typeParameters(['A', 'Transaction success type.'], ['E', 'Transaction error type.'], ['R', 'Non-transaction requirements.']),
	inputs: { source: effectSourceInput('Transactional Effect body.', effectType('{{A}}', '{{E}}', `{{R}} | ${transactionRequirement}`)) },
	output: expressionOutput('Committed transactional Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.tx(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectTxRetryTemplate = defineTemplate({
	modelId: 'EffectTxRetry', version: VERSION, description: 'Requests optimistic transaction retry after one of the transactionally read values changes.',
	inputs: {},
	output: expressionOutput('Transactional retry Effect.', effectType('never', 'never', transactionRequirement)),
	source: 'Effect.txRetry'
})

export const TxRefMakeTemplate = defineTemplate({
	modelId: 'TxRefMake', version: VERSION, description: 'Creates a transactional reference.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { initial: effectValueInput('Initial value.', { ts: '{{A}}' }) },
	output: expressionOutput('TxRef creation Effect.', effectType(txRefType('{{A}}').ts, 'never', 'never')),
	source: `TxRef.make(${marker('expression', 'initial', 'undefined')})`
})

export const TxRefGetTemplate = defineTemplate({
	modelId: 'TxRefGet', version: VERSION, description: 'Reads a transactional reference.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { ref: txRefInput('Transactional reference.', '{{A}}') },
	output: expressionOutput('TxRef read Effect.', effectType('{{A}}', 'never', 'never')),
	source: `TxRef.get(${marker('expression', 'ref', 'ref')})`
})

export const TxRefSetTemplate = defineTemplate({
	modelId: 'TxRefSet', version: VERSION, description: 'Sets a transactional reference.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { ref: txRefInput('Transactional reference.', '{{A}}'), value: effectValueInput('Replacement value.', { ts: '{{A}}' }) },
	output: expressionOutput('TxRef write Effect.', effectType('void', 'never', 'never')),
	source: `TxRef.set(${marker('expression', 'ref', 'ref')}, ${marker('expression', 'value', 'undefined')})`
})

export const TxRefUpdateTemplate = defineTemplate({
	modelId: 'TxRefUpdate', version: VERSION, description: 'Updates a transactional reference with a pure transformation.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { ref: txRefInput('Transactional reference.', '{{A}}'), update: callbackInput('Pure state update.', { ts: '(current: {{A}}) => {{A}}' }) },
	output: expressionOutput('TxRef update Effect.', effectType('void', 'never', 'never')),
	source: `TxRef.update(${marker('expression', 'ref', 'ref')}, ${marker('expression', 'update', 'current => current')})`
})

export const TxRefModifyTemplate = defineTemplate({
	modelId: 'TxRefModify', version: VERSION, description: 'Atomically modifies a TxRef while returning a separate computed value.',
	typeParameters: typeParameters(['A', 'Stored value type.'], ['B', 'Returned value type.']),
	inputs: { ref: txRefInput('Transactional reference.', '{{A}}'), modify: callbackInput('Pure function returning [result, nextState].', { ts: '(current: {{A}}) => [{{B}}, {{A}}]' }) },
	output: expressionOutput('TxRef modify Effect.', effectType('{{B}}', 'never', 'never')),
	source: `TxRef.modify(${marker('expression', 'ref', 'ref')}, ${marker('expression', 'modify', 'current => [current, current]')})`
})

export const TxRefGetAndSetTemplate = defineTemplate({
	modelId: 'TxRefGetAndSet', version: VERSION, description: 'Replaces a TxRef value and returns the previous value.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { ref: txRefInput('Transactional reference.', '{{A}}'), value: effectValueInput('Replacement value.', { ts: '{{A}}' }) },
	output: expressionOutput('Previous TxRef value Effect.', effectType('{{A}}', 'never', 'never')),
	source: `TxRef.modify(${marker('expression', 'ref', 'ref')}, current => [current, ${marker('expression', 'value', 'undefined')}])`
})

const txQueueConstructor = (modelId: string, member: 'bounded' | 'dropping' | 'sliding') => defineTemplate({
	modelId, version: VERSION, description: `Creates a ${member} transactional queue.`,
	typeParameters: typeParameters(['A', 'Queue element type.'], ['E', 'Queue terminal error type.']),
	inputs: { capacity: effectValueInput('Queue capacity.', { ts: 'number' }) },
	output: expressionOutput('Transactional queue creation Effect.', effectType(txQueueType('{{A}}', '{{E}}').ts, 'never', 'never')),
	source: `TxQueue.${member}(${marker('expression', 'capacity', '16')})`
})

export const TxQueueBoundedTemplate = txQueueConstructor('TxQueueBounded', 'bounded')
export const TxQueueDroppingTemplate = txQueueConstructor('TxQueueDropping', 'dropping')
export const TxQueueSlidingTemplate = txQueueConstructor('TxQueueSliding', 'sliding')

export const TxQueueUnboundedTemplate = defineTemplate({
	modelId: 'TxQueueUnbounded', version: VERSION, description: 'Creates an unbounded transactional queue.',
	typeParameters: typeParameters(['A', 'Queue element type.'], ['E', 'Queue terminal error type.']),
	inputs: {},
	output: expressionOutput('Unbounded transactional queue creation Effect.', effectType(txQueueType('{{A}}', '{{E}}').ts, 'never', 'never')),
	source: 'TxQueue.unbounded()'
})

export const TxQueueOfferTemplate = defineTemplate({
	modelId: 'TxQueueOffer', version: VERSION, description: 'Offers one value to a transactional queue.',
	typeParameters: typeParameters(['A', 'Queue element type.'], ['E', 'Queue terminal error type.']),
	inputs: { queue: txQueueInput('Transactional queue.', '{{A}}', '{{E}}'), value: effectValueInput('Value to enqueue.', { ts: '{{A}}' }) },
	output: expressionOutput('Offer acceptance Effect.', effectType('boolean', 'never', 'never')),
	source: `TxQueue.offer(${marker('expression', 'queue', 'queue')}, ${marker('expression', 'value', 'undefined')})`
})

export const TxQueueOfferAllTemplate = defineTemplate({
	modelId: 'TxQueueOfferAll', version: VERSION, description: 'Offers an iterable of values and returns rejected values.',
	typeParameters: typeParameters(['A', 'Queue element type.'], ['E', 'Queue terminal error type.']),
	inputs: { queue: txQueueInput('Transactional queue.', '{{A}}', '{{E}}'), values: effectValueInput('Values to enqueue.', { ts: 'Iterable<{{A}}>' }) },
	output: expressionOutput('Rejected queue values Effect.', effectType('Array<{{A}}>', 'never', 'never')),
	source: `TxQueue.offerAll(${marker('expression', 'queue', 'queue')}, ${marker('expression', 'values', '[]')})`
})

export const TxQueueTakeTemplate = defineTemplate({
	modelId: 'TxQueueTake', version: VERSION, description: 'Takes the next queue element, transactionally retrying while an open queue is empty.',
	typeParameters: typeParameters(['A', 'Queue element type.'], ['E', 'Queue terminal error type.']),
	inputs: { queue: txQueueInput('Transactional queue.', '{{A}}', '{{E}}') },
	output: expressionOutput('Queue take Effect.', effectType('{{A}}', '{{E}}', 'never')),
	source: `TxQueue.take(${marker('expression', 'queue', 'queue')})`
})

export const TxQueueTakeAllTemplate = defineTemplate({
	modelId: 'TxQueueTakeAll', version: VERSION, description: 'Takes all currently available elements as a non-empty array, retrying while empty.',
	typeParameters: typeParameters(['A', 'Queue element type.'], ['E', 'Queue terminal error type.']),
	inputs: { queue: txQueueInput('Transactional queue.', '{{A}}', '{{E}}') },
	output: expressionOutput('Non-empty queue batch Effect.', effectType('readonly [{{A}}, ...Array<{{A}}>]', '{{E}}', 'never')),
	source: `TxQueue.takeAll(${marker('expression', 'queue', 'queue')})`
})

export const TxQueueSizeTemplate = defineTemplate({
	modelId: 'TxQueueSize', version: VERSION, description: 'Reads the transactional queue size.',
	inputs: { queue: txQueueInput('Transactional queue.') },
	output: expressionOutput('Queue size Effect.', effectType('number', 'never', 'never')),
	source: `TxQueue.size(${marker('expression', 'queue', 'queue')})`
})

export const TxQueueShutdownTemplate = defineTemplate({
	modelId: 'TxQueueShutdown', version: VERSION, description: 'Shuts down a transactional queue.',
	inputs: { queue: txQueueInput('Transactional queue.') },
	output: expressionOutput('Whether the queue transitioned to shutdown.', effectType('boolean', 'never', 'never')),
	source: `TxQueue.shutdown(${marker('expression', 'queue', 'queue')})`
})

export const TxQueueIsShutdownTemplate = defineTemplate({
	modelId: 'TxQueueIsShutdown', version: VERSION, description: 'Checks whether a transactional queue is shut down.',
	inputs: { queue: txQueueInput('Transactional queue.') },
	output: expressionOutput('Queue shutdown-state Effect.', effectType('boolean', 'never', 'never')),
	source: `TxQueue.isShutdown(${marker('expression', 'queue', 'queue')})`
})

export const TxDeferredMakeTemplate = defineTemplate({
	modelId: 'TxDeferredMake', version: VERSION, description: 'Creates a one-shot transactional deferred.',
	typeParameters: typeParameters(['A', 'Success value type.'], ['E', 'Failure value type.']),
	inputs: {},
	output: expressionOutput('TxDeferred creation Effect.', effectType(txDeferredType('{{A}}', '{{E}}').ts, 'never', 'never')),
	source: 'TxDeferred.make()'
})

export const TxDeferredAwaitTemplate = defineTemplate({
	modelId: 'TxDeferredAwait', version: VERSION, description: 'Awaits a transactional deferred, retrying the transaction while incomplete.',
	typeParameters: typeParameters(['A', 'Success value type.'], ['E', 'Failure value type.']),
	inputs: { deferred: txDeferredInput('Transactional deferred.', '{{A}}', '{{E}}') },
	output: expressionOutput('TxDeferred await Effect.', effectType('{{A}}', '{{E}}', 'never')),
	source: `TxDeferred.await(${marker('expression', 'deferred', 'deferred')})`
})

export const TxDeferredSucceedTemplate = defineTemplate({
	modelId: 'TxDeferredSucceed', version: VERSION, description: 'Completes a transactional deferred successfully once.',
	typeParameters: typeParameters(['A', 'Success value type.'], ['E', 'Failure value type.']),
	inputs: { deferred: txDeferredInput('Transactional deferred.', '{{A}}', '{{E}}'), value: effectValueInput('Success value.', { ts: '{{A}}' }) },
	output: expressionOutput('Whether completion won Effect.', effectType('boolean', 'never', 'never')),
	source: `TxDeferred.succeed(${marker('expression', 'deferred', 'deferred')}, ${marker('expression', 'value', 'undefined')})`
})

export const TxDeferredFailTemplate = defineTemplate({
	modelId: 'TxDeferredFail', version: VERSION, description: 'Completes a transactional deferred with a typed failure once.',
	typeParameters: typeParameters(['A', 'Success value type.'], ['E', 'Failure value type.']),
	inputs: { deferred: txDeferredInput('Transactional deferred.', '{{A}}', '{{E}}'), error: effectValueInput('Failure value.', { ts: '{{E}}' }) },
	output: expressionOutput('Whether failure completion won Effect.', effectType('boolean', 'never', 'never')),
	source: `TxDeferred.fail(${marker('expression', 'deferred', 'deferred')}, ${marker('expression', 'error', 'undefined')})`
})

export const TxSemaphoreMakeTemplate = defineTemplate({
	modelId: 'TxSemaphoreMake', version: VERSION, description: 'Creates a transactional semaphore.',
	inputs: { permits: effectValueInput('Initial permit count.', { ts: 'number' }) },
	output: expressionOutput('TxSemaphore creation Effect.', effectType(txSemaphoreType().ts, 'never', 'never')),
	source: `TxSemaphore.make(${marker('expression', 'permits', '1')})`
})

export const TxSemaphoreAvailableTemplate = defineTemplate({
	modelId: 'TxSemaphoreAvailable', version: VERSION, description: 'Reads currently available transactional permits.',
	inputs: { semaphore: txSemaphoreInput('Transactional semaphore.') },
	output: expressionOutput('Available permit count Effect.', effectType('number', 'never', 'never')),
	source: `TxSemaphore.available(${marker('expression', 'semaphore', 'semaphore')})`
})

export const TxSemaphoreCapacityTemplate = defineTemplate({
	modelId: 'TxSemaphoreCapacity', version: VERSION, description: 'Reads the fixed transactional semaphore capacity.',
	inputs: { semaphore: txSemaphoreInput('Transactional semaphore.') },
	output: expressionOutput('Semaphore capacity Effect.', effectType('number', 'never', 'never')),
	source: `TxSemaphore.capacity(${marker('expression', 'semaphore', 'semaphore')})`
})

export const TxSemaphoreAcquireTemplate = defineTemplate({
	modelId: 'TxSemaphoreAcquire', version: VERSION, description: 'Acquires one transactional permit, retrying while unavailable.',
	inputs: { semaphore: txSemaphoreInput('Transactional semaphore.') },
	output: expressionOutput('Permit acquisition Effect.', effectType('void', 'never', 'never')),
	source: `TxSemaphore.acquire(${marker('expression', 'semaphore', 'semaphore')})`
})

export const TxSemaphoreTryAcquireTemplate = defineTemplate({
	modelId: 'TxSemaphoreTryAcquire', version: VERSION, description: 'Attempts to acquire one permit without waiting.',
	inputs: { semaphore: txSemaphoreInput('Transactional semaphore.') },
	output: expressionOutput('Permit acquisition result Effect.', effectType('boolean', 'never', 'never')),
	source: `TxSemaphore.tryAcquire(${marker('expression', 'semaphore', 'semaphore')})`
})

export const TxSemaphoreReleaseTemplate = defineTemplate({
	modelId: 'TxSemaphoreRelease', version: VERSION, description: 'Returns one transactional permit up to capacity.',
	inputs: { semaphore: txSemaphoreInput('Transactional semaphore.') },
	output: expressionOutput('Permit release Effect.', effectType('void', 'never', 'never')),
	source: `TxSemaphore.release(${marker('expression', 'semaphore', 'semaphore')})`
})

export const TxSemaphoreWithPermitTemplate = defineTemplate({
	modelId: 'TxSemaphoreWithPermit', version: VERSION, description: 'Runs an Effect with one automatically acquired and released transactional permit.',
	typeParameters: typeParameters(['A', 'Protected success type.'], ['E', 'Protected error type.'], ['R', 'Protected requirements.']),
	inputs: { semaphore: txSemaphoreInput('Transactional semaphore.'), source: effectSourceInput('Effect protected by the permit.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Permit-protected Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `TxSemaphore.withPermit(${marker('expression', 'semaphore', 'semaphore')}, ${marker('expression', 'source', 'Effect.void')})`
})

export const TxSemaphoreWithPermitsTemplate = defineTemplate({
	modelId: 'TxSemaphoreWithPermits', version: VERSION, description: 'Runs an Effect while holding multiple transactional semaphore permits.',
	typeParameters: typeParameters(['A', 'Protected success type.'], ['E', 'Protected error type.'], ['R', 'Protected requirements.']),
	inputs: { semaphore: txSemaphoreInput('Transactional semaphore.'), permits: effectValueInput('Permit count.', { ts: 'number' }), source: effectSourceInput('Effect protected by the permits.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Multi-permit protected Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `TxSemaphore.withPermits(${marker('expression', 'semaphore', 'semaphore')}, ${marker('expression', 'permits', '1')}, ${marker('expression', 'source', 'Effect.void')})`
})

const txPubSubConstructor = (modelId: string, member: 'bounded' | 'dropping' | 'sliding') => defineTemplate({
	modelId, version: VERSION, description: `Creates a ${member} transactional PubSub.`,
	typeParameters: typeParameters(['A', 'Published value type.']),
	inputs: { capacity: effectValueInput('Per-subscriber capacity.', { ts: 'number' }) },
	output: expressionOutput('Transactional PubSub creation Effect.', effectType(txPubSubType('{{A}}').ts, 'never', 'never')),
	source: `TxPubSub.${member}(${marker('expression', 'capacity', '16')})`
})

export const TxPubSubBoundedTemplate = txPubSubConstructor('TxPubSubBounded', 'bounded')
export const TxPubSubDroppingTemplate = txPubSubConstructor('TxPubSubDropping', 'dropping')
export const TxPubSubSlidingTemplate = txPubSubConstructor('TxPubSubSliding', 'sliding')

export const TxPubSubUnboundedTemplate = defineTemplate({
	modelId: 'TxPubSubUnbounded', version: VERSION, description: 'Creates an unbounded transactional PubSub.',
	typeParameters: typeParameters(['A', 'Published value type.']), inputs: {},
	output: expressionOutput('Unbounded transactional PubSub creation Effect.', effectType(txPubSubType('{{A}}').ts, 'never', 'never')),
	source: 'TxPubSub.unbounded()'
})

export const TxPubSubPublishTemplate = defineTemplate({
	modelId: 'TxPubSubPublish', version: VERSION, description: 'Transactionally publishes one value to current subscribers.',
	typeParameters: typeParameters(['A', 'Published value type.']),
	inputs: { pubsub: txPubSubInput('Transactional PubSub.', '{{A}}'), value: effectValueInput('Published value.', { ts: '{{A}}' }) },
	output: expressionOutput('Publish acceptance Effect.', effectType('boolean', 'never', 'never')),
	source: `TxPubSub.publish(${marker('expression', 'pubsub', 'pubsub')}, ${marker('expression', 'value', 'undefined')})`
})

export const TxPubSubPublishAllTemplate = defineTemplate({
	modelId: 'TxPubSubPublishAll', version: VERSION, description: 'Transactionally publishes an iterable of values to current subscribers.',
	typeParameters: typeParameters(['A', 'Published value type.']),
	inputs: { pubsub: txPubSubInput('Transactional PubSub.', '{{A}}'), values: effectValueInput('Published values.', { ts: 'Iterable<{{A}}>' }) },
	output: expressionOutput('Publish-all acceptance Effect.', effectType('boolean', 'never', 'never')),
	source: `TxPubSub.publishAll(${marker('expression', 'pubsub', 'pubsub')}, ${marker('expression', 'values', '[]')})`
})

export const TxPubSubSubscribeTemplate = defineTemplate({
	modelId: 'TxPubSubSubscribe', version: VERSION, description: 'Creates a scoped transactional subscription queue.',
	typeParameters: typeParameters(['A', 'Published value type.']),
	inputs: { pubsub: txPubSubInput('Transactional PubSub.', '{{A}}') },
	output: expressionOutput('Scoped subscription Effect.', effectType(txQueueType('{{A}}', 'never').ts, 'never', scopeRequirement)),
	source: `TxPubSub.subscribe(${marker('expression', 'pubsub', 'pubsub')})`
})

export const TxPubSubSizeTemplate = defineTemplate({
	modelId: 'TxPubSubSize', version: VERSION, description: 'Reads the maximum queued message count across subscribers.',
	inputs: { pubsub: txPubSubInput('Transactional PubSub.') },
	output: expressionOutput('PubSub size Effect.', effectType('number', 'never', 'never')),
	source: `TxPubSub.size(${marker('expression', 'pubsub', 'pubsub')})`
})

export const TxPubSubShutdownTemplate = defineTemplate({
	modelId: 'TxPubSubShutdown', version: VERSION, description: 'Shuts down a transactional PubSub and its current subscribers.',
	inputs: { pubsub: txPubSubInput('Transactional PubSub.') },
	output: expressionOutput('PubSub shutdown Effect.', effectType('void', 'never', 'never')),
	source: `TxPubSub.shutdown(${marker('expression', 'pubsub', 'pubsub')})`
})

export const TxPubSubIsShutdownTemplate = defineTemplate({
	modelId: 'TxPubSubIsShutdown', version: VERSION, description: 'Checks whether a transactional PubSub is shut down.',
	inputs: { pubsub: txPubSubInput('Transactional PubSub.') },
	output: expressionOutput('PubSub shutdown-state Effect.', effectType('boolean', 'never', 'never')),
	source: `TxPubSub.isShutdown(${marker('expression', 'pubsub', 'pubsub')})`
})

export const TxSubscriptionRefMakeTemplate = defineTemplate({
	modelId: 'TxSubscriptionRefMake', version: VERSION, description: 'Creates transactional state that publishes each committed update.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { initial: effectValueInput('Initial state.', { ts: '{{A}}' }) },
	output: expressionOutput('TxSubscriptionRef creation Effect.', effectType(txSubscriptionRefType('{{A}}').ts, 'never', 'never')),
	source: `TxSubscriptionRef.make(${marker('expression', 'initial', 'undefined')})`
})

export const TxSubscriptionRefGetTemplate = defineTemplate({
	modelId: 'TxSubscriptionRefGet', version: VERSION, description: 'Reads transactional observable state.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { ref: txSubscriptionRefInput('Transactional subscription reference.', '{{A}}') },
	output: expressionOutput('Current state Effect.', effectType('{{A}}', 'never', 'never')),
	source: `TxSubscriptionRef.get(${marker('expression', 'ref', 'ref')})`
})

export const TxSubscriptionRefSetTemplate = defineTemplate({
	modelId: 'TxSubscriptionRefSet', version: VERSION, description: 'Sets transactional observable state and publishes the committed change.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { ref: txSubscriptionRefInput('Transactional subscription reference.', '{{A}}'), value: effectValueInput('Replacement value.', { ts: '{{A}}' }) },
	output: expressionOutput('State write Effect.', effectType('void', 'never', 'never')),
	source: `TxSubscriptionRef.set(${marker('expression', 'ref', 'ref')}, ${marker('expression', 'value', 'undefined')})`
})

export const TxSubscriptionRefUpdateTemplate = defineTemplate({
	modelId: 'TxSubscriptionRefUpdate', version: VERSION, description: 'Updates transactional observable state and publishes the committed value.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { ref: txSubscriptionRefInput('Transactional subscription reference.', '{{A}}'), update: callbackInput('Pure update function.', { ts: '(current: {{A}}) => {{A}}' }) },
	output: expressionOutput('Observable-state update Effect.', effectType('void', 'never', 'never')),
	source: `TxSubscriptionRef.update(${marker('expression', 'ref', 'ref')}, ${marker('expression', 'update', 'current => current')})`
})

export const TxSubscriptionRefGetAndSetTemplate = defineTemplate({
	modelId: 'TxSubscriptionRefGetAndSet', version: VERSION, description: 'Replaces observable transactional state and returns the previous value.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { ref: txSubscriptionRefInput('Transactional subscription reference.', '{{A}}'), value: effectValueInput('Replacement value.', { ts: '{{A}}' }) },
	output: expressionOutput('Previous state Effect.', effectType('{{A}}', 'never', 'never')),
	source: `TxSubscriptionRef.getAndSet(${marker('expression', 'ref', 'ref')}, ${marker('expression', 'value', 'undefined')})`
})

export const TxSubscriptionRefChangesTemplate = defineTemplate({
	modelId: 'TxSubscriptionRefChanges', version: VERSION, description: 'Creates a scoped transactional queue containing the current value followed by committed changes.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { ref: txSubscriptionRefInput('Transactional subscription reference.', '{{A}}') },
	output: expressionOutput('Scoped changes queue Effect.', effectType(txQueueType('{{A}}', 'never').ts, 'never', scopeRequirement)),
	source: `TxSubscriptionRef.changes(${marker('expression', 'ref', 'ref')})`
})

export const TxSubscriptionRefChangesStreamTemplate = defineTemplate({
	modelId: 'TxSubscriptionRefChangesStream', version: VERSION, description: 'Streams the current transactional value and every subsequently committed change.',
	typeParameters: typeParameters(['A', 'Stored value type.']),
	inputs: { ref: txSubscriptionRefInput('Transactional subscription reference.', '{{A}}') },
	output: expressionOutput('Committed-change Stream.', streamType('{{A}}', 'never', 'never')),
	source: `TxSubscriptionRef.changesStream(${marker('expression', 'ref', 'ref')})`
})

export const EffectTransactionSourceFileTemplate = defineTemplate({
	modelId: 'EffectTransactionSourceFile', version: VERSION, description: 'Builds an Effect V4 source file with transactional coordination modules imported.',
	inputs: { body: statementCollectionInput('Top-level declarations and transaction programs.') },
	output: { kind: 'sourceFile', description: 'Complete Effect transactional-coordination source file.' },
	source: `import { Effect, TxDeferred, TxPubSub, TxQueue, TxRef, TxSemaphore, TxSubscriptionRef } from "effect"\n\n${marker('statement', 'body', 'void 0;')}`
})

export const effectV4TransactionFoundationalTemplateInputs = [
	EffectTxTemplate,
	EffectTxRetryTemplate,
	TxRefMakeTemplate,
	TxRefGetTemplate,
	TxRefSetTemplate,
	TxRefUpdateTemplate,
	TxRefModifyTemplate,
	TxRefGetAndSetTemplate,
	TxQueueBoundedTemplate,
	TxQueueDroppingTemplate,
	TxQueueSlidingTemplate,
	TxQueueUnboundedTemplate,
	TxQueueOfferTemplate,
	TxQueueOfferAllTemplate,
	TxQueueTakeTemplate,
	TxQueueTakeAllTemplate,
	TxQueueSizeTemplate,
	TxQueueShutdownTemplate,
	TxQueueIsShutdownTemplate,
	TxDeferredMakeTemplate,
	TxDeferredAwaitTemplate,
	TxDeferredSucceedTemplate,
	TxDeferredFailTemplate,
	TxSemaphoreMakeTemplate,
	TxSemaphoreAvailableTemplate,
	TxSemaphoreCapacityTemplate,
	TxSemaphoreAcquireTemplate,
	TxSemaphoreTryAcquireTemplate,
	TxSemaphoreReleaseTemplate,
	TxSemaphoreWithPermitTemplate,
	TxSemaphoreWithPermitsTemplate,
	TxPubSubBoundedTemplate,
	TxPubSubDroppingTemplate,
	TxPubSubSlidingTemplate,
	TxPubSubUnboundedTemplate,
	TxPubSubPublishTemplate,
	TxPubSubPublishAllTemplate,
	TxPubSubSubscribeTemplate,
	TxPubSubSizeTemplate,
	TxPubSubShutdownTemplate,
	TxPubSubIsShutdownTemplate,
	TxSubscriptionRefMakeTemplate,
	TxSubscriptionRefGetTemplate,
	TxSubscriptionRefSetTemplate,
	TxSubscriptionRefUpdateTemplate,
	TxSubscriptionRefGetAndSetTemplate,
	TxSubscriptionRefChangesTemplate,
	TxSubscriptionRefChangesStreamTemplate,
	EffectTransactionSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
