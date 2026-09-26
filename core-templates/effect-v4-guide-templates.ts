import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4RequirementsGraphTemplateInputs } from './effect-v4-requirements-templates.js'
import { effectV4ResourceGraphTemplateInputs } from './effect-v4-resource-templates.js'
import { effectV4RuntimeGraphTemplateInputs } from './effect-v4-runtime-templates.js'

export * from './effect-v4-requirements-templates.js'
export * from './effect-v4-resource-templates.js'
export * from './effect-v4-runtime-templates.js'

export const effectV4GuideGraphTemplateInputs = [
	...effectV4RequirementsGraphTemplateInputs,
	...effectV4ResourceGraphTemplateInputs,
	...effectV4RuntimeGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
