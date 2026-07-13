# Roadmap

This roadmap prioritizes correctness and deterministic LLM repair behavior before performance and additional synthesis features.

## 1. Generate published schemas from one source of truth

- [x] Generate `schemas/synthesis-graph.schema.json`, `schemas/template-summary.schema.json`, and `schemas/graph-compilation-result.schema.json` from the canonical runtime contracts.
- [x] Include fragment collections and all current diagnostic fields in published schemas.
- [x] Add a schema-generation script and fail CI when generated files differ from committed files.
- [x] Validate representative literal, raw-code, inline, reference, and fragment-collection graphs against the packaged schema files.
- [x] Add an `npm pack` consumer test to ensure the published schemas match the public TypeScript API.

**Done when:** schema-constrained LLM output accepts every supported graph feature, and schema drift fails CI.

## 2. Enforce partial-artifact invariants and stable IDs

- [x] Replace sanitized unresolved-input IDs with deterministic, collision-free opaque IDs.
- [x] Remove the process-global scope counter or make compilation scope explicit and reproducible.
- [x] Verify that artifact markers and `unresolvedInputs` have an exact one-to-one correspondence before and after every fill.
- [x] Reject unknown fill keys and ambiguous input-name aliases with structured diagnostics.
- [x] Reject or explicitly diagnose fills supplied to already complete artifacts.
- [x] Ensure an artifact cannot become `complete: true` while marker regions remain.
- [x] Add collision, malformed-artifact, repeated-fill, and serialization round-trip tests.

**Done when:** partial artifacts can be safely persisted, transferred, merged, and repaired without hidden marker loss or ID collisions.

## 3. Validate catalogs and reject duplicate templates

- [x] Reject duplicate `modelId` values in `defineTemplateCatalog()` and initial registry construction.
- [x] Make template replacement explicit through a separate `replace()` API or registration policy.
- [x] Validate non-empty union ports and require all union options to use a compatible region kind.
- [x] Validate collection bounds, including non-negative integers and `maxItems >= minItems`.
- [x] Validate raw-code policy regular expressions during template registration.
- [x] Validate `sourceModelIds` against the catalog and confirm their output kinds are compatible.
- [x] Consider immutable registry snapshots or catalog digests for reproducible planner sessions.

**Done when:** a valid catalog cannot change meaning silently or contain internally contradictory port contracts.

## 4. Add typed graph patch actions and repair classification

- [x] Introduce schema-backed runner actions such as `addNode`, `removeNode`, `setInput`, `removeInput`, and `setFinalNode`.
- [x] Preserve `replaceGraph` as an escape hatch while favoring small, local mutations.
- [x] Add exported literal unions for diagnostic codes and repair-action kinds.
- [x] Classify failures as graph-repairable, artifact-fillable, template/policy failures, or terminal failures.
- [x] Allow corrected fills after a rejected fill instead of always transitioning permanently to `failed`.
- [x] Add `definePartialGraph()` or `StrictPartialSynthesisGraph` so incomplete LLM graphs retain catalog-aware validation.
- [x] Publish JSON Schemas for runner actions and state transitions.

**Done when:** an LLM can repair a graph through small validated actions without resending the entire graph or guessing whether a failure is retryable.

## 5. Replace ad hoc type and schema compatibility

- [x] Define and document a typed, supported JSON Schema dialect.
- [x] Reject unsupported schema keywords at template registration.
- [x] Use one implementation for literal validation, schema compatibility, final goals, and planner schema generation.
- [x] Replace handwritten TypeScript string comparison with cached compiler assignability or canonical compatibility IDs.
- [x] Decide whether `TypeDescriptor.ts` is enforceable or descriptive, and document that contract.
- [x] Extend strict graph typing to check declared type compatibility where finite literal metadata permits it.
- [x] Add tests for generics, nested unions, object required properties, tuples, bounds, and incompatible schemas.

**Done when:** compile-time checks, runtime checks, semantic validation, and exported schemas do not disagree about compatibility.

## 6. Map semantic diagnostics to contributing child nodes

- [x] Track generated source spans for every node and input during graph composition.
- [x] Preserve span mappings through fragment collections, formatting, and artifact filling.
- [x] Map TypeScript diagnostics to the deepest contributing `nodeId`, `templateId`, and `inputName`.
- [x] Support optional virtual insertion into a real target file for accurate local binding and import context.
- [x] Ensure graph compilation derives validation wrappers from each artifact kind rather than a caller-wide override.
- [x] Add nested-fragment, collection, formatted-output, and target-file attribution tests.

**Done when:** semantic errors identify the graph decision that produced the invalid code, rather than only the final node.

## 7. Reuse TypeScript analysis across a compilation session

- [ ] Introduce a graph compilation/runner validation session with a reusable `ts-morph` project or compiler host.
- [ ] Cache immutable template source discovery and marker analysis at template definition time.
- [ ] Parse raw fragments once for syntax validation and security inspection.
- [ ] Reuse semantic-validation project context across runner repair iterations.
- [ ] Add runtime benchmarks for large graphs and multi-step repair loops.
- [ ] Add TypeScript editor/type-instantiation benchmarks for recursively strict graphs.
- [ ] Replace implicit all-or-nothing loose typing with an explicit dynamic-graph escape hatch where feasible.

**Done when:** repeated compilation and repair avoid redundant parsing, with measurable latency and editor-performance targets.

## Continuous quality work

- [ ] Add `tsconfig.samples.json` and include sample typechecking in CI.
- [ ] Execute curated samples with expected-output assertions.
- [ ] Add property/fuzz tests for marker scanning, normalization, filling, and graph cycles.
- [ ] Add clean-build, package-content, and downstream-consumer smoke tests.
- [ ] Document the raw-code security policy as source screening rather than an execution sandbox.
- [ ] Prefer structured templates or an AST allowlist for untrusted LLM input.
