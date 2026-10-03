import { defineTemplate } from './sample-definition.js'
import { effectDurationInput, effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	stringInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	childProcessByteSinkType,
	childProcessByteStreamType,
	childProcessCommandOptionsType,
	childProcessCommandType,
	childProcessExitCodeType,
	childProcessHandleType,
	childProcessIdType,
	childProcessPipedCommandType,
	childProcessPlatformError,
	childProcessRerefType,
	childProcessScopeRequirement,
	childProcessSignalType,
	childProcessSpawnerRequirement,
	childProcessSpawnerType,
	childProcessStandardCommandType,
	childProcessStringStreamType
} from './effect-child-process-template-helpers.js'

/**
 * Effect v4 Child Process / OS integration foundations.
 *
 * Runtime contract:
 *   import { Effect, Layer, Sink, Stream } from 'effect'
 *   import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'
 */
const VERSION = '1.0.0' as const

const commandInput = (description: string) => typedExpressionInput(description, childProcessCommandType())
const standardCommandInput = (description: string) => typedExpressionInput(description, childProcessStandardCommandType())
const spawnerInput = (description: string) => typedExpressionInput(description, childProcessSpawnerType())
const handleInput = (description: string) => typedExpressionInput(description, childProcessHandleType())
const byteStreamInput = (description: string) => typedExpressionInput(description, childProcessByteStreamType())
const byteSinkInput = (description: string) => typedExpressionInput(description, childProcessByteSinkType())

export const ChildProcessMakeTemplate = defineTemplate({
	modelId: 'ChildProcessMake', version: VERSION,
	description: 'Creates a standard child-process command from an executable and argument array without invoking a shell.',
	inputs: {
		command: stringInput('Executable name or path.'),
		args: effectValueInput('Argument vector.', { ts: 'readonly string[]' })
	},
	output: expressionOutput('Standard child-process command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"echo"')}, ${marker('expression', 'args', '[]')})`
})

export const ChildProcessMakeWithOptionsTemplate = defineTemplate({
	modelId: 'ChildProcessMakeWithOptions', version: VERSION,
	description: 'Creates a standard command with explicit current V4 CommandOptions.',
	inputs: {
		command: stringInput('Executable name or path.'),
		args: effectValueInput('Argument vector.', { ts: 'readonly string[]' }),
		options: typedExpressionInput('Command execution options.', childProcessCommandOptionsType)
	},
	output: expressionOutput('Configured standard command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"echo"')}, ${marker('expression', 'args', '[]')}, ${marker('expression', 'options', '{}')})`
})

export const ChildProcessPipeToTemplate = defineTemplate({
	modelId: 'ChildProcessPipeTo', version: VERSION,
	description: 'Pipes stdout of one child-process command into stdin of another.',
	inputs: { source: commandInput('Source command.'), destination: commandInput('Destination command.') },
	output: expressionOutput('Piped command.', childProcessPipedCommandType()),
	source: `ChildProcess.pipeTo(${marker('expression', 'source', 'ChildProcess.make("echo", ["hello"])')}, ${marker('expression', 'destination', 'ChildProcess.make("cat", [])')})`
})

export const ChildProcessPipeStderrToTemplate = defineTemplate({
	modelId: 'ChildProcessPipeStderrTo', version: VERSION,
	description: 'Pipes stderr from one command into stdin of another.',
	inputs: { source: commandInput('Source command.'), destination: commandInput('Destination command.') },
	output: expressionOutput('stderr pipeline.', childProcessPipedCommandType()),
	source: `ChildProcess.pipeTo(${marker('expression', 'source', 'ChildProcess.make("echo", ["hello"])')}, ${marker('expression', 'destination', 'ChildProcess.make("cat", [])')}, { from: "stderr" })`
})

export const ChildProcessPipeAllToTemplate = defineTemplate({
	modelId: 'ChildProcessPipeAllTo', version: VERSION,
	description: 'Pipes the interleaved stdout/stderr stream into another command.',
	inputs: { source: commandInput('Source command.'), destination: commandInput('Destination command.') },
	output: expressionOutput('Combined-output pipeline.', childProcessPipedCommandType()),
	source: `ChildProcess.pipeTo(${marker('expression', 'source', 'ChildProcess.make("echo", ["hello"])')}, ${marker('expression', 'destination', 'ChildProcess.make("cat", [])')}, { from: "all" })`
})

