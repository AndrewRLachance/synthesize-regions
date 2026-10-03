# Effect V4 Graph-Template Catalog — Audit & Canonicalization Report

This report documents the catalog audit + canonicalization described in
`core-templates-work-todo.md`. It distinguishes **verified corrections**,
**compatibility decisions**, **upstream Effect/API issues**, and **items
awaiting semantic compilation**. Nothing in this phase claims `tsc --strict`
module-resolved semantic compilation; that phase is prepared by
`effect-v4-semantic-compile-fixtures.json`.

## Pinned package versions

| Package | Version | Status |
| --- | --- | --- |
| `effect` | `4.0.0-rc.117` | installed (`node_modules/effect`) |
| `typescript` | `5.9.3` | installed |
| `@effect/platform-node` | — | referenced by generated source, **not installed** |
| `@effect/platform-bun` | — | referenced by generated source, **not installed** |
| `@effect/platform-browser` | — | referenced by generated source, **not installed** |
| `@effect/opentelemetry` | — | referenced by generated source, **not installed** |
| `@effect/sql-pg` | — | referenced by generated source, **not installed** |
| `@effect/vitest` | — | referenced by generated source, **not installed** |
| `@effect/openapi-generator` | — | referenced by generated source, **not installed** |

Every API-related correction below was verified against the installed
`effect@4.0.0-rc.117` declarations (`node_modules/effect/dist/**`). No V3 API
was assumed. Where a referenced package is not installed, the template is
classified `rc-sensitive` and deferred to the semantic-compile phase rather
than "corrected" by guesswork.

## Headline numbers

| Metric | Count |
| --- | --- |
| Modules scanned | 134 |
| Template occurrences discovered (all arrays incl. expanded chains) | 62,971 |
| Distinct `modelId`s discovered | 1,780 |
| Canonical templates (`effect-v4-canonical-template-catalog.ts`) | **1,779** |
| Removed definitions | 1 (`SchemaToArbitraryLazy`) |
| Duplicate `modelId`s found | 1,406 |
| Genuine semantic conflicts among duplicates | **0** |
| API-spelling rewrites applied (Phase 10) | 34 rules / 66 occurrences |
| Import-path migrations applied (Phase 3) | 7 rules / 11 occurrences |
| Nominal-descriptor migrations applied (Phase 4) | 1 |
| Requirement-descriptor corrections (Phase 5) | 4 templates |
| Helper/host type corrections | 6 sites |
| Structural validation | **PASS** (9/9 classes) |
| Templates awaiting semantic compile (`rc-sensitive`) | 61 |

## Phase 1 — Inventory

The raw inventory (`effect-v4-catalog-raw-inventory.json`, built by
`build-effect-v4-catalog-inventory.mts`) enumerated every template exported by
every module in `core-templates/`, including factory-materialized definitions
(1,780 distinct `modelId`s across 134 modules, 62,971 array occurrences, no
module load errors). The machine-readable canonical inventory is
`effect-v4-canonical-template-manifest.json` (1,779 entries with provenance,
output kind, imports, type parameters, input ids, stability, status), built by
`.probe/build-manifest.mts` directly from the canonical catalog's import list
so it cannot disagree with the catalog.

## Phase 2 — Duplicates & overlapping semantics

**Found:** 1,406 duplicate `modelId` occurrences. **Every one is a benign,
single-manifest-digest re-export** (`effect-v4-catalog-duplicate-analysis.json`;
`conflictingModelIdCount: 0`). The known historical IDs were verified
explicitly:

| `modelId` | Resolution |
| --- | --- |
| `DataErrorDeclaration`, `DataTaggedErrorDeclaration` | identical re-exports across aggregators; canonical owner `effect-data-templates` |
| `CauseFail`, `CauseDie`, `CauseCombine` | identical re-exports; canonical owner `effect-cause-templates` |
| `CauseHasFails`, `CauseHasDies`, `CauseHasInterrupts` | identical definitions in **two leaf packs** (`effect-cause-templates` and `effect-error-management-v4-templates`); canonical owner is `effect-cause-templates` (first in catalog order); the dual ownership is recorded in the manifest `notes` |
| Layer / Stream / TestClock / Clock V1-V2 collisions | no distinct-digest collisions exist in the current tree; nothing to deprecate |

