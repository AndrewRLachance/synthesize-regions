import { defineTemplate } from '../src/templates.js'
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
	layerType,
	marker,
	pubSubType,
	queueType,
	scheduleType,
	schemaType,
	streamType,
	typeParameters,
	typedExpressionInput,
	valueInput,
	statementCollectionInput
} from './effect-template-helpers.js'
import { streamInput } from './effect-stream-sink-template-helpers.js'
import {
	socketErrorType,
	socketInput,
	socketScopeRequirement,
	socketServerErrorType,
	socketServerRequirement,
	socketType,
	webSocketConstructorRequirement
} from './effect-socket-template-helpers.js'

/** Production Effect v4 socket + streaming-boundary compositions. */
const VERSION = '1.0.0' as const
const socketError = socketErrorType
const schemaInput = (description: string, decoded = 'unknown', encoded = 'unknown', decodingServices = 'never', encodingServices = decodingServices) =>
	typedExpressionInput(description, schemaType(decoded, encoded, decodingServices, encodingServices))
const queueInput = (description: string, value = 'unknown') => typedExpressionInput(description, queueType(value))
const pubSubInput = (description: string, value = 'unknown') => typedExpressionInput(description, pubSubType(value))
const scheduleInput = (description: string, input = 'unknown', requirements = 'never') =>
	typedExpressionInput(description, scheduleType('unknown', input, requirements))

