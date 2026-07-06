import type {
	GenerateOptions,
	TemplateMode
} from '../core/types.js'
import { buildReplacementEdits, type PlannedReplacementEdit } from '../replacements/serialize.js'
import { discoverReplacementRegions } from '../regions/discovery.js'
import { graphInputsToReplacementMap } from './converter.js'
import type {
	AuthoredGraphInput,
	DefinedSynthesisGraph,
	FragmentInputPort,
	GeneratedFragment,
	GraphCompilationResult,
	GraphCompileOptions,
	GraphPartialCompilationResult,
	GraphTemplateDefinition,
	GraphNormalizationResult,
	InputPort,
	NormalizedSynthesisInput,
	RawCodeInputPort,
	ResolvedGraphInput,
	StrictSynthesisGraph,
	SynthesisDiagnostic,
	SynthesisGraph,
	SynthesisInput,
	SynthesisNode,
	TemplateArtifact,
	TemplateArtifactInput,
	TemplateArtifactInputMap,
	TemplateArtifactResult,
	TemplateRegistry,
	UnresolvedTemplateInput
} from './graphTypes.js'
import { fragmentPortOutputKind, isTypeCompatible, portIsRequired, validateJsonSchemaSubset } from './compatibility.js'
import { createTemplateRegistry } from './registry.js'

/** Create a graph diagnostic with error severity. */
function errorDiagnostic(diagnostic: Omit<SynthesisDiagnostic, 'severity'>): SynthesisDiagnostic {
	return { ...diagnostic, severity: 'error' }
}

/** Detect shorthand graph references of the form `{ "$ref": "nodeId" }`. */
function isRefShorthand(input: SynthesisInput): input is { $ref: string } {
	return typeof input === 'object' && input !== null && '$ref' in input && typeof input.$ref === 'string'
}

/** Normalize shorthand references into the explicit graph input form. */
export function normalizeSynthesisInput(input: SynthesisInput): Exclude<SynthesisInput, { $ref: string }> {
	return isRefShorthand(input) ? { kind: 'ref', nodeId: input.$ref } : input
}

/** Type-check a graph against a template catalog without compiling it yet. */
export function defineGraph<
	const TTemplates extends readonly GraphTemplateDefinition<any, string>[],
	const TGraph extends AuthoredGraphInput
>(templates: TTemplates, graph: StrictSynthesisGraph<TTemplates, TGraph>): DefinedSynthesisGraph<TTemplates> {
	void templates
	return graph as unknown as DefinedSynthesisGraph<TTemplates>
}

/** Callable graph compiler with strict and partial compilation entrypoints. */
export type GraphCompiler<TTemplates extends readonly GraphTemplateDefinition<any, string>[]> = {
	/** Compile a previously defined graph with strict required-input behavior. */
	(graph: DefinedSynthesisGraph<TTemplates>): GraphCompilationResult
	/** Compile an inline typed graph with strict required-input behavior. */
	<const TGraph extends AuthoredGraphInput>(graph: StrictSynthesisGraph<TTemplates, TGraph>): GraphCompilationResult
	/** Compile a previously defined graph while preserving missing required inputs. */
	partial(graph: DefinedSynthesisGraph<TTemplates>): GraphPartialCompilationResult
	/** Compile an inline typed graph while preserving missing required inputs. */
	partial<const TGraph extends AuthoredGraphInput>(graph: StrictSynthesisGraph<TTemplates, TGraph>): GraphPartialCompilationResult
	/** Type-check a graph against this compiler's template catalog. */
	defineGraph<const TGraph extends AuthoredGraphInput>(
		graph: StrictSynthesisGraph<TTemplates, TGraph>
	): DefinedSynthesisGraph<TTemplates>
}

/** Build a typed compiler from an authored template catalog. */
export function buildGraphCompiler<const TTemplates extends readonly GraphTemplateDefinition<any, string>[]>(
	templates: TTemplates,
	options?: GraphCompileOptions
): GraphCompiler<TTemplates> {
	const compiler = (graph: SynthesisGraph) => compileGraph(graph, templates, options)
	compiler.partial = (graph: SynthesisGraph) => compilePartialGraph(graph, templates, options)
	compiler.defineGraph = (graph: AuthoredGraphInput) => defineGraph(templates, graph as never)
	return compiler as GraphCompiler<TTemplates>
}

/** Distinguish a template catalog array from a registry instance. */
function isTemplateCatalog(
	value: TemplateRegistry | readonly GraphTemplateDefinition<any, string>[]
): value is readonly GraphTemplateDefinition<any, string>[] {
	return Array.isArray(value)
}

