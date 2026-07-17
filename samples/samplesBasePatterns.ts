import { defineTemplate, fragmentCollectionPort, fragmentPort, literalPort } from '../src/templates.js'
import type {
	FragmentCollectionInputPort,
	FragmentInputPort,
	GraphTemplateDefinitionInput,
	InputPort,
	LiteralInputPort,
	OutputPort,
	TemplateTypeParameterDefinition,
	TypeDescriptor
} from '../src/templates.js'

export type AnyBasePatternGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
	string,
	Record<string, InputPort>,
	OutputPort,
	Record<string, TemplateTypeParameterDefinition> | undefined
>

export const unknownType: TypeDescriptor = { ts: 'unknown', schema: true }
export const readonlyUnknownArrayType: TypeDescriptor = {
	ts: 'readonly unknown[]',
	schema: { type: 'array' }
}
export const objectType: TypeDescriptor = { ts: 'object' }
export const stringType: TypeDescriptor = { ts: 'string', schema: { type: 'string' } }
export const numberType: TypeDescriptor = { ts: 'number', schema: { type: 'number' } }
export const booleanType: TypeDescriptor = { ts: 'boolean', schema: { type: 'boolean' } }

const unconstrainedTypeParameter = (description: string) => ({
	description,
	constraint: { ts: 'unknown' }
})

export const expressionFragment = (description?: string, type: TypeDescriptor = { ts: 'unknown' }): FragmentInputPort =>
	fragmentPort({
		regionKind: 'expression',
		accepts: { outputKind: 'expression', type },
		...(description === undefined ? {} : { description })
	})

export const booleanExpressionFragment = (description?: string): FragmentInputPort =>
	expressionFragment(description, booleanType)

export const statementCollectionInput = (description?: string): FragmentCollectionInputPort =>
	fragmentCollectionPort({
		regionKind: 'statement',
		accepts: { outputKind: 'statement' },
		minItems: 1,
		separator: '\n',
		...(description === undefined ? {} : { description })
	})

export const expressionCollectionInput = (
	description?: string,
	type: TypeDescriptor = { ts: 'unknown' }
): FragmentCollectionInputPort =>
	fragmentCollectionPort({
		regionKind: 'expression',
		accepts: { outputKind: 'expression', type },
		minItems: 1,
		separator: ', ',
		...(description === undefined ? {} : { description })
	})

export const stringLiteralInput = (description?: string): LiteralInputPort =>
	literalPort({
		regionKind: 'string',
		schema: { type: 'string' },
		...(description === undefined ? {} : { description })
	})

const booleanOutput = { kind: 'expression' as const, type: booleanType }
const binaryBooleanInputs = () => ({
	left: booleanExpressionFragment('Left boolean producer; condition templates may be chained here.'),
	right: booleanExpressionFragment('Right boolean producer; condition templates may be chained here.')
})
const marker = (kind: string, id: string, placeholder: string): string =>
	`/** @TYPE ${kind} id=${id} **/${placeholder}/** @END **/`

// Conditions -----------------------------------------------------------------

export const PropertyIn = defineTemplate({
	modelId: 'PropertyIn',
	version: '1.0.0',
	description: 'Checks whether a property exists on an object or its prototype chain.',
	inputs: {
		property: expressionFragment('Property-key expression.', { ts: 'PropertyKey' }),
		object: expressionFragment('Object expression to inspect.', objectType)
	},
	output: booleanOutput,
	source: `(${marker('expression', 'property', 'undefined')} in ${marker('expression', 'object', 'undefined')})`
})

const binaryCondition = (modelId: string, description: string, source: string) =>
	defineTemplate({
		modelId,
		version: '1.0.0',
		description,
		inputs: binaryBooleanInputs(),
		output: booleanOutput,
		source
	})
const left = marker('expression', 'left', 'false')
const right = marker('expression', 'right', 'false')

