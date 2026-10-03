Use this as the handoff prompt. It assumes the agent has access to the generated catalog files and should perform the work rather than merely review them.

You are working on a large Effect TypeScript V4 graph-template catalog used for controlled TypeScript source synthesis.

Your task is to perform a **Catalog Audit + Canonicalization** across the entire existing template catalog and produce one authoritative, internally consistent catalog suitable for the later semantic compile harness.

## Primary objective

Turn the accumulated domain packs into a single canonical template catalog with:

- one authoritative definition for every semantic operation
- no unintended duplicate `modelId`s
- explicit replacement/version lineage where multiple historical variants exist
- current Effect V4 import paths
- consistent type descriptors and phantom metadata
- consistent service/Layer requirement modeling
- consistent source-file imports
- machine-readable catalog metadata
- a detailed audit report describing every correction, retained compatibility alias, unresolved ambiguity, and API-sensitive item

Do not merely report problems. Fix the catalog wherever the correct resolution can be established from the current Effect V4 APIs and existing project conventions.

Do not perform broad redesigns unrelated to canonicalization.

---

# Project model

Templates generally use:

```ts
defineTemplate({
	modelId,
	version,
	description,
	typeParameters?,
	inputs,
	output,
	source
})
```

Source insertion uses:

```ts
marker(regionKind, inputId, fallback)
```

Marker ownership is strict:

- every declared input must have exactly one physical marker in `source`
- every marker ID must correspond to a declared input
- marker IDs must be unique within a template
- do not duplicate a marker simply because the resulting value is needed twice; bind it once locally and reuse the local variable

Common helpers include:

- `expressionOutput`
- `statementOutput`
- `typeParameters`
- `typedExpressionInput`
- `callbackInput`
- `effectReturningCallbackType`
- `valueInput`
- `identifierInput`
- `stringInput`
- `typeCodeInput`
- `statementCollectionInput`
- `nominalType`

Common nominal helpers include:

- `schemaType`
- `tagType`
- `layerType`
- `scheduleType`
- `fiberType`
- `configType`
- `refType`
- `deferredType`
- `queueType`
- `pubSubType`
- `streamType`
- `metricType`
- `managedRuntimeType`

Unless intentionally migrated as part of this task, preserve the existing Schedule helper shape:

```ts
scheduleType(output, input, requirements)
```

The graph catalog is intended for synthesis, not handwritten examples. Types and requirements should therefore be as expressive as practical and must not be weakened to `any` just to make inconsistencies disappear.

Host TypeScript style:

- tabs
- single quotes

Embedded generated Effect source may follow the current Effect V4 documentation style.

Prefer explicit Effect-native control flow and explicit lambdas/data-first forms where they reduce overload ambiguity.

Do not introduce macros into generated LLM candidate code.

---

# Catalog scope

Audit all available Effect V4 template packs, including at minimum the following domains if present:

- core Effect / requirements / runtime
- Schema
- Config
- Data / errors
- Schedule / retry
- resources / Scope
- Layer / Context / ManagedRuntime
- concurrency / Fiber / Queue / PubSub / Deferred / Ref
- Streams / Sinks
- observability
- OTLP / production observability
- testing / TestClock / fault injection
- SQL / repositories / transactions
- RPC / service boundaries
- STM / transactional coordination
- sockets / streaming boundaries
- durable workflows / background workflows
- application assembly
- HTTP / REST service boundaries
- Cluster / Sharding / distributed services
- OpenAPI-generated integrations
- EventLog / Persistence / offline-first
- CLI / command applications
- Child Processes / OS integration
- Security / secrets / authentication

Start from the latest expanded catalog available, but inspect the underlying pack modules too. Do not assume the expanded catalog contains the only relevant historical definitions.

---

# Current Effect version

Before making API-related corrections:

1. determine the exact Effect V4 RC currently represented by the repository/package set
2. inspect the installed package metadata and/or current authoritative Effect source/docs
3. pin the audit report to exact versions for:
   - `effect`
   - `@effect/platform-node`
   - `@effect/platform-bun`, if present
   - `@effect/openapi-generator`, if present
   - relevant SQL drivers
   - any other Effect packages imported by generated source

Do not assume APIs from older V3 documentation.

Do not invent APIs that are absent from the pinned version.

The Effect V4 RC has undergone barrel promotions and API movement. Current import paths must be verified rather than inferred.

---

