import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectSinkV4GraphTemplateInputs } from './effect-sink-v4-templates.js'
import { effectStreamSinkRealWorldGraphTemplateInputs } from './effect-stream-sink-real-world-templates.js'
import { effectStreamV4GraphTemplateInputs } from './effect-stream-v4-templates.js'

export * from './effect-sink-v4-templates.js'
export * from './effect-stream-sink-real-world-templates.js'
export * from './effect-stream-v4-templates.js'

/** Every canonical Effect v4 template in the stream domain. */
export const effectV4StreamGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectSinkV4GraphTemplateInputs,
	effectStreamSinkRealWorldGraphTemplateInputs,
	effectStreamV4GraphTemplateInputs
)
