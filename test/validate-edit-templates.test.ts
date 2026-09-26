import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
	compileArtifactSet,
	compileGraph,
	createArtifactSetWorkspaceSnapshotHash,
	createTemplateRegistryFromManifests,
	type ArtifactSetPlan,
	type SynthesisGraph,
	type SynthesisInput,
	type SynthesisNode
} from '../src/index.js'
import {
	validateEditGoal,
	validateEditStarterGraph,
	validateEditTemplateManifests
} from '../core-templates/validate-edit-templates.js'

const memberInputs = [
	'abstractInstanceVariables',
	'privateInstanceVariables',
	'protectedInstanceVariables',
	'staticVariables',
	'privateMethods',
	'protectedMethods',
	'staticMethods'
] as const

const helperNodes = [
	['abstract-instance-variable', 'AbstractInstanceVariable'],
	['private-instance-variable', 'PrivateInstanceVariable'],
	['protected-instance-variable', 'ProtectedInstanceVariable'],
	['static-variable', 'StaticVariable'],
	['private-method', 'PrivateMethod'],
	['protected-method', 'ProtectedMethod'],
	['static-method', 'StaticMethod']
] as const

const literal = (value: string): SynthesisInput => ({ kind: 'literal', value })
const rawCode = (code: string): SynthesisInput => ({ kind: 'rawCode', code })
const collection = (...nodeIds: readonly string[]): SynthesisInput => ({
	kind: 'fragmentCollection',
	items: nodeIds.map(nodeId => ({ kind: 'ref', nodeId }))
})

const artifactSetFixtureUrls = {
	'tsconfig.json': new URL(
		'./artifact-set-fixtures/abstract-reasoning-graph/tsconfig.json',
		import.meta.url
	),
	'src/blackboard/reasoning-graph.ts': new URL(
		'./artifact-set-fixtures/abstract-reasoning-graph/src/blackboard/reasoning-graph.ts',
		import.meta.url
	),
	'src/domain/evidence.ts': new URL(
		'./artifact-set-fixtures/abstract-reasoning-graph/src/domain/evidence.ts',
		import.meta.url
	)
} as const

const artifactSetWorkspaceFiles: Readonly<Record<string, string>> = Object.fromEntries(
	Object.entries(artifactSetFixtureUrls).map(([path, url]) => [
		path,
		readFileSync(url, 'utf8')
	])
)

