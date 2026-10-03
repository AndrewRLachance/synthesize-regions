/**
 * Phase 3b — audit every `TypeDescriptor.nominal` family referenced by the
 * catalog against the pinned `effect` package.
 *
 * `nominal` is documentation/triage metadata: the *compilable* contract is the
 * structural `ts` field (see `nominalType` in `effect-template-helpers.ts`).
 * It still matters, because a nominal string that points at a path the pinned
 * version does not publish sends planners and reviewers to code that cannot be
 * imported.
 *
 * This script therefore resolves each nominal string as an import specifier and
 * reports which ones are real, which are stale V3-style promoted paths, and
 * which already match the published `unstable` layout.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import {
	artifactsDir,
	classifyModuleName,
	collectTemplateArrays,
	coreTemplatesDir,
	importCoreTemplateModule,
	listCoreTemplateModules
} from './lib.mts'
import type { TemplateLike } from './lib.mts'
import { effectDir, effectPkg, resolveEffectSpecifier } from './effect-import-resolver.mts'

interface TypeDescriptorLike {
	nominal?: string
	ts?: string
}

interface PortLike {
	kind?: string
	regionKind?: string
	type?: TypeDescriptorLike
	accepts?: { type?: TypeDescriptorLike }
	options?: PortLike[]
}

function collectPortTypes(port: unknown, into: TypeDescriptorLike[], location: string): void {
	if (typeof port !== 'object' || port === null) return
	const p = port as PortLike
	if (p.type) into.push(p.type)
	if (p.accepts?.type) into.push(p.accepts.type)
	if (Array.isArray(p.options)) {
		for (const option of p.options) collectPortTypes(option, into, location)
	}
}

function templateDescriptors(template: TemplateLike): Array<{ location: string; type: TypeDescriptorLike }> {
	const found: Array<{ location: string; type: TypeDescriptorLike }> = []
	for (const [name, port] of Object.entries(template.inputs ?? {})) {
		const bucket: TypeDescriptorLike[] = []
		collectPortTypes(port, bucket, name)
		for (const type of bucket) found.push({ location: `input:${name}`, type })
	}
	if (template.output?.type) found.push({ location: 'output', type: template.output.type as TypeDescriptorLike })
	for (const [name, parameter] of Object.entries(template.typeParameters ?? {})) {
		const constraint = (parameter as { constraint?: TypeDescriptorLike } | undefined)?.constraint
		if (constraint) found.push({ location: `typeParameter:${name}`, type: constraint })
	}
	return found
}

interface NominalUsage {
	nominal: string
	status: 'resolves' | 'missing' | 'member-not-declared' | 'external-not-installed' | 'not-effect'
	matchedExport?: string
	note?: string
	occurrences: number
	templateIds: string[]
	modules: string[]
	/** Every distinct `ts` string paired with this nominal, for drift detection. */
	structuralForms: string[]
	/** Importable module prefix derived from the nominal spelling. */
	moduleSpecifier?: string
	/** Member path after the module prefix, using Effect's `Module.Member` spelling. */
	member?: string
}

const usage = new Map<string, NominalUsage>()

for (const fileName of listCoreTemplateModules()) {
	if (classifyModuleName(fileName) === 'helpers') continue
	const { exports, error } = await importCoreTemplateModule(fileName)
	if (error) continue
	const moduleName = fileName.replace(/\.ts$/, '')
	for (const { templates } of collectTemplateArrays(exports)) {
		for (const template of templates) {
			for (const { type } of templateDescriptors(template)) {
				if (!type.nominal) continue
				const entry = usage.get(type.nominal) ?? (() => {
					const resolution = resolveEffectSpecifier(type.nominal)
					const created: NominalUsage = {
						nominal: type.nominal,
						status: resolution.status,
						matchedExport: resolution.matchedExport,
						note: resolution.note,
						occurrences: 0,
						templateIds: [],
						modules: [],
						structuralForms: []
					}
					usage.set(type.nominal, created)
					return created
				})()
				entry.occurrences += 1
				if (!entry.templateIds.includes(template.modelId)) entry.templateIds.push(template.modelId)
				if (!entry.modules.includes(moduleName)) entry.modules.push(moduleName)
				if (type.ts && !entry.structuralForms.includes(type.ts)) entry.structuralForms.push(type.ts)
			}
		}
	}
}

const nominals = [...usage.values()].sort((a, b) => a.nominal.localeCompare(b.nominal))

/**
 * Split `effect/unstable/socket/Socket.CloseEvent` into the importable module
 * specifier (`effect/unstable/socket/Socket`) and the member path
 * (`CloseEvent`). Nominal strings follow Effect's own `Module.Member` spelling,
 * so only the module prefix has to be a resolvable subpath.
 */
function splitNominal(nominal: string): { moduleSpecifier: string; member: string } {
	const segments = nominal.split('/')
	const last = segments.pop()!
	const dot = last.indexOf('.')
	if (dot === -1) return { moduleSpecifier: [...segments, last].join('/'), member: '' }
	return { moduleSpecifier: [...segments, last.slice(0, dot)].join('/'), member: last.slice(dot + 1) }
}

