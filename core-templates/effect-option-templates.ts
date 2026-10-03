import { defineTemplate } from './sample-definition.js'
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
import {
	equivalenceType,
	optionType,
	orderType
} from './effect-data-type-template-helpers.js'

const optionInput = (description: string, value = 'unknown') =>
	typedExpressionInput(description, optionType(value))

export const OptionSomeTemplate = defineTemplate({
	modelId: 'OptionSome', version: '1.0.0', description: 'Creates a Some containing a value.',
	typeParameters: typeParameters(['A', 'Contained value type.']),
	inputs: { value: effectValueInput('Contained value.', { ts: '{{A}}' }) },
	output: expressionOutput('Present Option.', optionType('{{A}}')),
	source: `Option.some(${marker('expression', 'value', 'undefined')})`
})

export const OptionNoneTemplate = defineTemplate({
	modelId: 'OptionNone', version: '1.0.0', description: 'Creates an Option representing absence.',
	inputs: {},
	output: expressionOutput('Empty Option.', optionType('never')),
	source: 'Option.none()'
})

export const OptionLiftPredicateTemplate = defineTemplate({
	modelId: 'OptionLiftPredicate', version: '1.0.0', description: 'Applies an Option-producing predicate lifted with Option.liftPredicate.',
	typeParameters: typeParameters(['A', 'Input and contained value type.']),
	inputs: {
		value: effectValueInput('Value to test.', { ts: '{{A}}' }),
		predicate: callbackInput('Predicate deciding whether the value is present.', { ts: '(value: {{A}}) => boolean' })
	},
	output: expressionOutput('Option containing the value when the predicate succeeds.', optionType('{{A}}')),
	source: `Option.liftPredicate(${marker('expression', 'predicate', '() => true')})(${marker('expression', 'value', 'undefined')})`
})

const optionGuard = (modelId: string, method: 'isSome' | 'isNone') => defineTemplate({
	modelId, version: '1.0.0', description: `Checks an Option with Option.${method}.`,
	typeParameters: typeParameters(['A', 'Contained value type.']),
	inputs: { option: optionInput('Option to inspect.', '{{A}}') },
	output: expressionOutput('Guard result.', { ts: 'boolean' }),
	source: `Option.${method}(${marker('expression', 'option', 'Option.none()')})`
})

export const OptionIsSomeTemplate = optionGuard('OptionIsSome', 'isSome')
export const OptionIsNoneTemplate = optionGuard('OptionIsNone', 'isNone')

export const OptionMatchTemplate = defineTemplate({
	modelId: 'OptionMatch', version: '1.0.0', description: 'Pattern matches an Option with onNone and onSome handlers.',
	typeParameters: typeParameters(['A', 'Contained value type.'], ['B', 'None result type.'], ['C', 'Some result type.']),
	inputs: {
		option: optionInput('Option to match.', '{{A}}'),
		onNone: callbackInput('Handler for None.', { ts: '() => {{B}}' }),
		onSome: callbackInput('Handler for Some.', { ts: '(value: {{A}}) => {{C}}' })
	},
	output: expressionOutput('Match result.', { ts: '{{B}} | {{C}}' }),
	source: `Option.match(${marker('expression', 'option', 'Option.none()')}, { onNone: ${marker('expression', 'onNone', '() => undefined')}, onSome: ${marker('expression', 'onSome', 'value => value')} })`
})

export const OptionMapTemplate = defineTemplate({
	modelId: 'OptionMap', version: '1.0.0', description: 'Maps the value inside Some while preserving None.',
	typeParameters: typeParameters(['A', 'Input value type.'], ['B', 'Mapped value type.']),
	inputs: { option: optionInput('Source Option.', '{{A}}'), transform: callbackInput('Some-value transform.', { ts: '(value: {{A}}) => {{B}}' }) },
	output: expressionOutput('Mapped Option.', optionType('{{B}}')),
	source: `Option.map(${marker('expression', 'option', 'Option.none()')}, ${marker('expression', 'transform', 'value => value')})`
})

export const OptionFlatMapTemplate = defineTemplate({
	modelId: 'OptionFlatMap', version: '1.0.0', description: 'Sequences an Option-producing transform.',
	typeParameters: typeParameters(['A', 'Input value type.'], ['B', 'Output value type.']),
	inputs: { option: optionInput('Source Option.', '{{A}}'), transform: callbackInput('Some-value transform returning Option.', { ts: `(value: {{A}}) => ${optionType('{{B}}').ts}` }) },
	output: expressionOutput('Sequenced Option.', optionType('{{B}}')),
	source: `Option.flatMap(${marker('expression', 'option', 'Option.none()')}, ${marker('expression', 'transform', 'value => Option.some(value)')})`
})

