import { createHash } from 'node:crypto'
import { posix, resolve } from 'node:path'

import { Project, ts, type Diagnostic, type SourceFile } from 'ts-morph'

import { canonicalizeJson, canonicalizeSynthesisGraph } from './artifactIdentity.js'
import { validateTemplateArtifactIntegrity } from './artifactIntegrity.js'
import {
	compileGraph,
	fillTemplateArtifactWithCatalog,
	validateTemplateArtifactAgainstCatalog
} from './graph.js'
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

const ARTIFACT_SET_IDENTITY_VERSION = 1

/** Version of the mandatory checks represented by a validated change set. */
export const ARTIFACT_SET_STATIC_POLICY_VERSION = 1

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
	/** Filesystem root used only as TypeScript source-file identity. */
	workspaceRoot?: string
	/** Identity of the immutable workspace snapshot supplied by the caller. */
	workspaceSnapshotId?: string
	/** Ordered, hash-chained fills to replay after partial graph compilation. */
	fillLedger?: readonly ArtifactFillLedgerEntry[]
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
	workspaceRoot?: string
	/** Required for project-backed acceptance; omitted only for standalone new files. */
	workspaceSnapshotId?: string
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
			classification: 'graphRepairable' | 'terminalFailure'
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

interface NormalizedWorkspace {
	files: Map<string, string>
	diagnostics: ArtifactSetDiagnostic[]
}

interface PreparedAssemblyUnit extends ArtifactSetAssemblyUnit {
	authoredIndex: number
	target: ArtifactTarget
	artifactHash: string
}

