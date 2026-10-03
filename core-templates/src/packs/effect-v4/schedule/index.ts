import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectScheduleGraphTemplateInputs } from './effect-schedule-templates.js'

export * from './effect-schedule-templates.js'

/** Every canonical Effect v4 template in the schedule domain. */
export const effectV4ScheduleGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectScheduleGraphTemplateInputs
)
