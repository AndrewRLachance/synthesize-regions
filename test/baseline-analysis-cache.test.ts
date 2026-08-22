import { beforeEach, describe, expect, it } from 'vitest'

import {
	buildCapturedTypeScriptProject,
	compileArtifactSet,
	createArtifactSetWorkspaceSnapshotHash,
	createTemplateRegistry,
	defineTemplate,
	type ArtifactSetPlan
} from '../src/index.js'
import {
	analyzeCapturedTypeScriptBaseline,
	baselineAnalysisCacheStats,
	configureBaselineAnalysisCacheForTesting,
	resetBaselineAnalysisCacheForTesting
} from '../src/templates/baselineAnalysisCache.js'

const TSCONFIG = JSON.stringify({
	compilerOptions: {
		target: 'ES2022', module: 'ES2022', moduleResolution: 'Bundler', strict: true, skipLibCheck: true
	},
	include: ['src/**/*.ts']
})

function capturedFiles(source = 'export const value: string = 1;'): Map<string, string> {
	return new Map([
		['tsconfig.json', TSCONFIG],
		['src/base.ts', source]
	])
}

beforeEach(() => resetBaselineAnalysisCacheForTesting())

describe('captured TypeScript baseline analysis cache', () => {
	it('returns frozen plain-data hits with exact diagnostic parity', () => {
		const input = {
			files: capturedFiles(),
			workspaceRoot: '/virtual/cache-parity',
			workspaceSnapshotId: 'snapshot-parity',
			tsConfigFilePath: 'tsconfig.json',
			semantic: true
		}
		const uncached = buildCapturedTypeScriptProject(input)
		const cold = analyzeCapturedTypeScriptBaseline(input)
		const warm = analyzeCapturedTypeScriptBaseline(input)

		expect(cold).toEqual(uncached)
		expect(warm).toEqual(cold)
		expect(warm).toBe(cold)
		expect(Object.isFrozen(warm)).toBe(true)
		expect(Object.isFrozen(warm.issues)).toBe(true)
		expect(Object.isFrozen(warm.compilerOptions)).toBe(true)
		expect(() => (warm.issues as unknown[]).push({})).toThrow(TypeError)
		expect(baselineAnalysisCacheStats()).toMatchObject({ hits: 1, misses: 1, stores: 1, entries: 1 })
	})

	it('keeps syntax and semantic analysis in distinct entries', () => {
		const files = capturedFiles()
		const syntax = analyzeCapturedTypeScriptBaseline({
			files, workspaceRoot: '/virtual/modes', tsConfigFilePath: 'tsconfig.json', semantic: false
		})
		const semantic = analyzeCapturedTypeScriptBaseline({
			files, workspaceRoot: '/virtual/modes', tsConfigFilePath: 'tsconfig.json', semantic: true
		})

		expect(syntax.issues.some(issue => issue.code === 2322)).toBe(false)
		expect(semantic.issues).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'semantic', code: 2322 })]))
		expect(baselineAnalysisCacheStats()).toMatchObject({ hits: 0, misses: 2, stores: 2, entries: 2 })
	})

	it('keys every captured-project identity input without trusting a snapshot ID', () => {
		const base = {
			files: capturedFiles('export const value = 1;'),
			workspaceRoot: '/virtual/key-a',
			workspaceSnapshotId: 'same-untrusted-id',
			tsConfigFilePath: 'tsconfig.json',
			semantic: false
		} as const
		const variants = [
			base,
			{ ...base, files: capturedFiles('export const value = 2;') },
			{ ...base, workspaceRoot: '/virtual/key-b' },
			{ ...base, workspaceSnapshotId: 'different-snapshot-id' },
			{ ...base, authorizedProjectReferences: ['references/a/tsconfig.json'] },
			{ ...base, authorizedProjectReferences: ['references/b/tsconfig.json'] },
			{ ...base, compilerIdentityForTesting: 'typescript-test-identity-a' },
			{ ...base, compilerIdentityForTesting: 'typescript-test-identity-b' }
		]
		for (const variant of variants) analyzeCapturedTypeScriptBaseline(variant)

		const alternateConfig = capturedFiles('export const value = 1;')
		alternateConfig.set('tsconfig.json', JSON.stringify({
			compilerOptions: { target: 'ES2020', strict: true }, include: ['src/**/*.ts']
		}))
		analyzeCapturedTypeScriptBaseline({ ...base, files: alternateConfig })
		const alternateConfigPath = new Map(base.files)
		alternateConfigPath.set('tsconfig.alternate.json', alternateConfigPath.get('tsconfig.json')!)
		analyzeCapturedTypeScriptBaseline({ ...base, files: alternateConfigPath, tsConfigFilePath: 'tsconfig.alternate.json' })

		expect(baselineAnalysisCacheStats()).toMatchObject({ hits: 0, misses: variants.length + 2, stores: variants.length + 2 })
	})

	it('does not cache malformed configuration and recovers at the same path', () => {
		const malformed = new Map([
			['tsconfig.json', '{ invalid json'],
			['src/base.ts', 'export const value = 1;']
		])
		const input = {
			files: malformed, workspaceRoot: '/virtual/failure-recovery',
			tsConfigFilePath: 'tsconfig.json', semantic: true
		}
		expect(analyzeCapturedTypeScriptBaseline(input).issues.some(issue => issue.kind === 'configuration')).toBe(true)
		expect(analyzeCapturedTypeScriptBaseline(input).issues.some(issue => issue.kind === 'configuration')).toBe(true)
		expect(baselineAnalysisCacheStats()).toMatchObject({ hits: 0, misses: 2, stores: 0, entries: 0 })

		const recovered = { ...input, files: capturedFiles('export const value = 1;') }
		expect(analyzeCapturedTypeScriptBaseline(recovered).issues).toEqual([])
		expect(analyzeCapturedTypeScriptBaseline(recovered).issues).toEqual([])
		expect(baselineAnalysisCacheStats()).toMatchObject({ hits: 1, misses: 3, stores: 1, entries: 1 })
	})

	it('evicts deterministically within entry and retained-byte bounds', () => {
		configureBaselineAnalysisCacheForTesting({ maxEntries: 2, maxBytes: 1_000_000 })
		const analyze = (snapshot: string) => analyzeCapturedTypeScriptBaseline({
			files: new Map(), workspaceSnapshotId: snapshot, semantic: false
		})
		analyze('a')
		analyze('b')
		analyze('c')
		expect(baselineAnalysisCacheStats()).toMatchObject({ misses: 3, stores: 3, evictions: 1, entries: 2 })
		analyze('a')
		expect(baselineAnalysisCacheStats()).toMatchObject({ hits: 0, misses: 4, stores: 4, evictions: 2, entries: 2 })
		expect(baselineAnalysisCacheStats().retainedBytes).toBeLessThanOrEqual(1_000_000)

		resetBaselineAnalysisCacheForTesting()
		analyzeCapturedTypeScriptBaseline({ files: new Map(), workspaceSnapshotId: 'measure', semantic: false })
		const oneEntryBytes = baselineAnalysisCacheStats().retainedBytes
		configureBaselineAnalysisCacheForTesting({ maxEntries: 10, maxBytes: oneEntryBytes + 8 })
		analyze('d')
		analyze('e')
		expect(baselineAnalysisCacheStats()).toMatchObject({ stores: 2, evictions: 1, entries: 1 })
		expect(baselineAnalysisCacheStats().retainedBytes).toBeLessThanOrEqual(oneEntryBytes + 8)
	})

	it('publishes no partial cache entry when input iteration is interrupted', () => {
		const interrupted = {
			[Symbol.iterator](): IterableIterator<[string, string]> {
				throw new Error('cancelled before analysis')
			},
			size: 1
		} as unknown as ReadonlyMap<string, string>
		expect(() => analyzeCapturedTypeScriptBaseline({ files: interrupted, semantic: true })).toThrow('cancelled')
		expect(baselineAnalysisCacheStats()).toMatchObject({ entries: 0, stores: 0 })

		const valid = analyzeCapturedTypeScriptBaseline({
			files: capturedFiles('export const value = 1;'),
			workspaceRoot: '/virtual/interrupted', tsConfigFilePath: 'tsconfig.json', semantic: true
		})
		expect(valid.issues).toEqual([])
	})

	it('isolates same-path concurrent callers with different captured bytes', async () => {
		const analyze = (source: string) => Promise.resolve().then(() => analyzeCapturedTypeScriptBaseline({
			files: capturedFiles(source), workspaceRoot: '/virtual/concurrent',
			tsConfigFilePath: 'tsconfig.json', semantic: true
		}))
		const [missingName, wrongType] = await Promise.all([
			analyze('export const value = missingName;'),
			analyze('export const value: number = "wrong";')
		])
		expect(missingName.issues.map(issue => issue.code)).toContain(2304)
		expect(missingName.issues.map(issue => issue.code)).not.toContain(2322)
		expect(wrongType.issues.map(issue => issue.code)).toContain(2322)
		expect(wrongType.issues.map(issue => issue.code)).not.toContain(2304)
	})

	it('reuses only the baseline while candidate revisions retain exact diagnostics and locations', () => {
		const missingNameModule = defineTemplate({
			modelId: 'BaselineCacheMissingNameModule',
			inputs: {},
			output: { kind: 'sourceFile' },
			source: 'export const generated = missingGeneratedName;'
		})
		const wrongTypeModule = defineTemplate({
			modelId: 'BaselineCacheWrongTypeModule',
			inputs: {},
			output: { kind: 'sourceFile' },
			source: 'export const generated: number = "wrong";'
		})
		const registry = createTemplateRegistry([missingNameModule, wrongTypeModule])
		const workspaceFiles = {
			'tsconfig.json': TSCONFIG,
			'src/existing.ts': 'export const existing: number = "baseline error";'
		}
		const workspaceSnapshotId = createArtifactSetWorkspaceSnapshotHash(
			workspaceFiles, undefined, 'tsconfig.json'
		)
		const compile = (templateId: string) => {
			const plan: ArtifactSetPlan = {
				artifacts: [{
					id: 'candidate',
					graph: {
						nodes: [{ id: 'module', templateId, inputs: {} }],
						finalNodeId: 'module', goal: { outputKind: 'sourceFile' }
					},
					target: { kind: 'createFile', path: 'src/generated.ts' }
				}]
			}
			return compileArtifactSet(plan, registry, {
				workspaceFiles, workspaceSnapshotId, tsConfigFilePath: 'tsconfig.json'
			})
		}

		const first = compile('BaselineCacheMissingNameModule')
		expect(first).toMatchObject({
			ok: false,
			diagnostics: expect.arrayContaining([expect.objectContaining({
				code: 'ArtifactSetTypeScriptSemanticError', compilerCode: 2304,
				artifactId: 'candidate', path: 'src/generated.ts', line: 1, column: 26
			})])
		})
		expect(first.diagnostics.some(diagnostic => diagnostic.path === 'src/existing.ts')).toBe(false)
		expect(first.diagnostics.some(diagnostic => diagnostic.compilerCode === 2451)).toBe(false)
		const retainedAfterFailure = baselineAnalysisCacheStats().retainedBytes

		const second = compile('BaselineCacheWrongTypeModule')
		expect(second).toMatchObject({
			ok: false,
			diagnostics: expect.arrayContaining([expect.objectContaining({
				code: 'ArtifactSetTypeScriptSemanticError', compilerCode: 2322,
				artifactId: 'candidate', path: 'src/generated.ts', line: 1, column: 14
			})])
		})
		expect(second.diagnostics.some(diagnostic => diagnostic.compilerCode === 2304)).toBe(false)
		expect(second.diagnostics.some(diagnostic => diagnostic.path === 'src/existing.ts')).toBe(false)
		expect(baselineAnalysisCacheStats()).toMatchObject({
			hits: 2, misses: 2, stores: 2, entries: 2,
			baselineAnalysisCalls: 2, candidateAnalysisCalls: 4
		})
		expect(baselineAnalysisCacheStats().retainedBytes).toBe(retainedAfterFailure)
	})
})
