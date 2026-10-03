/**
 * Phase 10 — API verification against the pinned `effect` package.
 *
 * Structural validation proves a template's types are self-contained TypeScript.
 * It says nothing about whether the runtime API it *calls* still exists. This
 * audit answers that mechanically: every `Namespace.member` reference in every
 * template source is resolved against the exported declarations of the pinned
 * package on disk.
 *
 * Resolution rules, chosen so the audit never guesses:
 *
 *   - A namespace root is resolved only when exactly one module of the pinned
 *     package exports that name. `Effect` is exported by `effect/Effect` alone,
 *     `Schema` by `effect/Schema` alone, and so on, so the mapping is exact
 *     rather than heuristic.
 *   - When several modules export the root, the member counts as present if any
 *     of them declares it; otherwise it is reported as ambiguous-but-missing so a
 *     human can look.
 *   - Names that no pinned module exports are not judged. `NodeRuntime`,
 *     `MyService` and user-supplied identifiers legitimately have no `effect`
 *     module; they are counted separately as `external-or-user-namespaces`.
 *   - Namespaces that would come from an uninstalled `@effect/*` package are
 *     counted separately as `needs-semantic-compile` instead of being failed.
 *
 * A finding here is a fact about the pin, not a guess: the member is genuinely
 * absent from every module that exports the namespace.
 */
import ts from 'typescript'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
	artifactsDir,
	classifyModuleName,
	collectTemplateArrays,
	coreTemplatesDir,
	importCoreTemplateModule,
	listCoreTemplateModules
} from './lib.mts'
import type { TemplateLike } from './lib.mts'
import { effectDir, resolveEffectSpecifier } from './effect-import-resolver.mts'

const distDir = join(effectDir, 'dist')

/** `effect/Effect` -> `dist/Effect.d.ts` relative module key. */
function moduleKey(filePath: string): string {
	return relative(distDir, filePath).replace(/\.d\.ts$/, '').split('\\').join('/')
}

function listDeclarationFiles(directory: string): string[] {
	const found: string[] = []
	for (const entry of readdirSync(directory)) {
		const absolute = join(directory, entry)
		if (statSync(absolute).isDirectory()) found.push(...listDeclarationFiles(absolute))
		else if (absolute.endsWith('.d.ts')) found.push(absolute)
	}
	return found.sort()
}

/** Exported names per pinned module, plus `Namespace.member` for namespaces. */
const moduleExports = new Map<string, Set<string>>()
const namespacedExports = new Map<string, Set<string>>()

const DECLARATION_KINDS = new Set([
	ts.SyntaxKind.VariableStatement,
	ts.SyntaxKind.FunctionDeclaration,
	ts.SyntaxKind.ClassDeclaration,
	ts.SyntaxKind.InterfaceDeclaration,
	ts.SyntaxKind.TypeAliasDeclaration,
	ts.SyntaxKind.EnumDeclaration,
	ts.SyntaxKind.ModuleDeclaration
])

function hasExportModifier(node: ts.Node): boolean {
	return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
}

/**
 * Names a declaration list exports.
 *
 * Parsed with the TypeScript AST because a `.d.ts` re-export list spans lines and
 * interleaves JSDoc: a textual `export { ... }` match picks up every word of the
 * surrounding comment as if it were an export, which is how `Effect` ended up
 * "exported" by `Deferred`.
 */
function exportedNamesOf(node: ts.Node & { statements?: ts.NodeArray<ts.Statement> | ts.NodeArray<ts.ModuleBody> }): string[] {
	const names: string[] = []
	for (const statement of node.statements ?? []) {
		if (ts.isExportDeclaration(statement)) {
			if (!statement.exportClause) continue
			// `export * as ChildProcess from './ChildProcess.ts'` exports a namespace.
			if (ts.isNamespaceExport(statement.exportClause)) {
				names.push(statement.exportClause.name.text)
				continue
			}
			if (!ts.isNamedExports(statement.exportClause)) continue
			for (const element of statement.exportClause.elements) {
				names.push(element.name.text)
			}
			continue
		}
		if (!hasExportModifier(statement)) continue
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text)
			}
			continue
		}
		if (DECLARATION_KINDS.has(statement.kind)) {
			const named = statement as ts.DeclarationStatement
			if (named.name && ts.isIdentifier(named.name)) names.push(named.name.text)
		}
	}
	return names
}

