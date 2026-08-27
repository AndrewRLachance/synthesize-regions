# Synthesis Graphs

A synthesis graph is a serializable plan for producing one TypeScript artifact
from a validated template catalog. Templates define the available operations;
nodes select those operations; references compose their outputs.

For template authoring, see [Graph Template Authoring](./TEMPLATES.md).

## Why use a graph?

A direct prompt asks a model to produce unrestricted source in one step. A
synthesis graph separates decisions that can be validated independently:

- which known operation to use;
- which values or fragments feed each input;
- how generated fragments compose;
- what final syntax and type contract must be satisfied;
- which repair channel should handle a failure.

This makes the graph useful as an intermediate representation for LLM planners,
deterministic generators, visual editors, and persisted repair jobs. It does not
guarantee good design by itself; its benefit comes from a well-designed catalog
and narrow port contracts.

## Core model

```ts
interface SynthesisGraph {
  nodes: SynthesisNode[];
  finalNodeId: string;
  goal?: SynthesisGoal;
}

interface SynthesisNode {
  id: string;
  templateId: string;
  typeArguments?: Record<string, TypeDescriptor>;
  inputs: Record<string, SynthesisInput>;
}
```

Each node invokes one catalog template. Node IDs identify invocations, while
`templateId` selects a reusable definition by its `modelId`.

```ts
const graph = {
  nodes: [
    {
      id: "body",
      templateId: "RequestBodyExpression",
      inputs: {}
    },
    {
      id: "response",
      templateId: "ReturnJson",
      inputs: {
        value: { $ref: "body" }
      }
    },
    {
      id: "handler",
      templateId: "PostHandler",
      inputs: {
        statements: {
          kind: "fragmentCollection",
          items: [{ $ref: "response" }]
        }
      }
    }
  ],
  finalNodeId: "handler",
  goal: { outputKind: "declaration" }
} satisfies SynthesisGraph;
```

The graph describes selection and composition, not execution order. Compilation
follows references recursively and memoizes produced artifacts. Authored node
order is primarily serialization order; fragment-collection item order is
semantically significant and is always preserved.

If the selected template declares `typeParameters`, the node must bind all of
them explicitly with `typeArguments`:

```ts
{
  id: "views",
  templateId: "ArrayMap",
  typeArguments: {
    T: { ts: "{ id: string; name: string }" },
    U: { ts: "{ label: string }" }
  },
  inputs: {
    array: { $ref: "users" },
    callback: { $ref: "toView" }
  }
}
```

Bindings use concrete, self-contained `TypeDescriptor` values. Generic
arguments are neither inferred nor defaulted: a generic node must provide
exactly the declared parameter names, while a nongeneric node must not provide
any. The compiler instantiates the selected template's input and output
TypeScript descriptors before checking fragment compatibility. JSON Schema
contracts remain the fixed schemas declared by the template.

Binding failures use type-stage diagnostics such as `MissingTypeArgument`,
`UnknownTypeArgument`, and `IncompatibleTypeArgument`. Invalid descriptors keep
the normal descriptor diagnostics, including `ForbiddenAnyType`.

## Input forms

The input shape must match the selected template port.

### Literal

```ts
inputs: {
  status: { kind: "literal", value: 201 }
}
```

The value is checked against the literal port's supported JSON Schema and
serialized through the structured replacement model.

### Raw code

```ts
inputs: {
  endpoint: { kind: "rawCode", code: "new URL('/profile', request.url)" }
}
```

The snippet must satisfy the raw-code port policy, exact syntax context,
security screening, and any declared type contract.

### Reference

Explicit and shorthand references are equivalent:

```ts
source: { kind: "ref", nodeId: "producer" }
source: { $ref: "producer" }
```

The referenced artifact must satisfy the fragment port's kind, source
allowlist, TypeScript type, and schema constraints.

### Inline node

```ts
source: {
  kind: "inline",
  node: {
    id: "producer",
    templateId: "ValueExpression",
    inputs: {}
  }
}
```

