import { fragmentCollectionPort } from '../src/templates.js'
import type { FragmentCollectionInputPort, TypeDescriptor } from '../src/templates.js'
import { nominalType } from './effect-template-helpers.js'
import type { TypeDescriptorWithTs } from './effect-template-helpers.js'

export const expressionCollectionInput = (
	description: string,
	type: TypeDescriptor,
	minItems = 1
): FragmentCollectionInputPort =>
	fragmentCollectionPort({
		regionKind: 'expression',
		accepts: { outputKind: 'expression', type },
		minItems,
		separator: ', ',
		description
	})

export const durationType = (): TypeDescriptorWithTs => nominalType('effect/Duration')
export const optionType = (value = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/Option', { optionValue: value })
export const resultType = (success = 'unknown', failure = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/Result', { resultSuccess: success, resultFailure: failure })
export const causeType = (error = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/Cause', { causeError: error })
export const exitType = (success = 'unknown', error = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/Exit', { exitSuccess: success, exitError: error })
export const hashSetType = (value = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/HashSet', { hashSetValue: value })
export const mutableHashSetType = (value = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/MutableHashSet', { mutableHashSetValue: value })
export const redactedType = (value = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/Redacted', { redactedValue: value })
export const bigDecimalType = (): TypeDescriptorWithTs => nominalType('effect/BigDecimal')
export const chunkType = (value = 'unknown'): TypeDescriptorWithTs =>
	nominalType('effect/Chunk', { chunkValue: value })
export const dateTimeType = (): TypeDescriptorWithTs => nominalType('effect/DateTime')
export const dateTimeUtcType = (): TypeDescriptorWithTs => nominalType('effect/DateTime.Utc')
export const dateTimeZonedType = (): TypeDescriptorWithTs => nominalType('effect/DateTime.Zoned')
export const dateTimeTimeZoneType = (): TypeDescriptorWithTs => nominalType('effect/DateTime.TimeZone')
export const dateTimeNamedZoneType = (): TypeDescriptorWithTs => nominalType('effect/DateTime.TimeZone.Named')
export const dateTimeOffsetZoneType = (): TypeDescriptorWithTs => nominalType('effect/DateTime.TimeZone.Offset')
export const configProviderType = (): TypeDescriptorWithTs => nominalType('effect/ConfigProvider')

/**
 * `URL` is not part of the ES2022 library the descriptor validator compiles
 * against, so it cannot be named directly. Every `URL` instance carries these
 * six string members, which is enough for a consumer to treat the value as a
 * URL without depending on the DOM or Node type libraries.
 */
export const urlType = '{ readonly href: string; readonly protocol: string; readonly host: string; readonly pathname: string; readonly search: string; readonly hash: string }'

export const equivalenceType = (value = 'unknown'): TypeDescriptorWithTs => ({
	ts: `(self: ${value}, that: ${value}) => boolean`
})

export const orderType = (value = 'unknown'): TypeDescriptorWithTs => ({
	ts: `(self: ${value}, that: ${value}) => number`
})
