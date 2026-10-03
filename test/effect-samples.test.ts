import { describe, expect, it } from 'vitest'

import {
	compileGraph,
	createTemplateRegistry,
	defineTemplate,
	type GraphCompilationResult,
	type SynthesisInput,
	type SynthesisNode,
	type TypeDescriptor
} from '../src/index.js'
import {
	effectCallbackPolicy,
	effectExpressionPolicy,
	effectGraphTemplateInputs
} from '../core-templates/effect-ts.js'

const expectedModelIds = [
	'EffectSucceed',
	'EffectFail',
	'EffectSync',
	'EffectTry',
	'EffectPromise',
	'EffectTryPromise',
	'EffectAsync',
	'EffectSuspend',
	'EffectSleep',
	'EffectMap',
	'EffectAs',
	'EffectTap',
	'EffectFlatMap',
	'EffectZip',
	'EffectAll',
	'EffectAllConcurrent',
	'EffectRace',
	'EffectCatchAll',
	'EffectOrElse',
	'EffectEither',
	'EffectAcquireRelease',
	'EffectScoped',
	'EffectProvideService',
	'EffectGen',
	'EffectGenBind',
	'EffectGenYield',
	'EffectGenReturn',
	'EffectRunSync',
	'EffectRunSyncExit',
	'EffectRunPromise',
	'EffectRunPromiseExit',
	'EffectRunFork'
] as const

const registry = createTemplateRegistry(effectGraphTemplateInputs)
const literal = (value: unknown): SynthesisInput => ({ kind: 'literal', value })
const stringLiteral = (value: string): SynthesisInput => literal({ kind: 'string', value })
const raw = (code: string): SynthesisInput => ({ kind: 'rawCode', code })
const ref = (nodeId: string): SynthesisInput => ({ kind: 'ref', nodeId })
const collection = (...nodeIds: string[]): SynthesisInput => ({
	kind: 'fragmentCollection',
	items: nodeIds.map(nodeId => ({ kind: 'ref', nodeId }))
})
const effectSemanticOptions = {
	checkSemanticDiagnostics: true,
	tsConfigFilePath: 'tsconfig.typecheck.json',
	filePath: 'test/generated-effect-sample.ts',
	semanticContext: {
		prelude: 'import { Context, Effect, Schedule } from "effect"\nclass Counter extends Context.Service<any, { readonly value: number }>()("Counter") {}'
	}
} as const

const defaultTypeArguments = (templateId: string): Record<string, TypeDescriptor> | undefined => {
	const template = effectGraphTemplateInputs.find(candidate => candidate.modelId === templateId)
	if (!template?.typeParameters) return undefined
	return Object.fromEntries(Object.keys(template.typeParameters).map(name => [
		name,
		{ ts: name === 'R' || name === 'R2' ? 'never' : 'unknown' }
	]))
}

const typedNode = (node: SynthesisNode): SynthesisNode => {
	if (node.typeArguments) return node
	const typeArguments = defaultTypeArguments(node.templateId)
	return typeArguments === undefined ? node : { ...node, typeArguments }
}

const typedNodes = (nodes: readonly SynthesisNode[]): SynthesisNode[] => nodes.map(typedNode)

function compile(
	templateId: string,
	inputs: Record<string, SynthesisInput>,
	supportingNodes: readonly SynthesisNode[] = []
): GraphCompilationResult {
	return compileGraph({
		nodes: typedNodes([...supportingNodes, { id: 'subject', templateId, inputs }]),
		finalNodeId: 'subject'
	}, registry, { checkSemanticDiagnostics: false })
}

function expectCode(
	templateId: string,
	inputs: Record<string, SynthesisInput>,
	expected: string,
	supportingNodes: readonly SynthesisNode[] = []
): void {
	const result = compile(templateId, inputs, supportingNodes)
	expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
	if (result.ok) expect(result.finalArtifact.code).toBe(expected)
}

