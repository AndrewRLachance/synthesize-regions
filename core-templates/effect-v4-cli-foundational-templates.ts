import { fragmentCollectionPort } from '../src/templates.js'
import { defineTemplate } from './sample-definition.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	configType,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	schemaType,
	stringInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	cliArgumentType,
	cliCommandType,
	cliEnvironmentRequirement,
	cliErrorType,
	cliFlagType,
	cliFormatterType,
	cliGlobalFlagType,
	cliPromptType,
	promptEnvironmentRequirement,
	terminalQuitErrorType
} from './effect-cli-template-helpers.js'
import { redactedType } from './effect-data-type-template-helpers.js'

const VERSION = '1.0.0' as const
const optionType = (value: string) => ({ ts: `{ readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: ${value} }` })
/**
 * Structural stand-in for `Redacted.Redacted<string>`.
 *
 * Type descriptors are compiled standalone against the ES2022 library, so a
 * namespace-qualified reference cannot resolve. Reuse the shared structural
 * descriptor instead.
 */
const redactedStringType = redactedType('string')
const argumentInput = (description: string, value = 'unknown') => typedExpressionInput(description, cliArgumentType(value))
const flagInput = (description: string, value = 'unknown') => typedExpressionInput(description, cliFlagType(value))
const promptInput = (description: string, value = 'unknown') => typedExpressionInput(description, cliPromptType(value))
const commandInput = (description: string, name = 'string', input = 'unknown', context = 'unknown', error = 'never', requirements = 'never') =>
	typedExpressionInput(description, cliCommandType(name, input, context, error, requirements))

const simpleArgument = (modelId: string, member: string, value: string, description: string) => defineTemplate({
	modelId,
	version: VERSION,
	description,
	inputs: { name: stringInput('Argument name.') },
	output: expressionOutput(description, cliArgumentType(value)),
	source: `Argument.${member}(${marker('string', 'name', '"value"')})`
})

export const CliArgumentStringTemplate = simpleArgument('CliArgumentString', 'String', 'string', 'Creates a positional string argument.')
export const CliArgumentIntTemplate = simpleArgument('CliArgumentInt', 'Int', 'number', 'Creates a positional integer argument.')
export const CliArgumentFiniteTemplate = simpleArgument('CliArgumentFinite', 'Finite', 'number', 'Creates a positional finite-number argument.')
export const CliArgumentDateTemplate = simpleArgument('CliArgumentDate', 'Date', 'Date', 'Creates a positional Date argument.')
export const CliArgumentRedactedTemplate = simpleArgument('CliArgumentRedacted', 'Redacted', redactedStringType.ts, 'Creates a positional redacted string argument.')

