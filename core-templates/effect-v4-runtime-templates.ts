import { defineTemplate } from './sample-definition.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	managedRuntimeType,
	marker,
	nominalType,
	typeParameters,
	typedExpressionInput
} from './effect-template-helpers.js'

const contextType = (services = 'unknown') =>
	nominalType('effect/Context', { contextServices: services })

const fiberType = (success = 'unknown', error = 'unknown') =>
	nominalType('effect/Fiber', { fiberSuccess: success, fiberError: error })

const runtimeInput = (requirements = 'unknown', error = 'unknown') =>
	typedExpressionInput('ManagedRuntime used to execute the Effect.', managedRuntimeType(requirements, error))

const contextInput = (requirements = 'unknown') =>
	typedExpressionInput('Context supplying the Effect requirements.', contextType(requirements))

export const NodeRuntimeRunMainTemplate = defineTemplate({
	modelId: 'NodeRuntimeRunMain',
	version: '1.0.0',
	description: 'Runs a fully provided Effect as the Node.js application entry point with graceful interruption teardown.',
	typeParameters: typeParameters(['A', 'Application success type.'], ['E', 'Application error type.']),
	inputs: { source: effectSourceInput('Fully provided application Effect.', effectType('{{A}}', '{{E}}', 'never')) },
	output: { kind: 'statement', description: 'NodeRuntime.runMain application entry-point statement.' },
	source: `NodeRuntime.runMain(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectRunSyncWithTemplate = defineTemplate({
	modelId: 'EffectRunSyncWith',
	version: '1.0.0',
	description: 'Runs an Effect synchronously with an explicit Context using the V4 runSyncWith API.',
	typeParameters: typeParameters(['A', 'Effect success type.'], ['E', 'Effect expected error type.'], ['R', 'Effect requirements.']),
	inputs: {
		context: contextInput('{{R}}'),
		source: effectSourceInput('Effect whose requirements are supplied by the Context.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Synchronous success value.', { ts: '{{A}}' }),
	source: `Effect.runSyncWith(${marker('expression', 'context', 'Context.empty()')})(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectRunPromiseWithTemplate = defineTemplate({
	modelId: 'EffectRunPromiseWith',
	version: '1.0.0',
	description: 'Runs an Effect asynchronously with an explicit Context using the V4 runPromiseWith API.',
	typeParameters: typeParameters(['A', 'Effect success type.'], ['E', 'Effect expected error type.'], ['R', 'Effect requirements.']),
	inputs: {
		context: contextInput('{{R}}'),
		source: effectSourceInput('Effect whose requirements are supplied by the Context.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Promise of the Effect success value.', { ts: 'Promise<{{A}}>' }),
	source: `Effect.runPromiseWith(${marker('expression', 'context', 'Context.empty()')})(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectRunForkWithTemplate = defineTemplate({
	modelId: 'EffectRunForkWith',
	version: '1.0.0',
	description: 'Forks an Effect with an explicit Context using the V4 runForkWith API.',
	typeParameters: typeParameters(['A', 'Effect success type.'], ['E', 'Effect expected error type.'], ['R', 'Effect requirements.']),
	inputs: {
		context: contextInput('{{R}}'),
		source: effectSourceInput('Effect whose requirements are supplied by the Context.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Runtime Fiber.', fiberType('{{A}}', '{{E}}')),
	source: `Effect.runForkWith(${marker('expression', 'context', 'Context.empty()')})(${marker('expression', 'source', 'Effect.void')})`
})

export const ManagedRuntimeRunSyncTemplate = defineTemplate({
	modelId: 'ManagedRuntimeRunSync',
	version: '1.0.0',
	description: 'Runs an Effect synchronously through a reusable ManagedRuntime.',
	typeParameters: typeParameters(
		['A', 'Effect success type.'],
		['E', 'Effect expected error type.'],
		['R', 'Requirements supplied by the ManagedRuntime.'],
		['ERuntime', 'ManagedRuntime layer construction error type.']
	),
	inputs: {
		runtime: runtimeInput('{{R}}', '{{ERuntime}}'),
		source: effectSourceInput('Effect executed by the ManagedRuntime.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Synchronous success value.', { ts: '{{A}}' }),
	source: `${marker('expression', 'runtime', 'ManagedRuntime.make(Layer.empty)')}.runSync(${marker('expression', 'source', 'Effect.void')})`
})

export const ManagedRuntimeRunPromiseTemplate = defineTemplate({
	modelId: 'ManagedRuntimeRunPromise',
	version: '1.0.0',
	description: 'Runs an Effect asynchronously through a reusable ManagedRuntime.',
	typeParameters: typeParameters(
		['A', 'Effect success type.'],
		['E', 'Effect expected error type.'],
		['R', 'Requirements supplied by the ManagedRuntime.'],
		['ERuntime', 'ManagedRuntime layer construction error type.']
	),
	inputs: {
		runtime: runtimeInput('{{R}}', '{{ERuntime}}'),
		source: effectSourceInput('Effect executed by the ManagedRuntime.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Promise of the Effect success value.', { ts: 'Promise<{{A}}>' }),
	source: `${marker('expression', 'runtime', 'ManagedRuntime.make(Layer.empty)')}.runPromise(${marker('expression', 'source', 'Effect.void')})`
})

export const ManagedRuntimeDisposeEffectTemplate = defineTemplate({
	modelId: 'ManagedRuntimeDisposeEffect',
	version: '1.0.0',
	description: 'Returns the Effect that disposes a ManagedRuntime and releases its resources.',
	typeParameters: typeParameters(['R', 'Requirements supplied by the ManagedRuntime.'], ['ERuntime', 'ManagedRuntime layer construction error type.']),
	inputs: { runtime: runtimeInput('{{R}}', '{{ERuntime}}') },
	output: expressionOutput('ManagedRuntime disposal Effect.', effectType('void', 'never', 'never')),
	source: `${marker('expression', 'runtime', 'ManagedRuntime.make(Layer.empty)')}.disposeEffect`
})

export const ManagedRuntimeDisposePromiseTemplate = defineTemplate({
	modelId: 'ManagedRuntimeDisposePromise',
	version: '1.0.0',
	description: 'Disposes a ManagedRuntime from a Promise-based integration boundary.',
	typeParameters: typeParameters(['R', 'Requirements supplied by the ManagedRuntime.'], ['ERuntime', 'ManagedRuntime layer construction error type.']),
	inputs: { runtime: runtimeInput('{{R}}', '{{ERuntime}}') },
	output: expressionOutput('Promise that completes when the ManagedRuntime is disposed.', { ts: 'Promise<void>' }),
	source: `${marker('expression', 'runtime', 'ManagedRuntime.make(Layer.empty)')}.dispose()`
})


export const ConsoleLogTemplate = defineTemplate({
	modelId: 'ConsoleLog',
	version: '1.0.0',
	description: "Logs a value through Effect's default Console service.",
	inputs: { message: effectValueInput('Value to log.') },
	output: expressionOutput('Console logging Effect.', effectType('void', 'never', 'never')),
	source: `Console.log(${marker('expression', 'message', '""')})`
})

export const RandomNextTemplate = defineTemplate({
	modelId: 'RandomNext',
	version: '1.0.0',
	inputs: {},
	description: "Reads the next number from Effect's default Random service.",
	output: expressionOutput('Random-number Effect.', effectType('number', 'never', 'never')),
	source: 'Random.next'
})

export const effectV4RuntimeGraphTemplateInputs = [
	NodeRuntimeRunMainTemplate,
	EffectRunSyncWithTemplate,
	EffectRunPromiseWithTemplate,
	EffectRunForkWithTemplate,
	ManagedRuntimeRunSyncTemplate,
	ManagedRuntimeRunPromiseTemplate,
	ManagedRuntimeDisposeEffectTemplate,
	ManagedRuntimeDisposePromiseTemplate,
	ConsoleLogTemplate,
	RandomNextTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
