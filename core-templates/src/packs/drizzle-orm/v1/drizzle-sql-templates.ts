import { defineTemplate } from '../../../authoring/define-template.js'
import {
	type AnyDrizzleTemplateDefinitionInput,
	arrayInput,
	columnInput,
	expressionInput,
	expressionOutput,
	statementOutput,
	marker,
	sqlInput,
	stringInput,
	typeCodeInput,
	drizzleSqlType
} from './drizzle-template-helpers.js'

const binaryOperator = (modelId: string, fn: string, description: string) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	inputs: {
		left: expressionInput('Left operand.'),
		right: expressionInput('Right operand.')
	},
	output: expressionOutput('Drizzle SQL boolean expression.', drizzleSqlType('boolean')),
	source: `${fn}(${marker('expression', 'left', 'undefined')}, ${marker('expression', 'right', 'undefined')})`
})

const unaryOperator = (modelId: string, fn: string, description: string) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	inputs: { value: expressionInput('Operand expression.') },
	output: expressionOutput('Drizzle SQL boolean expression.', drizzleSqlType('boolean')),
	source: `${fn}(${marker('expression', 'value', 'undefined')})`
})

const aggregate = (modelId: string, fn: string, resultType: string, description: string) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	inputs: { value: expressionInput('Aggregate input expression.') },
	output: expressionOutput('Aggregate SQL expression.', drizzleSqlType(resultType)),
	source: `${fn}(${marker('expression', 'value', 'undefined')})`
})

export const DrizzleSqlRawTemplate = defineTemplate({
	modelId: 'DrizzleSqlRaw', version: '1.0.0',
	description: 'Creates an unescaped SQL fragment with sql.raw(). Use only for trusted SQL text.',
	inputs: { text: stringInput('Trusted raw SQL text.') },
	output: expressionOutput('Raw SQL fragment.', drizzleSqlType()),
	source: `sql.raw(${marker('string', 'text', '"select 1"')})`
})

export const DrizzleSqlEmptyTemplate = defineTemplate({
	modelId: 'DrizzleSqlEmpty', version: '1.0.0',
	description: 'Creates an empty mutable SQL fragment with sql.empty().',
	inputs: {},
	output: expressionOutput('Empty SQL fragment.', drizzleSqlType()),
	source: 'sql.empty()'
})

export const DrizzleSqlFromListTemplate = defineTemplate({
	modelId: 'DrizzleSqlFromList', version: '1.0.0',
	description: 'Combines an array of SQL chunks with sql.fromList().',
	inputs: { chunks: arrayInput('Array of SQL chunks.') },
	output: expressionOutput('Combined SQL fragment.', drizzleSqlType()),
	source: `sql.fromList(${marker('expression', 'chunks', '[]')})`
})

export const DrizzleSqlJoinTemplate = defineTemplate({
	modelId: 'DrizzleSqlJoin', version: '1.0.0',
	description: 'Joins SQL chunks with a SQL separator.',
	inputs: { chunks: arrayInput('Array of SQL chunks.'), separator: sqlInput('SQL separator.') },
	output: expressionOutput('Joined SQL fragment.', drizzleSqlType()),
	source: `sql.join(${marker('expression', 'chunks', '[]')}, ${marker('expression', 'separator', 'sql.raw(", ")')})`
})

export const DrizzleSqlAppendTemplate = defineTemplate({
	modelId: 'DrizzleSqlAppend', version: '1.0.0',
	description: 'Appends one SQL fragment to another with SQL.append().',
	inputs: { source: sqlInput('SQL fragment to mutate.'), chunk: sqlInput('SQL chunk to append.') },
	output: statementOutput('SQL.append mutation statement.'),
	source: `${marker('expression', 'source', 'sql.empty()')}.append(${marker('expression', 'chunk', 'sql.empty()')})`
})

