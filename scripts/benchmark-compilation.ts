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
import { createCompilationContextLease } from '../src/compilationContext.js'

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
	readonly warmSpread: TimingStats
	readonly operations: number
	readonly peakRssBytes: number
}

/** Median with the observed min/max range, so single-sample noise is visible. */
interface TimingStats {
	readonly medianMilliseconds: number
	readonly minMilliseconds: number
	readonly maxMilliseconds: number
	readonly samples: number
}

/**
 * One multi-step repair loop measured with and without a compilation-context
 * lease.
 *
 * Both arms answer the same question over interleaved repetitions, so reuse is
 * reported as a project count and not only as a timing.
 */
interface AnalysisScopeArmSummary {
	readonly iterations: number
	readonly leasedLoopMilliseconds: TimingStats
	readonly unleasedLoopMilliseconds: TimingStats
	readonly leaseImprovementPercent: number
	/** Projects each lease built for its loop; 1 means the project was reused. */
	readonly leasedProjectRebuilds: readonly number[]
	readonly unleasedOperationCount: number
}

/** First-revision versus second-revision latency within one program-ownership arm. */
interface RevisionArmSummary {
	readonly initialRevisionMilliseconds: TimingStats
	readonly secondRevisionMilliseconds: TimingStats
	readonly revisionImprovementPercent: number
	readonly initialCandidateAnalysisMilliseconds: TimingStats
	readonly secondRevisionCandidateAnalysisMilliseconds: TimingStats
	readonly candidateAnalysisImprovementPercent: number
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
	const warm = Array.from({ length: iterations }, measure)
	const warmStats = timingStats(warm)
	return {
		name,
		coldMilliseconds: round(coldMilliseconds),
		warmMedianMilliseconds: warmStats.medianMilliseconds,
		warmSpread: warmStats,
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

function round(value: number): number {
	return Number(value.toFixed(2))
}

function roundPercent(value: number): number {
	return Number(value.toFixed(1))
}

/**
 * Central tendency plus observed spread.
 *
 * Reporting the range alongside the median makes benchmark noise visible instead
 * of hiding it inside a single-sample percentage.
 */
function timingStats(values: readonly number[]): TimingStats {
	if (values.length === 0) throw new RangeError('timingStats requires at least one sample')
	const ordered = [...values].sort((left, right) => left - right)
	return {
		medianMilliseconds: round(ordered[Math.floor(ordered.length / 2)]!),
		minMilliseconds: round(ordered[0]!),
		maxMilliseconds: round(ordered[ordered.length - 1]!),
		samples: ordered.length
	}
}

/** Positive when the "after" measurement completed faster than the "before" one. */
function improvementPercent(before: number, after: number): number {
	if (before <= 0) return 0
	return roundPercent((100 * (before - after)) / before)
}

function median(values: readonly number[]): number {
	const ordered = [...values].sort((left, right) => left - right)
	return ordered[Math.floor(ordered.length / 2)]!
}

const coldSemantic = measureSemantic(firstSemanticEvidence)
const warmSemantic = Array.from({ length: iterations }, () => measureSemantic(firstSemanticEvidence))

/**
 * Revision-latency samples, one pair per repetition.
 *
 * Each pair measures the same first-then-second revision transition, so both
 * arms do identical work and each can report a median instead of a single
 * sample. See `measureRetainedPair` for why the owner is per-repetition.
 */
const unretainedInitial: SemanticMeasurement[] = []
const unretainedRevision: SemanticMeasurement[] = []
const retainedInitialSamples: SemanticMeasurement[] = []
const retainedRevisionSamples: SemanticMeasurement[] = []

function measureUnretainedPair(): void {
	unretainedInitial.push(measureSemantic(firstSemanticEvidence))
	unretainedRevision.push(measureSemantic(secondSemanticEvidence))
}

/** Build a fresh owner so this repetition measures the same transition as the last. */
function measureRetainedPair(): void {
	const owner = createSemanticProgramOwner()
	try {
		retainedInitialSamples.push(runWithSemanticProgramOwner(owner, () => measureSemantic(firstSemanticEvidence)))
		retainedRevisionSamples.push(runWithSemanticProgramOwner(owner, () => measureSemantic(secondSemanticEvidence)))
	} finally {
		discardSemanticProgramOwner(owner)
	}
}

for (let repetition = 0; repetition < iterations; repetition += 1) {
	// Alternate which arm runs first so neither arm is systematically measured
	// against a colder or warmer JIT state than the other.
	if (repetition % 2 === 0) {
		measureUnretainedPair()
		measureRetainedPair()
	} else {
		measureRetainedPair()
		measureUnretainedPair()
	}
}

function summarizeRevisionArm(
	initial: readonly SemanticMeasurement[],
	revision: readonly SemanticMeasurement[]
): RevisionArmSummary {
	const initialStats = timingStats(initial.map(measurement => measurement.elapsedMilliseconds))
	const revisionStats = timingStats(revision.map(measurement => measurement.elapsedMilliseconds))
	const initialCandidate = timingStats(initial.map(measurement => measurement.candidateAnalysisMilliseconds))
	const revisionCandidate = timingStats(revision.map(measurement => measurement.candidateAnalysisMilliseconds))
	return {
		initialRevisionMilliseconds: initialStats,
		secondRevisionMilliseconds: revisionStats,
		revisionImprovementPercent: improvementPercent(
			initialStats.medianMilliseconds,
			revisionStats.medianMilliseconds
		),
		initialCandidateAnalysisMilliseconds: initialCandidate,
		secondRevisionCandidateAnalysisMilliseconds: revisionCandidate,
		candidateAnalysisImprovementPercent: improvementPercent(
			initialCandidate.medianMilliseconds,
			revisionCandidate.medianMilliseconds
		)
	}
}

const unretainedRevisionSummary = summarizeRevisionArm(unretainedInitial, unretainedRevision)
const retainedRevisionSummary = summarizeRevisionArm(retainedInitialSamples, retainedRevisionSamples)

const semanticCache = baselineAnalysisCacheStats()

// ---------------------------------------------------------------------------
// Analysis-scope arm: a multi-step graph-compilation loop with and without one
// compilation-context lease. This is the mechanism TODO 7.1 measures. Timing is
// read-only local evidence; reuse is proven by the project count, not a clock.
// ---------------------------------------------------------------------------

const analysisLoopSteps = 6
const analysisScopeLeasedSamples: number[] = []
const analysisScopeUnleasedSamples: number[] = []
const analysisScopeRebuilds: number[] = []

function compileMultiGraphOnce(): void {
	const result = compileGraph(multiGraph, registry)
	if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
}

/** One repair-loop repetition under a single retained lease. */
function measureLeasedLoop(): void {
	const lease = createCompilationContextLease()
	try {
		const started = performance.now()
		for (let step = 0; step < analysisLoopSteps; step += 1) lease.run(() => { compileMultiGraphOnce() })
		analysisScopeLeasedSamples.push(performance.now() - started)
		analysisScopeRebuilds.push(lease.projectRebuildCount)
	} finally {
		lease.close()
	}
}

/** The same loop with no lease, so every step builds its own project. */
function measureUnleasedLoop(): void {
	const started = performance.now()
	for (let step = 0; step < analysisLoopSteps; step += 1) compileMultiGraphOnce()
	analysisScopeUnleasedSamples.push(performance.now() - started)
}

for (let repetition = 0; repetition < iterations; repetition += 1) {
	// Alternate first-run order so neither arm is measured against a colder or
	// warmer JIT state than the other, and give each leased repetition a fresh
	// lease so no repetition inherits the previous one's project.
	if (repetition % 2 === 0) {
		measureUnleasedLoop()
		measureLeasedLoop()
	} else {
		measureLeasedLoop()
		measureUnleasedLoop()
	}
}

const analysisScopeLeasedStats = timingStats(analysisScopeLeasedSamples)
const analysisScopeUnleasedStats = timingStats(analysisScopeUnleasedSamples)
const analysisScope: AnalysisScopeArmSummary = {
	iterations,
	leasedLoopMilliseconds: analysisScopeLeasedStats,
	unleasedLoopMilliseconds: analysisScopeUnleasedStats,
	leaseImprovementPercent: improvementPercent(
		analysisScopeUnleasedStats.medianMilliseconds,
		analysisScopeLeasedStats.medianMilliseconds
	),
	leasedProjectRebuilds: analysisScopeRebuilds,
	// Without a lease each step builds and discards its own project.
	unleasedOperationCount: analysisLoopSteps
}

const warmStats = timingStats(warmSemantic.map(measurement => measurement.elapsedMilliseconds))
const warmMedian = warmStats.medianMilliseconds
const coldTypeScriptAnalysis = coldSemantic.baselineAnalysisMilliseconds + coldSemantic.candidateAnalysisMilliseconds
const warmTypeScriptAnalysisMedian = median(warmSemantic.map(measurement =>
	measurement.baselineLookupMilliseconds + measurement.candidateAnalysisMilliseconds))
const semanticValidation = {
	coldMilliseconds: round(coldSemantic.elapsedMilliseconds),
	coldBaselineAnalysisMilliseconds: round(coldSemantic.baselineAnalysisMilliseconds),
	coldCandidateAnalysisMilliseconds: round(coldSemantic.candidateAnalysisMilliseconds),
	warmMedianMilliseconds: warmMedian,
	warmElapsedSpread: warmStats,
	warmBaselineCacheMedianMilliseconds: round(median(
		warmSemantic.map(measurement => measurement.baselineLookupMilliseconds)
	)),
	candidateSemanticMedianMilliseconds: round(median(
		warmSemantic.map(measurement => measurement.candidateAnalysisMilliseconds)
	)),
	// Both revision arms compare a first revision against a second revision
	// within the same arm, so each percentage answers "how much did the second
	// revision improve" rather than mixing two differently-measured operations.
	unretainedProgramRevision: unretainedRevisionSummary,
	retainedProgramRevision: retainedRevisionSummary,
	// Cross-arm comparison, both medians taken over the same interleaved work.
	retainedSecondRevisionSpeedupPercent: improvementPercent(
		unretainedRevisionSummary.secondRevisionMilliseconds.medianMilliseconds,
		retainedRevisionSummary.secondRevisionMilliseconds.medianMilliseconds
	),
	warmImprovementPercent: improvementPercent(coldSemantic.elapsedMilliseconds, warmMedian),
	typeScriptAnalysisWarmImprovementPercent: improvementPercent(
		coldTypeScriptAnalysis,
		warmTypeScriptAnalysisMedian
	),
	cache: {
		hits: semanticCache.hits,
		misses: semanticCache.misses,
		entries: semanticCache.entries,
		retainedBytes: semanticCache.retainedBytes
	},
	operations: iterations * 5 + 1,
	startingRssBytes: semanticStartingRssBytes,
	peakRssBytes: semanticPeakRssBytes,
	peakRssIncreasePercent: roundPercent(
		(100 * (semanticPeakRssBytes - semanticStartingRssBytes)) / semanticStartingRssBytes
	)
}

console.log(JSON.stringify({
	schemaVersion: 5,
	iterations,
	results,
	semanticValidation,
	analysisScope
}, null, 2))
