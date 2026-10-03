import { defineTemplate } from './sample-definition.js'
import { effectDurationInput, effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	effectReturningCallbackType,
	expressionOutput,
	identifierInput,
	layerType,
	marker,
	schemaType,
	statementCollectionInput,
	statementOutput,
	stringInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	childProcessCommandType,
	childProcessExitCodeType,
	childProcessHandleType,
	childProcessPlatformError,
	childProcessScopeRequirement,
	childProcessSignalType,
	childProcessSpawnerRequirement
} from './effect-child-process-template-helpers.js'

/**
 * Production child-process / OS integration compositions.
 *
 * Runtime contract:
 *   import { Context, Effect, Layer, Schema, Stream } from 'effect'
 *   import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'
 */
const VERSION = '1.0.0' as const
const commandInput = (description: string) => typedExpressionInput(description, childProcessCommandType())
const layerInput = (description: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, layerType(provided, error, requirements))
const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

const exitFailureType = '{ readonly _tag: "ChildProcessExitError"; readonly exitCode: number }'

export const ChildProcessCheckedExitTemplate = defineTemplate({
	modelId: 'ChildProcessCheckedExit', version: VERSION,
	description: 'Runs a command and fails with a typed non-zero-exit error when the process does not succeed.',
	inputs: { command: commandInput('Command to run.') },
	output: expressionOutput('Checked command Effect.', effectType(childProcessExitCodeType().ts, `${childProcessPlatformError} | ${exitFailureType}`, childProcessSpawnerRequirement)),
	source: `Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	const exitCode = yield* spawner.exitCode(${marker('expression', 'command', 'ChildProcess.make("true")')})
	if (exitCode !== 0) return yield* Effect.fail({ _tag: "ChildProcessExitError" as const, exitCode })
	return exitCode
})`
})

export const ChildProcessCaptureOutputTemplate = defineTemplate({
	modelId: 'ChildProcessCaptureOutput', version: VERSION,
	description: 'Runs a command and captures decoded output, optionally including stderr.',
	inputs: { command: commandInput('Command to execute.'), includeStderr: effectValueInput('Whether stderr should be merged into captured output.', { ts: 'boolean' }) },
	output: expressionOutput('Captured output Effect.', effectType('string', childProcessPlatformError, childProcessSpawnerRequirement)),
	source: `Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	return yield* spawner.string(${marker('expression', 'command', 'ChildProcess.make("echo", ["hello"])')}, { includeStderr: ${marker('expression', 'includeStderr', 'false')} })
})`
})

export const ChildProcessCaptureLinesTemplate = defineTemplate({
	modelId: 'ChildProcessCaptureLines', version: VERSION,
	description: 'Runs a command and captures decoded output as lines.',
	inputs: { command: commandInput('Command to execute.'), includeStderr: effectValueInput('Whether stderr should be included.', { ts: 'boolean' }) },
	output: expressionOutput('Captured lines Effect.', effectType('Array<string>', childProcessPlatformError, childProcessSpawnerRequirement)),
	source: `Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	return yield* spawner.lines(${marker('expression', 'command', 'ChildProcess.make("echo", ["hello"])')}, { includeStderr: ${marker('expression', 'includeStderr', 'false')} })
})`
})

export const ChildProcessPipelineStringTemplate = defineTemplate({
	modelId: 'ChildProcessPipelineString', version: VERSION,
	description: 'Pipes two commands and captures the final pipeline output as text.',
	inputs: { source: commandInput('Source command.'), destination: commandInput('Destination command.') },
	output: expressionOutput('Pipeline output Effect.', effectType('string', childProcessPlatformError, childProcessSpawnerRequirement)),
	source: `Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	const pipeline = ChildProcess.pipeTo(${marker('expression', 'source', 'ChildProcess.make("echo", ["hello"])')}, ${marker('expression', 'destination', 'ChildProcess.make("cat")')})
	return yield* spawner.string(pipeline)
})`
})

export const ChildProcessObservedCommandTemplate = defineTemplate({
	modelId: 'ChildProcessObservedCommand', version: VERSION,
	description: 'Runs a command under a tracing span with structured command metadata and returns its exit code.',
	inputs: { command: commandInput('Command to execute.'), spanName: stringInput('Tracing span name.'), commandName: stringInput('Safe logical command label for telemetry.') },
	output: expressionOutput('Observed command Effect.', effectType(childProcessExitCodeType().ts, childProcessPlatformError, childProcessSpawnerRequirement)),
	source: `(() => {
	const spanName = ${marker('string', 'spanName', '"process.exec"')}
	const commandName = ${marker('string', 'commandName', '"external-tool"')}
	return Effect.gen(function* () {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
		return yield* spawner.exitCode(${marker('expression', 'command', 'ChildProcess.make("true")')})
	}).pipe(Effect.annotateLogs("process.command", commandName), Effect.withSpan(spanName))
})()`
})

