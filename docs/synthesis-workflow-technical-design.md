# Technical Design: Static Synthesize Regions Agent Runtime

**Status:** Draft  
**Version:** 0.3  
**Primary language:** TypeScript  
**Deployment:** Local-first or private-network  
**Core dependencies:** `synthesize-regions`, Vercel AI SDK, `llama.cpp`, Qwen

## 1. Purpose

This document defines a general-purpose agentic runtime that synthesizes
statically validated TypeScript artifact sets through `synthesize-regions`.

Models act as constrained planners. They propose artifact plans, synthesis
graphs, graph patches, and template inputs. The runtime validates, persists,
stages, and optionally applies those decisions.

The runtime never executes generated code, runs project commands, invokes
linters, generates tests, installs dependencies, or loads caller-provided
validators or template modules.

## 2. Goals

The runtime shall:

1. Produce one or more TypeScript artifacts from a natural-language objective.
2. Restrict structural generation to a captured declarative template catalog.
3. Restrict arbitrary TypeScript to explicit raw-code ports.
4. Use schema-constrained local model calls with canonical post-validation.
5. Preserve graph repair and artifact filling as distinct transactional actions.
6. Validate the complete artifact set in an immutable TypeScript project view.
7. Stage a deterministic, content-addressed change set.
8. Require explicit approval before modifying authorized project files.
9. Persist enough state for replay, recovery, audit, and stale-action rejection.
10. Terminate predictably on policy, catalog, identity, resource, or no-progress
    failures.

## 3. Non-Goals

The runtime will not:

- execute, import, or evaluate generated artifacts;
- run test, build, lint, package-manager, or shell commands;
- write tests or use tests as synthesis feedback;
- load arbitrary/custom validators;
- install dependencies;
- let models register or modify templates;
- import catalog JavaScript supplied by a session;
- permit unrestricted filesystem edits;
- support deletion or rename in the initial application protocol;
- claim static acceptance proves runtime behavior or business correctness;
- expose an open-ended model-controlled tool loop.

Repository tests for the runtime and library remain normal engineering work and
are unrelated to candidate synthesis.

## 4. Design Invariants

### 4.1 Candidate authority

The authoritative candidate is an artifact-set plan plus accepted fill ledger,
not generated source and not one graph alone.

```ts
interface ArtifactSetCandidate {
  plan: ArtifactSetPlan;
  graphRevisions: Record<string, number>;
  fillLedger: ArtifactFillLedgerEntry[];

  contractDigest: string;
  manifestDigest: string;
  workspaceSnapshotId: string;

  stagedChangeSetHash?: string;
}
```

Generated artifacts and change sets are derived values. Any accepted graph,
fill, target, catalog, policy, or workspace change invalidates downstream staged
state and approval.

### 4.2 Models propose; infrastructure commits

A model result has no direct effect. Before commitment it passes:

1. JSON parsing;
2. model-facing schema validation;
3. canonical protocol validation;
4. current-state authorization;
5. catalog-specific validation;
6. transactional graph or fill validation;
7. resource-budget checks.

### 4.3 Templates are data

Runtime catalogs contain normalized `GraphTemplateManifest` data. Author
callbacks, getters, custom invocation functions, and dynamically imported
catalog modules are unsupported. Only library-owned code compiles and invokes
manifests.

### 4.4 Static acceptance is not behavioral proof

The acceptance pipeline proves only the configured structural, source-policy,
syntax, target, and TypeScript semantic properties. Generated code remains
untrusted data and is never executed by this runtime.

### 4.5 Fail closed

Unknown identity, stale workspace state, indeterminate compatibility, invalid
persisted data, incomplete mandatory analysis, or resource exhaustion never
counts as success.

## 5. Terminology

**Template manifest:** JSON-safe template metadata, ports, output, and marked
source.

**Contract digest:** identity of planner-facing catalog contracts.

**Manifest digest:** identity of exact normalized template manifests and engine
contracts.

**Artifact unit:** one synthesis graph, one final artifact, and one target.

**Artifact-set plan:** ordered collection of artifact units.

