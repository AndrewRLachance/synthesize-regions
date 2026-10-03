import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectServiceLayerGraphTemplateInputs } from './effect-service-layer-templates.js'

export * from './effect-service-layer-templates.js'

/** Every canonical Effect v4 template in the layer domain. */
export const effectV4LayerGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectServiceLayerGraphTemplateInputs
)
