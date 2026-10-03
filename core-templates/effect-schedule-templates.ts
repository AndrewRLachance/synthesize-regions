import { fragmentCollectionPort } from '../src/templates.js'
import { defineTemplate } from './sample-definition.js'
import { effectDurationInput, effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	marker,
	nominalType,
	scheduleType,
	stringInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import { resultType } from './effect-data-type-template-helpers.js'

/**
 * Effect v4 Schedule / Cron graph templates.
 *
 * Runtime contract:
 *   import { Cron, Effect, Schedule } from 'effect'
 */

const VERSION = '2.0.0' as const

const scheduleInput = (
	description: string,
	output = 'unknown',
	input = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, scheduleType(output, input, requirements))

const cronType = () => nominalType('effect/Cron')
const cronInput = (description: string) => typedExpressionInput(description, cronType())

const cronParseError = '{ readonly _tag?: string; readonly message?: string }'

export const ScheduleForeverTemplate = defineTemplate({
	modelId: 'ScheduleForever',
	version: VERSION,
	description: 'Creates a schedule that recurs forever with no additional delay.',
	inputs: {},
	output: expressionOutput('Infinite recurrence Schedule.', scheduleType('unknown', 'unknown', 'never')),
	source: 'Schedule.forever'
})

export const ScheduleOnceTemplate = defineTemplate({
	modelId: 'ScheduleOnce',
	version: VERSION,
	description: 'Creates a schedule that recurs exactly once after the initial effect execution.',
	inputs: {},
	output: expressionOutput('One-recurrence Schedule.', scheduleType('unknown', 'unknown', 'never')),
	source: 'Schedule.duration(0)'
})

export const ScheduleDurationTemplate = defineTemplate({
	modelId: 'ScheduleDuration',
	version: VERSION,
	description: 'Creates a one-recurrence schedule with the supplied delay.',
	inputs: {
		duration: effectDurationInput('Delay before the recurrence.')
	},
	output: expressionOutput('Single-duration Schedule.', scheduleType('unknown', 'unknown', 'never')),
	source: `Schedule.duration(${marker('expression', 'duration', '0')})`
})

export const ScheduleRecursTemplate = defineTemplate({
	modelId: 'ScheduleRecurs',
	version: VERSION,
	description: 'Creates a Schedule that recurs a fixed number of times.',
	inputs: {
		count: effectValueInput('Number of recurrences.', { ts: 'number' })
	},
	output: expressionOutput('Finite recurrence Schedule.', scheduleType('number', 'unknown', 'never')),
	source: `Schedule.recurs(${marker('expression', 'count', '1')})`
})

export const ScheduleSpacedTemplate = defineTemplate({
	modelId: 'ScheduleSpaced',
	version: VERSION,
	description: 'Creates a Schedule with a fixed delay added between recurrences.',
	inputs: {
		duration: effectDurationInput('Delay between recurrences.')
	},
	output: expressionOutput('Fixed-spacing Schedule.', scheduleType('unknown', 'unknown', 'never')),
	source: `Schedule.spaced(${marker('expression', 'duration', '1000')})`
})

export const ScheduleFixedTemplate = defineTemplate({
	modelId: 'ScheduleFixed',
	version: VERSION,
	description: 'Creates a fixed-interval Schedule whose interval includes effect execution time.',
	inputs: {
		interval: effectDurationInput('Target interval between recurrence starts.')
	},
	output: expressionOutput('Fixed-interval Schedule.', scheduleType('unknown', 'unknown', 'never')),
	source: `Schedule.fixed(${marker('expression', 'interval', '1000')})`
})

export const ScheduleExponentialTemplate = defineTemplate({
	modelId: 'ScheduleExponential',
	version: VERSION,
	description: 'Creates an infinite exponential-backoff Schedule from an initial delay.',
	inputs: {
		base: effectDurationInput('Initial backoff delay.')
	},
	output: expressionOutput('Exponential Schedule.', scheduleType('unknown', 'unknown', 'never')),
	source: `Schedule.exponential(${marker('expression', 'base', '1000')})`
})

export const ScheduleFibonacciTemplate = defineTemplate({
	modelId: 'ScheduleFibonacci',
	version: VERSION,
	description: 'Creates an infinite Fibonacci-backoff Schedule from an initial delay.',
	inputs: {
		base: effectDurationInput('Initial Fibonacci delay.')
	},
	output: expressionOutput('Fibonacci Schedule.', scheduleType('unknown', 'unknown', 'never')),
	source: `Schedule.fibonacci(${marker('expression', 'base', '1000')})`
})

export const ScheduleIdentityTemplate = defineTemplate({
	modelId: 'ScheduleIdentity',
	version: VERSION,
	description: 'Creates a Schedule that exposes each input value as its output.',
	inputs: {},
	output: expressionOutput('Identity Schedule.', scheduleType('unknown', 'unknown', 'never')),
	source: 'Schedule.identity()'
})

export const ScheduleMinTemplate = defineTemplate({
	modelId: 'ScheduleMin',
	version: VERSION,
	description: 'Combines schedules by continuing while either can recur and choosing the shorter delay at each step.',
	inputs: {
		schedules: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression' },
			minItems: 2,
			separator: ', ',
			description: 'Schedules to combine by minimum delay.'
		})
	},
	output: expressionOutput('Minimum-delay union Schedule.', scheduleType('unknown', 'unknown', 'unknown')),
	source: `Schedule.min([${marker('expression', 'schedules', 'Schedule.forever, Schedule.forever')}])`
})

