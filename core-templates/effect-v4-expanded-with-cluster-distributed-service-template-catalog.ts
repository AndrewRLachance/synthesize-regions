import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedOtlpProductionObservabilityGraphTemplateInputs } from './effect-v4-expanded-with-otlp-production-observability-template-catalog.js'
import { effectV4ClusterDistributedServiceTemplateInputs } from './effect-v4-cluster-distributed-service-template-catalog.js'

export * from './effect-v4-expanded-with-otlp-production-observability-template-catalog.js'
export * from './effect-v4-cluster-distributed-service-template-catalog.js'

export const effectV4ExpandedClusterDistributedServiceGraphTemplateInputs = [
	...effectV4ExpandedOtlpProductionObservabilityGraphTemplateInputs,
	...effectV4ClusterDistributedServiceTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
