import { fragmentCollectionPort } from 'synthesize-regions'
import { defineTemplate } from '../../../authoring/define-template.js'
import {
	effectType,
	effectValueInput
} from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	identifierInput,
	layerType,
	marker,
	nominalType,
	schemaType,
	statementOutput,
	stringInput,
	tagType,
	typeCodeInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import {
	fileSystemRequirement,
	httpApiEndpointInput,
	httpApiEndpointType,
	httpApiGroupInput,
	httpApiGroupType,
	httpApiInput,
	httpApiMiddlewareInput,
	httpApiMiddlewareType,
	httpApiSecurityKind,
	httpApiSecurityType,
	httpApiType,
	httpClientRequirement,
	httpPlatformRequirement,
	httpRouterRequirement,
	openApiSpecType,
	pathRequirement
} from './effect-http-rest-template-helpers.js'

/**
 * Effect v4 declarative HTTP API foundations.
 * Runtime contract:
 *   import { Effect, Layer, Schema } from 'effect'
 *   import { HttpClient, HttpClientRequest, HttpRouter } from 'effect/unstable/http'
 *   import { HttpApi, HttpApiBuilder, HttpApiClient, HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware, HttpApiSchema, HttpApiSecurity, HttpApiSwagger, OpenApi } from 'effect/unstable/httpapi'
 */
const VERSION = '1.0.0' as const
const jsonSchemaGeneratorRequirement = '{ readonly __jsonSchemaGeneratorRequirement: "JsonSchema.Generator" }'
const schemaInput = (description: string, decoded = 'unknown', encoded = 'unknown', decode = 'never', encode = decode) =>
	typedExpressionInput(description, schemaType(decoded, encoded, decode, encode))

export const HttpApiMakeTemplate = defineTemplate({
	modelId: 'HttpApiMake', version: VERSION, description: 'Creates an empty declarative HTTP API.',
	inputs: { identifier: stringInput('Stable API identifier.') },
	output: expressionOutput('Empty HttpApi contract.', httpApiType('string','never')),
	source: `HttpApi.make(${marker('string', 'identifier', '"Api"')})`
})

export const HttpApiAddGroupsTemplate = defineTemplate({
	modelId: 'HttpApiAddGroups', version: VERSION, description: 'Adds one or more groups to an HttpApi contract.',
	inputs: {
		api: httpApiInput('Base HttpApi.'),
		groups: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: httpApiGroupType() }, minItems: 2, separator: ', ', description: 'HTTP API groups to add.' })
	},
	output: expressionOutput('Expanded HttpApi contract.', httpApiType()),
	source: `${marker('expression', 'api', 'HttpApi.make("Api")')}.add(${marker('expression', 'groups', 'HttpApiGroup.make("users")')})`
})

export const HttpApiPrefixTemplate = defineTemplate({
	modelId: 'HttpApiPrefix', version: VERSION, description: 'Prefixes every endpoint path in an HttpApi.',
	inputs: { api: httpApiInput('HTTP API contract.'), prefix: effectValueInput('Absolute path prefix.', { ts: 'string' }) },
	output: expressionOutput('Prefixed HttpApi.', httpApiType()),
	source: `${marker('expression', 'api', 'HttpApi.make("Api")')}.prefix(${marker('expression', 'prefix', '"/v1"')})`
})

export const HttpApiMiddlewareTemplate = defineTemplate({
	modelId: 'HttpApiMiddleware', version: VERSION, description: 'Applies an HTTP API middleware contract to every endpoint in an API.',
	inputs: { api: httpApiInput('HTTP API contract.'), middleware: httpApiMiddlewareInput('Middleware service key.') },
	output: expressionOutput('Middleware-decorated HttpApi.', httpApiType()),
	source: `${marker('expression', 'api', 'HttpApi.make("Api")')}.middleware(${marker('expression', 'middleware', 'AuthMiddleware')})`
})

