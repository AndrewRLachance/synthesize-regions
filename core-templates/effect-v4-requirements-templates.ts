import { fragmentCollectionPort } from '../src/templates.js'
import { defineTemplate } from './sample-definition.js'
import { effectSourceInput, effectType } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	identifierInput,
	layerType,
	marker,
	nominalType,
	statementOutput,
	stringInput,
	tagType,
	typeCodeInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'

const scopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'

const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

const layerInput = (description: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, layerType(provided, error, requirements))

const contextType = (services = 'unknown') =>
	nominalType('effect/Context', { contextServices: services })

const contextInput = (description: string, services = 'unknown') =>
	typedExpressionInput(description, contextType(services))

const optionType = (value = 'unknown') =>
	nominalType('effect/Option', { optionValue: value })

const memoMapType = () => nominalType('effect/LayerMap')
const scopeType = () => nominalType('effect/Scope')

const layerReturningCallbackType = (parameters: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') => ({
	ts: `(${parameters}) => ${layerType(provided, error, requirements).ts}`
})

export const ContextServiceDeclarationTemplate = defineTemplate({
	modelId: 'ContextServiceDeclaration',
	version: '1.0.0',
	description: 'Declares an exported Effect V4 Context.Service key with an explicit service shape.',
	inputs: {
		name: identifierInput('Context.Service class name.'),
		key: stringInput('Globally stable service identifier.'),
		serviceType: typeCodeInput('Service interface or object type. Service operations should not leak construction requirements.')
	},
	output: statementOutput('Exported Context.Service class declaration.'),
	source: `export class ${marker('identifier', 'name', 'Service')} extends Context.Service<any, ${marker('type', 'serviceType', '{}')}>()(${marker('string', 'key', '"Service"')}) {}`
})

export const ContextServiceWithMakeDeclarationTemplate = defineTemplate({
	modelId: 'ContextServiceWithMakeDeclaration',
	version: '1.0.0',
	description: 'Declares an exported Effect V4 Context.Service whose make field is an Effect constructor.',
	typeParameters: typeParameters(['S', 'Constructed service implementation type.'], ['E', 'Construction error type.'], ['R', 'Construction requirements.']),
	inputs: {
		name: identifierInput('Context.Service class name.'),
		key: stringInput('Globally stable service identifier.'),
		make: effectSourceInput('Effect that constructs the service implementation.', effectType('{{S}}', '{{E}}', '{{R}}'))
	},
	output: statementOutput('Exported Context.Service class with make constructor.'),
	source: `export class ${marker('identifier', 'name', 'Service')} extends Context.Service<any>()(${marker('string', 'key', '"Service"')}, { make: ${marker('expression', 'make', 'Effect.succeed({})')} }) {}`
})

export const ContextServiceWithLayersDeclarationTemplate = defineTemplate({
	modelId: 'ContextServiceWithLayersDeclaration',
	version: '1.0.0',
	description: 'Declares a Context.Service with make, a dependency-requiring layer, and a layer with construction dependencies supplied.',
	typeParameters: typeParameters(
		['S', 'Constructed service implementation type.'],
		['E', 'Service construction error type.'],
		['R', 'Service construction requirements.'],
		['EDep', 'Dependency Layer error type.'],
		['RDep', 'Dependency Layer requirements.']
	),
	inputs: {
		name: identifierInput('Context.Service class name.'),
		key: stringInput('Globally stable service identifier.'),
		make: effectSourceInput('Effect that constructs the service implementation.', effectType('{{S}}', '{{E}}', '{{R}}')),
		dependencies: layerInput('Layer supplying the service construction requirements.', '{{R}}', '{{EDep}}', '{{RDep}}')
	},
	output: statementOutput('Exported Context.Service class with layer and layerWithoutDependencies static fields.'),
	source: `export class ${marker('identifier', 'name', 'Service')} extends Context.Service<any>()(${marker('string', 'key', '"Service"')}, { make: ${marker('expression', 'make', 'Effect.succeed({})')} }) {\n\tstatic readonly layerWithoutDependencies = Layer.effect(this, this.make)\n\tstatic readonly layer = this.layerWithoutDependencies.pipe(Layer.provide(${marker('expression', 'dependencies', 'Layer.empty')}))\n}`
})

