/**
 * Semantic-compile stage 1 — derive import requirements for every canonical
 * template.
 *
 * For each template, the marker fallbacks are substituted back into the source
 * (the default generated artifact), free root identifiers are extracted with a
 * TypeScript AST walk, and each root is resolved to a module specifier using
 * the pinned packages' export declarations:
 *
 *   1. the `effect` root barrel
 *   2. `effect/unstable/<domain>` barrels
 *   3. platform package roots (@effect/platform-node, ...)
 *   4. `@effect/openapi-generator/<Module>` submodules
 *   5. `effect/<Module>` single-module fallback (namespace import)
 *
 * Preference conflicts are resolved in that order; the one genuine ambiguity
 * (`Resource`, exported by both `effect` and `@effect/opentelemetry`) is
 * resolved per template by context.
 *
 * Output: `effect-v4-derived-imports.json` — per-template import requirements
 * plus the roots that could not be resolved (the true rc-sensitive set).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const coreTemplatesDir = resolve(here, '../..')
const artifactsDir = join(here, '.artifacts')
mkdirSync(artifactsDir, { recursive: true })
const packagesDir = resolve(here, 'node_modules')
const effectDist = join(packagesDir, 'effect/dist')

// ---------------------------------------------------------------------------
// Export-map construction
// ---------------------------------------------------------------------------

type ExportKind = 'named' | 'namespace'

const normalizeSpecifierFile = (specifier: string, fromFile: string): string | undefined => {
	const base = resolve(dirname(fromFile), specifier)
	for (const candidate of [base, `${base}.d.ts`, base.replace(/\.(js|ts)$/, '.d.ts'), join(base, 'index.d.ts')]) {
		if (candidate.endsWith('.d.ts') && existsSync(candidate)) return candidate
	}
	return undefined
}

/** Collect exported names from a .d.ts file, following `export * from`. */
const collectExports = (
	filePath: string,
	into = new Map<string, ExportKind>(),
	seen = new Set<string>(),
	nsMembers = new Map<string, Set<string>>()
): Map<string, ExportKind> => {
	if (seen.has(filePath)) return into
	seen.add(filePath)
	const source = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true)
	for (const statement of source.statements) {
		if (ts.isExportDeclaration(statement)) {
			const moduleSpecifier = statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
				? statement.moduleSpecifier.text
				: undefined
			if (!statement.exportClause) {
				// export * from './x' or export * from 'bare-package'
				if (moduleSpecifier) {
					const target = moduleSpecifier.startsWith('.')
						? normalizeSpecifierFile(moduleSpecifier, filePath)
						: resolveBareSpecifier(moduleSpecifier, filePath)
					if (target) collectExports(target, into, seen, nsMembers)
				}
				continue
			}
			if (ts.isNamespaceExport(statement.exportClause)) {
				const ns = statement.exportClause.name.text
				into.set(ns, 'namespace')
				// Track the target module's members so domain collisions can be
				// broken by which barrel actually has the used members.
				if (moduleSpecifier) {
					const target = moduleSpecifier.startsWith('.')
						? normalizeSpecifierFile(moduleSpecifier, filePath)
						: resolveBareSpecifier(moduleSpecifier, filePath)
					if (target) {
						const targetExports = collectExports(target, new Map(), new Set(), nsMembers)
						nsMembers.set(ns, new Set(targetExports.keys()))
					}
				}
				continue
			}
			if (ts.isNamedExports(statement.exportClause)) {
				for (const element of statement.exportClause.elements) into.set(element.name.text, 'named')
			}
			continue
		}
		const isExported = ts.canHaveModifiers(statement) && (ts.getModifiers(statement) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
		if (!isExported) continue
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) into.set(declaration.name.text, 'named')
			}
			continue
		}
		const named = statement as { name?: ts.Node }
		if (named.name && ts.isIdentifier(named.name)) into.set(named.name.text, 'named')
	}
	return into
}

