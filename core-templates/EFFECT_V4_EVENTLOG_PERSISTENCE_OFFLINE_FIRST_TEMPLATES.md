# Effect V4 EventLog + Persistence / Offline-First Templates

This pack adds **71 concrete graph templates** for the current Effect V4 EventLog and persistence APIs:

- **54 foundational templates**
- **17 offline-first / production compositions**

It extends the existing OpenAPI-generated integration catalog rather than replacing any previous pack.

## Current API surface

The pack targets the public V4 barrels:

```ts
import { Event, EventGroup, EventJournal, EventLog, EventLogRemote, EventLogServer } from "effect/eventlog"
import { KeyValueStore, PersistedQueue } from "effect/persistence"
import { Reactivity } from "effect/reactivity"
```

These modules remain marked unstable in Effect V4 and should be pinned to the same Effect RC as the rest of the catalog.

## Core durability rules

### EventLog commit semantics

An EventLog write:

1. encodes the typed payload,
2. runs the registered event handler,
3. commits the journal entry only if that handler succeeds.

Failed handlers therefore do not leave a locally committed event entry.

### PersistedQueue delivery semantics

`PersistedQueue` provides **at-least-once** delivery. A process crash after the handler succeeds but before acknowledgement can cause redelivery. Worker handlers therefore need to be idempotent.

Stable queue item IDs can be supplied to `offer`; the stores retain completed IDs until cleanup so duplicate offers can be suppressed during that retention period.

### Offline-first replication

- `EventJournal.layerIndexedDb` is browser-local durable storage.
- `EventLogRemote.layerEncrypted` is the default composition for replication over untrusted browser, edge, or service networks.
- `EventLogRemote.layerUnencrypted` is intentionally limited to trusted transports and tests.
- remote replicas register with the shared EventLog `Registry`, allowing the EventLog runtime to consume remote changes and push local uncommitted entries.

### Reactivity

Effect Reactivity is process-local. EventLog group reactivity connects local writes and remote replay to invalidation keys, but it does not itself provide distributed cache invalidation.

## Foundation templates

### Event contracts and groups

- `EventLogEventMake`
- `EventLogEventAddError`
- `EventLogGroupEmpty`
- `EventLogGroupAdd`
- `EventLogGroupAddError`
- `EventLogSchema`

### EventLog runtime

- `EventLogMakeClient`
- `EventLogWrite`
- `EventLogEntries`
- `EventLogDestroy`
- `EventLogHandlersLayer`
- `EventLogGroupReactivity`
- `EventLogGroupCompaction`
- `EventLogLayerRegistry`
- `EventLogLayerRuntime`
- `EventLogApplicationLayer`

### Identity

- `EventLogIdentitySchema`
- `EventLogMakeIdentity`
- `EventLogIdentityLayer`
- `EventLogGeneratedIdentityLayer`
- `EventLogEncodeIdentityString`
- `EventLogDecodeIdentityString`

### Journal storage

- `EventJournalMemoryLayer`
- `EventJournalIndexedDbLayer`
- `EventJournalEntries`
- `EventJournalChanges`
- `EventJournalDestroy`

### Remote replication and server handlers

- `EventLogRemoteEncryptedLayer`
- `EventLogRemoteUnencryptedLayer`
- `EventLogRemoteWhenAuthenticated`
- `EventLogServerAuthMiddlewareLayer`
- `EventLogServerRpcHandlersLayer`

### Reactivity

- `ReactivityLayer`
- `ReactivityInvalidate`
- `ReactivityMutation`
- `ReactivityQuery`
- `ReactivityStream`
- `ReactivityWithBatch`

### KeyValueStore

- `KeyValueStoreMemoryLayer`
- `KeyValueStoreFileSystemLayer`
- `KeyValueStoreSqlLayer`
- `KeyValueStorePrefix`
- `KeyValueStoreGet`
- `KeyValueStoreSet`
- `KeyValueStoreRemove`
- `KeyValueStoreHas`

### PersistedQueue

- `PersistedQueueFactoryLayer`
- `PersistedQueueMemoryStoreLayer`
- `PersistedQueueRedisStoreLayer`
- `PersistedQueueSqlStoreLayer`
- `PersistedQueueCleanupLayer`
- `PersistedQueueMake`
- `PersistedQueueOffer`
- `PersistedQueueTake`

## Offline-first / production compositions

### Local EventLog profiles

- `OfflineFirstInMemoryEventLogLayer`
- `OfflineFirstIndexedDbEventLogLayer`

The in-memory profile is for tests/local development. IndexedDB is the durable browser-local profile.

### Replication profiles

- `OfflineFirstEncryptedReplicaLayer`
- `OfflineFirstTrustedReplicaLayer`
- `EventLogRemoteRpcServerLayer`

Encrypted replication is the normal network-facing profile. The plaintext profile is intentionally named “Trusted” to avoid accidentally treating it as the production default.

### Event processing / read models

- `EventLogCompactedReactiveGroupLayer`
- `EventLogObservedWrite`
- `OfflineFirstReactiveQueryStream`

Compaction applies during remote replay and is grouped by event primary key. Reactive query Streams rerun when their registered keys are invalidated.

### Durable work

- `PersistedQueueWorkerLayer`
- `PersistedQueueObservedWorkerLayer`
- `PersistedQueueIdempotentOperation`
- `SqlPersistedQueueInfrastructureLayer`
- `RedisPersistedQueueInfrastructureLayer`

The idempotent-operation template passes the stable queue item ID as the external idempotency key. This does not make an arbitrary external operation automatically idempotent; the target system must honor that key.

The SQL/Redis infrastructure templates use one store instance for the queue factory and cleanup Layer. Effect recommends running cleanup in one deployment instance where practical; concurrent cleanup is safe but redundant because deletion is idempotent.

### Application persistence

- `PrefixedKeyValueServiceLayer`
- `OfflineFirstPersistenceApplicationLayer`
- `OfflineFirstBrowserSourceFile`
- `EventLogPersistenceServerSourceFile`

## Transaction boundary caveat

`PersistedQueue` is suitable for durable handoff and outbox-style processing, but queue persistence is **not automatically part of the same database transaction as unrelated business-state updates**.

When business state and an outbox row must commit atomically, use the SQL/repository/transaction pack to write both in one SQL transaction and then dispatch from the durable record. Do not infer cross-store transactionality from PersistedQueue or EventLog replay semantics.

## Validation

The included validator checks:

- TypeScript module syntax
- fallback-generated source syntax
- exact declared-input ↔ marker ownership
- no undeclared/repeated markers
- no generic `{{...}}` placeholders leaking into emitted source
- duplicate new model IDs
- collisions with all existing `.ts` catalog artifacts in `/mnt/data`

All **71 model IDs pass** these checks.

This remains structural/source-level validation. It is not a complete module-resolved `tsc --strict` semantic compilation against an installed Effect dependency graph.

## Effect version snapshot

The current upstream package metadata observed while finalizing this pack reports **`effect` 4.0.0-rc.118**. EventLog, persistence, and Reactivity APIs remain unstable, so pin the Effect version with this catalog snapshot.
