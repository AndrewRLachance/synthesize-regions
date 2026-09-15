# Glossary

This glossary defines the terms used in `synthesize-regions` documentation,
APIs, diagnostics, schemas, and roadmap discussions. API type and function names
are shown in code formatting when a term maps directly to a public symbol.

## Frequently confused terms

| Terms | Distinction |
| --- | --- |
| Partial template mode, partial graph, partial artifact | A template mode is a parsing wrapper, a partial graph is incomplete authored graph data, and a partial artifact is generated code with fillable holes. |
| Marker kind, region kind, output kind | Marker kind is low-level replacement syntax; region kind is its graph-level counterpart; output kind is the region kind a producer emits. |
| Schema contract, supported JSON Schema, compatibility engine | The contract describes valid serialized schema shapes, a supported schema is a value conforming to that contract and profile, and the engine validates values and compares schemas. |
| Template, node, artifact | A template is a reusable producer definition, a node invokes one template in a graph, and an artifact is the code produced by that invocation. |
| Catalog, registry, snapshot | A catalog is any validated template view, a registry supports atomic mutation, and a snapshot is an immutable catalog captured for reproducible work. |

## A

**Accepts contract** — The constraints on a fragment or fragment-collection
port's producers. It can restrict output kind, type descriptor, and source
template IDs.

**Actual type or schema** — The producer-side contract in a compatibility
comparison. Compatibility asks whether every value produced by the actual
contract is accepted by the expected contract.

**Advertised type** — A `TypeDescriptor` declared on a template output or
artifact. The graph uses it for port and goal compatibility; opt-in semantic
validation also checks expression-like final code against its advertised
TypeScript type.

**Allowlist** — An explicit list of permitted producer template IDs, stored as
`sourceModelIds` on a fragment accepts contract. An empty allowlist permits no
producer templates.

**Annotation keyword** — Supported JSON Schema metadata such as `title`,
`description`, `format`, or `contentMediaType` that is preserved but does not
constrain runtime values or compatibility.

**Arity** — Whether a low-level marker accepts one replacement (`one`) or a
non-empty list of replacements (`many`). A graph fragment-collection port is the
higher-level mechanism for ordered variadic fragment inputs.

**Artifact** — Generated template code represented as a `TemplateArtifact`.
Artifacts are either complete or partial and carry output kind, template
identity, optional type metadata, provenance, and source mapping.

**Artifact fill** — A transactional attempt to replace one or more unresolved
artifact markers through `fillTemplateArtifact()` or a runner `fill` action.

**Artifact-fillable** — The `artifactFillable` failure classification. The
graph structure is usable, but unresolved or rejected artifact inputs require a
new `fill` action. A runner exposes this through `needsArtifactInputs`.

**Artifact input mapping** — A `TemplateArtifactInputMap`: fill values keyed by
stable unresolved input ID, or by `inputName` when that name is unambiguous.

**Artifact integrity** — The persisted invariants checked before filling or
finalizing an artifact, including marker correspondence, unresolved IDs, port
metadata, completion state, and source-map ranges.

**Artifact-relative location** — A one-based line and column measured inside
generated artifact code, even when TypeScript validation used a synthetic
wrapper or virtual target file.

**Atomic mutation** — A catalog or graph operation that either validates and
commits completely or leaves the previous value unchanged.

**Authored graph** — The graph shape written by a caller or planner before
inline nodes and shorthand references are normalized.

## B

**Boolean schema** — The JSON Schemas `true` and `false`, meaning accept every
value and accept no value respectively.

**Built-in diagnostic code** — A package-defined diagnostic code listed in
`BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES`. `SynthesisDiagnostic.code` remains
open so integrations can add producer-defined codes.

## C

**Canonical schema** — A supported JSON Schema normalized into deterministic
key and set ordering for comparison, caching, planner contracts, and digests.

**Catalog** — A validated set of graph template definitions with unique
`modelId` values. `defineTemplateCatalog()` creates an immutable authored
catalog; registries and snapshots expose the `TemplateCatalogView` interface.

**Catalog digest** — A versioned `c3_` SHA-256 checksum of normalized,
planner-facing template contracts. It detects catalog drift without hashing
template function source.

