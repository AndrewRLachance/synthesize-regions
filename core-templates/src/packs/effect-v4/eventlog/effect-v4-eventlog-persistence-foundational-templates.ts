import { fragmentCollectionPort } from 'synthesize-regions'
import { defineTemplate } from '../../../authoring/define-template.js'
import {
	effectSourceInput,
	effectType,
	effectValueInput
} from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	queueType,
	scheduleType,
	schemaType,
	streamType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import {
	eventGroupInput,
	eventGroupType,
	eventInput,
	eventJournalErrorType,
	eventJournalRequirement,
	eventLogAuthenticationRequirement,
	eventLogEncryptionRequirement,
	eventLogEntryType,
	eventLogIdentityRequirement,
	eventLogIdentityType,
	eventLogRegistryRequirement,
	eventLogRemoteErrorType,
	eventLogRemoteRequirement,
	eventLogRequirement,
	eventLogSchemaInput,
	eventLogSchemaType,
	eventType,
	fileSystemRequirement,
	keyValueStoreErrorType,
	keyValueStoreInput,
	keyValueStoreRequirement,
	keyValueStoreType,
	pathRequirement,
	persistedQueueErrorType,
	persistedQueueFactoryRequirement,
	persistedQueueInput,
	persistedQueueStoreRequirement,
	persistedQueueType,
	platformErrorType,
	reactivityDequeueType,
	reactivityRequirement,
	redisRequirement,
	rpcClientProtocolRequirement,
	scopeRequirement,
	sqlClientRequirement,
	sqlErrorType
} from './effect-eventlog-persistence-template-helpers.js'

/** Effect v4 EventLog + persistence foundations. */
const VERSION = '1.0.0' as const
const schemaError = '{ readonly _tag: "SchemaError"; readonly issue: unknown }'
const reactivityKeysType = 'ReadonlyArray<unknown> | Readonly<Record<string, ReadonlyArray<unknown>>>'

const schemaInput = (description: string, decoded = 'unknown', encoded = 'unknown', decoding = 'never', encoding = decoding) =>
	typedExpressionInput(description, schemaType(decoded, encoded, decoding, encoding))
const layerInput = (description: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, layerType(provided, error, requirements))
const scheduleInput = (description: string) => typedExpressionInput(description, scheduleType('unknown', 'number', 'never'))

export const EventLogEventMakeTemplate = defineTemplate({
	modelId: 'EventLogEventMake', version: VERSION,
	description: 'Defines a typed durable event contract with primary-key derivation and payload/success/error Schemas.',
	typeParameters: typeParameters(['P','Decoded payload type.'],['PI','Encoded payload type.'],['A','Success type.'],['E','Error type.'],['RPD','Payload decode services.'],['RPE','Payload encode services.'],['RAD','Success decode services.'],['RAE','Success encode services.'],['RED','Error decode services.'],['REE','Error encode services.']),
	inputs: {
		tag: effectValueInput('Stable event tag.', { ts: 'string' }),
		primaryKey: callbackInput('Aggregate/entity primary-key function.', { ts: '(payload: {{P}}) => string' }),
		payload: schemaInput('Event payload Schema.', '{{P}}','{{PI}}','{{RPD}}','{{RPE}}'),
		success: schemaInput('Handler success Schema.', '{{A}}','unknown','{{RAD}}','{{RAE}}'),
		error: schemaInput('Handler error Schema.', '{{E}}','unknown','{{RED}}','{{REE}}')
	},
	output: expressionOutput('Typed EventLog event definition.', eventType('string','{{P}}','{{A}}','{{E}}')),
	source: `Event.make({ tag: ${marker('expression','tag','"TodoCreated"')}, primaryKey: ${marker('expression','primaryKey','payload => String(payload.id)')}, payload: ${marker('expression','payload','Schema.Unknown')}, success: ${marker('expression','success','Schema.Void')}, error: ${marker('expression','error','Schema.Never')} })`
})

export const EventLogEventAddErrorTemplate = defineTemplate({
	modelId: 'EventLogEventAddError', version: VERSION,
	description: 'Adds another typed error Schema to an Event definition.',
	inputs: { event: eventInput('Event definition.'), error: schemaInput('Additional error Schema.') },
	output: expressionOutput('Event definition with unioned error Schema.', eventType()),
	source: `Event.addError(${marker('expression','event','Event.make({ tag: "E", primaryKey: () => "id" })')}, ${marker('expression','error','Schema.Unknown')})`
})

export const EventLogGroupEmptyTemplate = defineTemplate({
	modelId: 'EventLogGroupEmpty', version: VERSION, description: 'Creates the empty starting EventGroup.',
	inputs: {}, output: expressionOutput('Empty EventGroup.', eventGroupType('never')), source: 'EventGroup.empty'
})

