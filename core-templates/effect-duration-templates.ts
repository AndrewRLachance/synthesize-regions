import { defineTemplate } from '../src/templates.js'
import { effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	marker,
	typedExpressionInput
} from './effect-template-helpers.js'
import { durationType, optionType } from './effect-data-type-template-helpers.js'

const durationInput = (description: string) => typedExpressionInput(description, durationType())

const durationUnit = (
	modelId: string,
	method: 'nanos' | 'micros' | 'millis' | 'seconds' | 'minutes' | 'hours' | 'weeks',
	amountType: string
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description: `Creates a Duration using ${method}.`,
	inputs: { amount: effectValueInput('Duration amount.', { ts: amountType }) },
	output: expressionOutput('Duration value.', durationType()),
	source: `Duration.${method}(${marker('expression', 'amount', amountType === 'bigint' ? '1n' : '1')})`
})

export const DurationNanosTemplate = durationUnit('DurationNanos', 'nanos', 'bigint')
export const DurationMicrosTemplate = durationUnit('DurationMicros', 'micros', 'bigint')
export const DurationMillisTemplate = durationUnit('DurationMillis', 'millis', 'number')
export const DurationSecondsTemplate = durationUnit('DurationSeconds', 'seconds', 'number')
export const DurationMinutesTemplate = durationUnit('DurationMinutes', 'minutes', 'number')
export const DurationHoursTemplate = durationUnit('DurationHours', 'hours', 'number')
export const DurationWeeksTemplate = durationUnit('DurationWeeks', 'weeks', 'number')

export const DurationInfinityTemplate = defineTemplate({
	modelId: 'DurationInfinity',
	version: '1.0.0',
	description: 'Returns the infinite Duration value.',
	inputs: {},
	output: expressionOutput('Infinite Duration.', durationType()),
	source: 'Duration.infinity'
})

export const DurationFromInputUnsafeTemplate = defineTemplate({
	modelId: 'DurationFromInputUnsafe',
	version: '1.0.0',
	description: 'Creates a Duration from a number, bigint, duration string, or Infinity and may throw for invalid input.',
	inputs: { input: effectValueInput('Duration input.', { ts: 'number | bigint | string' }) },
	output: expressionOutput('Decoded Duration.', durationType()),
	source: `Duration.fromInputUnsafe(${marker('expression', 'input', '1000')})`
})

export const DurationToMillisTemplate = defineTemplate({
	modelId: 'DurationToMillis',
	version: '1.0.0',
	description: 'Converts a Duration to milliseconds.',
	inputs: { duration: durationInput('Duration to convert.') },
	output: expressionOutput('Milliseconds.', { ts: 'number' }),
	source: `Duration.toMillis(${marker('expression', 'duration', 'Duration.millis(0)')})`
})

export const DurationToNanosTemplate = defineTemplate({
	modelId: 'DurationToNanos',
	version: '1.0.0',
	description: 'Safely converts a finite Duration to nanoseconds.',
	inputs: { duration: durationInput('Duration to convert.') },
	output: expressionOutput('Optional nanosecond value.', optionType('bigint')),
	source: `Duration.toNanos(${marker('expression', 'duration', 'Duration.millis(0)')})`
})

export const DurationToNanosUnsafeTemplate = defineTemplate({
	modelId: 'DurationToNanosUnsafe',
	version: '1.0.0',
	description: 'Converts a Duration to nanoseconds and throws for an infinite duration.',
	inputs: { duration: durationInput('Finite Duration to convert.') },
	output: expressionOutput('Nanoseconds.', { ts: 'bigint' }),
	source: `Duration.toNanosUnsafe(${marker('expression', 'duration', 'Duration.millis(0)')})`
})

const durationComparison = (
	modelId: string,
	method: 'isLessThan' | 'isLessThanOrEqualTo' | 'isGreaterThan' | 'isGreaterThanOrEqualTo'
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description: `Compares two Durations using Duration.${method}.`,
	inputs: { left: durationInput('Left Duration.'), right: durationInput('Right Duration.') },
	output: expressionOutput('Comparison result.', { ts: 'boolean' }),
	source: `Duration.${method}(${marker('expression', 'left', 'Duration.millis(0)')}, ${marker('expression', 'right', 'Duration.millis(0)')})`
})

export const DurationIsLessThanTemplate = durationComparison('DurationIsLessThan', 'isLessThan')
export const DurationIsLessThanOrEqualToTemplate = durationComparison('DurationIsLessThanOrEqualTo', 'isLessThanOrEqualTo')
export const DurationIsGreaterThanTemplate = durationComparison('DurationIsGreaterThan', 'isGreaterThan')
export const DurationIsGreaterThanOrEqualToTemplate = durationComparison('DurationIsGreaterThanOrEqualTo', 'isGreaterThanOrEqualTo')

export const DurationSumTemplate = defineTemplate({
	modelId: 'DurationSum',
	version: '1.0.0',
	description: 'Adds two Durations.',
	inputs: { left: durationInput('Left Duration.'), right: durationInput('Right Duration.') },
	output: expressionOutput('Summed Duration.', durationType()),
	source: `Duration.sum(${marker('expression', 'left', 'Duration.millis(0)')}, ${marker('expression', 'right', 'Duration.millis(0)')})`
})

export const DurationTimesTemplate = defineTemplate({
	modelId: 'DurationTimes',
	version: '1.0.0',
	description: 'Multiplies a Duration by a numeric factor.',
	inputs: { duration: durationInput('Duration to scale.'), factor: effectValueInput('Scale factor.', { ts: 'number' }) },
	output: expressionOutput('Scaled Duration.', durationType()),
	source: `Duration.times(${marker('expression', 'duration', 'Duration.millis(0)')}, ${marker('expression', 'factor', '1')})`
})

export const DurationFormatTemplate = defineTemplate({
	modelId: 'DurationFormat',
	version: '1.0.0',
	description: 'Formats a Duration as a compact human-readable string.',
	inputs: { duration: durationInput('Duration to format.') },
	output: expressionOutput('Formatted Duration.', { ts: 'string' }),
	source: `Duration.format(${marker('expression', 'duration', 'Duration.millis(0)')})`
})

export const effectDurationGraphTemplateInputs = [
	DurationNanosTemplate,
	DurationMicrosTemplate,
	DurationMillisTemplate,
	DurationSecondsTemplate,
	DurationMinutesTemplate,
	DurationHoursTemplate,
	DurationWeeksTemplate,
	DurationInfinityTemplate,
	DurationFromInputUnsafeTemplate,
	DurationToMillisTemplate,
	DurationToNanosTemplate,
	DurationToNanosUnsafeTemplate,
	DurationIsLessThanTemplate,
	DurationIsLessThanOrEqualToTemplate,
	DurationIsGreaterThanTemplate,
	DurationIsGreaterThanOrEqualToTemplate,
	DurationSumTemplate,
	DurationTimesTemplate,
	DurationFormatTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
