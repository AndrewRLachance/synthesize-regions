import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectConcurrencyGraphTemplateInputs } from './effect-concurrency-templates.js'
import { effectCoordinationGraphTemplateInputs } from './effect-coordination-templates.js'

export * from './effect-concurrency-templates.js'
export * from './effect-coordination-templates.js'

/** Every canonical Effect v4 template in the concurrency domain. */
export const effectV4ConcurrencyGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectConcurrencyGraphTemplateInputs,
	effectCoordinationGraphTemplateInputs
)
