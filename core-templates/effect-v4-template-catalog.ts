import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectBigDecimalGraphTemplateInputs } from './effect-bigdecimal-templates.js'
import { effectCauseGraphTemplateInputs } from './effect-cause-templates.js'
import { effectChunkGraphTemplateInputs } from './effect-chunk-templates.js'
import { effectConfigV4GraphTemplateInputs } from './effect-config-templates.js'
import { effectDataGraphTemplateInputs } from './effect-data-templates.js'
import { effectDateTimeGraphTemplateInputs } from './effect-datetime-templates.js'
import { effectDurationGraphTemplateInputs } from './effect-duration-templates.js'
import { effectExitGraphTemplateInputs } from './effect-exit-templates.js'
import { effectHashSetGraphTemplateInputs } from './effect-hash-set-templates.js'
import { effectOptionGraphTemplateInputs } from './effect-option-templates.js'
import { effectRedactedGraphTemplateInputs } from './effect-redacted-templates.js'
import { effectResultGraphTemplateInputs } from './effect-result-templates.js'

export * from './effect-bigdecimal-templates.js'
export * from './effect-cause-templates.js'
export * from './effect-chunk-templates.js'
export * from './effect-config-templates.js'
export * from './effect-data-templates.js'
export * from './effect-data-type-template-helpers.js'
export * from './effect-datetime-templates.js'
export * from './effect-duration-templates.js'
export * from './effect-exit-templates.js'
export * from './effect-hash-set-templates.js'
export * from './effect-option-templates.js'
export * from './effect-redacted-templates.js'
export * from './effect-result-templates.js'

export const effectV4DataTypeGraphTemplateInputs = [
	...effectBigDecimalGraphTemplateInputs,
	...effectCauseGraphTemplateInputs,
	...effectChunkGraphTemplateInputs,
	...effectConfigV4GraphTemplateInputs,
	...effectDataGraphTemplateInputs,
	...effectDateTimeGraphTemplateInputs,
	...effectDurationGraphTemplateInputs,
	...effectExitGraphTemplateInputs,
	...effectHashSetGraphTemplateInputs,
	...effectOptionGraphTemplateInputs,
	...effectRedactedGraphTemplateInputs,
	...effectResultGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
