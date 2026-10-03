import { defineTemplate } from '../../../authoring/define-template.js'
import {
	effectSourceInput,
	effectType,
	effectValueInput
} from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	layerType,
	marker,
	scheduleType,
	schemaType,
	streamType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import {
	fileSystemRequirement,
	httpBodyErrorType,
	httpClientErrorType,
	httpClientInput,
	httpClientRequestInput,
	httpClientRequestType,
	httpClientResponseType,
	httpClientType,
	httpPlatformRequirement,
	httpRouterRequirement,
	httpRouterRouteType,
	httpServerErrorType,
	httpServerRequirement,
	httpServerRequestType,
	httpServerResponseType,
	pathRequirement,
	rateLimiterRequirement,
	scopeRequirement
} from './effect-http-rest-template-helpers.js'

/**
 * Effect v4 HTTP foundations.
 * Runtime contract:
 *   import { Effect, Layer, Schedule, Schema, Stream } from 'effect'
 *   import { HttpClient, HttpClientRequest, HttpClientResponse, HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from 'effect/unstable/http'
 */
const VERSION = '1.0.0' as const
const schemaInput = (description: string, decoded = 'unknown', encoded = 'unknown', decode = 'never', encode = decode) =>
	typedExpressionInput(description, schemaType(decoded, encoded, decode, encode))
const scheduleInput = (description: string, input = 'unknown', requirements = 'never') =>
	typedExpressionInput(description, scheduleType('unknown', input, requirements))

const requestCtor = (modelId: string, member: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options', description: string) => defineTemplate({
	modelId, version: VERSION, description,
	inputs: { url: effectValueInput('Request URL.', { ts: 'string' }), options: valueInput('Optional request options.') },
	output: expressionOutput('Immutable HTTP client request.', httpClientRequestType()),
	source: `HttpClientRequest.${member}(${marker('expression', 'url', '"https://example.com"')}, ${marker('expression', 'options', '{}')})`
})

export const HttpClientRequestGetTemplate = requestCtor('HttpClientRequestGet', 'get', 'Creates an immutable GET request.')
export const HttpClientRequestPostTemplate = requestCtor('HttpClientRequestPost', 'post', 'Creates an immutable POST request.')
export const HttpClientRequestPutTemplate = requestCtor('HttpClientRequestPut', 'put', 'Creates an immutable PUT request.')
export const HttpClientRequestPatchTemplate = requestCtor('HttpClientRequestPatch', 'patch', 'Creates an immutable PATCH request.')
export const HttpClientRequestDeleteTemplate = requestCtor('HttpClientRequestDelete', 'delete', 'Creates an immutable DELETE request.')
export const HttpClientRequestHeadTemplate = requestCtor('HttpClientRequestHead', 'head', 'Creates an immutable HEAD request.')
export const HttpClientRequestOptionsTemplate = requestCtor('HttpClientRequestOptions', 'options', 'Creates an immutable OPTIONS request.')

export const HttpClientRequestSetHeaderTemplate = defineTemplate({
	modelId: 'HttpClientRequestSetHeader', version: VERSION, description: 'Sets one HTTP request header immutably.',
	inputs: { request: httpClientRequestInput('HTTP client request.'), name: effectValueInput('Header name.', { ts: 'string' }), value: effectValueInput('Header value.', { ts: 'string' }) },
	output: expressionOutput('Request with updated header.', httpClientRequestType()),
	source: `HttpClientRequest.setHeader(${marker('expression', 'request', 'HttpClientRequest.get("https://example.com")')}, ${marker('expression', 'name', '"x-request-id"')}, ${marker('expression', 'value', '"123"')})`
})

export const HttpClientRequestSetHeadersTemplate = defineTemplate({
	modelId: 'HttpClientRequestSetHeaders', version: VERSION, description: 'Sets several HTTP request headers immutably.',
	inputs: { request: httpClientRequestInput('HTTP client request.'), headers: valueInput('Headers input.') },
	output: expressionOutput('Request with updated headers.', httpClientRequestType()),
	source: `HttpClientRequest.setHeaders(${marker('expression', 'request', 'HttpClientRequest.get("https://example.com")')}, ${marker('expression', 'headers', '{}')})`
})

