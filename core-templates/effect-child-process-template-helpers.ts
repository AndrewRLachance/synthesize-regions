import type { TypeDescriptor } from '../src/templates.js'
import { effectType } from './effect-ts.js'
import { nominalType } from './effect-template-helpers.js'

export const childProcessSpawnerRequirement = '{ readonly __effectChildProcessSpawner: "ChildProcessSpawner" }'
export const childProcessScopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'
export const childProcessPlatformError = '{ readonly _tag?: string; readonly message?: string; readonly module?: string; readonly method?: string }'

export const childProcessCommandType = (): TypeDescriptor =>
	nominalType('effect/unstable/process/ChildProcess.Command')

export const childProcessStandardCommandType = (): TypeDescriptor =>
	nominalType('effect/unstable/process/ChildProcess.StandardCommand')

export const childProcessPipedCommandType = (): TypeDescriptor =>
	nominalType('effect/unstable/process/ChildProcess.PipedCommand')

export const childProcessSpawnerType = (): TypeDescriptor =>
	nominalType('effect/unstable/process/ChildProcessSpawner.ChildProcessSpawner')

export const childProcessHandleType = (): TypeDescriptor =>
	nominalType('effect/unstable/process/ChildProcessSpawner.ChildProcessHandle')

export const childProcessExitCodeType = (): TypeDescriptor & { readonly ts: string } => ({
	nominal: 'effect/process/ChildProcessSpawner.ExitCode',
	ts: 'number'
})

export const childProcessIdType = (): TypeDescriptor => ({
	nominal: 'effect/unstable/process/ChildProcessSpawner.ProcessId',
	ts: 'number'
})

export const childProcessRerefType = (): TypeDescriptor => ({
	nominal: 'effect/process/ChildProcessSpawner.Reref',
	ts: effectType('void', childProcessPlatformError, 'never').ts
})

export const childProcessByteStreamType = (requirements = 'never'): TypeDescriptor =>
	nominalType('effect/Stream', {
		streamSuccess: 'Uint8Array',
		streamError: childProcessPlatformError,
		streamRequirements: requirements
	})

export const childProcessStringStreamType = (requirements = 'never'): TypeDescriptor =>
	nominalType('effect/Stream', {
		streamSuccess: 'string',
		streamError: childProcessPlatformError,
		streamRequirements: requirements
	})

export const childProcessByteSinkType = (): TypeDescriptor => ({
	nominal: 'effect/Sink',
	ts: `{ readonly pipe: () => unknown; readonly __sinkInput?: () => Uint8Array; readonly __sinkError?: () => ${childProcessPlatformError} }`
})

export const childProcessSignalType: TypeDescriptor = {
	ts: '"SIGABRT" | "SIGALRM" | "SIGBUS" | "SIGCHLD" | "SIGCONT" | "SIGFPE" | "SIGHUP" | "SIGILL" | "SIGINT" | "SIGIO" | "SIGIOT" | "SIGKILL" | "SIGPIPE" | "SIGPOLL" | "SIGPROF" | "SIGPWR" | "SIGQUIT" | "SIGSEGV" | "SIGSTKFLT" | "SIGSTOP" | "SIGSYS" | "SIGTERM" | "SIGTRAP" | "SIGTSTP" | "SIGTTIN" | "SIGTTOU" | "SIGUNUSED" | "SIGURG" | "SIGUSR1" | "SIGUSR2" | "SIGVTALRM" | "SIGWINCH" | "SIGXCPU" | "SIGXFSZ" | "SIGBREAK" | "SIGLOST" | "SIGINFO"'
}

export const childProcessCommandOptionsType: TypeDescriptor = {
	nominal: 'effect/unstable/process/ChildProcess.CommandOptions',
	ts: 'Record<string, unknown>'
}
