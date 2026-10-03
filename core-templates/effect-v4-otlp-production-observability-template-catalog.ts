import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4OtlpObservabilityFoundationalGraphTemplateInputs } from './effect-v4-otlp-observability-foundational-templates.js'
import { effectV4ProductionObservabilityGraphTemplateInputs } from './effect-v4-production-observability-templates.js'

export * from './effect-production-observability-template-helpers.js'
export * from './effect-v4-otlp-observability-foundational-templates.js'
export * from './effect-v4-production-observability-templates.js'

export const effectV4OtlpProductionObservabilityTemplateInputs = [
	...effectV4OtlpObservabilityFoundationalGraphTemplateInputs,
	...effectV4ProductionObservabilityGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
