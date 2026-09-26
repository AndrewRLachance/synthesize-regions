import {
	defineTemplate,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from '../src/templates.js'
import type { TypeDescriptor } from '../src/templates.js'
import {
	effectConcurrencyInput,
	effectExpressionPolicy,
	effectStructuralType,
	effectType,
	effectValueInput
} from './effect-ts.js'
import { cacheType } from './effect-cache-templates.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	identifierInput,
	marker,
	statementOutput,
	stringInput,
	typeCodeInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'

const requestType = (
	success = 'unknown',
	error = 'unknown',
	requirements = 'never',
	shape = '{}'
): TypeDescriptor => ({
	nominal: 'effect/Request',
	ts: `(${shape}) & { readonly __requestSuccess?: () => ${success}; readonly __requestError?: () => ${error}; readonly __requestRequirements?: () => ${requirements} }`
})

const requestEntryType = (
	success = 'unknown',
	error = 'unknown',
	requirements = 'never',
	shape = '{}'
): TypeDescriptor => ({
	nominal: 'effect/RequestEntry',
	ts: `{ readonly request: ${requestType(success, error, requirements, shape).ts}; readonly __requestEntry?: () => ${shape} }`
})

const requestResolverType = (
	success = 'unknown',
	error = 'unknown',
	requirements = 'never',
	shape = '{}'
): TypeDescriptor => ({
	nominal: 'effect/RequestResolver',
	ts: `{ readonly __requestResolverRequest?: () => ${requestType(success, error, requirements, shape).ts} }`
})

const requestInput = (
	description: string,
	success: string,
	error: string,
	requirements: string,
	shape: string
) => typedExpressionInput(description, requestType(success, error, requirements, shape))

const resolverInput = (
	description: string,
	success: string,
	error: string,
	requirements: string,
	shape: string
) => typedExpressionInput(description, requestResolverType(success, error, requirements, shape))

const resolverOrEffectInput = (
	description: string,
	success: string,
	error: string,
	requestRequirements: string,
	shape: string,
	resolverRequirements: string
) => {
	const resolver = requestResolverType(success, error, requestRequirements, shape)
	const resolverEffect = effectType(resolver.ts, 'never', resolverRequirements)
	return unionPort({
		options: [
			fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: resolver }, description }),
			rawCodePort({ regionKind: 'expression', policy: effectExpressionPolicy, type: resolver, description }),
			fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: resolverEffect }, description }),
			rawCodePort({ regionKind: 'expression', policy: effectExpressionPolicy, type: resolverEffect, description })
		],
		description
	})
}

const numericInput = (
	description: string,
	schema: Readonly<Record<string, unknown>>,
	type: TypeDescriptor = { ts: 'number' }
) => unionPort({
	options: [
		literalPort({ regionKind: 'expression', schema, description }),
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type }, description }),
		rawCodePort({ regionKind: 'expression', policy: effectExpressionPolicy, type, description })
	],
	description
})

const positiveIntegerInput = (description: string) => numericInput(description, {
	type: 'integer', minimum: 1
})

const cacheStrategyInput = (description: string) => literalPort({
	regionKind: 'string',
	schema: { type: 'string', enum: ['lru', 'fifo'] },
	description
})

export const RequestTaggedTypeDeclarationTemplate = defineTemplate({
	modelId: 'RequestTaggedTypeDeclaration',
	version: '1.0.0',
	description: 'Declares an exported tagged Request type with explicit success, error, service-requirement, and payload-field types.',
	inputs: {
		name: identifierInput('Request type name.'),
		successType: typeCodeInput('Request success type.'),
		errorType: typeCodeInput('Request error type.'),
		requirementsType: typeCodeInput('Services required when executing the Request; use never when none are required.'),
		fieldsType: typeCodeInput('Object type containing request payload fields; use {} when the Request has no fields.'),
		tag: typeCodeInput('Request _tag literal type such as "GetValue".')
	},
	output: statementOutput('Exported tagged Request type declaration.'),
	source: `export type ${marker('identifier', 'name', 'GetValue')} = Request.Request<${marker('type', 'successType', 'unknown')}, ${marker('type', 'errorType', 'never')}, ${marker('type', 'requirementsType', 'never')}> & ${marker('type', 'fieldsType', '{}')} & { readonly _tag: ${marker('type', 'tag', '"GetValue"')} }`
})

