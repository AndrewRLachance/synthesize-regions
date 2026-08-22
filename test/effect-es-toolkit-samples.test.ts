import { describe, expect, it } from 'vitest'

import {
	compileGraph,
	createTemplateRegistry,
	type SynthesisNode
} from '../src/index.js'
import { effectGraphTemplateInputs } from '../samples/effect-ts.js'
import { effectEsToolkitGraphTemplateInputs } from '../samples/effect-es-toolkit-templates.js'

const registry = createTemplateRegistry([
	...effectGraphTemplateInputs,
	...effectEsToolkitGraphTemplateInputs
])

const raw = (code: string) => ({ kind: 'rawCode' as const, code })
const ref = (nodeId: string) => ({ kind: 'ref' as const, nodeId })

describe('Effect and es-toolkit typed adapters', () => {
	it('preserves error and requirement channels across a pure success transform', () => {
		const nodes: SynthesisNode[] = [
			{
				id: 'source', templateId: 'EffectSucceed',
				typeArguments: { A: { ts: 'readonly number[]' } },
				inputs: { value: raw('[1, 2, 3]') }
			},
			{
				id: 'chunked', templateId: 'EffectEsToolkitChunk',
				typeArguments: { E: { ts: 'never' }, R: { ts: 'never' } },
				inputs: { source: ref('source'), size: { kind: 'literal', value: 2 } }
			},
			{
				id: 'subject', templateId: 'EffectRunPromise',
				typeArguments: { A: { ts: 'unknown' }, E: { ts: 'never' } },
				inputs: { source: ref('chunked') }
			}
		]
		const result = compileGraph({ nodes, finalNodeId: 'subject' }, registry)
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (!result.ok) return
		expect(result.artifacts.chunked?.type).toMatchObject({ nominal: 'effect/Effect' })
		expect(result.artifacts.chunked?.type?.ts).toContain('__effectRequirements?: () => (never)')
		expect(result.finalArtifact.code).toBe(
			'Effect.runPromise(Effect.map(Effect.succeed([1, 2, 3]), values => esToolkit.chunk(values, 2)))'
		)
	})

	it('requires explicit channel bindings on mapped adapters', () => {
		const result = compileGraph({
			nodes: [{
				id: 'subject', templateId: 'EffectEsToolkitChunk',
				inputs: { source: raw('source'), size: { kind: 'literal', value: 2 } }
			}],
			finalNodeId: 'subject'
		}, registry)
		expect(result.ok).toBe(false)
		expect(result.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({ code: 'MissingTypeArgument', typeParameterName: 'E' }),
			expect.objectContaining({ code: 'MissingTypeArgument', typeParameterName: 'R' })
		]))
	})
})
