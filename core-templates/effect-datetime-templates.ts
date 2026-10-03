import { defineTemplate } from './sample-definition.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	dateTimeNamedZoneType,
	dateTimeOffsetZoneType,
	dateTimeTimeZoneType,
	dateTimeType,
	dateTimeUtcType,
	dateTimeZonedType,
	durationType,
	optionType
} from './effect-data-type-template-helpers.js'

const dateTimeInput = (description: string) => typedExpressionInput(description, dateTimeType())
const zonedInput = (description: string) => typedExpressionInput(description, dateTimeZonedType())
const zoneInput = (description: string) => typedExpressionInput(description, dateTimeTimeZoneType())
const durationInput = (description: string) => typedExpressionInput(description, durationType())

export const DateTimeFromDateUnsafeTemplate = defineTemplate({
	modelId: 'DateTimeFromDateUnsafe', version: '1.0.0', description: 'Creates a UTC DateTime from a JavaScript Date without validation.',
	inputs: { date: effectValueInput('JavaScript Date.', { ts: 'Date' }) },
	output: expressionOutput('UTC DateTime.', dateTimeUtcType()),
	source: `DateTime.fromDateUnsafe(${marker('expression', 'date', 'new Date(0)')})`
})

export const DateTimeMakeUnsafeTemplate = defineTemplate({
	modelId: 'DateTimeMakeUnsafe', version: '1.0.0', description: 'Creates a UTC DateTime from a DateTime.Input and throws for invalid input.',
	inputs: { input: valueInput('DateTime input such as DateTime, partial parts, Date, number, or string.') },
	output: expressionOutput('UTC DateTime.', dateTimeUtcType()),
	source: `DateTime.makeUnsafe(${marker('expression', 'input', '0')})`
})

export const DateTimeMakeTemplate = defineTemplate({
	modelId: 'DateTimeMake', version: '1.0.0', description: 'Safely creates a UTC DateTime from a DateTime.Input.',
	inputs: { input: valueInput('DateTime input such as DateTime, partial parts, Date, number, or string.') },
	output: expressionOutput('Optional UTC DateTime.', optionType(dateTimeUtcType().ts)),
	source: `DateTime.make(${marker('expression', 'input', '0')})`
})

export const DateTimeMakeZonedUnsafeTemplate = defineTemplate({
	modelId: 'DateTimeMakeZonedUnsafe', version: '1.0.0', description: 'Creates a Zoned DateTime from input plus time-zone options and throws for invalid input.',
	inputs: { input: valueInput('DateTime input.'), options: valueInput('Options such as timeZone and adjustForTimeZone.') },
	output: expressionOutput('Zoned DateTime.', dateTimeZonedType()),
	source: `DateTime.makeZonedUnsafe(${marker('expression', 'input', '0')}, ${marker('expression', 'options', '{}')})`
})

export const DateTimeMakeZonedTemplate = defineTemplate({
	modelId: 'DateTimeMakeZoned', version: '1.0.0', description: 'Safely creates a Zoned DateTime from input plus time-zone options.',
	inputs: { input: valueInput('DateTime input.'), options: valueInput('Options such as timeZone and adjustForTimeZone.') },
	output: expressionOutput('Optional Zoned DateTime.', optionType(dateTimeZonedType().ts)),
	source: `DateTime.makeZoned(${marker('expression', 'input', '0')}, ${marker('expression', 'options', '{}')})`
})

export const DateTimeMakeZonedFromStringTemplate = defineTemplate({
	modelId: 'DateTimeMakeZonedFromString', version: '1.0.0', description: 'Parses an ISO-like zoned DateTime string containing an offset and IANA zone identifier.',
	inputs: { value: effectValueInput('Zoned DateTime string.', { ts: 'string' }) },
	output: expressionOutput('Optional Zoned DateTime.', optionType(dateTimeZonedType().ts)),
	source: `DateTime.makeZonedFromString(${marker('expression', 'value', '"1970-01-01T00:00:00.000+00:00[UTC]"')})`
})

export const DateTimeNowTemplate = defineTemplate({
	modelId: 'DateTimeNow', version: '1.0.0', description: 'Obtains the current UTC DateTime through the Effect Clock service.',
	inputs: {},
	output: expressionOutput('Current UTC DateTime Effect.', effectType(dateTimeUtcType().ts, 'never', 'never')),
	source: 'DateTime.now'
})

