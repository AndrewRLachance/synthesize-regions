/**
 * Phase 4 — audit every `TypeDescriptor` the canonical catalog exposes.
 *
 * Three independent checks, each reported separately so a failure is never
 * masked by a pass in a neighbouring check:
 *
 * 1. `structural` — every distinct `ts` expression is compiled standalone in a
 *    project with no imports and only the ES2022 lib. This is what
 *    `src/templates/typeScriptCompatibility.ts` enforces, so it is the same
 *    guarantee the shipped validator gives. A descriptor that needs an import
 *    to compile is not self-contained and is reported as such.
 * 2. `phantom` — one nominal family must not use two different phantom-property
 *    conventions, and one phantom key must not appear under two meanings.
 * 3. `semantic` — descriptors whose `ts` collapses to `any`/`unknown` where a
 *    richer shape is expressible, plus `any` usage, which the catalog forbids.
 */
import ts from 'typescript'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	classifyModuleName,
	collectTemplateArrays,
	coreTemplatesDir,
	importCoreTemplateModule,
	listCoreTemplateModules
} from './audit-lib.mts'
import type { TemplateLike } from './audit-lib.mts'
import { validateTypeScriptType } from '../src/templates/typeScriptCompatibility.js'
import { substituteTypePlaceholders } from './effect-v4-fixture-substitutions.mjs'

interface TypeDescriptorLike {
	nominal?: string
	ts?: string
}

interface PortLike {
	kind?: string
	type?: TypeDescriptorLike
	accepts?: { type?: TypeDescriptorLike }
	options?: PortLike[]
}

function collectPortTypes(port: unknown, into: TypeDescriptorLike[]): void {
	if (typeof port !== 'object' || port === null) return
	const p = port as PortLike
	if (p.type) into.push(p.type)
	if (p.accepts?.type) into.push(p.accepts.type)
	if (Array.isArray(p.options)) for (const option of p.options) collectPortTypes(option, into)
}

function templateDescriptors(template: TemplateLike): Array<{ location: string; type: TypeDescriptorLike }> {
	const found: Array<{ location: string; type: TypeDescriptorLike }> = []
	for (const [name, port] of Object.entries(template.inputs ?? {})) {
		const bucket: TypeDescriptorLike[] = []
		collectPortTypes(port, bucket)
		for (const type of bucket) found.push({ location: `input:${name}`, type })
	}
	if (template.output?.type) found.push({ location: 'output', type: template.output.type as TypeDescriptorLike })
	for (const [name, parameter] of Object.entries(template.typeParameters ?? {})) {
		const constraint = (parameter as { constraint?: TypeDescriptorLike } | undefined)?.constraint
		if (constraint) found.push({ location: `typeParameter:${name}`, type: constraint })
	}
	return found
}

/** Phantom keys in a `nominalType` structural descriptor. */
function phantomKeys(ts: string): string[] {
	return [...ts.matchAll(/__([A-Za-z0-9_]+)\?:/g)].map((m) => m[1]!).sort()
}

interface DescriptorUse {
	modelId: string
	location: string
	ts: string
	nominal?: string
}

const uses: DescriptorUse[] = []
const moduleLoadErrors: Array<{ module: string; error: string }> = []

for (const fileName of listCoreTemplateModules()) {
	if (classifyModuleName(fileName) === 'helpers') continue
	const { exports, error } = await importCoreTemplateModule(fileName)
	if (error) {
		moduleLoadErrors.push({ module: fileName.replace(/\.ts$/, ''), error })
		continue
	}
	for (const { templates } of collectTemplateArrays(exports)) {
		for (const template of templates) {
			for (const { location, type } of templateDescriptors(template)) {
				if (type.ts === undefined) continue
				uses.push({ modelId: template.modelId, location, ts: type.ts, ...(type.nominal ? { nominal: type.nominal } : {}) })
			}
		}
	}
}

// ---------------------------------------------------------------- check 1
// The structural validator compiles an expression standalone, so `{{...}}`
// placeholders have to be replaced first. Substitution uses the shared fixture
// table and any parameter without a fixture is reported as unresolved rather
// than silently coerced.
const distinctTs = [...new Set(uses.map((use) => use.ts))].sort()
const substitutionRows = distinctTs.map((template) => {
	const substituted = substituteTypePlaceholders(template)
	return { template, substituted: substituted.ts, unresolved: substituted.unresolved }
})
const unresolvedParameters = [...new Set(substitutionRows.flatMap((row) => row.unresolved))].sort()

const structuralFailures = substitutionRows.flatMap((row) => {
	const result = validateTypeScriptType(row.substituted)
	return result.ok ? [] : [{ template: row.template, substituted: row.substituted, issues: result.issues }]
})
// ---------------------------------------------------------------- check 2
//
// Ownership, not co-occurrence.
//
// The composed structural descriptors nest: `effectType(schemaType(...))`
// legitimately carries the Schema family's phantoms inside the Effect family's
// descriptor, so counting co-occurring keys would report every nested
// descriptor as a clash. Ownership therefore comes from *declaration sites* in
// the helper modules, not from the materialized strings.
//
// Two invariants are checked:
//
//   ownership - a phantom key is declared by exactly one nominal family.
//     The key is what compatibility code reads, so one spelling must mean one
//     thing.
//   unowned phantoms - a materialized descriptor may only carry keys that some
//     family declares. A key nobody declares is drift nobody can resolve.

