import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedChildProcessOsIntegrationGraphTemplateInputs } from './effect-v4-expanded-with-child-process-os-integration-template-catalog.js'
import { effectV4SecurityCrossBoundaryCatalogTemplateInputs } from './effect-v4-security-cross-boundary-template-catalog.js'

export * from './effect-v4-expanded-with-child-process-os-integration-template-catalog.js'
export * from './effect-v4-security-cross-boundary-template-catalog.js'

export const effectV4ExpandedSecurityCrossBoundaryGraphTemplateInputs = [
	...effectV4ExpandedChildProcessOsIntegrationGraphTemplateInputs,
	...effectV4SecurityCrossBoundaryCatalogTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
