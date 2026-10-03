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
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import {
	clusterClientErrorType,
	cryptoRequirement,
	entityInput,
	httpRouterRequirement,
	messageStorageRequirement,
	runnerHealthRequirement,
	runnersRequirement,
	runnerStorageRequirement,
	shardingConfigRequirement,
	shardingRequirement,
	sqlClientRequirement,
	sqlErrorType
} from './effect-cluster-template-helpers.js'

/** Production-oriented cluster / sharding / distributed-service compositions. */
const VERSION = '1.0.0' as const
const scopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'
const rpcServerProtocolRequirement = '{ readonly __rpcServerProtocolRequirement: "RpcServer.Protocol" }'
const httpApiRuntimeRequirements = '{ readonly __httpApiRuntimeRequirements: "HttpApiBuilderRuntime" }'

const layerInput = (
	description: string,
	provided = 'unknown',
	error = 'unknown',
	requirements = 'unknown'
) => typedExpressionInput(description, layerType(provided, error, requirements))

const serviceTagInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

export const ClusterPersistedTransactionalEntityTemplate = defineTemplate({
	modelId: 'ClusterPersistedTransactionalEntity', version: VERSION,
	description: 'Configures all current Entity RPCs for persisted delivery and MessageStorage transaction wrapping.',
	inputs: { entity: entityInput('Entity requiring durable transactional request handling.') },
	output: expressionOutput('Persisted transactional Entity.'),
	source: `${marker('expression', 'entity', 'Counter')}.annotateRpcs(ClusterSchema.Persisted, true).annotateRpcs(ClusterSchema.WithTransaction, true)`
})

export const ClusterPersistedUninterruptibleEntityTemplate = defineTemplate({
	modelId: 'ClusterPersistedUninterruptibleEntity', version: VERSION,
	description: 'Configures all current Entity RPCs as persisted and uninterruptible on both client and server.',
	inputs: { entity: entityInput('Entity requiring durable uninterruptible delivery.') },
	output: expressionOutput('Persisted uninterruptible Entity.'),
	source: `${marker('expression', 'entity', 'Counter')}.annotateRpcs(ClusterSchema.Persisted, true).annotateRpcs(ClusterSchema.Uninterruptible, true)`
})

export const ClusterObservedEntityLayerTemplate = defineTemplate({
	modelId: 'ClusterObservedEntityLayer', version: VERSION,
	description: 'Registers Entity handlers with explicit concurrency/mailbox/lifecycle options and cluster span attributes.',
	typeParameters: typeParameters(['R', 'Handler construction and service requirements.']),
	inputs: {
		entity: entityInput('Entity definition.'),
		handlers: valueInput('Entity handler object or Effect producing it.'),
		concurrency: effectValueInput('Handler concurrency.', { ts: 'number | "unbounded"' }),
		mailboxCapacity: effectValueInput('Entity mailbox capacity.', { ts: 'number | "unbounded"' }),
		maxIdleTime: effectValueInput('Entity idle timeout.'),
		spanAttributes: effectValueInput('Static tracing attributes.', { ts: 'Readonly<Record<string, string>>' })
	},
	output: expressionOutput('Observed Entity registration Layer.', layerType('never', 'never', `${shardingRequirement} | {{R}}`)),
	source: `${marker('expression', 'entity', 'Counter')}.toLayer(${marker('expression', 'handlers', '{}')}, { concurrency: ${marker('expression', 'concurrency', '16')}, mailboxCapacity: ${marker('expression', 'mailboxCapacity', '1024')}, maxIdleTime: ${marker('expression', 'maxIdleTime', '"5 minutes"')}, spanAttributes: ${marker('expression', 'spanAttributes', '{ component: "entity" }')} })`
})

