import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectFileSystemGraphTemplateInputs } from './effect-file-system-templates.js'
import { effectPathGraphTemplateInputs } from './effect-path-templates.js'
import { effectTerminalGraphTemplateInputs } from './effect-terminal-templates.js'

export * from './effect-file-system-templates.js'
export * from './effect-path-templates.js'
export * from './effect-terminal-templates.js'

/** Every canonical Effect v4 template in the platform domain. */
export const effectV4PlatformGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectFileSystemGraphTemplateInputs,
	effectPathGraphTemplateInputs,
	effectTerminalGraphTemplateInputs
)
