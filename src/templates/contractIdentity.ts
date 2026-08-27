import { Type, type Static } from '@sinclair/typebox'

/** Exact package version implementing the public template contract. */
export const SYNTHESIZE_REGIONS_PACKAGE_VERSION = '0.6.2' as const

/** Version of the artifact-set change-set identity contract. */
export const ARTIFACT_SET_CHANGE_SET_IDENTITY_VERSION = 1 as const

/** Exact supported artifact-set change-set identity syntax. */
export const ARTIFACT_SET_CHANGE_SET_HASH_PATTERN = '^cs1_[a-f0-9]{64}$' as const

/** Version of the normalized, planner-facing template-catalog digest. */
export const TEMPLATE_CATALOG_CONTRACT_DIGEST_VERSION = 7 as const

/** Version of one executable template-manifest digest. */
export const TEMPLATE_MANIFEST_DIGEST_VERSION = 4 as const

/** Version of the aggregate executable catalog-manifest digest. */
export const TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION = 4 as const

/** Version of catalog-specific planner graph schemas. */
export const TEMPLATE_CATALOG_PLANNER_SCHEMA_VERSION = 4 as const

/** Version of the source-free generic capability-closure algorithm. */
export const TEMPLATE_CAPABILITY_CLOSURE_VERSION = 3 as const

/** Exact supported catalog-contract digest syntax. */
export const TEMPLATE_CATALOG_CONTRACT_DIGEST_PATTERN = '^c7_[a-f0-9]{64}$' as const

/** Exact supported executable template-manifest digest syntax. */
export const TEMPLATE_MANIFEST_DIGEST_PATTERN = '^t4_[a-f0-9]{64}$' as const

/** Exact supported executable catalog-manifest digest syntax. */
export const TEMPLATE_CATALOG_MANIFEST_DIGEST_PATTERN = '^m4_[a-f0-9]{64}$' as const

/** Closed TypeBox contract for the current catalog-contract digest. */
export const TemplateCatalogContractDigestSchema = Type.String({
	pattern: TEMPLATE_CATALOG_CONTRACT_DIGEST_PATTERN
})

/** Closed TypeBox contract for the current template-manifest digest. */
export const TemplateManifestDigestSchema = Type.String({
	pattern: TEMPLATE_MANIFEST_DIGEST_PATTERN
})

/** Closed TypeBox contract for the current catalog-manifest digest. */
export const TemplateCatalogManifestDigestSchema = Type.String({
	pattern: TEMPLATE_CATALOG_MANIFEST_DIGEST_PATTERN
})

/** Closed TypeBox contract for an exact library artifact-set change set. */
export const ArtifactSetChangeSetHashSchema = Type.String({
	pattern: ARTIFACT_SET_CHANGE_SET_HASH_PATTERN
})

/** Current normalized catalog-contract digest. */
export type TemplateCatalogContractDigest = Static<typeof TemplateCatalogContractDigestSchema>

/** Current exact executable template-manifest digest. */
export type TemplateManifestDigest = Static<typeof TemplateManifestDigestSchema>

/** Current exact executable catalog-manifest digest. */
export type TemplateCatalogManifestDigest = Static<typeof TemplateCatalogManifestDigestSchema>

/** Exact identity emitted by `createArtifactSetChangeSetHash`. */
export type ArtifactSetChangeSetHash = Static<typeof ArtifactSetChangeSetHashSchema>
