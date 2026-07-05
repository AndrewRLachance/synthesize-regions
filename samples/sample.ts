import {
	type GeneratedFragment,
	type GraphCompilationResult,
	type SynthesisGraph
} from '../src/templates/graphTypes.js'
import { fragmentPort, literalPort, rawCodePort } from '../src/templates/compatibility.js'
import { compileGraph } from '../src/templates/graph.js'
import { createTemplateRegistry, templateRegistryToSynthesisGraphJsonSchema } from '../src/templates/registry.js'
import { defineTemplate } from '../src/templates/definition.js'

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
	template: r => `match(${r('source')}.map(x => Boolean(x)))`
})


export const TsPatternWithSuffix = defineTemplate({
  modelId: 'TsPatternWithSuffix',
  version: '1.0.0',
  description: 'Produces a .with(...) expression suffix.',
  inputs: {
    'handler': rawCodePort({
      regionKind: 'expression',
      policy: {
        maxLength: 200,
        allowNewlines: false
      }
    })
  },
  output: {
    kind: 'expressionSuffix'
  },
  template: region =>
    `.with([true, false, true], ${region('handler', 'x => x')})`
})

export const ApplyExpressionSuffix = defineTemplate({
  modelId: 'ApplyExpressionSuffix',
  version: '1.0.0',
  description: 'Applies an expression suffix to an expression.',
  inputs: {
    source: fragmentPort({
      regionKind: 'expression',
      accepts: {
        outputKind: 'expression'
      }
    }),
    suffix: fragmentPort({
      regionKind: 'expressionSuffix',
      accepts: {
        outputKind: 'expressionSuffix'
      }
    })
  },
  output: {
    kind: 'expression'
  },
  template: r => `${r('source')}${r('suffix')}`
})

export const sampleRegistry = createTemplateRegistry([
  BooleanArrayLiteral,
  MapBooleanArray,
  TsPatternWithSuffix,
  ApplyExpressionSuffix
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
    },
    {
      id: 'stuffSuffix',
      templateId: TsPatternWithSuffix.modelId,
      inputs: {
        ['handler']: { kind: 'rawCode', code: 'x => x' }
      }
    },
    {
      id: 'mappedWithStuff',
      templateId: ApplyExpressionSuffix.modelId,
      inputs: {
        source: { kind: 'ref', nodeId: 'mapped' },
        suffix: { kind: 'ref', nodeId: 'stuffSuffix' }
      }
    }
  ],
  finalNodeId: 'mappedWithStuff',
  goal: {
    outputKind: 'expression'
  }
}

export const sampleCompilation: GraphCompilationResult = compileGraph(sampleGraph, sampleRegistry)

export const sampleFinalFragment: GeneratedFragment | undefined =
	sampleCompilation.ok ? 
		sampleCompilation.finalFragment : 
		undefined

console.log(JSON.stringify(templateRegistryToSynthesisGraphJsonSchema(sampleRegistry)))
