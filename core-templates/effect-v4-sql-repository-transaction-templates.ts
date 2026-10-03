import { defineTemplate } from './sample-definition.js'
import {
	effectSourceInput,
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
	streamType,
	stringInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	migrationErrorType,
	schemaErrorType,
	sqlClientRequirement,
	sqlErrorType,
	sqlMigrationLoaderType,
	sqlModelType,
	sqlRepositoryType,
	sqlResolversType
} from './effect-sql-template-helpers.js'

/**
 * Effect v4 SQL / repository / transaction production compositions.
 *
 * These intentionally compose the generic SQL client rather than a particular
 * driver, except where a client Layer is supplied as an input.
 */

const VERSION = '1.0.0' as const

const layerInput = (description: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, layerType(provided, error, requirements))
const modelInput = (
	description: string,
	row = 'unknown',
	insert = 'unknown',
	update = 'unknown',
	id = 'unknown',
	requirements = 'never'
) => typedExpressionInput(description, sqlModelType(row, insert, update, id, requirements))

export const SqlRepositoryServiceLayerTemplate = defineTemplate({
	modelId: 'SqlRepositoryServiceLayer', version: VERSION,
	description: 'Builds a Context service Layer from a SqlModel-derived CRUD repository, optionally enabling soft deletes.',
	typeParameters: typeParameters(
		['I', 'Provided service identifier type.'], ['S', 'Repository service implementation type.'],
		['Row', 'Model row type.'], ['Insert', 'Model insert type.'], ['Update', 'Model update type.'], ['Id', 'Model id type.'],
		['RModel', 'Union of Model schema services.']
	),
	inputs: {
		tag: typedExpressionInput('Context service key for the repository.', tagType('{{I}}', '{{S}}')),
		model: modelInput('Schema Model.', '{{Row}}', '{{Insert}}', '{{Update}}', '{{Id}}', '{{RModel}}'),
		table: stringInput('Database table name.'), spanPrefix: stringInput('Repository tracing span prefix.'),
		idColumn: stringInput('Model id field / database id column.'),
		softDeleteColumn: valueInput('Optional soft-delete column.', { ts: 'string | undefined' }),
		makeService: callbackInput('Maps the derived repository to the public service implementation.', {
			ts: `(repository: ${sqlRepositoryType('{{Row}}', '{{Insert}}', '{{Update}}', '{{Id}}', '{{RModel}}').ts}) => {{S}}`
		})
	},
	output: expressionOutput('SQL repository service Layer.', layerType('{{I}}', 'never', sqlClientRequirement)),
	source: `Layer.effect(${marker('expression', 'tag', 'Repository')}, Effect.map(SqlModel.makeRepository(${marker('expression', 'model', 'Model')}, { tableName: ${marker('string', 'table', '"items"')}, spanPrefix: ${marker('string', 'spanPrefix', '"ItemsRepo"')}, idColumn: ${marker('string', 'idColumn', '"id"')}, softDeleteColumn: ${marker('expression', 'softDeleteColumn', 'undefined')} }), ${marker('expression', 'makeService', 'repository => repository')}))`
})

export const SqlBatchedRepositoryServiceLayerTemplate = defineTemplate({
	modelId: 'SqlBatchedRepositoryServiceLayer', version: VERSION,
	description: 'Builds a scoped repository service from SqlModel batched RequestResolvers so concurrent calls can coalesce into SQL batches.',
	typeParameters: typeParameters(
		['I', 'Provided service identifier type.'], ['S', 'Repository service implementation type.'],
		['Row', 'Model row type.'], ['Insert', 'Model insert type.'], ['Update', 'Model update type.'], ['Id', 'Model id type.'],
		['RModel', 'Union of Model schema services.']
	),
	inputs: {
		tag: typedExpressionInput('Context service key for the batched repository.', tagType('{{I}}', '{{S}}')),
		model: modelInput('Schema Model.', '{{Row}}', '{{Insert}}', '{{Update}}', '{{Id}}', '{{RModel}}'),
		table: stringInput('Database table name.'), spanPrefix: stringInput('Resolver tracing span prefix.'),
		idColumn: stringInput('Model id field / database id column.'),
		softDeleteColumn: valueInput('Optional soft-delete column.', { ts: 'string | undefined' }),
		makeService: callbackInput('Maps the generated resolver set to the public service implementation.', {
			ts: `(resolvers: ${sqlResolversType('{{Row}}', '{{Insert}}', '{{Id}}', '{{RModel}}').ts}) => {{S}}`
		})
	},
	output: expressionOutput('Batched SQL repository service Layer.', layerType('{{I}}', 'never', sqlClientRequirement)),
	source: `Layer.effect(${marker('expression', 'tag', 'Repository')}, Effect.map(SqlModel.makeResolvers(${marker('expression', 'model', 'Model')}, { tableName: ${marker('string', 'table', '"items"')}, spanPrefix: ${marker('string', 'spanPrefix', '"ItemsRepo"')}, idColumn: ${marker('string', 'idColumn', '"id"')}, softDeleteColumn: ${marker('expression', 'softDeleteColumn', 'undefined')} }), ${marker('expression', 'makeService', 'resolvers => resolvers')}))`
})

