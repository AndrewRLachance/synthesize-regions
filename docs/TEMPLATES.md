# Graph Template Authoring

Graph templates are the reusable vocabulary of `synthesize-regions`. A
template describes one controlled code-producing operation: its accepted
inputs, its generated output, and the marked source that connects them.

This guide covers templates created with `defineTemplate()`. For the graph that
selects and composes those templates, see [Synthesis Graphs](./SYNTHESIS_GRAPHS.md).

## Mental model

A graph template behaves like a typed operator. A generic template is the same
operator with explicitly bound type parameters:

```txt
input ports -> marked TypeScript source -> one output fragment

generic template: inputs<T, U> -> marked source -> output<U>
```

The `source` manifest contains ordinary TypeScript plus one marked region for
each declared input. During compilation, the graph layer validates the selected
input, converts it to a replacement, and invokes the normal marker-generation
pipeline. Template definitions contain no executable author callback.

```ts
const ReturnJson = defineTemplate({
  modelId: "ReturnJson",
  version: "1.0.0",
  description: "Returns a JSON response from one expression.",
  inputs: {
    value: fragmentPort({
      regionKind: "expression",
      accepts: { outputKind: "expression" }
    })
  },
  output: { kind: "statement" },
  source: `return Response.json(
    /** @TYPE expression id=value **/null/** @END **/
  );`
});
```

This definition establishes four contracts:

- `modelId` is the stable ID selected by graph nodes.
- `inputs.value` accepts an expression fragment.
- `output.kind` promises one statement fragment.
- `source` places the `value` marker in an expression AST context.

Template registration validates that these contracts are internally
consistent. Graph compilation then validates each invocation against them.

## Anatomy of a template

### Identity and version

`modelId` is part of graphs, diagnostics, provenance, source maps, summaries,
and source allowlists. Treat it as a stable protocol identifier rather than a
display label.

`version` is optional but recommended. Increment it when the generated
behavior changes, even if the port contract does not. Source changes are
always reflected by the executable manifest identities described below.

Descriptions are planner-facing. Good descriptions state what code is emitted
and any assumptions about the insertion site.

### Generic type parameters

Use `typeParameters` when input and output contracts must share a type. A
parameter has an optional description and an optional concrete constraint:

```ts
const ArrayMap = defineTemplate({
  modelId: "ArrayMap",
  version: "1.0.0",
  typeParameters: {
    T: {
      description: "Input element type.",
      constraint: { ts: "unknown" }
    },
    U: {
      description: "Mapped element type.",
      constraint: { ts: "unknown" }
    }
  },
  inputs: {
    array: fragmentPort({
      regionKind: "expression",
      accepts: {
        outputKind: "expression",
        type: { ts: "readonly {{T}}[]", schema: { type: "array" } }
      }
    }),
    callback: fragmentPort({
      regionKind: "expression",
      accepts: {
        outputKind: "expression",
        type: {
          ts: "(value: {{T}}, index: number, array: readonly {{T}}[]) => {{U}}"
        }
      }
    })
  },
  output: {
    kind: "expression",
    type: { ts: "{{U}}[]", schema: { type: "array" } }
  },
  source: `(
    /** @TYPE expression id=array **/[]/** @END **/
  ).map(
    /** @TYPE expression id=callback **/undefined/** @END **/
  )`
});
```

`{{T}}` placeholders are legal only in template-owned `TypeDescriptor.ts`
strings. They do not interpolate marked source and they do not alter JSON
Schema. Keep schemas fixed and conservative, such as `{ type: "array" }` or
`true`.

Every graph node using a generic template must provide exactly one concrete
`TypeDescriptor` for every declared parameter. There is no inference and there
are no defaults. Before fragment compatibility is checked, the compiler
substitutes the arguments into every input and output TypeScript descriptor.
This makes relationships such as `readonly User[]`, `(User) => View`, and
`View[]` one enforceable contract rather than three unrelated claims.

Declarations and bindings are rejected when:

- a parameter name is not an identifier;
- a declared parameter is unused;
- a descriptor references an undeclared parameter;
- a constraint contains a placeholder instead of a concrete type;
- a node omits an argument or supplies an extra argument;
- an argument is malformed, contains `any`, or does not satisfy its constraint;
- substitution leaves an unresolved or invalid TypeScript type.

