import {
	defineTemplate,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from 'synthesize-regions'
import type { TypeDescriptor } from 'synthesize-regions'
import {
	effectDurationInput,
	effectExpressionPolicy,
	effectSourceInput,
	effectStructuralType,
	effectType,
	effectValueInput
} from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	layerType,
	marker,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'

/**
 * Deterministic in-process fault injectors for tests.
 *
 * Runtime contract:
 *   import { Effect, Layer, Ref } from 'effect'
 */

const VERSION = '1.0.0' as const

export const faultInjectorType = (faultError = 'unknown'): TypeDescriptor => ({
	nominal: 'effect-template/FaultInjector',
	ts: `{ readonly run: <A, E, R>(source: ${effectStructuralType('A', 'E', 'R')}) => ${effectStructuralType('A', `E | ${faultError}`, 'R')} }`
})

const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

const faultInjectorInput = (description: string, faultError = 'unknown') =>
	typedExpressionInput(description, faultInjectorType(faultError))

const numericInput = (
	description: string,
	schema: Readonly<Record<string, unknown>>,
	type: TypeDescriptor = { ts: 'number' }
) => unionPort({
	options: [
		literalPort({ regionKind: 'expression', schema, description }),
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type }, description }),
		rawCodePort({ regionKind: 'expression', policy: effectExpressionPolicy, type, description })
	],
	description
})

const nonNegativeIntegerInput = (description: string) => numericInput(description, {
	type: 'integer',
	minimum: 0
})

