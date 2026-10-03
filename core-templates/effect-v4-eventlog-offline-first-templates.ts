import { defineTemplate } from './sample-definition.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	statementCollectionInput,
	streamType,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	eventJournalErrorType,
	eventLogAuthenticationRequirement,
	eventJournalRequirement,
	eventLogIdentityRequirement,
	eventLogRegistryRequirement,
	eventLogRemoteErrorType,
	eventLogRemoteRequirement,
	eventLogRequirement,
	eventLogSchemaInput,
	keyValueStoreRequirement,
	keyValueStoreType,
	persistedQueueErrorType,
	persistedQueueFactoryRequirement,
	persistedQueueInput,
	persistedQueueStoreRequirement,
	persistedQueueType,
	platformErrorType,
	redisRequirement,
	reactivityRequirement,
	rpcClientProtocolRequirement,
	scopeRequirement,
	sqlClientRequirement,
	sqlErrorType
} from './effect-eventlog-persistence-template-helpers.js'

/** Production EventLog + persistence / offline-first compositions. */
const VERSION = '1.0.0' as const
const layerInput = (description: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, layerType(provided, error, requirements))
const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

export const OfflineFirstInMemoryEventLogLayerTemplate = defineTemplate({
	modelId: 'OfflineFirstInMemoryEventLogLayer', version: VERSION,
	description: 'Builds a complete process-local EventLog for tests/local development using the volatile in-memory journal.',
	typeParameters: typeParameters(['E','Handler Layer error type.'],['R','Remaining handler requirements.'],['I','Identity Layer error type.'],['RI','Identity Layer requirements.']),
	inputs: {
		schema: eventLogSchemaInput('EventLog schema.'),
		handlers: layerInput('EventLog handler/registration Layer.','unknown','{{E}}','{{R}}'),
		identity: layerInput('Layer providing EventLog.Identity.',eventLogIdentityRequirement,'{{I}}','{{RI}}')
	},
	output: expressionOutput('Local in-memory EventLog Layer.', layerType(`${eventLogRequirement} | ${eventLogRegistryRequirement}`, '{{E}} | {{I}}', '{{R}} | {{RI}}')),
	source: `EventLog.layer(${marker('expression','schema','EventLog.schema(EventGroup.empty)')}, ${marker('expression','handlers','Layer.empty')}).pipe(Layer.provide(Layer.merge(EventJournal.layerMemory, ${marker('expression','identity','Layer.empty')})))`
})

export const OfflineFirstIndexedDbEventLogLayerTemplate = defineTemplate({
	modelId: 'OfflineFirstIndexedDbEventLogLayer', version: VERSION,
	description: 'Builds a browser-local durable EventLog backed by IndexedDB.',
	typeParameters: typeParameters(['E','Handler Layer error type.'],['R','Remaining handler requirements.'],['I','Identity Layer error type.'],['RI','Identity Layer requirements.']),
	inputs: {
		schema: eventLogSchemaInput('EventLog schema.'),
		handlers: layerInput('EventLog handler/registration Layer.','unknown','{{E}}','{{R}}'),
		identity: layerInput('Layer providing EventLog.Identity.',eventLogIdentityRequirement,'{{I}}','{{RI}}'),
		database: effectValueInput('Optional IndexedDB database name.', { ts: 'string | undefined' })
	},
	output: expressionOutput('IndexedDB-backed EventLog Layer.', layerType(`${eventLogRequirement} | ${eventLogRegistryRequirement}`, `{{E}} | {{I}} | ${eventJournalErrorType}`, '{{R}} | {{RI}}')),
	source: `EventLog.layer(${marker('expression','schema','EventLog.schema(EventGroup.empty)')}, ${marker('expression','handlers','Layer.empty')}).pipe(Layer.provide(Layer.merge(EventJournal.layerIndexedDb({ database: ${marker('expression','database','undefined')} }), ${marker('expression','identity','Layer.empty')})))`
})

