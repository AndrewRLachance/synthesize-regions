import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectFileSystemGraphTemplateInputs } from './effect-file-system-templates.js'
import { effectPathGraphTemplateInputs } from './effect-path-templates.js'
import { effectPlatformLoggerGraphTemplateInputs } from './effect-platform-logger-templates.js'
import { effectTerminalGraphTemplateInputs } from './effect-terminal-templates.js'

export {
	effectFileSystemGraphTemplateInputs
} from './effect-file-system-templates.js'

export {
	effectPathGraphTemplateInputs
} from './effect-path-templates.js'

export {
	effectPlatformLoggerGraphTemplateInputs
} from './effect-platform-logger-templates.js'

export {
	effectTerminalGraphTemplateInputs
} from './effect-terminal-templates.js'

export const effectPlatformGraphTemplateInputs = [
	...effectPathGraphTemplateInputs,
	...effectFileSystemGraphTemplateInputs,
	...effectTerminalGraphTemplateInputs,
	...effectPlatformLoggerGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
