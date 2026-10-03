import { defineTemplate } from '../../../authoring/define-template.js'
import {
	type AnyDrizzleTemplateDefinitionInput,
	arrayInput,
	callbackInput,
	columnBuilderInput,
	drizzleColumnBuilderType,
	drizzleTableType,
	expressionInput,
	expressionOutput,
	marker,
	objectInput,
	sqlInput,
	stringInput,
	typeCodeInput
} from './drizzle-template-helpers.js'

const simpleColumn = (modelId: string, fn: string, data: string, dialect: string, description: string) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	inputs: {},
	output: expressionOutput('Drizzle column builder.', drizzleColumnBuilderType(data, dialect)),
	source: `${fn}()`
})

const configuredColumn = (modelId: string, fn: string, data: string, dialect: string, description: string, fallback = '{}') => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	inputs: { config: objectInput('Column configuration object.') },
	output: expressionOutput('Configured Drizzle column builder.', drizzleColumnBuilderType(data, dialect)),
	source: `${fn}(${marker('expression', 'config', fallback)})`
})

const tableTemplate = (modelId: string, fn: string, dialect: string, description: string) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	inputs: { name: stringInput('Database table name.'), columns: objectInput('Column builder map keyed by TypeScript property name.') },
	output: expressionOutput('Drizzle table.', drizzleTableType('unknown', 'unknown', dialect)),
	source: `${fn}(${marker('string', 'name', '"table"')}, ${marker('expression', 'columns', '{}')})`
})

export const DrizzlePgTableTemplate = tableTemplate('DrizzlePgTable', 'pgTable', 'postgres', 'Creates a PostgreSQL table.')
export const DrizzleMysqlTableTemplate = tableTemplate('DrizzleMysqlTable', 'mysqlTable', 'mysql', 'Creates a MySQL table.')
export const DrizzleSqliteTableTemplate = tableTemplate('DrizzleSqliteTable', 'sqliteTable', 'sqlite', 'Creates a SQLite table.')
export const DrizzleMssqlTableTemplate = tableTemplate('DrizzleMssqlTable', 'mssqlTable', 'mssql', 'Creates an MSSQL table.')
export const DrizzleCockroachTableTemplate = tableTemplate('DrizzleCockroachTable', 'cockroachTable', 'cockroach', 'Creates a CockroachDB table.')

