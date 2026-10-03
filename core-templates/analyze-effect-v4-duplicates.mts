/**
 * Analyze duplicate model IDs from the raw inventory.
 *
 * Distinguishes benign re-export duplicates (identical `manifestDigest`) from
 * genuine semantic conflicts (one ID, several distinct definitions).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { coreTemplatesDir } from './audit-lib.mts'

interface Loc {
	module: string
	exportName: string
	version?: string
	digest?: string
	outputKind: string
}

const raw = JSON.parse(
	readFileSync(join(coreTemplatesDir, 'effect-v4-catalog-raw-inventory.json'), 'utf8')
) as {
	duplicateModelIds: Array<{ modelId: string; occurrences: number; distinctDigests: string[]; locations: Loc[] }>
	templates: Array<{ modelId: string; sourceModule: string; exportName: string; manifestDigest?: string }>
}

// A pack module is a leaf definition owner; catalog/aggregator modules re-export.
// The inventory stores `sourceModule` without the `.ts` suffix but `modules[]`
// keeps it, so normalize before comparing.
const aggregatorModules = new Set(
	(raw.modules as Array<{ module: string; role: string }>)
		.filter((m) => m.role === 'aggregator')
		.map((m) => m.module.replace(/\.ts$/, ''))
)

const benign: string[] = []
const conflicts: Array<{ modelId: string; locations: Loc[] }> = []
const crossPackSameId: Array<{ modelId: string; packs: string[] }> = []

for (const dup of raw.duplicateModelIds) {
	const digests = new Set(dup.locations.map((l) => l.digest ?? 'none'))
	if (digests.size <= 1) {
		benign.push(dup.modelId)
		continue
	}
	conflicts.push({ modelId: dup.modelId, locations: dup.locations })

	const packs = [
		...new Set(
			dup.locations
				.filter((l) => !aggregatorModules.has(l.module))
				.map((l) => l.module)
		)
	]
	if (packs.length > 1) crossPackSameId.push({ modelId: dup.modelId, packs })
}

console.log(`duplicate modelIds total: ${raw.duplicateModelIds.length}`)
console.log(`  identical-digest re-exports (benign): ${benign.length}`)
console.log(`  genuine conflicting definitions: ${conflicts.length}`)
console.log(`  conflicts owned by >1 pack: ${crossPackSameId.length}`)

const KNOWN = [
	'DataErrorDeclaration',
	'DataTaggedErrorDeclaration',
	'CauseFail',
	'CauseDie',
	'CauseCombine',
	'CauseHasFails',
	'CauseHasInterrupts'
]

console.log('\n=== STATUS OF DOCUMENTED "KNOWN DUPLICATE" IDS ===')
for (const id of KNOWN) {
	const dup = raw.duplicateModelIds.find((d) => d.modelId === id)
	if (!dup) {
		console.log(`  ${id}: NOT a duplicate (unique in catalog)`)
		continue
	}
	const owners = [
		...new Set(
			dup.locations.filter((l) => !aggregatorModules.has(l.module)).map((l) => `${l.module}::${l.exportName}`)
		)
	]
	console.log(
		`  ${id}: occurrences=${dup.occurrences} distinctDigests=${dup.distinctDigests.length} leafOwners=${owners.length}`
	)
	for (const o of owners) console.log(`      ${o}`)
}

console.log('\n=== GENUINE CONFLICTS, LEAF PACK OWNERS ONLY ===')
for (const c of conflicts) {
	const leaf = c.locations.filter((l) => !aggregatorModules.has(l.module))
	const owners = [...new Set(leaf.map((l) => `${l.module} :: ${l.exportName}`))]
	console.log(`\n${c.modelId}  (distinct digests: ${new Set(c.locations.map((l) => l.digest)).size})`)
	for (const o of owners) console.log(`  LEAF ${o}`)
}

writeFileSync(
	join(coreTemplatesDir, 'effect-v4-catalog-duplicate-analysis.json'),
	`${JSON.stringify(
		{
			duplicateModelIdCount: raw.duplicateModelIds.length,
			benignIdenticalDigestReExports: benign.length,
			genuineConflicts: conflicts.map((c) => ({
				modelId: c.modelId,
				distinctDigests: [...new Set(c.locations.map((l) => l.digest))],
				leafOwners: [
					...new Set(
						c.locations
							.filter((l) => !aggregatorModules.has(l.module))
							.map((l) => ({ module: l.module, exportName: l.exportName, digest: l.digest }))
					)
				]
			})),
			documentedKnownIds: KNOWN.map((id) => {
				const dup = raw.duplicateModelIds.find((d) => d.modelId === id)
				if (!dup) return { modelId: id, present: false }
				return {
					modelId: id,
					present: true,
					occurrences: dup.occurrences,
					distinctDigests: dup.distinctDigests.length,
					leafOwners: [
						...new Set(
							dup.locations.filter((l) => !aggregatorModules.has(l.module)).map((l) => `${l.module} :: ${l.exportName}`)
						)
					]
				}
			})
		},
		null,
		'\t'
	)}\n`
)
