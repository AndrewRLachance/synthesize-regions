import { fragmentCollectionPort } from '../src/templates.js'
import { defineTemplate } from './sample-definition.js'
import {
	effectSourceInput,
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
	streamType,
	statementCollectionInput,
	stringInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	clusterClientErrorType,
	clusterConfigErrorType,
	clusterServeErrorType,
	cryptoRequirement,
	currentEntityAddressRequirement,
	currentRunnerAddressRequirement,
	entityAddressType,
	entityInput,
	entityType,
	httpApiType,
	k8sHttpClientType,
	messageStorageRequirement,
	messageStorageType,
	rpcGroupInput,
	rpcGroupType,
	rpcSerializationRequirement,
	rpcType,
	runnerAddressType,
	runnerHealthRequirement,
	runnerRpcClientProtocolRequirement,
	runnersRequirement,
	runnersType,
	runnerStorageRequirement,
	runnerStorageType,
	runnerType,
	shardIdInput,
	shardIdType,
	shardingConfigRequirement,
	shardingInput,
	shardingRegistrationEventType,
	shardingRequirement,
	shardingType,
	snowflakeInput,
	snowflakeType,
	socketServerRequirement,
	sqlClientRequirement,
	sqlErrorType,
	scopeRequirement
} from './effect-cluster-template-helpers.js'

/**
 * Effect v4 Cluster / sharding foundations.
 *
 * Runtime contract:
 *   import { Effect, Layer, Schedule, Stream } from 'effect'
 *   import { ClusterSchema, Entity, EntityAddress, EntityProxy, EntityProxyServer, MessageStorage, Runner, RunnerAddress, RunnerStorage, Sharding, SingleRunner, SocketRunner, SqlMessageStorage, SqlRunnerStorage } from 'effect/unstable/cluster'
 *   import { RpcServer } from 'effect/unstable/rpc'
 *   import { HttpApiBuilder } from 'effect/unstable/httpapi'
 *   import { NodeClusterHttp, NodeClusterSocket } from '@effect/platform-node'
 */
const VERSION = '1.0.0' as const

export const ClusterEntityMakeTemplate = defineTemplate({
	modelId: 'ClusterEntityMake', version: VERSION,
	description: 'Defines an addressable cluster Entity from one or more Rpc definitions.',
	inputs: {
		type: stringInput('Stable cluster entity type name.'),
		rpcs: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression', type: rpcType() },
			minItems: 1,
			separator: ', ',
			description: 'RPC definitions handled by the entity.'
		})
	},
	output: expressionOutput('Cluster Entity definition.', entityType()),
	source: `Entity.make(${marker('string', 'type', '"Counter"')}, [${marker('expression', 'rpcs', 'Rpc.make("Get")')}])`
})

export const ClusterEntityFromRpcGroupTemplate = defineTemplate({
	modelId: 'ClusterEntityFromRpcGroup', version: VERSION,
	description: 'Defines a cluster Entity from an existing RpcGroup.',
	typeParameters: typeParameters(['Rpcs', 'RPC union represented by the group.']),
	inputs: {
		type: stringInput('Stable cluster entity type name.'),
		group: rpcGroupInput('RPC group accepted by the entity.', '{{Rpcs}}')
	},
	output: expressionOutput('Cluster Entity definition.', entityType('string', '{{Rpcs}}')),
	source: `Entity.fromRpcGroup(${marker('string', 'type', '"Counter"')}, ${marker('expression', 'group', 'Rpcs')})`
})

export const ClusterEntityPersistedTemplate = defineTemplate({
	modelId: 'ClusterEntityPersisted', version: VERSION,
	description: 'Marks every current Entity RPC as persisted in MessageStorage.',
	inputs: { entity: entityInput('Entity whose RPCs become persisted.'), enabled: effectValueInput('Persisted flag.', { ts: 'boolean' }) },
	output: expressionOutput('Persisted-annotation Entity.', entityType()),
	source: `${marker('expression', 'entity', 'Counter')}.annotateRpcs(ClusterSchema.Persisted, ${marker('expression', 'enabled', 'true')})`
})