export const DateTimeNowUnsafeTemplate = defineTemplate({
	modelId: 'DateTimeNowUnsafe', version: '1.0.0', description: 'Obtains the current UTC DateTime immediately using Date.now().',
	inputs: {},
	output: expressionOutput('Current UTC DateTime.', dateTimeUtcType()),
	source: 'DateTime.nowUnsafe()'
})

const dateTimeGuard = (
	modelId: string,
	method: 'isDateTime' | 'isTimeZone' | 'isTimeZoneOffset' | 'isTimeZoneNamed' | 'isUtc' | 'isZoned'
) => defineTemplate({
	modelId, version: '1.0.0', description: `Checks a value with DateTime.${method}.`,
	inputs: { value: valueInput('Value to inspect.') },
	output: expressionOutput('Guard result.', { ts: 'boolean' }),
	source: `DateTime.${method}(${marker('expression', 'value', 'undefined')})`
})

export const DateTimeIsDateTimeTemplate = dateTimeGuard('DateTimeIsDateTime', 'isDateTime')
export const DateTimeIsTimeZoneTemplate = dateTimeGuard('DateTimeIsTimeZone', 'isTimeZone')
export const DateTimeIsTimeZoneOffsetTemplate = dateTimeGuard('DateTimeIsTimeZoneOffset', 'isTimeZoneOffset')
export const DateTimeIsTimeZoneNamedTemplate = dateTimeGuard('DateTimeIsTimeZoneNamed', 'isTimeZoneNamed')
export const DateTimeIsUtcTemplate = dateTimeGuard('DateTimeIsUtc', 'isUtc')
export const DateTimeIsZonedTemplate = dateTimeGuard('DateTimeIsZoned', 'isZoned')

export const DateTimeSetZoneTemplate = defineTemplate({
	modelId: 'DateTimeSetZone', version: '1.0.0', description: 'Applies a TimeZone to a DateTime, producing Zoned.',
	inputs: { dateTime: dateTimeInput('DateTime to zone.'), zone: zoneInput('TimeZone to apply.') },
	output: expressionOutput('Zoned DateTime.', dateTimeZonedType()),
	source: `DateTime.setZone(${marker('expression', 'dateTime', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'zone', 'DateTime.zoneMakeOffset(0)')})`
})

export const DateTimeSetZoneOffsetTemplate = defineTemplate({
	modelId: 'DateTimeSetZoneOffset', version: '1.0.0', description: 'Applies a fixed time-zone offset in milliseconds to a DateTime.',
	inputs: { dateTime: dateTimeInput('DateTime to zone.'), offsetMillis: effectValueInput('Offset in milliseconds.', { ts: 'number' }) },
	output: expressionOutput('Zoned DateTime.', dateTimeZonedType()),
	source: `DateTime.setZoneOffset(${marker('expression', 'dateTime', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'offsetMillis', '0')})`
})

export const DateTimeSetZoneNamedTemplate = defineTemplate({
	modelId: 'DateTimeSetZoneNamed', version: '1.0.0', description: 'Safely applies an IANA time-zone identifier to a DateTime.',
	inputs: { dateTime: dateTimeInput('DateTime to zone.'), zone: effectValueInput('IANA time-zone identifier.', { ts: 'string' }) },
	output: expressionOutput('Optional Zoned DateTime.', optionType(dateTimeZonedType().ts)),
	source: `DateTime.setZoneNamed(${marker('expression', 'dateTime', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'zone', '"UTC"')})`
})

export const DateTimeSetZoneNamedUnsafeTemplate = defineTemplate({
	modelId: 'DateTimeSetZoneNamedUnsafe', version: '1.0.0', description: 'Applies an IANA time-zone identifier to a DateTime and throws when invalid.',
	inputs: { dateTime: dateTimeInput('DateTime to zone.'), zone: effectValueInput('IANA time-zone identifier.', { ts: 'string' }) },
	output: expressionOutput('Zoned DateTime.', dateTimeZonedType()),
	source: `DateTime.setZoneNamedUnsafe(${marker('expression', 'dateTime', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'zone', '"UTC"')})`
})

export const DateTimeZoneMakeNamedUnsafeTemplate = defineTemplate({
	modelId: 'DateTimeZoneMakeNamedUnsafe', version: '1.0.0', description: 'Creates a named TimeZone from an IANA identifier and throws when invalid.',
	inputs: { zone: effectValueInput('IANA time-zone identifier.', { ts: 'string' }) },
	output: expressionOutput('Named TimeZone.', dateTimeNamedZoneType()),
	source: `DateTime.zoneMakeNamedUnsafe(${marker('expression', 'zone', '"UTC"')})`
})

