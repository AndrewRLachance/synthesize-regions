import type { ReplacementRegion, TemplateMode } from '../core/types.js'
import { enforceSecurityPolicy } from '../validation/securityPolicy.js'
import { buildReplacementEdits } from '../replacements/serialize.js'
import { discoverReplacementRegions } from '../regions/discovery.js'
import { wrapTemplateSource } from './templateMode.js'
import {
	assertFinalValid,
	createProject,
	createSourceFile,
	structuredSemanticDiagnostics,
	structuredSyntacticDiagnostics,
	validateRawTypedSyntax
} from '../validation/ast.js'
import { graphInputsToReplacementMap } from './converter.js'
import { canonicalizeJson, createCompilationScope, createUnresolvedInputId } from './artifactIdentity.js'
import { validateTemplateArtifactIntegrity } from './artifactIntegrity.js'
import { brandTemplateArtifact, isLibraryOwnedTemplateArtifact } from './artifactTrust.js'
import type {
	AuthoredGraphInput,
	CompleteTemplateArtifact,
	DefinedPartialSynthesisGraph,
	DefinedSynthesisGraph,
	FragmentInputPort,
	FragmentCollectionInputPort,
	GeneratedFragment,
	GeneratedSourceMap,
	GraphCompilationResult,
	GraphCompileOptions,
	GraphPartialCompilationResult,
	GraphTemplateDefinition,
	GraphNormalizationResult,
	InputPort,
	NormalizedSynthesisInput,
	PartialTemplateArtifact,
	RawCodeInputPort,
	ResolvedGraphInput,
	StrictSynthesisGraph,
	StrictPartialSynthesisGraph,
	StrictTemplateCatalog,
	SynthesisDiagnostic,
	SynthesisGraph,
	SynthesisInput,
	SynthesisNode,
	TemplateArtifact,
	TemplateArtifactInput,
	TemplateArtifactInputMap,
	TemplateArtifactResult,
	TemplateCatalogView,
	TemplateRegistrySnapshot,
	UnresolvedTemplateInput
} from './graphTypes.js'
import { TYPED_SYNTAX_REGION_KIND_VALUES } from './graphTypes.js'
import {
	compareTypeDescriptors,
	fragmentPortOutputKind,
	portIsRequired,
	resolveEffectiveTypeDescriptor,
	summarizeInputPort,
	type TypeDescriptorCompatibilityIssue
} from './compatibility.js'
import { validateJsonValueAgainstSchema } from './schemaCompatibility.js'
import { captureTemplateCatalogView } from './catalogCapture.js'
import { TemplateCatalogValidationError } from './catalogValidation.js'
import { createTemplateRegistry } from './registry.js'
import { brandGraphCompiler } from './compilerTrust.js'
import { defaultFragmentCollectionSeparator, templateModeForRegionKind } from './rendering.js'
import { sourcePrologueEnd, validateVirtualSemanticTarget } from './semanticTarget.js'
import {
	applySourceMappedTextEdits,
	coverGeneratedSourceMapRoot,
	deepestGeneratedSourceSpan,
	emptyGeneratedSourceMap,
	formatSourceMappedFragment,
	inputGeneratedSourceSpan,
	mergeGeneratedSourceMaps,
	nodeGeneratedSourceMap,
	remapGeneratedSourceMap,
	shiftGeneratedSourceMap,
	sourceMappedFragment,
	sourceMappedFragmentCollection,
	type SourceMappedTextEdit
} from './sourceSpans.js'

/** Create a graph diagnostic with error severity. */
function errorDiagnostic(diagnostic: Omit<SynthesisDiagnostic, 'severity'>): SynthesisDiagnostic {
	return { ...diagnostic, severity: 'error' }
}

/** Map compatibility-engine issue names onto stable graph diagnostic codes. */
function metadataIssueCode(code: string): string {
	switch (code) {
		case 'UnsupportedJsonSchemaKeyword': return 'UnsupportedSchemaKeyword'
		case 'UnresolvedJsonSchemaReference': return 'UnresolvedLocalSchemaReference'
		case 'UnsupportedJsonSchemaReference': return 'InvalidJsonSchema'
		default: return code
	}
}

/** Convert one descriptor-engine issue into a graph diagnostic at a caller-owned path. */
function metadataDiagnostic(
	issue: TypeDescriptorCompatibilityIssue,
	path: string,
	identity: Pick<SynthesisDiagnostic, 'nodeId' | 'templateId' | 'inputName'> = {}
): SynthesisDiagnostic {
	let relative = issue.path.replace(/^(?:actual|expected)\.?/u, '')
	if (path.endsWith('.schema')) relative = relative.replace(/^schema\.?/u, '')
	const issuePath = issue.code === 'ConflictingSchemaMetadata' && path.endsWith('.type')
		? `${path.slice(0, -'.type'.length)}.schema`
		: relative ? `${path}.${relative}` : path
	return errorDiagnostic({
		stage: 'type',
		code: metadataIssueCode(issue.code),
		message: issue.message,
		...identity,
		path: issuePath,
		...(issue.expected === undefined ? {} : { expected: issue.expected }),
		...(issue.actual === undefined ? {} : { actual: issue.actual }),
		...(issue.compilerCode === undefined ? {} : { compilerCode: issue.compilerCode }),
		...(issue.compilerCategory === undefined ? {} : { compilerCategory: issue.compilerCategory }),
		...(issue.line === undefined ? {} : { line: issue.line }),
		...(issue.column === undefined ? {} : { column: issue.column })
	})
}

/** Resolve canonical descriptor metadata and surface invalid/conflicting aliases. */
function effectiveDescriptor(
	type: TemplateArtifact['type'],
	schema: TemplateArtifact['schema'],
	path: string,
	identity: Pick<SynthesisDiagnostic, 'nodeId' | 'templateId' | 'inputName'> = {}
): { type?: NonNullable<TemplateArtifact['type']>; diagnostics: SynthesisDiagnostic[] } {
	const resolved = resolveEffectiveTypeDescriptor(type, schema)
	if (resolved.ok) return { ...(resolved.type ? { type: resolved.type } : {}), diagnostics: [] }
	const diagnosticPath = type?.schema === undefined && schema !== undefined && path.endsWith('.type')
		? `${path.slice(0, -'.type'.length)}.schema`
		: path
	return {
		...(resolved.type ? { type: resolved.type } : {}),
		diagnostics: resolved.issues.map(issue => metadataDiagnostic(issue, diagnosticPath, identity))
	}
}

/** Reject runtime-value metadata on whole source-file artifacts and goals. */
function sourceFileMetadataDiagnostics(
	type: TemplateArtifact['type'],
	schema: TemplateArtifact['schema'],
	typePath: string,
	schemaPath: string,
	identity: Pick<SynthesisDiagnostic, 'nodeId' | 'templateId' | 'inputName'> = {}
): SynthesisDiagnostic[] {
	return [
		...(type === undefined ? [] : [errorDiagnostic({
			stage: 'type',
			code: 'IncompatibleSourceFileMetadata',
			message: 'sourceFile artifacts and goals cannot declare value-level TypeDescriptor metadata.',
			...identity,
			path: typePath,
			expected: undefined,
			actual: type
		})]),
		...(schema === undefined ? [] : [errorDiagnostic({
			stage: 'type',
			code: 'IncompatibleSourceFileMetadata',
			message: 'sourceFile artifacts and goals cannot declare value-level JSON Schema metadata.',
			...identity,
			path: schemaPath,
			expected: undefined,
			actual: schema
		})])
	]
}

const TERMINAL_GRAPH_DIAGNOSTIC_CODES = new Set([
	'ArtifactInputIdCollision',
	'CatalogDigestMismatch',
	'CatalogManifestDigestMismatch',
	'CompilationScopeInvalid',
	'InvalidGeneratedSourceMap',
	'InvalidSemanticTarget'
])

/** Compare both captured catalog identities requested by a compilation caller. */
function catalogIdentityMismatchDiagnostics(
	options: GraphCompileOptions,
	registry: TemplateCatalogView
): SynthesisDiagnostic[] {
	const diagnostics: SynthesisDiagnostic[] = []
	if (options.expectedCatalogDigest !== undefined && options.expectedCatalogDigest !== registry.contractDigest) {
		diagnostics.push(errorDiagnostic({
			stage: 'template',
			code: 'CatalogDigestMismatch',
			message: 'The active template catalog does not match the expected planner contract digest.',
			path: 'options.expectedCatalogDigest',
			expected: options.expectedCatalogDigest,
			actual: registry.contractDigest
		}))
	}
	if (
		options.expectedCatalogManifestDigest !== undefined
		&& options.expectedCatalogManifestDigest !== registry.manifestDigest
	) {
		diagnostics.push(errorDiagnostic({
			stage: 'template',
			code: 'CatalogManifestDigestMismatch',
			message: 'The active template catalog does not match the expected executable manifest digest.',
			path: 'options.expectedCatalogManifestDigest',
			expected: options.expectedCatalogManifestDigest,
			actual: registry.manifestDigest
		}))
	}
	return diagnostics
}

const TEMPLATE_POLICY_DIAGNOSTIC_CODES = new Set([
	'ArtifactMarkerArityMismatch',
	'ArtifactMarkerKindMismatch',
	'CompleteArtifactContainsMarkers',
	'DuplicateUnresolvedInputId',
	'InvalidRawCodePolicy',
	'MalformedArtifactMarkers',
	'MalformedTemplateArtifact',
	'MissingArtifactMarker',
	'PartialArtifactHasNoUnresolvedInputs',
	'UnknownArtifactMarker'
])

/** Classify a graph failure by the repair channel available to its caller. */
function classifyGraphFailure(
	diagnostics: readonly SynthesisDiagnostic[]
): 'graphRepairable' | 'templatePolicyFailure' | 'terminalFailure' {
	if (diagnostics.some(diagnostic => TERMINAL_GRAPH_DIAGNOSTIC_CODES.has(diagnostic.code))) {
		return 'terminalFailure'
	}
	if (diagnostics.some(diagnostic => TEMPLATE_POLICY_DIAGNOSTIC_CODES.has(diagnostic.code))) {
		return 'templatePolicyFailure'
	}
	return 'graphRepairable'
}

/** Convert a zero-based artifact offset into a one-based line and column. */
function artifactLineAndColumn(code: string, offset: number): { line: number; column: number } {
	const before = code.slice(0, Math.max(0, Math.min(offset, code.length)))
	const lines = before.split('\n')
	return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 }
}

/** Resolve diagnostic identity from a mapped span, falling back to the final artifact. */
function semanticDiagnosticIdentity(
	artifact: CompleteTemplateArtifact,
	artifactStart: number,
	length = 0
): Pick<SynthesisDiagnostic, 'nodeId' | 'templateId' | 'inputName'> {
	const owner = deepestGeneratedSourceSpan(artifact.sourceMap, artifactStart, length)
	const nodeId = owner?.nodeId ?? artifact.id
	return {
		...(nodeId ? { nodeId } : {}),
		templateId: owner?.templateId ?? artifact.source.templateId,
		...(owner?.kind === 'input' ? { inputName: owner.inputName } : {})
	}
}

function finalArtifactIdentity(
	artifact: CompleteTemplateArtifact
): Pick<SynthesisDiagnostic, 'nodeId' | 'templateId'> {
	return {
		...(artifact.id ? { nodeId: artifact.id } : {}),
		templateId: artifact.source.templateId
	}
}

