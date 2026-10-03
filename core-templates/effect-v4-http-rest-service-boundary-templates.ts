import { defineTemplate } from './sample-definition.js'
import {
	effectSourceInput,
	effectType,
	effectValueInput
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	statementCollectionInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	httpApiInput,
	httpApiMiddlewareInput,
	httpApiMiddlewareType,
	httpClientRequirement,
	httpRouterRequirement,
	httpServerRequirement,
	httpServerResponseType
} from './effect-http-rest-template-helpers.js'

/** Production HTTP / REST service-boundary compositions. */
const VERSION = '1.0.0' as const
const layerInput = (description: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, layerType(provided, error, requirements))
const serviceTagInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

export const HttpApiHandleAllGroupLayerTemplate = defineTemplate({
	modelId: 'HttpApiHandleAllGroupLayer', version: VERSION, description: 'Implements one HttpApi group from a complete endpoint-handler record via handlers.handleAll.',
	typeParameters: typeParameters(['E','Handler construction error.'],['R','Handler requirements.']),
	inputs: { api: httpApiInput('HTTP API contract.'), group: effectValueInput('Group identifier.', { ts: 'string' }), handlers: valueInput('Complete endpoint-handler record for the group.') },
	output: expressionOutput('HTTP API group implementation Layer.', layerType('unknown','{{E}}','{{R}}')),
	source: `HttpApiBuilder.group(${marker('expression', 'api', 'HttpApi.make("Api").add(HttpApiGroup.make("users"))')}, ${marker('expression', 'group', '"users"')}, group => group.handleAll(${marker('expression', 'handlers', '{}')}))`
})

export const HttpApiServerBoundaryLayerTemplate = defineTemplate({
	modelId: 'HttpApiServerBoundaryLayer', version: VERSION, description: 'Builds and serves a declarative HttpApi using supplied group implementation Layers.',
	typeParameters: typeParameters(['EHandlers','Handler Layer error type.'],['RHandlers','Handler Layer requirements.']),
	inputs: { api: httpApiInput('HTTP API contract.'), handlers: layerInput('Merged HttpApi group implementation Layers.','unknown','{{EHandlers}}','{{RHandlers}}'), builderOptions: valueInput('HttpApiBuilder options such as openapiPath.'), serveOptions: valueInput('HttpRouter.serve options.') },
	output: expressionOutput('Serving declarative HTTP API Layer.', layerType('never','{{EHandlers}}',`${httpServerRequirement} | {{RHandlers}} | unknown`)),
	source: `HttpRouter.serve(Layer.provide(HttpApiBuilder.layer(${marker('expression', 'api', 'HttpApi.make("Api")')}, ${marker('expression', 'builderOptions', '{}')}), ${marker('expression', 'handlers', 'Layer.empty')}), ${marker('expression', 'serveOptions', '{}')})`
})

export const HttpApiCorsServerBoundaryLayerTemplate = defineTemplate({
	modelId: 'HttpApiCorsServerBoundaryLayer', version: VERSION, description: 'Serves a declarative HttpApi with CORS middleware registered in the same router application.',
	typeParameters: typeParameters(['EHandlers','Handler Layer error type.'],['RHandlers','Handler Layer requirements.']),
	inputs: { api: httpApiInput('HTTP API contract.'), handlers: layerInput('Merged group implementation Layers.','unknown','{{EHandlers}}','{{RHandlers}}'), cors: valueInput('CORS policy options.'), serveOptions: valueInput('HttpRouter.serve options.') },
	output: expressionOutput('CORS-enabled HTTP API server Layer.', layerType('never','{{EHandlers}}',`${httpServerRequirement} | {{RHandlers}} | unknown`)),
	source: `(() => { const api = ${marker('expression', 'api', 'HttpApi.make("Api")')}; const app = Layer.merge(Layer.provide(HttpApiBuilder.layer(api), ${marker('expression', 'handlers', 'Layer.empty')}), HttpRouter.cors(${marker('expression', 'cors', '{}')})); return HttpRouter.serve(app, ${marker('expression', 'serveOptions', '{}')}) })()`
})

