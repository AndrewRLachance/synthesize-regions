import { fragmentCollectionPort } from '../src/templates.js'
import { defineTemplate } from './sample-definition.js'
import {
	effectDurationInput,
	effectSourceInput,
	effectStructuralType,
	effectType,
	effectValueInput
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	identifierInput,
	layerType,
	marker,
	nominalType,
	scheduleType,
	schemaType,
	statementCollectionInput,
	statementOutput,
	stringInput,
	tagType,
	typeCodeInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	rpcClientErrorType,
	rpcClientProtocolRequirement,
	rpcClientProtocolType,
	rpcClientType,
	rpcGroupType,
	rpcHandlerContextType,
	rpcHandlerType,
	rpcHandlersType,
	rpcHttpClientRequirement,
	rpcHttpRouterRequirement,
	rpcMiddlewareClientRequirementType,
	rpcMiddlewareServiceType,
	rpcScopeRequirement,
	rpcSerializationRequirement,
	rpcSerializationType,
	rpcServerProtocolRequirement,
	rpcServerProtocolType,
	rpcSocketRequirement,
	rpcSocketServerRequirement,
	rpcType
} from './effect-rpc-template-helpers.js'

/**
 * Effect v4 unstable RPC foundational templates.
 *
 * Runtime contract:
 *   import { Effect, Layer, Schedule, Schema, Stream } from 'effect'
 *   import { HttpClient, HttpRouter } from 'effect/unstable/http'
 *   import { Socket, SocketServer } from 'effect/unstable/socket'
 *   import { Rpc, RpcClient, RpcGroup, RpcMiddleware, RpcSerialization, RpcServer } from 'effect/unstable/rpc'
 */

const VERSION = '1.0.0' as const
const rpcInput = (description: string, tag = 'string', payload = 'unknown', success = 'unknown', error = 'never', middleware = 'never', requires = 'never', stream = 'false') =>
	typedExpressionInput(description, rpcType(tag, payload, success, error, middleware, requires, stream))
const groupInput = (description: string, rpcs = 'unknown') => typedExpressionInput(description, rpcGroupType(rpcs))
const middlewareInput = (description: string, provides = 'never', error = 'never', requires = 'never', clientError = 'never', requiredForClient = 'false') =>
	typedExpressionInput(description, rpcMiddlewareServiceType(provides, error, requires, clientError, requiredForClient))

export const RpcMakeTemplate = defineTemplate({
	modelId: 'RpcMake', version: VERSION, description: 'Creates a unary schema-backed RPC definition.',
	typeParameters: typeParameters(['Payload', 'Decoded payload type.'], ['PayloadEncoded', 'Encoded payload type.'], ['Success', 'Decoded success type.'], ['SuccessEncoded', 'Encoded success type.'], ['Error', 'Decoded typed error.'], ['ErrorEncoded', 'Encoded typed error.'], ['RPayloadDecode', 'Payload decoding services.'], ['RPayloadEncode', 'Payload encoding services.'], ['RSuccessDecode', 'Success decoding services.'], ['RSuccessEncode', 'Success encoding services.'], ['RErrorDecode', 'Error decoding services.'], ['RErrorEncode', 'Error encoding services.']),
	inputs: {
		tag: stringInput('RPC procedure tag.'),
		payload: typedExpressionInput('Payload Schema.', schemaType('{{Payload}}', '{{PayloadEncoded}}', '{{RPayloadDecode}}', '{{RPayloadEncode}}')),
		success: typedExpressionInput('Success Schema.', schemaType('{{Success}}', '{{SuccessEncoded}}', '{{RSuccessDecode}}', '{{RSuccessEncode}}')),
		error: typedExpressionInput('Typed error Schema.', schemaType('{{Error}}', '{{ErrorEncoded}}', '{{RErrorDecode}}', '{{RErrorEncode}}'))
	},
	output: expressionOutput('Unary RPC definition.', rpcType('string', '{{Payload}}', '{{Success}}', '{{Error}}')),
	source: `Rpc.make(${marker('string', 'tag', '"GetItem"')}, { payload: ${marker('expression', 'payload', 'Schema.Void')}, success: ${marker('expression', 'success', 'Schema.Void')}, error: ${marker('expression', 'error', 'Schema.Never')} })`
})

