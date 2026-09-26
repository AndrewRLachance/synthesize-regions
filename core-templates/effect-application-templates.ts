import { defineTemplate } from './sample-definition.js'
import { effectSourceInput, effectType } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	identifierInput,
	layerType,
	managedRuntimeType,
	marker,
	statementCollectionInput,
	statementOutput,
	typeParameters,
	typedExpressionInput
} from './effect-template-helpers.js'

export const EffectFnDeclarationTemplate = defineTemplate({
	modelId: 'EffectFnDeclaration', version: '1.0.0', description: 'Declares an exported function instrumented with Effect.fn.',
	inputs: { name: identifierInput('Function name.'), body: callbackInput('Function implementation returning an Effect.') },
	output: statementOutput('Exported Effect.fn declaration.'),
	source: `export const ${marker('identifier', 'name', 'operation')} = Effect.fn(${marker('expression', 'body', 'function* () { return undefined }')})`
})

export const EffectProgramDeclarationTemplate = defineTemplate({
	modelId: 'EffectProgramDeclaration', version: '1.0.0', description: 'Declares an exported named Effect program.',
	typeParameters: typeParameters(['A', 'Program success type.'], ['E', 'Program error type.'], ['R', 'Program requirements.']),
	inputs: { name: identifierInput('Program constant name.'), program: effectSourceInput('Effect program.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: statementOutput('Exported Effect program declaration.'),
	source: `export const ${marker('identifier', 'name', 'program')} = ${marker('expression', 'program', 'Effect.void')}`
})

export const EffectNodeMainSourceFileTemplate = defineTemplate({
	modelId: 'EffectNodeMainSourceFile', version: '1.0.0', description: 'Builds a complete Node.js Effect source file with standard Effect imports.',
	inputs: { body: statementCollectionInput('Top-level declarations and main execution statements.') },
	output: { kind: 'sourceFile', description: 'Complete Node.js Effect application source file.' },
	source: `import { Config, Context, Deferred, Effect, Fiber, Layer, ManagedRuntime, Metric, Option, PubSub, Queue, Ref, Schedule, Schema, Stream } from "effect"\n${marker('statement', 'body', 'Effect.runPromise(Effect.void)')}`
})

export const EffectManagedRuntimeTemplate = defineTemplate({
	modelId: 'EffectManagedRuntime', version: '1.0.0', description: 'Creates a ManagedRuntime from a fully constructed Layer.',
	typeParameters: typeParameters(['R', 'Services provided by the runtime.'], ['E', 'Layer construction error type.']),
	inputs: { layer: typedExpressionInput('Closed Layer used by the runtime.', layerType('{{R}}', '{{E}}', 'never')) },
	output: expressionOutput('Managed Effect runtime.', managedRuntimeType('{{R}}', '{{E}}')),
	source: `ManagedRuntime.make(${marker('expression', 'layer', 'Layer.empty')})`
})

export const LayerLaunchTemplate = defineTemplate({
	modelId: 'LayerLaunch', version: '1.0.0', description: 'Launches a Layer for the lifetime of the application.',
	typeParameters: typeParameters(['ROut', 'Services kept alive.'], ['E', 'Layer construction error type.'], ['RIn', 'Layer requirements.']),
	inputs: { layer: typedExpressionInput('Layer to launch.', layerType('{{ROut}}', '{{E}}', '{{RIn}}')) },
	output: expressionOutput('Never-ending Layer launch Effect.', effectType('never', '{{E}}', '{{RIn}}')),
	source: `Layer.launch(${marker('expression', 'layer', 'Layer.empty')})`
})

export const effectApplicationGraphTemplateInputs = [
	EffectFnDeclarationTemplate, EffectProgramDeclarationTemplate, EffectNodeMainSourceFileTemplate,
	EffectManagedRuntimeTemplate, LayerLaunchTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