/** Add a declared result type to expression-like semantic wrappers when available. */
function semanticWrapperForArtifact(
	artifact: CompleteTemplateArtifact,
	mode: TemplateMode
): ReturnType<typeof wrapTemplateSource> {
	const advertisedType = artifact.type?.ts
	if (!advertisedType) return wrapTemplateSource(artifact.code, mode)

	if (mode.kind === 'expression') {
		const prefix = `const __partial: ${advertisedType} = (`
		const suffix = ');'
		return { mode, originalText: artifact.code, prefix, suffix, wrappedText: `${prefix}${artifact.code}${suffix}` }
	}

	if (mode.kind === 'expressionSuffix') {
		const prefix = 'const __partialCandidate = __partialReceiver'
		// The synthetic receiver has no insertion-site type yet. Reject a result
		// that remains `any`; otherwise every advertised suffix type would pass
		// vacuously. Explicit suffix assertions/narrowing can still establish a
		// concrete result until virtual target-file insertion is available.
		const suffix = `;
type __SynthesisRejectAny<T> = 0 extends (1 & T) ? never : T;
const __synthesisConcrete: __SynthesisRejectAny<typeof __partialCandidate> = __partialCandidate;
const __partial: ${advertisedType} = __partialCandidate;`
		return { mode, originalText: artifact.code, prefix, suffix, wrappedText: `${prefix}${artifact.code}${suffix}` }
	}

	if (mode.kind === 'type') {
		const prefix = `type __SynthesisAssertAssignable<Expected, Actual extends Expected> = Actual;
type __SynthesisChecked = __SynthesisAssertAssignable<${advertisedType}, `
		const suffix = '>;'
		return { mode, originalText: artifact.code, prefix, suffix, wrappedText: `${prefix}${artifact.code}${suffix}` }
	}

	return wrapTemplateSource(artifact.code, mode)
}

/** Semantically validate one complete artifact and return graph-native diagnostics. */
function validateArtifactSemantics(
	artifact: CompleteTemplateArtifact,
	options: GraphCompileOptions
): SynthesisDiagnostic[] {
	if (!options.checkSemanticDiagnostics) return []
	const targetFile = options.semanticContext?.targetFile
	if (targetFile) {
		try {
			const result = validateVirtualSemanticTarget({
				targetFile,
				...(options.tsConfigFilePath ? { tsConfigFilePath: options.tsConfigFilePath } : {}),
				...(options.semanticContext?.prelude ? { prelude: options.semanticContext.prelude } : {}),
				artifact: {
					code: artifact.code,
					kind: artifact.kind,
					...(artifact.type ? { type: artifact.type } : {})
				}
			})
			return result.diagnostics.map(diagnostic => {
				const identity = diagnostic.artifactOffset === undefined
					? finalArtifactIdentity(artifact)
					: semanticDiagnosticIdentity(
						artifact,
						diagnostic.artifactOffset,
						Math.min(diagnostic.length ?? 0, artifact.code.length - diagnostic.artifactOffset)
					)
				return {
					stage: 'type',
					code: 'TypeScriptSemanticError',
					severity: diagnostic.category === 'error' ? 'error' : 'warning',
					message: diagnostic.message,
					...identity,
					path: result.filePath,
					compilerCode: diagnostic.code,
					compilerCategory: diagnostic.category,
					...(diagnostic.line === undefined ? {} : { line: diagnostic.line }),
					...(diagnostic.column === undefined ? {} : { column: diagnostic.column })
				}
			})
		} catch (error) {
			return [errorDiagnostic({
				stage: 'type',
				code: 'InvalidSemanticTarget',
				message: error instanceof Error ? error.message : 'Virtual semantic target validation failed.',
				...finalArtifactIdentity(artifact),
				path: targetFile.filePath,
				actual: error instanceof Error ? { name: error.name, message: error.message } : error
			})]
		}
	}

	const mode = templateModeForArtifact(artifact)
	const wrapped = semanticWrapperForArtifact(artifact, mode)
	const receiverPrelude = mode.kind === 'expressionSuffix' ? 'declare const __partialReceiver: any;\n' : ''
	const callerPrelude = options.semanticContext?.prelude
	const prelude = `${receiverPrelude}${callerPrelude ? `${callerPrelude}\n` : ''}`
	let validationSource: string
	let artifactOffsetAt: (start: number | undefined) => number | undefined
	if (mode.kind === 'file') {
		// Whole-file artifacts may begin with a BOM, hashbang, or triple-slash
		// directives. Keep that prologue first while adding caller declarations.
		const insertion = sourcePrologueEnd(artifact.code)
		validationSource = `${artifact.code.slice(0, insertion)}${prelude}${artifact.code.slice(insertion)}`
		artifactOffsetAt = start => {
			if (start === undefined || start < 0) return undefined
			if (start < insertion) return start
			if (start < insertion + prelude.length) return undefined
			const offset = start - prelude.length
			return offset <= artifact.code.length ? offset : undefined
		}
	} else {
		const artifactStart = prelude.length + wrapped.prefix.length
		const artifactEnd = artifactStart + artifact.code.length
		validationSource = `${prelude}${wrapped.wrappedText}`
		artifactOffsetAt = start => start !== undefined && start >= artifactStart && start <= artifactEnd
			? start - artifactStart
			: undefined
	}
	const filePath = options.filePath ?? '__graph_semantic_validation__.ts'
	const project = createProject(options)
	const sourceFile = createSourceFile(project, validationSource, filePath)
	const compilerDiagnostics = [
		...structuredSyntacticDiagnostics(sourceFile),
		...structuredSemanticDiagnostics(sourceFile)
	]

	return compilerDiagnostics.map(diagnostic => {
		const artifactOffset = artifactOffsetAt(diagnostic.start)
		const artifactLocation = artifactOffset === undefined
			? undefined
			: artifactLineAndColumn(artifact.code, artifactOffset)
		const identity = artifactOffset === undefined
			? finalArtifactIdentity(artifact)
			: semanticDiagnosticIdentity(artifact, artifactOffset, diagnostic.length)
		return {
			stage: 'type',
			code: 'TypeScriptSemanticError',
			severity: diagnostic.category === 'error' ? 'error' : 'warning',
			message: diagnostic.message,
			...identity,
			...(options.filePath ? { path: options.filePath } : {}),
			compilerCode: diagnostic.code,
			compilerCategory: diagnostic.category,
			...(artifactLocation ?? {})
		}
	})
}

/** Syntactically validate an artifact using the wrapper implied by its output kind. */
function validateArtifactSyntax(
	artifact: TemplateArtifact,
	options: GraphCompileOptions
): SynthesisDiagnostic[] {
	try {
		const mode = templateModeForArtifact(artifact)
		const wrapped = wrapTemplateSource(artifact.code, mode)
		const filePath = options.filePath ?? '__template_artifact_validation__.ts'
		const project = createProject(options)
		const sourceFile = createSourceFile(project, wrapped.wrappedText, filePath)
		assertFinalValid(sourceFile, filePath, false)
		if (artifact.complete !== false && TYPED_SYNTAX_REGION_KIND_VALUES.includes(artifact.kind as never)) {
			validateRawTypedSyntax(
				artifact.kind,
				artifact.code,
				options,
				artifact.id === undefined ? {} : { id: artifact.id }
			)
		}
		return []
	} catch (error) {
		return [errorDiagnostic({
			stage: 'ast',
			code: 'GeneratedTypeScriptInvalid',
			message: error instanceof Error ? error.message : String(error),
			...(artifact.id ? { nodeId: artifact.id } : {}),
			templateId: artifact.source.templateId,
			...(options.filePath ? { path: options.filePath } : {}),
			actual: error instanceof Error
				? { name: error.name, message: error.message }
				: error
		})]
	}
}

const SECURITY_ERASED_ARTIFACT_KINDS = new Set([
	'type',
	'typeMember',
	'typeParameter',
	'heritageType',
	'importSpecifier',
	'exportSpecifier'
])

/** Apply the normal raw-fragment security policy to caller-supplied artifact code. */
function validateArtifactSecurity(
	artifact: TemplateArtifact,
	options: GraphCompileOptions,
	path: string
): SynthesisDiagnostic[] {
	if (SECURITY_ERASED_ARTIFACT_KINDS.has(artifact.kind)) return []

	try {
		const mode = templateModeForArtifact(artifact)
		const wrapped = wrapTemplateSource(artifact.code, mode)
		const project = createProject(options)
		const sourceFile = createSourceFile(project, wrapped.wrappedText, '__artifact_security_validation__.ts')
		enforceSecurityPolicy(sourceFile, options.securityPolicy, {
			...(artifact.id ? { id: artifact.id } : {}),
			bodyText: artifact.code
		})
		return []
	} catch (error) {
		return [errorDiagnostic({
			stage: 'policy',
			code: 'RawCodeRejected',
			message: error instanceof Error ? error.message : 'Caller-supplied artifact code violates the security policy.',
			...(artifact.id ? { nodeId: artifact.id } : {}),
			templateId: artifact.source.templateId,
			path,
			actual: error instanceof Error
				? { name: error.name, message: error.message }
				: error
		})]
	}
}

