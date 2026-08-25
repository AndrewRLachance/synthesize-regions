import { createHash } from 'node:crypto'

import { Type, type Static } from '@sinclair/typebox'
import ts from 'typescript'

import { discoverReplacementRegions } from '../regions/discovery.js'
import { createArtifactSetFileHash, normalizeArtifactTargetPath } from './artifactSet.js'
import { canonicalizeJson } from './artifactIdentity.js'
import { compareCodeUnits } from './deterministic.js'
import { defineTemplate } from './definition.js'
import {
	ImplementationEnforcementDiagnosticSchema,
	implementationDiagnostic,
	type ImplementationEnforcementDiagnostic
} from './implementationAuthority.js'
import { REGION_KIND_VALUES, type GraphTemplateDefinition, type RegionKind } from './graphTypes.js'
import { templateModeForRegionKind } from './rendering.js'
import { wrapTemplateSource } from './templateMode.js'

export const IMPLEMENTATION_TARGET_DISCOVERY_VERSION = 1 as const
export const COMPLETION_SHELL_CONTRACT_VERSION = 1 as const

export const IMPLEMENTATION_TARGET_KIND_VALUES = [
	'declaredCallable',
	'declaredValue',
	'bodylessFunction',
	'bodylessMethod',
	'placeholderBody',
	'missingPropertyInitializer',
	'authorizedRepair'
] as const

export type ImplementationTargetKind = typeof IMPLEMENTATION_TARGET_KIND_VALUES[number]
export type ImplementationSymbolSpace = 'value' | 'type'

export const ImplementationTargetKeySchema = Type.Object({
	path: Type.String({ minLength: 1 }),
	qualifiedName: Type.String({ minLength: 1 }),
	targetKind: Type.Union(IMPLEMENTATION_TARGET_KIND_VALUES.map(value => Type.Literal(value))),
	regionKind: Type.Union(REGION_KIND_VALUES.map(value => Type.Literal(value))),
	symbolSpace: Type.Union([Type.Literal('value'), Type.Literal('type')])
}, { additionalProperties: false })

export type ImplementationTargetKey = Static<typeof ImplementationTargetKeySchema>

export const ImplementationSymbolFactSchema = Type.Object({
	schemaVersion: Type.Literal(1),
	symbolId: Type.String({ pattern: '^sym1_[a-f0-9]{64}$' }),
	name: Type.String({ minLength: 1 }),
	qualifiedName: Type.String({ minLength: 1 }),
	space: Type.Union([Type.Literal('value'), Type.Literal('type')]),
	path: Type.String({ minLength: 1 }),
	declarationStart: Type.Integer({ minimum: 0 }),
	declarationEnd: Type.Integer({ minimum: 0 }),
	exported: Type.Boolean()
}, { additionalProperties: false })

export type ImplementationSymbolFact = Static<typeof ImplementationSymbolFactSchema>

export const CompletionShellManifestSchema = Type.Object({
	schemaVersion: Type.Literal(1),
	targetId: Type.String({ pattern: '^it1_[a-f0-9]{64}$' }),
	rootTemplateId: Type.String({ minLength: 1 }),
	rootTemplateVersion: Type.Literal('1'),
	outputRegionKind: Type.Union(REGION_KIND_VALUES.map(value => Type.Literal(value))),
	implementationRegionKind: Type.Union(REGION_KIND_VALUES.map(value => Type.Literal(value))),
	implementationInputName: Type.Literal('implementation'),
	source: Type.String({ minLength: 1 }),
	sourceHash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
	declarationContractHash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
	rootTemplateManifestDigest: Type.String({ pattern: '^t[0-9]+_[a-f0-9]{64}$' })
}, { additionalProperties: false })

export type CompletionShellManifest = Static<typeof CompletionShellManifestSchema>

export const UnresolvedValueSymbolSchema = Type.Object({
	schemaVersion: Type.Literal(1),
	symbolId: Type.String({ pattern: '^uv1_[a-f0-9]{64}$' }),
	targetId: Type.String({ pattern: '^it1_[a-f0-9]{64}$' }),
	path: Type.String({ minLength: 1 }),
	name: Type.String({ minLength: 1 }),
	qualifiedName: Type.String({ minLength: 1 }),
	declarationStart: Type.Integer({ minimum: 0 }),
	declarationEnd: Type.Integer({ minimum: 0 })
}, { additionalProperties: false })

export type UnresolvedValueSymbol = Static<typeof UnresolvedValueSymbolSchema>

export const DiscoveredImplementationTargetSchema = Type.Object({
	schemaVersion: Type.Literal(1),
	targetKey: ImplementationTargetKeySchema,
	targetId: Type.String({ pattern: '^it1_[a-f0-9]{64}$' }),
	path: Type.String({ minLength: 1 }),
	start: Type.Integer({ minimum: 0 }),
	end: Type.Integer({ minimum: 1 }),
	baseContentHash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
	baseArtifactFileHash: Type.String({ pattern: '^f1_[a-f0-9]{64}$' }),
	targetTextHash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
	regionKind: Type.Union(REGION_KIND_VALUES.map(value => Type.Literal(value))),
	implementationRegionKind: Type.Union(REGION_KIND_VALUES.map(value => Type.Literal(value))),
	requiredRootTemplateId: Type.String({ minLength: 1 }),
	requiredRootTemplateManifestDigest: Type.String({ pattern: '^t[0-9]+_[a-f0-9]{64}$' }),
	completionShell: CompletionShellManifestSchema,
	symbol: ImplementationSymbolFactSchema,
	unresolvedValueSymbolId: Type.Optional(Type.String({ pattern: '^uv1_[a-f0-9]{64}$' })),
	discoveryReasons: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })
}, { additionalProperties: false })

export type DiscoveredImplementationTarget = Static<typeof DiscoveredImplementationTargetSchema>

