import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectCacheGraphTemplateInputs } from './effect-cache-templates.js'

export * from './effect-cache-templates.js'

/** Every canonical Effect v4 template in the cache domain. */
export const effectV4CacheGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectCacheGraphTemplateInputs
)
