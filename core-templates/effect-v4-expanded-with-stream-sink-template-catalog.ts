import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedOperationsGraphTemplateInputs } from './effect-v4-expanded-with-operations-template-catalog.js'
import { effectStreamSinkV4GraphTemplateInputs } from './effect-stream-sink-template-catalog.js'

export const effectV4ExpandedStreamSinkGraphTemplateInputs = [
	...effectV4ExpandedOperationsGraphTemplateInputs,
	...effectStreamSinkV4GraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
