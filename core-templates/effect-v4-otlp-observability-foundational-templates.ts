import { defineTemplate } from './sample-definition.js'
import { effectDurationInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	layerType,
	marker,
	statementCollectionInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	httpClientRequirement,
	httpRouterRequirement,
	otelNodeSdkConfigurationType,
	otelResourceRequirement,
	otelWebSdkConfigurationType,
	otlpFlusherRequirement,
	otlpHeadersType,
	otlpResourceConfigType,
	otlpResourceType,
	otlpSerializationRequirement,
	otlpTemporalityType,
	scopeRequirement
} from './effect-production-observability-template-helpers.js'

/**
 * Effect v4 production-observability foundations.
 *
 * Lightweight OTLP runtime contract:
 *   import { Effect, Layer } from 'effect'
 *   import { FetchHttpClient, HttpMiddleware } from 'effect/unstable/http'
 *   import { Otlp, OtlpExporter, OtlpLogger, OtlpMetrics, OtlpResource, OtlpSerialization, OtlpTracer, PrometheusMetrics } from 'effect/unstable/observability'
 *
 * Existing OpenTelemetry SDK integration:
 *   import { NodeSdk, OtelMetrics, Resource, WebSdk } from '@effect/opentelemetry'
 */
const VERSION = '1.0.0' as const

const resourceInput = (description: string) => typedExpressionInput(description, otlpResourceConfigType())
const headersInput = (description: string) => typedExpressionInput(description, otlpHeadersType())
const temporalityInput = (description: string) => typedExpressionInput(description, otlpTemporalityType())

const commonOtlpOptionsType = {
	ts: '{ readonly baseUrl: string; readonly resource?: { readonly serviceName?: string; readonly serviceVersion?: string; readonly attributes?: Readonly<Record<string, unknown>> }; readonly headers?: Readonly<Record<string, string>>; readonly maxBatchSize?: number; readonly loggerExportInterval?: unknown; readonly loggerExcludeLogSpans?: boolean; readonly loggerMergeWithExisting?: boolean; readonly metricsExportInterval?: unknown; readonly metricsTemporality?: "cumulative" | "delta"; readonly tracerExportInterval?: unknown; readonly shutdownTimeout?: unknown }'
}
const signalOptionsType = {
	ts: '{ readonly url: string; readonly resource?: { readonly serviceName?: string; readonly serviceVersion?: string; readonly attributes?: Readonly<Record<string, unknown>> }; readonly headers?: Readonly<Record<string, string>>; readonly exportInterval?: unknown; readonly shutdownTimeout?: unknown; readonly maxBatchSize?: number }'
}
const loggerOptionsType = {
	ts: '{ readonly url: string; readonly resource?: { readonly serviceName?: string; readonly serviceVersion?: string; readonly attributes?: Readonly<Record<string, unknown>> }; readonly headers?: Readonly<Record<string, string>>; readonly exportInterval?: unknown; readonly shutdownTimeout?: unknown; readonly maxBatchSize?: number; readonly excludeLogSpans?: boolean; readonly mergeWithExisting?: boolean }'
}
const metricsOptionsType = {
	ts: '{ readonly url: string; readonly resource?: { readonly serviceName?: string; readonly serviceVersion?: string; readonly attributes?: Readonly<Record<string, unknown>> }; readonly headers?: Readonly<Record<string, string>>; readonly exportInterval?: unknown; readonly shutdownTimeout?: unknown; readonly temporality?: "cumulative" | "delta" }'
}

export const OtlpLayerTemplate = defineTemplate({
	modelId: 'OtlpLayer', version: VERSION,
	description: 'Creates a combined OTLP logs, metrics, and traces Layer using an externally supplied OTLP serialization service.',
	inputs: { options: typedExpressionInput('Combined OTLP options.', commonOtlpOptionsType) },
	output: expressionOutput('Combined OTLP Layer.', layerType('never', 'never', `${httpClientRequirement} | ${otlpSerializationRequirement}`)),
	source: `Otlp.layer(${marker('expression', 'options', '{ baseUrl: "http://localhost:4318" }')})`
})

export const OtlpLayerFromConfigTemplate = defineTemplate({
	modelId: 'OtlpLayerFromConfig', version: VERSION,
	description: 'Creates combined OTLP export from OpenTelemetry environment/configuration while allowing explicit resource/header overrides.',
	inputs: { options: valueInput('Optional OTLP config overrides.', { ts: 'unknown' }) },
	output: expressionOutput('Config-driven combined OTLP Layer.', layerType('never', 'never', `${httpClientRequirement} | ${otlpSerializationRequirement}`)),
	source: `Otlp.layerFromConfig(${marker('expression', 'options', '{}')})`
})