export const CliArgumentFileTemplate = defineTemplate({
	modelId: 'CliArgumentFile', version: VERSION, description: 'Creates a positional file path argument with optional existence validation.',
	inputs: { name: stringInput('Argument name.'), options: effectValueInput('File argument options.', { ts: '{ readonly mustExist?: boolean }' }) },
	output: expressionOutput('File path argument.', cliArgumentType('string')),
	source: `Argument.File(${marker('string', 'name', '"file"')}, ${marker('expression', 'options', '{}')})`
})
export const CliArgumentDirectoryTemplate = defineTemplate({
	modelId: 'CliArgumentDirectory', version: VERSION, description: 'Creates a positional directory path argument with optional existence validation.',
	inputs: { name: stringInput('Argument name.'), options: effectValueInput('Directory argument options.', { ts: '{ readonly mustExist?: boolean }' }) },
	output: expressionOutput('Directory path argument.', cliArgumentType('string')),
	source: `Argument.Directory(${marker('string', 'name', '"directory"')}, ${marker('expression', 'options', '{}')})`
})
export const CliArgumentPathTemplate = defineTemplate({
	modelId: 'CliArgumentPath', version: VERSION, description: 'Creates a positional path argument.',
	inputs: { name: stringInput('Argument name.') },
	output: expressionOutput('Path argument.', cliArgumentType('string')),
	source: `Argument.Path(${marker('string', 'name', '"path"')})`
})
export const CliArgumentLiteralsTemplate = defineTemplate({
	modelId: 'CliArgumentLiterals', version: VERSION, description: 'Creates a positional argument constrained to literal string choices.',
	typeParameters: typeParameters(['A', 'Literal string union.']),
	inputs: { name: stringInput('Argument name.'), choices: effectValueInput('Allowed string literals.', { ts: 'readonly string[]' }) },
	output: expressionOutput('Literal-choice argument.', cliArgumentType('{{A}}')),
	source: `Argument.Literals(${marker('string', 'name', '"mode"')}, ${marker('expression', 'choices', '["default"] as const')})`
})
export const CliArgumentChoiceWithValueTemplate = defineTemplate({
	modelId: 'CliArgumentChoiceWithValue', version: VERSION, description: 'Creates a positional choice whose textual choices map to typed values.',
	typeParameters: typeParameters(['A', 'Mapped choice value type.']),
	inputs: { name: stringInput('Argument name.'), choices: effectValueInput('Readonly tuples mapping text choices to typed values.', { ts: 'readonly (readonly [string, {{A}}])[]' }) },
	output: expressionOutput('Mapped-choice argument.', cliArgumentType('{{A}}')),
	source: `Argument.ChoiceWithValue(${marker('string', 'name', '"mode"')}, ${marker('expression', 'choices', '[["default", "default"]] as const')})`
})
export const CliArgumentOptionalTemplate = defineTemplate({
	modelId: 'CliArgumentOptional', version: VERSION, description: 'Makes a positional argument optional.',
	typeParameters: typeParameters(['A', 'Argument value type.']), inputs: { argument: argumentInput('Required argument.', '{{A}}') },
	output: expressionOutput('Optional positional argument.', cliArgumentType(optionType('{{A}}').ts)),
	source: `Argument.optional(${marker('expression', 'argument', 'Argument.String("value")')})`
})
export const CliArgumentVariadicTemplate = defineTemplate({
	modelId: 'CliArgumentVariadic', version: VERSION, description: 'Makes a positional argument variadic with optional min/max bounds.',
	typeParameters: typeParameters(['A', 'Argument element type.']), inputs: { argument: argumentInput('Argument to repeat.', '{{A}}'), options: effectValueInput('Variadic bounds.', { ts: '{ readonly min?: number; readonly max?: number }' }) },
	output: expressionOutput('Variadic positional argument.', cliArgumentType('readonly {{A}}[]')),
	source: `Argument.variadic(${marker('expression', 'argument', 'Argument.String("value")')}, ${marker('expression', 'options', '{}')})`
})
export const CliArgumentWithDefaultTemplate = defineTemplate({
	modelId: 'CliArgumentWithDefault', version: VERSION, description: 'Provides a default value when a positional argument is omitted.',
	typeParameters: typeParameters(['A', 'Argument value type.']), inputs: { argument: argumentInput('Argument.', '{{A}}'), defaultValue: effectValueInput('Default argument value.', { ts: '{{A}}' }) },
	output: expressionOutput('Argument with default.', cliArgumentType('{{A}}')),
	source: `Argument.withDefault(${marker('expression', 'argument', 'Argument.String("value")')}, ${marker('expression', 'defaultValue', '"default"')})`
})
export const CliArgumentWithDescriptionTemplate = defineTemplate({
	modelId: 'CliArgumentWithDescription', version: VERSION, description: 'Adds help documentation to a positional argument.',
	typeParameters: typeParameters(['A', 'Argument value type.']), inputs: { argument: argumentInput('Argument.', '{{A}}'), description: stringInput('Help description.') },
	output: expressionOutput('Described argument.', cliArgumentType('{{A}}')),
	source: `Argument.withDescription(${marker('expression', 'argument', 'Argument.String("value")')}, ${marker('string', 'description', '"Value"')})`
})
export const CliArgumentWithMetavarTemplate = defineTemplate({
	modelId: 'CliArgumentWithMetavar', version: VERSION, description: 'Sets the metavar displayed for a positional argument in help output.',
	typeParameters: typeParameters(['A', 'Argument value type.']), inputs: { argument: argumentInput('Argument.', '{{A}}'), metavar: stringInput('Metavar text.') },
	output: expressionOutput('Argument with metavar.', cliArgumentType('{{A}}')),
	source: `Argument.withMetavar(${marker('expression', 'argument', 'Argument.String("value")')}, ${marker('string', 'metavar', '"VALUE"')})`
})
export const CliArgumentWithFallbackConfigTemplate = defineTemplate({
	modelId: 'CliArgumentWithFallbackConfig', version: VERSION, description: 'Falls back to an Effect Config when a required positional argument is missing.',
	typeParameters: typeParameters(['A', 'Argument value type.']), inputs: { argument: argumentInput('Argument.', '{{A}}'), config: typedExpressionInput('Fallback Config.', configType('{{A}}')) },
	output: expressionOutput('Config-backed argument.', cliArgumentType('{{A}}')),
	source: `Argument.withFallbackConfig(${marker('expression', 'argument', 'Argument.String("value")')}, ${marker('expression', 'config', 'Config.String("VALUE")')})`
})
export const CliArgumentWithFallbackPromptTemplate = defineTemplate({
	modelId: 'CliArgumentWithFallbackPrompt', version: VERSION, description: 'Prompts interactively when a required positional argument is missing.',
	typeParameters: typeParameters(['A', 'Argument value type.']), inputs: { argument: argumentInput('Argument.', '{{A}}'), prompt: promptInput('Fallback prompt.', '{{A}}') },
	output: expressionOutput('Prompt-backed argument.', cliArgumentType('{{A}}')),
	source: `Argument.withFallbackPrompt(${marker('expression', 'argument', 'Argument.String("value")')}, ${marker('expression', 'prompt', 'Prompt.String({ message: "Value" })')})`
})
export const CliArgumentWithSchemaTemplate = defineTemplate({
	modelId: 'CliArgumentWithSchema', version: VERSION, description: 'Validates and transforms a parsed positional argument with Schema.',
	typeParameters: typeParameters(['A', 'Original argument value type.'], ['B', 'Validated output type.']),
	inputs: { argument: argumentInput('Argument.', '{{A}}'), schema: typedExpressionInput('Constraint Schema from A to B.', schemaType('{{B}}', '{{A}}', cliEnvironmentRequirement, 'unknown')) },
	output: expressionOutput('Schema-validated argument.', cliArgumentType('{{B}}')),
	source: `Argument.withSchema(${marker('expression', 'argument', 'Argument.String("value")')}, ${marker('expression', 'schema', 'Schema.String')})`
})