export const HttpClientRequestSetUrlParamsTemplate = defineTemplate({
	modelId: 'HttpClientRequestSetUrlParams', version: VERSION, description: 'Replaces the structured query parameters on an HTTP client request.',
	inputs: { request: httpClientRequestInput('HTTP client request.'), params: valueInput('URL parameter input.') },
	output: expressionOutput('Request with query parameters.', httpClientRequestType()),
	source: `HttpClientRequest.setUrlParams(${marker('expression', 'request', 'HttpClientRequest.get("https://example.com")')}, ${marker('expression', 'params', '{}')})`
})

export const HttpClientRequestBearerTokenTemplate = defineTemplate({
	modelId: 'HttpClientRequestBearerToken', version: VERSION, description: 'Sets a Bearer Authorization header on an HTTP client request.',
	inputs: { request: httpClientRequestInput('HTTP client request.'), token: effectValueInput('Bearer token or Redacted token.', { ts: 'string | unknown' }) },
	output: expressionOutput('Bearer-authenticated request.', httpClientRequestType()),
	source: `HttpClientRequest.bearerToken(${marker('expression', 'request', 'HttpClientRequest.get("https://example.com")')}, ${marker('expression', 'token', '"token"')})`
})

export const HttpClientRequestBasicAuthTemplate = defineTemplate({
	modelId: 'HttpClientRequestBasicAuth', version: VERSION, description: 'Sets HTTP Basic authentication credentials on an HTTP client request.',
	inputs: { request: httpClientRequestInput('HTTP client request.'), username: effectValueInput('Username or Redacted username.', { ts: 'string | unknown' }), password: effectValueInput('Password or Redacted password.', { ts: 'string | unknown' }) },
	output: expressionOutput('Basic-authenticated request.', httpClientRequestType()),
	source: `HttpClientRequest.basicAuth(${marker('expression', 'request', 'HttpClientRequest.get("https://example.com")')}, ${marker('expression', 'username', '"user"')}, ${marker('expression', 'password', '"pass"')})`
})

export const HttpClientRequestBodyTextTemplate = defineTemplate({
	modelId: 'HttpClientRequestBodyText', version: VERSION, description: 'Sets a text request body and corresponding body metadata.',
	inputs: { request: httpClientRequestInput('HTTP client request.'), body: effectValueInput('Text body.', { ts: 'string' }), contentType: effectValueInput('Optional content type.', { ts: 'string | undefined' }) },
	output: expressionOutput('Request with text body.', httpClientRequestType()),
	source: `HttpClientRequest.bodyText(${marker('expression', 'request', 'HttpClientRequest.post("https://example.com")')}, ${marker('expression', 'body', '"body"')}, ${marker('expression', 'contentType', 'undefined')})`
})

export const HttpClientRequestBodyJsonTemplate = defineTemplate({
	modelId: 'HttpClientRequestBodyJson', version: VERSION, description: 'Serializes a value as JSON and sets it as the request body.',
	inputs: { request: httpClientRequestInput('HTTP client request.'), body: valueInput('JSON-serializable body.') },
	output: expressionOutput('Effect producing the request with JSON body.', effectType(httpClientRequestType().ts, httpBodyErrorType, 'never')),
	source: `HttpClientRequest.bodyJson(${marker('expression', 'request', 'HttpClientRequest.post("https://example.com")')}, ${marker('expression', 'body', '{}')})`
})

export const HttpClientRequestSchemaBodyJsonTemplate = defineTemplate({
	modelId: 'HttpClientRequestSchemaBodyJson', version: VERSION, description: 'Encodes a request value through Schema and serializes the encoded value as JSON.',
	typeParameters: typeParameters(['A','Decoded request value.'],['I','Encoded request value.'],['RE','Schema encoding requirements.']),
	inputs: { request: httpClientRequestInput('HTTP client request.'), schema: schemaInput('Schema used to encode the request body.','{{A}}','{{I}}','never','{{RE}}'), body: valueInput('Decoded request value.', { ts: '{{A}}' }) },
	output: expressionOutput('Schema-encoded JSON request.', effectType(httpClientRequestType().ts, httpBodyErrorType, '{{RE}}')),
	source: `HttpClientRequest.schemaBodyJson(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'request', 'HttpClientRequest.post("https://example.com")')}, ${marker('expression', 'body', 'undefined')})`
})