export const OtlpLayerJsonTemplate = defineTemplate({
	modelId: 'OtlpLayerJson', version: VERSION,
	description: 'Creates combined OTLP logs, metrics, and traces using JSON serialization.',
	inputs: { options: typedExpressionInput('Combined OTLP options.', commonOtlpOptionsType) },
	output: expressionOutput('JSON OTLP Layer.', layerType('never', 'never', httpClientRequirement)),
	source: `Otlp.layerJson(${marker('expression', 'options', '{ baseUrl: "http://localhost:4318" }')})`
})

export const OtlpLayerProtobufTemplate = defineTemplate({
	modelId: 'OtlpLayerProtobuf', version: VERSION,
	description: 'Creates combined OTLP logs, metrics, and traces using protobuf serialization.',
	inputs: { options: typedExpressionInput('Combined OTLP options.', commonOtlpOptionsType) },
	output: expressionOutput('Protobuf OTLP Layer.', layerType('never', 'never', httpClientRequirement)),
	source: `Otlp.layerProtobuf(${marker('expression', 'options', '{ baseUrl: "http://localhost:4318" }')})`
})

export const OtlpSerializationJsonLayerTemplate = defineTemplate({
	modelId: 'OtlpSerializationJsonLayer', version: VERSION,
	description: 'Provides JSON serialization for OTLP telemetry payloads.',
	inputs: {},
	output: expressionOutput('OTLP JSON serialization Layer.', layerType(otlpSerializationRequirement, 'never', 'never')),
	source: 'OtlpSerialization.layerJson'
})

export const OtlpSerializationProtobufLayerTemplate = defineTemplate({
	modelId: 'OtlpSerializationProtobufLayer', version: VERSION,
	description: 'Provides protobuf serialization for OTLP telemetry payloads.',
	inputs: {},
	output: expressionOutput('OTLP protobuf serialization Layer.', layerType(otlpSerializationRequirement, 'never', 'never')),
	source: 'OtlpSerialization.layerProtobuf'
})

export const OtlpResourceMakeTemplate = defineTemplate({
	modelId: 'OtlpResourceMake', version: VERSION,
	description: 'Creates OTLP resource metadata from explicit service identity and attributes.',
	inputs: {
		serviceName: effectValueInput('Service name.', { ts: 'string' }),
		serviceVersion: effectValueInput('Optional service version.', { ts: 'string | undefined' }),
		attributes: effectValueInput('Additional resource attributes.', { ts: 'Readonly<Record<string, unknown>> | undefined' })
	},
	output: expressionOutput('OTLP Resource value.', otlpResourceType()),
	source: `OtlpResource.make({ serviceName: ${marker('expression', 'serviceName', '"service"')}, serviceVersion: ${marker('expression', 'serviceVersion', 'undefined')}, attributes: ${marker('expression', 'attributes', '{}')} })`
})

export const OtlpResourceFromConfigTemplate = defineTemplate({
	modelId: 'OtlpResourceFromConfig', version: VERSION,
	description: 'Creates OTLP resource metadata from explicit overrides plus OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES.',
	inputs: { options: valueInput('Optional explicit resource overrides.', { ts: 'unknown' }) },
	output: expressionOutput('Config-derived OTLP Resource Effect.', effectType(otlpResourceType().ts, 'never', 'never')),
	source: `OtlpResource.fromConfig(${marker('expression', 'options', '{}')})`
})

export const OtlpResourceEntriesToAttributesTemplate = defineTemplate({
	modelId: 'OtlpResourceEntriesToAttributes', version: VERSION,
	description: 'Converts key/value entries into OTLP KeyValue attributes.',
	inputs: { entries: valueInput('Attribute entries.', { ts: 'Iterable<[string, unknown]>' }) },
	output: expressionOutput('OTLP KeyValue attribute array.', { ts: 'ReadonlyArray<unknown>' }),
	source: `OtlpResource.entriesToAttributes(${marker('expression', 'entries', '[]')})`
})