const simpleFlag = (modelId: string, member: string, value: string, description: string) => defineTemplate({
	modelId, version: VERSION, description, inputs: { name: stringInput('Flag name.') }, output: expressionOutput(description, cliFlagType(value)), source: `Flag.${member}(${marker('string', 'name', '"value"')})`
})
export const CliFlagBooleanTemplate = simpleFlag('CliFlagBoolean', 'Boolean', 'boolean', 'Creates a boolean CLI flag.')
export const CliFlagStringTemplate = simpleFlag('CliFlagString', 'String', 'string', 'Creates a string CLI flag.')
export const CliFlagIntTemplate = simpleFlag('CliFlagInt', 'Int', 'number', 'Creates an integer CLI flag.')
export const CliFlagFiniteTemplate = simpleFlag('CliFlagFinite', 'Finite', 'number', 'Creates a finite-number CLI flag.')
export const CliFlagRedactedTemplate = simpleFlag('CliFlagRedacted', 'Redacted', redactedStringType.ts, 'Creates a redacted string CLI flag.')
export const CliFlagFileTemplate = defineTemplate({
	modelId: 'CliFlagFile', version: VERSION, description: 'Creates a file path flag with optional existence validation.',
	inputs: { name: stringInput('Flag name.'), options: effectValueInput('File flag options.', { ts: '{ readonly mustExist?: boolean }' }) }, output: expressionOutput('File flag.', cliFlagType('string')),
	source: `Flag.File(${marker('string', 'name', '"file"')}, ${marker('expression', 'options', '{}')})`
})
export const CliFlagDirectoryTemplate = defineTemplate({
	modelId: 'CliFlagDirectory', version: VERSION, description: 'Creates a directory path flag with optional existence validation.',
	inputs: { name: stringInput('Flag name.'), options: effectValueInput('Directory flag options.', { ts: '{ readonly mustExist?: boolean }' }) }, output: expressionOutput('Directory flag.', cliFlagType('string')),
	source: `Flag.Directory(${marker('string', 'name', '"directory"')}, ${marker('expression', 'options', '{}')})`
})
export const CliFlagPathTemplate = defineTemplate({
	modelId: 'CliFlagPath', version: VERSION, description: 'Creates a path flag with path kind and existence options.',
	inputs: { name: stringInput('Flag name.'), options: effectValueInput('Path options.', { ts: '{ readonly mustExist?: boolean; readonly pathType?: "either" | "file" | "directory"; readonly typeName?: string }' }) }, output: expressionOutput('Path flag.', cliFlagType('string')),
	source: `Flag.Path(${marker('string', 'name', '"path"')}, ${marker('expression', 'options', '{}')})`
})
export const CliFlagLiteralsTemplate = defineTemplate({
	modelId: 'CliFlagLiterals', version: VERSION, description: 'Creates a flag constrained to literal string values.', typeParameters: typeParameters(['A', 'Literal string union.']),
	inputs: { name: stringInput('Flag name.'), choices: effectValueInput('Allowed string literals.', { ts: 'readonly string[]' }) }, output: expressionOutput('Literal flag.', cliFlagType('{{A}}')),
	source: `Flag.Literals(${marker('string', 'name', '"mode"')}, ${marker('expression', 'choices', '["default"] as const')})`
})
export const CliFlagChoiceWithValueTemplate = defineTemplate({
	modelId: 'CliFlagChoiceWithValue', version: VERSION, description: 'Creates a flag whose text choices map to typed values.', typeParameters: typeParameters(['A', 'Mapped flag value type.']),
	inputs: { name: stringInput('Flag name.'), choices: effectValueInput('Readonly tuples mapping strings to values.', { ts: 'readonly (readonly [string, {{A}}])[]' }) }, output: expressionOutput('Mapped-choice flag.', cliFlagType('{{A}}')),
	source: `Flag.ChoiceWithValue(${marker('string', 'name', '"mode"')}, ${marker('expression', 'choices', '[["default", "default"]] as const')})`
})
export const CliFlagOptionalTemplate = defineTemplate({
	modelId: 'CliFlagOptional', version: VERSION, description: 'Makes a CLI flag optional.', typeParameters: typeParameters(['A', 'Flag value type.']), inputs: { flag: flagInput('Required flag.', '{{A}}') }, output: expressionOutput('Optional flag.', cliFlagType(optionType('{{A}}').ts)), source: `Flag.optional(${marker('expression', 'flag', 'Flag.String("value")')})`
})
export const CliFlagWithAliasTemplate = defineTemplate({
	modelId: 'CliFlagWithAlias', version: VERSION, description: 'Adds an alternate name for a CLI flag.', typeParameters: typeParameters(['A', 'Flag value type.']), inputs: { flag: flagInput('Flag.', '{{A}}'), alias: stringInput('Alias, such as a short single-letter form.') }, output: expressionOutput('Aliased flag.', cliFlagType('{{A}}')), source: `Flag.withAlias(${marker('expression', 'flag', 'Flag.String("value")')}, ${marker('string', 'alias', '"v"')})`
})
export const CliFlagWithDefaultTemplate = defineTemplate({
	modelId: 'CliFlagWithDefault', version: VERSION, description: 'Provides a default value when a flag is omitted.', typeParameters: typeParameters(['A', 'Flag value type.']), inputs: { flag: flagInput('Flag.', '{{A}}'), defaultValue: effectValueInput('Default value.', { ts: '{{A}}' }) }, output: expressionOutput('Flag with default.', cliFlagType('{{A}}')), source: `Flag.withDefault(${marker('expression', 'flag', 'Flag.String("value")')}, ${marker('expression', 'defaultValue', '"default"')})`
})
export const CliFlagWithDescriptionTemplate = defineTemplate({
	modelId: 'CliFlagWithDescription', version: VERSION, description: 'Adds help documentation to a CLI flag.', typeParameters: typeParameters(['A', 'Flag value type.']), inputs: { flag: flagInput('Flag.', '{{A}}'), description: stringInput('Help description.') }, output: expressionOutput('Described flag.', cliFlagType('{{A}}')), source: `Flag.withDescription(${marker('expression', 'flag', 'Flag.String("value")')}, ${marker('string', 'description', '"Value"')})`
})
export const CliFlagWithHiddenTemplate = defineTemplate({
	modelId: 'CliFlagWithHidden', version: VERSION, description: 'Hides a flag from help and shell completions while keeping it parseable.', typeParameters: typeParameters(['A', 'Flag value type.']), inputs: { flag: flagInput('Flag to hide.', '{{A}}') }, output: expressionOutput('Hidden flag.', cliFlagType('{{A}}')), source: `Flag.withHidden(${marker('expression', 'flag', 'Flag.Boolean("experimental")')})`
})
export const CliFlagWithMetavarTemplate = defineTemplate({
	modelId: 'CliFlagWithMetavar', version: VERSION, description: 'Sets the value placeholder displayed for a CLI flag.', typeParameters: typeParameters(['A', 'Flag value type.']), inputs: { flag: flagInput('Flag.', '{{A}}'), metavar: stringInput('Metavar text.') }, output: expressionOutput('Flag with metavar.', cliFlagType('{{A}}')), source: `Flag.withMetavar(${marker('expression', 'flag', 'Flag.String("value")')}, ${marker('string', 'metavar', '"VALUE"')})`
})
export const CliFlagAtLeastTemplate = defineTemplate({
	modelId: 'CliFlagAtLeast', version: VERSION, description: 'Requires a flag to appear at least a minimum number of times.', typeParameters: typeParameters(['A', 'Flag element type.']), inputs: { flag: flagInput('Repeatable flag.', '{{A}}'), min: effectValueInput('Minimum occurrences.', { ts: 'number' }) }, output: expressionOutput('Repeated flag.', cliFlagType('readonly {{A}}[]')), source: `Flag.atLeast(${marker('expression', 'flag', 'Flag.String("tag")')}, ${marker('expression', 'min', '1')})`
})
export const CliFlagAtMostTemplate = defineTemplate({
	modelId: 'CliFlagAtMost', version: VERSION, description: 'Limits a flag to at most a maximum number of occurrences.', typeParameters: typeParameters(['A', 'Flag element type.']), inputs: { flag: flagInput('Repeatable flag.', '{{A}}'), max: effectValueInput('Maximum occurrences.', { ts: 'number' }) }, output: expressionOutput('Bounded repeated flag.', cliFlagType('readonly {{A}}[]')), source: `Flag.atMost(${marker('expression', 'flag', 'Flag.String("tag")')}, ${marker('expression', 'max', '1')})`
})
export const CliFlagBetweenTemplate = defineTemplate({
	modelId: 'CliFlagBetween', version: VERSION, description: 'Requires a flag to appear within a minimum/maximum occurrence range.', typeParameters: typeParameters(['A', 'Flag element type.']), inputs: { flag: flagInput('Repeatable flag.', '{{A}}'), min: effectValueInput('Minimum occurrences.', { ts: 'number' }), max: effectValueInput('Maximum occurrences.', { ts: 'number' }) }, output: expressionOutput('Bounded repeated flag.', cliFlagType('readonly {{A}}[]')), source: `Flag.between(${marker('expression', 'flag', 'Flag.String("tag")')}, ${marker('expression', 'min', '1')}, ${marker('expression', 'max', '3')})`
})
export const CliFlagWithFallbackConfigTemplate = defineTemplate({
	modelId: 'CliFlagWithFallbackConfig', version: VERSION, description: 'Falls back to Config when a required CLI flag is absent.', typeParameters: typeParameters(['A', 'Flag value type.']), inputs: { flag: flagInput('Flag.', '{{A}}'), config: typedExpressionInput('Fallback Config.', configType('{{A}}')) }, output: expressionOutput('Config-backed flag.', cliFlagType('{{A}}')), source: `Flag.withFallbackConfig(${marker('expression', 'flag', 'Flag.String("value")')}, ${marker('expression', 'config', 'Config.String("VALUE")')})`
})
export const CliFlagWithFallbackPromptTemplate = defineTemplate({
	modelId: 'CliFlagWithFallbackPrompt', version: VERSION, description: 'Prompts interactively when a required CLI flag is absent.', typeParameters: typeParameters(['A', 'Flag value type.']), inputs: { flag: flagInput('Flag.', '{{A}}'), prompt: promptInput('Fallback prompt.', '{{A}}') }, output: expressionOutput('Prompt-backed flag.', cliFlagType('{{A}}')), source: `Flag.withFallbackPrompt(${marker('expression', 'flag', 'Flag.String("value")')}, ${marker('expression', 'prompt', 'Prompt.String({ message: "Value" })')})`
})
export const CliFlagWithSchemaTemplate = defineTemplate({
	modelId: 'CliFlagWithSchema', version: VERSION, description: 'Validates and transforms a parsed CLI flag using Schema.', typeParameters: typeParameters(['A', 'Original flag value type.'], ['B', 'Validated output type.']), inputs: { flag: flagInput('Flag.', '{{A}}'), schema: typedExpressionInput('Constraint Schema from A to B.', schemaType('{{B}}', '{{A}}', cliEnvironmentRequirement, 'unknown')) }, output: expressionOutput('Schema-validated flag.', cliFlagType('{{B}}')), source: `Flag.withSchema(${marker('expression', 'flag', 'Flag.String("value")')}, ${marker('expression', 'schema', 'Schema.String')})`
})

