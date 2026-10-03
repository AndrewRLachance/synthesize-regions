import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { effectV4CanonicalGraphTemplateInputs, effectV4TemplatePacks } from '../../src/catalogs/effect-v4.js'
import { coreTemplateFamilies } from '../../src/catalogs/curated.js'
import {
	drizzleOrmV1GraphTemplateInputs,
	drizzleOrmV1TemplatePacks
} from '../../src/packs/drizzle-orm/v1/index.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const mode = process.argv.includes('--write') ? 'write' : process.argv.includes('--check') ? 'check' : undefined
if (!mode) throw new Error('Usage: generated.mts --write | --check')

const effectVersion = '4.0.0-rc.117'
const drizzleOrmVersion = '1.0.0-rc.4'
const externalPackagesNotInstalled = [
	'@effect/openapi-generator/OpenApiGenerator',
	'@effect/opentelemetry',
	'@effect/platform-browser',
	'@effect/platform-bun',
	'@effect/platform-node',
	'@effect/sql-pg',
	'@effect/vitest'
]
const rcSensitiveRoots = [
	'BrowserRuntime', 'BunRuntime', 'BunServices', 'NodeClusterHttp',
	'NodeClusterSocket', 'NodeFileSystem', 'NodeRuntime', 'NodeSdk',
	'NodeServices', 'NodeTerminal', 'OpenApiGenerator', 'OtelMetrics',
	'PgClient', 'Resource', 'WebSdk'
]
const externalPackages = new Set(externalPackagesNotInstalled)
const rootPattern = new RegExp(`\\b(${rcSensitiveRoots.join('|')})\\b`)

const packByModelId = new Map<string, string>()
for (const pack of effectV4TemplatePacks) {
	for (const template of pack.templates) {
		if (packByModelId.has(template.modelId)) throw new Error(`duplicate ${template.modelId}`)
		packByModelId.set(template.modelId, pack.id)
	}
}

const sourceImports = (source: string): string[] => {
	const found = new Set<string>()
	for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) found.add(match[1]!)
	return [...found]
}

const packExportName = (pack: string): string => {
	if (pack === 'base') return 'allBaseGraphTemplateInputs'
	if (pack === 'es-toolkit-standalone') return 'esToolkitGraphTemplateInputs'
	const domain = pack.split('-').map((part) => `${part[0]!.toUpperCase()}${part.slice(1)}`).join('')
	return `effectV4${domain}GraphTemplateInputs`
}

const entries = effectV4CanonicalGraphTemplateInputs.map((template) => {
	const pack = packByModelId.get(template.modelId)
	if (!pack) throw new Error(`missing owner for ${template.modelId}`)
	const imports = new Set(sourceImports(template.source))
	for (const requirement of template.importRequirements ?? []) imports.add(requirement.moduleSpecifier)
	const referencesExternal = [...imports].some((specifier) => externalPackages.has(specifier))
	const stability = referencesExternal || rootPattern.test(template.source)
		? 'rc-sensitive'
		: /effect\/unstable\//.test(template.source) || /effect\/unstable\//.test(template.output.type?.ts ?? '')
			? 'unstable'
			: 'stable'
	const sourceModule = pack === 'base'
		? 'src/packs/base'
		: pack === 'es-toolkit-standalone'
			? 'src/packs/es-toolkit'
			: `src/packs/effect-v4/${pack}`
	return {
		modelId: template.modelId,
		version: template.version ?? 'unknown',
		pack,
		category: pack === 'es-toolkit-standalone' ? 'es-toolkit' : pack,
		sourceModule,
		exportName: packExportName(pack),
		manifestDigest: template.manifestDigest,
		outputKind: template.output.kind,
		imports: [...imports].sort(),
		typeParameters: Object.keys(template.typeParameters ?? {}).sort(),
		inputIds: Object.keys(template.inputs ?? {}).sort(),
		stability,
		status: 'canonical'
	}
}).sort((a, b) => a.modelId.localeCompare(b.modelId))