export const ConfiguredImplementationRangeSelectorSchema = Type.Union([
	Type.Object({
		kind: Type.Literal('range'),
		start: Type.Integer({ minimum: 0 }),
		end: Type.Integer({ minimum: 1 }),
		expectedText: Type.String({ minLength: 1 })
	}, { additionalProperties: false }),
	Type.Object({
		kind: Type.Literal('marker'),
		markerId: Type.String({ minLength: 1 })
	}, { additionalProperties: false }),
	Type.Object({
		kind: Type.Literal('text'),
		exactText: Type.String({ minLength: 1 }),
		occurrence: Type.Optional(Type.Integer({ minimum: 0 }))
	}, { additionalProperties: false })
])

export type ConfiguredImplementationRangeSelector = Static<typeof ConfiguredImplementationRangeSelectorSchema>

export const ConfiguredImplementationRangeSchema = Type.Object({
	id: Type.String({ minLength: 1 }),
	path: Type.String({ minLength: 1 }),
	qualifiedName: Type.String({ minLength: 1 }),
	regionKind: Type.Union(REGION_KIND_VALUES.map(value => Type.Literal(value))),
	symbolSpace: Type.Union([Type.Literal('value'), Type.Literal('type')]),
	selector: ConfiguredImplementationRangeSelectorSchema
}, { additionalProperties: false })

export type ConfiguredImplementationRange = Static<typeof ConfiguredImplementationRangeSchema>

export interface ImplementationTargetDiscoveryOptions {
	readonly files: Readonly<Record<string, string>> | ReadonlyMap<string, string>
	/** Exact captured paths eligible for target discovery; defaults to every captured path. */
	readonly sourcePaths?: readonly string[]
	readonly enabledTargetKinds: readonly Exclude<ImplementationTargetKind, 'authorizedRepair'>[]
	/** Exact block texts, including braces, accepted as placeholder bodies. */
	readonly exactPlaceholderBodies?: readonly string[]
	/** Exact initializer texts accepted as placeholder expressions. */
	readonly exactPlaceholderExpressions?: readonly string[]
	/** Explicit non-empty existing ranges; structural regions require this route. */
	readonly configuredRanges?: readonly ConfiguredImplementationRange[]
}

export const ImplementationTargetDiscoveryResultSchema = Type.Object({
	schemaVersion: Type.Literal(1),
	ok: Type.Boolean(),
	discoveryDigest: Type.String({ pattern: '^disc1_[a-f0-9]{64}$' }),
	targets: Type.Array(DiscoveredImplementationTargetSchema),
	unresolvedValues: Type.Array(UnresolvedValueSymbolSchema),
	diagnostics: Type.Array(ImplementationEnforcementDiagnosticSchema)
}, { additionalProperties: false })

export type ImplementationTargetDiscoveryResult = Static<typeof ImplementationTargetDiscoveryResultSchema>

interface CandidateTarget {
	readonly path: string
	readonly sourceText: string
	readonly start: number
	readonly end: number
	readonly qualifiedName: string
	readonly name: string
	readonly targetKind: ImplementationTargetKind
	readonly regionKind: RegionKind
	readonly implementationRegionKind: RegionKind
	readonly symbolSpace: ImplementationSymbolSpace
	readonly exported: boolean
	readonly declarationStart: number
	readonly declarationEnd: number
	readonly shellSource: string
	readonly discoveryReasons: readonly string[]
	readonly globallyMergeable: boolean
}

function digest(value: string | Uint8Array): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function identity(prefix: string, payload: unknown): string {
	return `${prefix}1_${createHash('sha256').update(canonicalizeJson(payload), 'utf8').digest('hex')}`
}

function sourceFiles(options: ImplementationTargetDiscoveryOptions): Map<string, string> {
	const entries = options.files instanceof Map ? [...options.files] : Object.entries(options.files)
	const result = new Map<string, string>()
	for (const [authoredPath, sourceText] of entries) {
		const path = normalizeArtifactTargetPath(authoredPath)
		if (result.has(path)) throw new TypeError(`Captured source path ${path} is duplicated.`)
		if (typeof sourceText !== 'string') throw new TypeError(`Captured source ${path} must be text.`)
		result.set(path, sourceText)
	}
	return result
}

function scriptKind(path: string): ts.ScriptKind {
	if (/\.tsx$/u.test(path)) return ts.ScriptKind.TSX
	if (/\.jsx$/u.test(path)) return ts.ScriptKind.JSX
	if (/\.(?:js|mjs|cjs)$/u.test(path)) return ts.ScriptKind.JS
	return ts.ScriptKind.TS
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
	return (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined)?.some(modifier => modifier.kind === kind) ?? false
}

function isExported(node: ts.Node): boolean {
	for (let current: ts.Node | undefined = node; current !== undefined; current = current.parent) {
		if (hasModifier(current, ts.SyntaxKind.ExportKeyword) || hasModifier(current, ts.SyntaxKind.DefaultKeyword)) return true
		if (ts.isSourceFile(current)) break
	}
	return false
}

function nodeName(node: ts.Node): string | undefined {
	if ('name' in node) {
		const name = (node as ts.NamedDeclaration).name
		if (name !== undefined && ts.isIdentifier(name)) return name.text
		if (name !== undefined && (ts.isStringLiteral(name) || ts.isNumericLiteral(name))) return name.text
	}
	return undefined
}

function qualifiedName(node: ts.Node, leaf: string): string {
	const names = [leaf]
	for (let current = node.parent; current !== undefined && !ts.isSourceFile(current); current = current.parent) {
		if (ts.isClassDeclaration(current) || ts.isClassExpression(current)
			|| ts.isModuleDeclaration(current) || ts.isInterfaceDeclaration(current)
			|| ts.isTypeLiteralNode(current)) {
			const name = nodeName(current)
			if (name !== undefined) names.unshift(name)
		}
	}
	return names.join('.')
}

function removeModifiers(
	sourceText: string,
	node: ts.Node,
	kinds: ReadonlySet<ts.SyntaxKind>
): string {
	const start = node.getStart()
	const end = node.end
	let text = sourceText.slice(start, end)
	const modifiers = (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined) ?? []
	for (const modifier of [...modifiers].filter(item => kinds.has(item.kind)).sort((a, b) => b.getStart() - a.getStart())) {
		const localStart = modifier.getStart() - start
		let localEnd = modifier.end - start
		while (localEnd < text.length && /[ \t]/u.test(text[localEnd]!)) localEnd += 1
		text = `${text.slice(0, localStart)}${text.slice(localEnd)}`
	}
	return text
}

