import { defineTemplate } from '../../../authoring/define-template.js'
import {
	effectCollectionInput,
	effectDurationInput,
	effectSourceInput,
	effectStructuralType,
	effectType,
	effectValueInput
} from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	marker,
	scheduleType,
	statementOutput,
	stringInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import {
	causeType,
	exitType,
	optionType,
	resultType
} from '../data/effect-data-type-template-helpers.js'
import {
	CauseHasDiesTemplate,
	CauseHasFailsTemplate,
	CauseHasInterruptsTemplate
} from './effect-cause-templates.js'

/**
 * Effect v4 error-management templates.
 *
 * This module is intended as a consolidated replacement/reference catalog for
 * error-management operations. Do not register it alongside older templates
 * with the same modelId.
 *
 * Runtime contract:
 *   import { Cause, Data, Effect, Filter, Schedule } from 'effect'
 */

/*
 * Nested descriptors need the bare structural string of a canonical descriptor
 * (an Effect that yields an Option/Result/Exit/Cause). They are derived from the
 * canonical `effect-data-type-template-helpers.js` descriptors so the phantom
 * spellings can never drift apart.
 */
const optionTs = (value = 'unknown') => optionType(value).ts

const resultTs = (success = 'unknown', error = 'unknown') => resultType(success, error).ts

const exitTs = (success = 'unknown', error = 'unknown') => exitType(success, error).ts

const causeTs = (error = 'unknown') => causeType(error).ts

const timeoutError = '{ readonly _tag: "TimeoutError" }'

const scheduleInput = (
	description: string,
	output = 'unknown',
	input = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, scheduleType(output, input, requirements))

// Expected errors -------------------------------------------------------------

export const EffectFailSyncTemplate = defineTemplate({
	modelId: 'EffectFailSync',
	version: '1.0.0',
	description: 'Lazily constructs a typed failure when the Effect is evaluated.',
	typeParameters: typeParameters(['E', 'Expected error type.']),
	inputs: {
		error: callbackInput('Lazy expected-error constructor.', { ts: '() => {{E}}' })
	},
	output: expressionOutput('Effect produced by Effect.failSync.', effectType('never', '{{E}}', 'never')),
	source: `Effect.failSync(${marker('expression', 'error', '() => undefined')})`
})

export const EffectGenYieldErrorTemplate = defineTemplate({
	modelId: 'EffectGenYieldError',
	version: '1.0.0',
	description: 'Yields a Data.Error or Data.TaggedError directly inside Effect.gen, producing a typed failure.',
	typeParameters: typeParameters(['E', 'Yieldable expected error type.']),
	inputs: {
		error: valueInput('Yieldable Data.Error or Data.TaggedError instance.', { ts: '{{E}}' })
	},
	output: statementOutput('Terminal yield of a yieldable expected error.'),
	source: `return yield* ${marker('expression', 'error', 'Effect.fail(new Error("failure"))')};`
})

