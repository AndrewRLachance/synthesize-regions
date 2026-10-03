import { defineTemplate } from '../../../authoring/define-template.js'
import { effectType, effectValueInput } from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	configType,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	schemaType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import {
	configProviderType,
	durationType,
	optionType,
	redactedType,
	urlType
} from '../data/effect-data-type-template-helpers.js'

const configInput = (description: string, value = 'unknown') =>
	typedExpressionInput(description, configType(value))
const providerInput = (description: string) =>
	typedExpressionInput(description, configProviderType())
const optionalName = (description: string) =>
	effectValueInput(description, { ts: 'string | undefined' })

/** `effect/LogLevel`'s `LogLevel` is a string literal union, not a global. */
const logLevelType = '"All" | "Fatal" | "Error" | "Warn" | "Info" | "Debug" | "Trace" | "None"'

/**
 * Effect v4 spells the `Config` constructors in PascalCase (`Config.String`), and
 * `Config.mapOrFail` became `Config.mapEffect`.
 */
const primitiveConfig = (
	modelId: string,
	method: 'String' | 'NonEmptyString' | 'Finite' | 'Int' | 'Port' | 'Boolean' | 'Duration' | 'Date' | 'URL' | 'LogLevel' | 'Redacted',
	valueType: string
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description: `Creates a Config using Config.${method}.`,
	inputs: { name: optionalName('Optional configuration key name.') },
	output: expressionOutput(`Config.${method} value.`, configType(valueType)),
	source: `Config.${method}(${marker('expression', 'name', 'undefined')})`
})

export const ConfigStringTemplate = primitiveConfig('ConfigString', 'String', 'string')
export const ConfigNonEmptyStringTemplate = primitiveConfig('ConfigNonEmptyString', 'NonEmptyString', 'string')
export const ConfigFiniteTemplate = primitiveConfig('ConfigFinite', 'Finite', 'number')
export const ConfigIntTemplate = primitiveConfig('ConfigInt', 'Int', 'number')
export const ConfigPortTemplate = primitiveConfig('ConfigPort', 'Port', 'number')
export const ConfigBooleanTemplate = primitiveConfig('ConfigBoolean', 'Boolean', 'boolean')
export const ConfigDurationTemplate = primitiveConfig('ConfigDuration', 'Duration', durationType().ts)
export const ConfigDateTemplate = primitiveConfig('ConfigDate', 'Date', 'Date')
export const ConfigUrlTemplate = primitiveConfig('ConfigUrl', 'URL', urlType)
export const ConfigLogLevelTemplate = primitiveConfig('ConfigLogLevel', 'LogLevel', logLevelType)
export const ConfigRedactedTemplate = primitiveConfig('ConfigRedacted', 'Redacted', redactedType('string').ts)

export const ConfigLiteralTemplate = defineTemplate({
	modelId: 'ConfigLiteral', version: '1.0.0', description: 'Creates a Config that accepts one literal value.',
	typeParameters: typeParameters(['A', 'Literal value type.']),
	inputs: { value: effectValueInput('Accepted literal.', { ts: '{{A}}' }), name: optionalName('Optional configuration key name.') },
	output: expressionOutput('Literal Config.', configType('{{A}}')),
	source: `Config.Literal(${marker('expression', 'value', 'undefined')}, ${marker('expression', 'name', 'undefined')})`
})

export const ConfigLiteralsTemplate = defineTemplate({
	modelId: 'ConfigLiterals', version: '1.0.0', description: 'Creates a Config that accepts one of several literal values.',
	typeParameters: typeParameters(['A', 'Literal union type.']),
	inputs: { values: valueInput('Readonly array of accepted literals.', { ts: 'ReadonlyArray<{{A}}>' }), name: optionalName('Optional configuration key name.') },
	output: expressionOutput('Literal-union Config.', configType('{{A}}')),
	source: `Config.Literals(${marker('expression', 'values', '[]')}, ${marker('expression', 'name', 'undefined')})`
})

