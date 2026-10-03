import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedCliCommandApplicationGraphTemplateInputs } from './effect-v4-expanded-with-cli-command-application-template-catalog.js'
import { effectV4ChildProcessOsIntegrationTemplateInputs } from './effect-v4-child-process-os-integration-template-catalog.js'

export * from './effect-v4-expanded-with-cli-command-application-template-catalog.js'
export * from './effect-v4-child-process-os-integration-template-catalog.js'

export const effectV4ExpandedChildProcessOsIntegrationGraphTemplateInputs = [
	...effectV4ExpandedCliCommandApplicationGraphTemplateInputs,
	...effectV4ChildProcessOsIntegrationTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
