import { defineTemplate } from '../src/templates.js'
import {
	effectSourceInput,
	effectStructuralType,
	effectType,
	effectValueInput
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	layerType,
	marker,
	scheduleType,
	schemaType,
	statementCollectionInput,
	stringInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import { optionType } from './effect-data-type-template-helpers.js'
import {
	migrationErrorType,
	noSuchElementErrorType,
	pgClientRequirement,
	schemaErrorType,
	sqlClientRequirement,
	sqlErrorType,
	sqlMigrationLoaderType,
	sqlModelType,
	sqlRepositoryType,
	sqlRequestResolverType,
	sqlResolversType,
	sqlScopeRequirement,
	sqlStatementType
} from './effect-sql-template-helpers.js'

/**
 * Effect v4 SQL foundational templates.
 *
 * Runtime contract:
 *   import { Effect, Layer, Option, Schedule, Stream } from 'effect'
 *   import { Migrator, SqlClient, SqlError, SqlModel, SqlResolver, SqlSchema, Statement } from 'effect/unstable/sql'
 *   import { PgClient } from '@effect/sql-pg'
 */

const VERSION = '1.0.0' as const

const statementInput = (description: string, row = 'Record<string, unknown>') =>
	typedExpressionInput(description, sqlStatementType(row))
const modelInput = (
	description: string,
	row = 'unknown',
	insert = 'unknown',
	update = 'unknown',
	id = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, sqlModelType(row, insert, update, id, requirements))
const repositoryInput = (
	description: string,
	row = 'unknown',
	insert = 'unknown',
	update = 'unknown',
	id = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, sqlRepositoryType(row, insert, update, id, requirements))

export const SqlUnsafeQueryTemplate = defineTemplate({
	modelId: 'SqlUnsafeQuery', version: VERSION,
	description: 'Executes explicitly unsafe SQL text with separately bound parameters. Prefer tagged SQL templates for ordinary queries.',
	typeParameters: typeParameters(['Row', 'Returned row type.']),
	inputs: {
		text: stringInput('Raw SQL text. Do not concatenate untrusted values into this string.'),
		params: valueInput('Bound SQL parameters.', { ts: 'ReadonlyArray<unknown>' })
	},
	output: expressionOutput('Unsafe SQL query Effect.', effectType('ReadonlyArray<{{Row}}>', sqlErrorType, sqlClientRequirement)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql.unsafe(${marker('string', 'text', '"select 1"')}, ${marker('expression', 'params', '[]')})\n})`
})

export const SqlStatementStreamTemplate = defineTemplate({
	modelId: 'SqlStatementStream', version: VERSION, description: 'Streams rows from a prepared SQL Statement.',
	typeParameters: typeParameters(['Row', 'Statement row type.']),
	inputs: { statement: statementInput('SQL Statement to stream.', '{{Row}}') },
	output: expressionOutput('SQL row Stream.', { nominal: 'effect/Stream', ts: '{ readonly pipe: () => unknown; readonly __streamSuccess?: () => {{Row}}; readonly __streamError?: () => ' + sqlErrorType + '; readonly __streamRequirements?: () => never }' }),
	source: `${marker('expression', 'statement', 'statement')}.stream`
})

export const SqlStatementValuesTemplate = defineTemplate({
	modelId: 'SqlStatementValues', version: VERSION, description: 'Executes a SQL Statement and returns rows as positional value arrays.',
	typeParameters: typeParameters(['Row', 'Original statement row type.']),
	inputs: { statement: statementInput('SQL Statement.', '{{Row}}') },
	output: expressionOutput('SQL values Effect.', effectType('ReadonlyArray<ReadonlyArray<unknown>>', sqlErrorType, 'never')),
	source: `${marker('expression', 'statement', 'statement')}.values`
})

export const SqlStatementWithoutTransformTemplate = defineTemplate({
	modelId: 'SqlStatementWithoutTransform', version: VERSION, description: 'Executes a SQL Statement without configured result-name transformations.',
	typeParameters: typeParameters(['Row', 'Statement row type.']),
	inputs: { statement: statementInput('SQL Statement.', '{{Row}}') },
	output: expressionOutput('Untransformed SQL rows Effect.', effectType('ReadonlyArray<{{Row}}>', sqlErrorType, 'never')),
	source: `${marker('expression', 'statement', 'statement')}.withoutTransform`
})

export const SqlStatementUnpreparedTemplate = defineTemplate({
	modelId: 'SqlStatementUnprepared', version: VERSION, description: 'Executes a SQL Statement without using prepared-statement execution.',
	typeParameters: typeParameters(['Row', 'Statement row type.']),
	inputs: { statement: statementInput('SQL Statement.', '{{Row}}') },
	output: expressionOutput('Unprepared SQL rows Effect.', effectType('ReadonlyArray<{{Row}}>', sqlErrorType, 'never')),
	source: `${marker('expression', 'statement', 'statement')}.unprepared`
})

export const SqlStatementRawTemplate = defineTemplate({
	modelId: 'SqlStatementRaw', version: VERSION, description: 'Executes a SQL Statement and returns the driver-specific raw result.',
	typeParameters: typeParameters(['Row', 'Statement row type.']),
	inputs: { statement: statementInput('SQL Statement.', '{{Row}}') },
	output: expressionOutput('Raw SQL execution Effect.', effectType('unknown', sqlErrorType, 'never')),
	source: `${marker('expression', 'statement', 'statement')}.raw`
})

export const SqlStatementCompileTemplate = defineTemplate({
	modelId: 'SqlStatementCompile', version: VERSION, description: 'Compiles a SQL Statement to dialect SQL text plus bound parameters without executing it.',
	typeParameters: typeParameters(['Row', 'Statement row type.']),
	inputs: { statement: statementInput('SQL Statement.', '{{Row}}') },
	output: expressionOutput('Compiled SQL tuple.', { ts: 'readonly [sql: string, params: ReadonlyArray<unknown>]' }),
	source: `${marker('expression', 'statement', 'statement')}.compile()`
})

export const SqlSelectAllTemplate = defineTemplate({
	modelId: 'SqlSelectAll', version: VERSION, description: 'Selects all rows from a dynamically named table using escaped identifier interpolation.',
	typeParameters: typeParameters(['Row', 'Returned row type.']),
	inputs: { table: stringInput('Database table name.') },
	output: expressionOutput('SELECT-all Effect.', effectType('ReadonlyArray<{{Row}}>', sqlErrorType, sqlClientRequirement)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql\`select * from \${sql(${marker('string', 'table', '"items"')})}\`\n})`
})

