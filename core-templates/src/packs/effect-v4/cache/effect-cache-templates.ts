import {
	defineTemplate,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from 'synthesize-regions'
import type { TypeDescriptor } from 'synthesize-regions'
import {
	effectDurationInput,
	effectExpressionPolicy,
	effectSourceInput,
	effectStructuralType,
	effectType
} from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'

export const cacheType = (
	key = 'unknown',
	value = 'unknown',
	error = 'unknown',
	requirements = 'never'
): TypeDescriptor => ({
	nominal: 'effect/Cache',
	ts: `{ readonly __cacheKey?: () => ${key}; readonly __cacheValue?: () => ${value}; readonly __cacheError?: () => ${error}; readonly __cacheRequirements?: () => ${requirements} }`
})

const cacheInput = (
	description: string,
	key = 'unknown',
	value = 'unknown',
	error = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, cacheType(key, value, error, requirements))

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

const cacheMakeTemplate = (
	modelId: 'CacheMake' | 'CacheMakeWithTTL',
	withTTL: boolean
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description: withTTL
		? 'Creates an Effect Cache with bounded capacity, an explicit time-to-live, and an Effectful lookup.'
		: 'Creates an Effect Cache with bounded capacity and an Effectful lookup.',
	typeParameters: typeParameters(
		['K', 'Cache key type.'],
		['V', 'Cached value type.'],
		['E', 'Lookup error type.'],
		['R', 'Lookup requirements captured while creating the Cache.']
	),
	inputs: {
		capacity: positiveIntegerInput('Maximum cache capacity.'),
		...(withTTL ? { timeToLive: effectDurationInput('Time-to-live for loaded values.') } : {}),
		lookup: callbackInput(
			'Effectful lookup used when a key is not already cached.',
			{ ts: `(key: {{K}}) => ${effectStructuralType('{{V}}', '{{E}}', '{{R}}')}` }
		)
	},
	output: expressionOutput(
		'Effect that creates the Cache.',
		effectType(cacheType('{{K}}', '{{V}}', '{{E}}', 'never').ts, 'never', '{{R}}')
	),
	source: withTTL
		? `Cache.make({ capacity: ${marker('expression', 'capacity', '100')}, timeToLive: ${marker('expression', 'timeToLive', 'Duration.infinity')}, lookup: ${marker('expression', 'lookup', 'key => Effect.succeed(key)')} })`
		: `Cache.make({ capacity: ${marker('expression', 'capacity', '100')}, lookup: ${marker('expression', 'lookup', 'key => Effect.succeed(key)')} })`
})

export const CacheMakeTemplate = cacheMakeTemplate('CacheMake', false)
export const CacheMakeWithTTLTemplate = cacheMakeTemplate('CacheMakeWithTTL', true)

export const CacheGetTemplate = defineTemplate({
	modelId: 'CacheGet',
	version: '1.0.0',
	description: 'Returns a cached value for a key or computes, stores, and returns it through the Cache lookup.',
	typeParameters: typeParameters(
		['K', 'Cache key type.'],
		['V', 'Cached value type.'],
		['E', 'Lookup error type.'],
		['R', 'Requirements needed when cache lookups retain services.']
	),
	inputs: {
		cache: cacheInput('Cache used for the lookup.', '{{K}}', '{{V}}', '{{E}}', '{{R}}'),
		key: valueInput('Cache lookup key.', { ts: '{{K}}' })
	},
	output: expressionOutput('Cache lookup Effect.', effectType('{{V}}', '{{E}}', '{{R}}')),
	source: `Cache.get(${marker('expression', 'cache', 'cache')}, ${marker('expression', 'key', 'undefined')})`
})

