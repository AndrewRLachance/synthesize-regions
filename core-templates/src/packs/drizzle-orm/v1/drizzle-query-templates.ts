import { defineTemplate } from '../../../authoring/define-template.js'
import { drizzleQueryUtilityGraphTemplateInputs } from './drizzle-query-utility-templates.js'
import {
	type AnyDrizzleTemplateDefinitionInput,
	databaseInput,
	drizzleCteType,
	drizzlePreparedQueryType,
	drizzleQueryType,
	expressionInput,
	expressionOutput,
	marker,
	nonNegativeIntegerInput,
	objectInput,
	preparedQueryInput,
	queryInput,
	stringInput,
	tableInput,
	typedExpressionInput
} from './drizzle-template-helpers.js'

const queryMethod = (modelId: string, method: string, description: string) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	inputs: { source: queryInput('Source query builder.'), value: expressionInput('Method argument.') },
	output: expressionOutput('Updated query builder.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.${method}(${marker('expression', 'value', 'undefined')})`
})

const setOperator = (modelId: string, method: string, description: string) => defineTemplate({
	modelId, version: '1.0.0', description,
	inputs: { left: queryInput('Left select query.'), right: queryInput('Right select query.') },
	output: expressionOutput('Combined select query.', drizzleQueryType()),
	source: `${marker('expression', 'left', 'undefined')}.${method}(${marker('expression', 'right', 'undefined')})`
})