const promptCtor = (modelId: string, member: string, value: string, fallback: string, description: string) => defineTemplate({
	modelId, version: VERSION, description, inputs: { options: valueInput('Prompt options.') }, output: expressionOutput(description, cliPromptType(value)), source: `Prompt.${member}(${marker('expression', 'options', fallback)})`
})
export const CliPromptStringTemplate = promptCtor('CliPromptString', 'String', 'string', '{ message: "Value" }', 'Creates an interactive text prompt.')
export const CliPromptPasswordTemplate = promptCtor('CliPromptPassword', 'Password', redactedStringType.ts, '{ message: "Password" }', 'Creates a masked password prompt returning Redacted<string>.')
export const CliPromptHiddenTemplate = promptCtor('CliPromptHidden', 'Hidden', redactedStringType.ts, '{ message: "Secret" }', 'Creates a hidden-input prompt returning Redacted<string>.')
export const CliPromptConfirmTemplate = promptCtor('CliPromptConfirm', 'Confirm', 'boolean', '{ message: "Continue?" }', 'Creates a yes/no confirmation prompt.')
export const CliPromptToggleTemplate = promptCtor('CliPromptToggle', 'Toggle', 'boolean', '{ message: "Enabled?" }', 'Creates an interactive boolean toggle prompt.')
export const CliPromptIntTemplate = promptCtor('CliPromptInt', 'Int', 'number', '{ message: "Count" }', 'Creates an interactive integer prompt.')
export const CliPromptNumberTemplate = promptCtor('CliPromptNumber', 'Number', 'number', '{ message: "Value" }', 'Creates an interactive finite-number prompt.')
export const CliPromptFileTemplate = promptCtor('CliPromptFile', 'File', 'string', '{ message: "Select file" }', 'Creates an interactive filesystem selection prompt.')
export const CliPromptListTemplate = promptCtor('CliPromptList', 'List', 'string[]', '{ message: "Values" }', 'Creates a delimited-list prompt.')
export const CliPromptSelectTemplate = defineTemplate({
	modelId: 'CliPromptSelect', version: VERSION, description: 'Creates a single-selection prompt.', typeParameters: typeParameters(['A', 'Selected value type.']), inputs: { options: effectValueInput('Select options and choices.', { ts: '{ readonly message?: string; readonly choices: readonly { readonly title: string; readonly value: {{A}}; readonly description?: string; readonly disabled?: boolean; readonly selected?: boolean }[] }' }) }, output: expressionOutput('Single-selection prompt.', cliPromptType('{{A}}')), source: `Prompt.Select(${marker('expression', 'options', '{ choices: [{ title: "Default", value: "default" }] }')})`
})
export const CliPromptMultiSelectTemplate = defineTemplate({
	modelId: 'CliPromptMultiSelect', version: VERSION, description: 'Creates a multi-selection prompt.', typeParameters: typeParameters(['A', 'Selected value type.']), inputs: { options: valueInput('Multi-select options and choices.') }, output: expressionOutput('Multi-selection prompt.', cliPromptType('{{A}}[]')), source: `Prompt.MultiSelect(${marker('expression', 'options', '{ choices: [{ title: "Default", value: "default" }] }')})`
})
export const CliPromptAllTemplate = defineTemplate({
	modelId: 'CliPromptAll', version: VERSION, description: 'Runs a structured collection of prompts in sequence.', typeParameters: typeParameters(['A', 'Combined prompt output type.']), inputs: { prompts: valueInput('Tuple, iterable, or record of Prompt values.') }, output: expressionOutput('Combined prompt.', cliPromptType('{{A}}')), source: `Prompt.all(${marker('expression', 'prompts', '[Prompt.String({ message: "Value" })]')})`
})
export const CliPromptRunTemplate = defineTemplate({
	modelId: 'CliPromptRun', version: VERSION, description: 'Runs an interactive Prompt using Terminal/FileSystem/Path services.', typeParameters: typeParameters(['A', 'Prompt output type.']), inputs: { prompt: promptInput('Prompt to run.', '{{A}}') }, output: expressionOutput('Prompt execution Effect.', effectType('{{A}}', terminalQuitErrorType, promptEnvironmentRequirement)), source: `Prompt.run(${marker('expression', 'prompt', 'Prompt.String({ message: "Value" })')})`
})

