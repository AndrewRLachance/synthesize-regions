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
	})

	it('validates normalized strict compilation records', () => {
		const artifact = { ...fragment, complete: true }
		expect(checkContract(GraphCompilationResultSchema, {
			kind: 'graphCompilation', mode: 'strict', ok: true,
			finalArtifact: artifact, artifacts: { source: artifact }, diagnostics: []
		})).toBe(true)
	})
})
