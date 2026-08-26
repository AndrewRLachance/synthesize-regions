import { posix } from 'node:path'

import { Type, type Static } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import ts from 'typescript'

import { normalizeArtifactTargetPath } from './artifactSet.js'
import { inspectCapturedTypeScriptProject } from './capturedProject.js'
import { compareCodeUnits } from './deterministic.js'
import {
	ImplementationEnforcementDiagnosticSchema,
	implementationDiagnostic,
	type ImplementationEnforcementDiagnostic
} from './implementationAuthority.js'
import { UnresolvedValueSymbolSchema, type UnresolvedValueSymbol } from './implementationTargets.js'

/** One forbidden emitted-value use resolved to an unfinished implementation target. */
export const UnresolvedRuntimeValueReferenceSchema = Type.Object({
	schemaVersion: Type.Literal(1),
	symbolId: Type.String({ pattern: '^uv1_[a-f0-9]{64}$' }),
	targetId: Type.String({ pattern: '^it1_[a-f0-9]{64}$' }),
	consumerPath: Type.String({ minLength: 1 }),
	start: Type.Integer({ minimum: 0 }),
	end: Type.Integer({ minimum: 1 }),
	identifier: Type.String({ minLength: 1 }),
	artifactId: Type.Optional(Type.String({ minLength: 1 }))
}, { additionalProperties: false })

export type UnresolvedRuntimeValueReference = Static<typeof UnresolvedRuntimeValueReferenceSchema>

export const UnresolvedValueValidationResultSchema = Type.Object({
	ok: Type.Boolean(),
	references: Type.Array(UnresolvedRuntimeValueReferenceSchema),
	diagnostics: Type.Array(ImplementationEnforcementDiagnosticSchema)
}, { additionalProperties: false })

export type UnresolvedValueValidationResult = Static<typeof UnresolvedValueValidationResultSchema>

/**
 * Exact captured TypeScript configuration authority used for unresolved-value
 * checking. Paths name captured workspace blobs; they never authorize host
 * filesystem reads.
 */
export const UnresolvedValueTypeScriptAuthoritySchema = Type.Object({
	schemaVersion: Type.Literal(1),
	tsConfigFilePath: Type.String({ minLength: 1 }),
	authorizedProjectReferences: Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true })
}, { additionalProperties: false })

export type UnresolvedValueTypeScriptAuthority = Static<typeof UnresolvedValueTypeScriptAuthoritySchema>

export interface UnresolvedValueCandidateChange {
	readonly path: string
	readonly sourceText: string
	/** Paired predecessor/final ranges owned by generated artifacts. Omit to inspect the complete changed file. */
	readonly edits?: readonly {
		readonly artifactId?: string
		/** Authorized predecessor-source range replaced by this edit. */
		readonly start: number
		readonly end: number
		/** Corresponding range in sourceText after all edits are assembled. */
		readonly resultStart: number
		readonly resultEnd: number
	}[]
}

export interface ValidateUnresolvedRuntimeValueReferencesOptions {
	readonly workspaceFiles: Readonly<Record<string, string>> | ReadonlyMap<string, string>
	readonly changes: readonly UnresolvedValueCandidateChange[]
	readonly unresolvedValues: readonly UnresolvedValueSymbol[]
	/** Same-unit and already promoted targets whose values are legal to reference. */
	readonly allowedTargetIds: readonly string[]
	/** Canonical authority for the exact captured TypeScript project. */
	readonly typeScriptAuthority: UnresolvedValueTypeScriptAuthority
}

function portable(path: string): string {
	return posix.normalize(path.replace(/\\/gu, '/'))
}

function relativePath(workspaceRoot: string, fileName: string): string | undefined {
	const relative = posix.relative(workspaceRoot, portable(fileName))
	return relative === '..' || relative.startsWith('../') || posix.isAbsolute(relative) ? undefined : relative
}

