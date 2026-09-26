import { defineTemplate, fragmentCollectionPort } from '../src/templates.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	identifierInput,
	marker,
	nominalType,
	schemaPropertySignatureType,
	schemaType,
	statementOutput,
	stringInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'

/**
 * Effect v4 Schema graph templates.
 *
 * Runtime contract:
 *   import { Effect, Schema, SchemaIssue } from 'effect'
 *
 * These templates intentionally model the v4 Codec service split: decoding and
 * encoding services are tracked independently by schemaType.
 */

const VERSION = '2.0.0' as const

const schemaInput = (
	description: string,
	decoded = 'unknown',
	encoded = 'unknown',
	decodingServices = 'never',
	encodingServices = decodingServices
) => typedExpressionInput(description, schemaType(decoded, encoded, decodingServices, encodingServices))


const schemaFilterType = (value = 'unknown') =>
	nominalType('effect/SchemaFilter', { schemaFilterValue: value })


const optionType = (value: string): { ts: string } => ({
	ts: `{ readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: ${value} }`
})

const schemaError = '{ readonly _tag: "SchemaError"; readonly issue: unknown }'

const resultType = (success: string, failure: string): { ts: string } => ({
	ts: `{ readonly _tag: "Success"; readonly success: ${success} } | { readonly _tag: "Failure"; readonly failure: ${failure} }`
})

const staticSchema = (
	modelId: string,
	member: string,
	description: string,
	decoded: string,
	encoded = decoded
) => defineTemplate({
	modelId,
	version: VERSION,
	description,
	inputs: {},
	output: expressionOutput(description, schemaType(decoded, encoded, 'never', 'never')),
	source: `Schema.${member}`
})

export const SchemaStringTemplate = staticSchema(
	'SchemaString',
	'String',
	'Built-in string schema.',
	'string'
)

export const SchemaFiniteTemplate = staticSchema(
	'SchemaFinite',
	'Finite',
	'Built-in finite-number schema.',
	'number'
)

export const SchemaBooleanTemplate = staticSchema(
	'SchemaBoolean',
	'Boolean',
	'Built-in boolean schema.',
	'boolean'
)

export const SchemaBigIntTemplate = staticSchema(
	'SchemaBigInt',
	'BigInt',
	'Built-in bigint schema.',
	'bigint'
)

export const SchemaSymbolTemplate = staticSchema(
	'SchemaSymbol',
	'Symbol',
	'Built-in symbol schema.',
	'symbol'
)

export const SchemaObjectKeywordTemplate = staticSchema(
	'SchemaObjectKeyword',
	'ObjectKeyword',
	'Built-in non-nullish object schema.',
	'object'
)

export const SchemaUndefinedTemplate = staticSchema(
	'SchemaUndefined',
	'Undefined',
	'Built-in undefined schema.',
	'undefined'
)

export const SchemaVoidTemplate = staticSchema(
	'SchemaVoid',
	'Void',
	'Built-in void schema.',
	'void'
)

export const SchemaAnyTemplate = staticSchema(
	'SchemaAny',
	'Any',
	'Built-in any schema.',
	'unknown'
)

export const SchemaUnknownTemplate = staticSchema(
	'SchemaUnknown',
	'Unknown',
	'Built-in unknown schema.',
	'unknown'
)

export const SchemaNeverTemplate = staticSchema(
	'SchemaNever',
	'Never',
	'Built-in never schema.',
	'never'
)

export const SchemaNullTemplate = staticSchema(
	'SchemaNull',
	'Null',
	'Built-in null schema.',
	'null'
)

export const SchemaNonEmptyStringTemplate = staticSchema(
	'SchemaNonEmptyString',
	'NonEmptyString',
	'Built-in non-empty string schema.',
	'string'
)

export const SchemaIntTemplate = staticSchema(
	'SchemaInt',
	'Int',
	'Built-in integer-number schema.',
	'number'
)

export const SchemaTrimTemplate = staticSchema(
	'SchemaTrim',
	'Trim',
	'String schema that trims during decoding and encoding.',
	'string',
	'string'
)

export const SchemaFiniteFromStringTemplate = staticSchema(
	'SchemaFiniteFromString',
	'FiniteFromString',
	'Transforms an encoded string into a finite number.',
	'number',
	'string'
)

export const SchemaDateTemplate = staticSchema(
	'SchemaDate',
	'Date',
	'Schema for Date values.',
	'Date',
	'Date'
)

export const SchemaDateFromStringTemplate = staticSchema(
	'SchemaDateFromString',
	'DateFromString',
	'Transforms an encoded string into a Date.',
	'Date',
	'string'
)

export const SchemaDurationTemplate = staticSchema(
	'SchemaDuration',
	'Duration',
	'Schema for Effect Duration values.',
	'unknown',
	'unknown'
)

export const SchemaDurationFromStringTemplate = staticSchema(
	'SchemaDurationFromString',
	'DurationFromString',
	'Transforms an encoded duration string into an Effect Duration.',
	'unknown',
	'string'
)

export const SchemaDurationFromMillisTemplate = staticSchema(
	'SchemaDurationFromMillis',
	'DurationFromMillis',
	'Transforms encoded milliseconds into an Effect Duration.',
	'unknown',
	'number'
)

export const SchemaDurationFromNanosTemplate = staticSchema(
	'SchemaDurationFromNanos',
	'DurationFromNanos',
	'Transforms encoded nanoseconds into an Effect Duration.',
	'unknown',
	'bigint'
)

