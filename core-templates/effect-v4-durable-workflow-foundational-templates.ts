import { defineTemplate, fragmentCollectionPort, fragmentPort, literalPort, rawCodePort, unionPort } from '../src/templates.js'
import type { TypeDescriptor } from '../src/templates.js'
import { effectDurationInput, effectExpressionPolicy, effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
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
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	activityInput,
	activityType,
	cronType,
	durableClockType,
	durableDeferredInput,
	durableDeferredTokenType,
	durableDeferredType,
	durableQueueInput,
	durableQueueType,
	messageStorageRequirement,
	persistedQueueFactoryRequirement,
	rpcGroupType,
	shardingRequirement,
	workflowEngineRequirement,
	workflowEngineType,
	workflowInput,
	workflowInstanceRequirement,
	workflowResultType,
	workflowType
} from './effect-workflow-durable-template-helpers.js'

/**
 * Effect v4 durable-workflow foundations.
 * Runtime contract:
 *   import { Cause, Cron, Effect, Layer, Option, Schedule, Schema } from 'effect'
 *   import { Activity, DurableClock, DurableDeferred, DurableQueue, Workflow, WorkflowEngine, WorkflowProxy, WorkflowProxyServer } from 'effect/unstable/workflow'
 *   import { ClusterCron, ClusterWorkflowEngine } from 'effect/unstable/cluster'
 */
const VERSION = '1.0.0' as const
const scope = '{ readonly __effectScopeRequirement: "Scope" }'

const schemaInput = (description: string, decoded = 'unknown', encoded = 'unknown', decode = 'never', encode = decode) =>
	typedExpressionInput(description, schemaType(decoded, encoded, decode, encode))
const scheduleInput = (description: string, output = 'unknown', input = 'unknown', requirements = 'never') =>
	typedExpressionInput(description, scheduleType(output, input, requirements))
const tokenInput = (description: string) => typedExpressionInput(description, durableDeferredTokenType())
const numericInput = (description: string, schema: Readonly<Record<string, unknown>>, type: TypeDescriptor = { ts: 'number' }) => unionPort({
	options: [
		literalPort({ regionKind: 'expression', schema, description }),
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type }, description }),
		rawCodePort({ regionKind: 'expression', policy: effectExpressionPolicy, type, description })
	], description
})
const positiveIntegerInput = (description: string) => numericInput(description, { type: 'integer', minimum: 1 })

export const WorkflowMakeTemplate = defineTemplate({
	modelId: 'WorkflowMake', version: VERSION,
	description: 'Defines a durable workflow with typed payload, success, failure, and deterministic idempotency key.',
	typeParameters: typeParameters(['P','Payload type.'],['PE','Encoded payload type.'],['A','Success type.'],['E','Error type.'],['RPD','Payload decoding services.'],['RPE','Payload encoding services.'],['RAD','Success decoding services.'],['RAE','Success encoding services.'],['RED','Error decoding services.'],['REE','Error encoding services.']),
	inputs: {
		name: stringInput('Stable workflow tag.'),
		payload: schemaInput('Struct payload schema.', '{{P}}','{{PE}}','{{RPD}}','{{RPE}}'),
		success: schemaInput('Workflow success schema.', '{{A}}','unknown','{{RAD}}','{{RAE}}'),
		error: schemaInput('Workflow error schema.', '{{E}}','unknown','{{RED}}','{{REE}}'),
		idempotencyKey: callbackInput('Deterministic idempotency-key function.', { ts: '(payload: {{P}}) => string' })
	},
	output: expressionOutput('Durable Workflow definition.', workflowType('string','{{P}}','{{A}}','{{E}}')),
	source: `Workflow.make(${marker('string','name','"JobWorkflow"')}, { payload: ${marker('expression','payload','Schema.Struct({ id: Schema.String })')}, success: ${marker('expression','success','Schema.Unknown')}, error: ${marker('expression','error','Schema.Unknown')}, idempotencyKey: ${marker('expression','idempotencyKey','payload => String(payload.id)')} })`
})