export const ConfigSchemaTemplate = defineTemplate({
	modelId: 'ConfigSchema', version: '1.0.0', description: 'Creates a Config by decoding provider input with a Schema.',
	typeParameters: typeParameters(['A', 'Decoded configuration type.'], ['I', 'Encoded schema type.'], ['R', 'Schema requirements.']),
	inputs: {
		schema: typedExpressionInput('Schema used to decode configuration.', schemaType('{{A}}', '{{I}}', '{{R}}')),
		name: optionalName('Optional root configuration key name.')
	},
	output: expressionOutput('Schema-backed Config.', configType('{{A}}')),
	source: `Config.schema(${marker('expression', 'schema', 'Schema.String')}, ${marker('expression', 'name', 'undefined')})`
})

export const ConfigArraySchemaTemplate = defineTemplate({
	modelId: 'ConfigArraySchema', version: '1.0.0', description: 'Builds the Config.Array schema for structural or separated array configuration input.',
	typeParameters: typeParameters(['A', 'Decoded element type.'], ['I', 'Encoded element type.'], ['R', 'Schema requirements.']),
	inputs: { item: typedExpressionInput('Array element Schema.', schemaType('{{A}}', '{{I}}', '{{R}}')) },
	output: expressionOutput('Config array Schema.', schemaType('ReadonlyArray<{{A}}>', 'unknown', '{{R}}')),
	source: `Config.Array(${marker('expression', 'item', 'Schema.String')})`
})

export const ConfigRecordSchemaTemplate = defineTemplate({
	modelId: 'ConfigRecordSchema', version: '1.0.0', description: 'Builds the Config.Record schema for structural or separated record configuration input.',
	typeParameters: typeParameters(['K', 'Decoded key type.'], ['V', 'Decoded value type.']),
	inputs: {
		key: typedExpressionInput('Record key Schema.', schemaType('{{K}}')),
		value: typedExpressionInput('Record value Schema.', schemaType('{{V}}'))
	},
	output: expressionOutput('Config record Schema.', schemaType('Readonly<Record<string, {{V}}>>')),
	source: `Config.Record(${marker('expression', 'key', 'Schema.String')}, ${marker('expression', 'value', 'Schema.String')})`
})

export const ConfigAllTemplate = defineTemplate({
	modelId: 'ConfigAll', version: '2.0.0', description: 'Combines configs into a tuple or named object while preserving the input shape.',
	typeParameters: typeParameters(['A', 'Combined configuration value type.']),
	inputs: { configs: valueInput('Tuple, iterable, or record containing Config values.') },
	output: expressionOutput('Combined Config.', configType('{{A}}')),
	source: `Config.all(${marker('expression', 'configs', '{}')})`
})

export const ConfigNestedTemplate = defineTemplate({
	modelId: 'ConfigNested', version: '2.0.0', description: 'Prefixes every lookup made by a Config with a path segment.',
	typeParameters: typeParameters(['A', 'Configured value type.']),
	inputs: { config: configInput('Config to nest.', '{{A}}'), path: effectValueInput('Path segment or path.', { ts: 'string | ReadonlyArray<string>' }) },
	output: expressionOutput('Nested Config.', configType('{{A}}')),
	source: `Config.nested(${marker('expression', 'config', 'Config.String()')}, ${marker('expression', 'path', '"APP"')})`
})

export const ConfigUnwrapTemplate = defineTemplate({
	modelId: 'ConfigUnwrap', version: '1.0.0', description: 'Converts a Config.Wrap-compatible nested configuration description into a Config.',
	typeParameters: typeParameters(['A', 'Unwrapped configuration value type.']),
	inputs: { wrapped: valueInput('Config or nested record of Config values.') },
	output: expressionOutput('Unwrapped Config.', configType('{{A}}')),
	source: `Config.unwrap(${marker('expression', 'wrapped', '(undefined as never)')})`
})

