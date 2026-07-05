import { P } from "ts-pattern"
import type { ReplacementMap, Replacement, MarkerExpectedKind, ReplacementExpression, ReplacementExpressionSuffix, ReplacementObjectProperty, ReplacementStatement, ReplacementValue } from "../core/types.js"
import { validateJsonSchemaSubset } from "./compatibility.js"
import type { ResolvedGraphInput } from "./graphTypes.js"

/**
 * Template input contract: each key describes the accepted runtime input shape
 * and the replacement marker kind it should produce.
 */
export type SpecPattern = Record<
    string,
    {
        input: P.Pattern<unknown>
        output: MarkerExpectedKind
    }
>

/**
 * The `ts-pattern` input-only view of a template spec.
 */
export type InputPatternMap<S extends SpecPattern> = {
    readonly [K in keyof S]: S[K]['input']
}

/**
 * Concrete replacement input expected by a template spec.
 */
export type ReplacementFor<S extends SpecPattern> = {
  readonly [K in keyof S]: P.infer<S[K]['input']>
}

/**
 * Small parser abstraction used to coerce ergonomic template inputs into the
 * structured `ReplacementMap` accepted by generation.
 */
export type Schema<T> = {
  readonly label: string
  parse(value: unknown, path?: string): T
}

export type InferSchema<T> = T extends Schema<infer R> ? R : never

/**
 * Convert template input values into a generator-ready replacement map.
 */
export function toReplacements<S extends SpecPattern>(
  spec: S,
  replacements: ReplacementFor<S>
): ReplacementMap {
  const result: ReplacementMap = {}

  for (const key of Object.keys(spec) as Array<Extract<keyof S, string>>) {
    result[key] = markerReplacementSchemas[spec[key]!.output].parse(
      replacements[key],
      key
    )
  }

  return result
}

function replacementFromFragment(input: Extract<ResolvedGraphInput, { kind: 'fragment' }>): ReplacementValue {
  const code = input.fragment.code

  switch (input.port.regionKind) {
    case 'identifier':
      return { kind: 'identifier', name: code }
    case 'expression':
      return { kind: 'expression', code }
    case 'expressionSuffix':
      return { kind: 'expressionSuffix', code }
    case 'statement':
      return { kind: 'statement', code }
    default:
      throw new ReplacementSchemaError(
        `fragment input cannot be converted to ${input.port.regionKind} replacement in v1`
      )
  }
}

function replacementFromRawCode(input: Extract<ResolvedGraphInput, { kind: 'rawCode' }>): ReplacementValue {
  switch (input.port.regionKind) {
    case 'identifier':
      return { kind: 'identifier', name: input.code }
    case 'expression':
      return { kind: 'expression', code: input.code }
    case 'expressionSuffix':
      return { kind: 'expressionSuffix', code: input.code }
    case 'statement':
      return { kind: 'statement', code: input.code }
    default:
      throw new ReplacementSchemaError(
        `raw code input cannot be converted to ${input.port.regionKind} replacement in v1`
      )
  }
}

function replacementFromLiteral(input: Extract<ResolvedGraphInput, { kind: 'literal' }>): ReplacementValue {
  const schemaResult = validateJsonSchemaSubset(input.value, input.port.schema)
  if (!schemaResult.ok) {
    throw new ReplacementSchemaError(schemaResult.message)
  }

  return markerReplacementSchemas[input.port.regionKind].parse(input.value)
}

/**
 * Convert graph-resolved inputs into the existing replacement-map substrate.
 */
export function graphInputsToReplacementMap(inputs: Record<string, ResolvedGraphInput>): ReplacementMap {
  const result: ReplacementMap = {}

  for (const [key, input] of Object.entries(inputs)) {
    switch (input.kind) {
      case 'literal':
        result[key] = replacementFromLiteral(input)
        break
      case 'fragment':
        result[key] = replacementFromFragment(input)
        break
      case 'rawCode':
        result[key] = replacementFromRawCode(input)
        break
    }
  }

  return result
}
class ReplacementSchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReplacementSchemaError'
  }
}

function schema<T>(
  label: string,
  parse: (value: unknown, path: string) => T
): Schema<T> {
  return {
    label,
    parse(value, path = '$') {
      return parse(value, path)
    }
  }
}

function fail(path: string, expected: string, value: unknown): never {
  throw new ReplacementSchemaError(
    `${path}: expected ${expected}, received ${describeValue(value)}`
  )
}

