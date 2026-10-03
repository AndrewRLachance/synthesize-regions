# Effect V4 OpenAPI-Generated Integration Templates

This pack adds build-time OpenAPI code generation and runtime adapters for the generated modules. It sits above the existing HTTP/REST and Cluster-expanded catalogs rather than duplicating `HttpApi`, `OpenApi.fromApi`, `HttpApiClient.make`, or ordinary server/client primitives.

## Current generator model

`@effect/openapi-generator` exposes `OpenApiGenerator.OpenApiGenerator`, whose `generate(spec, options)` operation returns generated TypeScript source. The supported formats are:

- `httpclient` — generated Effect HTTP client with runtime Effect Schema decoding;
- `httpclient-type-only` — generated HTTP client using TypeScript types rather than runtime response Schema decoding;
- `httpapi` — generated Effect `HttpApi` declarations, groups, endpoints, schemas, annotations, and security middleware.

The generator accepts OpenAPI input and also normalizes Swagger 2.0 input internally. Generation warnings are structured callback values rather than failures, so this pack provides both permissive and strict-warning workflows.

The current package metadata observed while authoring reports `@effect/openapi-generator` `4.0.0-rc.117`; the current Effect V4 HTTP documentation reports `4.0.0-rc.118`. Pin generator, Effect, and platform packages together in a real project.

## Files

- `effect-openapi-generated-template-helpers.ts`
- `effect-v4-openapi-generator-foundational-templates.ts`
- `effect-v4-openapi-generated-integration-templates.ts`
- `effect-v4-openapi-generated-integration-template-catalog.ts`
- `effect-v4-expanded-with-openapi-generated-integration-template-catalog.ts`
- `validate-openapi-generated-integration-pack.js`

## Template inventory

### Generator and compiled-client foundations — 18

- `OpenApiGeneratorSchemaLayer`
- `OpenApiGeneratorTypeOnlyLayer`
- `OpenApiGeneratorGenerate`
- `OpenApiGenerateHttpClient`
- `OpenApiGenerateHttpClientTypeOnly`
- `OpenApiGenerateHttpApi`
- `OpenApiGenerateWithWarnings`
- `OpenApiGenerateStrict`
- `OpenApiGenerateWithSchemaTransform`
- `OpenApiGenerateAllFormats`
- `OpenApiGeneratedClientMake`
- `OpenApiGeneratedClientMakeWithTransform`
- `OpenApiGeneratedClientServiceLayer`
- `OpenApiGeneratedClientCall`
- `OpenApiGeneratedClientObservedCall`
- `OpenApiGeneratedClientRetryCall`
- `OpenApiGeneratedHttpApiRoundTrip`
- `OpenApiGeneratorBuildSourceFile`

### Build/runtime integration compositions — 16

- `OpenApiGenerateHttpClientFile`
- `OpenApiGenerateHttpClientTypeOnlyFile`
- `OpenApiGenerateHttpApiFile`
- `OpenApiGeneratedSourceWriteIfChanged`
- `OpenApiGeneratedSourceDriftCheck`
- `OpenApiGenerateStrictFile`
- `OpenApiGenerateAllFormatsFiles`
- `OpenApiJsonSpecGenerate`
- `OpenApiGeneratedClientApplicationLayer`
- `OpenApiGeneratedClientApplicationLayerWithTransform`
- `OpenApiGeneratedHttpApiServerIntegrationLayer`
- `OpenApiGeneratedHttpApiSwaggerIntegrationLayer`
- `OpenApiContractGeneratedHttpApiDriftCheck`
- `OpenApiGeneratedClientAdapterSourceFile`
- `OpenApiGeneratedHttpApiServerSourceFile`
- `OpenApiGeneratedIntegrationTestSourceFile`

Total: **34 concrete templates**.

## Build-time boundary

The generator is intentionally modeled as build-time source production:

```text
OpenAPI / Swagger specification
        ↓
OpenApiGenerator
        ↓
TypeScript source string
        ↓
write / drift check / compile
        ↓
compiled generated module
```

The pack does not evaluate generated source dynamically. Runtime templates accept already-compiled generated module factories/contracts.

## Generated HttpClient integration

Current generated HttpClient modules export a synchronous `make(httpClient, options?)` factory. The returned client retains the supplied `HttpClient` and exposes generated operation methods. `transformClient` is an Effectful per-request hook, so authentication, base URL rewrites, headers, tracing policy, or other transport transformations can remain outside generated code.

Schema-backed generation performs runtime Schema response/error decoding. Type-only generation retains generated operation/error/stream shapes but treats JSON bodies as the declared TypeScript types instead of running generated Schema decoders.

The generator emits companion streaming methods for supported SSE and binary operations.

## Generated HttpApi integration

`httpapi` generation emits Schema declarations, `HttpApiGroup` definitions, `HttpApiEndpoint` declarations, OpenAPI annotations, and generated security middleware before exporting the generated API class. Runtime implementation remains separate: use ordinary `HttpApiBuilder.group`/handler Layers and then serve the generated contract through the HTTP/REST catalog.

`OpenApiGeneratedHttpApiServerIntegrationLayer` and its Swagger variant model exactly that separation.

## Warning policy

Current structured warning codes include:

- cookie parameters dropped;
- additional tags dropped;
- unsupported/missing-metadata SSE operations;
- ignored response headers;
- approximated optional bodies;
- default-response remapping;
- downgraded security `AND` semantics;
- request bodies skipped for methods that cannot carry them;
- generated naming collisions.

`OpenApiGenerateWithWarnings` retains these as data. `OpenApiGenerateStrict` and `OpenApiGenerateStrictFile` fail when any warning is emitted, which is useful for CI-controlled contracts.

## Reproducible generated sources

`OpenApiGeneratedSourceWriteIfChanged` avoids changing generated files when source output is byte-identical.

`OpenApiGeneratedSourceDriftCheck` is intended for CI where generated TypeScript is checked into source control.

`OpenApiContractGeneratedHttpApiDriftCheck` performs a round trip from an Effect `HttpApi` through `OpenApi.fromApi` into generated `httpapi` source and compares it with the checked-in result.

## CLI relationship

The package also ships the `openapigen` command. The current CLI accepts `--spec/-s`, `--name/-n`, `--format/-f`, and repeatable `--patch/-p`; patches may be JSON/YAML files or inline JSON patch arrays and are applied in order. This template pack favors the programmatic service API because warnings, generation policy, file writes, and drift checking remain typed/composable Effects instead of shell processes.

## Current migration edge

Current V4 HTTP documentation exposes the promoted `effect/http` and `effect/http-api` public barrels. The current generator source snapshot used for this pack still contains renderer imports through an unstable HttpApi path in generated `httpapi` source. Treat generated-source **semantic compilation against the pinned RC** as authoritative when upgrading. The templates deliberately do not rewrite generated source strings to mask that upstream transition.

## Validation

The pack validator checks:

- TypeScript host-module syntax;
- fallback-generated source parsing for explicit templates;
- exact declared-input ↔ marker ownership;
- undeclared/repeated markers;
- generic `{{...}}` placeholder leakage;
- duplicate concrete model IDs, including factory-produced templates; and
- collisions against all prior `/mnt/data` template packs through Cluster / Sharding / Distributed Services.

This is structural validation, not full semantic compilation of emitted generated clients against a locally installed pinned RC dependency graph. Full generator-output compilation belongs in the planned catalog hardening / semantic compile harness.