export const CliCommandMakeTemplate = defineTemplate({
	modelId: 'CliCommandMake', version: VERSION, description: 'Creates a CLI Command from a name and typed configuration object.', typeParameters: typeParameters(['Name', 'Command name literal.'], ['Input', 'Parsed input object type.']), inputs: { name: stringInput('Command name.'), config: valueInput('Nested command config containing Argument/Flag values.') }, output: expressionOutput('CLI command.', cliCommandType('{{Name}}', '{{Input}}', '{}', 'never', 'never')), source: `Command.make(${marker('string', 'name', '"app"')}, ${marker('expression', 'config', '{}')})`
})
export const CliCommandMakeWithHandlerTemplate = defineTemplate({
	modelId: 'CliCommandMakeWithHandler', version: VERSION, description: 'Creates a CLI Command with typed configuration and an Effectful handler.', typeParameters: typeParameters(['Name', 'Command name literal.'], ['Input', 'Parsed input object type.'], ['E', 'Handler error type.'], ['R', 'Handler requirements.']), inputs: { name: stringInput('Command name.'), config: valueInput('Nested command config containing Argument/Flag values.'), handler: callbackInput('Command handler.', effectReturningCallbackType('input: {{Input}}', 'void', '{{E}}', '{{R}}')) }, output: expressionOutput('CLI command with handler.', cliCommandType('{{Name}}', '{{Input}}', '{}', '{{E}}', '{{R}}')), source: `Command.make(${marker('string', 'name', '"app"')}, ${marker('expression', 'config', '{}')}, ${marker('expression', 'handler', '() => Effect.void')})`
})
export const CliCommandWithHandlerTemplate = defineTemplate({
	modelId: 'CliCommandWithHandler', version: VERSION, description: 'Adds or replaces the handler of a CLI Command.', typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['ContextInput', 'Inherited command input type.'], ['E', 'Handler error type.'], ['R', 'Handler requirements.']), inputs: { command: commandInput('Command.', '{{Name}}', '{{Input}}', '{{ContextInput}}'), handler: callbackInput('Effectful command handler.', effectReturningCallbackType('input: {{Input}}', 'void', '{{E}}', '{{R}}')) }, output: expressionOutput('Command with handler.', cliCommandType('{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}')), source: `Command.withHandler(${marker('expression', 'command', 'Command.make("app")')}, ${marker('expression', 'handler', '() => Effect.void')})`
})
const commandStringComb = (modelId: string, member: string, description: string) => defineTemplate({
	modelId, version: VERSION, description, typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Error type.'], ['R', 'Requirements.']), inputs: { command: commandInput('Command.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}'), value: stringInput(description) }, output: expressionOutput(description, cliCommandType('{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}')), source: `Command.${member}(${marker('expression', 'command', 'Command.make("app")')}, ${marker('string', 'value', '"Description"')})`
})
export const CliCommandWithDescriptionTemplate = commandStringComb('CliCommandWithDescription', 'withDescription', 'Sets the full command description.')
export const CliCommandWithShortDescriptionTemplate = commandStringComb('CliCommandWithShortDescription', 'withShortDescription', 'Sets the short description used in subcommand listings and completions.')
export const CliCommandWithAliasTemplate = commandStringComb('CliCommandWithAlias', 'withAlias', 'Sets an alternate command name.')
export const CliCommandUnlistedTemplate = defineTemplate({
	modelId: 'CliCommandUnlisted', version: VERSION, description: 'Hides a subcommand from help/completions while preserving exact invocation.', typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Error type.'], ['R', 'Requirements.']), inputs: { command: commandInput('Command to hide.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}') }, output: expressionOutput('Unlisted command.', cliCommandType('{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}')), source: `Command.unlisted(${marker('expression', 'command', 'Command.make("experimental")')})`
})
export const CliCommandWithExamplesTemplate = defineTemplate({
	modelId: 'CliCommandWithExamples', version: VERSION, description: 'Adds usage examples to command help documentation.', typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Error type.'], ['R', 'Requirements.']), inputs: { command: commandInput('Command.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}'), examples: effectValueInput('Usage examples.', { ts: 'readonly { readonly command: string; readonly description?: string }[]' }) }, output: expressionOutput('Command with examples.', cliCommandType('{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}')), source: `Command.withExamples(${marker('expression', 'command', 'Command.make("app")')}, ${marker('expression', 'examples', '[{ command: "app", description: "Run app" }]')})`
})
export const CliCommandWithSharedFlagsTemplate = defineTemplate({
	modelId: 'CliCommandWithSharedFlags', version: VERSION, description: 'Adds parent flags inherited by descendant subcommands.', typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Existing input type.'], ['Shared', 'Shared flag input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Error type.'], ['R', 'Requirements.']), inputs: { command: commandInput('Parent command.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}'), flags: valueInput('Record of shared Flag values.') }, output: expressionOutput('Command with shared flags.', cliCommandType('{{Name}}', '{{Input}} & {{Shared}}', '{{ContextInput}} & {{Shared}}', '{{E}}', '{{R}}')), source: `Command.withSharedFlags(${marker('expression', 'command', 'Command.make("app")')}, ${marker('expression', 'flags', '{}')})`
})
export const CliCommandWithSubcommandsTemplate = defineTemplate({
	modelId: 'CliCommandWithSubcommands', version: VERSION, description: 'Adds one or more subcommands to a parent command.', typeParameters: typeParameters(['Name', 'Parent command name.'], ['Input', 'Parent input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Combined error type.'], ['R', 'Combined requirements.']), inputs: { command: commandInput('Parent command.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}'), subcommands: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression' }, minItems: 1, separator: ', ', description: 'Subcommand values.' }) }, output: expressionOutput('Command tree.', cliCommandType('{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}')), source: `Command.withSubcommands(${marker('expression', 'command', 'Command.make("app")')}, [${marker('expression', 'subcommands', 'Command.make("child")')}])`
})
export const CliCommandWithGlobalFlagsTemplate = defineTemplate({
	modelId: 'CliCommandWithGlobalFlags', version: VERSION, description: 'Adds global flags applying to a command and descendants.', typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Error type.'], ['R', 'Requirements.']), inputs: { command: commandInput('Command.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}'), flags: effectValueInput('Readonly GlobalFlag values.', { ts: 'readonly unknown[]' }) }, output: expressionOutput('Command with global flags.', cliCommandType('{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}')), source: `Command.withGlobalFlags(${marker('expression', 'command', 'Command.make("app")')}, ${marker('expression', 'flags', 'GlobalFlag.BuiltIns')})`
})
export const CliCommandProvideLayerTemplate = defineTemplate({
	modelId: 'CliCommandProvideLayer', version: VERSION, description: 'Provides command handler services from a Layer, optionally depending on parsed input.', typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Command error type.'], ['R', 'Command requirements.'], ['P', 'Provided services.'], ['ELayer', 'Layer error type.'], ['RLayer', 'Layer requirements.']), inputs: { command: commandInput('Command.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}'), layer: typedExpressionInput('Service Layer.', layerType('{{P}}', '{{ELayer}}', '{{RLayer}}')) }, output: expressionOutput('Command with services provided.', cliCommandType('{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}} | {{ELayer}}', '{{RLayer}} | Exclude<{{R}}, {{P}}>')), source: `Command.provide(${marker('expression', 'command', 'Command.make("app")')}, ${marker('expression', 'layer', 'Layer.empty')})`
})
export const CliCommandProvideEffectDiscardTemplate = defineTemplate({
	modelId: 'CliCommandProvideEffectDiscard', version: VERSION, description: 'Runs an Effect before the selected command handler, optionally based on parsed input.', typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Command error type.'], ['R', 'Command requirements.'], ['E2', 'Pre-handler error type.'], ['R2', 'Pre-handler requirements.']), inputs: { command: commandInput('Command.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}'), effect: effectSourceInput('Effect run before the handler.', effectType('unknown', '{{E2}}', '{{R2}}')) }, output: expressionOutput('Command with pre-handler Effect.', cliCommandType('{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')), source: `Command.provideEffectDiscard(${marker('expression', 'command', 'Command.make("app")')}, ${marker('expression', 'effect', 'Effect.void')})`
})
export const CliCommandRunTemplate = defineTemplate({
	modelId: 'CliCommandRun', version: VERSION, description: 'Runs a command using arguments supplied by Stdio, including built-in help/version behavior.', typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Handler error type.'], ['R', 'Handler requirements.']), inputs: { command: commandInput('Root command.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}'), version: stringInput('CLI version.'), renderErrors: effectValueInput('Whether the command runner renders parse/user errors.', { ts: 'boolean' }) }, output: expressionOutput('CLI runner Effect.', effectType('void', `${cliErrorType} | {{E}}`, `${cliEnvironmentRequirement} | {{R}}`)), source: `Command.run(${marker('expression', 'command', 'Command.make("app")')}, { version: ${marker('string', 'version', '"1.0.0"')}, renderErrors: ${marker('expression', 'renderErrors', 'true')} })`
})
export const CliCommandRunWithTemplate = defineTemplate({
	modelId: 'CliCommandRunWith', version: VERSION, description: 'Runs a command against an explicit argv array for tests or programmatic execution.', typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Handler error type.'], ['R', 'Handler requirements.']), inputs: { command: commandInput('Root command.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}'), version: stringInput('CLI version.'), argv: effectValueInput('Explicit command arguments.', { ts: 'readonly string[]' }) }, output: expressionOutput('Explicit-argv CLI runner Effect.', effectType('void', `${cliErrorType} | {{E}}`, `${cliEnvironmentRequirement} | {{R}}`)), source: `Command.runWith(${marker('expression', 'command', 'Command.make("app")')}, { version: ${marker('string', 'version', '"1.0.0"')} })(${marker('expression', 'argv', '[]')})`
})
export const CliCommandWizardTemplate = defineTemplate({
	modelId: 'CliCommandWizard', version: VERSION, description: 'Interactively constructs argv for a command tree.', typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['ContextInput', 'Inherited input type.'], ['E', 'Handler error type.'], ['R', 'Handler requirements.']), inputs: { command: commandInput('Command.', '{{Name}}', '{{Input}}', '{{ContextInput}}', '{{E}}', '{{R}}'), prefix: effectValueInput('Optional argv prefix.', { ts: 'readonly string[]' }) }, output: expressionOutput('Generated argv Effect.', effectType('string[]', `${terminalQuitErrorType} | ${cliErrorType}`, cliEnvironmentRequirement)), source: `Command.wizard(${marker('expression', 'command', 'Command.make("app")')}, { prefix: ${marker('expression', 'prefix', '[]')} })`
})