export const RpcMakeStreamTemplate = defineTemplate({
	modelId: 'RpcMakeStream', version: VERSION, description: 'Creates an RPC whose success is streamed with typed stream failures.',
	typeParameters: typeParameters(['Payload', 'Decoded payload type.'], ['PayloadEncoded', 'Encoded payload type.'], ['Element', 'Stream element type.'], ['ElementEncoded', 'Encoded stream element type.'], ['StreamError', 'Stream error type.'], ['StreamErrorEncoded', 'Encoded stream error type.']),
	inputs: {
		tag: stringInput('RPC procedure tag.'),
		payload: typedExpressionInput('Payload Schema.', schemaType('{{Payload}}', '{{PayloadEncoded}}')),
		element: typedExpressionInput('Stream element Schema.', schemaType('{{Element}}', '{{ElementEncoded}}')),
		error: typedExpressionInput('Stream error Schema.', schemaType('{{StreamError}}', '{{StreamErrorEncoded}}'))
	},
	output: expressionOutput('Streaming RPC definition.', rpcType('string', '{{Payload}}', '{{Element}}', '{{StreamError}}', 'never', 'never', 'true')),
	source: `Rpc.make(${marker('string', 'tag', '"WatchItems"')}, { payload: ${marker('expression', 'payload', 'Schema.Void')}, success: ${marker('expression', 'element', 'Schema.Unknown')}, error: ${marker('expression', 'error', 'Schema.Never')}, stream: true })`
})

export const RpcSetPayloadTemplate = defineTemplate({
	modelId: 'RpcSetPayload', version: VERSION, description: 'Replaces an RPC payload schema while preserving the rest of the contract.',
	typeParameters: typeParameters(['P0', 'Original payload type.'], ['P', 'New payload type.'], ['PE', 'New encoded payload type.'], ['S', 'Success type.'], ['E', 'Error type.'], ['M', 'Middleware type.'], ['R', 'Requirements.']),
	inputs: { rpc: rpcInput('RPC definition.', 'string', '{{P0}}', '{{S}}', '{{E}}', '{{M}}', '{{R}}'), payload: typedExpressionInput('Replacement payload Schema.', schemaType('{{P}}', '{{PE}}')) },
	output: expressionOutput('RPC with replaced payload schema.', rpcType('string', '{{P}}', '{{S}}', '{{E}}', '{{M}}', '{{R}}')),
	source: `${marker('expression', 'rpc', 'Rpc.make("Call")')}.setPayload(${marker('expression', 'payload', 'Schema.Void')})`
})

export const RpcSetSuccessTemplate = defineTemplate({
	modelId: 'RpcSetSuccess', version: VERSION, description: 'Replaces an RPC success schema.',
	typeParameters: typeParameters(['P', 'Payload type.'], ['S0', 'Original success type.'], ['S', 'New success type.'], ['SE', 'Encoded success type.'], ['E', 'Error type.'], ['M', 'Middleware type.'], ['R', 'Requirements.']),
	inputs: { rpc: rpcInput('RPC definition.', 'string', '{{P}}', '{{S0}}', '{{E}}', '{{M}}', '{{R}}'), success: typedExpressionInput('Replacement success Schema.', schemaType('{{S}}', '{{SE}}')) },
	output: expressionOutput('RPC with replaced success schema.', rpcType('string', '{{P}}', '{{S}}', '{{E}}', '{{M}}', '{{R}}')),
	source: `${marker('expression', 'rpc', 'Rpc.make("Call")')}.setSuccess(${marker('expression', 'success', 'Schema.Void')})`
})

