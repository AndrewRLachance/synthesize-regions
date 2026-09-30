# Technical Design: `synthesize-regions`

> **Package-owned design:** This is the authoritative package-level technical
> design for `synthesize-regions`. The agent-runtime and Workspace Constraints
> documents in this directory are cross-project integration snapshots; they do
> not define this package's architecture.

- **Status:** Implemented
- **Design baseline:** `synthesize-regions` 0.6.2
- **Primary language:** TypeScript 5.9
- **Distribution:** ESM library with TypeScript declarations and JSON Schemas
- **Last reviewed:** 2026-09-01

## 1. Purpose

`synthesize-regions` is a controlled TypeScript source-synthesis library. It
turns structured replacement values and serializable synthesis graphs into
TypeScript fragments, files, or in-memory workspace change sets while retaining
enough contract, provenance, and identity evidence to validate the result.

The package has four progressively higher-level responsibilities:

1. Discover marked source regions and replace them with syntax-compatible
   structured or raw TypeScript values.
2. Define and capture typed graph-template catalogs whose operations are backed
   by marked source.
3. Compile strict or partial synthesis graphs into provenance-carrying template
   artifacts and support bounded repair and filling.
4. Assemble graph artifacts into an immutable captured workspace and perform
   syntax, semantic, integrity, and static-acceptance checks without writing to
   that workspace.

This document consolidates the design shared across those responsibilities.
The [README](../README.md), [template authoring guide](./TEMPLATES.md), and
[synthesis graph guide](./SYNTHESIS_GRAPHS.md) remain task-oriented API and
authoring references.

## 2. Goals

The package shall:

1. Make every source insertion explicit through a marked, validated AST region.
2. Keep structured data separate from raw TypeScript source until serialization.
3. Reject marker, replacement, template, graph, artifact, target, and workspace
   mismatches at the boundary where they are introduced.
4. Give planners a finite, source-free vocabulary derived from the same
   catalog used for compilation.
5. Preserve exact syntax-kind, TypeScript-type, JSON-Schema, nominal-family,
   and producer-allowlist contracts across graph composition.
6. Support incomplete graphs without weakening the contracts of inputs that
   will be supplied later.
7. Make catalog, artifact, graph, workspace, and change-set identity stable and
   reproducible across JSON serialization.
8. Attribute generated diagnostics to the contributing graph node and input.
9. Validate candidate projects from captured bytes rather than the worker's
   live workspace.
10. Produce changes and evidence in memory; callers retain approval,
    persistence, and filesystem authority.

## 3. Non-goals

The package does not:

- call language models or decide how prompts, roles, retries, or budgets work;
- persist sessions, graphs, artifacts, ledgers, or approval records;
- approve or apply generated changes to a live filesystem;
- execute generated code, project scripts, tests, builds, linters, or package
  managers;
- provide a macro language or a general-purpose AST transformation framework;
- infer arbitrary dependencies or grant import authority;
- guarantee that generated code is safe to execute or semantically correct for
  a user's intent;
- own the Workspace Constraints language or its evaluator; or
- own the agent runtime's workflow, state machine, staging, or recovery model.

The raw-source policy is a conservative screening control, not a sandbox. A
consumer must still treat generated source as untrusted until its own review and
execution controls are satisfied.

## 4. System context and ownership

The package is a synchronous library positioned between authored synthesis
contracts and an external orchestrator:

```text
template author                         candidate producer
  manifests + marked source               graph + literals/raw code/fills
             \                              /
              v                            v
        +------------------------------------------+
        |             synthesize-regions           |
        | marker engine -> catalog -> graph compiler|
        |          -> artifact-set validation      |
        +------------------------------------------+
                            |
                            v
              artifacts, diagnostics, schemas,
              identity-bound in-memory changes
                            |
                            v
                  external runtime / reviewer
                  persistence, approval, apply
```

Authority is intentionally divided:

| Concern | Authority |
| --- | --- |
| Marker grammar, region kinds, replacements, templates, graphs, artifacts, diagnostics, and artifact-set contracts | `synthesize-regions` |
| Template membership and executable template source | The caller-selected, package-validated catalog snapshot |
| Candidate graph, literal values, raw code, and fills | The candidate producer, subject to package validation |
| Captured project bytes, target ranges, project references, required roots, and import permissions | The caller |
| Workspace Constraints evaluation | The `workspace-constraints` package |
| Model workflow, durable state, approval, staging, filesystem mutation, and recovery | The integrating runtime |
| Whether an analysis scope is reused, and for how long | The integrating runtime |

