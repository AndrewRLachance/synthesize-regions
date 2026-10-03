import { defineTemplate } from '../../../authoring/define-template.js'
import type { TypeDescriptor } from 'synthesize-regions'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'

const equivalenceType = (value = 'unknown'): TypeDescriptor => ({
	nominal: 'effect/Equivalence',
	ts: `(self: ${value}, that: ${value}) => boolean`
})

const orderType = (value = 'unknown'): TypeDescriptor => ({
	nominal: 'effect/Order',
	ts: `(self: ${value}, that: ${value}) => -1 | 0 | 1`
})

const equivalenceInput = (description: string, value = 'unknown') =>
	typedExpressionInput(description, equivalenceType(value))

const orderInput = (description: string, value = 'unknown') =>
	typedExpressionInput(description, orderType(value))

const builtInEquivalence = (
	modelId: 'EquivalenceString' | 'EquivalenceNumber' | 'EquivalenceBoolean' | 'EquivalenceBigInt' | 'EquivalenceDate',
	member: 'String' | 'Number' | 'Boolean' | 'BigInt' | 'Date',
	valueType: string
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description: `Uses Effect's built-in ${member} equivalence relation.`,
	inputs: {},
	output: expressionOutput(`${member} Equivalence.`, equivalenceType(valueType)),
	source: `Equivalence.${member}`
})

export const EquivalenceStringTemplate = builtInEquivalence('EquivalenceString', 'String', 'string')
export const EquivalenceNumberTemplate = builtInEquivalence('EquivalenceNumber', 'Number', 'number')
export const EquivalenceBooleanTemplate = builtInEquivalence('EquivalenceBoolean', 'Boolean', 'boolean')
export const EquivalenceBigIntTemplate = builtInEquivalence('EquivalenceBigInt', 'BigInt', 'bigint')
export const EquivalenceDateTemplate = builtInEquivalence('EquivalenceDate', 'Date', 'Date')

export const EquivalenceStrictEqualSymbolTemplate = defineTemplate({
	modelId: 'EquivalenceStrictEqualSymbol',
	version: '1.0.0',
	description: 'Uses strict equality as an Equivalence for symbol values.',
	inputs: {},
	output: expressionOutput('Strict-equality symbol Equivalence.', equivalenceType('symbol')),
	source: 'Equivalence.strictEqual<symbol>()'
})

export const EquivalenceMapInputTemplate = defineTemplate({
	modelId: 'EquivalenceMapInput',
	version: '1.0.0',
	description: 'Derives an Equivalence by projecting input values into a type with an existing Equivalence.',
	typeParameters: typeParameters(['A', 'Input value type.'], ['B', 'Projected comparison type.']),
	inputs: {
		base: equivalenceInput('Base Equivalence for projected values.', '{{B}}'),
		project: callbackInput('Projection used before comparison.', { ts: '(value: {{A}}) => {{B}}' })
	},
	output: expressionOutput('Derived Equivalence.', equivalenceType('{{A}}')),
	source: `Equivalence.mapInput(${marker('expression', 'base', 'Equivalence.String')}, ${marker('expression', 'project', 'value => String(value)')})`
})

export const EquivalenceCompareTemplate = defineTemplate({
	modelId: 'EquivalenceCompare',
	version: '1.0.0',
	description: 'Compares two values with an Equivalence.',
	typeParameters: typeParameters(['A', 'Compared value type.']),
	inputs: {
		equivalence: equivalenceInput('Equivalence used for comparison.', '{{A}}'),
		self: valueInput('First value.', { ts: '{{A}}' }),
		that: valueInput('Second value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Whether the values are equivalent.', { ts: 'boolean', schema: { type: 'boolean' } }),
	source: `(${marker('expression', 'equivalence', 'Equivalence.String')})(${marker('expression', 'self', 'undefined')}, ${marker('expression', 'that', 'undefined')})`
})

const builtInOrder = (
	modelId: 'OrderString' | 'OrderNumber' | 'OrderBigInt' | 'OrderDate',
	member: 'String' | 'Number' | 'BigInt' | 'Date',
	valueType: string
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description: `Uses Effect's built-in ${member} Order.`,
	inputs: {},
	output: expressionOutput(`${member} Order.`, orderType(valueType)),
	source: `Order.${member}`
})

export const OrderStringTemplate = builtInOrder('OrderString', 'String', 'string')
export const OrderNumberTemplate = builtInOrder('OrderNumber', 'Number', 'number')
export const OrderBigIntTemplate = builtInOrder('OrderBigInt', 'BigInt', 'bigint')
export const OrderDateTemplate = builtInOrder('OrderDate', 'Date', 'Date')

