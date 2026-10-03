import type { TypeDescriptor } from 'synthesize-regions'
import { nominalType, typedExpressionInput, type TypeDescriptorWithTs } from '../../../authoring/effect-v4/effect-template-helpers.js'

export const httpClientRequirement = '{ readonly __httpClientRequirement: "HttpClient" }'
export const httpServerRequirement = '{ readonly __httpServerRequirement: "HttpServer" }'
export const httpRouterRequirement = '{ readonly __httpRouterRequirement: "HttpRouter" }'
export const httpPlatformRequirement = '{ readonly __httpPlatformRequirement: "HttpPlatform" }'
export const fileSystemRequirement = '{ readonly __fileSystemRequirement: "FileSystem" }'
export const pathRequirement = '{ readonly __pathRequirement: "Path" }'
export const scopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'
export const rateLimiterRequirement = '{ readonly __rateLimiterRequirement: "RateLimiter" }'

export const httpClientErrorType = '{ readonly _tag: "HttpClientError"; readonly reason?: unknown }'
export const httpServerErrorType = '{ readonly _tag: "HttpServerError"; readonly reason?: unknown }'
export const httpBodyErrorType = '{ readonly _tag: "HttpBodyError"; readonly reason?: unknown }'
export const httpApiSchemaErrorType = '{ readonly _tag: "HttpApiSchemaError"; readonly issue?: unknown }'

export const httpClientRequestType = (): TypeDescriptor => nominalType('effect/unstable/http/HttpClientRequest')
export const httpClientResponseType = (): TypeDescriptor => nominalType('effect/http/HttpClientResponse')
export const httpClientType = (error = httpClientErrorType, requirements = 'never'): TypeDescriptorWithTs =>
	nominalType('effect/unstable/http/HttpClient', { httpClientError: error, httpClientRequirements: requirements })
export const httpServerRequestType = (): TypeDescriptor => nominalType('effect/http/HttpServerRequest')
export const httpServerResponseType = (): TypeDescriptor => nominalType('effect/unstable/http/HttpServerResponse')
export const httpRouterRouteType = (error = 'never', requirements = 'never'): TypeDescriptor =>
	nominalType('effect/http/HttpRouter.Route', { httpRouteError: error, httpRouteRequirements: requirements })

export const httpApiType = (id = 'string', groups = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/httpapi/HttpApi', { httpApiId: id, httpApiGroups: groups })
export const httpApiGroupType = (id = 'string', endpoints = 'unknown', topLevel = 'boolean'): TypeDescriptor =>
	nominalType('effect/unstable/httpapi/HttpApiGroup', { httpApiGroupId: id, httpApiGroupEndpoints: endpoints, httpApiGroupTopLevel: topLevel })
export const httpApiEndpointType = (id = 'string', method = 'string', path = 'string'): TypeDescriptor =>
	nominalType('effect/unstable/httpapi/HttpApiEndpoint', { httpApiEndpointId: id, httpApiEndpointMethod: method, httpApiEndpointPath: path })
export const httpApiMiddlewareType = (
	provides = 'never',
	error = 'never',
	requires = 'never',
	clientError = 'never',
	requiredForClient = 'false'
): TypeDescriptor => nominalType('effect/unstable/httpapi/HttpApiMiddleware.Service', {
	httpApiMiddlewareProvides: provides,
	httpApiMiddlewareError: error,
	httpApiMiddlewareRequires: requires,
	httpApiMiddlewareClientError: clientError,
	httpApiMiddlewareRequiredForClient: requiredForClient
})
/**
 * Phantom slot describing which `HttpApiSecurity` constructor produced a value.
 *
 * The argument is a TypeScript *type* expression, so a scheme name has to be
 * spelled as a string literal type (`'"bearer"'`) rather than as a bare
 * identifier, which would not resolve in a self-contained descriptor.
 */
export const httpApiSecurityType = (kind = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/httpapi/HttpApiSecurity', { httpApiSecurityKind: kind })

/** Convenience wrapper that spells a scheme name as a string literal type. */
export const httpApiSecurityKind = (name: string): TypeDescriptor => httpApiSecurityType(`"${name}"`)
export const openApiSpecType = (): TypeDescriptor => nominalType('effect/unstable/httpapi/OpenApi.OpenAPISpec')

export const httpClientRequestInput = (description: string) => typedExpressionInput(description, httpClientRequestType())
export const httpClientInput = (description: string, error = httpClientErrorType, requirements = 'never') =>
	typedExpressionInput(description, httpClientType(error, requirements))
export const httpApiInput = (description: string, id = 'string', groups = 'unknown') =>
	typedExpressionInput(description, httpApiType(id, groups))
export const httpApiGroupInput = (description: string, id = 'string', endpoints = 'unknown', topLevel = 'boolean') =>
	typedExpressionInput(description, httpApiGroupType(id, endpoints, topLevel))
export const httpApiEndpointInput = (description: string, id = 'string', method = 'string', path = 'string') =>
	typedExpressionInput(description, httpApiEndpointType(id, method, path))
export const httpApiMiddlewareInput = (description: string) => typedExpressionInput(description, httpApiMiddlewareType())