/** Compare persisted artifact provenance and contracts with one captured catalog. */
function artifactCatalogDiagnostics(
	artifact: TemplateArtifact,
	catalog: TemplateCatalogView,
	path: string
): SynthesisDiagnostic[] {
	const diagnostics: SynthesisDiagnostic[] = []
	const missingIdentity = missingManifestIdentityDiagnostic(artifact, `${path}.source.templateManifestDigest`)
	if (missingIdentity) diagnostics.push(missingIdentity)

	const template = catalog.get(artifact.source.templateId)
	if (!template) {
		diagnostics.push(errorDiagnostic({
			stage: 'template',
			code: 'UnknownTemplate',
			message: `Artifact provenance references template ${artifact.source.templateId}, which is absent from the captured catalog.`,
			...(artifact.id ? { nodeId: artifact.id } : {}),
			templateId: artifact.source.templateId,
			path: `${path}.source.templateId`,
			expected: catalog.list().map(candidate => candidate.modelId),
			actual: artifact.source.templateId
		}))
		return diagnostics
	}

	if (!missingIdentity && artifact.source.templateManifestDigest !== template.manifestDigest) {
		diagnostics.push(errorDiagnostic({
			stage: 'template',
			code: 'TemplateManifestDigestMismatch',
			message: `Artifact provenance does not match the captured manifest for template ${template.modelId}.`,
			...(artifact.id ? { nodeId: artifact.id } : {}),
			templateId: template.modelId,
			path: `${path}.source.templateManifestDigest`,
			expected: template.manifestDigest,
			actual: artifact.source.templateManifestDigest
		}))
	}

	if (artifact.source.templateVersion !== template.version) {
		diagnostics.push(errorDiagnostic({
			stage: 'template',
			code: 'TemplateManifestDigestMismatch',
			message: `Artifact provenance carries a stale version for template ${template.modelId}.`,
			...(artifact.id ? { nodeId: artifact.id } : {}),
			templateId: template.modelId,
			path: `${path}.source.templateVersion`,
			expected: template.version,
			actual: artifact.source.templateVersion
		}))
	}

	if (artifact.kind !== template.output.kind) {
		diagnostics.push(errorDiagnostic({
			stage: 'port',
			code: 'IncompatibleFragmentKind',
			message: `Artifact kind ${artifact.kind} is not the output kind declared by template ${template.modelId}.`,
			...(artifact.id ? { nodeId: artifact.id } : {}),
			templateId: template.modelId,
			path: `${path}.kind`,
			expected: template.output.kind,
			actual: artifact.kind
		}))
	}

	const artifactType = resolveEffectiveTypeDescriptor(artifact.type, artifact.schema)
	const templateType = resolveEffectiveTypeDescriptor(template.output.type, template.output.schema)
	if (artifactType.ok && templateType.ok) {
		const forward = compareTypeDescriptors(artifactType.type, templateType.type)
		const reverse = compareTypeDescriptors(templateType.type, artifactType.type)
		if (forward.status !== 'compatible' || reverse.status !== 'compatible') {
			diagnostics.push(errorDiagnostic({
				stage: 'type',
				code: 'IncompatibleFragmentType',
				message: `Artifact metadata does not match the output contract declared by template ${template.modelId}.`,
				...(artifact.id ? { nodeId: artifact.id } : {}),
				templateId: template.modelId,
				path: `${path}.type`,
				expected: templateType.type,
				actual: artifactType.type
			}))
		}
	}

	if (artifact.complete === false) {
		for (const [index, unresolved] of artifact.unresolvedInputs.entries()) {
			const inputPath = `${path}.unresolvedInputs[${index}]`
			const owner = catalog.get(unresolved.templateId)
			if (!owner) {
				diagnostics.push(errorDiagnostic({
					stage: 'template',
					code: 'UnknownTemplate',
					message: `Unresolved artifact input references template ${unresolved.templateId}, which is absent from the captured catalog.`,
					...(unresolved.nodeId ? { nodeId: unresolved.nodeId } : {}),
					templateId: unresolved.templateId,
					inputName: unresolved.inputName,
					path: `${inputPath}.templateId`,
					expected: catalog.list().map(candidate => candidate.modelId),
					actual: unresolved.templateId
				}))
				continue
			}

			const expectedPort = owner.inputs[unresolved.inputName]
			if (!expectedPort) {
				diagnostics.push(errorDiagnostic({
					stage: 'input',
					code: 'UnknownInput',
					message: `Unresolved input ${unresolved.inputName} is not declared by template ${owner.modelId}.`,
					...(unresolved.nodeId ? { nodeId: unresolved.nodeId } : {}),
					templateId: owner.modelId,
					inputName: unresolved.inputName,
					path: `${inputPath}.inputName`,
					expected: Object.keys(owner.inputs),
					actual: unresolved.inputName
				}))
				continue
			}

			const expectedSummary = summarizeInputPort(expectedPort)
			const actualSummary = summarizeInputPort(unresolved.port)
			if (canonicalizeJson(actualSummary) !== canonicalizeJson(expectedSummary)) {
				diagnostics.push(errorDiagnostic({
					stage: 'port',
					code: 'IncompatibleInputKind',
					message: `Persisted input contract ${owner.modelId}.${unresolved.inputName} does not match the captured template catalog.`,
					...(unresolved.nodeId ? { nodeId: unresolved.nodeId } : {}),
					templateId: owner.modelId,
					inputName: unresolved.inputName,
					path: `${inputPath}.port`,
					expected: expectedSummary,
					actual: actualSummary
				}))
			}
		}
	}

	for (const [index, span] of (artifact.sourceMap?.spans ?? []).entries()) {
		if (catalog.get(span.templateId)) continue
		diagnostics.push(errorDiagnostic({
			stage: 'template',
			code: 'UnknownTemplate',
			message: `Artifact source-map provenance references template ${span.templateId}, which is absent from the captured catalog.`,
			...(span.nodeId ? { nodeId: span.nodeId } : {}),
			templateId: span.templateId,
			...(span.kind === 'input' ? { inputName: span.inputName } : {}),
			path: `${path}.sourceMap.spans[${index}].templateId`,
			actual: span.templateId
		}))
	}

	return diagnostics
}

/** Options for validating externally supplied artifact data against a catalog. */
export interface TemplateArtifactCatalogValidationOptions extends GraphCompileOptions {
	/** Disable only when the artifact was produced inside the current trusted compilation. */
	screenSecurity?: boolean
}

/**
 * Validate persisted or caller-supplied artifact data against one captured catalog.
 *
 * This is stronger than structural integrity: template identities, output and
 * unresolved-port contracts, syntax, and source security are checked together.
 */
export function validateTemplateArtifactAgainstCatalog(
	artifact: TemplateArtifact,
	catalog: TemplateCatalogView,
	options: TemplateArtifactCatalogValidationOptions = {}
): SynthesisDiagnostic[] {
	try {
		return validateTemplateArtifactAgainstCatalogAtPath(
			artifact,
			captureTemplateCatalogView(catalog),
			options,
			'artifact'
		)
	} catch (error) {
		if (error instanceof TemplateCatalogValidationError) return [...error.diagnostics]
		throw error
	}
}

function validateTemplateArtifactAgainstCatalogAtPath(
	artifact: TemplateArtifact,
	catalog: TemplateCatalogView,
	options: TemplateArtifactCatalogValidationOptions,
	path: string
): SynthesisDiagnostic[] {
	const identityDiagnostics = catalogIdentityMismatchDiagnostics(options, catalog)
	const integrityDiagnostics = validateTemplateArtifactIntegrity(artifact)
	if (integrityDiagnostics.some(diagnostic => diagnostic.severity === 'error')) {
		return [...identityDiagnostics, ...integrityDiagnostics]
	}

	const catalogDiagnostics = artifactCatalogDiagnostics(artifact, catalog, path)
	const syntaxDiagnostics = validateArtifactSyntax(artifact, options)
	const diagnostics = [...identityDiagnostics, ...catalogDiagnostics, ...syntaxDiagnostics]
	if (diagnostics.some(diagnostic => diagnostic.severity === 'error') || options.screenSecurity === false) {
		return diagnostics
	}
	return [...diagnostics, ...validateArtifactSecurity(artifact, options, `${path}.code`)]
}

/** Detect shorthand graph references of the form `{ "$ref": "nodeId" }`. */
function isRefShorthand(input: SynthesisInput): input is { $ref: string } {
	return typeof input === 'object' && input !== null && '$ref' in input && typeof input.$ref === 'string'
}

/** Normalize shorthand references into the explicit graph input form. */
export function normalizeSynthesisInput(input: SynthesisInput): Exclude<SynthesisInput, { $ref: string }> {
	return isRefShorthand(input) ? { kind: 'ref', nodeId: input.$ref } : input
}

/** Type-check a graph against a template catalog without compiling it yet. */
export function defineGraph<
	const TTemplates extends readonly GraphTemplateDefinition<any, string>[],
	const TGraph extends AuthoredGraphInput
>(
	templates: TTemplates & StrictTemplateCatalog<TTemplates>,
	graph: StrictSynthesisGraph<TTemplates, TGraph>
): DefinedSynthesisGraph<TTemplates> {
	createTemplateRegistry(templates as StrictTemplateCatalog<TTemplates>)
	return graph as unknown as DefinedSynthesisGraph<TTemplates>
}

/** Type-check an intentionally incomplete graph against a template catalog. */
export function definePartialGraph<
	const TTemplates extends readonly GraphTemplateDefinition<any, string>[],
	const TGraph extends AuthoredGraphInput
>(
	templates: TTemplates & StrictTemplateCatalog<TTemplates>,
	graph: StrictPartialSynthesisGraph<TTemplates, TGraph>
): DefinedPartialSynthesisGraph<TTemplates> {
	createTemplateRegistry(templates as StrictTemplateCatalog<TTemplates>)
	return graph as unknown as DefinedPartialSynthesisGraph<TTemplates>
}

/** Callable graph compiler with strict and partial compilation entrypoints. */
export type GraphCompiler<TTemplates extends readonly GraphTemplateDefinition<any, string>[]> = {
	/** Stable planner-contract digest captured when this compiler was built. */
	readonly contractDigest: string
	/** Stable executable-manifest digest captured when this compiler was built. */
	readonly manifestDigest: string
	/** Immutable catalog captured by this compiler for trusted artifact validation. */
	readonly catalog: TemplateRegistrySnapshot
	/** Compile a previously defined graph with strict required-input behavior. */
	(graph: DefinedSynthesisGraph<TTemplates>): GraphCompilationResult
	/** Compile an inline typed graph with strict required-input behavior. */
	<const TGraph extends AuthoredGraphInput>(graph: StrictSynthesisGraph<TTemplates, TGraph>): GraphCompilationResult
	/** Compile while preserving unresolved required inputs. */
	(graph: DefinedPartialSynthesisGraph<TTemplates>, options: GraphCompileOptions & { mode: 'partial' }): GraphPartialCompilationResult
	/** Compile an inline catalog-aware partial graph. */
	<const TGraph extends AuthoredGraphInput>(
		graph: StrictPartialSynthesisGraph<TTemplates, TGraph>,
		options: GraphCompileOptions & { mode: 'partial' }
	): GraphPartialCompilationResult
	/** Compile a dynamic graph while preserving unresolved required inputs. */
	(graph: SynthesisGraph, options: GraphCompileOptions & { mode: 'partial' }): GraphPartialCompilationResult
	/** Type-check a graph against this compiler's template catalog. */
	defineGraph<const TGraph extends AuthoredGraphInput>(
		graph: StrictSynthesisGraph<TTemplates, TGraph>
	): DefinedSynthesisGraph<TTemplates>
	/** Type-check an intentionally incomplete graph against this compiler's catalog. */
	definePartialGraph<const TGraph extends AuthoredGraphInput>(
		graph: StrictPartialSynthesisGraph<TTemplates, TGraph>
	): DefinedPartialSynthesisGraph<TTemplates>
}

/** Build a typed compiler from an authored template catalog. */
export function buildGraphCompiler<const TTemplates extends readonly GraphTemplateDefinition<any, string>[]>(
	templates: TTemplates & StrictTemplateCatalog<TTemplates>,
	options?: GraphCompileOptions
): GraphCompiler<TTemplates>

/** Build a runtime compiler from an already validated catalog view. */
export function buildGraphCompiler(
	templates: TemplateCatalogView,
	options?: GraphCompileOptions
): GraphCompiler<readonly GraphTemplateDefinition<any, string>[]>

export function buildGraphCompiler(
	templates: TemplateCatalogView | readonly GraphTemplateDefinition<any, string>[],
	options?: GraphCompileOptions
): GraphCompiler<readonly GraphTemplateDefinition<any, string>[]> {
	const catalog = templateRegistryFromInput(templates)
	const compiler = (graph: SynthesisGraph, callOptions?: GraphCompileOptions & { mode?: 'strict' | 'partial' }) =>
		compileGraph(graph as never, catalog, { ...options, ...callOptions } as never)
	Object.defineProperty(compiler, 'contractDigest', { value: catalog.contractDigest, enumerable: true })
	Object.defineProperty(compiler, 'manifestDigest', { value: catalog.manifestDigest, enumerable: true })
	Object.defineProperty(compiler, 'catalog', { value: catalog, enumerable: true })
	compiler.defineGraph = (graph: AuthoredGraphInput) => graph as never
	compiler.definePartialGraph = (graph: AuthoredGraphInput) => graph as never
	return brandGraphCompiler(compiler as unknown as GraphCompiler<readonly GraphTemplateDefinition<any, string>[]>)
}

/** Capture either supported template source as one immutable validated catalog. */
function templateRegistryFromInput(
	registryOrTemplates: TemplateCatalogView | readonly GraphTemplateDefinition<any, string>[]
): TemplateRegistrySnapshot {
	return captureTemplateCatalogView(registryOrTemplates)
}

