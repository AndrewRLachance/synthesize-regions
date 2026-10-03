import { defineTemplate } from './sample-definition.js'
import {
	fragmentCollectionPort,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from '../src/templates.js'
import type {
	FragmentCollectionInputPort,
	InputPort,
	OutputPort,
	RawCodePolicy,
	TemplateTypeParameterDefinition,
	TypeDescriptor
} from '../src/templates.js'
import type { GraphTemplateDefinitionInput } from '../src/templates/definition.js'

export type AnyEffectGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
	string,
	Record<string, InputPort>,
	OutputPort,
	Record<string, TemplateTypeParameterDefinition> | undefined
>

export const effectExpressionPolicy: RawCodePolicy = {
	description: 'Single-line Effect value or ordinary value expression. Module loading and ambient escape hatches are rejected.',
	maxLength: 900,
	allowNewlines: false,
	forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval']
}

export const effectCallbackPolicy: RawCodePolicy = {
	description: 'Callback or lazy thunk supplied to an Effect constructor or combinator. Module loading and ambient escape hatches are rejected.',
	maxLength: 1800,
	allowNewlines: true,
	forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval']
}

export const EFFECT_NOMINAL_TYPE = 'effect/Effect' as const

export const effectStructuralType = (success: string, error: string, requirements: string): string =>
	`{ readonly pipe: () => unknown; readonly [Symbol.iterator]: () => Iterator<unknown, unknown, unknown>; readonly __effectSuccess?: () => ${success}; readonly __effectError?: () => ${error}; readonly __effectRequirements?: () => ${requirements} }`

/** Self-contained structural contract plus a catalog-level nominal Effect family. */
export const effectType = (
	success = 'unknown',
	error = 'unknown',
	requirements = 'unknown'
): TypeDescriptor & { readonly ts: string } => ({
	nominal: EFFECT_NOMINAL_TYPE,
	ts: effectStructuralType(success, error, requirements)
})

export const anyEffectType = effectType()
export const runnableEffectType = effectType('unknown', 'unknown', 'never')

/**
 * `Result` descriptor for `Effect.result`.
 *
 * Defined here rather than imported from `effect-data-type-template-helpers.js`
 * because that module reaches `effect-template-helpers.js`, which imports this
 * one: importing it back would be a circular dependency. The shape matches the
 * canonical `resultType` exactly.
 */
export const resultType = (success = 'unknown', failure = 'unknown'): TypeDescriptor => ({
	nominal: 'effect/Result',
	ts: `{ readonly pipe: () => unknown; readonly __resultSuccess?: () => ${success}; readonly __resultFailure?: () => ${failure} }`
})

const typeParameter = (description: string): TemplateTypeParameterDefinition => ({
	description,
	constraint: { ts: 'unknown' }
})

const typeParameters = (...entries: ReadonlyArray<readonly [string, string]>): Record<string, TemplateTypeParameterDefinition> =>
	Object.fromEntries(entries.map(([name, description]) => [name, typeParameter(description)]))

const expressionFragment = (description: string, type?: TypeDescriptor) => fragmentPort({
	regionKind: 'expression',
	accepts: { outputKind: 'expression', ...(type ? { type } : {}) },
	description
})

const rawExpression = (description: string, type?: TypeDescriptor) => rawCodePort({
	regionKind: 'expression',
	policy: effectExpressionPolicy,
	...(type ? { type } : {}),
	description
})

const rawCallback = (description: string, type?: TypeDescriptor) => rawCodePort({
	regionKind: 'expression',
	policy: effectCallbackPolicy,
	...(type ? { type } : {}),
	description
})

/** Accept an Effect expression from another graph node or guarded raw source. */
export const effectSourceInput = (description = 'Effect expression.', type: TypeDescriptor = anyEffectType) => unionPort({
	options: [expressionFragment(description, type), rawExpression(description, type)],
	description
})

/** Accept a JSON literal, generated expression, or guarded raw value expression. */
export const effectValueInput = (description = 'Value expression.', type?: TypeDescriptor) => unionPort({
	options: [
		literalPort({
			regionKind: 'expression',
			schema: {
				anyOf: [
					{ type: 'number' },
					{ type: 'boolean' },
					{ type: 'null' },
					{ type: 'array' },
					{ type: 'object' }
				]
			},
			description: `${description} String literals use the explicit { kind: "string", value } replacement form.`
		}),
		expressionFragment(description, type),
		rawExpression(description, type)
	],
	description
})

/** Accept a generated callback expression or guarded multiline raw callback. */
export const effectCallbackInput = (description = 'Callback expression.', type?: TypeDescriptor) => unionPort({
	options: [expressionFragment(description, type), rawCallback(description, type)],
	description
})

/** Accept a generated or guarded raw expression used as an Effect API argument. */
export const effectArgumentInput = (description = 'Effect API argument expression.') => unionPort({
	options: [expressionFragment(description), rawExpression(description)],
	description
})

/** Accept a non-negative millisecond literal or another Effect DurationInput expression. */
export const effectDurationInput = (description = 'Effect duration expression.') => unionPort({
	options: [
		literalPort({
			regionKind: 'expression',
			schema: { type: 'number', minimum: 0 },
			description: `${description} Numeric literals are milliseconds; duration strings may be supplied as guarded raw expressions.`
		}),
		expressionFragment(description),
		rawExpression(description)
	],
	description
})

/** Accept a positive concurrency limit or another Effect Concurrency expression. */
export const effectConcurrencyInput = (description = 'Effect concurrency expression.') => unionPort({
	options: [
		literalPort({
			regionKind: 'expression',
			schema: { type: 'integer', minimum: 1 },
			description: `${description} Use a guarded raw string expression for "unbounded" or "inherit".`
		}),
		expressionFragment(description),
		rawExpression(description)
	],
	description
})

/** Accept a non-empty ordered collection of generated Effect expressions. */
export const effectCollectionInput = (
	description = 'Effect expressions in evaluation order.',
	type: TypeDescriptor = anyEffectType
): FragmentCollectionInputPort =>
	fragmentCollectionPort({
		regionKind: 'expression',
		accepts: { outputKind: 'expression', type },
		minItems: 1,
		separator: ', ',
		description
	})

const marker = (kind: 'expression' | 'identifier' | 'statement' | 'string', id: string, fallback: string): string =>
	`/** @TYPE ${kind} id=${id} **/${fallback}/** @END **/`

const expressionOutput = (description: string, type?: TypeDescriptor) => ({
	kind: 'expression' as const,
	...(type ? { type } : {}),
	description
})

// Constructors ----------------------------------------------------------------

export const EffectSucceedTemplate = defineTemplate({
	modelId: 'EffectSucceed',
	version: '2.0.0',
	description: 'Creates an Effect that succeeds with the supplied value.',
	typeParameters: typeParameters(['A', 'Success value type.']),
	inputs: { value: effectValueInput('Success value.', { ts: '{{A}}' }) },
	output: expressionOutput('Effect produced by Effect.succeed.', effectType('{{A}}', 'never', 'never')),
	source: `Effect.succeed(${marker('expression', 'value', 'undefined')})`
})

export const EffectFailTemplate = defineTemplate({
	modelId: 'EffectFail',
	version: '2.0.0',
	description: 'Creates an Effect that fails with the supplied expected error.',
	typeParameters: typeParameters(['E', 'Expected error type.']),
	inputs: { error: effectValueInput('Expected failure value.', { ts: '{{E}}' }) },
	output: expressionOutput('Effect produced by Effect.fail.', effectType('never', '{{E}}', 'never')),
	source: `Effect.fail(${marker('expression', 'error', 'undefined')})`
})

export const EffectSyncTemplate = defineTemplate({
	modelId: 'EffectSync',
	version: '2.0.0',
	description: 'Lifts a non-throwing synchronous thunk into Effect.',
	typeParameters: typeParameters(['A', 'Success value type.']),
	inputs: { thunk: effectCallbackInput('Non-throwing zero-argument thunk.', { ts: '() => {{A}}' }) },
	output: expressionOutput('Effect produced by Effect.sync.', effectType('{{A}}', 'never', 'never')),
	source: `Effect.sync(${marker('expression', 'thunk', '() => undefined')})`
})

export const EffectTryTemplate = defineTemplate({
	modelId: 'EffectTry',
	version: '2.0.0',
	description: 'Lifts a potentially throwing synchronous thunk into Effect using UnknownException.',
	typeParameters: typeParameters(['A', 'Success value type.']),
	inputs: { thunk: effectCallbackInput('Potentially throwing zero-argument thunk.', { ts: '() => {{A}}' }) },
	output: expressionOutput('Effect produced by Effect.try.', effectType('{{A}}', 'unknown', 'never')),
	source: `Effect.try(${marker('expression', 'thunk', '() => undefined')})`
})

export const EffectPromiseTemplate = defineTemplate({
	modelId: 'EffectPromise',
	version: '2.0.0',
	description: 'Lifts a non-rejecting Promise-returning thunk into Effect.',
	typeParameters: typeParameters(['A', 'Promise success value type.']),
	inputs: { thunk: effectCallbackInput('Non-rejecting Promise-returning thunk.', { ts: '() => PromiseLike<{{A}}>' }) },
	output: expressionOutput('Effect produced by Effect.promise.', effectType('{{A}}', 'never', 'never')),
	source: `Effect.promise(${marker('expression', 'thunk', '() => Promise.resolve(undefined)')})`
})

export const EffectTryPromiseTemplate = defineTemplate({
	modelId: 'EffectTryPromise',
	version: '2.0.0',
	description: 'Lifts a potentially rejecting Promise-returning thunk into Effect using UnknownException.',
	typeParameters: typeParameters(['A', 'Promise success value type.']),
	inputs: { thunk: effectCallbackInput('Potentially rejecting Promise-returning thunk; it may accept the runtime AbortSignal.', { ts: '(signal: never) => PromiseLike<{{A}}>' }) },
	output: expressionOutput('Effect produced by Effect.tryPromise.', effectType('{{A}}', 'unknown', 'never')),
	source: `Effect.tryPromise(${marker('expression', 'thunk', '() => Promise.resolve(undefined)')})`
})

export const EffectAsyncTemplate = defineTemplate({
	modelId: 'EffectAsync',
	version: '2.0.0',
	description: 'Lifts an interruptible callback registration function into Effect.',
	typeParameters: typeParameters(
		['A', 'Success value type.'],
		['E', 'Expected error type.'],
		['R', 'Required service type.']
	),
	inputs: { register: effectCallbackInput('Registration callback receiving resume and AbortSignal arguments.', {
		ts: `(resume: (effect: ${effectStructuralType('{{A}}', '{{E}}', '{{R}}')}) => void, signal: never) => void`
	}) },
	output: expressionOutput('Effect produced by Effect.callback.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.callback(${marker('expression', 'register', 'resume => resume(Effect.void)')})`
})

export const EffectSuspendTemplate = defineTemplate({
	modelId: 'EffectSuspend',
	version: '2.0.0',
	description: 'Defers creation of an Effect until execution.',
	typeParameters: typeParameters(
		['A', 'Success value type.'], ['E', 'Expected error type.'], ['R', 'Required service type.']
	),
	inputs: { thunk: effectCallbackInput('Zero-argument thunk returning an Effect.', {
		ts: `() => ${effectStructuralType('{{A}}', '{{E}}', '{{R}}')}`
	}) },
	output: expressionOutput('Effect produced by Effect.suspend.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.suspend(${marker('expression', 'thunk', '() => Effect.void')})`
})

export const EffectSleepTemplate = defineTemplate({
	modelId: 'EffectSleep',
	version: '2.0.0',
	description: 'Creates an Effect that sleeps for the supplied duration.',
	inputs: { duration: effectDurationInput('Sleep duration.') },
	output: expressionOutput('Effect produced by Effect.sleep.', effectType('void', 'never', 'never')),
	source: `Effect.sleep(${marker('expression', 'duration', '0')})`
})

// Composition and transforms --------------------------------------------------

export const EffectMapTemplate = defineTemplate({
	modelId: 'EffectMap',
	version: '2.0.0',
	description: 'Transforms the success value of an Effect.',
	typeParameters: typeParameters(
		['A', 'Source success type.'], ['B', 'Mapped success type.'],
		['E', 'Expected error type.'], ['R', 'Required service type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		transform: effectCallbackInput('Pure success-value transformation.', { ts: '(value: {{A}}) => {{B}}' })
	},
	output: expressionOutput('Effect produced by Effect.map.', effectType('{{B}}', '{{E}}', '{{R}}')),
	source: `Effect.map(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'transform', 'value => value')})`
})

export const EffectAsTemplate = defineTemplate({
	modelId: 'EffectAs',
	version: '2.0.0',
	description: 'Replaces an Effect success value with a constant value.',
	typeParameters: typeParameters(
		['A', 'Source success type.'], ['B', 'Replacement success type.'],
		['E', 'Expected error type.'], ['R', 'Required service type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		value: effectValueInput('Replacement success value.', { ts: '{{B}}' })
	},
	output: expressionOutput('Effect produced by Effect.as.', effectType('{{B}}', '{{E}}', '{{R}}')),
	source: `Effect.as(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'value', 'undefined')})`
})

export const EffectTapTemplate = defineTemplate({
	modelId: 'EffectTap',
	version: '2.0.0',
	description: 'Runs a callback or Effect after success while preserving the original success value.',
	typeParameters: typeParameters(
		['A', 'Source success type.'], ['E', 'Source expected error type.'], ['R', 'Source requirement type.'],
		['E2', 'Tap expected error type.'], ['R2', 'Tap requirement type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		tap: effectCallbackInput('Effect-producing success callback.', {
			ts: `(value: {{A}}) => ${effectStructuralType('unknown', '{{E2}}', '{{R2}}')}`
		})
	},
	output: expressionOutput('Effect produced by Effect.tap.', effectType('{{A}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.tap(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'tap', '() => Effect.void')})`
})

export const EffectFlatMapTemplate = defineTemplate({
	modelId: 'EffectFlatMap',
	version: '2.0.0',
	description: 'Sequences a success-dependent Effect-producing callback.',
	typeParameters: typeParameters(
		['A', 'Source success type.'], ['B', 'Next success type.'],
		['E', 'Source expected error type.'], ['R', 'Source requirement type.'],
		['E2', 'Next expected error type.'], ['R2', 'Next requirement type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		transform: effectCallbackInput('Callback returning the next Effect.', {
			ts: `(value: {{A}}) => ${effectStructuralType('{{B}}', '{{E2}}', '{{R2}}')}`
		})
	},
	output: expressionOutput('Effect produced by Effect.flatMap.', effectType('{{B}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.flatMap(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'transform', '() => Effect.void')})`
})

export const EffectZipTemplate = defineTemplate({
	modelId: 'EffectZip',
	version: '2.0.0',
	description: 'Runs two Effects sequentially and returns both success values as a tuple.',
	typeParameters: typeParameters(
		['A', 'Left success type.'], ['B', 'Right success type.'],
		['E', 'Combined expected error type.'], ['R', 'Combined requirement type.']
	),
	inputs: {
		left: effectSourceInput('First Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		right: effectSourceInput('Second Effect.', effectType('{{B}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Effect produced by Effect.zip.', effectType('readonly [{{A}}, {{B}}]', '{{E}}', '{{R}}')),
	source: `Effect.zip(${marker('expression', 'left', 'Effect.void')}, ${marker('expression', 'right', 'Effect.void')})`
})

export const EffectAllTemplate = defineTemplate({
	modelId: 'EffectAll',
	version: '2.0.0',
	description: 'Combines a non-empty ordered collection of Effects with Effect.all.',
	typeParameters: typeParameters(
		['A', 'Combined success element type.'], ['E', 'Combined expected error type.'], ['R', 'Combined requirement type.']
	),
	inputs: { effects: effectCollectionInput(undefined, effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Effect produced by Effect.all.', effectType('ReadonlyArray<{{A}}>', '{{E}}', '{{R}}')),
	source: `Effect.all([${marker('expression', 'effects', 'Effect.void')}])`
})

export const EffectAllConcurrentTemplate = defineTemplate({
	modelId: 'EffectAllConcurrent',
	version: '2.0.0',
	description: 'Combines a non-empty ordered collection of Effects with an explicit concurrency policy.',
	typeParameters: typeParameters(
		['A', 'Combined success element type.'], ['E', 'Combined expected error type.'], ['R', 'Combined requirement type.']
	),
	inputs: {
		effects: effectCollectionInput(undefined, effectType('{{A}}', '{{E}}', '{{R}}')),
		concurrency: effectConcurrencyInput('Maximum concurrent Effects or an Effect concurrency sentinel.')
	},
	output: expressionOutput('Effect produced by concurrent Effect.all.', effectType('ReadonlyArray<{{A}}>', '{{E}}', '{{R}}')),
	source: `Effect.all([${marker('expression', 'effects', 'Effect.void')}], { concurrency: ${marker('expression', 'concurrency', '1')} })`
})

export const EffectRaceTemplate = defineTemplate({
	modelId: 'EffectRace',
	version: '2.0.0',
	description: 'Runs two Effects concurrently and returns the first successful result.',
	typeParameters: typeParameters(
		['A', 'Combined success type.'], ['E', 'Combined expected error type.'], ['R', 'Combined requirement type.']
	),
	inputs: {
		left: effectSourceInput('First racing Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		right: effectSourceInput('Second racing Effect.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Effect produced by Effect.race.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.race(${marker('expression', 'left', 'Effect.void')}, ${marker('expression', 'right', 'Effect.void')})`
})

// Recovery and result inspection ---------------------------------------------

export const EffectCatchAllTemplate = defineTemplate({
	modelId: 'EffectCatchAll',
	version: '2.0.0',
	description: 'Recovers from every expected error with an Effect-producing handler.',
	typeParameters: typeParameters(
		['A', 'Source success type.'], ['E', 'Source expected error type.'], ['R', 'Source requirement type.'],
		['B', 'Recovery success type.'], ['E2', 'Recovery expected error type.'], ['R2', 'Recovery requirement type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		handler: effectCallbackInput('Expected-error recovery handler returning an Effect.', {
			ts: `(error: {{E}}) => ${effectStructuralType('{{B}}', '{{E2}}', '{{R2}}')}`
		})
	},
	output: expressionOutput('Effect produced by Effect.catch.', effectType('{{A}} | {{B}}', '{{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.catch(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'handler', '() => Effect.void')})`
})

export const EffectOrElseTemplate = defineTemplate({
	modelId: 'EffectOrElse',
	version: '2.0.0',
	description: 'Runs a lazy fallback Effect when the source Effect fails.',
	typeParameters: typeParameters(
		['A', 'Source success type.'], ['E', 'Source expected error type.'], ['R', 'Source requirement type.'],
		['B', 'Fallback success type.'], ['E2', 'Fallback expected error type.'], ['R2', 'Fallback requirement type.']
	),
	inputs: {
		source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		fallback: effectCallbackInput('Zero-argument thunk returning the fallback Effect.', {
			ts: `() => ${effectStructuralType('{{B}}', '{{E2}}', '{{R2}}')}`
		})
	},
	output: expressionOutput('Effect produced by Effect.catchCause.', effectType('{{A}} | {{B}}', '{{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.catchCause(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'fallback', '() => Effect.void')})`
})

export const EffectEitherTemplate = defineTemplate({
	modelId: 'EffectEither',
	version: '2.0.0',
	description: 'Exposes an Effect success or expected error as a Result in the success channel.',
	typeParameters: typeParameters(
		['A', 'Source success type.'], ['E', 'Source expected error type.'], ['R', 'Required service type.']
	),
	inputs: { source: effectSourceInput('Source Effect.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Effect produced by Effect.result.', resultType('{{A}}', '{{E}}')),
	source: `Effect.result(${marker('expression', 'source', 'Effect.void')})`
})

// Resources and requirements -------------------------------------------------

export const EffectAcquireReleaseTemplate = defineTemplate({
	modelId: 'EffectAcquireRelease',
	version: '2.0.0',
	description: 'Acquires a scoped resource and registers its infallible release callback.',
	typeParameters: typeParameters(
		['A', 'Acquired resource type.'], ['E', 'Acquisition error type.'], ['R', 'Acquisition requirement type.'],
		['R2', 'Release requirement type.']
	),
	inputs: {
		acquire: effectSourceInput('Resource acquisition Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		release: effectCallbackInput('Release callback receiving the resource and Exit.', {
			ts: `(resource: {{A}}, exit: unknown) => ${effectStructuralType('unknown', 'never', '{{R2}}')}`
		})
	},
	output: expressionOutput('Scoped resource Effect produced by Effect.acquireRelease.', effectType(
		'{{A}}', '{{E}}', '{{R}} | {{R2}} | { readonly __effectScopeRequirement: "Scope" }'
	)),
	source: `Effect.acquireRelease(${marker('expression', 'acquire', 'Effect.void')}, ${marker('expression', 'release', '() => Effect.void')})`
})

export const EffectScopedTemplate = defineTemplate({
	modelId: 'EffectScoped',
	version: '2.0.0',
	description: 'Runs an Effect in a fresh Scope and closes the Scope on completion.',
	typeParameters: typeParameters(
		['A', 'Success type.'], ['E', 'Expected error type.'], ['R', 'Non-Scope requirement type.']
	),
	inputs: { source: effectSourceInput('Effect requiring Scope.', effectType(
		'{{A}}', '{{E}}', '{{R}} | { readonly __effectScopeRequirement: "Scope" }'
	)) },
	output: expressionOutput('Effect produced by Effect.scoped.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.scoped(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectProvideServiceTemplate = defineTemplate({
	modelId: 'EffectProvideService',
	version: '2.0.0',
	description: 'Provides one service implementation to an Effect.',
	typeParameters: typeParameters(
		['A', 'Success type.'], ['E', 'Expected error type.'], ['R', 'Remaining requirement type.'],
		['I', 'Provided service identifier type.'], ['S', 'Provided service implementation type.']
	),
	inputs: {
		source: effectSourceInput('Effect requiring the service.', effectType('{{A}}', '{{E}}', '{{R}} | {{I}}')),
		tag: effectArgumentInput('Context.Service expression identifying the service.'),
		service: effectValueInput('Service implementation expression.', { ts: '{{S}}' })
	},
	output: expressionOutput('Effect produced by Effect.provideService.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.provideService(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'tag', 'Service')}, ${marker('expression', 'service', '{}')})`
})

// Generator composition -------------------------------------------------------

export const EffectGenTemplate = defineTemplate({
	modelId: 'EffectGen',
	version: '2.0.0',
	description: 'Builds an Effect.gen program from a non-empty ordered statement collection.',
	typeParameters: typeParameters(
		['A', 'Program success type.'], ['E', 'Program expected error type.'], ['R', 'Program requirement type.']
	),
	inputs: {
		body: fragmentCollectionPort({
			regionKind: 'statement',
			accepts: { outputKind: 'statement' },
			minItems: 1,
			separator: '\n',
			description: 'Generator statements in execution order.'
		})
	},
	output: expressionOutput('Effect produced by Effect.gen.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.gen(function* () {\n${marker('statement', 'body', 'return undefined;')}\n})`
})

export const EffectGenBindTemplate = defineTemplate({
	modelId: 'EffectGenBind',
	version: '2.0.0',
	description: 'Binds an Effect success value to a const inside Effect.gen.',
	typeParameters: typeParameters(
		['A', 'Yielded success type.'], ['E', 'Yielded expected error type.'], ['R', 'Yielded requirement type.']
	),
	inputs: {
		name: literalPort({
			regionKind: 'identifier',
			schema: { type: 'string', pattern: '^[$A-Za-z_][$A-Za-z0-9_]*$' },
			description: 'Local binding name.'
		}),
		source: effectSourceInput('Effect yielded for its success value.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: { kind: 'statement', description: 'Effect.gen const binding statement.' },
	source: `const ${marker('identifier', 'name', 'value')} = yield* ${marker('expression', 'source', 'Effect.void')};`
})

export const EffectGenYieldTemplate = defineTemplate({
	modelId: 'EffectGenYield',
	version: '2.0.0',
	description: 'Yields an Effect inside Effect.gen and discards its success value.',
	typeParameters: typeParameters(
		['A', 'Discarded success type.'], ['E', 'Yielded expected error type.'], ['R', 'Yielded requirement type.']
	),
	inputs: { source: effectSourceInput('Effect to yield.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: { kind: 'statement', description: 'Effect.gen yield statement.' },
	source: `yield* ${marker('expression', 'source', 'Effect.void')};`
})

export const EffectGenReturnTemplate = defineTemplate({
	modelId: 'EffectGenReturn',
	version: '2.0.0',
	description: 'Returns a success value from an Effect.gen generator body.',
	typeParameters: typeParameters(['A', 'Generator return value type.']),
	inputs: { value: effectValueInput('Generator return value.', { ts: '{{A}}' }) },
	output: { kind: 'statement', description: 'Effect.gen return statement.' },
	source: `return ${marker('expression', 'value', 'undefined')};`
})

// Execution -------------------------------------------------------------------

const runnerTemplate = <const M extends string>(
	modelId: M,
	method: 'runSync' | 'runSyncExit' | 'runPromise' | 'runPromiseExit' | 'runFork',
	description: string,
	resultType: TypeDescriptor
) => defineTemplate({
	modelId,
	version: '2.0.0',
	description,
	typeParameters: typeParameters(['A', 'Effect success type.'], ['E', 'Effect expected error type.']),
	inputs: { source: effectSourceInput(
		'Runnable Effect with all requirements provided.',
		effectType('{{A}}', '{{E}}', 'never')
	) },
	output: expressionOutput(`Result produced by Effect.${method}.`, resultType),
	source: `Effect.${method}(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectRunSyncTemplate = runnerTemplate(
	'EffectRunSync',
	'runSync',
	'Runs a synchronous Effect and returns its success value or throws on failure.',
	{ ts: '{{A}}' }
)
export const EffectRunSyncExitTemplate = runnerTemplate(
	'EffectRunSyncExit',
	'runSyncExit',
	'Runs a synchronous Effect and returns its Exit.',
	{ nominal: 'effect/Exit', ts: 'unknown' }
)
export const EffectRunPromiseTemplate = runnerTemplate(
	'EffectRunPromise',
	'runPromise',
	'Runs an Effect and returns a Promise of its success value.',
	{ ts: 'Promise<{{A}}>' }
)
export const EffectRunPromiseExitTemplate = runnerTemplate(
	'EffectRunPromiseExit',
	'runPromiseExit',
	'Runs an Effect and returns a Promise of its Exit.',
	{ nominal: 'effect/Effect.runPromiseExit', ts: 'Promise<unknown>' }
)
export const EffectRunForkTemplate = runnerTemplate(
	'EffectRunFork',
	'runFork',
	'Runs an Effect in a forked fiber and returns the runtime fiber.',
	{ nominal: 'effect/Fiber', ts: '{ readonly pipe: () => unknown }' }
)

export const effectGraphTemplateInputs = [
	EffectSucceedTemplate,
	EffectFailTemplate,
	EffectSyncTemplate,
	EffectTryTemplate,
	EffectPromiseTemplate,
	EffectTryPromiseTemplate,
	EffectAsyncTemplate,
	EffectSuspendTemplate,
	EffectSleepTemplate,
	EffectMapTemplate,
	EffectAsTemplate,
	EffectTapTemplate,
	EffectFlatMapTemplate,
	EffectZipTemplate,
	EffectAllTemplate,
	EffectAllConcurrentTemplate,
	EffectRaceTemplate,
	EffectCatchAllTemplate,
	EffectOrElseTemplate,
	EffectEitherTemplate,
	EffectAcquireReleaseTemplate,
	EffectScopedTemplate,
	EffectProvideServiceTemplate,
	EffectGenTemplate,
	EffectGenBindTemplate,
	EffectGenYieldTemplate,
	EffectGenReturnTemplate,
	EffectRunSyncTemplate,
	EffectRunSyncExitTemplate,
	EffectRunPromiseTemplate,
	EffectRunPromiseExitTemplate,
	EffectRunForkTemplate
] satisfies readonly AnyEffectGraphTemplateDefinitionInput[]