export const OptionFilterTemplate = defineTemplate({
	modelId: 'OptionFilter', version: '1.0.0', description: 'Keeps a Some value only when it satisfies a predicate.',
	typeParameters: typeParameters(['A', 'Contained value type.']),
	inputs: { option: optionInput('Source Option.', '{{A}}'), predicate: callbackInput('Some-value predicate.', { ts: '(value: {{A}}) => boolean' }) },
	output: expressionOutput('Filtered Option.', optionType('{{A}}')),
	source: `Option.filter(${marker('expression', 'option', 'Option.none()')}, ${marker('expression', 'predicate', '() => true')})`
})

export const OptionGetOrThrowTemplate = defineTemplate({
	modelId: 'OptionGetOrThrow', version: '1.0.0', description: 'Extracts a Some value and throws for None.',
	typeParameters: typeParameters(['A', 'Contained value type.']),
	inputs: { option: optionInput('Option to unwrap.', '{{A}}') },
	output: expressionOutput('Contained value.', { ts: '{{A}}' }),
	source: `Option.getOrThrow(${marker('expression', 'option', 'Option.none()')})`
})

export const OptionGetOrNullTemplate = defineTemplate({
	modelId: 'OptionGetOrNull', version: '1.0.0', description: 'Converts an Option to its value or null.',
	typeParameters: typeParameters(['A', 'Contained value type.']),
	inputs: { option: optionInput('Option to convert.', '{{A}}') },
	output: expressionOutput('Nullable value.', { ts: '{{A}} | null' }),
	source: `Option.getOrNull(${marker('expression', 'option', 'Option.none()')})`
})

export const OptionGetOrUndefinedTemplate = defineTemplate({
	modelId: 'OptionGetOrUndefined', version: '1.0.0', description: 'Converts an Option to its value or undefined.',
	typeParameters: typeParameters(['A', 'Contained value type.']),
	inputs: { option: optionInput('Option to convert.', '{{A}}') },
	output: expressionOutput('Possibly undefined value.', { ts: '{{A}} | undefined' }),
	source: `Option.getOrUndefined(${marker('expression', 'option', 'Option.none()')})`
})

export const OptionGetOrElseTemplate = defineTemplate({
	modelId: 'OptionGetOrElse', version: '1.0.0', description: 'Extracts a Some value or evaluates a fallback for None.',
	typeParameters: typeParameters(['A', 'Contained value type.'], ['B', 'Fallback value type.']),
	inputs: { option: optionInput('Option to unwrap.', '{{A}}'), onNone: callbackInput('Lazy fallback.', { ts: '() => {{B}}' }) },
	output: expressionOutput('Contained or fallback value.', { ts: '{{A}} | {{B}}' }),
	source: `Option.getOrElse(${marker('expression', 'option', 'Option.none()')}, ${marker('expression', 'onNone', '() => undefined')})`
})

export const OptionOrElseTemplate = defineTemplate({
	modelId: 'OptionOrElse', version: '1.0.0', description: 'Uses a fallback Option when the source is None.',
	typeParameters: typeParameters(['A', 'Source value type.'], ['B', 'Fallback value type.']),
	inputs: { option: optionInput('Source Option.', '{{A}}'), fallback: callbackInput('Lazy fallback Option.', { ts: `() => ${optionType('{{B}}').ts}` }) },
	output: expressionOutput('Source or fallback Option.', optionType('{{A}} | {{B}}')),
	source: `Option.orElse(${marker('expression', 'option', 'Option.none()')}, ${marker('expression', 'fallback', '() => Option.none()')})`
})

export const OptionFirstSomeOfTemplate = defineTemplate({
	modelId: 'OptionFirstSomeOf', version: '1.0.0', description: 'Returns the first Some from an iterable of Options.',
	typeParameters: typeParameters(['A', 'Contained value type.']),
	inputs: { options: valueInput('Iterable of Options.', { ts: `Iterable<${optionType('{{A}}').ts}>` }) },
	output: expressionOutput('First present Option.', optionType('{{A}}')),
	source: `Option.firstSomeOf(${marker('expression', 'options', '[]')})`
})

export const OptionFromNullishOrTemplate = defineTemplate({
	modelId: 'OptionFromNullishOr', version: '1.0.0', description: 'Converts null or undefined to None and other values to Some.',
	typeParameters: typeParameters(['A', 'Non-nullish value type.']),
	inputs: { value: effectValueInput('Possibly nullish value.', { ts: '{{A}} | null | undefined' }) },
	output: expressionOutput('Option from nullable input.', optionType('{{A}}')),
	source: `Option.fromNullishOr(${marker('expression', 'value', 'undefined')})`
})