export const RpcSetErrorTemplate = defineTemplate({
	modelId: 'RpcSetError', version: VERSION, description: 'Replaces an RPC typed-error schema.',
	typeParameters: typeParameters(['P', 'Payload type.'], ['S', 'Success type.'], ['E0', 'Original error type.'], ['E', 'New error type.'], ['EE', 'Encoded new error type.'], ['M', 'Middleware type.'], ['R', 'Requirements.']),
	inputs: { rpc: rpcInput('RPC definition.', 'string', '{{P}}', '{{S}}', '{{E0}}', '{{M}}', '{{R}}'), error: typedExpressionInput('Replacement error Schema.', schemaType('{{E}}', '{{EE}}')) },
	output: expressionOutput('RPC with replaced error schema.', rpcType('string', '{{P}}', '{{S}}', '{{E}}', '{{M}}', '{{R}}')),
	source: `${marker('expression', 'rpc', 'Rpc.make("Call")')}.setError(${marker('expression', 'error', 'Schema.Never')})`
})

export const RpcPrefixTemplate = defineTemplate({
	modelId: 'RpcPrefix', version: VERSION, description: 'Adds a namespace prefix to one RPC tag.',
	inputs: { rpc: rpcInput('RPC definition.'), prefix: effectValueInput('Tag prefix.', { ts: 'string' }) },
	output: expressionOutput('Prefixed RPC definition.', rpcType()),
	source: `${marker('expression', 'rpc', 'Rpc.make("Call")')}.prefix(${marker('expression', 'prefix', '"v1."')})`
})

export const RpcAddMiddlewareTemplate = defineTemplate({
	modelId: 'RpcAddMiddleware', version: VERSION, description: 'Attaches a typed RPC middleware service to one procedure.',
	inputs: { rpc: rpcInput('RPC definition.'), middleware: middlewareInput('RPC middleware service.') },
	output: expressionOutput('RPC definition with middleware.', rpcType()),
	source: `${marker('expression', 'rpc', 'Rpc.make("Call")')}.middleware(${marker('expression', 'middleware', 'Middleware')})`
})

export const RpcForkTemplate = defineTemplate({
	modelId: 'RpcFork', version: VERSION, description: 'Wraps an RPC handler result so the server runs it concurrently regardless of server concurrency.',
	inputs: { result: valueInput('RPC handler Effect or Stream result.') },
	output: expressionOutput('Forked RPC handler wrapper.'),
	source: `Rpc.fork(${marker('expression', 'result', 'Effect.void')})`
})

export const RpcUninterruptibleTemplate = defineTemplate({
	modelId: 'RpcUninterruptible', version: VERSION, description: 'Wraps an RPC handler result so the server runs it uninterruptibly.',
	inputs: { result: valueInput('RPC handler Effect or Stream result.') },
	output: expressionOutput('Uninterruptible RPC handler wrapper.'),
	source: `Rpc.uninterruptible(${marker('expression', 'result', 'Effect.void')})`
})

export const RpcGroupMakeTemplate = defineTemplate({
	modelId: 'RpcGroupMake', version: VERSION, description: 'Creates an RpcGroup from one or more RPC definitions.',
	inputs: {
		rpcs: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: rpcType() }, minItems: 1, separator: ', ', description: 'RPC definitions in the group.' })
	},
	output: expressionOutput('RPC group.', rpcGroupType()),
	source: `RpcGroup.make(${marker('expression', 'rpcs', 'Rpc.make("Ping")')})`
})

export const RpcGroupAddTemplate = defineTemplate({
	modelId: 'RpcGroupAdd', version: VERSION, description: 'Adds one or more RPC definitions to an existing group.',
	inputs: {
		group: groupInput('Existing RPC group.'),
		rpcs: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: rpcType() }, minItems: 1, separator: ', ', description: 'RPC definitions to add.' })
	},
	output: expressionOutput('Expanded RPC group.', rpcGroupType()),
	source: `${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}.add(${marker('expression', 'rpcs', 'Rpc.make("Pong")')})`
})

export const RpcGroupMergeTemplate = defineTemplate({
	modelId: 'RpcGroupMerge', version: VERSION, description: 'Merges one or more RPC groups into another group.',
	inputs: {
		group: groupInput('Base RPC group.'),
		groups: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: rpcGroupType() }, minItems: 1, separator: ', ', description: 'Additional RPC groups.' })
	},
	output: expressionOutput('Merged RPC group.', rpcGroupType()),
	source: `${marker('expression', 'group', 'RpcGroup.make(Rpc.make("A"))')}.merge(${marker('expression', 'groups', 'RpcGroup.make(Rpc.make("B"))')})`
})