export const OrderMapInputTemplate = defineTemplate({
	modelId: 'OrderMapInput',
	version: '1.0.0',
	description: 'Derives an Order by projecting input values into a type with an existing Order.',
	typeParameters: typeParameters(['A', 'Input value type.'], ['B', 'Projected comparison type.']),
	inputs: {
		base: orderInput('Base Order for projected values.', '{{B}}'),
		project: callbackInput('Projection used before comparison.', { ts: '(value: {{A}}) => {{B}}' })
	},
	output: expressionOutput('Derived Order.', orderType('{{A}}')),
	source: `Order.mapInput(${marker('expression', 'base', 'Order.String')}, ${marker('expression', 'project', 'value => String(value)')})`
})

export const OrderCombineTemplate = defineTemplate({
	modelId: 'OrderCombine',
	version: '1.0.0',
	description: 'Combines two Orders lexicographically, using the second when the first compares equal.',
	typeParameters: typeParameters(['A', 'Ordered value type.']),
	inputs: {
		primary: orderInput('Primary Order.', '{{A}}'),
		secondary: orderInput('Secondary tie-breaking Order.', '{{A}}')
	},
	output: expressionOutput('Combined Order.', orderType('{{A}}')),
	source: `Order.combine(${marker('expression', 'primary', 'Order.String')}, ${marker('expression', 'secondary', 'Order.String')})`
})

export const OrderFlipTemplate = defineTemplate({
	modelId: 'OrderFlip',
	version: '1.0.0',
	description: 'Reverses an Order.',
	typeParameters: typeParameters(['A', 'Ordered value type.']),
	inputs: { order: orderInput('Order to reverse.', '{{A}}') },
	output: expressionOutput('Reversed Order.', orderType('{{A}}')),
	source: `Order.flip(${marker('expression', 'order', 'Order.String')})`
})

export const OrderCompareTemplate = defineTemplate({
	modelId: 'OrderCompare',
	version: '1.0.0',
	description: 'Compares two values with an Order and returns -1, 0, or 1.',
	typeParameters: typeParameters(['A', 'Compared value type.']),
	inputs: {
		order: orderInput('Order used for comparison.', '{{A}}'),
		first: valueInput('First value.', { ts: '{{A}}' }),
		second: valueInput('Second value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Ordering result.', { ts: '-1 | 0 | 1' }),
	source: `(${marker('expression', 'order', 'Order.String')})(${marker('expression', 'first', 'undefined')}, ${marker('expression', 'second', 'undefined')})`
})

export const ArraySortWithOrderTemplate = defineTemplate({
	modelId: 'ArraySortWithOrder',
	version: '1.0.0',
	description: 'Sorts an array with Effect Array.sort without mutating the input array.',
	importRequirements: [
		{ schemaVersion: 1, moduleSpecifier: 'effect', importKind: 'named', importedName: 'Array', localName: 'Array', typeOnly: false },
		{ schemaVersion: 1, moduleSpecifier: 'effect', importKind: 'named', importedName: 'Order', localName: 'Order', typeOnly: false }
	],
	typeParameters: typeParameters(['A', 'Array element type.']),
	inputs: {
		array: valueInput('Array to sort.', { ts: 'ReadonlyArray<{{A}}>' }),
		order: orderInput('Order used for sorting.', '{{A}}')
	},
	output: expressionOutput('Sorted array.', { ts: 'ReadonlyArray<{{A}}>', schema: { type: 'array' } }),
	source: `Array.sort(${marker('expression', 'array', '[]')}, ${marker('expression', 'order', 'Order.String')})`
})

const orderPredicateTemplate = (
	modelId: 'OrderIsLessThan' | 'OrderIsGreaterThan' | 'OrderIsLessThanOrEqualTo' | 'OrderIsGreaterThanOrEqualTo',
	method: 'isLessThan' | 'isGreaterThan' | 'isLessThanOrEqualTo' | 'isGreaterThanOrEqualTo',
	description: string
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	typeParameters: typeParameters(['A', 'Compared value type.']),
	inputs: {
		order: orderInput('Order used for comparison.', '{{A}}'),
		self: valueInput('First value.', { ts: '{{A}}' }),
		that: valueInput('Second value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Comparison predicate result.', { ts: 'boolean', schema: { type: 'boolean' } }),
	source: `Order.${method}(${marker('expression', 'order', 'Order.Number')})(${marker('expression', 'self', 'undefined')}, ${marker('expression', 'that', 'undefined')})`
})

export const OrderIsLessThanTemplate = orderPredicateTemplate('OrderIsLessThan', 'isLessThan', 'Checks whether the first value is strictly less than the second.')
export const OrderIsGreaterThanTemplate = orderPredicateTemplate('OrderIsGreaterThan', 'isGreaterThan', 'Checks whether the first value is strictly greater than the second.')
export const OrderIsLessThanOrEqualToTemplate = orderPredicateTemplate('OrderIsLessThanOrEqualTo', 'isLessThanOrEqualTo', 'Checks whether the first value is less than or equal to the second.')
export const OrderIsGreaterThanOrEqualToTemplate = orderPredicateTemplate('OrderIsGreaterThanOrEqualTo', 'isGreaterThanOrEqualTo', 'Checks whether the first value is greater than or equal to the second.')

const orderSelectTemplate = (
	modelId: 'OrderMin' | 'OrderMax',
	method: 'min' | 'max',
	description: string
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	typeParameters: typeParameters(['A', 'Ordered value type.']),
	inputs: {
		order: orderInput('Order used to select the value.', '{{A}}'),
		self: valueInput('First value.', { ts: '{{A}}' }),
		that: valueInput('Second value.', { ts: '{{A}}' })
	},
	output: expressionOutput(`${method === 'min' ? 'Minimum' : 'Maximum'} value.`, { ts: '{{A}}' }),
	source: `Order.${method}(${marker('expression', 'order', 'Order.Number')})(${marker('expression', 'self', 'undefined')}, ${marker('expression', 'that', 'undefined')})`
})

