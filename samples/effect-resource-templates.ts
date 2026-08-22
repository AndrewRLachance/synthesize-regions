import { defineTemplate } from '../src/templates.js'
import { effectSourceInput, effectType } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	marker,
	typeParameters
} from './effect-template-helpers.js'

const scope = '{ readonly __effectScopeRequirement: "Scope" }'

export const EffectAcquireUseReleaseTemplate = defineTemplate({
	modelId: 'EffectAcquireUseRelease', version: '1.0.0', description: 'Acquires, uses, and releases a resource with interruption-safe bracketing.',
	typeParameters: typeParameters(['A', 'Resource type.'], ['E', 'Acquire error type.'], ['R', 'Acquire requirements.'], ['B', 'Use success type.'], ['E2', 'Use error type.'], ['R2', 'Use requirements.'], ['R3', 'Release requirements.']),
	inputs: { acquire: effectSourceInput('Resource acquisition Effect.', effectType('{{A}}', '{{E}}', '{{R}}')), use: callbackInput('Effectful resource use callback.', effectReturningCallbackType('resource: {{A}}', '{{B}}', '{{E2}}', '{{R2}}')), release: callbackInput('Infallible release callback receiving resource and Exit.', effectReturningCallbackType('resource: {{A}}, exit: unknown', 'unknown', 'never', '{{R3}}')) },
	output: expressionOutput('Bracketed resource-use Effect.', effectType('{{B}}', '{{E}} | {{E2}}', '{{R}} | {{R2}} | {{R3}}')),
	source: `Effect.acquireUseRelease(${marker('expression', 'acquire', 'Effect.void')}, ${marker('expression', 'use', '() => Effect.void')}, ${marker('expression', 'release', '() => Effect.void')})`
})

export const EffectAddFinalizerTemplate = defineTemplate({
	modelId: 'EffectAddFinalizer', version: '1.0.0', description: 'Registers an infallible finalizer in the current Scope.',
	typeParameters: typeParameters(['R', 'Finalizer requirements.']),
	inputs: { finalizer: callbackInput('Finalizer callback receiving the Scope Exit.', effectReturningCallbackType('exit: unknown', 'unknown', 'never', '{{R}}')) },
	output: expressionOutput('Scoped finalizer-registration Effect.', effectType('void', 'never', `{{R}} | ${scope}`)),
	source: `Effect.addFinalizer(${marker('expression', 'finalizer', '() => Effect.void')})`
})

export const EffectOnInterruptTemplate = defineTemplate({
	modelId: 'EffectOnInterrupt', version: '1.0.0', description: 'Runs cleanup when an Effect is interrupted.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Source requirements.'], ['R2', 'Cleanup requirements.']),
	inputs: { source: effectSourceInput('Interruptible Effect.', effectType('{{A}}', '{{E}}', '{{R}}')), cleanup: callbackInput('Infallible cleanup callback receiving interrupting FiberIds.', effectReturningCallbackType('fiberIds: unknown', 'unknown', 'never', '{{R2}}')) },
	output: expressionOutput('Effect with interruption cleanup.', effectType('{{A}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `Effect.onInterrupt(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'cleanup', '() => Effect.void')})`
})

export const EffectUninterruptibleMaskTemplate = defineTemplate({
	modelId: 'EffectUninterruptibleMask', version: '1.0.0', description: 'Runs an Effect in an uninterruptible region with a restore function.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { body: callbackInput('Callback receiving restore and returning the masked Effect.') },
	output: expressionOutput('Masked Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.uninterruptibleMask(${marker('expression', 'body', 'restore => restore(Effect.void)')})`
})

export const effectResourceGraphTemplateInputs = [
	EffectAcquireUseReleaseTemplate, EffectAddFinalizerTemplate, EffectOnInterruptTemplate,
	EffectUninterruptibleMaskTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
