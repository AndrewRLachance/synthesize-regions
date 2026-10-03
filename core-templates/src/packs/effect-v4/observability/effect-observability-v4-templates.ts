import { defineTemplate } from '../../../authoring/define-template.js'
import { effectDurationInput, effectSourceInput, effectType, effectValueInput } from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	fiberType,
	layerType,
	marker,
	metricType,
	nominalType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'

const scope = '{ readonly __effectScopeRequirement: "Scope" }'

const loggerType = (message = 'unknown', output = 'unknown') =>
	nominalType('effect/Logger', { loggerMessage: message, loggerOutput: output })

const fiberSetType = (success = 'unknown', error = 'unknown') =>
	nominalType('effect/FiberSet', { fiberSetSuccess: success, fiberSetError: error })

const fiberSetStructuralType = (success: string, error: string): string =>
	`{ readonly pipe: () => unknown; readonly __fiberSetSuccess?: () => ${success}; readonly __fiberSetError?: () => ${error} }`

const metricInput = (description: string, input = 'unknown', output = 'unknown') =>
	typedExpressionInput(description, metricType(input, output))

const fiberSetInput = (description: string, success = 'unknown', error = 'unknown') =>
	typedExpressionInput(description, fiberSetType(success, error))

const logTemplate = (
	modelId: 'EffectLog' | 'EffectLogDebug' | 'EffectLogInfo' | 'EffectLogWarning' | 'EffectLogError' | 'EffectLogFatal',
	method: 'log' | 'logDebug' | 'logInfo' | 'logWarning' | 'logError' | 'logFatal'
) => defineTemplate({
	modelId,
	version: '2.0.0',
	description: `Emits a structured log event with Effect.${method}.`,
	inputs: { message: valueInput('Log message or structured value.') },
	output: expressionOutput(`Effect produced by Effect.${method}.`, effectType('void', 'never', 'never')),
	source: `Effect.${method}(${marker('expression', 'message', '"message"')})`
})

export const EffectLogTemplate = logTemplate('EffectLog', 'log')
export const EffectLogDebugTemplate = logTemplate('EffectLogDebug', 'logDebug')
export const EffectLogInfoTemplate = logTemplate('EffectLogInfo', 'logInfo')
export const EffectLogWarningTemplate = logTemplate('EffectLogWarning', 'logWarning')
export const EffectLogErrorTemplate = logTemplate('EffectLogError', 'logError')
export const EffectLogFatalTemplate = logTemplate('EffectLogFatal', 'logFatal')

export const EffectAnnotateLogsTemplate = defineTemplate({
	modelId: 'EffectAnnotateLogs', version: '2.0.0', description: 'Adds one key-value annotation to all logs emitted by an Effect.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		source: effectSourceInput('Effect whose logs are annotated.', effectType('{{A}}', '{{E}}', '{{R}}')),
		key: effectValueInput('Annotation key.', { ts: 'string' }),
		value: valueInput('Annotation value.')
	},
	output: expressionOutput('Log-annotated Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.annotateLogs(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'key', '"key"')}, ${marker('expression', 'value', 'undefined')})`
})

export const EffectAnnotateLogsRecordTemplate = defineTemplate({
	modelId: 'EffectAnnotateLogsRecord', version: '2.0.0', description: 'Adds a record of annotations to all logs emitted by an Effect.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		source: effectSourceInput('Effect whose logs are annotated.', effectType('{{A}}', '{{E}}', '{{R}}')),
		annotations: effectValueInput('Annotation record.', { ts: 'Readonly<Record<string, unknown>>' })
	},
	output: expressionOutput('Log-annotated Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.annotateLogs(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'annotations', '{}')})`
})