export const ClusterEntityTransactionalTemplate = defineTemplate({
	modelId: 'ClusterEntityTransactional', version: VERSION,
	description: 'Marks every current Entity RPC for MessageStorage transaction wrapping when the storage backend supports transactions.',
	inputs: { entity: entityInput('Entity whose handlers use storage transactions.'), enabled: effectValueInput('Transaction annotation flag.', { ts: 'boolean' }) },
	output: expressionOutput('Transactional-annotation Entity.', entityType()),
	source: `${marker('expression', 'entity', 'Counter')}.annotateRpcs(ClusterSchema.WithTransaction, ${marker('expression', 'enabled', 'true')})`
})

export const ClusterEntityUninterruptibleTemplate = defineTemplate({
	modelId: 'ClusterEntityUninterruptible', version: VERSION,
	description: 'Configures client/server interruptibility for every current Entity RPC.',
	inputs: {
		entity: entityInput('Entity whose RPC interruptibility is configured.'),
		mode: effectValueInput('Interruptibility mode.', { ts: 'boolean | "server" | "client"' })
	},
	output: expressionOutput('Interruptibility-annotated Entity.', entityType()),
	source: `${marker('expression', 'entity', 'Counter')}.annotateRpcs(ClusterSchema.Uninterruptible, ${marker('expression', 'mode', 'true')})`
})

export const ClusterEntityShardGroupTemplate = defineTemplate({
	modelId: 'ClusterEntityShardGroup', version: VERSION,
	description: 'Assigns Entity ids to named shard groups through ClusterSchema.ShardGroup.',
	inputs: {
		entity: entityInput('Entity whose shard-group selection is configured.'),
		getGroup: callbackInput('Pure shard-group selector.', { ts: '(entityId: string) => string' })
	},
	output: expressionOutput('Shard-group annotated Entity.', entityType()),
	source: `${marker('expression', 'entity', 'Counter')}.annotateRpcs(ClusterSchema.ShardGroup, ${marker('expression', 'getGroup', '() => "default"')})`
})

export const ClusterEntityGetShardGroupTemplate = defineTemplate({
	modelId: 'ClusterEntityGetShardGroup', version: VERSION,
	description: 'Computes the configured shard group for an Entity id without contacting the cluster.',
	inputs: { entity: entityInput('Entity definition.'), entityId: effectValueInput('Entity id.', { ts: 'string' }) },
	output: expressionOutput('Shard-group name.', { ts: 'string' }),
	source: `${marker('expression', 'entity', 'Counter')}.getShardGroup(${marker('expression', 'entityId', '"id"')} as never)`
})

export const ClusterEntityGetShardIdTemplate = defineTemplate({
	modelId: 'ClusterEntityGetShardId', version: VERSION,
	description: 'Resolves the shard ID assigned to an Entity id.',
	inputs: { entity: entityInput('Entity definition.'), entityId: effectValueInput('Entity id.', { ts: 'string' }) },
	output: expressionOutput('Shard-id lookup Effect.', effectType(shardIdType().ts, 'never', shardingRequirement)),
	source: `${marker('expression', 'entity', 'Counter')}.getShardId(${marker('expression', 'entityId', '"id"')} as never)`
})

export const ClusterEntityClientTemplate = defineTemplate({
	modelId: 'ClusterEntityClient', version: VERSION,
	description: 'Creates a sharded client factory for an Entity.',
	typeParameters: typeParameters(['Rpcs', 'RPC union represented by the Entity.']),
	inputs: { entity: entityInput('Entity definition.', 'string', '{{Rpcs}}') },
	output: expressionOutput('Entity client-factory Effect.', effectType('(entityId: string) => unknown', 'never', shardingRequirement)),
	source: `${marker('expression', 'entity', 'Counter')}.client`
})

export const ClusterEntityToLayerTemplate = defineTemplate({
	modelId: 'ClusterEntityToLayer', version: VERSION,
	description: 'Registers typed Entity handlers with cluster sharding as a scoped Layer.',
	typeParameters: typeParameters(['R', 'Handler construction and service requirements.']),
	inputs: {
		entity: entityInput('Entity definition.'),
		handlers: valueInput('Entity handler object or Effect producing it.'),
		options: valueInput('Entity handler options: concurrency, mailbox capacity, idle timeout, retry policy, fatal-defect behavior, and span attributes.')
	},
	output: expressionOutput('Entity registration Layer.', layerType('never', 'never', `${shardingRequirement} | {{R}}`)),
	source: `${marker('expression', 'entity', 'Counter')}.toLayer(${marker('expression', 'handlers', '{}')}, ${marker('expression', 'options', '{}')})`
})

