# Workspace Constraints

Workspace Constraints is a declarative language for describing properties that
must hold across generated artifacts and the surrounding TypeScript workspace.
It complements [graph templates](./TEMPLATES.md) and
[synthesis graphs](./SYNTHESIS_GRAPHS.md): templates control how source is
produced, while constraints decide whether the resulting file tree satisfies
project-wide structural and semantic rules.

This document is the authoring guide. See the
[product description](./workspace-constraints-product-description.md) for the
product boundary and the
[technical design](./workspace-constraints-technical-design.md) for the
normalized representation, evaluator, identity, and runtime protocol.

> **Design status:** This document specifies a proposed v1 language. The parser,
> evaluator, schemas, and runtime APIs are not implemented yet.

## Mental model

A constraint set is data that is compiled and evaluated, never executable
project code:

```text
.wsc authoring modules
        |
parse, resolve imports, and type-check
        |
canonical WorkspaceConstraintSet JSON
        |
extract bounded workspace facts
        |
evaluate baseline and candidate views
        |
structured, provenance-aware diagnostics
```

The normal repository entry point is:

```text
.synthesize-regions/constraints.wsc
```

A synthesis request names that entry path and its expected normalized
`constraintDigest`. The captured constraint modules are immutable for the
session and cannot be synthesis targets.

## First constraint set

The examples use a feature layout in which controllers have matching route
files, feature modules expose a public index, and handlers implement a common
type.

```wsc
constraints "feature-modules" version 1 {
  import "./constraints/shared.wsc"

  rule "controllers-have-routes" {
    phase assembled
    mode candidate
    severity error

    select files "src/features/:feature/:name.controller.ts" as controller

    require file(
      "src/features/${controller.capture.feature}/${controller.capture.name}.routes.ts"
    )
  }

  rule "changed-feature-files-have-no-default-export" {
    phase assembled
    mode changed
    severity error

    select files "src/features/**/*.ts" as source
    require source.exports.default.count == 0
  }

  rule "handlers-have-route-handler-type" {
    phase semantic
    mode noNewViolations
    severity error

    select exports named "handler"
      from files "src/features/**/*.routes.ts"
      as handler

    require handler.type assignableTo type("RouteHandler")
  }
}
```

Every rule declares:

- a stable ID;
- the earliest evaluation phase;
- an explicit baseline/candidate enforcement mode;
- a gating severity;
- a selector that binds typed subjects;
- one or more boolean requirements.

Rules are declarative. They cannot call JavaScript, load compiler plugins,
invoke project commands, or define arbitrary AST visitors.

## Imports and modules

The entry module may import other `.wsc` modules using normalized relative
paths:

```wsc
constraints "workspace" version 1 {
  import "./constraints/features.wsc"
  import "./constraints/dependencies.wsc"
}
```

Imported modules declare reusable rule groups and may explicitly import other
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

Import paths:

- must be relative and end in `.wsc`;
- resolve relative to the importing module;
- must remain below the configured constraint root;
- are resolved once from the immutable workspace snapshot;
- may not form cycles;
- may not produce duplicate constraint-set, module, or rule IDs.

Import order does not define rule precedence. After import resolution, rules are
canonicalized by stable identity. Two modules cannot override one another
implicitly.

## Workspace views and enforcement modes

The evaluator exposes two immutable workspace views:

- `baseline` is the captured workspace before candidate edits;
- `candidate` is the same snapshot with the proposed artifact set assembled
  in memory.

Every rule must choose one enforcement mode. There is no implicit default.

### `candidate`

Every selected subject in the complete candidate view must satisfy the rule.
Legacy violations fail the candidate even if synthesis did not touch them.

```wsc
rule "every-feature-has-index" {
  phase assembled
  mode candidate
  severity error

  select directories "src/features/:feature" as feature
  require file("${feature.path}/index.ts")
}
```

This passes only when every selected feature directory has an `index.ts`.

### `changed`

Only selected files, directories, artifacts, or ranges changed or created by
the candidate are checked.

```wsc
rule "changed-files-use-named-exports" {
  phase assembled
  mode changed
  severity error

  select files "src/features/**/*.ts" as source
  require source.exports.default.count == 0
}
```

An untouched legacy default export does not fail this rule. Adding one to a
changed file does.

### `noNewViolations`

The evaluator compares stable violation keys between baseline and candidate.
Pre-existing violations remain visible for context but do not gate acceptance;
new violations and worsened multiplicities do.

```wsc
rule "feature-import-boundary" {
  phase semantic
  mode noNewViolations
  severity error

  select imports
    from files "src/features/:feature/**/*.ts"
    as dependency

  require dependency.resolvedPath is under(
    "src/features/${dependency.file.capture.feature}/**",
    "src/shared/**"
  )
}
```