interface CompilerIssue {
	kind: 'syntax' | 'semantic'
	code: number
	category: 'error' | 'warning' | 'suggestion' | 'message'
	message: string
	path?: string
	start?: number
	length?: number
}

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
	tsConfigFilePath?: string
): string {
	const workspace = normalizeWorkspaceFiles(workspaceFiles)
	if (hasErrors(workspace.diagnostics)) {
		throw new TypeError(workspace.diagnostics.map(diagnostic => diagnostic.message).join('\n'))
	}
	return workspaceSnapshotHash(workspace.files, workspaceSnapshotId, tsConfigFilePath)
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
		options.tsConfigFilePath
	)
	const prepared: PreparedAssemblyUnit[] = []
	const seenIds = new Set<string>()

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
			options
		).map(diagnostic => ({
			...diagnostic,
			artifactId: unit.id
		}))
		diagnostics.push(...integrityDiagnostics)
		if (integrityDiagnostics.some(diagnostic => diagnostic.severity === 'error')) continue
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
		return { ok: false, classification: assemblyFailureClassification(diagnostics), changes: [], diagnostics }
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
		return { ok: false, classification: assemblyFailureClassification(diagnostics), changes: [], diagnostics }
	}

	const staticDiagnostics = validateAssembledSources(changes, workspace.files, options, prepared, false)
	diagnostics.push(...staticDiagnostics)
	if (hasErrors(staticDiagnostics)) {
		return { ok: false, classification: 'graphRepairable', changes: [], diagnostics }
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
		return {
			ok: false, classification: 'templatePolicyFailure', changes: [],
			diagnostics: catalogErrorDiagnostics(error)
		}
	}
	const workspace = normalizeWorkspaceFiles(options.workspaceFiles ?? {})
	const contextDiagnostics = staticAcceptanceContextDiagnostics(units, workspace.files, options)
	if (hasErrors([...workspace.diagnostics, ...contextDiagnostics])) {
		return {
			ok: false, classification: 'terminalFailure', changes: [],
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
			ok: false, classification: 'graphRepairable', changes: [],
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
	const diagnostics: ArtifactSetDiagnostic[] = []
	const units: ArtifactSetUnitCompilation[] = []
	let catalogView: TemplateCatalogView
	try {
		catalogView = captureCatalog(catalog)
	} catch (error) {
		const catalogDiagnostics = catalogErrorDiagnostics(error)
		return failedCompilation(mode, plan, units, catalogDiagnostics, 'templatePolicyFailure')
	}
	const workspace = normalizeWorkspaceFiles(options.workspaceFiles ?? {})
	diagnostics.push(...workspace.diagnostics)
	const compilationIdentity = {
		contractDigest: catalogView.contractDigest,
		manifestDigest: catalogView.manifestDigest,
		workspaceSnapshotHash: workspaceSnapshotHash(
			workspace.files,
			options.workspaceSnapshotId,
			options.tsConfigFilePath
		)
	}
	if (hasErrors(diagnostics)) {
		return failedCompilation(mode, plan, units, diagnostics, 'terminalFailure', compilationIdentity)
	}
	const normalizedPlan = normalizeArtifactSetPlan(plan, diagnostics)
	if (!normalizedPlan || hasErrors(diagnostics)) {
		return failedCompilation(mode, plan, units, diagnostics, 'graphRepairable', compilationIdentity)
	}

	const ledgerByArtifact = new Map<string, ArtifactFillLedgerEntry[]>()
	for (const entry of options.fillLedger ?? []) {
		const entries = ledgerByArtifact.get(entry.artifactId)
		if (entries) entries.push(entry)
		else ledgerByArtifact.set(entry.artifactId, [entry])
	}
	const knownArtifactIds = new Set(normalizedPlan.artifacts.map(unit => unit.id))
	for (const artifactId of ledgerByArtifact.keys()) {
		if (!knownArtifactIds.has(artifactId)) {
			diagnostics.push(setDiagnostic(
				'ArtifactLedgerUnknownArtifact',
				`Fill ledger targets unknown artifact ${artifactId}.`,
				{ artifactId, path: 'fillLedger' }
			))
		}
	}
	if (hasErrors(diagnostics)) {
		return failedCompilation(mode, normalizedPlan, units, diagnostics, 'terminalFailure', compilationIdentity)
	}

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
		const unitDiagnostics: ArtifactSetDiagnostic[] = compilation.diagnostics.map(diagnostic => ({
			...diagnostic,
			artifactId: unit.id
		}))
		const unitResult: ArtifactSetUnitCompilation = {
			artifactId: unit.id,
			graphHash,
			target: unit.target,
			compilation,
			appliedFills: [],
			diagnostics: unitDiagnostics
		}
		units.push(unitResult)
		diagnostics.push(...unitDiagnostics)

		if (!compilation.ok) {
			classifications.push(compilation.classification)
			continue
		}

		let artifact: TemplateArtifact = compilation.finalArtifact
		let artifactHash = createArtifactSetArtifactHash(artifact)
		for (const entry of ledgerByArtifact.get(unit.id) ?? []) {
			if (entry.graphHash !== graphHash) {
				const diagnostic = setDiagnostic(
					'ArtifactLedgerGraphHashMismatch',
					`Fill ledger graph hash does not match artifact ${unit.id}.`,
					{ artifactId: unit.id, expected: graphHash, actual: entry.graphHash }
				)
				unitDiagnostics.push(diagnostic)
				diagnostics.push(diagnostic)
				classifications.push('terminalFailure')
				break
			}
			if (entry.baseArtifactHash !== artifactHash) {
				const diagnostic = setDiagnostic(
					'ArtifactLedgerBaseHashMismatch',
					`Fill ledger base hash does not match artifact ${unit.id}.`,
					{ artifactId: unit.id, expected: artifactHash, actual: entry.baseArtifactHash }
				)
				unitDiagnostics.push(diagnostic)
				diagnostics.push(diagnostic)
				classifications.push('terminalFailure')
				break
			}

			const fillResult = fillTemplateArtifactWithCatalog(artifact, entry.inputs, catalogView, {
				...graphOptions,
				checkSemanticDiagnostics: false,
				trustedBaseArtifact: true
			})
			if (!fillResult.ok) {
				const fillDiagnostics = fillResult.diagnostics.map(diagnostic => ({
					...diagnostic, artifactId: unit.id
				}))
				unitDiagnostics.push(...fillDiagnostics)
				diagnostics.push(...fillDiagnostics)
				classifications.push(fillResult.classification)
				break
			}
			const resultingHash = createArtifactSetArtifactHash(fillResult.artifact)
			if (entry.resultingArtifactHash !== resultingHash) {
				const diagnostic = setDiagnostic(
					'ArtifactLedgerResultHashMismatch',
					`Fill ledger result hash does not match artifact ${unit.id}.`,
					{ artifactId: unit.id, expected: resultingHash, actual: entry.resultingArtifactHash }
				)
				unitDiagnostics.push(diagnostic)
				diagnostics.push(diagnostic)
				classifications.push('terminalFailure')
				break
			}
			artifact = fillResult.artifact
			artifactHash = resultingHash
			unitResult.appliedFills.push(entry)
		}

		unitResult.artifact = artifact
		unitResult.artifactHash = artifactHash
	}

	if (classifications.length > 0 || hasErrors(diagnostics)) {
		return failedCompilation(
			mode,
			normalizedPlan,
			units,
			diagnostics,
			combineClassifications(classifications),
			compilationIdentity
		)
	}

	const incomplete = units.filter(unit => unit.artifact?.complete !== true)
	if (incomplete.length > 0) {
		if (mode === 'partial') {
			return {
				kind: 'artifactSetCompilation', mode, ok: true, complete: false,
				plan: normalizedPlan, units, changes: [], diagnostics,
				...compilationIdentity
			}
		}
		const unresolvedDiagnostics = incomplete.map(unit => setDiagnostic(
			'UnresolvedArtifactSetInputs',
			`Artifact ${unit.artifactId} still has unresolved template inputs.`,
			{
				stage: 'input', artifactId: unit.artifactId,
				actual: unit.artifact?.complete === false
					? unit.artifact.unresolvedInputs.map(input => input.id)
					: undefined
			}
		))
		diagnostics.push(...unresolvedDiagnostics)
		return failedCompilation(mode, normalizedPlan, units, diagnostics, 'artifactFillable', compilationIdentity)
	}

	const assembly = validateArtifactAssemblyStatic(
		units.map(unit => ({
			id: unit.artifactId,
			target: unit.target,
			artifact: unit.artifact as CompleteTemplateArtifact,
			...(unit.artifactHash === undefined ? {} : { artifactHash: unit.artifactHash })
		})),
		catalogView,
		{
			...(options.workspaceFiles === undefined ? {} : { workspaceFiles: options.workspaceFiles }),
			...(options.workspaceRoot === undefined ? {} : { workspaceRoot: options.workspaceRoot }),
			...(options.workspaceSnapshotId === undefined ? {} : { workspaceSnapshotId: options.workspaceSnapshotId }),
			...(options.tsConfigFilePath === undefined ? {} : { tsConfigFilePath: options.tsConfigFilePath }),
			...(options.securityPolicy === undefined ? {} : { securityPolicy: options.securityPolicy })
		}
	)
	diagnostics.push(...assembly.diagnostics)
	if (!assembly.ok) {
		return failedCompilation(
			mode, normalizedPlan, units, diagnostics, assembly.classification, compilationIdentity
		)
	}

	return {
		kind: 'artifactSetCompilation', mode, ok: true, complete: true,
		plan: normalizedPlan, units,
		validation: 'static',
		changes: assembly.changes,
		changeSetHash: assembly.changeSetHash,
		contractDigest: assembly.contractDigest,
		manifestDigest: assembly.manifestDigest,
		workspaceSnapshotHash: assembly.workspaceSnapshotHash,
		staticPolicyVersion: assembly.staticPolicyVersion,
		diagnostics
	} as ArtifactSetCompleteCompilationResult & { mode: typeof mode }
}