/** Type names declared inside a `.d.ts` module, used to check member spelling. */
function declaredNames(moduleSpecifier: string): Set<string> | undefined {
	const resolution = resolveEffectSpecifier(moduleSpecifier)
	if (resolution.status !== 'resolves' || !resolution.target) return undefined
	const declaration = resolution.target.replace(/\.js$/, '.d.ts')
	try {
		const text = readFileSync(join(effectDir, declaration.replace(/^dist[\\/]/, '')), 'utf8')
		const names = new Set<string>()
		for (const match of text.matchAll(/\b(?:declare\s+)?(?:class|interface|type|namespace|const|function|enum|abstract\s+class)\s+([A-Za-z_$][\w$]*)/g)) {
			names.add(match[1]!)
		}
		return names
	} catch {
		return undefined
	}
}

/** Map a stale nominal onto the published spelling, when a real one exists. */
function suggestedPath(nominal: string): string | undefined {
	const { moduleSpecifier, member } = splitNominal(nominal)
	if (resolveEffectSpecifier(moduleSpecifier).status === 'resolves') return undefined

	const segments = moduleSpecifier.split('/')
	const domain = segments[1]
	if (!domain) return undefined

	// `effect/http-api/...` -> `effect/unstable/httpapi/...` (hyphen dropped by the publisher).
	if (domain === 'http-api') {
		const candidate = ['effect', 'unstable', 'httpapi', ...segments.slice(2)].join('/')
		if (resolveEffectSpecifier(candidate).status === 'resolves') {
			return member ? `${candidate}.${member}` : candidate
		}
		return undefined
	}
	// `effect/<domain>/...` -> `effect/unstable/<domain>/...`
	const candidate = ['effect', 'unstable', domain, ...segments.slice(2)].join('/')
	if (resolveEffectSpecifier(candidate).status === 'resolves') {
		return member ? `${candidate}.${member}` : candidate
	}
	return undefined
}

for (const nominal of nominals) {
	if (!nominal.nominal.startsWith('effect/')) continue
	const { moduleSpecifier, member } = splitNominal(nominal.nominal)
	nominal.moduleSpecifier = moduleSpecifier
	nominal.member = member

	const resolution = resolveEffectSpecifier(moduleSpecifier)
	if (resolution.status !== 'resolves') {
		const suggestion = suggestedPath(nominal.nominal)
		nominal.status = 'missing'
		nominal.matchedExport = undefined
		nominal.note = suggestion
			? `module \`${moduleSpecifier}\` is not published; the pinned version ships \`${suggestion}\``
			: `module \`${moduleSpecifier}\` is not published by effect@${effectPkg.version}`
		continue
	}

	nominal.status = 'resolves'
	nominal.matchedExport = resolution.matchedExport

	if (member) {
		const names = declaredNames(moduleSpecifier)
		if (names && !names.has(member)) {
			nominal.status = 'member-not-declared'
			nominal.note = `\`${member}\` is not declared in ${moduleSpecifier}`
		}
	}
}

const report = {
	effectVersion: effectPkg.version,
	summary: {
		distinctNominals: nominals.length,
		resolves: nominals.filter((n) => n.status === 'resolves').length,
		missing: nominals.filter((n) => n.status === 'missing').length,
		memberNotDeclared: nominals.filter((n) => n.status === 'member-not-declared').length,
		externalNotInstalled: nominals.filter((n) => n.status === 'external-not-installed').length,
		other: nominals.filter((n) => n.status === 'not-effect').length,
		totalOccurrences: nominals.reduce((n, x) => n + x.occurrences, 0)
	},
	nominals
}

writeFileSync(
	join(artifactsDir, 'effect-v4-nominal-type-audit.json'),
	`${JSON.stringify(report, null, '\t')}\n`
)

const missing = nominals.filter((n) => n.status === 'missing')
const undeclared = nominals.filter((n) => n.status === 'member-not-declared')
const external = nominals.filter((n) => n.status === 'external-not-installed')
const other = nominals.filter((n) => n.status === 'not-effect')

console.log(`distinct nominal families: ${report.summary.distinctNominals} (${report.summary.totalOccurrences} occurrences)`)
console.log(`  resolves:               ${report.summary.resolves}`)
console.log(`  MISSING MODULE:         ${report.summary.missing}`)
console.log(`  member not declared:    ${report.summary.memberNotDeclared}`)
console.log(`  external not installed: ${report.summary.externalNotInstalled}`)
console.log(`  non-effect:             ${report.summary.other}`)
for (const [label, bucket] of [['MISSING MODULE', missing], ['MEMBER NOT DECLARED', undeclared]] as const) {
	if (bucket.length === 0) continue
	console.log(`\n=== ${label} ===`)
	for (const n of bucket) {
		console.log(`  ${n.nominal}  (${n.occurrences}x, ${n.templateIds.length} templates, ${n.modules.length} modules)`)
		console.log(`    ${n.note ?? ''}`)
	}
}
if (external.length > 0) {
	console.log('\n=== EXTERNAL (not installed) ===')
	for (const n of external) console.log(`  ${n.nominal}  (${n.occurrences}x)`)
}
if (other.length > 0) {
	console.log('\n=== NON-EFFECT ===')
	for (const n of other) console.log(`  ${n.nominal}  (${n.occurrences}x)`)
}