export const HttpClientRequestBodyStreamTemplate = defineTemplate({
	modelId: 'HttpClientRequestBodyStream', version: VERSION, description: 'Sets a streaming byte body on an HTTP client request.',
	inputs: { request: httpClientRequestInput('HTTP client request.'), stream: typedExpressionInput('Byte Stream.', streamType('Uint8Array','unknown','never')), options: valueInput('Optional content type and content length.') },
	output: expressionOutput('Request with streaming body.', httpClientRequestType()),
	source: `HttpClientRequest.bodyStream(${marker('expression', 'request', 'HttpClientRequest.post("https://example.com")')}, ${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'options', '{}')})`
})

export const HttpClientExecuteTemplate = defineTemplate({
	modelId: 'HttpClientExecute', version: VERSION, description: 'Executes a prebuilt HTTP request through the HttpClient service.',
	inputs: { request: httpClientRequestInput('HTTP client request.') },
	output: expressionOutput('HTTP response Effect.', effectType(httpClientResponseType().ts, httpClientErrorType, '{ readonly __httpClientRequirement: "HttpClient" }')),
	source: `HttpClient.execute(${marker('expression', 'request', 'HttpClientRequest.get("https://example.com")')})`
})

const clientAccessor = (modelId: string, member: 'get' | 'post' | 'put' | 'patch' | 'del', description: string) => defineTemplate({
	modelId, version: VERSION, description,
	inputs: { url: effectValueInput('Request URL.', { ts: 'string' }), options: valueInput('Optional request options.') },
	output: expressionOutput('HTTP response Effect.', effectType(httpClientResponseType().ts, httpClientErrorType, '{ readonly __httpClientRequirement: "HttpClient" }')),
	source: `HttpClient.${member}(${marker('expression', 'url', '"https://example.com"')}, ${marker('expression', 'options', '{}')})`
})
export const HttpClientGetTemplate = clientAccessor('HttpClientGet','get','Executes a GET request through the HttpClient service.')
export const HttpClientPostTemplate = clientAccessor('HttpClientPost','post','Executes a POST request through the HttpClient service.')
export const HttpClientPutTemplate = clientAccessor('HttpClientPut','put','Executes a PUT request through the HttpClient service.')
export const HttpClientPatchTemplate = clientAccessor('HttpClientPatch','patch','Executes a PATCH request through the HttpClient service.')
export const HttpClientDeleteTemplate = clientAccessor('HttpClientDelete','del','Executes a DELETE request through the HttpClient service.')

export const HttpClientFilterStatusOkTemplate = defineTemplate({
	modelId: 'HttpClientFilterStatusOk', version: VERSION, description: 'Transforms an HttpClient so only 2xx responses remain successful.',
	typeParameters: typeParameters(['E','Existing client error type.'],['R','Existing client requirements.']),
	inputs: { client: httpClientInput('HTTP client.','{{E}}','{{R}}') },
	output: expressionOutput('2xx-filtering HTTP client.', httpClientType('{{E}} | ' + httpClientErrorType, '{{R}}')),
	source: `HttpClient.filterStatusOk(${marker('expression', 'client', '(undefined as any)')})`
})

export const HttpClientRetryTemplate = defineTemplate({
	modelId: 'HttpClientRetry', version: VERSION, description: 'Adds request retry behavior to an HttpClient using a Schedule or retry options.',
	typeParameters: typeParameters(['E','Client error type.'],['R','Client requirements.'],['RS','Retry schedule requirements.']),
	inputs: { client: httpClientInput('HTTP client.','{{E}}','{{R}}'), policy: scheduleInput('Retry Schedule.','{{E}}','{{RS}}') },
	output: expressionOutput('Retrying HTTP client.', httpClientType('{{E}}','{{R}} | {{RS}}')),
	source: `HttpClient.retry(${marker('expression', 'client', '(undefined as any)')}, ${marker('expression', 'policy', 'Schedule.recurs(2)')})`
})