export const OfflineFirstEncryptedReplicaLayerTemplate = defineTemplate({
	modelId: 'OfflineFirstEncryptedReplicaLayer', version: VERSION,
	description: 'Adds encrypted authenticated remote replication to an EventLog runtime using the same Registry instance.',
	typeParameters: typeParameters(['E','Local EventLog Layer error type.'],['R','Local EventLog Layer requirements.']),
	inputs: { local: layerInput('Local EventLog Layer providing EventLog and Registry.',`${eventLogRequirement} | ${eventLogRegistryRequirement}`,'{{E}}','{{R}}') },
	output: expressionOutput('Encrypted replicated EventLog Layer.', layerType(`${eventLogRequirement} | ${eventLogRegistryRequirement} | ${eventLogRemoteRequirement}`, `{{E}} | ${eventLogRemoteErrorType}`, `{{R}} | ${rpcClientProtocolRequirement}`)),
	source: `Layer.provideMerge(EventLogRemote.layerEncrypted, ${marker('expression','local','Layer.empty')})`
})

export const OfflineFirstTrustedReplicaLayerTemplate = defineTemplate({
	modelId: 'OfflineFirstTrustedReplicaLayer', version: VERSION,
	description: 'Adds unencrypted EventLog replication for explicitly trusted transports or tests.',
	typeParameters: typeParameters(['E','Local EventLog Layer error type.'],['R','Local EventLog Layer requirements.']),
	inputs: { local: layerInput('Local EventLog Layer providing EventLog and Registry.',`${eventLogRequirement} | ${eventLogRegistryRequirement}`,'{{E}}','{{R}}') },
	output: expressionOutput('Trusted plaintext replicated EventLog Layer.', layerType(`${eventLogRequirement} | ${eventLogRegistryRequirement} | ${eventLogRemoteRequirement}`, `{{E}} | ${eventLogRemoteErrorType}`, `{{R}} | ${rpcClientProtocolRequirement}`)),
	source: `Layer.provideMerge(EventLogRemote.layerUnencrypted, ${marker('expression','local','Layer.empty')})`
})

export const EventLogCompactedReactiveGroupLayerTemplate = defineTemplate({
	modelId: 'EventLogCompactedReactiveGroupLayer', version: VERSION,
	description: 'Combines an EventGroup handler Layer with remote-replay compaction and reactive invalidation registration.',
	typeParameters: typeParameters(['E','Handler error type.'],['R','Handler/compaction requirements.']),
	inputs: {
		handlers: layerInput('EventGroup handler Layer.','unknown','{{E}}','{{R}}'),
		compaction: layerInput('EventGroup compaction registration Layer.','never','never',`${eventLogRegistryRequirement} | {{R}}`),
		reactivity: layerInput('EventGroup reactivity registration Layer.','never','never',eventLogRegistryRequirement)
	},
	output: expressionOutput('Combined handler/compaction/reactivity Layer.', layerType('unknown','{{E}}',`${eventLogRegistryRequirement} | {{R}}`)),
	source: `Layer.mergeAll(${marker('expression','handlers','Layer.empty')}, ${marker('expression','compaction','Layer.empty')}, ${marker('expression','reactivity','Layer.empty')})`
})

export const EventLogObservedWriteTemplate = defineTemplate({
	modelId: 'EventLogObservedWrite', version: VERSION,
	description: 'Runs an EventLog write inside a tracing span with stable event annotations.',
	typeParameters: typeParameters(['A','Write success type.'],['E','Write error type.']),
	inputs: {
		write: effectSourceInput('Typed EventLog write Effect.', effectType('{{A}}','{{E}}',eventLogRequirement)),
		event: effectValueInput('Event tag annotation.', { ts: 'string' }),
		span: effectValueInput('Span name.', { ts: 'string' })
	},
	output: expressionOutput('Observed EventLog write Effect.', effectType('{{A}}','{{E}}',eventLogRequirement)),
	source: `Effect.withSpan(Effect.annotateLogs(${marker('expression','write','Effect.void')}, { event: ${marker('expression','event','"Event"')} }), ${marker('expression','span','"eventlog.write"')})`
})

