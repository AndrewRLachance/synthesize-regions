import { defineTemplate } from '../../../authoring/define-template.js'
import {
	type AnyDrizzleTemplateDefinitionInput,
	arrayInput,
	callbackInput,
	databaseInput,
	drizzleDatabaseType,
	expressionOutput,
	marker
} from './drizzle-template-helpers.js'

/**
 * Batch and read-replica templates.
 *
 * Runtime/import contract:
 *   - db.batch(...) is only available on drivers that expose Drizzle's Batch API.
 *   - withReplicas is imported from the selected dialect core package.
 *   - withReplicas routes reads through a replica selector and writes to primary.
 */

export const DrizzleBatchTemplate = defineTemplate({
	modelId: 'DrizzleBatch',
	version: '1.0.0',
	description: 'Executes an ordered array of supported Drizzle query builders with db.batch() on drivers that implement the Batch API.',
	inputs: {
		db: databaseInput('Drizzle database instance whose driver exposes db.batch().'),
		queries: arrayInput('Non-empty ordered array of supported Drizzle query builders.', 1)
	},
	output: expressionOutput('Batch execution promise whose tuple entries correspond to the input query order.'),
	source: `${marker('expression', 'db', 'db')}.batch(${marker('expression', 'queries', '[]')})`
})

export const DrizzleWithReplicasTemplate = defineTemplate({
	modelId: 'DrizzleWithReplicas',
	version: '1.0.0',
	description: 'Wraps a primary Drizzle database and one or more read replicas with the dialect withReplicas() helper using its default replica selection.',
	inputs: {
		primary: databaseInput('Primary Drizzle database used for writes and transactions.'),
		replicas: arrayInput('Non-empty array of compatible Drizzle read-replica database instances.', 1)
	},
	output: expressionOutput('Replica-aware Drizzle database.', drizzleDatabaseType()),
	source: `withReplicas(${marker('expression', 'primary', 'primaryDb')}, ${marker('expression', 'replicas', '[readDb]')})`
})

export const DrizzleWithReplicasSelectorTemplate = defineTemplate({
	modelId: 'DrizzleWithReplicasSelector',
	version: '1.0.0',
	description: 'Wraps primary/read-replica databases with a custom function that selects which replica handles each routed read.',
	inputs: {
		primary: databaseInput('Primary Drizzle database used for writes and transactions.'),
		replicas: arrayInput('Non-empty array of compatible Drizzle read-replica database instances.', 1),
		selector: callbackInput('Replica selector callback of the form (replicas) => replica.')
	},
	output: expressionOutput('Replica-aware Drizzle database with custom read selection.', drizzleDatabaseType()),
	source: `withReplicas(${marker('expression', 'primary', 'primaryDb')}, ${marker('expression', 'replicas', '[readDb]')}, ${marker('expression', 'selector', '(replicas) => replicas[0]')})`
})

export const DrizzleReplicaPrimaryTemplate = defineTemplate({
	modelId: 'DrizzleReplicaPrimary',
	version: '1.0.0',
	description: 'Accesses the $primary database from a withReplicas() database to force reads to the primary connection.',
	inputs: {
		db: databaseInput('Replica-aware Drizzle database returned by withReplicas().')
	},
	output: expressionOutput('Primary Drizzle database.', drizzleDatabaseType()),
	source: `${marker('expression', 'db', 'db')}.$primary`
})

export const DrizzleReplicaListTemplate = defineTemplate({
	modelId: 'DrizzleReplicaList',
	version: '1.0.0',
	description: 'Accesses the current $replicas array from a withReplicas() database on dialects whose replica wrapper exposes it.',
	inputs: {
		db: databaseInput('Replica-aware Drizzle database returned by withReplicas().')
	},
	output: expressionOutput('Array of configured Drizzle read-replica databases.'),
	source: `${marker('expression', 'db', 'db')}.$replicas`
})

export const drizzleBatchReplicaGraphTemplateInputs = [
	DrizzleBatchTemplate,
	DrizzleWithReplicasTemplate,
	DrizzleWithReplicasSelectorTemplate,
	DrizzleReplicaPrimaryTemplate,
	DrizzleReplicaListTemplate
] satisfies ReadonlyArray<AnyDrizzleTemplateDefinitionInput>
