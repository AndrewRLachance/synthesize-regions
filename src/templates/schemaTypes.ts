/** The only JSON Schema dialect accepted by the synthesis contract engine. */
export const JSON_SCHEMA_DIALECT_URI = 'https://json-schema.org/draft/2020-12/schema' as const

/** Alias used when embedding the supported dialect in planner-facing contracts. */
export const SUPPORTED_JSON_SCHEMA_DIALECT = JSON_SCHEMA_DIALECT_URI

/** Version of the library's supported Draft 2020-12 keyword profile. */
export const SUPPORTED_JSON_SCHEMA_VERSION = '1' as const

/** Version of the canonicalization and schema-subsumption behavior. */
export const JSON_SCHEMA_COMPATIBILITY_ENGINE_VERSION = '1' as const

/** JSON Schema primitive and container names accepted by this profile. */
export const SUPPORTED_JSON_SCHEMA_TYPE_VALUES = [
	'null',
	'boolean',
	'object',
	'array',
	'number',
	'string',
	'integer'
] as const

export type SupportedJsonSchemaType = typeof SUPPORTED_JSON_SCHEMA_TYPE_VALUES[number]

/**
 * Closed keyword set accepted by `SupportedJsonSchema`.
 *
 * IDs, anchors, dynamic references, remote vocabularies, and legacy draft
 * keywords are intentionally absent. `format` and content keywords are
 * retained as annotations by the runtime validator.
 */
export const SUPPORTED_JSON_SCHEMA_KEYWORD_VALUES = [
	'$schema', '$ref', '$defs', '$comment',
	'title', 'description', 'default', 'deprecated', 'readOnly', 'writeOnly', 'examples',
	'type', 'const', 'enum',
	'multipleOf', 'maximum', 'exclusiveMaximum', 'minimum', 'exclusiveMinimum',
	'maxLength', 'minLength', 'pattern', 'format',
	'contentEncoding', 'contentMediaType', 'contentSchema',
	'maxItems', 'minItems', 'uniqueItems', 'maxContains', 'minContains',
	'prefixItems', 'items', 'contains', 'unevaluatedItems',
	'maxProperties', 'minProperties', 'required',
	'properties', 'patternProperties', 'additionalProperties', 'propertyNames',
	'dependentRequired', 'dependentSchemas', 'unevaluatedProperties',
	'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else'
] as const

export type SupportedJsonSchemaKeyword = typeof SUPPORTED_JSON_SCHEMA_KEYWORD_VALUES[number]

/** A scalar representable in JSON. */
export type JsonPrimitive = string | number | boolean | null

/** A JSON object. Values are recursively constrained to the JSON data model. */
export interface JsonObject {
	readonly [key: string]: JsonValue
}

/** A value representable in JSON (therefore excluding undefined and non-finite numbers). */
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[]

/**
 * The library's closed, typed Draft 2020-12 profile.
 *
 * Runtime validation additionally requires `$ref` to be `#` or a local JSON
 * Pointer beginning with `#/`, and resolves it against the containing schema
 * document. Annotation keywords never affect value or compatibility checks.
 */
export interface SupportedJsonSchemaObject {
	readonly $schema?: typeof JSON_SCHEMA_DIALECT_URI
	readonly $ref?: string
	readonly $defs?: Readonly<Record<string, SupportedJsonSchema>>
	readonly $comment?: string

	readonly title?: string
	readonly description?: string
	readonly default?: JsonValue
	readonly deprecated?: boolean
	readonly readOnly?: boolean
	readonly writeOnly?: boolean
	readonly examples?: readonly JsonValue[]

	readonly type?: SupportedJsonSchemaType | readonly [SupportedJsonSchemaType, ...SupportedJsonSchemaType[]]
	readonly const?: JsonValue
	readonly enum?: readonly [JsonValue, ...JsonValue[]]

	readonly multipleOf?: number
	readonly maximum?: number
	readonly exclusiveMaximum?: number
	readonly minimum?: number
	readonly exclusiveMinimum?: number

	readonly maxLength?: number
	readonly minLength?: number
	readonly pattern?: string
	/** Annotation only; the runtime deliberately does not install format validators. */
	readonly format?: string
	/** Annotation only. */
	readonly contentEncoding?: string
	/** Annotation only. */
	readonly contentMediaType?: string
	/** Annotation only. */
	readonly contentSchema?: SupportedJsonSchema

	readonly maxItems?: number
	readonly minItems?: number
	readonly uniqueItems?: boolean
	readonly maxContains?: number
	readonly minContains?: number
	readonly prefixItems?: readonly [SupportedJsonSchema, ...SupportedJsonSchema[]]
	readonly items?: SupportedJsonSchema
	readonly contains?: SupportedJsonSchema
	readonly unevaluatedItems?: SupportedJsonSchema

	readonly maxProperties?: number
	readonly minProperties?: number
	readonly required?: readonly string[]
	readonly properties?: Readonly<Record<string, SupportedJsonSchema>>
	readonly patternProperties?: Readonly<Record<string, SupportedJsonSchema>>
	readonly additionalProperties?: SupportedJsonSchema
	readonly propertyNames?: SupportedJsonSchema
	readonly dependentRequired?: Readonly<Record<string, readonly string[]>>
	readonly dependentSchemas?: Readonly<Record<string, SupportedJsonSchema>>
	readonly unevaluatedProperties?: SupportedJsonSchema

	readonly allOf?: readonly [SupportedJsonSchema, ...SupportedJsonSchema[]]
	readonly anyOf?: readonly [SupportedJsonSchema, ...SupportedJsonSchema[]]
	readonly oneOf?: readonly [SupportedJsonSchema, ...SupportedJsonSchema[]]
	readonly not?: SupportedJsonSchema
	readonly if?: SupportedJsonSchema
	readonly then?: SupportedJsonSchema
	readonly else?: SupportedJsonSchema
}

/** A boolean schema or a closed object from the supported Draft 2020-12 profile. */
export type SupportedJsonSchema = boolean | SupportedJsonSchemaObject
