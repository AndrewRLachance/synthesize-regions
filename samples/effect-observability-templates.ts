import { defineTemplate } from '../src/templates.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	marker,
	metricType,
	typeParameters,
	valueInput
} from './effect-template-helpers.js'

const logTemplate = (modelId: 'EffectLogInfo' | 'EffectLogWarn' | 'EffectLogError', method: 'logInfo' | 'logWarning' | 'logError') => defineTemplate({
	modelId, version: '1.0.0', description: `Emits a structured ${modelId.slice('EffectLog'.length).toLowerCase()} log event.`,
	inputs: { message: valueInput('Log message or structured value.') },
	output: expressionOutput(`Effect produced by Effect.${method}.`, effectType('void', 'never', 'never')),
	source: `Effect.${method}(${marker('expression', 'message', '""')})`
})

export const EffectLogInfoTemplate = logTemplate('EffectLogInfo', 'logInfo')
export const EffectLogWarnTemplate = logTemplate('EffectLogWarn', 'logWarning')
export const EffectLogErrorTemplate = logTemplate('EffectLogError', 'logError')

export const EffectAnnotateLogsTemplate = defineTemplate({
	modelId: 'EffectAnnotateLogs', version: '1.0.0', description: 'Adds one annotation to all logs emitted by an Effect.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { source: effectSourceInput('Effect whose logs are annotated.', effectType('{{A}}', '{{E}}', '{{R}}')), key: effectValueInput('Annotation key.', { ts: 'string' }), value: valueInput('Annotation value.') },
	output: expressionOutput('Log-annotated Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.annotateLogs(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'key', '"key"')}, ${marker('expression', 'value', 'undefined')})`
})

export const EffectWithSpanTemplate = defineTemplate({
	modelId: 'EffectWithSpan', version: '1.0.0', description: 'Wraps an Effect in a tracing span.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { source: effectSourceInput('Effect to trace.', effectType('{{A}}', '{{E}}', '{{R}}')), name: effectValueInput('Span name.', { ts: 'string' }) },
	output: expressionOutput('Traced Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.withSpan(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'name', '"operation"')})`
})

export const MetricCounterTemplate = defineTemplate({
	modelId: 'MetricCounter', version: '1.0.0', description: 'Creates a numeric counter Metric.',
	inputs: { name: effectValueInput('Metric name.', { ts: 'string' }) },
	output: expressionOutput('Counter Metric.', metricType('number', 'unknown')),
	source: `Metric.counter(${marker('expression', 'name', '"counter"')})`
})

export const MetricHistogramTemplate = defineTemplate({
	modelId: 'MetricHistogram', version: '1.0.0', description: 'Creates a histogram Metric with explicit boundaries.',
	inputs: { name: effectValueInput('Metric name.', { ts: 'string' }), boundaries: valueInput('MetricBoundaries expression.') },
	output: expressionOutput('Histogram Metric.', metricType('number', 'unknown')),
	source: `Metric.histogram(${marker('expression', 'name', '"histogram"')}, ${marker('expression', 'boundaries', 'MetricBoundaries.linear({ start: 0, width: 1, count: 10 })')})`
})

export const effectObservabilityGraphTemplateInputs = [
	EffectLogInfoTemplate, EffectLogWarnTemplate, EffectLogErrorTemplate, EffectAnnotateLogsTemplate,
	EffectWithSpanTemplate, MetricCounterTemplate, MetricHistogramTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]

