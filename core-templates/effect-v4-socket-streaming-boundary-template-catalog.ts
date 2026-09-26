import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4SocketFoundationalGraphTemplateInputs } from './effect-v4-socket-foundational-templates.js'
import { effectV4SocketStreamingBoundaryGraphTemplateInputs } from './effect-v4-socket-streaming-boundary-templates.js'

export * from './effect-socket-template-helpers.js'
export * from './effect-v4-socket-foundational-templates.js'
export * from './effect-v4-socket-streaming-boundary-templates.js'

export const effectV4SocketStreamingBoundaryTemplateInputs = [
	...effectV4SocketFoundationalGraphTemplateInputs,
	...effectV4SocketStreamingBoundaryGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