Inline syntax is an authoring convenience. Runtime normalization lifts every
inline node into the graph's global node namespace. Top-level and recursively
inline IDs must therefore be globally unique, and references may cross inline
branches.

### Fragment collection

```ts
statements: {
  kind: "fragmentCollection",
  items: [
    { $ref: "parse" },
    { $ref: "validate" },
    {
      kind: "inline",
      node: { id: "respond", templateId: "ReturnJson", inputs: {} }
    }
  ]
}
```

Every item is checked against the same collection accepts contract. Collection
bounds and authored order are enforced before the parent template is invoked.

## What compilation does

Compilation is a pipeline rather than simple string concatenation:

```txt
catalog snapshot
      |
normalize inline nodes and shorthand refs
      |
validate graph structure, references, and explicit type arguments
      |
instantiate generic input and output contracts
      |
resolve and validate node inputs recursively
      |
invoke templates through marked replacements
      |
validate artifact integrity and syntax
      |
check final goal
      |
optional complete-artifact semantic validation
```

Failures are returned as structured diagnostics. Compilation does not mutate
the authored graph or write generated source to disk.

## Strict and partial compilation

| Mode | Missing required template input | Missing referenced node | Successful result |
| --- | --- | --- | --- |
| Strict | Failure | Graph-repairable failure | Complete final artifact only |
| Partial | Preserved as an artifact marker | Graph-repairable failure | Complete or partial final artifact |

Strict compilation is appropriate when the graph is expected to be complete:

```ts
const result = compileGraph(graph, catalog, { mode: "strict" });

if (result.ok) {
  console.log(result.finalArtifact.code);
}
```

Partial compilation preserves omitted required inputs:

```ts
const repairCatalog = registry.snapshot();
const partial = compileGraph(incompleteGraph, repairCatalog, {
  mode: "partial",
  compilationScope: "job-42"
});

if (partial.ok && partial.finalArtifact.complete === false) {
  for (const input of partial.finalArtifact.unresolvedInputs) {
    console.log(input.id, input.nodeId, input.inputName, input.port);
  }
}
```

The generated partial code remains syntactically valid because unresolved
markers retain the template's placeholder body. Semantic TypeScript validation
is deferred until the final artifact is complete.

Partial mode does not relax generic binding. Missing, extra, malformed, or
constraint-incompatible type arguments are graph errors. When a normal input is
omitted, its unresolved port contains the already-instantiated concrete
contract so a later fill must satisfy the same binding.

## Graph repair versus artifact filling

These are deliberately separate repair channels.

### Graph repair

Use graph repair when the plan is structurally incomplete or incompatible:

- a referenced node does not exist;
- a template ID or input name is unknown;
- a generic argument is missing, extra, malformed, or constraint-incompatible;
- a supplied input uses the wrong shape;
- a producer is incompatible with a fragment port;
- the graph has duplicate IDs or a cycle;
- the final node or goal is invalid.

Graph repair changes the authored plan with `GraphPatchAction` or
`replaceGraph`.

Type bindings can be repaired without replacing the node:

```ts
applyGraphPatch(graph, {
  kind: "setTypeArgument",
  nodeId: "views",
  parameterName: "U",
  typeArgument: { ts: "{ label: string }" }
});

applyGraphPatch(graph, {
  kind: "removeTypeArgument",
  nodeId: "views",
  parameterName: "U"
});
```

Patch application is immutable and transactional. Removing a required binding
is useful while incrementally editing a graph, but that graph remains
repairable until a valid argument is restored.

### Artifact filling

Use artifact filling when the graph structure is valid but a required template
input was intentionally omitted. The compiler has already produced as much code
as possible and exposes an `UnresolvedTemplateInput` with the exact port
contract required for a fill.

```ts
const input = partial.finalArtifact.unresolvedInputs[0];
const filled = fillTemplateArtifactWithCatalog(partial.finalArtifact, {
  [input.id]: { kind: "rawCode", code: "request.user.id" }
}, repairCatalog);
```

