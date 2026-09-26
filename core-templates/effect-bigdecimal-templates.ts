import { defineTemplate } from '../src/templates.js'
import { effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	marker,
	typedExpressionInput
} from './effect-template-helpers.js'
import { bigDecimalType, optionType } from './effect-data-type-template-helpers.js'

const decimalInput = (description: string) => typedExpressionInput(description, bigDecimalType())

export const BigDecimalMakeTemplate = defineTemplate({
	modelId: 'BigDecimalMake', version: '1.0.0', description: 'Creates a BigDecimal from an integer value and decimal scale.',
	inputs: { value: effectValueInput('BigInt digits.', { ts: 'bigint' }), scale: effectValueInput('Decimal scale.', { ts: 'number' }) },
	output: expressionOutput('BigDecimal value.', bigDecimalType()),
	source: `BigDecimal.make(${marker('expression', 'value', '0n')}, ${marker('expression', 'scale', '0')})`
})

export const BigDecimalFromBigIntTemplate = defineTemplate({
	modelId: 'BigDecimalFromBigInt', version: '1.0.0', description: 'Creates a BigDecimal from a BigInt.',
	inputs: { value: effectValueInput('Integer value.', { ts: 'bigint' }) },
	output: expressionOutput('BigDecimal value.', bigDecimalType()),
	source: `BigDecimal.fromBigInt(${marker('expression', 'value', '0n')})`
})

export const BigDecimalFromStringTemplate = defineTemplate({
	modelId: 'BigDecimalFromString', version: '1.0.0', description: 'Safely parses a numerical string into a BigDecimal.',
	inputs: { value: effectValueInput('Numerical string.', { ts: 'string' }) },
	output: expressionOutput('Optional parsed BigDecimal.', optionType(bigDecimalType().ts)),
	source: `BigDecimal.fromString(${marker('expression', 'value', '"0"')})`
})

export const BigDecimalFromStringUnsafeTemplate = defineTemplate({
	modelId: 'BigDecimalFromStringUnsafe', version: '1.0.0', description: 'Parses a numerical string into a BigDecimal and throws for invalid input.',
	inputs: { value: effectValueInput('Numerical string.', { ts: 'string' }) },
	output: expressionOutput('Parsed BigDecimal.', bigDecimalType()),
	source: `BigDecimal.fromStringUnsafe(${marker('expression', 'value', '"0"')})`
})

export const BigDecimalFromNumberUnsafeTemplate = defineTemplate({
	modelId: 'BigDecimalFromNumberUnsafe', version: '1.0.0', description: 'Converts a JavaScript number to BigDecimal; direct floating-point conversion can preserve prior precision error.',
	inputs: { value: effectValueInput('Number to convert.', { ts: 'number' }) },
	output: expressionOutput('BigDecimal converted from number.', bigDecimalType()),
	source: `BigDecimal.fromNumberUnsafe(${marker('expression', 'value', '0')})`
})

const decimalBinary = (
	modelId: string,
	method: 'sum' | 'subtract' | 'multiply' | 'divideUnsafe' | 'remainderUnsafe' | 'min' | 'max'
) => defineTemplate({
	modelId, version: '1.0.0', description: `Combines two BigDecimal values with BigDecimal.${method}.`,
	inputs: { left: decimalInput('Left BigDecimal.'), right: decimalInput('Right BigDecimal.') },
	output: expressionOutput('BigDecimal result.', bigDecimalType()),
	source: `BigDecimal.${method}(${marker('expression', 'left', 'BigDecimal.fromBigInt(0n)')}, ${marker('expression', 'right', 'BigDecimal.fromBigInt(1n)')})`
})

export const BigDecimalSumTemplate = decimalBinary('BigDecimalSum', 'sum')
export const BigDecimalSubtractTemplate = decimalBinary('BigDecimalSubtract', 'subtract')
export const BigDecimalMultiplyTemplate = decimalBinary('BigDecimalMultiply', 'multiply')
export const BigDecimalDivideUnsafeTemplate = decimalBinary('BigDecimalDivideUnsafe', 'divideUnsafe')
export const BigDecimalRemainderUnsafeTemplate = decimalBinary('BigDecimalRemainderUnsafe', 'remainderUnsafe')
export const BigDecimalMinTemplate = decimalBinary('BigDecimalMin', 'min')
export const BigDecimalMaxTemplate = decimalBinary('BigDecimalMax', 'max')

