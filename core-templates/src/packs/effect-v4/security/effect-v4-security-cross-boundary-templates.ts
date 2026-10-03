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
	statementCollectionInput,
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
	httpClientRequirement,
	httpClientRequestInput,
	httpClientRequestType
} from '../http/effect-http-rest-template-helpers.js'
import {
	securityCredentialProviderType,
	securityRedactedStringType
} from './effect-security-template-helpers.js'
import { cliPromptType, promptEnvironmentRequirement, terminalQuitErrorType } from '../cli/effect-cli-template-helpers.js'
import { childProcessCommandType } from '../child-process/effect-child-process-template-helpers.js'

/**
 * Effect V4 cross-boundary security compositions.
 */

const VERSION = '1.0.0' as const
const configErrorType = '{ readonly _tag: "ConfigError"; readonly cause?: unknown }'
const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))
const layerInput = (description: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, layerType(provided, error, requirements))
const redactedConfigInput = (description: string) =>
	typedExpressionInput(description, configType(securityRedactedStringType.ts))
const redactedPromptInput = (description: string) =>
	typedExpressionInput(description, cliPromptType(securityRedactedStringType.ts))

export const SecurityConfigCredentialProviderLayerTemplate = defineTemplate({
	modelId: 'SecurityConfigCredentialProviderLayer', version: VERSION,
	description: 'Loads a Redacted credential once from Config and exposes it through a credential-provider service.',
	typeParameters: typeParameters(['I', 'Credential-provider service identifier.']),
	inputs: { service: serviceKeyInput('Credential-provider service key.', '{{I}}', securityCredentialProviderType(configErrorType).ts), config: redactedConfigInput('Secret Config.') },
	output: expressionOutput('Config-backed credential-provider Layer.', layerType('{{I}}', configErrorType, 'never')),
	source: `Layer.effect(${marker('expression', 'service', 'CredentialProvider')}, Effect.map(${marker('expression', 'config', 'Config.Redacted("API_TOKEN")')}, token => ({ get: Effect.succeed(token) })))`
})

export const SecurityConfigBearerClientMiddlewareLayerTemplate = defineTemplate({
	modelId: 'SecurityConfigBearerClientMiddlewareLayer', version: VERSION,
	description: 'Loads a Redacted bearer token during Layer construction and provides generated-client authentication middleware.',
	inputs: { middleware: httpApiMiddlewareInput('Client-required authentication middleware.'), config: redactedConfigInput('Bearer-token Config.') },
	output: expressionOutput('Config-backed bearer client-middleware Layer.', layerType('unknown', configErrorType, 'never')),
	source: `Layer.unwrap(Effect.map(${marker('expression', 'config', 'Config.Redacted("API_TOKEN")')}, token => HttpApiMiddleware.layerClient(${marker('expression', 'middleware', 'AuthMiddleware')}, ({ next, request }) => next(HttpClientRequest.bearerToken(request, token)))))`
})

export const SecurityConfigApiKeyClientMiddlewareLayerTemplate = defineTemplate({
	modelId: 'SecurityConfigApiKeyClientMiddlewareLayer', version: VERSION,
	description: 'Loads a Redacted API key during Layer construction and injects it into generated-client requests.',
	inputs: { middleware: httpApiMiddlewareInput('Client-required authentication middleware.'), config: redactedConfigInput('API-key Config.'), header: effectValueInput('API-key header name.', { ts: 'string' }) },
	output: expressionOutput('Config-backed API-key client-middleware Layer.', layerType('unknown', configErrorType, 'never')),
	source: `Layer.unwrap(Effect.map(${marker('expression', 'config', 'Config.Redacted("API_KEY")')}, token => HttpApiMiddleware.layerClient(${marker('expression', 'middleware', 'AuthMiddleware')}, ({ next, request }) => next(HttpClientRequest.setHeader(request, ${marker('expression', 'header', '"x-api-key"')}, Redacted.value(token))))))`
})

export const SecurityConfigBasicClientMiddlewareLayerTemplate = defineTemplate({
	modelId: 'SecurityConfigBasicClientMiddlewareLayer', version: VERSION,
	description: 'Loads Basic-auth username and Redacted password during Layer construction and decorates generated-client requests.',
	inputs: { middleware: httpApiMiddlewareInput('Client-required authentication middleware.'), username: typedExpressionInput('Username Config.', configType('string')), password: redactedConfigInput('Password Config.') },
	output: expressionOutput('Config-backed Basic-auth client-middleware Layer.', layerType('unknown', configErrorType, 'never')),
	source: `Layer.unwrap(Effect.map(Effect.all({ username: ${marker('expression', 'username', 'Config.String("API_USER")')}, password: ${marker('expression', 'password', 'Config.Redacted("API_PASSWORD")')} }), credentials => HttpApiMiddleware.layerClient(${marker('expression', 'middleware', 'AuthMiddleware')}, ({ next, request }) => next(HttpClientRequest.basicAuth(request, credentials.username, credentials.password)))))`
})

