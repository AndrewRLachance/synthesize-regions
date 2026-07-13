import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { TSchema } from '@sinclair/typebox'
import {
	GraphCompilationResultSchema,
	GraphRunnerActionSchema,
	GraphRunnerStateSchema,
	SynthesisGraphSchema,
	TemplateSummarySchema
} from '../src/templates/graphContracts.js'
import { SupportedJsonSchemaSchema } from '../src/templates/schemaContract.js'

const draft202012 = 'https://json-schema.org/draft/2020-12/schema'
const schemaBaseUrl = 'https://schemas.synthesize-regions.dev'
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

interface PublishedSchema {
	readonly fileName: string
	readonly title: string
	readonly description: string
	readonly schema: TSchema
}

type JsonRecord = Record<string, unknown>

const publishedSchemas: readonly PublishedSchema[] = [
	{
		fileName: 'supported-json-schema.schema.json',
		title: 'synthesize-regions SupportedJsonSchema',
		description: 'Closed, local-reference-only Draft 2020-12 profile used by synthesize-regions value and compatibility contracts.',
		schema: SupportedJsonSchemaSchema
	},
	{
		fileName: 'synthesis-graph.schema.json',
		title: 'synthesize-regions SynthesisGraph',
		description: 'Structural JSON Schema for SynthesisGraph values. Template existence, port compatibility, graph cycles, literal schemas, raw-code policies, and final output validation are enforced by the synthesize-regions API.',
		schema: SynthesisGraphSchema
	},
	{
		fileName: 'template-summary.schema.json',
		title: 'synthesize-regions TemplateSummary',
		description: 'Structural JSON Schema for TemplateSummary values returned by graph template registries. It describes public planner-facing metadata and intentionally excludes template implementation source.',
		schema: TemplateSummarySchema
	},
	{
		fileName: 'graph-compilation-result.schema.json',
		title: 'synthesize-regions GraphCompilationResult',
		description: 'Structural JSON Schema for strict and partial graph compilation results, including generated artifacts, unresolved inputs, and structured diagnostics.',
		schema: GraphCompilationResultSchema
	},
	{
		fileName: 'graph-runner-action.schema.json',
		title: 'synthesize-regions GraphRunnerAction',
		description: 'Structural JSON Schema for transactional graph patch actions, complete graph replacements, and partial-artifact fill actions accepted by GraphRunner.',
		schema: GraphRunnerActionSchema
	},
	{
		fileName: 'graph-runner-state.schema.json',
		title: 'synthesize-regions GraphRunnerState',
		description: 'Structural JSON Schema for GraphRunner transition outputs, including repair classifications, graph compilation failures, and generated artifacts.',
		schema: GraphRunnerStateSchema
	}
]

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function walkJson(value: unknown, visit: (record: JsonRecord) => void): void {
	if (Array.isArray(value)) {
		for (const item of value) walkJson(item, visit)
		return
	}
	if (!isRecord(value)) return
	visit(value)
	for (const child of Object.values(value)) walkJson(child, visit)
}

/**
 * TypeBox modules import every module definition and use relative `$id` refs.
 * Published documents retain only reachable definitions and rewrite those refs
 * to document-local JSON pointers so several package schemas can be loaded into
 * one Ajv instance without duplicate identifier collisions.
 */
