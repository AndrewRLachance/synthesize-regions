import { defineTemplate } from '../../../authoring/define-template.js'
import { drizzleBatchReplicaGraphTemplateInputs } from './drizzle-batch-replica-templates.js'
import {
	type AnyDrizzleTemplateDefinitionInput,
	callbackInput,
	databaseInput,
	drizzleDatabaseType,
	expressionInput,
	expressionOutput,
	marker,
	objectInput,
	sqlInput
} from './drizzle-template-helpers.js'

export const DrizzleDatabaseTemplate = defineTemplate({
	modelId: 'DrizzleDatabase', version: '1.0.0',
	description: 'Creates a driver-specific Drizzle database with drizzle(connectionOrConfig). The drizzle import remains driver-specific.',
	inputs: { connection: expressionInput('Driver client, connection string, or driver-specific drizzle config.') },
	output: expressionOutput('Drizzle database instance.', drizzleDatabaseType()),
	source: `drizzle(${marker('expression', 'connection', 'undefined')})`
})

export const DrizzleDatabaseWithConfigTemplate = defineTemplate({
	modelId: 'DrizzleDatabaseWithConfig', version: '1.0.0',
	description: 'Creates a Drizzle database from a v1 driver config object, including relations and optional JIT mapper settings where supported.',
	inputs: { config: objectInput('Driver-specific drizzle configuration.') },
	output: expressionOutput('Configured Drizzle database instance.', drizzleDatabaseType()),
	source: `drizzle(${marker('expression', 'config', '{}')})`
})

export const DrizzleTransactionTemplate = defineTemplate({
	modelId: 'DrizzleTransaction', version: '1.0.0',
	description: 'Runs an async callback inside a Drizzle transaction.',
	inputs: { db: databaseInput(), body: callbackInput('Async transaction callback receiving tx.') },
	output: expressionOutput('Transaction result promise.'),
	source: `${marker('expression', 'db', 'db')}.transaction(${marker('expression', 'body', 'async (tx) => undefined')})`
})

export const DrizzleTransactionConfigTemplate = defineTemplate({
	modelId: 'DrizzleTransactionConfig', version: '1.0.0',
	description: 'Runs a transaction with dialect-specific configuration such as isolationLevel, accessMode, or deferrable.',
	inputs: { db: databaseInput(), body: callbackInput('Async transaction callback receiving tx.'), config: objectInput('Dialect transaction configuration.') },
	output: expressionOutput('Configured transaction result promise.'),
	source: `${marker('expression', 'db', 'db')}.transaction(${marker('expression', 'body', 'async (tx) => undefined')}, ${marker('expression', 'config', '{}')})`
})

export const DrizzleNestedTransactionTemplate = defineTemplate({
	modelId: 'DrizzleNestedTransaction', version: '1.0.0',
	description: 'Creates a nested transaction/savepoint from an existing transaction object.',
	inputs: { tx: expressionInput('Existing transaction object.'), body: callbackInput('Nested async transaction callback.') },
	output: expressionOutput('Nested transaction result promise.'),
	source: `${marker('expression', 'tx', 'tx')}.transaction(${marker('expression', 'body', 'async (tx2) => undefined')})`
})

export const DrizzleTransactionRollbackTemplate = defineTemplate({
	modelId: 'DrizzleTransactionRollback', version: '1.0.0',
	description: 'Rolls back the current Drizzle transaction by invoking tx.rollback().',
	inputs: { tx: expressionInput('Current transaction object.') },
	output: expressionOutput('Rollback expression.'),
	source: `${marker('expression', 'tx', 'tx')}.rollback()`
})

export const DrizzleExecuteSqlTemplate = defineTemplate({
	modelId: 'DrizzleExecuteSql', version: '1.0.0',
	description: 'Executes a Drizzle SQL fragment directly through db.execute().',
	inputs: { db: databaseInput(), sql: sqlInput('SQL fragment to execute.') },
	output: expressionOutput('Driver execution result.'),
	source: `${marker('expression', 'db', 'db')}.execute(${marker('expression', 'sql', 'sql.raw("select 1")')})`
})

export const drizzleRuntimeGraphTemplateInputs = [
	DrizzleDatabaseTemplate,
	DrizzleDatabaseWithConfigTemplate,
	DrizzleTransactionTemplate,
	DrizzleTransactionConfigTemplate,
	DrizzleNestedTransactionTemplate,
	DrizzleTransactionRollbackTemplate,
	DrizzleExecuteSqlTemplate,
	...drizzleBatchReplicaGraphTemplateInputs
] satisfies ReadonlyArray<AnyDrizzleTemplateDefinitionInput>