/** Convert either supported template source into a registry. */
function templateRegistryFromInput(
	registryOrTemplates: TemplateRegistry | readonly GraphTemplateDefinition<any, string>[]
): TemplateRegistry {
	return isTemplateCatalog(registryOrTemplates) ? createTemplateRegistry(registryOrTemplates) : registryOrTemplates
}

/** Expand inline nodes and shorthand references before validation/execution. */
export function normalizeSynthesisGraph(graph: SynthesisGraph): GraphNormalizationResult {
	const nodes: SynthesisNode[] = []

	/** Normalize one node and recursively lift inline nodes into the graph list. */
	function normalizeNode(node: SynthesisNode): SynthesisNode {
		const inputs: Record<string, NormalizedSynthesisInput> = {}

		for (const [inputName, input] of Object.entries(node.inputs)) {
			const normalized = normalizeSynthesisInput(input)
			if (normalized.kind === 'inline') {
				const inlineNode = normalizeNode(normalized.node)
				nodes.push(inlineNode)
				inputs[inputName] = { kind: 'ref', nodeId: inlineNode.id }
			} else {
				inputs[inputName] = normalized
			}
		}

		return {
			id: node.id,
			templateId: node.templateId,
			inputs
		}
	}

	for (const node of graph.nodes) {
		nodes.push(normalizeNode(node))
	}

	return {
		graph: {
			nodes,
			finalNodeId: graph.finalNodeId,
			...(graph.goal ? { goal: graph.goal } : {})
		}
	}
}

/** Return node IDs referenced by one graph input. */
function inputDependencies(input: SynthesisInput): string[] {
	const normalized = normalizeSynthesisInput(input)
	if (normalized.kind === 'ref') return [normalized.nodeId]
	if (normalized.kind === 'inline') return Object.values(normalized.node.inputs).flatMap(inputDependencies)
	return []
}

/** Flatten union ports into the concrete port options they accept. */
function inputPortOptions(port: InputPort): InputPort[] {
	return port.kind === 'union' ? port.options : [port]
}

/** Read a template's input map with a narrow helper for future indirection. */
function templateInputs(template: GraphTemplateDefinition): Record<string, InputPort> {
	return template.inputs
}

/** Validate graph shape and static references before any template invocation. */
function validateStaticGraph(
	graph: SynthesisGraph,
	registry: TemplateRegistry,
	options: { allowMissingRequiredInputs?: boolean } = {}
): { diagnostics: SynthesisDiagnostic[]; nodesById: Map<string, SynthesisNode> } {
	const diagnostics: SynthesisDiagnostic[] = []
	const nodesById = new Map<string, SynthesisNode>()
	const seen = new Set<string>()

	for (const node of graph.nodes) {
		if (seen.has(node.id)) {
			diagnostics.push(
				errorDiagnostic({
					stage: 'graph',
					code: 'DuplicateNodeId',
					message: `Duplicate node id ${node.id}.`,
					nodeId: node.id,
					path: `nodes.${node.id}`
				})
			)
			continue
		}
		seen.add(node.id)
		nodesById.set(node.id, node)
	}

	if (!nodesById.has(graph.finalNodeId)) {
		diagnostics.push(
			errorDiagnostic({
				stage: 'graph',
				code: 'UnknownFinalNode',
				message: `Final node ${graph.finalNodeId} does not exist.`,
				path: 'finalNodeId',
				actual: graph.finalNodeId
			})
		)
	}

	for (const node of graph.nodes) {
		const template = registry.get(node.templateId)
		if (!template) {
			diagnostics.push(
				errorDiagnostic({
					stage: 'template',
					code: 'UnknownTemplate',
					message: `Unknown template ${node.templateId}.`,
					nodeId: node.id,
					templateId: node.templateId,
					path: `nodes.${node.id}.templateId`
				})
			)
			continue
		}

		const ports = templateInputs(template)
		for (const [inputName, port] of Object.entries(ports)) {
			if (
				!options.allowMissingRequiredInputs &&
				portIsRequired(port) &&
				!Object.prototype.hasOwnProperty.call(node.inputs, inputName)
			) {
				diagnostics.push(
					errorDiagnostic({
						stage: 'input',
						code: 'MissingRequiredInput',
						message: `Missing required input ${inputName}.`,
						nodeId: node.id,
						templateId: node.templateId,
						inputName,
						path: `nodes.${node.id}.inputs.${inputName}`,
						expected: port
					})
				)
			}
		}

		for (const inputName of Object.keys(node.inputs)) {
			if (!Object.prototype.hasOwnProperty.call(ports, inputName)) {
				diagnostics.push(
					errorDiagnostic({
						stage: 'input',
						code: 'UnknownInput',
						message: `Unknown input ${inputName}.`,
						nodeId: node.id,
						templateId: node.templateId,
						inputName,
						path: `nodes.${node.id}.inputs.${inputName}`
					})
				)
			}
		}

		for (const [inputName, input] of Object.entries(node.inputs)) {
			for (const dependency of inputDependencies(input)) {
				if (!nodesById.has(dependency)) {
					diagnostics.push(
						errorDiagnostic({
							stage: 'graph',
							code: 'UnknownReference',
							message: `Input ${inputName} references unknown node ${dependency}.`,
							nodeId: node.id,
							templateId: node.templateId,
							inputName,
							path: `nodes.${node.id}.inputs.${inputName}`,
							actual: dependency
						})
					)
				}
			}
		}
	}

	diagnostics.push(...detectCycles(nodesById))
	return { diagnostics, nodesById }
}

