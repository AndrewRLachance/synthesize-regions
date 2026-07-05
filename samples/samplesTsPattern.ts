import { defineTemplate, fragmentPort, rawCodePort, unionPort, literalPort } from '../src/templates.js'
import type { GraphTemplateDefinitionInput } from '../src/templates/definition.js'
import type {
  FragmentInputPort,
  InputPort,
  LiteralInputPort,
  RawCodeInputPort,
  RawCodePolicy,
  UnionInputPort
} from '../src/templates/graphTypes.js'


export type AnyGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
  string,
  Record<string, InputPort>
>




export const safeExpressionPolicy: RawCodePolicy = {
  description: 'Single-expression ts-pattern snippet. Imports and obvious ambient escape hatches are rejected at the planner-input layer.',
  maxLength: 600,
  allowNewlines: false,
  forbiddenSubstrings: ['import ', 'require(', 'process.', 'globalThis.', 'eval(', 'Function(']
}

export const safeHandlerPolicy: RawCodePolicy = {
  description: 'Single-line branch handler, normally an arrow function such as () => value or x => transform(x).',
  maxLength: 900,
  allowNewlines: false,
  forbiddenSubstrings: ['import ', 'require(', 'process.', 'globalThis.', 'eval(', 'Function(']
}

export const safePredicatePolicy: RawCodePolicy = {
  description: 'Single-line predicate or guard function, normally an arrow function returning boolean.',
  maxLength: 500,
  allowNewlines: false,
  forbiddenSubstrings: ['import ', 'require(', 'process.', 'globalThis.', 'eval(', 'Function(']
}

export const expressionRef = (description?: string): FragmentInputPort => fragmentPort({
  regionKind: 'expression',
  accepts: { outputKind: 'expression' },
  ...(description !== undefined ? { description } : {})
})

export const expressionCode = (description?: string): RawCodeInputPort => rawCodePort({
  regionKind: 'expression',
  policy: safeExpressionPolicy,
  ...(description !== undefined ? { description } : {})
})

export const expressionInput = (description?: string): UnionInputPort => unionPort({
  options: [expressionRef(description), expressionCode(description)],
  ...(description !== undefined ? { description } : {})
})

export const patternInput = (description?: string): RawCodeInputPort => rawCodePort({
  regionKind: 'expression',
  policy: safeExpressionPolicy,
  ...(description !== undefined ? { description } : {})
})

export const handlerInput = (description?: string): RawCodeInputPort => rawCodePort({
  regionKind: 'expression',
  policy: safeHandlerPolicy,
  ...(description !== undefined ? { description } : {})
})

export const predicateInput = (description?: string): RawCodeInputPort => rawCodePort({
  regionKind: 'expression',
  policy: safePredicatePolicy,
  ...(description !== undefined ? { description } : {})
})

export const suffixRef = (description?: string): FragmentInputPort => fragmentPort({
  regionKind: 'expressionSuffix',
  accepts: { outputKind: 'expressionSuffix' },
  ...(description !== undefined ? { description } : {})
})

export const stringLiteralInput = (description?: string): LiteralInputPort => literalPort({
  regionKind: 'string',
  schema: { type: 'string' },
  ...(description !== undefined ? { description } : {})
})

export const numberLiteralInput = (description?: string): LiteralInputPort => literalPort({
  regionKind: 'number',
  schema: { type: 'number' },
  ...(description !== undefined ? { description } : {})
})

export const booleanLiteralInput = (description?: string): LiteralInputPort => literalPort({
  regionKind: 'boolean',
  schema: { type: 'boolean' },
  ...(description !== undefined ? { description } : {})
})

/**
 * ts-pattern template catalog.
 *
 * Assumes generated code has:
 *
 *   import { match, P, isMatching } from 'ts-pattern'
 *
 * These templates intentionally expose patterns and branch handlers as gated
 * raw-code expression inputs because ts-pattern's pattern DSL is itself code.
 */

export const TsPatternMatchStart = defineTemplate({
  modelId: 'TsPatternMatchStart',
  version: '1.0.0',
  description: 'Creates a ts-pattern match builder expression: match(value).',
  inputs: {
    value: expressionInput('Value to pattern-match.')
  },
  output: {
    kind: 'expression',
    type: { ts: 'ReturnType<typeof match>' },
    description: 'A ts-pattern match builder expression.'
  },
  template: r => `match(${r('value')})`
})

export const TsPatternApplySuffix = defineTemplate({
  modelId: 'TsPatternApplySuffix',
  version: '1.0.0',
  description: 'Applies one expressionSuffix fragment to a ts-pattern match-chain expression.',
  inputs: {
    source: expressionInput('Match-chain expression.'),
    suffix: suffixRef('Expression suffix to append.')
  },
  output: {
    kind: 'expression',
    description: 'Expression formed by appending the suffix to the source.'
  },
  template: r => `${r('source')}${r('suffix')}`
})

export const TsPatternWithSuffix = defineTemplate({
  modelId: 'TsPatternWithSuffix',
  version: '1.0.0',
  description: 'Adds a .with(pattern, handler) branch to a match chain.',
  inputs: {
    pattern: patternInput('ts-pattern pattern expression.'),
    handler: handlerInput('Branch handler expression.')
  },
  output: { kind: 'expressionSuffix', description: '.with(...) chain suffix.' },
  template: r => `.with(${r('pattern')}, ${r('handler')})`
})