export const DrizzlePgTableWithConfigTemplate = defineTemplate({
	modelId: 'DrizzlePgTableWithConfig', version: '1.0.0', description: 'Creates a PostgreSQL table with an extra-config callback for indexes and constraints.',
	inputs: { name: stringInput('Database table name.'), columns: objectInput('Column builder map.'), config: callbackInput('Callback receiving the table columns and returning extra table config.') },
	output: expressionOutput('Configured PostgreSQL table.', drizzleTableType('unknown', 'unknown', 'postgres')),
	source: `pgTable(${marker('string', 'name', '"table"')}, ${marker('expression', 'columns', '{}')}, ${marker('expression', 'config', '(t) => []')})`
})
export const DrizzleMysqlTableWithConfigTemplate = defineTemplate({
	modelId: 'DrizzleMysqlTableWithConfig', version: '1.0.0', description: 'Creates a MySQL table with an extra-config callback.',
	inputs: { name: stringInput('Database table name.'), columns: objectInput('Column builder map.'), config: callbackInput('Callback receiving table columns.') },
	output: expressionOutput('Configured MySQL table.', drizzleTableType('unknown', 'unknown', 'mysql')),
	source: `mysqlTable(${marker('string', 'name', '"table"')}, ${marker('expression', 'columns', '{}')}, ${marker('expression', 'config', '(t) => []')})`
})
export const DrizzleSqliteTableWithConfigTemplate = defineTemplate({
	modelId: 'DrizzleSqliteTableWithConfig', version: '1.0.0', description: 'Creates a SQLite table with an extra-config callback.',
	inputs: { name: stringInput('Database table name.'), columns: objectInput('Column builder map.'), config: callbackInput('Callback receiving table columns.') },
	output: expressionOutput('Configured SQLite table.', drizzleTableType('unknown', 'unknown', 'sqlite')),
	source: `sqliteTable(${marker('string', 'name', '"table"')}, ${marker('expression', 'columns', '{}')}, ${marker('expression', 'config', '(t) => []')})`
})
export const DrizzlePgTableWithRlsTemplate = defineTemplate({
	modelId: 'DrizzlePgTableWithRls', version: '1.0.0', description: 'Creates a PostgreSQL table with row-level security enabled using the v1 pgTable.withRLS API.',
	inputs: { name: stringInput('Database table name.'), columns: objectInput('Column builder map.') },
	output: expressionOutput('RLS-enabled PostgreSQL table.', drizzleTableType('unknown', 'unknown', 'postgres')),
	source: `pgTable.withRLS(${marker('string', 'name', '"table"')}, ${marker('expression', 'columns', '{}')})`
})
export const DrizzleSnakeCaseTableTemplate = defineTemplate({
	modelId: 'DrizzleSnakeCaseTable', version: '1.0.0', description: 'Creates a table using the v1 table-level snake_case naming strategy.',
	inputs: { name: stringInput('Database table name.'), columns: objectInput('Column builder map.') },
	output: expressionOutput('snake_case table.', drizzleTableType()),
	source: `snakeCase.table(${marker('string', 'name', '"table"')}, ${marker('expression', 'columns', '{}')})`
})
export const DrizzleCamelCaseTableTemplate = defineTemplate({
	modelId: 'DrizzleCamelCaseTable', version: '1.0.0', description: 'Creates a table using the v1 table-level camelCase naming strategy.',
	inputs: { name: stringInput('Database table name.'), columns: objectInput('Column builder map.') },
	output: expressionOutput('camelCase table.', drizzleTableType()),
	source: `camelCase.table(${marker('string', 'name', '"table"')}, ${marker('expression', 'columns', '{}')})`
})
export const DrizzlePgIntegerTemplate = simpleColumn('DrizzlePgInteger', 'integer', 'number', 'postgres', 'Creates a postgres integer column builder.')
export const DrizzlePgSmallintTemplate = simpleColumn('DrizzlePgSmallint', 'smallint', 'number', 'postgres', 'Creates a postgres smallint column builder.')
export const DrizzlePgSerialTemplate = simpleColumn('DrizzlePgSerial', 'serial', 'number', 'postgres', 'Creates a postgres serial column builder.')
export const DrizzlePgBigserialTemplate = simpleColumn('DrizzlePgBigserial', 'bigserial', 'number', 'postgres', 'Creates a postgres bigserial column builder.')
export const DrizzlePgBooleanTemplate = simpleColumn('DrizzlePgBoolean', 'boolean', 'boolean', 'postgres', 'Creates a postgres boolean column builder.')
export const DrizzlePgTextTemplate = simpleColumn('DrizzlePgText', 'text', 'string', 'postgres', 'Creates a postgres text column builder.')
export const DrizzlePgVarcharTemplate = simpleColumn('DrizzlePgVarchar', 'varchar', 'string', 'postgres', 'Creates a postgres varchar column builder.')
export const DrizzlePgCharTemplate = simpleColumn('DrizzlePgChar', 'char', 'string', 'postgres', 'Creates a postgres char column builder.')
export const DrizzlePgUuidTemplate = simpleColumn('DrizzlePgUuid', 'uuid', 'string', 'postgres', 'Creates a postgres uuid column builder.')
export const DrizzlePgDateTemplate = simpleColumn('DrizzlePgDate', 'date', 'Date | string', 'postgres', 'Creates a postgres date column builder.')
export const DrizzlePgTimeTemplate = simpleColumn('DrizzlePgTime', 'time', 'string', 'postgres', 'Creates a postgres time column builder.')
export const DrizzlePgTimestampTemplate = simpleColumn('DrizzlePgTimestamp', 'timestamp', 'Date | string', 'postgres', 'Creates a postgres timestamp column builder.')
export const DrizzlePgIntervalTemplate = simpleColumn('DrizzlePgInterval', 'interval', 'string', 'postgres', 'Creates a postgres interval column builder.')
export const DrizzlePgJsonTemplate = simpleColumn('DrizzlePgJson', 'json', 'unknown', 'postgres', 'Creates a postgres json column builder.')
export const DrizzlePgJsonbTemplate = simpleColumn('DrizzlePgJsonb', 'jsonb', 'unknown', 'postgres', 'Creates a postgres jsonb column builder.')
export const DrizzlePgNumericTemplate = simpleColumn('DrizzlePgNumeric', 'numeric', 'string', 'postgres', 'Creates a postgres numeric column builder.')
export const DrizzlePgRealTemplate = simpleColumn('DrizzlePgReal', 'real', 'number', 'postgres', 'Creates a postgres real column builder.')
export const DrizzlePgDoublePrecisionTemplate = simpleColumn('DrizzlePgDoublePrecision', 'doublePrecision', 'number', 'postgres', 'Creates a postgres doublePrecision column builder.')
export const DrizzleMysqlIntTemplate = simpleColumn('DrizzleMysqlInt', 'int', 'number', 'mysql', 'Creates a mysql int column builder.')
export const DrizzleMysqlTinyintTemplate = simpleColumn('DrizzleMysqlTinyint', 'tinyint', 'number', 'mysql', 'Creates a mysql tinyint column builder.')
export const DrizzleMysqlSmallintTemplate = simpleColumn('DrizzleMysqlSmallint', 'smallint', 'number', 'mysql', 'Creates a mysql smallint column builder.')
export const DrizzleMysqlMediumintTemplate = simpleColumn('DrizzleMysqlMediumint', 'mediumint', 'number', 'mysql', 'Creates a mysql mediumint column builder.')
export const DrizzleMysqlSerialTemplate = simpleColumn('DrizzleMysqlSerial', 'serial', 'number', 'mysql', 'Creates a mysql serial column builder.')
export const DrizzleMysqlBooleanTemplate = simpleColumn('DrizzleMysqlBoolean', 'boolean', 'boolean', 'mysql', 'Creates a mysql boolean column builder.')
export const DrizzleMysqlTextTemplate = simpleColumn('DrizzleMysqlText', 'text', 'string', 'mysql', 'Creates a mysql text column builder.')
export const DrizzleMysqlVarcharTemplate = simpleColumn('DrizzleMysqlVarchar', 'varchar', 'string', 'mysql', 'Creates a mysql varchar column builder.')
export const DrizzleMysqlCharTemplate = simpleColumn('DrizzleMysqlChar', 'char', 'string', 'mysql', 'Creates a mysql char column builder.')
export const DrizzleMysqlTimestampTemplate = simpleColumn('DrizzleMysqlTimestamp', 'timestamp', 'Date | string', 'mysql', 'Creates a mysql timestamp column builder.')
export const DrizzleMysqlDatetimeTemplate = simpleColumn('DrizzleMysqlDatetime', 'datetime', 'Date | string', 'mysql', 'Creates a mysql datetime column builder.')
export const DrizzleMysqlDateTemplate = simpleColumn('DrizzleMysqlDate', 'date', 'Date | string', 'mysql', 'Creates a mysql date column builder.')
export const DrizzleMysqlTimeTemplate = simpleColumn('DrizzleMysqlTime', 'time', 'string', 'mysql', 'Creates a mysql time column builder.')
export const DrizzleMysqlYearTemplate = simpleColumn('DrizzleMysqlYear', 'year', 'number', 'mysql', 'Creates a mysql year column builder.')
export const DrizzleMysqlJsonTemplate = simpleColumn('DrizzleMysqlJson', 'json', 'unknown', 'mysql', 'Creates a mysql json column builder.')
export const DrizzleMysqlFloatTemplate = simpleColumn('DrizzleMysqlFloat', 'float', 'number', 'mysql', 'Creates a mysql float column builder.')
export const DrizzleMysqlDoubleTemplate = simpleColumn('DrizzleMysqlDouble', 'double', 'number', 'mysql', 'Creates a mysql double column builder.')
export const DrizzleSqliteIntegerTemplate = simpleColumn('DrizzleSqliteInteger', 'integer', 'number', 'sqlite', 'Creates a sqlite integer column builder.')
export const DrizzleSqliteRealTemplate = simpleColumn('DrizzleSqliteReal', 'real', 'number', 'sqlite', 'Creates a sqlite real column builder.')
export const DrizzleSqliteTextTemplate = simpleColumn('DrizzleSqliteText', 'text', 'string', 'sqlite', 'Creates a sqlite text column builder.')
export const DrizzleSqliteBlobTemplate = simpleColumn('DrizzleSqliteBlob', 'blob', 'unknown', 'sqlite', 'Creates a sqlite blob column builder.')
export const DrizzleSqliteNumericTemplate = simpleColumn('DrizzleSqliteNumeric', 'numeric', 'string', 'sqlite', 'Creates a sqlite numeric column builder.')
export const DrizzleMssqlIntTemplate = simpleColumn('DrizzleMssqlInt', 'int', 'number', 'mssql', 'Creates a mssql int column builder.')
export const DrizzleMssqlBitTemplate = simpleColumn('DrizzleMssqlBit', 'bit', 'boolean', 'mssql', 'Creates a mssql bit column builder.')
export const DrizzleMssqlTextTemplate = simpleColumn('DrizzleMssqlText', 'text', 'string', 'mssql', 'Creates a mssql text column builder.')
export const DrizzleMssqlNtextTemplate = simpleColumn('DrizzleMssqlNtext', 'ntext', 'string', 'mssql', 'Creates a mssql ntext column builder.')
export const DrizzleMssqlVarcharTemplate = simpleColumn('DrizzleMssqlVarchar', 'varchar', 'string', 'mssql', 'Creates a mssql varchar column builder.')
export const DrizzleMssqlNvarcharTemplate = simpleColumn('DrizzleMssqlNvarchar', 'nvarchar', 'string', 'mssql', 'Creates a mssql nvarchar column builder.')
export const DrizzleMssqlCharTemplate = simpleColumn('DrizzleMssqlChar', 'char', 'string', 'mssql', 'Creates a mssql char column builder.')
export const DrizzleMssqlNcharTemplate = simpleColumn('DrizzleMssqlNchar', 'nchar', 'string', 'mssql', 'Creates a mssql nchar column builder.')
export const DrizzleMssqlBinaryTemplate = simpleColumn('DrizzleMssqlBinary', 'binary', 'Uint8Array', 'mssql', 'Creates a mssql binary column builder.')
export const DrizzleMssqlVarbinaryTemplate = simpleColumn('DrizzleMssqlVarbinary', 'varbinary', 'Uint8Array', 'mssql', 'Creates a mssql varbinary column builder.')
export const DrizzleMssqlRealTemplate = simpleColumn('DrizzleMssqlReal', 'real', 'number', 'mssql', 'Creates a mssql real column builder.')
export const DrizzleMssqlFloatTemplate = simpleColumn('DrizzleMssqlFloat', 'float', 'number', 'mssql', 'Creates a mssql float column builder.')
export const DrizzleMssqlTimeTemplate = simpleColumn('DrizzleMssqlTime', 'time', 'Date | string', 'mssql', 'Creates a mssql time column builder.')
export const DrizzleMssqlDateTemplate = simpleColumn('DrizzleMssqlDate', 'date', 'Date | string', 'mssql', 'Creates a mssql date column builder.')
export const DrizzleMssqlDatetimeTemplate = simpleColumn('DrizzleMssqlDatetime', 'datetime', 'Date | string', 'mssql', 'Creates a mssql datetime column builder.')
export const DrizzleMssqlDatetime2Template = simpleColumn('DrizzleMssqlDatetime2', 'datetime2', 'Date | string', 'mssql', 'Creates a mssql datetime2 column builder.')
export const DrizzleMssqlDatetimeoffsetTemplate = simpleColumn('DrizzleMssqlDatetimeoffset', 'datetimeoffset', 'Date | string', 'mssql', 'Creates a mssql datetimeoffset column builder.')
export const DrizzleCockroachSmallintTemplate = simpleColumn('DrizzleCockroachSmallint', 'smallint', 'number', 'cockroach', 'Creates a cockroach smallint column builder.')
export const DrizzleCockroachInt4Template = simpleColumn('DrizzleCockroachInt4', 'int4', 'number', 'cockroach', 'Creates a cockroach int4 column builder.')
export const DrizzleCockroachBoolTemplate = simpleColumn('DrizzleCockroachBool', 'bool', 'boolean', 'cockroach', 'Creates a cockroach bool column builder.')
export const DrizzleCockroachStringTemplate = simpleColumn('DrizzleCockroachString', 'string', 'string', 'cockroach', 'Creates a cockroach string column builder.')
export const DrizzleCockroachTextTemplate = simpleColumn('DrizzleCockroachText', 'text', 'string', 'cockroach', 'Creates a cockroach text column builder.')
export const DrizzleCockroachVarcharTemplate = simpleColumn('DrizzleCockroachVarchar', 'varchar', 'string', 'cockroach', 'Creates a cockroach varchar column builder.')
export const DrizzleCockroachCharTemplate = simpleColumn('DrizzleCockroachChar', 'char', 'string', 'cockroach', 'Creates a cockroach char column builder.')
export const DrizzleCockroachFloatTemplate = simpleColumn('DrizzleCockroachFloat', 'float', 'number', 'cockroach', 'Creates a cockroach float column builder.')
export const DrizzleCockroachRealTemplate = simpleColumn('DrizzleCockroachReal', 'real', 'number', 'cockroach', 'Creates a cockroach real column builder.')
export const DrizzleCockroachJsonbTemplate = simpleColumn('DrizzleCockroachJsonb', 'jsonb', 'unknown', 'cockroach', 'Creates a cockroach jsonb column builder.')
export const DrizzleCockroachUuidTemplate = simpleColumn('DrizzleCockroachUuid', 'uuid', 'string', 'cockroach', 'Creates a cockroach uuid column builder.')
export const DrizzleCockroachTimeTemplate = simpleColumn('DrizzleCockroachTime', 'time', 'string', 'cockroach', 'Creates a cockroach time column builder.')
export const DrizzleCockroachDateTemplate = simpleColumn('DrizzleCockroachDate', 'date', 'Date | string', 'cockroach', 'Creates a cockroach date column builder.')
export const DrizzleCockroachTimestampTemplate = simpleColumn('DrizzleCockroachTimestamp', 'timestamp', 'Date | string', 'cockroach', 'Creates a cockroach timestamp column builder.')
export const DrizzleCockroachIntervalTemplate = simpleColumn('DrizzleCockroachInterval', 'interval', 'string', 'cockroach', 'Creates a cockroach interval column builder.')
export const DrizzleCockroachInetTemplate = simpleColumn('DrizzleCockroachInet', 'inet', 'string', 'cockroach', 'Creates a cockroach inet column builder.')
export const DrizzlePgBigintTemplate = configuredColumn('DrizzlePgBigint', 'bigint', 'number | bigint', 'postgres', 'Creates a configured postgres bigint column builder.', "{ mode: 'number' }")
export const DrizzleMysqlBigintTemplate = configuredColumn('DrizzleMysqlBigint', 'bigint', 'number | bigint', 'mysql', 'Creates a configured mysql bigint column builder.', "{ mode: 'number' }")
export const DrizzleMysqlDecimalTemplate = configuredColumn('DrizzleMysqlDecimal', 'decimal', 'string | number | bigint', 'mysql', 'Creates a configured mysql decimal column builder.', '{ precision: 10, scale: 2 }')
export const DrizzleSqliteIntegerModeTemplate = configuredColumn('DrizzleSqliteIntegerMode', 'integer', 'unknown', 'sqlite', 'Creates a configured sqlite integer column builder.', "{ mode: 'number' }")
export const DrizzleSqliteTextConfigTemplate = configuredColumn('DrizzleSqliteTextConfig', 'text', 'string | unknown', 'sqlite', 'Creates a configured sqlite text column builder.', "{ mode: 'text' }")
export const DrizzleSqliteBlobConfigTemplate = configuredColumn('DrizzleSqliteBlobConfig', 'blob', 'unknown', 'sqlite', 'Creates a configured sqlite blob column builder.', "{ mode: 'buffer' }")
export const DrizzleMssqlBigintTemplate = configuredColumn('DrizzleMssqlBigint', 'bigint', 'number | bigint | string', 'mssql', 'Creates a configured mssql bigint column builder.', "{ mode: 'number' }")
export const DrizzleMssqlNumericTemplate = configuredColumn('DrizzleMssqlNumeric', 'numeric', 'string | number', 'mssql', 'Creates a configured mssql numeric column builder.', '{ precision: 18, scale: 2 }')
export const DrizzleMssqlDecimalTemplate = configuredColumn('DrizzleMssqlDecimal', 'decimal', 'string | number', 'mssql', 'Creates a configured mssql decimal column builder.', '{ precision: 18, scale: 2 }')
export const DrizzleCockroachBigintTemplate = configuredColumn('DrizzleCockroachBigint', 'bigint', 'number | bigint', 'cockroach', 'Creates a configured cockroach bigint column builder.', "{ mode: 'number' }")
export const DrizzleCockroachDecimalTemplate = configuredColumn('DrizzleCockroachDecimal', 'decimal', 'string | number | bigint', 'cockroach', 'Creates a configured cockroach decimal column builder.', '{ precision: 18, scale: 2 }')