function localizeModuleDefinitions(schema: JsonRecord): JsonRecord {
	const definitions = isRecord(schema.$defs) ? schema.$defs : undefined
	if (!definitions) return schema

	const reachable = new Set<string>()
	const pending: string[] = []
	const rootWithoutDefinitions = { ...schema }
	delete rootWithoutDefinitions.$defs
	walkJson(rootWithoutDefinitions, record => {
		if (typeof record.$ref === 'string' && record.$ref in definitions) pending.push(record.$ref)
	})

	while (pending.length > 0) {
		const name = pending.pop()!
		if (reachable.has(name)) continue
		reachable.add(name)
		walkJson(definitions[name], record => {
			if (typeof record.$ref === 'string' && record.$ref in definitions) pending.push(record.$ref)
		})
	}

	const localizedDefinitions: JsonRecord = {}
	for (const [name, definition] of Object.entries(definitions)) {
		if (reachable.has(name)) localizedDefinitions[name] = definition
	}
	const localized = { ...rootWithoutDefinitions, $defs: localizedDefinitions }
	walkJson(localized, record => {
		if (typeof record.$ref === 'string' && record.$ref in definitions) {
			record.$ref = `#/$defs/${record.$ref.replaceAll('~', '~0').replaceAll('/', '~1')}`
		}
		if ('$id' in record) delete record.$id
	})
	return localized
}

const createDocument = ({ fileName, title, description, schema }: PublishedSchema): Record<string, unknown> => {
	const {
		$schema: _schema,
		$id: _id,
		title: _title,
		description: _description,
		...rawBody
	} = schema as Record<string, unknown>
	const body = localizeModuleDefinitions(JSON.parse(JSON.stringify(rawBody)) as JsonRecord)

	const document = {
		$schema: draft202012,
		$id: `${schemaBaseUrl}/${fileName}`,
		title,
		description,
		...body
	}

	// TypeBox annotates schemas with symbol metadata. Round-tripping here makes
	// this API return the same plain JSON data that is written and published.
	return JSON.parse(JSON.stringify(document)) as Record<string, unknown>
}

const serialize = (schema: PublishedSchema): string =>
	`${JSON.stringify(createDocument(schema), null, 2)}\n`

/** Build the canonical documents without reading or writing the filesystem. */
export const createPublishedSchemaDocuments = (): Readonly<Record<string, Record<string, unknown>>> =>
	Object.fromEntries(publishedSchemas.map(schema => [
		`schemas/${schema.fileName}`,
		createDocument(schema)
	]))

/** Serialize the canonical documents exactly as they are committed and packed. */
export const serializePublishedSchemas = (): Readonly<Record<string, string>> =>
	Object.fromEntries(publishedSchemas.map(schema => [
		`schemas/${schema.fileName}`,
		serialize(schema)
	]))

const parseArguments = (): { readonly check: boolean } => {
	const arguments_ = process.argv.slice(2)
	const unsupported = arguments_.filter(argument => argument !== '--check')
	if (unsupported.length > 0 || arguments_.filter(argument => argument === '--check').length > 1) {
		console.error('Usage: tsx scripts/generate-schemas.ts [--check]')
		process.exitCode = 2
		return { check: false }
	}
	return { check: arguments_.includes('--check') }
}

const checkSchemas = async (): Promise<boolean> => {
	const staleFiles: string[] = []

	for (const schema of publishedSchemas) {
		const relativePath = `schemas/${schema.fileName}`
		const outputPath = resolve(repositoryRoot, relativePath)
		let actual: string | undefined
		try {
			actual = await readFile(outputPath, 'utf8')
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
		}

		if (actual !== serialize(schema)) staleFiles.push(relativePath)
	}

	if (staleFiles.length === 0) {
		console.log('Published schemas are up to date.')
		return true
	}

	for (const file of staleFiles) console.error(`Schema is missing or stale: ${file}`)
	console.error('Run `npm run schemas:generate` to update published schemas.')
	return false
}

const writeSchemas = async (): Promise<void> => {
	const outputDirectory = resolve(repositoryRoot, 'schemas')
	await mkdir(outputDirectory, { recursive: true })

	for (const schema of publishedSchemas) {
		const relativePath = `schemas/${schema.fileName}`
		await writeFile(resolve(repositoryRoot, relativePath), serialize(schema), 'utf8')
		console.log(`Wrote ${relativePath}`)
	}
}

const main = async (): Promise<void> => {
	const { check } = parseArguments()
	if (process.exitCode !== undefined) return

	if (check) {
		if (!await checkSchemas()) process.exitCode = 1
		return
	}

	await writeSchemas()
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main()
}