**Catalog snapshot** — A `TemplateRegistrySnapshot` that freezes catalog
membership, summaries, and digest for a reproducible compiler or runner
session.

**Catalog validation** — Atomic validation of template IDs, ports, policies,
unions, source allowlists, schemas, and TypeScript descriptors before graph
compilation begins.

**Child fragment** — A generated fragment consumed by another template input.
Child fragments can themselves be partial and can carry nested unresolved
inputs and source spans into the parent artifact.

**Code builder** — A helper in the builders API that constructs a typed
replacement object or code snippet without manually assembling its serialized
TypeScript text.

**Compatibility** — The directional relationship between a producer contract
and a consumer contract. Producer values must be a subset of the consumer JSON
Schema and the producer TypeScript type must be assignable to the consumer
type.

**Compatibility status** — One of `compatible`, `incompatible`,
`indeterminate`, or `invalid`. Indeterminate means the engine cannot soundly
prove inclusion; invalid means one of the contracts is malformed.

**Compilation scope** — A stable caller-provided namespace used when deriving
opaque unresolved input IDs. Reusing a scope reproduces IDs; distinct scopes
separate independently persisted instances of the same graph.

**Complete artifact** — A `CompleteTemplateArtifact` with `complete: true` and
no unresolved marker regions. Only complete final artifacts receive opt-in
semantic validation.

**Concrete port** — A literal, fragment, fragment-collection, or raw-code port.
A union port is resolved to one concrete option before template invocation.

**Consumer contract** — The expected port or goal contract that receives a
producer value or fragment.

**Contract** — A machine-checkable structural or semantic promise. In this
project the word may refer to a TypeBox runtime contract, a port contract, a
type descriptor, or a supported JSON Schema; the surrounding noun identifies
which one.

## D

**Deepest attribution** — Selection of the most deeply nested generated source
span containing a compiler diagnostic. It identifies the child node and input
that contributed the affected code rather than only the final node.

**Definition** — Usually a `GraphTemplateDefinition`: a reusable template's
identity, ports, output contract, template function, invocation behavior, and
summary. “TypeBox definition” instead means a named schema inside a TypeBox
module.

**Declaration fragment** — Exactly one permitted module-level TypeScript
declaration with region kind `declaration`. Control-flow statements, expression
statements, returns, and export assignments are not declaration fragments.

**Descriptor** — Short for `TypeDescriptor`, unless explicitly described as an
unresolved input descriptor or diagnostic descriptor.

**Diagnostic** — A structured `SynthesisDiagnostic` containing stage, code,
severity, message, optional graph identity, path, expected/actual metadata,
repair hints, and TypeScript compiler details.

**Diagnostic classification** — The operation-level repair channel assigned
to a failed result or runner state: graph-repairable, artifact-fillable,
template-policy failure, or terminal failure.

**Discovery** — Scanning and validating paired marker regions in template
source through the discovery API.

**Draft 2020-12 profile** — The closed subset of JSON Schema Draft 2020-12
accepted by the library. It permits local JSON Pointer references and rejects
remote references, IDs, anchors, dynamic references, unknown keywords, and
legacy-draft keywords.

## E

**Expected type or schema** — The consumer-side contract in a compatibility
comparison.

**Expression suffix** — Receiver-dependent TypeScript source such as `.map(x =>
x)` or `?.value`. It has region kind `expressionSuffix` and is validated with a
synthetic or real receiver.

## F

**Fallback body** — Marker body text retained when an optional template input
is omitted. It is distinct from the default placeholder used only to make a
marker syntactically valid.

**Fill value** — One `TemplateArtifactInput`: a literal, raw-code snippet,
fragment, or ordered fragment collection supplied for an unresolved input.

**Final artifact** — The artifact produced by the graph's `finalNodeId` and
checked against its optional synthesis goal.

**Final node** — The graph node selected by `finalNodeId` as the graph's
observable output.

**Finalization** — Requiring an artifact to have no unresolved inputs through
`finalizeTemplateArtifact()`. Finalization returns an artifact-fillable failure
when holes remain.

