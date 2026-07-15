import type { GraphTemplateDefinitionInput } from '../src/templates/definition.js'
import type {
  FragmentInputPort,
  InputPort,
  LiteralInputPort,
  OutputPort,
  RawCodeInputPort,
  RawCodePolicy,
  RegionKind,
  TypeDescriptor
} from '../src/templates/graphTypes.js'
import { fragmentPort, literalPort, rawCodePort } from '../src/templates/compatibility.js'
import { defineTemplate } from '../src/templates/definition.js'

export type AnyGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
  string,
  Record<string, InputPort>
>



function out(kind: RegionKind, extra: Omit<OutputPort, 'kind'> = {}): OutputPort {
  return { kind, ...extra }
}

export const unknownType: TypeDescriptor = { ts: 'unknown', schema: true }
export const stringType: TypeDescriptor = { ts: 'string', schema: { type: 'string' } }
export const numberType: TypeDescriptor = { ts: 'number', schema: { type: 'number' } }
export const dateType: TypeDescriptor = { ts: 'Date' }
export const promiseUnknownType: TypeDescriptor = { ts: 'Promise<unknown>' }
export const zodSchemaType: TypeDescriptor = { ts: 'z.ZodTypeAny' }
export const zodSafeParseResultType: TypeDescriptor = { ts: 'z.SafeParseReturnType<unknown, unknown>' }

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

export const expressionFragment = (description?: string, type?: TypeDescriptor): FragmentInputPort =>
  fragmentPort({
    regionKind: 'expression',
    accepts: {
      outputKind: 'expression',
      ...(type ? { type } : {})
    },
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

export const rawExpression = (description?: string, type?: TypeDescriptor): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawExpressionPolicy,
    ...(type ? { type } : {}),
    ...(description ? { description } : {})
  })

// -----------------------------------------------------------------------------
// Popular-library templates.
//
// These definitions assume the corresponding library bindings are available in
// the generated code context. For example: _, format, parseISO, addDays,
// differenceInDays, z, axios, dayjs, and clsx.
// -----------------------------------------------------------------------------

export const LodashMapTemplate = defineTemplate({
  modelId: 'LodashMap',
  version: '1.0.0',
  description: 'Maps a collection with Lodash _.map(collection, iteratee). Assumes `_` is in scope.',
  inputs: {
    collection: expressionFragment('Array or object collection to map.'),
    iteratee: rawExpression('Single-line Lodash iteratee expression, such as `item => item.id` or `"id"`.')
  },
  output: out('expression', { type: { ts: 'unknown[]', schema: { type: 'array' } } }),
  source: `_.map(${"/** @TYPE expression id=collection **/undefined/** @END **/"}, ${"/** @TYPE expression id=iteratee **/undefined/** @END **/"})`
})

export const LodashFilterTemplate = defineTemplate({
  modelId: 'LodashFilter',
  version: '1.0.0',
  description: 'Filters a collection with Lodash _.filter(collection, predicate). Assumes `_` is in scope.',
  inputs: {
    collection: expressionFragment('Array or object collection to filter.'),
    predicate: rawExpression('Single-line Lodash predicate expression, such as `item => item.active`.')
  },
  output: out('expression', { type: { ts: 'unknown[]', schema: { type: 'array' } } }),
  source: `_.filter(${"/** @TYPE expression id=collection **/undefined/** @END **/"}, ${"/** @TYPE expression id=predicate **/undefined/** @END **/"})`
})

export const LodashOrderByTemplate = defineTemplate({
  modelId: 'LodashOrderBy',
  version: '1.0.0',
  description: 'Sorts a collection with Lodash _.orderBy(collection, iteratees, orders). Assumes `_` is in scope.',
  inputs: {
    collection: expressionFragment('Array or object collection to sort.'),
    iteratees: rawExpression('Lodash iteratees expression, usually an array like `["lastName", "firstName"]`.'),
    orders: rawExpression('Lodash sort orders expression, usually an array like `["asc", "desc"]`.')
  },
  output: out('expression', { type: { ts: 'unknown[]', schema: { type: 'array' } } }),
  source: `_.orderBy(${"/** @TYPE expression id=collection **/undefined/** @END **/"}, ${"/** @TYPE expression id=iteratees **/undefined/** @END **/"}, ${"/** @TYPE expression id=orders **/undefined/** @END **/"})`
})