export const RequestTaggedConstructorDeclarationTemplate = defineTemplate({
	modelId: 'RequestTaggedConstructorDeclaration',
	version: '1.0.0',
	description: 'Declares an exported Request.tagged constructor for an authored Request interface.',
	inputs: {
		name: identifierInput('Constructor constant name.'),
		requestType: typeCodeInput('Authored type extending Request.Request<Value, Error, Requirements>.'),
		tag: stringInput('Request _tag value.')
	},
	output: statementOutput('Exported tagged Request constructor declaration.'),
	source: `export const ${marker('identifier', 'name', 'GetValue')} = Request.tagged<${marker('type', 'requestType', 'unknown')}>(${marker('string', 'tag', '"GetValue"')})`
})

export const RequestResolverFromEffectTemplate = defineTemplate({
	modelId: 'RequestResolverFromEffect',
	version: '1.0.0',
	description: 'Creates a non-batched RequestResolver from an Effectful handler for one Request.Entry.',
	typeParameters: typeParameters(
		['Q', 'Structural fields carried by the Request.'],
		['A', 'Request success type.'],
		['E', 'Request error type.'],
		['RReq', 'Services declared by the Request.']
	),
	inputs: {
		handler: callbackInput('Handler for one Request.Entry.', {
			ts: `(entry: ${requestEntryType('{{A}}', '{{E}}', '{{RReq}}', '{{Q}}').ts}) => ${effectStructuralType('{{A}}', '{{E}}', 'never')}`
		})
	},
	output: expressionOutput('RequestResolver for the Request type.', requestResolverType('{{A}}', '{{E}}', '{{RReq}}', '{{Q}}')),
	source: `RequestResolver.fromEffect(${marker('expression', 'handler', '() => Effect.void')})`
})

export const RequestResolverMakeTemplate = defineTemplate({
	modelId: 'RequestResolverMake',
	version: '1.0.0',
	description: 'Creates a batched RequestResolver whose handler receives a nonempty batch and batch key.',
	typeParameters: typeParameters(
		['Q', 'Structural fields carried by the Request.'],
		['A', 'Request success type.'],
		['E', 'Request error type.'],
		['RReq', 'Services declared by the Request.']
	),
	inputs: {
		handler: callbackInput('Batch handler that completes the supplied entries.', {
			ts: `(entries: readonly [${requestEntryType('{{A}}', '{{E}}', '{{RReq}}', '{{Q}}').ts}, ...Array<${requestEntryType('{{A}}', '{{E}}', '{{RReq}}', '{{Q}}').ts}>], key: unknown) => ${effectStructuralType('void', '{{E}}', 'never')}`
		})
	},
	output: expressionOutput('Batched RequestResolver.', requestResolverType('{{A}}', '{{E}}', '{{RReq}}', '{{Q}}')),
	source: `RequestResolver.make(${marker('expression', 'handler', '() => Effect.void')})`
})