export const RpcGroupPrefixTemplate = defineTemplate({
	modelId: 'RpcGroupPrefix', version: VERSION, description: 'Prefixes every RPC tag in a group.',
	inputs: { group: groupInput('RPC group.'), prefix: effectValueInput('Tag prefix.', { ts: 'string' }) },
	output: expressionOutput('Prefixed RPC group.', rpcGroupType()),
	source: `${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}.prefix(${marker('expression', 'prefix', '"v1."')})`
})

export const RpcGroupMiddlewareTemplate = defineTemplate({
	modelId: 'RpcGroupMiddleware', version: VERSION, description: 'Adds middleware to all RPCs currently present in a group.',
	inputs: { group: groupInput('RPC group.'), middleware: middlewareInput('RPC middleware service.') },
	output: expressionOutput('Middleware-decorated RPC group.', rpcGroupType()),
	source: `${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}.middleware(${marker('expression', 'middleware', 'Middleware')})`
})

export const RpcGroupOfHandlersTemplate = defineTemplate({
	modelId: 'RpcGroupOfHandlers', version: VERSION, description: 'Checks and returns a handler object against an RpcGroup handler shape.',
	inputs: { group: groupInput('RPC group.'), handlers: valueInput('Handler object keyed by RPC tags.') },
	output: expressionOutput('Typed RPC handlers.', rpcHandlersType()),
	source: `${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}.of(${marker('expression', 'handlers', '{ Ping: () => Effect.void }')})`
})

export const RpcGroupToHandlersTemplate = defineTemplate({
	modelId: 'RpcGroupToHandlers', version: VERSION, description: 'Builds the server handler Context for an RpcGroup.',
	typeParameters: typeParameters(['E', 'Handler construction error.'], ['R', 'Handler construction requirements.']),
	inputs: { group: groupInput('RPC group.'), handlers: valueInput('Handler object or handler-construction Effect.') },
	output: expressionOutput('Effect producing the RPC handler Context.', effectType(rpcHandlerContextType().ts, '{{E}}', '{{R}}')),
	source: `${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}.toHandlers(${marker('expression', 'handlers', '{ Ping: () => Effect.void }')})`
})

export const RpcGroupToLayerTemplate = defineTemplate({
	modelId: 'RpcGroupToLayer', version: VERSION, description: 'Builds a Layer containing all handlers for an RpcGroup.',
	typeParameters: typeParameters(['E', 'Handler construction error.'], ['R', 'Handler requirements.']),
	inputs: { group: groupInput('RPC group.'), handlers: valueInput('Handler object or handler-construction Effect.') },
	output: expressionOutput('RPC handlers Layer.', layerType(rpcHandlerType().ts, '{{E}}', '{{R}}')),
	source: `${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}.toLayer(${marker('expression', 'handlers', '{ Ping: () => Effect.void }')})`
})