export const DateTimeZoneMakeNamedTemplate = defineTemplate({
	modelId: 'DateTimeZoneMakeNamed', version: '1.0.0', description: 'Safely creates a named TimeZone from an IANA identifier.',
	inputs: { zone: effectValueInput('IANA time-zone identifier.', { ts: 'string' }) },
	output: expressionOutput('Optional named TimeZone.', optionType(dateTimeNamedZoneType().ts)),
	source: `DateTime.zoneMakeNamed(${marker('expression', 'zone', '"UTC"')})`
})

export const DateTimeZoneMakeNamedEffectTemplate = defineTemplate({
	modelId: 'DateTimeZoneMakeNamedEffect', version: '1.0.0', description: 'Creates a named TimeZone in Effect, failing for an invalid IANA identifier.',
	inputs: { zone: effectValueInput('IANA time-zone identifier.', { ts: 'string' }) },
	output: expressionOutput('Named TimeZone Effect.', effectType(dateTimeNamedZoneType().ts, 'unknown', 'never')),
	source: `DateTime.zoneMakeNamedEffect(${marker('expression', 'zone', '"UTC"')})`
})

export const DateTimeZoneMakeOffsetTemplate = defineTemplate({
	modelId: 'DateTimeZoneMakeOffset', version: '1.0.0', description: 'Creates a fixed-offset TimeZone from milliseconds.',
	inputs: { offsetMillis: effectValueInput('Offset in milliseconds.', { ts: 'number' }) },
	output: expressionOutput('Offset TimeZone.', dateTimeOffsetZoneType()),
	source: `DateTime.zoneMakeOffset(${marker('expression', 'offsetMillis', '0')})`
})

export const DateTimeZoneMakeLocalTemplate = defineTemplate({
	modelId: 'DateTimeZoneMakeLocal', version: '1.0.0', description: 'Creates a named TimeZone from the system local time zone.',
	inputs: {},
	output: expressionOutput('Local named TimeZone.', dateTimeNamedZoneType()),
	source: 'DateTime.zoneMakeLocal()'
})

export const DateTimeZoneFromStringTemplate = defineTemplate({
	modelId: 'DateTimeZoneFromString', version: '1.0.0', description: 'Parses either an offset or IANA time-zone string.',
	inputs: { value: effectValueInput('Time-zone string.', { ts: 'string' }) },
	output: expressionOutput('Optional TimeZone.', optionType(dateTimeTimeZoneType().ts)),
	source: `DateTime.zoneFromString(${marker('expression', 'value', '"UTC"')})`
})

export const DateTimeZoneToStringTemplate = defineTemplate({
	modelId: 'DateTimeZoneToString', version: '1.0.0', description: 'Returns a string representation of a TimeZone.',
	inputs: { zone: zoneInput('TimeZone to format.') },
	output: expressionOutput('Time-zone string.', { ts: 'string' }),
	source: `DateTime.zoneToString(${marker('expression', 'zone', 'DateTime.zoneMakeOffset(0)')})`
})

export const DateTimeDistanceTemplate = defineTemplate({
	modelId: 'DateTimeDistance', version: '1.0.0', description: 'Returns the distance between two DateTimes as a Duration.',
	inputs: { left: dateTimeInput('Left DateTime.'), right: dateTimeInput('Right DateTime.') },
	output: expressionOutput('Distance Duration.', durationType()),
	source: `DateTime.distance(${marker('expression', 'left', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'right', 'DateTime.makeUnsafe(0)')})`
})

const dateTimeBinary = (modelId: string, method: 'min' | 'max') => defineTemplate({
	modelId, version: '1.0.0', description: `Returns a DateTime using DateTime.${method}.`,
	inputs: { left: dateTimeInput('Left DateTime.'), right: dateTimeInput('Right DateTime.') },
	output: expressionOutput('Selected DateTime.', dateTimeType()),
	source: `DateTime.${method}(${marker('expression', 'left', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'right', 'DateTime.makeUnsafe(0)')})`
})

export const DateTimeMinTemplate = dateTimeBinary('DateTimeMin', 'min')
export const DateTimeMaxTemplate = dateTimeBinary('DateTimeMax', 'max')

