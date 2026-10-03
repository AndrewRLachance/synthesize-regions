import { defineTemplate } from '../../../authoring/define-template.js'
import { effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import { causeType, exitType } from '../data/effect-data-type-template-helpers.js'

const exitInput = (description: string, success = 'unknown', error = 'unknown') =>
	typedExpressionInput(description, exitType(success, error))
const causeInput = (description: string, error = 'unknown') =>
	typedExpressionInput(description, causeType(error))

export const ExitSucceedTemplate = defineTemplate({
	modelId: 'ExitSucceed',
	version: '1.0.0',
	description: 'Creates a successful Exit value.',
	typeParameters: typeParameters(['A', 'Success value type.']),
	inputs: { value: effectValueInput('Success value.', { ts: '{{A}}' }) },
	output: expressionOutput('Successful Exit.', exitType('{{A}}', 'never')),
	source: `Exit.succeed(${marker('expression', 'value', 'undefined')})`
})

export const ExitFailCauseTemplate = defineTemplate({
	modelId: 'ExitFailCause',
	version: '1.0.0',
	description: 'Creates a failed Exit from a Cause.',
	typeParameters: typeParameters(['E', 'Failure error type.']),
	inputs: { cause: causeInput('Failure Cause.', '{{E}}') },
	output: expressionOutput('Failed Exit.', exitType('never', '{{E}}')),
	source: `Exit.failCause(${marker('expression', 'cause', 'Cause.empty')})`
})

export const ExitMatchTemplate = defineTemplate({
	modelId: 'ExitMatch',
	version: '1.0.0',
	description: 'Pattern matches an Exit by handling its failure Cause or success value.',
	typeParameters: typeParameters(
		['A', 'Exit success type.'],
		['E', 'Exit error type.'],
		['B', 'Failure handler result type.'],
		['C', 'Success handler result type.']
	),
	inputs: {
		exit: exitInput('Exit to match.', '{{A}}', '{{E}}'),
		onFailure: callbackInput('Failure handler.', { ts: `(cause: unknown) => {{B}}` }),
		onSuccess: callbackInput('Success handler.', { ts: `(value: {{A}}) => {{C}}` })
	},
	output: expressionOutput('Matched Exit result.', { ts: '{{B}} | {{C}}' }),
	source: `Exit.match(${marker('expression', 'exit', 'Exit.succeed(undefined)')}, { onFailure: ${marker('expression', 'onFailure', '() => undefined')}, onSuccess: ${marker('expression', 'onSuccess', 'value => value')} })`
})

export const effectExitGraphTemplateInputs = [
	ExitSucceedTemplate,
	ExitFailCauseTemplate,
	ExitMatchTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