The package's exact wire contracts are the exported TypeScript declarations,
published JSON Schemas, `contract-manifest.json`, and the generated invariant
ledger. This document explains how those contracts fit together.

## 5. Design principles

### 5.1 Closed contracts before execution

Persisted or untrusted values enter through closed schemas and declarative
manifests. Executable template definitions, catalog views, and in-process
artifact fast paths are created and branded by the library. Structurally similar
caller objects do not acquire authority by shape alone.

### 5.2 Exact syntax contexts

A region kind is an AST placement contract, not a suggestion. `typeMember` is
not interchangeable with `classMember`; `parameter` is not a constructor
parameter; a declaration is not an arbitrary statement. Cross-context reuse
requires an explicit adapter template.

### 5.3 Data before code

Literal and structured replacements are preferred because the serializer owns
their emitted syntax. Raw-code ports exist for irreducibly source-shaped input,
but they are parsed, restricted by port policy, and screened before composition.

### 5.4 Immutable evidence, revalidated at boundaries

Hashes bind evidence but never replace validation. Resumed artifacts,
compilation results, and assembly results are rechecked against the active
catalog, graph, workspace, and content before a later phase accepts them.

### 5.5 Pure planning and assembly

Graph compilation and artifact-set assembly return data. They do not mutate the
authored graph, registry snapshot, workspace capture, or live filesystem.

### 5.6 Fail closed

Unknown diagnostic codes, incorrect diagnostic origins, forged catalog
facades, stale identities, unsupported schema relationships, and detached
evidence do not grant a repair or acceptance path.

## 6. High-level architecture

The implementation is organized into five layers.

| Layer | Responsibility | Principal modules |
| --- | --- | --- |
| Source replacement | Marker scanning, region discovery, AST placement, serialization, security checks, final validation | `src/markers`, `src/regions`, `src/replacements`, `src/generation`, `src/validation` |
| Template contracts | Port builders, declarative manifests, template invocation, catalog validation and capture | `src/templates/definition.ts`, `converter.ts`, `catalogValidation.ts`, `registry.ts` |
| Graph synthesis | Graph normalization, compatibility, compilation, partial artifacts, patching, runner, provenance | `src/templates/graph.ts`, `graphPatch.ts`, `runner.ts`, `sourceSpans.ts` |
| Project assembly | Artifact-set planning, fill-ledger replay, target assembly, import reconciliation, captured-project analysis, static acceptance | `src/templates/artifactSet.ts`, `capturedProject.ts`, `importRequirements.ts` |
| Contracts and identity | TypeBox contracts, generated schemas, canonicalization, digests, diagnostics, invariant ledger | `src/templates/graphContracts.ts`, `contractIdentity.ts`, `catalogDigest.ts`, `diagnosticCatalog.ts`, `schemas`, `invariants` |

Higher layers use lower layers rather than implementing separate source
generation rules. In particular, a graph template ultimately invokes the same
marker replacement and final syntax-validation pipeline as a direct caller.

## 7. Source replacement engine

### 7.1 Marker grammar

A replacement region is bounded by paired documentation comments:

```ts
/** @TYPE <regionKind> id=<replacementId> **/
placeholderSource
/** @END **/
```

The kind may be omitted and inferred from the placeholder AST. Appending `[]`
declares a variadic region. IDs use the identifier grammar
`[A-Za-z_][A-Za-z0-9_]*`. Regions cannot nest or overlap. Duplicate IDs are
allowed and receive the same replacement value at every occurrence.

The supported kinds cover expressions and structured literals, statements,
types, members, parameters, declarations, import/export specifiers, expression
suffixes, and complete source files. Scalar and variadic arity are distinct
contracts; `expressionSuffix[]` and `sourceFile[]` are invalid.

### 7.2 Discovery and placement validation

Discovery proceeds as follows:

1. Scan marker-shaped block comments and parse their fields.
2. Pair `@TYPE` and `@END` tokens and retain UTF-16 offsets, line/column, and
   placeholder text.
3. Wrap partial templates in a synthetic TypeScript context when the caller is
   not supplying a complete file.
