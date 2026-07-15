import { SynthesizeRegionsError } from '../core/errors.js'
import type { ReplacementRegion } from '../core/types.js'
import { discoverReplacementRegions } from '../regions/discovery.js'
import {
	compareTypeDescriptors,
	portRegionKind,
	resolveEffectiveTypeDescriptor,
	type TypeDescriptorCompatibilityIssue
} from './compatibility.js'
import { GENERATED_SOURCE_MAP_VERSION } from './graphCoreTypes.js'
import {
	GeneratedSourceMapSchema,
	GeneratedSourceSpanSchema,
	TemplateArtifactSchema,
	checkContract
} from './graphContracts.js'
import type {
	SynthesisDiagnostic,
	TemplateArtifact,
	TypeDescriptor,
	UnresolvedTemplateInput
} from './graphTypes.js'
import type { SupportedJsonSchema } from './schemaTypes.js'
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeArtifactIdentity(value: unknown): Pick<SynthesisDiagnostic, 'nodeId' | 'templateId'> {
	if (!isRecord(value)) return {}
	const source = isRecord(value.source) ? value.source : undefined
	return {
		...(typeof value.id === 'string' ? { nodeId: value.id } : {}),
		...(typeof source?.templateId === 'string' ? { templateId: source.templateId } : {})
	}
}

function metadataIssueCode(code: string): string {
	switch (code) {
		case 'UnsupportedJsonSchemaKeyword': return 'UnsupportedSchemaKeyword'
		case 'UnresolvedJsonSchemaReference': return 'UnresolvedLocalSchemaReference'
		case 'UnsupportedJsonSchemaReference': return 'InvalidJsonSchema'
		default: return code
	}
}

function metadataDiagnostic(
	value: unknown,
	issue: TypeDescriptorCompatibilityIssue,
	path: string,
	inputName?: string
): SynthesisDiagnostic {
	let relative = issue.path.replace(/^(?:actual|expected)\.?/u, '')
	if (path === 'schema' || path.endsWith('.schema')) relative = relative.replace(/^schema\.?/u, '')
	const issuePath = issue.code === 'ConflictingSchemaMetadata' && path === 'type'
		? 'schema'
		: relative ? `${path}.${relative}` : path
	return {
		stage: 'type',
		code: metadataIssueCode(issue.code),
		severity: 'error',
		message: issue.message,
		...safeArtifactIdentity(value),
		...(inputName === undefined ? {} : { inputName }),
		path: issuePath,
		...(issue.expected === undefined ? {} : { expected: issue.expected }),
		...(issue.actual === undefined ? {} : { actual: issue.actual }),
		...(issue.compilerCode === undefined ? {} : { compilerCode: issue.compilerCode }),
		...(issue.compilerCategory === undefined ? {} : { compilerCategory: issue.compilerCategory }),
		...(issue.line === undefined ? {} : { line: issue.line }),
		...(issue.column === undefined ? {} : { column: issue.column })
	}
}

function descriptorDiagnostics(
	value: unknown,
	descriptor: unknown,
	path: string,
	inputName?: string
): SynthesisDiagnostic[] {
	const persistedDescriptor = persistedTypeDescriptor(descriptor)
	if (!persistedDescriptor) return []
	const comparison = compareTypeDescriptors(persistedDescriptor, undefined)
	return comparison.status === 'invalid'
		? comparison.issues.map(issue => metadataDiagnostic(value, issue, path, inputName))
		: []
}

/** Narrow persisted descriptor data enough that validation itself cannot throw. */
function persistedTypeDescriptor(value: unknown): TypeDescriptor | undefined {
	if (!isRecord(value)) return undefined
	if (value.ts !== undefined && typeof value.ts !== 'string') return undefined
	return value as TypeDescriptor
}

function policyDiagnostic(
	value: unknown,
	code: string,
	message: string,
	path: string,
	inputName: string,
	actual?: unknown
): SynthesisDiagnostic {
	return {
		stage: 'policy', code, severity: 'error', message,
		...safeArtifactIdentity(value), inputName, path,
		...(actual === undefined ? {} : { actual })
	}
}

