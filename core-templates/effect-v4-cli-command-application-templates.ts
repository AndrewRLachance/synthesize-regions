import { defineTemplate } from './sample-definition.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	statementCollectionInput,
	statementOutput,
	stringInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	cliCommandType,
	cliEnvironmentRequirement,
	cliErrorType,
	cliFlagType,
	promptEnvironmentRequirement,
	terminalQuitErrorType
} from './effect-cli-template-helpers.js'

const VERSION = '1.0.0' as const
const commandInput = (description: string, name = 'string', input = 'unknown', context = 'unknown', error = 'never', requirements = 'never') =>
	typedExpressionInput(description, cliCommandType(name, input, context, error, requirements))
const layerInput = (description: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, layerType(provided, error, requirements))

export const CliTestEnvironmentLayerTemplate = defineTemplate({
	modelId: 'CliTestEnvironmentLayer',
	version: VERSION,
	description: 'Builds a deterministic non-interactive CLI environment for Command.runWith tests.',
	inputs: {},
	output: expressionOutput('CLI test environment Layer.', layerType(cliEnvironmentRequirement, 'never', 'never')),
	source: `Layer.mergeAll(
	FileSystem.layerNoop({}),
	Path.layer,
	Stdio.layerTest({}),
	Layer.succeed(Terminal.Terminal, Terminal.make({
		columns: Effect.succeed(80),
		rows: Effect.succeed(24),
		readInput: Effect.die("unused"),
		readLine: Effect.die("unused"),
		display: () => Effect.void
	})),
	Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, ChildProcessSpawner.make(() => Effect.die("unused")))
)`
})

export const CliConfiguredRootCommandTemplate = defineTemplate({
	modelId: 'CliConfiguredRootCommand', version: VERSION,
	description: 'Creates a documented root command with config, shared flags, subcommands, and usage examples.',
	inputs: {
		name: stringInput('Root command name.'),
		config: valueInput('Root command Argument/Flag configuration.'),
		sharedFlags: valueInput('Record of flags inherited by subcommands.'),
		subcommands: valueInput('Readonly subcommand array.'),
		description: stringInput('Root command description.'),
		examples: effectValueInput('Usage examples.', { ts: 'readonly { readonly command: string; readonly description?: string }[]' })
	},
	output: expressionOutput('Configured CLI command tree.', cliCommandType('string', 'unknown', 'unknown', 'unknown', 'unknown')),
	source: `Command.make(${marker('string', 'name', '"app"')}, ${marker('expression', 'config', '{}')}).pipe(
	Command.withDescription(${marker('string', 'description', '"Application CLI"')}),
	Command.withSharedFlags(${marker('expression', 'sharedFlags', '{}')}),
	Command.withSubcommands(${marker('expression', 'subcommands', '[]')}),
	Command.withExamples(${marker('expression', 'examples', '[]')})
)`
})

export const CliServiceBackedCommandTemplate = defineTemplate({
	modelId: 'CliServiceBackedCommand', version: VERSION,
	description: 'Attaches an Effectful handler and provides its application services with a Layer.',
	typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed command input.'], ['E', 'Handler error type.'], ['R', 'Handler requirements.'], ['P', 'Services supplied by the Layer.'], ['ELayer', 'Layer construction error.'], ['RLayer', 'Layer requirements.']),
	inputs: {
		command: commandInput('Command before handler wiring.', '{{Name}}', '{{Input}}'),
		handler: effectValueInput('Handler callback.', effectReturningCallbackType('input: {{Input}}', 'void', '{{E}}', '{{R}}')),
		services: layerInput('Application service Layer.', '{{P}}', '{{ELayer}}', '{{RLayer}}')
	},
	output: expressionOutput('Service-backed command.', cliCommandType('{{Name}}', '{{Input}}', '{}', '{{E}} | {{ELayer}}', '{{RLayer}} | Exclude<{{R}}, {{P}}>')),
	source: `Command.withHandler(${marker('expression', 'command', 'Command.make("app")')}, ${marker('expression', 'handler', '() => Effect.void')}).pipe(
	Command.provide(${marker('expression', 'services', 'Layer.empty')})
)`
})

