import { createHash } from 'node:crypto'

import { canonicalizeJson } from './artifactIdentity.js'
import { canonicalizeSupportedJsonSchema } from './schemaCompatibility.js'
import {
	JSON_SCHEMA_COMPATIBILITY_ENGINE_VERSION,
	JSON_SCHEMA_DIALECT_URI,
	SUPPORTED_JSON_SCHEMA_VERSION,
	type SupportedJsonSchema
} from './schemaTypes.js'
import { TYPESCRIPT_COMPATIBILITY_ENGINE_VERSION } from './typeScriptCompatibility.js'
import { REGION_SYNTAX_ENGINE_VERSION } from './graphCoreTypes.js'
import { assertTemplateCatalogValid, TemplateCatalogValidationError } from './catalogValidation.js'
import type {
	GraphTemplateDefinition,
	InputPortSummary,
	RawCodePolicy,
	TemplateSummary,
	TypeDescriptor
} from './graphTypes.js'

const CATALOG_CONTRACT_DIGEST_VERSION = 4

/** Version of one executable template-manifest digest. */
export const TEMPLATE_MANIFEST_DIGEST_VERSION = 1 as const

/** Version of the aggregate executable catalog-manifest digest. */
export const TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION = 1 as const

type TemplateManifestDigestInput = Pick<GraphTemplateDefinition<any, string, any>, 'source' | 'summary'>

function sortedUnique(values: readonly string[] | undefined): string[] {
	return [...new Set(values ?? [])].sort()
}

function normalizeRawCodePolicy(policy: RawCodePolicy | undefined): Record<string, unknown> {
	return {
		allowNewlines: policy?.allowNewlines ?? true,
		forbiddenPatterns: sortedUnique(policy?.forbiddenPatterns),
		forbiddenSubstrings: sortedUnique(policy?.forbiddenSubstrings),
		...(policy?.description === undefined ? {} : { description: policy.description }),
		...(policy?.maxLength === undefined ? {} : { maxLength: policy.maxLength })
	}
}

function normalizeSchema(schema: SupportedJsonSchema): SupportedJsonSchema {
	return canonicalizeSupportedJsonSchema(schema)
}

function normalizeTypeDescriptor(
	type: TypeDescriptor | undefined,
	legacySchema?: SupportedJsonSchema
): Record<string, unknown> | undefined {
	if (type === undefined && legacySchema === undefined) return undefined
	const schema = type?.schema ?? legacySchema
	return {
		...(type?.ts === undefined ? {} : { ts: type.ts.trim() }),
		...(schema === undefined ? {} : { schema: normalizeSchema(schema) })
	}
}

function normalizeInputPortSummary(port: InputPortSummary): Record<string, unknown> {
	switch (port.kind) {
		case 'literal':
			return {
				kind: port.kind,
				regionKind: port.regionKind,
				required: port.required,
				...(port.description === undefined ? {} : { description: port.description }),
				...(port.schema === undefined ? {} : { schema: normalizeSchema(port.schema) })
			}
		case 'fragment':
			return {
				kind: port.kind,
				regionKind: port.regionKind,
				required: port.required,
				...(port.description === undefined ? {} : { description: port.description }),
				accepts: {
					outputKind: port.accepts.outputKind,
					...(port.accepts.sourceModelIds === undefined
						? {}
						: { sourceModelIds: sortedUnique(port.accepts.sourceModelIds) }),
					...(port.accepts.type === undefined ? {} : {
						type: normalizeTypeDescriptor(port.accepts.type)
					})
				}
			}
		case 'fragmentCollection':
			return {
				kind: port.kind,
				regionKind: port.regionKind,
				required: port.required,
				...(port.description === undefined ? {} : { description: port.description }),
				accepts: {
					outputKind: port.accepts.outputKind,
					...(port.accepts.sourceModelIds === undefined
						? {}
						: { sourceModelIds: sortedUnique(port.accepts.sourceModelIds) }),
					...(port.accepts.type === undefined ? {} : {
						type: normalizeTypeDescriptor(port.accepts.type)
					})
				},
				separator: port.separator,
				minItems: port.minItems,
				...(port.maxItems === undefined ? {} : { maxItems: port.maxItems })
			}
		case 'rawCode':
			return {
				kind: port.kind,
				regionKind: port.regionKind,
				required: port.required,
				...(port.description === undefined ? {} : { description: port.description }),
				policy: normalizeRawCodePolicy(port.policy),
				...(port.type === undefined ? {} : { type: normalizeTypeDescriptor(port.type) })
			}
		case 'union':
			return {
				kind: port.kind,
				required: port.required,
				...(port.description === undefined ? {} : { description: port.description }),
				options: port.options.map(normalizeInputPortSummary)
			}
	}
}