export const SchemaRevealCodecTemplate = defineTemplate({
	modelId: 'SchemaRevealCodec',
	version: VERSION,
	description: 'Widens a schema to its full v4 Codec<T, E, RD, RE> view without changing the runtime value.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Schema whose full Codec view should be exposed.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput('Revealed Codec view.', schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')),
	source: `Schema.revealCodec(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaUniqueSymbolTemplate = defineTemplate({
	modelId: 'SchemaUniqueSymbol',
	version: VERSION,
	description: 'Builds a schema for one unique symbol value.',
	inputs: {
		value: effectValueInput('Unique symbol value.', { ts: 'symbol' })
	},
	output: expressionOutput('Unique-symbol schema.', schemaType('symbol', 'symbol', 'never', 'never')),
	source: `Schema.UniqueSymbol(${marker('expression', 'value', 'Symbol.for("symbol")')})`
})

export const SchemaTemplateLiteralTemplate = defineTemplate({
	modelId: 'SchemaTemplateLiteral',
	version: VERSION,
	description: 'Builds a string schema from v4 template-literal spans.',
	inputs: {
		spans: valueInput('Readonly array of literal values and supported span schemas.', { ts: 'ReadonlyArray<unknown>' })
	},
	output: expressionOutput('Template-literal schema.', schemaType('string', 'string', 'never', 'never')),
	source: `Schema.TemplateLiteral(${marker('expression', 'spans', '[Schema.String]')})`
})

export const SchemaTemplateLiteralParserTemplate = defineTemplate({
	modelId: 'SchemaTemplateLiteralParser',
	version: VERSION,
	description: 'Builds a template-literal parser that decodes a string into a structured tuple.',
	inputs: {
		spans: valueInput('Readonly array of literal values and supported parser schemas.', { ts: 'ReadonlyArray<unknown>' })
	},
	output: expressionOutput('Template-literal parser codec.', schemaType('readonly unknown[]', 'string', 'unknown', 'unknown')),
	source: `Schema.TemplateLiteralParser(${marker('expression', 'spans', '[Schema.String]')})`
})

export const SchemaEnumTemplate = defineTemplate({
	modelId: 'SchemaEnum',
	version: VERSION,
	description: 'Builds a schema from a native TypeScript enum object.',
	typeParameters: typeParameters(['A', 'Enum value type.']),
	inputs: {
		enumObject: valueInput('Native enum object.')
	},
	output: expressionOutput('Native-enum schema.', schemaType('{{A}}', '{{A}}', 'never', 'never')),
	source: `Schema.Enum(${marker('expression', 'enumObject', '{}')})`
})

export const SchemaMutableTemplate = defineTemplate({
	modelId: 'SchemaMutable',
	version: VERSION,
	description: 'Creates the shallow mutable view of a readonly array, record, or struct schema.',
	inputs: {
		schema: schemaInput('Schema to make shallowly mutable.')
	},
	output: expressionOutput('Shallow mutable schema.', schemaType('unknown', 'unknown', 'unknown', 'unknown')),
	source: `Schema.mutable(${marker('expression', 'schema', 'Schema.Array(Schema.Unknown)')})`
})

export const SchemaInstanceOfTemplate = defineTemplate({
	modelId: 'SchemaInstanceOf',
	version: VERSION,
	description: 'Builds a schema for instances of a class with a public constructor.',
	typeParameters: typeParameters(['A', 'Class instance type.']),
	inputs: {
		constructor: valueInput('Public class constructor.', { ts: 'new (...args: ReadonlyArray<unknown>) => {{A}}' })
	},
	output: expressionOutput('Class-instance schema.', schemaType('{{A}}', '{{A}}', 'never', 'never')),
	source: `Schema.instanceOf(${marker('expression', 'constructor', 'Date')})`
})

export const SchemaDeclareTemplate = defineTemplate({
	modelId: 'SchemaDeclare',
	version: VERSION,
	description: 'Declares a schema for an opaque non-generic data type from a type guard.',
	typeParameters: typeParameters(['A', 'Declared value type.']),
	inputs: {
		guard: callbackInput('Type guard for the declared value.', { ts: '(input: unknown) => input is {{A}}' })
	},
	output: expressionOutput('Declaration schema.', schemaType('{{A}}', '{{A}}', 'never', 'never')),
	source: `Schema.declare(${marker('expression', 'guard', '(_input: unknown): _input is unknown => true')})`
})

export const SchemaSuspendTemplate = defineTemplate({
	modelId: 'SchemaSuspend',
	version: VERSION,
	description: 'Lazily references a schema, enabling recursive schema definitions.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		thunk: callbackInput('Lazy thunk returning the referenced schema.', {
			ts: `() => ${schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}').ts}`
		})
	},
	output: expressionOutput('Suspended recursive schema.', schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')),
	source: `Schema.suspend(${marker('expression', 'thunk', '() => Schema.Unknown')})`
})

export const SchemaLiteralTemplate = defineTemplate({
	modelId: 'SchemaLiteral',
	version: VERSION,
	description: 'Builds a schema for one exact literal value.',
	typeParameters: typeParameters(['A', 'Literal value type.']),
	inputs: {
		value: effectValueInput('Literal value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Literal schema.', schemaType('{{A}}', '{{A}}', 'never', 'never')),
	source: `Schema.Literal(${marker('expression', 'value', 'null')})`
})

export const SchemaLiteralsTemplate = defineTemplate({
	modelId: 'SchemaLiterals',
	version: VERSION,
	description: 'Builds a union schema from a readonly array of literal values.',
	typeParameters: typeParameters(['A', 'Union of literal value types.']),
	inputs: {
		values: effectValueInput('Readonly array of literal values.', { ts: 'ReadonlyArray<{{A}}>' })
	},
	output: expressionOutput('Literal-union schema.', schemaType('{{A}}', '{{A}}', 'never', 'never')),
	source: `Schema.Literals(${marker('expression', 'values', '[]')})`
})

export const SchemaUnionTemplate = defineTemplate({
	modelId: 'SchemaUnion',
	version: VERSION,
	description: 'Builds a v4 Schema.Union from two or more member schemas.',
	typeParameters: typeParameters(
		['A', 'Decoded union type.'],
		['I', 'Encoded union type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		members: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression', type: schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}') },
			minItems: 2,
			separator: ', ',
			description: 'Union member schemas.'
		})
	},
	output: expressionOutput('Union schema.', schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')),
	source: `Schema.Union([${marker('expression', 'members', 'Schema.Never, Schema.Unknown')}])`
})

export const SchemaNullOrTemplate = defineTemplate({
	modelId: 'SchemaNullOr',
	version: VERSION,
	description: 'Extends a schema to accept null.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Value schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput(
		'Nullable schema.',
		schemaType('{{A}} | null', '{{I}} | null', '{{RD}}', '{{RE}}')
	),
	source: `Schema.NullOr(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaUndefinedOrTemplate = defineTemplate({
	modelId: 'SchemaUndefinedOr',
	version: VERSION,
	description: 'Extends a schema to accept undefined.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Value schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput(
		'Undefined-or schema.',
		schemaType('{{A}} | undefined', '{{I}} | undefined', '{{RD}}', '{{RE}}')
	),
	source: `Schema.UndefinedOr(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaTupleTemplate = defineTemplate({
	modelId: 'SchemaTuple',
	version: VERSION,
	description: 'Builds a tuple schema from ordered element schemas or property signatures.',
	inputs: {
		elements: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression' },
			minItems: 1,
			separator: ', ',
			description: 'Tuple element schemas in order.'
		})
	},
	output: expressionOutput('Tuple schema.', schemaType('readonly unknown[]', 'readonly unknown[]', 'unknown', 'unknown')),
	source: `Schema.Tuple([${marker('expression', 'elements', 'Schema.Unknown')}])`
})

export const SchemaTupleWithRestTemplate = defineTemplate({
	modelId: 'SchemaTupleWithRest',
	version: VERSION,
	description: 'Adds rest and optional trailing schemas to an existing tuple schema.',
	inputs: {
		tuple: schemaInput('Base tuple schema.'),
		rest: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression' },
			minItems: 1,
			separator: ', ',
			description: 'Rest schema followed by any trailing schemas.'
		})
	},
	output: expressionOutput('Tuple-with-rest schema.', schemaType('readonly unknown[]', 'readonly unknown[]', 'unknown', 'unknown')),
	source: `Schema.TupleWithRest(${marker('expression', 'tuple', 'Schema.Tuple([Schema.Unknown])')}, [${marker('expression', 'rest', 'Schema.Unknown')}])`
})

