import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedOpenApiGeneratedIntegrationGraphTemplateInputs } from './effect-v4-expanded-with-openapi-generated-integration-template-catalog.js'
import { effectV4EventLogPersistenceOfflineFirstTemplateInputs } from './effect-v4-eventlog-persistence-offline-first-template-catalog.js'

export * from './effect-v4-expanded-with-openapi-generated-integration-template-catalog.js'
export * from './effect-v4-eventlog-persistence-offline-first-template-catalog.js'

export const effectV4ExpandedEventLogPersistenceOfflineFirstGraphTemplateInputs = [
	...effectV4ExpandedOpenApiGeneratedIntegrationGraphTemplateInputs,
	...effectV4EventLogPersistenceOfflineFirstTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