**Fragment** — Generated code with a syntactic region kind and producer
metadata that can flow through a fragment port. A `TemplateArtifact` is a
fragment with an explicit complete/partial state.

**Fragment collection** — An ordered variadic input of fragments rendered with
a configured separator. Collection order is preserved during composition.

**Fragment port** — An input port that consumes one compatible generated
fragment.

## G

**Generated code** — TypeScript source returned by the low-level generator or
graph compiler after replacements and validation.

**Generated fragment** — A `GeneratedFragment`: generated code plus kind,
source template identity, optional type/schema metadata, provenance, source map,
and producer diagnostics.

**Generated source map** — A versioned `GeneratedSourceMap` persisted on graph
artifacts. It maps half-open UTF-16 code ranges to contributing nodes and
inputs; it is not a JavaScript `.map` file.

**Goal** — An optional `SynthesisGoal` constraining the final artifact's output
kind, TypeScript type, or JSON Schema.

**Graph** — A `SynthesisGraph`: nodes, a final node ID, and an optional goal.
References between node inputs form the dependency edges.

**Graph compiler** — The callable returned by `buildGraphCompiler()`. It
captures a validated catalog snapshot and digest and exposes typed graph
authoring helpers.

**Graph normalization** — Flattening recursively inline nodes, expanding
shorthand references, and producing the global node namespace used by runtime
validation and execution.

**Graph patch** — A small immutable graph edit such as adding/removing a node,
setting/removing an input, changing the final node, or changing the goal.

**Graph repair** — Correcting structural graph problems through typed patch
actions or a complete graph replacement.

**Graph-repairable** — The `graphRepairable` failure classification. The
authored graph needs a patch or replacement before compilation can proceed. A
runner exposes this through `needsGraphRepair`.

**Graph runner** — A stateful driver created by `createGraphRunner()` that
compiles in partial mode and coordinates graph patches, artifact fills,
retries, and completion.

## H

**Half-open range** — An offset interval `[start, end)` that includes `start`
and excludes `end`. Source spans and semantic target replacement ranges use
zero-based UTF-16 half-open offsets.

## I

**Indeterminate compatibility** — A sound, conservative result returned when
schema inclusion cannot be proven, for example with some complex negation,
conditional, regex, or unevaluated interactions. Runtime graph compatibility
rejects indeterminate relationships rather than guessing.

**Inline node** — A `SynthesisNode` nested directly inside another node input or
fragment-collection item. Normalization lifts it into the graph's global node
namespace.

**Input name** — The template-local key of an input port. It can be used as a
fill alias only when it identifies exactly one unresolved input in an artifact.

**Input port** — A named template input contract describing accepted input
shape, insertion region kind, requiredness, description, and type/schema or
policy constraints.

**Insertion-site context** — Declarations, imports, local bindings, and receiver
types available where generated code will eventually be placed. It can be
modeled with a semantic prelude or virtual target file.

**Integrity diagnostic** — A diagnostic reporting corrupted or contradictory
persisted artifact metadata rather than a newly authored graph choice.

## J

**JSON Pointer** — The slash-delimited fragment syntax used by local `$ref`
values such as `#/$defs/user`. Pointer segments escape `~` as `~0` and `/` as
`~1`.

**JSON Schema compatibility** — Proof that every value accepted by the producer
schema is also accepted by the consumer schema.

**JSON value** — A `JsonValue`: null, boolean, finite number, string, array of
JSON values, or object whose property values are JSON values. It excludes
`undefined`, bigint, functions, and other non-JSON data.

## L

**Legacy template** — The original pattern-based template API using
`outputKind`, replacement patterns, and `apply()`. It remains supported
alongside graph templates.

**Literal input** — JSON-like data accepted by a literal port and serialized as
the port's region kind after optional schema validation.

**Literal port** — An input port for structured literal values, optionally
constrained by a supported JSON Schema.

**Local reference** — A JSON Schema `$ref` equal to `#` or beginning with `#/`
and resolved inside the same schema document.

## M

**Marker** — A paired `/** @TYPE ... **/ ... /** @END **/` annotation that marks
replaceable template source.

**Marker body** — The source between a marker's opening and closing comments.
It provides syntactic context and may serve as an optional-input fallback.