export const OfflineFirstReactiveQueryStreamTemplate = defineTemplate({
	modelId: 'OfflineFirstReactiveQueryStream', version: VERSION,
	description: 'Turns a local read-model query into a Stream that reruns after matching EventLog/Reactivity invalidations.',
	typeParameters: typeParameters(['A','Query success type.'],['E','Query error type.'],['R','Query requirements.']),
	inputs: { query: effectSourceInput('Read-model query Effect.', effectType('{{A}}','{{E}}','{{R}}')), keys: effectValueInput('Reactive invalidation keys.', { ts: 'ReadonlyArray<unknown> | Readonly<Record<string, ReadonlyArray<unknown>>>' }) },
	output: expressionOutput('Reactive offline-first query Stream.', streamType('{{A}}','{{E}}',`{{R}} | ${reactivityRequirement}`)),
	source: `Reactivity.stream(${marker('expression','query','Effect.void')}, ${marker('expression','keys','["items"]')})`
})

export const EventLogRemoteRpcServerLayerTemplate = defineTemplate({
	modelId: 'EventLogRemoteRpcServerLayer', version: VERSION,
	description: 'Combines EventLog authentication middleware and remote synchronization RPC handlers into one server-side Layer.',
	inputs: { options: valueInput('EventLogServer remoteId, storage callbacks, authorization, and write hook.') },
	output: expressionOutput('EventLog remote RPC server handler Layer.', layerType(`${eventLogAuthenticationRequirement} | unknown`,'never','never')),
	source: `Layer.merge(EventLogServer.layerAuthMiddleware, EventLogServer.layerRpcHandlers(${marker('expression','options','{ remoteId, changes, getOrCreateSessionAuthBinding, onWrite }')}))`
})

export const PersistedQueueWorkerLayerTemplate = defineTemplate({
	modelId: 'PersistedQueueWorkerLayer', version: VERSION,
	description: 'Runs a persisted-queue consumer as a scoped background worker; queue take semantics provide retry and at-least-once delivery.',
	typeParameters: typeParameters(['A','Queue value type.'],['E','Handler error type.'],['RQ','Queue schema services.'],['R','Handler requirements.']),
	inputs: { queue: persistedQueueInput('Persisted queue.','{{A}}','{{RQ}}'), handler: callbackInput('Idempotent job handler.', effectReturningCallbackType('value: {{A}}, metadata: { readonly id: string; readonly attempts: number }','unknown','{{E}}','{{R}}')) },
	output: expressionOutput('Scoped persisted-queue worker Layer.', layerType('never','never','{{RQ}} | {{R}}')),
	source: `Layer.effectDiscard(Effect.forkScoped(Effect.forever(Effect.ignore(${marker('expression','queue','queue')}.take(${marker('expression','handler','(value, metadata) => Effect.void')})))))`
})

export const PersistedQueueObservedWorkerLayerTemplate = defineTemplate({
	modelId: 'PersistedQueueObservedWorkerLayer', version: VERSION,
	description: 'Runs an idempotent persisted-queue worker with per-delivery tracing and id/attempt log annotations.',
	typeParameters: typeParameters(['A','Queue value type.'],['E','Handler error type.'],['RQ','Queue schema services.'],['R','Handler requirements.']),
	inputs: { queue: persistedQueueInput('Persisted queue.','{{A}}','{{RQ}}'), handler: callbackInput('Idempotent job handler.', effectReturningCallbackType('value: {{A}}, metadata: { readonly id: string; readonly attempts: number }','unknown','{{E}}','{{R}}')), span: effectValueInput('Worker span name.', { ts: 'string' }) },
	output: expressionOutput('Observed persisted-queue worker Layer.', layerType('never','never','{{RQ}} | {{R}}')),
	source: `Layer.effectDiscard(Effect.forkScoped(Effect.forever(Effect.ignore(${marker('expression','queue','queue')}.take((value, metadata) => Effect.withSpan(Effect.annotateLogs((${marker('expression','handler','(value, metadata) => Effect.void')})(value, metadata), { queueId: metadata.id, attempts: metadata.attempts }), ${marker('expression','span','"persisted-queue.take"')}))))))`
})