export const ScheduleMaxTemplate = defineTemplate({
	modelId: 'ScheduleMax',
	version: VERSION,
	description: 'Combines schedules by requiring both to continue and choosing the longer delay at each step.',
	inputs: {
		schedules: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression' },
			minItems: 2,
			separator: ', ',
			description: 'Schedules to combine by maximum delay.'
		})
	},
	output: expressionOutput('Maximum-delay intersection Schedule.', scheduleType('unknown', 'unknown', 'unknown')),
	source: `Schedule.max([${marker('expression', 'schedules', 'Schedule.forever, Schedule.forever')}])`
})

export const ScheduleConcatTemplate = defineTemplate({
	modelId: 'ScheduleConcat',
	version: VERSION,
	description: 'Runs one Schedule to completion and then continues with another.',
	inputs: {
		first: scheduleInput('Schedule to run first.'),
		second: scheduleInput('Schedule to run after the first completes.')
	},
	output: expressionOutput('Sequentially composed Schedule.', scheduleType('unknown', 'unknown', 'unknown')),
	source: `Schedule.concat(${marker('expression', 'first', 'Schedule.recurs(1)')}, ${marker('expression', 'second', 'Schedule.forever')})`
})

export const ScheduleJitteredTemplate = defineTemplate({
	modelId: 'ScheduleJittered',
	version: VERSION,
	description: 'Adds randomized jitter to recurrence delays.',
	typeParameters: typeParameters(
		['Out', 'Schedule output type.'],
		['In', 'Schedule input type.'],
		['R', 'Schedule requirements.']
	),
	inputs: {
		schedule: scheduleInput('Schedule to jitter.', '{{Out}}', '{{In}}', '{{R}}')
	},
	output: expressionOutput('Jittered Schedule.', scheduleType('{{Out}}', '{{In}}', '{{R}}')),
	source: `Schedule.jittered(${marker('expression', 'schedule', 'Schedule.exponential(1000)')})`
})

export const ScheduleWhileTemplate = defineTemplate({
	modelId: 'ScheduleWhile',
	version: VERSION,
	description: 'Continues a Schedule only while a predicate over schedule metadata returns true.',
	typeParameters: typeParameters(
		['Out', 'Schedule output type.'],
		['In', 'Schedule input type.'],
		['R', 'Schedule requirements.']
	),
	inputs: {
		schedule: scheduleInput('Schedule to constrain.', '{{Out}}', '{{In}}', '{{R}}'),
		predicate: callbackInput('Predicate receiving the current schedule input and output.', {
			ts: '(state: { readonly input: {{In}}; readonly output: {{Out}} }) => boolean'
		})
	},
	output: expressionOutput('Predicate-bounded Schedule.', scheduleType('{{Out}}', '{{In}}', '{{R}}')),
	source: `Schedule.while(${marker('expression', 'schedule', 'Schedule.forever')}, ${marker('expression', 'predicate', '() => true')})`
})

