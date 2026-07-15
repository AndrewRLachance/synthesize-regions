import { createHash } from 'node:crypto'

import type { SynthesisGraph } from './graphCoreTypes.js'

const IDENTITY_VERSION = 1
const COMPILATION_SCOPE_IDENTITY_VERSION = 2

/** Return whether a value is an ordinary JSON object without custom behavior. */
function isPlainJsonObject(value: object): value is Record<string, unknown> {
	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

/**
 * Serialize a JSON-like value with stable object-key ordering.
 *
 * Arrays retain their authored order. Unsupported JSON values fail explicitly
 * instead of being silently omitted or coerced, which keeps graph identities
 * reproducible across serialization round trips.
 */
export function canonicalizeJson(value: unknown): string {
	const ancestors = new Set<object>()

	function serialize(current: unknown, path: string): string {
		if (current === null) return 'null'

		switch (typeof current) {
			case 'string':
			case 'boolean':
				return JSON.stringify(current)
			case 'number':
				if (!Number.isFinite(current)) {
					throw new TypeError(`Cannot canonicalize non-finite number at ${path}.`)
				}
				return JSON.stringify(current)
			case 'undefined':
			case 'bigint':
			case 'symbol':
			case 'function':
				throw new TypeError(`Cannot canonicalize ${typeof current} at ${path}.`)
			case 'object':
				break
		}

		if (ancestors.has(current)) {
			throw new TypeError(`Cannot canonicalize cyclic value at ${path}.`)
		}
		ancestors.add(current)

		try {
			if (Array.isArray(current)) {
				const items: string[] = []
				for (let index = 0; index < current.length; index += 1) {
					if (!Object.prototype.hasOwnProperty.call(current, index)) {
						throw new TypeError(`Cannot canonicalize sparse array entry at ${path}[${index}].`)
					}
					items.push(serialize(current[index], `${path}[${index}]`))
				}
				return `[${items.join(',')}]`
			}

			if (!isPlainJsonObject(current)) {
				throw new TypeError(`Cannot canonicalize non-plain object at ${path}.`)
			}

			const symbolKeys = Object.getOwnPropertySymbols(current)
				.filter(symbol => Object.prototype.propertyIsEnumerable.call(current, symbol))
			if (symbolKeys.length > 0) {
				throw new TypeError(`Cannot canonicalize symbol-keyed property at ${path}.`)
			}

			const properties = Object.keys(current)
				.sort()
				.map(key => `${JSON.stringify(key)}:${serialize(current[key], `${path}.${key}`)}`)
			return `{${properties.join(',')}}`
		} finally {
			ancestors.delete(current)
		}
	}

	return serialize(value, '$')
}

/** Canonically serialize a synthesis graph for deterministic identity hashing. */
export function canonicalizeSynthesisGraph(graph: SynthesisGraph): string {
	return canonicalizeJson({
		...graph,
		nodes: [...graph.nodes].sort((left, right) => {
			if (left.id !== right.id) return left.id < right.id ? -1 : 1
			if (left.templateId !== right.templateId) return left.templateId < right.templateId ? -1 : 1
			return 0
		})
	})
}

/** Hash an identity payload with the full SHA-256 output. */
function sha256(payload: string): string {
	return createHash('sha256').update(payload, 'utf8').digest('hex')
}

/**
 * Create a reproducible opaque scope for one graph compilation.
 *
 * An explicit scope distinguishes separate jobs that compile the same graph.
 * The graph identity remains part of the payload so reusing a scope for a
 * different graph cannot alias its unresolved-input IDs. Both catalog
 * identities are included so implementation-only template changes also
 * invalidate partial-artifact input identities.
 */
export function createCompilationScope(
	graph: SynthesisGraph,
	explicitScope?: string,
	catalogDigest?: string,
	catalogManifestDigest?: string
): string {
	const payload = canonicalizeJson([
		'graph-compilation-scope',
		COMPILATION_SCOPE_IDENTITY_VERSION,
		explicitScope ?? null,
		catalogDigest ?? null,
		catalogManifestDigest ?? null,
		canonicalizeSynthesisGraph(graph)
	])
	return `s${COMPILATION_SCOPE_IDENTITY_VERSION}_${sha256(payload)}`
}

/**
 * Create a deterministic opaque ID for one unresolved graph-template input.
 *
 * The `u<version>_<hex>` representation satisfies the replacement marker ID
 * grammar (`[A-Za-z_][A-Za-z0-9_]*`) without lossy sanitization.
 */
export function createUnresolvedInputId(
	compilationScope: string,
	nodeId: string,
	inputName: string
): string {
	const payload = canonicalizeJson([
		'unresolved-template-input',
		IDENTITY_VERSION,
		compilationScope,
		nodeId,
		inputName
	])
	return `u${IDENTITY_VERSION}_${sha256(payload)}`
}
