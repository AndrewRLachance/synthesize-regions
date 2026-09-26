import { defineTemplate } from './sample-definition.js'
import {
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from '../src/templates.js'
import type {
	InputPort,
	RawCodePolicy
} from '../src/templates.js'
import type { GraphTemplateDefinitionInput } from '../src/templates/definition.js'

/**
 * Foundational es-toolkit graph templates.
 *
 * Runtime contract:
 *   import * as esToolkit from 'es-toolkit'
 *
 * The generated source intentionally uses a namespace binding instead of
 * free function names so AST policy can distinguish es-toolkit calls from
 * native or Effect calls.
 */

export type AnyEsToolkitGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
	string,
	Record<string, InputPort>
>

export const ES_TOOLKIT_RUNTIME_BINDING = 'esToolkit' as const

const PURE_FORBIDDEN_SUBSTRINGS = [
	'import',
	'require',
	'process',
	'globalThis',
	'Function',
	'eval',
	'Effect.',
	'Promise',
	'await',
	'yield',
	'fetch',
	'XMLHttpRequest',
	'WebSocket',
	'setTimeout',
	'setInterval',
	'Math.random',
	'Date.now',
	'new Date',
	'crypto'
] as const

export const esToolkitExpressionPolicy: RawCodePolicy = {
	description: 'Single-line pure value expression used by an es-toolkit transform. Module loading, ambient I/O, nondeterminism, Effect operations, and async constructs are rejected.',
	maxLength: 900,
	allowNewlines: false,
	forbiddenSubstrings: [...PURE_FORBIDDEN_SUBSTRINGS]
}

export const esToolkitCallbackPolicy: RawCodePolicy = {
	description: 'Pure callback supplied to an es-toolkit transform. Module loading, ambient I/O, nondeterminism, Effect operations, and async constructs are rejected.',
	maxLength: 1800,
	allowNewlines: true,
	forbiddenSubstrings: [...PURE_FORBIDDEN_SUBSTRINGS]
}

const expressionFragment = (description: string) => fragmentPort({
	regionKind: 'expression',
	accepts: { outputKind: 'expression' },
	description
})

const rawExpression = (description: string) => rawCodePort({
	regionKind: 'expression',
	policy: esToolkitExpressionPolicy,
	description
})

const rawCallback = (description: string) => rawCodePort({
	regionKind: 'expression',
	policy: esToolkitCallbackPolicy,
	description
})

/** Accept a generated expression or guarded pure raw expression. */
export const esToolkitExpressionInput = (description = 'Pure value expression.') => unionPort({
	options: [expressionFragment(description), rawExpression(description)],
	description
})

/** Accept a JSON array literal, generated expression, or guarded pure raw expression. */
export const esToolkitArrayInput = (description = 'Array expression.') => unionPort({
	options: [
		literalPort({
			regionKind: 'expression',
			schema: { type: 'array' },
			description
		}),
		expressionFragment(description),
		rawExpression(description)
	],
	description
})

/** Accept a JSON object literal, generated expression, or guarded pure raw expression. */
export const esToolkitObjectInput = (description = 'Object expression.') => unionPort({
	options: [
		literalPort({
			regionKind: 'expression',
			schema: { type: 'object' },
			description
		}),
		expressionFragment(description),
		rawExpression(description)
	],
	description
})

/** Accept a generated callback expression or guarded pure raw callback. */
export const esToolkitCallbackInput = (description = 'Pure callback expression.') => unionPort({
	options: [expressionFragment(description), rawCallback(description)],
	description
})

/** Positive integer literal or generated expression. */
export const esToolkitPositiveIntegerInput = (description = 'Positive integer expression.') => unionPort({
	options: [
		literalPort({
			regionKind: 'expression',
			schema: { type: 'integer', minimum: 1 },
			description
		}),
		expressionFragment(description),
		rawExpression(description)
	],
	description
})

/** Non-negative integer literal or generated expression. */
export const esToolkitNonNegativeIntegerInput = (description = 'Non-negative integer expression.') => unionPort({
	options: [
		literalPort({
			regionKind: 'expression',
			schema: { type: 'integer', minimum: 0 },
			description
		}),
		expressionFragment(description),
		rawExpression(description)
	],
	description
})

/** Object property keys represented as a JSON string array or generated expression. */
export const esToolkitKeyArrayInput = (description = 'Object keys expression.') => unionPort({
	options: [
		literalPort({
			regionKind: 'expression',
			schema: { type: 'array', items: { type: 'string' } },
			description
		}),
		expressionFragment(description),
		rawExpression(description)
	],
	description
})

const marker = (id: string, fallback: string): string =>
	`/** @TYPE expression id=${id} **/${fallback}/** @END **/`

const expressionOutput = (description: string) => ({ kind: 'expression' as const, description })

// Array shape and set operations ------------------------------------------------

export const EsToolkitChunkTemplate = defineTemplate({
	modelId: 'EsToolkitChunk',
	version: '1.0.0',
	description: 'Splits an array into chunks of a positive size with es-toolkit chunk.',
	inputs: {
		array: esToolkitArrayInput('Array to split into chunks.'),
		size: esToolkitPositiveIntegerInput('Positive chunk size.')
	},
	output: expressionOutput('Chunked array produced by esToolkit.chunk.'),
	source: `esToolkit.chunk(${marker('array', '[]')}, ${marker('size', '1')})`
})

export const EsToolkitCompactTemplate = defineTemplate({
	modelId: 'EsToolkitCompact',
	version: '1.0.0',
	description: 'Removes falsy values from an array with es-toolkit compact.',
	inputs: { array: esToolkitArrayInput('Array whose falsy values are removed.') },
	output: expressionOutput('Compacted array produced by esToolkit.compact.'),
	source: `esToolkit.compact(${marker('array', '[]')})`
})

export const EsToolkitDifferenceTemplate = defineTemplate({
	modelId: 'EsToolkitDifference',
	version: '1.0.0',
	description: 'Returns values present in the left array and absent from the right array.',
	inputs: {
		left: esToolkitArrayInput('Source array.'),
		right: esToolkitArrayInput('Values to exclude.')
	},
	output: expressionOutput('Array difference produced by esToolkit.difference.'),
	source: `esToolkit.difference(${marker('left', '[]')}, ${marker('right', '[]')})`
})

export const EsToolkitIntersectionTemplate = defineTemplate({
	modelId: 'EsToolkitIntersection',
	version: '1.0.0',
	description: 'Returns values shared by two arrays.',
	inputs: {
		left: esToolkitArrayInput('First array.'),
		right: esToolkitArrayInput('Second array.')
	},
	output: expressionOutput('Array intersection produced by esToolkit.intersection.'),
	source: `esToolkit.intersection(${marker('left', '[]')}, ${marker('right', '[]')})`
})

export const EsToolkitFlattenTemplate = defineTemplate({
	modelId: 'EsToolkitFlatten',
	version: '1.0.0',
	description: 'Flattens one nesting level of an array.',
	inputs: { array: esToolkitArrayInput('Nested array to flatten by one level.') },
	output: expressionOutput('Flattened array produced by esToolkit.flatten.'),
	source: `esToolkit.flatten(${marker('array', '[]')})`
})

export const EsToolkitTakeTemplate = defineTemplate({
	modelId: 'EsToolkitTake',
	version: '1.0.0',
	description: 'Returns the first count elements of an array.',
	inputs: {
		array: esToolkitArrayInput('Source array.'),
		count: esToolkitNonNegativeIntegerInput('Maximum number of leading elements.')
	},
	output: expressionOutput('Leading array slice produced by esToolkit.take.'),
	source: `esToolkit.take(${marker('array', '[]')}, ${marker('count', '0')})`
})

export const EsToolkitDropTemplate = defineTemplate({
	modelId: 'EsToolkitDrop',
	version: '1.0.0',
	description: 'Drops the first count elements of an array.',
	inputs: {
		array: esToolkitArrayInput('Source array.'),
		count: esToolkitNonNegativeIntegerInput('Number of leading elements to drop.')
	},
	output: expressionOutput('Trailing array slice produced by esToolkit.drop.'),
	source: `esToolkit.drop(${marker('array', '[]')}, ${marker('count', '0')})`
})

export const EsToolkitUniqTemplate = defineTemplate({
	modelId: 'EsToolkitUniq',
	version: '1.0.0',
	description: 'Removes duplicate array values while preserving first-occurrence order.',
	inputs: { array: esToolkitArrayInput('Array to deduplicate.') },
	output: expressionOutput('Deduplicated array produced by esToolkit.uniq.'),
	source: `esToolkit.uniq(${marker('array', '[]')})`
})

export const EsToolkitUniqByTemplate = defineTemplate({
	modelId: 'EsToolkitUniqBy',
	version: '1.0.0',
	description: 'Removes duplicate array elements using a pure key-producing callback.',
	inputs: {
		array: esToolkitArrayInput('Array to deduplicate.'),
		key: esToolkitCallbackInput('Pure key mapper used to identify duplicates.')
	},
	output: expressionOutput('Deduplicated array produced by esToolkit.uniqBy.'),
	source: `esToolkit.uniqBy(${marker('array', '[]')}, ${marker('key', 'value => value')})`
})

// Grouping, indexing, partitioning, and sorting --------------------------------

export const EsToolkitGroupByTemplate = defineTemplate({
	modelId: 'EsToolkitGroupBy',
	version: '1.0.0',
	description: 'Groups array elements into an object by a pure key-producing callback.',
	inputs: {
		array: esToolkitArrayInput('Array to group.'),
		key: esToolkitCallbackInput('Pure callback returning a PropertyKey-compatible group key.')
	},
	output: expressionOutput('Grouped record produced by esToolkit.groupBy.'),
	source: `esToolkit.groupBy(${marker('array', '[]')}, ${marker('key', 'value => String(value)')})`
})

export const EsToolkitKeyByTemplate = defineTemplate({
	modelId: 'EsToolkitKeyBy',
	version: '1.0.0',
	description: 'Indexes array elements into an object by a pure key-producing callback; later duplicate keys replace earlier values.',
	inputs: {
		array: esToolkitArrayInput('Array to index.'),
		key: esToolkitCallbackInput('Pure callback returning a PropertyKey-compatible index key.')
	},
	output: expressionOutput('Indexed record produced by esToolkit.keyBy.'),
	source: `esToolkit.keyBy(${marker('array', '[]')}, ${marker('key', 'value => String(value)')})`
})

export const EsToolkitPartitionTemplate = defineTemplate({
	modelId: 'EsToolkitPartition',
	version: '1.0.0',
	description: 'Partitions an array into truthy-match and falsy-match arrays.',
	inputs: {
		array: esToolkitArrayInput('Array to partition.'),
		predicate: esToolkitCallbackInput('Pure partition predicate.')
	},
	output: expressionOutput('Two-element tuple produced by esToolkit.partition.'),
	source: `esToolkit.partition(${marker('array', '[]')}, ${marker('predicate', '() => true')})`
})

export const EsToolkitSortByTemplate = defineTemplate({
	modelId: 'EsToolkitSortBy',
	version: '1.0.0',
	description: 'Returns a new array sorted ascending by an ordered criteria array of property keys and/or pure selector functions.',
	inputs: {
		array: esToolkitArrayInput('Array to sort.'),
		criteria: esToolkitExpressionInput('Criteria array containing property keys and/or pure selector functions.')
	},
	output: expressionOutput('Sorted array produced by esToolkit.sortBy.'),
	source: `esToolkit.sortBy(${marker('array', '[]')}, ${marker('criteria', '[]')})`
})

export const EsToolkitOrderByTemplate = defineTemplate({
	modelId: 'EsToolkitOrderBy',
	version: '1.0.0',
	description: 'Returns a new array sorted by ordered criteria and explicit ascending/descending directions.',
	inputs: {
		array: esToolkitArrayInput('Array to sort.'),
		criteria: esToolkitExpressionInput('Criteria array containing property keys and/or pure selector functions.'),
		orders: esToolkitExpressionInput('Sort directions array such as ["asc", "desc"].')
	},
	output: expressionOutput('Sorted array produced by esToolkit.orderBy.'),
	source: `esToolkit.orderBy(${marker('array', '[]')}, ${marker('criteria', '[]')}, ${marker('orders', '["asc"]')})`
})

// Object transforms ------------------------------------------------------------

export const EsToolkitMapValuesTemplate = defineTemplate({
	modelId: 'EsToolkitMapValues',
	version: '1.0.0',
	description: 'Creates a new object by transforming each value while preserving keys.',
	inputs: {
		object: esToolkitObjectInput('Object whose values are transformed.'),
		transform: esToolkitCallbackInput('Pure value transformation receiving value, key, and source object.')
	},
	output: expressionOutput('Object produced by esToolkit.mapValues.'),
	source: `esToolkit.mapValues(${marker('object', '{}')}, ${marker('transform', 'value => value')})`
})

export const EsToolkitMapKeysTemplate = defineTemplate({
	modelId: 'EsToolkitMapKeys',
	version: '1.0.0',
	description: 'Creates a new object by transforming each key while preserving values.',
	inputs: {
		object: esToolkitObjectInput('Object whose keys are transformed.'),
		transform: esToolkitCallbackInput('Pure key transformation callback.')
	},
	output: expressionOutput('Object produced by esToolkit.mapKeys.'),
	source: `esToolkit.mapKeys(${marker('object', '{}')}, ${marker('transform', '(value, key) => key')})`
})

export const EsToolkitPickTemplate = defineTemplate({
	modelId: 'EsToolkitPick',
	version: '1.0.0',
	description: 'Creates a new object containing only the requested top-level keys.',
	inputs: {
		object: esToolkitObjectInput('Object to project.'),
		keys: esToolkitKeyArrayInput('Top-level property keys to keep.')
	},
	output: expressionOutput('Projected object produced by esToolkit.pick.'),
	source: `esToolkit.pick(${marker('object', '{}')}, ${marker('keys', '[]')})`
})

export const EsToolkitOmitTemplate = defineTemplate({
	modelId: 'EsToolkitOmit',
	version: '1.0.0',
	description: 'Creates a new object excluding the requested top-level keys.',
	inputs: {
		object: esToolkitObjectInput('Object to project.'),
		keys: esToolkitKeyArrayInput('Top-level property keys to exclude.')
	},
	output: expressionOutput('Projected object produced by esToolkit.omit.'),
	source: `esToolkit.omit(${marker('object', '{}')}, ${marker('keys', '[]')})`
})

export const EsToolkitPickByTemplate = defineTemplate({
	modelId: 'EsToolkitPickBy',
	version: '1.0.0',
	description: 'Creates a new object containing entries accepted by a pure predicate.',
	inputs: {
		object: esToolkitObjectInput('Object to filter.'),
		predicate: esToolkitCallbackInput('Pure predicate over object entries.')
	},
	output: expressionOutput('Filtered object produced by esToolkit.pickBy.'),
	source: `esToolkit.pickBy(${marker('object', '{}')}, ${marker('predicate', '() => true')})`
})

export const EsToolkitOmitByTemplate = defineTemplate({
	modelId: 'EsToolkitOmitBy',
	version: '1.0.0',
	description: 'Creates a new object excluding entries accepted by a pure predicate.',
	inputs: {
		object: esToolkitObjectInput('Object to filter.'),
		predicate: esToolkitCallbackInput('Pure predicate over object entries to exclude.')
	},
	output: expressionOutput('Filtered object produced by esToolkit.omitBy.'),
	source: `esToolkit.omitBy(${marker('object', '{}')}, ${marker('predicate', '() => false')})`
})

export const EsToolkitToMergedTemplate = defineTemplate({
	modelId: 'EsToolkitToMerged',
	version: '1.0.0',
	description: 'Deeply merges two objects without mutating either input.',
	inputs: {
		left: esToolkitObjectInput('Base object.'),
		right: esToolkitObjectInput('Object merged over the base object.')
	},
	output: expressionOutput('New deeply merged object produced by esToolkit.toMerged.'),
	source: `esToolkit.toMerged(${marker('left', '{}')}, ${marker('right', '{}')})`
})

// Numeric aggregation ----------------------------------------------------------

export const EsToolkitSumTemplate = defineTemplate({
	modelId: 'EsToolkitSum',
	version: '1.0.0',
	description: 'Sums numeric values in an array.',
	inputs: { array: esToolkitArrayInput('Numeric array to sum.') },
	output: expressionOutput('Numeric sum produced by esToolkit.sum.'),
	source: `esToolkit.sum(${marker('array', '[]')})`
})

export const EsToolkitSumByTemplate = defineTemplate({
	modelId: 'EsToolkitSumBy',
	version: '1.0.0',
	description: 'Maps array elements to numbers with a pure callback and returns their sum.',
	inputs: {
		array: esToolkitArrayInput('Array whose elements contribute to the sum.'),
		value: esToolkitCallbackInput('Pure numeric projection callback.')
	},
	output: expressionOutput('Numeric sum produced by esToolkit.sumBy.'),
	source: `esToolkit.sumBy(${marker('array', '[]')}, ${marker('value', 'value => Number(value)')})`
})

export const EsToolkitMeanByTemplate = defineTemplate({
	modelId: 'EsToolkitMeanBy',
	version: '1.0.0',
	description: 'Maps array elements to numbers with a pure callback and returns their arithmetic mean.',
	inputs: {
		array: esToolkitArrayInput('Array whose elements contribute to the mean.'),
		value: esToolkitCallbackInput('Pure numeric projection callback.')
	},
	output: expressionOutput('Numeric mean produced by esToolkit.meanBy.'),
	source: `esToolkit.meanBy(${marker('array', '[]')}, ${marker('value', 'value => Number(value)')})`
})

export const EsToolkitMinByTemplate = defineTemplate({
	modelId: 'EsToolkitMinBy',
	version: '1.0.0',
	description: 'Returns the array element with the minimum projected value.',
	inputs: {
		array: esToolkitArrayInput('Array to search.'),
		value: esToolkitCallbackInput('Pure ordering projection callback.')
	},
	output: expressionOutput('Minimum element produced by esToolkit.minBy.'),
	source: `esToolkit.minBy(${marker('array', '[]')}, ${marker('value', 'value => value')})`
})

export const EsToolkitMaxByTemplate = defineTemplate({
	modelId: 'EsToolkitMaxBy',
	version: '1.0.0',
	description: 'Returns the array element with the maximum projected value.',
	inputs: {
		array: esToolkitArrayInput('Array to search.'),
		value: esToolkitCallbackInput('Pure ordering projection callback.')
	},
	output: expressionOutput('Maximum element produced by esToolkit.maxBy.'),
	source: `esToolkit.maxBy(${marker('array', '[]')}, ${marker('value', 'value => value')})`
})

// Predicates -------------------------------------------------------------------

export const EsToolkitIsEqualTemplate = defineTemplate({
	modelId: 'EsToolkitIsEqual',
	version: '1.0.0',
	description: 'Performs deep equality comparison between two values.',
	inputs: {
		left: esToolkitExpressionInput('First value.'),
		right: esToolkitExpressionInput('Second value.')
	},
	output: expressionOutput('Boolean produced by esToolkit.isEqual.'),
	source: `esToolkit.isEqual(${marker('left', 'undefined')}, ${marker('right', 'undefined')})`
})

export const EsToolkitIsNilTemplate = defineTemplate({
	modelId: 'EsToolkitIsNil',
	version: '1.0.0',
	description: 'Checks whether a value is null or undefined.',
	inputs: { value: esToolkitExpressionInput('Value to test.') },
	output: expressionOutput('Boolean produced by esToolkit.isNil.'),
	source: `esToolkit.isNil(${marker('value', 'undefined')})`
})

export const EsToolkitIsNotNilTemplate = defineTemplate({
	modelId: 'EsToolkitIsNotNil',
	version: '1.0.0',
	description: 'Checks whether a value is neither null nor undefined.',
	inputs: { value: esToolkitExpressionInput('Value to test.') },
	output: expressionOutput('Boolean produced by esToolkit.isNotNil.'),
	source: `esToolkit.isNotNil(${marker('value', 'undefined')})`
})

// String normalization ---------------------------------------------------------

const stringTransformTemplate = <const M extends string>(
	modelId: M,
	method: 'camelCase' | 'kebabCase' | 'snakeCase' | 'startCase' | 'trim',
	description: string
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	inputs: { value: esToolkitExpressionInput('String expression to transform.') },
	output: expressionOutput(`String produced by esToolkit.${method}.`),
	source: `esToolkit.${method}(${marker('value', '""')})`
})