describe('validate-edit AbstractReasoningGraph starter graph', () => {
	it('wraps the abstract reasoning graph declaration in a complete source file', () => {
		expect(validateEditGoal).toEqual({ outputKind: 'sourceFile' })
		expect(validateEditStarterGraph.finalNodeId).toBe('abstract-reasoning-graph-source-file')
		expect(validateEditStarterGraph.nodes).toHaveLength(2)
		const nodes = new Map(validateEditStarterGraph.nodes.map(node => [node.id, node]))
		for (const [, templateId] of helperNodes) {
			expect(validateEditStarterGraph.nodes).not.toContainEqual(
				expect.objectContaining({ templateId })
			)
		}
		expect(nodes.get('abstract-reasoning-graph')).toEqual({
			id: 'abstract-reasoning-graph',
			templateId: 'AbstractReasoningGraph',
			inputs: Object.fromEntries(memberInputs.map(inputName => [
				inputName,
				{ kind: 'fragmentCollection', items: [] }
			]))
		})
		expect(nodes.get('abstract-reasoning-graph-source-file')).toEqual({
			id: 'abstract-reasoning-graph-source-file',
			templateId: 'AbstractReasoningGraphSourceFile',
			inputs: {
				declaration: { kind: 'ref', nodeId: 'abstract-reasoning-graph' }
			}
		})

		expect(validateEditTemplateManifests).toHaveLength(9)
		const manifest = validateEditTemplateManifests.find(
			candidate => candidate.modelId === 'AbstractReasoningGraph'
		)
		expect(manifest?.modelId).toBe('AbstractReasoningGraph')
		expect(manifest?.description).toContain('provenance graph')
		expect(manifest?.callableScope).toBeUndefined()
		expect(manifest?.output).toEqual({ kind: 'declaration' })
		expect(Object.keys(manifest?.inputs ?? {})).toEqual(memberInputs)

		const sourceFileManifest = validateEditTemplateManifests.find(
			candidate => candidate.modelId === 'AbstractReasoningGraphSourceFile'
		)
		expect(sourceFileManifest?.output).toEqual({ kind: 'sourceFile' })
		expect(sourceFileManifest?.inputs.declaration).toMatchObject({
			kind: 'fragment',
			regionKind: 'declaration',
			accepts: {
				outputKind: 'declaration',
				sourceModelIds: ['AbstractReasoningGraph']
			}
		})

		for (const [modelId, expectedSource] of [
			['AbstractInstanceVariable', 'protected abstract '],
			['PrivateInstanceVariable', 'private '],
			['ProtectedInstanceVariable', 'protected '],
			['StaticVariable', 'static '],
			['PrivateMethod', 'private '],
			['ProtectedMethod', 'protected '],
			['StaticMethod', 'static ']
		] as const) {
			const helper = validateEditTemplateManifests.find(
				candidate => candidate.modelId === modelId
			)
			expect(helper?.source.startsWith(expectedSource)).toBe(true)
			expect(helper?.inputs).not.toHaveProperty('code')
		}
	})

	it('compiles a complete source file with zero helper members', () => {
		const registry = createTemplateRegistryFromManifests(validateEditTemplateManifests)
		const result = compileGraph(validateEditStarterGraph, registry, {
			mode: 'strict',
			checkSemanticDiagnostics: false,
			securityPolicy: { forbidImports: false },
			format: 'ts-morph'
		})

		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (!result.ok) return
		expect(result.finalArtifact).toMatchObject({ complete: true, kind: 'sourceFile' })
		expect(result.finalArtifact.code).toContain('from "../blackboard/reasoning-graph"')
		expect(result.finalArtifact.code).toContain('from "../domain/evidence"')
		expect(result.finalArtifact.code).toContain('export abstract class AbstractReasoningGraph')
		expect(result.finalArtifact.code).toContain('abstract addEdges(')
		expect(result.finalArtifact.code).not.toMatch(/pVariable|prVariable|sVariable|placeholder/u)
	})

	it('assembles and statically validates the source file against captured imports', () => {
		const registry = createTemplateRegistryFromManifests(validateEditTemplateManifests)
		const targetPath = 'src/reasoning/abstract-reasoning-graph.ts'
		const plan: ArtifactSetPlan = {
			artifacts: [{
				id: 'abstract-reasoning-graph',
				graph: validateEditStarterGraph,
				target: { kind: 'createFile', path: targetPath }
			}]
		}
		const result = compileArtifactSet(plan, registry, {
			mode: 'strict',
			workspaceFiles: artifactSetWorkspaceFiles,
			workspaceSnapshotId: createArtifactSetWorkspaceSnapshotHash(
				artifactSetWorkspaceFiles,
				undefined,
				'tsconfig.json'
			),
			tsConfigFilePath: 'tsconfig.json',
			securityPolicy: { forbidImports: false },
			format: 'ts-morph'
		})

		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (!result.ok) return
		expect(result).toMatchObject({
			complete: true,
			validation: 'static',
			changes: [{ kind: 'createFile', path: targetPath }]
		})
		const sourceText = result.changes[0]?.sourceText
		expect(sourceText).toContain('from "../blackboard/reasoning-graph"')
		expect(sourceText).toContain('from "../domain/evidence"')
		expect(sourceText).toContain('export abstract class AbstractReasoningGraph')
	})

	it('renders multiple enforced members in each selected collection', () => {
		const inputsByNodeId: Record<string, Record<string, SynthesisInput>> = {
			'abstract-instance-variable': {
				name: literal('edges'),
				type: rawCode('readonly ReasoningEdge[]')
			},
			'private-instance-variable': {
				name: literal('privateState'),
				type: rawCode('number'),
				initializer: rawCode('0')
			},
			'private-instance-variable-secondary': {
				name: literal('privateLabel'),
				type: rawCode('string'),
				initializer: rawCode('""')
			},
			'protected-instance-variable': {
				name: literal('label'),
				type: rawCode('string'),
				initializer: rawCode('""')
			},
			'static-variable': {
				name: literal('instances'),
				type: rawCode('number'),
				initializer: rawCode('0')
			},
			'private-method': {
				name: literal('resetState'),
				body: rawCode('this.privateState = 0;')
			},
			'private-method-secondary': {
				name: literal('clearLabel'),
				body: rawCode('this.privateLabel = "";')
			},
			'protected-method': {
				name: literal('clear'),
				body: rawCode('this.resetState();')
			},
			'static-method': {
				name: literal('resetCount'),
				body: rawCode('this.instances = 0;')
			}
		}
		const classNode = validateEditStarterGraph.nodes.find(
			node => node.id === 'abstract-reasoning-graph'
		)
		const sourceFileNode = validateEditStarterGraph.nodes.find(
			node => node.id === 'abstract-reasoning-graph-source-file'
		)
		if (classNode === undefined || sourceFileNode === undefined) {
			throw new Error('Validate-edit starter graph is missing its class or source-file node')
		}
		const populatedHelperNodes: SynthesisNode[] = helperNodes.map(([id, templateId]) => {
			const inputs = inputsByNodeId[id]
			if (inputs === undefined) throw new Error(`Missing test inputs for ${id}`)
			return { id, templateId, inputs }
		})
		const completeGraph: SynthesisGraph = {
			nodes: [
				...populatedHelperNodes,
				{
					id: 'private-instance-variable-secondary',
					templateId: 'PrivateInstanceVariable',
					inputs: inputsByNodeId['private-instance-variable-secondary']!
				},
				{
					id: 'private-method-secondary',
					templateId: 'PrivateMethod',
					inputs: inputsByNodeId['private-method-secondary']!
				},
				{
					...classNode,
					inputs: {
						abstractInstanceVariables: collection('abstract-instance-variable'),
						privateInstanceVariables: collection(
							'private-instance-variable',
							'private-instance-variable-secondary'
						),
						protectedInstanceVariables: collection('protected-instance-variable'),
						staticVariables: collection('static-variable'),
						privateMethods: collection('private-method', 'private-method-secondary'),
						protectedMethods: collection('protected-method'),
						staticMethods: collection('static-method')
					}
				},
				sourceFileNode
			],
			finalNodeId: validateEditStarterGraph.finalNodeId,
			goal: validateEditGoal
		}
		const registry = createTemplateRegistryFromManifests(validateEditTemplateManifests)
		const result = compileGraph(completeGraph, registry, {
			mode: 'strict',
			checkSemanticDiagnostics: false,
			securityPolicy: { forbidImports: false },
			format: 'ts-morph'
		})

		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (!result.ok) return
		expect(result.finalArtifact).toMatchObject({ complete: true, kind: 'sourceFile' })
		expect(result.finalArtifact.code).toContain('protected abstract edges: readonly ReasoningEdge[];')
		expect(result.finalArtifact.code).toContain('private privateState: number = 0;')
		expect(result.finalArtifact.code).toContain('private privateLabel: string = "";')
		expect(result.finalArtifact.code).toContain('protected label: string = "";')
		expect(result.finalArtifact.code).toContain('static instances: number = 0;')
		expect(result.finalArtifact.code).toContain('private resetState()')
		expect(result.finalArtifact.code).toContain('private clearLabel()')
		expect(result.finalArtifact.code).toContain('protected clear()')
		expect(result.finalArtifact.code).toContain('static resetCount()')
	})
})
