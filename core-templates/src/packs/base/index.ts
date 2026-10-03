import type { GraphTemplateDefinition } from 'synthesize-regions'
import { basePatternGraphTemplateInputs, coreGraphTemplateInputs } from './e-samplesBasePatterns.js'

export * from './e-samplesBasePatterns.js'

export const allBaseGraphTemplateInputs: readonly GraphTemplateDefinition<any, string, any>[] = (
	[] as GraphTemplateDefinition<any, string, any>[]
).concat(basePatternGraphTemplateInputs, coreGraphTemplateInputs)
