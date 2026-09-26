import { coreTemplateFamilies, coreTemplateManifests } from '../core-templates/catalog.js'
import { block, code, coreRegistry, fact, step, tableHeader, writeOutput, row } from './shared.js'

export const id = '05-catalog-inventory'
export const title = 'Layer 5 - the curated catalog itself'

export function run(): void {
	step(
		title,
		'Everything above was drawn from one validated catalog. This walks it: 17\n' +
		'families, their module of origin, how many models each contributes, and the\n' +
		'full port contract of a single template.'
	)

	const registry = coreRegistry()
	const definitions = registry.list()
	const totals = coreTemplateFamilies.map(({ family, module, templates }) => ({
		family,
		module,
		count: templates.length,
		outputKinds: new Set(templates.map(template => template.output.kind)).size
	}))

	fact('families', String(coreTemplateFamilies.length))
	fact('models', String(definitions.length))
	fact('unique modelIds', String(new Set(definitions.map(definition => definition.modelId)).size))
	fact('contractDigest', registry.contractDigest)
	fact('manifestDigest', registry.manifestDigest)

	const byOutputKind = new Map<string, number>()
	for (const definition of definitions) {
		byOutputKind.set(definition.output.kind, (byOutputKind.get(definition.output.kind) ?? 0) + 1)
	}

	const widths = [18, 46, 9, 8]
	console.log('')
	console.log(`  ${tableHeader(['FAMILY', 'MODULE', 'MODELS', 'OUTPUTS'], widths)}`)
	console.log(`  ${'-'.repeat(widths.reduce((sum, width) => sum + width, 0) + 6)}`)
	for (const entry of totals) {
		console.log(`  ${row([entry.family, entry.module, String(entry.count), String(entry.outputKinds)], widths)}`)
	}
	console.log(`  ${row(['TOTAL', '', String(definitions.length), String(byOutputKind.size)], widths)}`)
	block('output fragment kinds across the catalog', [
		... [...byOutputKind.entries()].sort((left, right) => right[1] - left[1])
			.map(([kind, count]) => `${kind.padEnd(14)} ${count}`)
	].join('\n'))

	const generic = definitions.filter(definition => definition.typeParameters !== undefined)
	const callable = definitions.filter(definition => definition.callableScope !== undefined)
	fact('generic templates', `${generic.length} of ${definitions.length}`)
	fact('callable templates', `${callable.length} of ${definitions.length}`)

	const sample = registry.get('ResilientClientCall')
	if (sample === undefined) throw new Error('ResilientClientCall is missing from the curated catalog')
	type SamplePort = { kind: string; regionKind?: string }
	const sampleInputs = sample.inputs as Readonly<Record<string, SamplePort>>
	block('one template in full - ResilientClientCall', JSON.stringify({
		modelId: sample.modelId,
		version: sample.version,
		description: sample.description,
		typeParameters: Object.keys(sample.typeParameters ?? {}),
		inputs: Object.keys(sampleInputs).map(name => ({
			name,
			port: sampleInputs[name]?.kind,
			regionKind: sampleInputs[name]?.regionKind
		})),
		output: { kind: sample.output.kind, type: sample.output.type?.ts },
		manifestDigest: sample.manifestDigest
	}, null, 2))
	code('its marked source', sample.source)

	const manifests = coreTemplateManifests(registry)
	const written = writeOutput(`${id}/catalog.json`, JSON.stringify(manifests, null, 2))
	fact('exported manifests', `${manifests.length} to ${written}`)
}
