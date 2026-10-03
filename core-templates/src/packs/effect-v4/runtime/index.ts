import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4RuntimeGraphTemplateInputs as runtimeTemplates } from './effect-v4-runtime-templates.js'

export * from './effect-v4-runtime-templates.js'

/** Every canonical Effect v4 template in the runtime domain. */
export const effectV4RuntimeGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	runtimeTemplates
)