export const EffectAnnotateLogsScopedTemplate = defineTemplate({
	modelId: 'EffectAnnotateLogsScoped', version: '2.0.0', description: 'Adds log annotations for the remainder of the current Scope.',
	inputs: { annotations: effectValueInput('Scoped annotation record.', { ts: 'Readonly<Record<string, unknown>>' }) },
	output: expressionOutput('Scoped log-annotation Effect.', effectType('void', 'never', scope)),
	source: `Effect.annotateLogsScoped(${marker('expression', 'annotations', '{}')})`
})

export const EffectWithLogSpanTemplate = defineTemplate({
	modelId: 'EffectWithLogSpan', version: '2.0.0', description: 'Measures an Effect with a named log span whose duration is attached to emitted logs.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		source: effectSourceInput('Effect to measure with a log span.', effectType('{{A}}', '{{E}}', '{{R}}')),
		label: effectValueInput('Log-span label.', { ts: 'string' })
	},
	output: expressionOutput('Log-span-instrumented Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.withLogSpan(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'label', '"operation"')})`
})

export const EffectProvideMinimumLogLevelTemplate = defineTemplate({
	modelId: 'EffectProvideMinimumLogLevel', version: '2.0.0', description: 'Overrides the minimum log level for an Effect region.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		source: effectSourceInput('Effect whose minimum log level is overridden.', effectType('{{A}}', '{{E}}', '{{R}}')),
		level: effectValueInput('Minimum log level such as "Debug" or "Error".', { ts: 'string' })
	},
	output: expressionOutput('Effect with a local minimum log level.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.provideService(${marker('expression', 'source', 'Effect.void')}, References.MinimumLogLevel, ${marker('expression', 'level', '"Info"')})`
})

export const LoggerMakeTemplate = defineTemplate({
	modelId: 'LoggerMake', version: '2.0.0', description: 'Creates a custom Logger from a log-event handler.',
	typeParameters: typeParameters(['Out', 'Logger handler output type.']),
	inputs: { handler: callbackInput('Logger handler.', { ts: '(options: unknown) => {{Out}}' }) },
	output: expressionOutput('Custom Logger.', loggerType('unknown', '{{Out}}')),
	source: `Logger.make(${marker('expression', 'handler', '() => undefined')})`
})

export const LoggerLayerTemplate = defineTemplate({
	modelId: 'LoggerLayer', version: '2.0.0', description: 'Creates a Layer that installs the supplied Logger values.',
	inputs: { loggers: valueInput('Readonly array of Logger values.') },
	output: expressionOutput('Logger installation Layer.', layerType('never', 'never', 'never')),
	source: `Logger.layer(${marker('expression', 'loggers', '[Logger.defaultLogger, Logger.tracerLogger]')})`
})

const loggerConstantTemplate = (
	modelId: 'LoggerDefault' | 'LoggerTracer' | 'LoggerConsoleLogFmt' | 'LoggerConsoleStructured' | 'LoggerConsoleJson',
	source: string,
	description: string
) => defineTemplate({
	modelId,
	version: '2.0.0',
	description,
	inputs: {},
	output: expressionOutput('Logger value.', loggerType()),
	source
})

export const LoggerDefaultTemplate = loggerConstantTemplate('LoggerDefault', 'Logger.defaultLogger', 'References the default Effect Logger.')
export const LoggerTracerTemplate = loggerConstantTemplate('LoggerTracer', 'Logger.tracerLogger', 'References the Logger that forwards logs into the active tracing span.')
export const LoggerConsoleLogFmtTemplate = loggerConstantTemplate('LoggerConsoleLogFmt', 'Logger.consoleLogFmt', 'References the console logfmt Logger.')
export const LoggerConsoleStructuredTemplate = loggerConstantTemplate('LoggerConsoleStructured', 'Logger.consoleStructured', 'References the structured console Logger.')
export const LoggerConsoleJsonTemplate = loggerConstantTemplate('LoggerConsoleJson', 'Logger.consoleJson', 'References the JSON console Logger.')

