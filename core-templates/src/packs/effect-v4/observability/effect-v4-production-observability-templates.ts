import { defineTemplate } from '../../../authoring/define-template.js'
import { effectDurationInput, effectSourceInput, effectType, effectValueInput } from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	layerType,
	marker,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import {
	httpRouterRequirement,
	otlpFlusherRequirement
} from './effect-production-observability-template-helpers.js'

/** Production-oriented observability compositions. */
const VERSION = '1.0.0' as const
const closedObservabilityLayerInput = (description: string) => typedExpressionInput(description, layerType('never', 'never', 'never'))

export const OtlpJsonProductionLayerTemplate = defineTemplate({
	modelId: 'OtlpJsonProductionLayer', version: VERSION,
	description: 'Creates a closed JSON OTLP logs+metrics+traces Layer using FetchHttpClient.',
	inputs: { options: valueInput('Combined OTLP options.', { ts: 'unknown' }) },
	output: expressionOutput('Closed JSON OTLP production Layer.', layerType('never', 'never', 'never')),
	source: `Layer.provide(Otlp.layerJson(${marker('expression', 'options', '{ baseUrl: "http://localhost:4318" }')}), FetchHttpClient.layer)`
})

export const OtlpProtobufProductionLayerTemplate = defineTemplate({
	modelId: 'OtlpProtobufProductionLayer', version: VERSION,
	description: 'Creates a closed protobuf OTLP logs+metrics+traces Layer using FetchHttpClient.',
	inputs: { options: valueInput('Combined OTLP options.', { ts: 'unknown' }) },
	output: expressionOutput('Closed protobuf OTLP production Layer.', layerType('never', 'never', 'never')),
	source: `Layer.provide(Otlp.layerProtobuf(${marker('expression', 'options', '{ baseUrl: "http://localhost:4318" }')}), FetchHttpClient.layer)`
})

export const OtlpJsonFromConfigProductionLayerTemplate = defineTemplate({
	modelId: 'OtlpJsonFromConfigProductionLayer', version: VERSION,
	description: 'Creates a closed JSON OTLP Layer driven by OpenTelemetry configuration/environment variables.',
	inputs: { options: valueInput('Optional explicit OTLP config overrides.', { ts: 'unknown' }) },
	output: expressionOutput('Closed config-driven JSON OTLP Layer.', layerType('never', 'never', 'never')),
	source: `Layer.provide(Layer.provide(Otlp.layerFromConfig(${marker('expression', 'options', '{}')}), OtlpSerialization.layerJson), FetchHttpClient.layer)`
})

export const OtlpProtobufFromConfigProductionLayerTemplate = defineTemplate({
	modelId: 'OtlpProtobufFromConfigProductionLayer', version: VERSION,
	description: 'Creates a closed protobuf OTLP Layer driven by OpenTelemetry configuration/environment variables.',
	inputs: { options: valueInput('Optional explicit OTLP config overrides.', { ts: 'unknown' }) },
	output: expressionOutput('Closed config-driven protobuf OTLP Layer.', layerType('never', 'never', 'never')),
	source: `Layer.provide(Layer.provide(Otlp.layerFromConfig(${marker('expression', 'options', '{}')}), OtlpSerialization.layerProtobuf), FetchHttpClient.layer)`
})

export const OtlpTracingLoggingJsonLayerTemplate = defineTemplate({
	modelId: 'OtlpTracingLoggingJsonLayer', version: VERSION,
	description: 'Creates a closed JSON OTLP layer for traces and logs while leaving metrics export disabled.',
	inputs: {
		traceOptions: valueInput('OTLP trace exporter options.', { ts: 'unknown' }),
		logOptions: valueInput('OTLP log exporter options.', { ts: 'unknown' })
	},
	output: expressionOutput('Trace+log OTLP Layer exposing the shared Flusher.', layerType(otlpFlusherRequirement, 'never', 'never')),
	source: `Layer.provide(Layer.provide(Layer.merge(OtlpTracer.layer(${marker('expression', 'traceOptions', '{ url: "http://localhost:4318/v1/traces" }')}), OtlpLogger.layer(${marker('expression', 'logOptions', '{ url: "http://localhost:4318/v1/logs" }')})), OtlpSerialization.layerJson), FetchHttpClient.layer)`
})

