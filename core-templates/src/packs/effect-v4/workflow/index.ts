import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4DurableWorkflowCompositionGraphTemplateInputs } from './effect-v4-durable-background-workflow-templates.js'
import { effectV4DurableWorkflowFoundationalGraphTemplateInputs } from './effect-v4-durable-workflow-foundational-templates.js'
import { effectWorkflowGraphTemplateInputs } from './effect-workflow-templates.js'

export * from './effect-v4-durable-background-workflow-templates.js'
export * from './effect-v4-durable-workflow-foundational-templates.js'
export * from './effect-workflow-templates.js'

/** Every canonical Effect v4 template in the workflow domain. */
export const effectV4WorkflowGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4DurableWorkflowCompositionGraphTemplateInputs,
	effectV4DurableWorkflowFoundationalGraphTemplateInputs,
	effectWorkflowGraphTemplateInputs
)
