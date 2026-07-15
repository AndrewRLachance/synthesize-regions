import { describe, expect, it } from 'vitest'

import {
	assembleArtifactSetTargets,
	compileArtifactSet,
	createArtifactSetArtifactHash,
	createArtifactSetFileHash,
	createArtifactSetGraphHash,
	createTemplateRegistry,
	defineTemplate,
	fillTemplateArtifactWithCatalog,
	fragmentPort,
	normalizeArtifactTargetPath,
	rawCodePort,
	type ArtifactFillLedgerEntry,
	type ArtifactSetPlan,
	type SynthesisGraph
} from '../src/index.js'

const STATIC_TSCONFIG = JSON.stringify({
	compilerOptions: {
		target: 'ES2022', module: 'ES2022', moduleResolution: 'Bundler', strict: true
	}
})

function rawRegistry() {
	const expression = defineTemplate({
		modelId: 'ArtifactSetExpression',
		inputs: {
			value: rawCodePort({ regionKind: 'expression' })
		},
		output: { kind: 'expression' },
		source: '/** @TYPE expression id=value */0/** @END */'
	})
	const sourceFile = defineTemplate({
		modelId: 'ArtifactSetSourceFile',
		inputs: {
			value: fragmentPort({ regionKind: 'sourceFile', accepts: { outputKind: 'sourceFile' } })
		},
		output: { kind: 'sourceFile' },
		source: '/** @TYPE sourceFile id=value */export {};/** @END */'
	})
	const externalSourceFile = defineTemplate({
		modelId: 'ArtifactSetExternalSourceFile', inputs: {}, output: { kind: 'sourceFile' },
		source: 'export const generated = 1;'
	})
	return createTemplateRegistry([expression, sourceFile, externalSourceFile])
}

function rawGraph(templateId: string, code?: string): SynthesisGraph {
	return {
		nodes: [{
			id: 'generated',
			templateId,
			inputs: code === undefined ? {} : { value: { kind: 'rawCode', code } }
		}],
		finalNodeId: 'generated'
	}
}