export const HttpApiGroupMakeTemplate = defineTemplate({
	modelId: 'HttpApiGroupMake', version: VERSION, description: 'Creates an empty named HTTP API group.',
	inputs: { identifier: stringInput('Stable group identifier.'), topLevel: effectValueInput('Whether generated client endpoint methods are top-level.', { ts: 'boolean' }) },
	output: expressionOutput('Empty HTTP API group.', httpApiGroupType('string','never','boolean')),
	source: `HttpApiGroup.make(${marker('string', 'identifier', '"users"')}, { topLevel: ${marker('expression', 'topLevel', 'false')} })`
})

export const HttpApiGroupAddTemplate = defineTemplate({
	modelId: 'HttpApiGroupAdd', version: VERSION, description: 'Adds two or more endpoint declarations to an HTTP API group.',
	inputs: {
		group: httpApiGroupInput('HTTP API group.'),
		endpoints: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: httpApiEndpointType() }, minItems: 2, separator: ', ', description: 'Endpoint declarations to add.' })
	},
	output: expressionOutput('Expanded HTTP API group.', httpApiGroupType()),
	source: `${marker('expression', 'group', 'HttpApiGroup.make("users")')}.add(${marker('expression', 'endpoints', 'HttpApiEndpoint.get("list", "/users"), HttpApiEndpoint.get("get", "/users/:id")')})`
})

export const HttpApiGroupPrefixTemplate = defineTemplate({
	modelId: 'HttpApiGroupPrefix', version: VERSION, description: 'Prefixes every endpoint path in an HTTP API group.',
	inputs: { group: httpApiGroupInput('HTTP API group.'), prefix: effectValueInput('Absolute path prefix.', { ts: 'string' }) },
	output: expressionOutput('Prefixed HTTP API group.', httpApiGroupType()),
	source: `${marker('expression', 'group', 'HttpApiGroup.make("users")')}.prefix(${marker('expression', 'prefix', '"/v1"')})`
})

export const HttpApiGroupMiddlewareTemplate = defineTemplate({
	modelId: 'HttpApiGroupMiddleware', version: VERSION, description: 'Applies middleware to every endpoint currently in an HTTP API group.',
	inputs: { group: httpApiGroupInput('HTTP API group.'), middleware: httpApiMiddlewareInput('Middleware service key.') },
	output: expressionOutput('Middleware-decorated HTTP API group.', httpApiGroupType()),
	source: `${marker('expression', 'group', 'HttpApiGroup.make("users")')}.middleware(${marker('expression', 'middleware', 'AuthMiddleware')})`
})

const endpointCtor = (modelId: string, member: 'get' | 'post' | 'put' | 'patch' | 'delete', method: string) => defineTemplate({
	modelId, version: VERSION, description: `Declares a schema-driven ${method} HTTP API endpoint.`,
	inputs: { identifier: stringInput('Endpoint identifier.'), path: effectValueInput('Absolute endpoint path.', { ts: 'string' }), options: valueInput('Endpoint schemas/options: params, query, payload, headers, success, error, codecs.') },
	output: expressionOutput(`${method} endpoint declaration.`, httpApiEndpointType('string', `"${method}"`, 'string')),
	source: `HttpApiEndpoint.${member}(${marker('string', 'identifier', '"endpoint"')}, ${marker('expression', 'path', '"/resource"')}, ${marker('expression', 'options', '{}')})`
})

export const HttpApiEndpointGetTemplate = endpointCtor('HttpApiEndpointGet','get','GET')
export const HttpApiEndpointPostTemplate = endpointCtor('HttpApiEndpointPost','post','POST')
export const HttpApiEndpointPutTemplate = endpointCtor('HttpApiEndpointPut','put','PUT')
export const HttpApiEndpointPatchTemplate = endpointCtor('HttpApiEndpointPatch','patch','PATCH')
export const HttpApiEndpointDeleteTemplate = endpointCtor('HttpApiEndpointDelete','delete','DELETE')

export const HttpApiEndpointPrefixTemplate = defineTemplate({
	modelId: 'HttpApiEndpointPrefix', version: VERSION, description: 'Prefixes one HTTP API endpoint path.',
	inputs: { endpoint: httpApiEndpointInput('HTTP API endpoint.'), prefix: effectValueInput('Absolute path prefix.', { ts: 'string' }) },
	output: expressionOutput('Prefixed endpoint.', httpApiEndpointType()),
	source: `${marker('expression', 'endpoint', 'HttpApiEndpoint.get("get", "/resource")')}.prefix(${marker('expression', 'prefix', '"/v1"')})`
})