function sourceFileMetadataDiagnostic(
	value: unknown,
	message: string,
	path: string,
	actual: unknown,
	inputName?: string
): SynthesisDiagnostic {
	return {
		stage: 'type',
		code: 'IncompatibleSourceFileMetadata',
		severity: 'error',
		message,
		...safeArtifactIdentity(value),
		...(inputName === undefined ? {} : { inputName }),
		path,
		actual
	}
}

/** Recursively validate planner-facing metadata persisted on one unresolved port. */
function portMetadataDiagnostics(
	value: unknown,
	port: unknown,
	path: string,
	inputName: string
): SynthesisDiagnostic[] {
	const diagnostics: SynthesisDiagnostic[] = []
	if (!isRecord(port) || typeof port.kind !== 'string') return diagnostics
	switch (port.kind) {
		case 'literal':
			if (port.regionKind === 'sourceFile') {
				diagnostics.push(policyDiagnostic(
					value,
					'IncompatibleInputKind',
					'sourceFile unresolved inputs must use a scalar fragment port.',
					`${path}.regionKind`,
					inputName,
					port.kind
				))
			}
			if (port.schema !== undefined) {
				diagnostics.push(...descriptorDiagnostics(value, { schema: port.schema }, `${path}.schema`, inputName))
			}
			break
		case 'fragment':
		case 'fragmentCollection': {
			const accepts = isRecord(port.accepts) ? port.accepts : undefined
			const outputKind = typeof accepts?.outputKind === 'string' ? accepts.outputKind : port.regionKind
			if (port.kind === 'fragmentCollection'
				&& (port.regionKind === 'sourceFile' || outputKind === 'sourceFile')) {
				diagnostics.push(policyDiagnostic(
					value,
					'IncompatibleInputKind',
					'sourceFile unresolved inputs must use a scalar fragment port.',
					`${path}.regionKind`,
					inputName,
					port.kind
				))
			}
			if (port.kind === 'fragment'
				&& (port.regionKind === 'sourceFile' || outputKind === 'sourceFile')
				&& port.regionKind !== outputKind) {
				diagnostics.push(policyDiagnostic(
					value,
					'IncompatibleFragmentKind',
					'sourceFile fragment ports cannot reinterpret another output context.',
					`${path}.accepts.outputKind`,
					inputName,
					outputKind
				))
			}
			if (port.regionKind === 'sourceFile' && accepts?.type !== undefined) {
				diagnostics.push(sourceFileMetadataDiagnostic(
					value,
					'sourceFile fragment ports cannot declare value-level TypeDescriptor metadata.',
					`${path}.accepts.type`,
					accepts.type,
					inputName
				))
			}
			diagnostics.push(...descriptorDiagnostics(value, accepts?.type, `${path}.accepts.type`, inputName))
			if (port.kind === 'fragmentCollection') {
				const minItems = port.minItems ?? 0
				if (typeof minItems !== 'number' || !Number.isInteger(minItems) || minItems < 0) {
					diagnostics.push(policyDiagnostic(value, 'InvalidCollectionMinimum', 'Collection minItems must be a non-negative integer.', `${path}.minItems`, inputName, port.minItems))
				}
				if (port.maxItems !== undefined && (typeof port.maxItems !== 'number' || !Number.isInteger(port.maxItems) || port.maxItems < 0)) {
					diagnostics.push(policyDiagnostic(value, 'InvalidCollectionMaximum', 'Collection maxItems must be a non-negative integer.', `${path}.maxItems`, inputName, port.maxItems))
				} else if (typeof port.maxItems === 'number' && typeof minItems === 'number' && Number.isInteger(minItems) && port.maxItems < minItems) {
					diagnostics.push(policyDiagnostic(value, 'InvalidCollectionBounds', 'Collection maxItems must be greater than or equal to minItems.', path, inputName, { minItems, maxItems: port.maxItems }))
				}
			}
			break
		}
		case 'rawCode': {
			if (port.regionKind === 'sourceFile') {
				diagnostics.push(policyDiagnostic(
					value,
					'IncompatibleInputKind',
					'sourceFile unresolved inputs must use a scalar fragment port.',
					`${path}.regionKind`,
					inputName,
					port.kind
				))
			}
			diagnostics.push(...descriptorDiagnostics(value, port.type, `${path}.type`, inputName))
			const policy = isRecord(port.policy) ? port.policy : undefined
			if (policy?.maxLength !== undefined
				&& (typeof policy.maxLength !== 'number' || !Number.isInteger(policy.maxLength) || policy.maxLength < 0)) {
				diagnostics.push(policyDiagnostic(value, 'InvalidRawCodePolicy', 'Raw-code maxLength must be a non-negative integer.', `${path}.policy.maxLength`, inputName, policy.maxLength))
			}
			const forbiddenPatterns = Array.isArray(policy?.forbiddenPatterns) ? policy.forbiddenPatterns : []
			for (const [index, pattern] of forbiddenPatterns.entries()) {
				if (typeof pattern !== 'string') continue
				try { new RegExp(pattern, 'u') } catch {
					diagnostics.push(policyDiagnostic(value, 'InvalidRawCodePolicy', 'Raw-code forbiddenPatterns must contain valid regular expressions.', `${path}.policy.forbiddenPatterns[${index}]`, inputName, pattern))
				}
			}
			break
		}
		case 'union': {
			if (!Array.isArray(port.options)) break
			if (port.options.length === 0) {
				diagnostics.push(policyDiagnostic(value, 'EmptyUnionPort', 'Union ports must include at least one option.', `${path}.options`, inputName, port.options))
				break
			}
			const regionKinds = new Set<string>()
			let regionKindsKnown = true
			for (const option of port.options) {
				const optionKinds = persistedPortRegionKinds(option)
				if (!optionKinds) {
					regionKindsKnown = false
					break
				}
				for (const kind of optionKinds) regionKinds.add(kind)
			}
			if (regionKindsKnown && regionKinds.size > 1) {
				diagnostics.push(policyDiagnostic(value, 'MixedUnionRegionKinds', 'Every concrete union option must use the same region kind.', `${path}.options`, inputName, [...regionKinds]))
			}
			port.options.forEach((option, index) => diagnostics.push(...portMetadataDiagnostics(value, option, `${path}.options[${index}]`, inputName)))
			break
		}
	}
	return diagnostics
}