export const OtlpResourceUnknownToAttributeValueTemplate = defineTemplate({
	modelId: 'OtlpResourceUnknownToAttributeValue', version: VERSION,
	description: 'Converts an arbitrary JavaScript value into an OTLP AnyValue.',
	inputs: { value: valueInput('Attribute value.') },
	output: expressionOutput('OTLP AnyValue.', { ts: 'unknown' }),
	source: `OtlpResource.unknownToAttributeValue(${marker('expression', 'value', 'undefined')})`
})

export const OtlpTracerMakeTemplate = defineTemplate({
	modelId: 'OtlpTracerMake', version: VERSION,
	description: 'Creates a scoped OTLP-backed Effect Tracer value.',
	inputs: { options: typedExpressionInput('OTLP trace exporter options.', signalOptionsType) },
	output: expressionOutput('OTLP Tracer creation Effect.', effectType('{ readonly span: (...args: ReadonlyArray<unknown>) => unknown }', 'never', `${otlpFlusherRequirement} | ${otlpSerializationRequirement} | ${httpClientRequirement} | ${scopeRequirement}`)),
	source: `OtlpTracer.make(${marker('expression', 'options', '{ url: "http://localhost:4318/v1/traces" }')})`
})

export const OtlpTracerLayerTemplate = defineTemplate({
	modelId: 'OtlpTracerLayer', version: VERSION,
	description: 'Installs an OTLP tracer and exposes the shared OTLP flusher service.',
	inputs: { options: typedExpressionInput('OTLP trace exporter options.', signalOptionsType) },
	output: expressionOutput('OTLP tracing Layer.', layerType(otlpFlusherRequirement, 'never', `${otlpSerializationRequirement} | ${httpClientRequirement}`)),
	source: `OtlpTracer.layer(${marker('expression', 'options', '{ url: "http://localhost:4318/v1/traces" }')})`
})

export const OtlpTracerLayerFromConfigTemplate = defineTemplate({
	modelId: 'OtlpTracerLayerFromConfig', version: VERSION,
	description: 'Installs OTLP tracing using OpenTelemetry configuration/environment values.',
	inputs: { options: valueInput('Optional resource/header/context overrides.', { ts: 'unknown' }) },
	output: expressionOutput('Config-driven OTLP tracing Layer.', layerType(otlpFlusherRequirement, 'never', `${otlpSerializationRequirement} | ${httpClientRequirement}`)),
	source: `OtlpTracer.layerFromConfig(${marker('expression', 'options', '{}')})`
})

export const OtlpLoggerMakeTemplate = defineTemplate({
	modelId: 'OtlpLoggerMake', version: VERSION,
	description: 'Creates a scoped Effect Logger that exports log records over OTLP.',
	inputs: { options: typedExpressionInput('OTLP log exporter options.', loggerOptionsType) },
	output: expressionOutput('OTLP Logger creation Effect.', effectType('{ readonly log: (...args: ReadonlyArray<unknown>) => void }', 'never', `${otlpFlusherRequirement} | ${otlpSerializationRequirement} | ${httpClientRequirement} | ${scopeRequirement}`)),
	source: `OtlpLogger.make(${marker('expression', 'options', '{ url: "http://localhost:4318/v1/logs" }')})`
})

export const OtlpLoggerLayerTemplate = defineTemplate({
	modelId: 'OtlpLoggerLayer', version: VERSION,
	description: 'Installs an OTLP Logger; by default it is merged with existing loggers.',
	inputs: { options: typedExpressionInput('OTLP log exporter options.', loggerOptionsType) },
	output: expressionOutput('OTLP logging Layer.', layerType(otlpFlusherRequirement, 'never', `${otlpSerializationRequirement} | ${httpClientRequirement}`)),
	source: `OtlpLogger.layer(${marker('expression', 'options', '{ url: "http://localhost:4318/v1/logs" }')})`
})

export const OtlpLoggerLayerFromConfigTemplate = defineTemplate({
	modelId: 'OtlpLoggerLayerFromConfig', version: VERSION,
	description: 'Installs OTLP log export using OpenTelemetry configuration/environment values.',
	inputs: { options: valueInput('Optional resource/header/logger overrides.', { ts: 'unknown' }) },
	output: expressionOutput('Config-driven OTLP logging Layer.', layerType(otlpFlusherRequirement, 'never', `${otlpSerializationRequirement} | ${httpClientRequirement}`)),
	source: `OtlpLogger.layerFromConfig(${marker('expression', 'options', '{}')})`
})

