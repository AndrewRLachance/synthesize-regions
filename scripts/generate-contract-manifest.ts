import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { SYNTHESIZE_REGIONS_CONTRACT_MANIFEST } from '../src/templates/contractManifest.js'

const outputPath = resolve(import.meta.dirname, '../contract-manifest.json')
const expected = `${JSON.stringify(SYNTHESIZE_REGIONS_CONTRACT_MANIFEST, null, 2)}\n`
if (process.argv.includes('--check')) {
	let actual = ''
	try { actual = readFileSync(outputPath, 'utf8') } catch { /* reported as drift */ }
	if (actual !== expected) throw new Error('contract-manifest.json is stale; run npm run contract-manifest:generate.')
} else {
	const { writeFileSync } = await import('node:fs')
	writeFileSync(outputPath, expected)
}
