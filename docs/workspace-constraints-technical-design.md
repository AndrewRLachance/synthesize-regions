# Technical Design: Workspace Constraints

**Status:** Draft  
**Version:** 0.1  
**Primary language:** TypeScript  
**Integration:** `synthesize-regions` artifact-set APIs and agent runtime

## 1. Purpose

This document defines Workspace Constraints, a declarative language and static
evaluation engine for directory-, file-, TypeScript-, dependency-, and
synthesis-provenance-wide invariants.

Workspace Constraints complements the controlled code-production model in
[Graph Template Authoring](./TEMPLATES.md) and
[Synthesis Graphs](./SYNTHESIS_GRAPHS.md). It extends the fixed acceptance
pipeline in the
[agent runtime design](./synthesis-workflow-technical-design.md) without adding
executable validators or project-command execution.

See the [authoring guide](./workspace-constraints-README.md) for language usage
and the [product description](./workspace-constraints-product-description.md)
for goals and boundaries.

This is a design for future implementation. No parser, evaluator, schema, or
runtime API described here exists yet.

## 2. Goals

Workspace Constraints shall:

1. Express project-wide invariants as repository-owned, data-only modules.
2. Compile readable `.wsc` syntax into one canonical JSON intermediate
   representation.
3. Evaluate structural, syntactic, semantic, dependency, and provenance facts.
4. Distinguish whole-candidate, changed-subject, and baseline non-regression
   enforcement.
5. Operate against immutable baseline and candidate workspace views.
6. Preserve existing read/write authorization boundaries.
7. Produce structured diagnostics with artifact and generated-source
   attribution where available.
8. Route repair deterministically, including bounded artifact-set plan repair.
9. Bind the exact constraint identity to session, staging, and approval state.
10. Fail closed when mandatory analysis is invalid, incomplete, stale,
    inaccessible, indeterminate, or exhausted.

## 3. Non-Goals

The design does not:

- execute, import, or evaluate generated or repository TypeScript;
- invoke tests, builds, linters, package managers, or shell commands;
- load custom validators, callbacks, AST visitors, or compiler plugins;
- provide a general-purpose programming language;
- permit user-defined functions or arbitrary recursion;
- prove runtime behavior, business correctness, security, or performance;
- grant read or write authority through selectors;
- disclose all analyzed source to models;
- allow a candidate to modify the constraints governing its own acceptance;
- replace template, graph, artifact-integrity, syntax, or compiler gates.

## 4. Design Invariants

### 4.1 Authoring syntax is not authoritative

The `.wsc` language is a readable authoring layer. The authoritative contract
is a schema-validated, normalized `WorkspaceConstraintSet` JSON value.

```text
entry .wsc + explicit imports
          |
parse and source diagnostics
          |
resolve immutable import closure
          |
name, type, phase, and budget validation
          |
normalized WorkspaceConstraintSet
          |
canonical JSON + engine identities
          |
constraintDigest
```

Runtime evaluation never reparses source strings from persisted session state.
It evaluates a validated normalized constraint set whose digest matches the
captured source closure.

### 4.2 Constraint modules are data

Parsing accepts only the versioned Workspace Constraints grammar. Imports load
only `.wsc` modules as source data. There is no JavaScript/TypeScript module
resolution, dynamic import, callback field, plugin hook, or caller-supplied
predicate implementation.

### 4.3 Rules cannot grant authority

A selector can observe only facts available below captured read-only analysis
roots. It cannot read outside those roots and cannot grant a create or
replacement target.

Write authority remains:

- exact captured replacement targets; and
- explicitly authorized create roots.

### 4.4 Active constraints are immutable

The complete imported module closure is captured before planning. Every module
path and content hash is part of the constraint capture. Active module paths
are rejected as artifact targets for the entire session.

Changing repository constraint files makes the live workspace stale; it never
changes an already captured session in place.

### 4.5 Required uncertainty fails closed

Rule evaluation has three outcomes:

```ts
type ConstraintOutcome = 'passed' | 'failed' | 'indeterminate'
```

`indeterminate` is not equivalent to `false`. It represents unavailable or
incomplete mandatory evidence. An indeterminate error rule fails static
acceptance. An indeterminate warning is reported but remains non-gating.

### 4.6 Evaluation is bounded

Every parser, selector, fact extraction, join, aggregation, compiler query, and
diagnostic operation is charged against fixed deployment and request budgets.
The language contains no construct whose work cannot be estimated and bounded.

## 5. Terminology

**Constraint entry:** The request-selected root module, normally
`.synthesize-regions/constraints.wsc`.

**Constraint module:** One data-only `.wsc` file in the explicit import
closure.

**Constraint set:** The normalized, flattened, typed rule representation used
by evaluation.

