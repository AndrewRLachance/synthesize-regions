import type { TypeDescriptor } from '../src/templates.js'
import { nominalType } from './effect-template-helpers.js'

/** Shared Effect v4 SQL template descriptors. */
export const sqlClientRequirement = '{ readonly __sqlClientRequirement: "SqlClient" }'
export const pgClientRequirement = '{ readonly __pgClientRequirement: "PgClient" }'
export const sqlScopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'

export const sqlErrorType = '{ readonly _tag: "SqlError"; readonly isRetryable: boolean; readonly reason: { readonly _tag: string } }'
export const schemaErrorType = '{ readonly _tag: "SchemaError" }'
export const noSuchElementErrorType = '{ readonly _tag: "NoSuchElementError" }'
export const migrationErrorType = '{ readonly _tag: "MigrationError"; readonly kind: string; readonly message: string }'

export const sqlClientType = (): TypeDescriptor => nominalType('effect/unstable/sql/SqlClient')
export const pgClientType = (): TypeDescriptor => nominalType('@effect/sql-pg/PgClient')
export const sqlFragmentType = (): TypeDescriptor => nominalType('effect/unstable/sql/Statement/Fragment')
export const sqlStatementType = (row = 'Record<string, unknown>'): TypeDescriptor =>
	nominalType('effect/unstable/sql/Statement', { sqlRow: row })
export const sqlInsertHelperType = (): TypeDescriptor => nominalType('effect/unstable/sql/Statement/RecordInsertHelper')
export const sqlUpdateHelperType = (): TypeDescriptor => nominalType('effect/unstable/sql/Statement/RecordUpdateHelperSingle')

export const sqlModelType = (
	row = 'unknown',
	insert = 'unknown',
	update = 'unknown',
	id = 'unknown',
	requirements = 'never'
): TypeDescriptor => nominalType('effect/unstable/schema/Model', {
	modelRow: row,
	modelInsert: insert,
	modelUpdate: update,
	modelId: id,
	modelRequirements: requirements
})

export const sqlRepositoryType = (
	row = 'unknown',
	insert = 'unknown',
	update = 'unknown',
	id = 'unknown',
	requirements = 'never'
): TypeDescriptor => nominalType('effect/unstable/sql/Repository', {
	repositoryRow: row,
	repositoryInsert: insert,
	repositoryUpdate: update,
	repositoryId: id,
	repositoryRequirements: requirements
})

export const sqlResolversType = (
	row = 'unknown',
	insert = 'unknown',
	id = 'unknown',
	requirements = 'never'
): TypeDescriptor => nominalType('effect/unstable/sql/ModelResolvers', {
	resolverRow: row,
	resolverInsert: insert,
	resolverId: id,
	resolverRequirements: requirements
})

export const sqlRequestResolverType = (
	input = 'unknown',
	output = 'unknown',
	error = 'unknown',
	requirements = 'never'
): TypeDescriptor => nominalType('effect/RequestResolver', {
	sqlRequestInput: input,
	sqlRequestOutput: output,
	sqlRequestError: error,
	sqlRequestRequirements: requirements
})

export const sqlMigrationLoaderType = (requirements = 'never'): TypeDescriptor =>
	nominalType('effect/unstable/sql/Migrator/Loader', { migrationRequirements: requirements })
