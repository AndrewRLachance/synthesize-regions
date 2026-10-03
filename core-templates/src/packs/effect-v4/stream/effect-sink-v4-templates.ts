import {
	defineTemplate,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from 'synthesize-regions'
import type { TypeDescriptor } from 'synthesize-regions'
import {
	effectExpressionPolicy,
	effectSourceInput,
	effectType,
	effectValueInput
} from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	marker,
	typeParameters,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import { durationType, optionType } from '../data/effect-data-type-template-helpers.js'
import { pubSubInput, sinkInput, sinkType } from './effect-stream-sink-template-helpers.js'

/**
 * Effect v4 Sink graph templates.
 *
 * Runtime contract:
 *   import { Effect, Sink } from 'effect'
 */
const VERSION = '2.0.0' as const

const numericInput = (
	description: string,
	schema: Readonly<Record<string, unknown>>,
	type: TypeDescriptor = { ts: 'number' }
) => unionPort({
	options: [
		literalPort({ regionKind: 'expression', schema, description }),
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type }, description }),
		rawCodePort({ regionKind: 'expression', policy: effectExpressionPolicy, type, description })
	],
	description
})

const nonNegativeIntegerInput = (description: string) => numericInput(description, {
	type: 'integer', minimum: 0
})

export const SinkHeadTemplate = defineTemplate({
	modelId: 'SinkHead', version: VERSION, description: 'Consumes at most one element and returns the first element as an Option.',
	typeParameters: typeParameters(['A', 'Input element type.']),
	inputs: {},
	output: expressionOutput('Head Sink.', sinkType(optionType('{{A}}').ts, '{{A}}', '{{A}}')),
	source: 'Sink.head()'
})

export const SinkLastTemplate = defineTemplate({
	modelId: 'SinkLast', version: VERSION, description: 'Consumes the input and returns the final element as an Option.',
	typeParameters: typeParameters(['A', 'Input element type.']),
	inputs: {},
	output: expressionOutput('Last-element Sink.', sinkType(optionType('{{A}}').ts, '{{A}}')),
	source: 'Sink.last()'
})

export const SinkCountTemplate = defineTemplate({
	modelId: 'SinkCount', version: VERSION, description: 'Consumes all input elements and returns their count.',
	inputs: {},
	output: expressionOutput('Counting Sink.', sinkType('number', 'unknown')),
	source: 'Sink.count'
})

export const SinkSumTemplate = defineTemplate({
	modelId: 'SinkSum', version: VERSION, description: 'Consumes numeric input elements and returns their sum.',
	inputs: {},
	output: expressionOutput('Numeric summing Sink.', sinkType('number', 'number')),
	source: 'Sink.sum'
})

export const SinkCollectTemplate = defineTemplate({
	modelId: 'SinkCollect', version: VERSION, description: 'Consumes all input elements into an Array.',
	typeParameters: typeParameters(['A', 'Input element type.']),
	inputs: {},
	output: expressionOutput('Collecting Sink.', sinkType('Array<{{A}}>', '{{A}}')),
	source: 'Sink.collect()'
})

export const SinkTakeTemplate = defineTemplate({
	modelId: 'SinkTake', version: VERSION, description: 'Consumes up to N elements and returns them as an Array, leaving unconsumed input available to transduction.',
	typeParameters: typeParameters(['A', 'Input element type.']),
	inputs: { count: nonNegativeIntegerInput('Maximum number of elements to consume.') },
	output: expressionOutput('Bounded take Sink.', sinkType('Array<{{A}}>', '{{A}}', '{{A}}')),
	source: `Sink.take(${marker('expression', 'count', '1')})`
})

export const SinkDrainTemplate = defineTemplate({
	modelId: 'SinkDrain', version: VERSION, description: 'Consumes and discards all input elements.',
	inputs: {},
	output: expressionOutput('Draining Sink.', sinkType('void', 'unknown')),
	source: 'Sink.drain'
})

export const SinkTimedTemplate = defineTemplate({
	modelId: 'SinkTimed', version: VERSION, description: 'Consumes input and returns the elapsed Duration.',
	inputs: {},
	output: expressionOutput('Timing Sink.', sinkType(durationType().ts, 'unknown')),
	source: 'Sink.timed'
})