function capturedFiles(
	input: Readonly<Record<string, string>> | ReadonlyMap<string, string>,
	changes: readonly UnresolvedValueCandidateChange[],
	diagnostics: ImplementationEnforcementDiagnostic[]
): Map<string, string> {
	const entries = input instanceof Map ? [...input] : Object.entries(input)
	const files = new Map<string, string>()
	for (const [authoredPath, sourceText] of entries) {
		try {
			const path = normalizeArtifactTargetPath(authoredPath)
			if (files.has(path)) diagnostics.push(implementationDiagnostic('DuplicateUnresolvedValidationPath', `Captured path ${path} is duplicated.`, { path }))
			else files.set(path, sourceText)
		} catch (error) {
			diagnostics.push(implementationDiagnostic('InvalidUnresolvedValidationPath', error instanceof Error ? error.message : String(error), { path: authoredPath }))
		}
	}
	for (const change of changes) {
		try {
			const path = normalizeArtifactTargetPath(change.path)
			if (!files.has(path)) diagnostics.push(implementationDiagnostic('UncapturedUnresolvedValidationChange', `Candidate path ${path} is absent from the captured workspace.`, { path }))
			files.set(path, change.sourceText)
		} catch (error) {
			diagnostics.push(implementationDiagnostic('InvalidUnresolvedValidationPath', error instanceof Error ? error.message : String(error), { path: change.path }))
		}
	}
	return files
}

function isDeclarationName(identifier: ts.Identifier): boolean {
	const parent = identifier.parent
	if (parent === undefined) return false
	if (ts.isShorthandPropertyAssignment(parent)) return false
	const declaration = ts.isVariableDeclaration(parent)
		|| ts.isBindingElement(parent)
		|| ts.isParameter(parent)
		|| ts.isFunctionDeclaration(parent)
		|| ts.isFunctionExpression(parent)
		|| ts.isClassDeclaration(parent)
		|| ts.isClassExpression(parent)
		|| ts.isInterfaceDeclaration(parent)
		|| ts.isTypeAliasDeclaration(parent)
		|| ts.isEnumDeclaration(parent)
		|| ts.isEnumMember(parent)
		|| ts.isModuleDeclaration(parent)
		|| ts.isMethodDeclaration(parent)
		|| ts.isMethodSignature(parent)
		|| ts.isPropertyDeclaration(parent)
		|| ts.isPropertySignature(parent)
		|| ts.isPropertyAssignment(parent)
		|| ts.isGetAccessorDeclaration(parent)
		|| ts.isSetAccessorDeclaration(parent)
		|| ts.isTypeParameterDeclaration(parent)
		|| ts.isImportClause(parent)
		|| ts.isImportSpecifier(parent)
		|| ts.isNamespaceImport(parent)
		|| ts.isImportEqualsDeclaration(parent)
		|| ts.isExportSpecifier(parent)
	return declaration && 'name' in parent && (parent as ts.NamedDeclaration).name === identifier
}

function inTypeOnlySyntax(identifier: ts.Identifier): boolean {
	for (let current: ts.Node | undefined = identifier; current !== undefined; current = current.parent) {
		if (ts.isTypeNode(current) || ts.isJSDoc(current)) return true
		if (ts.isImportDeclaration(current) || ts.isExportDeclaration(current)) return true
		if (ts.isHeritageClause(current)) {
			if (current.token === ts.SyntaxKind.ImplementsKeyword) return true
			const container = current.parent
			if (ts.isInterfaceDeclaration(container)) return true
		}
		if (ts.isStatement(current) || ts.isSourceFile(current)) break
	}
	return false
}

function isRuntimeReference(identifier: ts.Identifier): boolean {
	if (isDeclarationName(identifier) || inTypeOnlySyntax(identifier)) return false
	const parent = identifier.parent
	if (parent === undefined) return false
	if (ts.isPropertyAssignment(parent) && parent.name === identifier && !ts.isComputedPropertyName(parent.name)) return false
	if (ts.isLabeledStatement(parent) || ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) return false
	return true
}

function resolvedSymbol(checker: ts.TypeChecker, identifier: ts.Identifier): ts.Symbol | undefined {
	let symbol = checker.getSymbolAtLocation(identifier)
	if (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
		try { symbol = checker.getAliasedSymbol(symbol) } catch { return undefined }
	}
	return symbol
}

