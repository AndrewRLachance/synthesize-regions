# Synthesis Workflow Implementation Inventory

**Status:** Phase 3 implemented
**Runtime baseline:** Node.js 24 LTS, ES2022, TypeScript
**Companion designs:**
[product description](./synthesis-workflow-product-description.md),
[technical design](./synthesis-workflow-technical-design.md), and
[Workspace Constraints](./workspace-constraints-technical-design.md)

## 1. Purpose

This document is the implementation inventory for the Synthesize Regions Agent
Runtime. It answers two questions:

1. Which libraries, platform modules, external components, and internal modules
   does the runtime use?
2. Which public `synthesize-regions` patterns, types, schemas, and APIs does the
   runtime consume, and which additional library contracts are still required?

This is an allowlist, not a survey of every available package export. A symbol
not listed as consumed is not part of the runtime integration without a design
update. `Current` means the symbol is exported by the package root or a declared
JSON-schema subpath today. `Future` means the design requires it but the package
does not export it today. `Runtime-owned` means it belongs to the agent runtime,
not to `synthesize-regions`.

The current package-owned declarations and schema definitions are explicitly
copied into the
[Synthesis Workflow synthesize-regions Contracts](./synthesis-workflow-synthesize-regions-contracts.md)
snapshot.
The inventory remains the allowlist: supporting declarations copied with a
source module do not activate surfaces marked `Not used`, and contracts marked
`Future` or `Runtime-owned` are not supplied by that snapshot.

## 2. Status Legend

| Status | Meaning |
| --- | --- |
| Selected | Required production dependency or platform choice. |
| Recommended | Concrete initial implementation choice; changing it requires an architecture review. |
| Optional | Loaded only when the corresponding deployment feature is enabled. |
| Development-only | Used to build, generate, verify, or test the product. |
| External component | Process or model artifact configured outside the Node.js package graph. |
| Current | Public `synthesize-regions` contract available now. |
| Future | Required library contract that is not currently public or implemented. |
| Runtime-owned | Contract implemented by the agent runtime rather than the library. |
| Not used | Intentionally excluded from the runtime dependency surface. |

## 3. Platform and Production Libraries

### 3.1 Runtime packages

| Package or component | Status | Owner | Purpose and boundary |
| --- | --- | --- | --- |
| Node.js 24 LTS | Selected | Platform | Executes the local/private runtime. The compilation target remains ES2022. |
| `synthesize-regions` | Selected | Library | Data-only catalog capture, graph compilation and repair, artifact assembly, static validation, schemas, and provenance. It never owns sessions or filesystem application. |
| `ai` | Selected | Model gateway | Performs one bounded model invocation and validates schema-backed structured output with `generateText()` and `Output.object()`. It is not used as an open-ended agent/tool loop. |
| `@ai-sdk/openai-compatible` | Selected | Model gateway | Creates the provider for the OpenAI-compatible `llama-server` endpoint with `createOpenAICompatible()`. |
| `xstate` v5 | Selected | Workflow tooling | Generated visualization and graph/model-test projection. Graph utilities are imported from `xstate/graph`; the deprecated standalone `@xstate/graph` package is not installed. |
| `@sinclair/typebox` | Selected | Protocol/schema | Defines canonical JSON-safe runtime and model-facing schemas and derives TypeScript types. |
| `ajv` | Selected | Protocol/schema | Performs canonical runtime JSON Schema validation with unknown-field rejection and deployment limits. |
| `ts-pattern` | Selected | Protocol core | Exhaustive matching in pure command decisions, reducers, diagnostic routing, and trusted discriminated-union handling. |
| `fastify` v5 | Recommended | API | Hosts the authenticated local/private HTTP API with bounded request bodies and schema-driven serialization. |
| `@fastify/type-provider-typebox` | Recommended | API | Connects route request/response schemas to the same TypeBox contracts used by the protocol. |
| `better-sqlite3` | Recommended | Persistence | Implements short synchronous transactions for event append, materialized-state CAS, idempotency, leases, fencing, and outbox insertion. No transaction spans model, compiler, constraint, or filesystem work. |
| `pino` | Recommended | Observability | Emits structured local logs from API and worker processes under the runtime redaction policy. |
| `jose` | Optional | Authentication | Verifies signed JWT/OIDC credentials in private-network deployments. A local-only deployment may instead use a server-owned token adapter. |
| `@opentelemetry/api` | Optional | Observability | Allows internal modules to emit traces and metrics without requiring an exporter. |
| `@opentelemetry/sdk-node` | Optional | Observability | Enables configured Node.js telemetry. External telemetry remains disabled by default. |
| `@opentelemetry/exporter-trace-otlp-http` | Optional | Observability | Exports traces only when explicitly configured for an authorized private endpoint. |
| `@opentelemetry/exporter-metrics-otlp-http` | Optional | Observability | Exports metrics only when explicitly configured for an authorized private endpoint. |