export const SinkForEachTemplate = defineTemplate({
	modelId: 'SinkForEach', version: VERSION, description: 'Consumes every input element with an Effectful callback.',
	typeParameters: typeParameters(['A', 'Input element type.'], ['E', 'Consumer error type.'], ['R', 'Consumer requirements.']),
	inputs: {
		consume: callbackInput('Effectful element consumer.', effectReturningCallbackType('value: {{A}}', 'unknown', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Effectful consumer Sink.', sinkType('void', '{{A}}', 'never', '{{E}}', '{{R}}')),
	source: `Sink.forEach(${marker('expression', 'consume', '() => Effect.void')})`
})


export const SinkFromEffectTemplate = defineTemplate({
	modelId: 'SinkFromEffect', version: VERSION, description: 'Creates a Sink that ignores upstream input and completes with an Effect result.',
	typeParameters: typeParameters(['A', 'Sink result type.'], ['E', 'Effect error type.'], ['R', 'Effect requirements.']),
	inputs: { effect: effectSourceInput('Effect supplying the Sink result.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Effect-backed Sink.', sinkType('{{A}}', 'unknown', 'never', '{{E}}', '{{R}}')),
	source: `Sink.fromEffect(${marker('expression', 'effect', 'Effect.void')})`
})

export const SinkFromPubSubTemplate = defineTemplate({
	modelId: 'SinkFromPubSub', version: VERSION, description: 'Creates a Sink that publishes every consumed element to a PubSub.',
	typeParameters: typeParameters(['A', 'Input / published element type.']),
	inputs: { pubsub: pubSubInput('Destination PubSub.', '{{A}}') },
	output: expressionOutput('PubSub publishing Sink.', sinkType('void', '{{A}}')),
	source: `Sink.fromPubSub(${marker('expression', 'pubsub', 'pubsub')})`
})

export const SinkIgnoreLeftoverTemplate = defineTemplate({
	modelId: 'SinkIgnoreLeftover', version: VERSION, description: 'Drops leftovers produced by a Sink while preserving its result, errors, and requirements.',
	typeParameters: typeParameters(['A', 'Sink result type.'], ['In', 'Sink input type.'], ['L', 'Original leftover type.'], ['E', 'Sink error type.'], ['R', 'Sink requirements.']),
	inputs: { sink: sinkInput('Sink whose leftovers are discarded.', '{{A}}', '{{In}}', '{{L}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Sink without leftovers.', sinkType('{{A}}', '{{In}}', 'never', '{{E}}', '{{R}}')),
	source: `Sink.ignoreLeftover(${marker('expression', 'sink', 'Sink.drain')})`
})

export const SinkSucceedTemplate = defineTemplate({
	modelId: 'SinkSucceed', version: VERSION, description: 'Creates a Sink that succeeds immediately with a constant result.',
	typeParameters: typeParameters(['A', 'Result type.']),
	inputs: { value: effectValueInput('Immediate Sink result.', { ts: '{{A}}' }) },
	output: expressionOutput('Immediately successful Sink.', sinkType('{{A}}', 'unknown')),
	source: `Sink.succeed(${marker('expression', 'value', 'undefined')})`
})

export const SinkFailTemplate = defineTemplate({
	modelId: 'SinkFail', version: VERSION, description: 'Creates a Sink that fails immediately with a typed error.',
	typeParameters: typeParameters(['E', 'Failure type.']),
	inputs: { error: effectValueInput('Sink failure.', { ts: '{{E}}' }) },
	output: expressionOutput('Immediately failing Sink.', sinkType('never', 'unknown', 'never', '{{E}}')),
	source: `Sink.fail(${marker('expression', 'error', 'undefined')})`
})

export const SinkTakeWhileTemplate = defineTemplate({
	modelId: 'SinkTakeWhile', version: VERSION, description: 'Consumes elements while a pure predicate remains true and returns the consumed elements.',
	typeParameters: typeParameters(['A', 'Input element type.']),
	inputs: { predicate: callbackInput('Continue-consuming predicate.', { ts: '(value: {{A}}) => boolean' }) },
	output: expressionOutput('Predicate-bounded Sink.', sinkType('Array<{{A}}>', '{{A}}', '{{A}}')),
	source: `Sink.takeWhile(${marker('expression', 'predicate', '() => true')})`
})

export const SinkReduceTemplate = defineTemplate({
	modelId: 'SinkReduce', version: VERSION, description: 'Consumes all input elements using a pure accumulator.',
	typeParameters: typeParameters(['A', 'Input element type.'], ['S', 'Accumulator result type.']),
	inputs: {
		initial: callbackInput('Lazy initial accumulator.', { ts: '() => {{S}}' }),
		reducer: callbackInput('Pure accumulator reducer.', { ts: '(state: {{S}}, value: {{A}}) => {{S}}' })
	},
	output: expressionOutput('Reducing Sink.', sinkType('{{S}}', '{{A}}')),
	source: `Sink.reduce(${marker('expression', 'initial', '() => undefined')}, ${marker('expression', 'reducer', 'state => state')})`
})

export const SinkFoldTemplate = defineTemplate({
	modelId: 'SinkFold', version: VERSION, description: 'Effectfully folds input while a continuation predicate over the accumulator remains true.',
	typeParameters: typeParameters(['A', 'Input element type.'], ['S', 'Accumulator type.'], ['E', 'Fold error type.'], ['R', 'Fold requirements.']),
	inputs: {
		initial: callbackInput('Lazy initial accumulator.', { ts: '() => {{S}}' }),
		continue: callbackInput('Predicate deciding whether to continue consuming.', { ts: '(state: {{S}}) => boolean' }),
		step: callbackInput('Effectful accumulator step.', effectReturningCallbackType('state: {{S}}, value: {{A}}', '{{S}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Effectful folding Sink.', sinkType('{{S}}', '{{A}}', '{{A}}', '{{E}}', '{{R}}')),
	source: `Sink.fold(${marker('expression', 'initial', '() => undefined')}, ${marker('expression', 'continue', '() => true')}, ${marker('expression', 'step', 'state => Effect.succeed(state)')})`
})

export const SinkFoldUntilTemplate = defineTemplate({
	modelId: 'SinkFoldUntil', version: VERSION, description: 'Effectfully folds at most a maximum number of input elements.',
	typeParameters: typeParameters(['A', 'Input element type.'], ['S', 'Accumulator type.'], ['E', 'Fold error type.'], ['R', 'Fold requirements.']),
	inputs: {
		initial: callbackInput('Lazy initial accumulator.', { ts: '() => {{S}}' }),
		max: nonNegativeIntegerInput('Maximum number of consumed elements.'),
		step: callbackInput('Effectful accumulator step.', effectReturningCallbackType('state: {{S}}, value: {{A}}', '{{S}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Count-bounded effectful folding Sink.', sinkType('{{S}}', '{{A}}', '{{A}}', '{{E}}', '{{R}}')),
	source: `Sink.foldUntil(${marker('expression', 'initial', '() => undefined')}, ${marker('expression', 'max', '1')}, ${marker('expression', 'step', 'state => Effect.succeed(state)')})`
})

export const SinkMapTemplate = defineTemplate({
	modelId: 'SinkMap', version: VERSION, description: 'Maps the result produced by a Sink without changing its input protocol.',
	typeParameters: typeParameters(['A', 'Source Sink result type.'], ['B', 'Mapped result type.'], ['In', 'Input element type.'], ['L', 'Leftover type.'], ['E', 'Sink error type.'], ['R', 'Sink requirements.']),
	inputs: {
		sink: sinkInput('Source Sink.', '{{A}}', '{{In}}', '{{L}}', '{{E}}', '{{R}}'),
		transform: callbackInput('Pure Sink-result transform.', { ts: '(value: {{A}}) => {{B}}' })
	},
	output: expressionOutput('Result-mapped Sink.', sinkType('{{B}}', '{{In}}', '{{L}}', '{{E}}', '{{R}}')),
	source: `Sink.map(${marker('expression', 'sink', 'Sink.drain')}, ${marker('expression', 'transform', 'value => value')})`
})

export const SinkMapEffectTemplate = defineTemplate({
	modelId: 'SinkMapEffect', version: VERSION, description: 'Effectfully maps the result produced by a Sink.',
	typeParameters: typeParameters(['A', 'Source result type.'], ['B', 'Mapped result type.'], ['In', 'Input type.'], ['L', 'Leftover type.'], ['E', 'Sink error type.'], ['R', 'Sink requirements.'], ['E2', 'Mapping error type.'], ['R2', 'Mapping requirements.']),
	inputs: {
		sink: sinkInput('Source Sink.', '{{A}}', '{{In}}', '{{L}}', '{{E}}', '{{R}}'),
		transform: callbackInput('Effectful Sink-result transform.', effectReturningCallbackType('value: {{A}}', '{{B}}', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Effectfully result-mapped Sink.', sinkType('{{B}}', '{{In}}', '{{L}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Sink.mapEffect(${marker('expression', 'sink', 'Sink.drain')}, ${marker('expression', 'transform', 'value => Effect.succeed(value)')})`
})

export const SinkMapInputTemplate = defineTemplate({
	modelId: 'SinkMapInput', version: VERSION, description: 'Contramaps input values before they are consumed by a Sink.',
	typeParameters: typeParameters(['A', 'Sink result type.'], ['In', 'Original Sink input type.'], ['In0', 'External input type.'], ['L', 'Leftover type.'], ['E', 'Sink error type.'], ['R', 'Sink requirements.']),
	inputs: {
		sink: sinkInput('Source Sink.', '{{A}}', '{{In}}', '{{L}}', '{{E}}', '{{R}}'),
		transform: callbackInput('Input transform.', { ts: '(value: {{In0}}) => {{In}}' })
	},
	output: expressionOutput('Input-mapped Sink.', sinkType('{{A}}', '{{In0}}', '{{L}}', '{{E}}', '{{R}}')),
	source: `Sink.mapInput(${marker('expression', 'sink', 'Sink.drain')}, ${marker('expression', 'transform', 'value => value')})`
})

export const SinkMapInputEffectTemplate = defineTemplate({
	modelId: 'SinkMapInputEffect', version: VERSION, description: 'Effectfully transforms input values before consumption by a Sink.',
	typeParameters: typeParameters(['A', 'Sink result type.'], ['In', 'Original Sink input type.'], ['In0', 'External input type.'], ['L', 'Leftover type.'], ['E', 'Sink error type.'], ['R', 'Sink requirements.'], ['E2', 'Mapping error type.'], ['R2', 'Mapping requirements.']),
	inputs: {
		sink: sinkInput('Source Sink.', '{{A}}', '{{In}}', '{{L}}', '{{E}}', '{{R}}'),
		transform: callbackInput('Effectful input transform.', effectReturningCallbackType('value: {{In0}}', '{{In}}', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Effectfully input-mapped Sink.', sinkType('{{A}}', '{{In0}}', '{{L}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Sink.mapInputEffect(${marker('expression', 'sink', 'Sink.drain')}, ${marker('expression', 'transform', 'value => Effect.succeed(value)')})`
})

export const effectSinkV4GraphTemplateInputs = [
	SinkHeadTemplate,
	SinkLastTemplate,
	SinkCountTemplate,
	SinkSumTemplate,
	SinkCollectTemplate,
	SinkTakeTemplate,
	SinkDrainTemplate,
	SinkTimedTemplate,
	SinkForEachTemplate,
	SinkFromEffectTemplate,
	SinkFromPubSubTemplate,
	SinkIgnoreLeftoverTemplate,
	SinkSucceedTemplate,
	SinkFailTemplate,
	SinkTakeWhileTemplate,
	SinkReduceTemplate,
	SinkFoldTemplate,
	SinkFoldUntilTemplate,
	SinkMapTemplate,
	SinkMapEffectTemplate,
	SinkMapInputTemplate,
	SinkMapInputEffectTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