export const TsPatternWithGuardSuffix = defineTemplate({
  modelId: 'TsPatternWithGuardSuffix',
  version: '1.0.0',
  description: 'Adds a .with(pattern, guard, handler) branch to a match chain.',
  inputs: {
    pattern: patternInput('ts-pattern pattern expression.'),
    guard: predicateInput('Guard predicate expression.'),
    handler: handlerInput('Branch handler expression.')
  },
  output: { kind: 'expressionSuffix', description: '.with(..., guard, handler) chain suffix.' },
  template: r => `.with(${r('pattern')}, ${r('guard')}, ${r('handler')})`
})

export const TsPatternWhenSuffix = defineTemplate({
  modelId: 'TsPatternWhenSuffix',
  version: '1.0.0',
  description: 'Adds a .when(predicate, handler) branch to a match chain.',
  inputs: {
    predicate: predicateInput('Predicate expression.'),
    handler: handlerInput('Branch handler expression.')
  },
  output: { kind: 'expressionSuffix', description: '.when(...) chain suffix.' },
  template: r => `.when(${r('predicate')}, ${r('handler')})`
})

export const TsPatternOtherwiseSuffix = defineTemplate({
  modelId: 'TsPatternOtherwiseSuffix',
  version: '1.0.0',
  description: 'Adds a terminal .otherwise(handler) fallback to a match chain.',
  inputs: {
    handler: handlerInput('Fallback handler expression.')
  },
  output: { kind: 'expressionSuffix', description: '.otherwise(...) terminal suffix.' },
  template: r => `.otherwise(${r('handler')})`
})

export const TsPatternExhaustiveSuffix = defineTemplate({
  modelId: 'TsPatternExhaustiveSuffix',
  version: '1.0.0',
  description: 'Adds terminal .exhaustive() to a match chain.',
  inputs: {},
  output: { kind: 'expressionSuffix', description: '.exhaustive() terminal suffix.' },
  template: () => `.exhaustive()`
})

export const TsPatternRunSuffix = defineTemplate({
  modelId: 'TsPatternRunSuffix',
  version: '1.0.0',
  description: 'Adds terminal .run() to a match chain.',
  inputs: {},
  output: { kind: 'expressionSuffix', description: '.run() terminal suffix.' },
  template: () => `.run()`
})

export const TsPatternNarrowSuffix = defineTemplate({
  modelId: 'TsPatternNarrowSuffix',
  version: '1.0.0',
  description: 'Adds .narrow() to a match chain after handled cases.',
  inputs: {},
  output: { kind: 'expressionSuffix', description: '.narrow() chain suffix.' },
  template: () => `.narrow()`
})

export const TsPatternMatchWithOtherwise = defineTemplate({
  modelId: 'TsPatternMatchWithOtherwise',
  version: '1.0.0',
  description: 'Creates match(value).with(pattern, handler).otherwise(fallback).',
  inputs: {
    value: expressionInput('Value to pattern-match.'),
    pattern: patternInput('ts-pattern pattern expression.'),
    handler: handlerInput('Branch handler expression.'),
    fallback: handlerInput('Fallback handler expression.')
  },
  output: { kind: 'expression', description: 'Completed ts-pattern match expression.' },
  template: r => `match(${r('value')}).with(${r('pattern')}, ${r('handler')}).otherwise(${r('fallback')})`
})

export const TsPatternMatchWithExhaustive = defineTemplate({
  modelId: 'TsPatternMatchWithExhaustive',
  version: '1.0.0',
  description: 'Creates match(value).with(pattern, handler).exhaustive().',
  inputs: {
    value: expressionInput('Value to pattern-match.'),
    pattern: patternInput('ts-pattern pattern expression.'),
    handler: handlerInput('Branch handler expression.')
  },
  output: { kind: 'expression', description: 'Completed exhaustive ts-pattern match expression.' },
  template: r => `match(${r('value')}).with(${r('pattern')}, ${r('handler')}).exhaustive()`
})

export const TsPatternMatchTwoCasesOtherwise = defineTemplate({
  modelId: 'TsPatternMatchTwoCasesOtherwise',
  version: '1.0.0',
  description: 'Creates match(value) with two .with(...) cases and an .otherwise(...) fallback.',
  inputs: {
    value: expressionInput('Value to pattern-match.'),
    patternA: patternInput('First pattern expression.'),
    handlerA: handlerInput('First branch handler expression.'),
    patternB: patternInput('Second pattern expression.'),
    handlerB: handlerInput('Second branch handler expression.'),
    fallback: handlerInput('Fallback handler expression.')
  },
  output: { kind: 'expression', description: 'Completed two-case ts-pattern match expression.' },
  template: r => `match(${r('value')}).with(${r('patternA')}, ${r('handlerA')}).with(${r('patternB')}, ${r('handlerB')}).otherwise(${r('fallback')})`
})

