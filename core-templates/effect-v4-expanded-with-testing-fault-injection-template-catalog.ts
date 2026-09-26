import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedResilienceWorkerGraphTemplateInputs } from './effect-v4-expanded-with-resilience-worker-template-catalog.js'
import { effectV4TestingFaultInjectionGraphTemplateInputs } from './effect-v4-testing-fault-injection-template-catalog.js'

export const effectV4ExpandedTestingFaultInjectionGraphTemplateInputs = [
	...effectV4ExpandedResilienceWorkerGraphTemplateInputs,
	...effectV4TestingFaultInjectionGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
