/**
 * Phase 3c — canonicalize `TypeDescriptor.nominal` families against the pinned
 * `effect` package.
 *
 * `nominal` is part of both fragment compatibility and the catalog digest, so a
 * nominal string that names a module the pinned version does not publish is a
 * real catalog defect: producers and consumers agree with each other, but the
 * nominal they agree on cannot be imported.
 *
 * Two kinds of rename are applied, and both are gated on the target actually
 * existing on disk:
 *
 * 1. `domain-unstable-only` — the whole family lives under an `unstable`-only
 *    domain in rc.117, so `effect/<domain>/...` becomes
 *    `effect/unstable/<domain>/...`.
 * 2. `semantic` — rc.117 removed or renamed the V3-era declaration the catalog
 *    referenced. These are listed explicitly with a justification so the
 *    lineage is auditable rather than inferred.
 *
 * Nothing is deleted: every rewrite is recorded in the migration log with its
 * justification, and any nominal a mapping cannot repair is reported instead of
 * being rewritten on a guess.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { artifactsDir, coreTemplatesDir, listCoreTemplateModules } from './lib.mts'
import { effectDir, effectPkg, resolveEffectSpecifier, unstableBarrels } from './effect-import-resolver.mts'

/**
 * Declared-name index for a module the pinned package publishes, so a proposed
 * nominal can be proven to name a real export.
 */
function declaredNamesFor(moduleSpecifier: string): Set<string> | undefined {
	const resolution = resolveEffectSpecifier(moduleSpecifier)
	if (resolution.status !== 'resolves' || !resolution.target) return undefined
	const relative = resolution.target.slice(effectDir.length + 1).replace(/\.js$/, '.d.ts')
	try {
		const text = readFileSync(join(effectDir, relative), 'utf8')
		const names = new Set<string>()
		for (const match of text.matchAll(/\b(?:class|interface|type|namespace|const|function|enum)\s+([A-Za-z_$][\w$]*)/g)) {
			names.add(match[1]!)
		}
		return names
	} catch {
		return undefined
	}
}

/** Split `effect/unstable/socket/Socket.Writer` into module + member. */
function splitNominal(nominal: string): { moduleSpecifier: string; member: string } {
	const segments = nominal.split('/')
	const last = segments.pop()!
	const dot = last.indexOf('.')
	if (dot === -1) return { moduleSpecifier: [...segments, last].join('/'), member: '' }
	return { moduleSpecifier: [...segments, last.slice(0, dot)].join('/'), member: last.slice(dot + 1) }
}

/**
 * A nominal is only accepted when its module resolves through the package
 * exports map *and* the member it names is declared in that module.
 */
