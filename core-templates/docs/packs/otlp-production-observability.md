# Effect V4 OTLP / Production Observability Templates

This pack adds production telemetry export and observability-boundary templates on top of the existing core logging, tracing, metrics, HTTP, and Application Assembly catalogs.

It contains **48 concrete templates**:

- **34 foundational templates** for lightweight Effect OTLP, Prometheus, and the optional `@effect/opentelemetry` bridge.
- **14 production compositions** for closed exporters, authenticated collectors, selective signals, dual OTLP/Prometheus metrics, HTTP trace filtering, application wiring, and bounded shutdown flushing.

## Current API target

The lightweight path targets the current Effect V4 public barrel:

```ts
import {
  Otlp,
  OtlpExporter,
  OtlpLogger,
  OtlpMetrics,
  OtlpResource,
  OtlpSerialization,
  OtlpTracer,
  PrometheusMetrics
} from "effect/observability"
```

The repository package metadata observed during this audit reports `effect` **4.0.0-rc.117**, while the current V4 documentation pages report **4.0.0-rc.118**. The observability modules are still marked unstable in their module documentation, so this catalog should remain pinned to the selected Effect RC.

For teams already using the official OpenTelemetry SDK ecosystem, a separate bridge is modeled through:

```ts
import { NodeSdk, OtelMetrics, Resource, WebSdk } from "@effect/opentelemetry"
```

The two approaches are deliberately separated in the source-file templates and catalog descriptions.

## Lightweight OTLP architecture

The normal production path is:

```text
Effect logs / spans / Metric registry
              ↓
 OtlpLogger / OtlpTracer / OtlpMetrics
              ↓
       shared OtlpExporter.Flusher
              ↓
 OtlpSerialization JSON or protobuf
              ↓
            HttpClient
              ↓
 collector / vendor OTLP HTTP endpoint
```

`Otlp.layer` installs logs, metrics, and traces from one configuration. `Otlp.layerJson` and `Otlp.layerProtobuf` close the serialization dependency while retaining the `HttpClient` requirement.

The production compositions provide `FetchHttpClient.layer` when a fully closed exporter Layer is desired.

## Shared flusher semantics

Signal-specific `OtlpTracer.layer`, `OtlpLogger.layer`, and `OtlpMetrics.layer` expose the shared `OtlpExporter.Flusher` service. Effect's exporter implementation intentionally uses one memoized flusher Layer so traces, logs, and metrics built in the same Layer graph register with one flush registry.

Included templates:

- `OtlpExporterFlusherLayer`
- `OtlpExporterFlush`
- `OtlpExporterFlushWithTimeout`
- `OtlpFlushBeforeEffect`
- `OtlpFlushBeforeEffectWithTimeout`

A manual `flush` drains the exports it initiates and cannot fail. It cannot wait for an export that was already in flight before the flush call. The bounded variants therefore use `Effect.timeoutOption` to place a call-site limit on shutdown draining without converting telemetry shutdown into a typed failure.

The combined `Otlp.layer*` Layers intentionally hide the Flusher service. Use signal-specific exporter Layers when application code needs explicit manual-flush access.

## Resource metadata

The lightweight resource templates include:

- `OtlpResourceMake`
- `OtlpResourceFromConfig`
- `OtlpResourceEntriesToAttributes`
- `OtlpResourceUnknownToAttributeValue`

`OtlpResource.fromConfig` is intended for OpenTelemetry-compatible environment-driven resource metadata, including service identity and resource attributes. Explicit configuration can be layered over environment-provided values.

For the official SDK bridge, the corresponding templates are:

- `OtelResourceLayer`
- `OtelResourceFromEnvLayer`
- `OtelResourceEmptyLayer`

## Metrics

The lightweight metrics exporter supports both:

- `"cumulative"` — totals from a fixed start point; current default.
- `"delta"` — changes since the previous successful export.

Templates include:

- `OtlpMetricsMake`
- `OtlpMetricsLayer`
- `OtlpMetricsLayerFromConfig`
- `OtlpMetricsTemporality`
- `OtlpMetricsOnlyJsonLayer`

`OtlpDualMetricsBoundaryLayer` deliberately supports simultaneous push and scrape boundaries:

```text
Effect Metric registry
      ├── OTLP metrics exporter → collector
      └── PrometheusMetrics     → /metrics scrape
```

This is not duplicate ownership of the same exporter; it is two independent consumers of the Effect metric registry.

## Prometheus and HTTP trace filtering

The pack includes:

- `PrometheusMetricsFormat`
- `PrometheusMetricsHttpLayer`
- `HttpTracerDisabledForUrlsLayer`
- `ProductionHttpObservabilityLayer`

`PrometheusMetrics.layerHttp` registers a metrics route into the current `HttpRouter`. `HttpMiddleware.layerTracerDisabledForUrls` can suppress server spans for exact operational endpoints such as `/health`, `/ready`, and `/metrics`.

This avoids creating noisy self-observation traffic while keeping application and API traffic traced.

## Serialization

The catalog exposes both:

- `OtlpSerializationJsonLayer`
- `OtlpSerializationProtobufLayer`