**Resolution policy applied:** retain one canonical definition per `modelId`
(recorded with provenance); no template was silently deleted — the single
removal (`SchemaToArbitraryLazy`) is recorded in
`effect-v4-template-replacements.json` with `replacedBy: SchemaToArbitrary`.
No compatibility aliases were needed, and none were invented.

Two **composite pack arrays** (`effectV4GuideGraphTemplateInputs`,
`effectPlatformGraphTemplateInputs`) only re-spread their constituent packs;
the canonical catalog omits them (documented in the catalog header). Their
constituent leaf arrays are imported directly.

## Phase 3 — Import-path normalization

`migrate-effect-v4-imports.mts` + `report-effect-v4-imports.mts` verified every
import specifier in generated source against the pinned package's barrel
layout (`effect-v4-import-resolution.json`: 20 promoted unstable barrels,
138 promoted single-module barrels). **7 rewrite rules / 11 occurrences** were
applied (`effect-v4-import-migration-log.json`), including the
`effect/http-api` → `effect/unstable/httpapi` rename and the older
`effect/<domain>` → `effect/unstable/<domain>` spellings for cluster,
workflow, sql, http, httpapi, rpc, socket, eventlog, persistence, process,
cli, and observability sources. The historical `effect/unstable/cluster`
spelling used by the durable-workflow templates was verified to be the
**current** barrel in rc.117 (cluster is *not* promoted), so no rewrite was
applied there — the migration concern is recorded as checked-and-correct.

**Upstream issue (not a catalog bug):** the `@effect/openapi-generator`
package is not installed and its emitted import paths cannot be verified
against this repository; all 28 templates referencing
`@effect/openapi-generator/OpenApiGenerator` are classified `rc-sensitive`
and deferred (see Phase 10).

## Phase 4 — Shared type helpers

- `effect-template-helpers.ts` is the canonical helper generation. No pack
  redefines `nominalType`, `schemaType`, `layerType`, `scheduleType`,
  `tagType`, or `effectType` (verified by grep across all packs).
- The `Schedule` helper keeps its existing shape:
  `scheduleType(output, input, requirements)`.
- The V3-style nominal `effect/eventlog/EventLog.Identity.Service` was
  repaired to `effect/unstable/eventlog/EventLog.Identity` (rc.117 exposes the
  identity as `EventLog.Identity`, a `Context.ServiceClass`) — 1 rewrite
  (`effect-v4-nominal-migration-log.json`).
- `effect-v4-nominal-type-audit.json`: 122 distinct nominals, 113 resolve
  against the pinned package, 0 missing, 0 undeclared members, 2
  external-not-installed, 7 non-Effect (e.g. `@effect/openapi-generator`).
- `effect-v4-type-descriptor-audit.json`: 341,013 descriptor uses, 1,199
  distinct type expressions, **0 structural failures, 0 phantom
  inconsistencies, 0 `any` uses, 0 unresolved type parameters**.
- The remaining benign helper drift is **documented, not duplicated**: the
  local `resultType` in `effect-ts.ts` is shape-identical to
  `effect-data-type-template-helpers.ts`'s and exists to avoid a circular
  import (documented at the definition site).

**Deliverable:** `effect-v4-canonical-template-helpers.ts` — a single import
point re-exporting the canonical helper surface (44 exports), grouped by
owning module. It typechecks under `strict` +
`exactOptionalPropertyTypes`.

## Phase 5 — Requirements & Layer audit

`audit-effect-v4-requirements.mts` compares each typed template's requirement
slot with the capabilities its **own source** exercises (marker fallback
bodies are stripped before scanning — fallbacks are placeholder defaults; the
input port types model inserted code).

