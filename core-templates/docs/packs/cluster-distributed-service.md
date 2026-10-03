# Effect V4 Cluster / Sharding / Distributed Services Templates

This pack adds cluster entities, sharding, durable mailbox storage, runner coordination, proxy boundaries, and production Node deployment profiles to the Effect V4 graph-template catalog.

**66 templates total:** 47 foundational cluster templates and 19 production distributed-service compositions.

## Current V4 API target

The pack targets the current public V4 cluster barrel:

```ts
import {
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityProxy,
  EntityProxyServer,
  MessageStorage,
  Runner,
  RunnerAddress,
  RunnerStorage,
  Sharding,
  SingleRunner,
  SocketRunner,
  SqlMessageStorage,
  SqlRunnerStorage
} from "effect/cluster"
```

The current V4 API documentation reports `4.0.0-rc.118`. Cluster remains marked unstable even though it is exported from the public `effect/cluster` barrel, so this catalog should remain pinned to the Effect RC used by the application.

## Files

- `effect-cluster-template-helpers.ts`
- `effect-v4-cluster-foundational-templates.ts`
- `effect-v4-cluster-distributed-service-templates.ts`
- Public pack entry point: `@synthesize-regions/core-templates/effect-v4/cluster`
- Structural verification: the package-wide generated validator

## Foundational inventory

### Entity definitions and behavior

- `ClusterEntityMake`
- `ClusterEntityFromRpcGroup`
- `ClusterEntityPersisted`
- `ClusterEntityTransactional`
- `ClusterEntityUninterruptible`
- `ClusterEntityShardGroup`
- `ClusterEntityGetShardGroup`
- `ClusterEntityGetShardId`
- `ClusterEntityClient`
- `ClusterEntityToLayer`
- `ClusterEntityKeepAlive`
- `ClusterEntityCurrentAddress`
- `ClusterEntityCurrentRunnerAddress`
- `ClusterEntityMakeTestClient`

An `Entity` binds a stable type name to an RPC protocol. Entity ids are mapped into shard groups and shard ids, and `Entity.toLayer` registers handlers with Sharding. Handler options include concurrency, mailbox capacity, idle timeout, defect retry behavior, and span attributes.

### Cluster annotations

`ClusterEntityPersisted`, `ClusterEntityTransactional`, `ClusterEntityUninterruptible`, and `ClusterEntityShardGroup` expose the current `ClusterSchema` annotations:

- `Persisted`
- `WithTransaction`
- `Uninterruptible`
- `ShardGroup`

`WithTransaction` only provides transactional behavior when the active `MessageStorage` implements transactions. The SQL-backed message storage does; `MessageStorage.layerNoop` does not provide persistence and must not be used for persisted messages.

### Entity proxy boundaries

- `ClusterEntityProxyToRpcGroup`
- `ClusterEntityProxyToHttpApiGroup`
- `ClusterEntityProxyRpcHandlersLayer`
- `ClusterEntityProxyHttpApiLayer`

The proxy contract adds the target `entityId` and derives both normal and discard operations. This lets ordinary RPC and HTTP API boundaries expose clustered entities without teaching boundary handlers how sharding works.

### Sharding service

- `ClusterShardingLayer`
- `ClusterShardingActiveEntityCount`
- `ClusterShardingRegistrationEvents`
- `ClusterShardingGetShardId`
- `ClusterShardingGetSnowflake`
- `ClusterShardingHasShardId`
- `ClusterShardingIsShutdown`
- `ClusterShardingMakeClient`
- `ClusterShardingPollStorage`
- `ClusterShardingRegisterSingleton`
- `ClusterShardingReset`

`Sharding.layer` requires explicit `ShardingConfig`, `Runners`, `MessageStorage`, `RunnerStorage`, and `RunnerHealth` services. It installs the snowflake generator and entity reaper internally.

### Addresses and runner metadata

- `ClusterRunnerAddressMake`
- `ClusterRunnerMake`
- `ClusterEntityAddressMake`

`RunnerAddress` is the stable network identity of a runner. `Runner` adds shard groups and relative assignment weight. `EntityAddress` combines shard id, entity type, and entity id and must use the same shard-group logic as the Entity definition.

### Storage

- `ClusterMessageStorageMemoryLayer`
- `ClusterMessageStorageNoopLayer`
- `ClusterRunnerStorageMemoryLayer`
- `ClusterSqlMessageStorageLayer`
- `ClusterSqlMessageStorageLayerWith`
- `ClusterSqlRunnerStorageLayer`
- `ClusterSqlRunnerStorageLayerWith`

The SQL message store persists envelopes and reply chunks, supports recovery/redelivery, deduplicates persisted requests, and supplies storage transaction wrapping. The SQL runner store persists runner registration and shard ownership/locks.

Use stable table prefixes in production. Changing a prefix after deployment points the runtime at a different set of cluster tables and migration history.

### Runtime / transport

- `ClusterSingleRunnerLayer`
- `ClusterSocketRunnerLayer`
- `ClusterSocketRunnerClientOnlyLayer`
- `NodeClusterHttpLayer`
- `NodeClusterSocketLayer`
- `NodeClusterHttpK8sClientLayer`
- `NodeClusterSocketK8sClientLayer`

`SingleRunner.layer` is a durable single-process cluster: message storage remains SQL-backed even when runner storage is configured as in-memory.

