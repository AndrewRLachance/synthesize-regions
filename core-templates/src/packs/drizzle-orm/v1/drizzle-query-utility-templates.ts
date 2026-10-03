import { defineTemplate } from '../../../authoring/define-template.js'
import {
	type AnyDrizzleTemplateDefinitionInput,
	arrayInput,
	databaseInput,
	drizzleQueryType,
	expressionInput,
	expressionOutput,
	marker,
	objectInput,
	sqlInput
} from './drizzle-template-helpers.js'

/**
 * Query utility templates that sit at the database entry-point rather than on
 * an already-started query builder.
 *
 * Runtime/import contract:
 *   - selectDistinctOn is PostgreSQL-specific.
 *   - $count is exposed by Drizzle database objects and can be awaited directly
 *     or embedded as a composable count subquery/expression.
 */

export const DrizzleSelectDistinctOnTemplate = defineTemplate({
	modelId: 'DrizzleSelectDistinctOn',
	version: '1.0.0',
	description: 'Starts a PostgreSQL SELECT DISTINCT ON query using one or more columns or SQL expressions to determine uniqueness.',
	inputs: {
		db: databaseInput(),
		on: arrayInput('Non-empty array of PostgreSQL columns or SQL wrapper expressions used by DISTINCT ON.', 1)
	},
	output: expressionOutput('PostgreSQL SELECT DISTINCT ON builder.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.selectDistinctOn(${marker('expression', 'on', '[table.id]')})`
})

export const DrizzleSelectDistinctOnFieldsTemplate = defineTemplate({
	modelId: 'DrizzleSelectDistinctOnFields',
	version: '1.0.0',
	description: 'Starts a PostgreSQL partial SELECT DISTINCT ON query with an explicit selection object.',
	inputs: {
		db: databaseInput(),
		on: arrayInput('Non-empty array of PostgreSQL columns or SQL wrapper expressions used by DISTINCT ON.', 1),
		fields: objectInput('Selection object mapping result keys to columns or SQL expressions.')
	},
	output: expressionOutput('Partial PostgreSQL SELECT DISTINCT ON builder.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.selectDistinctOn(${marker('expression', 'on', '[table.id]')}, ${marker('expression', 'fields', '{}')})`
})

export const DrizzleDbCountTemplate = defineTemplate({
	modelId: 'DrizzleDbCount',
	version: '1.0.0',
	description: 'Counts all rows from a Drizzle table, view, SQL source, or SQL wrapper with db.$count(). The result can be awaited or embedded as a subquery expression.',
	inputs: {
		db: databaseInput(),
		source: expressionInput('Table, view, SQL source, or SQL wrapper to count.')
	},
	output: expressionOutput('Awaitable/composable Drizzle $count expression returning a number.'),
	source: `${marker('expression', 'db', 'db')}.$count(${marker('expression', 'source', 'table')})`
})

export const DrizzleDbCountWhereTemplate = defineTemplate({
	modelId: 'DrizzleDbCountWhere',
	version: '1.0.0',
	description: 'Counts rows matching a SQL filter with db.$count(source, filter). The result can be awaited or embedded as a subquery expression.',
	inputs: {
		db: databaseInput(),
		source: expressionInput('Table, view, SQL source, or SQL wrapper to count.'),
		filter: sqlInput('SQL predicate restricting rows included in the count.')
	},
	output: expressionOutput('Filtered awaitable/composable Drizzle $count expression returning a number.'),
	source: `${marker('expression', 'db', 'db')}.$count(${marker('expression', 'source', 'table')}, ${marker('expression', 'filter', 'sql`true`')})`
})

export const drizzleQueryUtilityGraphTemplateInputs = [
	DrizzleSelectDistinctOnTemplate,
	DrizzleSelectDistinctOnFieldsTemplate,
	DrizzleDbCountTemplate,
	DrizzleDbCountWhereTemplate
] satisfies ReadonlyArray<AnyDrizzleTemplateDefinitionInput>