# Phase 1 — Inventory every template

Build a complete inventory containing at least:

```ts
interface CanonicalTemplateManifestEntry {
	modelId: string
	version: string
	category: string
	sourceModule: string
	exportName: string
	outputKind: string
	imports: readonly string[]
	typeParameters: readonly string[]
	inputIds: readonly string[]
	stability: 'stable' | 'experimental' | 'unstable' | 'rc-sensitive'
	status: 'canonical' | 'deprecated' | 'compatibility-alias' | 'replaced'
	replacedBy?: string
	replaces?: readonly string[]
	notes?: readonly string[]
}
```

You may extend the structure if useful.

For factory-created templates, enumerate the actual generated model IDs. Do not only inspect literal `defineTemplate` calls.

Produce counts by:

- pack
- category
- output kind
- version
- status
- stability classification

---

# Phase 2 — Detect duplicate and overlapping semantics

Detect:

- exact duplicate `modelId`s
- same operation represented under multiple IDs
- older V1/V2 variants that should be superseded
- semantically different templates incorrectly sharing an ID
- version changes where source semantics changed but version did not
- compatibility aliases that should be explicit rather than accidental

Known historical duplicate IDs include at least:

```text
DataErrorDeclaration
DataTaggedErrorDeclaration
CauseFail
CauseDie
CauseCombine
CauseHasFails
```

There have also been intentional V1/V2 replacement collisions around areas such as:

- Layer
- Stream
- TestClock
- Clock

Do not blindly delete duplicates.

For each collision, determine whether the correct resolution is:

1. retain newest definition as canonical
2. explicitly deprecate the old definition
3. rename one because the semantics genuinely differ
4. preserve a compatibility alias
5. retain separate versions because they represent distinct supported behavior

Record the resolution in the audit report and manifest.

---

# Phase 3 — Normalize import paths

Inspect every generated source-file template and embedded imports.

Correct obsolete Effect V4 paths.

Known migration issue:

Older Durable Workflow templates used:

```ts
effect/unstable/cluster
```

while later V4 Cluster APIs were promoted to:

```ts
effect/cluster
```

Audit all similar cases.

Pay special attention to public-vs-unstable barrels for:

- cluster
- workflow
- sql
- http
- http-api
- rpc
- socket
- eventlog
- persistence
- process
- cli
- observability

Do not mechanically rewrite an import unless the target API is actually exported there in the pinned Effect version.

Also inspect generated OpenAPI output assumptions. The OpenAPI generator has historically emitted paths that may lag the promoted V4 barrel structure. Record upstream-generator incompatibilities separately from catalog bugs.

---

# Phase 4 — Normalize shared type helpers

Audit nominal and structural type descriptors for consistency.

Check at minimum:

- `Effect<A, E, R>`
- `Layer<ROut, E, RIn>`
- `Schema<A, I, R>`
- current V4 Schema decode/encode service requirements if represented separately
- `Stream<A, E, R>`
- Sink descriptors
- `Fiber<A, E>`
- Schedule output/input/requirements ordering
- `ManagedRuntime`
- Context tags/services
- HTTP API types
- RPC types
- SQL types
- cluster entity/sharding types
- EventLog types
- CLI command types
- child-process command/handle types

Equivalent operations should not use incompatible nominal strings or different phantom-property conventions.

Do not erase useful phantom metadata just to normalize names.

If multiple generations of `effect-template-helpers.ts` exist, determine the canonical helper implementation and update dependent packs to use it.

---

# Phase 5 — Requirements and Layer audit

This is especially important.

For every template returning an Effect or Layer, verify that the modeled requirements match the generated source.

Look for:

- dependencies accidentally modeled as `never`
- dependencies leaking from constructors into service method APIs
- Layers claiming to be closed when requirements remain
- services provided by a Layer but still present in `RIn`
- `Scope` requirements omitted from scoped APIs
- platform requirements missing from CLI/process/network templates
- `HttpClient` dependencies incorrectly considered closed
- serializers/transport requirements hidden by composition helpers
- SQL connection/client requirements modeled inconsistently
- cluster storage or transport dependencies omitted
- EventLog journal/identity/remote dependencies omitted
- observability exporters missing their transport requirements

Prefer correcting descriptors to match actual source semantics.

Do not “solve” requirement mismatches by replacing requirement types with `unknown`.

---

# Phase 6 — Resource lifecycle audit

