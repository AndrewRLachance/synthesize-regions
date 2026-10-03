import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4TransactionFoundationalTemplateInputs } from './effect-v4-transaction-foundational-templates.js'
import { effectV4TransactionalCoordinationTemplateInputs } from './effect-v4-transactional-coordination-templates.js'

export * from './effect-v4-transaction-foundational-templates.js'
export * from './effect-v4-transactional-coordination-templates.js'

/** Every canonical Effect v4 template in the stm domain. */
export const effectV4StmGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4TransactionFoundationalTemplateInputs,
	effectV4TransactionalCoordinationTemplateInputs
)
