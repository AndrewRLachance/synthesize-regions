import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ApplicationAssemblyFoundationalGraphTemplateInputs } from './effect-v4-application-assembly-foundational-templates.js'
import { effectV4ApplicationAssemblyCompositionGraphTemplateInputs } from './effect-v4-application-assembly-templates.js'

export * from './effect-application-assembly-template-helpers.js'
export * from './effect-v4-application-assembly-foundational-templates.js'
export * from './effect-v4-application-assembly-templates.js'

export const effectV4ApplicationAssemblyTemplateInputs = [
	...effectV4ApplicationAssemblyFoundationalGraphTemplateInputs,
	...effectV4ApplicationAssemblyCompositionGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
