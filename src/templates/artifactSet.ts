import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { posix } from 'node:path'

import { canonicalizeJson, canonicalizeSynthesisGraph } from './artifactIdentity.js'
import { validateTemplateArtifactIntegrity } from './artifactIntegrity.js'
import {
	compileGraph,
	fillTemplateArtifactWithCatalog,
	validateTemplateArtifactAgainstCatalog
} from './graph.js'
import { runWithAnalysisContext } from '../validation/analysisContext.js'
import type {
	CompleteTemplateArtifact,
	GraphCompileOptions,
	GraphPartialCompilationResult,
	GraphTemplateDefinition,
	RegionKind,
	SynthesisDiagnostic,
	SynthesisFailureClassification,
	SynthesisGraph,
	TemplateArtifact,
	TemplateArtifactInputMap,
	TemplateCatalogView
} from './graphTypes.js'
import { REGION_KIND_VALUES } from './graphTypes.js'
import { captureTemplateCatalogView } from './catalogCapture.js'
import { deepestGeneratedSourceSpan } from './sourceSpans.js'
import { compareCodeUnits } from './deterministic.js'
import {
	classifySynthesisDiagnostics,
	selectSynthesisFailureClassification,
	synthesisDiagnosticOriginForCode
} from './diagnosticCatalog.js'
import {
	buildCapturedTypeScriptProject,
	buildCapturedTypeScriptProjectWithOwner,
	type CapturedCompilerIssue
} from './capturedProject.js'
import { currentSemanticProgramOwner } from '../internal/semanticProgramOwner.js'
import {
	analyzeCapturedTypeScriptBaseline,
	recordCandidateAnalysis
} from './baselineAnalysisCache.js'

const ARTIFACT_SET_IDENTITY_VERSION = 1
const ARTIFACT_SET_WORKSPACE_IDENTITY_VERSION = 2

/** Version of the mandatory checks represented by a validated change set. */
export const ARTIFACT_SET_STATIC_POLICY_VERSION = 2

/** A workspace-relative destination for one generated graph artifact. */
export type ArtifactTarget =
	| {
			kind: 'createFile'
			path: string
	  }
	| {
			kind: 'replaceRange'
			path: string
			/** Inclusive UTF-16 offset in the captured base file. */
			start: number
			/** Exclusive UTF-16 offset in the captured base file. */
			end: number
			/** Hash returned by `createArtifactSetFileHash()` for the captured base file. */
			baseFileHash: string
			/** Exact syntax context expected at the replacement site. */
			regionKind: RegionKind
	  }

/** One independently compiled graph and the workspace location that consumes it. */
export interface ArtifactSetUnit {
	id: string
	graph: SynthesisGraph
	target: ArtifactTarget
}

/** Ordered collection of graph artifacts compiled as one candidate change set. */
export interface ArtifactSetPlan {
	artifacts: ArtifactSetUnit[]
}

/**
 * A replayable fill applied to a partial artifact.
 *
 * Hashes bind the fill to one graph and one exact base/result artifact pair.
 */
export interface ArtifactFillLedgerEntry {
	artifactId: string
	graphHash: string
	baseArtifactHash: string
	inputs: TemplateArtifactInputMap
	resultingArtifactHash: string
}

/** Additional caller-owned state used to validate and assemble artifact targets. */
export interface ArtifactSetCompileOptions extends GraphCompileOptions {
	mode?: 'strict' | 'partial'
	/** Captured workspace files keyed by workspace-relative path. */
	workspaceFiles?: Readonly<Record<string, string>>
	/**
	 * Canonical manifest paths whose captured bytes are not UTF-8 text.
	 *
	 * When a manifest is supplied this list and `workspaceFiles` form an exact,
	 * disjoint partition of every manifest file.
	 */
	unavailableTextPaths?: readonly string[]
	/** Filesystem root used only as TypeScript source-file identity. */
	workspaceRoot?: string
	/** Identity of the immutable workspace snapshot supplied by the caller. */
	workspaceSnapshotId?: string
	/** Canonical runtime capture manifest used to verify the full snapshot identity. */
	workspaceManifest?: ArtifactSetWorkspaceManifest
	/** Captured tsconfig paths explicitly authorized as project references. */
	authorizedProjectReferences?: readonly string[]
	/** Ordered, hash-chained fills to replay after partial graph compilation. */
	fillLedger?: readonly ArtifactFillLedgerEntry[]
}

/** Canonical immutable workspace manifest accepted at static phase boundaries. */
export interface ArtifactSetWorkspaceManifest {
	schemaVersion: 2
	providerId: string
	providerSnapshotId: string
	revision: string
	capturePolicyDigest: string
	tsConfigFilePath: string
	files: readonly {
		path: string
		byteLength: number
		contentHash: string
		blobHash: string
	}[]
	symlinks: readonly { path: string; target: string }[]
}

/** Artifact-set diagnostic with optional attribution to one authored unit. */
export interface ArtifactSetDiagnostic extends SynthesisDiagnostic {
	artifactId?: string
}

/** One replacement represented in both base-file and assembled-file coordinates. */
export interface ArtifactSetTextEdit {
	artifactId: string
	start: number
	end: number
	resultStart: number
	resultEnd: number
	replacement: string
	artifactHash: string
}

/** One complete file produced by assembling one or more artifact targets. */
export type ArtifactSetChange =
	| {
			kind: 'createFile'
			path: string
			resultingFileHash: string
			sourceText: string
			/** Edits remain in authored artifact order. */
			edits: ArtifactSetTextEdit[]
	  }
	| {
			kind: 'modifyFile'
			path: string
			baseFileHash: string
			resultingFileHash: string
			sourceText: string
			/** Edits remain in authored artifact order. */
			edits: ArtifactSetTextEdit[]
	  }

/** Identities captured by the static acceptance gate. */
export interface ArtifactSetAcceptanceIdentity {
	contractDigest: string
	manifestDigest: string
	workspaceSnapshotHash: string
	staticPolicyVersion: number
	constraintAcceptance?: ConstraintBoundStaticAcceptance
}

/** Exact successful Workspace Constraint evidence accepted by final static validation. */
export interface ConstraintBoundStaticAcceptance {
	schemaVersion: 2
	constraintEntryPath: string
	constraintDigest: string
	constraintSourceSnapshotHash: string
	constraintEngineVersion: 4
	evaluatorIdentity: string
	toolchainIdentity: string
	analysisSnapshotHash: string
	phaseEvidence: {
		plan: { taskHash: string; resultBlobHash: string }
		artifact: { taskHash: string; resultBlobHash: string }
		assembled: { taskHash: string; resultBlobHash: string }
		semantic: { taskHash: string; resultBlobHash: string }
	}
}

/** A complete, statically accepted set of in-memory workspace changes. */
export interface ValidatedArtifactChangeSet {
	validation: 'static'
	changes: ArtifactSetChange[]
	changeSetHash: string
	contractDigest: string
	manifestDigest: string
	workspaceSnapshotHash: string
	staticPolicyVersion: number
	constraintAcceptance?: ConstraintBoundStaticAcceptance
}

/** Compilation and optional fill result for one artifact-set unit. */
export interface ArtifactSetUnitCompilation {
	artifactId: string
	graphHash: string
	target: ArtifactTarget
	compilation: GraphPartialCompilationResult
	artifact?: TemplateArtifact
	artifactHash?: string
	appliedFills: ArtifactFillLedgerEntry[]
	diagnostics: ArtifactSetDiagnostic[]
}

interface ArtifactSetCompilationResultBase {
	kind: 'artifactSetCompilation'
	mode: 'strict' | 'partial'
	plan: ArtifactSetPlan
	units: ArtifactSetUnitCompilation[]
	diagnostics: ArtifactSetDiagnostic[]
	/** Present whenever catalog capture succeeded. */
	contractDigest?: string
	/** Present whenever catalog capture succeeded. */
	manifestDigest?: string
	/** Present whenever caller-owned workspace data could be normalized. */
	workspaceSnapshotHash?: string
}

/** A complete, assembled artifact set. */
export type ArtifactSetCompleteCompilationResult = ArtifactSetCompilationResultBase
	& ValidatedArtifactChangeSet
	& {
		ok: true
		complete: true
	}

/** A valid partial result whose unresolved inputs have not all been filled. */
export interface ArtifactSetIncompleteCompilationResult extends ArtifactSetCompilationResultBase {
	mode: 'partial'
	ok: true
	complete: false
	changes: []
}

/** A failed plan, graph compilation, ledger replay, target assembly, or static check. */
export interface ArtifactSetFailedCompilationResult extends ArtifactSetCompilationResultBase {
	ok: false
	complete: false
	classification: SynthesisFailureClassification
	changes: []
}

export type ArtifactSetStrictCompilationResult =
	| (ArtifactSetCompleteCompilationResult & { mode: 'strict' })
	| (ArtifactSetFailedCompilationResult & { mode: 'strict' })

export type ArtifactSetPartialCompilationResult =
	| (ArtifactSetCompleteCompilationResult & { mode: 'partial' })
	| ArtifactSetIncompleteCompilationResult
	| (ArtifactSetFailedCompilationResult & { mode: 'partial' })

export type ArtifactSetCompilationResult =
	| ArtifactSetStrictCompilationResult
	| ArtifactSetPartialCompilationResult

interface ArtifactSetGraphCompilationResultBase {
	kind: 'artifactSetGraphCompilation'
	mode: 'strict' | 'partial'
	plan: ArtifactSetPlan
	units: ArtifactSetUnitCompilation[]
	diagnostics: ArtifactSetDiagnostic[]
	contractDigest?: string
	manifestDigest?: string
	workspaceSnapshotHash?: string
}

export type ArtifactSetGraphCompilationResult =
	| (ArtifactSetGraphCompilationResultBase & { ok: true; complete: true })
	| (ArtifactSetGraphCompilationResultBase & { ok: true; complete: false; mode: 'partial' })
	| (ArtifactSetGraphCompilationResultBase & { ok: false; complete: false; classification: SynthesisFailureClassification })

/** Complete artifact input accepted by the pure target assembler. */
export interface ArtifactSetAssemblyUnit {
	id: string
	target: ArtifactTarget
	artifact: CompleteTemplateArtifact
	artifactHash?: string
}

/** Caller-owned workspace state used by the pure target assembler. */
export interface ArtifactSetAssemblyOptions {
	workspaceFiles?: Readonly<Record<string, string>>
	/** Manifest files intentionally excluded from the UTF-8 text view. */
	unavailableTextPaths?: readonly string[]
	workspaceRoot?: string
	/** Required for project-backed acceptance; omitted only for standalone new files. */
	workspaceSnapshotId?: string
	workspaceManifest?: ArtifactSetWorkspaceManifest
	/** Captured tsconfig paths explicitly authorized as project references. */
	authorizedProjectReferences?: readonly string[]
	tsConfigFilePath?: string
	/** Fixed raw/generated-source security policy used by static acceptance. */
	securityPolicy?: NonNullable<GraphCompileOptions['securityPolicy']>
}

export type ArtifactSetAssemblyResult =
	| {
			ok: true
			validation: 'syntax'
			changes: ArtifactSetChange[]
			changeSetHash: string
			contractDigest: string
			manifestDigest: string
			workspaceSnapshotHash: string
			diagnostics: ArtifactSetDiagnostic[]
	  }
	| {
			ok: false
			classification: SynthesisFailureClassification
			changes: []
			diagnostics: ArtifactSetDiagnostic[]
	  }

export type ArtifactSetStaticValidationResult =
	| ({ ok: true; diagnostics: ArtifactSetDiagnostic[] } & ValidatedArtifactChangeSet)
	| {
			ok: false
			classification: SynthesisFailureClassification
			changes: []
			diagnostics: ArtifactSetDiagnostic[]
	  }