export const EsToolkitCamelCaseTemplate = stringTransformTemplate(
	'EsToolkitCamelCase',
	'camelCase',
	'Converts a string to camelCase.'
)

export const EsToolkitKebabCaseTemplate = stringTransformTemplate(
	'EsToolkitKebabCase',
	'kebabCase',
	'Converts a string to kebab-case.'
)

export const EsToolkitSnakeCaseTemplate = stringTransformTemplate(
	'EsToolkitSnakeCase',
	'snakeCase',
	'Converts a string to snake_case.'
)

export const EsToolkitStartCaseTemplate = stringTransformTemplate(
	'EsToolkitStartCase',
	'startCase',
	'Converts a string to Start Case.'
)

export const EsToolkitTrimTemplate = stringTransformTemplate(
	'EsToolkitTrim',
	'trim',
	'Trims leading and trailing whitespace from a string.'
)

export const esToolkitGraphTemplateInputs = [
	EsToolkitChunkTemplate,
	EsToolkitCompactTemplate,
	EsToolkitDifferenceTemplate,
	EsToolkitIntersectionTemplate,
	EsToolkitFlattenTemplate,
	EsToolkitTakeTemplate,
	EsToolkitDropTemplate,
	EsToolkitUniqTemplate,
	EsToolkitUniqByTemplate,
	EsToolkitGroupByTemplate,
	EsToolkitKeyByTemplate,
	EsToolkitPartitionTemplate,
	EsToolkitSortByTemplate,
	EsToolkitOrderByTemplate,
	EsToolkitMapValuesTemplate,
	EsToolkitMapKeysTemplate,
	EsToolkitPickTemplate,
	EsToolkitOmitTemplate,
	EsToolkitPickByTemplate,
	EsToolkitOmitByTemplate,
	EsToolkitToMergedTemplate,
	EsToolkitSumTemplate,
	EsToolkitSumByTemplate,
	EsToolkitMeanByTemplate,
	EsToolkitMinByTemplate,
	EsToolkitMaxByTemplate,
	EsToolkitIsEqualTemplate,
	EsToolkitIsNilTemplate,
	EsToolkitIsNotNilTemplate,
	EsToolkitCamelCaseTemplate,
	EsToolkitKebabCaseTemplate,
	EsToolkitSnakeCaseTemplate,
	EsToolkitStartCaseTemplate,
	EsToolkitTrimTemplate
] satisfies readonly AnyEsToolkitGraphTemplateDefinitionInput[]
