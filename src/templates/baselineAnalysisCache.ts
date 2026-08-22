import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { posix, resolve } from 'node:path'

import ts from 'typescript'

import { canonicalizeJson } from './artifactIdentity.js'
import {
	buildCapturedTypeScriptProject,
	type CapturedTypeScriptProjectOptions,
	type CapturedTypeScriptProjectResult
} from './capturedProject.js'
import { compareCodeUnits } from './deterministic.js'

const BASELINE_CACHE_IDENTITY_VERSION = 1
const DEFAULT_MAX_ENTRIES = 16
const DEFAULT_MAX_BYTES = 16 * 1024 * 1024
const DEFAULT_WORKSPACE_ROOT = '/__synthesize_regions_workspace__'

interface BaselineAnalysisInput extends CapturedTypeScriptProjectOptions {
	/** Untrusted snapshot identity is supplemental to, never a replacement for, exact content hashes. */
	readonly workspaceSnapshotId?: string
	/** Package-private collision seam used only by the cache identity tests. */
	readonly compilerIdentityForTesting?: string
}

interface CacheEntry {
	readonly result: CapturedTypeScriptProjectResult
	readonly retainedBytes: number
}

/** Content-free cache and compiler timing counters used by tests and the read-only benchmark. */
export interface BaselineAnalysisCacheStats {
	readonly hits: number
	readonly misses: number
	readonly stores: number
	readonly evictions: number
	readonly entries: number
	readonly retainedBytes: number
	readonly baselineAnalysisCalls: number
	readonly baselineAnalysisMilliseconds: number
	readonly baselineLookupMilliseconds: number
	readonly candidateAnalysisCalls: number
	readonly candidateAnalysisMilliseconds: number
}

interface MutableStats {
	hits: number
	misses: number
	stores: number
	evictions: number
	baselineAnalysisCalls: number
	baselineAnalysisMilliseconds: number
	baselineLookupMilliseconds: number
	candidateAnalysisCalls: number
	candidateAnalysisMilliseconds: number
}

let maxEntries = DEFAULT_MAX_ENTRIES
let maxBytes = DEFAULT_MAX_BYTES
let retainedBytes = 0
const entries = new Map<string, CacheEntry>()
let stats: MutableStats = emptyStats()

function emptyStats(): MutableStats {
	return {
		hits: 0,
		misses: 0,
		stores: 0,
		evictions: 0,
		baselineAnalysisCalls: 0,
		baselineAnalysisMilliseconds: 0,
		baselineLookupMilliseconds: 0,
		candidateAnalysisCalls: 0,
		candidateAnalysisMilliseconds: 0
	}
}

function portable(path: string): string {
	return posix.normalize(path.replace(/\\/gu, '/'))
}

