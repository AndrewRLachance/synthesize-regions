import { defineTemplate, type GraphTemplateDefinitionInput } from '../src/templates/definition.js'
import type {
  FragmentInputPort,
  InputPort,
  LiteralInputPort,
  OutputPort,
  RawCodeInputPort,
  RawCodePolicy,
  RegionKind,
  TypeDescriptor,
  UnionInputPort
} from '../src/templates/graphTypes.js'

export type AnyGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
  string,
  Record<string, InputPort>
>



function literalPort(args: Omit<LiteralInputPort, 'kind'>): LiteralInputPort {
  return { kind: 'literal', ...args }
}

function fragmentPort(args: Omit<FragmentInputPort, 'kind'>): FragmentInputPort {
  return { kind: 'fragment', ...args }
}

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
  description: 'Single-line expression. Dangerous globals and module-loading constructs are rejected before generation.',
  maxLength: 300,
  allowNewlines: false,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: [
    '\\bnew\\s+Function\\b',
    '\\bawait\\b',
    '\\bwhile\\s*\\(',
    '\\bfor\\s*\\(',
    '\\bclass\\b'
  ]
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
}

export const propertyKeySchema = {
  type: 'string',
  minLength: 1
}

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
  template: () => 'input'
})

export const IdentifierExpressionTemplate = defineTemplate({
  modelId: 'IdentifierExpression',
  version: '1.0.0',
  description: 'Produces an expression from a safe identifier name.',
  inputs: {
    name: identifierLiteral('Identifier name to emit.')
  },
  output: out('expression', { type: unknownType, schema: true }),
  template: r => r('name')
})

export const RawExpressionTemplate = defineTemplate({
  modelId: 'RawExpression',
  version: '1.0.0',
  description: 'Produces an expression from a guarded raw-code input. Use as an escape hatch only.',
  inputs: {
    code: expressionRaw('Raw expression code.')
  },
  output: out('expression', { type: unknownType, schema: true }),
  template: r => r('code', 'undefined')
})

export const RawStatementTemplate = defineTemplate({
  modelId: 'RawStatement',
  version: '1.0.0',
  description: 'Produces a statement from a guarded raw-code input. Use as an escape hatch only.',
  inputs: {
    code: statementRaw('Raw statement code.')
  },
  output: out('statement'),
  template: r => r('code', 'throw new Error("unimplemented");')
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
  template: r => r('value')
})

export const StringLiteralTemplate = defineTemplate({
  modelId: 'StringLiteral',
  version: '1.0.0',
  description: 'Produces a string literal expression.',
  inputs: {
    value: stringLiteral('String value.')
  },
  output: out('expression', { type: stringType, schema: { type: 'string' } }),
  template: r => r('value')
})

export const NumberLiteralTemplate = defineTemplate({
  modelId: 'NumberLiteral',
  version: '1.0.0',
  description: 'Produces a number literal expression.',
  inputs: {
    value: numberLiteral('Number value.')
  },
  output: out('expression', { type: numberType, schema: { type: 'number' } }),
  template: r => r('value')
})

export const BooleanLiteralTemplate = defineTemplate({
  modelId: 'BooleanLiteral',
  version: '1.0.0',
  description: 'Produces a boolean literal expression.',
  inputs: {
    value: booleanLiteral('Boolean value.')
  },
  output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
  template: r => r('value')
})

export const NullLiteralTemplate = defineTemplate({
  modelId: 'NullLiteral',
  version: '1.0.0',
  description: 'Produces a null literal expression.',
  inputs: {
    value: literalPort({ regionKind: 'null', schema: { type: 'null' }, description: 'Must be null.' })
  },
  output: out('expression', { type: nullType, schema: { type: 'null' } }),
  template: r => r('value')
})

export const ArrayLiteralTemplate = defineTemplate({
  modelId: 'ArrayLiteral',
  version: '1.0.0',
  description: 'Produces an array literal expression from a JSON-like array.',
  inputs: {
    value: literalPort({ regionKind: 'array', schema: { type: 'array' }, description: 'Array literal value.' })
  },
  output: out('expression', { type: unknownArrayType, schema: { type: 'array' } }),
  template: r => r('value')
})