export const HttpClientFollowRedirectsTemplate = defineTemplate({
	modelId: 'HttpClientFollowRedirects', version: VERSION, description: 'Enables bounded redirect following on an HttpClient.',
	typeParameters: typeParameters(['E','Client error type.'],['R','Client requirements.']),
	inputs: { client: httpClientInput('HTTP client.','{{E}}','{{R}}'), maxRedirects: effectValueInput('Maximum redirects.', { ts: 'number | undefined' }) },
	output: expressionOutput('Redirect-following HTTP client.', httpClientType('{{E}}','{{R}}')),
	source: `HttpClient.followRedirects(${marker('expression', 'client', '(undefined as any)')}, ${marker('expression', 'maxRedirects', '5')})`
})

export const HttpClientWithRateLimiterTemplate = defineTemplate({
	modelId: 'HttpClientWithRateLimiter', version: VERSION, description: 'Adds rate-limit coordination and optional 429 retries to an HttpClient.',
	typeParameters: typeParameters(['E','Client error type.'],['R','Client requirements.']),
	inputs: { client: httpClientInput('HTTP client.','{{E}}','{{R}}'), options: valueInput('Rate-limiter options including optional retry count.') },
	output: expressionOutput('Rate-limited HTTP client.', httpClientType('{{E}} | unknown', '{{R}} | ' + rateLimiterRequirement)),
	source: `HttpClient.withRateLimiter(${marker('expression', 'client', '(undefined as any)')}, ${marker('expression', 'options', '(undefined as any)')})`
})

export const HttpServerResponseEmptyTemplate = defineTemplate({
	modelId: 'HttpServerResponseEmpty', version: VERSION, description: 'Creates an empty HTTP server response; default status is 204.',
	inputs: { options: valueInput('Optional response metadata.') },
	output: expressionOutput('Empty HTTP server response.', httpServerResponseType()),
	source: `HttpServerResponse.empty(${marker('expression', 'options', '{}')})`
})

export const HttpServerResponseTextTemplate = defineTemplate({
	modelId: 'HttpServerResponseText', version: VERSION, description: 'Creates a text HTTP server response.',
	inputs: { body: effectValueInput('Text body.', { ts: 'string' }), options: valueInput('Optional response metadata.') },
	output: expressionOutput('Text HTTP server response.', httpServerResponseType()),
	source: `HttpServerResponse.text(${marker('expression', 'body', '"ok"')}, ${marker('expression', 'options', '{}')})`
})

export const HttpServerResponseJsonTemplate = defineTemplate({
	modelId: 'HttpServerResponseJson', version: VERSION, description: 'Serializes a value as a JSON server response with HttpBodyError in the error channel.',
	inputs: { body: valueInput('JSON-serializable response body.'), options: valueInput('Optional response metadata.') },
	output: expressionOutput('JSON server response Effect.', effectType(httpServerResponseType().ts, httpBodyErrorType, 'never')),
	source: `HttpServerResponse.json(${marker('expression', 'body', '{}')}, ${marker('expression', 'options', '{}')})`
})

export const HttpServerResponseSchemaJsonTemplate = defineTemplate({
	modelId: 'HttpServerResponseSchemaJson', version: VERSION, description: 'Encodes a response value through Schema and serializes it as JSON.',
	typeParameters: typeParameters(['A','Decoded response type.'],['I','Encoded response type.'],['RE','Schema encoding requirements.']),
	inputs: { schema: schemaInput('Schema used to encode the response.','{{A}}','{{I}}','never','{{RE}}'), body: valueInput('Decoded response value.', { ts: '{{A}}' }), options: valueInput('Optional response metadata.') },
	output: expressionOutput('Schema-encoded JSON response Effect.', effectType(httpServerResponseType().ts, httpBodyErrorType, '{{RE}}')),
	source: `HttpServerResponse.schemaJson(${marker('expression', 'schema', 'Schema.Unknown')})(${marker('expression', 'body', 'undefined')}, ${marker('expression', 'options', '{}')})`
})