export const OtlpMetricsMakeTemplate = defineTemplate({
	modelId: 'OtlpMetricsMake', version: VERSION,
	description: 'Starts a scoped OTLP metrics exporter that periodically snapshots the Effect metric registry.',
	inputs: { options: typedExpressionInput('OTLP metrics exporter options.', metricsOptionsType) },
	output: expressionOutput('OTLP metrics exporter Effect.', effectType('void', 'never', `${otlpFlusherRequirement} | ${otlpSerializationRequirement} | ${httpClientRequirement} | ${scopeRequirement}`)),
	source: `OtlpMetrics.make(${marker('expression', 'options', '{ url: "http://localhost:4318/v1/metrics" }')})`
})

export const OtlpMetricsLayerTemplate = defineTemplate({
	modelId: 'OtlpMetricsLayer', version: VERSION,
	description: 'Starts OTLP metrics export and exposes the shared OTLP flusher service.',
	inputs: { options: typedExpressionInput('OTLP metrics exporter options.', metricsOptionsType) },
	output: expressionOutput('OTLP metrics Layer.', layerType(otlpFlusherRequirement, 'never', `${otlpSerializationRequirement} | ${httpClientRequirement}`)),
	source: `OtlpMetrics.layer(${marker('expression', 'options', '{ url: "http://localhost:4318/v1/metrics" }')})`
})

export const OtlpMetricsLayerFromConfigTemplate = defineTemplate({
	modelId: 'OtlpMetricsLayerFromConfig', version: VERSION,
	description: 'Starts OTLP metrics export using OpenTelemetry configuration/environment values.',
	inputs: { options: valueInput('Optional resource/header overrides.', { ts: 'unknown' }) },
	output: expressionOutput('Config-driven OTLP metrics Layer.', layerType(otlpFlusherRequirement, 'never', `${otlpSerializationRequirement} | ${httpClientRequirement}`)),
	source: `OtlpMetrics.layerFromConfig(${marker('expression', 'options', '{}')})`
})

export const OtlpMetricsTemporalityTemplate = defineTemplate({
	modelId: 'OtlpMetricsTemporality', version: VERSION,
	description: 'Represents an OTLP metric aggregation temporality choice.',
	inputs: { temporality: temporalityInput('Metric aggregation temporality.') },
	output: expressionOutput('OTLP aggregation temporality.', otlpTemporalityType()),
	source: `${marker('expression', 'temporality', '"cumulative"')}`
})

export const OtlpExporterFlusherLayerTemplate = defineTemplate({
	modelId: 'OtlpExporterFlusherLayer', version: VERSION,
	description: 'Provides the shared OTLP exporter Flusher registry used to manually drain all registered telemetry exporters.',
	inputs: {},
	output: expressionOutput('OTLP flusher Layer.', layerType(otlpFlusherRequirement, 'never', 'never')),
	source: 'OtlpExporter.layerFlusher'
})

export const OtlpExporterFlushTemplate = defineTemplate({
	modelId: 'OtlpExporterFlush', version: VERSION,
	description: 'Flushes all OTLP exporters registered with the shared Flusher.',
	inputs: {},
	output: expressionOutput('Manual OTLP flush Effect.', effectType('void', 'never', otlpFlusherRequirement)),
	source: 'Effect.flatMap(OtlpExporter.Flusher, flusher => flusher.flush)'
})

export const OtlpExporterFlushWithTimeoutTemplate = defineTemplate({
	modelId: 'OtlpExporterFlushWithTimeout', version: VERSION,
	description: 'Flushes registered OTLP exporters with a call-site timeout bound.',
	inputs: { timeout: effectDurationInput('Maximum manual flush duration.') },
	output: expressionOutput('Timed OTLP flush Effect.', effectType('{ readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: void }', 'never', otlpFlusherRequirement)),
	source: `Effect.timeoutOption(Effect.flatMap(OtlpExporter.Flusher, flusher => flusher.flush), ${marker('expression', 'timeout', '"5 seconds"')})`
})

export const PrometheusMetricsFormatTemplate = defineTemplate({
	modelId: 'PrometheusMetricsFormat', version: VERSION,
	description: 'Formats the current Effect metric registry in Prometheus exposition format.',
	inputs: { options: valueInput('Optional Prometheus formatting options.', { ts: 'unknown' }) },
	output: expressionOutput('Prometheus exposition text Effect.', effectType('string', 'never', 'never')),
	source: `PrometheusMetrics.format(${marker('expression', 'options', '{}')})`
})

