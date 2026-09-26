import { defineTemplate } from '../src/templates.js'
import { effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import { resultType } from './effect-data-type-template-helpers.js'

const resultInput = (description: string, success = 'unknown', failure = 'unknown') =>
	typedExpressionInput(description, resultType(success, failure))

export const ResultSucceedTemplate = defineTemplate({
	modelId: 'ResultSucceed', version: '1.0.0', description: 'Creates a successful Result.',
	typeParameters: typeParameters(['A', 'Success value type.']),
	inputs: { value: effectValueInput('Success value.', { ts: '{{A}}' }) },
	output: expressionOutput('Successful Result.', resultType('{{A}}', 'never')),
	source: `Result.succeed(${marker('expression', 'value', 'undefined')})`
})

export const ResultFailTemplate = defineTemplate({
	modelId: 'ResultFail', version: '1.0.0', description: 'Creates a failed Result.',
	typeParameters: typeParameters(['E', 'Failure value type.']),
	inputs: { error: effectValueInput('Failure value.', { ts: '{{E}}' }) },
	output: expressionOutput('Failed Result.', resultType('never', '{{E}}')),
	source: `Result.fail(${marker('expression', 'error', 'undefined')})`
})

const resultGuard = (modelId: string, method: 'isSuccess' | 'isFailure') => defineTemplate({
	modelId, version: '1.0.0', description: `Checks a Result with Result.${method}.`,
	typeParameters: typeParameters(['A', 'Success value type.'], ['E', 'Failure value type.']),
	inputs: { result: resultInput('Result to inspect.', '{{A}}', '{{E}}') },
	output: expressionOutput('Guard result.', { ts: 'boolean' }),
	source: `Result.${method}(${marker('expression', 'result', 'Result.succeed(undefined)')})`
})

export const ResultIsSuccessTemplate = resultGuard('ResultIsSuccess', 'isSuccess')
export const ResultIsFailureTemplate = resultGuard('ResultIsFailure', 'isFailure')

export const ResultMatchTemplate = defineTemplate({
	modelId: 'ResultMatch', version: '1.0.0', description: 'Pattern matches a Result with failure and success handlers.',
	typeParameters: typeParameters(['A', 'Success value type.'], ['E', 'Failure value type.'], ['B', 'Failure handler result type.'], ['C', 'Success handler result type.']),
	inputs: {
		result: resultInput('Result to match.', '{{A}}', '{{E}}'),
		onFailure: callbackInput('Failure handler.', { ts: '(failure: {{E}}) => {{B}}' }),
		onSuccess: callbackInput('Success handler.', { ts: '(success: {{A}}) => {{C}}' })
	},
	output: expressionOutput('Matched value.', { ts: '{{B}} | {{C}}' }),
	source: `Result.match(${marker('expression', 'result', 'Result.succeed(undefined)')}, { onFailure: ${marker('expression', 'onFailure', 'failure => failure')}, onSuccess: ${marker('expression', 'onSuccess', 'success => success')} })`
})

export const ResultMapTemplate = defineTemplate({
	modelId: 'ResultMap', version: '1.0.0', description: 'Maps the success value of a Result.',
	typeParameters: typeParameters(['A', 'Input success type.'], ['E', 'Failure type.'], ['B', 'Mapped success type.']),
	inputs: { result: resultInput('Source Result.', '{{A}}', '{{E}}'), transform: callbackInput('Success transform.', { ts: '(value: {{A}}) => {{B}}' }) },
	output: expressionOutput('Mapped Result.', resultType('{{B}}', '{{E}}')),
	source: `Result.map(${marker('expression', 'result', 'Result.succeed(undefined)')}, ${marker('expression', 'transform', 'value => value')})`
})

export const ResultMapErrorTemplate = defineTemplate({
	modelId: 'ResultMapError', version: '1.0.0', description: 'Maps the failure value of a Result.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Input failure type.'], ['E2', 'Mapped failure type.']),
	inputs: { result: resultInput('Source Result.', '{{A}}', '{{E}}'), transform: callbackInput('Failure transform.', { ts: '(error: {{E}}) => {{E2}}' }) },
	output: expressionOutput('Error-mapped Result.', resultType('{{A}}', '{{E2}}')),
	source: `Result.mapError(${marker('expression', 'result', 'Result.fail(undefined)')}, ${marker('expression', 'transform', 'error => error')})`
})

