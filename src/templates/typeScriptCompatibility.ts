import { Node, Project, ScriptKind, SyntaxKind, ts, type Diagnostic, type SourceFile, type TypeNode } from 'ts-morph'
import { BoundedLruMap } from './deterministic.js'

/** Version of the TypeScript descriptor compatibility rules used by catalog digests. */
export const TYPESCRIPT_COMPATIBILITY_ENGINE_VERSION = 'ts2' as const

/** Stable issue codes produced while validating TypeScript type descriptors. */
export const TYPESCRIPT_TYPE_ISSUE_CODE_VALUES = [
	'InvalidTypeScriptType',
	'UnresolvedTypeScriptType',
	'ForbiddenAnyType'
] as const

export type TypeScriptTypeIssueCode = typeof TYPESCRIPT_TYPE_ISSUE_CODE_VALUES[number]

export type TypeScriptCompilerDiagnosticCategory = 'error' | 'warning' | 'suggestion' | 'message'

/** A JSON-friendly problem found in an authored TypeScript type expression. */
export interface TypeScriptTypeIssue {
	code: TypeScriptTypeIssueCode
	message: string
	path: string
	compilerCode?: number
	compilerCategory?: TypeScriptCompilerDiagnosticCategory
	line?: number
	column?: number
}

/** Structured result returned when a TypeScript type descriptor is validated. */
export type TypeScriptTypeValidationResult =
	| {
		ok: true
		typeExpression: string
	}
	| {
		ok: false
		typeExpression: string
		issues: readonly TypeScriptTypeIssue[]
	}

export const TYPESCRIPT_TYPE_COMPATIBILITY_STATUS_VALUES = [
	'compatible',
	'incompatible',
	'invalid'
] as const

export type TypeScriptTypeCompatibilityStatus = typeof TYPESCRIPT_TYPE_COMPATIBILITY_STATUS_VALUES[number]

export type TypeScriptTypeCompatibilityResult =
	| {
		status: 'compatible'
		reason: 'noExpectedType' | 'assignable'
		expected?: string
		actual?: string
	}
	| {
		status: 'incompatible'
		reason: 'missingActualType' | 'notAssignable'
		expected: string
		actual?: string
	}
	| {
		status: 'invalid'
		reason: 'invalidType'
		expected?: string
		actual?: string
		issues: readonly TypeScriptTypeIssue[]
	}

interface CachedTypeValidationSuccess {
	ok: true
	typeExpression: string
	file: SourceFile
	typeNode: TypeNode
}

interface CachedTypeValidationFailure {
	ok: false
	typeExpression: string
	issues: readonly Omit<TypeScriptTypeIssue, 'path'>[]
}

type CachedTypeValidation = CachedTypeValidationSuccess | CachedTypeValidationFailure

const compatibilityProject = new Project({
	compilerOptions: {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.ES2022,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		lib: ['lib.es2022.d.ts'],
		types: [],
		strict: true,
		exactOptionalPropertyTypes: true,
		noUncheckedIndexedAccess: true,
		noEmit: true,
		skipLibCheck: true
	},
	skipAddingFilesFromTsConfig: true
})

/** Maximum retained parsed TypeScript descriptor contracts. */
export const TYPESCRIPT_TYPE_VALIDATION_CACHE_CAPACITY = 512 as const

/** Maximum retained assignability comparisons. */
export const TYPESCRIPT_TYPE_COMPARISON_CACHE_CAPACITY = 2_048 as const

const validationCache = new BoundedLruMap<string, CachedTypeValidation>(
	TYPESCRIPT_TYPE_VALIDATION_CACHE_CAPACITY,
	(_key, value) => {
		if (value.ok) compatibilityProject.removeSourceFile(value.file)
	}
)
const comparisonCache = new BoundedLruMap<string, boolean>(TYPESCRIPT_TYPE_COMPARISON_CACHE_CAPACITY)
let sourceSequence = 0

const TYPE_ALIAS_PREFIX = 'export type __SynthesisRegionsType = '
const UNRESOLVED_DIAGNOSTIC_CODES = new Set([2304, 2307, 2503, 2694])

/**
 * Validate a self-contained TypeScript type expression against the ES2022
 * standard library. Project-local declarations are intentionally unavailable.
 */
export function validateTypeScriptType(typeExpression: string, path = '$'): TypeScriptTypeValidationResult {
	const normalized = typeExpression.trim()
	const cached = getOrCreateValidation(normalized)

	if (cached.ok) {
		return { ok: true, typeExpression: cached.typeExpression }
	}

	return {
		ok: false,
		typeExpression: cached.typeExpression,
		issues: cached.issues.map(issue => ({ ...issue, path }))
	}
}

/**
 * Compare TypeScript descriptor strings using compiler assignability.
 *
 * Compatibility is directional: the actual producer type must be assignable
 * to the expected consumer type.
 */