/** Detect cycles among graph node dependencies. */
function detectCycles(nodesById: Map<string, SynthesisNode>): SynthesisDiagnostic[] {
	const diagnostics: SynthesisDiagnostic[] = []
	const visiting = new Set<string>()
	const visited = new Set<string>()

	/** Depth-first traversal that records the path when a node is revisited. */
	function visit(nodeId: string, path: string[]): void {
		if (visited.has(nodeId)) return
		if (visiting.has(nodeId)) {
			diagnostics.push(
				errorDiagnostic({
					stage: 'graph',
					code: 'CycleDetected',
					message: `Cycle detected: ${[...path, nodeId].join(' -> ')}.`,
					nodeId,
					path: [...path, nodeId].join(' -> ')
				})
			)
			return
		}

		const node = nodesById.get(nodeId)
		if (!node) return
		visiting.add(nodeId)
		for (const dependency of Object.values(node.inputs).flatMap(inputDependencies)) {
			visit(dependency, [...path, nodeId])
		}
		visiting.delete(nodeId)
		visited.add(nodeId)
	}

	for (const nodeId of nodesById.keys()) {
		visit(nodeId, [])
	}

	return diagnostics
}

/** Check whether a produced fragment/artifact can satisfy a fragment port. */
function fragmentCompatible(
	port: FragmentInputPort,
	fragment: TemplateArtifact,
	node: SynthesisNode,
	inputName: string
): SynthesisDiagnostic | undefined {
	const expectedOutputKind = fragmentPortOutputKind(port)

	if (expectedOutputKind !== fragment.kind) {
		return errorDiagnostic({
			stage: 'port',
			code: 'IncompatibleFragmentKind',
			message: `Input ${inputName} expected ${expectedOutputKind} but received ${fragment.kind}.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: expectedOutputKind,
			actual: fragment.kind
		})
	}

	if (!isTypeCompatible(port.accepts.type, fragment.type)) {
		return errorDiagnostic({
			stage: 'type',
			code: 'IncompatibleFragmentType',
			message: `Input ${inputName} received an incompatible fragment type.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: port.accepts.type,
			actual: fragment.type
		})
	}

	if (port.accepts.sourceModelIds && !port.accepts.sourceModelIds.includes(fragment.source.templateId)) {
		return errorDiagnostic({
			stage: 'port',
			code: 'IncompatibleFragmentSource',
			message: `Input ${inputName} does not accept fragments from ${fragment.source.templateId}.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: port.accepts.sourceModelIds,
			actual: fragment.source.templateId
		})
	}

	return undefined
}

/** Check raw-code input text against the planner-facing raw-code policy. */
function rawCodeCompatible(
	port: RawCodeInputPort,
	code: string,
	node: SynthesisNode,
	inputName: string
): SynthesisDiagnostic | undefined {
	if (code.trim().length === 0) {
		return errorDiagnostic({
			stage: 'policy',
			code: 'RawCodeRejected',
			message: `Raw code input ${inputName} must not be empty.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName
		})
	}

	const policy = port.policy
	if (!policy) return undefined

	if (policy.maxLength !== undefined && code.length > policy.maxLength) {
		return errorDiagnostic({
			stage: 'policy',
			code: 'RawCodeRejected',
			message: `Raw code input ${inputName} exceeds the maximum length of ${policy.maxLength}.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: { maxLength: policy.maxLength },
			actual: { length: code.length },
			repairHints: [
				{ kind: 'shortenRawCode', message: 'Use a shorter raw-code expression or a structured template input.' }
			]
		})
	}

	if (policy.allowNewlines === false && /\r|\n/u.test(code)) {
		return errorDiagnostic({
			stage: 'policy',
			code: 'RawCodeRejected',
			message: `Raw code input ${inputName} must not contain newlines.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: { allowNewlines: false },
			actual: code,
			repairHints: [{ kind: 'removeNewlines', message: 'Submit the raw code as a single-line fragment.' }]
		})
	}

	for (const forbidden of policy.forbiddenSubstrings ?? []) {
		if (forbidden.length > 0 && code.includes(forbidden)) {
			return errorDiagnostic({
				stage: 'policy',
				code: 'RawCodeRejected',
				message: `Raw code input ${inputName} contains a forbidden substring.`,
				nodeId: node.id,
				templateId: node.templateId,
				inputName,
				expected: { forbiddenSubstrings: policy.forbiddenSubstrings },
				actual: forbidden,
				repairHints: [{ kind: 'removeForbiddenSubstring', message: `Remove ${forbidden} from the raw-code input.` }]
			})
		}
	}

	for (const pattern of policy.forbiddenPatterns ?? []) {
		let regexp: RegExp
		try {
			regexp = new RegExp(pattern, 'u')
		} catch (error) {
			return errorDiagnostic({
				stage: 'policy',
				code: 'InvalidRawCodePolicy',
				message: `Raw code policy contains an invalid forbidden pattern: ${pattern}.`,
				nodeId: node.id,
				templateId: node.templateId,
				inputName,
				expected: 'valid regular expression pattern',
				actual: error
			})
		}

		if (regexp.test(code)) {
			return errorDiagnostic({
				stage: 'policy',
				code: 'RawCodeRejected',
				message: `Raw code input ${inputName} matches a forbidden pattern.`,
				nodeId: node.id,
				templateId: node.templateId,
				inputName,
				expected: { forbiddenPatterns: policy.forbiddenPatterns },
				actual: pattern,
				repairHints: [{ kind: 'avoidForbiddenPattern', message: `Avoid code matching /${pattern}/u.` }]
			})
		}
	}

	return undefined
}

