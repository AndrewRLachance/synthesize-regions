import { fragmentCollectionPort } from 'synthesize-regions'
import { defineTemplate } from '../../../authoring/define-template.js'
import {
	effectDurationInput,
	effectSourceInput,
	effectType,
	effectValueInput
} from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	nominalType,
	statementOutput,
	stringInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'

/**
 * Effect v4 testing foundations.
 *
 * Runtime contract:
 *   import {
 *     Clock, Console, Context, Deferred, Duration, Effect, Exit, Fiber, Layer,
 *     Option, PubSub, Queue, Random, Ref, Result, Schedule, Stream
 *   } from 'effect'
 *   import { TestClock, TestConsole } from 'effect/testing'
 *   import { assert, describe, it, layer } from '@effect/vitest'
 */

const VERSION = '2.0.0' as const
const scopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'

const testClockType = () => nominalType('effect/testing/TestClock')
const testConsoleType = () => nominalType('effect/testing/TestConsole')

const layerInput = (
	description: string,
	provided = 'unknown',
	error = 'unknown',
	requirements = 'unknown'
) => typedExpressionInput(description, layerType(provided, error, requirements))

export const EffectVitestEffectTestTemplate = defineTemplate({
	modelId: 'EffectVitestEffectTest',
	version: VERSION,
	description: 'Declares an @effect/vitest it.effect test with TestClock, TestConsole, and a per-test Scope supplied automatically.',
	typeParameters: typeParameters(
		['A', 'Test success type.'],
		['E', 'Test error type.']
	),
	inputs: {
		name: stringInput('Test name.'),
		body: effectSourceInput('Effectful test body.', effectType('{{A}}', '{{E}}', scopeRequirement))
	},
	output: statementOutput('@effect/vitest it.effect declaration.'),
	source: `it.effect(${marker('string', 'name', '"works"')}, () => ${marker('expression', 'body', 'Effect.void')})`
})

export const EffectVitestLiveTestTemplate = defineTemplate({
	modelId: 'EffectVitestLiveTest',
	version: VERSION,
	description: 'Declares an @effect/vitest it.live test that uses live default services while still supplying a per-test Scope.',
	typeParameters: typeParameters(
		['A', 'Test success type.'],
		['E', 'Test error type.']
	),
	inputs: {
		name: stringInput('Test name.'),
		body: effectSourceInput('Effectful live-service test body.', effectType('{{A}}', '{{E}}', scopeRequirement))
	},
	output: statementOutput('@effect/vitest it.live declaration.'),
	source: `it.live(${marker('string', 'name', '"works with live services"')}, () => ${marker('expression', 'body', 'Effect.void')})`
})

export const EffectVitestLayerSuiteTemplate = defineTemplate({
	modelId: 'EffectVitestLayerSuite',
	version: VERSION,
	description: 'Shares a closed Layer across a group of @effect/vitest effect tests.',
	typeParameters: typeParameters(
		['P', 'Services supplied to every test in the suite.'],
		['E', 'Shared Layer construction error type.']
	),
	inputs: {
		name: stringInput('Suite name.'),
		layer: layerInput('Closed Layer shared by the suite.', '{{P}}', '{{E}}', 'never'),
		body: fragmentCollectionPort({
			regionKind: 'statement',
			accepts: { outputKind: 'statement' },
			minItems: 1,
			separator: '\n',
			description: 'Tests declared with the suite-local it value.'
		})
	},
	output: statementOutput('@effect/vitest shared-Layer test suite.'),
	source: `layer(${marker('expression', 'layer', 'Layer.empty')})(${marker('string', 'name', '"service"')}, (it) => {\n${marker('statement', 'body', 'it.effect("works", () => Effect.void)')}\n})`
})

