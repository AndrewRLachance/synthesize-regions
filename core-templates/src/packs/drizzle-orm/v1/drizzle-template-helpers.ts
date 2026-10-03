import {
	fragmentCollectionPort,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from 'synthesize-regions'
import type {
	InputPort,
	OutputPort,
	RawCodePolicy,
	TemplateTypeParameterDefinition,
	TypeDescriptor
} from 'synthesize-regions'
import type { GraphTemplateDefinitionInput } from 'synthesize-regions'

export type AnyDrizzleTemplateDefinitionInput = GraphTemplateDefinitionInput<
	string,
	Record<string, InputPort>,
	OutputPort,
	Record<string, TemplateTypeParameterDefinition> | undefined
>

const DRIZZLE_FORBIDDEN = [
	'import',
	'require',
	'process',
	'globalThis',
	'Function',
	'eval',
	'child_process',
	'Bun.spawn',
	'Deno.Command'
] as const

export const drizzleExpressionPolicy: RawCodePolicy = {
	description: 'Single TypeScript expression for a Drizzle ORM value, query, schema object, or SQL fragment. Module loading and ambient escape hatches are rejected.',
	maxLength: 1800,
	allowNewlines: false,
	forbiddenSubstrings: [...DRIZZLE_FORBIDDEN]
}

export const drizzleCallbackPolicy: RawCodePolicy = {
	description: 'Callback used by Drizzle ORM for transactions, relations, schema configuration, or query construction. Module loading and ambient escape hatches are rejected.',
	maxLength: 4000,
	allowNewlines: true,
	forbiddenSubstrings: [...DRIZZLE_FORBIDDEN]
}

export const typeParameter = (description: string): TemplateTypeParameterDefinition => ({
	description,
	constraint: { ts: 'unknown' }
})

export const typeParameters = (
	...entries: ReadonlyArray<readonly [string, string]>
): Record<string, TemplateTypeParameterDefinition> =>
	Object.fromEntries(entries.map(([name, description]) => [name, typeParameter(description)]))

export const marker = (
	kind: 'expression' | 'identifier' | 'statement' | 'string' | 'type' | 'sourceFile',
	id: string,
	fallback: string
): string => `/** @TYPE ${kind} id=${id} **/${fallback}/** @END **/`

export const expressionOutput = (description: string, type?: TypeDescriptor) => ({
	kind: 'expression' as const,
	...(type ? { type } : {}),
	description
})

export const statementOutput = (description: string) => ({
	kind: 'statement' as const,
	description
})

export const nominalType = (
	nominal: string,
	phantoms: Readonly<Record<string, string>> = {}
): TypeDescriptor => ({
	nominal,
	ts: `{ readonly __drizzleNominal?: ${JSON.stringify(nominal)}${Object.entries(phantoms)
		.map(([name, type]) => `; readonly __${name}?: () => ${type}`)
		.join('')} }`
})

export const typedExpressionInput = (description: string, type: TypeDescriptor) => unionPort({
	options: [
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type }, description }),
		rawCodePort({ regionKind: 'expression', policy: drizzleExpressionPolicy, type, description })
	],
	description
})

export const expressionInput = (description = 'Drizzle-compatible expression.') => unionPort({
	options: [
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression' }, description }),
		rawCodePort({ regionKind: 'expression', policy: drizzleExpressionPolicy, description })
	],
	description
})

export const callbackInput = (description = 'Drizzle callback expression.') => unionPort({
	options: [
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression' }, description }),
		rawCodePort({ regionKind: 'expression', policy: drizzleCallbackPolicy, description })
	],
	description
})

export const expressionCollectionInput = (description: string, minItems = 1) => fragmentCollectionPort({
	regionKind: 'expression',
	accepts: { outputKind: 'expression' },
	minItems,
	separator: ', ',
	description
})

export const identifierInput = (description: string) => literalPort({
	regionKind: 'identifier',
	schema: { type: 'string', pattern: '^[$A-Za-z_][$A-Za-z0-9_]*$' },
	description
})

export const stringInput = (description: string, minLength = 1) => literalPort({
	regionKind: 'string',
	schema: { type: 'string', minLength },
	description
})