export const EventLogGroupAddTemplate = defineTemplate({
	modelId: 'EventLogGroupAdd', version: VERSION,
	description: 'Adds a typed Event definition to an EventGroup.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.']),
	inputs: {
		group: eventGroupInput('Existing EventGroup.'),
		tag: effectValueInput('Stable event tag.', { ts: 'string' }),
		primaryKey: callbackInput('Primary-key derivation.', { ts: '(payload: {{P}}) => string' }),
		payload: schemaInput('Payload Schema.', '{{P}}'),
		success: schemaInput('Success Schema.', '{{A}}'),
		error: schemaInput('Error Schema.', '{{E}}')
	},
	output: expressionOutput('Extended EventGroup.', eventGroupType()),
	source: `${marker('expression','group','EventGroup.empty')}.add({ tag: ${marker('expression','tag','"TodoCreated"')}, primaryKey: ${marker('expression','primaryKey','payload => String(payload.id)')}, payload: ${marker('expression','payload','Schema.Unknown')}, success: ${marker('expression','success','Schema.Void')}, error: ${marker('expression','error','Schema.Never')} })`
})

export const EventLogGroupAddErrorTemplate = defineTemplate({
	modelId: 'EventLogGroupAddError', version: VERSION,
	description: 'Adds one error Schema to every Event in an EventGroup.',
	inputs: { group: eventGroupInput('EventGroup.'), error: schemaInput('Shared error Schema.') },
	output: expressionOutput('EventGroup with shared error.', eventGroupType()),
	source: `${marker('expression','group','EventGroup.empty')}.addError(${marker('expression','error','Schema.Unknown')})`
})

export const EventLogSchemaTemplate = defineTemplate({
	modelId: 'EventLogSchema', version: VERSION,
	description: 'Creates an EventLog schema from one or more EventGroups.',
	inputs: { groups: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: eventGroupType() }, minItems: 1, separator: ', ', description: 'Event groups.' }) },
	output: expressionOutput('EventLog schema.', eventLogSchemaType()),
	source: `EventLog.schema(${marker('expression','groups','EventGroup.empty')})`
})

export const EventLogMakeClientTemplate = defineTemplate({
	modelId: 'EventLogMakeClient', version: VERSION,
	description: 'Creates the typed event-write client function for an EventLog schema.',
	inputs: { schema: eventLogSchemaInput('EventLog schema.') },
	output: expressionOutput('Typed EventLog client acquisition.', effectType('(event: string, payload: unknown) => unknown','never',eventLogRequirement)),
	source: `EventLog.makeClient(${marker('expression','schema','EventLog.schema(EventGroup.empty)')})`
})

export const EventLogWriteTemplate = defineTemplate({
	modelId: 'EventLogWrite', version: VERSION,
	description: 'Writes one typed event through the EventLog service; the journal commit occurs only after its handler succeeds.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Handler success type.'],['E','Handler error type.']),
	inputs: { schema: eventLogSchemaInput('EventLog schema.'), event: effectValueInput('Event tag.', { ts: 'string' }), payload: valueInput('Decoded event payload.', { ts: '{{P}}' }) },
	output: expressionOutput('EventLog write Effect.', effectType('{{A}}',`{{E}} | ${eventJournalErrorType}`,eventLogRequirement)),
	source: `Effect.flatMap(EventLog.EventLog, log => log.write({ schema: ${marker('expression','schema','(EventLog.schema(EventGroup.empty) as any)')}, event: ${marker('expression','event','("Event" as never)')}, payload: ${marker('expression','payload','(undefined as never)')} }))`
})

export const EventLogEntriesTemplate = defineTemplate({
	modelId: 'EventLogEntries', version: VERSION, description: 'Reads all committed local EventLog entries.',
	inputs: {}, output: expressionOutput('Committed journal entries.', effectType(`ReadonlyArray<${eventLogEntryType().ts}>`,eventJournalErrorType,eventLogRequirement)),
	source: 'Effect.flatMap(EventLog.EventLog, log => log.entries)'
})

export const EventLogDestroyTemplate = defineTemplate({
	modelId: 'EventLogDestroy', version: VERSION, description: 'Destroys all data owned by the active EventLog journal.',
	inputs: {}, output: expressionOutput('EventLog destroy Effect.', effectType('void',eventJournalErrorType,eventLogRequirement)),
	source: 'Effect.flatMap(EventLog.EventLog, log => log.destroy)'
})