export const HttpApiSwaggerServerBoundaryLayerTemplate = defineTemplate({
	modelId: 'HttpApiSwaggerServerBoundaryLayer', version: VERSION, description: 'Serves a declarative HttpApi and mounts Swagger UI in the same router.',
	typeParameters: typeParameters(['EHandlers','Handler Layer error type.'],['RHandlers','Handler Layer requirements.']),
	inputs: { api: httpApiInput('HTTP API contract.'), handlers: layerInput('Merged group implementation Layers.','unknown','{{EHandlers}}','{{RHandlers}}'), docsPath: effectValueInput('Swagger UI path.', { ts: 'string' }), serveOptions: valueInput('HttpRouter.serve options.') },
	output: expressionOutput('HTTP API + Swagger server Layer.', layerType('never','{{EHandlers}}',`${httpServerRequirement} | {{RHandlers}} | unknown`)),
	source: `(() => { const api = ${marker('expression', 'api', 'HttpApi.make("Api")')}; const app = Layer.merge(Layer.provide(HttpApiBuilder.layer(api), ${marker('expression', 'handlers', 'Layer.empty')}), HttpApiSwagger.layer(api, { path: ${marker('expression', 'docsPath', '"/docs"')} })); return HttpRouter.serve(app, ${marker('expression', 'serveOptions', '{}')}) })()`
})

export const HttpApiAuthenticatedServerBoundaryLayerTemplate = defineTemplate({
	modelId: 'HttpApiAuthenticatedServerBoundaryLayer', version: VERSION, description: 'Serves an HttpApi together with a server middleware implementation and group handler Layers.',
	typeParameters: typeParameters(['EHandlers','Handler Layer error type.'],['RHandlers','Handler Layer requirements.'],['EMiddleware','Middleware Layer error type.'],['RMiddleware','Middleware Layer requirements.']),
	inputs: { api: httpApiInput('HTTP API contract already decorated with middleware.'), handlers: layerInput('Merged group implementation Layers.','unknown','{{EHandlers}}','{{RHandlers}}'), middlewareLayer: layerInput('Layer providing the middleware implementation.',httpApiMiddlewareType().ts,'{{EMiddleware}}','{{RMiddleware}}'), serveOptions: valueInput('HttpRouter.serve options.') },
	output: expressionOutput('Authenticated HTTP API server Layer.', layerType('never','{{EHandlers}} | {{EMiddleware}}',`${httpServerRequirement} | {{RHandlers}} | {{RMiddleware}} | unknown`)),
	source: `HttpRouter.serve(Layer.provide(Layer.provide(HttpApiBuilder.layer(${marker('expression', 'api', 'HttpApi.make("Api")')}), ${marker('expression', 'handlers', 'Layer.empty')}), ${marker('expression', 'middlewareLayer', 'Layer.empty')}), ${marker('expression', 'serveOptions', '{}')})`
})

export const HttpApiGeneratedClientServiceLayerTemplate = defineTemplate({
	modelId: 'HttpApiGeneratedClientServiceLayer', version: VERSION, description: 'Exposes a generated HttpApi client as an application Context.Service.',
	typeParameters: typeParameters(['I','Client service identifier type.']),
	inputs: { service: serviceTagInput('Context.Service key for the generated API client.','{{I}}','unknown'), api: httpApiInput('HTTP API contract.'), baseUrl: effectValueInput('Remote API base URL.', { ts: 'string' }) },
	output: expressionOutput('Generated API-client service Layer.', layerType('{{I}}','never',`${httpClientRequirement} | unknown`)),
	source: `Layer.effect(${marker('expression', 'service', 'RemoteApi')}, HttpApiClient.make(${marker('expression', 'api', 'HttpApi.make("Api")')}, { baseUrl: ${marker('expression', 'baseUrl', '"https://api.example.com"')} }))`
})

export const HttpApiResilientClientServiceLayerTemplate = defineTemplate({
	modelId: 'HttpApiResilientClientServiceLayer', version: VERSION, description: 'Exposes a generated HttpApi client using a transformed HttpClient with 2xx filtering, redirects, and bounded retries.',
	typeParameters: typeParameters(['I','Client service identifier type.']),
	inputs: { service: serviceTagInput('Context.Service key for the generated API client.','{{I}}','unknown'), api: httpApiInput('HTTP API contract.'), baseUrl: effectValueInput('Remote API base URL.', { ts: 'string' }), redirects: effectValueInput('Maximum redirects.', { ts: 'number' }), retries: effectValueInput('Maximum retry count.', { ts: 'number' }) },
	output: expressionOutput('Resilient generated API-client Layer.', layerType('{{I}}','never',`${httpClientRequirement} | unknown`)),
	source: `Layer.effect(${marker('expression', 'service', 'RemoteApi')}, HttpApiClient.make(${marker('expression', 'api', 'HttpApi.make("Api")')}, { baseUrl: ${marker('expression', 'baseUrl', '"https://api.example.com"')}, transformClient: client => HttpClient.retry(HttpClient.followRedirects(HttpClient.filterStatusOk(client), ${marker('expression', 'redirects', '5')}), { times: ${marker('expression', 'retries', '2')} }) }))`
})