function marker(kind: RegionKind, body: string): string {
	return `/** @TYPE ${kind} id=implementation **/${body}/** @END **/`
}

const PLACEHOLDERS: Readonly<Record<RegionKind, string>> = {
	identifier: '__implementation__',
	expression: 'undefined',
	expressionSuffix: '.__implementation__',
	statement: 'void 0;',
	array: '[]',
	object: '{}',
	string: '"implementation"',
	number: '0',
	boolean: 'false',
	null: 'null',
	objectProperty: '__implementation__: undefined',
	type: 'unknown',
	typeMember: '__implementation__: unknown;',
	typeParameter: '__Implementation__',
	parameter: '__implementation__: unknown',
	constructorParameter: '__implementation__: unknown',
	heritageType: '__Implementation__',
	declaration: 'const __implementation__ = undefined;',
	classMember: '__implementation__ = undefined;',
	enumMember: '__Implementation__',
	importSpecifier: '__implementation__',
	exportSpecifier: '__implementation__',
	sourceFile: 'void 0;'
}

function directShellSource(kind: RegionKind): string {
	return marker(kind, PLACEHOLDERS[kind])
}

function shellVariableStatement(sourceText: string, statement: ts.VariableStatement): string {
	const stripped = removeModifiers(sourceText, statement, new Set([ts.SyntaxKind.DeclareKeyword])).trimEnd()
	return `${stripped.replace(/;\s*$/u, '')} = ${marker('expression', 'undefined')};`
}

function shellBodyDeclaration(sourceText: string, node: ts.FunctionDeclaration | ts.MethodDeclaration): string {
	const stripped = removeModifiers(sourceText, node, new Set([ts.SyntaxKind.DeclareKeyword, ts.SyntaxKind.AbstractKeyword])).trimEnd()
	return `${stripped.replace(/;\s*$/u, '')} { ${marker('statement', 'void 0;')} }`
}

function shellProperty(sourceText: string, property: ts.PropertyDeclaration): string {
	const stripped = removeModifiers(sourceText, property, new Set([ts.SyntaxKind.DeclareKeyword, ts.SyntaxKind.AbstractKeyword])).trimEnd()
	return `${stripped.replace(/[!?]?\s*;\s*$/u, match => match.includes('!') || match.includes('?') ? match.slice(0, 1) : '')} = ${marker('expression', 'undefined')};`
}

function replaceNodeBody(
	sourceText: string,
	node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.FunctionExpression | ts.ArrowFunction
): string | undefined {
	if (node.body === undefined || !ts.isBlock(node.body)) return undefined
	const start = node.getStart()
	const text = sourceText.slice(start, node.end)
	return `${text.slice(0, node.body.getStart() - start)}{ ${marker('statement', 'void 0;')} }${text.slice(node.body.end - start)}`
}

function replaceInitializer(
	sourceText: string,
	node: ts.VariableStatement | ts.PropertyDeclaration,
	initializer: ts.Expression
): string {
	const start = node.getStart()
	const text = sourceText.slice(start, node.end)
	return `${text.slice(0, initializer.getStart() - start)}${marker('expression', 'undefined')}${text.slice(initializer.end - start)}`
}

function replaceNestedFunctionBody(
	sourceText: string,
	outer: ts.Node,
	callable: ts.FunctionExpression | ts.ArrowFunction
): string | undefined {
	if (!ts.isBlock(callable.body)) return undefined
	const start = outer.getStart()
	const text = sourceText.slice(start, outer.end)
	return `${text.slice(0, callable.body.getStart() - start)}{ ${marker('statement', 'void 0;')} }${text.slice(callable.body.end - start)}`
}

function makeCandidate(
	path: string,
	sourceText: string,
	node: ts.Node,
	name: string,
	targetKind: ImplementationTargetKind,
	regionKind: RegionKind,
	implementationRegionKind: RegionKind,
	shellSource: string,
	discoveryReason: string
): CandidateTarget {
	return {
		path,
		sourceText,
		start: node.getStart(),
		end: node.end,
		qualifiedName: qualifiedName(node, name),
		name,
		targetKind,
		regionKind,
		implementationRegionKind,
		symbolSpace: 'value',
		exported: isExported(node),
		declarationStart: node.getStart(),
		declarationEnd: node.end,
		shellSource,
		discoveryReasons: [discoveryReason],
		globallyMergeable: !ts.isExternalModule(node.getSourceFile())
	}
}

function hasCallableTypeSyntax(type: ts.TypeNode): boolean {
	if (ts.isFunctionTypeNode(type) || ts.isConstructorTypeNode(type)) return true
	if (ts.isTypeLiteralNode(type)) {
		return type.members.some(member => ts.isCallSignatureDeclaration(member) || ts.isConstructSignatureDeclaration(member))
	}
	if (ts.isParenthesizedTypeNode(type)) return hasCallableTypeSyntax(type.type)
	if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) return type.types.some(hasCallableTypeSyntax)
	return false
}

