# Effect V4 CLI / Command Application Templates

This pack adds typed CLI construction and production command-application templates for the current Effect V4 release-candidate surface.

It builds on the existing catalog through EventLog + Persistence / Offline-First and is intended to come immediately before the Child Processes / OS Integration pack.

## Pack contents

- `effect-cli-template-helpers.ts`
- `effect-v4-cli-foundational-templates.ts`
- `effect-v4-cli-command-application-templates.ts`
- Public pack entry point: `@synthesize-regions/core-templates/effect-v4/cli`
- Structural verification: the package-wide generated validator

The pack contains **89 concrete templates**:

- **73 CLI foundations**
- **16 command-application compositions**

## Current V4 model

The current public CLI barrel is:

```ts
import {
  Argument,
  CliError,
  CliOutput,
  Command,
  Flag,
  GlobalFlag,
  Prompt
} from "effect/cli"
```

`Command` is the main application abstraction. It combines typed flags and positional arguments, optional subcommands, help metadata, global/shared flags, and an Effectful handler.

A CLI runner requires the current `Command.Environment` services:

```text
FileSystem
| Path
| Terminal
| ChildProcessSpawner
| Stdio
```

Prompt execution uses the smaller environment:

```text
FileSystem | Path | Terminal
```

## Main areas

### Positional arguments

Included constructors and combinators cover:

- String
- Int
- Finite
- Date
- File
- Directory
- Path
- Redacted
- literal choices
- typed choice/value mappings
- optional arguments
- variadic arguments
- defaults
- descriptions / metavars
- Config fallback
- interactive Prompt fallback
- Schema validation

### Flags

Included templates cover:

- Boolean
- String
- Int
- Finite
- File / Directory / Path
- Redacted
- literal choices
- typed choice/value mappings
- optional flags
- aliases
- defaults
- help descriptions
- hidden/internal flags
- metavars
- bounded repeated flags
- Config fallback
- Prompt fallback
- Schema validation

### Interactive prompts

Included templates cover:

- String
- Password
- Hidden
- Confirm
- Toggle
- Int
- Number
- File
- List
- Select
- MultiSelect
- structured `Prompt.all`
- `Prompt.run`

`Password` and `Hidden` return `Redacted<string>`.

## Secret-input boundary

`Flag.Redacted`, `Argument.Redacted`, `Prompt.Password`, and `Prompt.Hidden` prevent accidental disclosure through ordinary stringification/logging inside the application.

They do **not** make command-line arguments secret from the operating system, process listings, or shell history. For credentials that must not appear in argv, interactive prompts, environment/config providers, or other secret channels are preferable.

## Command composition

The foundational command templates include:

- `Command.make`
- make-with-handler
- `withHandler`
- aliases
- descriptions / short descriptions
- examples
- unlisted subcommands
- shared flags
- global flags
- subcommands
- Layer provision
- pre-handler Effects
- `run`
- `runWith`
- `wizard`

`withSharedFlags` is specifically useful for npm/git-style command trees because shared parent flags are accepted before or after the selected subcommand and can be read from descendant handlers by yielding the parent command.

## Production compositions

1. `CliTestEnvironmentLayer`
2. `CliConfiguredRootCommand`
3. `CliServiceBackedCommand`
4. `CliConfigFallbackCommand`
5. `CliInteractiveFallbackCommand`
6. `CliSchemaValidatedFileCommand`
7. `CliRedactedCredentialCommand`
8. `CliObservedCommand`
9. `CliPreflightCommand`
10. `CliTestRun`
11. `CliWizardRoundTrip`
12. `NodeCliMain`
13. `BunCliMain`
14. `NodeCliApplicationSourceFile`
15. `BunCliApplicationSourceFile`
16. `CliTestSourceFile`

## Test strategy

`Command.runWith` is the preferred execution boundary for tests because it accepts explicit argv rather than reading process arguments from `Stdio`.

`CliTestEnvironmentLayer` follows the current Effect examples:

- `FileSystem.layerNoop({})`
- `Path.layer`
- `Stdio.layerTest({})`
- deterministic `Terminal.make(...)`
- a non-running `ChildProcessSpawner` test implementation

This keeps parsing and handler tests independent from the host shell and operating system.

## Platform entrypoints

### Node

```ts
NodeRuntime.runMain(
  Command.run(command, { version }).pipe(
    Effect.provide(NodeServices.layer)
  )
)
```

### Bun

```ts
BunRuntime.runMain(
  Command.run(command, { version }).pipe(
    Effect.provide(BunServices.layer)
  )
)
```

Application-specific service Layers should normally be closed at the command level with `Command.provide` before reaching this platform boundary.

## Why Child Processes comes next

The CLI environment already contains the `ChildProcessSpawner` service because CLI applications commonly orchestrate external commands. This pack intentionally does not model `ChildProcess` itself beyond the required service boundary. The next Child Processes / OS Integration pack can therefore supply:

- command descriptions
- environment / cwd
- stdin / stdout / stderr policies
- pipelines
- exit-code handling
- collected output
- streaming output
- process handles
- signals / kill
- scoped process lifetime

Those primitives can then be consumed naturally by the CLI handlers defined here.

## API audit

This pack was audited against Effect V4 documentation reporting `4.0.0-rc.118` on 2026-09-30.

Important verified current behavior includes:

- public `effect/cli` modules
- `Command.make` typed configuration and handler overloads
- `Command.run` / `runWith`
- `Command.wizard`
- `Command.withSharedFlags`
- `Command.provide`
- `Command.provideEffectDiscard`
- typed `Argument` and `Flag` Schema validation
- interactive Prompt fallback
- Redacted CLI values
- current CLI environment requirements

## Validation

The included validator checks:

- TypeScript module syntax for the template modules
- fallback-generated source syntax for explicit templates
- one marker for every declared input
- no undeclared or repeated markers
- no leaked `{{...}}` placeholders in emitted source
- factory-generated model ID accounting
- duplicate IDs in this pack
- model-ID collisions against all packs in the explicit canonical registry

All **89** concrete model IDs pass these checks.

As with the previous packs, this is **structural/source validation**, not a full module-resolved `tsc --strict` semantic compile against installed Effect RC packages. A future canonical compile harness should perform that stronger verification across the entire catalog.