**Constraint digest:** Identity of the normalized set and versioned parser,
normalization, expression, fact, and compatibility contracts.

**Analysis root:** A captured workspace-relative path below which trusted
infrastructure may derive facts. It grants no model or write authority.

**Workspace view:** Either the immutable baseline snapshot or the in-memory
candidate overlay.

**Subject:** A typed value selected for rule evaluation, such as a file,
declaration, symbol, artifact, or generated range.

**Violation key:** A stable identity used to compare baseline and candidate
violations for `noNewViolations`.

**Fact provider:** Library-owned code that derives one versioned family of
facts.

## 6. Source Language

### 6.1 Entry and modules

The default entry file is:

```text
.synthesize-regions/constraints.wsc
```

An entry declares exactly one constraint set:

```wsc
constraints "feature-modules" version 1 {
  import "./constraints/shared.wsc"

  rule "changed-source-has-named-exports" {
    phase assembled
    mode changed
    severity error

    select files "src/features/**/*.ts" as source
    require source.exports.default.count == 0
  }
}
```

Imported files declare modules. A module may contain explicit imports of other
modules:

```wsc
module "shared-feature-rules" version 1 {
  import "./naming.wsc"

  rule "feature-index-exists" {
    phase assembled
    mode candidate
    severity error

    select directories "src/features/:feature" as feature
    require file("${feature.path}/index.ts")
  }
}
```

Imports are declarations, not textual includes. Comments and formatting have no
effect on normalized identity.

### 6.2 Rule shape

The v1 source shape is:

```wsc
rule "<stable-id>" {
  phase plan | artifact | assembled | semantic
  mode candidate | changed | noNewViolations
  severity error | warning

  select <typed-selector> as <binding>
  join <bounded-selector> as <binding>

  require <boolean-expression>
  require <boolean-expression>
}
```

Rules require at least one selector and one assertion. Binding names are local
to one rule. Rule IDs are unique across the complete imported closure.

### 6.3 Path patterns

Path patterns are workspace-relative POSIX patterns:

- `*` matches exactly one complete segment;
- `**` matches zero or more complete segments;
- `:name` captures one segment;
- `:name.suffix.ts` captures the prefix of one segment;
- all other characters are literals subject to path normalization.

Captures cannot contain separators, `.`, `..`, NUL, or an absolute-path
prefix. Interpolation is permitted only in path-template operands and escapes
captures as segments.

The pattern language is not a regular-expression dialect. A future regex fact
must use a separately versioned, bounded predicate.

### 6.4 Expressions

Expressions are statically typed. V1 supports:

- scalar literals and set literals;
- subject field access;
- `and`, `or`, and `not`;
- typed equality and ordering;
- set and collection membership;
- path `matches` and `under` predicates;
- `all`, `some`, `none`, and `exactly N` quantifiers;
- bounded `count`, `unique`, and `contains` aggregates;
- explicit selector joins;
- TypeScript `assignableTo` and exact-symbol predicates;
- a closed set of versioned pure helpers such as `pascal(PathSegment)`.

Short-circuiting affects work but not observable diagnostics: every failed
top-level `require` produces at most one primary diagnostic with bounded
supporting evidence.

User-defined functions, mutation, loops, recursion, reflection, dynamic field
access, and dynamic selector construction are invalid.

## 7. Normalized Intermediate Representation

### 7.1 Top-level contract

```ts
interface WorkspaceConstraintSet {
  schemaVersion: 1;
  id: string;
  modules: ConstraintModuleReference[];
  rules: WorkspaceConstraintRule[];
}

interface ConstraintModuleReference {
  moduleId: string;
  normalizedPath: string;
}

interface ConstraintModuleCapture extends ConstraintModuleReference {
  sourceHash: string;
}

interface WorkspaceConstraintRule {
  id: string;
  phase: ConstraintPhase;
  mode: ConstraintMode;
  severity: ConstraintSeverity;
  selector: ConstraintSelector;
  joins: ConstraintJoin[];
  assertions: ConstraintExpression[];
}

type ConstraintPhase = 'plan' | 'artifact' | 'assembled' | 'semantic';
type ConstraintMode = 'candidate' | 'changed' | 'noNewViolations';
type ConstraintSeverity = 'error' | 'warning';
```

The published schema validates generic wire shape. Canonical compilation also
performs name resolution, selector typing, expression typing, phase/fact
availability, baseline comparability, and budget validation.

### 7.2 Selector representation

Selectors use a closed discriminated union. Representative variants are:

```ts
type ConstraintSelector =
  | {
      kind: 'files';
      binding: string;
      pathPattern: string;
    }
  | {
      kind: 'directories';
      binding: string;
      pathPattern: string;
    }
  | {
      kind: 'artifacts';
      binding: string;
      predicate?: ConstraintExpression;
    }
  | {
      kind: 'declarations' | 'imports' | 'exports';
      binding: string;
      files: FileSelector;
      predicate?: ConstraintExpression;
    }
  | {
      kind: 'generatedRanges';
      binding: string;
      files: FileSelector;
      predicate?: ConstraintExpression;
    };
```

Semantic symbols and signatures are reached through typed syntax/export
subjects rather than an unbounded global symbol-table scan. This preserves a
path-bounded selector anchor.

### 7.3 Expression representation

The IR stores expression operators, resolved binding references, and typed fact
IDs rather than source-language strings:

```ts
type ConstraintExpression =
  | { kind: 'literal'; value: string | number | boolean | null }
  | { kind: 'set'; values: ConstraintExpression[] }
  | {
      kind: 'fact';
      bindingId: string;
      factId: WorkspaceFactId;
    }
  | {
      kind: 'logical';
      operator: 'and' | 'or';
      operands: ConstraintExpression[];
    }
  | {
      kind: 'not';
      operand: ConstraintExpression;
    }
  | {
      kind: 'compare';
      operator: 'equal' | 'lessThan' | 'lessThanOrEqual';
      left: ConstraintExpression;
      right: ConstraintExpression;
    }
  | {
      kind: 'pathPredicate';
      operator: 'matches' | 'under';
      path: ConstraintExpression;
      patterns: ConstraintExpression[];
    }
  | {
      kind: 'quantifier';
      operator: 'all' | 'some' | 'none' | 'exactly';
      collection: ConstraintExpression;
      itemBindingId: string;
      count?: number;
      predicate: ConstraintExpression;
    }
  | {
      kind: 'typePredicate';
      operator: 'assignableTo' | 'sameSymbol';
      actual: ConstraintExpression;
      expected: ConstraintExpression;
    };
```

The implementation may use more specialized internal nodes, but persisted IR
remains closed, JSON-safe, and schema-backed.

### 7.4 Source locations

Compilation returns a separate `ConstraintSourceMap` from normalized rule,
selector, and assertion IDs to module UTF-16 ranges, plus exact
`ConstraintModuleCapture` records. Source locations and source hashes support
author diagnostics and stale-file detection but are excluded from semantic
canonicalization, so comments and formatting do not change
`constraintDigest`.

Normalized module paths and module IDs remain in the IR and do affect identity.

## 8. Type and Fact Model

### 8.1 Core types

The expression checker recognizes:

```text
Boolean, Integer, String, Path, PathSegment
File, Directory, Artifact, ArtifactTarget
Declaration, Import, Export, Decorator
Symbol, Signature, Type
GeneratedRange, Provenance, GraphNode, TemplateInput
Collection<T>, Set<T>, Optional<T>
```

There is no implicit conversion between `String`, `Path`, and
`PathSegment`. TypeScript `Type` values are opaque handles owned by the
semantic fact provider and cannot be serialized as compiler objects.

### 8.2 Fact families

Fact IDs are versioned public contracts. Initial families include:

| Family | Representative facts |
| --- | --- |
| Path/tree | normalized path, basename, extension, parent, captures, child files |
| Candidate change | created, modified, intersecting edits, owning artifact IDs |
| Plan | artifact ID, target kind/path/range, goal kind/type |
| Syntax | declarations, kind, name, modifiers, decorators, imports, exports |
| Module | specifier, resolved path, external/package status, type-only status |
| Symbol | exported symbol, declarations, aliases, signatures |
| Type | display descriptor, assignability handle, return and parameter types |
| Provenance | generated range, artifact, node, template, input, raw-code owner |

Fact providers return values plus evidence metadata and an availability status.
They do not expose mutable compiler objects to the expression evaluator.

### 8.3 Phase availability

Each fact declares its earliest phase:

```ts
interface WorkspaceFactDefinition {
  id: WorkspaceFactId;
  subjectType: ConstraintTypeId;
  resultType: ConstraintType;
  earliestPhase: ConstraintPhase;
  baselineAvailable: boolean;
  providerVersion: number;
}
```

A rule cannot reference a fact earlier than its declared phase. A
`noNewViolations` rule cannot use a selector or fact for which
`baselineAvailable` is false. Consequently, plan-only and generated
provenance facts normally use `candidate` or `changed`, not
`noNewViolations`.

### 8.4 TypeScript semantics

Semantic evaluation uses the same captured `tsconfig`, normalized workspace
paths, and baseline/candidate overlay required by artifact-set static
acceptance.

The fact provider creates or reuses two programs:

- baseline program from the immutable workspace snapshot;
- candidate program from the baseline plus assembled changes.

Type operations are library-owned:

- assignability uses the pinned TypeScript compatibility contract;
- symbols are identified by normalized declaration identities, not object
  addresses;
- aliases are resolved with bounded depth;
- diagnostics produced while constructing mandatory semantic facts are
  retained as evidence;
- unsupported or unresolved mandatory relationships return indeterminate.

Compiler-visible truth is not treated as runtime proof.

## 9. Import Resolution and Compilation

### 9.1 Resolution

The compiler starts from the request-authorized entry path. For every import it:

1. validates a relative `.wsc` path;
2. normalizes it relative to the importing module;
3. rejects absolute paths, traversal, and constraint-root escapes;
4. verifies the path lies in the captured workspace and authorized config root;
5. loads exact captured bytes;
6. detects cycles by normalized path;
7. charges module count, depth, and byte budgets.

Imports are traversed in authored order for diagnostics, then normalized by
module identity for canonicalization.

### 9.2 Validation

Compilation rejects:

- malformed source or unsupported language versions;
- multiple entry declarations or imports outside a set/module declaration;
- duplicate set, module, rule, or binding IDs;
- unknown facts, helpers, fields, or operators;
- invalid path patterns or capture references;
- type-incompatible expressions;
- facts unavailable in the selected phase;
- non-baseline-comparable `noNewViolations` rules;
- statically unbounded joins or aggregates;
- expressions exceeding configured structural budgets.

No partially valid constraint set may enter a synthesis session.

### 9.3 Normalization

Normalization:

- resolves imports and binding references;
- converts source sugar into explicit expression nodes;
- normalizes paths to workspace-relative POSIX form;
- normalizes sets into deterministic value order;
- preserves assertion order for diagnostic identity;
- sorts modules and rules by stable IDs;
- inserts no policy defaults for phase, mode, or severity;
- removes comments, trivia, and source formatting.

## 10. Identity

### 10.1 Digest

`constraintDigest` uses a domain-separated SHA-256 hash, rendered with a
versioned `wc1_` prefix:

```text
wc1_ SHA-256(
  canonical JSON {
    identityVersion,
    normalized WorkspaceConstraintSet,
    sourceGrammarVersion,
    irSchemaVersion,
    expressionEngineVersion,
    factCatalogVersion,
    pathPatternVersion,
    TypeScriptCompatibilityVersion
  }
)
```

Module source hashes produce a separate `constraintSourceSnapshotHash`, while
semantic identity comes from normalized IR and engine contracts. Comment or
whitespace changes do not change the digest, but they do change that source
snapshot hash. Rule meaning, module path/identity, imports, or engine contract
changes change the digest.

### 10.2 Session binding

The existing candidate and acceptance identities gain:

```ts
interface WorkspaceConstraintIdentity {
  constraintEntryPath: string;
  constraintDigest: string;
  constraintSourceSnapshotHash: string;
  constraintEngineVersion: number;
  analysisSnapshotHash: string;
}

interface ArtifactSetCandidate {
  // Existing plan, revisions, fills, and catalog/workspace identities.
  constraintIdentity?: WorkspaceConstraintIdentity;
}
```

When present, the static change-set hash binds this identity. Constraint
recapture, semantic digest change, exact module-byte change, or
analysis-snapshot change invalidates staged state and approval.

## 11. Request and Authorization

The synthesis request adds:

```ts
interface WorkspaceConstraintRequest {
  entryPath: string;
  expectedConstraintDigest: string;
  analysisRoots: string[];
}

interface SynthesisRequest {
  // Existing objective, workspace, targets, catalog, policy, and budgets.
  constraints?: WorkspaceConstraintRequest;
}
```

Omitting `constraints` disables repository-specific constraint evaluation for
that session, but does not remove states from the canonical workflow. Each fixed
phase commits a skipped result with reason `notConfigured`. When a captured set
has no rule for a phase, the reason is `noApplicableRules`.

Server authorization constrains:

- permitted entry/config roots;
- maximum read-only analysis roots;
- relationship between analysis roots and workspace snapshot;
- maximum constraint and evaluation budgets.

The client cannot gain access merely by naming a broader root. Constraint
selectors cannot expand `analysisRoots`.

### 11.1 Visibility classes

Information has separate visibility:

| Consumer | Visibility |
| --- | --- |
| Parser/compiler | Captured constraint module closure |
| Fact providers | Captured files below authorized analysis roots |
| Evaluator | Typed facts and bounded evidence |
| Models | Rule summaries, selected subject metadata, bounded diagnostics |
| Approver | Rules/digest, diagnostics, resulting diff, and provenance |

Raw source excerpts in model diagnostics follow the runtime's existing
redaction and minimum-disclosure policy.

### 11.2 Immutable module targets