export const ClusterEntityKeepAliveTemplate = defineTemplate({
	modelId: 'ClusterEntityKeepAlive', version: VERSION,
	description: 'Enables or disables keep-alive for the currently executing Entity instance.',
	inputs: { enabled: effectValueInput('Keep-alive state.', { ts: 'boolean' }) },
	output: expressionOutput('Entity keep-alive Effect.', effectType('void', 'never', `${shardingRequirement} | ${currentEntityAddressRequirement}`)),
	source: `Entity.keepAlive(${marker('expression', 'enabled', 'true')})`
})

export const ClusterEntityCurrentAddressTemplate = defineTemplate({
	modelId: 'ClusterEntityCurrentAddress', version: VERSION,
	description: 'Accesses the address of the Entity currently handling a request.',
	inputs: {},
	output: expressionOutput('Current Entity address Effect.', effectType(entityAddressType().ts, 'never', currentEntityAddressRequirement)),
	source: 'Entity.CurrentAddress'
})

export const ClusterEntityCurrentRunnerAddressTemplate = defineTemplate({
	modelId: 'ClusterEntityCurrentRunnerAddress', version: VERSION,
	description: 'Accesses the Runner address associated with the current Entity handler registration.',
	inputs: {},
	output: expressionOutput('Current Runner address Effect.', effectType(runnerAddressType().ts, 'never', currentRunnerAddressRequirement)),
	source: 'Entity.CurrentRunnerAddress'
})

export const ClusterEntityMakeTestClientTemplate = defineTemplate({
	modelId: 'ClusterEntityMakeTestClient', version: VERSION,
	description: 'Creates an in-memory no-serialization Entity test client for an Entity handler Layer.',
	typeParameters: typeParameters(['LE', 'Entity-layer construction error.'], ['LR', 'Entity-layer requirements.']),
	inputs: {
		entity: entityInput('Entity under test.'),
		layer: typedExpressionInput('Layer implementing the Entity.', layerType('unknown', '{{LE}}', '{{LR}}'))
	},
	output: expressionOutput('Scoped Entity test-client factory.', effectType('(entityId: string) => unknown', '{{LE}}', `${scopeRequirement} | ${shardingConfigRequirement} | {{LR}}`)),
	source: `Entity.makeTestClient(${marker('expression', 'entity', 'Counter')}, ${marker('expression', 'layer', 'CounterLayer')})`
})

export const ClusterEntityProxyToRpcGroupTemplate = defineTemplate({
	modelId: 'ClusterEntityProxyToRpcGroup', version: VERSION,
	description: 'Derives normal and discard RPC operations that proxy calls to clustered Entity ids.',
	inputs: { entity: entityInput('Entity exposed through RPC proxy operations.') },
	output: expressionOutput('Entity proxy RpcGroup.', rpcGroupType()),
	source: `EntityProxy.toRpcGroup(${marker('expression', 'entity', 'Counter')})`
})

export const ClusterEntityProxyToHttpApiGroupTemplate = defineTemplate({
	modelId: 'ClusterEntityProxyToHttpApiGroup', version: VERSION,
	description: 'Derives POST HTTP API endpoints for normal and discard Entity operations.',
	inputs: { name: stringInput('HttpApi group identifier.'), entity: entityInput('Entity exposed through HTTP proxy operations.') },
	output: expressionOutput('Entity proxy HttpApiGroup.', { nominal: 'effect/unstable/httpapi/HttpApiGroup', ts: '{ readonly pipe: () => unknown }' }),
	source: `EntityProxy.toHttpApiGroup(${marker('string', 'name', '"counter"')}, ${marker('expression', 'entity', 'Counter')})`
})

export const ClusterEntityProxyRpcHandlersLayerTemplate = defineTemplate({
	modelId: 'ClusterEntityProxyRpcHandlersLayer', version: VERSION,
	description: 'Creates RpcServer handler services for an Entity proxy RpcGroup.',
	inputs: { entity: entityInput('Entity proxied through RPC.') },
	output: expressionOutput('Entity proxy RPC-handler Layer.', layerType('unknown', 'never', `${shardingRequirement} | unknown`)),
	source: `EntityProxyServer.layerRpcHandlers(${marker('expression', 'entity', 'Counter')})`
})

