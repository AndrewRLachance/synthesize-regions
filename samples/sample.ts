import { SynthesisNode, TemplateArtifactInputMap, type SynthesisGraph } from '../src/templates/graphTypes.js'
import { fragmentPort, literalPort } from '../src/templates/compatibility.js'
import { buildGraphCompiler } from '../src/templates/graph.js'
import { defineTemplateCatalog } from '../src/templates/registry.js'
import { defineTemplate } from '../src/templates/definition.js'
import { createGraphRunner } from '../src/templates/runner.js'
import { expressionFragment, expressionSuffixFragment, statementFragment } from './samplesComplicated.js'

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
	template: (r) => `${r('source')}.map(Boolean)`
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

function main() {
	const allTemplate = defineTemplateCatalog([
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

	const nodes: SynthesisNode[] = [
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
	]

	const data = {
		nodes,
		finalNodeId: 'methodChain',
		goal: {
			outputKind: 'expression'
		}
	} satisfies SynthesisGraph

	const possibleNewNodes: SynthesisNode[] = [
		{
			id: 'source',
			templateId: BooleanArrayLiteral.modelId,
			inputs: {}
		},
		{
			id: 'IsTrue',
			templateId: IsTrue.modelId,
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
		}
	]

	const possibleInputs: TemplateArtifactInputMap[] = [
		{
			values: {
				kind: 'literal',
				value: [true, false, true]
			}
		}
	]

	const compiler = buildGraphCompiler(allTemplate)
	const runner = createGraphRunner(compiler, data)

	let state = runner.advance()

	for (;;) {
		if (state.kind === 'complete') {

			console.log('Final:', state.artifact)

			return

		} else if (state.kind === 'failed') {

			console.error('Runner failed:', state.diagnostics)

			return

		} else if (state.kind === 'needsGraphRepair') {

			console.error('Repairing:', state.diagnostics)

			const node = possibleNewNodes.pop()

			if (!node) return console.error('No graph repair is available.')

			data.nodes.push(node)

			state = runner.advance({ kind: 'replaceGraph', graph: data })
			
		} else if (state.kind === 'needsArtifactInputs') {

			console.log('Adding artifact inputs:\n', JSON.stringify(state, null, 4))

			const inputs = possibleInputs.shift()

			if (!inputs) return console.error('No artifact inputs are available.')

			state = runner.advance({ kind: 'fill', inputs })

		} else state = runner.advance()
	}
}

main()