function nominalResolves(nominal: string): boolean {
	const { moduleSpecifier, member } = splitNominal(nominal)
	if (resolveEffectSpecifier(moduleSpecifier).status !== 'resolves') return false
	if (!member) return true
	const names = declaredNamesFor(moduleSpecifier)
	return names ? names.has(member) : false
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface Mapping {
	from: string
	to: string
	reason: 'domain-unstable-only' | 'semantic'
	justification: string
}

/**
 * Domain renames derived from the package itself: every published `unstable`
 * barrel whose promoted spelling does not resolve.
 */
const domainMappings: Mapping[] = unstableBarrels().flatMap((domain) => {
	if (resolveEffectSpecifier(`effect/${domain}`).status !== 'missing') return []
	if (resolveEffectSpecifier(`effect/unstable/${domain}`).status !== 'resolves') return []
	return [{
		from: `effect/${domain}/`,
		to: `effect/unstable/${domain}/`,
		reason: 'domain-unstable-only' as const,
		justification:
			`effect@${effectPkg.version} publishes ${domain} only under dist/unstable/${domain}; ` +
			`dist/${domain}.js does not exist, so the promoted spelling cannot be imported.`
	}]
})

/**
 * Renames of declarations themselves. rc.117 dropped the V3-era names, so the
 * catalog has to name the replacement declaration.
 */
const semanticMappings: Mapping[] = [
	{
		from: 'effect/http-api/',
		to: 'effect/unstable/httpapi/',
		reason: 'semantic',
		justification:
			'The package never published a `http-api` barrel; the published spelling drops the hyphen as effect/unstable/httpapi.'
	},
	{
		from: 'effect/ContextTag',
		to: 'effect/Context.Key',
		reason: 'semantic',
		justification:
			'V3 `Context.Tag` was replaced by the `Context.Key` / `Context.Reference` / `Context.Service` family in `effect/Context`.'
	},
	{
		from: 'effect/ExitPromise',
		to: 'effect/Effect.runPromiseExit',
		reason: 'semantic',
		justification: 'V3 `ExitPromise` was removed; rc.117 returns a plain `Promise<Exit>` from `Effect.runPromiseExit`.'
	},
	{
		from: 'effect/LayerMemoMap',
		to: 'effect/LayerMap',
		reason: 'semantic',
		justification: 'V3 `Layer.MemoMap` became the top-level `effect/LayerMap` module in rc.117.'
	},
	{
		from: 'effect/RequestEntry',
		to: 'effect/Request.Entry',
		reason: 'semantic',
		justification: 'V3 `Request.RequestEntry` became the `Request.Entry` interface inside `effect/Request`.'
	},
	{
		from: 'effect/SchemaFilter',
		to: 'effect/SchemaAST.Filter',
		reason: 'semantic',
		justification:
			'`Schema.makeFilter`, `Schema.isMinLength`, `Schema.isInt` and friends all return `SchemaAST.Filter<T>` in rc.117.'
	},
	{
		from: 'effect/SchemaPropertySignature',
		to: 'effect/SchemaAST.PropertySignature',
		reason: 'semantic',
		justification:
			'V3 `Schema.SchemaPropertySignature` is not published in rc.117; the property-signature combinators ' +
			'(`Schema.optionalKey`, `Schema.tag`, ...) build `SchemaAST.PropertySignature` values.'
	},
	{
		from: 'effect/eventlog/EventLog.Identity.Service',
		to: 'effect/unstable/eventlog/EventLog.Identity',
		reason: 'semantic',
		justification:
			'rc.117 exposes the identity as `EventLog.Identity`, a `Context.ServiceClass`; the V3-style ' +
			'`EventLog.Identity.Service` spelling names nothing that is published.'
	},
	{
		from: 'effect/unstable/rpc/RpcHandlers',
		to: 'effect/unstable/rpc/Rpc.Handler',
		reason: 'semantic',
		justification: 'rc.117 dropped the `RpcHandlers` module; a handler is now `Rpc.Handler<Tag>` per RPC.'
	},
	{
		from: 'effect/unstable/sql/Migrator/Loader',
		to: 'effect/unstable/sql/Migrator.Loader',
		reason: 'semantic',
		justification: '`Loader` is a type inside the `Migrator` module, not a nested module path.'
	},
	{
		from: 'effect/unstable/sql/Repository',
		to: 'effect/unstable/sql/SqlModel.makeRepository',
		reason: 'semantic',
		justification:
			'rc.117 publishes no `Repository` type; `SqlModel.makeRepository` returns an anonymous record of ' +
			'`RequestResolver`s, which is the value the catalog modelled.'
	}
]

/**
 * Only mappings that actually repair a nominal the catalog currently uses are
 * applied, and only when the rewritten nominal is proven to resolve. Anything a
 * mapping cannot repair is reported rather than rewritten on a guess.
 */
const audit = JSON.parse(
	readFileSync(join(artifactsDir, 'effect-v4-nominal-type-audit.json'), 'utf8')
) as { nominals: Array<{ nominal: string; status: string; occurrences: number }> }

const broken = audit.nominals.filter((entry) => entry.status !== 'resolves')

interface RepairedNominal {
	from: string
	to: string
	occurrences: number
}

interface Accepted {
	mapping: Mapping
	repaired: RepairedNominal[]
	unresolved: RepairedNominal[]
}

/** Longest `from` prefix wins, so `effect/http-api/` beats `effect/http/`. */
const ordered = [...semanticMappings, ...domainMappings].sort((a, b) => b.from.length - a.from.length)

const accepted: Accepted[] = []
const claimed = new Set<string>()
for (const entry of ordered) {
	const affected = broken.filter(
		(candidate) => !claimed.has(candidate.nominal) && candidate.nominal.startsWith(entry.from)
	)
	if (affected.length === 0) continue
	const repaired: RepairedNominal[] = []
	const unresolved: RepairedNominal[] = []
	for (const candidate of affected) {
		const to = `${entry.to}${candidate.nominal.slice(entry.from.length)}`
		if (nominalResolves(to)) {
			claimed.add(candidate.nominal)
			repaired.push({ from: candidate.nominal, to, occurrences: candidate.occurrences })
		} else {
			unresolved.push({ from: candidate.nominal, to, occurrences: candidate.occurrences })
		}
	}
	if (repaired.length > 0) accepted.push({ mapping: entry, repaired, unresolved })
}

interface Rewrite {
	file: string
	from: string
	to: string
	reason: Mapping['reason']
	justification: string
	occurrences: number
}

const rewrites: Rewrite[] = []

for (const { mapping: entry, repaired } of accepted) {
	for (const { from, to } of repaired) {
		for (const fileName of listCoreTemplateModules()) {
			const absolute = join(coreTemplatesDir, fileName)
			const original = readFileSync(absolute, 'utf8')
			// Only rewrite inside a quoted string, so a bare identifier can never match.
			const pattern = new RegExp(`(['"\`])(${escapeRegExp(from)})\\1`, 'g')
			let occurrences = 0
			const updated = original.replace(pattern, (_match, quote: string) => {
				occurrences += 1
				return `${quote}${to}${quote}`
			})
			if (occurrences > 0) {
				writeFileSync(absolute, updated)
				rewrites.push({
					file: fileName.replace(/\.ts$/, ''),
					from,
					to,
					reason: entry.reason,
					justification: entry.justification,
					occurrences
				})
			}
		}
	}
}

writeFileSync(
	join(artifactsDir, 'effect-v4-nominal-migration-log.json'),
	`${JSON.stringify(
		{
			effectVersion: effectPkg.version,
			families: accepted.map(({ mapping, repaired, unresolved }) => ({
				prefix: mapping.from,
				reason: mapping.reason,
				justification: mapping.justification,
				repaired,
				unresolved
			})),
			rewrites,
			totalOccurrences: rewrites.reduce((n, r) => n + r.occurrences, 0)
		},
		null,
		'\t'
	)}\n`
)

const total = rewrites.reduce((n, r) => n + r.occurrences, 0)
console.log(`effect@${effectPkg.version}`)
console.log(`broken nominal families before: ${broken.length}`)
console.log(`mappings proven and applied:    ${accepted.length}`)
console.log(`nominal families rewritten:     ${accepted.reduce((n, a) => n + a.repaired.length, 0)}`)
console.log(`files+string rewrites:          ${rewrites.length}`)
console.log(`total occurrences rewritten:    ${total}`)
for (const { mapping, repaired } of accepted) {
	console.log(`  ${mapping.from}* -> ${mapping.to}*  [${mapping.reason}] ${repaired.length} families, ${repaired.reduce((n, r) => n + r.occurrences, 0)}x`)
}
const unresolved = accepted.flatMap((a) => a.unresolved)
if (unresolved.length > 0) {
	console.log('\nrepaired by no mapping (target not proven to exist):')
	for (const row of unresolved) console.log(`  ${row.from} -> ${row.to} (${row.occurrences}x)`)
}