export const HttpServerResponseStreamTemplate = defineTemplate({
	modelId: 'HttpServerResponseStream', version: VERSION, description: 'Creates a streaming byte HTTP response.',
	typeParameters: typeParameters(['E','Stream error type.']),
	inputs: { stream: typedExpressionInput('Byte response Stream.', streamType('Uint8Array','{{E}}','never')), options: valueInput('Optional response metadata.') },
	output: expressionOutput('Streaming HTTP server response.', httpServerResponseType()),
	source: `HttpServerResponse.stream(${marker('expression', 'stream', 'Stream.empty')}, ${marker('expression', 'options', '{}')})`
})

export const HttpServerResponseRedirectTemplate = defineTemplate({
	modelId: 'HttpServerResponseRedirect', version: VERSION, description: 'Creates an HTTP redirect response; default status is 302.',
	inputs: { location: effectValueInput('Redirect location.', { ts: 'string' }), options: valueInput('Optional response metadata.') },
	output: expressionOutput('HTTP redirect response.', httpServerResponseType()),
	source: `HttpServerResponse.redirect(${marker('expression', 'location', '"/"')}, ${marker('expression', 'options', '{}')})`
})

export const HttpServerRequestSchemaBodyJsonTemplate = defineTemplate({
	modelId: 'HttpServerRequestSchemaBodyJson', version: VERSION, description: 'Decodes the current request JSON body through Schema.',
	typeParameters: typeParameters(['A','Decoded request body.'],['I','Encoded request body.'],['RD','Schema decoding requirements.']),
	inputs: { schema: schemaInput('Schema used to decode request JSON.','{{A}}','{{I}}','{{RD}}','never'), options: valueInput('Schema/JSON parsing options.') },
	output: expressionOutput('Decoded request body Effect.', effectType('{{A}}','unknown',`{ readonly __httpServerRequestRequirement: "HttpServerRequest" } | {{RD}}`)),
	source: `HttpServerRequest.schemaBodyJson(${marker('expression', 'schema', 'Schema.Unknown')}, ${marker('expression', 'options', '{}')})`
})

export const HttpServerRequestSchemaHeadersTemplate = defineTemplate({
	modelId: 'HttpServerRequestSchemaHeaders', version: VERSION, description: 'Decodes the current request headers through Schema.',
	typeParameters: typeParameters(['A','Decoded headers.'],['I','Encoded header record.'],['RD','Schema decoding requirements.']),
	inputs: { schema: schemaInput('Header Schema.','{{A}}','{{I}}','{{RD}}','never'), options: valueInput('Schema parse options.') },
	output: expressionOutput('Decoded request headers Effect.', effectType('{{A}}','unknown',`{ readonly __httpServerRequestRequirement: "HttpServerRequest" } | {{RD}}`)),
	source: `HttpServerRequest.schemaHeaders(${marker('expression', 'schema', 'Schema.Record(Schema.String, Schema.String)')}, ${marker('expression', 'options', '{}')})`
})

export const HttpServerRequestSchemaSearchParamsTemplate = defineTemplate({
	modelId: 'HttpServerRequestSchemaSearchParams', version: VERSION, description: 'Decodes parsed search parameters through Schema.',
	typeParameters: typeParameters(['A','Decoded query parameters.'],['I','Encoded query record.'],['RD','Schema decoding requirements.']),
	inputs: { schema: schemaInput('Query Schema.','{{A}}','{{I}}','{{RD}}','never'), options: valueInput('Schema parse options.') },
	output: expressionOutput('Decoded query parameters Effect.', effectType('{{A}}','unknown',`{ readonly __parsedSearchParamsRequirement: "ParsedSearchParams" } | {{RD}}`)),
	source: `HttpServerRequest.schemaSearchParams(${marker('expression', 'schema', 'Schema.Record(Schema.String, Schema.String)')}, ${marker('expression', 'options', '{}')})`
})

export const HttpRouterAddTemplate = defineTemplate({
	modelId: 'HttpRouterAdd', version: VERSION, description: 'Registers one route in the current HttpRouter Layer.',
	typeParameters: typeParameters(['E','Handler error type.'],['R','Handler requirements.']),
	inputs: { method: effectValueInput('HTTP method.', { ts: '"GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS" | "QUERY" | "*"' }), path: effectValueInput('Absolute route path or wildcard.', { ts: 'string' }), handler: effectSourceInput('HTTP route handler Effect.', effectType(httpServerResponseType().ts,'{{E}}','{{R}}')), options: valueInput('Route options, including uninterruptible.') },
	output: expressionOutput('Route registration Layer.', layerType('never','never',`${httpRouterRequirement} | {{R}}`)),
	source: `HttpRouter.add(${marker('expression', 'method', '"GET"')}, ${marker('expression', 'path', '"/health"')}, ${marker('expression', 'handler', 'Effect.succeed(HttpServerResponse.text("ok"))')}, ${marker('expression', 'options', '{}')})`
})

