import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectConfigV4GraphTemplateInputs } from './effect-config-templates.js'

export * from './effect-config-templates.js'

/** Every canonical Effect v4 template in the config domain. */
export const effectV4ConfigGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectConfigV4GraphTemplateInputs
)