export const WorkflowExecuteTemplate = defineTemplate({
	modelId: 'WorkflowExecute', version: VERSION, description: 'Executes a durable workflow and waits for its typed result.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.'],['R','Client schema requirements.']),
	inputs: { workflow: workflowInput('Workflow to execute.','string','{{P}}','{{A}}','{{E}}'), payload: valueInput('Workflow payload.', { ts: '{{P}}' }) },
	output: expressionOutput('Workflow execution Effect.', effectType('{{A}}','{{E}}',`${workflowEngineRequirement} | {{R}}`)),
	source: `${marker('expression','workflow','JobWorkflow')}.execute(${marker('expression','payload','{}')})`
})

export const WorkflowExecuteDiscardTemplate = defineTemplate({
	modelId: 'WorkflowExecuteDiscard', version: VERSION, description: 'Starts a workflow durably without waiting and returns its deterministic execution ID.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.'],['R','Client schema requirements.']),
	inputs: { workflow: workflowInput('Workflow to dispatch.','string','{{P}}','{{A}}','{{E}}'), payload: valueInput('Workflow payload.', { ts: '{{P}}' }) },
	output: expressionOutput('Durable workflow execution ID.', effectType('string','never',`${workflowEngineRequirement} | {{R}}`)),
	source: `${marker('expression','workflow','JobWorkflow')}.execute(${marker('expression','payload','{}')}, { discard: true })`
})

export const WorkflowPollTemplate = defineTemplate({
	modelId: 'WorkflowPoll', version: VERSION, description: 'Polls persisted workflow state by execution ID.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.'],['R','Result-decoding requirements.']),
	inputs: { workflow: workflowInput('Workflow definition.','string','{{P}}','{{A}}','{{E}}'), executionId: effectValueInput('Execution ID.', { ts: 'string' }) },
	output: expressionOutput('Optional persisted workflow result.', effectType(`{ readonly _tag: "None" } | { readonly _tag: "Some"; readonly value: ${workflowResultType('{{A}}','{{E}}').ts} }`,'never',`${workflowEngineRequirement} | {{R}}`)),
	source: `${marker('expression','workflow','JobWorkflow')}.poll(${marker('expression','executionId','"execution-id"')})`
})

export const WorkflowInterruptTemplate = defineTemplate({
	modelId: 'WorkflowInterrupt', version: VERSION, description: 'Interrupts a durable workflow execution by ID.',
	inputs: { workflow: workflowInput('Workflow definition.'), executionId: effectValueInput('Execution ID.', { ts: 'string' }) },
	output: expressionOutput('Workflow interruption Effect.', effectType('void','never',workflowEngineRequirement)),
	source: `${marker('expression','workflow','JobWorkflow')}.interrupt(${marker('expression','executionId','"execution-id"')})`
})

export const WorkflowResumeTemplate = defineTemplate({
	modelId: 'WorkflowResume', version: VERSION, description: 'Manually resumes a suspended workflow execution.',
	inputs: { workflow: workflowInput('Workflow definition.'), executionId: effectValueInput('Execution ID.', { ts: 'string' }) },
	output: expressionOutput('Workflow resume Effect.', effectType('void','never',workflowEngineRequirement)),
	source: `${marker('expression','workflow','JobWorkflow')}.resume(${marker('expression','executionId','"execution-id"')})`
})

export const WorkflowExecutionIdTemplate = defineTemplate({
	modelId: 'WorkflowExecutionId', version: VERSION, description: 'Computes the deterministic execution ID for a workflow payload.',
	typeParameters: typeParameters(['P','Payload type.']),
	inputs: { workflow: workflowInput('Workflow definition.','string','{{P}}'), payload: valueInput('Workflow payload.', { ts: '{{P}}' }) },
	output: expressionOutput('Deterministic workflow execution ID Effect.', effectType('string','never','never')),
	source: `${marker('expression','workflow','JobWorkflow')}.executionId(${marker('expression','payload','{}')})`
})

export const WorkflowToLayerTemplate = defineTemplate({
	modelId: 'WorkflowToLayer', version: VERSION, description: 'Registers a durable workflow handler with the active WorkflowEngine.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.'],['R','Handler requirements.']),
	inputs: { workflow: workflowInput('Workflow definition.','string','{{P}}','{{A}}','{{E}}'), handler: callbackInput('Workflow handler.', effectReturningCallbackType('payload: {{P}}, executionId: string','{{A}}','{{E}}','{{R}}')) },
	output: expressionOutput('Workflow handler registration Layer.', layerType('never','never',`${workflowEngineRequirement} | {{R}}`)),
	source: `${marker('expression','workflow','JobWorkflow')}.toLayer(${marker('expression','handler','(payload, executionId) => Effect.succeed(payload)')})`
})