`NodeClusterHttp.layer` supports HTTP and WebSocket runner transports. `NodeClusterSocket.layer` provides socket transport. Both support local, SQL, or bring-your-own storage and client-only participation.

### Source-file root

- `ClusterDistributedSourceFile`

The source-file template uses the current public `effect/cluster`, `effect/rpc`, and `effect/http-api` barrels plus `@effect/platform-node` for Node cluster transports.

## Production compositions

### Entity policies and hosting

- `ClusterPersistedTransactionalEntity`
- `ClusterPersistedUninterruptibleEntity`
- `ClusterObservedEntityLayer`
- `ClusterEntityServiceWithRuntimeLayer`

Persisted + transactional is the normal choice when an entity's request/reply lifecycle must survive runner restarts and handler-side storage operations need the configured MessageStorage transaction boundary.

### Client boundaries

- `ClusterEntityClientServiceLayer`
- `ClusterObservedEntityCall`

Entity clients can be exposed as ordinary application services. Domain code should depend on that service rather than directly owning runner discovery, shard assignment, or transport details.

### External service boundaries

- `ClusterEntityRpcBoundaryLayer`
- `ClusterEntityHttpBoundaryLayer`

These compose `EntityProxy` / `EntityProxyServer` with the existing RPC and HttpApi servers. The resulting transport surfaces preserve the entity contract while sharding stays behind the boundary.

### Cluster-owned work

- `ClusterDistributedSingletonLayer`

A singleton is scoped to cluster ownership and is appropriate for one-at-a-time coordination work. Recurring cluster scheduling remains in the existing `ClusterCronMake` template from the durable-workflow pack and is intentionally not duplicated here.

### Persistence bundles

- `ClusterSqlPersistenceLayer`
- `ClusterLocalPersistenceLayer`
- `ClusterCoreRuntimeLayer`

The SQL bundle combines MessageStorage and RunnerStorage under the same prefix. The local bundle is for tests/development. `ClusterCoreRuntimeLayer` is the explicit low-level assembly path when the prebuilt Node/SingleRunner deployment Layers are not appropriate.

### Node deployment profiles

- `NodeClusterSqlHttpLayer`
- `NodeClusterSqlWebSocketLayer`
- `NodeClusterSqlSocketLayer`
- `NodeClusterLocalHttpLayer`
- `NodeClusterHttpClientOnlySqlLayer`
- `NodeClusterSocketClientOnlySqlLayer`

These remove conditional generic ambiguity from the lower-level Node cluster Layer by fixing transport, storage, and client-only mode in each template.

### Health

- `ClusterHealthSnapshot`

The snapshot currently reports local active-entity count plus Sharding shutdown state. It is intended to feed the existing Application Assembly health/readiness service rather than define a second health subsystem.

## Recommended production shape

```text
Config + SQL client + crypto
          ↓
cluster storage / Node cluster runtime
          ↓
Sharding
          ↓
Entity handler Layers
          ↓
Entity client services
          ↓
RPC / HttpApi proxy boundaries
          ↓
background singleton / durable workflows
          ↓
OTLP observability
          ↓
Application Assembly root Layer
          ↓
Layer.launch → platform runMain
```

For a single process that still needs durable mailbox/reply state:

```text
SqlClient + Crypto
       ↓
SingleRunner.layer
       ↓
Entity layers / durable workflow engine
```

For a multi-runner Node deployment:

```text
SqlClient
   ↓
NodeClusterHttp.layer({ storage: "sql", ... })
             or
NodeClusterSocket.layer({ storage: "sql", ... })
   ↓
Entity layers
```

## Persistence safety

A critical invariant in this pack is that **persisted entity messages require real MessageStorage**. The current Sharding documentation explicitly warns that persisted sends defect if `Sharding.layer` is wired to `MessageStorage.layerNoop`.

Accordingly:

- `ClusterMessageStorageNoopLayer` is provided only as a low-level non-persisted primitive.
- no production persisted-entity composition combines it with `ClusterSchema.Persisted`.
- `ClusterSqlPersistenceLayer`, `ClusterSingleRunnerLayer`, and SQL-backed Node deployment profiles are the intended durable paths.

## Existing templates intentionally reused

The previous durable-workflow pack already contains:

- `ClusterWorkflowEngineLayer`
- `ClusterCronMake`

This pack reserves those model IDs and does not duplicate them.

## Cross-pack module-path migration note

The earlier Durable / Background Workflows pack was authored while its source-file template still imported cluster modules from `effect/unstable/cluster`. Current V4 documentation exposes Cluster through the public `effect/cluster` barrel.

This pack uses the current public path. The older durable source-file template should be migrated during the planned catalog-hardening pass rather than silently rewritten here.

## Validation

The validation harness checks:

- host TypeScript syntax;
- fallback-generated source syntax;
- exactly one marker for every declared input;
- no undeclared or repeated markers;
- no `{{...}}` generic placeholders leaking into emitted source;
- duplicate model IDs inside the pack;
- collisions with currently mounted catalog files; and
- historical collision protection for `ClusterCronMake` and `ClusterWorkflowEngineLayer`.

All **66 model IDs** pass these structural checks.

This is not a module-resolved semantic TypeScript compile against a locally installed matching Effect RC. API signatures and behavior were audited against the current V4 API/source, while the generated catalog itself is validated structurally.