4. Infer omitted kinds from the smallest applicable AST node.
5. Verify that every placeholder occupies exactly the declared AST context.
6. Return offsets relative to the caller's original source, not the synthetic
   wrapper.

Partial modes provide exact parser contexts for expressions, suffixes,
statement lists, object-property lists, type and member lists, parameters,
heritage clauses, declarations, and import/export specifiers.

The outer `@TEMPLATE` / `@END_TEMPLATE` grammar can discover named source
fragments embedded in a larger file. Such a discovered fragment records its
containing source and insertion coordinates, but it is not a graph template
until a caller supplies a declarative graph-template manifest.

### 7.3 Replacement model and serialization

Replacement values are discriminated objects. Structured values such as
strings, finite numbers, booleans, nulls, arrays, objects, identifiers, and
object properties are serialized by the package. Source-shaped variants carry
code for an exact kind such as `expression`, `statement`, `type`,
`classMember`, or `sourceFile`.

For every region, the generator:

1. requires a matching replacement key;
2. rejects unused keys unless explicitly allowed;
3. checks scalar versus variadic arity;
4. checks replacement-kind compatibility;
5. parses raw source in the exact region wrapper;
6. applies port and security policy where applicable;
7. serializes the replacement;
8. applies edits from the highest offset to the lowest so earlier offsets stay
   stable; and
9. parses the complete generated result, optionally including TypeScript
   semantic diagnostics.

The default output preserves surrounding formatting and indentation. Optional
`ts-morph` formatting happens before final validation.

### 7.4 Analysis ownership

One top-level generation or compilation operation owns an isolated `ts-morph`
project. Synchronous nested calls share that operation-local context, while
scratch source files are replaced and released within the same ownership
boundary. This prevents diagnostics or declarations from a previous operation
from leaking into a retry.

Every analysis path resolves that ownership, including the nested region,
expression-suffix, and semantic-target checks that previously built private
projects. They reuse the active project and hold their own short-lived file
beside the caller's scratch file, so a caller keeps the source file it is
inspecting.

Direct file APIs read the exact file path supplied by the caller. Artifact-set
project validation uses the separate captured-project design described in
Section 10 and does not fall back to live workspace source.

### 7.5 Reusable analysis scope

`createCompilationContextLease()` returns an opaque handle that keeps one
analysis project across several top-level operations. It exists because a
repair loop calls compilation once per iteration, and each of those calls would
otherwise rebuild a project from scratch.

A lease retains the project and nothing else. Every source file it creates is
released when the enclosing `run()` returns, so a declaration from one iteration
cannot reach the next. The lease is not a repair *session*: it holds no graph,
artifact, or durable state, and the decision to keep one open for a unit of
work, and how long it lives, belongs to the integrating runtime.

`run()` accepts nesting the same lease and rejects a different one, so a
caller-owned scope can never be silently interleaved. `close()` is
irrevocable, and using a closed lease throws.

The lease binds one `tsConfigFilePath`. A call that explicitly requests a
different one rebuilds the project rather than validating under the previous
compiler options; `projectRebuildCount` reports how many projects the lease has
built. A call that omits the option never downgrades a bound project, which is
what keeps catalog-level compilation paths from rebuilding on every call.

The lease never exposes a TypeScript project. Callers receive no compiler
objects and no path-based read authority.

## 8. Graph templates and catalogs

### 8.1 Declarative template manifest

A `GraphTemplateManifest` contains only serializable author-owned data:

- stable `modelId` and optional version and description;
- optional generic type parameters and callable-scope ownership;
- optional declarative import requirements;
- named input ports;
- one output port; and
- complete marked TypeScript source.

`defineTemplate()` parses the source in the output context and requires exact
ownership between declared ports and physical markers. It then creates a
library-owned executable definition whose strict and partial invocation paths
both delegate to the replacement engine.

Persisted JSON manifests are accepted through
`createTemplateRegistryFromManifests()`. They first pass the closed manifest
schema, then source parsing, marker-to-port checks, and whole-catalog validation.
Casting JSON to an executable template type is not a trust boundary.

### 8.2 Input ports

