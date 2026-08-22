import { defineTemplate } from '../src/templates.js'
import type { InputPort, OutputPort, TemplateTypeParameterDefinition } from '../src/templates.js'
import type { GraphTemplateDefinitionInput } from '../src/templates/definition.js'

// Adjust these two relative paths to the filenames used in your template package.
import { effectSourceInput, effectType } from './effect-ts.js'
import {
	esToolkitArrayInput,
	esToolkitCallbackInput,
	esToolkitExpressionInput,
	esToolkitKeyArrayInput,
	esToolkitNonNegativeIntegerInput,
	esToolkitPositiveIntegerInput
} from './es-toolkit-templates.js'

/**
 * Effect + es-toolkit convenience templates.
 *
 * Runtime contract:
 *   import { Effect } from 'effect'
 *   import * as esToolkit from 'es-toolkit'
 *
 * These nodes only transform the success channel with Effect.map. They do not
 * use es-toolkit promise/retry/timing utilities; Effect remains authoritative
 * for failure, concurrency, scheduling, cancellation, and resources.
 */

export type AnyEffectEsToolkitGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
	string,
	Record<string, InputPort>,
	OutputPort,
	Record<string, TemplateTypeParameterDefinition> | undefined
>

const marker = (id: string, fallback: string): string =>
	`/** @TYPE expression id=${id} **/${fallback}/** @END **/`

const effectChannelTypeParameters = {
	E: { description: 'Expected error type preserved by Effect.map.', constraint: { ts: 'unknown' } },
	R: { description: 'Required service type preserved by Effect.map.', constraint: { ts: 'unknown' } }
} satisfies Record<string, TemplateTypeParameterDefinition>

const mappedSourceInput = (description: string) =>
	effectSourceInput(description, effectType('unknown', '{{E}}', '{{R}}'))

const expressionOutput = (description: string) => ({
	kind: 'expression' as const,
	type: effectType('unknown', '{{E}}', '{{R}}'),
	description
})

export const EffectEsToolkitGroupByTemplate = defineTemplate({
	modelId: 'EffectEsToolkitGroupBy',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success array to an es-toolkit grouped record.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an array.'),
		key: esToolkitCallbackInput('Pure key-producing callback passed to esToolkit.groupBy.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.groupBy.'),
	source: `Effect.map(${marker('source', 'Effect.succeed([])')}, values => esToolkit.groupBy(values, ${marker('key', 'value => String(value)')}))`
})

export const EffectEsToolkitKeyByTemplate = defineTemplate({
	modelId: 'EffectEsToolkitKeyBy',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success array to an es-toolkit key-indexed record.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an array.'),
		key: esToolkitCallbackInput('Pure key-producing callback passed to esToolkit.keyBy.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.keyBy.'),
	source: `Effect.map(${marker('source', 'Effect.succeed([])')}, values => esToolkit.keyBy(values, ${marker('key', 'value => String(value)')}))`
})

export const EffectEsToolkitUniqByTemplate = defineTemplate({
	modelId: 'EffectEsToolkitUniqBy',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success array to a deduplicated array using es-toolkit uniqBy.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an array.'),
		key: esToolkitCallbackInput('Pure uniqueness projection callback.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.uniqBy.'),
	source: `Effect.map(${marker('source', 'Effect.succeed([])')}, values => esToolkit.uniqBy(values, ${marker('key', 'value => value')}))`
})

export const EffectEsToolkitPartitionTemplate = defineTemplate({
	modelId: 'EffectEsToolkitPartition',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success array to a truthy/falsy partition tuple.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an array.'),
		predicate: esToolkitCallbackInput('Pure partition predicate.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.partition.'),
	source: `Effect.map(${marker('source', 'Effect.succeed([])')}, values => esToolkit.partition(values, ${marker('predicate', '() => true')}))`
})

export const EffectEsToolkitSortByTemplate = defineTemplate({
	modelId: 'EffectEsToolkitSortBy',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success array to a new ascending-sorted array.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an array.'),
		criteria: esToolkitExpressionInput('Criteria array of property keys and/or pure selector functions.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.sortBy.'),
	source: `Effect.map(${marker('source', 'Effect.succeed([])')}, values => esToolkit.sortBy(values, ${marker('criteria', '[]')}))`
})

export const EffectEsToolkitMapValuesTemplate = defineTemplate({
	modelId: 'EffectEsToolkitMapValues',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success object through es-toolkit mapValues.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an object.'),
		transform: esToolkitCallbackInput('Pure value transformation callback.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.mapValues.'),
	source: `Effect.map(${marker('source', 'Effect.succeed({})')}, value => esToolkit.mapValues(value, ${marker('transform', 'item => item')}))`
})

export const EffectEsToolkitPickTemplate = defineTemplate({
	modelId: 'EffectEsToolkitPick',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success object to a top-level key projection with es-toolkit pick.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an object.'),
		keys: esToolkitKeyArrayInput('Top-level keys to keep.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.pick.'),
	source: `Effect.map(${marker('source', 'Effect.succeed({})')}, value => esToolkit.pick(value, ${marker('keys', '[]')}))`
})

