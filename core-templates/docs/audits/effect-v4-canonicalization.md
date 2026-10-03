# Effect v4 Catalog Audit and Canonicalization

This document consolidates the provenance of the Effect v4 catalog and the
results of its move into `@synthesize-regions/core-templates`. The catalog is
pinned to `effect@4.0.0-rc.117`.

## Current canonical state

| Metric | Result |
| --- | ---: |
| Canonical templates | 1,794 |
| Unique canonical `modelId`s | 1,794 |
| Curated templates | 479 |
| Explicit registered packs | 35 |
| AI templates | 15 |
| Checked markers | 3,183 |
| Structural failures | 0 |

The current authority is the explicit pack registry in
`src/catalogs/effect-v4-packs.ts`. `src/catalogs/effect-v4.ts` flattens it in
order and rejects duplicate IDs. The generated manifest and compact structural
result are respectively:

- `metadata/effect-v4-catalog-manifest.json`
- `evidence/effect-v4-structural-validation.json`

Both are derived from the live catalog by `scripts/generate/generated.mts`.
Check mode regenerates into a temporary directory and compares bytes with these
checked-in files.

## Original audit findings retained as provenance

The pre-package audit scanned 134 interleaved modules and their historical
aggregate chains. It observed 62,971 array occurrences, 1,780 distinct IDs, and
1,406 repeated IDs introduced by the `expanded-with-*` aggregators. The
duplicates had no genuine semantic conflicts. One invalid definition,
`SchemaToArbitraryLazy`, was removed in favor of `SchemaToArbitrary` because
the pinned Effect release has no lazy schema-to-Arbitrary factory.

That audit also recorded:

- 34 API-spelling rewrite rules affecting 66 occurrences;
- seven import-path migration rules affecting 11 occurrences;
- one nominal descriptor migration;
- four requirement-descriptor corrections; and
- six helper or host-type corrections.

The detailed rewrite/removal record remains publishable as
`metadata/effect-v4-template-replacements.json`. Large raw inventories,
individual pack results, detailed migration logs, derived-import dumps, and
generated fixture source are reproducible audit products and are no longer
tracked.

## Ownership correction

The old catalog composed a long sequence of `effect-v4-expanded-with-*`
modules and then silently filtered repeated IDs. Those historical aggregators
and redundant `*-template-catalog.ts` files have been removed. Git history and
this report preserve their provenance.

Every current ID has one physical domain owner. In particular, the three Cause
definitions belong to the core Cause leaf module. The error-management
compatibility array may re-export them for the historical curated membership,
but the canonical errors pack contains only the definitions it owns. Runtime
deduplication is no longer part of catalog assembly.

## Package reorganization verification

The move preserved each template's `modelId`, version, source, pack order, and
manifest digest. Regression tests bind the sorted `(modelId, manifestDigest)`
sets to these pre-move SHA-256 snapshots:

| Catalog | Identity snapshot |
| --- | --- |
| Canonical | `cc08a917fa80b4c0039ebd1aafda00ad7375a4f2ca29b582a8ac1d251a6a4a3c` |
| Curated | `9a20c311d354e1b129bbe95c19d0c87c8a540ee660eb6ef87daa5652444fb2fd` |

The package test suite also checks unique ownership, explicit pack
registration, generated metadata agreement, AI inclusion, public export
loading, and packed-tarball exclusions.

## Semantic compilation baseline

Module-resolved semantic compilation is intentionally an audit command rather
than a passing release gate. The retained baseline in
`evidence/effect-v4-semantic-results.json` covers the 15 AI templates and has
2 known genuine failures:

- `AiErrorRecovery`
- `AiModelMake`

`AiTokenizerCount` and `AiToolkitToLayer` contain recorded ambient-fixture
noise. Reorganization verification must not introduce additional genuine
failures. The isolated harness lives under `tools/semantic-compile`; generated
fixtures and derived imports belong under ignored artifact paths.

## Publication boundary

The tarball contains compiled declarations/code, metadata, documentation, and
the package README. It excludes audit tools, tests, structural/semantic
evidence, raw inventories, archives, and generated fixtures. This keeps the
published catalog reproducible without publishing its working material.