export type ArtifactSetSemanticValidationResult =
	| {
			ok: true
			validation: 'semantic'
			changes: ArtifactSetChange[]
			contractDigest: string
			manifestDigest: string
			workspaceSnapshotHash: string
			diagnostics: ArtifactSetDiagnostic[]
	  }
	| {
			ok: false
			classification: SynthesisFailureClassification
			changes: []
			diagnostics: ArtifactSetDiagnostic[]
	  }

interface NormalizedWorkspace {
	files: Map<string, string>
	diagnostics: ArtifactSetDiagnostic[]
}

interface PreparedAssemblyUnit extends ArtifactSetAssemblyUnit {
	authoredIndex: number
	target: ArtifactTarget
	artifactHash: string
}

type CompilerIssue = CapturedCompilerIssue

/** Normalize a caller-provided path into the artifact protocol's workspace form. */
export function normalizeArtifactTargetPath(input: string): string {
	if (typeof input !== 'string' || input.length === 0) {
		throw new TypeError('Artifact target path must be a non-empty string.')
	}
	if (input.includes('\0')) {
		throw new TypeError('Artifact target path cannot contain a NUL character.')
	}

	const portable = input.replace(/\\/gu, '/')
	if (portable.startsWith('/') || /^[A-Za-z]:/u.test(portable)) {
		throw new TypeError('Artifact target path must be workspace-relative.')
	}

	const normalized = posix.normalize(portable)
	if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
		throw new TypeError('Artifact target path must remain inside the workspace.')
	}
	return normalized.replace(/^\.\//u, '')
}

/** Hash captured file text for optimistic target validation. */
export function createArtifactSetFileHash(sourceText: string): string {
	return versionedHash('f', ['artifact-set-file', ARTIFACT_SET_IDENTITY_VERSION, sourceText])
}

/** Hash graph semantics independently of top-level node array order. */
export function createArtifactSetGraphHash(graph: SynthesisGraph): string {
	return versionedHash('g', [
		'artifact-set-graph',
		ARTIFACT_SET_IDENTITY_VERSION,
		canonicalizeSynthesisGraph(graph)
	])
}

/** Hash a persisted complete or partial artifact, including its unresolved contract. */
export function createArtifactSetArtifactHash(artifact: TemplateArtifact): string {
	return versionedHash('a', [
		'artifact-set-artifact',
		ARTIFACT_SET_IDENTITY_VERSION,
		artifact
	])
}

/** Compute the stable identity of an already assembled change set. */
export function createArtifactSetChangeSetHash(
	changes: readonly ArtifactSetChange[],
	identity?: Omit<ArtifactSetAcceptanceIdentity, 'staticPolicyVersion'> & { staticPolicyVersion?: number }
): string {
	return versionedHash('cs', [
		'artifact-change-set',
		ARTIFACT_SET_IDENTITY_VERSION,
		identity ?? null,
		changes.map(change => ({
			kind: change.kind,
			path: change.path,
			...(change.kind === 'modifyFile' ? { baseFileHash: change.baseFileHash } : {}),
			resultingFileHash: change.resultingFileHash,
			edits: change.edits.map(edit => ({
				artifactId: edit.artifactId,
				start: edit.start,
				end: edit.end,
				resultStart: edit.resultStart,
				resultEnd: edit.resultEnd,
				artifactHash: edit.artifactHash
			}))
		}))
	])
}

/** Hash a normalized immutable workspace snapshot for candidate binding. */
export function createArtifactSetWorkspaceSnapshotHash(
	workspaceFiles: Readonly<Record<string, string>>,
	workspaceSnapshotId?: string,
	tsConfigFilePath?: string,
	workspaceManifest?: ArtifactSetWorkspaceManifest,
	unavailableTextPaths?: readonly string[]
): string {
	const workspace = normalizeWorkspaceFiles(workspaceFiles)
	if (hasErrors(workspace.diagnostics)) {
		throw new TypeError(workspace.diagnostics.map(diagnostic => diagnostic.message).join('\n'))
	}
	const manifestDiagnostics = workspaceManifestDiagnostics(
		workspace.files, workspaceManifest, tsConfigFilePath, unavailableTextPaths
	)
	if (hasErrors(manifestDiagnostics)) throw new TypeError(manifestDiagnostics.map(diagnostic => diagnostic.message).join('\n'))
	const actual = workspaceSnapshotHash(workspace.files, undefined, tsConfigFilePath, workspaceManifest)
	if (workspaceSnapshotId !== undefined && workspaceSnapshotId !== actual) {
		throw new TypeError(`Expected workspace snapshot ${workspaceSnapshotId}, captured ${actual}.`)
	}
	return actual
}

/**
 * Validate targets and assemble complete artifacts without writing files.
 *
 * Paths and ranges are checked before any candidate source is returned.
 */
export function assembleArtifactSetTargets(
	units: readonly ArtifactSetAssemblyUnit[],
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: ArtifactSetAssemblyOptions = {}
): ArtifactSetAssemblyResult {
	let catalogView: TemplateCatalogView
	try {
		catalogView = captureCatalog(catalog)
	} catch (error) {
		return {
			ok: false, classification: 'terminalFailure', changes: [],
			diagnostics: catalogErrorDiagnostics(error)
		}
	}
	const workspace = normalizeWorkspaceFiles(options.workspaceFiles ?? {})
	const diagnostics = [...workspace.diagnostics]
	const capturedWorkspaceHash = workspaceSnapshotHash(
		workspace.files,
		options.workspaceSnapshotId,
		options.tsConfigFilePath,
		options.workspaceManifest
	)
	diagnostics.push(...workspaceIdentityDiagnostics(capturedWorkspaceHash, options.workspaceSnapshotId))
	diagnostics.push(...workspaceManifestDiagnostics(
		workspace.files, options.workspaceManifest, options.tsConfigFilePath,
		options.unavailableTextPaths
	))
	const prepared: PreparedAssemblyUnit[] = []
	const seenIds = new Set<string>()
	let hasArtifactIntegrityFailure = false

	for (const [authoredIndex, unit] of units.entries()) {
		if (typeof unit.id !== 'string' || unit.id.length === 0) {
			diagnostics.push(setDiagnostic('InvalidArtifactId', 'Artifact IDs must be non-empty strings.', {
				path: `artifacts[${authoredIndex}].id`, actual: unit.id
			}))
			continue
		}
		if (seenIds.has(unit.id)) {
			diagnostics.push(setDiagnostic('DuplicateArtifactId', `Artifact ID ${unit.id} is duplicated.`, {
				artifactId: unit.id, path: `artifacts[${authoredIndex}].id`, actual: unit.id
			}))
			continue
		}
		seenIds.add(unit.id)
		const integrityDiagnostics = validateTemplateArtifactAgainstCatalog(
			unit.artifact,
			catalogView,
			options.securityPolicy === undefined
				? {}
				: { securityPolicy: options.securityPolicy }
		).map(diagnostic => ({
			...diagnostic,
			artifactId: unit.id
		}))
		diagnostics.push(...integrityDiagnostics)
		if (integrityDiagnostics.some(diagnostic => diagnostic.severity === 'error')) {
			hasArtifactIntegrityFailure = true
			continue
		}
		const target = normalizeArtifactTargetValue(
			unit.target,
			unit.id,
			`artifacts[${authoredIndex}].target`,
			diagnostics
		)
		if (!target) continue
		const artifactHash = createArtifactSetArtifactHash(unit.artifact)
		if (unit.artifactHash !== undefined && unit.artifactHash !== artifactHash) {
			diagnostics.push(setDiagnostic(
				'ArtifactAssemblyHashMismatch',
				`Supplied artifact hash does not match artifact ${unit.id}.`,
				{ artifactId: unit.id, expected: artifactHash, actual: unit.artifactHash }
			))
			continue
		}
		prepared.push({
			...unit,
			target,
			authoredIndex,
			artifactHash
		})
	}

	if (hasErrors(diagnostics)) {
		return {
			ok: false,
				classification: classifySynthesisDiagnostics('artifactSetAssembly', diagnostics),
			changes: [], diagnostics
		}
	}

	const grouped = new Map<string, PreparedAssemblyUnit[]>()
	for (const unit of prepared) {
		const group = grouped.get(unit.target.path)
		if (group) group.push(unit)
		else grouped.set(unit.target.path, [unit])
	}

	const changes: ArtifactSetChange[] = []
	for (const [path, group] of grouped) {
		const creates = group.filter(unit => unit.target.kind === 'createFile')
		if (creates.length > 0) {
			if (group.length !== 1) {
				diagnostics.push(setDiagnostic(
					'ArtifactTargetPathCollision',
					`Create-file target ${path} cannot be combined with another target.`,
					{
						...(creates[0] === undefined ? {} : { artifactId: creates[0].id }),
						path,
						actual: group.map(unit => unit.id)
					}
				))
				continue
			}
			if (workspace.files.has(path)) {
				diagnostics.push(setDiagnostic(
					'ArtifactCreateFileExists',
					`Create-file target ${path} already exists in the captured workspace.`,
					{ ...(creates[0] === undefined ? {} : { artifactId: creates[0].id }), path }
				))
				continue
			}

			const unit = creates[0]!
			if (unit.artifact.kind !== 'sourceFile') {
				diagnostics.push(setDiagnostic(
					'ArtifactTargetKindMismatch',
					`Create-file artifact ${unit.id} must produce a complete sourceFile artifact.`,
					{ artifactId: unit.id, path, expected: 'sourceFile', actual: unit.artifact.kind }
				))
				continue
			}
			const sourceText = unit.artifact.code
			changes.push({
				kind: 'createFile',
				path,
				resultingFileHash: createArtifactSetFileHash(sourceText),
				sourceText,
				edits: [{
					artifactId: unit.id,
					start: 0,
					end: 0,
					resultStart: 0,
					resultEnd: sourceText.length,
					replacement: sourceText,
					artifactHash: unit.artifactHash
				}]
			})
			continue
		}

		const baseSource = workspace.files.get(path)
		if (baseSource === undefined) {
			diagnostics.push(setDiagnostic(
				'MissingArtifactBaseFile',
				`Replacement target ${path} is absent from the captured workspace.`,
				{ ...(group[0] === undefined ? {} : { artifactId: group[0].id }), path }
			))
			continue
		}
		const baseFileHash = createArtifactSetFileHash(baseSource)
		const edits: Array<ArtifactSetTextEdit & { authoredIndex: number }> = []

		for (const unit of group) {
			const target = unit.target
			if (target.kind !== 'replaceRange') continue
			if (target.baseFileHash !== baseFileHash) {
				diagnostics.push(setDiagnostic(
					'ArtifactBaseFileHashMismatch',
					`Replacement target ${path} does not match its captured base file.`,
					{
						artifactId: unit.id, path,
						expected: baseFileHash, actual: target.baseFileHash
					}
				))
				continue
			}
			if (!validTargetRange(target.start, target.end, baseSource.length)) {
				diagnostics.push(setDiagnostic(
					'InvalidArtifactTargetRange',
					`Replacement range [${target.start}, ${target.end}) is invalid for ${path}.`,
					{
						artifactId: unit.id, path,
						expected: { minimum: 0, maximum: baseSource.length },
						actual: { start: target.start, end: target.end }
					}
				))
				continue
			}
			if (unit.artifact.kind !== target.regionKind) {
				diagnostics.push(setDiagnostic(
					'ArtifactTargetKindMismatch',
					`Artifact ${unit.id} produces ${unit.artifact.kind}, not target kind ${target.regionKind}.`,
					{
						artifactId: unit.id, path,
						expected: target.regionKind, actual: unit.artifact.kind
					}
				))
				continue
			}
			edits.push({
				artifactId: unit.id,
				start: target.start,
				end: target.end,
				resultStart: 0,
				resultEnd: 0,
				replacement: unit.artifact.code,
				artifactHash: unit.artifactHash,
				authoredIndex: unit.authoredIndex
			})
		}

		if (edits.length !== group.length) continue
		const byPosition = [...edits].sort((left, right) =>
			left.start - right.start || left.end - right.end || left.authoredIndex - right.authoredIndex
		)
		for (let index = 1; index < byPosition.length; index += 1) {
			const previous = byPosition[index - 1]!
			const current = byPosition[index]!
			if (current.start < previous.end || current.start === previous.start) {
				diagnostics.push(setDiagnostic(
					'OverlappingArtifactTargets',
					`Artifacts ${previous.artifactId} and ${current.artifactId} overlap in ${path}.`,
					{
						artifactId: current.artifactId, path,
						expected: { nonoverlappingWith: previous.artifactId },
						actual: {
							previous: { start: previous.start, end: previous.end },
							current: { start: current.start, end: current.end }
						}
					}
				))
			}
		}
		if (hasErrors(diagnostics)) continue

		let delta = 0
		for (const edit of byPosition) {
			edit.resultStart = edit.start + delta
			edit.resultEnd = edit.resultStart + edit.replacement.length
			delta += edit.replacement.length - (edit.end - edit.start)
		}

		let sourceText = baseSource
		for (const edit of [...byPosition].sort((left, right) => right.start - left.start)) {
			sourceText = `${sourceText.slice(0, edit.start)}${edit.replacement}${sourceText.slice(edit.end)}`
		}
		const authoredEdits = [...edits]
			.sort((left, right) => left.authoredIndex - right.authoredIndex)
			.map(({ authoredIndex: _authoredIndex, ...edit }) => edit)
		changes.push({
			kind: 'modifyFile',
			path,
			baseFileHash,
			resultingFileHash: createArtifactSetFileHash(sourceText),
			sourceText,
			edits: authoredEdits
		})
	}

	if (hasErrors(diagnostics)) {
		return { ok: false, classification: classifySynthesisDiagnostics('artifactSetAssembly', diagnostics), changes: [], diagnostics }
	}

	const staticDiagnostics = validateAssembledSources(changes, workspace.files, options, prepared, false)
	diagnostics.push(...staticDiagnostics)
	if (hasErrors(staticDiagnostics)) {
		return { ok: false, classification: classifySynthesisDiagnostics('artifactSetAssembly', diagnostics), changes: [], diagnostics }
	}

	return {
		ok: true,
		validation: 'syntax',
		changes,
		changeSetHash: createArtifactSetChangeSetHash(changes, {
			contractDigest: catalogView.contractDigest,
			manifestDigest: catalogView.manifestDigest,
			workspaceSnapshotHash: capturedWorkspaceHash
		}),
		contractDigest: catalogView.contractDigest,
		manifestDigest: catalogView.manifestDigest,
		workspaceSnapshotHash: capturedWorkspaceHash,
		diagnostics
	}
}

