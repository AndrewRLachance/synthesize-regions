import {
	BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES,
	SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG,
	type BuiltInSynthesisDiagnosticCode,
	type SynthesisDiagnostic,
	type SynthesisDiagnosticOrigin,
	type SynthesisFailureClassification
} from './graphCoreTypes.js'

/** Public operations whose failures are routed through the diagnostic catalog. */
export const SYNTHESIS_DIAGNOSTIC_OPERATION_VALUES = [
	'graphCompilation',
	'artifactFill',
	'artifactSetGraphCompilation',
	'artifactSetAssembly',
	'artifactSetSemanticValidation',
	'artifactSetStaticValidation',
	'graphRunner'
] as const

export type SynthesisDiagnosticOperation = typeof SYNTHESIS_DIAGNOSTIC_OPERATION_VALUES[number]

export interface SynthesisDiagnosticCatalogEntry {
	readonly origin: SynthesisDiagnosticOrigin
	readonly classification: SynthesisFailureClassification
	readonly operations: readonly SynthesisDiagnosticOperation[]
}

const WORKSPACE_CODES = new Set<BuiltInSynthesisDiagnosticCode>([
	'ArtifactBaseFileHashMismatch',
	'InvalidWorkspaceFilePath',
	'InvalidWorkspaceFileSource',
	'DuplicateWorkspaceFilePath',
	'InvalidWorkspaceManifest',
	'InvalidWorkspaceManifestFileIdentity',
	'InvalidWorkspaceManifestOrder',
	'InvalidWorkspaceManifestPath',
	'InvalidUnavailableTextPath',
	'InvalidUnavailableTextPathOrder',
	'UnavailableTextPathMissingFromManifest',
	'UnavailableTextPathsRequireWorkspaceManifest',
	'WorkspaceAnalysisFileUnavailable',
	'WorkspaceFileMissingFromManifest',
	'WorkspaceManifestFileIdentityMismatch',
	'WorkspaceManifestFileUnrepresented',
	'WorkspaceManifestTypeScriptConfigurationMismatch',
	'WorkspaceSnapshotHashMismatch',
	'WorkspaceTextPartitionOverlap'
])

const DEPLOYMENT_CODES = new Set<BuiltInSynthesisDiagnosticCode>([
	'InvalidSemanticTarget',
	'InvalidTypeScriptProjectConfigurationPath',
	'MissingTypeScriptProjectConfiguration',
	'MissingWorkspaceSnapshotIdentity',
	'TypeScriptProjectConfigurationError',
	'TypeScriptGlobalError'
])

const INTEGRITY_CODES = new Set<BuiltInSynthesisDiagnosticCode>([
	'ArtifactAssemblyHashMismatch',
	'ArtifactInputIdCollision',
	'ArtifactLedgerBaseHashMismatch',
	'ArtifactLedgerGraphHashMismatch',
	'ArtifactLedgerResultHashMismatch',
	'ArtifactLedgerUnknownArtifact',
	'ArtifactMarkerArityMismatch',
	'ArtifactMarkerKindMismatch',
	'CatalogDigestMismatch',
	'CatalogManifestDigestMismatch',
	'CompleteArtifactContainsMarkers',
	'DuplicateUnresolvedInputId',
	'InvalidConstraintBoundStaticAcceptance',
	'InvalidGeneratedSourceMap',
	'InvalidImportReconciliationEdit',
	'ImportReconciliationHashMismatch',
	'ImportReconciliationPathMismatch',
	'MalformedArtifactMarkers',
	'MalformedTemplateArtifact',
	'MissingArtifactMarker',
	'MissingTemplateManifestIdentity',
	'PartialArtifactHasNoUnresolvedInputs',
	'TemplateManifestDigestMismatch',
	'UnknownArtifactMarker',
	'UntrustedTemplateCatalogView',
	'UntrustedTemplateDefinition'
])

const INTERNAL_CODES = new Set<BuiltInSynthesisDiagnosticCode>([
	'ArtifactSetCatalogInvalid',
	'CompilationScopeInvalid'
])

