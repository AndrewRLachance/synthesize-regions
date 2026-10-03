import {
	compileGraph,
	createTemplateRegistry,
	defineTemplate,
	type SynthesisNode,
	type TypeDescriptor
} from 'synthesize-regions'
import { basePatternGraphTemplateInputs } from '@synthesize-regions/core-templates/base'
import { assertOk, block, code, collection, diagnosticLine, fact, raw, ref, step, writeOutput } from './shared.js'

export const id = '02-graph-compilation'
export const title = 'Layer 2 - typed graph composition'

const userType = { ts: '{ id: number; active: boolean }' } as const
const viewType = { ts: '{ label: string }' } as const
const booleanType = { ts: 'boolean', schema: { type: 'boolean' } } as const
const userArrayType = { ts: `readonly ${userType.ts}[]`, schema: { type: 'array' } } as const
const isActiveType = { ts: `(value: ${userType.ts}, index: number, array: ${userArrayType.ts}) => boolean` } as const
const toViewType = { ts: `(value: ${userType.ts}, index: number, array: ${userArrayType.ts}) => ${viewType.ts}` } as const

/** Leaf templates the curated base patterns compose; they ship no leaves of their own. */
const leaves = [
	defineTemplate({ modelId: 'DemoUsers', inputs: {}, output: { kind: 'expression', type: userArrayType }, source: 'users' }),
	defineTemplate({ modelId: 'DemoIsActive', inputs: {}, output: { kind: 'expression', type: isActiveType }, source: 'isActive' }),
	defineTemplate({ modelId: 'DemoToView', inputs: {}, output: { kind: 'expression', type: toViewType }, source: 'toView' }),
	defineTemplate({ modelId: 'DemoFlag', inputs: {}, output: { kind: 'expression', type: booleanType }, source: 'flag' }),
	defineTemplate({ modelId: 'DemoOtherFlag', inputs: {}, output: { kind: 'expression', type: booleanType }, source: 'otherFlag' }),
	defineTemplate({ modelId: 'DemoFirst', inputs: {}, output: { kind: 'statement' }, source: 'first();' }),
	defineTemplate({ modelId: 'DemoSecond', inputs: {}, output: { kind: 'statement' }, source: 'second();' }),
	defineTemplate({ modelId: 'DemoFallback', inputs: {}, output: { kind: 'statement' }, source: 'fallback();' })
] as const

const leafNode = (templateId: string): SynthesisNode => ({ id: templateId, templateId, inputs: {} })
const leafNodes: readonly SynthesisNode[] = leaves.map(template => leafNode(template.modelId))
const typeArgs = (...entries: ReadonlyArray<readonly [string, TypeDescriptor]>): Record<string, TypeDescriptor> =>
	Object.fromEntries(entries)

export function run(): void {
	step(
		title,
		'Templates become operands. A graph node binds one template, supplies its\n' +
		'inputs, and declares its type arguments. The compiler checks every port\n' +
		'against the producing fragment, so a pipeline that does not type-check is\n' +
		'rejected before any code is produced.'
	)

	const registry = createTemplateRegistry([...basePatternGraphTemplateInputs, ...leaves])
	fact('catalog', `base-patterns (${basePatternGraphTemplateInputs.length}) + ${leaves.length} demo leaves`)
	fact('contractDigest', registry.contractDigest)

	const pipeline = compileGraph({
		nodes: [
			...leafNodes,
			{
				id: 'active',
				templateId: 'ArrayFilter',
				typeArguments: typeArgs(['T', userType]),
				inputs: { array: ref('DemoUsers'), callback: ref('DemoIsActive') }
			},
			{
				id: 'subject',
				templateId: 'ArrayMap',
				typeArguments: typeArgs(['T', userType], ['U', viewType]),
				inputs: { array: ref('active'), callback: ref('DemoToView') }
			}
		],
		finalNodeId: 'subject'
	}, registry)
	assertOk(pipeline, 'ArrayFilter -> ArrayMap pipeline')
	code('chained pipeline, two nodes, T propagated through the boundary', pipeline.finalArtifact.code)
	fact('inferred output type', pipeline.finalArtifact.type?.ts ?? '(none)')

	const branch = compileGraph({
		nodes: [
			...leafNodes,
			{
				id: 'terminal',
				templateId: 'IfElse',
				inputs: {
					condition: ref('DemoOtherFlag'),
					thenStatements: collection('DemoSecond'),
					elseStatements: collection('DemoFallback')
				}
			},
			{
				id: 'chain',
				templateId: 'IfElseChain',
				inputs: {
					condition: ref('DemoFlag'),
					statements: collection('DemoFirst'),
					otherwise: ref('terminal')
				}
			}
		],
		finalNodeId: 'chain'
	}, registry)
	assertOk(branch, 'IfElseChain')
	code('recursive else-if chain, built from structurally constrained ports', branch.finalArtifact.code)

	writeOutput(`${id}/array-pipeline.ts`, `export const views = ${pipeline.finalArtifact.code}\n`)
	writeOutput(`${id}/if-else-chain.ts`, branch.finalArtifact.code)

	console.log('\n--- the same composition rules reject incompatible fragments')

	const rawCodeIntoFragmentPort = compileGraph({
		nodes: [{ id: 'subject', templateId: 'ConditionNot', inputs: { value: raw('true') } }],
		finalNodeId: 'subject'
	}, registry)
	console.log(`  ${rawCodeIntoFragmentPort.diagnostics.map(diagnosticLine).join('\n  ')}`)

	const missingTypeArgument = compileGraph({
		nodes: [...leafNodes, { id: 'subject', templateId: 'ArrayMap', inputs: { array: ref('DemoUsers'), callback: ref('DemoToView') } }],
		finalNodeId: 'subject'
	}, registry)
	console.log(`  ${missingTypeArgument.diagnostics.map(diagnosticLine).join('\n  ')}`)

	const wrongCallback = compileGraph({
		nodes: [...leafNodes, {
			id: 'subject',
			templateId: 'ArrayFilter',
			typeArguments: typeArgs(['T', userType]),
			inputs: { array: ref('DemoUsers'), callback: ref('DemoToView') }
		}],
		finalNodeId: 'subject'
	}, registry)
	console.log(`  ${wrongCallback.diagnostics.map(diagnosticLine).join('\n  ')}`)

	const wrongSource = compileGraph({
		nodes: [...leafNodes, {
			id: 'subject',
			templateId: 'IfElseChain',
			inputs: { condition: ref('DemoFlag'), statements: collection('DemoFirst'), otherwise: ref('DemoFallback') }
		}],
		finalNodeId: 'subject'
	}, registry)
	console.log(`  ${wrongSource.diagnostics.map(diagnosticLine).join('\n  ')}`)

	block('raw-code ports exist, but only where a family declares them', [
		'base-patterns:  no rawCode port at all - every code-valued input is a fragment reference',
		'effect families:  unionPort(rawCodePort, fragmentPort) where a caller must supply an expression',
		`demo leaves:     ${leaves[leaves.length - 1]?.modelId} and friends declare their own output types`
	].join('\n'))
}
