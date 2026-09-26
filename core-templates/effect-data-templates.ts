import { defineTemplate } from '../src/templates.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	identifierInput,
	marker,
	statementOutput,
	stringInput,
	typeCodeInput
} from './effect-template-helpers.js'

export const DataClassDeclarationTemplate = defineTemplate({
	modelId: 'DataClassDeclaration',
	version: '1.0.0',
	description: 'Declares an exported value-equality class with Data.Class.',
	inputs: {
		name: identifierInput('Class name.'),
		fields: typeCodeInput('Object type containing the class fields.')
	},
	output: statementOutput('Data.Class declaration.'),
	source: `export class ${marker('identifier', 'name', 'Value')} extends Data.Class<${marker('type', 'fields', '{}')}> {}`
})

export const DataTaggedClassDeclarationTemplate = defineTemplate({
	modelId: 'DataTaggedClassDeclaration',
	version: '1.0.0',
	description: 'Declares an exported value-equality class with a fixed _tag using Data.TaggedClass.',
	inputs: {
		name: identifierInput('Class name.'),
		tag: stringInput('Literal _tag value.'),
		fields: typeCodeInput('Object type containing the class fields.')
	},
	output: statementOutput('Data.TaggedClass declaration.'),
	source: `export class ${marker('identifier', 'name', 'Value')} extends Data.TaggedClass(${marker('string', 'tag', '"Value"')})<${marker('type', 'fields', '{}')}> {}`
})

export const DataErrorDeclarationTemplate = defineTemplate({
	modelId: 'DataErrorDeclaration',
	version: '1.0.0',
	description: 'Declares an exported Error subclass with Data.Error and value-equality fields.',
	inputs: {
		name: identifierInput('Error class name.'),
		fields: typeCodeInput('Object type containing error fields such as message, file, or cause.')
	},
	output: statementOutput('Data.Error declaration.'),
	source: `export class ${marker('identifier', 'name', 'AppError')} extends Data.Error<${marker('type', 'fields', '{ message: string }')}> {}`
})

export const DataTaggedErrorDeclarationTemplate = defineTemplate({
	modelId: 'DataTaggedErrorDeclaration',
	version: '1.0.0',
	description: 'Declares an exported tagged Error subclass suitable for Effect.catchTag / catchTags.',
	inputs: {
		name: identifierInput('Error class name.'),
		tag: stringInput('Literal _tag value.'),
		fields: typeCodeInput('Object type containing error fields.')
	},
	output: statementOutput('Data.TaggedError declaration.'),
	source: `export class ${marker('identifier', 'name', 'AppError')} extends Data.TaggedError(${marker('string', 'tag', '"AppError"')})<${marker('type', 'fields', '{ message: string }')}> {}`
})

export const DataTaggedEnumTypeDeclarationTemplate = defineTemplate({
	modelId: 'DataTaggedEnumTypeDeclaration',
	version: '1.0.0',
	description: 'Declares an exported tagged-union type with Data.TaggedEnum.',
	inputs: {
		name: identifierInput('Tagged union type name.'),
		variants: typeCodeInput('Object type mapping tag names to variant payload object types.')
	},
	output: statementOutput('Data.TaggedEnum type declaration.'),
	source: `export type ${marker('identifier', 'name', 'State')} = Data.TaggedEnum<${marker('type', 'variants', '{ Loading: {} }')}>`
})

export const DataTaggedEnumFactoryTemplate = defineTemplate({
	modelId: 'DataTaggedEnumFactory',
	version: '1.0.0',
	description: 'Creates constructors plus $is and $match helpers for a Data.TaggedEnum definition.',
	inputs: { definition: typeCodeInput('TaggedEnum type or TaggedEnum.WithGenerics definition type.') },
	output: expressionOutput('TaggedEnum constructor and matching helpers.'),
	source: `Data.taggedEnum<${marker('type', 'definition', 'Data.TaggedEnum<{ Loading: {} }>')}>()`
})

export const effectDataGraphTemplateInputs = [
	DataClassDeclarationTemplate,
	DataTaggedClassDeclarationTemplate,
	DataErrorDeclarationTemplate,
	DataTaggedErrorDeclarationTemplate,
	DataTaggedEnumTypeDeclarationTemplate,
	DataTaggedEnumFactoryTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