/** Validate a literal value against the literal port's schema, when present. */
function literalCompatible(
	port: InputPort,
	value: unknown,
	node: SynthesisNode,
	inputName: string
): SynthesisDiagnostic | undefined {
	if (port.kind !== 'literal') return undefined
	const result = validateJsonSchemaSubset(value, port.schema)
	if (result.ok) return undefined

	return errorDiagnostic({
		stage: 'input',
		code: 'InvalidLiteralInput',
		message: result.message,
		nodeId: node.id,
		templateId: node.templateId,
		inputName,
		path: result.path,
		expected: result.expected,
		actual: result.actual
	})
}

/** Validate the final artifact or fragment against graph-level goal metadata. */
function validateFinalGoal(graph: SynthesisGraph, finalFragment: TemplateArtifact): SynthesisDiagnostic[] {
	const goal = graph.goal
	if (!goal) return []
	const diagnostics: SynthesisDiagnostic[] = []

	if (goal.outputKind && goal.outputKind !== finalFragment.kind) {
		diagnostics.push(
			errorDiagnostic({
				stage: 'graph',
				code: 'FinalGoalKindMismatch',
				message: `Final fragment kind ${finalFragment.kind} does not satisfy goal ${goal.outputKind}.`,
				path: 'goal.outputKind',
				expected: goal.outputKind,
				actual: finalFragment.kind
			})
		)
	}

	if (!isTypeCompatible(goal.type, finalFragment.type)) {
		diagnostics.push(
			errorDiagnostic({
				stage: 'type',
				code: 'FinalGoalTypeMismatch',
				message: 'Final fragment type does not satisfy graph goal.',
				path: 'goal.type',
				expected: goal.type,
				actual: finalFragment.type
			})
		)
	}

	if (
		!isTypeCompatible(
			goal.schema ? { schema: goal.schema } : undefined,
			finalFragment.schema ? { schema: finalFragment.schema } : undefined
		)
	) {
		diagnostics.push(
			errorDiagnostic({
				stage: 'type',
				code: 'FinalGoalSchemaMismatch',
				message: 'Final fragment schema does not satisfy graph goal.',
				path: 'goal.schema',
				expected: goal.schema,
				actual: finalFragment.schema
			})
		)
	}

	return diagnostics
}

let partialScopeCounter = 0

/** Allocate a process-local scope for independently compiled partial artifacts. */
function nextPartialScope(): string {
	partialScopeCounter += 1
	return `partial${partialScopeCounter}`
}

