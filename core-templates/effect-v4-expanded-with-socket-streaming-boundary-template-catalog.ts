import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4ExpandedStmTransactionalCoordinationGraphTemplateInputs } from './effect-v4-expanded-with-stm-transactional-coordination-template-catalog.js'
import { effectV4SocketStreamingBoundaryTemplateInputs } from './effect-v4-socket-streaming-boundary-template-catalog.js'

export const effectV4ExpandedSocketStreamingBoundaryGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = [
	...effectV4ExpandedStmTransactionalCoordinationGraphTemplateInputs,
	...effectV4SocketStreamingBoundaryTemplateInputs
]
