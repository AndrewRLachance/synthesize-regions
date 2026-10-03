# `@synthesize-regions/core-templates`

Companion graph-template catalogs for `synthesize-regions`, including a small
curated catalog, a complete catalog targeting `effect@4.0.0-rc.117`, and a
standalone 253-template catalog targeting `drizzle-orm@1.0.0-rc.4`.

```ts
import { createCoreTemplateRegistry } from '@synthesize-regions/core-templates'
import {
	createEffectV4CanonicalRegistry,
	effectV4CanonicalGraphTemplateInputs
} from '@synthesize-regions/core-templates/effect-v4'
import {
	createDrizzleOrmV1Registry,
	drizzleOrmV1GraphTemplateInputs
} from '@synthesize-regions/core-templates/drizzle-orm/v1'
```

Domain entry points such as `@synthesize-regions/core-templates/effect-v4/http`
allow consumers to load one pack without evaluating the complete catalog.
Template leaf modules are private implementation details.

The Drizzle catalog is versioned separately from the Effect catalog and does
not change the 479 curated or 1,794 Effect-v4 memberships. Its six Effect Schema
bridge templates remain Drizzle-owned because they target
`drizzle-orm/effect-schema`. The generated manifest is available from
`@synthesize-regions/core-templates/metadata/drizzle-orm-v1.json`.

See [`docs/architecture.md`](docs/architecture.md) for ownership, catalog, and
generated-evidence rules.

The isolated semantic audit is intentionally outside the release gate. Install
its pinned dependencies once and compare the AI catalog with the recorded
two-failure baseline:

```bash
npm install --prefix tools/semantic-compile
npm run audit:semantic
```
