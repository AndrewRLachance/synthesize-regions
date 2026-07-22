import { describe, expect, it } from 'vitest'
import {
	BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES,
	CompleteTemplateArtifactSchema,
	GeneratedSourceMapSchema,
	GeneratedSourceSpanSchema,
	GraphCompilationResultSchema,
	GraphPatchActionSchema,
	GraphPatchResultSchema,
	GraphRunnerActionSchema,
	GraphRunnerStateSchema,
	InputPortSchema,
	PartialTemplateArtifactSchema,
	RawCodePolicySchema,
	REGION_KIND_VALUES,
	REGION_SYNTAX_ENGINE_VERSION,
	RegionKindSchema,
	SynthesisGraphSchema,
	SynthesisDiagnosticSchema,
	TemplateSummarySchema,
	checkContract,
	isGraphPatchAction,
	isGraphPatchResult,
	isGraphRunnerAction,
	isGraphRunnerState,
	isGeneratedSourceMap,
	isGeneratedSourceSpan,
	type BuiltInSynthesisDiagnosticCode,
	type GeneratedSourceMap,
	type GeneratedSourceSpan,
	type SynthesisDiagnostic
} from '../src/index.js'

const fragment = {
	code: 'value',
	kind: 'expression',
	source: { templateId: 'Source' }
} as const

