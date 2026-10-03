import type { TypeDescriptor } from 'synthesize-regions'
import { effectStructuralType } from '../core/effect-ts.js'
import { nominalType, typedExpressionInput } from '../../../authoring/effect-v4/effect-template-helpers.js'
import { httpClientType } from '../http/effect-http-rest-template-helpers.js'

export const openApiGeneratorRequirement = '{ readonly __openApiGeneratorRequirement: "OpenApiGenerator" }'

export const openApiGeneratorWarningCodeType =
	'"cookie-parameter-dropped" | "additional-tags-dropped" | "sse-operation-skipped" | "response-headers-ignored" | "optional-request-body-approximated" | "default-response-remapped" | "security-and-downgraded" | "no-body-method-request-body-skipped" | "naming-collision"'

export const openApiGeneratorWarningType = `{ readonly code: ${openApiGeneratorWarningCodeType}; readonly message: string; readonly path?: string; readonly method?: string; readonly operationId?: string }`
export const openApiGenerationWarningErrorType = `{ readonly _tag: "OpenApiGenerationWarningError"; readonly warnings: ReadonlyArray<${openApiGeneratorWarningType}> }`

export const openApiGeneratorType = (): TypeDescriptor => nominalType('@effect/openapi-generator/OpenApiGenerator.OpenApiGenerator')
export const jsonSchemaNodeType = (): TypeDescriptor => nominalType('effect/JsonSchema.JsonSchema')

export const generatedHttpClientFactoryType = (client = 'unknown'): TypeDescriptor => ({
	nominal: '@effect/openapi-generator/GeneratedHttpClientFactory',
	ts: `(httpClient: ${httpClientType().ts}, options?: { readonly transformClient?: ((client: ${httpClientType().ts}) => ${effectStructuralType(httpClientType().ts, 'never', 'never')}) | undefined }) => ${client}`
})

export const generatedHttpClientType = (client = 'unknown'): TypeDescriptor => ({
	nominal: '@effect/openapi-generator/GeneratedHttpClient',
	ts: client
})

export const generatedSourceBundleType = (): TypeDescriptor => ({
	ts: '{ readonly httpclient: string; readonly httpclientTypeOnly: string; readonly httpapi: string }'
})

export const generatedSourceWithWarningsType = (): TypeDescriptor => ({
	ts: `{ readonly source: string; readonly warnings: ReadonlyArray<${openApiGeneratorWarningType}> }`
})

export const generatedFactoryInput = (description: string, client = 'unknown') =>
	typedExpressionInput(description, generatedHttpClientFactoryType(client))
