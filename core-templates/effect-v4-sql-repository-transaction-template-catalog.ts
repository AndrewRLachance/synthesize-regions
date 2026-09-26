import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4SqlFoundationalGraphTemplateInputs } from './effect-v4-sql-foundational-templates.js'
import { effectV4SqlRepositoryTransactionGraphTemplateInputs } from './effect-v4-sql-repository-transaction-templates.js'

export * from './effect-sql-template-helpers.js'
export * from './effect-v4-sql-foundational-templates.js'
export * from './effect-v4-sql-repository-transaction-templates.js'

export const effectV4SqlRepositoryTransactionTemplateInputs = [
	...effectV4SqlFoundationalGraphTemplateInputs,
	...effectV4SqlRepositoryTransactionGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