/** Expand inline nodes and shorthand references before validation/execution. */
export function normalizeSynthesisGraph(graph: SynthesisGraph): GraphNormalizationResult {
	const nodes: SynthesisNode[] = []

	/** Normalize one node and recursively lift inline nodes into the graph list. */
	function normalizeNode(node: SynthesisNode): SynthesisNode {
		const inputs: Record<string, NormalizedSynthesisInput> = {}

		for (const [inputName, input] of Object.entries(node.inputs)) {
			const normalized = normalizeSynthesisInput(input)
			if (normalized.kind === 'fragmentCollection') {
				inputs[inputName] = {
					kind: 'fragmentCollection',
					items: normalized.items.map(item => {
						const normalizedItem = isRefShorthand(item) ? { kind: 'ref' as const, nodeId: item.$ref } : item
						if (normalizedItem.kind === 'inline') {
							const inlineNode = normalizeNode(normalizedItem.node)
							nodes.push(inlineNode)
							return { kind: 'ref', nodeId: inlineNode.id }
						}
						return normalizedItem
					})
				}
				continue
			}
			if (normalized.kind === 'inline') {
				const inlineNode = normalizeNode(normalized.node)
				nodes.push(inlineNode)
				inputs[inputName] = { kind: 'ref', nodeId: inlineNode.id }
			} else {
				inputs[inputName] = normalized
			}
		}

		return {
			id: node.id,
			templateId: node.templateId,
			inputs
		}
	}

	for (const node of graph.nodes) {
		nodes.push(normalizeNode(node))
	}

	return {
		graph: {
			nodes,
			finalNodeId: graph.finalNodeId,
			...(graph.goal ? { goal: graph.goal } : {})
		}
	}
}

/** Return node IDs referenced by one graph input. */
function inputDependencies(input: SynthesisInput): string[] {
	const normalized = normalizeSynthesisInput(input)
	if (normalized.kind === 'ref') return [normalized.nodeId]
	if (normalized.kind === 'inline') return Object.values(normalized.node.inputs).flatMap(inputDependencies)
	if (normalized.kind === 'fragmentCollection') return normalized.items.flatMap(inputDependencies)
	return []
}

/** Flatten union ports into the concrete port options they accept. */
function inputPortOptions(port: InputPort): InputPort[] {
	return port.kind === 'union' ? port.options : [port]
}

/** Read a template's input map with a narrow helper for future indirection. */
function templateInputs(template: GraphTemplateDefinition): Record<string, InputPort> {
	return template.inputs
}

/** Validate graph shape and static references before any template invocation. */
function validateStaticGraph(
	graph: SynthesisGraph,
	registry: TemplateCatalogView,
	options: { allowMissingRequiredInputs?: boolean } = {}
): { diagnostics: SynthesisDiagnostic[]; nodesById: Map<string, SynthesisNode> } {
	const diagnostics: SynthesisDiagnostic[] = []
	const nodesById = new Map<string, SynthesisNode>()
	const seen = new Set<string>()

	for (const node of graph.nodes) {
		if (seen.has(node.id)) {
			diagnostics.push(
				errorDiagnostic({
					stage: 'graph',
					code: 'DuplicateNodeId',
					message: `Duplicate node id ${node.id}.`,
					nodeId: node.id,
					path: `nodes.${node.id}`
				})
			)
			continue
		}
		seen.add(node.id)
		nodesById.set(node.id, node)
	}

	if (!nodesById.has(graph.finalNodeId)) {
		diagnostics.push(
			errorDiagnostic({
				stage: 'graph',
				code: 'UnknownFinalNode',
				message: `Final node ${graph.finalNodeId} does not exist.`,
				path: 'finalNodeId',
				actual: graph.finalNodeId
			})
		)
	}

	if (graph.goal) {
		if (graph.goal.outputKind === 'sourceFile') {
			diagnostics.push(...sourceFileMetadataDiagnostics(
				graph.goal.type,
				graph.goal.schema,
				'goal.type',
				'goal.schema'
			))
		}
		const goalDescriptor = effectiveDescriptor(graph.goal.type, graph.goal.schema, 'goal.type')
		diagnostics.push(...goalDescriptor.diagnostics)
	}

	for (const node of graph.nodes) {
		const template = registry.get(node.templateId)
		if (!template) {
			diagnostics.push(
				errorDiagnostic({
					stage: 'template',
					code: 'UnknownTemplate',
					message: `Unknown template ${node.templateId}.`,
					nodeId: node.id,
					templateId: node.templateId,
					path: `nodes.${node.id}.templateId`
				})
			)
			continue
		}

		const ports = templateInputs(template)
		for (const [inputName, port] of Object.entries(ports)) {
			if (
				!options.allowMissingRequiredInputs &&
				portIsRequired(port) &&
				!Object.prototype.hasOwnProperty.call(node.inputs, inputName)
			) {
				diagnostics.push(
					errorDiagnostic({
						stage: 'input',
						code: 'MissingRequiredInput',
						message: `Missing required input ${inputName}.`,
						nodeId: node.id,
						templateId: node.templateId,
						inputName,
						path: `nodes.${node.id}.inputs.${inputName}`,
						expected: port
					})
				)
			}
		}

		for (const inputName of Object.keys(node.inputs)) {
			if (!Object.prototype.hasOwnProperty.call(ports, inputName)) {
				diagnostics.push(
					errorDiagnostic({
						stage: 'input',
						code: 'UnknownInput',
						message: `Unknown input ${inputName}.`,
						nodeId: node.id,
						templateId: node.templateId,
						inputName,
						path: `nodes.${node.id}.inputs.${inputName}`
					})
				)
			}
		}

		for (const [inputName, input] of Object.entries(node.inputs)) {
			for (const dependency of inputDependencies(input)) {
				if (!nodesById.has(dependency)) {
					diagnostics.push(
						errorDiagnostic({
							stage: 'graph',
							code: 'UnknownReference',
							message: `Input ${inputName} references unknown node ${dependency}.`,
							nodeId: node.id,
							templateId: node.templateId,
							inputName,
							path: `nodes.${node.id}.inputs.${inputName}`,
							actual: dependency
						})
					)
				}
			}
		}
	}

	diagnostics.push(...detectCycles(nodesById))
	return { diagnostics, nodesById }
}

/** Detect cycles among graph node dependencies. */
function detectCycles(nodesById: Map<string, SynthesisNode>): SynthesisDiagnostic[] {
	const diagnostics: SynthesisDiagnostic[] = []
	const visiting = new Set<string>()
	const visited = new Set<string>()

	/** Depth-first traversal that records the path when a node is revisited. */
	function visit(nodeId: string, path: string[]): void {
		if (visited.has(nodeId)) return
		if (visiting.has(nodeId)) {
			diagnostics.push(
				errorDiagnostic({
					stage: 'graph',
					code: 'CycleDetected',
					message: `Cycle detected: ${[...path, nodeId].join(' -> ')}.`,
					nodeId,
					path: [...path, nodeId].join(' -> ')
				})
			)
			return
		}

		const node = nodesById.get(nodeId)
		if (!node) return
		visiting.add(nodeId)
		for (const dependency of Object.values(node.inputs).flatMap(inputDependencies)) {
			visit(dependency, [...path, nodeId])
		}
		visiting.delete(nodeId)
		visited.add(nodeId)
	}

	for (const nodeId of nodesById.keys()) {
		visit(nodeId, [])
	}

	return diagnostics
}

/** Check whether a produced fragment/artifact can satisfy a fragment port. */
function fragmentCompatible(
	port: FragmentInputPort | FragmentCollectionInputPort,
	fragment: TemplateArtifact,
	node: SynthesisNode,
	inputName: string
): SynthesisDiagnostic | undefined {
	const expectedOutputKind = fragmentPortOutputKind(port)

	if (expectedOutputKind !== fragment.kind) {
		return errorDiagnostic({
			stage: 'port',
			code: 'IncompatibleFragmentKind',
			message: `Input ${inputName} expected ${expectedOutputKind} but received ${fragment.kind}.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: expectedOutputKind,
			actual: fragment.kind
		})
	}

	const fragmentDescriptor = effectiveDescriptor(
		fragment.type,
		fragment.schema,
		'fragment.type',
		{
			nodeId: node.id,
			templateId: node.templateId,
			inputName
		}
	)
	if (fragmentDescriptor.diagnostics[0]) return fragmentDescriptor.diagnostics[0]

	const typeComparison = compareTypeDescriptors(fragmentDescriptor.type, port.accepts.type)
	if (typeComparison.status === 'indeterminate') {
		return errorDiagnostic({
			stage: 'type',
			code: 'SchemaCompatibilityIndeterminate',
			message: `Input ${inputName} fragment schema compatibility cannot be proven conservatively.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: port.accepts.type,
			actual: fragmentDescriptor.type
		})
	}
	if (typeComparison.status === 'invalid') {
		return typeComparison.issues[0]
			? metadataDiagnostic(typeComparison.issues[0], `nodes.${node.id}.inputs.${inputName}`, {
				nodeId: node.id, templateId: node.templateId, inputName
			})
			: errorDiagnostic({
				stage: 'type', code: 'InvalidTypeScriptType',
				message: `Input ${inputName} contains invalid type metadata.`,
				nodeId: node.id, templateId: node.templateId, inputName
			})
	}
	if (typeComparison.status === 'incompatible') {
		return errorDiagnostic({
			stage: 'type',
			code: 'IncompatibleFragmentType',
			message: `Input ${inputName} received an incompatible fragment type.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: port.accepts.type,
			actual: fragmentDescriptor.type
		})
	}

	if (port.accepts.sourceModelIds && !port.accepts.sourceModelIds.includes(fragment.source.templateId)) {
		return errorDiagnostic({
			stage: 'port',
			code: 'IncompatibleFragmentSource',
			message: `Input ${inputName} does not accept fragments from ${fragment.source.templateId}.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: port.accepts.sourceModelIds,
			actual: fragment.source.templateId
		})
	}

	return undefined
}

function fragmentCollectionSizeCompatible(
	port: FragmentCollectionInputPort,
	count: number,
	node: SynthesisNode,
	inputName: string
): SynthesisDiagnostic | undefined {
	const minItems = port.minItems ?? 0
	if (count < minItems || (port.maxItems !== undefined && count > port.maxItems)) {
		return errorDiagnostic({
			stage: 'port', code: 'IncompatibleCollectionSize',
			message: `Input ${inputName} received ${count} fragments outside its allowed collection size.`,
			nodeId: node.id, templateId: node.templateId, inputName,
			expected: { minItems, ...(port.maxItems === undefined ? {} : { maxItems: port.maxItems }) }, actual: count
		})
	}
	return undefined
}