const decimalSafeBinary = (modelId: string, method: 'divide' | 'remainder') => defineTemplate({
	modelId, version: '1.0.0', description: `Safely computes BigDecimal.${method}, returning None when the operation is undefined.`,
	inputs: { left: decimalInput('Left BigDecimal.'), right: decimalInput('Right BigDecimal.') },
	output: expressionOutput('Optional BigDecimal result.', optionType(bigDecimalType().ts)),
	source: `BigDecimal.${method}(${marker('expression', 'left', 'BigDecimal.fromBigInt(0n)')}, ${marker('expression', 'right', 'BigDecimal.fromBigInt(1n)')})`
})

export const BigDecimalDivideTemplate = decimalSafeBinary('BigDecimalDivide', 'divide')
export const BigDecimalRemainderTemplate = decimalSafeBinary('BigDecimalRemainder', 'remainder')

const decimalUnary = (modelId: string, method: 'negate' | 'abs' | 'normalize') => defineTemplate({
	modelId, version: '1.0.0', description: `Transforms a BigDecimal with BigDecimal.${method}.`,
	inputs: { value: decimalInput('BigDecimal value.') },
	output: expressionOutput('BigDecimal result.', bigDecimalType()),
	source: `BigDecimal.${method}(${marker('expression', 'value', 'BigDecimal.fromBigInt(0n)')})`
})

export const BigDecimalNegateTemplate = decimalUnary('BigDecimalNegate', 'negate')
export const BigDecimalAbsTemplate = decimalUnary('BigDecimalAbs', 'abs')
export const BigDecimalNormalizeTemplate = decimalUnary('BigDecimalNormalize', 'normalize')

export const BigDecimalSignTemplate = defineTemplate({
	modelId: 'BigDecimalSign', version: '1.0.0', description: 'Returns the sign of a BigDecimal as -1, 0, or 1.',
	inputs: { value: decimalInput('BigDecimal value.') },
	output: expressionOutput('Sign.', { ts: '-1 | 0 | 1' }),
	source: `BigDecimal.sign(${marker('expression', 'value', 'BigDecimal.fromBigInt(0n)')})`
})

const decimalComparison = (
	modelId: string,
	method: 'isLessThan' | 'isLessThanOrEqualTo' | 'isGreaterThan' | 'isGreaterThanOrEqualTo' | 'equals'
) => defineTemplate({
	modelId, version: '1.0.0', description: `Compares two BigDecimal values with BigDecimal.${method}.`,
	inputs: { left: decimalInput('Left BigDecimal.'), right: decimalInput('Right BigDecimal.') },
	output: expressionOutput('Comparison result.', { ts: 'boolean' }),
	source: `BigDecimal.${method}(${marker('expression', 'left', 'BigDecimal.fromBigInt(0n)')}, ${marker('expression', 'right', 'BigDecimal.fromBigInt(0n)')})`
})

export const BigDecimalIsLessThanTemplate = decimalComparison('BigDecimalIsLessThan', 'isLessThan')
export const BigDecimalIsLessThanOrEqualToTemplate = decimalComparison('BigDecimalIsLessThanOrEqualTo', 'isLessThanOrEqualTo')
export const BigDecimalIsGreaterThanTemplate = decimalComparison('BigDecimalIsGreaterThan', 'isGreaterThan')
export const BigDecimalIsGreaterThanOrEqualToTemplate = decimalComparison('BigDecimalIsGreaterThanOrEqualTo', 'isGreaterThanOrEqualTo')
export const BigDecimalEqualsTemplate = decimalComparison('BigDecimalEquals', 'equals')

