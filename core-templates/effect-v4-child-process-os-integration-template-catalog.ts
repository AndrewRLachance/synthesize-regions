import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ChildProcessFoundationalTemplateInputs } from './effect-v4-child-process-foundational-templates.js'
import { effectV4ChildProcessOsIntegrationCompositionTemplateInputs } from './effect-v4-child-process-os-integration-templates.js'

export * from './effect-child-process-template-helpers.js'
export * from './effect-v4-child-process-foundational-templates.js'
export * from './effect-v4-child-process-os-integration-templates.js'

export const effectV4ChildProcessOsIntegrationTemplateInputs = [
	...effectV4ChildProcessFoundationalTemplateInputs,
	...effectV4ChildProcessOsIntegrationCompositionTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
