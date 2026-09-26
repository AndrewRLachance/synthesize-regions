import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedRpcServiceBoundaryGraphTemplateInputs } from './effect-v4-expanded-with-rpc-service-boundary-template-catalog.js'
import { effectV4StmTransactionalCoordinationTemplateInputs } from './effect-v4-stm-transactional-coordination-template-catalog.js'

export const effectV4ExpandedStmTransactionalCoordinationGraphTemplateInputs = [
	...effectV4ExpandedRpcServiceBoundaryGraphTemplateInputs,
	...effectV4StmTransactionalCoordinationTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
