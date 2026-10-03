import { defineTemplate } from '../../../authoring/define-template.js'
import { effectValueInput } from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import {
	equivalenceType,
	redactedType
} from '../data/effect-data-type-template-helpers.js'

const redactedInput = (description: string, value = 'unknown') =>
	typedExpressionInput(description, redactedType(value))

export const RedactedMakeTemplate = defineTemplate({
	modelId: 'RedactedMake', version: '1.0.0', description: 'Wraps a sensitive value in Redacted so its string representation does not reveal the value.',
	typeParameters: typeParameters(['A', 'Sensitive value type.']),
	inputs: { value: effectValueInput('Sensitive value.', { ts: '{{A}}' }) },
	output: expressionOutput('Redacted value.', redactedType('{{A}}')),
	source: `Redacted.make(${marker('expression', 'value', 'undefined')})`
})

export const RedactedValueTemplate = defineTemplate({
	modelId: 'RedactedValue', version: '1.0.0', description: 'Explicitly reveals the underlying value of Redacted.',
	typeParameters: typeParameters(['A', 'Sensitive value type.']),
	inputs: { redacted: redactedInput('Redacted value to reveal.', '{{A}}') },
	output: expressionOutput('Underlying sensitive value.', { ts: '{{A}}' }),
	source: `Redacted.value(${marker('expression', 'redacted', 'Redacted.make(undefined)')})`
})

export const RedactedWipeUnsafeTemplate = defineTemplate({
	modelId: 'RedactedWipeUnsafe', version: '1.0.0', description: 'Erases the underlying value of a Redacted instance in place.',
	typeParameters: typeParameters(['A', 'Sensitive value type.']),
	inputs: { redacted: redactedInput('Redacted value to wipe.', '{{A}}') },
	output: expressionOutput('Wipe result.', { ts: 'void' }),
	source: `Redacted.wipeUnsafe(${marker('expression', 'redacted', 'Redacted.make(undefined)')})`
})

export const RedactedMakeEquivalenceTemplate = defineTemplate({
	modelId: 'RedactedMakeEquivalence', version: '1.0.0', description: 'Lifts an underlying Equivalence to Redacted values.',
	typeParameters: typeParameters(['A', 'Sensitive value type.']),
	inputs: { equivalence: typedExpressionInput('Underlying Equivalence.', equivalenceType('{{A}}')) },
	output: expressionOutput('Redacted Equivalence.', equivalenceType(redactedType('{{A}}').ts)),
	source: `Redacted.makeEquivalence(${marker('expression', 'equivalence', '(left, right) => left === right')})`
})

export const effectRedactedGraphTemplateInputs = [
	RedactedMakeTemplate,
	RedactedValueTemplate,
	RedactedWipeUnsafeTemplate,
	RedactedMakeEquivalenceTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