export const WorkflowWithCompensationTemplate = defineTemplate({
	modelId: 'WorkflowWithCompensation', version: VERSION, description: 'Registers workflow compensation for a completed top-level effect when the overall workflow later fails.',
	typeParameters: typeParameters(['A','Effect success type.'],['E','Effect error type.'],['R','Effect requirements.'],['WE','Workflow error type.'],['R2','Compensation requirements.']),
	inputs: {
		workflow: workflowInput('Owning workflow.','string','unknown','unknown','{{WE}}'),
		source: effectSourceInput('Top-level workflow effect whose success can be compensated.', effectType('{{A}}','{{E}}','{{R}}')),
		compensation: callbackInput('Infallible compensation callback.', effectReturningCallbackType('value: {{A}}, cause: unknown','void','never','{{R2}}'))
	},
	output: expressionOutput('Compensated workflow effect.', effectType('{{A}}','{{E}}',`{{R}} | {{R2}} | ${workflowInstanceRequirement} | ${scope}`)),
	source: `${marker('expression','workflow','JobWorkflow')}.withCompensation(${marker('expression','source','Effect.void')}, ${marker('expression','compensation','() => Effect.void')})`
})

export const ActivityMakeTemplate = defineTemplate({
	modelId: 'ActivityMake', version: VERSION, description: 'Creates a memoized durable workflow activity around an Effect.',
	typeParameters: typeParameters(['A','Activity success type.'],['E','Activity error type.'],['R','Activity requirements.']),
	inputs: { name: stringInput('Stable activity name.'), success: schemaInput('Activity success schema.','{{A}}'), error: schemaInput('Activity error schema.','{{E}}'), execute: effectSourceInput('Activity Effect.', effectType('{{A}}','{{E}}','{{R}}')) },
	output: expressionOutput('Durable Activity.', activityType('{{A}}','{{E}}','{{R}}')),
	source: `Activity.make({ name: ${marker('string','name','"send-email"')}, success: ${marker('expression','success','Schema.Unknown')}, error: ${marker('expression','error','Schema.Unknown')}, execute: ${marker('expression','execute','Effect.void')} })`
})

export const ActivityRetryTimesTemplate = defineTemplate({
	modelId: 'ActivityRetryTimes', version: VERSION, description: 'Retries an activity body while exposing the current attempt through Activity.CurrentAttempt.',
	typeParameters: typeParameters(['A','Success type.'],['E','Error type.'],['R','Requirements.']),
	inputs: { source: effectSourceInput('Activity body Effect.', effectType('{{A}}','{{E}}','{{R}}')), times: effectValueInput('Maximum retry count.', { ts: 'number' }) },
	output: expressionOutput('Activity-aware retried Effect.', effectType('{{A}}','{{E}}','{{R}}')),
	source: `Activity.retry(${marker('expression','source','Effect.void')}, { times: ${marker('expression','times','3')} })`
})

export const ActivityIdempotencyKeyTemplate = defineTemplate({
	modelId: 'ActivityIdempotencyKey', version: VERSION, description: 'Derives a deterministic idempotency key from the workflow execution and activity name.',
	inputs: { name: effectValueInput('Activity-side-effect name.', { ts: 'string' }) },
	output: expressionOutput('Activity idempotency key Effect.', effectType('string','never',workflowInstanceRequirement)),
	source: `Activity.idempotencyKey(${marker('expression','name','"charge-card"')})`
})

export const ActivityIdempotencyKeyWithAttemptTemplate = defineTemplate({
	modelId: 'ActivityIdempotencyKeyWithAttempt', version: VERSION, description: 'Derives an activity idempotency key that distinguishes retry attempts.',
	inputs: { name: effectValueInput('Activity-side-effect name.', { ts: 'string' }) },
	output: expressionOutput('Attempt-specific activity idempotency key Effect.', effectType('string','never',workflowInstanceRequirement)),
	source: `Activity.idempotencyKey(${marker('expression','name','"charge-card"')}, { includeAttempt: true })`
})