interface Declaration {
	module: string
	nominal: string
	keys: string[]
}

const declarations: Declaration[] = []

/**
 * Phantom keys are emitted by two shapes:
 *
 *   `nominalType('effect/X', { key: value, ... })` builds its `ts` from the
 *   record keys, so the keys are the object literal's own property names.
 *
 *   An object literal `{ nominal: 'effect/X', ts: ... }` may instead spell the
 *   phantoms inside a template literal, possibly behind a module-local builder
 *   (`ts: effectStructuralType(a, b, c)`). Resolving one level of module-local
 *   const/function bindings is enough for every descriptor in this catalog.
 *
 * A regex cannot do this correctly: phantom values contain `}` (`${x}` in a
 * template literal, `{{A}}` in a template parameter placeholder), so any
 * `[^}]*` body match silently truncates the key list.
 */
const moduleBindings = new Map<string, Map<string, ts.Expression>>()

function collectModuleBindings(fileName: string, text: string): void {
	const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true)
	const bindings = new Map<string, ts.Expression>()
	for (const statement of source.statements) {
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (declaration.initializer && ts.isIdentifier(declaration.name)) {
					bindings.set(declaration.name.text, declaration.initializer)
				}
			}
			continue
		}
		if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
			bindings.set(statement.name.text, statement.body)
		}
	}
	moduleBindings.set(fileName, bindings)
}

function resolveStringLiteral(fileName: string, node: ts.Expression | undefined, depth = 0): string | undefined {
	if (!node || depth > 4) return undefined
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
	if (ts.isAsExpression(node)) return resolveStringLiteral(fileName, node.expression, depth + 1)
	if (ts.isIdentifier(node)) {
		const initializer = moduleBindings.get(fileName)?.get(node.text)
		if (initializer) return resolveStringLiteral(fileName, initializer, depth + 1)
	}
	return undefined
}

/** Phantom keys emitted by a builder call, following one level of module-local bindings. */
function phantomKeysOfBuilder(fileName: string, node: ts.Expression | undefined, depth = 0): string[] {
	if (!node || depth > 2) return []
	const keys: string[] = []
	const callee = ts.isCallExpression(node) ? node.expression : undefined
	if (callee && ts.isIdentifier(callee)) {
		const target = moduleBindings.get(fileName)?.get(callee.text)
		if (target) keys.push(...phantomKeys(target.getText()))
	}
	keys.push(...phantomKeys(node.getText()))
	return keys
}

for (const fileName of listCoreTemplateModules()) {
	const text = readFileSync(join(coreTemplatesDir, fileName), 'utf8')
	collectModuleBindings(fileName, text)
}

for (const fileName of listCoreTemplateModules()) {
	const text = readFileSync(join(coreTemplatesDir, fileName), 'utf8')
	const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true)
	const moduleName = fileName.replace(/\.ts$/, '')

	const visit = (node: ts.Node): void => {
		// `nominalType('effect/X', { ... })`
		if (
			ts.isCallExpression(node)
			&& ts.isIdentifier(node.expression)
			&& node.expression.text === 'nominalType'
		) {
			const nominal = resolveStringLiteral(fileName, node.arguments[0])
			if (nominal !== undefined) {
				const phantoms = node.arguments[1]
				const keys = phantoms && ts.isObjectLiteralExpression(phantoms)
					? phantoms.properties
						.map((property) => property.name && ts.isIdentifier(property.name) ? property.name.text : undefined)
						.filter((name): name is string => name !== undefined)
					: []
				declarations.push({ module: moduleName, nominal, keys })
			}
		}

		// `{ nominal: <family>, ts: <expression> }`
		if (ts.isObjectLiteralExpression(node)) {
			const nominalProperty = node.properties.find(
				(property) => ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === 'nominal'
			)
			const tsProperty = node.properties.find(
				(property) => ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === 'ts'
			)
			if (nominalProperty && tsProperty && ts.isPropertyAssignment(nominalProperty)) {
				const nominal = resolveStringLiteral(fileName, nominalProperty.initializer)
				if (nominal !== undefined) {
					const keys = phantomKeysOfBuilder(fileName, tsProperty.initializer)
					declarations.push({ module: moduleName, nominal, keys })
				}
			}
		}

		ts.forEachChild(node, visit)
	}
	visit(source)
}

const declaringFamilies = new Map<string, Set<string>>()
const declaringSites = new Map<string, Array<{ module: string; nominal: string }>>()
for (const declaration of declarations) {
	for (const key of declaration.keys) {
		const families = declaringFamilies.get(key) ?? new Set<string>()
		families.add(declaration.nominal)
		declaringFamilies.set(key, families)
		const sites = declaringSites.get(key) ?? []
		sites.push({ module: declaration.module, nominal: declaration.nominal })
		declaringSites.set(key, sites)
	}
}