export const HttpApiEndpointMiddlewareTemplate = defineTemplate({
	modelId: 'HttpApiEndpointMiddleware', version: VERSION, description: 'Applies an HTTP API middleware contract to one endpoint.',
	inputs: { endpoint: httpApiEndpointInput('HTTP API endpoint.'), middleware: httpApiMiddlewareInput('Middleware service key.') },
	output: expressionOutput('Middleware-decorated endpoint.', httpApiEndpointType()),
	source: `${marker('expression', 'endpoint', 'HttpApiEndpoint.get("get", "/resource")')}.middleware(${marker('expression', 'middleware', 'AuthMiddleware')})`
})

export const HttpApiBuilderGroupTemplate = defineTemplate({
	modelId: 'HttpApiBuilderGroup', version: VERSION, description: 'Creates the implementation Layer for all endpoints in one HttpApi group.',
	typeParameters: typeParameters(['E','Handler-layer construction error.'],['R','Handler requirements.']),
	inputs: { api: httpApiInput('HTTP API contract.'), group: effectValueInput('Group identifier.', { ts: 'string' }), build: callbackInput('Handler builder using handlers.handle / handleRaw / handleAll.', { ts: '(handlers: unknown) => unknown' }) },
	output: expressionOutput('HTTP API group implementation Layer.', layerType('unknown','{{E}}','{{R}}')),
	source: `HttpApiBuilder.group(${marker('expression', 'api', 'HttpApi.make("Api").add(HttpApiGroup.make("users"))')}, ${marker('expression', 'group', '"users"')}, ${marker('expression', 'build', 'handlers => handlers')})`
})

export const HttpApiBuilderHandlerTemplate = defineTemplate({
	modelId: 'HttpApiBuilderHandler', version: VERSION, description: 'Checks a reusable endpoint handler against the endpoint contract.',
	typeParameters: typeParameters(['R','Handler requirements.']),
	inputs: { api: httpApiInput('HTTP API contract.'), group: effectValueInput('Group identifier.', { ts: 'string' }), endpoint: effectValueInput('Endpoint identifier.', { ts: 'string' }), handler: callbackInput('Endpoint handler callback.', effectReturningCallbackType('request: unknown','unknown','unknown','{{R}}')) },
	output: expressionOutput('Typed reusable endpoint handler.'),
	source: `HttpApiBuilder.handler(${marker('expression', 'api', 'HttpApi.make("Api").add(HttpApiGroup.make("users").add(HttpApiEndpoint.get("get", "/")))')}, ${marker('expression', 'group', '"users"')}, ${marker('expression', 'endpoint', '"get"')}, ${marker('expression', 'handler', 'request => Effect.void')})`
})

export const HttpApiBuilderLayerTemplate = defineTemplate({
	modelId: 'HttpApiBuilderLayer', version: VERSION, description: 'Registers a complete declarative HttpApi with the current HttpRouter.',
	inputs: { api: httpApiInput('HTTP API contract.'), options: valueInput('Builder options, including optional OpenAPI path.') },
	output: expressionOutput('HTTP API registration Layer.', layerType('never','never',`${fileSystemRequirement} | ${pathRequirement} | ${httpRouterRequirement} | ${jsonSchemaGeneratorRequirement} | ${httpPlatformRequirement} | unknown`)),
	source: `HttpApiBuilder.layer(${marker('expression', 'api', 'HttpApi.make("Api")')}, ${marker('expression', 'options', '{}')})`
})

export const HttpApiClientMakeTemplate = defineTemplate({
	modelId: 'HttpApiClientMake', version: VERSION, description: 'Derives a fully typed client object from an HttpApi contract.',
	inputs: { api: httpApiInput('HTTP API contract.'), options: valueInput('Client options including baseUrl and transforms.') },
	output: expressionOutput('Generated API client creation Effect.', effectType('unknown','never',`${httpClientRequirement} | unknown`)),
	source: `HttpApiClient.make(${marker('expression', 'api', 'HttpApi.make("Api")')}, ${marker('expression', 'options', '{}')})`
})