describe('artifact-set compilation', () => {
	it('normalizes workspace-relative paths and assembles nonoverlapping edits in authored order', () => {
		const registry = rawRegistry()
		const sourceText = 'export const first = OLD_A;\nexport const second = OLD_B;\n'
		const baseFileHash = createArtifactSetFileHash(sourceText)
		const firstStart = sourceText.indexOf('OLD_A')
		const secondStart = sourceText.indexOf('OLD_B')
		const plan: ArtifactSetPlan = {
			artifacts: [
				{
					id: 'second',
					graph: rawGraph('ArtifactSetExpression', '2'),
					target: {
						kind: 'replaceRange', path: './src\\values.ts',
						start: secondStart, end: secondStart + 'OLD_B'.length,
						baseFileHash, regionKind: 'expression'
					}
				},
				{
					id: 'first',
					graph: rawGraph('ArtifactSetExpression', '1'),
					target: {
						kind: 'replaceRange', path: 'src/values.ts',
						start: firstStart, end: firstStart + 'OLD_A'.length,
						baseFileHash, regionKind: 'expression'
					}
				}
			]
		}

		const first = compileArtifactSet(plan, registry, {
			workspaceFiles: { 'src/values.ts': sourceText, 'tsconfig.json': STATIC_TSCONFIG },
			workspaceSnapshotId: 'workspace-test', tsConfigFilePath: 'tsconfig.json'
		})
		const second = compileArtifactSet(plan, registry, {
			workspaceFiles: { './src/values.ts': sourceText, './tsconfig.json': STATIC_TSCONFIG },
			workspaceSnapshotId: 'workspace-test', tsConfigFilePath: 'tsconfig.json'
		})
		const missingProjectContext = compileArtifactSet(plan, registry, {
			workspaceFiles: { 'src/values.ts': sourceText }
		})
		expect(missingProjectContext).toMatchObject({
			ok: false,
			classification: 'terminalFailure',
			diagnostics: expect.arrayContaining([
				expect.objectContaining({ code: 'MissingWorkspaceSnapshotIdentity' }),
				expect.objectContaining({ code: 'MissingTypeScriptProjectConfiguration' })
			])
		})

		expect(first.ok).toBe(true)
		if (!first.ok) return
		expect(first.complete).toBe(true)
		expect(first).toMatchObject({
			validation: 'static',
			contractDigest: registry.contractDigest,
			manifestDigest: registry.manifestDigest,
			workspaceSnapshotHash: expect.stringMatching(/^ws1_[a-f0-9]{64}$/u),
			staticPolicyVersion: 1
		})
		expect(first.changes).toHaveLength(1)
		expect(first.changes[0]).toMatchObject({
			kind: 'modifyFile',
			path: 'src/values.ts',
			sourceText: 'export const first = 1;\nexport const second = 2;\n'
		})
		expect(first.changes[0]?.edits.map(edit => edit.artifactId)).toEqual(['second', 'first'])
		expect(first.units[0]?.artifact?.source.templateManifestDigest).toMatch(/^t1_[a-f0-9]{64}$/u)
		expect(second.ok && second.changeSetHash).toBe(first.changeSetHash)
		expect(normalizeArtifactTargetPath('.\\src/../src/values.ts')).toBe('src/values.ts')
		expect(() => normalizeArtifactTargetPath('../outside.ts')).toThrow(/workspace/u)
	})

	it('rejects stale bases, target-kind mismatches, and overlapping ranges', () => {
		const registry = rawRegistry()
		const templateDigest = registry.get('ArtifactSetExpression')!.manifestDigest
		const artifact = {
			code: '1', kind: 'expression',
			source: { templateId: 'ArtifactSetExpression', templateManifestDigest: templateDigest },
			complete: true
		} as const
		const sourceText = 'const value = PLACEHOLDER;'
		const start = sourceText.indexOf('PLACEHOLDER')
		const baseFileHash = createArtifactSetFileHash(sourceText)
		const legacy = assembleArtifactSetTargets([{
			id: 'legacy', artifact: { ...artifact, source: { templateId: 'ArtifactSetExpression' } },
			target: {
				kind: 'replaceRange', path: 'src/value.ts',
				start, end: start + 'PLACEHOLDER'.length,
				baseFileHash, regionKind: 'expression'
			}
		}], registry, { workspaceFiles: { 'src/value.ts': sourceText } })
		expect(legacy).toMatchObject({
			ok: false,
			classification: 'terminalFailure',
			diagnostics: [expect.objectContaining({ code: 'MissingTemplateManifestIdentity' })]
		})

		const stale = assembleArtifactSetTargets([{
			id: 'value', artifact,
			target: {
				kind: 'replaceRange', path: 'src/value.ts', start, end: start + 1,
				baseFileHash: 'f1_stale', regionKind: 'expression'
			}
		}], registry, { workspaceFiles: { 'src/value.ts': sourceText } })
		expect(stale).toMatchObject({
			ok: false, classification: 'terminalFailure',
			diagnostics: [expect.objectContaining({ code: 'ArtifactBaseFileHashMismatch' })]
		})

		const wrongKind = assembleArtifactSetTargets([{
			id: 'value', artifact,
			target: {
				kind: 'replaceRange', path: 'src/value.ts', start, end: start + 1,
				baseFileHash, regionKind: 'statement'
			}
		}], registry, { workspaceFiles: { 'src/value.ts': sourceText } })
		expect(wrongKind).toMatchObject({
			ok: false,
			diagnostics: [expect.objectContaining({ code: 'ArtifactTargetKindMismatch' })]
		})

		const overlap = assembleArtifactSetTargets([
			{
				id: 'left', artifact,
				target: {
					kind: 'replaceRange', path: 'src/value.ts', start, end: start + 5,
					baseFileHash, regionKind: 'expression'
				}
			},
			{
				id: 'right', artifact,
				target: {
					kind: 'replaceRange', path: 'src/value.ts', start: start + 2, end: start + 7,
					baseFileHash, regionKind: 'expression'
				}
			}
		], registry, { workspaceFiles: { 'src/value.ts': sourceText } })
		expect(overlap).toMatchObject({
			ok: false,
			diagnostics: [expect.objectContaining({ code: 'OverlappingArtifactTargets' })]
		})
	})

	it('returns partial artifacts and replays hash-chained fills for strict compilation', () => {
		const registry = rawRegistry()
		const graph = rawGraph('ArtifactSetSourceFile')
		const plan: ArtifactSetPlan = {
			artifacts: [{
				id: 'generated-file',
				graph,
				target: { kind: 'createFile', path: 'src/generated.ts' }
			}]
		}
		const partial = compileArtifactSet(plan, registry, { mode: 'partial' })
		expect(partial).toMatchObject({ ok: true, complete: false, changes: [] })
		if (!partial.ok || partial.complete) return

		const baseArtifact = partial.units[0]?.artifact
		expect(baseArtifact?.complete).toBe(false)
		if (!baseArtifact || baseArtifact.complete) return
		const unresolvedId = baseArtifact.unresolvedInputs[0]!.id
		const inputs = {
			[unresolvedId]: {
				kind: 'fragment',
				fragment: {
					code: 'export const generated = 1;', kind: 'sourceFile',
					source: {
						templateId: 'ArtifactSetExternalSourceFile',
						templateManifestDigest: registry.get('ArtifactSetExternalSourceFile')!.manifestDigest
					}, complete: true
				}
			}
		} as const
		const fill = fillTemplateArtifactWithCatalog(baseArtifact, inputs, registry)
		expect(fill.ok).toBe(true)
		if (!fill.ok) return

		const ledger: ArtifactFillLedgerEntry = {
			artifactId: 'generated-file',
			graphHash: createArtifactSetGraphHash(graph),
			baseArtifactHash: createArtifactSetArtifactHash(baseArtifact),
			inputs,
			resultingArtifactHash: createArtifactSetArtifactHash(fill.artifact)
		}
		const complete = compileArtifactSet(plan, registry, { fillLedger: [ledger] })
		expect(complete).toMatchObject({
			ok: true,
			complete: true,
			changes: [{
				kind: 'createFile', path: 'src/generated.ts',
				sourceText: 'export const generated = 1;'
			}]
		})

		const stale = compileArtifactSet(plan, registry, {
			fillLedger: [{ ...ledger, baseArtifactHash: 'a1_stale' }]
		})
		expect(stale).toMatchObject({
			ok: false,
			classification: 'terminalFailure',
			diagnostics: expect.arrayContaining([
				expect.objectContaining({ code: 'ArtifactLedgerBaseHashMismatch' })
			])
		})
	})

	it('requires semantic checks with all created files in one TypeScript project', () => {
		const declareShared = defineTemplate({
			modelId: 'DeclareShared', inputs: {}, output: { kind: 'sourceFile' },
			source: 'const sharedAcrossFiles: string = "value";'
		})
		const consumeShared = defineTemplate({
			modelId: 'ConsumeShared', inputs: {}, output: { kind: 'sourceFile' },
			source: 'const copiedAcrossFiles: number = sharedAcrossFiles;'
		})
		const registry = createTemplateRegistry([declareShared, consumeShared])
		const plan: ArtifactSetPlan = {
			artifacts: [
				{
					id: 'a',
					graph: rawGraph('DeclareShared'),
					target: { kind: 'createFile', path: 'src/a.ts' }
				},
				{
					id: 'b',
					graph: rawGraph('ConsumeShared'),
					target: { kind: 'createFile', path: 'src/b.ts' }
				}
			]
		}

		const checked = compileArtifactSet(plan, registry)
		expect(checked).toMatchObject({
			ok: false,
			classification: 'graphRepairable',
			diagnostics: expect.arrayContaining([
					expect.objectContaining({
					code: 'ArtifactSetTypeScriptSemanticError',
					compilerCode: 2322,
					path: 'src/b.ts'
				})
			])
		})
	})
})
