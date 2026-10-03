import { defineTemplate } from './sample-definition.js'
import { effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import { causeType } from './effect-data-type-template-helpers.js'

const causeInput = (description: string, error = 'unknown') =>
	typedExpressionInput(description, causeType(error))

export const CauseEmptyTemplate = defineTemplate({
	modelId: 'CauseEmpty', version: '1.0.0', description: 'Returns the empty Cause.',
	inputs: {},
	output: expressionOutput('Empty Cause.', causeType('never')),
	source: 'Cause.empty'
})

export const CauseFailTemplate = defineTemplate({
	modelId: 'CauseFail', version: '1.0.0', description: 'Creates a Cause representing an expected failure.',
	typeParameters: typeParameters(['E', 'Expected error type.']),
	inputs: { error: effectValueInput('Expected error.', { ts: '{{E}}' }) },
	output: expressionOutput('Failure Cause.', causeType('{{E}}')),
	source: `Cause.fail(${marker('expression', 'error', 'undefined')})`
})

export const CauseDieTemplate = defineTemplate({
	modelId: 'CauseDie', version: '1.0.0', description: 'Creates a Cause representing an unexpected defect.',
	inputs: { defect: valueInput('Defect value.') },
	output: expressionOutput('Defect Cause.', causeType('never')),
	source: `Cause.die(${marker('expression', 'defect', 'undefined')})`
})

export const CauseInterruptTemplate = defineTemplate({
	modelId: 'CauseInterrupt', version: '1.0.0', description: 'Creates a Cause representing fiber interruption.',
	inputs: { fiberId: effectValueInput('Fiber identifier.', { ts: 'number' }) },
	output: expressionOutput('Interruption Cause.', causeType('never')),
	source: `Cause.interrupt(${marker('expression', 'fiberId', '0')})`
})

export const CauseCombineTemplate = defineTemplate({
	modelId: 'CauseCombine', version: '1.0.0', description: 'Combines two Causes while preserving their failure information.',
	typeParameters: typeParameters(['E1', 'Left expected error type.'], ['E2', 'Right expected error type.']),
	inputs: { left: causeInput('Left Cause.', '{{E1}}'), right: causeInput('Right Cause.', '{{E2}}') },
	output: expressionOutput('Combined Cause.', causeType('{{E1}} | {{E2}}')),
	source: `Cause.combine(${marker('expression', 'left', 'Cause.empty')}, ${marker('expression', 'right', 'Cause.empty')})`
})

const reasonGuard = (modelId: string, method: 'isFailReason' | 'isDieReason' | 'isInterruptReason') => defineTemplate({
	modelId, version: '1.0.0', description: `Checks a Cause reason with Cause.${method}.`,
	inputs: { reason: valueInput('Cause reason to inspect.') },
	output: expressionOutput('Reason guard result.', { ts: 'boolean' }),
	source: `Cause.${method}(${marker('expression', 'reason', '(undefined as never)')})`
})

export const CauseIsFailReasonTemplate = reasonGuard('CauseIsFailReason', 'isFailReason')
export const CauseIsDieReasonTemplate = reasonGuard('CauseIsDieReason', 'isDieReason')
export const CauseIsInterruptReasonTemplate = reasonGuard('CauseIsInterruptReason', 'isInterruptReason')

export const CausePrettyTemplate = defineTemplate({
	modelId: 'CausePretty', version: '1.0.0', description: 'Pretty prints a Cause including its failure information.',
	typeParameters: typeParameters(['E', 'Expected error type.']),
	inputs: { cause: causeInput('Cause to pretty print.', '{{E}}') },
	output: expressionOutput('Pretty-printed Cause.', { ts: 'string' }),
	source: `Cause.pretty(${marker('expression', 'cause', 'Cause.empty')})`
})

/**
 * Canonical Cause predicate definitions.
 *
 * These IDs were previously defined twice: once here and once in
 * `effect-error-management-v4-templates.ts`. This pack is the single
 * authoritative owner because it also provides `CauseHasInterruptsOnly`, which
 * the duplicate definitions could not offer.
 *
 * The `Cause.empty` fallback is deliberate: it is typed `Cause<never>`, which is
 * assignable to `Cause<E>` for every `E`, whereas `Cause.fail(undefined)` is
 * only assignable when `undefined` extends `E`.
 */
const causeHasDescriptions = {
	hasFails: 'Tests whether a Cause contains at least one typed Fail reason.',
	hasDies: 'Tests whether a Cause contains at least one defect Die reason.',
	hasInterrupts: 'Tests whether a Cause contains at least one Interrupt reason.',
	hasInterruptsOnly: 'Tests whether a Cause contains Interrupt reasons and no Fail or Die reasons.'
} as const

const causeHas = (
	modelId: string,
	method: keyof typeof causeHasDescriptions
) => defineTemplate({
	modelId, version: '1.0.0', description: causeHasDescriptions[method],
	typeParameters: typeParameters(['E', 'Cause typed failure type.']),
	inputs: { cause: causeInput('Cause to inspect.', '{{E}}') },
	output: expressionOutput(`Boolean result of Cause.${method}.`, { ts: 'boolean', schema: { type: 'boolean' } }),
	source: `Cause.${method}(${marker('expression', 'cause', 'Cause.empty')})`
})

export const CauseHasFailsTemplate = causeHas('CauseHasFails', 'hasFails')
export const CauseHasDiesTemplate = causeHas('CauseHasDies', 'hasDies')
export const CauseHasInterruptsTemplate = causeHas('CauseHasInterrupts', 'hasInterrupts')
export const CauseHasInterruptsOnlyTemplate = causeHas('CauseHasInterruptsOnly', 'hasInterruptsOnly')

export const effectCauseGraphTemplateInputs = [
	CauseEmptyTemplate,
	CauseFailTemplate,
	CauseDieTemplate,
	CauseInterruptTemplate,
	CauseCombineTemplate,
	CauseIsFailReasonTemplate,
	CauseIsDieReasonTemplate,
	CauseIsInterruptReasonTemplate,
	CausePrettyTemplate,
	CauseHasFailsTemplate,
	CauseHasDiesTemplate,
	CauseHasInterruptsTemplate,
	CauseHasInterruptsOnlyTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
