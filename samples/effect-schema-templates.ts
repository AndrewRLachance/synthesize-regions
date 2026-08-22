import { defineTemplate, fragmentCollectionPort } from '../src/templates.js'
import { effectType } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	identifierInput,
	marker,
	schemaPropertySignatureType,
	schemaType,
	statementOutput,
	stringInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'

const schemaInput = (description: string, decoded = 'unknown', encoded = 'unknown', requirements = 'never') =>
	typedExpressionInput(description, schemaType(decoded, encoded, requirements))

export const SchemaStructTemplate = defineTemplate({
	modelId: 'SchemaStruct', version: '1.0.0',
	description: 'Builds a Schema.Struct from a record of field schemas.',
	typeParameters: typeParameters(['A', 'Decoded struct type.'], ['I', 'Encoded struct type.'], ['R', 'Schema requirement type.']),
	inputs: { fields: valueInput('Record whose values are property schemas.') },
	output: expressionOutput('Struct schema.', schemaType('{{A}}', '{{I}}', '{{R}}')),
	source: `Schema.Struct(${marker('expression', 'fields', '{}')})`
})

export const SchemaArrayTemplate = defineTemplate({
	modelId: 'SchemaArray', version: '1.0.0', description: 'Builds an array schema from an element schema.',
	typeParameters: typeParameters(['A', 'Decoded element type.'], ['I', 'Encoded element type.'], ['R', 'Schema requirement type.']),
	inputs: { item: schemaInput('Element schema.', '{{A}}', '{{I}}', '{{R}}') },
	output: expressionOutput('Array schema.', schemaType('ReadonlyArray<{{A}}>', 'ReadonlyArray<{{I}}>', '{{R}}')),
	source: `Schema.Array(${marker('expression', 'item', 'Schema.Unknown')})`
})

export const SchemaUnionTemplate = defineTemplate({
	modelId: 'SchemaUnion', version: '1.0.0', description: 'Builds a union from two or more schemas.',
	typeParameters: typeParameters(['A', 'Decoded union type.'], ['I', 'Encoded union type.'], ['R', 'Schema requirement type.']),
	inputs: { members: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: schemaType('{{A}}', '{{I}}', '{{R}}') }, minItems: 2, separator: ', ', description: 'Union member schemas.' }) },
	output: expressionOutput('Union schema.', schemaType('{{A}}', '{{I}}', '{{R}}')),
	source: `Schema.Union(${marker('expression', 'members', 'Schema.Never, Schema.Unknown')})`
})

export const SchemaOptionalTemplate = defineTemplate({
	modelId: 'SchemaOptional', version: '1.0.0', description: 'Marks a struct field schema as optional.',
	typeParameters: typeParameters(['A', 'Decoded field type.'], ['I', 'Encoded field type.'], ['R', 'Schema requirement type.']),
	inputs: { schema: schemaInput('Field schema.', '{{A}}', '{{I}}', '{{R}}') },
	output: expressionOutput('Optional property signature.', schemaPropertySignatureType('{{A}} | undefined', '{{I}} | undefined', '{{R}}')),
	source: `Schema.optional(${marker('expression', 'schema', 'Schema.Unknown')})`
})

export const SchemaDecodeUnknownTemplate = defineTemplate({
	modelId: 'SchemaDecodeUnknown', version: '1.0.0', description: 'Decodes an unknown value with a Schema.',
	typeParameters: typeParameters(['A', 'Decoded value type.'], ['I', 'Encoded value type.'], ['R', 'Schema requirement type.']),
	inputs: { schema: schemaInput('Schema used to decode.', '{{A}}', '{{I}}', '{{R}}'), value: valueInput('Unknown input value.') },
	output: expressionOutput('Decode Effect.', effectType('{{A}}', 'unknown', '{{R}}')),
	source: `Schema.decodeUnknown(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaEncodeTemplate = defineTemplate({
	modelId: 'SchemaEncode', version: '1.0.0', description: 'Encodes a decoded value with a Schema.',
	typeParameters: typeParameters(['A', 'Decoded value type.'], ['I', 'Encoded value type.'], ['R', 'Schema requirement type.']),
	inputs: { schema: schemaInput('Schema used to encode.', '{{A}}', '{{I}}', '{{R}}'), value: valueInput('Decoded value.', { ts: '{{A}}' }) },
	output: expressionOutput('Encode Effect.', effectType('{{I}}', 'unknown', '{{R}}')),
	source: `Schema.encode(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'value', 'undefined')})`
})

export const SchemaTaggedErrorDeclarationTemplate = defineTemplate({
	modelId: 'SchemaTaggedErrorDeclaration', version: '1.0.0', description: 'Declares an exported Schema.TaggedError class.',
	inputs: {
		name: identifierInput('Error class name.'), tag: stringInput('Stable _tag value.'),
		fields: valueInput('Record of field schemas.')
	},
	output: statementOutput('Exported tagged-error class declaration.'),
	source: `export class ${marker('identifier', 'name', 'DomainError')} extends Schema.TaggedError<any>()(${marker('string', 'tag', '"DomainError"')}, ${marker('expression', 'fields', '{}')}) {}`
})

export const effectSchemaGraphTemplateInputs = [
	SchemaStructTemplate, SchemaArrayTemplate, SchemaUnionTemplate, SchemaOptionalTemplate,
	SchemaDecodeUnknownTemplate, SchemaEncodeTemplate, SchemaTaggedErrorDeclarationTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
