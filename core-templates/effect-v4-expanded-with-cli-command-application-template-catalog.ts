import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedEventLogPersistenceOfflineFirstGraphTemplateInputs } from './effect-v4-expanded-with-eventlog-persistence-offline-first-template-catalog.js'
import { effectV4CliCommandApplicationTemplateInputs } from './effect-v4-cli-command-application-template-catalog.js'

export * from './effect-v4-expanded-with-eventlog-persistence-offline-first-template-catalog.js'
export * from './effect-v4-cli-command-application-template-catalog.js'

export const effectV4ExpandedCliCommandApplicationGraphTemplateInputs = [
	...effectV4ExpandedEventLogPersistenceOfflineFirstGraphTemplateInputs,
	...effectV4CliCommandApplicationTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