export const ClusterEntityClientServiceLayerTemplate = defineTemplate({
	modelId: 'ClusterEntityClientServiceLayer', version: VERSION,
	description: 'Exposes an Entity client factory as an application Context service.',
	typeParameters: typeParameters(['I', 'Provided client-service identifier type.']),
	inputs: {
		service: serviceTagInput('Context service key for the Entity client factory.', '{{I}}', '(entityId: string) => unknown'),
		entity: entityInput('Entity whose client factory is exposed.')
	},
	output: expressionOutput('Entity client-service Layer.', layerType('{{I}}', 'never', shardingRequirement)),
	source: `Layer.effect(${marker('expression', 'service', 'CounterClient')}, ${marker('expression', 'entity', 'Counter')}.client)`
})

export const ClusterObservedEntityCallTemplate = defineTemplate({
	modelId: 'ClusterObservedEntityCall', version: VERSION,
	description: 'Resolves an Entity-id client and runs a typed call inside an application tracing span.',
	typeParameters: typeParameters(['A', 'Call success type.'], ['E', 'Call error type.'], ['R', 'Call requirements.']),
	inputs: {
		entity: entityInput('Entity used to resolve the client.'),
		entityId: effectValueInput('Target entity id.', { ts: 'string' }),
		call: callbackInput('Effectful operation over the resolved Entity client.', effectReturningCallbackType('client: unknown', '{{A}}', '{{E}}', '{{R}}')),
		spanName: effectValueInput('Application span name.', { ts: 'string' })
	},
	output: expressionOutput('Observed Entity call Effect.', effectType('{{A}}', `{{E}} | ${clusterClientErrorType}`, `${shardingRequirement} | {{R}}`)),
	source: `Effect.gen(function* () {
	const makeClient = yield* ${marker('expression', 'entity', 'Counter')}.client
	const client = makeClient(${marker('expression', 'entityId', '"id"')})
	return yield* Effect.withSpan((${marker('expression', 'call', '(_client: unknown) => Effect.void')})(client), ${marker('expression', 'spanName', '"cluster.entity.call"')})
})`
})