export const ConfigWithDefaultTemplate = defineTemplate({
	modelId: 'ConfigWithDefault', version: '1.0.0', description: 'Supplies a default value only when the relevant configuration input is missing.',
	typeParameters: typeParameters(['A', 'Configured value type.']),
	inputs: { config: configInput('Source Config.', '{{A}}'), fallback: effectValueInput('Default value.', { ts: '{{A}}' }) },
	output: expressionOutput('Config with missing-value default.', configType('{{A}}')),
	source: `Config.withDefault(${marker('expression', 'config', 'Config.String()')}, ${marker('expression', 'fallback', 'undefined')})`
})

export const ConfigOptionTemplate = defineTemplate({
	modelId: 'ConfigOption', version: '2.0.0', description: 'Returns None when configuration input is absent and Some when present.',
	typeParameters: typeParameters(['A', 'Configured value type.']),
	inputs: { config: configInput('Config to make optional.', '{{A}}') },
	output: expressionOutput('Optional Config.', configType(optionType('{{A}}').ts)),
	source: `Config.option(${marker('expression', 'config', 'Config.String()')})`
})

export const ConfigOrElseTemplate = defineTemplate({
	modelId: 'ConfigOrElse', version: '1.0.0', description: 'Falls back to another Config after any ConfigError, including invalid input.',
	typeParameters: typeParameters(['A', 'Source value type.'], ['B', 'Fallback value type.']),
	inputs: { config: configInput('Primary Config.', '{{A}}'), fallback: callbackInput('Lazy fallback Config.') },
	output: expressionOutput('Fallback Config.', configType('{{A}} | {{B}}')),
	source: `Config.orElse(${marker('expression', 'config', 'Config.String()')}, ${marker('expression', 'fallback', '() => Config.String()')})`
})

export const ConfigMapTemplate = defineTemplate({
	modelId: 'ConfigMap', version: '1.0.0', description: 'Transforms a successfully decoded Config value with a pure function.',
	typeParameters: typeParameters(['A', 'Input value type.'], ['B', 'Mapped value type.']),
	inputs: { config: configInput('Source Config.', '{{A}}'), transform: callbackInput('Pure value transform.', { ts: '(value: {{A}}) => {{B}}' }) },
	output: expressionOutput('Mapped Config.', configType('{{B}}')),
	source: `Config.map(${marker('expression', 'config', 'Config.String()')}, ${marker('expression', 'transform', 'value => value')})`
})

export const ConfigMapOrFailTemplate = defineTemplate({
	modelId: 'ConfigMapOrFail', version: '1.0.0', description: 'Transforms a Config value with a function that may fail with ConfigError; prefer Config.schema for validation when possible.',
	typeParameters: typeParameters(['A', 'Input value type.'], ['B', 'Mapped value type.']),
	inputs: { config: configInput('Source Config.', '{{A}}'), transform: callbackInput('Effectful transform.', effectReturningCallbackType('value: {{A}}', '{{B}}', 'unknown', 'never')) },
	output: expressionOutput('Effectfully mapped Config.', configType('{{B}}')),
	source: `Config.mapEffect(${marker('expression', 'config', 'Config.String()')}, ${marker('expression', 'transform', 'value => Effect.succeed(value)')})`
})

export const ConfigParseTemplate = defineTemplate({
	modelId: 'ConfigParse', version: '1.0.0', description: 'Parses one Config with an explicit ConfigProvider.',
	typeParameters: typeParameters(['A', 'Configured value type.']),
	inputs: { config: configInput('Config to parse.', '{{A}}'), provider: providerInput('ConfigProvider supplying raw values.') },
	output: expressionOutput('Configuration parsing Effect.', effectType('{{A}}', 'unknown', 'never')),
	source: `${marker('expression', 'config', 'Config.String()')}.parse(${marker('expression', 'provider', 'ConfigProvider.fromUnknown({})')})`
})

export const ConfigAsEffectTemplate = defineTemplate({
	modelId: 'ConfigAsEffect', version: '1.0.0', description: 'Treats a Config as the Effect it already is, using the ConfigProvider in the Effect context.',
	typeParameters: typeParameters(['A', 'Configured value type.']),
	inputs: { config: configInput('Config used as an Effect.', '{{A}}') },
	output: expressionOutput('Configuration loading Effect.', effectType('{{A}}', 'unknown', 'never')),
	source: `${marker('expression', 'config', 'Config.String()')}`
})