export const ScheduleAddDelayTemplate = defineTemplate({
	modelId: 'ScheduleAddDelay',
	version: VERSION,
	description: 'Adds an effectfully computed delay to each recurrence.',
	typeParameters: typeParameters(
		['Out', 'Schedule output type.'],
		['In', 'Schedule input type.'],
		['R', 'Schedule requirements.'],
		['R2', 'Delay callback requirements.']
	),
	inputs: {
		schedule: scheduleInput('Schedule whose delay is extended.', '{{Out}}', '{{In}}', '{{R}}'),
		delay: callbackInput(
			'Effectful callback returning an additional Duration.Input.',
			effectReturningCallbackType(
				'state: { readonly input: {{In}}; readonly output: {{Out}} }',
				'unknown',
				'never',
				'{{R2}}'
			)
		)
	},
	output: expressionOutput('Delay-extended Schedule.', scheduleType('{{Out}}', '{{In}}', '{{R}} | {{R2}}')),
	source: `Schedule.addDelay(${marker('expression', 'schedule', 'Schedule.forever')}, ${marker('expression', 'delay', '() => Effect.succeed(0)')})`
})

export const ScheduleModifyDelayTemplate = defineTemplate({
	modelId: 'ScheduleModifyDelay',
	version: VERSION,
	description: 'Replaces each recurrence delay with an effectfully computed Duration.Input.',
	typeParameters: typeParameters(
		['Out', 'Schedule output type.'],
		['In', 'Schedule input type.'],
		['R', 'Schedule requirements.'],
		['R2', 'Delay callback requirements.']
	),
	inputs: {
		schedule: scheduleInput('Schedule whose delay is modified.', '{{Out}}', '{{In}}', '{{R}}'),
		modify: callbackInput(
			'Effectful callback receiving input, output, and current duration.',
			effectReturningCallbackType(
				'state: { readonly input: {{In}}; readonly output: {{Out}}; readonly duration: unknown }',
				'unknown',
				'never',
				'{{R2}}'
			)
		)
	},
	output: expressionOutput('Delay-modified Schedule.', scheduleType('{{Out}}', '{{In}}', '{{R}} | {{R2}}')),
	source: `Schedule.modifyDelay(${marker('expression', 'schedule', 'Schedule.forever')}, ${marker('expression', 'modify', '({ duration }) => Effect.succeed(duration)')})`
})

export const ScheduleTapTemplate = defineTemplate({
	modelId: 'ScheduleTap',
	version: VERSION,
	description: 'Runs an effect before each recurrence without changing Schedule behavior.',
	typeParameters: typeParameters(
		['Out', 'Schedule output type.'],
		['In', 'Schedule input type.'],
		['R', 'Schedule requirements.'],
		['R2', 'Tap callback requirements.']
	),
	inputs: {
		schedule: scheduleInput('Schedule to observe.', '{{Out}}', '{{In}}', '{{R}}'),
		tap: callbackInput(
			'Effectful callback receiving the current schedule input and output.',
			effectReturningCallbackType(
				'state: { readonly input: {{In}}; readonly output: {{Out}} }',
				'unknown',
				'never',
				'{{R2}}'
			)
		)
	},
	output: expressionOutput('Tapped Schedule.', scheduleType('{{Out}}', '{{In}}', '{{R}} | {{R2}}')),
	source: `Schedule.tap(${marker('expression', 'schedule', 'Schedule.forever')}, ${marker('expression', 'tap', '() => Effect.void')})`
})

