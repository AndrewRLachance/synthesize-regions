import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4AiFoundationalGraphTemplateInputs } from './effect-v4-ai-foundational-templates.js'

export * from './effect-v4-ai-foundational-templates.js'

/** Every canonical Effect v4 template in the ai domain. */
export const effectV4AiGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4AiFoundationalGraphTemplateInputs
)