export const booleanInput = (description: string) => literalPort({
	regionKind: 'expression',
	schema: { type: 'boolean' },
	description
})

export const nonNegativeIntegerInput = (description: string) => literalPort({
	regionKind: 'expression',
	schema: { type: 'integer', minimum: 0 },
	description
})

export const positiveIntegerInput = (description: string) => literalPort({
	regionKind: 'expression',
	schema: { type: 'integer', minimum: 1 },
	description
})

export const objectInput = (description: string) => unionPort({
	options: [
		literalPort({ regionKind: 'expression', schema: { type: 'object' }, description }),
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression' }, description }),
		rawCodePort({ regionKind: 'expression', policy: drizzleExpressionPolicy, description })
	],
	description
})

export const arrayInput = (description: string, minItems = 0) => unionPort({
	options: [
		literalPort({
			regionKind: 'expression',
			schema: { type: 'array', ...(minItems > 0 ? { minItems } : {}) },
			description
		}),
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression' }, description }),
		rawCodePort({ regionKind: 'expression', policy: drizzleExpressionPolicy, description })
	],
	description
})

export const typeCodeInput = (description: string) => rawCodePort({
	regionKind: 'type',
	policy: {
		description: 'Self-contained TypeScript type expression used by a Drizzle generic or $type annotation.',
		maxLength: 1200,
		allowNewlines: false,
		forbiddenSubstrings: [...DRIZZLE_FORBIDDEN]
	},
	description
})

const dialectType = (dialect: string): string => dialect === 'unknown' ? 'unknown' : JSON.stringify(dialect)

export const drizzleDatabaseType = (dialect = 'unknown', schema = 'unknown') =>
	nominalType('drizzle/Database', { drizzleDialect: dialectType(dialect), drizzleSchema: schema })

export const drizzleTableType = (row = 'unknown', insert = row, dialect = 'unknown') =>
	nominalType('drizzle/Table', { drizzleRow: row, drizzleInsert: insert, drizzleDialect: dialectType(dialect) })

export const drizzleColumnType = (data = 'unknown', dialect = 'unknown') =>
	nominalType('drizzle/Column', { drizzleColumnData: data, drizzleDialect: dialectType(dialect) })

export const drizzleColumnBuilderType = (data = 'unknown', dialect = 'unknown') =>
	nominalType('drizzle/ColumnBuilder', { drizzleColumnData: data, drizzleDialect: dialectType(dialect) })

export const drizzleSqlType = (result = 'unknown') =>
	nominalType('drizzle/SQL', { drizzleSqlResult: result })

export const drizzleQueryType = (result = 'unknown') =>
	nominalType('drizzle/Query', { drizzleQueryResult: result })

export const drizzlePreparedQueryType = (result = 'unknown', params = 'unknown') =>
	nominalType('drizzle/PreparedQuery', { drizzleQueryResult: result, drizzlePreparedParams: params })

export const drizzleRelationsType = (schema = 'unknown') =>
	nominalType('drizzle/Relations', { drizzleSchema: schema })

export const drizzleCteType = (result = 'unknown') =>
	nominalType('drizzle/CTE', { drizzleQueryResult: result })

export const databaseInput = (description = 'Drizzle database instance.') =>
	typedExpressionInput(description, drizzleDatabaseType())

export const tableInput = (description = 'Drizzle table expression.') =>
	typedExpressionInput(description, drizzleTableType())

export const columnInput = (description = 'Drizzle column expression.') =>
	typedExpressionInput(description, drizzleColumnType())

export const columnBuilderInput = (description = 'Drizzle column builder expression.') =>
	typedExpressionInput(description, drizzleColumnBuilderType())

export const sqlInput = (description = 'Drizzle SQL expression.') =>
	typedExpressionInput(description, drizzleSqlType())

export const queryInput = (description = 'Drizzle query builder expression.') =>
	typedExpressionInput(description, drizzleQueryType())

export const preparedQueryInput = (description = 'Prepared Drizzle query.') =>
	typedExpressionInput(description, drizzlePreparedQueryType())
