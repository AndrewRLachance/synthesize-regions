import { performance } from 'node:perf_hooks'
import {
	assembleCompiledArtifactSet,
	compileArtifactSetGraphs,
	compileGraph,
	createArtifactSetWorkspaceSnapshotHash,
	createTemplateRegistry,
	defineTemplate,
	fragmentPort,
	validateAssembledArtifactSetSemantics,
	type ArtifactSetPlan,
	type ArtifactSetAssemblyResult,
	type ArtifactSetGraphCompilationResult,
	type RegionKind,
	type SynthesisGraph,
	type SynthesisNode
} from '../src/index.js'
import {
	baselineAnalysisCacheStats,
	resetBaselineAnalysisCacheForTesting
} from '../src/templates/baselineAnalysisCache.js'
import {
	createSemanticProgramOwner,
	discardSemanticProgramOwner,
	runWithSemanticProgramOwner
} from '../src/internal/semanticProgramOwner.js'

const marker = (kind: RegionKind, id: string, placeholder: string): string =>
	`/** @TYPE ${kind} id=${id} **/${placeholder}/** @END **/`

const requestedIterations = process.argv.find(argument => argument.startsWith('--iterations='))?.slice('--iterations='.length)
const iterations = requestedIterations === undefined ? 5 : Number(requestedIterations)
if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 100) {
	throw new RangeError('--iterations must be an integer between 1 and 100')
}

const Leaf = defineTemplate({
	modelId: 'BenchmarkLeaf',
	inputs: {},
	output: { kind: 'expression' },
	source: 'value'
})
const Wrapper = defineTemplate({
	modelId: 'BenchmarkWrapper',
	inputs: { value: fragmentPort({ regionKind: 'expression', accepts: { sourceModelIds: ['BenchmarkLeaf', 'BenchmarkWrapper'] } }) },
	output: { kind: 'expression' },
	source: `(${marker('expression', 'value', 'value')})`
})
const Declaration = defineTemplate({
	modelId: 'BenchmarkDeclaration',
	inputs: { value: fragmentPort({ regionKind: 'expression', accepts: { sourceModelIds: ['BenchmarkLeaf', 'BenchmarkWrapper'] } }) },
	output: { kind: 'declaration' },
	source: `export const benchmarkValue = ${marker('expression', 'value', 'value')};`
})
const SourceFile = defineTemplate({
	modelId: 'BenchmarkSourceFile',
	inputs: { declaration: fragmentPort({ regionKind: 'declaration', accepts: { sourceModelIds: ['BenchmarkDeclaration'] } }) },
	output: { kind: 'sourceFile' },
	source: marker('declaration', 'declaration', 'export {};')
})
const templates = [Leaf, Wrapper, Declaration, SourceFile] as const
const registry = createTemplateRegistry(templates)

const leafNode: SynthesisNode = { id: 'leaf', templateId: 'BenchmarkLeaf', inputs: {} }
const singleGraph: SynthesisGraph = { nodes: [leafNode], finalNodeId: 'leaf' }
const chainNodes: SynthesisNode[] = [leafNode]
let previous = leafNode.id
for (let index = 0; index < 16; index += 1) {
	const id = `wrapper-${index}`
	chainNodes.push({ id, templateId: 'BenchmarkWrapper', inputs: { value: { kind: 'ref', nodeId: previous } } })
	previous = id
}
const multiGraph: SynthesisGraph = { nodes: chainNodes, finalNodeId: previous }
const artifactGraph: SynthesisGraph = {
	nodes: [
		...chainNodes,
		{ id: 'declaration', templateId: 'BenchmarkDeclaration', inputs: { value: { kind: 'ref', nodeId: previous } } },
		{ id: 'source-file', templateId: 'BenchmarkSourceFile', inputs: { declaration: { kind: 'ref', nodeId: 'declaration' } } }
	],
	finalNodeId: 'source-file',
	goal: { outputKind: 'sourceFile' }
}
const artifactPlan: ArtifactSetPlan = {
	artifacts: [{ id: 'benchmark', target: { kind: 'createFile', path: 'generated/benchmark.ts' }, graph: artifactGraph }]
}

interface BenchmarkResult {
	readonly name: string
	readonly coldMilliseconds: number
	readonly warmMedianMilliseconds: number
	readonly operations: number
	readonly peakRssBytes: number
}