export const ConfigProviderFromEnvTemplate = defineTemplate({
	modelId: 'ConfigProviderFromEnv', version: '1.0.0', description: 'Creates a ConfigProvider backed by environment variables.',
	inputs: { options: valueInput('fromEnv options, such as an explicit env object or preserveEmptyStrings flag.') },
	output: expressionOutput('Environment ConfigProvider.', configProviderType()),
	source: `ConfigProvider.fromEnv(${marker('expression', 'options', '{}')})`
})

export const ConfigProviderFromUnknownTemplate = defineTemplate({
	modelId: 'ConfigProviderFromUnknown', version: '1.0.0', description: 'Creates a ConfigProvider from an in-memory JavaScript value.',
	inputs: { value: valueInput('In-memory configuration object or value.') },
	output: expressionOutput('In-memory ConfigProvider.', configProviderType()),
	source: `ConfigProvider.fromUnknown(${marker('expression', 'value', '{}')})`
})

export const ConfigProviderFromDotEnvContentsTemplate = defineTemplate({
	modelId: 'ConfigProviderFromDotEnvContents', version: '1.0.0', description: 'Creates a ConfigProvider by parsing already-loaded .env file contents.',
	inputs: { contents: effectValueInput('.env file contents.', { ts: 'string' }) },
	output: expressionOutput('Parsed .env ConfigProvider.', configProviderType()),
	source: `ConfigProvider.fromDotEnvContents(${marker('expression', 'contents', '""')})`
})

export const ConfigProviderFromDotEnvTemplate = defineTemplate({
	modelId: 'ConfigProviderFromDotEnv', version: '1.0.0', description: 'Loads a .env file through the FileSystem service and produces a ConfigProvider.',
	inputs: {},
	output: expressionOutput('Effect that loads the default .env ConfigProvider.', effectType(configProviderType().ts, 'unknown', 'unknown')),
	source: 'ConfigProvider.fromDotEnv()'
})

export const ConfigProviderFromDirTemplate = defineTemplate({
	modelId: 'ConfigProviderFromDir', version: '1.0.0', description: 'Loads a directory tree through FileSystem and Path services as a ConfigProvider.',
	inputs: {},
	output: expressionOutput('Effect that loads a directory-tree ConfigProvider using the documented default call.', effectType(configProviderType().ts, 'unknown', 'unknown')),
	source: 'ConfigProvider.fromDir()'
})

export const ConfigProviderNestedTemplate = defineTemplate({
	modelId: 'ConfigProviderNested', version: '1.0.0', description: 'Prefixes every lookup performed by a ConfigProvider.',
	inputs: { provider: providerInput('Source ConfigProvider.'), path: effectValueInput('Prefix path segment.', { ts: 'string' }) },
	output: expressionOutput('Nested ConfigProvider.', configProviderType()),
	source: `ConfigProvider.nested(${marker('expression', 'provider', 'ConfigProvider.fromUnknown({})')}, ${marker('expression', 'path', '"APP"')})`
})

export const ConfigProviderConstantCaseTemplate = defineTemplate({
	modelId: 'ConfigProviderConstantCase', version: '1.0.0', description: 'Transforms ConfigProvider path segments to CONSTANT_CASE.',
	inputs: { provider: providerInput('Source ConfigProvider.') },
	output: expressionOutput('CONSTANT_CASE ConfigProvider.', configProviderType()),
	source: `ConfigProvider.constantCase(${marker('expression', 'provider', 'ConfigProvider.fromUnknown({})')})`
})

export const ConfigProviderMapInputTemplate = defineTemplate({
	modelId: 'ConfigProviderMapInput', version: '1.0.0', description: 'Transforms ConfigProvider lookup paths with a custom function.',
	inputs: { provider: providerInput('Source ConfigProvider.'), transform: callbackInput('Path transform callback.') },
	output: expressionOutput('Path-transformed ConfigProvider.', configProviderType()),
	source: `ConfigProvider.mapInput(${marker('expression', 'provider', 'ConfigProvider.fromUnknown({})')}, ${marker('expression', 'transform', 'path => path')})`
})

