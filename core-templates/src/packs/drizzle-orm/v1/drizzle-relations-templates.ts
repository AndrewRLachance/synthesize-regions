import { defineTemplate } from '../../../authoring/define-template.js'
import {
	type AnyDrizzleTemplateDefinitionInput,
	databaseInput,
	drizzleQueryType,
	drizzleRelationsType,
	expressionInput,
	expressionOutput,
	identifierInput,
	marker,
	objectInput,
	typeCodeInput
} from './drizzle-template-helpers.js'

export const DrizzleDefineRelationsTemplate = defineTemplate({
	modelId: 'DrizzleDefineRelations', version: '1.0.0',
	description: 'Defines all Relational Queries v2 relations in one place with defineRelations().',
	inputs: {
		schema: expressionInput('Schema object containing the related tables.'),
		callback: expressionInput('Relations callback receiving the r helper.')
	},
	output: expressionOutput('Drizzle v2 relations object.', drizzleRelationsType()),
	source: `defineRelations(${marker('expression', 'schema', '{}')}, ${marker('expression', 'callback', '(r) => ({})')})`
})

export const DrizzleDefineRelationsPartTemplate = defineTemplate({
	modelId: 'DrizzleDefineRelationsPart', version: '1.0.0',
	description: 'Defines one composable Relational Queries v2 relation part with defineRelationsPart().',
	inputs: {
		schema: expressionInput('Schema object containing the related tables.'),
		callback: expressionInput('Relations callback receiving the r helper.')
	},
	output: expressionOutput('Partial Drizzle v2 relations object.', drizzleRelationsType()),
	source: `defineRelationsPart(${marker('expression', 'schema', '{}')}, ${marker('expression', 'callback', '(r) => ({})')})`
})

export const DrizzleRelationOneTemplate = defineTemplate({
	modelId: 'DrizzleRelationOne', version: '1.0.0',
	description: 'Builds an RQBv2 one relation such as r.one.users({...}).',
	inputs: {
		r: expressionInput('Relations callback helper, conventionally named r.'),
		target: identifierInput('Target table key in the schema.'),
		config: objectInput('Relation config such as from, to, alias, optional, or where.')
	},
	output: expressionOutput('One relation definition.'),
	source: `${marker('expression', 'r', 'r')}.one.${marker('identifier', 'target', 'users')}(${marker('expression', 'config', '{}')})`
})

export const DrizzleRelationOneImplicitTemplate = defineTemplate({
	modelId: 'DrizzleRelationOneImplicit', version: '1.0.0',
	description: 'Builds an inferred RQBv2 one relation without an explicit config object.',
	inputs: { r: expressionInput('Relations callback helper.'), target: identifierInput('Target table key.') },
	output: expressionOutput('One relation definition.'),
	source: `${marker('expression', 'r', 'r')}.one.${marker('identifier', 'target', 'users')}()`
})

export const DrizzleRelationManyTemplate = defineTemplate({
	modelId: 'DrizzleRelationMany', version: '1.0.0',
	description: 'Builds an inferred RQBv2 many relation.',
	inputs: { r: expressionInput('Relations callback helper.'), target: identifierInput('Target table key.') },
	output: expressionOutput('Many relation definition.'),
	source: `${marker('expression', 'r', 'r')}.many.${marker('identifier', 'target', 'posts')}()`
})

export const DrizzleRelationManyConfigTemplate = defineTemplate({
	modelId: 'DrizzleRelationManyConfig', version: '1.0.0',
	description: 'Builds an RQBv2 many relation with explicit from/to, through, alias, or predefined filter configuration.',
	inputs: {
		r: expressionInput('Relations callback helper.'),
		target: identifierInput('Target table key.'),
		config: objectInput('Relation config object.')
	},
	output: expressionOutput('Configured many relation definition.'),
	source: `${marker('expression', 'r', 'r')}.many.${marker('identifier', 'target', 'posts')}(${marker('expression', 'config', '{}')})`
})

export const DrizzleRelationThroughTemplate = defineTemplate({
	modelId: 'DrizzleRelationThrough', version: '1.0.0',
	description: 'Builds an RQBv2 through path for many-to-many relations with column.through(joinColumn).',
	inputs: { column: expressionInput('Endpoint relation column.'), joinColumn: expressionInput('Junction-table column.') },
	output: expressionOutput('Relation through-path expression.'),
	source: `${marker('expression', 'column', 'r.users.id')}.through(${marker('expression', 'joinColumn', 'r.usersToGroups.userId')})`
})