const decimalPredicate = (
	modelId: string,
	method: 'isZero' | 'isPositive' | 'isNegative' | 'isInteger'
) => defineTemplate({
	modelId, version: '1.0.0', description: `Tests a BigDecimal with BigDecimal.${method}.`,
	inputs: { value: decimalInput('BigDecimal value.') },
	output: expressionOutput('Predicate result.', { ts: 'boolean' }),
	source: `BigDecimal.${method}(${marker('expression', 'value', 'BigDecimal.fromBigInt(0n)')})`
})

export const BigDecimalIsZeroTemplate = decimalPredicate('BigDecimalIsZero', 'isZero')
export const BigDecimalIsPositiveTemplate = decimalPredicate('BigDecimalIsPositive', 'isPositive')
export const BigDecimalIsNegativeTemplate = decimalPredicate('BigDecimalIsNegative', 'isNegative')
export const BigDecimalIsIntegerTemplate = decimalPredicate('BigDecimalIsInteger', 'isInteger')

export const BigDecimalBetweenTemplate = defineTemplate({
	modelId: 'BigDecimalBetween', version: '1.0.0', description: 'Checks whether a BigDecimal lies between inclusive minimum and maximum bounds.',
	inputs: { value: decimalInput('BigDecimal to test.'), minimum: decimalInput('Minimum bound.'), maximum: decimalInput('Maximum bound.') },
	output: expressionOutput('Range-membership result.', { ts: 'boolean' }),
	source: `BigDecimal.between({ minimum: ${marker('expression', 'minimum', 'BigDecimal.fromBigInt(0n)')}, maximum: ${marker('expression', 'maximum', 'BigDecimal.fromBigInt(1n)')} })(${marker('expression', 'value', 'BigDecimal.fromBigInt(0n)')})`
})

export const BigDecimalFormatTemplate = defineTemplate({
	modelId: 'BigDecimalFormat', version: '1.0.0', description: 'Formats a BigDecimal as a decimal string.',
	inputs: { value: decimalInput('BigDecimal to format.') },
	output: expressionOutput('Formatted decimal string.', { ts: 'string' }),
	source: `BigDecimal.format(${marker('expression', 'value', 'BigDecimal.fromBigInt(0n)')})`
})

export const BigDecimalToExponentialTemplate = defineTemplate({
	modelId: 'BigDecimalToExponential', version: '1.0.0', description: 'Formats a BigDecimal using exponential notation.',
	inputs: { value: decimalInput('BigDecimal to format.') },
	output: expressionOutput('Exponential decimal string.', { ts: 'string' }),
	source: `BigDecimal.toExponential(${marker('expression', 'value', 'BigDecimal.fromBigInt(0n)')})`
})

export const effectBigDecimalGraphTemplateInputs = [
	BigDecimalMakeTemplate,
	BigDecimalFromBigIntTemplate,
	BigDecimalFromStringTemplate,
	BigDecimalFromStringUnsafeTemplate,
	BigDecimalFromNumberUnsafeTemplate,
	BigDecimalSumTemplate,
	BigDecimalSubtractTemplate,
	BigDecimalMultiplyTemplate,
	BigDecimalDivideTemplate,
	BigDecimalDivideUnsafeTemplate,
	BigDecimalNegateTemplate,
	BigDecimalRemainderTemplate,
	BigDecimalRemainderUnsafeTemplate,
	BigDecimalSignTemplate,
	BigDecimalAbsTemplate,
	BigDecimalIsLessThanTemplate,
	BigDecimalIsLessThanOrEqualToTemplate,
	BigDecimalIsGreaterThanTemplate,
	BigDecimalIsGreaterThanOrEqualToTemplate,
	BigDecimalMinTemplate,
	BigDecimalMaxTemplate,
	BigDecimalIsZeroTemplate,
	BigDecimalIsPositiveTemplate,
	BigDecimalIsNegativeTemplate,
	BigDecimalBetweenTemplate,
	BigDecimalIsIntegerTemplate,
	BigDecimalNormalizeTemplate,
	BigDecimalEqualsTemplate,
	BigDecimalFormatTemplate,
	BigDecimalToExponentialTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