export const PersistedQueueIdempotentOperationTemplate = defineTemplate({
	modelId: 'PersistedQueueIdempotentOperation', version: VERSION,
	description: 'Adapts a queue delivery into an operation that receives the stable queue item id as its external idempotency key.',
	typeParameters: typeParameters(['A','Queue value type.'],['B','Operation success type.'],['E','Operation error type.'],['R','Operation requirements.']),
	inputs: { value: valueInput('Queue delivery value.', { ts: '{{A}}' }), metadata: valueInput('Queue delivery metadata.', { ts: '{ readonly id: string; readonly attempts: number }' }), operation: callbackInput('Operation accepting a stable idempotency key.', effectReturningCallbackType('value: {{A}}, idempotencyKey: string','{{B}}','{{E}}','{{R}}')) },
	output: expressionOutput('Idempotent delivery operation.', effectType('{{B}}','{{E}}','{{R}}')),
	source: `(${marker('expression','operation','(value, idempotencyKey) => Effect.succeed(value)')})(${marker('expression','value','undefined')}, ${marker('expression','metadata','{ id: "id", attempts: 1 }')}.id)`
})

export const SqlPersistedQueueInfrastructureLayerTemplate = defineTemplate({
	modelId: 'SqlPersistedQueueInfrastructureLayer', version: VERSION,
	description: 'Builds a durable SQL persisted-queue factory and optional cleanup worker over one shared queue store.',
	inputs: { storeOptions: valueInput('SQL store options.'), cleanupOptions: valueInput('Cleanup retention/interval options.') },
	output: expressionOutput('SQL persisted-queue infrastructure Layer.', layerType(persistedQueueFactoryRequirement,sqlErrorType,sqlClientRequirement)),
	source: `Layer.provide(Layer.merge(PersistedQueue.layer, PersistedQueue.layerCleanup(${marker('expression','cleanupOptions','{}')})), PersistedQueue.layerStoreSql(${marker('expression','storeOptions','{}')}))`
})

export const RedisPersistedQueueInfrastructureLayerTemplate = defineTemplate({
	modelId: 'RedisPersistedQueueInfrastructureLayer', version: VERSION,
	description: 'Builds a durable Redis persisted-queue factory and cleanup worker over one shared queue store.',
	inputs: { storeOptions: valueInput('Redis store options.'), cleanupOptions: valueInput('Cleanup retention/interval options.') },
	output: expressionOutput('Redis persisted-queue infrastructure Layer.', layerType(persistedQueueFactoryRequirement,'never',redisRequirement)),
	source: `Layer.provide(Layer.merge(PersistedQueue.layer, PersistedQueue.layerCleanup(${marker('expression','cleanupOptions','{}')})), PersistedQueue.layerStoreRedis(${marker('expression','storeOptions','{}')}))`
})

export const PrefixedKeyValueServiceLayerTemplate = defineTemplate({
	modelId: 'PrefixedKeyValueServiceLayer', version: VERSION,
	description: 'Provides an application service containing a namespaced view of the active KeyValueStore.',
	typeParameters: typeParameters(['I','Application service identifier type.']),
	inputs: { service: serviceKeyInput('Context.Service key for the namespaced KeyValueStore.','{{I}}',keyValueStoreType().ts), prefix: effectValueInput('Application key prefix.', { ts: 'string' }) },
	output: expressionOutput('Namespaced KeyValueStore service Layer.', layerType('{{I}}','never',keyValueStoreRequirement)),
	source: `Layer.effect(${marker('expression','service','AppStore')}, Effect.map(KeyValueStore.KeyValueStore, store => KeyValueStore.prefix(store, ${marker('expression','prefix','"app:"')})))`
})

