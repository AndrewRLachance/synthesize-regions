/**
 * Semantic-compile stage 2 — synthesize fixture programs and run `tsc`.
 *
 * For every canonical template this writes `fixtures/<modelId>.ts`:
 *
 *   <derived import statements>
 *   <ambient declarations for user-scope fallback identifiers>
 *   <source with marker fallbacks substituted, wrapped per output kind>
 *
 * and then runs the workspace-local `tsc --noEmit --strict` over all of them.
 * Diagnostics are mapped back to `modelId`s and written under `.artifacts/`.
 *
 * Ambient declarations (`declare const queue: any`) stand in for *user-scope*
 * fallback identifiers — the identifiers a template's default snippet expects
 * the surrounding user code to provide. They are host shims, recorded per
 * fixture in `.artifacts/effect-v4-derived-imports.json`, never part of the
 * catalog.
 *
 * Usage:
 *   npm run audit --prefix core-templates/tools/semantic-compile
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { substituteTypePlaceholders } from '../../scripts/audit/effect-v4-fixture-substitutions.mts'

const here = dirname(fileURLToPath(import.meta.url))
const coreTemplatesDir = resolve(here, '../..')
const artifactsDir = join(here, '.artifacts')
const fixturesDir = join(artifactsDir, 'fixtures')

const derived = JSON.parse(readFileSync(join(artifactsDir, 'effect-v4-derived-imports.json'), 'utf8')) as {
	byModelId: Record<string, { imports: Array<{ moduleSpecifier: string; importKind: string; importedName: string; typeOnly: boolean }>; unresolvedRoots: string[] }>
}

const MARKER_SPAN = /\/\*\* @TYPE ([a-zA-Z]+) id=([^\s]+) \*\*\/([\s\S]*?)\/\*\* @END \*\*\//g

/**
 * Contextual annotation for the fixture's `__out` binding.
 *
 * When the output descriptor substitutes to a function type whose parameters
 * are plain (no phantom `__…` slots), annotating gives top-level callbacks
 * their parameter types — the fallback handler the template ships then checks
 * against the descriptor instead of degrading to implicit `any`. Phantom
 * return types carry only optional members plus `pipe`, which every Effect
 * family value satisfies, so the annotation never constrains the source.
 */