export const DrizzleSelectTemplate = defineTemplate({
	modelId: 'DrizzleSelect', version: '1.0.0', description: 'Starts a SELECT query for all columns.',
	inputs: { db: databaseInput() }, output: expressionOutput('SELECT builder.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.select()`
})
export const DrizzleSelectFieldsTemplate = defineTemplate({
	modelId: 'DrizzleSelectFields', version: '1.0.0', description: 'Starts a partial SELECT query with an explicit selection object.',
	inputs: { db: databaseInput(), fields: objectInput('Selection object mapping result keys to columns or SQL expressions.') },
	output: expressionOutput('Partial SELECT builder.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.select(${marker('expression', 'fields', '{}')})`
})
export const DrizzleSelectDistinctTemplate = defineTemplate({
	modelId: 'DrizzleSelectDistinct', version: '1.0.0', description: 'Starts a SELECT DISTINCT query for all columns.',
	inputs: { db: databaseInput() }, output: expressionOutput('SELECT DISTINCT builder.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.selectDistinct()`
})
export const DrizzleSelectDistinctFieldsTemplate = defineTemplate({
	modelId: 'DrizzleSelectDistinctFields', version: '1.0.0', description: 'Starts a partial SELECT DISTINCT query.',
	inputs: { db: databaseInput(), fields: objectInput('Selection object.') }, output: expressionOutput('Partial SELECT DISTINCT builder.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.selectDistinct(${marker('expression', 'fields', '{}')})`
})
export const DrizzleSelectFromTemplate = defineTemplate({
	modelId: 'DrizzleSelectFrom', version: '1.0.0', description: 'Adds a FROM source to a SELECT query.',
	inputs: { source: queryInput('SELECT builder.'), table: expressionInput('Table, view, subquery, or SQL source.') },
	output: expressionOutput('SELECT query with FROM.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.from(${marker('expression', 'table', 'undefined')})`
})
export const DrizzleWhereTemplate = queryMethod('DrizzleWhere', 'where', 'Adds a WHERE predicate to a query.')
export const DrizzleHavingTemplate = queryMethod('DrizzleHaving', 'having', 'Adds a HAVING predicate to a grouped SELECT query.')
export const DrizzleGroupByTemplate = queryMethod('DrizzleGroupBy', 'groupBy', 'Adds a GROUP BY expression or expression list.')
export const DrizzleOrderByTemplate = queryMethod('DrizzleOrderBy', 'orderBy', 'Adds an ORDER BY expression or expression list.')

export const DrizzleCommentTemplate = defineTemplate({
	modelId: 'DrizzleComment', version: '1.0.0', description: 'Appends an SQLcommenter-style query comment.',
	inputs: { source: queryInput(), comment: stringInput('Query comment text.') },
	output: expressionOutput('Commented query builder.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.comment(${marker('string', 'comment', '"tag"')})`
})

export const DrizzleLimitTemplate = defineTemplate({
	modelId: 'DrizzleLimit', version: '1.0.0', description: 'Adds LIMIT to a query.',
	inputs: { source: queryInput(), limit: nonNegativeIntegerInput('Maximum row count.') },
	output: expressionOutput('Query with LIMIT.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.limit(${marker('expression', 'limit', '10')})`
})
export const DrizzleOffsetTemplate = defineTemplate({
	modelId: 'DrizzleOffset', version: '1.0.0', description: 'Adds OFFSET to a query.',
	inputs: { source: queryInput(), offset: nonNegativeIntegerInput('Rows to skip.') },
	output: expressionOutput('Query with OFFSET.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.offset(${marker('expression', 'offset', '0')})`
})
export const DrizzleLeftJoinTemplate = defineTemplate({
	modelId: 'DrizzleLeftJoin', version: '1.0.0', description: 'Adds a LEFT JOIN.',
	inputs: { source: queryInput(), table: expressionInput('Joined table or subquery.'), on: expressionInput('Join predicate.') },
	output: expressionOutput('Joined SELECT query.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.leftJoin(${marker('expression', 'table', 'undefined')}, ${marker('expression', 'on', 'undefined')})`
})
export const DrizzleRightJoinTemplate = defineTemplate({
	modelId: 'DrizzleRightJoin', version: '1.0.0', description: 'Adds a RIGHT JOIN where supported.',
	inputs: { source: queryInput(), table: expressionInput('Joined table or subquery.'), on: expressionInput('Join predicate.') },
	output: expressionOutput('Joined SELECT query.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.rightJoin(${marker('expression', 'table', 'undefined')}, ${marker('expression', 'on', 'undefined')})`
})
export const DrizzleInnerJoinTemplate = defineTemplate({
	modelId: 'DrizzleInnerJoin', version: '1.0.0', description: 'Adds an INNER JOIN.',
	inputs: { source: queryInput(), table: expressionInput('Joined table or subquery.'), on: expressionInput('Join predicate.') },
	output: expressionOutput('Joined SELECT query.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.innerJoin(${marker('expression', 'table', 'undefined')}, ${marker('expression', 'on', 'undefined')})`
})
export const DrizzleFullJoinTemplate = defineTemplate({
	modelId: 'DrizzleFullJoin', version: '1.0.0', description: 'Adds a FULL JOIN where supported.',
	inputs: { source: queryInput(), table: expressionInput('Joined table or subquery.'), on: expressionInput('Join predicate.') },
	output: expressionOutput('Joined SELECT query.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.fullJoin(${marker('expression', 'table', 'undefined')}, ${marker('expression', 'on', 'undefined')})`
})
export const DrizzleCrossJoinTemplate = defineTemplate({
	modelId: 'DrizzleCrossJoin', version: '1.0.0', description: 'Adds a CROSS JOIN.',
	inputs: { source: queryInput(), table: expressionInput('Joined table or subquery.') },
	output: expressionOutput('Cross-joined SELECT query.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.crossJoin(${marker('expression', 'table', 'undefined')})`
})

export const DrizzleQueryAsTemplate = defineTemplate({
	modelId: 'DrizzleQueryAs', version: '1.0.0', description: 'Aliases a query as a subquery with .as().',
	inputs: { source: queryInput(), alias: stringInput('Subquery alias.') },
	output: expressionOutput('Aliased subquery.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.as(${marker('string', 'alias', '"sq"')})`
})
export const DrizzleDynamicQueryTemplate = defineTemplate({
	modelId: 'DrizzleDynamicQuery', version: '1.0.0', description: 'Enables Drizzle dynamic query-building mode with .$dynamic().',
	inputs: { source: queryInput() }, output: expressionOutput('Dynamic query builder.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.$dynamic()`
})
export const DrizzleQueryToSqlTemplate = defineTemplate({
	modelId: 'DrizzleQueryToSql', version: '1.0.0', description: 'Converts a query builder to its SQL string and parameter representation.',
	inputs: { source: queryInput() }, output: expressionOutput('SQL text and params object.'),
	source: `${marker('expression', 'source', 'undefined')}.toSQL()`
})
export const DrizzleUnionTemplate = setOperator('DrizzleUnion', 'union', 'Combines SELECT results with UNION.')
export const DrizzleUnionAllTemplate = setOperator('DrizzleUnionAll', 'unionAll', 'Combines SELECT results with UNION ALL.')
export const DrizzleIntersectTemplate = setOperator('DrizzleIntersect', 'intersect', 'Combines SELECT results with INTERSECT.')
export const DrizzleIntersectAllTemplate = setOperator('DrizzleIntersectAll', 'intersectAll', 'Combines SELECT results with INTERSECT ALL.')
export const DrizzleExceptTemplate = setOperator('DrizzleExcept', 'except', 'Combines SELECT results with EXCEPT.')
export const DrizzleExceptAllTemplate = setOperator('DrizzleExceptAll', 'exceptAll', 'Combines SELECT results with EXCEPT ALL.')

export const DrizzleInsertTemplate = defineTemplate({
	modelId: 'DrizzleInsert', version: '1.0.0', description: 'Starts an INSERT query for a table.',
	inputs: { db: databaseInput(), table: tableInput() }, output: expressionOutput('INSERT builder.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.insert(${marker('expression', 'table', 'undefined')})`
})
export const DrizzleInsertValuesTemplate = defineTemplate({
	modelId: 'DrizzleInsertValues', version: '1.0.0', description: 'Supplies one row or an array of rows to INSERT .values().',
	inputs: { source: queryInput('INSERT builder.'), values: expressionInput('Insert object or array of insert objects.') },
	output: expressionOutput('INSERT query with values.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.values(${marker('expression', 'values', '{}')})`
})
export const DrizzleInsertSelectTemplate = defineTemplate({
	modelId: 'DrizzleInsertSelect', version: '1.0.0', description: 'Supplies a SELECT query to INSERT ... SELECT.',
	inputs: { source: queryInput('INSERT builder.'), query: expressionInput('Select query, callback, or SQL expression.') },
	output: expressionOutput('INSERT ... SELECT query.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.select(${marker('expression', 'query', 'undefined')})`
})
export const DrizzleReturningTemplate = defineTemplate({
	modelId: 'DrizzleReturning', version: '1.0.0', description: 'Adds RETURNING * where the dialect supports it.',
	inputs: { source: queryInput('INSERT, UPDATE, or DELETE builder.') },
	output: expressionOutput('Query with RETURNING.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.returning()`
})
export const DrizzleReturningFieldsTemplate = defineTemplate({
	modelId: 'DrizzleReturningFields', version: '1.0.0', description: 'Adds a partial RETURNING projection where supported.',
	inputs: { source: queryInput('INSERT, UPDATE, or DELETE builder.'), fields: objectInput('Returned field map.') },
	output: expressionOutput('Query with partial RETURNING.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.returning(${marker('expression', 'fields', '{}')})`
})
export const DrizzleOnConflictDoNothingTemplate = defineTemplate({
	modelId: 'DrizzleOnConflictDoNothing', version: '1.0.0', description: 'Adds ON CONFLICT DO NOTHING for dialects that support it.',
	inputs: { source: queryInput('INSERT builder.'), config: objectInput('Conflict target/configuration object.') },
	output: expressionOutput('INSERT conflict-handling query.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.onConflictDoNothing(${marker('expression', 'config', '{}')})`
})
export const DrizzleOnConflictDoUpdateTemplate = defineTemplate({
	modelId: 'DrizzleOnConflictDoUpdate', version: '1.0.0', description: 'Adds ON CONFLICT DO UPDATE with an explicit conflict configuration.',
	inputs: { source: queryInput('INSERT builder.'), config: objectInput('Conflict target and set configuration.') },
	output: expressionOutput('INSERT upsert query.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.onConflictDoUpdate(${marker('expression', 'config', '{}')})`
})
export const DrizzleOnDuplicateKeyUpdateTemplate = defineTemplate({
	modelId: 'DrizzleOnDuplicateKeyUpdate', version: '1.0.0', description: 'Adds MySQL ON DUPLICATE KEY UPDATE.',
	inputs: { source: queryInput('MySQL INSERT builder.'), config: objectInput('Object containing the set mapping.') },
	output: expressionOutput('MySQL upsert query.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.onDuplicateKeyUpdate(${marker('expression', 'config', '{ set: {} }')})`
})

export const DrizzleUpdateTemplate = defineTemplate({
	modelId: 'DrizzleUpdate', version: '1.0.0', description: 'Starts an UPDATE query for a table.',
	inputs: { db: databaseInput(), table: tableInput() }, output: expressionOutput('UPDATE builder.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.update(${marker('expression', 'table', 'undefined')})`
})
export const DrizzleUpdateSetTemplate = defineTemplate({
	modelId: 'DrizzleUpdateSet', version: '1.0.0', description: 'Supplies the UPDATE set mapping. Undefined values are ignored by Drizzle.',
	inputs: { source: queryInput('UPDATE builder.'), values: objectInput('Column update mapping.') },
	output: expressionOutput('UPDATE query with SET.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.set(${marker('expression', 'values', '{}')})`
})
export const DrizzleUpdateFromTemplate = defineTemplate({
	modelId: 'DrizzleUpdateFrom', version: '1.0.0', description: 'Adds UPDATE ... FROM where supported.',
	inputs: { source: queryInput('UPDATE builder.'), from: expressionInput('FROM table, view, subquery, or SQL expression.') },
	output: expressionOutput('UPDATE query with FROM.', drizzleQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.from(${marker('expression', 'from', 'undefined')})`
})
export const DrizzleDeleteTemplate = defineTemplate({
	modelId: 'DrizzleDelete', version: '1.0.0', description: 'Starts a DELETE query for a table.',
	inputs: { db: databaseInput(), table: tableInput() }, output: expressionOutput('DELETE builder.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.delete(${marker('expression', 'table', 'undefined')})`
})

export const DrizzleCteTemplate = defineTemplate({
	modelId: 'DrizzleCte', version: '1.0.0', description: 'Defines a named common table expression with db.$with(name).as(query).',
	inputs: { db: databaseInput(), name: stringInput('CTE name.'), query: queryInput('CTE query.') },
	output: expressionOutput('Common table expression.', drizzleCteType()),
	source: `${marker('expression', 'db', 'db')}.$with(${marker('string', 'name', '"cte"')}).as(${marker('expression', 'query', 'undefined')})`
})
export const DrizzleWithCteTemplate = defineTemplate({
	modelId: 'DrizzleWithCte', version: '1.0.0', description: 'Starts a WITH query context for a CTE.',
	inputs: { db: databaseInput(), ctes: expressionInput('CTE expression.') },
	output: expressionOutput('WITH query context.', drizzleQueryType()),
	source: `${marker('expression', 'db', 'db')}.with(${marker('expression', 'ctes', 'undefined')})`
})
export const DrizzlePrepareTemplate = defineTemplate({
	modelId: 'DrizzlePrepare', version: '1.0.0', description: 'Prepares a query; v1 allows the statement name to be omitted.',
	inputs: { source: queryInput() }, output: expressionOutput('Prepared query.', drizzlePreparedQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.prepare()`
})
export const DrizzlePrepareNamedTemplate = defineTemplate({
	modelId: 'DrizzlePrepareNamed', version: '1.0.0', description: 'Prepares a query with an explicit statement name.',
	inputs: { source: queryInput(), name: stringInput('Prepared statement name.') }, output: expressionOutput('Named prepared query.', drizzlePreparedQueryType()),
	source: `${marker('expression', 'source', 'undefined')}.prepare(${marker('string', 'name', '"statement"')})`
})
export const DrizzlePreparedExecuteTemplate = defineTemplate({
	modelId: 'DrizzlePreparedExecute', version: '1.0.0', description: 'Executes a prepared query without placeholder values.',
	inputs: { source: preparedQueryInput() }, output: expressionOutput('Prepared query execution result.'),
	source: `${marker('expression', 'source', 'undefined')}.execute()`
})
export const DrizzlePreparedExecuteParamsTemplate = defineTemplate({
	modelId: 'DrizzlePreparedExecuteParams', version: '1.0.0', description: 'Executes a prepared query with named placeholder values.',
	inputs: { source: preparedQueryInput(), params: objectInput('Placeholder value object.') }, output: expressionOutput('Prepared query execution result.'),
	source: `${marker('expression', 'source', 'undefined')}.execute(${marker('expression', 'params', '{}')})`
})
export const DrizzleUnionFunctionTemplate = defineTemplate({
	modelId: 'DrizzleUnionFunction', version: '1.0.0', description: 'Combines two compatible SELECT queries with the dialect union() helper.',
	inputs: { left: queryInput('Left SELECT query.'), right: queryInput('Right SELECT query.') },
	output: expressionOutput('Set-operation query.', drizzleQueryType()),
	source: `union(${marker('expression', 'left', 'undefined')}, ${marker('expression', 'right', 'undefined')})`
})
export const DrizzleUnionAllFunctionTemplate = defineTemplate({
	modelId: 'DrizzleUnionAllFunction', version: '1.0.0', description: 'Combines two compatible SELECT queries with unionAll().',
	inputs: { left: queryInput('Left SELECT query.'), right: queryInput('Right SELECT query.') },
	output: expressionOutput('Set-operation query.', drizzleQueryType()),
	source: `unionAll(${marker('expression', 'left', 'undefined')}, ${marker('expression', 'right', 'undefined')})`
})
export const DrizzleIntersectFunctionTemplate = defineTemplate({
	modelId: 'DrizzleIntersectFunction', version: '1.0.0', description: 'Combines two compatible SELECT queries with intersect().',
	inputs: { left: queryInput('Left SELECT query.'), right: queryInput('Right SELECT query.') },
	output: expressionOutput('Set-operation query.', drizzleQueryType()),
	source: `intersect(${marker('expression', 'left', 'undefined')}, ${marker('expression', 'right', 'undefined')})`
})
export const DrizzleIntersectAllFunctionTemplate = defineTemplate({
	modelId: 'DrizzleIntersectAllFunction', version: '1.0.0', description: 'Combines two compatible SELECT queries with intersectAll().',
	inputs: { left: queryInput('Left SELECT query.'), right: queryInput('Right SELECT query.') },
	output: expressionOutput('Set-operation query.', drizzleQueryType()),
	source: `intersectAll(${marker('expression', 'left', 'undefined')}, ${marker('expression', 'right', 'undefined')})`
})
export const DrizzleExceptFunctionTemplate = defineTemplate({
	modelId: 'DrizzleExceptFunction', version: '1.0.0', description: 'Combines two compatible SELECT queries with except().',
	inputs: { left: queryInput('Left SELECT query.'), right: queryInput('Right SELECT query.') },
	output: expressionOutput('Set-operation query.', drizzleQueryType()),
	source: `except(${marker('expression', 'left', 'undefined')}, ${marker('expression', 'right', 'undefined')})`
})
export const DrizzleExceptAllFunctionTemplate = defineTemplate({
	modelId: 'DrizzleExceptAllFunction', version: '1.0.0', description: 'Combines two compatible SELECT queries with exceptAll().',
	inputs: { left: queryInput('Left SELECT query.'), right: queryInput('Right SELECT query.') },
	output: expressionOutput('Set-operation query.', drizzleQueryType()),
	source: `exceptAll(${marker('expression', 'left', 'undefined')}, ${marker('expression', 'right', 'undefined')})`
})

export const drizzleQueryGraphTemplateInputs = [
	DrizzleSelectTemplate,
	DrizzleSelectFieldsTemplate,
	DrizzleSelectDistinctTemplate,
	DrizzleSelectDistinctFieldsTemplate,
	DrizzleSelectFromTemplate,
	DrizzleWhereTemplate,
	DrizzleHavingTemplate,
	DrizzleGroupByTemplate,
	DrizzleOrderByTemplate,
	DrizzleCommentTemplate,
	DrizzleLimitTemplate,
	DrizzleOffsetTemplate,
	DrizzleLeftJoinTemplate,
	DrizzleRightJoinTemplate,
	DrizzleInnerJoinTemplate,
	DrizzleFullJoinTemplate,
	DrizzleCrossJoinTemplate,
	DrizzleQueryAsTemplate,
	DrizzleDynamicQueryTemplate,
	DrizzleQueryToSqlTemplate,
	DrizzleUnionTemplate,
	DrizzleUnionAllTemplate,
	DrizzleIntersectTemplate,
	DrizzleIntersectAllTemplate,
	DrizzleExceptTemplate,
	DrizzleExceptAllTemplate,
	DrizzleInsertTemplate,
	DrizzleInsertValuesTemplate,
	DrizzleInsertSelectTemplate,
	DrizzleReturningTemplate,
	DrizzleReturningFieldsTemplate,
	DrizzleOnConflictDoNothingTemplate,
	DrizzleOnConflictDoUpdateTemplate,
	DrizzleOnDuplicateKeyUpdateTemplate,
	DrizzleUpdateTemplate,
	DrizzleUpdateSetTemplate,
	DrizzleUpdateFromTemplate,
	DrizzleDeleteTemplate,
	DrizzleCteTemplate,
	DrizzleWithCteTemplate,
	DrizzlePrepareTemplate,
	DrizzlePrepareNamedTemplate,
	DrizzlePreparedExecuteTemplate,
	DrizzlePreparedExecuteParamsTemplate,
	DrizzleUnionFunctionTemplate,
	DrizzleUnionAllFunctionTemplate,
	DrizzleIntersectFunctionTemplate,
	DrizzleIntersectAllFunctionTemplate,
	DrizzleExceptFunctionTemplate,
	DrizzleExceptAllFunctionTemplate,
	...drizzleQueryUtilityGraphTemplateInputs
] satisfies ReadonlyArray<AnyDrizzleTemplateDefinitionInput>