export const ChildProcessPipeFdToTemplate = defineTemplate({
	modelId: 'ChildProcessPipeFdTo', version: VERSION,
	description: 'Pipes a custom source file descriptor into a custom destination file descriptor.',
	inputs: {
		source: commandInput('Source command.'), destination: commandInput('Destination command.'),
		fromFd: effectValueInput('Source file descriptor number.', { ts: 'number' }),
		toFd: effectValueInput('Destination file descriptor number.', { ts: 'number' })
	},
	output: expressionOutput('Custom-fd pipeline.', childProcessPipedCommandType()),
	source: `ChildProcess.pipeTo(${marker('expression', 'source', 'ChildProcess.make("echo", ["hello"])')}, ${marker('expression', 'destination', 'ChildProcess.make("cat", [])')}, { from: ChildProcess.fdName(${marker('expression', 'fromFd', '3')}) as \`fd\${number}\`, to: ChildProcess.fdName(${marker('expression', 'toFd', '3')}) as \`fd\${number}\` })`
})

export const ChildProcessPrefixTemplate = defineTemplate({
	modelId: 'ChildProcessPrefix', version: VERSION,
	description: 'Prepends an executable and arguments to a command; for pipelines this affects only the leftmost command.',
	inputs: {
		command: commandInput('Command to prefix.'), prefix: stringInput('Prefix executable.'),
		args: effectValueInput('Prefix arguments.', { ts: 'readonly string[]' })
	},
	output: expressionOutput('Prefixed command.', childProcessCommandType()),
	source: `ChildProcess.prefix(${marker('expression', 'command', 'ChildProcess.make("echo", ["hello"])')}, ${marker('string', 'prefix', '"time"')}, ${marker('expression', 'args', '[]')})`
})

export const ChildProcessSetCwdTemplate = defineTemplate({
	modelId: 'ChildProcessSetCwd', version: VERSION,
	description: 'Sets the working directory of a command or every command in a pipeline.',
	inputs: { command: commandInput('Command.'), cwd: effectValueInput('Working directory.', { ts: 'string' }) },
	output: expressionOutput('Command with working directory.', childProcessCommandType()),
	source: `ChildProcess.setCwd(${marker('expression', 'command', 'ChildProcess.make("pwd")')}, ${marker('expression', 'cwd', '"/tmp"')})`
})

export const ChildProcessSetEnvTemplate = defineTemplate({
	modelId: 'ChildProcessSetEnv', version: VERSION,
	description: 'Merges environment variables into a command or every command in a pipeline.',
	inputs: { command: commandInput('Command.'), env: effectValueInput('Environment variables.', { ts: 'Record<string, string>' }) },
	output: expressionOutput('Command with environment variables.', childProcessCommandType()),
	source: `ChildProcess.setEnv(${marker('expression', 'command', 'ChildProcess.make("env")')}, ${marker('expression', 'env', '{}')})`
})

export const ChildProcessFdNameTemplate = defineTemplate({
	modelId: 'ChildProcessFdName', version: VERSION,
	description: 'Converts a numeric file descriptor to the fdN name accepted by custom process pipes.',
	inputs: { fd: effectValueInput('Numeric file descriptor.', { ts: 'number' }) },
	output: expressionOutput('File-descriptor name.', { ts: '`fd${number}`' }),
	source: `ChildProcess.fdName(${marker('expression', 'fd', '3')})`
})

export const ChildProcessParseFdNameTemplate = defineTemplate({
	modelId: 'ChildProcessParseFdName', version: VERSION,
	description: 'Parses an fdN string back to its numeric file descriptor.',
	inputs: { name: effectValueInput('File-descriptor name.', { ts: 'string' }) },
	output: expressionOutput('Parsed file descriptor or undefined.', { ts: 'number | undefined' }),
	source: `ChildProcess.parseFdName(${marker('expression', 'name', '"fd3"')})`
})

const guardTemplate = (modelId: string, member: string, output: ReturnType<typeof childProcessCommandType>) => defineTemplate({
	modelId, version: VERSION, description: `Checks a value with ChildProcess.${member}.`,
	inputs: { value: valueInput('Value to inspect.') },
	output: expressionOutput('Boolean refinement result.', { ts: 'boolean' }),
	source: `ChildProcess.${member}(${marker('expression', 'value', 'undefined')})`
})
export const ChildProcessIsCommandTemplate = guardTemplate('ChildProcessIsCommand', 'isCommand', childProcessCommandType())
export const ChildProcessIsStandardCommandTemplate = guardTemplate('ChildProcessIsStandardCommand', 'isStandardCommand', childProcessStandardCommandType())
export const ChildProcessIsPipedCommandTemplate = guardTemplate('ChildProcessIsPipedCommand', 'isPipedCommand', childProcessPipedCommandType())

