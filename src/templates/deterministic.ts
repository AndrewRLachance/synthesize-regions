/** Locale-independent UTF-16 code-unit ordering used by every persisted identity. */
export function compareCodeUnits(left: string, right: string): number {
	if (left === right) return 0
	const length = Math.min(left.length, right.length)
	for (let index = 0; index < length; index += 1) {
		const difference = left.charCodeAt(index) - right.charCodeAt(index)
		if (difference !== 0) return difference < 0 ? -1 : 1
	}
	return left.length < right.length ? -1 : 1
}

/** Deterministically sort a copy of a string collection. */
export function sortedCodeUnits(values: readonly string[]): string[] {
	return [...values].sort(compareCodeUnits)
}

/**
 * Small insertion-ordered LRU with deterministic eviction.
 *
 * A read refreshes an entry. This is intentionally sufficient for validation
 * caches whose values are immutable and whose eviction must not affect output.
 */
export class BoundedLruMap<K, V> {
	readonly #entries = new Map<K, V>()

	constructor(
		readonly capacity: number,
		readonly onEvict?: (key: K, value: V) => void
	) {
		if (!Number.isSafeInteger(capacity) || capacity < 1) {
			throw new RangeError('LRU capacity must be a positive safe integer.')
		}
	}

	get size(): number {
		return this.#entries.size
	}

	get(key: K): V | undefined {
		const value = this.#entries.get(key)
		if (value === undefined) return undefined
		this.#entries.delete(key)
		this.#entries.set(key, value)
		return value
	}

	set(key: K, value: V): void {
		const replaced = this.#entries.get(key)
		if (replaced !== undefined) {
			this.#entries.delete(key)
			this.onEvict?.(key, replaced)
		}
		this.#entries.set(key, value)
		while (this.#entries.size > this.capacity) {
			const oldest = this.#entries.keys().next().value as K | undefined
			if (oldest === undefined) break
			const evicted = this.#entries.get(oldest)!
			this.#entries.delete(oldest)
			this.onEvict?.(oldest, evicted)
		}
	}
}
