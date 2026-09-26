import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectBatchingGraphTemplateInputs } from './effect-batching-templates.js'
import { effectBehaviourGraphTemplateInputs } from './effect-behaviour-templates.js'
import { effectCacheGraphTemplateInputs } from './effect-cache-templates.js'
import { effectErrorGraphTemplateInputs } from './effect-error-management-v4-templates.js'
import { effectObservabilityGraphTemplateInputs } from './effect-observability-v4-templates.js'
import { effectPlatformGraphTemplateInputs } from './effect-platform-templates.js'
import { effectV4DataTypeGraphTemplateInputs } from './effect-v4-template-catalog.js'
import { effectV4GuideGraphTemplateInputs } from './effect-v4-guide-templates.js'

/**
 * Base of the v4 expansion chain: the real-world data, error, observability,
 * batching, behaviour, cache, platform, and guide packs.
 */

export const effectV4ExpandedRealWorldGraphTemplateInputs = [
	...effectV4DataTypeGraphTemplateInputs,
	...effectErrorGraphTemplateInputs,
	...effectObservabilityGraphTemplateInputs,
	...effectBatchingGraphTemplateInputs,
	...effectBehaviourGraphTemplateInputs,
	...effectCacheGraphTemplateInputs,
	...effectPlatformGraphTemplateInputs,
	...effectV4GuideGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
