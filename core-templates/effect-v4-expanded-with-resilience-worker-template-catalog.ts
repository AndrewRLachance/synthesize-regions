import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedStreamSinkGraphTemplateInputs } from './effect-v4-expanded-with-stream-sink-template-catalog.js'
import { effectV4ResilienceWorkerTemplateInputs } from './effect-v4-resilience-worker-template-catalog.js'

export const effectV4ExpandedResilienceWorkerGraphTemplateInputs = [
	...effectV4ExpandedStreamSinkGraphTemplateInputs,
	...effectV4ResilienceWorkerTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
