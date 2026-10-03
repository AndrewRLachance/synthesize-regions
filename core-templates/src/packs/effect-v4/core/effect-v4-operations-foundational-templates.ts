import { defineTemplate } from '../../../authoring/define-template.js'
import type { TypeDescriptor } from 'synthesize-regions'
import {
	effectSourceInput,
	effectStructuralType,
	effectType,
	effectValueInput
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'

/**
 * Effect v4 operations foundations: synchronization primitives.
 *
 * These templates model the stable Latch and Semaphore contracts from core.
 *
 * Runtime contract:
 *   import { Effect, Latch, Semaphore } from 'effect'
 */

const VERSION = '1.0.0' as const

const effectOf = (success: string, error = 'never', requirements = 'never') =>
	effectStructuralType(success, error, requirements)

const optionOf = (value: string) =>
	`{ readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: ${value} }`

export type SynchronizationTypeDescriptor = TypeDescriptor & { readonly ts: string }

export const latchType = (): SynchronizationTypeDescriptor => ({
	nominal: 'effect/Latch',
	ts: `{ readonly open: ${effectOf('void')}; readonly release: ${effectOf('void')}; readonly await: ${effectOf('void')}; readonly close: ${effectOf('void')}; readonly whenOpen: <A, E, R>(source: ${effectOf('A', 'E', 'R')}) => ${effectOf('A', 'E', 'R')} }`
})

export const semaphoreType = (): SynchronizationTypeDescriptor => ({
	nominal: 'effect/Semaphore',
	ts: `{ readonly resize: (permits: number) => ${effectOf('void')}; readonly withPermits: (permits: number) => <A, E, R>(source: ${effectOf('A', 'E', 'R')}) => ${effectOf('A', 'E', 'R')}; readonly withPermitsIfAvailable: (permits: number) => <A, E, R>(source: ${effectOf('A', 'E', 'R')}) => ${effectOf(optionOf('A'), 'E', 'R')}; readonly take: (permits: number) => ${effectOf('number')}; readonly release: (permits: number) => ${effectOf('number')}; readonly releaseAll: ${effectOf('number')} }`
})

const latchInput = (description: string) => typedExpressionInput(description, latchType())
const semaphoreInput = (description: string) => typedExpressionInput(description, semaphoreType())
const permitsInput = (description: string) => effectValueInput(description, { ts: 'number' })

export const LatchMakeTemplate = defineTemplate({
	modelId: 'LatchMake',
	version: VERSION,
	description: 'Creates a Latch, optionally open from the start.',
	inputs: { open: effectValueInput('Whether the latch starts open.', { ts: 'boolean' }) },
	output: expressionOutput('Latch creation Effect.', effectType(latchType().ts, 'never', 'never')),
	source: `Latch.make(${marker('expression', 'open', 'false')})`
})

export const LatchOpenTemplate = defineTemplate({
	modelId: 'LatchOpen',
	version: VERSION,
	description: 'Opens a Latch, releasing all current and future waiters.',
	inputs: { latch: latchInput('Latch to open.') },
	output: expressionOutput('Latch open Effect.', effectType('void', 'never', 'never')),
	source: `${marker('expression', 'latch', 'latch')}.open`
})

export const LatchCloseTemplate = defineTemplate({
	modelId: 'LatchClose',
	version: VERSION,
	description: 'Closes a Latch so that waiters block again.',
	inputs: { latch: latchInput('Latch to close.') },
	output: expressionOutput('Latch close Effect.', effectType('void', 'never', 'never')),
	source: `${marker('expression', 'latch', 'latch')}.close`
})

export const LatchAwaitTemplate = defineTemplate({
	modelId: 'LatchAwait',
	version: VERSION,
	description: 'Waits until the Latch is open.',
	inputs: { latch: latchInput('Latch to await.') },
	output: expressionOutput('Latch await Effect.', effectType('void', 'never', 'never')),
	source: `${marker('expression', 'latch', 'latch')}.await`
})

export const LatchReleaseTemplate = defineTemplate({
	modelId: 'LatchRelease',
	version: VERSION,
	description: 'Releases all waiters of an open Latch without closing it.',
	inputs: { latch: latchInput('Latch to release.') },
	output: expressionOutput('Latch release Effect.', effectType('void', 'never', 'never')),
	source: `${marker('expression', 'latch', 'latch')}.release`
})

export const LatchWhenOpenTemplate = defineTemplate({
	modelId: 'LatchWhenOpen',
	version: VERSION,
	description: 'Runs an Effect only once the Latch is open.',
	typeParameters: typeParameters(
		['A', 'Effect success type.'],
		['E', 'Effect error type.'],
		['R', 'Effect requirements.']
	),
	inputs: {
		latch: latchInput('Latch gating the Effect.'),
		source: effectSourceInput('Effect to run once open.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Gated Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'latch', 'latch')}.whenOpen(${marker('expression', 'source', 'Effect.void')})`
})

export const SemaphoreMakeTemplate = defineTemplate({
	modelId: 'SemaphoreMake',
	version: VERSION,
	description: 'Creates a Semaphore with the requested permit count.',
	inputs: { permits: permitsInput('Non-negative permit count.') },
	output: expressionOutput('Semaphore creation Effect.', effectType(semaphoreType().ts, 'never', 'never')),
	source: `Semaphore.make(${marker('expression', 'permits', '1')})`
})

export const SemaphoreWithPermitsTemplate = defineTemplate({
	modelId: 'SemaphoreWithPermits',
	version: VERSION,
	description: 'Runs an Effect holding the requested permits, releasing them afterward.',
	typeParameters: typeParameters(
		['A', 'Effect success type.'],
		['E', 'Effect error type.'],
		['R', 'Effect requirements.']
	),
	inputs: {
		semaphore: semaphoreInput('Semaphore providing the permits.'),
		permits: permitsInput('Number of permits to hold.'),
		source: effectSourceInput('Effect to run with the permits.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Permit-guarded Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'semaphore', 'semaphore')}.withPermits(${marker('expression', 'permits', '1')})(${marker('expression', 'source', 'Effect.void')})`
})

export const SemaphoreWithPermitsIfAvailableTemplate = defineTemplate({
	modelId: 'SemaphoreWithPermitsIfAvailable',
	version: VERSION,
	description: 'Runs an Effect only when the requested permits are immediately available.',
	typeParameters: typeParameters(
		['A', 'Effect success type.'],
		['E', 'Effect error type.'],
		['R', 'Effect requirements.']
	),
	inputs: {
		semaphore: semaphoreInput('Semaphore providing the permits.'),
		permits: permitsInput('Number of permits to acquire.'),
		source: effectSourceInput('Effect to run if the permits are available.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Option-wrapped guarded Effect.', effectType(optionOf('{{A}}'), '{{E}}', '{{R}}')),
	source: `${marker('expression', 'semaphore', 'semaphore')}.withPermitsIfAvailable(${marker('expression', 'permits', '1')})(${marker('expression', 'source', 'Effect.void')})`
})

export const SemaphoreTakeTemplate = defineTemplate({
	modelId: 'SemaphoreTake',
	version: VERSION,
	description: 'Acquires the requested permits, returning the available count.',
	inputs: {
		semaphore: semaphoreInput('Semaphore to acquire permits from.'),
		permits: permitsInput('Number of permits to acquire.')
	},
	output: expressionOutput('Permit acquisition Effect.', effectType('number', 'never', 'never')),
	source: `${marker('expression', 'semaphore', 'semaphore')}.take(${marker('expression', 'permits', '1')})`
})

export const SemaphoreReleaseTemplate = defineTemplate({
	modelId: 'SemaphoreRelease',
	version: VERSION,
	description: 'Releases the requested permits, returning the available count.',
	inputs: {
		semaphore: semaphoreInput('Semaphore to release permits to.'),
		permits: permitsInput('Number of permits to release.')
	},
	output: expressionOutput('Permit release Effect.', effectType('number', 'never', 'never')),
	source: `${marker('expression', 'semaphore', 'semaphore')}.release(${marker('expression', 'permits', '1')})`
})

export const SemaphoreReleaseAllTemplate = defineTemplate({
	modelId: 'SemaphoreReleaseAll',
	version: VERSION,
	description: 'Releases all held permits, returning the available count.',
	inputs: { semaphore: semaphoreInput('Semaphore to release all permits to.') },
	output: expressionOutput('Permit release-all Effect.', effectType('number', 'never', 'never')),
	source: `${marker('expression', 'semaphore', 'semaphore')}.releaseAll`
})

export const SemaphoreResizeTemplate = defineTemplate({
	modelId: 'SemaphoreResize',
	version: VERSION,
	description: 'Adjusts the total permit count of a Semaphore.',
	inputs: {
		semaphore: semaphoreInput('Semaphore to resize.'),
		permits: permitsInput('New non-negative permit count.')
	},
	output: expressionOutput('Semaphore resize Effect.', effectType('void', 'never', 'never')),
	source: `${marker('expression', 'semaphore', 'semaphore')}.resize(${marker('expression', 'permits', '1')})`
})

export const effectV4OperationsFoundationalGraphTemplateInputs = [
	LatchMakeTemplate,
	LatchOpenTemplate,
	LatchCloseTemplate,
	LatchAwaitTemplate,
	LatchReleaseTemplate,
	LatchWhenOpenTemplate,
	SemaphoreMakeTemplate,
	SemaphoreWithPermitsTemplate,
	SemaphoreWithPermitsIfAvailableTemplate,
	SemaphoreTakeTemplate,
	SemaphoreReleaseTemplate,
	SemaphoreReleaseAllTemplate,
	SemaphoreResizeTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
