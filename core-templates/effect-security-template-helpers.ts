import type { TypeDescriptor } from '../src/templates.js'
import { effectStructuralType } from './effect-ts.js'
import { nominalType, typedExpressionInput, type TypeDescriptorWithTs } from './effect-template-helpers.js'
import { redactedType } from './effect-data-type-template-helpers.js'

export const securityRedactedStringType = redactedType('string')

export const securityHeadersType = (): TypeDescriptor => nominalType('effect/unstable/http/Headers')
export const securityCookiesType = (): TypeDescriptorWithTs => nominalType('effect/http/Cookies')
export const securityHttpMiddlewareType = (): TypeDescriptor => nominalType('effect/unstable/http/HttpMiddleware')

export const securityCredentialProviderType = (error = 'never'): TypeDescriptor => ({
	nominal: 'effect-template/SecurityCredentialProvider',
	ts: `{ readonly get: ${effectStructuralType(securityRedactedStringType.ts, error, 'never')} }`
})

export const securityAuthenticationServiceType = (
	credential = 'unknown',
	principal = 'unknown',
	error = 'unknown',
	requirements = 'never'
): TypeDescriptor => ({
	nominal: 'effect-template/SecurityAuthenticationService',
	ts: `{ readonly authenticate: (credential: ${credential}) => ${effectStructuralType(principal, error, requirements)} }`
})

export const securityAuthorizationServiceType = (
	principal = 'unknown',
	action = 'unknown',
	resource = 'unknown',
	error = 'unknown',
	requirements = 'never'
): TypeDescriptor => ({
	nominal: 'effect-template/SecurityAuthorizationService',
	ts: `{ readonly authorize: (principal: ${principal}, action: ${action}, resource: ${resource}) => ${effectStructuralType('void', error, requirements)} }`
})

export const securityCredentialProviderInput = (description: string, error = 'never') =>
	typedExpressionInput(description, securityCredentialProviderType(error))

export const securityAuthenticationServiceInput = (
	description: string,
	credential = 'unknown',
	principal = 'unknown',
	error = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, securityAuthenticationServiceType(credential, principal, error, requirements))

export const securityAuthorizationServiceInput = (
	description: string,
	principal = 'unknown',
	action = 'unknown',
	resource = 'unknown',
	error = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, securityAuthorizationServiceType(principal, action, resource, error, requirements))
