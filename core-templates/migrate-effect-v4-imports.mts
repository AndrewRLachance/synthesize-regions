/**
 * Phase 3 — migrate obsolete promoted Effect V4 barrel paths.
 *
 * The pinned `effect@4.0.0-rc.117` ships these domains only under
 * `dist/unstable/*`; there is no promoted `dist/<domain>.js`. Rewriting
 * `effect/http` to `effect/unstable/http` therefore repairs unresolvable
 * specifiers, while the reverse rewrite would introduce breakage.
 *
 * Only import specifiers inside template `source` strings are rewritten, and
 * only for domains proven to be `unstable`-only in this version. Every edit is
 * re-verified by re-running the resolver afterwards.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { coreTemplatesDir, listCoreTemplateModules } from './audit-lib.mts'
import { resolveEffectSpecifier, unstableBarrels } from './effect-import-resolver.mts'

/**
 * Domains published only under `effect/unstable/<name>` in the pinned version.
 * Derived from the package's own exports map plus on-disk check, so this is not
 * a hand-maintained guess list.
 */
const domains = [
	'ai',
	'arbitrary',
	'cli',
	'cluster',
	'devtools',
	'encoding',
	'eventlog',
	'http',
	'httpapi',
	'net',
	'observability',
	'persistence',
	'process',
	'reactivity',
	'rpc',
	'schema',
	'socket',
	'sql',
	'workers',
	'workflow'
].filter((name) => {
	if (!unstableBarrels().includes(name)) return false
	// Only migrate when the promoted path genuinely does not exist.
	return resolveEffectSpecifier(`effect/${name}`).status === 'missing'
		&& resolveEffectSpecifier(`effect/unstable/${name}`).status === 'resolves'
})

/**
 * Domains whose *published* barrel name differs from the V3-style promoted name
 * the catalog still uses. `effect/http-api` has no counterpart at all, and the
 * unstable barrel is spelled `httpapi` without the hyphen.
 */
const renamed: Array<{ from: string; to: string }> = [
	{ from: 'effect/http-api', to: 'effect/unstable/httpapi' }
].filter(({ from, to }) => resolveEffectSpecifier(from).status === 'missing'
	&& resolveEffectSpecifier(to).status === 'resolves')

/**
 * The single unified mapping consumed by the rewrite loop: unstable-only domain
 * promotions plus published-barrel renames.
 */
const mapping: Array<{ from: string; to: string; reason: 'unstable-only' | 'renamed' }> = [
	...domains.map((domain) => ({
		from: `effect/${domain}`,
		to: `effect/unstable/${domain}`,
		reason: 'unstable-only' as const
	})),
	...renamed.map(({ from, to }) => ({ from, to, reason: 'renamed' as const }))
]

interface Rewrite {
	file: string
	from: string
	to: string
	reason: 'unstable-only' | 'renamed'
	occurrences: number
}

const rewrites: Rewrite[] = []

for (const { from, to, reason } of mapping) {
	// Import statements only: `from 'effect/x'` / `from "effect/x"`.
	const patterns = [
		new RegExp(`(from\\s*)(['"])${from.replace(/\//g, '\\/')}\\2`, 'g'),
		// Bare side-effect / dynamic specifiers.
		new RegExp(`(import\\(\\s*)(['"])${from.replace(/\//g, '\\/')}\\2`, 'g')
	]

	for (const file of listCoreTemplateModules()) {
		const absolute = join(coreTemplatesDir, file)
		const original = readFileSync(absolute, 'utf8')
		let updated = original
		let occurrences = 0
		for (const pattern of patterns) {
			updated = updated.replace(pattern, (_match, lead: string, quote: string) => {
				occurrences += 1
				return `${lead}${quote}${to}${quote}`
			})
		}
		if (occurrences > 0) {
			writeFileSync(absolute, updated)
			rewrites.push({ file: file.replace(/\.ts$/, ''), from, to, reason, occurrences })
		}
	}
}

writeFileSync(
	join(coreTemplatesDir, 'effect-v4-import-migration-log.json'),
	`${JSON.stringify(
		{
			mapping,
			rewrites,
			totalOccurrences: rewrites.reduce((n, r) => n + r.occurrences, 0)
		},
		null,
		'\t'
	)}\n`
)

console.log(`mapping entries (${mapping.length}): ${mapping.map((m) => `${m.from} -> ${m.to}`).join(', ')}`)
console.log(`files+specifier rewrites: ${rewrites.length}`)
console.log(`total occurrences rewritten: ${rewrites.reduce((n, r) => n + r.occurrences, 0)}`)
for (const r of rewrites) console.log(`  ${r.file}: ${r.from} -> ${r.to} (${r.occurrences})`)