export const ScheduleUpToTimesTemplate = defineTemplate({
	modelId: 'ScheduleUpToTimes',
	version: VERSION,
	description: 'Limits a Schedule to at most the specified number of recurrences.',
	typeParameters: typeParameters(
		['Out', 'Schedule output type.'],
		['In', 'Schedule input type.'],
		['R', 'Schedule requirements.']
	),
	inputs: {
		schedule: scheduleInput('Schedule to limit.', '{{Out}}', '{{In}}', '{{R}}'),
		times: effectValueInput('Maximum recurrence count.', { ts: 'number' })
	},
	output: expressionOutput('Count-limited Schedule.', scheduleType('{{Out}}', '{{In}}', '{{R}}')),
	source: `${marker('expression', 'schedule', 'Schedule.forever')}.pipe(Schedule.upTo({ times: ${marker('expression', 'times', '1')} }))`
})

export const CronMakeTemplate = defineTemplate({
	modelId: 'CronMake',
	version: VERSION,
	description: 'Creates a Cron from explicit second, minute, hour, day, month, weekday, and optional timezone constraints.',
	inputs: {
		options: valueInput('Cron constraint object.')
	},
	output: expressionOutput('Cron value.', cronType()),
	source: `Cron.make(${marker('expression', 'options', '{ seconds: [], minutes: [], hours: [], days: [], months: [], weekdays: [] }')})`
})

export const CronParseTemplate = defineTemplate({
	modelId: 'CronParse',
	version: VERSION,
	description: 'Safely parses a cron expression and returns Result.',
	inputs: {
		expression: stringInput('Cron expression.'),
		timeZone: valueInput('Optional time-zone input.')
	},
	output: expressionOutput('Cron parse Result.', resultType(cronType().ts, cronParseError)),
	source: `Cron.parse(${marker('string', 'expression', '"0 0 * * * *"')}, ${marker('expression', 'timeZone', 'undefined')})`
})

export const CronParseUnsafeTemplate = defineTemplate({
	modelId: 'CronParseUnsafe',
	version: VERSION,
	description: 'Parses a cron expression and throws when the expression is invalid.',
	inputs: {
		expression: stringInput('Cron expression.'),
		timeZone: valueInput('Optional time-zone input.')
	},
	output: expressionOutput('Parsed Cron.', cronType()),
	source: `Cron.parseUnsafe(${marker('string', 'expression', '"0 0 * * * *"')}, ${marker('expression', 'timeZone', 'undefined')})`
})

export const CronMatchTemplate = defineTemplate({
	modelId: 'CronMatch',
	version: VERSION,
	description: 'Checks whether a DateTime input satisfies a Cron.',
	inputs: {
		cron: cronInput('Cron constraints.'),
		date: valueInput('Date or DateTime input.')
	},
	output: expressionOutput('Whether the date matches.', { ts: 'boolean' }),
	source: `Cron.match(${marker('expression', 'cron', 'Cron.parseUnsafe("0 0 * * * *")')}, ${marker('expression', 'date', 'new Date()')})`
})

export const CronNextTemplate = defineTemplate({
	modelId: 'CronNext',
	version: VERSION,
	description: 'Finds the next Date satisfying a Cron after a supplied starting point.',
	inputs: {
		cron: cronInput('Cron constraints.'),
		after: valueInput('Starting DateTime input.')
	},
	output: expressionOutput('Next matching Date.', { ts: 'Date' }),
	source: `Cron.next(${marker('expression', 'cron', 'Cron.parseUnsafe("0 0 * * * *")')}, ${marker('expression', 'after', 'new Date()')})`
})

export const CronSequenceTemplate = defineTemplate({
	modelId: 'CronSequence',
	version: VERSION,
	description: 'Creates an infinite iterator of future Dates satisfying a Cron.',
	inputs: {
		cron: cronInput('Cron constraints.'),
		start: valueInput('Starting DateTime input.')
	},
	output: expressionOutput('Cron Date iterator.', { ts: 'IterableIterator<Date>' }),
	source: `Cron.sequence(${marker('expression', 'cron', 'Cron.parseUnsafe("0 0 * * * *")')}, ${marker('expression', 'start', 'new Date()')})`
})