export const SchemaArrayTemplate = defineTemplate({
	modelId: 'SchemaArray',
	version: VERSION,
	description: 'Builds a readonly array schema from an element schema.',
	typeParameters: typeParameters(
		['A', 'Decoded element type.'],
		['I', 'Encoded element type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		item: schemaInput('Element schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput(
		'Readonly array schema.',
		schemaType('ReadonlyArray<{{A}}>', 'ReadonlyArray<{{I}}>', '{{RD}}', '{{RE}}')
	),
	source: `Schema.Array(${marker('expression', 'item', 'Schema.Unknown')})`
})

export const SchemaNonEmptyArrayTemplate = defineTemplate({
	modelId: 'SchemaNonEmptyArray',
	version: VERSION,
	description: 'Builds a readonly non-empty-array schema from an element schema.',
	typeParameters: typeParameters(
		['A', 'Decoded element type.'],
		['I', 'Encoded element type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		item: schemaInput('Element schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput(
		'Readonly non-empty-array schema.',
		schemaType('readonly [{{A}}, ...{{A}}[]]', 'readonly [{{I}}, ...{{I}}[]]', '{{RD}}', '{{RE}}')
	),
	source: `Schema.NonEmptyArray(${marker('expression', 'item', 'Schema.Unknown')})`
})

export const SchemaRecordTemplate = defineTemplate({
	modelId: 'SchemaRecord',
	version: VERSION,
	description: 'Builds a record schema from key and value schemas.',
	typeParameters: typeParameters(
		['K', 'Decoded key type.'],
		['KI', 'Encoded key type.'],
		['V', 'Decoded value type.'],
		['VI', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		key: schemaInput('Record key schema.', '{{K}}', '{{KI}}', '{{RD}}', '{{RE}}'),
		value: schemaInput('Record value schema.', '{{V}}', '{{VI}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput(
		'Record schema.',
		schemaType('Readonly<Record<PropertyKey, {{V}}>>', 'Readonly<Record<PropertyKey, {{VI}}>>', '{{RD}}', '{{RE}}')
	),
	source: `Schema.Record(${marker('expression', 'key', 'Schema.String')}, ${marker('expression', 'value', 'Schema.Unknown')})`
})

export const SchemaStructTemplate = defineTemplate({
	modelId: 'SchemaStruct',
	version: VERSION,
	description: 'Builds a Schema.Struct from a record of field schemas or property signatures.',
	typeParameters: typeParameters(
		['A', 'Decoded struct type.'],
		['I', 'Encoded struct type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		fields: valueInput('Record whose values are schemas or property signatures.')
	},
	output: expressionOutput('Struct schema.', schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')),
	source: `Schema.Struct(${marker('expression', 'fields', '{}')})`
})

export const SchemaStructWithRestTemplate = defineTemplate({
	modelId: 'SchemaStructWithRest',
	version: VERSION,
	description: 'Adds one or more record index signatures to a struct schema.',
	inputs: {
		struct: schemaInput('Base struct schema.'),
		records: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression' },
			minItems: 1,
			separator: ', ',
			description: 'Record schemas representing index signatures.'
		})
	},
	output: expressionOutput('Struct schema with index signatures.', schemaType('unknown', 'unknown', 'unknown', 'unknown')),
	source: `Schema.StructWithRest(${marker('expression', 'struct', 'Schema.Struct({})')}, [${marker('expression', 'records', 'Schema.Record(Schema.String, Schema.Unknown)')}])`
})

export const SchemaOptionalTemplate = defineTemplate({
	modelId: 'SchemaOptional',
	version: VERSION,
	description: 'Makes a struct key optional and allows undefined when the key is present.',
	typeParameters: typeParameters(
		['A', 'Decoded field type.'],
		['I', 'Encoded field type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Field schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput(
		'Optional property signature.',
		schemaPropertySignatureType('{{A}} | undefined', '{{I}} | undefined', '{{RD}}', '{{RE}}')
	),
	source: `Schema.optional(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaOptionalKeyTemplate = defineTemplate({
	modelId: 'SchemaOptionalKey',
	version: VERSION,
	description: 'Makes a struct key optional without adding undefined to the field value.',
	typeParameters: typeParameters(
		['A', 'Decoded field type.'],
		['I', 'Encoded field type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Field schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput(
		'Exact optional-key property signature.',
		schemaPropertySignatureType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	),
	source: `Schema.optionalKey(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaTagTemplate = defineTemplate({
	modelId: 'SchemaTag',
	version: VERSION,
	description: 'Creates a tagged property signature whose constructor value is filled automatically.',
	typeParameters: typeParameters(['Tag', 'Literal tag type.']),
	inputs: {
		tag: effectValueInput('Literal tag value.', { ts: '{{Tag}}' })
	},
	output: expressionOutput(
		'Tag property signature.',
		schemaPropertySignatureType('{{Tag}}', '{{Tag}}', 'never', 'never')
	),
	source: `Schema.tag(${marker('expression', 'tag', '"Tag"')})`
})

export const SchemaTagDefaultOmitTemplate = defineTemplate({
	modelId: 'SchemaTagDefaultOmit',
	version: VERSION,
	description: 'Creates a tag property that is defaulted during construction and omitted from decoded input.',
	typeParameters: typeParameters(['Tag', 'Literal tag type.']),
	inputs: {
		tag: effectValueInput('Literal tag value.', { ts: '{{Tag}}' })
	},
	output: expressionOutput(
		'Defaulted tag property signature.',
		schemaPropertySignatureType('{{Tag}}', '{{Tag}}', 'never', 'never')
	),
	source: `Schema.tagDefaultOmit(${marker('expression', 'tag', '"Tag"')})`
})

export const SchemaTaggedStructTemplate = defineTemplate({
	modelId: 'SchemaTaggedStruct',
	version: VERSION,
	description: 'Builds a struct schema with an automatically constructed _tag field.',
	typeParameters: typeParameters(['A', 'Decoded tagged struct type.'], ['I', 'Encoded tagged struct type.']),
	inputs: {
		tag: stringInput('Stable _tag literal.'),
		fields: valueInput('Record of non-tag field schemas.')
	},
	output: expressionOutput('Tagged struct schema.', schemaType('{{A}}', '{{I}}', 'unknown', 'unknown')),
	source: `Schema.TaggedStruct(${marker('string', 'tag', '"Tag"')}, ${marker('expression', 'fields', '{}')})`
})

export const SchemaAnnotateTemplate = defineTemplate({
	modelId: 'SchemaAnnotate',
	version: VERSION,
	description: 'Adds decoded-side annotations such as identifier, title, description, examples, or messages.',
	typeParameters: typeParameters(
		['A', 'Decoded type.'],
		['I', 'Encoded type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Schema to annotate.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		annotations: valueInput('Annotation record.')
	},
	output: expressionOutput('Annotated schema.', schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.annotate(${marker('expression', 'annotations', '{}')})`
})

export const SchemaAnnotateEncodedTemplate = defineTemplate({
	modelId: 'SchemaAnnotateEncoded',
	version: VERSION,
	description: 'Adds annotations to the encoded side of a schema.',
	typeParameters: typeParameters(
		['A', 'Decoded type.'],
		['I', 'Encoded type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Schema to annotate.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		annotations: valueInput('Encoded-side annotation record.')
	},
	output: expressionOutput('Encoded-side annotated schema.', schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.pipe(Schema.annotateEncoded(${marker('expression', 'annotations', '{}')}))`
})

export const SchemaAnnotateKeyTemplate = defineTemplate({
	modelId: 'SchemaAnnotateKey',
	version: VERSION,
	description: 'Adds metadata or missing-key messages to a struct field or tuple element.',
	typeParameters: typeParameters(
		['A', 'Decoded field type.'],
		['I', 'Encoded field type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Field or element schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		annotations: valueInput('Key-level annotation record.')
	},
	output: expressionOutput(
		'Annotated property signature.',
		schemaPropertySignatureType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.pipe(Schema.annotateKey(${marker('expression', 'annotations', '{}')}))`
})

export const SchemaEncodeKeysTemplate = defineTemplate({
	modelId: 'SchemaEncodeKeys',
	version: VERSION,
	description: 'Maps decoded struct property names to different encoded property names.',
	typeParameters: typeParameters(
		['A', 'Decoded struct type.'],
		['I', 'Encoded struct type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Struct schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		keys: valueInput('Record mapping decoded keys to encoded keys.')
	},
	output: expressionOutput('Schema with encoded-key mapping.', schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')),
	source: `${marker('expression', 'schema', 'Schema.Struct({})')}.pipe(Schema.encodeKeys(${marker('expression', 'keys', '{}')}))`
})

export const SchemaMakeFilterTemplate = defineTemplate({
	modelId: 'SchemaMakeFilter',
	version: VERSION,
	description: 'Creates a custom Schema filter from a decoded-value predicate.',
	typeParameters: typeParameters(['A', 'Filtered decoded value type.']),
	inputs: {
		predicate: callbackInput('Predicate returning true/undefined on success or an issue/message on failure.', {
			ts: '(value: {{A}}) => unknown'
		})
	},
	output: expressionOutput('Schema filter.', schemaFilterType('{{A}}')),
	source: `Schema.makeFilter(${marker('expression', 'predicate', '() => true')})`
})

export const SchemaCheckTemplate = defineTemplate({
	modelId: 'SchemaCheck',
	version: VERSION,
	description: 'Applies one or more validation filters to a schema without changing its decoded type.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Schema to validate.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		filters: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression', type: schemaFilterType('{{A}}') },
			minItems: 1,
			separator: ', ',
			description: 'Filters evaluated against the decoded value.'
		})
	},
	output: expressionOutput('Checked schema.', schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.check(${marker('expression', 'filters', 'Schema.makeFilter(() => true)')})`
})

export const SchemaIsMinLengthTemplate = defineTemplate({
	modelId: 'SchemaIsMinLength',
	version: VERSION,
	description: 'Creates a minimum-length filter for strings or arrays.',
	inputs: {
		minLength: effectValueInput('Minimum length.', { ts: 'number' })
	},
	output: expressionOutput('Minimum-length filter.', schemaFilterType('unknown')),
	source: `Schema.isMinLength(${marker('expression', 'minLength', '1')})`
})

export const SchemaIsMaxLengthTemplate = defineTemplate({
	modelId: 'SchemaIsMaxLength',
	version: VERSION,
	description: 'Creates a maximum-length filter for strings or arrays.',
	inputs: {
		maxLength: effectValueInput('Maximum length.', { ts: 'number' })
	},
	output: expressionOutput('Maximum-length filter.', schemaFilterType('unknown')),
	source: `Schema.isMaxLength(${marker('expression', 'maxLength', '1')})`
})

export const SchemaIsLengthBetweenTemplate = defineTemplate({
	modelId: 'SchemaIsLengthBetween',
	version: VERSION,
	description: 'Creates a bounded-length filter for strings or arrays.',
	inputs: {
		minLength: effectValueInput('Minimum length.', { ts: 'number' }),
		maxLength: effectValueInput('Maximum length.', { ts: 'number' })
	},
	output: expressionOutput('Length-range filter.', schemaFilterType('unknown')),
	source: `Schema.isLengthBetween(${marker('expression', 'minLength', '0')}, ${marker('expression', 'maxLength', '1')})`
})

export const SchemaIsBetweenTemplate = defineTemplate({
	modelId: 'SchemaIsBetween',
	version: VERSION,
	description: 'Creates a numeric inclusive-range filter.',
	inputs: {
		minimum: effectValueInput('Inclusive minimum.', { ts: 'number' }),
		maximum: effectValueInput('Inclusive maximum.', { ts: 'number' })
	},
	output: expressionOutput('Numeric range filter.', schemaFilterType('number')),
	source: `Schema.isBetween({ minimum: ${marker('expression', 'minimum', '0')}, maximum: ${marker('expression', 'maximum', '1')} })`
})

export const SchemaIsIntTemplate = defineTemplate({
	modelId: 'SchemaIsInt',
	version: VERSION,
	description: 'Creates an integer-number filter.',
	inputs: {},
	output: expressionOutput('Integer filter.', schemaFilterType('number')),
	source: 'Schema.isInt()'
})

export const SchemaWithConstructorDefaultTemplate = defineTemplate({
	modelId: 'SchemaWithConstructorDefault',
	version: VERSION,
	description: 'Adds a lazily evaluated default used by schema constructors.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.'],
		['RDefault', 'Default-effect requirements.']
	),
	inputs: {
		schema: schemaInput('Schema receiving a constructor default.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		defaultValue: effectSourceInput('Effect producing the constructor default.', effectType('{{A}}', 'never', '{{RDefault}}'))
	},
	output: expressionOutput(
		'Property signature with constructor default.',
		schemaPropertySignatureType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.pipe(Schema.withConstructorDefault(${marker('expression', 'defaultValue', 'Effect.succeed(undefined)')}))`
})

export const SchemaWithDecodingDefaultTypeTemplate = defineTemplate({
	modelId: 'SchemaWithDecodingDefaultType',
	version: VERSION,
	description: 'Makes a field optional during decoding and supplies a decoded default for missing or undefined input.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Schema decoding services.'],
		['RE', 'Schema encoding services.'],
		['RDefault', 'Default-effect requirements.']
	),
	inputs: {
		schema: schemaInput('Schema receiving the decoding default.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		defaultValue: effectSourceInput('Effect producing the decoded default.', effectType('{{A}}', 'never', '{{RDefault}}'))
	},
	output: expressionOutput(
		'Property signature with decoded default.',
		schemaPropertySignatureType('{{A}}', '{{I}} | undefined', '{{RD}} | {{RDefault}}', '{{RE}}')
	),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.pipe(Schema.withDecodingDefaultType(${marker('expression', 'defaultValue', 'Effect.succeed(undefined)')}))`
})

export const SchemaWithDecodingDefaultTypeKeyTemplate = defineTemplate({
	modelId: 'SchemaWithDecodingDefaultTypeKey',
	version: VERSION,
	description: 'Supplies a decoded default only when the encoded key is absent.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Schema decoding services.'],
		['RE', 'Schema encoding services.'],
		['RDefault', 'Default-effect requirements.']
	),
	inputs: {
		schema: schemaInput('Schema receiving the missing-key default.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		defaultValue: effectSourceInput('Effect producing the decoded default.', effectType('{{A}}', 'never', '{{RDefault}}'))
	},
	output: expressionOutput(
		'Property signature with missing-key default.',
		schemaPropertySignatureType('{{A}}', '{{I}}', '{{RD}} | {{RDefault}}', '{{RE}}')
	),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.pipe(Schema.withDecodingDefaultTypeKey(${marker('expression', 'defaultValue', 'Effect.succeed(undefined)')}))`
})

export const SchemaBrandTemplate = defineTemplate({
	modelId: 'SchemaBrand',
	version: VERSION,
	description: 'Adds a nominal brand to a schema while preserving its runtime representation.',
	inputs: {
		schema: schemaInput('Schema to brand.'),
		brand: stringInput('Brand name.')
	},
	output: expressionOutput('Branded schema.', schemaType('unknown', 'unknown', 'unknown', 'unknown')),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.pipe(Schema.brand(${marker('string', 'brand', '"Brand"')}))`
})

export const SchemaMakeTemplate = defineTemplate({
	modelId: 'SchemaMake',
	version: VERSION,
	description: 'Constructs a schema Type value, applying constructor defaults and type-side checks.',
	typeParameters: typeParameters(['A', 'Constructed value type.']),
	inputs: {
		schema: schemaInput('Schema constructor.', '{{A}}'),
		value: valueInput('Constructor input for the schema Type.')
	},
	output: expressionOutput('Constructed value.', { ts: '{{A}}' }),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.make(${marker('expression', 'value', 'undefined')})`
})

export const SchemaMakeOptionTemplate = defineTemplate({
	modelId: 'SchemaMakeOption',
	version: VERSION,
	description: 'Constructs a schema Type value and returns Option.none on schema issues.',
	typeParameters: typeParameters(['A', 'Constructed value type.']),
	inputs: {
		schema: schemaInput('Schema constructor.', '{{A}}'),
		value: valueInput('Constructor input for the schema Type.')
	},
	output: expressionOutput('Optional constructed value.', optionType('{{A}}')),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.makeOption(${marker('expression', 'value', 'undefined')})`
})

export const SchemaMakeEffectTemplate = defineTemplate({
	modelId: 'SchemaMakeEffect',
	version: VERSION,
	description: 'Constructs a schema Type value with SchemaError in the Effect error channel.',
	typeParameters: typeParameters(['A', 'Constructed value type.']),
	inputs: {
		schema: schemaInput('Schema constructor.', '{{A}}'),
		value: valueInput('Constructor input for the schema Type.')
	},
	output: expressionOutput('Effectful constructor result.', effectType('{{A}}', schemaError, 'unknown')),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.makeEffect(${marker('expression', 'value', 'undefined')})`
})


/**
 * Compatibility model ID retained from the v1 catalog. In Effect v4 the
 * effectful unknown decoder is named decodeUnknownEffect.
 */
export const SchemaDecodeUnknownTemplate = defineTemplate({
	modelId: 'SchemaDecodeUnknown',
	version: VERSION,
	description: 'Decodes an unknown value in Effect using the v4 decodeUnknownEffect API.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Schema used to decode.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		value: valueInput('Unknown input value.')
	},
	output: expressionOutput('Decode Effect.', effectType('{{A}}', schemaError, '{{RD}}')),
	source: `Schema.decodeUnknownEffect(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

/**
 * Compatibility model ID retained from the v1 catalog. In Effect v4 the
 * effectful encoder is named encodeEffect.
 */
export const SchemaEncodeTemplate = defineTemplate({
	modelId: 'SchemaEncode',
	version: VERSION,
	description: 'Encodes a decoded Type value in Effect using the v4 encodeEffect API.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Schema used to encode.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		value: valueInput('Decoded input value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Encode Effect.', effectType('{{I}}', schemaError, '{{RE}}')),
	source: `Schema.encodeEffect(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaDecodeUnknownSyncTemplate = defineTemplate({
	modelId: 'SchemaDecodeUnknownSync',
	version: VERSION,
	description: 'Synchronously decodes an unknown value and throws SchemaError on failure.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Schema used to decode.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		value: valueInput('Unknown input value.')
	},
	output: expressionOutput('Decoded value.', { ts: '{{A}}' }),
	source: `Schema.decodeUnknownSync(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaDecodeUnknownExitTemplate = defineTemplate({
	modelId: 'SchemaDecodeUnknownExit',
	version: VERSION,
	description: 'Synchronously decodes an unknown value into Exit.',
	typeParameters: typeParameters(['A', 'Decoded value type.']),
	inputs: {
		schema: schemaInput('Schema used to decode.', '{{A}}'),
		value: valueInput('Unknown input value.')
	},
	output: expressionOutput('Decode Exit.', nominalType('effect/Exit', { exitSuccess: '{{A}}', exitFailure: schemaError })),
	source: `Schema.decodeUnknownExit(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaDecodeUnknownOptionTemplate = defineTemplate({
	modelId: 'SchemaDecodeUnknownOption',
	version: VERSION,
	description: 'Synchronously decodes an unknown value into Option, discarding schema issues on failure.',
	typeParameters: typeParameters(['A', 'Decoded value type.']),
	inputs: {
		schema: schemaInput('Schema used to decode.', '{{A}}'),
		value: valueInput('Unknown input value.')
	},
	output: expressionOutput('Decode Option.', optionType('{{A}}')),
	source: `Schema.decodeUnknownOption(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaDecodeUnknownResultTemplate = defineTemplate({
	modelId: 'SchemaDecodeUnknownResult',
	version: VERSION,
	description: 'Decodes an unknown value into Result without throwing schema issues.',
	typeParameters: typeParameters(['A', 'Decoded value type.']),
	inputs: {
		schema: schemaInput('Schema used to decode.', '{{A}}'),
		value: valueInput('Unknown input value.')
	},
	output: expressionOutput('Decode Result.', resultType('{{A}}', schemaError)),
	source: `Schema.decodeUnknownResult(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaDecodeUnknownEffectTemplate = defineTemplate({
	modelId: 'SchemaDecodeUnknownEffect',
	version: VERSION,
	description: 'Decodes an unknown value in Effect, supporting asynchronous transformations and decoding services.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Schema used to decode.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		value: valueInput('Unknown input value.')
	},
	output: expressionOutput('Decode Effect.', effectType('{{A}}', schemaError, '{{RD}}')),
	source: `Schema.decodeUnknownEffect(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaEncodeSyncTemplate = defineTemplate({
	modelId: 'SchemaEncodeSync',
	version: VERSION,
	description: 'Synchronously encodes a decoded Type value and throws SchemaError on failure.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Schema used to encode.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		value: valueInput('Decoded input value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Encoded value.', { ts: '{{I}}' }),
	source: `Schema.encodeSync(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaEncodeExitTemplate = defineTemplate({
	modelId: 'SchemaEncodeExit',
	version: VERSION,
	description: 'Synchronously encodes a decoded Type value into Exit.',
	typeParameters: typeParameters(['A', 'Decoded value type.'], ['I', 'Encoded value type.']),
	inputs: {
		schema: schemaInput('Schema used to encode.', '{{A}}', '{{I}}'),
		value: valueInput('Decoded input value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Encode Exit.', nominalType('effect/Exit', { exitSuccess: '{{I}}', exitFailure: schemaError })),
	source: `Schema.encodeExit(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaEncodeOptionTemplate = defineTemplate({
	modelId: 'SchemaEncodeOption',
	version: VERSION,
	description: 'Synchronously encodes a decoded Type value into Option, discarding schema issues on failure.',
	typeParameters: typeParameters(['A', 'Decoded value type.'], ['I', 'Encoded value type.']),
	inputs: {
		schema: schemaInput('Schema used to encode.', '{{A}}', '{{I}}'),
		value: valueInput('Decoded input value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Encode Option.', optionType('{{I}}')),
	source: `Schema.encodeOption(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaEncodeResultTemplate = defineTemplate({
	modelId: 'SchemaEncodeResult',
	version: VERSION,
	description: 'Encodes a decoded Type value into Result without throwing schema issues.',
	typeParameters: typeParameters(['A', 'Decoded value type.'], ['I', 'Encoded value type.']),
	inputs: {
		schema: schemaInput('Schema used to encode.', '{{A}}', '{{I}}'),
		value: valueInput('Decoded input value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Encode Result.', resultType('{{I}}', schemaError)),
	source: `Schema.encodeResult(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaEncodeEffectTemplate = defineTemplate({
	modelId: 'SchemaEncodeEffect',
	version: VERSION,
	description: 'Encodes a decoded Type value in Effect, supporting asynchronous transformations and encoding services.',
	typeParameters: typeParameters(
		['A', 'Decoded value type.'],
		['I', 'Encoded value type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Schema used to encode.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		value: valueInput('Decoded input value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Encode Effect.', effectType('{{I}}', schemaError, '{{RE}}')),
	source: `Schema.encodeEffect(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaDecodeUnknownPromiseTemplate = defineTemplate({
	modelId: 'SchemaDecodeUnknownPromise',
	version: VERSION,
	description: 'Asynchronously decodes an unknown value with Promise, supporting asynchronous transformations.',
	typeParameters: typeParameters(['A', 'Decoded value type.']),
	inputs: {
		schema: schemaInput('Schema used to decode.', '{{A}}'),
		value: valueInput('Unknown input value.')
	},
	output: expressionOutput('Decode Promise.', { ts: 'Promise<{{A}}>' }),
	source: `Schema.decodeUnknownPromise(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaEncodePromiseTemplate = defineTemplate({
	modelId: 'SchemaEncodePromise',
	version: VERSION,
	description: 'Asynchronously encodes a decoded Type value with Promise, supporting asynchronous transformations.',
	typeParameters: typeParameters(['A', 'Decoded value type.'], ['I', 'Encoded value type.']),
	inputs: {
		schema: schemaInput('Schema used to encode.', '{{A}}', '{{I}}'),
		value: valueInput('Decoded input value.', { ts: '{{A}}' })
	},
	output: expressionOutput('Encode Promise.', { ts: 'Promise<{{I}}>' }),
	source: `Schema.encodePromise(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaIsTemplate = defineTemplate({
	modelId: 'SchemaIs',
	version: VERSION,
	description: 'Derives a synchronous type guard for the schema Type.',
	typeParameters: typeParameters(['A', 'Guarded value type.']),
	inputs: {
		schema: schemaInput('Schema used to derive a type guard.', '{{A}}')
	},
	output: expressionOutput('Type guard.', { ts: '(input: unknown) => input is {{A}}' }),
	source: `Schema.is(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaToCodecJsonTemplate = defineTemplate({
	modelId: 'SchemaToCodecJson',
	version: VERSION,
	description: 'Derives a JSON-compatible codec representation for an Effect runtime-value schema.',
	typeParameters: typeParameters(
		['A', 'Decoded runtime type.'],
		['I', 'Runtime encoded type.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		schema: schemaInput('Runtime-value schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput('JSON-compatible codec.', schemaType('{{A}}', 'unknown', '{{RD}}', '{{RE}}')),
	source: `Schema.toCodecJson(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaToEquivalenceTemplate = defineTemplate({
	modelId: 'SchemaToEquivalence',
	version: VERSION,
	description: 'Derives structural equivalence for values of a schema Type.',
	typeParameters: typeParameters(['A', 'Compared value type.']),
	inputs: {
		schema: schemaInput('Schema used to derive equivalence.', '{{A}}')
	},
	output: expressionOutput('Equivalence function.', { ts: '(self: {{A}}, that: {{A}}) => boolean' }),
	source: `Schema.toEquivalence(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaToFormatterTemplate = defineTemplate({
	modelId: 'SchemaToFormatter',
	version: VERSION,
	description: 'Derives a human-readable formatter for values of a schema Type without validating them.',
	typeParameters: typeParameters(['A', 'Formatted value type.']),
	inputs: {
		schema: schemaInput('Schema used to derive a formatter.', '{{A}}')
	},
	output: expressionOutput('Value formatter.', { ts: '(value: {{A}}) => string' }),
	source: `Schema.toFormatter(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaToArbitraryTemplate = defineTemplate({
	modelId: 'SchemaToArbitrary',
	version: VERSION,
	description: 'Derives a fast-check Arbitrary for values of a schema Type.',
	typeParameters: typeParameters(['A', 'Generated value type.']),
	inputs: {
		schema: schemaInput('Schema used to derive an Arbitrary.', '{{A}}')
	},
	output: expressionOutput('fast-check Arbitrary.', nominalType('fast-check/Arbitrary', { arbitraryValue: '{{A}}' })),
	source: `Schema.toArbitrary(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaOverrideToEquivalenceTemplate = defineTemplate({
	modelId: 'SchemaOverrideToEquivalence',
	version: VERSION,
	description: 'Overrides the Equivalence derivation for an existing schema.',
	typeParameters: typeParameters(['A', 'Compared value type.']),
	inputs: {
		schema: schemaInput('Schema whose derived Equivalence is overridden.', '{{A}}'),
		factory: callbackInput('Factory returning the replacement Equivalence.', {
			ts: '() => (self: {{A}}, that: {{A}}) => boolean'
		})
	},
	output: expressionOutput('Schema with custom Equivalence derivation.', schemaType('{{A}}')),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.pipe(Schema.overrideToEquivalence(${marker('expression', 'factory', '() => () => true')}))`
})

export const SchemaOverrideToFormatterTemplate = defineTemplate({
	modelId: 'SchemaOverrideToFormatter',
	version: VERSION,
	description: 'Overrides the value-formatter derivation for an existing schema.',
	typeParameters: typeParameters(['A', 'Formatted value type.']),
	inputs: {
		schema: schemaInput('Schema whose derived formatter is overridden.', '{{A}}'),
		factory: callbackInput('Factory returning the replacement formatter.', {
			ts: '() => (value: {{A}}) => string'
		})
	},
	output: expressionOutput('Schema with custom formatter derivation.', schemaType('{{A}}')),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.pipe(Schema.overrideToFormatter(${marker('expression', 'factory', '() => String')}))`
})

export const SchemaToArbitraryLazyTemplate = defineTemplate({
	modelId: 'SchemaToArbitraryLazy',
	version: VERSION,
	description: 'Derives an Arbitrary factory whose caller supplies the fast-check module.',
	typeParameters: typeParameters(['A', 'Generated value type.']),
	inputs: {
		schema: schemaInput('Schema used to derive a lazy Arbitrary factory.', '{{A}}')
	},
	output: expressionOutput('Lazy fast-check Arbitrary factory.', { ts: '(fastCheck: unknown) => unknown' }),
	source: `Schema.toArbitraryLazy(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaIssueFormatterDefaultTemplate = defineTemplate({
	modelId: 'SchemaIssueFormatterDefault',
	version: VERSION,
	description: 'Creates the default multi-line formatter for Schema issues.',
	inputs: {},
	output: expressionOutput('Schema issue string formatter.', { ts: '(issue: unknown) => string' }),
	source: 'SchemaIssue.makeFormatterDefault()'
})

export const SchemaIssueFormatterStandardSchemaV1Template = defineTemplate({
	modelId: 'SchemaIssueFormatterStandardSchemaV1',
	version: VERSION,
	description: 'Creates the structured Standard Schema V1 formatter for Schema issues.',
	inputs: {},
	output: expressionOutput('Standard Schema V1 issue formatter.', {
		ts: '(issue: unknown) => { readonly issues: ReadonlyArray<{ readonly message: string; readonly path?: ReadonlyArray<PropertyKey> }> }'
	}),
	source: 'SchemaIssue.makeFormatterStandardSchemaV1()'
})

export const SchemaOptionTemplate = defineTemplate({
	modelId: 'SchemaOption',
	version: VERSION,
	description: 'Builds a schema for Effect Option values and transforms Some contents.',
	typeParameters: typeParameters(
		['A', 'Decoded Some value.'],
		['I', 'Encoded Some value.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		value: schemaInput('Schema for Some contents.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput('Option runtime-value schema.', schemaType('unknown', 'unknown', '{{RD}}', '{{RE}}')),
	source: `Schema.Option(${marker('expression', 'value', 'Schema.Unknown')})`
})

export const SchemaOptionFromOptionalKeyTemplate = defineTemplate({
	modelId: 'SchemaOptionFromOptionalKey',
	version: VERSION,
	description: 'Maps a missing struct property to Option.none and a present value to Option.some.',
	typeParameters: typeParameters(
		['A', 'Decoded Some value.'],
		['I', 'Encoded present value.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		value: schemaInput('Schema for the present property value.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}')
	},
	output: expressionOutput(
		'Optional-key Option property signature.',
		schemaPropertySignatureType('unknown', '{{I}}', '{{RD}}', '{{RE}}')
	),
	source: `Schema.OptionFromOptionalKey(${marker('expression', 'value', 'Schema.Unknown')})`
})

export const SchemaOptionFromNullishOrTemplate = defineTemplate({
	modelId: 'SchemaOptionFromNullishOr',
	version: VERSION,
	description: 'Transforms null or undefined into Option.none and present values into Option.some.',
	typeParameters: typeParameters(
		['A', 'Decoded Some value.'],
		['I', 'Encoded present value.'],
		['RD', 'Decoding services.'],
		['RE', 'Encoding services.']
	),
	inputs: {
		value: schemaInput('Schema for present values.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'),
		options: valueInput('Options such as onNoneEncoding.')
	},
	output: expressionOutput('Nullish-to-Option schema.', schemaType('unknown', '{{I}} | null | undefined', '{{RD}}', '{{RE}}')),
	source: `Schema.OptionFromNullishOr(${marker('expression', 'value', 'Schema.Unknown')}, ${marker('expression', 'options', '{}')})`
})

export const SchemaResultTemplate = defineTemplate({
	modelId: 'SchemaResult',
	version: VERSION,
	description: 'Builds a schema for Effect Result values, transforming success and failure independently.',
	inputs: {
		success: schemaInput('Success-value schema.'),
		failure: schemaInput('Failure-value schema.')
	},
	output: expressionOutput('Result runtime-value schema.', schemaType('unknown', 'unknown', 'unknown', 'unknown')),
	source: `Schema.Result(${marker('expression', 'success', 'Schema.Unknown')}, ${marker('expression', 'failure', 'Schema.Unknown')})`
})

export const SchemaExitTemplate = defineTemplate({
	modelId: 'SchemaExit',
	version: VERSION,
	description: 'Builds a schema for Effect Exit values with independent success, failure, and defect schemas.',
	inputs: {
		success: schemaInput('Success-value schema.'),
		failure: schemaInput('Expected-failure schema.'),
		defect: schemaInput('Defect schema.')
	},
	output: expressionOutput('Exit runtime-value schema.', schemaType('unknown', 'unknown', 'unknown', 'unknown')),
	source: `Schema.Exit(${marker('expression', 'success', 'Schema.Unknown')}, ${marker('expression', 'failure', 'Schema.Unknown')}, ${marker('expression', 'defect', 'Schema.Unknown')})`
})

export const SchemaReadonlySetTemplate = defineTemplate({
	modelId: 'SchemaReadonlySet',
	version: VERSION,
	description: 'Builds a schema for ReadonlySet runtime values.',
	inputs: {
		value: schemaInput('Set element schema.')
	},
	output: expressionOutput('ReadonlySet runtime-value schema.', schemaType('ReadonlySet<unknown>', 'ReadonlySet<unknown>', 'unknown', 'unknown')),
	source: `Schema.ReadonlySet(${marker('expression', 'value', 'Schema.Unknown')})`
})

export const SchemaReadonlyMapTemplate = defineTemplate({
	modelId: 'SchemaReadonlyMap',
	version: VERSION,
	description: 'Builds a schema for ReadonlyMap runtime values.',
	inputs: {
		key: schemaInput('Map key schema.'),
		value: schemaInput('Map value schema.')
	},
	output: expressionOutput('ReadonlyMap runtime-value schema.', schemaType('ReadonlyMap<unknown, unknown>', 'ReadonlyMap<unknown, unknown>', 'unknown', 'unknown')),
	source: `Schema.ReadonlyMap(${marker('expression', 'key', 'Schema.Unknown')}, ${marker('expression', 'value', 'Schema.Unknown')})`
})

export const SchemaHashSetTemplate = defineTemplate({
	modelId: 'SchemaHashSet',
	version: VERSION,
	description: 'Builds a schema for Effect HashSet runtime values.',
	inputs: {
		value: schemaInput('HashSet element schema.')
	},
	output: expressionOutput('HashSet runtime-value schema.', schemaType('unknown', 'unknown', 'unknown', 'unknown')),
	source: `Schema.HashSet(${marker('expression', 'value', 'Schema.Unknown')})`
})

export const SchemaHashMapTemplate = defineTemplate({
	modelId: 'SchemaHashMap',
	version: VERSION,
	description: 'Builds a schema for Effect HashMap runtime values.',
	inputs: {
		key: schemaInput('HashMap key schema.'),
		value: schemaInput('HashMap value schema.')
	},
	output: expressionOutput('HashMap runtime-value schema.', schemaType('unknown', 'unknown', 'unknown', 'unknown')),
	source: `Schema.HashMap(${marker('expression', 'key', 'Schema.Unknown')}, ${marker('expression', 'value', 'Schema.Unknown')})`
})

export const SchemaRedactedTemplate = defineTemplate({
	modelId: 'SchemaRedacted',
	version: VERSION,
	description: 'Builds a schema for Effect Redacted runtime values.',
	inputs: {
		value: schemaInput('Hidden-value schema.'),
		options: valueInput('Redacted options such as label or disallowJsonEncode.')
	},
	output: expressionOutput('Redacted runtime-value schema.', schemaType('unknown', 'unknown', 'unknown', 'unknown')),
	source: `Schema.Redacted(${marker('expression', 'value', 'Schema.Unknown')}, ${marker('expression', 'options', '{}')})`
})

export const SchemaRedactedFromValueTemplate = defineTemplate({
	modelId: 'SchemaRedactedFromValue',
	version: VERSION,
	description: 'Decodes a raw value and wraps it in Effect Redacted.',
	inputs: {
		value: schemaInput('Raw hidden-value schema.')
	},
	output: expressionOutput('Raw-value-to-Redacted schema.', schemaType('unknown', 'unknown', 'unknown', 'unknown')),
	source: `Schema.RedactedFromValue(${marker('expression', 'value', 'Schema.Unknown')})`
})

export const SchemaClassDeclarationTemplate = defineTemplate({
	modelId: 'SchemaClassDeclaration',
	version: VERSION,
	description: 'Declares an exported Effect Schema.Class with a stable schema identifier.',
	inputs: {
		name: identifierInput('Schema class name.'),
		identifier: stringInput('Stable schema identifier used in diagnostics and metadata.'),
		fields: valueInput('Record of class field schemas.')
	},
	output: statementOutput('Exported Schema.Class declaration.'),
	source: `export class ${marker('identifier', 'name', 'Model')} extends Schema.Class<any>(${marker('string', 'identifier', '"Model"')})(${marker('expression', 'fields', '{}')}) {}`
})

export const SchemaTaggedClassDeclarationTemplate = defineTemplate({
	modelId: 'SchemaTaggedClassDeclaration',
	version: VERSION,
	description: 'Declares an exported Schema.TaggedClass whose tag is also its stable identifier.',
	inputs: {
		name: identifierInput('Tagged class name.'),
		tag: stringInput('Stable _tag value.'),
		fields: valueInput('Record of non-tag field schemas.')
	},
	output: statementOutput('Exported Schema.TaggedClass declaration.'),
	source: `export class ${marker('identifier', 'name', 'Model')} extends Schema.TaggedClass<any>()(${marker('string', 'tag', '"Model"')}, ${marker('expression', 'fields', '{}')}) {}`
})

export const SchemaTaggedErrorDeclarationTemplate = defineTemplate({
	modelId: 'SchemaTaggedErrorDeclaration',
	version: VERSION,
	description: 'Declares an exported yieldable Schema.TaggedError class.',
	inputs: {
		name: identifierInput('Error class name.'),
		tag: stringInput('Stable _tag value.'),
		fields: valueInput('Record of error field schemas.')
	},
	output: statementOutput('Exported Schema.TaggedError declaration.'),
	source: `export class ${marker('identifier', 'name', 'DomainError')} extends Schema.TaggedError<any>()(${marker('string', 'tag', '"DomainError"')}, ${marker('expression', 'fields', '{}')}) {}`
})

export const effectSchemaGraphTemplateInputs = [
	SchemaStringTemplate,
	SchemaFiniteTemplate,
	SchemaBooleanTemplate,
	SchemaBigIntTemplate,
	SchemaSymbolTemplate,
	SchemaObjectKeywordTemplate,
	SchemaUndefinedTemplate,
	SchemaVoidTemplate,
	SchemaAnyTemplate,
	SchemaUnknownTemplate,
	SchemaNeverTemplate,
	SchemaNullTemplate,
	SchemaNonEmptyStringTemplate,
	SchemaIntTemplate,
	SchemaTrimTemplate,
	SchemaFiniteFromStringTemplate,
	SchemaDateTemplate,
	SchemaDateFromStringTemplate,
	SchemaDurationTemplate,
	SchemaDurationFromStringTemplate,
	SchemaDurationFromMillisTemplate,
	SchemaDurationFromNanosTemplate,
	SchemaRevealCodecTemplate,
	SchemaUniqueSymbolTemplate,
	SchemaTemplateLiteralTemplate,
	SchemaTemplateLiteralParserTemplate,
	SchemaEnumTemplate,
	SchemaMutableTemplate,
	SchemaInstanceOfTemplate,
	SchemaDeclareTemplate,
	SchemaSuspendTemplate,
	SchemaLiteralTemplate,
	SchemaLiteralsTemplate,
	SchemaUnionTemplate,
	SchemaNullOrTemplate,
	SchemaUndefinedOrTemplate,
	SchemaTupleTemplate,
	SchemaTupleWithRestTemplate,
	SchemaArrayTemplate,
	SchemaNonEmptyArrayTemplate,
	SchemaRecordTemplate,
	SchemaStructTemplate,
	SchemaStructWithRestTemplate,
	SchemaOptionalTemplate,
	SchemaOptionalKeyTemplate,
	SchemaTagTemplate,
	SchemaTagDefaultOmitTemplate,
	SchemaTaggedStructTemplate,
	SchemaAnnotateTemplate,
	SchemaAnnotateEncodedTemplate,
	SchemaAnnotateKeyTemplate,
	SchemaEncodeKeysTemplate,
	SchemaMakeFilterTemplate,
	SchemaCheckTemplate,
	SchemaIsMinLengthTemplate,
	SchemaIsMaxLengthTemplate,
	SchemaIsLengthBetweenTemplate,
	SchemaIsBetweenTemplate,
	SchemaIsIntTemplate,
	SchemaWithConstructorDefaultTemplate,
	SchemaWithDecodingDefaultTypeTemplate,
	SchemaWithDecodingDefaultTypeKeyTemplate,
	SchemaBrandTemplate,
	SchemaMakeTemplate,
	SchemaMakeOptionTemplate,
	SchemaMakeEffectTemplate,
	SchemaDecodeUnknownTemplate,
	SchemaEncodeTemplate,
	SchemaDecodeUnknownSyncTemplate,
	SchemaDecodeUnknownExitTemplate,
	SchemaDecodeUnknownOptionTemplate,
	SchemaDecodeUnknownResultTemplate,
	SchemaDecodeUnknownEffectTemplate,
	SchemaDecodeUnknownPromiseTemplate,
	SchemaEncodeSyncTemplate,
	SchemaEncodeExitTemplate,
	SchemaEncodeOptionTemplate,
	SchemaEncodeResultTemplate,
	SchemaEncodeEffectTemplate,
	SchemaEncodePromiseTemplate,
	SchemaIsTemplate,
	SchemaToCodecJsonTemplate,
	SchemaToEquivalenceTemplate,
	SchemaToFormatterTemplate,
	SchemaToArbitraryTemplate,
	SchemaOverrideToEquivalenceTemplate,
	SchemaOverrideToFormatterTemplate,
	SchemaToArbitraryLazyTemplate,
	SchemaIssueFormatterDefaultTemplate,
	SchemaIssueFormatterStandardSchemaV1Template,
	SchemaOptionTemplate,
	SchemaOptionFromOptionalKeyTemplate,
	SchemaOptionFromNullishOrTemplate,
	SchemaResultTemplate,
	SchemaExitTemplate,
	SchemaReadonlySetTemplate,
	SchemaReadonlyMapTemplate,
	SchemaHashSetTemplate,
	SchemaHashMapTemplate,
	SchemaRedactedTemplate,
	SchemaRedactedFromValueTemplate,
	SchemaClassDeclarationTemplate,
	SchemaTaggedClassDeclarationTemplate,
	SchemaTaggedErrorDeclarationTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