function scanPredefinedTargets(
	path: string,
	sourceText: string,
	enabled: ReadonlySet<ImplementationTargetKind>,
	exactBodies: ReadonlySet<string>,
	exactExpressions: ReadonlySet<string>,
	diagnostics: ImplementationEnforcementDiagnostic[]
): CandidateTarget[] {
	const sourceFile = ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true, scriptKind(path))
	const candidates: CandidateTarget[] = []
	const callableCounts = new Map<string, number>()

	function recordCallable(node: ts.FunctionDeclaration | ts.MethodDeclaration): void {
		const name = nodeName(node)
		if (name === undefined) return
		const key = `${node.kind}:${qualifiedName(node, name)}`
		callableCounts.set(key, (callableCounts.get(key) ?? 0) + 1)
	}
	function count(node: ts.Node): void {
		if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) recordCallable(node)
		ts.forEachChild(node, count)
	}
	count(sourceFile)

	function visit(node: ts.Node): void {
		if ((enabled.has('declaredCallable') || enabled.has('declaredValue'))
			&& ts.isVariableStatement(node) && hasModifier(node, ts.SyntaxKind.DeclareKeyword)) {
			if (node.declarationList.declarations.length !== 1) {
				diagnostics.push(implementationDiagnostic('AmbiguousImplementationDeclaration', 'Ambient variable statements with multiple declarations cannot be completed safely.', {
					path, start: node.getStart(), end: node.end
				}))
			} else {
				const declaration = node.declarationList.declarations[0]!
				if (!ts.isIdentifier(declaration.name) || declaration.type === undefined || declaration.initializer !== undefined) {
					diagnostics.push(implementationDiagnostic('UnsafeDeclaredCallableTarget', 'Ambient implementation targets require one identifier, an explicit type, and no initializer.', {
						path, start: node.getStart(), end: node.end
					}))
				} else if (hasCallableTypeSyntax(declaration.type)) {
					if (enabled.has('declaredCallable')) candidates.push(makeCandidate(path, sourceText, node, declaration.name.text, 'declaredCallable', 'declaration', 'expression', shellVariableStatement(sourceText, node), 'configured declaredCallable rule'))
				} else if (enabled.has('declaredValue')) {
					candidates.push(makeCandidate(path, sourceText, node, declaration.name.text, 'declaredValue', 'declaration', 'expression', shellVariableStatement(sourceText, node), 'configured declaredValue rule'))
				} else {
					diagnostics.push(implementationDiagnostic('NonCallableDeclaredTarget', `Ambient value ${declaration.name.text} does not use explicit callable type syntax.`, {
						path, start: node.getStart(), end: node.end, actual: declaration.type.getText(sourceFile)
					}))
				}
			}
		}

		if (enabled.has('bodylessFunction') && ts.isFunctionDeclaration(node) && node.body === undefined && node.name !== undefined) {
			const key = `${node.kind}:${qualifiedName(node, node.name.text)}`
			if ((callableCounts.get(key) ?? 0) !== 1) diagnostics.push(implementationDiagnostic(
				'AmbiguousImplementationOverload', `Function ${qualifiedName(node, node.name.text)} participates in an overload set and cannot be completed as one target.`,
				{ path, start: node.getStart(), end: node.end }
			))
			else candidates.push(makeCandidate(path, sourceText, node, node.name.text, 'bodylessFunction', 'declaration', 'statement', shellBodyDeclaration(sourceText, node), 'configured bodylessFunction rule'))
		}

		if (enabled.has('bodylessMethod') && ts.isMethodDeclaration(node) && node.body === undefined) {
			const name = nodeName(node)
			if (name !== undefined) {
				const key = `${node.kind}:${qualifiedName(node, name)}`
				if ((callableCounts.get(key) ?? 0) !== 1) diagnostics.push(implementationDiagnostic(
					'AmbiguousImplementationOverload', `Method ${qualifiedName(node, name)} participates in an overload set and cannot be completed as one target.`,
					{ path, start: node.getStart(), end: node.end }
				))
				else candidates.push(makeCandidate(path, sourceText, node, name, 'bodylessMethod', 'classMember', 'statement', shellBodyDeclaration(sourceText, node), 'configured bodylessMethod rule'))
			}
		}

		if (enabled.has('missingPropertyInitializer') && ts.isPropertyDeclaration(node)
			&& node.initializer === undefined && node.type !== undefined
			&& node.questionToken === undefined && node.exclamationToken === undefined
			&& !hasModifier(node, ts.SyntaxKind.AbstractKeyword)) {
			const name = nodeName(node)
			if (name !== undefined) candidates.push(makeCandidate(path, sourceText, node, name, 'missingPropertyInitializer', 'classMember', 'expression', shellProperty(sourceText, node), 'configured missingPropertyInitializer rule'))
		}

		if (enabled.has('placeholderBody') && (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node))
			&& node.body !== undefined && exactBodies.has(node.body.getText(sourceFile))) {
			const name = nodeName(node)
			const shellSource = replaceNodeBody(sourceText, node)
			if (name !== undefined && shellSource !== undefined) candidates.push(makeCandidate(
				path, sourceText, node, name, 'placeholderBody', ts.isMethodDeclaration(node) ? 'classMember' : 'declaration', 'statement', shellSource,
				'configured exact placeholder body profile'
			))
		}

		if (enabled.has('placeholderBody') && ts.isVariableStatement(node) && node.declarationList.declarations.length === 1) {
			const declaration = node.declarationList.declarations[0]!
			if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
				if ((ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
					&& ts.isBlock(declaration.initializer.body)
					&& exactBodies.has(declaration.initializer.body.getText(sourceFile))) {
					const shellSource = replaceNestedFunctionBody(sourceText, node, declaration.initializer)
					if (shellSource !== undefined) candidates.push(makeCandidate(path, sourceText, node, declaration.name.text, 'placeholderBody', 'declaration', 'statement', shellSource, 'configured exact placeholder body profile'))
				} else if (exactExpressions.has(declaration.initializer.getText(sourceFile))) {
					candidates.push(makeCandidate(path, sourceText, node, declaration.name.text, 'placeholderBody', 'declaration', 'expression', replaceInitializer(sourceText, node, declaration.initializer), 'configured exact placeholder expression profile'))
				}
			}
		}

		if (enabled.has('placeholderBody') && ts.isPropertyDeclaration(node) && node.initializer !== undefined
			&& exactExpressions.has(node.initializer.getText(sourceFile))) {
			const name = nodeName(node)
			if (name !== undefined) candidates.push(makeCandidate(path, sourceText, node, name, 'placeholderBody', 'classMember', 'expression', replaceInitializer(sourceText, node, node.initializer), 'configured exact placeholder expression profile'))
		}

		ts.forEachChild(node, visit)
	}
	visit(sourceFile)
	return candidates
}

interface ConfiguredSymbolOwnerFacts {
	readonly name: string
	readonly qualifiedName: string
	readonly exported: boolean
	readonly declarationStart: number
	readonly declarationEnd: number
}