Opaque IDs are stable for the captured contract and manifest digests, normalized
graph, and compilation scope. A unique `inputName` may be used as a convenience
alias, but exact IDs are safer for persisted or composed artifacts. A
source-only template change alters the manifest digest and therefore cannot
reuse unresolved IDs from the old implementation.

Persist or transfer the catalog snapshot identity alongside the artifact, then
resume with `fillTemplateArtifactWithCatalog()` or
`finalizeTemplateArtifactWithCatalog()`. These APIs compare provenance and
unresolved ports with the selected catalog template and recursively validate
and security-screen supplied child artifacts. The `t4_` prefix and digest shape
alone are not an identity check.

The shorter `fillTemplateArtifact()` and `finalizeTemplateArtifact()` helpers
are limited to library-produced artifact objects retained in the current
process. Their ownership proof does not survive JSON serialization. They fail
closed for restored, manually constructed, or externally supplied artifacts;
those artifacts require the catalog-aware APIs above.

## Compile-time graph authoring

`buildGraphCompiler()` captures a validated catalog and returns a callable
compiler with catalog-aware authoring helpers:

```ts
const compiler = buildGraphCompiler(catalog);

const checked = compiler.defineGraph({
  nodes: [
    { id: "value", templateId: "ValueExpression", inputs: {} },
    {
      id: "response",
      templateId: "ReturnJson",
      inputs: { value: { $ref: "value" } }
    }
  ],
  finalNodeId: "response",
  goal: { outputKind: "statement" }
});

const result = compiler(checked);
```

For finite literal catalogs and node tuples, TypeScript checks known template
IDs, exact supplied input names, required inputs, input shapes, references,
recursively inline producers, collection items, duplicate IDs, exact generic
argument names, statically provable primitive constraints, and finite
kind/schema compatibility.

Use `compiler.definePartialGraph()` for intentionally incomplete plans. It
still rejects provable mistakes in supplied data but permits missing required
inputs and dangling references/final IDs so an LLM or editor can build the
graph incrementally. Widened dynamic arrays retain runtime validation as the
authority.

For schema-constrained model output, generate the schema from the same captured
catalog. The partial form permits omitted required inputs and dangling string
IDs while still narrowing template IDs, exact generic argument maps, and
supplied input shapes:

```ts
const snapshot = registry.snapshot();
const strictPlannerSchema =
  templateRegistryToSynthesisGraphJsonSchema(snapshot);
const partialPlannerSchema =
  templateRegistryToPartialSynthesisGraphJsonSchema(snapshot);

const repairSummaries = deriveTemplateCapabilityClosure(snapshot.summaries(), {
  kind: "graph",
  graph: acceptedGraph
});
```

These catalog-specific schemas are planner gates, not substitutes for
`compileGraph()`: duplicate IDs, actual reference existence, cycles, producer
compatibility, and final-goal compatibility remain compiler checks.

The capability helper operates only on source-free summaries. It instantiates
the exact type arguments on existing nodes and walks compatible producer
requirements. Generic placeholders, missing or invalid bindings, and
indeterminate comparisons are retained conservatively so a repair role is not
denied an otherwise authorized producer. Results are cloned, deduplicated, and
sorted by model ID. If the graph references an unknown template, the result is
the complete already-authorized summary catalog rather than a guessed subset.

## Runner-based coding loop

`createGraphRunner()` exposes compilation as a repair-oriented state machine:

```ts
const runner = createGraphRunner(catalog, initialGraph);
let state = runner.advance();

while (state.kind !== "complete" && state.kind !== "failed") {
  if (state.kind === "needsGraphRepair") {
    state = runner.advance({
      kind: "addNode",
      node: {
        id: "value",
        templateId: "ValueExpression",
        inputs: {}
      }
    });
    continue;
  }

  if (state.kind === "needsArtifactInputs") {
    const input = state.artifact.unresolvedInputs[0];
    if (!input) throw new Error("Runner reported no unresolved input.");
    state = runner.advance({
      kind: "fill",
      inputs: {
        [input.id]: { kind: "rawCode", code: "request.user.id" }
      }
    });
  }
}
```