const CATALOG_CODES = new Set<BuiltInSynthesisDiagnosticCode>([
	'CatalogContractNotSerializable',
	'ConflictingSchemaMetadata',
	'DuplicateTemplateId',
	'EmptyUnionPort',
	'GenericTypeParameterConstraint',
	'IncompatibleSourceFileMetadata',
	'InvalidCollectionBounds',
	'InvalidCollectionMaximum',
	'InvalidCollectionMinimum',
	'InvalidCallableScope',
	'InvalidJsonSchema',
	'InvalidNominalType',
	'InvalidRawCodeMaxLength',
	'InvalidRawCodePattern',
	'InvalidRawCodePolicy',
	'InvalidTemplateManifest',
	'InvalidTemplateManifestSource',
	'InvalidTypeParameterName',
	'InvalidTypeScriptType',
	'MixedUnionRegionKinds',
	'UnknownSourceModelId',
	'UnknownTemplateReplacement',
	'UndeclaredTypeParameter',
	'UnresolvedLocalSchemaReference',
	'UnresolvedTypeScriptType',
	'UnsupportedSchemaKeyword',
	'UnusedTypeParameter',
	'ForbiddenAnyType'
])

const ALL_OPERATIONS = Object.freeze([...SYNTHESIS_DIAGNOSTIC_OPERATION_VALUES])

/** Return the single authority boundary assigned to a package diagnostic code. */
export function synthesisDiagnosticOriginForCode(code: string): SynthesisDiagnosticOrigin {
	if (!BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES.includes(code as BuiltInSynthesisDiagnosticCode)) return 'internal'
	const builtIn = code as BuiltInSynthesisDiagnosticCode
	if (WORKSPACE_CODES.has(builtIn)) return 'workspace'
	if (DEPLOYMENT_CODES.has(builtIn)) return 'deployment'
	if (INTEGRITY_CODES.has(builtIn)) return 'integrity'
	if (INTERNAL_CODES.has(builtIn)) return 'internal'
	if (CATALOG_CODES.has(builtIn)) return 'catalog'
	return 'candidate'
}

/** Closed, required-origin catalog for every package-owned diagnostic. */
export const SYNTHESIS_DIAGNOSTIC_CATALOG = Object.freeze(Object.fromEntries(
	BUILT_IN_SYNTHESIS_DIAGNOSTIC_CODE_VALUES.map(code => {
		const origin = synthesisDiagnosticOriginForCode(code)
		return [code, Object.freeze({
			origin,
			classification: origin === 'candidate'
				? SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG[code]
				: origin === 'catalog' ? 'templatePolicyFailure' : 'terminalFailure',
			operations: ALL_OPERATIONS
		})]
	})
)) as Readonly<Record<BuiltInSynthesisDiagnosticCode, SynthesisDiagnosticCatalogEntry>>

const PRECEDENCE = [
	'terminalFailure',
	'templatePolicyFailure',
	'graphRepairable',
	'artifactFillable'
] as const

/** Select the strongest authority from already-classified nested operations. */
export function selectSynthesisFailureClassification(
	classifications: readonly SynthesisFailureClassification[]
): SynthesisFailureClassification {
	for (const classification of PRECEDENCE) {
		if (classifications.includes(classification)) return classification
	}
	return 'terminalFailure'
}

/**
 * Classify one failed operation from its gating error diagnostics.
 *
 * Warnings cannot grant repair authority. Unknown codes, invalid origins,
 * unsupported operations, and an empty gating-error set all fail closed.
 */
export function classifySynthesisDiagnostics(
	operation: SynthesisDiagnosticOperation,
	diagnostics: readonly SynthesisDiagnostic[]
): SynthesisFailureClassification {
	if (!SYNTHESIS_DIAGNOSTIC_OPERATION_VALUES.includes(operation)) return 'terminalFailure'
	const classifications: SynthesisFailureClassification[] = []
	for (const diagnostic of diagnostics) {
		if (diagnostic.severity !== 'error') continue
		const entry = Object.prototype.hasOwnProperty.call(SYNTHESIS_DIAGNOSTIC_CATALOG, diagnostic.code)
			? SYNTHESIS_DIAGNOSTIC_CATALOG[diagnostic.code as BuiltInSynthesisDiagnosticCode]
			: undefined
		if (!entry || entry.origin !== diagnostic.origin || !entry.operations.includes(operation)) {
			return 'terminalFailure'
		}
		const classification = entry.origin !== 'candidate'
			? entry.classification
			: operation === 'artifactFill'
				? (entry.classification === 'terminalFailure' || entry.classification === 'templatePolicyFailure'
					? entry.classification : 'artifactFillable')
				: entry.classification === 'artifactFillable' ? 'graphRepairable' : entry.classification
		classifications.push(classification)
	}
	return selectSynthesisFailureClassification(classifications)
}