/** Resolve a bare package specifier's type entry by walking up node_modules. */
const resolveBareSpecifier = (specifier: string, fromFile: string): string | undefined => {
	let dir = dirname(fromFile)
	for (let depth = 0; depth < 8; depth += 1) {
		const candidate = join(dir, 'node_modules', specifier)
		const packageJsonPath = join(candidate, 'package.json')
		if (existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { types?: string; typings?: string; exports?: Record<string, unknown> }
			const typesField = packageJson.types ?? packageJson.typings
			if (typesField) {
				const resolved = join(candidate, typesField)
				if (existsSync(resolved)) return resolved
			}
			for (const guess of ['dist/index.d.ts', 'index.d.ts', 'build/index.d.ts']) {
				const resolved = join(candidate, guess)
				if (existsSync(resolved)) return resolved
			}
			return undefined
		}
		const parent = dirname(dir)
		if (parent === dir) return undefined
		dir = parent
	}
	return undefined
}

interface Registry {
	specifier: string
	exports: Map<string, ExportKind>
	/** Exported members of each namespace re-export, for member-aware tie-breaking. */
	nsMembers: Map<string, Set<string>>
	/** True for plain module files (no barrel index); these are imported as namespaces when used with member access. */
	isPlainModule: boolean
}

/**
 * Domain hints from the owning pack: `effect-v4-cli-…` templates prefer the
 * `unstable/cli` barrel when a root is exported by several domains (the
 * canonical `Prompt` collision: `unstable/ai` vs `unstable/cli`). Only used
 * to break scoring ties; registration order remains the final arbiter.
 */