export const OtlpTracingOnlyJsonLayerTemplate = defineTemplate({
	modelId: 'OtlpTracingOnlyJsonLayer', version: VERSION,
	description: 'Creates a closed JSON OTLP tracing-only Layer with manual flush access.',
	inputs: { options: valueInput('OTLP trace exporter options.', { ts: 'unknown' }) },
	output: expressionOutput('Tracing-only OTLP Layer.', layerType(otlpFlusherRequirement, 'never', 'never')),
	source: `Layer.provide(Layer.provide(OtlpTracer.layer(${marker('expression', 'options', '{ url: "http://localhost:4318/v1/traces" }')}), OtlpSerialization.layerJson), FetchHttpClient.layer)`
})

export const OtlpMetricsOnlyJsonLayerTemplate = defineTemplate({
	modelId: 'OtlpMetricsOnlyJsonLayer', version: VERSION,
	description: 'Creates a closed JSON OTLP metrics-only Layer with manual flush access.',
	inputs: { options: valueInput('OTLP metrics exporter options.', { ts: 'unknown' }) },
	output: expressionOutput('Metrics-only OTLP Layer.', layerType(otlpFlusherRequirement, 'never', 'never')),
	source: `Layer.provide(Layer.provide(OtlpMetrics.layer(${marker('expression', 'options', '{ url: "http://localhost:4318/v1/metrics" }')}), OtlpSerialization.layerJson), FetchHttpClient.layer)`
})

export const OtlpAuthenticatedJsonLayerTemplate = defineTemplate({
	modelId: 'OtlpAuthenticatedJsonLayer', version: VERSION,
	description: 'Creates a closed JSON OTLP Layer with a bearer Authorization header.',
	inputs: {
		baseUrl: effectValueInput('OTLP base URL.', { ts: 'string' }),
		token: effectValueInput('Bearer token.', { ts: 'string' }),
		resource: valueInput('Optional resource configuration.', { ts: 'unknown' })
	},
	output: expressionOutput('Authenticated JSON OTLP Layer.', layerType('never', 'never', 'never')),
	source: `Layer.provide(Otlp.layerJson({ baseUrl: ${marker('expression', 'baseUrl', '"https://collector.example.com"')}, headers: { authorization: "Bearer " + ${marker('expression', 'token', '"token"')} }, resource: ${marker('expression', 'resource', 'undefined')} }), FetchHttpClient.layer)`
})

export const OtlpAuthenticatedProtobufLayerTemplate = defineTemplate({
	modelId: 'OtlpAuthenticatedProtobufLayer', version: VERSION,
	description: 'Creates a closed protobuf OTLP Layer with a bearer Authorization header.',
	inputs: {
		baseUrl: effectValueInput('OTLP base URL.', { ts: 'string' }),
		token: effectValueInput('Bearer token.', { ts: 'string' }),
		resource: valueInput('Optional resource configuration.', { ts: 'unknown' })
	},
	output: expressionOutput('Authenticated protobuf OTLP Layer.', layerType('never', 'never', 'never')),
	source: `Layer.provide(Otlp.layerProtobuf({ baseUrl: ${marker('expression', 'baseUrl', '"https://collector.example.com"')}, headers: { authorization: "Bearer " + ${marker('expression', 'token', '"token"')} }, resource: ${marker('expression', 'resource', 'undefined')} }), FetchHttpClient.layer)`
})

export const OtlpDualMetricsBoundaryLayerTemplate = defineTemplate({
	modelId: 'OtlpDualMetricsBoundaryLayer', version: VERSION,
	description: 'Exports metrics by OTLP push while also registering a Prometheus scrape endpoint on HttpRouter.',
	inputs: {
		otlpOptions: valueInput('OTLP metrics exporter options.', { ts: 'unknown' }),
		prometheusOptions: valueInput('Prometheus endpoint options.', { ts: 'unknown' })
	},
	output: expressionOutput('OTLP + Prometheus metric boundary Layer.', layerType(otlpFlusherRequirement, 'never', httpRouterRequirement)),
	source: `Layer.merge(Layer.provide(Layer.provide(OtlpMetrics.layer(${marker('expression', 'otlpOptions', '{ url: "http://localhost:4318/v1/metrics" }')}), OtlpSerialization.layerProtobuf), FetchHttpClient.layer), PrometheusMetrics.layerHttp(${marker('expression', 'prometheusOptions', '{}')}))`
})

