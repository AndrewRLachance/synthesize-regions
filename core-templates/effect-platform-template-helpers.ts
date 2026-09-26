import { defineTemplate } from '../src/templates.js'
import { effectDurationInput, effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	layerType,
	marker,
	nominalType,
	statementCollectionInput,
	statementOutput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'

const platformError = '{ readonly __platformError: "PlatformError" }'
const terminalQuitError = '{ readonly __terminalQuitError: "QuitError" }'
const scope = '{ readonly __effectScopeRequirement: "Scope" }'
const pathService = '{ readonly __pathServiceRequirement: "Path" }'
const fileSystemService = '{ readonly __fileSystemServiceRequirement: "FileSystem" }'
const terminalService = '{ readonly __terminalServiceRequirement: "Terminal" }'

export const pathServiceType = () => nominalType('effect/Path.Path')
export const fileSystemServiceType = () => nominalType('effect/FileSystem.FileSystem')
export const terminalServiceType = () => nominalType('effect/Terminal.Terminal')
export const loggerType = () => nominalType('effect/Logger')

export const pathRequirement = pathService
export const fileSystemRequirement = fileSystemService
export const terminalRequirement = terminalService

export const platformPathInput = (description = 'Filesystem path.') =>
	effectValueInput(description, { ts: 'string' })

export const optionalPlatformOptionsInput = (description = 'Optional operation options.') =>
	effectValueInput(description, { ts: 'unknown' })

export const platformEffect = (
	success = 'unknown',
	error = platformError,
	requirements = 'never'
) => effectType(success, error, requirements)

export const platformScopeRequirement = scope
export const platformErrorType = platformError
export const terminalQuitErrorType = terminalQuitError

// Re-export the shared helpers used by the platform template modules.
export {
	defineTemplate,
	effectDurationInput,
	effectSourceInput,
	effectType,
	effectValueInput,
	expressionOutput,
	layerType,
	marker,
	nominalType,
	statementCollectionInput,
	statementOutput,
	typeParameters,
	typedExpressionInput,
	valueInput
}
export type { AnyEffectFamilyTemplateDefinitionInput }