export const DrizzleSqlPlaceholderTemplate = defineTemplate({
	modelId: 'DrizzleSqlPlaceholder', version: '1.0.0',
	description: 'Creates a named prepared-query placeholder with sql.placeholder().',
	inputs: { name: stringInput('Placeholder name.') },
	output: expressionOutput('Prepared-query placeholder SQL expression.', drizzleSqlType()),
	source: `sql.placeholder(${marker('string', 'name', '"value"')})`
})

export const DrizzleSqlAsTemplate = defineTemplate({
	modelId: 'DrizzleSqlAs', version: '1.0.0',
	description: 'Assigns an SQL field alias with .as().',
	inputs: { source: sqlInput('SQL expression to alias.'), alias: stringInput('SQL field alias.') },
	output: expressionOutput('Aliased SQL expression.', drizzleSqlType()),
	source: `${marker('expression', 'source', 'sql.raw("1")')}.as(${marker('string', 'alias', '"value"')})`
})

export const DrizzleSqlMapWithTemplate = defineTemplate({
	modelId: 'DrizzleSqlMapWith', version: '1.0.0',
	description: 'Maps a selected SQL expression through a Drizzle decoder or column with .mapWith().',
	inputs: { source: sqlInput('SQL expression to map.'), decoder: expressionInput('Driver value decoder or column.') },
	output: expressionOutput('Mapped SQL expression.', drizzleSqlType()),
	source: `${marker('expression', 'source', 'sql.raw("1")')}.mapWith(${marker('expression', 'decoder', 'String')})`
})

export const DrizzleSqlTypedTemplate = defineTemplate({
	modelId: 'DrizzleSqlTyped', version: '1.0.0',
	description: 'Applies a TypeScript result type to an existing SQL expression.',
	inputs: { source: sqlInput('SQL expression.'), resultType: typeCodeInput('Expected SQL result type.') },
	output: expressionOutput('Type-refined SQL expression.', drizzleSqlType()),
	source: `${marker('expression', 'source', 'sql.raw("1")')} as SQL<${marker('type', 'resultType', 'unknown')}>`
})

export const DrizzleGetColumnsTemplate = defineTemplate({
	modelId: 'DrizzleGetColumns', version: '1.0.0',
	description: 'Gets a table column map with the v1 getColumns() API.',
	inputs: { table: expressionInput('Drizzle table.') },
	output: expressionOutput('Table column map.'),
	source: `getColumns(${marker('expression', 'table', 'undefined')})`
})

export const DrizzleAliasTemplate = defineTemplate({
	modelId: 'DrizzleAlias', version: '1.0.0',
	description: 'Creates an aliased table or view with alias().',
	inputs: { source: expressionInput('Table or view to alias.'), alias: stringInput('Alias name.') },
	output: expressionOutput('Aliased table or view.'),
	source: `alias(${marker('expression', 'source', 'undefined')}, ${marker('string', 'alias', '"t"')})`
})