export const CliGlobalFlagHelpTemplate = defineTemplate({ modelId: 'CliGlobalFlagHelp', version: VERSION, description: 'Built-in --help/-h action global flag.', inputs: {}, output: expressionOutput('Help global flag.', cliGlobalFlagType('boolean')), source: 'GlobalFlag.Help' })
export const CliGlobalFlagVersionTemplate = defineTemplate({ modelId: 'CliGlobalFlagVersion', version: VERSION, description: 'Built-in --version/-v action global flag.', inputs: {}, output: expressionOutput('Version global flag.', cliGlobalFlagType('boolean')), source: 'GlobalFlag.Version' })
export const CliGlobalFlagLogLevelTemplate = defineTemplate({ modelId: 'CliGlobalFlagLogLevel', version: VERSION, description: 'Built-in log-level setting global flag.', inputs: {}, output: expressionOutput('Log-level global flag.', cliGlobalFlagType('unknown')), source: 'GlobalFlag.LogLevel' })
export const CliOutputDefaultFormatterTemplate = defineTemplate({
	modelId: 'CliOutputDefaultFormatter', version: VERSION, description: 'Creates the default CLI help/error formatter with explicit color configuration.', inputs: { colors: effectValueInput('Whether ANSI colors are enabled.', { ts: 'boolean' }) }, output: expressionOutput('CLI output formatter.', cliFormatterType()), source: `CliOutput.defaultFormatter({ colors: ${marker('expression', 'colors', 'false')} })`
})