export const ActivityRaceAllTemplate = defineTemplate({
	modelId: 'ActivityRaceAll', version: VERSION, description: 'Runs a non-empty set of Activities as a durable race.',
	typeParameters: typeParameters(['A','Union success type.'],['E','Union error type.'],['R','Activity requirements.']),
	inputs: { name: stringInput('Stable durable-race name.'), activities: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: activityType('{{A}}','{{E}}','{{R}}') }, minItems: 1, separator: ', ', description: 'Activities participating in the durable race.' }) },
	output: expressionOutput('Durable activity-race Effect.', effectType('{{A}}','{{E}}',`{{R}} | ${workflowEngineRequirement} | ${workflowInstanceRequirement}`)),
	source: `Activity.raceAll(${marker('string','name','"providers"')}, [${marker('expression','activities','Activity.make({ name: "provider", execute: Effect.void })')}])`
})

export const DurableClockMakeTemplate = defineTemplate({
	modelId: 'DurableClockMake', version: VERSION, description: 'Creates a named durable clock definition.',
	inputs: { name: effectValueInput('Stable clock name.', { ts: 'string' }), duration: effectDurationInput('Clock duration.') },
	output: expressionOutput('Durable clock.', durableClockType()),
	source: `DurableClock.make({ name: ${marker('expression','name','"wait"')}, duration: ${marker('expression','duration','"1 hour"')} })`
})

export const DurableClockSleepTemplate = defineTemplate({
	modelId: 'DurableClockSleep', version: VERSION, description: 'Sleeps inside a workflow, using durable scheduling for long delays.',
	inputs: { name: effectValueInput('Stable sleep name.', { ts: 'string' }), duration: effectDurationInput('Sleep duration.'), inMemoryThreshold: effectDurationInput('Maximum duration to keep as an in-memory activity.') },
	output: expressionOutput('Durable workflow sleep Effect.', effectType('void','never',`${workflowEngineRequirement} | ${workflowInstanceRequirement}`)),
	source: `DurableClock.sleep({ name: ${marker('expression','name','"reminder-delay"')}, duration: ${marker('expression','duration','"24 hours"')}, inMemoryThreshold: ${marker('expression','inMemoryThreshold','"30 seconds"')} })`
})

export const DurableDeferredMakeTemplate = defineTemplate({
	modelId: 'DurableDeferredMake', version: VERSION, description: 'Creates a named durable externally completable wait point.',
	typeParameters: typeParameters(['A','Success type.'],['E','Error type.']),
	inputs: { name: effectValueInput('Stable deferred name.', { ts: 'string' }), success: schemaInput('Deferred success schema.','{{A}}'), error: schemaInput('Deferred error schema.','{{E}}') },
	output: expressionOutput('Durable deferred.', durableDeferredType('{{A}}','{{E}}')),
	source: `DurableDeferred.make(${marker('expression','name','"approval"')}, { success: ${marker('expression','success','Schema.Unknown')}, error: ${marker('expression','error','Schema.Unknown')} })`
})

export const DurableDeferredAwaitTemplate = defineTemplate({
	modelId: 'DurableDeferredAwait', version: VERSION, description: 'Awaits a durable deferred, suspending the workflow when no persisted result exists.',
	typeParameters: typeParameters(['A','Success type.'],['E','Error type.'],['R','Schema decoding requirements.']),
	inputs: { deferred: durableDeferredInput('Durable wait point.','{{A}}','{{E}}') },
	output: expressionOutput('Durable deferred await Effect.', effectType('{{A}}','{{E}}',`${workflowEngineRequirement} | ${workflowInstanceRequirement} | {{R}}`)),
	source: `DurableDeferred.await(${marker('expression','deferred','Approval')})`
})

