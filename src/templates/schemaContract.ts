import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

import { JSON_SCHEMA_DIALECT_URI, type JsonValue, type SupportedJsonSchema } from './schemaTypes.js'

/** JSON Pointer fragment accepted by the supported schema dialect. */
export const LOCAL_JSON_SCHEMA_REFERENCE_PATTERN = '^#(?:|/(?:[^~/]|~[01])*(?:/(?:[^~/]|~[01])*)*)$'

const NonNegativeIntegerDefinition = Type.Integer({ minimum: 0 })
const AnyStringKeyDefinition = Type.String({ pattern: '^[\\s\\S]*$' })
const JsonSchemaTypeDefinition = Type.Union([
	Type.Literal('null'),
	Type.Literal('boolean'),
	Type.Literal('object'),
	Type.Literal('array'),
	Type.Literal('number'),
	Type.Literal('string'),
	Type.Literal('integer')
])

/** Reusable definitions for embedding the dialect in other TypeBox modules. */
export const SUPPORTED_JSON_SCHEMA_CONTRACT_DEFINITIONS = {
	JsonValue: Type.Union([
		Type.Null(),
		Type.Boolean(),
		Type.Number(),
		Type.String(),
		Type.Array(Type.Ref('JsonValue')),
		Type.Record(AnyStringKeyDefinition, Type.Ref('JsonValue'), { additionalProperties: false })
	]),
	SupportedJsonSchema: Type.Union([
		Type.Boolean(),
		Type.Object({
			$schema: Type.Optional(Type.Literal(JSON_SCHEMA_DIALECT_URI)),
			$ref: Type.Optional(Type.String({ pattern: LOCAL_JSON_SCHEMA_REFERENCE_PATTERN })),
			$defs: Type.Optional(Type.Record(
				AnyStringKeyDefinition,
				Type.Ref('SupportedJsonSchema'),
				{ additionalProperties: false }
			)),
			$comment: Type.Optional(Type.String()),

			title: Type.Optional(Type.String()),
			description: Type.Optional(Type.String()),
			default: Type.Optional(Type.Ref('JsonValue')),
			deprecated: Type.Optional(Type.Boolean()),
			readOnly: Type.Optional(Type.Boolean()),
			writeOnly: Type.Optional(Type.Boolean()),
			examples: Type.Optional(Type.Array(Type.Ref('JsonValue'))),

			type: Type.Optional(Type.Union([
				JsonSchemaTypeDefinition,
				Type.Array(JsonSchemaTypeDefinition, { minItems: 1, uniqueItems: true })
			])),
			const: Type.Optional(Type.Ref('JsonValue')),
			enum: Type.Optional(Type.Array(Type.Ref('JsonValue'), { minItems: 1, uniqueItems: true })),

			multipleOf: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
			maximum: Type.Optional(Type.Number()),
			exclusiveMaximum: Type.Optional(Type.Number()),
			minimum: Type.Optional(Type.Number()),
			exclusiveMinimum: Type.Optional(Type.Number()),

			maxLength: Type.Optional(NonNegativeIntegerDefinition),
			minLength: Type.Optional(NonNegativeIntegerDefinition),
			pattern: Type.Optional(Type.String()),
			format: Type.Optional(Type.String()),
			contentEncoding: Type.Optional(Type.String()),
			contentMediaType: Type.Optional(Type.String()),
			contentSchema: Type.Optional(Type.Ref('SupportedJsonSchema')),

			prefixItems: Type.Optional(Type.Array(Type.Ref('SupportedJsonSchema'), { minItems: 1 })),
			items: Type.Optional(Type.Ref('SupportedJsonSchema')),
			contains: Type.Optional(Type.Ref('SupportedJsonSchema')),
			minContains: Type.Optional(NonNegativeIntegerDefinition),
			maxContains: Type.Optional(NonNegativeIntegerDefinition),
			minItems: Type.Optional(NonNegativeIntegerDefinition),
			maxItems: Type.Optional(NonNegativeIntegerDefinition),
			uniqueItems: Type.Optional(Type.Boolean()),
			unevaluatedItems: Type.Optional(Type.Ref('SupportedJsonSchema')),

			properties: Type.Optional(Type.Record(
				AnyStringKeyDefinition,
				Type.Ref('SupportedJsonSchema'),
				{ additionalProperties: false }
			)),
			patternProperties: Type.Optional(Type.Record(
				AnyStringKeyDefinition,
				Type.Ref('SupportedJsonSchema'),
				{ additionalProperties: false }
			)),
			additionalProperties: Type.Optional(Type.Ref('SupportedJsonSchema')),
			propertyNames: Type.Optional(Type.Ref('SupportedJsonSchema')),
			required: Type.Optional(Type.Array(Type.String(), { uniqueItems: true })),
			minProperties: Type.Optional(NonNegativeIntegerDefinition),
			maxProperties: Type.Optional(NonNegativeIntegerDefinition),
			dependentRequired: Type.Optional(Type.Record(
				AnyStringKeyDefinition,
				Type.Array(Type.String(), { uniqueItems: true }),
				{ additionalProperties: false }
			)),
			dependentSchemas: Type.Optional(Type.Record(
				AnyStringKeyDefinition,
				Type.Ref('SupportedJsonSchema'),
				{ additionalProperties: false }
			)),
			unevaluatedProperties: Type.Optional(Type.Ref('SupportedJsonSchema')),

			allOf: Type.Optional(Type.Array(Type.Ref('SupportedJsonSchema'), { minItems: 1 })),
			anyOf: Type.Optional(Type.Array(Type.Ref('SupportedJsonSchema'), { minItems: 1 })),
			oneOf: Type.Optional(Type.Array(Type.Ref('SupportedJsonSchema'), { minItems: 1 })),
			not: Type.Optional(Type.Ref('SupportedJsonSchema')),
			if: Type.Optional(Type.Ref('SupportedJsonSchema')),
			then: Type.Optional(Type.Ref('SupportedJsonSchema')),
			else: Type.Optional(Type.Ref('SupportedJsonSchema'))
		}, { additionalProperties: false })
	])
} as const

const SchemaContractModule = Type.Module(SUPPORTED_JSON_SCHEMA_CONTRACT_DEFINITIONS)

/** Canonical recursive TypeBox contract for JSON-compatible values. */
export const JsonValueSchema = Type.Unsafe<JsonValue>(SchemaContractModule.Import('JsonValue'))

/** Canonical recursive TypeBox contract for the supported Draft 2020-12 profile. */
export const SupportedJsonSchemaSchema = Type.Unsafe<SupportedJsonSchema>(
	SchemaContractModule.Import('SupportedJsonSchema')
)

/** Static JSON value shape produced by the canonical contract. */
export type ContractJsonValue = JsonValue

/** Static supported-schema shape produced by the canonical contract. */
export type ContractSupportedJsonSchema = SupportedJsonSchema

/** Return whether a value is structurally valid JSON data. */
export const isJsonValueContract = (value: unknown): value is JsonValue =>
	Value.Check(JsonValueSchema, value)

/** Return whether a value satisfies the closed supported-schema contract. */
export const isSupportedJsonSchemaContract = (value: unknown): value is SupportedJsonSchema =>
	Value.Check(SupportedJsonSchemaSchema, value)