export const ChildProcessSpawnerServiceTemplate = defineTemplate({
	modelId: 'ChildProcessSpawnerService', version: VERSION,
	description: 'Accesses the active ChildProcessSpawner service.',
	inputs: {},
	output: expressionOutput('ChildProcessSpawner service Effect.', effectType(childProcessSpawnerType().ts, 'never', childProcessSpawnerRequirement)),
	source: 'ChildProcessSpawner.ChildProcessSpawner'
})

const spawnerCommandEffectTemplate = (
	modelId: string,
	method: 'exitCode' | 'string' | 'lines',
	success: string,
	description: string,
	optionsSource?: string
) => defineTemplate({
	modelId, version: VERSION, description,
	inputs: { command: commandInput('Command to execute.') },
	output: expressionOutput(description, effectType(success, childProcessPlatformError, childProcessSpawnerRequirement)),
	source: `Effect.gen(function* () { const spawner = yield* ChildProcessSpawner.ChildProcessSpawner; return yield* spawner.${method}(${marker('expression', 'command', 'ChildProcess.make("echo", ["hello"])')}${optionsSource ?? ''}) })`
})

export const ChildProcessSpawnerExitCodeTemplate = spawnerCommandEffectTemplate('ChildProcessSpawnerExitCode', 'exitCode', childProcessExitCodeType().ts, 'Runs a command and returns its exit code.')
export const ChildProcessSpawnerStringTemplate = spawnerCommandEffectTemplate('ChildProcessSpawnerString', 'string', 'string', 'Runs a command and collects stdout as a string.')
export const ChildProcessSpawnerStringWithStderrTemplate = spawnerCommandEffectTemplate('ChildProcessSpawnerStringWithStderr', 'string', 'string', 'Runs a command and collects stdout plus stderr as a string.', ', { includeStderr: true }')
export const ChildProcessSpawnerLinesTemplate = spawnerCommandEffectTemplate('ChildProcessSpawnerLines', 'lines', 'Array<string>', 'Runs a command and collects stdout as lines.')
export const ChildProcessSpawnerLinesWithStderrTemplate = spawnerCommandEffectTemplate('ChildProcessSpawnerLinesWithStderr', 'lines', 'Array<string>', 'Runs a command and collects stdout plus stderr as lines.', ', { includeStderr: true }')

const spawnerCommandStreamTemplate = (
	modelId: string,
	method: 'streamString' | 'streamLines',
	description: string,
	optionsSource?: string
) => defineTemplate({
	modelId, version: VERSION, description,
	inputs: { command: commandInput('Command to execute.') },
	output: expressionOutput(description, childProcessStringStreamType(childProcessSpawnerRequirement)),
	source: `Stream.unwrap(Effect.map(ChildProcessSpawner.ChildProcessSpawner, spawner => spawner.${method}(${marker('expression', 'command', 'ChildProcess.make("echo", ["hello"])')}${optionsSource ?? ''})))`
})
export const ChildProcessSpawnerStreamStringTemplate = spawnerCommandStreamTemplate('ChildProcessSpawnerStreamString', 'streamString', 'Streams command output as decoded string chunks.')
export const ChildProcessSpawnerStreamStringWithStderrTemplate = spawnerCommandStreamTemplate('ChildProcessSpawnerStreamStringWithStderr', 'streamString', 'Streams stdout and stderr as decoded string chunks.', ', { includeStderr: true }')
export const ChildProcessSpawnerStreamLinesTemplate = spawnerCommandStreamTemplate('ChildProcessSpawnerStreamLines', 'streamLines', 'Streams command output line-by-line.')
export const ChildProcessSpawnerStreamLinesWithStderrTemplate = spawnerCommandStreamTemplate('ChildProcessSpawnerStreamLinesWithStderr', 'streamLines', 'Streams stdout and stderr line-by-line.', ', { includeStderr: true }')