| Port | Accepted graph input | Enforcement |
| --- | --- | --- |
| Literal | JSON-like value | Supported JSON Schema, exact region kind, structured serialization |
| Fragment | Reference or inline node | Producer kind, source allowlist, type/schema/nominal compatibility |
| Fragment collection | Ordered references or inline nodes | Per-item fragment checks, min/max bounds, deterministic separator |
| Raw code | TypeScript source string | Length/newline/pattern policy, exact syntax, type metadata, source screening |
| Union | One of several concrete port shapes | Nonempty alternatives with one shared region context |

Ports are required unless declared optional. Omitting an optional port retains
the template's authored placeholder body. Omitting a required port is an error
in strict mode and an unresolved input in partial mode.

### 8.3 Output and compatibility contracts

Every template produces one exact region kind and may advertise a
`TypeDescriptor` containing:

- a self-contained TypeScript type expression;
- a JSON Schema from the package's closed Draft 2020-12 profile; and
- a nominal family used to distinguish structurally similar library values.

Compatibility is directional: the actual producer must fit the expected
consumer. Region kinds and required nominal families must match; producer
TypeScript types must be assignable to consumer types; producer schemas must be
provably contained by consumer schemas; and producer model IDs must satisfy any
allowlist. An indeterminate schema relationship is not treated as compatible.

TypeScript descriptor validation runs in an isolated standard-library context.
Descriptors must be self-contained and cannot contain `any`. They are contract
assertions, not project-local type lookups.

Generic templates use `{{Parameter}}` placeholders only inside TypeScript
descriptor strings. Every graph invocation supplies an exact, explicit binding
for each parameter; there is no inference or defaulting. Bindings are validated
against constraints before all input and output descriptors are instantiated.

### 8.4 Catalog validation and capture

Catalog validation is atomic and covers, among other things:

- unique model IDs and authentic package-created definitions;
- valid marker-to-port ownership;
- valid region kinds, union alternatives, collection bounds, and raw policies;
- supported JSON Schemas and self-contained TypeScript descriptors;
- generic declaration and placeholder consistency;
- valid source-model allowlists, callable scopes, and import requirements; and
- deterministic, JSON-serializable planner metadata.

A mutable registry is only a catalog-construction facade. Compilation captures
an immutable snapshot containing sorted membership, cloned source-free
summaries, and two catalog identities. Register and replace operations build and
validate a complete candidate state before committing it.

Planner schemas and capability closures are derived from captured source-free
summaries. They narrow model output but do not replace compiler checks for
global graph properties such as cycles, duplicate IDs, or actual reference
existence.

## 9. Graph compiler and repair protocol

### 9.1 Graph model

A `SynthesisGraph` contains nodes, a `finalNodeId`, and an optional final goal.
Each node selects a template, supplies explicit generic bindings, and maps
input names to literals, raw code, references, inline nodes, or fragment
collections.

Node-array order is serialization order, not execution order. Compilation
follows dependencies recursively and memoizes node artifacts. Collection item
order is semantically significant and preserved.

Inline nodes and `$ref` shorthand are authoring conveniences. Normalization
lifts inline nodes into one global namespace and expands shorthand references
without mutating the authored graph.

### 9.2 Compilation pipeline

Strict and partial graph compilation share this pipeline:

```text
capture catalog and verify expected identities
  -> normalize inline nodes and references
  -> validate graph shape, nodes, inputs, goals, and explicit generics
  -> detect duplicate IDs, missing references, and cycles
  -> recursively resolve producer artifacts
  -> enforce port compatibility and raw/literal policies
  -> invoke the selected marked-source template
  -> validate artifact structure, source ownership, syntax, and security
  -> validate the final goal
  -> optionally validate the complete artifact in semantic context
```

Compilation returns structured results and diagnostics; candidate errors do not
partially mutate the graph or catalog.

Semantic validation can use a synthetic prelude or virtually insert the
artifact into a caller-supplied target file and range. Existing target-file
diagnostics are separated from candidate diagnostics. Complete expression-like
artifacts can also be checked against their advertised TypeScript result type.

### 9.3 Complete and partial artifacts

All generated fragments retain code, region kind, producing template identity,
optional type metadata, provenance, and a JSON-safe generated source map.

A complete artifact has `complete: true`. A partial artifact has
`complete: false` and carries one or more `UnresolvedTemplateInput` records.
Each unresolved record preserves the concrete instantiated port contract and a
stable opaque marker ID.

Partial mode preserves only omitted required template inputs. A missing graph
reference, invalid generic binding, incompatible producer, or cycle remains a
graph error. Semantic checking is deferred until a final artifact is complete.