const declarationSources = new Map<string, ts.SourceFile>()
const starReexports = new Map<string, string[]>()

for (const filePath of listDeclarationFiles(distDir)) {
	const key = moduleKey(filePath)
	const source = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true)
	declarationSources.set(key, source)
	const stars: string[] = []
	for (const statement of source.statements) {
		if (!ts.isExportDeclaration(statement) || statement.exportClause) continue
		const target = statement.moduleSpecifier
		if (!target || !ts.isStringLiteral(target)) continue
		// `export * from './ChildProcess.js'` names the sibling declaration file.
		const specifier = target.text
		const sibling = specifier.startsWith('./')
			? `${key.split('/').slice(0, -1).concat(specifier.slice(2).replace(/\.(js|ts)$/, '')).join('/')}`
			: specifier.replace(/\.(js|ts)$/, '')
		stars.push(sibling)
	}
	starReexports.set(key, stars)
}

/** Own exports of a module, excluding `export *` targets. */
const ownExports = new Map<string, Set<string>>()
/** `export * as X from './Y'` bindings: barrel -> { namespace, target }. */
const namespaceReexports = new Map<string, Array<{ namespace: string; target: string }>>()

for (const [key, source] of declarationSources) {
	const names = new Set(exportedNamesOf(source))
	ownExports.set(key, names)
	const flat = new Set<string>()
	for (const statement of source.statements) {
		if (!ts.isModuleDeclaration(statement) || !statement.body || !ts.isModuleBlock(statement.body)) continue
		if (!statement.name || !ts.isIdentifier(statement.name)) continue
		for (const member of exportedNamesOf(statement.body)) flat.add(`${statement.name.text}.${member}`)
	}
	if (flat.size > 0) namespacedExports.set(key, flat)

	const bindings: Array<{ namespace: string; target: string }> = []
	for (const statement of source.statements) {
		if (!ts.isExportDeclaration(statement)) continue
		if (!statement.exportClause || !ts.isNamespaceExport(statement.exportClause)) continue
		const target = statement.moduleSpecifier
		if (!target || !ts.isStringLiteral(target)) continue
		const specifier = target.text
		const sibling = specifier.startsWith('./')
			? `${key.split('/').slice(0, -1).concat(specifier.slice(2).replace(/\.(js|ts)$/, '')).join('/')}`
			: specifier.replace(/\.(js|ts)$/, '')
		bindings.push({ namespace: statement.exportClause.name.text, target: sibling })
	}
	namespaceReexports.set(key, bindings)
}

/**
 * Transitive exports of a module.
 *
 * A template imports `{ ChildProcess }` from `effect/unstable/process`, whose
 * barrel only says `export * from './ChildProcess.js'`. Without following the
 * star re-export the barrel looks empty and every `ChildProcess.*` reference
 * would be reported as an unknown namespace.
 */
function resolveExports(key: string, seen = new Set<string>()): Set<string> {
	const names = new Set(ownExports.get(key) ?? [])
	if (seen.has(key)) return names
	seen.add(key)
	for (const target of starReexports.get(key) ?? []) {
		for (const name of resolveExports(target, seen)) names.add(name)
	}
	return names
}

for (const key of declarationSources.keys()) moduleExports.set(key, resolveExports(key))

// A barrel that says `export * as ChildProcess from './ChildProcess.ts'` exposes
// `ChildProcess` as a namespace, so `ChildProcess.make` must be judged against
// the target module's exports rather than the barrel's own (empty) export list.
for (const [key, bindings] of namespaceReexports) {
	for (const binding of bindings) {
		const members = resolveExports(binding.target)
		const flat = namespacedExports.get(key) ?? new Set<string>()
		for (const member of members) flat.add(`${binding.namespace}.${member}`)
		namespacedExports.set(key, flat)
	}
}

/**
 * Members every Effect data type carries structurally.
 *
 * `.pipe` is not a module export: it comes from the `Pipeable` interface the
 * pinned package mixes into `Effect`, `Stream`, `Layer`, `Schedule`, ... Judging
 * it against a module's export list would report a correct template as broken.
 */