**Marker ID** — The key connecting a discovered marker to a replacement-map
entry. Duplicate physical regions may share one ID and receive the same
replacement.

**Marker kind** — The syntactic category declared by a marker. In graph APIs
the equivalent term is region kind. First-class type/declaration kinds preserve
the exact TypeScript AST context rather than treating all erased syntax as a
statement.

**Many marker** — A low-level marker whose type uses `[]` and accepts a
non-empty replacement array joined with a kind-specific separator.

**Model ID** — The stable template identifier declared as `modelId`. Nodes
store the same value under `templateId`.

## N

**Nested partial artifact** — A partial child fragment composed into a parent.
Its marker regions and unresolved descriptors propagate into the parent
artifact and remain fillable.

**Needs artifact inputs** — The `needsArtifactInputs` runner state. It retains a
partial artifact and accepts retryable `fill` actions, as well as graph edits
that intentionally discard that artifact and recompile.

**Needs graph repair** — The `needsGraphRepair` runner state. It retains the
authored graph and diagnostics and accepts graph patch or replacement actions.

**Nesting depth** — A source-span number representing composition depth. The
final/root node starts at zero; its input, child node, and child input use
successively deeper values.

**Node** — A `SynthesisNode`: a graph-local ID, selected template ID, and map of
authored inputs.

**Node ID** — The graph identity of one authored node. Top-level and recursively
inline nodes share one global namespace and must be unique.

**Normalized input** — The runtime input representation after shorthand
references and inline nodes have been normalized.

## O

**Opaque unresolved input ID** — A deterministic, collision-resistant marker
ID generated from compilation scope and graph/template/input identity. It is
the safest key for artifact fills.

**Output kind** — The region kind produced by a template or required by a
fragment accepts contract or synthesis goal.

**Output port** — A template's advertised output contract: kind, optional
`TypeDescriptor`, deprecated schema alias, and description.

## P

**Partial artifact** — A `PartialTemplateArtifact` with `complete: false`, one
or more unresolved inputs, and matching marker regions in its code.

**Partial compilation** — Graph compilation with `mode: "partial"`. Missing
required template inputs become artifact holes, while invalid supplied inputs
and structural graph problems remain diagnostics.

**Partial graph** — An intentionally incomplete graph authored through
`definePartialGraph()` or `compiler.definePartialGraph()`. Finite static typing
permits omitted required inputs and dangling references/final IDs while still
checking known templates, supplied inputs, compatible known targets, and IDs.

**Partial template mode** — A low-level `TemplateMode` wrapper used to parse or
validate a fragment that is not a whole TypeScript file. It does not mean the
same thing as a partial graph or partial artifact.

**Passthrough code** — Marker-bearing code from a partial child artifact that
is inserted without reducing it to a structured replacement, preserving its
nested holes.

**Patch action** — One `GraphPatchAction`, such as `addNode`, `setInput`, or
`setGoal`.

**Placeholder** — Syntactically valid temporary marker-body code used so the
template can be parsed before replacement. It is not emitted after a required
input is successfully filled.

**Planner** — A caller, UI, or LLM that selects templates, authors graphs,
chooses repair actions, or supplies artifact inputs from public catalog
summaries and schemas.

**Planner contract** — Stable metadata exposed to planners: template summaries,
ports, policies, types, schemas, action schemas, and catalog digest. Template
function source is deliberately excluded.

**Port** — A template input or output boundary carrying syntactic and optional
semantic compatibility metadata.

**Prelude** — Caller-provided declarations or imports prepended to a synthetic
or virtual semantic validation source. It models insertion-site bindings
without changing artifact code.

**Producer contract** — The output type, schema, kind, and source identity of a
fragment offered to a consumer port or goal.

**Provenance** — Artifact lineage metadata such as producing node ID, consumed
fragment IDs, and literal inputs. Provenance is descriptive; source spans
provide precise code ownership.

**Published schema** — A generated JSON Schema shipped under the package's
`schemas/` exports for graphs, summaries, results, runner protocols, and the
supported JSON Schema profile.

## R