Removing a violation passes. Preserving the same violation does not introduce a
failure. Adding another forbidden dependency does.

## Evaluation phases

A rule runs no earlier than its declared phase. It is re-evaluated whenever a
later candidate revision changes facts on which it depends.

| Phase | Available subjects and facts | Typical rules |
| --- | --- | --- |
| `plan` | Artifact IDs, goals, targets, paths, create/replace operations | Allowed layouts, required planned companions, artifact counts |
| `artifact` | Compiled fragments, graph nodes, template provenance, raw inputs, generated ranges | Approved template use, raw-code limits, provenance ownership |
| `assembled` | Candidate files, directories, parsed syntax, imports and exports | File relationships, naming, declaration shape |
| `semantic` | Resolved modules, symbols, signatures, TypeScript types and assignability | Dependency architecture, interface conformance, cross-file joins |

Declaring an earlier phase does not permit access to later facts. An invalid
phase/fact combination is rejected while compiling the constraint set.

### Plan example

```wsc
rule "generated-files-stay-in-feature-tree" {
  phase plan
  mode changed
  severity error

  select artifacts where target.kind == "createFile" as artifact
  require artifact.target.path matches "src/features/**/*.ts"
}
```

### Artifact and provenance example

```wsc
rule "services-use-reviewed-templates" {
  phase artifact
  mode changed
  severity error

  select generated ranges
    in files "src/features/**/*.service.ts"
    as generated

  require generated.provenance.templateId in {
    "ServiceDeclaration",
    "ServiceMethod",
    "NamedImport"
  }
}
```

### Assembled example

```wsc
rule "controller-class-is-exported" {
  phase assembled
  mode candidate
  severity error

  select files "src/features/:feature/:name.controller.ts" as controller
  require exactly 1 controller.declarations where {
    kind == "class" and
    name == pascal(controller.capture.name) + "Controller" and
    modifiers contains "export"
  }
}
```

### Semantic example

```wsc
rule "handler-signatures" {
  phase semantic
  mode noNewViolations
  severity error

  select exports named "handler"
    from files "src/features/**/*.routes.ts"
    as handler

  require handler.type assignableTo type("RouteHandler")
  require all handler.signatures as signature {
    signature.returnType assignableTo type("Response | Promise<Response>")
  }
}
```

## Selectors and path captures

Selectors produce typed, bounded collections. Common subject families include:

```wsc
select files "src/**/*.ts" as source
select directories "src/features/:feature" as feature
select declarations where kind == "class" as declaration
select imports from files "src/**/*.ts" as dependency
select exports named "handler" from files "**/*.routes.ts" as handler
select artifacts where target.kind == "createFile" as artifact
select generated ranges in files "**/*.service.ts" as generated
```

The path syntax supports:

- `*` for one path segment;
- `**` for zero or more complete segments;
- `:name` for one captured segment;
- literal suffixes such as `:name.controller.ts`.

Captures are lexical path values, not regular-expression groups. They can be
referenced through `subject.capture.<name>` and interpolated only into path
templates. Normalized interpolation cannot introduce `..`, absolute paths, or
path separators inside one capture.

## Typed expressions and facts

The language type-checks selectors and expressions before evaluation. V1 facts
cover:

- `Path`, `File`, `Directory`, and path captures;
- `Artifact`, target, goal, and changed-range metadata;
- `Declaration`, `Import`, `Export`, decorator, and modifier facts;
- `Symbol`, `Signature`, `Type`, and resolved dependency facts;
- `GeneratedRange`, graph node, template, input, and raw-code provenance;
- bounded `Collection<T>` values and scalar booleans, strings, and integers.

Expressions include typed equality, membership, path predicates, collection
quantifiers, joins, aggregates, and TypeScript assignability:

```wsc
require source.path is under("src/**")
require source.imports.count <= 20
require all source.imports as dependency { dependency.isTypeOnly }
require some source.exports as exported { exported.name == "handler" }
require exactly 1 source.declarations where { kind == "class" }
require handler.type assignableTo type("RouteHandler")
```

There are no user-defined functions or arbitrary recursion. Convenience
operations such as `pascal()` are versioned, library-owned functions with
fixed input and output types.

## Cross-file joins

Joins are explicit and bounded:

```wsc
rule "routes-export-controller-handler" {
  phase semantic
  mode candidate
  severity error

  select files "src/features/:feature/:name.controller.ts" as controller
  join files
    "src/features/${controller.capture.feature}/${controller.capture.name}.routes.ts"
    as routes

  require some routes.exports as exported {
    exported.name == "handler" and
    exported.dependencies contains controller.moduleSymbol
  }
}
```

The constraint compiler estimates join width from selectors and configured
budgets. Unbounded Cartesian joins are rejected rather than attempted.