After capture, every active module path is added to a session-level denylist for
artifact targets. Any create or replace target overlapping an active module is
rejected before planning or compilation.

This restriction applies even if the path would otherwise fall within an
allowed create root or exact replacement target.

## 12. Workspace Views and Change Semantics

### 12.1 Baseline and candidate

The baseline is the immutable captured workspace. The candidate is produced by
assembling the authoritative artifact-set plan and fill ledger over that
baseline. Neither view reads mutable live files during evaluation.

### 12.2 Changed subjects

For `changed` mode:

- a file is changed when it is created or has at least one accepted text edit;
- a directory is changed when it contains a changed descendant selected by the
  rule;
- a syntax subject is changed when its candidate range intersects an edit or it
  belongs to a created file;
- an artifact and generated range in the current plan are changed subjects;
- a semantic relationship is changed when a changed syntax subject owns an
  endpoint or its normalized fact value differs between baseline and candidate.

Formatting-only edits still mark intersecting syntax subjects as changed.
Selectors run against the candidate first, then apply the typed changed-subject
filter.

### 12.3 Candidate mode

`candidate` evaluates assertions for every selected candidate subject. A
pre-existing violation is gating because the complete selected candidate does
not satisfy the rule.

### 12.4 No-new-violations mode

`noNewViolations` evaluates the same normalized selector and assertions in
both views. Each failed or indeterminate assertion produces a violation key:

```ts
interface ConstraintViolationKey {
  ruleId: string;
  assertionIndex: number;
  subjectKind: string;
  subjectStableId: string;
  joinedSubjectStableIds: string[];
}
```

Stable IDs use normalized paths and structural identities, never source offsets
alone. Candidate violations are compared as a multiset with baseline
violations:

- a matching baseline occurrence is non-gating legacy context;
- an unmatched candidate occurrence is new and gating;
- increased multiplicity is gating;
- removed occurrences are recorded as improvements;
- an indeterminate candidate result cannot consume a failed baseline result.

If stable correlation cannot be established for a mandatory subject, the rule
is indeterminate rather than silently treated as legacy.

## 13. Evaluation Pipeline

When configured, constraint evaluation is interleaved with existing artifact
processing. When absent, the same fixed states commit `notConfigured` skips:

```text
capture workspace + constraints
          |
validate module closure and expected digest
          |
artifact-set outline
          |
evaluate plan rules
          |
compile graphs and replay fills
          |
evaluate artifact/provenance rules
          |
validate targets and assemble candidate overlay
          |
evaluate assembled tree and syntax rules
          |
build/reuse baseline and candidate TypeScript programs
          |
existing semantic comparison + semantic constraint rules
          |
canonical accepted change set bound to constraintDigest
```

### 13.1 Incremental reevaluation

Constraint compilation records fact dependencies per rule. A candidate revision
invalidates:

- plan rules for any plan patch;
- artifact rules for changed graph, fill, or compiled artifact identity;
- assembled rules for affected paths and selector ancestors;
- semantic rules for affected program files and resolved dependency consumers.

The evaluator may cache immutable baseline facts and unaffected candidate facts.
Caching cannot change canonical results or diagnostic ordering.

### 13.2 Deterministic ordering

Results are ordered by:

1. phase;
2. rule ID;
3. normalized primary subject path;
4. primary UTF-16 start;
5. assertion index;
6. subject stable ID.

Truncation occurs only after deterministic ordering and emits an explicit
diagnostic count/truncation record.

## 14. Diagnostics

### 14.1 Contract

```ts
interface WorkspaceConstraintDiagnostic extends SynthesisDiagnostic {
  code:
    | 'WorkspaceConstraintFailed'
    | 'WorkspaceConstraintIndeterminate'
    | 'WorkspaceConstraintInvalid'
    | 'WorkspaceConstraintDigestMismatch'
    | 'WorkspaceConstraintBudgetExceeded';

  ruleId?: string;
  phase?: ConstraintPhase;
  mode?: ConstraintMode;
  outcome?: 'failed' | 'indeterminate';
  assertionIndex?: number;
  subject?: ConstraintSubjectDescriptor;
  artifactId?: string;
  nodeId?: string;
  templateId?: string;
  inputName?: string;
  repairHints?: SynthesisRepairHint[];
}

interface ConstraintSubjectDescriptor {
  kind: string;
  stableId: string;
  path?: string;
  start?: number;
  length?: number;
  captures?: Record<string, string>;
}
```

Diagnostics use `stage: "policy"`. Expected and actual fields contain
JSON-safe summarized evidence, never compiler object graphs.

### 14.2 Attribution

For a syntax or semantic subject inside an assembled edit, the evaluator maps
candidate file coordinates to the owning artifact edit and calls the existing
deepest generated-source-span lookup.

