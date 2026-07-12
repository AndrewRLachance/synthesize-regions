# synthesize-regions

Controlled TypeScript source-template replacement built on
[`ts-morph`](https://ts-morph.com/).

`synthesize-regions` replaces source regions that are explicitly marked with
paired block comments. It scans template text, validates each marked placeholder
against a TypeScript AST context, serializes structured replacement objects, and
validates the generated TypeScript before returning it.

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
  compileGraph,
  createGraphRunner,
  createTemplateRegistry,
  defineTemplate,
  fragmentPort,
  literalPort,
  rawCodePort,
  unionPort,
  type SynthesisGraph
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
    type: { ts: "boolean[]" },
    schema: { type: "array", items: { type: "boolean" } }
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

const registry = createTemplateRegistry([BooleanArrayLiteral, MapBooleanArray]);

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

Use discovery when an orchestrator needs to inspect a template before generating
or loading replacements.

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
schemas/synthesis-graph.schema.json
schemas/template-summary.schema.json
```

Package export paths:

```txt
synthesize-regions/schemas/replacement-map.schema.json
synthesize-regions/schemas/synthesis-graph.schema.json
synthesize-regions/schemas/template-summary.schema.json
```

Example import:

```ts
import replacementMapSchema from "synthesize-regions/schemas/replacement-map.schema.json" with { type: "json" };
import synthesisGraphSchema from "synthesize-regions/schemas/synthesis-graph.schema.json" with { type: "json" };
import templateSummarySchema from "synthesize-regions/schemas/template-summary.schema.json" with { type: "json" };
```

The replacement-map schema validates replacement IDs, replacement `kind`
discriminators, nested expression replacements, and non-empty arrays for list
replacement values. The synthesis-graph schema validates graph structure,
node/input discriminators, inline nodes, ref shorthand, and final-goal shape. The
template-summary schema validates the planner-facing metadata returned by
template registries.

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
```

## Public API

The root export includes public types, errors, marker scanning, discovery,
generation, validation helpers, security-policy helpers, builders, and graph
template helpers:

```ts
import {
  code,
  compileGraph,
  createTemplateRegistry,
  defineTemplate,
  discoverReplacementRegions,
  fragmentPort,
  generateWithReplacements,
  graphTemplateDefinitionToJsonSchema,
  literalPort,
  rawCodePort,
  unionPort,
  type ReplacementMap
} from "synthesize-regions";
```

Most callers use:

```ts
generateWithReplacements(sourceText, replacements, options?)
generateFileWithReplacements(inputFilePath, replacements, options?)
discoverReplacementRegions(sourceText, options?)
discoverFileReplacementRegions(inputFilePath, options?)
scanReplacementRegions(sourceText)
serializeReplacement(replacement, options?, region?)
defineTemplate(definition)
createTemplateRegistry(templates?)
graphTemplateDefinitionToJsonSchema(template)
compileGraph(graph, registryOrTemplates, { mode: "strict" | "partial", ...options })
createGraphRunner(registryOrTemplates, graph, options?)
code
```

Canonical behavior examples live under `test/fixtures/`, and
`test/fixture-integration.test.ts` runs every fixture through
`generateWithReplacements`.
