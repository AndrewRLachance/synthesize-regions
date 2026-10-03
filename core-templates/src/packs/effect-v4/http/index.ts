import type { AnyEffectFamilyTemplateDefinitionInput } from '../../../authoring/effect-v4/index.js'
import { effectV4HttpApiFoundationalGraphTemplateInputs } from './effect-v4-http-api-foundational-templates.js'
import { effectV4HttpFoundationalGraphTemplateInputs } from './effect-v4-http-foundational-templates.js'
import { effectV4HttpRestServiceBoundaryGraphTemplateInputs } from './effect-v4-http-rest-service-boundary-templates.js'

export * from './effect-v4-http-api-foundational-templates.js'
export * from './effect-v4-http-foundational-templates.js'
export * from './effect-v4-http-rest-service-boundary-templates.js'

/** Every canonical Effect v4 template in the http domain. */
export const effectV4HttpGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
	effectV4HttpApiFoundationalGraphTemplateInputs,
	effectV4HttpFoundationalGraphTemplateInputs,
	effectV4HttpRestServiceBoundaryGraphTemplateInputs
)
