import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ResilienceFoundationalGraphTemplateInputs } from './effect-v4-resilience-foundational-templates.js'
import { effectV4ResilienceWorkerGraphTemplateInputs } from './effect-v4-resilience-worker-templates.js'

export * from './effect-v4-resilience-foundational-templates.js'
export * from './effect-v4-resilience-worker-templates.js'

export const effectV4ResilienceWorkerTemplateInputs = [
	...effectV4ResilienceFoundationalGraphTemplateInputs,
	...effectV4ResilienceWorkerGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
