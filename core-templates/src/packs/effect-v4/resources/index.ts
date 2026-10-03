import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectResourceGraphTemplateInputs } from './effect-resource-templates.js'
import { effectV4ResourceGraphTemplateInputs } from './effect-v4-resource-templates.js'

export * from './effect-resource-templates.js'
export * from './effect-v4-resource-templates.js'

/** Every canonical Effect v4 template in the resources domain. */
export const effectV4ResourcesGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectResourceGraphTemplateInputs,
	effectV4ResourceGraphTemplateInputs
)