A practical LLM loop is:

1. Present template summaries, including type parameters, and the captured
   `c7_` contract digest.
2. Ask for an initial partial graph or one graph patch action.
3. Validate the action against the published runner-action schema.
4. Advance the runner.
5. Return structured diagnostics and the next repair classification.
6. Ask for a graph patch or artifact fill appropriate to that classification.
7. Stop only on `complete` or a genuinely terminal/catalog failure.

Small patch actions make repairs easier to audit than repeatedly replacing the
entire graph. Rejected patches and fills are transactional: the previous graph
or artifact remains available for a corrected attempt.

## Failure classifications

| Classification | Meaning | Normal response |
| --- | --- | --- |
| `graphRepairable` | The authored graph cannot currently compile. | Patch or replace the graph. |
| `artifactFillable` | A partial artifact needs inputs, or a supplied fill was rejected. | Submit a corrected fill or revise the graph. |
| `templatePolicyFailure` | The catalog or template contract is invalid. | Fix and recapture the catalog. |
| `terminalFailure` | Session configuration or persisted state cannot be repaired through the current channel. | Correct configuration/state and restart. |

Classification is contextual and belongs to the failed operation or runner
state, not to an individual diagnostic code.

## Final goals

A goal constrains the observable artifact independently of the selected final
template. For example:

```ts
goal: {
  outputKind: "expression",
  type: {
    ts: "readonly string[]",
    schema: { type: "array", items: { type: "string" } }
  }
}
```

Use goals to state what the caller needs rather than how the graph should
produce it. Output kinds must match exactly. Type and schema compatibility is
directional from the final producer to the goal.

## Semantic validation and insertion context

Syntax validation always runs. Project-aware TypeScript semantic validation is
opt-in and runs only for a complete final artifact:

```ts
const semanticCompiler = buildGraphCompiler(catalog, {
  checkSemanticDiagnostics: true,
  tsConfigFilePath: "./tsconfig.json",
  filePath: "./src/generated/handler.ts",
  semanticContext: {
    prelude: "declare const requestId: string;"
  }
});

const result = semanticCompiler(graph);
```

Use `prelude` for ambient insertion-site bindings. For the most accurate check,
provide `semanticContext.targetFile` with a path, replacement range, and
optional unsaved source buffer. Validation inserts the artifact virtually,
filters pre-existing diagnostics, and never writes the target file.

## Provenance and diagnostics

Artifacts retain:

- the producing template ID and version;
- the producing template's `t4_` manifest digest;
- the concrete generic type arguments used to instantiate the fragment;
- graph node and input provenance;
- literal input summaries where applicable;
- a JSON-safe generated source map;
- unresolved input ownership for partial artifacts.

Semantic diagnostics use the deepest source span at the compiler location, so
errors can identify the child `nodeId`, `templateId`, and `inputName` that
contributed the invalid source rather than blaming only the final node.

Generic binding diagnostics additionally carry `typeParameterName`.
`InvalidTypeArgument`, missing/unknown arguments, incompatible constraints, and
type-argument patch misses are graph repairable. Broad TypeScript descriptor
failures outside a candidate node binding remain terminal, while invalid
generic declarations are template-policy failures.

## Catalog snapshots and reproducibility

Compilers and runners capture an immutable catalog snapshot with two identities:

- `contractDigest` (`c7_…`) hashes planner-facing summaries, generic parameter
  declarations, and compatibility-engine versions, but not marked source;
- `manifestDigest` (`m4_…`) hashes the catalog's exact executable manifests,
  including each template's `t4_…` content digest.

Pass both `expectedCatalogDigest` and `expectedCatalogManifestDigest` when
resuming a persisted session. Either mismatch is terminal. The first prevents
planning against a different vocabulary; the second prevents source-only
implementation changes from silently changing generated code.