export const EventLogHandlersLayerTemplate = defineTemplate({
	modelId: 'EventLogHandlersLayer', version: VERSION,
	description: 'Registers implementations for every Event in an EventGroup.',
	typeParameters: typeParameters(['E','Handler-construction error type.'],['R','Handler requirements.']),
	inputs: { group: eventGroupInput('EventGroup to implement.'), handlers: callbackInput('Function completing the EventLog Handlers builder.', { ts: '(handlers: unknown) => unknown' }) },
	output: expressionOutput('Event-group handler Layer.', layerType('unknown','{{E}}',`${eventLogRegistryRequirement} | {{R}}`)),
	source: `EventLog.group(${marker('expression','group','EventGroup.empty')}, ${marker('expression','handlers','handlers => handlers')})`
})

export const EventLogGroupReactivityTemplate = defineTemplate({
	modelId: 'EventLogGroupReactivity', version: VERSION,
	description: 'Registers reactivity keys invalidated when EventGroup events are written or replayed.',
	inputs: { group: eventGroupInput('EventGroup.'), keys: effectValueInput('Shared keys or tag-to-keys mapping.', { ts: 'ReadonlyArray<string> | Readonly<Record<string, ReadonlyArray<string>>>' }) },
	output: expressionOutput('EventLog reactivity-registration Layer.', layerType('never','never',eventLogRegistryRequirement)),
	source: `EventLog.groupReactivity(${marker('expression','group','EventGroup.empty')}, ${marker('expression','keys','["todos"]')})`
})

export const EventLogGroupCompactionTemplate = defineTemplate({
	modelId: 'EventLogGroupCompaction', version: VERSION,
	description: 'Registers EventGroup compaction used while replaying remote entries.',
	typeParameters: typeParameters(['R','Compaction requirements.']),
	inputs: { group: eventGroupInput('EventGroup compacted by primary key.'), compact: callbackInput('Compaction callback over entries/events/write.', { ts: '(options: unknown) => unknown' }) },
	output: expressionOutput('EventLog compaction Layer.', layerType('never','never',`${eventLogRegistryRequirement} | {{R}} | unknown`)),
	source: `EventLog.groupCompaction(${marker('expression','group','EventGroup.empty')}, ${marker('expression','compact','() => Effect.void')})`
})

export const EventLogLayerRegistryTemplate = defineTemplate({
	modelId: 'EventLogLayerRegistry', version: VERSION, description: 'Provides the in-memory EventLog Registry.',
	inputs: {}, output: expressionOutput('EventLog Registry Layer.', layerType(eventLogRegistryRequirement,'never','never')), source: 'EventLog.layerRegistry'
})

export const EventLogLayerRuntimeTemplate = defineTemplate({
	modelId: 'EventLogLayerRuntime', version: VERSION, description: 'Provides EventLog and Registry from an EventJournal and local Identity.',
	inputs: {}, output: expressionOutput('Core EventLog runtime Layer.', layerType(`${eventLogRequirement} | ${eventLogRegistryRequirement}`,'never',`${eventJournalRequirement} | ${eventLogIdentityRequirement}`)), source: 'EventLog.layerEventLog'
})

export const EventLogApplicationLayerTemplate = defineTemplate({
	modelId: 'EventLogApplicationLayer', version: VERSION,
	description: 'Combines handler Layers with the EventLog runtime for a schema.',
	typeParameters: typeParameters(['E','Handler Layer error type.'],['R','Remaining handler requirements.']),
	inputs: { schema: eventLogSchemaInput('EventLog schema.'), handlers: layerInput('Merged EventLog handler Layer.','unknown','{{E}}','{{R}}') },
	output: expressionOutput('Complete EventLog application Layer.', layerType(`${eventLogRequirement} | ${eventLogRegistryRequirement}`,'{{E}}',`${eventJournalRequirement} | ${eventLogIdentityRequirement} | {{R}}`)),
	source: `EventLog.layer(${marker('expression','schema','EventLog.schema(EventGroup.empty)')}, ${marker('expression','handlers','Layer.empty')})`
})

export const EventLogIdentitySchemaTemplate = defineTemplate({
	modelId: 'EventLogIdentitySchema', version: VERSION, description: 'Returns the Schema used to persist/transport an EventLog identity.',
	inputs: {}, output: expressionOutput('EventLog identity Schema.', schemaType(eventLogIdentityType().ts)), source: 'EventLog.IdentitySchema'
})

export const EventLogMakeIdentityTemplate = defineTemplate({
	modelId: 'EventLogMakeIdentity', version: VERSION, description: 'Generates a fresh EventLog identity using EventLogEncryption.',
	inputs: {}, output: expressionOutput('Generated EventLog identity.', effectType(eventLogIdentityType().ts,'never',eventLogEncryptionRequirement)), source: 'EventLog.makeIdentity'
})