function describeValue(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function childPath(path: string, key: string | number): string {
  return typeof key === 'number'
    ? `${path}[${key}]`
    : `${path}.${key}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Primitive parser used as a building block for template replacement schemas. */
export const unknownSchema = schema<unknown>('unknown', value => value)

export const stringSchema = schema<string>('string', (value, path) => {
  if (typeof value !== 'string') fail(path, 'string', value)
  return value
})

export const numberSchema = schema<number>('number', (value, path) => {
  if (typeof value !== 'number') fail(path, 'number', value)
  return value
})

export const booleanSchema = schema<boolean>('boolean', (value, path) => {
  if (typeof value !== 'boolean') fail(path, 'boolean', value)
  return value
})

export const nullSchema = schema<null>('null', (value, path) => {
  if (value !== null) fail(path, 'null', value)
  return null
})

function literalSchema<const T extends string | number | boolean | null>(
  expected: T
): Schema<T> {
  return schema(JSON.stringify(expected), (value, path) => {
    if (value !== expected) {
      fail(path, JSON.stringify(expected), value)
    }

    return expected
  })
}

function optional<T>(inner: Schema<T>): Schema<T | undefined> {
  return schema(`${inner.label} | undefined`, (value, path) => {
    if (value === undefined) return undefined
    return inner.parse(value, path)
  })
}

function arrayOf<T>(item: Schema<T>): Schema<T[]> {
  return schema(`${item.label}[]`, (value, path) => {
    if (!Array.isArray(value)) {
      fail(path, `${item.label}[]`, value)
    }

    return value.map((itemValue, index) =>
      item.parse(itemValue, childPath(path, index))
    )
  })
}

function recordOf<T>(item: Schema<T>): Schema<Record<string, T>> {
  return schema(`Record<string, ${item.label}>`, (value, path) => {
    if (!isRecord(value)) {
      fail(path, `Record<string, ${item.label}>`, value)
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, propertyValue]) => [
        key,
        item.parse(propertyValue, childPath(path, key))
      ])
    )
  })
}

function objectSchema<
  const Required extends Record<string, Schema<unknown>>,
  const Optional extends Record<string, Schema<unknown>> = {}
>(
  label: string,
  required: Required,
  optionalShape?: Optional
): Schema<
  {
    [K in keyof Required]: InferSchema<Required[K]>
  } & {
    [K in keyof Optional]?: InferSchema<Optional[K]>
  }
> {
  return schema(label, (value, path) => {
    if (!isRecord(value)) {
      fail(path, label, value)
    }

    const result: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(required)) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        fail(childPath(path, key), item.label, undefined)
      }

      result[key] = item.parse(value[key], childPath(path, key))
    }

    for (const [key, item] of Object.entries(optionalShape ?? {})) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = item.parse(value[key], childPath(path, key))
      }
    }

    return result as {
      [K in keyof Required]: InferSchema<Required[K]>
    } & {
      [K in keyof Optional]?: InferSchema<Optional[K]>
    }
  })
}

function transform<A, B>(
  inner: Schema<A>,
  label: string,
  mapper: (value: A) => B
): Schema<B> {
  return schema(label, (value, path) => mapper(inner.parse(value, path)))
}

function oneOf<T>(
  label: string,
  schemas: readonly Schema<T>[]
): Schema<T> {
  return schema(label, (value, path) => {
    const errors: string[] = []

    for (const item of schemas) {
      try {
        return item.parse(value, path)
      } catch (error) {
        if (error instanceof ReplacementSchemaError) {
          errors.push(error.message)
          continue
        }

        throw error
      }
    }

    throw new ReplacementSchemaError(
      `${path}: expected ${label}, received ${describeValue(value)}`
    )
  })
}

function lazy<T>(
  label: string,
  getSchema: () => Schema<T>
): Schema<T> {
  return schema(label, (value, path) => getSchema().parse(value, path))
}

function oneOrMany<T extends Replacement>(
  label: string,
  item: Schema<T>
): Schema<T | T[]> {
  return oneOf<T | T[]>(label, [
    arrayOf(item),
    item
  ])
}

let expressionReplacementSchema!: Schema<ReplacementExpression>
let literalExpressionReplacementSchema!: Schema<ReplacementExpression>

/**
 * Explicit structured replacement schemas. These accept objects that already
 * match the public replacement model.
 */
export const identifierExpressionObjectSchema =
  transform(
    objectSchema('ReplacementExpressionIdentifier', {
      kind: literalSchema('identifier'),
      name: stringSchema
    }),
    'ReplacementExpressionIdentifier',
    value => ({
      kind: 'identifier' as const,
      name: value.name
    })
  )

export const codeExpressionObjectSchema =
  transform(
    objectSchema('ReplacementExpressionExpression', {
      kind: literalSchema('expression'),
      code: stringSchema
    }),
    'ReplacementExpressionExpression',
    value => ({
      kind: 'expression' as const,
      code: value.code
    })
  )

export const arrayExpressionObjectSchema =
  transform(
    objectSchema('ReplacementExpressionArray', {
      kind: literalSchema('array'),
      elements: arrayOf(
        lazy('ReplacementExpression', () => expressionReplacementSchema)
      )
    }),
    'ReplacementExpressionArray',
    value => ({
      kind: 'array' as const,
      elements: value.elements
    })
  )

export const objectExpressionObjectSchema =
  transform(
    objectSchema('ReplacementExpressionObject', {
      kind: literalSchema('object'),
      properties: recordOf(
        lazy('ReplacementExpression', () => expressionReplacementSchema)
      )
    }),
    'ReplacementExpressionObject',
    value => ({
      kind: 'object' as const,
      properties: value.properties
    })
  )

export const stringExpressionObjectSchema =
  transform(
    objectSchema('ReplacementExpressionString', {
      kind: literalSchema('string'),
      value: stringSchema
    }),
    'ReplacementExpressionString',
    value => ({
      kind: 'string' as const,
      value: value.value
    })
  )

export const numberExpressionObjectSchema =
  transform(
    objectSchema('ReplacementExpressionNumber', {
      kind: literalSchema('number'),
      value: numberSchema
    }),
    'ReplacementExpressionNumber',
    value => ({
      kind: 'number' as const,
      value: value.value
    })
  )

export const booleanExpressionObjectSchema =
  transform(
    objectSchema('ReplacementExpressionBoolean', {
      kind: literalSchema('boolean'),
      value: booleanSchema
    }),
    'ReplacementExpressionBoolean',
    value => ({
      kind: 'boolean' as const,
      value: value.value
    })
  )

export const nullExpressionObjectSchema =
  transform(
    objectSchema('ReplacementExpressionNull', {
      kind: literalSchema('null')
    }),
    'ReplacementExpressionNull',
    () => ({
      kind: 'null' as const
    })
  )

/**
 * Accept generated expression output as an expression replacement input.
 */
export  const generatedExpressionReplacementSchema = transform(
  schema<GeneratedExpression>('GeneratedExpression', (value, path) => {
    if (!isGeneratedExpression(value)) {
      fail(path, 'GeneratedExpression', value)
    }

    return value
  }),
  'generated expression replacement',
  value => ({
    kind: 'expression' as const,
    code: value.code
  })
)

/**
 * Expression schema that requires an explicit replacement object.
 */
export const explicitExpressionReplacementSchema = oneOf<ReplacementExpression>(
  'explicit ReplacementExpression',
  [
    identifierExpressionObjectSchema,
    codeExpressionObjectSchema,
    arrayExpressionObjectSchema,
    objectExpressionObjectSchema,
    stringExpressionObjectSchema,
    numberExpressionObjectSchema,
    booleanExpressionObjectSchema,
    nullExpressionObjectSchema
  ]
)

literalExpressionReplacementSchema = oneOf<ReplacementExpression>(
  'literal expression replacement',
  [
    explicitExpressionReplacementSchema,

    transform(stringSchema, 'string literal replacement', value => ({
      kind: 'string' as const,
      value
    })),

    transform(numberSchema, 'number literal replacement', value => ({
      kind: 'number' as const,
      value
    })),

    transform(booleanSchema, 'boolean literal replacement', value => ({
      kind: 'boolean' as const,
      value
    })),

    transform(nullSchema, 'null literal replacement', () => ({
      kind: 'null' as const
    })),

    transform(
      arrayOf(lazy('literal expression replacement', () => literalExpressionReplacementSchema)),
      'array literal replacement',
      elements => ({
        kind: 'array' as const,
        elements
      })
    ),

    transform(
      recordOf(lazy('literal expression replacement', () => literalExpressionReplacementSchema)),
      'object literal replacement',
      properties => ({
        kind: 'object' as const,
        properties
      })
    )
  ]
)

// For expression markers, ergonomic primitives are allowed in addition to the
// explicit object model. Raw strings intentionally mean code, not string
// literals, because expression markers are usually code-shaped.
expressionReplacementSchema = oneOf<ReplacementExpression>(
  'expression replacement',
  [
    generatedExpressionReplacementSchema,
    explicitExpressionReplacementSchema,

    // Important:
    // For an `expression` marker, a raw string means code,
    // not a string literal.
    transform(stringSchema, 'code expression replacement', code => ({
      kind: 'expression' as const,
      code
    })),

    transform(numberSchema, 'number expression replacement', value => ({
      kind: 'number' as const,
      value
    })),

    transform(booleanSchema, 'boolean expression replacement', value => ({
      kind: 'boolean' as const,
      value
    })),

    transform(nullSchema, 'null expression replacement', () => ({
      kind: 'null' as const
    })),

    transform(
      arrayOf(lazy('literal expression replacement', () => literalExpressionReplacementSchema)),
      'array expression replacement',
      elements => ({
        kind: 'array' as const,
        elements
      })
    ),

    transform(
      recordOf(lazy('literal expression replacement', () => literalExpressionReplacementSchema)),
      'object expression replacement',
      properties => ({
        kind: 'object' as const,
        properties
      })
    )
  ]
)

/**
 * Marker-specific schemas below accept ergonomic shorthand where it is
 * unambiguous for the marker kind.
 */
export const identifierReplacementSchema = oneOf<Replacement>(
  'identifier replacement',
  [
    identifierExpressionObjectSchema,

    transform(stringSchema, 'identifier name', name => ({
      kind: 'identifier' as const,
      name
    }))
  ]
)

export const expressionSuffixReplacementSchema = oneOf<ReplacementExpressionSuffix>(
  'expressionSuffix replacement',
  [
    transform(
      objectSchema('ReplacementExpressionSuffix', {
        kind: literalSchema('expressionSuffix'),
        code: stringSchema
      }),
      'ReplacementExpressionSuffix',
      value => ({
        kind: 'expressionSuffix' as const,
        code: value.code
      })
    ),

    transform(stringSchema, 'expressionSuffix code', code => ({
      kind: 'expressionSuffix' as const,
      code
    }))
  ]
)

export const statementReplacementSchema = oneOf<ReplacementStatement>(
  'statement replacement',
  [
    transform(
      objectSchema('ReplacementStatement', {
        kind: literalSchema('statement'),
        code: stringSchema
      }),
      'ReplacementStatement',
      value => ({
        kind: 'statement' as const,
        code: value.code
      })
    ),

    transform(stringSchema, 'statement code', code => ({
      kind: 'statement' as const,
      code
    }))
  ]
)

export const objectPropertyReplacementSchema = oneOf<ReplacementObjectProperty>(
  'objectProperty replacement',
  [
    transform(
      objectSchema(
        'ReplacementObjectProperty',
        {
          kind: literalSchema('objectProperty'),
          name: stringSchema,
          value: literalExpressionReplacementSchema
        },
        {
          computed: optional(booleanSchema)
        }
      ),
      'ReplacementObjectProperty',
      value => ({
        kind: 'objectProperty' as const,
        name: value.name,
        value: value.value,
        ...(value.computed === undefined ? {} : { computed: value.computed })
      })
    ),

    transform(
      objectSchema(
        'named objectProperty replacement',
        {
          name: stringSchema,
          value: literalExpressionReplacementSchema
        },
        {
          computed: optional(booleanSchema)
        }
      ),
      'named objectProperty replacement',
      value => ({
        kind: 'objectProperty' as const,
        name: value.name,
        value: value.value,
        ...(value.computed === undefined ? {} : { computed: value.computed })
      })
    )
  ]
)

export const objectPropertyReplacementValueSchema = oneOf<ReplacementValue>(
  'objectProperty replacement value',
  [
    arrayOf(objectPropertyReplacementSchema),

    objectPropertyReplacementSchema,

    transform(
      recordOf(literalExpressionReplacementSchema),
      'objectProperty record replacement',
      properties =>
        Object.entries(properties).map(([name, value]) => ({
          kind: 'objectProperty' as const,
          name,
          value
        }))
    )
  ]
)

export const arrayMarkerReplacementSchema = oneOf<ReplacementExpression>(
  'array marker replacement',
  [
    arrayExpressionObjectSchema,

    transform(
      arrayOf(lazy('literal expression replacement', () => literalExpressionReplacementSchema)),
      'array marker literal',
      elements => ({
        kind: 'array' as const,
        elements
      })
    )
  ]
)

export const objectMarkerReplacementSchema = oneOf<ReplacementExpression>(
  'object marker replacement',
  [
    objectExpressionObjectSchema,

    transform(
      recordOf(lazy('literal expression replacement', () => literalExpressionReplacementSchema)),
      'object marker literal',
      properties => ({
        kind: 'object' as const,
        properties
      })
    )
  ]
)

export const stringMarkerReplacementSchema = oneOf<ReplacementExpression>(
  'string marker replacement',
  [
    stringExpressionObjectSchema,

    transform(stringSchema, 'string marker literal', value => ({
      kind: 'string' as const,
      value
    }))
  ]
)

export const numberMarkerReplacementSchema = oneOf<ReplacementExpression>(
  'number marker replacement',
  [
    numberExpressionObjectSchema,

    transform(numberSchema, 'number marker literal', value => ({
      kind: 'number' as const,
      value
    }))
  ]
)

export const booleanMarkerReplacementSchema = oneOf<ReplacementExpression>(
  'boolean marker replacement',
  [
    booleanExpressionObjectSchema,

    transform(booleanSchema, 'boolean marker literal', value => ({
      kind: 'boolean' as const,
      value
    }))
  ]
)

export const nullMarkerReplacementSchema = oneOf<ReplacementExpression>(
  'null marker replacement',
  [
    nullExpressionObjectSchema,

    transform(nullSchema, 'null marker literal', () => ({
      kind: 'null' as const
    }))
  ]
)




/**
 * Runtime-only brand that distinguishes generated template output from plain
 * objects with the same fields.
 */
export const generatedCodeBrand: unique symbol = Symbol('generatedCodeBrand')

/**
 * Code generated by a named template, preserving the output marker kind and the
 * model ID that produced it.
 */
export type GeneratedCode<
  K extends MarkerExpectedKind,
  Source extends string = string
> = {
  readonly kind: K
  readonly source: Source
  readonly code: string
  readonly [generatedCodeBrand]: true
}

export type GeneratedExpression<Source extends string = string> =
  GeneratedCode<'expression', Source>

/**
 * Brand a generated code string so later templates can pattern-match its
 * source model and marker kind.
 */
export function generatedCode<
  K extends MarkerExpectedKind,
  Source extends string
>(
  kind: K,
  source: Source,
  code: string
): GeneratedCode<K, Source> {
  return {
    kind,
    source,
    code,
    [generatedCodeBrand]: true
  }
}

/**
 * Build a type guard for generated code from a specific model and marker kind.
 */
export function isGeneratedCodeFrom<
  K extends MarkerExpectedKind,
  Source extends string
>(
  kind: K,
  source: Source
): (value: unknown) => value is GeneratedCode<K, Source> {
  return (value): value is GeneratedCode<K, Source> =>
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === kind &&
    (value as { source?: unknown }).source === source &&
    typeof (value as { code?: unknown }).code === 'string' &&
    (value as { [generatedCodeBrand]?: unknown })[generatedCodeBrand] === true
}

/**
 * Type guard for any generated expression, regardless of model source.
 */
export const isGeneratedExpression = (
  value: unknown
): value is GeneratedExpression =>
  typeof value === 'object' &&
  value !== null &&
  (value as { kind?: unknown }).kind === 'expression' &&
  typeof (value as { source?: unknown }).source === 'string' &&
  typeof (value as { code?: unknown }).code === 'string' &&
  (value as { [generatedCodeBrand]?: unknown })[generatedCodeBrand] === true


/**
 * Dispatch table used by `toReplacements` to parse each spec output kind.
 */
export const markerReplacementSchemas = {
  identifier: identifierReplacementSchema,
  expression: expressionReplacementSchema,
  expressionSuffix: oneOrMany(
    'expressionSuffix replacement value',
    expressionSuffixReplacementSchema
  ),
  statement: oneOrMany(
    'statement replacement value',
    statementReplacementSchema
  ),
  array: arrayMarkerReplacementSchema,
  object: objectMarkerReplacementSchema,
  string: stringMarkerReplacementSchema,
  number: numberMarkerReplacementSchema,
  boolean: booleanMarkerReplacementSchema,
  null: nullMarkerReplacementSchema,
  objectProperty: objectPropertyReplacementValueSchema
} satisfies Record<MarkerExpectedKind, Schema<ReplacementValue>>
