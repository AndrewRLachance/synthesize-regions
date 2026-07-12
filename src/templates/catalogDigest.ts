import { createHash } from 'node:crypto'

import { canonicalizeJson } from './artifactIdentity.js'
import { assertTemplateCatalogValid, TemplateCatalogValidationError } from './catalogValidation.js'
import type {
	GraphTemplateDefinition,
	InputPortSummary,
	RawCodePolicy,
	TemplateSummary
} from './graphTypes.js'

const CATALOG_DIGEST_VERSION = 1

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

function normalizeInputPortSummary(port: InputPortSummary): Record<string, unknown> {
	switch (port.kind) {
		case 'literal':
			return {
				kind: port.kind,
				regionKind: port.regionKind,
				required: port.required,
				...(port.description === undefined ? {} : { description: port.description }),
				...(port.schema === undefined ? {} : { schema: port.schema })
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
					...(port.accepts.type === undefined ? {} : { type: port.accepts.type })
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
					...(port.accepts.type === undefined ? {} : { type: port.accepts.type })
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
				...(port.type === undefined ? {} : { type: port.type })
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
				...(summary.output.type === undefined ? {} : { type: summary.output.type }),
				...(summary.output.schema === undefined ? {} : { schema: summary.output.schema })
			}
		}))
}

/** Compute a digest from already captured, validated template summaries. */
export function templateSummaryContractDigest(summaries: readonly TemplateSummary[]): string {
	const payload = canonicalizeJson([
		'template-catalog-contract',
		CATALOG_DIGEST_VERSION,
		normalizeTemplateSummaries(summaries)
	])
	return `c${CATALOG_DIGEST_VERSION}_${createHash('sha256').update(payload, 'utf8').digest('hex')}`
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
