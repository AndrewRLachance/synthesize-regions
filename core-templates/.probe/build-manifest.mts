/**
 * Build `effect-v4-canonical-template-manifest.json`.
 *
 * The manifest is the machine-readable inventory of the canonical catalog:
 * every canonical `modelId` exactly once, with provenance (the leaf pack that
 * owns it in `effect-v4-canonical-template-catalog.ts`), descriptor metadata,
 * a stability classification, and status/lineage for the removed definitions.
 *
 * Provenance is derived from the generated catalog's own import list, so the
 * manifest can never disagree with the catalog about which pack owns a
 * template. Stability is a documented heuristic, not a semantic judgement:
 *
 * - `rc-sensitive`  the template references an API root the Phase-10 audit
 *                   could not resolve against the pinned packages, or imports
 *                   a package that is not installed here. These templates are
 *                   the semantic-compile candidates.
 * - `unstable`      the template references an `effect/unstable/*` API that
 *                   resolved against the pinned package.
 * - `stable`        everything else.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	coreTemplatesDir,
	importCoreTemplateModule,
	sourceImportSpecifiers
} from '../audit-lib.mts'

const EFFECT_VERSION = '4.0.0-rc.117'

// --- Category by owning pack module. ----------------------------------------
const CATEGORY_BY_MODULE: Record<string, string> = {
	'e-samplesBasePatterns': 'core',
	'effect-application-templates': 'application',
	'effect-batching-templates': 'batching',
	'effect-behaviour-templates': 'core',
	'effect-bigdecimal-templates': 'data',
	'effect-cache-templates': 'cache',
	'effect-cause-templates': 'errors',
	'effect-chunk-templates': 'data',
	'effect-concurrency-templates': 'concurrency',
	'effect-config-templates': 'config',
	'effect-coordination-templates': 'concurrency',
	'effect-data-templates': 'data',
	'effect-datetime-templates': 'datetime',
	'effect-duration-templates': 'data',
	'effect-error-management-v4-templates': 'errors',
	'effect-es-toolkit-templates': 'es-toolkit',
	'es-toolkit-templates': 'es-toolkit',
	'effect-exit-templates': 'core',
	'effect-file-system-templates': 'platform',
	'effect-hash-set-templates': 'data',
	'effect-observability-v4-templates': 'observability',
	'effect-option-templates': 'data',
	'effect-path-templates': 'platform',
	'effect-platform-logger-templates': 'observability',
	'effect-redacted-templates': 'security',
	'effect-resource-templates': 'resources',
	'effect-result-templates': 'data',
	'effect-schedule-templates': 'schedule',
	'effect-schema-templates': 'schema',
	'effect-service-layer-templates': 'layer',
	'effect-sink-v4-templates': 'stream',
	'effect-stream-sink-real-world-templates': 'stream',
	'effect-stream-v4-templates': 'stream',
	'effect-terminal-templates': 'platform',
	'effect-ts': 'core',
	'effect-v4-application-assembly-foundational-templates': 'application',
	'effect-v4-application-assembly-templates': 'application',
	'effect-v4-behavioral-testing-templates': 'testing',
	'effect-v4-child-process-foundational-templates': 'child-process',
	'effect-v4-child-process-os-integration-templates': 'child-process',
	'effect-v4-cli-command-application-templates': 'cli',
	'effect-v4-cli-foundational-templates': 'cli',
	'effect-v4-cluster-distributed-service-templates': 'cluster',
	'effect-v4-cluster-foundational-templates': 'cluster',
	'effect-v4-durable-background-workflow-templates': 'workflow',
	'effect-v4-durable-workflow-foundational-templates': 'workflow',
	'effect-v4-eventlog-offline-first-templates': 'eventlog',
	'effect-v4-eventlog-persistence-foundational-templates': 'eventlog',
	'effect-v4-fault-injection-templates': 'testing',
	'effect-v4-http-api-foundational-templates': 'http',
	'effect-v4-http-foundational-templates': 'http',
	'effect-v4-http-rest-service-boundary-templates': 'http',
	'effect-v4-openapi-generated-integration-templates': 'openapi',
	'effect-v4-openapi-generator-foundational-templates': 'openapi',
	'effect-v4-operations-foundational-templates': 'core',
	'effect-v4-otlp-observability-foundational-templates': 'observability',
	'effect-v4-production-observability-templates': 'observability',
	'effect-v4-requirements-templates': 'core',
	'effect-v4-resilience-foundational-templates': 'resilience',
	'effect-v4-resilience-worker-templates': 'resilience',
	'effect-v4-resource-templates': 'resources',
	'effect-v4-rpc-foundational-templates': 'rpc',
	'effect-v4-rpc-service-boundary-templates': 'rpc',
	'effect-v4-runtime-templates': 'runtime',
	'effect-v4-security-cross-boundary-templates': 'security',
	'effect-v4-security-foundational-templates': 'security',
	'effect-v4-socket-foundational-templates': 'socket',
	'effect-v4-socket-streaming-boundary-templates': 'socket',
	'effect-v4-sql-foundational-templates': 'sql',
	'effect-v4-sql-repository-transaction-templates': 'sql',
	'effect-v4-testing-foundational-templates': 'testing',
	'effect-v4-transaction-foundational-templates': 'stm',
	'effect-v4-transactional-coordination-templates': 'stm',
	'effect-workflow-templates': 'workflow'
}

// API roots the Phase-10 audit could not verify against the pinned packages.
const apiUsageAudit = JSON.parse(readFileSync(join(coreTemplatesDir, 'effect-v4-api-usage-audit.json'), 'utf8')) as {
	unresolvedRoots: Array<{ root: string }>
	needsSemanticCompile: Array<{ root: string }>
}
const rcSensitiveRoots = [
	...new Set([
		...apiUsageAudit.unresolvedRoots.map((entry) => entry.root),
		...apiUsageAudit.needsSemanticCompile.map((entry) => entry.root)
	])
].sort()
const rcSensitivePattern = new RegExp(`\\b(${rcSensitiveRoots.map((root) => root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`)

// Packages referenced by generated source but not installed in this repository.
const importResolution = JSON.parse(readFileSync(join(coreTemplatesDir, 'effect-v4-import-resolution.json'), 'utf8')) as {
	resolutions: Array<{ specifier: string; status: string }>
}
const externalNotInstalled = new Set(
	importResolution.resolutions
		.filter((resolution) => resolution.status === 'external-not-installed' || resolution.specifier === '@effect/openapi-generator/OpenApiGenerator')
		.map((resolution) => resolution.specifier)
)

// --- Provenance from the generated catalog's import list. --------------------
const catalogSource = readFileSync(join(coreTemplatesDir, 'effect-v4-canonical-template-catalog.ts'), 'utf8')
const catalogImports = [...catalogSource.matchAll(/import \{ (\w+) \} from '\.\/([\w.-]+)\.js'/g)].map(([, array, module]) => ({ array: array!, module: module! }))

interface TemplateLike {
	modelId: string
	version?: string
	description?: string
	typeParameters?: Record<string, unknown>
	inputs: Record<string, unknown>
	output: { kind: string; type?: { nominal?: string; ts?: string } }
	source: string
	importRequirements?: ReadonlyArray<{ moduleSpecifier: string }>
}

const ownerByModelId = new Map<string, { module: string; array: string }>()
for (const { array, module } of catalogImports) {
	const { exports, error } = await importCoreTemplateModule(`${module}.ts`)
	if (error) throw new Error(`cannot load ${module}: ${error}`)
	const value = exports[array]
	if (!Array.isArray(value)) throw new Error(`${module}.${array} is not an array`)
	for (const template of value as TemplateLike[]) {
		if (!ownerByModelId.has(template.modelId)) ownerByModelId.set(template.modelId, { module, array })
	}
}

const canonicalModule = await importCoreTemplateModule('effect-v4-canonical-template-catalog.ts')
const canonical = canonicalModule.exports.effectV4CanonicalGraphTemplateInputs as TemplateLike[]

// Cross-pack benign duplicates: identical-digest definitions that live in two
// leaf packs; the first pack in catalog order owns the canonical entry.
const BENIGN_CROSS_PACK_DUPLICATES: Record<string, string> = {
	CauseHasFails: 'effect-error-management-v4-templates',
	CauseHasDies: 'effect-error-management-v4-templates',
	CauseHasInterrupts: 'effect-error-management-v4-templates'
}

const entries = canonical.map((template) => {
	const owner = ownerByModelId.get(template.modelId)
	if (!owner) throw new Error(`no owner for ${template.modelId}`)
	const imports = new Set<string>(sourceImportSpecifiers(template.source))
	for (const requirement of template.importRequirements ?? []) imports.add(requirement.moduleSpecifier)
	const referencesRcSensitiveRoot = rcSensitivePattern.test(template.source)
	const referencesExternalPackage = [...imports].some((specifier) => externalNotInstalled.has(specifier))
	const referencesUnstable = /effect\/unstable\//.test(template.source) || /effect\/unstable\//.test(template.output.type?.ts ?? '') || /effect\/unstable\//.test(template.output.type?.nominal ?? '')
	const stability = referencesRcSensitiveRoot || referencesExternalPackage ? 'rc-sensitive' : referencesUnstable ? 'unstable' : 'stable'
	const notes: string[] = []
	if (BENIGN_CROSS_PACK_DUPLICATES[template.modelId]) {
		notes.push(`Also defined, with an identical manifest digest, in ${BENIGN_CROSS_PACK_DUPLICATES[template.modelId]}; the ${owner.module} definition is canonical.`)
	}
	if (stability === 'rc-sensitive') {
		notes.push('References an API root or package the Phase-10 audit could not verify against the pinned packages; see effect-v4-semantic-compile-fixtures.json.')
	}
	return {
		modelId: template.modelId,
		version: template.version ?? 'unknown',
		category: CATEGORY_BY_MODULE[owner.module] ?? 'misc',
		sourceModule: owner.module,
		exportName: owner.array,
		outputKind: template.output.kind,
		imports: [...imports].sort(),
		typeParameters: Object.keys(template.typeParameters ?? {}).sort(),
		inputIds: Object.keys(template.inputs ?? {}).sort(),
		stability: stability as 'stable' | 'unstable' | 'rc-sensitive',
		status: 'canonical' as const,
		...(notes.length > 0 ? { notes } : {})
	}
})

entries.sort((a, b) => a.modelId.localeCompare(b.modelId))

const removed = [
	{
		modelId: 'SchemaToArbitraryLazy',
		version: '1.0.0',
		category: 'schema',
		sourceModule: 'effect-schema-templates',
		status: 'replaced' as const,
		replacedBy: 'SchemaToArbitrary',
		notes: [
			'Removed: rc.117 has no lazy schema-to-Arbitrary factory; only `Arbitrary.schema` in `effect/unstable/arbitrary` exists. See effect-v4-template-replacements.json.'
		]
	}
]

const countBy = <K extends string>(key: (entry: (typeof entries)[number]) => K) => {
	const counts: Record<string, number> = {}
	for (const entry of entries) {
		const k = key(entry)
		counts[k] = (counts[k] ?? 0) + 1
	}
	return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
}

const manifest = {
	effectVersion: EFFECT_VERSION,
	catalog: 'core-templates/effect-v4-canonical-template-catalog.ts',
	generatedBy: 'core-templates/.probe/build-manifest.mts',
	summary: {
		canonical: entries.length,
		removed: removed.length,
		compatibilityAliases: 0,
		rcSensitiveRoots,
		externalPackagesNotInstalled: [...externalNotInstalled].sort(),
		countsByPack: countBy((entry) => entry.sourceModule),
		countsByCategory: countBy((entry) => entry.category),
		countsByOutputKind: countBy((entry) => entry.outputKind),
		countsByVersion: countBy((entry) => entry.version),
		countsByStatus: countBy((entry) => entry.status),
		countsByStability: countBy((entry) => entry.stability)
	},
	templates: entries,
	removed
}

writeFileSync(
	join(coreTemplatesDir, 'effect-v4-canonical-template-manifest.json'),
	`${JSON.stringify(manifest, null, '\t')}\n`
)
console.log(`canonical entries: ${entries.length}`)
console.log(`stability: ${JSON.stringify(manifest.summary.countsByStability)}`)
console.log(`categories: ${Object.keys(manifest.summary.countsByCategory).length}`)
console.log(`written: core-templates/effect-v4-canonical-template-manifest.json`)