export const ChildProcessObservedLineStreamTemplate = defineTemplate({
	modelId: 'ChildProcessObservedLineStream', version: VERSION,
	description: 'Streams command output as lines while annotating each emitted line with a stable logical command label.',
	inputs: { command: commandInput('Command to execute.'), commandName: stringInput('Safe logical command label.') },
	output: expressionOutput('Observed line Stream.', { nominal: 'effect/Stream', ts: `{ readonly pipe: () => unknown; readonly __streamSuccess?: () => string; readonly __streamError?: () => ${childProcessPlatformError}; readonly __streamRequirements?: () => ${childProcessSpawnerRequirement} }` }),
	source: `Stream.unwrap(Effect.map(ChildProcessSpawner.ChildProcessSpawner, spawner => spawner.streamLines(${marker('expression', 'command', 'ChildProcess.make("echo", ["hello"])')}))).pipe(Stream.tap(line => Effect.logInfo({ command: ${marker('string', 'commandName', '"external-tool"')}, line })))`
})

export const ChildProcessJsonOutputTemplate = defineTemplate({
	modelId: 'ChildProcessJsonOutput', version: VERSION,
	description: 'Runs a command, captures stdout, parses JSON, and validates the decoded value with an Effect Schema.',
	typeParameters: typeParameters(['A', 'Decoded JSON result type.'], ['I', 'Schema encoded type.'], ['RD', 'Schema decoding services.'], ['RE', 'Schema encoding services.']),
	inputs: { command: commandInput('JSON-producing command.'), schema: typedExpressionInput('Schema for the parsed JSON document.', schemaType('{{A}}', '{{I}}', '{{RD}}', '{{RE}}')) },
	output: expressionOutput('Schema-validated command JSON.', effectType('{{A}}', `${childProcessPlatformError} | { readonly _tag: "SchemaError"; readonly issue: unknown }`, `${childProcessSpawnerRequirement} | {{RD}}`)),
	source: `Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	const text = yield* spawner.string(${marker('expression', 'command', 'ChildProcess.make("echo", ["{}"])')})
	return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(${marker('expression', 'schema', 'Schema.Unknown')}))(text)
})`
})

export const ChildProcessGracefulTerminateTemplate = defineTemplate({
	modelId: 'ChildProcessGracefulTerminate', version: VERSION,
	description: 'Sends a graceful termination signal to a running child and escalates after a configurable delay.',
	inputs: { handle: typedExpressionInput('Running process handle.', childProcessHandleType()), signal: effectValueInput('Graceful signal.', childProcessSignalType), forceKillAfter: effectDurationInput('Duration before escalation.') },
	output: expressionOutput('Graceful termination Effect.', effectType('void', childProcessPlatformError, 'never')),
	source: `${marker('expression', 'handle', '(undefined as any)')}.kill({ killSignal: ${marker('expression', 'signal', '"SIGTERM"')}, forceKillAfter: ${marker('expression', 'forceKillAfter', '"5 seconds"')} })`
})

export const ChildProcessScopedWaitTemplate = defineTemplate({
	modelId: 'ChildProcessScopedWait', version: VERSION,
	description: 'Spawns a command inside a Scope and waits for its exit so scoped process cleanup remains active for the complete lifetime.',
	inputs: { command: commandInput('Command to run.') },
	output: expressionOutput('Scoped process wait Effect.', effectType(childProcessExitCodeType().ts, childProcessPlatformError, childProcessSpawnerRequirement)),
	source: `Effect.scoped(Effect.gen(function* () {
	const handle = yield* ${marker('expression', 'command', 'ChildProcess.make("true")')}
	return yield* handle.exitCode
}))`
})

export const ChildProcessBackgroundLayerTemplate = defineTemplate({
	modelId: 'ChildProcessBackgroundLayer', version: VERSION,
	description: 'Runs a child process for the lifetime of a Layer Scope and requests graceful termination during Layer finalization.',
	inputs: {
		command: commandInput('Long-running command.'),
		signal: effectValueInput('Graceful shutdown signal.', childProcessSignalType),
		forceKillAfter: effectDurationInput('Duration before forced termination.')
	},
	output: expressionOutput('Long-running process Layer.', layerType('never', childProcessPlatformError, childProcessSpawnerRequirement)),
	source: `Layer.effectDiscard(Effect.gen(function* () {
	const handle = yield* ${marker('expression', 'command', 'ChildProcess.make("sleep", ["3600"])')}
	const killOptions = { killSignal: ${marker('expression', 'signal', '"SIGTERM"')}, forceKillAfter: ${marker('expression', 'forceKillAfter', '"5 seconds"')} } as const
	yield* Effect.addFinalizer(() => Effect.orDie(handle.kill(killOptions)))
	yield* Effect.forkScoped(handle.exitCode)
}))`
})