export const TsPatternMatchThreeCasesOtherwise = defineTemplate({
  modelId: 'TsPatternMatchThreeCasesOtherwise',
  version: '1.0.0',
  description: 'Creates match(value) with three .with(...) cases and an .otherwise(...) fallback.',
  inputs: {
    value: expressionInput('Value to pattern-match.'),
    patternA: patternInput('First pattern expression.'),
    handlerA: handlerInput('First branch handler expression.'),
    patternB: patternInput('Second pattern expression.'),
    handlerB: handlerInput('Second branch handler expression.'),
    patternC: patternInput('Third pattern expression.'),
    handlerC: handlerInput('Third branch handler expression.'),
    fallback: handlerInput('Fallback handler expression.')
  },
  output: { kind: 'expression', description: 'Completed three-case ts-pattern match expression.' },
  template: r => `match(${r('value')}).with(${r('patternA')}, ${r('handlerA')}).with(${r('patternB')}, ${r('handlerB')}).with(${r('patternC')}, ${r('handlerC')}).otherwise(${r('fallback')})`
})

export const TsPatternMatchWhenOtherwise = defineTemplate({
  modelId: 'TsPatternMatchWhenOtherwise',
  version: '1.0.0',
  description: 'Creates match(value).when(predicate, handler).otherwise(fallback).',
  inputs: {
    value: expressionInput('Value to pattern-match.'),
    predicate: predicateInput('Predicate expression.'),
    handler: handlerInput('Predicate-matched handler expression.'),
    fallback: handlerInput('Fallback handler expression.')
  },
  output: { kind: 'expression', description: 'Completed predicate-based ts-pattern match expression.' },
  template: r => `match(${r('value')}).when(${r('predicate')}, ${r('handler')}).otherwise(${r('fallback')})`
})

export const TsPatternIsMatching = defineTemplate({
  modelId: 'TsPatternIsMatching',
  version: '1.0.0',
  description: 'Checks whether a value matches a ts-pattern pattern with isMatching(pattern, value).',
  inputs: {
    pattern: patternInput('Pattern expression.'),
    value: expressionInput('Value to test.')
  },
  output: {
    kind: 'expression',
    type: { ts: 'boolean' },
    schema: { type: 'boolean' },
    description: 'Boolean match result.'
  },
  template: r => `isMatching(${r('pattern')}, ${r('value')})`
})

export const TsPatternIsMatchingPredicate = defineTemplate({
  modelId: 'TsPatternIsMatchingPredicate',
  version: '1.0.0',
  description: 'Creates a reusable type guard function with isMatching(pattern).',
  inputs: {
    pattern: patternInput('Pattern expression.')
  },
  output: {
    kind: 'expression',
    type: { ts: '(value: unknown) => boolean' },
    description: 'Predicate/type-guard function.'
  },
  template: r => `isMatching(${r('pattern')})`
})

export const TsPatternWildcardPattern = defineTemplate({
  modelId: 'TsPatternWildcardPattern',
  version: '1.0.0',
  description: 'Produces the P._ wildcard pattern.',
  inputs: {},
  output: { kind: 'expression', description: 'P._ wildcard pattern.' },
  template: () => `P._`
})

export const TsPatternStringPattern = defineTemplate({
  modelId: 'TsPatternStringPattern',
  version: '1.0.0',
  description: 'Produces the P.string wildcard pattern.',
  inputs: {},
  output: { kind: 'expression', type: { ts: 'typeof P.string' }, description: 'P.string pattern.' },
  template: () => `P.string`
})

export const TsPatternNumberPattern = defineTemplate({
  modelId: 'TsPatternNumberPattern',
  version: '1.0.0',
  description: 'Produces the P.number wildcard pattern.',
  inputs: {},
  output: { kind: 'expression', type: { ts: 'typeof P.number' }, description: 'P.number pattern.' },
  template: () => `P.number`
})

export const TsPatternBooleanPattern = defineTemplate({
  modelId: 'TsPatternBooleanPattern',
  version: '1.0.0',
  description: 'Produces the P.boolean wildcard pattern.',
  inputs: {},
  output: { kind: 'expression', type: { ts: 'typeof P.boolean' }, description: 'P.boolean pattern.' },
  template: () => `P.boolean`
})

export const TsPatternBigIntPattern = defineTemplate({
  modelId: 'TsPatternBigIntPattern',
  version: '1.0.0',
  description: 'Produces the P.bigint wildcard pattern.',
  inputs: {},
  output: { kind: 'expression', type: { ts: 'typeof P.bigint' }, description: 'P.bigint pattern.' },
  template: () => `P.bigint`
})

export const TsPatternSymbolPattern = defineTemplate({
  modelId: 'TsPatternSymbolPattern',
  version: '1.0.0',
  description: 'Produces the P.symbol wildcard pattern.',
  inputs: {},
  output: { kind: 'expression', type: { ts: 'typeof P.symbol' }, description: 'P.symbol pattern.' },
  template: () => `P.symbol`
})

export const TsPatternNullishPattern = defineTemplate({
  modelId: 'TsPatternNullishPattern',
  version: '1.0.0',
  description: 'Produces the P.nullish pattern for null or undefined.',
  inputs: {},
  output: { kind: 'expression', type: { ts: 'typeof P.nullish' }, description: 'P.nullish pattern.' },
  template: () => `P.nullish`
})

