import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4EventLogPersistenceFoundationalGraphTemplateInputs } from './effect-v4-eventlog-persistence-foundational-templates.js'
import { effectV4EventLogOfflineFirstCompositionGraphTemplateInputs } from './effect-v4-eventlog-offline-first-templates.js'

export * from './effect-eventlog-persistence-template-helpers.js'
export * from './effect-v4-eventlog-persistence-foundational-templates.js'
export * from './effect-v4-eventlog-offline-first-templates.js'

export const effectV4EventLogPersistenceOfflineFirstTemplateInputs = [
	...effectV4EventLogPersistenceFoundationalGraphTemplateInputs,
	...effectV4EventLogOfflineFirstCompositionGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
