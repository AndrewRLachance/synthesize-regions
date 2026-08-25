import { describe, expect, it } from 'vitest'

import {
	checkContract,
	collectArtifactSetImportRequirements,
	compileArtifactSetGraphs,
	compileGraph,
	createArtifactSetWorkspaceSnapshotHash,
	createCompletionShellTemplate,
	defineTemplate,
	discoverImplementationTargets,
	assembleCompiledArtifactSetWithImports,
	reconcileArtifactSetImports,
	TemplateSummarySchema,
	validateRequiredRootTemplates,
	validateTemplateImportRequirements,
	validateImportReconciledArtifactSetSemantics,
	validateUnresolvedRuntimeValueReferences,
	type ArtifactSetAssemblyUnit,
	type ArtifactSetChange,
	type ArtifactSetPlan,
	type RequiredRootTemplateAuthority
} from '../src/index.js'

describe('project implementation authority enforcement', () => {
	it('enforces required root IDs before compilation and manifest provenance afterward', () => {
		const discovery = discoverImplementationTargets({
			files: { 'src/value.ts': 'export declare const value: { (): number };' },
			enabledTargetKinds: ['declaredCallable']
		})
		const target = discovery.targets[0]!
		const shell = createCompletionShellTemplate(target.completionShell)
		const graph = {
			nodes: [{ id: 'root', templateId: shell.modelId, inputs: { implementation: { kind: 'rawCode' as const, code: '() => 1' } } }],
			finalNodeId: 'root'
		}
		const plan: ArtifactSetPlan = {
			artifacts: [{
				id: target.targetId,
				graph,
				target: {
					kind: 'replaceRange', path: target.path, start: target.start, end: target.end,
					baseFileHash: target.baseArtifactFileHash, regionKind: target.regionKind
				}
			}]
		}
		const authority: RequiredRootTemplateAuthority[] = [{
			schemaVersion: 1,
			artifactId: target.targetId,
			requiredRootTemplateId: target.requiredRootTemplateId,
			requiredRootTemplateManifestDigest: target.requiredRootTemplateManifestDigest
		}]

		expect(validateRequiredRootTemplates(plan, undefined, authority)).toEqual({ ok: true, diagnostics: [] })
		const badPlan: ArtifactSetPlan = {
			artifacts: [{ ...plan.artifacts[0]!, graph: { ...graph, nodes: [{ ...graph.nodes[0]!, templateId: 'wrong.root' }] } }]
		}
		expect(validateRequiredRootTemplates(badPlan, undefined, authority).diagnostics.map(item => item.code)).toContain('RequiredRootTemplateMismatch')

		const compiled = compileGraph(graph, [shell])
		expect(compiled.ok).toBe(true)
		if (!compiled.ok) return
		const artifacts: ArtifactSetAssemblyUnit[] = [{ id: target.targetId, target: plan.artifacts[0]!.target, artifact: compiled.finalArtifact }]
		expect(validateRequiredRootTemplates(plan, artifacts, authority)).toEqual({ ok: true, diagnostics: [] })
		expect(validateRequiredRootTemplates(plan, [{
			...artifacts[0]!, artifact: {
				...compiled.finalArtifact,
				source: { ...compiled.finalArtifact.source, templateManifestDigest: `t4_${'0'.repeat(64)}` }
			}
		}], authority).diagnostics.map(item => item.code)).toContain('RequiredRootManifestMismatch')
	})

	it('captures template import requirements in summaries and rejects malformed declarations', () => {
		const requirement = {
			schemaVersion: 1 as const,
			moduleSpecifier: '@scope/helpers',
			importKind: 'named' as const,
			importedName: 'helper',
			localName: 'helper',
			typeOnly: false
		}
		const template = defineTemplate({
			modelId: 'UsesHelper',
			importRequirements: [requirement],
			inputs: {}, output: { kind: 'expression' }, source: 'helper()'
		})

		expect(template.importRequirements).toEqual([requirement])
		expect(template.summary().importRequirements).toEqual([requirement])
		expect(checkContract(TemplateSummarySchema, template.summary())).toBe(true)
		expect(() => defineTemplate({
			modelId: 'InvalidImport',
			importRequirements: [{
				schemaVersion: 1, moduleSpecifier: '@scope/side-effect', importKind: 'sideEffect',
				typeOnly: true
			}],
			inputs: {}, output: { kind: 'expression' }, source: '1'
		})).toThrow(/InvalidSideEffectImportRequirement/u)
	})

	it('collects, authorizes, and deterministically reconciles imports without writing source files', () => {
		const requirement = {
			schemaVersion: 1 as const,
			moduleSpecifier: '@scope/helpers',
			importKind: 'named' as const,
			importedName: 'helper',
			localName: 'localHelper',
			typeOnly: false
		}
		const template = defineTemplate({
			modelId: 'UsesHelper', importRequirements: [requirement],
			inputs: {}, output: { kind: 'sourceFile' }, source: 'export const value = localHelper();'
		})
		const plan: ArtifactSetPlan = {
			artifacts: [{
				id: 'artifact',
				graph: { nodes: [{ id: 'root', templateId: template.modelId, inputs: {} }], finalNodeId: 'root' },
				target: { kind: 'createFile', path: 'src/value.ts' }
			}]
		}
		const collected = collectArtifactSetImportRequirements(plan, [template])
		expect(collected.ok).toBe(true)
		expect(collected.requirementsByArtifact).toEqual([{ artifactId: 'artifact', requirements: [requirement] }])
		expect(validateTemplateImportRequirements(collected.requirementsByArtifact, []).diagnostics.map(item => item.code)).toContain('MissingArtifactImportAuthority')

		const authority = [{
			schemaVersion: 1 as const, artifactId: 'artifact', path: 'src/value.ts', allowed: [requirement]
		}]
		expect(validateTemplateImportRequirements(collected.requirementsByArtifact, authority)).toEqual({ ok: true, diagnostics: [] })
		const sourceText = 'export const value = localHelper();\n'
		const changes: ArtifactSetChange[] = [{
			kind: 'createFile', path: 'src/value.ts', sourceText,
			resultingFileHash: 'unused-by-pure-reconciliation',
			edits: [{
				artifactId: 'artifact', start: 0, end: 0, resultStart: 0, resultEnd: sourceText.length,
				replacement: sourceText, artifactHash: 'unused-by-pure-reconciliation'
			}]
		}]
		const reconciled = reconcileArtifactSetImports(changes, collected.requirementsByArtifact, authority)

		expect(reconciled.ok, JSON.stringify(reconciled.diagnostics, null, 2)).toBe(true)
		expect(reconciled.files[0]!.sourceText).toBe('import { helper as localHelper } from "@scope/helpers";\nexport const value = localHelper();\n')
		expect(reconciled.files[0]!.resultingFileHash).toMatch(/^f1_[a-f0-9]{64}$/u)
		expect(reconciled.files[0]!.importEdits).toHaveLength(1)

		const alreadyImported = reconcileArtifactSetImports([{
			...changes[0]!,
			sourceText: 'import { helper as localHelper } from "@scope/helpers";\nexport const value = localHelper();\n'
		}], collected.requirementsByArtifact, authority)
		expect(alreadyImported.files[0]!.importEdits).toEqual([])

		const localCollision = reconcileArtifactSetImports([{
			...changes[0]!,
			sourceText: 'const localHelper = () => 1;\nexport const value = localHelper();\n'
		}], collected.requirementsByArtifact, authority)
		expect(localCollision.ok).toBe(false)
		expect(localCollision.diagnostics.map(item => item.code)).toContain('ImportLocalNameConflict')
		expect(localCollision.files[0]!.importEdits).toEqual([])
		expect(localCollision.files[0]!.sourceText).toBe('const localHelper = () => 1;\nexport const value = localHelper();\n')
	})

	it('authenticates import reconciliation across assembly and semantic phase evidence', () => {
		const requirement = {
			schemaVersion: 1 as const,
			moduleSpecifier: './helper.js',
			importKind: 'named' as const,
			importedName: 'helper',
			localName: 'helper',
			typeOnly: false
		}
		const template = defineTemplate({
			modelId: 'GeneratedWithHelper',
			importRequirements: [requirement],
			inputs: {}, output: { kind: 'sourceFile' },
			source: 'export const generated = helper();'
		})
		const plan: ArtifactSetPlan = {
			artifacts: [{
				id: 'generated',
				graph: { nodes: [{ id: 'root', templateId: template.modelId, inputs: {} }], finalNodeId: 'root' },
				target: { kind: 'createFile', path: 'src/generated.ts' }
			}]
		}
		const workspaceFiles = {
			'tsconfig.json': JSON.stringify({
				compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true },
				include: ['src/**/*.ts']
			}),
			'src/helper.ts': 'export const helper = (): number => 1;\n'
		}
		const options = {
			workspaceFiles,
			tsConfigFilePath: 'tsconfig.json',
			workspaceSnapshotId: createArtifactSetWorkspaceSnapshotHash(workspaceFiles, undefined, 'tsconfig.json')
		}
		const compilation = compileArtifactSetGraphs(plan, [template], options)
		expect(compilation).toMatchObject({ ok: true, complete: true })
		const authority = [{
			schemaVersion: 1 as const,
			artifactId: 'generated',
			path: 'src/generated.ts',
			allowed: [requirement]
		}]
		const assembly = assembleCompiledArtifactSetWithImports(compilation, [template], authority, options)
		expect(assembly.ok, JSON.stringify(assembly.diagnostics, null, 2)).toBe(true)
		if (!assembly.ok) return
		expect(assembly.changes[0]!.sourceText).toBe(
			'import { helper } from "./helper.js";\nexport const generated = helper();'
		)
		const semantic = validateImportReconciledArtifactSetSemantics(
			compilation,
			assembly,
			[template],
			authority,
			options
		)
		expect(semantic.ok, JSON.stringify(semantic.diagnostics, null, 2)).toBe(true)
		if (!semantic.ok) return
		expect(semantic.changes).toEqual(assembly.changes)

		const tamperedAssembly = {
			...assembly,
			changes: assembly.changes.map(change => ({ ...change, sourceText: `${change.sourceText}\n// detached` }))
		}
		expect(validateImportReconciledArtifactSetSemantics(
			compilation,
			tamperedAssembly,
			[template],
			authority,
			options
		)).toMatchObject({
			ok: false,
			diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'ArtifactAssemblyHashMismatch' })])
		})

		const denied = assembleCompiledArtifactSetWithImports(compilation, [template], [], options)
		expect(denied).toMatchObject({
			ok: false,
			diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'MissingArtifactImportAuthority' })])
		})
	})

	it('rejects runtime-value references to unfinished targets while allowing type-only uses', () => {
		const provider = 'export declare const provider: { (value: number): number };\n'
		const discovery = discoverImplementationTargets({ files: { 'src/provider.ts': provider }, enabledTargetKinds: ['declaredCallable'] })
		const unresolvedValues = discovery.unresolvedValues
		const typeScriptAuthority = {
			schemaVersion: 1 as const,
			tsConfigFilePath: 'tsconfig.json',
			authorizedProjectReferences: []
		}
		const workspaceFiles = {
			'tsconfig.json': JSON.stringify({
				compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler' },
				include: ['src/**/*.ts']
			}),
			'src/provider.ts': provider,
			'src/consumer.ts': 'import { provider } from "./provider.js";\nexport const output = 0;\n'
		}
		const runtimeSource = 'import { provider } from "./provider.js";\nexport const output = provider(1);\n'
		const runtime = validateUnresolvedRuntimeValueReferences({
			workspaceFiles,
			changes: [{ path: 'src/consumer.ts', sourceText: runtimeSource }],
			unresolvedValues,
			allowedTargetIds: [],
			typeScriptAuthority
		})

		expect(runtime.ok).toBe(false)
		expect(runtime.references).toHaveLength(1)
		expect(runtime.references[0]!.identifier).toBe('provider')
		expect(runtime.diagnostics.map(item => item.code)).toContain('UnresolvedExternalRuntimeValueReference')

		const typeOnlySource = 'import type { provider } from "./provider.js";\ntype Provider = typeof provider;\nexport const output = 1;\n'
		const typeOnly = validateUnresolvedRuntimeValueReferences({
			workspaceFiles,
			changes: [{ path: 'src/consumer.ts', sourceText: typeOnlySource }],
			unresolvedValues,
			allowedTargetIds: [],
			typeScriptAuthority
		})
		expect(typeOnly).toEqual({ ok: true, references: [], diagnostics: [] })

		const allowed = validateUnresolvedRuntimeValueReferences({
			workspaceFiles,
			changes: [{ path: 'src/consumer.ts', sourceText: runtimeSource }],
			unresolvedValues,
			allowedTargetIds: [unresolvedValues[0]!.targetId],
			typeScriptAuthority
		})
		expect(allowed).toEqual({ ok: true, references: [], diagnostics: [] })
	})

	it('uses captured tsconfig path aliases and rejects non-canonical or host-relative authority', () => {
		const provider = 'export const provider: { (): number } = undefined as never;\n'
		const discovery = discoverImplementationTargets({
			files: { 'src/provider.ts': provider },
			enabledTargetKinds: [],
			configuredRanges: [{
				id: 'provider-expression', path: 'src/provider.ts', qualifiedName: 'provider',
				regionKind: 'expression', symbolSpace: 'value',
				selector: { kind: 'text', exactText: 'undefined as never' }
			}]
		})
		expect(discovery.targets[0]!.symbol.declarationStart).toBe(provider.indexOf('provider'))
		expect(discovery.targets[0]!.symbol.declarationStart).toBeLessThan(discovery.targets[0]!.start)
		const workspaceFiles = {
			'tsconfig.json': JSON.stringify({
				compilerOptions: {
					target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler',
					baseUrl: '.', paths: { '@lib/*': ['src/*'] }
				},
				include: ['src/**/*.ts']
			}),
			'src/provider.ts': provider,
			'src/index.ts': 'export { provider } from "./provider.js";\n',
			'src/consumer.ts': 'export const output = 0;\n'
		}
		const aliasedSource = 'import { provider } from "@lib/index";\nexport const output = provider();\n'
		const aliased = validateUnresolvedRuntimeValueReferences({
			workspaceFiles,
			changes: [{ path: 'src/consumer.ts', sourceText: aliasedSource }],
			unresolvedValues: discovery.unresolvedValues,
			allowedTargetIds: [],
			typeScriptAuthority: {
				schemaVersion: 1, tsConfigFilePath: 'tsconfig.json', authorizedProjectReferences: []
			}
		})

		expect(aliased.ok).toBe(false)
		expect(aliased.references).toHaveLength(1)
		expect(aliased.references[0]!.identifier).toBe('provider')

		const memberProvider = 'export class Service { work(): number { return 0; } }\n'
		const memberDiscovery = discoverImplementationTargets({
			files: { 'src/service.ts': memberProvider },
			enabledTargetKinds: [],
			configuredRanges: [{
				id: 'service-work', path: 'src/service.ts', qualifiedName: 'Service.work',
				regionKind: 'statement', symbolSpace: 'value',
				selector: { kind: 'text', exactText: 'return 0;' }
			}]
		})
		const memberConsumer = 'import { Service } from "@lib/service";\nexport const output = new Service().work();\n'
		const memberReference = validateUnresolvedRuntimeValueReferences({
			workspaceFiles: {
				...workspaceFiles,
				'src/service.ts': memberProvider,
				'src/consumer.ts': memberConsumer
			},
			changes: [{ path: 'src/consumer.ts', sourceText: memberConsumer }],
			unresolvedValues: memberDiscovery.unresolvedValues,
			allowedTargetIds: [],
			typeScriptAuthority: {
				schemaVersion: 1, tsConfigFilePath: 'tsconfig.json', authorizedProjectReferences: []
			}
		})
		expect(memberReference.references.map(reference => reference.identifier)).toEqual(['work'])

		const escaped = validateUnresolvedRuntimeValueReferences({
			workspaceFiles,
			changes: [{ path: 'src/consumer.ts', sourceText: aliasedSource }],
			unresolvedValues: discovery.unresolvedValues,
			allowedTargetIds: [],
			typeScriptAuthority: {
				schemaVersion: 1, tsConfigFilePath: '../outside/tsconfig.json', authorizedProjectReferences: []
			}
		})
		expect(escaped.references).toEqual([])
		expect(escaped.diagnostics.map(item => item.code)).toContain('InvalidUnresolvedValueTypeScriptAuthorityPath')

		const nonCanonical = validateUnresolvedRuntimeValueReferences({
			workspaceFiles,
			changes: [{ path: 'src/consumer.ts', sourceText: aliasedSource }],
			unresolvedValues: discovery.unresolvedValues,
			allowedTargetIds: [],
			typeScriptAuthority: {
				schemaVersion: 1,
				tsConfigFilePath: 'tsconfig.json',
				authorizedProjectReferences: ['z/tsconfig.json', 'a/tsconfig.json']
			}
		})
		expect(nonCanonical.diagnostics.map(item => item.code)).toContain('NonCanonicalUnresolvedValueTypeScriptAuthority')
	})
})