export function compareTypeScriptTypes(
	expected: string | undefined,
	actual: string | undefined
): TypeScriptTypeCompatibilityResult {
	if (expected === undefined) {
		return {
			status: 'compatible',
			reason: 'noExpectedType',
			...(actual === undefined ? {} : { actual: actual.trim() })
		}
	}

	const normalizedExpected = expected.trim()
	const expectedValidation = getOrCreateValidation(normalizedExpected)
	if (!expectedValidation.ok) {
		return {
			status: 'invalid',
			reason: 'invalidType',
			expected: normalizedExpected,
			...(actual === undefined ? {} : { actual: actual.trim() }),
			issues: expectedValidation.issues.map(issue => ({ ...issue, path: 'expected' }))
		}
	}

	if (actual === undefined) {
		return {
			status: 'incompatible',
			reason: 'missingActualType',
			expected: normalizedExpected
		}
	}

	const normalizedActual = actual.trim()
	const actualValidation = getOrCreateValidation(normalizedActual)
	if (!actualValidation.ok) {
		return {
			status: 'invalid',
			reason: 'invalidType',
			expected: normalizedExpected,
			actual: normalizedActual,
			issues: actualValidation.issues.map(issue => ({ ...issue, path: 'actual' }))
		}
	}

	const comparisonKey = JSON.stringify([normalizedExpected, normalizedActual])
	let assignable = comparisonCache.get(comparisonKey)
	if (assignable === undefined) {
		assignable = actualValidation.typeNode.getType().isAssignableTo(expectedValidation.typeNode.getType())
		comparisonCache.set(comparisonKey, assignable)
	}

	return assignable
		? {
			status: 'compatible',
			reason: 'assignable',
			expected: normalizedExpected,
			actual: normalizedActual
		}
		: {
			status: 'incompatible',
			reason: 'notAssignable',
			expected: normalizedExpected,
			actual: normalizedActual
		}
}

function getOrCreateValidation(typeExpression: string): CachedTypeValidation {
	const existing = validationCache.get(typeExpression)
	if (existing) return existing

	const created = createValidation(typeExpression)
	validationCache.set(typeExpression, created)
	return created
}

function createValidation(typeExpression: string): CachedTypeValidation {
	if (typeExpression.length === 0) {
		return {
			ok: false,
			typeExpression,
			issues: [{
				code: 'InvalidTypeScriptType',
				message: 'TypeScript type expressions must not be empty.'
			}]
		}
	}

	const filePath = `/__synthesize_regions_type_compatibility__/type_${sourceSequence++}.ts`
	const sourceFile = compatibilityProject.createSourceFile(
		filePath,
		`${TYPE_ALIAS_PREFIX}${typeExpression};\n`,
		{ overwrite: true, scriptKind: ScriptKind.TS }
	)

	const syntacticDiagnostics = compatibilityProject.getProgram().getSyntacticDiagnostics(sourceFile)
	if (syntacticDiagnostics.length > 0) {
		return failedFromCompilerDiagnostics(typeExpression, sourceFile, syntacticDiagnostics, 'InvalidTypeScriptType')
	}

	const statements = sourceFile.getStatements()
	const alias = statements.length === 1 && Node.isTypeAliasDeclaration(statements[0])
		? statements[0]
		: undefined
	const typeNode = alias?.getTypeNode()
	if (!typeNode || typeNode.getText() !== typeExpression) {
		return {
			ok: false,
			typeExpression,
			issues: [{
				code: 'InvalidTypeScriptType',
				message: 'Value must contain exactly one TypeScript type expression.'
			}]
		}
	}

	const semanticDiagnostics = compatibilityProject.getProgram().getSemanticDiagnostics(sourceFile)
	if (semanticDiagnostics.length > 0) {
		return failedFromCompilerDiagnostics(typeExpression, sourceFile, semanticDiagnostics)
	}

	const forbiddenAnyNode = findForbiddenAnyNode(typeNode)
	if (forbiddenAnyNode) {
		const location = expressionRelativeLocation(sourceFile, forbiddenAnyNode.getStart())
		return {
			ok: false,
			typeExpression,
			issues: [{
				code: 'ForbiddenAnyType',
				message: 'TypeScript type descriptors must not contain or resolve to any.',
				...location
			}]
		}
	}

	return { ok: true, typeExpression, file: sourceFile, typeNode }
}

function findForbiddenAnyNode(typeNode: TypeNode): Node | undefined {
	const descendants = typeNode.getDescendants()
	const explicitAny = descendants.find(node => node.getKind() === SyntaxKind.AnyKeyword)
		?? (typeNode.getKind() === SyntaxKind.AnyKeyword ? typeNode : undefined)
	if (explicitAny) return explicitAny

	const nestedTypeNodes = descendants.filter(Node.isTypeNode).reverse()
	for (const node of nestedTypeNodes) {
		if (node.getType().isAny()) return node
	}

	return typeNode.getType().isAny() ? typeNode : undefined
}

function failedFromCompilerDiagnostics(
	typeExpression: string,
	sourceFile: SourceFile,
	diagnostics: readonly Diagnostic[],
	forcedCode?: TypeScriptTypeIssueCode
): CachedTypeValidationFailure {
	return {
		ok: false,
		typeExpression,
		issues: diagnostics.map(diagnostic => {
			const compilerCode = diagnostic.getCode()
			const start = diagnostic.getStart()
			return {
				code: forcedCode ?? (UNRESOLVED_DIAGNOSTIC_CODES.has(compilerCode)
					? 'UnresolvedTypeScriptType'
					: 'InvalidTypeScriptType'),
				message: ts.flattenDiagnosticMessageText(diagnostic.compilerObject.messageText, '\n'),
				compilerCode,
				compilerCategory: diagnosticCategoryName(diagnostic.getCategory()),
				...(start === undefined ? {} : expressionRelativeLocation(sourceFile, start))
			}
		})
	}
}

function diagnosticCategoryName(category: ts.DiagnosticCategory): TypeScriptCompilerDiagnosticCategory {
	switch (category) {
		case ts.DiagnosticCategory.Warning: return 'warning'
		case ts.DiagnosticCategory.Suggestion: return 'suggestion'
		case ts.DiagnosticCategory.Message: return 'message'
		default: return 'error'
	}
}

function expressionRelativeLocation(sourceFile: SourceFile, start: number): { line: number; column: number } {
	const location = sourceFile.getLineAndColumnAtPos(start)
	return {
		line: location.line,
		column: location.line === 1
			? Math.max(1, location.column - TYPE_ALIAS_PREFIX.length)
			: location.column
	}
}