export const DurableDeferredIntoTemplate = defineTemplate({
	modelId: 'DurableDeferredInto', version: VERSION, description: 'Runs an Effect and persists its terminal Exit into a durable deferred.',
	typeParameters: typeParameters(['A','Success type.'],['E','Error type.'],['R','Source requirements.'],['R2','Schema requirements.']),
	inputs: { source: effectSourceInput('Effect whose result is persisted.', effectType('{{A}}','{{E}}','{{R}}')), deferred: durableDeferredInput('Durable deferred.','{{A}}','{{E}}') },
	output: expressionOutput('Persisted-result Effect.', effectType('{{A}}','{{E}}',`{{R}} | {{R2}} | ${workflowEngineRequirement} | ${workflowInstanceRequirement}`)),
	source: `DurableDeferred.into(${marker('expression','source','Effect.void')}, ${marker('expression','deferred','Result')})`
})

export const DurableDeferredRaceAllTemplate = defineTemplate({
	modelId: 'DurableDeferredRaceAll', version: VERSION, description: 'Runs a non-empty collection of Effects as a durable race whose result is persisted.',
	typeParameters: typeParameters(['A','Union success type.'],['E','Union error type.'],['R','Effect requirements.']),
	inputs: { name: effectValueInput('Stable race name.', { ts: 'string' }), success: schemaInput('Race success schema.','{{A}}'), error: schemaInput('Race error schema.','{{E}}'), effects: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: effectType('{{A}}','{{E}}','{{R}}') }, minItems: 1, separator: ', ', description: 'Effects participating in the durable race.' }) },
	output: expressionOutput('Durable race Effect.', effectType('{{A}}','{{E}}',`{{R}} | ${workflowEngineRequirement} | ${workflowInstanceRequirement}`)),
	source: `DurableDeferred.raceAll({ name: ${marker('expression','name','"race"')}, success: ${marker('expression','success','Schema.Unknown')}, error: ${marker('expression','error','Schema.Unknown')}, effects: [${marker('expression','effects','Effect.void')}] })`
})

export const DurableDeferredTokenTemplate = defineTemplate({
	modelId: 'DurableDeferredToken', version: VERSION, description: 'Creates an external completion token for a durable deferred in the current workflow execution.',
	inputs: { deferred: durableDeferredInput('Durable deferred.') },
	output: expressionOutput('Durable deferred token Effect.', effectType(durableDeferredTokenType().ts,'never',workflowInstanceRequirement)),
	source: `DurableDeferred.token(${marker('expression','deferred','Approval')})`
})

export const DurableDeferredTokenFromPayloadTemplate = defineTemplate({
	modelId: 'DurableDeferredTokenFromPayload', version: VERSION, description: 'Creates a durable deferred token by deriving the target execution ID from workflow payload.',
	typeParameters: typeParameters(['P','Workflow payload type.']),
	inputs: { deferred: durableDeferredInput('Durable deferred.'), workflow: workflowInput('Workflow definition.','string','{{P}}'), payload: valueInput('Workflow payload.', { ts: '{{P}}' }) },
	output: expressionOutput('Durable deferred token Effect.', effectType(durableDeferredTokenType().ts,'never','never')),
	source: `DurableDeferred.tokenFromPayload(${marker('expression','deferred','Approval')}, { workflow: ${marker('expression','workflow','JobWorkflow')}, payload: ${marker('expression','payload','{}')} })`
})

export const DurableDeferredSucceedTemplate = defineTemplate({
	modelId: 'DurableDeferredSucceed', version: VERSION, description: 'Completes a durable deferred token with a success value.',
	typeParameters: typeParameters(['A','Success type.'],['E','Error type.'],['R','Schema encoding requirements.']),
	inputs: { deferred: durableDeferredInput('Durable deferred.','{{A}}','{{E}}'), token: tokenInput('External completion token.'), value: valueInput('Success value.', { ts: '{{A}}' }) },
	output: expressionOutput('Durable completion Effect.', effectType('void','never',`${workflowEngineRequirement} | {{R}}`)),
	source: `DurableDeferred.succeed(${marker('expression','deferred','Approval')}, { token: ${marker('expression','token','token')}, value: ${marker('expression','value','undefined')} })`
})

