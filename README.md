# synthesize-regions

Controlled TypeScript source-template replacement built on
[`ts-morph`](https://ts-morph.com/).

`synthesize-regions` replaces source regions that are explicitly marked with
paired block comments. It scans template text, validates each marked placeholder
against a TypeScript AST context, serializes structured replacement objects, and
validates the generated TypeScript before returning it.

See the [project glossary](./GLOSSARY.md) for terminology used by the
replacement engine, synthesis graph, repair protocol, and validation layers.

This is intentionally not a macro language. It does not execute template code,
inject imports, resolve dependencies, or transform arbitrary AST nodes. It only
replaces regions marked with `@TYPE` and `@END`.

## Install

```bash
npm install synthesize-regions
```

This package is ESM-only and exports TypeScript declarations from `dist`.

For local development:

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Quick Start

```ts
import { generateWithReplacements, type ReplacementMap } from "synthesize-regions";

const sourceText = `
const x = /** @TYPE expression id=value **/ replaceMe /** @END **/;
`;

const replacements: ReplacementMap = {
  value: { kind: "expression", code: "input.foo + 1" }
};

const result = generateWithReplacements(sourceText, replacements);

console.log(result.code);
// const x = input.foo + 1;
```

The full marked region is replaced, including both comments. Marker comments do
not appear in generated code.

## Marker Syntax

```ts
/** @TYPE <ExpectedKind> id=<replacementId> **/
placeholderSource
/** @END **/
```

`<ExpectedKind>` is optional. When omitted, discovery infers the kind from the
placeholder syntax:

```ts
const value = /** @TYPE id=value **/ oldValue /** @END **/;
```

Use `[]` for list replacements:

```ts
const values = [
  /** @TYPE expression[] id=items **//** @END **/
];
```

Supported marker kinds:

```ts
type MarkerExpectedKind =
  | "identifier"
  | "expression"
  | "expressionSuffix"
  | "statement"
  | "array"
  | "object"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "objectProperty";
```

List markers require non-empty replacement arrays. `expressionSuffix[]` is not
supported; compose suffix snippets yourself and pass one `expressionSuffix`
replacement.

Single-replacement regions must contain syntactic placeholder source. Empty
regions are supported for list insertion in expression-list, statement-list, and
object-literal contexts.

## Replacement Model

```ts
type Replacement =
  | { kind: "identifier"; name: string }
  | { kind: "expression"; code: string }
  | { kind: "expressionSuffix"; code: string }
  | { kind: "statement"; code: string }
  | { kind: "array"; elements: ReplacementExpression[] }
  | { kind: "object"; properties: Record<string, ReplacementExpression> }
  | { kind: "objectProperty"; name: string; value: ReplacementExpression; computed?: boolean }
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "null" };

type ReplacementMap = Record<string, Replacement | Replacement[]>;
```

Compatibility is checked against each marker:

```ts
const sourceText = `
function transform(input: Input): Output {
  /** @TYPE statement[] id=body **/
  throw new Error("todo");
  /** @END **/
}
`;

const result = generateWithReplacements(sourceText, {
  body: [
    { kind: "statement", code: "const value = input.foo + 1;" },
    { kind: "statement", code: "return { value };" }
  ]
});

console.log(result.code);
// function transform(input: Input): Output {
//   const value = input.foo + 1;
//   return { value };
// }
```

Duplicate region IDs are allowed. Every region with the same ID receives the
same replacement value.

## Generation Options

```ts
interface GenerateOptions {
  filePath?: string;
  tsConfigFilePath?: string;
  checkSemanticDiagnostics?: boolean;
  format?: "preserve" | "ts-morph";
  allowUnusedReplacements?: boolean;
  securityPolicy?: SecurityPolicyOptions;
  templateMode?: TemplateMode;
}
```

By default, generation:

- treats the input as a full TypeScript file
- preserves surrounding formatting as much as possible
- validates syntactic diagnostics only
- rejects replacement IDs that are not used by any region
- applies the default security policy to raw code replacements

Use `format: "ts-morph"` to format the final output with `ts-morph`. Use
`checkSemanticDiagnostics: true` when generated code should also pass TypeScript
semantic diagnostics in the provided project context.

File-based generation is also available:

```ts
import { generateFileWithReplacements } from "synthesize-regions";

const result = generateFileWithReplacements("template.ts", replacements, {
  tsConfigFilePath: "tsconfig.json"
});
```

## Partial Template Modes

`templateMode` lets you validate fragments that are not complete files. The
fragment is checked inside a synthetic wrapper, but `result.code` contains only
the generated fragment.

```ts
type TemplateMode =
  | { kind: "file" }
  | { kind: "expression" }
  | { kind: "expressionSuffix" }
  | { kind: "statementList" }
  | { kind: "objectPropertyList" };
```

Expression fragment:

```ts
const result = generateWithReplacements(
  "/** @TYPE expression id=value **/ replaceMe /** @END **/ + 1",
  { value: { kind: "expression", code: "input.foo" } },
  { templateMode: { kind: "expression" } }
);

console.log(result.code);
// input.foo + 1
```

Statement-list fragment:

```ts
const result = generateWithReplacements(
  `/** @TYPE statement[] id=body **/
throw new Error("todo");
/** @END **/`,
  {
    body: [
      { kind: "statement", code: "const x = input.value;" },
      { kind: "statement", code: "return x;" }
    ]
  },
  { templateMode: { kind: "statementList" } }
);

console.log(result.code);
// const x = input.value;
// return x;
```

Object-property-list fragment:

```ts
const result = generateWithReplacements(
  "/** @TYPE objectProperty[] id=props **//** @END **/",
  {
    props: [
      { kind: "objectProperty", name: "mode", value: { kind: "string", value: "strict" } },
      { kind: "objectProperty", name: "count", value: { kind: "number", value: 3 } }
    ]
  },
  { templateMode: { kind: "objectPropertyList" } }
);

console.log(result.code);
// mode: "strict",
// count: 3
```

`expressionSuffix` is for receiver-dependent fragments such as fluent-chain
continuations. Suffixes must begin with `.` or `?.`.

```ts
const suffix = generateWithReplacements(
  `.with({ type: "video" }, /** @TYPE expression id=handler **/ x => x /** @END **/)`,
  { handler: { kind: "expression", code: "(x) => [x]" } },
  { templateMode: { kind: "expressionSuffix" } }
).code;

const result = generateWithReplacements(
  `const output = match(input)/** @TYPE expressionSuffix id=caseSuffix **/.otherwise(() => null)/** @END **/;`,
  { caseSuffix: { kind: "expressionSuffix", code: suffix } }
);

console.log(result.code);
// const output = match(input).with({ type: "video" }, (x) => [x]);
```

Partial templates still receive final validation inside their synthetic wrapper.
Returned `ReplacementRegion` offsets remain relative to the original fragment.

## Synthesis Graphs

The higher-level template layer can model code generation as a typed graph. Each
template is a graph operator with explicit input ports and one output port. Graph
compilation validates node references, input compatibility, basic type metadata,
and then invokes the existing marker replacement engine for final TypeScript
generation.

```ts
import {
  buildGraphCompiler,
  applyGraphPatch,
  compileGraph,
  createGraphRunner,
  createTemplateRegistry,
  defineTemplateCatalog,
  definePartialGraph,
  defineTemplate,
  fillTemplateArtifact,
  fragmentPort,
  literalPort,
  rawCodePort,
  unionPort,
  type SynthesisGraph,
  type TypeDescriptor
} from "synthesize-regions";

const BooleanArrayLiteral = defineTemplate({
  modelId: "BooleanArrayLiteral",
  version: "1.0.0",
  inputs: {
    values: literalPort({
      regionKind: "expression",
      schema: { type: "array", items: { type: "boolean" } }
    })
  },
  output: {
    kind: "expression",
    type: {
      ts: "boolean[]",
      schema: { type: "array", items: { type: "boolean" } }
    }
  },
  template: region => region("values")
});

const MapBooleanArray = defineTemplate({
  modelId: "MapBooleanArray",
  version: "1.0.0",
  inputs: {
    source: fragmentPort({
      regionKind: "expression",
      accepts: {
        outputKind: "expression",
        type: { ts: "boolean[]" }
      }
    })
  },
  output: {
    kind: "expression",
    type: { ts: "boolean[]" }
  },
  template: region => `${region("source")}.map(x => Boolean(x))`
});

const catalog = defineTemplateCatalog([
  BooleanArrayLiteral,
  MapBooleanArray
] as const);
const registry = createTemplateRegistry(catalog);

const graph: SynthesisGraph = {
  nodes: [
    {
      id: "source",
      templateId: "BooleanArrayLiteral",
      inputs: {
        values: { kind: "literal", value: [true, false, true] }
      }
    },
    {
      id: "mapped",
      templateId: "MapBooleanArray",
      inputs: {
        source: { kind: "ref", nodeId: "source" }
      }
    }
  ],
  finalNodeId: "mapped",
  goal: {
    outputKind: "expression",
    type: { ts: "boolean[]" }
  }
};

const result = compileGraph(graph, registry, { mode: "strict" });

if (result.ok) {
  console.log(result.finalArtifact.code);
  // [true, false, true].map(x => Boolean(x))
}
```

### Validated and reproducible catalogs

Catalogs are validated before graph compilation. `defineTemplateCatalog()`,
initial registry construction, and every registry mutation reject duplicate
template IDs, invalid or mixed-region unions, invalid collection bounds,
malformed raw-code policies, and broken fragment source allowlists. Use
`validateTemplateCatalog()` when diagnostics are preferable to an exception;
construction and mutation throw `TemplateCatalogValidationError` containing all
catalog issues.

Registry mutations are explicit and atomic:

```ts
const registryForUpdates = createTemplateRegistry();

registryForUpdates.register(BooleanArrayLiteral); // insert only
registryForUpdates.registerAll([MapBooleanArray]); // one validated batch
registryForUpdates.replace(MapBooleanArray); // existing modelId only
```

`registerAll()` permits forward and mutually referencing templates within its
batch. Self references and an explicit empty `sourceModelIds` allowlist are also
valid. A failed registration or replacement leaves the registry unchanged,
including its ordering and digest. `list()` and `summaries()` are always sorted
by `modelId`, independent of registration order.

Use a snapshot and its planner-contract digest to keep planning and execution on
the same catalog contract:

```ts
const snapshot = registry.snapshot();
const compiler = buildGraphCompiler(registry);
const digest = snapshot.contractDigest; // c2_<sha256>
const runner = createGraphRunner(snapshot, graph, {
  expectedCatalogDigest: digest
});

console.log(compiler.contractDigest === digest); // true
console.log(runner.contractDigest === digest); // true

const result = compileGraph(graph, snapshot, {
  mode: "strict",
  expectedCatalogDigest: digest
});
```

Snapshots implement the read-only `TemplateCatalogView` API and capture
immutable membership, summaries, and digest. Compilation and registry-specific
schema generation accept this view without requiring a mutable registry. Graph
compilers and runners likewise capture one catalog snapshot when created, so
later registry mutations do not alter an active session. A mismatched
`expectedCatalogDigest` returns a `CatalogDigestMismatch` diagnostic; a runner
transitions to `failed` for the same mismatch.

The versioned `c2_` digest hashes normalized planner-facing summaries, including
versions, descriptions, inputs, defaulted port settings, policies, allowlists,
canonical schemas, types, and outputs. Its payload also identifies the supported
JSON Schema profile and the schema and TypeScript compatibility-engine versions.
It intentionally excludes template function source. Change a template's
`version` when implementation behavior changes without a metadata change.
Snapshot membership is frozen, while executable closure purity remains the
template author's responsibility.

Partial compilation preserves required inputs as durable artifact markers. Each
entry in `unresolvedInputs` has a stable opaque ID; use that ID when filling a
persisted artifact. A unique `inputName` is accepted as a convenience alias,
but unknown, ambiguous, conflicting, repeated, and post-completion fills are
rejected with structured diagnostics.

```ts
const partial = compileGraph(incompleteGraph, registry, {
  mode: "partial",
  compilationScope: "repair-job-42"
});

if (partial.ok && partial.finalArtifact.complete === false) {
  const input = partial.finalArtifact.unresolvedInputs[0];
  const filled = fillTemplateArtifact(partial.finalArtifact, {
    [input.id]: { kind: "rawCode", code: "request.user.id" }
  });
}
```

Without `compilationScope`, IDs are reproducibly derived from the normalized
graph. Supply a stable job or session ID when separately persisted instances of
the same graph may later be merged; use distinct scopes when those instances
must remain independent. Artifact filling verifies that unique marker IDs and
`unresolvedInputs` correspond exactly before and after every operation. One
logical ID may appear at multiple code locations when a partial child is reused,
and one fill intentionally resolves every such occurrence.

For authored template catalogs, `buildGraphCompiler(...).defineGraph(...)`
checks the graph against the catalog while it is written. This checking is
recursive: inline nodes and inline collection items must select known
templates, provide exact required inputs, and produce compatible fragments.
All top-level and inline node IDs share one namespace for references and must be
unique, matching the graph produced by runtime inline-node normalization.

### Typed graph repair protocol

Use `definePartialGraph()` (or `compiler.definePartialGraph()`) for a graph that
is intentionally incomplete. Finite partial graphs still validate template IDs,
provided input names and shapes, compatible references whose targets exist,
recursive inline nodes, and globally unique IDs. They may omit required inputs
and temporarily reference a node or final ID that has not been authored yet.

```ts
const partialGraph = compiler.definePartialGraph({
  nodes: [{
    id: "mapped",
    templateId: "MapBooleanArray",
    inputs: { source: { $ref: "source" } }
  }],
  finalNodeId: "mapped"
});

const repairRunner = createGraphRunner(compiler, partialGraph);
let repairState = repairRunner.advance();

if (repairState.kind === "needsGraphRepair") {
  repairState = repairRunner.advance({
    kind: "addNode",
    node: { id: "source", templateId: "BooleanArrayLiteral", inputs: {} }
  });
}

if (repairState.kind === "needsArtifactInputs") {
  const inputId = repairState.artifact.unresolvedInputs[0].id;
  repairState = repairRunner.advance({
    kind: "fill",
    inputs: { [inputId]: { kind: "literal", value: [true, false] } }
  });
}
```

Runner actions include `addNode`, `removeNode`, `setInput`, `removeInput`,
`setFinalNode`, `setGoal`, and `removeGoal`, plus the `replaceGraph` escape
hatch and artifact `fill`. Patches are immutable and transactional. IDs target
top-level or recursively inline nodes; removing an inline node removes its
containing input or collection item without cascading to references.
`applyGraphPatch()` exposes the same patch behavior without creating a runner.
Failed graph-compilation and artifact operations expose the same contextual
`classification` field as actionable runner states.

| Classification | Expected response |
| --- | --- |
| `graphRepairable` | Submit a patch action or `replaceGraph`. |
| `artifactFillable` | Submit a corrected `fill`, or patch/replace the graph. |
| `templatePolicyFailure` | Correct the template catalog or policy before starting a new session. |
| `terminalFailure` | Correct the session/configuration contract before restarting. |

Rejected patches preserve the previous graph. Rejected fills preserve the
previous partial artifact, including syntax, policy, compatibility, and
semantic TypeScript failures caused by that fill, so the next action can supply
a correction. Invalid actions after a terminal state remain terminal.
`BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES` and
`BuiltInSynthesisDiagnosticCode` enumerate package-provided codes, while
`SynthesisDiagnostic.code` remains open for producer-defined diagnostics.

Graph compilation can opt into project-aware TypeScript semantic validation of
the complete final artifact:

```ts
const checked = compileGraph(graph, registry, {
  checkSemanticDiagnostics: true,
  tsConfigFilePath: "./tsconfig.json",
  filePath: "./src/generated/route.ts",
  semanticContext: {
    prelude: "declare const requestId: string;"
  }
});
```

Semantic validation is disabled by default and never runs while a partial
artifact still has unresolved inputs. Compiler failures are returned as
structured `TypeScriptSemanticError` graph diagnostics with compiler codes,
categories, and artifact-relative locations. Use `semanticContext.prelude` for
bindings or ambient declarations supplied by the artifact's eventual insertion
site.

For the real lexical and import context, validate through a read-only virtual
replacement in a target file:

```ts
const checked = compileGraph(graph, registry, {
  checkSemanticDiagnostics: true,
  tsConfigFilePath: "./tsconfig.json",
  semanticContext: {
    targetFile: {
      filePath: "./src/routes.ts",
      start: placeholderStart,
      end: placeholderEnd,
      // Optional unsaved editor buffer; otherwise filePath is read from disk.
      sourceText: openDocumentText
    }
  }
});
```

Target offsets are zero-based UTF-16 offsets and `end` is exclusive; omit
`end` for a pure insertion. The target is never written. Existing unrelated
target diagnostics are filtered, while diagnostics introduced by the virtual
replacement use the target path and retain artifact-relative `line` and
`column`. Invalid target paths or ranges produce terminal
`InvalidSemanticTarget` diagnostics.

Graph-produced artifacts carry a JSON-safe `sourceMap` v1. Its half-open
UTF-16 spans record overlapping node and input ownership with increasing
`nestingDepth`. Maps survive fragment collections, repeated children,
`format: "ts-morph"`, artifact filling, and JSON round trips. Semantic
diagnostics select the deepest span at the compiler location, so `nodeId`,
`templateId`, and `inputName` identify the graph decision that contributed the
code. Older or external artifacts may omit the map; attribution then falls back
to the final artifact. Malformed persisted maps are rejected before validation.

Graph validation always derives expression, suffix, statement-list, or
object-property wrappers from the artifact's output kind. A caller-provided
`templateMode` remains supported by the low-level generation API but is ignored
by graph compilation.

### Type and schema compatibility

Compatibility is directional: a producer's advertised TypeScript type must be
assignable to the consumer type, and every value allowed by its JSON Schema
must also be allowed by the consumer schema. `TypeDescriptor.ts` is an
enforceable author assertion, not documentation. It must be a self-contained
type expression resolvable from the ES2022 standard library; project-local
names and any occurrence of `any` are rejected when the catalog is registered.
Compiler assignability handles structural types, unions, tuples, functions,
readonly containers, and nested generics.

```ts
const users = {
  ts: "ReadonlyArray<{ readonly id: string }>",
  schema: {
    type: "array",
    items: {
      type: "object",
      properties: { id: { type: "string", minLength: 1 } },
      required: ["id"],
      additionalProperties: false
    }
  }
} satisfies TypeDescriptor;
```

`SupportedJsonSchema` is a closed Draft 2020-12 profile. It supports boolean
schemas; local `$defs`/JSON Pointer `$ref`; const and enum; allOf, anyOf,
oneOf, not, and conditionals; primitive constraints and bounds; object
properties, dependencies, and unevaluated properties; and homogeneous arrays,
prefix-item tuples, contains, and unevaluated items. Remote references, IDs and
anchors, dynamic references, unknown keywords, and legacy draft keywords are
rejected. `format` and content keywords are preserved as annotations and do not
reject values.

`JSON_SCHEMA_DIALECT_URI`, `SUPPORTED_JSON_SCHEMA_VERSION`,
`JSON_SCHEMA_COMPATIBILITY_ENGINE_VERSION`,
`SUPPORTED_JSON_SCHEMA_KEYWORD_VALUES`, and
`SUPPORTED_JSON_SCHEMA_TYPE_VALUES` expose the exact versioned profile used by
validation and catalog digests.

Schema subsumption is deliberately sound and conservative. Common structural
relationships are proven directly. Exact canonical schemas always match; an
advanced relationship that cannot be proven fails with
`SchemaCompatibilityIndeterminate` instead of being guessed compatible.
Literal validation, fragment and final-goal compatibility, catalog allowlists,
and registry-generated planner schemas all use this same engine.

The structured compatibility helpers are available when a planner or host needs
to validate contracts before compiling a graph:

```ts
const schemaValidation = validateSupportedJsonSchema({
  type: "array",
  items: { type: "integer" }
});
const valueValidation = validateJsonValueAgainstSchema(
  [1, 2],
  { type: "array", items: { type: "integer" } }
);
const schemaComparison = compareJsonSchemas(
  { type: "integer" }, // producer
  { type: "number" }   // consumer
);
const descriptorComparison = compareTypeDescriptors(
  { ts: "string", schema: { type: "string" } },
  { ts: "string | number", schema: { type: ["string", "number"] } }
);
```

`compareTypeDescriptors(actual, expected)` returns `compatible`,
`incompatible`, `indeterminate`, or `invalid`; invalid metadata takes
precedence over incompatibility, which takes precedence over indeterminacy.
The older `isTypeCompatible()` and `validateJsonSchemaSubset()` exports remain
as deprecated boolean/single-error adapters. They never treat invalid or
indeterminate contracts as compatible.

`TypeDescriptor.schema` is the canonical schema location. The older standalone
`schema` fields on outputs, artifacts, and goals remain readable aliases for
persisted data. When both forms are supplied they must be provably equivalent;
new templates should place schema metadata inside `type.schema`.

When synthetic semantic checking validates an advertised `expressionSuffix`
type, a suffix result that remains `any` through the synthetic receiver is
rejected instead of being accepted vacuously. Virtual target-file insertion
uses the real receiver expression and enforces the advertised suffix result
there; without target context, a suffix can use an explicit assertion or
narrowing to establish a concrete advertised result.

Raw-code ports are opt-in and can carry a small policy for planner-provided
snippets:

```ts
const RawScoreExpression = defineTemplate({
  modelId: "RawScoreExpression",
  inputs: {
    score: rawCodePort({
      regionKind: "expression",
      policy: {
        maxLength: 80,
        allowNewlines: false,
        forbiddenSubstrings: ["process"],
        forbiddenPatterns: ["\\beval\\s*\\("]
      },
      type: { ts: "number" }
    })
  },
  output: {
    kind: "expression",
    type: { ts: "number" }
  },
  template: region => `Math.max(0, ${region("score")})`
});
```

Use union ports when one template input can be satisfied by more than one input
shape. Keep options on the same `regionKind` when they share one template
marker:

```ts
const ScoreOrExpression = defineTemplate({
  modelId: "ScoreOrExpression",
  inputs: {
    score: unionPort({
      options: [
        literalPort({
          regionKind: "expression",
          schema: { type: "number" }
        }),
        rawCodePort({
          regionKind: "expression",
          policy: { allowNewlines: false },
          type: { ts: "number" }
        })
      ]
    })
  },
  output: {
    kind: "expression",
    type: { ts: "number" }
  },
  template: region => `${region("score")} + 1`
});
```

Graph compilation returns structured diagnostics instead of throwing for normal
planning and validation failures:

```ts
type SynthesisDiagnostic = {
  stage: "graph" | "template" | "input" | "port" | "region" | "ast" | "type" | "policy";
  code: string;
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
  templateId?: string;
  inputName?: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
};
```

Current graph validation covers duplicate node IDs, unknown templates, missing
or unknown inputs, unknown references, cycles, fragment kind/type mismatches,
source-template mismatches, literal schema validation, raw-code opt-in, and
final goal validation.

The graph layer is additive. Legacy `defineTemplate({ pattern, outputKind, ... })`
templates and the low-level `generateWithReplacements` API remain supported.

## Code Builders

The exported `code` helper builds plain TypeScript code strings and replacement
objects. It is a small serialization helper, not a template runtime.

```ts
import { code, generateWithReplacements } from "synthesize-regions";

const valueExpr = code.expr.call(code.expr.id("normalize"), [
  code.expr.prop(code.expr.id("input"), "value")
]);

const result = generateWithReplacements(templateSource, {
  body: [
    code.replacement.statement(code.stmt.const("x", valueExpr)),
    code.replacement.statement(code.stmt.return(code.expr.id("x")))
  ]
});
```

Common builder groups:

```ts
code.expr.id("input")
code.expr.prop("input", "value")
code.expr.computedProp("input", "key")
code.expr.call("normalize", ["input.value"])
code.expr.array(["1", "2"])
code.expr.object({ mode: '"strict"' })
code.expr.string("hello")
code.expr.number(42)
code.expr.boolean(true)
code.expr.null()
code.expr.paren("input.value + 1")

code.suffix.method("with", ['{ type: "video" }', "x => x"])
code.suffix.optionalMethod("with", ['{ type: "video" }', "x => x"])
code.suffix.prop("value")
code.suffix.optionalProp("value")

code.stmt.expression("doWork()")
code.stmt.return("x")
code.stmt.const("x", "1")
code.stmt.const("x", "1", { kind: "let" })
code.stmt.block(["const x = 1;", "return x;"])

code.prop.pair("mode", '"strict"')
code.prop.pair("dynamicKey", "value", { computed: true })

code.replacement.expression("input.value")
code.replacement.expressionSuffix(".with({ type: 'video' }, x => x)")
code.replacement.statement("return input.value;")
code.replacement.objectProperty("mode", { kind: "string", value: "strict" })
```

Identifier-oriented helpers validate TypeScript identifiers. Property helpers
quote non-identifier names where appropriate.

The builders are also exported from a subpath:

```ts
import { code } from "synthesize-regions/builders";
```

## Discovery API

Use source-template boundaries when a normal TypeScript file contains one or
more templates. Only text between the paired comments is included in the
template; surrounding imports, declarations, and other file content are not
emitted.

```ts
import {
  discoverFileSourceTemplates,
  generateFileSourceTemplateWithReplacements
} from "synthesize-regions";

// routes.ts
/** @TEMPLATE id=PostHandler output=statement mode=file */
export async function POST(request: Request) {
  const body = /** @TYPE expression id=body */ await request.json() /** @END */;
}
/** @END_TEMPLATE */

const [postHandler] = discoverFileSourceTemplates("routes.ts");
console.log(postHandler.sourceText); // The exported function, not the whole file.
console.log(postHandler.regions);    // Offsets relative to sourceText.
console.log(postHandler.fileRegions); // Offsets in routes.ts.

const result = generateFileSourceTemplateWithReplacements(
  "routes.ts",
  "PostHandler",
  { body: { kind: "expression", code: "await parseBody(request)" } }
);
```

The opening grammar is:

```txt
/** @TEMPLATE id=<templateId> output=<regionKind> [mode=<templateMode>] */
```

`id` values must be unique within the file. `output` uses the same kinds as
replacement regions. The parser mode is normally inferred: expressions use
`expression`, statements use `statementList`, object properties use
`objectPropertyList`, and expression suffixes use `expressionSuffix`. Specify
`mode=file` with `output=statement` for module-level declarations such as
exports and imports. Other incompatible output/mode combinations are rejected.

Boundaries cannot nest, but each boundary may contain any number of `@TYPE`
replacement regions. Use `scanSourceTemplateBoundaries()` when only raw
boundary ranges are needed, without AST or replacement-region validation.
Discovery also retains `containingSourceText`. When scoped generation enables
`checkSemanticDiagnostics`, the generated body is virtually inserted into that
containing source so imports and declarations outside the emitted boundary are
available for checking; the source file is never written.

Use replacement-region discovery directly when the caller has already selected
the complete template source:

```ts
import { discoverReplacementRegions } from "synthesize-regions";

const regions = discoverReplacementRegions(sourceText, {
  filePath: "template.ts",
  templateMode: { kind: "file" }
});

console.log(regions.map(region => ({
  id: region.id,
  effectiveType: region.effectiveType,
  arity: region.arity
})));
```

File and low-level variants:

```ts
import {
  discoverFileReplacementRegions,
  scanReplacementRegions
} from "synthesize-regions";

const regions = discoverFileReplacementRegions("template.ts");
const rawRegions = scanReplacementRegions(sourceText);
```

`discoverReplacementRegions` pairs markers, infers omitted marker kinds, and
validates placeholder context. `scanReplacementRegions` only pairs marker
comments and returns raw ranges; most callers should prefer discovery.

## JSON Schema

The package includes draft 2020-12 JSON Schemas for JSON-shaped public data:

```txt
schemas/replacement-map.schema.json
schemas/supported-json-schema.schema.json
schemas/synthesis-graph.schema.json
schemas/template-summary.schema.json
schemas/graph-compilation-result.schema.json
schemas/graph-runner-action.schema.json
schemas/graph-runner-state.schema.json
```

Package export paths:

```txt
synthesize-regions/schemas/replacement-map.schema.json
synthesize-regions/schemas/supported-json-schema.schema.json
synthesize-regions/schemas/synthesis-graph.schema.json
synthesize-regions/schemas/template-summary.schema.json
synthesize-regions/schemas/graph-compilation-result.schema.json
synthesize-regions/schemas/graph-runner-action.schema.json
synthesize-regions/schemas/graph-runner-state.schema.json
```

Example import:

```ts
import replacementMapSchema from "synthesize-regions/schemas/replacement-map.schema.json" with { type: "json" };
import supportedJsonSchema from "synthesize-regions/schemas/supported-json-schema.schema.json" with { type: "json" };
import synthesisGraphSchema from "synthesize-regions/schemas/synthesis-graph.schema.json" with { type: "json" };
import templateSummarySchema from "synthesize-regions/schemas/template-summary.schema.json" with { type: "json" };
import graphCompilationResultSchema from "synthesize-regions/schemas/graph-compilation-result.schema.json" with { type: "json" };
import graphRunnerActionSchema from "synthesize-regions/schemas/graph-runner-action.schema.json" with { type: "json" };
import graphRunnerStateSchema from "synthesize-regions/schemas/graph-runner-state.schema.json" with { type: "json" };
```

The supported-json-schema document publishes the structural shape of the schema
dialect accepted by template contracts. Runtime validation additionally checks
regular-expression syntax, local-reference resolution, and cross-keyword rules
that JSON Schema cannot express about itself. The replacement-map schema
validates replacement IDs, replacement `kind`
discriminators, nested expression replacements, and non-empty arrays for list
replacement values. The synthesis-graph schema validates graph structure,
node/input discriminators, inline nodes, ref shorthand, and final-goal shape. The
template-summary schema validates the planner-facing metadata returned by
template registries. The graph-compilation-result schema validates strict and
partial successes and failures, complete and unresolved artifacts, and structured
graph diagnostics. The graph-runner-action schema validates transactional patch,
graph replacement, and artifact-fill actions. The graph-runner-state schema
validates transition outputs and their contextual repair classifications.

The supported-dialect, graph, template-summary, compilation-result, and runner protocol documents
are generated from the live TypeBox contracts in the package. Run
`npm run schemas:generate` after a
contract change, or `npm run schemas:check` to detect missing or stale committed
documents. JSON is the supported published format; catalog-specific schemas are
still generated dynamically by the registry APIs.

These schemas are structural. Marker-specific compatibility, template existence,
graph cycles, literal schema checks, raw TypeScript syntax, and security policy
rules are still enforced by the API.

## Security Policy

Raw `expression`, `expressionSuffix`, `statement`, and computed property-name
replacements are parsed before insertion and checked against a security policy.

The default policy forbids:

- static imports
- dynamic `import()`
- `eval`
- `new Function`
- `process`
- `globalThis`
- `require`

Override individual checks through `GenerateOptions.securityPolicy`:

```ts
generateWithReplacements(sourceText, replacements, {
  securityPolicy: {
    forbidProcessAccess: false
  }
});
```

Structured scalar replacements such as `{ kind: "string" }` and
`{ kind: "number" }` are serialized directly and do not contain raw code.

## Errors

All package-specific errors extend `SynthesizeRegionsError` and include a
`metadata` object with details such as `id`, `expectedKind`, `line`, `column`,
`start`, `end`, and `bodyText` when available.

Exported error classes include:

```ts
MissingReplacementError
UnusedReplacementError
InvalidReplacementRegionError
NestedReplacementRegionError
InvalidMarkerSyntaxError
InvalidMarkerTypeError
InvalidMarkerArityError
InvalidPlaceholderContextError
InvalidReplacementKindError
InvalidReplacementSyntaxError
InvalidIdentifierError
EmptyManyReplacementError
SecurityPolicyViolationError
FinalValidationError
InvalidSourceTemplateBoundaryError
NestedSourceTemplateBoundaryError
TemplateCatalogValidationError
```

## Public API

The root export includes public types, errors, marker scanning, discovery,
generation, validation helpers, security-policy helpers, builders, and graph
template helpers:

```ts
import {
  applyGraphPatch,
  BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES,
  buildGraphCompiler,
  code,
  compareJsonSchemas,
  compareTypeDescriptors,
  compareTypeScriptTypes,
  compileGraph,
  createGraphRunner,
  createTemplateRegistry,
  definePartialGraph,
  defineTemplateCatalog,
  defineTemplate,
  discoverFileSourceTemplates,
  discoverReplacementRegions,
  discoverSourceTemplates,
  fragmentPort,
  generateDiscoveredSourceTemplate,
  generateFileSourceTemplateWithReplacements,
  generateSourceTemplateWithReplacements,
  generateWithReplacements,
  graphTemplateDefinitionToJsonSchema,
  JSON_SCHEMA_COMPATIBILITY_ENGINE_VERSION,
  JSON_SCHEMA_DIALECT_URI,
  literalPort,
  rawCodePort,
  SUPPORTED_JSON_SCHEMA_KEYWORD_VALUES,
  SUPPORTED_JSON_SCHEMA_TYPE_VALUES,
  SUPPORTED_JSON_SCHEMA_VERSION,
  templateCatalogDigest,
  unionPort,
  validateJsonValueAgainstSchema,
  validateSupportedJsonSchema,
  validateTemplateCatalog,
  validateTypeScriptType,
  type JsonValue,
  type SupportedJsonSchema,
  type TypeDescriptor,
  type TypeDescriptorComparisonResult,
  type GraphPatchAction,
  type GraphRunnerAction,
  type GraphRunnerState,
  type ReplacementMap,
  type StrictPartialSynthesisGraph,
  type TemplateCatalogView,
  type TemplateRegistrySnapshot
} from "synthesize-regions";
```

Most callers use:

```ts
generateWithReplacements(sourceText, replacements, options?)
generateFileWithReplacements(inputFilePath, replacements, options?)
generateDiscoveredSourceTemplate(template, replacements, options?)
generateSourceTemplateWithReplacements(sourceText, templateId, replacements, options?)
generateFileSourceTemplateWithReplacements(inputFilePath, templateId, replacements, options?)
discoverReplacementRegions(sourceText, options?)
discoverFileReplacementRegions(inputFilePath, options?)
discoverSourceTemplates(sourceText, options?)
discoverFileSourceTemplates(inputFilePath, options?)
scanSourceTemplateBoundaries(sourceText)
scanReplacementRegions(sourceText)
serializeReplacement(replacement, options?, region?)
defineTemplate(definition)
defineTemplateCatalog(templates)
validateTemplateCatalog(templates)
templateCatalogDigest(templates)
validateSupportedJsonSchema(schema)
validateJsonValueAgainstSchema(value, schema)
compareJsonSchemas(actualSchema, expectedSchema)
validateTypeScriptType(typeExpression)
compareTypeScriptTypes(expectedType, actualType)
compareTypeDescriptors(actualDescriptor, expectedDescriptor)
createTemplateRegistry(templates?)
registry.register(template)
registry.registerAll(templates)
registry.replace(template)
registry.snapshot()
buildGraphCompiler(templates)
definePartialGraph(templates, graph)
compiler.definePartialGraph(graph)
graphTemplateDefinitionToJsonSchema(template)
compileGraph(graph, registryOrTemplates, { mode: "strict" | "partial", ...options })
createGraphRunner(registryOrTemplates, graph, options?)
applyGraphPatch(graph, action)
code
```

Canonical behavior examples live under `test/fixtures/`, and
`test/fixture-integration.test.ts` runs every fixture through
`generateWithReplacements`.