**Raw code** — Caller- or planner-provided TypeScript source accepted by an
explicit raw-code port or replacement. It is parsed and screened but is not
executed by this library.

**Raw-code policy** — Planner-facing restrictions such as maximum length,
newline allowance, forbidden substrings, and forbidden regular expressions.

**Reference** — A graph input edge targeting another node, written explicitly
as `{ kind: "ref", nodeId }` or using `{ $ref: nodeId }` shorthand.

**Region** — A discovered replaceable range in template source, including its
marker ID, kind, arity, body, and offsets.

**Region builder** — The callback passed to a graph template function. Calling
`region(inputName, body?)` emits the correctly typed marker for that input port.

**Region kind** — The exact TypeScript syntactic category at a graph port or
fragment boundary. In addition to expression and value-oriented kinds, the
library supports type, type member, type parameter, parameter, constructor
parameter, heritage type, declaration, class member, enum member, import
specifier, and export specifier contexts.

**Registry** — A mutable, validated `TemplateRegistry` supporting insert-only
registration, atomic batch registration, explicit replacement, deterministic
listing, summaries, snapshots, and a contract digest.

**Repair hint** — Optional structured guidance attached to a diagnostic, for
example instructing a planner to use an exact scoped artifact input ID.

**Replacement** — A structured low-level value describing code to serialize
into a marker, such as an identifier, expression, statement, array, object, or
object property.

**Replacement map** — A `ReplacementMap` keyed by marker ID. Each value is one
replacement or a non-empty replacement array for a many marker.

**Replacement serialization** — Converting structured replacements into
TypeScript text while applying marker-kind separators and indentation.

**Resolved graph input** — A graph input after runtime validation has selected
the concrete port option and, for references, compiled the child artifact.

**Runner action** — A `GraphRunnerAction`: a graph patch, `replaceGraph`, or
artifact `fill` action.

**Runner state** — One state in the graph repair protocol: `ready`,
`needsGraphRepair`, `needsArtifactInputs`, `complete`, or `failed`.

## S

**Schema alias** — The deprecated standalone `schema` field on outputs,
artifacts, and goals. `TypeDescriptor.schema` is canonical; dual declarations
must be provably equivalent.

**Schema compatibility engine** — The canonical validation, normalization,
value checking, caching, local-reference resolution, and conservative
subsumption implementation in `schemaCompatibility.ts`.

**Schema contract** — The recursive TypeBox structural contract in
`schemaContract.ts` describing the supported JSON data and JSON Schema shapes.
It is used at serialization boundaries and is not by itself the full semantic
schema validator.

**Schema profile** — The exact supported JSON Schema dialect URI, keyword set,
types, reference rules, and behavioral version.

**Security policy** — Syntax-aware screening of raw replacements for imports,
dynamic import, `eval`, `Function`, process/global access, and `require`. It is
source screening, not an execution sandbox.

**Semantic context** — `GraphSemanticContext`, containing an optional prelude
and virtual target-file insertion information for final semantic validation.

**Semantic diagnostic** — A TypeScript compiler issue returned as a structured
`TypeScriptSemanticError` with compiler code, category, artifact-relative
location, and deepest available graph attribution.

**Semantic validation** — Opt-in TypeScript checking of a complete final
artifact in a wrapper or virtual insertion site. It is deliberately deferred
while unresolved markers remain.

**Serialization boundary** — A point where values are persisted, transferred,
accepted from an LLM/API, or emitted as JSON and therefore require closed
runtime contracts and stable identities.

**Shorthand reference** — The concise graph input `{ $ref: "nodeId" }`, which
normalizes to an explicit reference.

**Source allowlist** — See **Allowlist**.

**Source map** — See **Generated source map**.

**Source span** — One node- or input-owned range in a generated source map.
Spans can overlap and use nesting depth to represent composition.

**Source template** — The exact TypeScript fragment selected for replacement
and generation. It may be supplied directly or extracted from a larger source
file by a source-template boundary.

**Source-template boundary** — A paired `@TEMPLATE` / `@END_TEMPLATE`
annotation that explicitly selects template source inside a larger file. Its
opening comment declares a unique ID, output kind, and optional parser mode;
replacement regions may appear inside it.