/** Convert arbitrary graph IDs into marker-ID-safe scope segments. */
function sanitizeScopePart(value: string): string {
	const sanitized = value.replace(/[^A-Za-z0-9_]/gu, '_')
	return /^[A-Za-z_]/u.test(sanitized) ? sanitized : `_${sanitized}`
}

/** Create a stable scoped marker ID for a missing graph input. */
function scopedInputId(scope: string, nodeId: string, inputName: string): string {
	return `${sanitizeScopePart(scope)}__${sanitizeScopePart(nodeId)}__${sanitizeScopePart(inputName)}`
}

/** Pick the partial-template parser wrapper needed for an artifact kind. */
function templateModeForArtifact(artifact: TemplateArtifact): TemplateMode {
	switch (artifact.kind) {
		case 'expressionSuffix':
			return { kind: 'expressionSuffix' }
		case 'statement':
			return { kind: 'statementList' }
		case 'objectProperty':
			return { kind: 'objectPropertyList' }
		default:
			return { kind: 'expression' }
	}
}

/** Apply already validated replacement edits to artifact code. */
function applyReplacementEdits(sourceText: string, edits: PlannedReplacementEdit[]): string {
	let output = sourceText
	const sorted = [...edits].sort((a, b) => b.start - a.start)

	for (const edit of sorted) {
		output = `${output.slice(0, edit.start)}${edit.text}${output.slice(edit.end)}`
	}

	return output
}

/** Return a complete artifact shape for complete fragments/artifacts. */
function completeArtifact(artifact: TemplateArtifact): TemplateArtifact {
	return artifact.complete === false ? artifact : { ...artifact, complete: true }
}

/** Resolve one caller-provided fill value against an unresolved input port. */
function resolveArtifactInput(
	fill: TemplateArtifactInput,
	port: InputPort,
	node: SynthesisNode,
	inputName: string
): { resolved?: ResolvedGraphInput; diagnostic?: SynthesisDiagnostic } {
	let lastDiagnostic: SynthesisDiagnostic | undefined

	for (const option of inputPortOptions(port)) {
		if (option.kind === 'literal' && fill.kind === 'literal') {
			lastDiagnostic = literalCompatible(option, fill.value, node, inputName)
			if (!lastDiagnostic) return { resolved: { kind: 'literal', value: fill.value, port: option } }
		}

		if (option.kind === 'rawCode' && fill.kind === 'rawCode') {
			lastDiagnostic = rawCodeCompatible(option, fill.code, node, inputName)
			if (!lastDiagnostic) return { resolved: { kind: 'rawCode', code: fill.code, port: option } }
		}

		if (option.kind === 'fragment' && fill.kind === 'fragment') {
			lastDiagnostic = fragmentCompatible(option, fill.fragment, node, inputName)
			if (!lastDiagnostic) return { resolved: { kind: 'fragment', fragment: fill.fragment, port: option } }
		}
	}

	return {
		diagnostic:
			lastDiagnostic ??
			errorDiagnostic({
				stage: 'port',
				code: 'IncompatibleInputKind',
				message: `Input ${inputName} is not compatible with its port.`,
				nodeId: node.id,
				templateId: node.templateId,
				inputName,
				expected: port,
				actual: fill
			})
	}
}

/** Look up a fill by scoped marker ID, or by unique original input name. */
function findArtifactFill(
	inputs: TemplateArtifactInputMap,
	inputNameCounts: Map<string, number>,
	id: string,
	inputName: string
): TemplateArtifactInput | undefined {
	if (Object.prototype.hasOwnProperty.call(inputs, id)) return inputs[id]
	if (inputNameCounts.get(inputName) === 1 && Object.prototype.hasOwnProperty.call(inputs, inputName)) {
		return inputs[inputName]
	}
	return undefined
}

/**
 * Fill any matching unresolved inputs in a template artifact.
 *
 * Inputs may be keyed by the scoped marker ID exposed in `unresolvedInputs`, or
 * by the original input name when that name appears only once in the artifact.
 */