/** Check raw-code input text against the planner-facing raw-code policy. */
function rawCodeCompatible(
	port: RawCodeInputPort,
	code: string,
	node: SynthesisNode,
	inputName: string
): SynthesisDiagnostic | undefined {
	if (code.trim().length === 0) {
		return errorDiagnostic({
			stage: 'policy',
			code: 'RawCodeRejected',
			message: `Raw code input ${inputName} must not be empty.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName
		})
	}

	const policy = port.policy
	if (!policy) return undefined

	if (policy.maxLength !== undefined && code.length > policy.maxLength) {
		return errorDiagnostic({
			stage: 'policy',
			code: 'RawCodeRejected',
			message: `Raw code input ${inputName} exceeds the maximum length of ${policy.maxLength}.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: { maxLength: policy.maxLength },
			actual: { length: code.length },
			repairHints: [
				{ kind: 'shortenRawCode', message: 'Use a shorter raw-code expression or a structured template input.' }
			]
		})
	}

	if (policy.allowNewlines === false && /\r|\n/u.test(code)) {
		return errorDiagnostic({
			stage: 'policy',
			code: 'RawCodeRejected',
			message: `Raw code input ${inputName} must not contain newlines.`,
			nodeId: node.id,
			templateId: node.templateId,
			inputName,
			expected: { allowNewlines: false },
			actual: code,
			repairHints: [{ kind: 'removeNewlines', message: 'Submit the raw code as a single-line fragment.' }]
		})
	}

	for (const forbidden of policy.forbiddenSubstrings ?? []) {
		if (forbidden.length > 0 && code.includes(forbidden)) {
			return errorDiagnostic({
				stage: 'policy',
				code: 'RawCodeRejected',
				message: `Raw code input ${inputName} contains a forbidden substring.`,
				nodeId: node.id,
				templateId: node.templateId,
				inputName,
				expected: { forbiddenSubstrings: policy.forbiddenSubstrings },
				actual: forbidden,
				repairHints: [{ kind: 'removeForbiddenSubstring', message: `Remove ${forbidden} from the raw-code input.` }]
			})
		}
	}

	for (const pattern of policy.forbiddenPatterns ?? []) {
		let regexp: RegExp
		try {
			regexp = new RegExp(pattern, 'u')
		} catch (error) {
			return errorDiagnostic({
				stage: 'policy',
				code: 'InvalidRawCodePolicy',
				message: `Raw code policy contains an invalid forbidden pattern: ${pattern}.`,
				nodeId: node.id,
				templateId: node.templateId,
				inputName,
				expected: 'valid regular expression pattern',
				actual: error
			})
		}

		if (regexp.test(code)) {
			return errorDiagnostic({
				stage: 'policy',
				code: 'RawCodeRejected',
				message: `Raw code input ${inputName} matches a forbidden pattern.`,
				nodeId: node.id,
				templateId: node.templateId,
				inputName,
				expected: { forbiddenPatterns: policy.forbiddenPatterns },
				actual: pattern,
				repairHints: [{ kind: 'avoidForbiddenPattern', message: `Avoid code matching /${pattern}/u.` }]
			})
		}
	}

	return undefined
}

/** Validate a literal value against the literal port's schema, when present. */
function literalCompatible(
	port: InputPort,
	value: unknown,
	node: SynthesisNode,
	inputName: string
): SynthesisDiagnostic | undefined {
	if (port.kind !== 'literal') return undefined
	if (port.schema === undefined) return undefined
	const result = validateJsonValueAgainstSchema(value, port.schema, `nodes.${node.id}.inputs.${inputName}`)
	if (result.ok) return undefined
	const issue = result.issues[0]

	return errorDiagnostic({
		stage: 'input',
		code: 'InvalidLiteralInput',
		message: issue?.message ?? 'Literal value does not satisfy its JSON Schema.',
		nodeId: node.id,
		templateId: node.templateId,
		inputName,
		path: issue?.path ?? `nodes.${node.id}.inputs.${inputName}`,
		expected: port.schema,
		actual: value
	})
}

/** Validate the final artifact or fragment against graph-level goal metadata. */
function validateFinalGoal(graph: SynthesisGraph, finalFragment: TemplateArtifact): SynthesisDiagnostic[] {
	const goal = graph.goal
	if (!goal) return []
	const diagnostics: SynthesisDiagnostic[] = []

	if (goal.outputKind && goal.outputKind !== finalFragment.kind) {
		diagnostics.push(
			errorDiagnostic({
				stage: 'graph',
				code: 'FinalGoalKindMismatch',
				message: `Final fragment kind ${finalFragment.kind} does not satisfy goal ${goal.outputKind}.`,
				path: 'goal.outputKind',
				expected: goal.outputKind,
				actual: finalFragment.kind
			})
		)
	}

	const sourceFileMetadata = finalFragment.kind === 'sourceFile' && goal.outputKind !== 'sourceFile'
		? sourceFileMetadataDiagnostics(goal.type, goal.schema, 'goal.type', 'goal.schema')
		: []
	diagnostics.push(...sourceFileMetadata)

	const goalDescriptor = effectiveDescriptor(goal.type, goal.schema, 'goal.type')
	const finalDescriptor = effectiveDescriptor(
		finalFragment.type,
		finalFragment.schema,
		'finalArtifact.type',
		{
			...(finalFragment.id ? { nodeId: finalFragment.id } : {}),
			templateId: finalFragment.source.templateId
		}
	)
	diagnostics.push(...goalDescriptor.diagnostics, ...finalDescriptor.diagnostics)
	if (sourceFileMetadata.length > 0
		|| goalDescriptor.diagnostics.length > 0
		|| finalDescriptor.diagnostics.length > 0) return diagnostics

	const comparison = compareTypeDescriptors(finalDescriptor.type, goalDescriptor.type)
	if (comparison.status === 'invalid') {
		diagnostics.push(...comparison.issues.map(issue => metadataDiagnostic(issue, 'goal.type')))
		return diagnostics
	}
	if (comparison.typeScript?.status === 'incompatible') {
		diagnostics.push(
			errorDiagnostic({
				stage: 'type',
				code: 'FinalGoalTypeMismatch',
				message: 'Final fragment type does not satisfy graph goal.',
				path: 'goal.type',
				expected: goalDescriptor.type?.ts,
				actual: finalDescriptor.type?.ts
			})
		)
	}

	if (comparison.schema?.compatibility === 'indeterminate') {
		diagnostics.push(errorDiagnostic({
			stage: 'type',
			code: 'SchemaCompatibilityIndeterminate',
			message: 'Final fragment schema compatibility cannot be proven conservatively.',
			path: goal.schema === undefined ? 'goal.type.schema' : 'goal.schema',
			expected: goalDescriptor.type?.schema,
			actual: finalDescriptor.type?.schema
		}))
	} else if (
		goalDescriptor.type?.schema !== undefined
		&& (finalDescriptor.type?.schema === undefined || comparison.schema?.compatibility === 'incompatible')
	) {
		diagnostics.push(
			errorDiagnostic({
				stage: 'type',
				code: 'FinalGoalSchemaMismatch',
				message: 'Final fragment schema does not satisfy graph goal.',
				path: goal.schema === undefined ? 'goal.type.schema' : 'goal.schema',
				expected: goalDescriptor.type.schema,
				actual: finalDescriptor.type?.schema
			})
		)
	}

	return diagnostics
}

/** Pick the partial-template parser wrapper needed for an artifact kind. */
function templateModeForArtifact(artifact: TemplateArtifact): TemplateMode {
	return templateModeForRegionKind(artifact.kind)
}

/** Return a complete artifact shape for complete fragments/artifacts. */
function completeArtifact(artifact: TemplateArtifact): TemplateArtifact {
	if (artifact.complete === false) return artifact
	const complete = { ...artifact, complete: true } as CompleteTemplateArtifact
	return isLibraryOwnedTemplateArtifact(artifact) ? brandTemplateArtifact(complete) : complete
}

/** Return partial child artifacts carried by a resolved fill value. */
function partialArtifactsFromResolvedInput(input: ResolvedGraphInput): PartialTemplateArtifact[] {
	if (input.kind === 'fragment') return input.fragment.complete === false ? [input.fragment] : []
	if (input.kind === 'fragmentCollection') {
		return input.fragments.filter((fragment): fragment is PartialTemplateArtifact => fragment.complete === false)
	}
	return []
}

/** Return source that must bypass structured AST conversion to preserve child markers. */
function partialArtifactReplacementCode(input: ResolvedGraphInput): string | undefined {
	if (input.kind === 'fragment' && input.fragment.complete === false) return input.fragment.code
	if (input.kind === 'fragmentCollection' && input.fragments.some(fragment => fragment.complete === false)) {
		return input.fragments.map(fragment => fragment.code).join(
			input.port.separator ?? defaultFragmentCollectionSeparator(input.port.regionKind)
		)
	}
	return undefined
}

/** Remap nested child ownership into the serialized text used for one fill. */
function nestedResolvedInputSourceMap(
	input: ResolvedGraphInput,
	renderedCode: string
): GeneratedSourceMap | undefined {
	if (input.kind === 'fragment') {
		return sourceMappedFragment(input.fragment, renderedCode).sourceMap
	}
	if (input.kind === 'fragmentCollection') {
		const joined = sourceMappedFragmentCollection(
			input.fragments,
			input.port.separator ?? defaultFragmentCollectionSeparator(input.port.regionKind)
		)
		return remapGeneratedSourceMap(joined.code, renderedCode, joined.sourceMap)
	}
	return undefined
}

/** Find the existing unresolved input owner that encloses one physical marker. */
function unresolvedOwnerDepth(
	artifact: TemplateArtifact,
	region: ReplacementRegion,
	unresolved: UnresolvedTemplateInput
): { depth: number; exists: boolean } {
	const candidates = (artifact.sourceMap?.spans ?? []).filter(span =>
		span.kind === 'input'
		&& span.inputName === unresolved.inputName
		&& span.templateId === unresolved.templateId
		&& (unresolved.nodeId === undefined || span.nodeId === unresolved.nodeId)
		&& span.start <= region.startCommentStart
		&& span.end >= region.endCommentEnd
	)
	const depth = candidates.reduce((maximum, span) => Math.max(maximum, span.nestingDepth), 1)
	return { depth, exists: candidates.length > 0 }
}

/** Build ownership carried by one replacement of an unresolved artifact marker. */
function artifactFillEditSourceMap(
	artifact: TemplateArtifact,
	region: ReplacementRegion,
	unresolved: UnresolvedTemplateInput,
	resolved: ResolvedGraphInput,
	renderedCode: string
): GeneratedSourceMap {
	const owner = unresolvedOwnerDepth(artifact, region, unresolved)
	const ownerMap: GeneratedSourceMap | undefined = owner.exists ? undefined : {
		...emptyGeneratedSourceMap(),
		spans: [inputGeneratedSourceSpan(0, renderedCode.length, {
			...(unresolved.nodeId ? { nodeId: unresolved.nodeId } : {}),
			templateId: unresolved.templateId,
			inputName: unresolved.inputName
		}, owner.depth)]
	}
	const nested = nestedResolvedInputSourceMap(resolved, renderedCode)
	return mergeGeneratedSourceMaps(
		ownerMap,
		nested ? shiftGeneratedSourceMap(nested, 0, owner.depth + 1) : undefined
	)
}

/** Compare unresolved descriptors when one logical child is composed repeatedly. */
function unresolvedInputsEquivalent(left: UnresolvedTemplateInput, right: UnresolvedTemplateInput): boolean {
	return canonicalizeJson(left) === canonicalizeJson(right)
}