export const TsPatternNonNullablePattern = defineTemplate({
  modelId: 'TsPatternNonNullablePattern',
  version: '1.0.0',
  description: 'Produces the P.nonNullable pattern.',
  inputs: {},
  output: { kind: 'expression', type: { ts: 'typeof P.nonNullable' }, description: 'P.nonNullable pattern.' },
  template: () => `P.nonNullable`
})

export const TsPatternLiteralStringPattern = defineTemplate({
  modelId: 'TsPatternLiteralStringPattern',
  version: '1.0.0',
  description: 'Produces a string literal pattern.',
  inputs: {
    value: stringLiteralInput('String literal to match.')
  },
  output: { kind: 'expression', description: 'String literal pattern.' },
  template: r => `${r('value')}`
})

export const TsPatternLiteralNumberPattern = defineTemplate({
  modelId: 'TsPatternLiteralNumberPattern',
  version: '1.0.0',
  description: 'Produces a number literal pattern.',
  inputs: {
    value: numberLiteralInput('Number literal to match.')
  },
  output: { kind: 'expression', description: 'Number literal pattern.' },
  template: r => `${r('value')}`
})

export const TsPatternLiteralBooleanPattern = defineTemplate({
  modelId: 'TsPatternLiteralBooleanPattern',
  version: '1.0.0',
  description: 'Produces a boolean literal pattern.',
  inputs: {
    value: booleanLiteralInput('Boolean literal to match.')
  },
  output: { kind: 'expression', description: 'Boolean literal pattern.' },
  template: r => `${r('value')}`
})

export const TsPatternArrayPattern = defineTemplate({
  modelId: 'TsPatternArrayPattern',
  version: '1.0.0',
  description: 'Produces P.array(subpattern), matching arrays whose elements all match a subpattern.',
  inputs: {
    itemPattern: patternInput('Element subpattern.')
  },
  output: { kind: 'expression', description: 'P.array(...) pattern.' },
  template: r => `P.array(${r('itemPattern')})`
})

export const TsPatternRecordValuePattern = defineTemplate({
  modelId: 'TsPatternRecordValuePattern',
  version: '1.0.0',
  description: 'Produces P.record(valuePattern), matching records with string keys and matching values.',
  inputs: {
    valuePattern: patternInput('Record value subpattern.')
  },
  output: { kind: 'expression', description: 'P.record(valuePattern) pattern.' },
  template: r => `P.record(${r('valuePattern')})`
})

export const TsPatternRecordKeyValuePattern = defineTemplate({
  modelId: 'TsPatternRecordKeyValuePattern',
  version: '1.0.0',
  description: 'Produces P.record(keyPattern, valuePattern), matching records with matching keys and values.',
  inputs: {
    keyPattern: patternInput('Record key subpattern.'),
    valuePattern: patternInput('Record value subpattern.')
  },
  output: { kind: 'expression', description: 'P.record(keyPattern, valuePattern) pattern.' },
  template: r => `P.record(${r('keyPattern')}, ${r('valuePattern')})`
})

export const TsPatternSetPattern = defineTemplate({
  modelId: 'TsPatternSetPattern',
  version: '1.0.0',
  description: 'Produces P.set(valuePattern), matching Set values whose entries match a subpattern.',
  inputs: {
    valuePattern: patternInput('Set entry subpattern.')
  },
  output: { kind: 'expression', description: 'P.set(...) pattern.' },
  template: r => `P.set(${r('valuePattern')})`
})

export const TsPatternMapPattern = defineTemplate({
  modelId: 'TsPatternMapPattern',
  version: '1.0.0',
  description: 'Produces P.map(keyPattern, valuePattern), matching Map keys and values.',
  inputs: {
    keyPattern: patternInput('Map key subpattern.'),
    valuePattern: patternInput('Map value subpattern.')
  },
  output: { kind: 'expression', description: 'P.map(...) pattern.' },
  template: r => `P.map(${r('keyPattern')}, ${r('valuePattern')})`
})

export const TsPatternNotPattern = defineTemplate({
  modelId: 'TsPatternNotPattern',
  version: '1.0.0',
  description: 'Produces P.not(pattern), matching everything except the subpattern.',
  inputs: {
    pattern: patternInput('Subpattern to negate.')
  },
  output: { kind: 'expression', description: 'P.not(...) pattern.' },
  template: r => `P.not(${r('pattern')})`
})

export const TsPatternOptionalPattern = defineTemplate({
  modelId: 'TsPatternOptionalPattern',
  version: '1.0.0',
  description: 'Produces P.optional(subpattern), for optional object keys.',
  inputs: {
    pattern: patternInput('Subpattern for defined values.')
  },
  output: { kind: 'expression', description: 'P.optional(...) pattern.' },
  template: r => `P.optional(${r('pattern')})`
})

export const TsPatternWhenPattern = defineTemplate({
  modelId: 'TsPatternWhenPattern',
  version: '1.0.0',
  description: 'Produces P.when(predicate), a guard pattern.',
  inputs: {
    predicate: predicateInput('Predicate expression.')
  },
  output: { kind: 'expression', description: 'P.when(...) pattern.' },
  template: r => `P.when(${r('predicate')})`
})