/** Read concrete region kinds without trusting an unvalidated persisted port. */
function persistedPortRegionKinds(port: unknown): string[] | undefined {
	if (!isRecord(port)) return undefined
	if (port.kind !== 'union') return typeof port.regionKind === 'string' ? [port.regionKind] : undefined
	if (!Array.isArray(port.options)) return undefined
	const kinds: string[] = []
	for (const option of port.options) {
		const optionKinds = persistedPortRegionKinds(option)
		if (!optionKinds) return undefined
		kinds.push(...optionKinds)
	}
	return kinds
}

/** Validate the versioned source ownership ranges persisted with an artifact. */
function generatedSourceMapDiagnostics(value: Record<string, unknown>): SynthesisDiagnostic[] {
	if (value.sourceMap === undefined) return []

	const diagnostic = (
		message: string,
		path: string,
		expected: unknown,
		actual: unknown
	): SynthesisDiagnostic => ({
		stage: 'template',
		code: 'InvalidGeneratedSourceMap',
		severity: 'error',
		message,
		...safeArtifactIdentity(value),
		path,
		expected,
		actual
	})

	if (!isRecord(value.sourceMap)) {
		return [diagnostic(
			'Artifact sourceMap must satisfy the GeneratedSourceMap contract.',
			'sourceMap',
			'GeneratedSourceMap',
			value.sourceMap
		)]
	}

	const sourceMap = value.sourceMap
	const diagnostics: SynthesisDiagnostic[] = []
	if (!checkContract(GeneratedSourceMapSchema, sourceMap)) {
		diagnostics.push(diagnostic(
			'Artifact sourceMap must satisfy the GeneratedSourceMap contract.',
			'sourceMap',
			{ version: GENERATED_SOURCE_MAP_VERSION, spans: 'GeneratedSourceSpan[]' },
			sourceMap
		))
	}

	if (!Array.isArray(sourceMap.spans)) return diagnostics
	const codeLength = typeof value.code === 'string' ? value.code.length : undefined
	for (const [index, span] of sourceMap.spans.entries()) {
		const path = `sourceMap.spans[${index}]`
		if (!checkContract(GeneratedSourceSpanSchema, span)) {
			diagnostics.push(diagnostic(
				'Generated source span must satisfy its closed node or input contract.',
				path,
				'GeneratedSourceSpan',
				span
			))
			continue
		}

		if (span.end < span.start) {
			diagnostics.push(diagnostic(
				'Generated source span end must be greater than or equal to start.',
				`${path}.end`,
				{ minimum: span.start },
				span.end
			))
		}
		if (codeLength !== undefined && (span.start > codeLength || span.end > codeLength)) {
			diagnostics.push(diagnostic(
				'Generated source span must remain within artifact code.',
				path,
				{ start: 0, end: codeLength },
				{ start: span.start, end: span.end }
			))
		}
	}

	return diagnostics
}

