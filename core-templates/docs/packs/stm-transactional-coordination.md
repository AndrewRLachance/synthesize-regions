# Effect V4 STM + Transactional Coordination Templates

This pack targets the current Effect V4 transaction model. In V4, software transactional memory is expressed through `Effect.tx`, `Effect.txRetry`, and the `Tx*` data structures rather than through a separate user-facing `STM` program type.

## Files

- `effect-transaction-template-helpers.ts` — nominal descriptors for transactional values.
- `effect-v4-transaction-foundational-templates.ts` — foundational `Effect.tx`, `TxRef`, `TxQueue`, `TxDeferred`, `TxSemaphore`, `TxPubSub`, and `TxSubscriptionRef` operations.
- `effect-v4-transactional-coordination-templates.ts` — reusable application-level atomic coordination patterns.
- Public pack entry point: `@synthesize-regions/core-templates/effect-v4/stm`.

## V4 transaction model

`Effect.tx` provides the atomic boundary. Transactional reads and writes participate in one journal, and nested transactional operations join the active transaction. A failed transaction does not commit its writes. `Effect.txRetry` suspends the transaction and reruns it when transactionally observed state changes.

Most individual `Tx*` operations are already safe to call standalone because they establish their own transaction. Their more important property for this catalog is that when they are called inside an outer `Effect.tx`, they compose into the same atomic unit.

## Foundational coverage

### Transaction boundary

- `EffectTx`
- `EffectTxRetry`

### TxRef

- make / get / set
- update / modify
- get-and-set

### TxQueue

- bounded / dropping / sliding / unbounded construction
- offer / offer-all
- take / take-all
- size
- shutdown / shutdown-state inspection

A bounded queue transactionally retries an offer while full. An open empty queue transactionally retries a take until state changes. The V4 queue lifecycle is richer than ordinary Queue: it distinguishes open, closing, and done states and supports completion/failure semantics. The pack keeps the legacy `shutdown` aliases because they are still part of the current V4 API.

### TxDeferred

- make / await
- succeed / fail

### TxSemaphore

- make
- available / capacity
- acquire / try-acquire / release
- with-permit / with-permits

### TxPubSub

- bounded / dropping / sliding / unbounded
- publish / publish-all
- scoped subscribe
- size
- shutdown / shutdown-state inspection

### TxSubscriptionRef

- make / get / set / update / get-and-set
- scoped changes queue
- changes stream

`TxSubscriptionRef` is useful for state that must be read and updated transactionally while also exposing committed changes to observers.

## Real-world compositions

- `AtomicBalanceTransfer` — two-reference transfer with rollback on insufficient balance.
- `WaitForTransactionalCondition` — condition waiting through `Effect.txRetry`, without polling.
- `TransactionalCompareAndSet` — compare-and-set over a `TxRef`.
- `TransactionalBoundedCounterUpdate` — enforce numeric invariants atomically.
- `TransactionalTakeAndCount` — queue take and accounting update in one transaction.
- `TransactionalStateTransitionWithEvent` — validate state transition and enqueue its event atomically.
- `TransactionalOutboxEnqueue` — in-memory transactional state + outbox event.
- `TransactionalReservation` — decrement stock and enqueue a reservation atomically.
- `TransactionalPermitAndQueueReservation` — reserve capacity and enqueue work in one transaction.
- `TransactionalDeferredCompleteOnce` — convert the boolean completion race into a typed failure.
- `TransactionalObservableUpdateWithAudit` — update observable state and append its audit event atomically.
- `TransactionalStateServiceLayer` — long-lived shared `TxRef` Layer.
- `TransactionalQueueServiceLayer` — shared bounded `TxQueue` Layer.
- `TransactionalPubSubServiceLayer` — shared `TxPubSub` Layer.
- `TransactionalDeferredServiceLayer` — shared one-shot transactional coordination gate.
- `TransactionalSemaphoreServiceLayer` — shared transactional permit pool.

## Design notes

These templates intentionally model in-process atomic coordination. They should not be described as database transactions or durable distributed transactions. For persistence boundaries, compose them with the separate SQL / repository / transaction catalog and use the database's transaction semantics for durable state.

The outbox-style compositions in this pack are atomic only with respect to `Tx*` state held in the same Effect process. A durable transactional outbox must write business state and the outbox record in the same database transaction instead.

All source markers remain single-owner regions: each declared template input appears exactly once in the marked source. Values needed multiple times are first bound to a local variable and reused from there.
