import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
import { effectV4HttpFoundationalGraphTemplateInputs } from './effect-v4-http-foundational-templates.js'
import { effectV4HttpApiFoundationalGraphTemplateInputs } from './effect-v4-http-api-foundational-templates.js'
import { effectV4HttpRestServiceBoundaryGraphTemplateInputs } from './effect-v4-http-rest-service-boundary-templates.js'

export * from './effect-http-rest-template-helpers.js'
export * from './effect-v4-http-foundational-templates.js'
export * from './effect-v4-http-api-foundational-templates.js'
export * from './effect-v4-http-rest-service-boundary-templates.js'

export const effectV4HttpRestServiceBoundaryTemplateInputs = [
	...effectV4HttpFoundationalGraphTemplateInputs,
	...effectV4HttpApiFoundationalGraphTemplateInputs,
	...effectV4HttpRestServiceBoundaryGraphTemplateInputs
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