export const RpcGroupToLayerHandlerTemplate = defineTemplate({
	modelId: 'RpcGroupToLayerHandler', version: VERSION, description: 'Builds a Layer for one named RPC handler in a group.',
	typeParameters: typeParameters(['E', 'Handler construction error.'], ['R', 'Handler requirements.']),
	inputs: { group: groupInput('RPC group.'), tag: effectValueInput('RPC tag.', { ts: 'string' }), handler: valueInput('Handler function or handler-construction Effect.') },
	output: expressionOutput('Single RPC handler Layer.', layerType(rpcHandlerType().ts, '{{E}}', '{{R}}')),
	source: `${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}.toLayerHandler(${marker('expression', 'tag', '"Ping"')}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const RpcGroupAccessHandlerTemplate = defineTemplate({
	modelId: 'RpcGroupAccessHandler', version: VERSION, description: 'Retrieves one installed RPC handler from the current environment.',
	inputs: { group: groupInput('RPC group.'), tag: effectValueInput('RPC tag.', { ts: 'string' }) },
	output: expressionOutput('Effect yielding the installed handler.', effectType('(payload: unknown, options: unknown) => unknown', 'never', rpcHandlerType().ts)),
	source: `${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}.accessHandler(${marker('expression', 'tag', '"Ping"')})`
})

export const RpcClientMakeTemplate = defineTemplate({
	modelId: 'RpcClientMake', version: VERSION, description: 'Creates a schema-aware RPC client for a group using the current client Protocol.',
	typeParameters: typeParameters(['Rpcs', 'RPC union represented by the group.'], ['RClient', 'Required client middleware services.']),
	inputs: { group: groupInput('RPC group.', '{{Rpcs}}'), options: valueInput('RpcClient.make options such as spanPrefix, spanAttributes, request ids, tracing, or flattening.') },
	output: expressionOutput('RPC client creation Effect.', effectType(rpcClientType('{{Rpcs}}').ts, 'never', `${rpcClientProtocolRequirement} | ${rpcScopeRequirement} | {{RClient}}`)),
	source: `RpcClient.make(${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}, ${marker('expression', 'options', '{}')})`
})

export const RpcClientWithHeadersTemplate = defineTemplate({
	modelId: 'RpcClientWithHeaders', version: VERSION, description: 'Runs an RPC client call with request headers merged into outgoing RPC requests.',
	typeParameters: typeParameters(['A', 'Call success type.'], ['E', 'Call error type.'], ['R', 'Call requirements.']),
	inputs: { call: effectSourceInput('RPC client call Effect.', effectType('{{A}}', '{{E}}', '{{R}}')), headers: valueInput('Headers input merged into the request.') },
	output: expressionOutput('RPC call with additional headers.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `RpcClient.withHeaders(${marker('expression', 'call', 'Effect.void')}, ${marker('expression', 'headers', '{}')})`
})

export const RpcClientProtocolHttpLayerTemplate = defineTemplate({
	modelId: 'RpcClientProtocolHttpLayer', version: VERSION, description: 'Provides an RPC client Protocol that sends requests through HttpClient.',
	inputs: { url: effectValueInput('RPC endpoint URL.', { ts: 'string' }) },
	output: expressionOutput('HTTP RPC client Protocol Layer.', layerType(rpcClientProtocolRequirement, 'never', `${rpcSerializationRequirement} | ${rpcHttpClientRequirement}`)),
	source: `RpcClient.layerProtocolHttp({ url: ${marker('expression', 'url', '"http://localhost:3000/rpc"')} })`
})

export const RpcClientProtocolSocketLayerTemplate = defineTemplate({
	modelId: 'RpcClientProtocolSocketLayer', version: VERSION, description: 'Provides an RPC client Protocol over the current Socket with optional retry controls.',
	inputs: { options: valueInput('Socket protocol options including retry policy, ping timeouts, and hooks.') },
	output: expressionOutput('Socket RPC client Protocol Layer.', layerType(rpcClientProtocolRequirement, 'never', `${rpcSerializationRequirement} | ${rpcSocketRequirement}`)),
	source: `RpcClient.layerProtocolSocket(${marker('expression', 'options', '{}')})`
})

export const RpcServerLayerTemplate = defineTemplate({
	modelId: 'RpcServerLayer', version: VERSION, description: 'Starts an RPC server for a group using the current server Protocol.',
	typeParameters: typeParameters(['Rpcs', 'RPC union in the group.'], ['RServer', 'RPC handler, middleware, and schema services required by the group.']),
	inputs: { group: groupInput('RPC group.', '{{Rpcs}}'), options: valueInput('Server options such as tracing, concurrency, and fatal-defect handling.') },
	output: expressionOutput('Scoped RPC server Layer.', layerType('never', 'never', `${rpcServerProtocolRequirement} | {{RServer}}`)),
	source: `RpcServer.layer(${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}, ${marker('expression', 'options', '{}')})`
})

export const RpcServerHttpLayerTemplate = defineTemplate({
	modelId: 'RpcServerHttpLayer', version: VERSION, description: 'Starts an RPC server and registers an HTTP or WebSocket route on HttpRouter.',
	typeParameters: typeParameters(['Rpcs', 'RPC union in the group.'], ['RServer', 'Handler, middleware, and schema services required by the group.']),
	inputs: { group: groupInput('RPC group.', '{{Rpcs}}'), path: effectValueInput('RPC route path.', { ts: 'string' }), protocol: effectValueInput('Transport protocol.', { ts: '"http" | "websocket"' }), options: valueInput('Additional RpcServer.layerHttp options.') },
	output: expressionOutput('HTTP-routed RPC server Layer.', layerType('never', 'never', `${rpcSerializationRequirement} | ${rpcHttpRouterRequirement} | {{RServer}}`)),
	source: `RpcServer.layerHttp({ ...${marker('expression', 'options', '{}')}, group: ${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}, path: ${marker('expression', 'path', '"/rpc"')}, protocol: ${marker('expression', 'protocol', '"http"')} })`
})

export const RpcServerProtocolHttpLayerTemplate = defineTemplate({
	modelId: 'RpcServerProtocolHttpLayer', version: VERSION, description: 'Provides a server Protocol that accepts HTTP POST RPC requests.',
	inputs: { path: effectValueInput('RPC route path.', { ts: 'string' }), streamBufferSize: valueInput('Optional stream buffer size or "unbounded".') },
	output: expressionOutput('HTTP RPC server Protocol Layer.', layerType(rpcServerProtocolRequirement, 'never', `${rpcSerializationRequirement} | ${rpcHttpRouterRequirement}`)),
	source: `RpcServer.layerProtocolHttp({ path: ${marker('expression', 'path', '"/rpc"')}, streamBufferSize: ${marker('expression', 'streamBufferSize', '16')} })`
})

export const RpcServerProtocolWebsocketLayerTemplate = defineTemplate({
	modelId: 'RpcServerProtocolWebsocketLayer', version: VERSION, description: 'Provides a WebSocket RPC server Protocol registered on HttpRouter.',
	inputs: { path: effectValueInput('WebSocket RPC route path.', { ts: 'string' }) },
	output: expressionOutput('WebSocket RPC server Protocol Layer.', layerType(rpcServerProtocolRequirement, 'never', `${rpcSerializationRequirement} | ${rpcHttpRouterRequirement}`)),
	source: `RpcServer.layerProtocolWebsocket({ path: ${marker('expression', 'path', '"/rpc"')} })`
})

export const RpcServerProtocolSocketServerLayerTemplate = defineTemplate({
	modelId: 'RpcServerProtocolSocketServerLayer', version: VERSION, description: 'Provides an RPC server Protocol backed by the current SocketServer.',
	inputs: {},
	output: expressionOutput('SocketServer-backed RPC Protocol Layer.', layerType(rpcServerProtocolRequirement, 'never', `${rpcSerializationRequirement} | ${rpcSocketServerRequirement}`)),
	source: 'RpcServer.layerProtocolSocketServer'
})

export const RpcServerToHttpEffectTemplate = defineTemplate({
	modelId: 'RpcServerToHttpEffect', version: VERSION, description: 'Starts an RPC server and returns the HTTP request/response Effect for the non-WebSocket protocol.',
	typeParameters: typeParameters(['Rpcs', 'RPC union in the group.'], ['RServer', 'Handler, middleware, and schema requirements.']),
	inputs: { group: groupInput('RPC group.', '{{Rpcs}}'), options: valueInput('HTTP server options such as tracing and stream buffer size.') },
	output: expressionOutput('RPC HTTP serving Effect.', effectType('unknown', 'never', `${rpcSerializationRequirement} | ${rpcScopeRequirement} | {{RServer}}`)),
	source: `RpcServer.toHttpEffect(${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}, ${marker('expression', 'options', '{}')})`
})

export const RpcServerToHttpEffectWebsocketTemplate = defineTemplate({
	modelId: 'RpcServerToHttpEffectWebsocket', version: VERSION, description: 'Starts an RPC server and returns the WebSocket upgrade HTTP Effect.',
	typeParameters: typeParameters(['Rpcs', 'RPC union in the group.'], ['RServer', 'Handler, middleware, and schema requirements.']),
	inputs: { group: groupInput('RPC group.', '{{Rpcs}}'), options: valueInput('WebSocket server tracing options.') },
	output: expressionOutput('RPC WebSocket serving Effect.', effectType('unknown', 'never', `${rpcSerializationRequirement} | ${rpcScopeRequirement} | {{RServer}}`)),
	source: `RpcServer.toHttpEffectWebsocket(${marker('expression', 'group', 'RpcGroup.make(Rpc.make("Ping"))')}, ${marker('expression', 'options', '{}')})`
})

export const RpcSerializationJsonLayerTemplate = defineTemplate({
	modelId: 'RpcSerializationJsonLayer', version: VERSION, description: 'Provides JSON RPC serialization for transports that already provide framing.',
	inputs: {}, output: expressionOutput('JSON RPC serialization Layer.', layerType(rpcSerializationRequirement, 'never', 'never')), source: 'RpcSerialization.layerJson'
})

export const RpcSerializationNdjsonLayerTemplate = defineTemplate({
	modelId: 'RpcSerializationNdjsonLayer', version: VERSION, description: 'Provides newline-delimited JSON RPC serialization.',
	inputs: {}, output: expressionOutput('NDJSON RPC serialization Layer.', layerType(rpcSerializationRequirement, 'never', 'never')), source: 'RpcSerialization.layerNdjson'
})

export const RpcSerializationJsonRpcLayerTemplate = defineTemplate({
	modelId: 'RpcSerializationJsonRpcLayer', version: VERSION, description: 'Provides JSON-RPC 2.0 serialization.',
	inputs: { options: valueInput('Optional JSON-RPC serialization options.') },
	output: expressionOutput('JSON-RPC serialization Layer.', layerType(rpcSerializationRequirement, 'never', 'never')),
	source: `RpcSerialization.layerJsonRpc(${marker('expression', 'options', '{}')})`
})

export const RpcSerializationNdJsonRpcLayerTemplate = defineTemplate({
	modelId: 'RpcSerializationNdJsonRpcLayer', version: VERSION, description: 'Provides newline-delimited JSON-RPC serialization.',
	inputs: { options: valueInput('Optional content-type and max-buffer options.') },
	output: expressionOutput('NDJSON-RPC serialization Layer.', layerType(rpcSerializationRequirement, 'never', 'never')),
	source: `RpcSerialization.layerNdJsonRpc(${marker('expression', 'options', '{}')})`
})

export const RpcSerializationSchemaBinaryLayerTemplate = defineTemplate({
	modelId: 'RpcSerializationSchemaBinaryLayer', version: VERSION, description: 'Provides framed SchemaBinary RPC serialization with optional payload fingerprinting.',
	inputs: { options: valueInput('SchemaBinary max-frame-size and fingerprint options.') },
	output: expressionOutput('SchemaBinary RPC serialization Layer.', layerType(rpcSerializationRequirement, 'never', 'never')),
	source: `RpcSerialization.layerSchemaBinary(${marker('expression', 'options', '{}')})`
})

export const RpcMiddlewareServiceDeclarationTemplate = defineTemplate({
	modelId: 'RpcMiddlewareServiceDeclaration', version: VERSION, description: 'Declares a typed RPC middleware Context.Service class.',
	inputs: {
		name: identifierInput('Middleware service class name.'),
		key: stringInput('Stable middleware service key.'),
		providesType: typeCodeInput('Services provided to downstream handlers.'),
		requiresType: typeCodeInput('Services required by the server middleware implementation.'),
		clientErrorType: typeCodeInput('Client-only middleware error type.'),
		errorSchema: typedExpressionInput('Server-visible middleware error Schema.', schemaType()),
		requiredForClient: effectValueInput('Whether generated clients require a client middleware Layer.', { ts: 'boolean' })
	},
	output: statementOutput('Exported RPC middleware service declaration.'),
	source: `export class ${marker('identifier', 'name', 'AuthMiddleware')} extends RpcMiddleware.Service<unknown, { provides: ${marker('type', 'providesType', 'never')}; requires: ${marker('type', 'requiresType', 'never')}; clientError: ${marker('type', 'clientErrorType', 'never')} }>()(${marker('string', 'key', '"AuthMiddleware"')}, { error: ${marker('expression', 'errorSchema', 'Schema.Never')}, requiredForClient: ${marker('expression', 'requiredForClient', 'false')} }) {}`
})

export const RpcMiddlewareServerLayerTemplate = defineTemplate({
	modelId: 'RpcMiddlewareServerLayer', version: VERSION, description: 'Provides a server-side RPC middleware implementation as a Layer.',
	inputs: { middleware: middlewareInput('RPC middleware service key.'), implementation: valueInput('Server middleware function implementation.') },
	output: expressionOutput('Server middleware Layer.', layerType(rpcMiddlewareServiceType().ts, 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'middleware', 'Middleware')}, ${marker('expression', 'implementation', '(effect) => effect')})`
})