/** Resolve one caller-provided fill value against an unresolved input port. */
function resolveArtifactInput(
	fill: TemplateArtifactInput,
	port: InputPort,
	node: SynthesisNode,
	inputName: string
): { resolved?: ResolvedGraphInput; diagnostic?: SynthesisDiagnostic } {
	let lastDiagnostic: SynthesisDiagnostic | undefined

	for (const option of inputPortOptions(port)) {
		if (option.kind === 'literal' && fill.kind === 'literal') {
			lastDiagnostic = literalCompatible(option, fill.value, node, inputName)
			if (!lastDiagnostic) return { resolved: { kind: 'literal', value: fill.value, port: option } }
		}

		if (option.kind === 'rawCode' && fill.kind === 'rawCode') {
			lastDiagnostic = rawCodeCompatible(option, fill.code, node, inputName)
			if (!lastDiagnostic) return { resolved: { kind: 'rawCode', code: fill.code, port: option } }
		}

		if (option.kind === 'fragment' && fill.kind === 'fragment') {
			lastDiagnostic = fragmentCompatible(option, fill.fragment, node, inputName)
			if (!lastDiagnostic) return { resolved: { kind: 'fragment', fragment: fill.fragment, port: option } }
		}

		if (option.kind === 'fragmentCollection' && fill.kind === 'fragmentCollection') {
			lastDiagnostic = fragmentCollectionSizeCompatible(option, fill.fragments.length, node, inputName)
			if (lastDiagnostic) continue
			for (const fragment of fill.fragments) {
				lastDiagnostic = fragmentCompatible(option, fragment, node, inputName)
				if (lastDiagnostic) break
			}
			if (!lastDiagnostic) return { resolved: { kind: 'fragmentCollection', fragments: fill.fragments, port: option } }
		}
	}

	return {
		diagnostic:
			lastDiagnostic ??
			errorDiagnostic({
				stage: 'port',
				code: 'IncompatibleInputKind',
				message: `Input ${inputName} is not compatible with its port.`,
				nodeId: node.id,
				templateId: node.templateId,
				inputName,
				expected: port,
				actual: fill
			})
	}
}

interface PlannedArtifactFill {
	readonly key: string
	readonly unresolvedInput: UnresolvedTemplateInput
	readonly fill: TemplateArtifactInput
}

/** Resolve every supplied key transactionally to an exact unresolved input. */
function planArtifactFills(
	artifact: PartialTemplateArtifact,
	inputs: TemplateArtifactInputMap
): { fills: Map<string, PlannedArtifactFill>; diagnostics: SynthesisDiagnostic[] } {
	const diagnostics: SynthesisDiagnostic[] = []
	const fills = new Map<string, PlannedArtifactFill>()
	const unresolvedById = new Map(artifact.unresolvedInputs.map(input => [input.id, input]))
	const unresolvedByName = new Map<string, UnresolvedTemplateInput[]>()
	for (const unresolvedInput of artifact.unresolvedInputs) {
		const named = unresolvedByName.get(unresolvedInput.inputName)
		if (named) named.push(unresolvedInput)
		else unresolvedByName.set(unresolvedInput.inputName, [unresolvedInput])
	}

	for (const key of Object.keys(inputs)) {
		let target = unresolvedById.get(key)
		if (!target) {
			const candidates = unresolvedByName.get(key)
			if (!candidates) {
				diagnostics.push(errorDiagnostic({
					stage: 'input',
					code: 'UnknownArtifactFillKey',
					message: `Fill key ${key} does not match an unresolved artifact input.`,
					...(artifact.id ? { nodeId: artifact.id } : {}),
					templateId: artifact.source.templateId,
					path: `inputs.${key}`,
					expected: artifact.unresolvedInputs.map(input => input.id),
					actual: key,
					repairHints: [{
						kind: 'useScopedArtifactInputId',
						message: 'Use an exact ID from artifact.unresolvedInputs.'
					}]
				}))
				continue
			}
			if (candidates.length !== 1) {
				diagnostics.push(errorDiagnostic({
					stage: 'input',
					code: 'AmbiguousArtifactInputAlias',
					message: `Input-name alias ${key} matches more than one unresolved artifact input.`,
					...(artifact.id ? { nodeId: artifact.id } : {}),
					templateId: artifact.source.templateId,
					inputName: key,
					path: `inputs.${key}`,
					expected: candidates.map(candidate => candidate.id),
					actual: key,
					repairHints: [{
						kind: 'useScopedArtifactInputId',
						message: 'Use one of the exact candidate IDs.'
					}]
				}))
				continue
			}
			target = candidates[0]
		}

		if (!target) continue
		const existing = fills.get(target.id)
		if (existing) {
			diagnostics.push(errorDiagnostic({
				stage: 'input',
				code: 'ConflictingArtifactFillKeys',
				message: `Fill keys ${existing.key} and ${key} target the same unresolved artifact input.`,
				...(artifact.id ? { nodeId: artifact.id } : {}),
				templateId: artifact.source.templateId,
				inputName: target.inputName,
				path: `inputs.${key}`,
				expected: { id: target.id, oneFillKey: true },
				actual: [existing.key, key]
			}))
			continue
		}

		const fill = inputs[key]
		if (fill) fills.set(target.id, { key, unresolvedInput: target, fill })
	}

	return { fills, diagnostics }
}

/** Return fragments nested in a caller-provided fill. */
function fillArtifacts(fill: TemplateArtifactInput): TemplateArtifact[] {
	if (fill.kind === 'fragment') return [fill.fragment]
	if (fill.kind === 'fragmentCollection') return fill.fragments
	return []
}

/** Require exact manifest provenance before a persisted artifact can resume. */
function missingManifestIdentityDiagnostic(
	artifact: TemplateArtifact,
	path = 'artifact.source.templateManifestDigest'
): SynthesisDiagnostic | undefined {
	return typeof artifact.source.templateManifestDigest === 'string'
		&& /^t1_[a-f0-9]{64}$/u.test(artifact.source.templateManifestDigest)
		? undefined
		: errorDiagnostic({
			stage: 'template',
			code: 'MissingTemplateManifestIdentity',
			message: 'Persisted artifacts require an exact t1_ template manifest identity before filling or finalization.',
			...(artifact.id ? { nodeId: artifact.id } : {}),
			templateId: artifact.source.templateId,
			path,
			expected: 't1_<sha256>',
			actual: artifact.source.templateManifestDigest
		})
}

/** Require a captured catalog whenever artifact provenance crossed a process boundary. */
function artifactCatalogRequiredDiagnostic(
	artifact: TemplateArtifact,
	path = 'artifact'
): SynthesisDiagnostic {
	return errorDiagnostic({
		stage: 'template',
		code: 'ArtifactCatalogRequired',
		message: 'Serialized, cloned, or caller-constructed artifacts must be filled or finalized with a captured template catalog.',
		...(artifact.id ? { nodeId: artifact.id } : {}),
		templateId: artifact.source.templateId,
		path,
		expected: 'fillTemplateArtifactWithCatalog or finalizeTemplateArtifactWithCatalog',
		actual: 'artifact without the non-serializable in-process trust capability'
	})
}

/**
 * Transactionally fill matching unresolved inputs in a template artifact.
 *
 * Inputs may be keyed by the opaque marker ID exposed in `unresolvedInputs`, or
 * by the original input name when that name appears only once in the artifact.
 * Unknown, ambiguous, conflicting, and already-consumed keys are rejected.
 */
export function fillTemplateArtifact(
	artifact: TemplateArtifact,
	inputs: TemplateArtifactInputMap,
	options: GraphCompileOptions = {}
): TemplateArtifactResult {
	return fillTemplateArtifactInternal(artifact, inputs, options)
}

/** Catalog-aware fill options for persisted or externally supplied artifacts. */
export interface CatalogArtifactFillOptions extends GraphCompileOptions {
	/** Set only when the base artifact was produced inside the current trusted compilation session. */
	trustedBaseArtifact?: boolean
}

/**
 * Fill an artifact while binding all artifact provenance and persisted ports to
 * one captured catalog. Caller-supplied nested fragments are always security
 * screened, even when the base artifact is trusted.
 */
export function fillTemplateArtifactWithCatalog(
	artifact: TemplateArtifact,
	inputs: TemplateArtifactInputMap,
	catalog: TemplateCatalogView,
	options: CatalogArtifactFillOptions = {}
): TemplateArtifactResult {
	try {
		return fillTemplateArtifactInternal(
			artifact,
			inputs,
			options,
			captureTemplateCatalogView(catalog)
		)
	} catch (error) {
		if (error instanceof TemplateCatalogValidationError) {
			return {
				kind: 'templateArtifact',
				ok: false,
				classification: 'templatePolicyFailure',
				diagnostics: [...error.diagnostics],
				artifact
			}
		}
		throw error
	}
}

