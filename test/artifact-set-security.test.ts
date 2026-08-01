import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
	BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES,
	SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG,
	classifySynthesisDiagnosticCode,
	compileArtifactSet,
	compileArtifactSetGraphs,
	createArtifactSetWorkspaceSnapshotHash,
	createTemplateRegistry,
	defineTemplate,
	type ArtifactSetPlan,
	type ArtifactSetWorkspaceManifest
} from '../src/index.js'

const TSCONFIG = JSON.stringify({
	compilerOptions: {
		target: 'ES2022', module: 'ES2022', moduleResolution: 'Bundler', strict: true
	}
})

const CAPTURED_TSCONFIG_PATH = 'captured-only.tsconfig.json'

function sha256(value: Uint8Array | string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function manifestEntry(path: string, value: Uint8Array | string) {
	const bytes = typeof value === 'string' ? Buffer.from(value, 'utf8') : value
	const hash = sha256(bytes)
	return { path, byteLength: bytes.byteLength, contentHash: hash, blobHash: hash }
}

function fixture() {
	const source = 'export const existing = 1;\n'
	const binary = Uint8Array.from([0xff, 0x00, 0x80])
	const workspaceFiles = { 'src/index.ts': source, [CAPTURED_TSCONFIG_PATH]: TSCONFIG }
	const manifest: ArtifactSetWorkspaceManifest = {
		schemaVersion: 2,
		providerId: 'test-snapshot-provider',
		providerSnapshotId: 'snapshot-1',
		revision: 'revision-1',
		capturePolicyDigest: `cp1_${'0'.repeat(64)}`,
		tsConfigFilePath: CAPTURED_TSCONFIG_PATH,
		files: [
			manifestEntry('assets/logo.bin', binary),
			manifestEntry(CAPTURED_TSCONFIG_PATH, TSCONFIG),
			manifestEntry('src/index.ts', source)
		],
		symlinks: []
	}
	const registry = createTemplateRegistry([defineTemplate({
		modelId: 'SecurityFixtureSourceFile',
		inputs: {},
		output: { kind: 'sourceFile' },
		source: 'export const generated = 1;'
	})])
	const plan: ArtifactSetPlan = {
		artifacts: [{
			id: 'generated',
			graph: {
				nodes: [{ id: 'root', templateId: 'SecurityFixtureSourceFile', inputs: {} }],
				finalNodeId: 'root'
			},
			target: { kind: 'createFile', path: 'src/generated.ts' }
		}]
	}
	const unavailableTextPaths = ['assets/logo.bin'] as const
	const workspaceSnapshotId = createArtifactSetWorkspaceSnapshotHash(
		workspaceFiles, undefined, CAPTURED_TSCONFIG_PATH, manifest, unavailableTextPaths
	)
	return { manifest, plan, registry, unavailableTextPaths, workspaceFiles, workspaceSnapshotId }
}

describe('artifact-set workspace manifest security', () => {
	it('uses captured tsconfig bytes without resolving the path against the host process', () => {
		const value = fixture()
		const result = compileArtifactSet(value.plan, value.registry, {
			workspaceFiles: value.workspaceFiles,
			unavailableTextPaths: value.unavailableTextPaths,
			workspaceManifest: value.manifest,
			workspaceSnapshotId: value.workspaceSnapshotId,
			tsConfigFilePath: CAPTURED_TSCONFIG_PATH
		})

		expect(result).toMatchObject({ ok: true, complete: true, validation: 'static' })
	})

	it('accepts an exact text/unavailable partition and verifies every text identity', () => {
		const value = fixture()
		const result = compileArtifactSetGraphs(value.plan, value.registry, {
			workspaceFiles: value.workspaceFiles,
			unavailableTextPaths: value.unavailableTextPaths,
			workspaceManifest: value.manifest,
			workspaceSnapshotId: value.workspaceSnapshotId,
			tsConfigFilePath: CAPTURED_TSCONFIG_PATH
		})
		expect(result).toMatchObject({ ok: true, complete: true })
	})

	it.each([
		{
			name: 'missing binary partition member',
			workspace: (value: ReturnType<typeof fixture>) => value.workspaceFiles,
			unavailable: () => [] as readonly string[],
			code: 'WorkspaceManifestFileUnrepresented'
		},
		{
			name: 'overlapping text and unavailable member',
			workspace: (value: ReturnType<typeof fixture>) => ({ ...value.workspaceFiles, 'assets/logo.bin': 'text' }),
			unavailable: (value: ReturnType<typeof fixture>) => value.unavailableTextPaths,
			code: 'WorkspaceTextPartitionOverlap'
		},
		{
			name: 'unavailable analysis source',
			workspace: (value: ReturnType<typeof fixture>) => ({
				[CAPTURED_TSCONFIG_PATH]: value.workspaceFiles[CAPTURED_TSCONFIG_PATH]
			}),
			unavailable: () => ['assets/logo.bin', 'src/index.ts'],
			code: 'WorkspaceAnalysisFileUnavailable'
		},
		{
			name: 'forged text bytes',
			workspace: (value: ReturnType<typeof fixture>) => ({ ...value.workspaceFiles, 'src/index.ts': 'export const forged = 2;\n' }),
			unavailable: (value: ReturnType<typeof fixture>) => value.unavailableTextPaths,
			code: 'WorkspaceManifestFileIdentityMismatch'
		},
		{
			name: 'duplicate unavailable path',
			workspace: (value: ReturnType<typeof fixture>) => value.workspaceFiles,
			unavailable: () => ['assets/logo.bin', 'assets/logo.bin'],
			code: 'InvalidUnavailableTextPathOrder'
		},
		{
			name: 'unavailable path outside the manifest',
			workspace: (value: ReturnType<typeof fixture>) => value.workspaceFiles,
			unavailable: () => ['assets/logo.bin', 'unknown.bin'],
			code: 'UnavailableTextPathMissingFromManifest'
		}
	])('fails closed for $name', ({ workspace, unavailable, code }) => {
		const value = fixture()
		const result = compileArtifactSetGraphs(value.plan, value.registry, {
			workspaceFiles: workspace(value),
			unavailableTextPaths: unavailable(value),
			workspaceManifest: value.manifest,
			workspaceSnapshotId: value.workspaceSnapshotId,
			tsConfigFilePath: CAPTURED_TSCONFIG_PATH
		})
		expect(result).toMatchObject({
			ok: false,
			classification: 'terminalFailure',
			diagnostics: expect.arrayContaining([expect.objectContaining({ code })])
		})
	})

	it('rejects unavailable paths without a binding manifest', () => {
		const value = fixture()
		const result = compileArtifactSetGraphs(value.plan, value.registry, {
			workspaceFiles: value.workspaceFiles,
			unavailableTextPaths: value.unavailableTextPaths
		})
		expect(result).toMatchObject({
			ok: false,
			classification: 'terminalFailure',
			diagnostics: [expect.objectContaining({ code: 'UnavailableTextPathsRequireWorkspaceManifest' })]
		})
	})
})

describe('diagnostic classification catalog', () => {
	it('classifies every built-in code exactly once and fails closed for unknown codes', () => {
		expect(Object.keys(SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG).sort()).toEqual(
			[...BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES].sort()
		)
		for (const code of BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES) {
			expect(classifySynthesisDiagnosticCode(code)).toBe(
				SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG[code]
			)
		}
		expect(classifySynthesisDiagnosticCode('FutureUnknownDiagnostic')).toBe('terminalFailure')
	})

	it('contains every literal diagnostic emitted by template and artifact code', () => {
		const templateDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../src/templates')
		const emitted = new Set<string>()
		for (const fileName of readdirSync(templateDirectory).filter(file => file.endsWith('.ts'))) {
			const source = readFileSync(resolve(templateDirectory, fileName), 'utf8')
			for (const pattern of [
				/\bcode\s*:\s*['"]([^'"]+)['"]/gu,
				/\bsetDiagnostic\(\s*['"]([^'"]+)['"]/gu
			]) {
				for (const match of source.matchAll(pattern)) emitted.add(match[1]!)
			}
		}
		const catalogCodes = new Set(BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES)
		expect([...emitted].filter(code => !catalogCodes.has(
			code as typeof BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES[number]
		))).toEqual([])
	})

	it('grants repair authority only to explicit candidate-owned diagnostics', () => {
		expect(classifySynthesisDiagnosticCode('ArtifactTargetPathCollision')).toBe('graphRepairable')
		expect(classifySynthesisDiagnosticCode('MissingRequiredInput')).toBe('artifactFillable')
		expect(classifySynthesisDiagnosticCode('WorkspaceSnapshotHashMismatch')).toBe('terminalFailure')
		expect(classifySynthesisDiagnosticCode('ArtifactLedgerResultHashMismatch')).toBe('terminalFailure')
		expect(classifySynthesisDiagnosticCode('InvalidConstraintBoundStaticAcceptance')).toBe('terminalFailure')
	})
})
