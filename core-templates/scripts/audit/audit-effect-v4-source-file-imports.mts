/**
 * Phase 7 — source-file import audit.
 *
 * A source-file template owns a *complete* TypeScript file: its `source` is the
 * whole artifact, not a fragment. That makes it the only place in the catalog
 * where the emitted file's own imports must line up with the symbols the file
 * itself references.
 *
 * Scope, as the task requires:
 *
 *   - Only the template's own generated/fallback content is required. A root is
 *     allowed to import a curated palette for the user body, so an unused import
 *     is reported as `palette`, never as a failure.
 *   - Symbols a user may insert dynamically are not required. Only roots that are
 *     member references of a known Effect/platform module namespace can be judged
 *     missing, because a bare identifier could legitimately be user-defined.
 *
 * Checks per source-file template:
 *   1. missing-imports       referenced module member with no binding for its root
 *   2. obsolete-imports      import from a specifier the pin does not export
 *   3. alias-conflicts       one local name bound by two different imports
 *   4. unimported-type-roots a type reference (`Foo.Bar` in type position) with no binding
 *   5. external-imports      a `@effect/*` root that is not installed here, so unverifiable
 *   6. unused-imports        imported but unreferenced — informational only, because a
 *                            source-file root deliberately exports a curated palette
 *
 * Both the Node and the Bun source roots are covered because every source-file
 * template in the catalog is enumerated, not a hand-picked subset.
 */
import ts from 'typescript'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	artifactsDir,
	classifyModuleName,
	collectTemplateArrays,
	coreTemplatesDir,
	importCoreTemplateModule,
	listCoreTemplateModules
} from './lib.mts'
import type { TemplateLike } from './lib.mts'
import { resolveEffectSpecifier } from './effect-import-resolver.mts'

interface Binding {
	local: string
	specifier: string
	imported: string
	/** `type` / `default` / named. */
	kind: string
}

/** Namespace roots that are known to come from an Effect or platform package. */
const MODULE_NAMESPACES = new Set(['effect', 'Effect', 'Layer', 'Stream', 'Schema', 'HttpApi', 'HttpApiGroup', 'HttpApiEndpoint', 'Rpc', 'RpcGroup', 'Cron', 'Duration', 'Option', 'Result', 'Exit', 'Cause', 'Chunk', 'HashMap', 'HashSet', 'Schedule', 'Socket', 'SqlClient', 'Logger', 'Tracer', 'Metric', 'Clock', 'Random', 'Config', 'CommandExecutor', 'NodeContext', 'BunContext', 'NodeRuntime', 'BunRuntime', 'BrowserRuntime', 'FileSystem', 'Path', 'Data', 'Filter', 'Ref', 'Deferred', 'Mailbox', 'PubSub', 'Queue', 'Semaphore', 'Latch', 'Fiber', 'Match', 'Predicate', 'Equal', 'Hash', 'Ordering', 'Number', 'BigDecimal', 'DateTime', 'Encoding', 'Redacted', 'Secrets', 'Serialization', 'Pretty', 'JsonSchema', 'Micro', 'Random', 'Utils'])

interface Finding {
	modelId: string
	kind: string
	detail: string
	symbol?: string
	specifier?: string
}

const findings: Finding[] = []
const roots: Array<{
	modelId: string
	module: string
	imports: Binding[]
	referenced: Array<{ root: string; member?: string; position: 'value' | 'type' }>
	parseOk: boolean
}> = []