export const RpcMiddlewareClientLayerTemplate = defineTemplate({
	modelId: 'RpcMiddlewareClientLayer', version: VERSION, description: 'Provides the client-side implementation for an RPC middleware service.',
	typeParameters: typeParameters(['E', 'Layer construction error.'], ['R', 'Client middleware requirements.']),
	inputs: { middleware: middlewareInput('RPC middleware service key.'), implementation: valueInput('Client middleware function or Effect producing it.') },
	output: expressionOutput('Client RPC middleware Layer.', layerType(rpcMiddlewareClientRequirementType().ts, '{{E}}', '{{R}}')),
	source: `RpcMiddleware.layerClient(${marker('expression', 'middleware', 'Middleware')}, ${marker('expression', 'implementation', '({ next, request }) => next(request)')})`
})

export const RpcServiceBoundarySourceFileTemplate = defineTemplate({
	modelId: 'RpcServiceBoundarySourceFile', version: VERSION, description: 'Builds a complete Effect V4 RPC service-boundary source file with the unstable RPC and HTTP modules in scope.',
	inputs: { body: statementCollectionInput('Top-level RPC declarations, Layers, and runtime statements.') },
	output: { kind: 'sourceFile', description: 'Complete Effect V4 RPC source file.' },
	source: `import { Effect, Layer, Schedule, Schema, Stream } from "effect"\nimport { HttpClient, HttpRouter } from "effect/unstable/http"\nimport { Socket, SocketServer } from "effect/unstable/socket"\nimport { Rpc, RpcClient, RpcGroup, RpcMiddleware, RpcSerialization, RpcServer } from "effect/unstable/rpc"\n\n${marker('statement', 'body', 'export const Ping = Rpc.make("Ping")')}`
})

