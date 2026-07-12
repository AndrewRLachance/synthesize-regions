import { SynthesizeRegionsError } from '../core/errors.js'
import type { ReplacementRegion } from '../core/types.js'
import { discoverReplacementRegions } from '../regions/discovery.js'
import { portRegionKind } from './compatibility.js'
import { TemplateArtifactSchema, checkContract } from './graphContracts.js'
import type {
	SynthesisDiagnostic,
	TemplateArtifact,
	UnresolvedTemplateInput
} from './graphTypes.js'
import { templateModeForRegionKind } from './rendering.js'

/** Add artifact identity to an integrity diagnostic when the value provides it. */
function artifactIdentity(artifact: TemplateArtifact): Pick<SynthesisDiagnostic, 'nodeId' | 'templateId'> {
	return {
		...(artifact.id ? { nodeId: artifact.id } : {}),
		templateId: artifact.source.templateId
	}
}

/** Create a graph-native integrity error associated with an artifact. */
function integrityDiagnostic(
	artifact: TemplateArtifact,
	diagnostic: Omit<SynthesisDiagnostic, 'severity' | 'nodeId' | 'templateId'>
): SynthesisDiagnostic {
	return {
		...diagnostic,
		...artifactIdentity(artifact),
		severity: 'error'
	}
}

/** Convert a marker/discovery exception into serialization-safe diagnostic data. */
function discoveredMarkerError(error: unknown): unknown {
	if (error instanceof SynthesizeRegionsError) {
		return {
			name: error.name,
			message: error.message,
			metadata: error.metadata
		}
	}
	if (error instanceof Error) return { name: error.name, message: error.message }
	return error
}

/** Group every physical marker occurrence by its logical replacement ID. */
function regionsById(regions: readonly ReplacementRegion[]): Map<string, ReplacementRegion[]> {
	const grouped = new Map<string, ReplacementRegion[]>()
	for (const region of regions) {
		const occurrences = grouped.get(region.id)
		if (occurrences) occurrences.push(region)
		else grouped.set(region.id, [region])
	}
	return grouped
}

/**
 * Validate the structural and marker invariants of a persisted template artifact.
 *
 * Correspondence is defined at the logical marker-ID level. A partial artifact
 * has exactly one unresolved-input descriptor for each unique marker ID, while
 * the same ID may occur in multiple physical regions when a child fragment is
 * composed more than once. A single later fill intentionally replaces all of
 * those occurrences.
 */
