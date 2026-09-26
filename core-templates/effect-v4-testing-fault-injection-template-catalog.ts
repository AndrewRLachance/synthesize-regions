import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4TestingFoundationalGraphTemplateInputs } from './effect-v4-testing-foundational-templates.js'
import { effectV4FaultInjectionGraphTemplateInputs } from './effect-v4-fault-injection-templates.js'
import { effectV4BehavioralTestingGraphTemplateInputs } from './effect-v4-behavioral-testing-templates.js'

export * from './effect-v4-testing-foundational-templates.js'
export * from './effect-v4-fault-injection-templates.js'
export * from './effect-v4-behavioral-testing-templates.js'

export const effectV4TestingFaultInjectionGraphTemplateInputs = [
	...effectV4TestingFoundationalGraphTemplateInputs,
	...effectV4FaultInjectionGraphTemplateInputs,
	...effectV4BehavioralTestingGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
