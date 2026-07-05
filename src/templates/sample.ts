import {
	type GeneratedFragment,
	type GraphCompilationResult,
	type SynthesisGraph
} from './graphTypes.js'
import { fragmentPort, literalPort } from './compatibility.js'
import { compileGraph } from './graph.js'
import { createTemplateRegistry } from './registry.js'
import { defineTemplate } from './definition.js'

export const BooleanArrayLiteral = defineTemplate({
	modelId: 'BooleanArrayLiteral',
	version: '1.0.0',
	description: 'Produces a boolean array expression from a literal input.',
	inputs: {
		values: literalPort({
			regionKind: 'expression',
			schema: {
				type: 'array',
				items: { type: 'boolean' }
			}
		})
	},
	output: {
		kind: 'expression',
		type: { ts: 'boolean[]' },
		schema: {
			type: 'array',
			items: { type: 'boolean' }
		}
	},
	template: r => r('values')
})

export const MapBooleanArray = defineTemplate({
	modelId: 'MapBooleanArray',
	version: '1.0.0',
	description: 'Maps an expression fragment to a boolean array expression.',
	inputs: {
		source: fragmentPort({
			regionKind: 'expression',
			accepts: {
				outputKind: 'expression',
				type: { ts: 'boolean[]' }
			}
		})
	},
	output: {
		kind: 'expression',
		type: { ts: 'boolean[]' },
		schema: {
			type: 'array',
			items: { type: 'boolean' }
		}
	},
	template: r => `${r('source')}.map(x => Boolean(x))`
})

export const sampleRegistry = createTemplateRegistry([
	BooleanArrayLiteral,
	MapBooleanArray
])

export const sampleGraph: SynthesisGraph = {
	nodes: [
		{
			id: 'source',
			templateId: BooleanArrayLiteral.modelId,
			inputs: {
				values: { kind: 'literal', value: [true, false, true] }
			}
		},
		{
			id: 'mapped',
			templateId: MapBooleanArray.modelId,
			inputs: {
				source: { kind: 'ref', nodeId: 'source' }
			}
		}
	],
	finalNodeId: 'mapped',
	goal: {
		outputKind: 'expression',
		type: { ts: 'boolean[]' }
	}
}

export const sampleCompilation: GraphCompilationResult = compileGraph(sampleGraph, sampleRegistry)

export const sampleFinalFragment: GeneratedFragment | undefined =
	sampleCompilation.ok ? sampleCompilation.finalFragment : undefined
