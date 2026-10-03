import { defineTemplate } from './sample-definition.js'
import { effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput
} from './effect-template-helpers.js'
import {
	chunkType,
	expressionCollectionInput
} from './effect-data-type-template-helpers.js'

const chunkInput = (description: string, value = 'unknown') =>
	typedExpressionInput(description, chunkType(value))

export const ChunkEmptyTemplate = defineTemplate({
	modelId: 'ChunkEmpty', version: '1.0.0', description: 'Creates an empty immutable Chunk.',
	inputs: {},
	output: expressionOutput('Empty Chunk.', chunkType('never')),
	source: 'Chunk.empty()'
})

export const ChunkMakeTemplate = defineTemplate({
	modelId: 'ChunkMake', version: '1.0.0', description: 'Creates a non-empty Chunk from one or more values.',
	typeParameters: typeParameters(['A', 'Chunk element type.']),
	inputs: { values: expressionCollectionInput('Chunk values.', { ts: '{{A}}' }) },
	output: expressionOutput('Chunk containing the supplied values.', chunkType('{{A}}')),
	source: `Chunk.make(${marker('expression', 'values', 'undefined')})`
})

export const ChunkFromIterableTemplate = defineTemplate({
	modelId: 'ChunkFromIterable', version: '1.0.0', description: 'Creates a Chunk from an Iterable.',
	typeParameters: typeParameters(['A', 'Chunk element type.']),
	inputs: { iterable: effectValueInput('Iterable source.', { ts: 'Iterable<{{A}}>' }) },
	output: expressionOutput('Chunk created from the iterable.', chunkType('{{A}}')),
	source: `Chunk.fromIterable(${marker('expression', 'iterable', '[]')})`
})

export const ChunkFromArrayUnsafeTemplate = defineTemplate({
	modelId: 'ChunkFromArrayUnsafe', version: '1.0.0', description: 'Creates a Chunk from an Array using the unsafe array constructor.',
	typeParameters: typeParameters(['A', 'Chunk element type.']),
	inputs: { array: effectValueInput('Array source.', { ts: 'Array<{{A}}>' }) },
	output: expressionOutput('Chunk backed by the supplied array.', chunkType('{{A}}')),
	source: `Chunk.fromArrayUnsafe(${marker('expression', 'array', '[]')})`
})

export const ChunkAppendAllTemplate = defineTemplate({
	modelId: 'ChunkAppendAll', version: '1.0.0', description: 'Concatenates two Chunks efficiently.',
	typeParameters: typeParameters(['A', 'Left element type.'], ['B', 'Right element type.']),
	inputs: { left: chunkInput('Left Chunk.', '{{A}}'), right: chunkInput('Right Chunk.', '{{B}}') },
	output: expressionOutput('Concatenated Chunk.', chunkType('{{A}} | {{B}}')),
	source: `Chunk.appendAll(${marker('expression', 'left', 'Chunk.empty()')}, ${marker('expression', 'right', 'Chunk.empty()')})`
})

export const ChunkDropTemplate = defineTemplate({
	modelId: 'ChunkDrop', version: '1.0.0', description: 'Drops the first N elements from a Chunk.',
	typeParameters: typeParameters(['A', 'Chunk element type.']),
	inputs: { chunk: chunkInput('Source Chunk.', '{{A}}'), count: effectValueInput('Number of elements to drop.', { ts: 'number' }) },
	output: expressionOutput('Remaining Chunk.', chunkType('{{A}}')),
	source: `Chunk.drop(${marker('expression', 'chunk', 'Chunk.empty()')}, ${marker('expression', 'count', '0')})`
})

export const ChunkToReadonlyArrayTemplate = defineTemplate({
	modelId: 'ChunkToReadonlyArray', version: '1.0.0', description: 'Converts a Chunk to a readonly Array.',
	typeParameters: typeParameters(['A', 'Chunk element type.']),
	inputs: { chunk: chunkInput('Chunk to convert.', '{{A}}') },
	output: expressionOutput('Readonly Array.', { ts: 'ReadonlyArray<{{A}}>' }),
	source: `Chunk.toReadonlyArray(${marker('expression', 'chunk', 'Chunk.empty()')})`
})

export const ChunkEqualTemplate = defineTemplate({
	modelId: 'ChunkEqual', version: '1.0.0', description: 'Compares two Chunks with Effect structural equality.',
	typeParameters: typeParameters(['A', 'Chunk element type.']),
	inputs: { left: chunkInput('Left Chunk.', '{{A}}'), right: chunkInput('Right Chunk.', '{{A}}') },
	output: expressionOutput('Structural equality result.', { ts: 'boolean' }),
	source: `Equal.equals(${marker('expression', 'left', 'Chunk.empty()')}, ${marker('expression', 'right', 'Chunk.empty()')})`
})

export const effectChunkGraphTemplateInputs = [
	ChunkEmptyTemplate,
	ChunkMakeTemplate,
	ChunkFromIterableTemplate,
	ChunkFromArrayUnsafeTemplate,
	ChunkAppendAllTemplate,
	ChunkDropTemplate,
	ChunkToReadonlyArrayTemplate,
	ChunkEqualTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