const outputAnnotation = (template: { source: string; output: { kind: string; type?: { ts?: string } } }): string | undefined => {
	if (template.output.kind !== 'expression') return undefined
	const tsText = template.output.type?.ts
	// Generic descriptors (`{{A}}`) substitute to representative fixtures that
	// can contradict the fallback defaults (a `Schema.Unknown` fallback is not
	// the fixture's `string`), so only fully concrete descriptors annotate.
	if (!tsText || tsText.includes('{{')) return undefined
	const { ts: substitutedType, unresolved } = substituteTypePlaceholders(tsText)
	if (unresolved.length > 0) return undefined
	// Only top-level function types `(params) => Return`. Phantom object
	// descriptors (`{ pipe; __x?: () => T }`) also contain `=>`, but their
	// required `pipe` member does not exist on values like CLI Actions.
	if (!substitutedType.trimStart().startsWith('(') || !substitutedType.includes('=>')) return undefined
	const parameters = substitutedType.slice(0, substitutedType.indexOf('=>'))
	// Phantom object types (`{ pipe; __x?: ... }`) can never be satisfied by real
	// nominal values (Option, Redacted), so annotating would be unsound there.
	if (parameters.includes('__') || parameters.includes('{')) return undefined
	// The annotation exists to give top-level lambdas contextual parameter
	// types; call-form sources derive their context from the callee instead.
	if (!/^\s*(?:async\s*)?(?:\(\w*\)|[A-Za-z_$][\w$]*\s*=>|\()/.test(template.source)) return undefined
	return substitutedType
}

const wrapForOutputKind = (kind: string, source: string, annotation?: string): string => {
	switch (kind) {
		case 'expression':
		case 'array':
		case 'object':
			return annotation ? `const __out: ${annotation} = (${source});` : `const __out = (${source});`
		case 'expressionSuffix':
			return `const __out = __base${source};`
		case 'objectProperty':
			return `const __out = { ${source} };`
		case 'statement':
			// Module-level declarations (`export class …`) cannot live inside a
			// function body; any `yield*` they contain is already scoped inside
			// their own function expressions.
			if (/^\s*export\s/m.test(source)) return source
			return /(^|[^\w$])yield\*|\breturn\b/.test(source) ? `function* __gen() {\n${source}\n}` : source
		case 'sourceFile':
			return source
		default:
			return source
	}
}

const importStatements = (imports: Array<{ moduleSpecifier: string; importKind: string; importedName: string }>): string[] => {
	const namedBy = new Map<string, string[]>()
	const lines: string[] = []
	for (const requirement of imports) {
		if (requirement.importKind === 'namespace') {
			lines.push(`import * as ${requirement.importedName} from '${requirement.moduleSpecifier}';`)
			continue
		}
		const list = namedBy.get(requirement.moduleSpecifier) ?? []
		list.push(requirement.importedName)
		namedBy.set(requirement.moduleSpecifier, list)
	}
	for (const [specifier, names] of [...namedBy.entries()].sort()) {
		lines.push(`import { ${[...new Set(names)].sort().join(', ')} } from '${specifier}';`)
	}
	return lines.sort()
}

const TAG_USAGE = (root: string): RegExp =>
	new RegExp(`Context\\.(get|getOption)\\([^)]*\\b${root}\\b|Layer\\.(succeed|effect|scoped|provide)\\(\\s*${root}\\b|\\b${root}\\.use\\s*\\(|yield\\*\\s*${root}(?!\\s*\\.)\\b`)

const KEY_WITH_USE = 'Context.Key<never, any> & { readonly use: <A>(f: (service: any) => A) => A }'

const KEY_RECORD_WITH_USE =
	'Context.Key<never, { readonly [key: string]: (...args: any[]) => Effect.Effect<any, any, any> }> & { readonly use: <A>(f: (service: any) => A) => A }'

/**
 * Whether the service bound from `const x = yield* Root` / `Context.get(x, Root)`
 * is exercised through method *calls* (`breaker.protect(...)`) — those need
 * effect-returning members so combinators keep `any` channels — or through
 * property access (`shutdown.await`), which must stay plain `any`.
 */
const serviceIsMethodCalled = (root: string, source: string): boolean => {
	const localBind = new RegExp(`(?:const|let)\\s+(\\w+)\\s*=\\s*(?:yield\\*\\s*|Context\\.get\\([^)]*,\\s*)${root}\\b`).exec(source)
	if (!localBind) return false
	return new RegExp(`\\b${localBind[1]}\\.\\w+\\s*\\(`).test(source)
}

/**
 * Ambient shims for user-scope fallback identifiers.
 *
 * - Roots exercised as Context tags are typed `Context.Tag<any, any>` so
 *   `Context.get` yields `any` rather than `unknown`.
 * - Other PascalCase roots get a value + a type declaration (they appear in
 *   type positions too).
 * - Lowercase roots are plain `any` values.
 */
const ambientDeclarations = (roots: string[], source: string): { lines: string[]; needsContextImport: boolean; needsLayerImport: boolean; needsEffectImport: boolean } => {
	let needsContextImport = false
	let needsLayerImport = false
	let needsEffectImport = false
	const lines: string[] = []
	for (const root of roots) {
		const isPascalCase = /^[A-Z]/.test(root)
		if (isPascalCase && TAG_USAGE(root).test(source)) {
			needsContextImport = true
			if (serviceIsMethodCalled(root, source)) {
				needsEffectImport = true
				lines.push(`declare const ${root}: ${KEY_RECORD_WITH_USE};`, `type ${root} = any;`)
			} else {
				lines.push(`declare const ${root}: ${KEY_WITH_USE};`, `type ${root} = any;`)
			}
		} else if (isPascalCase && /Layers?$/.test(root)) {
			// `*Layer` roots are layer values fed to Layer.launch/build/provide;
			// they are modeled closed so runMain/Layer.launch stay fully provided.
			needsLayerImport = true
			lines.push(`declare const ${root}: Layer.Layer<any, any, never>;`, `type ${root} = any;`)
	} else if (isPascalCase) {
			// Roots whose member accesses all produce Effects without chaining
			// (`JobWorkflow.poll(...)` feeding a combinator) get effect-returning
			// members; fluent/property-style roots (`Counter.annotateRpcs(...)...`,
			// `Counter.client`) stay `any` so chains and yields keep working.
			const memberUses = [...source.matchAll(new RegExp(`\\b${root}\\.(\\w+)`, 'g'))]
			const allCalls = memberUses.length > 0 && memberUses.every((match) => source.slice((match.index ?? 0) + match[0].length).trimStart().startsWith('('))
			const chained = new RegExp(`\\b${root}\\.\\w+\\s*\\([^)]*\\)\\s*\\.`).test(source)
			if (allCalls && !chained && !/Runtime$/.test(root)) {
				needsEffectImport = true
				lines.push(`declare const ${root}: { readonly [key: string]: (...args: any[]) => Effect.Effect<any, any, any> };`, `type ${root} = any;`)
			} else {
				lines.push(`declare const ${root}: any;`, `type ${root} = any;`)
			}
		} else {
			lines.push(`declare const ${root}: any;`)
		}
	}
	return { lines, needsContextImport, needsLayerImport, needsEffectImport }
}

const catalog = await import(join(coreTemplatesDir, 'src/catalogs/effect-v4.ts'))
let templates = catalog.effectV4CanonicalGraphTemplateInputs as Array<{
	modelId: string
	source: string
	output: { kind: string }
}>

const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='))
const aiBaseline = process.argv.includes('--ai-baseline')
if (aiBaseline) {
	const aiPack = catalog.effectV4TemplatePacks.find((pack: { id: string }) => pack.id === 'ai')
	if (!aiPack) throw new Error('canonical catalog has no ai pack')
	const aiIds = new Set(aiPack.templates.map((template: { modelId: string }) => template.modelId))
	templates = templates.filter((template) => aiIds.has(template.modelId))
}
if (onlyArg) {
	const only = new Set(onlyArg.slice('--only='.length).split(','))
	templates = templates.filter((template) => only.has(template.modelId))
}
if (limitArg) templates = templates.slice(0, Number(limitArg.slice('--limit='.length)))

// Full runs start from a clean fixtures directory so stale programs never linger.
if (!onlyArg && !limitArg) rmSync(fixturesDir, { recursive: true, force: true })
mkdirSync(fixturesDir, { recursive: true })

for (const template of templates) {
	const entry = derived.byModelId[template.modelId] ?? { imports: [], unresolvedRoots: [] }
	let placeholderDefaults = 0
	const substituted = template.source.replace(MARKER_SPAN, (_match, _kind, _id, fallback) => {
		// A fallback that is exactly `undefined` is a placeholder default standing
		// in for user input; the host substitutes its ambient `__any` binding so
		// the template's own API usage is what actually gets checked. (`undefined
		// as any` is not used: TS2873 flags it as always-falsy in boolean tests.)
		if (String(fallback).trim() === 'undefined') {
			placeholderDefaults += 1
			return '__any'
		}
		return String(fallback)
	})
	const parts: string[] = []
	if (template.output.kind !== 'sourceFile') {
		const ambient = ambientDeclarations(entry.unresolvedRoots, substituted)
		if (template.output.kind === 'expressionSuffix') ambient.lines.unshift('declare const __base: any;')
		if (placeholderDefaults > 0) ambient.lines.unshift('declare const __any: any;')
		const imports = [...entry.imports]
		if (ambient.needsContextImport && !imports.some((requirement) => requirement.moduleSpecifier === 'effect' && requirement.importedName === 'Context')) {
			imports.push({ moduleSpecifier: 'effect', importKind: 'named', importedName: 'Context', typeOnly: false })
		}
		if (ambient.needsLayerImport && !imports.some((requirement) => requirement.moduleSpecifier === 'effect' && requirement.importedName === 'Layer')) {
			imports.push({ moduleSpecifier: 'effect', importKind: 'named', importedName: 'Layer', typeOnly: false })
		}
		if (ambient.needsEffectImport && !imports.some((requirement) => requirement.moduleSpecifier === 'effect' && requirement.importedName === 'Effect')) {
			imports.push({ moduleSpecifier: 'effect', importKind: 'named', importedName: 'Effect', typeOnly: false })
		}
		const importLines = importStatements(imports)
		parts.push(...importLines)
		if (ambient.lines.length > 0) parts.push(ambient.lines.join('\n'))
		// No imports means the file would be a script sharing global scope with
		// every other fixture; make it a module so declarations stay local.
		if (importLines.length === 0) parts.push('export {};')
	}
	parts.push(wrapForOutputKind(template.output.kind, substituted, outputAnnotation(template)))
	writeFileSync(join(fixturesDir, `${template.modelId}.ts`), `${parts.filter(Boolean).join('\n')}\n`)
}

const tsconfig = {
	compilerOptions: {
		target: 'ES2022',
		module: 'ES2022',
		moduleResolution: 'Bundler',
		lib: ['ES2022'],
		strict: true,
		noEmit: true,
		skipLibCheck: true,
		exactOptionalPropertyTypes: true,
		// Off so the ambient callable-record shims (`{ [key: string]: (...args)
		// => Effect }` for user-scope workflow objects) can be invoked; template
		// content itself never relies on index signatures.
		noUncheckedIndexedAccess: false,
		noImplicitOverride: true,
		forceConsistentCasingInFileNames: true
	},
	include: onlyArg ? templates.map((template) => `fixtures/${template.modelId}.ts`) : ['fixtures/**/*.ts']
}
writeFileSync(join(artifactsDir, 'tsconfig.fixtures.json'), `${JSON.stringify(tsconfig, null, '\t')}\n`)

console.log(`fixture programs written: ${templates.length}`)
console.log('running tsc...')

let raw = ''
let exitCode = 0
try {
	raw = execFileSync(join(here, 'node_modules/.bin/tsc'), ['-p', join(artifactsDir, 'tsconfig.fixtures.json'), '--pretty', 'false'], {
		cwd: artifactsDir,
		encoding: 'utf8',
		maxBuffer: 1 << 28
	})
} catch (error) {
	exitCode = (error as { status?: number }).status ?? 1
	raw = ((error as { stdout?: string }).stdout ?? '') + ((error as { stderr?: string }).stderr ?? '')
}

const diagnosticPattern = /^fixtures\/([^(]+)\((\d+),(\d+)\): error (TS\d+): (.*)$/
const byModelId = new Map<string, Array<{ line: number; column: number; code: string; message: string }>>()
let unparsed = 0
for (const line of raw.split('\n')) {
	const match = diagnosticPattern.exec(line.trim())
	if (!match) continue
	const [, file, lineNumber, column, code, message] = match
	const modelId = file!.replace(/\.ts$/, '')
	const list = byModelId.get(modelId) ?? []
	list.push({ line: Number(lineNumber), column: Number(column), code: code!, message: message! })
	byModelId.set(modelId, list)
}

const errorCodeFrequency = new Map<string, number>()
for (const diagnostics of byModelId.values()) {
	for (const diagnostic of diagnostics) errorCodeFrequency.set(diagnostic.code, (errorCodeFrequency.get(diagnostic.code) ?? 0) + 1)
}

// --- Genuine-vs-ambient classification. ---------------------------------------
// TS7006/TS7031 (implicit-any callback params) and TS18046 ('x' is of type
// 'unknown') are inherent to the ambient shims: fallback callbacks and
// ambient-typed receivers provide no contextual types, and generic inference
// turns ambient `any` into `unknown`. In real usage the user's typed values
// supply that context. A TS2345 whose argument is exactly `unknown` is the
// same ambient generic inference surfacing one level later.
const AMBIENT_CODES = new Set(['TS7006', 'TS7031', 'TS18046'])
const isAmbientDiagnostic = (modelId: string, diagnostic: { code: string; message: string }): boolean => {
	if (AMBIENT_CODES.has(diagnostic.code)) return true
	const hasAmbientRoots = (derived.byModelId[modelId]?.unresolvedRoots.length ?? 0) > 0
	return diagnostic.code === 'TS2345' && diagnostic.message.startsWith("Argument of type 'unknown'") && hasAmbientRoots
}

const ambientNoiseIds: string[] = []
const genuineFailureIds: string[] = []
for (const [modelId, diagnostics] of byModelId) {
	if (diagnostics.every((diagnostic) => isAmbientDiagnostic(modelId, diagnostic))) ambientNoiseIds.push(modelId)
	else genuineFailureIds.push(modelId)
}

const result = {
	effectVersion: '4.0.0-rc.117',
	generatedBy: 'tools/semantic-compile/synthesize-and-compile.mts',
	scope: 'module-resolved semantic compile of fallback-substituted fixture programs',
	summary: {
		fixturesCompiled: templates.length,
		clean: templates.length - byModelId.size,
		cleanWithAmbientNoise: ambientNoiseIds.length,
		genuineFailures: genuineFailureIds.length,
		withDiagnostics: byModelId.size,
		totalDiagnostics: [...byModelId.values()].reduce((sum, list) => sum + list.length, 0),
		tscExitCode: exitCode,
		errorCodes: Object.fromEntries([...errorCodeFrequency.entries()].sort((a, b) => b[1] - a[1]))
	},
	ambientNoise: ambientNoiseIds.sort(),
	genuineFailures: genuineFailureIds.sort(),
	diagnostics: Object.fromEntries([...byModelId.entries()].sort())
}

writeFileSync(join(artifactsDir, 'effect-v4-semantic-compile-results.json'), `${JSON.stringify(result, null, '\t')}\n`)
console.log(`clean: ${result.summary.clean}/${result.summary.fixturesCompiled}`)
console.log(`clean with ambient noise: ${result.summary.cleanWithAmbientNoise}`)
console.log(`genuine failures: ${result.summary.genuineFailures}`)
console.log(`total diagnostics: ${result.summary.totalDiagnostics}`)
for (const [code, count] of [...errorCodeFrequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${code}: ${count}`)

if (aiBaseline) {
	const baseline = JSON.parse(readFileSync(join(coreTemplatesDir, 'evidence/effect-v4-semantic-results.json'), 'utf8')) as {
		summary: { fixturesCompiled: number }
		genuineFailures: string[]
	}
	const allowed = new Set(baseline.genuineFailures)
	const unexpected = genuineFailureIds.filter((modelId) => !allowed.has(modelId))
	if (templates.length !== baseline.summary.fixturesCompiled) {
		console.error(`baseline scope changed: expected ${baseline.summary.fixturesCompiled} fixtures, compiled ${templates.length}`)
		process.exitCode = 1
	}
	if (unexpected.length > 0) {
		console.error(`new genuine semantic failures: ${unexpected.join(', ')}`)
		process.exitCode = 1
	} else {
		console.log(`semantic baseline preserved; known failures: ${genuineFailureIds.join(', ') || 'none'}`)
	}
} else if (genuineFailureIds.length > 0) {
	process.exitCode = 1
}