export const ConditionAnd = binaryCondition(
	'ConditionAnd',
	'Produces strict boolean conjunction.',
	`(${left} && ${right})`
)
export const ConditionOr = binaryCondition(
	'ConditionOr',
	'Produces strict boolean disjunction.',
	`(${left} || ${right})`
)
export const ConditionXor = binaryCondition(
	'ConditionXor',
	'Produces exclusive OR for strict booleans.',
	`(${left} !== ${right})`
)
export const ConditionXand = binaryCondition('ConditionXand', 'Produces boolean XAND/XNOR.', `(${left} === ${right})`)
export const ConditionNand = binaryCondition(
	'ConditionNand',
	'Produces negated boolean conjunction.',
	`!(${left} && ${right})`
)
export const ConditionNor = binaryCondition(
	'ConditionNor',
	'Produces negated boolean disjunction.',
	`!(${left} || ${right})`
)
export const ConditionImplication = binaryCondition(
	'ConditionImplication',
	'Produces material implication.',
	`(!${left} || ${right})`
)
export const ConditionConverseImplication = binaryCondition(
	'ConditionConverseImplication',
	'Produces converse implication.',
	`(!${right} || ${left})`
)
export const ConditionIff = binaryCondition('ConditionIff', 'Produces logical biconditional.', `(${left} === ${right})`)
export const ConditionNonImplication = binaryCondition(
	'ConditionNonImplication',
	'Produces left and not right.',
	`(${left} && !${right})`
)
export const ConditionConverseNonImplication = binaryCondition(
	'ConditionConverseNonImplication',
	'Produces right and not left.',
	`(${right} && !${left})`
)

export const ConditionNot = defineTemplate({
	modelId: 'ConditionNot',
	version: '1.0.0',
	description: 'Negates a strict boolean expression and composes with other condition templates.',
	inputs: { value: booleanExpressionFragment('Boolean producer to negate; another condition may be chained here.') },
	output: booleanOutput,
	source: `(!${marker('expression', 'value', 'false')})`
})

export const ConditionFormulaCall = defineTemplate({
	modelId: 'ConditionFormulaCall',
	version: '1.0.0',
	description: 'Calls a boolean formula with one or more boolean condition arguments.',
	inputs: {
		formula: expressionFragment('Boolean formula.', { ts: '(...conditions: boolean[]) => boolean' }),
		conditions: expressionCollectionInput('Boolean producers in call order; condition templates may be chained here.', booleanType)
	},
	output: booleanOutput,
	source: `(${marker('expression', 'formula', 'undefined')})(${marker('expression', 'conditions', 'false')})`
})

const arrayType = (parameter: string): TypeDescriptor => ({
	ts: `readonly {{${parameter}}}[]`,
	schema: { type: 'array' }
})
const predicateType = (parameter: string): TypeDescriptor => ({
	ts: `(value: {{${parameter}}}, index: number, array: readonly {{${parameter}}}[]) => boolean`
})

export const ArrayExists = defineTemplate({
	modelId: 'ArrayExists',
	version: '1.0.0',
	description: 'Checks whether at least one array item satisfies a predicate.',
	typeParameters: { T: unconstrainedTypeParameter('Array element type.') },
	inputs: {
		array: expressionFragment('Readonly array; a compatible typed array operation may be chained here.', arrayType('T')),
		formula: expressionFragment('Existential predicate.', predicateType('T'))
	},
	output: booleanOutput,
	source: `(${marker('expression', 'array', '[]')}).some(${marker('expression', 'formula', 'undefined')})`
})

export const ArrayForAll = defineTemplate({
	modelId: 'ArrayForAll',
	version: '1.0.0',
	description: 'Checks whether every array item satisfies a predicate.',
	typeParameters: { T: unconstrainedTypeParameter('Array element type.') },
	inputs: {
		array: expressionFragment('Readonly array; a compatible typed array operation may be chained here.', arrayType('T')),
		formula: expressionFragment('Universal predicate.', predicateType('T'))
	},
	output: booleanOutput,
	source: `(${marker('expression', 'array', '[]')}).every(${marker('expression', 'formula', 'undefined')})`
})

