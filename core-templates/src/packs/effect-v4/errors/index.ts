import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectCauseGraphTemplateInputs } from './effect-cause-templates.js'
import { effectErrorManagementGraphTemplateInputs } from './effect-error-management-v4-templates.js'

export * from './effect-cause-templates.js'
export * from './effect-error-management-v4-templates.js'

/** Every canonical Effect v4 template in the errors domain. */
export const effectV4ErrorsGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectCauseGraphTemplateInputs,
	effectErrorManagementGraphTemplateInputs
)
