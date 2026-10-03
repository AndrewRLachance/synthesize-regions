import { fragmentCollectionPort, fragmentPort, literalPort } from '../src/templates.js'
import { defineTemplate } from './sample-definition.js'
import type {
	FragmentCollectionInputPort,
	FragmentInputPort,
	GraphTemplateDefinitionInput,
	InputPort,
	LiteralInputPort,
	OutputPort,
	TemplateTypeParameterDefinition,
	TypeDescriptor,
	RawCodeInputPort,
	RawCodePolicy,
	RegionKind,
	UnionInputPort
} from '../src/templates.js'

import { SupportedJsonSchema } from '../src/templates/schemaTypes.js'

export type AnyGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<string, Record<string, InputPort>>

function rawCodePort(args: Omit<RawCodeInputPort, 'kind'>): RawCodeInputPort {
	return { kind: 'rawCode', ...args }
}

function unionPort(args: Omit<UnionInputPort, 'kind'>): UnionInputPort {
	return { kind: 'union', ...args }
}

function out(kind: RegionKind, extra: Omit<OutputPort, 'kind'> = {}): OutputPort {
	return { kind, ...extra }
}

export const unknownType: TypeDescriptor = { ts: 'unknown', schema: true }
export const unknownArrayType: TypeDescriptor = { ts: 'unknown[]', schema: { type: 'array' } }
export const recordType: TypeDescriptor = { ts: 'Record<string, unknown>', schema: { type: 'object' } }
export const stringType: TypeDescriptor = { ts: 'string', schema: { type: 'string' } }
export const numberType: TypeDescriptor = { ts: 'number', schema: { type: 'number' } }
export const booleanType: TypeDescriptor = { ts: 'boolean', schema: { type: 'boolean' } }
export const nullType: TypeDescriptor = { ts: 'null', schema: { type: 'null' } }

export const safeRawExpressionPolicy: RawCodePolicy = {
	description:
		'Single-line expression. Dangerous globals and module-loading constructs are rejected before generation.',
	maxLength: 300,
	allowNewlines: false,
	forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
	forbiddenPatterns: ['\\bnew\\s+Function\\b', '\\bawait\\b', '\\bwhile\\s*\\(', '\\bfor\\s*\\(', '\\bclass\\b']
}

export const safeRawStatementPolicy: RawCodePolicy = {
	description: 'Short statement block. Dangerous globals and module-loading constructs are rejected before generation.',
	maxLength: 600,
	allowNewlines: true,
	forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
	forbiddenPatterns: ['\\bnew\\s+Function\\b', '\\bwhile\\s*\\(']
}

export const identifierNameSchema = {
	type: 'string',
	pattern: '^[$A-Za-z_][$A-Za-z0-9_]*$'
} satisfies SupportedJsonSchema

export const propertyKeySchema = {
	type: 'string',
	minLength: 1
} satisfies SupportedJsonSchema

export const expressionFragment = (description?: string, type?: TypeDescriptor): FragmentInputPort =>
	fragmentPort({
		regionKind: 'expression',
		accepts: {
			outputKind: 'expression',
			...(type ? { type } : {})
		},
		...(description ? { description } : {})
	})

export const expressionSuffixFragment = (description?: string): FragmentInputPort =>
	fragmentPort({
		regionKind: 'expressionSuffix',
		accepts: { outputKind: 'expressionSuffix' },
		...(description ? { description } : {})
	})

export const objectPropertyFragment = (description?: string): FragmentInputPort =>
	fragmentPort({
		regionKind: 'objectProperty',
		accepts: { outputKind: 'objectProperty' },
		...(description ? { description } : {})
	})

export const identifierLiteral = (description?: string): LiteralInputPort =>
	literalPort({
		regionKind: 'identifier',
		schema: identifierNameSchema,
		...(description ? { description } : {})
	})

export const stringLiteral = (description?: string): LiteralInputPort =>
	literalPort({
		regionKind: 'string',
		schema: { type: 'string' },
		...(description ? { description } : {})
	})

export const numberLiteral = (description?: string): LiteralInputPort =>
	literalPort({
		regionKind: 'number',
		schema: { type: 'number' },
		...(description ? { description } : {})
	})

export const booleanLiteral = (description?: string): LiteralInputPort =>
	literalPort({
		regionKind: 'boolean',
		schema: { type: 'boolean' },
		...(description ? { description } : {})
	})

export const expressionRaw = (description?: string): RawCodeInputPort =>
	rawCodePort({
		regionKind: 'expression',
		policy: safeRawExpressionPolicy,
		...(description ? { description } : {})
	})

export const statementRaw = (description?: string): RawCodeInputPort =>
	rawCodePort({
		regionKind: 'statement',
		policy: safeRawStatementPolicy,
		...(description ? { description } : {})
	})

export const literalExpression = (description?: string): LiteralInputPort =>
	literalPort({
		regionKind: 'expression',
		schema: true,
		...(description ? { description } : {})
	})

// -----------------------------------------------------------------------------
// Source and raw escape-hatch templates
// -----------------------------------------------------------------------------

export const InputExpressionTemplate = defineTemplate({
	modelId: 'InputExpression',
	version: '1.0.0',
	description: 'Produces the root transform input expression.',
	inputs: {},
	output: out('expression', {
		type: unknownType,
		schema: true,
		description: 'The root input value.'
	}),
	source: 'input'
})

