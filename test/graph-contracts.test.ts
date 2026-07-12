import { describe, expect, it } from 'vitest'
import {
	CompleteTemplateArtifactSchema,
	GraphCompilationResultSchema,
	InputPortSchema,
	PartialTemplateArtifactSchema,
	RawCodePolicySchema,
	SynthesisGraphSchema,
	TemplateSummarySchema,
	checkContract
} from '../src/index.js'

const fragment = {
	code: 'value',
	kind: 'expression',
	source: { templateId: 'Source' }
} as const

describe('canonical graph contracts', () => {
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
			stage: 'type', code: 'TypeScriptSemanticError', severity: 'error', message: 'Type mismatch.',
			compilerCode: 2322, compilerCategory: 'error', line: 2, column: 7
		}
		expect(checkContract(GraphCompilationResultSchema, {
			kind: 'graphCompilation', mode: 'strict', ok: false, diagnostics: [diagnostic]
		})).toBe(true)
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
