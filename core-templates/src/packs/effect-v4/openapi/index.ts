import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4OpenApiGeneratedIntegrationGraphTemplateInputs } from './effect-v4-openapi-generated-integration-templates.js'
import { effectV4OpenApiGeneratorFoundationalGraphTemplateInputs } from './effect-v4-openapi-generator-foundational-templates.js'

export * from './effect-v4-openapi-generated-integration-templates.js'
export * from './effect-v4-openapi-generator-foundational-templates.js'

/** Every canonical Effect v4 template in the openapi domain. */
export const effectV4OpenapiGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4OpenApiGeneratedIntegrationGraphTemplateInputs,
	effectV4OpenApiGeneratorFoundationalGraphTemplateInputs
)
