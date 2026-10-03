import { defineTemplate } from './sample-definition.js'
import {
	effectDurationInput,
	effectSourceInput,
	effectType,
	effectValueInput
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	identifierInput,
	layerType,
	marker,
	scheduleType,
	schemaType,
	statementOutput,
	stringInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	rpcClientErrorType,
	rpcClientType,
	rpcGroupType,
	rpcHttpClientRequirement,
	rpcHttpRouterRequirement,
	rpcMiddlewareServiceType,
	rpcSerializationRequirement,
	rpcType
} from './effect-rpc-template-helpers.js'

/** Higher-level Effect v4 RPC service-boundary compositions. */
const VERSION = '1.0.0' as const
const groupInput = (description: string, rpcs = 'unknown') => typedExpressionInput(description, rpcGroupType(rpcs))
const middlewareInput = (description: string) => typedExpressionInput(description, rpcMiddlewareServiceType())
const serviceTagInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

export const RpcUnaryProcedureDeclarationTemplate = defineTemplate({
	modelId: 'RpcUnaryProcedureDeclaration', version: VERSION, description: 'Declares an exported unary RPC contract from payload, success, and typed-error schemas.',
	inputs: {
		name: identifierInput('Exported RPC binding name.'),
		tag: stringInput('Wire-level RPC tag.'),
		payload: typedExpressionInput('Payload Schema.', schemaType()),
		success: typedExpressionInput('Success Schema.', schemaType()),
		error: typedExpressionInput('Typed error Schema.', schemaType())
	},
	output: statementOutput('Exported unary RPC declaration.'),
	source: `export const ${marker('identifier', 'name', 'GetItem')} = Rpc.make(${marker('string', 'tag', '"GetItem"')}, { payload: ${marker('expression', 'payload', 'Schema.Void')}, success: ${marker('expression', 'success', 'Schema.Void')}, error: ${marker('expression', 'error', 'Schema.Never')} })`
})

export const RpcStreamingProcedureDeclarationTemplate = defineTemplate({
	modelId: 'RpcStreamingProcedureDeclaration', version: VERSION, description: 'Declares an exported streaming RPC contract.',
	inputs: {
		name: identifierInput('Exported RPC binding name.'),
		tag: stringInput('Wire-level RPC tag.'),
		payload: typedExpressionInput('Payload Schema.', schemaType()),
		element: typedExpressionInput('Stream element Schema.', schemaType()),
		error: typedExpressionInput('Stream error Schema.', schemaType())
	},
	output: statementOutput('Exported streaming RPC declaration.'),
	source: `export const ${marker('identifier', 'name', 'WatchItems')} = Rpc.make(${marker('string', 'tag', '"WatchItems"')}, { payload: ${marker('expression', 'payload', 'Schema.Void')}, success: ${marker('expression', 'element', 'Schema.Unknown')}, error: ${marker('expression', 'error', 'Schema.Never')}, stream: true })`
})

