import type { TypeDescriptor } from 'synthesize-regions'
import { nominalType } from '../../../authoring/effect-v4/effect-template-helpers.js'

export const cliEnvironmentRequirement = '{ readonly __effectCliEnvironment: "FileSystem | Path | Terminal | ChildProcessSpawner | Stdio" }'
export const promptEnvironmentRequirement = '{ readonly __effectCliPromptEnvironment: "FileSystem | Path | Terminal" }'
export const cliErrorType = '{ readonly _tag: string; readonly message?: string }'
export const terminalQuitErrorType = '{ readonly _tag: "QuitError" }'

export const cliArgumentType = (value = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/cli/Argument', { argumentValue: value })

export const cliFlagType = (value = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/cli/Flag', { flagValue: value })

export const cliPromptType = (value = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/cli/Prompt', { promptValue: value })

export const cliCommandType = (
	name = 'string',
	input = 'unknown',
	contextInput = 'unknown',
	error = 'never',
	requirements = 'never'
): TypeDescriptor => nominalType('effect/unstable/cli/Command', {
	commandName: name,
	commandInput: input,
	commandContextInput: contextInput,
	commandError: error,
	commandRequirements: requirements
})

export const cliFormatterType = (): TypeDescriptor => nominalType('effect/unstable/cli/CliOutput.Formatter')
export const cliGlobalFlagType = (value = 'unknown'): TypeDescriptor => nominalType('effect/unstable/cli/GlobalFlag', { globalFlagValue: value })
