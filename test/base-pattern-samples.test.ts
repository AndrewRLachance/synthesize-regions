import { describe, expect, it } from 'vitest'
import {
	compileGraph,
	createTemplateRegistry,
	defineTemplate,
	type GraphCompilationResult,
	type InputPort,
	type SynthesisInput,
	type SynthesisNode,
	type TypeDescriptor
} from '../src/index.js'
import { basePatternGraphTemplateInputs } from '../samples/e-samplesBasePatterns.js'

const expectedModelIds = [
	'PropertyIn', 'ConditionAnd', 'ConditionOr', 'ConditionXor', 'ConditionXand', 'ConditionNot',
	'ConditionNand', 'ConditionNor', 'ConditionImplication', 'ConditionConverseImplication',
	'ConditionIff', 'ConditionNonImplication', 'ConditionConverseNonImplication', 'ConditionFormulaCall',
	'ArrayExists', 'ArrayForAll', 'StatementBlock', 'IfStatement', 'IfElse', 'IfElseChain', 'Ternary',
	'ObjectPatternMatchWithFallback', 'ArrayMap', 'ArrayFilter', 'ArrayFind', 'ArrayFindIndex',
	'ArrayFlatMap', 'ArrayForEachCall', 'TypeSugarExtensionCall', 'WhileHolds', 'WhileTrue', 'ForIndex', 'ForEach'
] as const

const leaf = (modelId: string, source: string, type: TypeDescriptor) => defineTemplate({
	modelId, inputs: {}, output: { kind: 'expression', type }, source
})
const boolType = { ts: 'boolean', schema: { type: 'boolean' } } as const
const stringType = { ts: 'string', schema: { type: 'string' } } as const
const numberType = { ts: 'number', schema: { type: 'number' } } as const
const unknownType = { ts: 'unknown', schema: true } as const
const userType = { ts: '{ id: number; active: boolean }' } as const
const viewType = { ts: '{ label: string }' } as const

const leaves = [
	leaf('BaseLeft', 'left', boolType),
	leaf('BaseRight', 'right', boolType),
	leaf('BaseTrue', 'true', boolType),
	leaf('BaseFalse', 'false', boolType),
	leaf('BaseCondition1', 'condition1(x)', boolType),
	leaf('BaseCondition2', 'condition2(x)', boolType),
	leaf('BaseCondition3', 'condition3(x)', boolType),
	leaf('BaseProperty', 'property', { ts: 'PropertyKey' }),
	leaf('BaseObject', 'candidate', { ts: 'object', schema: { type: 'object' } }),
	leaf('BaseFormula', 'formula', { ts: '(...conditions: boolean[]) => boolean' }),
	leaf('BaseStringA', 'f(x)', stringType),
	leaf('BaseStringB', 'g(x)', stringType),
	leaf('BaseStringC', 'f(g(x))', stringType),
	leaf('BaseStringFallback', 'fallback(x)', stringType),
	leaf('BaseUnknown', 'receiver', unknownType),
	leaf('BaseArgument1', 'firstValue', unknownType),
	leaf('BaseArgument2', 'secondValue', unknownType),
	leaf('BaseUsers', 'users', { ts: 'readonly { id: number; active: boolean }[]', schema: { type: 'array' } }),
	leaf('BaseUserPredicate', 'isActive', { ts: '(value: { id: number; active: boolean }, index: number, array: readonly { id: number; active: boolean }[]) => boolean' }),
	leaf('BaseUserToView', 'toView', { ts: '(value: { id: number; active: boolean }, index: number, array: readonly { id: number; active: boolean }[]) => { label: string }' }),
	leaf('BaseUserFlatMap', 'toViews', { ts: '(value: { id: number; active: boolean }, index: number, array: readonly { id: number; active: boolean }[]) => { label: string } | readonly { label: string }[]' }),
	leaf('BaseUserVisitor', 'visitUser', { ts: '(value: { id: number; active: boolean }, index: number, array: readonly { id: number; active: boolean }[]) => unknown' }),
	leaf('BaseForEachVisitor', 'visitUser', { ts: '(item: { id: number; active: boolean }) => unknown' }),
	leaf('BaseWrongPredicate', 'wrongPredicate', { ts: '(value: string) => boolean' }),
	leaf('BaseZeroApplication', 'tick', { ts: '() => unknown' }),
	leaf('BaseIndexApplication', 'visitIndex', { ts: '(index: number) => unknown' }),
	leaf('BaseLimit', 'users.length', numberType),
	leaf('BasePatternValue', 'input', unknownType),
	leaf('BaseObjectPattern', '{ id: P.number }', unknownType),
	leaf('BaseMatchedHandler', 'matched', { ts: '(...args: never[]) => string' })
] as const