export const RpcHandlersLayerTemplate = defineTemplate({
	modelId: 'RpcHandlersLayer', version: VERSION, description: 'Creates the complete handler Layer for an RPC service boundary.',
	typeParameters: typeParameters(['E', 'Handler Layer construction error.'], ['R', 'Handler implementation requirements.']),
	inputs: { group: groupInput('RPC contract group.'), handlers: valueInput('Handler object or Effect constructing the handler object.') },
	output: expressionOutput('RPC handler Layer.', layerType('unknown', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}.toLayer(${marker('expression', 'handlers', '{ Ping: () => Effect.void }')})`
})

export const RpcJsonHttpServerBoundaryLayerTemplate = defineTemplate({
	modelId: 'RpcJsonHttpServerBoundaryLayer', version: VERSION, description: 'Builds a JSON-serialized HTTP RPC server boundary including its handler Layer.',
	typeParameters: typeParameters(['E', 'Handler construction error.'], ['R', 'Handler and middleware requirements.']),
	inputs: {
		group: groupInput('RPC service group.'),
		handlers: valueInput('Handler object or Effect constructing handlers.'),
		path: effectValueInput('HTTP RPC path.', { ts: 'string' }),
		options: valueInput('Server tracing/concurrency options merged into layerHttp.')
	},
	output: expressionOutput('JSON HTTP RPC server boundary Layer.', layerType('never', '{{E}}', `${rpcHttpRouterRequirement} | {{R}}`)),
	source: `(() => {\n\tconst group = ${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}\n\treturn Layer.provide(Layer.provide(RpcServer.layerHttp({ ...${marker('expression', 'options', '{}')}, group, path: ${marker('expression', 'path', '"/rpc"')}, protocol: "http" }), group.toLayer(${marker('expression', 'handlers', '{ Ping: () => Effect.void }')})), RpcSerialization.layerJson)\n})()`
})

export const RpcJsonWebsocketServerBoundaryLayerTemplate = defineTemplate({
	modelId: 'RpcJsonWebsocketServerBoundaryLayer', version: VERSION, description: 'Builds a JSON-serialized WebSocket RPC server boundary including its handler Layer.',
	typeParameters: typeParameters(['E', 'Handler construction error.'], ['R', 'Handler and middleware requirements.']),
	inputs: {
		group: groupInput('RPC service group.'),
		handlers: valueInput('Handler object or Effect constructing handlers.'),
		path: effectValueInput('WebSocket RPC path.', { ts: 'string' }),
		options: valueInput('Server tracing/concurrency options merged into layerHttp.')
	},
	output: expressionOutput('JSON WebSocket RPC server boundary Layer.', layerType('never', '{{E}}', `${rpcHttpRouterRequirement} | {{R}}`)),
	source: `(() => {\n\tconst group = ${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}\n\treturn Layer.provide(Layer.provide(RpcServer.layerHttp({ ...${marker('expression', 'options', '{}')}, group, path: ${marker('expression', 'path', '"/rpc"')}, protocol: "websocket" }), group.toLayer(${marker('expression', 'handlers', '{ Ping: () => Effect.void }')})), RpcSerialization.layerJson)\n})()`
})

export const RpcJsonHttpClientServiceLayerTemplate = defineTemplate({
	modelId: 'RpcJsonHttpClientServiceLayer', version: VERSION, description: 'Exposes a typed JSON-over-HTTP RpcClient as a scoped application service.',
	typeParameters: typeParameters(['I', 'Client service identifier type.'], ['Rpcs', 'RPC union in the group.'], ['RClient', 'Required client middleware services.']),
	inputs: {
		clientTag: serviceTagInput('Application service key for the generated client.', '{{I}}', rpcClientType('{{Rpcs}}').ts),
		group: groupInput('RPC group.', '{{Rpcs}}'),
		url: effectValueInput('Remote RPC URL.', { ts: 'string' }),
		options: valueInput('RpcClient.make options.')
	},
	output: expressionOutput('Scoped HTTP RPC client service Layer.', layerType('{{I}}', 'never', `${rpcHttpClientRequirement} | {{RClient}}`)),
	source: `Layer.provide(Layer.provide(Layer.effect(${marker('expression', 'clientTag', 'RemoteClient')}, RpcClient.make(${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}, ${marker('expression', 'options', '{}')})), RpcClient.layerProtocolHttp({ url: ${marker('expression', 'url', '"http://localhost:3000/rpc"')} })), RpcSerialization.layerJson)`
})

export const RpcJsonRpcHttpClientServiceLayerTemplate = defineTemplate({
	modelId: 'RpcJsonRpcHttpClientServiceLayer', version: VERSION, description: 'Exposes a typed JSON-RPC-over-HTTP client as a scoped application service.',
	typeParameters: typeParameters(['I', 'Client service identifier type.'], ['Rpcs', 'RPC union in the group.'], ['RClient', 'Required client middleware services.']),
	inputs: {
		clientTag: serviceTagInput('Application service key for the generated client.', '{{I}}', rpcClientType('{{Rpcs}}').ts),
		group: groupInput('RPC group.', '{{Rpcs}}'),
		url: effectValueInput('Remote RPC URL.', { ts: 'string' }),
		serializationOptions: valueInput('JSON-RPC serialization options.')
	},
	output: expressionOutput('Scoped JSON-RPC HTTP client service Layer.', layerType('{{I}}', 'never', `${rpcHttpClientRequirement} | {{RClient}}`)),
	source: `Layer.provide(Layer.provide(Layer.effect(${marker('expression', 'clientTag', 'RemoteClient')}, RpcClient.make(${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')})), RpcClient.layerProtocolHttp({ url: ${marker('expression', 'url', '"http://localhost:3000/rpc"')} })), RpcSerialization.layerJsonRpc(${marker('expression', 'serializationOptions', '{}')}))`
})

export const RpcAuthMiddlewareLayerTemplate = defineTemplate({
	modelId: 'RpcAuthMiddlewareLayer', version: VERSION, description: 'Builds server RPC middleware that authenticates request headers and provides the authenticated principal to handlers.',
	typeParameters: typeParameters(['I', 'Principal service identifier type.'], ['User', 'Authenticated principal type.'], ['E', 'Authentication error type.'], ['R', 'Authentication requirements.']),
	inputs: {
		middleware: middlewareInput('RPC authentication middleware service key.'),
		principalTag: serviceTagInput('Context.Service key made available to handlers.', '{{I}}', '{{User}}'),
		authenticate: callbackInput('Authentication function receiving request headers.', effectReturningCallbackType('headers: unknown', '{{User}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Authentication middleware Layer.', layerType(rpcMiddlewareServiceType('{{I}}', '{{E}}', '{{R}}').ts, 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'middleware', 'AuthMiddleware')}, (effect, options) => Effect.flatMap((${marker('expression', 'authenticate', '(_headers: unknown) => Effect.fail(new Error("unauthorized"))')})(options.headers), principal => Effect.provideService(effect, ${marker('expression', 'principalTag', 'CurrentUser')}, principal)))`
})

export const RpcRequestContextMiddlewareLayerTemplate = defineTemplate({
	modelId: 'RpcRequestContextMiddlewareLayer', version: VERSION, description: 'Builds server middleware that exposes RPC request metadata as a Context.Service to handlers.',
	typeParameters: typeParameters(['I', 'Request-context service identifier type.'], ['C', 'Request-context value type.']),
	inputs: {
		middleware: middlewareInput('RPC request-context middleware service key.'),
		contextTag: serviceTagInput('Context.Service key exposed to handlers.', '{{I}}', '{{C}}'),
		makeContext: callbackInput('Pure mapper from RPC middleware request metadata to the service value.', { ts: '(options: unknown) => {{C}}' })
	},
	output: expressionOutput('Request-context middleware Layer.', layerType(rpcMiddlewareServiceType('{{I}}').ts, 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'middleware', 'RequestContextMiddleware')}, (effect, options) => Effect.provideService(effect, ${marker('expression', 'contextTag', 'RequestContext')}, (${marker('expression', 'makeContext', 'options => options')})(options)))`
})

export const RpcBearerTokenClientCallTemplate = defineTemplate({
	modelId: 'RpcBearerTokenClientCall', version: VERSION, description: 'Runs one RPC client call with an Authorization bearer token header.',
	typeParameters: typeParameters(['A', 'Call success type.'], ['E', 'Call error type.'], ['R', 'Call requirements.']),
	inputs: { call: effectSourceInput('RPC client call.', effectType('{{A}}', '{{E}}', '{{R}}')), token: effectValueInput('Bearer token.', { ts: 'string' }) },
	output: expressionOutput('Authenticated RPC client call.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `RpcClient.withHeaders(${marker('expression', 'call', 'Effect.void')}, { authorization: "Bearer " + ${marker('expression', 'token', '"token"')} })`
})

export const RpcResilientObservedClientCallTemplate = defineTemplate({
	modelId: 'RpcResilientObservedClientCall', version: VERSION, description: 'Runs an RPC call with request headers, per-attempt timeout, scheduled retry, and a tracing span.',
	typeParameters: typeParameters(['A', 'RPC success type.'], ['E', 'RPC error type.'], ['R', 'RPC call requirements.'], ['RSchedule', 'Retry Schedule requirements.']),
	inputs: {
		call: effectSourceInput('RPC call Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		headers: valueInput('Outgoing RPC headers.'),
		timeout: effectDurationInput('Per-attempt timeout.'),
		retry: typedExpressionInput('Retry Schedule.', scheduleType('unknown', 'unknown', '{{RSchedule}}')),
		spanName: effectValueInput('Tracing span name.', { ts: 'string' })
	},
	output: expressionOutput('Observed resilient RPC client call.', effectType('{{A}}', 'unknown', '{{R}} | {{RSchedule}}')),
	source: `Effect.withSpan(Effect.retry(Effect.timeout(RpcClient.withHeaders(${marker('expression', 'call', 'Effect.void')}, ${marker('expression', 'headers', '{}')}), ${marker('expression', 'timeout', '1000')}), ${marker('expression', 'retry', 'Schedule.recurs(2)')}), ${marker('expression', 'spanName', '"rpc.client"')})`
})

export const RpcAuthenticatedJsonHttpServerBoundaryLayerTemplate = defineTemplate({
	modelId: 'RpcAuthenticatedJsonHttpServerBoundaryLayer', version: VERSION, description: 'Builds an HTTP RPC boundary with group middleware, middleware Layer, handlers, and JSON serialization.',
	typeParameters: typeParameters(['EMiddleware', 'Middleware Layer error.'], ['RMiddleware', 'Middleware Layer requirements.'], ['EHandlers', 'Handler Layer error.'], ['RHandlers', 'Handler requirements.']),
	inputs: {
		group: groupInput('Base RPC group.'),
		middleware: middlewareInput('Middleware attached to every current RPC in the group.'),
		middlewareLayer: typedExpressionInput('Layer providing the middleware service.', layerType(rpcMiddlewareServiceType().ts, '{{EMiddleware}}', '{{RMiddleware}}')),
		handlers: valueInput('Handlers for the middleware-decorated group.'),
		path: effectValueInput('HTTP RPC path.', { ts: 'string' })
	},
	output: expressionOutput('Authenticated JSON HTTP RPC boundary Layer.', layerType('never', '{{EMiddleware}} | {{EHandlers}}', `${rpcHttpRouterRequirement} | {{RMiddleware}} | {{RHandlers}}`)),
	source: `(() => {\n\tconst group = ${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}.middleware(${marker('expression', 'middleware', 'AuthMiddleware')})\n\tconst server = RpcServer.layerHttp({ group, path: ${marker('expression', 'path', '"/rpc"')}, protocol: "http" })\n\treturn Layer.provide(Layer.provide(Layer.provide(server, group.toLayer(${marker('expression', 'handlers', '{ Ping: () => Effect.void }')})), ${marker('expression', 'middlewareLayer', 'Layer.empty')}), RpcSerialization.layerJson)\n})()`
})

export const effectV4RpcServiceBoundaryGraphTemplateInputs = [
	RpcUnaryProcedureDeclarationTemplate,
	RpcStreamingProcedureDeclarationTemplate,
	RpcHandlersLayerTemplate,
	RpcJsonHttpServerBoundaryLayerTemplate,
	RpcJsonWebsocketServerBoundaryLayerTemplate,
	RpcJsonHttpClientServiceLayerTemplate,
	RpcJsonRpcHttpClientServiceLayerTemplate,
	RpcAuthMiddlewareLayerTemplate,
	RpcRequestContextMiddlewareLayerTemplate,
	RpcBearerTokenClientCallTemplate,
	RpcResilientObservedClientCallTemplate,
	RpcAuthenticatedJsonHttpServerBoundaryLayerTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
