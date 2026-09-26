import { nominalType } from './effect-template-helpers.js'
import type { TypeDescriptorWithTs } from './effect-template-helpers.js'

export const transactionRequirement = '{ readonly __effectTransactionRequirement: "Transaction" }'
export const transactionType = (): TypeDescriptorWithTs => nominalType('effect/Transaction')

export const txRefType = (value = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/TxRef', { txRefValue: value })

export const txQueueType = (value = 'unknown', error = 'never'): TypeDescriptorWithTs =>
	nominalType('effect/TxQueue', { txQueueValue: value, txQueueError: error })

export const txDeferredType = (success = 'unknown', error = 'never'): TypeDescriptorWithTs =>
	nominalType('effect/TxDeferred', { txDeferredSuccess: success, txDeferredError: error })

export const txSemaphoreType = (): TypeDescriptorWithTs => nominalType('effect/TxSemaphore')

export const txPubSubType = (value = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/TxPubSub', { txPubSubValue: value })

export const txSubscriptionRefType = (value = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/TxSubscriptionRef', { txSubscriptionRefValue: value })