export function fillTemplateArtifact(
	artifact: TemplateArtifact,
	inputs: TemplateArtifactInputMap,
	options: GenerateOptions = {}
): TemplateArtifactResult {
	if (artifact.complete !== false) {
		return { ok: true, artifact: completeArtifact(artifact), diagnostics: [] }
	}

	const diagnostics: SynthesisDiagnostic[] = []
	const inputNameCounts = new Map<string, number>()
	for (const unresolvedInput of artifact.unresolvedInputs) {
		inputNameCounts.set(unresolvedInput.inputName, (inputNameCounts.get(unresolvedInput.inputName) ?? 0) + 1)
	}

	const resolvedInputs: Record<string, ResolvedGraphInput> = {}
	const remaining: UnresolvedTemplateInput[] = []

	for (const unresolvedInput of artifact.unresolvedInputs) {
		const fill = findArtifactFill(inputs, inputNameCounts, unresolvedInput.id, unresolvedInput.inputName)
		if (!fill) {
			remaining.push(unresolvedInput)
			continue
		}

		const node: SynthesisNode = {
			id: unresolvedInput.nodeId ?? artifact.id ?? '__artifact__',
			templateId: unresolvedInput.templateId,
			inputs: {}
		}
		const { resolved, diagnostic } = resolveArtifactInput(fill, unresolvedInput.port, node, unresolvedInput.inputName)
		if (diagnostic) {
			diagnostics.push(diagnostic)
			continue
		}
		if (resolved) {
			resolvedInputs[unresolvedInput.id] = resolved
		}
	}

	if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
		return { ok: false, diagnostics, artifact }
	}

	try {
		const generationOptions = { ...options, templateMode: options.templateMode ?? templateModeForArtifact(artifact) }
		const replacements = graphInputsToReplacementMap(resolvedInputs)
		const regions = discoverReplacementRegions(artifact.code, generationOptions)
		const resolvedRegions = regions.filter(region => Object.prototype.hasOwnProperty.call(replacements, region.id))
		const edits = buildReplacementEdits(
			resolvedRegions,
			replacements,
			{ ...generationOptions, allowUnusedReplacements: true },
			artifact.code
		)
		const code = applyReplacementEdits(artifact.code, edits)
		discoverReplacementRegions(code, { ...generationOptions, filePath: '__filled_template_artifact__.ts' })

		const base = {
			...(artifact.id ? { id: artifact.id } : {}),
			code,
			kind: artifact.kind,
			source: artifact.source,
			...(artifact.type ? { type: artifact.type } : {}),
			...(artifact.schema === undefined ? {} : { schema: artifact.schema }),
			...(artifact.provenance ? { provenance: artifact.provenance } : {})
		}

		if (remaining.length === 0) {
			return { ok: true, artifact: { ...base, complete: true }, diagnostics }
		}

		return {
			ok: true,
			artifact: {
				...base,
				complete: false,
				unresolvedInputs: remaining
			},
			diagnostics
		}
	} catch (error) {
		diagnostics.push(
			errorDiagnostic({
				stage: 'ast',
				code: 'GeneratedTypeScriptInvalid',
				message: error instanceof Error ? error.message : String(error),
				actual: error
			})
		)
		return { ok: false, diagnostics, artifact }
	}
}

/**
 * Fill a template artifact and require that no unresolved inputs remain.
 *
 * This is the terminal artifact API: it returns a structured diagnostic instead
 * of throwing when required inputs are still open.
 */
export function finalizeTemplateArtifact(
	artifact: TemplateArtifact,
	inputs: TemplateArtifactInputMap = {},
	options?: GenerateOptions
): TemplateArtifactResult {
	const filled = Object.keys(inputs).length > 0 ? fillTemplateArtifact(artifact, inputs, options) : { ok: true as const, artifact, diagnostics: [] }
	if (!filled.ok) return filled

	if (filled.artifact.complete === false) {
		return {
			ok: false,
			artifact: filled.artifact,
			diagnostics: [
				...filled.diagnostics,
				errorDiagnostic({
					stage: 'input',
					code: 'UnresolvedTemplateInputs',
					message: 'Template artifact still has unresolved required inputs.',
					actual: filled.artifact.unresolvedInputs.map(input => input.id)
				})
			]
		}
	}

	return { ok: true, artifact: completeArtifact(filled.artifact), diagnostics: filled.diagnostics }
}

/** Partially compile a defined graph against an authored template catalog. */
export function compilePartialGraph(
	graph: DefinedSynthesisGraph<any>,
	templates: readonly GraphTemplateDefinition<any, string>[],
	options?: GraphCompileOptions
): GraphPartialCompilationResult

/** Partially compile a graph against a runtime template registry. */
export function compilePartialGraph(
	graph: SynthesisGraph,
	registry: TemplateRegistry,
	options?: GraphCompileOptions
): GraphPartialCompilationResult

/** Partially compile an inline typed graph against an authored template catalog. */
export function compilePartialGraph<
	const TTemplates extends readonly GraphTemplateDefinition<any, string>[],
	const TGraph extends AuthoredGraphInput
>(
	graph: StrictSynthesisGraph<TTemplates, TGraph>,
	templates: TTemplates,
	options?: GraphCompileOptions
): GraphPartialCompilationResult

