import { generateWithReplacements, type ReplacementMap } from '../src/index.js'
import { block, code, coreRegistry, fact, step, writeOutput } from './shared.js'

export const id = '01-marker-engine'
export const title = 'Layer 1 - the marker replacement engine'

export function run(): void {
	step(
		title,
		'A template is ordinary TypeScript with paired @TYPE/@END comments. The engine\n' +
		'discovers those regions, validates each replacement against the AST context it\n' +
		'sits in, and re-parses the result. There is no macro expansion, no import\n' +
		'inference, and no arbitrary AST rewriting.'
	)

	const registry = coreRegistry()
	const layerSucceed = registry.get('LayerSucceed')
	const effectGenBind = registry.get('EffectGenBind')
	if (layerSucceed === undefined || effectGenBind === undefined) {
		throw new Error('Catalog is missing a template required by this step')
	}

	block('marked template source, read straight from the catalog', layerSucceed.source)
	fact('modelId', layerSucceed.modelId)
	fact('version', layerSucceed.version ?? '(none)')
	fact('manifestDigest', layerSucceed.manifestDigest)
	fact('input ports', Object.keys(layerSucceed.inputs).join(', '))
	fact('output kind', layerSucceed.output.kind)

	const replacements: ReplacementMap = {
		tag: { kind: 'expression', code: 'GreetingService' },
		service: { kind: 'expression', code: '{ greet: (name) => `Hello, ${name}!` }' }
	}
	const result = generateWithReplacements(layerSucceed.source, replacements, { format: 'ts-morph' })

	block('regions discovered in that source', [
		'id        kind        arity   body range   how the kind was resolved',
		...result.regions.map(region => [
			region.id.padEnd(9),
			String(region.effectiveType).padEnd(11),
			region.arity.padEnd(7),
			`${region.bodyStart}-${region.bodyEnd}`.padEnd(12),
			region.explicitType === undefined
				? `inferred as ${String(region.inferredType)}`
				: `declared as ${region.explicitType}`
		].join(' '))
	].join('\n'))

	code('generated code, with both marker comments removed', result.code)
	fact('syntactic diagnostics', String(result.diagnostics.syntactic.length))
	fact('semantic diagnostics', String(result.diagnostics.semantic?.length ?? 0))

	const written = writeOutput(`${id}/layer-succeed.ts`, result.code)
	console.log(`  wrote ${written}`)

	console.log('\n--- every region is checked, so bad input fails loudly')
	const rejected: ReadonlyArray<readonly [string, ReplacementMap]> = [
		['kind mismatch', { name: { kind: 'expression', code: 'parsed' }, source: { kind: 'expression', code: 'Effect.void' } }],
		['invalid syntax', { name: { kind: 'identifier', name: 'parsed' }, source: { kind: 'expression', code: '= = =' } }],
		['missing input', { name: { kind: 'identifier', name: 'parsed' } }]
	]
	for (const [label, rejectedMap] of rejected) {
		try {
			generateWithReplacements(effectGenBind.source, rejectedMap)
			console.log(`  ${label.padEnd(16)} UNEXPECTEDLY ACCEPTED`)
		} catch (error) {
			console.log(`  ${label.padEnd(16)} ${(error as Error).name}: ${(error as Error).message}`)
		}
	}
}
