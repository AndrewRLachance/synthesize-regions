import { defineTemplate } from '../../../authoring/define-template.js'
import { effectDurationInput, effectSourceInput, effectType, effectValueInput } from '../core/effect-ts.js'
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
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import {
	activityType,
	cronType,
	durableDeferredInput,
	durableDeferredTokenType,
	durableQueueInput,
	messageStorageRequirement,
	persistedQueueFactoryRequirement,
	shardingRequirement,
	workflowEngineRequirement,
	workflowInput,
	workflowInstanceRequirement,
	workflowType
} from './effect-workflow-durable-template-helpers.js'

/** Production-oriented durable/background workflow compositions. */
const VERSION = '1.0.0' as const
const schemaInput = (description: string, decoded = 'unknown') => typedExpressionInput(description, schemaType(decoded))
const scheduleInput = (description: string, input = 'unknown') => typedExpressionInput(description, scheduleType('unknown', input, 'never'))

export const DurableRetriedActivityTemplate = defineTemplate({
	modelId: 'DurableRetriedActivity', version: VERSION, description: 'Creates a durable Activity whose body retries with Activity-aware attempt numbering.',
	typeParameters: typeParameters(['A','Success type.'],['E','Error type.'],['R','Operation requirements.']),
	inputs: { name: effectValueInput('Stable activity name.', { ts: 'string' }), success: schemaInput('Success schema.','{{A}}'), error: schemaInput('Error schema.','{{E}}'), operation: effectSourceInput('Operation Effect.', effectType('{{A}}','{{E}}','{{R}}')), retries: effectValueInput('Maximum retry count.', { ts: 'number' }) },
	output: expressionOutput('Retried durable Activity.', activityType('{{A}}','{{E}}','{{R}}')),
	source: `Activity.make({ name: ${marker('expression','name','"external-call"')}, success: ${marker('expression','success','Schema.Unknown')}, error: ${marker('expression','error','Schema.Unknown')}, execute: Activity.retry(${marker('expression','operation','Effect.void')}, { times: ${marker('expression','retries','3')} }) })`
})

export const DurableIdempotentActivityTemplate = defineTemplate({
	modelId: 'DurableIdempotentActivity', version: VERSION, description: 'Runs an external side effect with a deterministic activity idempotency key supplied to the operation callback.',
	typeParameters: typeParameters(['A','Success type.'],['E','Error type.'],['R','Operation requirements.']),
	inputs: { name: effectValueInput('Stable side-effect name.', { ts: 'string' }), operation: callbackInput('External operation receiving the idempotency key.', effectReturningCallbackType('idempotencyKey: string','{{A}}','{{E}}','{{R}}')) },
	output: expressionOutput('Idempotent workflow-side-effect Effect.', effectType('{{A}}','{{E}}',`{{R}} | ${workflowInstanceRequirement}`)),
	source: `Effect.flatMap(Activity.idempotencyKey(${marker('expression','name','"external-write"')}), ${marker('expression','operation','key => Effect.succeed(key)')})`
})

export const DurableCallbackAndAwaitTemplate = defineTemplate({
	modelId: 'DurableCallbackAndAwait', version: VERSION, description: 'Publishes a durable completion token to an external system and then suspends until that token is completed.',
	typeParameters: typeParameters(['A','Callback result type.'],['E','Callback failure type.'],['R','Token publication requirements.'],['RD','Deferred schema requirements.']),
	inputs: { deferred: durableDeferredInput('Durable callback wait point.','{{A}}','{{E}}'), publishToken: callbackInput('Effectful external token publisher.', effectReturningCallbackType(`token: ${durableDeferredTokenType().ts}`,'void','never','{{R}}')) },
	output: expressionOutput('Externally completed durable wait Effect.', effectType('{{A}}','{{E}}',`${workflowEngineRequirement} | ${workflowInstanceRequirement} | {{R}} | {{RD}}`)),
	source: `Effect.gen(function* () { const deferred = ${marker('expression','deferred','Callback')}; const token = yield* DurableDeferred.token(deferred); yield* (${marker('expression','publishToken','(_token: unknown) => Effect.void')})(token); return yield* DurableDeferred.await(deferred) })`
})