/** Implementation for partial graph compilation. */
export function compilePartialGraph(
	graph: SynthesisGraph,
	registryOrTemplates: TemplateRegistry | readonly GraphTemplateDefinition<any, string>[],
	options: GraphCompileOptions = {}
): GraphPartialCompilationResult {
	const registry = templateRegistryFromInput(registryOrTemplates)
	const normalized = normalizeSynthesisGraph(graph).graph
	const { diagnostics, nodesById } = validateStaticGraph(normalized, registry, { allowMissingRequiredInputs: true })
	if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
		return { ok: false, diagnostics }
	}

	const scope = nextPartialScope()
	const artifacts = new Map<string, TemplateArtifact>()
	const executing = new Set<string>()

	/** Execute one node into a complete or partial artifact. */
	function executeNode(nodeId: string): TemplateArtifact | undefined {
		const existing = artifacts.get(nodeId)
		if (existing) return existing

		const node = nodesById.get(nodeId)
		if (!node) return undefined
		const template = registry.get(node.templateId)
		if (!template) return undefined
		if (executing.has(nodeId)) return undefined
		executing.add(nodeId)

		const resolvedInputs: Record<string, ResolvedGraphInput> = {}
		const unresolvedInputs: Record<string, UnresolvedTemplateInput> = {}

		for (const [inputName, port] of Object.entries(template.inputs) as Array<[string, InputPort]>) {
			if (portIsRequired(port) && !Object.prototype.hasOwnProperty.call(node.inputs, inputName)) {
				unresolvedInputs[inputName] = {
					id: scopedInputId(scope, node.id, inputName),
					inputName,
					nodeId: node.id,
					templateId: node.templateId,
					port,
					path: `nodes.${node.id}.inputs.${inputName}`
				}
			}
		}

		for (const [inputName, rawInput] of Object.entries(node.inputs)) {
			const port = template.inputs[inputName]
			if (!port) continue
			const input = normalizeSynthesisInput(rawInput)

			let resolved: ResolvedGraphInput | undefined
			let lastDiagnostic: SynthesisDiagnostic | undefined

			for (const option of inputPortOptions(port)) {
				if (option.kind === 'literal' && input.kind === 'literal') {
					lastDiagnostic = literalCompatible(option, input.value, node, inputName)
					if (!lastDiagnostic) {
						resolved = { kind: 'literal', value: input.value, port: option }
						break
					}
				}

				if (option.kind === 'rawCode' && input.kind === 'rawCode') {
					lastDiagnostic = rawCodeCompatible(option, input.code, node, inputName)
					if (!lastDiagnostic) {
						resolved = { kind: 'rawCode', code: input.code, port: option }
						break
					}
				}

				if (option.kind === 'fragment' && input.kind === 'ref') {
					const artifact = executeNode(input.nodeId)

					if (!artifact) continue
					lastDiagnostic = fragmentCompatible(option, artifact, node, inputName)
					if (!lastDiagnostic) {
						resolved = { kind: 'fragment', fragment: artifact, port: option }
						break
					}
				}
			}

			if (!resolved) {
				diagnostics.push(
					lastDiagnostic ??
						errorDiagnostic({
							stage: 'port',
							code: 'IncompatibleInputKind',
							message: `Input ${inputName} is not compatible with its port.`,
							nodeId: node.id,
							templateId: node.templateId,
							inputName,
							expected: port,
							actual: input
						})
				)
				continue
			}

			resolvedInputs[inputName] = resolved
		}

		if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
			executing.delete(nodeId)
			return undefined
		}

		try {
			const artifact = template.invokePartial({ nodeId: node.id, inputs: resolvedInputs, unresolvedInputs, options })
			artifacts.set(node.id, artifact)
			executing.delete(nodeId)
			return artifact
		} catch (error) {
			diagnostics.push(
				errorDiagnostic({
					stage: 'ast',
					code: 'GeneratedTypeScriptInvalid',
					message: error instanceof Error ? error.message : String(error),
					nodeId: node.id,
					templateId: node.templateId,
					actual: error
				})
			)
			executing.delete(nodeId)
			return undefined
		}
	}

	const finalArtifact = executeNode(normalized.finalNodeId)
	if (finalArtifact) {
		diagnostics.push(...validateFinalGoal(normalized, finalArtifact))
	}

	if (!finalArtifact || diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
		return { ok: false, diagnostics, partialArtifacts: artifacts }
	}

	return {
		ok: true,
		finalArtifact,
		artifacts,
		diagnostics
	}
}