JSON is convenient for diagnostics and broad compatibility. Protobuf is the more compact OTLP wire representation. The application should normally choose one serialization path for a given collector boundary.

## Authentication and HTTPS

`OtlpAuthenticatedJsonLayer` and `OtlpAuthenticatedProtobufLayer` add an `Authorization: Bearer ...` header while closing the `HttpClient` dependency with `FetchHttpClient.layer`.

HTTPS/TLS behavior is delegated to the configured Effect HTTP client/platform transport. These templates do **not** invent a separate TLS configuration API at the OTLP layer.

## Selective signal ownership

Production systems do not always export every signal to the same backend. The pack includes:

- `OtlpTracingLoggingJsonLayer`
- `OtlpTracingOnlyJsonLayer`
- `OtlpMetricsOnlyJsonLayer`

This makes signal ownership explicit and avoids enabling a second metrics/logging/tracing pipeline accidentally.

## `@effect/opentelemetry` bridge

Use the official SDK bridge when the application already owns OpenTelemetry SDK processors/readers/exporters or needs broader SDK ecosystem integration.

Foundational templates:

- `OtelResourceLayer`
- `OtelResourceFromEnvLayer`
- `OtelResourceEmptyLayer`
- `OtelMetricsLayer`
- `OtelNodeSdkLayer`
- `OtelWebSdkLayer`
- `OpenTelemetryBridgeSourceFile`

`NodeSdk.layer` and `WebSdk.layer` provide the OpenTelemetry Resource service and can own span processors, metric readers, and log record processors supplied in their SDK configuration.

Do not install a lightweight `OtlpTracer` export path and an official-SDK tracing export path for the same application merely by default. That creates two tracing owners and can intentionally or accidentally duplicate exported telemetry. The same principle applies to logs and metrics.

## Application assembly

`OtlpObservedApplicationLayer` wraps an application Layer with a closed observability Layer:

```text
closed production observability Layer
                ↓ provide
         application Layer
                ↓
        Application Assembly
                ↓
          Layer.launch
```

Because telemetry Layers are scoped, their finalizers participate in the same application lifetime and perform their configured shutdown behavior when the surrounding application scope closes.

For explicit shutdown draining, compose `OtlpFlushBeforeEffectWithTimeout` with the application shutdown sequence before acknowledging termination.

## Foundational template inventory

1. `OtlpLayer`
2. `OtlpLayerFromConfig`
3. `OtlpLayerJson`
4. `OtlpLayerProtobuf`
5. `OtlpSerializationJsonLayer`
6. `OtlpSerializationProtobufLayer`
7. `OtlpResourceMake`
8. `OtlpResourceFromConfig`
9. `OtlpResourceEntriesToAttributes`
10. `OtlpResourceUnknownToAttributeValue`
11. `OtlpTracerMake`
12. `OtlpTracerLayer`
13. `OtlpTracerLayerFromConfig`
14. `OtlpLoggerMake`
15. `OtlpLoggerLayer`
16. `OtlpLoggerLayerFromConfig`
17. `OtlpMetricsMake`
18. `OtlpMetricsLayer`
19. `OtlpMetricsLayerFromConfig`
20. `OtlpMetricsTemporality`
21. `OtlpExporterFlusherLayer`
22. `OtlpExporterFlush`
23. `OtlpExporterFlushWithTimeout`
24. `PrometheusMetricsFormat`
25. `PrometheusMetricsHttpLayer`
26. `HttpTracerDisabledForUrlsLayer`
27. `OtelResourceLayer`
28. `OtelResourceFromEnvLayer`
29. `OtelResourceEmptyLayer`
30. `OtelMetricsLayer`
31. `OtelNodeSdkLayer`
32. `OtelWebSdkLayer`
33. `OtlpProductionObservabilitySourceFile`
34. `OpenTelemetryBridgeSourceFile`

## Production-composition inventory

1. `OtlpJsonProductionLayer`
2. `OtlpProtobufProductionLayer`
3. `OtlpJsonFromConfigProductionLayer`
4. `OtlpProtobufFromConfigProductionLayer`
5. `OtlpTracingLoggingJsonLayer`
6. `OtlpTracingOnlyJsonLayer`
7. `OtlpMetricsOnlyJsonLayer`
8. `OtlpAuthenticatedJsonLayer`
9. `OtlpAuthenticatedProtobufLayer`
10. `OtlpDualMetricsBoundaryLayer`
11. `ProductionHttpObservabilityLayer`
12. `OtlpObservedApplicationLayer`
13. `OtlpFlushBeforeEffect`
14. `OtlpFlushBeforeEffectWithTimeout`

## Validation

The included validator checks:

- TypeScript host-module syntax.
- fallback-generated source syntax.
- exact declared-input to source-marker ownership.
- missing, repeated, and undeclared markers.
- generic `{{...}}` placeholder leakage into emitted source.
- duplicate model IDs inside this pack.
- model-ID collisions with the existing generated catalog files in the workspace.

All **48 model IDs** currently pass those checks.

This is structural and API-audited validation, not a full semantic project typecheck against a locally installed matching Effect + `@effect/opentelemetry` dependency graph.