export const EffectResultTemplate = defineTemplate({
	modelId: 'EffectResult',
	version: '1.0.0',
	description: 'Moves typed failure or success into a Result value while preserving defects and interruptions.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput(
		'Infallible Effect of Result.',
		effectType(resultTs('{{A}}', '{{E}}'), 'never', '{{R}}')
	),
	source: `Effect.result(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectOptionTemplate = defineTemplate({
	modelId: 'EffectOption',
	version: '3.0.0',
	description: 'Maps success to Option.some and every typed failure to Option.none while preserving defects and interruptions.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', 'unknown', '{{R}}'))
	},
	output: expressionOutput(
		'Infallible Effect of Option.',
		effectType(optionTs('{{A}}'), 'never', '{{R}}')
	),
	source: `Effect.option(${marker('expression', 'source', 'Effect.void')})`
})

// Typed recovery --------------------------------------------------------------

export const EffectCatchTemplate = defineTemplate({
	modelId: 'EffectCatch',
	version: '1.0.0',
	description: 'Recovers from every typed failure with an Effect-producing handler; defects and interruptions are unchanged.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Recovery success type.'],
		['E2', 'Recovery expected error type.'],
		['R2', 'Recovery requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		handler: callbackInput(
			'Typed-error recovery handler.',
			effectReturningCallbackType('error: {{E}}', '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect recovered from every typed failure.',
		effectType('{{A}} | {{B}}', '{{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.catch(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const EffectCatchTagTemplate = defineTemplate({
	modelId: 'EffectCatchTag',
	version: '3.0.0',
	description: 'Recovers from one tagged expected-error case and preserves unmatched tagged errors.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source tagged error union.'],
		['R', 'Source requirements.'],
		['B', 'Recovery success type.'],
		['E2', 'Recovery expected error type.'],
		['R2', 'Recovery requirements.'],
		['EOut', 'Unmatched source error type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect with tagged errors.', effectType('{{A}}', '{{E}}', '{{R}}')),
		tag: stringInput('Unique _tag value to recover.'),
		handler: callbackInput(
			'Tagged-error recovery handler.',
			effectReturningCallbackType('error: {{E}}', '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect with the selected tagged error recovered.',
		effectType('{{A}} | {{B}}', '{{EOut}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.catchTag(${marker('expression', 'source', 'Effect.fail({ _tag: "Error" as const })')}, ${marker('string', 'tag', '"Error"')}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const EffectCatchTagsTemplate = defineTemplate({
	modelId: 'EffectCatchTags',
	version: '2.0.0',
	description: 'Recovers from several tagged expected errors with tag-specific handlers while preserving unmatched errors.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source tagged error union.'],
		['R', 'Source requirements.'],
		['B', 'Recovery success type.'],
		['E2', 'Recovery expected error type.'],
		['R2', 'Recovery requirements.'],
		['EOut', 'Unmatched source error type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect with tagged errors.', effectType('{{A}}', '{{E}}', '{{R}}')),
		handlers: valueInput('Record keyed by handled _tag values.')
	},
	output: expressionOutput(
		'Effect recovered by tagged handlers.',
		effectType('{{A}} | {{B}}', '{{EOut}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.catchTags(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'handlers', '{}')})`
})