export const HttpApiClientGroupTemplate = defineTemplate({
	modelId: 'HttpApiClientGroup', version: VERSION, description: 'Derives a typed client object for one HttpApi group using an explicit HttpClient.',
	inputs: { api: httpApiInput('HTTP API contract.'), group: effectValueInput('Group identifier.', { ts: 'string' }), httpClient: valueInput('HttpClient or transformed HttpClient.'), baseUrl: effectValueInput('Optional base URL.', { ts: 'string | undefined' }) },
	output: expressionOutput('Generated group-client creation Effect.', effectType('unknown','never','unknown')),
	source: `HttpApiClient.group(${marker('expression', 'api', 'HttpApi.make("Api").add(HttpApiGroup.make("users"))')}, { group: ${marker('expression', 'group', '"users"')}, httpClient: ${marker('expression', 'httpClient', '(undefined as any)')}, baseUrl: ${marker('expression', 'baseUrl', 'undefined')} })`
})

export const HttpApiClientUrlBuilderTemplate = defineTemplate({
	modelId: 'HttpApiClientUrlBuilder', version: VERSION, description: 'Derives a typed URL builder from an HttpApi contract.',
	inputs: { api: httpApiInput('HTTP API contract.'), baseUrl: effectValueInput('Optional base URL.', { ts: 'string | undefined' }) },
	output: expressionOutput('Typed HttpApi URL builder.'),
	source: `HttpApiClient.urlBuilder(${marker('expression', 'api', 'HttpApi.make("Api")')}, { baseUrl: ${marker('expression', 'baseUrl', 'undefined')} })`
})

export const HttpApiSecurityBearerTemplate = defineTemplate({
	modelId: 'HttpApiSecurityBearer', version: VERSION, description: 'Declares an HTTP Bearer security scheme.',
	inputs: {}, output: expressionOutput('Bearer security scheme.', httpApiSecurityKind('bearer')), source: 'HttpApiSecurity.bearer'
})
export const HttpApiSecurityBasicTemplate = defineTemplate({
	modelId: 'HttpApiSecurityBasic', version: VERSION, description: 'Declares an HTTP Basic security scheme.',
	inputs: {}, output: expressionOutput('Basic security scheme.', httpApiSecurityKind('basic')), source: 'HttpApiSecurity.basic'
})
export const HttpApiSecurityApiKeyTemplate = defineTemplate({
	modelId: 'HttpApiSecurityApiKey', version: VERSION, description: 'Declares an API-key security scheme in a header, query parameter, or cookie.',
	inputs: { key: effectValueInput('Credential key name.', { ts: 'string' }), location: effectValueInput('Credential location.', { ts: '"header" | "query" | "cookie"' }) },
	output: expressionOutput('API-key security scheme.', httpApiSecurityKind('apiKey')),
	source: `HttpApiSecurity.apiKey({ key: ${marker('expression', 'key', '"x-api-key"')}, in: ${marker('expression', 'location', '"header"')} })`
})

export const HttpApiMiddlewareServiceDeclarationTemplate = defineTemplate({
	modelId: 'HttpApiMiddlewareServiceDeclaration', version: VERSION, description: 'Declares a typed HTTP API middleware Context.Service class, optionally with security and client middleware requirements.',
	inputs: {
		name: identifierInput('Middleware service class name.'), key: stringInput('Stable middleware service key.'),
		providesType: typeCodeInput('Services provided to endpoint handlers.'), requiresType: typeCodeInput('Services required by server middleware.'), clientErrorType: typeCodeInput('Client-side middleware error type.'),
		errorSchema: schemaInput('Middleware typed error Schema.'), security: valueInput('Security-scheme record or undefined.'), requiredForClient: effectValueInput('Whether generated clients require a client middleware implementation.', { ts: 'boolean' })
	},
	output: statementOutput('Exported HTTP API middleware declaration.'),
	source: `export class ${marker('identifier', 'name', 'AuthMiddleware')} extends HttpApiMiddleware.Service<unknown, { provides: ${marker('type', 'providesType', 'never')}; requires: ${marker('type', 'requiresType', 'never')}; clientError: ${marker('type', 'clientErrorType', 'never')} }>()(${marker('string', 'key', '"AuthMiddleware"')}, { error: ${marker('expression', 'errorSchema', 'Schema.Never')}, security: ${marker('expression', 'security', 'undefined')}, requiredForClient: ${marker('expression', 'requiredForClient', 'false')} }) {}`
})

