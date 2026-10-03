# Effect V4 HTTP / REST Service Boundary Templates

This pack adds HTTP client/server primitives, declarative REST contracts, generated clients, authentication middleware, OpenAPI/Swagger integration, and production service-boundary compositions to the Effect V4 template catalog.

## Current V4 import surface

The pack targets the current public V4 barrels:

```ts
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse
} from "effect/http"

import {
  HttpApi,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  HttpApiSwagger,
  OpenApi
} from "effect/http-api"
```

The V4 documentation snapshot used for the API audit reports `4.0.0-rc.118`. Because V4 remains release-candidate software, pin this catalog to the Effect version used by the synthesis runner and recapture it when upgrading.

## Files

- `effect-http-rest-template-helpers.ts` — nominal HTTP / HttpApi descriptors and service requirement markers.
- `effect-v4-http-foundational-templates.ts` — raw HTTP request, client, response, request-decoding, router, and server templates.
- `effect-v4-http-api-foundational-templates.ts` — declarative HttpApi contracts, group/endpoint builders, generated clients, middleware/security, response schemas, OpenAPI, and Swagger.
- `effect-v4-http-rest-service-boundary-templates.ts` — production server/client/auth/health/documentation compositions.
- Public pack entry point: `@synthesize-regions/core-templates/effect-v4/http`.
- Structural verification: the package-wide generated validator.

## Template count

**90 concrete templates**:

- **39** raw HTTP foundations
- **36** declarative HttpApi foundations
- **15** real-world REST/service-boundary compositions

## Raw HTTP foundations

### Client requests

The pack includes immutable constructors for GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS plus:

- header replacement
- URL parameters
- Basic auth
- Bearer auth
- text bodies
- effectful JSON bodies
- Schema-encoded JSON bodies
- streaming byte bodies

`HttpClientRequest.bodyJson` is intentionally effectful because JSON serialization can fail. The schema variant tracks the Schema encoding service channel separately.

### HttpClient

Templates cover:

- execution of prebuilt requests
- direct GET/POST/PUT/PATCH/DELETE accessors
- 2xx filtering
- retry policies
- bounded redirect following
- RateLimiter integration

The resilient declarative-client composition uses bounded `times` retries so it does not silently create unbounded HTTP retry behavior.

### Server responses

Templates cover:

- empty responses
- text responses
- effectful JSON responses
- Schema-encoded JSON responses
- byte-stream responses
- redirects

### Server request decoding

Schema-backed helpers cover:

- JSON bodies
- request headers
- parsed search parameters

Schema failures remain in the typed error channel instead of being converted into exceptions.

### Router / server

Templates cover route registration, CORS, router serving, and direct HttpServer serving.

## Declarative REST contracts

`HttpApi` is the preferred synthesis target when the desired boundary is a typed REST API rather than an ad-hoc route.

A contract is assembled as:

```text
Schema
  ↓
HttpApiEndpoint
  ↓
HttpApiGroup
  ↓
HttpApi
```

Endpoint declarations carry the schemas for path params, query params, payloads, headers, successes, errors, middleware, and annotations. They are declarations rather than handlers.

The same contract drives:

```text
HttpApi
 ├─ HttpApiBuilder    → server decoding / handlers / response encoding
 ├─ HttpApiClient     → generated typed client
 ├─ urlBuilder        → typed URL construction
 ├─ OpenApi.fromApi   → OpenAPI 3.1
 └─ HttpApiSwagger    → interactive Swagger UI
```

This shared-contract property is why these templates favor `HttpApi` over manually keeping independent route/client/OpenAPI definitions in sync.

## Endpoint declarations

Foundational templates cover GET, POST, PUT, PATCH, and DELETE endpoint declarations. The endpoint options marker is intentionally one composable region so callers can supply any currently supported combination of:

- `params`
- `query`
- `payload`
- `headers`
- `success`
- `error`
- codec configuration

Endpoint/group/API prefix and middleware transformations are separate graph nodes.

## Server implementation

