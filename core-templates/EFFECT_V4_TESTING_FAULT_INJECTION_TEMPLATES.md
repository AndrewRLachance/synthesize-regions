# Effect V4 Testing + Fault Injection Templates

This pack adds deterministic testing vocabulary for the existing Effect V4 synthesis catalog.
It is designed around the current Effect V4 testing model:

- `@effect/vitest` `it.effect` supplies the Effect test environment and a per-test `Scope`.
- The test environment contains `TestClock` and `TestConsole`.
- `it.live` keeps the scoped test runner but uses live default services.
- `layer(...)` shares a Layer across tests and composes it with the Effect test environment by default.
- `TestClock.adjust` and `TestClock.setTime` drive sleeps, timeouts, retries, schedules, and other clock-based effects deterministically.
- `Random.withSeed` provides deterministic pseudo-random sequences when randomized behavior itself is under test.

## Files

- `effect-v4-testing-foundational-templates.ts`
- `effect-v4-fault-injection-templates.ts`
- `effect-v4-behavioral-testing-templates.ts`
- `effect-v4-testing-fault-injection-template-catalog.ts`
- `effect-v4-expanded-with-testing-fault-injection-template-catalog.ts`

## Template inventory

### Testing foundations (16)

- `EffectVitestEffectTest`
- `EffectVitestLiveTest`
- `EffectVitestLayerSuite`
- `EffectVitestEffectProperty`
- `TestClockAdjust` (V2 replacement for the earlier V1 template)
- `TestClockSetTime`
- `TestClockWithLive`
- `TestClockLayer`
- `TestConsoleLayer`
- `TestConsoleLogLines`
- `TestConsoleErrorLines`
- `RandomWithSeed`
- `AssertOk`
- `AssertStrictEqual`
- `AssertDeepStrictEqual`
- `EffectVitestSourceFile`

### Fault injection (7)

- `AlwaysFailFaultInjectorLayer`
- `FailFirstNFaultInjectorLayer`
- `DelayFaultInjectorLayer`
- `SequenceFaultInjectorLayer`
- `DefectFaultInjectorLayer`
- `FaultInjectedOperation`
- `ChainedFaultInjectedOperation`

The fault injectors are shared Layer services. This is intentional: state such as a
fail-first counter must survive across multiple calls. Constructing a new `Ref` inside every
operation would reset the fault plan and would not model a real flaky dependency.

### Behavioral tests (13)

- `RetryEventuallySucceedsTest`
- `TimeoutWithTestClockTest`
- `CircuitBreakerOpensTest`
- `CircuitBreakerRecoversAfterResetTest`
- `RateLimiterBlocksUntilWindowTest`
- `SupervisedWorkerRestartsTest`
- `ScopedFiberInterruptedTest`
- `QueueBackpressureTest`
- `PubSubFanoutTest`
- `StreamPipelineFailureTest`
- `TestConsoleCaptureTest`
- `FailFirstNFaultInjectorTest`
- `DelayFaultInjectorTest`

## Integration notes

`TestClockAdjust` uses the same `modelId` as the earlier testing catalog but is version `2.0.0`.
Treat it as a replacement; do not register both versions in a registry that requires unique
`modelId` values.

The other 35 model IDs are new relative to the previously generated real-world,
operations, Stream/Sink, and resilience/worker packs.

The pack intentionally follows the existing catalog's three-parameter `scheduleType`
contract rather than changing the shared helper in this expansion. Current upstream Effect V4
Schedule types contain additional error information; updating the catalog-wide Schedule type
contract should be handled as a separate migration because it affects many existing templates.

## Testing patterns encoded

### Time-based code

Fork the operation first, then move `TestClock`, then await the fiber. This prevents the test
fiber from blocking on a sleep or timeout before it has a chance to advance simulated time.

### Circuit breakers

The open-state test drives enough failures to cross the configured threshold, then checks that
an otherwise-successful call is rejected. The recovery test advances the test clock through the
reset interval, verifies a successful half-open probe, then confirms a subsequent call runs
normally.

### Rate limiting

The rate-limit behavioral template assumes the supplied limiter Layer is configured with one
immediately available permit for the tested window/refill interval. It consumes that permit,
starts the next call in a child fiber, verifies it remains pending, advances `TestClock`, and then
asserts completion.

### Supervised workers

The worker test uses an always-failing worker body plus a retry Schedule and cooldown. Simulated
time is advanced to exercise multiple supervision cycles, and the number of worker starts is
asserted before the child fiber is interrupted.

### Resource / structured-concurrency behavior

`ScopedFiberInterruptedTest` observes an `ensuring` finalizer to prove that a `forkScoped` child
is interrupted when the nested Scope closes.

## Current upstream references used when authoring

- Effect V4 TestClock documentation: `https://effect.website/docs/v4/testing/testclock`
- Effect V4 TestClock source: `packages/effect/src/testing/TestClock.ts`
- Effect V4 TestConsole source: `packages/effect/src/testing/TestConsole.ts`
- `@effect/vitest` V4 source: `packages/vitest/src/index.ts`
- `@effect/vitest` test-environment implementation: `packages/vitest/src/internal/internal.ts`
- Effect V4 Random source: `packages/effect/src/Random.ts`
