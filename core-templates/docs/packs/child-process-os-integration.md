# Effect V4 Child Processes / OS Integration Templates

This pack adds child-process and operating-system integration templates for the current Effect V4 RC process APIs.

It sits above the CLI / Command Applications catalog and uses the public `effect/process` barrel. It intentionally does **not** use the older V3 `@effect/platform/Command` / `CommandExecutor` model.

## Pack contents

- `effect-child-process-template-helpers.ts`
- `effect-v4-child-process-foundational-templates.ts`
- `effect-v4-child-process-os-integration-templates.ts`
- Public pack entry point: `@synthesize-regions/core-templates/effect-v4/child-process`
- Structural verification: the package-wide generated validator

The pack contains **73 concrete templates**:

- **53 foundational process templates**
- **20 production / OS-integration compositions**

## Current V4 execution model

The current process API separates immutable command descriptions from platform execution:

```text
ChildProcess.Command
       ↓
ChildProcessSpawner
       ↓
ChildProcessHandle
  ├─ stdin Sink
  ├─ stdout Stream
  ├─ stderr Stream
  ├─ combined output Stream
  ├─ exit code
  ├─ kill
  ├─ unref / re-reference
  └─ custom file descriptors
```

`ChildProcess.Command` itself is also an Effect that can be yielded in a Scope. Starting a command requires `ChildProcessSpawner` plus `Scope`, while convenience operations such as `string`, `lines`, `streamLines`, and `exitCode` are exposed by the spawner service without leaking Scope to their callers.

## Foundational coverage

### Command construction

- `ChildProcessMake`
- `ChildProcessMakeWithOptions`
- `ChildProcessMakeInheritedStdio`
- `ChildProcessMakeIgnoredStdio`
- `ChildProcessMakeShell`
- `ChildProcessMakeDetached`
- `ChildProcessMakeWithInputStream`
- `ChildProcessMakeWithStdoutSink`
- `ChildProcessMakeWithStderrSink`
- `ChildProcessMakeWithAdditionalInputFd`
- `ChildProcessMakeWithAdditionalOutputFd`
- `ChildProcessMakeWithTerminationPolicy`
- `ChildProcessMakeCleanEnvironment`
- `ChildProcessMakeWindowsHidden`

### Command composition

- `ChildProcessPipeTo`
- `ChildProcessPipeStderrTo`
- `ChildProcessPipeAllTo`
- `ChildProcessPipeFdTo`
- `ChildProcessPrefix`
- `ChildProcessSetCwd`
- `ChildProcessSetEnv`

### File-descriptor and refinement helpers

- `ChildProcessFdName`
- `ChildProcessParseFdName`
- `ChildProcessIsCommand`
- `ChildProcessIsStandardCommand`
- `ChildProcessIsPipedCommand`

### Spawner operations

- `ChildProcessSpawnerService`
- `ChildProcessSpawnerExitCode`
- `ChildProcessSpawnerString`
- `ChildProcessSpawnerStringWithStderr`
- `ChildProcessSpawnerLines`
- `ChildProcessSpawnerLinesWithStderr`
- `ChildProcessSpawnerStreamString`
- `ChildProcessSpawnerStreamStringWithStderr`
- `ChildProcessSpawnerStreamLines`
- `ChildProcessSpawnerStreamLinesWithStderr`
- `ChildProcessSpawnerSpawn`
- `ChildProcessSpawnerMake`
- `ChildProcessSpawnerLayer`

### Running-process handles

- `ChildProcessHandlePid`
- `ChildProcessHandleStdout`
- `ChildProcessHandleStderr`
- `ChildProcessHandleAll`
- `ChildProcessHandleStdin`
- `ChildProcessHandleExitCode`
- `ChildProcessHandleIsRunning`
- `ChildProcessHandleKill`
- `ChildProcessHandleKillWithOptions`
- `ChildProcessHandleUnref`
- `ChildProcessHandleGetInputFd`
- `ChildProcessHandleGetOutputFd`

### Concrete platform Layers

- `NodeChildProcessEnvironmentLayer`
- `BunChildProcessEnvironmentLayer`

The platform templates intentionally use `NodeServices.layer` and `BunServices.layer`, matching the current V4 platform assembly model instead of inventing a process-only platform adapter.

## Production / application compositions