export const ChildProcessCommandServiceLayerTemplate = defineTemplate({
	modelId: 'ChildProcessCommandServiceLayer', version: VERSION,
	description: 'Exposes a reusable external-command operation as a Context service, hiding ChildProcessSpawner from consumers.',
	typeParameters: typeParameters(['I', 'Service identifier type.'], ['A', 'Service result type.']),
	inputs: { service: serviceKeyInput('Context.Service key for the command adapter.', '{{I}}', `{ readonly run: ${effectReturningCallbackType('args: readonly string[]', '{{A}}', 'unknown', 'never').ts} }`), command: stringInput('Executable name/path.'), decode: valueInput('Effectful callback that converts captured stdout to the service result.') },
	output: expressionOutput('External command adapter Layer.', layerType('{{I}}', 'never', childProcessSpawnerRequirement)),
	source: `Layer.effect(${marker('expression', 'service', '(undefined as never)')}, Effect.map(ChildProcessSpawner.ChildProcessSpawner, spawner => ({
	run: (args: readonly string[]) => Effect.flatMap(spawner.string(ChildProcess.make(${marker('string', 'command', '"tool"')}, args)), ${marker('expression', 'decode', 'text => Effect.succeed(text)')})
})))`
})

export const ChildProcessParallelExitCodesTemplate = defineTemplate({
	modelId: 'ChildProcessParallelExitCodes', version: VERSION,
	description: 'Runs several independent commands concurrently and returns their exit codes.',
	inputs: { commands: effectValueInput('Commands to run.', { ts: 'ReadonlyArray<unknown>' }), concurrency: effectValueInput('Effect concurrency setting.', { ts: 'number | "unbounded"' }) },
	output: expressionOutput('Parallel exit-code Effect.', effectType('ReadonlyArray<number>', childProcessPlatformError, childProcessSpawnerRequirement)),
	source: `Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	return yield* Effect.forEach(${marker('expression', 'commands', '[]')} as ReadonlyArray<ChildProcess.Command>, command => spawner.exitCode(command), { concurrency: ${marker('expression', 'concurrency', '4')} })
})`
})

export const ChildProcessCliHandlerTemplate = defineTemplate({
	modelId: 'ChildProcessCliHandler', version: VERSION,
	description: 'Creates a CLI-compatible handler callback that maps parsed arguments to a direct executable+argv child process without invoking a shell.',
	typeParameters: typeParameters(['Input', 'Parsed CLI input type.']),
	inputs: { command: stringInput('Executable.'), args: valueInput('Pure callback converting CLI input into argv.', { ts: '(input: {{Input}}) => readonly string[]' }) },
	output: expressionOutput('CLI child-process handler.', effectReturningCallbackType('input: {{Input}}', 'void', 'unknown', 'unknown')),
	source: `input => Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	const exitCode = yield* spawner.exitCode(ChildProcess.make(${marker('string', 'command', '"tool"')}, (${marker('expression', 'args', '(_input: unknown) => []')})(input)))
	if (exitCode !== 0) return yield* Effect.fail({ _tag: "ChildProcessExitError" as const, exitCode })
})`
})