export const ChildProcessSpawnerSpawnTemplate = defineTemplate({
	modelId: 'ChildProcessSpawnerSpawn', version: VERSION,
	description: 'Starts a child process and returns a live process handle in the current Scope.',
	inputs: { command: commandInput('Command to spawn.') },
	output: expressionOutput('Scoped child-process handle Effect.', effectType(childProcessHandleType().ts, childProcessPlatformError, `${childProcessSpawnerRequirement} | ${childProcessScopeRequirement}`)),
	source: `Effect.gen(function* () { const spawner = yield* ChildProcessSpawner.ChildProcessSpawner; return yield* spawner.spawn(${marker('expression', 'command', 'ChildProcess.make("echo", ["hello"])')}) })`
})

export const ChildProcessHandlePidTemplate = defineTemplate({
	modelId: 'ChildProcessHandlePid', version: VERSION, description: 'Returns the operating-system PID of a running child process.',
	inputs: { handle: handleInput('Running child-process handle.') },
	output: expressionOutput('Process id.', childProcessIdType()),
	source: `${marker('expression', 'handle', '(undefined as any)')}.pid`
})

const handleStreamTemplate = (modelId: string, member: 'stdout' | 'stderr' | 'all', description: string) => defineTemplate({
	modelId, version: VERSION, description,
	inputs: { handle: handleInput('Running child-process handle.') },
	output: expressionOutput(description, childProcessByteStreamType()),
	source: `${marker('expression', 'handle', '(undefined as any)')}.${member}`
})
export const ChildProcessHandleStdoutTemplate = handleStreamTemplate('ChildProcessHandleStdout', 'stdout', 'Reads child-process stdout as bytes.')
export const ChildProcessHandleStderrTemplate = handleStreamTemplate('ChildProcessHandleStderr', 'stderr', 'Reads child-process stderr as bytes.')
export const ChildProcessHandleAllTemplate = handleStreamTemplate('ChildProcessHandleAll', 'all', 'Reads interleaved stdout and stderr as bytes.')

export const ChildProcessHandleStdinTemplate = defineTemplate({
	modelId: 'ChildProcessHandleStdin', version: VERSION, description: 'Returns the byte Sink connected to child-process stdin.',
	inputs: { handle: handleInput('Running child-process handle.') },
	output: expressionOutput('stdin Sink.', childProcessByteSinkType()),
	source: `${marker('expression', 'handle', '(undefined as any)')}.stdin`
})

const handleEffectTemplate = (modelId: string, member: 'exitCode' | 'isRunning', success: string, description: string) => defineTemplate({
	modelId, version: VERSION, description,
	inputs: { handle: handleInput('Running child-process handle.') },
	output: expressionOutput(description, effectType(success, childProcessPlatformError, 'never')),
	source: `${marker('expression', 'handle', '(undefined as any)')}.${member}`
})
export const ChildProcessHandleExitCodeTemplate = handleEffectTemplate('ChildProcessHandleExitCode', 'exitCode', childProcessExitCodeType().ts, 'Waits for process exit and returns the exit code.')
export const ChildProcessHandleIsRunningTemplate = handleEffectTemplate('ChildProcessHandleIsRunning', 'isRunning', 'boolean', 'Checks whether a child process is still running.')

export const ChildProcessHandleKillTemplate = defineTemplate({
	modelId: 'ChildProcessHandleKill', version: VERSION, description: 'Terminates a child process using its configured/default kill policy.',
	inputs: { handle: handleInput('Running child-process handle.') },
	output: expressionOutput('Process termination Effect.', effectType('void', childProcessPlatformError, 'never')),
	source: `${marker('expression', 'handle', '(undefined as any)')}.kill()`
})

export const ChildProcessHandleKillWithOptionsTemplate = defineTemplate({
	modelId: 'ChildProcessHandleKillWithOptions', version: VERSION, description: 'Terminates a child process with an explicit signal and optional forced-kill delay.',
	inputs: {
		handle: handleInput('Running child-process handle.'),
		signal: effectValueInput('Signal to send.', childProcessSignalType),
		forceKillAfter: effectDurationInput('Duration before escalating termination.')
	},
	output: expressionOutput('Configured process termination Effect.', effectType('void', childProcessPlatformError, 'never')),
	source: `${marker('expression', 'handle', '(undefined as any)')}.kill({ killSignal: ${marker('expression', 'signal', '"SIGTERM"')}, forceKillAfter: ${marker('expression', 'forceKillAfter', '"5 seconds"')} })`
})