1. `ChildProcessCheckedExit`
2. `ChildProcessCaptureOutput`
3. `ChildProcessCaptureLines`
4. `ChildProcessPipelineString`
5. `ChildProcessObservedCommand`
6. `ChildProcessObservedLineStream`
7. `ChildProcessJsonOutput`
8. `ChildProcessGracefulTerminate`
9. `ChildProcessScopedWait`
10. `ChildProcessBackgroundLayer`
11. `ChildProcessCommandServiceLayer`
12. `ChildProcessParallelExitCodes`
13. `ChildProcessCliHandler`
14. `ChildProcessIsolatedEnvironmentCommand`
15. `ChildProcessInteractiveCommand`
16. `NodeChildProcessMain`
17. `BunChildProcessMain`
18. `NodeChildProcessSourceFile`
19. `BunChildProcessSourceFile`
20. `NodeCliChildProcessSourceFile`

## Design rules

### Prefer executable + argv over shell execution

`ChildProcess.make(command, args)` is the default modeling path. `ChildProcessMakeShell` is explicit because enabling a shell changes quoting and injection semantics. User-controlled values should normally remain separate argv elements rather than being interpolated into shell source.

### Scope owns live child processes

The low-level spawn operation requires `Scope`. Long-running compositions keep the handle inside a scoped Layer and install finalization behavior rather than leaking an unmanaged operating-system process.

`ChildProcessScopedWait` keeps the Scope alive until the child exits. `ChildProcessBackgroundLayer` keeps a long-running child alive for the Layer lifetime and requests graceful termination during finalization.

### Graceful shutdown before force

Current V4 kill options support both `killSignal` and `forceKillAfter`. The production templates therefore model a graceful signal followed by escalation instead of immediately issuing `SIGKILL`.

### `unref` is reversible

`ChildProcessHandle.unref` returns an Effect that can re-reference the child later. The pack represents this returned value rather than treating unref as a one-way boolean state change.

### Standard I/O is streaming

A live handle exposes:

- stdin as a `Sink`
- stdout as a byte `Stream`
- stderr as a byte `Stream`
- `all` as interleaved stdout/stderr bytes

Command options can instead wire input Streams and output Sinks before the process starts. This is preferred for large or continuous output where collecting the entire result into memory is inappropriate.

### Custom file descriptors

V4 supports named `fdN` additional descriptors. The pack includes command construction, fd-name conversion, custom fd pipelines, and live handle input/output access.

### Environment isolation

`ChildProcessSetEnv` merges variables into the command environment. `ChildProcessMakeCleanEnvironment` sets `extendEnv: false` and is the stronger option for reproducible/sandbox-like tool invocation where inherited environment variables should not leak into the child.

## CLI integration

The immediately preceding CLI pack already models `ChildProcessSpawner` as part of `Command.Environment`. This pack adds `ChildProcessCliHandler` and `NodeCliChildProcessSourceFile` so typed CLI commands can invoke external tools without shelling out through untyped string assembly.

## Platform assembly

Normal Node execution is:

```text
Effect requiring ChildProcessSpawner
    ↓
Effect.provide(NodeServices.layer)
    ↓
NodeRuntime.runMain
```

Bun uses the equivalent `BunServices.layer` + `BunRuntime.runMain` path.

The current Effect platform documentation also shows `@effect/platform-node` as the concrete platform package used from Deno. This pack does not add a separate Deno process adapter because the current V4 platform guidance does not require one for this abstraction.

## API audit

The pack was audited against current V4 documentation on 2026-09-30. Relevant public APIs include:

- `effect/process/ChildProcess`
- `effect/process/ChildProcessSpawner`
- `@effect/platform-node` `NodeServices` / `NodeRuntime`
- `@effect/platform-bun` `BunServices` / `BunRuntime`

Current V4 documentation reports `4.0.0-rc.118`. The GitHub `main` package metadata observed during nearby catalog work has sometimes lagged the docs by one RC, so this pack should still be included in the later semantic compile/canonicalization pass.

## Validation

The included validator checks:

- TypeScript module syntax
- generated fallback-source syntax for explicit templates
- exactly one marker for every declared input
- no undeclared/repeated markers
- no `{{...}}` generic placeholder leakage into emitted source
- factory-produced model IDs
- duplicate IDs within this pack
- collisions against prior generated catalog files

Validation result: **73 concrete model IDs, zero structural failures**.

This is structural/source validation, not a full module-resolved `tsc --strict` build against a locally installed matching Effect RC dependency set.
