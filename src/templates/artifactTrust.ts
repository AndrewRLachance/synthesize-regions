import { createHash } from 'node:crypto'

import { canonicalizeJson } from './artifactIdentity.js'
import type { TemplateArtifact } from './graphTypes.js'

/** Content fingerprints bound to artifacts validated and frozen by this process. */
const libraryOwnedTemplateArtifacts = new WeakMap<object, string>()

function fingerprint(artifact: TemplateArtifact): string {
	return createHash('sha256').update(canonicalizeJson(artifact), 'utf8').digest('hex')
}

/** Deep-freeze one JSON-shaped contract without invoking caller-owned accessors. */
function deepFreezeJson(value: unknown, seen = new Set<object>()): void {
	if (typeof value !== 'object' || value === null || seen.has(value)) return
	seen.add(value)
	for (const key of Object.keys(value)) {
		const descriptor = Object.getOwnPropertyDescriptor(value, key)
		if (!descriptor || !('value' in descriptor)) {
			throw new TypeError(`Template artifacts cannot contain accessor property ${JSON.stringify(key)}.`)
		}
		deepFreezeJson(descriptor.value, seen)
	}
	Object.freeze(value)
}

/**
 * Freeze and bind an artifact to its complete canonical content.
 *
 * Object identity alone is never authority: every fast-path lookup recomputes
 * the canonical fingerprint and therefore fails closed for proxies or legacy
 * values that could somehow be changed after validation.
 */
export function brandTemplateArtifact<T extends TemplateArtifact>(artifact: T): T {
	const contentFingerprint = fingerprint(artifact)
	deepFreezeJson(artifact)
	libraryOwnedTemplateArtifacts.set(artifact, contentFingerprint)
	return artifact
}

/** Return whether an artifact is frozen and still matches its validated bytes. */
export function isLibraryOwnedTemplateArtifact(artifact: TemplateArtifact): boolean {
	const expected = libraryOwnedTemplateArtifacts.get(artifact)
	if (expected === undefined || !Object.isFrozen(artifact)) return false
	try {
		return fingerprint(artifact) === expected
	} catch {
		return false
	}
}
