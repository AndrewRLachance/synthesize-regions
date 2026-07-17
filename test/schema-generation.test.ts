import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	createPublishedSchemaDocuments,
	serializePublishedSchemas
} from '../scripts/generate-schemas.js'

describe('published schema generation', () => {
	it('deep-compares canonical documents with every committed JSON Schema', () => {
		const documents = createPublishedSchemaDocuments()
		const serializedSchemas = serializePublishedSchemas()

		expect(Object.keys(documents).sort()).toEqual([
			'schemas/artifact-set-assembly-result.schema.json',
			'schemas/artifact-set-compilation-result.schema.json',
			'schemas/artifact-set-graph-compilation-result.schema.json',
			'schemas/artifact-set-plan.schema.json',
			'schemas/artifact-set-semantic-validation-result.schema.json',
			'schemas/artifact-set-static-validation-result.schema.json',
			'schemas/constraint-bound-static-acceptance.schema.json',
			'schemas/graph-compilation-result.schema.json',
			'schemas/graph-runner-action.schema.json',
			'schemas/graph-runner-state.schema.json',
			'schemas/supported-json-schema.schema.json',
			'schemas/synthesis-graph.schema.json',
			'schemas/template-manifest.schema.json',
			'schemas/template-summary.schema.json'
		])

		for (const [relativePath, expectedDocument] of Object.entries(documents)) {
			const committed = readFileSync(resolve(relativePath), 'utf8')
			expect(JSON.parse(committed)).toEqual(expectedDocument)
			expect(committed).toBe(serializedSchemas[relativePath])
			expect(committed.endsWith('\n')).toBe(true)
		}
	})
})