export const DurableDeferredFailTemplate = defineTemplate({
	modelId: 'DurableDeferredFail', version: VERSION, description: 'Completes a durable deferred token with a typed failure.',
	typeParameters: typeParameters(['A','Success type.'],['E','Error type.'],['R','Schema encoding requirements.']),
	inputs: { deferred: durableDeferredInput('Durable deferred.','{{A}}','{{E}}'), token: tokenInput('External completion token.'), error: valueInput('Typed failure.', { ts: '{{E}}' }) },
	output: expressionOutput('Durable failed-completion Effect.', effectType('void','never',`${workflowEngineRequirement} | {{R}}`)),
	source: `DurableDeferred.fail(${marker('expression','deferred','Approval')}, { token: ${marker('expression','token','token')}, error: ${marker('expression','error','undefined')} })`
})

export const DurableQueueMakeTemplate = defineTemplate({
	modelId: 'DurableQueueMake', version: VERSION, description: 'Defines a persisted background-work queue with typed payload and completion schemas.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.']),
	inputs: { name: effectValueInput('Stable queue name.', { ts: 'string' }), payload: schemaInput('Queue payload schema.','{{P}}'), success: schemaInput('Worker success schema.','{{A}}'), error: schemaInput('Worker error schema.','{{E}}'), idempotencyKey: callbackInput('Payload idempotency key.', { ts: '(payload: {{P}}) => string' }) },
	output: expressionOutput('Durable queue definition.', durableQueueType('{{P}}','{{A}}','{{E}}')),
	source: `DurableQueue.make({ name: ${marker('expression','name','"email-jobs"')}, payload: ${marker('expression','payload','Schema.Struct({ id: Schema.String })')}, success: ${marker('expression','success','Schema.Unknown')}, error: ${marker('expression','error','Schema.Unknown')}, idempotencyKey: ${marker('expression','idempotencyKey','payload => String(payload.id)')} })`
})

export const DurableQueueProcessTemplate = defineTemplate({
	modelId: 'DurableQueueProcess', version: VERSION, description: 'Enqueues a durable job and waits for a worker-produced typed result.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.'],['R','Schema requirements.']),
	inputs: { queue: durableQueueInput('Durable queue.','{{P}}','{{A}}','{{E}}'), payload: valueInput('Job payload.', { ts: '{{P}}' }) },
	output: expressionOutput('Durable queue processing Effect.', effectType('{{A}}','{{E}}',`${workflowEngineRequirement} | ${workflowInstanceRequirement} | ${persistedQueueFactoryRequirement} | {{R}}`)),
	source: `DurableQueue.process(${marker('expression','queue','Jobs')}, ${marker('expression','payload','{}')})`
})

export const DurableQueueProcessWithRetryTemplate = defineTemplate({
	modelId: 'DurableQueueProcessWithRetry', version: VERSION, description: 'Enqueues a durable job with an explicit persisted-queue delivery retry schedule.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.'],['R','Schema requirements.'],['R2','Retry schedule requirements.']),
	inputs: { queue: durableQueueInput('Durable queue.','{{P}}','{{A}}','{{E}}'), payload: valueInput('Job payload.', { ts: '{{P}}' }), retrySchedule: scheduleInput('Persisted-queue retry schedule.','unknown','unknown','{{R2}}') },
	output: expressionOutput('Durable queue processing Effect.', effectType('{{A}}','{{E}}',`${workflowEngineRequirement} | ${workflowInstanceRequirement} | ${persistedQueueFactoryRequirement} | {{R}} | {{R2}}`)),
	source: `DurableQueue.process(${marker('expression','queue','Jobs')}, ${marker('expression','payload','{}')}, { retrySchedule: ${marker('expression','retrySchedule','Schedule.exponential(100)')} })`
})

export const DurableQueueMakeWorkerTemplate = defineTemplate({
	modelId: 'DurableQueueMakeWorker', version: VERSION, description: 'Creates the never-ending worker Effect for a durable queue.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.'],['R','Worker requirements.']),
	inputs: { queue: durableQueueInput('Durable queue.','{{P}}','{{A}}','{{E}}'), handler: callbackInput('Durable job handler.', effectReturningCallbackType('payload: {{P}}','{{A}}','{{E}}','{{R}}')), concurrency: positiveIntegerInput('Worker concurrency.') },
	output: expressionOutput('Durable queue worker Effect.', effectType('never','never',`${workflowEngineRequirement} | ${persistedQueueFactoryRequirement} | {{R}}`)),
	source: `DurableQueue.makeWorker(${marker('expression','queue','Jobs')}, ${marker('expression','handler','payload => Effect.succeed(payload)')}, { concurrency: ${marker('expression','concurrency','1')} })`
})

