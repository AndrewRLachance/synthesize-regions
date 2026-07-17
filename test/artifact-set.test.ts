import { describe, expect, it } from 'vitest'

import {
	assembleArtifactSetTargets,
	ArtifactSetAssemblyResultSchema,
	ArtifactSetGraphCompilationResultSchema,
	ArtifactSetSemanticValidationResultSchema,
	ARTIFACT_SET_STATIC_POLICY_VERSION,
	compileArtifactSet,
	compileArtifactSetGraphs,
	createArtifactSetArtifactHash,
	createArtifactSetChangeSetHash,
	createArtifactSetFileHash,
	createArtifactSetGraphHash,
	createArtifactSetWorkspaceSnapshotHash,
	createTemplateRegistry,
	defineTemplate,
	fillTemplateArtifactWithCatalog,
	finalizeArtifactSetStatic,
	fragmentPort,
	normalizeArtifactTargetPath,
	rawCodePort,
	checkContract,
	validateArtifactSetSemantics,
	validateArtifactSetStatic,
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
		const workspaceFiles = { 'src/values.ts': sourceText, 'tsconfig.json': STATIC_TSCONFIG }
		const workspaceSnapshotId = createArtifactSetWorkspaceSnapshotHash(
			workspaceFiles, undefined, 'tsconfig.json'
		)

		const first = compileArtifactSet(plan, registry, {
			workspaceFiles,
			workspaceSnapshotId, tsConfigFilePath: 'tsconfig.json'
		})
		const second = compileArtifactSet(plan, registry, {
			workspaceFiles: { './src/values.ts': sourceText, './tsconfig.json': STATIC_TSCONFIG },
			workspaceSnapshotId, tsConfigFilePath: 'tsconfig.json'
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
		expect(first.units[0]?.artifact?.source.templateManifestDigest).toMatch(/^t2_[a-f0-9]{64}$/u)
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
		expect(checkContract(ArtifactSetAssemblyResultSchema, stale)).toBe(true)

		const wrongKind = assembleArtifactSetTargets([{
			id: 'value', artifact,
			target: {
				kind: 'replaceRange', path: 'src/value.ts', start, end: start + 1,
				baseFileHash, regionKind: 'statement'
			}
		}], registry, { workspaceFiles: { 'src/value.ts': sourceText } })
		expect(wrongKind).toMatchObject({
			ok: false,
			classification: 'graphRepairable',
			diagnostics: [expect.objectContaining({ code: 'ArtifactTargetKindMismatch' })]
		})
		expect(checkContract(ArtifactSetAssemblyResultSchema, wrongKind)).toBe(true)

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

	it('exposes schema-valid graph, assembly, semantic, and constraint-bound final boundaries', () => {
		const registry = rawRegistry()
		const plan: ArtifactSetPlan = {
			artifacts: [{
				id: 'generated',
				graph: rawGraph('ArtifactSetExternalSourceFile'),
				target: { kind: 'createFile', path: 'src/generated.ts' }
			}]
		}
		const graph = compileArtifactSetGraphs(plan, registry)
		expect(graph).toMatchObject({ ok: true, complete: true, kind: 'artifactSetGraphCompilation' })
		expect(checkContract(ArtifactSetGraphCompilationResultSchema, graph)).toBe(true)
		if (!graph.ok || !graph.complete) return
		const assembled = assembleArtifactSetTargets(graph.units.map(unit => ({
			id: unit.artifactId,
			target: unit.target,
			artifact: unit.artifact as Extract<typeof unit.artifact, { complete: true }>,
			artifactHash: unit.artifactHash
		})), registry)
		expect(assembled.ok).toBe(true)
		expect(checkContract(ArtifactSetAssemblyResultSchema, assembled)).toBe(true)
		const semantic = validateArtifactSetSemantics(plan, registry)
		expect(semantic.ok).toBe(true)
		expect(checkContract(ArtifactSetSemanticValidationResultSchema, semantic)).toBe(true)

		const hash = `sha256:${'a'.repeat(64)}`
		const acceptance = {
			schemaVersion: 1 as const,
			constraintEntryPath: '.constraints/main.wsc',
			constraintDigest: `wc1_${'b'.repeat(64)}`,
			constraintSourceSnapshotHash: hash,
			constraintEngineVersion: 3,
			analysisSnapshotHash: hash,
			phaseResultBlobHashes: { plan: hash, artifact: hash, assembled: hash, semantic: hash }
		}
		const finalized = finalizeArtifactSetStatic(plan, registry, {}, acceptance)
		expect(finalized).toMatchObject({ ok: true, constraintAcceptance: acceptance })
		const forged = finalizeArtifactSetStatic(plan, registry, {}, {
			...acceptance,
			phaseResultBlobHashes: { ...acceptance.phaseResultBlobHashes, semantic: 'forged' }
		})
		expect(forged).toMatchObject({
			ok: false,
			classification: 'terminalFailure',
			diagnostics: [expect.objectContaining({ code: 'InvalidConstraintBoundStaticAcceptance' })]
		})
	})

	it('keeps strict compatibility facades exactly equal to phase-granular composition on success and failure', () => {
		const registry = rawRegistry()
		const valid: ArtifactSetPlan = {
			artifacts: [{
				id: 'generated',
				graph: rawGraph('ArtifactSetExternalSourceFile'),
				target: { kind: 'createFile', path: 'src/generated.ts' }
			}]
		}
		const invalid: ArtifactSetPlan = {
			artifacts: [{
				id: 'missing-template',
				graph: { nodes: [{ id: 'root', templateId: 'NotInCatalog', inputs: {} }], finalNodeId: 'root' },
				target: { kind: 'createFile', path: 'src/missing.ts' }
			}]
		}
		for (const plan of [valid, invalid]) {
			const graph = compileArtifactSetGraphs(plan, registry, { mode: 'strict' })
			const facade = compileArtifactSet(plan, registry)
			if (!graph.ok) {
				expect(facade).toEqual({
					kind: 'artifactSetCompilation', mode: 'strict', ok: false, complete: false,
					plan: graph.plan, units: graph.units, changes: [], diagnostics: graph.diagnostics,
					classification: graph.classification,
					...(graph.contractDigest === undefined ? {} : { contractDigest: graph.contractDigest }),
					...(graph.manifestDigest === undefined ? {} : { manifestDigest: graph.manifestDigest }),
					...(graph.workspaceSnapshotHash === undefined ? {} : { workspaceSnapshotHash: graph.workspaceSnapshotHash })
				})
				expect(validateArtifactSetStatic(plan, registry)).toEqual({
					ok: false, classification: graph.classification, changes: [], diagnostics: graph.diagnostics
				})
				continue
			}
			const assembly = assembleArtifactSetTargets(graph.units.map(unit => ({
				id: unit.artifactId, target: unit.target,
				artifact: unit.artifact as Extract<typeof unit.artifact, { complete: true }>,
				...(unit.artifactHash === undefined ? {} : { artifactHash: unit.artifactHash })
			})), registry)
			expect(assembly.ok).toBe(true)
			if (!assembly.ok) continue
			const semantic = validateArtifactSetSemantics(plan, registry)
			expect(semantic.ok).toBe(true)
			if (!semantic.ok) continue
			const identity = {
				contractDigest: semantic.contractDigest,
				manifestDigest: semantic.manifestDigest,
				workspaceSnapshotHash: semantic.workspaceSnapshotHash,
				staticPolicyVersion: ARTIFACT_SET_STATIC_POLICY_VERSION
			}
			expect(facade).toEqual({
				kind: 'artifactSetCompilation', mode: 'strict', ok: true, complete: true,
				plan: graph.plan, units: graph.units, diagnostics: [...graph.diagnostics, ...semantic.diagnostics],
				validation: 'static', changes: semantic.changes,
				changeSetHash: createArtifactSetChangeSetHash(semantic.changes, identity),
				...identity
			})
			expect(validateArtifactSetStatic(plan, registry)).toEqual({
				ok: true, validation: 'static', changes: semantic.changes,
				changeSetHash: createArtifactSetChangeSetHash(semantic.changes, identity),
				...identity,
				diagnostics: semantic.diagnostics
			})
		}
	})

	it('keeps static-facade failures equal to compilation, assembly, and semantic phase failures', () => {
		const baseRegistry = rawRegistry()
		const compilationFailure: ArtifactSetPlan = {
			artifacts: [{
				id: 'unknown-template',
				graph: { nodes: [{ id: 'root', templateId: 'NotInCatalog', inputs: {} }], finalNodeId: 'root' },
				target: { kind: 'createFile', path: 'src/unknown.ts' }
			}]
		}
		const assemblyFailure: ArtifactSetPlan = {
			artifacts: [{
				id: 'wrong-kind',
				graph: rawGraph('ArtifactSetExpression', '1'),
				target: { kind: 'createFile', path: 'src/wrong-kind.ts' }
			}]
		}
		for (const plan of [compilationFailure, assemblyFailure]) {
			const phase = validateArtifactSetSemantics(plan, baseRegistry)
			expect(phase.ok).toBe(false)
			expect(checkContract(ArtifactSetSemanticValidationResultSchema, phase)).toBe(true)
			expect(validateArtifactSetStatic(plan, baseRegistry)).toEqual(phase)
		}

		const declareShared = defineTemplate({
			modelId: 'ParityDeclareShared', inputs: {}, output: { kind: 'sourceFile' },
			source: 'const parityShared: string = "value";'
		})
		const consumeShared = defineTemplate({
			modelId: 'ParityConsumeShared', inputs: {}, output: { kind: 'sourceFile' },
			source: 'const parityCopy: number = parityShared;'
		})
		const semanticRegistry = createTemplateRegistry([declareShared, consumeShared])
		const semanticFailure: ArtifactSetPlan = {
			artifacts: [
				{
					id: 'declare', graph: rawGraph('ParityDeclareShared'),
					target: { kind: 'createFile', path: 'src/parity-a.ts' }
				},
				{
					id: 'consume', graph: rawGraph('ParityConsumeShared'),
					target: { kind: 'createFile', path: 'src/parity-b.ts' }
				}
			]
		}
		const semanticPhase = validateArtifactSetSemantics(semanticFailure, semanticRegistry)
		expect(semanticPhase).toMatchObject({
			ok: false,
			classification: 'graphRepairable',
			diagnostics: expect.arrayContaining([
				expect.objectContaining({ code: 'ArtifactSetTypeScriptSemanticError' })
			])
		})
		expect(checkContract(ArtifactSetSemanticValidationResultSchema, semanticPhase)).toBe(true)
		expect(validateArtifactSetStatic(semanticFailure, semanticRegistry)).toEqual(semanticPhase)
	})
})