export const EventLogIdentityLayerTemplate = defineTemplate({
	modelId: 'EventLogIdentityLayer', version: VERSION, description: 'Provides a concrete EventLog Identity value as a Layer.',
	inputs: { identity: typedExpressionInput('EventLog identity value.', eventLogIdentityType()) },
	output: expressionOutput('EventLog Identity Layer.', layerType(eventLogIdentityRequirement,'never','never')),
	source: `Layer.succeed(EventLog.Identity, ${marker('expression','identity','EventLog.decodeIdentityString("identity")')})`
})

export const EventLogGeneratedIdentityLayerTemplate = defineTemplate({
	modelId: 'EventLogGeneratedIdentityLayer', version: VERSION, description: 'Generates and provides an EventLog identity when the Layer is built.',
	inputs: {}, output: expressionOutput('Generated EventLog Identity Layer.', layerType(eventLogIdentityRequirement,'never',eventLogEncryptionRequirement)),
	source: 'Layer.effect(EventLog.Identity, EventLog.makeIdentity)'
})

export const EventLogEncodeIdentityStringTemplate = defineTemplate({
	modelId: 'EventLogEncodeIdentityString', version: VERSION, description: 'Encodes an EventLog identity as a base64url string.',
	inputs: { identity: typedExpressionInput('EventLog identity.', eventLogIdentityType()) }, output: expressionOutput('Encoded identity string.', { ts: 'string' }),
	source: `EventLog.encodeIdentityString(${marker('expression','identity','identity')})`
})

export const EventLogDecodeIdentityStringTemplate = defineTemplate({
	modelId: 'EventLogDecodeIdentityString', version: VERSION, description: 'Decodes an EventLog identity string synchronously.',
	inputs: { encoded: effectValueInput('Encoded identity string.', { ts: 'string' }) }, output: expressionOutput('Decoded identity.', eventLogIdentityType()),
	source: `EventLog.decodeIdentityString(${marker('expression','encoded','"encoded"')})`
})

export const EventJournalMemoryLayerTemplate = defineTemplate({
	modelId: 'EventJournalMemoryLayer', version: VERSION, description: 'Provides a process-local volatile EventJournal for tests/local development.',
	inputs: {}, output: expressionOutput('In-memory EventJournal Layer.', layerType(eventJournalRequirement,'never','never')), source: 'EventJournal.layerMemory'
})

export const EventJournalIndexedDbLayerTemplate = defineTemplate({
	modelId: 'EventJournalIndexedDbLayer', version: VERSION, description: 'Provides a browser-local durable IndexedDB EventJournal.',
	inputs: { database: effectValueInput('Optional IndexedDB database name.', { ts: 'string | undefined' }) },
	output: expressionOutput('IndexedDB EventJournal Layer.', layerType(eventJournalRequirement,eventJournalErrorType,'never')),
	source: `EventJournal.layerIndexedDb({ database: ${marker('expression','database','undefined')} })`
})

export const EventJournalEntriesTemplate = defineTemplate({
	modelId: 'EventJournalEntries', version: VERSION, description: 'Reads all entries directly from the active EventJournal.',
	inputs: {}, output: expressionOutput('Journal entries Effect.', effectType(`ReadonlyArray<${eventLogEntryType().ts}>`,eventJournalErrorType,eventJournalRequirement)),
	source: 'Effect.flatMap(EventJournal.EventJournal, journal => journal.entries)'
})

export const EventJournalChangesTemplate = defineTemplate({
	modelId: 'EventJournalChanges', version: VERSION, description: 'Subscribes to locally committed EventJournal changes in the current Scope.',
	inputs: {}, output: expressionOutput('Scoped EventJournal change subscription.', effectType(queueType(eventLogEntryType().ts).ts,'never',`${eventJournalRequirement} | ${scopeRequirement}`)),
	source: 'Effect.flatMap(EventJournal.EventJournal, journal => journal.changes)'
})

export const EventJournalDestroyTemplate = defineTemplate({
	modelId: 'EventJournalDestroy', version: VERSION, description: 'Destroys all storage owned by the active EventJournal.',
	inputs: {}, output: expressionOutput('Journal destroy Effect.', effectType('void',eventJournalErrorType,eventJournalRequirement)),
	source: 'Effect.flatMap(EventJournal.EventJournal, journal => journal.destroy)'
})

export const EventLogRemoteEncryptedLayerTemplate = defineTemplate({
	modelId: 'EventLogRemoteEncryptedLayer', version: VERSION, description: 'Provides encrypted remote EventLog replication for untrusted networks.',
	inputs: {}, output: expressionOutput('Encrypted EventLogRemote Layer.', layerType(eventLogRemoteRequirement,eventLogRemoteErrorType,`${rpcClientProtocolRequirement} | ${eventLogRegistryRequirement}`)), source: 'EventLogRemote.layerEncrypted'
})

