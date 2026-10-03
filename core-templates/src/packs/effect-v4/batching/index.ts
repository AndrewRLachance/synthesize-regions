import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectBatchingGraphTemplateInputs } from './effect-batching-templates.js'

export * from './effect-batching-templates.js'

/** Every canonical Effect v4 template in the batching domain. */
export const effectV4BatchingGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectBatchingGraphTemplateInputs
)
