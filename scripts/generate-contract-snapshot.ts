import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Minimal package manifest fields needed by contract snapshot generation. */
interface PackageManifest {
	readonly name: string
	readonly version: string
	readonly exports: Readonly<Record<string, unknown>>
}

/** One built declaration module whose identity is bound into the snapshot. */
interface DeclarationSnapshot {
	readonly relativePath: string
	readonly source: string
	readonly hash: string
}

/** One published JSON Schema export recorded by the snapshot. */
interface PublishedSchemaSnapshot {
	readonly subpath: string
	readonly relativePath: string
	readonly id: string
	readonly title: string
	readonly hash: string
}

/** Public identity constants read from the built package entry point. */
interface BuiltContractIdentity {
	readonly SYNTHESIZE_REGIONS_PACKAGE_VERSION: string
	readonly TEMPLATE_CATALOG_CONTRACT_DIGEST_VERSION: number
	readonly TEMPLATE_MANIFEST_DIGEST_VERSION: number
	readonly TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION: number
	readonly TEMPLATE_CATALOG_PLANNER_SCHEMA_VERSION: number
	readonly TEMPLATE_CAPABILITY_CLOSURE_VERSION: number
}

/** Built declaration modules selected by the workflow implementation inventory. */
const DECLARATION_PATHS = [
	'dist/index.d.ts',
	'dist/templates.d.ts',
	'dist/templates/contractIdentity.d.ts',
	'dist/templates/capabilityClosure.d.ts',
	'dist/templates/definition.d.ts',
	'dist/templates/graphCoreTypes.d.ts',
	'dist/templates/registry.d.ts',
	'dist/templates/catalogDigest.d.ts',
	'dist/templates/catalogCapture.d.ts',
	'dist/templates/graph.d.ts',
	'dist/templates/graphPatch.d.ts',
	'dist/templates/graphPatterns.d.ts',
	'dist/templates/graphContracts.d.ts',
	'dist/templates/artifactIntegrity.d.ts',
	'dist/templates/artifactSet.d.ts',
	'dist/templates/sourceSpans.d.ts',
	'dist/templates/runner.d.ts',
	'dist/templates/schemaTypes.d.ts',
	'dist/templates/schemaContract.d.ts',
	'dist/templates/schemaCompatibility.d.ts',
	'dist/templates/typeScriptCompatibility.d.ts',
	'dist/templates/compatibility.d.ts'
] as const

/** Declaration bodies copied verbatim after the identity inventories. */
const COPIED_DECLARATION_PATHS = new Set<string>(DECLARATION_PATHS.filter(path =>
	path !== 'dist/templates/graphContracts.d.ts'
))

/** Location of this repository regardless of the invoking working directory. */
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Canonical generated documentation path. */
const snapshotRelativePath = 'docs/synthesis-workflow-synthesize-regions-contracts.md'

/** Normalize generated and built text so checks are platform-independent. */
function normalizeText(value: string): string {
	return value.replace(/\r\n?/gu, '\n').replace(/\s*$/u, '') + '\n'
}

/** Compute a lowercase SHA-256 identity for normalized UTF-8 text. */
function sha256(value: string): string {
	return createHash('sha256').update(normalizeText(value), 'utf8').digest('hex')
}

/** Escape table delimiters from package-owned JSON metadata. */
function tableCell(value: string): string {
	return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}

/** Parse the one supported optional `--check` command-line flag. */
function parseArguments(): { readonly check: boolean } {
	const arguments_ = process.argv.slice(2)
	if (arguments_.some(argument => argument !== '--check')
		|| arguments_.filter(argument => argument === '--check').length > 1) {
		throw new TypeError('Usage: tsx scripts/generate-contract-snapshot.ts [--check]')
	}
	return { check: arguments_.includes('--check') }
}

/** Read and validate the package manifest used to enumerate public schemas. */
async function readPackageManifest(): Promise<PackageManifest> {
	const parsed = JSON.parse(await readFile(resolve(repositoryRoot, 'package.json'), 'utf8')) as Partial<PackageManifest>
	if (typeof parsed.name !== 'string' || typeof parsed.version !== 'string'
		|| typeof parsed.exports !== 'object' || parsed.exports === null || Array.isArray(parsed.exports)) {
		throw new TypeError('package.json does not contain the expected name, version, and exports contracts.')
	}
	return parsed as PackageManifest
}

