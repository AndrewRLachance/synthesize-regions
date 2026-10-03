# Effect V4 Socket + Streaming Boundary Templates

This pack adds a production-oriented socket boundary vocabulary for the existing Effect V4 graph-template catalog.

## Target API snapshot

The templates target the current Effect V4 RC socket API exposed from:

```ts
import { Socket, SocketServer } from "effect/unstable/socket"
```

At the time this pack was authored, the core `effect` package reports `4.0.0-rc.115`. The socket namespace is unstable and should be version-pinned with the rest of the V4 catalog.

The current Socket model is pull-based:

- `socket.reader` is scoped and establishes the connection.
- `reader.pull` yields non-empty batches and applies end-to-end backpressure.
- `socket.writer` is scoped; writes made while disconnected suspend until a connection is available.
- clean and abnormal connection termination both surface as `SocketError` on the read side.
- reconnect is therefore represented by retrying the scoped consume effect.

## Files

- `effect-socket-template-helpers.ts` — nominal Socket, Reader, Writer, SocketServer, Address, WebSocket, and Channel descriptors.
- `effect-v4-socket-foundational-templates.ts` — low-level Socket/SocketServer/WebSocket adapters.
- `effect-v4-socket-streaming-boundary-templates.ts` — real-world streaming boundary compositions.
- Public pack entry point: `@synthesize-regions/core-templates/effect-v4/socket`.

## Foundational templates

### Reader / writer lifecycle

- `SocketMake`
- `SocketReader`
- `SocketReaderBytes`
- `SocketReaderString`
- `SocketReaderPull`
- `SocketReaderUpgradeTls`
- `SocketWriter`
- `SocketWriterWrite`
- `SocketWriterWriteAll`
- `SocketCloseEvent`
- `SocketIsCloseEvent`
- `SocketIsSocketError`

### Channel / Stream adapters

- `SocketToChannel`
- `SocketToChannelString`
- `SocketToStream`
- `SocketMakeChannel`

The channel templates intentionally model the default upstream error type as `never`. The current API's generic upstream error is not inferable from the runtime arguments, and this catalog does not leak graph type-parameter placeholders into emitted TypeScript source.

### WebSocket construction

- `SocketWebSocketConstructorGlobalLayer`
- `SocketMakeWebSocket`
- `SocketWebSocketLayer`
- `SocketMakeWebSocketChannel`
- `SocketFromWebSocket`
- `SocketFromTransformStream`

`SocketMakeWebSocket` and `SocketWebSocketLayer` propagate requirements from an effectful URL as well as `WebSocketConstructor`.

### Socket server

- `SocketServerTcpAddress`
- `SocketServerUnixAddress`
- `SocketServerAddress`
- `SocketServerRun`

The core package defines the `SocketServer` service contract; concrete server implementations remain platform-adapter concerns.

## Streaming-boundary compositions

### Framing and decoding

- `SocketTextStream`
- `SocketLineStream`
- `SocketJsonLineStream`
- `SocketSchemaJsonLineStream`

The canonical text-record pipeline is:

```text
Socket
  -> Socket.toStream
  -> Stream.decodeText
  -> framing (for example Stream.splitLines)
  -> JSON parse / Schema.decodeUnknown
  -> domain Stream
```

Do not treat arbitrary transport chunks as application messages. WebSocket frame boundaries are preserved by the WebSocket adapter, but TCP-style transports are byte streams. Protocol framing must be explicit.

### Outbound boundaries

- `SocketWriteValue`
- `SocketWriteJson`
- `SocketWriteJsonLine`
- `SocketStreamToWriter`

The writer remains inside a scope and preserves transport-level backpressure.

### Queue / PubSub bridges

- `SocketBoundedQueueIngress`
- `SocketPubSubIngress`
- `SocketBidirectionalQueueBridge`

A bounded Queue is the preferred bridge when downstream pressure must propagate back toward socket reads. PubSub is appropriate for fan-out but should not be mistaken for durable delivery.

### Reconnection and long-lived workers

- `SocketReconnectConsumer`
- `SocketObservedReconnectConsumer`
- `SocketHeartbeatSession`
- `WebSocketReconnectWorkerLayer`
- `WebSocketSchemaEventConsumerLayer`

Reconnection retries the consume effect, causing a new reader acquisition and therefore a new connection for reconnectable sockets such as `Socket.makeWebSocket`.

### Request/response and server boundaries

- `SocketSchemaRequestResponseSession`
- `SocketServerStreamingHandler`
- `SocketServerJsonLineBoundary`

`SocketSchemaRequestResponseSession` is an NDJSON request/response protocol example. It does not claim multiplexing, correlation IDs, persistence, or RPC semantics; use the RPC catalog when those protocol semantics are required.

### Source-file root

- `SocketStreamingBoundarySourceFile`

This imports only the namespaces needed by the socket/streaming pack and keeps unstable socket imports explicit.

## Boundary design principles

1. **Socket lifetime is scoped.** Do not detach readers/writers from the scope that owns the connection.
2. **Reads are pull/backpressure driven.** Bounded Queue bridges should preserve that pressure rather than introduce an unbounded buffering layer.
3. **Framing is protocol-specific.** Byte chunks are not messages.
4. **Schema belongs after framing.** Decode transport bytes/text, establish record boundaries, parse the serialization format, then apply Effect Schema.
5. **Reconnect at the consume boundary.** Socket termination is represented as a typed failure, so retry naturally reacquires a reader.
6. **Keep transport adapters separate.** The core contract and application pipeline should not depend on Node/Bun/browser-specific server implementations unless the application explicitly selects one.
7. **Prefer RPC for RPC semantics.** Socket request/response examples are transport compositions, not a replacement for the typed RPC subsystem.

## Validation

The generated pack is checked for:

- TypeScript module syntax;
- parseable fallback-generated source;
- exactly one physical marker per declared input;
- no undeclared source markers;
- no generic `{{...}}` placeholders leaking into emitted source;
- no stale callback-style `Socket.run(...)` usage;
- duplicate model IDs; and
- model-ID collisions with all previously generated packs through STM / transactional coordination.
