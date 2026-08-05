import { describe, expect, it } from 'vitest'

import {
	compileGraph,
	createTemplateRegistryFromManifests
} from '../src/index.js'
import {
	validateEditStarterGraph,
	validateEditTemplateManifests
} from '../samples/validate-edit-templates.js'

const dependencies = [
	['constructor-parameter-assembler', 'assembler', 'DocumentAssembler'],
	['constructor-parameter-evidence-indexer', 'evidenceIndexer', 'DocumentEvidenceIndexer'],
	['constructor-parameter-classifier', 'classifier', 'HierarchicalTopKClassifier'],
	['constructor-parameter-extractor', 'extractor', 'TopKExtractionCoordinator'],
	['constructor-parameter-validator', 'validator', 'ExtractionCandidateValidator'],
	['constructor-parameter-ranker', 'ranker', 'ExtractionCandidateRanker'],
	['constructor-parameter-document-factory', 'documentFactory', 'TransactionDocumentFactory'],
	['constructor-parameter-scoring-policy', 'scoringPolicy', 'ExtractionCandidateScoringPolicy'],
	['constructor-parameter-acceptance-policy', 'acceptancePolicy', 'ExtractionCandidateAcceptancePolicy']
] as const

const methodIds = [
	'method-interpret',
	'method-assemble',
	'method-index-evidence',
	'method-classify',
	'method-extract',
	'method-validate',
	'method-rank'
] as const

const collection = (nodeIds: readonly string[]) => ({
	kind: 'fragmentCollection',
	items: nodeIds.map(nodeId => ({ kind: 'ref', nodeId }))
})

describe('validate-edit starter graph', () => {
	it('constructs every inherited dependency and leaves only method bodies unresolved', () => {
		const nodes = new Map(validateEditStarterGraph.nodes.map(node => [node.id, node]))
		const dependencyIds = dependencies.map(([nodeId]) => nodeId)

		expect(validateEditStarterGraph.nodes).toHaveLength(78)
		expect(validateEditStarterGraph.nodes.filter(
			node => node.templateId === 'PublicOverrideReadonlyProperty'
		)).toEqual([])
		for (const [nodeId] of dependencies) {
			expect(nodes.get(nodeId)?.templateId).toBe('PublicOverrideReadonlyConstructorParameter')
		}

		expect(nodes.get('constructor-super-call')).toEqual({
			id: 'constructor-super-call',
			templateId: 'SuperCallStatement',
			inputs: {}
		})
		expect(nodes.get('interpreter-constructor')).toMatchObject({
			templateId: 'Constructor',
			inputs: {
				parameters: collection(dependencyIds),
				body: collection(['constructor-super-call'])
			}
		})
		expect(nodes.get('interpreter-class')?.inputs.members).toEqual(
			collection(['interpreter-constructor', ...methodIds])
		)

		const registry = createTemplateRegistryFromManifests(validateEditTemplateManifests)
		const result = compileGraph(validateEditStarterGraph, registry, {
			mode: 'partial',
			compilationScope: 'validate-edit-sample-test',
			securityPolicy: { forbidImports: false },
			format: 'ts-morph'
		})

		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (!result.ok) return
		expect(result.finalArtifact.complete).toBe(false)
		if (result.finalArtifact.complete !== false) return

		expect(result.finalArtifact.unresolvedInputs
			.map(input => `${input.nodeId}.${input.inputName}`)
			.sort()
		).toEqual(methodIds.map(methodId => `${methodId}.body`).sort())
		expect(result.finalArtifact.code).toContain('constructor(')
		expect(result.finalArtifact.code).toContain('super();')
		for (const [, name, type] of dependencies) {
			expect(result.finalArtifact.code).toContain(`public override readonly ${name}: ${type}`)
		}
	})

	it('publishes callable ownership for methods and arrows but not constructors', () => {
		const manifests = new Map(validateEditTemplateManifests.map(manifest => [manifest.modelId, manifest]))
		for (const modelId of [
			'ArrowExpression',
			'OverrideAsyncClassMethod',
			'OverrideClassMethod',
			'ProtectedOverrideClassMethod'
		]) {
			expect(manifests.get(modelId)?.callableScope).toEqual({
				parametersInput: 'parameters',
				bodyInput: 'body'
			})
		}
		expect(manifests.get('Constructor')?.callableScope).toBeUndefined()
	})
})