export function validateTemplateArtifactIntegrity(value: unknown): SynthesisDiagnostic[] {
	const partialWithOnlyEmptyInputList = typeof value === 'object' && value !== null
		&& 'complete' in value && value.complete === false
		&& 'unresolvedInputs' in value && Array.isArray(value.unresolvedInputs)
		&& value.unresolvedInputs.length === 0
	const validExceptForEmptyInputList = partialWithOnlyEmptyInputList && checkContract(TemplateArtifactSchema, {
		...value,
		unresolvedInputs: [{
			id: '__integrity_probe',
			inputName: '__integrity_probe',
			templateId: '__integrity_probe',
			port: { kind: 'rawCode', regionKind: 'expression' }
		}]
	})
	if (!checkContract(TemplateArtifactSchema, value) && !validExceptForEmptyInputList) {
		return [{
			stage: 'template',
			code: 'MalformedTemplateArtifact',
			severity: 'error',
			message: 'Value does not satisfy the canonical TemplateArtifact contract.',
			expected: 'TemplateArtifact',
			actual: value
		}]
	}

	const artifact = value as TemplateArtifact
	let regions: ReplacementRegion[]
	try {
		regions = discoverReplacementRegions(artifact.code, {
			templateMode: templateModeForRegionKind(artifact.kind),
			filePath: '__template_artifact_integrity__.ts'
		})
	} catch (error) {
		const metadata = error instanceof SynthesizeRegionsError ? error.metadata : undefined
		return [integrityDiagnostic(artifact, {
			stage: 'region',
			code: 'MalformedArtifactMarkers',
			message: error instanceof Error ? error.message : 'Template artifact markers could not be discovered.',
			path: 'code',
			actual: discoveredMarkerError(error),
			...(metadata?.line === undefined ? {} : { line: metadata.line }),
			...(metadata?.column === undefined ? {} : { column: metadata.column })
		})]
	}

	const markerGroups = regionsById(regions)
	if (artifact.complete === true) {
		if (markerGroups.size === 0) return []
		const firstRegion = regions[0]
		return [integrityDiagnostic(artifact, {
			stage: 'region',
			code: 'CompleteArtifactContainsMarkers',
			message: 'A complete template artifact must not contain unresolved marker regions.',
			path: 'code',
			expected: [],
			actual: [...markerGroups].map(([id, occurrences]) => ({ id, occurrences: occurrences.length })),
			...(firstRegion ? { line: firstRegion.line, column: firstRegion.column } : {})
		})]
	}

	const diagnostics: SynthesisDiagnostic[] = []
	if (artifact.unresolvedInputs.length === 0) {
		diagnostics.push(integrityDiagnostic(artifact, {
			stage: 'input',
			code: 'PartialArtifactHasNoUnresolvedInputs',
			message: 'A partial template artifact must declare at least one unresolved input.',
			path: 'unresolvedInputs',
			expected: 'a non-empty array',
			actual: artifact.unresolvedInputs
		}))
	}

	const unresolvedById = new Map<string, { input: UnresolvedTemplateInput; index: number }>()
	for (const [index, input] of artifact.unresolvedInputs.entries()) {
		const existing = unresolvedById.get(input.id)
		if (existing) {
			diagnostics.push(integrityDiagnostic(artifact, {
				stage: 'input',
				code: 'DuplicateUnresolvedInputId',
				message: `Unresolved input ID ${input.id} is declared more than once.`,
				inputName: input.inputName,
				path: `unresolvedInputs[${index}].id`,
				expected: { uniqueId: input.id, firstIndex: existing.index },
				actual: { duplicateId: input.id, duplicateIndex: index }
			}))
			continue
		}
		unresolvedById.set(input.id, { input, index })
	}

	for (const [id, occurrences] of markerGroups) {
		const unresolved = unresolvedById.get(id)
		if (!unresolved) {
			const firstRegion = occurrences[0]!
			diagnostics.push(integrityDiagnostic(artifact, {
				stage: 'region',
				code: 'UnknownArtifactMarker',
				message: `Marker ID ${id} has no matching unresolved-input descriptor.`,
				path: 'code',
				expected: { unresolvedInputId: id },
				actual: { markerId: id, occurrences: occurrences.length },
				line: firstRegion.line,
				column: firstRegion.column
			}))
			continue
		}

		const expectedKind = portRegionKind(unresolved.input.port)
		for (const region of occurrences) {
			if (region.effectiveType !== expectedKind) {
				diagnostics.push(integrityDiagnostic(artifact, {
					stage: 'region',
					code: 'ArtifactMarkerKindMismatch',
					message: `Marker ID ${id} does not match its unresolved input's region kind.`,
					inputName: unresolved.input.inputName,
					path: unresolved.input.path ?? `unresolvedInputs[${unresolved.index}].port`,
					expected: expectedKind,
					actual: region.effectiveType,
					line: region.line,
					column: region.column
				}))
			}

			if (region.arity !== 'one') {
				diagnostics.push(integrityDiagnostic(artifact, {
					stage: 'region',
					code: 'ArtifactMarkerArityMismatch',
					message: `Marker ID ${id} must use single-replacement arity in a template artifact.`,
					inputName: unresolved.input.inputName,
					path: unresolved.input.path ?? `unresolvedInputs[${unresolved.index}].port`,
					expected: 'one',
					actual: region.arity,
					line: region.line,
					column: region.column
				}))
			}
		}
	}

	for (const [id, { input, index }] of unresolvedById) {
		if (markerGroups.has(id)) continue
		diagnostics.push(integrityDiagnostic(artifact, {
			stage: 'input',
			code: 'MissingArtifactMarker',
			message: `Unresolved input ID ${id} has no matching marker region in artifact code.`,
			inputName: input.inputName,
			path: input.path ?? `unresolvedInputs[${index}].id`,
			expected: { markerId: id },
			actual: { unresolvedInputId: id }
		}))
	}

	return diagnostics
}