export const PrometheusMetricsHttpLayerTemplate = defineTemplate({
	modelId: 'PrometheusMetricsHttpLayer', version: VERSION,
	description: 'Registers a pull-based Prometheus metrics endpoint on HttpRouter.',
	inputs: { options: valueInput('Optional path and metric-format options.', { ts: 'unknown' }) },
	output: expressionOutput('Prometheus HTTP endpoint Layer.', layerType('never', 'never', httpRouterRequirement)),
	source: `PrometheusMetrics.layerHttp(${marker('expression', 'options', '{}')})`
})

export const HttpTracerDisabledForUrlsLayerTemplate = defineTemplate({
	modelId: 'HttpTracerDisabledForUrlsLayer', version: VERSION,
	description: 'Disables server-side HTTP tracing for exact URLs such as health and metrics endpoints.',
	inputs: { urls: effectValueInput('Exact URLs for which server tracing is disabled.', { ts: 'ReadonlyArray<string>' }) },
	output: expressionOutput('HTTP trace-filter Layer.', layerType('never', 'never', 'never')),
	source: `HttpMiddleware.layerTracerDisabledForUrls(${marker('expression', 'urls', '["/health", "/metrics"]')})`
})

export const OtelResourceLayerTemplate = defineTemplate({
	modelId: 'OtelResourceLayer', version: VERSION,
	description: 'Provides an official OpenTelemetry Resource for @effect/opentelemetry integration.',
	inputs: {
		serviceName: effectValueInput('Service name.', { ts: 'string' }),
		serviceVersion: effectValueInput('Optional service version.', { ts: 'string | undefined' }),
		attributes: effectValueInput('Additional OpenTelemetry resource attributes.', { ts: 'Readonly<Record<string, unknown>> | undefined' })
	},
	output: expressionOutput('OpenTelemetry Resource Layer.', layerType(otelResourceRequirement, 'never', 'never')),
	source: `Resource.layer({ serviceName: ${marker('expression', 'serviceName', '"service"')}, serviceVersion: ${marker('expression', 'serviceVersion', 'undefined')}, attributes: ${marker('expression', 'attributes', '{}')} })`
})

export const OtelResourceFromEnvLayerTemplate = defineTemplate({
	modelId: 'OtelResourceFromEnvLayer', version: VERSION,
	description: 'Provides an OpenTelemetry Resource from OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES plus optional attributes.',
	inputs: { attributes: effectValueInput('Additional resource attributes.', { ts: 'Readonly<Record<string, unknown>> | undefined' }) },
	output: expressionOutput('Environment-derived OpenTelemetry Resource Layer.', layerType(otelResourceRequirement, 'never', 'never')),
	source: `Resource.layerFromEnv(${marker('expression', 'attributes', 'undefined')})`
})

export const OtelResourceEmptyLayerTemplate = defineTemplate({
	modelId: 'OtelResourceEmptyLayer', version: VERSION,
	description: 'Provides an empty OpenTelemetry Resource.',
	inputs: {},
	output: expressionOutput('Empty OpenTelemetry Resource Layer.', layerType(otelResourceRequirement, 'never', 'never')),
	source: 'Resource.layerEmpty'
})

export const OtelMetricsLayerTemplate = defineTemplate({
	modelId: 'OtelMetricsLayer', version: VERSION,
	description: 'Registers Effect metrics with one or more official OpenTelemetry MetricReader instances.',
	inputs: {
		readers: valueInput('Lazy MetricReader or non-empty reader collection.', { ts: '() => unknown' }),
		temporality: effectValueInput('Metric temporality preference.', { ts: '"cumulative" | "delta" | undefined' }),
		shutdownTimeout: effectDurationInput('Metric-reader shutdown timeout.')
	},
	output: expressionOutput('OpenTelemetry metric-reader bridge Layer.', layerType('never', 'never', otelResourceRequirement)),
	source: `OtelMetrics.layer(${marker('expression', 'readers', '() => reader')}, { temporality: ${marker('expression', 'temporality', 'undefined')}, shutdownTimeout: ${marker('expression', 'shutdownTimeout', '"3 seconds"')} })`
})

export const OtelNodeSdkLayerTemplate = defineTemplate({
	modelId: 'OtelNodeSdkLayer', version: VERSION,
	description: 'Installs @effect/opentelemetry NodeSdk from an existing OpenTelemetry SDK configuration.',
	inputs: { configuration: typedExpressionInput('NodeSdk configuration with optional span processors, metric readers, log processors, resource, and shutdown timeout.', otelNodeSdkConfigurationType()) },
	output: expressionOutput('OpenTelemetry Node SDK Layer.', layerType(otelResourceRequirement, 'never', 'never')),
	source: `NodeSdk.layer(() => ${marker('expression', 'configuration', '({ resource: { serviceName: "service" } })')})`
})

