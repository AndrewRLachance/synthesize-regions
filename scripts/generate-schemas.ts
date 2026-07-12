import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { TSchema } from '@sinclair/typebox'
import {
	GraphCompilationResultSchema,
	SynthesisGraphSchema,
	TemplateSummarySchema
} from '../src/templates/graphContracts.js'

const draft202012 = 'https://json-schema.org/draft/2020-12/schema'
const schemaBaseUrl = 'https://schemas.synthesize-regions.dev'
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

interface PublishedSchema {
	readonly fileName: string
	readonly title: string
	readonly description: string
	readonly schema: TSchema
}

const publishedSchemas: readonly PublishedSchema[] = [
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
	}
]

const createDocument = ({ fileName, title, description, schema }: PublishedSchema): Record<string, unknown> => {
	const {
		$schema: _schema,
		$id: _id,
		title: _title,
		description: _description,
		...body
	} = schema as Record<string, unknown>

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