export const EffectVitestEffectPropertyTemplate = defineTemplate({
	modelId: 'EffectVitestEffectProperty',
	version: VERSION,
	description: 'Declares an effectful @effect/vitest property test from Schema or Arbitrary inputs.',
	typeParameters: typeParameters(
		['A', 'Generated property input type.'],
		['E', 'Property Effect error type.']
	),
	inputs: {
		name: stringInput('Property-test name.'),
		arbitraries: valueInput('Schema / Arbitrary collection consumed by it.effect.prop.'),
		property: callbackInput(
			'Effectful property function. Returning false falsifies the property.',
			effectReturningCallbackType('value: {{A}}', 'boolean', '{{E}}', scopeRequirement)
		)
	},
	output: statementOutput('@effect/vitest effectful property-test declaration.'),
	source: `it.effect.prop(${marker('string', 'name', '"property"')}, ${marker('expression', 'arbitraries', '[]')}, ${marker('expression', 'property', '() => Effect.succeed(true)')})`
})

/**
 * V2 replacement for the earlier TestClockAdjust template. The API lives in
 * effect/testing in Effect v4 and is already supplied by it.effect.
 */
export const TestClockAdjustTemplate = defineTemplate({
	modelId: 'TestClockAdjust',
	version: VERSION,
	description: 'Advances the deterministic Effect v4 TestClock and runs all sleeps scheduled at or before the resulting time.',
	inputs: {
		duration: effectDurationInput('Amount of simulated time to advance.')
	},
	output: expressionOutput('TestClock adjustment Effect.', effectType('void', 'never', 'never')),
	source: `TestClock.adjust(${marker('expression', 'duration', '"1 second"')})`
})

export const TestClockSetTimeTemplate = defineTemplate({
	modelId: 'TestClockSetTime',
	version: VERSION,
	description: 'Sets the deterministic TestClock wall time to an exact Unix timestamp in milliseconds.',
	inputs: {
		timestamp: effectValueInput('Unix timestamp in milliseconds.', { ts: 'number' })
	},
	output: expressionOutput('TestClock set-time Effect.', effectType('void', 'never', 'never')),
	source: `TestClock.setTime(${marker('expression', 'timestamp', '0')})`
})