const statement = (modelId: string, source: string) => defineTemplate({
	modelId, inputs: {}, output: { kind: 'statement' }, source
})
const statements = [
	statement('BaseFirstStatement', 'first();'),
	statement('BaseSecondStatement', 'second();'),
	statement('BaseFallbackStatement', 'fallback();')
] as const

const registry = createTemplateRegistry([...basePatternGraphTemplateInputs, ...leaves, ...statements])
const ref = (nodeId: string): SynthesisInput => ({ kind: 'ref', nodeId })
const collection = (...nodeIds: string[]): SynthesisInput => ({
	kind: 'fragmentCollection', items: nodeIds.map(nodeId => ({ $ref: nodeId }))
})
const literal = (value: unknown): SynthesisInput => ({ kind: 'literal', value })
const node = (id: string, templateId: string): SynthesisNode => ({ id, templateId, inputs: {} })
const typeArguments = (...entries: Array<[string, TypeDescriptor]>): Record<string, TypeDescriptor> => Object.fromEntries(entries)

const baseNodes: SynthesisNode[] = [
	...leaves.map(template => node(template.modelId, template.modelId)),
	...statements.map(template => node(template.modelId, template.modelId))
]

function compileSubject(
	templateId: string,
	inputs: Record<string, SynthesisInput>,
	options: { typeArguments?: Record<string, TypeDescriptor>; supportingNodes?: SynthesisNode[] } = {}
): GraphCompilationResult {
	return compileGraph({
		nodes: [
			...(options.supportingNodes ?? baseNodes),
			{ id: 'subject', templateId, ...(options.typeArguments ? { typeArguments: options.typeArguments } : {}), inputs }
		],
		finalNodeId: 'subject'
	}, registry)
}

function expectCode(
	templateId: string,
	inputs: Record<string, SynthesisInput>,
	expected: string,
	options: { typeArguments?: Record<string, TypeDescriptor>; supportingNodes?: SynthesisNode[] } = {}
): void {
	const result = compileSubject(templateId, inputs, options)
	expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
	if (result.ok) expect(result.finalArtifact.code).toBe(expected)
}

function containsRawPort(port: InputPort): boolean {
	return port.kind === 'rawCode' || (port.kind === 'union' && port.options.some(containsRawPort))
}

describe('production base-pattern catalog', () => {
	it('registers exactly 33 unique models in stable order', () => {
		const ids = basePatternGraphTemplateInputs.map(template => template.modelId)
		expect(ids).toEqual(expectedModelIds)
		expect(new Set(ids).size).toBe(expectedModelIds.length)
		expect(() => createTemplateRegistry(basePatternGraphTemplateInputs)).not.toThrow()
	})

	it('contains no raw-code input path', () => {
		for (const template of basePatternGraphTemplateInputs) {
			for (const port of Object.values(template.inputs)) expect(containsRawPort(port)).toBe(false)
		}
	})
})

