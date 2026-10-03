import type { TypeDescriptor } from '../src/templates.js'
import { nominalType, typedExpressionInput } from './effect-template-helpers.js'

/** Shared Effect v4 unstable/workflow template descriptors. */
export const workflowEngineRequirement = '{ readonly __workflowEngineRequirement: "WorkflowEngine" }'
export const workflowInstanceRequirement = '{ readonly __workflowInstanceRequirement: "WorkflowInstance" }'
export const persistedQueueFactoryRequirement = '{ readonly __persistedQueueFactoryRequirement: "PersistedQueueFactory" }'
export const shardingRequirement = '{ readonly __shardingRequirement: "Sharding" }'
export const messageStorageRequirement = '{ readonly __messageStorageRequirement: "MessageStorage" }'

export const workflowType = (
	tag = 'string',
	payload = 'unknown',
	success = 'unknown',
	error = 'unknown'
): TypeDescriptor => nominalType('effect/unstable/workflow/Workflow', {
	workflowTag: tag,
	workflowPayload: payload,
	workflowSuccess: success,
	workflowError: error
})

export const activityType = (success = 'unknown', error = 'unknown', requirements = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/workflow/Activity', {
	activitySuccess: success,
	activityError: error,
	activityRequirements: requirements
})

export const durableClockType = (): TypeDescriptor => nominalType('effect/unstable/workflow/DurableClock')
export const durableDeferredType = (success = 'unknown', error = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/workflow/DurableDeferred', {
	durableDeferredSuccess: success,
	durableDeferredError: error
})
export const durableDeferredTokenType = (): TypeDescriptor => nominalType('effect/unstable/workflow/DurableDeferred.Token')
export const durableQueueType = (payload = 'unknown', success = 'unknown', error = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/workflow/DurableQueue', {
	queuePayload: payload,
	queueSuccess: success,
	queueError: error
})
export const workflowResultType = (success = 'unknown', error = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/workflow/Workflow.Result', {
	workflowResultSuccess: success,
	workflowResultError: error
})
export const workflowEngineType = (): TypeDescriptor => nominalType('effect/unstable/workflow/WorkflowEngine')
export const rpcGroupType = (): TypeDescriptor => nominalType('effect/unstable/rpc/RpcGroup')
export const cronType = (): TypeDescriptor => nominalType('effect/Cron')

export const workflowInput = (description: string, tag = 'string', payload = 'unknown', success = 'unknown', error = 'unknown') =>
	typedExpressionInput(description, workflowType(tag, payload, success, error))
export const activityInput = (description: string, success = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, activityType(success, error, requirements))
export const durableDeferredInput = (description: string, success = 'unknown', error = 'unknown') =>
	typedExpressionInput(description, durableDeferredType(success, error))
export const durableQueueInput = (description: string, payload = 'unknown', success = 'unknown', error = 'unknown') =>
	typedExpressionInput(description, durableQueueType(payload, success, error))
