import { createHash } from 'node:crypto'

import { Type, type Static } from '@sinclair/typebox'
import ts from 'typescript'

import type { ArtifactSetChange, ArtifactSetPlan } from './artifactSet.js'
import { canonicalizeJson } from './artifactIdentity.js'
import { compareCodeUnits } from './deterministic.js'
import {
	ImplementationEnforcementDiagnosticSchema,
	implementationDiagnostic,
	implementationEnforcementResult,
	type ImplementationEnforcementDiagnostic,
	type ImplementationEnforcementResult
} from './implementationAuthority.js'
import type {
	GraphTemplateDefinition,
	TemplateCatalogView,
	TemplateImportRequirement
} from './graphTypes.js'

/** Closed wire contract for one template-owned import requirement. */
export const TemplateImportRequirementSchema = Type.Object({
	schemaVersion: Type.Literal(1),
	moduleSpecifier: Type.String({ minLength: 1 }),
	importKind: Type.Union([
		Type.Literal('named'), Type.Literal('default'), Type.Literal('namespace'), Type.Literal('sideEffect')
	]),
	importedName: Type.Optional(Type.String({ minLength: 1 })),
	localName: Type.Optional(Type.String({ minLength: 1 })),
	typeOnly: Type.Boolean()
}, { additionalProperties: false })

/** Requirements contributed by every template reachable from one artifact graph. */
export const ArtifactTemplateImportRequirementsSchema = Type.Object({
	artifactId: Type.String({ minLength: 1 }),
	requirements: Type.Array(TemplateImportRequirementSchema)
}, { additionalProperties: false })

export interface ArtifactTemplateImportRequirements {
	readonly artifactId: string
	readonly requirements: readonly TemplateImportRequirement[]
}

/** Caller-owned import permission for one artifact and destination path. */
export const ArtifactImportAuthoritySchema = Type.Object({
	schemaVersion: Type.Literal(1),
	artifactId: Type.String({ minLength: 1 }),
	path: Type.String({ minLength: 1 }),
	allowed: Type.Array(TemplateImportRequirementSchema)
}, { additionalProperties: false })

export type ArtifactImportAuthority = Static<typeof ArtifactImportAuthoritySchema>

/** Result of collecting requirements without executing any template. */
export interface ArtifactSetImportRequirementCollectionResult extends ImplementationEnforcementResult {
	readonly requirementsByArtifact: readonly ArtifactTemplateImportRequirements[]
}

/** One insertion expressed against the already assembled candidate source. */
export const ReconciledImportEditSchema = Type.Object({
	start: Type.Integer({ minimum: 0 }),
	text: Type.String({ minLength: 1 }),
	requirements: Type.Array(TemplateImportRequirementSchema, { minItems: 1 })
}, { additionalProperties: false })

export type ReconciledImportEdit = Static<typeof ReconciledImportEditSchema>

/** Reconciled candidate bytes for one changed source file. */
export const ImportReconciledFileSchema = Type.Object({
	path: Type.String({ minLength: 1 }),
	sourceText: Type.String(),
	resultingFileHash: Type.String({ pattern: '^f1_[a-f0-9]{64}$' }),
	importEdits: Type.Array(ReconciledImportEditSchema)
}, { additionalProperties: false })

export type ImportReconciledFile = Static<typeof ImportReconciledFileSchema>

/** Pure import-reconciliation result; no filesystem writes are performed. */
export const ImportReconciliationResultSchema = Type.Object({
	ok: Type.Boolean(),
	files: Type.Array(ImportReconciledFileSchema),
	diagnostics: Type.Array(ImplementationEnforcementDiagnosticSchema)
}, { additionalProperties: false })

export type ImportReconciliationResult = Static<typeof ImportReconciliationResultSchema>

const IMPORT_KINDS = new Set<TemplateImportRequirement['importKind']>([
	'named', 'default', 'namespace', 'sideEffect'
])