/** Normalize planner-facing summaries before hashing or snapshotting them. */
export function normalizeTemplateSummaries(
	summaries: readonly TemplateSummary[]
): Record<string, unknown>[] {
	return [...summaries]
		.sort((left, right) => left.modelId < right.modelId ? -1 : left.modelId > right.modelId ? 1 : 0)
		.map(summary => ({
			modelId: summary.modelId,
			...(summary.version === undefined ? {} : { version: summary.version }),
			...(summary.description === undefined ? {} : { description: summary.description }),
			inputs: Object.fromEntries(
				Object.keys(summary.inputs).sort().map(inputName => [
					inputName,
					normalizeInputPortSummary(summary.inputs[inputName]!)
				])
			),
			output: {
				kind: summary.output.kind,
				...(summary.output.description === undefined ? {} : { description: summary.output.description }),
				...(summary.output.type === undefined && summary.output.schema === undefined ? {} : {
					type: normalizeTypeDescriptor(summary.output.type, summary.output.schema)
				})
			}
		}))
}

/** Compute a digest from already captured, validated template summaries. */
export function templateSummaryContractDigest(summaries: readonly TemplateSummary[]): string {
	const payload = canonicalizeJson([
		'template-catalog-contract',
		CATALOG_CONTRACT_DIGEST_VERSION,
		{
			regionSyntaxEngineVersion: REGION_SYNTAX_ENGINE_VERSION,
			jsonSchemaDialect: JSON_SCHEMA_DIALECT_URI,
			jsonSchemaProfileVersion: SUPPORTED_JSON_SCHEMA_VERSION,
			jsonSchemaCompatibilityEngineVersion: JSON_SCHEMA_COMPATIBILITY_ENGINE_VERSION,
			typeScriptCompatibilityEngineVersion: TYPESCRIPT_COMPATIBILITY_ENGINE_VERSION
		},
		normalizeTemplateSummaries(summaries)
	])
	return `c${CATALOG_CONTRACT_DIGEST_VERSION}_${createHash('sha256').update(payload, 'utf8').digest('hex')}`
}

/** Compute the identity of one exact executable template manifest. */
export function templateManifestDigest(template: TemplateManifestDigestInput): string {
	if (typeof template.source !== 'string') throw new TypeError('Template manifest source must be a string.')
	const normalizedSummary = normalizeTemplateSummaries([template.summary()])[0]
	const normalizedSource = template.source.replace(/\r\n?/gu, '\n')
	const payload = canonicalizeJson([
		'template-manifest',
		TEMPLATE_MANIFEST_DIGEST_VERSION,
		{ regionSyntaxEngineVersion: REGION_SYNTAX_ENGINE_VERSION },
		normalizedSummary,
		normalizedSource
	])
	return `t${TEMPLATE_MANIFEST_DIGEST_VERSION}_${createHash('sha256').update(payload, 'utf8').digest('hex')}`
}

/** Compute an order-independent identity for all executable manifests in a catalog. */
export function templateCatalogManifestDigest(
	templates: readonly GraphTemplateDefinition<any, string, any>[]
): string {
	assertTemplateCatalogValid(templates)
	const manifests = [...templates]
		.sort((left, right) => left.modelId < right.modelId ? -1 : left.modelId > right.modelId ? 1 : 0)
		.map(template => ({ modelId: template.modelId, manifestDigest: templateManifestDigest(template) }))
	const payload = canonicalizeJson([
		'template-catalog-manifest',
		TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION,
		manifests
	])
	return `m${TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION}_${createHash('sha256').update(payload, 'utf8').digest('hex')}`
}

/** Compute a stable planner-contract digest for a valid template catalog. */
export function templateCatalogDigest(
	templates: readonly GraphTemplateDefinition<any, string, any>[]
): string {
	assertTemplateCatalogValid(templates)
	try {
		return templateSummaryContractDigest(templates.map(template => template.summary()))
	} catch (error) {
		throw new TemplateCatalogValidationError([{
			stage: 'template',
			code: 'CatalogContractNotSerializable',
			severity: 'error',
			message: 'Template catalog metadata must be deterministic JSON data.',
			actual: error instanceof Error ? { name: error.name, message: error.message } : error
		}])
	}
}

/** Clone JSON-shaped planner metadata with canonical object-key ordering. */
export function cloneTemplateSummaries(summaries: readonly TemplateSummary[]): TemplateSummary[] {
	return JSON.parse(canonicalizeJson(summaries)) as TemplateSummary[]
}
