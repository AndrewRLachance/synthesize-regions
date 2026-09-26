import {
	defineTemplate,
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
	effectType
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	marker,
	scheduleType,
	streamType,
	stringInput,
	typeParameters,
	typedExpressionInput
} from './effect-template-helpers.js'
import {
	pubSubInput,
	queueInput,
	streamInput
} from './effect-stream-sink-template-helpers.js'

/**
 * Production-oriented Stream + Sink compositions.
 *
 * Runtime contract:
 *   import { Effect, Schedule, Sink, Stream } from 'effect'
 */
const VERSION = '1.0.0' as const

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

const positiveIntegerInput = (description: string) => numericInput(description, {
	type: 'integer', minimum: 1
})

const scheduleInput = (description: string, output = 'unknown', input = 'unknown', requirements = 'never') =>
	typedExpressionInput(description, scheduleType(output, input, requirements))

export const QueueStreamProcessorTemplate = defineTemplate({
	modelId: 'QueueStreamProcessor', version: VERSION,
	description: 'Consumes a shared Queue as a Stream and processes elements with explicit concurrency and backpressure.',
	typeParameters: typeParameters(['A', 'Queue element type.'], ['E', 'Processing error type.'], ['R', 'Processing requirements.']),
	inputs: {
		queue: queueInput('Shared Queue consumed by the worker.', '{{A}}'),
		process: callbackInput('Effectful element processor.', effectReturningCallbackType('value: {{A}}', 'unknown', '{{E}}', '{{R}}')),
		concurrency: effectConcurrencyInput('Maximum concurrent processors.')
	},
	output: expressionOutput('Queue-processing Effect.', effectType('void', '{{E}}', '{{R}}')),
	source: `Stream.run(Stream.mapEffect(Stream.fromQueue(${marker('expression', 'queue', 'queue')}), ${marker('expression', 'process', '() => Effect.void')}, { concurrency: ${marker('expression', 'concurrency', '1')} }), Sink.drain)`
})

export const PubSubStreamConsumerTemplate = defineTemplate({
	modelId: 'PubSubStreamConsumer', version: VERSION,
	description: 'Subscribes to a PubSub as a Stream and processes published elements with explicit concurrency.',
	typeParameters: typeParameters(['A', 'Published element type.'], ['E', 'Processing error type.'], ['R', 'Processing requirements.']),
	inputs: {
		pubsub: pubSubInput('Shared PubSub source.', '{{A}}'),
		process: callbackInput('Effectful event processor.', effectReturningCallbackType('value: {{A}}', 'unknown', '{{E}}', '{{R}}')),
		concurrency: effectConcurrencyInput('Maximum concurrent processors.')
	},
	output: expressionOutput('PubSub consumer Effect.', effectType('void', '{{E}}', '{{R}}')),
	source: `Stream.run(Stream.mapEffect(Stream.fromPubSub(${marker('expression', 'pubsub', 'pubsub')}), ${marker('expression', 'process', '() => Effect.void')}, { concurrency: ${marker('expression', 'concurrency', '1')} }), Sink.drain)`
})

export const BufferedStreamProcessorTemplate = defineTemplate({
	modelId: 'BufferedStreamProcessor', version: VERSION,
	description: 'Adds a bounded chunk buffer between a Stream producer and an Effectful concurrent processor.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E1', 'Stream error type.'], ['R1', 'Stream requirements.'], ['E2', 'Processing error type.'], ['R2', 'Processing requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E1}}', '{{R1}}'),
		capacity: positiveIntegerInput('Buffer capacity.'),
		strategy: typedExpressionInput('Overflow strategy.', { ts: '"suspend" | "dropping" | "sliding"' }),
		process: callbackInput('Effectful processor.', effectReturningCallbackType('value: {{A}}', 'unknown', '{{E2}}', '{{R2}}')),
		concurrency: effectConcurrencyInput('Maximum concurrent processors.')
	},
	output: expressionOutput('Buffered processing Effect.', effectType('void', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Stream.run(Stream.mapEffect(Stream.buffer(${marker('expression', 'stream', 'Stream.empty')}, { capacity: ${marker('expression', 'capacity', '16')}, strategy: ${marker('expression', 'strategy', '"suspend"')} }), ${marker('expression', 'process', '() => Effect.void')}, { concurrency: ${marker('expression', 'concurrency', '1')} }), Sink.drain)`
})

export const TimedBatchStreamProcessorTemplate = defineTemplate({
	modelId: 'TimedBatchStreamProcessor', version: VERSION,
	description: 'Batches Stream elements by size or time and processes batches with explicit concurrency.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E1', 'Stream error type.'], ['R1', 'Stream requirements.'], ['E2', 'Batch processing error type.'], ['R2', 'Batch processing requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E1}}', '{{R1}}'),
		batchSize: positiveIntegerInput('Maximum batch size.'),
		maxWait: effectDurationInput('Maximum wait before emitting a partial batch.'),
		processBatch: callbackInput('Effectful batch processor.', effectReturningCallbackType('batch: Array<{{A}}>', 'unknown', '{{E2}}', '{{R2}}')),
		concurrency: effectConcurrencyInput('Maximum concurrent batch processors.')
	},
	output: expressionOutput('Timed batch-processing Effect.', effectType('void', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Stream.run(Stream.mapEffect(Stream.groupedWithin(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'batchSize', '100')}, ${marker('expression', 'maxWait', '1000')}), ${marker('expression', 'processBatch', '() => Effect.void')}, { concurrency: ${marker('expression', 'concurrency', '1')} }), Sink.drain)`
})