const effectA: SynthesisNode = {
	id: 'effect-a',
	templateId: 'EffectSucceed',
	inputs: { value: literal(1) }
}
const effectB: SynthesisNode = {
	id: 'effect-b',
	templateId: 'EffectFail',
	inputs: { error: stringLiteral('bad') }
}
const genBind: SynthesisNode = {
	id: 'gen-bind',
	templateId: 'EffectGenBind',
	inputs: { name: literal('value'), source: ref('effect-a') }
}
const genYield: SynthesisNode = {
	id: 'gen-yield',
	templateId: 'EffectGenYield',
	inputs: { source: ref('effect-b') }
}
const genReturn: SynthesisNode = {
	id: 'gen-return',
	templateId: 'EffectGenReturn',
	inputs: { value: raw('value') }
}

describe('Effect v4 sample catalog', () => {
	it('registers exactly 32 unique models in stable order', () => {
		const ids = effectGraphTemplateInputs.map(template => template.modelId)
		expect(ids).toEqual(expectedModelIds)
		expect(new Set(ids).size).toBe(expectedModelIds.length)
		expect(() => createTemplateRegistry(effectGraphTemplateInputs)).not.toThrow()
	})

	it('propagates concrete success, error, and requirement types through Effect nodes', () => {
		const nodes: SynthesisNode[] = [
			{
				id: 'seed', templateId: 'EffectSucceed',
				typeArguments: { A: { ts: 'number' } },
				inputs: { value: literal(1) }
			},
			{
				id: 'mapped', templateId: 'EffectMap',
				typeArguments: {
					A: { ts: 'number' }, B: { ts: 'string' }, E: { ts: 'never' }, R: { ts: 'never' }
				},
				inputs: { source: ref('seed'), transform: raw('value => String(value)') }
			},
			{
				id: 'subject', templateId: 'EffectRunPromise',
				typeArguments: { A: { ts: 'string' }, E: { ts: 'never' } },
				inputs: { source: ref('mapped') }
			}
		]
		const result = compileGraph({ nodes, finalNodeId: 'subject' }, registry)
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (!result.ok) return
		expect(result.artifacts.seed?.type).toMatchObject({ nominal: 'effect/Effect' })
		expect(result.artifacts.mapped?.type).toMatchObject({
			nominal: 'effect/Effect',
			ts: expect.stringContaining('__effectSuccess?: () => (string)')
		})
		expect(result.finalArtifact.type).toEqual({ ts: 'Promise<(string)>' })
	})

	it('rejects an ordinary expression where an Effect is required', () => {
		const PlainNumber = defineTemplate({
			modelId: 'EffectTypeTestPlainNumber', inputs: {},
			output: { kind: 'expression', type: { ts: 'number' } }, source: '1'
		})
		const localRegistry = createTemplateRegistry([...effectGraphTemplateInputs, PlainNumber])
		const result = compileGraph({
			nodes: [
				{ id: 'plain', templateId: PlainNumber.modelId, inputs: {} },
				{
					id: 'subject', templateId: 'EffectMap',
					typeArguments: {
						A: { ts: 'number' }, B: { ts: 'number' }, E: { ts: 'never' }, R: { ts: 'never' }
					},
					inputs: { source: ref('plain'), transform: raw('value => value + 1') }
				}
			],
			finalNodeId: 'subject'
		}, localRegistry)
		expect(result.ok).toBe(false)
		expect(result.diagnostics).toContainEqual(expect.objectContaining({
			code: 'IncompatibleFragmentType', nodeId: 'subject', inputName: 'source'
		}))
	})

	it('rejects a required-service Effect at a runner boundary', () => {
		const result = compileGraph({
			nodes: [
				{
					id: 'required', templateId: 'EffectAsync',
					typeArguments: {
						A: { ts: 'number' }, E: { ts: 'never' },
						R: { ts: '{ readonly service: true }' }
					},
					inputs: { register: raw('resume => resume(Effect.succeed(1))') }
				},
				{
					id: 'subject', templateId: 'EffectRunPromise',
					typeArguments: { A: { ts: 'number' }, E: { ts: 'never' } },
					inputs: { source: ref('required') }
				}
			],
			finalNodeId: 'subject'
		}, registry)
		expect(result.ok).toBe(false)
		expect(result.diagnostics).toContainEqual(expect.objectContaining({
			code: 'IncompatibleFragmentType', nodeId: 'subject', inputName: 'source'
		}))
	})

	it('exports the documented guarded raw-code policies', () => {
		expect(effectExpressionPolicy).toMatchObject({
			maxLength: 900,
			allowNewlines: false,
			forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval']
		})
		expect(effectCallbackPolicy).toMatchObject({
			maxLength: 1800,
			allowNewlines: true,
			forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval']
		})
	})

	it.each([
		['EffectSucceed', { value: stringLiteral('ok') }, 'Effect.succeed("ok")'],
		['EffectFail', { error: stringLiteral('bad') }, 'Effect.fail("bad")'],
		['EffectSync', { thunk: raw('() => 1') }, 'Effect.sync(() => 1)'],
		['EffectTry', { thunk: raw('() => JSON.parse(text)') }, 'Effect.try(() => JSON.parse(text))'],
		['EffectPromise', { thunk: raw('() => Promise.resolve(1)') }, 'Effect.promise(() => Promise.resolve(1))'],
		['EffectTryPromise', { thunk: raw('signal => fetch(url, { signal })') }, 'Effect.tryPromise(signal => fetch(url, { signal }))'],
		['EffectAsync', { register: raw('resume => resume(Effect.succeed(1))') }, 'Effect.callback(resume => resume(Effect.succeed(1)))'],
		['EffectSuspend', { thunk: raw('() => Effect.succeed(1)') }, 'Effect.suspend(() => Effect.succeed(1))'],
		['EffectSleep', { duration: raw('"10 millis"') }, 'Effect.sleep("10 millis")'],
		['EffectMap', { source: raw('source'), transform: raw('value => value + 1') }, 'Effect.map(source, value => value + 1)'],
		['EffectAs', { source: raw('source'), value: literal(null) }, 'Effect.as(source, null)'],
		['EffectTap', { source: raw('source'), tap: raw('value => log(value)') }, 'Effect.tap(source, value => log(value))'],
		['EffectFlatMap', { source: raw('source'), transform: raw('value => next(value)') }, 'Effect.flatMap(source, value => next(value))'],
		['EffectZip', { left: raw('left'), right: raw('right') }, 'Effect.zip(left, right)'],
		['EffectRace', { left: raw('left'), right: raw('right') }, 'Effect.race(left, right)'],
		['EffectCatchAll', { source: raw('source'), handler: raw('error => recover(error)') }, 'Effect.catch(source, error => recover(error))'],
		['EffectOrElse', { source: raw('source'), fallback: raw('() => fallback') }, 'Effect.catchCause(source, () => fallback)'],
		['EffectEither', { source: raw('source') }, 'Effect.result(source)'],
		['EffectAcquireRelease', { acquire: raw('acquire'), release: raw('(resource, exit) => release(resource, exit)') }, 'Effect.acquireRelease(acquire, (resource, exit) => release(resource, exit))'],
		['EffectScoped', { source: raw('source') }, 'Effect.scoped(source)'],
		['EffectProvideService', { source: raw('source'), tag: raw('Service'), service: raw('implementation') }, 'Effect.provideService(source, Service, implementation)'],
		['EffectGenBind', { name: literal('answer'), source: raw('source') }, 'const answer = yield* source;'],
		['EffectGenYield', { source: raw('source') }, 'yield* source;'],
		['EffectGenReturn', { value: literal(42) }, 'return 42;'],
		['EffectRunSync', { source: raw('source') }, 'Effect.runSync(source)'],
		['EffectRunSyncExit', { source: raw('source') }, 'Effect.runSyncExit(source)'],
		['EffectRunPromise', { source: raw('source') }, 'Effect.runPromise(source)'],
		['EffectRunPromiseExit', { source: raw('source') }, 'Effect.runPromiseExit(source)'],
		['EffectRunFork', { source: raw('source') }, 'Effect.runFork(source)']
	] as const)('compiles %s to its exact data-first call', (templateId, inputs, expected) => {
		expectCode(templateId, inputs, expected)
	})

	it('compiles Effect.all from an ordered non-empty fragment collection', () => {
		expectCode(
			'EffectAll',
			{ effects: collection('effect-a', 'effect-b') },
			'Effect.all([Effect.succeed(1), Effect.fail("bad")])',
			[effectA, effectB]
		)
	})

	it('compiles Effect.all with an explicit concurrency policy', () => {
		expectCode(
			'EffectAllConcurrent',
			{ effects: collection('effect-a', 'effect-b'), concurrency: raw('"unbounded"') },
			'Effect.all([Effect.succeed(1), Effect.fail("bad")], { concurrency: "unbounded" })',
			[effectA, effectB]
		)
	})

	it('assembles an Effect.gen body from bind, yield, and return statements', () => {
		expectCode(
			'EffectGen',
			{ body: collection('gen-bind', 'gen-yield', 'gen-return') },
			'Effect.gen(function* () {\nconst value = yield* Effect.succeed(1);\nyield* Effect.fail("bad");\nreturn value;\n})',
			[effectA, effectB, genBind, genYield, genReturn]
		)
	})

	it('composes constructors, transformations, recovery, zipping, and execution', () => {
		const nodes: SynthesisNode[] = [
			{ id: 'seed', templateId: 'EffectSucceed', inputs: { value: literal(1) } },
			{ id: 'mapped', templateId: 'EffectMap', inputs: { source: ref('seed'), transform: raw('value => value + 1') } },
			{ id: 'chained', templateId: 'EffectFlatMap', inputs: { source: ref('mapped'), transform: raw('value => Effect.succeed(value * 2)') } },
			{ id: 'failed', templateId: 'EffectFail', inputs: { error: stringLiteral('boom') } },
			{ id: 'recovered', templateId: 'EffectCatchAll', inputs: { source: ref('failed'), handler: raw('() => Effect.succeed(0)') } },
			{ id: 'zipped', templateId: 'EffectZip', inputs: { left: ref('chained'), right: ref('recovered') } },
			{ id: 'subject', templateId: 'EffectRunPromise', inputs: { source: ref('zipped') } }
		]
		const result = compileGraph({ nodes: typedNodes(nodes), finalNodeId: 'subject' }, registry, { checkSemanticDiagnostics: false })
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (result.ok) {
			expect(result.finalArtifact.code).toBe(
				'Effect.runPromise(Effect.zip(Effect.flatMap(Effect.map(Effect.succeed(1), value => value + 1), value => Effect.succeed(value * 2)), Effect.catch(Effect.fail("boom"), () => Effect.succeed(0))))'
			)
		}
	})

	it('type-checks representative generated artifacts against Effect v4 declarations', () => {
		const composition: SynthesisNode[] = [
			{ id: 'seed', templateId: 'EffectSucceed', inputs: { value: literal(1) } },
			{ id: 'mapped', templateId: 'EffectMap', inputs: { source: ref('seed'), transform: raw('value => value + 1') } },
			{ id: 'chained', templateId: 'EffectFlatMap', inputs: { source: ref('mapped'), transform: raw('value => Effect.succeed(value * 2)') } },
			{ id: 'failed', templateId: 'EffectFail', inputs: { error: stringLiteral('boom') } },
			{ id: 'recovered', templateId: 'EffectCatchAll', inputs: { source: ref('failed'), handler: raw('() => Effect.succeed(0)') } },
			{ id: 'zipped', templateId: 'EffectZip', inputs: { left: ref('chained'), right: ref('recovered') } },
			{ id: 'subject', templateId: 'EffectRunPromise', inputs: { source: ref('zipped') } }
		]
		const generatorAndCollection: SynthesisNode[] = [
			{ id: 'first', templateId: 'EffectSucceed', inputs: { value: literal(1) } },
			{ id: 'second', templateId: 'EffectSync', inputs: { thunk: raw('() => 2') } },
			{ id: 'combined', templateId: 'EffectAll', inputs: { effects: collection('first', 'second') } },
			{ id: 'bind', templateId: 'EffectGenBind', inputs: { name: literal('values'), source: ref('combined') } },
			{ id: 'return', templateId: 'EffectGenReturn', inputs: { value: raw('values[0] + values[1]') } },
			{ id: 'program', templateId: 'EffectGen', inputs: { body: collection('bind', 'return') } },
			{ id: 'subject', templateId: 'EffectRunPromiseExit', inputs: { source: ref('program') } }
		]
		const resilience: SynthesisNode[] = [
			{ id: 'async', templateId: 'EffectAsync', inputs: { register: raw('resume => resume(Effect.succeed(1))') } },
			{ id: 'recovered', templateId: 'EffectCatchAll', inputs: { source: ref('async'), handler: raw('() => Effect.succeed(1)') } },
			{ id: 'sleep', templateId: 'EffectSleep', inputs: { duration: literal(0) } },
			{ id: 'zipped', templateId: 'EffectZip', inputs: { left: ref('recovered'), right: ref('sleep') } },
			{ id: 'subject', templateId: 'EffectRunPromiseExit', inputs: { source: ref('zipped') } }
		]
		const scopedResource: SynthesisNode[] = [
			{ id: 'acquire', templateId: 'EffectSucceed', inputs: { value: raw('{ close: () => undefined }') } },
			{ id: 'resource', templateId: 'EffectAcquireRelease', inputs: { acquire: ref('acquire'), release: raw('resource => Effect.sync(resource.close)') } },
			{ id: 'scoped', templateId: 'EffectScoped', inputs: { source: ref('resource') } },
			{ id: 'subject', templateId: 'EffectRunPromise', inputs: { source: ref('scoped') } }
		]
		const providedService: SynthesisNode[] = [
			{
				id: 'provided',
				templateId: 'EffectProvideService',
				inputs: {
					source: raw('Effect.map(Counter, service => service.value)'),
					tag: raw('Counter'),
					service: literal({ value: 1 })
				}
			},
			{ id: 'subject', templateId: 'EffectRunPromise', inputs: { source: ref('provided') } }
		]
		const concurrency: SynthesisNode[] = [
			{ id: 'left', templateId: 'EffectSucceed', inputs: { value: literal(1) } },
			{ id: 'right', templateId: 'EffectSucceed', inputs: { value: literal(2) } },
			{ id: 'raced', templateId: 'EffectRace', inputs: { left: ref('left'), right: ref('right') } },
			{ id: 'all', templateId: 'EffectAllConcurrent', inputs: { effects: collection('raced', 'right'), concurrency: literal(2) } },
			{ id: 'subject', templateId: 'EffectRunPromise', inputs: { source: ref('all') } }
		]

		for (const nodes of [
			composition,
			generatorAndCollection,
			resilience,
			scopedResource,
			providedService,
			concurrency
		]) {
			const result = compileGraph({ nodes: typedNodes(nodes), finalNodeId: 'subject' }, registry, effectSemanticOptions)
			expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		}
	})

	it('proves Effect semantic checking rejects an invalid generated callback', () => {
		const result = compileGraph({
			nodes: typedNodes([
				{ id: 'seed', templateId: 'EffectSucceed', inputs: { value: literal(1) } },
				{
					id: 'subject',
					templateId: 'EffectMap',
					inputs: { source: ref('seed'), transform: raw('value => value.nonexistent()') }
				}
			]),
			finalNodeId: 'subject'
		}, registry, effectSemanticOptions)

		expect(result.ok).toBe(false)
		expect(result.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({
				code: 'TypeScriptSemanticError',
				compilerCode: 2339,
				nodeId: 'subject',
				templateId: 'EffectMap',
				inputName: 'transform'
			})
		]))
	})

	it('accepts literal, fragment, raw-expression, and multiline callback paths', () => {
		expectCode('EffectSucceed', { value: literal({ enabled: true }) }, 'Effect.succeed({ enabled: true })')
		expectCode(
			'EffectMap',
			{ source: ref('effect-a'), transform: raw('(value) => {\n  return value + 1\n}') },
			'Effect.map(Effect.succeed(1), (value) => {\n  return value + 1\n})',
			[effectA]
		)
		expectCode('EffectEither', { source: raw('existingEffect') }, 'Effect.result(existingEffect)')
	})

	it.each([
		'import("module")',
		'require("module")',
		'process.env.VALUE',
		'globalThis.value',
		'Function("return 1")',
		'eval("1")'
	])('rejects forbidden raw expression %s', code => {
		const result = compile('EffectSucceed', { value: raw(code) })
		expect(result.ok).toBe(false)
		expect(result.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({ code: 'RawCodeRejected', inputName: 'value' })
		]))
	})

	it('enforces expression and callback length/newline policies', () => {
		const newlineResult = compile('EffectEither', { source: raw('first\nsecond') })
		expect(newlineResult.ok).toBe(false)
		expect(newlineResult.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({ code: 'RawCodeRejected', inputName: 'source' })
		]))

		const longExpressionResult = compile('EffectSucceed', { value: raw(`"${'x'.repeat(900)}"`) })
		expect(longExpressionResult.ok).toBe(false)
		const longCallbackResult = compile('EffectSync', { thunk: raw(`() => "${'x'.repeat(1800)}"`) })
		expect(longCallbackResult.ok).toBe(false)
	})

	it('rejects invalid literal duration and concurrency policies', () => {
		const durationResult = compile('EffectSleep', { duration: literal(-1) })
		expect(durationResult.ok).toBe(false)
		expect(durationResult.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({ inputName: 'duration' })
		]))

		const concurrencyResult = compile('EffectAllConcurrent', {
			effects: collection('effect-a'),
			concurrency: literal(0)
		}, [effectA])
		expect(concurrencyResult.ok).toBe(false)
		expect(concurrencyResult.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({ inputName: 'concurrency' })
		]))
	})

	it('rejects malformed callbacks', () => {
		const result = compile('EffectMap', { source: raw('source'), transform: raw('value =>') })
		expect(result.ok).toBe(false)
	})

	it.each(['EffectAll', 'EffectAllConcurrent', 'EffectGen'])('rejects empty %s collections', templateId => {
		const inputName = templateId === 'EffectGen' ? 'body' : 'effects'
		const inputs: Record<string, SynthesisInput> = { [inputName]: collection() }
		if (templateId === 'EffectAllConcurrent') inputs.concurrency = literal(1)
		const result = compile(templateId, inputs)
		expect(result.ok).toBe(false)
		expect(result.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({ inputName })
		]))
	})

	it('rejects a statement fragment where an Effect expression is required', () => {
		const result = compile('EffectMap', {
			source: ref('return-statement'),
			transform: raw('value => value')
		}, [{
			id: 'return-statement',
			templateId: 'EffectGenReturn',
			inputs: { value: literal(1) }
		}])
		expect(result.ok).toBe(false)
		expect(result.diagnostics).toEqual(expect.arrayContaining([
			expect.objectContaining({ code: 'IncompatibleFragmentKind', inputName: 'source' })
		]))
	})
})