/**
 * Assemble an artifact set and require project-wide TypeScript static validity.
 *
 * Internal final assembly used only after the graph-bound candidate has been
 * compiled and all hash-chained fills have been replayed.
 */
function validateArtifactAssemblyStatic(
	units: readonly ArtifactSetAssemblyUnit[],
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: ArtifactSetAssemblyOptions = {}
): ArtifactSetStaticValidationResult {
	let catalogView: TemplateCatalogView
	try {
		catalogView = captureCatalog(catalog)
	} catch (error) {
		const diagnostics = catalogErrorDiagnostics(error)
		return {
			ok: false, classification: classifySynthesisDiagnostics('artifactSetStaticValidation', diagnostics), changes: [],
			diagnostics
		}
	}
	const workspace = normalizeWorkspaceFiles(options.workspaceFiles ?? {})
	const contextDiagnostics = staticAcceptanceContextDiagnostics(units, workspace.files, options)
	if (hasErrors([...workspace.diagnostics, ...contextDiagnostics])) {
		return {
			ok: false, classification: classifySynthesisDiagnostics('artifactSetStaticValidation', [...workspace.diagnostics, ...contextDiagnostics]), changes: [],
			diagnostics: [...workspace.diagnostics, ...contextDiagnostics]
		}
	}
	const assembled = assembleArtifactSetTargets(units, catalogView, options)
	if (!assembled.ok) return assembled
	const prepared = units.map((unit, authoredIndex) => ({
		...unit,
		authoredIndex,
		artifactHash: unit.artifactHash ?? createArtifactSetArtifactHash(unit.artifact)
	}))
	const semanticDiagnostics = validateAssembledSources(
		assembled.changes,
		workspace.files,
		options,
		prepared,
		true
	)
	if (hasErrors(semanticDiagnostics)) {
		return {
			ok: false, classification: classifySynthesisDiagnostics('artifactSetStaticValidation', semanticDiagnostics), changes: [],
			diagnostics: [...assembled.diagnostics, ...semanticDiagnostics]
		}
	}
	const identity: ArtifactSetAcceptanceIdentity = {
		contractDigest: catalogView.contractDigest,
		manifestDigest: catalogView.manifestDigest,
		workspaceSnapshotHash: assembled.workspaceSnapshotHash,
		staticPolicyVersion: ARTIFACT_SET_STATIC_POLICY_VERSION
	}
	return {
		ok: true,
		validation: 'static',
		changes: assembled.changes,
		changeSetHash: createArtifactSetChangeSetHash(assembled.changes, identity),
		...identity,
		diagnostics: [...assembled.diagnostics, ...semanticDiagnostics]
	}
}

/** Compile authoritative graphs and replay fills without assembling targets or running project semantics. */
export function compileArtifactSetGraphs(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options?: Omit<ArtifactSetCompileOptions, 'mode'> & { mode?: 'strict' }
): ArtifactSetGraphCompilationResult
export function compileArtifactSetGraphs(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: Omit<ArtifactSetCompileOptions, 'mode'> & { mode: 'partial' }
): ArtifactSetGraphCompilationResult
export function compileArtifactSetGraphs(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: ArtifactSetCompileOptions = {}
): ArtifactSetGraphCompilationResult {
	// Graph fragments are intentionally context-free here. Captured tsconfig text
	// is consumed by later virtual-project validation and must never be resolved
	// against the live worker filesystem.
	return runWithAnalysisContext(graphCompileOptions(options), () => compileArtifactSetGraphsInContext(plan, catalog, options))
}

/** Compile every unit with one shared operation-local analysis context. */
function compileArtifactSetGraphsInContext(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: ArtifactSetCompileOptions
): ArtifactSetGraphCompilationResult {
	const mode = options.mode ?? 'strict'
	const diagnostics: ArtifactSetDiagnostic[] = []
	const units: ArtifactSetUnitCompilation[] = []
	let catalogView: TemplateCatalogView
	try {
		catalogView = captureCatalog(catalog)
	} catch (error) {
		return failedGraphCompilation(mode, plan, units, catalogErrorDiagnostics(error), 'templatePolicyFailure')
	}
	const workspace = normalizeWorkspaceFiles(options.workspaceFiles ?? {})
	diagnostics.push(...workspace.diagnostics)
	const compilationIdentity = {
		contractDigest: catalogView.contractDigest,
		manifestDigest: catalogView.manifestDigest,
		workspaceSnapshotHash: workspaceSnapshotHash(workspace.files, options.workspaceSnapshotId, options.tsConfigFilePath, options.workspaceManifest)
	}
	diagnostics.push(...workspaceIdentityDiagnostics(compilationIdentity.workspaceSnapshotHash, options.workspaceSnapshotId))
	diagnostics.push(...workspaceManifestDiagnostics(
		workspace.files, options.workspaceManifest, options.tsConfigFilePath,
		options.unavailableTextPaths
	))
	if (hasErrors(diagnostics)) return failedGraphCompilation(mode, plan, units, diagnostics, 'terminalFailure', compilationIdentity)
	const normalizedPlan = normalizeArtifactSetPlan(plan, diagnostics)
	if (!normalizedPlan || hasErrors(diagnostics)) return failedGraphCompilation(mode, plan, units, diagnostics, 'graphRepairable', compilationIdentity)

	const ledgerByArtifact = new Map<string, ArtifactFillLedgerEntry[]>()
	for (const entry of options.fillLedger ?? []) {
		const entries = ledgerByArtifact.get(entry.artifactId)
		if (entries) entries.push(entry)
		else ledgerByArtifact.set(entry.artifactId, [entry])
	}
	const knownArtifactIds = new Set(normalizedPlan.artifacts.map(unit => unit.id))
	for (const artifactId of ledgerByArtifact.keys()) {
		if (!knownArtifactIds.has(artifactId)) diagnostics.push(setDiagnostic(
			'ArtifactLedgerUnknownArtifact', `Fill ledger targets unknown artifact ${artifactId}.`,
			{ artifactId, path: 'fillLedger' }
		))
	}
	if (hasErrors(diagnostics)) return failedGraphCompilation(mode, normalizedPlan, units, diagnostics, 'terminalFailure', compilationIdentity)

	const graphOptions = graphCompileOptions(options)
	const classifications: SynthesisFailureClassification[] = []
	for (const unit of normalizedPlan.artifacts) {
		const graphHash = createArtifactSetGraphHash(unit.graph)
		const compilation = compileGraph(unit.graph, catalogView, {
			...graphOptions,
			mode: 'partial',
			checkSemanticDiagnostics: false,
			compilationScope: artifactCompilationScope(options.compilationScope, unit.id)
		})
		const unitDiagnostics: ArtifactSetDiagnostic[] = compilation.diagnostics.map(diagnostic => ({ ...diagnostic, artifactId: unit.id }))
		const unitResult: ArtifactSetUnitCompilation = {
			artifactId: unit.id, graphHash, target: unit.target, compilation,
			appliedFills: [], diagnostics: unitDiagnostics
		}
		units.push(unitResult)
		diagnostics.push(...unitDiagnostics)
		if (!compilation.ok) { classifications.push(compilation.classification); continue }

		let artifact: TemplateArtifact = compilation.finalArtifact
		let artifactHash = createArtifactSetArtifactHash(artifact)
		for (const entry of ledgerByArtifact.get(unit.id) ?? []) {
			if (entry.graphHash !== graphHash || entry.baseArtifactHash !== artifactHash) {
				const code = entry.graphHash !== graphHash ? 'ArtifactLedgerGraphHashMismatch' : 'ArtifactLedgerBaseHashMismatch'
				const expected = entry.graphHash !== graphHash ? graphHash : artifactHash
				const actual = entry.graphHash !== graphHash ? entry.graphHash : entry.baseArtifactHash
				const diagnostic = setDiagnostic(code, `Fill ledger identity does not match artifact ${unit.id}.`, { artifactId: unit.id, expected, actual })
				unitDiagnostics.push(diagnostic); diagnostics.push(diagnostic); classifications.push('terminalFailure'); break
			}
			const fillResult = fillTemplateArtifactWithCatalog(artifact, entry.inputs, catalogView, {
				...graphOptions, checkSemanticDiagnostics: false
			})
			if (!fillResult.ok) {
				const fillDiagnostics = fillResult.diagnostics.map(diagnostic => ({ ...diagnostic, artifactId: unit.id }))
				unitDiagnostics.push(...fillDiagnostics); diagnostics.push(...fillDiagnostics); classifications.push(fillResult.classification); break
			}
			const resultingHash = createArtifactSetArtifactHash(fillResult.artifact)
			if (entry.resultingArtifactHash !== resultingHash) {
				const diagnostic = setDiagnostic('ArtifactLedgerResultHashMismatch', `Fill ledger result hash does not match artifact ${unit.id}.`, { artifactId: unit.id, expected: resultingHash, actual: entry.resultingArtifactHash })
				unitDiagnostics.push(diagnostic); diagnostics.push(diagnostic); classifications.push('terminalFailure'); break
			}
			artifact = fillResult.artifact; artifactHash = resultingHash; unitResult.appliedFills.push(entry)
		}
		unitResult.artifact = artifact
		unitResult.artifactHash = artifactHash
	}
	if (classifications.length > 0 || hasErrors(diagnostics)) {
		const classification = classifications.length > 0
			? selectSynthesisFailureClassification(classifications)
			: classifySynthesisDiagnostics('artifactSetGraphCompilation', diagnostics)
		return failedGraphCompilation(mode, normalizedPlan, units, diagnostics, classification, compilationIdentity)
	}
	const incomplete = units.filter(unit => unit.artifact?.complete !== true)
	if (incomplete.length > 0) {
		if (mode === 'partial') return { kind: 'artifactSetGraphCompilation', mode, ok: true, complete: false, plan: normalizedPlan, units, diagnostics, ...compilationIdentity }
		for (const unit of incomplete) diagnostics.push(setDiagnostic('UnresolvedArtifactSetInputs', `Artifact ${unit.artifactId} still has unresolved template inputs.`, { stage: 'input', artifactId: unit.artifactId }))
		return failedGraphCompilation(mode, normalizedPlan, units, diagnostics, 'artifactFillable', compilationIdentity)
	}
	return { kind: 'artifactSetGraphCompilation', mode, ok: true, complete: true, plan: normalizedPlan, units, diagnostics, ...compilationIdentity }
}