export const EffectCatchIfTemplate = defineTemplate({
	modelId: 'EffectCatchIf',
	version: '2.0.0',
	description: 'Recovers from typed failures selected by a predicate or type guard.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Recovery success type.'],
		['E2', 'Recovery expected error type.'],
		['R2', 'Recovery requirements.'],
		['EOut', 'Unmatched source error type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		predicate: callbackInput('Error predicate or type guard.', { ts: '(error: {{E}}) => boolean' }),
		handler: callbackInput(
			'Effectful recovery handler.',
			effectReturningCallbackType('error: {{E}}', '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Conditionally recovered Effect.',
		effectType('{{A}} | {{B}}', '{{EOut}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.catchIf(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'predicate', '() => false')}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const EffectCatchFilterTemplate = defineTemplate({
	modelId: 'EffectCatchFilter',
	version: '1.0.0',
	description: 'Recovers from typed failures selected by a reusable Filter while preserving unmatched errors.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Recovery success type.'],
		['E2', 'Recovery expected error type.'],
		['R2', 'Recovery requirements.'],
		['EOut', 'Unmatched source error type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		filter: valueInput('Filter selecting errors to recover.'),
		handler: callbackInput(
			'Effectful recovery handler.',
			effectReturningCallbackType('error: {{E}}', '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect recovered for errors selected by the Filter.',
		effectType('{{A}} | {{B}}', '{{EOut}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.catchFilter(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'filter', 'Filter.tagged("Error")')}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const EffectCatchReasonTemplate = defineTemplate({
	modelId: 'EffectCatchReason',
	version: '1.0.0',
	description: 'Recovers from one tagged nested reason inside a tagged parent error.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source parent error type.'],
		['R', 'Source requirements.'],
		['Reason', 'Matched nested reason type.'],
		['B', 'Recovery success type.'],
		['E2', 'Recovery expected error type.'],
		['R2', 'Recovery requirements.'],
		['EOut', 'Unmatched source error type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect whose tagged error contains a readonly reason field.', effectType('{{A}}', '{{E}}', '{{R}}')),
		errorTag: stringInput('Parent error _tag.'),
		reasonTag: stringInput('Nested reason _tag.'),
		handler: callbackInput(
			'Nested-reason recovery handler.',
			effectReturningCallbackType('reason: {{Reason}}', '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect with the selected nested reason recovered.',
		effectType('{{A}} | {{B}}', '{{EOut}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.catchReason(${marker('expression', 'source', 'Effect.fail({ _tag: "ApiError" as const, reason: { _tag: "Reason" as const } })')}, ${marker('string', 'errorTag', '"ApiError"')}, ${marker('string', 'reasonTag', '"Reason"')}, ${marker('expression', 'handler', '() => Effect.void')})`
})

// Error-channel transformations ----------------------------------------------

export const EffectMapErrorTemplate = defineTemplate({
	modelId: 'EffectMapError',
	version: '3.0.0',
	description: 'Transforms a typed error while leaving the success value unchanged.',
	typeParameters: typeParameters(
		['A', 'Success type.'],
		['E', 'Source expected error type.'],
		['E2', 'Mapped expected error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		transform: callbackInput('Expected-error transformation.', { ts: '(error: {{E}}) => {{E2}}' })
	},
	output: expressionOutput('Effect with mapped typed errors.', effectType('{{A}}', '{{E2}}', '{{R}}')),
	source: `Effect.mapError(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'transform', 'error => error')})`
})

export const EffectMapBothTemplate = defineTemplate({
	modelId: 'EffectMapBoth',
	version: '1.0.0',
	description: 'Transforms both the typed failure and success channels with pure functions.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['B', 'Mapped success type.'],
		['E2', 'Mapped expected error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		onFailure: callbackInput('Typed-error mapping function.', { ts: '(error: {{E}}) => {{E2}}' }),
		onSuccess: callbackInput('Success mapping function.', { ts: '(value: {{A}}) => {{B}}' })
	},
	output: expressionOutput('Effect with both channels mapped.', effectType('{{B}}', '{{E2}}', '{{R}}')),
	source: `Effect.mapBoth(${marker('expression', 'source', 'Effect.void')}, { onFailure: ${marker('expression', 'onFailure', 'error => error')}, onSuccess: ${marker('expression', 'onSuccess', 'value => value')} })`
})

export const EffectFilterOrFailTemplate = defineTemplate({
	modelId: 'EffectFilterOrFail',
	version: '2.0.0',
	description: 'Keeps a successful value when a predicate holds or creates a typed failure when it does not.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['E2', 'Predicate failure type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		predicate: callbackInput('Success predicate.', { ts: '(value: {{A}}) => boolean' }),
		orFail: callbackInput('Lazy typed-error constructor.', { ts: '(value: {{A}}) => {{E2}}' })
	},
	output: expressionOutput('Filtered Effect.', effectType('{{A}}', '{{E}} | {{E2}}', '{{R}}')),
	source: `Effect.filterOrFail(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'predicate', '() => true')}, ${marker('expression', 'orFail', 'value => value')})`
})

export const EffectFilterOrFailNarrowTemplate = defineTemplate({
	modelId: 'EffectFilterOrFailNarrow',
	version: '1.0.0',
	description: 'Narrows the success channel with a user-defined type guard or creates a typed failure when the guard does not match.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['B', 'Narrowed success subtype.'],
		['E', 'Source expected error type.'],
		['E2', 'Predicate failure type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		predicate: callbackInput('Success type guard.', { ts: '(value: {{A}}) => value is {{B}}' }),
		orFail: callbackInput('Lazy typed-error constructor.', { ts: '(value: {{A}}) => {{E2}}' })
	},
	output: expressionOutput('Narrowed Effect.', effectType('{{B}}', '{{E}} | {{E2}}', '{{R}}')),
	source: `Effect.filterOrFail(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'predicate', 'value => true')}, ${marker('expression', 'orFail', 'value => value')})`
})

// Observing failures ----------------------------------------------------------

export const EffectTapErrorTemplate = defineTemplate({
	modelId: 'EffectTapError',
	version: '2.0.0',
	description: 'Observes every typed failure with an Effect while preserving the source outcome.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['E2', 'Observation expected error type.'],
		['R2', 'Observation requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		tap: callbackInput(
			'Typed-error observation callback.',
			effectReturningCallbackType('error: {{E}}', 'unknown', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect preserving the source result after typed-error observation.',
		effectType('{{A}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.tapError(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'tap', '() => Effect.void')})`
})

export const EffectTapErrorTagTemplate = defineTemplate({
	modelId: 'EffectTapErrorTag',
	version: '1.0.0',
	description: 'Observes one member of a tagged error union without recovering from it.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source tagged error union.'],
		['R', 'Source requirements.'],
		['E2', 'Observation expected error type.'],
		['R2', 'Observation requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect with tagged errors.', effectType('{{A}}', '{{E}}', '{{R}}')),
		tag: stringInput('Observed error _tag.'),
		tap: callbackInput(
			'Tagged-error observation callback.',
			effectReturningCallbackType('error: {{E}}', 'unknown', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect preserving the source result after tagged-error observation.',
		effectType('{{A}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.tapErrorTag(${marker('expression', 'source', 'Effect.fail({ _tag: "Error" as const })')}, ${marker('string', 'tag', '"Error"')}, ${marker('expression', 'tap', '() => Effect.void')})`
})

export const EffectTapCauseTemplate = defineTemplate({
	modelId: 'EffectTapCause',
	version: '1.0.0',
	description: 'Observes the complete failure Cause, including typed failures, defects, interruptions, and multiple reasons.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['E2', 'Observation expected error type.'],
		['R2', 'Observation requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		tap: callbackInput(
			'Cause observation callback.',
			effectReturningCallbackType(`cause: ${causeTs('{{E}}')}`, 'unknown', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect preserving the source result after Cause observation.',
		effectType('{{A}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.tapCause(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'tap', '() => Effect.void')})`
})

export const EffectTapDefectTemplate = defineTemplate({
	modelId: 'EffectTapDefect',
	version: '1.0.0',
	description: 'Observes defects only while leaving typed failures and interruptions unchanged.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['E2', 'Observation expected error type.'],
		['R2', 'Observation requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		tap: callbackInput(
			'Defect observation callback.',
			effectReturningCallbackType('defect: unknown', 'unknown', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect preserving the source result after defect observation.',
		effectType('{{A}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.tapDefect(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'tap', '() => Effect.void')})`
})

// Channel movement and fallback ----------------------------------------------

export const EffectFlipTemplate = defineTemplate({
	modelId: 'EffectFlip',
	version: '1.0.0',
	description: 'Swaps the typed failure and success channels.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Effect with success and typed-error channels swapped.', effectType('{{E}}', '{{A}}', '{{R}}')),
	source: `Effect.flip(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectOrElseSucceedTemplate = defineTemplate({
	modelId: 'EffectOrElseSucceed',
	version: '1.0.0',
	description: 'Replaces every typed failure with a lazily evaluated success value.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Fallback success type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		fallback: callbackInput('Lazy success fallback.', { ts: '() => {{B}}' })
	},
	output: expressionOutput(
		'Infallible Effect with a fallback success value.',
		effectType('{{A}} | {{B}}', 'never', '{{R}}')
	),
	source: `Effect.orElseSucceed(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'fallback', '() => undefined')})`
})

export const EffectFirstSuccessOfTemplate = defineTemplate({
	modelId: 'EffectFirstSuccessOf',
	version: '1.0.0',
	description: 'Runs alternatives sequentially and stops at the first success; if all fail, the last typed error is propagated.',
	typeParameters: typeParameters(
		['A', 'Alternative success type.'],
		['E', 'Alternative expected error type.'],
		['R', 'Alternative requirements.']
	),
	inputs: {
		effects: effectCollectionInput(
			'Non-empty alternatives in priority order.',
			effectType('{{A}}', '{{E}}', '{{R}}')
		)
	},
	output: expressionOutput('Effect of the first successful alternative.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.firstSuccessOf([${marker('expression', 'effects', 'Effect.void')}])`
})

// Matching --------------------------------------------------------------------

export const EffectMatchTemplate = defineTemplate({
	modelId: 'EffectMatch',
	version: '3.0.0',
	description: 'Consumes typed failure or success with pure handlers; defects and interruptions remain failures.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Failure handler result type.'],
		['C', 'Success handler result type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		onFailure: callbackInput('Pure typed-error handler.', { ts: '(error: {{E}}) => {{B}}' }),
		onSuccess: callbackInput('Pure success handler.', { ts: '(value: {{A}}) => {{C}}' })
	},
	output: expressionOutput('Infallible Effect of the matched result.', effectType('{{B}} | {{C}}', 'never', '{{R}}')),
	source: `Effect.match(${marker('expression', 'source', 'Effect.void')}, { onFailure: ${marker('expression', 'onFailure', 'error => error')}, onSuccess: ${marker('expression', 'onSuccess', 'value => value')} })`
})

export const EffectMatchEffectTemplate = defineTemplate({
	modelId: 'EffectMatchEffect',
	version: '3.0.0',
	description: 'Consumes typed failure or success with Effect-producing handlers.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Handler success type.'],
		['E2', 'Handler expected error type.'],
		['R2', 'Handler requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		onFailure: callbackInput(
			'Effectful typed-error handler.',
			effectReturningCallbackType('error: {{E}}', '{{B}}', '{{E2}}', '{{R2}}')
		),
		onSuccess: callbackInput(
			'Effectful success handler.',
			effectReturningCallbackType('value: {{A}}', '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput('Effect of the effectful matched result.', effectType('{{B}}', '{{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.matchEffect(${marker('expression', 'source', 'Effect.void')}, { onFailure: ${marker('expression', 'onFailure', '() => Effect.void')}, onSuccess: ${marker('expression', 'onSuccess', '() => Effect.void')} })`
})

export const EffectMatchCauseTemplate = defineTemplate({
	modelId: 'EffectMatchCause',
	version: '1.0.0',
	description: 'Consumes the complete failure Cause or success value with pure handlers.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Cause handler result type.'],
		['C', 'Success handler result type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		onFailure: callbackInput('Pure Cause handler.', { ts: `(cause: ${causeTs('{{E}}')}) => {{B}}` }),
		onSuccess: callbackInput('Pure success handler.', { ts: '(value: {{A}}) => {{C}}' })
	},
	output: expressionOutput('Infallible Effect of the Cause-aware match.', effectType('{{B}} | {{C}}', 'never', '{{R}}')),
	source: `Effect.matchCause(${marker('expression', 'source', 'Effect.void')}, { onFailure: ${marker('expression', 'onFailure', 'cause => cause')}, onSuccess: ${marker('expression', 'onSuccess', 'value => value')} })`
})

export const EffectMatchCauseEffectTemplate = defineTemplate({
	modelId: 'EffectMatchCauseEffect',
	version: '1.0.0',
	description: 'Consumes the complete failure Cause or success value with Effect-producing handlers.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Handler success type.'],
		['E2', 'Handler expected error type.'],
		['R2', 'Handler requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		onFailure: callbackInput(
			'Effectful Cause handler.',
			effectReturningCallbackType(`cause: ${causeTs('{{E}}')}`, '{{B}}', '{{E2}}', '{{R2}}')
		),
		onSuccess: callbackInput(
			'Effectful success handler.',
			effectReturningCallbackType('value: {{A}}', '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput('Effect of the Cause-aware effectful match.', effectType('{{B}}', '{{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.matchCauseEffect(${marker('expression', 'source', 'Effect.void')}, { onFailure: ${marker('expression', 'onFailure', '() => Effect.void')}, onSuccess: ${marker('expression', 'onSuccess', '() => Effect.void')} })`
})

export const EffectIgnoreTemplate = defineTemplate({
	modelId: 'EffectIgnore',
	version: '1.0.0',
	description: 'Discards the success value and recovers from typed failures while preserving defects and interruptions.',
	typeParameters: typeParameters(['R', 'Source requirements.']),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('unknown', 'unknown', '{{R}}'))
	},
	output: expressionOutput('Infallible void Effect for typed outcomes.', effectType('void', 'never', '{{R}}')),
	source: `Effect.ignore(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectIgnoreCauseTemplate = defineTemplate({
	modelId: 'EffectIgnoreCause',
	version: '1.0.0',
	description: 'Discards the success value and every failure Cause, including defects and interruptions.',
	typeParameters: typeParameters(['R', 'Source requirements.']),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('unknown', 'unknown', '{{R}}'))
	},
	output: expressionOutput('Infallible void Effect with all failure causes discarded.', effectType('void', 'never', '{{R}}')),
	source: `Effect.ignoreCause(${marker('expression', 'source', 'Effect.void')})`
})

// Error accumulation ----------------------------------------------------------

export const EffectValidateTemplate = defineTemplate({
	modelId: 'EffectValidate',
	version: '1.0.0',
	description: 'Evaluates every input with an Effectful validator and accumulates all typed errors when any validation fails.',
	typeParameters: typeParameters(
		['A', 'Input element type.'],
		['B', 'Validated success type.'],
		['E', 'Validation error type.'],
		['R', 'Validator requirements.']
	),
	inputs: {
		iterable: effectValueInput('Iterable input.', { ts: 'Iterable<{{A}}>' }),
		body: callbackInput(
			'Effectful validation callback.',
			effectReturningCallbackType('value: {{A}}, index: number', '{{B}}', '{{E}}', '{{R}}')
		)
	},
	output: expressionOutput(
		'Effect of all success values or a non-empty array of validation errors.',
		effectType('ReadonlyArray<{{B}}>', 'readonly [{{E}}, ...Array<{{E}}>]', '{{R}}')
	),
	source: `Effect.validate(${marker('expression', 'iterable', '[]')}, ${marker('expression', 'body', 'value => Effect.succeed(value)')})`
})

export const EffectPartitionTemplate = defineTemplate({
	modelId: 'EffectPartition',
	version: '1.0.0',
	description: 'Evaluates every input and returns both typed failures and successes without failing.',
	typeParameters: typeParameters(
		['A', 'Input element type.'],
		['B', 'Success type.'],
		['E', 'Failure type.'],
		['R', 'Callback requirements.']
	),
	inputs: {
		iterable: effectValueInput('Iterable input.', { ts: 'Iterable<{{A}}>' }),
		body: callbackInput(
			'Effectful partition callback.',
			effectReturningCallbackType('value: {{A}}, index: number', '{{B}}', '{{E}}', '{{R}}')
		)
	},
	output: expressionOutput(
		'Infallible Effect of [failures, successes].',
		effectType('readonly [ReadonlyArray<{{E}}>, ReadonlyArray<{{B}}>]', 'never', '{{R}}')
	),
	source: `Effect.partition(${marker('expression', 'iterable', '[]')}, ${marker('expression', 'body', 'value => Effect.succeed(value)')})`
})

// Retrying --------------------------------------------------------------------

export const EffectRetryTemplate = defineTemplate({
	modelId: 'EffectRetry',
	version: '3.0.0',
	description: 'Retries typed failures according to retry options or a Schedule; defects and interruptions are never retried.',
	typeParameters: typeParameters(
		['A', 'Success type.'],
		['E', 'Expected error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to retry.', effectType('{{A}}', '{{E}}', '{{R}}')),
		policy: effectValueInput('Retry options or Schedule expression.')
	},
	output: expressionOutput('Retried Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.retry(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'policy', '{ times: 1 }')})`
})

export const EffectRetryOrElseTemplate = defineTemplate({
	modelId: 'EffectRetryOrElse',
	version: '1.0.0',
	description: 'Retries with a Schedule and runs a fallback Effect after the schedule is exhausted.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['ScheduleOut', 'Schedule output type.'],
		['ScheduleR', 'Schedule requirements.'],
		['B', 'Fallback success type.'],
		['E2', 'Fallback expected error type.'],
		['R2', 'Fallback requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to retry.', effectType('{{A}}', '{{E}}', '{{R}}')),
		schedule: scheduleInput('Retry Schedule.', '{{ScheduleOut}}', '{{E}}', '{{ScheduleR}}'),
		orElse: callbackInput(
			'Fallback receiving the final error and Schedule output.',
			effectReturningCallbackType(
				'error: {{E}}, scheduleOutput: {{ScheduleOut}}',
				'{{B}}',
				'{{E2}}',
				'{{R2}}'
			)
		)
	},
	output: expressionOutput(
		'Retried Effect with an exhaustion fallback.',
		effectType('{{A}} | {{B}}', '{{E2}}', '{{R}} | {{ScheduleR}} | {{R2}}')
	),
	source: `Effect.retryOrElse(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'schedule', 'Schedule.recurs(1)')}, ${marker('expression', 'orElse', '() => Effect.void')})`
})

// Timeouts --------------------------------------------------------------------

export const EffectTimeoutTemplate = defineTemplate({
	modelId: 'EffectTimeout',
	version: '3.0.0',
	description: 'Interrupts the source when the duration expires and represents timeout as a typed Cause.TimeoutError.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to time out.', effectType('{{A}}', '{{E}}', '{{R}}')),
		duration: effectDurationInput('Maximum execution duration.')
	},
	output: expressionOutput(
		'Effect that may fail with TimeoutError.',
		effectType('{{A}}', `{{E}} | ${timeoutError}`, '{{R}}')
	),
	source: `Effect.timeout(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'duration', '0')})`
})

export const EffectTimeoutOptionTemplate = defineTemplate({
	modelId: 'EffectTimeoutOption',
	version: '2.0.0',
	description: 'Represents timeout as Option.none and timely success as Option.some while preserving ordinary typed failures.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to time out.', effectType('{{A}}', '{{E}}', '{{R}}')),
		duration: effectDurationInput('Maximum execution duration.')
	},
	output: expressionOutput(
		'Effect whose success channel represents timeout as Option.',
		effectType(optionTs('{{A}}'), '{{E}}', '{{R}}')
	),
	source: `Effect.timeoutOption(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'duration', '0')})`
})

export const EffectTimeoutOrElseTemplate = defineTemplate({
	modelId: 'EffectTimeoutOrElse',
	version: '1.0.0',
	description: 'Interrupts the source on timeout and lazily switches to a fallback Effect.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Fallback success type.'],
		['E2', 'Fallback expected error type.'],
		['R2', 'Fallback requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to time out.', effectType('{{A}}', '{{E}}', '{{R}}')),
		duration: effectDurationInput('Maximum execution duration.'),
		orElse: callbackInput(
			'Lazy timeout fallback.',
			effectReturningCallbackType('', '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect with a timeout fallback.',
		effectType('{{A}} | {{B}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.timeoutOrElse(${marker('expression', 'source', 'Effect.void')}, { duration: ${marker('expression', 'duration', '0')}, orElse: ${marker('expression', 'orElse', '() => Effect.void')} })`
})

// Unexpected errors and Cause -------------------------------------------------

export const EffectDieTemplate = defineTemplate({
	modelId: 'EffectDie',
	version: '1.0.0',
	description: 'Terminates with an unexpected defect that is retained in the runtime Cause and absent from the typed error channel.',
	inputs: {
		defect: valueInput('Defect value; prefer an Error with a useful message.')
	},
	output: expressionOutput('Effect terminated by a defect.', effectType('never', 'never', 'never')),
	source: `Effect.die(${marker('expression', 'defect', 'new Error("defect")')})`
})

export const EffectOrDieTemplate = defineTemplate({
	modelId: 'EffectOrDie',
	version: '2.0.0',
	description: 'Converts every typed failure into a defect and removes the typed error channel.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Expected error converted to a defect.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Effect with no typed error channel.', effectType('{{A}}', 'never', '{{R}}')),
	source: `Effect.orDie(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectExitTemplate = defineTemplate({
	modelId: 'EffectExit',
	version: '2.0.0',
	description: 'Moves the complete outcome into an Exit value, preserving the full Cause including defects and interruptions.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput(
		'Infallible Effect of Exit.',
		effectType(exitTs('{{A}}', '{{E}}'), 'never', '{{R}}')
	),
	source: `Effect.exit(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectCatchDefectTemplate = defineTemplate({
	modelId: 'EffectCatchDefect',
	version: '1.0.0',
	description: 'Handles defects only; typed failures and interruptions remain unchanged.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Recovery success type.'],
		['E2', 'Recovery expected error type.'],
		['R2', 'Recovery requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		handler: callbackInput(
			'Defect recovery handler.',
			effectReturningCallbackType('defect: unknown', '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect with defects conditionally recovered.',
		effectType('{{A}} | {{B}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.catchDefect(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'handler', 'defect => Effect.die(defect)')})`
})

export const EffectCatchCauseTemplate = defineTemplate({
	modelId: 'EffectCatchCause',
	version: '1.0.0',
	description: 'Handles the complete failure Cause, including typed failures, defects, interruptions, and multiple reasons.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['B', 'Recovery success type.'],
		['E2', 'Recovery expected error type.'],
		['R2', 'Recovery requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		handler: callbackInput(
			'Cause recovery handler.',
			effectReturningCallbackType(`cause: ${causeTs('{{E}}')}`, '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Effect with complete Causes handled.',
		effectType('{{A}} | {{B}}', '{{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.catchCause(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'handler', 'cause => Effect.failCause(cause)')})`
})

export const EffectSandboxTemplate = defineTemplate({
	modelId: 'EffectSandbox',
	version: '2.0.0',
	description: 'Exposes the complete failure Cause in the typed error channel.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput(
		'Sandboxed Effect.',
		effectType('{{A}}', causeTs('{{E}}'), '{{R}}')
	),
	source: `Effect.sandbox(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectFailCauseTemplate = defineTemplate({
	modelId: 'EffectFailCause',
	version: '1.0.0',
	description: 'Fails with an existing complete Cause, preserving typed failures, defects, interruptions, and multiple reasons.',
	typeParameters: typeParameters(['E', 'Typed failure carried by the Cause.']),
	inputs: {
		cause: typedExpressionInput('Failure Cause.', causeType('{{E}}'))
	},
	output: expressionOutput('Effect failed by the supplied Cause.', effectType('never', '{{E}}', 'never')),
	source: `Effect.failCause(${marker('expression', 'cause', 'Cause.fail(undefined)')})`
})

// Cause inspection ------------------------------------------------------------

/**
 * Cause predicates are owned canonically by `effect-cause-templates.ts`, which
 * also supplies `CauseHasInterruptsOnly`. These re-exports keep the historical
 * import surface stable while guaranteeing a single authoritative definition
 * per `modelId`; both modules therefore yield identical `manifestDigest`s.
 *
 * See `effect-v4-template-replacements.json` for the recorded lineage.
 */
export {
	CauseHasDiesTemplate,
	CauseHasFailsTemplate,
	CauseHasInterruptsTemplate
} from './effect-cause-templates.js'

/** Error-management templates owned by this module, excluding Cause predicates. */
export const effectErrorManagementGraphTemplateInputs = [
	EffectFailSyncTemplate,
	EffectGenYieldErrorTemplate,
	EffectResultTemplate,
	EffectOptionTemplate,
	EffectCatchTemplate,
	EffectCatchTagTemplate,
	EffectCatchTagsTemplate,
	EffectCatchIfTemplate,
	EffectCatchFilterTemplate,
	EffectCatchReasonTemplate,
	EffectMapErrorTemplate,
	EffectMapBothTemplate,
	EffectFilterOrFailTemplate,
	EffectFilterOrFailNarrowTemplate,
	EffectTapErrorTemplate,
	EffectTapErrorTagTemplate,
	EffectTapCauseTemplate,
	EffectTapDefectTemplate,
	EffectFlipTemplate,
	EffectOrElseSucceedTemplate,
	EffectFirstSuccessOfTemplate,
	EffectMatchTemplate,
	EffectMatchEffectTemplate,
	EffectMatchCauseTemplate,
	EffectMatchCauseEffectTemplate,
	EffectIgnoreTemplate,
	EffectIgnoreCauseTemplate,
	EffectValidateTemplate,
	EffectPartitionTemplate,
	EffectRetryTemplate,
	EffectRetryOrElseTemplate,
	EffectTimeoutTemplate,
	EffectTimeoutOptionTemplate,
	EffectTimeoutOrElseTemplate,
	EffectDieTemplate,
	EffectOrDieTemplate,
	EffectExitTemplate,
	EffectCatchDefectTemplate,
	EffectCatchCauseTemplate,
	EffectSandboxTemplate,
	EffectFailCauseTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]

/**
 * Historical curated-family aggregate. The canonical Effect v4 catalog uses
 * `effectErrorManagementGraphTemplateInputs` alongside the Cause pack so each
 * model ID has exactly one catalog owner.
 */
export const effectErrorGraphTemplateInputs = [
	...effectErrorManagementGraphTemplateInputs,
	CauseHasFailsTemplate,
	CauseHasDiesTemplate,
	CauseHasInterruptsTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
