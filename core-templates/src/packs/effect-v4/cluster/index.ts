import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4ClusterDistributedServiceGraphTemplateInputs } from './effect-v4-cluster-distributed-service-templates.js'
import { effectV4ClusterFoundationalGraphTemplateInputs } from './effect-v4-cluster-foundational-templates.js'

export * from './effect-v4-cluster-distributed-service-templates.js'
export * from './effect-v4-cluster-foundational-templates.js'

/** Every canonical Effect v4 template in the cluster domain. */
export const effectV4ClusterGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4ClusterDistributedServiceGraphTemplateInputs,
	effectV4ClusterFoundationalGraphTemplateInputs
)