function failedGraphCompilation(
	mode: 'strict' | 'partial', plan: ArtifactSetPlan, units: ArtifactSetUnitCompilation[],
	diagnostics: ArtifactSetDiagnostic[], classification: SynthesisFailureClassification,
	identity?: Pick<ArtifactSetAcceptanceIdentity, 'contractDigest' | 'manifestDigest' | 'workspaceSnapshotHash'>
): ArtifactSetGraphCompilationResult {
	return { kind: 'artifactSetGraphCompilation', mode, ok: false, complete: false, plan, units, diagnostics, classification, ...(identity ?? {}) }
}

/**
 * Revalidate successful graph-compilation evidence and project the complete
 * artifacts consumed by later static phases. This deliberately validates
 * identities, graph hashes, targets, artifact hashes, and catalog integrity
 * without recompiling an unchanged graph.
 */
function assemblyUnitsFromCompilation(
	compilation: ArtifactSetGraphCompilationResult,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: ArtifactSetAssemblyOptions
): { readonly ok: true; readonly units: ArtifactSetAssemblyUnit[] } | { readonly ok: false; readonly diagnostics: ArtifactSetDiagnostic[] } {
	if (!compilation.ok) return { ok: false, diagnostics: compilation.diagnostics }
	const diagnostics: ArtifactSetDiagnostic[] = []
	let catalogView: TemplateCatalogView
	try {
		catalogView = captureCatalog(catalog)
	} catch (error) {
		return { ok: false, diagnostics: catalogErrorDiagnostics(error) }
	}
	if (compilation.contractDigest !== catalogView.contractDigest) diagnostics.push(setDiagnostic(
		'CatalogDigestMismatch', 'Compiled artifact-set evidence uses a different catalog contract.',
		{ expected: catalogView.contractDigest, actual: compilation.contractDigest }
	))
	if (compilation.manifestDigest !== catalogView.manifestDigest) diagnostics.push(setDiagnostic(
		'CatalogManifestDigestMismatch', 'Compiled artifact-set evidence uses a different catalog manifest.',
		{ expected: catalogView.manifestDigest, actual: compilation.manifestDigest }
	))
	const workspace = normalizeWorkspaceFiles(options.workspaceFiles ?? {})
	diagnostics.push(...workspace.diagnostics)
	const capturedWorkspaceHash = workspaceSnapshotHash(
		workspace.files, options.workspaceSnapshotId, options.tsConfigFilePath, options.workspaceManifest
	)
	if (compilation.workspaceSnapshotHash === undefined) diagnostics.push(setDiagnostic(
		'WorkspaceSnapshotHashMismatch', 'Compiled artifact-set evidence omits its workspace identity.',
		{ expected: capturedWorkspaceHash, actual: compilation.workspaceSnapshotHash }
	))
	else diagnostics.push(...workspaceIdentityDiagnostics(capturedWorkspaceHash, compilation.workspaceSnapshotHash))
	diagnostics.push(...workspaceManifestDiagnostics(
		workspace.files, options.workspaceManifest, options.tsConfigFilePath, options.unavailableTextPaths
	))
	if (!compilation.complete) diagnostics.push(setDiagnostic(
		'UnresolvedArtifactSetInputs', 'Compiled artifact-set evidence is incomplete.', { stage: 'input' }
	))
	if (compilation.units.length !== compilation.plan.artifacts.length) diagnostics.push(setDiagnostic(
		'InvalidArtifactSetPlan', 'Compiled artifact-set units are detached from the normalized plan.',
		{ expected: compilation.plan.artifacts.length, actual: compilation.units.length }
	))
	const units: ArtifactSetAssemblyUnit[] = []
	for (const [index, planned] of compilation.plan.artifacts.entries()) {
		const unit = compilation.units[index]
		if (unit === undefined || unit.artifactId !== planned.id
			|| canonicalizeJson(unit.target) !== canonicalizeJson(planned.target)) {
			diagnostics.push(setDiagnostic(
				'InvalidArtifactSetPlan', `Compiled unit ${planned.id} is detached from its normalized plan target.`,
				{ artifactId: planned.id, path: `artifacts[${index}]` }
			))
			continue
		}
		const graphHash = createArtifactSetGraphHash(planned.graph)
		if (unit.graphHash !== graphHash) diagnostics.push(setDiagnostic(
			'ArtifactLedgerGraphHashMismatch', `Compiled unit ${planned.id} is detached from its graph.`,
			{ artifactId: planned.id, expected: graphHash, actual: unit.graphHash }
		))
		if (unit.artifact?.complete !== true) {
			diagnostics.push(setDiagnostic(
				'UnresolvedArtifactSetInputs', `Compiled unit ${planned.id} does not contain a complete artifact.`,
				{ artifactId: planned.id, stage: 'input' }
			))
			continue
		}
		const artifactHash = createArtifactSetArtifactHash(unit.artifact)
		if (unit.artifactHash !== artifactHash) diagnostics.push(setDiagnostic(
			'ArtifactAssemblyHashMismatch', `Compiled unit ${planned.id} has a detached artifact hash.`,
			{ artifactId: planned.id, expected: artifactHash, actual: unit.artifactHash }
		))
		const integrity = validateTemplateArtifactAgainstCatalog(
			unit.artifact,
			catalogView,
			options.securityPolicy === undefined ? {} : { securityPolicy: options.securityPolicy }
		).map(diagnostic => ({ ...diagnostic, artifactId: planned.id }))
		diagnostics.push(...integrity)
		units.push({ id: planned.id, target: planned.target, artifact: unit.artifact, artifactHash })
	}
	return hasErrors(diagnostics) ? { ok: false, diagnostics } : { ok: true, units }
}

/**
 * Assemble a previously compiled, complete artifact set without compiling its
 * unchanged graphs again. The supplied compilation remains untrusted evidence
 * and is revalidated against the catalog, workspace, plan, and artifact hashes.
 */
export function assembleCompiledArtifactSet(
	compilation: ArtifactSetGraphCompilationResult,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: ArtifactSetAssemblyOptions = {}
): ArtifactSetAssemblyResult {
	const evidence = assemblyUnitsFromCompilation(compilation, catalog, options)
	if (!evidence.ok) return {
		ok: false,
		classification: classifySynthesisDiagnostics('artifactSetAssembly', evidence.diagnostics),
		changes: [],
		diagnostics: evidence.diagnostics
	}
	return assembleArtifactSetTargets(evidence.units, catalog, options)
}

/**
 * Run project semantic validation from successful graph-compilation evidence.
 * This preserves the authoritative assembly and semantic checks while avoiding
 * a second graph compilation and fill-ledger replay.
 */
export function validateCompiledArtifactSetSemantics(
	compilation: ArtifactSetGraphCompilationResult,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: ArtifactSetAssemblyOptions = {}
): ArtifactSetSemanticValidationResult {
	const evidence = assemblyUnitsFromCompilation(compilation, catalog, options)
	if (!evidence.ok) return {
		ok: false,
		classification: classifySynthesisDiagnostics('artifactSetSemanticValidation', evidence.diagnostics),
		changes: [],
		diagnostics: evidence.diagnostics
	}
	const workspace = normalizeWorkspaceFiles(options.workspaceFiles ?? {})
	const contextDiagnostics = staticAcceptanceContextDiagnostics(evidence.units, workspace.files, options)
	if (hasErrors([...workspace.diagnostics, ...contextDiagnostics])) return {
		ok: false,
		classification: classifySynthesisDiagnostics('artifactSetSemanticValidation', [...workspace.diagnostics, ...contextDiagnostics]),
		changes: [],
		diagnostics: [...workspace.diagnostics, ...contextDiagnostics]
	}
	const assembled = assembleArtifactSetTargets(evidence.units, catalog, options)
	if (!assembled.ok) return assembled
	const prepared = evidence.units.map((unit, authoredIndex) => ({
		...unit,
		authoredIndex,
		artifactHash: unit.artifactHash ?? createArtifactSetArtifactHash(unit.artifact)
	}))
	const semanticDiagnostics = validateAssembledSources(assembled.changes, workspace.files, options, prepared, true)
	const diagnostics = [...assembled.diagnostics, ...semanticDiagnostics]
	if (hasErrors(semanticDiagnostics)) return {
		ok: false,
		classification: classifySynthesisDiagnostics('artifactSetSemanticValidation', diagnostics),
		changes: [],
		diagnostics
	}
	return {
		ok: true,
		validation: 'semantic',
		changes: assembled.changes,
		contractDigest: assembled.contractDigest,
		manifestDigest: assembled.manifestDigest,
		workspaceSnapshotHash: assembled.workspaceSnapshotHash,
		diagnostics
	}
}

/**
 * Validate that accepted assembly evidence is the exact target projection of
 * the supplied graph-compilation evidence without rerunning TypeScript syntax
 * analysis. This is intentionally a byte-level verifier: later semantic
 * analysis may trust the changes only after every artifact, edit, and file
 * hash has been reproduced here.
 */