Fills are transactional. Every supplied key must resolve to one exact open
input, every value must satisfy that input's retained contract, and nested
artifacts are revalidated before their source is composed. A rejected fill
leaves the previous artifact usable for another attempt.

The short fill/finalize APIs accept only deeply frozen, package-produced
artifacts retained in the current process. Persisted or caller-constructed
artifacts must use catalog-aware APIs, which revalidate manifest provenance,
markers, unresolved contracts, child artifacts, and source policy.

### 9.4 Graph repair and runner

Graph repair and artifact filling are distinct authority channels:

- Graph patch actions repair nodes, inputs, explicit type arguments, the final
  node, or the final goal.
- Fill actions supply values to already-authorized unresolved ports without
  changing graph structure.

`applyGraphPatch()` is immutable and transactional. `createGraphRunner()`
coordinates partial compilation, graph patches, and fills into `needsGraphRepair`,
`needsArtifactInputs`, `complete`, or `failed` states. The runner is an
in-memory convenience; durable workflow state belongs to the caller.

### 9.5 Provenance and source maps

Generated-source map version 1 records nested node and input ownership in
UTF-16 offsets. Composition shifts and merges child spans as replacements are
inserted, and formatting remaps spans through text edits. Semantic diagnostics
select the deepest covering span so the result can identify the contributing
`nodeId`, `templateId`, and `inputName` instead of blaming only the root node.

## 10. Artifact sets and captured-project validation

### 10.1 Plans and targets

An `ArtifactSetPlan` is an ordered set of independently compiled graphs. Each
unit has a unique artifact ID and one target:

- `createFile` targets a new workspace-relative path and requires a complete
  `sourceFile` artifact; or
- `replaceRange` targets a UTF-16 range in an existing captured file and binds
  the expected base-file hash and exact region kind.

Target paths are normalized to portable workspace-relative form. Absolute
paths, traversal outside the workspace, invalid ranges, create/modify
collisions, stale base hashes, and overlapping edits are rejected.

### 10.2 Phase-separated pipeline

The package exposes both a convenience facade and independently verifiable
phases:

| Phase | Primary API | Result |
| --- | --- | --- |
| Graph compilation | `compileArtifactSetGraphs()` | Per-unit graph result, artifacts, graph/artifact hashes, replayed fills |
| Assembly | `assembleCompiledArtifactSet()` or `assembleArtifactSetTargets()` | Syntax-validated, in-memory file changes and edit coordinates |
| Semantic validation | `validateAssembledArtifactSetSemantics()` | Candidate project checked against the captured baseline |
| Final static acceptance | `finalizeArtifactSetStatic()` | Identity-bound `ValidatedArtifactChangeSet` |

`compileArtifactSet()` and `validateArtifactSetStatic()` provide compatible
end-to-end entry points. The final graph-bound gate recompiles authoritative
graphs rather than trusting detached caller-built artifacts.

Partial artifact-set compilation returns unit artifacts but no workspace
changes. Later fills can be replayed through an ordered `ArtifactFillLedgerEntry`
chain. Every entry binds the artifact ID, graph hash, base artifact hash,
inputs, and resulting artifact hash; stale or reordered entries fail.

Assembly is deterministic and pure. It revalidates catalog provenance and
artifact integrity, groups edits by path, checks target authority, applies
position-sorted non-overlapping edits, records coordinates in both base and
result files, validates final syntax, and returns no changes on failure.

### 10.3 Hermetic project analysis

Authoritative artifact-set semantic validation builds a TypeScript program from
captured bytes only:

- `workspaceFiles` contains the available UTF-8 text view;
- an optional workspace manifest authenticates every captured file and the
  partition of unavailable non-text files;
- the captured `tsConfigFilePath` supplies compiler configuration;
- project-reference configs must be both captured and explicitly authorized;
  and
- the only disk reads are the pinned TypeScript package's own `lib*.d.ts`
  files, whose identity participates in the contract manifest.

Candidate files are overlaid onto the captured baseline in memory. Validation
rejects configuration/global/syntax failures and candidate semantic regressions
according to the artifact-set policy. No compiler host lookup falls back to the
worker's live project source.

The workspace snapshot hash binds normalized paths, captured content,
configuration, and manifest identity. A caller-provided snapshot ID is a claim
to verify, not an alternate source of authority.