export const DurableApprovalWorkflowStepTemplate = defineTemplate({
	modelId: 'DurableApprovalWorkflowStep', version: VERSION, description: 'Publishes an approval token, waits durably for approval, then branches to approved or rejected Effects.',
	typeParameters: typeParameters(['R','Token publication requirements.'],['A','Approved result type.'],['E','Branch error type.'],['R2','Branch requirements.']),
	inputs: { deferred: durableDeferredInput('Boolean approval deferred.','boolean','never'), publishToken: callbackInput('External token publisher.', effectReturningCallbackType(`token: ${durableDeferredTokenType().ts}`,'void','never','{{R}}')), onApproved: effectSourceInput('Approved branch.', effectType('{{A}}','{{E}}','{{R2}}')), onRejected: effectSourceInput('Rejected branch.', effectType('{{A}}','{{E}}','{{R2}}')) },
	output: expressionOutput('Durable approval-gated Effect.', effectType('{{A}}','{{E}}',`${workflowEngineRequirement} | ${workflowInstanceRequirement} | {{R}} | {{R2}}`)),
	source: `Effect.gen(function* () { const approval = ${marker('expression','deferred','Approval')}; const token = yield* DurableDeferred.token(approval); yield* (${marker('expression','publishToken','(_token: unknown) => Effect.void')})(token); const approved = yield* DurableDeferred.await(approval); return yield* (approved ? ${marker('expression','onApproved','Effect.void')} : ${marker('expression','onRejected','Effect.void')}) })`
})

export const DurableDelayThenEffectTemplate = defineTemplate({
	modelId: 'DurableDelayThenEffect', version: VERSION, description: 'Sleeps durably and then runs a continuation Effect.',
	typeParameters: typeParameters(['A','Continuation success type.'],['E','Continuation error type.'],['R','Continuation requirements.']),
	inputs: { name: effectValueInput('Stable delay name.', { ts: 'string' }), duration: effectDurationInput('Delay duration.'), continuation: effectSourceInput('Effect run after the durable delay.', effectType('{{A}}','{{E}}','{{R}}')) },
	output: expressionOutput('Delayed workflow Effect.', effectType('{{A}}','{{E}}',`${workflowEngineRequirement} | ${workflowInstanceRequirement} | {{R}}`)),
	source: `Effect.andThen(DurableClock.sleep({ name: ${marker('expression','name','"delay"')}, duration: ${marker('expression','duration','"1 hour"')} }), ${marker('expression','continuation','Effect.void')})`
})

export const DurableCompensatedStepTemplate = defineTemplate({
	modelId: 'DurableCompensatedStep', version: VERSION, description: 'Runs a workflow step and registers an infallible compensating action for overall-workflow failure.',
	typeParameters: typeParameters(['A','Step success type.'],['E','Step error type.'],['R','Step requirements.'],['WE','Workflow error type.'],['R2','Compensation requirements.']),
	inputs: { workflow: workflowInput('Owning workflow.','string','unknown','unknown','{{WE}}'), step: effectSourceInput('Workflow step.', effectType('{{A}}','{{E}}','{{R}}')), compensate: callbackInput('Compensation callback.', effectReturningCallbackType('value: {{A}}, cause: unknown','void','never','{{R2}}')) },
	output: expressionOutput('Compensated step Effect.', effectType('{{A}}','{{E}}',`{{R}} | {{R2}} | ${workflowInstanceRequirement} | { readonly __effectScopeRequirement: "Scope" }`)),
	source: `${marker('expression','workflow','JobWorkflow')}.withCompensation(${marker('expression','step','Effect.void')}, ${marker('expression','compensate','() => Effect.void')})`
})

export const DurableChildWorkflowTemplate = defineTemplate({
	modelId: 'DurableChildWorkflow', version: VERSION, description: 'Executes a child workflow from inside a parent durable workflow and awaits its result.',
	typeParameters: typeParameters(['P','Child payload type.'],['A','Child success type.'],['E','Child error type.'],['R','Client schema requirements.']),
	inputs: { child: workflowInput('Child workflow.','string','{{P}}','{{A}}','{{E}}'), payload: valueInput('Child workflow payload.', { ts: '{{P}}' }) },
	output: expressionOutput('Child workflow execution Effect.', effectType('{{A}}','{{E}}',`${workflowEngineRequirement} | {{R}}`)),
	source: `${marker('expression','child','ChildWorkflow')}.execute(${marker('expression','payload','{}')})`
})

