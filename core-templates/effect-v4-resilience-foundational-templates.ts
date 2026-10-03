import { defineTemplate } from './sample-definition.js'
import { effectType } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput
} from './effect-template-helpers.js'

/**
 * Small stable-core primitives used by resilience / supervision compositions.
 *
 * Runtime contract:
 *   import { Clock, Effect } from 'effect'
 */

const VERSION = '1.0.0' as const

export const ClockCurrentTimeMillisTemplate = defineTemplate({
	modelId: 'ClockCurrentTimeMillis',
	version: VERSION,
	description: 'Reads the current wall-clock Unix time in milliseconds through Effect Clock.',
	inputs: {},
	output: expressionOutput('Current Unix timestamp Effect.', effectType('number', 'never', 'never')),
	source: 'Clock.currentTimeMillis'
})

export const ClockMonotonicTimeNanosTemplate = defineTemplate({
	modelId: 'ClockMonotonicTimeNanos',
	version: VERSION,
	description: 'Reads monotonic time in nanoseconds for elapsed-time measurement.',
	inputs: {},
	output: expressionOutput('Monotonic timestamp Effect.', effectType('bigint', 'never', 'never')),
	source: 'Clock.monotonicTimeNanos'
})

export const EffectNeverTemplate = defineTemplate({
	modelId: 'EffectNever',
	version: VERSION,
	description: 'Returns an Effect that never completes unless interrupted.',
	inputs: {},
	output: expressionOutput('Never-completing Effect.', effectType('never', 'never', 'never')),
	source: 'Effect.never'
})

export const effectV4ResilienceFoundationalGraphTemplateInputs = [
	ClockCurrentTimeMillisTemplate,
	ClockMonotonicTimeNanosTemplate,
	EffectNeverTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