function isConfiguredSymbolDeclaration(node: ts.Node): boolean {
	return ts.isVariableDeclaration(node)
		|| ts.isBindingElement(node)
		|| ts.isParameter(node)
		|| ts.isFunctionDeclaration(node)
		|| ts.isFunctionExpression(node)
		|| ts.isClassDeclaration(node)
		|| ts.isClassExpression(node)
		|| ts.isInterfaceDeclaration(node)
		|| ts.isTypeAliasDeclaration(node)
		|| ts.isEnumDeclaration(node)
		|| ts.isEnumMember(node)
		|| ts.isModuleDeclaration(node)
		|| ts.isMethodDeclaration(node)
		|| ts.isMethodSignature(node)
		|| ts.isPropertyDeclaration(node)
		|| ts.isPropertySignature(node)
		|| ts.isPropertyAssignment(node)
		|| ts.isShorthandPropertyAssignment(node)
		|| ts.isGetAccessorDeclaration(node)
		|| ts.isSetAccessorDeclaration(node)
		|| ts.isConstructorDeclaration(node)
		|| ts.isTypeParameterDeclaration(node)
		|| ts.isImportClause(node)
		|| ts.isImportSpecifier(node)
		|| ts.isNamespaceImport(node)
		|| ts.isImportEqualsDeclaration(node)
		|| ts.isExportSpecifier(node)
}

function configuredDeclarationName(node: ts.Node): string | undefined {
	if (ts.isConstructorDeclaration(node)) return 'constructor'
	return nodeName(node)
}

/**
 * Resolve a configured fragment back to its nearest owning declaration. This
 * is what makes a body/initializer/member selector refer to the same compiler
 * symbol as an import at another site; fragment offsets alone cannot do that.
 */
function configuredSymbolOwnerFacts(
	path: string,
	sourceText: string,
	start: number,
	end: number,
	configuredQualifiedName: string
): ConfiguredSymbolOwnerFacts | undefined {
	const sourceFile = ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true, scriptKind(path))
	const enclosing: { readonly node: ts.Node; readonly name: string; readonly qualifiedName: string }[] = []
	const contained: { readonly node: ts.Node; readonly name: string; readonly qualifiedName: string }[] = []
	function visit(node: ts.Node): void {
		if (isConfiguredSymbolDeclaration(node)) {
			const name = configuredDeclarationName(node)
			if (name !== undefined) {
				const owner = { node, name, qualifiedName: qualifiedName(node, name) }
				const declarationStart = node.getStart(sourceFile)
				if (declarationStart <= start && node.end >= end) enclosing.push(owner)
				else if (start <= declarationStart && node.end <= end) contained.push(owner)
			}
		}
		ts.forEachChild(node, visit)
	}
	visit(sourceFile)

	const candidates = enclosing.length > 0 ? enclosing : contained
	const matching = candidates.filter(candidate => candidate.qualifiedName === configuredQualifiedName)
	const selected = matching.length > 1
		? undefined
		: matching[0] ?? (enclosing.length > 0
			? [...enclosing].sort((left, right) => {
				const leftSpan = left.node.end - left.node.getStart(sourceFile)
				const rightSpan = right.node.end - right.node.getStart(sourceFile)
				return leftSpan - rightSpan || left.node.getStart(sourceFile) - right.node.getStart(sourceFile)
			})[0]
			: contained.length === 1 ? contained[0] : undefined)
	if (selected === undefined) return undefined
	return {
		name: selected.name,
		qualifiedName: selected.qualifiedName,
		exported: isExported(selected.node),
		declarationStart: selected.node.getStart(sourceFile),
		declarationEnd: selected.node.end
	}
}