function fillTemplateArtifactInternal(
	artifact: TemplateArtifact,
	inputs: TemplateArtifactInputMap,
	options: CatalogArtifactFillOptions,
	catalog?: TemplateCatalogView
): TemplateArtifactResult {
	let baseRequiresCatalog = false
	if (catalog) {
		const trustedBaseArtifact = options.trustedBaseArtifact === true
			&& isLibraryOwnedTemplateArtifact(artifact)
		const catalogDiagnostics = validateTemplateArtifactAgainstCatalogAtPath(
			artifact,
			catalog,
			{ ...options, screenSecurity: !trustedBaseArtifact },
			'artifact'
		)
		if (catalogDiagnostics.some(diagnostic => diagnostic.severity === 'error')) {
			return {
				kind: 'templateArtifact', ok: false, classification: 'terminalFailure',
				diagnostics: catalogDiagnostics, artifact
			}
		}
		brandTemplateArtifact(artifact)
	} else {
		const integrityDiagnostics = validateTemplateArtifactIntegrity(artifact)
		if (integrityDiagnostics.some(diagnostic => diagnostic.severity === 'error')) {
			return { kind: 'templateArtifact', ok: false, classification: 'terminalFailure', diagnostics: integrityDiagnostics, artifact }
		}
		const missingManifestIdentity = missingManifestIdentityDiagnostic(artifact)
		if (missingManifestIdentity) {
			return {
				kind: 'templateArtifact', ok: false, classification: 'terminalFailure',
				diagnostics: [missingManifestIdentity], artifact
			}
		}

		const syntaxDiagnostics = validateArtifactSyntax(artifact, options)
		if (syntaxDiagnostics.some(diagnostic => diagnostic.severity === 'error')) {
			return { kind: 'templateArtifact', ok: false, classification: 'terminalFailure', diagnostics: syntaxDiagnostics, artifact }
		}

		baseRequiresCatalog = !isLibraryOwnedTemplateArtifact(artifact)
	}

	if (artifact.complete !== false) {
		const complete = completeArtifact(artifact) as CompleteTemplateArtifact
		if (Object.keys(inputs).length > 0) {
			return {
				kind: 'templateArtifact',
				ok: false,
				classification: 'terminalFailure',
				artifact: complete,
				diagnostics: [errorDiagnostic({
					stage: 'input',
					code: 'ArtifactAlreadyComplete',
					message: 'A complete template artifact cannot accept additional fills.',
					...(complete.id ? { nodeId: complete.id } : {}),
					templateId: complete.source.templateId,
					path: 'inputs',
					expected: {},
					actual: Object.keys(inputs)
				})]
			}
		}
		const diagnostics = validateArtifactSemantics(complete, options)
		if (diagnostics.some(diagnostic => diagnostic.severity === 'error')) {
			return { kind: 'templateArtifact', ok: false, classification: 'terminalFailure', artifact: complete, diagnostics }
		}
		if (baseRequiresCatalog) {
			return {
				kind: 'templateArtifact', ok: false, classification: 'terminalFailure', artifact,
				diagnostics: [artifactCatalogRequiredDiagnostic(artifact)]
			}
		}
		return { kind: 'templateArtifact', ok: true, artifact: complete, diagnostics }
	}

	const plan = planArtifactFills(artifact, inputs)
	if (plan.diagnostics.some(diagnostic => diagnostic.severity === 'error')) {
		return { kind: 'templateArtifact', ok: false, classification: 'artifactFillable', diagnostics: plan.diagnostics, artifact }
	}

	const diagnostics: SynthesisDiagnostic[] = []
	const resolvedInputs: Record<string, ResolvedGraphInput> = {}
	const remainingById = new Map<string, UnresolvedTemplateInput>()
	const filledTargetIds = new Set(plan.fills.keys())
	for (const unresolvedInput of artifact.unresolvedInputs) {
		if (!filledTargetIds.has(unresolvedInput.id)) remainingById.set(unresolvedInput.id, unresolvedInput)
	}

	for (const { unresolvedInput, fill } of plan.fills.values()) {
		for (const [childIndex, childArtifact] of fillArtifacts(fill).entries()) {
			const childPath = fill.kind === 'fragmentCollection'
				? `inputs.${unresolvedInput.id}.fragments[${childIndex}]`
				: `inputs.${unresolvedInput.id}.fragment`
			if (catalog) {
				diagnostics.push(...validateTemplateArtifactAgainstCatalogAtPath(
					childArtifact,
					catalog,
					{ ...options, screenSecurity: true },
					childPath
				))
			} else {
				const childIntegrity = validateTemplateArtifactIntegrity(childArtifact)
				diagnostics.push(...childIntegrity)
				if (!childIntegrity.some(diagnostic => diagnostic.severity === 'error')) {
					const missingChildIdentity = missingManifestIdentityDiagnostic(
						childArtifact,
						`${childPath}.source.templateManifestDigest`
					)
					if (missingChildIdentity) diagnostics.push(missingChildIdentity)
					else {
						diagnostics.push(...validateArtifactSyntax(childArtifact, options))
						if (!isLibraryOwnedTemplateArtifact(childArtifact)) {
							diagnostics.push(artifactCatalogRequiredDiagnostic(childArtifact, childPath))
						} else if (!diagnostics.some(diagnostic => diagnostic.severity === 'error')) {
							diagnostics.push(...validateArtifactSecurity(childArtifact, options, `${childPath}.code`))
						}
					}
				}
			}
		}
		if (diagnostics.some(diagnostic => diagnostic.severity === 'error')) continue

		const node: SynthesisNode = {
			id: unresolvedInput.nodeId ?? artifact.id ?? '__artifact__',
			templateId: unresolvedInput.templateId,
			inputs: {}
		}
		const { resolved, diagnostic } = resolveArtifactInput(fill, unresolvedInput.port, node, unresolvedInput.inputName)
		if (diagnostic) {
			diagnostics.push(diagnostic)
			continue
		}
		if (resolved) {
			resolvedInputs[unresolvedInput.id] = resolved
			for (const childArtifact of partialArtifactsFromResolvedInput(resolved)) {
				for (const childInput of childArtifact.unresolvedInputs) {
					const existing = remainingById.get(childInput.id)
					if (filledTargetIds.has(childInput.id) || (existing && !unresolvedInputsEquivalent(existing, childInput))) {
						diagnostics.push(errorDiagnostic({
							stage: 'input',
							code: 'ArtifactInputIdCollision',
							message: `Nested partial artifact input ID ${childInput.id} conflicts with another logical input.`,
							...(artifact.id ? { nodeId: artifact.id } : {}),
							templateId: artifact.source.templateId,
							inputName: childInput.inputName,
							path: childInput.path ?? 'unresolvedInputs',
							expected: existing ?? { idNotInFilledTargets: true },
							actual: childInput
						}))
						continue
					}
					if (!existing) remainingById.set(childInput.id, childInput)
				}
			}
		}
	}

	if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
		return { kind: 'templateArtifact', ok: false, classification: 'artifactFillable', diagnostics, artifact }
	}
	if (baseRequiresCatalog) {
		return {
			kind: 'templateArtifact', ok: false, classification: 'terminalFailure', artifact,
			diagnostics: [artifactCatalogRequiredDiagnostic(artifact)]
		}
	}

	try {
		const generationOptions = { ...options, templateMode: templateModeForArtifact(artifact) }
		const passthroughCode = new Map<string, string>()
		const serializedInputs: Record<string, ResolvedGraphInput> = {}
		for (const [id, resolved] of Object.entries(resolvedInputs)) {
			const code = partialArtifactReplacementCode(resolved)
			if (code === undefined) serializedInputs[id] = resolved
			else passthroughCode.set(id, code)
		}
		const replacements = graphInputsToReplacementMap(serializedInputs)
		const regions = discoverReplacementRegions(artifact.code, generationOptions)
		const resolvedRegions = regions.filter(region => Object.prototype.hasOwnProperty.call(replacements, region.id))
		const edits = buildReplacementEdits(
			resolvedRegions,
			replacements,
			{ ...generationOptions, allowUnusedReplacements: true },
			artifact.code
		)
		for (const region of regions) {
			const code = passthroughCode.get(region.id)
			if (code === undefined) continue
			edits.push({
				start: region.startCommentStart,
				end: region.endCommentEnd,
				text: code,
				region
			})
		}
		const mappedEdits: SourceMappedTextEdit[] = edits.map(edit => {
			const resolved = resolvedInputs[edit.region.id]
			const unresolved = plan.fills.get(edit.region.id)?.unresolvedInput
			return {
				start: edit.start,
				end: edit.end,
				text: edit.text,
				...(resolved && unresolved
					? { sourceMap: artifactFillEditSourceMap(artifact, edit.region, unresolved, resolved, edit.text) }
					: {})
			}
		})
		let mapped = applySourceMappedTextEdits(
			artifact.code,
			artifact.sourceMap ?? nodeGeneratedSourceMap(artifact.code.length, {
				...(artifact.id ? { nodeId: artifact.id } : {}),
				templateId: artifact.source.templateId
			}),
			mappedEdits
		)
		if (options.format === 'ts-morph') {
			mapped = formatSourceMappedFragment(mapped.code, mapped.sourceMap, templateModeForArtifact(artifact), {
				...(options.filePath ? { filePath: options.filePath } : {}),
				...(options.tsConfigFilePath ? { tsConfigFilePath: options.tsConfigFilePath } : {})
			})
		}
		const { code } = mapped
		const sourceMap = coverGeneratedSourceMapRoot(mapped.sourceMap, code.length, {
			...(artifact.id ? { nodeId: artifact.id } : {}),
			templateId: artifact.source.templateId
		})

		const base = {
			...(artifact.id ? { id: artifact.id } : {}),
			code,
			kind: artifact.kind,
			source: artifact.source,
			...(artifact.type ? { type: artifact.type } : {}),
			...(artifact.schema === undefined ? {} : { schema: artifact.schema }),
			...(artifact.provenance ? { provenance: artifact.provenance } : {}),
			sourceMap
		}
		const remaining = [...remainingById.values()]
		const candidate: TemplateArtifact = remaining.length === 0
			? { ...base, complete: true }
			: { ...base, complete: false, unresolvedInputs: remaining }
		const candidateDiagnostics = [
			...validateTemplateArtifactIntegrity(candidate),
			...validateArtifactSyntax(candidate, options)
		]
		if (candidateDiagnostics.some(diagnostic => diagnostic.severity === 'error')) {
			return {
				kind: 'templateArtifact',
				ok: false,
				classification: 'artifactFillable',
				artifact,
				diagnostics: [...diagnostics, ...candidateDiagnostics]
			}
		}

		if (candidate.complete === true) {
			const complete: CompleteTemplateArtifact = candidate
			diagnostics.push(...validateArtifactSemantics(complete, options))
			const classification = diagnostics.some(diagnostic => diagnostic.code === 'InvalidSemanticTarget')
				? 'terminalFailure' as const
				: 'artifactFillable' as const
			return diagnostics.some(diagnostic => diagnostic.severity === 'error')
				? { kind: 'templateArtifact', ok: false, classification, artifact: complete, diagnostics }
				: { kind: 'templateArtifact', ok: true, artifact: brandTemplateArtifact(complete), diagnostics }
		}

		return {
			kind: 'templateArtifact',
			ok: true,
			artifact: brandTemplateArtifact(candidate),
			diagnostics
		}
	} catch (error) {
		diagnostics.push(
			errorDiagnostic({
				stage: 'ast',
				code: 'GeneratedTypeScriptInvalid',
				message: error instanceof Error ? error.message : String(error),
				actual: error
			})
		)
		return { kind: 'templateArtifact', ok: false, classification: 'artifactFillable', diagnostics, artifact }
	}
}

/**
 * Fill a template artifact and require that no unresolved inputs remain.
 *
 * This is the terminal artifact API: it returns a structured diagnostic instead
 * of throwing when required inputs are still open.
 */
export function finalizeTemplateArtifact(
	artifact: TemplateArtifact,
	inputs: TemplateArtifactInputMap = {},
	options: GraphCompileOptions = {}
): TemplateArtifactResult {
	return finalizedArtifactResult(fillTemplateArtifact(artifact, inputs, options))
}

/** Catalog-bound terminal artifact fill/finalization. */
export function finalizeTemplateArtifactWithCatalog(
	artifact: TemplateArtifact,
	inputs: TemplateArtifactInputMap,
	catalog: TemplateCatalogView,
	options: CatalogArtifactFillOptions = {}
): TemplateArtifactResult {
	return finalizedArtifactResult(fillTemplateArtifactWithCatalog(artifact, inputs, catalog, options))
}

function finalizedArtifactResult(filled: TemplateArtifactResult): TemplateArtifactResult {
	if (!filled.ok) return filled
	if (filled.artifact.complete === false) {
		return {
			kind: 'templateArtifact',
			ok: false,
			classification: 'artifactFillable',
			artifact: filled.artifact,
			diagnostics: [
				...filled.diagnostics,
				errorDiagnostic({
					stage: 'input',
					code: 'UnresolvedTemplateInputs',
					message: 'Template artifact still has unresolved required inputs.',
					actual: filled.artifact.unresolvedInputs.map(input => input.id)
				})
			]
		}
	}

	return { kind: 'templateArtifact', ok: true, artifact: completeArtifact(filled.artifact), diagnostics: filled.diagnostics }
}

/** Partially compile a defined graph against an authored template catalog. */
function compileGraphPartial<const TTemplates extends readonly GraphTemplateDefinition<any, string>[]>(
	graph: DefinedPartialSynthesisGraph<any>,
	templates: TTemplates & StrictTemplateCatalog<TTemplates>,
	options?: GraphCompileOptions
): GraphPartialCompilationResult

/** Partially compile a graph against a runtime template registry. */
function compileGraphPartial(
	graph: SynthesisGraph,
	registry: TemplateCatalogView,
	options?: GraphCompileOptions
): GraphPartialCompilationResult

/** Partially compile an inline typed graph against an authored template catalog. */
function compileGraphPartial<
	const TTemplates extends readonly GraphTemplateDefinition<any, string>[],
	const TGraph extends AuthoredGraphInput
>(
	graph: StrictPartialSynthesisGraph<TTemplates, TGraph>,
	templates: TTemplates & StrictTemplateCatalog<TTemplates>,
	options?: GraphCompileOptions
): GraphPartialCompilationResult

