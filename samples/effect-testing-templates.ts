import { defineTemplate } from '../src/templates.js'
import { effectDurationInput, effectSourceInput, effectType } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	layerType,
	marker,
	statementOutput,
	stringInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'

const testDeclaration = (modelId: 'EffectVitestTest' | 'EffectVitestScopedTest', method: 'effect' | 'scoped') => defineTemplate({
	modelId, version: '1.0.0', description: `Declares an @effect/vitest ${method} test.`,
	inputs: { name: stringInput('Test name.'), body: effectSourceInput('Test body Effect.') },
	output: statementOutput('@effect/vitest test declaration.'),
	source: `it.${method}(${marker('string', 'name', '"works"')}, () => ${marker('expression', 'body', 'Effect.void')})`
})

export const EffectVitestTestTemplate = testDeclaration('EffectVitestTest', 'effect')
export const EffectVitestScopedTestTemplate = testDeclaration('EffectVitestScopedTest', 'scoped')

export const TestClockAdjustTemplate = defineTemplate({
	modelId: 'TestClockAdjust', version: '1.0.0', description: 'Advances the deterministic Effect TestClock.',
	inputs: { duration: effectDurationInput('Amount of simulated time to advance.') },
	output: expressionOutput('TestClock adjustment Effect.', effectType('void', 'never', 'never')),
	source: `TestClock.adjust(${marker('expression', 'duration', '1000')})`
})

export const TestLayerProvideTemplate = defineTemplate({
	modelId: 'TestLayerProvide', version: '1.0.0', description: 'Provides a test Layer to an Effect under test.',
	typeParameters: typeParameters(['A', 'Test success type.'], ['E', 'Test Effect error type.'], ['R', 'Remaining test requirements.'], ['P', 'Requirements provided by the test Layer.'], ['E2', 'Test Layer error type.'], ['R2', 'Test Layer requirements.']),
	inputs: { source: effectSourceInput('Effect under test.', effectType('{{A}}', '{{E}}', '{{R}} | {{P}}')), layer: typedExpressionInput('Test Layer.', layerType('{{P}}', '{{E2}}', '{{R2}}')) },
	output: expressionOutput('Effect with test Layer provided.', effectType('{{A}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.provide(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'layer', 'Layer.empty')})`
})

export const TestServiceFakeTemplate = defineTemplate({
	modelId: 'TestServiceFake', version: '1.0.0', description: 'Creates an infallible Layer containing a fake service implementation.',
	typeParameters: typeParameters(['I', 'Fake service identifier type.'], ['S', 'Fake service implementation type.']),
	inputs: { tag: typedExpressionInput('Service tag.', tagType('{{I}}', '{{S}}')), fake: valueInput('Fake service implementation.', { ts: '{{S}}' }) },
	output: expressionOutput('Fake service Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'tag', 'Service')}, ${marker('expression', 'fake', '{}')})`
})

export const effectTestingGraphTemplateInputs = [
	EffectVitestTestTemplate, EffectVitestScopedTestTemplate, TestClockAdjustTemplate,
	TestLayerProvideTemplate, TestServiceFakeTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