function configuredRangeCandidate(
	configuration: ConfiguredImplementationRange,
	files: ReadonlyMap<string, string>,
	diagnostics: ImplementationEnforcementDiagnostic[]
): CandidateTarget | undefined {
	let path: string
	try { path = normalizeArtifactTargetPath(configuration.path) } catch (error) {
		diagnostics.push(implementationDiagnostic('InvalidImplementationTargetPath', error instanceof Error ? error.message : String(error), {
			path: configuration.path
		}))
		return undefined
	}
	const sourceText = files.get(path)
	if (sourceText === undefined) {
		diagnostics.push(implementationDiagnostic('MissingImplementationTargetFile', `Configured target file ${path} is absent from captured source.`, { path }))
		return undefined
	}
	if (/\.d\.(?:ts|mts|cts)$/u.test(path)) {
		diagnostics.push(implementationDiagnostic('DeclarationFileImplementationTarget', 'Declaration files cannot contain implementation targets.', { path }))
		return undefined
	}

	let start: number | undefined
	let end: number | undefined
	const selector = configuration.selector
	if (selector.kind === 'range') {
		start = selector.start
		end = selector.end
		if (sourceText.slice(start, end) !== selector.expectedText) diagnostics.push(implementationDiagnostic(
			'StaleImplementationTargetRange', `Configured range ${configuration.id} no longer matches its expected text.`,
			{ path, start, end, expected: selector.expectedText, actual: sourceText.slice(start, end) }
		))
	} else if (selector.kind === 'text') {
		const offsets: number[] = []
		for (let offset = sourceText.indexOf(selector.exactText); offset >= 0; offset = sourceText.indexOf(selector.exactText, offset + 1)) offsets.push(offset)
		if (selector.occurrence === undefined && offsets.length !== 1) diagnostics.push(implementationDiagnostic(
			'AmbiguousImplementationTextSelector', `Text selector ${configuration.id} must match exactly once unless occurrence is specified.`,
			{ path, expected: 1, actual: offsets.length }
		))
		const offset = selector.occurrence === undefined ? offsets[0] : offsets[selector.occurrence]
		if (offset === undefined) diagnostics.push(implementationDiagnostic(
			'MissingImplementationTextSelector', `Text selector ${configuration.id} did not resolve the requested occurrence.`,
			{ path, expected: selector.occurrence ?? 0, actual: offsets.length }
		))
		else { start = offset; end = offset + selector.exactText.length }
	} else {
		try {
			const regions = discoverReplacementRegions(sourceText, { filePath: path, templateMode: { kind: 'file' } })
			const matches = regions.filter(region => region.id === selector.markerId)
			if (matches.length !== 1) diagnostics.push(implementationDiagnostic(
				'AmbiguousImplementationMarkerSelector', `Marker ${selector.markerId} must identify exactly one replacement region.`,
				{ path, expected: 1, actual: matches.length }
			))
			else if (matches[0]!.effectiveType !== configuration.regionKind) diagnostics.push(implementationDiagnostic(
				'ImplementationMarkerKindMismatch', `Marker ${selector.markerId} has kind ${matches[0]!.effectiveType}, not ${configuration.regionKind}.`,
				{ path, expected: configuration.regionKind, actual: matches[0]!.effectiveType }
			))
			else { start = matches[0]!.bodyStart; end = matches[0]!.bodyEnd }
		} catch (error) {
			diagnostics.push(implementationDiagnostic('InvalidImplementationMarkerSelector', error instanceof Error ? error.message : String(error), { path }))
		}
	}
	if (start === undefined || end === undefined) return undefined
	if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > sourceText.length) {
		diagnostics.push(implementationDiagnostic('InvalidImplementationTargetRange', 'Implementation target ranges must be non-empty valid UTF-16 ranges.', {
			path, start, end, expected: { minimum: 0, maximum: sourceText.length }
		}))
		return undefined
	}
	const syntaxDiagnostics = validateImplementationRangeSyntax(sourceText.slice(start, end), configuration.regionKind as RegionKind)
	if (syntaxDiagnostics.length > 0) {
		diagnostics.push(...syntaxDiagnostics.map(diagnostic => ({
			...diagnostic,
			path,
			start,
			end
		})))
		return undefined
	}
	const owner = configuredSymbolOwnerFacts(path, sourceText, start, end, configuration.qualifiedName)
	return {
		path, sourceText, start, end,
		qualifiedName: owner?.qualifiedName ?? configuration.qualifiedName,
		name: owner?.name ?? configuration.qualifiedName.split('.').at(-1)!,
		targetKind: 'authorizedRepair',
		regionKind: configuration.regionKind as RegionKind,
		implementationRegionKind: configuration.regionKind as RegionKind,
		symbolSpace: configuration.symbolSpace,
		exported: owner?.exported ?? false,
		declarationStart: owner?.declarationStart ?? start,
		declarationEnd: owner?.declarationEnd ?? end,
		shellSource: directShellSource(configuration.regionKind as RegionKind),
		discoveryReasons: [`configured repair selector ${configuration.id}`],
		globallyMergeable: false
	}
}

function targetSort(left: CandidateTarget, right: CandidateTarget): number {
	return compareCodeUnits(left.path, right.path)
		|| left.start - right.start
		|| left.end - right.end
		|| compareCodeUnits(left.qualifiedName, right.qualifiedName)
}

function targetKey(candidate: CandidateTarget): ImplementationTargetKey {
	return {
		path: candidate.path,
		qualifiedName: candidate.qualifiedName,
		targetKind: candidate.targetKind,
		regionKind: candidate.regionKind,
		symbolSpace: candidate.symbolSpace
	}
}

interface CompletionShellDraft {
	readonly targetId: string
	readonly rootTemplateId: string
	readonly outputRegionKind: RegionKind
	readonly implementationRegionKind: RegionKind
	readonly source: string
}

function instantiateCompletionShell(draft: CompletionShellDraft): GraphTemplateDefinition<any, string, any> {
	return defineTemplate({
		modelId: draft.rootTemplateId,
		version: '1',
		description: `Contract-preserving completion shell for ${draft.targetId}.`,
		inputs: {
			implementation: {
				kind: 'rawCode',
				regionKind: draft.implementationRegionKind,
				required: true,
				description: 'The only implementation region authorized by this completion shell.'
			}
		},
		output: { kind: draft.outputRegionKind },
		source: draft.source
	})
}

/** Recreate and authenticate the executable root template described by a shell manifest. */
export function createCompletionShellTemplate(manifest: CompletionShellManifest): GraphTemplateDefinition<any, string, any> {
	if (manifest.schemaVersion !== 1 || manifest.rootTemplateVersion !== '1' || manifest.implementationInputName !== 'implementation') {
		throw new TypeError('Completion shell manifest uses an unsupported contract version.')
	}
	if (digest(manifest.source) !== manifest.sourceHash) throw new TypeError('Completion shell sourceHash does not match source bytes.')
	const template = instantiateCompletionShell({
		targetId: manifest.targetId,
		rootTemplateId: manifest.rootTemplateId,
		outputRegionKind: manifest.outputRegionKind as RegionKind,
		implementationRegionKind: manifest.implementationRegionKind as RegionKind,
		source: manifest.source
	})
	if (template.manifestDigest !== manifest.rootTemplateManifestDigest) {
		throw new TypeError('Completion shell template manifest digest does not match its executable definition.')
	}
	return template
}

