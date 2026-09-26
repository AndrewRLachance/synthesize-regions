import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedSqlRepositoryTransactionGraphTemplateInputs } from './effect-v4-expanded-with-sql-repository-transaction-template-catalog.js'
import { effectV4RpcServiceBoundaryTemplateInputs } from './effect-v4-rpc-service-boundary-template-catalog.js'

export const effectV4ExpandedRpcServiceBoundaryGraphTemplateInputs = [
	...effectV4ExpandedSqlRepositoryTransactionGraphTemplateInputs,
	...effectV4RpcServiceBoundaryTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