/** Strictly compile a defined graph against an authored template catalog. */
export function compileGraph(
	graph: DefinedSynthesisGraph<any>,
	templates: readonly GraphTemplateDefinition<any, string>[],
	options?: GraphCompileOptions
): GraphCompilationResult

/** Strictly compile a graph against a runtime template registry. */
export function compileGraph(
	graph: SynthesisGraph,
	registry: TemplateRegistry,
	options?: GraphCompileOptions
): GraphCompilationResult

/** Strictly compile an inline typed graph against an authored template catalog. */
export function compileGraph<
	const TTemplates extends readonly GraphTemplateDefinition<any, string>[],
	const TGraph extends AuthoredGraphInput
>(
	graph: StrictSynthesisGraph<TTemplates, TGraph>,
	templates: TTemplates,
	options?: GraphCompileOptions
): GraphCompilationResult

/** Implementation for strict graph compilation. */
export function compileGraph(
	graph: SynthesisGraph,
	registryOrTemplates: TemplateRegistry | readonly GraphTemplateDefinition<any, string>[],
	options: GraphCompileOptions = {}
): GraphCompilationResult {
	const registry = templateRegistryFromInput(registryOrTemplates)
	const normalized = normalizeSynthesisGraph(graph).graph
	const { diagnostics, nodesById } = validateStaticGraph(normalized, registry)
	if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
		return { ok: false, diagnostics }
	}

	const fragments = new Map<string, GeneratedFragment>()
	const executing = new Set<string>()

	/** Execute one node into a complete generated fragment. */
	function executeNode(nodeId: string): GeneratedFragment | undefined {
		const existing = fragments.get(nodeId)
		if (existing) return existing

		const node = nodesById.get(nodeId)
		if (!node) return undefined
		const template = registry.get(node.templateId)
		if (!template) return undefined
		if (executing.has(nodeId)) return undefined
		executing.add(nodeId)

		const resolvedInputs: Record<string, ResolvedGraphInput> = {}

		for (const [inputName, rawInput] of Object.entries(node.inputs)) {
			const port = template.inputs[inputName]
			if (!port) continue
			const input = normalizeSynthesisInput(rawInput)

			let resolved: ResolvedGraphInput | undefined
			let lastDiagnostic: SynthesisDiagnostic | undefined

			for (const option of inputPortOptions(port)) {
				if (option.kind === 'literal' && input.kind === 'literal') {
					lastDiagnostic = literalCompatible(option, input.value, node, inputName)
					if (!lastDiagnostic) {
						resolved = { kind: 'literal', value: input.value, port: option }
						break
					}
				}

				if (option.kind === 'rawCode' && input.kind === 'rawCode') {
					lastDiagnostic = rawCodeCompatible(option, input.code, node, inputName)
					if (!lastDiagnostic) {
						resolved = { kind: 'rawCode', code: input.code, port: option }
						break
					}
				}

				if (option.kind === 'fragment' && input.kind === 'ref') {
					const fragment = executeNode(input.nodeId)

					if (!fragment) continue
					lastDiagnostic = fragmentCompatible(option, fragment, node, inputName)
					if (!lastDiagnostic) {
						resolved = { kind: 'fragment', fragment, port: option }
						break
					}
				}
			}

			if (!resolved) {
				diagnostics.push(
					lastDiagnostic ??
						errorDiagnostic({
							stage: 'port',
							code: 'IncompatibleInputKind',
							message: `Input ${inputName} is not compatible with its port.`,
							nodeId: node.id,
							templateId: node.templateId,
							inputName,
							expected: port,
							actual: input
						})
				)
				continue
			}

			resolvedInputs[inputName] = resolved
		}

		if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
			executing.delete(nodeId)
			return undefined
		}

		try {
			const fragment = template.invoke({ nodeId: node.id, inputs: resolvedInputs, options })
			fragments.set(node.id, fragment)
			executing.delete(nodeId)
			return fragment
		} catch (error) {
			diagnostics.push(
				errorDiagnostic({
					stage: 'ast',
					code: 'GeneratedTypeScriptInvalid',
					message: error instanceof Error ? error.message : String(error),
					nodeId: node.id,
					templateId: node.templateId,
					actual: error
				})
			)
			executing.delete(nodeId)
			return undefined
		}
	}

	const finalFragment = executeNode(normalized.finalNodeId)
	if (finalFragment) {
		diagnostics.push(...validateFinalGoal(normalized, finalFragment))
	}

	if (!finalFragment || diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
		return { ok: false, diagnostics, partialFragments: fragments }
	}

	return {
		ok: true,
		finalFragment,
		fragments,
		diagnostics
	}
}