export const IdentifierExpressionTemplate = defineTemplate({
	modelId: 'IdentifierExpression',
	version: '1.0.0',
	description: 'Produces an expression from a safe identifier name.',
	inputs: {
		name: identifierLiteral('Identifier name to emit.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: '/** @TYPE identifier id=name **/placeholder/** @END **/'
})

export const RawExpressionTemplate = defineTemplate({
	modelId: 'RawExpression',
	version: '1.0.0',
	description: 'Produces an expression from a guarded raw-code input. Use as an escape hatch only.',
	inputs: {
		code: expressionRaw('Raw expression code.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: '/** @TYPE expression id=code **/undefined/** @END **/'
})

export const RawStatementTemplate = defineTemplate({
	modelId: 'RawStatement',
	version: '1.0.0',
	description: 'Produces a statement from a guarded raw-code input. Use as an escape hatch only.',
	inputs: {
		code: statementRaw('Raw statement code.')
	},
	output: out('statement'),
	source: '/** @TYPE statement id=code **/throw new Error("unimplemented");/** @END **/'
})

// -----------------------------------------------------------------------------
// Literal constructors
// -----------------------------------------------------------------------------

export const AnyLiteralExpressionTemplate = defineTemplate({
	modelId: 'AnyLiteralExpression',
	version: '1.0.0',
	description: 'Produces a JSON-like literal expression from a literal input.',
	inputs: {
		value: literalExpression('JSON-like literal value.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: '/** @TYPE expression id=value **/undefined/** @END **/'
})

export const StringLiteralTemplate = defineTemplate({
	modelId: 'StringLiteral',
	version: '1.0.0',
	description: 'Produces a string literal expression.',
	inputs: {
		value: stringLiteral('String value.')
	},
	output: out('expression', { type: stringType, schema: { type: 'string' } }),
	source: '/** @TYPE string id=value **/""/** @END **/'
})

export const NumberLiteralTemplate = defineTemplate({
	modelId: 'NumberLiteral',
	version: '1.0.0',
	description: 'Produces a number literal expression.',
	inputs: {
		value: numberLiteral('Number value.')
	},
	output: out('expression', { type: numberType, schema: { type: 'number' } }),
	source: '/** @TYPE number id=value **/0/** @END **/'
})

export const BooleanLiteralTemplate = defineTemplate({
	modelId: 'BooleanLiteral',
	version: '1.0.0',
	description: 'Produces a boolean literal expression.',
	inputs: {
		value: booleanLiteral('Boolean value.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: '/** @TYPE boolean id=value **/false/** @END **/'
})

export const NullLiteralTemplate = defineTemplate({
	modelId: 'NullLiteral',
	version: '1.0.0',
	description: 'Produces a null literal expression.',
	inputs: {
		value: literalPort({ regionKind: 'null', schema: { type: 'null' }, description: 'Must be null.' })
	},
	output: out('expression', { type: nullType, schema: { type: 'null' } }),
	source: '/** @TYPE null id=value **/null/** @END **/'
})

export const ArrayLiteralTemplate = defineTemplate({
	modelId: 'ArrayLiteral',
	version: '1.0.0',
	description: 'Produces an array literal expression from a JSON-like array.',
	inputs: {
		value: literalPort({ regionKind: 'array', schema: { type: 'array' }, description: 'Array literal value.' })
	},
	output: out('expression', { type: unknownArrayType, schema: { type: 'array' } }),
	source: '/** @TYPE array id=value **/[]/** @END **/'
})

export const ObjectLiteralTemplate = defineTemplate({
	modelId: 'ObjectLiteral',
	version: '1.0.0',
	description: 'Produces an object literal expression from a JSON-like object.',
	inputs: {
		value: literalPort({ regionKind: 'object', schema: { type: 'object' }, description: 'Object literal value.' })
	},
	output: out('expression', { type: recordType, schema: { type: 'object' } }),
	source: '/** @TYPE object id=value **/{}/** @END **/'
})

// -----------------------------------------------------------------------------
// Property and element access
// -----------------------------------------------------------------------------

export const GetPropertyTemplate = defineTemplate({
	modelId: 'GetProperty',
	version: '1.0.0',
	description: 'Reads a property with bracket notation, e.g. object["key"].',
	inputs: {
		object: expressionFragment('Object expression to read from.'),
		key: stringLiteral('Property key.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=object **/undefined/** @END **/'}[${'/** @TYPE string id=key **/""/** @END **/'}]`
})

export const GetIdentifierPropertyTemplate = defineTemplate({
	modelId: 'GetIdentifierProperty',
	version: '1.0.0',
	description: 'Reads a property with dot notation, e.g. object.key.',
	inputs: {
		object: expressionFragment('Object expression to read from.'),
		key: identifierLiteral('Identifier-safe property key.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=object **/undefined/** @END **/'}.${'/** @TYPE identifier id=key **/placeholder/** @END **/'}`
})

export const OptionalGetPropertyTemplate = defineTemplate({
	modelId: 'OptionalGetProperty',
	version: '1.0.0',
	description: 'Reads a property with optional chaining, e.g. object?.["key"].',
	inputs: {
		object: expressionFragment('Nullable object expression to read from.'),
		key: stringLiteral('Property key.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=object **/undefined/** @END **/'}?.[${'/** @TYPE string id=key **/""/** @END **/'}]`
})

export const OptionalGetIdentifierPropertyTemplate = defineTemplate({
	modelId: 'OptionalGetIdentifierProperty',
	version: '1.0.0',
	description: 'Reads a property with optional dot notation, e.g. object?.key.',
	inputs: {
		object: expressionFragment('Nullable object expression to read from.'),
		key: identifierLiteral('Identifier-safe property key.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=object **/undefined/** @END **/'}?.${'/** @TYPE identifier id=key **/placeholder/** @END **/'}`
})

export const GetElementTemplate = defineTemplate({
	modelId: 'GetElement',
	version: '1.0.0',
	description: 'Reads an array or tuple element by numeric index.',
	inputs: {
		array: expressionFragment('Array expression to read from.'),
		index: numberLiteral('Numeric index.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=array **/undefined/** @END **/'}[${'/** @TYPE number id=index **/0/** @END **/'}]`
})

export const OptionalGetElementTemplate = defineTemplate({
	modelId: 'OptionalGetElement',
	version: '1.0.0',
	description: 'Reads an array or tuple element with optional chaining.',
	inputs: {
		array: expressionFragment('Nullable array expression to read from.'),
		index: numberLiteral('Numeric index.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=array **/undefined/** @END **/'}?.[${'/** @TYPE number id=index **/0/** @END **/'}]`
})

export const ArrayLengthTemplate = defineTemplate({
	modelId: 'ArrayLength',
	version: '1.0.0',
	description: 'Reads the .length property from an array-like expression.',
	inputs: {
		array: expressionFragment('Array-like expression.')
	},
	output: out('expression', { type: numberType, schema: { type: 'number' } }),
	source: `${'/** @TYPE expression id=array **/undefined/** @END **/'}.length`
})

// -----------------------------------------------------------------------------
// Object construction
// -----------------------------------------------------------------------------

export const StaticObjectPropertyTemplate = defineTemplate({
	modelId: 'StaticObjectProperty',
	version: '1.0.0',
	description: 'Produces one object property with a literal key and expression value.',
	inputs: {
		key: literalPort({ regionKind: 'string', schema: propertyKeySchema, description: 'Property key.' }),
		value: expressionFragment('Property value expression.')
	},
	output: out('objectProperty'),
	source: `${'/** @TYPE string id=key **/""/** @END **/'}: ${'/** @TYPE expression id=value **/undefined/** @END **/'}`
})

export const IdentifierObjectPropertyTemplate = defineTemplate({
	modelId: 'IdentifierObjectProperty',
	version: '1.0.0',
	description: 'Produces one object property with an identifier-safe key and expression value.',
	inputs: {
		key: identifierLiteral('Identifier-safe property key.'),
		value: expressionFragment('Property value expression.')
	},
	output: out('objectProperty'),
	source: `${'/** @TYPE identifier id=key **/placeholder/** @END **/'}: ${'/** @TYPE expression id=value **/undefined/** @END **/'}`
})

export const ObjectFromPropertyTemplate = defineTemplate({
	modelId: 'ObjectFromProperty',
	version: '1.0.0',
	description: 'Wraps one object property fragment in an object expression.',
	inputs: {
		property: objectPropertyFragment('Object property fragment.')
	},
	output: out('expression', { type: recordType, schema: { type: 'object' } }),
	source: `({ ${'/** @TYPE objectProperty id=property **/placeholder: undefined/** @END **/'} })`
})

export const ObjectFromTwoPropertiesTemplate = defineTemplate({
	modelId: 'ObjectFromTwoProperties',
	version: '1.0.0',
	description: 'Builds an object expression from two object property fragments.',
	inputs: {
		first: objectPropertyFragment('First object property fragment.'),
		second: objectPropertyFragment('Second object property fragment.')
	},
	output: out('expression', { type: recordType, schema: { type: 'object' } }),
	source: `({ ${'/** @TYPE objectProperty id=first **/first: undefined/** @END **/'}, ${'/** @TYPE objectProperty id=second **/second: undefined/** @END **/'} })`
})

export const ObjectFromThreePropertiesTemplate = defineTemplate({
	modelId: 'ObjectFromThreeProperties',
	version: '1.0.0',
	description: 'Builds an object expression from three object property fragments.',
	inputs: {
		first: objectPropertyFragment('First object property fragment.'),
		second: objectPropertyFragment('Second object property fragment.'),
		third: objectPropertyFragment('Third object property fragment.')
	},
	output: out('expression', { type: recordType, schema: { type: 'object' } }),
	source: `({ ${'/** @TYPE objectProperty id=first **/first: undefined/** @END **/'}, ${'/** @TYPE objectProperty id=second **/second: undefined/** @END **/'}, ${'/** @TYPE objectProperty id=third **/third: undefined/** @END **/'} })`
})

export const MergeObjectsTemplate = defineTemplate({
	modelId: 'MergeObjects',
	version: '1.0.0',
	description: 'Merges two object expressions using object spread.',
	inputs: {
		left: expressionFragment('Left object expression.'),
		right: expressionFragment('Right object expression.')
	},
	output: out('expression', { type: recordType, schema: { type: 'object' } }),
	source: `({ ...${'/** @TYPE expression id=left **/undefined/** @END **/'}, ...${'/** @TYPE expression id=right **/undefined/** @END **/'} })`
})

export const MergeObjectsWithPropertyTemplate = defineTemplate({
	modelId: 'MergeObjectsWithProperty',
	version: '1.0.0',
	description: 'Merges an object expression and one object property fragment.',
	inputs: {
		object: expressionFragment('Object expression to spread.'),
		property: objectPropertyFragment('Object property fragment to append.')
	},
	output: out('expression', { type: recordType, schema: { type: 'object' } }),
	source: `({ ...${'/** @TYPE expression id=object **/undefined/** @END **/'}, ${'/** @TYPE objectProperty id=property **/placeholder: undefined/** @END **/'} })`
})

// -----------------------------------------------------------------------------
// Arrays and array methods
// -----------------------------------------------------------------------------

export const ArrayOfOneTemplate = defineTemplate({
	modelId: 'ArrayOfOne',
	version: '1.0.0',
	description: 'Builds an array expression with one element.',
	inputs: {
		item: expressionFragment('Array element expression.')
	},
	output: out('expression', { type: unknownArrayType, schema: { type: 'array' } }),
	source: `[${'/** @TYPE expression id=item **/undefined/** @END **/'}]`
})

export const ArrayOfTwoTemplate = defineTemplate({
	modelId: 'ArrayOfTwo',
	version: '1.0.0',
	description: 'Builds an array expression with two elements.',
	inputs: {
		first: expressionFragment('First array element expression.'),
		second: expressionFragment('Second array element expression.')
	},
	output: out('expression', { type: unknownArrayType, schema: { type: 'array' } }),
	source: `[${'/** @TYPE expression id=first **/undefined/** @END **/'}, ${'/** @TYPE expression id=second **/undefined/** @END **/'}]`
})

export const ArrayMapRawTemplate = defineTemplate({
	modelId: 'ArrayMapRaw',
	version: '1.0.0',
	description: 'Maps an array with a guarded raw arrow/function expression.',
	inputs: {
		array: expressionFragment('Array expression to map.'),
		mapper: expressionRaw('Arrow/function expression, e.g. x => x.id.')
	},
	output: out('expression', { type: unknownArrayType, schema: { type: 'array' } }),
	source: `${'/** @TYPE expression id=array **/undefined/** @END **/'}.map(${'/** @TYPE expression id=mapper **/(x: unknown) => x/** @END **/'})`
})

export const ArrayFilterRawTemplate = defineTemplate({
	modelId: 'ArrayFilterRaw',
	version: '1.0.0',
	description: 'Filters an array with a guarded raw predicate expression.',
	inputs: {
		array: expressionFragment('Array expression to filter.'),
		predicate: expressionRaw('Predicate expression, e.g. x => x.active.')
	},
	output: out('expression', { type: unknownArrayType, schema: { type: 'array' } }),
	source: `${'/** @TYPE expression id=array **/undefined/** @END **/'}.filter(${'/** @TYPE expression id=predicate **/(x: unknown) => Boolean(x)/** @END **/'})`
})

export const ArrayFindRawTemplate = defineTemplate({
	modelId: 'ArrayFindRaw',
	version: '1.0.0',
	description: 'Finds the first array element matching a guarded raw predicate expression.',
	inputs: {
		array: expressionFragment('Array expression to search.'),
		predicate: expressionRaw('Predicate expression, e.g. x => x.id === targetId.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=array **/undefined/** @END **/'}.find(${'/** @TYPE expression id=predicate **/(x: unknown) => Boolean(x)/** @END **/'})`
})

export const ArraySomeRawTemplate = defineTemplate({
	modelId: 'ArraySomeRaw',
	version: '1.0.0',
	description: 'Checks whether some array element matches a guarded raw predicate expression.',
	inputs: {
		array: expressionFragment('Array expression to test.'),
		predicate: expressionRaw('Predicate expression, e.g. x => x.active.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `${'/** @TYPE expression id=array **/undefined/** @END **/'}.some(${'/** @TYPE expression id=predicate **/(x: unknown) => Boolean(x)/** @END **/'})`
})

export const ArrayEveryRawTemplate = defineTemplate({
	modelId: 'ArrayEveryRaw',
	version: '1.0.0',
	description: 'Checks whether every array element matches a guarded raw predicate expression.',
	inputs: {
		array: expressionFragment('Array expression to test.'),
		predicate: expressionRaw('Predicate expression, e.g. x => x.active.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `${'/** @TYPE expression id=array **/undefined/** @END **/'}.every(${'/** @TYPE expression id=predicate **/(x: unknown) => Boolean(x)/** @END **/'})`
})

export const ArrayReduceRawTemplate = defineTemplate({
	modelId: 'ArrayReduceRaw',
	version: '1.0.0',
	description: 'Reduces an array with a guarded raw reducer and explicit initial value.',
	inputs: {
		array: expressionFragment('Array expression to reduce.'),
		reducer: expressionRaw('Reducer expression, e.g. (acc, x) => acc + x.amount.'),
		initialValue: expressionFragment('Initial accumulator value.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=array **/undefined/** @END **/'}.reduce(${'/** @TYPE expression id=reducer **/(acc: unknown, x: unknown) => acc/** @END **/'}, ${'/** @TYPE expression id=initialValue **/undefined/** @END **/'})`
})

export const ArrayMapSuffixRawTemplate = defineTemplate({
	modelId: 'ArrayMapSuffixRaw',
	version: '1.0.0',
	description: 'Produces a .map(...) expression suffix using a guarded raw mapper expression.',
	inputs: {
		mapper: expressionRaw('Arrow/function expression, e.g. x => x.id.')
	},
	output: out('expressionSuffix'),
	source: `.map(${'/** @TYPE expression id=mapper **/(x: unknown) => x/** @END **/'})`
})

export const ArrayFilterSuffixRawTemplate = defineTemplate({
	modelId: 'ArrayFilterSuffixRaw',
	version: '1.0.0',
	description: 'Produces a .filter(...) expression suffix using a guarded raw predicate expression.',
	inputs: {
		predicate: expressionRaw('Predicate expression, e.g. x => x.active.')
	},
	output: out('expressionSuffix'),
	source: `.filter(${'/** @TYPE expression id=predicate **/(x: unknown) => Boolean(x)/** @END **/'})`
})

// -----------------------------------------------------------------------------
// Calls, suffixes, and composition adapters
// -----------------------------------------------------------------------------

export const ApplyExpressionSuffixTemplate = defineTemplate({
	modelId: 'ApplyExpressionSuffix',
	version: '1.0.0',
	description: 'Applies an expression suffix fragment to an expression fragment.',
	inputs: {
		source: expressionFragment('Base expression.'),
		suffix: expressionSuffixFragment('Expression suffix to append.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=source **/undefined/** @END **/'}${'/** @TYPE expressionSuffix id=suffix **/.value/** @END **/'}`
})

export const CallFunction0Template = defineTemplate({
	modelId: 'CallFunction0',
	version: '1.0.0',
	description: 'Calls a function expression with no arguments.',
	inputs: {
		callee: expressionFragment('Function expression to call.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=callee **/undefined/** @END **/'}()`
})

export const CallFunction1Template = defineTemplate({
	modelId: 'CallFunction1',
	version: '1.0.0',
	description: 'Calls a function expression with one argument.',
	inputs: {
		callee: expressionFragment('Function expression to call.'),
		arg: expressionFragment('Argument expression.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=callee **/undefined/** @END **/'}(${'/** @TYPE expression id=arg **/undefined/** @END **/'})`
})

export const CallFunction2Template = defineTemplate({
	modelId: 'CallFunction2',
	version: '1.0.0',
	description: 'Calls a function expression with two arguments.',
	inputs: {
		callee: expressionFragment('Function expression to call.'),
		firstArg: expressionFragment('First argument expression.'),
		secondArg: expressionFragment('Second argument expression.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=callee **/undefined/** @END **/'}(${'/** @TYPE expression id=firstArg **/undefined/** @END **/'}, ${'/** @TYPE expression id=secondArg **/undefined/** @END **/'})`
})

export const MethodCall0Template = defineTemplate({
	modelId: 'MethodCall0',
	version: '1.0.0',
	description: 'Calls a zero-argument method on an object expression.',
	inputs: {
		object: expressionFragment('Object expression.'),
		method: identifierLiteral('Identifier-safe method name.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=object **/undefined/** @END **/'}.${'/** @TYPE identifier id=method **/placeholder/** @END **/'}()`
})

export const MethodCall1Template = defineTemplate({
	modelId: 'MethodCall1',
	version: '1.0.0',
	description: 'Calls a one-argument method on an object expression.',
	inputs: {
		object: expressionFragment('Object expression.'),
		method: identifierLiteral('Identifier-safe method name.'),
		arg: expressionFragment('Argument expression.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=object **/undefined/** @END **/'}.${'/** @TYPE identifier id=method **/placeholder/** @END **/'}(${'/** @TYPE expression id=arg **/undefined/** @END **/'})`
})

export const MethodCall2Template = defineTemplate({
	modelId: 'MethodCall2',
	version: '1.0.0',
	description: 'Calls a two-argument method on an object expression.',
	inputs: {
		object: expressionFragment('Object expression.'),
		method: identifierLiteral('Identifier-safe method name.'),
		firstArg: expressionFragment('First argument expression.'),
		secondArg: expressionFragment('Second argument expression.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `${'/** @TYPE expression id=object **/undefined/** @END **/'}.${'/** @TYPE identifier id=method **/placeholder/** @END **/'}(${'/** @TYPE expression id=firstArg **/undefined/** @END **/'}, ${'/** @TYPE expression id=secondArg **/undefined/** @END **/'})`
})

// -----------------------------------------------------------------------------
// Conditionals, defaults, boolean logic, comparison, arithmetic
// -----------------------------------------------------------------------------

export const ConditionalExpressionTemplate = defineTemplate({
	modelId: 'ConditionalExpression',
	version: '1.0.0',
	description: 'Produces a conditional expression: condition ? whenTrue : whenFalse.',
	inputs: {
		condition: expressionFragment('Condition expression.'),
		whenTrue: expressionFragment('Expression emitted when condition is truthy.'),
		whenFalse: expressionFragment('Expression emitted when condition is falsy.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `(${'/** @TYPE expression id=condition **/undefined/** @END **/'} ? ${'/** @TYPE expression id=whenTrue **/undefined/** @END **/'} : ${'/** @TYPE expression id=whenFalse **/undefined/** @END **/'})`
})

export const NullishCoalesceTemplate = defineTemplate({
	modelId: 'NullishCoalesce',
	version: '1.0.0',
	description: 'Returns fallback when value is null or undefined.',
	inputs: {
		value: expressionFragment('Value expression.'),
		fallback: expressionFragment('Fallback expression.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `(${'/** @TYPE expression id=value **/undefined/** @END **/'} ?? ${'/** @TYPE expression id=fallback **/undefined/** @END **/'})`
})

export const LogicalAndTemplate = defineTemplate({
	modelId: 'LogicalAnd',
	version: '1.0.0',
	description: 'Produces a logical AND expression.',
	inputs: {
		left: expressionFragment('Left operand.'),
		right: expressionFragment('Right operand.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `(${'/** @TYPE expression id=left **/undefined/** @END **/'} && ${'/** @TYPE expression id=right **/undefined/** @END **/'})`
})

export const LogicalOrTemplate = defineTemplate({
	modelId: 'LogicalOr',
	version: '1.0.0',
	description: 'Produces a logical OR expression.',
	inputs: {
		left: expressionFragment('Left operand.'),
		right: expressionFragment('Right operand.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `(${'/** @TYPE expression id=left **/undefined/** @END **/'} || ${'/** @TYPE expression id=right **/undefined/** @END **/'})`
})

export const NotTemplate = defineTemplate({
	modelId: 'Not',
	version: '1.0.0',
	description: 'Produces a logical negation expression.',
	inputs: {
		value: expressionFragment('Expression to negate.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `(!${'/** @TYPE expression id=value **/undefined/** @END **/'})`
})

export const StrictEqualTemplate = defineTemplate({
	modelId: 'StrictEqual',
	version: '1.0.0',
	description: 'Produces a strict equality comparison.',
	inputs: {
		left: expressionFragment('Left operand.'),
		right: expressionFragment('Right operand.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `(${'/** @TYPE expression id=left **/undefined/** @END **/'} === ${'/** @TYPE expression id=right **/undefined/** @END **/'})`
})

export const StrictNotEqualTemplate = defineTemplate({
	modelId: 'StrictNotEqual',
	version: '1.0.0',
	description: 'Produces a strict inequality comparison.',
	inputs: {
		left: expressionFragment('Left operand.'),
		right: expressionFragment('Right operand.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `(${'/** @TYPE expression id=left **/undefined/** @END **/'} !== ${'/** @TYPE expression id=right **/undefined/** @END **/'})`
})

export const LessThanTemplate = defineTemplate({
	modelId: 'LessThan',
	version: '1.0.0',
	description: 'Produces a less-than comparison.',
	inputs: {
		left: expressionFragment('Left operand.'),
		right: expressionFragment('Right operand.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `(${'/** @TYPE expression id=left **/undefined/** @END **/'} < ${'/** @TYPE expression id=right **/undefined/** @END **/'})`
})

export const GreaterThanTemplate = defineTemplate({
	modelId: 'GreaterThan',
	version: '1.0.0',
	description: 'Produces a greater-than comparison.',
	inputs: {
		left: expressionFragment('Left operand.'),
		right: expressionFragment('Right operand.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `(${'/** @TYPE expression id=left **/undefined/** @END **/'} > ${'/** @TYPE expression id=right **/undefined/** @END **/'})`
})

export const AddTemplate = defineTemplate({
	modelId: 'Add',
	version: '1.0.0',
	description: 'Produces an addition expression.',
	inputs: {
		left: expressionFragment('Left operand.'),
		right: expressionFragment('Right operand.')
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `(${'/** @TYPE expression id=left **/undefined/** @END **/'} + ${'/** @TYPE expression id=right **/undefined/** @END **/'})`
})

export const SubtractTemplate = defineTemplate({
	modelId: 'Subtract',
	version: '1.0.0',
	description: 'Produces a subtraction expression.',
	inputs: {
		left: expressionFragment('Left operand.'),
		right: expressionFragment('Right operand.')
	},
	output: out('expression', { type: numberType, schema: { type: 'number' } }),
	source: `(${'/** @TYPE expression id=left **/undefined/** @END **/'} - ${'/** @TYPE expression id=right **/undefined/** @END **/'})`
})

export const MultiplyTemplate = defineTemplate({
	modelId: 'Multiply',
	version: '1.0.0',
	description: 'Produces a multiplication expression.',
	inputs: {
		left: expressionFragment('Left operand.'),
		right: expressionFragment('Right operand.')
	},
	output: out('expression', { type: numberType, schema: { type: 'number' } }),
	source: `(${'/** @TYPE expression id=left **/undefined/** @END **/'} * ${'/** @TYPE expression id=right **/undefined/** @END **/'})`
})

export const DivideTemplate = defineTemplate({
	modelId: 'Divide',
	version: '1.0.0',
	description: 'Produces a division expression.',
	inputs: {
		left: expressionFragment('Left operand.'),
		right: expressionFragment('Right operand.')
	},
	output: out('expression', { type: numberType, schema: { type: 'number' } }),
	source: `(${'/** @TYPE expression id=left **/undefined/** @END **/'} / ${'/** @TYPE expression id=right **/undefined/** @END **/'})`
})

// -----------------------------------------------------------------------------
// Type checks and coercions
// -----------------------------------------------------------------------------

export const BooleanCastTemplate = defineTemplate({
	modelId: 'BooleanCast',
	version: '1.0.0',
	description: 'Coerces an expression to boolean with Boolean(value).',
	inputs: {
		value: expressionFragment('Expression to coerce.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `Boolean(${'/** @TYPE expression id=value **/undefined/** @END **/'})`
})

export const NumberCastTemplate = defineTemplate({
	modelId: 'NumberCast',
	version: '1.0.0',
	description: 'Coerces an expression to number with Number(value).',
	inputs: {
		value: expressionFragment('Expression to coerce.')
	},
	output: out('expression', { type: numberType, schema: { type: 'number' } }),
	source: `Number(${'/** @TYPE expression id=value **/undefined/** @END **/'})`
})

export const StringCastTemplate = defineTemplate({
	modelId: 'StringCast',
	version: '1.0.0',
	description: 'Coerces an expression to string with String(value).',
	inputs: {
		value: expressionFragment('Expression to coerce.')
	},
	output: out('expression', { type: stringType, schema: { type: 'string' } }),
	source: `String(${'/** @TYPE expression id=value **/undefined/** @END **/'})`
})

export const IsArrayTemplate = defineTemplate({
	modelId: 'IsArray',
	version: '1.0.0',
	description: 'Checks whether an expression is an array.',
	inputs: {
		value: expressionFragment('Expression to check.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `Array.isArray(${'/** @TYPE expression id=value **/undefined/** @END **/'})`
})

export const IsNullishTemplate = defineTemplate({
	modelId: 'IsNullish',
	version: '1.0.0',
	description: 'Checks whether an expression is null or undefined.',
	inputs: {
		value: expressionFragment('Expression to check.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `(${'/** @TYPE expression id=value **/undefined/** @END **/'} == null)`
})

export const IsDefinedTemplate = defineTemplate({
	modelId: 'IsDefined',
	version: '1.0.0',
	description: 'Checks whether an expression is neither null nor undefined.',
	inputs: {
		value: expressionFragment('Expression to check.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `(${'/** @TYPE expression id=value **/undefined/** @END **/'} != null)`
})

export const TypeofEqualsTemplate = defineTemplate({
	modelId: 'TypeofEquals',
	version: '1.0.0',
	description: 'Checks typeof value against a literal JavaScript typeof string.',
	inputs: {
		value: expressionFragment('Expression to check.'),
		typeName: literalPort({
			regionKind: 'string',
			schema: { enum: ['string', 'number', 'boolean', 'undefined', 'object', 'function', 'symbol', 'bigint'] },
			description: 'JavaScript typeof result to compare against.'
		})
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `(typeof ${'/** @TYPE expression id=value **/undefined/** @END **/'} === ${'/** @TYPE string id=typeName **/"string"/** @END **/'})`
})

// -----------------------------------------------------------------------------
// JSON, Date, Math, and string helpers
// -----------------------------------------------------------------------------

export const JsonParseTemplate = defineTemplate({
	modelId: 'JsonParse',
	version: '1.0.0',
	description: 'Parses a JSON string expression with JSON.parse.',
	inputs: {
		value: expressionFragment('String expression to parse.', stringType)
	},
	output: out('expression', { type: unknownType, schema: true }),
	source: `JSON.parse(${'/** @TYPE expression id=value **/undefined/** @END **/'})`
})

export const JsonStringifyTemplate = defineTemplate({
	modelId: 'JsonStringify',
	version: '1.0.0',
	description: 'Stringifies an expression with JSON.stringify.',
	inputs: {
		value: expressionFragment('Expression to stringify.')
	},
	output: out('expression', { type: stringType, schema: { type: 'string' } }),
	source: `JSON.stringify(${'/** @TYPE expression id=value **/undefined/** @END **/'})`
})

export const NewDateTemplate = defineTemplate({
	modelId: 'NewDate',
	version: '1.0.0',
	description: 'Constructs a Date from an expression.',
	inputs: {
		value: expressionFragment('Date constructor input expression.')
	},
	output: out('expression', { type: { ts: 'Date' } }),
	source: `new Date(${'/** @TYPE expression id=value **/undefined/** @END **/'})`
})

export const DateToISOStringTemplate = defineTemplate({
	modelId: 'DateToISOString',
	version: '1.0.0',
	description: 'Calls .toISOString() on a Date expression.',
	inputs: {
		value: expressionFragment('Date expression.', { ts: 'Date' })
	},
	output: out('expression', { type: stringType, schema: { type: 'string' } }),
	source: `${'/** @TYPE expression id=value **/undefined/** @END **/'}.toISOString()`
})

export const MathRoundTemplate = defineTemplate({
	modelId: 'MathRound',
	version: '1.0.0',
	description: 'Rounds a number expression with Math.round.',
	inputs: {
		value: expressionFragment('Number expression.', numberType)
	},
	output: out('expression', { type: numberType, schema: { type: 'number' } }),
	source: `Math.round(${'/** @TYPE expression id=value **/undefined/** @END **/'})`
})

export const StringTrimTemplate = defineTemplate({
	modelId: 'StringTrim',
	version: '1.0.0',
	description: 'Trims a string expression.',
	inputs: {
		value: expressionFragment('String expression.', stringType)
	},
	output: out('expression', { type: stringType, schema: { type: 'string' } }),
	source: `${'/** @TYPE expression id=value **/undefined/** @END **/'}.trim()`
})

export const StringToLowerCaseTemplate = defineTemplate({
	modelId: 'StringToLowerCase',
	version: '1.0.0',
	description: 'Lowercases a string expression.',
	inputs: {
		value: expressionFragment('String expression.', stringType)
	},
	output: out('expression', { type: stringType, schema: { type: 'string' } }),
	source: `${'/** @TYPE expression id=value **/undefined/** @END **/'}.toLowerCase()`
})

export const StringSplitTemplate = defineTemplate({
	modelId: 'StringSplit',
	version: '1.0.0',
	description: 'Splits a string expression using a literal separator.',
	inputs: {
		value: expressionFragment('String expression.', stringType),
		separator: stringLiteral('Separator string.')
	},
	output: out('expression', {
		type: { ts: 'string[]', schema: { type: 'array', items: { type: 'string' } } },
		schema: { type: 'array', items: { type: 'string' } }
	}),
	source: `${'/** @TYPE expression id=value **/undefined/** @END **/'}.split(${'/** @TYPE string id=separator **/""/** @END **/'})`
})

export const StringIncludesTemplate = defineTemplate({
	modelId: 'StringIncludes',
	version: '1.0.0',
	description: 'Checks whether a string expression includes a literal substring.',
	inputs: {
		value: expressionFragment('String expression.', stringType),
		search: stringLiteral('Search string.')
	},
	output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
	source: `${'/** @TYPE expression id=value **/undefined/** @END **/'}.includes(${'/** @TYPE string id=search **/""/** @END **/'})`
})

// -----------------------------------------------------------------------------
// Statement/finalization templates
// -----------------------------------------------------------------------------

export const ReturnStatementTemplate = defineTemplate({
	modelId: 'ReturnStatement',
	version: '1.0.0',
	description: 'Wraps an expression in a return statement.',
	inputs: {
		value: expressionFragment('Expression to return.')
	},
	output: out('statement'),
	source: `return ${'/** @TYPE expression id=value **/undefined/** @END **/'};`
})

export const ConstDeclarationTemplate = defineTemplate({
	modelId: 'ConstDeclaration',
	version: '1.0.0',
	description: 'Creates a const declaration statement.',
	inputs: {
		name: identifierLiteral('Identifier-safe const name.'),
		value: expressionFragment('Initializer expression.')
	},
	output: out('statement'),
	source: `const ${'/** @TYPE identifier id=name **/placeholder/** @END **/'} = ${'/** @TYPE expression id=value **/undefined/** @END **/'};`
})

export const ExpressionStatementTemplate = defineTemplate({
	modelId: 'ExpressionStatement',
	version: '1.0.0',
	description: 'Converts an expression into an expression statement.',
	inputs: {
		value: expressionFragment('Expression to emit as a statement.')
	},
	output: out('statement'),
	source: `${'/** @TYPE expression id=value **/undefined/** @END **/'};`
})

export const StatementList2Template = defineTemplate({
	modelId: 'StatementList2',
	version: '1.0.0',
	description: 'Concatenates two statement fragments.',
	inputs: {
		first: fragmentPort({
			regionKind: 'statement',
			accepts: { outputKind: 'statement' },
			description: 'First statement.'
		}),
		second: fragmentPort({
			regionKind: 'statement',
			accepts: { outputKind: 'statement' },
			description: 'Second statement.'
		})
	},
	output: out('statement'),
	source: `${'/** @TYPE statement id=first **/throw new Error("placeholder");/** @END **/'}\n${'/** @TYPE statement id=second **/throw new Error("placeholder");/** @END **/'}`
})

export type AnyBasePatternGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
	string,
	Record<string, InputPort>,
	OutputPort,
	Record<string, TemplateTypeParameterDefinition> | undefined
>

export const readonlyUnknownArrayType: TypeDescriptor = {
	ts: 'readonly unknown[]',
	schema: { type: 'array' }
}
export const objectType: TypeDescriptor = { ts: 'object' }

const unconstrainedTypeParameter = (description: string) => ({
	description,
	constraint: { ts: 'unknown' }
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
		conditions: expressionCollectionInput(
			'Boolean producers in call order; condition templates may be chained here.',
			booleanType
		)
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
		array: expressionFragment(
			'Readonly array; a compatible typed array operation may be chained here.',
			arrayType('T')
		),
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
		array: expressionFragment(
			'Readonly array; a compatible typed array operation may be chained here.',
			arrayType('T')
		),
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
	array: expressionFragment(
		'Readonly input array; a compatible typed array operation may be chained here.',
		arrayType('T')
	),
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

// -----------------------------------------------------------------------------
// Exports grouped for registry construction.
// -----------------------------------------------------------------------------

export const coreGraphTemplateInputs = [
	InputExpressionTemplate,
	IdentifierExpressionTemplate,
	RawExpressionTemplate,
	RawStatementTemplate,
	AnyLiteralExpressionTemplate,
	StringLiteralTemplate,
	NumberLiteralTemplate,
	BooleanLiteralTemplate,
	NullLiteralTemplate,
	ArrayLiteralTemplate,
	ObjectLiteralTemplate,
	GetPropertyTemplate,
	GetIdentifierPropertyTemplate,
	OptionalGetPropertyTemplate,
	OptionalGetIdentifierPropertyTemplate,
	GetElementTemplate,
	OptionalGetElementTemplate,
	ArrayLengthTemplate,
	StaticObjectPropertyTemplate,
	IdentifierObjectPropertyTemplate,
	ObjectFromPropertyTemplate,
	ObjectFromTwoPropertiesTemplate,
	ObjectFromThreePropertiesTemplate,
	MergeObjectsTemplate,
	MergeObjectsWithPropertyTemplate,
	ArrayOfOneTemplate,
	ArrayOfTwoTemplate,
	ArrayMapRawTemplate,
	ArrayFilterRawTemplate,
	ArrayFindRawTemplate,
	ArraySomeRawTemplate,
	ArrayEveryRawTemplate,
	ArrayReduceRawTemplate,
	ArrayMapSuffixRawTemplate,
	ArrayFilterSuffixRawTemplate,
	ApplyExpressionSuffixTemplate,
	CallFunction0Template,
	CallFunction1Template,
	CallFunction2Template,
	MethodCall0Template,
	MethodCall1Template,
	MethodCall2Template,
	ConditionalExpressionTemplate,
	NullishCoalesceTemplate,
	LogicalAndTemplate,
	LogicalOrTemplate,
	NotTemplate,
	StrictEqualTemplate,
	StrictNotEqualTemplate,
	LessThanTemplate,
	GreaterThanTemplate,
	AddTemplate,
	SubtractTemplate,
	MultiplyTemplate,
	DivideTemplate,
	BooleanCastTemplate,
	NumberCastTemplate,
	StringCastTemplate,
	IsArrayTemplate,
	IsNullishTemplate,
	IsDefinedTemplate,
	TypeofEqualsTemplate,
	JsonParseTemplate,
	JsonStringifyTemplate,
	NewDateTemplate,
	DateToISOStringTemplate,
	MathRoundTemplate,
	StringTrimTemplate,
	StringToLowerCaseTemplate,
	StringSplitTemplate,
	StringIncludesTemplate,
	ReturnStatementTemplate,
	ConstDeclarationTemplate,
	ExpressionStatementTemplate,
	StatementList2Template
] satisfies readonly AnyGraphTemplateDefinitionInput[]

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