function validBindingName(name: string): boolean {
	const sourceFile = ts.createSourceFile('__binding__.ts', `const ${name} = 0;`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	const statement = sourceFile.statements[0]
	return statement !== undefined
		&& ts.isVariableStatement(statement)
		&& statement.declarationList.declarations.length === 1
		&& ts.isIdentifier(statement.declarationList.declarations[0]!.name)
		&& statement.declarationList.declarations[0]!.name.text === name
		&& (sourceFile as ts.SourceFile & { readonly parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length === 0
}

function requirementDiagnostics(
	requirement: TemplateImportRequirement,
	path: string
): ImplementationEnforcementDiagnostic[] {
	const diagnostics: ImplementationEnforcementDiagnostic[] = []
	if (requirement.schemaVersion !== 1) {
		diagnostics.push(implementationDiagnostic('InvalidImportRequirement', 'Import requirement schemaVersion must be 1.', {
			path: `${path}.schemaVersion`, expected: 1, actual: requirement.schemaVersion
		}))
	}
	if (typeof requirement.moduleSpecifier !== 'string'
		|| requirement.moduleSpecifier.length === 0
		|| /[\0\r\n]/u.test(requirement.moduleSpecifier)) {
		diagnostics.push(implementationDiagnostic('InvalidImportModuleSpecifier', 'Import module specifiers must be non-empty single-line strings.', {
			path: `${path}.moduleSpecifier`, actual: requirement.moduleSpecifier
		}))
	}
	if (!IMPORT_KINDS.has(requirement.importKind)) {
		diagnostics.push(implementationDiagnostic('InvalidImportKind', 'Import requirement kind is unsupported.', {
			path: `${path}.importKind`, actual: requirement.importKind
		}))
		return diagnostics
	}
	if (requirement.importKind === 'sideEffect') {
		if (requirement.importedName !== undefined || requirement.localName !== undefined || requirement.typeOnly) {
			diagnostics.push(implementationDiagnostic('InvalidSideEffectImportRequirement', 'Side-effect imports cannot name bindings or be type-only.', {
				path, actual: requirement
			}))
		}
		return diagnostics
	}
	if (requirement.importKind === 'named') {
		if (requirement.importedName === undefined || !validBindingName(requirement.importedName)) {
			diagnostics.push(implementationDiagnostic('InvalidNamedImportRequirement', 'Named imports require a valid importedName.', {
				path: `${path}.importedName`, actual: requirement.importedName
			}))
		}
	} else if (requirement.importedName !== undefined) {
		diagnostics.push(implementationDiagnostic('UnexpectedImportedName', 'Only named imports may declare importedName.', {
			path: `${path}.importedName`, actual: requirement.importedName
		}))
	}
	const localName = effectiveLocalName(requirement)
	if (localName === undefined || !validBindingName(localName)) {
		diagnostics.push(implementationDiagnostic('InvalidImportLocalName', `${requirement.importKind} imports require a valid local binding name.`, {
			path: `${path}.localName`, actual: requirement.localName
		}))
	}
	return diagnostics
}

/** Throw when declarative template import metadata is malformed or ambiguous. */
export function assertTemplateImportRequirements(
	requirements: readonly TemplateImportRequirement[]
): void {
	if (!Array.isArray(requirements)) throw new TypeError('template.importRequirements must be an array.')
	const diagnostics = requirements.flatMap((requirement, index) =>
		requirement === null || typeof requirement !== 'object'
			? [implementationDiagnostic('InvalidImportRequirement', 'Import requirements must be objects.', {
				path: `template.importRequirements[${index}]`, actual: requirement
			})]
			: requirementDiagnostics(requirement, `template.importRequirements[${index}]`))
	const keys = new Set<string>()
	for (const [index, requirement] of requirements.entries()) {
		if (requirement === null || typeof requirement !== 'object') continue
		const key = requirementKey(requirement)
		if (keys.has(key)) diagnostics.push(implementationDiagnostic(
			'DuplicateImportRequirement', 'Template import requirements must be unique.',
			{ path: `template.importRequirements[${index}]`, actual: requirement }
		))
		keys.add(key)
	}
	if (diagnostics[0]) throw new TypeError(`${diagnostics[0].code}: ${diagnostics[0].message}`)
}

function requirementKey(requirement: TemplateImportRequirement): string {
	return canonicalizeJson([
		requirement.moduleSpecifier,
		requirement.importKind,
		requirement.importedName ?? null,
		effectiveLocalName(requirement) ?? null,
		requirement.typeOnly
	])
}

function effectiveLocalName(requirement: TemplateImportRequirement): string | undefined {
	return requirement.localName ?? (requirement.importKind === 'named' ? requirement.importedName : undefined)
}

function compareRequirements(left: TemplateImportRequirement, right: TemplateImportRequirement): number {
	return compareCodeUnits(requirementKey(left), requirementKey(right))
}

function catalogTemplate(
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[],
	templateId: string
): GraphTemplateDefinition<any, string, any> | undefined {
	return Array.isArray(catalog)
		? catalog.find(template => template.modelId === templateId)
		: (catalog as TemplateCatalogView).get(templateId)
}

/** Collect, deduplicate, and canonically order import requirements per graph. */
export function collectArtifactSetImportRequirements(
	plan: ArtifactSetPlan,
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string, any>[]
): ArtifactSetImportRequirementCollectionResult {
	const diagnostics: ImplementationEnforcementDiagnostic[] = []
	const requirementsByArtifact = plan.artifacts.map((artifact, artifactIndex) => {
		const requirements = new Map<string, TemplateImportRequirement>()
		for (const [nodeIndex, node] of artifact.graph.nodes.entries()) {
			const template = catalogTemplate(catalog, node.templateId)
			if (template === undefined) {
				diagnostics.push(implementationDiagnostic('UnknownImportRequirementTemplate', `Template ${node.templateId} is absent from the captured catalog.`, {
					artifactId: artifact.id, templateId: node.templateId,
					path: `artifacts[${artifactIndex}].graph.nodes[${nodeIndex}].templateId`
				}))
				continue
			}
			for (const [requirementIndex, requirement] of (template.importRequirements ?? []).entries()) {
				diagnostics.push(...requirementDiagnostics(
					requirement,
					`artifacts[${artifactIndex}].graph.nodes[${nodeIndex}].importRequirements[${requirementIndex}]`
				).map(diagnostic => ({ ...diagnostic, artifactId: artifact.id, templateId: node.templateId })))
				requirements.set(requirementKey(requirement), requirement)
			}
		}
		return {
			artifactId: artifact.id,
			requirements: [...requirements.values()].sort(compareRequirements)
		}
	})
	const result = implementationEnforcementResult(diagnostics)
	return { ...result, requirementsByArtifact }
}

/** Validate that every template requirement is covered by exact caller authority. */
export function validateTemplateImportRequirements(
	requirementsByArtifact: readonly ArtifactTemplateImportRequirements[],
	authority: readonly ArtifactImportAuthority[]
): ImplementationEnforcementResult {
	const diagnostics: ImplementationEnforcementDiagnostic[] = []
	const authorities = new Map<string, ArtifactImportAuthority>()
	for (const [index, item] of authority.entries()) {
		if (authorities.has(item.artifactId)) diagnostics.push(implementationDiagnostic(
			'DuplicateArtifactImportAuthority', `Import authority for artifact ${item.artifactId} is duplicated.`,
			{ artifactId: item.artifactId, path: `authority[${index}]` }
		))
		authorities.set(item.artifactId, item)
		for (const [allowedIndex, requirement] of item.allowed.entries()) {
			diagnostics.push(...requirementDiagnostics(requirement, `authority[${index}].allowed[${allowedIndex}]`)
				.map(diagnostic => ({ ...diagnostic, artifactId: item.artifactId })))
		}
	}
	for (const [index, item] of requirementsByArtifact.entries()) {
		const granted = authorities.get(item.artifactId)
		if (granted === undefined && item.requirements.length > 0) {
			diagnostics.push(implementationDiagnostic('MissingArtifactImportAuthority', `Artifact ${item.artifactId} requires imports but has no import authority.`, {
				artifactId: item.artifactId, path: `requirementsByArtifact[${index}]`
			}))
			continue
		}
		const allowedKeys = new Set((granted?.allowed ?? []).map(requirementKey))
		for (const requirement of item.requirements) {
			if (!allowedKeys.has(requirementKey(requirement))) diagnostics.push(implementationDiagnostic(
				'UnauthorizedTemplateImport', `Artifact ${item.artifactId} is not authorized to add the required import from ${requirement.moduleSpecifier}.`,
				{ artifactId: item.artifactId, ...(granted?.path === undefined ? {} : { path: granted.path }), expected: requirement }
			))
		}
	}
	return implementationEnforcementResult(diagnostics)
}

interface ExistingImports {
	readonly requirements: Set<string>
	readonly localBindings: Map<string, string>
	readonly insertionPosition: number
}

function bindingNames(name: ts.BindingName): string[] {
	if (ts.isIdentifier(name)) return [name.text]
	return name.elements.flatMap(element => ts.isOmittedExpression(element) ? [] : bindingNames(element.name))
}

function importedRequirements(sourceText: string): ExistingImports {
	const sourceFile = ts.createSourceFile('__candidate__.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	const requirements = new Set<string>()
	const localBindings = new Map<string, string>()
	let lastImportEnd = -1
	let prologueEnd = sourceFile.getStart(sourceFile)
	for (const statement of sourceFile.statements) {
		if (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && lastImportEnd < 0) {
			prologueEnd = statement.end
			continue
		}
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
		lastImportEnd = Math.max(lastImportEnd, statement.end)
		const moduleSpecifier = statement.moduleSpecifier.text
		const clause = statement.importClause
		if (clause === undefined) {
			requirements.add(requirementKey({ schemaVersion: 1, moduleSpecifier, importKind: 'sideEffect', typeOnly: false }))
			continue
		}
		if (clause.name !== undefined) {
			const requirement: TemplateImportRequirement = {
				schemaVersion: 1, moduleSpecifier, importKind: 'default', localName: clause.name.text,
				typeOnly: clause.isTypeOnly
			}
			requirements.add(requirementKey(requirement))
			localBindings.set(clause.name.text, requirementKey(requirement))
		}
		const bindings = clause.namedBindings
		if (bindings === undefined) continue
		if (ts.isNamespaceImport(bindings)) {
			const requirement: TemplateImportRequirement = {
				schemaVersion: 1, moduleSpecifier, importKind: 'namespace', localName: bindings.name.text,
				typeOnly: clause.isTypeOnly
			}
			requirements.add(requirementKey(requirement))
			localBindings.set(bindings.name.text, requirementKey(requirement))
			continue
		}
		for (const element of bindings.elements) {
			const requirement: TemplateImportRequirement = {
				schemaVersion: 1,
				moduleSpecifier,
				importKind: 'named',
				importedName: (element.propertyName ?? element.name).text,
				localName: element.name.text,
				typeOnly: clause.isTypeOnly || element.isTypeOnly
			}
			requirements.add(requirementKey(requirement))
			localBindings.set(element.name.text, requirementKey(requirement))
		}
	}
	for (const statement of sourceFile.statements) {
		if (ts.isImportDeclaration(statement)) continue
		if (ts.isImportEqualsDeclaration(statement)) {
			localBindings.set(statement.name.text, `local:${statement.kind}`)
			continue
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				for (const name of bindingNames(declaration.name)) localBindings.set(name, `local:${declaration.kind}`)
			}
			continue
		}
		if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)
			|| ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)
			|| ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)) {
			if (statement.name !== undefined && ts.isIdentifier(statement.name)) {
				localBindings.set(statement.name.text, `local:${statement.kind}`)
			}
		}
	}
	return { requirements, localBindings, insertionPosition: lastImportEnd >= 0 ? lastImportEnd : prologueEnd }
}

