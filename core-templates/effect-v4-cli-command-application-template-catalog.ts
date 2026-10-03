import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4CliFoundationalGraphTemplateInputs } from './effect-v4-cli-foundational-templates.js'
import { effectV4CliCommandApplicationGraphTemplateInputs } from './effect-v4-cli-command-application-templates.js'

export * from './effect-cli-template-helpers.js'
export * from './effect-v4-cli-foundational-templates.js'
export * from './effect-v4-cli-command-application-templates.js'

export const effectV4CliCommandApplicationTemplateInputs = [
	...effectV4CliFoundationalGraphTemplateInputs,
	...effectV4CliCommandApplicationGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
