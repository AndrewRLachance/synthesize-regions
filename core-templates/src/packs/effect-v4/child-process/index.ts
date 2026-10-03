import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4ChildProcessFoundationalTemplateInputs } from './effect-v4-child-process-foundational-templates.js'
import { effectV4ChildProcessOsIntegrationCompositionTemplateInputs } from './effect-v4-child-process-os-integration-templates.js'

export * from './effect-v4-child-process-foundational-templates.js'
export * from './effect-v4-child-process-os-integration-templates.js'

/** Every canonical Effect v4 template in the child-process domain. */
export const effectV4ChildProcessGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4ChildProcessFoundationalTemplateInputs,
	effectV4ChildProcessOsIntegrationCompositionTemplateInputs
)
