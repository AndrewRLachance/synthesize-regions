import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4EventLogOfflineFirstCompositionGraphTemplateInputs } from './effect-v4-eventlog-offline-first-templates.js'
import { effectV4EventLogPersistenceFoundationalGraphTemplateInputs } from './effect-v4-eventlog-persistence-foundational-templates.js'

export * from './effect-v4-eventlog-offline-first-templates.js'
export * from './effect-v4-eventlog-persistence-foundational-templates.js'

/** Every canonical Effect v4 template in the eventlog domain. */
export const effectV4EventlogGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4EventLogOfflineFirstCompositionGraphTemplateInputs,
	effectV4EventLogPersistenceFoundationalGraphTemplateInputs
)