export const TestClockWithLiveTemplate = defineTemplate({
	modelId: 'TestClockWithLive',
	version: VERSION,
	description: 'Runs one Effect with the live Clock while the surrounding test continues to use TestClock.',
	typeParameters: typeParameters(
		['A', 'Effect success type.'],
		['E', 'Effect error type.'],
		['R', 'Effect requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect that should observe live time.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Effect using the live Clock.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `TestClock.withLive(${marker('expression', 'source', 'Effect.void')})`
})

export const TestClockLayerTemplate = defineTemplate({
	modelId: 'TestClockLayer',
	version: VERSION,
	description: 'Creates a TestClock Layer for deterministic time outside @effect/vitest it.effect.',
	inputs: {
		options: valueInput('Optional TestClock options such as warningDelay.', { ts: '{ readonly warningDelay?: unknown } | undefined' })
	},
	output: expressionOutput('TestClock Layer.', layerType(testClockType().ts, 'never', 'never')),
	source: `TestClock.layer(${marker('expression', 'options', 'undefined')})`
})

export const TestConsoleLayerTemplate = defineTemplate({
	modelId: 'TestConsoleLayer',
	version: VERSION,
	description: 'Provides an in-memory Console implementation whose log and error calls can be asserted deterministically.',
	inputs: {},
	output: expressionOutput('TestConsole Layer.', layerType(testConsoleType().ts, 'never', 'never')),
	source: 'TestConsole.layer'
})

export const TestConsoleLogLinesTemplate = defineTemplate({
	modelId: 'TestConsoleLogLines',
	version: VERSION,
	description: 'Reads values captured from Console.log by the active TestConsole.',
	inputs: {},
	output: expressionOutput('Captured Console.log values.', effectType('ReadonlyArray<unknown>', 'never', 'never')),
	source: 'TestConsole.logLines'
})

export const TestConsoleErrorLinesTemplate = defineTemplate({
	modelId: 'TestConsoleErrorLines',
	version: VERSION,
	description: 'Reads values captured from Console.error by the active TestConsole.',
	inputs: {},
	output: expressionOutput('Captured Console.error values.', effectType('ReadonlyArray<unknown>', 'never', 'never')),
	source: 'TestConsole.errorLines'
})

export const RandomWithSeedTemplate = defineTemplate({
	modelId: 'RandomWithSeed',
	version: VERSION,
	description: 'Runs an Effect with a deterministic seeded Random implementation.',
	typeParameters: typeParameters(
		['A', 'Effect success type.'],
		['E', 'Effect error type.'],
		['R', 'Effect requirements.']
	),
	inputs: {
		source: effectSourceInput('Effect whose random values should be deterministic.', effectType('{{A}}', '{{E}}', '{{R}}')),
		seed: effectValueInput('Deterministic random seed.', { ts: 'string' })
	},
	output: expressionOutput('Effect using seeded Random.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Random.withSeed(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'seed', '"seed"')})`
})

export const AssertOkTemplate = defineTemplate({
	modelId: 'AssertOk',
	version: VERSION,
	description: 'Declares a truthiness assertion using the assert export from @effect/vitest.',
	inputs: {
		condition: effectValueInput('Condition expected to be truthy.', { ts: 'unknown' })
	},
	output: statementOutput('Truthiness assertion statement.'),
	source: `assert.ok(${marker('expression', 'condition', 'true')})`
})

export const AssertStrictEqualTemplate = defineTemplate({
	modelId: 'AssertStrictEqual',
	version: VERSION,
	description: 'Declares a strict-equality assertion using @effect/vitest assert.',
	typeParameters: typeParameters(['A', 'Compared value type.']),
	inputs: {
		actual: valueInput('Actual value.', { ts: '{{A}}' }),
		expected: valueInput('Expected value.', { ts: '{{A}}' })
	},
	output: statementOutput('Strict-equality assertion statement.'),
	source: `assert.strictEqual(${marker('expression', 'actual', 'undefined')}, ${marker('expression', 'expected', 'undefined')})`
})

export const AssertDeepStrictEqualTemplate = defineTemplate({
	modelId: 'AssertDeepStrictEqual',
	version: VERSION,
	description: 'Declares a deep strict-equality assertion using @effect/vitest assert.',
	inputs: {
		actual: valueInput('Actual value.'),
		expected: valueInput('Expected value.')
	},
	output: statementOutput('Deep-equality assertion statement.'),
	source: `assert.deepStrictEqual(${marker('expression', 'actual', 'undefined')}, ${marker('expression', 'expected', 'undefined')})`
})

export const EffectVitestSourceFileTemplate = defineTemplate({
	modelId: 'EffectVitestSourceFile',
	version: VERSION,
	description: 'Builds a complete Effect v4 Vitest source file with common testing, concurrency, and stream modules in scope.',
	inputs: {
		body: fragmentCollectionPort({
			regionKind: 'statement',
			accepts: { outputKind: 'statement' },
			minItems: 1,
			separator: '\n\n',
			description: 'Top-level test declarations, test services, and helper declarations.'
		})
	},
	output: {
		kind: 'sourceFile',
		description: 'Complete Effect v4 @effect/vitest test source file.'
	},
	source: `import { Clock, Console, Context, Deferred, Duration, Effect, Exit, Fiber, Layer, Option, PubSub, Queue, Random, Ref, Result, Schedule, Stream } from "effect"\nimport { TestClock, TestConsole } from "effect/testing"\nimport { assert, describe, it, layer } from "@effect/vitest"\n\n${marker('statement', 'body', 'it.effect("works", () => Effect.void)')}`
})

export const effectV4TestingFoundationalGraphTemplateInputs = [
	EffectVitestEffectTestTemplate,
	EffectVitestLiveTestTemplate,
	EffectVitestLayerSuiteTemplate,
	EffectVitestEffectPropertyTemplate,
	TestClockAdjustTemplate,
	TestClockSetTimeTemplate,
	TestClockWithLiveTemplate,
	TestClockLayerTemplate,
	TestConsoleLayerTemplate,
	TestConsoleLogLinesTemplate,
	TestConsoleErrorLinesTemplate,
	RandomWithSeedTemplate,
	AssertOkTemplate,
	AssertStrictEqualTemplate,
	AssertDeepStrictEqualTemplate,
	EffectVitestSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
