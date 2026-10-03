import type { TypeDescriptor } from '../src/templates.js'
import { nominalType } from './effect-template-helpers.js'

/** Shared Effect v4 RPC template descriptors. */
export const rpcScopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'
export const rpcClientProtocolRequirement = '{ readonly __rpcClientProtocolRequirement: "RpcClient.Protocol" }'
export const rpcServerProtocolRequirement = '{ readonly __rpcServerProtocolRequirement: "RpcServer.Protocol" }'
export const rpcSerializationRequirement = '{ readonly __rpcSerializationRequirement: "RpcSerialization" }'
export const rpcHttpClientRequirement = '{ readonly __httpClientRequirement: "HttpClient" }'
export const rpcHttpRouterRequirement = '{ readonly __httpRouterRequirement: "HttpRouter" }'
export const rpcSocketRequirement = '{ readonly __socketRequirement: "Socket" }'
export const rpcSocketServerRequirement = '{ readonly __socketServerRequirement: "SocketServer" }'

export const rpcClientErrorType = '{ readonly _tag: "RpcClientError"; readonly reason?: string }'

export const rpcType = (
	tag = 'string',
	payload = 'unknown',
	success = 'unknown',
	error = 'never',
	middleware = 'never',
	requires = 'never',
	stream = 'false'
): TypeDescriptor => nominalType('effect/unstable/rpc/Rpc', {
	rpcTag: tag,
	rpcPayload: payload,
	rpcSuccess: success,
	rpcError: error,
	rpcMiddleware: middleware,
	rpcRequires: requires,
	rpcStream: stream
})

export const rpcGroupType = (rpcs = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/rpc/RpcGroup', { rpcGroupRpcs: rpcs })

export const rpcClientType = (rpcs = 'unknown', error = rpcClientErrorType): TypeDescriptor =>
	nominalType('effect/unstable/rpc/RpcClient', { rpcClientRpcs: rpcs, rpcClientError: error })

export const rpcHandlerType = (tag = 'string'): TypeDescriptor =>
	nominalType('effect/unstable/rpc/RpcHandler', { rpcHandlerTag: tag })

export const rpcHandlersType = (rpcs = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/rpc/Rpc.Handler', { rpcHandlersRpcs: rpcs })

export const rpcHandlerContextType = (rpcs = 'unknown'): TypeDescriptor =>
	nominalType('effect/Context', { rpcHandlerContextRpcs: rpcs })

export const rpcClientProtocolType = (): TypeDescriptor =>
	nominalType('effect/unstable/rpc/RpcClient.Protocol')

export const rpcServerProtocolType = (): TypeDescriptor =>
	nominalType('effect/unstable/rpc/RpcServer.Protocol')

export const rpcSerializationType = (): TypeDescriptor =>
	nominalType('effect/unstable/rpc/RpcSerialization')

export const rpcMiddlewareServiceType = (
	provides = 'never',
	error = 'never',
	requires = 'never',
	clientError = 'never',
	requiredForClient = 'false'
): TypeDescriptor => nominalType('effect/unstable/rpc/RpcMiddleware.Service', {
	rpcMiddlewareProvides: provides,
	rpcMiddlewareError: error,
	rpcMiddlewareRequires: requires,
	rpcMiddlewareClientError: clientError,
	rpcMiddlewareRequiredForClient: requiredForClient
})

export const rpcMiddlewareClientRequirementType = (middleware = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/rpc/RpcMiddleware.ForClient', { rpcRequiredMiddleware: middleware })