const authnAuthzLayers = (
	modelId: string,
	credentialType: string,
	securityKey: string,
	description: string
) => defineTemplate({
	modelId, version: VERSION, description,
	typeParameters: typeParameters(['I', 'Principal service identifier.'], ['P', 'Principal type.'], ['EAuth', 'Authentication error type.'], ['RAuth', 'Authentication requirements.'], ['EAuthz', 'Authorization error type.'], ['RAuthz', 'Authorization requirements.']),
	inputs: {
		authenticationMiddleware: httpApiMiddlewareInput('Security middleware service.'),
		authorizationMiddleware: httpApiMiddlewareInput('Authorization middleware service.'),
		principal: serviceKeyInput('Current principal service.', '{{I}}', '{{P}}'),
		authenticate: callbackInput('Authentication callback.', effectReturningCallbackType(`credential: ${credentialType}`, '{{P}}', '{{EAuth}}', '{{RAuth}}')),
		authorize: callbackInput('Authorization callback using endpoint metadata.', effectReturningCallbackType('principal: {{P}}, endpoint: unknown, group: unknown', 'void', '{{EAuthz}}', '{{RAuthz}}'))
	},
	output: expressionOutput('Authentication plus authorization middleware Layers.', layerType('unknown', 'never', 'never')),
	source: `(() => {
	const CurrentPrincipal = ${marker('expression', 'principal', '(undefined as any)')}
	const authentication = Layer.succeed(${marker('expression', 'authenticationMiddleware', 'AuthenticationMiddleware')}, { ${securityKey}: (httpEffect, { credential }) => Effect.flatMap((${marker('expression', 'authenticate', 'credential => Effect.succeed(credential)')})(credential), principal => Effect.provideService(httpEffect, CurrentPrincipal, principal)) })
	const authorization = Layer.succeed(${marker('expression', 'authorizationMiddleware', 'AuthorizationMiddleware')}, (httpEffect, { endpoint, group }) => CurrentPrincipal.use(principal => Effect.andThen((${marker('expression', 'authorize', '(_principal: unknown, _endpoint: unknown, _group: unknown) => Effect.void')})(principal, endpoint, group), httpEffect)))
	return Layer.merge(authentication, authorization)
})()`
})

export const SecurityBearerAuthnAuthzLayersTemplate = authnAuthzLayers(
	'SecurityBearerAuthnAuthzLayers', securityRedactedStringType.ts, 'bearer',
	'Builds bearer authentication plus endpoint-aware authorization middleware Layers around a shared principal service.'
)

export const SecurityApiKeyAuthnAuthzLayersTemplate = authnAuthzLayers(
	'SecurityApiKeyAuthnAuthzLayers', securityRedactedStringType.ts, 'apiKey',
	'Builds API-key authentication plus endpoint-aware authorization middleware Layers around a shared principal service.'
)

export const SecurityBasicAuthnAuthzLayersTemplate = authnAuthzLayers(
	'SecurityBasicAuthnAuthzLayers', `{ readonly username: string; readonly password: ${securityRedactedStringType.ts} }`, 'basic',
	'Builds HTTP Basic authentication plus endpoint-aware authorization middleware Layers around a shared principal service.'
)

export const SecuritySessionHttpClientLayerTemplate = defineTemplate({
	modelId: 'SecuritySessionHttpClientLayer', version: VERSION,
	description: 'Decorates a base HttpClient Layer with a scoped shared cookie jar for stateful session authentication.',
	typeParameters: typeParameters(['E', 'Base client Layer error type.'], ['R', 'Base client Layer requirements.']),
	inputs: { base: layerInput('Layer providing HttpClient.', httpClientRequirement, '{{E}}', '{{R}}') },
	output: expressionOutput('Cookie-session HttpClient Layer.', layerType(httpClientRequirement, '{{E}}', '{{R}}')),
	source: `Layer.provide(Layer.effect(HttpClient.HttpClient, Effect.gen(function* () {
	const client = yield* HttpClient.HttpClient
	const cookies = yield* Ref.make(Cookies.empty)
	return HttpClient.withCookiesRef(client, cookies)
})), ${marker('expression', 'base', 'Layer.empty')})`
})