export const HttpApiMiddlewareServerLayerTemplate = defineTemplate({
	modelId: 'HttpApiMiddlewareServerLayer', version: VERSION, description: 'Provides a server-side implementation for an HTTP API middleware service.',
	inputs: { middleware: httpApiMiddlewareInput('Middleware service key.'), implementation: valueInput('Server middleware function or security-handler record.') },
	output: expressionOutput('Server HTTP API middleware Layer.', layerType(httpApiMiddlewareType().ts,'never','never')),
	source: `Layer.succeed(${marker('expression', 'middleware', 'AuthMiddleware')}, ${marker('expression', 'implementation', '(httpEffect) => httpEffect')})`
})

export const HttpApiMiddlewareClientLayerTemplate = defineTemplate({
	modelId: 'HttpApiMiddlewareClientLayer', version: VERSION, description: 'Provides the generated-client implementation for a required HTTP API middleware.',
	typeParameters: typeParameters(['E','Layer construction error.'],['R','Client middleware requirements.']),
	inputs: { middleware: httpApiMiddlewareInput('Middleware service key.'), implementation: valueInput('Client middleware implementation or Effect producing it.') },
	output: expressionOutput('Client HTTP API middleware Layer.', layerType('unknown','{{E}}','{{R}}')),
	source: `HttpApiMiddleware.layerClient(${marker('expression', 'middleware', 'AuthMiddleware')}, ${marker('expression', 'implementation', '({ next, request }) => next(request)')})`
})

export const HttpApiSchemaNoContentTemplate = defineTemplate({
	modelId: 'HttpApiSchemaNoContent', version: VERSION, description: 'Returns the predefined empty 204 response schema.', inputs: {},
	output: expressionOutput('204 No Content response schema.', schemaType('void','void','never','never')), source: 'HttpApiSchema.NoContent'
})
export const HttpApiSchemaCreatedTemplate = defineTemplate({
	modelId: 'HttpApiSchemaCreated', version: VERSION, description: 'Returns the predefined empty 201 response schema.', inputs: {},
	output: expressionOutput('201 Created response schema.', schemaType('void','void','never','never')), source: 'HttpApiSchema.Created'
})
export const HttpApiSchemaAcceptedTemplate = defineTemplate({
	modelId: 'HttpApiSchemaAccepted', version: VERSION, description: 'Returns the predefined empty 202 response schema.', inputs: {},
	output: expressionOutput('202 Accepted response schema.', schemaType('void','void','never','never')), source: 'HttpApiSchema.Accepted'
})

export const HttpApiSchemaStatusTemplate = defineTemplate({
	modelId: 'HttpApiSchemaStatus', version: VERSION, description: 'Annotates a response Schema with an HTTP status code.',
	inputs: { schema: schemaInput('Response Schema.'), status: effectValueInput('HTTP status number or supported status literal.', { ts: 'number | string' }) },
	output: expressionOutput('Status-annotated response Schema.', schemaType()),
	source: `${marker('expression', 'schema', 'Schema.Unknown')}.pipe(HttpApiSchema.status(${marker('expression', 'status', '200')}))`
})

export const HttpApiSchemaStreamSseTemplate = defineTemplate({
	modelId: 'HttpApiSchemaStreamSse', version: VERSION, description: 'Declares a Server-Sent Events streaming success schema.',
	inputs: { options: valueInput('SSE data/event schema and optional typed stream error/content type.') },
	output: expressionOutput('SSE streaming response schema.', schemaType('unknown','unknown','unknown','unknown')),
	source: `HttpApiSchema.StreamSse(${marker('expression', 'options', '{ data: Schema.Unknown }')})`
})