Attribution preference is:

1. exact generated input span;
2. deepest generated node span;
3. artifact edit;
4. candidate file/range;
5. set-level rule.

Cross-file assertions may include secondary subject descriptors, but only one
primary owner is used for deterministic repair routing.

### 14.3 Positive and failing outcomes

- A passed rule emits no acceptance diagnostic; optional metrics record it.
- A failed error assertion emits a gating diagnostic.
- A failed warning assertion emits a non-gating warning.
- An indeterminate error assertion emits a gating indeterminate diagnostic.
- A baseline violation consumed by `noNewViolations` is context, not a
  candidate failure.
- A removed baseline violation may be reported as a non-gating improvement.

## 15. Repair Routing

### 15.1 Routing table

| Constraint ownership | Route |
| --- | --- |
| Exact raw/literal generated input | Input Synthesizer |
| One graph node/template composition | Graph Repairer |
| Artifact existence, count, target, or goal | Artifact-Set Repairer |
| Attributable relationship among several existing artifacts | Set-level repair coordinator |
| Invalid module, stale digest/snapshot, forbidden scope | Terminal policy or stale-state failure |
| Mandatory resource exhaustion or fact-provider corruption | Terminal failure |

The router uses diagnostic structure and provenance; it does not invoke a
classifier model.

### 15.2 Artifact-Set Repairer

The runtime adds a bounded role whose input contains:

- the current artifact-set outline and candidate revision;
- one actionable set-level constraint diagnostic;
- authorized replacement targets and allowed create roots;
- relevant catalog capability summaries;
- remaining budgets and rejected patches;
- one currently permitted patch family.

Its output is exactly one action:

```ts
type ArtifactSetPatchAction =
  | { kind: 'addArtifact'; artifact: ArtifactOutline }
  | { kind: 'removeArtifact'; artifactId: string }
  | {
      kind: 'setArtifactTarget';
      artifactId: string;
      target: AuthorizedArtifactTarget;
    }
  | {
      kind: 'setArtifactGoal';
      artifactId: string;
      goal: SynthesisGoal;
    };
```

An `ArtifactOutline` contains identity, objective, authorized target, and goal,
not a model-authored executable template or detached complete graph. Added or
goal/target-invalidated outlines return to Graph Planning. Removal and
invalidation update the fill ledger and staged-state invalidation
transactionally.

Every patch is schema-validated, authorized, budgeted, applied immutably, and
rechecked from the earliest affected phase.

## 16. State and Protocol Changes

### 16.1 Session state

```ts
interface SynthesisSession {
  // Existing identity and candidate fields.
  constraintIdentity?: WorkspaceConstraintIdentity;
}
```

Requested constraint capture occurs before `planningSet`. An invalid or stale
requested capture prevents planning. An omitted request records no constraint
identity and proceeds through explicit phase skips.

### 16.2 Canonical workflow ownership

