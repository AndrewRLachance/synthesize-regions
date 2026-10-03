import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectBigDecimalGraphTemplateInputs } from './effect-bigdecimal-templates.js'
import { effectChunkGraphTemplateInputs } from './effect-chunk-templates.js'
import { effectDataGraphTemplateInputs } from './effect-data-templates.js'
import { effectDurationGraphTemplateInputs } from './effect-duration-templates.js'
import { effectHashSetGraphTemplateInputs } from './effect-hash-set-templates.js'
import { effectOptionGraphTemplateInputs } from './effect-option-templates.js'
import { effectResultGraphTemplateInputs } from './effect-result-templates.js'

export * from './effect-bigdecimal-templates.js'
export * from './effect-chunk-templates.js'
export * from './effect-data-templates.js'
export * from './effect-duration-templates.js'
export * from './effect-hash-set-templates.js'
export * from './effect-option-templates.js'
export * from './effect-result-templates.js'

/** Every canonical Effect v4 template in the data domain. */
export const effectV4DataGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectBigDecimalGraphTemplateInputs,
	effectChunkGraphTemplateInputs,
	effectDataGraphTemplateInputs,
	effectDurationGraphTemplateInputs,
	effectHashSetGraphTemplateInputs,
	effectOptionGraphTemplateInputs,
	effectResultGraphTemplateInputs
)
