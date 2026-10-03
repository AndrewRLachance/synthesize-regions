import type { TypeDescriptor } from '../src/templates.js'
import { nominalType, typedExpressionInput } from './effect-template-helpers.js'

/** Shared Effect v4 Cluster template descriptors. */
export const scopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'
export const shardingRequirement = '{ readonly __clusterShardingRequirement: "Sharding" }'
export const shardingConfigRequirement = '{ readonly __clusterShardingConfigRequirement: "ShardingConfig" }'
export const runnersRequirement = '{ readonly __clusterRunnersRequirement: "Runners" }'
export const runnerRpcClientProtocolRequirement = '{ readonly __clusterRunnerRpcClientProtocolRequirement: "Runners.RpcClientProtocol" }'
export const messageStorageRequirement = '{ readonly __clusterMessageStorageRequirement: "MessageStorage" }'
export const runnerStorageRequirement = '{ readonly __clusterRunnerStorageRequirement: "RunnerStorage" }'
export const runnerHealthRequirement = '{ readonly __clusterRunnerHealthRequirement: "RunnerHealth" }'
export const rpcSerializationRequirement = '{ readonly __rpcSerializationRequirement: "RpcSerialization" }'
export const socketServerRequirement = '{ readonly __socketServerRequirement: "SocketServer" }'
export const sqlClientRequirement = '{ readonly __sqlClientRequirement: "SqlClient" }'
export const cryptoRequirement = '{ readonly __cryptoRequirement: "Crypto" }'
export const currentEntityAddressRequirement = '{ readonly __currentEntityAddressRequirement: "Entity.CurrentAddress" }'
export const currentRunnerAddressRequirement = '{ readonly __currentRunnerAddressRequirement: "Entity.CurrentRunnerAddress" }'
export const httpRouterRequirement = '{ readonly __httpRouterRequirement: "HttpRouter" }'

export const clusterClientErrorType =
	'{ readonly _tag: "MailboxFull" } | { readonly _tag: "AlreadyProcessingMessage" } | { readonly _tag: "PersistenceError" } | { readonly _tag: "EntityNotAssignedToRunner" }'
export const clusterConfigErrorType = '{ readonly _tag: "ConfigError" }'
export const clusterServeErrorType = '{ readonly _tag: "ServeError" }'
export const sqlErrorType = '{ readonly _tag: "SqlError" }'

export const entityType = (type = 'string', rpcs = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/cluster/Entity', { clusterEntityType: type, clusterEntityRpcs: rpcs })
export const rpcGroupType = (rpcs = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/rpc/RpcGroup', { clusterRpcGroupRpcs: rpcs })
export const rpcType = (): TypeDescriptor => nominalType('effect/unstable/rpc/Rpc')
export const rpcClientFactoryType = (rpcs = 'unknown'): TypeDescriptor => ({
	ts: `(entityId: string) => ${nominalType('effect/rpc/RpcClient', { clusterRpcClientRpcs: rpcs }).ts}`
})
export const httpApiType = (id = 'string', groups = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/httpapi/HttpApi', { clusterHttpApiId: id, clusterHttpApiGroups: groups })
export const shardingType = (): TypeDescriptor => nominalType('effect/cluster/Sharding')
export const shardingRegistrationEventType = (): TypeDescriptor => nominalType('effect/cluster/ShardingRegistrationEvent')
export const shardIdType = (): TypeDescriptor => nominalType('effect/unstable/cluster/ShardId')
export const snowflakeType = (): TypeDescriptor => nominalType('effect/unstable/cluster/Snowflake')
export const runnerAddressType = (): TypeDescriptor => nominalType('effect/unstable/cluster/RunnerAddress')
export const entityAddressType = (): TypeDescriptor => nominalType('effect/unstable/cluster/EntityAddress')
export const runnerType = (): TypeDescriptor => nominalType('effect/unstable/cluster/Runner')
export const messageStorageType = (): TypeDescriptor => nominalType('effect/cluster/MessageStorage')
export const runnerStorageType = (): TypeDescriptor => nominalType('effect/cluster/RunnerStorage')
export const runnersType = (): TypeDescriptor => nominalType('effect/cluster/Runners')
export const runnerHealthType = (): TypeDescriptor => nominalType('effect/cluster/RunnerHealth')
export const shardingConfigType = (): TypeDescriptor => nominalType('effect/cluster/ShardingConfig')
export const k8sHttpClientType = (): TypeDescriptor => nominalType('effect/cluster/K8sHttpClient')

export const entityInput = (description: string, type = 'string', rpcs = 'unknown') =>
	typedExpressionInput(description, entityType(type, rpcs))
export const rpcGroupInput = (description: string, rpcs = 'unknown') =>
	typedExpressionInput(description, rpcGroupType(rpcs))
export const shardingInput = (description: string) => typedExpressionInput(description, shardingType())
export const shardIdInput = (description: string) => typedExpressionInput(description, shardIdType())
export const snowflakeInput = (description: string) => typedExpressionInput(description, snowflakeType())