export const LoggerConsolePrettyTemplate = defineTemplate({
	modelId: 'LoggerConsolePretty', version: '2.0.0', description: 'Creates the pretty console Logger.',
	inputs: {},
	output: expressionOutput('Pretty console Logger.', loggerType()),
	source: 'Logger.consolePretty()'
})

export const EffectWithSpanTemplate = defineTemplate({
	modelId: 'EffectWithSpan', version: '2.0.0', description: 'Wraps an Effect in a named tracing span without changing its success, error, or requirement channels.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		source: effectSourceInput('Effect to trace.', effectType('{{A}}', '{{E}}', '{{R}}')),
		name: effectValueInput('Span name.', { ts: 'string' })
	},
	output: expressionOutput('Traced Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.withSpan(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'name', '"operation"')})`
})

export const EffectAnnotateCurrentSpanTemplate = defineTemplate({
	modelId: 'EffectAnnotateCurrentSpan', version: '2.0.0', description: 'Adds one key-value attribute to the currently active tracing span.',
	inputs: {
		key: effectValueInput('Span attribute key.', { ts: 'string' }),
		value: valueInput('Span attribute value.')
	},
	output: expressionOutput('Span-annotation Effect.', effectType('void', 'never', 'never')),
	source: `Effect.annotateCurrentSpan(${marker('expression', 'key', '"key"')}, ${marker('expression', 'value', 'undefined')})`
})

export const MetricCounterTemplate = defineTemplate({
	modelId: 'MetricCounter', version: '2.0.0', description: 'Creates a numeric counter Metric.',
	inputs: { name: effectValueInput('Metric name.', { ts: 'string' }) },
	output: expressionOutput('Counter Metric.', metricType('number', 'unknown')),
	source: `Metric.counter(${marker('expression', 'name', '"counter"')})`
})

export const MetricGaugeTemplate = defineTemplate({
	modelId: 'MetricGauge', version: '2.0.0', description: 'Creates a numeric gauge Metric whose state reflects the latest observed value.',
	inputs: { name: effectValueInput('Metric name.', { ts: 'string' }) },
	output: expressionOutput('Gauge Metric.', metricType('number', 'unknown')),
	source: `Metric.gauge(${marker('expression', 'name', '"gauge"')})`
})

export const MetricLinearBoundariesTemplate = defineTemplate({
	modelId: 'MetricLinearBoundaries', version: '2.0.0', description: 'Creates evenly spaced metric boundaries.',
	inputs: {
		start: effectValueInput('First boundary value.', { ts: 'number' }),
		width: effectValueInput('Distance between consecutive boundaries.', { ts: 'number' }),
		count: effectValueInput('Boundary count.', { ts: 'number' })
	},
	output: expressionOutput('Metric boundaries.'),
	source: `Metric.linearBoundaries({ start: ${marker('expression', 'start', '0')}, width: ${marker('expression', 'width', '10')}, count: ${marker('expression', 'count', '11')} })`
})

export const MetricHistogramTemplate = defineTemplate({
	modelId: 'MetricHistogram', version: '2.0.0', description: 'Creates a histogram Metric with explicit bucket boundaries.',
	inputs: {
		name: effectValueInput('Metric name.', { ts: 'string' }),
		boundaries: valueInput('Histogram boundaries expression.')
	},
	output: expressionOutput('Histogram Metric.', metricType('number', 'unknown')),
	source: `Metric.histogram(${marker('expression', 'name', '"histogram"')}, { boundaries: ${marker('expression', 'boundaries', 'Metric.linearBoundaries({ start: 0, width: 10, count: 11 })')} })`
})

export const MetricTimerTemplate = defineTemplate({
	modelId: 'MetricTimer', version: '2.0.0', description: 'Creates a timer Metric that records Effect durations into histogram boundaries.',
	inputs: {
		name: effectValueInput('Metric name.', { ts: 'string' }),
		boundaries: valueInput('Timer boundaries expression.')
	},
	output: expressionOutput('Timer Metric.', metricType('unknown', 'unknown')),
	source: `Metric.timer(${marker('expression', 'name', '"timer"')}, { boundaries: ${marker('expression', 'boundaries', '[1, 5, 10, 50, 100]')} })`
})