function acceptedAssemblyDiagnostics(
	assembly: ArtifactSetAssemblyResult,
	units: readonly ArtifactSetAssemblyUnit[],
	workspaceFiles: ReadonlyMap<string, string>,
	contractDigest: string,
	manifestDigest: string,
	workspaceSnapshotHashValue: string
): ArtifactSetDiagnostic[] {
	if (!assembly.ok) return assembly.diagnostics
	const diagnostics: ArtifactSetDiagnostic[] = []
	if (assembly.contractDigest !== contractDigest) diagnostics.push(setDiagnostic(
		'CatalogDigestMismatch', 'Assembly evidence uses a different catalog contract.',
		{ expected: contractDigest, actual: assembly.contractDigest }
	))
	if (assembly.manifestDigest !== manifestDigest) diagnostics.push(setDiagnostic(
		'CatalogManifestDigestMismatch', 'Assembly evidence uses a different catalog manifest.',
		{ expected: manifestDigest, actual: assembly.manifestDigest }
	))
	if (assembly.workspaceSnapshotHash !== workspaceSnapshotHashValue) diagnostics.push(setDiagnostic(
		'WorkspaceSnapshotHashMismatch', 'Assembly evidence uses a different workspace snapshot.',
		{ expected: workspaceSnapshotHashValue, actual: assembly.workspaceSnapshotHash }
	))
	const expectedChangeSetHash = createArtifactSetChangeSetHash(assembly.changes, {
		contractDigest,
		manifestDigest,
		workspaceSnapshotHash: workspaceSnapshotHashValue
	})
	if (assembly.changeSetHash !== expectedChangeSetHash) diagnostics.push(setDiagnostic(
		'ArtifactAssemblyHashMismatch', 'Assembly evidence has a detached change-set hash.',
		{ expected: expectedChangeSetHash, actual: assembly.changeSetHash }
	))

	const unitById = new Map(units.map(unit => [unit.id, unit]))
	const represented = new Set<string>()
	const seenPaths = new Set<string>()
	for (const change of assembly.changes) {
		if (seenPaths.has(change.path)) {
			diagnostics.push(setDiagnostic(
				'ArtifactTargetPathCollision', `Assembly evidence repeats target path ${change.path}.`,
				{ path: change.path }
			))
			continue
		}
		seenPaths.add(change.path)
		if (createArtifactSetFileHash(change.sourceText) !== change.resultingFileHash) diagnostics.push(setDiagnostic(
			'ArtifactAssemblyHashMismatch', `Assembly evidence has a detached resulting file hash for ${change.path}.`,
			{ path: change.path, expected: createArtifactSetFileHash(change.sourceText), actual: change.resultingFileHash }
		))

		const baseSource = change.kind === 'createFile' ? '' : workspaceFiles.get(change.path)
		if (change.kind === 'createFile' && workspaceFiles.has(change.path)) diagnostics.push(setDiagnostic(
			'ArtifactCreateFileExists', `Create-file assembly evidence targets existing file ${change.path}.`,
			{ path: change.path }
		))
		if (change.kind === 'modifyFile' && baseSource === undefined) diagnostics.push(setDiagnostic(
			'MissingArtifactBaseFile', `Assembly evidence targets missing file ${change.path}.`,
			{ path: change.path }
		))
		if (change.kind === 'modifyFile' && baseSource !== undefined) {
			const expectedBaseHash = createArtifactSetFileHash(baseSource)
			if (change.baseFileHash !== expectedBaseHash) diagnostics.push(setDiagnostic(
				'ArtifactBaseFileHashMismatch', `Assembly evidence has a detached base file hash for ${change.path}.`,
				{ path: change.path, expected: expectedBaseHash, actual: change.baseFileHash }
			))
		}

		const positioned = [...change.edits].sort((left, right) => left.start - right.start || left.end - right.end)
		let delta = 0
		let previousEnd = -1
		for (const edit of positioned) {
			const unit = unitById.get(edit.artifactId)
			if (unit === undefined) {
				diagnostics.push(setDiagnostic(
					'InvalidArtifactSetPlan', `Assembly edit references unknown artifact ${edit.artifactId}.`,
					{ artifactId: edit.artifactId, path: change.path }
				))
				continue
			}
			if (represented.has(unit.id)) diagnostics.push(setDiagnostic(
				'InvalidArtifactSetPlan', `Assembly evidence represents artifact ${unit.id} more than once.`,
				{ artifactId: unit.id, path: change.path }
			))
			represented.add(unit.id)
			const artifactHash = unit.artifactHash ?? createArtifactSetArtifactHash(unit.artifact)
			if (edit.artifactHash !== artifactHash || edit.replacement !== unit.artifact.code) diagnostics.push(setDiagnostic(
				'ArtifactAssemblyHashMismatch', `Assembly edit is detached from artifact ${unit.id}.`,
				{ artifactId: unit.id, path: change.path, expected: artifactHash, actual: edit.artifactHash }
			))
			if (unit.target.path !== change.path
				|| (unit.target.kind === 'createFile' && (change.kind !== 'createFile' || edit.start !== 0 || edit.end !== 0))
				|| (unit.target.kind === 'replaceRange' && (change.kind !== 'modifyFile' || edit.start !== unit.target.start || edit.end !== unit.target.end))) {
				diagnostics.push(setDiagnostic(
					'InvalidArtifactSetPlan', `Assembly edit is detached from target ${unit.id}.`,
					{ artifactId: unit.id, path: change.path, expected: unit.target, actual: { start: edit.start, end: edit.end } }
				))
			}
			if ((unit.target.kind === 'createFile' && unit.artifact.kind !== 'sourceFile')
				|| (unit.target.kind === 'replaceRange' && unit.artifact.kind !== unit.target.regionKind)) {
				diagnostics.push(setDiagnostic(
					'ArtifactTargetKindMismatch', `Assembly artifact ${unit.id} is incompatible with its target kind.`,
					{ artifactId: unit.id, path: change.path, expected: unit.target.kind === 'createFile' ? 'sourceFile' : unit.target.regionKind, actual: unit.artifact.kind }
				))
			}
			if (baseSource !== undefined && !validTargetRange(edit.start, edit.end, baseSource.length)) diagnostics.push(setDiagnostic(
				'InvalidArtifactTargetRange', `Assembly edit range is invalid for ${change.path}.`,
				{ artifactId: unit.id, path: change.path, expected: { minimum: 0, maximum: baseSource.length }, actual: { start: edit.start, end: edit.end } }
			))
			if (edit.start < previousEnd) diagnostics.push(setDiagnostic(
				'OverlappingArtifactTargets', `Assembly evidence contains overlapping edits in ${change.path}.`,
				{ artifactId: unit.id, path: change.path }
			))
			const expectedResultStart = edit.start + delta
			const expectedResultEnd = expectedResultStart + edit.replacement.length
			if (edit.resultStart !== expectedResultStart || edit.resultEnd !== expectedResultEnd) diagnostics.push(setDiagnostic(
				'ArtifactAssemblyHashMismatch', `Assembly edit coordinates are detached for artifact ${unit.id}.`,
				{ artifactId: unit.id, path: change.path, expected: { resultStart: expectedResultStart, resultEnd: expectedResultEnd }, actual: { resultStart: edit.resultStart, resultEnd: edit.resultEnd } }
			))
			delta += edit.replacement.length - (edit.end - edit.start)
			previousEnd = Math.max(previousEnd, edit.end)
		}

		if (baseSource !== undefined) {
			let reconstructed = baseSource
			for (const edit of [...positioned].sort((left, right) => right.start - left.start || right.end - left.end)) {
				reconstructed = `${reconstructed.slice(0, edit.start)}${edit.replacement}${reconstructed.slice(edit.end)}`
			}
			if (reconstructed !== change.sourceText) diagnostics.push(setDiagnostic(
				'ArtifactAssemblyHashMismatch', `Assembly source text is detached for ${change.path}.`,
				{ path: change.path, expected: createArtifactSetFileHash(reconstructed), actual: change.resultingFileHash }
			))
		}
	}
	for (const unit of units) {
		if (!represented.has(unit.id)) diagnostics.push(setDiagnostic(
			'InvalidArtifactSetPlan', `Assembly evidence omits artifact ${unit.id}.`,
			{ artifactId: unit.id, path: unit.target.path }
		))
	}
	return diagnostics
}

/**
 * Run project semantic validation from authenticated compilation and assembly
 * evidence. Unlike `validateCompiledArtifactSetSemantics`, this does not
 * reassemble the candidate or rerun assembly-phase TypeScript syntax checks.
 */
export function validateAssembledArtifactSetSemantics(
	compilation: ArtifactSetGraphCompilationResult,
	assembly: ArtifactSetAssemblyResult,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: ArtifactSetAssemblyOptions = {}
): ArtifactSetSemanticValidationResult {
	const evidence = assemblyUnitsFromCompilation(compilation, catalog, options)
	if (!evidence.ok) return {
		ok: false,
		classification: classifySynthesisDiagnostics('artifactSetSemanticValidation', evidence.diagnostics),
		changes: [],
		diagnostics: evidence.diagnostics
	}
	if (!assembly.ok) return {
		ok: false,
		classification: classifySynthesisDiagnostics('artifactSetSemanticValidation', assembly.diagnostics),
		changes: [],
		diagnostics: assembly.diagnostics
	}
	const workspace = normalizeWorkspaceFiles(options.workspaceFiles ?? {})
	const capturedWorkspaceHash = workspaceSnapshotHash(
		workspace.files, options.workspaceSnapshotId, options.tsConfigFilePath, options.workspaceManifest
	)
	const contextDiagnostics = staticAcceptanceContextDiagnostics(evidence.units, workspace.files, options)
	const assemblyDiagnostics = acceptedAssemblyDiagnostics(
		assembly,
		evidence.units,
		workspace.files,
		compilation.contractDigest!,
		compilation.manifestDigest!,
		capturedWorkspaceHash
	)
	const acceptanceDiagnostics = [...workspace.diagnostics, ...contextDiagnostics, ...assembly.diagnostics, ...assemblyDiagnostics]
	if (hasErrors(acceptanceDiagnostics)) return {
		ok: false,
		classification: classifySynthesisDiagnostics('artifactSetSemanticValidation', acceptanceDiagnostics),
		changes: [],
		diagnostics: acceptanceDiagnostics
	}
	const prepared = evidence.units.map((unit, authoredIndex) => ({
		...unit,
		authoredIndex,
		artifactHash: unit.artifactHash ?? createArtifactSetArtifactHash(unit.artifact)
	}))
	const semanticDiagnostics = validateAssembledSources(assembly.changes, workspace.files, options, prepared, true)
	const diagnostics = [...assembly.diagnostics, ...semanticDiagnostics]
	if (hasErrors(semanticDiagnostics)) return {
		ok: false,
		classification: classifySynthesisDiagnostics('artifactSetSemanticValidation', diagnostics),
		changes: [],
		diagnostics
	}
	return {
		ok: true,
		validation: 'semantic',
		changes: assembly.changes,
		contractDigest: assembly.contractDigest,
		manifestDigest: assembly.manifestDigest,
		workspaceSnapshotHash: assembly.workspaceSnapshotHash,
		diagnostics
	}
}

/** Strictly compile every graph and return one validated, in-memory change set. */
export function compileArtifactSet(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options?: Omit<ArtifactSetCompileOptions, 'mode'> & { mode?: 'strict' }
): ArtifactSetStrictCompilationResult

/** Compile every graph while preserving unresolved template inputs. */
export function compileArtifactSet(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: Omit<ArtifactSetCompileOptions, 'mode'> & { mode: 'partial' }
): ArtifactSetPartialCompilationResult

export function compileArtifactSet(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: ArtifactSetCompileOptions = {}
): ArtifactSetCompilationResult {
	const mode = options.mode ?? 'strict'
	const graphResult = mode === 'partial'
		? compileArtifactSetGraphs(plan, catalog, { ...options, mode: 'partial' })
		: compileArtifactSetGraphs(plan, catalog, { ...options, mode: 'strict' })
	const identity = {
		...(graphResult.contractDigest === undefined ? {} : { contractDigest: graphResult.contractDigest }),
		...(graphResult.manifestDigest === undefined ? {} : { manifestDigest: graphResult.manifestDigest }),
		...(graphResult.workspaceSnapshotHash === undefined ? {} : { workspaceSnapshotHash: graphResult.workspaceSnapshotHash })
	}
	if (!graphResult.ok) return {
		kind: 'artifactSetCompilation', mode, ok: false, complete: false,
		plan: graphResult.plan, units: graphResult.units, changes: [],
		diagnostics: graphResult.diagnostics, classification: graphResult.classification,
		...identity
	} as ArtifactSetCompilationResult
	if (!graphResult.complete) return {
		kind: 'artifactSetCompilation', mode: 'partial', ok: true, complete: false,
		plan: graphResult.plan, units: graphResult.units, changes: [],
		diagnostics: graphResult.diagnostics, ...identity
	}
	const staticResult = validateArtifactAssemblyStatic(
		graphResult.units.map(unit => ({
			id: unit.artifactId,
			target: unit.target,
			artifact: unit.artifact as CompleteTemplateArtifact,
			...(unit.artifactHash === undefined ? {} : { artifactHash: unit.artifactHash })
		})),
		catalog,
		options
	)
	const diagnostics = [...graphResult.diagnostics, ...staticResult.diagnostics]
	if (!staticResult.ok) return {
		kind: 'artifactSetCompilation', mode, ok: false, complete: false,
		plan: graphResult.plan, units: graphResult.units, changes: [], diagnostics,
		classification: staticResult.classification, ...identity
	} as ArtifactSetCompilationResult
	return {
		kind: 'artifactSetCompilation', mode, ok: true, complete: true,
		plan: graphResult.plan, units: graphResult.units, diagnostics,
		validation: 'static', changes: staticResult.changes,
		changeSetHash: staticResult.changeSetHash,
		contractDigest: staticResult.contractDigest,
		manifestDigest: staticResult.manifestDigest,
		workspaceSnapshotHash: staticResult.workspaceSnapshotHash,
		staticPolicyVersion: staticResult.staticPolicyVersion
	} as ArtifactSetCompilationResult
}

