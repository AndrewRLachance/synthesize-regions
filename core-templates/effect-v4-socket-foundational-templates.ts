import { defineTemplate } from '../src/templates.js'
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
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	channelType,
	inputTransformStreamType,
	nonEmptyReadonlyArrayTs,
	socketAddressType,
	socketCloseEventType,
	socketErrorType,
	socketInput,
	socketReaderInput,
	socketReaderType,
	socketScopeRequirement,
	socketServerErrorType,
	socketServerRequirement,
	socketType,
	socketWriterInput,
	socketWriterType,
	webSocketConstructorRequirement,
	webSocketConstructorType,
	webSocketLikeType
} from './effect-socket-template-helpers.js'

/**
 * Effect v4 Socket graph templates.
 *
 * Runtime contract:
 *   import { Effect, Layer, Stream } from 'effect'
 *   import { Socket, SocketServer } from 'effect/unstable/socket'
 */
const VERSION = '1.0.0' as const
const frameType = 'Uint8Array | string'
const writableFrameType = 'Uint8Array | string | { readonly code: number; readonly reason?: string | undefined }'
const webSocketOptionsType = '{ readonly openTimeout?: unknown; readonly protocols?: string | Array<string>; readonly highWaterMark?: number } | undefined'
const fromWebSocketOptionsType = '{ readonly openTimeout?: unknown; readonly highWaterMark?: number } | undefined'

export const SocketMakeTemplate = defineTemplate({
	modelId: 'SocketMake', version: VERSION, description: 'Constructs an Effect Socket from a scoped reader acquisition and scoped writer acquisition.',
	inputs: {
		reader: effectSourceInput('Scoped reader acquisition.', effectType(socketReaderType().ts, socketErrorType, socketScopeRequirement)),
		writer: effectSourceInput('Scoped writer acquisition.', effectType(socketWriterType().ts, 'never', socketScopeRequirement))
	},
	output: expressionOutput('Socket value.', socketType()),
	source: `Socket.make({ reader: ${marker('expression', 'reader', 'Effect.fail(new Socket.SocketError({ reason: new Socket.SocketOpenError({ kind: "Unknown", cause: undefined }) }))')}, writer: ${marker('expression', 'writer', 'Effect.succeed({ write: () => Effect.void, writeAll: () => Effect.void })')} })`
})

export const SocketReaderTemplate = defineTemplate({
	modelId: 'SocketReader', version: VERSION, description: 'Acquires the pull-based reader for a Socket. Reader lifetime is owned by Scope.',
	inputs: { socket: socketInput('Socket whose reader is acquired.') },
	output: expressionOutput('Scoped Socket reader acquisition.', effectType(socketReaderType().ts, socketErrorType, socketScopeRequirement)),
	source: `${marker('expression', 'socket', 'Socket.Socket.of({})')}.reader`
})

export const SocketReaderBytesTemplate = defineTemplate({
	modelId: 'SocketReaderBytes', version: VERSION, description: 'Acquires a binary pull from a Socket, encoding incoming string frames as UTF-8 bytes.',
	inputs: { socket: socketInput('Socket read as bytes.') },
	output: expressionOutput('Scoped acquisition of a binary pull Effect.', effectType(
		effectType(nonEmptyReadonlyArrayTs('Uint8Array'), socketErrorType, 'never').ts,
		socketErrorType,
		socketScopeRequirement
	)),
	source: `Socket.readerBytes(${marker('expression', 'socket', 'Socket.Socket.of({})')})`
})