export const EventLogRemoteUnencryptedLayerTemplate = defineTemplate({
	modelId: 'EventLogRemoteUnencryptedLayer', version: VERSION, description: 'Provides plaintext remote EventLog replication for trusted transports/tests.',
	inputs: {}, output: expressionOutput('Unencrypted EventLogRemote Layer.', layerType(eventLogRemoteRequirement,eventLogRemoteErrorType,`${rpcClientProtocolRequirement} | ${eventLogRegistryRequirement}`)), source: 'EventLogRemote.layerUnencrypted'
})

export const EventLogRemoteWhenAuthenticatedTemplate = defineTemplate({
	modelId: 'EventLogRemoteWhenAuthenticated', version: VERSION, description: 'Runs an Effect only after the remote replica has authenticated the current EventLog identity.',
	typeParameters: typeParameters(['A','Success type.'],['E','Error type.'],['R','Requirements.']),
	inputs: { source: effectSourceInput('Effect gated on remote authentication.', effectType('{{A}}','{{E}}','{{R}}')) },
	output: expressionOutput('Authentication-gated Effect.', effectType('{{A}}',`{{E}} | ${eventLogRemoteErrorType}`,`${eventLogRemoteRequirement} | ${eventLogIdentityRequirement} | {{R}}`)),
	source: `Effect.flatMap(EventLogRemote.EventLogRemote, remote => remote.whenAuthenticated(${marker('expression','source','Effect.void')}))`
})

export const EventLogServerAuthMiddlewareLayerTemplate = defineTemplate({
	modelId: 'EventLogServerAuthMiddlewareLayer', version: VERSION, description: 'Provides EventLog RPC authentication middleware.',
	inputs: {}, output: expressionOutput('EventLog RPC auth middleware Layer.', layerType(eventLogAuthenticationRequirement,'never','never')), source: 'EventLogServer.layerAuthMiddleware'
})

export const EventLogServerRpcHandlersLayerTemplate = defineTemplate({
	modelId: 'EventLogServerRpcHandlersLayer', version: VERSION, description: 'Creates server RPC handlers for the EventLog remote synchronization protocol.',
	inputs: { options: valueInput('EventLogServer callbacks, remoteId, and optional identity authorization.') },
	output: expressionOutput('EventLog remote RPC handler Layer.', layerType('unknown','never','never')),
	source: `EventLogServer.layerRpcHandlers(${marker('expression','options','{ remoteId, changes, getOrCreateSessionAuthBinding, onWrite }')})`
})

export const ReactivityLayerTemplate = defineTemplate({
	modelId: 'ReactivityLayer', version: VERSION, description: 'Provides the process-local Reactivity service.',
	inputs: {}, output: expressionOutput('Reactivity Layer.', layerType(reactivityRequirement,'never','never')), source: 'Reactivity.layer'
})

export const ReactivityInvalidateTemplate = defineTemplate({
	modelId: 'ReactivityInvalidate', version: VERSION, description: 'Invalidates registered reactive query keys.',
	inputs: { keys: effectValueInput('Keys or keyed invalidation record.', { ts: reactivityKeysType }) },
	output: expressionOutput('Reactivity invalidation Effect.', effectType('void','never',reactivityRequirement)),
	source: `Reactivity.invalidate(${marker('expression','keys','["todos"]')})`
})

export const ReactivityMutationTemplate = defineTemplate({
	modelId: 'ReactivityMutation', version: VERSION, description: 'Invalidates reactivity keys only after a mutation Effect succeeds.',
	typeParameters: typeParameters(['A','Mutation success type.'],['E','Mutation error type.'],['R','Mutation requirements.']),
	inputs: { source: effectSourceInput('Mutation Effect.', effectType('{{A}}','{{E}}','{{R}}')), keys: effectValueInput('Invalidation keys.', { ts: reactivityKeysType }) },
	output: expressionOutput('Reactive mutation Effect.', effectType('{{A}}','{{E}}',`{{R}} | ${reactivityRequirement}`)),
	source: `Reactivity.mutation(${marker('expression','source','Effect.void')}, ${marker('expression','keys','["todos"]')})`
})

export const ReactivityQueryTemplate = defineTemplate({
	modelId: 'ReactivityQuery', version: VERSION, description: 'Registers an Effect query that reruns after matching invalidations and returns a scoped Dequeue.',
	typeParameters: typeParameters(['A','Query success type.'],['E','Query error type.'],['R','Query requirements.']),
	inputs: { source: effectSourceInput('Query Effect.', effectType('{{A}}','{{E}}','{{R}}')), keys: effectValueInput('Query invalidation keys.', { ts: reactivityKeysType }) },
	output: expressionOutput('Scoped reactive result Dequeue.', effectType(reactivityDequeueType('{{A}}','{{E}}').ts,'never',`{{R}} | ${scopeRequirement} | ${reactivityRequirement}`)),
	source: `Reactivity.query(${marker('expression','source','Effect.void')}, ${marker('expression','keys','["todos"]')})`
})