function renderImport(requirement: TemplateImportRequirement): string {
	const quoted = JSON.stringify(requirement.moduleSpecifier)
	if (requirement.importKind === 'sideEffect') return `import ${quoted};`
	const type = requirement.typeOnly ? ' type' : ''
	const localName = effectiveLocalName(requirement)!
	if (requirement.importKind === 'default') return `import${type} ${localName} from ${quoted};`
	if (requirement.importKind === 'namespace') return `import${type} * as ${localName} from ${quoted};`
	const binding = requirement.importedName === localName
		? requirement.importedName!
		: `${requirement.importedName!} as ${localName}`
	return `import${type} { ${binding} } from ${quoted};`
}

function artifactSetFileHash(sourceText: string): string {
	const payload = canonicalizeJson(['artifact-set-file', 1, sourceText])
	return `f1_${createHash('sha256').update(payload, 'utf8').digest('hex')}`
}

/**
 * Reconcile already assembled candidate bytes with authorized template imports.
 *
 * The function returns new in-memory file bytes and explicit insertion edits;
 * it never writes to the workspace and never removes or rewrites imports.
 */
export function reconcileArtifactSetImports(
	changes: readonly ArtifactSetChange[],
	requirementsByArtifact: readonly ArtifactTemplateImportRequirements[],
	authority: readonly ArtifactImportAuthority[]
): ImportReconciliationResult {
	const diagnostics: ImplementationEnforcementDiagnostic[] = [
		...validateTemplateImportRequirements(requirementsByArtifact, authority).diagnostics
	]
	const requirementMap = new Map(requirementsByArtifact.map(item => [item.artifactId, item.requirements]))
	const authorityMap = new Map(authority.map(item => [item.artifactId, item]))
	const files: ImportReconciledFile[] = []

	for (const change of changes) {
		const relevantArtifactIds = change.edits.map(edit => edit.artifactId)
		const requested = new Map<string, TemplateImportRequirement>()
		for (const artifactId of relevantArtifactIds) {
			const granted = authorityMap.get(artifactId)
			if (granted !== undefined && granted.path !== change.path) {
				diagnostics.push(implementationDiagnostic('ImportAuthorityPathMismatch', `Import authority for ${artifactId} targets ${granted.path}, not ${change.path}.`, {
					artifactId, path: change.path, expected: granted.path, actual: change.path
				}))
			}
			for (const requirement of requirementMap.get(artifactId) ?? []) requested.set(requirementKey(requirement), requirement)
		}

		const existing = importedRequirements(change.sourceText)
		const missing = [...requested.values()]
			.filter(requirement => !existing.requirements.has(requirementKey(requirement)))
			.sort(compareRequirements)
		let hasLocalConflict = false
		for (const requirement of missing) {
			const localName = effectiveLocalName(requirement)
			if (localName === undefined) continue
			const existingKey = existing.localBindings.get(localName)
			if (existingKey !== undefined && existingKey !== requirementKey(requirement)) {
				hasLocalConflict = true
				diagnostics.push(implementationDiagnostic('ImportLocalNameConflict', `Required import local name ${localName} is already bound to a different import.`, {
					path: change.path, expected: requirement, actual: existingKey
				}))
			}
		}
		if (hasLocalConflict) {
			files.push({ path: change.path, sourceText: change.sourceText, resultingFileHash: artifactSetFileHash(change.sourceText), importEdits: [] })
			continue
		}

		if (missing.length === 0) {
			files.push({ path: change.path, sourceText: change.sourceText, resultingFileHash: artifactSetFileHash(change.sourceText), importEdits: [] })
			continue
		}
		const before = change.sourceText.slice(0, existing.insertionPosition)
		const after = change.sourceText.slice(existing.insertionPosition)
		const leadingNewline = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
		const trailingNewline = after.length > 0 && !after.startsWith('\n') ? '\n' : ''
		const text = `${leadingNewline}${missing.map(renderImport).join('\n')}${trailingNewline}`
		const sourceText = `${before}${text}${after}`
		files.push({
			path: change.path,
			sourceText,
			resultingFileHash: artifactSetFileHash(sourceText),
			importEdits: [{ start: existing.insertionPosition, text, requirements: missing }]
		})
	}

	return {
		ok: !diagnostics.some(diagnostic => diagnostic.severity === 'error'),
		files,
		diagnostics
	}
}