export const OptionZipWithTemplate = defineTemplate({
	modelId: 'OptionZipWith', version: '1.0.0', description: 'Combines two Options using a function when both are Some.',
	typeParameters: typeParameters(['A', 'Left value type.'], ['B', 'Right value type.'], ['C', 'Combined value type.']),
	inputs: {
		left: optionInput('Left Option.', '{{A}}'),
		right: optionInput('Right Option.', '{{B}}'),
		combine: callbackInput('Combiner.', { ts: '(left: {{A}}, right: {{B}}) => {{C}}' })
	},
	output: expressionOutput('Combined Option.', optionType('{{C}}')),
	source: `Option.zipWith(${marker('expression', 'left', 'Option.none()')}, ${marker('expression', 'right', 'Option.none()')}, ${marker('expression', 'combine', '(left) => left')})`
})

export const OptionAllTemplate = defineTemplate({
	modelId: 'OptionAll', version: '1.0.0', description: 'Combines a tuple, iterable, or record of Options while preserving its shape.',
	typeParameters: typeParameters(['A', 'Combined success shape.']),
	inputs: { options: valueInput('Tuple, iterable, or record containing Options.') },
	output: expressionOutput('Combined Option.', optionType('{{A}}')),
	source: `Option.all(${marker('expression', 'options', '[]')})`
})

export const OptionGenTemplate = defineTemplate({
	modelId: 'OptionGen', version: '1.0.0', description: 'Builds sequential Option control flow with generator notation.',
	typeParameters: typeParameters(['A', 'Generator return type.']),
	inputs: { body: callbackInput('Generator callback yielding Options.') },
	output: expressionOutput('Generated Option.', optionType('{{A}}')),
	source: `Option.gen(${marker('expression', 'body', 'function* () { return undefined }')})`
})

export const OptionMakeEquivalenceTemplate = defineTemplate({
	modelId: 'OptionMakeEquivalence', version: '1.0.0', description: 'Lifts an element Equivalence to Options.',
	typeParameters: typeParameters(['A', 'Contained value type.']),
	inputs: { equivalence: typedExpressionInput('Element Equivalence.', equivalenceType('{{A}}')) },
	output: expressionOutput('Option Equivalence.', equivalenceType(optionType('{{A}}').ts)),
	source: `Option.makeEquivalence(${marker('expression', 'equivalence', '(left, right) => left === right')})`
})

export const OptionMakeOrderTemplate = defineTemplate({
	modelId: 'OptionMakeOrder', version: '1.0.0', description: 'Lifts an element Order to Options.',
	typeParameters: typeParameters(['A', 'Contained value type.']),
	inputs: { order: typedExpressionInput('Element Order.', orderType('{{A}}')) },
	output: expressionOutput('Option Order.', orderType(optionType('{{A}}').ts)),
	source: `Option.makeOrder(${marker('expression', 'order', '(left, right) => 0')})`
})

export const EffectFromOptionTemplate = defineTemplate({
	modelId: 'EffectFromOption', version: '1.0.0', description: 'Converts an Option to an Effect, failing when the Option is None.',
	typeParameters: typeParameters(['A', 'Option value type.']),
	inputs: { option: optionInput('Option to convert.', '{{A}}') },
	output: expressionOutput('Effect converted from Option.', effectType('{{A}}', 'unknown', 'never')),
	source: `Effect.fromOption(${marker('expression', 'option', 'Option.none()')})`
})

export const effectOptionGraphTemplateInputs = [
	OptionSomeTemplate,
	OptionNoneTemplate,
	OptionLiftPredicateTemplate,
	OptionIsSomeTemplate,
	OptionIsNoneTemplate,
	OptionMatchTemplate,
	OptionMapTemplate,
	OptionFlatMapTemplate,
	OptionFilterTemplate,
	OptionGetOrThrowTemplate,
	OptionGetOrNullTemplate,
	OptionGetOrUndefinedTemplate,
	OptionGetOrElseTemplate,
	OptionOrElseTemplate,
	OptionFirstSomeOfTemplate,
	OptionFromNullishOrTemplate,
	OptionZipWithTemplate,
	OptionAllTemplate,
	OptionGenTemplate,
	OptionMakeEquivalenceTemplate,
	OptionMakeOrderTemplate,
	EffectFromOptionTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