export const effectV4RpcFoundationalGraphTemplateInputs = [
	RpcMakeTemplate,
	RpcMakeStreamTemplate,
	RpcSetPayloadTemplate,
	RpcSetSuccessTemplate,
	RpcSetErrorTemplate,
	RpcPrefixTemplate,
	RpcAddMiddlewareTemplate,
	RpcForkTemplate,
	RpcUninterruptibleTemplate,
	RpcGroupMakeTemplate,
	RpcGroupAddTemplate,
	RpcGroupMergeTemplate,
	RpcGroupPrefixTemplate,
	RpcGroupMiddlewareTemplate,
	RpcGroupOfHandlersTemplate,
	RpcGroupToHandlersTemplate,
	RpcGroupToLayerTemplate,
	RpcGroupToLayerHandlerTemplate,
	RpcGroupAccessHandlerTemplate,
	RpcClientMakeTemplate,
	RpcClientWithHeadersTemplate,
	RpcClientProtocolHttpLayerTemplate,
	RpcClientProtocolSocketLayerTemplate,
	RpcServerLayerTemplate,
	RpcServerHttpLayerTemplate,
	RpcServerProtocolHttpLayerTemplate,
	RpcServerProtocolWebsocketLayerTemplate,
	RpcServerProtocolSocketServerLayerTemplate,
	RpcServerToHttpEffectTemplate,
	RpcServerToHttpEffectWebsocketTemplate,
	RpcSerializationJsonLayerTemplate,
	RpcSerializationNdjsonLayerTemplate,
	RpcSerializationJsonRpcLayerTemplate,
	RpcSerializationNdJsonRpcLayerTemplate,
	RpcSerializationSchemaBinaryLayerTemplate,
	RpcMiddlewareServiceDeclarationTemplate,
	RpcMiddlewareServerLayerTemplate,
	RpcMiddlewareClientLayerTemplate,
	RpcServiceBoundarySourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