export const MetricSummaryTemplate = defineTemplate({
	modelId: 'MetricSummary', version: '2.0.0', description: 'Creates a sliding-window summary Metric with configured quantiles.',
	inputs: {
		name: effectValueInput('Metric name.', { ts: 'string' }),
		maxAge: effectDurationInput('Maximum retained sample age.'),
		maxSize: effectValueInput('Maximum retained sample count.', { ts: 'number' }),
		quantiles: effectValueInput('Quantiles to observe.', { ts: 'ReadonlyArray<number>' })
	},
	output: expressionOutput('Summary Metric.', metricType('number', 'unknown')),
	source: `Metric.summary(${marker('expression', 'name', '"summary"')}, { maxAge: ${marker('expression', 'maxAge', '"1 day"')}, maxSize: ${marker('expression', 'maxSize', '100')}, quantiles: ${marker('expression', 'quantiles', '[0.1, 0.5, 0.9]')} })`
})

export const MetricFrequencyTemplate = defineTemplate({
	modelId: 'MetricFrequency', version: '2.0.0', description: 'Creates a frequency Metric that counts occurrences of distinct string values.',
	inputs: { name: effectValueInput('Metric name.', { ts: 'string' }) },
	output: expressionOutput('Frequency Metric.', metricType('string', 'unknown')),
	source: `Metric.frequency(${marker('expression', 'name', '"frequency"')})`
})

export const MetricWithConstantInputTemplate = defineTemplate({
	modelId: 'MetricWithConstantInput', version: '2.0.0', description: 'Adapts a Metric to update with one constant input value whenever it is tracked.',
	typeParameters: typeParameters(['In', 'Underlying metric input type.'], ['State', 'Metric state type.']),
	inputs: {
		metric: metricInput('Metric to adapt.', '{{In}}', '{{State}}'),
		input: effectValueInput('Constant metric input.', { ts: '{{In}}' })
	},
	output: expressionOutput('Constant-input Metric.', metricType('unknown', '{{State}}')),
	source: `Metric.withConstantInput(${marker('expression', 'metric', 'Metric.counter("count")')}, ${marker('expression', 'input', '1')})`
})

export const MetricWithAttributesTemplate = defineTemplate({
	modelId: 'MetricWithAttributes', version: '2.0.0', description: 'Adds a fixed attribute record to a Metric.',
	typeParameters: typeParameters(['In', 'Metric input type.'], ['State', 'Metric state type.']),
	inputs: {
		metric: metricInput('Metric to annotate.', '{{In}}', '{{State}}'),
		attributes: effectValueInput('Metric attribute record.', { ts: 'Readonly<Record<string, unknown>>' })
	},
	output: expressionOutput('Attributed Metric.', metricType('{{In}}', '{{State}}')),
	source: `Metric.withAttributes(${marker('expression', 'metric', 'Metric.counter("count")')}, ${marker('expression', 'attributes', '{}')})`
})

export const MetricValueTemplate = defineTemplate({
	modelId: 'MetricValue', version: '2.0.0', description: 'Reads the current state of a Metric.',
	typeParameters: typeParameters(['In', 'Metric input type.'], ['State', 'Metric state type.']),
	inputs: { metric: metricInput('Metric whose state is read.', '{{In}}', '{{State}}') },
	output: expressionOutput('Metric-state read Effect.', effectType('{{State}}', 'never', 'never')),
	source: `Metric.value(${marker('expression', 'metric', 'Metric.counter("count")')})`
})

