# Effect V4 Stream + Sink Template Pack

This pack extends the existing Effect V4 graph-template catalog with a dedicated Stream / Sink vocabulary plus production-oriented compositions.

## Contents

- `effect-stream-sink-template-helpers.ts`
  - Adds the nominal `effect/Sink` descriptor and reusable typed Stream / Sink / Queue / PubSub inputs.
- `effect-stream-v4-templates.ts`
  - 43 Stream templates: constructors, Queue/PubSub/Schedule bridges, mapping/filtering, concurrency, buffering, grouping, retry/scheduling, transduction, and destructors.
- `effect-sink-v4-templates.ts`
  - 22 Sink templates: head/last/count/sum/collect/take/drain/timed, effectful consumption, effect/PubSub sinks, leftovers, folds, and input/result mapping.
- `effect-stream-sink-real-world-templates.ts`
  - 7 higher-level compositions for Queue processing, PubSub consumption, bounded buffering, timed/fixed-size batching, scheduled operations, and observed consumers.
- `effect-stream-sink-template-catalog.ts`
  - Standalone Stream + Sink catalog aggregation.
- `effect-v4-expanded-with-stream-sink-template-catalog.ts`
  - Optional integration catalog that combines this pack with the previously generated expanded real-world catalog.

## Replacement notes

`effect-stream-v4-templates.ts` is intended to replace the earlier Stream template module when model IDs overlap. In particular, it provides V2 definitions for:

- `StreamFromIterable`
- `StreamFromEffect`
- `StreamPaginate`
- `StreamMapEffect`
- `StreamFilter`
- `StreamRetry`
- `StreamRunCollect`
- `StreamRunForEach`

Do not register the old and V2 definitions together if the registry requires model IDs to be unique.

## Runtime/import contract

Generated Stream/Sink source expects the required namespaces to be in scope, normally from:

```ts
import { Effect, Option, Schedule, Sink, Stream } from "effect"
```

Queue and PubSub values are accepted as typed graph inputs, so the composition templates do not need to construct those services themselves.

## Catalog compatibility

The pack intentionally retains the existing catalog's `scheduleType(output, input, requirements)` descriptor rather than changing that shared contract. The upstream Effect V4 release-candidate API is still evolving; schedule-error typing can be migrated separately across the whole catalog if desired.

## Validation performed

- TypeScript host-source parsing for every generated module.
- Unique model IDs within this pack.
- Declared template input keys matched against physical source markers.
- Fallback-generated template source parsed as TypeScript.