const dateTimeComparison = (
	modelId: string,
	method: 'isLessThan' | 'isLessThanOrEqualTo' | 'isGreaterThan' | 'isGreaterThanOrEqualTo'
) => defineTemplate({
	modelId, version: '1.0.0', description: `Compares two DateTimes with DateTime.${method}.`,
	inputs: { left: dateTimeInput('Left DateTime.'), right: dateTimeInput('Right DateTime.') },
	output: expressionOutput('Comparison result.', { ts: 'boolean' }),
	source: `DateTime.${method}(${marker('expression', 'left', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'right', 'DateTime.makeUnsafe(0)')})`
})

export const DateTimeIsLessThanTemplate = dateTimeComparison('DateTimeIsLessThan', 'isLessThan')
export const DateTimeIsLessThanOrEqualToTemplate = dateTimeComparison('DateTimeIsLessThanOrEqualTo', 'isLessThanOrEqualTo')
export const DateTimeIsGreaterThanTemplate = dateTimeComparison('DateTimeIsGreaterThan', 'isGreaterThan')
export const DateTimeIsGreaterThanOrEqualToTemplate = dateTimeComparison('DateTimeIsGreaterThanOrEqualTo', 'isGreaterThanOrEqualTo')

const dateTimeConversion = (
	modelId: string,
	method: 'toDateUtc' | 'toDate' | 'toEpochMillis' | 'removeTime',
	outputType: { ts: string } | ReturnType<typeof dateTimeUtcType>
) => defineTemplate({
	modelId, version: '1.0.0', description: `Converts a DateTime with DateTime.${method}.`,
	inputs: { dateTime: dateTimeInput('DateTime to convert.') },
	output: expressionOutput('Converted DateTime value.', outputType),
	source: `DateTime.${method}(${marker('expression', 'dateTime', 'DateTime.makeUnsafe(0)')})`
})

export const DateTimeToDateUtcTemplate = dateTimeConversion('DateTimeToDateUtc', 'toDateUtc', { ts: 'Date' })
export const DateTimeToDateTemplate = dateTimeConversion('DateTimeToDate', 'toDate', { ts: 'Date' })
export const DateTimeToEpochMillisTemplate = dateTimeConversion('DateTimeToEpochMillis', 'toEpochMillis', { ts: 'number' })
export const DateTimeRemoveTimeTemplate = dateTimeConversion('DateTimeRemoveTime', 'removeTime', dateTimeUtcType())

export const DateTimeZonedOffsetTemplate = defineTemplate({
	modelId: 'DateTimeZonedOffset', version: '1.0.0', description: 'Returns the time-zone offset in milliseconds for a Zoned DateTime.',
	inputs: { dateTime: zonedInput('Zoned DateTime.') },
	output: expressionOutput('Offset in milliseconds.', { ts: 'number' }),
	source: `DateTime.zonedOffset(${marker('expression', 'dateTime', 'DateTime.makeZonedUnsafe(0)')})`
})

export const DateTimeZonedOffsetIsoTemplate = defineTemplate({
	modelId: 'DateTimeZonedOffsetIso', version: '1.0.0', description: 'Formats the offset of a Zoned DateTime as an ISO offset string.',
	inputs: { dateTime: zonedInput('Zoned DateTime.') },
	output: expressionOutput('ISO offset string.', { ts: 'string' }),
	source: `DateTime.zonedOffsetIso(${marker('expression', 'dateTime', 'DateTime.makeZonedUnsafe(0)')})`
})

const partsTemplate = (modelId: string, method: 'toParts' | 'toPartsUtc') => defineTemplate({
	modelId, version: '1.0.0', description: `Returns DateTime parts with DateTime.${method}.`,
	inputs: { dateTime: dateTimeInput('DateTime to inspect.') },
	output: expressionOutput('DateTime parts.', { ts: 'Readonly<Record<string, number>>' }),
	source: `DateTime.${method}(${marker('expression', 'dateTime', 'DateTime.makeUnsafe(0)')})`
})

export const DateTimeToPartsTemplate = partsTemplate('DateTimeToParts', 'toParts')
export const DateTimeToPartsUtcTemplate = partsTemplate('DateTimeToPartsUtc', 'toPartsUtc')