export const EffectTrackSuccessesTemplate = defineTemplate({
	modelId: 'EffectTrackSuccesses', version: '2.0.0', description: 'Updates a Metric with each successful value produced by an Effect while preserving that value.',
	typeParameters: typeParameters(['A', 'Success and metric input type.'], ['E', 'Error type.'], ['R', 'Requirements.'], ['State', 'Metric state type.']),
	inputs: {
		source: effectSourceInput('Effect whose successful values are tracked.', effectType('{{A}}', '{{E}}', '{{R}}')),
		metric: metricInput('Metric updated from successful values.', '{{A}}', '{{State}}')
	},
	output: expressionOutput('Metric-tracked Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.trackSuccesses(${marker('expression', 'source', 'Effect.succeed(1)')}, ${marker('expression', 'metric', 'Metric.counter("count")')})`
})

export const EffectTrackDurationTemplate = defineTemplate({
	modelId: 'EffectTrackDuration', version: '2.0.0', description: 'Tracks the duration of an Effect with a timer Metric while preserving the Effect result.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.'], ['State', 'Timer metric state type.']),
	inputs: {
		source: effectSourceInput('Effect whose duration is tracked.', effectType('{{A}}', '{{E}}', '{{R}}')),
		metric: metricInput('Timer Metric.', 'unknown', '{{State}}')
	},
	output: expressionOutput('Duration-tracked Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.trackDuration(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'metric', 'Metric.timer("timer", { boundaries: [1, 10, 100] })')})`
})

export const EffectProvideMetricAttributesTemplate = defineTemplate({
	modelId: 'EffectProvideMetricAttributes', version: '2.0.0', description: 'Provides metric attributes to all metric updates performed inside an Effect region.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		source: effectSourceInput('Effect region whose metric updates receive attributes.', effectType('{{A}}', '{{E}}', '{{R}}')),
		attributes: effectValueInput('Metric attribute record.', { ts: 'Readonly<Record<string, unknown>>' })
	},
	output: expressionOutput('Metric-attributed Effect region.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.provideService(${marker('expression', 'source', 'Effect.void')}, Metric.CurrentMetricAttributes, ${marker('expression', 'attributes', '{}')})`
})

export const FiberSetMakeTemplate = defineTemplate({
	modelId: 'FiberSetMake', version: '2.0.0', description: 'Creates a scoped FiberSet that automatically removes completed fibers and interrupts remaining fibers when its Scope closes.',
	typeParameters: typeParameters(['A', 'Tracked fiber success type.'], ['E', 'Tracked fiber error type.']),
	inputs: {},
	output: expressionOutput('Scoped FiberSet creation Effect.', effectType(fiberSetStructuralType('{{A}}', '{{E}}'), 'never', scope)),
	source: 'FiberSet.make()'
})