`HttpApiBuilder.group` is represented as the unit for implementing a resource/feature group. The real-world `HttpApiHandleAllGroupLayer` composition accepts a complete handler record and registers it through `handlers.handleAll`.

`HttpApiBuilder.layer` performs the final contract-to-router registration. Production server compositions wire group implementation Layers into that registration Layer and then hand the router application to `HttpRouter.serve`.

## Generated clients

The catalog includes:

- full API client derivation
- one-group client derivation
- typed URL builder derivation
- generated-client-as-Context.Service Layer
- generated client with 2xx filtering, redirect handling, and bounded retry

Generated clients consume the same endpoint request and response schemas as the server contract.

## Authentication / authorization

Foundations include:

- Bearer security declaration
- Basic security declaration
- API-key declaration for headers, query params, or cookies
- typed `HttpApiMiddleware.Service` declaration
- server middleware Layer
- client middleware Layer

Real-world compositions include:

- server Bearer authentication that authenticates the decoded credential and provides a principal service to endpoint handlers
- generated-client Bearer middleware that decorates outgoing requests
- authenticated API server assembly

A security scheme only declares credential transport. Authentication remains an explicit middleware implementation.

## HTTP API response schemas

The pack includes:

- `NoContent` / 204
- `Created` / 201
- `Accepted` / 202
- arbitrary status annotations
- Server-Sent Events stream schemas
- streaming `Uint8Array` schemas

SSE remains a schema-level streaming success contract so generated servers, clients, and OpenAPI can agree on the same protocol metadata.

## OpenAPI and Swagger

- `OpenApiAnnotations` builds API/group/endpoint metadata Context.
- `OpenApiFromApi` generates an OpenAPI 3.1 document synchronously from the declarative contract.
- `HttpOpenApiJsonRouteLayer` serves that document as JSON.
- `HttpApiSwaggerLayer` mounts Swagger UI.
- `HttpApiSwaggerServerBoundaryLayer` composes API routes and interactive documentation into one server boundary.

## Production compositions

The service-boundary module contains:

1. `HttpApiHandleAllGroupLayer`
2. `HttpApiServerBoundaryLayer`
3. `HttpApiCorsServerBoundaryLayer`
4. `HttpApiSwaggerServerBoundaryLayer`
5. `HttpApiAuthenticatedServerBoundaryLayer`
6. `HttpApiGeneratedClientServiceLayer`
7. `HttpApiResilientClientServiceLayer`
8. `HttpApiBearerClientMiddlewareLayer`
9. `HttpApiBearerAuthMiddlewareLayer`
10. `HttpHealthRoutesLayer`
11. `HttpOpenApiJsonRouteLayer`
12. `HttpApiWebHandlerBoundary`
13. `HttpApiContractSourceFile`
14. `HttpApiServerSourceFile`
15. `HttpApiClientSourceFile`

## Application Assembly integration

The canonical catalog registers this pack once in the explicit pack registry.

A typical assembled service becomes:

```text
Config / SQL / repositories / domain services
                  ↓
HttpApi group implementation Layers
                  ↓
HttpApiBuilder.layer
                  ↓
Swagger / CORS / health route Layers
                  ↓
HttpRouter.serve
                  ↓
ApplicationStartupGatedRootLayer
                  ↓
Layer.launch
                  ↓
NodeRuntime.runMain / BunRuntime.runMain
```

This keeps API contracts independent from platform process ownership and lets migrations/readiness from the Application Assembly pack remain upstream of listening server boundaries.

## Validation

The package-wide generated validator checks:

- TypeScript module syntax
- generated fallback-source syntax
- one physical marker per declared input
- no undeclared markers
- no repeated markers
- no `{{...}}` graph type placeholders in emitted source
- concrete factory-generated request/client/endpoint fallback source
- duplicate model IDs
- unique ownership across every registered domain pack

This pack contains **90 concrete templates**; current package-wide structural
evidence reports zero failures.

As with the preceding packs, this is a structural/source validation pass plus an API audit against current upstream documentation/source. It is not a full semantic TypeScript build of every possible generated graph against every supported platform adapter.
