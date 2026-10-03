import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectApplicationGraphTemplateInputs } from './effect-application-templates.js'
import { effectV4ApplicationAssemblyFoundationalGraphTemplateInputs } from './effect-v4-application-assembly-foundational-templates.js'
import { effectV4ApplicationAssemblyCompositionGraphTemplateInputs } from './effect-v4-application-assembly-templates.js'

export * from './effect-application-templates.js'
export * from './effect-v4-application-assembly-foundational-templates.js'
export * from './effect-v4-application-assembly-templates.js'

/** Every canonical Effect v4 template in the application domain. */
export const effectV4ApplicationGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectApplicationGraphTemplateInputs,
	effectV4ApplicationAssemblyFoundationalGraphTemplateInputs,
	effectV4ApplicationAssemblyCompositionGraphTemplateInputs
)
