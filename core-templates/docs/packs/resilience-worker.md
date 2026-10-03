# Effect V4 resilience / worker template expansion

This pack adds stable-core compositions for three production concerns:

- circuit breaking using `Ref`, `Clock`, `Duration`, `Effect`, and `Layer`;
- in-process fixed-window and token-bucket rate limiting using `Ref` and `Clock`;
- scoped worker supervision using `Effect.retry`, `Schedule`, `Effect.forkScoped`, and `Layer.scopedDiscard`.

It intentionally does not depend on `effect/unstable/persistence/RateLimiter`. That V4 module is useful when rate-limit state must be shared through persistent storage, but the templates here model the common process-local case and remain within stable core imports.

## Foundational additions

- `ClockCurrentTimeMillis`
- `ClockMonotonicTimeNanos`
- `EffectNever`

## Circuit breaker

- `CircuitBreakerLayer`
- `CircuitBreakerProtect`
- `CircuitBreakerObservedOperation`

The breaker counts typed failures, opens after a configurable consecutive-failure threshold, rejects while open, and atomically admits a single half-open probe after the reset interval. A successful half-open probe closes the breaker; a failed probe reopens it.

## Rate limiting

- `FixedWindowRateLimiterLayer`
- `TokenBucketRateLimiterLayer`
- `RateLimitedOperation`
- `RateLimitedObservedOperation`

Both limiter services delay callers until capacity is available rather than introducing an additional typed error channel.

## Supervised workers

- `SupervisedWorkerLayer`
- `SupervisedWorkerPoolLayer`
- `SupervisedPollingWorkerLayer`

Worker failures are observed, retried according to a Schedule, and restarted in the owning Layer scope. Closing the Layer interrupts the scoped worker fibers.

## Combined boundary

- `ProtectedExternalCall`

This composes rate limiting, a Semaphore bulkhead, per-attempt timeout, retries, circuit breaking, tracing, log annotations, and duration tracking. The circuit breaker observes the final logical result after retries rather than counting every transient retry failure.
