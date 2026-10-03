/**
 * Report every import specifier used by the catalog and whether it resolves
 * against the pinned `effect` package.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { artifactsDir } from './lib.mts'
import {
	effectPkg,
	externalPackages,
	promotedModules,
	resolveEffectSpecifier,
	unstableBarrels
} from './effect-import-resolver.mts'

const inv = JSON.parse(
	readFileSync(join(artifactsDir, 'effect-v4-catalog-raw-inventory.json'), 'utf8')
) as {
	templates: Array<{ modelId: string; sourceModule: string; imports: string[] }>
}

const usage = new Map<string, Array<{ modelId: string; sourceModule: string }>>()
for (const t of inv.templates) {
	for (const spec of t.imports) {
		const bucket = usage.get(spec)
		const entry = { modelId: t.modelId, sourceModule: t.sourceModule }
		if (bucket) bucket.push(entry)
		else usage.set(spec, [entry])
	}
}

const resolutions = [...usage.keys()]
	.sort()
	.map((specifier) => {
		const resolution = resolveEffectSpecifier(specifier)
		const templates = usage.get(specifier)!
		return {
			...resolution,
			templateCount: templates.length,
			distinctModules: [...new Set(templates.map((t) => t.sourceModule))].sort(),
			affectedTemplates: [...new Set(templates.map((t) => t.modelId))].sort()
		}
	})

const report = {
	effectVersion: effectPkg.version,
	unstableBarrelsPublished: unstableBarrels(),
	promotedSingleModuleBarrelsCount: promotedModules().length,
	externalPackagesReferenced: [...externalPackages].sort(),
	resolutions,
	summary: {
		totalSpecifiers: resolutions.length,
		resolves: resolutions.filter((r) => r.status === 'resolves').length,
		missing: resolutions.filter((r) => r.status === 'missing').length,
		externalNotInstalled: resolutions.filter((r) => r.status === 'external-not-installed').length
	}
}

writeFileSync(
	join(artifactsDir, 'effect-v4-import-resolution.json'),
	`${JSON.stringify(report, null, '\t')}\n`
)

console.log(`effect version: ${effectPkg.version}`)
console.log(`published unstable barrels: ${unstableBarrels().join(', ')}`)
console.log(`\ntotal distinct specifiers: ${report.summary.totalSpecifiers}`)
console.log(`  resolves:               ${report.summary.resolves}`)
console.log(`  MISSING:                ${report.summary.missing}`)
console.log(`  external not installed: ${report.summary.externalNotInstalled}`)

console.log('\n=== EFFECT SPECIFIERS THAT DO NOT RESOLVE ===')
for (const r of resolutions.filter((x) => x.status === 'missing')) {
	console.log(`\n  ${r.specifier}   (${r.templateCount} templates, ${r.distinctModules.length} modules)`)
	console.log(`    matched exports key: ${r.matchedExport ?? '(none)'}`)
	console.log(`    reason: ${r.note ?? 'unresolvable'}`)
	console.log(`    modules: ${r.distinctModules.join(', ')}`)
}

console.log('\n=== EFFECT SPECIFIERS THAT RESOLVE ===')
for (const r of resolutions.filter((x) => x.status === 'resolves')) {
	console.log(`  OK  ${r.specifier.padEnd(34)} ${r.templateCount} templates`)
}

console.log('\n=== EXTERNAL PACKAGES NOT INSTALLED (cannot be verified here) ===')
for (const r of resolutions.filter((x) => x.status === 'external-not-installed')) {
	console.log(`  ${r.specifier.padEnd(42)} ${r.templateCount} templates`)
}