export const effectV4CliFoundationalGraphTemplateInputs = [
	CliArgumentStringTemplate, CliArgumentIntTemplate, CliArgumentFiniteTemplate, CliArgumentDateTemplate, CliArgumentRedactedTemplate,
	CliArgumentFileTemplate, CliArgumentDirectoryTemplate, CliArgumentPathTemplate, CliArgumentLiteralsTemplate, CliArgumentChoiceWithValueTemplate,
	CliArgumentOptionalTemplate, CliArgumentVariadicTemplate, CliArgumentWithDefaultTemplate, CliArgumentWithDescriptionTemplate, CliArgumentWithMetavarTemplate,
	CliArgumentWithFallbackConfigTemplate, CliArgumentWithFallbackPromptTemplate, CliArgumentWithSchemaTemplate,
	CliFlagBooleanTemplate, CliFlagStringTemplate, CliFlagIntTemplate, CliFlagFiniteTemplate, CliFlagRedactedTemplate, CliFlagFileTemplate, CliFlagDirectoryTemplate,
	CliFlagPathTemplate, CliFlagLiteralsTemplate, CliFlagChoiceWithValueTemplate, CliFlagOptionalTemplate, CliFlagWithAliasTemplate, CliFlagWithDefaultTemplate,
	CliFlagWithDescriptionTemplate, CliFlagWithHiddenTemplate, CliFlagWithMetavarTemplate, CliFlagAtLeastTemplate, CliFlagAtMostTemplate, CliFlagBetweenTemplate,
	CliFlagWithFallbackConfigTemplate, CliFlagWithFallbackPromptTemplate, CliFlagWithSchemaTemplate,
	CliPromptStringTemplate, CliPromptPasswordTemplate, CliPromptHiddenTemplate, CliPromptConfirmTemplate, CliPromptToggleTemplate, CliPromptIntTemplate,
	CliPromptNumberTemplate, CliPromptFileTemplate, CliPromptListTemplate, CliPromptSelectTemplate, CliPromptMultiSelectTemplate, CliPromptAllTemplate, CliPromptRunTemplate,
	CliCommandMakeTemplate, CliCommandMakeWithHandlerTemplate, CliCommandWithHandlerTemplate, CliCommandWithDescriptionTemplate, CliCommandWithShortDescriptionTemplate,
	CliCommandWithAliasTemplate, CliCommandUnlistedTemplate, CliCommandWithExamplesTemplate, CliCommandWithSharedFlagsTemplate, CliCommandWithSubcommandsTemplate,
	CliCommandWithGlobalFlagsTemplate, CliCommandProvideLayerTemplate, CliCommandProvideEffectDiscardTemplate, CliCommandRunTemplate, CliCommandRunWithTemplate,
	CliCommandWizardTemplate, CliGlobalFlagHelpTemplate, CliGlobalFlagVersionTemplate, CliGlobalFlagLogLevelTemplate, CliOutputDefaultFormatterTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