export const TsPatternSelectPattern = defineTemplate({
  modelId: 'TsPatternSelectPattern',
  version: '1.0.0',
  description: 'Produces P.select(), an anonymous selected-value pattern.',
  inputs: {},
  output: { kind: 'expression', description: 'P.select() pattern.' },
  template: () => `P.select()`
})

export const TsPatternNamedSelectPattern = defineTemplate({
  modelId: 'TsPatternNamedSelectPattern',
  version: '1.0.0',
  description: 'Produces P.select(name), a named selected-value pattern.',
  inputs: {
    name: stringLiteralInput('Selection name.')
  },
  output: { kind: 'expression', description: 'P.select(name) pattern.' },
  template: r => `P.select(${r('name')})`
})

export const TsPatternSelectSubpattern = defineTemplate({
  modelId: 'TsPatternSelectSubpattern',
  version: '1.0.0',
  description: 'Produces P.select(subpattern), selecting a value only when it matches a subpattern.',
  inputs: {
    pattern: patternInput('Subpattern to match and select.')
  },
  output: { kind: 'expression', description: 'P.select(pattern) pattern.' },
  template: r => `P.select(${r('pattern')})`
})

export const TsPatternNamedSelectSubpattern = defineTemplate({
  modelId: 'TsPatternNamedSelectSubpattern',
  version: '1.0.0',
  description: 'Produces P.select(name, subpattern), selecting a named value that matches a subpattern.',
  inputs: {
    name: stringLiteralInput('Selection name.'),
    pattern: patternInput('Subpattern to match and select.')
  },
  output: { kind: 'expression', description: 'P.select(name, pattern) pattern.' },
  template: r => `P.select(${r('name')}, ${r('pattern')})`
})

export const TsPatternInstanceOfPattern = defineTemplate({
  modelId: 'TsPatternInstanceOfPattern',
  version: '1.0.0',
  description: 'Produces P.instanceOf(Constructor).',
  inputs: {
    constructor: expressionInput('Class constructor expression.')
  },
  output: { kind: 'expression', description: 'P.instanceOf(...) pattern.' },
  template: r => `P.instanceOf(${r('constructor')})`
})

export const TsPatternUnion2Pattern = defineTemplate({
  modelId: 'TsPatternUnion2Pattern',
  version: '1.0.0',
  description: 'Produces P.union(left, right).',
  inputs: {
    left: patternInput('First subpattern.'),
    right: patternInput('Second subpattern.')
  },
  output: { kind: 'expression', description: 'P.union(...) pattern.' },
  template: r => `P.union(${r('left')}, ${r('right')})`
})

export const TsPatternUnion3Pattern = defineTemplate({
  modelId: 'TsPatternUnion3Pattern',
  version: '1.0.0',
  description: 'Produces P.union(a, b, c).',
  inputs: {
    a: patternInput('First subpattern.'),
    b: patternInput('Second subpattern.'),
    c: patternInput('Third subpattern.')
  },
  output: { kind: 'expression', description: 'P.union(...) pattern.' },
  template: r => `P.union(${r('a')}, ${r('b')}, ${r('c')})`
})

export const TsPatternIntersection2Pattern = defineTemplate({
  modelId: 'TsPatternIntersection2Pattern',
  version: '1.0.0',
  description: 'Produces P.intersection(left, right).',
  inputs: {
    left: patternInput('First subpattern.'),
    right: patternInput('Second subpattern.')
  },
  output: { kind: 'expression', description: 'P.intersection(...) pattern.' },
  template: r => `P.intersection(${r('left')}, ${r('right')})`
})

export const TsPatternStringStartsWithPattern = defineTemplate({
  modelId: 'TsPatternStringStartsWithPattern',
  version: '1.0.0',
  description: 'Produces P.string.startsWith(prefix).',
  inputs: { prefix: stringLiteralInput('Required string prefix.') },
  output: { kind: 'expression', description: 'P.string.startsWith(...) pattern.' },
  template: r => `P.string.startsWith(${r('prefix')})`
})

export const TsPatternStringEndsWithPattern = defineTemplate({
  modelId: 'TsPatternStringEndsWithPattern',
  version: '1.0.0',
  description: 'Produces P.string.endsWith(suffix).',
  inputs: { suffix: stringLiteralInput('Required string suffix.') },
  output: { kind: 'expression', description: 'P.string.endsWith(...) pattern.' },
  template: r => `P.string.endsWith(${r('suffix')})`
})

export const TsPatternStringIncludesPattern = defineTemplate({
  modelId: 'TsPatternStringIncludesPattern',
  version: '1.0.0',
  description: 'Produces P.string.includes(needle).',
  inputs: { needle: stringLiteralInput('Substring that must appear.') },
  output: { kind: 'expression', description: 'P.string.includes(...) pattern.' },
  template: r => `P.string.includes(${r('needle')})`
})