export const HttpApiBearerClientMiddlewareLayerTemplate = defineTemplate({
	modelId: 'HttpApiBearerClientMiddlewareLayer', version: VERSION, description: 'Provides client-side HTTP API middleware that adds a Bearer token to generated-client requests.',
	inputs: { middleware: httpApiMiddlewareInput('Client-required middleware service.'), token: effectValueInput('Bearer token or Redacted token.', { ts: 'string | unknown' }) },
	output: expressionOutput('Bearer-token generated-client middleware Layer.', layerType('unknown','never','never')),
	source: `HttpApiMiddleware.layerClient(${marker('expression', 'middleware', 'AuthMiddleware')}, ({ next, request }) => next(HttpClientRequest.bearerToken(request, ${marker('expression', 'token', '"token"')})))`
})

export const HttpApiBearerAuthMiddlewareLayerTemplate = defineTemplate({
	modelId: 'HttpApiBearerAuthMiddlewareLayer', version: VERSION, description: 'Provides bearer security middleware that authenticates the decoded credential and supplies a principal service to endpoint handlers.',
	typeParameters: typeParameters(['I','Principal service identifier.'],['User','Authenticated principal type.'],['E','Authentication error type.'],['R','Authentication requirements.']),
	inputs: { middleware: httpApiMiddlewareInput('Security middleware service whose security record contains a bearer entry.'), principal: serviceTagInput('Context.Service key provided to endpoint handlers.','{{I}}','{{User}}'), authenticate: callbackInput('Authenticate the decoded bearer credential.', effectReturningCallbackType('credential: unknown','{{User}}','{{E}}','{{R}}')) },
	output: expressionOutput('Bearer-authentication middleware Layer.', layerType(httpApiMiddlewareType('{{I}}','{{E}}','{{R}}').ts,'never','never')),
	source: `Layer.succeed(${marker('expression', 'middleware', 'AuthMiddleware')}, { bearer: (httpEffect, { credential }) => Effect.flatMap((${marker('expression', 'authenticate', 'credential => Effect.succeed(credential)')})(credential), user => Effect.provideService(httpEffect, ${marker('expression', 'principal', 'CurrentUser')}, user)) })`
})

export const HttpHealthRoutesLayerTemplate = defineTemplate({
	modelId: 'HttpHealthRoutesLayer', version: VERSION, description: 'Registers separate liveness and readiness HTTP routes from closed probe Effects.',
	typeParameters: typeParameters(['ELive','Liveness error type.'],['EReady','Readiness error type.']),
	inputs: { livePath: effectValueInput('Liveness route path.', { ts: 'string' }), readyPath: effectValueInput('Readiness route path.', { ts: 'string' }), liveness: effectSourceInput('Closed liveness probe.', effectType('unknown','{{ELive}}','never')), readiness: effectSourceInput('Closed readiness probe.', effectType('unknown','{{EReady}}','never')) },
	output: expressionOutput('Health-check route Layer.', layerType('never','never',httpRouterRequirement)),
	source: `Layer.merge(HttpRouter.add("GET", ${marker('expression', 'livePath', '"/health/live"')}, Effect.as(${marker('expression', 'liveness', 'Effect.void')}, HttpServerResponse.text("ok"))), HttpRouter.add("GET", ${marker('expression', 'readyPath', '"/health/ready"')}, Effect.as(${marker('expression', 'readiness', 'Effect.void')}, HttpServerResponse.text("ready"))))`
})

