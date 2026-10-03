import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedHttpRestServiceBoundaryGraphTemplateInputs } from './effect-v4-expanded-with-http-rest-service-boundary-template-catalog.js'
import { effectV4OtlpProductionObservabilityTemplateInputs } from './effect-v4-otlp-production-observability-template-catalog.js'

export * from './effect-v4-expanded-with-http-rest-service-boundary-template-catalog.js'
export * from './effect-v4-otlp-production-observability-template-catalog.js'

export const effectV4ExpandedOtlpProductionObservabilityGraphTemplateInputs = [
	...effectV4ExpandedHttpRestServiceBoundaryGraphTemplateInputs,
	...effectV4OtlpProductionObservabilityTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