Use self-contained structural TypeScript expressions for concrete arguments.
Project-local names that cannot be resolved in the isolated type-contract
context are not valid generic bindings.

Candidate-owned malformed, unresolved, invalid-schema, and forbidden-`any`
bindings are reported as graph-repairable `InvalidTypeArgument` diagnostics.
They include the exact `nodeId`, `templateId`, `typeParameterName`, and path.
The broader `InvalidTypeScriptType`, `UnresolvedTypeScriptType`, and
`ForbiddenAnyType` codes remain terminal because the same evidence outside a
node binding can identify a template-catalog defect.

### Input ports

Every input port answers two questions:

1. What graph input shape may be supplied?
2. Which TypeScript AST region will receive it?

| Port | Authored graph input | Intended use |
| --- | --- | --- |
| `literalPort()` | `{ kind: "literal", value }` | JSON-like structured data serialized predictably. |
| `fragmentPort()` | `{ $ref: "nodeId" }` | One fragment produced by another graph node. |
| `fragmentCollectionPort()` | `{ kind: "fragmentCollection", items: [...] }` | Ordered variadic fragments. |
| `rawCodePort()` | `{ kind: "rawCode", code }` | Caller-authored TypeScript subject to syntax, policy, and security checks. |
| `unionPort()` | Any matching concrete option | A controlled choice among input shapes sharing one region context. |

Ports are required unless `required: false` is declared. A missing required
port fails strict compilation or becomes an unresolved artifact input during
partial compilation. A missing optional port leaves the marker's authored body
as fallback source.

### Literal ports

Use literals when code can be represented as data:

```ts
const NamedBoolean = defineTemplate({
  modelId: "NamedBoolean",
  inputs: {
    name: literalPort({
      regionKind: "identifier",
      schema: { type: "string", pattern: "^[$A-Za-z_][$A-Za-z0-9_]*$" }
    }),
    value: literalPort({
      regionKind: "boolean",
      schema: { type: "boolean" }
    })
  },
  output: { kind: "statement" },
  source: `const /** @TYPE identifier id=name **/enabled/** @END **/ =
    /** @TYPE boolean id=value **/false/** @END **/;`
});
```

The supported JSON Schema is enforced when the graph is compiled. Prefer
literals over raw code whenever the value has a natural data representation.
Literal ports cannot target the first-class type, declaration, or whole-file
syntax kinds; type/declaration contexts require raw code or generated fragments,
while `sourceFile` requires a generated fragment.

### Fragment ports

A fragment port composes code that another template produced:

```ts
source: fragmentPort({
  regionKind: "expression",
  accepts: {
    outputKind: "expression",
    type: { ts: "readonly boolean[]" },
    sourceModelIds: ["BooleanArrayLiteral", "MappedBooleanArray"]
  }
})
```

Compatibility is directional. The producer must:

- emit the exact required region kind;
- advertise a TypeScript type assignable to the consumer type, when declared;
- advertise a JSON Schema contained by the consumer schema, when declared;
- belong to `sourceModelIds`, when an allowlist is present.

An omitted `sourceModelIds` accepts any otherwise compatible template. An
explicit empty list accepts no producer.

### Fragment collections

Collections preserve authored item order and validate every producer
independently:

```ts
const PostHandler = defineTemplate({
  modelId: "PostHandler",
  inputs: {
    statements: fragmentCollectionPort({
      regionKind: "statement",
      accepts: {
        outputKind: "statement",
        sourceModelIds: ["ParseBody", "ValidateBody", "ReturnJson"]
      },
      minItems: 1
    })
  },
  output: { kind: "declaration" },
  source: `export async function POST(request: Request) {
/** @TYPE statement id=statements **/return Response.json(null);/** @END **/
}`
});
```

Default separators follow the syntax context: comma-space for type,
parameter, heritage, and specifier lists; newline for statements, members, and
declarations; and comma-newline for enum and object members. Set `separator`
explicitly when the surrounding syntax requires something else.

### Raw-code ports

Raw code is useful when a value cannot be described as a literal or selected
from the catalog:

```ts
endpoint: rawCodePort({
  regionKind: "expression",
  description: "Expression evaluating to the upstream URL.",
  policy: {
    maxLength: 200,
    allowNewlines: false,
    forbiddenSubstrings: ["eval", "Function", "require", "process"]
  },
  type: { ts: "string" }
})
```