export const EffectEsToolkitOmitTemplate = defineTemplate({
	modelId: 'EffectEsToolkitOmit',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success object to a top-level key exclusion with es-toolkit omit.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an object.'),
		keys: esToolkitKeyArrayInput('Top-level keys to exclude.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.omit.'),
	source: `Effect.map(${marker('source', 'Effect.succeed({})')}, value => esToolkit.omit(value, ${marker('keys', '[]')}))`
})

export const EffectEsToolkitSumByTemplate = defineTemplate({
	modelId: 'EffectEsToolkitSumBy',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success array to a numeric sum using es-toolkit sumBy.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an array.'),
		value: esToolkitCallbackInput('Pure numeric projection callback.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.sumBy.'),
	source: `Effect.map(${marker('source', 'Effect.succeed([])')}, values => esToolkit.sumBy(values, ${marker('value', 'item => Number(item)')}))`
})

export const EffectEsToolkitChunkTemplate = defineTemplate({
	modelId: 'EffectEsToolkitChunk',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success array to fixed-size chunks with es-toolkit chunk.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an array.'),
		size: esToolkitPositiveIntegerInput('Positive chunk size.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.chunk.'),
	source: `Effect.map(${marker('source', 'Effect.succeed([])')}, values => esToolkit.chunk(values, ${marker('size', '1')}))`
})

export const EffectEsToolkitTakeTemplate = defineTemplate({
	modelId: 'EffectEsToolkitTake',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Maps an Effect success array to its leading count elements with es-toolkit take.',
	inputs: {
		source: mappedSourceInput('Effect whose success value is an array.'),
		count: esToolkitNonNegativeIntegerInput('Maximum number of leading elements.')
	},
	output: expressionOutput('Effect whose success value is produced by esToolkit.take.'),
	source: `Effect.map(${marker('source', 'Effect.succeed([])')}, values => esToolkit.take(values, ${marker('count', '0')}))`
})

/**
 * Generic escape hatch for a pure success-channel transformation.
 * Prefer specific nodes above when they describe the operation precisely.
 */
export const EffectEsToolkitTransformTemplate = defineTemplate({
	modelId: 'EffectEsToolkitTransform',
	version: '2.0.0',
	typeParameters: effectChannelTypeParameters,
	description: 'Transforms an Effect success value with a guarded pure callback, typically composed from es-toolkit calls.',
	inputs: {
		source: mappedSourceInput('Source Effect.'),
		transform: esToolkitCallbackInput('Pure callback; may call esToolkit but may not perform Effect or async operations.')
	},
	output: expressionOutput('Effect produced by Effect.map with a pure es-toolkit-oriented transformation.'),
	source: `Effect.map(${marker('source', 'Effect.void')}, ${marker('transform', 'value => value')})`
})

/**
 * Lift an already-produced pure es-toolkit/plain value into Effect when a graph
 * boundary requires Effect semantics after a pure transformation.
 */
export const EffectEsToolkitSucceedTemplate = defineTemplate({
	modelId: 'EffectEsToolkitSucceed',
	version: '2.0.0',
	description: 'Lifts a pure es-toolkit/plain expression into a successful Effect.',
	inputs: {
		value: esToolkitExpressionInput('Pure value expression to lift into Effect.')
	},
	output: {
		kind: 'expression',
		type: effectType('unknown', 'never', 'never'),
		description: 'Successful Effect containing the pure value.'
	},
	source: `Effect.succeed(${marker('value', 'undefined')})`
})

/**
 * Optional adapter when an array has already been built outside the Effect.
 * This is useful for graph construction but should not replace ordinary
 * Effect.map for values already in the success channel.
 */
export const EffectEsToolkitFromArrayTemplate = defineTemplate({
	modelId: 'EffectEsToolkitFromArray',
	version: '2.0.0',
	description: 'Lifts a pure array expression into a successful Effect.',
	inputs: {
		array: esToolkitArrayInput('Pure array expression to lift.')
	},
	output: {
		kind: 'expression',
		type: effectType('ReadonlyArray<unknown>', 'never', 'never'),
		description: 'Successful Effect containing the array.'
	},
	source: `Effect.succeed(${marker('array', '[]')})`
})

export const effectEsToolkitGraphTemplateInputs = [
	EffectEsToolkitGroupByTemplate,
	EffectEsToolkitKeyByTemplate,
	EffectEsToolkitUniqByTemplate,
	EffectEsToolkitPartitionTemplate,
	EffectEsToolkitSortByTemplate,
	EffectEsToolkitMapValuesTemplate,
	EffectEsToolkitPickTemplate,
	EffectEsToolkitOmitTemplate,
	EffectEsToolkitSumByTemplate,
	EffectEsToolkitChunkTemplate,
	EffectEsToolkitTakeTemplate,
	EffectEsToolkitTransformTemplate,
	EffectEsToolkitSucceedTemplate,
	EffectEsToolkitFromArrayTemplate
] satisfies readonly AnyEffectEsToolkitGraphTemplateDefinitionInput[]