export const CliConfigFallbackCommandTemplate = defineTemplate({
	modelId: 'CliConfigFallbackCommand', version: VERSION,
	description: 'Creates a command flag whose explicit CLI value takes precedence over Effect Config.',
	inputs: {
		name: stringInput('Command name.'),
		flagName: stringInput('Flag name.'),
		config: valueInput('Fallback Config value.'),
		handler: valueInput('Handler callback receiving the parsed configuration object.')
	},
	output: expressionOutput('Config-backed CLI command.', cliCommandType('string', 'unknown', '{}', 'unknown', 'unknown')),
	source: `Command.make(${marker('string', 'name', '"app"')}, {
	value: Flag.String(${marker('string', 'flagName', '"value"')}).pipe(Flag.withFallbackConfig(${marker('expression', 'config', 'Config.String("VALUE")')}))
}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const CliInteractiveFallbackCommandTemplate = defineTemplate({
	modelId: 'CliInteractiveFallbackCommand', version: VERSION,
	description: 'Creates a command whose required flag falls back to an interactive Prompt.',
	inputs: {
		name: stringInput('Command name.'),
		flag: typedExpressionInput('Required flag.', cliFlagType('string')),
		promptOptions: valueInput('Prompt.String options.'),
		handler: valueInput('Handler callback.')
	},
	output: expressionOutput('Interactive fallback command.', cliCommandType('string', 'unknown', '{}', 'unknown', 'unknown')),
	source: `Command.make(${marker('string', 'name', '"app"')}, {
	value: Flag.withFallbackPrompt(${marker('expression', 'flag', 'Flag.String("value")')}, Prompt.String(${marker('expression', 'promptOptions', '{ message: "Value" }')}))
}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const CliSchemaValidatedFileCommandTemplate = defineTemplate({
	modelId: 'CliSchemaValidatedFileCommand', version: VERSION,
	description: 'Builds a command that reads a file argument and validates the parsed content with Schema before invoking its handler.',
	inputs: {
		name: stringInput('Command name.'),
		argumentName: stringInput('Input file argument name.'),
		schema: valueInput('Schema used by Argument.FileSchema.'),
		handler: valueInput('Handler callback.')
	},
	output: expressionOutput('Schema-file CLI command.', cliCommandType('string', 'unknown', '{}', 'unknown', 'unknown')),
	source: `Command.make(${marker('string', 'name', '"import"')}, {
	input: Argument.FileSchema(${marker('string', 'argumentName', '"input"')}, ${marker('expression', 'schema', 'Schema.Unknown')})
}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const CliRedactedCredentialCommandTemplate = defineTemplate({
	modelId: 'CliRedactedCredentialCommand', version: VERSION,
	description: 'Builds a command that accepts a Redacted credential flag and never exposes a plain-string type at the handler boundary.',
	inputs: { name: stringInput('Command name.'), credentialName: stringInput('Credential flag name.'), handler: valueInput('Handler callback receiving Redacted<string>.') },
	output: expressionOutput('Credential-safe CLI command.', cliCommandType('string', 'unknown', '{}', 'unknown', 'unknown')),
	source: `Command.make(${marker('string', 'name', '"login"')}, {
	credential: Flag.Redacted(${marker('string', 'credentialName', '"token"')})
}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const CliObservedCommandTemplate = defineTemplate({
	modelId: 'CliObservedCommand', version: VERSION,
	description: 'Wraps a command handler with an Effect tracing span and structured command annotation.',
	typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['E', 'Handler error type.'], ['R', 'Handler requirements.']),
	inputs: {
		command: commandInput('Command.', '{{Name}}', '{{Input}}'),
		spanName: stringInput('Trace span name.'),
		handler: effectValueInput('Underlying handler callback.', effectReturningCallbackType('input: {{Input}}', 'void', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Observed command.', cliCommandType('{{Name}}', '{{Input}}', '{}', '{{E}}', '{{R}}')),
	source: `(() => {
	const spanName = ${marker('string', 'spanName', '"cli.command"')}
	return Command.withHandler(${marker('expression', 'command', 'Command.make("app")')}, input => (${marker('expression', 'handler', '(_input: unknown) => Effect.void')})(input).pipe(
		Effect.annotateLogs("cli.command", spanName),
		Effect.withSpan(spanName)
	))
})()`
})

export const CliPreflightCommandTemplate = defineTemplate({
	modelId: 'CliPreflightCommand', version: VERSION,
	description: 'Runs a validation/preflight Effect before a command handler using Command.provideEffectDiscard.',
	typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['E', 'Command error type.'], ['R', 'Command requirements.'], ['E2', 'Preflight error type.'], ['R2', 'Preflight requirements.']),
	inputs: { command: commandInput('Command.', '{{Name}}', '{{Input}}', '{}', '{{E}}', '{{R}}'), preflight: effectSourceInput('Preflight Effect.', effectType('unknown', '{{E2}}', '{{R2}}')) },
	output: expressionOutput('Preflight-gated command.', cliCommandType('{{Name}}', '{{Input}}', '{}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Command.provideEffectDiscard(${marker('expression', 'command', 'Command.make("app")')}, ${marker('expression', 'preflight', 'Effect.void')})`
})

export const CliTestRunTemplate = defineTemplate({
	modelId: 'CliTestRun', version: VERSION,
	description: 'Runs a CLI command with explicit argv under a supplied deterministic test environment Layer.',
	typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['E', 'Command error type.'], ['R', 'Command requirements.'], ['ELayer', 'Test Layer error type.'], ['RLayer', 'Test Layer requirements.']),
	inputs: {
		command: commandInput('Command under test.', '{{Name}}', '{{Input}}', '{}', '{{E}}', '{{R}}'),
		argv: effectValueInput('Explicit argv.', { ts: 'readonly string[]' }),
		version: stringInput('CLI version.'),
		testLayer: layerInput('Layer providing the CLI environment and handler services.', `${cliEnvironmentRequirement} | {{R}}`, '{{ELayer}}', '{{RLayer}}')
	},
	output: expressionOutput('Command test Effect.', effectType('void', `${cliErrorType} | {{E}} | {{ELayer}}`, '{{RLayer}}')),
	source: `Command.runWith(${marker('expression', 'command', 'Command.make("app")')}, { version: ${marker('string', 'version', '"1.0.0"')} })(${marker('expression', 'argv', '[]')}).pipe(
	Effect.provide(${marker('expression', 'testLayer', 'Layer.empty')})
)`
})

export const CliWizardRoundTripTemplate = defineTemplate({
	modelId: 'CliWizardRoundTrip', version: VERSION,
	description: 'Runs the interactive command wizard and feeds the generated argv back through the same command parser.',
	typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['E', 'Command error type.'], ['R', 'Command requirements.']),
	inputs: { command: commandInput('Command.', '{{Name}}', '{{Input}}', '{}', '{{E}}', '{{R}}'), version: stringInput('CLI version.') },
	output: expressionOutput('Wizard + command execution Effect.', effectType('void', `${terminalQuitErrorType} | ${cliErrorType} | {{E}}`, `${cliEnvironmentRequirement} | {{R}}`)),
	source: `Effect.gen(function* () {
	const command = ${marker('expression', 'command', 'Command.make("app")')}
	const argv = yield* Command.wizard(command)
	yield* Command.runWith(command, { version: ${marker('string', 'version', '"1.0.0"')} })(argv.slice(1))
})`
})

export const NodeCliMainTemplate = defineTemplate({
	modelId: 'NodeCliMain', version: VERSION,
	description: 'Runs a closed CLI Command on Node.js with NodeServices supplying the platform CLI environment and NodeRuntime owning process teardown.',
	typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['E', 'Command error type.']),
	inputs: { command: commandInput('Closed command after application services are provided.', '{{Name}}', '{{Input}}', '{}', '{{E}}', 'never'), version: stringInput('CLI version.') },
	output: statementOutput('Node.js CLI entry point.'),
	source: `NodeRuntime.runMain(Command.run(${marker('expression', 'command', 'Command.make("app")')}, { version: ${marker('string', 'version', '"1.0.0"')} }).pipe(Effect.provide(NodeServices.layer)))`
})

export const BunCliMainTemplate = defineTemplate({
	modelId: 'BunCliMain', version: VERSION,
	description: 'Runs a closed CLI Command on Bun with BunServices supplying the platform CLI environment and BunRuntime owning process teardown.',
	typeParameters: typeParameters(['Name', 'Command name.'], ['Input', 'Parsed input type.'], ['E', 'Command error type.']),
	inputs: { command: commandInput('Closed command after application services are provided.', '{{Name}}', '{{Input}}', '{}', '{{E}}', 'never'), version: stringInput('CLI version.') },
	output: statementOutput('Bun CLI entry point.'),
	source: `BunRuntime.runMain(Command.run(${marker('expression', 'command', 'Command.make("app")')}, { version: ${marker('string', 'version', '"1.0.0"')} }).pipe(Effect.provide(BunServices.layer)))`
})

export const NodeCliApplicationSourceFileTemplate = defineTemplate({
	modelId: 'NodeCliApplicationSourceFile', version: VERSION,
	description: 'Builds a complete Node.js Effect CLI source file with current public CLI/process imports and Node platform services.',
	inputs: { body: statementCollectionInput('Command declarations, Layers, and NodeCliMain invocation.') },
	output: { kind: 'sourceFile', description: 'Complete Node.js Effect CLI application source file.' },
	source: `import { Config, Context, Effect, FileSystem, Layer, Path, Redacted, Schema, Stdio, Terminal } from "effect"
import { Argument, CliError, CliOutput, Command, Flag, GlobalFlag, Prompt } from "effect/unstable/cli"
import { ChildProcessSpawner } from "effect/unstable/process"
import { NodeRuntime, NodeServices } from "@effect/platform-node"

${marker('statement', 'body', 'NodeRuntime.runMain(Effect.void)')}`
})

export const BunCliApplicationSourceFileTemplate = defineTemplate({
	modelId: 'BunCliApplicationSourceFile', version: VERSION,
	description: 'Builds a complete Bun Effect CLI source file with current public CLI/process imports and Bun platform services.',
	inputs: { body: statementCollectionInput('Command declarations, Layers, and BunCliMain invocation.') },
	output: { kind: 'sourceFile', description: 'Complete Bun Effect CLI application source file.' },
	source: `import { Config, Context, Effect, FileSystem, Layer, Path, Redacted, Schema, Stdio, Terminal } from "effect"
import { Argument, CliError, CliOutput, Command, Flag, GlobalFlag, Prompt } from "effect/unstable/cli"
import { ChildProcessSpawner } from "effect/unstable/process"
import { BunRuntime, BunServices } from "@effect/platform-bun"

${marker('statement', 'body', 'BunRuntime.runMain(Effect.void)')}`
})

export const CliTestSourceFileTemplate = defineTemplate({
	modelId: 'CliTestSourceFile', version: VERSION,
	description: 'Builds a CLI test source file centered on Command.runWith and deterministic CLI environment services.',
	inputs: { body: statementCollectionInput('Command definitions and test assertions.') },
	output: { kind: 'sourceFile', description: 'Complete CLI test source file.' },
	source: `import { Effect, FileSystem, Layer, Path, Stdio, Terminal } from "effect"
import { Argument, Command, Flag, Prompt } from "effect/unstable/cli"
import { ChildProcessSpawner } from "effect/unstable/process"

${marker('statement', 'body', 'void 0;')}`
})

export const effectV4CliCommandApplicationGraphTemplateInputs = [
	CliTestEnvironmentLayerTemplate,
	CliConfiguredRootCommandTemplate,
	CliServiceBackedCommandTemplate,
	CliConfigFallbackCommandTemplate,
	CliInteractiveFallbackCommandTemplate,
	CliSchemaValidatedFileCommandTemplate,
	CliRedactedCredentialCommandTemplate,
	CliObservedCommandTemplate,
	CliPreflightCommandTemplate,
	CliTestRunTemplate,
	CliWizardRoundTripTemplate,
	NodeCliMainTemplate,
	BunCliMainTemplate,
	NodeCliApplicationSourceFileTemplate,
	BunCliApplicationSourceFileTemplate,
	CliTestSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
