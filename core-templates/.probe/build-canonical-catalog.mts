/**
 * Generate `effect-v4-canonical-template-catalog.ts`.
 *
 * The canonical catalog imports every leaf pack array directly — the modules
 * `classifyModuleName` calls a pack — rather than chaining through the
 * historical `expanded-with-X` catalogs. Templates are deduplicated by
 * `modelId` so each canonical template appears exactly once.
 *
 * Import-binding rules:
 *
 * - Each distinct array *name* is imported exactly once. When several modules
 *   export the same name (a pack that re-exports another pack's array), the
 *   owner is the module whose source locally declares `export const <name>`;
 *   otherwise the first module in sorted order. The generator asserts that
 *   same-name arrays carry identical modelId lists (benign re-exports).
 * - Composite arrays whose every modelId is contributed by smaller constituent
 *   arrays (greedy set cover, smallest first) are fully redundant re-exports
 *   and are skipped entirely; the skip list is printed and embedded in the
 *   generated file header.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	classifyModuleName,
	collectTemplateArrays,
	coreTemplatesDir,
	importCoreTemplateModule,
	listCoreTemplateModules
} from '../audit-lib.mts'

interface Leaf {
	module: string
	array: string
	file: string
	modelIds: string[]
	/** True when the module source locally declares `export const <array>`. */
	declaresLocally: boolean
}

const leaves: Leaf[] = []
for (const fileName of listCoreTemplateModules()) {
	if (classifyModuleName(fileName) !== 'pack') continue
	const { exports, error } = await importCoreTemplateModule(fileName)
	if (error) continue
	const source = readFileSync(join(coreTemplatesDir, fileName), 'utf8')
	for (const { exportName, templates } of collectTemplateArrays(exports)) {
		if ((templates as unknown[]).length === 0) continue
		const declaresLocally = new RegExp(`export const ${exportName}\\b`).test(source)
		leaves.push({
			module: fileName.replace(/\.ts$/, ''),
			array: exportName,
			file: fileName,
			modelIds: (templates as { modelId: string }[]).map((template) => template.modelId),
			declaresLocally
		})
	}
}

leaves.sort((a, b) => a.module.localeCompare(b.module) || a.array.localeCompare(b.array))

// --- Resolve one owner module per distinct array name. -----------------------
const byArray = new Map<string, Leaf[]>()
for (const leaf of leaves) {
	const group = byArray.get(leaf.array) ?? []
	group.push(leaf)
	byArray.set(leaf.array, group)
}

const owners = new Map<string, Leaf>()
for (const [array, group] of byArray) {
	// Same-name arrays must be benign re-exports: identical modelId lists.
	const reference = group[0]!.modelIds.join('')
	for (const candidate of group.slice(1)) {
		if (candidate.modelIds.join('') !== reference) {
			console.error(`CONFLICT: array ${array} differs between ${group[0]!.module} and ${candidate.module}`)
			process.exitCode = 1
		}
	}
	const declarer = group.filter((leaf) => leaf.declaresLocally)
	owners.set(array, declarer[0] ?? group[0]!)
}

// --- Drop fully redundant composite arrays. ----------------------------------
// Greedy set cover, smallest arrays first: a leaf constituent is always kept
// before the composite that re-spreads it, so the composite — never the leaf —
// is the one recognised as fully covered. An array is kept when it contributes
// at least one modelId no already-kept array carries.
const byCoverage = [...owners.values()].sort(
	(a, b) => a.modelIds.length - b.modelIds.length || a.module.localeCompare(b.module) || a.array.localeCompare(b.array)
)
const covered = new Set<string>()
const keptByName = new Map<string, Leaf>()
const skippedComposites: Array<{ array: string; module: string; modelIds: number }> = []
for (const leaf of byCoverage) {
	const contributes = leaf.modelIds.some((modelId) => !covered.has(modelId))
	if (!contributes) {
		skippedComposites.push({ array: leaf.array, module: leaf.module, modelIds: leaf.modelIds.length })
		continue
	}
	for (const modelId of leaf.modelIds) covered.add(modelId)
	keptByName.set(leaf.array, leaf)
}
// Emission order is the owner-module order, independent of cover order, so the
// generated file is stable and grouped the way the pack tree reads.
const kept = [...keptByName.values()].sort(
	(a, b) => a.module.localeCompare(b.module) || a.array.localeCompare(b.array)
)

// --- Deduplicate by modelId for the header statistics. -----------------------
const seen = new Set<string>()
let duplicates = 0
for (const leaf of kept) {
	for (const modelId of leaf.modelIds) {
		if (seen.has(modelId)) duplicates++
		else seen.add(modelId)
	}
}

const header = `/**
 * Canonical Effect v4 graph-template catalog.
 *
 * This is the single authoritative array of Effect v4 graph templates. It is
 * generated from the leaf packs directly — the modules that define templates —
 * and does NOT chain through the historical \`expanded-with-X\` catalogs, so it
 * has no accidental dependency on that chaining.
 *
 * Every canonical template appears exactly once. Each distinct pack array is
 * imported exactly once, from the module that declares it; packs that merely
 * re-export another pack's array are not imported for that name. Composite
 * arrays whose templates are all reachable through their constituent packs
 * are omitted entirely (${skippedComposites.map((skip) => skip.array).join(', ')}).
 *
 * Generated by \`core-templates/.probe/build-canonical-catalog.mts\`.
 */

import type { AnyEffectFamilyTemplateDefinitionInput } from './effect-template-helpers.js'
`

const imports = kept.map((leaf) => `import { ${leaf.array} } from './${leaf.module}.js'`).join('\n')

const body = kept.map((leaf) => `\t${leaf.array},`).join('\n')

const footer = `
/**
 * Every canonical Effect v4 graph template, exactly once.
 *
 * ${seen.size} distinct modelIds across ${kept.length} pack arrays.
 * ${duplicates} in-catalog re-exports were dropped by the modelId dedupe;
 * every one is a single-digest benign re-export of a template that survives
 * in an earlier pack.
 *
 * \`concat\` is used instead of a spread literal so the compiler checks each
 * pack against the annotated element type; a single 75-way spread literal
 * would infer a union of every pack's literal template type, which is too
 * complex to represent (TS2590).
 */
const allEffectV4Templates: AnyEffectFamilyTemplateDefinitionInput[] = (
	[] as AnyEffectFamilyTemplateDefinitionInput[]
).concat(
${body}
)

export const effectV4CanonicalGraphTemplateInputs = allEffectV4Templates.filter(
	(template, index, self) => self.findIndex((other) => other.modelId === template.modelId) === index
) satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
`

const out = `${header}\n${imports}\n${footer}\n`
writeFileSync(join(coreTemplatesDir, 'effect-v4-canonical-template-catalog.ts'), out)
console.log(`pack arrays kept: ${kept.length}`)
console.log(`composite arrays skipped (fully redundant): ${skippedComposites.length}`)
for (const skip of skippedComposites) console.log(`  ${skip.array} (${skip.module}, ${skip.modelIds} modelIds)`)
console.log(`distinct modelIds: ${seen.size}`)
console.log(`in-catalog re-exports dropped: ${duplicates}`)
console.log(`written: core-templates/effect-v4-canonical-template-catalog.ts`)
