import { describe, expect, it } from 'vitest'

import { deriveTemplateCapabilityClosure } from '../src/templates/capabilityClosure.js'
import {
	type InputPortSummary,
	type OutputPortSummary,
	type SynthesisGraph,
	type TemplateSummary,
	type TemplateTypeParameterDefinition
} from '../src/templates.js'

function summary(
	modelId: string,
	output: OutputPortSummary,
	inputs: Record<string, InputPortSummary> = {},
	typeParameters?: Record<string, TemplateTypeParameterDefinition>
): TemplateSummary {
	return {
		modelId,
		...(typeParameters === undefined ? {} : { typeParameters }),
		inputs,
		output
	}
}

function output(kind: OutputPortSummary['kind'], ts?: string): OutputPortSummary {
	return { kind, ...(ts === undefined ? {} : { type: { ts } }) }
}

function graph(templateId: string, typeArguments?: Record<string, { ts: string }>): SynthesisGraph {
	return {
		nodes: [{
			id: 'subject',
			templateId,
			...(typeArguments === undefined ? {} : { typeArguments }),
			inputs: {}
		}],
		finalNodeId: 'subject'
	}
}

describe('deriveTemplateCapabilityClosure', () => {
	it('rejects malformed, source-bearing, and duplicate summaries', () => {
		const valid = summary('valid', output('expression', 'string'))
		expect(() => deriveTemplateCapabilityClosure([
			{ ...valid, source: 'secret template source' } as TemplateSummary
		], { kind: 'goal' })).toThrow(/closed TemplateSummary/u)
		expect(() => deriveTemplateCapabilityClosure([
			summary('broken', output('expression', '('))
		], { kind: 'goal' })).toThrow(/invalid type metadata/u)
		expect(() => deriveTemplateCapabilityClosure([valid, { ...valid }], { kind: 'goal' }))
			.toThrow(/duplicate modelId "valid"/u)
	})

	it('returns deterministic deep clones in model-id order without mutating inputs', () => {
		const zed = { ...summary('zed', output('statement')), description: 'last' }
		const alpha = { ...summary('alpha', output('expression', 'string')), description: 'first' }
		const closure = deriveTemplateCapabilityClosure([zed, alpha], { kind: 'goal' })
		expect(closure.map(item => item.modelId)).toEqual(['alpha', 'zed'])
		expect(closure[0]).not.toBe(alpha)
		closure[0]!.description = 'changed clone'
		expect(alpha.description).toBe('first')
		expect(deriveTemplateCapabilityClosure([alpha, zed], { kind: 'goal' }))
			.toEqual(deriveTemplateCapabilityClosure([zed, alpha], { kind: 'goal' }))
	})

	it('keeps placeholder-bearing goal candidates conservatively but honors kind and schema', () => {
		const generic = summary(
			'generic',
			{ kind: 'expression', type: { ts: '{{T}}', schema: { type: 'string' } } },
			{},
			{ T: { constraint: { ts: 'unknown' } } }
		)
		const wrongSchemaGeneric = summary(
			'generic-number-schema',
			{ kind: 'expression', type: { ts: '{{T}}', schema: { type: 'number' } } },
			{},
			{ T: { constraint: { ts: 'unknown' } } }
		)
		const stringProducer = summary('string', output('expression', 'string'))
		const numberProducer = summary('number', output('expression', 'number'))
		const wrongKind = summary('statement', output('statement', 'string'))
		const closure = deriveTemplateCapabilityClosure(
			[wrongKind, numberProducer, generic, wrongSchemaGeneric, stringProducer],
			{ kind: 'goal', goal: { outputKind: 'expression', type: { ts: 'string', schema: { type: 'string' } } } }
		)
		expect(closure.map(item => item.modelId)).toEqual(['generic'])
	})

	it('instantiates bound consumer requirements and honors collections and source allowlists', () => {
		const consumer = summary(
			'consumer',
			output('sourceFile'),
			{
				values: {
					kind: 'fragmentCollection',
					regionKind: 'expression',
					required: true,
					accepts: {
						outputKind: 'expression',
						type: { ts: '{{T}}' },
						sourceModelIds: ['generic-producer', 'number', 'string']
					},
					separator: ', ',
					minItems: 1
				}
			},
			{ T: { constraint: { ts: 'unknown' } } }
		)
		const templates = [
			consumer,
			summary('denied-string', output('expression', 'string')),
			summary('generic-producer', output('expression', '{{U}}'), {}, { U: { constraint: { ts: 'unknown' } } }),
			summary('number', output('expression', 'number')),
			summary('string', output('expression', 'string'))
		]
		const closure = deriveTemplateCapabilityClosure(templates, {
			kind: 'graph',
			graph: graph('consumer', { T: { ts: 'string' } })
		})
		expect(closure.map(item => item.modelId)).toEqual(['consumer', 'generic-producer', 'string'])
	})

	it('retains a repair-capable producer closure for missing or invalid bindings', () => {
		const consumer = summary(
			'consumer',
			output('sourceFile'),
			{
				value: {
					kind: 'fragment', regionKind: 'expression', required: true,
					accepts: { outputKind: 'expression', type: { ts: '{{T}}' } }
				}
			},
			{ T: { constraint: { ts: 'unknown' } } }
		)
		const templates = [
			consumer,
			summary('number', output('expression', 'number')),
			summary('string', output('expression', 'string'))
		]
		expect(deriveTemplateCapabilityClosure(templates, { kind: 'graph', graph: graph('consumer') })
			.map(item => item.modelId)).toEqual(['consumer', 'number', 'string'])
		expect(deriveTemplateCapabilityClosure(templates, {
			kind: 'graph', graph: graph('consumer', { T: { ts: 'any' } })
		}).map(item => item.modelId)).toEqual(['consumer', 'number', 'string'])
	})

	it('combines repeated bindings deterministically and supports union producer alternatives', () => {
		const consumer = summary(
			'consumer',
			output('sourceFile'),
			{
				value: {
					kind: 'union', required: true,
					options: [
						{ kind: 'literal', regionKind: 'expression', required: true },
						{
							kind: 'fragment', regionKind: 'expression', required: true,
							accepts: { outputKind: 'expression', type: { ts: '{{T}}' } }
						}
					]
				}
			},
			{ T: { constraint: { ts: 'unknown' } } }
		)
		const templates = [
			consumer,
			summary('number', output('expression', 'number')),
			summary('string', output('expression', 'string'))
		]
		const node = (id: string, ts: string) => ({ id, templateId: 'consumer', typeArguments: { T: { ts } }, inputs: {} })
		const forward: SynthesisGraph = {
			nodes: [node('one', 'string'), node('two', 'number')], finalNodeId: 'one'
		}
		const reverse: SynthesisGraph = {
			nodes: [node('two', 'number'), node('one', 'string')], finalNodeId: 'one'
		}
		const forwardClosure = deriveTemplateCapabilityClosure(templates, { kind: 'graph', graph: forward })
		const reverseClosure = deriveTemplateCapabilityClosure(templates, { kind: 'graph', graph: reverse })
		expect(forwardClosure.map(item => item.modelId)).toEqual(['consumer', 'number', 'string'])
		expect(reverseClosure).toEqual(forwardClosure)
	})

	it('returns the full authorized catalog when any nested graph template is unknown', () => {
		const templates = [
			summary('known', output('sourceFile')),
			summary('producer', output('expression', 'string'))
		]
		const graphWithUnknownInline: SynthesisGraph = {
			nodes: [{
				id: 'known', templateId: 'known', inputs: {
					child: { kind: 'inline', node: { id: 'unknown', templateId: 'unknown', inputs: {} } }
				}
			}],
			finalNodeId: 'known'
		}
		expect(deriveTemplateCapabilityClosure(templates, { kind: 'graph', graph: graphWithUnknownInline })
			.map(item => item.modelId)).toEqual(['known', 'producer'])
	})
})