## Complete feature-module example

```wsc
constraints "feature-modules" version 1 {
  rule "controller-route-pair" {
    phase assembled
    mode candidate
    severity error

    select files "src/features/:feature/:name.controller.ts" as controller
    require file(
      "src/features/${controller.capture.feature}/${controller.capture.name}.routes.ts"
    )
  }

  rule "changed-source-has-named-exports" {
    phase assembled
    mode changed
    severity error

    select files "src/features/**/*.ts" as source
    require source.exports.default.count == 0
  }

  rule "route-dependencies-stay-bounded" {
    phase semantic
    mode noNewViolations
    severity error

    select imports
      from files "src/features/:feature/**/*.routes.ts"
      as dependency

    require dependency.resolvedPath is under(
      "src/features/${dependency.file.capture.feature}/**",
      "src/shared/**"
    )
  }

  rule "generated-service-provenance" {
    phase artifact
    mode changed
    severity error

    select generated ranges
      in files "src/features/**/*.service.ts"
      as generated

    require generated.provenance.templateId in {
      "ServiceDeclaration",
      "ServiceMethod",
      "NamedImport"
    }
  }

  rule "route-handler-contract" {
    phase semantic
    mode noNewViolations
    severity error

    select exports named "handler"
      from files "src/features/**/*.routes.ts"
      as handler

    require handler.type assignableTo type("RouteHandler")
  }
}
```

A successful candidate might create
`src/features/orders/orders.routes.ts` beside an existing controller, use only
approved templates for a generated service, preserve feature dependency
boundaries, and export a handler assignable to `RouteHandler`.

Failures remain separate:

- a missing routes file is an assembled, set-repairable violation;
- an unapproved generated template is an artifact provenance violation;
- a forbidden resolved import is a semantic graph or set repair;
- an incompatible handler is a semantic graph/input repair when provenance
  provides exact ownership.

## Diagnostics

Constraint failures are structured:

```json
{
  "stage": "policy",
  "code": "WorkspaceConstraintFailed",
  "severity": "error",
  "ruleId": "route-handler-contract",
  "phase": "semantic",
  "mode": "noNewViolations",
  "outcome": "failed",
  "path": "src/features/orders/orders.routes.ts",
  "line": 8,
  "column": 14,
  "artifactId": "orders-routes",
  "nodeId": "handler",
  "templateId": "RouteHandlerDeclaration",
  "expected": "assignable to RouteHandler",
  "actual": "(request: Request) => string",
  "repairHints": [
    {
      "kind": "repairGraph",
      "message": "Change the handler-producing graph composition."
    }
  ]
}
```

`outcome: "indeterminate"` is distinct from a false assertion. It indicates
that mandatory facts could not be established, for example because a selector
leaves the captured analysis roots or TypeScript cannot resolve a required
type. An indeterminate error rule fails closed.

Warnings are reported but do not gate static acceptance.

## Analysis visibility and authority

Directory-wide analysis requires more visibility than an exact replacement
range. A request therefore captures read-only analysis roots separately from
write authorization.

- Analysis roots let the evaluator parse source and derive facts.
- They do not grant create or replacement authority.
- They do not automatically disclose source to a model.
- Model prompts receive bounded summaries and actionable diagnostics.
- A selector requiring files outside captured roots is indeterminate.
- Constraint modules themselves are immutable session inputs.

Workspace Constraints never authorize a target. Existing replacement targets
and allowed create roots remain the only source of write authority.

## Repair behavior

Diagnostics are routed deterministically:

| Violation | Repair route |
| --- | --- |
| Local graph composition or template choice | Graph Repairer |
| One raw or literal input | Input Synthesizer |
| Missing/extra artifact or target/goal layout | Artifact-Set Repairer |
| Invalid constraint module, stale digest, inaccessible mandatory analysis | Terminal policy or stale-state failure |
| Unattributable cross-artifact semantic relationship | Set-level repair |

The Artifact-Set Repairer may propose one bounded plan patch, such as adding a
companion artifact outline. It cannot grant a target, edit constraint modules,
or bypass static acceptance. Added or invalidated artifacts return through
normal graph planning and compilation.

## Limits and non-goals

The runtime bounds module count and bytes, rules, selected subjects, fact rows,
expression depth, joins, compiler work, diagnostics, and evaluation time.
Exhausting a mandatory analysis budget is not success.

Workspace Constraints do not:

- execute generated code or prove runtime behavior;
- run builds, tests, linters, package managers, or shell commands;
- load TypeScript validators, compiler plugins, or project modules;
- grant filesystem authority;
- allow a model to change the active rules;
- replace template port contracts or TypeScript compiler validation.

They add a deterministic project-invariant layer to the existing static
acceptance pipeline.
