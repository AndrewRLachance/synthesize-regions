# Drizzle ORM v1 template catalog

This standalone 253-template catalog targets `drizzle-orm@1.0.0-rc.4`. Import
it from `@synthesize-regions/core-templates/drizzle-orm/v1`; it is not part of
the curated or Effect-v4 catalogs. Its generated catalog metadata is exported
as `@synthesize-regions/core-templates/metadata/drizzle-orm-v1.json`.

The catalog is split into explicit SQL, query, relations, schema, runtime, and
Effect Schema packs. Private leaf modules may change; the package subpath,
named definitions, `drizzleOrmV1GraphTemplateInputs`,
`drizzleOrmV1TemplatePacks`, and `createDrizzleOrmV1Registry()` form the public
surface.

## Runtime/import contract

The generated fragments assume the required Drizzle symbols are already imported by the containing source file. Core query/SQL helpers generally come from `drizzle-orm`; dialect schema builders come from the selected dialect package such as `drizzle-orm/pg-core`, `drizzle-orm/mysql-core`, `drizzle-orm/sqlite-core`, `drizzle-orm/mssql-core`, or `drizzle-orm/cockroach-core`. The `drizzle` initializer remains driver-specific.

`drizzle-effect-schema-templates.ts` additionally assumes `createSelectSchema`, `createInsertSchema`, and `createUpdateSchema` from `drizzle-orm/effect-schema`, plus the Effect schema helper type definitions already used by the Effect catalog.

## v1-specific choices

- Uses Relational Queries v2 (`defineRelations` / `defineRelationsPart`), not removed RQBv1 `relations()` APIs.
- Uses table-level casing (`snakeCase.table`, `camelCase.table`) rather than legacy `drizzle({ casing })`.
- Uses `pgTable.withRLS()` rather than deprecated `.enableRLS()`.
- Models PostgreSQL multidimensional arrays with a single `.array("[][]")` shape input rather than chained `.array().array()`.
- Restricts generated-column templates to SQL expressions/thunks as required by v1.
- Uses `getColumns()` rather than deprecated `getTableColumns()`.
- Includes prepared queries with optional names, SQLcommenter `.comment()`, JIT-capable database config, and MSSQL/Cockroach table/column families introduced or formalized for v1.

## Composition philosophy

Templates are small graph nodes rather than whole application snippets. Query construction is staged (`select` → `from` → `where` → `orderBy` etc.), schema columns are staged through builder modifiers (`notNull`, `primaryKey`, `default`, `references`, etc.), and RQBv2 relation/query configuration remains object-composable so existing base object/merge templates can assemble larger configs.

Database-entry query utilities such as PostgreSQL `selectDistinctOn()` and
`$count()` belong to the query pack. Driver-specific `batch()` and
`withReplicas()` operations belong to the runtime pack; `$replicas` is only
available on dialect replica wrappers that expose that property.