### 10.4 Project-authority helpers

The package also provides pure enforcement helpers used around artifact-set
compilation:

- implementation-target discovery identifies authorized incomplete
  declarations or configured repair ranges and creates signature-preserving
  completion-shell templates;
- required-root validation binds a planned and compiled artifact to an exact
  root template and manifest;
- import collection derives requirements from reachable authenticated
  templates, while reconciliation inserts only requirements covered by exact
  caller-provided artifact/path authority;
- import-aware semantic validation rederives reconciled bytes before accepting
  them; and
- unresolved-value validation rejects emitted value references to unfinished
  implementation targets outside the caller-authorized set.

These helpers do not discover authority implicitly. They validate authority
records supplied by a caller and never write their results to disk.

### 10.5 Workspace Constraints integration

`finalizeArtifactSetStatic()` may bind a successful
`ConstraintBoundStaticAcceptance` record into the change-set identity. The
record contains the exact constraint, evaluator, toolchain, analysis snapshot,
and four phase-evidence hashes.

`synthesize-regions` validates and binds that evidence shape; it does not parse
constraints or run the evaluator. Those behaviors remain owned by the sibling
`workspace-constraints` package.

## 11. Determinism, identities, and versioning

### 11.1 Canonicalization

Identity inputs use canonical JSON with code-unit-sorted object keys. Arrays
retain meaningful authored order, except graph node arrays are normalized by
node identity for graph hashing. Cycles, sparse arrays, accessors, non-finite
numbers, functions, symbols, bigint values, and non-plain objects are rejected
instead of being silently coerced.

Source normalization and domain/version tags are included before SHA-256
hashing. Identity prefixes therefore name a contract, not merely an algorithm.

### 11.2 Current identity matrix

| Identity | Current form | Binds |
| --- | --- | --- |
| Catalog contract | `c7_<sha256>` | Source-free planner summaries and compatibility-engine versions |
| Template manifest | `t4_<sha256>` | One normalized template contract and its exact marked source |
| Catalog manifest | `m4_<sha256>` | Sorted executable template-manifest membership |
| Artifact-set change set | `cs1_<sha256>` | Changes plus catalog, workspace, static-policy, and optional constraint evidence |
| File, graph, artifact, workspace, and unresolved-input identities | Versioned package formats | Exact phase-local content and ownership context |

At baseline 0.6.2, planner-schema version 4 and capability-closure version 3
also participate in `c7_`. A planner-contract digest can remain stable across a
source-only template edit, while the template and catalog manifest digests must
change. Persisted workflows therefore carry and verify both catalog identities.

There is no implicit migration from older identity generations. A contract
version change requires recapturing the catalog and reproducing dependent
graphs, partial artifacts, ledgers, or acceptance evidence as applicable.

### 11.3 Evidence rules

- A digest comparison always uses the active validated catalog or captured
  workspace, never a caller-supplied prefix alone.
- A persisted artifact's internal fields are revalidated before use.
- Compilation evidence is rebound to the normalized plan, graph hashes,
  targets, artifact hashes, and catalog identities before assembly.
- Assembly evidence is reconstructed at byte level before a later semantic
  phase accepts it.
- A static change-set hash includes the mandatory static-policy version so a
  policy change invalidates old acceptance.

## 12. Security and trust boundaries

### 12.1 Template trust

Template source is deployment-authorized executable source text, but its
definition object is still constructed through `defineTemplate()` and validated
as a closed declarative contract. Catalogs accept only package-created
definitions or JSON manifests compiled by the package. Catalog snapshots are
library branded, frozen at capture, and cannot be forged by copying methods and
digest strings.

### 12.2 Candidate source

Raw-code ports have an early planner-facing policy for maximum length,
newlines, forbidden substrings, and forbidden regular expressions. The normal
source pipeline then parses the exact syntax and applies the configured
security policy to runtime-capable source surfaces.

The default security policy rejects static imports, dynamic `import()`,
`eval`, `new Function`, `process`, `globalThis`, and `require`. Structured
literal serialization avoids this raw-source path. Erased-only syntax contexts
have narrower screening because they cannot directly introduce runtime
evaluation; runtime-capable graph fragments, including heritage expressions,
are screened.