export const SocketReaderStringTemplate = defineTemplate({
	modelId: 'SocketReaderString', version: VERSION, description: 'Acquires a string pull from a Socket using TextDecoder for incoming binary frames.',
	inputs: {
		socket: socketInput('Socket read as strings.'),
		encoding: effectValueInput('Optional TextDecoder encoding.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Scoped acquisition of a string pull Effect.', effectType(
		effectType(nonEmptyReadonlyArrayTs('string'), socketErrorType, 'never').ts,
		socketErrorType,
		socketScopeRequirement
	)),
	source: `Socket.readerString(${marker('expression', 'socket', 'Socket.Socket.of({})')}, ${marker('expression', 'encoding', 'undefined')})`
})

export const SocketReaderPullTemplate = defineTemplate({
	modelId: 'SocketReaderPull', version: VERSION, description: 'Pulls the next non-empty frame batch from an acquired Socket reader.',
	typeParameters: typeParameters(['A', 'Reader frame type.']),
	inputs: { reader: socketReaderInput('Acquired Socket reader.', '{{A}}') },
	output: expressionOutput('Next Socket frame batch Effect.', effectType(nonEmptyReadonlyArrayTs('{{A}}'), socketErrorType, 'never')),
	source: `${marker('expression', 'reader', '{ pull: Effect.fail(undefined), upgrade: () => Effect.void }')}.pull`
})

export const SocketReaderUpgradeTlsTemplate = defineTemplate({
	modelId: 'SocketReaderUpgradeTls', version: VERSION, description: 'Requests an in-place TLS upgrade on a live Socket reader.',
	inputs: {
		reader: socketReaderInput('Live Socket reader.'),
		options: valueInput('TLS upgrade options.')
	},
	output: expressionOutput('TLS upgrade Effect.', effectType('void', socketErrorType, 'never')),
	source: `${marker('expression', 'reader', '{ pull: Effect.fail(undefined), upgrade: () => Effect.void }')}.upgrade(${marker('expression', 'options', '{}')})`
})

export const SocketWriterTemplate = defineTemplate({
	modelId: 'SocketWriter', version: VERSION, description: 'Acquires the scoped writer for a Socket. Writes suspend while disconnected until a connection becomes available.',
	inputs: { socket: socketInput('Socket whose writer is acquired.') },
	output: expressionOutput('Scoped Socket writer acquisition.', effectType(socketWriterType().ts, 'never', socketScopeRequirement)),
	source: `${marker('expression', 'socket', 'Socket.Socket.of({})')}.writer`
})

export const SocketWriterWriteTemplate = defineTemplate({
	modelId: 'SocketWriterWrite', version: VERSION, description: 'Writes one binary frame, string frame, or CloseEvent through an acquired Socket writer.',
	inputs: {
		writer: socketWriterInput('Acquired Socket writer.'),
		frame: valueInput('Frame or CloseEvent.', { ts: writableFrameType })
	},
	output: expressionOutput('Socket write Effect.', effectType('void', socketErrorType, 'never')),
	source: `${marker('expression', 'writer', '{ write: () => Effect.void, writeAll: () => Effect.void }')}.write(${marker('expression', 'frame', '"message"')})`
})

export const SocketWriterWriteAllTemplate = defineTemplate({
	modelId: 'SocketWriterWriteAll', version: VERSION, description: 'Writes a non-empty batch of binary or string frames, allowing the transport to coalesce flushing.',
	inputs: {
		writer: socketWriterInput('Acquired Socket writer.'),
		frames: valueInput('Non-empty frame batch.', { ts: nonEmptyReadonlyArrayTs(frameType) })
	},
	output: expressionOutput('Batched Socket write Effect.', effectType('void', socketErrorType, 'never')),
	source: `${marker('expression', 'writer', '{ write: () => Effect.void, writeAll: () => Effect.void }')}.writeAll(${marker('expression', 'frames', '["message"]')})`
})

export const SocketCloseEventTemplate = defineTemplate({
	modelId: 'SocketCloseEvent', version: VERSION, description: 'Constructs a Socket CloseEvent for graceful or application-defined close signaling.',
	inputs: {
		code: effectValueInput('WebSocket-style close code.', { ts: 'number' }),
		reason: effectValueInput('Optional close reason.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Socket close event.', socketCloseEventType()),
	source: `new Socket.CloseEvent(${marker('expression', 'code', '1000')}, ${marker('expression', 'reason', 'undefined')})`
})

export const SocketIsCloseEventTemplate = defineTemplate({
	modelId: 'SocketIsCloseEvent', version: VERSION, description: 'Checks whether a value is a Socket CloseEvent.',
	inputs: { value: valueInput('Value to inspect.') },
	output: expressionOutput('CloseEvent guard result.', { ts: 'boolean' }),
	source: `Socket.isCloseEvent(${marker('expression', 'value', 'undefined')})`
})

export const SocketIsSocketErrorTemplate = defineTemplate({
	modelId: 'SocketIsSocketError', version: VERSION, description: 'Checks whether a value is a SocketError.',
	inputs: { value: valueInput('Value to inspect.') },
	output: expressionOutput('SocketError guard result.', { ts: 'boolean' }),
	source: `Socket.isSocketError(${marker('expression', 'value', 'undefined')})`
})

export const SocketToChannelTemplate = defineTemplate({
	modelId: 'SocketToChannel', version: VERSION, description: 'Converts a Socket into a backpressured bidirectional binary Channel.',
	inputs: { socket: socketInput('Socket adapted to a binary Channel.') },
	output: expressionOutput('Bidirectional binary Socket Channel.', channelType(
		nonEmptyReadonlyArrayTs('Uint8Array'),
		socketErrorType,
		'void',
		nonEmptyReadonlyArrayTs(writableFrameType),
		'never',
		'unknown',
		'never'
	)),
	source: `Socket.toChannel(${marker('expression', 'socket', 'Socket.Socket.of({})')})`
})

export const SocketToChannelStringTemplate = defineTemplate({
	modelId: 'SocketToChannelString', version: VERSION, description: 'Converts a Socket into a backpressured bidirectional string Channel.',
	inputs: {
		socket: socketInput('Socket adapted to a string Channel.'),
		encoding: effectValueInput('Optional text decoding encoding.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Bidirectional string Socket Channel.', channelType(
		nonEmptyReadonlyArrayTs('string'),
		socketErrorType,
		'void',
		nonEmptyReadonlyArrayTs(writableFrameType),
		'never',
		'unknown',
		'never'
	)),
	source: `Socket.toChannelString<never>(${marker('expression', 'socket', 'Socket.Socket.of({})')}, ${marker('expression', 'encoding', 'undefined')})`
})

export const SocketToStreamTemplate = defineTemplate({
	modelId: 'SocketToStream', version: VERSION, description: 'Converts a Socket into a read-only backpressured binary Stream.',
	inputs: { socket: socketInput('Socket adapted to a Stream.') },
	output: expressionOutput('Backpressured binary Socket Stream.', streamType('Uint8Array', socketErrorType, 'never')),
	source: `Socket.toStream(${marker('expression', 'socket', 'Socket.Socket.of({})')})`
})

export const SocketMakeChannelTemplate = defineTemplate({
	modelId: 'SocketMakeChannel', version: VERSION, description: 'Creates a binary Channel that obtains the Socket service from Effect context.',
	inputs: {},
	output: expressionOutput('Context-backed Socket Channel.', channelType(
		nonEmptyReadonlyArrayTs('Uint8Array'),
		socketErrorType,
		'void',
		nonEmptyReadonlyArrayTs(writableFrameType),
		'never',
		'unknown',
		'{ readonly __socketRequirement: "Socket" }'
	)),
	source: 'Socket.makeChannel()'
})

export const SocketWebSocketConstructorGlobalLayerTemplate = defineTemplate({
	modelId: 'SocketWebSocketConstructorGlobalLayer', version: VERSION, description: 'Provides Socket.WebSocketConstructor using globalThis.WebSocket.',
	inputs: {},
	output: expressionOutput('Global WebSocket constructor Layer.', layerType(webSocketConstructorRequirement, 'never', 'never')),
	source: 'Socket.layerWebSocketConstructorGlobal'
})

export const SocketMakeWebSocketTemplate = defineTemplate({
	modelId: 'SocketMakeWebSocket', version: VERSION, description: 'Creates a reconnectable WebSocket-backed Socket. Each reader acquisition dials a new connection.',
	typeParameters: typeParameters(['RUrl', 'Requirements used to compute an effectful WebSocket URL.']),
	inputs: {
		url: typedExpressionInput('WebSocket URL or Effect producing the URL.', { ts: `string | ${effectType('string', 'never', '{{RUrl}}').ts}` }),
		options: valueInput('WebSocket open timeout, protocols, and high-water-mark options.', { ts: webSocketOptionsType })
	},
	output: expressionOutput('WebSocket-backed Socket construction Effect.', effectType(socketType().ts, 'never', `${webSocketConstructorRequirement} | {{RUrl}}`)),
	source: `Socket.makeWebSocket(${marker('expression', 'url', '"ws://localhost:8080"')}, ${marker('expression', 'options', '{}')})`
})

export const SocketWebSocketLayerTemplate = defineTemplate({
	modelId: 'SocketWebSocketLayer', version: VERSION, description: 'Provides the Socket service using a WebSocket URL or URL Effect.',
	typeParameters: typeParameters(['RUrl', 'Requirements used to compute an effectful WebSocket URL.']),
	inputs: {
		url: typedExpressionInput('WebSocket URL or Effect producing the URL.', { ts: `string | ${effectType('string', 'never', '{{RUrl}}').ts}` }),
		options: valueInput('WebSocket open timeout, protocols, and high-water-mark options.', { ts: webSocketOptionsType })
	},
	output: expressionOutput('WebSocket Socket Layer.', layerType('{ readonly __socketRequirement: "Socket" }', 'never', `${webSocketConstructorRequirement} | {{RUrl}}`)),
	source: `Socket.layerWebSocket(${marker('expression', 'url', '"ws://localhost:8080"')}, ${marker('expression', 'options', '{}')})`
})

export const SocketMakeWebSocketChannelTemplate = defineTemplate({
	modelId: 'SocketMakeWebSocketChannel', version: VERSION, description: 'Creates a binary Socket Channel backed by a WebSocket URL.',
	inputs: {
		url: effectValueInput('WebSocket URL.', { ts: 'string' }),
		options: valueInput('WebSocket open timeout, protocols, and high-water-mark options.', { ts: webSocketOptionsType })
	},
	output: expressionOutput('WebSocket-backed Channel.', channelType(
		nonEmptyReadonlyArrayTs('Uint8Array'),
		socketErrorType,
		'void',
		nonEmptyReadonlyArrayTs(writableFrameType),
		'never',
		'unknown',
		webSocketConstructorRequirement
	)),
	source: `Socket.makeWebSocketChannel<never>(${marker('expression', 'url', '"ws://localhost:8080"')}, ${marker('expression', 'options', '{}')})`
})

export const SocketFromWebSocketTemplate = defineTemplate({
	modelId: 'SocketFromWebSocket', version: VERSION, description: 'Builds a Socket from a scoped WebSocketLike acquisition Effect.',
	typeParameters: typeParameters(['R', 'Non-Scope WebSocket acquisition requirements.']),
	inputs: {
		acquire: effectSourceInput('Scoped WebSocketLike acquisition.', effectType(webSocketLikeType().ts, socketErrorType, `{{R}} | ${socketScopeRequirement}`)),
		options: valueInput('Open timeout and high-water-mark options.', { ts: fromWebSocketOptionsType })
	},
	output: expressionOutput('Socket construction Effect.', effectType(socketType().ts, 'never', '{{R}}')),
	source: `Socket.fromWebSocket(${marker('expression', 'acquire', 'Effect.fail(undefined)')}, ${marker('expression', 'options', '{}')})`
})

export const SocketFromTransformStreamTemplate = defineTemplate({
	modelId: 'SocketFromTransformStream', version: VERSION, description: 'Builds a Socket from a scoped readable/writable transform-stream pair.',
	typeParameters: typeParameters(['R', 'Non-Scope stream acquisition requirements.']),
	inputs: {
		acquire: effectSourceInput('Scoped InputTransformStream acquisition.', effectType(inputTransformStreamType().ts, socketErrorType, `{{R}} | ${socketScopeRequirement}`))
	},
	output: expressionOutput('Transform-stream-backed Socket construction Effect.', effectType(socketType().ts, 'never', '{{R}}')),
	source: `Socket.fromTransformStream(${marker('expression', 'acquire', 'Effect.fail(undefined)')})`
})

export const SocketServerTcpAddressTemplate = defineTemplate({
	modelId: 'SocketServerTcpAddress', version: VERSION, description: 'Creates a TCP SocketServer address value.',
	inputs: {
		hostname: effectValueInput('TCP hostname.', { ts: 'string' }),
		port: effectValueInput('TCP port.', { ts: 'number' })
	},
	output: expressionOutput('TCP SocketServer address.', socketAddressType()),
	source: `({ _tag: "TcpAddress" as const, hostname: ${marker('expression', 'hostname', '"127.0.0.1"')}, port: ${marker('expression', 'port', '8080')} })`
})

export const SocketServerUnixAddressTemplate = defineTemplate({
	modelId: 'SocketServerUnixAddress', version: VERSION, description: 'Creates a Unix-domain SocketServer address value.',
	inputs: { path: effectValueInput('Unix socket filesystem path.', { ts: 'string' }) },
	output: expressionOutput('Unix SocketServer address.', socketAddressType()),
	source: `({ _tag: "UnixAddress" as const, path: ${marker('expression', 'path', '"/tmp/app.sock"')} })`
})

export const SocketServerAddressTemplate = defineTemplate({
	modelId: 'SocketServerAddress', version: VERSION, description: 'Reads the bound address from the active SocketServer service.',
	inputs: {},
	output: expressionOutput('SocketServer address Effect.', effectType(socketAddressType().ts, 'never', socketServerRequirement)),
	source: `Effect.map(SocketServer.SocketServer, server => server.address)`
})

export const SocketServerRunTemplate = defineTemplate({
	modelId: 'SocketServerRun', version: VERSION, description: 'Runs the active SocketServer and handles each accepted Socket with an Effectful callback.',
	typeParameters: typeParameters(['A', 'Connection handler success type.'], ['E', 'Connection handler expected error type.'], ['R', 'Connection handler requirements.']),
	inputs: {
		handler: callbackInput('Per-connection handler.', effectReturningCallbackType(`socket: ${socketType().ts}`, '{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Long-running SocketServer Effect.', effectType('never', socketServerErrorType, `${socketServerRequirement} | {{R}}`)),
	source: `Effect.flatMap(SocketServer.SocketServer, server => server.run(${marker('expression', 'handler', '() => Effect.void')}))`
})

export const effectV4SocketFoundationalGraphTemplateInputs = [
	SocketMakeTemplate,
	SocketReaderTemplate,
	SocketReaderBytesTemplate,
	SocketReaderStringTemplate,
	SocketReaderPullTemplate,
	SocketReaderUpgradeTlsTemplate,
	SocketWriterTemplate,
	SocketWriterWriteTemplate,
	SocketWriterWriteAllTemplate,
	SocketCloseEventTemplate,
	SocketIsCloseEventTemplate,
	SocketIsSocketErrorTemplate,
	SocketToChannelTemplate,
	SocketToChannelStringTemplate,
	SocketToStreamTemplate,
	SocketMakeChannelTemplate,
	SocketWebSocketConstructorGlobalLayerTemplate,
	SocketMakeWebSocketTemplate,
	SocketWebSocketLayerTemplate,
	SocketMakeWebSocketChannelTemplate,
	SocketFromWebSocketTemplate,
	SocketFromTransformStreamTemplate,
	SocketServerTcpAddressTemplate,
	SocketServerUnixAddressTemplate,
	SocketServerAddressTemplate,
	SocketServerRunTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
