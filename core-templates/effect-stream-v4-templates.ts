import {
	defineTemplate,
	fragmentCollectionPort,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from '../src/templates.js'
import type { TypeDescriptor } from '../src/templates.js'
import {
	effectConcurrencyInput,
	effectDurationInput,
	effectExpressionPolicy,
	effectSourceInput,
	effectType,
	effectValueInput
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	marker,
	scheduleType,
	streamType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import { optionType } from './effect-data-type-template-helpers.js'
import {
	pubSubInput,
	queueInput,
	sinkInput,
	streamInput
} from './effect-stream-sink-template-helpers.js'

/**
 * Effect v4 Stream graph templates.
 *
 * Runtime contract:
 *   import { Effect, Option, Schedule, Sink, Stream } from 'effect'
 */
const VERSION = '2.0.0' as const
const scopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'

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

const positiveIntegerInput = (description: string) => numericInput(description, {
	type: 'integer', minimum: 1
})

const scheduleInput = (description: string, output = 'unknown', input = 'unknown', requirements = 'never') =>
	typedExpressionInput(description, scheduleType(output, input, requirements))

const expressionCollectionInput = (description: string, type: TypeDescriptor) => fragmentCollectionPort({
	regionKind: 'expression',
	accepts: { outputKind: 'expression', type },
	minItems: 1,
	separator: ', ',
	description
})

// Constructors ----------------------------------------------------------------

export const StreamEmptyTemplate = defineTemplate({
	modelId: 'StreamEmpty', version: VERSION, description: 'Returns an empty Stream.',
	inputs: {},
	output: expressionOutput('Empty Stream.', streamType('never', 'never', 'never')),
	source: 'Stream.empty'
})

export const StreamSucceedTemplate = defineTemplate({
	modelId: 'StreamSucceed', version: VERSION, description: 'Creates a Stream that emits exactly one pure value.',
	typeParameters: typeParameters(['A', 'Emitted value type.']),
	inputs: { value: effectValueInput('Value to emit.', { ts: '{{A}}' }) },
	output: expressionOutput('Single-value Stream.', streamType('{{A}}', 'never', 'never')),
	source: `Stream.succeed(${marker('expression', 'value', 'undefined')})`
})

export const StreamMakeTemplate = defineTemplate({
	modelId: 'StreamMake', version: VERSION, description: 'Creates a Stream from one or more pure values.',
	typeParameters: typeParameters(['A', 'Emitted value type.']),
	inputs: { values: expressionCollectionInput('Values emitted in order.', { ts: '{{A}}' }) },
	output: expressionOutput('Value Stream.', streamType('{{A}}', 'never', 'never')),
	source: `Stream.make(${marker('expression', 'values', 'undefined')})`
})

export const StreamFailTemplate = defineTemplate({
	modelId: 'StreamFail', version: VERSION, description: 'Creates a Stream that fails with a typed error.',
	typeParameters: typeParameters(['E', 'Failure type.']),
	inputs: { error: effectValueInput('Stream failure.', { ts: '{{E}}' }) },
	output: expressionOutput('Failing Stream.', streamType('never', '{{E}}', 'never')),
	source: `Stream.fail(${marker('expression', 'error', 'undefined')})`
})

export const StreamFromArrayTemplate = defineTemplate({
	modelId: 'StreamFromArray', version: VERSION, description: 'Creates a Stream from a readonly Array.',
	typeParameters: typeParameters(['A', 'Element type.']),
	inputs: { array: effectValueInput('Array source.', { ts: 'ReadonlyArray<{{A}}>' }) },
	output: expressionOutput('Array-backed Stream.', streamType('{{A}}', 'never', 'never')),
	source: `Stream.fromArray(${marker('expression', 'array', '[]')})`
})

export const StreamFromIterableTemplate = defineTemplate({
	modelId: 'StreamFromIterable', version: VERSION, description: 'Creates an infallible Stream from an Iterable.',
	typeParameters: typeParameters(['A', 'Stream element type.']),
	inputs: { iterable: effectValueInput('Iterable source.', { ts: 'Iterable<{{A}}>' }) },
	output: expressionOutput('Iterable-backed Stream.', streamType('{{A}}', 'never', 'never')),
	source: `Stream.fromIterable(${marker('expression', 'iterable', '[]')})`
})

export const StreamFromEffectTemplate = defineTemplate({
	modelId: 'StreamFromEffect', version: VERSION, description: 'Creates a single-element Stream from an Effect.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { effect: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Effect-backed Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.fromEffect(${marker('expression', 'effect', 'Effect.void')})`
})

export const StreamFromEffectRepeatTemplate = defineTemplate({
	modelId: 'StreamFromEffectRepeat', version: VERSION, description: 'Repeats an Effect indefinitely and emits each success value.',
	typeParameters: typeParameters(['A', 'Emitted value type.'], ['E', 'Effect error type.'], ['R', 'Effect requirements.']),
	inputs: { effect: effectSourceInput('Repeated Effect.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Repeated Effect Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.fromEffectRepeat(${marker('expression', 'effect', 'Effect.void')})`
})

export const StreamTickTemplate = defineTemplate({
	modelId: 'StreamTick', version: VERSION, description: 'Creates an infinite Stream that emits void immediately and then at a fixed interval.',
	inputs: { interval: effectDurationInput('Interval between ticks.') },
	output: expressionOutput('Tick Stream.', streamType('void', 'never', 'never')),
	source: `Stream.tick(${marker('expression', 'interval', '1000')})`
})


export const StreamUnfoldTemplate = defineTemplate({
	modelId: 'StreamUnfold', version: VERSION, description: 'Creates a Stream by repeatedly applying an effectful state step until the step returns undefined.',
	typeParameters: typeParameters(['S', 'State type.'], ['A', 'Emitted element type.'], ['E', 'Step error type.'], ['R', 'Step requirements.']),
	inputs: {
		initial: valueInput('Initial unfold state.', { ts: '{{S}}' }),
		step: callbackInput('Effectful state step returning [value, nextState] or undefined.', effectReturningCallbackType('state: {{S}}', 'readonly [{{A}}, {{S}}] | undefined', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Unfolded Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.unfold(${marker('expression', 'initial', 'undefined')}, ${marker('expression', 'step', 'state => Effect.succeed([state, state] as const)')})`
})

export const StreamIterateTemplate = defineTemplate({
	modelId: 'StreamIterate', version: VERSION, description: 'Creates an infinite pure Stream by repeatedly applying a function to a seed value.',
	typeParameters: typeParameters(['A', 'Element / seed type.']),
	inputs: {
		initial: effectValueInput('Initial seed value.', { ts: '{{A}}' }),
		next: callbackInput('Pure next-value function.', { ts: '(value: {{A}}) => {{A}}' })
	},
	output: expressionOutput('Iterated Stream.', streamType('{{A}}', 'never', 'never')),
	source: `Stream.iterate(${marker('expression', 'initial', 'undefined')}, ${marker('expression', 'next', 'value => value')})`
})

export const StreamRangeTemplate = defineTemplate({
	modelId: 'StreamRange', version: VERSION, description: 'Creates an integer Stream including both numeric endpoints.',
	inputs: {
		min: effectValueInput('Inclusive minimum integer.', { ts: 'number' }),
		max: effectValueInput('Inclusive maximum integer.', { ts: 'number' })
	},
	output: expressionOutput('Integer range Stream.', streamType('number', 'never', 'never')),
	source: `Stream.range(${marker('expression', 'min', '0')}, ${marker('expression', 'max', '10')})`
})

export const StreamPaginateTemplate = defineTemplate({
	modelId: 'StreamPaginate', version: VERSION, description: 'Builds a paginated Stream from an effectful state transition that emits arrays of values.',
	typeParameters: typeParameters(['S', 'Pagination state type.'], ['A', 'Element type.'], ['E', 'Pagination error type.'], ['R', 'Pagination requirements.']),
	inputs: {
		initial: valueInput('Initial pagination state.', { ts: '{{S}}' }),
		next: callbackInput('Effectful page loader returning [values, Option<nextState>].', effectReturningCallbackType(
			'state: {{S}}',
			`readonly [ReadonlyArray<{{A}}>, ${optionType('{{S}}').ts}]`,
			'{{E}}',
			'{{R}}'
		))
	},
	output: expressionOutput('Paginated Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.paginate(${marker('expression', 'initial', 'undefined')}, ${marker('expression', 'next', 'state => Effect.succeed([[state], Option.none()] as const)')})`
})

export const StreamFromQueueTemplate = defineTemplate({
	modelId: 'StreamFromQueue', version: VERSION, description: 'Creates a backpressured Stream from a Queue / Dequeue.',
	typeParameters: typeParameters(['A', 'Queue element type.']),
	inputs: { queue: queueInput('Queue used as the Stream source.', '{{A}}') },
	output: expressionOutput('Queue-backed Stream.', streamType('{{A}}', 'never', 'never')),
	source: `Stream.fromQueue(${marker('expression', 'queue', 'queue')})`
})

export const StreamFromPubSubTemplate = defineTemplate({
	modelId: 'StreamFromPubSub', version: VERSION, description: 'Creates a Stream from a PubSub subscription.',
	typeParameters: typeParameters(['A', 'Published element type.']),
	inputs: { pubsub: pubSubInput('PubSub used as the Stream source.', '{{A}}') },
	output: expressionOutput('PubSub-backed Stream.', streamType('{{A}}', 'never', 'never')),
	source: `Stream.fromPubSub(${marker('expression', 'pubsub', 'pubsub')})`
})

export const StreamFromScheduleTemplate = defineTemplate({
	modelId: 'StreamFromSchedule', version: VERSION, description: 'Creates a Stream that emits each output of a Schedule.',
	typeParameters: typeParameters(['A', 'Schedule output type.'], ['R', 'Schedule requirements.']),
	inputs: { schedule: scheduleInput('Schedule used as the Stream source.', '{{A}}', 'unknown', '{{R}}') },
	output: expressionOutput('Schedule-backed Stream.', streamType('{{A}}', 'never', '{{R}}')),
	source: `Stream.fromSchedule(${marker('expression', 'schedule', 'Schedule.forever')})`
})

export const StreamScopedTemplate = defineTemplate({
	modelId: 'StreamScoped', version: VERSION, description: 'Runs a Scope-requiring Stream in a fresh Scope when consumed.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Non-Scope requirements.']),
	inputs: { stream: streamInput('Stream requiring Scope.', '{{A}}', '{{E}}', `{{R}} | ${scopeRequirement}`) },
	output: expressionOutput('Scoped Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.scoped(${marker('expression', 'stream', 'Stream.empty')})`
})

// Transformations -------------------------------------------------------------

export const StreamMapTemplate = defineTemplate({
	modelId: 'StreamMap', version: VERSION, description: 'Purely maps each Stream element and index.',
	typeParameters: typeParameters(['A', 'Source element type.'], ['B', 'Mapped element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'),
		transform: callbackInput('Pure element transformation.', { ts: '(value: {{A}}, index: number) => {{B}}' })
	},
	output: expressionOutput('Mapped Stream.', streamType('{{B}}', '{{E}}', '{{R}}')),
	source: `Stream.map(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'transform', 'value => value')})`
})

export const StreamMapEffectTemplate = defineTemplate({
	modelId: 'StreamMapEffect', version: VERSION, description: 'Maps each Stream element sequentially with an Effect-producing callback.',
	typeParameters: typeParameters(['A', 'Source element type.'], ['B', 'Mapped element type.'], ['E', 'Source error type.'], ['R', 'Source requirements.'], ['E2', 'Mapping error type.'], ['R2', 'Mapping requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'),
		transform: callbackInput('Effectful element transformation.', effectReturningCallbackType('value: {{A}}, index: number', '{{B}}', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Effect-mapped Stream.', streamType('{{B}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Stream.mapEffect(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'transform', 'value => Effect.succeed(value)')})`
})

export const StreamMapEffectConcurrentTemplate = defineTemplate({
	modelId: 'StreamMapEffectConcurrent', version: VERSION, description: 'Maps Stream elements effectfully with explicit bounded or unbounded concurrency while preserving downstream ordering by default.',
	typeParameters: typeParameters(['A', 'Source element type.'], ['B', 'Mapped element type.'], ['E', 'Source error type.'], ['R', 'Source requirements.'], ['E2', 'Mapping error type.'], ['R2', 'Mapping requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'),
		transform: callbackInput('Effectful element transformation.', effectReturningCallbackType('value: {{A}}, index: number', '{{B}}', '{{E2}}', '{{R2}}')),
		concurrency: effectConcurrencyInput('Maximum concurrent transformations.')
	},
	output: expressionOutput('Concurrently effect-mapped Stream.', streamType('{{B}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Stream.mapEffect(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'transform', 'value => Effect.succeed(value)')}, { concurrency: ${marker('expression', 'concurrency', '1')} })`
})

export const StreamTapTemplate = defineTemplate({
	modelId: 'StreamTap', version: VERSION, description: 'Runs an Effectful side effect for each element while preserving the original element.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Stream error type.'], ['R', 'Stream requirements.'], ['E2', 'Tap error type.'], ['R2', 'Tap requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'),
		tap: callbackInput('Effectful side effect.', effectReturningCallbackType('value: {{A}}', 'unknown', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Tapped Stream.', streamType('{{A}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Stream.tap(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'tap', '() => Effect.void')})`
})

export const StreamFilterTemplate = defineTemplate({
	modelId: 'StreamFilter', version: VERSION, description: 'Keeps Stream elements matching a pure predicate.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'),
		predicate: callbackInput('Pure element predicate.', { ts: '(value: {{A}}) => boolean' })
	},
	output: expressionOutput('Filtered Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.filter(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'predicate', '() => true')})`
})

export const StreamTakeTemplate = defineTemplate({
	modelId: 'StreamTake', version: VERSION, description: 'Keeps at most the first N elements of a Stream.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'), count: nonNegativeIntegerInput('Maximum emitted elements.') },
	output: expressionOutput('Prefix Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.take(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'count', '1')})`
})

export const StreamTakeWhileTemplate = defineTemplate({
	modelId: 'StreamTakeWhile', version: VERSION, description: 'Emits elements while a pure predicate remains true.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'), predicate: callbackInput('Continue predicate.', { ts: '(value: {{A}}) => boolean' }) },
	output: expressionOutput('Predicate-bounded Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.takeWhile(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'predicate', '() => true')})`
})

export const StreamFlattenIterableTemplate = defineTemplate({
	modelId: 'StreamFlattenIterable', version: VERSION, description: 'Flattens Iterable values emitted by a Stream into individual elements.',
	typeParameters: typeParameters(['A', 'Flattened element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Stream of Iterables.', 'Iterable<{{A}}>', '{{E}}', '{{R}}') },
	output: expressionOutput('Flattened Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.flattenIterable(${marker('expression', 'stream', 'Stream.empty')})`
})

export const StreamMapAccumTemplate = defineTemplate({
	modelId: 'StreamMapAccum', version: VERSION, description: 'Purely threads state through a Stream while emitting zero or more output values per input.',
	typeParameters: typeParameters(['A', 'Input element type.'], ['B', 'Output element type.'], ['S', 'State type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'),
		initial: callbackInput('Lazy initial state.', { ts: '() => {{S}}' }),
		step: callbackInput('State transition and output producer.', { ts: '(state: {{S}}, value: {{A}}) => readonly [{{S}}, ReadonlyArray<{{B}}>]' })
	},
	output: expressionOutput('Statefully mapped Stream.', streamType('{{B}}', '{{E}}', '{{R}}')),
	source: `Stream.mapAccum(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'initial', '() => undefined')}, ${marker('expression', 'step', 'state => [state, []] as const')})`
})

// Buffering, grouping, scheduling ---------------------------------------------

export const StreamGroupedWithinTemplate = defineTemplate({
	modelId: 'StreamGroupedWithin', version: VERSION, description: 'Groups Stream elements by maximum batch size or elapsed duration, whichever occurs first.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'),
		size: positiveIntegerInput('Maximum batch size.'),
		duration: effectDurationInput('Maximum batching interval.')
	},
	output: expressionOutput('Grouped Stream.', streamType('Array<{{A}}>', '{{E}}', '{{R}}')),
	source: `Stream.groupedWithin(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'size', '100')}, ${marker('expression', 'duration', '1000')})`
})

export const StreamBufferTemplate = defineTemplate({
	modelId: 'StreamBuffer', version: VERSION, description: 'Buffers Stream chunks with an explicit capacity and overflow strategy.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'),
		capacity: positiveIntegerInput('Buffer capacity.'),
		strategy: effectValueInput('Buffer strategy.', { ts: '"suspend" | "dropping" | "sliding"' })
	},
	output: expressionOutput('Buffered Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.buffer(${marker('expression', 'stream', 'Stream.empty')}, { capacity: ${marker('expression', 'capacity', '16')}, strategy: ${marker('expression', 'strategy', '"suspend"')} })`
})

export const StreamScheduleTemplate = defineTemplate({
	modelId: 'StreamSchedule', version: VERSION, description: 'Spaces Stream element emission according to a Schedule.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Stream error type.'], ['R', 'Stream requirements.'], ['Out', 'Schedule output type.'], ['R2', 'Schedule requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'),
		schedule: scheduleInput('Schedule controlling element timing.', '{{Out}}', '{{A}}', '{{R2}}')
	},
	output: expressionOutput('Scheduled Stream.', streamType('{{A}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `Stream.schedule(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'schedule', 'Schedule.forever')})`
})

export const StreamRetryTemplate = defineTemplate({
	modelId: 'StreamRetry', version: VERSION, description: 'Retries a failing Stream according to a Schedule.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Stream requirements.'], ['R2', 'Schedule requirements.']),
	inputs: {
		stream: streamInput('Stream to retry.', '{{A}}', '{{E}}', '{{R}}'),
		schedule: scheduleInput('Retry Schedule.', 'unknown', '{{E}}', '{{R2}}')
	},
	output: expressionOutput('Retried Stream.', streamType('{{A}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `Stream.retry(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'schedule', 'Schedule.recurs(1)')})`
})

export const StreamZipTemplate = defineTemplate({
	modelId: 'StreamZip', version: VERSION, description: 'Zips two Streams element-by-element into tuples.',
	typeParameters: typeParameters(['A', 'Left element type.'], ['B', 'Right element type.'], ['E1', 'Left error type.'], ['E2', 'Right error type.'], ['R1', 'Left requirements.'], ['R2', 'Right requirements.']),
	inputs: {
		left: streamInput('Left Stream.', '{{A}}', '{{E1}}', '{{R1}}'),
		right: streamInput('Right Stream.', '{{B}}', '{{E2}}', '{{R2}}')
	},
	output: expressionOutput('Zipped Stream.', streamType('readonly [{{A}}, {{B}}]', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Stream.zip(${marker('expression', 'left', 'Stream.empty')}, ${marker('expression', 'right', 'Stream.empty')})`
})

export const StreamZipWithTemplate = defineTemplate({
	modelId: 'StreamZipWith', version: VERSION, description: 'Zips two Streams and combines paired elements with a pure function.',
	typeParameters: typeParameters(['A', 'Left element type.'], ['B', 'Right element type.'], ['C', 'Combined element type.'], ['E1', 'Left error type.'], ['E2', 'Right error type.'], ['R1', 'Left requirements.'], ['R2', 'Right requirements.']),
	inputs: {
		left: streamInput('Left Stream.', '{{A}}', '{{E1}}', '{{R1}}'),
		right: streamInput('Right Stream.', '{{B}}', '{{E2}}', '{{R2}}'),
		combine: callbackInput('Pair-combining function.', { ts: '(left: {{A}}, right: {{B}}) => {{C}}' })
	},
	output: expressionOutput('Combined zipped Stream.', streamType('{{C}}', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Stream.zipWith(${marker('expression', 'left', 'Stream.empty')}, ${marker('expression', 'right', 'Stream.empty')}, ${marker('expression', 'combine', '(left, right) => [left, right]')})`
})

// Sink integration and destructors --------------------------------------------

export const StreamTransduceTemplate = defineTemplate({
	modelId: 'StreamTransduce', version: VERSION, description: 'Repeatedly applies a Sink transducer and emits each Sink result, feeding leftovers into the next run.',
	typeParameters: typeParameters(['A', 'Stream / Sink input type.'], ['B', 'Sink result type.'], ['E1', 'Stream error type.'], ['E2', 'Sink error type.'], ['R1', 'Stream requirements.'], ['R2', 'Sink requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E1}}', '{{R1}}'),
		sink: sinkInput('Transducing Sink whose leftover type matches its input.', '{{B}}', '{{A}}', '{{A}}', '{{E2}}', '{{R2}}')
	},
	output: expressionOutput('Transduced Stream.', streamType('{{B}}', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Stream.transduce(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'sink', 'Sink.take(1)')})`
})

export const StreamRunTemplate = defineTemplate({
	modelId: 'StreamRun', version: VERSION, description: 'Consumes a Stream with a Sink and returns the Sink result.',
	typeParameters: typeParameters(['A', 'Stream / Sink input type.'], ['B', 'Sink result type.'], ['L', 'Sink leftover type.'], ['E1', 'Stream error type.'], ['E2', 'Sink error type.'], ['R1', 'Stream requirements.'], ['R2', 'Sink requirements.']),
	inputs: {
		stream: streamInput('Stream to consume.', '{{A}}', '{{E1}}', '{{R1}}'),
		sink: sinkInput('Sink consuming the Stream.', '{{B}}', '{{A}}', '{{L}}', '{{E2}}', '{{R2}}')
	},
	output: expressionOutput('Stream execution Effect.', effectType('{{B}}', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Stream.run(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'sink', 'Sink.drain')})`
})

export const StreamRunCollectTemplate = defineTemplate({
	modelId: 'StreamRunCollect', version: VERSION, description: 'Consumes a Stream into an Array.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Stream to collect.', '{{A}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Stream collection Effect.', effectType('Array<{{A}}>', '{{E}}', '{{R}}')),
	source: `Stream.runCollect(${marker('expression', 'stream', 'Stream.empty')})`
})


export const StreamRunDrainTemplate = defineTemplate({
	modelId: 'StreamRunDrain', version: VERSION, description: 'Consumes a Stream while discarding every emitted element.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Stream to drain.', '{{A}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Stream drain Effect.', effectType('void', '{{E}}', '{{R}}')),
	source: `Stream.runDrain(${marker('expression', 'stream', 'Stream.empty')})`
})

export const StreamRunHeadTemplate = defineTemplate({
	modelId: 'StreamRunHead', version: VERSION, description: 'Consumes enough of a Stream to return its first element as an Option.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Stream whose first element is requested.', '{{A}}', '{{E}}', '{{R}}') },
	output: expressionOutput('First-element Effect.', effectType(optionType('{{A}}').ts, '{{E}}', '{{R}}')),
	source: `Stream.runHead(${marker('expression', 'stream', 'Stream.empty')})`
})

export const StreamRunLastTemplate = defineTemplate({
	modelId: 'StreamRunLast', version: VERSION, description: 'Consumes a finite Stream and returns its final element as an Option.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Finite Stream whose final element is requested.', '{{A}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Final-element Effect.', effectType(optionType('{{A}}').ts, '{{E}}', '{{R}}')),
	source: `Stream.runLast(${marker('expression', 'stream', 'Stream.empty')})`
})

export const StreamRunCountTemplate = defineTemplate({
	modelId: 'StreamRunCount', version: VERSION, description: 'Consumes a Stream and returns the number of emitted elements.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Stream to count.', '{{A}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Stream count Effect.', effectType('number', '{{E}}', '{{R}}')),
	source: `Stream.runCount(${marker('expression', 'stream', 'Stream.empty')})`
})

