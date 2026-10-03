import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4SqlFoundationalGraphTemplateInputs } from './effect-v4-sql-foundational-templates.js'
import { effectV4SqlRepositoryTransactionGraphTemplateInputs } from './effect-v4-sql-repository-transaction-templates.js'

export * from './effect-v4-sql-foundational-templates.js'
export * from './effect-v4-sql-repository-transaction-templates.js'

/** Every canonical Effect v4 template in the sql domain. */
export const effectV4SqlGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4SqlFoundationalGraphTemplateInputs,
	effectV4SqlRepositoryTransactionGraphTemplateInputs
)