**Corrections applied (verified against rc.117 declarations):**

| Template(s) | Fix |
| --- | --- |
| `ChildProcessSpawnerStreamString`, `ChildProcessSpawnerStreamStringWithStderr`, `ChildProcessSpawnerStreamLines`, `ChildProcessSpawnerStreamLinesWithStderr` | `Stream.unwrap(Effect.map(ChildProcessSpawner.ChildProcessSpawner, …))` accesses the spawner tag, but `streamRequirements` was `never`. The sibling effect templates already modeled `childProcessSpawnerRequirement`; the four stream templates now do too (`childProcessStringStreamType(requirements)` gained the parameter). The handle-derived stream templates keep `never` — correct, the handle is already acquired. |

**Audit calibration (false-positive classes removed, with evidence):**

- `Effect.scoped`, `Layer.effect`, `Layer.effectDiscard`, `Layer.unwrap` all
  type as `Exclude<R, Scope>` — a source wrapped in one has Scope *consumed*
  by construction (verified in `dist/Effect.d.ts`, `dist/Layer.d.ts`).
- `HttpClient` only enters requirements via the `HttpClient.HttpClient` tag or
  execution helpers (`execute`, `get`, `post`, …);
  `HttpClientRequest`/`HttpClientResponse` constructors and client transforms
  (`withCookiesRef`, `filterStatusOk`, …) are value-level.
- `Socket.toStream: (socket) => Stream<Uint8Array, SocketError>` — `R = never`
  (verified); sockets are passed as values; only `Socket.Socket`,
  `Socket.WebSocket`, `Socket.WebSocketConstructor` are services.
- `Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, impl)` *provides*
  the service; the tag reference names the layer target.
- Verified default-service APIs whose use never adds a requirement:
  `Random.next: Effect<number>`; `TestClock.adjust: (d) => Effect<void>` and
  `TestClock.layer: (o?) => Layer<TestClock>`;
  `Config<T> extends Effect<T, ConfigError>`;
  `Logger.layer(loggers)` (provider); platform provider layers
  (`NodeServices.layer`, `BunServices.layer` — packages not installed, so also
  `rc-sensitive`).

**Result:** 0 mechanical failures, 51 documented review items
(`effect-v4-requirements-audit.json`: 11 `error-closed-but-failure-produced`,
5 `layer-closed-but-service-yielded`, 35 `requirement-parameter-dropped` —
consistent-but-lifecycle-sensitive modeling choices, recorded not failed).
No mismatch was "solved" by weakening a requirement to `unknown`.

## Phase 6 — Resource lifecycle

Covered by the requirements audit's Scope analysis and the pack validation
programs. Scoped APIs wrap acquisitions in `Effect.scoped` / layer
constructors; app roots terminate through platform `runMain` /
`Layer.launch`; `unref` semantics in the child-process pack remain explicit.
Lifecycle-sensitive-but-valid templates are the 51 review items above.

## Phase 7 — Source-file import audit

`effect-v4-source-file-import-audit.json` (33 source-file templates, Node and
Bun roots): **0 parse errors, 0 missing imports, 0 unimported type roots,
0 obsolete imports, 0 alias conflicts**. 349 imports are unused by the
templates' own fallback content — these are **composition affordances**
(imports a source-file root provides for regions users insert later) and were
intentionally retained per the audit criterion ("do not require a source-file
root to import every symbol a user may insert dynamically" — and conversely,
roots may provision imports for documented composition). 27 imports reference
external (not-installed) platform packages; their templates are
`rc-sensitive`.

## Phase 8 — Expanded-catalog chain

- The stream naming mismatch is fixed:
  `effect-v4-expanded-with-stream-sink-template-catalog.ts` exports
  `effectV4ExpandedWithStreamSinkGraphTemplateInputs` and imports it
  consistently from the operations chain + `effectStreamSinkV4GraphTemplateInputs`.