export const SocketTextStreamTemplate = defineTemplate({
	modelId: 'SocketTextStream', version: VERSION, description: 'Decodes a Socket binary Stream incrementally into text while preserving pull-based backpressure.',
	inputs: {
		socket: socketInput('Socket used as the byte source.'),
		encoding: effectValueInput('Optional text encoding.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Decoded Socket text Stream.', streamType('string', socketError, 'never')),
	source: `Stream.decodeText(Socket.toStream(${marker('expression', 'socket', 'Socket.Socket.of({})')}), { encoding: ${marker('expression', 'encoding', 'undefined')} })`
})

export const SocketLineStreamTemplate = defineTemplate({
	modelId: 'SocketLineStream', version: VERSION, description: 'Creates a newline-framed text Stream from a Socket, correctly handling line delimiters split across transport chunks.',
	inputs: {
		socket: socketInput('Socket used as the byte source.'),
		encoding: effectValueInput('Optional text encoding.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Line-framed Socket Stream.', streamType('string', socketError, 'never')),
	source: `Stream.splitLines(Stream.decodeText(Socket.toStream(${marker('expression', 'socket', 'Socket.Socket.of({})')}), { encoding: ${marker('expression', 'encoding', 'undefined')} }))`
})

export const SocketJsonLineStreamTemplate = defineTemplate({
	modelId: 'SocketJsonLineStream', version: VERSION, description: 'Parses a newline-delimited JSON Socket stream into unknown values.',
	inputs: { socket: socketInput('Socket carrying newline-delimited JSON.') },
	output: expressionOutput('Parsed NDJSON Socket Stream.', streamType('unknown', `${socketError} | unknown`, 'never')),
	source: `Stream.mapEffect(Stream.splitLines(Stream.decodeText(Socket.toStream(${marker('expression', 'socket', 'Socket.Socket.of({})')}))), line => Effect.try(() => JSON.parse(line)))`
})

export const SocketSchemaJsonLineStreamTemplate = defineTemplate({
	modelId: 'SocketSchemaJsonLineStream', version: VERSION, description: 'Parses newline-delimited JSON and decodes every message through an Effect Schema.',
	typeParameters: typeParameters(['A', 'Decoded message type.'], ['I', 'Encoded Schema input type.'], ['RDecode', 'Schema decoding requirements.']),
	inputs: {
		socket: socketInput('Socket carrying newline-delimited JSON.'),
		schema: schemaInput('Schema used to decode parsed JSON values.', '{{A}}', '{{I}}', '{{RDecode}}')
	},
	output: expressionOutput('Schema-decoded NDJSON Socket Stream.', streamType('{{A}}', `${socketError} | unknown`, '{{RDecode}}')),
	source: `Stream.mapEffect(Stream.splitLines(Stream.decodeText(Socket.toStream(${marker('expression', 'socket', 'Socket.Socket.of({})')}))), line => Effect.flatMap(Effect.try(() => JSON.parse(line)), Schema.decodeUnknown(${marker('expression', 'schema', 'Schema.Unknown')})))`
})

export const SocketWriteValueTemplate = defineTemplate({
	modelId: 'SocketWriteValue', version: VERSION, description: 'Acquires a Socket writer and writes one application value after pure encoding to a string or byte frame.',
	typeParameters: typeParameters(['A', 'Application value type.']),
	inputs: {
		socket: socketInput('Socket used for output.'),
		value: valueInput('Application value to write.', { ts: '{{A}}' }),
		encode: callbackInput('Pure frame encoder.', { ts: '(value: {{A}}) => string | Uint8Array' })
	},
	output: expressionOutput('Scoped Socket write Effect.', effectType('void', socketError, 'never')),
	source: `Effect.scoped(Effect.flatMap(${marker('expression', 'socket', 'Socket.Socket.of({})')}.writer, writer => writer.write((${marker('expression', 'encode', 'value => String(value)')})(${marker('expression', 'value', 'undefined')}))))`
})

export const SocketWriteJsonTemplate = defineTemplate({
	modelId: 'SocketWriteJson', version: VERSION, description: 'Encodes a value with an Effect Schema, serializes it as JSON, and writes it as one Socket string frame.',
	typeParameters: typeParameters(['A', 'Decoded application value type.'], ['I', 'Encoded Schema output type.'], ['REncode', 'Schema encoding requirements.']),
	inputs: {
		socket: socketInput('Socket used for output.'),
		schema: schemaInput('Schema used to encode the value.', '{{A}}', '{{I}}', 'never', '{{REncode}}'),
		value: valueInput('Application value to encode.', { ts: '{{A}}' })
	},
	output: expressionOutput('Schema-encoded JSON Socket write.', effectType('void', `${socketError} | unknown`, '{{REncode}}')),
	source: `Effect.scoped(Effect.flatMap(${marker('expression', 'socket', 'Socket.Socket.of({})')}.writer, writer => Effect.flatMap(Schema.encode(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')}), encoded => Effect.flatMap(Effect.try(() => JSON.stringify(encoded)), writer.write))))`
})

export const SocketWriteJsonLineTemplate = defineTemplate({
	modelId: 'SocketWriteJsonLine', version: VERSION, description: 'Encodes a value through Schema and writes one newline-delimited JSON record to a Socket.',
	typeParameters: typeParameters(['A', 'Decoded application value type.'], ['I', 'Encoded Schema output type.'], ['REncode', 'Schema encoding requirements.']),
	inputs: {
		socket: socketInput('Socket used for output.'),
		schema: schemaInput('Schema used to encode the value.', '{{A}}', '{{I}}', 'never', '{{REncode}}'),
		value: valueInput('Application value to encode.', { ts: '{{A}}' })
	},
	output: expressionOutput('Schema-encoded NDJSON Socket write.', effectType('void', `${socketError} | unknown`, '{{REncode}}')),
	source: `Effect.scoped(Effect.flatMap(${marker('expression', 'socket', 'Socket.Socket.of({})')}.writer, writer => Effect.flatMap(Schema.encode(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')}), encoded => Effect.flatMap(Effect.try(() => JSON.stringify(encoded) + "\\n"), writer.write))))`
})

export const SocketStreamToWriterTemplate = defineTemplate({
	modelId: 'SocketStreamToWriter', version: VERSION, description: 'Streams application values to a Socket writer with transport backpressure.',
	typeParameters: typeParameters(['A', 'Stream element type.'], ['E', 'Source Stream error type.'], ['R', 'Source Stream requirements.']),
	inputs: {
		socket: socketInput('Destination Socket.'),
		stream: streamInput('Outgoing application Stream.', '{{A}}', '{{E}}', '{{R}}'),
		encode: callbackInput('Pure frame encoder.', { ts: '(value: {{A}}) => string | Uint8Array' })
	},
	output: expressionOutput('Socket streaming write Effect.', effectType('void', `{{E}} | ${socketError}`, '{{R}}')),
	source: `Effect.scoped(Effect.flatMap(${marker('expression', 'socket', 'Socket.Socket.of({})')}.writer, writer => Stream.runForEach(${marker('expression', 'stream', 'Stream.empty')}, value => writer.write((${marker('expression', 'encode', 'value => String(value)')})(value)))))`
})

export const SocketBoundedQueueIngressTemplate = defineTemplate({
	modelId: 'SocketBoundedQueueIngress', version: VERSION, description: 'Feeds incoming Socket bytes into a Queue. A bounded Queue naturally propagates backpressure to Socket pulls.',
	inputs: {
		socket: socketInput('Socket byte source.'),
		queue: queueInput('Queue receiving incoming byte chunks.', 'Uint8Array')
	},
	output: expressionOutput('Socket-to-Queue pump Effect.', effectType('void', socketError, 'never')),
	source: `Stream.runForEach(Socket.toStream(${marker('expression', 'socket', 'Socket.Socket.of({})')}), chunk => Queue.offer(${marker('expression', 'queue', 'queue')}, chunk))`
})

export const SocketPubSubIngressTemplate = defineTemplate({
	modelId: 'SocketPubSubIngress', version: VERSION, description: 'Publishes every incoming Socket byte chunk into a PubSub for fan-out consumers.',
	inputs: {
		socket: socketInput('Socket byte source.'),
		pubsub: pubSubInput('PubSub receiving incoming byte chunks.', 'Uint8Array')
	},
	output: expressionOutput('Socket-to-PubSub pump Effect.', effectType('void', socketError, 'never')),
	source: `Stream.runForEach(Socket.toStream(${marker('expression', 'socket', 'Socket.Socket.of({})')}), chunk => Effect.asVoid(PubSub.publish(${marker('expression', 'pubsub', 'pubsub')}, chunk)))`
})

export const SocketReconnectConsumerTemplate = defineTemplate({
	modelId: 'SocketReconnectConsumer', version: VERSION, description: 'Consumes a Socket Stream and reconnects by retrying the consume effect according to a Schedule.',
	typeParameters: typeParameters(['E', 'Consumer error type.'], ['R', 'Consumer requirements.'], ['RSchedule', 'Retry Schedule requirements.']),
	inputs: {
		socket: socketInput('Reconnectable Socket; each reader acquisition establishes a connection.'),
		consume: callbackInput('Per-chunk consumer.', effectReturningCallbackType('chunk: Uint8Array', 'unknown', '{{E}}', '{{R}}')),
		retry: scheduleInput('Reconnect retry Schedule.', `${socketError} | {{E}}`, '{{RSchedule}}')
	},
	output: expressionOutput('Reconnect-loop Effect.', effectType('void', `${socketError} | {{E}}`, '{{R}} | {{RSchedule}}')),
	source: `Effect.retry(Stream.runForEach(Socket.toStream(${marker('expression', 'socket', 'Socket.Socket.of({})')}), ${marker('expression', 'consume', '() => Effect.void')}), ${marker('expression', 'retry', 'Schedule.exponential(100)')})`
})

export const SocketObservedReconnectConsumerTemplate = defineTemplate({
	modelId: 'SocketObservedReconnectConsumer', version: VERSION, description: 'Runs a reconnecting Socket consumer inside a tracing span with structured log annotations.',
	typeParameters: typeParameters(['E', 'Consumer error type.'], ['R', 'Consumer requirements.'], ['RSchedule', 'Retry Schedule requirements.']),
	inputs: {
		socket: socketInput('Reconnectable Socket.'),
		consume: callbackInput('Per-chunk consumer.', effectReturningCallbackType('chunk: Uint8Array', 'unknown', '{{E}}', '{{R}}')),
		retry: scheduleInput('Reconnect retry Schedule.', `${socketError} | {{E}}`, '{{RSchedule}}'),
		spanName: effectValueInput('Tracing span name.', { ts: 'string' })
	},
	output: expressionOutput('Observed reconnect-loop Effect.', effectType('void', `${socketError} | {{E}}`, '{{R}} | {{RSchedule}}')),
	source: `Effect.withSpan(Effect.annotateLogs(Effect.retry(Stream.runForEach(Socket.toStream(${marker('expression', 'socket', 'Socket.Socket.of({})')}), ${marker('expression', 'consume', '() => Effect.void')}), ${marker('expression', 'retry', 'Schedule.exponential(100)')}), "component", "socket"), ${marker('expression', 'spanName', '"socket.consume"')})`
})

export const SocketHeartbeatSessionTemplate = defineTemplate({
	modelId: 'SocketHeartbeatSession', version: VERSION, description: 'Runs a Socket consumer together with a periodic heartbeat writer in the same scope.',
	typeParameters: typeParameters(['E', 'Consumer error type.'], ['R', 'Consumer requirements.']),
	inputs: {
		socket: socketInput('Connected/reconnectable Socket.'),
		consume: callbackInput('Per-chunk consumer.', effectReturningCallbackType('chunk: Uint8Array', 'unknown', '{{E}}', '{{R}}')),
		heartbeat: effectValueInput('Heartbeat frame.', { ts: 'string | Uint8Array' }),
		interval: effectDurationInput('Delay between heartbeat frames.')
	},
	output: expressionOutput('Heartbeat + receive session Effect.', effectType('ReadonlyArray<unknown>', `${socketError} | {{E}}`, '{{R}}')),
	source: `Effect.scoped(Effect.gen(function*() { const socket = ${marker('expression', 'socket', 'Socket.Socket.of({})')}; const writer = yield* socket.writer; const receive = Stream.runForEach(Socket.toStream(socket), ${marker('expression', 'consume', '() => Effect.void')}); const heartbeat = Effect.forever(Effect.zipRight(Effect.sleep(${marker('expression', 'interval', '10000')}), writer.write(${marker('expression', 'heartbeat', '"ping"')}))); return yield* Effect.all([receive, heartbeat], { concurrency: "unbounded" }); }))`
})

export const SocketBidirectionalQueueBridgeTemplate = defineTemplate({
	modelId: 'SocketBidirectionalQueueBridge', version: VERSION, description: 'Bridges Socket input to an inbound Queue and an outbound Queue to the scoped Socket writer with shared backpressure.',
	typeParameters: typeParameters(['Out', 'Outbound application value type.']),
	inputs: {
		socket: socketInput('Socket bridged to Queues.'),
		inbound: queueInput('Queue receiving inbound byte chunks.', 'Uint8Array'),
		outbound: queueInput('Queue supplying outbound values.', '{{Out}}'),
		encode: callbackInput('Pure outbound frame encoder.', { ts: '(value: {{Out}}) => string | Uint8Array' })
	},
	output: expressionOutput('Bidirectional Queue bridge Effect.', effectType('ReadonlyArray<unknown>', socketError, 'never')),
	source: `Effect.scoped(Effect.gen(function*() { const socket = ${marker('expression', 'socket', 'Socket.Socket.of({})')}; const writer = yield* socket.writer; const receive = Stream.runForEach(Socket.toStream(socket), chunk => Queue.offer(${marker('expression', 'inbound', 'inbound')}, chunk)); const send = Stream.runForEach(Stream.fromQueue(${marker('expression', 'outbound', 'outbound')}), value => writer.write((${marker('expression', 'encode', 'value => String(value)')})(value))); return yield* Effect.all([receive, send], { concurrency: "unbounded" }); }))`
})

export const SocketSchemaRequestResponseSessionTemplate = defineTemplate({
	modelId: 'SocketSchemaRequestResponseSession', version: VERSION, description: 'Runs a newline-delimited JSON request/response session with Schema decoding, an Effectful handler, Schema encoding, and Socket backpressure.',
	typeParameters: typeParameters(
		['Req', 'Decoded request type.'], ['ReqI', 'Encoded request schema type.'], ['Res', 'Decoded response type.'], ['ResI', 'Encoded response schema type.'],
		['E', 'Handler error type.'], ['RHandler', 'Handler requirements.'], ['RDecode', 'Request decoding requirements.'], ['REncode', 'Response encoding requirements.']
	),
	inputs: {
		socket: socketInput('Socket session.'),
		requestSchema: schemaInput('Schema decoding incoming JSON requests.', '{{Req}}', '{{ReqI}}', '{{RDecode}}'),
		responseSchema: schemaInput('Schema encoding outgoing responses.', '{{Res}}', '{{ResI}}', 'never', '{{REncode}}'),
		handler: callbackInput('Request handler.', effectReturningCallbackType('request: {{Req}}', '{{Res}}', '{{E}}', '{{RHandler}}'))
	},
	output: expressionOutput('Schema request/response Socket session.', effectType('void', `${socketError} | unknown | {{E}}`, '{{RDecode}} | {{REncode}} | {{RHandler}}')),
	source: `Effect.scoped(Effect.gen(function*() { const socket = ${marker('expression', 'socket', 'Socket.Socket.of({})')}; const writer = yield* socket.writer; const requests = Stream.mapEffect(Stream.splitLines(Stream.decodeText(Socket.toStream(socket))), line => Effect.flatMap(Effect.try(() => JSON.parse(line)), Schema.decodeUnknown(${marker('expression', 'requestSchema', 'Schema.Unknown')}))); return yield* Stream.runForEach(requests, request => Effect.flatMap((${marker('expression', 'handler', 'request => Effect.succeed(request)')})(request), response => Effect.flatMap(Schema.encode(${marker('expression', 'responseSchema', 'Schema.Unknown')})(response), encoded => Effect.flatMap(Effect.try(() => JSON.stringify(encoded) + "\\n"), writer.write)))); }))`
})

export const SocketServerStreamingHandlerTemplate = defineTemplate({
	modelId: 'SocketServerStreamingHandler', version: VERSION, description: 'Runs the active SocketServer and delegates each accepted Socket to a streaming connection handler.',
	typeParameters: typeParameters(['A', 'Per-connection success type.'], ['E', 'Per-connection error type.'], ['R', 'Connection handler requirements.']),
	inputs: { handler: callbackInput('Effectful Socket connection handler.', effectReturningCallbackType(`socket: ${socketType().ts}`, '{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Socket server run Effect.', effectType('never', socketServerErrorType, `${socketServerRequirement} | {{R}}`)),
	source: `Effect.flatMap(SocketServer.SocketServer, server => server.run(${marker('expression', 'handler', '() => Effect.void')}))`
})

export const SocketServerJsonLineBoundaryTemplate = defineTemplate({
	modelId: 'SocketServerJsonLineBoundary', version: VERSION, description: 'Runs a SocketServer whose connections decode NDJSON messages through Schema and invoke an Effectful message handler.',
	typeParameters: typeParameters(['A', 'Decoded message type.'], ['I', 'Encoded Schema input type.'], ['E', 'Message handler error type.'], ['RHandler', 'Message handler requirements.'], ['RDecode', 'Schema decoding requirements.']),
	inputs: {
		schema: schemaInput('Schema decoding each incoming JSON line.', '{{A}}', '{{I}}', '{{RDecode}}'),
		handler: callbackInput('Per-message handler.', effectReturningCallbackType('message: {{A}}', 'unknown', '{{E}}', '{{RHandler}}'))
	},
	output: expressionOutput('NDJSON SocketServer Effect.', effectType('never', socketServerErrorType, `${socketServerRequirement} | {{RDecode}} | {{RHandler}}`)),
	source: `Effect.flatMap(SocketServer.SocketServer, server => server.run(socket => Stream.runForEach(Stream.mapEffect(Stream.splitLines(Stream.decodeText(Socket.toStream(socket))), line => Effect.flatMap(Effect.try(() => JSON.parse(line)), Schema.decodeUnknown(${marker('expression', 'schema', 'Schema.Unknown')}))), ${marker('expression', 'handler', '() => Effect.void')})))`
})

export const WebSocketReconnectWorkerLayerTemplate = defineTemplate({
	modelId: 'WebSocketReconnectWorkerLayer', version: VERSION, description: 'Starts a scoped background WebSocket consumer that reconnects according to a Schedule.',
	typeParameters: typeParameters(['E', 'Consumer error type.'], ['R', 'Consumer requirements.'], ['RSchedule', 'Retry Schedule requirements.']),
	inputs: {
		url: effectValueInput('WebSocket URL.', { ts: 'string' }),
		options: valueInput('WebSocket connection options.'),
		consume: callbackInput('Per-byte-chunk consumer.', effectReturningCallbackType('chunk: Uint8Array', 'unknown', '{{E}}', '{{R}}')),
		retry: scheduleInput('Reconnect retry Schedule.', `${socketError} | {{E}}`, '{{RSchedule}}')
	},
	output: expressionOutput('Scoped reconnecting WebSocket worker Layer.', layerType('never', 'never', `${webSocketConstructorRequirement} | {{R}} | {{RSchedule}}`)),
	source: `Layer.scopedDiscard(Effect.gen(function*() { const socket = yield* Socket.makeWebSocket(${marker('expression', 'url', '"ws://localhost:8080"')}, ${marker('expression', 'options', '{}')}); const worker = Effect.retry(Stream.runForEach(Socket.toStream(socket), ${marker('expression', 'consume', '() => Effect.void')}), ${marker('expression', 'retry', 'Schedule.exponential(100)')}); yield* Effect.forkScoped(worker); }))`
})

export const WebSocketSchemaEventConsumerLayerTemplate = defineTemplate({
	modelId: 'WebSocketSchemaEventConsumerLayer', version: VERSION, description: 'Starts a scoped WebSocket worker that reconnects, parses NDJSON events, Schema-decodes them, and invokes an Effectful event handler.',
	typeParameters: typeParameters(['A', 'Decoded event type.'], ['I', 'Encoded Schema input type.'], ['E', 'Handler error type.'], ['RHandler', 'Handler requirements.'], ['RDecode', 'Schema decoding requirements.'], ['RSchedule', 'Reconnect Schedule requirements.']),
	inputs: {
		url: effectValueInput('WebSocket URL.', { ts: 'string' }),
		options: valueInput('WebSocket connection options.'),
		schema: schemaInput('Event Schema.', '{{A}}', '{{I}}', '{{RDecode}}'),
		handler: callbackInput('Decoded event handler.', effectReturningCallbackType('event: {{A}}', 'unknown', '{{E}}', '{{RHandler}}')),
		retry: scheduleInput('Reconnect retry Schedule.', 'unknown', '{{RSchedule}}')
	},
	output: expressionOutput('Scoped schema-decoded WebSocket consumer Layer.', layerType('never', 'never', `${webSocketConstructorRequirement} | {{RDecode}} | {{RHandler}} | {{RSchedule}}`)),
	source: `Layer.scopedDiscard(Effect.gen(function*() { const socket = yield* Socket.makeWebSocket(${marker('expression', 'url', '"ws://localhost:8080"')}, ${marker('expression', 'options', '{}')}); const consume = Stream.runForEach(Stream.mapEffect(Stream.splitLines(Stream.decodeText(Socket.toStream(socket))), line => Effect.flatMap(Effect.try(() => JSON.parse(line)), Schema.decodeUnknown(${marker('expression', 'schema', 'Schema.Unknown')}))), ${marker('expression', 'handler', '() => Effect.void')}); yield* Effect.forkScoped(Effect.retry(consume, ${marker('expression', 'retry', 'Schedule.exponential(100)')})); }))`
})

export const SocketStreamingBoundarySourceFileTemplate = defineTemplate({
	modelId: 'SocketStreamingBoundarySourceFile', version: VERSION, description: 'Builds a complete Effect V4 socket/streaming-boundary source file with unstable Socket APIs in scope.',
	inputs: {
		body: statementCollectionInput('Top-level declarations and program statements.', 1)
	},
	output: { kind: 'sourceFile', description: 'Complete Effect V4 socket source file.' },
	source: `import { Effect, Layer, PubSub, Queue, Schedule, Schema, Stream } from "effect"\nimport { Socket, SocketServer } from "effect/unstable/socket"\n\n${marker('statement', 'body', 'export const program = Effect.void')}`
})

export const effectV4SocketStreamingBoundaryGraphTemplateInputs = [
	SocketTextStreamTemplate,
	SocketLineStreamTemplate,
	SocketJsonLineStreamTemplate,
	SocketSchemaJsonLineStreamTemplate,
	SocketWriteValueTemplate,
	SocketWriteJsonTemplate,
	SocketWriteJsonLineTemplate,
	SocketStreamToWriterTemplate,
	SocketBoundedQueueIngressTemplate,
	SocketPubSubIngressTemplate,
	SocketReconnectConsumerTemplate,
	SocketObservedReconnectConsumerTemplate,
	SocketHeartbeatSessionTemplate,
	SocketBidirectionalQueueBridgeTemplate,
	SocketSchemaRequestResponseSessionTemplate,
	SocketServerStreamingHandlerTemplate,
	SocketServerJsonLineBoundaryTemplate,
	WebSocketReconnectWorkerLayerTemplate,
	WebSocketSchemaEventConsumerLayerTemplate,
	SocketStreamingBoundarySourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