const getPartTemplate = (modelId: string, method: 'getPart' | 'getPartUtc') => defineTemplate({
	modelId, version: '1.0.0', description: `Retrieves one DateTime part with DateTime.${method}.`,
	inputs: { dateTime: dateTimeInput('DateTime to inspect.'), part: effectValueInput('Part name such as year or month.', { ts: 'string' }) },
	output: expressionOutput('DateTime part value.', { ts: 'number' }),
	source: `DateTime.${method}(${marker('expression', 'dateTime', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'part', '"year"')})`
})

export const DateTimeGetPartTemplate = getPartTemplate('DateTimeGetPart', 'getPart')
export const DateTimeGetPartUtcTemplate = getPartTemplate('DateTimeGetPartUtc', 'getPartUtc')

const setPartsTemplate = (modelId: string, method: 'setParts' | 'setPartsUtc') => defineTemplate({
	modelId, version: '1.0.0', description: `Updates DateTime parts with DateTime.${method}.`,
	inputs: { dateTime: dateTimeInput('DateTime to update.'), parts: valueInput('Partial DateTime parts object.') },
	output: expressionOutput('Updated DateTime.', dateTimeType()),
	source: `DateTime.${method}(${marker('expression', 'dateTime', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'parts', '{}')})`
})

export const DateTimeSetPartsTemplate = setPartsTemplate('DateTimeSetParts', 'setParts')
export const DateTimeSetPartsUtcTemplate = setPartsTemplate('DateTimeSetPartsUtc', 'setPartsUtc')

const durationMath = (modelId: string, method: 'addDuration' | 'subtractDuration') => defineTemplate({
	modelId, version: '1.0.0', description: `${method === 'addDuration' ? 'Adds' : 'Subtracts'} a Duration ${method === 'addDuration' ? 'to' : 'from'} a DateTime.`,
	inputs: { dateTime: dateTimeInput('Source DateTime.'), duration: durationInput('Duration operand.') },
	output: expressionOutput('Adjusted DateTime.', dateTimeType()),
	source: `DateTime.${method}(${marker('expression', 'dateTime', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'duration', 'Duration.millis(0)')})`
})

export const DateTimeAddDurationTemplate = durationMath('DateTimeAddDuration', 'addDuration')
export const DateTimeSubtractDurationTemplate = durationMath('DateTimeSubtractDuration', 'subtractDuration')

const partsMath = (modelId: string, method: 'add' | 'subtract') => defineTemplate({
	modelId, version: '1.0.0', description: `${method === 'add' ? 'Adds' : 'Subtracts'} numeric calendar parts on a DateTime.`,
	inputs: { dateTime: dateTimeInput('Source DateTime.'), parts: valueInput('Numeric parts such as { days: 1 } or { hours: 2 }.') },
	output: expressionOutput('Adjusted DateTime.', dateTimeType()),
	source: `DateTime.${method}(${marker('expression', 'dateTime', 'DateTime.makeUnsafe(0)')}, ${marker('expression', 'parts', '{}')})`
})

export const DateTimeAddTemplate = partsMath('DateTimeAdd', 'add')
export const DateTimeSubtractTemplate = partsMath('DateTimeSubtract', 'subtract')

const isoFormat = (
	modelId: string,
	method: 'formatIso' | 'formatIsoDate' | 'formatIsoDateUtc' | 'formatIsoOffset' | 'formatIsoZoned',
	input: ReturnType<typeof dateTimeInput> | ReturnType<typeof zonedInput>
) => defineTemplate({
	modelId, version: '1.0.0', description: `Formats a DateTime with DateTime.${method}.`,
	inputs: { dateTime: input },
	output: expressionOutput('Formatted DateTime string.', { ts: 'string' }),
	source: `DateTime.${method}(${marker('expression', 'dateTime', method === 'formatIsoOffset' || method === 'formatIsoZoned' ? 'DateTime.makeZonedUnsafe(0)' : 'DateTime.makeUnsafe(0)')})`
})

export const DateTimeFormatIsoTemplate = isoFormat('DateTimeFormatIso', 'formatIso', dateTimeInput('DateTime to format.'))
export const DateTimeFormatIsoDateTemplate = isoFormat('DateTimeFormatIsoDate', 'formatIsoDate', dateTimeInput('DateTime to format.'))
export const DateTimeFormatIsoDateUtcTemplate = isoFormat('DateTimeFormatIsoDateUtc', 'formatIsoDateUtc', dateTimeInput('DateTime to format.'))
export const DateTimeFormatIsoOffsetTemplate = isoFormat('DateTimeFormatIsoOffset', 'formatIsoOffset', zonedInput('Zoned DateTime to format.'))
export const DateTimeFormatIsoZonedTemplate = isoFormat('DateTimeFormatIsoZoned', 'formatIsoZoned', zonedInput('Zoned DateTime to format.'))