- The canonical catalog (`effect-v4-canonical-template-catalog.ts`,
  `effectV4CanonicalGraphTemplateInputs`) imports **75 leaf pack arrays
  directly** — no `expanded-with-X` chaining. Each array is imported once,
  from the module that declares it; the 2 fully redundant composite arrays are
  omitted. Deterministic ordering (imports sorted by module, then array) is
  enforced by the generator and checked by the validator.
- Historical pack/aggregator files are kept for provenance; the canonical
  catalog does not depend on them.

## Phase 9 — Structural validation

`validate-effect-v4-canonical-catalog.js` →
`effect-v4-canonical-catalog-validation.json`. **All check classes PASS** —
source-level (catalog host parse, pack spread resolution, `defineTemplate`
enumeration incl. dynamic factories, marker ownership, fallback parse,
placeholder leaks, duplicate ids, deterministic spread order) and materialized
(runtime marker spans, per-region-kind fallback parse, whole-source parse per
output kind, descriptor parse after fixture substitution, placeholder
resolution, replacement lineage):

| Check | Result | Scope |
| --- | --- | --- |
| catalog-load | PASS | module loads, 1,779 templates |
| unique-canonical-id | PASS | globally unique `modelId`s |
| deterministic-ordering | PASS | sorted, regeneration-stable imports |
| marker-ownership | PASS | 3,155 markers; 1:1 with declared inputs, unique, balanced |
| fallback-parse | PASS | all 3,155 fallbacks parse under their region kind |
| source-parse | PASS | all 1,779 fallback-substituted sources parse under their output kind |
| descriptor-parse | PASS | 6,376 descriptors parse after fixture substitution |
| placeholder-resolution | PASS | every `{{...}}` resolved by the fixture table/conventions |
| replacement-lineage | PASS | removed ids absent; `replacedBy` targets exist |

The canonical catalog and helpers also pass `tsc` under `strict` +
`exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`
(`core-templates/.probe/tsconfig.catalog-check.json`), and the repository's own
`npm run typecheck` and template test suites (97 tests) pass.

## Phase 10 — API verification

`audit-effect-v4-api-usage.mts` checked 2,625 API references across all 1,779
templates against 493 pinned `effect@4.0.0-rc.117` modules:
**0 missing members** after applying the 34 rewrite rules / 66 occurrences in
`effect-v4-template-replacements.json` (e.g. `Layer.scopedDiscard` →
`Layer.effectDiscard`, `Layer.scoped(` → `Layer.effect(`, `Layer.unwrapEffect`
→ `Layer.unwrap`, `Effect.catchAll(` → `Effect.catch(`, `Effect.either(` →
`Effect.result(`, `Effect.zipRight(` → `Effect.andThen(`, `Effect.orElse(` →
`Effect.catchCause(`, `Effect.makeLatch(` → `Latch.make(`,
`Effect.makeSemaphore(` → `Semaphore.make(`, `Schema.decodeUnknown(` →
`Schema.decodeUnknownEffect(`, `Schema.makeEffect/makeOption` →
`SchemaParser.makeEffect/makeOption`, `Schema.toArbitrary(` →
`Arbitrary.schema(`, `Config.mapOrFail(` → `Config.mapEffect(`, PascalCase
`Config` constructors, and `Socket.Socket.of({})` → `Socket.make({…})`).

**Removal (1):** `SchemaToArbitraryLazy` — rc.117 has no lazy
schema-to-Arbitrary factory; `SchemaToArbitrary` (via `Arbitrary.schema`) is
the surviving sibling. Recorded as `replaced`, not deleted silently.

## Host TypeScript corrections (this phase)

Exposed by typechecking the canonical catalog end-to-end:

1. `effect-ts.ts` — `effectType` now returns `TypeDescriptor & { readonly ts: string }` (the `ts` slot is always present).
2. `effect-child-process-template-helpers.ts` — `childProcessExitCodeType` likewise.
3. `effect-security-template-helpers.ts` — `securityCookiesType` returns `TypeDescriptorWithTs`.
4. `effect-http-rest-template-helpers.ts` — `httpClientType` returns `TypeDescriptorWithTs`.
5. `effect-v4-otlp-observability-foundational-templates.ts` — added the missing `otlpHeadersType` import (was an unresolved identifier).
6. Catalog generator — `concat` assembly avoids TS2590 (union of 75 pack literal types too complex); duplicate import bindings eliminated.

## Unresolved API-sensitive items (awaiting semantic compilation)

These are **not** hidden; they are classified `rc-sensitive` in the manifest
and enumerated in `effect-v4-semantic-compile-fixtures.json`:

- **8 unresolved API roots** (references not verifiable here):
  `OpenApiGenerator` (8 refs / 7 templates), `NodeClusterHttp` (4/4),
  `NodeClusterSocket` (2/2), `BunServices`, `NodeFileSystem`, `NodeRuntime`,
  `NodeServices`, `NodeTerminal` (1 each).
- **13 root classes needing semantic compile** (incl. `OpenApiGenerator`,
  `BunRuntime`, `NodeRuntime`, `Resource` (OTel), cluster runners).
- **61 `rc-sensitive` templates**; **59 fixtures** need runtime infrastructure
  beyond `effect`; **14 fixtures** import packages not installed here
  (`@effect/platform-node`, `@effect/platform-bun`, `@effect/platform-browser`,
  `@effect/opentelemetry`, `@effect/sql-pg`, `@effect/vitest`,
  `@effect/openapi-generator`).

**Upstream issues (not catalog bugs):** the OpenAPI generator's emitted import
paths cannot be verified against the promoted V4 barrels from this repository
(generator package absent); platform packages are referenced but not
installed. Both are deferred to the module-resolved semantic compile harness.

## Deliverables

| File | Purpose |
| --- | --- |
| `core-templates/effect-v4-canonical-template-helpers.ts` | single canonical helper import point (44 exports) |
| `core-templates/effect-v4-canonical-template-catalog.ts` | authoritative catalog: `effectV4CanonicalGraphTemplateInputs`, 1,779 templates, no chaining |
| `core-templates/effect-v4-canonical-template-manifest.json` | machine-readable manifest with provenance/stability/status |
| `core-templates/effect-v4-template-replacements.json` | replacement/deprecation map (34 rules, 66 occurrences, 1 removal) |
| `core-templates/EFFECT_V4_CATALOG_AUDIT_REPORT.md` | this report |
| `core-templates/validate-effect-v4-canonical-catalog.js` | structural validator (source-level + materialized check classes) |
| `core-templates/effect-v4-canonical-catalog-validation.json` | validation result — PASS |
| `core-templates/effect-v4-semantic-compile-fixtures.json` | per-template fixtures for the semantic compile harness |
| `core-templates/.probe/build-canonical-catalog.mts` | catalog generator (deterministic, regenerating) |
| `core-templates/.probe/build-manifest.mts` | manifest generator |
| `core-templates/.probe/build-semantic-compile-fixtures.mts` | fixture manifest generator |
| `core-templates/.probe/build-replacements.mts` | replacement-map generator |
| `core-templates/.probe/tsconfig.catalog-check.json` | strict `tsc` config covering the canonical catalog + helpers |

Note: the historical per-pack `validate-*-pack.js` scripts reference
`/mnt/data/...` paths from the environment they were authored in and are kept
for provenance only; the canonical validator above supersedes them and covers
every pack globally.

## Intentionally retained compatibility decisions

- No compatibility aliases were needed: every duplicate was an
  identical-digest re-export, so deduplication loses no definition.
- 349 "unused" source-file imports retained as documented composition
  affordances.
- The local `resultType` in `effect-ts.ts` retained (documented circular-import
  avoidance; shape-identical to the data-type helper).
- Historical `expanded-with-X` catalog modules retained for provenance; the
  canonical catalog does not consume them.
