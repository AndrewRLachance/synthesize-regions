import type {
	CompleteTemplateArtifact,
	GraphCompileOptions,
	GraphPartialCompilationResult,
	GraphTemplateDefinition,
	PartialTemplateArtifact,
	SynthesisDiagnostic,
	SynthesisGraph,
	TemplateArtifactInputMap,
	TemplateRegistry
} from './graphTypes.js'
import { compileGraph, fillTemplateArtifact, type GraphCompiler } from './graph.js'

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
	readonly state: GraphRunnerState
	advance(action?: GraphRunnerAction): GraphRunnerState
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
	compilerOrTemplates: GraphCompiler<any> | TemplateRegistry | readonly GraphTemplateDefinition<any, string>[],
	graph: SynthesisGraph,
	options: GraphCompileOptions = {}
): GraphRunner {
	let state: GraphRunnerState = { kind: 'ready', graph }

	const runner: GraphRunner = {
		get state() { return state },
		advance(action) {
			if (state.kind === 'ready') {
				if (action) return state = invalidTransition(state.graph, state, action)
				const result = typeof compilerOrTemplates === 'function'
					? compilerOrTemplates(state.graph, { ...options, mode: 'partial' })
					: compileGraph(state.graph, compilerOrTemplates as TemplateRegistry, { ...options, mode: 'partial' })
				if (!result.ok) {
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
