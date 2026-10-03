import type { TypeDescriptor } from 'synthesize-regions'
import { nominalType, typedExpressionInput } from '../../../authoring/effect-v4/effect-template-helpers.js'

export const httpClientRequirement = '{ readonly __httpClientRequirement: "HttpClient" }'
export const httpRouterRequirement = '{ readonly __httpRouterRequirement: "HttpRouter" }'
export const scopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'
export const otlpSerializationRequirement = '{ readonly __otlpSerializationRequirement: "OtlpSerialization" }'
export const otlpFlusherRequirement = '{ readonly __otlpFlusherRequirement: "OtlpExporter.Flusher" }'
export const otelResourceRequirement = '{ readonly __otelResourceRequirement: "@effect/opentelemetry/Resource" }'

export const otlpResourceConfigType = (): TypeDescriptor => ({
	ts: '{ readonly serviceName?: string; readonly serviceVersion?: string; readonly attributes?: Readonly<Record<string, unknown>> } | undefined'
})
export const otlpHeadersType = (): TypeDescriptor => ({ ts: 'Readonly<Record<string, string>> | undefined' })
export const otlpTemporalityType = (): TypeDescriptor => ({ ts: '"cumulative" | "delta"' })
export const otlpSerializationType = (): TypeDescriptor => nominalType('effect/observability/OtlpSerialization')
export const otlpFlusherType = (): TypeDescriptor => nominalType('effect/observability/OtlpExporter.Flusher')
export const otlpResourceType = (): TypeDescriptor => nominalType('effect/unstable/observability/OtlpResource.Resource')
export const otelResourceType = (): TypeDescriptor => nominalType('@effect/opentelemetry/Resource')
export const otelMetricReaderType = (): TypeDescriptor => nominalType('@opentelemetry/sdk-metrics/MetricReader')
export const otelNodeSdkConfigurationType = (): TypeDescriptor => nominalType('@effect/opentelemetry/NodeSdk.Configuration')
export const otelWebSdkConfigurationType = (): TypeDescriptor => nominalType('@effect/opentelemetry/WebSdk.Configuration')

export const otlpFlusherInput = (description: string) => typedExpressionInput(description, otlpFlusherType())