export const ScheduleCronTemplate = defineTemplate({
	modelId: 'ScheduleCron',
	version: VERSION,
	description: 'Converts a Cron value into a recurring Schedule.',
	inputs: {
		cron: cronInput('Cron to convert.')
	},
	output: expressionOutput('Cron-backed Schedule.', scheduleType('unknown', 'unknown', 'unknown')),
	source: `Schedule.cron(${marker('expression', 'cron', 'Cron.parseUnsafe("0 0 * * * *")')})`
})

export const EffectRepeatTemplate = defineTemplate({
	modelId: 'EffectRepeat',
	version: VERSION,
	description: 'Runs an Effect once and then repeats successful executions according to a Schedule.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.'],
		['Out', 'Schedule output type.'],
		['R2', 'Schedule requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to repeat.', effectType('{{A}}', '{{E}}', '{{R}}')),
		schedule: scheduleInput('Repeat Schedule consuming successful values.', '{{Out}}', '{{A}}', '{{R2}}')
	},
	output: expressionOutput('Repeated Effect.', effectType('{{Out}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `Effect.repeat(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'schedule', 'Schedule.recurs(1)')})`
})

export const EffectRepeatTimesTemplate = defineTemplate({
	modelId: 'EffectRepeatTimes',
	version: VERSION,
	description: 'Runs an Effect once and then repeats it a fixed number of additional times.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to repeat.', effectType('{{A}}', '{{E}}', '{{R}}')),
		times: effectValueInput('Additional repetition count.', { ts: 'number' })
	},
	output: expressionOutput('Repeated Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.repeat(${marker('expression', 'source', 'Effect.void')}, { times: ${marker('expression', 'times', '1')} })`
})

export const EffectScheduleTemplate = defineTemplate({
	modelId: 'EffectSchedule',
	version: VERSION,
	description: 'Runs an Effect only according to a Schedule, skipping the initial unscheduled execution.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.'],
		['Out', 'Schedule output type.'],
		['R2', 'Schedule requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to schedule.', effectType('{{A}}', '{{E}}', '{{R}}')),
		schedule: scheduleInput('Execution Schedule.', '{{Out}}', '{{A}}', '{{R2}}')
	},
	output: expressionOutput('Scheduled Effect.', effectType('{{Out}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `Effect.schedule(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'schedule', 'Schedule.recurs(1)')})`
})

export const EffectRepeatWhileTemplate = defineTemplate({
	modelId: 'EffectRepeatWhile',
	version: VERSION,
	description: 'Repeats successful executions while a predicate over each result remains true.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to repeat.', effectType('{{A}}', '{{E}}', '{{R}}')),
		predicate: callbackInput('Success predicate controlling whether another repetition occurs.', {
			ts: '(value: {{A}}) => boolean'
		})
	},
	output: expressionOutput('Conditionally repeated Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.repeat(${marker('expression', 'source', 'Effect.void')}, { while: ${marker('expression', 'predicate', '() => true')} })`
})

export const EffectRepeatUntilTemplate = defineTemplate({
	modelId: 'EffectRepeatUntil',
	version: VERSION,
	description: 'Repeats successful executions until a predicate over a result becomes true.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to repeat.', effectType('{{A}}', '{{E}}', '{{R}}')),
		predicate: callbackInput('Success predicate that stops repetition when it becomes true.', {
			ts: '(value: {{A}}) => boolean'
		})
	},
	output: expressionOutput('Conditionally repeated Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.repeat(${marker('expression', 'source', 'Effect.void')}, { until: ${marker('expression', 'predicate', '() => true')} })`
})

