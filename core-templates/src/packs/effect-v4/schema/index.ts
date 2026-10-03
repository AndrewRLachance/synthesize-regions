import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectSchemaGraphTemplateInputs } from './effect-schema-templates.js'

export * from './effect-schema-templates.js'

/** Every canonical Effect v4 template in the schema domain. */
export const effectV4SchemaGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectSchemaGraphTemplateInputs
)
