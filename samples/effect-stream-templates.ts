import { defineTemplate } from '../src/templates.js'
import { effectCallbackInput, effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	effectReturningCallbackType,
	marker,
	scheduleType,
	streamType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'

const streamInput = (description: string, success = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, streamType(success, error, requirements))

export const StreamFromIterableTemplate = defineTemplate({
	modelId: 'StreamFromIterable', version: '1.0.0', description: 'Creates an infallible Stream from an Iterable.',
	typeParameters: typeParameters(['A', 'Stream element type.']),
	inputs: { iterable: effectValueInput('Iterable source.', { ts: 'Iterable<{{A}}>' }) },
	output: expressionOutput('Iterable-backed Stream.', streamType('{{A}}', 'never', 'never')),
	source: `Stream.fromIterable(${marker('expression', 'iterable', '[]')})`
})

export const StreamFromEffectTemplate = defineTemplate({
	modelId: 'StreamFromEffect', version: '1.0.0', description: 'Creates a single-element Stream from an Effect.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { effect: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Effect-backed Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.fromEffect(${marker('expression', 'effect', 'Effect.void')})`
})

export const StreamPaginateTemplate = defineTemplate({
	modelId: 'StreamPaginate', version: '1.0.0', description: 'Unfolds a pure paginated state transition into a Stream.',
	typeParameters: typeParameters(['S', 'Pagination state type.'], ['A', 'Element type.']),
	inputs: { initial: valueInput('Initial pagination state.', { ts: '{{S}}' }), next: effectCallbackInput('Pure callback returning [element, Option<nextState>].') },
	output: expressionOutput('Paginated Stream.', streamType('{{A}}', 'never', 'never')),
	source: `Stream.paginate(${marker('expression', 'initial', 'undefined')}, ${marker('expression', 'next', 'state => [state, Option.none()]')})`
})

export const StreamMapEffectTemplate = defineTemplate({
	modelId: 'StreamMapEffect', version: '1.0.0', description: 'Maps each Stream element with an Effect-producing callback.',
	typeParameters: typeParameters(['A', 'Source element type.'], ['B', 'Mapped element type.'], ['E', 'Source error type.'], ['R', 'Source requirements.'], ['E2', 'Mapping error type.'], ['R2', 'Mapping requirements.']),
	inputs: { stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'), transform: effectCallbackInput('Effectful element transformation.', effectReturningCallbackType('value: {{A}}', '{{B}}', '{{E2}}', '{{R2}}')) },
	output: expressionOutput('Effect-mapped Stream.', streamType('{{B}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Stream.mapEffect(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'transform', 'value => Effect.succeed(value)')})`
})

export const StreamFilterTemplate = defineTemplate({
	modelId: 'StreamFilter', version: '1.0.0', description: 'Keeps Stream elements matching a pure predicate.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Source Stream.', '{{A}}', '{{E}}', '{{R}}'), predicate: effectCallbackInput('Pure element predicate.', { ts: '(value: {{A}}) => boolean' }) },
	output: expressionOutput('Filtered Stream.', streamType('{{A}}', '{{E}}', '{{R}}')),
	source: `Stream.filter(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'predicate', '() => true')})`
})

export const StreamRetryTemplate = defineTemplate({
	modelId: 'StreamRetry', version: '1.0.0', description: 'Retries a failing Stream according to a Schedule.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Stream requirements.'], ['R2', 'Schedule requirements.']),
	inputs: { stream: streamInput('Stream to retry.', '{{A}}', '{{E}}', '{{R}}'), schedule: typedExpressionInput('Retry Schedule.', scheduleType('unknown', '{{E}}', '{{R2}}')) },
	output: expressionOutput('Retried Stream.', streamType('{{A}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `Stream.retry(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'schedule', 'Schedule.recurs(1)')})`
})

export const StreamRunCollectTemplate = defineTemplate({
	modelId: 'StreamRunCollect', version: '1.0.0', description: 'Consumes a Stream into a Chunk.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { stream: streamInput('Stream to collect.', '{{A}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Stream collection Effect.', effectType('unknown', '{{E}}', '{{R}}')),
	source: `Stream.runCollect(${marker('expression', 'stream', 'Stream.empty')})`
})

export const StreamRunForEachTemplate = defineTemplate({
	modelId: 'StreamRunForEach', version: '1.0.0', description: 'Consumes every Stream element with an Effectful callback.',
	typeParameters: typeParameters(['A', 'Element type.'], ['E', 'Stream error type.'], ['R', 'Stream requirements.'], ['E2', 'Consumer error type.'], ['R2', 'Consumer requirements.']),
	inputs: { stream: streamInput('Stream to consume.', '{{A}}', '{{E}}', '{{R}}'), consume: effectCallbackInput('Effectful element consumer.', effectReturningCallbackType('value: {{A}}', 'unknown', '{{E2}}', '{{R2}}')) },
	output: expressionOutput('Stream consumption Effect.', effectType('void', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Stream.runForEach(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'consume', '() => Effect.void')})`
})

export const effectStreamGraphTemplateInputs = [
	StreamFromIterableTemplate, StreamFromEffectTemplate, StreamPaginateTemplate, StreamMapEffectTemplate,
	StreamFilterTemplate, StreamRetryTemplate, StreamRunCollectTemplate, StreamRunForEachTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