function targetForSymbol(
	symbol: ts.Symbol,
	registry: readonly UnresolvedValueSymbol[],
	workspaceRoot: string,
	changed: ReadonlyMap<string, UnresolvedValueCandidateChange>
): UnresolvedValueSymbol | undefined {
	const matches = registry.filter(target => (symbol.declarations ?? []).some(declaration => {
		const path = relativePath(workspaceRoot, declaration.getSourceFile().fileName)
		const resultStart = declaration.getStart()
		const change = path === undefined ? undefined : changed.get(path)
		let start = resultStart
		let delta = 0
		for (const edit of [...(change?.edits ?? [])].sort((left, right) => left.resultStart - right.resultStart)) {
			if (resultStart < edit.resultStart) break
			if (resultStart < edit.resultEnd) {
				start = edit.start
				delta = 0
				break
			}
			delta += (edit.resultEnd - edit.resultStart) - (edit.end - edit.start)
			start = resultStart - delta
		}
		return path === target.path && start >= target.declarationStart && start < target.declarationEnd
	}))
	return matches.length === 1 ? matches[0] : undefined
}

function owningEdit(
	change: UnresolvedValueCandidateChange,
	start: number,
	end: number
): { readonly artifactId?: string } | undefined {
	if (change.edits === undefined) return {}
	return change.edits.find(edit => start < edit.resultEnd && end > edit.resultStart)
}

function normalizeTypeScriptAuthority(
	authority: UnresolvedValueTypeScriptAuthority,
	diagnostics: ImplementationEnforcementDiagnostic[]
): UnresolvedValueTypeScriptAuthority | undefined {
	if (!Value.Check(UnresolvedValueTypeScriptAuthoritySchema, authority)) {
		diagnostics.push(implementationDiagnostic(
			'InvalidUnresolvedValueTypeScriptAuthority',
			'Unresolved-value TypeScript authority must satisfy its closed versioned contract.',
			{ path: 'typeScriptAuthority', actual: authority }
		))
		return undefined
	}
	let tsConfigFilePath: string
	const authorizedProjectReferences: string[] = []
	try {
		tsConfigFilePath = normalizeArtifactTargetPath(authority.tsConfigFilePath)
		for (const path of authority.authorizedProjectReferences) authorizedProjectReferences.push(normalizeArtifactTargetPath(path))
	} catch (error) {
		diagnostics.push(implementationDiagnostic(
			'InvalidUnresolvedValueTypeScriptAuthorityPath',
			error instanceof Error ? error.message : String(error),
			{ path: 'typeScriptAuthority' }
		))
		return undefined
	}
	const canonicalReferences = [...new Set(authorizedProjectReferences)].sort(compareCodeUnits)
	if (tsConfigFilePath !== authority.tsConfigFilePath
		|| canonicalReferences.length !== authority.authorizedProjectReferences.length
		|| canonicalReferences.some((path, index) => path !== authority.authorizedProjectReferences[index])) {
		diagnostics.push(implementationDiagnostic(
			'NonCanonicalUnresolvedValueTypeScriptAuthority',
			'TypeScript authority paths must be normalized, unique, and ordered by UTF-16 code units.',
			{
				path: 'typeScriptAuthority',
				expected: { schemaVersion: 1, tsConfigFilePath, authorizedProjectReferences: canonicalReferences },
				actual: authority
			}
		))
		return undefined
	}
	return { schemaVersion: 1, tsConfigFilePath, authorizedProjectReferences: canonicalReferences }
}

function inspectUnresolvedReferences(
	program: ts.Program,
	workspaceRoot: string,
	changed: ReadonlyMap<string, UnresolvedValueCandidateChange>,
	registry: readonly UnresolvedValueSymbol[],
	allowed: ReadonlySet<string>,
	references: UnresolvedRuntimeValueReference[],
	diagnostics: ImplementationEnforcementDiagnostic[],
	seen: Set<string>
): Set<string> {
	const checker = program.getTypeChecker()
	const projectPaths = new Set<string>()
	for (const sourceFile of program.getSourceFiles()) {
		const path = relativePath(workspaceRoot, sourceFile.fileName)
		if (path === undefined) continue
		projectPaths.add(path)
		const change = changed.get(path)
		if (change === undefined) continue
		const consumerPath = path
		const selectedChange = change
		function visit(node: ts.Node): void {
			if (ts.isIdentifier(node) && isRuntimeReference(node)) {
				const edit = owningEdit(selectedChange, node.getStart(sourceFile), node.end)
				if (edit !== undefined) {
					const symbol = resolvedSymbol(checker, node)
					const target = symbol === undefined ? undefined : targetForSymbol(symbol, registry, workspaceRoot, changed)
					if (target !== undefined && !allowed.has(target.targetId)) {
						const key = `${consumerPath}:${node.getStart(sourceFile)}:${target.symbolId}`
						if (!seen.has(key)) {
							seen.add(key)
							const reference: UnresolvedRuntimeValueReference = {
								schemaVersion: 1,
								symbolId: target.symbolId,
								targetId: target.targetId,
								consumerPath,
								start: node.getStart(sourceFile),
								end: node.end,
								identifier: node.text,
								...(edit.artifactId === undefined ? {} : { artifactId: edit.artifactId })
							}
							references.push(reference)
							diagnostics.push(implementationDiagnostic(
								'UnresolvedExternalRuntimeValueReference',
								`Generated runtime code references unfinished external target ${target.qualifiedName}.`,
								{
									path: consumerPath,
									start: reference.start,
									end: reference.end,
									targetId: target.targetId,
									symbolId: target.symbolId,
									...(reference.artifactId === undefined ? {} : { artifactId: reference.artifactId })
								}
							))
						}
					}
				}
			}
			ts.forEachChild(node, visit)
		}
		visit(sourceFile)
	}
	return projectPaths
}