export const ClusterEntityProxyHttpApiLayerTemplate = defineTemplate({
	modelId: 'ClusterEntityProxyHttpApiLayer', version: VERSION,
	description: 'Creates HttpApi handler services for an Entity proxy group.',
	inputs: {
		api: typedExpressionInput('HttpApi containing the generated entity-proxy group.', httpApiType()),
		identifier: stringInput('Generated HttpApi group identifier.'),
		entity: entityInput('Entity proxied through HTTP.')
	},
	output: expressionOutput('Entity proxy HttpApi-handler Layer.', layerType('unknown', 'never', `${shardingRequirement} | unknown`)),
	source: `EntityProxyServer.layerHttpApi(${marker('expression', 'api', 'Api')}, ${marker('string', 'identifier', '"counter"')}, ${marker('expression', 'entity', 'Counter')})`
})

export const ClusterShardingLayerTemplate = defineTemplate({
	modelId: 'ClusterShardingLayer', version: VERSION,
	description: 'Constructs Sharding from explicit configuration, runner communication, message storage, runner storage, and runner health services.',
	inputs: {},
	output: expressionOutput('Core cluster Sharding Layer.', layerType(shardingRequirement, 'never', `${shardingConfigRequirement} | ${runnersRequirement} | ${messageStorageRequirement} | ${runnerStorageRequirement} | ${runnerHealthRequirement}`)),
	source: 'Sharding.layer'
})

export const ClusterShardingActiveEntityCountTemplate = defineTemplate({
	modelId: 'ClusterShardingActiveEntityCount', version: VERSION,
	description: 'Reads the number of active Entity instances on the current runner.',
	inputs: {},
	output: expressionOutput('Active Entity count Effect.', effectType('number', 'never', shardingRequirement)),
	source: 'Effect.flatMap(Sharding.Sharding, sharding => sharding.activeEntityCount)'
})

export const ClusterShardingRegistrationEventsTemplate = defineTemplate({
	modelId: 'ClusterShardingRegistrationEvents', version: VERSION,
	description: 'Streams Entity and singleton registration lifecycle events from Sharding.',
	inputs: {},
	output: expressionOutput('Sharding registration-event Stream.', streamType(shardingRegistrationEventType().ts, 'never', shardingRequirement)),
	source: 'Stream.unwrap(Effect.map(Sharding.Sharding, sharding => sharding.getRegistrationEvents))'
})

export const ClusterShardingGetShardIdTemplate = defineTemplate({
	modelId: 'ClusterShardingGetShardId', version: VERSION,
	description: 'Computes a shard id for an entity id and shard group through the Sharding service.',
	inputs: { entityId: effectValueInput('Entity id.', { ts: 'string' }), group: effectValueInput('Shard-group name.', { ts: 'string' }) },
	output: expressionOutput('Shard-id Effect.', effectType(shardIdType().ts, 'never', shardingRequirement)),
	source: `Effect.map(Sharding.Sharding, sharding => sharding.getShardId(${marker('expression', 'entityId', '"id"')} as never, ${marker('expression', 'group', '"default"')}))`
})

export const ClusterShardingGetSnowflakeTemplate = defineTemplate({
	modelId: 'ClusterShardingGetSnowflake', version: VERSION,
	description: 'Generates a runner-local Snowflake request id from Sharding.',
	inputs: {},
	output: expressionOutput('Snowflake Effect.', effectType(snowflakeType().ts, 'never', shardingRequirement)),
	source: 'Effect.flatMap(Sharding.Sharding, sharding => sharding.getSnowflake)'
})

export const ClusterShardingHasShardIdTemplate = defineTemplate({
	modelId: 'ClusterShardingHasShardId', version: VERSION,
	description: 'Checks whether the current runner presently owns a shard id.',
	inputs: { shardId: shardIdInput('Shard id to test.') },
	output: expressionOutput('Shard ownership Effect.', effectType('boolean', 'never', shardingRequirement)),
	source: `Effect.map(Sharding.Sharding, sharding => sharding.hasShardId(${marker('expression', 'shardId', 'shardId')}))`
})

