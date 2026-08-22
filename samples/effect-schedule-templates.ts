import { defineTemplate } from '../src/templates.js'
import { effectDurationInput, effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	marker,
	scheduleType,
	typeParameters,
	typedExpressionInput
} from './effect-template-helpers.js'

const scheduleInput = (description: string, output = 'unknown', input = 'unknown', requirements = 'never') =>
	typedExpressionInput(description, scheduleType(output, input, requirements))

export const ScheduleRecursTemplate = defineTemplate({
	modelId: 'ScheduleRecurs', version: '1.0.0', description: 'Creates a Schedule that recurs a fixed number of times.',
	inputs: { count: effectValueInput('Number of recurrences.', { ts: 'number' }) },
	output: expressionOutput('Finite recurrence Schedule.', scheduleType('number', 'unknown', 'never')),
	source: `Schedule.recurs(${marker('expression', 'count', '1')})`
})

export const ScheduleSpacedTemplate = defineTemplate({
	modelId: 'ScheduleSpaced', version: '1.0.0', description: 'Creates a Schedule with a fixed delay between recurrences.',
	inputs: { duration: effectDurationInput('Delay between recurrences.') },
	output: expressionOutput('Fixed-spacing Schedule.', scheduleType('number', 'unknown', 'never')),
	source: `Schedule.spaced(${marker('expression', 'duration', '1000')})`
})

export const ScheduleExponentialTemplate = defineTemplate({
	modelId: 'ScheduleExponential', version: '1.0.0', description: 'Creates an exponentially increasing delay Schedule.',
	inputs: { base: effectDurationInput('Initial delay.'), factor: effectValueInput('Exponential growth factor.', { ts: 'number' }) },
	output: expressionOutput('Exponential Schedule.', scheduleType('unknown', 'unknown', 'never')),
	source: `Schedule.exponential(${marker('expression', 'base', '1000')}, ${marker('expression', 'factor', '2')})`
})

export const ScheduleJitteredTemplate = defineTemplate({
	modelId: 'ScheduleJittered', version: '1.0.0', description: 'Adds random jitter to a Schedule delay.',
	typeParameters: typeParameters(['Out', 'Schedule output type.'], ['In', 'Schedule input type.'], ['R', 'Schedule requirements.']),
	inputs: { schedule: scheduleInput('Schedule to jitter.', '{{Out}}', '{{In}}', '{{R}}') },
	output: expressionOutput('Jittered Schedule.', scheduleType('{{Out}}', '{{In}}', '{{R}}')),
	source: `Schedule.jittered(${marker('expression', 'schedule', 'Schedule.recurs(1)')})`
})

export const EffectRepeatTemplate = defineTemplate({
	modelId: 'EffectRepeat', version: '1.0.0', description: 'Repeats a successful Effect according to a Schedule.',
	typeParameters: typeParameters(['A', 'Source success type.'], ['E', 'Error type.'], ['R', 'Source requirements.'], ['Out', 'Schedule output type.'], ['R2', 'Schedule requirements.']),
	inputs: { source: effectSourceInput('Effect to repeat.', effectType('{{A}}', '{{E}}', '{{R}}')), schedule: scheduleInput('Repeat Schedule.', '{{Out}}', '{{A}}', '{{R2}}') },
	output: expressionOutput('Repeated Effect.', effectType('{{Out}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `Effect.repeat(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'schedule', 'Schedule.recurs(1)')})`
})

export const EffectRetryOrElseTemplate = defineTemplate({
	modelId: 'EffectRetryOrElse', version: '1.0.0', description: 'Retries failures with a Schedule, then invokes a fallback.',
	typeParameters: typeParameters(['A', 'Source success type.'], ['E', 'Source error type.'], ['R', 'Source requirements.'], ['B', 'Fallback success type.'], ['E2', 'Fallback error type.'], ['R2', 'Fallback requirements.']),
	inputs: { source: effectSourceInput('Effect to retry.', effectType('{{A}}', '{{E}}', '{{R}}')), schedule: scheduleInput('Retry Schedule.', 'unknown', '{{E}}', '{{R2}}'), orElse: callbackInput('Fallback called with the last error and Schedule output.', effectReturningCallbackType('error: {{E}}, output: unknown', '{{B}}', '{{E2}}', '{{R2}}')) },
	output: expressionOutput('Retried Effect with fallback.', effectType('{{A}} | {{B}}', '{{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.retryOrElse(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'schedule', 'Schedule.recurs(1)')}, ${marker('expression', 'orElse', '() => Effect.void')})`
})

export const EffectTimeoutOptionTemplate = defineTemplate({
	modelId: 'EffectTimeoutOption', version: '1.0.0', description: 'Times out an Effect by returning None instead of failing.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { source: effectSourceInput('Effect to time out.', effectType('{{A}}', '{{E}}', '{{R}}')), duration: effectDurationInput('Timeout duration.') },
	output: expressionOutput('Effect succeeding with Option.', effectType('{ readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: {{A}} }', '{{E}}', '{{R}}')),
	source: `Effect.timeoutOption(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'duration', '1000')})`
})

export const effectScheduleGraphTemplateInputs = [
	ScheduleRecursTemplate, ScheduleSpacedTemplate, ScheduleExponentialTemplate, ScheduleJitteredTemplate,
	EffectRepeatTemplate, EffectRetryOrElseTemplate, EffectTimeoutOptionTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