// Statements and conditionals ------------------------------------------------

export const StatementBlock = defineTemplate({
	modelId: 'StatementBlock',
	version: '1.0.0',
	description: 'Groups a nonempty statement collection in a block.',
	inputs: { statements: statementCollectionInput('Statements in execution order.') },
	output: { kind: 'statement' },
	source: `{\n${marker('statement', 'statements', 'throw new Error("placeholder");')}\n}`
})

export const IfStatement = defineTemplate({
	modelId: 'IfStatement',
	version: '1.0.0',
	description: 'Emits an if with a nonempty true branch.',
	inputs: {
		condition: booleanExpressionFragment('Branch condition.'),
		thenStatements: statementCollectionInput('Statements for the true branch.')
	},
	output: { kind: 'statement' },
	source: `if (${marker('expression', 'condition', 'false')}) {\n${marker('statement', 'thenStatements', 'throw new Error("placeholder");')}\n}`
})

export const IfElse = defineTemplate({
	modelId: 'IfElse',
	version: '1.0.0',
	description: 'Emits an if/else with nonempty branches.',
	inputs: {
		condition: booleanExpressionFragment('Branch condition.'),
		thenStatements: statementCollectionInput('Statements for the true branch.'),
		elseStatements: statementCollectionInput('Statements for the false branch.')
	},
	output: { kind: 'statement' },
	source: `if (${marker('expression', 'condition', 'false')}) {\n${marker('statement', 'thenStatements', 'throw new Error("placeholder");')}\n} else {\n${marker('statement', 'elseStatements', 'throw new Error("placeholder");')}\n}`
})

export const IfElseChain = defineTemplate({
	modelId: 'IfElseChain',
	version: '1.0.0',
	description: 'Emits one branch followed by a structurally constrained else continuation.',
	inputs: {
		condition: booleanExpressionFragment('Branch condition.'),
		statements: statementCollectionInput('Statements executed when the condition holds.'),
		otherwise: fragmentPort({
			regionKind: 'statement',
			accepts: {
				outputKind: 'statement',
				sourceModelIds: ['IfElseChain', 'IfStatement', 'IfElse', 'StatementBlock']
			},
			description: 'Next conditional branch or final statement block.'
		})
	},
	output: { kind: 'statement' },
	source: `if (${marker('expression', 'condition', 'false')}) {\n${marker('statement', 'statements', 'throw new Error("placeholder");')}\n} else ${marker('statement', 'otherwise', '{}')}`
})

export const Ternary = defineTemplate({
	modelId: 'Ternary',
	version: '1.0.0',
	description: 'Produces a typed conditional expression; either result branch may be another Ternary<T>.',
	typeParameters: { T: unconstrainedTypeParameter('Shared branch and result type.') },
	inputs: {
		condition: booleanExpressionFragment('Conditional expression.'),
		whenTrue: expressionFragment('Result when true; another Ternary<T> may be chained here.', { ts: '{{T}}' }),
		whenFalse: expressionFragment('Result when false; another Ternary<T> may be chained here.', { ts: '{{T}}' })
	},
	output: { kind: 'expression', type: { ts: '{{T}}', schema: true } },
	source: `(${marker('expression', 'condition', 'false')} ? ${marker('expression', 'whenTrue', 'undefined')} : ${marker('expression', 'whenFalse', 'undefined')})`
})

export const ObjectPatternMatchWithFallback = defineTemplate({
	modelId: 'ObjectPatternMatchWithFallback',
	version: '1.0.0',
	description: 'Matches an object pattern and lazily returns a final or recursively chained R fallback result.',
	typeParameters: { R: unconstrainedTypeParameter('Handler and match result type.') },
	inputs: {
		value: expressionFragment('Value to match.'),
		objectPattern: expressionFragment('ts-pattern object pattern.'),
		matchedHandler: expressionFragment('Matching handler.', { ts: '(...args: never[]) => {{R}}' }),
		fallbackResult: expressionFragment(
			'Lazy fallback result; another ObjectPatternMatchWithFallback<R> may be chained here.',
			{ ts: '{{R}}' }
		)
	},
	output: { kind: 'expression', type: { ts: '{{R}}', schema: true } },
	source: `match(${marker('expression', 'value', 'undefined')}).with(${marker('expression', 'objectPattern', 'undefined')}, ${marker('expression', 'matchedHandler', 'undefined')}).otherwise(() => ${marker('expression', 'fallbackResult', 'undefined')})`
})