export const HttpOpenApiJsonRouteLayerTemplate = defineTemplate({
	modelId: 'HttpOpenApiJsonRouteLayer', version: VERSION, description: 'Registers a route that serves the generated OpenAPI 3.1 document as JSON.',
	inputs: { api: httpApiInput('HTTP API contract.'), path: effectValueInput('OpenAPI JSON route path.', { ts: 'string' }) },
	output: expressionOutput('OpenAPI JSON route Layer.', layerType('never','never',httpRouterRequirement)),
	source: `HttpRouter.add("GET", ${marker('expression', 'path', '"/openapi.json"')}, HttpServerResponse.json(OpenApi.fromApi(${marker('expression', 'api', 'HttpApi.make("Api")')})))`
})

export const HttpApiWebHandlerBoundaryTemplate = defineTemplate({
	modelId: 'HttpApiWebHandlerBoundary', version: VERSION, description: 'Builds a Fetch-compatible handler/disposer pair from an HTTP router application Layer.',
	typeParameters: typeParameters(['P','Application Layer outputs.'],['E','Layer construction error.'],['R','Application Layer requirements.']),
	inputs: { app: layerInput('HTTP router application Layer.','{{P}}','{{E}}','{{R}}'), options: valueInput('HttpRouter.toWebHandler options.') },
	output: expressionOutput('Fetch handler and disposer pair.', { ts: '{ readonly handler: (request: unknown, init?: unknown) => Promise<unknown>; readonly dispose: () => Promise<void> }' }),
	source: `HttpRouter.toWebHandler(${marker('expression', 'app', 'Layer.empty')}, ${marker('expression', 'options', '{}')})`
})

export const HttpApiContractSourceFileTemplate = defineTemplate({
	modelId: 'HttpApiContractSourceFile', version: VERSION, description: 'Builds a declarative HTTP API contract source file using the current public V4 HTTP API barrels.',
	inputs: { body: statementCollectionInput('Schemas, middleware declarations, groups, endpoints, and API declaration.') },
	output: { kind: 'sourceFile', description: 'Complete HTTP API contract source file.' },
	source: `import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware, HttpApiSchema, HttpApiSecurity, OpenApi } from "effect/unstable/httpapi"

${marker('statement', 'body', 'export const Api = HttpApi.make("Api")')}`
})

export const HttpApiServerSourceFileTemplate = defineTemplate({
	modelId: 'HttpApiServerSourceFile', version: VERSION, description: 'Builds an HTTP API server implementation source file with router, builder, Swagger, and server primitives in scope.',
	inputs: { body: statementCollectionInput('Handler Layers, middleware Layers, server Layer, and application composition.') },
	output: { kind: 'sourceFile', description: 'Complete HTTP API server source file.' },
	source: `import { Effect, Layer, Schema } from "effect"
import { HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { HttpApiBuilder, HttpApiMiddleware, HttpApiSwagger, OpenApi } from "effect/unstable/httpapi"

${marker('statement', 'body', 'export const Server = Layer.empty')}`
})

export const HttpApiClientSourceFileTemplate = defineTemplate({
	modelId: 'HttpApiClientSourceFile', version: VERSION, description: 'Builds a generated REST client source file with HttpClient transforms and HTTP API client derivation in scope.',
	inputs: { body: statementCollectionInput('Generated-client services, middleware Layers, and client-call helpers.') },
	output: { kind: 'sourceFile', description: 'Complete HTTP API client source file.' },
	source: `import { Effect, Layer, Schema } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import { HttpApiClient, HttpApiMiddleware } from "effect/unstable/httpapi"

${marker('statement', 'body', 'export const ClientLayer = Layer.empty')}`
})

export const effectV4HttpRestServiceBoundaryGraphTemplateInputs = [
	HttpApiHandleAllGroupLayerTemplate, HttpApiServerBoundaryLayerTemplate, HttpApiCorsServerBoundaryLayerTemplate,
	HttpApiSwaggerServerBoundaryLayerTemplate, HttpApiAuthenticatedServerBoundaryLayerTemplate,
	HttpApiGeneratedClientServiceLayerTemplate, HttpApiResilientClientServiceLayerTemplate,
	HttpApiBearerClientMiddlewareLayerTemplate, HttpApiBearerAuthMiddlewareLayerTemplate,
	HttpHealthRoutesLayerTemplate, HttpOpenApiJsonRouteLayerTemplate, HttpApiWebHandlerBoundaryTemplate,
	HttpApiContractSourceFileTemplate, HttpApiServerSourceFileTemplate, HttpApiClientSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