export const SqlTransactionPairTemplate = defineTemplate({
	modelId: 'SqlTransactionPair', version: VERSION,
	description: 'Runs a first Effect and an Effectful continuation atomically in one SQL transaction.',
	typeParameters: typeParameters(['A', 'First success type.'], ['B', 'Final success type.'], ['E1', 'First error type.'], ['E2', 'Continuation error type.'], ['R1', 'First requirements.'], ['R2', 'Continuation requirements.']),
	inputs: {
		first: effectSourceInput('First transactional operation.', effectType('{{A}}', '{{E1}}', '{{R1}}')),
		second: callbackInput('Effectful continuation run in the same transaction.', effectReturningCallbackType('value: {{A}}', '{{B}}', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Two-step transactional Effect.', effectType('{{B}}', `{{E1}} | {{E2}} | ${sqlErrorType}`, `{{R1}} | {{R2}} | ${sqlClientRequirement}`)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql.withTransaction(Effect.flatMap(${marker('expression', 'first', 'Effect.void')}, ${marker('expression', 'second', 'value => Effect.succeed(value)')}))\n})`
})

export const SqlTransactionalReadModifyWriteTemplate = defineTemplate({
	modelId: 'SqlTransactionalReadModifyWrite', version: VERSION,
	description: 'Loads a value, derives an update, and persists it inside one SQL transaction to avoid split read/write semantics.',
	typeParameters: typeParameters(['A', 'Loaded value type.'], ['B', 'Derived update type.'], ['C', 'Saved value type.'], ['E1', 'Load error type.'], ['E2', 'Save error type.'], ['R1', 'Load requirements.'], ['R2', 'Save requirements.']),
	inputs: {
		load: effectSourceInput('Transactional read Effect.', effectType('{{A}}', '{{E1}}', '{{R1}}')),
		modify: callbackInput('Pure update derivation.', { ts: '(value: {{A}}) => {{B}}' }),
		save: callbackInput('Transactional write Effect.', effectReturningCallbackType('update: {{B}}', '{{C}}', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Transactional read-modify-write Effect.', effectType('{{C}}', `{{E1}} | {{E2}} | ${sqlErrorType}`, `{{R1}} | {{R2}} | ${sqlClientRequirement}`)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql.withTransaction(Effect.flatMap(${marker('expression', 'load', 'Effect.succeed(undefined)')}, value => (${marker('expression', 'save', 'update => Effect.succeed(update)')})(${marker('expression', 'modify', 'value => value')}(value))))\n})`
})

export const SqlTransactionalCreateWithAuditTemplate = defineTemplate({
	modelId: 'SqlTransactionalCreateWithAudit', version: VERSION,
	description: 'Creates a value and writes its audit record in the same SQL transaction, returning the created value.',
	typeParameters: typeParameters(['A', 'Created value type.'], ['E1', 'Create error type.'], ['E2', 'Audit error type.'], ['R1', 'Create requirements.'], ['R2', 'Audit requirements.']),
	inputs: {
		create: effectSourceInput('Transactional create Effect.', effectType('{{A}}', '{{E1}}', '{{R1}}')),
		audit: callbackInput('Audit write performed before commit.', effectReturningCallbackType('value: {{A}}', 'unknown', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Transactional create-and-audit Effect.', effectType('{{A}}', `{{E1}} | {{E2}} | ${sqlErrorType}`, `{{R1}} | {{R2}} | ${sqlClientRequirement}`)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql.withTransaction(Effect.tap(${marker('expression', 'create', 'Effect.succeed(undefined)')}, ${marker('expression', 'audit', '() => Effect.void')}))\n})`
})

export const SqlTransactionThenEffectTemplate = defineTemplate({
	modelId: 'SqlTransactionThenEffect', version: VERSION,
	description: 'Commits a SQL transaction first, then runs an Effectful follow-up such as event publication or cache invalidation.',
	typeParameters: typeParameters(['A', 'Committed value type.'], ['B', 'Follow-up success type.'], ['E1', 'Transaction error type.'], ['E2', 'Follow-up error type.'], ['R1', 'Transaction requirements.'], ['R2', 'Follow-up requirements.']),
	inputs: {
		transaction: effectSourceInput('Effect to commit before the follow-up begins.', effectType('{{A}}', '{{E1}}', '{{R1}}')),
		afterCommit: callbackInput('Effectful action that runs only after a successful commit.', effectReturningCallbackType('value: {{A}}', '{{B}}', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('Commit-then-follow-up Effect.', effectType('{{B}}', `{{E1}} | {{E2}} | ${sqlErrorType}`, `{{R1}} | {{R2}} | ${sqlClientRequirement}`)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\tconst value = yield* sql.withTransaction(${marker('expression', 'transaction', 'Effect.succeed(undefined)')})\n\treturn yield* (${marker('expression', 'afterCommit', 'value => Effect.succeed(value)')})(value)\n})`
})

export const SqlRetryableTransactionTemplate = defineTemplate({
	modelId: 'SqlRetryableTransaction', version: VERSION,
	description: 'Retries a SQL transaction only for structured SqlError values whose reason is marked retryable, using a caller-supplied backoff Schedule.',
	typeParameters: typeParameters(['A', 'Transaction success type.'], ['E', 'Non-SQL transaction error type.'], ['R', 'Transaction requirements.'], ['Out', 'Schedule output type.'], ['RSchedule', 'Schedule requirements.']),
	inputs: {
		transaction: effectSourceInput('Transactional work to retry.', effectType('{{A}}', '{{E}}', '{{R}}')),
		schedule: typedExpressionInput('Backoff Schedule consuming transaction errors.', scheduleType('{{Out}}', `{{E}} | ${sqlErrorType}`, '{{RSchedule}}'))
	},
	output: expressionOutput('Retryable SQL transaction Effect.', effectType('{{A}}', `{{E}} | ${sqlErrorType}`, `{{R}} | {{RSchedule}} | ${sqlClientRequirement}`)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\tconst schedule = Schedule.while(${marker('expression', 'schedule', 'Schedule.recurs(3)')}, ({ input }) => SqlError.isSqlError(input) && input.isRetryable)\n\treturn yield* Effect.retry(sql.withTransaction(${marker('expression', 'transaction', 'Effect.void')}), schedule)\n})`
})

export const SqlObservedTransactionTemplate = defineTemplate({
	modelId: 'SqlObservedTransaction', version: VERSION,
	description: 'Runs transactional work inside an application-level tracing span while preserving SQL transaction errors and requirements.',
	typeParameters: typeParameters(['A', 'Transaction success type.'], ['E', 'Transaction error type.'], ['R', 'Transaction requirements.']),
	inputs: {
		transaction: effectSourceInput('Transactional work.', effectType('{{A}}', '{{E}}', '{{R}}')),
		spanName: effectValueInput('Application-level span name.', { ts: 'string' })
	},
	output: expressionOutput('Traced SQL transaction Effect.', effectType('{{A}}', `{{E}} | ${sqlErrorType}`, `{{R}} | ${sqlClientRequirement}`)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* Effect.withSpan(sql.withTransaction(${marker('expression', 'transaction', 'Effect.void')}), ${marker('expression', 'spanName', '"repository.transaction"')})\n})`
})

export const SqlTransactionalBatchWriteTemplate = defineTemplate({
	modelId: 'SqlTransactionalBatchWrite', version: VERSION,
	description: 'Runs a collection of Effectful writes sequentially inside one SQL transaction.',
	typeParameters: typeParameters(['A', 'Batch input type.'], ['E', 'Write error type.'], ['R', 'Write requirements.']),
	inputs: {
		values: effectValueInput('Values to write.', { ts: 'Iterable<{{A}}>' }),
		write: callbackInput('Effectful write performed for each value.', effectReturningCallbackType('value: {{A}}, index: number', 'unknown', '{{E}}', '{{R}}'))
	},
	output: expressionOutput('Transactional batch-write Effect.', effectType('void', `{{E}} | ${sqlErrorType}`, `{{R}} | ${sqlClientRequirement}`)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\treturn yield* sql.withTransaction(Effect.forEach(${marker('expression', 'values', '[]')}, ${marker('expression', 'write', '() => Effect.void')}, { discard: true }))\n})`
})

export const SqlHealthCheckTemplate = defineTemplate({
	modelId: 'SqlHealthCheck', version: VERSION,
	description: 'Performs a minimal parameter-free SQL round trip suitable for liveness or dependency health checks.',
	inputs: {},
	output: expressionOutput('SQL health-check Effect.', effectType('void', sqlErrorType, sqlClientRequirement)),
	source: `Effect.gen(function* () {\n\tconst sql = yield* SqlClient.SqlClient\n\tyield* sql\`select 1\`\n})`
})

export const SqlMigratedClientLayerTemplate = defineTemplate({
	modelId: 'SqlMigratedClientLayer', version: VERSION,
	description: 'Runs SQL migrations while acquiring a client Layer and retains that client Layer for downstream repositories and services.',
	typeParameters: typeParameters(['P', 'Services provided by the SQL client Layer.'], ['E', 'Client Layer error type.'], ['R', 'Client Layer requirements.'], ['RLoader', 'Migration loader requirements.']),
	inputs: {
		clientLayer: layerInput('SQL client Layer that provides SqlClient.', '{{P}}', '{{E}}', '{{R}}'),
		loader: typedExpressionInput('Migration Loader.', sqlMigrationLoaderType('{{RLoader}}')),
		table: stringInput('Migrations metadata table name.')
	},
	output: expressionOutput('Migrated SQL client Layer.', layerType('{{P}}', `{{E}} | ${migrationErrorType} | ${sqlErrorType}`, '{{R}} | {{RLoader}}')),
	source: `Layer.provideMerge(Layer.effectDiscard(Migrator.make({})({ loader: ${marker('expression', 'loader', 'Effect.succeed([])')}, table: ${marker('string', 'table', '"effect_sql_migrations"')} })), ${marker('expression', 'clientLayer', 'Layer.empty')})`
})

export const SqlPaginatedReadStreamTemplate = defineTemplate({
	modelId: 'SqlPaginatedReadStream', version: VERSION,
	description: 'Builds a lazy paginated Stream whose page loader may issue SQL queries and returns rows plus the next page state.',
	typeParameters: typeParameters(['S', 'Pagination state type.'], ['A', 'Row type.'], ['E', 'Page-load error type.'], ['R', 'Page-load requirements.']),
	inputs: {
		initial: valueInput('Initial pagination state.', { ts: '{{S}}' }),
		page: callbackInput('Effectful SQL page loader returning [rows, Option<nextState>].', effectReturningCallbackType('state: {{S}}', 'readonly [ReadonlyArray<{{A}}>, { readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: {{S}} }]', '{{E}}', `{{R}} | ${sqlClientRequirement}`))
	},
	output: expressionOutput('Paginated SQL Stream.', streamType('{{A}}', '{{E}}', `{{R}} | ${sqlClientRequirement}`)),
	source: `Stream.paginate(${marker('expression', 'initial', 'undefined')}, ${marker('expression', 'page', 'state => Effect.succeed([[state], Option.none()] as const)')})`
})

export const effectV4SqlRepositoryTransactionGraphTemplateInputs = [
	SqlRepositoryServiceLayerTemplate,
	SqlBatchedRepositoryServiceLayerTemplate,
	SqlTransactionPairTemplate,
	SqlTransactionalReadModifyWriteTemplate,
	SqlTransactionalCreateWithAuditTemplate,
	SqlTransactionThenEffectTemplate,
	SqlRetryableTransactionTemplate,
	SqlObservedTransactionTemplate,
	SqlTransactionalBatchWriteTemplate,
	SqlHealthCheckTemplate,
	SqlMigratedClientLayerTemplate,
	SqlPaginatedReadStreamTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
