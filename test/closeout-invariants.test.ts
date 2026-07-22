import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
	buildCapturedTypeScriptProject,
	classifySynthesisDiagnostics,
	compileGraph,
	createTemplateRegistry,
	defineTemplate,
	fillTemplateArtifactWithCatalog,
	type SynthesisDiagnostic
} from '../src/index.js'

describe('Phase 1-3 closeout invariants', () => {
	it('fails closed for diagnostic origin mismatches', () => {
		const fillable: SynthesisDiagnostic = {
			origin: 'candidate',
			stage: 'input',
			code: 'MissingRequiredInput',
			severity: 'error',
			message: 'Input is missing.'
		}
		expect(classifySynthesisDiagnostics('artifactFill', [fillable])).toBe('artifactFillable')
		expect(classifySynthesisDiagnostics('artifactFill', [{ ...fillable, origin: 'catalog' }]))
			.toBe('terminalFailure')
		expect(classifySynthesisDiagnostics('artifactFill', [
			{ ...fillable, severity: 'warning' },
			{ ...fillable, origin: 'integrity', code: 'MalformedTemplateArtifact' }
		])).toBe('terminalFailure')
	})

	it('never reads a live tsconfig or live imported source', () => {
		const root = mkdtempSync(join(tmpdir(), 'synthesize-regions-captured-'))
		try {
			writeFileSync(join(root, 'tsconfig.json'), '{"files":["live-only.ts"]}')
			writeFileSync(join(root, 'base.json'), '{"compilerOptions":{"notACompilerOption":true}}')
			const files = new Map([
				['tsconfig.json', JSON.stringify({ extends: './base.json', include: ['src/**/*.ts'] })],
				['base.json', JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ES2022', moduleResolution: 'Bundler', strict: true } })],
				['src/index.ts', "import { value } from './dep.js'; export const result: number = value;"],
				['src/dep.ts', 'export const value = 1;']
			])
			const result = buildCapturedTypeScriptProject({
				files,
				workspaceRoot: root,
				tsConfigFilePath: 'tsconfig.json',
				semantic: true
			})
			expect(result.rootFilePaths).toEqual(['src/dep.ts', 'src/index.ts'])
			expect(result.issues).toEqual([])
		} finally {
			rmSync(root, { recursive: true, force: true })
		}
	})

	it('freezes compiled artifacts and rejects mutable persisted artifacts', () => {
		const template = defineTemplate({
			modelId: 'FrozenArtifact',
			inputs: {},
			output: { kind: 'expression' },
			source: '1'
		})
		const graph = { nodes: [{ id: 'value', templateId: template.modelId, inputs: {} }], finalNodeId: 'value' }
		const result = compileGraph(graph, [template])
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(Object.isFrozen(result.finalArtifact)).toBe(true)
		expect(Object.isFrozen(result.finalArtifact.source)).toBe(true)
		expect(() => Object.assign(result.finalArtifact, { code: 'process.exit()' })).toThrow()
	})

	it('screens runtime expressions in heritage fragments', () => {
		const template = defineTemplate({
			modelId: 'HeritageArtifact',
			inputs: {},
			output: { kind: 'heritageType' },
			source: 'SafeBase'
		})
		const catalog = createTemplateRegistry([template])
		const result = fillTemplateArtifactWithCatalog({
			code: 'process.mainModule',
			kind: 'heritageType',
			source: { templateId: template.modelId, templateManifestDigest: template.manifestDigest },
			complete: true
		}, {}, catalog)
		expect(result).toMatchObject({
			ok: false,
			classification: 'terminalFailure',
			diagnostics: [expect.objectContaining({ code: 'RawCodeRejected', origin: 'candidate' })]
		})
	})
})