export const ChildProcessHandleUnrefTemplate = defineTemplate({
	modelId: 'ChildProcessHandleUnref', version: VERSION,
	description: 'Removes a child process from the parent reference count and returns an Effect that can re-reference it later.',
	inputs: { handle: handleInput('Running child-process handle.') },
	output: expressionOutput('Effect yielding the re-reference Effect.', effectType(childProcessRerefType().ts, childProcessPlatformError, 'never')),
	source: `${marker('expression', 'handle', '(undefined as any)')}.unref`
})

export const ChildProcessHandleGetInputFdTemplate = defineTemplate({
	modelId: 'ChildProcessHandleGetInputFd', version: VERSION, description: 'Returns the Sink connected to an additional child-process input fd.',
	inputs: { handle: handleInput('Running child-process handle.'), fd: effectValueInput('File descriptor number.', { ts: 'number' }) },
	output: expressionOutput('Additional input-fd Sink.', childProcessByteSinkType()),
	source: `${marker('expression', 'handle', '(undefined as any)')}.getInputFd(${marker('expression', 'fd', '3')})`
})

export const ChildProcessHandleGetOutputFdTemplate = defineTemplate({
	modelId: 'ChildProcessHandleGetOutputFd', version: VERSION, description: 'Returns the Stream connected to an additional child-process output fd.',
	inputs: { handle: handleInput('Running child-process handle.'), fd: effectValueInput('File descriptor number.', { ts: 'number' }) },
	output: expressionOutput('Additional output-fd Stream.', childProcessByteStreamType()),
	source: `${marker('expression', 'handle', '(undefined as any)')}.getOutputFd(${marker('expression', 'fd', '3')})`
})

export const ChildProcessSpawnerMakeTemplate = defineTemplate({
	modelId: 'ChildProcessSpawnerMake', version: VERSION,
	description: 'Builds a ChildProcessSpawner service from a scoped spawn implementation; useful for tests and custom runtimes.',
	inputs: {
		spawn: callbackInput('Spawn implementation.', effectReturningCallbackType('command: unknown', childProcessHandleType().ts, childProcessPlatformError, childProcessScopeRequirement))
	},
	output: expressionOutput('ChildProcessSpawner service implementation.', childProcessSpawnerType()),
	source: `ChildProcessSpawner.make(${marker('expression', 'spawn', '() => Effect.die("unimplemented")')})`
})

export const ChildProcessSpawnerLayerTemplate = defineTemplate({
	modelId: 'ChildProcessSpawnerLayer', version: VERSION,
	description: 'Provides a ChildProcessSpawner implementation as a Layer.',
	inputs: { spawner: spawnerInput('ChildProcessSpawner implementation.') },
	output: expressionOutput('ChildProcessSpawner Layer.', layerType(childProcessSpawnerRequirement, 'never', 'never')),
	source: `Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, ${marker('expression', 'spawner', 'ChildProcessSpawner.make(() => Effect.die("unimplemented"))')})`
})

export const ChildProcessMakeInheritedStdioTemplate = defineTemplate({
	modelId: 'ChildProcessMakeInheritedStdio', version: VERSION,
	description: 'Creates a command that inherits parent stdin, stdout, and stderr.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }) },
	output: expressionOutput('Interactive inherited-stdio command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"echo"')}, ${marker('expression', 'args', '[]')}, { stdin: "inherit", stdout: "inherit", stderr: "inherit" })`
})

export const ChildProcessMakeIgnoredStdioTemplate = defineTemplate({
	modelId: 'ChildProcessMakeIgnoredStdio', version: VERSION,
	description: 'Creates a command with stdin, stdout, and stderr ignored.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }) },
	output: expressionOutput('Ignored-stdio command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"echo"')}, ${marker('expression', 'args', '[]')}, { stdin: "ignore", stdout: "ignore", stderr: "ignore" })`
})

export const ChildProcessMakeShellTemplate = defineTemplate({
	modelId: 'ChildProcessMakeShell', version: VERSION,
	description: 'Creates a command executed through an explicit shell. Prefer direct executable+argv for untrusted input.',
	inputs: { command: stringInput('Executable or shell command.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }), shell: effectValueInput('Shell selection.', { ts: 'string | boolean' }) },
	output: expressionOutput('Shell-backed command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"echo"')}, ${marker('expression', 'args', '[]')}, { shell: ${marker('expression', 'shell', 'true')} })`
})

export const ChildProcessMakeDetachedTemplate = defineTemplate({
	modelId: 'ChildProcessMakeDetached', version: VERSION,
	description: 'Creates a detached child process command.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }) },
	output: expressionOutput('Detached command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"sleep"')}, ${marker('expression', 'args', '["10"]')}, { detached: true })`
})

