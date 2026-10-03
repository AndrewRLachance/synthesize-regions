import { defineTemplate } from '../../../authoring/define-template.js'
import { effectSourceInput, effectType } from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	marker,
	nominalType,
	typeParameters,
	typedExpressionInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'

const scopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'
const scopeType = () => nominalType('effect/Scope')
const exitType = (success = 'unknown', error = 'unknown') =>
	nominalType('effect/Exit', { exitSuccess: success, exitError: error })

export const EffectEnsuringTemplate = defineTemplate({
	modelId: 'EffectEnsuring',
	version: '1.0.0',
	description: 'Runs an infallible finalizer after an Effect succeeds, fails, or is interrupted.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.'],
		['R2', 'Finalizer requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect to finalize.', effectType('{{A}}', '{{E}}', '{{R}}')),
		finalizer: effectSourceInput('Infallible finalizer Effect.', effectType('unknown', 'never', '{{R2}}'))
	},
	output: expressionOutput('Effect with guaranteed finalization.', effectType('{{A}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `${marker('expression', 'source', 'Effect.void')}.pipe(Effect.ensuring(${marker('expression', 'finalizer', 'Effect.void')}))`
})

export const EffectOnExitTemplate = defineTemplate({
	modelId: 'EffectOnExit',
	version: '1.0.0',
	description: 'Runs an infallible cleanup effect after completion and exposes the source Exit to the cleanup callback.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source error type.'],
		['R', 'Source requirements.'],
		['R2', 'Cleanup requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect whose completion is observed.', effectType('{{A}}', '{{E}}', '{{R}}')),
		cleanup: callbackInput('Infallible cleanup callback receiving the source Exit.', effectReturningCallbackType('exit: unknown', 'unknown', 'never', '{{R2}}'))
	},
	output: expressionOutput('Effect with completion cleanup.', effectType('{{A}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `${marker('expression', 'source', 'Effect.void')}.pipe(Effect.onExit(${marker('expression', 'cleanup', '() => Effect.void')}))`
})

export const EffectOnErrorTemplate = defineTemplate({
	modelId: 'EffectOnError',
	version: '1.0.0',
	description: 'Runs an infallible cleanup effect when an Effect fails, including interruption or defects.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['E', 'Source expected error type.'],
		['R', 'Source requirements.'],
		['R2', 'Cleanup requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect whose failure is observed.', effectType('{{A}}', '{{E}}', '{{R}}')),
		cleanup: callbackInput('Infallible cleanup callback receiving the failure Cause.', effectReturningCallbackType('cause: unknown', 'unknown', 'never', '{{R2}}'))
	},
	output: expressionOutput('Effect with failure cleanup.', effectType('{{A}}', '{{E}}', '{{R}} | {{R2}}')),
	source: `${marker('expression', 'source', 'Effect.void')}.pipe(Effect.onError(${marker('expression', 'cleanup', '() => Effect.void')}))`
})

export const ScopeMakeTemplate = defineTemplate({
	modelId: 'ScopeMake',
	version: '1.0.0',
	inputs: {},
	description: 'Creates a manually managed Scope.',
	output: expressionOutput('Scope creation Effect.', effectType(scopeType().ts, 'never', 'never')),
	source: 'Scope.make()'
})

export const ScopeAddFinalizerTemplate = defineTemplate({
	modelId: 'ScopeAddFinalizer',
	version: '1.0.0',
	description: 'Registers an infallible finalizer directly on a specific Scope.',
	typeParameters: typeParameters(['R', 'Finalizer requirements.']),
	inputs: {
		scope: typedExpressionInput('Scope that owns the finalizer.', scopeType()),
		finalizer: effectSourceInput('Infallible finalizer Effect.', effectType('unknown', 'never', '{{R}}'))
	},
	output: expressionOutput('Finalizer registration Effect.', effectType('void', 'never', '{{R}}')),
	source: `Scope.addFinalizer(${marker('expression', 'scope', 'undefined')}, ${marker('expression', 'finalizer', 'Effect.void')})`
})

export const ScopeCloseTemplate = defineTemplate({
	modelId: 'ScopeClose',
	version: '1.0.0',
	description: 'Closes a manually managed Scope with an Exit, running its finalizers in reverse registration order.',
	inputs: {
		scope: typedExpressionInput('Scope to close.', scopeType()),
		exit: typedExpressionInput('Exit describing how the Scope is being closed.', exitType())
	},
	output: expressionOutput('Scope-closing Effect.', effectType('void', 'never', 'never')),
	source: `Scope.close(${marker('expression', 'scope', 'undefined')}, ${marker('expression', 'exit', 'Exit.void')})`
})

export const ScopeProvideTemplate = defineTemplate({
	modelId: 'ScopeProvide',
	version: '1.0.0',
	description: 'Runs a Scope-requiring Effect in an explicitly supplied Scope without closing that Scope afterward.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Non-Scope requirements.']),
	inputs: {
		source: effectSourceInput('Effect requiring Scope.', effectType('{{A}}', '{{E}}', `{{R}} | ${scopeRequirement}`)),
		scope: typedExpressionInput('Scope that will own the source resources.', scopeType())
	},
	output: expressionOutput('Effect with its Scope requirement supplied.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'source', 'Effect.void')}.pipe(Scope.provide(${marker('expression', 'scope', 'undefined')}))`
})

export const effectV4ResourceGraphTemplateInputs = [
	EffectEnsuringTemplate,
	EffectOnExitTemplate,
	EffectOnErrorTemplate,
	ScopeMakeTemplate,
	ScopeAddFinalizerTemplate,
	ScopeCloseTemplate,
	ScopeProvideTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