const structurallyProvidedMembers = new Set<string>()
{
	const pipeablePath = join(distDir, 'Pipeable.d.ts')
	const pipeable = ts.createSourceFile(pipeablePath, readFileSync(pipeablePath, 'utf8'), ts.ScriptTarget.Latest, true)
	for (const statement of pipeable.statements) {
		if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== 'Pipeable') continue
		for (const member of statement.members) {
			if (ts.isPropertySignature(member) || ts.isMethodSignature(member)) {
				if (member.name && ts.isIdentifier(member.name)) structurallyProvidedMembers.add(member.name.text)
			}
		}
	}
}

/** exported name -> pinned modules that export it. */
/**
 * JavaScript globals and built-ins.
 *
 * `Array.from`, `JSON.stringify`, `Symbol.for` and `Math.random` are language
 * surface, not Effect API, so they are never judged against the pin.
 */
const languageBuiltins = new Set([
	'Array', 'Boolean', 'Date', 'Error', 'JSON', 'Map', 'Math', 'Number', 'Object',
	'Promise', 'Proxy', 'Reflect', 'RegExp', 'Set', 'String', 'Symbol', 'TypeError',
	'WeakMap', 'WeakSet', 'TextEncoder', 'TextDecoder', 'URL', 'URLSearchParams',
	'AbortController', 'AbortSignal', 'Uint8Array', 'ArrayBuffer', 'Int32Array',
	'BigInt', 'Function', 'Buffer', 'process', 'console', 'globalThis'
])

const nameIndex = new Map<string, string[]>()
for (const [key, names] of moduleExports) {
	for (const name of names) {
		const modules = nameIndex.get(name) ?? []
		modules.push(key)
		nameIndex.set(name, modules)
	}
}

interface Reference {
	root: string
	member: string
	position: 'value' | 'type'
}

/**
 * Marker spans are consumer-supplied fallbacks, not Effect API.
 *
 * `marker('expression', 'entity', 'Counter')` materializes to an
 * `AT-TYPE expression id=entity` open tag, the fallback `Counter`, then an
 * `AT-END` close tag. A template that names its consumer-supplied entity
 * `Counter` therefore produces a `Counter.annotateRpcs` property access that is
 * not a reference to `effect/Metric`'s `Counter`. The whole span is neutralized:
 * the fallback text is dropped and only the `pipe` position is kept, so
 * `.annotateRpcs` no longer has an identifier root.
 */
