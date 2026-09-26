import { compileGraph, type SynthesisNode, type TypeDescriptor } from '../src/index.js'
import { assertOk, code, collection, fact, literal, raw, ref, step, writeOutput } from './shared.js'
import { coreRegistry, projectRoot } from './shared.js'
import { join } from 'node:path'

export const id = '03-effect-application'
export const title = 'Layer 3 - a complete Effect application'

/**
 * Type arguments are resolved in a synthetic context with no imports, so they
 * must be self-contained type expressions. This mirrors the convention the
 * repo's own Effect tests use: requirement and error channels are `never`,
 * everything else is `unknown`. The real type fidelity of the generated file is
 * proven by the semantic check below, not by these arguments.
 */
function typeArgsFor(templateId: string): Record<string, TypeDescriptor> {
	const parameters = coreRegistry().get(templateId)?.typeParameters
	if (parameters === undefined) throw new Error(`${templateId} declares no type parameters`)
	return Object.fromEntries(
		Object.keys(parameters).map(name => [
			name,
			{ ts: name.startsWith('R') || name === 'ELayer' || name === 'EProgram' ? 'never' : 'unknown' }
		])
	)
}

/**
 * `ApplicationMain.P` is the program's requirement channel, so it must equal
 * `EffectGen.R`. The default convention maps every `R*` to `never`; here the
 * program really does require the greeting service, so both sides are widened
 * to `unknown` to keep the two ends of the composition consistent.
 */
function programTypeArgs(): Record<string, TypeDescriptor> {
	const widened: Record<string, TypeDescriptor> = {}
	for (const [name, value] of Object.entries(typeArgsFor('EffectGen'))) {
		widened[name] = { ts: name === 'R' ? 'unknown' : (value.ts ?? 'unknown') }
	}
	return widened
}

function applicationTypeArgs(): Record<string, TypeDescriptor> {
	return {
		...typeArgsFor('ApplicationMain'),
		// The synthetic graph intentionally models the composed program's error
		// channel conservatively; semantic checking below proves the concrete code.
		EProgram: { ts: 'unknown' }
	}
}

export function run(): void {
	step(
		title,
		'The same graph layer, pointed at the Effect families. This compiles a whole\n' +
		'Node entry point - service tag, layer, Effect.gen program, managed runtime, and\n' +
		'disposal - then type-checks it against the Effect declarations installed in\n' +
		'this repo. Code that does not compile is never returned.'
	)

	const registry = coreRegistry()
	fact('catalog', `${registry.list().length} templates from 17 families`)
	fact('families used', 'service-layer, application, effect, workflow')

	const nodes: SynthesisNode[] = [
		{
			id: 'tag',
			templateId: 'ContextTagDeclaration',
			inputs: {
				name: literal('GreetingService'),
				key: literal('GreetingService'),
				serviceType: raw('{ readonly greet: (name: string) => Effect.Effect<string> }')
			}
		},
		{
			id: 'greet',
			templateId: 'EffectFnDeclaration',
			inputs: {
				name: literal('greet'),
				body: raw('function* (name: string) { return yield* Effect.succeed(`Hello, ${name}!`) }')
			}
		},
		{
			id: 'layer',
			templateId: 'LayerSucceed',
			typeArguments: typeArgsFor('LayerSucceed'),
			inputs: { tag: raw('GreetingService'), service: raw('{ greet }') }
		},
		{
			id: 'mapped',
			templateId: 'EffectMap',
			typeArguments: typeArgsFor('EffectMap'),
			inputs: { source: raw('GreetingService'), transform: raw('(service) => service.greet("world")') }
		},
		{
			id: 'bind',
			templateId: 'EffectGenBind',
			typeArguments: typeArgsFor('EffectGenBind'),
			inputs: { name: literal('greeting'), source: ref('mapped') }
		},
		{
			id: 'program',
			templateId: 'EffectGen',
			typeArguments: programTypeArgs(),
			inputs: { body: collection('bind') }
		},
		{
			id: 'main',
			templateId: 'ApplicationMain',
			typeArguments: applicationTypeArgs(),
			inputs: {
				declarations: collection('tag', 'greet'),
				layers: collection('layer'),
				program: ref('program')
			}
		}
	]

	const result = compileGraph(
		{ nodes, finalNodeId: 'main', goal: { outputKind: 'sourceFile' } },
		registry,
		{
			checkSemanticDiagnostics: true,
			tsConfigFilePath: join(projectRoot, 'tsconfig.typecheck.json'),
			filePath: 'demo-output/03-effect-application/src/main.ts'
		}
	)
	assertOk(result, 'ApplicationMain')
	if (!result.ok) return

	fact('graph nodes', String(result.artifacts !== undefined ? Object.keys(result.artifacts).length : nodes.length))
	fact('semantic check', 'enabled against tsconfig.typecheck.json')
	fact('semantic diagnostics', String(result.diagnostics.length))

	code('generated src/main.ts', result.finalArtifact.code)
	writeOutput(`${id}/src/main.ts`, result.finalArtifact.code)

	console.log('\n--- the same graph with a mistyped service value is rejected, not emitted')
	const brokenNodes: SynthesisNode[] = nodes.map(node =>
		node.id === 'layer'
			? { ...node, inputs: { tag: raw('GreetingService'), service: raw('{ greet: 42 }') } }
			: node
	)
	const broken = compileGraph(
		{ nodes: brokenNodes, finalNodeId: 'main', goal: { outputKind: 'sourceFile' } },
		registry,
		{
			checkSemanticDiagnostics: true,
			tsConfigFilePath: join(projectRoot, 'tsconfig.typecheck.json'),
			filePath: 'demo-output/03-effect-application/src/broken.ts'
		}
	)
	console.log(`  ok=${broken.ok}`)
	for (const diagnostic of broken.diagnostics.slice(0, 3)) {
		console.log(`  ${diagnostic.stage}/${diagnostic.code}: ${diagnostic.message}`)
	}
}
