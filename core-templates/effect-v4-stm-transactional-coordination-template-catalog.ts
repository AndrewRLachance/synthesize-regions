import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4TransactionFoundationalTemplateInputs } from './effect-v4-transaction-foundational-templates.js'
import { effectV4TransactionalCoordinationTemplateInputs } from './effect-v4-transactional-coordination-templates.js'

export * from './effect-transaction-template-helpers.js'
export * from './effect-v4-transaction-foundational-templates.js'
export * from './effect-v4-transactional-coordination-templates.js'

export const effectV4StmTransactionalCoordinationTemplateInputs = [
	...effectV4TransactionFoundationalTemplateInputs,
	...effectV4TransactionalCoordinationTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
