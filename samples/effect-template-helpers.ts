import {
	fragmentCollectionPort,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from '../src/templates.js'
import type {
	InputPort,
	OutputPort,
	TemplateTypeParameterDefinition,
	TypeDescriptor
} from '../src/templates.js'
import type { GraphTemplateDefinitionInput } from '../src/templates/definition.js'
import {
	effectCallbackInput,
	effectCallbackPolicy,
	effectExpressionPolicy,
	effectStructuralType,
	effectValueInput
} from './effect-ts.js'

export type AnyEffectFamilyTemplateDefinitionInput = GraphTemplateDefinitionInput<
	string,
	Record<string, InputPort>,
	OutputPort,
	Record<string, TemplateTypeParameterDefinition> | undefined
>

export const typeParameter = (description: string): TemplateTypeParameterDefinition => ({
	description,
	constraint: { ts: 'unknown' }
})

export const typeParameters = (
	...entries: ReadonlyArray<readonly [string, string]>
): Record<string, TemplateTypeParameterDefinition> =>
	Object.fromEntries(entries.map(([name, description]) => [name, typeParameter(description)]))

export const marker = (
	kind: 'expression' | 'identifier' | 'statement' | 'string' | 'type' | 'sourceFile',
	id: string,
	fallback: string
): string => `/** @TYPE ${kind} id=${id} **/${fallback}/** @END **/`

export const expressionOutput = (description: string, type?: TypeDescriptor) => ({
	kind: 'expression' as const,
	...(type ? { type } : {}),
	description
})

export const statementOutput = (description: string) => ({
	kind: 'statement' as const,
	description
})

export const nominalType = (
	nominal: string,
	phantoms: Readonly<Record<string, string>> = {}
): TypeDescriptor => ({
	nominal,
	ts: `{ readonly pipe: () => unknown${Object.entries(phantoms)
		.map(([name, type]) => `; readonly __${name}?: () => ${type}`)
		.join('')} }`
})

export const typedExpressionInput = (description: string, type: TypeDescriptor) => unionPort({
	options: [
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type }, description }),
		rawCodePort({ regionKind: 'expression', policy: effectExpressionPolicy, type, description })
	],
	description
})

export const callbackInput = effectCallbackInput
export const valueInput = effectValueInput

export const identifierInput = (description: string) => literalPort({
	regionKind: 'identifier',
	schema: { type: 'string', pattern: '^[$A-Za-z_][$A-Za-z0-9_]*$' },
	description
})

export const stringInput = (description: string) => literalPort({
	regionKind: 'string',
	schema: { type: 'string', minLength: 1 },
	description
})

export const typeCodeInput = (description: string) => rawCodePort({
	regionKind: 'type',
	policy: {
		description: 'Self-contained TypeScript type expression. Module loading and ambient escape hatches are rejected.',
		maxLength: 900,
		allowNewlines: false,
		forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval']
	},
	description
})

export const statementCollectionInput = (description: string, minItems = 1) => fragmentCollectionPort({
	regionKind: 'statement',
	accepts: { outputKind: 'statement' },
	minItems,
	separator: '\n',
	description
})

export const rawCallbackInput = (description: string, type?: TypeDescriptor) => rawCodePort({
	regionKind: 'expression',
	policy: effectCallbackPolicy,
	...(type ? { type } : {}),
	description
})

export const schemaType = (decoded = 'unknown', encoded = 'unknown', requirements = 'never') =>
	nominalType('effect/Schema', { schemaDecoded: decoded, schemaEncoded: encoded, schemaRequirements: requirements })

export const schemaPropertySignatureType = (decoded = 'unknown', encoded = 'unknown', requirements = 'never') =>
	nominalType('effect/SchemaPropertySignature', {
		schemaPropertyDecoded: decoded,
		schemaPropertyEncoded: encoded,
		schemaPropertyRequirements: requirements
	})

export const effectReturningCallbackType = (
	parameters: string,
	success = 'unknown',
	error = 'unknown',
	requirements = 'unknown'
): TypeDescriptor => ({ ts: `(${parameters}) => ${effectStructuralType(success, error, requirements)}` })

export const tagType = (identifier = 'unknown', service = 'unknown') =>
	nominalType('effect/ContextTag', { tagIdentifier: identifier, tagService: service })

export const layerType = (provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	nominalType('effect/Layer', { layerProvided: provided, layerError: error, layerRequirements: requirements })

export const scheduleType = (output = 'unknown', input = 'unknown', requirements = 'never') =>
	nominalType('effect/Schedule', { scheduleOutput: output, scheduleInput: input, scheduleRequirements: requirements })

export const fiberType = (success = 'unknown', error = 'unknown') =>
	nominalType('effect/Fiber', { fiberSuccess: success, fiberError: error })

export const configType = (value = 'unknown') => nominalType('effect/Config', { configValue: value })
export const refType = (value = 'unknown') => nominalType('effect/Ref', { refValue: value })
export const deferredType = (success = 'unknown', error = 'unknown') =>
	nominalType('effect/Deferred', { deferredSuccess: success, deferredError: error })
export const queueType = (value = 'unknown') => nominalType('effect/Queue', { queueValue: value })
export const pubSubType = (value = 'unknown') => nominalType('effect/PubSub', { pubSubValue: value })
export const streamType = (success = 'unknown', error = 'unknown', requirements = 'unknown') =>
	nominalType('effect/Stream', { streamSuccess: success, streamError: error, streamRequirements: requirements })
export const metricType = (input = 'unknown', output = 'unknown') =>
	nominalType('effect/Metric', { metricInput: input, metricOutput: output })
export const managedRuntimeType = (requirements = 'unknown', error = 'unknown') =>
	nominalType('effect/ManagedRuntime', { runtimeRequirements: requirements, runtimeError: error })