export const TsPatternStringRegexPattern = defineTemplate({
  modelId: 'TsPatternStringRegexPattern',
  version: '1.0.0',
  description: 'Produces P.string.regex(new RegExp(source, flags)).',
  inputs: {
    source: stringLiteralInput('Regular expression source.'),
    flags: stringLiteralInput('Regular expression flags, such as "u" or "iu".')
  },
  output: { kind: 'expression', description: 'P.string.regex(...) pattern.' },
  template: r => `P.string.regex(new RegExp(${r('source')}, ${r('flags')}))`
})

export const TsPatternStringMinLengthPattern = defineTemplate({
  modelId: 'TsPatternStringMinLengthPattern',
  version: '1.0.0',
  description: 'Produces P.string.minLength(min).',
  inputs: { min: numberLiteralInput('Minimum length.') },
  output: { kind: 'expression', description: 'P.string.minLength(...) pattern.' },
  template: r => `P.string.minLength(${r('min')})`
})

export const TsPatternStringMaxLengthPattern = defineTemplate({
  modelId: 'TsPatternStringMaxLengthPattern',
  version: '1.0.0',
  description: 'Produces P.string.maxLength(max).',
  inputs: { max: numberLiteralInput('Maximum length.') },
  output: { kind: 'expression', description: 'P.string.maxLength(...) pattern.' },
  template: r => `P.string.maxLength(${r('max')})`
})

export const TsPatternStringLengthPattern = defineTemplate({
  modelId: 'TsPatternStringLengthPattern',
  version: '1.0.0',
  description: 'Produces P.string.length(length).',
  inputs: { length: numberLiteralInput('Exact length.') },
  output: { kind: 'expression', description: 'P.string.length(...) pattern.' },
  template: r => `P.string.length(${r('length')})`
})

export const TsPatternNumberBetweenPattern = defineTemplate({
  modelId: 'TsPatternNumberBetweenPattern',
  version: '1.0.0',
  description: 'Produces P.number.between(min, max).',
  inputs: {
    min: numberLiteralInput('Inclusive lower bound.'),
    max: numberLiteralInput('Inclusive upper bound.')
  },
  output: { kind: 'expression', description: 'P.number.between(...) pattern.' },
  template: r => `P.number.between(${r('min')}, ${r('max')})`
})

export const TsPatternNumberLessThanPattern = defineTemplate({
  modelId: 'TsPatternNumberLessThanPattern',
  version: '1.0.0',
  description: 'Produces P.number.lt(max).',
  inputs: { max: numberLiteralInput('Exclusive upper bound.') },
  output: { kind: 'expression', description: 'P.number.lt(...) pattern.' },
  template: r => `P.number.lt(${r('max')})`
})

export const TsPatternNumberLessThanOrEqualPattern = defineTemplate({
  modelId: 'TsPatternNumberLessThanOrEqualPattern',
  version: '1.0.0',
  description: 'Produces P.number.lte(max).',
  inputs: { max: numberLiteralInput('Inclusive upper bound.') },
  output: { kind: 'expression', description: 'P.number.lte(...) pattern.' },
  template: r => `P.number.lte(${r('max')})`
})

export const TsPatternNumberGreaterThanPattern = defineTemplate({
  modelId: 'TsPatternNumberGreaterThanPattern',
  version: '1.0.0',
  description: 'Produces P.number.gt(min).',
  inputs: { min: numberLiteralInput('Exclusive lower bound.') },
  output: { kind: 'expression', description: 'P.number.gt(...) pattern.' },
  template: r => `P.number.gt(${r('min')})`
})

export const TsPatternNumberGreaterThanOrEqualPattern = defineTemplate({
  modelId: 'TsPatternNumberGreaterThanOrEqualPattern',
  version: '1.0.0',
  description: 'Produces P.number.gte(min).',
  inputs: { min: numberLiteralInput('Inclusive lower bound.') },
  output: { kind: 'expression', description: 'P.number.gte(...) pattern.' },
  template: r => `P.number.gte(${r('min')})`
})

export const TsPatternNumberIntegerPattern = defineTemplate({
  modelId: 'TsPatternNumberIntegerPattern',
  version: '1.0.0',
  description: 'Produces P.number.int().',
  inputs: {},
  output: { kind: 'expression', description: 'P.number.int() pattern.' },
  template: () => `P.number.int()`
})

export const TsPatternNumberFinitePattern = defineTemplate({
  modelId: 'TsPatternNumberFinitePattern',
  version: '1.0.0',
  description: 'Produces P.number.finite().',
  inputs: {},
  output: { kind: 'expression', description: 'P.number.finite() pattern.' },
  template: () => `P.number.finite()`
})

export const TsPatternNumberPositivePattern = defineTemplate({
  modelId: 'TsPatternNumberPositivePattern',
  version: '1.0.0',
  description: 'Produces P.number.positive().',
  inputs: {},
  output: { kind: 'expression', description: 'P.number.positive() pattern.' },
  template: () => `P.number.positive()`
})

export const TsPatternNumberNegativePattern = defineTemplate({
  modelId: 'TsPatternNumberNegativePattern',
  version: '1.0.0',
  description: 'Produces P.number.negative().',
  inputs: {},
  output: { kind: 'expression', description: 'P.number.negative() pattern.' },
  template: () => `P.number.negative()`
})

