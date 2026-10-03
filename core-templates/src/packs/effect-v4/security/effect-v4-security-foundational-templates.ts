import { defineTemplate } from '../../../authoring/define-template.js'
import { effectSourceInput, effectType, effectValueInput } from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	configType,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	nominalType,
	schemaType,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import {
	httpApiMiddlewareInput,
	httpApiMiddlewareType,
	httpApiSecurityKind,
	httpApiSecurityType,
	httpClientInput,
	httpClientRequestInput,
	httpClientRequestType,
	httpClientType,
	httpServerResponseType
} from '../http/effect-http-rest-template-helpers.js'
import {
	securityAuthenticationServiceInput,
	securityAuthenticationServiceType,
	securityAuthorizationServiceInput,
	securityAuthorizationServiceType,
	securityCookiesType,
	securityCredentialProviderInput,
	securityCredentialProviderType,
	securityHeadersType,
	securityHttpMiddlewareType,
	securityRedactedStringType
} from './effect-security-template-helpers.js'
import { redactedType } from '../data/effect-data-type-template-helpers.js'

/**
 * Effect V4 security / secrets / auth foundations.
 *
 * Runtime contract:
 *   import { Config, Context, Effect, Layer, Redacted, Ref, Schema } from 'effect'
 *   import { Cookies, Headers, HttpClient, HttpClientRequest, HttpMiddleware, HttpServerResponse } from 'effect/unstable/http'
 *   import { HttpApiBuilder, HttpApiMiddleware, HttpApiSecurity } from 'effect/unstable/httpapi'
 */

const VERSION = '1.0.0' as const
const configErrorType = '{ readonly _tag: "ConfigError"; readonly cause?: unknown }'
/**
 * Structural stand-in for `Redacted.Redacted<string>`.
 *
 * Type descriptors must be self-contained against the ES2022 standard library,
 * so namespace-qualified references such as `Redacted.Redacted<string>` cannot
 * resolve. Reuse the structural descriptor instead.
 */
const redactedStringTs = redactedType('string').ts
/** Basic-auth credential record shape used by the HTTP middleware templates. */
const basicCredentialsTs = `{ readonly username: string; readonly password: ${redactedStringTs} }`
const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))
const schemaInput = (description: string, decoded = 'unknown', encoded = 'unknown', decoding = 'never', encoding = decoding) =>
	typedExpressionInput(description, schemaType(decoded, encoded, decoding, encoding))
const redactedInput = (description: string, value = 'string') =>
	typedExpressionInput(description, redactedType(value))

export const SecurityRedactedMakeLabeledTemplate = defineTemplate({
	modelId: 'SecurityRedactedMakeLabeled', version: VERSION,
	description: 'Wraps a sensitive value in Redacted with an inspection label.',
	typeParameters: typeParameters(['A', 'Sensitive value type.']),
	inputs: { value: valueInput('Sensitive value.', { ts: '{{A}}' }), label: effectValueInput('Redaction label.', { ts: 'string' }) },
	output: expressionOutput('Labeled Redacted value.', redactedType('{{A}}')),
	source: `Redacted.make(${marker('expression', 'value', '"secret"')}, { label: ${marker('expression', 'label', '"credential"')} })`
})

export const SecurityRedactedIsRedactedTemplate = defineTemplate({
	modelId: 'SecurityRedactedIsRedacted', version: VERSION,
	description: 'Checks whether an unknown value is a Redacted wrapper.',
	inputs: { value: valueInput('Unknown value.') },
	output: expressionOutput('Whether the value is Redacted.', { ts: 'boolean' }),
	source: `Redacted.isRedacted(${marker('expression', 'value', 'undefined')})`
})

export const SecurityRedactedRevealEffectTemplate = defineTemplate({
	modelId: 'SecurityRedactedRevealEffect', version: VERSION,
	description: 'Reveals a Redacted value only inside an explicit Effect boundary.',
	typeParameters: typeParameters(['A', 'Sensitive value type.']),
	inputs: { secret: redactedInput('Redacted secret.', '{{A}}') },
	output: expressionOutput('Effect yielding the underlying secret.', effectType('{{A}}', 'never', 'never')),
	source: `Effect.sync(() => Redacted.value(${marker('expression', 'secret', 'Redacted.make("secret")')}))`
})