function completeCandidate(
	candidate: CandidateTarget,
	diagnostics: ImplementationEnforcementDiagnostic[]
): { target: DiscoveredImplementationTarget; unresolved?: UnresolvedValueSymbol } | undefined {
	const key = targetKey(candidate)
	const baseContentHash = digest(candidate.sourceText)
	const baseArtifactFileHash = createArtifactSetFileHash(candidate.sourceText)
	const targetId = identity('it', ['implementation-target', IMPLEMENTATION_TARGET_DISCOVERY_VERSION, key, baseContentHash, candidate.start, candidate.end])
	const rootTemplateId = `project.completion.${targetId}`
	let template: GraphTemplateDefinition<any, string, any>
	try {
		template = instantiateCompletionShell({
			targetId,
			rootTemplateId,
			outputRegionKind: candidate.regionKind,
			implementationRegionKind: candidate.implementationRegionKind,
			source: candidate.shellSource
		})
	} catch (error) {
		diagnostics.push(implementationDiagnostic('InvalidCompletionShell', error instanceof Error ? error.message : String(error), {
			path: candidate.path, targetId, start: candidate.start, end: candidate.end
		}))
		return undefined
	}
	const sourceHash = digest(candidate.shellSource)
	const declarationContractHash = digest(canonicalizeJson([
		key,
		candidate.sourceText.slice(candidate.start, candidate.end),
		candidate.shellSource.replace(marker(candidate.implementationRegionKind, PLACEHOLDERS[candidate.implementationRegionKind]), '<implementation>')
	]))
	const completionShell: CompletionShellManifest = {
		schemaVersion: 1,
		targetId,
		rootTemplateId,
		rootTemplateVersion: '1',
		outputRegionKind: candidate.regionKind,
		implementationRegionKind: candidate.implementationRegionKind,
		implementationInputName: 'implementation',
		source: candidate.shellSource,
		sourceHash,
		declarationContractHash,
		rootTemplateManifestDigest: template.manifestDigest
	}
	const symbolId = identity('sym', ['implementation-symbol', key, candidate.name, candidate.declarationStart, candidate.declarationEnd])
	const symbol: ImplementationSymbolFact = {
		schemaVersion: 1,
		symbolId,
		name: candidate.name,
		qualifiedName: candidate.qualifiedName,
		space: candidate.symbolSpace,
		path: candidate.path,
		declarationStart: candidate.declarationStart,
		declarationEnd: candidate.declarationEnd,
		exported: candidate.exported
	}
	const unresolved = candidate.symbolSpace === 'value'
		? {
			schemaVersion: 1 as const,
			symbolId: identity('uv', ['unresolved-implementation-value', key]),
			targetId,
			path: candidate.path,
			name: candidate.name,
			qualifiedName: candidate.qualifiedName,
			declarationStart: candidate.declarationStart,
			declarationEnd: candidate.declarationEnd
		}
		: undefined
	const target: DiscoveredImplementationTarget = {
		schemaVersion: 1,
		targetKey: key,
		targetId,
		path: candidate.path,
		start: candidate.start,
		end: candidate.end,
		baseContentHash,
		baseArtifactFileHash,
		targetTextHash: digest(candidate.sourceText.slice(candidate.start, candidate.end)),
		regionKind: candidate.regionKind,
		implementationRegionKind: candidate.implementationRegionKind,
		requiredRootTemplateId: rootTemplateId,
		requiredRootTemplateManifestDigest: template.manifestDigest,
		completionShell,
		symbol,
		...(unresolved === undefined ? {} : { unresolvedValueSymbolId: unresolved.symbolId }),
		discoveryReasons: [...candidate.discoveryReasons]
	}
	return { target, ...(unresolved === undefined ? {} : { unresolved }) }
}

/**
 * Discover snapshot-bound project implementation targets from captured bytes.
 *
 * The API never reads the workspace. Predefined executable forms are enabled
 * explicitly, placeholder discovery uses exact caller profiles, and all other
 * region kinds require a configured non-empty range/marker/text selector.
 */
