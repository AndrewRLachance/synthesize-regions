import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectBehaviourGraphTemplateInputs } from './effect-behaviour-templates.js'
import { effectExitGraphTemplateInputs } from './effect-exit-templates.js'
import { effectGraphTemplateInputs } from './effect-ts.js'
import { effectV4OperationsFoundationalGraphTemplateInputs } from './effect-v4-operations-foundational-templates.js'
import { effectV4RequirementsGraphTemplateInputs } from './effect-v4-requirements-templates.js'

export * from './effect-behaviour-templates.js'
export * from './effect-exit-templates.js'
export * from './effect-ts.js'
export * from './effect-v4-operations-foundational-templates.js'
export * from './effect-v4-requirements-templates.js'

/** Every canonical Effect v4 template in the core domain. */
export const effectV4CoreGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectBehaviourGraphTemplateInputs,
	effectExitGraphTemplateInputs,
	effectGraphTemplateInputs,
	effectV4OperationsFoundationalGraphTemplateInputs,
	effectV4RequirementsGraphTemplateInputs
)