export const DateTimeNowInCurrentZoneTemplate = defineTemplate({
	modelId: 'DateTimeNowInCurrentZone', version: '1.0.0', description: 'Obtains the current Zoned DateTime in the configured CurrentTimeZone.',
	inputs: {},
	output: expressionOutput('Current Zoned DateTime Effect.', effectType(dateTimeZonedType().ts, 'never', 'unknown')),
	source: 'DateTime.nowInCurrentZone'
})

export const DateTimeWithCurrentZoneNamedTemplate = defineTemplate({
	modelId: 'DateTimeWithCurrentZoneNamed', version: '1.0.0', description: 'Runs an Effect with a named current time zone.',
	typeParameters: typeParameters(['A', 'Effect success type.'], ['E', 'Effect error type.'], ['R', 'Effect requirements.']),
	inputs: { effect: effectSourceInput('Effect to run under the named time zone.', effectType('{{A}}', '{{E}}', '{{R}}')), zone: effectValueInput('IANA time-zone identifier.', { ts: 'string' }) },
	output: expressionOutput('Effect with named CurrentTimeZone provided.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'effect', 'Effect.void')}.pipe(DateTime.withCurrentZoneNamed(${marker('expression', 'zone', '"UTC"')}))`
})

export const effectDateTimeGraphTemplateInputs = [
	DateTimeFromDateUnsafeTemplate,
	DateTimeMakeUnsafeTemplate,
	DateTimeMakeTemplate,
	DateTimeMakeZonedUnsafeTemplate,
	DateTimeMakeZonedTemplate,
	DateTimeMakeZonedFromStringTemplate,
	DateTimeNowTemplate,
	DateTimeNowUnsafeTemplate,
	DateTimeIsDateTimeTemplate,
	DateTimeIsTimeZoneTemplate,
	DateTimeIsTimeZoneOffsetTemplate,
	DateTimeIsTimeZoneNamedTemplate,
	DateTimeIsUtcTemplate,
	DateTimeIsZonedTemplate,
	DateTimeSetZoneTemplate,
	DateTimeSetZoneOffsetTemplate,
	DateTimeSetZoneNamedTemplate,
	DateTimeSetZoneNamedUnsafeTemplate,
	DateTimeZoneMakeNamedUnsafeTemplate,
	DateTimeZoneMakeNamedTemplate,
	DateTimeZoneMakeNamedEffectTemplate,
	DateTimeZoneMakeOffsetTemplate,
	DateTimeZoneMakeLocalTemplate,
	DateTimeZoneFromStringTemplate,
	DateTimeZoneToStringTemplate,
	DateTimeDistanceTemplate,
	DateTimeMinTemplate,
	DateTimeMaxTemplate,
	DateTimeIsLessThanTemplate,
	DateTimeIsLessThanOrEqualToTemplate,
	DateTimeIsGreaterThanTemplate,
	DateTimeIsGreaterThanOrEqualToTemplate,
	DateTimeToDateUtcTemplate,
	DateTimeToDateTemplate,
	DateTimeToEpochMillisTemplate,
	DateTimeRemoveTimeTemplate,
	DateTimeZonedOffsetTemplate,
	DateTimeZonedOffsetIsoTemplate,
	DateTimeToPartsTemplate,
	DateTimeToPartsUtcTemplate,
	DateTimeGetPartTemplate,
	DateTimeGetPartUtcTemplate,
	DateTimeSetPartsTemplate,
	DateTimeSetPartsUtcTemplate,
	DateTimeAddDurationTemplate,
	DateTimeSubtractDurationTemplate,
	DateTimeAddTemplate,
	DateTimeSubtractTemplate,
	DateTimeFormatIsoTemplate,
	DateTimeFormatIsoDateTemplate,
	DateTimeFormatIsoDateUtcTemplate,
	DateTimeFormatIsoOffsetTemplate,
	DateTimeFormatIsoZonedTemplate,
	DateTimeNowInCurrentZoneTemplate,
	DateTimeWithCurrentZoneNamedTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