// Array operations -----------------------------------------------------------

const arrayOperationParameters = {
	T: unconstrainedTypeParameter('Input array element type.'),
	U: unconstrainedTypeParameter('Mapped result element type.')
}
const arrayAndCallback = (callbackType: TypeDescriptor) => ({
	array: expressionFragment('Readonly input array; a compatible typed array operation may be chained here.', arrayType('T')),
	callback: expressionFragment('Array callback.', callbackType)
})
const arrayCallSource = (method: string): string =>
	`(${marker('expression', 'array', '[]')}).${method}(${marker('expression', 'callback', 'undefined')})`

export const ArrayMap = defineTemplate({
	modelId: 'ArrayMap',
	version: '1.0.0',
	description: 'Maps T values to U values.',
	typeParameters: arrayOperationParameters,
	inputs: arrayAndCallback({ ts: '(value: {{T}}, index: number, array: readonly {{T}}[]) => {{U}}' }),
	output: { kind: 'expression', type: { ts: '{{U}}[]', schema: { type: 'array' } } },
	source: arrayCallSource('map')
})

export const ArrayFilter = defineTemplate({
	modelId: 'ArrayFilter',
	version: '1.0.0',
	description: 'Filters T values with a strict boolean predicate.',
	typeParameters: { T: unconstrainedTypeParameter('Array element type.') },
	inputs: arrayAndCallback(predicateType('T')),
	output: { kind: 'expression', type: { ts: '{{T}}[]', schema: { type: 'array' } } },
	source: arrayCallSource('filter')
})

export const ArrayFind = defineTemplate({
	modelId: 'ArrayFind',
	version: '1.0.0',
	description: 'Finds the first T value satisfying a predicate.',
	typeParameters: { T: unconstrainedTypeParameter('Array element type.') },
	inputs: arrayAndCallback(predicateType('T')),
	output: { kind: 'expression', type: { ts: '{{T}} | undefined' } },
	source: arrayCallSource('find')
})

export const ArrayFindIndex = defineTemplate({
	modelId: 'ArrayFindIndex',
	version: '1.0.0',
	description: 'Finds the index of the first matching T value.',
	typeParameters: { T: unconstrainedTypeParameter('Array element type.') },
	inputs: arrayAndCallback(predicateType('T')),
	output: { kind: 'expression', type: numberType },
	source: arrayCallSource('findIndex')
})

export const ArrayFlatMap = defineTemplate({
	modelId: 'ArrayFlatMap',
	version: '1.0.0',
	description: 'Maps T values to U values or readonly U arrays and flattens once.',
	typeParameters: arrayOperationParameters,
	inputs: arrayAndCallback({
		ts: '(value: {{T}}, index: number, array: readonly {{T}}[]) => {{U}} | readonly {{U}}[]'
	}),
	output: { kind: 'expression', type: { ts: '{{U}}[]', schema: { type: 'array' } } },
	source: arrayCallSource('flatMap')
})

export const ArrayForEachCall = defineTemplate({
	modelId: 'ArrayForEachCall',
	version: '1.0.0',
	description: 'Invokes a callback for every T value and returns void.',
	typeParameters: { T: unconstrainedTypeParameter('Array element type.') },
	inputs: arrayAndCallback({ ts: '(value: {{T}}, index: number, array: readonly {{T}}[]) => unknown' }),
	output: { kind: 'expression', type: { ts: 'void' } },
	source: arrayCallSource('forEach')
})

// Loops and application ------------------------------------------------------