const KNOWN_DOMAIN_HINTS = new Set([
	...readdirSync(join(effectDist, 'unstable'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name),
	'platform-node', 'platform-bun', 'platform-browser', 'opentelemetry', 'sql-pg', 'vitest'
])
const manifest = JSON.parse(readFileSync(join(coreTemplatesDir, 'metadata/effect-v4-catalog-manifest.json'), 'utf8')) as {
	templates: Array<{ modelId: string; sourceModule: string }>
}
const domainHintByModelId = new Map<string, string>()
for (const entry of manifest.templates) {
	const tokens = entry.sourceModule.replace(/^effect(-v4)?-?/, '').split('-')
	const hint = tokens.find((token) => KNOWN_DOMAIN_HINTS.has(token))
	if (hint) domainHintByModelId.set(entry.modelId, hint)
}

const registries: Registry[] = []
const register = (specifier: string, filePath: string): void => {
	if (!existsSync(filePath)) return
	const nsMembers = new Map<string, Set<string>>()
	registries.push({
		specifier,
		exports: collectExports(filePath, new Map(), new Set(), nsMembers),
		nsMembers,
		isPlainModule: !filePath.endsWith('index.d.ts')
	})
}

// 1. effect root barrel
register('effect', join(effectDist, 'index.d.ts'))
// 2. unstable domain barrels + effect/testing
const unstableDir = join(effectDist, 'unstable')
for (const entry of readdirSync(unstableDir, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue
	register(`effect/unstable/${entry.name}`, join(unstableDir, entry.name, 'index.d.ts'))
}
register('effect/testing', join(effectDist, 'testing/index.d.ts'))
register('ts-pattern', resolveBareSpecifier('ts-pattern', join(here, 'package.json')) ?? '')
// 3. platform package roots + es-toolkit (namespace binding used by the es-toolkit packs)
for (const pkg of ['platform-node', 'platform-bun', 'platform-browser', 'opentelemetry', 'sql-pg', 'vitest']) {
	register(`@effect/${pkg}`, join(packagesDir, `@effect/${pkg}/dist/index.d.ts`))
}
const esToolkitSpecifier = resolveBareSpecifier('es-toolkit', join(here, 'package.json'))
// 4. openapi-generator submodules (no package index)
const generatorDist = join(packagesDir, '@effect/openapi-generator/dist')
for (const entry of readdirSync(generatorDist)) {
	if (!entry.endsWith('.d.ts') || entry === 'index.d.ts') continue
	register(`@effect/openapi-generator/${entry.replace(/\.d\.ts$/, '')}`, join(generatorDist, entry))
}

// ---------------------------------------------------------------------------
// Free-root extraction
// ---------------------------------------------------------------------------

const GLOBALS = new Set([
	'undefined',
	// ES2022 values
	'Object', 'Function', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt', 'Math', 'JSON', 'Date', 'RegExp',
	'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'AggregateError',
	'Map', 'Set', 'WeakMap', 'WeakSet', 'WeakRef', 'FinalizationRegistry', 'Promise', 'Proxy', 'Reflect', 'Intl',
	'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array',
	'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
	'Atomics', 'console', 'globalThis', 'NaN', 'Infinity', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
	'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'escape', 'unescape',
	'queueMicrotask', 'setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'clearImmediate',
	'TextEncoder', 'TextDecoder', 'URL', 'URLSearchParams', 'AbortController', 'AbortSignal',
	'structuredClone', 'crypto', 'performance', 'atob', 'btoa',
	// TypeScript utility / lib types
	'Record', 'Partial', 'Required', 'Readonly', 'ReadonlyArray', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable',
	'Parameters', 'ConstructorParameters', 'ReturnType', 'InstanceType', 'ThisParameterType', 'OmitThisParameter',
	'ThisType', 'Uppercase', 'Lowercase', 'Capitalize', 'Uncapitalize', 'Awaited', 'NoInfer',
	'Iterator', 'Iterable', 'IterableIterator', 'AsyncIterable', 'AsyncIterator', 'AsyncIterableIterator',
	'Generator', 'AsyncGenerator', 'GeneratorFunction', 'AsyncGeneratorFunction', 'PromiseLike', 'ArrayLike', 'PropertyKey'
])

/** Words that surface as AST identifiers but are keywords, never references. */
const KEYWORDS = new Set(['const', 'let', 'var', 'in', 'of', 'as', 'satisfies', 'keyof', 'typeof', 'readonly', 'infer', 'is', 'out', 'extends', 'true', 'false', 'null', 'this', 'super', 'arguments'])

/** Extract free root identifiers (value and type positions), scope-aware. */
const freeRoots = (fileName: string, sourceText: string): Set<string> => {
	const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	const roots = new Set<string>()
	const scopeStack: Set<string>[] = [new Set<string>()]

	const declarePattern = (name: ts.BindingName): void => {
		const scope = scopeStack[scopeStack.length - 1]!
		if (ts.isIdentifier(name)) scope.add(name.text)
		else {
			for (const element of name.elements) {
				if (ts.isBindingElement(element)) declarePattern(element.name)
			}
		}
	}
	const isDeclared = (text: string): boolean => scopeStack.some((scope) => scope.has(text))

	const isReferencePosition = (node: ts.Identifier): boolean => {
		const parent = node.parent
		if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false
		if (ts.isQualifiedName(parent) && parent.right === node) return false
		if ((ts.isPropertyAssignment(parent) && parent.name === node)
			|| (ts.isPropertySignature(parent) && parent.name === node)
			|| (ts.isMethodSignature(parent) && parent.name === node)
			|| (ts.isMethodDeclaration(parent) && parent.name === node)
			|| (ts.isPropertyDeclaration(parent) && parent.name === node)
			|| (ts.isGetAccessorDeclaration(parent) && parent.name === node)
			|| (ts.isSetAccessorDeclaration(parent) && parent.name === node)
			|| (ts.isEnumMember(parent) && parent.name === node)
			|| (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent))
			|| (ts.isLabeledStatement(parent) && parent.label === node)
			|| (ts.isBreakOrContinueStatement(parent) && parent.label === node)
			|| (ts.isTypeParameterDeclaration(parent) && parent.name === node)
			|| (ts.isBindingElement(parent) && parent.name === node && !parent.initializer)) {
			return false
		}
		return true
	}

	const visit = (node: ts.Node): void => {
		let pushed = false
		if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
			scopeStack.push(new Set<string>())
			pushed = true
			for (const parameter of node.parameters) declarePattern(parameter.name)
			if (ts.isFunctionDeclaration(node) && node.name) declarePattern(node.name)
		} else if (ts.isBlock(node) || ts.isCaseBlock(node) || ts.isModuleBlock(node) || ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node) || ts.isCatchClause(node)) {
			scopeStack.push(new Set<string>())
			pushed = true
			if (ts.isCatchClause(node) && node.variableDeclaration) declarePattern(node.variableDeclaration.name)
		}

		if (ts.isVariableDeclaration(node)) declarePattern(node.name)
		else if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) {
			scopeStack[scopeStack.length - 1]!.add(node.name.text)
		} else if (ts.isTypeParameterDeclaration(node)) scopeStack[scopeStack.length - 1]!.add(node.name.text)
		else if (ts.isIdentifier(node) && !KEYWORDS.has(node.text) && isReferencePosition(node) && !isDeclared(node.text) && !GLOBALS.has(node.text)) {
			roots.add(node.text)
		}

		ts.forEachChild(node, visit)
		if (pushed) scopeStack.pop()
	}
	visit(source)
	return roots
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