export const ReactivityStreamTemplate = defineTemplate({
	modelId: 'ReactivityStream', version: VERSION, description: 'Creates a Stream that reruns a query whenever matching reactivity keys are invalidated.',
	typeParameters: typeParameters(['A','Query success type.'],['E','Query error type.'],['R','Query requirements.']),
	inputs: { source: effectSourceInput('Query Effect.', effectType('{{A}}','{{E}}','{{R}}')), keys: effectValueInput('Query invalidation keys.', { ts: reactivityKeysType }) },
	output: expressionOutput('Reactive query Stream.', streamType('{{A}}','{{E}}',`{{R}} | ${reactivityRequirement}`)),
	source: `Reactivity.stream(${marker('expression','source','Effect.void')}, ${marker('expression','keys','["todos"]')})`
})

export const ReactivityWithBatchTemplate = defineTemplate({
	modelId: 'ReactivityWithBatch', version: VERSION, description: 'Batches invalidations emitted by an Effect until that Effect exits.',
	typeParameters: typeParameters(['A','Success type.'],['E','Error type.'],['R','Requirements.']),
	inputs: { source: effectSourceInput('Effect whose invalidations are batched.', effectType('{{A}}','{{E}}','{{R}}')) },
	output: expressionOutput('Batched-reactivity Effect.', effectType('{{A}}','{{E}}',`{{R}} | ${reactivityRequirement}`)),
	source: `Effect.flatMap(Reactivity.Reactivity, reactivity => reactivity.withBatch(${marker('expression','source','Effect.void')}))`
})

export const KeyValueStoreMemoryLayerTemplate = defineTemplate({
	modelId: 'KeyValueStoreMemoryLayer', version: VERSION, description: 'Provides a volatile process-local KeyValueStore.', inputs: {},
	output: expressionOutput('In-memory KeyValueStore Layer.', layerType(keyValueStoreRequirement,'never','never')), source: 'KeyValueStore.layerMemory'
})

export const KeyValueStoreFileSystemLayerTemplate = defineTemplate({
	modelId: 'KeyValueStoreFileSystemLayer', version: VERSION, description: 'Provides a file-backed KeyValueStore rooted at a dedicated directory.',
	inputs: { directory: effectValueInput('Dedicated storage directory.', { ts: 'string' }) },
	output: expressionOutput('Filesystem KeyValueStore Layer.', layerType(keyValueStoreRequirement,platformErrorType,`${fileSystemRequirement} | ${pathRequirement}`)),
	source: `KeyValueStore.layerFileSystem(${marker('expression','directory','"./data/kv"')})`
})

export const KeyValueStoreSqlLayerTemplate = defineTemplate({
	modelId: 'KeyValueStoreSqlLayer', version: VERSION, description: 'Provides a SQL-backed KeyValueStore.',
	inputs: { table: effectValueInput('Optional backing table name.', { ts: 'string | undefined' }) },
	output: expressionOutput('SQL KeyValueStore Layer.', layerType(keyValueStoreRequirement,sqlErrorType,sqlClientRequirement)),
	source: `KeyValueStore.layerSql({ table: ${marker('expression','table','undefined')} })`
})

export const KeyValueStorePrefixTemplate = defineTemplate({
	modelId: 'KeyValueStorePrefix', version: VERSION, description: 'Returns a KeyValueStore view that prefixes all entry keys.',
	inputs: { store: keyValueStoreInput('Base KeyValueStore.'), prefix: effectValueInput('Key prefix.', { ts: 'string' }) },
	output: expressionOutput('Prefixed KeyValueStore.', keyValueStoreType()),
	source: `KeyValueStore.prefix(${marker('expression','store','store')}, ${marker('expression','prefix','"app:"')})`
})

export const KeyValueStoreGetTemplate = defineTemplate({
	modelId: 'KeyValueStoreGet', version: VERSION, description: 'Reads a string value from the KeyValueStore.',
	inputs: { key: effectValueInput('Entry key.', { ts: 'string' }) },
	output: expressionOutput('Optional string value.', effectType('string | undefined',keyValueStoreErrorType,keyValueStoreRequirement)),
	source: `Effect.flatMap(KeyValueStore.KeyValueStore, store => store.get(${marker('expression','key','"key"')}))`
})