/** Load the selected built declaration modules and compute normalized identities. */
async function readDeclarations(): Promise<DeclarationSnapshot[]> {
	return Promise.all(DECLARATION_PATHS.map(async relativePath => {
		let source: string
		try {
			source = normalizeText(await readFile(resolve(repositoryRoot, relativePath), 'utf8'))
		} catch (error) {
			throw new Error(`Built declaration is missing: ${relativePath}. Run npm run build first.`, { cause: error })
		}
		return { relativePath, source, hash: sha256(source) }
	}))
}

/** Resolve a simple JSON export target from package.json. */
function jsonExportTarget(value: unknown, subpath: string): string {
	if (typeof value !== 'string' || !value.startsWith('./schemas/') || !value.endsWith('.json')) {
		throw new TypeError(`Schema export ${subpath} must map directly to one ./schemas/*.json file.`)
	}
	return value.slice(2)
}

/** Load every published JSON Schema named by the package export map. */
async function readPublishedSchemas(manifest: PackageManifest): Promise<PublishedSchemaSnapshot[]> {
	const schemaExports = Object.entries(manifest.exports)
		.filter(([subpath]) => subpath.startsWith('./schemas/') && subpath.endsWith('.json'))
		.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)

	return Promise.all(schemaExports.map(async ([subpath, target]) => {
		const relativePath = jsonExportTarget(target, subpath)
		const source = normalizeText(await readFile(resolve(repositoryRoot, relativePath), 'utf8'))
		const schema = JSON.parse(source) as { readonly $id?: unknown; readonly title?: unknown }
		if (typeof schema.$id !== 'string' || typeof schema.title !== 'string') {
			throw new TypeError(`Published schema ${relativePath} must declare string $id and title properties.`)
		}
		return {
			subpath,
			relativePath,
			id: schema.$id,
			title: schema.title,
			hash: sha256(source)
		}
	}))
}

/** Load the public built module and verify its package-version declaration. */
async function readBuiltIdentity(manifest: PackageManifest): Promise<BuiltContractIdentity> {
	const moduleUrl = pathToFileURL(resolve(repositoryRoot, 'dist/index.js')).href
	const built = await import(moduleUrl) as Partial<BuiltContractIdentity>
	const required = [
		'SYNTHESIZE_REGIONS_PACKAGE_VERSION',
		'TEMPLATE_CATALOG_CONTRACT_DIGEST_VERSION',
		'TEMPLATE_MANIFEST_DIGEST_VERSION',
		'TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION',
		'TEMPLATE_CATALOG_PLANNER_SCHEMA_VERSION',
		'TEMPLATE_CAPABILITY_CLOSURE_VERSION'
	] as const
	for (const name of required) {
		if (typeof built[name] !== (name === 'SYNTHESIZE_REGIONS_PACKAGE_VERSION' ? 'string' : 'number')) {
			throw new TypeError(`Built package does not export ${name}. Run npm run build and check the public barrel.`)
		}
	}
	if (built.SYNTHESIZE_REGIONS_PACKAGE_VERSION !== manifest.version) {
		throw new TypeError(
			`Built package version ${String(built.SYNTHESIZE_REGIONS_PACKAGE_VERSION)} does not match package.json ${manifest.version}.`
		)
	}
	return built as BuiltContractIdentity
}

/** Extract compact public schema and contract-type inventories from TypeBox declarations. */
function graphContractExportNames(source: string): { readonly schemas: string[]; readonly types: string[] } {
	const schemas = [...source.matchAll(/^export declare const (\w+Schema)\b/gmu)].map(match => match[1]!)
	const types = [...source.matchAll(/^export type (Contract\w+)\b/gmu)].map(match => match[1]!)
	return { schemas, types }
}