/**
 * Compile one authoritative plan and require the mandatory static acceptance
 * pipeline. Unlike the lower-level assembler, this entry point does not accept
 * caller-constructed artifacts detached from their graphs and fill ledger.
 */
export function validateArtifactSetStatic(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	options: Omit<ArtifactSetCompileOptions, 'mode'> = {}
): ArtifactSetStaticValidationResult {
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
		changeSetHash: result.changeSetHash,
		contractDigest: result.contractDigest,
		manifestDigest: result.manifestDigest,
		workspaceSnapshotHash: result.workspaceSnapshotHash,
		staticPolicyVersion: result.staticPolicyVersion,
		diagnostics: result.diagnostics
	}
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
	workspaceSnapshotId: string | undefined,
	tsConfigFilePath: string | undefined
): string {
	return versionedHash('ws', [
		'artifact-set-workspace-snapshot',
		ARTIFACT_SET_IDENTITY_VERSION,
		workspaceSnapshotId ?? null,
		tsConfigFilePath ?? null,
		[...files.entries()]
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([path, sourceText]) => [path, createArtifactSetFileHash(sourceText)])
	])
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
		workspaceRoot: _workspaceRoot,
		workspaceSnapshotId: _workspaceSnapshotId,
		fillLedger: _fillLedger,
		semanticContext: _semanticContext,
		filePath: _filePath,
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