export const DrizzleEqTemplate = binaryOperator('DrizzleEq', 'eq', 'Tests equality.')
export const DrizzleNeTemplate = binaryOperator('DrizzleNe', 'ne', 'Tests inequality.')
export const DrizzleGtTemplate = binaryOperator('DrizzleGt', 'gt', 'Tests greater-than.')
export const DrizzleGteTemplate = binaryOperator('DrizzleGte', 'gte', 'Tests greater-than-or-equal.')
export const DrizzleLtTemplate = binaryOperator('DrizzleLt', 'lt', 'Tests less-than.')
export const DrizzleLteTemplate = binaryOperator('DrizzleLte', 'lte', 'Tests less-than-or-equal.')
export const DrizzleLikeTemplate = binaryOperator('DrizzleLike', 'like', 'Tests SQL LIKE.')
export const DrizzleNotLikeTemplate = binaryOperator('DrizzleNotLike', 'notLike', 'Tests SQL NOT LIKE.')
export const DrizzleIlikeTemplate = binaryOperator('DrizzleIlike', 'ilike', 'Tests case-insensitive ILIKE where supported.')
export const DrizzleNotIlikeTemplate = binaryOperator('DrizzleNotIlike', 'notIlike', 'Tests NOT ILIKE where supported.')
export const DrizzleArrayContainsTemplate = binaryOperator('DrizzleArrayContains', 'arrayContains', 'Tests that an array contains all supplied elements.')
export const DrizzleArrayContainedTemplate = binaryOperator('DrizzleArrayContained', 'arrayContained', 'Tests that an array is contained by the supplied array.')
export const DrizzleArrayOverlapsTemplate = binaryOperator('DrizzleArrayOverlaps', 'arrayOverlaps', 'Tests that arrays overlap.')
export const DrizzleIsNullTemplate = unaryOperator('DrizzleIsNull', 'isNull', 'Tests IS NULL.')
export const DrizzleIsNotNullTemplate = unaryOperator('DrizzleIsNotNull', 'isNotNull', 'Tests IS NOT NULL.')
export const DrizzleExistsTemplate = unaryOperator('DrizzleExists', 'exists', 'Tests EXISTS for a subquery.')
export const DrizzleNotExistsTemplate = unaryOperator('DrizzleNotExists', 'notExists', 'Tests NOT EXISTS for a subquery.')
export const DrizzleNotTemplate = unaryOperator('DrizzleNot', 'not', 'Negates a SQL condition.')
export const DrizzleAscTemplate = unaryOperator('DrizzleAsc', 'asc', 'Orders an expression ascending.')
export const DrizzleDescTemplate = unaryOperator('DrizzleDesc', 'desc', 'Orders an expression descending.')

export const DrizzleBetweenTemplate = defineTemplate({
	modelId: 'DrizzleBetween', version: '1.0.0', description: 'Tests whether a value is between lower and upper bounds.',
	inputs: { value: expressionInput('Value expression.'), lower: expressionInput('Lower bound.'), upper: expressionInput('Upper bound.') },
	output: expressionOutput('BETWEEN SQL condition.', drizzleSqlType('boolean')),
	source: `between(${marker('expression', 'value', 'undefined')}, ${marker('expression', 'lower', 'undefined')}, ${marker('expression', 'upper', 'undefined')})`
})
export const DrizzleNotBetweenTemplate = defineTemplate({
	modelId: 'DrizzleNotBetween', version: '1.0.0', description: 'Tests whether a value is outside lower and upper bounds.',
	inputs: { value: expressionInput('Value expression.'), lower: expressionInput('Lower bound.'), upper: expressionInput('Upper bound.') },
	output: expressionOutput('NOT BETWEEN SQL condition.', drizzleSqlType('boolean')),
	source: `notBetween(${marker('expression', 'value', 'undefined')}, ${marker('expression', 'lower', 'undefined')}, ${marker('expression', 'upper', 'undefined')})`
})
export const DrizzleInArrayTemplate = defineTemplate({
	modelId: 'DrizzleInArray', version: '1.0.0', description: 'Tests membership in an array or single-column subquery.',
	inputs: { value: expressionInput('Value expression.'), values: expressionInput('Array or subquery expression.') },
	output: expressionOutput('IN SQL condition.', drizzleSqlType('boolean')),
	source: `inArray(${marker('expression', 'value', 'undefined')}, ${marker('expression', 'values', '[]')})`
})
export const DrizzleNotInArrayTemplate = defineTemplate({
	modelId: 'DrizzleNotInArray', version: '1.0.0', description: 'Tests non-membership in an array or single-column subquery.',
	inputs: { value: expressionInput('Value expression.'), values: expressionInput('Array or subquery expression.') },
	output: expressionOutput('NOT IN SQL condition.', drizzleSqlType('boolean')),
	source: `notInArray(${marker('expression', 'value', 'undefined')}, ${marker('expression', 'values', '[]')})`
})
export const DrizzleAndTemplate = defineTemplate({
	modelId: 'DrizzleAnd', version: '1.0.0', description: 'Combines an array of SQL conditions with AND.',
	inputs: { conditions: arrayInput('Array of SQL conditions.') },
	output: expressionOutput('AND SQL condition.', drizzleSqlType('boolean')),
	source: `and(...${marker('expression', 'conditions', '[]')})`
})
export const DrizzleOrTemplate = defineTemplate({
	modelId: 'DrizzleOr', version: '1.0.0', description: 'Combines an array of SQL conditions with OR.',
	inputs: { conditions: arrayInput('Array of SQL conditions.') },
	output: expressionOutput('OR SQL condition.', drizzleSqlType('boolean')),
	source: `or(...${marker('expression', 'conditions', '[]')})`
})
export const DrizzleCountTemplate = aggregate('DrizzleCount', 'count', 'number', 'Counts rows or non-null values.')
export const DrizzleCountDistinctTemplate = aggregate('DrizzleCountDistinct', 'countDistinct', 'number', 'Counts distinct non-null values.')
export const DrizzleSumTemplate = aggregate('DrizzleSum', 'sum', 'string | number', 'Computes SUM.')
export const DrizzleSumDistinctTemplate = aggregate('DrizzleSumDistinct', 'sumDistinct', 'string | number', 'Computes SUM DISTINCT.')
export const DrizzleAvgTemplate = aggregate('DrizzleAvg', 'avg', 'string | number', 'Computes AVG.')
export const DrizzleAvgDistinctTemplate = aggregate('DrizzleAvgDistinct', 'avgDistinct', 'string | number', 'Computes AVG DISTINCT.')
export const DrizzleMinTemplate = aggregate('DrizzleMin', 'min', 'unknown', 'Computes MIN.')
export const DrizzleMaxTemplate = aggregate('DrizzleMax', 'max', 'unknown', 'Computes MAX.')