export const ChildProcessMakeWithInputStreamTemplate = defineTemplate({
	modelId: 'ChildProcessMakeWithInputStream', version: VERSION,
	description: 'Creates a command whose stdin is supplied by a byte Stream.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }), stdin: byteStreamInput('Byte Stream for stdin.') },
	output: expressionOutput('Stream-fed command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"cat"')}, ${marker('expression', 'args', '[]')}, { stdin: { stream: ${marker('expression', 'stdin', 'Stream.empty')}, endOnDone: true } })`
})

export const ChildProcessMakeWithStdoutSinkTemplate = defineTemplate({
	modelId: 'ChildProcessMakeWithStdoutSink', version: VERSION,
	description: 'Creates a command whose stdout is drained directly into a byte Sink.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }), stdout: byteSinkInput('Byte Sink for stdout.') },
	output: expressionOutput('stdout-sink command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"echo"')}, ${marker('expression', 'args', '["hello"]')}, { stdout: ${marker('expression', 'stdout', '(undefined as any)') } })`
})

export const ChildProcessMakeWithStderrSinkTemplate = defineTemplate({
	modelId: 'ChildProcessMakeWithStderrSink', version: VERSION,
	description: 'Creates a command whose stderr is drained directly into a byte Sink.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }), stderr: byteSinkInput('Byte Sink for stderr.') },
	output: expressionOutput('stderr-sink command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"echo"')}, ${marker('expression', 'args', '["hello"]')}, { stderr: ${marker('expression', 'stderr', '(undefined as any)')} })`
})

export const ChildProcessMakeWithAdditionalInputFdTemplate = defineTemplate({
	modelId: 'ChildProcessMakeWithAdditionalInputFd', version: VERSION,
	description: 'Creates a command with an additional input file descriptor backed by a Stream.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }), fd: effectValueInput('Additional fd number.', { ts: 'number' }), stream: byteStreamInput('Byte Stream connected to the fd.') },
	output: expressionOutput('Additional-input-fd command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"cat"')}, ${marker('expression', 'args', '[]')}, { additionalFds: { [ChildProcess.fdName(${marker('expression', 'fd', '3')})]: { type: "input" as const, stream: ${marker('expression', 'stream', 'Stream.empty')} } } })`
})

export const ChildProcessMakeWithAdditionalOutputFdTemplate = defineTemplate({
	modelId: 'ChildProcessMakeWithAdditionalOutputFd', version: VERSION,
	description: 'Creates a command with an additional output file descriptor drained into a Sink.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }), fd: effectValueInput('Additional fd number.', { ts: 'number' }), sink: byteSinkInput('Byte Sink connected to the fd.') },
	output: expressionOutput('Additional-output-fd command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"echo"')}, ${marker('expression', 'args', '[]')}, { additionalFds: { [ChildProcess.fdName(${marker('expression', 'fd', '3')})]: { type: "output" as const, sink: ${marker('expression', 'sink', '(undefined as any)')} } } })`
})

export const ChildProcessMakeWithTerminationPolicyTemplate = defineTemplate({
	modelId: 'ChildProcessMakeWithTerminationPolicy', version: VERSION,
	description: 'Creates a command with a default kill signal and forced-kill escalation delay.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }), signal: effectValueInput('Default kill signal.', childProcessSignalType), forceKillAfter: effectDurationInput('Duration before forced termination.') },
	output: expressionOutput('Command with termination policy.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"sleep"')}, ${marker('expression', 'args', '["10"]')}, { killSignal: ${marker('expression', 'signal', '"SIGTERM"')}, forceKillAfter: ${marker('expression', 'forceKillAfter', '"5 seconds"')} })`
})

