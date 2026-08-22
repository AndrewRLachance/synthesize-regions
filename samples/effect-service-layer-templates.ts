import { defineTemplate } from '../src/templates.js'
import { effectSourceInput, effectType } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	identifierInput,
	layerType,
	marker,
	statementOutput,
	stringInput,
	tagType,
	typeCodeInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'

const layerInput = (description: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, layerType(provided, error, requirements))
const tagInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

export const ContextTagDeclarationTemplate = defineTemplate({
	modelId: 'ContextTagDeclaration', version: '1.0.0', description: 'Declares an exported Context.Tag service identifier.',
	inputs: { name: identifierInput('Tag class name.'), key: stringInput('Globally stable service key.'), serviceType: typeCodeInput('Service interface or object type.') },
	output: statementOutput('Exported Context.Tag class declaration.'),
	source: `export class ${marker('identifier', 'name', 'Service')} extends Context.Tag(${marker('string', 'key', '"Service"')})<any, ${marker('type', 'serviceType', '{}')}>() {}`
})

export const EffectServiceDeclarationTemplate = defineTemplate({
	modelId: 'EffectServiceDeclaration', version: '1.0.0', description: 'Declares an exported Effect.Service with an effectful constructor.',
	inputs: { name: identifierInput('Service class name.'), key: stringInput('Stable service key.'), service: effectSourceInput('Effect that constructs the service.') },
	output: statementOutput('Exported Effect.Service declaration.'),
	source: `export class ${marker('identifier', 'name', 'Service')} extends Effect.Service<any>()(${marker('string', 'key', '"Service"')}, { effect: ${marker('expression', 'service', 'Effect.succeed({})')} }) {}`
})

export const LayerSucceedTemplate = defineTemplate({
	modelId: 'LayerSucceed', version: '1.0.0', description: 'Creates an infallible Layer from a Context.Tag and service value.',
	typeParameters: typeParameters(['I', 'Provided service identifier type.'], ['S', 'Service implementation type.']),
	inputs: { tag: tagInput('Service tag.', '{{I}}', '{{S}}'), service: valueInput('Service implementation.', { ts: '{{S}}' }) },
	output: expressionOutput('Successful service Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'tag', 'Service')}, ${marker('expression', 'service', '{}')})`
})

export const LayerEffectTemplate = defineTemplate({
	modelId: 'LayerEffect', version: '1.0.0', description: 'Creates a Layer from an Effect that constructs a tagged service.',
	typeParameters: typeParameters(['I', 'Provided service identifier type.'], ['S', 'Service type.'], ['E', 'Construction error type.'], ['R', 'Construction requirement type.']),
	inputs: { tag: tagInput('Service tag.', '{{I}}', '{{S}}'), effect: effectSourceInput('Service construction Effect.', effectType('{{S}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Effect-backed Layer.', layerType('{{I}}', '{{E}}', '{{R}}')),
	source: `Layer.effect(${marker('expression', 'tag', 'Service')}, ${marker('expression', 'effect', 'Effect.succeed({})')})`
})

export const LayerScopedTemplate = defineTemplate({
	modelId: 'LayerScoped', version: '1.0.0', description: 'Creates a Layer from a scoped service acquisition Effect.',
	typeParameters: typeParameters(['I', 'Provided service identifier type.'], ['S', 'Service type.'], ['E', 'Construction error type.'], ['R', 'Non-Scope requirement type.']),
	inputs: { tag: tagInput('Service tag.', '{{I}}', '{{S}}'), effect: effectSourceInput('Scoped service acquisition Effect.', effectType('{{S}}', '{{E}}', '{{R}} | { readonly __effectScopeRequirement: "Scope" }')) },
	output: expressionOutput('Scoped Layer.', layerType('{{I}}', '{{E}}', '{{R}}')),
	source: `Layer.scoped(${marker('expression', 'tag', 'Service')}, ${marker('expression', 'effect', 'Effect.succeed({})')})`
})

export const LayerMergeTemplate = defineTemplate({
	modelId: 'LayerMerge', version: '1.0.0', description: 'Merges two Layers and provides both outputs.',
	typeParameters: typeParameters(['P1', 'Services provided by the left Layer.'], ['E1', 'Left error type.'], ['R1', 'Left requirements.'], ['P2', 'Services provided by the right Layer.'], ['E2', 'Right error type.'], ['R2', 'Right requirements.']),
	inputs: { left: layerInput('Left Layer.', '{{P1}}', '{{E1}}', '{{R1}}'), right: layerInput('Right Layer.', '{{P2}}', '{{E2}}', '{{R2}}') },
	output: expressionOutput('Merged Layer.', layerType('{{P1}} | {{P2}}', '{{E1}} | {{E2}}', '{{R1}} | {{R2}}')),
	source: `Layer.merge(${marker('expression', 'left', 'Layer.empty')}, ${marker('expression', 'right', 'Layer.empty')})`
})

export const LayerProvideTemplate = defineTemplate({
	modelId: 'LayerProvide', version: '1.0.0', description: 'Provides one Layer to another Layer.',
	typeParameters: typeParameters(['ROut', 'Provided output services.'], ['E', 'Target Layer error type.'], ['R', 'Target remaining requirements.'], ['P', 'Services supplied by the provider.'], ['E2', 'Provider error type.'], ['R2', 'Provider requirements.']),
	inputs: { layer: layerInput('Layer being provided.', '{{ROut}}', '{{E}}', '{{R}} | {{P}}'), provider: layerInput('Layer supplying dependencies.', '{{P}}', '{{E2}}', '{{R2}}') },
	output: expressionOutput('Provided Layer.', layerType('{{ROut}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Layer.provide(${marker('expression', 'layer', 'Layer.empty')}, ${marker('expression', 'provider', 'Layer.empty')})`
})

export const EffectProvideLayerTemplate = defineTemplate({
	modelId: 'EffectProvideLayer', version: '1.0.0', description: 'Provides a Layer to an Effect and removes its supplied requirements.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Source error type.'], ['R', 'Remaining source requirements.'], ['P', 'Requirements supplied by the Layer.'], ['E2', 'Layer construction error type.'], ['R2', 'Layer requirements.']),
	inputs: { source: effectSourceInput('Effect requiring services.', effectType('{{A}}', '{{E}}', '{{R}} | {{P}}')), layer: layerInput('Layer supplying services.', '{{P}}', '{{E2}}', '{{R2}}') },
	output: expressionOutput('Effect with Layer-provided dependencies.', effectType('{{A}}', '{{E}} | {{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.provide(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'layer', 'Layer.empty')})`
})

export const effectServiceLayerGraphTemplateInputs = [
	ContextTagDeclarationTemplate, EffectServiceDeclarationTemplate, LayerSucceedTemplate, LayerEffectTemplate,
	LayerScopedTemplate, LayerMergeTemplate, LayerProvideTemplate, EffectProvideLayerTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
