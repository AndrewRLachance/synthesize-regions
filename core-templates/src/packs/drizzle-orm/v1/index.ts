import {
	createTemplateRegistry,
	type GraphTemplateDefinition,
	type TemplateRegistry
} from 'synthesize-regions'
import type { AnyDrizzleTemplateDefinitionInput } from './drizzle-template-helpers.js'
import { drizzleSqlGraphTemplateInputs } from './drizzle-sql-templates.js'
import { drizzleQueryGraphTemplateInputs } from './drizzle-query-templates.js'
import { drizzleRelationsGraphTemplateInputs } from './drizzle-relations-templates.js'
import { drizzleSchemaGraphTemplateInputs } from './drizzle-schema-templates.js'
import { drizzleRuntimeGraphTemplateInputs } from './drizzle-runtime-templates.js'
import { drizzleEffectSchemaGraphTemplateInputs } from './drizzle-effect-schema-templates.js'

export * from './drizzle-sql-templates.js'
export * from './drizzle-query-templates.js'
export * from './drizzle-relations-templates.js'
export * from './drizzle-schema-templates.js'
export * from './drizzle-runtime-templates.js'
export * from './drizzle-effect-schema-templates.js'

/** One explicitly owned slice of the Drizzle ORM v1 catalog. */
export interface DrizzleOrmV1TemplatePack {
	readonly id: string
	readonly templates: readonly AnyDrizzleTemplateDefinitionInput[]
}

/** Single source of truth for Drizzle ORM v1 catalog membership and ordering. */
export const drizzleOrmV1TemplatePacks: readonly DrizzleOrmV1TemplatePack[] = [
	{ id: 'sql', templates: drizzleSqlGraphTemplateInputs },
	{ id: 'query', templates: drizzleQueryGraphTemplateInputs },
	{ id: 'relations', templates: drizzleRelationsGraphTemplateInputs },
	{ id: 'schema', templates: drizzleSchemaGraphTemplateInputs },
	{ id: 'runtime', templates: drizzleRuntimeGraphTemplateInputs },
	{ id: 'effect-schema', templates: drizzleEffectSchemaGraphTemplateInputs }
]

const catalog: AnyDrizzleTemplateDefinitionInput[] = []
const owners = new Map<string, string>()

for (const pack of drizzleOrmV1TemplatePacks) {
	for (const template of pack.templates) {
		const owner = owners.get(template.modelId)
		if (owner) throw new Error(`Duplicate Drizzle ORM v1 modelId ${template.modelId} in packs ${owner} and ${pack.id}`)
		owners.set(template.modelId, pack.id)
		catalog.push(template)
	}
}

/** Every Drizzle ORM v1 graph template, exactly once. */
export const drizzleOrmV1GraphTemplateInputs: readonly AnyDrizzleTemplateDefinitionInput[] = catalog

/** Build a validated registry over the complete Drizzle ORM v1 catalog. */
export function createDrizzleOrmV1Registry(): TemplateRegistry {
	return createTemplateRegistry(
		drizzleOrmV1GraphTemplateInputs as readonly GraphTemplateDefinition<any, string, any>[]
	)
}