export const StreamRunSumTemplate = defineTemplate({
	modelId: 'StreamRunSum', version: VERSION, description: 'Consumes a numeric Stream and returns the sum of emitted numbers.',
	typeParameters: typeParameters(['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Numeric Stream.', 'number', '{{E}}', '{{R}}') },
	output: expressionOutput('Stream sum Effect.', effectType('number', '{{E}}', '{{R}}')),
	source: `Stream.runSum(${marker('expression', 'stream', 'Stream.empty')})`
})

export const StreamRunFoldTemplate = defineTemplate({
	modelId: 'StreamRunFold', version: VERSION, description: 'Consumes a Stream with a pure accumulator.',
	typeParameters: typeParameters(['A', 'Element type.'], ['S', 'Accumulator type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		stream: streamInput('Stream to fold.', '{{A}}', '{{E}}', '{{R}}'),
		initial: callbackInput('Lazy initial accumulator.', { ts: '() => {{S}}' }),
		reducer: callbackInput('Pure accumulator reducer.', { ts: '(state: {{S}}, value: {{A}}) => {{S}}' })
	},
	output: expressionOutput('Fold result Effect.', effectType('{{S}}', '{{E}}', '{{R}}')),
	source: `Stream.runFold(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'initial', '() => undefined')}, ${marker('expression', 'reducer', 'state => state')})`
})

export const StreamRunFoldEffectTemplate = defineTemplate({
	modelId: 'StreamRunFoldEffect', version: VERSION, description: 'Consumes a Stream with an Effectful accumulator.',
	typeParameters: typeParameters(['A', 'Element type.'], ['S', 'Accumulator type.'], ['E1', 'Stream error type.'], ['E2', 'Reducer error type.'], ['R1', 'Stream requirements.'], ['R2', 'Reducer requirements.']),
	inputs: {
		stream: streamInput('Stream to fold.', '{{A}}', '{{E1}}', '{{R1}}'),
		initial: callbackInput('Lazy initial accumulator.', { ts: '() => {{S}}' }),
		reducer: callbackInput('Effectful accumulator reducer.', effectReturningCallbackType('state: {{S}}, value: {{A}}', '{{S}}', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Effectful fold result.', effectType('{{S}}', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Stream.runFoldEffect(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'initial', '() => undefined')}, ${marker('expression', 'reducer', 'state => Effect.succeed(state)')})`
})

export const StreamRunForEachTemplate = defineTemplate({
	modelId: 'StreamRunForEach', version: VERSION, description: 'Consumes every Stream element with an Effectful callback.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E1', 'Stream error type.'], ['R1', 'Stream requirements.'], ['E2', 'Consumer error type.'], ['R2', 'Consumer requirements.']),
	inputs: {
		stream: streamInput('Stream to consume.', '{{A}}', '{{E1}}', '{{R1}}'),
		consume: callbackInput('Effectful element consumer.', effectReturningCallbackType('value: {{A}}', 'unknown', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Stream consumption Effect.', effectType('void', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Stream.runForEach(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'consume', '() => Effect.void')})`
})

export const effectStreamV4GraphTemplateInputs = [
	StreamEmptyTemplate,
	StreamSucceedTemplate,
	StreamMakeTemplate,
	StreamFailTemplate,
	StreamFromArrayTemplate,
	StreamFromIterableTemplate,
	StreamFromEffectTemplate,
	StreamFromEffectRepeatTemplate,
	StreamTickTemplate,
	StreamUnfoldTemplate,
	StreamIterateTemplate,
	StreamRangeTemplate,
	StreamPaginateTemplate,
	StreamFromQueueTemplate,
	StreamFromPubSubTemplate,
	StreamFromScheduleTemplate,
	StreamScopedTemplate,
	StreamMapTemplate,
	StreamMapEffectTemplate,
	StreamMapEffectConcurrentTemplate,
	StreamTapTemplate,
	StreamFilterTemplate,
	StreamTakeTemplate,
	StreamTakeWhileTemplate,
	StreamFlattenIterableTemplate,
	StreamMapAccumTemplate,
	StreamGroupedWithinTemplate,
	StreamBufferTemplate,
	StreamScheduleTemplate,
	StreamRetryTemplate,
	StreamZipTemplate,
	StreamZipWithTemplate,
	StreamTransduceTemplate,
	StreamRunTemplate,
	StreamRunCollectTemplate,
	StreamRunDrainTemplate,
	StreamRunHeadTemplate,
	StreamRunLastTemplate,
	StreamRunCountTemplate,
	StreamRunSumTemplate,
	StreamRunFoldTemplate,
	StreamRunFoldEffectTemplate,
	StreamRunForEachTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