Inspect templates involving:

- Scope
- fibers
- queues
- sockets
- HTTP servers
- SQL transactions
- ManagedRuntime
- child processes
- workers
- cluster runners
- durable workflows
- OTLP exporters
- EventLog remote replication

Verify generated patterns preserve structured resource ownership.

Rules:

- no detached/global fibers unless that behavior is explicitly the semantic purpose
- long-running resources should normally be Layer- or Scope-owned
- app lifetime should normally terminate through platform `runMain`
- shared operational state should be Layer/service-owned rather than recreated per invocation
- do not convert scoped resources into unsafely persistent globals
- subprocess `unref` semantics must remain explicit
- shutdown/finalizer behavior must not be silently dropped

Record templates that are structurally valid but lifecycle-sensitive.

---

# Phase 7 — Source-file import audit

Every complete source-file template must import everything referenced by its fallback/default source.

Detect:

- missing imports
- obsolete imports
- unused historical imports where removal is safe
- conflicting aliases
- imports from old barrels
- symbols referenced by nested fallback snippets but absent from the source file

Do this for both Node and Bun source roots.

Do not require a source-file root to import every symbol a user may insert dynamically. Only require symbols referenced by the template’s own generated/fallback content and documented built-in composition.

---

# Phase 8 — Expanded-catalog chain audit

Inspect every expanded catalog.

Known historical naming mismatch:

An older expanded integration imported:

```ts
effectV4ExpandedStreamSinkGraphTemplateInputs
```

while the stream integration module exported:

```ts
effectV4ExpandedWithStreamSinkGraphTemplateInputs
```

Find and correct this and any analogous chain break.

Produce exactly one latest canonical expanded export, for example:

```ts
effectV4CanonicalGraphTemplateInputs
```

The canonical catalog must:

- contain every canonical template exactly once
- optionally include explicitly tagged compatibility aliases if the project still needs them
- have deterministic ordering
- have no accidental dependency on historical expanded-catalog chaining
- preferably import individual pack arrays directly rather than building a fragile chain of “expanded-with-X” modules

Keep the historical pack files where useful, but make the new canonical catalog independent of those chains.

---

# Phase 9 — Structural validation

Run or create validators that check every canonical template for:

- host TypeScript parse validity
- fallback generated-source parse validity
- exactly one marker per declared input
- no undeclared markers
- no repeated markers
- no unresolved `{{...}}` placeholders after representative substitution
- valid factory-produced template enumeration
- globally unique canonical IDs
- valid replacement lineage
- source-file output consistency
- deterministic catalog ordering

If an input must be referenced multiple times in generated code, bind the marker once:

```ts
const value = <marker>
```

and reuse `value`.

Do not weaken marker ownership rules.

---

# Phase 10 — API verification

For templates touching current Effect APIs, verify the referenced function/property/module exists in the pinned version.

Prioritize unstable or RC-sensitive domains:

- `effect/cluster`
- workflow
- SQL
- RPC
- sockets
- EventLog
- persistence
- OpenAPI generator
- CLI
- process
- observability

If a template appears semantically plausible but cannot be verified from source/docs/package declarations, mark it `needs-semantic-compile` or equivalent rather than inventing a correction.

---

# Phase 11 — Prepare for semantic compilation

This task is primarily canonicalization, but prepare the catalog for the later semantic compile harness.

Generate a fixture manifest indicating for each template:

- representative substitution values
- expected required imports
- expected environment requirements
- whether the fallback itself can be compiled standalone
- whether it must be embedded in a source-file template
- whether external platform packages are needed
- whether it is intentionally generic and needs concrete type substitutions
- whether runtime infrastructure is needed merely to compile it

Do not claim full semantic compilation unless you actually run module-resolved TypeScript compilation against the pinned packages.

---

# Required deliverables

Create actual files, not just prose.

At minimum produce:

## 1. Canonical helpers

```text
effect-v4-canonical-template-helpers.ts
```

This should resolve helper drift while preserving all necessary shared descriptors.

## 2. Canonical catalog

```text
effect-v4-canonical-template-catalog.ts
```

Export a single authoritative array such as:

```ts
export const effectV4CanonicalGraphTemplateInputs = [
	...
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
```

## 3. Machine-readable manifest

```text
effect-v4-canonical-template-manifest.json
```

Include every canonical/deprecated/replaced ID and provenance.

## 4. Replacement/deprecation map