/**
 * Compile one authoritative plan and require the mandatory static acceptance
 * pipeline. Unlike the lower-level assembler, this entry point does not accept
 * caller-constructed artifacts detached from their graphs and fill ledger.
 */
export function finalizeArtifactSetStatic(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: Omit<ArtifactSetCompileOptions, 'mode'> = {},
	constraintAcceptance?: ConstraintBoundStaticAcceptance
): ArtifactSetStaticValidationResult {
	const acceptanceDiagnostics = validateConstraintAcceptance(constraintAcceptance)
	if (acceptanceDiagnostics.length > 0) return { ok: false, classification: classifySynthesisDiagnostics('artifactSetStaticValidation', acceptanceDiagnostics), changes: [], diagnostics: acceptanceDiagnostics }
	const result = compileArtifactSet(plan, catalog, { ...options, mode: 'strict' })
	if (!result.ok) {
		return {
			ok: false,
			classification: result.classification,
			changes: [],
			diagnostics: result.diagnostics
		}
	}
	return {
		ok: true,
		validation: result.validation,
		changes: result.changes,
		changeSetHash: createArtifactSetChangeSetHash(result.changes, {
			contractDigest: result.contractDigest,
			manifestDigest: result.manifestDigest,
			workspaceSnapshotHash: result.workspaceSnapshotHash,
			staticPolicyVersion: result.staticPolicyVersion,
			...(constraintAcceptance === undefined ? {} : { constraintAcceptance })
		}),
		contractDigest: result.contractDigest,
		manifestDigest: result.manifestDigest,
		workspaceSnapshotHash: result.workspaceSnapshotHash,
		staticPolicyVersion: result.staticPolicyVersion,
		...(constraintAcceptance === undefined ? {} : { constraintAcceptance }),
		diagnostics: result.diagnostics
	}
}

/** Backward-compatible unconstrained final static facade. */
export function validateArtifactSetStatic(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: Omit<ArtifactSetCompileOptions, 'mode'> = {}
): ArtifactSetStaticValidationResult {
	return finalizeArtifactSetStatic(plan, catalog, options)
}

/** Recompute authoritative graphs, assemble targets, and compare baseline/candidate TypeScript programs. */
export function validateArtifactSetSemantics(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: Omit<ArtifactSetCompileOptions, 'mode'> = {}
): ArtifactSetSemanticValidationResult {
	const graphResult = compileArtifactSetGraphs(plan, catalog, { ...options, mode: 'strict' })
	if (!graphResult.ok) return { ok: false, classification: graphResult.classification, changes: [], diagnostics: graphResult.diagnostics }
	const workspace = normalizeWorkspaceFiles(options.workspaceFiles ?? {})
	const contextDiagnostics = staticAcceptanceContextDiagnostics(
		graphResult.units.map(unit => ({ id: unit.artifactId, target: unit.target, artifact: unit.artifact as CompleteTemplateArtifact, ...(unit.artifactHash === undefined ? {} : { artifactHash: unit.artifactHash }) })),
		workspace.files,
		options
	)
	if (hasErrors([...workspace.diagnostics, ...contextDiagnostics])) return { ok: false, classification: classifySynthesisDiagnostics('artifactSetSemanticValidation', [...workspace.diagnostics, ...contextDiagnostics]), changes: [], diagnostics: [...workspace.diagnostics, ...contextDiagnostics] }
	const assembled = assembleArtifactSetTargets(
		graphResult.units.map(unit => ({ id: unit.artifactId, target: unit.target, artifact: unit.artifact as CompleteTemplateArtifact, ...(unit.artifactHash === undefined ? {} : { artifactHash: unit.artifactHash }) })),
		catalog,
		options
	)
	if (!assembled.ok) return assembled
	const prepared = graphResult.units.map((unit, authoredIndex) => ({
		id: unit.artifactId, target: unit.target, artifact: unit.artifact as CompleteTemplateArtifact,
		artifactHash: unit.artifactHash ?? createArtifactSetArtifactHash(unit.artifact as CompleteTemplateArtifact), authoredIndex
	}))
	const semanticDiagnostics = validateAssembledSources(assembled.changes, workspace.files, options, prepared, true)
	const diagnostics = [...assembled.diagnostics, ...semanticDiagnostics]
	if (hasErrors(semanticDiagnostics)) return { ok: false, classification: classifySynthesisDiagnostics('artifactSetSemanticValidation', diagnostics), changes: [], diagnostics }
	return {
		ok: true, validation: 'semantic', changes: assembled.changes,
		contractDigest: assembled.contractDigest, manifestDigest: assembled.manifestDigest,
		workspaceSnapshotHash: assembled.workspaceSnapshotHash, diagnostics
	}
}

function validateConstraintAcceptance(value: ConstraintBoundStaticAcceptance | undefined): ArtifactSetDiagnostic[] {
	if (value === undefined) return []
	const blobHash = /^sha256:[a-f0-9]{64}$/u
	const valid = value.schemaVersion === 2
		&& typeof value.constraintEntryPath === 'string' && value.constraintEntryPath.length > 0
		&& /^wc1_[a-f0-9]{64}$/u.test(value.constraintDigest)
		&& blobHash.test(value.constraintSourceSnapshotHash)
		&& value.constraintEngineVersion === 4
		&& typeof value.evaluatorIdentity === 'string' && value.evaluatorIdentity.length > 0
		&& typeof value.toolchainIdentity === 'string' && value.toolchainIdentity.length > 0
		&& blobHash.test(value.analysisSnapshotHash)
		&& Object.values(value.phaseEvidence).length === 4
		&& Object.values(value.phaseEvidence).every(evidence =>
			isRecord(evidence) && blobHash.test(String(evidence.taskHash)) && blobHash.test(String(evidence.resultBlobHash)))
	return valid ? [] : [setDiagnostic('InvalidConstraintBoundStaticAcceptance', 'Constraint-bound finalization requires engine 4 identities and four task/result evidence bindings.', { stage: 'policy', actual: value })]
}

function normalizeArtifactSetPlan(
	plan: ArtifactSetPlan,
	diagnostics: ArtifactSetDiagnostic[]
): ArtifactSetPlan | undefined {
	if (!plan || !Array.isArray(plan.artifacts)) {
		diagnostics.push(setDiagnostic('InvalidArtifactSetPlan', 'Artifact set plan must contain an artifacts array.', {
			actual: plan
		}))
		return undefined
	}
	if (plan.artifacts.length === 0) {
		diagnostics.push(setDiagnostic(
			'EmptyArtifactSetPlan',
			'Artifact set plan must contain at least one artifact.',
			{ path: 'artifacts', actual: [] }
		))
		return undefined
	}
	const seenIds = new Set<string>()
	const artifacts: ArtifactSetUnit[] = []
	for (const [index, unit] of plan.artifacts.entries()) {
		if (!unit || typeof unit.id !== 'string' || unit.id.length === 0) {
			diagnostics.push(setDiagnostic('InvalidArtifactId', 'Artifact IDs must be non-empty strings.', {
				path: `artifacts[${index}].id`, actual: unit?.id
			}))
			continue
		}
		if (seenIds.has(unit.id)) {
			diagnostics.push(setDiagnostic('DuplicateArtifactId', `Artifact ID ${unit.id} is duplicated.`, {
				artifactId: unit.id, path: `artifacts[${index}].id`, actual: unit.id
			}))
			continue
		}
		seenIds.add(unit.id)
		if (
			!isRecord(unit.graph) || !Array.isArray(unit.graph.nodes) ||
			typeof unit.graph.finalNodeId !== 'string'
		) {
			diagnostics.push(setDiagnostic(
				'InvalidArtifactGraph',
				`Artifact ${unit.id} must contain a synthesis graph.`,
				{ artifactId: unit.id, path: `artifacts[${index}].graph`, actual: unit.graph }
			))
			continue
		}

		const target = normalizeArtifactTargetValue(
			unit.target,
			unit.id,
			`artifacts[${index}].target`,
			diagnostics
		)
		if (!target) continue
		artifacts.push({ ...unit, target })
	}
	return { artifacts }
}

function normalizeArtifactTargetValue(
	target: unknown,
	artifactId: string,
	path: string,
	diagnostics: ArtifactSetDiagnostic[]
): ArtifactTarget | undefined {
	if (!isRecord(target) || (target.kind !== 'createFile' && target.kind !== 'replaceRange')) {
		diagnostics.push(setDiagnostic(
			'InvalidArtifactTarget',
			'Artifact target must be a createFile or replaceRange target.',
			{ artifactId, path, actual: target }
		))
		return undefined
	}

	let normalizedPath: string
	try {
		normalizedPath = normalizeArtifactTargetPath(target.path as string)
	} catch (error) {
		diagnostics.push(setDiagnostic('InvalidArtifactTargetPath', errorMessage(error), {
			artifactId, path: `${path}.path`, actual: target.path
		}))
		return undefined
	}
	if (target.kind === 'createFile') return { kind: 'createFile', path: normalizedPath }

	if (
		!Number.isInteger(target.start) || !Number.isInteger(target.end) ||
		typeof target.baseFileHash !== 'string' || target.baseFileHash.length === 0 ||
		typeof target.regionKind !== 'string' || !REGION_KIND_VALUES.includes(target.regionKind as RegionKind)
	) {
		diagnostics.push(setDiagnostic(
			'InvalidArtifactTarget',
			'Replace-range targets require integer offsets, a base hash, and a supported region kind.',
			{ artifactId, path, actual: target }
		))
		return undefined
	}
	return {
		kind: 'replaceRange',
		path: normalizedPath,
		start: target.start as number,
		end: target.end as number,
		baseFileHash: target.baseFileHash,
		regionKind: target.regionKind as RegionKind
	}
}

function normalizeWorkspaceFiles(files: Readonly<Record<string, string>>): NormalizedWorkspace {
	const normalized = new Map<string, string>()
	const diagnostics: ArtifactSetDiagnostic[] = []
	for (const [authoredPath, sourceText] of Object.entries(files)) {
		if (typeof sourceText !== 'string') {
			diagnostics.push(setDiagnostic(
				'InvalidWorkspaceFileSource',
				`Workspace file ${authoredPath} must contain source text.`,
				{ path: authoredPath, actual: sourceText }
			))
			continue
		}
		let path: string
		try {
			path = normalizeArtifactTargetPath(authoredPath)
		} catch (error) {
			diagnostics.push(setDiagnostic('InvalidWorkspaceFilePath', errorMessage(error), {
				path: authoredPath, actual: authoredPath
			}))
			continue
		}
		if (normalized.has(path)) {
			diagnostics.push(setDiagnostic(
				'DuplicateWorkspaceFilePath',
				`Workspace paths alias the same normalized file ${path}.`,
				{ path, actual: authoredPath }
			))
			continue
		}
		normalized.set(path, sourceText)
	}
	return { files: normalized, diagnostics }
}

