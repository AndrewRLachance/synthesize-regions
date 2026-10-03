import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedApplicationAssemblyGraphTemplateInputs } from './effect-v4-expanded-with-application-assembly-template-catalog.js'
import { effectV4HttpRestServiceBoundaryTemplateInputs } from './effect-v4-http-rest-service-boundary-template-catalog.js'

export * from './effect-v4-expanded-with-application-assembly-template-catalog.js'
export * from './effect-v4-http-rest-service-boundary-template-catalog.js'

export const effectV4ExpandedHttpRestServiceBoundaryGraphTemplateInputs = [
	...effectV4ExpandedApplicationAssemblyGraphTemplateInputs,
	...effectV4HttpRestServiceBoundaryTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