Either JSON or TypeScript:

```text
effect-v4-template-replacements.json
```

Example:

```json
{
	"OldTemplateId": {
		"status": "replaced",
		"replacedBy": "NewTemplateId",
		"reason": "..."
	}
}
```

## 5. Compatibility report

```text
EFFECT_V4_CATALOG_AUDIT_REPORT.md
```

Include:

- pinned package versions
- total templates discovered
- canonical count
- deprecated/replaced count
- collisions found
- collisions resolved
- stale imports fixed
- requirement inconsistencies fixed
- helper inconsistencies fixed
- source-file import issues fixed
- unresolved API-sensitive items
- templates requiring semantic compile verification
- intentionally retained compatibility aliases

## 6. Validation program

```text
validate-effect-v4-canonical-catalog.js
```

or TypeScript if appropriate.

## 7. Validation result

```text
effect-v4-canonical-catalog-validation.json
```

The result should clearly indicate pass/fail for each validation class.

## 8. Compile-fixture manifest

```text
effect-v4-semantic-compile-fixtures.json
```

This is preparation for the next phase.

## 9. Optional migration patches

If fixing every historical source module directly would create excessive churn, create canonicalized replacement modules and document which historical files they supersede.

Prefer clear replacement over silently maintaining contradictory definitions.

## 10. Bundle

```text
effect-v4-catalog-audit-canonicalization-pack.zip
```

Include all audit outputs.

---

# Known issues to verify explicitly

At minimum inspect these:

1. Duplicate IDs:
   - `DataErrorDeclaration`
   - `DataTaggedErrorDeclaration`
   - `CauseFail`
   - `CauseDie`
   - `CauseCombine`
   - `CauseHasFails`

2. Older V1/V2 collisions around:
   - Layer
   - Stream
   - TestClock
   - Clock

3. Stream expanded-catalog naming mismatch:
   - `effectV4ExpandedStreamSinkGraphTemplateInputs`
   - `effectV4ExpandedWithStreamSinkGraphTemplateInputs`

4. Durable Workflow imports using old:
   - `effect/unstable/cluster`
   instead of the verified current Cluster barrel if applicable.

5. OpenAPI-generated `httpapi` import-path behavior versus current promoted V4 HTTP API barrels.

6. Different generations of `effect-template-helpers.ts`, especially Schema phantom/service metadata.

7. Any source-file roots that still reflect old runtime assembly patterns instead of current `Layer.launch` + platform `runMain` guidance.

---

# Things not to do

Do not:

- change template semantics merely for aesthetic consistency
- rename IDs without recording lineage
- silently delete old definitions
- use `any` to hide type inconsistencies
- replace Effect-native lifecycle management with unmanaged promises
- invent APIs absent from the pinned Effect version
- assume V3 APIs still exist
- mark structural validation as semantic compilation
- hide unresolved RC drift
- manually declare correctness when the compiler or source declarations can determine it
- introduce application-specific business logic into generic templates
- generate unsafe secret-handling patterns
- use macros in synthesized candidate code

---

# Acceptance criteria

The task is complete when:

1. every discovered template has provenance and status
2. the canonical catalog contains exactly one authoritative template for each canonical `modelId`
3. every historical collision has a documented resolution
4. known import migrations are resolved or explicitly marked unresolved
5. canonical helper/type descriptors are internally consistent
6. expanded-catalog naming/chaining issues are removed
7. all canonical templates pass structural marker/source validation
8. source-file fallbacks parse
9. no accidental duplicate canonical IDs remain
10. no unresolved placeholders remain in representative fixtures
11. exact pinned Effect/package versions are documented
12. unstable/RC-sensitive templates are identified
13. a fixture manifest exists for the later module-resolved semantic compile harness
14. the final report clearly distinguishes:
    - verified corrections
    - compatibility decisions
    - upstream Effect/API issues
    - items awaiting semantic compilation

At the end, give a concise summary with:

- discovered template count
- canonical template count
- number of duplicates/collisions resolved
- number of imports migrated
- number of requirement/type issues corrected
- number of unresolved semantic-compile candidates
- links/paths to the canonical catalog, audit report, manifest, validator result, fixture manifest, and zip bundle.

The main distinction I’d preserve for the next agent is: **canonicalization should fix demonstrable catalog inconsistencies now; it should not pretend to be the full `tsc --strict` semantic-compile phase.**