export const DurableQueueObservedWorkerLayerTemplate = defineTemplate({
	modelId: 'DurableQueueObservedWorkerLayer', version: VERSION, description: 'Runs durable queue workers with per-job tracing and structured log annotations.',
	typeParameters: typeParameters(['P','Job payload type.'],['A','Job result type.'],['E','Job error type.'],['R','Handler requirements.']),
	inputs: { queue: durableQueueInput('Durable queue.','{{P}}','{{A}}','{{E}}'), handler: callbackInput('Job handler.', effectReturningCallbackType('payload: {{P}}','{{A}}','{{E}}','{{R}}')), concurrency: effectValueInput('Worker concurrency.', { ts: 'number' }), spanName: effectValueInput('Job tracing span.', { ts: 'string' }) },
	output: expressionOutput('Observed durable-worker Layer.', layerType('never','never',`${workflowEngineRequirement} | ${persistedQueueFactoryRequirement} | {{R}}`)),
	source: `DurableQueue.worker(${marker('expression','queue','Jobs')}, payload => Effect.withSpan(Effect.annotateLogs((${marker('expression','handler','payload => Effect.succeed(payload)')})(payload), { durableQueue: "worker" }), ${marker('expression','spanName','"durable.job"')}), { concurrency: ${marker('expression','concurrency','4')} })`
})

export const DurableQueueWorkflowDispatchLayerTemplate = defineTemplate({
	modelId: 'DurableQueueWorkflowDispatchLayer', version: VERSION, description: 'Consumes durable queue items and dispatches each item to a durable workflow.',
	typeParameters: typeParameters(['P','Queue payload type.'],['WP','Workflow payload type.'],['A','Workflow success type.'],['E','Workflow error type.'],['R','Client schema requirements.']),
	inputs: { queue: durableQueueInput('Queue feeding workflow starts.','{{P}}','{{A}}','{{E}}'), workflow: workflowInput('Target workflow.','string','{{WP}}','{{A}}','{{E}}'), toPayload: callbackInput('Queue-to-workflow payload mapping.', { ts: '(payload: {{P}}) => {{WP}}' }), concurrency: effectValueInput('Worker concurrency.', { ts: 'number' }) },
	output: expressionOutput('Durable queue-to-workflow worker Layer.', layerType('never','never',`${workflowEngineRequirement} | ${persistedQueueFactoryRequirement} | {{R}}`)),
	source: `DurableQueue.worker(${marker('expression','queue','Jobs')}, payload => ${marker('expression','workflow','JobWorkflow')}.execute((${marker('expression','toPayload','value => value')})(payload)), { concurrency: ${marker('expression','concurrency','4')} })`
})

export const DurableCronWorkflowDispatchLayerTemplate = defineTemplate({
	modelId: 'DurableCronWorkflowDispatchLayer', version: VERSION, description: 'Runs a durable workflow on a cluster-owned persisted cron schedule without waiting for each workflow result.',
	typeParameters: typeParameters(['P','Workflow payload type.'],['A','Workflow success type.'],['E','Workflow error type.']),
	inputs: { name: effectValueInput('Stable cron name.', { ts: 'string' }), cron: typedExpressionInput('Cron schedule.', cronType()), workflow: workflowInput('Workflow to dispatch.','string','{{P}}','{{A}}','{{E}}'), payload: valueInput('Workflow payload used for each run.', { ts: '{{P}}' }), shardGroup: effectValueInput('Cluster shard group.', { ts: 'string' }) },
	output: expressionOutput('Cluster cron workflow-dispatch Layer.', layerType('never','never',`${shardingRequirement} | ${workflowEngineRequirement}`)),
	source: `ClusterCron.make({ name: ${marker('expression','name','"scheduled-workflow"')}, cron: ${marker('expression','cron','Cron.parseUnsafe("0 * * * *")')}, shardGroup: ${marker('expression','shardGroup','"default"')}, execute: Effect.asVoid(${marker('expression','workflow','JobWorkflow')}.execute(${marker('expression','payload','{}')}, { discard: true })) })`
})

export const DurablePollUntilCompleteTemplate = defineTemplate({
	modelId: 'DurablePollUntilComplete', version: VERSION, description: 'Polls a workflow until a completed result is persisted, using a Schedule between polls.',
	inputs: { workflow: workflowInput('Workflow to poll.'), executionId: effectValueInput('Execution ID.', { ts: 'string' }), schedule: scheduleInput('Polling schedule.') },
	output: expressionOutput('Workflow result polling Effect.', effectType('unknown','never',workflowEngineRequirement)),
	source: `Effect.repeat(${marker('expression','workflow','JobWorkflow')}.poll(${marker('expression','executionId','"execution-id"')}), { while: result => Option.isNone(result) || result.value._tag === "Suspended", schedule: ${marker('expression','schedule','Schedule.spaced("1 second")')} })`
})