export const HttpRouterCorsTemplate = defineTemplate({
	modelId: 'HttpRouterCors', version: VERSION, description: 'Adds CORS middleware to the current HttpRouter.',
	inputs: { options: valueInput('CORS policy options.') },
	output: expressionOutput('CORS router Layer.', layerType('never','never',httpRouterRequirement)),
	source: `HttpRouter.cors(${marker('expression', 'options', '{}')})`
})

export const HttpRouterServeTemplate = defineTemplate({
	modelId: 'HttpRouterServe', version: VERSION, description: 'Starts serving an HttpRouter application Layer through the current HttpServer.',
	typeParameters: typeParameters(['P','Application Layer outputs.'],['E','Application Layer error type.'],['R','Application Layer requirements.']),
	inputs: { app: typedExpressionInput('HTTP router application Layer.', layerType('{{P}}','{{E}}','{{R}}')), options: valueInput('Router/server options.') },
	output: expressionOutput('Serving HTTP application Layer.', layerType('{{P}}','{{E}}',`${httpServerRequirement} | {{R}}`)),
	source: `HttpRouter.serve(${marker('expression', 'app', 'Layer.empty')}, ${marker('expression', 'options', '{}')})`
})

export const HttpServerServeTemplate = defineTemplate({
	modelId: 'HttpServerServe', version: VERSION, description: 'Serves one HTTP response Effect through the active HttpServer.',
	typeParameters: typeParameters(['E','Application error type.'],['R','Application requirements.']),
	inputs: { app: effectSourceInput('HTTP server response Effect.', effectType(httpServerResponseType().ts,'{{E}}','{{R}}')) },
	output: expressionOutput('HTTP server Layer.', layerType('never','never',`${httpServerRequirement} | {{R}}`)),
	source: `HttpServer.serve()(${marker('expression', 'app', 'Effect.succeed(HttpServerResponse.text("ok"))')})`
})

export const effectV4HttpFoundationalGraphTemplateInputs = [
	HttpClientRequestGetTemplate, HttpClientRequestPostTemplate, HttpClientRequestPutTemplate, HttpClientRequestPatchTemplate,
	HttpClientRequestDeleteTemplate, HttpClientRequestHeadTemplate, HttpClientRequestOptionsTemplate,
	HttpClientRequestSetHeaderTemplate, HttpClientRequestSetHeadersTemplate, HttpClientRequestSetUrlParamsTemplate,
	HttpClientRequestBearerTokenTemplate, HttpClientRequestBasicAuthTemplate, HttpClientRequestBodyTextTemplate,
	HttpClientRequestBodyJsonTemplate, HttpClientRequestSchemaBodyJsonTemplate, HttpClientRequestBodyStreamTemplate,
	HttpClientExecuteTemplate, HttpClientGetTemplate, HttpClientPostTemplate, HttpClientPutTemplate, HttpClientPatchTemplate,
	HttpClientDeleteTemplate, HttpClientFilterStatusOkTemplate, HttpClientRetryTemplate, HttpClientFollowRedirectsTemplate,
	HttpClientWithRateLimiterTemplate, HttpServerResponseEmptyTemplate, HttpServerResponseTextTemplate,
	HttpServerResponseJsonTemplate, HttpServerResponseSchemaJsonTemplate, HttpServerResponseStreamTemplate,
	HttpServerResponseRedirectTemplate, HttpServerRequestSchemaBodyJsonTemplate, HttpServerRequestSchemaHeadersTemplate,
	HttpServerRequestSchemaSearchParamsTemplate, HttpRouterAddTemplate, HttpRouterCorsTemplate, HttpRouterServeTemplate,
	HttpServerServeTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