export const KeyValueStoreSetTemplate = defineTemplate({
	modelId: 'KeyValueStoreSet', version: VERSION, description: 'Writes a string or byte value to the KeyValueStore.',
	inputs: { key: effectValueInput('Entry key.', { ts: 'string' }), value: effectValueInput('Entry value.', { ts: 'string | Uint8Array' }) },
	output: expressionOutput('KeyValueStore write Effect.', effectType('void',keyValueStoreErrorType,keyValueStoreRequirement)),
	source: `Effect.flatMap(KeyValueStore.KeyValueStore, store => store.set(${marker('expression','key','"key"')}, ${marker('expression','value','"value"')}))`
})

export const KeyValueStoreRemoveTemplate = defineTemplate({
	modelId: 'KeyValueStoreRemove', version: VERSION, description: 'Removes one KeyValueStore entry.',
	inputs: { key: effectValueInput('Entry key.', { ts: 'string' }) }, output: expressionOutput('Key removal Effect.', effectType('void',keyValueStoreErrorType,keyValueStoreRequirement)),
	source: `Effect.flatMap(KeyValueStore.KeyValueStore, store => store.remove(${marker('expression','key','"key"')}))`
})

export const KeyValueStoreHasTemplate = defineTemplate({
	modelId: 'KeyValueStoreHas', version: VERSION, description: 'Checks whether a KeyValueStore entry exists.',
	inputs: { key: effectValueInput('Entry key.', { ts: 'string' }) }, output: expressionOutput('Entry-existence Effect.', effectType('boolean',keyValueStoreErrorType,keyValueStoreRequirement)),
	source: `Effect.flatMap(KeyValueStore.KeyValueStore, store => store.has(${marker('expression','key','"key"')}))`
})

export const PersistedQueueFactoryLayerTemplate = defineTemplate({
	modelId: 'PersistedQueueFactoryLayer', version: VERSION, description: 'Provides PersistedQueueFactory from the configured PersistedQueueStore.', inputs: {},
	output: expressionOutput('PersistedQueue factory Layer.', layerType(persistedQueueFactoryRequirement,'never',persistedQueueStoreRequirement)), source: 'PersistedQueue.layer'
})

export const PersistedQueueMemoryStoreLayerTemplate = defineTemplate({
	modelId: 'PersistedQueueMemoryStoreLayer', version: VERSION, description: 'Provides a volatile in-memory PersistedQueueStore for tests/local development.', inputs: {},
	output: expressionOutput('In-memory PersistedQueue store Layer.', layerType(persistedQueueStoreRequirement,'never','never')), source: 'PersistedQueue.layerStoreMemory'
})

export const PersistedQueueRedisStoreLayerTemplate = defineTemplate({
	modelId: 'PersistedQueueRedisStoreLayer', version: VERSION, description: 'Provides a Redis-backed durable PersistedQueueStore.',
	inputs: { options: valueInput('Redis queue-store options such as prefix and lock timing.') },
	output: expressionOutput('Redis PersistedQueue store Layer.', layerType(persistedQueueStoreRequirement,'never',redisRequirement)),
	source: `PersistedQueue.layerStoreRedis(${marker('expression','options','{}')})`
})

export const PersistedQueueSqlStoreLayerTemplate = defineTemplate({
	modelId: 'PersistedQueueSqlStoreLayer', version: VERSION, description: 'Provides a SQL-backed durable PersistedQueueStore.',
	inputs: { options: valueInput('SQL queue-store options such as table and lock timing.') },
	output: expressionOutput('SQL PersistedQueue store Layer.', layerType(persistedQueueStoreRequirement,sqlErrorType,sqlClientRequirement)),
	source: `PersistedQueue.layerStoreSql(${marker('expression','options','{}')})`
})

export const PersistedQueueCleanupLayerTemplate = defineTemplate({
	modelId: 'PersistedQueueCleanupLayer', version: VERSION, description: 'Runs persisted-queue completion/failure retention cleanup on an interval.',
	inputs: { options: valueInput('Cleanup TTL and interval options.') },
	output: expressionOutput('PersistedQueue cleanup Layer.', layerType('never','never',persistedQueueStoreRequirement)),
	source: `PersistedQueue.layerCleanup(${marker('expression','options','{}')})`
})

export const PersistedQueueMakeTemplate = defineTemplate({
	modelId: 'PersistedQueueMake', version: VERSION, description: 'Creates a named schema-encoded persisted queue.',
	typeParameters: typeParameters(['A','Queue value type.'],['I','Encoded value type.'],['RD','Decode services.'],['RE','Encode services.']),
	inputs: { name: effectValueInput('Stable queue name.', { ts: 'string' }), schema: schemaInput('Queue value Schema.','{{A}}','{{I}}','{{RD}}','{{RE}}'), maxAttempts: effectValueInput('Maximum processing attempts.', { ts: 'number | undefined' }), retrySchedule: scheduleInput('Retry schedule driven by persisted attempt number.') },
	output: expressionOutput('PersistedQueue acquisition.', effectType(persistedQueueType('{{A}}','{{RD}} | {{RE}}').ts,'never',persistedQueueFactoryRequirement)),
	source: `PersistedQueue.make({ name: ${marker('expression','name','"jobs"')}, schema: ${marker('expression','schema','Schema.Unknown')}, maxAttempts: ${marker('expression','maxAttempts','10')}, retrySchedule: ${marker('expression','retrySchedule','Schedule.exponential("1 second")')} })`
})