describe('logical conditions', () => {
	it.each([
		['ConditionAnd', '(left && right)'],
		['ConditionOr', '(left || right)'],
		['ConditionXor', '(left !== right)'],
		['ConditionXand', '(left === right)'],
		['ConditionNand', '!(left && right)'],
		['ConditionNor', '!(left || right)'],
		['ConditionImplication', '(!left || right)'],
		['ConditionConverseImplication', '(!right || left)'],
		['ConditionIff', '(left === right)'],
		['ConditionNonImplication', '(left && !right)'],
		['ConditionConverseNonImplication', '(right && !left)']
	])('compiles %s exactly', (templateId, expected) => {
		expectCode(templateId, { left: ref('BaseLeft'), right: ref('BaseRight') }, expected)
	})

	it('implements every binary truth table', () => {
		const expected: Record<string, (left: boolean, right: boolean) => boolean> = {
			ConditionAnd: (a, b) => a && b,
			ConditionOr: (a, b) => a || b,
			ConditionXor: (a, b) => a !== b,
			ConditionXand: (a, b) => a === b,
			ConditionNand: (a, b) => !(a && b),
			ConditionNor: (a, b) => !(a || b),
			ConditionImplication: (a, b) => !a || b,
			ConditionConverseImplication: (a, b) => !b || a,
			ConditionIff: (a, b) => a === b,
			ConditionNonImplication: (a, b) => a && !b,
			ConditionConverseNonImplication: (a, b) => b && !a
		}
		for (const [templateId, formula] of Object.entries(expected)) {
			const result = compileSubject(templateId, {
				left: ref('BaseLeft'),
				right: ref('BaseRight')
			})
			expect(result.ok).toBe(true)
			if (!result.ok) continue
			const evaluate = Function('left', 'right', `"use strict"; return ${result.finalArtifact.code};`) as (left: boolean, right: boolean) => boolean
			for (const leftValue of [false, true]) for (const rightValue of [false, true]) {
				expect(evaluate(leftValue, rightValue)).toBe(formula(leftValue, rightValue))
			}
		}
	})

	it('compiles membership, negation, and formula application', () => {
		expectCode('PropertyIn', { property: ref('BaseProperty'), object: ref('BaseObject') }, '(property in candidate)')
		expectCode('ConditionNot', { value: ref('BaseLeft') }, '(!left)')
		expectCode('ConditionFormulaCall', {
			formula: ref('BaseFormula'), conditions: collection('BaseLeft', 'BaseRight')
		}, '(formula)(left, right)')
	})

	it('chains condition producers through boolean fragment ports', () => {
		const supportingNodes: SynthesisNode[] = [
			...baseNodes,
			{ id: 'notRight', templateId: 'ConditionNot', inputs: { value: ref('BaseRight') } }
		]
		expectCode('ConditionAnd', { left: ref('BaseLeft'), right: ref('notRight') }, '(left && (!right))', {
			supportingNodes
		})
	})

	it.each([
		['ArrayExists', 'some'], ['ArrayForAll', 'every']
	])('compiles generic %s', (templateId, method) => {
		expectCode(templateId, { array: ref('BaseUsers'), formula: ref('BaseUserPredicate') }, `(users).${method}(isActive)`, {
			typeArguments: typeArguments(['T', userType])
		})
	})
})