export const ConfigProviderOrElseTemplate = defineTemplate({
	modelId: 'ConfigProviderOrElse', version: '1.0.0', description: 'Uses a fallback provider only when the primary provider has no value at a requested path.',
	inputs: { primary: providerInput('Primary ConfigProvider.'), fallback: providerInput('Fallback ConfigProvider.') },
	output: expressionOutput('Combined ConfigProvider.', configProviderType()),
	source: `ConfigProvider.orElse(${marker('expression', 'primary', 'ConfigProvider.fromUnknown({})')}, ${marker('expression', 'fallback', 'ConfigProvider.fromUnknown({})')})`
})

export const ConfigProviderLayerTemplate = defineTemplate({
	modelId: 'ConfigProviderLayer', version: '1.0.0', description: 'Creates a Layer that replaces the ConfigProvider used by yielded Config values.',
	inputs: { provider: providerInput('ConfigProvider to install.') },
	output: expressionOutput('ConfigProvider Layer.', layerType('unknown', 'never', 'never')),
	source: `ConfigProvider.layer(${marker('expression', 'provider', 'ConfigProvider.fromUnknown({})')})`
})

export const ConfigProviderLayerAddTemplate = defineTemplate({
	modelId: 'ConfigProviderLayerAdd', version: '1.0.0', description: 'Creates a Layer that adds a fallback ConfigProvider to the current provider.',
	inputs: { provider: providerInput('ConfigProvider to add.') },
	output: expressionOutput('Additive ConfigProvider Layer.', layerType('unknown', 'never', 'never')),
	source: `ConfigProvider.layerAdd(${marker('expression', 'provider', 'ConfigProvider.fromUnknown({})')})`
})

export const ConfigProviderLayerAddPrimaryTemplate = defineTemplate({
	modelId: 'ConfigProviderLayerAddPrimary', version: '1.0.0', description: 'Creates a Layer that adds a ConfigProvider with precedence over the current provider.',
	inputs: { provider: providerInput('Primary ConfigProvider to add.') },
	output: expressionOutput('Primary additive ConfigProvider Layer.', layerType('unknown', 'never', 'never')),
	source: `ConfigProvider.layerAdd(${marker('expression', 'provider', 'ConfigProvider.fromUnknown({})')}, { asPrimary: true })`
})

export const effectConfigV4GraphTemplateInputs = [
	ConfigStringTemplate,
	ConfigNonEmptyStringTemplate,
	ConfigFiniteTemplate,
	ConfigIntTemplate,
	ConfigPortTemplate,
	ConfigBooleanTemplate,
	ConfigLiteralTemplate,
	ConfigLiteralsTemplate,
	ConfigDurationTemplate,
	ConfigDateTemplate,
	ConfigUrlTemplate,
	ConfigLogLevelTemplate,
	ConfigRedactedTemplate,
	ConfigSchemaTemplate,
	ConfigArraySchemaTemplate,
	ConfigRecordSchemaTemplate,
	ConfigAllTemplate,
	ConfigNestedTemplate,
	ConfigUnwrapTemplate,
	ConfigWithDefaultTemplate,
	ConfigOptionTemplate,
	ConfigOrElseTemplate,
	ConfigMapTemplate,
	ConfigMapOrFailTemplate,
	ConfigParseTemplate,
	ConfigAsEffectTemplate,
	ConfigProviderFromEnvTemplate,
	ConfigProviderFromUnknownTemplate,
	ConfigProviderFromDotEnvContentsTemplate,
	ConfigProviderFromDotEnvTemplate,
	ConfigProviderFromDirTemplate,
	ConfigProviderNestedTemplate,
	ConfigProviderConstantCaseTemplate,
	ConfigProviderMapInputTemplate,
	ConfigProviderOrElseTemplate,
	ConfigProviderLayerTemplate,
	ConfigProviderLayerAddTemplate,
	ConfigProviderLayerAddPrimaryTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
