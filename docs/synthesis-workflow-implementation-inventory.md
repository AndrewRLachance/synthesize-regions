# Synthesis Workflow Implementation Inventory

> **Cross-project snapshot:** this repository owns the `synthesize-regions`
> contracts listed here; runtime-core owns the live workflow, runtime
> dependencies, and this inventory's authoritative source. Runtime Phase 1–3
> stops at `readyForApproval`; Phase 4 approval/application surfaces are
> planned external work, not current exports.

**Status:** Phases 1-3 implemented; Phase 4 and integration-layer surfaces planned
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
2. Which public `synthesize-regions` and `workspace-constraints` patterns,
   types, schemas, and APIs does the runtime consume?

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
| Selected | Installed or directly used by the current Phase 1-3 runtime. |
| Planned | Not installed or implemented by this package; reserved for Phase 4 or an integration layer. |
| Planned optional | A planned integration dependency that is needed only when that deployment feature is enabled. |
| Development-only | Used to build, generate, verify, or test the product. |
| External component | Process or model artifact configured outside the Node.js package graph. |
| Current | Public `synthesize-regions` contract available now. |
| Future | Required library contract that is not currently public or implemented. |
| Runtime-owned | Contract implemented by the agent runtime rather than the library. |
| Not used | Intentionally excluded from the runtime dependency surface. |

## 3. Current and Planned Platform Libraries

### 3.1 Current runtime and planned integration packages

| Package or component | Status | Owner | Purpose and boundary |
| --- | --- | --- | --- |
| Node.js 24 LTS | Selected | Platform | Executes the local/private runtime. The compilation target remains ES2022. |
| `synthesize-regions` | Selected | Library | Data-only catalog capture, graph compilation and repair, artifact assembly, static validation, schemas, and provenance. It never owns sessions or filesystem application. |
| `workspace-constraints` | Selected | Companion library | Data-only `.wsc` parsing, normalized typed IR/source maps, immutable module-closure compilation, library-owned facts, bounded four-phase evaluation, schemas, summaries, diagnostics, and semantic/source identity. |
| `ai` | Selected | Model gateway | Performs one bounded model invocation and validates schema-backed structured output with `generateText()` and `Output.object()`. It is not used as an open-ended agent/tool loop. |
| `@ai-sdk/openai-compatible` | Selected | Model gateway | Creates the provider for the deployment-configured OpenAI-compatible endpoint with `createOpenAICompatible()`. |
| `xstate` v5 | Selected | Workflow tooling | Generated visualization and graph/model-test projection. Graph utilities are imported from `xstate/graph`; the deprecated standalone `@xstate/graph` package is not installed. |
| `@sinclair/typebox` | Selected | Protocol/schema | Defines canonical JSON-safe runtime and model-facing schemas and derives TypeScript types. |
| `ajv` | Selected | Protocol/schema | Performs canonical runtime JSON Schema validation with unknown-field rejection and deployment limits. |
| `ts-pattern` | Selected | Protocol core | Exhaustive matching in pure command decisions, reducers, diagnostic routing, and trusted discriminated-union handling. |
| `better-sqlite3` | Selected | Persistence | Implements short synchronous transactions for event append, materialized-state CAS, idempotency, leases, fencing, and outbox insertion. Model, compiler, constraint, and normal command work never spans a transaction; the maintenance sweeper deliberately holds one exclusive transaction across its reachability mark and filesystem deletes. |
| `fastify` v5 | Planned | Phase 4/integration API | Proposed host for an authenticated local/private HTTP API. It is not installed or implemented in this package. |
| `@fastify/type-provider-typebox` | Planned | Phase 4/integration API | Proposed connection between future route schemas and the runtime's TypeBox contracts. It is not installed. |
| `pino` | Planned | Integration observability | Proposed structured local logging under a deployment redaction policy. It is not installed or used by the Phase 1-3 core. |
| `jose` | Planned optional | Integration authentication | Proposed JWT/OIDC verification for private-network deployments. Authentication remains outside this package. |
| `@opentelemetry/api` | Planned optional | Integration observability | Proposed trace/metric API for deployments that enable telemetry. It is not installed. |
| `@opentelemetry/sdk-node` | Planned optional | Integration observability | Proposed telemetry SDK for configured deployments. It is not installed. |
| `@opentelemetry/exporter-trace-otlp-http` | Planned optional | Integration observability | Proposed authorized private trace exporter. It is not installed. |
| `@opentelemetry/exporter-metrics-otlp-http` | Planned optional | Integration observability | Proposed authorized private metrics exporter. It is not installed. |