**Source-template discovery** — Pairing source-template boundaries, extracting
their exact bodies, selecting parser modes, and discovering replacement regions
relative to each extracted body. `fileRegions` retain the corresponding
containing-file offsets, while `containingSourceText` supports virtual semantic
validation without becoming part of emitted output.

**Strict compilation** — Graph compilation with `mode: "strict"`, requiring a
complete final artifact and failing when required inputs remain unresolved.

**Strict graph typing** — Catalog-aware compile-time validation performed by
`StrictSynthesisGraph` and related types for finite inferred graph literals.
Widened dynamic data retains a looser runtime-validated fallback.

**Structured replacement** — A replacement represented as data rather than an
unrestricted TypeScript string, allowing predictable serialization and
validation.

**Supported JSON Schema** — A `SupportedJsonSchema`: boolean schema or closed
object from the library's Draft 2020-12 profile.

**Synthesis** — Selecting, composing, filling, and validating templates to
produce a controlled TypeScript artifact.

**Synthesis graph** — See **Graph**.

**Synthesis node** — See **Node**.

## T

**Template** — A reusable source-producing model. In graph APIs it declares
input ports, an output port, and a template function; in the low-level API it
declares marker patterns and an `apply()` operation.

**Template ID** — The `templateId` stored on nodes, fragments, diagnostics, and
source spans. It refers to a template's declared `modelId`.

**Template invocation** — Rendering one graph template with resolved inputs,
either completely or while preserving missing inputs as markers.

**Template mode** — The parser wrapper context for a file, expression,
expression suffix, statement list, object-property list, or one of the exact
type/declaration contexts. Graph compilation derives it from artifact kind;
caller overrides apply only to low-level APIs.

**Template policy failure** — A failure classification indicating an invalid
or contradictory template/catalog contract rather than a repairable graph or
fillable artifact choice.

**Template summary** — A serializable, implementation-free description of a
template's ID, version, description, input ports, and output port.

**Terminal failure** — A failure classification for session or persisted-state
problems that cannot be corrected through the current graph-patch or fill
channel, such as a digest mismatch or invalid semantic target configuration.

**Transactional operation** — An operation whose rejected result preserves the
previous graph, artifact, catalog, or runner state.

**Type fragment** — Exactly one TypeScript type node with region kind `type`,
such as a union, conditional, mapped, function, or import type. Its optional
`TypeDescriptor` is author-declared metadata; JSON Schema is not inferred from
the syntax.

**Type descriptor** — Optional compatibility metadata containing a
self-contained TypeScript type expression and/or supported JSON Schema.

**TypeScript assignability** — Compiler-backed proof that a producer type can
be assigned to a consumer type. Descriptors must be self-contained ES2022 type
expressions and cannot contain `any`.

**TypeBox contract** — A runtime structural schema created with TypeBox and
checked with TypeBox `Value` APIs. The project uses these contracts as the
source for runtime guards and published JSON Schemas.

**Typed syntax context** — One of the exact first-class type/declaration AST
contexts. Compatibility is exact by region kind, so cross-context reuse
requires an adapter template.

## U

**Union port** — An input port containing multiple concrete alternatives that
share one region kind. Runtime input resolution selects the first compatible
option.

**Unresolved input** — An `UnresolvedTemplateInput` describing one logical
artifact hole: stable ID, input name, owning node/template, port contract, and
optional graph path.

## V

**Variadic port** — Another name for a fragment-collection port: it accepts an
ordered number of fragments subject to minimum and optional maximum bounds.

**Virtual insertion** — Read-only replacement or insertion of complete artifact
code into a real or caller-supplied target source for TypeScript validation.
The target file is never written by semantic validation.

**Virtual target file** — A `SemanticTargetFileContext` containing file identity,
UTF-16 replacement offsets, and optionally an unsaved source buffer.

## W

**Widened graph** — Graph data typed with broad arrays, strings, or records
rather than finite literals. Compile-time checking falls back to structural
shape validation, while runtime validation remains authoritative.

**Wire shape** — The JSON-serializable public representation used by graphs,
artifacts, diagnostics, runner actions/states, summaries, and published schemas.
