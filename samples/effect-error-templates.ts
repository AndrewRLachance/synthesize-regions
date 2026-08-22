import { defineTemplate } from '../src/templates.js'
import { effectSourceInput, effectType } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	marker,
	nominalType,
	typeParameters,
	valueInput
} from './effect-template-helpers.js'

export const EffectCatchTagsTemplate = defineTemplate({
	modelId: 'EffectCatchTags', version: '1.0.0', description: 'Recovers from several tagged expected errors with a handler record.',
	typeParameters: typeParameters(['A', 'Source success type.'], ['E', 'Tagged source error union.'], ['R', 'Source requirements.'], ['B', 'Recovery success type.'], ['E2', 'Recovery error type.'], ['R2', 'Recovery requirements.'], ['EOut', 'Unrecovered error type.']),
	inputs: { source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')), handlers: valueInput('Record keyed by handled _tag values.') },
	output: expressionOutput('Effect recovered by tagged handlers.', effectType('{{A}} | {{B}}', '{{EOut}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.catchTags(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'handlers', '{}')})`
})

export const EffectCatchIfTemplate = defineTemplate({
	modelId: 'EffectCatchIf', version: '1.0.0', description: 'Recovers from expected errors selected by a predicate.',
	typeParameters: typeParameters(['A', 'Source success type.'], ['E', 'Source error type.'], ['R', 'Source requirements.'], ['B', 'Recovery success type.'], ['E2', 'Recovery error type.'], ['R2', 'Recovery requirements.'], ['EOut', 'Unrecovered error type.']),
	inputs: { source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')), predicate: callbackInput('Error predicate.', { ts: '(error: {{E}}) => boolean' }), handler: callbackInput('Effectful recovery handler.', effectReturningCallbackType('error: {{E}}', '{{B}}', '{{E2}}', '{{R2}}')) },
	output: expressionOutput('Conditionally recovered Effect.', effectType('{{A}} | {{B}}', '{{EOut}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.catchIf(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'predicate', '() => false')}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const EffectFilterOrFailTemplate = defineTemplate({
	modelId: 'EffectFilterOrFail', version: '1.0.0', description: 'Keeps successful values matching a predicate or fails with a supplied error.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Source error type.'], ['E2', 'Filter error type.'], ['R', 'Requirements.']),
	inputs: { source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')), predicate: callbackInput('Success predicate.', { ts: '(value: {{A}}) => boolean' }), orFail: callbackInput('Lazy error constructor.', { ts: '(value: {{A}}) => {{E2}}' }) },
	output: expressionOutput('Filtered Effect.', effectType('{{A}}', '{{E}} | {{E2}}', '{{R}}')),
	source: `Effect.filterOrFail(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'predicate', '() => true')}, ${marker('expression', 'orFail', 'value => value')})`
})

const tapErrorTemplate = (modelId: 'EffectTapError' | 'EffectTapErrorCause', method: 'tapError' | 'tapErrorCause', cause: boolean) => defineTemplate({
	modelId, version: '1.0.0', description: `Runs an Effect when ${cause ? 'the failure Cause' : 'an expected error'} is observed, preserving the source result.`,
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Source error type.'], ['R', 'Source requirements.'], ['E2', 'Tap error type.'], ['R2', 'Tap requirements.']),
	inputs: { source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')), tap: callbackInput(cause ? 'Cause callback returning an Effect.' : 'Error callback returning an Effect.', effectReturningCallbackType(cause ? 'cause: unknown' : 'error: {{E}}', 'unknown', '{{E2}}', '{{R2}}')) },
	output: expressionOutput(`Effect produced by Effect.${method}.`, effectType('{{A}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.${method}(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'tap', '() => Effect.void')})`
})

export const EffectTapErrorTemplate = tapErrorTemplate('EffectTapError', 'tapError', false)
export const EffectTapErrorCauseTemplate = tapErrorTemplate('EffectTapErrorCause', 'tapErrorCause', true)

export const EffectExitTemplate = defineTemplate({
	modelId: 'EffectExit', version: '1.0.0', description: 'Moves success or failure into an Exit value in the success channel.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Infallible Effect of Exit.', effectType('unknown', 'never', '{{R}}')),
	source: `Effect.exit(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectSandboxTemplate = defineTemplate({
	modelId: 'EffectSandbox', version: '1.0.0', description: 'Exposes the full failure Cause in the expected-error channel.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Expected error type.'], ['R', 'Requirements.']),
	inputs: { source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Sandboxed Effect.', effectType('{{A}}', 'unknown', '{{R}}')),
	source: `Effect.sandbox(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectOrDieTemplate = defineTemplate({
	modelId: 'EffectOrDie', version: '1.0.0', description: 'Converts expected errors into defects.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Expected error converted to a defect.'], ['R', 'Requirements.']),
	inputs: { source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Effect with no expected-error channel.', effectType('{{A}}', 'never', '{{R}}')),
	source: `Effect.orDie(${marker('expression', 'source', 'Effect.void')})`
})

export const effectErrorGraphTemplateInputs = [
	EffectCatchTagsTemplate, EffectCatchIfTemplate, EffectFilterOrFailTemplate, EffectTapErrorTemplate,
	EffectTapErrorCauseTemplate, EffectExitTemplate, EffectSandboxTemplate, EffectOrDieTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
