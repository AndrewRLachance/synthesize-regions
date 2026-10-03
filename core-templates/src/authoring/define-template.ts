import ts from 'typescript'
import { defineTemplate as defineAuthoritativeTemplate } from 'synthesize-regions'
import type { GraphTemplateManifest, TemplateImportRequirement } from 'synthesize-regions'
import { effectV4ImportBindings, effectV4ImportNamespaceBindings } from '../generated/effect-v4-import-bindings.js'

/**
 * Derives `importRequirements` from the template source using the canonical
 * bindings table generated from the pinned package export declarations
 * (`effect-v4-import-bindings.ts`). Free root identifiers are extracted with a
 * scope-aware walk and resolved through the table:
 *
 * - domain collisions (`Prompt` in unstable/ai vs unstable/cli) resolve to the
 *   barrel whose namespace actually exports the used members
 * - plain module files (no barrel, e.g. `@effect/openapi-generator/*`) import
 *   as namespaces when used with member access
 * - names that only match namespace re-exports (`Model`, `Result`, ...) are
 *   treated as user-scope values when no `Name.member` access exists
 * - `esToolkit` binds to the `es-toolkit` namespace by pack convention
 */

const KEYWORDS = new Set(['const', 'let', 'var', 'in', 'of', 'as', 'satisfies', 'keyof', 'typeof', 'readonly', 'infer', 'is', 'out', 'extends', 'true', 'false', 'null', 'this', 'super', 'arguments'])
const GLOBALS = new Set([
	'undefined', 'Object', 'Function', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt', 'Math', 'JSON', 'Date', 'RegExp',
	'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'AggregateError',
	'Map', 'Set', 'WeakMap', 'WeakSet', 'WeakRef', 'FinalizationRegistry', 'Promise', 'Proxy', 'Reflect', 'Intl',
	'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array',
	'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
	'Atomics', 'console', 'globalThis', 'NaN', 'Infinity', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
	'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'escape', 'unescape',
	'queueMicrotask', 'setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'clearImmediate',
	'TextEncoder', 'TextDecoder', 'URL', 'URLSearchParams', 'AbortController', 'AbortSignal',
	'structuredClone', 'crypto', 'performance', 'atob', 'btoa',
	'Record', 'Partial', 'Required', 'Readonly', 'ReadonlyArray', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable',
	'Parameters', 'ConstructorParameters', 'ReturnType', 'InstanceType', 'ThisParameterType', 'OmitThisParameter',
	'ThisType', 'Uppercase', 'Lowercase', 'Capitalize', 'Uncapitalize', 'Awaited', 'NoInfer',
	'Iterator', 'Iterable', 'IterableIterator', 'AsyncIterable', 'AsyncIterator', 'AsyncIterableIterator',
	'Generator', 'AsyncGenerator', 'GeneratorFunction', 'AsyncGeneratorFunction', 'PromiseLike', 'ArrayLike', 'PropertyKey'
])

const freeRoots = (sourceText: string): Set<string> => {
	const source = ts.createSourceFile('sample.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
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

const resolveRoot = (source: string, root: string): TemplateImportRequirement | undefined => {
	// User-scope identifiers that must never be imported: `make` (the generated
	// client factory the OpenAPI templates document) and `identity` (a common
	// user value name, not the effect combinator).
	if (root === 'make' || root === 'identity') return undefined
	if (root === 'esToolkit' && effectV4ImportNamespaceBindings.esToolkit) {
		const binding = effectV4ImportNamespaceBindings.esToolkit
		return { schemaVersion: 1, moduleSpecifier: binding.moduleSpecifier, importKind: 'namespace', localName: binding.localName, typeOnly: false }
	}
	const candidates = effectV4ImportBindings[root]
	if (!candidates || candidates.length === 0) return undefined
	const usedMembers = new Set([...source.matchAll(new RegExp(`\\b${root}\\.(\\w+)`, 'g'))].map((match) => match[1]!))
	// A bare root that only matches namespace re-exports and is never used with
	// member access is a user-scope value (`Model`, `Result`, ...), not a module.
	if (usedMembers.size === 0 && candidates.length > 0 && candidates.every((candidate) => candidate.members !== undefined)) {
		return undefined
	}
	let chosen = candidates[0]!
	if (candidates.length > 1 && usedMembers.size > 0) {
		let bestCoverage = -1
		for (const candidate of candidates) {
			const members = candidate.members ?? []
			const coverage = members.length === 0 ? 0 : [...usedMembers].filter((member) => members.includes(member)).length
			if (coverage > bestCoverage) {
				bestCoverage = coverage
				chosen = candidate
			}
		}
	}
	if (chosen.plainModule && usedMembers.size > 0) {
		return { schemaVersion: 1, moduleSpecifier: chosen.moduleSpecifier, importKind: 'namespace', localName: chosen.localName, typeOnly: false }
	}
	return {
		schemaVersion: 1,
		moduleSpecifier: chosen.moduleSpecifier,
		importKind: 'named',
		importedName: chosen.importedName ?? chosen.localName,
		localName: chosen.localName,
		typeOnly: chosen.typeOnly
	}
}

export function sampleImportRequirements(source: string): readonly TemplateImportRequirement[] {
	const requirements = new Map<string, TemplateImportRequirement>()
	for (const root of [...freeRoots(source)].sort()) {
		const resolved = resolveRoot(source, root)
		if (resolved) requirements.set(`${resolved.moduleSpecifier}::${resolved.localName}`, resolved)
	}
	return [...requirements.values()].sort((a, b) =>
		a.moduleSpecifier.localeCompare(b.moduleSpecifier) || (a.localName ?? '').localeCompare(b.localName ?? '')
	)
}

export const defineTemplate: typeof defineAuthoritativeTemplate = ((manifest: GraphTemplateManifest) =>
	defineAuthoritativeTemplate({ ...manifest, importRequirements: manifest.importRequirements ?? sampleImportRequirements(manifest.source) })
) as typeof defineAuthoritativeTemplate