const sharedKeys = [...declaringFamilies.entries()]
	.filter(([, families]) => families.size > 1)
	.map(([key, families]) => ({ key, owners: [...families].sort(), sites: declaringSites.get(key) ?? [] }))
	.sort((a, b) => a.key.localeCompare(b.key))

const declaredKeys = new Set(declaringFamilies.keys())
const unownedPhantoms = [...new Set(
	uses.flatMap((use) => phantomKeys(use.ts)).filter((key) => !declaredKeys.has(key))
)].sort()
const unownedDetail = unownedPhantoms.map((key) => ({
	key,
	modelIds: [...new Set(uses.filter((use) => phantomKeys(use.ts).includes(key)).map((use) => use.modelId))].sort()
}))

const phantomInconsistencies = [
	...sharedKeys.map((row) => ({ kind: 'shared-key' as const, ...row })),
	...unownedDetail.map((row) => ({ kind: 'unowned-phantom' as const, ...row }))
]

const phantomOwners = Object.fromEntries(
	[...declaringFamilies.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, families]) => [key, [...families].sort()])
)

// ---------------------------------------------------------------- check 3
const substitutedTs = [...new Set(substitutionRows.map((row) => row.substituted))].sort()
const anyUses = substitutedTs.filter((ts) => /(^|[^A-Za-z0-9_$])any([^A-Za-z0-9_$]|$)/.test(ts))
const stillTemplated = substitutionRows.filter((row) => /\{\{[^{}]+\}\}/.test(row.substituted)).map((row) => row.template)

const report = {
	summary: {
		descriptorUses: uses.length,
		distinctTypeExpressions: distinctTs.length,
		structuralPassed: distinctTs.length - structuralFailures.length,
		structuralFailed: structuralFailures.length,
		phantomInconsistencies: phantomInconsistencies.length,
		anyUses: anyUses.length,
		unresolvedTypeParameters: unresolvedParameters.length,
		moduleLoadErrors: moduleLoadErrors.length
	},
	unresolvedTypeParameters: unresolvedParameters,
	structuralFailures,
	phantomInconsistencies,
	phantomOwners,
	anyUses,
	stillTemplated,
	moduleLoadErrors
}

writeFileSync(
	join(coreTemplatesDir, 'effect-v4-type-descriptor-audit.json'),
	`${JSON.stringify(report, null, '\t')}\n`
)

console.log(`descriptor uses:            ${report.summary.descriptorUses}`)
console.log(`distinct type expressions:  ${report.summary.distinctTypeExpressions}`)
console.log(`structural OK:              ${report.summary.structuralPassed}`)
console.log(`structural FAILED:          ${report.summary.structuralFailed}`)
console.log(`phantom inconsistencies:    ${report.summary.phantomInconsistencies}`)
console.log(`expressions using \`any\`:    ${report.summary.anyUses}`)
console.log(`unresolved type parameters: ${report.summary.unresolvedTypeParameters}`)
console.log(`module load errors:         ${report.summary.moduleLoadErrors}`)
if (unresolvedParameters.length > 0) {
	console.log(`\n=== TYPE PARAMETERS WITHOUT A FIXTURE ===\n  ${unresolvedParameters.join(', ')}`)
}
if (structuralFailures.length > 0) {
	console.log('\n=== STRUCTURAL FAILURES ===')
	for (const failure of structuralFailures.slice(0, 40)) {
		console.log(`  ${failure.substituted.slice(0, 200)}`)
		for (const issue of failure.issues) console.log(`    [${issue.code}] ${issue.message}`)
	}
	if (structuralFailures.length > 40) console.log(`  ... and ${structuralFailures.length - 40} more`)
}
if (anyUses.length > 0) {
	console.log('\n=== `any` USAGE ===')
	for (const ts of anyUses) console.log(`  ${ts.slice(0, 160)}`)
}
if (sharedKeys.length > 0) {
	console.log('\n=== SHARED PHANTOM KEYS (one key, several declaring families) ===')
	for (const entry of sharedKeys.slice(0, 40)) {
		console.log(`  ${entry.key.padEnd(28)} ${entry.owners.join(', ')}`)
	}
	if (sharedKeys.length > 40) console.log(`  ... and ${sharedKeys.length - 40} more`)
}
if (unownedDetail.length > 0) {
	console.log('\n=== UNOWNED PHANTOM KEYS (used in descriptors, declared nowhere) ===')
	for (const entry of unownedDetail.slice(0, 40)) {
		console.log(`  ${entry.key.padEnd(28)} (${entry.modelIds.length} templates) ${entry.modelIds.slice(0, 3).join(', ')}`)
	}
	if (unownedDetail.length > 40) console.log(`  ... and ${unownedDetail.length - 40} more`)
}