The AI SDK provides an
[OpenAI-compatible provider](https://ai-sdk.dev/providers/openai-compatible-providers),
and its current structured-output API validates objects through
[`Output.object()`](https://ai-sdk.dev/docs/reference/ai-sdk-core/output).
The planned Fastify integration would use
[`@fastify/type-provider-typebox`](https://fastify.dev/docs/latest/Reference/Type-Providers/).
XState's [graph documentation](https://stately.ai/docs/graph) specifies the
`xstate/graph` import and marks the standalone `@xstate/graph` package as
deprecated.

`better-sqlite3` is selected for production because it exposes explicit, short
transaction functions and supports worker threads. The repository layer hides
the driver, and the built-in
[`node:sqlite`](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)
implementation is used only as a test conformance driver, so a later production
driver change does not alter protocol or domain contracts.

### 3.2 External components

| Component | Status | Purpose and boundary |
| --- | --- | --- |
| OpenAI-compatible model endpoint, such as `llama-server` from `llama.cpp` | External component | Serves schema-constrained structured output. Endpoint supervision remains outside the authoritative session transaction. |
| Deployment-selected model artifact, such as a Qwen GGUF model | External component | Model identity, path, quantization, context size, and role assignment come only from server configuration; the runtime does not hardcode Qwen. |
| SQLite database file | External component | Durable event, projection, idempotency, lease, fencing, and outbox store owned by one runtime deployment. |
| Content-addressed blob directory | External component | Stores captured manifests and source bytes, model input/output evidence, phase results, diagnostics, static results, change manifests, approval envelopes, and generated files before events reference them. |
| Immutable workspace snapshot | External component | Read-only captured project view used by target, TypeScript, and optional constraint analysis. |

As one supported deployment choice, `llama-server` provides an OpenAI-compatible API and schema-constrained
`response_format`; see the
[`llama.cpp` server documentation](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md).
No generated artifact is sent back to `llama-server` for execution.

### 3.3 Node.js built-ins and web-platform globals

| Module or global | Status | Use |
| --- | --- | --- |
| `node:crypto` | Selected | SHA-256 identities, content hashes, secure random bytes, and `randomUUID()`. |
| `node:fs` and `node:fs/promises` | Selected | Descriptor-rooted workspace capture, exact-byte blob persistence, and generated workflow artifacts. The current runtime does not perform live-target application or journal recovery. |
| `node:path` and `node:url` | Selected | Workspace-relative POSIX normalization, containment, file identity, and module-relative resource resolution. |
| `node:worker_threads` | Selected | Cancellable compiler, constraint, and other CPU/memory-isolated workers. Workers never execute generated code. |
| `node:sqlite` | Development-only | Supplies the repository conformance driver used by tests when the production native binding is unavailable. |
| `node:stream` | Planned | Proposed bounded streaming for a future HTTP integration; it is not imported by the current runtime. |
| `node:events`, `node:os`, `node:timers/promises` | Not used | The current source does not import these modules. Dispatcher timing uses an injected scheduler backed by global timers. |
| `AbortController`, `URL`, `TextEncoder`, `TextDecoder` | Selected | Cancellation, worker-module resolution, canonical byte conversion, and strict UTF-8 decoding. The AI SDK owns its configured provider transport. |
| `fetch` | Planned | Reserved for future HTTP or telemetry integrations; the current runtime does not call it directly. |
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
| `@vitest/coverage-v8` | Planned | Optional future engineering coverage reporting; it is not installed and is not part of candidate acceptance. |
| `@mermaid-js/mermaid-cli` | Planned | Optional future diagram rendering validation; it is not installed. Current workflow Mermaid text is generated and drift-checked by the repository generator. |

The `synthesize-regions` package itself owns `ts-morph`, `type-fest`, TypeBox,
Ajv, `ts-pattern`, and TypeScript where its implementation imports them. The
agent runtime must declare a dependency directly only when its own source imports
that package; it must not rely on transitive dependencies.

## 4. Internal Runtime Module Map

These are internal ownership boundaries, not additional npm packages.

| Module | Status | Depends on | Responsibility |
| --- | --- | --- | --- |
| Configuration and policy | Current | TypeBox, Ajv, Node platform | Captures fixed static/model policies, security options, prompt versions, disclosure limits, model profiles, and role bounds. Requests cannot supply implementations. Authentication, retention, and telemetry policy remain integration concerns. |
| HTTP API and authentication | Planned | Fastify, TypeBox provider, optional `jose` | A future integration authenticates callers, validates transport contracts, and submits caller commands. No HTTP routes or authentication adapter are implemented here. |
| Protocol schemas | Current | TypeBox, Ajv | Owns Phase 1-3 commands, events, sessions, staging envelopes, rejection results, work bindings, and model-facing projections. It exposes no Phase 4 approval/application commands or HTTP routes. |
| Workflow definition/compiler | Current | TypeBox, `xstate` | Validates one declarative topology and generates unions, transition indexes, schemas, XState projection, diagrams, and fixtures. |
| Command decider | Current | `ts-pattern`, protocol types | Pure `decide(state, command)` authorization and domain-event proposal. Performs no I/O. |
| Event reducer | Current | `ts-pattern`, protocol types | Pure `evolve(state, event)` reconstruction checked against the generated transition target. |
| SQLite repository | Current | `better-sqlite3` | Atomically appends events, reduces materialized state, applies revision CAS, and inserts outbox work. |
| Blob store | Current | Node crypto/files | Writes and verifies content-addressed blobs before an event may reference them. |
| Outbox dispatcher | Current | SQLite repository, scheduler seam | Validates and snapshots bounded timing options, transactionally reconciles and claims bound work with its session lease, durably records provider starts and canonical responses, renews fencing, enforces hard timeouts, and dispatches post-commit handlers. |
| Model gateway | Current | `ai`, OpenAI-compatible provider | Executes one role-specific structured invocation with cancellation and usage accounting. |
| Catalog capture/disclosure | Current | `synthesize-regions` | Loads manifest data, captures exact `c7_`/`t4_`/`m4_` identities, derives state-specific generic schemas, and reveals complete bounded source-free disclosures or package-owned conservative capability closures. |
| Role handlers | Current | Model gateway, protocol schemas | Implements Artifact-Set Planner, Graph Planner, Graph Repairer, Input Synthesizer, and Artifact-Set Repairer requests. Graph Repairer receives exact generic parameter authority; Input Synthesizer proposes exact graph inputs or unhashed fill values and infrastructure prepares authoritative fills. |
| Workspace capture | Current | Node files/crypto, blob store | On Linux, traverses from held directory descriptors through `/proc/self/fd` with no-follow opens and pre/post identity checks; records but never follows symlinks, requires every policy-required path to be a regular file, stores exact bytes, and derives full and analysis-root snapshot identities. Unsupported platforms fail closed. |
| Synthesis/static workers | Current | `synthesize-regions`, `workspace-constraints`, worker threads | Execute schema-closed compilation, fill preparation, constraint evaluation, assembly, semantic validation, and finalization tasks over reconstructed immutable context. |
| Workspace Constraint capture adapter | Current | `workspace-constraints` | Captures `.wsc` data, validates the immutable module closure and expected digest, and binds protected module/analysis identities. It cannot add workflow topology. |
| Diagnostic router | Current | `ts-pattern`, package-owned classifications, provenance contracts | Routes known structured failures to exact input, graph, or set repair and fails closed on unknown or indeterminate evidence. |
| Budget/progress manager | Current | Protocol types, crypto | Charges resources and fingerprints candidate/diagnostic state for deterministic no-progress termination. |
| Staging envelope protocol | Current | Blob store, protocol core | Stores generated files, the change manifest, static result, and approval envelope as separate blobs and retains a pointer-only staging receipt. The Phase 1-3 protocol terminates at `readyForApproval`; approval is not a runtime-core command. |
| Application coordinator | Planned Phase 4 | Node files/path/crypto | Will revalidate live authority and apply only exact approved bytes through a recoverable journal. No application handler or journal implementation is included in the Phase 1-3 core. |
| Observability/redaction integration | Planned | Pino, optional OpenTelemetry | A future integration may emit bounded redacted logs, traces, and metrics. These dependencies and exporters are not installed. |

Dependency direction is inward toward pure contracts and domain functions.
Persistence, HTTP, model, compiler, and filesystem adapters cannot be imported by
the command decider or reducer.

## 5. Current `synthesize-regions` Catalog Surface

All current symbols in the following sections are exported from the package
root unless a JSON subpath is shown.

### 5.1 Catalog types and schemas

| Symbols | Kind | Status | Consumer | Purpose | Approval/security significance |
| --- | --- | --- | --- | --- | --- |
| `GraphTemplateManifest`, `TemplateTypeParameterDefinition` | Types | Current | Catalog capture | Data-only template definition, including optional named generic parameters and concrete constraints. | Prevents runtime loading of author callbacks or imported catalog code. |
| `GraphTemplateDefinition` | Type | Current | Catalog adapter | Library-produced normalized/compiled template representation; it is never accepted from a request. | Runtime never accepts caller-constructed executable definitions. |
| `TemplateSummary`, `InputPortSummary`, `LiteralInputPortSummary`, `FragmentInputPortSummary`, `FragmentCollectionInputPortSummary`, `RawCodeInputPortSummary`, `UnionInputPortSummary`, `OutputPortSummary` | Types | Current | Catalog disclosure/model schema projection | Implementation-free planner contracts, including generic declarations and placeholder-bearing type descriptors. | Capture requires the complete disclosure to fit fixed limits; each graph/repair role receives only its authorized producer closure. |
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
| `SYNTHESIZE_REGIONS_PACKAGE_VERSION`, catalog/template/manifest/planner/closure version and pattern constants, and digest TypeBox schemas | Constants/schemas | Current | Identity/versioning | Pin package `0.4.0`, `c7_`, `t4_`, `m4_`, planner schema `4`, and capability closure `3`. | Runtime startup and capture reject unsupported linked contracts rather than accepting future prefixes. |
| `deriveTemplateCapabilityClosure()`, `TemplateCapabilityClosureRoot` | API/type | Current | Graph Planner/Graph Repairer disclosure | Derives stable source-free goal or graph producer closure with exact bound consumers and conservative generic candidates. | Unknown graph templates disclose only the complete already-authorized catalog; no model-controlled expansion occurs. |
| `templateRegistryToSynthesisGraphJsonSchema()` | API | Current | Graph Planner schema projection | Produces a strict catalog-specific graph JSON Schema. | Constrained model output is still canonically revalidated. |
| `templateRegistryToPartialSynthesisGraphJsonSchema()` | API | Current | Graph Planner schema projection | Produces a partial graph JSON Schema. | Allows bounded missing inputs without accepting an invalid final graph. |
| `graphTemplateDefinitionToNodeSchema()`, `graphTemplateDefinitionToJsonSchema()` | APIs | Current | State-specific schema projection | Narrows a selected template/node contract. | Model chooses values only inside the current authorized shape. |
| `captureTemplateCatalogView()` | API | Current | Catalog capture | Captures the trusted immutable catalog view used by phase compilation. | Runtime compilation remains bound to the exact catalog identities. |

`defineTemplate()`, `defineTemplateCatalog()`, `createTemplateRegistry()` from
executable definitions, `validateTemplateCatalog()`, and
`assertTemplateCatalogValid()` remain authoring/library tools. The runtime uses
the manifest-only registry path.

## 6. Current Graph, Artifact, and Provenance Surface

### 6.1 Graph types

| Symbols | Kind | Status | Consumer | Purpose | Approval/security significance |
| --- | --- | --- | --- | --- | --- |
| `RegionKind`, `TypedSyntaxRegionKind`, `REGION_KIND_VALUES`, `REGION_SYNTAX_ENGINE_VERSION` | Types/constants | Current | Protocol/catalog/target validation | Closed source-fragment kind vocabulary and engine identity. | Target and output kinds must match exactly. |
| `SynthesisGraph`, `SynthesisNode`, `SynthesisInput`, `NormalizedSynthesisInput`, `GraphNormalizationResult` | Types | Current | Graph planning/compilation | Canonical graph protocol and normalization result; generic nodes carry a complete explicit `typeArguments` map. | Graph references and generic bindings remain artifact-scoped and validated before commitment. |
| `SynthesisGoal` | Type | Current | Set/graph planning | Declares required output kind/type goal. | Model goals cannot override target authorization. |
| `GraphPatchAction`, `GraphPatchActionKind`, `GraphPatchResult` | Types | Current | Graph Repairer/Input Synthesizer | One scoped immutable graph mutation, including exact `setTypeArgument`/`removeTypeArgument`, and result. | Dynamic role schemas bind generic repair to one current node and structured parameter owner; rejected patches preserve accepted state. |
| `GraphCompilationMode`, `GraphCompilationResult`, `GraphPartialCompilationResult`, `GraphCompileOptions` | Types | Current | Synthesis adapter/router | Strict/partial compilation result and fixed options. | Classification and provenance drive deterministic routing. |
| `SynthesisDiagnostic`, `SynthesisRepairHint`, `SynthesisFailureClassification` | Types | Current | Diagnostic router | Structured compiler/policy diagnostics, including `typeParameterName`, and closed repair classification. | Candidate generic failures are graph-repairable; catalog/type-policy failures remain terminal or template-policy failures without message parsing. |
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
| `GeneratedFragment`, `CompleteTemplateArtifact`, `PartialTemplateArtifact`, `TemplateArtifact`, `TemplateArtifactResult` | Types | Current | Compiler/fill/static adapter | Generated source and complete/partial artifact results; provenance records concrete generic type arguments. | Generated source remains untrusted data and exact bindings participate in artifact/CAS identity. |
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

## 10. Phase 3 Companion Surfaces

These schema-backed, package-tested contracts are the public boundaries used by
the runtime's Phase 3 handlers.

### 10.1 Workspace Constraint surface

| Symbol or artifact | Kind | Status | Required use and boundary |
| --- | --- | --- | --- |
| `ParsedConstraintModule`, `ConstraintRuleCapture`, `ConstraintModuleCapture`, `CompiledWorkspaceConstraintCapture` | Types | Current (`workspace-constraints`) | Canonical JSON-safe capture closure without evaluator or executable callbacks. |
| `ConstraintCaptureBudgets`, runtime `WorkspaceConstraintIdentity` | Types | Current | Semantic/source/engine/analysis identity and bounded capture. |
| `WorkspaceConstraintDiagnostic`, `WorkspaceConstraintPhaseResult`, `WorkspaceConstraintSummary` | Types | Current (`workspace-constraints`) | Deterministic phase results, model disclosure, and repair routing. |
| `WorkspaceConstraintFactSummary`, `WorkspaceConstraintEvaluationInput` | Types | Current (`workspace-constraints`) | Library-owned bounded facts derived from authorized immutable views; no custom fact-provider callback. |
| `parseWorkspaceConstraintModule()` | API | Current (`workspace-constraints`) | Parses one `.wsc` byte string as data and returns source diagnostics. Performs no filesystem or module execution. |
| `compileWorkspaceConstraintCapture()` | API | Current (`workspace-constraints`) | Resolves an entry from a caller-supplied immutable module-byte map, validates containment/cycles/identities/budgets, and returns dual identities and summaries. |
| `evaluateWorkspaceConstraintPhase()` | API | Current (`workspace-constraints`) | Evaluates exactly one fixed phase against library-owned facts and immutable inputs. |
| Capture input/result, parsed module, rule/module capture, summary, diagnostic, and compiled-capture schemas | TypeBox schemas | Current (`workspace-constraints`) | Canonical capture validation with unknown-field rejection. |
| `WorkspaceConstraintSet`, `ConstraintSourceMap`, typed expression IR, evaluator diagnostics/results, and phase-result schemas | Types/schemas | Current (`workspace-constraints`) | Phase 3 evaluation contracts with normalized semantic and exact-source identity. |
| `workspace-constraint-set.schema.json`, `workspace-constraint-summary.schema.json`, `workspace-constraint-diagnostic.schema.json`, `workspace-constraint-evaluation-input.schema.json`, `workspace-constraint-phase-result.schema.json` | JSON-schema subpaths | Current (`workspace-constraints`) | Published interchange contracts. |

The APIs accept source bytes, normalized workspace/artifact views, and fixed
options—not executable validators, compiler plugins, arbitrary AST callbacks,
or caller-registered fact providers.

### 10.2 Phase-granular artifact-set surface

| Symbol | Kind | Status | Required use and boundary |
| --- | --- | --- | --- |
| `compileArtifactSetGraphs()` and `ArtifactSetGraphCompilationResult` | API/type | Current | Produce per-artifact complete/partial graph artifacts without target assembly or semantic acceptance, enabling artifact/provenance constraints at the correct phase. |
| `ArtifactSetAssemblyResultSchema` | TypeBox schema | Current | Validates syntax-only assembly results crossing worker and persistence boundaries. |
| `validateArtifactSetSemantics()` and `ArtifactSetSemanticValidationResult` | API/type | Current | Compare baseline and candidate TypeScript programs after syntax assembly and assembled constraints. Returns `validation: "semantic"`, never approval eligibility. |
| `ConstraintBoundStaticAcceptance` | Type | Current | Binds engine-4 evaluator/toolchain identity plus every required phase task hash and result-blob hash into library static acceptance. |
| `finalizeArtifactSetStatic()` | API | Current | Authoritatively revalidates the plan/ledger and phase-bound evidence before producing constraint-aware library `validation: "static"`. |
| `ArtifactSetGraphCompilationResultSchema`, `ArtifactSetAssemblyResultSchema`, `ArtifactSetSemanticValidationResultSchema`, `ConstraintBoundStaticAcceptanceSchema` | TypeBox schemas | Current | Worker-result and constraint-acceptance validation for phase boundaries. |
| `artifact-set-graph-compilation-result.schema.json`, `artifact-set-assembly-result.schema.json`, `artifact-set-semantic-validation-result.schema.json`, `constraint-bound-static-acceptance.schema.json` | JSON-schema subpaths | Current | Published phase-result and acceptance-evidence interchange. |
| Public `deepestGeneratedSourceSpan()` | API export | Current | Supplies deepest generated-source attribution to the runtime and constraint evaluator. |
| Public `captureTemplateCatalogView()` | API export | Current | Captures an immutable trusted catalog view. |

`compileArtifactSet()` and `validateArtifactSetStatic()` remain compatibility
facades over the phase-granular surfaces. Intermediate graph, syntax, and
semantic results are non-approval-eligible; only authoritative finalization
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

| Contract family | Status | Representative contracts | Owner |
| --- | --- | --- | --- |
| Request/authorization | Current | `SynthesisRequest`, `WorkspaceConstraintRequest`, authorized target and analysis-root capture | Runtime protocol |
| Workflow | Current | `WorkflowDefinition`, `WorkflowTransition`, generated `SessionStatus`, transition/observation indexes | Workflow compiler |
| State protocol | Current | `ProtocolCommand`, `DomainEvent`, `Decision`, `SynthesisSession`, terminal session outcomes | Command/event core |
| Persistence | Current | `EventEnvelope`, materialized-state record, idempotency record, lease/fencing record, `OutboxWorkItem` | SQLite repository |
| Model roles | Current | Version-3 artifact-set, graph, graph-repair, input, and set-repair input/output envelopes; prompt set `3`; rejection history | Role handlers/model gateway |
| Fill preparation | Current | `InputSynthesizerProposal`, `PreparedArtifactFillResult`, `prepareFill` static-worker task and CAS evidence | Role handlers/static worker/protocol |
| Static workers | Current | Version-4 `RuntimeStaticWorkerTask`, `RuntimeStaticWorkerOutput`, captured synthesis context, per-operation limits | Runtime worker boundary |
| Set repair | Current | `ArtifactSetPatchAction`, `ArtifactOutline`, `AuthorizedArtifactTarget` | Runtime protocol |
| Constraint orchestration | Current | Phase commands/events, skip reasons, evaluation work item | Runtime protocol/outbox |
| Static staging and approval binding | Current | `StagingReceipt`, version-4 `RuntimeApprovalEnvelope`, finalization task/result identities | Static pipeline/protocol core |
| Filesystem application | Planned Phase 4 | Live-target preflight, application journal, recovery result, and application handler | Future application coordinator |
| HTTP/authentication | Planned integration | Endpoint request/response/error schemas and caller authentication | Future API adapter |
| Budgets/progress | Current | `SynthesisBudgets`, counters, rejection history, and progress fingerprints | Runtime policy/domain core |
| Logs, metrics, and traces | Planned integration | Redaction policy, structured logs, trace spans, and metric records | Future observability adapter |

Runtime schemas may reference public library schemas, but `synthesize-regions` never
owns caller authentication, session transitions, database state, approval, or
filesystem mutation.

## 12. Explicitly Excluded Surfaces

| Surface | Status | Reason |
| --- | --- | --- |
| `GraphRunner`, `GraphRunnerState`, `GraphRunnerAction`, `createGraphRunner()` and runner schemas/patterns | Not used | The authoritative runtime uses its generated workflow, pure command decider, pure reducer, event store, and outbox. |
| `defineTemplate()` and executable template definitions supplied by a session | Not used at runtime | Runtime catalogs are manifest data compiled by library-owned code. |
| `synthesize-regions/builders` | Not used by runtime | Builders are template-author engineering helpers, not model/runtime authority. |
| Direct `generate()`, replacement maps, marker discovery, or file-template APIs | Not used by runtime | Graph/artifact-set facades are the controlled synthesis boundary. |
| Direct `ts-morph` imports in the runtime | Not used | AST/compiler objects stay behind `synthesize-regions` and library-owned fact APIs. |
| `node:vm`, dynamic `import()` of repository code, compiler plugins, custom validators | Not used | Generated and repository-authored policy data is never executed. |
| AI SDK agent/tool loop APIs | Not used | Every model call returns one role-specific structured result. |
| XState actors/actions as production state | Not used | XState is a generated visualization and test projection only. |

## 13. Version and Change Policy

The unreleased closeout contract set is workflow `8`, protocol/reducer `7`,
database schema `9`, captured synthesis context/static tasks `5`, model-role
contracts `4`, prompt set `5`, approval envelope `4`, and Workspace Constraint evaluator engine
`4` (compiled evaluation evidence schema `3`, normalized IR/source map `2`, parser/source-language contract `1`).
The linked synthesis contract is `synthesize-regions` `0.4.0`, catalog contract
`7`, template/catalog manifests `4`, planner schema `4`, and capability closure
`3`. Development databases or evidence produced by prior or incomplete
variants are rejected and recreated rather than migrated or upcast.

- Pin exact dependency versions in the implementation lockfile. This document
  records current architectural majors where behavior depends on them: Node 24
  and XState 5. Fastify 5 remains a planned integration choice and is not part
  of the current lockfile.
- Record `synthesize-regions` contract, manifest, syntax, compatibility, schema,
  static-policy, constraint-engine, and workflow versions in their respective
  digests or acceptance identities.
- Adding a direct dependency, consuming an unlisted package export, or moving a
  contract between runtime and library ownership requires updating this
  inventory and the relevant technical design.
- Package upgrades that affect canonicalization, schemas, source production,
  static analysis, workflow topology, or approval identity require explicit
  compatibility tests and version/digest changes.
- Planned telemetry and authentication packages must remain outside the
  critical synthesis decision path if those integrations are added.

## 14. Executable Phase 1–3 Invariants

This table is generated from `invariants/phase-1-3.json` and checked by
`npm run invariants:check`.

<!-- phase-1-3-invariants:start -->
| Invariant | Claim | Owner boundary | Contract | Adversarial tests |
| --- | --- | --- | --- | --- |
| `RT-OUTBOX-001` | Expired non-idempotent external work is never blindly reissued after its external invocation may have started. | transactional outbox/session claim and recovery | `database-9/protocol-6` | `RT-OUTBOX-001-T1`, `RT-OUTBOX-001-T2` |
| `RT-OUTBOX-002` | Pre-start failures remain retryable, while every canonical response captured after provider return is retained, locally replayed without reissuing the invocation, and charged by the accepted outcome. | dispatcher invocation marker and claim reconciliation | `database-9/protocol-6` | `RT-OUTBOX-002-T1`, `RT-OUTBOX-002-T2`, `RT-OUTBOX-002-T3` |
| `RT-OUTBOX-003` | A rejected worker result either terminalizes or abandons stale work without consuming the terminal fallback idempotency identity. | repository claimed-work completion transaction | `database-9/protocol-6` | `RT-OUTBOX-003-T1` |
| `RT-IDENTITY-001` | Accepted work and approval evidence bind the exact captured policy and static toolchain bytes, not human-readable labels alone. | session capture, work binding, static evidence, and approval envelope | `policy-2/context-4/envelope-4` | `RT-IDENTITY-001-T1`, `RT-IDENTITY-001-T2`, `RT-IDENTITY-001-T3` |
| `RT-CAPTURE-001` | Production workspace capture consumes a deployment-owned immutable snapshot and never follows filesystem symlinks. | immutable snapshot provider and descriptor-rooted capture | `workspace-manifest-2` | `RT-CAPTURE-001-T1`, `RT-CAPTURE-001-T2`, `RT-CAPTURE-001-T3` |
| `RT-OUTBOX-004` | Dispatcher lease, heartbeat, timeout, and retry timing options are finite bounded integers captured immutably at construction. | dispatcher option validation and immutable construction snapshot | `database-9/protocol-6` | `RT-OUTBOX-004-T1` |
| `RT-CONTRACT-001` | Runtime consumes sibling-owned diagnostics and classifications without a hand-maintained approximation. | protocol schema composition and diagnostic routing | `protocol-6` | `RT-CONTRACT-001-T1`, `RT-CONTRACT-001-T2`, `RT-CONTRACT-001-T3` |
| `RT-RESOURCE-001` | Accepted session evidence cannot exceed cumulative CAS quotas and unreferenced blobs are swept only after leases and grace periods expire. | blob inventory, write scopes, repository reachability, and sweeper | `database-9/policy-2` | `RT-RESOURCE-001-T1`, `RT-RESOURCE-001-T2`, `RT-RESOURCE-001-T3`, `RT-RESOURCE-001-T4` |
| `RT-WORKER-001` | Production one-shot workers use one captured deployment-wide admission policy and operation limits cannot exceed its heap or transfer ceilings. | captured context loader and static handler composition | `policy-2/static-task-4` | `RT-WORKER-001-T1`, `RT-WORKER-001-T2` |
| `RT-STATIC-001` | Every accepted static result binds the exact closed worker input: the parent validates the task/output boundary and the pure decider independently rehashes its authority-bearing input. | static pipeline parent and pure command decider | `static-task-4/protocol-6` | `RT-STATIC-001-T1` |
| `RT-WORKFLOW-001` | The Phase 1-3 workflow terminates at approval-ready staging and exposes no filesystem-application work. | workflow, protocol, decider, and outbox work-kind registry | `workflow-7/protocol-6` | `RT-WORKFLOW-001-T1` |
<!-- phase-1-3-invariants:end -->