function benchmark(name: string, operation: () => void): BenchmarkResult {
	let peakRssBytes = process.memoryUsage().rss
	const measure = (): number => {
		const started = performance.now()
		operation()
		peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss)
		return performance.now() - started
	}
	const coldMilliseconds = measure()
	const warm = Array.from({ length: iterations }, measure).sort((left, right) => left - right)
	return {
		name,
		coldMilliseconds: Number(coldMilliseconds.toFixed(2)),
		warmMedianMilliseconds: Number(warm[Math.floor(warm.length / 2)]!.toFixed(2)),
		operations: iterations + 1,
		peakRssBytes
	}
}

const results = [
	benchmark('singleGraph', () => {
		const result = compileGraph(singleGraph, registry)
		if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
	}),
	benchmark('multiNodeGraph', () => {
		const result = compileGraph(multiGraph, registry)
		if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
	}),
	benchmark('artifactSetGraphs', () => {
		const result = compileArtifactSetGraphs(artifactPlan, registry)
		if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
	})
]

const SemanticRevisionOne = defineTemplate({
	modelId: 'BenchmarkSemanticRevisionOne', inputs: {}, output: { kind: 'sourceFile' },
	source: 'import { baseValue } from "./base.js";\nexport const generated: number = baseValue;'
})
const SemanticRevisionTwo = defineTemplate({
	modelId: 'BenchmarkSemanticRevisionTwo', inputs: {}, output: { kind: 'sourceFile' },
	source: 'import { baseValue } from "./base.js";\nexport const generated: number = baseValue + 1;'
})
const semanticRegistry = createTemplateRegistry([SemanticRevisionOne, SemanticRevisionTwo])
const semanticWorkspaceFiles: Record<string, string> = {
	'tsconfig.json': JSON.stringify({
		compilerOptions: {
			target: 'ES2022', module: 'ES2022', moduleResolution: 'Bundler', strict: true, skipLibCheck: true
		},
		include: ['src/**/*.ts']
	}),
	'src/base.ts': 'export const baseValue = 1;'
}
for (let index = 0; index < 80; index += 1) {
	const properties = Array.from({ length: 20 }, (_, property) => `readonly value${property}: number`).join('; ')
	const values = Array.from({ length: 20 }, (_, property) => `value${property}: ${index + property}`).join(', ')
	semanticWorkspaceFiles[`src/library-${index}.ts`] = [
		`export interface Library${index} { ${properties} }`,
		`export const library${index}: Library${index} = { ${values} };`
	].join('\n')
}
const semanticOptions = {
	workspaceFiles: semanticWorkspaceFiles,
	workspaceRoot: '/virtual/synthesize-regions-semantic-benchmark',
	workspaceSnapshotId: createArtifactSetWorkspaceSnapshotHash(
		semanticWorkspaceFiles, undefined, 'tsconfig.json'
	),
	tsConfigFilePath: 'tsconfig.json',
	securityPolicy: { forbidImports: false }
}

function semanticPlan(templateId: string): ArtifactSetPlan {
	return {
		artifacts: [{
			id: 'benchmark-semantic',
			graph: {
				nodes: [{ id: 'module', templateId, inputs: {} }],
				finalNodeId: 'module', goal: { outputKind: 'sourceFile' }
			},
			target: { kind: 'createFile', path: 'src/generated.ts' }
		}]
	}
}

function semanticEvidence(templateId: string): {
	readonly compilation: ArtifactSetGraphCompilationResult
	readonly assembly: ArtifactSetAssemblyResult
} {
	const compilation = compileArtifactSetGraphs(semanticPlan(templateId), semanticRegistry, semanticOptions)
	if (!compilation.ok || !compilation.complete) throw new Error(JSON.stringify(compilation.diagnostics))
	const assembly = assembleCompiledArtifactSet(compilation, semanticRegistry, semanticOptions)
	if (!assembly.ok) throw new Error(JSON.stringify(assembly.diagnostics))
	return { compilation, assembly }
}

const firstSemanticEvidence = semanticEvidence('BenchmarkSemanticRevisionOne')
const secondSemanticEvidence = semanticEvidence('BenchmarkSemanticRevisionTwo')
resetBaselineAnalysisCacheForTesting()

interface SemanticMeasurement {
	readonly elapsedMilliseconds: number
	readonly baselineAnalysisMilliseconds: number
	readonly baselineLookupMilliseconds: number
	readonly candidateAnalysisMilliseconds: number
}

