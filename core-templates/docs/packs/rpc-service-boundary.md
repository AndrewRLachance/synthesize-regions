# Effect V4 RPC / Service Boundary Template Pack

This pack adds transport-independent RPC contracts, handler/client derivation, middleware, serialization, HTTP/WebSocket/socket protocol boundaries, and production service-boundary compositions for Effect V4.

## Runtime baseline

The templates target the current Effect V4 RC RPC modules under:

```ts
import { Rpc, RpcClient, RpcGroup, RpcMiddleware, RpcSerialization, RpcServer } from "effect/unstable/rpc"
```

RPC remains an `effect/unstable/*` module in V4, so this pack should be versioned together with the Effect RC used by the template catalog.

The design follows the V4 split:

- `Rpc` owns the transport-independent procedure contract.
- `RpcGroup` aggregates contracts and derives server handler Layers.
- `RpcClient.make` derives a typed client from the same group.
- `RpcClient.Protocol` and `RpcServer.Protocol` own transport behavior.
- `RpcSerialization` owns wire encoding independently of the transport.
- `RpcMiddleware.Service` models server middleware and optional client middleware requirements.

## Files

- `effect-rpc-template-helpers.ts` — nominal descriptors and requirement markers.
- `effect-v4-rpc-foundational-templates.ts` — foundational RPC/group/client/server/serialization/middleware templates.
- `effect-v4-rpc-service-boundary-templates.ts` — real-world boundary compositions.
- Public pack entry point: `@synthesize-regions/core-templates/effect-v4/rpc`.

## Foundational coverage

The foundational catalog covers:

- unary and streaming `Rpc.make` contracts;
- payload / success / error schema replacement;
- RPC and group prefixes;
- attaching middleware;
- forked and uninterruptible handler wrappers;
- group creation, addition, merging and handler derivation;
- client creation and request headers;
- HTTP and socket client protocols;
- generic, HTTP, WebSocket and SocketServer server protocols;
- HTTP serving effects;
- JSON, NDJSON, JSON-RPC, NDJSON-RPC and SchemaBinary serialization;
- middleware service declarations and server/client middleware Layers;
- a complete V4 RPC source-file template.

## Real-world compositions

The composition catalog includes:

- exported unary and streaming procedure declarations;
- complete handler Layers;
- JSON-over-HTTP server boundaries;
- JSON-over-WebSocket server boundaries;
- typed client-as-service Layers over HTTP;
- JSON-RPC client service Layers;
- authentication middleware that provides an authenticated principal;
- request-context middleware that exposes request metadata to handlers;
- bearer-token client calls;
- timeout + retry + tracing RPC calls;
- authenticated JSON HTTP server assembly.

## Service-boundary guidance

Keep domain services independent of the transport. RPC handlers should normally be thin adapters that decode through the shared RPC schema contract, invoke domain Effects, and return domain values/errors already represented by the RPC schemas.

Transport Layers should live at the application boundary. A useful dependency shape is:

```text
Schemas / domain errors
        ↓
RPC contracts (Rpc / RpcGroup)
        ↓
Handler Layer ← domain service Layers
        ↓
RPC server Layer
        ↓
Protocol Layer + RpcSerialization
        ↓
HttpRouter / SocketServer / platform runtime
```

On the client side:

```text
RpcGroup
   ↓
RpcClient.make
   ↓
application client Context.Service
   ↓
Protocol Layer + RpcSerialization
   ↓
HttpClient / Socket
```

## Catalog integration

The canonical registry owns this pack explicitly. All model IDs in it remain
distinct from the SQL/repository/transaction pack.

The templates deliberately do not duplicate generic Effect retry, timeout, observability, Stream, circuit-breaker, or rate-limiter primitives. RPC-specific compositions consume those semantics at the boundary where useful.