export const CacheRefreshTemplate = defineTemplate({
	modelId: 'CacheRefresh',
	version: '1.0.0',
	description: 'Forces recomputation of a cached key and returns the refreshed value.',
	typeParameters: typeParameters(
		['K', 'Cache key type.'],
		['V', 'Cached value type.'],
		['E', 'Lookup error type.'],
		['R', 'Requirements needed when cache lookups retain services.']
	),
	inputs: {
		cache: cacheInput('Cache to refresh.', '{{K}}', '{{V}}', '{{E}}', '{{R}}'),
		key: valueInput('Key to recompute.', { ts: '{{K}}' })
	},
	output: expressionOutput('Cache refresh Effect.', effectType('{{V}}', '{{E}}', '{{R}}')),
	source: `Cache.refresh(${marker('expression', 'cache', 'cache')}, ${marker('expression', 'key', 'undefined')})`
})

export const CacheSizeTemplate = defineTemplate({
	modelId: 'CacheSize',
	version: '1.0.0',
	description: 'Reads the current approximate Cache size.',
	typeParameters: typeParameters(['K', 'Cache key type.'], ['V', 'Cached value type.'], ['E', 'Lookup error type.'], ['R', 'Cache lookup requirements.']),
	inputs: { cache: cacheInput('Cache to inspect.', '{{K}}', '{{V}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Cache size Effect.', effectType('number', 'never', 'never')),
	source: `Cache.size(${marker('expression', 'cache', 'cache')})`
})

export const CacheHasTemplate = defineTemplate({
	modelId: 'CacheHas',
	version: '1.0.0',
	description: 'Checks whether a key currently has a value in the Cache.',
	typeParameters: typeParameters(['K', 'Cache key type.'], ['V', 'Cached value type.'], ['E', 'Lookup error type.'], ['R', 'Cache lookup requirements.']),
	inputs: {
		cache: cacheInput('Cache to inspect.', '{{K}}', '{{V}}', '{{E}}', '{{R}}'),
		key: valueInput('Key to check.', { ts: '{{K}}' })
	},
	output: expressionOutput('Cache membership Effect.', effectType('boolean', 'never', 'never')),
	source: `Cache.has(${marker('expression', 'cache', 'cache')}, ${marker('expression', 'key', 'undefined')})`
})

export const CacheInvalidateTemplate = defineTemplate({
	modelId: 'CacheInvalidate',
	version: '1.0.0',
	description: 'Evicts one key from a Cache.',
	typeParameters: typeParameters(['K', 'Cache key type.'], ['V', 'Cached value type.'], ['E', 'Lookup error type.'], ['R', 'Cache lookup requirements.']),
	inputs: {
		cache: cacheInput('Cache to mutate.', '{{K}}', '{{V}}', '{{E}}', '{{R}}'),
		key: valueInput('Key to evict.', { ts: '{{K}}' })
	},
	output: expressionOutput('Cache invalidation Effect.', effectType('void', 'never', 'never')),
	source: `Cache.invalidate(${marker('expression', 'cache', 'cache')}, ${marker('expression', 'key', 'undefined')})`
})

export const CacheInvalidateAllTemplate = defineTemplate({
	modelId: 'CacheInvalidateAll',
	version: '1.0.0',
	description: 'Evicts all values from a Cache.',
	typeParameters: typeParameters(['K', 'Cache key type.'], ['V', 'Cached value type.'], ['E', 'Lookup error type.'], ['R', 'Cache lookup requirements.']),
	inputs: { cache: cacheInput('Cache to clear.', '{{K}}', '{{V}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Cache-wide invalidation Effect.', effectType('void', 'never', 'never')),
	source: `Cache.invalidateAll(${marker('expression', 'cache', 'cache')})`
})


export const CacheKeysTemplate = defineTemplate({
	modelId: 'CacheKeys',
	version: '1.0.0',
	description: 'Retrieves the active keys currently represented in a Cache.',
	typeParameters: typeParameters(['K', 'Cache key type.'], ['V', 'Cached value type.'], ['E', 'Lookup error type.'], ['R', 'Cache lookup requirements.']),
	inputs: { cache: cacheInput('Cache to inspect.', '{{K}}', '{{V}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Cache key inspection Effect.', effectType('Iterable<{{K}}>', 'never', 'never')),
	source: `Cache.keys(${marker('expression', 'cache', 'cache')})`
})

export const CacheEntriesTemplate = defineTemplate({
	modelId: 'CacheEntries',
	version: '1.0.0',
	description: 'Retrieves successfully resolved active key-value entries from a Cache.',
	typeParameters: typeParameters(['K', 'Cache key type.'], ['V', 'Cached value type.'], ['E', 'Lookup error type.'], ['R', 'Cache lookup requirements.']),
	inputs: { cache: cacheInput('Cache to inspect.', '{{K}}', '{{V}}', '{{E}}', '{{R}}') },
	output: expressionOutput('Cache entry inspection Effect.', effectType('Iterable<readonly [{{K}}, {{V}}]>', 'never', 'never')),
	source: `Cache.entries(${marker('expression', 'cache', 'cache')})`
})

export const EffectCachedTemplate = defineTemplate({
	modelId: 'EffectCached',
	version: '1.0.0',
	description: 'Creates an Effect that yields a lazily evaluated Effect whose first result is cached and reused.',
	typeParameters: typeParameters(['A', 'Cached success type.'], ['E', 'Cached error type.'], ['R', 'Cached Effect requirements.']),
	inputs: { source: effectSourceInput('Effect whose result is cached.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput(
		'Effect yielding the cached Effect.',
		effectType(effectStructuralType('{{A}}', '{{E}}', '{{R}}'), 'never', 'never')
	),
	source: `Effect.cached(${marker('expression', 'source', 'Effect.void')})`
})

export const EffectCachedWithTTLTemplate = defineTemplate({
	modelId: 'EffectCachedWithTTL',
	version: '1.0.0',
	description: 'Creates an Effect that yields a lazily evaluated cached Effect whose cached result expires after a TTL.',
	typeParameters: typeParameters(['A', 'Cached success type.'], ['E', 'Cached error type.'], ['R', 'Cached Effect requirements.']),
	inputs: {
		source: effectSourceInput('Effect whose result is cached.', effectType('{{A}}', '{{E}}', '{{R}}')),
		timeToLive: effectDurationInput('Duration for which the cached result remains valid.')
	},
	output: expressionOutput(
		'Effect yielding the TTL-cached Effect.',
		effectType(effectStructuralType('{{A}}', '{{E}}', '{{R}}'), 'never', 'never')
	),
	source: `Effect.cachedWithTTL(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'timeToLive', '1000')})`
})

export const EffectCachedInvalidateWithTTLTemplate = defineTemplate({
	modelId: 'EffectCachedInvalidateWithTTL',
	version: '1.0.0',
	description: 'Creates a TTL-cached Effect together with an Effect that invalidates the cached value on demand.',
	typeParameters: typeParameters(['A', 'Cached success type.'], ['E', 'Cached error type.'], ['R', 'Cached Effect requirements.']),
	inputs: {
		source: effectSourceInput('Effect whose result is cached.', effectType('{{A}}', '{{E}}', '{{R}}')),
		timeToLive: effectDurationInput('Duration for which the cached result remains valid.')
	},
	output: expressionOutput(
		'Effect yielding the cached Effect and its invalidation Effect.',
		effectType(
			`readonly [${effectStructuralType('{{A}}', '{{E}}', '{{R}}')}, ${effectStructuralType('void', 'never', 'never')}]`,
			'never',
			'never'
		)
	),
	source: `Effect.cachedInvalidateWithTTL(${marker('expression', 'source', 'Effect.void')}, ${marker('expression', 'timeToLive', '1000')})`
})

export const effectCacheGraphTemplateInputs = [
	CacheMakeTemplate,
	CacheMakeWithTTLTemplate,
	CacheGetTemplate,
	CacheRefreshTemplate,
	CacheSizeTemplate,
	CacheHasTemplate,
	CacheInvalidateTemplate,
	CacheInvalidateAllTemplate,
	CacheKeysTemplate,
	CacheEntriesTemplate,
	EffectCachedTemplate,
	EffectCachedWithTTLTemplate,
	EffectCachedInvalidateWithTTLTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