export const ContextServiceUseTemplate = defineTemplate({
	modelId: 'ContextServiceUse',
	version: '1.0.0',
	description: 'Uses a Context.Service through its .use callback API.',
	typeParameters: typeParameters(
		['I', 'Service identifier type.'],
		['S', 'Service implementation type.'],
		['A', 'Callback success type.'],
		['E', 'Callback error type.'],
		['R', 'Callback requirements.']
	),
	inputs: {
		service: serviceKeyInput('Context.Service key.', '{{I}}', '{{S}}'),
		body: callbackInput('Effectful callback receiving the resolved service.', effectReturningCallbackType('service: {{S}}', '{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Effect requiring the service key.', effectType('{{A}}', '{{E}}', '{{I}} | {{R}}')),
	source: `${marker('expression', 'service', 'Service')}.use(${marker('expression', 'body', 'service => Effect.succeed(service)')})`
})

export const ContextServiceOfTemplate = defineTemplate({
	modelId: 'ContextServiceOf',
	version: '1.0.0',
	description: 'Constructs a service implementation with Context.Service.of for inference-safe direct mocks and values.',
	typeParameters: typeParameters(['I', 'Service identifier type.'], ['S', 'Service implementation type.']),
	inputs: {
		service: serviceKeyInput('Context.Service key.', '{{I}}', '{{S}}'),
		implementation: valueInput('Service implementation.', { ts: '{{S}}' })
	},
	output: expressionOutput('Service implementation value.', { ts: '{{S}}' }),
	source: `${marker('expression', 'service', 'Service')}.of(${marker('expression', 'implementation', '{}')})`
})

export const EffectServiceOptionTemplate = defineTemplate({
	modelId: 'EffectServiceOption',
	version: '1.0.0',
	description: 'Looks up a service optionally without adding it to the Effect requirements.',
	typeParameters: typeParameters(['I', 'Service identifier type.'], ['S', 'Service implementation type.']),
	inputs: { service: serviceKeyInput('Context.Service key to look up.', '{{I}}', '{{S}}') },
	output: expressionOutput('Optional service lookup Effect.', effectType(optionType('{{S}}').ts, 'never', 'never')),
	source: `Effect.serviceOption(${marker('expression', 'service', 'Service')})`
})

export const ContextEmptyTemplate = defineTemplate({
	modelId: 'ContextEmpty',
	version: '1.0.0',
	inputs: {},
	description: 'Creates an empty Effect Context.',
	output: expressionOutput('Empty Context.', contextType('never')),
	source: 'Context.empty()'
})

export const ContextMakeTemplate = defineTemplate({
	modelId: 'ContextMake',
	version: '1.0.0',
	description: 'Creates a Context containing one service implementation.',
	typeParameters: typeParameters(['I', 'Service identifier type.'], ['S', 'Service implementation type.']),
	inputs: {
		service: serviceKeyInput('Context.Service key.', '{{I}}', '{{S}}'),
		implementation: valueInput('Service implementation.', { ts: '{{S}}' })
	},
	output: expressionOutput('Context containing the service.', contextType('{{I}}')),
	source: `Context.make(${marker('expression', 'service', 'Service')}, ${marker('expression', 'implementation', '{}')})`
})

export const ContextAddTemplate = defineTemplate({
	modelId: 'ContextAdd',
	version: '1.0.0',
	description: 'Adds one service implementation to an existing Context.',
	typeParameters: typeParameters(
		['R', 'Services already present in the Context.'],
		['I', 'Added service identifier type.'],
		['S', 'Added service implementation type.']
	),
	inputs: {
		context: contextInput('Existing Context.', '{{R}}'),
		service: serviceKeyInput('Context.Service key to add.', '{{I}}', '{{S}}'),
		implementation: valueInput('Service implementation.', { ts: '{{S}}' })
	},
	output: expressionOutput('Context with the added service.', contextType('{{R}} | {{I}}')),
	source: `${marker('expression', 'context', 'Context.empty()')}.pipe(Context.add(${marker('expression', 'service', 'Service')}, ${marker('expression', 'implementation', '{}')}))`
})

export const ContextGetTemplate = defineTemplate({
	modelId: 'ContextGet',
	version: '1.0.0',
	description: 'Reads one service implementation from a Context.',
	typeParameters: typeParameters(['R', 'Services present in the Context.'], ['I', 'Service identifier type.'], ['S', 'Service implementation type.']),
	inputs: {
		context: contextInput('Context containing the service.', '{{R}} | {{I}}'),
		service: serviceKeyInput('Context.Service key to read.', '{{I}}', '{{S}}')
	},
	output: expressionOutput('Resolved service implementation.', { ts: '{{S}}' }),
	source: `Context.get(${marker('expression', 'context', 'Context.empty()')}, ${marker('expression', 'service', 'Service')})`
})

export const EffectProvideContextTemplate = defineTemplate({
	modelId: 'EffectProvideContext',
	version: '1.0.0',
	description: 'Provides an explicit Context to an Effect, removing the services present in that Context from its requirements.',
	typeParameters: typeParameters(
		['A', 'Success type.'],
		['E', 'Error type.'],
		['R', 'Remaining requirements.'],
		['P', 'Requirements supplied by the Context.']
	),
	inputs: {
		source: effectSourceInput('Effect requiring the Context services.', effectType('{{A}}', '{{E}}', '{{R}} | {{P}}')),
		context: contextInput('Context supplying services.', '{{P}}')
	},
	output: expressionOutput('Effect with Context-provided requirements removed.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.provide(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'context', 'Context.empty()')})`
})

export const LayerMergeAllTemplate = defineTemplate({
	modelId: 'LayerMergeAll',
	version: '1.0.0',
	description: 'Merges one or more Layers so all outputs are available together.',
	typeParameters: typeParameters(
		['P', 'Union of services provided by the merged Layers.'],
		['E', 'Union of layer construction errors.'],
		['R', 'Union of layer requirements.']
	),
	inputs: {
		layers: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression', type: layerType('{{P}}', '{{E}}', '{{R}}') },
			minItems: 1,
			separator: ', ',
			description: 'Layers to merge.'
		})
	},
	output: expressionOutput('Merged Layer.', layerType('{{P}}', '{{E}}', '{{R}}')),
	source: `Layer.mergeAll(${marker('expression', 'layers', 'Layer.empty')})`
})

export const LayerProvideMergeTemplate = defineTemplate({
	modelId: 'LayerProvideMerge',
	version: '1.0.0',
	description: 'Provides dependencies to a Layer while retaining the provider outputs in the resulting Layer.',
	typeParameters: typeParameters(
		['POut', 'Services provided by the target Layer.'],
		['E', 'Target Layer error type.'],
		['R', 'Remaining target requirements.'],
		['P', 'Services supplied and retained by the provider Layer.'],
		['E2', 'Provider Layer error type.'],
		['R2', 'Provider Layer requirements.']
	),
	inputs: {
		layer: layerInput('Layer receiving dependencies.', '{{POut}}', '{{E}}', '{{R}} | {{P}}'),
		provider: layerInput('Layer supplying and retaining dependencies.', '{{P}}', '{{E2}}', '{{R2}}')
	},
	output: expressionOutput('Composed Layer retaining provider outputs.', layerType('{{POut}} | {{P}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `${marker('expression', 'layer', 'Layer.empty')}.pipe(Layer.provideMerge(${marker('expression', 'provider', 'Layer.empty')}))`
})

export const LayerBuildTemplate = defineTemplate({
	modelId: 'LayerBuild',
	version: '1.0.0',
	description: 'Builds a Layer into a Context within the current Scope.',
	typeParameters: typeParameters(['P', 'Services provided by the Layer.'], ['E', 'Layer error type.'], ['R', 'Layer requirements.']),
	inputs: { layer: layerInput('Layer to build.', '{{P}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Effect that builds the Layer into a Context.', effectType(contextType('{{P}}').ts, '{{E}}', `{{R}} | ${scopeRequirement}`)),
	source: `Layer.build(${marker('expression', 'layer', 'Layer.empty')})`
})

export const LayerTapTemplate = defineTemplate({
	modelId: 'LayerTap',
	version: '1.0.0',
	description: 'Runs an infallible observation effect after successful Layer acquisition without changing the Layer signature.',
	typeParameters: typeParameters(['P', 'Services provided by the Layer.'], ['E', 'Layer error type.'], ['R', 'Layer requirements.']),
	inputs: {
		layer: layerInput('Layer to observe.', '{{P}}', '{{E}}', '{{R}}'),
		onSuccess: callbackInput('Infallible callback receiving the acquired Context.', effectReturningCallbackType('context: unknown', 'unknown', 'never', 'never'))
	},
	output: expressionOutput('Observed Layer.', layerType('{{P}}', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'layer', 'Layer.empty')}.pipe(Layer.tap(${marker('expression', 'onSuccess', '() => Effect.void')}))`
})

export const LayerTapErrorTemplate = defineTemplate({
	modelId: 'LayerTapError',
	version: '1.0.0',
	description: 'Runs an infallible observation effect when Layer acquisition fails without changing the Layer signature.',
	typeParameters: typeParameters(['P', 'Services provided by the Layer.'], ['E', 'Layer error type.'], ['R', 'Layer requirements.']),
	inputs: {
		layer: layerInput('Layer to observe.', '{{P}}', '{{E}}', '{{R}}'),
		onError: callbackInput('Infallible callback receiving the acquisition error.', effectReturningCallbackType('error: {{E}}', 'unknown', 'never', 'never'))
	},
	output: expressionOutput('Error-observed Layer.', layerType('{{P}}', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'layer', 'Layer.empty')}.pipe(Layer.tapError(${marker('expression', 'onError', '() => Effect.void')}))`
})

export const LayerCatchTemplate = defineTemplate({
	modelId: 'LayerCatch',
	version: '1.0.0',
	description: 'Recovers from Layer acquisition failure with a fallback Layer.',
	typeParameters: typeParameters(
		['P', 'Services provided by the source and fallback Layers.'],
		['E', 'Source Layer error type.'],
		['R', 'Source Layer requirements.'],
		['E2', 'Fallback Layer error type.'],
		['R2', 'Fallback Layer requirements.']
	),
	inputs: {
		layer: layerInput('Layer that may fail during acquisition.', '{{P}}', '{{E}}', '{{R}}'),
		handler: callbackInput('Callback selecting a fallback Layer from the acquisition error.', layerReturningCallbackType('error: {{E}}', '{{P}}', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Recovered Layer.', layerType('{{P}}', '{{E2}}', '{{R}} | {{R2}}')),
	source: `${marker('expression', 'layer', 'Layer.empty')}.pipe(Layer.catch(${marker('expression', 'handler', '() => Layer.empty')}))`
})

export const LayerFreshTemplate = defineTemplate({
	modelId: 'LayerFresh',
	version: '1.0.0',
	description: 'Forces a Layer to be acquired as a fresh non-shared instance instead of using normal memoization.',
	typeParameters: typeParameters(['P', 'Services provided by the Layer.'], ['E', 'Layer error type.'], ['R', 'Layer requirements.']),
	inputs: { layer: layerInput('Layer to acquire freshly.', '{{P}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Fresh Layer.', layerType('{{P}}', '{{E}}', '{{R}}')),
	source: `Layer.fresh(${marker('expression', 'layer', 'Layer.empty')})`
})

export const LayerMakeMemoMapTemplate = defineTemplate({
	modelId: 'LayerMakeMemoMap',
	version: '1.0.0',
	inputs: {},
	description: 'Creates a Layer.MemoMap for explicit layer memoization.',
	output: expressionOutput('MemoMap creation Effect.', effectType(memoMapType().ts, 'never', 'never')),
	source: 'Layer.makeMemoMap'
})

export const EffectScopeTemplate = defineTemplate({
	modelId: 'EffectScope',
	version: '1.0.0',
	inputs: {},
	description: 'Accesses the current Scope as an Effect requirement.',
	output: expressionOutput('Current Scope Effect.', effectType(scopeType().ts, 'never', scopeRequirement)),
	source: 'Effect.scope'
})

export const LayerBuildWithMemoMapTemplate = defineTemplate({
	modelId: 'LayerBuildWithMemoMap',
	version: '1.0.0',
	description: 'Builds a Layer using an explicit MemoMap and Scope so repeated builds can share the same acquisition.',
	typeParameters: typeParameters(['P', 'Services provided by the Layer.'], ['E', 'Layer error type.'], ['R', 'Layer requirements.']),
	inputs: {
		layer: layerInput('Layer to build.', '{{P}}', '{{E}}', '{{R}}'),
		memoMap: typedExpressionInput('MemoMap used to cache layer acquisition.', memoMapType()),
		scope: typedExpressionInput('Scope that owns the built Layer resources.', scopeType())
	},
	output: expressionOutput('Effect that builds the Layer into a Context.', effectType(contextType('{{P}}').ts, '{{E}}', '{{R}}')),
	source: `Layer.buildWithMemoMap(${marker('expression', 'layer', 'Layer.empty')}, ${marker('expression', 'memoMap', '(undefined as any)')}, ${marker('expression', 'scope', 'undefined')})`
})

export const effectV4RequirementsGraphTemplateInputs = [
	ContextServiceDeclarationTemplate,
	ContextServiceWithMakeDeclarationTemplate,
	ContextServiceWithLayersDeclarationTemplate,
	ContextServiceUseTemplate,
	ContextServiceOfTemplate,
	EffectServiceOptionTemplate,
	ContextEmptyTemplate,
	ContextMakeTemplate,
	ContextAddTemplate,
	ContextGetTemplate,
	EffectProvideContextTemplate,
	LayerMergeAllTemplate,
	LayerProvideMergeTemplate,
	LayerBuildTemplate,
	LayerTapTemplate,
	LayerTapErrorTemplate,
	LayerCatchTemplate,
	LayerFreshTemplate,
	LayerMakeMemoMapTemplate,
	EffectScopeTemplate,
	LayerBuildWithMemoMapTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