export const FiberSetRunTemplate = defineTemplate({
	modelId: 'FiberSetRun', version: '2.0.0', description: 'Forks an Effect and tracks the resulting Fiber in a FiberSet.',
	typeParameters: typeParameters(['A', 'Fiber success type.'], ['E', 'Fiber error type.'], ['R', 'Forked Effect requirements.']),
	inputs: {
		set: fiberSetInput('FiberSet that owns the forked Fiber.', '{{A}}', '{{E}}'),
		source: effectSourceInput('Effect to fork and track.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Effect yielding the tracked Fiber.', effectType(`{ readonly pipe: () => unknown; readonly __fiberSuccess?: () => {{A}}; readonly __fiberError?: () => {{E}} }`, 'never', '{{R}}')),
	source: `FiberSet.run(${marker('expression', 'set', 'set')}, ${marker('expression', 'source', 'Effect.void')})`
})

export const FiberSetAddTemplate = defineTemplate({
	modelId: 'FiberSetAdd', version: '2.0.0', description: 'Adds an already-forked Fiber to a FiberSet for structured tracking.',
	typeParameters: typeParameters(['A', 'Fiber success type.'], ['E', 'Fiber error type.']),
	inputs: {
		set: fiberSetInput('FiberSet that should track the Fiber.', '{{A}}', '{{E}}'),
		fiber: typedExpressionInput('Fiber to track.', fiberType('{{A}}', '{{E}}'))
	},
	output: expressionOutput('FiberSet add operation.'),
	source: `FiberSet.add(${marker('expression', 'set', 'set')}, ${marker('expression', 'fiber', 'fiber')})`
})

export const FiberSetSizeTemplate = defineTemplate({
	modelId: 'FiberSetSize', version: '2.0.0', description: 'Reads the current number of Fibers tracked by a FiberSet.',
	typeParameters: typeParameters(['A', 'Tracked fiber success type.'], ['E', 'Tracked fiber error type.']),
	inputs: { set: fiberSetInput('FiberSet to inspect.', '{{A}}', '{{E}}') },
	output: expressionOutput('FiberSet size Effect.', effectType('number', 'never', 'never')),
	source: `FiberSet.size(${marker('expression', 'set', 'set')})`
})

export const FiberSetJoinTemplate = defineTemplate({
	modelId: 'FiberSetJoin', version: '2.0.0', description: 'Joins a FiberSet so a failure from any tracked Fiber is propagated to the caller.',
	typeParameters: typeParameters(['A', 'Tracked fiber success type.'], ['E', 'Tracked fiber error type.']),
	inputs: { set: fiberSetInput('FiberSet to join.', '{{A}}', '{{E}}') },
	output: expressionOutput('FiberSet join Effect.', effectType('void', '{{E}}', 'never')),
	source: `FiberSet.join(${marker('expression', 'set', 'set')})`
})

export const FiberSetAwaitEmptyTemplate = defineTemplate({
	modelId: 'FiberSetAwaitEmpty', version: '2.0.0', description: 'Waits until every Fiber tracked by a FiberSet has completed.',
	typeParameters: typeParameters(['A', 'Tracked fiber success type.'], ['E', 'Tracked fiber error type.']),
	inputs: { set: fiberSetInput('FiberSet to await.', '{{A}}', '{{E}}') },
	output: expressionOutput('FiberSet empty-await Effect.', effectType('void', 'never', 'never')),
	source: `FiberSet.awaitEmpty(${marker('expression', 'set', 'set')})`
})

export const effectObservabilityGraphTemplateInputs = [
	EffectLogTemplate,
	EffectLogDebugTemplate,
	EffectLogInfoTemplate,
	EffectLogWarningTemplate,
	EffectLogErrorTemplate,
	EffectLogFatalTemplate,
	EffectAnnotateLogsTemplate,
	EffectAnnotateLogsRecordTemplate,
	EffectAnnotateLogsScopedTemplate,
	EffectWithLogSpanTemplate,
	EffectProvideMinimumLogLevelTemplate,
	LoggerMakeTemplate,
	LoggerLayerTemplate,
	LoggerDefaultTemplate,
	LoggerTracerTemplate,
	LoggerConsoleLogFmtTemplate,
	LoggerConsolePrettyTemplate,
	LoggerConsoleStructuredTemplate,
	LoggerConsoleJsonTemplate,
	EffectWithSpanTemplate,
	EffectAnnotateCurrentSpanTemplate,
	MetricCounterTemplate,
	MetricGaugeTemplate,
	MetricLinearBoundariesTemplate,
	MetricHistogramTemplate,
	MetricTimerTemplate,
	MetricSummaryTemplate,
	MetricFrequencyTemplate,
	MetricWithConstantInputTemplate,
	MetricWithAttributesTemplate,
	MetricValueTemplate,
	EffectTrackSuccessesTemplate,
	EffectTrackDurationTemplate,
	EffectProvideMetricAttributesTemplate,
	FiberSetMakeTemplate,
	FiberSetRunTemplate,
	FiberSetAddTemplate,
	FiberSetSizeTemplate,
	FiberSetJoinTemplate,
	FiberSetAwaitEmptyTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