export const ClusterDistributedSingletonLayerTemplate = defineTemplate({
	modelId: 'ClusterDistributedSingletonLayer', version: VERSION,
	description: 'Runs one scoped application Effect under cluster-wide singleton ownership.',
	typeParameters: typeParameters(['E', 'Singleton body error type.'], ['R', 'Singleton body requirements.']),
	inputs: {
		name: effectValueInput('Stable singleton name.', { ts: 'string' }),
		run: effectSourceInput('Singleton body.', effectType('void', '{{E}}', '{{R}}')),
		shardGroup: effectValueInput('Optional singleton shard group.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Cluster singleton Layer.', layerType('never', 'never', `${shardingRequirement} | {{R}}`)),
	source: `Layer.effectDiscard(Effect.flatMap(Sharding.Sharding, sharding => sharding.registerSingleton(${marker('expression', 'name', '"leader"')}, ${marker('expression', 'run', 'Effect.void')}, { shardGroup: ${marker('expression', 'shardGroup', 'undefined')} })))`
})

export const ClusterEntityRpcBoundaryLayerTemplate = defineTemplate({
	modelId: 'ClusterEntityRpcBoundaryLayer', version: VERSION,
	description: 'Derives the RPC proxy contract for an Entity and wires proxy handlers into RpcServer.',
	inputs: { entity: entityInput('Entity exposed as an RPC proxy.') },
	output: expressionOutput('Entity RPC proxy server Layer.', layerType('never', 'never', `${shardingRequirement} | ${rpcServerProtocolRequirement} | unknown`)),
	source: `(() => {
	const entity = ${marker('expression', 'entity', 'Counter')}
	const group = EntityProxy.toRpcGroup(entity)
	return Layer.provide(RpcServer.layer(group), EntityProxyServer.layerRpcHandlers(entity))
})()`
})

export const ClusterEntityHttpBoundaryLayerTemplate = defineTemplate({
	modelId: 'ClusterEntityHttpBoundaryLayer', version: VERSION,
	description: 'Derives an HttpApi proxy group for an Entity and wires the generated handlers into HttpApiBuilder.',
	inputs: {
		apiId: effectValueInput('HttpApi identifier.', { ts: 'string' }),
		groupId: effectValueInput('Generated proxy group identifier.', { ts: 'string' }),
		entity: entityInput('Entity exposed over HTTP.')
	},
	output: expressionOutput('Entity HTTP proxy boundary Layer.', layerType('never', 'never', `${shardingRequirement} | ${httpRouterRequirement} | ${httpApiRuntimeRequirements} | unknown`)),
	source: `(() => {
	const entity = ${marker('expression', 'entity', 'Counter')}
	const groupId = ${marker('expression', 'groupId', '"counter"')}
	const api = HttpApi.make(${marker('expression', 'apiId', '"ClusterApi"')}).add(EntityProxy.toHttpApiGroup(groupId, entity))
	return Layer.provide(HttpApiBuilder.layer(api), EntityProxyServer.layerHttpApi(api, groupId, entity))
})()`
})

export const ClusterSqlPersistenceLayerTemplate = defineTemplate({
	modelId: 'ClusterSqlPersistenceLayer', version: VERSION,
	description: 'Provides SQL-backed MessageStorage and RunnerStorage together using the same stable table prefix.',
	inputs: { prefix: effectValueInput('Stable shared cluster SQL prefix.', { ts: 'string | undefined' }) },
	output: expressionOutput('Cluster SQL persistence Layer.', layerType(`${messageStorageRequirement} | ${runnerStorageRequirement}`, sqlErrorType, `${sqlClientRequirement} | ${shardingConfigRequirement} | ${cryptoRequirement}`)),
	source: `(() => {
	const prefix = ${marker('expression', 'prefix', '"cluster"')}
	return Layer.merge(SqlMessageStorage.layerWith({ prefix }), SqlRunnerStorage.layerWith({ prefix }))
})()`
})

export const ClusterLocalPersistenceLayerTemplate = defineTemplate({
	modelId: 'ClusterLocalPersistenceLayer', version: VERSION,
	description: 'Provides in-memory MessageStorage and RunnerStorage for tests/local cluster simulations.',
	inputs: {},
	output: expressionOutput('Local in-memory cluster persistence Layer.', layerType(`${messageStorageRequirement} | ${runnerStorageRequirement}`, 'never', shardingConfigRequirement)),
	source: 'Layer.merge(MessageStorage.layerMemory, RunnerStorage.layerMemory)'
})

export const ClusterCoreRuntimeLayerTemplate = defineTemplate({
	modelId: 'ClusterCoreRuntimeLayer', version: VERSION,
	description: 'Assembles the low-level Sharding runtime from explicit configuration, runners, storage, and health Layers.',
	typeParameters: typeParameters(['E', 'Infrastructure Layer error union.'], ['R', 'Infrastructure Layer requirements.']),
	inputs: {
		config: layerInput('Layer providing ShardingConfig.', shardingConfigRequirement, '{{E}}', '{{R}}'),
		runners: layerInput('Layer providing Runners.', runnersRequirement, '{{E}}', '{{R}}'),
		messageStorage: layerInput('Layer providing MessageStorage.', messageStorageRequirement, '{{E}}', '{{R}}'),
		runnerStorage: layerInput('Layer providing RunnerStorage.', runnerStorageRequirement, '{{E}}', '{{R}}'),
		runnerHealth: layerInput('Layer providing RunnerHealth.', runnerHealthRequirement, '{{E}}', '{{R}}')
	},
	output: expressionOutput('Fully supplied Sharding runtime Layer.', layerType(shardingRequirement, '{{E}}', '{{R}}')),
	source: `Layer.provide(Sharding.layer, Layer.mergeAll(
	${marker('expression', 'config', 'Layer.empty')},
	${marker('expression', 'runners', 'Layer.empty')},
	${marker('expression', 'messageStorage', 'Layer.empty')},
	${marker('expression', 'runnerStorage', 'Layer.empty')},
	${marker('expression', 'runnerHealth', 'Layer.empty')}
))`
})

export const NodeClusterSqlHttpLayerTemplate = defineTemplate({
	modelId: 'NodeClusterSqlHttpLayer', version: VERSION,
	description: 'Builds a multi-runner Node HTTP cluster with SQL-backed cluster storage.',
	inputs: { options: valueInput('Additional NodeClusterHttp options except transport/storage/clientOnly.') },
	output: expressionOutput('Node SQL/HTTP cluster Layer.', layerType(`${shardingRequirement} | ${runnersRequirement} | ${messageStorageRequirement}`, 'unknown', sqlClientRequirement)),
	source: `NodeClusterHttp.layer({ ...${marker('expression', 'options', '{}')}, transport: "http", storage: "sql", clientOnly: false })`
})

export const NodeClusterSqlWebSocketLayerTemplate = defineTemplate({
	modelId: 'NodeClusterSqlWebSocketLayer', version: VERSION,
	description: 'Builds a multi-runner Node WebSocket cluster with SQL-backed cluster storage.',
	inputs: { options: valueInput('Additional NodeClusterHttp options except transport/storage/clientOnly.') },
	output: expressionOutput('Node SQL/WebSocket cluster Layer.', layerType(`${shardingRequirement} | ${runnersRequirement} | ${messageStorageRequirement}`, 'unknown', sqlClientRequirement)),
	source: `NodeClusterHttp.layer({ ...${marker('expression', 'options', '{}')}, transport: "websocket", storage: "sql", clientOnly: false })`
})

export const NodeClusterSqlSocketLayerTemplate = defineTemplate({
	modelId: 'NodeClusterSqlSocketLayer', version: VERSION,
	description: 'Builds a multi-runner Node raw-socket cluster with SQL-backed cluster storage.',
	inputs: { options: valueInput('Additional NodeClusterSocket options except storage/clientOnly.') },
	output: expressionOutput('Node SQL/socket cluster Layer.', layerType(`${shardingRequirement} | ${runnersRequirement} | ${messageStorageRequirement}`, 'unknown', sqlClientRequirement)),
	source: `NodeClusterSocket.layer({ ...${marker('expression', 'options', '{}')}, storage: "sql", clientOnly: false })`
})

export const NodeClusterLocalHttpLayerTemplate = defineTemplate({
	modelId: 'NodeClusterLocalHttpLayer', version: VERSION,
	description: 'Builds a Node HTTP cluster with local in-process storage for development or ephemeral deployments.',
	inputs: { options: valueInput('Additional NodeClusterHttp options except transport/storage/clientOnly.') },
	output: expressionOutput('Node local/HTTP cluster Layer.', layerType(`${shardingRequirement} | ${runnersRequirement} | ${messageStorageRequirement}`, 'unknown', 'never')),
	source: `NodeClusterHttp.layer({ ...${marker('expression', 'options', '{}')}, transport: "http", storage: "local", clientOnly: false })`
})

export const NodeClusterHttpClientOnlySqlLayerTemplate = defineTemplate({
	modelId: 'NodeClusterHttpClientOnlySqlLayer', version: VERSION,
	description: 'Joins a Node HTTP cluster as a SQL-backed client-only participant without hosting shards.',
	inputs: { options: valueInput('Additional NodeClusterHttp client options except transport/storage/clientOnly.') },
	output: expressionOutput('Node HTTP client-only cluster Layer.', layerType(`${shardingRequirement} | ${runnersRequirement} | ${messageStorageRequirement}`, '{ readonly _tag: "ConfigError" }', sqlClientRequirement)),
	source: `NodeClusterHttp.layer({ ...${marker('expression', 'options', '{}')}, transport: "http", storage: "sql", clientOnly: true })`
})

export const NodeClusterSocketClientOnlySqlLayerTemplate = defineTemplate({
	modelId: 'NodeClusterSocketClientOnlySqlLayer', version: VERSION,
	description: 'Joins a Node socket cluster as a SQL-backed client-only participant without hosting shards.',
	inputs: { options: valueInput('Additional NodeClusterSocket client options except storage/clientOnly.') },
	output: expressionOutput('Node socket client-only cluster Layer.', layerType(`${shardingRequirement} | ${runnersRequirement} | ${messageStorageRequirement}`, '{ readonly _tag: "ConfigError" }', sqlClientRequirement)),
	source: `NodeClusterSocket.layer({ ...${marker('expression', 'options', '{}')}, storage: "sql", clientOnly: true })`
})

export const ClusterHealthSnapshotTemplate = defineTemplate({
	modelId: 'ClusterHealthSnapshot', version: VERSION,
	description: 'Captures local cluster liveness indicators: active entity count and Sharding shutdown state.',
	inputs: {},
	output: expressionOutput('Cluster health snapshot Effect.', effectType('{ readonly activeEntityCount: number; readonly isShutdown: boolean }', 'never', shardingRequirement)),
	source: 'Effect.flatMap(Sharding.Sharding, sharding => Effect.all({ activeEntityCount: sharding.activeEntityCount, isShutdown: sharding.isShutdown }))'
})

export const ClusterEntityServiceWithRuntimeLayerTemplate = defineTemplate({
	modelId: 'ClusterEntityServiceWithRuntimeLayer', version: VERSION,
	description: 'Combines a closed cluster runtime Layer with an Entity handler Layer while retaining the Sharding service for clients and health checks.',
	typeParameters: typeParameters(['ECluster', 'Cluster runtime error type.'], ['RCluster', 'Cluster runtime requirements.'], ['EEntity', 'Entity Layer error type.'], ['REntity', 'Additional Entity Layer requirements.']),
	inputs: {
		cluster: layerInput('Cluster Layer providing Sharding.', shardingRequirement, '{{ECluster}}', '{{RCluster}}'),
		entity: layerInput('Entity handler Layer requiring Sharding.', 'never', '{{EEntity}}', `${shardingRequirement} | {{REntity}}`)
	},
	output: expressionOutput('Cluster runtime plus Entity handler Layer.', layerType(shardingRequirement, '{{ECluster}} | {{EEntity}}', '{{RCluster}} | {{REntity}}')),
	source: `Layer.provideMerge(${marker('expression', 'entity', 'Layer.empty')}, ${marker('expression', 'cluster', 'Layer.empty')})`
})

export const effectV4ClusterDistributedServiceGraphTemplateInputs = [
	ClusterPersistedTransactionalEntityTemplate,
	ClusterPersistedUninterruptibleEntityTemplate,
	ClusterObservedEntityLayerTemplate,
	ClusterEntityClientServiceLayerTemplate,
	ClusterObservedEntityCallTemplate,
	ClusterDistributedSingletonLayerTemplate,
	ClusterEntityRpcBoundaryLayerTemplate,
	ClusterEntityHttpBoundaryLayerTemplate,
	ClusterSqlPersistenceLayerTemplate,
	ClusterLocalPersistenceLayerTemplate,
	ClusterCoreRuntimeLayerTemplate,
	NodeClusterSqlHttpLayerTemplate,
	NodeClusterSqlWebSocketLayerTemplate,
	NodeClusterSqlSocketLayerTemplate,
	NodeClusterLocalHttpLayerTemplate,
	NodeClusterHttpClientOnlySqlLayerTemplate,
	NodeClusterSocketClientOnlySqlLayerTemplate,
	ClusterHealthSnapshotTemplate,
	ClusterEntityServiceWithRuntimeLayerTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