export const TransducedBatchStreamProcessorTemplate = defineTemplate({
	modelId: 'TransducedBatchStreamProcessor', version: VERSION,
	description: 'Uses Sink.take as a Stream transducer to form fixed-size batches, filters terminal empty output, and processes each batch.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E1', 'Stream error type.'], ['R1', 'Stream requirements.'], ['E2', 'Batch processing error type.'], ['R2', 'Batch processing requirements.']),
	inputs: {
		stream: streamInput('Source Stream.', '{{A}}', '{{E1}}', '{{R1}}'),
		batchSize: positiveIntegerInput('Transducer batch size.'),
		processBatch: callbackInput('Effectful batch processor.', effectReturningCallbackType('batch: Array<{{A}}>', 'unknown', '{{E2}}', '{{R2}}')),
		concurrency: effectConcurrencyInput('Maximum concurrent batch processors.')
	},
	output: expressionOutput('Transduced batch-processing Effect.', effectType('void', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Stream.run(Stream.mapEffect(Stream.filter(Stream.transduce(${marker('expression', 'stream', 'Stream.empty')}, Sink.take(${marker('expression', 'batchSize', '100')})), batch => batch.length > 0), ${marker('expression', 'processBatch', '() => Effect.void')}, { concurrency: ${marker('expression', 'concurrency', '1')} }), Sink.drain)`
})

export const ScheduledEffectStreamTemplate = defineTemplate({
	modelId: 'ScheduledEffectStream', version: VERSION,
	description: 'Turns a Schedule into a trigger Stream and runs an Effect for each schedule emission.',
	typeParameters: typeParameters(['Tick', 'Schedule output type.'], ['A', 'Operation success type.'], ['E', 'Operation error type.'], ['RSchedule', 'Schedule requirements.'], ['ROperation', 'Operation requirements.']),
	inputs: {
		schedule: scheduleInput('Trigger Schedule.', '{{Tick}}', 'unknown', '{{RSchedule}}'),
		operation: effectSourceInput('Operation run for every schedule output.', effectType('{{A}}', '{{E}}', '{{ROperation}}'))
	},
	output: expressionOutput('Scheduled operation Stream.', streamType('{{A}}', '{{E}}', '{{RSchedule}} | {{ROperation}}')),
	source: `Stream.mapEffect(Stream.fromSchedule(${marker('expression', 'schedule', 'Schedule.forever')}), () => ${marker('expression', 'operation', 'Effect.void')})`
})

export const ObservedStreamConsumerTemplate = defineTemplate({
	modelId: 'ObservedStreamConsumer', version: VERSION,
	description: 'Consumes a Stream with an Effectful Sink.forEach callback inside a tracing span.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E1', 'Stream error type.'], ['R1', 'Stream requirements.'], ['E2', 'Consumer error type.'], ['R2', 'Consumer requirements.']),
	inputs: {
		stream: streamInput('Stream to consume.', '{{A}}', '{{E1}}', '{{R1}}'),
		consume: callbackInput('Effectful element consumer.', effectReturningCallbackType('value: {{A}}', 'unknown', '{{E2}}', '{{R2}}')),
		spanName: stringInput('Tracing span name.')
	},
	output: expressionOutput('Observed Stream consumer Effect.', effectType('void', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Effect.withSpan(Stream.run(${marker('expression', 'stream', 'Stream.empty')}, Sink.forEach(${marker('expression', 'consume', '() => Effect.void')})), ${marker('string', 'spanName', '"stream.consume"')})`
})

export const effectStreamSinkRealWorldGraphTemplateInputs = [
	QueueStreamProcessorTemplate,
	PubSubStreamConsumerTemplate,
	BufferedStreamProcessorTemplate,
	TimedBatchStreamProcessorTemplate,
	TransducedBatchStreamProcessorTemplate,
	ScheduledEffectStreamTemplate,
	ObservedStreamConsumerTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