export function discoverImplementationTargets(
	options: ImplementationTargetDiscoveryOptions
): ImplementationTargetDiscoveryResult {
	const diagnostics: ImplementationEnforcementDiagnostic[] = []
	let files: Map<string, string>
	try { files = sourceFiles(options) } catch (error) {
		diagnostics.push(implementationDiagnostic('InvalidCapturedImplementationSources', error instanceof Error ? error.message : String(error)))
		return {
			schemaVersion: 1,
			ok: false,
			discoveryDigest: identity('disc', ['implementation-discovery', 1, [], diagnostics]),
			targets: [], unresolvedValues: [], diagnostics
		}
	}
	const enabled = new Set<ImplementationTargetKind>(options.enabledTargetKinds)
	for (const [index, kind] of options.enabledTargetKinds.entries()) {
		if (!IMPLEMENTATION_TARGET_KIND_VALUES.includes(kind)) diagnostics.push(implementationDiagnostic(
			'InvalidImplementationTargetRule', `Unsupported predefined implementation target rule ${kind}.`,
			{ path: `enabledTargetKinds[${index}]`, actual: kind }
		))
	}
	const exactBodies = new Set(options.exactPlaceholderBodies ?? [])
	const exactExpressions = new Set(options.exactPlaceholderExpressions ?? [])
	if (enabled.has('placeholderBody') && exactBodies.size === 0 && exactExpressions.size === 0) diagnostics.push(implementationDiagnostic(
		'EmptyPlaceholderProfile', 'placeholderBody discovery requires at least one exact body or expression profile.',
		{ path: 'exactPlaceholderBodies' }
	))

	const eligiblePaths = new Set<string>()
	for (const authoredPath of options.sourcePaths ?? files.keys()) {
		try {
			const path = normalizeArtifactTargetPath(authoredPath)
			eligiblePaths.add(path)
			if (!files.has(path)) diagnostics.push(implementationDiagnostic(
				'MissingImplementationSourcePath', `Configured implementation source ${path} is absent from captured files.`, { path }
			))
		} catch (error) {
			diagnostics.push(implementationDiagnostic('InvalidImplementationSourcePath', error instanceof Error ? error.message : String(error), { path: authoredPath }))
		}
	}

	const candidates: CandidateTarget[] = []
	for (const [path, sourceText] of [...files].sort(([left], [right]) => compareCodeUnits(left, right))) {
		if (!eligiblePaths.has(path)) continue
		if (!/\.(?:[cm]?tsx?|[cm]?jsx?)$/u.test(path)) continue
		if (/\.d\.(?:ts|mts|cts)$/u.test(path)) {
			const rejected = scanPredefinedTargets(path, sourceText, enabled, exactBodies, exactExpressions, diagnostics)
			for (const candidate of rejected) diagnostics.push(implementationDiagnostic(
				'DeclarationFileImplementationTarget', 'Declaration files cannot contain implementation targets.',
				{ path, start: candidate.start, end: candidate.end, actual: targetKey(candidate) }
			))
			continue
		}
		candidates.push(...scanPredefinedTargets(path, sourceText, enabled, exactBodies, exactExpressions, diagnostics))
	}
	for (const configuration of options.configuredRanges ?? []) {
		let configuredPath: string | undefined
		try { configuredPath = normalizeArtifactTargetPath(configuration.path) } catch { /* diagnosed by selector resolution */ }
		if (configuredPath !== undefined && !eligiblePaths.has(configuredPath)) {
			diagnostics.push(implementationDiagnostic('UnauthorizedImplementationSourcePath', `Configured target ${configuration.id} is outside the eligible implementation source set.`, { path: configuredPath }))
			continue
		}
		const candidate = configuredRangeCandidate(configuration, files, diagnostics)
		if (candidate !== undefined) candidates.push(candidate)
	}

	const uniqueCandidates = new Map<string, CandidateTarget>()
	for (const candidate of candidates) {
		const rangeKey = canonicalizeJson([candidate.path, candidate.start, candidate.end])
		const existing = uniqueCandidates.get(rangeKey)
		if (existing === undefined) uniqueCandidates.set(rangeKey, candidate)
		else if (canonicalizeJson(targetKey(existing)) !== canonicalizeJson(targetKey(candidate))) diagnostics.push(implementationDiagnostic(
			'AmbiguousImplementationTarget', 'Two discovery rules assign different identities to the same source range.',
			{ path: candidate.path, start: candidate.start, end: candidate.end, expected: targetKey(existing), actual: targetKey(candidate) }
		))
	}
	const ordered = [...uniqueCandidates.values()].sort(targetSort)
	const mergeGroups = new Map<string, CandidateTarget[]>()
	for (const candidate of ordered) {
		if (!candidate.globallyMergeable) continue
		const key = canonicalizeJson([candidate.symbolSpace, candidate.qualifiedName])
		const group = mergeGroups.get(key)
		if (group === undefined) mergeGroups.set(key, [candidate])
		else group.push(candidate)
	}
	for (const group of mergeGroups.values()) {
		if (group.length < 2) continue
		for (const candidate of group) diagnostics.push(implementationDiagnostic(
			'AmbiguousImplementationDeclarationMerge', `Global implementation symbol ${candidate.qualifiedName} is declared in more than one captured file.`,
			{ path: candidate.path, start: candidate.start, end: candidate.end, actual: group.map(item => item.path) }
		))
	}
	for (let index = 1; index < ordered.length; index += 1) {
		const previous = ordered[index - 1]!
		const current = ordered[index]!
		if (previous.path === current.path && current.start < previous.end) diagnostics.push(implementationDiagnostic(
			'OverlappingImplementationTargets', 'Implementation target ranges must not overlap.',
			{ path: current.path, start: current.start, end: current.end, expected: { previousStart: previous.start, previousEnd: previous.end } }
		))
	}
	const logicalKeys = new Set<string>()
	for (const candidate of ordered) {
		const key = canonicalizeJson(targetKey(candidate))
		if (logicalKeys.has(key)) diagnostics.push(implementationDiagnostic(
			'DuplicateImplementationTargetKey', `Logical implementation target ${candidate.qualifiedName} is ambiguous.`,
			{ path: candidate.path, start: candidate.start, end: candidate.end, actual: targetKey(candidate) }
		))
		logicalKeys.add(key)
	}

	const completed = ordered.map(candidate => completeCandidate(candidate, diagnostics)).filter((value): value is NonNullable<typeof value> => value !== undefined)
	const targets = completed.map(value => value.target)
	const unresolvedValues = completed.flatMap(value => value.unresolved === undefined ? [] : [value.unresolved])
	const discoveryDigest = identity('disc', [
		'implementation-discovery', IMPLEMENTATION_TARGET_DISCOVERY_VERSION,
		targets.map(target => ({ ...target, completionShell: target.completionShell })),
		unresolvedValues,
		diagnostics
	])
	return {
		schemaVersion: 1,
		ok: !diagnostics.some(diagnostic => diagnostic.severity === 'error'),
		discoveryDigest,
		targets,
		unresolvedValues,
		diagnostics
	}
}

/** Validate that a configured range fragment is syntactically valid for its declared RegionKind. */
export function validateImplementationRangeSyntax(
	sourceText: string,
	regionKind: RegionKind
): ImplementationEnforcementDiagnostic[] {
	try {
		if (sourceText.trim().length === 0) throw new TypeError('Implementation range syntax must be non-empty.')
		const mode = templateModeForRegionKind(regionKind)
		const wrapped = wrapTemplateSource(sourceText, mode)
		const sourceFile = ts.createSourceFile('__implementation_range__.ts', wrapped.wrappedText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
		const parseDiagnostics = (sourceFile as ts.SourceFile & { readonly parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics
		if (parseDiagnostics.length > 0) {
			throw new TypeError(parseDiagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')).join('\n'))
		}
		discoverReplacementRegions(marker(regionKind, sourceText), { templateMode: mode })
		if (['identifier', 'expression', 'array', 'object', 'string', 'number', 'boolean', 'null'].includes(regionKind)) {
			const statement = sourceFile.statements.find(ts.isVariableStatement)
			let expression = statement?.declarationList.declarations[0]?.initializer
			while (expression !== undefined && ts.isParenthesizedExpression(expression)) expression = expression.expression
			const matches = expression !== undefined && (
				(regionKind === 'identifier' && ts.isIdentifier(expression))
				|| (regionKind === 'expression' && ts.isExpression(expression))
				|| (regionKind === 'array' && ts.isArrayLiteralExpression(expression))
				|| (regionKind === 'object' && ts.isObjectLiteralExpression(expression))
				|| (regionKind === 'string' && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)))
				|| (regionKind === 'number' && (ts.isNumericLiteral(expression)
					|| (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(expression.operand))))
				|| (regionKind === 'boolean' && (expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword))
				|| (regionKind === 'null' && expression.kind === ts.SyntaxKind.NullKeyword)
			)
			if (!matches) throw new TypeError(`Expected exactly one ${regionKind} syntax node.`)
		}
		return []
	} catch (error) {
		return [implementationDiagnostic('InvalidImplementationRangeSyntax', error instanceof Error ? error.message : String(error), {
			actual: { regionKind, sourceText }, expected: templateModeForRegionKind(regionKind)
		})]
	}
}
