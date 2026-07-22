import ts from 'typescript'

/** One executable, non-skipped test declaration discovered in a TypeScript source file. */
export interface ExecutableTestCase {
	readonly file: string
	readonly title: string
}

/** One top-level declaration and whether the owning module exports it. */
export interface SourceDeclaration {
	readonly name: string
	readonly exported: boolean
}

/** One named import, including the local alias used by the consumer. */
export interface NamedSourceImport {
	readonly module: string
	readonly imported: string
	readonly local: string
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
	return ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some(modifier => modifier.kind === kind) ?? false)
}

function literalText(node: ts.Expression | undefined): string | undefined {
	return node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
		? node.text
		: undefined
}

function testCallKind(expression: ts.Expression): { readonly executable: boolean } | undefined {
	if (ts.isIdentifier(expression) && (expression.text === 'it' || expression.text === 'test')) {
		return { executable: true }
	}
	if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
		const root = expression.expression.expression
		if (ts.isIdentifier(root) && (root.text === 'it' || root.text === 'test') && expression.expression.name.text === 'each') {
			return { executable: true }
		}
	}
	if (!ts.isPropertyAccessExpression(expression)) return undefined
	const root = expression.expression
	if (!ts.isIdentifier(root) || (root.text !== 'it' && root.text !== 'test')) return undefined
	if (expression.name.text === 'skip' || expression.name.text === 'todo') return { executable: false }
	if (expression.name.text === 'only' || expression.name.text === 'concurrent') return { executable: true }
	return undefined
}

/**
 * Extracts test titles from actual Vitest/Jest `it` and `test` calls. Comments,
 * helper strings, computed names, skipped tests, and todo tests do not count.
 */
export function collectExecutableTests(file: string, source: string): readonly ExecutableTestCase[] {
	const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	const tests: ExecutableTestCase[] = []
	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node)) {
			const kind = testCallKind(node.expression)
			const title = kind?.executable === true ? literalText(node.arguments[0]) : undefined
			if (title !== undefined) tests.push({ file, title })
		}
		ts.forEachChild(node, visit)
	}
	visit(sourceFile)
	return tests
}

/** Extracts named imports without treating re-declarations or text mentions as imports. */
export function collectNamedImports(file: string, source: string): readonly NamedSourceImport[] {
	const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	const imports: NamedSourceImport[] = []
	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
		const bindings = statement.importClause?.namedBindings
		if (!bindings || !ts.isNamedImports(bindings)) continue
		for (const element of bindings.elements) {
			imports.push({
				module: statement.moduleSpecifier.text,
				imported: element.propertyName?.text ?? element.name.text,
				local: element.name.text
			})
		}
	}
	return imports
}

/** Extracts top-level declarations so an owner symbol must really be published by its claimed file. */
export function collectTopLevelDeclarations(file: string, source: string): readonly SourceDeclaration[] {
	const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	const declarations: SourceDeclaration[] = []
	for (const statement of sourceFile.statements) {
		const exported = hasModifier(statement, ts.SyntaxKind.ExportKeyword)
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) declarations.push({ name: declaration.name.text, exported })
			}
			continue
		}
		if ((ts.isFunctionDeclaration(statement)
			|| ts.isClassDeclaration(statement)
			|| ts.isInterfaceDeclaration(statement)
			|| ts.isTypeAliasDeclaration(statement)
			|| ts.isEnumDeclaration(statement)) && statement.name) {
			declarations.push({ name: statement.name.text, exported })
		}
	}
	return declarations
}

/** Requires a `path#title` ledger reference to identify exactly one executable test. */
export function verifyPathTestReference(reference: string, tests: readonly ExecutableTestCase[]): string | undefined {
	const separator = reference.indexOf('#')
	if (separator <= 0 || separator === reference.length - 1) return `Invalid test reference ${reference}; expected path#exact title.`
	const file = reference.slice(0, separator)
	const title = reference.slice(separator + 1)
	const matches = tests.filter(test => test.file === file && test.title === title)
	return matches.length === 1
		? undefined
		: `Test reference ${reference} must identify exactly one executable test (found ${matches.length}).`
}

/** Requires an invariant token to occur in exactly one executable test title. */
export function verifyTokenTestReference(reference: string, tests: readonly ExecutableTestCase[]): string | undefined {
	const escaped = reference.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
	const pattern = new RegExp(`(?:^|\\[|\\s)${escaped}(?:\\]|\\s|$)`, 'u')
	const matches = tests.filter(test => pattern.test(test.title))
	return matches.length === 1
		? undefined
		: `Test token ${reference} must identify exactly one executable test (found ${matches.length}).`
}