export const drizzleSqlGraphTemplateInputs = [
	DrizzleSqlRawTemplate,
	DrizzleSqlEmptyTemplate,
	DrizzleSqlFromListTemplate,
	DrizzleSqlJoinTemplate,
	DrizzleSqlAppendTemplate,
	DrizzleSqlPlaceholderTemplate,
	DrizzleSqlAsTemplate,
	DrizzleSqlMapWithTemplate,
	DrizzleSqlTypedTemplate,
	DrizzleGetColumnsTemplate,
	DrizzleAliasTemplate,
	DrizzleEqTemplate,
	DrizzleNeTemplate,
	DrizzleGtTemplate,
	DrizzleGteTemplate,
	DrizzleLtTemplate,
	DrizzleLteTemplate,
	DrizzleLikeTemplate,
	DrizzleNotLikeTemplate,
	DrizzleIlikeTemplate,
	DrizzleNotIlikeTemplate,
	DrizzleArrayContainsTemplate,
	DrizzleArrayContainedTemplate,
	DrizzleArrayOverlapsTemplate,
	DrizzleIsNullTemplate,
	DrizzleIsNotNullTemplate,
	DrizzleExistsTemplate,
	DrizzleNotExistsTemplate,
	DrizzleNotTemplate,
	DrizzleAscTemplate,
	DrizzleDescTemplate,
	DrizzleBetweenTemplate,
	DrizzleNotBetweenTemplate,
	DrizzleInArrayTemplate,
	DrizzleNotInArrayTemplate,
	DrizzleAndTemplate,
	DrizzleOrTemplate,
	DrizzleCountTemplate,
	DrizzleCountDistinctTemplate,
	DrizzleSumTemplate,
	DrizzleSumDistinctTemplate,
	DrizzleAvgTemplate,
	DrizzleAvgDistinctTemplate,
	DrizzleMinTemplate,
	DrizzleMaxTemplate,
] satisfies ReadonlyArray<AnyDrizzleTemplateDefinitionInput>
