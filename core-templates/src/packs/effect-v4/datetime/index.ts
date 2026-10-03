import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectDateTimeGraphTemplateInputs } from './effect-datetime-templates.js'

export * from './effect-datetime-templates.js'

/** Every canonical Effect v4 template in the datetime domain. */
export const effectV4DatetimeGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectDateTimeGraphTemplateInputs
)
