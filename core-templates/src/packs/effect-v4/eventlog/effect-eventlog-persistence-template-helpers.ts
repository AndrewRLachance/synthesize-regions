import type { TypeDescriptor } from 'synthesize-regions'
import { nominalType, typedExpressionInput } from '../../../authoring/effect-v4/effect-template-helpers.js'

export const eventLogRequirement = '{ readonly __eventLogRequirement: "EventLog" }'
export const eventLogRegistryRequirement = '{ readonly __eventLogRegistryRequirement: "EventLog.Registry" }'
export const eventLogIdentityRequirement = '{ readonly __eventLogIdentityRequirement: "EventLog.Identity" }'
export const eventLogEncryptionRequirement = '{ readonly __eventLogEncryptionRequirement: "EventLogEncryption" }'
export const eventJournalRequirement = '{ readonly __eventJournalRequirement: "EventJournal" }'
export const eventLogRemoteRequirement = '{ readonly __eventLogRemoteRequirement: "EventLogRemote" }'
export const eventLogAuthenticationRequirement = '{ readonly __eventLogAuthenticationRequirement: "EventLogAuthentication" }'
export const rpcClientProtocolRequirement = '{ readonly __rpcClientProtocolRequirement: "RpcClient.Protocol" }'
export const reactivityRequirement = '{ readonly __reactivityRequirement: "Reactivity" }'
export const persistedQueueFactoryRequirement = '{ readonly __persistedQueueFactoryRequirement: "PersistedQueueFactory" }'
export const persistedQueueStoreRequirement = '{ readonly __persistedQueueStoreRequirement: "PersistedQueueStore" }'
export const keyValueStoreRequirement = '{ readonly __keyValueStoreRequirement: "KeyValueStore" }'
export const redisRequirement = '{ readonly __redisRequirement: "Redis" }'
export const sqlClientRequirement = '{ readonly __sqlClientRequirement: "SqlClient" }'
export const fileSystemRequirement = '{ readonly __fileSystemRequirement: "FileSystem" }'
export const pathRequirement = '{ readonly __pathRequirement: "Path" }'
export const scopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'

export const eventJournalErrorType = '{ readonly _tag: "EventJournalError"; readonly method: string; readonly cause: unknown }'
export const eventLogRemoteErrorType = '{ readonly _tag: "EventLogRemoteError"; readonly method: string; readonly cause: unknown }'
export const persistedQueueErrorType = '{ readonly _tag: "PersistedQueueError"; readonly method?: string; readonly cause?: unknown }'
export const keyValueStoreErrorType = '{ readonly _tag: "KeyValueStoreError"; readonly method: string; readonly cause: unknown }'
export const sqlErrorType = '{ readonly _tag: "SqlError"; readonly cause?: unknown }'
export const platformErrorType = '{ readonly _tag: string; readonly cause?: unknown }'

export const eventType = (tag = 'string', payload = 'unknown', success = 'unknown', error = 'never'): TypeDescriptor =>
	nominalType('effect/unstable/eventlog/Event.Event', { eventTag: tag, eventPayload: payload, eventSuccess: success, eventError: error })
export const eventGroupType = (events = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/eventlog/EventGroup.EventGroup', { eventGroupEvents: events })
export const eventLogSchemaType = (groups = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/eventlog/EventLog.EventLogSchema', { eventLogGroups: groups })
export const eventLogEntryType = (): TypeDescriptor => nominalType('effect/eventlog/EventJournal.Entry')
export const eventLogIdentityType = (): TypeDescriptor => nominalType('effect/unstable/eventlog/EventLog.Identity')
export const eventLogRemoteType = (): TypeDescriptor => nominalType('effect/eventlog/EventLogRemote.EventLogRemote.Service')
export const eventJournalType = (): TypeDescriptor => nominalType('effect/eventlog/EventJournal.EventJournal.Service')
export const eventLogRemoteIdType = (): TypeDescriptor => nominalType('effect/eventlog/EventJournal.RemoteId')
export const eventLogStoreIdType = (): TypeDescriptor => nominalType('effect/eventlog/EventLogMessage.StoreId')
export const keyValueStoreType = (): TypeDescriptor => nominalType('effect/unstable/persistence/KeyValueStore.KeyValueStore')
export const persistedQueueType = (value = 'unknown', services = 'never'): TypeDescriptor =>
	nominalType('effect/unstable/persistence/PersistedQueue.PersistedQueue', { persistedQueueValue: value, persistedQueueServices: services })
export const reactivityDequeueType = (value = 'unknown', error = 'unknown'): TypeDescriptor =>
	nominalType('effect/Queue.Dequeue', { dequeueValue: value, dequeueError: error })

export const eventInput = (description: string, tag = 'string', payload = 'unknown', success = 'unknown', error = 'never') =>
	typedExpressionInput(description, eventType(tag, payload, success, error))
export const eventGroupInput = (description: string, events = 'unknown') =>
	typedExpressionInput(description, eventGroupType(events))
export const eventLogSchemaInput = (description: string, groups = 'unknown') =>
	typedExpressionInput(description, eventLogSchemaType(groups))
export const identityInput = (description: string) => typedExpressionInput(description, eventLogIdentityType())
export const keyValueStoreInput = (description: string) => typedExpressionInput(description, keyValueStoreType())
export const persistedQueueInput = (description: string, value = 'unknown', services = 'never') =>
	typedExpressionInput(description, persistedQueueType(value, services))