describe('statements and conditionals', () => {
	it('groups statements and emits if forms', () => {
		expectCode('StatementBlock', { statements: collection('BaseFirstStatement', 'BaseSecondStatement') }, '{\nfirst();\nsecond();\n}')
		expectCode('IfStatement', {
			condition: ref('BaseCondition1'), thenStatements: collection('BaseFirstStatement')
		}, 'if (condition1(x)) {\nfirst();\n}')
		expectCode('IfElse', {
			condition: ref('BaseCondition1'),
			thenStatements: collection('BaseFirstStatement'),
			elseStatements: collection('BaseFallbackStatement')
		}, 'if (condition1(x)) {\nfirst();\n} else {\nfallback();\n}')
	})

	it('builds a structurally constrained recursive else-if chain', () => {
		const supportingNodes: SynthesisNode[] = [
			...baseNodes,
			{
				id: 'terminal', templateId: 'IfElse', inputs: {
					condition: ref('BaseCondition3'),
					thenStatements: collection('BaseSecondStatement'),
					elseStatements: collection('BaseFallbackStatement')
				}
			},
			{
				id: 'secondBranch', templateId: 'IfElseChain', inputs: {
					condition: ref('BaseCondition2'),
					statements: collection('BaseSecondStatement'),
					otherwise: ref('terminal')
				}
			}
		]
		expectCode('IfElseChain', {
			condition: ref('BaseCondition1'), statements: collection('BaseFirstStatement'), otherwise: ref('secondBranch')
		}, 'if (condition1(x)) {\nfirst();\n} else if (condition2(x)) {\nsecond();\n} else if (condition3(x)) {\nsecond();\n} else {\nfallback();\n}', { supportingNodes })
	})

	it('chains typed ternaries and propagates T', () => {
		const stringArgument = typeArguments(['T', stringType])
		const supportingNodes: SynthesisNode[] = [
			...baseNodes,
			{
				id: 'last', templateId: 'Ternary', typeArguments: stringArgument,
				inputs: { condition: ref('BaseCondition3'), whenTrue: ref('BaseStringC'), whenFalse: ref('BaseStringFallback') }
			},
			{
				id: 'middle', templateId: 'Ternary', typeArguments: stringArgument,
				inputs: { condition: ref('BaseCondition2'), whenTrue: ref('BaseStringB'), whenFalse: ref('last') }
			}
		]
		const result = compileSubject('Ternary', {
			condition: ref('BaseCondition1'), whenTrue: ref('BaseStringA'), whenFalse: ref('middle')
		}, { typeArguments: stringArgument, supportingNodes })
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (result.ok) {
			expect(result.finalArtifact.code).toBe('(condition1(x) ? f(x) : (condition2(x) ? g(x) : (condition3(x) ? f(g(x)) : fallback(x))))')
			expect(result.finalArtifact.type).toEqual({ ts: '(string)', schema: true })
		}
	})

	it('chains object patterns through lazy typed fallback results', () => {
		const stringArgument = typeArguments(['R', stringType])
		const supportingNodes: SynthesisNode[] = [
			...baseNodes,
			{
				id: 'fallbackMatch',
				templateId: 'ObjectPatternMatchWithFallback',
				typeArguments: stringArgument,
				inputs: {
					value: ref('BasePatternValue'),
					objectPattern: ref('BaseObjectPattern'),
					matchedHandler: ref('BaseMatchedHandler'),
					fallbackResult: ref('BaseStringFallback')
				}
			}
		]
		const result = compileSubject('ObjectPatternMatchWithFallback', {
			value: ref('BasePatternValue'), objectPattern: ref('BaseObjectPattern'),
			matchedHandler: ref('BaseMatchedHandler'), fallbackResult: ref('fallbackMatch')
		}, { typeArguments: stringArgument, supportingNodes })
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (result.ok) {
			expect(result.finalArtifact.code).toBe(
				'match(input).with({ id: P.number }, matched).otherwise(() => match(input).with({ id: P.number }, matched).otherwise(() => fallback(x)))'
			)
			expect(result.finalArtifact.type).toEqual({ ts: '(string)', schema: true })
		}
	})
})