function workspaceSnapshotHash(
	files: ReadonlyMap<string, string>,
	_workspaceSnapshotId: string | undefined,
	tsConfigFilePath: string | undefined,
	workspaceManifest?: ArtifactSetWorkspaceManifest
): string {
	if (workspaceManifest !== undefined) {
		return workspaceVersionedHash(['runtime-workspace-manifest', ARTIFACT_SET_WORKSPACE_IDENTITY_VERSION, workspaceManifest])
	}
	return workspaceVersionedHash([
		'artifact-set-workspace-snapshot',
		ARTIFACT_SET_WORKSPACE_IDENTITY_VERSION,
		tsConfigFilePath ?? null,
		[...files.entries()]
			.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
			.map(([path, sourceText]) => [path, createArtifactSetFileHash(sourceText)])
	])
}

function workspaceIdentityDiagnostics(actual: string, expected: string | undefined): ArtifactSetDiagnostic[] {
	return expected === undefined || expected === actual ? [] : [setDiagnostic(
		'WorkspaceSnapshotHashMismatch',
		'Caller-provided workspace snapshot identity does not match the normalized immutable files.',
		{ stage: 'policy', expected, actual }
	)]
}

function workspaceManifestDiagnostics(
	files: ReadonlyMap<string, string>,
	manifest: ArtifactSetWorkspaceManifest | undefined,
	tsConfigFilePath: string | undefined,
	unavailableTextPaths: readonly string[] | undefined
): ArtifactSetDiagnostic[] {
	const diagnostics: ArtifactSetDiagnostic[] = []
	if (manifest === undefined) {
		if ((unavailableTextPaths?.length ?? 0) > 0) {
			diagnostics.push(setDiagnostic(
				'UnavailableTextPathsRequireWorkspaceManifest',
				'Unavailable text paths are meaningful only when bound to an immutable workspace manifest.',
				{ stage: 'policy', path: 'unavailableTextPaths', actual: unavailableTextPaths }
			))
		}
		return diagnostics
	}
	if (
		manifest.schemaVersion !== 2
		|| typeof manifest.providerId !== 'string' || manifest.providerId.length === 0
		|| typeof manifest.providerSnapshotId !== 'string' || manifest.providerSnapshotId.length === 0
		|| typeof manifest.revision !== 'string' || manifest.revision.length === 0
		|| typeof manifest.capturePolicyDigest !== 'string' || !/^cp1_[a-f0-9]{64}$/u.test(manifest.capturePolicyDigest)
	) {
		diagnostics.push(setDiagnostic('InvalidWorkspaceManifest', 'Workspace manifest has an unsupported schema version or empty revision.', { stage: 'policy' }))
		return diagnostics
	}
	if (tsConfigFilePath !== undefined && manifest.tsConfigFilePath !== tsConfigFilePath) {
		diagnostics.push(setDiagnostic('WorkspaceManifestTypeScriptConfigurationMismatch', 'Workspace manifest tsconfig does not match the configured project.', { stage: 'policy', expected: tsConfigFilePath, actual: manifest.tsConfigFilePath }))
	}
	const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0
	const filePaths = manifest.files.map(file => file.path)
	const symlinkPaths = manifest.symlinks.map(link => link.path)
	const unavailable = unavailableTextPaths ?? []
	if (new Set(filePaths).size !== filePaths.length || filePaths.some((path, index) => index > 0 && compare(filePaths[index - 1]!, path) >= 0)) {
		diagnostics.push(setDiagnostic('InvalidWorkspaceManifestOrder', 'Workspace manifest files must be unique and ordered by canonical path.', { stage: 'policy' }))
	}
	if (new Set(symlinkPaths).size !== symlinkPaths.length || symlinkPaths.some((path, index) => index > 0 && compare(symlinkPaths[index - 1]!, path) >= 0)) {
		diagnostics.push(setDiagnostic('InvalidWorkspaceManifestOrder', 'Workspace manifest symlinks must be unique and ordered by canonical path.', { stage: 'policy' }))
	}
	try {
		if (normalizeArtifactTargetPath(manifest.tsConfigFilePath) !== manifest.tsConfigFilePath) {
			throw new TypeError('Path is not canonical.')
		}
	} catch (error) {
		diagnostics.push(setDiagnostic('InvalidWorkspaceManifestPath', errorMessage(error), {
			stage: 'policy', path: 'tsConfigFilePath', actual: manifest.tsConfigFilePath
		}))
	}
	if (!filePaths.includes(manifest.tsConfigFilePath)) {
		diagnostics.push(setDiagnostic(
			'InvalidWorkspaceManifest',
			'The workspace manifest tsconfig path must identify a captured regular file.',
			{ stage: 'policy', path: manifest.tsConfigFilePath }
		))
	}
	for (const link of manifest.symlinks) {
		try {
			if (normalizeArtifactTargetPath(link.path) !== link.path) throw new TypeError('Path is not canonical.')
		} catch (error) {
			diagnostics.push(setDiagnostic('InvalidWorkspaceManifestPath', errorMessage(error), {
				stage: 'policy', path: link.path, actual: link.path
			}))
		}
		if (typeof link.target !== 'string') {
			diagnostics.push(setDiagnostic('InvalidWorkspaceManifest', 'Workspace symlink targets must be strings.', {
				stage: 'policy', path: link.path, actual: link.target
			}))
		}
		if (filePaths.includes(link.path)) {
			diagnostics.push(setDiagnostic('InvalidWorkspaceManifest', 'A workspace path cannot be both a regular file and symlink.', {
				stage: 'policy', path: link.path
			}))
		}
	}
	if (
		new Set(unavailable).size !== unavailable.length ||
		unavailable.some((path, index) => index > 0 && compare(unavailable[index - 1]!, path) >= 0)
	) {
		diagnostics.push(setDiagnostic(
			'InvalidUnavailableTextPathOrder',
			'Unavailable text paths must be unique and ordered by canonical path.',
			{ stage: 'policy', path: 'unavailableTextPaths', actual: unavailable }
		))
	}
	const manifestPathSet = new Set(filePaths)
	const unavailableSet = new Set<string>()
	for (const unavailablePath of unavailable) {
		try {
			if (normalizeArtifactTargetPath(unavailablePath) !== unavailablePath) throw new TypeError('Path is not canonical.')
		} catch (error) {
			diagnostics.push(setDiagnostic('InvalidUnavailableTextPath', errorMessage(error), {
				stage: 'policy', path: unavailablePath, actual: unavailablePath
			}))
			continue
		}
		unavailableSet.add(unavailablePath)
		if (!manifestPathSet.has(unavailablePath)) {
			diagnostics.push(setDiagnostic(
				'UnavailableTextPathMissingFromManifest',
				`Unavailable text path ${unavailablePath} is absent from the immutable manifest.`,
				{ stage: 'policy', path: unavailablePath }
			))
		}
		if (files.has(unavailablePath)) {
			diagnostics.push(setDiagnostic(
				'WorkspaceTextPartitionOverlap',
				`Workspace file ${unavailablePath} cannot be both text and unavailable text.`,
				{ stage: 'policy', path: unavailablePath }
			))
		}
		if (isTypeScriptOrJavaScriptPath(unavailablePath) || unavailablePath === manifest.tsConfigFilePath) {
			diagnostics.push(setDiagnostic(
				'WorkspaceAnalysisFileUnavailable',
				`TypeScript analysis input ${unavailablePath} must be available as exact UTF-8 text.`,
				{ stage: 'policy', path: unavailablePath }
			))
		}
	}
	for (const entry of manifest.files) {
		try {
			if (normalizeArtifactTargetPath(entry.path) !== entry.path) throw new TypeError('Path is not canonical.')
		} catch (error) {
			diagnostics.push(setDiagnostic('InvalidWorkspaceManifestPath', errorMessage(error), { stage: 'policy', path: entry.path }))
			continue
		}
		if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0 || entry.contentHash !== entry.blobHash || !/^sha256:[a-f0-9]{64}$/u.test(entry.contentHash)) {
			diagnostics.push(setDiagnostic('InvalidWorkspaceManifestFileIdentity', `Workspace manifest file identity is malformed for ${entry.path}.`, { stage: 'policy', path: entry.path }))
			continue
		}
		const sourceText = files.get(entry.path)
		if (sourceText === undefined) {
			if (!unavailableSet.has(entry.path)) {
				diagnostics.push(setDiagnostic(
					'WorkspaceManifestFileUnrepresented',
					`Workspace manifest file ${entry.path} is in neither the text nor unavailable-text partition.`,
					{ stage: 'policy', path: entry.path }
				))
				if (isTypeScriptOrJavaScriptPath(entry.path) || entry.path === manifest.tsConfigFilePath) {
					diagnostics.push(setDiagnostic(
						'WorkspaceAnalysisFileUnavailable',
						`TypeScript analysis input ${entry.path} must be available as exact UTF-8 text.`,
						{ stage: 'policy', path: entry.path }
					))
				}
			}
			continue
		}
		const bytes = Buffer.from(sourceText, 'utf8')
		const contentHash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`
		if (entry.byteLength !== bytes.byteLength || entry.contentHash !== contentHash) {
			diagnostics.push(setDiagnostic('WorkspaceManifestFileIdentityMismatch', `Workspace text does not match captured bytes for ${entry.path}.`, { stage: 'policy', path: entry.path, expected: { byteLength: entry.byteLength, contentHash: entry.contentHash }, actual: { byteLength: bytes.byteLength, contentHash } }))
		}
	}
	for (const path of files.keys()) {
		if (!filePaths.includes(path)) diagnostics.push(setDiagnostic('WorkspaceFileMissingFromManifest', `Workspace text file ${path} is absent from the immutable manifest.`, { stage: 'policy', path }))
	}
	return diagnostics
}

function isTypeScriptOrJavaScriptPath(path: string): boolean {
	return /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u.test(path)
}

function staticAcceptanceContextDiagnostics(
	units: readonly ArtifactSetAssemblyUnit[],
	workspaceFiles: ReadonlyMap<string, string>,
	options: ArtifactSetAssemblyOptions
): ArtifactSetDiagnostic[] {
	const standaloneSourceFileRequest = workspaceFiles.size === 0
		&& units.length > 0
		&& units.every(unit => unit.target.kind === 'createFile' && unit.artifact.kind === 'sourceFile')
	if (standaloneSourceFileRequest) return []

	const diagnostics: ArtifactSetDiagnostic[] = []
	if (typeof options.workspaceSnapshotId !== 'string' || options.workspaceSnapshotId.length === 0) {
		diagnostics.push(setDiagnostic(
			'MissingWorkspaceSnapshotIdentity',
			'Project-backed static acceptance requires an immutable workspace snapshot identity.',
			{ path: 'workspaceSnapshotId', expected: 'non-empty string', actual: options.workspaceSnapshotId }
		))
	}
	diagnostics.push(...workspaceIdentityDiagnostics(
		workspaceSnapshotHash(workspaceFiles, undefined, options.tsConfigFilePath, options.workspaceManifest),
		options.workspaceSnapshotId
	))
	diagnostics.push(...workspaceManifestDiagnostics(
		workspaceFiles, options.workspaceManifest, options.tsConfigFilePath,
		options.unavailableTextPaths
	))
	if (typeof options.tsConfigFilePath !== 'string' || options.tsConfigFilePath.length === 0) {
		diagnostics.push(setDiagnostic(
			'MissingTypeScriptProjectConfiguration',
			'Project-backed static acceptance requires an explicit TypeScript project configuration.',
			{ path: 'tsConfigFilePath', expected: 'non-empty path', actual: options.tsConfigFilePath }
		))
	} else {
		let configPath: string | undefined
		try {
			configPath = normalizeArtifactTargetPath(options.tsConfigFilePath)
		} catch (error) {
			diagnostics.push(setDiagnostic(
				'InvalidTypeScriptProjectConfigurationPath',
				errorMessage(error),
				{ path: 'tsConfigFilePath', actual: options.tsConfigFilePath }
			))
		}
		if (configPath !== undefined && !workspaceFiles.has(configPath)) {
			diagnostics.push(setDiagnostic(
				'MissingTypeScriptProjectConfiguration',
				'The immutable workspace snapshot must include the configured tsconfig file.',
				{ path: configPath, expected: 'tsconfig source in workspaceFiles', actual: undefined }
			))
		}
	}
	return diagnostics
}

function graphCompileOptions(options: ArtifactSetCompileOptions): GraphCompileOptions {
	const {
		mode: _mode,
		workspaceFiles: _workspaceFiles,
		unavailableTextPaths: _unavailableTextPaths,
		workspaceRoot: _workspaceRoot,
		workspaceSnapshotId: _workspaceSnapshotId,
		workspaceManifest: _workspaceManifest,
		authorizedProjectReferences: _authorizedProjectReferences,
		fillLedger: _fillLedger,
		semanticContext: _semanticContext,
		filePath: _filePath,
		tsConfigFilePath: _tsConfigFilePath,
		...graphOptions
	} = options
	return graphOptions
}

function captureCatalog(
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[]
): TemplateCatalogView {
	return captureTemplateCatalogView(catalog)
}

function catalogErrorDiagnostics(error: unknown): ArtifactSetDiagnostic[] {
	if (
		typeof error === 'object' && error !== null &&
		'diagnostics' in error && Array.isArray(error.diagnostics)
	) {
		return (error.diagnostics as SynthesisDiagnostic[]).map(diagnostic => ({ ...diagnostic }))
	}
	return [setDiagnostic('ArtifactSetCatalogInvalid', errorMessage(error), {
		stage: 'template',
		actual: error instanceof Error ? { name: error.name, message: error.message } : error
	})]
}

function artifactCompilationScope(baseScope: string | undefined, artifactId: string): string {
	return versionedHash('as', [
		'artifact-set-compilation-scope',
		ARTIFACT_SET_IDENTITY_VERSION,
		baseScope ?? null,
		artifactId
	])
}

function validateAssembledSources(
	changes: readonly ArtifactSetChange[],
	workspaceFiles: ReadonlyMap<string, string>,
	options: ArtifactSetAssemblyOptions,
	units: readonly PreparedAssemblyUnit[],
	semantic: boolean
): ArtifactSetDiagnostic[] {
	const baseline = new Map(workspaceFiles)
	const candidate = new Map(workspaceFiles)
	for (const change of changes) candidate.set(change.path, change.sourceText)

	const baselineIssues = analyzeCapturedTypeScriptBaseline({
		files: baseline,
		...(options.workspaceRoot === undefined ? {} : { workspaceRoot: options.workspaceRoot }),
		...(options.workspaceSnapshotId === undefined ? {} : { workspaceSnapshotId: options.workspaceSnapshotId }),
		...(options.tsConfigFilePath === undefined ? {} : { tsConfigFilePath: options.tsConfigFilePath }),
		semantic,
		...(options.authorizedProjectReferences === undefined
			? {}
			: { authorizedProjectReferences: options.authorizedProjectReferences })
	}).issues
	const candidateStarted = performance.now()
	let candidateIssues: CompilerIssue[]
	try {
		candidateIssues = collectCompilerIssues(
			candidate,
			options.workspaceRoot,
			options.tsConfigFilePath,
			semantic,
			options.authorizedProjectReferences,
			changes.map(change => change.path)
		)
	} finally {
		recordCandidateAnalysis(performance.now() - candidateStarted)
	}
	const existing = issueMultiset(baselineIssues, issue => compilerIssueKey(issue, issue.start))
	const changeByPath = new Map(changes.map(change => [change.path, change]))
	const unitById = new Map(units.map(unit => [unit.id, unit]))
	const newIssues: CompilerIssue[] = []
	for (const issue of candidateIssues) {
		const baselineOffset = candidateIssueBaselineOffset(issue, changeByPath.get(issue.path ?? ''))
		if (baselineOffset === undefined) {
			newIssues.push(issue)
			continue
		}
		const key = compilerIssueKey(issue, baselineOffset)
		const count = existing.get(key) ?? 0
		if (count > 0) {
			if (count === 1) existing.delete(key)
			else existing.set(key, count - 1)
			continue
		}
		newIssues.push(issue)
	}

	return newIssues.map(issue => {
		const change = issue.path === undefined ? undefined : changeByPath.get(issue.path)
		const edit = issue.start === undefined || change === undefined
			? undefined
			: change.edits.find(candidateEdit =>
				issue.start! >= candidateEdit.resultStart && issue.start! < candidateEdit.resultEnd
			)
		const location = issue.start === undefined || issue.path === undefined
			? undefined
			: sourceLineAndColumn(candidate.get(issue.path) ?? '', issue.start)
		const artifactUnit = edit === undefined ? undefined : unitById.get(edit.artifactId)
		const owner = edit === undefined || issue.start === undefined || artifactUnit === undefined
			? undefined
			: deepestGeneratedSourceSpan(
				artifactUnit.artifact.sourceMap,
				issue.start - edit.resultStart,
				issue.length ?? 0
			)
		const code = issue.kind === 'configuration'
			? 'TypeScriptProjectConfigurationError'
			: issue.kind === 'global'
				? 'TypeScriptGlobalError'
				: issue.kind === 'syntax'
					? 'ArtifactSetTypeScriptSyntaxError'
					: 'ArtifactSetTypeScriptSemanticError'
		return setDiagnostic(
			code,
			issue.message,
			{
				stage: issue.kind === 'configuration' ? 'policy' : issue.kind === 'syntax' ? 'ast' : 'type',
				...(edit === undefined ? {} : { artifactId: edit.artifactId }),
				...(owner?.nodeId === undefined ? {} : { nodeId: owner.nodeId }),
				...(owner?.templateId === undefined ? {} : { templateId: owner.templateId }),
				...(owner?.kind !== 'input' ? {} : { inputName: owner.inputName }),
				...(issue.path === undefined ? {} : { path: issue.path }),
				compilerCode: issue.code,
				compilerCategory: issue.category,
				...(location === undefined ? {} : location),
				...(issue.start === undefined ? {} : {
					actual: { start: issue.start, ...(issue.length === undefined ? {} : { length: issue.length }) }
				})
			},
			issue.category === 'error' ? 'error' : 'warning'
		)
	})
}

function collectCompilerIssues(
	files: ReadonlyMap<string, string>,
	workspaceRoot: string | undefined,
	tsConfigFilePath: string | undefined,
	semantic: boolean,
	authorizedProjectReferences: readonly string[] | undefined,
	requiredAnalysisPaths: readonly string[] = []
): CompilerIssue[] {
	const projectOptions = {
		files,
		...(workspaceRoot === undefined ? {} : { workspaceRoot }),
		...(tsConfigFilePath === undefined ? {} : { tsConfigFilePath }),
		semantic,
		...(authorizedProjectReferences === undefined ? {} : { authorizedProjectReferences })
	}
	const owner = semantic ? currentSemanticProgramOwner() : undefined
	const result = owner === undefined
		? buildCapturedTypeScriptProject(projectOptions)
		: buildCapturedTypeScriptProjectWithOwner(projectOptions, owner)
	const analyzed = new Set(result.sourceFilePaths)
	const outsideProjectIssues: CompilerIssue[] = requiredAnalysisPaths
		.filter(path => /\.(?:cts|mts|tsx?|d\.ts|cjs|mjs|jsx?|d\.js)$/u.test(path) && !analyzed.has(path))
		.map(path => ({
			kind: 'configuration',
			code: 18003,
			category: 'error',
			message: `Artifact target ${path} is outside the captured TypeScript project.`,
			path
		}))
	return [...result.issues, ...outsideProjectIssues]
}

function issueMultiset(
	issues: readonly CompilerIssue[],
	keyFor: (issue: CompilerIssue) => string
): Map<string, number> {
	const result = new Map<string, number>()
	for (const issue of issues) {
		const key = keyFor(issue)
		result.set(key, (result.get(key) ?? 0) + 1)
	}
	return result
}

function candidateIssueBaselineOffset(
	issue: CompilerIssue,
	change: ArtifactSetChange | undefined
): number | undefined {
	if (issue.start === undefined) return undefined
	if (!change) return issue.start
	if (change.kind === 'createFile') return undefined

	const issueEnd = issue.start + Math.max(issue.length ?? 0, 1)
	const byPosition = [...change.edits].sort((left, right) => left.resultStart - right.resultStart)
	let delta = 0
	for (const edit of byPosition) {
		if (issue.start < edit.resultEnd && issueEnd > edit.resultStart) return undefined
		if (issue.start < edit.resultStart) return issue.start - delta
		delta += edit.replacement.length - (edit.end - edit.start)
	}
	return issue.start - delta
}

function compilerIssueKey(issue: CompilerIssue, offset: number | undefined): string {
	return canonicalizeJson([
		issue.kind,
		issue.path ?? null,
		issue.code,
		issue.category,
		issue.message,
		offset ?? null
	])
}

function sourceLineAndColumn(sourceText: string, offset: number): { line: number; column: number } {
	const before = sourceText.slice(0, offset)
	const lineStart = before.lastIndexOf('\n')
	return {
		line: before.split('\n').length,
		column: offset - lineStart
	}
}

function validTargetRange(start: number, end: number, sourceLength: number): boolean {
	return Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end >= start && end <= sourceLength
}

function setDiagnostic(
	code: string,
	message: string,
	details: Partial<ArtifactSetDiagnostic> = {},
	severity: ArtifactSetDiagnostic['severity'] = 'error'
): ArtifactSetDiagnostic {
	return {
		origin: details.origin ?? synthesisDiagnosticOriginForCode(code),
		stage: details.stage ?? 'graph',
		code,
		severity,
		message,
		...(details.artifactId === undefined ? {} : { artifactId: details.artifactId }),
		...(details.nodeId === undefined ? {} : { nodeId: details.nodeId }),
		...(details.templateId === undefined ? {} : { templateId: details.templateId }),
		...(details.inputName === undefined ? {} : { inputName: details.inputName }),
		...(details.path === undefined ? {} : { path: details.path }),
		...(details.expected === undefined ? {} : { expected: details.expected }),
		...(details.actual === undefined ? {} : { actual: details.actual }),
		...(details.repairHints === undefined ? {} : { repairHints: details.repairHints }),
		...(details.compilerCode === undefined ? {} : { compilerCode: details.compilerCode }),
		...(details.compilerCategory === undefined ? {} : { compilerCategory: details.compilerCategory }),
		...(details.line === undefined ? {} : { line: details.line }),
		...(details.column === undefined ? {} : { column: details.column })
	}
}

function hasErrors(diagnostics: readonly ArtifactSetDiagnostic[]): boolean {
	return diagnostics.some(diagnostic => diagnostic.severity === 'error')
}

function versionedHash(prefix: string, value: unknown): string {
	const payload = canonicalizeJson(value)
	return `${prefix}${ARTIFACT_SET_IDENTITY_VERSION}_${createHash('sha256').update(payload, 'utf8').digest('hex')}`
}

function workspaceVersionedHash(value: unknown): string {
	const payload = canonicalizeJson(value)
	return `ws${ARTIFACT_SET_WORKSPACE_IDENTITY_VERSION}_${createHash('sha256').update(payload, 'utf8').digest('hex')}`
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