export const SecurityStrictSessionCookieTemplate = defineTemplate({
	modelId: 'SecurityStrictSessionCookie', version: VERSION,
	description: 'Issues a secure HttpOnly API-key session cookie with SameSite=strict and an explicit path.',
	inputs: { security: typedExpressionInput('API-key cookie security scheme.', httpApiSecurityKind('apiKey')), token: typedExpressionInput('Redacted session token.', securityRedactedStringType), path: effectValueInput('Cookie path.', { ts: 'string' }) },
	output: expressionOutput('Effect registering the strict session cookie.', effectType('void', 'never', '{ readonly __httpServerRequest: "HttpServerRequest" }')),
	source: `HttpApiBuilder.securitySetCookie(${marker('expression', 'security', 'HttpApiSecurity.apiKey({ key: "session", in: "cookie" })')}, ${marker('expression', 'token', 'Redacted.make("token")')}, { secure: true, httpOnly: true, sameSite: "strict", path: ${marker('expression', 'path', '"/"')} })`
})

export const SecurityBrowserHardeningHeadersTemplate = defineTemplate({
	modelId: 'SecurityBrowserHardeningHeaders', version: VERSION,
	description: 'Builds a configurable browser-facing security-header record. HSTS and CSP are explicit inputs because their safe values are deployment-specific.',
	inputs: {
		contentSecurityPolicy: effectValueInput('Content-Security-Policy value or undefined.', { ts: 'string | undefined' }),
		strictTransportSecurity: effectValueInput('Strict-Transport-Security value or undefined.', { ts: 'string | undefined' }),
		referrerPolicy: effectValueInput('Referrer-Policy value.', { ts: 'string' }),
		permissionsPolicy: effectValueInput('Permissions-Policy value or undefined.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Security-header record.', { ts: 'Record<string, string | undefined>' }),
	source: `({
	"x-content-type-options": "nosniff",
	"referrer-policy": ${marker('expression', 'referrerPolicy', '"no-referrer"')},
	"content-security-policy": ${marker('expression', 'contentSecurityPolicy', 'undefined')},
	"strict-transport-security": ${marker('expression', 'strictTransportSecurity', 'undefined')},
	"permissions-policy": ${marker('expression', 'permissionsPolicy', 'undefined')}
})`
})

export const SecurityCliConfigOrPromptSecretTemplate = defineTemplate({
	modelId: 'SecurityCliConfigOrPromptSecret', version: VERSION,
	description: 'Reads a Redacted secret from Config and falls back to an interactive masked Prompt when configuration fails.',
	inputs: { config: redactedConfigInput('Primary secret Config.'), prompt: redactedPromptInput('Interactive Redacted prompt.') },
	output: expressionOutput('Config-or-prompt Redacted credential Effect.', effectType(securityRedactedStringType.ts, `${configErrorType} | ${terminalQuitErrorType}`, promptEnvironmentRequirement)),
	source: `Effect.catch(${marker('expression', 'config', 'Config.Redacted("API_TOKEN")')}, () => Prompt.run(${marker('expression', 'prompt', 'Prompt.Password({ message: "API token" })')}))`
})

export const SecurityCliBearerRequestTemplate = defineTemplate({
	modelId: 'SecurityCliBearerRequest', version: VERSION,
	description: 'Obtains a CLI secret from Config or an interactive prompt and applies it as a Bearer token to a request.',
	inputs: { config: redactedConfigInput('Primary bearer-token Config.'), prompt: redactedPromptInput('Masked bearer-token prompt.'), request: httpClientRequestInput('Request to authenticate.') },
	output: expressionOutput('Effect yielding a bearer-authenticated request.', effectType(httpClientRequestType().ts, `${configErrorType} | ${terminalQuitErrorType}`, promptEnvironmentRequirement)),
	source: `Effect.map(Effect.catch(${marker('expression', 'config', 'Config.Redacted("API_TOKEN")')}, () => Prompt.run(${marker('expression', 'prompt', 'Prompt.Password({ message: "API token" })')})), token => HttpClientRequest.bearerToken(${marker('expression', 'request', 'HttpClientRequest.get("https://example.com")')}, token))`
})

export const SecurityCliApiKeyRequestTemplate = defineTemplate({
	modelId: 'SecurityCliApiKeyRequest', version: VERSION,
	description: 'Obtains a CLI secret from Config or an interactive prompt and applies it as an API-key header.',
	inputs: { config: redactedConfigInput('Primary API-key Config.'), prompt: redactedPromptInput('Masked API-key prompt.'), request: httpClientRequestInput('Request to authenticate.'), header: effectValueInput('API-key header name.', { ts: 'string' }) },
	output: expressionOutput('Effect yielding an API-key authenticated request.', effectType(httpClientRequestType().ts, `${configErrorType} | ${terminalQuitErrorType}`, promptEnvironmentRequirement)),
	source: `Effect.map(Effect.catch(${marker('expression', 'config', 'Config.Redacted("API_KEY")')}, () => Prompt.run(${marker('expression', 'prompt', 'Prompt.Password({ message: "API key" })')})), token => HttpClientRequest.setHeader(${marker('expression', 'request', 'HttpClientRequest.get("https://example.com")')}, ${marker('expression', 'header', '"x-api-key"')}, Redacted.value(token)))`
})

export const SecurityChildProcessSecretStdinCommandTemplate = defineTemplate({
	modelId: 'SecurityChildProcessSecretStdinCommand', version: VERSION,
	description: 'Creates a child-process command that sends a Redacted secret through stdin instead of argv or environment variables. The child still receives plaintext bytes.',
	inputs: { command: effectValueInput('Executable.', { ts: 'string' }), args: effectValueInput('Non-secret argument vector.', { ts: 'readonly string[]' }), secret: typedExpressionInput('Redacted secret.', securityRedactedStringType), suffix: effectValueInput('Suffix written after the secret, commonly a newline.', { ts: 'string' }) },
	output: expressionOutput('Command with secret stdin Stream.', childProcessCommandType()),
	source: `ChildProcess.make(${marker('expression', 'command', '"secret-consumer"')}, ${marker('expression', 'args', '[]')}, { stdin: { stream: Stream.fromIterable([new TextEncoder().encode(Redacted.value(${marker('expression', 'secret', 'Redacted.make("secret")')}) + ${marker('expression', 'suffix', '"\\n"')})]), endOnDone: true } })`
})

export const SecurityObservedAuthenticationTemplate = defineTemplate({
	modelId: 'SecurityObservedAuthentication', version: VERSION,
	description: 'Observes authentication success/failure without logging credential contents.',
	typeParameters: typeParameters(['P', 'Principal type.'], ['E', 'Authentication error type.'], ['R', 'Authentication requirements.']),
	inputs: { authenticate: effectSourceInput('Authentication Effect.', effectType('{{P}}', '{{E}}', '{{R}}')), successEvent: effectValueInput('Safe success log value.', { ts: 'unknown' }), failureEvent: effectValueInput('Safe failure log value.', { ts: 'unknown' }) },
	output: expressionOutput('Observed authentication Effect.', effectType('{{P}}', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'authenticate', 'Effect.succeed(undefined)')}.pipe(Effect.tap(() => Effect.logDebug(${marker('expression', 'successEvent', '"auth.success"')})), Effect.tapError(() => Effect.logWarning(${marker('expression', 'failureEvent', '"auth.failure"')})))`
})

export const SecurityObservedAuthorizationTemplate = defineTemplate({
	modelId: 'SecurityObservedAuthorization', version: VERSION,
	description: 'Observes authorization allow/deny outcomes without logging credentials or secret material.',
	typeParameters: typeParameters(['E', 'Authorization error type.'], ['R', 'Authorization requirements.']),
	inputs: { authorize: effectSourceInput('Authorization Effect.', effectType('void', '{{E}}', '{{R}}')), allowEvent: effectValueInput('Safe allow log value.', { ts: 'unknown' }), denyEvent: effectValueInput('Safe deny log value.', { ts: 'unknown' }) },
	output: expressionOutput('Observed authorization Effect.', effectType('void', '{{E}}', '{{R}}')),
	source: `${marker('expression', 'authorize', 'Effect.void')}.pipe(Effect.tap(() => Effect.logDebug(${marker('expression', 'allowEvent', '"authz.allow"')})), Effect.tapError(() => Effect.logWarning(${marker('expression', 'denyEvent', '"authz.deny"')})))`
})

export const SecurityApplicationLayerTemplate = defineTemplate({
	modelId: 'SecurityApplicationLayer', version: VERSION,
	description: 'Combines credential, authentication, authorization, and transport-security Layers into one reusable application security Layer.',
	typeParameters: typeParameters(['P1', 'Credential services.'], ['E1', 'Credential Layer errors.'], ['R1', 'Credential Layer requirements.'], ['P2', 'Authentication services.'], ['E2', 'Authentication Layer errors.'], ['R2', 'Authentication Layer requirements.'], ['P3', 'Authorization services.'], ['E3', 'Authorization Layer errors.'], ['R3', 'Authorization Layer requirements.'], ['P4', 'Transport security services.'], ['E4', 'Transport Layer errors.'], ['R4', 'Transport Layer requirements.']),
	inputs: { credentials: layerInput('Credential Layer.', '{{P1}}', '{{E1}}', '{{R1}}'), authentication: layerInput('Authentication Layer.', '{{P2}}', '{{E2}}', '{{R2}}'), authorization: layerInput('Authorization Layer.', '{{P3}}', '{{E3}}', '{{R3}}'), transport: layerInput('Transport/security middleware Layer.', '{{P4}}', '{{E4}}', '{{R4}}') },
	output: expressionOutput('Combined application security Layer.', layerType('{{P1}} | {{P2}} | {{P3}} | {{P4}}', '{{E1}} | {{E2}} | {{E3}} | {{E4}}', '{{R1}} | {{R2}} | {{R3}} | {{R4}}')),
	source: `Layer.mergeAll(${marker('expression', 'credentials', 'Layer.empty')}, ${marker('expression', 'authentication', 'Layer.empty')}, ${marker('expression', 'authorization', 'Layer.empty')}, ${marker('expression', 'transport', 'Layer.empty')})`
})

export const SecurityServerSourceFileTemplate = defineTemplate({
	modelId: 'SecurityServerSourceFile', version: VERSION,
	description: 'Builds a server-side security module with core secrets, HTTP, HttpApi, and Layer APIs in scope.',
	inputs: { body: statementCollectionInput('Security service declarations, middleware Layers, policies, and server composition.') },
	output: { kind: 'sourceFile', description: 'Complete Effect V4 server security source file.' },
	source: `import { Config, Context, Effect, Layer, Redacted, Ref, Schema } from "effect"
import { Cookies, Headers, HttpClient, HttpClientRequest, HttpMiddleware, HttpServerResponse } from "effect/unstable/http"
import { HttpApiBuilder, HttpApiMiddleware, HttpApiSecurity, OpenApi } from "effect/unstable/httpapi"

${marker('statement', 'body', 'export const SecurityLayer = Layer.empty')}`
})

export const SecurityClientSourceFileTemplate = defineTemplate({
	modelId: 'SecurityClientSourceFile', version: VERSION,
	description: 'Builds a client-side security module for Config-backed credentials, cookie sessions, and generated-client middleware.',
	inputs: { body: statementCollectionInput('Credential providers, client middleware Layers, and authenticated client services.') },
	output: { kind: 'sourceFile', description: 'Complete Effect V4 client security source file.' },
	source: `import { Config, Context, Effect, Layer, Redacted, Ref } from "effect"
import { Cookies, Headers, HttpClient, HttpClientRequest } from "effect/unstable/http"
import { HttpApiMiddleware } from "effect/unstable/httpapi"

${marker('statement', 'body', 'export const SecurityClientLayer = Layer.empty')}`
})

export const SecurityCliSourceFileTemplate = defineTemplate({
	modelId: 'SecurityCliSourceFile', version: VERSION,
	description: 'Builds a CLI security module using Redacted Config/Prompt input and optional safe stdin handoff to child processes.',
	inputs: { body: statementCollectionInput('CLI credential acquisition and authenticated command declarations.') },
	output: { kind: 'sourceFile', description: 'Complete Effect V4 CLI security source file.' },
	source: `import { Config, Effect, Layer, Redacted, Stream } from "effect"
import { Prompt } from "effect/unstable/cli"
import { HttpClientRequest } from "effect/unstable/http"
import { ChildProcess } from "effect/unstable/process"

${marker('statement', 'body', 'export const credential = Config.Redacted("API_TOKEN")')}`
})

export const effectV4SecurityCrossBoundaryTemplateInputs = [
	SecurityConfigCredentialProviderLayerTemplate,
	SecurityConfigBearerClientMiddlewareLayerTemplate,
	SecurityConfigApiKeyClientMiddlewareLayerTemplate,
	SecurityConfigBasicClientMiddlewareLayerTemplate,
	SecurityBearerAuthnAuthzLayersTemplate,
	SecurityApiKeyAuthnAuthzLayersTemplate,
	SecurityBasicAuthnAuthzLayersTemplate,
	SecuritySessionHttpClientLayerTemplate,
	SecurityStrictSessionCookieTemplate,
	SecurityBrowserHardeningHeadersTemplate,
	SecurityCliConfigOrPromptSecretTemplate,
	SecurityCliBearerRequestTemplate,
	SecurityCliApiKeyRequestTemplate,
	SecurityChildProcessSecretStdinCommandTemplate,
	SecurityObservedAuthenticationTemplate,
	SecurityObservedAuthorizationTemplate,
	SecurityApplicationLayerTemplate,
	SecurityServerSourceFileTemplate,
	SecurityClientSourceFileTemplate,
	SecurityCliSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