export const RequestCompleteEffectTemplate = defineTemplate({
	modelId: 'RequestCompleteEffect',
	version: '1.0.0',
	description: 'Completes one Request.Entry with an Effect carrying the request result or failure.',
	typeParameters: typeParameters(
		['Q', 'Structural fields carried by the Request.'],
		['A', 'Request success type.'],
		['E', 'Request error type.'],
		['RReq', 'Services declared by the Request.'],
		['R', 'Requirements of the completion Effect.']
	),
	inputs: {
		entry: typedExpressionInput('Request entry to complete.', requestEntryType('{{A}}', '{{E}}', '{{RReq}}', '{{Q}}')),
		result: typedExpressionInput('Completion Effect.', effectType('{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Request completion Effect.', effectType('void', 'never', '{{R}}')),
	source: `Request.completeEffect(${marker('expression', 'entry', 'entry')}, ${marker('expression', 'result', 'Effect.void')})`
})

export const EffectRequestTemplate = defineTemplate({
	modelId: 'EffectRequest',
	version: '1.0.0',
	description: 'Executes a Request with a resolver; the resolver may itself be constructed effectfully from context.',
	typeParameters: typeParameters(
		['Q', 'Structural fields carried by the Request.'],
		['A', 'Request success type.'],
		['E', 'Request error type.'],
		['RReq', 'Services declared by the Request.'],
		['RResolver', 'Requirements needed to construct an Effectful resolver; bind never for a direct resolver.']
	),
	inputs: {
		request: requestInput('Request value to execute.', '{{A}}', '{{E}}', '{{RReq}}', '{{Q}}'),
		resolver: resolverOrEffectInput(
			'Resolver or Effect that constructs the resolver.',
			'{{A}}',
			'{{E}}',
			'{{RReq}}',
			'{{Q}}',
			'{{RResolver}}'
		)
	},
	output: expressionOutput('Request execution Effect.', effectType('{{A}}', '{{E}}', '{{RReq}} | {{RResolver}}')),
	source: `Effect.request(${marker('expression', 'request', 'request')}, ${marker('expression', 'resolver', 'resolver')})`
})

export const RequestResolverWithCacheTemplate = defineTemplate({
	modelId: 'RequestResolverWithCache',
	version: '1.0.0',
	description: 'Builds a bounded LRU-cached RequestResolver whose completed request results are reused by request equality.',
	typeParameters: typeParameters(
		['Q', 'Request fields.'],
		['A', 'Request success type.'],
		['E', 'Request error type.'],
		['RReq', 'Services declared by the Request.']
	),
	inputs: {
		resolver: resolverInput('Resolver to cache.', '{{A}}', '{{E}}', '{{RReq}}', '{{Q}}'),
		capacity: positiveIntegerInput('Maximum number of cached requests.')
	},
	output: expressionOutput(
		'Effect yielding the cached RequestResolver.',
		effectType(requestResolverType('{{A}}', '{{E}}', '{{RReq}}', '{{Q}}').ts, 'never', 'never')
	),
	source: `RequestResolver.withCache(${marker('expression', 'resolver', 'resolver')}, { capacity: ${marker('expression', 'capacity', '256')} })`
})

export const RequestResolverWithCacheStrategyTemplate = defineTemplate({
	modelId: 'RequestResolverWithCacheStrategy',
	version: '1.0.0',
	description: 'Builds a bounded cached RequestResolver with explicit LRU or FIFO eviction.',
	typeParameters: typeParameters(
		['Q', 'Request fields.'],
		['A', 'Request success type.'],
		['E', 'Request error type.'],
		['RReq', 'Services declared by the Request.']
	),
	inputs: {
		resolver: resolverInput('Resolver to cache.', '{{A}}', '{{E}}', '{{RReq}}', '{{Q}}'),
		capacity: positiveIntegerInput('Maximum number of cached requests.'),
		strategy: cacheStrategyInput('Cache eviction strategy.')
	},
	output: expressionOutput(
		'Effect yielding the cached RequestResolver.',
		effectType(requestResolverType('{{A}}', '{{E}}', '{{RReq}}', '{{Q}}').ts, 'never', 'never')
	),
	source: `RequestResolver.withCache(${marker('expression', 'resolver', 'resolver')}, { capacity: ${marker('expression', 'capacity', '256')}, strategy: ${marker('string', 'strategy', '"lru"')} })`
})

const requestResolverAsCacheTemplate = (
	modelId: 'RequestResolverAsCache' | 'RequestResolverAsCacheWithTTL',
	withTTL: boolean
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description: withTTL
		? 'Exposes a RequestResolver as a first-class Cache with bounded capacity and result-sensitive time-to-live expiry.'
		: 'Exposes a RequestResolver as a first-class bounded Cache.',
	typeParameters: typeParameters(
		['Q', 'Request fields.'],
		['A', 'Request success type.'],
		['E', 'Request error type.'],
		['RReq', 'Services declared by the Request and required by cache lookups.']
	),
	inputs: {
		resolver: resolverInput('Resolver exposed through the Cache.', '{{A}}', '{{E}}', '{{RReq}}', '{{Q}}'),
		capacity: positiveIntegerInput('Maximum Cache capacity.'),
		...(withTTL ? {
			timeToLive: callbackInput('TTL function receiving the completed request result and request value.', {
				ts: `(exit: unknown, request: ${requestType('{{A}}', '{{E}}', '{{RReq}}', '{{Q}}').ts}) => unknown`
			})
		} : {})
	},
	output: expressionOutput(
		'Effect yielding a Cache keyed by Request values.',
		effectType(
			cacheType(requestType('{{A}}', '{{E}}', '{{RReq}}', '{{Q}}').ts, '{{A}}', '{{E}}', '{{RReq}}').ts,
			'never',
			'never'
		)
	),
	source: withTTL
		? `RequestResolver.asCache(${marker('expression', 'resolver', 'resolver')}, { capacity: ${marker('expression', 'capacity', '256')}, timeToLive: ${marker('expression', 'timeToLive', '() => 1000')} })`
		: `RequestResolver.asCache(${marker('expression', 'resolver', 'resolver')}, { capacity: ${marker('expression', 'capacity', '256')} })`
})

export const RequestResolverAsCacheTemplate = requestResolverAsCacheTemplate('RequestResolverAsCache', false)
export const RequestResolverAsCacheWithTTLTemplate = requestResolverAsCacheTemplate('RequestResolverAsCacheWithTTL', true)

export const EffectForEachBatchedTemplate = defineTemplate({
	modelId: 'EffectForEachBatched',
	version: '1.0.0',
	description: 'Traverses an iterable with request batching enabled so compatible Effect.request operations can be grouped.',
	typeParameters: typeParameters(['A', 'Input element type.'], ['B', 'Result element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		iterable: effectValueInput('Iterable input.', { ts: 'Iterable<{{A}}>' }),
		body: callbackInput('Effect-producing element callback.', effectReturningCallbackType('value: {{A}}, index: number', '{{B}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Batched traversal Effect.', effectType('ReadonlyArray<{{B}}>', '{{E}}', '{{R}}')),
	source: `Effect.forEach(${marker('expression', 'iterable', '[]')}, ${marker('expression', 'body', 'value => Effect.succeed(value)')}, { batching: true })`
})

export const EffectForEachBatchedConcurrentTemplate = defineTemplate({
	modelId: 'EffectForEachBatchedConcurrent',
	version: '1.0.0',
	description: 'Traverses an iterable with request batching enabled and explicit traversal concurrency.',
	typeParameters: typeParameters(['A', 'Input element type.'], ['B', 'Result element type.'], ['E', 'Error type.'], ['R', 'Requirements.']),
	inputs: {
		iterable: effectValueInput('Iterable input.', { ts: 'Iterable<{{A}}>' }),
		body: callbackInput('Effect-producing element callback.', effectReturningCallbackType('value: {{A}}, index: number', '{{B}}', '{{E}}', '{{R}}')),
		concurrency: effectConcurrencyInput('Traversal concurrency.')
	},
	output: expressionOutput('Batched concurrent traversal Effect.', effectType('ReadonlyArray<{{B}}>', '{{E}}', '{{R}}')),
	source: `Effect.forEach(${marker('expression', 'iterable', '[]')}, ${marker('expression', 'body', 'value => Effect.succeed(value)')}, { batching: true, concurrency: ${marker('expression', 'concurrency', '1')} })`
})

export const effectBatchingGraphTemplateInputs = [
	RequestTaggedTypeDeclarationTemplate,
	RequestTaggedConstructorDeclarationTemplate,
	RequestResolverFromEffectTemplate,
	RequestResolverMakeTemplate,
	RequestCompleteEffectTemplate,
	EffectRequestTemplate,
	RequestResolverWithCacheTemplate,
	RequestResolverWithCacheStrategyTemplate,
	RequestResolverAsCacheTemplate,
	RequestResolverAsCacheWithTTLTemplate,
	EffectForEachBatchedTemplate,
	EffectForEachBatchedConcurrentTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
