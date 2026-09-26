import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4DurableWorkflowFoundationalGraphTemplateInputs } from './effect-v4-durable-workflow-foundational-templates.js'
import { effectV4DurableWorkflowCompositionGraphTemplateInputs } from './effect-v4-durable-background-workflow-templates.js'

export * from './effect-workflow-durable-template-helpers.js'
export * from './effect-v4-durable-workflow-foundational-templates.js'
export * from './effect-v4-durable-background-workflow-templates.js'

export const effectV4DurableBackgroundWorkflowTemplateInputs = [
	...effectV4DurableWorkflowFoundationalGraphTemplateInputs,
	...effectV4DurableWorkflowCompositionGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