export const ClusterShardingIsShutdownTemplate = defineTemplate({
	modelId: 'ClusterShardingIsShutdown', version: VERSION,
	description: 'Reads whether the Sharding runtime is shutting down.',
	inputs: {},
	output: expressionOutput('Sharding shutdown-state Effect.', effectType('boolean', 'never', shardingRequirement)),
	source: 'Effect.flatMap(Sharding.Sharding, sharding => sharding.isShutdown)'
})

export const ClusterShardingMakeClientTemplate = defineTemplate({
	modelId: 'ClusterShardingMakeClient', version: VERSION,
	description: 'Creates a sharded client factory for an Entity through the Sharding service.',
	inputs: { entity: entityInput('Entity definition.') },
	output: expressionOutput('Entity client-factory Effect.', effectType('(entityId: string) => unknown', 'never', shardingRequirement)),
	source: `Effect.flatMap(Sharding.Sharding, sharding => sharding.makeClient(${marker('expression', 'entity', 'Counter')}))`
})

export const ClusterShardingPollStorageTemplate = defineTemplate({
	modelId: 'ClusterShardingPollStorage', version: VERSION,
	description: 'Polls MessageStorage for persisted work assigned to locally owned shards.',
	inputs: {},
	output: expressionOutput('Persisted-work polling Effect.', effectType('void', 'never', shardingRequirement)),
	source: 'Effect.flatMap(Sharding.Sharding, sharding => sharding.pollStorage)'
})

