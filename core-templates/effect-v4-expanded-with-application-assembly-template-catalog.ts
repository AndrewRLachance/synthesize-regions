import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedDurableBackgroundWorkflowGraphTemplateInputs } from './effect-v4-expanded-with-durable-background-workflow-template-catalog.js'
import { effectV4ApplicationAssemblyTemplateInputs } from './effect-v4-application-assembly-template-catalog.js'

export const effectV4ExpandedApplicationAssemblyGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = [
	...effectV4ExpandedDurableBackgroundWorkflowGraphTemplateInputs,
	...effectV4ApplicationAssemblyTemplateInputs
]
