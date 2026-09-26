import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4RpcFoundationalGraphTemplateInputs } from './effect-v4-rpc-foundational-templates.js'
import { effectV4RpcServiceBoundaryGraphTemplateInputs } from './effect-v4-rpc-service-boundary-templates.js'

export * from './effect-rpc-template-helpers.js'
export * from './effect-v4-rpc-foundational-templates.js'
export * from './effect-v4-rpc-service-boundary-templates.js'

export const effectV4RpcServiceBoundaryTemplateInputs = [
	...effectV4RpcFoundationalGraphTemplateInputs,
	...effectV4RpcServiceBoundaryGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