/**
 * Reject generated emitted-value references to unfinished external targets.
 * Type nodes, type queries, JSDoc, type-only imports/exports, and `implements`
 * clauses are ignored even when TypeScript resolves them to the same symbol.
 */
export function validateUnresolvedRuntimeValueReferences(
	options: ValidateUnresolvedRuntimeValueReferencesOptions
): UnresolvedValueValidationResult {
	const diagnostics: ImplementationEnforcementDiagnostic[] = []
	const files = capturedFiles(options.workspaceFiles, options.changes, diagnostics)
	const typeScriptAuthority = normalizeTypeScriptAuthority(options.typeScriptAuthority, diagnostics)
	const allowed = new Set(options.allowedTargetIds)
	const changed = new Map<string, UnresolvedValueCandidateChange>()
	for (const change of options.changes) {
		try { changed.set(normalizeArtifactTargetPath(change.path), change) } catch { /* capturedFiles emitted the diagnostic */ }
	}
	const references: UnresolvedRuntimeValueReference[] = []
	const seen = new Set<string>()

	if (typeScriptAuthority !== undefined) {
		const inspected = inspectCapturedTypeScriptProject({
			files,
			tsConfigFilePath: typeScriptAuthority.tsConfigFilePath,
			authorizedProjectReferences: typeScriptAuthority.authorizedProjectReferences,
			semantic: false
		}, (program, workspaceRoot) => inspectUnresolvedReferences(
			program,
			workspaceRoot,
			changed,
			options.unresolvedValues,
			allowed,
			references,
			diagnostics,
			seen
		))

		for (const issue of inspected.result.issues) {
			if (issue.category !== 'error' || !['configuration', 'global', 'syntax'].includes(issue.kind)) continue
			diagnostics.push(implementationDiagnostic(
				'InvalidUnresolvedValueTypeScriptProject',
				`Captured TypeScript ${issue.kind} error TS${issue.code}: ${issue.message}`,
				{
					...(issue.path === undefined ? {} : { path: issue.path }),
					...(issue.start === undefined ? {} : { start: issue.start }),
					...(issue.length === undefined || issue.start === undefined ? {} : { end: issue.start + issue.length }),
					actual: issue
				}
			))
		}
		if (inspected.inspection === undefined) {
			diagnostics.push(implementationDiagnostic(
				'UnavailableUnresolvedValueTypeScriptProject',
				'Captured TypeScript authority did not produce a compiler program.',
				{ path: typeScriptAuthority.tsConfigFilePath }
			))
		} else {
			for (const path of changed.keys()) {
				if (!inspected.inspection.has(path)) diagnostics.push(implementationDiagnostic(
					'UnresolvedValueChangeOutsideTypeScriptProject',
					`Candidate path ${path} is not part of the authorized captured TypeScript project.`,
					{ path }
				))
			}
		}
	}

	references.sort((left, right) => compareCodeUnits(left.consumerPath, right.consumerPath)
		|| left.start - right.start || compareCodeUnits(left.symbolId, right.symbolId))
	return {
		ok: !diagnostics.some(diagnostic => diagnostic.severity === 'error'),
		references,
		diagnostics
	}
}