export const SecurityRedactedWipeEffectTemplate = defineTemplate({
	modelId: 'SecurityRedactedWipeEffect', version: VERSION,
	description: 'Removes the stored value from a Redacted wrapper. This does not zero memory or affect other references.',
	typeParameters: typeParameters(['A', 'Sensitive value type.']),
	inputs: { secret: redactedInput('Redacted wrapper to wipe.', '{{A}}') },
	output: expressionOutput('Effect reporting whether the wrapper was removed from the redacted registry.', effectType('boolean', 'never', 'never')),
	source: `Effect.sync(() => Redacted.wipeUnsafe(${marker('expression', 'secret', 'Redacted.make("secret")')}))`
})

export const SecuritySchemaRedactedFromValueTemplate = defineTemplate({
	modelId: 'SecuritySchemaRedactedFromValue', version: VERSION,
	description: 'Builds a Schema that decodes a raw value and wraps the decoded result in Redacted.',
	typeParameters: typeParameters(['A', 'Decoded secret value type.'], ['I', 'Encoded input type.'], ['RD', 'Decoding services.'], ['RE', 'Encoding services.']),
	inputs: { schema: schemaInput('Inner secret Schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}') },
	output: expressionOutput('Raw-value-to-Redacted Schema.', schemaType(redactedType('{{A}}').ts, '{{I}}', '{{RD}}', '{{RE}}')),
	source: `Schema.RedactedFromValue(${marker('expression', 'schema', 'Schema.String')})`
})

export const SecuritySchemaRedactedRuntimeTemplate = defineTemplate({
	modelId: 'SecuritySchemaRedactedRuntime', version: VERSION,
	description: 'Builds a Schema that expects an existing Redacted value and transforms its hidden contents.',
	typeParameters: typeParameters(['A', 'Decoded secret value type.'], ['I', 'Encoded hidden value type.'], ['RD', 'Decoding services.'], ['RE', 'Encoding services.']),
	inputs: { schema: schemaInput('Inner Schema.', '{{A}}', '{{I}}', '{{RD}}', '{{RE}}'), options: valueInput('Redacted Schema options.') },
	output: expressionOutput('Runtime Redacted Schema.', schemaType(redactedType('{{A}}').ts, redactedType('{{I}}').ts, '{{RD}}', '{{RE}}')),
	source: `Schema.Redacted(${marker('expression', 'schema', 'Schema.String')}, ${marker('expression', 'options', '{}')})`
})

export const SecuritySchemaNonSerializableSecretTemplate = defineTemplate({
	modelId: 'SecuritySchemaNonSerializableSecret', version: VERSION,
	description: 'Builds a Redacted runtime Schema whose JSON encoding is explicitly disabled to prevent accidental secret serialization.',
	inputs: { label: effectValueInput('Secret label.', { ts: 'string' }) },
	output: expressionOutput('Non-JSON-serializable Redacted string Schema.', schemaType(securityRedactedStringType.ts, securityRedactedStringType.ts, 'never', 'never')),
	source: `Schema.Redacted(Schema.String, { label: ${marker('expression', 'label', '"Secret"')}, disallowJsonEncode: true })`
})

export const SecurityConfigRedactedTemplate = defineTemplate({
	modelId: 'SecurityConfigRedacted', version: VERSION,
	description: 'Reads a secret string setting with the current V4 Config.Redacted constructor.',
	inputs: { name: effectValueInput('Configuration key name.', { ts: 'string | undefined' }) },
	output: expressionOutput('Redacted secret Config.', configType(securityRedactedStringType.ts)),
	source: `Config.Redacted(${marker('expression', 'name', '"API_TOKEN"')})`
})

export const SecurityHeadersRedactTemplate = defineTemplate({
	modelId: 'SecurityHeadersRedact', version: VERSION,
	description: 'Creates an inspection record whose selected HTTP header values are wrapped in Redacted.',
	inputs: { headers: typedExpressionInput('HTTP Headers.', securityHeadersType()), patterns: effectValueInput('Header names or regular expressions to redact.', { ts: 'string | RegExp | readonly (string | RegExp)[]' }) },
	output: expressionOutput('Header record containing strings and Redacted values.', { ts: `Record<string, string | ${redactedStringTs}>` }),
	source: `Headers.redact(${marker('expression', 'headers', 'Headers.empty')}, ${marker('expression', 'patterns', '["authorization", "cookie", "x-api-key"]')})`
})

export const SecurityHeadersIsRedactedNameTemplate = defineTemplate({
	modelId: 'SecurityHeadersIsRedactedName', version: VERSION,
	description: 'Checks whether a header name matches configured redaction patterns.',
	inputs: { name: effectValueInput('Header name.', { ts: 'string' }), patterns: effectValueInput('Redaction patterns.', { ts: 'readonly (string | RegExp)[]' }) },
	output: expressionOutput('Whether the header is sensitive.', { ts: 'boolean' }),
	source: `Headers.isRedactedName(${marker('expression', 'name', '"authorization"')}, ${marker('expression', 'patterns', '["authorization"]')})`
})