export const ClusterShardingRegisterSingletonTemplate = defineTemplate({
	modelId: 'ClusterShardingRegisterSingleton', version: VERSION,
	description: 'Registers one cluster-owned scoped singleton Effect.',
	typeParameters: typeParameters(['E', 'Singleton Effect error type.'], ['R', 'Singleton Effect requirements.']),
	inputs: {
		name: effectValueInput('Stable singleton name.', { ts: 'string' }),
		run: effectSourceInput('Singleton body.', effectType('void', '{{E}}', '{{R}}')),
		shardGroup: effectValueInput('Optional shard-group name.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Singleton registration Effect.', effectType('void', 'never', `${shardingRequirement} | ${scopeRequirement} | {{R}}`)),
	source: `Effect.flatMap(Sharding.Sharding, sharding => sharding.registerSingleton(${marker('expression', 'name', '"leader"')}, ${marker('expression', 'run', 'Effect.void')}, { shardGroup: ${marker('expression', 'shardGroup', 'undefined')} }))`
})

export const ClusterShardingResetTemplate = defineTemplate({
	modelId: 'ClusterShardingReset', version: VERSION,
	description: 'Resets persisted processing state for a cluster request id.',
	inputs: { requestId: snowflakeInput('Cluster request Snowflake.') },
	output: expressionOutput('Whether reset work was performed.', effectType('boolean', 'never', shardingRequirement)),
	source: `Effect.flatMap(Sharding.Sharding, sharding => sharding.reset(${marker('expression', 'requestId', 'requestId')}))`
})

export const ClusterRunnerAddressMakeTemplate = defineTemplate({
	modelId: 'ClusterRunnerAddressMake', version: VERSION,
	description: 'Constructs a stable network address for a cluster runner.',
	inputs: { host: effectValueInput('Runner host.', { ts: 'string' }), port: effectValueInput('Runner port.', { ts: 'number' }) },
	output: expressionOutput('Runner address.', runnerAddressType()),
	source: `RunnerAddress.make(${marker('expression', 'host', '"127.0.0.1"')}, ${marker('expression', 'port', '8080')})`
})

export const ClusterRunnerMakeTemplate = defineTemplate({
	modelId: 'ClusterRunnerMake', version: VERSION,
	description: 'Constructs cluster Runner metadata from address, shard groups, and relative assignment weight.',
	inputs: {
		address: typedExpressionInput('Runner address.', runnerAddressType()),
		groups: effectValueInput('Shard groups the runner can host.', { ts: 'ReadonlyArray<string>' }),
		weight: effectValueInput('Relative shard-assignment weight.', { ts: 'number' })
	},
	output: expressionOutput('Runner metadata.', runnerType()),
	source: `Runner.make({ address: ${marker('expression', 'address', 'RunnerAddress.make("127.0.0.1", 8080)')}, groups: ${marker('expression', 'groups', '["default"]')}, weight: ${marker('expression', 'weight', '1')} })`
})

export const ClusterEntityAddressMakeTemplate = defineTemplate({
	modelId: 'ClusterEntityAddressMake', version: VERSION,
	description: 'Constructs a cluster EntityAddress from a resolved shard id, entity type, and entity id.',
	inputs: {
		shardId: shardIdInput('Resolved shard id.'),
		entityType: effectValueInput('Entity type.', { ts: 'string' }),
		entityId: effectValueInput('Entity id.', { ts: 'string' })
	},
	output: expressionOutput('Entity address.', entityAddressType()),
	source: `EntityAddress.make({ shardId: ${marker('expression', 'shardId', 'shardId')}, entityType: ${marker('expression', 'entityType', '"Counter"')} as never, entityId: ${marker('expression', 'entityId', '"id"')} as never })`
})

export const ClusterMessageStorageMemoryLayerTemplate = defineTemplate({
	modelId: 'ClusterMessageStorageMemoryLayer', version: VERSION,
	description: 'Provides recoverable-in-process MessageStorage for tests and local development.',
	inputs: {},
	output: expressionOutput('In-memory MessageStorage Layer.', layerType(`${messageStorageRequirement} | { readonly __messageStorageMemoryDriver: "MemoryDriver" }`, 'never', shardingConfigRequirement)),
	source: 'MessageStorage.layerMemory'
})

export const ClusterMessageStorageNoopLayerTemplate = defineTemplate({
	modelId: 'ClusterMessageStorageNoopLayer', version: VERSION,
	description: 'Provides no-op MessageStorage for non-persisted cluster traffic only; persisted sends must not use this Layer.',
	inputs: {},
	output: expressionOutput('No-op MessageStorage Layer.', layerType(messageStorageRequirement, 'never', 'never')),
	source: 'MessageStorage.layerNoop'
})

export const ClusterRunnerStorageMemoryLayerTemplate = defineTemplate({
	modelId: 'ClusterRunnerStorageMemoryLayer', version: VERSION,
	description: 'Provides in-memory runner/shard ownership storage for local and single-process setups.',
	inputs: {},
	output: expressionOutput('In-memory RunnerStorage Layer.', layerType(runnerStorageRequirement, 'never', shardingConfigRequirement)),
	source: 'RunnerStorage.layerMemory'
})

export const ClusterSqlMessageStorageLayerTemplate = defineTemplate({
	modelId: 'ClusterSqlMessageStorageLayer', version: VERSION,
	description: 'Provides SQL-backed persisted cluster mailbox messages and replies with the default table prefix.',
	inputs: {},
	output: expressionOutput('SQL MessageStorage Layer.', layerType(messageStorageRequirement, 'never', `${sqlClientRequirement} | ${shardingConfigRequirement} | ${cryptoRequirement}`)),
	source: 'SqlMessageStorage.layer'
})

export const ClusterSqlMessageStorageLayerWithTemplate = defineTemplate({
	modelId: 'ClusterSqlMessageStorageLayerWith', version: VERSION,
	description: 'Provides SQL-backed MessageStorage using a stable custom table prefix.',
	inputs: { prefix: effectValueInput('Stable SQL cluster table prefix.', { ts: 'string | undefined' }) },
	output: expressionOutput('Prefixed SQL MessageStorage Layer.', layerType(messageStorageRequirement, 'never', `${sqlClientRequirement} | ${shardingConfigRequirement} | ${cryptoRequirement}`)),
	source: `SqlMessageStorage.layerWith({ prefix: ${marker('expression', 'prefix', '"cluster"')} })`
})

export const ClusterSqlRunnerStorageLayerTemplate = defineTemplate({
	modelId: 'ClusterSqlRunnerStorageLayer', version: VERSION,
	description: 'Provides SQL-backed runner registration and shard-lock storage with the default prefix.',
	inputs: {},
	output: expressionOutput('SQL RunnerStorage Layer.', layerType(runnerStorageRequirement, sqlErrorType, `${sqlClientRequirement} | ${shardingConfigRequirement}`)),
	source: 'SqlRunnerStorage.layer'
})

export const ClusterSqlRunnerStorageLayerWithTemplate = defineTemplate({
	modelId: 'ClusterSqlRunnerStorageLayerWith', version: VERSION,
	description: 'Provides SQL-backed RunnerStorage using a stable custom table prefix.',
	inputs: { prefix: effectValueInput('Stable SQL cluster table prefix.', { ts: 'string | undefined' }) },
	output: expressionOutput('Prefixed SQL RunnerStorage Layer.', layerType(runnerStorageRequirement, sqlErrorType, `${sqlClientRequirement} | ${shardingConfigRequirement}`)),
	source: `SqlRunnerStorage.layerWith({ prefix: ${marker('expression', 'prefix', '"cluster"')} })`
})

export const ClusterSingleRunnerLayerTemplate = defineTemplate({
	modelId: 'ClusterSingleRunnerLayer', version: VERSION,
	description: 'Provides a durable single-process cluster using SQL message storage and SQL or in-memory runner storage.',
	inputs: { options: valueInput('SingleRunner options: runnerStorage and shardingConfig overrides.') },
	output: expressionOutput('Single-process durable cluster Layer.', layerType(`${shardingRequirement} | ${messageStorageRequirement} | ${runnersRequirement}`, clusterConfigErrorType, `${cryptoRequirement} | ${sqlClientRequirement}`)),
	source: `SingleRunner.layer(${marker('expression', 'options', '{}')})`
})

export const ClusterSocketRunnerLayerTemplate = defineTemplate({
	modelId: 'ClusterSocketRunnerLayer', version: VERSION,
	description: 'Runs a shard-hosting cluster Runner over the socket RPC transport.',
	inputs: {},
	output: expressionOutput('Socket cluster Runner Layer.', layerType(`${shardingRequirement} | ${runnersRequirement}`, 'never', `${runnerRpcClientProtocolRequirement} | ${shardingConfigRequirement} | ${rpcSerializationRequirement} | ${socketServerRequirement} | ${messageStorageRequirement} | ${runnerStorageRequirement} | ${runnerHealthRequirement}`)),
	source: 'SocketRunner.layer'
})

export const ClusterSocketRunnerClientOnlyLayerTemplate = defineTemplate({
	modelId: 'ClusterSocketRunnerClientOnlyLayer', version: VERSION,
	description: 'Provides client-only Sharding/Runners over sockets without hosting shards or starting a runner server.',
	inputs: {},
	output: expressionOutput('Socket cluster client-only Layer.', layerType(`${shardingRequirement} | ${runnersRequirement}`, 'never', `${runnerRpcClientProtocolRequirement} | ${shardingConfigRequirement} | ${messageStorageRequirement} | ${runnerStorageRequirement}`)),
	source: 'SocketRunner.layerClientOnly'
})

export const NodeClusterHttpLayerTemplate = defineTemplate({
	modelId: 'NodeClusterHttpLayer', version: VERSION,
	description: 'Builds a Node cluster HTTP/WebSocket sharding Layer from explicit transport, storage, serialization, health, and client-only options.',
	inputs: { options: valueInput('NodeClusterHttp options.') },
	output: expressionOutput('Node HTTP/WebSocket cluster Layer.', layerType(`${shardingRequirement} | ${runnersRequirement} | ${messageStorageRequirement}`, 'unknown', 'unknown')),
	source: `NodeClusterHttp.layer(${marker('expression', 'options', '{ transport: "http", storage: "local" }')})`
})

export const NodeClusterSocketLayerTemplate = defineTemplate({
	modelId: 'NodeClusterSocketLayer', version: VERSION,
	description: 'Builds a Node cluster socket sharding Layer with configurable storage, serialization, runner health, and client-only mode.',
	inputs: { options: valueInput('NodeClusterSocket options.') },
	output: expressionOutput('Node socket cluster Layer.', layerType(`${shardingRequirement} | ${runnersRequirement} | ${messageStorageRequirement}`, 'unknown', 'unknown')),
	source: `NodeClusterSocket.layer(${marker('expression', 'options', '{ storage: "local" }')})`
})

export const NodeClusterHttpK8sClientLayerTemplate = defineTemplate({
	modelId: 'NodeClusterHttpK8sClientLayer', version: VERSION,
	description: 'Provides the Kubernetes-aware cluster health HTTP client for Node HTTP cluster transport.',
	inputs: {},
	output: expressionOutput('Kubernetes cluster HTTP-client Layer.', layerType(k8sHttpClientType().ts, 'never', 'never')),
	source: 'NodeClusterHttp.layerK8sHttpClient'
})

export const NodeClusterSocketK8sClientLayerTemplate = defineTemplate({
	modelId: 'NodeClusterSocketK8sClientLayer', version: VERSION,
	description: 'Provides the Kubernetes-aware cluster health HTTP client for Node socket cluster transport.',
	inputs: {},
	output: expressionOutput('Kubernetes cluster HTTP-client Layer.', layerType(k8sHttpClientType().ts, 'never', 'never')),
	source: 'NodeClusterSocket.layerK8sHttpClient'
})

export const ClusterDistributedSourceFileTemplate = defineTemplate({
	modelId: 'ClusterDistributedSourceFile', version: VERSION,
	description: 'Builds a complete Effect V4 Cluster source file using current public cluster/rpc/http-api barrels.',
	inputs: { body: statementCollectionInput('Cluster entity definitions, Layers, services, and runtime statements.') },
	output: { kind: 'sourceFile', description: 'Complete Effect V4 cluster/distributed-services source file.' },
	source: `import { Context, Effect, Layer, Schedule, Schema, Stream } from "effect"
import { ClusterSchema, Entity, EntityAddress, EntityProxy, EntityProxyServer, MessageStorage, Runner, RunnerAddress, RunnerStorage, Sharding, SingleRunner, SocketRunner, SqlMessageStorage, SqlRunnerStorage } from "effect/unstable/cluster"
import { HttpApi, HttpApiBuilder } from "effect/unstable/httpapi"
import { Rpc, RpcGroup, RpcServer } from "effect/unstable/rpc"
import { NodeClusterHttp, NodeClusterSocket } from "@effect/platform-node"

${marker('statement', 'body', 'export const program = Effect.void')}`
})

export const effectV4ClusterFoundationalGraphTemplateInputs = [
	ClusterEntityMakeTemplate,
	ClusterEntityFromRpcGroupTemplate,
	ClusterEntityPersistedTemplate,
	ClusterEntityTransactionalTemplate,
	ClusterEntityUninterruptibleTemplate,
	ClusterEntityShardGroupTemplate,
	ClusterEntityGetShardGroupTemplate,
	ClusterEntityGetShardIdTemplate,
	ClusterEntityClientTemplate,
	ClusterEntityToLayerTemplate,
	ClusterEntityKeepAliveTemplate,
	ClusterEntityCurrentAddressTemplate,
	ClusterEntityCurrentRunnerAddressTemplate,
	ClusterEntityMakeTestClientTemplate,
	ClusterEntityProxyToRpcGroupTemplate,
	ClusterEntityProxyToHttpApiGroupTemplate,
	ClusterEntityProxyRpcHandlersLayerTemplate,
	ClusterEntityProxyHttpApiLayerTemplate,
	ClusterShardingLayerTemplate,
	ClusterShardingActiveEntityCountTemplate,
	ClusterShardingRegistrationEventsTemplate,
	ClusterShardingGetShardIdTemplate,
	ClusterShardingGetSnowflakeTemplate,
	ClusterShardingHasShardIdTemplate,
	ClusterShardingIsShutdownTemplate,
	ClusterShardingMakeClientTemplate,
	ClusterShardingPollStorageTemplate,
	ClusterShardingRegisterSingletonTemplate,
	ClusterShardingResetTemplate,
	ClusterRunnerAddressMakeTemplate,
	ClusterRunnerMakeTemplate,
	ClusterEntityAddressMakeTemplate,
	ClusterMessageStorageMemoryLayerTemplate,
	ClusterMessageStorageNoopLayerTemplate,
	ClusterRunnerStorageMemoryLayerTemplate,
	ClusterSqlMessageStorageLayerTemplate,
	ClusterSqlMessageStorageLayerWithTemplate,
	ClusterSqlRunnerStorageLayerTemplate,
	ClusterSqlRunnerStorageLayerWithTemplate,
	ClusterSingleRunnerLayerTemplate,
	ClusterSocketRunnerLayerTemplate,
	ClusterSocketRunnerClientOnlyLayerTemplate,
	NodeClusterHttpLayerTemplate,
	NodeClusterSocketLayerTemplate,
	NodeClusterHttpK8sClientLayerTemplate,
	NodeClusterSocketK8sClientLayerTemplate,
	ClusterDistributedSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