export const ChildProcessIsolatedEnvironmentCommandTemplate = defineTemplate({
	modelId: 'ChildProcessIsolatedEnvironmentCommand', version: VERSION,
	description: 'Builds a direct child command with a clean environment and explicit working directory for reproducible tooling.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }), cwd: effectValueInput('Working directory.', { ts: 'string' }), env: effectValueInput('Complete child environment.', { ts: 'Record<string, string | undefined>' }) },
	output: expressionOutput('Isolated command.', childProcessCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"tool"')}, ${marker('expression', 'args', '[]')}, { cwd: ${marker('expression', 'cwd', '"."')}, env: ${marker('expression', 'env', '{}')}, extendEnv: false })`
})

export const ChildProcessInteractiveCommandTemplate = defineTemplate({
	modelId: 'ChildProcessInteractiveCommand', version: VERSION,
	description: 'Builds an interactive direct command that inherits the parent standard streams.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }), cwd: effectValueInput('Working directory.', { ts: 'string | undefined' }) },
	output: expressionOutput('Interactive command.', childProcessCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"tool"')}, ${marker('expression', 'args', '[]')}, { cwd: ${marker('expression', 'cwd', 'undefined')}, stdin: "inherit", stdout: "inherit", stderr: "inherit" })`
})

export const NodeChildProcessMainTemplate = defineTemplate({
	modelId: 'NodeChildProcessMain', version: VERSION,
	description: 'Runs a closed child-process program on Node.js with NodeServices providing ChildProcessSpawner and NodeRuntime managing process signals.',
	typeParameters: typeParameters(['A', 'Program success type.'], ['E', 'Program error type.']),
	inputs: { program: effectSourceInput('Program requiring only the child-process platform service.', effectType('{{A}}', '{{E}}', childProcessSpawnerRequirement)) },
	output: statementOutput('Node child-process application entry point.'),
	source: `NodeRuntime.runMain(${marker('expression', 'program', 'Effect.void')}.pipe(Effect.provide(NodeServices.layer)))`
})

export const BunChildProcessMainTemplate = defineTemplate({
	modelId: 'BunChildProcessMain', version: VERSION,
	description: 'Runs a closed child-process program on Bun with BunServices providing ChildProcessSpawner and BunRuntime managing teardown.',
	typeParameters: typeParameters(['A', 'Program success type.'], ['E', 'Program error type.']),
	inputs: { program: effectSourceInput('Program requiring only the child-process platform service.', effectType('{{A}}', '{{E}}', childProcessSpawnerRequirement)) },
	output: statementOutput('Bun child-process application entry point.'),
	source: `BunRuntime.runMain(${marker('expression', 'program', 'Effect.void')}.pipe(Effect.provide(BunServices.layer)))`
})

export const NodeChildProcessSourceFileTemplate = defineTemplate({
	modelId: 'NodeChildProcessSourceFile', version: VERSION,
	description: 'Builds a complete Node.js child-process integration source file using the public Effect process barrel.',
	inputs: { body: statementCollectionInput('Command declarations, services, Layers, and main invocation.') },
	output: { kind: 'sourceFile', description: 'Complete Node.js child-process application source file.' },
	source: `import { Context, Effect, Layer, Schema, Sink, Stream } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { NodeRuntime, NodeServices } from "@effect/platform-node"

${marker('statement', 'body', 'NodeRuntime.runMain(Effect.void)')}`
})

export const BunChildProcessSourceFileTemplate = defineTemplate({
	modelId: 'BunChildProcessSourceFile', version: VERSION,
	description: 'Builds a complete Bun child-process integration source file using the public Effect process barrel.',
	inputs: { body: statementCollectionInput('Command declarations, services, Layers, and main invocation.') },
	output: { kind: 'sourceFile', description: 'Complete Bun child-process application source file.' },
	source: `import { Context, Effect, Layer, Schema, Sink, Stream } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { BunRuntime, BunServices } from "@effect/platform-bun"

${marker('statement', 'body', 'BunRuntime.runMain(Effect.void)')}`
})

export const NodeCliChildProcessSourceFileTemplate = defineTemplate({
	modelId: 'NodeCliChildProcessSourceFile', version: VERSION,
	description: 'Builds a Node.js source-file root for CLI commands whose handlers invoke child processes.',
	inputs: { body: statementCollectionInput('CLI declarations, child-process handlers, service Layers, and main invocation.') },
	output: { kind: 'sourceFile', description: 'Complete Node CLI + child-process source file.' },
	source: `import { Config, Context, Effect, Layer, Redacted, Schema, Sink, Stream } from "effect"
import { Argument, Command, Flag, Prompt } from "effect/unstable/cli"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { NodeRuntime, NodeServices } from "@effect/platform-node"

${marker('statement', 'body', 'NodeRuntime.runMain(Effect.void)')}`
})

export const effectV4ChildProcessOsIntegrationCompositionTemplateInputs = [
	ChildProcessCheckedExitTemplate,
	ChildProcessCaptureOutputTemplate,
	ChildProcessCaptureLinesTemplate,
	ChildProcessPipelineStringTemplate,
	ChildProcessObservedCommandTemplate,
	ChildProcessObservedLineStreamTemplate,
	ChildProcessJsonOutputTemplate,
	ChildProcessGracefulTerminateTemplate,
	ChildProcessScopedWaitTemplate,
	ChildProcessBackgroundLayerTemplate,
	ChildProcessCommandServiceLayerTemplate,
	ChildProcessParallelExitCodesTemplate,
	ChildProcessCliHandlerTemplate,
	ChildProcessIsolatedEnvironmentCommandTemplate,
	ChildProcessInteractiveCommandTemplate,
	NodeChildProcessMainTemplate,
	BunChildProcessMainTemplate,
	NodeChildProcessSourceFileTemplate,
	BunChildProcessSourceFileTemplate,
	NodeCliChildProcessSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