Workspace Constraints does not add an independent state machine. The
[synthesis workflow's canonical `WorkflowDefinition`](./synthesis-workflow-technical-design.md#15-state-machine)
owns the fixed `planConstraintChecking`, `artifactConstraintChecking`,
`assembledConstraintChecking`, `semanticConstraintChecking`,
`constraintRepairRouting`, and `needsSetRepair` states.

Each phase produces exactly one lifecycle event:

```text
<Phase>ConstraintsPassed
<Phase>ConstraintsFailed
<Phase>ConstraintsSkipped { reason: notConfigured | noApplicableRules }
```

Failed events enter deterministic constraint-repair routing. Local ownership
continues to the existing static/input/graph repair path; plan-shape and
cross-artifact ownership continues to `needsSetRepair`. Every accepted
artifact-set patch returns to `planConstraintChecking`, then added or invalidated
artifacts pass through Graph Planning. Constraint source cannot add workflow
states, transitions, effects, guards, or authorization rules.

### 16.3 Commands, events, and outbox work

Constraint-related event families include:

- constraint capture started/completed/rejected;
- constraint phase skipped with `notConfigured` or `noApplicableRules`;
- constraint module and normalized-set blobs captured;
- constraint phase evaluation started/completed;
- constraint diagnostic set recorded;
- artifact-set patch proposed/accepted/rejected;
- analysis budget exhausted;
- constraint identity invalidated;
- staged change set invalidated by constraint or analysis change.

Events reference content-addressed blobs and participate in existing
compare-and-swap revision updates.

Evaluations are external work derived from committed events and inserted into
the transactional outbox. A worker result returns as a revision-, phase-,
constraint-digest-, source-snapshot-, and analysis-snapshot-bound command. The
pure command decider authorizes the result and proposes lifecycle/observation
events; the pure reducer reconstructs the declared target state. XState remains
a generated visualization and path-analysis projection and performs no
constraint work.

## 17. Static Acceptance and Approval

A statically accepted constrained result adds:

```ts
interface ConstraintBoundStaticAcceptance {
  constraintEntryPath: string;
  constraintDigest: string;
  constraintSourceSnapshotHash: string;
  analysisSnapshotHash: string;
  constraintEngineVersion: number;
}
```

The canonical change-set hash covers those fields alongside catalog digests,
workspace snapshot hash, static-policy version, targets, base hashes, exact
result bytes, and provenance.

Approval continues to supply the exact session revision and change-set hash.
Any exact constraint module bytes, digest, engine, analysis root, analysis
snapshot, or candidate change makes the approval stale.

Application rechecks live target authorization and captured file identities. It
does not rerun repository commands. If live constraint module bytes differ from
the approved capture, application rejects as stale rather than applying under
unknown policy.

## 18. Resource Budgets

```ts
interface WorkspaceConstraintBudgets {
  maxModules: number;
  maxImportDepth: number;
  maxSourceBytes: number;
  maxRules: number;
  maxSelectorsPerRule: number;
  maxAssertionsPerRule: number;
  maxExpressionDepth: number;
  maxSelectedSubjects: number;
  maxFactRows: number;
  maxJoinRows: number;
  maxTypeQueries: number;
  maxDiagnostics: number;
  maxEvaluationMs: number;
  maxEvaluationMemoryBytes: number;
}
```

Deployment policy supplies hard ceilings. A request may select stricter values
but cannot raise them.

Compilation rejects statically excessive structure. Runtime exhaustion returns
`WorkspaceConstraintBudgetExceeded`; an incomplete mandatory phase cannot
produce acceptance.

## 19. Security

Treat constraint source, workspace source, normalized IR, compiler facts,
diagnostics, and model proposals as untrusted data.

Required controls include:

- a dedicated parser with no host-language evaluation;
- closed JSON schemas with unknown-field rejection;
- relative import normalization and config-root containment;
- cycle and duplicate-ID rejection;
- immutable source closure and content hashes;
- analysis-root authorization independent of selectors;
- active-module target denial;
- closed typed fact and expression catalogs;
- bounded selectors, joins, aggregates, and compiler queries;
- diagnostic evidence redaction;
- digest binding through staging and approval;
- cancellation and hard worker limits.

The evaluator must not resolve runtime package entry points, import emitted
source, invoke decorators, evaluate constant initializers, or call TypeScript
language-service plugins.

## 20. Failure Scenarios

### Import cycle

`constraints.wsc -> features.wsc -> constraints.wsc` is rejected during
capture with the complete normalized cycle path. No digest or session candidate
is accepted.

### Duplicate rule ID

Two imported modules defining `route-handler-contract` fail set compilation.
Import order never selects a winner.

### Inaccessible selector

A rule selecting `packages/payments/**` with analysis roots limited to
`src/**` is indeterminate. An error rule prevents acceptance; it does not
cause an implicit read.

### Stale digest

If normalized capture produces a digest different from
`expectedConstraintDigest`, session creation or resumption fails as stale.

### Indeterminate semantic type

If `RouteHandler` cannot be resolved under the captured `tsconfig`, an
assignability assertion is indeterminate. It is not treated as non-assignable or
silently skipped.

### Legacy violation

A forbidden baseline import under `noNewViolations` is retained as context.
Adding another occurrence produces an unmatched candidate violation and fails.

### Provenance violation

A generated service range owned by an unapproved template maps through its
source span to artifact, node, and template fields and routes to Graph Repair.

### Cross-file semantic join

A routes export that fails to depend on its captured controller symbol includes
both subjects. If no single generated owner is exact, routing remains at set
scope.

### Set-level repair

A missing sibling route file produces an assembled constraint failure. The
Artifact-Set Repairer may add an authorized route artifact outline; Graph
Planning then supplies its synthesis graph before reevaluation.

## 21. Schemas and Public Artifacts

The implementation shall publish JSON Schemas for:

- normalized workspace constraint sets;
- constraint summaries disclosed to models;
- constraint diagnostics and phase results;
- artifact-set repair actions;
- constraint capture and identity records.

Source grammar fixtures are not wire protocol. Persisted sessions store the
normalized set, source-map/capture metadata, exact source blobs by hash, and
digest.

Package exports should expose data types, schema paths, parser/compiler entry
points, pure evaluators, and fact summaries. They must not expose hooks for
registering arbitrary fact providers in the agent runtime.

## 22. Testing Strategy

### Parser and normalization

- entry/module grammar, comments, escapes, and source spans;
- explicit import resolution, root containment, cycles, and missing modules;
- duplicate IDs and binding resolution;
- path pattern and safe interpolation behavior;
- canonical IR and digest stability across formatting;
- digest changes for every semantic or engine-contract change;
- published schema agreement with TypeScript types.

### Type and expression system

- valid and invalid facts by subject type;
- phase availability and baseline-comparability checks;
- quantifiers, aggregates, bounded joins, and helper functions;
- rejection of recursion, dynamic access, unknown operations, and excessive
  expressions;
- deterministic expression diagnostics.

### Evaluation modes

- `candidate` fails on selected legacy violations;
- `changed` ignores untouched subjects and checks intersecting/created ones;
- `noNewViolations` consumes matching baseline violations, detects increased
  multiplicity, and records improvements;
- indeterminate results remain distinct from false assertions;
- warnings never gate acceptance.

### Phase coverage

- plan target/layout acceptance and failure;
- artifact template/raw-input provenance acceptance and failure;
- assembled companion-file and declaration-shape acceptance and failure;
- semantic assignability, resolved dependency, and cross-file join acceptance
  and failure;
- reevaluation starts at the earliest invalidated phase.

### Authorization and identity

- analysis roots permit facts without granting targets or model disclosure;
- selectors outside roots fail closed;
- active modules cannot be changed by the candidate;
- stale constraint, workspace, analysis, catalog, and approval identities are
  rejected;
- exact replay produces identical diagnostics and hashes.

### Repair and integration

- diagnostic attribution to input, node, artifact, file, and set scopes;
- deterministic routing among input, graph, and set repair;
- add/remove/retarget/goal set patches obey authorization and invalidate fills;
- the feature-module example converges from missing routes file to accepted
  constraint-bound change set;
- no test executes generated artifacts or invokes project commands.

## 23. Delivery Phases

### Phase 1: Language and identity

- `.wsc` parser, import resolver, source diagnostics, and canonical IR;
- closed schemas, type checker, normalization, and `constraintDigest`;
- path selectors and plan/assembled structural facts.

### Phase 2: Artifact and syntax evaluation

- immutable capture and analysis-root authorization;
- artifact, provenance, file-tree, and TypeScript syntax fact providers;
- `candidate`, `changed`, and baseline violation comparison;
- structured diagnostics and source attribution.

### Phase 3: Semantic constraints

- reusable baseline and candidate TypeScript programs;
- module, symbol, signature, type, and assignability facts;
- bounded cross-file joins and semantic indeterminate handling;
- incremental invalidation and resource enforcement.

### Phase 4: Runtime repair and approval

- request/session/event integration;
- Artifact-Set Repairer and plan patch protocol;
- deterministic routing and no-progress behavior;
- staging, approval, application-staleness, and observability integration.

## 24. Acceptance Criteria

The architecture is satisfied when the system can:

1. When selected, capture `.synthesize-regions/constraints.wsc` and its explicit
   module closure without executing project code; otherwise record explicit
   `notConfigured` phase skips.
2. Produce a validated canonical IR and reproducible `constraintDigest`.
3. Reject cycles, duplicate IDs, root escapes, unsupported facts, invalid phase
   use, and unbounded expressions.
4. Derive bounded tree, syntax, semantic, dependency, and provenance facts from
   authorized immutable views.
5. Correctly evaluate all three enforcement modes and four phases.
6. Fail closed for inaccessible or indeterminate mandatory analysis.
7. Attribute violations through existing artifact source maps when possible.
8. Repair authorized set-shape failures through one scoped patch at a time.
9. Bind the exact constraint and analysis identities into staged bytes and
   approval.
10. Never execute generated code, load custom validators, invoke project
    commands, or broaden filesystem authority.

## 25. Architectural Decisions

| Area | Decision |
| --- | --- |
| Product name | Workspace Constraints |
| Default entry | `.synthesize-regions/constraints.wsc` |
| Composition | One entry with explicit relative `.wsc` imports |
| Authoring | Readable typed DSL |
| Authority | Canonical schema-validated JSON IR |
| Expressions | Closed, typed, bounded facts and operators |
| Semantic scope | Full compiler-visible types, symbols, and dependencies |
| Enforcement | Explicit `candidate`, `changed`, or `noNewViolations` per rule |
| Phases | Plan, artifact, assembled, semantic |
| Read access | Captured server-authorized analysis roots |
| Write access | Unchanged exact targets and allowed create roots |
| Configuration ownership | Repository data captured immutably per session |
| Activation | Optional per session; requested capture must succeed |
| Identity | Versioned `constraintDigest` bound through approval |
| Repair | Deterministic input, graph, or artifact-set repair |
| Workflow topology | Fixed states owned by the synthesis `WorkflowDefinition` |
| Extensions | No executable validators or arbitrary fact-provider plugins |
