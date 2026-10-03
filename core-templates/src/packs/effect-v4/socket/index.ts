import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4SocketFoundationalGraphTemplateInputs } from './effect-v4-socket-foundational-templates.js'
import { effectV4SocketStreamingBoundaryGraphTemplateInputs } from './effect-v4-socket-streaming-boundary-templates.js'

export * from './effect-v4-socket-foundational-templates.js'
export * from './effect-v4-socket-streaming-boundary-templates.js'

/** Every canonical Effect v4 template in the socket domain. */
export const effectV4SocketGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4SocketFoundationalGraphTemplateInputs,
	effectV4SocketStreamingBoundaryGraphTemplateInputs
)
