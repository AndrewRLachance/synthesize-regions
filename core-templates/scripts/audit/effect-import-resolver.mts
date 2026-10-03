/**
 * Phase 3 — verify every import specifier used by catalog template sources
 * against the pinned `effect` package.
 *
 * Resolution mirrors Node's `exports` map handling, then checks that the
 * resolved file actually exists on disk. The `effect` package ships a `"./*"`
 * wildcard, so a specifier can be *declared* and still be unresolvable; only the
 * on-disk check proves an import path is real.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve as pathResolve } from 'node:path'
import { coreTemplatesDir } from './lib.mts'

const repoRoot = pathResolve(coreTemplatesDir, '..')
const effectDir = join(repoRoot, 'node_modules', 'effect')
const effectPkg = JSON.parse(readFileSync(join(effectDir, 'package.json'), 'utf8')) as {
	name: string
	version: string
	exports: Record<string, string | null>
}

/** Packages that generated source may reference but that are not installed here. */
const externalPackages = new Set([
	'@effect/platform-node',
	'@effect/platform-bun',
	'@effect/platform-browser',
	'@effect/vitest',
	'@effect/sql-pg',
	'@effect/opentelemetry',
	'@effect/openapi-generator/OpenApiGenerator'
])

export interface Resolution {
	specifier: string
	kind: 'effect' | 'external' | 'other'
	status: 'resolves' | 'missing' | 'external-not-installed' | 'not-effect'
	/** The `exports` entry selected, when one matched. */
	matchedExport?: string
	/** File path the exports map pointed at, when one matched. */
	target?: string
	note?: string
}

/** Resolve one `effect...` subpath against the package exports map. */
export function resolveEffectSpecifier(specifier: string): Resolution {
	if (specifier === 'effect') {
		const target = join(effectDir, 'dist/index.js')
		return {
			specifier,
			kind: 'effect',
			status: existsSync(target) ? 'resolves' : 'missing',
			matchedExport: '.',
			target
		}
	}
	if (!specifier.startsWith('effect/')) {
		const bare = specifier.split('/')[0]!.startsWith('@')
			? specifier.split('/').slice(0, 2).join('/')
			: specifier.split('/')[0]!
		return {
			specifier,
			kind: externalPackages.has(bare) ? 'external' : 'other',
			status: externalPackages.has(bare) ? 'external-not-installed' : 'not-effect'
		}
	}

	// Export keys are `./`-prefixed, so the subpath must keep that prefix for
	// both exact and pattern matching.
	const subpath = `./${specifier.slice('effect/'.length)}`
	const exportsMap = effectPkg.exports

	// Exact match first (e.g. `./unstable/cluster`, `./testing`).
	const exact = subpath
	if (Object.prototype.hasOwnProperty.call(exportsMap, exact)) {
		const mapped = exportsMap[exact]
		if (mapped === null) {
			return { specifier, kind: 'effect', status: 'missing', matchedExport: exact, note: 'exports entry is null' }
		}
		const target = join(effectDir, mapped)
		return {
			specifier,
			kind: 'effect',
			status: existsSync(target) ? 'resolves' : 'missing',
			matchedExport: exact,
			target
		}
	}

	// Pattern matches, longest prefix wins, mirroring Node's algorithm.
	let best: { key: string; target: string } | undefined
	for (const [key, mapped] of Object.entries(exportsMap)) {
		if (mapped === null) continue
		const star = key.indexOf('*')
		if (star === -1) continue
		const prefix = key.slice(0, star)
		const suffix = key.slice(star + 1)
		if (!subpath.startsWith(prefix)) continue
		if (suffix && !subpath.endsWith(suffix)) continue
		const middle = subpath.slice(prefix.length, suffix ? subpath.length - suffix.length : undefined)
		const candidate = mapped.replace('*', middle)
		if (!best || key.length > best.key.length) best = { key, target: candidate }
	}

	if (best) {
		const target = join(effectDir, best.target)
		return {
			specifier,
			kind: 'effect',
			status: existsSync(target) ? 'resolves' : 'missing',
			matchedExport: best.key,
			target,
			...(existsSync(target) ? {} : { note: 'exports pattern matched but the target file does not exist' })
		}
	}

	return { specifier, kind: 'effect', status: 'missing', note: 'no exports entry or pattern matched' }
}

/** Every top-level directory actually published under `dist/unstable`. */
export function unstableBarrels(): string[] {
	const base = join(effectDir, 'dist', 'unstable')
	if (!existsSync(base)) return []
	return readdirSync(base, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort()
}

/** Every promoted (non-`unstable`) single-module barrel present in `dist`. */
export function promotedModules(): string[] {
	const base = join(effectDir, 'dist')
	return readdirSync(base, { withFileTypes: true })
		.map((entry) => entry.name)
		.filter((name) => name.endsWith('.d.ts') && name !== 'index.d.ts')
		.map((name) => name.replace(/\.d\.ts$/, ''))
		.sort()
}

export { effectPkg, effectDir, externalPackages }
