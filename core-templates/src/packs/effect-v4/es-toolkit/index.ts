import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectEsToolkitGraphTemplateInputs } from './effect-es-toolkit-templates.js'

export * from './effect-es-toolkit-templates.js'

/** Every canonical Effect v4 template in the es-toolkit domain. */
export const effectV4EsToolkitGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectEsToolkitGraphTemplateInputs
)