export const ChildProcessMakeCleanEnvironmentTemplate = defineTemplate({
	modelId: 'ChildProcessMakeCleanEnvironment', version: VERSION,
	description: 'Creates a command using only the supplied environment instead of inheriting the parent environment.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }), env: effectValueInput('Complete child environment.', { ts: 'Record<string, string | undefined>' }) },
	output: expressionOutput('Command with isolated environment.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"env"')}, ${marker('expression', 'args', '[]')}, { env: ${marker('expression', 'env', '{}')}, extendEnv: false })`
})

export const ChildProcessMakeWindowsHiddenTemplate = defineTemplate({
	modelId: 'ChildProcessMakeWindowsHidden', version: VERSION,
	description: 'Creates a command with the Windows console window hidden when supported by the runtime.',
	inputs: { command: stringInput('Executable.'), args: effectValueInput('Arguments.', { ts: 'readonly string[]' }) },
	output: expressionOutput('Windows-hidden command.', childProcessStandardCommandType()),
	source: `ChildProcess.make(${marker('string', 'command', '"cmd"')}, ${marker('expression', 'args', '[]')}, { windowsHide: true })`
})

export const NodeChildProcessEnvironmentLayerTemplate = defineTemplate({
	modelId: 'NodeChildProcessEnvironmentLayer', version: VERSION,
	description: 'Uses the standard Node platform services Layer as the concrete ChildProcessSpawner/runtime environment.',
	inputs: {},
	output: expressionOutput('Node child-process environment Layer.', layerType(childProcessSpawnerRequirement, 'never', 'never')),
	source: 'NodeServices.layer'
})

export const BunChildProcessEnvironmentLayerTemplate = defineTemplate({
	modelId: 'BunChildProcessEnvironmentLayer', version: VERSION,
	description: 'Uses the standard Bun platform services Layer as the concrete ChildProcessSpawner/runtime environment.',
	inputs: {},
	output: expressionOutput('Bun child-process environment Layer.', layerType(childProcessSpawnerRequirement, 'never', 'never')),
	source: 'BunServices.layer'
})

export const effectV4ChildProcessFoundationalTemplateInputs = [
	ChildProcessMakeTemplate,
	ChildProcessMakeWithOptionsTemplate,
	ChildProcessPipeToTemplate,
	ChildProcessPipeStderrToTemplate,
	ChildProcessPipeAllToTemplate,
	ChildProcessPipeFdToTemplate,
	ChildProcessPrefixTemplate,
	ChildProcessSetCwdTemplate,
	ChildProcessSetEnvTemplate,
	ChildProcessFdNameTemplate,
	ChildProcessParseFdNameTemplate,
	ChildProcessIsCommandTemplate,
	ChildProcessIsStandardCommandTemplate,
	ChildProcessIsPipedCommandTemplate,
	ChildProcessSpawnerServiceTemplate,
	ChildProcessSpawnerExitCodeTemplate,
	ChildProcessSpawnerStringTemplate,
	ChildProcessSpawnerStringWithStderrTemplate,
	ChildProcessSpawnerLinesTemplate,
	ChildProcessSpawnerLinesWithStderrTemplate,
	ChildProcessSpawnerStreamStringTemplate,
	ChildProcessSpawnerStreamStringWithStderrTemplate,
	ChildProcessSpawnerStreamLinesTemplate,
	ChildProcessSpawnerStreamLinesWithStderrTemplate,
	ChildProcessSpawnerSpawnTemplate,
	ChildProcessHandlePidTemplate,
	ChildProcessHandleStdoutTemplate,
	ChildProcessHandleStderrTemplate,
	ChildProcessHandleAllTemplate,
	ChildProcessHandleStdinTemplate,
	ChildProcessHandleExitCodeTemplate,
	ChildProcessHandleIsRunningTemplate,
	ChildProcessHandleKillTemplate,
	ChildProcessHandleKillWithOptionsTemplate,
	ChildProcessHandleUnrefTemplate,
	ChildProcessHandleGetInputFdTemplate,
	ChildProcessHandleGetOutputFdTemplate,
	ChildProcessSpawnerMakeTemplate,
	ChildProcessSpawnerLayerTemplate,
	ChildProcessMakeInheritedStdioTemplate,
	ChildProcessMakeIgnoredStdioTemplate,
	ChildProcessMakeShellTemplate,
	ChildProcessMakeDetachedTemplate,
	ChildProcessMakeWithInputStreamTemplate,
	ChildProcessMakeWithStdoutSinkTemplate,
	ChildProcessMakeWithStderrSinkTemplate,
	ChildProcessMakeWithAdditionalInputFdTemplate,
	ChildProcessMakeWithAdditionalOutputFdTemplate,
	ChildProcessMakeWithTerminationPolicyTemplate,
	ChildProcessMakeCleanEnvironmentTemplate,
	ChildProcessMakeWindowsHiddenTemplate,
	NodeChildProcessEnvironmentLayerTemplate,
	BunChildProcessEnvironmentLayerTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