export const ObjectLiteralTemplate = defineTemplate({
  modelId: 'ObjectLiteral',
  version: '1.0.0',
  description: 'Produces an object literal expression from a JSON-like object.',
  inputs: {
    value: literalPort({ regionKind: 'object', schema: { type: 'object' }, description: 'Object literal value.' })
  },
  output: out('expression', { type: recordType, schema: { type: 'object' } }),
  template: r => r('value')
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
  template: r => `${r('object')}[${r('key')}]`
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
  template: r => `${r('object')}.${r('key')}`
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
  template: r => `${r('object')}?.[${r('key')}]`
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
  template: r => `${r('object')}?.${r('key')}`
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
  template: r => `${r('array')}[${r('index')}]`
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
  template: r => `${r('array')}?.[${r('index')}]`
})

export const ArrayLengthTemplate = defineTemplate({
  modelId: 'ArrayLength',
  version: '1.0.0',
  description: 'Reads the .length property from an array-like expression.',
  inputs: {
    array: expressionFragment('Array-like expression.')
  },
  output: out('expression', { type: numberType, schema: { type: 'number' } }),
  template: r => `${r('array')}.length`
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
  template: r => `${r('key')}: ${r('value')}`
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
  template: r => `${r('key')}: ${r('value')}`
})

export const ObjectFromPropertyTemplate = defineTemplate({
  modelId: 'ObjectFromProperty',
  version: '1.0.0',
  description: 'Wraps one object property fragment in an object expression.',
  inputs: {
    property: objectPropertyFragment('Object property fragment.')
  },
  output: out('expression', { type: recordType, schema: { type: 'object' } }),
  template: r => `({ ${r('property')} })`
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
  template: r => `({ ${r('first')}, ${r('second')} })`
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
  template: r => `({ ${r('first')}, ${r('second')}, ${r('third')} })`
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
  template: r => `({ ...${r('left')}, ...${r('right')} })`
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
  template: r => `({ ...${r('object')}, ${r('property')} })`
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
  template: r => `[${r('item')}]`
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
  template: r => `[${r('first')}, ${r('second')}]`
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
  template: r => `${r('array')}.map(${r('mapper', 'x => x')})`
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
  template: r => `${r('array')}.filter(${r('predicate', 'x => Boolean(x)')})`
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
  template: r => `${r('array')}.find(${r('predicate', 'x => Boolean(x)')})`
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
  template: r => `${r('array')}.some(${r('predicate', 'x => Boolean(x)')})`
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
  template: r => `${r('array')}.every(${r('predicate', 'x => Boolean(x)')})`
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
  template: r => `${r('array')}.reduce(${r('reducer', '(acc, x) => acc')}, ${r('initialValue')})`
})

export const ArrayMapSuffixRawTemplate = defineTemplate({
  modelId: 'ArrayMapSuffixRaw',
  version: '1.0.0',
  description: 'Produces a .map(...) expression suffix using a guarded raw mapper expression.',
  inputs: {
    mapper: expressionRaw('Arrow/function expression, e.g. x => x.id.')
  },
  output: out('expressionSuffix'),
  template: r => `.map(${r('mapper', 'x => x')})`
})

export const ArrayFilterSuffixRawTemplate = defineTemplate({
  modelId: 'ArrayFilterSuffixRaw',
  version: '1.0.0',
  description: 'Produces a .filter(...) expression suffix using a guarded raw predicate expression.',
  inputs: {
    predicate: expressionRaw('Predicate expression, e.g. x => x.active.')
  },
  output: out('expressionSuffix'),
  template: r => `.filter(${r('predicate', 'x => Boolean(x)')})`
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
  template: r => `${r('source')}${r('suffix')}`
})

export const CallFunction0Template = defineTemplate({
  modelId: 'CallFunction0',
  version: '1.0.0',
  description: 'Calls a function expression with no arguments.',
  inputs: {
    callee: expressionFragment('Function expression to call.')
  },
  output: out('expression', { type: unknownType, schema: true }),
  template: r => `${r('callee')}()`
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
  template: r => `${r('callee')}(${r('arg')})`
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
  template: r => `${r('callee')}(${r('firstArg')}, ${r('secondArg')})`
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
  template: r => `${r('object')}.${r('method')}()`
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
  template: r => `${r('object')}.${r('method')}(${r('arg')})`
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
  template: r => `${r('object')}.${r('method')}(${r('firstArg')}, ${r('secondArg')})`
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
  template: r => `(${r('condition')} ? ${r('whenTrue')} : ${r('whenFalse')})`
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
  template: r => `(${r('value')} ?? ${r('fallback')})`
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
  template: r => `(${r('left')} && ${r('right')})`
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
  template: r => `(${r('left')} || ${r('right')})`
})

