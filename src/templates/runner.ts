import type {
	CompleteTemplateArtifact,
	GraphCompileOptions,
	GraphPatchAction,
	GraphPartialCompilationResult,
	GraphRunnerAction,
	GraphTemplateDefinition,
	PartialTemplateArtifact,
	SynthesisDiagnostic,
	SynthesisGraph,
	TemplateCatalogView,
	TemplateRegistry
} from './graphTypes.js'
import { GRAPH_PATCH_ACTION_KIND_VALUES } from './graphTypes.js'
import { compileGraph, fillTemplateArtifact, type GraphCompiler } from './graph.js'
import { GraphRunnerActionSchema, checkContract } from './graphContracts.js'
import { applyGraphPatch } from './graphPatch.js'
import { createTemplateRegistry } from './registry.js'

export type GraphRunnerState =
	| { kind: 'ready'; graph: SynthesisGraph }
	| { kind: 'needsGraphRepair'; classification: 'graphRepairable'; graph: SynthesisGraph; result: Extract<GraphPartialCompilationResult, { ok: false }>; diagnostics: SynthesisDiagnostic[] }
	| { kind: 'needsArtifactInputs'; classification: 'artifactFillable'; graph: SynthesisGraph; artifact: PartialTemplateArtifact; diagnostics: SynthesisDiagnostic[] }
	| { kind: 'complete'; graph: SynthesisGraph; artifact: CompleteTemplateArtifact; diagnostics: SynthesisDiagnostic[] }
	| { kind: 'failed'; classification: 'templatePolicyFailure' | 'terminalFailure'; graph: SynthesisGraph; diagnostics: SynthesisDiagnostic[] }

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

const graphPatchActionKinds = new Set<string>(GRAPH_PATCH_ACTION_KIND_VALUES)

function isGraphPatchAction(action: GraphRunnerAction): action is GraphPatchAction {
	return graphPatchActionKinds.has(action.kind)
}

function invalidRunnerAction(action: unknown): SynthesisDiagnostic {
	return {
		stage: 'graph',
		code: 'InvalidGraphRunnerAction',
		severity: 'error',
		message: 'Runner action does not match a supported schema-backed action shape.',
		path: 'action',
		expected: 'GraphRunnerAction',
		actual: action
	}
}

function runnerActionKind(action: unknown): string {
	return typeof action === 'object' && action !== null && 'kind' in action && typeof action.kind === 'string'
		? action.kind
		: action === undefined ? 'advance' : 'invalidAction'
}

function invalidTransition(graph: SynthesisGraph, state: GraphRunnerState, action: unknown): GraphRunnerState {
	const actionKind = runnerActionKind(action)
	return {
		kind: 'failed',
		classification: 'terminalFailure',
		graph,
		diagnostics: [{
			stage: 'graph',
			code: 'InvalidRunnerTransition',
			severity: 'error',
			message: `Action ${actionKind} is invalid while runner state is ${state.kind}.`,
			expected: state.kind === 'needsGraphRepair'
				? [...GRAPH_PATCH_ACTION_KIND_VALUES, 'replaceGraph']
				: state.kind === 'needsArtifactInputs'
					? [...GRAPH_PATCH_ACTION_KIND_VALUES, 'replaceGraph', 'fill']
					: 'advance',
			actual: actionKind
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

	function compileRunnerGraph(candidateGraph: SynthesisGraph): GraphRunnerState {
		const result = typeof compilerOrTemplates === 'function'
			? compilerOrTemplates(candidateGraph, { ...options, mode: 'partial' })
			: compileGraph(candidateGraph, catalog!, { ...options, mode: 'partial' })
		if (!result.ok) {
			if (result.classification === 'graphRepairable') {
				return {
					kind: 'needsGraphRepair',
					classification: 'graphRepairable',
					graph: candidateGraph,
					result,
					diagnostics: result.diagnostics
				}
			}
			return {
				kind: 'failed',
				classification: result.classification,
				graph: candidateGraph,
				diagnostics: result.diagnostics
			}
		}
		if (result.finalArtifact.complete === true) {
			return {
				kind: 'complete',
				graph: candidateGraph,
				artifact: result.finalArtifact,
				diagnostics: result.diagnostics
			}
		}
		return {
			kind: 'needsArtifactInputs',
			classification: 'artifactFillable',
			graph: candidateGraph,
			artifact: result.finalArtifact,
			diagnostics: result.diagnostics
		}
	}

	function rejectAction(diagnostics: SynthesisDiagnostic[]): GraphRunnerState {
		if (state.kind === 'needsGraphRepair') {
			return {
				...state,
				diagnostics: [...state.result.diagnostics, ...diagnostics]
			}
		}
		if (state.kind === 'needsArtifactInputs') {
			return { ...state, diagnostics }
		}
		return invalidTransition(state.graph, state, undefined)
	}

	const runner: GraphRunner = {
		contractDigest,
		get state() { return state },
		advance(action) {
			if (state.kind === 'ready') {
				if (action) return state = invalidTransition(state.graph, state, action)
				return state = compileRunnerGraph(state.graph)
			}

			if (state.kind !== 'needsGraphRepair' && state.kind !== 'needsArtifactInputs') {
				return state = invalidTransition(state.graph, state, action)
			}

			if (action === undefined) return state = invalidTransition(state.graph, state, action)
			if (!checkContract(GraphRunnerActionSchema, action)) {
				return state = rejectAction([invalidRunnerAction(action)])
			}

			if (action.kind === 'replaceGraph') {
				return state = compileRunnerGraph(action.graph)
			}

			if (isGraphPatchAction(action)) {
				const patched = applyGraphPatch(state.graph, action)
				if (!patched.ok) {
					return state = rejectAction(
						patched.diagnostics.length > 0 ? patched.diagnostics : [invalidRunnerAction(action)]
					)
				}
				return state = compileRunnerGraph(patched.graph)
			}

			if (state.kind === 'needsArtifactInputs' && action?.kind === 'fill') {
				const pending = state
				const filled = fillTemplateArtifact(state.artifact, action.inputs, options)
				if (!filled.ok) {
					if (filled.classification === 'artifactFillable') {
						return state = { ...pending, diagnostics: filled.diagnostics }
					}
					return state = {
						kind: 'failed',
						classification: filled.classification,
						graph: state.graph,
						diagnostics: filled.diagnostics
					}
				}
				if (filled.artifact.complete === true) {
					return state = { kind: 'complete', graph: state.graph, artifact: filled.artifact, diagnostics: filled.diagnostics }
				}
				return state = {
					kind: 'needsArtifactInputs',
					classification: 'artifactFillable',
					graph: state.graph,
					artifact: filled.artifact,
					diagnostics: filled.diagnostics
				}
			}

			return state = invalidTransition(state.graph, state, action)
		}
	}

	return runner
}
