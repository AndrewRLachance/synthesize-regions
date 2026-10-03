import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { effectV4CanonicalGraphTemplateInputs } from '../src/catalogs/effect-v4.js'
import {
	createDrizzleOrmV1Registry,
	drizzleOrmV1GraphTemplateInputs,
	drizzleOrmV1TemplatePacks
} from '../src/packs/drizzle-orm/v1/index.js'

const expectedPacks = [
	['sql', 45],
	['query', 54],
	['relations', 14],
	['schema', 122],
	['runtime', 12],
	['effect-schema', 6]
] as const

describe('Drizzle ORM v1 catalog', () => {
	it('owns 253 unique templates in six explicit packs', () => {
		expect(drizzleOrmV1TemplatePacks.map((pack) => [pack.id, pack.templates.length])).toEqual(expectedPacks)
		expect(drizzleOrmV1GraphTemplateInputs).toHaveLength(253)
		expect(new Set(drizzleOrmV1GraphTemplateInputs.map((template) => template.modelId)).size).toBe(253)
		expect(drizzleOrmV1GraphTemplateInputs.every((template) => template.version === '1.0.0')).toBe(true)
		expect(createDrizzleOrmV1Registry().list()).toHaveLength(253)
		expect(drizzleOrmV1TemplatePacks.find((pack) => pack.id === 'query')?.templates.map((template) => template.modelId))
			.toEqual(expect.arrayContaining([
				'DrizzleSelectDistinctOn',
				'DrizzleSelectDistinctOnFields',
				'DrizzleDbCount',
				'DrizzleDbCountWhere'
			]))
		expect(drizzleOrmV1TemplatePacks.find((pack) => pack.id === 'runtime')?.templates.map((template) => template.modelId))
			.toEqual(expect.arrayContaining([
				'DrizzleBatch',
				'DrizzleWithReplicas',
				'DrizzleWithReplicasSelector',
				'DrizzleReplicaPrimary',
				'DrizzleReplicaList'
			]))
	})

	it('does not change or collide with the Effect v4 canonical catalog', () => {
		const effectIds = new Set(effectV4CanonicalGraphTemplateInputs.map((template) => template.modelId))
		expect(effectV4CanonicalGraphTemplateInputs).toHaveLength(1794)
		expect(drizzleOrmV1GraphTemplateInputs.filter((template) => effectIds.has(template.modelId))).toEqual([])
	})

	it('agrees with the generated catalog manifest', () => {
		const manifest = JSON.parse(
			readFileSync(new URL('../metadata/drizzle-orm-v1-catalog-manifest.json', import.meta.url), 'utf8')
		) as {
			drizzleOrmVersion: string
			templateVersion: string
			summary: { templates: number; uniqueModelIds: number; countsByPack: Record<string, number> }
			templates: Array<{ modelId: string; manifestDigest: string; pack: string }>
		}
		const live = drizzleOrmV1GraphTemplateInputs
			.map((template) => ({ modelId: template.modelId, manifestDigest: template.manifestDigest }))
			.sort((a, b) => a.modelId.localeCompare(b.modelId))

		expect(manifest.drizzleOrmVersion).toBe('1.0.0-rc.4')
		expect(manifest.templateVersion).toBe('1.0.0')
		expect(manifest.summary).toEqual({
			templates: 253,
			uniqueModelIds: 253,
			countsByPack: Object.fromEntries(expectedPacks)
		})
		expect(manifest.templates.map(({ modelId, manifestDigest }) => ({ modelId, manifestDigest }))).toEqual(live)
		for (const [pack, count] of expectedPacks) {
			expect(manifest.templates.filter((template) => template.pack === pack)).toHaveLength(count)
		}
	})
})