export const DurableQueueWorkerLayerTemplate = defineTemplate({
	modelId: 'DurableQueueWorkerLayer', version: VERSION, description: 'Creates a Layer that runs workers for a durable queue.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.'],['R','Worker requirements.']),
	inputs: { queue: durableQueueInput('Durable queue.','{{P}}','{{A}}','{{E}}'), handler: callbackInput('Durable job handler.', effectReturningCallbackType('payload: {{P}}','{{A}}','{{E}}','{{R}}')), concurrency: positiveIntegerInput('Worker concurrency.') },
	output: expressionOutput('Durable queue worker Layer.', layerType('never','never',`${workflowEngineRequirement} | ${persistedQueueFactoryRequirement} | {{R}}`)),
	source: `DurableQueue.worker(${marker('expression','queue','Jobs')}, ${marker('expression','handler','payload => Effect.succeed(payload)')}, { concurrency: ${marker('expression','concurrency','1')} })`
})

export const WorkflowEngineLayerMemoryTemplate = defineTemplate({
	modelId: 'WorkflowEngineLayerMemory', version: VERSION, description: 'Provides the in-memory WorkflowEngine for tests and local development only.',
	inputs: {}, output: expressionOutput('In-memory WorkflowEngine Layer.', layerType(workflowEngineRequirement,'never','never')), source: 'WorkflowEngine.layerMemory'
})

export const ClusterWorkflowEngineLayerTemplate = defineTemplate({
	modelId: 'ClusterWorkflowEngineLayer', version: VERSION, description: 'Provides the durable cluster-backed WorkflowEngine using sharding and message storage.',
	inputs: {}, output: expressionOutput('Cluster-backed WorkflowEngine Layer.', layerType(workflowEngineRequirement,'never',`${shardingRequirement} | ${messageStorageRequirement}`)), source: 'ClusterWorkflowEngine.layer'
})

export const ClusterCronMakeTemplate = defineTemplate({
	modelId: 'ClusterCronMake', version: VERSION, description: 'Creates a cluster-owned persisted recurring cron job Layer.',
	typeParameters: typeParameters(['E','Job error type.'],['R','Job requirements.']),
	inputs: { name: effectValueInput('Stable cron job name.', { ts: 'string' }), cron: typedExpressionInput('Cron schedule.', cronType()), execute: effectSourceInput('Recurring job Effect.', effectType('void','{{E}}','{{R}}')), shardGroup: effectValueInput('Cluster shard group.', { ts: 'string' }), calculateFromPrevious: effectValueInput('Whether the next run is based on the previous scheduled time.', { ts: 'boolean' }), skipIfOlderThan: effectDurationInput('Skip runs older than this duration.') },
	output: expressionOutput('Cluster cron Layer.', layerType('never','never',`${shardingRequirement} | {{R}}`)),
	source: `ClusterCron.make({ name: ${marker('expression','name','"daily-maintenance"')}, cron: ${marker('expression','cron','Cron.parseUnsafe("0 0 * * *")')}, execute: ${marker('expression','execute','Effect.void')}, shardGroup: ${marker('expression','shardGroup','"default"')}, calculateNextRunFromPrevious: ${marker('expression','calculateFromPrevious','false')}, skipIfOlderThan: ${marker('expression','skipIfOlderThan','"1 day"')} })`
})

export const WorkflowProxyToRpcGroupTemplate = defineTemplate({
	modelId: 'WorkflowProxyToRpcGroup', version: VERSION, description: 'Derives execute/discard/resume RPC definitions from workflow contracts.',
	inputs: { workflows: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: workflowType() }, minItems: 1, separator: ', ', description: 'Workflow definitions.' }), prefix: effectValueInput('RPC tag prefix.', { ts: 'string' }) },
	output: expressionOutput('Workflow RPC group.', rpcGroupType()),
	source: `WorkflowProxy.toRpcGroup([${marker('expression','workflows','JobWorkflow')}], { prefix: ${marker('expression','prefix','"Workflow"')} })`
})