export const ProductionHttpObservabilityLayerTemplate = defineTemplate({
	modelId: 'ProductionHttpObservabilityLayer', version: VERSION,
	description: 'Combines a closed OTLP observability Layer with Prometheus scraping and excludes health/metrics URLs from server tracing.',
	inputs: {
		otlp: closedObservabilityLayerInput('Closed OTLP observability Layer.'),
		prometheusOptions: valueInput('Prometheus endpoint options.', { ts: 'unknown' }),
		excludedUrls: effectValueInput('URLs excluded from HTTP tracing.', { ts: 'ReadonlyArray<string>' })
	},
	output: expressionOutput('Production HTTP observability Layer.', layerType('never', 'never', httpRouterRequirement)),
	source: `Layer.mergeAll(${marker('expression', 'otlp', 'Layer.empty')}, PrometheusMetrics.layerHttp(${marker('expression', 'prometheusOptions', '{}')}), HttpMiddleware.layerTracerDisabledForUrls(${marker('expression', 'excludedUrls', '["/health", "/ready", "/metrics"]')}))`
})

export const OtlpObservedApplicationLayerTemplate = defineTemplate({
	modelId: 'OtlpObservedApplicationLayer', version: VERSION,
	description: 'Provides a closed production-observability Layer around an application Layer so application construction and runtime telemetry are exported.',
	typeParameters: typeParameters(['P', 'Application services provided.'], ['E', 'Application Layer error type.'], ['R', 'Application Layer requirements.']),
	inputs: {
		application: typedExpressionInput('Application Layer.', layerType('{{P}}', '{{E}}', '{{R}}')),
		observability: closedObservabilityLayerInput('Closed production-observability Layer.')
	},
	output: expressionOutput('Observed application Layer.', layerType('{{P}}', '{{E}}', '{{R}}')),
	source: `Layer.provide(${marker('expression', 'application', 'Layer.empty')}, ${marker('expression', 'observability', 'Layer.empty')})`
})

export const OtlpFlushBeforeEffectTemplate = defineTemplate({
	modelId: 'OtlpFlushBeforeEffect', version: VERSION,
	description: 'Manually flushes buffered OTLP telemetry before running a follow-up Effect such as shutdown acknowledgement.',
	inputs: {
		followUp: effectSourceInput('Effect run after the flush.', effectType('void', 'never', 'never'))
	},
	output: expressionOutput('Flush-then-follow-up Effect.', effectType('void', 'never', otlpFlusherRequirement)),
	source: `Effect.andThen(Effect.flatMap(OtlpExporter.Flusher, flusher => flusher.flush), ${marker('expression', 'followUp', 'Effect.void')})`
})

export const OtlpFlushBeforeEffectWithTimeoutTemplate = defineTemplate({
	modelId: 'OtlpFlushBeforeEffectWithTimeout', version: VERSION,
	description: 'Attempts a bounded manual OTLP flush before running a shutdown/follow-up Effect.',
	inputs: {
		timeout: effectDurationInput('Maximum flush duration.'),
		followUp: effectSourceInput('Effect run after the flush attempt.', effectType('void', 'never', 'never'))
	},
	output: expressionOutput('Timed flush-then-follow-up Effect.', effectType('void', 'never', otlpFlusherRequirement)),
	source: `Effect.andThen(Effect.asVoid(Effect.timeoutOption(Effect.flatMap(OtlpExporter.Flusher, flusher => flusher.flush), ${marker('expression', 'timeout', '"5 seconds"')})), ${marker('expression', 'followUp', 'Effect.void')})`
})

export const effectV4ProductionObservabilityGraphTemplateInputs = [
	OtlpJsonProductionLayerTemplate,
	OtlpProtobufProductionLayerTemplate,
	OtlpJsonFromConfigProductionLayerTemplate,
	OtlpProtobufFromConfigProductionLayerTemplate,
	OtlpTracingLoggingJsonLayerTemplate,
	OtlpTracingOnlyJsonLayerTemplate,
	OtlpMetricsOnlyJsonLayerTemplate,
	OtlpAuthenticatedJsonLayerTemplate,
	OtlpAuthenticatedProtobufLayerTemplate,
	OtlpDualMetricsBoundaryLayerTemplate,
	ProductionHttpObservabilityLayerTemplate,
	OtlpObservedApplicationLayerTemplate,
	OtlpFlushBeforeEffectTemplate,
	OtlpFlushBeforeEffectWithTimeoutTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
