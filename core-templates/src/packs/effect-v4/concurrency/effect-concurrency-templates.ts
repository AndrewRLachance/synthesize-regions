import { defineTemplate } from '../../../authoring/define-template.js'
import { effectCollectionInput, effectConcurrencyInput, effectSourceInput, effectType, effectValueInput } from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	fiberType,
	marker,
	nominalType,
	typeParameters,
	typedExpressionInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'

const scope = '{ readonly __effectScopeRequirement: "Scope" }'

export const EffectForEachTemplate = defineTemplate({
	modelId: 'EffectForEach', version: '1.0.0', description: 'Traverses an iterable with an Effect-producing callback and explicit concurrency.',
	typeParameters: typeParameters(['A', 'Input element type.'], ['B', 'Result element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { iterable: effectValueInput('Iterable input.', { ts: 'Iterable<{{A}}>' }), body: callbackInput('Effect-producing element callback.', effectReturningCallbackType('value: {{A}}, index: number', '{{B}}', '{{E}}', '{{R}}')), concurrency: effectConcurrencyInput('Traversal concurrency.') },
	output: expressionOutput('Traversal Effect.', effectType('ReadonlyArray<{{B}}>', '{{E}}', '{{R}}')),
	source: `Effect.forEach(${marker('expression', 'iterable', '[]')}, ${marker('expression', 'body', 'value => Effect.succeed(value)')}, { concurrency: ${marker('expression', 'concurrency', '1')} })`
})

export const EffectForkTemplate = defineTemplate({
	modelId: 'EffectFork', version: '1.0.0', description: 'Forks an Effect into a child Fiber.',
	typeParameters: typeParameters(['A', 'Fiber success type.'], ['E', 'Fiber error type.'], ['R', 'Fork requirements.']),
	inputs: { source: effectSourceInput('Effect to fork.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Effect yielding a child Fiber.', effectType(`{ readonly pipe: () => unknown; readonly __fiberSuccess?: () => {{A}}; readonly __fiberError?: () => {{E}} }`, 'never', '{{R}}')),
	source: `Effect.forkChild(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectForkScopedTemplate = defineTemplate({
	modelId: 'EffectForkScoped', version: '1.0.0', description: 'Forks an Effect into a Fiber tied to the current Scope.',
	typeParameters: typeParameters(['A', 'Fiber success type.'], ['E', 'Fiber error type.'], ['R', 'Fork requirements.']),
	inputs: { source: effectSourceInput('Effect to fork.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Scoped Fiber creation Effect.', effectType(`{ readonly pipe: () => unknown; readonly __fiberSuccess?: () => {{A}}; readonly __fiberError?: () => {{E}} }`, 'never', `{{R}} | ${scope}`)),
	source: `Effect.forkScoped(${marker('expression', 'source', 'Effect.void')})`
})

export const FiberJoinTemplate = defineTemplate({
	modelId: 'FiberJoin', version: '1.0.0', description: 'Joins a Fiber and re-enters its success and error channels.',
	typeParameters: typeParameters(['A', 'Fiber success type.'], ['E', 'Fiber error type.']),
	inputs: { fiber: typedExpressionInput('Fiber to join.', fiberType('{{A}}', '{{E}}')) },
	output: expressionOutput('Fiber join Effect.', effectType('{{A}}', '{{E}}', 'never')),
	source: `Fiber.join(${marker('expression', 'fiber', 'fiber')})`
})

export const FiberInterruptTemplate = defineTemplate({
	modelId: 'FiberInterrupt', version: '1.0.0', description: 'Interrupts a Fiber and returns its Exit.',
	typeParameters: typeParameters(['A', 'Fiber success type.'], ['E', 'Fiber error type.']),
	inputs: { fiber: typedExpressionInput('Fiber to interrupt.', fiberType('{{A}}', '{{E}}')) },
	output: expressionOutput('Fiber interruption Effect.', effectType('unknown', 'never', 'never')),
	source: `Fiber.interrupt(${marker('expression', 'fiber', 'fiber')})`
})

export const EffectRaceAllTemplate = defineTemplate({
	modelId: 'EffectRaceAll', version: '1.0.0', description: 'Races a non-empty collection of Effects and returns the first success.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { effects: effectCollectionInput('Effects to race.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Racing Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.raceAll([${marker('expression', 'effects', 'Effect.void')}])`
})

export const EffectMakeSemaphoreTemplate = defineTemplate({
	modelId: 'EffectMakeSemaphore', version: '2.0.0', description: 'Creates a semaphore with the requested permit count.',
	inputs: { permits: effectValueInput('Non-negative permit count.', { ts: 'number' }) },
	output: expressionOutput('Semaphore creation Effect.', effectType('{ readonly pipe: () => unknown }', 'never', 'never')),
	source: `Semaphore.make(${marker('expression', 'permits', '1')})`
})

export const effectConcurrencyGraphTemplateInputs = [
	EffectForEachTemplate, EffectForkTemplate, EffectForkScopedTemplate, FiberJoinTemplate,
	FiberInterruptTemplate, EffectRaceAllTemplate, EffectMakeSemaphoreTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
