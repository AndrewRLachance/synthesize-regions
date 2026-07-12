import { describe, expect, it } from 'vitest'
import {
	CompleteTemplateArtifactSchema,
	GraphCompilationResultSchema,
	PartialTemplateArtifactSchema,
	SynthesisGraphSchema,
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
})