const countBy = (select: (entry: typeof entries[number]) => string): Record<string, number> => {
	const counts: Record<string, number> = {}
	for (const entry of entries) {
		const key = select(entry)
		counts[key] = (counts[key] ?? 0) + 1
	}
	return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
}

const removed = [{
	modelId: 'SchemaToArbitraryLazy',
	version: '1.0.0',
	category: 'schema',
	sourceModule: 'src/packs/effect-v4/schema',
	status: 'replaced',
	replacedBy: 'SchemaToArbitrary',
	notes: ['Removed because effect@4.0.0-rc.117 has no lazy schema-to-Arbitrary factory.']
}]

const manifest = {
	effectVersion,
	catalog: '@synthesize-regions/core-templates/effect-v4',
	generatedBy: 'scripts/generate/generated.mts',
	summary: {
		canonical: entries.length,
		removed: removed.length,
		compatibilityAliases: 0,
		rcSensitiveRoots,
		externalPackagesNotInstalled,
		countsByPack: countBy((entry) => entry.pack),
		countsByCategory: countBy((entry) => entry.category),
		countsByOutputKind: countBy((entry) => entry.outputKind),
		countsByVersion: countBy((entry) => entry.version),
		countsByStatus: countBy((entry) => entry.status),
		countsByStability: countBy((entry) => entry.stability)
	},
	templates: entries,
	removed
}

const drizzlePackByModelId = new Map<string, string>()
for (const pack of drizzleOrmV1TemplatePacks) {
	for (const template of pack.templates) {
		if (drizzlePackByModelId.has(template.modelId)) throw new Error(`duplicate Drizzle ORM v1 modelId ${template.modelId}`)
		drizzlePackByModelId.set(template.modelId, pack.id)
	}
}

const drizzleEntries = drizzleOrmV1GraphTemplateInputs.map((template) => {
	const pack = drizzlePackByModelId.get(template.modelId)
	if (!pack) throw new Error(`missing Drizzle ORM v1 owner for ${template.modelId}`)
	return {
		modelId: template.modelId,
		version: template.version ?? 'unknown',
		pack,
		sourceModule: 'src/packs/drizzle-orm/v1',
		exportName: 'drizzleOrmV1GraphTemplateInputs',
		manifestDigest: template.manifestDigest,
		outputKind: template.output.kind,
		typeParameters: Object.keys(template.typeParameters ?? {}).sort(),
		inputIds: Object.keys(template.inputs ?? {}).sort()
	}
}).sort((a, b) => a.modelId.localeCompare(b.modelId))

const drizzleManifest = {
	drizzleOrmVersion,
	templateVersion: '1.0.0',
	catalog: '@synthesize-regions/core-templates/drizzle-orm/v1',
	generatedBy: 'scripts/generate/generated.mts',
	summary: {
		templates: drizzleEntries.length,
		uniqueModelIds: new Set(drizzleEntries.map((entry) => entry.modelId)).size,
		countsByPack: Object.fromEntries(drizzleOrmV1TemplatePacks.map((pack) => [pack.id, pack.templates.length]))
	},
	templates: drizzleEntries
}

const failures: string[] = []
const drizzleFailures: string[] = []
const ids = effectV4CanonicalGraphTemplateInputs.map((template) => template.modelId)
const curated = coreTemplateFamilies.flatMap((family) => family.templates)
if (ids.length !== 1794) failures.push(`expected 1794 canonical templates, found ${ids.length}`)
if (new Set(ids).size !== ids.length) failures.push('canonical modelIds are not unique')
if (curated.length !== 479) failures.push(`expected 479 curated templates, found ${curated.length}`)
if (new Set(curated.map((template) => template.modelId)).size !== curated.length) failures.push('curated modelIds are not unique')

