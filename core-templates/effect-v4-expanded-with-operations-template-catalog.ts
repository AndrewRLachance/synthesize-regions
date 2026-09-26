import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedRealWorldGraphTemplateInputs } from './effect-v4-expanded-real-world-template-catalog.js'
import { effectV4OperationsTemplateInputs } from './effect-v4-operations-template-catalog.js'

export const effectV4ExpandedOperationsGraphTemplateInputs = [
	...effectV4ExpandedRealWorldGraphTemplateInputs,
	...effectV4OperationsTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