Raw-code policy validation happens before replacement syntax and security
validation. These checks screen source; they are not an execution sandbox. If
inputs are untrusted, prefer structured literals or a narrow catalog of
fragment-producing templates.

### Union ports

Use a union when one logical input may come from several controlled channels:

```ts
value: unionPort({
  options: [
    literalPort({ regionKind: "expression", schema: { type: "number" } }),
    fragmentPort({
      regionKind: "expression",
      accepts: { outputKind: "expression", type: { ts: "number" } }
    }),
    rawCodePort({ regionKind: "expression", type: { ts: "number" } })
  ]
})
```

Finite unions must be nonempty, and all concrete options—including nested
unions—must use the same region kind. Runtime resolution selects the first
compatible concrete option.

## Output contracts

Every graph template emits exactly one `OutputPort`:

```ts
output: {
  kind: "expression",
  description: "A normalized user expression.",
  type: {
    ts: "{ readonly id: string }",
    schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false
    }
  }
}
```

`kind` is a syntactic promise. It selects the wrapper used for parsing and is
checked exactly at fragment ports and graph goals. `type` is an additional
semantic contract; it does not change the syntax kind.

Type descriptors are author assertions. Their TypeScript expressions must be
self-contained and cannot contain `any`. With semantic checking enabled, the
complete final artifact is checked against its advertised type where the
artifact kind supports that proof.

## Region kinds and placement

The region kind describes the exact AST context occupied by generated source.
Examples include `expression`, `statement`, `type`, `typeMember`, `parameter`,
`declaration`, and `classMember`.

Kinds do not coerce across contexts. A declaration is not a statement fragment,
and a constructor parameter is not an ordinary parameter. Create an explicit
adapter template when a reusable concept must be embedded into a different
syntax context.

Each input must own exactly one scalar marker whose kind matches the input
port. The text inside that marker is real template source, not merely
documentation:

```ts
source: `consume(
  /** @TYPE expression id=value **/undefined/** @END **/
)`
```

It supplies parser context when the template is defined and becomes the
fallback for an omitted optional input. Choose the smallest valid placeholder
for the declared region kind. Collection ports still use one scalar marker;
the collection is joined with its configured separator before replacement.

### Whole-file output

`sourceFile` represents one complete TypeScript file. It is useful for a graph
whose final artifact owns the whole destination rather than an insertion
fragment:

```ts
const GeneratedModule = defineTemplate({
  modelId: "GeneratedModule",
  inputs: {
    module: fragmentPort({
      regionKind: "sourceFile",
      accepts: { outputKind: "sourceFile" }
    })
  },
  output: { kind: "sourceFile" },
  source: `/** @TYPE sourceFile id=module **/export {};/** @END **/`
});
```

Whole-file inputs are deliberately narrow: each port targeting that context
must be a scalar fragment port that consumes another `sourceFile`. Literal,
raw-code, collection, and value-level type/schema metadata are rejected. A
`sourceFile` marker must occur at file scope; its replacement may contain zero
or more complete top-level statements.

## Partial invocation

Partial graph compilation invokes the same template while preserving missing
required inputs as markers:

```ts
/** @TYPE expression id=<stable-opaque-id> **/undefined/** @END **/
```

The resulting `PartialTemplateArtifact` retains the complete port contract in
`unresolvedInputs`. It can be filled transactionally, embedded as a partial
child, and validated again after each fill. Missing fragment references are
graph-repair problems; only omitted template inputs become artifact holes.

An artifact retained in the current process can use
`fillTemplateArtifact()`/`finalizeTemplateArtifact()`. Persisted, restored,
manually constructed, or caller-supplied artifacts must use
`fillTemplateArtifactWithCatalog()`/`finalizeTemplateArtifactWithCatalog()`
with the captured catalog snapshot. That boundary verifies the exact producing
template manifest and unresolved port contracts and screens nested child
artifacts before their source is composed. The in-process ownership proof used
by the shorter helpers intentionally does not survive serialization.

## Declarative graph templates and source-template boundaries

Two related APIs use the word “template”:

- `defineTemplate()` creates an executable, catalog-registered graph operator.
- `@TEMPLATE` / `@END_TEMPLATE` boundaries discover a marked fragment inside a
  larger TypeScript file.

