import { type GeneratedFragment } from '../src/templates/graphTypes.js'
import { fragmentPort, literalPort } from '../src/templates/compatibility.js'
import { buildGraphCompiler } from '../src/templates/graph.js'
import {
	createTemplateRegistry,
	defineTemplateCatalog,
	graphTemplateDefinitionToJsonSchema,
	templateRegistryToSynthesisGraphJsonSchema
} from '../src/templates/registry.js'
import { defineTemplate } from '../src/templates/definition.js'
import { expressionFragment, expressionSuffixFragment, statementFragment } from './samplesComplicated.js'
import { statementRaw } from './samplesMore.js'

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
	template: (r) => r('values')
})

export const IdArrow = defineTemplate({
	modelId: 'IdArrow',
	version: '1.0.0',
	inputs: {},
	output: {
		kind: 'expression'
	},
	template: () => `x => x`
})

export const NotNumberArrow = defineTemplate({
	modelId: 'NotNumberArrow',
	version: '1.0.0',
	inputs: {},
	output: {
		kind: 'expression'
	},
	template: () => `x => !Number.isFinite(x)`
})

export const TruthyArrow = defineTemplate({
	modelId: 'TruthyArrow',
	version: '1.0.0',
	inputs: {},
	output: {
		kind: 'expression'
	},
	template: () => `x => !!x`
})

export const IsTrue = defineTemplate({
	modelId: 'IsTrue',
	version: '1.0.0',
	inputs: {},
	output: {
		kind: 'expression'
	},
	template: () => `x => x === true`
})

export const AllTrueArrow = defineTemplate({
	modelId: 'AllTrueArrow',
	version: '1.0.0',
	inputs: {
		source: fragmentPort({
			regionKind: 'expression',
			accepts: {
				sourceModelIds: ['IdArrow', 'NotNumberArrow', 'TruthyArrow', 'IsTrue']
			}
		})
	},
	output: {
		kind: 'expression'
	},
	template: (r) => `x => x.every(${r('source', 'item => item')})`
})

export const TsPatternWithSuffix = defineTemplate({
	modelId: 'TsPatternWithSuffix',
	version: '1.0.0',
	description: 'Produces a .with(...) expression suffix.',
	inputs: {
		handler: fragmentPort({
			regionKind: 'expression',
			accepts: {
				sourceModelIds: ['IdArrow', 'NotNumberArrow', 'TruthyArrow', 'IsTrue', 'AllTrueArrow']
			}
		}),
		pattern: fragmentPort({
			regionKind: 'expression',
			accepts: {
				outputKind: 'expression'
			}
		})
	},
	output: {
		kind: 'expressionSuffix'
	},
	template: (region) => `.with(${region('pattern', '[]')}, ${region('handler', 'x => null')})`
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
	template: (r) => `match(${r('source')}.map(Boolean))`
})

export const ApplyExpressionSuffix = defineTemplate({
	modelId: 'ApplyExpressionSuffix',
	version: '1.0.0',
	description: 'Applies an expression suffix to an expression.',
	inputs: {
		source: expressionFragment(),
		suffix: expressionSuffixFragment()
	},
	output: {
		kind: 'expression'
	},
	template: (r) => `${r('source')}${r('suffix')}`
})

export const ConsecutiveExpressions = defineTemplate({
	modelId: 'ConsecutiveExpressions',
	inputs: {
		first: statementFragment(),
		second: statementFragment()
	},
	output: { kind: 'statement' },
	template: (r) => `${r('first')}\n${r('second')}`
})

export const allTemplate = defineTemplateCatalog([
	BooleanArrayLiteral,
	MapBooleanArray,
	TsPatternWithSuffix,
	ApplyExpressionSuffix,
	IdArrow,
	NotNumberArrow,
	TruthyArrow,
	IsTrue,
	AllTrueArrow,
	ConsecutiveExpressions
])

export const compiler = buildGraphCompiler(allTemplate)

const registry = createTemplateRegistry(allTemplate)

const schema = templateRegistryToSynthesisGraphJsonSchema(registry)

export const graph = compiler.defineGraph({
	nodes: [
		{
			id: 'source',
			templateId: BooleanArrayLiteral.modelId,
			inputs: {
				values: { kind: 'literal', value: [true, false, true] }
			}
		},
		{
			id: 'IsTrue',
			templateId: IsTrue.modelId,
			// @ts-ignore
			inputs: {}
		},
		{
			id: 'allTrueArrow',
			templateId: AllTrueArrow.modelId,
			inputs: {
				source: { $ref: 'IsTrue' }
			}
		},
		{
			id: 'mapped',
			templateId: MapBooleanArray.modelId,
			inputs: {
				source: { $ref: 'source' }
			}
		},
		{
			id: 'stuffSuffix',
			templateId: TsPatternWithSuffix.modelId,
			inputs: {
				handler: { $ref: 'allTrueArrow' },
				pattern: { $ref: 'source' }
			}
		},
		{
			id: 'mappedWithStuff',
			templateId: ApplyExpressionSuffix.modelId,
			inputs: {
				source: { $ref: 'mapped' },
				suffix: { $ref: 'stuffSuffix' }
			}
		},
		{
			id: 'methodChain',
			templateId: ApplyExpressionSuffix.modelId,
			inputs: {
				source: { $ref: 'mappedWithStuff' },
				suffix: { $ref: 'stuffSuffix' }
			}
		}
	],
	finalNodeId: 'methodChain',
	goal: { 
		type: { 
			ts: 'Partial<ResponseCookie>' 
		} 
	}
})

export const sampleCompilation = compiler(graph)

console.log(JSON.stringify(allTemplate))
