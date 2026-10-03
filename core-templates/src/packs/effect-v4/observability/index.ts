import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectObservabilityGraphTemplateInputs } from './effect-observability-v4-templates.js'
import { effectPlatformLoggerGraphTemplateInputs } from './effect-platform-logger-templates.js'
import { effectV4OtlpObservabilityFoundationalGraphTemplateInputs } from './effect-v4-otlp-observability-foundational-templates.js'
import { effectV4ProductionObservabilityGraphTemplateInputs } from './effect-v4-production-observability-templates.js'

export * from './effect-observability-v4-templates.js'
export * from './effect-platform-logger-templates.js'
export * from './effect-v4-otlp-observability-foundational-templates.js'
export * from './effect-v4-production-observability-templates.js'

/** Every canonical Effect v4 template in the observability domain. */
export const effectV4ObservabilityGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectObservabilityGraphTemplateInputs,
	effectPlatformLoggerGraphTemplateInputs,
	effectV4OtlpObservabilityFoundationalGraphTemplateInputs,
	effectV4ProductionObservabilityGraphTemplateInputs
)