/** Implementation for partial graph compilation. */
function compileGraphPartial(
	graph: SynthesisGraph,
	registryOrTemplates: TemplateCatalogView | readonly GraphTemplateDefinition<any, string>[],
	options: GraphCompileOptions = {}
): GraphPartialCompilationResult {
	const registry = templateRegistryFromInput(registryOrTemplates)
	const identityDiagnostics = catalogIdentityMismatchDiagnostics(options, registry)
	if (identityDiagnostics.length > 0) {
		return {
			kind: 'graphCompilation',
			mode: 'partial',
			ok: false,
			classification: 'terminalFailure',
			diagnostics: identityDiagnostics
		}
	}
	const normalized = normalizeSynthesisGraph(graph).graph
	const { diagnostics, nodesById } = validateStaticGraph(normalized, registry, { allowMissingRequiredInputs: true })
	if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
		return { kind: 'graphCompilation', mode: 'partial', ok: false, classification: 'graphRepairable', diagnostics }
	}

	let scope: string | undefined
	let scopeFailed = false
	function getCompilationScope(): string | undefined {
		if (scope) return scope
		if (scopeFailed) return undefined
		try {
			scope = createCompilationScope(
				normalized,
				options.compilationScope,
				registry.contractDigest,
				registry.manifestDigest
			)
			return scope
		} catch (error) {
			scopeFailed = true
			diagnostics.push(errorDiagnostic({
				stage: 'graph',
				code: 'CompilationScopeInvalid',
				message: error instanceof Error ? error.message : String(error),
				path: 'graph',
				actual: error instanceof Error ? { name: error.name, message: error.message } : error
			}))
			return undefined
		}
	}
	const allocatedInputIds = new Map<string, string>()
	const artifacts = new Map<string, TemplateArtifact>()
	const executing = new Set<string>()

	/** Execute one node into a complete or partial artifact. */
	function executeNode(nodeId: string): TemplateArtifact | undefined {
		const existing = artifacts.get(nodeId)
		if (existing) return existing

		const node = nodesById.get(nodeId)
		if (!node) return undefined
		const template = registry.get(node.templateId)
		if (!template) return undefined
		if (executing.has(nodeId)) return undefined
		executing.add(nodeId)

		const resolvedInputs: Record<string, ResolvedGraphInput> = {}
		const unresolvedInputs: Record<string, UnresolvedTemplateInput> = {}

		for (const [inputName, port] of Object.entries(template.inputs) as Array<[string, InputPort]>) {
			if (portIsRequired(port) && !Object.prototype.hasOwnProperty.call(node.inputs, inputName)) {
				const compilationScope = getCompilationScope()
				if (!compilationScope) continue
				const id = createUnresolvedInputId(compilationScope, node.id, inputName)
				const identity = canonicalizeJson([node.id, node.templateId, inputName])
				const existingIdentity = allocatedInputIds.get(id)
				if (existingIdentity !== undefined && existingIdentity !== identity) {
					diagnostics.push(errorDiagnostic({
						stage: 'input',
						code: 'ArtifactInputIdCollision',
						message: 'Two unresolved graph inputs produced the same opaque artifact input ID.',
						nodeId: node.id,
						templateId: node.templateId,
						inputName,
						path: `nodes.${node.id}.inputs.${inputName}`,
						expected: existingIdentity,
						actual: identity
					}))
					continue
				}
				allocatedInputIds.set(id, identity)
				unresolvedInputs[inputName] = {
					id,
					inputName,
					nodeId: node.id,
					templateId: node.templateId,
					port,
					path: `nodes.${node.id}.inputs.${inputName}`
				}
			}
		}

		for (const [inputName, rawInput] of Object.entries(node.inputs)) {
			const port = template.inputs[inputName]
			if (!port) continue
			const input = normalizeSynthesisInput(rawInput)

			let resolved: ResolvedGraphInput | undefined
			let lastDiagnostic: SynthesisDiagnostic | undefined

			for (const option of inputPortOptions(port)) {
				if (option.kind === 'fragmentCollection' && input.kind === 'fragmentCollection') {
					lastDiagnostic = fragmentCollectionSizeCompatible(option, input.items.length, node, inputName)
					if (lastDiagnostic) continue
					const fragments: TemplateArtifact[] = []
					for (const item of input.items) {
						const normalizedItem = normalizeSynthesisInput(item)
						if (normalizedItem.kind !== 'ref') continue
						const artifact = executeNode(normalizedItem.nodeId)
						if (!artifact) continue
						lastDiagnostic = fragmentCompatible(option, artifact, node, inputName)
						if (lastDiagnostic) break
						fragments.push(artifact)
					}
					if (!lastDiagnostic && fragments.length === input.items.length) {
						resolved = { kind: 'fragmentCollection', fragments, port: option }
						break
					}
				}
				if (option.kind === 'literal' && input.kind === 'literal') {
					lastDiagnostic = literalCompatible(option, input.value, node, inputName)
					if (!lastDiagnostic) {
						resolved = { kind: 'literal', value: input.value, port: option }
						break
					}
				}

				if (option.kind === 'rawCode' && input.kind === 'rawCode') {
					lastDiagnostic = rawCodeCompatible(option, input.code, node, inputName)
					if (!lastDiagnostic) {
						resolved = { kind: 'rawCode', code: input.code, port: option }
						break
					}
				}

				if (option.kind === 'fragment' && input.kind === 'ref') {
					const artifact = executeNode(input.nodeId)

					if (!artifact) continue
					lastDiagnostic = fragmentCompatible(option, artifact, node, inputName)
					if (!lastDiagnostic) {
						resolved = { kind: 'fragment', fragment: artifact, port: option }
						break
					}
				}
			}

			if (!resolved) {
				diagnostics.push(
					lastDiagnostic ??
						errorDiagnostic({
							stage: 'port',
							code: 'IncompatibleInputKind',
							message: `Input ${inputName} is not compatible with its port.`,
							nodeId: node.id,
							templateId: node.templateId,
							inputName,
							expected: port,
							actual: input
						})
				)
				continue
			}

			resolvedInputs[inputName] = resolved
		}

		if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
			executing.delete(nodeId)
			return undefined
		}

		try {
			const artifact = template.invokePartial({ nodeId: node.id, inputs: resolvedInputs, unresolvedInputs, options })
			const artifactDiagnostics = [
				...validateTemplateArtifactIntegrity(artifact),
				...validateArtifactSyntax(artifact, options)
			]
			if (artifactDiagnostics.some(diagnostic => diagnostic.severity === 'error')) {
				diagnostics.push(...artifactDiagnostics)
				executing.delete(nodeId)
				return undefined
			}
			brandTemplateArtifact(artifact)
			artifacts.set(node.id, artifact)
			executing.delete(nodeId)
			return artifact
		} catch (error) {
			diagnostics.push(
				errorDiagnostic({
					stage: 'ast',
					code: 'GeneratedTypeScriptInvalid',
					message: error instanceof Error ? error.message : String(error),
					nodeId: node.id,
					templateId: node.templateId,
					actual: error
				})
			)
			executing.delete(nodeId)
			return undefined
		}
	}

	const finalArtifact = executeNode(normalized.finalNodeId)
	if (finalArtifact) {
		diagnostics.push(...validateFinalGoal(normalized, finalArtifact))
		if (finalArtifact.complete === true) {
			diagnostics.push(...validateArtifactSemantics(finalArtifact, options))
		}
	}

	if (!finalArtifact || diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
		return {
			kind: 'graphCompilation',
			mode: 'partial',
			ok: false,
			classification: classifyGraphFailure(diagnostics),
			diagnostics,
			partialArtifacts: Object.fromEntries(artifacts)
		}
	}

	return {
		kind: 'graphCompilation',
		mode: 'partial',
		ok: true,
		finalArtifact,
		artifacts: Object.fromEntries(artifacts),
		diagnostics
	}
}

/** Strictly compile a defined graph against an authored template catalog. */
export function compileGraph<const TTemplates extends readonly GraphTemplateDefinition<any, string>[]>(
	graph: DefinedSynthesisGraph<any>,
	templates: TTemplates & StrictTemplateCatalog<TTemplates>,
	options?: GraphCompileOptions
): GraphCompilationResult

/** Strictly compile a graph against a runtime template registry. */
export function compileGraph(
	graph: SynthesisGraph,
	registry: TemplateCatalogView,
	options?: GraphCompileOptions
): GraphCompilationResult

/** Compile a graph while preserving unresolved required inputs. */
export function compileGraph(
	graph: SynthesisGraph,
	registry: TemplateCatalogView,
	options: GraphCompileOptions & { mode: 'partial' }
): GraphPartialCompilationResult

/** Compile a graph against an authored catalog while preserving unresolved required inputs. */
export function compileGraph<const TTemplates extends readonly GraphTemplateDefinition<any, string>[]>(
	graph: DefinedSynthesisGraph<any> | DefinedPartialSynthesisGraph<any>,
	templates: TTemplates & StrictTemplateCatalog<TTemplates>,
	options: GraphCompileOptions & { mode: 'partial' }
): GraphPartialCompilationResult

/** Partially compile an inline catalog-aware incomplete graph. */
export function compileGraph<
	const TTemplates extends readonly GraphTemplateDefinition<any, string>[],
	const TGraph extends AuthoredGraphInput
>(
	graph: StrictPartialSynthesisGraph<TTemplates, TGraph>,
	templates: TTemplates & StrictTemplateCatalog<TTemplates>,
	options: GraphCompileOptions & { mode: 'partial' }
): GraphPartialCompilationResult

/** Strictly compile an inline typed graph against an authored template catalog. */
export function compileGraph<
	const TTemplates extends readonly GraphTemplateDefinition<any, string>[],
	const TGraph extends AuthoredGraphInput
>(
	graph: StrictSynthesisGraph<TTemplates, TGraph>,
	templates: TTemplates & StrictTemplateCatalog<TTemplates>,
	options?: GraphCompileOptions
): GraphCompilationResult

/** Implementation for strict graph compilation. */
export function compileGraph(
	graph: SynthesisGraph,
	registryOrTemplates: TemplateCatalogView | readonly GraphTemplateDefinition<any, string>[],
	options: GraphCompileOptions & { mode?: 'strict' | 'partial' } = {}
): GraphCompilationResult | GraphPartialCompilationResult {
	const registry = templateRegistryFromInput(registryOrTemplates)
	const identityDiagnostics = catalogIdentityMismatchDiagnostics(options, registry)
	if (identityDiagnostics.length > 0) {
		return {
			kind: 'graphCompilation',
			mode: options.mode === 'partial' ? 'partial' : 'strict',
			ok: false,
			classification: 'terminalFailure',
			diagnostics: identityDiagnostics
		} as GraphCompilationResult | GraphPartialCompilationResult
	}
	if (options.mode === 'partial') {
		const { mode: _mode, ...generateOptions } = options
		return compileGraphPartial(graph, registry, generateOptions)
	}
	const normalized = normalizeSynthesisGraph(graph).graph
	const { diagnostics } = validateStaticGraph(normalized, registry)
	if (diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
		return { kind: 'graphCompilation', mode: 'strict', ok: false, classification: 'graphRepairable', diagnostics }
	}

	const { mode: _mode, ...generateOptions } = options
	const result = compileGraphPartial(normalized, registry, generateOptions)
	if (!result.ok) {
		return {
			kind: 'graphCompilation',
			mode: 'strict',
			ok: false,
			classification: result.classification,
			diagnostics: result.diagnostics
		}
	}

	if (result.finalArtifact.complete === false) {
		return {
			kind: 'graphCompilation',
			mode: 'strict',
			ok: false,
			classification: 'graphRepairable',
			diagnostics: [
				...result.diagnostics,
				errorDiagnostic({
					stage: 'input',
					code: 'UnresolvedTemplateInputs',
					message: 'Strict graph compilation produced unresolved template inputs.',
					actual: result.finalArtifact.unresolvedInputs.map(input => input.id)
				})
			]
		}
	}

	const artifacts = Object.fromEntries(
		Object.entries(result.artifacts).filter((entry): entry is [string, CompleteTemplateArtifact] => entry[1].complete === true)
	)

	return {
		kind: 'graphCompilation',
		mode: 'strict',
		ok: true,
		finalArtifact: result.finalArtifact,
		artifacts,
		diagnostics: result.diagnostics
	}
}
