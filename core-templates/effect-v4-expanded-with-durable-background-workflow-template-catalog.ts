import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedSocketStreamingBoundaryGraphTemplateInputs } from './effect-v4-expanded-with-socket-streaming-boundary-template-catalog.js'
import { effectV4DurableBackgroundWorkflowTemplateInputs } from './effect-v4-durable-background-workflow-template-catalog.js'

export const effectV4ExpandedDurableBackgroundWorkflowGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = [
	...effectV4ExpandedSocketStreamingBoundaryGraphTemplateInputs,
	...effectV4DurableBackgroundWorkflowTemplateInputs
]