export const TsPatternDiscriminatedUnionCase = defineTemplate({
  modelId: 'TsPatternDiscriminatedUnionCase',
  version: '1.0.0',
  description: 'Creates an object pattern for a discriminated-union type field: { type: literal }.',
  inputs: {
    type: stringLiteralInput('Discriminator value.')
  },
  output: { kind: 'expression', description: 'Object pattern matching { type: value }.' },
  template: r => `({ type: ${r('type')} })`
})

export const TsPatternStatusCase = defineTemplate({
  modelId: 'TsPatternStatusCase',
  version: '1.0.0',
  description: 'Creates an object pattern for a status field: { status: literal }.',
  inputs: {
    status: stringLiteralInput('Status value.')
  },
  output: { kind: 'expression', description: 'Object pattern matching { status: value }.' },
  template: r => `({ status: ${r('status')} })`
})

export const TsPatternPropertyPattern = defineTemplate({
  modelId: 'TsPatternPropertyPattern',
  version: '1.0.0',
  description: 'Creates a one-property object pattern using an identifier-like property name and subpattern.',
  inputs: {
    property: rawCodePort({
      regionKind: 'identifier',
      policy: {
        description: 'Identifier-like property name.',
        maxLength: 80,
        allowNewlines: false,
        forbiddenPatterns: ['[^A-Za-z0-9_$]']
      }
    }),
    pattern: patternInput('Property subpattern.')
  },
  output: { kind: 'expression', description: 'Object pattern with one property.' },
  template: r => `({ ${r('property')}: ${r('pattern')} })`
})

export const TsPatternTuple2Pattern = defineTemplate({
  modelId: 'TsPatternTuple2Pattern',
  version: '1.0.0',
  description: 'Creates a two-element tuple pattern.',
  inputs: {
    first: patternInput('First element pattern.'),
    second: patternInput('Second element pattern.')
  },
  output: { kind: 'expression', description: 'Two-element tuple pattern.' },
  template: r => `[${r('first')}, ${r('second')}]`
})

export const TsPatternTuple3Pattern = defineTemplate({
  modelId: 'TsPatternTuple3Pattern',
  version: '1.0.0',
  description: 'Creates a three-element tuple pattern.',
  inputs: {
    first: patternInput('First element pattern.'),
    second: patternInput('Second element pattern.'),
    third: patternInput('Third element pattern.')
  },
  output: { kind: 'expression', description: 'Three-element tuple pattern.' },
  template: r => `[${r('first')}, ${r('second')}, ${r('third')}]`
})

export const TsPatternMaybeDefault = defineTemplate({
  modelId: 'TsPatternMaybeDefault',
  version: '1.0.0',
  description: 'Returns a fallback for nullish values and otherwise returns/transforms the non-nullish value.',
  inputs: {
    value: expressionInput('Nullable value.'),
    nonNullHandler: handlerInput('Handler for non-nullish value, for example x => x.'),
    nullishHandler: handlerInput('Handler for nullish value, for example () => fallback.')
  },
  output: { kind: 'expression', description: 'Nullish-aware match expression.' },
  template: r => `match(${r('value')}).with(P.nonNullable, ${r('nonNullHandler')}).with(P.nullish, ${r('nullishHandler')}).exhaustive()`
})

export const TsPatternResultOkErr = defineTemplate({
  modelId: 'TsPatternResultOkErr',
  version: '1.0.0',
  description: 'Matches a common { type: "ok" } / { type: "error" } result union.',
  inputs: {
    value: expressionInput('Result-like value.'),
    okHandler: handlerInput('Handler for { type: "ok" }.'),
    errorHandler: handlerInput('Handler for { type: "error" }.')
  },
  output: { kind: 'expression', description: 'Result-union match expression.' },
  template: r => `match(${r('value')}).with({ type: 'ok' }, ${r('okHandler')}).with({ type: 'error' }, ${r('errorHandler')}).exhaustive()`
})

export const TsPatternAsyncState = defineTemplate({
  modelId: 'TsPatternAsyncState',
  version: '1.0.0',
  description: 'Matches common async state statuses: idle, loading, success, error.',
  inputs: {
    value: expressionInput('Async state value.'),
    idleHandler: handlerInput('Handler for { status: "idle" }.'),
    loadingHandler: handlerInput('Handler for { status: "loading" }.'),
    successHandler: handlerInput('Handler for { status: "success" }.'),
    errorHandler: handlerInput('Handler for { status: "error" }.')
  },
  output: { kind: 'expression', description: 'Async-state match expression.' },
  template: r => `match(${r('value')}).with({ status: 'idle' }, ${r('idleHandler')}).with({ status: 'loading' }, ${r('loadingHandler')}).with({ status: 'success' }, ${r('successHandler')}).with({ status: 'error' }, ${r('errorHandler')}).exhaustive()`
})

