import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4RpcFoundationalGraphTemplateInputs } from './effect-v4-rpc-foundational-templates.js'
import { effectV4RpcServiceBoundaryGraphTemplateInputs } from './effect-v4-rpc-service-boundary-templates.js'

export * from './effect-v4-rpc-foundational-templates.js'
export * from './effect-v4-rpc-service-boundary-templates.js'

/** Every canonical Effect v4 template in the rpc domain. */
export const effectV4RpcGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4RpcFoundationalGraphTemplateInputs,
	effectV4RpcServiceBoundaryGraphTemplateInputs
)