export const DateFnsParseIsoTemplate = defineTemplate({
  modelId: 'DateFnsParseISO',
  version: '1.0.0',
  description: 'Parses an ISO-8601 string with date-fns parseISO(value). Assumes `parseISO` is in scope.',
  inputs: {
    value: expressionFragment('ISO date/time string expression.', stringType)
  },
  output: out('expression', { type: dateType }),
  source: `parseISO(${"/** @TYPE expression id=value **/undefined/** @END **/"})`
})

export const DateFnsFormatTemplate = defineTemplate({
  modelId: 'DateFnsFormat',
  version: '1.0.0',
  description: 'Formats a Date expression with date-fns format(date, pattern). Assumes `format` is in scope.',
  inputs: {
    date: expressionFragment('Date expression to format.', dateType),
    pattern: stringLiteral('date-fns format pattern, such as `yyyy-MM-dd`.')
  },
  output: out('expression', { type: stringType }),
  source: `format(${"/** @TYPE expression id=date **/undefined/** @END **/"}, ${"/** @TYPE string id=pattern **/\"\"/** @END **/"})`
})

export const DateFnsAddDaysTemplate = defineTemplate({
  modelId: 'DateFnsAddDays',
  version: '1.0.0',
  description: 'Adds days to a Date expression with date-fns addDays(date, amount). Assumes `addDays` is in scope.',
  inputs: {
    date: expressionFragment('Date expression.', dateType),
    amount: numberLiteral('Number of days to add.')
  },
  output: out('expression', { type: dateType }),
  source: `addDays(${"/** @TYPE expression id=date **/undefined/** @END **/"}, ${"/** @TYPE number id=amount **/0/** @END **/"})`
})


export const ZodParseTemplate = defineTemplate({
  modelId: 'ZodParse',
  version: '1.0.0',
  description: 'Validates and returns data with schema.parse(value). Assumes a Zod schema expression is provided.',
  inputs: {
    schema: expressionFragment('Zod schema expression.', zodSchemaType),
    value: expressionFragment('Value to validate and parse.')
  },
  output: out('expression', { type: unknownType }),
  source: `${"/** @TYPE expression id=schema **/undefined/** @END **/"}.parse(${"/** @TYPE expression id=value **/undefined/** @END **/"})`
})

export const ZodSafeParseTemplate = defineTemplate({
  modelId: 'ZodSafeParse',
  version: '1.0.0',
  description: 'Validates data with schema.safeParse(value) and returns a discriminated result object.',
  inputs: {
    schema: expressionFragment('Zod schema expression.', zodSchemaType),
    value: expressionFragment('Value to validate.')
  },
  output: out('expression', { type: zodSafeParseResultType }),
  source: `${"/** @TYPE expression id=schema **/undefined/** @END **/"}.safeParse(${"/** @TYPE expression id=value **/undefined/** @END **/"})`
})

export const AxiosGetTemplate = defineTemplate({
  modelId: 'AxiosGet',
  version: '1.0.0',
  description: 'Creates an Axios GET request expression axios.get(url, config). Assumes `axios` is in scope.',
  inputs: {
    url: expressionFragment('Request URL expression.', stringType),
    config: rawExpression('Axios request config expression, such as `{ params: { id } }`.')
  },
  output: out('expression', { type: promiseUnknownType }),
  source: `axios.get(${"/** @TYPE expression id=url **/undefined/** @END **/"}, ${"/** @TYPE expression id=config **/undefined/** @END **/"})`
})

export const AxiosPostTemplate = defineTemplate({
  modelId: 'AxiosPost',
  version: '1.0.0',
  description: 'Creates an Axios POST request expression axios.post(url, data, config). Assumes `axios` is in scope.',
  inputs: {
    url: expressionFragment('Request URL expression.', stringType),
    data: expressionFragment('Request body expression.'),
    config: rawExpression('Axios request config expression, such as `{ headers: { ... } }`.')
  },
  output: out('expression', { type: promiseUnknownType }),
  source: `axios.post(${"/** @TYPE expression id=url **/undefined/** @END **/"}, ${"/** @TYPE expression id=data **/undefined/** @END **/"}, ${"/** @TYPE expression id=config **/undefined/** @END **/"})`
})

export const popularLibraryGraphTemplateInputs = [
  LodashMapTemplate,
  LodashFilterTemplate,
  LodashOrderByTemplate,
  DateFnsParseIsoTemplate,
  DateFnsFormatTemplate,
  DateFnsAddDaysTemplate,
  ZodParseTemplate,
  ZodSafeParseTemplate,
  AxiosGetTemplate,
  AxiosPostTemplate
] satisfies readonly AnyGraphTemplateDefinitionInput[]