A discovered source-template boundary is not automatically a graph template.
It identifies source, parser mode, and marker regions, but it does not declare
graph input ports, compatibility metadata, or an executable catalog entry.
Use boundaries for source-owned templates and `defineTemplate()` for planner-
selectable graph operations.

## Catalogs as planner contracts

`defineTemplateCatalog()` and `createTemplateRegistry()` validate the whole
template vocabulary before graph compilation. Validation covers duplicate IDs,
ports, union regions, collection bounds, raw policies, source allowlists,
schemas, TypeScript descriptors, generic declarations, and placeholder use.

`registry.summaries()` is the implementation-free view intended for planners.
It contains model IDs, descriptions, generic parameter declarations, defaulted
port contracts, and outputs. Catalogs expose two identities:

- `contractDigest` (`c6_…`) identifies the normalized planner vocabulary and
  excludes marked source;
- `manifestDigest` (`m3_…`) identifies the exact executable catalog;
- each definition has a `manifestDigest` (`t3_…`) recorded on artifacts as
  `source.templateManifestDigest`.

Compilers and runners capture both identities with an immutable snapshot.
Supply `expectedCatalogDigest` and `expectedCatalogManifestDigest` when
resuming work planned and compiled against an earlier snapshot. Source-only
changes keep `c6_` stable but change `t3_` and `m3_`. Type-parameter
declarations are part of both planner-facing and executable identities.

Package `0.3.0` publishes catalog-contract version 6, template-manifest version
3, catalog-manifest version 3, catalog planner-schema version 3, and source-free
capability-closure version 2. The planner-schema and closure versions are bound
into `c6_`. This is a hard cutover from `0.2.x`/`c5_`/`t2_`/`m2_`; old evidence
is rejected rather than migrated.

For a bounded planner or graph-repair disclosure, derive the closure from the
source-free summaries rather than reimplementing generic compatibility:

```ts
const summaries = registry.summaries();
const repairSummaries = deriveTemplateCapabilityClosure(summaries, {
  kind: "graph",
  graph: acceptedGraph
});
```

Existing graph nodes are instantiated using their exact `typeArguments`.
Unbound generic placeholders and indeterminate relationships are included
conservatively, results are returned once each in model-ID order, and an unknown
selected template falls back to the complete authorized summary catalog. The
helper accepts and returns summary data only; it never exposes marked source.

## Serializable manifests and JSON catalogs

`GraphTemplateManifest` is the JSON-safe author-owned part of a template:

```ts
const manifest = {
  modelId: "IdentityExpression",
  version: "1",
  inputs: {
    value: rawCodePort({ regionKind: "expression" })
  },
  output: { kind: "expression" },
  source: `/** @TYPE expression id=value **/undefined/** @END **/`
} satisfies GraphTemplateManifest;

const definition = defineTemplate(manifest);
```

Load an untrusted or persisted JSON array through the closed manifest contract
instead of casting it to executable definitions:

```ts
const manifests = JSON.parse(jsonText);
const registry = createTemplateRegistryFromManifests(manifests);
```

`createTemplateRegistryFromManifests()` validates every object against
`GraphTemplateManifestSchema`, parses every marked source in its output
context, verifies exact marker-to-port ownership, and then validates the whole
catalog atomically. The published
`schemas/template-manifest.schema.json` is suitable for validating the JSON at
an API boundary before calling the TypeScript API.

## Authoring guidelines

- Make each template perform one recognizable code-generation operation.
- Prefer composition over a large template with many unrelated union ports.
- Describe insertion-site assumptions, side effects, and required ambient names.
- Use fragment source allowlists when only a small set of producers is valid.
- Prefer literal and fragment ports to raw code.
- Advertise only types and schemas the generated implementation truly satisfies.
- Introduce a type parameter only for a real relationship between contracts;
  every declared parameter must be used.
- Keep generic JSON Schemas fixed and truthful; only `TypeDescriptor.ts` supports
  `{{Parameter}}` substitution.
- Version implementation-only behavioral changes.
- Keep `modelId` stable; use `description` for human-facing wording changes.
- Test templates both alone and in representative graphs.

## Related material

- [Synthesis Graphs](./SYNTHESIS_GRAPHS.md)
- [Project glossary](../GLOSSARY.md)
- [README graph API reference](../README.md#synthesis-graphs)
