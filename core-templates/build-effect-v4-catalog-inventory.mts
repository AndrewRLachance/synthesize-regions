/**
 * Phase 1 — inventory every template in the `core-templates` catalog.
 *
 * Enumerates real, factory-materialized template definitions by importing every
 * pack module, so factory-produced model IDs are counted rather than missed.
 *
 * Writes a raw inventory to `effect-v4-catalog-raw-inventory.json` for the
 * canonicalization phases to consume.
 */
import { writeFileSync } from 'node:fs'
import {
	classifyModuleName,
	collectTemplateArrays,
	coreTemplatesDir,
	extractMarkers,
	importCoreTemplateModule,
	isTemplateDefinition,
	listCoreTemplateModules,
	resolveFromHere,
	sourceImportSpecifiers
} from './audit-lib.mts'
import { join } from 'node:path'

interface RawTemplateRecord {
	modelId: string
	version?: string
	description?: string
	sourceModule: string
	exportName: string
	outputKind: string
	imports: readonly string[]
	typeParameters: readonly string[]
	inputIds: readonly string[]
	inputRegionKinds: Record<string, string>
	markers: Array<{ kind: string; id: string; occurrences: number }>
	manifestDigest?: string
	moduleRole: string
	importRequirements?: readonly unknown[]
	callableScope?: unknown
}

const modules = listCoreTemplateModules()
const records: RawTemplateRecord[] = []
const moduleErrors: Array<{ module: string; error: string }> = []
const moduleSummary: Array<{
	module: string
	role: string
	exports: string[]
	templateCount: number
	error?: string
}> = []

for (const fileName of modules) {
	const role = classifyModuleName(fileName)
	const { exports, error } = await importCoreTemplateModule(fileName)
	if (error) {
		moduleErrors.push({ module: fileName, error })
		moduleSummary.push({ module: fileName, role, exports: [], templateCount: 0, error })
		continue
	}
	const arrays = collectTemplateArrays(exports)
	const exportedNames = Object.keys(exports).sort()
	let count = 0
	for (const { exportName, templates } of arrays) {
		for (const template of templates) {
			count += 1
			const markers = extractMarkers(template.source)
			const record: RawTemplateRecord = {
				modelId: template.modelId,
				...(template.version === undefined ? {} : { version: template.version }),
				...(template.description === undefined ? {} : { description: template.description }),
				sourceModule: fileName.replace(/\.ts$/, ''),
				exportName,
				outputKind: template.output.kind,
				imports: sourceImportSpecifiers(template.source),
				typeParameters: Object.keys(template.typeParameters ?? {}),
				inputIds: Object.keys(template.inputs ?? {}),
				inputRegionKinds: Object.fromEntries(
					Object.entries(template.inputs ?? {}).map(([id, port]) => [
						id,
						(port as { regionKind?: string }).regionKind ?? 'unknown'
					])
				),
				markers,
				...(template.manifestDigest === undefined ? {} : { manifestDigest: template.manifestDigest }),
				moduleRole: role,
				...(template.importRequirements === undefined ? {} : { importRequirements: template.importRequirements }),
				...(template.callableScope === undefined ? {} : { callableScope: template.callableScope })
			}
			records.push(record)
		}
	}
	moduleSummary.push({
		module: fileName,
		role,
		exports: exportedNames,
		templateCount: count
	})
}

records.sort((a, b) =>
	a.modelId === b.modelId
		? a.sourceModule === b.sourceModule
			? a.exportName === b.exportName
				? 0
				: a.exportName < b.exportName ? -1 : 1
			: a.sourceModule < b.sourceModule ? -1 : 1
		: a.modelId < b.modelId ? -1 : 1
)

// --- duplicate model ID detection -------------------------------------------------
const byId = new Map<string, RawTemplateRecord[]>()
for (const record of records) {
	const bucket = byId.get(record.modelId)
	if (bucket) bucket.push(record)
	else byId.set(record.modelId, [record])
}

const duplicateIds = [...byId.entries()]
	.filter(([, bucket]) => bucket.length > 1)
	.map(([modelId, bucket]) => ({
		modelId,
		occurrences: bucket.length,
		distinctDigests: [...new Set(bucket.map((r) => r.manifestDigest ?? 'none'))],
		locations: bucket.map((r) => ({
			module: r.sourceModule,
			exportName: r.exportName,
			version: r.version,
			digest: r.manifestDigest,
			outputKind: r.outputKind
		}))
	}))
	.sort((a, b) => (a.modelId < b.modelId ? -1 : 1))

// Same modelId, different manifest digest => a real semantic conflict.
const conflictingIds = duplicateIds.filter((d) => d.distinctDigests.length > 1)

// modelId reused across genuinely different descriptions/outputs.
const semanticVariants = duplicateIds
	.filter((d) => {
		const bucket = byId.get(d.modelId)!
		return new Set(bucket.map((r) => r.outputKind)).size > 1
	})
	.map((d) => d.modelId)

const output = {
	generatedAt: new Date().toISOString(),
	coreTemplatesDir,
	moduleCount: modules.length,
	moduleLoadErrors: moduleErrors,
	modules: moduleSummary,
	totalTemplateOccurrences: records.length,
	distinctModelIds: byId.size,
	duplicateModelIdCount: duplicateIds.length,
	conflictingModelIdCount: conflictingIds.length,
	semanticVariantModelIds: semanticVariants,
	duplicateModelIds: duplicateIds,
	counts: {
		byPack: Object.fromEntries(
			[...new Set(records.map((r) => r.sourceModule))].sort().map((pack) => [
				pack,
				records.filter((r) => r.sourceModule === pack).length
			])
		),
		byOutputKind: Object.fromEntries(
			[...new Set(records.map((r) => r.outputKind))].sort().map((kind) => [
				kind,
				records.filter((r) => r.outputKind === kind).length
			])
		),
		byVersion: Object.fromEntries(
			[...new Set(records.map((r) => r.version ?? 'none'))].sort().map((version) => [
				version,
				records.filter((r) => (r.version ?? 'none') === version).length
			])
		)
	},
	templates: records
}

writeFileSync(
	join(coreTemplatesDir, 'effect-v4-catalog-raw-inventory.json'),
	`${JSON.stringify(output, null, '\t')}\n`
)

console.log(`modules scanned: ${modules.length}`)
console.log(`module load errors: ${moduleErrors.length}`)
for (const err of moduleErrors) console.log(`  ! ${err.module}: ${err.error}`)
console.log(`template occurrences: ${records.length}`)
console.log(`distinct modelIds: ${byId.size}`)
console.log(`duplicate modelIds: ${duplicateIds.length}`)
console.log(`  conflicting (multiple digests under one id): ${conflictingIds.length}`)
console.log(`  semantic variants (multiple output kinds under one id): ${semanticVariants.length}`)