export const EffectRepeatOrElseTemplate = defineTemplate({
	modelId: 'EffectRepeatOrElse',
	version: VERSION,
	description: 'Repeats successful executions according to a Schedule and handles the first failure.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.'],
		['Out', 'Schedule output type.'],
		['R2', 'Schedule requirements.'],
		['B', 'Fallback success type.'],
		['E2', 'Fallback error type.'],
		['R3', 'Fallback requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to repeat.', effectType('{{A}}', '{{E}}', '{{R}}')),
		schedule: scheduleInput('Repeat Schedule.', '{{Out}}', '{{A}}', '{{R2}}'),
		orElse: callbackInput(
			'Fallback receiving the failure and latest Schedule output.',
			effectReturningCallbackType('error: {{E}}, output: {{Out}}', '{{B}}', '{{E2}}', '{{R3}}')
		)
	},
	output: expressionOutput('Repeated Effect with fallback.', effectType('{{Out}} | {{B}}', '{{E2}}', '{{R}} | {{R2}} | {{R3}}')),
	source: `Effect.repeatOrElse(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'schedule', 'Schedule.recurs(1)')}, ${marker('expression', 'orElse', '() => Effect.succeed(0)')})`
})

export const EffectRetryScheduleTemplate = defineTemplate({
	modelId: 'EffectRetrySchedule',
	version: VERSION,
	description: 'Retries failed executions according to a Schedule that consumes error values.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.'],
		['Out', 'Schedule output type.'],
		['R2', 'Schedule requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to retry.', effectType('{{A}}', '{{E}}', '{{R}}')),
		schedule: scheduleInput('Retry Schedule consuming source errors.', '{{Out}}', '{{E}}', '{{R2}}')
	},
	output: expressionOutput('Retried Effect.', effectType('{{A}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `${marker('expression', 'source', 'Effect.void')}.pipe(Effect.retry(${marker('expression', 'schedule', 'Schedule.recurs(1)')}))`
})

export const EffectRetryTimesTemplate = defineTemplate({
	modelId: 'EffectRetryTimes',
	version: VERSION,
	description: 'Retries a failed Effect a fixed number of additional times.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to retry.', effectType('{{A}}', '{{E}}', '{{R}}')),
		times: effectValueInput('Maximum retry count.', { ts: 'number' })
	},
	output: expressionOutput('Retried Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'source', 'Effect.void')}.pipe(Effect.retry({ times: ${marker('expression', 'times', '1')} }))`
})

export const EffectRetryWhileTemplate = defineTemplate({
	modelId: 'EffectRetryWhile',
	version: VERSION,
	description: 'Retries failures only while a predicate over the source error returns true.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to retry.', effectType('{{A}}', '{{E}}', '{{R}}')),
		predicate: callbackInput('Error predicate controlling whether another retry occurs.', {
			ts: '(error: {{E}}) => boolean'
		})
	},
	output: expressionOutput('Conditionally retried Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'source', 'Effect.void')}.pipe(Effect.retry({ while: ${marker('expression', 'predicate', '() => true')} }))`
})


export const effectScheduleGraphTemplateInputs = [
	ScheduleForeverTemplate,
	ScheduleOnceTemplate,
	ScheduleDurationTemplate,
	ScheduleRecursTemplate,
	ScheduleSpacedTemplate,
	ScheduleFixedTemplate,
	ScheduleExponentialTemplate,
	ScheduleFibonacciTemplate,
	ScheduleIdentityTemplate,
	ScheduleMinTemplate,
	ScheduleMaxTemplate,
	ScheduleConcatTemplate,
	ScheduleJitteredTemplate,
	ScheduleWhileTemplate,
	ScheduleAddDelayTemplate,
	ScheduleModifyDelayTemplate,
	ScheduleTapTemplate,
	ScheduleUpToTimesTemplate,
	CronMakeTemplate,
	CronParseTemplate,
	CronParseUnsafeTemplate,
	CronMatchTemplate,
	CronNextTemplate,
	CronSequenceTemplate,
	ScheduleCronTemplate,
	EffectRepeatTemplate,
	EffectRepeatTimesTemplate,
	EffectScheduleTemplate,
	EffectRepeatWhileTemplate,
	EffectRepeatUntilTemplate,
	EffectRepeatOrElseTemplate,
	EffectRetryScheduleTemplate,
	EffectRetryTimesTemplate,
	EffectRetryWhileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