export const TypeSugarExtensionCall = defineTemplate({
	modelId: 'TypeSugarExtensionCall',
	version: '1.0.0',
	description: 'Calls an assumed extension method with one or more fragment arguments.',
	inputs: {
		receiver: expressionFragment('Extension receiver; another extension-call result may be chained here.'),
		method: literalPort({
			regionKind: 'identifier',
			schema: { type: 'string', pattern: '^[$A-Za-z_][$A-Za-z0-9_]*$' },
			description: 'Identifier-safe extension method name.'
		}),
		arguments: expressionCollectionInput('Arguments in call order.')
	},
	output: { kind: 'expression', type: unknownType },
	source: `(${marker('expression', 'receiver', 'undefined')}).${marker('identifier', 'method', 'extension')}(${marker('expression', 'arguments', 'undefined')})`
})

export const WhileHolds = defineTemplate({
	modelId: 'WhileHolds',
	version: '1.0.0',
	description: 'Invokes an application while a reevaluated condition holds.',
	inputs: {
		condition: booleanExpressionFragment('Condition reevaluated before every iteration.'),
		application: expressionFragment('Zero-argument application; its return value is ignored.', { ts: '() => unknown' })
	},
	output: { kind: 'statement' },
	source: `while (${marker('expression', 'condition', 'false')}) {\n  (${marker('expression', 'application', 'undefined')})();\n}`
})

export const WhileTrue = defineTemplate({
	modelId: 'WhileTrue',
	version: '1.0.0',
	description:
		'Continuously invokes an application; normal loop termination is not provided and return values are ignored.',
	inputs: { application: expressionFragment('Zero-argument application.', { ts: '() => unknown' }) },
	output: { kind: 'statement' },
	source: `while (true) {\n  (${marker('expression', 'application', 'undefined')})();\n}`
})

export const ForIndex = defineTemplate({
	modelId: 'ForIndex',
	version: '1.0.0',
	description: 'Invokes an application for indexes from zero to an exclusive limit.',
	inputs: {
		limit: expressionFragment('Exclusive numeric upper bound.', numberType),
		application: expressionFragment('Application receiving the current index; its return value is ignored.', {
			ts: '(index: number) => unknown'
		})
	},
	output: { kind: 'statement' },
	source: `for (let index = 0; index < ${marker('expression', 'limit', '0')}; index += 1) {\n  (${marker('expression', 'application', 'undefined')})(index);\n}`
})

export const ForEach = defineTemplate({
	modelId: 'ForEach',
	version: '1.0.0',
	description: 'Iterates a readonly T array with for...of and invokes an application.',
	typeParameters: { T: unconstrainedTypeParameter('Array element type.') },
	inputs: {
		array: expressionFragment('Readonly input array.', arrayType('T')),
		application: expressionFragment('Application receiving each item; its return value is ignored.', {
			ts: '(item: {{T}}) => unknown'
		})
	},
	output: { kind: 'statement' },
	source: `for (const item of ${marker('expression', 'array', '[]')}) {\n  (${marker('expression', 'application', 'undefined')})(item);\n}`
})

export const basePatternGraphTemplateInputs = [
	PropertyIn,
	ConditionAnd,
	ConditionOr,
	ConditionXor,
	ConditionXand,
	ConditionNot,
	ConditionNand,
	ConditionNor,
	ConditionImplication,
	ConditionConverseImplication,
	ConditionIff,
	ConditionNonImplication,
	ConditionConverseNonImplication,
	ConditionFormulaCall,
	ArrayExists,
	ArrayForAll,
	StatementBlock,
	IfStatement,
	IfElse,
	IfElseChain,
	Ternary,
	ObjectPatternMatchWithFallback,
	ArrayMap,
	ArrayFilter,
	ArrayFind,
	ArrayFindIndex,
	ArrayFlatMap,
	ArrayForEachCall,
	TypeSugarExtensionCall,
	WhileHolds,
	WhileTrue,
	ForIndex,
	ForEach
] as const satisfies readonly AnyBasePatternGraphTemplateDefinitionInput[]
