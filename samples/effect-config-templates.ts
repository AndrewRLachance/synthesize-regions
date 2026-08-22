import { defineTemplate } from '../src/templates.js'
import { effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	configType,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'

const configInput = (description: string, value = 'unknown') => typedExpressionInput(description, configType(value))
const optionalName = (description: string) => effectValueInput(description, { ts: 'string | undefined' })

const primitiveConfig = (modelId: 'ConfigString' | 'ConfigNumber' | 'ConfigBoolean' | 'ConfigSecret', method: 'string' | 'number' | 'boolean' | 'secret', valueType: string) => defineTemplate({
	modelId, version: '1.0.0', description: `Reads a ${method} value from configuration.`,
	inputs: { name: optionalName('Optional configuration key name.') },
	output: expressionOutput(`${method} Config.`, configType(valueType)),
	source: `Config.${method}(${marker('expression', 'name', 'undefined')})`
})

export const ConfigStringTemplate = primitiveConfig('ConfigString', 'string', 'string')
export const ConfigNumberTemplate = primitiveConfig('ConfigNumber', 'number', 'number')
export const ConfigBooleanTemplate = primitiveConfig('ConfigBoolean', 'boolean', 'boolean')
export const ConfigSecretTemplate = primitiveConfig('ConfigSecret', 'secret', 'unknown')

export const ConfigOptionalTemplate = defineTemplate({
	modelId: 'ConfigOptional', version: '1.0.0', description: 'Makes a Config optional when its data is missing.',
	typeParameters: typeParameters(['A', 'Configured value type.']),
	inputs: { config: configInput('Config to make optional.', '{{A}}') },
	output: expressionOutput('Optional Config.', configType('{ readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: {{A}} }')),
	source: `Config.option(${marker('expression', 'config', 'Config.string()')})`
})

export const ConfigNestedTemplate = defineTemplate({
	modelId: 'ConfigNested', version: '1.0.0', description: 'Nests a Config below a path segment.',
	typeParameters: typeParameters(['A', 'Configured value type.']),
	inputs: { config: configInput('Config to nest.', '{{A}}'), name: effectValueInput('Path segment.', { ts: 'string' }) },
	output: expressionOutput('Nested Config.', configType('{{A}}')),
	source: `Config.nested(${marker('expression', 'config', 'Config.string()')}, ${marker('expression', 'name', '"APP"')})`
})

export const ConfigAllTemplate = defineTemplate({
	modelId: 'ConfigAll', version: '1.0.0', description: 'Combines a record or iterable of Config values.',
	typeParameters: typeParameters(['A', 'Combined configuration value type.']),
	inputs: { configs: valueInput('Record or iterable containing Config values.') },
	output: expressionOutput('Combined Config.', configType('{{A}}')),
	source: `Config.all(${marker('expression', 'configs', '{}')})`
})

export const EffectConfigTemplate = defineTemplate({
	modelId: 'EffectConfig', version: '1.0.0', description: 'Treats a Config description as a first-class Effect.',
	typeParameters: typeParameters(['A', 'Configured value type.']),
	inputs: { config: configInput('Config to evaluate.', '{{A}}') },
	output: expressionOutput('Configuration loading Effect.', effectType('{{A}}', 'unknown', 'never')),
	source: `Effect.suspend(() => ${marker('expression', 'config', 'Config.string()')})`
})

export const effectConfigGraphTemplateInputs = [
	ConfigStringTemplate, ConfigNumberTemplate, ConfigBooleanTemplate, ConfigSecretTemplate,
	ConfigOptionalTemplate, ConfigNestedTemplate, ConfigAllTemplate, EffectConfigTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]

