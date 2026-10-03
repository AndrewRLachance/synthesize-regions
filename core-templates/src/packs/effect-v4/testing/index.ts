import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4BehavioralTestingGraphTemplateInputs } from './effect-v4-behavioral-testing-templates.js'
import { effectV4FaultInjectionGraphTemplateInputs } from './effect-v4-fault-injection-templates.js'
import { effectV4TestingFoundationalGraphTemplateInputs } from './effect-v4-testing-foundational-templates.js'

export * from './effect-v4-behavioral-testing-templates.js'
export * from './effect-v4-fault-injection-templates.js'
export * from './effect-v4-testing-foundational-templates.js'

/** Every canonical Effect v4 template in the testing domain. */
export const effectV4TestingGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4BehavioralTestingGraphTemplateInputs,
	effectV4FaultInjectionGraphTemplateInputs,
	effectV4TestingFoundationalGraphTemplateInputs
)