export const NotTemplate = defineTemplate({
  modelId: 'Not',
  version: '1.0.0',
  description: 'Produces a logical negation expression.',
  inputs: {
    value: expressionFragment('Expression to negate.')
  },
  output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
  template: r => `(!${r('value')})`
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
  template: r => `(${r('left')} === ${r('right')})`
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
  template: r => `(${r('left')} !== ${r('right')})`
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
  template: r => `(${r('left')} < ${r('right')})`
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
  template: r => `(${r('left')} > ${r('right')})`
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
  template: r => `(${r('left')} + ${r('right')})`
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
  template: r => `(${r('left')} - ${r('right')})`
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
  template: r => `(${r('left')} * ${r('right')})`
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
  template: r => `(${r('left')} / ${r('right')})`
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
  template: r => `Boolean(${r('value')})`
})

export const NumberCastTemplate = defineTemplate({
  modelId: 'NumberCast',
  version: '1.0.0',
  description: 'Coerces an expression to number with Number(value).',
  inputs: {
    value: expressionFragment('Expression to coerce.')
  },
  output: out('expression', { type: numberType, schema: { type: 'number' } }),
  template: r => `Number(${r('value')})`
})

export const StringCastTemplate = defineTemplate({
  modelId: 'StringCast',
  version: '1.0.0',
  description: 'Coerces an expression to string with String(value).',
  inputs: {
    value: expressionFragment('Expression to coerce.')
  },
  output: out('expression', { type: stringType, schema: { type: 'string' } }),
  template: r => `String(${r('value')})`
})

export const IsArrayTemplate = defineTemplate({
  modelId: 'IsArray',
  version: '1.0.0',
  description: 'Checks whether an expression is an array.',
  inputs: {
    value: expressionFragment('Expression to check.')
  },
  output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
  template: r => `Array.isArray(${r('value')})`
})

export const IsNullishTemplate = defineTemplate({
  modelId: 'IsNullish',
  version: '1.0.0',
  description: 'Checks whether an expression is null or undefined.',
  inputs: {
    value: expressionFragment('Expression to check.')
  },
  output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
  template: r => `(${r('value')} == null)`
})

export const IsDefinedTemplate = defineTemplate({
  modelId: 'IsDefined',
  version: '1.0.0',
  description: 'Checks whether an expression is neither null nor undefined.',
  inputs: {
    value: expressionFragment('Expression to check.')
  },
  output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
  template: r => `(${r('value')} != null)`
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
  template: r => `(typeof ${r('value')} === ${r('typeName')})`
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
  template: r => `JSON.parse(${r('value')})`
})

export const JsonStringifyTemplate = defineTemplate({
  modelId: 'JsonStringify',
  version: '1.0.0',
  description: 'Stringifies an expression with JSON.stringify.',
  inputs: {
    value: expressionFragment('Expression to stringify.')
  },
  output: out('expression', { type: stringType, schema: { type: 'string' } }),
  template: r => `JSON.stringify(${r('value')})`
})

export const NewDateTemplate = defineTemplate({
  modelId: 'NewDate',
  version: '1.0.0',
  description: 'Constructs a Date from an expression.',
  inputs: {
    value: expressionFragment('Date constructor input expression.')
  },
  output: out('expression', { type: { ts: 'Date' } }),
  template: r => `new Date(${r('value')})`
})

export const DateToISOStringTemplate = defineTemplate({
  modelId: 'DateToISOString',
  version: '1.0.0',
  description: 'Calls .toISOString() on a Date expression.',
  inputs: {
    value: expressionFragment('Date expression.', { ts: 'Date' })
  },
  output: out('expression', { type: stringType, schema: { type: 'string' } }),
  template: r => `${r('value')}.toISOString()`
})

export const MathRoundTemplate = defineTemplate({
  modelId: 'MathRound',
  version: '1.0.0',
  description: 'Rounds a number expression with Math.round.',
  inputs: {
    value: expressionFragment('Number expression.', numberType)
  },
  output: out('expression', { type: numberType, schema: { type: 'number' } }),
  template: r => `Math.round(${r('value')})`
})