interface DerivedImport {
	moduleSpecifier: string
	importKind: 'named' | 'namespace'
	importedName: string
	typeOnly: boolean
}

/** Context-sensitive overrides for genuinely ambiguous roots. */
const contextualOverrides = (modelId: string, source: string, root: string): string | undefined => {
	if (root === 'Resource' && (/Otel|NodeSdk|WebSdk|Otlp|telemetry/i.test(source) || /Otel|Telemetry/.test(modelId))) return '@effect/opentelemetry'
	return undefined
}

const AMBIENT_ROOTS = new Set(['make', 'identity'])

const resolveRoot = (modelId: string, source: string, root: string, scores: Map<Registry, number>, domainHint: string | undefined): DerivedImport | undefined => {
	const override = contextualOverrides(modelId, source, root)
	if (override) return { moduleSpecifier: override, importKind: 'named', importedName: root, typeOnly: false }
	// User-scope identifiers that must never be imported (e.g. `make`, the
	// generated-client factory the OpenAPI integration templates document).
	if (AMBIENT_ROOTS.has(root)) return undefined
	if (root === 'esToolkit' && esToolkitSpecifier) {
		return { moduleSpecifier: 'es-toolkit', importKind: 'namespace', importedName: 'esToolkit', typeOnly: false }
	}
	// Domain collisions (e.g. `Prompt` exported by both unstable/ai and
	// unstable/cli) resolve toward the registry that resolves the most of this
	// template's roots; ties break toward the owning pack's domain barrel, then
	// registration order.
	const candidates = registries.filter((registry) => registry.exports.has(root))
	// A bare root used as a value (no `Root.member` anywhere) that only matches
	// namespace re-exports is a user-scope value, not the module: `Model`,
	// `Result`, `Service` name domain values, not the barrels sharing their name.
	const hasMemberAccess = new RegExp(`\\b${root}\\.[A-Za-z]`).test(source)
	if (!hasMemberAccess && candidates.length > 0 && candidates.every((registry) => registry.exports.get(root) === 'namespace')) {
		return undefined
	}
	const usedMembers = new Set(
		[...source.matchAll(new RegExp(`\\b${root}\\.(\\w+)`, 'g'))].map((match) => match[1]!)
	)
	const memberCoverage = (registry: Registry): number => {
		const members = registry.nsMembers.get(root)
		if (!members || usedMembers.size === 0) return 0
		let covered = 0
		for (const member of usedMembers) if (members.has(member)) covered += 1
		return covered
	}
	candidates.sort((a, b) => {
		const scoreDelta = (scores.get(b) ?? 0) - (scores.get(a) ?? 0)
		if (scoreDelta !== 0) return scoreDelta
		// Prefer the barrel whose namespace actually exports the used members
		// (`Prompt.Password`/`Prompt.run` pick unstable/cli over unstable/ai).
		const memberDelta = memberCoverage(b) - memberCoverage(a)
		if (memberDelta !== 0) return memberDelta
		if (domainHint) {
			const aHint = a.specifier.includes(`/${domainHint}`) ? 1 : 0
			const bHint = b.specifier.includes(`/${domainHint}`) ? 1 : 0
			if (aHint !== bHint) return bHint - aHint
		}
		return 0
	})
	for (const registry of candidates) {
		const kind = registry.exports.get(root)
		if (kind === undefined) continue
		// A barrel re-export (`export * as X from ...`) is imported by name. When
		// the source uses `X.X` against a plain module file (no barrel), the
		// whole module must be imported as a namespace instead.
		if (kind === 'namespace') return { moduleSpecifier: registry.specifier, importKind: 'named', importedName: root, typeOnly: false }
		// A plain module file (no barrel) used with member access is itself the
		// namespace (e.g. `OpenApiGenerator.layerTransformerTs`). Barrel/index
		// exports keep their named import — members ride along with the value.
		if (registry.isPlainModule && new RegExp(`\\b${root}\\.[A-Za-z]`).test(source)) {
			return { moduleSpecifier: registry.specifier, importKind: 'namespace', importedName: root, typeOnly: false }
		}
		return { moduleSpecifier: registry.specifier, importKind: 'named', importedName: root, typeOnly: false }
	}
	// Single-module fallback: `import * as X from 'effect/X'`.
	if (existsSync(join(effectDist, `${root}.d.ts`))) {
		return { moduleSpecifier: `effect/${root}`, importKind: 'namespace', importedName: root, typeOnly: false }
	}
	return undefined
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const MARKER_SPAN = /\/\*\* @TYPE ([a-zA-Z]+) id=([^\s]+) \*\*\/([\s\S]*?)\/\*\* @END \*\*\//g

/**
 * Host wrapper per output kind, mirroring the synthesis step: a raw statement
 * that yields is only valid inside a generator body, and a suffix fragment is
 * only valid after a base expression. `__base`/`__gen` are ambient hosts, not
 * template content.
 */
const wrapForOutputKind = (kind: string, source: string): string => {
	switch (kind) {
		case 'expression':
		case 'array':
		case 'object':
			return `const __out = (${source});`
		case 'expressionSuffix':
			return `declare const __base: any;\nconst __out = __base${source};`
		case 'objectProperty':
			return `const __out = { ${source} };`
		case 'statement':
			return /(^|[^\w$])yield\*/.test(source) ? `function* __gen() {\n${source}\n}` : source
		case 'sourceFile':
			return source
		default:
			return source
	}
}

const catalog = await import(join(coreTemplatesDir, 'src/catalogs/effect-v4.ts'))
const templates = catalog.effectV4CanonicalGraphTemplateInputs as Array<{
	modelId: string
	source: string
	output: { kind: string }
	importRequirements?: ReadonlyArray<{ moduleSpecifier: string; importedName?: string; localName?: string; importKind: string; typeOnly: boolean }>
}>

const results: Record<string, { imports: DerivedImport[]; unresolvedRoots: string[] }> = {}
const unresolvedFrequency = new Map<string, number>()
let fullyResolved = 0

for (const template of templates) {
	const substituted = template.source.replace(MARKER_SPAN, (_match, _kind, _id, fallback) => String(fallback))
	const wrapped = wrapForOutputKind(template.output.kind, substituted)
	const isSourceFile = template.output.kind === 'sourceFile'
	// Source-file roots already carry their own imports; only fragments need derivation.
	const roots = isSourceFile ? new Set<string>() : freeRoots(`${template.modelId}.ts`, wrapped)
	// Score every registry against this template's root set once; domain
	// collisions resolve toward the highest-scoring (most contextually related)
	// registry.
	const scores = new Map<Registry, number>()
	for (const registry of registries) {
		let score = 0
		for (const root of roots) if (registry.exports.has(root)) score += 1
		scores.set(registry, score)
	}
	const imports = new Map<string, DerivedImport>()
	const unresolved: string[] = []
	for (const root of [...roots].sort()) {
		const resolved = resolveRoot(template.modelId, wrapped, root, scores, domainHintByModelId.get(template.modelId))
		if (!resolved) {
			unresolved.push(root)
			unresolvedFrequency.set(root, (unresolvedFrequency.get(root) ?? 0) + 1)
			continue
		}
		imports.set(`${resolved.moduleSpecifier}::${resolved.importedName}`, resolved)
	}
	// Merge template-declared importRequirements (authoritative when present).
	for (const requirement of template.importRequirements ?? []) {
		const name = requirement.importedName ?? requirement.localName ?? requirement.moduleSpecifier
		imports.set(`${requirement.moduleSpecifier}::${name}`, {
			moduleSpecifier: requirement.moduleSpecifier,
			importKind: requirement.importKind === 'namespace' ? 'namespace' : 'named',
			importedName: name,
			typeOnly: requirement.typeOnly
		})
	}
	results[template.modelId] = { imports: [...imports.values()].sort((a, b) => a.moduleSpecifier.localeCompare(b.moduleSpecifier) || a.importedName.localeCompare(b.importedName)), unresolvedRoots: unresolved }
	if (unresolved.length === 0) fullyResolved += 1
}

const report = {
	effectVersion: '4.0.0-rc.117',
	generatedBy: 'tools/semantic-compile/derive-imports.mts',
	summary: {
		templates: templates.length,
		fullyResolved,
		withUnresolvedRoots: templates.length - fullyResolved,
		distinctUnresolvedRoots: unresolvedFrequency.size,
		importsDerived: Object.values(results).reduce((sum, entry) => sum + entry.imports.length, 0)
	},
	unresolvedRoots: [...unresolvedFrequency.entries()].sort((a, b) => b[1] - a[1]).map(([root, count]) => ({ root, templates: count })),
	byModelId: results
}

writeFileSync(join(artifactsDir, 'effect-v4-derived-imports.json'), `${JSON.stringify(report, null, '\t')}\n`)

// --- Canonical import-bindings table (consumed by sample-definition.js). ------
// One entry per exported name, as candidate list ordered by registry
// preference; domain collisions carry every candidate plus namespace member
// maps so the wrapper can resolve per template source.
interface BindingCandidate {
	moduleSpecifier: string
	importKind: 'named' | 'namespace'
	importedName?: string
	localName: string
	typeOnly: boolean
	plainModule?: boolean
	members?: string[]
}
const bindings = new Map<string, BindingCandidate[]>()
for (const registry of registries) {
	for (const [name, kind] of registry.exports) {
		const candidate: BindingCandidate = {
			moduleSpecifier: registry.specifier,
			importKind: 'named',
			importedName: name,
			localName: name,
			typeOnly: false,
			...(registry.isPlainModule ? { plainModule: true } : {}),
			...(kind === 'namespace' && registry.nsMembers.has(name) ? { members: [...registry.nsMembers.get(name)!].sort() } : {})
		}
		const list = bindings.get(name) ?? []
		list.push(candidate)
		bindings.set(name, list)
	}
}
// Namespace-form bindings used by convention rather than discovered by the
// barrel walk (es-toolkit is consumed as `esToolkit.*`, and plain-module
// namespaces like OpenApiGenerator are imported whole when used as `X.member`).
const namespaceBindings: Array<[string, BindingCandidate]> = [
	['esToolkit', { moduleSpecifier: 'es-toolkit', importKind: 'namespace', localName: 'esToolkit', typeOnly: false }]
]
const bindingsModule = `/**
 * Canonical name → import-requirement bindings for the Effect v4 template
 * catalog, generated from the pinned package export declarations by
 * \`tools/semantic-compile/derive-imports.mts\`. Consumed by the Effect
 * authoring helpers to derive template importRequirements automatically.
 *
 * Each name maps to its candidate bindings in preference order (effect root,
 * then unstable domain barrels, then platform packages). Domain collisions
 * (e.g. \`Prompt\` in unstable/ai and unstable/cli) carry namespace member
 * maps so the wrapper can pick the barrel that actually exports the used
 * members. \`plainModule\` marks plain module files (no barrel): when a
 * template uses the name with member access, the whole module is imported as
 * a namespace.
 */
export interface EffectV4ImportBindingCandidate {
	moduleSpecifier: string
	importKind: 'named' | 'namespace'
	importedName?: string
	localName: string
	typeOnly: boolean
	plainModule?: boolean
	members?: string[]
}

export const effectV4ImportBindings: Readonly<Record<string, readonly EffectV4ImportBindingCandidate[]>> = ${JSON.stringify(
		Object.fromEntries([...bindings.entries()].sort(([a], [b]) => a.localeCompare(b))),
		null,
		'\t'
	)}

export const effectV4ImportNamespaceBindings: Readonly<Record<string, EffectV4ImportBindingCandidate>> = ${JSON.stringify(
		Object.fromEntries(namespaceBindings),
		null,
		'\t'
	)}
`
writeFileSync(join(coreTemplatesDir, 'src/generated/effect-v4-import-bindings.ts'), bindingsModule)
console.log(`bindings table: ${bindings.size} names -> src/generated/effect-v4-import-bindings.ts`)

console.log(`templates: ${report.summary.templates}`)
console.log(`fully resolved: ${report.summary.fullyResolved}`)
console.log(`with unresolved roots: ${report.summary.withUnresolvedRoots}`)
console.log(`imports derived: ${report.summary.importsDerived}`)
console.log(`distinct unresolved roots: ${report.summary.distinctUnresolvedRoots}`)
for (const { root, templates: count } of report.unresolvedRoots.slice(0, 25)) console.log(`  ${root}: ${count}`)