export const HttpApiSchemaStreamUint8ArrayTemplate = defineTemplate({
	modelId: 'HttpApiSchemaStreamUint8Array', version: VERSION, description: 'Declares a streaming byte success response schema.',
	inputs: { options: valueInput('Optional stream content type.') },
	output: expressionOutput('Streaming byte response schema.', schemaType('unknown','unknown','never','never')),
	source: `HttpApiSchema.StreamUint8Array(${marker('expression', 'options', '{}')})`
})

export const OpenApiAnnotationsTemplate = defineTemplate({
	modelId: 'OpenApiAnnotations', version: VERSION, description: 'Builds OpenAPI annotations for APIs, groups, endpoints, schemas, or security schemes.',
	inputs: { options: valueInput('OpenAPI metadata including title, version, summary, description, servers, tags, or deprecation.') },
	output: expressionOutput('OpenAPI annotation Context.', nominalType('effect/Context')),
	source: `OpenApi.annotations(${marker('expression', 'options', '{ title: "API", version: "1.0.0" }')})`
})

export const OpenApiFromApiTemplate = defineTemplate({
	modelId: 'OpenApiFromApi', version: VERSION, description: 'Generates an OpenAPI 3.1 specification from a declarative HttpApi.',
	inputs: { api: httpApiInput('HTTP API contract.'), options: valueInput('Optional OpenAPI representation/reference options.') },
	output: expressionOutput('OpenAPI 3.1 specification.', openApiSpecType()),
	source: `OpenApi.fromApi(${marker('expression', 'api', 'HttpApi.make("Api")')}, ${marker('expression', 'options', '{}')})`
})

export const HttpApiSwaggerLayerTemplate = defineTemplate({
	modelId: 'HttpApiSwaggerLayer', version: VERSION, description: 'Mounts Swagger UI for a declarative HttpApi on the current HttpRouter.',
	inputs: { api: httpApiInput('HTTP API contract.'), path: effectValueInput('Swagger UI path.', { ts: 'string' }) },
	output: expressionOutput('Swagger UI route Layer.', layerType('never','never',httpRouterRequirement)),
	source: `HttpApiSwagger.layer(${marker('expression', 'api', 'HttpApi.make("Api")')}, { path: ${marker('expression', 'path', '"/docs"')} })`
})

export const effectV4HttpApiFoundationalGraphTemplateInputs = [
	HttpApiMakeTemplate, HttpApiAddGroupsTemplate, HttpApiPrefixTemplate, HttpApiMiddlewareTemplate,
	HttpApiGroupMakeTemplate, HttpApiGroupAddTemplate, HttpApiGroupPrefixTemplate, HttpApiGroupMiddlewareTemplate,
	HttpApiEndpointGetTemplate, HttpApiEndpointPostTemplate, HttpApiEndpointPutTemplate, HttpApiEndpointPatchTemplate,
	HttpApiEndpointDeleteTemplate, HttpApiEndpointPrefixTemplate, HttpApiEndpointMiddlewareTemplate,
	HttpApiBuilderGroupTemplate, HttpApiBuilderHandlerTemplate, HttpApiBuilderLayerTemplate,
	HttpApiClientMakeTemplate, HttpApiClientGroupTemplate, HttpApiClientUrlBuilderTemplate,
	HttpApiSecurityBearerTemplate, HttpApiSecurityBasicTemplate, HttpApiSecurityApiKeyTemplate,
	HttpApiMiddlewareServiceDeclarationTemplate, HttpApiMiddlewareServerLayerTemplate, HttpApiMiddlewareClientLayerTemplate,
	HttpApiSchemaNoContentTemplate, HttpApiSchemaCreatedTemplate, HttpApiSchemaAcceptedTemplate, HttpApiSchemaStatusTemplate,
	HttpApiSchemaStreamSseTemplate, HttpApiSchemaStreamUint8ArrayTemplate, OpenApiAnnotationsTemplate, OpenApiFromApiTemplate,
	HttpApiSwaggerLayerTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