export const TsPatternValidateObjectWithFallback = defineTemplate({
  modelId: 'TsPatternValidateObjectWithFallback',
  version: '1.0.0',
  description: 'Matches a value against an object-like pattern and returns fallback otherwise.',
  inputs: {
    value: expressionInput('Value to validate.'),
    objectPattern: patternInput('Object pattern expression.'),
    matchedHandler: handlerInput('Handler for matching object.'),
    fallbackHandler: handlerInput('Fallback handler.')
  },
  output: { kind: 'expression', description: 'Object validation/mapping match expression.' },
  template: r => `match(${r('value')}).with(${r('objectPattern')}, ${r('matchedHandler')}).otherwise(${r('fallbackHandler')})`
})

export const TsPatternArrayClassifier = defineTemplate({
  modelId: 'TsPatternArrayClassifier',
  version: '1.0.0',
  description: 'Classifies a value as an array of strings, array of numbers, or other.',
  inputs: {
    value: expressionInput('Value to classify.'),
    stringArrayHandler: handlerInput('Handler for P.array(P.string).'),
    numberArrayHandler: handlerInput('Handler for P.array(P.number).'),
    fallbackHandler: handlerInput('Fallback handler.')
  },
  output: { kind: 'expression', description: 'Array-classifying match expression.' },
  template: r => `match(${r('value')}).with(P.array(P.string), ${r('stringArrayHandler')}).with(P.array(P.number), ${r('numberArrayHandler')}).otherwise(${r('fallbackHandler')})`
})

export const TsPatternHttpResponseClassifier = defineTemplate({
  modelId: 'TsPatternHttpResponseClassifier',
  version: '1.0.0',
  description: 'Classifies an HTTP-like response object by status using numeric patterns.',
  inputs: {
    response: expressionInput('HTTP-like response with status.'),
    successHandler: handlerInput('Handler for 2xx responses.'),
    clientErrorHandler: handlerInput('Handler for 4xx responses.'),
    serverErrorHandler: handlerInput('Handler for 5xx responses.'),
    fallbackHandler: handlerInput('Fallback handler.')
  },
  output: { kind: 'expression', description: 'HTTP status match expression.' },
  template: r => `match(${r('response')}).with({ status: P.number.between(200, 299) }, ${r('successHandler')}).with({ status: P.number.between(400, 499) }, ${r('clientErrorHandler')}).with({ status: P.number.between(500, 599) }, ${r('serverErrorHandler')}).otherwise(${r('fallbackHandler')})`
})

export const tsPatternGraphTemplateInputs = [
  TsPatternMatchStart,
  TsPatternApplySuffix,
  TsPatternWithSuffix,
  TsPatternWithGuardSuffix,
  TsPatternWhenSuffix,
  TsPatternOtherwiseSuffix,
  TsPatternExhaustiveSuffix,
  TsPatternRunSuffix,
  TsPatternNarrowSuffix,
  TsPatternMatchWithOtherwise,
  TsPatternMatchWithExhaustive,
  TsPatternMatchTwoCasesOtherwise,
  TsPatternMatchThreeCasesOtherwise,
  TsPatternMatchWhenOtherwise,
  TsPatternIsMatching,
  TsPatternIsMatchingPredicate,
  TsPatternWildcardPattern,
  TsPatternStringPattern,
  TsPatternNumberPattern,
  TsPatternBooleanPattern,
  TsPatternBigIntPattern,
  TsPatternSymbolPattern,
  TsPatternNullishPattern,
  TsPatternNonNullablePattern,
  TsPatternLiteralStringPattern,
  TsPatternLiteralNumberPattern,
  TsPatternLiteralBooleanPattern,
  TsPatternArrayPattern,
  TsPatternRecordValuePattern,
  TsPatternRecordKeyValuePattern,
  TsPatternSetPattern,
  TsPatternMapPattern,
  TsPatternNotPattern,
  TsPatternOptionalPattern,
  TsPatternWhenPattern,
  TsPatternSelectPattern,
  TsPatternNamedSelectPattern,
  TsPatternSelectSubpattern,
  TsPatternNamedSelectSubpattern,
  TsPatternInstanceOfPattern,
  TsPatternUnion2Pattern,
  TsPatternUnion3Pattern,
  TsPatternIntersection2Pattern,
  TsPatternStringStartsWithPattern,
  TsPatternStringEndsWithPattern,
  TsPatternStringIncludesPattern,
  TsPatternStringRegexPattern,
  TsPatternStringMinLengthPattern,
  TsPatternStringMaxLengthPattern,
  TsPatternStringLengthPattern,
  TsPatternNumberBetweenPattern,
  TsPatternNumberLessThanPattern,
  TsPatternNumberLessThanOrEqualPattern,
  TsPatternNumberGreaterThanPattern,
  TsPatternNumberGreaterThanOrEqualPattern,
  TsPatternNumberIntegerPattern,
  TsPatternNumberFinitePattern,
  TsPatternNumberPositivePattern,
  TsPatternNumberNegativePattern,
  TsPatternDiscriminatedUnionCase,
  TsPatternStatusCase,
  TsPatternPropertyPattern,
  TsPatternTuple2Pattern,
  TsPatternTuple3Pattern,
  TsPatternMaybeDefault,
  TsPatternResultOkErr,
  TsPatternAsyncState,
  TsPatternValidateObjectWithFallback,
  TsPatternArrayClassifier,
  TsPatternHttpResponseClassifier
] as const satisfies readonly AnyGraphTemplateDefinitionInput[]
