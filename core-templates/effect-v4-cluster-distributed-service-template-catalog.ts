import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ClusterFoundationalGraphTemplateInputs } from './effect-v4-cluster-foundational-templates.js'
import { effectV4ClusterDistributedServiceGraphTemplateInputs } from './effect-v4-cluster-distributed-service-templates.js'

export * from './effect-cluster-template-helpers.js'
export * from './effect-v4-cluster-foundational-templates.js'
export * from './effect-v4-cluster-distributed-service-templates.js'

export const effectV4ClusterDistributedServiceTemplateInputs = [
	...effectV4ClusterFoundationalGraphTemplateInputs,
	...effectV4ClusterDistributedServiceGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
