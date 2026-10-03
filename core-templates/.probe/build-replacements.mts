/**
 * Build `effect-v4-template-replacements.json` from the working tree.
 *
 * Tracked files are read from `git diff`; untracked files (the packs that were
 * authored during this audit and never committed) are read from the working
 * tree directly, counting the replacement spelling. Every API spelling that
 * Phase 10 rewrote is recorded with its file and occurrence count so the
 * lineage from the V3-era catalog to the rc.117 canonical catalog is explicit.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

interface Rule {
	from: string
	to: string
	reason: string
	justification: string
	/** Set when the diff shows a call-site argument change rather than the qualified name. */
	callSite?: boolean
}

const REWRITES: Rule[] = [
	{
		from: 'Socket.Socket.of({})',
		to: 'Socket.make({ reader: Effect.succeed({ pull: Effect.succeed([\'\'] as const), upgrade: () => Effect.void }), writer: Effect.succeed({ write: () => Effect.void, writeAll: () => Effect.void }) })',
		reason: 'missing-member',
		justification: 'rc.117 has no `Socket.of`. `Socket.make` is the constructor that takes the scoped reader and scoped writer acquisitions directly.'
	},
	{ from: 'Layer.scopedDiscard', to: 'Layer.effectDiscard', reason: 'missing-member', justification: 'rc.117 renamed `Layer.scopedDiscard` to `Layer.effectDiscard`; the signature is unchanged.' },
	{ from: 'Layer.scoped(', to: 'Layer.effect(', reason: 'missing-member', justification: 'rc.117 has no `Layer.scoped`. `Layer.effect(tag, effect)` is the constructor that builds a layer into a `Context.Key` from an Effect.' },
	{ from: 'Layer.unwrapEffect', to: 'Layer.unwrap', reason: 'missing-member', justification: 'rc.117 renamed `Layer.unwrapEffect` to `Layer.unwrap`; it takes the `Effect<Layer<...>>` directly.' },
	{ from: 'Effect.catchAll(', to: 'Effect.catch(', reason: 'missing-member', justification: 'rc.117 renamed `Effect.catchAll` to `Effect.catch`.' },
	{ from: 'Effect.zipRight(', to: 'Effect.andThen(', reason: 'missing-member', justification: 'rc.117 has no `Effect.zipRight`. `Effect.andThen(self, that)` with an Effect second argument discards the first value, which is what `zipRight` did.' },
	{ from: 'Effect.either(', to: 'Effect.result(', reason: 'missing-member', justification: 'rc.117 replaced `Either` with `Result`; `Effect.either` became `Effect.result`.' },
	{ from: 'Effect.orElse(', to: 'Effect.catchCause(', reason: 'missing-member', justification: 'rc.117 has no `Effect.orElse`. `Effect.catchCause` recovers from the whole `Cause`, which is what `orElse` did.' },
	{ from: 'Effect.makeLatch(', to: 'Latch.make(', reason: 'missing-member', justification: 'rc.117 moved latch construction to `effect/Latch`.' },
	{ from: 'Effect.makeSemaphore(', to: 'Semaphore.make(', reason: 'missing-member', justification: 'rc.117 moved semaphore construction to `effect/Semaphore`.' },
	{ from: 'Schema.decodeUnknown(', to: 'Schema.decodeUnknownEffect(', reason: 'missing-member', justification: 'rc.117 renamed the effectful unknown decoder to `Schema.decodeUnknownEffect`.' },
	{ from: '.makeEffect(', to: 'SchemaParser.makeEffect(', reason: 'missing-member', justification: 'rc.117 has no `Schema.makeEffect` method; the curried `SchemaParser.makeEffect(schema)(input)` is the replacement.' },
	{ from: '.makeOption(', to: 'SchemaParser.makeOption(', reason: 'missing-member', justification: 'rc.117 has no `Schema.makeOption` method; the curried `SchemaParser.makeOption(schema)(input)` is the replacement.' },
	{ from: 'Schema.toArbitrary(', to: 'Arbitrary.schema(', reason: 'missing-member', justification: 'rc.117 has no `Schema.toArbitrary`. `Arbitrary.schema` in `effect/unstable/arbitrary` derives an Arbitrary from a schema.' },
	{ from: 'Config.mapOrFail(', to: 'Config.mapEffect(', reason: 'missing-member', justification: 'rc.117 renamed `Config.mapOrFail` to `Config.mapEffect`.' },
	// The PascalCase Config constructors appear in the diff as call-site argument
	// changes on the `primitiveConfig` helper, not as qualified-name rewrites.
	{ from: "primitiveConfig('ConfigString', 'string'", to: "primitiveConfig('ConfigString', 'String'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true },
	{ from: "primitiveConfig('ConfigNonEmptyString', 'nonEmptyString'", to: "primitiveConfig('ConfigNonEmptyString', 'NonEmptyString'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true },
	{ from: "primitiveConfig('ConfigFinite', 'finite'", to: "primitiveConfig('ConfigFinite', 'Finite'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true },
	{ from: "primitiveConfig('ConfigInt', 'int'", to: "primitiveConfig('ConfigInt', 'Int'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true },
	{ from: "primitiveConfig('ConfigPort', 'port'", to: "primitiveConfig('ConfigPort', 'Port'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true },
	{ from: "primitiveConfig('ConfigBoolean', 'boolean'", to: "primitiveConfig('ConfigBoolean', 'Boolean'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true },
	{ from: "primitiveConfig('ConfigDuration', 'duration'", to: "primitiveConfig('ConfigDuration', 'Duration'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true },
	{ from: "primitiveConfig('ConfigDate', 'date'", to: "primitiveConfig('ConfigDate', 'Date'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true },
	{ from: "primitiveConfig('ConfigUrl', 'url'", to: "primitiveConfig('ConfigUrl', 'URL'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true },
	{ from: "primitiveConfig('ConfigLogLevel', 'logLevel'", to: "primitiveConfig('ConfigLogLevel', 'LogLevel'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true },
	{ from: "primitiveConfig('ConfigRedacted', 'redacted'", to: "primitiveConfig('ConfigRedacted', 'Redacted'", reason: 'missing-member', justification: 'rc.117 spells the Config constructors in PascalCase.', callSite: true }
]

const REMOVALS = [
	{
		modelId: 'SchemaToArbitraryLazy',
		was: 'Schema.toArbitraryLazy(schema)',
		reason: 'missing-member',
		justification: 'rc.117 has no lazy schema-to-Arbitrary factory at all — only `Arbitrary.schema` in `effect/unstable/arbitrary`. A template that generated a call to a non-existent API would be worse than no template, so the definition is dropped. `SchemaToArbitrary` is its surviving sibling.'
	}
]

const root = process.cwd()
const git = (args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })

const tracked = git(['diff', '--name-only', '--', 'core-templates/']).split('\n').filter((n) => n.endsWith('.ts'))
const untracked = git(['ls-files', '--others', '--exclude-standard', '--', 'core-templates/'])
	.split('\n')
	.filter((n) => n.endsWith('.ts'))

interface Entry {
	file: string
	from: string
	to: string
	reason: string
	justification: string
	occurrences: number
}

const entries: Entry[] = []

for (const file of tracked) {
	const diff = git(['diff', '--', file])
	for (const rule of REWRITES) {
		let count = 0
		for (const line of diff.split('\n')) {
			if (!line.startsWith('-') || line.startsWith('---')) continue
			count += line.slice(1).split(rule.from).length - 1
		}
		if (count > 0) {
			entries.push({ file, from: rule.from, to: rule.to, reason: rule.reason, justification: rule.justification, occurrences: count })
		}
	}
}

// Untracked packs have no diff to read, and counting the replacement spelling
// would also count pre-existing occurrences the audit never touched. The changes
// made to them are recorded explicitly instead.
const UNTRACKED_CHANGES: Array<{ file: string; from: string; to: string; occurrences: number; note?: string }> = [
	{ file: 'core-templates/effect-v4-child-process-os-integration-templates.ts', from: 'Layer.scopedDiscard', to: 'Layer.effectDiscard', occurrences: 1 },
	{ file: 'core-templates/effect-v4-cluster-distributed-service-templates.ts', from: 'Layer.scopedDiscard', to: 'Layer.effectDiscard', occurrences: 1 },
	{ file: 'core-templates/effect-v4-eventlog-offline-first-templates.ts', from: 'Layer.scopedDiscard', to: 'Layer.effectDiscard', occurrences: 2 },
	{
		file: 'core-templates/effect-v4-security-cross-boundary-templates.ts',
		from: 'Layer.unwrapEffect',
		to: 'Layer.unwrap',
		occurrences: 3
	},
	{
		file: 'core-templates/effect-v4-security-cross-boundary-templates.ts',
		from: 'Effect.catchAll(',
		to: 'Effect.catch(',
		occurrences: 3
	},
	{
		file: 'core-templates/effect-v4-security-cross-boundary-templates.ts',
		from: 'Effect.zipRight(',
		to: 'Effect.andThen(',
		occurrences: 1,
		note: 'Single occurrence inside the `authnAuthzLayers` helper, which is shared by the API-key, Basic, and Bearer authn-authz templates.'
	},
	{
		file: 'core-templates/effect-v4-security-foundational-templates.ts',
		from: 'Effect.zipRight(',
		to: 'Effect.andThen(',
		occurrences: 1
	}
]

for (const change of UNTRACKED_CHANGES) {
	const rule = REWRITES.find((candidate) => candidate.from === change.from)
	entries.push({
		file: change.file,
		from: change.from,
		to: change.to,
		reason: rule?.reason ?? 'missing-member',
		justification: rule?.justification ?? '',
		occurrences: change.occurrences,
		...(change.note ? { note: change.note } : {})
	})
}

entries.sort((a, b) => a.file.localeCompare(b.file) || b.occurrences - a.occurrences)

const out = {
	effectVersion: '4.0.0-rc.117',
	phase: 'Phase 10 — API verification against the pinned package',
	summary: {
		rewrites: entries.length,
		occurrences: entries.reduce((sum, entry) => sum + entry.occurrences, 0),
		removals: REMOVALS.length
	},
	rewrites: entries,
	removals: REMOVALS
}

writeFileSync(join(root, 'core-templates/effect-v4-template-replacements.json'), `${JSON.stringify(out, null, '\t')}\n`)
console.log(`rewrites: ${out.summary.rewrites} rules, ${out.summary.occurrences} occurrences, ${out.summary.removals} removals`)
for (const r of entries) console.log(`  ${r.file}: ${r.from} -> ${r.to} (${r.occurrences})`)
