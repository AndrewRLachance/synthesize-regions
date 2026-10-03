import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectRedactedGraphTemplateInputs } from './effect-redacted-templates.js'
import { effectV4SecurityCrossBoundaryTemplateInputs } from './effect-v4-security-cross-boundary-templates.js'
import { effectV4SecurityFoundationalTemplateInputs } from './effect-v4-security-foundational-templates.js'

export * from './effect-redacted-templates.js'
export * from './effect-v4-security-cross-boundary-templates.js'
export * from './effect-v4-security-foundational-templates.js'

/** Every canonical Effect v4 template in the security domain. */
export const effectV4SecurityGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectRedactedGraphTemplateInputs,
	effectV4SecurityCrossBoundaryTemplateInputs,
	effectV4SecurityFoundationalTemplateInputs
)
