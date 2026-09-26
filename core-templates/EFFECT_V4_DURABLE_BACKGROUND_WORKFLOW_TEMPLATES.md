# Effect V4 Durable / Background Workflow Templates

**52 templates total:** 37 foundational durable-workflow templates and 15 production/background-workflow compositions.

This pack targets the current Effect V4 RC `effect/unstable/workflow` surface plus cluster-backed durable execution under `effect/unstable/cluster`.

## Design principles

- `Workflow.make` is the durable orchestration contract. Its idempotency key determines the deterministic execution id.
- `Activity.make` memoizes completed activity results. If an activity suspends before completion, its body can replay, so external side effects before suspension must still be idempotent.
- `DurableClock.sleep` is used for workflow-safe long delays instead of ordinary process-local timers.
- `DurableDeferred` is the durable callback / external-signal primitive. Tokens let code outside the workflow complete the correct execution and wait point.
- `DurableQueue` is for persisted background work. `process` waits for the worker result; `worker` / `makeWorker` host durable consumers.
- `WorkflowEngine.layerMemory` is for local development and tests only. Production durability is represented by `ClusterWorkflowEngine.layer`, which requires sharding plus message storage.
- Cluster cron is modeled separately from ordinary in-process schedules because it persists ownership/scheduling through the cluster.

## Pack structure

- `effect-workflow-durable-template-helpers.ts` — nominal workflow/activity/deferred/queue descriptors and requirements.
- `effect-v4-durable-workflow-foundational-templates.ts` — direct wrappers for Workflow, Activity, DurableClock, DurableDeferred, DurableQueue, WorkflowEngine, ClusterWorkflowEngine, ClusterCron, and workflow RPC proxy primitives.
- `effect-v4-durable-background-workflow-templates.ts` — production compositions for idempotent activities, callbacks/approvals, compensated steps, child workflows, observed workers, queue-to-workflow dispatch, cluster cron dispatch, polling, and application assembly.
- `effect-v4-durable-background-workflow-template-catalog.ts` — standalone catalog.
- `effect-v4-expanded-with-durable-background-workflow-template-catalog.ts` — expansion over the previous Socket/streaming-boundary catalog.

## Important boundaries

The workflow engine owns durable replay and persistence. These templates do not invent a separate checkpoint or lease API where Effect V4 does not expose one. If durable business state and an outbox must commit atomically in a database, use the SQL transaction templates rather than treating workflow replay state as a database transaction.

The cluster/workflow APIs are under `effect/unstable/*`; pin them to the catalog's Effect RC version and recapture the template catalog when upgrading.