function sha256(value: string): string {
	return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`
}

function effectiveInputs(input: BaselineAnalysisInput): {
	readonly consistent: boolean
	readonly workspaceRoot: string
	readonly files: readonly { readonly path: string; readonly byteLength: number; readonly contentHash: string }[]
	readonly tsConfigFilePath: string | null
	readonly authorizedProjectReferences: readonly string[]
} {
	const workspaceRoot = portable(resolve(input.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT))
	const effectiveFiles = new Map<string, string>()
	let consistent = true
	for (const [path, sourceText] of input.files) {
		const effectivePath = portable(resolve(workspaceRoot, path))
		if (effectiveFiles.has(effectivePath)) consistent = false
		effectiveFiles.set(effectivePath, sourceText)
	}
	const files = [...effectiveFiles.entries()]
		.sort(([left], [right]) => compareCodeUnits(left, right))
		.map(([path, sourceText]) => ({
			path,
			byteLength: Buffer.byteLength(sourceText, 'utf8'),
			contentHash: sha256(sourceText)
		}))
	const authorizedProjectReferences = [...new Set((input.authorizedProjectReferences ?? [])
		.map(path => portable(resolve(workspaceRoot, path))))]
		.sort(compareCodeUnits)
	return {
		consistent,
		workspaceRoot,
		files,
		tsConfigFilePath: input.tsConfigFilePath === undefined
			? null
			: portable(resolve(workspaceRoot, input.tsConfigFilePath)),
		authorizedProjectReferences
	}
}

function cacheKey(input: BaselineAnalysisInput): { readonly key: string; readonly consistent: boolean } {
	const effective = effectiveInputs(input)
	const compilerIdentity = input.compilerIdentityForTesting
		?? `typescript-${ts.version};captured-project-${BASELINE_CACHE_IDENTITY_VERSION}`
	const payload = canonicalizeJson([
		'captured-typescript-baseline',
		BASELINE_CACHE_IDENTITY_VERSION,
		compilerIdentity,
		input.workspaceSnapshotId ?? null,
		effective.workspaceRoot,
		effective.tsConfigFilePath,
		effective.authorizedProjectReferences,
		input.semantic,
		effective.files
	])
	return { key: sha256(payload), consistent: effective.consistent }
}

function cloneAsPlainData(result: CapturedTypeScriptProjectResult): CapturedTypeScriptProjectResult {
	const serialized = JSON.stringify(result)
	if (serialized === undefined) throw new TypeError('Captured TypeScript analysis result is not serializable plain data.')
	return JSON.parse(serialized) as CapturedTypeScriptProjectResult
}

function deepFreeze(value: unknown, seen = new Set<object>()): void {
	if (typeof value !== 'object' || value === null || seen.has(value)) return
	seen.add(value)
	for (const child of Object.values(value)) deepFreeze(child, seen)
	Object.freeze(value)
}

function cacheable(result: CapturedTypeScriptProjectResult, consistent: boolean): boolean {
	return consistent && !result.issues.some(issue => issue.kind === 'configuration')
}

function evictOldest(): void {
	const oldestKey = entries.keys().next().value as string | undefined
	if (oldestKey === undefined) return
	const oldest = entries.get(oldestKey)!
	entries.delete(oldestKey)
	retainedBytes -= oldest.retainedBytes
	stats.evictions += 1
}

function store(key: string, result: CapturedTypeScriptProjectResult): CapturedTypeScriptProjectResult {
	const immutable = cloneAsPlainData(result)
	deepFreeze(immutable)
	const retained = Buffer.byteLength(key, 'utf8') + Buffer.byteLength(JSON.stringify(immutable), 'utf8')
	if (retained > maxBytes) return result

	const replaced = entries.get(key)
	if (replaced !== undefined) {
		entries.delete(key)
		retainedBytes -= replaced.retainedBytes
	}
	entries.set(key, { result: immutable, retainedBytes: retained })
	retainedBytes += retained
	stats.stores += 1
	while (entries.size > maxEntries || retainedBytes > maxBytes) evictOldest()
	return immutable
}

/** Analyze an immutable captured workspace baseline, reusing only frozen plain-data successes. */
export function analyzeCapturedTypeScriptBaseline(input: BaselineAnalysisInput): CapturedTypeScriptProjectResult {
	// Key construction and compiler analysis consume the same defensive snapshot.
	// This prevents a caller-owned Map or reference array from changing between
	// hashing and program construction.
	const capturedInput: BaselineAnalysisInput = {
		files: new Map(input.files),
		...(input.workspaceRoot === undefined ? {} : { workspaceRoot: input.workspaceRoot }),
		...(input.workspaceSnapshotId === undefined ? {} : { workspaceSnapshotId: input.workspaceSnapshotId }),
		...(input.tsConfigFilePath === undefined ? {} : { tsConfigFilePath: input.tsConfigFilePath }),
		semantic: input.semantic,
		...(input.authorizedProjectReferences === undefined
			? {}
			: { authorizedProjectReferences: [...input.authorizedProjectReferences] }),
		...(input.compilerIdentityForTesting === undefined
			? {}
			: { compilerIdentityForTesting: input.compilerIdentityForTesting })
	}
	const lookupStarted = performance.now()
	const identity = cacheKey(capturedInput)
	const existing = identity.consistent ? entries.get(identity.key) : undefined
	stats.baselineLookupMilliseconds += performance.now() - lookupStarted
	if (existing !== undefined) {
		entries.delete(identity.key)
		entries.set(identity.key, existing)
		stats.hits += 1
		return existing.result
	}
	stats.misses += 1

	const analysisStarted = performance.now()
	let result: CapturedTypeScriptProjectResult
	try {
		result = buildCapturedTypeScriptProject({
			files: capturedInput.files,
			...(capturedInput.workspaceRoot === undefined ? {} : { workspaceRoot: capturedInput.workspaceRoot }),
			...(capturedInput.tsConfigFilePath === undefined ? {} : { tsConfigFilePath: capturedInput.tsConfigFilePath }),
			semantic: capturedInput.semantic,
			...(capturedInput.authorizedProjectReferences === undefined
				? {}
				: { authorizedProjectReferences: capturedInput.authorizedProjectReferences })
		})
	} finally {
		stats.baselineAnalysisCalls += 1
		stats.baselineAnalysisMilliseconds += performance.now() - analysisStarted
	}
	return cacheable(result, identity.consistent) ? store(identity.key, result) : result
}

/** Record one uncached candidate analysis without retaining candidate identities or source. */
export function recordCandidateAnalysis(durationMilliseconds: number): void {
	stats.candidateAnalysisCalls += 1
	stats.candidateAnalysisMilliseconds += durationMilliseconds
}

/** Read content-free cache/timing diagnostics. This module is intentionally absent from the public barrel. */
export function baselineAnalysisCacheStats(): BaselineAnalysisCacheStats {
	return Object.freeze({ ...stats, entries: entries.size, retainedBytes })
}

/** Clear process-local baseline analysis state. Intended for deterministic tests and benchmarks. */
export function resetBaselineAnalysisCacheForTesting(): void {
	entries.clear()
	retainedBytes = 0
	stats = emptyStats()
	maxEntries = DEFAULT_MAX_ENTRIES
	maxBytes = DEFAULT_MAX_BYTES
}

/** Override private cache limits for deterministic eviction tests. */
export function configureBaselineAnalysisCacheForTesting(limits: {
	readonly maxEntries: number
	readonly maxBytes: number
}): void {
	if (!Number.isSafeInteger(limits.maxEntries) || limits.maxEntries < 1) {
		throw new RangeError('Baseline cache maxEntries must be a positive safe integer.')
	}
	if (!Number.isSafeInteger(limits.maxBytes) || limits.maxBytes < 1) {
		throw new RangeError('Baseline cache maxBytes must be a positive safe integer.')
	}
	entries.clear()
	retainedBytes = 0
	stats = emptyStats()
	maxEntries = limits.maxEntries
	maxBytes = limits.maxBytes
}
