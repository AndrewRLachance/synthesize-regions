import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4SecurityFoundationalTemplateInputs } from './effect-v4-security-foundational-templates.js'
import { effectV4SecurityCrossBoundaryTemplateInputs } from './effect-v4-security-cross-boundary-templates.js'

export * from './effect-security-template-helpers.js'
export * from './effect-v4-security-foundational-templates.js'
export * from './effect-v4-security-cross-boundary-templates.js'

export const effectV4SecurityCrossBoundaryCatalogTemplateInputs = [
	...effectV4SecurityFoundationalTemplateInputs,
	...effectV4SecurityCrossBoundaryTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