The AI SDK provides an
[OpenAI-compatible provider](https://ai-sdk.dev/providers/openai-compatible-providers),
and its current structured-output API validates objects through
[`Output.object()`](https://ai-sdk.dev/docs/reference/ai-sdk-core/output).
Fastify's official TypeBox integration is
[`@fastify/type-provider-typebox`](https://fastify.dev/docs/latest/Reference/Type-Providers/).
XState's [graph documentation](https://stately.ai/docs/graph) specifies the
`xstate/graph` import and marks the standalone `@xstate/graph` package as
deprecated.

`better-sqlite3` is preferred for the initial implementation because it exposes
explicit, short transaction functions and supports worker threads. Node 24's
built-in [`node:sqlite`](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)
is still release-candidate, while
[`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) documents full
transaction support. The repository layer hides the driver so a later migration
does not change protocol or domain contracts.

### 3.2 External components

| Component | Status | Purpose and boundary |
| --- | --- | --- |
| `llama-server` from `llama.cpp` | External component | Serves a configured OpenAI-compatible endpoint with schema-constrained JSON output. It is supervised outside the authoritative session transaction. |
| Qwen GGUF model | External component | Deployment-selected local model artifact. Model path, quantization, context size, and role assignment come only from server configuration. |
| SQLite database file | External component | Durable event, projection, idempotency, lease, fencing, and outbox store owned by one runtime deployment. |
| Content-addressed blob directory | External component | Stores exact request, model, graph, artifact, constraint, diagnostic, change-set, and application-journal blobs before events reference them. |
| Immutable workspace snapshot | External component | Read-only captured project view used by target, TypeScript, and optional constraint analysis. |

`llama-server` supports an OpenAI-compatible API and schema-constrained
`response_format`; see the
[`llama.cpp` server documentation](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md).
No generated artifact is sent back to `llama-server` for execution.

### 3.3 Node.js built-ins and web-platform globals

| Module or global | Status | Use |
| --- | --- | --- |
| `node:crypto` | Selected | SHA-256 identities, content hashes, secure random bytes, and `randomUUID()`. |
| `node:fs/promises` | Selected | Immutable snapshot reads, blob writes, staging, fsync-capable file handles, journaled application, and recovery. |
| `node:path` and `node:url` | Selected | Workspace-relative POSIX normalization, containment, file identity, and module-relative resource resolution. |
| `node:worker_threads` | Selected | Cancellable compiler, constraint, and other CPU/memory-isolated workers. Workers never execute generated code. |
| `node:stream` | Selected | Bounded blob and HTTP streaming without unbounded buffering. |
| `node:events` | Selected | In-process lifecycle notification only; durable coordination remains in SQLite/outbox records. |
| `node:os` | Selected | Platform-aware temporary and resource configuration. |
| `node:timers/promises` | Selected | Cancellable lease renewal, polling, and bounded backoff. |
| `AbortController`, `fetch`, `URL`, `TextEncoder`, `TextDecoder` | Selected | Cancellation, model/telemetry HTTP transport, URL handling, and canonical byte conversion. |
| `node:child_process` | Not used | The runtime does not run project commands. Any deployment-level `llama-server` supervision is outside candidate orchestration. |
| `node:vm` | Not used | Constraints, templates, and generated artifacts are data and are never evaluated. |

### 3.4 Development and verification tooling

| Package | Status | Purpose |
| --- | --- | --- |
| `typescript` | Development-only | Strict compilation and generated protocol checking. The pinned static semantic engine is owned behind the `synthesize-regions` library boundary. |
| `tsx` | Development-only | Runs repository scripts and generators during engineering work only. |
| `vitest` | Development-only | Unit, integration, replay, and package tests. Candidate synthesis never invokes it. |
| `fast-check` | Development-only | Property-based command/event, CAS, fencing, scheduler, hashing, and canonicalization tests. |
| `@types/node` | Development-only | Node.js platform types for the Node 24 baseline. |
| `@types/better-sqlite3` | Development-only | Type declarations for the selected SQLite driver. |
| `@vitest/coverage-v8` | Development-only | Optional engineering coverage reporting; not part of candidate acceptance. |
| `@mermaid-js/mermaid-cli` | Development-only | Verifies generated workflow diagrams in documentation/CI. |

The `synthesize-regions` package itself owns `ts-morph`, `type-fest`, TypeBox,
Ajv, `ts-pattern`, and TypeScript where its implementation imports them. The
agent runtime must declare a dependency directly only when its own source imports
that package; it must not rely on transitive dependencies.

## 4. Internal Runtime Module Map

These are internal ownership boundaries, not additional npm packages.

| Module | Depends on | Responsibility |
| --- | --- | --- |
| Configuration and policy | TypeBox, Ajv, Node platform | Loads fixed model, static, auth, retention, redaction, path, concurrency, and resource policies. Requests cannot supply implementations. |
| HTTP API and authentication | Fastify, TypeBox provider, optional `jose` | Authenticates callers, validates request/response contracts, and submits protocol commands. |
| Protocol schemas | TypeBox, Ajv | Owns runtime commands, events, sessions, approvals, rejection results, HTTP schemas, and model-facing projections. |
| Workflow definition/compiler | TypeBox, `xstate` | Validates one declarative topology and generates unions, transition indexes, schemas, XState projection, diagrams, and fixtures. |
| Command decider | `ts-pattern`, protocol types | Pure `decide(state, command)` authorization and domain-event proposal. Performs no I/O. |
| Event reducer | `ts-pattern`, protocol types | Pure `evolve(state, event)` reconstruction checked against the generated transition target. |
| SQLite repository | `better-sqlite3` | Atomically appends events, reduces materialized state, applies revision CAS, and inserts outbox work. |
| Blob store | Node crypto/files | Writes and verifies content-addressed blobs before an event may reference them. |
| Outbox dispatcher | SQLite repository, timers | Claims durable work with leases/fencing and dispatches post-commit workers. |
| Model gateway | `ai`, OpenAI-compatible provider | Executes one role-specific structured invocation with cancellation and usage accounting. |
| Catalog capture/disclosure | `synthesize-regions` | Loads manifest data, captures immutable identities, derives schemas, and reveals bounded summaries. |
| Role handlers | Model gateway, protocol schemas | Implements Artifact-Set Planner, Graph Planner, Graph Repairer, Input Synthesizer, and Artifact-Set Repairer requests. |
| Workspace capture | Node files/crypto | Produces immutable normalized source views, target descriptors, and snapshot identities. |
| Synthesis/static adapter | `synthesize-regions`, worker threads | Compiles authoritative plans and fills, assembles overlays, performs static checks, and returns provenance. |
| Workspace Constraint adapter | `workspace-constraints` public APIs | Captures `.wsc` data and evaluates fixed plan, artifact, assembled, and semantic phases. It cannot add workflow topology. |
| Diagnostic router | `ts-pattern`, provenance contracts | Routes structured failures without a classifier model. |
| Budget/progress manager | Protocol types, crypto | Charges resources and fingerprints candidate/diagnostic state for deterministic no-progress termination. |
| Staging and approval | Blob store, protocol core | Builds the runtime approval envelope and binds exact session/workflow/catalog/workspace/constraint identities. |
| Application coordinator | Node files/path/crypto | Revalidates live authority and applies only the exact approved bytes through a recoverable journal. |
| Observability/redaction | Pino, optional OpenTelemetry | Emits bounded, redacted logs, traces, and metrics without changing protocol decisions. |

Dependency direction is inward toward pure contracts and domain functions.
Persistence, HTTP, model, compiler, and filesystem adapters cannot be imported by
the command decider or reducer.

## 5. Current `synthesize-regions` Catalog Surface

All current symbols in the following sections are exported from the package
root unless a JSON subpath is shown.

### 5.1 Catalog types and schemas

| Symbols | Kind | Status | Consumer | Purpose | Approval/security significance |
| --- | --- | --- | --- | --- | --- |
| `GraphTemplateManifest` | Type | Current | Catalog capture | Data-only template definition accepted from repository/server catalog data. | Prevents runtime loading of author callbacks or imported catalog code. |
| `GraphTemplateDefinition` | Type | Current | Catalog adapter | Library-produced normalized/compiled template representation; it is never accepted from a request. | Runtime never accepts caller-constructed executable definitions. |
| `TemplateSummary`, `InputPortSummary`, `LiteralInputPortSummary`, `FragmentInputPortSummary`, `FragmentCollectionInputPortSummary`, `RawCodeInputPortSummary`, `UnionInputPortSummary`, `OutputPortSummary` | Types | Current | Catalog disclosure/model schema projection | Implementation-free planner contracts. | Only bounded selected summaries are disclosed to models. |
| `InputPort`, `LiteralInputPort`, `FragmentInputPort`, `FragmentCollectionInputPort`, `RawCodeInputPort`, `UnionInputPort`, `OutputPort`, `RawCodePolicy` | Types | Current | Catalog validation/compiler adapter | Canonical template input/output and raw-source policy contracts. | Raw code is accepted only through explicitly declared raw-code ports. |
| `TemplateCatalogView`, `TemplateRegistry`, `TemplateRegistrySnapshot` | Types | Current | Catalog capture | Trusted library-created catalog view and immutable snapshot. | Compilation must use the captured snapshot, not mutable caller data. |
| `GraphTemplateManifestSchema`, `InputPortSchema`, `OutputPortSchema`, `RawCodePolicySchema`, `InputPortSummarySchema`, `OutputPortSummarySchema`, `TemplateSummarySchema`, and the five concrete input-summary schemas | TypeBox schemas | Current | Catalog capture/protocol schemas | Canonical runtime validation of manifest and summary data. | Unknown or malformed catalog data fails before planning. |

### 5.2 Catalog APIs

| Symbol | Kind | Status | Consumer | Purpose | Approval/security significance |
| --- | --- | --- | --- | --- | --- |
| `createTemplateRegistryFromManifests()` | API | Current | Catalog capture | Validates declarative manifests and creates a library-owned registry. | Primary runtime catalog entry; never imports session JavaScript. |
| `TemplateRegistry.snapshot()` | API method | Current | Catalog capture | Produces the immutable `TemplateRegistrySnapshot`. | Session compilation stays bound to one captured view. |
| `templateCatalogDigest()` | API | Current | Catalog identity | Computes the planner-facing contract digest. | Planning compatibility and stale-action checks. |
| `templateCatalogManifestDigest()` | API | Current | Catalog identity | Computes the exact catalog manifest digest. | Source-producing identity bound through static acceptance. |
| `templateManifestDigest()` | API | Current | Provenance/catalog identity | Computes one exact template digest. | Generated ranges retain producing-template identity. |
| `TEMPLATE_MANIFEST_DIGEST_VERSION`, `TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION` | Constants | Current | Identity/versioning | Version digest algorithms. | Replay cannot silently reinterpret a digest. |
| `templateRegistryToSynthesisGraphJsonSchema()` | API | Current | Graph Planner schema projection | Produces a strict catalog-specific graph JSON Schema. | Constrained model output is still canonically revalidated. |
| `templateRegistryToPartialSynthesisGraphJsonSchema()` | API | Current | Graph Planner schema projection | Produces a partial graph JSON Schema. | Allows bounded missing inputs without accepting an invalid final graph. |
| `graphTemplateDefinitionToNodeSchema()`, `graphTemplateDefinitionToJsonSchema()` | APIs | Current | State-specific schema projection | Narrows a selected template/node contract. | Model chooses values only inside the current authorized shape. |
| `captureTemplateCatalogView()` | API | Current | Catalog capture | Captures the trusted immutable catalog view used by phase compilation. | Runtime compilation remains bound to exact catalog identities. |

`defineTemplate()`, `defineTemplateCatalog()`, `createTemplateRegistry()` from
executable definitions, `validateTemplateCatalog()`, and
`assertTemplateCatalogValid()` remain authoring/library tools. The runtime uses
the manifest-only registry path.

## 6. Current Graph, Artifact, and Provenance Surface

### 6.1 Graph types

| Symbols | Kind | Status | Consumer | Purpose | Approval/security significance |
| --- | --- | --- | --- | --- | --- |
| `RegionKind`, `TypedSyntaxRegionKind`, `REGION_KIND_VALUES`, `REGION_SYNTAX_ENGINE_VERSION` | Types/constants | Current | Protocol/catalog/target validation | Closed source-fragment kind vocabulary and engine identity. | Target and output kinds must match exactly. |
| `SynthesisGraph`, `SynthesisNode`, `SynthesisInput`, `NormalizedSynthesisInput`, `GraphNormalizationResult` | Types | Current | Graph planning/compilation | Canonical graph protocol and normalization result. | Graph references remain artifact-scoped and validated before commitment. |
| `SynthesisGoal` | Type | Current | Set/graph planning | Declares required output kind/type goal. | Model goals cannot override target authorization. |
| `GraphPatchAction`, `GraphPatchActionKind`, `GraphPatchResult` | Types | Current | Graph Repairer/Input Synthesizer | One scoped immutable graph mutation and result. | Rejected patches preserve accepted state. |
| `GraphCompilationMode`, `GraphCompilationResult`, `GraphPartialCompilationResult`, `GraphCompileOptions` | Types | Current | Synthesis adapter/router | Strict/partial compilation result and fixed options. | Classification and provenance drive deterministic routing. |
| `SynthesisDiagnostic`, `SynthesisRepairHint`, `SynthesisFailureClassification` | Types | Current | Diagnostic router | Structured compiler/policy diagnostics and repair classification. | No classifier model guesses ownership. |
| `TypeDescriptor`, `SemanticTargetFileContext`, `GraphSemanticContext` | Types | Current | Compiler/static adapter | Type/schema compatibility and captured project context. | Semantic evidence is tied to the immutable project view. |

### 6.2 Graph APIs

| Symbol | Kind | Status | Consumer | Purpose | Approval/security significance |
| --- | --- | --- | --- | --- | --- |
| `normalizeSynthesisGraph()` | API | Current | Command validation/fingerprinting | Expands shorthand and validates canonical graph structure. | Canonical form is used for hashes and no-progress identity. |
| `applyGraphPatch()` | API | Current | Graph Repairer/Input Synthesizer | Applies one `GraphPatchAction` without mutating the accepted graph. | Patch acceptance remains transactional and revision-bound. |
| `compileGraph()` | API | Current | Graph compiler adapter | Compiles a strict or partial graph against the captured catalog. | Never executes emitted code. |
| `fillTemplateArtifactWithCatalog()` | API | Current | Fill validation | Applies an input map against the captured catalog and base artifact. | Catalog-bound validation prevents detached or stale fills. |
| `finalizeTemplateArtifactWithCatalog()` | API | Current | Fill validation | Requires all unresolved inputs to be resolved under the catalog. | Only complete artifacts may enter final assembly. |
| `validateTemplateArtifactAgainstCatalog()` | API | Current | Replay/integrity checks | Revalidates artifact provenance and template identity. | Persisted or caller-constructed artifact data is not trusted. |
| `validateTemplateArtifactIntegrity()` | API | Current | Replay/integrity checks | Validates source maps, hashes, unresolved inputs, and artifact shape. | Corrupt persisted artifacts fail closed. |

The unbound `fillTemplateArtifact()` and `finalizeTemplateArtifact()` helpers are
not used by the runtime because they do not establish current catalog identity.

### 6.3 Artifact and provenance types

| Symbols | Kind | Status | Consumer | Purpose | Approval/security significance |
| --- | --- | --- | --- | --- | --- |
| `GeneratedFragment`, `CompleteTemplateArtifact`, `PartialTemplateArtifact`, `TemplateArtifact`, `TemplateArtifactResult` | Types | Current | Compiler/fill/static adapter | Generated source and complete/partial artifact results. | Generated source remains untrusted data. |
| `TemplateArtifactInput`, `TemplateArtifactInputMap`, `UnresolvedTemplateInput` | Types | Current | Input Synthesizer/fill ledger | Literal, raw, fragment, collection, and unresolved input contracts. | Input IDs and hashes bind fills to exact artifacts. |
| `GeneratedSourceSpan`, `GeneratedNodeSourceSpan`, `GeneratedInputSourceSpan`, `GeneratedSourceMap`, `GENERATED_SOURCE_MAP_VERSION`, `GENERATED_SOURCE_SPAN_KIND_VALUES` | Types/constants | Current | Diagnostic attribution | Maps generated coordinates to nodes and exact inputs. | Establishes textual ownership without claiming causality. |
| `GeneratedFragmentSchema`, `CompleteTemplateArtifactSchema`, `PartialTemplateArtifactSchema`, `TemplateArtifactSchema`, `TemplateArtifactResultSchema`, `TemplateArtifactInputSchema`, `TemplateArtifactInputMapSchema`, `GeneratedSourceSpanSchema`, `GeneratedSourceMapSchema` | TypeBox schemas | Current | Persistence/model result validation | Validates generated and persisted artifact/provenance data. | Invalid provenance never enters repair routing or approval. |
| `deepestGeneratedSourceSpan()` | API | Current | Diagnostic router/constraint attribution | Finds the most specific owning input or node for a generated position. | Enables deterministic local repair routing from deepest provenance. |

## 7. Current Artifact-Set Surface

### 7.1 Types and schemas

| Symbols | Kind | Status | Consumer | Purpose | Approval/security significance |
| --- | --- | --- | --- | --- | --- |
| `ArtifactTarget`, `ArtifactSetUnit`, `ArtifactSetPlan` | Types | Current | Artifact-Set Planner/compiler | Ordered graph-to-target candidate. | Targets remain exact creates or hash-bound range replacements. |
| `ArtifactFillLedgerEntry` | Type | Current | Candidate/fill replay | Hash-chained accepted fill. | Stale graph/base/result identities reject the fill. |
| `ArtifactSetCompileOptions`, `ArtifactSetUnitCompilation` | Types | Current | Compiler adapter | Workspace, mode, policy, semantic, and ledger inputs plus per-unit results. | Compilation uses the captured workspace and catalog. |
| `ArtifactSetStrictCompilationResult`, `ArtifactSetPartialCompilationResult`, `ArtifactSetCompilationResult` | Types | Current | Router/session reducer | Complete, incomplete, or failed artifact-set result. | Discriminants prevent incomplete work from becoming approval eligible. |
| `ArtifactSetAssemblyUnit`, `ArtifactSetAssemblyOptions`, `ArtifactSetAssemblyResult` | Types | Current | Assembly adapter | Pure target assembly with `validation: "syntax"`. | Syntax-only results cannot be approved. |
| `ArtifactSetDiagnostic`, `ArtifactSetTextEdit`, `ArtifactSetChange` | Types | Current | Diagnostics/staging | Artifact-scoped diagnostics and exact assembled edits/files. | Change bytes and provenance are deterministic. |
| `ArtifactSetAcceptanceIdentity`, `ValidatedArtifactChangeSet`, `ArtifactSetStaticValidationResult` | Types | Current | Static adapter/staging | Library static identity and `validation: "static"` result. | Only this library result can seed the runtime approval envelope. |
| `ArtifactTargetSchema`, `ArtifactSetUnitSchema`, `ArtifactSetPlanSchema`, `ArtifactFillLedgerEntrySchema`, `ArtifactSetDiagnosticSchema`, `ArtifactSetTextEditSchema`, `ArtifactSetChangeSchema`, `ValidatedArtifactChangeSetSchema`, `ArtifactSetCompilationResultSchema`, `ArtifactSetStaticValidationResultSchema` | TypeBox schemas | Current | Protocol/persistence | Canonical artifact-set validation. | Detached or malformed values fail before state commitment. |

### 7.2 APIs and hashes

| Symbol | Kind | Status | Consumer | Purpose | Approval/security significance |
| --- | --- | --- | --- | --- | --- |
| `compileArtifactSet()` | API | Current | Compiler adapter | Compiles ordered graphs, replays fill ledger, and returns per-unit results. | Uses authoritative plan/catalog/workspace inputs. |
| `assembleArtifactSetTargets()` | API | Current | Assembly adapter | Validates targets and assembles complete files in memory. | Returns syntax-only output and never writes files. |
| `validateArtifactSetStatic()` | API | Current | Final static adapter | Recompiles the authoritative plan and requires library static acceptance. | Never accepts detached caller-constructed artifacts. |
| `normalizeArtifactTargetPath()` | API | Current | Request/plan validation | Normalizes workspace-relative POSIX targets. | Rejects absolute and traversal paths. |
| `createArtifactSetFileHash()` | API | Current | Workspace capture/preflight | Hashes exact base/result file text. | Binds replacement authority and detects drift. |
| `createArtifactSetGraphHash()` | API | Current | Candidate/fill ledger | Hashes canonical graph meaning. | Binds fills and stale actions. |
| `createArtifactSetArtifactHash()` | API | Current | Fill ledger/integrity | Hashes exact artifact content and provenance. | Detects detached or altered artifacts. |
| `createArtifactSetWorkspaceSnapshotHash()` | API | Current | Workspace capture/static adapter | Hashes normalized captured workspace identity. | Static results cannot silently move to another workspace. |
| `createArtifactSetChangeSetHash()` | API | Current | Library static adapter | Hashes library changes and `ArtifactSetAcceptanceIdentity`. | This is the package-level static hash, not the final runtime approval-envelope hash. |
| `ARTIFACT_SET_STATIC_POLICY_VERSION` | Constant | Current | Static identity | Versions the library's mandatory static gate. | Policy changes invalidate library static identity. |

## 8. Current Patterns and Runtime Guards

Patterns are used only after JSON parsing and before exhaustive matching. TypeBox
schemas remain the authoritative wire validators.

| Symbols | Kind | Status | Consumer | Boundary |
| --- | --- | --- | --- | --- |
| `regionKindPattern`, `typeDescriptorPattern` | Patterns | Current | Catalog/target validation | Narrows closed syntax and type descriptors. |
| `synthesisFailureClassificationPattern`, `synthesisDiagnosticPattern` | Patterns | Current | Diagnostic router | Exhaustive deterministic failure routing. |
| `generatedSourceSpanPattern`, `isGeneratedSourceSpan()`, `generatedSourceMapPattern`, `isGeneratedSourceMap()` | Patterns/guards | Current | Persistence/attribution | Rejects invalid persisted provenance. |
| `literalInputPortPattern`, `fragmentInputPortPattern`, `fragmentCollectionInputPortPattern`, `rawCodeInputPortPattern`, `unionInputPortPattern`, `inputPortPattern`, `isInputPort()`, `outputPortPattern` | Patterns/guard | Current | Catalog disclosure/schema projection | Narrows exact port variants without dynamic callbacks. |
| `literalTemplateArtifactInputPattern`, `rawCodeTemplateArtifactInputPattern`, `fragmentTemplateArtifactInputPattern`, `fragmentCollectionTemplateArtifactInputPattern`, `templateArtifactInputPattern`, `isTemplateArtifactInputMap()` | Patterns/guard | Current | Input Synthesizer/fill validation | Narrows the one permitted input family and validates its keyed map. |
| `literalSynthesisInputPattern`, `rawCodeSynthesisInputPattern`, `refSynthesisInputPattern`, `refShorthandSynthesisInputPattern`, `inlineSynthesisInputPattern`, `fragmentCollectionSynthesisInputPattern`, `normalizedSynthesisInputPattern`, `synthesisInputPattern` | Patterns | Current | Graph command validation | Narrows model-authored graph inputs. |
| `synthesisGoalPattern`, `synthesisNodePattern`, `isSynthesisNode()`, `synthesisGraphPattern`, `isSynthesisGraph()` | Patterns/guards | Current | Planner/graph validation | Validates graph-shaped untrusted values before domain matching. |
| `graphPatchActionPattern`, `isGraphPatchAction()`, `graphPatchResultPattern`, `isGraphPatchResult()` | Patterns/guards | Current | Graph action command/reducer | Validates accepted and persisted patch data. |
| `graphCompilationResultPattern`, `isGraphCompilationResult()`, `graphPartialCompilationResultPattern`, `isGraphPartialCompilationResult()` | Patterns/guards | Current | Compiler result command | Validates worker results before state commitment. |
| `completeTemplateArtifactPattern`, `partialTemplateArtifactPattern`, `templateArtifactPattern`, `isTemplateArtifact()` | Patterns/guards | Current | Fill/static adapter | Keeps partial and complete artifact states distinct. |
| `templateArtifactSuccessPattern`, `templateArtifactCompleteSuccessPattern`, `templateArtifactFailurePattern`, `templateArtifactResultPattern`, `isTemplateArtifactResult()` | Patterns/guard | Current | Fill result routing | Exhaustively distinguishes accepted, incomplete, and failed fills. |

`graphRunnerActionPattern`, `graphRunnerStatePattern`, their guards, and all
`GraphRunner` contracts are intentionally not used.

## 9. Current Schema and Compatibility Surface

### 9.1 Root TypeBox schemas

| Symbols | Status | Consumer and use |
| --- | --- | --- |
| `RegionKindSchema`, `TypeDescriptorSchema`, `SynthesisInputSchema`, `SynthesisGraphSchema` | Current | Canonical graph request and persisted-state validation. |
| Catalog and port schemas listed in Section 5 | Current | Manifest capture and bounded disclosure. |
| `SynthesisDiagnosticSchema`, `SynthesisFailureClassificationSchema` | Current | Worker result and event/blob validation. |
| Artifact/provenance schemas listed in Section 6 | Current | Generated source, fill, and source-map validation. |
| `StrictGraphCompilationResultSchema`, `PartialGraphCompilationResultSchema`, `GraphCompilationResultSchema` | Current | Compiler-result commands and persisted blobs. |
| Artifact-set schemas listed in Section 7 | Current | Plan, ledger, assembly/static output, staging input. |
| `GraphPatchActionSchema`, `GraphPatchResultSchema` | Current | Graph/Input repair commands and event payloads. |
| `JsonValueSchema`, `SupportedJsonSchemaSchema` | Current | Safe JSON values and the supported JSON Schema subset. |
| `checkContract()` | Current | Shared TypeBox value guard after JSON parsing. |

### 9.2 Exported JSON-schema subpaths used by the runtime

| Package subpath | Status | Use |
| --- | --- | --- |
| `synthesize-regions/schemas/supported-json-schema.schema.json` | Current | Catalog schema-policy validation and tooling interchange. |
| `synthesize-regions/schemas/template-manifest.schema.json` | Current | Data-only catalog files. |
| `synthesize-regions/schemas/template-summary.schema.json` | Current | Planner-facing summary interchange. |
| `synthesize-regions/schemas/synthesis-graph.schema.json` | Current | Generic canonical graph interchange; catalog-specific schemas are generated dynamically. |
| `synthesize-regions/schemas/graph-compilation-result.schema.json` | Current | Compiler worker result persistence/interchange. |
| `synthesize-regions/schemas/artifact-set-plan.schema.json` | Current | Canonical artifact-set plan interchange. |
| `synthesize-regions/schemas/artifact-set-compilation-result.schema.json` | Current | Artifact-set compiler worker result interchange. |
| `synthesize-regions/schemas/artifact-set-static-validation-result.schema.json` | Current | Library static result interchange. |

`replacement-map.schema.json`, `graph-runner-action.schema.json`, and
`graph-runner-state.schema.json` are exported by the package but are not used by
this runtime.

### 9.3 Compatibility contracts

| Symbols | Kind | Status | Consumer | Purpose/security significance |
| --- | --- | --- | --- | --- |
| `SupportedJsonSchema`, `JsonValue` | Types | Current | Catalog/schema projection | Closed JSON-safe value and schema subset. |
| `validateSupportedJsonSchema()`, `validateJsonValueAgainstSchema()`, `compareJsonSchemas()` | APIs | Current | Catalog and literal validation | Unsupported or indeterminate schema relationships fail closed. |
| `canonicalizeSupportedJsonSchema()`, `canonicalJsonSchemaString()` | APIs | Current | Digest/schema identity | Stable supported-schema identity. |
| `validateTypeScriptType()`, `compareTypeScriptTypes()` | APIs | Current | Catalog and semantic compatibility | Uses the pinned TypeScript compatibility engine without executing code. |
| `TYPESCRIPT_COMPATIBILITY_ENGINE_VERSION` | Constant | Current | Catalog/constraint identity | Compatibility changes invalidate dependent digests. |
| `compareTypeDescriptors()`, `resolveEffectiveTypeDescriptor()`, `isTypeCompatible()` | APIs | Current | Port/goal compatibility | Combines TypeScript and JSON-schema evidence with indeterminate handling. |
| `TYPE_DESCRIPTOR_COMPATIBILITY_STATUS_VALUES`, `SCHEMA_COMPATIBILITY_VALUES` | Constants | Current | Exhaustive routing | Keeps compatible, incompatible, and indeterminate outcomes explicit. |
| `GraphCompileOptions`, `ArtifactSetCompileOptions`, `RawCodePolicy`, `SecurityPolicyOptions` | Types | Current | Static adapter/policy | Server-owned options restrict raw/generated source and semantic work. |

## 10. Required `synthesize-regions` Additions

These names are proposed integration contracts. They do not exist as public
exports today and must not be imported until implemented, schema-backed, and
package-tested.

### 10.1 Workspace Constraint surface

| Proposed symbol or artifact | Kind | Status | Required use and boundary |
| --- | --- | --- | --- |
| `WorkspaceConstraintSet`, `WorkspaceConstraintRule`, `ConstraintModuleCapture`, `ConstraintSourceMap` | Types | Current (`workspace-constraints`) | Canonical JSON-safe compiled `.wsc` closure and source attribution. |
| `WorkspaceConstraintIdentity`, `WorkspaceConstraintBudgets` | Types | Current (`workspace-constraints`) | Semantic/source/engine/analysis identity and bounded evaluation. |
| `WorkspaceConstraintDiagnostic`, `WorkspaceConstraintPhaseResult`, `WorkspaceConstraintSummary` | Types | Current (`workspace-constraints`) | Deterministic phase results, model disclosure, and repair routing. |
| `WorkspaceConstraintFactSummary`, `WorkspaceConstraintEvaluationInput` | Types | Current (`workspace-constraints`) | Library-owned bounded facts derived from authorized immutable views; no custom fact-provider callback. |
| `parseWorkspaceConstraintModule()` | API | Current (`workspace-constraints`) | Parses one `.wsc` byte string as data and returns source diagnostics. Performs no filesystem or module execution. |
| `compileWorkspaceConstraintCapture()` | API | Current (`workspace-constraints`) | Resolves an entry from a caller-supplied immutable module-byte map, validates the closure, and returns canonical IR/source maps. |
| `evaluateWorkspaceConstraintPhase()` | API | Current (`workspace-constraints`) | Evaluates exactly one fixed phase against library-owned facts and immutable inputs. |
| Typed IR, source-map, summary, diagnostic, evaluation-input, and phase-result schemas | TypeBox schemas | Current (`workspace-constraints`) | Canonical wire validation with unknown-field rejection. |
| `workspace-constraint-set.schema.json`, `workspace-constraint-summary.schema.json`, `workspace-constraint-diagnostic.schema.json`, `workspace-constraint-evaluation-input.schema.json`, `workspace-constraint-phase-result.schema.json` | JSON-schema subpaths | Current (`workspace-constraints`) | Published interchange contracts. |

The APIs accept source bytes, normalized workspace/artifact views, and fixed
options—not executable validators, compiler plugins, arbitrary AST callbacks,
or caller-registered fact providers.

### 10.2 Phase-granular artifact-set surface

| Proposed symbol | Kind | Status | Required use and boundary |
| --- | --- | --- | --- |
| `compileArtifactSetGraphs()` and `ArtifactSetGraphCompilationResult` | API/type | Current | Produce per-artifact complete/partial graph artifacts without target assembly or semantic acceptance. |
| `ArtifactSetAssemblyResultSchema` | TypeBox schema | Current | Validates syntax-only assembly results crossing worker or persistence boundaries. |
| `validateArtifactSetSemantics()` and `ArtifactSetSemanticValidationResult` | API/type | Current | Compare baseline and candidate TypeScript programs after syntax assembly. Returns `validation: "semantic"`, never approval eligibility. |
| `ConstraintBoundStaticAcceptance` | Type | Current | Binds exact constraint identity and required plan/artifact/assembled/semantic phase-result blob hashes. |
| `finalizeArtifactSetStatic()` | API | Current | Revalidates authoritative plan/ledger and phase-bound evidence before producing `validation: "static"`. |
| `ArtifactSetGraphCompilationResultSchema`, `ArtifactSetAssemblyResultSchema`, `ArtifactSetSemanticValidationResultSchema`, `ConstraintBoundStaticAcceptanceSchema` | TypeBox schemas | Current | Worker-result and constraint-acceptance validation for phase boundaries. |
| `artifact-set-graph-compilation-result.schema.json`, `artifact-set-assembly-result.schema.json`, `artifact-set-semantic-validation-result.schema.json`, `constraint-bound-static-acceptance.schema.json` | JSON-schema subpaths | Current | Published phase-result and acceptance-evidence interchange. |
| Public `deepestGeneratedSourceSpan()` | API export | Current | Makes deepest-span attribution available to the runtime and constraint evaluator. |
| Public `captureTemplateCatalogView()` | API export | Current | Captures an immutable trusted catalog view. |
| `SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG`, `classifySynthesisDiagnosticCode()` | Catalog/API | Current | Supplies exhaustive package-owned failure classifications; unknown codes fail terminally. |
| `ArtifactSetCompileOptions.unavailableTextPaths` | Option | Current | Binds non-UTF-8 manifest files into an exact partition while keeping the tsconfig and TypeScript/JavaScript inputs in the verified text view. |

`compileArtifactSet()` and `validateArtifactSetStatic()` remain compatibility
facades over the phase-granular surfaces. Intermediate graph, syntax, and
semantic results remain non-approval-eligible; only authoritative finalization
produces `validation: "static"`.

### 10.3 Hash ownership

The library and runtime use two nested identities:

```text
synthesize-regions static result
  libraryChangeSetHash = catalog + workspace + static policy + exact changes
                     |
                     v
runtime approval envelope
  changeSetHash = library result + session revision + workflow identity
                + model/static policy IDs + optional constraint/analysis identity
```

`createArtifactSetChangeSetHash()` owns the library hash. A runtime-owned
canonical envelope hasher owns the final approval hash. The runtime must not
mislabel its broader envelope hash as a package-produced identity, and approval
never matches either value by “latest.”

## 11. Runtime-Owned Contracts

The following are not `synthesize-regions` exports:

| Contract family | Representative contracts | Owner |
| --- | --- | --- |
| Request/authorization | `SynthesisRequest`, `WorkspaceConstraintRequest`, authorized target and analysis-root capture | Runtime protocol |
| Workflow | `WorkflowDefinition`, `WorkflowTransition`, generated `SessionStatus`, transition/observation indexes | Workflow compiler |
| State protocol | `ProtocolCommand`, `DomainEvent`, `Decision`, `SynthesisSession`, `SynthesisSessionOutcome` | Command/event core |
| Persistence | `EventEnvelope`, materialized-state record, idempotency record, lease/fencing record, `OutboxWorkItem` | SQLite repository |
| Model roles | Artifact-set outline, role invocation/result envelopes, rejection history | Role handlers/model gateway |
| Set repair | `ArtifactSetPatchAction`, `ArtifactOutline`, `AuthorizedArtifactTarget` | Runtime protocol |
| Constraint orchestration | Phase commands/events, skip reasons, evaluation work item | Runtime protocol/outbox |
| Approval/application | `ApproveChangeSetRequest`, runtime approval envelope, application journal and recovery result | Staging/application coordinator |
| HTTP | Endpoint request/response/error schemas | Fastify API adapter |
| Budgets/observability | `SynthesisBudgets`, counters, fingerprints, metrics and redaction records | Runtime policy |

Runtime schemas may reference public library schemas, but the package never
owns caller authentication, session transitions, database state, approval, or
filesystem mutation.

## 12. Explicitly Excluded Surfaces

| Surface | Status | Reason |
| --- | --- | --- |
| `GraphRunner`, `GraphRunnerState`, `GraphRunnerAction`, `createGraphRunner()` and runner schemas/patterns | Not used | The authoritative runtime uses its generated workflow, pure command decider, pure reducer, event store, and outbox. |
| `defineTemplate()` and executable template definitions supplied by a session | Not used at runtime | Runtime catalogs are manifest data compiled by library-owned code. |
| `synthesize-regions/builders` | Not used by runtime | Builders are template-author engineering helpers, not model/runtime authority. |
| Direct `generate()`, replacement maps, marker discovery, or file-template APIs | Not used by runtime | Graph/artifact-set facades are the controlled synthesis boundary. |
| Direct `ts-morph` imports in the runtime | Not used | AST/compiler objects stay behind `synthesize-regions` and future library-owned fact APIs. |
| `node:vm`, dynamic `import()` of repository code, compiler plugins, custom validators | Not used | Generated and repository-authored policy data is never executed. |
| AI SDK agent/tool loop APIs | Not used | Every model call returns one role-specific structured result. |
| XState actors/actions as production state | Not used | XState is a generated visualization and test projection only. |

## 13. Version and Change Policy

- Pin exact dependency versions in the implementation lockfile. This document
  records architectural majors only where behavior depends on them: Node 24,
  XState 5, and Fastify 5.
- Record `synthesize-regions` contract, manifest, syntax, compatibility, schema,
  static-policy, constraint-engine, and workflow versions in their respective
  digests or acceptance identities.
- Adding a direct dependency, consuming an unlisted package export, or moving a
  contract between runtime and library ownership requires updating this
  inventory and the relevant technical design.
- Package upgrades that affect canonicalization, schemas, source production,
  static analysis, workflow topology, or approval identity require explicit
  compatibility tests and version/digest changes.
- Optional telemetry and authentication packages must remain absent from the
  critical synthesis decision path when disabled.