const drizzleIds = drizzleOrmV1GraphTemplateInputs.map((template) => template.modelId)
if (drizzleIds.length !== 253) drizzleFailures.push(`expected 253 Drizzle ORM v1 templates, found ${drizzleIds.length}`)
if (new Set(drizzleIds).size !== drizzleIds.length) drizzleFailures.push('Drizzle ORM v1 modelIds are not unique')
if (drizzleIds.some((modelId) => ids.includes(modelId))) drizzleFailures.push('Drizzle ORM v1 modelIds overlap the Effect v4 canonical catalog')
if (drizzleOrmV1GraphTemplateInputs.some((template) => template.version !== '1.0.0')) drizzleFailures.push('Drizzle ORM v1 templates must use template version 1.0.0')

const expectedDrizzleCounts: Readonly<Record<string, number>> = {
	sql: 45,
	query: 54,
	relations: 14,
	schema: 122,
	runtime: 12,
	'effect-schema': 6
}
for (const pack of drizzleOrmV1TemplatePacks) {
	const expected = expectedDrizzleCounts[pack.id]
	if (expected === undefined) drizzleFailures.push(`unexpected Drizzle ORM v1 pack ${pack.id}`)
	else if (pack.templates.length !== expected) drizzleFailures.push(`expected ${expected} templates in Drizzle ORM v1 pack ${pack.id}, found ${pack.templates.length}`)
}
if (drizzleOrmV1TemplatePacks.length !== Object.keys(expectedDrizzleCounts).length) drizzleFailures.push('Drizzle ORM v1 pack registry does not match the expected pack set')