export const DrizzleRqbFindManyTemplate = defineTemplate({
	modelId: 'DrizzleRqbFindMany', version: '1.0.0',
	description: 'Builds a Relational Queries v2 findMany query for a table key.',
	inputs: { db: databaseInput(), table: identifierInput('Schema table key.'), config: objectInput('RQBv2 query config.') },
	output: expressionOutput('RQBv2 findMany query.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.query.${marker('identifier', 'table', 'users')}.findMany(${marker('expression', 'config', '{}')})`
})

export const DrizzleRqbFindFirstTemplate = defineTemplate({
	modelId: 'DrizzleRqbFindFirst', version: '1.0.0',
	description: 'Builds a Relational Queries v2 findFirst query for a table key.',
	inputs: { db: databaseInput(), table: identifierInput('Schema table key.'), config: objectInput('RQBv2 query config.') },
	output: expressionOutput('RQBv2 findFirst query.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.query.${marker('identifier', 'table', 'users')}.findFirst(${marker('expression', 'config', '{}')})`
})

export const DrizzleRqbWhereColumnTemplate = defineTemplate({
	modelId: 'DrizzleRqbWhereColumn', version: '1.0.0',
	description: 'Creates an RQBv2 where object for direct column equality.',
	inputs: { column: identifierInput('Column key.'), value: expressionInput('Compared value.') },
	output: expressionOutput('RQBv2 where object.'),
	source: `{ ${marker('identifier', 'column', 'id')}: ${marker('expression', 'value', '1')} }`
})

export const DrizzleRqbWhereOperatorTemplate = defineTemplate({
	modelId: 'DrizzleRqbWhereOperator', version: '1.0.0',
	description: 'Creates an RQBv2 column-filter object using a named operator such as eq, gt, in, or like.',
	inputs: {
		column: identifierInput('Column key.'),
		operator: identifierInput('RQBv2 filter operator key.'),
		value: expressionInput('Operator value.')
	},
	output: expressionOutput('RQBv2 operator where object.'),
	source: `{ ${marker('identifier', 'column', 'id')}: { ${marker('identifier', 'operator', 'eq')}: ${marker('expression', 'value', '1')} } }`
})

export const DrizzleRqbWithTemplate = defineTemplate({
	modelId: 'DrizzleRqbWith', version: '1.0.0',
	description: 'Creates an RQBv2 with configuration for eager relation loading.',
	inputs: { relations: objectInput('Relation include map.') },
	output: expressionOutput('RQBv2 with config.'),
	source: `{ with: ${marker('expression', 'relations', '{}')} }`
})

export const DrizzleRqbColumnsTemplate = defineTemplate({
	modelId: 'DrizzleRqbColumns', version: '1.0.0',
	description: 'Creates an RQBv2 columns projection config.',
	inputs: { columns: objectInput('Column include/exclude map.') },
	output: expressionOutput('RQBv2 columns config.'),
	source: `{ columns: ${marker('expression', 'columns', '{}')} }`
})

export const DrizzleRqbOrderByTemplate = defineTemplate({
	modelId: 'DrizzleRqbOrderBy', version: '1.0.0',
	description: 'Creates the simplified RQBv2 orderBy object such as { id: "asc" }.',
	inputs: { orderBy: objectInput('Column-to-direction map.') },
	output: expressionOutput('RQBv2 orderBy config.'),
	source: `{ orderBy: ${marker('expression', 'orderBy', '{ id: "asc" }')} }`
})

export const drizzleRelationsGraphTemplateInputs = [
	DrizzleDefineRelationsTemplate,
	DrizzleDefineRelationsPartTemplate,
	DrizzleRelationOneTemplate,
	DrizzleRelationOneImplicitTemplate,
	DrizzleRelationManyTemplate,
	DrizzleRelationManyConfigTemplate,
	DrizzleRelationThroughTemplate,
	DrizzleRqbFindManyTemplate,
	DrizzleRqbFindFirstTemplate,
	DrizzleRqbWhereColumnTemplate,
	DrizzleRqbWhereOperatorTemplate,
	DrizzleRqbWithTemplate,
	DrizzleRqbColumnsTemplate,
	DrizzleRqbOrderByTemplate
] satisfies ReadonlyArray<AnyDrizzleTemplateDefinitionInput>