The package `0.6.2` matrix is catalog contract 7 (`c7_`), template manifest 4
(`t4_`), catalog manifest 4 (`m4_`), planner schema 4, and capability closure 3.
Planner-schema and closure versions participate in the `c7_` payload. Package
`0.2.x` and earlier databases, artifacts, and `c5_`/`t2_`/`m2_` evidence must be recreated;
there is no migration path.

Closed package contracts reject older manifest identities before fill or
finalization. There is no identity migration: recapture the catalog and
reproduce dependent artifacts.

## Whole files and artifact sets

A final goal may use `outputKind: "sourceFile"` when a graph produces an entire
TypeScript file. Whole-file artifacts do not carry value-level type or JSON
Schema metadata. They are especially useful with the pure artifact-set APIs,
which assemble several graph results without writing to disk:

```ts
const plan: ArtifactSetPlan = {
  artifacts: [
    {
      id: "generated-client",
      graph: clientGraph,
      target: { kind: "createFile", path: "src/generated/client.ts" }
    },
    {
      id: "route-expression",
      graph: routeExpressionGraph,
      target: {
        kind: "replaceRange",
        path: "src/routes.ts",
        start,
        end,
        baseFileHash: createArtifactSetFileHash(routesSource),
        regionKind: "expression"
      }
    }
  ]
};

const compiled = compileArtifactSet(plan, snapshot, {
	workspaceFiles: { "src/routes.ts": routesSource },
	workspaceSnapshotId: "workspace-revision-42",
	tsConfigFilePath: "tsconfig.json",
  expectedCatalogDigest: snapshot.contractDigest,
  expectedCatalogManifestDigest: snapshot.manifestDigest
});
```

`compileArtifactSet()` validates target paths, base hashes, non-overlapping
ranges, graph compilation, artifact integrity, and mandatory project-wide
TypeScript semantics before returning a complete in-memory change set. Partial
mode returns unit artifacts without changes; hash-chained
`ArtifactFillLedgerEntry` values can be replayed later. Use the syntax-only
`assembleArtifactSetTargets(units, catalog, options)` when complete artifacts
already exist. Use `validateArtifactSetStatic(plan, catalog, options)` as the
graph-bound final gate; it recompiles the plan instead of accepting detached
caller-constructed artifacts. Successful static results bind both catalog
digests, the workspace snapshot hash, and the static-policy version into the
change-set identity. None of these APIs modifies workspace files.

## Serialization and schemas

Graphs, explicit type arguments, actions, runner states, artifacts, diagnostics,
and template summaries are JSON-safe. Published schemas support
schema-constrained model output:

- `schemas/template-manifest.schema.json`
- `schemas/synthesis-graph.schema.json`
- `schemas/template-summary.schema.json`
- `schemas/graph-compilation-result.schema.json`
- `schemas/graph-runner-action.schema.json`
- `schemas/graph-runner-state.schema.json`
- `schemas/artifact-set-plan.schema.json`
- `schemas/artifact-set-compilation-result.schema.json`
- `schemas/artifact-set-static-validation-result.schema.json`

These schemas validate the general wire structure. The registry-generated strict
and partial graph schemas add catalog-specific template and supplied-input
constraints; reference topology and semantic compatibility remain compiler
responsibilities.

## Design guidance

- Plan against immutable summaries and a captured `c7_` digest; execute against
  both captured catalog identities.
- Bind every generic parameter explicitly and persist those bindings with the
  graph; do not treat artifact metadata as type inference.
- Prefer small templates with explicit ports over large raw-code escape hatches.
- Use `definePartialGraph()` for incremental authoring, not as a way to bypass
  runtime validation.
- Treat unknown references as graph repairs and omitted inputs as artifact fills.
- State caller requirements in the final goal.
- Enable semantic validation when generated code depends on project context.
- Persist the graph, partial artifact, both catalog digests, and compilation
  scope together for durable repair jobs, and resume fills against the same
  captured catalog snapshot.
- Use exact unresolved IDs when multiple nodes share an input name.

## Related material

- [Graph Template Authoring](./TEMPLATES.md)
- [Project glossary](../GLOSSARY.md)
- [README graph API reference](../README.md#synthesis-graphs)
