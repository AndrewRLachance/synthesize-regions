import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4OperationsFoundationalGraphTemplateInputs } from './effect-v4-operations-foundational-templates.js'

/**
 * Operations pack: Latch and Semaphore synchronization primitives.
 */

export { effectV4OperationsFoundationalGraphTemplateInputs } from './effect-v4-operations-foundational-templates.js'
export {
	latchType,
	semaphoreType
} from './effect-v4-operations-foundational-templates.js'

export const effectV4OperationsTemplateInputs = [
	...effectV4OperationsFoundationalGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
