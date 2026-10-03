import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4CliCommandApplicationGraphTemplateInputs } from './effect-v4-cli-command-application-templates.js'
import { effectV4CliFoundationalGraphTemplateInputs } from './effect-v4-cli-foundational-templates.js'

export * from './effect-v4-cli-command-application-templates.js'
export * from './effect-v4-cli-foundational-templates.js'

/** Every canonical Effect v4 template in the cli domain. */
export const effectV4CliGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4CliCommandApplicationGraphTemplateInputs,
	effectV4CliFoundationalGraphTemplateInputs
)