export const PersistedQueueOfferTemplate = defineTemplate({
	modelId: 'PersistedQueueOffer', version: VERSION, description: 'Offers a value to a persisted queue with an optional stable de-duplication id.',
	typeParameters: typeParameters(['A','Queue value type.'],['R','Schema services.']),
	inputs: { queue: persistedQueueInput('Persisted queue.','{{A}}','{{R}}'), value: valueInput('Queue value.', { ts: '{{A}}' }), id: effectValueInput('Optional stable de-duplication id.', { ts: 'string | undefined' }) },
	output: expressionOutput('Persisted queue item id.', effectType('string',`${persistedQueueErrorType} | ${schemaError}`,'{{R}}')),
	source: `${marker('expression','queue','queue')}.offer(${marker('expression','value','undefined')}, { id: ${marker('expression','id','undefined')} })`
})

export const PersistedQueueTakeTemplate = defineTemplate({
	modelId: 'PersistedQueueTake', version: VERSION, description: 'Takes and processes one persisted queue value; failures are retried by the queue store.',
	typeParameters: typeParameters(['A','Queue value type.'],['B','Handler success type.'],['E','Handler error type.'],['R','Queue schema services.'],['R2','Handler requirements.']),
	inputs: { queue: persistedQueueInput('Persisted queue.','{{A}}','{{R}}'), handler: callbackInput('Idempotent queue handler receiving attempts and id.', effectReturningCallbackType('value: {{A}}, metadata: { readonly id: string; readonly attempts: number }','{{B}}','{{E}}','{{R2}}')) },
	output: expressionOutput('Persisted queue take Effect.', effectType('{{B}}',`{{E}} | ${persistedQueueErrorType}`,'{{R}} | {{R2}}')),
	source: `${marker('expression','queue','queue')}.take(${marker('expression','handler','(value, metadata) => Effect.succeed(value)')})`
})

export const effectV4EventLogPersistenceFoundationalGraphTemplateInputs = [
	EventLogEventMakeTemplate, EventLogEventAddErrorTemplate, EventLogGroupEmptyTemplate, EventLogGroupAddTemplate,
	EventLogGroupAddErrorTemplate, EventLogSchemaTemplate, EventLogMakeClientTemplate, EventLogWriteTemplate,
	EventLogEntriesTemplate, EventLogDestroyTemplate, EventLogHandlersLayerTemplate, EventLogGroupReactivityTemplate,
	EventLogGroupCompactionTemplate, EventLogLayerRegistryTemplate, EventLogLayerRuntimeTemplate, EventLogApplicationLayerTemplate,
	EventLogIdentitySchemaTemplate, EventLogMakeIdentityTemplate, EventLogIdentityLayerTemplate, EventLogGeneratedIdentityLayerTemplate,
	EventLogEncodeIdentityStringTemplate, EventLogDecodeIdentityStringTemplate, EventJournalMemoryLayerTemplate,
	EventJournalIndexedDbLayerTemplate, EventJournalEntriesTemplate, EventJournalChangesTemplate, EventJournalDestroyTemplate,
	EventLogRemoteEncryptedLayerTemplate, EventLogRemoteUnencryptedLayerTemplate, EventLogRemoteWhenAuthenticatedTemplate,
	EventLogServerAuthMiddlewareLayerTemplate, EventLogServerRpcHandlersLayerTemplate, ReactivityLayerTemplate,
	ReactivityInvalidateTemplate, ReactivityMutationTemplate, ReactivityQueryTemplate, ReactivityStreamTemplate,
	ReactivityWithBatchTemplate, KeyValueStoreMemoryLayerTemplate, KeyValueStoreFileSystemLayerTemplate,
	KeyValueStoreSqlLayerTemplate, KeyValueStorePrefixTemplate, KeyValueStoreGetTemplate, KeyValueStoreSetTemplate,
	KeyValueStoreRemoveTemplate, KeyValueStoreHasTemplate, PersistedQueueFactoryLayerTemplate,
	PersistedQueueMemoryStoreLayerTemplate, PersistedQueueRedisStoreLayerTemplate, PersistedQueueSqlStoreLayerTemplate,
	PersistedQueueCleanupLayerTemplate, PersistedQueueMakeTemplate, PersistedQueueOfferTemplate, PersistedQueueTakeTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