export const StringTrimTemplate = defineTemplate({
  modelId: 'StringTrim',
  version: '1.0.0',
  description: 'Trims a string expression.',
  inputs: {
    value: expressionFragment('String expression.', stringType)
  },
  output: out('expression', { type: stringType, schema: { type: 'string' } }),
  template: r => `${r('value')}.trim()`
})

export const StringToLowerCaseTemplate = defineTemplate({
  modelId: 'StringToLowerCase',
  version: '1.0.0',
  description: 'Lowercases a string expression.',
  inputs: {
    value: expressionFragment('String expression.', stringType)
  },
  output: out('expression', { type: stringType, schema: { type: 'string' } }),
  template: r => `${r('value')}.toLowerCase()`
})

export const StringSplitTemplate = defineTemplate({
  modelId: 'StringSplit',
  version: '1.0.0',
  description: 'Splits a string expression using a literal separator.',
  inputs: {
    value: expressionFragment('String expression.', stringType),
    separator: stringLiteral('Separator string.')
  },
  output: out('expression', { type: { ts: 'string[]', schema: { type: 'array', items: { type: 'string' } } }, schema: { type: 'array', items: { type: 'string' } } }),
  template: r => `${r('value')}.split(${r('separator')})`
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
  template: r => `${r('value')}.includes(${r('search')})`
})

// -----------------------------------------------------------------------------
// Lodash templates. These assume lodash is injected as `_` by the runner.
// -----------------------------------------------------------------------------

export const LodashGetTemplate = defineTemplate({
  modelId: 'LodashGet',
  version: '1.0.0',
  description: 'Reads a nested property using _.get(object, path, defaultValue).',
  inputs: {
    object: expressionFragment('Object expression.'),
    path: literalPort({
      regionKind: 'expression',
      schema: {
        anyOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ]
      },
      description: 'Lodash path string or string array.'
    }),
    defaultValue: unionPort({
      required: false,
      description: 'Optional default value expression or literal.',
      options: [
        expressionFragment('Default value expression.'),
        literalExpression('Default literal value.')
      ]
    })
  },
  output: out('expression', { type: unknownType, schema: true }),
  template: r => `_.get(${r('object')}, ${r('path')}, ${r('defaultValue', 'undefined')})`
})

export const LodashPickTemplate = defineTemplate({
  modelId: 'LodashPick',
  version: '1.0.0',
  description: 'Picks properties from an object with _.pick.',
  inputs: {
    object: expressionFragment('Object expression.'),
    keys: literalPort({
      regionKind: 'array',
      schema: { type: 'array', items: { type: 'string' } },
      description: 'Property keys to pick.'
    })
  },
  output: out('expression', { type: recordType, schema: { type: 'object' } }),
  template: r => `_.pick(${r('object')}, ${r('keys')})`
})

export const LodashOmitTemplate = defineTemplate({
  modelId: 'LodashOmit',
  version: '1.0.0',
  description: 'Omits properties from an object with _.omit.',
  inputs: {
    object: expressionFragment('Object expression.'),
    keys: literalPort({
      regionKind: 'array',
      schema: { type: 'array', items: { type: 'string' } },
      description: 'Property keys to omit.'
    })
  },
  output: out('expression', { type: recordType, schema: { type: 'object' } }),
  template: r => `_.omit(${r('object')}, ${r('keys')})`
})

export const LodashGroupByRawTemplate = defineTemplate({
  modelId: 'LodashGroupByRaw',
  version: '1.0.0',
  description: 'Groups an array with _.groupBy and a guarded raw iteratee expression.',
  inputs: {
    array: expressionFragment('Array expression.'),
    iteratee: expressionRaw('Lodash iteratee expression, e.g. x => x.category.')
  },
  output: out('expression', { type: { ts: 'Record<string, unknown[]>' }, schema: { type: 'object' } }),
  template: r => `_.groupBy(${r('array')}, ${r('iteratee', 'x => x')})`
})

export const LodashKeyByRawTemplate = defineTemplate({
  modelId: 'LodashKeyByRaw',
  version: '1.0.0',
  description: 'Indexes an array with _.keyBy and a guarded raw iteratee expression.',
  inputs: {
    array: expressionFragment('Array expression.'),
    iteratee: expressionRaw('Lodash iteratee expression, e.g. x => x.id.')
  },
  output: out('expression', { type: recordType, schema: { type: 'object' } }),
  template: r => `_.keyBy(${r('array')}, ${r('iteratee', 'x => x')})`
})

