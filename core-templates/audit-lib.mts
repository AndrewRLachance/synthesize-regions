/**
 * Shared audit utilities for the Effect V4 catalog canonicalization.
 *
 * These helpers are intentionally dependency-light: they only rely on the
 * template definition contract exposed by `defineTemplate`, so the audit can
 * enumerate real (factory-materialized) templates rather than guessing from
 * source text.
 */
import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const coreTemplatesDir = dirname(fileURLToPath(import.meta.url))

/** Loosely-typed view of a materialized `GraphTemplateDefinition`. */
export interface TemplateLike {
	modelId: string
	version?: string
	description?: string
	typeParameters?: Record<string, unknown>
	inputs: Record<string, { regionKind?: string; description?: string }>
	output: { kind: string; description?: string; type?: unknown }
	source: string
	importRequirements?: readonly unknown[]
	callableScope?: unknown
	manifestDigest?: string
	invoke?: unknown
	invokePartial?: unknown
}

const TEMPLATE_ARRAYS = new Set<string>()

/** True when `value` looks like one materialized template definition. */
export function isTemplateDefinition(value: unknown): value is TemplateLike {
	if (typeof value !== 'object' || value === null) return false
	const candidate = value as Record<string, unknown>
	return typeof candidate.modelId === 'string'
		&& typeof candidate.source === 'string'
		&& typeof candidate.output === 'object'
		&& candidate.output !== null
		&& typeof candidate.inputs === 'object'
		&& candidate.inputs !== null
}

/** List every `.ts` module in `core-templates`, sorted for determinism. */
export function listCoreTemplateModules(): string[] {
	return readdirSync(coreTemplatesDir)
		.filter((name) => name.endsWith('.ts') && !name.endsWith('.d.ts'))
		.filter((name) => !name.startsWith('validate-'))
		.filter((name) => !name.endsWith('-work-todo.md'))
		.sort()
}

/**
 * Modules that only re-export or aggregate already-discovered packs.
 *
 * These are kept as provenance, but their templates are deduplicated by
 * `modelId` + `manifestDigest` so the inventory reports each logical
 * definition once.
 */
export function classifyModuleName(fileName: string): 'pack' | 'aggregator' | 'helpers' {
	const base = fileName.replace(/\.ts$/, '')
	if (base.endsWith('-template-catalog')) return 'aggregator'
	if (base.endsWith('-template-helpers')) return 'helpers'
	if (base === 'catalog' || base === 'sample-definition') return 'aggregator'
	if (base === 'audit-lib') return 'helpers'
	if (base.startsWith('effect-v4-canonical')) return 'helpers'
	return 'pack'
}

/** Import a module by file name from `core-templates`, tolerating load errors. */
export async function importCoreTemplateModule(
	fileName: string
): Promise<{ exports: Record<string, unknown>; error?: string }> {
	const absolute = join(coreTemplatesDir, fileName)
	const jsSpecifier = absolute.replace(/\.ts$/, '.js')
	try {
		const mod = (await import(pathToFileURL(jsSpecifier).href)) as Record<string, unknown>
		return { exports: mod }
	} catch (error) {
		try {
			const mod = (await import(pathToFileURL(absolute).href)) as Record<string, unknown>
			return { exports: mod }
		} catch (inner) {
			return {
				exports: {},
				error: inner instanceof Error ? inner.message : String(inner)
			}
		}
	}
}

/**
 * Extract every array-of-template-definitions export from a module namespace.
 *
 * Returns one record per (exportName, array) so that a single module exporting
 * two independent packs is fully represented.
 */
export function collectTemplateArrays(exports: Record<string, unknown>): Array<{
	exportName: string
	templates: TemplateLike[]
}> {
	const found: Array<{ exportName: string; templates: TemplateLike[] }> = []
	for (const [exportName, value] of Object.entries(exports)) {
		if (!Array.isArray(value)) continue
		const templates = value.filter(isTemplateDefinition)
		// Arrays that are uniformly template arrays count; arrays that merely
		// contain some templates still count but are flagged by the caller.
		if (templates.length === 0) continue
		found.push({
			exportName,
			templates: templates as TemplateLike[]
		})
	}
	return found
}

/** Sorted, de-duplicated import specifiers referenced by a template source. */
export function sourceImportSpecifiers(source: string): string[] {
	const specs = new Set<string>()
	const pattern = /from\s+['"]([^'"]+)['"]/g
	let match: RegExpExecArray | null
	while ((match = pattern.exec(source)) !== null) specs.add(match[1]!)
	return [...specs].sort()
}

/** Marker ownership extraction from a `marker(...)` source fragment. */
export function extractMarkers(source: string): Array<{
	kind: string
	id: string
	occurrences: number
}> {
	const pattern = /\/\*\* @TYPE ([a-zA-Z]+) id=([^\s]+) \*\*\//g
	const counts = new Map<string, { kind: string; id: string; occurrences: number }>()
	let match: RegExpExecArray | null
	while ((match = pattern.exec(source)) !== null) {
		const kind = match[1]!
		const id = match[2]!
		const key = `${kind}::${id}`
		const existing = counts.get(key)
		if (existing) existing.occurrences += 1
		else counts.set(key, { kind, id, occurrences: 1 })
	}
	return [...counts.values()]
}

/** Deterministic sort by `modelId` then digest. */
export function byModelId(a: { modelId: string }, b: { modelId: string }): number {
	return a.modelId < b.modelId ? -1 : a.modelId > b.modelId ? 1 : 0
}

export function resolveFromHere(...parts: string[]): string {
	return resolve(coreTemplatesDir, ...parts)
}