export const OrderMinTemplate = orderSelectTemplate('OrderMin', 'min', 'Selects the minimum of two values according to an Order.')
export const OrderMaxTemplate = orderSelectTemplate('OrderMax', 'max', 'Selects the maximum of two values according to an Order.')

export const OrderClampTemplate = defineTemplate({
	modelId: 'OrderClamp',
	version: '1.0.0',
	description: 'Clamps a value to an inclusive minimum and maximum according to an Order.',
	typeParameters: typeParameters(['A', 'Ordered value type.']),
	inputs: {
		order: orderInput('Order used for clamping.', '{{A}}'),
		minimum: valueInput('Minimum allowed value.', { ts: '{{A}}' }),
		maximum: valueInput('Maximum allowed value.', { ts: '{{A}}' }),
		value: valueInput('Value to clamp.', { ts: '{{A}}' })
	},
	output: expressionOutput('Clamped value.', { ts: '{{A}}' }),
	source: `Order.clamp(${marker('expression', 'order', 'Order.Number')})({ minimum: ${marker('expression', 'minimum', 'undefined')}, maximum: ${marker('expression', 'maximum', 'undefined')} })(${marker('expression', 'value', 'undefined')})`
})

export const OrderIsBetweenTemplate = defineTemplate({
	modelId: 'OrderIsBetween',
	version: '1.0.0',
	description: 'Checks whether a value lies within an inclusive range according to an Order.',
	typeParameters: typeParameters(['A', 'Ordered value type.']),
	inputs: {
		order: orderInput('Order used for the range check.', '{{A}}'),
		minimum: valueInput('Minimum inclusive value.', { ts: '{{A}}' }),
		maximum: valueInput('Maximum inclusive value.', { ts: '{{A}}' }),
		value: valueInput('Value to test.', { ts: '{{A}}' })
	},
	output: expressionOutput('Whether the value is in range.', { ts: 'boolean', schema: { type: 'boolean' } }),
	source: `Order.isBetween(${marker('expression', 'order', 'Order.Number')})({ minimum: ${marker('expression', 'minimum', 'undefined')}, maximum: ${marker('expression', 'maximum', 'undefined')} })(${marker('expression', 'value', 'undefined')})`
})

export const effectBehaviourGraphTemplateInputs = [
	EquivalenceStringTemplate,
	EquivalenceNumberTemplate,
	EquivalenceBooleanTemplate,
	EquivalenceBigIntTemplate,
	EquivalenceDateTemplate,
	EquivalenceStrictEqualSymbolTemplate,
	EquivalenceMapInputTemplate,
	EquivalenceCompareTemplate,
	OrderStringTemplate,
	OrderNumberTemplate,
	OrderBigIntTemplate,
	OrderDateTemplate,
	OrderMapInputTemplate,
	OrderCombineTemplate,
	OrderFlipTemplate,
	OrderCompareTemplate,
	ArraySortWithOrderTemplate,
	OrderIsLessThanTemplate,
	OrderIsGreaterThanTemplate,
	OrderIsLessThanOrEqualToTemplate,
	OrderIsGreaterThanOrEqualToTemplate,
	OrderMinTemplate,
	OrderMaxTemplate,
	OrderClampTemplate,
	OrderIsBetweenTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
