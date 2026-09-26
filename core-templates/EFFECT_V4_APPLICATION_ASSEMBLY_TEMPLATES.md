# Effect V4 Application Assembly Templates

This pack adds top-level application-assembly graph templates for the current Effect V4 release-candidate API surface.

It is intended to sit above the existing foundational, production, Stream/Sink, resilience, testing, SQL, RPC, transactional-coordination, Socket, and durable-workflow catalogs. It does not replace those catalogs or duplicate their domain-specific primitives.

## Pack contents

- `effect-application-assembly-template-helpers.ts`
- `effect-v4-application-assembly-foundational-templates.ts`
- `effect-v4-application-assembly-templates.ts`
- `effect-v4-application-assembly-template-catalog.ts`
- `effect-v4-expanded-with-application-assembly-template-catalog.ts`
- `validate-application-assembly-pack.js`

The pack contains **29 concrete templates**:

- **9 lifecycle / assembly foundations**
- **20 application-assembly compositions**

## Assembly model

The intended dependency flow is:

```text
infrastructure
    ↓
application services
    ↓
startup / migrations / preflight
    ↓
readiness opens
    ↓
boundaries + background workers
    ↓
health + shutdown lifecycle services
    ↓
closed root Layer
    ↓
Layer.launch
    ↓
platform runMain
```

The templates deliberately use Layer composition instead of manually acquiring resources. This preserves Effect's Layer memoization, scoped finalization, dependency wiring, and typed construction errors.

### Startup ordering

`ApplicationLayerTapStartup` uses `Layer.tap` so startup work runs only after a Layer has been built successfully and before that Layer is exposed downstream.

`ApplicationMigrationReadinessLayer` and `ApplicationReadinessRootLayer` keep readiness closed until startup/migration work succeeds. Runtime boundaries and workers are downstream of that gate, so they are not built before startup completes.

### Health probes

`ApplicationHealthLayer` is appropriate when liveness/readiness probes are already closed Effects.

`ApplicationHealthFromRootLayer` is the preferred form when probes need application services. It binds the root Layer once, derives the health service from that Layer's built Context, and merges the same root Layer instance with the health Layer. Effect Layer memoization shares repeated construction of the same Layer instance, so scoped resources are not intentionally reacquired merely to close the probes.

### Shutdown semantics

`ApplicationShutdownLayer` provides a one-shot programmatic shutdown signal backed by `Deferred`.

`ApplicationLaunchUntilShutdown` builds the root Layer in a Scope and waits for that internal signal; completing the signal exits the scope and runs Layer finalizers.

This is distinct from operating-system shutdown. Node/Bun platform `runMain` should remain the process boundary so SIGINT/SIGTERM, root interruption, error reporting, and exit handling stay platform-owned.

### Long-lived process entry

For normal services, use:

```text
closed root Layer
    ↓
Layer.launch
    ↓
NodeRuntime.runMain / BunRuntime.runMain / BrowserRuntime.runMain
```

`Layer.launch` builds the Layer in a Scope and keeps it alive until interruption.

### ManagedRuntime boundary

`ApplicationManagedRuntimeDeclaration` is intended for integration surfaces that need to call Effect repeatedly from imperative Promise/synchronous code, such as serverless handlers or framework callbacks.

A `ManagedRuntime` owns the resources acquired by its closed Layer and must be disposed. `ApplicationManagedRuntimeDisposeDeclaration` makes that lifecycle explicit.

## Foundation templates

1. `ApplicationShutdownLayer`
2. `ApplicationShutdownAwait`
3. `ApplicationShutdownRequest`
4. `ApplicationHealthLayer`
5. `ApplicationHealthLiveness`
6. `ApplicationHealthReadiness`
7. `ApplicationHealthSnapshot`
8. `ApplicationStartupChecks`
9. `ApplicationLayerTapStartup`

## Composition templates

1. `ApplicationServicesLayer`
2. `ApplicationRootLayer`
3. `ApplicationStartupGatedRootLayer`
4. `ApplicationMigrationReadinessLayer`
5. `ApplicationReadinessRootLayer`
6. `ApplicationHealthFromRootLayer`
7. `ApplicationHealthRootLayer`
8. `ApplicationShutdownRootLayer`
9. `ApplicationLifecycleRootLayer`
10. `ApplicationObservedRootLayer`
11. `ApplicationLaunchUntilShutdown`
12. `ApplicationManagedRuntimeDeclaration`
13. `ApplicationManagedRuntimeDisposeDeclaration`
14. `NodeApplicationAssemblyMain`
15. `BunApplicationAssemblyMain`
16. `BrowserApplicationAssemblyMain`
17. `NodeApplicationAssemblySourceFile`
18. `BunApplicationAssemblySourceFile`
19. `BrowserApplicationAssemblySourceFile`
20. `ManagedRuntimeApplicationSourceFile`

## Important composition choices

### `ApplicationServicesLayer`

Uses `Layer.provideMerge(services, infrastructure)` so infrastructure is supplied to application-service construction while both infrastructure and service outputs remain available downstream.

### `ApplicationRootLayer`

Builds a phased root:

1. infrastructure,
2. services using infrastructure,
3. boundaries and workers using the resulting base context.

This avoids independently merging Layers that still have unresolved internal dependencies.

### `ApplicationStartupGatedRootLayer`

Runs startup/preflight after the base context exists and before boundaries/workers are constructed.

### `ApplicationMigrationReadinessLayer`

Merges the base services with a readiness Latch, runs startup/migrations with the resulting Context, and opens readiness only if startup succeeds.

### `ApplicationReadinessRootLayer`

Extends the migration/readiness pattern by placing boundaries and workers downstream of the startup gate.

### `ApplicationLifecycleRootLayer`

Adds health and programmatic shutdown services to an assembled root without changing the domain-specific resource Layers.

### `ApplicationObservedRootLayer`

Attaches successful-start and typed startup-failure logging at Layer construction time.

## Source-file templates

The Node/Bun/browser source-file templates intentionally import only common core/platform lifecycle symbols. SQL, RPC, Socket, workflow, HTTP, OpenTelemetry, and other unstable integrations should remain explicit imports in the composed body or domain-specific modules. This avoids granting broad import authority to every generated application entrypoint.

## API audit

This pack was audited against Effect V4 `main` on 2026-09-21. The repository currently identifies V4 as a release candidate; the package metadata observed during the audit reports `4.0.0-rc.116`.

The important current APIs used by this pack are:

- `Layer.merge`, `Layer.mergeAll`, `Layer.provideMerge`
- `Layer.flatMap`, `Layer.tap`, `Layer.tapError`
- `Layer.build`, `Layer.launch`
- `Deferred.make`, `Deferred.await`, `Deferred.succeed`
- `ManagedRuntime.make`, `dispose`, `disposeEffect`
- platform `NodeRuntime.runMain`, `BunRuntime.runMain`, `BrowserRuntime.runMain`

## Validation

The included validator checks:

- TypeScript module syntax
- fallback-generated source syntax
- exact declared-input ↔ marker ownership
- missing, repeated, or undeclared markers
- generic `{{...}}` placeholder leakage into emitted source

A separate collision scan confirmed that all **29 model IDs** are new relative to the previously generated catalog packs through Durable / Background Workflows.

This validation is structural and source-level. It is **not** a full semantic TypeScript typecheck against a locally installed matching Effect RC dependency graph. The Effect APIs were instead audited against the current upstream V4 source.