export const DrizzlePgEnumTemplate = defineTemplate({
	modelId: 'DrizzlePgEnum', version: '1.0.0', description: 'Defines a PostgreSQL enum type with pgEnum().',
	inputs: { name: stringInput('Database enum type name.'), values: arrayInput('Non-empty array of enum string values.') },
	output: expressionOutput('PostgreSQL enum column factory.'),
	source: `pgEnum(${marker('string', 'name', '"status"')}, ${marker('expression', 'values', '["active", "inactive"]')})`
})
export const DrizzleCockroachEnumTemplate = defineTemplate({
	modelId: 'DrizzleCockroachEnum', version: '1.0.0', description: 'Defines a CockroachDB enum type with cockroachEnum().',
	inputs: { name: stringInput('Database enum type name.'), values: arrayInput('Non-empty array of enum string values.') },
	output: expressionOutput('CockroachDB enum column factory.'),
	source: `cockroachEnum(${marker('string', 'name', '"status"')}, ${marker('expression', 'values', '["active", "inactive"]')})`
})

export const DrizzleColumnNotNullTemplate = defineTemplate({
	modelId: 'DrizzleColumnNotNull', version: '1.0.0', description: 'Marks a column NOT NULL.',
	inputs: { source: columnBuilderInput() }, output: expressionOutput('NOT NULL column builder.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'integer()')}.notNull()`
})
export const DrizzleColumnPrimaryKeyTemplate = defineTemplate({
	modelId: 'DrizzleColumnPrimaryKey', version: '1.0.0', description: 'Marks a column as a primary key.',
	inputs: { source: columnBuilderInput() }, output: expressionOutput('Primary-key column builder.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'integer()')}.primaryKey()`
})
export const DrizzleSqliteColumnAutoIncrementPrimaryKeyTemplate = defineTemplate({
	modelId: 'DrizzleSqliteColumnAutoIncrementPrimaryKey', version: '1.0.0', description: 'Marks a SQLite integer column as an autoincrementing primary key.',
	inputs: { source: columnBuilderInput() }, output: expressionOutput('SQLite autoincrement primary-key builder.', drizzleColumnBuilderType('number', 'sqlite')),
	source: `${marker('expression', 'source', 'integer()')}.primaryKey({ autoIncrement: true })`
})
export const DrizzleMysqlColumnAutoIncrementTemplate = defineTemplate({
	modelId: 'DrizzleMysqlColumnAutoIncrement', version: '1.0.0', description: 'Adds MySQL AUTO_INCREMENT to a numeric column.',
	inputs: { source: columnBuilderInput() }, output: expressionOutput('MySQL auto-increment column builder.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'int()')}.autoincrement()`
})
export const DrizzleColumnUniqueTemplate = defineTemplate({
	modelId: 'DrizzleColumnUnique', version: '1.0.0', description: 'Adds a UNIQUE constraint to a column.',
	inputs: { source: columnBuilderInput() }, output: expressionOutput('Unique column builder.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'text()')}.unique()`
})
export const DrizzleColumnDefaultTemplate = defineTemplate({
	modelId: 'DrizzleColumnDefault', version: '1.0.0', description: 'Adds a database DEFAULT value or SQL expression to a column.',
	inputs: { source: columnBuilderInput(), value: expressionInput('Default value or SQL expression.') }, output: expressionOutput('Column builder with DEFAULT.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'text()')}.default(${marker('expression', 'value', 'undefined')})`
})
export const DrizzleColumnDefaultFnTemplate = defineTemplate({
	modelId: 'DrizzleColumnDefaultFn', version: '1.0.0', description: 'Adds a runtime-only default function with $defaultFn().',
	inputs: { source: columnBuilderInput(), factory: callbackInput('Zero-argument value factory.') }, output: expressionOutput('Column builder with runtime default.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'text()')}.$defaultFn(${marker('expression', 'factory', '() => ""')})`
})
export const DrizzleColumnOnUpdateTemplate = defineTemplate({
	modelId: 'DrizzleColumnOnUpdate', version: '1.0.0', description: 'Adds a runtime-only update value factory with $onUpdate().',
	inputs: { source: columnBuilderInput(), factory: callbackInput('Zero-argument update value factory.') }, output: expressionOutput('Column builder with runtime update hook.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'text()')}.$onUpdate(${marker('expression', 'factory', '() => ""')})`
})
export const DrizzleColumnTypeTemplate = defineTemplate({
	modelId: 'DrizzleColumnType', version: '1.0.0', description: 'Refines a column TypeScript data type with .$type<T>().',
	inputs: { source: columnBuilderInput(), type: typeCodeInput('Desired column TypeScript type.') }, output: expressionOutput('Type-refined column builder.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'text()')}.$type<${marker('type', 'type', 'unknown')}>()`
})
export const DrizzleColumnReferencesTemplate = defineTemplate({
	modelId: 'DrizzleColumnReferences', version: '1.0.0', description: 'Adds a foreign-key reference to another column.',
	inputs: { source: columnBuilderInput(), foreignColumn: expressionInput('Referenced foreign column.'), actions: objectInput('Foreign-key actions such as onDelete/onUpdate.') },
	output: expressionOutput('Foreign-key column builder.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'integer()')}.references(() => ${marker('expression', 'foreignColumn', 'users.id')}, ${marker('expression', 'actions', '{}')})`
})
export const DrizzlePgColumnArrayTemplate = defineTemplate({
	modelId: 'DrizzlePgColumnArray', version: '1.0.0', description: 'Converts a PostgreSQL column to an array; v1 multidimensional arrays use a single string shape such as "[][]".',
	inputs: { source: columnBuilderInput(), dimensions: stringInput('Array shape, e.g. [] or [][] .') },
	output: expressionOutput('PostgreSQL array column builder.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'text()')}.array(${marker('string', 'dimensions', '"[]"')})`
})
export const DrizzleColumnGeneratedAlwaysAsTemplate = defineTemplate({
	modelId: 'DrizzleColumnGeneratedAlwaysAs', version: '1.0.0', description: 'Defines a generated column expression. Drizzle v1 requires an SQL expression or thunk returning SQL.',
	inputs: { source: columnBuilderInput(), expression: expressionInput('SQL expression or thunk returning SQL.') },
	output: expressionOutput('Generated column builder.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'text()')}.generatedAlwaysAs(${marker('expression', 'expression', 'sql`1`')})`
})
export const DrizzleColumnGeneratedAlwaysIdentityTemplate = defineTemplate({
	modelId: 'DrizzleColumnGeneratedAlwaysIdentity', version: '1.0.0', description: 'Marks a PostgreSQL/Cockroach integer column GENERATED ALWAYS AS IDENTITY.',
	inputs: { source: columnBuilderInput(), config: objectInput('Identity sequence options.') }, output: expressionOutput('Identity column builder.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'integer()')}.generatedAlwaysAsIdentity(${marker('expression', 'config', '{}')})`
})
export const DrizzleColumnDefaultNowTemplate = defineTemplate({
	modelId: 'DrizzleColumnDefaultNow', version: '1.0.0', description: 'Uses a dialect column builder defaultNow() helper where available.',
	inputs: { source: columnBuilderInput() }, output: expressionOutput('Column builder with current-time default.', drizzleColumnBuilderType()),
	source: `${marker('expression', 'source', 'timestamp()')}.defaultNow()`
})
export const DrizzleColumnDefaultRandomTemplate = defineTemplate({
	modelId: 'DrizzleColumnDefaultRandom', version: '1.0.0', description: 'Uses UUID defaultRandom() where supported.',
	inputs: { source: columnBuilderInput() }, output: expressionOutput('UUID column builder with random default.', drizzleColumnBuilderType('string')),
	source: `${marker('expression', 'source', 'uuid()')}.defaultRandom()`
})

export const DrizzleIndexTemplate = defineTemplate({
	modelId: 'DrizzleIndex', version: '1.0.0', description: 'Defines a non-unique index over one or more expressions.',
	inputs: { name: stringInput('Index name.'), columns: arrayInput('Index columns or expressions.') }, output: expressionOutput('Index definition.'),
	source: `index(${marker('string', 'name', '"idx"')}).on(...${marker('expression', 'columns', '[]')})`
})
export const DrizzleUniqueIndexTemplate = defineTemplate({
	modelId: 'DrizzleUniqueIndex', version: '1.0.0', description: 'Defines a unique index over one or more expressions.',
	inputs: { name: stringInput('Index name.'), columns: arrayInput('Index columns or expressions.') }, output: expressionOutput('Unique index definition.'),
	source: `uniqueIndex(${marker('string', 'name', '"uidx"')}).on(...${marker('expression', 'columns', '[]')})`
})
export const DrizzleCompositePrimaryKeyTemplate = defineTemplate({
	modelId: 'DrizzleCompositePrimaryKey', version: '1.0.0', description: 'Defines a composite primary-key constraint.',
	inputs: { columns: arrayInput('Primary-key columns.') }, output: expressionOutput('Composite primary-key definition.'),
	source: `primaryKey({ columns: ${marker('expression', 'columns', '[]')} })`
})
export const DrizzleForeignKeyTemplate = defineTemplate({
	modelId: 'DrizzleForeignKey', version: '1.0.0', description: 'Defines a table-level foreign-key constraint from a configuration object.',
	inputs: { config: objectInput('Foreign key config including columns, foreignColumns, and optional name.') }, output: expressionOutput('Foreign-key definition.'),
	source: `foreignKey(${marker('expression', 'config', '{ columns: [], foreignColumns: [] }')})`
})
export const DrizzleCheckTemplate = defineTemplate({
	modelId: 'DrizzleCheck', version: '1.0.0', description: 'Defines a CHECK constraint.',
	inputs: { name: stringInput('Constraint name.'), condition: sqlInput('CHECK condition SQL expression.') }, output: expressionOutput('CHECK constraint definition.'),
	source: `check(${marker('string', 'name', '"check"')}, ${marker('expression', 'condition', 'sql`true`')})`
})
export const DrizzleUniqueConstraintTemplate = defineTemplate({
	modelId: 'DrizzleUniqueConstraint', version: '1.0.0', description: 'Defines a named UNIQUE constraint over one or more columns.',
	inputs: { name: stringInput('Constraint name.'), columns: arrayInput('Unique columns.') }, output: expressionOutput('UNIQUE constraint definition.'),
	source: `unique(${marker('string', 'name', '"unique_constraint"')}).on(...${marker('expression', 'columns', '[]')})`
})

export const DrizzlePgSchemaTemplate = defineTemplate({
	modelId: 'DrizzlePgSchema', version: '1.0.0', description: 'Creates a PostgreSQL schema namespace with pgSchema().',
	inputs: { name: stringInput('Database schema name.') }, output: expressionOutput('PostgreSQL schema namespace.'),
	source: `pgSchema(${marker('string', 'name', '"app"')})`
})
export const DrizzlePgSchemaTableTemplate = defineTemplate({
	modelId: 'DrizzlePgSchemaTable', version: '1.0.0', description: 'Creates a table inside a PostgreSQL schema namespace.',
	inputs: { schema: expressionInput('pgSchema() namespace.'), name: stringInput('Table name.'), columns: objectInput('Column builder map.') },
	output: expressionOutput('Schema-qualified PostgreSQL table.', drizzleTableType('unknown','unknown','postgres')),
	source: `${marker('expression', 'schema', 'pgSchema("app")')}.table(${marker('string', 'name', '"table"')}, ${marker('expression', 'columns', '{}')})`
})
export const DrizzlePgViewTemplate = defineTemplate({
	modelId: 'DrizzlePgView', version: '1.0.0', description: 'Defines a PostgreSQL view from a query callback or query builder.',
	inputs: { name: stringInput('View name.'), query: expressionInput('View query or callback.') }, output: expressionOutput('PostgreSQL view.'),
	source: `pgView(${marker('string', 'name', '"view"')}).as(${marker('expression', 'query', 'undefined')})`
})
export const DrizzlePgMaterializedViewTemplate = defineTemplate({
	modelId: 'DrizzlePgMaterializedView', version: '1.0.0', description: 'Defines a PostgreSQL materialized view from a query callback or query builder.',
	inputs: { name: stringInput('Materialized view name.'), query: expressionInput('View query or callback.') }, output: expressionOutput('PostgreSQL materialized view.'),
	source: `pgMaterializedView(${marker('string', 'name', '"view"')}).as(${marker('expression', 'query', 'undefined')})`
})

export const drizzleSchemaGraphTemplateInputs = [
	DrizzlePgTableTemplate,
	DrizzleMysqlTableTemplate,
	DrizzleSqliteTableTemplate,
	DrizzleMssqlTableTemplate,
	DrizzleCockroachTableTemplate,
	DrizzlePgTableWithConfigTemplate,
	DrizzleMysqlTableWithConfigTemplate,
	DrizzleSqliteTableWithConfigTemplate,
	DrizzlePgTableWithRlsTemplate,
	DrizzleSnakeCaseTableTemplate,
	DrizzleCamelCaseTableTemplate,
	DrizzlePgIntegerTemplate,
	DrizzlePgSmallintTemplate,
	DrizzlePgSerialTemplate,
	DrizzlePgBigserialTemplate,
	DrizzlePgBooleanTemplate,
	DrizzlePgTextTemplate,
	DrizzlePgVarcharTemplate,
	DrizzlePgCharTemplate,
	DrizzlePgUuidTemplate,
	DrizzlePgDateTemplate,
	DrizzlePgTimeTemplate,
	DrizzlePgTimestampTemplate,
	DrizzlePgIntervalTemplate,
	DrizzlePgJsonTemplate,
	DrizzlePgJsonbTemplate,
	DrizzlePgNumericTemplate,
	DrizzlePgRealTemplate,
	DrizzlePgDoublePrecisionTemplate,
	DrizzleMysqlIntTemplate,
	DrizzleMysqlTinyintTemplate,
	DrizzleMysqlSmallintTemplate,
	DrizzleMysqlMediumintTemplate,
	DrizzleMysqlSerialTemplate,
	DrizzleMysqlBooleanTemplate,
	DrizzleMysqlTextTemplate,
	DrizzleMysqlVarcharTemplate,
	DrizzleMysqlCharTemplate,
	DrizzleMysqlTimestampTemplate,
	DrizzleMysqlDatetimeTemplate,
	DrizzleMysqlDateTemplate,
	DrizzleMysqlTimeTemplate,
	DrizzleMysqlYearTemplate,
	DrizzleMysqlJsonTemplate,
	DrizzleMysqlFloatTemplate,
	DrizzleMysqlDoubleTemplate,
	DrizzleSqliteIntegerTemplate,
	DrizzleSqliteRealTemplate,
	DrizzleSqliteTextTemplate,
	DrizzleSqliteBlobTemplate,
	DrizzleSqliteNumericTemplate,
	DrizzleMssqlIntTemplate,
	DrizzleMssqlBitTemplate,
	DrizzleMssqlTextTemplate,
	DrizzleMssqlNtextTemplate,
	DrizzleMssqlVarcharTemplate,
	DrizzleMssqlNvarcharTemplate,
	DrizzleMssqlCharTemplate,
	DrizzleMssqlNcharTemplate,
	DrizzleMssqlBinaryTemplate,
	DrizzleMssqlVarbinaryTemplate,
	DrizzleMssqlRealTemplate,
	DrizzleMssqlFloatTemplate,
	DrizzleMssqlTimeTemplate,
	DrizzleMssqlDateTemplate,
	DrizzleMssqlDatetimeTemplate,
	DrizzleMssqlDatetime2Template,
	DrizzleMssqlDatetimeoffsetTemplate,
	DrizzleCockroachSmallintTemplate,
	DrizzleCockroachInt4Template,
	DrizzleCockroachBoolTemplate,
	DrizzleCockroachStringTemplate,
	DrizzleCockroachTextTemplate,
	DrizzleCockroachVarcharTemplate,
	DrizzleCockroachCharTemplate,
	DrizzleCockroachFloatTemplate,
	DrizzleCockroachRealTemplate,
	DrizzleCockroachJsonbTemplate,
	DrizzleCockroachUuidTemplate,
	DrizzleCockroachTimeTemplate,
	DrizzleCockroachDateTemplate,
	DrizzleCockroachTimestampTemplate,
	DrizzleCockroachIntervalTemplate,
	DrizzleCockroachInetTemplate,
	DrizzlePgBigintTemplate,
	DrizzleMysqlBigintTemplate,
	DrizzleMysqlDecimalTemplate,
	DrizzleSqliteIntegerModeTemplate,
	DrizzleSqliteTextConfigTemplate,
	DrizzleSqliteBlobConfigTemplate,
	DrizzleMssqlBigintTemplate,
	DrizzleMssqlNumericTemplate,
	DrizzleMssqlDecimalTemplate,
	DrizzleCockroachBigintTemplate,
	DrizzleCockroachDecimalTemplate,
	DrizzlePgEnumTemplate,
	DrizzleCockroachEnumTemplate,
	DrizzleColumnNotNullTemplate,
	DrizzleColumnPrimaryKeyTemplate,
	DrizzleSqliteColumnAutoIncrementPrimaryKeyTemplate,
	DrizzleMysqlColumnAutoIncrementTemplate,
	DrizzleColumnUniqueTemplate,
	DrizzleColumnDefaultTemplate,
	DrizzleColumnDefaultFnTemplate,
	DrizzleColumnOnUpdateTemplate,
	DrizzleColumnTypeTemplate,
	DrizzleColumnReferencesTemplate,
	DrizzlePgColumnArrayTemplate,
	DrizzleColumnGeneratedAlwaysAsTemplate,
	DrizzleColumnGeneratedAlwaysIdentityTemplate,
	DrizzleColumnDefaultNowTemplate,
	DrizzleColumnDefaultRandomTemplate,
	DrizzleIndexTemplate,
	DrizzleUniqueIndexTemplate,
	DrizzleCompositePrimaryKeyTemplate,
	DrizzleForeignKeyTemplate,
	DrizzleCheckTemplate,
	DrizzleUniqueConstraintTemplate,
	DrizzlePgSchemaTemplate,
	DrizzlePgSchemaTableTemplate,
	DrizzlePgViewTemplate,
	DrizzlePgMaterializedViewTemplate,
] satisfies ReadonlyArray<AnyDrizzleTemplateDefinitionInput>