function withMarkersNeutralized(source: string): string {
	return source
		.replace(/\/\*\* @TYPE [^*]+\*\*\/[\s\S]*?\/\*\* @END \*\*\//g, '/*fallback*/')
		.replace(/marker\(\s*'[a-zA-Z]+'\s*,\s*'[^']+'\s*,\s*`/g, '/*fallback*/`')
		.replace(/marker\(\s*'[a-zA-Z]+'\s*,\s*'[^']+'\s*,\s*'/g, "/*fallback*/'x'")
}

/**
 * Namespace references written *inside* a marker fallback.
 *
 * A fallback is an example of the expression the consumer will supply, so
 * `Counter.annotateRpcs` in `marker('expression', 'entity', 'Counter')` is not
 * a template defect: the consumer's own entity supplies the method. But a
 * fallback that names a real Effect namespace — `Socket.Socket.of({})` — is a
 * wrong *example*, and worth surfacing separately from the template body.
 */
function collectFallbackReferences(source: string): Reference[] {
	const references: Reference[] = []
	const seen = new Set<string>()
	for (const match of source.matchAll(/\/\*\* @TYPE [^*]+\*\*\/([\s\S]*?)\/\*\* @END \*\*\//g)) {
		for (const reference of collectReferences(match[1])) {
			const key = `${reference.position}:${reference.root}.${reference.member}`
			if (seen.has(key)) continue
			seen.add(key)
			references.push(reference)
		}
	}
	return references
}

/**
 * Namespaces imported from an uninstalled `@effect/*` package.
 *
 * `import { Resource } from "@effect/opentelemetry"` supplies `Resource` from a
 * package that is not on disk, so `Resource.layer` cannot be judged against
 * `effect/Resource`. These are reported as `needs-semantic-compile` rather than
 * as members missing from the pin.
 */
function externalImports(source: string): Set<string> {
	const names = new Set<string>()
	for (const match of source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["'](@effect\/[^"']+)["']/g)) {
		for (const part of match[1].split(',')) {
			const name = part.trim().replace(/^type\s+/, '')
			if (!name) continue
			const as = name.split(/\s+as\s+/)
			names.add((as[1] ?? as[0]).trim())
		}
	}
	for (const match of source.matchAll(/import\s+(?:type\s+)?\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+["'](@effect\/[^"']+)["']/g)) {
		names.add(match[1])
	}
	return names
}

function collectReferences(source: string): Reference[] {
	const sourceFile = ts.createSourceFile('template.ts', withMarkersNeutralized(source), ts.ScriptTarget.Latest, true)
	const references: Reference[] = []
	const seen = new Set<string>()
	const visit = (node: ts.Node, inType = false): void => {
		const typePosition = inType || ts.isTypeNode(node)
		if (ts.isPropertyAccessExpression(node)) {
			let expression: ts.Expression = node.expression
			while (ts.isPropertyAccessExpression(expression)) expression = expression.expression
			if (ts.isIdentifier(expression)) {
				const key = `${typePosition ? 'type' : 'value'}:${expression.text}.${node.name.text}`
				if (!seen.has(key)) {
					seen.add(key)
					references.push({ root: expression.text, member: node.name.text, position: typePosition ? 'type' : 'value' })
				}
			}
		} else if (ts.isQualifiedName(node) && ts.isIdentifier(node.left)) {
			const key = `type:${node.left.text}.${node.right.text}`
			if (!seen.has(key)) {
				seen.add(key)
				references.push({ root: node.left.text, member: node.right.text, position: 'type' })
			}
		}
		ts.forEachChild(node, (child) => visit(child, typePosition))
	}
	visit(sourceFile)
	return references
}

/**
 * Identifiers the template itself binds.
 *
 * `const log = ...; log.write(...)` is not a namespace reference, and treating it
 * as one produced findings like `log.write` "missing from the pin".
 */
function localBindings(source: string): Set<string> {
	const sourceFile = ts.createSourceFile('template.ts', withMarkersNeutralized(source), ts.ScriptTarget.Latest, true)
	const locals = new Set<string>()
	const addBindingName = (name: ts.BindingName): void => {
		if (ts.isIdentifier(name)) locals.add(name.text)
		else for (const element of name.elements) if (ts.isBindingElement(element)) addBindingName(element.name)
	}
	const visit = (node: ts.Node): void => {
		if (ts.isVariableDeclaration(node)) addBindingName(node.name)
		else if (ts.isParameter(node)) addBindingName(node.name)
		else if (ts.isFunctionDeclaration(node) && node.name) locals.add(node.name.text)
		else if (ts.isClassDeclaration(node) && node.name) locals.add(node.name.text)
		else if (ts.isBindingElement(node) && node.propertyName && ts.isIdentifier(node.propertyName)) locals.add(node.propertyName.text)
		ts.forEachChild(node, visit)
	}
	visit(sourceFile)
	return locals
}

/**
 * Does `moduleKey` expose `root.member`?
 *
 * Three ways a reference can be satisfied, all grounded in the pin:
 *   - the module exports `member` directly (`Effect.map`),
 *   - the module declares `namespace root { member }` (`Config.string`), or
 *   - the barrel re-exports another module as `root`
 *     (`export * as ChildProcess from './ChildProcess.ts'` -> `ChildProcess.make`).
 */
function declares(key: string, root: string, member: string): boolean {
	if (moduleExports.get(key)?.has(member)) return true
	return namespacedExports.get(key)?.has(`${root}.${member}`) ?? false
}

interface Finding {
	reference: string
	root: string
	member: string
	candidateModules: string[]
	modelIds: string[]
	modules: string[]
	modulesResolved: number
}

const findingsByReference = new Map<string, Finding>()
const unresolvedRoots = new Map<string, { modelIds: Set<string>; references: number }>()
const needsSemanticCompile = new Map<string, { modelIds: Set<string>; references: number }>()
const fallbackFindingsByReference = new Map<string, Finding>()
const seenModelIds = new Set<string>()
let checkedReferences = 0
let templatesChecked = 0

/**
 * `@effect/*` names imported by each module, keyed by module name.
 *
 * A template is usually exposed by a re-exporting catalog as well as by the
 * pack that defines it, and the catalog is scanned first. Scanning every
 * module up front lets a template inherit the externals of its defining pack
 * rather than whichever module the dedup happened to visit first.
 */
const moduleExternalsByName = new Map<string, Set<string>>()
const modulesByModelId = new Map<string, Set<string>>()
for (const fileName of listCoreTemplateModules()) {
	if (classifyModuleName(fileName) === 'helpers') continue
	const { exports, error } = await importCoreTemplateModule(fileName)
	if (error) continue
	const moduleName = fileName.replace(/\.ts$/, '')
	// The pack's runtime contract is sometimes written as a comment rather than
	// an import statement, so the module's text is scanned as well.
	moduleExternalsByName.set(moduleName, externalImports(readFileSync(join(coreTemplatesDir, fileName), 'utf8')))
	for (const { templates } of collectTemplateArrays(exports)) {
		for (const template of templates as TemplateLike[]) {
			const set = modulesByModelId.get(template.modelId) ?? new Set<string>()
			set.add(moduleName)
			modulesByModelId.set(template.modelId, set)
		}
	}
}

for (const fileName of listCoreTemplateModules()) {
	if (classifyModuleName(fileName) === 'helpers') continue
	const { exports, error } = await importCoreTemplateModule(fileName)
	if (error) continue
	const moduleName = fileName.replace(/\.ts$/, '')
	for (const { templates } of collectTemplateArrays(exports)) {
		for (const template of templates as TemplateLike[]) {
			if (seenModelIds.has(template.modelId)) continue
			seenModelIds.add(template.modelId)
			templatesChecked += 1
			const locals = localBindings(template.source)
			const externals = new Set<string>(externalImports(template.source))
			for (const name of modulesByModelId.get(template.modelId) ?? []) {
				for (const external of moduleExternalsByName.get(name) ?? []) externals.add(external)
			}
			const fallbackExternals = new Set<string>(externals)
			for (const reference of collectFallbackReferences(template.source)) {
				if (!/^[A-Z]/.test(reference.root)) continue
				if (languageBuiltins.has(reference.root)) continue
				if (structurallyProvidedMembers.has(reference.member)) continue
				if (fallbackExternals.has(reference.root)) continue
				const candidates = nameIndex.get(reference.root) ?? []
				if (candidates.length === 0) continue
				if (candidates.some((key) => declares(key, reference.root, reference.member))) continue
				fallbackExternals.add(reference.root)
				const key = `${reference.root}.${reference.member}`
				const finding = fallbackFindingsByReference.get(key) ?? {
					reference: key,
					root: reference.root,
					member: reference.member,
					candidateModules: candidates,
					modelIds: [],
					modules: [],
					modulesResolved: candidates.length
				}
				finding.modelIds.push(template.modelId)
				finding.modules.push(moduleName)
				fallbackFindingsByReference.set(key, finding)
			}
			for (const reference of collectReferences(template.source)) {
				checkedReferences += 1
				if (locals.has(reference.root)) continue
				// Only a PascalCase root can be an Effect module namespace; anything
				// else is a local value, a global, or an external package.
				if (!/^[A-Z]/.test(reference.root)) continue
				if (languageBuiltins.has(reference.root)) continue
				if (structurallyProvidedMembers.has(reference.member)) continue
				if (externals.has(reference.root)) {
					const row = needsSemanticCompile.get(reference.root) ?? { modelIds: new Set<string>(), references: 0 }
					row.modelIds.add(template.modelId)
					row.references += 1
					needsSemanticCompile.set(reference.root, row)
					continue
				}
				const candidates = nameIndex.get(reference.root) ?? []
				if (candidates.length === 0) {
					const row = unresolvedRoots.get(reference.root) ?? { modelIds: new Set<string>(), references: 0 }
					row.modelIds.add(template.modelId)
					row.references += 1
					unresolvedRoots.set(reference.root, row)
					continue
				}
				const resolved = candidates.filter((key) => declares(key, reference.root, reference.member))
				if (resolved.length > 0) continue
				const key = `${reference.root}.${reference.member}`
				const finding = findingsByReference.get(key) ?? {
					reference: key,
					root: reference.root,
					member: reference.member,
					candidateModules: candidates,
					modelIds: [],
					modules: [],
					modulesResolved: candidates.length
				}
				finding.modelIds.push(template.modelId)
				finding.modules.push(moduleName)
				findingsByReference.set(key, finding)
			}
		}
	}
}

const findings = [...findingsByReference.values()]
	.map((finding) => ({
		...finding,
		modelIds: [...new Set(finding.modelIds)].sort(),
		modules: [...new Set(finding.modules)].sort(),
		templateCount: finding.modelIds.length
	}))
	.sort((a, b) => b.templateCount - a.templateCount || a.reference.localeCompare(b.reference))

const unresolved = [...unresolvedRoots.entries()]
	.map(([root, row]) => ({ root, references: row.references, templateCount: row.modelIds.size }))
	.sort((a, b) => b.references - a.references || a.root.localeCompare(b.root))

const external = [...needsSemanticCompile.entries()]
	.map(([root, row]) => ({ root, references: row.references, templateCount: row.modelIds.size }))
	.sort((a, b) => b.references - a.references || a.root.localeCompare(b.root))

const fallbackFindings = [...fallbackFindingsByReference.values()]
	.map((finding) => ({
		...finding,
		modelIds: [...new Set(finding.modelIds)].sort(),
		modules: [...new Set(finding.modules)].sort(),
		templateCount: finding.modelIds.length
	}))
	.sort((a, b) => b.templateCount - a.templateCount || a.reference.localeCompare(b.reference))

const report = {
	summary: {
		templatesChecked,
		referencesChecked: checkedReferences,
		pinnedModules: moduleExports.size,
		missingMembers: findings.length,
		templatesWithMissingMembers: new Set(findings.flatMap((finding) => finding.modelIds)).size,
		unresolvedRoots: unresolved.length,
		needsSemanticCompile: external.length,
		fallbackMissingMembers: fallbackFindings.length
	},
	findings,
	unresolvedRoots: unresolved,
	needsSemanticCompile: external,
	fallbackFindings
}

writeFileSync(
	join(artifactsDir, 'effect-v4-api-usage-audit.json'),
	`${JSON.stringify(report, null, '\t')}\n`
)

console.log(`pinned modules indexed:     ${report.summary.pinnedModules}`)
console.log(`templates checked:          ${report.summary.templatesChecked}`)
console.log(`namespace references:       ${report.summary.referencesChecked}`)
console.log(`members missing in pin:     ${report.summary.missingMembers}`)
console.log(`templates affected:         ${report.summary.templatesWithMissingMembers}`)
console.log(`unresolved roots:           ${report.summary.unresolvedRoots}`)
console.log(`fallback members missing:    ${report.summary.fallbackMissingMembers}`)
console.log('\n=== MEMBERS NOT DECLARED BY THE PINNED PACKAGE ===')
for (const finding of findings.slice(0, 120)) {
	console.log(`  ${finding.reference}  (${finding.templateCount} templates, candidates: ${finding.candidateModules.slice(0, 3).join(', ')})`)
	console.log(`      e.g. ${finding.modelIds.slice(0, 3).join(', ')}`)
}
if (findings.length > 120) console.log(`  ... and ${findings.length - 120} more`)
console.log('\n=== ROOTS FROM UNINSTALLED @effect/* PACKAGES (needs semantic compile) ===')
for (const row of external.slice(0, 30)) console.log(`  ${row.root}: ${row.references} refs in ${row.templateCount} templates`)
console.log('\n=== MEMBERS MISSING FROM THE PIN, INSIDE MARKER FALLBACKS (wrong examples) ===')
for (const finding of fallbackFindings.slice(0, 40)) {
	console.log(`  ${finding.reference}  (${finding.templateCount} templates, candidates: ${finding.candidateModules.slice(0, 3).join(', ')})`)
	console.log(`      e.g. ${finding.modelIds.slice(0, 3).join(', ')}`)
}
console.log('\n=== MOST REFERENCED UNRESOLVED ROOTS (not an effect namespace) ===')
for (const row of unresolved.slice(0, 30)) console.log(`  ${row.root}: ${row.references} refs in ${row.templateCount} templates`)