describe('canonical graph contracts', () => {
	it('publishes every exact region syntax context', () => {
		expect(REGION_SYNTAX_ENGINE_VERSION).toBe(2)
		for (const kind of REGION_KIND_VALUES) expect(checkContract(RegionKindSchema, kind)).toBe(true)
		expect(checkContract(RegionKindSchema, 'methodBody')).toBe(false)
	})

	it('requires an explicit artifact completion discriminator', () => {
		expect(checkContract(CompleteTemplateArtifactSchema, fragment)).toBe(false)
		expect(checkContract(CompleteTemplateArtifactSchema, { ...fragment, complete: true })).toBe(true)
		expect(checkContract(PartialTemplateArtifactSchema, { ...fragment, complete: true })).toBe(false)
		expect(checkContract(PartialTemplateArtifactSchema, {
			...fragment, complete: false, unresolvedInputs: []
		})).toBe(false)
		expect(checkContract(PartialTemplateArtifactSchema, {
			...fragment,
			complete: false,
			unresolvedInputs: [{
				id: 'value',
				inputName: 'value',
				templateId: 'Source',
				port: { kind: 'rawCode', regionKind: 'expression' }
			}]
		})).toBe(true)
	})

	it('validates closed, versioned generated source maps', () => {
		const nodeSpan: GeneratedSourceSpan = {
			kind: 'node', start: 0, end: 5, nestingDepth: 0,
			nodeId: 'source', templateId: 'Source'
		}
		const inputSpan: GeneratedSourceSpan = {
			kind: 'input', start: 1, end: 4, nestingDepth: 1,
			nodeId: 'source', templateId: 'Source', inputName: 'value'
		}
		const sourceMap: GeneratedSourceMap = { version: 1, spans: [nodeSpan, inputSpan] }

		expect(checkContract(GeneratedSourceSpanSchema, nodeSpan)).toBe(true)
		expect(checkContract(GeneratedSourceSpanSchema, inputSpan)).toBe(true)
		expect(checkContract(GeneratedSourceMapSchema, sourceMap)).toBe(true)
		expect(isGeneratedSourceSpan(inputSpan)).toBe(true)
		expect(isGeneratedSourceMap(sourceMap)).toBe(true)
		expect(checkContract(CompleteTemplateArtifactSchema, {
			...fragment, complete: true, sourceMap
		})).toBe(true)

		for (const invalid of [
			{ version: 2, spans: [] },
			{ version: 1, spans: [{ ...nodeSpan, start: -1 }] },
			{ version: 1, spans: [{ ...nodeSpan, nestingDepth: 0.5 }] },
			{ version: 1, spans: [{ ...inputSpan, inputName: undefined }] },
			{ version: 1, spans: [{ ...nodeSpan, unexpected: true }] },
			{ version: 1, spans: [], unexpected: true }
		]) {
			expect(checkContract(GeneratedSourceMapSchema, invalid)).toBe(false)
			expect(isGeneratedSourceMap(invalid)).toBe(false)
		}
	})

	it('validates recursive authored graphs', () => {
		expect(checkContract(SynthesisGraphSchema, {
			nodes: [{
				id: 'outer', templateId: 'Outer', inputs: {
					value: { kind: 'inline', node: { id: 'inner', templateId: 'Inner', inputs: {} } }
				}
			}],
			finalNodeId: 'outer'
		})).toBe(true)
		expect(checkContract(SynthesisGraphSchema, {
			nodes: [{
				id: 'list', templateId: 'StatementList', inputs: {
					statements: { kind: 'fragmentCollection', items: [{ $ref: 'one' }, { kind: 'ref', nodeId: 'two' }] }
				}
			}],
			finalNodeId: 'list'
		})).toBe(true)
	})

	it('validates normalized strict compilation records', () => {
		const artifact = { ...fragment, complete: true }
		expect(checkContract(GraphCompilationResultSchema, {
			kind: 'graphCompilation', mode: 'strict', ok: true,
			finalArtifact: artifact, artifacts: { source: artifact }, diagnostics: []
		})).toBe(true)
	})

	it('accepts structured TypeScript compiler details on graph diagnostics', () => {
		const diagnostic = {
			origin: 'candidate',
			stage: 'type', code: 'TypeScriptSemanticError', severity: 'error', message: 'Type mismatch.',
			compilerCode: 2322, compilerCategory: 'error', line: 2, column: 7
		}
		expect(checkContract(GraphCompilationResultSchema, {
			kind: 'graphCompilation', mode: 'strict', ok: false,
			classification: 'graphRepairable', diagnostics: [diagnostic]
		})).toBe(true)
	})

	it('exports unique built-in diagnostic codes without closing custom diagnostics', () => {
		const builtIn: BuiltInSynthesisDiagnosticCode = 'GraphPatchTargetNotFound'
		const custom: SynthesisDiagnostic = {
			origin: 'internal',
			stage: 'graph',
			code: 'ProducerDefinedDiagnostic',
			severity: 'warning',
			message: 'A producer-specific diagnostic remains valid.'
		}

		expect(BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES).toContain(builtIn)
		expect(BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES).toContain('InvalidGeneratedSourceMap')
		expect(BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES).toContain('InvalidSemanticTarget')
		expect(new Set(BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES).size)
			.toBe(BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES.length)
		expect(checkContract(SynthesisDiagnosticSchema, custom)).toBe(true)
	})

	it('validates every graph patch and runner action variant', () => {
		const node = { id: 'source', templateId: 'Source', inputs: {} }
		const graph = { nodes: [node], finalNodeId: 'source' }
		const patchActions = [
			{ kind: 'addNode', node },
			{ kind: 'removeNode', nodeId: 'source' },
			{ kind: 'setInput', nodeId: 'source', inputName: 'value', input: { kind: 'literal', value: 1 } },
			{ kind: 'removeInput', nodeId: 'source', inputName: 'value' },
			{ kind: 'setFinalNode', nodeId: 'source' },
			{ kind: 'setGoal', goal: { outputKind: 'expression' } },
			{ kind: 'removeGoal' }
		] as const

		for (const action of patchActions) {
			expect(checkContract(GraphPatchActionSchema, action)).toBe(true)
			expect(checkContract(GraphRunnerActionSchema, action)).toBe(true)
			expect(isGraphPatchAction(action)).toBe(true)
			expect(isGraphRunnerAction(action)).toBe(true)
		}
		expect(checkContract(GraphRunnerActionSchema, { kind: 'replaceGraph', graph })).toBe(true)
		expect(checkContract(GraphRunnerActionSchema, {
			kind: 'fill', inputs: { value: { kind: 'rawCode', code: '1 + 1' } }
		})).toBe(true)

		for (const invalid of [
			{ kind: 'unknown' },
			{ kind: 'setInput', nodeId: 'source', inputName: 'value' },
			{ kind: 'removeGoal', unexpected: true }
		]) {
			expect(checkContract(GraphRunnerActionSchema, invalid)).toBe(false)
			expect(isGraphRunnerAction(invalid)).toBe(false)
		}
	})

	it('validates atomic patch results and classified runner states', () => {
		const graph = { nodes: [], finalNodeId: 'root' }
		const diagnostic = {
			origin: 'candidate',
			stage: 'graph', code: 'GraphPatchTargetNotFound', severity: 'error', message: 'Missing node.'
		}
		const partialArtifact = {
			...fragment,
			complete: false,
			unresolvedInputs: [{
				id: 'value', inputName: 'value', templateId: 'Source',
				port: { kind: 'rawCode', regionKind: 'expression' }
			}]
		}
		const completeArtifact = { ...fragment, complete: true }
		const graphFailure = {
			kind: 'graphCompilation', mode: 'partial', ok: false,
			classification: 'graphRepairable', diagnostics: [diagnostic]
		}

		const successfulPatch = {
			kind: 'graphPatch', ok: true, graph, diagnostics: []
		} as const
		const failedPatch = {
			kind: 'graphPatch', ok: false, graph,
			classification: 'graphRepairable', diagnostics: [diagnostic]
		} as const
		expect(checkContract(GraphPatchResultSchema, successfulPatch)).toBe(true)
		expect(checkContract(GraphPatchResultSchema, failedPatch)).toBe(true)
		expect(isGraphPatchResult(successfulPatch)).toBe(true)
		expect(isGraphPatchResult(failedPatch)).toBe(true)

		const states = [
			{ kind: 'ready', graph },
			{
				kind: 'needsGraphRepair', graph, result: graphFailure,
				diagnostics: [diagnostic], classification: 'graphRepairable'
			},
			{
				kind: 'needsArtifactInputs', graph, artifact: partialArtifact,
				diagnostics: [], classification: 'artifactFillable'
			},
			{ kind: 'complete', graph, artifact: completeArtifact, diagnostics: [] },
			{ kind: 'failed', graph, diagnostics: [diagnostic], classification: 'terminalFailure' },
			{ kind: 'failed', graph, diagnostics: [diagnostic], classification: 'templatePolicyFailure' }
		]
		for (const state of states) {
			expect(checkContract(GraphRunnerStateSchema, state)).toBe(true)
			expect(isGraphRunnerState(state)).toBe(true)
		}

		expect(checkContract(GraphRunnerStateSchema, {
			kind: 'needsGraphRepair', graph, result: graphFailure,
			diagnostics: [diagnostic], classification: 'artifactFillable'
		})).toBe(false)
		expect(checkContract(GraphRunnerStateSchema, {
			kind: 'needsGraphRepair', graph,
			result: { ...graphFailure, classification: 'terminalFailure' },
			diagnostics: [diagnostic], classification: 'graphRepairable'
		})).toBe(false)
		expect(checkContract(GraphRunnerStateSchema, {
			kind: 'failed', graph, diagnostics: [diagnostic], classification: 'graphRepairable'
		})).toBe(false)
	})

	it('requires nonnegative integer raw-code and collection bounds', () => {
		for (const maxLength of [0, 80]) {
			expect(checkContract(RawCodePolicySchema, { maxLength })).toBe(true)
		}
		for (const maxLength of [-1, 1.5]) {
			expect(checkContract(RawCodePolicySchema, { maxLength })).toBe(false)
		}

		const summary = (minItems: number, maxItems?: number) => ({
			modelId: 'StatementList',
			inputs: {
				statements: {
					kind: 'fragmentCollection',
					regionKind: 'statement',
					required: true,
					accepts: { outputKind: 'statement' },
					separator: '\n',
					minItems,
					...(maxItems === undefined ? {} : { maxItems })
				}
			},
			output: { kind: 'statement' }
		})

		expect(checkContract(TemplateSummarySchema, summary(0, 2))).toBe(true)
		for (const invalidSummary of [summary(-1), summary(1.5), summary(0, -1), summary(0, 1.5)]) {
			expect(checkContract(TemplateSummarySchema, invalidSummary)).toBe(false)
		}

		const compilationPort = (minItems?: number, maxItems?: number) => ({
			kind: 'fragmentCollection',
			regionKind: 'statement',
			accepts: { outputKind: 'statement' },
			...(minItems === undefined ? {} : { minItems }),
			...(maxItems === undefined ? {} : { maxItems })
		})

		expect(checkContract(InputPortSchema, compilationPort(0, 2))).toBe(true)
		for (const invalidPort of [compilationPort(-1), compilationPort(1.5), compilationPort(0, -1), compilationPort(0, 1.5)]) {
			expect(checkContract(InputPortSchema, invalidPort)).toBe(false)
		}
	})

	it('rejects empty unions recursively in summaries and compilation ports', () => {
		const summary = (options: unknown[]) => ({
			modelId: 'Choice',
			inputs: {
				choice: { kind: 'union', required: true, options }
			},
			output: { kind: 'expression' }
		})

		expect(checkContract(TemplateSummarySchema, summary([
			{ kind: 'rawCode', regionKind: 'expression', required: true }
		]))).toBe(true)
		expect(checkContract(TemplateSummarySchema, summary([]))).toBe(false)
		expect(checkContract(TemplateSummarySchema, summary([
			{ kind: 'union', required: true, options: [] }
		]))).toBe(false)

		expect(checkContract(InputPortSchema, {
			kind: 'union',
			options: [{ kind: 'literal', regionKind: 'expression' }]
		})).toBe(true)
		expect(checkContract(InputPortSchema, { kind: 'union', options: [] })).toBe(false)
		expect(checkContract(InputPortSchema, {
			kind: 'union',
			options: [{ kind: 'union', options: [] }]
		})).toBe(false)
	})
})