/** Render the deterministic Markdown contract snapshot. */
function renderSnapshot(
	manifest: PackageManifest,
	identity: BuiltContractIdentity,
	declarations: readonly DeclarationSnapshot[],
	schemas: readonly PublishedSchemaSnapshot[]
): string {
	const graphContracts = declarations.find(declaration =>
		declaration.relativePath === 'dist/templates/graphContracts.d.ts'
	)
	if (!graphContracts) throw new Error('Graph contract declarations were not loaded.')
	const contractExports = graphContractExportNames(graphContracts.source)
	const lines: string[] = [
		'# Generated synthesize-regions Contracts for the Synthesis Workflow',
		'',
		'> Generated by `npm run contracts:generate`. Do not edit this file manually.',
		'> `npm run contracts:check` rebuilds the package and detects declaration, schema, or inventory drift.',
		'',
		`**Snapshot package:** \`${manifest.name}@${manifest.version}\``,
		'',
		'This package-owned snapshot records the built public declaration modules selected by the',
		'Synthesis Workflow implementation inventory and every published JSON Schema export. The',
		'implementation inventory remains the runtime allowlist; inclusion here does not grant a',
		'model, request, or worker additional authority.',
		'',
		'## Contract identity',
		'',
		'| Contract | Version | Wire identity |',
		'| --- | ---: | --- |',
		`| Package | \`${identity.SYNTHESIZE_REGIONS_PACKAGE_VERSION}\` | npm package |`,
		`| Catalog contract | \`${identity.TEMPLATE_CATALOG_CONTRACT_DIGEST_VERSION}\` | \`c${identity.TEMPLATE_CATALOG_CONTRACT_DIGEST_VERSION}_<sha256>\` |`,
		`| Template manifest | \`${identity.TEMPLATE_MANIFEST_DIGEST_VERSION}\` | \`t${identity.TEMPLATE_MANIFEST_DIGEST_VERSION}_<sha256>\` |`,
		`| Catalog manifest | \`${identity.TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION}\` | \`m${identity.TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION}_<sha256>\` |`,
		`| Catalog planner schema | \`${identity.TEMPLATE_CATALOG_PLANNER_SCHEMA_VERSION}\` | Bound into the catalog-contract digest |`,
		`| Capability closure | \`${identity.TEMPLATE_CAPABILITY_CLOSURE_VERSION}\` | Bound into the catalog-contract digest |`,
		'',
		'## Built declaration inventory',
		'',
		'Hashes cover normalized UTF-8 declaration text. The large TypeBox declaration module is',
		'identified here and summarized below instead of being expanded into thousands of generated',
		'conditional-type lines.',
		'',
		'| Built declaration | SHA-256 |',
		'| --- | --- |',
		...declarations.map(declaration =>
			`| \`${declaration.relativePath}\` | \`${declaration.hash}\` |`
		),
		'',
		'## TypeBox contract export inventory',
		'',
		'Generated from `dist/templates/graphContracts.d.ts`. Exact wire shapes are represented by',
		'the published schema hashes below and by package runtime validation.',
		'',
		'### Schema values',
		'',
		contractExports.schemas.map(name => `\`${name}\``).join(', ') + '.',
		'',
		'### Static contract aliases',
		'',
		contractExports.types.map(name => `\`${name}\``).join(', ') + '.',
		'',
		'## Published JSON Schema inventory',
		'',
		'| Package subpath | Package target | Schema title | `$id` | SHA-256 |',
		'| --- | --- | --- | --- | --- |',
		...schemas.map(schema =>
			`| \`${schema.subpath}\` | \`${schema.relativePath}\` | ${tableCell(schema.title)} | \`${tableCell(schema.id)}\` | \`${schema.hash}\` |`
		),
		'',
		'## Selected built declaration bodies',
		'',
		'These are copied verbatim from `dist` after a successful TypeScript build.',
		''
	]

	for (const declaration of declarations) {
		if (!COPIED_DECLARATION_PATHS.has(declaration.relativePath)) continue
		lines.push(
			`### \`${declaration.relativePath}\``,
			'',
			'```ts',
			declaration.source.trimEnd(),
			'```',
			''
		)
	}
	return normalizeText(lines.join('\n'))
}

/** Generate or verify the package-owned workflow contract snapshot. */
async function main(): Promise<void> {
	const { check } = parseArguments()
	const manifest = await readPackageManifest()
	const [identity, declarations, schemas] = await Promise.all([
		readBuiltIdentity(manifest),
		readDeclarations(),
		readPublishedSchemas(manifest)
	])
	const expected = renderSnapshot(manifest, identity, declarations, schemas)
	const outputPath = resolve(repositoryRoot, snapshotRelativePath)
	if (check) {
		let actual: string | undefined
		try {
			actual = await readFile(outputPath, 'utf8')
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
		}
		if (actual !== expected) {
			console.error(`Contract snapshot is missing or stale: ${snapshotRelativePath}`)
			console.error('Run `npm run contracts:generate` to update it.')
			process.exitCode = 1
			return
		}
		console.log('Synthesis Workflow contract snapshot is up to date.')
		return
	}

	await mkdir(dirname(outputPath), { recursive: true })
	await writeFile(outputPath, expected, 'utf8')
	console.log(`Wrote ${snapshotRelativePath}`)
}

await main()
