import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { coreTemplateManifests, createCoreTemplateRegistry } from '@synthesize-regions/core-templates'
import type { GraphTemplateManifest, TemplateRegistry } from 'synthesize-regions'

/** The curated catalog paired with the registry that validated it. */
export interface MiningCatalog {
	readonly registry: TemplateRegistry
	readonly manifests: readonly GraphTemplateManifest[]
}

/**
 * Build the curated core-template catalog and reduce it to declarative manifests.
 *
 * One registry backs both results, so the exported manifests and the reported
 * digests always describe the same validated membership.
 */
export async function miningCatalog(): Promise<MiningCatalog> {
	const registry = createCoreTemplateRegistry()
	return { registry, manifests: coreTemplateManifests(registry) }
}

/** Manifests for the curated core-template catalog, sorted by `modelId`. */
export async function miningManifests(): Promise<readonly GraphTemplateManifest[]> {
	return (await miningCatalog()).manifests
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const output = process.argv[2]
	if (!output) throw new Error('Usage: npm run samples:export -- <catalog.json>')
	const { registry, manifests } = await miningCatalog()
	await writeFile(output, JSON.stringify(manifests, null, 2) + '\n')
	console.error(`Exported ${manifests.length} validated templates to ${output}`)
	console.error(`contractDigest ${registry.contractDigest}`)
	console.error(`manifestDigest ${registry.manifestDigest}`)
}
