import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { canonicalizeJson } from './artifactIdentity.js'
import { compareCodeUnits } from './deterministic.js'

const require = createRequire(import.meta.url)

interface PackageIdentity {
	readonly version: string
	readonly packageJsonHash: string
}

export interface SynthesizeRegionsContractManifest {
	readonly schemaVersion: 1
	readonly packageName: 'synthesize-regions'
	readonly packageVersion: '0.3.0'
	readonly semanticDependencies: Readonly<{
		typescript: PackageIdentity
		tsMorph: PackageIdentity
		ajv: PackageIdentity
		typebox: PackageIdentity
	}>
	readonly trustedTypeScriptLibraries: readonly Readonly<{
		name: string
		contentHash: string
	}>[]
	readonly contractManifestDigest: string
}

function sha256(value: string | Uint8Array): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function packageRoot(packageName: string): string {
	let current = dirname(require.resolve(packageName))
	for (;;) {
		const candidate = join(current, 'package.json')
		if (existsSync(candidate)) {
			try {
				const value = JSON.parse(readFileSync(candidate, 'utf8')) as { name?: string }
				if (value.name === packageName) return current
			} catch { /* keep walking */ }
		}
		const parent = dirname(current)
		if (parent === current) throw new Error(`Cannot locate package root for ${packageName}.`)
		current = parent
	}
}

function packageIdentity(packageName: string): PackageIdentity {
	const packageJson = readFileSync(join(packageRoot(packageName), 'package.json'))
	const value = JSON.parse(packageJson.toString('utf8')) as { version?: unknown }
	if (typeof value.version !== 'string' || value.version.length === 0) {
		throw new Error(`Package ${packageName} does not publish a version.`)
	}
	return Object.freeze({ version: value.version, packageJsonHash: sha256(packageJson) })
}

function trustedLibraries(): readonly Readonly<{ name: string; contentHash: string }>[] {
	const directory = join(packageRoot('typescript'), 'lib')
	return Object.freeze(readdirSync(directory)
		.filter(name => /^lib(?:\..+)?\.d\.ts$/u.test(name))
		.sort(compareCodeUnits)
		.map(name => Object.freeze({ name, contentHash: sha256(readFileSync(join(directory, name))) })))
}

const payload = Object.freeze({
	schemaVersion: 1 as const,
	packageName: 'synthesize-regions' as const,
	packageVersion: '0.3.0' as const,
	semanticDependencies: Object.freeze({
		typescript: packageIdentity('typescript'),
		tsMorph: packageIdentity('ts-morph'),
		ajv: packageIdentity('ajv'),
		typebox: packageIdentity('@sinclair/typebox')
	}),
	trustedTypeScriptLibraries: trustedLibraries()
})

/** Exact packed dependency/toolchain identity bound into c6 and t3 digests. */
export const SYNTHESIZE_REGIONS_CONTRACT_MANIFEST: SynthesizeRegionsContractManifest = Object.freeze({
	...payload,
	contractManifestDigest: `scm1_${createHash('sha256').update(canonicalizeJson(payload), 'utf8').digest('hex')}`
})

export const SYNTHESIZE_REGIONS_TOOLCHAIN_IDENTITY =
	SYNTHESIZE_REGIONS_CONTRACT_MANIFEST.contractManifestDigest