export const WorkflowProxyRpcHandlersLayerTemplate = defineTemplate({
	modelId: 'WorkflowProxyRpcHandlersLayer', version: VERSION, description: 'Creates RPC handler services for workflow execute/discard/resume operations.',
	inputs: { workflows: fragmentCollectionPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type: workflowType() }, minItems: 1, separator: ', ', description: 'Workflow definitions.' }), prefix: effectValueInput('RPC tag prefix.', { ts: 'string' }) },
	output: expressionOutput('Workflow proxy RPC handler Layer.', layerType('unknown','never',workflowEngineRequirement)),
	source: `WorkflowProxyServer.layerRpcHandlers([${marker('expression','workflows','JobWorkflow')}], { prefix: ${marker('expression','prefix','"Workflow"')} })`
})


export const WorkflowSuspendOnFailureTemplate = defineTemplate({
	modelId: 'WorkflowSuspendOnFailure', version: VERSION, description: 'Annotates a workflow so typed failures suspend the execution for later manual resume instead of completing it.',
	inputs: { workflow: workflowInput('Workflow definition.') },
	output: expressionOutput('Suspend-on-failure workflow.', workflowType()),
	source: `${marker('expression','workflow','JobWorkflow')}.annotate(Workflow.SuspendOnFailure, true)`
})

export const WorkflowCaptureDefectsTemplate = defineTemplate({
	modelId: 'WorkflowCaptureDefects', version: VERSION, description: 'Configures whether defects are captured into durable workflow results.',
	inputs: { workflow: workflowInput('Workflow definition.'), capture: effectValueInput('Whether defects should be captured.', { ts: 'boolean' }) },
	output: expressionOutput('Workflow with defect-capture policy.', workflowType()),
	source: `${marker('expression','workflow','JobWorkflow')}.annotate(Workflow.CaptureDefects, ${marker('expression','capture','true')})`
})

export const DurableDeferredWithActivityAttemptTemplate = defineTemplate({
	modelId: 'DurableDeferredWithActivityAttempt', version: VERSION, description: 'Derives an activity-attempt-specific durable deferred name so retries do not share the same wait point.',
	typeParameters: typeParameters(['A','Deferred success type.'],['E','Deferred error type.']),
	inputs: { deferred: durableDeferredInput('Base durable deferred.','{{A}}','{{E}}') },
	output: expressionOutput('Attempt-specific durable deferred Effect.', effectType(durableDeferredType('{{A}}','{{E}}').ts,'never','never')),
	source: `${marker('expression','deferred','Callback')}.withActivityAttempt`
})

export const effectV4DurableWorkflowFoundationalGraphTemplateInputs = [
	WorkflowMakeTemplate, WorkflowExecuteTemplate, WorkflowExecuteDiscardTemplate, WorkflowPollTemplate,
	WorkflowInterruptTemplate, WorkflowResumeTemplate, WorkflowExecutionIdTemplate, WorkflowToLayerTemplate,
	WorkflowWithCompensationTemplate, WorkflowSuspendOnFailureTemplate, WorkflowCaptureDefectsTemplate, ActivityMakeTemplate, ActivityRetryTimesTemplate, ActivityIdempotencyKeyTemplate,
	ActivityIdempotencyKeyWithAttemptTemplate, ActivityRaceAllTemplate, DurableClockMakeTemplate, DurableClockSleepTemplate,
	DurableDeferredMakeTemplate, DurableDeferredWithActivityAttemptTemplate, DurableDeferredAwaitTemplate, DurableDeferredIntoTemplate, DurableDeferredRaceAllTemplate,
	DurableDeferredTokenTemplate, DurableDeferredTokenFromPayloadTemplate, DurableDeferredSucceedTemplate, DurableDeferredFailTemplate,
	DurableQueueMakeTemplate, DurableQueueProcessTemplate, DurableQueueProcessWithRetryTemplate, DurableQueueMakeWorkerTemplate,
	DurableQueueWorkerLayerTemplate, WorkflowEngineLayerMemoryTemplate, ClusterWorkflowEngineLayerTemplate, ClusterCronMakeTemplate,
	WorkflowProxyToRpcGroupTemplate, WorkflowProxyRpcHandlersLayerTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