**Fill ledger:** accepted fills bound to graph and artifact hashes.

**Workspace snapshot:** immutable project view used for target and semantic
validation.

**Static change set:** fully assembled file creations and range replacements
that passed all static gates.

**Approval:** authorization for one exact session revision and change-set hash.

## 6. High-Level Architecture

```text
Client / editor
      |
      v
Agent runtime ---------------------------------------------------+
| session state machine     schema and authorization bridge      |
| budget manager            deterministic diagnostic router      |
| approval coordinator      event/materialized-state manager     |
+-------------+----------------------+----------------------------+
              |                      |
              v                      v
      Model gateway          Synthesis/static engine
      Vercel AI SDK          synthesize-regions
      llama.cpp/Qwen         manifest catalogs
      structured JSON        graph + artifact-set compilation
                             virtual project validation
                                      |
                                      v
                             Staged change-set store
                                      |
                              explicit approval
                                      |
                                      v
                         Recoverable application coordinator
```

The application coordinator belongs to the runtime. `synthesize-regions`
provides only pure compilation, assembly, and static-analysis primitives and
never writes project files.

The shared reader-facing workflow, including model proposal boundaries, repair
loops, static acceptance, approval, and recoverable application, is shown in
[End-to-End Synthesis Flow](./synthesis-workflow-product-description.md#end-to-end-synthesis-flow).

## 7. Declarative Catalogs

### 7.1 Manifest contract

```ts
interface GraphTemplateManifest<
  I extends Record<string, InputPort> = Record<string, InputPort>,
  M extends string = string,
  O extends OutputPort = OutputPort
> {
  modelId: M;
  version?: string;
  description?: string;
  inputs: I;
  output: O;
  source: string;
}
```

Manifest source uses ordinary `@TYPE`/`@END` markers. Registration requires one
marker for every declared input, no unknown or duplicate marker IDs, exact
marker/port kind agreement, valid fallback bodies, and valid output-context
syntax.

`sourceFile` is the complete-file output kind. It is parsed in file context,
cannot carry value-level type/schema metadata, and cannot be supplied through a
literal or raw-code port.

### 7.2 Catalog capture

```ts
interface CapturedCatalog {
  snapshot: TemplateRegistrySnapshot;
  contractDigest: string; // c4_...
  manifestDigest: string; // m1_...
  summaries: readonly TemplateSummary[];
  capabilityIndex: readonly TemplateCapabilityEntry[];
  strictGraphSchema: JsonSchema;
  partialGraphSchema: JsonSchema;
}
```

The contract digest excludes implementation source and supports planner
compatibility. The manifest digest includes exact LF-normalized marked source,
normalized contracts, per-template `t1_` digests, and engine versions.

Catalog snapshots deep-copy and freeze normalized data. Compilation and filling
require both expected digests. Artifact provenance records the producing
template's content digest.

### 7.3 Catalog disclosure

Large catalogs are not copied wholesale into prompts. The planner receives a
compact capability index, selects candidate IDs, and then receives complete
summaries for a bounded session-visible subset. The subset may expand through
additional direct structured calls. Catalog-gap failure requires exhaustion of
the configured retrieval budget.

## 8. Request and Authorization Model

```ts
interface SynthesisRequest {
  requestId: string;
  objective: string;

  workspace: {
    snapshotId: string;
    rootPath: string;
    revision: string;
    tsConfigFilePath: string;
  };

  replacementTargets: Array<{
    targetId: string;
    path: string;
    start: number;
    end: number;
    regionKind: RegionKind;
    baseFileHash: string;
  }>;

  allowedCreateRoots: string[];

  expectedCatalogDigest: string;
  expectedCatalogManifestDigest: string;
  staticPolicyId: string;
  modelPolicyId: string;
  budgets: SynthesisBudgets;
}
```

Paths are normalized workspace-relative POSIX paths. Replacement offsets are
zero-based UTF-16 offsets, matching TypeScript and JavaScript string positions.

Existing files can be read only through exact replacement targets captured by
the request. A model may propose new paths only within `allowedCreateRoots`; a
proposed create path never grants access to an existing file.

Static and model policies are server-defined IDs. Requests cannot supply code,
commands, plugins, validator implementations, or arbitrary model paths.

## 9. Artifact-Set Model

```ts
type ArtifactTarget =
  | { kind: "createFile"; path: string }
  | {
      kind: "replaceRange";
      path: string;
      start: number;
      end: number;
      baseFileHash: string;
      regionKind: RegionKind;
    };

interface ArtifactSetUnit {
  id: string;
  graph: SynthesisGraph;
  target: ArtifactTarget;
}

interface ArtifactSetPlan {
  artifacts: ArtifactSetUnit[];
}

interface ArtifactFillLedgerEntry {
  artifactId: string;
  graphHash: string;
  baseArtifactHash: string;
  inputs: TemplateArtifactInputMap;
  resultingArtifactHash: string;
}
```

Artifact IDs are globally unique within a plan. Graph node IDs remain scoped to
their artifact. Graph references never cross artifacts.

New-file targets require `sourceFile` output. Replacement output must exactly
match the target region kind.

Several range replacements may target one existing file when they share the
same base hash and do not overlap. Assembly applies them from highest offset to
lowest. A create path admits exactly one create operation and no other operation.

## 10. Library Artifact-Set APIs

```ts
function compileArtifactSet(
  plan: ArtifactSetPlan,
  catalog: TemplateCatalogView,
  options: ArtifactSetCompileOptions
): ArtifactSetCompilationResult;

function validateArtifactSetStatic(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView,
	options: ArtifactSetCompileOptions
): StaticArtifactSetResult;
```

`compileArtifactSet()` preserves artifact order, compiles each graph in strict or
partial mode, validates fill-ledger hashes, and scopes diagnostics with artifact
identity. It does not hide per-graph results.

Complete `compileArtifactSet()` results already pass mandatory semantics.
`validateArtifactSetStatic()` is the explicit final-gate facade: it accepts the
authoritative plan and fill ledger, recompiles them against the captured
catalog, and never accepts detached caller-constructed artifacts. Its pipeline:

1. validates path and target invariants;
2. verifies base hashes and ranges against the snapshot;
3. assembles changed files in memory;
4. creates a virtual TypeScript project overlay;
5. records baseline semantic diagnostics;
6. applies all candidate files to the overlay;
7. reports new semantic diagnostics with artifact/source provenance;
8. emits a canonical `ValidatedArtifactChangeSet` and SHA-256 hash.

The successful result is discriminated by `validation: "static"` and carries
the catalog contract digest, catalog manifest digest, workspace snapshot hash,
and static-policy version. The hash binds these identities. The lower-level
`assembleArtifactSetTargets()` result is discriminated by
`validation: "syntax"` and is never approval-eligible.

Neither API modifies the workspace.

## 11. Agent Roles

### 11.1 Artifact-Set Planner

Input:

- objective and target authorization;
- artifact and resource budgets;
- compact catalog capability index;
- contract digest;
- static-policy summary.

Output: one artifact-set outline selecting existing target IDs and proposing
normalized create paths and artifact goals.

### 11.2 Graph Planner

Input:

- one fixed artifact ID and target;
- objective scoped to that artifact;
- selected catalog summaries;
- contract digest;
- target region kind.

Output: one partial synthesis graph.

### 11.3 Graph Repairer

Input:

- fixed artifact ID;
- current graph;
- actionable diagnostics;
- relevant summaries and compatible producers;
- rejected actions and remaining budgets;
- currently authorized action kinds.

Output: exactly one scoped patch:

```ts
interface ScopedGraphPatch {
  artifactId: string;
  patch: GraphPatchAction;
}
```

### 11.4 Input Synthesizer

Input is limited to one graph or unresolved artifact input and its exact port
contract. Output is either:

```ts
interface ScopedSetInput {
  artifactId: string;
  action: {
    kind: "setInput";
    nodeId: string;
    inputName: string;
    input: SynthesisInput;
  };
}
```

or:

```ts
interface ScopedArtifactFill {
  artifactId: string;
  baseArtifactHash: string;
  action: {
    kind: "fill";
    inputs: TemplateArtifactInputMap;
  };
}
```

State-specific schemas fix artifact, node, input, and unresolved IDs wherever
possible. The model chooses only the permitted value or source string.

## 12. Deterministic Failure Routing

There is no classifier model.

| Failure | Route |
| --- | --- |
| Unknown template/reference/input, cycle, duplicate ID | Graph Repairer |
| Kind, source, type, schema, or goal incompatibility | Graph Repairer |
| Omitted graph input | Input Synthesizer via `setInput` or `fill` |
| Rejected raw/literal fill | Input Synthesizer |
| Semantic error mapped to one raw/literal input | Input Synthesizer |
| Semantic error mapped to graph composition | Graph Repairer |
| Cross-artifact semantic error | Set-level graph repair |
| Invalid manifest/catalog | Terminal catalog failure |
| Digest or workspace mismatch | Terminal/stale state |
| Invalid persisted artifact/source map/fill ledger | Terminal integrity failure |
| Unsupported catalog capability | Catalog-gap failure |
| Repeated state without progress | No-progress failure |

Source maps establish textual ownership. When diagnostics do not support exact
attribution, routing stays at artifact or set scope rather than guessing.

## 13. Fill-Ledger Rules

Every accepted fill records artifact ID, current graph hash, base artifact hash,
input map, and resulting artifact hash.

A fill is rejected when any binding differs from current state. Rejected fills
leave both the pending artifact and ledger unchanged.

Any graph patch or graph replacement invalidates all fills for that artifact.
Invalidation is explicit in the event log. Other artifacts' fills remain valid.

The runtime may choose graph patches for model-authored values and fills for
localized or delayed values, but both channels obey the same authorization and
identity checks.

## 14. Static Acceptance Pipeline

The fixed pipeline is:

```text
role-specific constrained output
          |
canonical schema validation
          |
session authorization and budgets
          |
catalog contract + manifest identity
          |
graph/artifact-set compilation
          |
syntax, integrity, raw-port and source policy
          |
target/base snapshot validation
          |
virtual multi-file assembly
          |
mandatory TypeScript semantic comparison
          |
canonical change-set hash
```

Semantic checking uses the captured `tsconfig` and immutable workspace snapshot.
The baseline is evaluated before candidate changes. Acceptance requires no new
semantic errors; unrelated pre-existing diagnostics are retained for context but
do not become synthesis failures.

Standalone source-file requests may use one versioned default TypeScript project.
All other requests require an explicit snapshot and `tsconfig`.

The pipeline never invokes project scripts, plugins, linters, test frameworks,
package managers, or generated source.

## 15. State Machine

This state machine is the detailed transition view of the shared
[End-to-End Synthesis Flow](./synthesis-workflow-product-description.md#end-to-end-synthesis-flow).

```text
created -> planningSet -> planningGraphs -> compiling
                                      compiling
                         +----------------+----------------+
                         |                |                |
                  needsGraphRepair  needsArtifactInputs  staticChecking
                         |                |                |
                         +---- accepted action ------------+
                                                          |
                                         +----------------+----------------+
                                         |                                 |
                                  needsStaticRepair                 readyForApproval
                                         |                                 |
                                         +----------> compiling             |
                                                                           |
                                                              approved -> applying
                                                                           |
                                                              applied -> completed
```

Every nonterminal state also accepts authorized cancellation and budget
exhaustion. Model/schema transport failure, stale targets, policy failure,
catalog gap, no progress, integrity failure, and unrecoverable application
failure have explicit transitions.

### Transition requirements

| Current state | Accepted event | Result |
| --- | --- | --- |
| `created` | valid request/catalog/workspace capture | `planningSet` |
| `planningSet` | authorized plan | `planningGraphs` |
| `planningGraphs` | all initial graphs accepted | `compiling` |
| `compiling` | graph diagnostics | `needsGraphRepair` |
| `compiling` | unresolved artifact inputs | `needsArtifactInputs` |
| `compiling` | complete artifact set | `staticChecking` |
| repair/input state | accepted patch/fill | `compiling` |
| `staticChecking` | attributable diagnostics | `needsStaticRepair` |
| `staticChecking` | all static gates pass | `readyForApproval` |
| `readyForApproval` | exact current approval | `applying` |
| `applying` | recovered successful transaction | `completed` |
| any actionable state | stale revision/hash | unchanged plus rejection event |
| any nonterminal state | cancellation | `cancelled` |
| any nonterminal state | exhausted budget | `budgetExhausted` |

Changing the candidate while `readyForApproval` clears staged state and returns
to `compiling`.

## 16. Session and Revision Model

```ts
interface SynthesisSession {
  id: string;
  requestId: string;
  status: SessionStatus;
  revision: number;

  contractDigest: string;
  manifestDigest: string;
  workspaceSnapshotId: string;

  candidate?: ArtifactSetCandidate;
  stagedChangeSetHash?: string;
  approvedChangeSetHash?: string;

  leaseOwner?: string;
  fencingToken: number;
  counters: SessionCounters;

  createdAt: string;
  updatedAt: string;
}
```

Each candidate revision is immutable. A graph patch, accepted fill, fill
invalidation, target change, or catalog/workspace recapture creates a new
revision.

Mutating APIs require:

- caller authorization;
- idempotency key;
- expected session revision;
- expected current artifact/change-set hash when applicable.

One worker holds a renewable session lease. Fencing tokens prevent an expired
worker from committing after ownership moves.

## 17. Event Store and Crash Consistency

```ts
interface EventEnvelope<TType extends string, TPayload> {
  eventId: string;
  sessionId: string;
  sequence: number;
  protocolVersion: string;
  reducerVersion: string;
  timestamp: string;
  causationId?: string;
  correlationId?: string;
  payload: TPayload;
}
```

Event families include:

- session, catalog, workspace, and policy capture;
- model invocation start/completion/rejection;
- artifact plan and graph proposal;
- patch proposal/acceptance/rejection;
- fill proposal/acceptance/rejection/invalidation;
- graph and artifact-set compilation;
- static-check start/completion;
- change-set staging/invalidation;
- approval acceptance/rejection;
- application start/file commit/rollback/recovery/completion;
- cancellation, budget, no-progress, and terminal failure.

Content-addressed blobs are fully written and integrity-checked before an event
references them. Event append and materialized-state compare-and-swap occur in
one SQLite transaction. `(sessionId, sequence)` and invocation IDs are unique.

Startup reconciliation marks abandoned external work, resumes idempotent work,
or emits an explicit interruption failure. Reducer upcasters migrate old event
payload versions without rewriting history.

## 18. Staging and Approval

A `ValidatedArtifactChangeSet` contains:

- workspace snapshot and revision;
- contract and manifest digests;
- ordered target descriptors;
- base file hashes;
- exact resulting file bytes;
- artifact and graph provenance;
- static diagnostics and policy version.

Its hash is computed from canonical JSON metadata plus exact file bytes.

Approval supplies:

```ts
interface ApproveChangeSetRequest {
  expectedSessionRevision: number;
  changeSetHash: string;
  idempotencyKey: string;
}
```

Approval never matches by “latest.” Any identity mismatch rejects the request
without changing state.

## 19. Recoverable Application

Application is owned by the runtime, not the model or library.

Before mutation, resolve and recheck every target against the live authorized
root. Reject absolute paths, `..` traversal, symlink escapes, changed base files,
invalid UTF-16 ranges, newly occupied create paths, overlapping edits, or stale
approval.

For each affected file:

1. assemble the complete new bytes from the approved change set;
2. write and fsync a same-filesystem temporary file;
3. record the staged path and original identity in a durable journal;
4. preserve a recovery backup for existing files;
5. rename staged files into place;
6. record each committed file;
7. fsync affected directories;
8. remove backups only after the transaction is marked complete.

A crash may occur between per-file atomic renames, so startup recovery either
finishes the exact approved set or restores committed files from the journal.
The system promises recoverable transactional application, not a globally
atomic filesystem primitive.

## 20. Structured Model Output

Every invocation returns exactly one direct structured result. The pipeline is:

```text
llama.cpp constrained decoding
        -> Vercel AI SDK parsing
        -> model-facing schema
        -> canonical schema
        -> session authorization
        -> catalog/target validation
        -> proposed transition
```

Model-facing schemas may inline references, narrow strings to state-specific
constants, and expose only one currently allowed action family. Projection must
be conservative: every model-facing value must also be a possible canonical
value. Canonical validation remains authoritative.

Prompts include only accepted state, required summaries, current diagnostics,
bounded rejection history, and applicable policy. Arbitrary transcripts and
unbounded command output do not exist in this architecture.

## 21. Resource and Progress Control

```ts
interface SynthesisBudgets {
  maxModelCalls: number;
  maxRevisions: number;
  maxRejectedActions: number;
  maxArtifacts: number;
  maxGraphNodesPerArtifact: number;
  maxInlineDepth: number;
  maxCollectionItems: number;
  maxRawCodeInputs: number;
  maxRawCodeCharacters: number;
  maxManifestBytes: number;
  maxSchemaDepth: number;
  maxGeneratedBytes: number;
  maxDiagnostics: number;
  maxPersistedBytes: number;
  maxCompilationMs: number;
  maxSessionDurationMs: number;
}
```

Deployment policy also caps concurrent sessions and compiler/model worker memory.
Workers support cancellation and hard termination. They isolate resource use;
they do not execute generated code.

The runtime fingerprints canonical candidate state, compilation diagnostics,
static diagnostics, catalog identities, and workspace identity. Repetition
first selects a different permitted repair strategy and then terminates with
`noProgress` when the configured repetition budget is exhausted.

## 22. Security and Confidentiality

Treat objectives, model responses, manifests loaded from data, graphs, fills,
workspace files, generated artifacts, diagnostics, and persisted events as
untrusted data at every parsing boundary.

Trust only versioned runtime/library code and server configuration. Static
acceptance does not promote generated source to trusted executable code.

Controls include:

- authenticated runtime APIs and per-session authorization;
- fixed policy/model identifiers;
- data-only catalog loading;
- exact existing targets and bounded create roots;
- path normalization and symlink containment;
- source-policy and TypeScript validation;
- explicit content-hash approval;
- bounded and cancellable work;
- prompt and diagnostic redaction;
- restrictive storage permissions and optional encryption;
- configurable retention and deletion;
- disabled external telemetry unless explicitly configured.

Persist secret references rather than values. Debug exports require explicit
authorization and apply the same redaction policy as normal persistence.

## 23. API Surface

```http
POST /v1/synthesis-sessions
POST /v1/synthesis-sessions/{sessionId}/run
GET  /v1/synthesis-sessions/{sessionId}
GET  /v1/synthesis-sessions/{sessionId}/events
POST /v1/synthesis-sessions/{sessionId}/graph-actions
POST /v1/synthesis-sessions/{sessionId}/artifact-fills
POST /v1/synthesis-sessions/{sessionId}/approve
POST /v1/synthesis-sessions/{sessionId}/cancel
```

Every mutating endpoint accepts an idempotency key and expected session revision.
Graph actions and fills also require artifact identity; approval requires the
exact staged change-set hash. There is no endpoint for commands, execution,
arbitrary validators, dependency installation, or direct unreviewed file writes.

## 24. Observability

Record:

- structured-output validity;
- initial plan and graph validity;
- patch and fill acceptance rates;
- revisions and model calls per artifact;
- catalog retrieval expansion and gap rates;
- partial-input counts;
- graph, syntax, policy, target, and semantic failure distributions;
- staged, approved, stale, applied, and recovered change sets;
- model, compilation, static-analysis, and application latency;
- no-progress and budget termination;
- persisted bytes and redaction counts.

Trace one root session span with child spans for catalog disclosure, artifact
planning, graph planning, compilation, repair, filling, static checking, staging,
approval, and application recovery.

## 25. Engineering Test Strategy

These are tests of the product implementation; the synthesis runtime does not
write or run candidate project tests.

### Library tests

- declarative manifest validation and immutability;
- rejection of callbacks and custom executable definitions;
- contract, manifest, and template digest stability;
- `sourceFile` syntax, graph, provenance, and semantic behavior;
- strict versus partial catalog schemas;
- artifact-set compilation and fill-ledger identity;
- path, hash, range, overlap, and deterministic assembly rules;
- cross-file virtual semantic diagnostics and attribution;
- TypeBox/Ajv schema and package-export coverage.

### Runtime unit tests

- schema projection and canonical validation;
- state authorization and complete transition table;
- lease, fencing, compare-and-swap, and idempotency behavior;
- event reduction, upcasting, and crash reconciliation;
- deterministic routing, budgeting, fingerprinting, and redaction;
- approval freshness and path containment.

### Runtime integration tests

- multi-artifact planning and repair;
- model and external fill workflows;
- stale fill and approval rejection;
- immutable workspace and base-hash drift;
- cross-file semantic repair;
- staged approval and recoverable application;
- cancellation, worker loss, restart, no-progress, and budget exhaustion;
- replay to the same accepted candidate and change-set hashes.

No integration test executes generated artifacts or invokes project commands.

## 26. Delivery Phases

### Phase 1: Library contracts

- manifest-only templates and schemas;
- dual catalog identity and provenance;
- `sourceFile` support;
- partial catalog graph schema;
- artifact-set compilation and virtual static validation.

### Phase 2: Runtime protocol and persistence

- canonical/model-facing schemas;
- event store, materialized state, leases, fencing, and budgets;
- catalog disclosure and direct structured model gateway;
- artifact-set, graph, repair, and fill roles.

### Phase 3: Static staging

- immutable workspace capture;
- mandatory artifact-set semantic checking;
- deterministic routing and no-progress detection;
- content-addressed change-set staging.

### Phase 4: Approval and application

- authenticated approval protocol;
- target revalidation and symlink defense;
- journaled application, rollback, and restart recovery;
- editor/API presentation of staged diffs and provenance.

## 27. Acceptance Criteria

The initial runtime architecture is satisfied when the system can:

1. Load a data-only catalog and capture both digests.
2. Produce a schema-constrained multi-artifact plan.
3. Compile and repair one partial graph per artifact.
4. Accept graph inputs and hash-bound artifact fills transactionally.
5. Reject stale actions without changing accepted state.
6. Assemble create and range-replacement targets in a snapshot overlay.
7. Require mandatory project-wide TypeScript semantic acceptance.
8. Stage one deterministic change set with complete provenance.
9. Require an exact revision/hash approval.
10. Recheck live targets and apply through a recoverable journal.
11. Persist and reconstruct every accepted transition.
12. Stop with explicit catalog-gap, stale-state, policy, no-progress, budget,
    cancellation, or terminal-integrity results.
13. Never execute generated code or invoke project/test/lint commands.

## 28. Architectural Decisions

| Area | Decision |
| --- | --- |
| Template runtime | Declarative manifests; library-owned compilation |
| Catalog identity | Separate planner contract and exact manifest digests |
| Candidate authority | Artifact-set plan plus fill ledger |
| Artifact scope | Multiple independent graphs per session |
| Full files | First-class `sourceFile` output |
| Model protocol | One role-specific structured result per call |
| Failure routing | Deterministic classification and provenance |
| Validation | Mandatory fixed static acceptance pipeline |
| Generated code | Never executed or imported |
| Project commands | Unsupported |
| Filesystem authority | Exact replacements plus bounded new-file roots |
| Application | Explicit hash approval and recoverable transaction |
| Persistence | Append-only events plus CAS materialized state |
| Completion | Static policy passed and approved change set applied |

## 29. Source Basis

Template and graph behavior follows the package's Graph Template Authoring and
Synthesis Graph guides. This design extends those single-graph primitives with
data-only manifests, exact manifest identity, full-file output, and pure
artifact-set static validation while keeping session orchestration and
filesystem application outside the library.