Callers may override individual checks, so every acceptance record must be
understood in the context of the policy supplied to compilation. Screening
identifiers and syntax is defense in depth; it is not capability isolation.

### 12.3 Artifact trust

Artifacts retained inside one process are deeply frozen and fingerprinted.
Object identity alone is insufficient: the canonical fingerprint is recomputed
before the trusted fast path is used. Persisted artifacts lose that ownership
proof and require catalog-aware validation.

Artifact validation checks physical marker structure, unresolved input IDs and
ports, complete/partial consistency, template and manifest provenance, output
contracts, source maps, and source policy. Nested artifacts are recursively
validated before composition.

### 12.4 Workspace and filesystem trust

Artifact-set APIs operate on normalized captured paths and bytes. They return
in-memory `createFile` and `modifyFile` descriptions but have no apply API.
Approval, live-target preflight, symlink policy, journaling, atomic writes,
rollback, and recovery belong to the integrating runtime.

The direct convenience APIs that accept a file path are not the hermetic
artifact-set boundary; they read the caller-selected source/configuration for
local generation. Integrations requiring reproducible acceptance use captured
workspace APIs.

## 13. Diagnostics and failure semantics

The low-level replacement API throws subclasses of `SynthesizeRegionsError`
with source metadata such as replacement ID, kind, arity, file path, line,
column, and offsets. These errors represent invalid use of the immediate
generation contract.

Graph and artifact-set APIs return JSON-safe `SynthesisDiagnostic` records.
Each record includes:

- a stable code and severity;
- an authority origin: candidate, catalog, workspace, deployment, integrity,
  or internal;
- a pipeline stage;
- optional node, template, input, type-parameter, path, expected/actual, repair,
  compiler, and source-location data.

Failed operations classify their gating diagnostics into one repair channel:

| Classification | Meaning |
| --- | --- |
| `graphRepairable` | Candidate graph structure, composition, goal, or target can be revised |
| `artifactFillable` | An authorized unresolved input can be supplied or corrected |
| `templatePolicyFailure` | The selected catalog or template contract must be fixed and recaptured |
| `terminalFailure` | Configuration, workspace, integrity, stale-state, or unknown failure cannot be repaired through the candidate channel |

The classification catalog is closed. Every package-owned code has one required
origin, warnings never grant repair authority, and unknown or mismatched values
become terminal.

## 14. Performance and concurrency

Public compilation is synchronous and does not share mutable graph or workspace
state between calls. Operation-local analysis projects prevent cross-request
scratch-file contamination.

The package uses bounded caches where reuse is safe:

- self-contained TypeScript descriptor parsing and assignability comparisons;
- compiled JSON Schema validators; and
- successful immutable captured-workspace baseline analysis.

Baseline cache keys include captured file hashes, root/configuration,
authorized references, analysis mode, snapshot identity, and TypeScript
identity. Candidate source and compiler objects are not retained in that public
baseline cache. An internal, explicitly owned semantic-program lease may reuse
candidate compiler state within one runtime authority boundary and must be
discarded by its owner.

Compilation traverses graph dependencies once per node through memoization.
Artifact-set phases can reuse authenticated graph-compilation or assembly
evidence without repeating unchanged work, but every skipped computation is
replaced by identity and integrity verification.

`npm run benchmark:compilation` reports cold/warm graph, artifact-set,
baseline, candidate, cache, and memory measurements without writing benchmark
results into the repository. Timings are local evidence, not fixed test limits.
Warm and revision timings are medians over `--iterations=N` samples reported with
their observed minimum and maximum. Revision figures compare a first revision
against a second revision inside one program-ownership arm, so the retained and
unretained percentages answer the same question; the two arms are interleaved
with alternating order and a fresh owner per repetition so neither ordering nor
a previous repetition's program can bias the comparison.

The analysis-scope arm applies the same interleaving to a multi-step repair
loop, comparing a loop that keeps one lease open against the same loop with no
lease. It reports the median and observed spread of both arms plus the number of
projects each lease built, so reuse is visible as a count and not only as a
timing. No wall-clock threshold gates the result.

## 15. Public contracts and packaging

The root ESM export exposes replacement, discovery, validation,
template, graph, runner, artifact-set, schema, identity, and project-authority
APIs. Narrow subpath exports provide contract identity, capability
closure, and the runtime-owned internal semantic-program boundary.

