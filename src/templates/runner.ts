import type {
	CompleteTemplateArtifact,
	GraphCompileOptions,
	GraphPartialCompilationResult,
	GraphTemplateDefinition,
	PartialTemplateArtifact,
	SynthesisDiagnostic,
	SynthesisGraph,
	TemplateArtifactInputMap,
	TemplateCatalogView,
	TemplateRegistry
} from './graphTypes.js'
import { compileGraph, fillTemplateArtifact, type GraphCompiler } from './graph.js'
import { createTemplateRegistry } from './registry.js'

export type GraphRunnerState =
	| { kind: 'ready'; graph: SynthesisGraph }
	| { kind: 'needsGraphRepair'; graph: SynthesisGraph; result: Extract<GraphPartialCompilationResult, { ok: false }>; diagnostics: SynthesisDiagnostic[] }
	| { kind: 'needsArtifactInputs'; graph: SynthesisGraph; artifact: PartialTemplateArtifact; diagnostics: SynthesisDiagnostic[] }
	| { kind: 'complete'; graph: SynthesisGraph; artifact: CompleteTemplateArtifact; diagnostics: SynthesisDiagnostic[] }
	| { kind: 'failed'; graph: SynthesisGraph; diagnostics: SynthesisDiagnostic[] }

export type GraphRunnerAction =
	| { kind: 'replaceGraph'; graph: SynthesisGraph }
	| { kind: 'fill'; inputs: TemplateArtifactInputMap }

export interface GraphRunner {
	/** Stable planner-contract digest captured for this runner session. */
	readonly contractDigest: string
	readonly state: GraphRunnerState
	advance(action?: GraphRunnerAction): GraphRunnerState
}

function isTemplateArray(
	value: TemplateCatalogView | readonly GraphTemplateDefinition<any, string>[]
): value is readonly GraphTemplateDefinition<any, string>[] {
	return Array.isArray(value)
}

function invalidTransition(graph: SynthesisGraph, state: GraphRunnerState, action: GraphRunnerAction | undefined): GraphRunnerState {
	return {
		kind: 'failed',
		graph,
		diagnostics: [{
			stage: 'graph',
			code: 'InvalidRunnerTransition',
			severity: 'error',
			message: `Action ${action?.kind ?? 'advance'} is invalid while runner state is ${state.kind}.`,
			expected: state.kind === 'needsGraphRepair' ? 'replaceGraph' : state.kind === 'needsArtifactInputs' ? 'fill' : 'advance',
			actual: action?.kind ?? 'advance'
		}]
	}
}

/** Create a stateful driver for graph repair and incremental artifact filling. */
export function createGraphRunner(
	compilerOrTemplates: GraphCompiler<any> | TemplateCatalogView | readonly GraphTemplateDefinition<any, string>[],
	graph: SynthesisGraph,
	options: GraphCompileOptions = {}
): GraphRunner {
	const catalog = typeof compilerOrTemplates === 'function'
		? undefined
		: isTemplateArray(compilerOrTemplates)
			? createTemplateRegistry(compilerOrTemplates).snapshot()
			: 'snapshot' in compilerOrTemplates && typeof compilerOrTemplates.snapshot === 'function'
				? (compilerOrTemplates as TemplateRegistry).snapshot()
				: createTemplateRegistry(compilerOrTemplates.list()).snapshot()
	const contractDigest = typeof compilerOrTemplates === 'function'
		? compilerOrTemplates.contractDigest
		: catalog!.contractDigest
	let state: GraphRunnerState = { kind: 'ready', graph }

	const runner: GraphRunner = {
		contractDigest,
		get state() { return state },
		advance(action) {
			if (state.kind === 'ready') {
				if (action) return state = invalidTransition(state.graph, state, action)
				const result = typeof compilerOrTemplates === 'function'
					? compilerOrTemplates(state.graph, { ...options, mode: 'partial' })
					: compileGraph(state.graph, catalog!, { ...options, mode: 'partial' })
				if (!result.ok) {
					if (result.diagnostics.some(diagnostic =>
						diagnostic.code === 'TypeScriptSemanticError' || diagnostic.code === 'CatalogDigestMismatch')) {
						return state = { kind: 'failed', graph: state.graph, diagnostics: result.diagnostics }
					}
					return state = { kind: 'needsGraphRepair', graph: state.graph, result, diagnostics: result.diagnostics }
				}
				if (result.finalArtifact.complete === true) {
					return state = { kind: 'complete', graph: state.graph, artifact: result.finalArtifact, diagnostics: result.diagnostics }
				}
				return state = { kind: 'needsArtifactInputs', graph: state.graph, artifact: result.finalArtifact, diagnostics: result.diagnostics }
			}

			if (state.kind === 'needsGraphRepair' && action?.kind === 'replaceGraph') {
				state = { kind: 'ready', graph: action.graph }
				return runner.advance()
			}

			if (state.kind === 'needsArtifactInputs' && action?.kind === 'fill') {
				const filled = fillTemplateArtifact(state.artifact, action.inputs, options)
				if (!filled.ok) return state = { kind: 'failed', graph: state.graph, diagnostics: filled.diagnostics }
				if (filled.artifact.complete === true) {
					return state = { kind: 'complete', graph: state.graph, artifact: filled.artifact, diagnostics: filled.diagnostics }
				}
				return state = { kind: 'needsArtifactInputs', graph: state.graph, artifact: filled.artifact, diagnostics: filled.diagnostics }
			}

			return state = invalidTransition(state.graph, state, action)
		}
	}

	return runner
}