function failedCompilation(
	mode: 'strict' | 'partial',
	plan: ArtifactSetPlan,
	units: ArtifactSetUnitCompilation[],
	diagnostics: ArtifactSetDiagnostic[],
	classification: SynthesisFailureClassification,
	identity?: Pick<ArtifactSetAcceptanceIdentity, 'contractDigest' | 'manifestDigest' | 'workspaceSnapshotHash'>
): ArtifactSetFailedCompilationResult & { mode: typeof mode } {
	return {
		kind: 'artifactSetCompilation', mode, ok: false, complete: false,
		classification, plan, units, changes: [], diagnostics,
		...(identity ?? {})
	}
}

function combineClassifications(
	classifications: readonly SynthesisFailureClassification[]
): SynthesisFailureClassification {
	for (const classification of ['terminalFailure', 'templatePolicyFailure', 'graphRepairable', 'artifactFillable'] as const) {
		if (classifications.includes(classification)) return classification
	}
	return 'graphRepairable'
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

	const baselineIssues = collectCompilerIssues(
		baseline,
		options.workspaceRoot,
		options.tsConfigFilePath,
		semantic
	)
	const candidateIssues = collectCompilerIssues(
		candidate,
		options.workspaceRoot,
		options.tsConfigFilePath,
		semantic
	)
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
		return setDiagnostic(
			issue.kind === 'syntax' ? 'ArtifactSetTypeScriptSyntaxError' : 'ArtifactSetTypeScriptSemanticError',
			issue.message,
			{
				stage: issue.kind === 'syntax' ? 'ast' : 'type',
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
	semantic: boolean
): CompilerIssue[] {
	if (files.size === 0) return []
	const root = workspaceRoot ?? '/__synthesize_regions_workspace__'
	const projectOptions = snapshotCompilerOptions(files, tsConfigFilePath, root)
	if (projectOptions.issues.length > 0) return projectOptions.issues
	const project = new Project({
		useInMemoryFileSystem: true,
		compilerOptions: projectOptions.compilerOptions
	})
	const configPath = tsConfigFilePath === undefined
		? undefined
		: normalizeArtifactTargetPath(tsConfigFilePath)
	const sourceFiles: Array<{ path: string; sourceFile: SourceFile }> = []
	for (const [path, sourceText] of files) {
		if (path === configPath || !isTypeScriptProjectSource(path, projectOptions.compilerOptions.allowJs === true)) continue
		sourceFiles.push({
			path,
			sourceFile: project.createSourceFile(resolve(root, path), sourceText, { overwrite: true })
		})
	}

	const issues: CompilerIssue[] = []
	const program = project.getProgram()
	for (const { path, sourceFile } of sourceFiles) {
		for (const diagnostic of program.getSyntacticDiagnostics(sourceFile)) {
			issues.push(compilerIssue('syntax', diagnostic, path))
		}
		if (semantic) {
			for (const diagnostic of program.getSemanticDiagnostics(sourceFile)) {
				issues.push(compilerIssue('semantic', diagnostic, path))
			}
		}
	}
	return issues.sort((left, right) =>
		(left.path ?? '').localeCompare(right.path ?? '') ||
		(left.start ?? -1) - (right.start ?? -1) ||
		left.code - right.code ||
		left.message.localeCompare(right.message)
	)
}

function snapshotCompilerOptions(
	files: ReadonlyMap<string, string>,
	tsConfigFilePath: string | undefined,
	workspaceRoot: string
): { compilerOptions: ts.CompilerOptions; issues: CompilerIssue[] } {
	if (tsConfigFilePath === undefined) {
		return {
			compilerOptions: {
				target: ts.ScriptTarget.ES2022,
				module: ts.ModuleKind.ES2022,
				moduleResolution: ts.ModuleResolutionKind.Bundler,
				strict: true,
				skipLibCheck: true
			},
			issues: []
		}
	}

	let normalizedPath: string
	try {
		normalizedPath = normalizeArtifactTargetPath(tsConfigFilePath)
	} catch (error) {
		return {
			compilerOptions: {},
			issues: [compilerConfigIssue(
				5083,
				errorMessage(error),
				tsConfigFilePath
			)]
		}
	}
	const sourceText = files.get(normalizedPath)
	if (sourceText === undefined) {
		return {
			compilerOptions: {},
			issues: [compilerConfigIssue(
				5083,
				`Cannot read immutable project configuration ${normalizedPath}.`,
				normalizedPath
			)]
		}
	}
	const parsed = ts.parseConfigFileTextToJson(resolve(workspaceRoot, normalizedPath), sourceText)
	if (parsed.error) {
		return {
			compilerOptions: {},
			issues: [compilerConfigIssue(
				parsed.error.code,
				ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n'),
				normalizedPath
			)]
		}
	}
	const converted = ts.convertCompilerOptionsFromJson(
		(parsed.config as { compilerOptions?: Record<string, unknown> }).compilerOptions ?? {},
		workspaceRoot,
		normalizedPath
	)
	if (converted.errors.length > 0) {
		return {
			compilerOptions: {},
			issues: converted.errors.map(error => compilerConfigIssue(
				error.code,
				ts.flattenDiagnosticMessageText(error.messageText, '\n'),
				normalizedPath
			))
		}
	}
	return {
		compilerOptions: { ...converted.options, noEmit: true },
		issues: []
	}
}

function compilerConfigIssue(code: number, message: string, path: string): CompilerIssue {
	return { kind: 'syntax', code, category: 'error', message, path }
}

function isTypeScriptProjectSource(path: string, allowJs: boolean): boolean {
	return /\.(?:cts|mts|tsx?|d\.ts)$/u.test(path)
		|| (allowJs && /\.(?:cjs|mjs|jsx?|d\.js)$/u.test(path))
}

function compilerIssue(kind: CompilerIssue['kind'], diagnostic: Diagnostic, path: string): CompilerIssue {
	const start = diagnostic.getStart()
	const length = diagnostic.getLength()
	return {
		kind,
		code: diagnostic.getCode(),
		category: compilerCategory(diagnostic.getCategory()),
		message: ts.flattenDiagnosticMessageText(diagnostic.compilerObject.messageText, '\n'),
		path,
		...(start === undefined ? {} : { start }),
		...(length === undefined ? {} : { length })
	}
}

function compilerCategory(category: ts.DiagnosticCategory): CompilerIssue['category'] {
	switch (category) {
		case ts.DiagnosticCategory.Warning: return 'warning'
		case ts.DiagnosticCategory.Suggestion: return 'suggestion'
		case ts.DiagnosticCategory.Message: return 'message'
		default: return 'error'
	}
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

function assemblyFailureClassification(
	diagnostics: readonly ArtifactSetDiagnostic[]
): 'graphRepairable' | 'terminalFailure' {
	const terminalCodes = new Set([
		'ArtifactAssemblyHashMismatch', 'ArtifactBaseFileHashMismatch',
		'ArtifactInputIdCollision', 'CompleteArtifactContainsMarkers',
		'InvalidGeneratedSourceMap', 'MalformedArtifactMarkers',
		'MalformedTemplateArtifact', 'MissingTemplateManifestIdentity',
		'PartialArtifactHasNoUnresolvedInputs'
	])
	return diagnostics.some(diagnostic => terminalCodes.has(diagnostic.code))
		? 'terminalFailure'
		: 'graphRepairable'
}

function versionedHash(prefix: string, value: unknown): string {
	const payload = canonicalizeJson(value)
	return `${prefix}${ARTIFACT_SET_IDENTITY_VERSION}_${createHash('sha256').update(payload, 'utf8').digest('hex')}`
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
