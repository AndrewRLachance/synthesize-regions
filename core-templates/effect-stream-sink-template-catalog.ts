import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectSinkV4GraphTemplateInputs } from './effect-sink-v4-templates.js'
import { effectStreamV4GraphTemplateInputs } from './effect-stream-v4-templates.js'
import { effectStreamSinkRealWorldGraphTemplateInputs } from './effect-stream-sink-real-world-templates.js'

export * from './effect-stream-sink-template-helpers.js'
export * from './effect-sink-v4-templates.js'
export * from './effect-stream-v4-templates.js'
export * from './effect-stream-sink-real-world-templates.js'

export const effectStreamSinkV4GraphTemplateInputs = [
	...effectStreamV4GraphTemplateInputs,
	...effectSinkV4GraphTemplateInputs,
	...effectStreamSinkRealWorldGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
