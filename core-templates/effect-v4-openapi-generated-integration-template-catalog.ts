import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4OpenApiGeneratorFoundationalGraphTemplateInputs } from './effect-v4-openapi-generator-foundational-templates.js'
import { effectV4OpenApiGeneratedIntegrationGraphTemplateInputs } from './effect-v4-openapi-generated-integration-templates.js'

export * from './effect-openapi-generated-template-helpers.js'
export * from './effect-v4-openapi-generator-foundational-templates.js'
export * from './effect-v4-openapi-generated-integration-templates.js'

export const effectV4OpenApiGeneratedIntegrationTemplateInputs = [
	...effectV4OpenApiGeneratorFoundationalGraphTemplateInputs,
	...effectV4OpenApiGeneratedIntegrationGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