export const LodashSortByRawTemplate = defineTemplate({
  modelId: 'LodashSortByRaw',
  version: '1.0.0',
  description: 'Sorts an array with _.sortBy and a guarded raw iteratee expression.',
  inputs: {
    array: expressionFragment('Array expression.'),
    iteratee: expressionRaw('Lodash iteratee expression, e.g. x => x.name.')
  },
  output: out('expression', { type: unknownArrayType, schema: { type: 'array' } }),
  template: r => `_.sortBy(${r('array')}, ${r('iteratee', 'x => x')})`
})

export const LodashUniqByRawTemplate = defineTemplate({
  modelId: 'LodashUniqByRaw',
  version: '1.0.0',
  description: 'Deduplicates an array with _.uniqBy and a guarded raw iteratee expression.',
  inputs: {
    array: expressionFragment('Array expression.'),
    iteratee: expressionRaw('Lodash iteratee expression, e.g. x => x.id.')
  },
  output: out('expression', { type: unknownArrayType, schema: { type: 'array' } }),
  template: r => `_.uniqBy(${r('array')}, ${r('iteratee', 'x => x')})`
})

// -----------------------------------------------------------------------------
// ts-pattern style expression suffixes. These are useful when a registry includes
// a separate ApplyExpressionSuffix template.
// -----------------------------------------------------------------------------

export const PatternWithRawTemplate = defineTemplate({
  modelId: 'PatternWithRaw',
  version: '1.0.0',
  description: 'Produces a ts-pattern .with(pattern, handler) expression suffix using guarded raw expressions.',
  inputs: {
    pattern: expressionRaw('ts-pattern pattern expression.'),
    handler: expressionRaw('Handler expression, e.g. x => x.value.')
  },
  output: out('expressionSuffix'),
  template: r => `.with(${r('pattern', '{}')}, ${r('handler', 'x => x')})`
})

export const PatternOtherwiseRawTemplate = defineTemplate({
  modelId: 'PatternOtherwiseRaw',
  version: '1.0.0',
  description: 'Produces a ts-pattern .otherwise(handler) expression suffix using a guarded raw handler expression.',
  inputs: {
    handler: expressionRaw('Fallback handler expression, e.g. () => null.')
  },
  output: out('expressionSuffix'),
  template: r => `.otherwise(${r('handler', '() => undefined')})`
})

export const PatternExhaustiveSuffixTemplate = defineTemplate({
  modelId: 'PatternExhaustiveSuffix',
  version: '1.0.0',
  description: 'Produces a ts-pattern .exhaustive() expression suffix.',
  inputs: {},
  output: out('expressionSuffix'),
  template: () => '.exhaustive()'
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
  template: r => `return ${r('value')};`
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
  template: r => `const ${r('name')} = ${r('value')};`
})

export const ExpressionStatementTemplate = defineTemplate({
  modelId: 'ExpressionStatement',
  version: '1.0.0',
  description: 'Converts an expression into an expression statement.',
  inputs: {
    value: expressionFragment('Expression to emit as a statement.')
  },
  output: out('statement'),
  template: r => `${r('value')};`
})

export const StatementList2Template = defineTemplate({
  modelId: 'StatementList2',
  version: '1.0.0',
  description: 'Concatenates two statement fragments.',
  inputs: {
    first: fragmentPort({ regionKind: 'statement', accepts: { outputKind: 'statement' }, description: 'First statement.' }),
    second: fragmentPort({ regionKind: 'statement', accepts: { outputKind: 'statement' }, description: 'Second statement.' })
  },
  output: out('statement'),
  template: r => `${r('first')}\n${r('second')}`
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
  LodashGetTemplate,
  LodashPickTemplate,
  LodashOmitTemplate,
  LodashGroupByRawTemplate,
  LodashKeyByRawTemplate,
  LodashSortByRawTemplate,
  LodashUniqByRawTemplate,
  PatternWithRawTemplate,
  PatternOtherwiseRawTemplate,
  PatternExhaustiveSuffixTemplate,
  ReturnStatementTemplate,
  ConstDeclarationTemplate,
  ExpressionStatementTemplate,
  StatementList2Template
] satisfies readonly AnyGraphTemplateDefinitionInput[]