let markers = 0
for (const template of effectV4CanonicalGraphTemplateInputs) {
	const markerIds = [...template.source.matchAll(/\/\*\* @TYPE [A-Za-z]+(?:\[\])? id=([^\s]+) \*\*\//g)].map((match) => match[1]!)
	const ends = [...template.source.matchAll(/\/\*\* @END \*\*\//g)].length
	markers += markerIds.length
	if (markerIds.length !== ends) failures.push(`${template.modelId}: unbalanced markers`)
	for (const input of Object.keys(template.inputs)) {
		if (markerIds.filter((id) => id === input).length !== 1) failures.push(`${template.modelId}: input ${input} does not own exactly one marker`)
	}
	for (const marker of markerIds) {
		if (!(marker in template.inputs)) failures.push(`${template.modelId}: undeclared marker ${marker}`)
	}
}

for (const template of drizzleOrmV1GraphTemplateInputs) {
	const markerIds = [...template.source.matchAll(/\/\*\* @TYPE [A-Za-z]+(?:\[\])? id=([^\s]+) \*\*\//g)].map((match) => match[1]!)
	const ends = [...template.source.matchAll(/\/\*\* @END \*\*\//g)].length
	if (markerIds.length !== ends) drizzleFailures.push(`${template.modelId}: unbalanced markers`)
	for (const input of Object.keys(template.inputs)) {
		if (markerIds.filter((id) => id === input).length !== 1) drizzleFailures.push(`${template.modelId}: input ${input} does not own exactly one marker`)
	}
	for (const marker of markerIds) {
		if (!(marker in template.inputs)) drizzleFailures.push(`${template.modelId}: undeclared marker ${marker}`)
	}
}

const replacements = JSON.parse(readFileSync(join(packageRoot, 'scripts/generate/effect-v4-replacements.source.json'), 'utf8')) as {
	removals?: Array<{ modelId: string; replacedBy?: string }>
	rewrites?: Array<{ file: string }>
}
for (const removal of replacements.removals ?? []) {
	if (ids.includes(removal.modelId)) failures.push(`${removal.modelId}: removed ID remains canonical`)
	if (removal.replacedBy && !ids.includes(removal.replacedBy)) failures.push(`${removal.modelId}: missing replacement ${removal.replacedBy}`)
}
for (const rewrite of replacements.rewrites ?? []) {
	try { readFileSync(resolve(packageRoot, '..', rewrite.file), 'utf8') }
	catch { failures.push(`replacement metadata points to missing file ${rewrite.file}`) }
}

const evidence = {
	effectVersion,
	scope: 'canonical catalog ownership, marker integrity, and generated metadata agreement',
	generatedBy: 'scripts/generate/generated.mts',
	summary: {
		packs: effectV4TemplatePacks.length,
		canonicalTemplates: ids.length,
		curatedTemplates: curated.length,
		uniqueModelIds: new Set(ids).size,
		manifestEntries: entries.length,
		aiTemplates: effectV4TemplatePacks.find((pack) => pack.id === 'ai')?.templates.length ?? 0,
		markers,
		failures: failures.length
	},
	failures
}

const semanticBaseline = JSON.parse(readFileSync(join(packageRoot, 'evidence/effect-v4-semantic-results.json'), 'utf8')) as {
	genuineFailures: string[]
}
const auditTemplate = readFileSync(join(packageRoot, 'scripts/generate/effect-v4-canonicalization.template.md'), 'utf8')
const auditReport = auditTemplate
	.replaceAll('{{CANONICAL_TEMPLATES}}', ids.length.toLocaleString('en-US'))
	.replaceAll('{{UNIQUE_MODEL_IDS}}', new Set(ids).size.toLocaleString('en-US'))
	.replaceAll('{{CURATED_TEMPLATES}}', curated.length.toLocaleString('en-US'))
	.replaceAll('{{PACKS}}', effectV4TemplatePacks.length.toLocaleString('en-US'))
	.replaceAll('{{AI_TEMPLATES}}', evidence.summary.aiTemplates.toLocaleString('en-US'))
	.replaceAll('{{MARKERS}}', markers.toLocaleString('en-US'))
	.replaceAll('{{STRUCTURAL_FAILURES}}', failures.length.toLocaleString('en-US'))
	.replaceAll('{{SEMANTIC_FAILURE_COUNT}}', semanticBaseline.genuineFailures.length.toLocaleString('en-US'))
	.replaceAll(
		'{{SEMANTIC_FAILURE_LIST}}',
		semanticBaseline.genuineFailures.length > 0
			? semanticBaseline.genuineFailures.map((modelId) => `- \`${modelId}\``).join('\n')
			: '- None'
	)

const outputs = new Map<string, string>([
	['metadata/effect-v4-catalog-manifest.json', `${JSON.stringify(manifest, null, '\t')}\n`],
	['metadata/drizzle-orm-v1-catalog-manifest.json', `${JSON.stringify(drizzleManifest, null, '\t')}\n`],
	['metadata/effect-v4-template-replacements.json', `${JSON.stringify(replacements, null, '\t')}\n`],
	['docs/audits/effect-v4-canonicalization.md', auditReport],
	['evidence/effect-v4-structural-validation.json', `${JSON.stringify(evidence, null, '\t')}\n`]
])

let stale = false
const generatedRoot = mode === 'check' ? mkdtempSync(join(tmpdir(), 'core-templates-generated-')) : packageRoot
try {
	for (const [relative, content] of outputs) {
		const generated = join(generatedRoot, relative)
		mkdirSync(dirname(generated), { recursive: true })
		writeFileSync(generated, content)
		if (mode === 'write') {
			console.log(`wrote ${relative}`)
			continue
		}
		let actual = ''
		try { actual = readFileSync(join(packageRoot, relative), 'utf8') } catch {}
		if (actual !== readFileSync(generated, 'utf8')) {
			stale = true
			console.error(`stale generated file: ${relative}`)
		}
	}
} finally {
	if (mode === 'check') rmSync(generatedRoot, { recursive: true, force: true })
}

if (failures.length > 0 || drizzleFailures.length > 0) {
	for (const failure of failures) console.error(failure)
	for (const failure of drizzleFailures) console.error(failure)
	process.exitCode = 1
} else if (stale) {
	process.exitCode = 1
} else if (mode === 'check') {
	console.log(`generated metadata is current (${ids.length} canonical, ${curated.length} curated, ${drizzleIds.length} Drizzle ORM v1)`)
}