export const AlwaysFailFaultInjectorLayerTemplate = defineTemplate({
	modelId: 'AlwaysFailFaultInjectorLayer',
	version: VERSION,
	description: 'Creates a shared fault injector that replaces every wrapped operation with a deterministic typed failure.',
	typeParameters: typeParameters(
		['I', 'Fault-injector service identifier type.'],
		['EFault', 'Injected typed failure.']
	),
	inputs: {
		service: serviceKeyInput('Context.Service key for the fault injector.', '{{I}}', faultInjectorType('{{EFault}}').ts),
		failure: effectValueInput('Failure injected into every operation.', { ts: '{{EFault}}' })
	},
	output: expressionOutput('Always-failing fault-injector Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'service', 'FaultInjector')}, {\n\trun: <A, E, R>(_source: Effect.Effect<A, E, R>) => Effect.fail(${marker('expression', 'failure', 'undefined')})\n})`
})

export const FailFirstNFaultInjectorLayerTemplate = defineTemplate({
	modelId: 'FailFirstNFaultInjectorLayer',
	version: VERSION,
	description: 'Creates a stateful fault injector that fails the first N wrapped invocations and then delegates to the source Effect.',
	typeParameters: typeParameters(
		['I', 'Fault-injector service identifier type.'],
		['EFault', 'Injected typed failure.']
	),
	inputs: {
		service: serviceKeyInput('Context.Service key for the fault injector.', '{{I}}', faultInjectorType('{{EFault}}').ts),
		failures: nonNegativeIntegerInput('Number of initial invocations that should fail.'),
		failure: effectValueInput('Failure injected during the initial failing invocations.', { ts: '{{EFault}}' })
	},
	output: expressionOutput('Fail-first-N fault-injector Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'service', 'FaultInjector')}, Effect.gen(function* () {\n\tconst failures = ${marker('expression', 'failures', '2')}\n\tconst state = yield* Ref.make(0)\n\treturn {\n\t\trun: <A, E, R>(source: Effect.Effect<A, E, R>) =>\n\t\t\tEffect.flatMap(Ref.updateAndGet(state, n => n + 1), attempt =>\n\t\t\t\tattempt <= failures ? Effect.fail(${marker('expression', 'failure', 'undefined')}) : source\n\t\t\t)\n\t}\n}))`
})

export const DelayFaultInjectorLayerTemplate = defineTemplate({
	modelId: 'DelayFaultInjectorLayer',
	version: VERSION,
	description: 'Creates a fault injector that deterministically delays every wrapped operation before delegating to it.',
	typeParameters: typeParameters(['I', 'Fault-injector service identifier type.']),
	inputs: {
		service: serviceKeyInput('Context.Service key for the delay injector.', '{{I}}', faultInjectorType('never').ts),
		delay: effectDurationInput('Delay applied before every wrapped operation.')
	},
	output: expressionOutput('Delay fault-injector Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'service', 'FaultInjector')}, {\n\trun: <A, E, R>(source: Effect.Effect<A, E, R>) => Effect.delay(source, ${marker('expression', 'delay', '"1 second"')})\n})`
})

export const SequenceFaultInjectorLayerTemplate = defineTemplate({
	modelId: 'SequenceFaultInjectorLayer',
	version: VERSION,
	description: 'Creates a deterministic fault injector driven by a boolean sequence where true injects a failure and false delegates to the source.',
	typeParameters: typeParameters(
		['I', 'Fault-injector service identifier type.'],
		['EFault', 'Injected typed failure.']
	),
	inputs: {
		service: serviceKeyInput('Context.Service key for the sequence injector.', '{{I}}', faultInjectorType('{{EFault}}').ts),
		pattern: effectValueInput('Failure pattern. true injects failure; false delegates.', { ts: 'ReadonlyArray<boolean>' }),
		failure: effectValueInput('Failure injected when the current pattern entry is true.', { ts: '{{EFault}}' })
	},
	output: expressionOutput('Sequence-driven fault-injector Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'service', 'FaultInjector')}, Effect.gen(function* () {\n\tconst pattern = ${marker('expression', 'pattern', '[true, false]')}\n\tconst index = yield* Ref.make(0)\n\treturn {\n\t\trun: <A, E, R>(source: Effect.Effect<A, E, R>) =>\n\t\t\tEffect.flatMap(Ref.updateAndGet(index, n => n + 1), current => {\n\t\t\t\tconst shouldFail = pattern[current - 1] ?? false\n\t\t\t\treturn shouldFail ? Effect.fail(${marker('expression', 'failure', 'undefined')}) : source\n\t\t\t})\n\t}\n}))`
})

export const DefectFaultInjectorLayerTemplate = defineTemplate({
	modelId: 'DefectFaultInjectorLayer',
	version: VERSION,
	description: 'Creates a fault injector that terminates every wrapped operation with a defect while leaving its typed error channel unchanged.',
	typeParameters: typeParameters(['I', 'Fault-injector service identifier type.']),
	inputs: {
		service: serviceKeyInput('Context.Service key for the defect injector.', '{{I}}', faultInjectorType('never').ts),
		defect: valueInput('Defect value passed to Effect.die.')
	},
	output: expressionOutput('Defect fault-injector Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'service', 'FaultInjector')}, {\n\trun: <A, E, R>(_source: Effect.Effect<A, E, R>) => Effect.die(${marker('expression', 'defect', 'new Error("injected defect")')})\n})`
})

export const FaultInjectedOperationTemplate = defineTemplate({
	modelId: 'FaultInjectedOperation',
	version: VERSION,
	description: 'Runs an Effect through one reusable fault injector.',
	typeParameters: typeParameters(
		['A', 'Operation success type.'],
		['E', 'Operation error type.'],
		['R', 'Operation requirements.'],
		['EFault', 'Injected failure type.']
	),
	inputs: {
		injector: faultInjectorInput('Fault injector applied to the operation.', '{{EFault}}'),
		source: effectSourceInput('Operation under fault injection.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Fault-injected Effect.', effectType('{{A}}', '{{E}} | {{EFault}}', '{{R}}')),
	source: `${marker('expression', 'injector', 'injector')}.run(${marker('expression', 'source', 'Effect.void')})`
})

export const ChainedFaultInjectedOperationTemplate = defineTemplate({
	modelId: 'ChainedFaultInjectedOperation',
	version: VERSION,
	description: 'Runs an Effect through two reusable fault injectors, allowing deterministic combinations such as latency plus transient failures.',
	typeParameters: typeParameters(
		['A', 'Operation success type.'],
		['E', 'Operation error type.'],
		['R', 'Operation requirements.'],
		['EFault1', 'First injected failure type.'],
		['EFault2', 'Second injected failure type.']
	),
	inputs: {
		outer: faultInjectorInput('Outer fault injector.', '{{EFault1}}'),
		inner: faultInjectorInput('Inner fault injector.', '{{EFault2}}'),
		source: effectSourceInput('Operation under chained fault injection.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Chained fault-injected Effect.', effectType('{{A}}', '{{E}} | {{EFault1}} | {{EFault2}}', '{{R}}')),
	source: `${marker('expression', 'outer', 'outer')}.run(${marker('expression', 'inner', 'inner')}.run(${marker('expression', 'source', 'Effect.void')}))`
})

export const effectV4FaultInjectionGraphTemplateInputs = [
	AlwaysFailFaultInjectorLayerTemplate,
	FailFirstNFaultInjectorLayerTemplate,
	DelayFaultInjectorLayerTemplate,
	SequenceFaultInjectorLayerTemplate,
	DefectFaultInjectorLayerTemplate,
	FaultInjectedOperationTemplate,
	ChainedFaultInjectedOperationTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