export const SqlSelectByIdTemplate = defineTemplate({
	modelId: 'SqlSelectById', version: VERSION, description: 'Selects rows by one bound identifier value with escaped table and column names.',
	typeParameters: typeParameters(['Row', 'Returned row type.'], ['Id', 'Identifier value type.']),
	inputs: {
		table: stringInput('Database table name.'),
		idColumn: stringInput('Identifier column name.'),
		id: effectValueInput('Identifier value.', { ts: '{{Id}}' })
	},
	output: expressionOutput('SELECT-by-id Effect.', effectType('ReadonlyArray<{{Row}}>', sqlErrorType, sqlClientRequirement)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql\`select * from \${sql(${marker('string', 'table', '"items"')})} where \${sql(${marker('string', 'idColumn', '"id"')})} = \${${marker('expression', 'id', '1')}}\`\n})`
})

export const SqlSelectByIdsTemplate = defineTemplate({
	modelId: 'SqlSelectByIds', version: VERSION, description: 'Selects rows whose identifier column is in a bound list.',
	typeParameters: typeParameters(['Row', 'Returned row type.'], ['Id', 'Identifier value type.']),
	inputs: {
		table: stringInput('Database table name.'),
		idColumn: stringInput('Identifier column name.'),
		ids: effectValueInput('Identifier values.', { ts: 'ReadonlyArray<{{Id}}>' })
	},
	output: expressionOutput('SELECT-by-ids Effect.', effectType('ReadonlyArray<{{Row}}>', sqlErrorType, sqlClientRequirement)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql\`select * from \${sql(${marker('string', 'table', '"items"')})} where \${sql.in(${marker('string', 'idColumn', '"id"')}, ${marker('expression', 'ids', '[]')})}\`\n})`
})

export const SqlInsertRecordTemplate = defineTemplate({
	modelId: 'SqlInsertRecord', version: VERSION, description: 'Inserts one record with dialect-aware bound-column generation.',
	typeParameters: typeParameters(['Row', 'Inserted record shape.']),
	inputs: { table: stringInput('Database table name.'), row: effectValueInput('Record to insert.', { ts: '{{Row}}' }) },
	output: expressionOutput('INSERT Effect.', effectType('ReadonlyArray<Record<string, unknown>>', sqlErrorType, sqlClientRequirement)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql\`insert into \${sql(${marker('string', 'table', '"items"')})} \${sql.insert(${marker('expression', 'row', '{}')})}\`\n})`
})

export const SqlInsertRecordReturningTemplate = defineTemplate({
	modelId: 'SqlInsertRecordReturning', version: VERSION, description: 'Inserts one record and returns the inserted rows on dialects supporting RETURNING.',
	typeParameters: typeParameters(['Insert', 'Inserted record shape.'], ['Row', 'Returned database row type.']),
	inputs: { table: stringInput('Database table name.'), row: effectValueInput('Record to insert.', { ts: '{{Insert}}' }) },
	output: expressionOutput('INSERT RETURNING Effect.', effectType('ReadonlyArray<{{Row}}>', sqlErrorType, sqlClientRequirement)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql\`insert into \${sql(${marker('string', 'table', '"items"')})} \${sql.insert(${marker('expression', 'row', '{}')}).returning("*")}\`\n})`
})

export const SqlUpdateByIdTemplate = defineTemplate({
	modelId: 'SqlUpdateById', version: VERSION, description: 'Updates one record by id while omitting the id column from the generated SET clause.',
	typeParameters: typeParameters(['Update', 'Update record shape.'], ['Id', 'Identifier type.']),
	inputs: {
		table: stringInput('Database table name.'), idColumn: stringInput('Identifier column name.'),
		row: effectValueInput('Record containing update values.', { ts: '{{Update}}' }), id: effectValueInput('Identifier value.', { ts: '{{Id}}' })
	},
	output: expressionOutput('UPDATE Effect.', effectType('ReadonlyArray<Record<string, unknown>>', sqlErrorType, sqlClientRequirement)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\tconst idColumn = ${marker('string', 'idColumn', '"id"')}\n\treturn yield* sql\`update \${sql(${marker('string', 'table', '"items"')})} set \${sql.update(${marker('expression', 'row', '{}')}, [idColumn])} where \${sql(idColumn)} = \${${marker('expression', 'id', '1')}}\`\n})`
})

export const SqlUpdateByIdReturningTemplate = defineTemplate({
	modelId: 'SqlUpdateByIdReturning', version: VERSION, description: 'Updates one record by id and returns updated rows on dialects supporting RETURNING.',
	typeParameters: typeParameters(['Update', 'Update record shape.'], ['Id', 'Identifier type.'], ['Row', 'Returned database row type.']),
	inputs: {
		table: stringInput('Database table name.'), idColumn: stringInput('Identifier column name.'),
		row: effectValueInput('Record containing update values.', { ts: '{{Update}}' }), id: effectValueInput('Identifier value.', { ts: '{{Id}}' })
	},
	output: expressionOutput('UPDATE RETURNING Effect.', effectType('ReadonlyArray<{{Row}}>', sqlErrorType, sqlClientRequirement)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\tconst idColumn = ${marker('string', 'idColumn', '"id"')}\n\treturn yield* sql\`update \${sql(${marker('string', 'table', '"items"')})} set \${sql.update(${marker('expression', 'row', '{}')}, [idColumn]).returning("*")} where \${sql(idColumn)} = \${${marker('expression', 'id', '1')}}\`\n})`
})

export const SqlDeleteByIdTemplate = defineTemplate({
	modelId: 'SqlDeleteById', version: VERSION, description: 'Deletes rows by a bound identifier value.',
	typeParameters: typeParameters(['Id', 'Identifier type.']),
	inputs: { table: stringInput('Database table name.'), idColumn: stringInput('Identifier column name.'), id: effectValueInput('Identifier value.', { ts: '{{Id}}' }) },
	output: expressionOutput('DELETE Effect.', effectType('void', sqlErrorType, sqlClientRequirement)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\tyield* sql\`delete from \${sql(${marker('string', 'table', '"items"')})} where \${sql(${marker('string', 'idColumn', '"id"')})} = \${${marker('expression', 'id', '1')}}\`\n})`
})

export const SqlSchemaFindAllTemplate = defineTemplate({
	modelId: 'SqlSchemaFindAll', version: VERSION, description: 'Builds a schema-encoded SQL query function that decodes zero or more result rows.',
	typeParameters: typeParameters(['Req', 'Decoded request type.'], ['ReqEncoded', 'Encoded request type.'], ['Res', 'Decoded result type.'], ['ResEncoded', 'Encoded result type.'], ['E', 'SQL execution error type.'], ['R', 'Execution requirements.'], ['RReqEncode', 'Request encoding services.'], ['RResDecode', 'Result decoding services.']),
	inputs: {
		requestSchema: typedExpressionInput('Request Schema.', schemaType('{{Req}}', '{{ReqEncoded}}', 'never', '{{RReqEncode}}')),
		resultSchema: typedExpressionInput('Result Schema.', schemaType('{{Res}}', '{{ResEncoded}}', '{{RResDecode}}', 'never')),
		execute: callbackInput('Encoded SQL execution callback.', effectReturningCallbackType('request: {{ReqEncoded}}', 'ReadonlyArray<unknown>', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Schema-backed find-all function.', { ts: `(request: {{Req}}) => ${effectStructuralType('Array<{{Res}}>', `{{E}} | ${schemaErrorType}`, '{{R}} | {{RReqEncode}} | {{RResDecode}}')}` }),
	source: `SqlSchema.findAll({ Request: ${marker('expression', 'requestSchema', 'Schema.Unknown')}, Result: ${marker('expression', 'resultSchema', 'Schema.Unknown')}, execute: ${marker('expression', 'execute', '() => Effect.succeed([])')} })`
})

export const SqlSchemaFindNonEmptyTemplate = defineTemplate({
	modelId: 'SqlSchemaFindNonEmpty', version: VERSION, description: 'Builds a schema-backed SQL query function that fails when no rows are returned.',
	typeParameters: typeParameters(['Req', 'Decoded request type.'], ['ReqEncoded', 'Encoded request type.'], ['Res', 'Decoded result type.'], ['ResEncoded', 'Encoded result type.'], ['E', 'SQL execution error type.'], ['R', 'Execution requirements.'], ['RReqEncode', 'Request encoding services.'], ['RResDecode', 'Result decoding services.']),
	inputs: {
		requestSchema: typedExpressionInput('Request Schema.', schemaType('{{Req}}', '{{ReqEncoded}}', 'never', '{{RReqEncode}}')),
		resultSchema: typedExpressionInput('Result Schema.', schemaType('{{Res}}', '{{ResEncoded}}', '{{RResDecode}}', 'never')),
		execute: callbackInput('Encoded SQL execution callback.', effectReturningCallbackType('request: {{ReqEncoded}}', 'ReadonlyArray<unknown>', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Schema-backed non-empty query function.', { ts: `(request: {{Req}}) => ${effectStructuralType('readonly [{{Res}}, ...Array<{{Res}}>]', `{{E}} | ${schemaErrorType} | ${noSuchElementErrorType}`, '{{R}} | {{RReqEncode}} | {{RResDecode}}')}` }),
	source: `SqlSchema.findNonEmpty({ Request: ${marker('expression', 'requestSchema', 'Schema.Unknown')}, Result: ${marker('expression', 'resultSchema', 'Schema.Unknown')}, execute: ${marker('expression', 'execute', '() => Effect.succeed([])')} })`
})

export const SqlSchemaFindOneTemplate = defineTemplate({
	modelId: 'SqlSchemaFindOne', version: VERSION, description: 'Builds a schema-backed SQL query function that decodes the first row or fails when none exists.',
	typeParameters: typeParameters(['Req', 'Decoded request type.'], ['ReqEncoded', 'Encoded request type.'], ['Res', 'Decoded result type.'], ['ResEncoded', 'Encoded result type.'], ['E', 'SQL execution error type.'], ['R', 'Execution requirements.'], ['RReqEncode', 'Request encoding services.'], ['RResDecode', 'Result decoding services.']),
	inputs: {
		requestSchema: typedExpressionInput('Request Schema.', schemaType('{{Req}}', '{{ReqEncoded}}', 'never', '{{RReqEncode}}')),
		resultSchema: typedExpressionInput('Result Schema.', schemaType('{{Res}}', '{{ResEncoded}}', '{{RResDecode}}', 'never')),
		execute: callbackInput('Encoded SQL execution callback.', effectReturningCallbackType('request: {{ReqEncoded}}', 'ReadonlyArray<unknown>', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Schema-backed find-one function.', { ts: `(request: {{Req}}) => ${effectStructuralType('{{Res}}', `{{E}} | ${schemaErrorType} | ${noSuchElementErrorType}`, '{{R}} | {{RReqEncode}} | {{RResDecode}}')}` }),
	source: `SqlSchema.findOne({ Request: ${marker('expression', 'requestSchema', 'Schema.Unknown')}, Result: ${marker('expression', 'resultSchema', 'Schema.Unknown')}, execute: ${marker('expression', 'execute', '() => Effect.succeed([])')} })`
})

export const SqlSchemaFindOneOptionTemplate = defineTemplate({
	modelId: 'SqlSchemaFindOneOption', version: VERSION, description: 'Builds a schema-backed SQL query function returning Option.none when no row exists.',
	typeParameters: typeParameters(['Req', 'Decoded request type.'], ['ReqEncoded', 'Encoded request type.'], ['Res', 'Decoded result type.'], ['ResEncoded', 'Encoded result type.'], ['E', 'SQL execution error type.'], ['R', 'Execution requirements.'], ['RReqEncode', 'Request encoding services.'], ['RResDecode', 'Result decoding services.']),
	inputs: {
		requestSchema: typedExpressionInput('Request Schema.', schemaType('{{Req}}', '{{ReqEncoded}}', 'never', '{{RReqEncode}}')),
		resultSchema: typedExpressionInput('Result Schema.', schemaType('{{Res}}', '{{ResEncoded}}', '{{RResDecode}}', 'never')),
		execute: callbackInput('Encoded SQL execution callback.', effectReturningCallbackType('request: {{ReqEncoded}}', 'ReadonlyArray<unknown>', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Schema-backed optional find-one function.', { ts: `(request: {{Req}}) => ${effectStructuralType(optionType('{{Res}}').ts, `{{E}} | ${schemaErrorType}`, '{{R}} | {{RReqEncode}} | {{RResDecode}}')}` }),
	source: `SqlSchema.findOneOption({ Request: ${marker('expression', 'requestSchema', 'Schema.Unknown')}, Result: ${marker('expression', 'resultSchema', 'Schema.Unknown')}, execute: ${marker('expression', 'execute', '() => Effect.succeed([])')} })`
})

export const SqlSchemaVoidTemplate = defineTemplate({
	modelId: 'SqlSchemaVoid', version: VERSION, description: 'Builds a schema-encoded SQL command function that discards the SQL result.',
	typeParameters: typeParameters(['Req', 'Decoded request type.'], ['ReqEncoded', 'Encoded request type.'], ['E', 'SQL execution error type.'], ['R', 'Execution requirements.'], ['RReqEncode', 'Request encoding services.']),
	inputs: {
		requestSchema: typedExpressionInput('Request Schema.', schemaType('{{Req}}', '{{ReqEncoded}}', 'never', '{{RReqEncode}}')),
		execute: callbackInput('Encoded SQL command callback.', effectReturningCallbackType('request: {{ReqEncoded}}', 'unknown', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Schema-backed command function.', { ts: `(request: {{Req}}) => ${effectStructuralType('void', `{{E}} | ${schemaErrorType}`, '{{R}} | {{RReqEncode}}')}` }),
	source: `SqlSchema.void({ Request: ${marker('expression', 'requestSchema', 'Schema.Unknown')}, execute: ${marker('expression', 'execute', '() => Effect.void')} })`
})

export const SqlResolverOrderedTemplate = defineTemplate({
	modelId: 'SqlResolverOrdered', version: VERSION, description: 'Creates a transaction-aware batched SQL resolver whose returned rows correspond to requests by position.',
	typeParameters: typeParameters(['Req', 'Decoded request type.'], ['ReqEncoded', 'Encoded request type.'], ['Res', 'Decoded result type.'], ['ResEncoded', 'Encoded result type.'], ['E', 'Execution error type.'], ['R', 'Execution requirements.'], ['RReqEncode', 'Request encoding services.'], ['RResDecode', 'Result decoding services.']),
	inputs: {
		requestSchema: typedExpressionInput('Request Schema.', schemaType('{{Req}}', '{{ReqEncoded}}', 'never', '{{RReqEncode}}')),
		resultSchema: typedExpressionInput('Result Schema.', schemaType('{{Res}}', '{{ResEncoded}}', '{{RResDecode}}', 'never')),
		execute: callbackInput('Batched encoded query callback.', effectReturningCallbackType('requests: readonly [{{ReqEncoded}}, ...Array<{{ReqEncoded}}>]', 'ReadonlyArray<unknown>', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Ordered SQL RequestResolver.', sqlRequestResolverType('{{Req}}', '{{Res}}', `{{E}} | ${schemaErrorType}`, '{{R}} | {{RReqEncode}} | {{RResDecode}}')),
	source: `SqlResolver.ordered({ Request: ${marker('expression', 'requestSchema', 'Schema.Unknown')}, Result: ${marker('expression', 'resultSchema', 'Schema.Unknown')}, execute: ${marker('expression', 'execute', '() => Effect.succeed([])')} })`
})

export const SqlResolverFindByIdTemplate = defineTemplate({
	modelId: 'SqlResolverFindById', version: VERSION, description: 'Creates a transaction-aware batched find-by-id SQL resolver.',
	typeParameters: typeParameters(['Id', 'Decoded id type.'], ['IdEncoded', 'Encoded id type.'], ['Res', 'Decoded result type.'], ['ResEncoded', 'Encoded result type.'], ['Row', 'Raw row type.'], ['E', 'Execution error type.'], ['R', 'Execution requirements.'], ['RIdEncode', 'Id encoding services.'], ['RResDecode', 'Result decoding services.']),
	inputs: {
		idSchema: typedExpressionInput('Identifier Schema.', schemaType('{{Id}}', '{{IdEncoded}}', 'never', '{{RIdEncode}}')),
		resultSchema: typedExpressionInput('Result Schema.', schemaType('{{Res}}', '{{ResEncoded}}', '{{RResDecode}}', 'never')),
		resultId: callbackInput('Maps a decoded result and raw row back to its request id.', { ts: '(result: {{Res}}, row: {{Row}}) => {{Id}}' }),
		execute: callbackInput('Batched encoded id query.', effectReturningCallbackType('ids: readonly [{{IdEncoded}}, ...Array<{{IdEncoded}}>]', 'ReadonlyArray<{{Row}}>', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Find-by-id SQL RequestResolver.', sqlRequestResolverType('{{Id}}', '{{Res}}', `{{E}} | ${schemaErrorType} | ${noSuchElementErrorType}`, '{{R}} | {{RIdEncode}} | {{RResDecode}}')),
	source: `SqlResolver.findById({ Id: ${marker('expression', 'idSchema', 'Schema.Unknown')}, Result: ${marker('expression', 'resultSchema', 'Schema.Unknown')}, ResultId: ${marker('expression', 'resultId', '(result) => result')}, execute: ${marker('expression', 'execute', '() => Effect.succeed([])')} })`
})

export const SqlResolverVoidTemplate = defineTemplate({
	modelId: 'SqlResolverVoid', version: VERSION, description: 'Creates a transaction-aware batched SQL resolver for side-effect-only commands.',
	typeParameters: typeParameters(['Req', 'Decoded request type.'], ['ReqEncoded', 'Encoded request type.'], ['E', 'Execution error type.'], ['R', 'Execution requirements.'], ['RReqEncode', 'Request encoding services.']),
	inputs: {
		requestSchema: typedExpressionInput('Request Schema.', schemaType('{{Req}}', '{{ReqEncoded}}', 'never', '{{RReqEncode}}')),
		execute: callbackInput('Batched encoded command callback.', effectReturningCallbackType('requests: readonly [{{ReqEncoded}}, ...Array<{{ReqEncoded}}>]', 'ReadonlyArray<unknown>', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Void SQL RequestResolver.', sqlRequestResolverType('{{Req}}', 'void', `{{E}} | ${schemaErrorType}`, '{{R}} | {{RReqEncode}}')),
	source: `SqlResolver.void({ Request: ${marker('expression', 'requestSchema', 'Schema.Unknown')}, execute: ${marker('expression', 'execute', '() => Effect.succeed([])')} })`
})

export const SqlResolverRequestTemplate = defineTemplate({
	modelId: 'SqlResolverRequest', version: VERSION, description: 'Executes one payload through a SQL RequestResolver, participating in batching and transaction grouping.',
	typeParameters: typeParameters(['In', 'Request payload type.'], ['A', 'Request result type.'], ['E', 'Resolver error type.'], ['R', 'Resolver requirements.']),
	inputs: {
		payload: effectValueInput('Resolver request payload.', { ts: '{{In}}' }),
		resolver: typedExpressionInput('SQL RequestResolver.', sqlRequestResolverType('{{In}}', '{{A}}', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Batched SQL request Effect.', effectType('{{A}}', `{{E}} | ${schemaErrorType}`, '{{R}}')),
	source: `SqlResolver.request(${marker('expression', 'payload', 'undefined')}, ${marker('expression', 'resolver', 'resolver')})`
})

export const SqlModelMakeRepositoryTemplate = defineTemplate({
	modelId: 'SqlModelMakeRepository', version: VERSION, description: 'Derives a schema-aware CRUD repository from an Effect v4 Model and SQL table metadata.',
	typeParameters: typeParameters(['Row', 'Model row type.'], ['Insert', 'Model insert type.'], ['Update', 'Model update type.'], ['Id', 'Model id type.'], ['RModel', 'Union of model Schema services.']),
	inputs: {
		model: modelInput('Schema Model.', '{{Row}}', '{{Insert}}', '{{Update}}', '{{Id}}', '{{RModel}}'),
		table: stringInput('Database table name.'), spanPrefix: stringInput('Tracing span prefix.'),
		idColumn: stringInput('Model id field / database id column.'),
		softDeleteColumn: valueInput('Optional soft-delete column.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Effect producing a SQL CRUD repository.', effectType(sqlRepositoryType('{{Row}}', '{{Insert}}', '{{Update}}', '{{Id}}', '{{RModel}}').ts, 'never', sqlClientRequirement)),
	source: `SqlModel.makeRepository(${marker('expression', 'model', 'Model')}, { tableName: ${marker('string', 'table', '"items"')}, spanPrefix: ${marker('string', 'spanPrefix', '"ItemsRepo"')}, idColumn: ${marker('string', 'idColumn', '"id"')}, softDeleteColumn: ${marker('expression', 'softDeleteColumn', 'undefined')} })`
})

export const SqlModelMakeResolversTemplate = defineTemplate({
	modelId: 'SqlModelMakeResolvers', version: VERSION, description: 'Derives transaction-aware batched SQL resolvers for a schema Model.',
	typeParameters: typeParameters(['Row', 'Model row type.'], ['Insert', 'Model insert type.'], ['Update', 'Model update type.'], ['Id', 'Model id type.'], ['RModel', 'Union of model Schema services.']),
	inputs: {
		model: modelInput('Schema Model.', '{{Row}}', '{{Insert}}', '{{Update}}', '{{Id}}', '{{RModel}}'),
		table: stringInput('Database table name.'), spanPrefix: stringInput('Tracing span prefix.'),
		idColumn: stringInput('Model id field / database id column.'),
		softDeleteColumn: valueInput('Optional soft-delete column.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Effect producing SQL model resolvers.', effectType(sqlResolversType('{{Row}}', '{{Insert}}', '{{Id}}', '{{RModel}}').ts, 'never', `${sqlClientRequirement} | ${sqlScopeRequirement}`)),
	source: `SqlModel.makeResolvers(${marker('expression', 'model', 'Model')}, { tableName: ${marker('string', 'table', '"items"')}, spanPrefix: ${marker('string', 'spanPrefix', '"ItemsRepo"')}, idColumn: ${marker('string', 'idColumn', '"id"')}, softDeleteColumn: ${marker('expression', 'softDeleteColumn', 'undefined')} })`
})

export const SqlRepositoryInsertTemplate = defineTemplate({
	modelId: 'SqlRepositoryInsert', version: VERSION, description: 'Inserts one value through a SqlModel-derived repository.',
	typeParameters: typeParameters(['Row', 'Repository row type.'], ['Insert', 'Repository insert type.'], ['Update', 'Repository update type.'], ['Id', 'Repository id type.'], ['R', 'Repository schema requirements.']),
	inputs: { repository: repositoryInput('SQL repository.', '{{Row}}', '{{Insert}}', '{{Update}}', '{{Id}}', '{{R}}'), value: effectValueInput('Insert value.', { ts: '{{Insert}}' }) },
	output: expressionOutput('Repository insert Effect.', effectType('{{Row}}', `${schemaErrorType} | ${sqlErrorType}`, '{{R}}')),
	source: `${marker('expression', 'repository', 'repository')}.insert(${marker('expression', 'value', '{}')})`
})

export const SqlRepositoryUpdateTemplate = defineTemplate({
	modelId: 'SqlRepositoryUpdate', version: VERSION, description: 'Updates one value through a SqlModel-derived repository.',
	typeParameters: typeParameters(['Row', 'Repository row type.'], ['Insert', 'Repository insert type.'], ['Update', 'Repository update type.'], ['Id', 'Repository id type.'], ['R', 'Repository schema requirements.']),
	inputs: { repository: repositoryInput('SQL repository.', '{{Row}}', '{{Insert}}', '{{Update}}', '{{Id}}', '{{R}}'), value: effectValueInput('Update value.', { ts: '{{Update}}' }) },
	output: expressionOutput('Repository update Effect.', effectType('{{Row}}', `${schemaErrorType} | ${sqlErrorType}`, '{{R}}')),
	source: `${marker('expression', 'repository', 'repository')}.update(${marker('expression', 'value', '{}')})`
})

export const SqlRepositoryFindByIdTemplate = defineTemplate({
	modelId: 'SqlRepositoryFindById', version: VERSION, description: 'Finds one row by id through a SqlModel-derived repository.',
	typeParameters: typeParameters(['Row', 'Repository row type.'], ['Insert', 'Repository insert type.'], ['Update', 'Repository update type.'], ['Id', 'Repository id type.'], ['R', 'Repository schema requirements.']),
	inputs: { repository: repositoryInput('SQL repository.', '{{Row}}', '{{Insert}}', '{{Update}}', '{{Id}}', '{{R}}'), id: effectValueInput('Identifier value.', { ts: '{{Id}}' }) },
	output: expressionOutput('Repository find-by-id Effect.', effectType('{{Row}}', `${noSuchElementErrorType} | ${schemaErrorType} | ${sqlErrorType}`, '{{R}}')),
	source: `${marker('expression', 'repository', 'repository')}.findById(${marker('expression', 'id', 'undefined')})`
})

export const SqlRepositoryDeleteTemplate = defineTemplate({
	modelId: 'SqlRepositoryDelete', version: VERSION, description: 'Deletes one row by id through a SqlModel-derived repository.',
	typeParameters: typeParameters(['Row', 'Repository row type.'], ['Insert', 'Repository insert type.'], ['Update', 'Repository update type.'], ['Id', 'Repository id type.'], ['R', 'Repository schema requirements.']),
	inputs: { repository: repositoryInput('SQL repository.', '{{Row}}', '{{Insert}}', '{{Update}}', '{{Id}}', '{{R}}'), id: effectValueInput('Identifier value.', { ts: '{{Id}}' }) },
	output: expressionOutput('Repository delete Effect.', effectType('void', `${schemaErrorType} | ${sqlErrorType}`, '{{R}}')),
	source: `${marker('expression', 'repository', 'repository')}.delete(${marker('expression', 'id', 'undefined')})`
})

export const SqlWithTransactionTemplate = defineTemplate({
	modelId: 'SqlWithTransaction', version: VERSION, description: 'Runs an Effect inside the active SQL client transaction; nested transactions use savepoints when supported.',
	typeParameters: typeParameters(['A', 'Transaction success type.'], ['E', 'Transaction error type.'], ['R', 'Transaction requirements.']),
	inputs: { source: effectSourceInput('Effect to execute transactionally.', effectType('{{A}}', '{{E}}', '{{R}}')) },
	output: expressionOutput('Transactional Effect.', effectType('{{A}}', `{{E}} | ${sqlErrorType}`, `{{R}} | ${sqlClientRequirement}`)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql.withTransaction(${marker('expression', 'source', 'Effect.void')})\n})`
})

export const SqlMigratorFromRecordTemplate = defineTemplate({
	modelId: 'SqlMigratorFromRecord', version: VERSION, description: 'Creates a sorted SQL migration loader from a record keyed by <id>_<name>.',
	inputs: { migrations: valueInput('Record of migration Effects requiring SqlClient.', { ts: `Record<string, ${effectStructuralType('void', 'unknown', sqlClientRequirement)}>` }) },
	output: expressionOutput('SQL migration Loader.', sqlMigrationLoaderType('never')),
	source: `Migrator.fromRecord(${marker('expression', 'migrations', '{}')})`
})

export const SqlMigratorRunTemplate = defineTemplate({
	modelId: 'SqlMigratorRun', version: VERSION, description: 'Runs pending SQL migrations transactionally and returns the migrations applied by this run.',
	typeParameters: typeParameters(['RLoader', 'Migration loader requirements.']),
	inputs: { loader: typedExpressionInput('Migration Loader.', sqlMigrationLoaderType('{{RLoader}}')), table: stringInput('Migrations metadata table name.') },
	output: expressionOutput('Migration execution Effect.', effectType('ReadonlyArray<readonly [id: number, name: string]>', `${migrationErrorType} | ${sqlErrorType}`, `${sqlClientRequirement} | {{RLoader}}`)),
	source: `Migrator.make({})({ loader: ${marker('expression', 'loader', 'Effect.succeed([])')}, table: ${marker('string', 'table', '"effect_sql_migrations"')} })`
})

export const PgClientLayerTemplate = defineTemplate({
	modelId: 'PgClientLayer', version: VERSION, description: 'Creates a PostgreSQL connection-pool Layer that provides both PgClient and generic SqlClient.',
	inputs: { config: valueInput('PgPoolConfig including URL/host, pool limits, timeouts, and transforms.', { ts: '{ readonly url?: unknown; readonly host?: string; readonly port?: number; readonly database?: string; readonly username?: string; readonly maxConnections?: number; readonly minConnections?: number; readonly connectTimeout?: unknown }' }) },
	output: expressionOutput('PostgreSQL client Layer.', layerType(`${pgClientRequirement} | ${sqlClientRequirement}`, sqlErrorType, 'never')),
	source: `PgClient.layer(${marker('expression', 'config', '{}')})`
})

export const EffectSqlSourceFileTemplate = defineTemplate({
	modelId: 'EffectSqlSourceFile', version: VERSION, description: 'Builds an Effect v4 SQL source file with generic SQL and PostgreSQL namespaces in scope.',
	inputs: { body: statementCollectionInput('Top-level SQL declarations and application statements.') },
	output: { kind: 'sourceFile', description: 'Complete Effect v4 SQL source file.' },
	source: `import { Effect, Layer, Option, Schedule, Schema, Stream } from "effect"\nimport { Migrator, SqlClient, SqlError, SqlModel, SqlResolver, SqlSchema, Statement } from "effect/unstable/sql"\nimport { PgClient } from "@effect/sql-pg"\n\n${marker('statement', 'body', 'const program = Effect.void')}`
})

export const effectV4SqlFoundationalGraphTemplateInputs = [
	SqlUnsafeQueryTemplate,
	SqlStatementStreamTemplate,
	SqlStatementValuesTemplate,
	SqlStatementWithoutTransformTemplate,
	SqlStatementUnpreparedTemplate,
	SqlStatementRawTemplate,
	SqlStatementCompileTemplate,
	SqlSelectAllTemplate,
	SqlSelectByIdTemplate,
	SqlSelectByIdsTemplate,
	SqlInsertRecordTemplate,
	SqlInsertRecordReturningTemplate,
	SqlUpdateByIdTemplate,
	SqlUpdateByIdReturningTemplate,
	SqlDeleteByIdTemplate,
	SqlSchemaFindAllTemplate,
	SqlSchemaFindNonEmptyTemplate,
	SqlSchemaFindOneTemplate,
	SqlSchemaFindOneOptionTemplate,
	SqlSchemaVoidTemplate,
	SqlResolverOrderedTemplate,
	SqlResolverFindByIdTemplate,
	SqlResolverVoidTemplate,
	SqlResolverRequestTemplate,
	SqlModelMakeRepositoryTemplate,
	SqlModelMakeResolversTemplate,
	SqlRepositoryInsertTemplate,
	SqlRepositoryUpdateTemplate,
	SqlRepositoryFindByIdTemplate,
	SqlRepositoryDeleteTemplate,
	SqlWithTransactionTemplate,
	SqlMigratorFromRecordTemplate,
	SqlMigratorRunTemplate,
	PgClientLayerTemplate,
	EffectSqlSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
