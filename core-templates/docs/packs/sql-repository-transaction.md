# Effect V4 SQL / Repository / Transaction Templates

This pack extends the existing Effect V4 graph-template catalog with SQL foundations and production repository / transaction compositions.

## Targeted V4 API surface

The templates target the current Effect V4 RC SQL layout:

- generic SQL modules from `effect/unstable/sql`
- PostgreSQL driver from `@effect/sql-pg`
- `SqlClient.withTransaction` for transaction / nested-savepoint semantics
- `SqlSchema` for request encoding and result decoding
- `SqlModel.makeRepository` for model-derived CRUD repositories
- `SqlModel.makeResolvers` / `SqlResolver` for transaction-aware batching
- `Migrator` for ordered, transactional migrations

SQL remains under Effect's unstable module namespace in V4 RC, so these templates should be versioned as API-sensitive catalog entries.

## Template count

- Foundational SQL templates: **35**
- Repository / transaction compositions: **12**
- Total: **47**

## Foundational templates

- `SqlUnsafeQuery`
- `SqlStatementStream`
- `SqlStatementValues`
- `SqlStatementWithoutTransform`
- `SqlStatementUnprepared`
- `SqlStatementRaw`
- `SqlStatementCompile`
- `SqlSelectAll`
- `SqlSelectById`
- `SqlSelectByIds`
- `SqlInsertRecord`
- `SqlInsertRecordReturning`
- `SqlUpdateById`
- `SqlUpdateByIdReturning`
- `SqlDeleteById`
- `SqlSchemaFindAll`
- `SqlSchemaFindNonEmpty`
- `SqlSchemaFindOne`
- `SqlSchemaFindOneOption`
- `SqlSchemaVoid`
- `SqlResolverOrdered`
- `SqlResolverFindById`
- `SqlResolverVoid`
- `SqlResolverRequest`
- `SqlModelMakeRepository`
- `SqlModelMakeResolvers`
- `SqlRepositoryInsert`
- `SqlRepositoryUpdate`
- `SqlRepositoryFindById`
- `SqlRepositoryDelete`
- `SqlWithTransaction`
- `SqlMigratorFromRecord`
- `SqlMigratorRun`
- `PgClientLayer`
- `EffectSqlSourceFile`

## Repository / transaction compositions

- `SqlRepositoryServiceLayer`
- `SqlBatchedRepositoryServiceLayer`
- `SqlTransactionPair`
- `SqlTransactionalReadModifyWrite`
- `SqlTransactionalCreateWithAudit`
- `SqlTransactionThenEffect`
- `SqlRetryableTransaction`
- `SqlObservedTransaction`
- `SqlTransactionalBatchWrite`
- `SqlHealthCheck`
- `SqlMigratedClientLayer`
- `SqlPaginatedReadStream`

## Design choices

### Parameterization and identifiers

The common query templates use the SQL constructor's identifier helpers for table / column names and tagged-template interpolation for values. `SqlUnsafeQuery` is deliberately explicit and isolated as an escape hatch; values should normally remain separately bound parameters.

### Transactions

`SqlWithTransaction` and the higher-level transaction compositions retrieve the active `SqlClient` and use `sql.withTransaction(...)`. The current V4 implementation starts a top-level transaction and uses savepoints for nested transactions when supported by the driver.

### Repository derivation

`SqlModelMakeRepository` exposes the V4 model-derived repository surface (insert, update, find-by-id, delete). The repository compositions map that derived repository into an application `Context.Service` Layer rather than leaking SQL construction details through domain services.

### Batching

`SqlModelMakeResolvers`, `SqlResolverOrdered`, `SqlResolverFindById`, and `SqlResolverVoid` model V4 SQL batching. Resolver batches are separated by the active SQL transaction connection so requests from different transactions are not incorrectly coalesced.

### Retrying transactions

`SqlRetryableTransaction` gates retries on the structured `SqlError.isRetryable` flag before applying the caller-provided Schedule. Permanent SQL failures and non-SQL domain errors therefore do not get retried by this composition.

### Migrations

`SqlMigratedClientLayer` runs migrations while acquiring a SQL client Layer and retains the client service for downstream repositories. This gives application assembly a single Layer that is not considered ready until migrations have completed.

## Integration

Use `@synthesize-regions/core-templates/effect-v4/sql` for the standalone SQL
pack. The canonical catalog registers it once alongside the stream,
resilience, and testing packs.

## Validation performed

- TypeScript module parse validation
- generated fallback source parse validation
- exact declared-input to marker ownership validation
- duplicate modelId validation within this pack
- collision check against the previously expanded template packs
- no `any` in authored SQL TypeDescriptor strings / helper contracts