Published JSON Schemas cover replacement maps, template manifests and
summaries, synthesis graphs, graph and artifact-set results, runner actions and
state, implementation targets, completion shells, import authority,
unresolved-value authority, and constraint-bound static acceptance. They are
generated from TypeBox contracts and checked into `schemas/` for non-TypeScript
consumers.

`contract-manifest.json` binds the package version, declaration and schema
inventory, TypeScript/toolchain identity, compatibility engines, and published
contract hashes. The package ships `dist`, `schemas`, `docs`, `invariants`, the
contract manifest, README, and glossary.

## 16. Verification and release gates

Verification is layered to match the architecture:

- fixture tests cover canonical low-level replacements;
- unit tests cover marker discovery, syntax contexts, serialization, security,
  template validation, schemas, type/schema compatibility, graph
  compilation, partial fills, patching, runners, provenance, and semantic
  attribution;
- adversarial tests cover forged catalogs and artifacts, stale hashes, invalid
  workspace manifests, diagnostic-origin mismatches, and live-filesystem read
  attempts;
- artifact-set tests cover graph compilation, ledger replay, assembly,
  captured-project semantics, import reconciliation, authority binding, and
  static acceptance;
- typecheck-only fixtures exercise compile-time graph authoring contracts; and
- package smoke tests validate the built ESM distribution and exported schema
  inventory.

The invariant ledger in `invariants/phase-1-3.json` maps critical claims to
their code owner and exact adversarial tests. Its generated Markdown rendering
must not be edited by hand.

The release gate is:

```bash
npm run verify
```

It checks generated schemas, invariant references, the contract manifest,
TypeScript types, tests, the build, package exports, and the generated contract
snapshot. `prepack` repeats the contract-critical subset.

Changes to public types, schemas, diagnostic codes/origins, compatibility
semantics, canonicalization, identity payloads, source-map format, or static
policy require an explicit contract-version review and regenerated artifacts.

## 17. Key design decisions and trade-offs

### 17.1 Text replacement over arbitrary AST mutation

Marked text preserves author-controlled surrounding source and formatting while
the TypeScript AST validates placement. The trade-off is that every replaceable
location must be prepared explicitly and nested replacement regions are not
supported.

### 17.2 Exact kinds over coercion

Exact syntax kinds make contracts and failures predictable. They require more
adapter templates when a concept must appear in several TypeScript contexts.

### 17.3 Explicit generics over inference

Explicit bindings keep planner output serializable and make compatibility
reproducible without project-local inference. They increase graph verbosity and
turn omitted bindings into repairable errors.

### 17.4 Partial artifacts over invalid intermediate source

Missing required inputs retain syntactically valid placeholder bodies and exact
port contracts. This enables bounded filling and auditability, at the cost of
carrying marker and provenance metadata until completion.

### 17.5 Dual catalog identities

Separating planner vocabulary from executable source avoids invalidating a plan
for a source-only edit while still preventing that edit from silently changing
resumed output. Consumers must persist and verify both identities.

### 17.6 Captured projects over live project reads

Captured-byte compilation makes static evidence reproducible and prevents
time-of-check/time-of-use drift. The caller must provide a complete project
view, tsconfig closure, and explicit project-reference authority.

### 17.7 Evidence revalidation over object trust

Every phase can be distributed or persisted as JSON, so later phases treat it
as untrusted evidence. Revalidation adds computation but prevents detached
hashes, forged provenance, or stale workspace state from crossing an authority
boundary.

## 18. Integration boundaries and related documents

Package-owned supporting guides:

- [README and API reference](../README.md)
- [Graph Template Authoring](./TEMPLATES.md)
- [Synthesis Graphs](./SYNTHESIS_GRAPHS.md)
- [Base Pattern Catalog](./base-patterns.md)
- [Project Glossary](GLOSSARY.md)
- [Phase 1-3 invariant ledger](./phase-1-3-invariants.md)

Cross-project documents copied into this package for integration review:

- [Agent runtime technical design](./synthesis-workflow-technical-design.md)
- [Agent runtime implementation inventory](./synthesis-workflow-implementation-inventory.md)
- [Workspace Constraints technical design](./workspace-constraints-technical-design.md)

Those cross-project documents consume this package's public contracts. They do
not expand `synthesize-regions` filesystem, workflow, approval, or execution
authority.