export const OfflineFirstPersistenceApplicationLayerTemplate = defineTemplate({
	modelId: 'OfflineFirstPersistenceApplicationLayer', version: VERSION,
	description: 'Combines an offline-first EventLog runtime with persistence services and background workers as one application Layer.',
	typeParameters: typeParameters(['PE','EventLog outputs.'],['EE','EventLog errors.'],['RE','EventLog requirements.'],['PP','Persistence outputs.'],['EP','Persistence errors.'],['RP','Persistence requirements.'],['PW','Worker outputs.'],['EW','Worker errors.'],['RW','Worker requirements.']),
	inputs: { eventLog: layerInput('Offline-first EventLog Layer.','{{PE}}','{{EE}}','{{RE}}'), persistence: layerInput('Key-value / queue persistence Layer.','{{PP}}','{{EP}}','{{RP}}'), workers: layerInput('Background persistence workers.','{{PW}}','{{EW}}','{{RW}}') },
	output: expressionOutput('Offline-first persistence application Layer.', layerType('{{PE}} | {{PP}} | {{PW}}','{{EE}} | {{EP}} | {{EW}}','{{RE}} | {{RP}} | {{RW}}')),
	source: `Layer.mergeAll(${marker('expression','eventLog','Layer.empty')}, ${marker('expression','persistence','Layer.empty')}, ${marker('expression','workers','Layer.empty')})`
})

export const OfflineFirstBrowserSourceFileTemplate = defineTemplate({
	modelId: 'OfflineFirstBrowserSourceFile', version: VERSION,
	description: 'Builds a browser offline-first source file with EventLog, IndexedDB journal, reactivity, persistence, RPC, and Stream primitives in scope.',
	inputs: { body: statementCollectionInput('Top-level contracts, Layers, services, and runtime integration.') },
	output: { kind: 'sourceFile', description: 'Complete browser offline-first Effect source file.' },
	source: `import { Context, Effect, Layer, Schedule, Schema, Stream } from "effect"
import { Event, EventGroup, EventJournal, EventLog, EventLogRemote } from "effect/unstable/eventlog"
import { KeyValueStore, PersistedQueue } from "effect/unstable/persistence"
import { Reactivity } from "effect/unstable/reactivity"

${marker('statement','body','export const AppLayer = Layer.empty')}`
})

export const EventLogPersistenceServerSourceFileTemplate = defineTemplate({
	modelId: 'EventLogPersistenceServerSourceFile', version: VERSION,
	description: 'Builds a server-side EventLog replication and durable-persistence source file.',
	inputs: { body: statementCollectionInput('Top-level server contracts, storage callbacks, queue infrastructure, and runtime assembly.') },
	output: { kind: 'sourceFile', description: 'Complete EventLog/persistence server source file.' },
	source: `import { Context, Effect, Layer, Schedule, Schema, Stream } from "effect"
import { EventLogServer } from "effect/unstable/eventlog"
import { KeyValueStore, PersistedQueue } from "effect/unstable/persistence"
import { RpcServer } from "effect/unstable/rpc"

${marker('statement','body','export const ServerLayer = Layer.empty')}`
})

export const effectV4EventLogOfflineFirstCompositionGraphTemplateInputs = [
	OfflineFirstInMemoryEventLogLayerTemplate,
	OfflineFirstIndexedDbEventLogLayerTemplate,
	OfflineFirstEncryptedReplicaLayerTemplate,
	OfflineFirstTrustedReplicaLayerTemplate,
	EventLogCompactedReactiveGroupLayerTemplate,
	EventLogObservedWriteTemplate,
	OfflineFirstReactiveQueryStreamTemplate,
	EventLogRemoteRpcServerLayerTemplate,
	PersistedQueueWorkerLayerTemplate,
	PersistedQueueObservedWorkerLayerTemplate,
	PersistedQueueIdempotentOperationTemplate,
	SqlPersistedQueueInfrastructureLayerTemplate,
	RedisPersistedQueueInfrastructureLayerTemplate,
	PrefixedKeyValueServiceLayerTemplate,
	OfflineFirstPersistenceApplicationLayerTemplate,
	OfflineFirstBrowserSourceFileTemplate,
	EventLogPersistenceServerSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