export const ResultMapBothTemplate = defineTemplate({
	modelId: 'ResultMapBoth', version: '1.0.0', description: 'Maps both failure and success values of a Result.',
	typeParameters: typeParameters(['A', 'Input success type.'], ['E', 'Input failure type.'], ['B', 'Mapped success type.'], ['E2', 'Mapped failure type.']),
	inputs: {
		result: resultInput('Source Result.', '{{A}}', '{{E}}'),
		onFailure: callbackInput('Failure transform.', { ts: '(failure: {{E}}) => {{E2}}' }),
		onSuccess: callbackInput('Success transform.', { ts: '(success: {{A}}) => {{B}}' })
	},
	output: expressionOutput('Mapped Result.', resultType('{{B}}', '{{E2}}')),
	source: `Result.mapBoth(${marker('expression', 'result', 'Result.succeed(undefined)')}, { onFailure: ${marker('expression', 'onFailure', 'failure => failure')}, onSuccess: ${marker('expression', 'onSuccess', 'success => success')} })`
})

export const ResultFlatMapTemplate = defineTemplate({
	modelId: 'ResultFlatMap', version: '1.0.0', description: 'Sequences a Result-producing transform.',
	typeParameters: typeParameters(['A', 'Input success type.'], ['E', 'Source failure type.'], ['B', 'Output success type.'], ['E2', 'Transform failure type.']),
	inputs: { result: resultInput('Source Result.', '{{A}}', '{{E}}'), transform: callbackInput('Success transform returning Result.') },
	output: expressionOutput('Sequenced Result.', resultType('{{B}}', '{{E}} | {{E2}}')),
	source: `Result.flatMap(${marker('expression', 'result', 'Result.succeed(undefined)')}, ${marker('expression', 'transform', 'value => Result.succeed(value)')})`
})

export const ResultAllTemplate = defineTemplate({
	modelId: 'ResultAll', version: '1.0.0', description: 'Combines a tuple, iterable, or record of Results while preserving its shape and the first failure.',
	typeParameters: typeParameters(['A', 'Combined success shape.'], ['E', 'Failure type.']),
	inputs: { results: valueInput('Tuple, iterable, or record containing Results.') },
	output: expressionOutput('Combined Result.', resultType('{{A}}', '{{E}}')),
	source: `Result.all(${marker('expression', 'results', '[]')})`
})

export const ResultGenTemplate = defineTemplate({
	modelId: 'ResultGen', version: '1.0.0', description: 'Builds sequential Result control flow with generator notation.',
	typeParameters: typeParameters(['A', 'Generator return type.'], ['E', 'Failure type.']),
	inputs: { body: callbackInput('Generator callback yielding Results.') },
	output: expressionOutput('Generated Result.', resultType('{{A}}', '{{E}}')),
	source: `Result.gen(${marker('expression', 'body', 'function* () { return undefined }')})`
})

export const EffectFromResultTemplate = defineTemplate({
	modelId: 'EffectFromResult', version: '1.0.0', description: 'Converts a Result to an Effect preserving its success and failure values.',
	typeParameters: typeParameters(['A', 'Result success type.'], ['E', 'Result failure type.']),
	inputs: { result: resultInput('Result to convert.', '{{A}}', '{{E}}') },
	output: expressionOutput('Effect converted from Result.', effectType('{{A}}', '{{E}}', 'never')),
	source: `Effect.fromResult(${marker('expression', 'result', 'Result.succeed(undefined)')})`
})

export const effectResultGraphTemplateInputs = [
	ResultSucceedTemplate,
	ResultFailTemplate,
	ResultIsSuccessTemplate,
	ResultIsFailureTemplate,
	ResultMatchTemplate,
	ResultMapTemplate,
	ResultMapErrorTemplate,
	ResultMapBothTemplate,
	ResultFlatMapTemplate,
	ResultAllTemplate,
	ResultGenTemplate,
	EffectFromResultTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
