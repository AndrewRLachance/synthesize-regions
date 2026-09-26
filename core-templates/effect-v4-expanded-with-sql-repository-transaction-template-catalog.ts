import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedTestingFaultInjectionGraphTemplateInputs } from './effect-v4-expanded-with-testing-fault-injection-template-catalog.js'
import { effectV4SqlRepositoryTransactionTemplateInputs } from './effect-v4-sql-repository-transaction-template-catalog.js'

export const effectV4ExpandedSqlRepositoryTransactionGraphTemplateInputs = [
	...effectV4ExpandedTestingFaultInjectionGraphTemplateInputs,
	...effectV4SqlRepositoryTransactionTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