/** Replace `marker(...)` calls with a syntactically neutral placeholder. */
function withMarkersNeutralized(source: string): string {
	return source
		.replace(/\/\*\* @TYPE ([a-zA-Z]+) id=([^\s]+) \*\*\//g, '')
		.replace(/marker\(\s*'[a-zA-Z]+'\s*,\s*'[^']+'\s*,\s*`/g, '/*fallback*/`')
		.replace(/marker\(\s*'[a-zA-Z]+'\s*,\s*'[^']+'\s*,\s*'/g, "/*fallback*/'x'")
}

/** Bindings declared by the file's own import declarations. */
function collectBindings(sourceFile: ts.SourceFile): Binding[] {
	const bindings: Binding[] = []
	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement)) continue
		const specifier = (statement.moduleSpecifier as ts.StringLiteral).text
		const clause = statement.importClause
		if (!clause) continue
		if (clause.name) {
			bindings.push({ local: clause.name.text, specifier, imported: 'default', kind: 'default' })
		}
		if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
			for (const element of clause.namedBindings.elements) {
				bindings.push({
					local: element.name.text,
					specifier,
					imported: (element.propertyName ?? element.name).text,
					kind: (element.isTypeOnly || clause.isTypeOnly) ? 'type' : 'named'
				})
			}
		} else if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
			bindings.push({
				local: clause.namedBindings.name.text,
				specifier,
				imported: '*',
				kind: 'namespace'
			})
		}
	}
	return bindings
}

/** `Foo.bar` / `Foo.Bar<T>` / `new Foo()` roots, in value and type position. */
function collectReferences(sourceFile: ts.SourceFile): Array<{ root: string; member?: string; position: 'value' | 'type' }> {
	const references: Array<{ root: string; member?: string; position: 'value' | 'type' }> = []
	const seen = new Set<string>()

	const record = (root: string, member: string | undefined, position: 'value' | 'type'): void => {
		const key = `${position}:${root}.${member ?? ''}`
		if (seen.has(key)) return
		seen.add(key)
		references.push({ root, ...(member !== undefined ? { member } : {}), position })
	}

	// A namespace root is an identifier that is the left side of a property
	// access (or a `new` callee). That is the only shape a missing module import
	// can take, so it is the only shape this audit can judge.
	const recordAccess = (node: ts.PropertyAccessExpression, inType: boolean): void => {
		let expression: ts.Expression = node.expression
		while (ts.isPropertyAccessExpression(expression)) expression = expression.expression
		if (ts.isIdentifier(expression)) {
			record(expression.text, node.name.text, inType ? 'type' : 'value')
		}
	}

	const visit = (node: ts.Node, inType = false): void => {
		if (ts.isPropertyAccessExpression(node)) {
			recordAccess(node, inType)
		} else if (ts.isQualifiedName(node) && ts.isIdentifier(node.left)) {
			record(node.left.text, node.right.text, 'type')
		} else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
			record(node.expression.text, undefined, 'value')
		}
		const nextInType = inType
			|| (node.kind === ts.SyntaxKind.TypeReference ? true : inType)
			|| ts.isTypeNode(node)
		ts.forEachChild(node, (child) => visit(child, nextInType))
	}
	visit(sourceFile)
	return references
}

/** Export aliases / declarations that legitimately define a local root. */
function collectLocalBindings(source: string): Set<string> {
	const sourceFile = ts.createSourceFile('root.ts', withMarkersNeutralized(source), ts.ScriptTarget.Latest, true)
	const locals = new Set<string>()
	for (const statement of sourceFile.statements) {
		if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) continue
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) locals.add(declaration.name.text)
			}
		} else if (ts.isFunctionDeclaration(statement) && statement.name) {
			locals.add(statement.name.text)
		} else if (ts.isClassDeclaration(statement) && statement.name) {
			locals.add(statement.name.text)
		} else if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
			locals.add(statement.name.text)
		} else if (ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)) {
			locals.add(statement.name.text)
		}
	}
	return locals
}

const seenModelIds = new Set<string>()

for (const fileName of listCoreTemplateModules()) {
	if (classifyModuleName(fileName) === 'helpers') continue
	const { exports, error } = await importCoreTemplateModule(fileName)
	if (error) continue
	const moduleName = fileName.replace(/\.ts$/, '')
	for (const { templates } of collectTemplateArrays(exports)) {
		for (const template of templates as TemplateLike[]) {
			if (template.output.kind !== 'sourceFile') continue
			if (seenModelIds.has(template.modelId)) continue
			seenModelIds.add(template.modelId)

			const neutral = withMarkersNeutralized(template.source)
			const parseDiagnostics: string[] = []
			const sourceFile = ts.createSourceFile(
				`${template.modelId}.ts`,
				neutral,
				ts.ScriptTarget.Latest,
				true,
				ts.ScriptKind.TS
			)
			for (const diagnostic of sourceFile.parseDiagnostics ?? []) {
				parseDiagnostics.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '))
			}
			if (parseDiagnostics.length > 0) {
				findings.push({
					modelId: template.modelId,
					kind: 'parse-error',
					detail: `source-file template does not parse as TypeScript: ${parseDiagnostics.join('; ')}`
				})
			}

			const imports = collectBindings(sourceFile)
			const referenced = collectReferences(sourceFile)
			const locals = collectLocalBindings(template.source)
			roots.push({ modelId: template.modelId, module: moduleName, imports, referenced, parseOk: parseDiagnostics.length === 0 })

			const boundRoots = new Set(imports.map((binding) => binding.local))

			// 2. obsolete imports — a specifier that does not resolve in the pin.
			for (const binding of imports) {
				const resolution = resolveEffectSpecifier(binding.specifier)
				// Only the pinned `effect` package can decide that a specifier is
				// gone. A `@scope/*` package that is simply absent from this
				// workspace is unverifiable, not obsolete.
				if (resolution.kind === 'effect' && resolution.status === 'missing') {
					findings.push({
						modelId: template.modelId,
						kind: 'obsolete-import',
						detail: `\`${binding.local}\` is imported from \`${binding.specifier}\`, which the pinned package does not export`,
						symbol: binding.local,
						specifier: binding.specifier
					})
				} else if (resolution.status === 'external-not-installed') {
					findings.push({
						modelId: template.modelId,
						kind: 'external-import',
						detail: `\`${binding.local}\` comes from \`${binding.specifier}\`, which is not installed in this workspace and cannot be verified here`,
						symbol: binding.local,
						specifier: binding.specifier
					})
				}
			}

			// 3. alias conflicts.
			const byLocal = new Map<string, Binding[]>()
			for (const binding of imports) {
				const list = byLocal.get(binding.local) ?? []
				list.push(binding)
				byLocal.set(binding.local, list)
			}
			for (const [local, list] of byLocal) {
				const specifiers = [...new Set(list.map((binding) => binding.specifier))]
				if (specifiers.length > 1) {
					findings.push({
						modelId: template.modelId,
						kind: 'alias-conflict',
						detail: `local name \`${local}\` is bound by ${specifiers.map((s) => `\`${s}\``).join(' and ')}`,
						symbol: local,
						specifier: specifiers.join(', ')
					})
				}
			}

			// 6. unused imports — informational palette entries.
			const referencedLocals = new Set<string>()
			for (const reference of referenced) referencedLocals.add(reference.root)
			for (const binding of imports) {
				if (!referencedLocals.has(binding.local)) {
					findings.push({
						modelId: template.modelId,
						kind: 'unused-import',
						detail: `\`${binding.local}\` is imported from \`${binding.specifier}\` but not referenced by the template's own content`,
						symbol: binding.local,
						specifier: binding.specifier
					})
				}
			}

			// 1 + 4. missing imports for referenced module namespaces.
			for (const reference of referenced) {
				if (boundRoots.has(reference.root)) continue
				if (locals.has(reference.root)) continue
				if (!MODULE_NAMESPACES.has(reference.root)) continue
				// A lowercase root cannot be an Effect namespace; it is either a
				// local value or a compiler-provided global.
				if (!/^[A-Z]/.test(reference.root)) continue
				findings.push({
					modelId: template.modelId,
					kind: reference.position === 'type' ? 'unimported-type-root' : 'missing-import',
					detail: `\`${reference.root}.${reference.member ?? ''}\` is referenced by the template's own content but \`${reference.root}\` is not imported`,
					symbol: reference.root
				})
			}
		}
	}
}

const byKind = new Map<string, Finding[]>()
for (const finding of findings) {
	const list = byKind.get(finding.kind) ?? []
	list.push(finding)
	byKind.set(finding.kind, list)
}

const report = {
	summary: {
		sourceFileTemplates: roots.length,
		parseErrors: byKind.get('parse-error')?.length ?? 0,
		missingImports: byKind.get('missing-import')?.length ?? 0,
		unimportedTypeRoots: byKind.get('unimported-type-root')?.length ?? 0,
		obsoleteImports: byKind.get('obsolete-import')?.length ?? 0,
		aliasConflicts: byKind.get('alias-conflict')?.length ?? 0,
		unusedImports: byKind.get('unused-import')?.length ?? 0,
		externalImports: byKind.get('external-import')?.length ?? 0,
		importStatements: roots.reduce((total, root) => total + new Set(root.imports.map((binding) => binding.specifier)).size, 0)
	},
	roots: roots.map((root) => ({
		modelId: root.modelId,
		module: root.module,
		parses: root.parseOk,
		imports: root.imports.map((binding) => `${binding.local} <= ${binding.specifier}`),
		referencedRoots: [...new Set(root.referenced.map((reference) => reference.root))].sort()
	})),
	findings: [...byKind.entries()].flatMap(([kind, list]) => list)
		.sort((a, b) => a.kind.localeCompare(b.kind) || a.modelId.localeCompare(b.modelId) || a.detail.localeCompare(b.detail))
}

writeFileSync(
	join(artifactsDir, 'effect-v4-source-file-import-audit.json'),
	`${JSON.stringify(report, null, '\t')}\n`
)

console.log(`source-file templates:       ${report.summary.sourceFileTemplates}`)
console.log(`import statements:           ${report.summary.importStatements}`)
console.log(`parse errors:                ${report.summary.parseErrors}`)
console.log(`missing imports:             ${report.summary.missingImports}`)
console.log(`unimported type roots:       ${report.summary.unimportedTypeRoots}`)
console.log(`obsolete imports:            ${report.summary.obsoleteImports}`)
console.log(`alias conflicts:             ${report.summary.aliasConflicts}`)
console.log(`unused palette imports:     ${report.summary.unusedImports}`)
console.log(`external imports (unverified): ${report.summary.externalImports}`)
for (const finding of report.findings) {
	if (finding.kind === 'unused-import' || finding.kind === 'external-import') continue
	console.log(`  [${finding.kind}] ${finding.modelId}: ${finding.detail}`)
}
