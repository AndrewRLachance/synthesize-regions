import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedClusterDistributedServiceGraphTemplateInputs } from './effect-v4-expanded-with-cluster-distributed-service-template-catalog.js'
import { effectV4OpenApiGeneratedIntegrationTemplateInputs } from './effect-v4-openapi-generated-integration-template-catalog.js'

export * from './effect-v4-expanded-with-cluster-distributed-service-template-catalog.js'
export * from './effect-v4-openapi-generated-integration-template-catalog.js'

export const effectV4ExpandedOpenApiGeneratedIntegrationGraphTemplateInputs = [
	...effectV4ExpandedClusterDistributedServiceGraphTemplateInputs,
	...effectV4OpenApiGeneratedIntegrationTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