const semanticStartingRssBytes = process.memoryUsage().rss
let semanticPeakRssBytes = semanticStartingRssBytes
function measureSemantic(
	evidence: ReturnType<typeof semanticEvidence>
): SemanticMeasurement {
	const before = baselineAnalysisCacheStats()
	const started = performance.now()
	const result = validateAssembledArtifactSetSemantics(
		evidence.compilation, evidence.assembly, semanticRegistry, semanticOptions
	)
	const elapsedMilliseconds = performance.now() - started
	if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
	semanticPeakRssBytes = Math.max(semanticPeakRssBytes, process.memoryUsage().rss)
	const after = baselineAnalysisCacheStats()
	return {
		elapsedMilliseconds,
		baselineAnalysisMilliseconds: after.baselineAnalysisMilliseconds - before.baselineAnalysisMilliseconds,
		baselineLookupMilliseconds: after.baselineLookupMilliseconds - before.baselineLookupMilliseconds,
		candidateAnalysisMilliseconds: after.candidateAnalysisMilliseconds - before.candidateAnalysisMilliseconds
	}
}

function median(values: readonly number[]): number {
	const ordered = [...values].sort((left, right) => left - right)
	return ordered[Math.floor(ordered.length / 2)]!
}

const coldSemantic = measureSemantic(firstSemanticEvidence)
const warmSemantic = Array.from({ length: iterations }, () => measureSemantic(firstSemanticEvidence))
const consecutiveRevision = measureSemantic(secondSemanticEvidence)
const semanticOwner = createSemanticProgramOwner()
const retainedInitial = runWithSemanticProgramOwner(semanticOwner, () => measureSemantic(firstSemanticEvidence))
const retainedConsecutiveRevision = runWithSemanticProgramOwner(semanticOwner, () => measureSemantic(secondSemanticEvidence))
discardSemanticProgramOwner(semanticOwner)
const semanticCache = baselineAnalysisCacheStats()
const warmMedian = median(warmSemantic.map(measurement => measurement.elapsedMilliseconds))
const semanticValidation = {
	coldMilliseconds: Number(coldSemantic.elapsedMilliseconds.toFixed(2)),
	coldBaselineAnalysisMilliseconds: Number(coldSemantic.baselineAnalysisMilliseconds.toFixed(2)),
	coldCandidateAnalysisMilliseconds: Number(coldSemantic.candidateAnalysisMilliseconds.toFixed(2)),
	warmMedianMilliseconds: Number(warmMedian.toFixed(2)),
	warmBaselineCacheMedianMilliseconds: Number(median(
		warmSemantic.map(measurement => measurement.baselineLookupMilliseconds)
	).toFixed(2)),
	candidateSemanticMedianMilliseconds: Number(median(
		warmSemantic.map(measurement => measurement.candidateAnalysisMilliseconds)
	).toFixed(2)),
	consecutiveRevisionMilliseconds: Number(consecutiveRevision.elapsedMilliseconds.toFixed(2)),
	consecutiveRevisionCandidateMilliseconds: Number(consecutiveRevision.candidateAnalysisMilliseconds.toFixed(2)),
	retainedInitialMilliseconds: Number(retainedInitial.elapsedMilliseconds.toFixed(2)),
	retainedConsecutiveRevisionMilliseconds: Number(retainedConsecutiveRevision.elapsedMilliseconds.toFixed(2)),
	retainedConsecutiveRevisionCandidateMilliseconds: Number(retainedConsecutiveRevision.candidateAnalysisMilliseconds.toFixed(2)),
	retainedRevisionImprovementPercent: Number((100 * (
		consecutiveRevision.elapsedMilliseconds - retainedConsecutiveRevision.elapsedMilliseconds
	) / consecutiveRevision.elapsedMilliseconds).toFixed(1)),
	warmImprovementPercent: Number((100 * (coldSemantic.elapsedMilliseconds - warmMedian) / coldSemantic.elapsedMilliseconds).toFixed(1)),
	typeScriptAnalysisWarmImprovementPercent: Number((100 * (
		coldSemantic.baselineAnalysisMilliseconds + coldSemantic.candidateAnalysisMilliseconds
		- median(warmSemantic.map(measurement =>
			measurement.baselineLookupMilliseconds + measurement.candidateAnalysisMilliseconds))
	) / (coldSemantic.baselineAnalysisMilliseconds + coldSemantic.candidateAnalysisMilliseconds)).toFixed(1)),
	cache: {
		hits: semanticCache.hits,
		misses: semanticCache.misses,
		entries: semanticCache.entries,
		retainedBytes: semanticCache.retainedBytes
	},
	operations: iterations + 4,
	startingRssBytes: semanticStartingRssBytes,
	peakRssBytes: semanticPeakRssBytes,
	peakRssIncreasePercent: Number((100 * (semanticPeakRssBytes - semanticStartingRssBytes) / semanticStartingRssBytes).toFixed(1))
}

console.log(JSON.stringify({
	schemaVersion: 3,
	iterations,
	results,
	semanticValidation
}, null, 2))