export const SecurityEffectWithHeaderRedactionPatternsTemplate = defineTemplate({
	modelId: 'SecurityEffectWithHeaderRedactionPatterns', version: VERSION,
	description: 'Overrides the HTTP header redaction patterns for one Effect scope, including tracing and message inspection.',
	typeParameters: typeParameters(['A', 'Success type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: { source: effectSourceInput('Effect to run with custom header redaction.', effectType('{{A}}', '{{E}}', '{{R}}')), patterns: effectValueInput('Sensitive header names or regular expressions.', { ts: 'readonly (string | RegExp)[]' }) },
	output: expressionOutput('Effect with custom header-redaction reference.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `Effect.provideService(${marker('expression', 'source', 'Effect.void')}, Headers.CurrentRedactedNames, ${marker('expression', 'patterns', '["authorization", "cookie", "set-cookie", "x-api-key"]')})`
})

export const SecurityHttpApiCustomSchemeTemplate = defineTemplate({
	modelId: 'SecurityHttpApiCustomScheme', version: VERSION,
	description: 'Declares a custom HTTP Authorization scheme whose decoded credential is Redacted.',
	inputs: { scheme: effectValueInput('Authorization scheme token.', { ts: 'string' }) },
	output: expressionOutput('Custom HTTP security scheme.', httpApiSecurityKind('http')),
	source: `HttpApiSecurity.http({ scheme: ${marker('expression', 'scheme', '"Token"')} })`
})

export const SecurityHttpApiSecurityAnnotateTemplate = defineTemplate({
	modelId: 'SecurityHttpApiSecurityAnnotate', version: VERSION,
	description: 'Adds one OpenAPI annotation to an HTTP API security scheme.',
	inputs: { security: typedExpressionInput('HTTP API security scheme.', httpApiSecurityType()), annotation: valueInput('Annotation service key.'), value: valueInput('Annotation value.') },
	output: expressionOutput('Annotated security scheme.', httpApiSecurityType()),
	source: `HttpApiSecurity.annotate(${marker('expression', 'security', 'HttpApiSecurity.bearer')}, ${marker('expression', 'annotation', 'OpenApi.Description')}, ${marker('expression', 'value', '"Authentication token"')})`
})

export const SecurityHttpApiSecurityAnnotateMergeTemplate = defineTemplate({
	modelId: 'SecurityHttpApiSecurityAnnotateMerge', version: VERSION,
	description: 'Merges an annotation Context into an HTTP API security scheme.',
	inputs: { security: typedExpressionInput('HTTP API security scheme.', httpApiSecurityType()), annotations: valueInput('Context containing OpenAPI annotations.') },
	output: expressionOutput('Security scheme with merged annotations.', httpApiSecurityType()),
	source: `HttpApiSecurity.annotateMerge(${marker('expression', 'security', 'HttpApiSecurity.bearer')}, ${marker('expression', 'annotations', 'Context.empty()')})`
})

export const SecurityHttpApiDecodeCredentialTemplate = defineTemplate({
	modelId: 'SecurityHttpApiDecodeCredential', version: VERSION,
	description: 'Decodes a bearer, API-key, Basic, or custom HTTP credential from the current server request.',
	inputs: { security: typedExpressionInput('HTTP API security scheme.', httpApiSecurityType()) },
	output: expressionOutput('Decoded security credential Effect.', effectType('unknown', 'never', '{ readonly __httpServerRequest: "HttpServerRequest" } | { readonly __parsedSearchParams: "ParsedSearchParams" }')),
	source: `HttpApiBuilder.securityDecode(${marker('expression', 'security', 'HttpApiSecurity.bearer')})`
})

export const SecurityHttpApiSetApiKeyCookieTemplate = defineTemplate({
	modelId: 'SecurityHttpApiSetApiKeyCookie', version: VERSION,
	description: 'Registers a secure HttpOnly Set-Cookie response for an API-key cookie security scheme.',
	inputs: { security: typedExpressionInput('API-key cookie security scheme.', httpApiSecurityKind('apiKey')), value: redactedInput('Cookie credential.', 'string'), options: valueInput('Cookie options; secure and httpOnly default to true.') },
	output: expressionOutput('Effect registering the secure credential cookie.', effectType('void', 'never', '{ readonly __httpServerRequest: "HttpServerRequest" }')),
	source: `HttpApiBuilder.securitySetCookie(${marker('expression', 'security', 'HttpApiSecurity.apiKey({ key: "session", in: "cookie" })')}, ${marker('expression', 'value', 'Redacted.make("token")')}, ${marker('expression', 'options', '{ sameSite: "lax", path: "/" }')})`
})

export const SecurityHttpClientRequestApiKeyHeaderTemplate = defineTemplate({
	modelId: 'SecurityHttpClientRequestApiKeyHeader', version: VERSION,
	description: 'Adds a Redacted API key to an outgoing request header, revealing it only at the transport boundary.',
	inputs: { request: httpClientRequestInput('HTTP client request.'), header: effectValueInput('API-key header name.', { ts: 'string' }), key: redactedInput('Redacted API key.', 'string') },
	output: expressionOutput('API-key authenticated request.', httpClientRequestType()),
	source: `HttpClientRequest.setHeader(${marker('expression', 'request', 'HttpClientRequest.get("https://example.com")')}, ${marker('expression', 'header', '"x-api-key"')}, Redacted.value(${marker('expression', 'key', 'Redacted.make("secret")')}))`
})

export const SecurityHttpClientRequestCustomAuthTemplate = defineTemplate({
	modelId: 'SecurityHttpClientRequestCustomAuth', version: VERSION,
	description: 'Adds an opaque Redacted credential to the Authorization header using a custom scheme.',
	inputs: { request: httpClientRequestInput('HTTP client request.'), scheme: effectValueInput('Authorization scheme.', { ts: 'string' }), credential: redactedInput('Redacted credential.', 'string') },
	output: expressionOutput('Custom-authenticated request.', httpClientRequestType()),
	source: `HttpClientRequest.setHeader(${marker('expression', 'request', 'HttpClientRequest.get("https://example.com")')}, "Authorization", ${marker('expression', 'scheme', '"Token"')} + " " + Redacted.value(${marker('expression', 'credential', 'Redacted.make("secret")')}))`
})

export const SecurityCookieJarMakeTemplate = defineTemplate({
	modelId: 'SecurityCookieJarMake', version: VERSION,
	description: 'Creates a Ref-backed cookie jar for stateful authenticated HTTP clients.',
	inputs: {},
	output: expressionOutput('Cookie-jar Ref Effect.', effectType('unknown', 'never', 'never')),
	source: 'Ref.make(Cookies.empty)'
})

export const SecurityHttpClientWithCookieJarTemplate = defineTemplate({
	modelId: 'SecurityHttpClientWithCookieJar', version: VERSION,
	description: 'Attaches a shared cookie Ref to an HttpClient so response cookies are retained and sent on later requests.',
	inputs: { client: httpClientInput('Base HTTP client.'), cookies: typedExpressionInput('Ref containing Cookies.', nominalType('effect/Ref', { refValue: securityCookiesType().ts })) },
	output: expressionOutput('Stateful cookie-aware HTTP client.', httpClientType()),
	source: `HttpClient.withCookiesRef(${marker('expression', 'client', 'HttpClient.make(() => Effect.die("client"))')}, ${marker('expression', 'cookies', '(undefined as never)')})`
})

export const SecurityHttpServerResponseSecurityHeadersTemplate = defineTemplate({
	modelId: 'SecurityHttpServerResponseSecurityHeaders', version: VERSION,
	description: 'Sets a supplied collection of security headers on an HTTP server response.',
	inputs: { response: typedExpressionInput('HTTP server response.', httpServerResponseType()), headers: valueInput('Security header collection.') },
	output: expressionOutput('Response with security headers.', httpServerResponseType()),
	source: `HttpServerResponse.setHeaders(${marker('expression', 'response', 'HttpServerResponse.empty()')}, ${marker('expression', 'headers', '{ "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" }')})`
})

export const SecurityHttpMiddlewareSecurityHeadersTemplate = defineTemplate({
	modelId: 'SecurityHttpMiddlewareSecurityHeaders', version: VERSION,
	description: 'Creates HTTP middleware that adds security headers to every successful response it wraps.',
	inputs: { headers: valueInput('Security headers to set.') },
	output: expressionOutput('Security-header HTTP middleware.', securityHttpMiddlewareType()),
	source: `HttpMiddleware.make(httpApp => Effect.map(httpApp, response => HttpServerResponse.setHeaders(response, ${marker('expression', 'headers', '{ "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" }')})))`
})

export const SecurityHttpServerResponseExpireCookieTemplate = defineTemplate({
	modelId: 'SecurityHttpServerResponseExpireCookie', version: VERSION,
	description: 'Expires a session/authentication cookie on an HTTP server response.',
	inputs: { response: typedExpressionInput('HTTP server response.', httpServerResponseType()), name: effectValueInput('Cookie name.', { ts: 'string' }), options: valueInput('Cookie scope options.') },
	output: expressionOutput('Response containing an expired cookie.', httpServerResponseType()),
	source: `HttpServerResponse.expireCookie(${marker('expression', 'response', 'HttpServerResponse.empty()')}, ${marker('expression', 'name', '"session"')}, ${marker('expression', 'options', '{ path: "/", secure: true, httpOnly: true, sameSite: "lax" }')})`
})

export const SecurityCredentialProviderLayerTemplate = defineTemplate({
	modelId: 'SecurityCredentialProviderLayer', version: VERSION,
	description: 'Provides a credential-provider service whose get Effect returns the current Redacted token.',
	typeParameters: typeParameters(['I', 'Credential-provider service identifier.'], ['E', 'Credential acquisition error type.'], ['R', 'Credential acquisition requirements.']),
	inputs: { service: serviceKeyInput('Credential-provider service key.', '{{I}}', securityCredentialProviderType('{{E}}').ts), get: effectSourceInput('Effect acquiring the current Redacted credential.', effectType(securityRedactedStringType.ts, '{{E}}', '{{R}}')) },
	output: expressionOutput('Credential-provider Layer.', layerType('{{I}}', 'never', '{{R}}')),
	source: `Layer.effect(${marker('expression', 'service', 'CredentialProvider')}, Effect.map(${marker('expression', 'get', 'Effect.succeed(Redacted.make("token"))')}, secret => ({ get: Effect.succeed(secret) })))`
})

export const SecurityCredentialProviderGetTemplate = defineTemplate({
	modelId: 'SecurityCredentialProviderGet', version: VERSION,
	description: 'Reads the current Redacted credential from a credential-provider service.',
	typeParameters: typeParameters(['I', 'Credential-provider identifier.'], ['E', 'Credential acquisition error type.']),
	inputs: { service: serviceKeyInput('Credential-provider service key.', '{{I}}', securityCredentialProviderType('{{E}}').ts) },
	output: expressionOutput('Current credential Effect.', effectType(securityRedactedStringType.ts, '{{E}}', '{{I}}')),
	source: `${marker('expression', 'service', 'CredentialProvider')}.use(provider => provider.get)`
})

export const SecurityAuthenticationServiceLayerTemplate = defineTemplate({
	modelId: 'SecurityAuthenticationServiceLayer', version: VERSION,
	description: 'Provides a reusable authentication service that maps credentials to principals.',
	typeParameters: typeParameters(['I', 'Authentication service identifier.'], ['C', 'Credential type.'], ['P', 'Principal type.'], ['E', 'Authentication error type.'], ['R', 'Authentication requirements.']),
	inputs: { service: serviceKeyInput('Authentication service key.', '{{I}}', securityAuthenticationServiceType('{{C}}', '{{P}}', '{{E}}', '{{R}}').ts), authenticate: callbackInput('Credential authentication callback.', effectReturningCallbackType('credential: {{C}}', '{{P}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Authentication-service Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'service', 'Authentication')}, { authenticate: ${marker('expression', 'authenticate', 'credential => Effect.succeed(credential)')} })`
})

export const SecurityAuthenticateCredentialTemplate = defineTemplate({
	modelId: 'SecurityAuthenticateCredential', version: VERSION,
	description: 'Authenticates a credential through an authentication service.',
	typeParameters: typeParameters(['I', 'Authentication service identifier.'], ['C', 'Credential type.'], ['P', 'Principal type.'], ['E', 'Authentication error type.'], ['R', 'Authentication operation requirements.']),
	inputs: { service: serviceKeyInput('Authentication service key.', '{{I}}', securityAuthenticationServiceType('{{C}}', '{{P}}', '{{E}}', '{{R}}').ts), credential: valueInput('Credential to authenticate.', { ts: '{{C}}' }) },
	output: expressionOutput('Authentication Effect.', effectType('{{P}}', '{{E}}', '{{I}} | {{R}}')),
	source: `${marker('expression', 'service', 'Authentication')}.use(auth => auth.authenticate(${marker('expression', 'credential', 'undefined')}))`
})

export const SecurityAuthorizationServiceLayerTemplate = defineTemplate({
	modelId: 'SecurityAuthorizationServiceLayer', version: VERSION,
	description: 'Provides an authorization service that evaluates principal/action/resource access.',
	typeParameters: typeParameters(['I', 'Authorization service identifier.'], ['P', 'Principal type.'], ['A', 'Action type.'], ['Res', 'Resource type.'], ['E', 'Authorization error type.'], ['R', 'Authorization requirements.']),
	inputs: { service: serviceKeyInput('Authorization service key.', '{{I}}', securityAuthorizationServiceType('{{P}}', '{{A}}', '{{Res}}', '{{E}}', '{{R}}').ts), authorize: callbackInput('Authorization policy callback.', effectReturningCallbackType('principal: {{P}}, action: {{A}}, resource: {{Res}}', 'void', '{{E}}', '{{R}}')) },
	output: expressionOutput('Authorization-service Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'service', 'Authorization')}, { authorize: ${marker('expression', 'authorize', '() => Effect.void')} })`
})

export const SecurityAuthorizePrincipalTemplate = defineTemplate({
	modelId: 'SecurityAuthorizePrincipal', version: VERSION,
	description: 'Checks a principal/action/resource tuple through an authorization service.',
	typeParameters: typeParameters(['I', 'Authorization service identifier.'], ['P', 'Principal type.'], ['A', 'Action type.'], ['Res', 'Resource type.'], ['E', 'Authorization error type.'], ['R', 'Authorization operation requirements.']),
	inputs: { service: serviceKeyInput('Authorization service key.', '{{I}}', securityAuthorizationServiceType('{{P}}', '{{A}}', '{{Res}}', '{{E}}', '{{R}}').ts), principal: valueInput('Authenticated principal.', { ts: '{{P}}' }), action: valueInput('Requested action.', { ts: '{{A}}' }), resource: valueInput('Target resource.', { ts: '{{Res}}' }) },
	output: expressionOutput('Authorization decision Effect.', effectType('void', '{{E}}', '{{I}} | {{R}}')),
	source: `${marker('expression', 'service', 'Authorization')}.use(authz => authz.authorize(${marker('expression', 'principal', 'undefined')}, ${marker('expression', 'action', 'undefined')}, ${marker('expression', 'resource', 'undefined')}))`
})

export const SecurityPrincipalLayerTemplate = defineTemplate({
	modelId: 'SecurityPrincipalLayer', version: VERSION,
	description: 'Provides an authenticated principal as a request/application service.',
	typeParameters: typeParameters(['I', 'Principal service identifier.'], ['P', 'Principal type.']),
	inputs: { service: serviceKeyInput('Principal service key.', '{{I}}', '{{P}}'), principal: valueInput('Authenticated principal.', { ts: '{{P}}' }) },
	output: expressionOutput('Principal Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'service', 'CurrentPrincipal')}, ${marker('expression', 'principal', 'undefined')})`
})

export const SecurityPrincipalGetTemplate = defineTemplate({
	modelId: 'SecurityPrincipalGet', version: VERSION,
	description: 'Reads the authenticated principal service from the current Effect context.',
	typeParameters: typeParameters(['I', 'Principal service identifier.'], ['P', 'Principal type.']),
	inputs: { service: serviceKeyInput('Principal service key.', '{{I}}', '{{P}}') },
	output: expressionOutput('Current principal Effect.', effectType('{{P}}', 'never', '{{I}}')),
	source: `${marker('expression', 'service', 'CurrentPrincipal')}.use(principal => Effect.succeed(principal))`
})

const principalMiddlewareTemplate = (
	modelId: string,
	credentialType: string,
	implementationKey: string,
	description: string
) => defineTemplate({
	modelId, version: VERSION, description,
	typeParameters: typeParameters(['I', 'Principal service identifier.'], ['P', 'Principal type.'], ['E', 'Authentication error type.'], ['R', 'Authentication requirements.']),
	inputs: {
		middleware: httpApiMiddlewareInput('Security middleware service.'),
		principal: serviceKeyInput('Principal service provided to endpoint handlers.', '{{I}}', '{{P}}'),
		authenticate: callbackInput('Credential authentication callback.', effectReturningCallbackType(`credential: ${credentialType}`, '{{P}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Authentication middleware Layer.', layerType(httpApiMiddlewareType('{{I}}', '{{E}}', '{{R}}').ts, 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'middleware', 'AuthMiddleware')}, { ${implementationKey}: (httpEffect, { credential }) => Effect.flatMap((${marker('expression', 'authenticate', 'credential => Effect.succeed(credential)')})(credential), user => Effect.provideService(httpEffect, ${marker('expression', 'principal', 'CurrentPrincipal')}, user)) })`
})

export const SecurityBearerPrincipalMiddlewareLayerTemplate = principalMiddlewareTemplate(
	'SecurityBearerPrincipalMiddlewareLayer', securityRedactedStringType.ts, 'bearer',
	'Provides bearer security middleware that authenticates a Redacted token and supplies a principal.'
)
export const SecurityApiKeyPrincipalMiddlewareLayerTemplate = principalMiddlewareTemplate(
	'SecurityApiKeyPrincipalMiddlewareLayer', securityRedactedStringType.ts, 'apiKey',
	'Provides API-key security middleware that authenticates a Redacted API key and supplies a principal.'
)
export const SecurityBasicPrincipalMiddlewareLayerTemplate = principalMiddlewareTemplate(
	'SecurityBasicPrincipalMiddlewareLayer', basicCredentialsTs, 'basic',
	'Provides HTTP Basic security middleware that authenticates username/password credentials and supplies a principal.'
)

export const SecurityAuthorizationHttpApiMiddlewareLayerTemplate = defineTemplate({
	modelId: 'SecurityAuthorizationHttpApiMiddlewareLayer', version: VERSION,
	description: 'Provides non-security HttpApi middleware that authorizes the current principal using endpoint/group metadata.',
	typeParameters: typeParameters(['I', 'Principal service identifier.'], ['P', 'Principal type.'], ['E', 'Authorization error type.'], ['R', 'Authorization requirements.']),
	inputs: { middleware: httpApiMiddlewareInput('Authorization middleware service.'), principal: serviceKeyInput('Current principal service.', '{{I}}', '{{P}}'), authorize: callbackInput('Authorization callback receiving principal and endpoint metadata.', effectReturningCallbackType('principal: {{P}}, endpoint: unknown, group: unknown', 'void', '{{E}}', '{{R}}')) },
	output: expressionOutput('Authorization middleware Layer.', layerType(httpApiMiddlewareType('never', '{{E}}', '{{I}} | {{R}}').ts, 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'middleware', 'AuthorizationMiddleware')}, (httpEffect, { endpoint, group }) => ${marker('expression', 'principal', 'CurrentPrincipal')}.use(user => Effect.andThen((${marker('expression', 'authorize', '(_user: unknown, _endpoint: unknown, _group: unknown) => Effect.void')})(user, endpoint, group), httpEffect)))`
})

export const SecurityDynamicBearerClientMiddlewareLayerTemplate = defineTemplate({
	modelId: 'SecurityDynamicBearerClientMiddlewareLayer', version: VERSION,
	description: 'Provides generated-client middleware that fetches a fresh Redacted bearer token for each request.',
	typeParameters: typeParameters(['I', 'Credential-provider service identifier.'], ['E', 'Credential-provider error type.']),
	inputs: { middleware: httpApiMiddlewareInput('Client-required middleware service.'), provider: serviceKeyInput('Credential-provider service.', '{{I}}', securityCredentialProviderType('{{E}}').ts) },
	output: expressionOutput('Dynamic bearer client-middleware Layer.', layerType('unknown', 'never', '{{I}}')),
	source: `HttpApiMiddleware.layerClient(${marker('expression', 'middleware', 'AuthMiddleware')}, ({ next, request }) => ${marker('expression', 'provider', 'CredentialProvider')}.use(credentials => Effect.flatMap(credentials.get, token => next(HttpClientRequest.bearerToken(request, token)))))`
})

export const SecurityDynamicBasicClientMiddlewareLayerTemplate = defineTemplate({
	modelId: 'SecurityDynamicBasicClientMiddlewareLayer', version: VERSION,
	description: 'Provides generated-client middleware that resolves Redacted Basic credentials for each request.',
	typeParameters: typeParameters(['I', 'Credential service identifier.'], ['E', 'Credential acquisition error type.']),
	inputs: { middleware: httpApiMiddlewareInput('Client-required middleware service.'), credentials: serviceKeyInput('Service exposing get: Effect<{ username, password }, E>.', '{{I}}', `{ readonly get: ${effectType(basicCredentialsTs, '{{E}}', 'never').ts} }`) },
	output: expressionOutput('Dynamic Basic-auth client-middleware Layer.', layerType('unknown', 'never', '{{I}}')),
	source: `HttpApiMiddleware.layerClient(${marker('expression', 'middleware', 'AuthMiddleware')}, ({ next, request }) => ${marker('expression', 'credentials', 'BasicCredentials')}.use(source => Effect.flatMap(source.get, value => next(HttpClientRequest.basicAuth(request, value.username, value.password)))))`
})

export const SecurityDynamicApiKeyHeaderClientMiddlewareLayerTemplate = defineTemplate({
	modelId: 'SecurityDynamicApiKeyHeaderClientMiddlewareLayer', version: VERSION,
	description: 'Provides generated-client middleware that resolves a Redacted API key for each request and inserts it into a header.',
	typeParameters: typeParameters(['I', 'Credential-provider service identifier.'], ['E', 'Credential-provider error type.']),
	inputs: { middleware: httpApiMiddlewareInput('Client-required middleware service.'), provider: serviceKeyInput('Credential-provider service.', '{{I}}', securityCredentialProviderType('{{E}}').ts), header: effectValueInput('API-key header name.', { ts: 'string' }) },
	output: expressionOutput('Dynamic API-key client-middleware Layer.', layerType('unknown', 'never', '{{I}}')),
	source: `HttpApiMiddleware.layerClient(${marker('expression', 'middleware', 'AuthMiddleware')}, ({ next, request }) => ${marker('expression', 'provider', 'CredentialProvider')}.use(credentials => Effect.flatMap(credentials.get, token => next(HttpClientRequest.setHeader(request, ${marker('expression', 'header', '"x-api-key"')}, Redacted.value(token))))))`
})

export const SecurityEphemeralRedactedUseTemplate = defineTemplate({
	modelId: 'SecurityEphemeralRedactedUse', version: VERSION,
	description: 'Uses an exclusively owned Redacted value and wipes that wrapper afterward. Do not use for shared wrappers.',
	typeParameters: typeParameters(['A', 'Secret value type.'], ['B', 'Use success type.'], ['E', 'Use error type.'], ['R', 'Use requirements.']),
	inputs: { secret: effectSourceInput('Effect acquiring an exclusively owned Redacted value.', effectType(redactedType('{{A}}').ts, 'never', 'never')), use: callbackInput('Trusted callback receiving the revealed value.', effectReturningCallbackType('value: {{A}}', '{{B}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Effect that wipes the wrapper after use.', effectType('{{B}}', '{{E}}', '{{R}}')),
	source: `Effect.acquireUseRelease(${marker('expression', 'secret', 'Effect.succeed(Redacted.make("secret"))')}, wrapped => (${marker('expression', 'use', 'value => Effect.succeed(value)')})(Redacted.value(wrapped)), wrapped => Effect.sync(() => { Redacted.wipeUnsafe(wrapped) }))`
})

export const effectV4SecurityFoundationalTemplateInputs = [
	SecurityRedactedMakeLabeledTemplate,
	SecurityRedactedIsRedactedTemplate,
	SecurityRedactedRevealEffectTemplate,
	SecurityRedactedWipeEffectTemplate,
	SecuritySchemaRedactedFromValueTemplate,
	SecuritySchemaRedactedRuntimeTemplate,
	SecuritySchemaNonSerializableSecretTemplate,
	SecurityConfigRedactedTemplate,
	SecurityHeadersRedactTemplate,
	SecurityHeadersIsRedactedNameTemplate,
	SecurityEffectWithHeaderRedactionPatternsTemplate,
	SecurityHttpApiCustomSchemeTemplate,
	SecurityHttpApiSecurityAnnotateTemplate,
	SecurityHttpApiSecurityAnnotateMergeTemplate,
	SecurityHttpApiDecodeCredentialTemplate,
	SecurityHttpApiSetApiKeyCookieTemplate,
	SecurityHttpClientRequestApiKeyHeaderTemplate,
	SecurityHttpClientRequestCustomAuthTemplate,
	SecurityCookieJarMakeTemplate,
	SecurityHttpClientWithCookieJarTemplate,
	SecurityHttpServerResponseSecurityHeadersTemplate,
	SecurityHttpMiddlewareSecurityHeadersTemplate,
	SecurityHttpServerResponseExpireCookieTemplate,
	SecurityCredentialProviderLayerTemplate,
	SecurityCredentialProviderGetTemplate,
	SecurityAuthenticationServiceLayerTemplate,
	SecurityAuthenticateCredentialTemplate,
	SecurityAuthorizationServiceLayerTemplate,
	SecurityAuthorizePrincipalTemplate,
	SecurityPrincipalLayerTemplate,
	SecurityPrincipalGetTemplate,
	SecurityBearerPrincipalMiddlewareLayerTemplate,
	SecurityApiKeyPrincipalMiddlewareLayerTemplate,
	SecurityBasicPrincipalMiddlewareLayerTemplate,
	SecurityAuthorizationHttpApiMiddlewareLayerTemplate,
	SecurityDynamicBearerClientMiddlewareLayerTemplate,
	SecurityDynamicBasicClientMiddlewareLayerTemplate,
	SecurityDynamicApiKeyHeaderClientMiddlewareLayerTemplate,
	SecurityEphemeralRedactedUseTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
