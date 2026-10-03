import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4ResilienceFoundationalGraphTemplateInputs } from './effect-v4-resilience-foundational-templates.js'
import { effectV4ResilienceWorkerGraphTemplateInputs } from './effect-v4-resilience-worker-templates.js'

export * from './effect-v4-resilience-foundational-templates.js'
export * from './effect-v4-resilience-worker-templates.js'

/** Every canonical Effect v4 template in the resilience domain. */
export const effectV4ResilienceGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4ResilienceFoundationalGraphTemplateInputs,
	effectV4ResilienceWorkerGraphTemplateInputs
)