describe('typed array operations and loops', () => {
	it.each([
		['ArrayMap', 'map', 'BaseUserToView', [['T', userType], ['U', viewType]], '({ label: string })[]'],
		['ArrayFilter', 'filter', 'BaseUserPredicate', [['T', userType]], '({ id: number; active: boolean })[]'],
		['ArrayFind', 'find', 'BaseUserPredicate', [['T', userType]], '({ id: number; active: boolean }) | undefined'],
		['ArrayFindIndex', 'findIndex', 'BaseUserPredicate', [['T', userType]], 'number'],
		['ArrayFlatMap', 'flatMap', 'BaseUserFlatMap', [['T', userType], ['U', viewType]], '({ label: string })[]'],
		['ArrayForEachCall', 'forEach', 'BaseUserVisitor', [['T', userType]], 'void']
	] as const)('compiles %s with correlated types', (templateId, method, callback, args, outputTs) => {
		const result = compileSubject(templateId, { array: ref('BaseUsers'), callback: ref(callback) }, {
			typeArguments: typeArguments(...args.map(([name, type]) => [name, type] as [string, TypeDescriptor]))
		})
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (result.ok) {
			expect(result.finalArtifact.code).toBe(`(users).${method}(${callback === 'BaseUserPredicate' ? 'isActive' : callback === 'BaseUserToView' ? 'toView' : callback === 'BaseUserFlatMap' ? 'toViews' : 'visitUser'})`)
			expect(result.finalArtifact.type?.ts).toBe(outputTs)
		}
	})

	it('chains compatible typed array operations into a pipeline', () => {
		const supportingNodes: SynthesisNode[] = [
			...baseNodes,
			{
				id: 'activeUsers',
				templateId: 'ArrayFilter',
				typeArguments: typeArguments(['T', userType]),
				inputs: { array: ref('BaseUsers'), callback: ref('BaseUserPredicate') }
			}
		]
		const result = compileSubject('ArrayMap', {
			array: ref('activeUsers'), callback: ref('BaseUserToView')
		}, {
			typeArguments: typeArguments(['T', userType], ['U', viewType]),
			supportingNodes
		})
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (result.ok) {
			expect(result.finalArtifact.code).toBe('((users).filter(isActive)).map(toView)')
			expect(result.finalArtifact.type?.ts).toBe('({ label: string })[]')
		}
	})

	it('compiles extension calls and application loops', () => {
		expectCode('TypeSugarExtensionCall', {
			receiver: ref('BaseUnknown'), method: literal('extend'), arguments: collection('BaseArgument1', 'BaseArgument2')
		}, '(receiver).extend(firstValue, secondValue)')
		expectCode('WhileHolds', {
			condition: ref('BaseLeft'), application: ref('BaseZeroApplication')
		}, 'while (left) {\n  (tick)();\n}')
		expectCode('WhileTrue', { application: ref('BaseZeroApplication') }, 'while (true) {\n  (tick)();\n}')
		expectCode('ForIndex', {
			limit: ref('BaseLimit'), application: ref('BaseIndexApplication')
		}, 'for (let index = 0; index < users.length; index += 1) {\n  (visitIndex)(index);\n}')
		expectCode('ForEach', {
			array: ref('BaseUsers'), application: ref('BaseForEachVisitor')
		}, 'for (const item of users) {\n  (visitUser)(item);\n}', {
			typeArguments: typeArguments(['T', userType])
		})
	})

	it('chains extension calls through the receiver port', () => {
		const supportingNodes: SynthesisNode[] = [
			...baseNodes,
			{
				id: 'extended',
				templateId: 'TypeSugarExtensionCall',
				inputs: {
					receiver: ref('BaseUnknown'), method: literal('extend'), arguments: collection('BaseArgument1')
				}
			}
		]
		expectCode('TypeSugarExtensionCall', {
			receiver: ref('extended'), method: literal('next'), arguments: collection('BaseArgument2')
		}, '((receiver).extend(firstValue)).next(secondValue)', { supportingNodes })
	})
})

describe('base-pattern contract failures', () => {
	it('rejects raw snippets at fragment-only ports', () => {
		const result = compileSubject('ConditionNot', { value: { kind: 'rawCode', code: 'true' } })
		expect(result.ok).toBe(false)
		expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'IncompatibleInputKind', inputName: 'value' }))
	})

	it('rejects missing generic bindings and mismatched callbacks', () => {
		expect(compileSubject('ArrayMap', {
			array: ref('BaseUsers'), callback: ref('BaseUserToView')
		}).diagnostics).toContainEqual(expect.objectContaining({ code: 'MissingTypeArgument' }))

		expect(compileSubject('ArrayFilter', {
			array: ref('BaseUsers'), callback: ref('BaseWrongPredicate')
		}, { typeArguments: typeArguments(['T', userType]) }).diagnostics).toContainEqual(
			expect.objectContaining({ code: 'IncompatibleFragmentType', inputName: 'callback' })
		)
	})

	it('rejects empty required collections and disallowed else sources', () => {
		expect(compileSubject('StatementBlock', { statements: collection() }).diagnostics).toContainEqual(
			expect.objectContaining({ code: 'IncompatibleCollectionSize', inputName: 'statements' })
		)
		expect(compileSubject('IfElseChain', {
			condition: ref('BaseCondition1'), statements: collection('BaseFirstStatement'), otherwise: ref('BaseFallbackStatement')
		}).diagnostics).toContainEqual(expect.objectContaining({ code: 'IncompatibleFragmentSource', inputName: 'otherwise' }))
	})
})
