import type { TemplateArtifact } from './graphTypes.js'

/**
 * In-process capability used by the legacy artifact-fill API.
 *
 * The brand is deliberately object-identity based and is not serialized. A
 * parsed, cloned, or caller-constructed artifact must therefore be rebound to
 * a captured catalog before it can resume.
 */
const libraryOwnedTemplateArtifacts = new WeakSet<object>()

/** Mark an artifact that has been produced and validated by this process. */
export function brandTemplateArtifact<T extends TemplateArtifact>(artifact: T): T {
	libraryOwnedTemplateArtifacts.add(artifact)
	return artifact
}

/** Return whether an artifact carries the non-serializable in-process brand. */
export function isLibraryOwnedTemplateArtifact(artifact: TemplateArtifact): boolean {
	return libraryOwnedTemplateArtifacts.has(artifact)
}