export const DurableWorkflowObservedDispatchTemplate = defineTemplate({
	modelId: 'DurableWorkflowObservedDispatch', version: VERSION, description: 'Starts a workflow without waiting and annotates logs/traces with the returned execution ID.',
	typeParameters: typeParameters(['P','Payload type.']),
	inputs: { workflow: workflowInput('Workflow to dispatch.','string','{{P}}'), payload: valueInput('Workflow payload.', { ts: '{{P}}' }), spanName: effectValueInput('Dispatch span name.', { ts: 'string' }) },
	output: expressionOutput('Observed durable workflow dispatch Effect.', effectType('string','never',workflowEngineRequirement)),
	source: `Effect.withSpan(Effect.tap(${marker('expression','workflow','JobWorkflow')}.execute(${marker('expression','payload','{}')}, { discard: true }), executionId => Effect.annotateLogs(Effect.void, { executionId })), ${marker('expression','spanName','"workflow.dispatch"')})`
})

export const DurableWorkflowHandlerLayerTemplate = defineTemplate({
	modelId: 'DurableWorkflowHandlerLayer', version: VERSION, description: 'Registers a workflow handler with structured workflow/execution logging around each run.',
	typeParameters: typeParameters(['P','Payload type.'],['A','Success type.'],['E','Error type.'],['R','Handler requirements.']),
	inputs: { workflow: workflowInput('Workflow definition.','string','{{P}}','{{A}}','{{E}}'), handler: callbackInput('Workflow business handler.', effectReturningCallbackType('payload: {{P}}, executionId: string','{{A}}','{{E}}','{{R}}')), spanName: effectValueInput('Workflow handler span name.', { ts: 'string' }) },
	output: expressionOutput('Observed workflow registration Layer.', layerType('never','never',`${workflowEngineRequirement} | {{R}}`)),
	source: `${marker('expression','workflow','JobWorkflow')}.toLayer((payload, executionId) => Effect.withSpan(Effect.annotateLogs((${marker('expression','handler','(payload, executionId) => Effect.succeed(payload)')})(payload, executionId), { executionId }), ${marker('expression','spanName','"workflow.run"')}))`
})

export const DurableWorkflowApplicationLayerTemplate = defineTemplate({
	modelId: 'DurableWorkflowApplicationLayer', version: VERSION, description: 'Combines workflow handlers, durable queue workers, and the cluster WorkflowEngine into one deployable Layer.',
	inputs: { handlers: typedExpressionInput('Merged workflow-handler Layer.', layerType('never','never',workflowEngineRequirement)), workers: typedExpressionInput('Merged durable-worker Layer.', layerType('never','never',`${workflowEngineRequirement} | ${persistedQueueFactoryRequirement}`)), infrastructure: typedExpressionInput('Cluster/persistence infrastructure Layer.', layerType(`${shardingRequirement} | ${messageStorageRequirement} | ${persistedQueueFactoryRequirement}`,'never','never')) },
	output: expressionOutput('Durable workflow application Layer.', layerType('never','never','never')),
	source: `Layer.provide(Layer.merge(${marker('expression','handlers','Layer.empty')}, ${marker('expression','workers','Layer.empty')}), Layer.merge(${marker('expression','infrastructure','Layer.empty')}, ClusterWorkflowEngine.layer))`
})

export const DurableWorkflowSourceFileTemplate = defineTemplate({
	modelId: 'DurableWorkflowSourceFile', version: VERSION, description: 'Builds a source file with Effect V4 workflow and cluster durable-execution modules in scope.',
	inputs: { body: statementCollectionInput('Workflow declarations, layers, and runtime statements.') },
	output: { kind: 'sourceFile', description: 'Complete Effect durable-workflow source file.' },
	source: `import { Cron, Effect, Layer, Option, Schedule, Schema } from "effect"\nimport { Activity, DurableClock, DurableDeferred, DurableQueue, Workflow, WorkflowEngine, WorkflowProxy, WorkflowProxyServer } from "effect/unstable/workflow"\nimport { ClusterCron, ClusterWorkflowEngine } from "effect/unstable/cluster"\n\n${marker('statement','body','void 0;')}`
})

export const effectV4DurableWorkflowCompositionGraphTemplateInputs = [
	DurableRetriedActivityTemplate, DurableIdempotentActivityTemplate, DurableCallbackAndAwaitTemplate,
	DurableApprovalWorkflowStepTemplate, DurableDelayThenEffectTemplate, DurableCompensatedStepTemplate,
	DurableChildWorkflowTemplate, DurableQueueObservedWorkerLayerTemplate, DurableQueueWorkflowDispatchLayerTemplate,
	DurableCronWorkflowDispatchLayerTemplate, DurablePollUntilCompleteTemplate, DurableWorkflowObservedDispatchTemplate,
	DurableWorkflowHandlerLayerTemplate, DurableWorkflowApplicationLayerTemplate, DurableWorkflowSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
