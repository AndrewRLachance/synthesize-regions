import { resetOutput, writtenOutputs } from '../demo/shared.js'
import * as markerEngine from '../demo/01-marker-engine.js'
import * as graphCompilation from '../demo/02-graph-compilation.js'
import * as effectApplication from '../demo/03-effect-application.js'
import * as artifactSetPipeline from '../demo/04-artifact-set-pipeline.js'
import * as catalogInventory from '../demo/05-catalog-inventory.js'

const steps = [
	markerEngine,
	graphCompilation,
	effectApplication,
	artifactSetPipeline,
	catalogInventory
] as const

const requested = process.argv.slice(2)
const selected = requested.length === 0
	? steps
	: steps.filter(step => requested.includes(step.id))

if (selected.length === 0) {
	console.error(`No demo step matched: ${requested.join(', ')}`)
	console.error(`Available steps: ${steps.map(step => step.id).join(', ')}`)
	process.exit(1)
}

resetOutput()

const started = process.hrtime.bigint()
for (const step of selected) {
	step.run()
}
const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000

console.log(`\n${'='.repeat(78)}`)
console.log(`${selected.length} of ${steps.length} steps complete in ${elapsedMs.toFixed(0)}ms`)
console.log(`${writtenOutputs().length} artifacts written under demo-output/:`)
for (const path of writtenOutputs()) {
	console.log(`  demo-output/${path}`)
}
console.log('='.repeat(78))