export const OtelWebSdkLayerTemplate = defineTemplate({
	modelId: 'OtelWebSdkLayer', version: VERSION,
	description: 'Installs @effect/opentelemetry WebSdk from an existing browser OpenTelemetry SDK configuration.',
	inputs: { configuration: typedExpressionInput('WebSdk configuration with span processors, metric readers, log processors, and resource.', otelWebSdkConfigurationType()) },
	output: expressionOutput('OpenTelemetry Web SDK Layer.', layerType(otelResourceRequirement, 'never', 'never')),
	source: `WebSdk.layer(() => ${marker('expression', 'configuration', '({ resource: { serviceName: "web-service" } })')})`
})

export const OtlpProductionObservabilitySourceFileTemplate = defineTemplate({
	modelId: 'OtlpProductionObservabilitySourceFile', version: VERSION,
	description: 'Builds a source file with the lightweight Effect V4 OTLP, Prometheus, and HTTP transport modules in scope.',
	inputs: { body: statementCollectionInput('Top-level lightweight OTLP declarations and application wiring.') },
	output: { kind: 'sourceFile', description: 'Complete lightweight OTLP production-observability source file.' },
	source: `import { Effect, Layer } from "effect"\nimport { FetchHttpClient, HttpMiddleware } from "effect/unstable/http"\nimport { Otlp, OtlpExporter, OtlpLogger, OtlpMetrics, OtlpResource, OtlpSerialization, OtlpTracer, PrometheusMetrics } from "effect/unstable/observability"\n\n${marker('statement', 'body', 'export const Observability = Layer.empty')}`
})

export const OpenTelemetryBridgeSourceFileTemplate = defineTemplate({
	modelId: 'OpenTelemetryBridgeSourceFile', version: VERSION,
	description: 'Builds a source file for the separate @effect/opentelemetry SDK bridge used with an existing OpenTelemetry SDK stack.',
	inputs: { body: statementCollectionInput('Top-level @effect/opentelemetry declarations and SDK wiring.') },
	output: { kind: 'sourceFile', description: 'Complete @effect/opentelemetry bridge source file.' },
	source: `import { Effect, Layer } from "effect"\nimport { NodeSdk, OtelMetrics, Resource, WebSdk } from "@effect/opentelemetry"\n\n${marker('statement', 'body', 'export const Telemetry = Resource.layerEmpty')}`
})

export const effectV4OtlpObservabilityFoundationalGraphTemplateInputs = [
	OtlpLayerTemplate,
	OtlpLayerFromConfigTemplate,
	OtlpLayerJsonTemplate,
	OtlpLayerProtobufTemplate,
	OtlpSerializationJsonLayerTemplate,
	OtlpSerializationProtobufLayerTemplate,
	OtlpResourceMakeTemplate,
	OtlpResourceFromConfigTemplate,
	OtlpResourceEntriesToAttributesTemplate,
	OtlpResourceUnknownToAttributeValueTemplate,
	OtlpTracerMakeTemplate,
	OtlpTracerLayerTemplate,
	OtlpTracerLayerFromConfigTemplate,
	OtlpLoggerMakeTemplate,
	OtlpLoggerLayerTemplate,
	OtlpLoggerLayerFromConfigTemplate,
	OtlpMetricsMakeTemplate,
	OtlpMetricsLayerTemplate,
	OtlpMetricsLayerFromConfigTemplate,
	OtlpMetricsTemporalityTemplate,
	OtlpExporterFlusherLayerTemplate,
	OtlpExporterFlushTemplate,
	OtlpExporterFlushWithTimeoutTemplate,
	PrometheusMetricsFormatTemplate,
	PrometheusMetricsHttpLayerTemplate,
	HttpTracerDisabledForUrlsLayerTemplate,
	OtelResourceLayerTemplate,
	OtelResourceFromEnvLayerTemplate,
	OtelResourceEmptyLayerTemplate,
	OtelMetricsLayerTemplate,
	OtelNodeSdkLayerTemplate,
	OtelWebSdkLayerTemplate,
	OtlpProductionObservabilitySourceFileTemplate,
	OpenTelemetryBridgeSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