/** Validate artifact output aliases and all recursively persisted input-port metadata. */
function artifactMetadataDiagnostics(value: unknown): SynthesisDiagnostic[] {
	if (!isRecord(value)) return []
	const diagnostics: SynthesisDiagnostic[] = generatedSourceMapDiagnostics(value)
	const rawType = persistedTypeDescriptor(value.type)
	const rawSchema = value.schema as SupportedJsonSchema | undefined
	if (value.kind === 'sourceFile') {
		if (value.type !== undefined) {
			diagnostics.push(sourceFileMetadataDiagnostic(
				value,
				'sourceFile artifacts cannot declare value-level TypeDescriptor metadata.',
				'type',
				value.type
			))
		}
		if (value.schema !== undefined) {
			diagnostics.push(sourceFileMetadataDiagnostic(
				value,
				'sourceFile artifacts cannot declare value-level JSON Schema metadata.',
				'schema',
				value.schema
			))
		}
	}
	const output = resolveEffectiveTypeDescriptor(rawType, rawSchema)
	if (!output.ok) {
		const path = rawType?.schema === undefined && rawSchema !== undefined ? 'schema' : 'type'
		diagnostics.push(...output.issues.map(issue => metadataDiagnostic(value, issue, path)))
	}

	if (Array.isArray(value.unresolvedInputs)) {
		for (const [index, unresolved] of value.unresolvedInputs.entries()) {
			if (!isRecord(unresolved) || !isRecord(unresolved.port) || typeof unresolved.inputName !== 'string') continue
			diagnostics.push(...portMetadataDiagnostics(
				value,
				unresolved.port,
				`unresolvedInputs[${index}].port`,
				unresolved.inputName
			))
		}
	}
	return diagnostics
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
	const metadataDiagnostics = artifactMetadataDiagnostics(value)
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
		return [...metadataDiagnostics, {
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
		return [...metadataDiagnostics, integrityDiagnostic(artifact, {
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
		if (markerGroups.size === 0) return metadataDiagnostics
		const firstRegion = regions[0]
		return [...metadataDiagnostics, integrityDiagnostic(artifact, {
			stage: 'region',
			code: 'CompleteArtifactContainsMarkers',
			message: 'A complete template artifact must not contain unresolved marker regions.',
			path: 'code',
			expected: [],
			actual: [...markerGroups].map(([id, occurrences]) => ({ id, occurrences: occurrences.length })),
			...(firstRegion ? { line: firstRegion.line, column: firstRegion.column } : {})
		})]
	}

	const diagnostics: SynthesisDiagnostic[] = [...metadataDiagnostics]
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
