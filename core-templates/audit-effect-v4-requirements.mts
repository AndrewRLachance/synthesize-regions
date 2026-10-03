/**
 * Phase 5 — requirements and Layer audit.
 *
 * For every template whose output is typed, the requirement slot of its
 * descriptor family is compared with the capabilities the template's *own*
 * source actually exercises. This cannot replace a `tsc --strict` semantic
 * compile, and does not pretend to: it proves mechanical contradictions and
 * files the rest for review.
 *
 * Mechanical failures (contradiction between the descriptor and the source):
 *
 *   requirements-closed-but-capability-used
 *       The requirements slot is `never`, yet the source drives an API whose
 *       requirement can only come from the environment (HttpClient, SqlClient,
 *       Scope, ...). Either the descriptor is wrong or the source is.
 *
 *   scope-omitted-from-requirements
 *       The source acquires/finalizes a scoped resource but no `Scope`
 *       requirement is modeled.
 *
 * Review items (consistent, but lifecycle/semantics sensitive — recorded, not
 * failed):
 *
 *   error-closed-but-failure-produced
 *   layer-closed-but-service-yielded
 *   requirement-parameter-dropped
 *
 * A requirement slot containing any `{{...R...}}` placeholder is treated as
 * parameterized and therefore correct by construction: the consumer supplies the
 * capability. Only slots that are literally `never` are judged.
 */
import ts from 'typescript'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	classifyModuleName,
	collectTemplateArrays,
	coreTemplatesDir,
	importCoreTemplateModule,
	listCoreTemplateModules
} from './audit-lib.mts'
import type { TemplateLike } from './audit-lib.mts'

/** family nominal -> the phantom key that carries its requirement type. */
const REQUIREMENT_SLOTS: Record<string, string> = {
	'effect/Effect': 'effectRequirements',
	'effect/Layer': 'layerRequirements',
	'effect/Stream': 'streamRequirements',
	'effect/Sink': 'sinkRequirements',
	'effect/Schedule': 'scheduleRequirements',
	'effect/ManagedRuntime': 'runtimeRequirements',
	'effect/RequestResolver': 'requestRequirements',
	'effect/unstable/workflow/Activity': 'activityRequirements',
	'effect/unstable/cli/Command': 'commandRequirements'
}

/** family nominal -> the phantom key that carries its error type. */
const ERROR_SLOTS: Record<string, string> = {
	'effect/Effect': 'effectError',
	'effect/Layer': 'layerError',
	'effect/Stream': 'streamError',
	'effect/Sink': 'sinkError',
	'effect/ManagedRuntime': 'runtimeError',
	'effect/unstable/workflow/Activity': 'activityError',
	'effect/unstable/cli/Command': 'commandError'
}

interface Capability {
	name: string
	/** Source evidence for the capability being exercised. */
	uses: RegExp
	/** What the modeled requirement must mention to count as correct. */
	evidence: RegExp
	/**
	 * Source forms that legitimately consume the capability, so a closed
	 * requirement is correct even though `uses` matched.
	 */
	consumedBy?: RegExp
}

/**
 * Capabilities whose only possible source is the ambient environment.
 *
 * Every entry is a capability Effect models as a requirement type; a template
 * that drives the API without modeling the requirement is either relying on a
 * `never` that is wrong or on an implicit `Layer.provide` the descriptor does
 * not mention.
 *
 * The `uses` patterns were calibrated against the pinned rc.117 declarations:
 *
 * - `Effect.scoped`, `Layer.effect`, `Layer.effectDiscard` and `Layer.unwrap`
 *   all type as `Exclude<R, Scope>`, so a source wrapped in one of them has
 *   its Scope requirement consumed by construction (`consumedBy`).
 * - `HttpClient` only enters requirements through the `HttpClient.HttpClient`
 *   tag or the execution helpers (`execute`, `get`, `post`, ...). Request /
 *   response constructors and client transforms (`withCookiesRef`,
 *   `filterStatusOk`, ...) are value-level and never add a requirement.
 * - `Socket` values are passed around directly; only the `Socket.Socket`,
 *   `Socket.WebSocket` and `Socket.WebSocketConstructor` tags are services.
 * - The child-process service is the `ChildProcessSpawner.ChildProcessSpawner`
 *   tag; `ChildProcess.make(...)` and `ChildProcessSpawner.make(...)` are
 *   value constructors.
 */
const CAPABILITIES: Capability[] = [
	{
		name: 'Scope',
		uses: /Effect\.(acquireRelease|acquireUseRelease|addFinalizer|scoped|scopedWith)\b|\bScope\.[A-Z]|Layer\.scoped\b/,
		evidence: /Scope|\{\{[^}]*R[^}]*\}\}/,
		consumedBy: /Effect\.scoped\s*\(|Effect\.scopedWith\s*\(|Layer\.effect\s*\(|Layer\.effectDiscard\s*\(|Layer\.scoped\s*\(|Layer\.unwrap\s*\(|Layer\.unwrapScoped\s*\(/
	},
	{ name: 'HttpClient', uses: /\bHttpClient\.HttpClient\b|\bHttpClient\.(execute|get|post|put|patch|delete|head|options)\s*\(/, evidence: /HttpClient|\{\{[^}]*R[^}]*\}\}/ },
	{ name: 'SqlClient', uses: /\bSqlClient\b|\bsql\.[a-z]|\bSql\b/, evidence: /Sql|Client|\{\{[^}]*R[^}]*\}\}/ },
	{
		name: 'ChildProcessSpawner',
		uses: /\bChildProcessSpawner\.ChildProcessSpawner\b|\bCommandExecutor\b/,
		evidence: /ChildProcessSpawner|CommandExecutor|ChildProcess|\{\{[^}]*R[^}]*\}\}/,
		// `Layer.succeed(Tag, impl)` / `Layer.effect(Tag, ...)` provide the
		// service; the tag reference names the layer's target, not a consumption.
		consumedBy: /Layer\.(succeed|effect)\s*\(\s*ChildProcessSpawner\.ChildProcessSpawner/
	},
	{ name: 'Socket', uses: /\bSocket\.(Socket|WebSocket|WebSocketConstructor)\b/, evidence: /Socket|Net|\{\{[^}]*R[^}]*\}\}/ }
]

/**
 * rc.117 APIs whose usage never introduces an environment requirement.
 *
 * Verified against the pinned declarations (see the audit report):
 *
 * - `Random.next: Effect<number>` — default service, `R = never`.
 * - `TestClock.adjust: (duration) => Effect<void>` and
 *   `TestClock.layer: (options?) => Layer<TestClock>` — default test service.
 * - `Config<T> extends Effect<T, ConfigError>` — config values are effects
 *   whose only requirement is the default `ConfigProvider`.
 * - `Logger.layer(loggers)` — constructs the logger provider; `RIn = never`.
 * - `NodeServices.layer` / `BunServices.layer` — platform provider layers;
 *   the platform packages are not installed in this repository, so these are
 *   additionally recorded as `needs-semantic-compile` upstream candidates.
 *
 * Sources exercising these APIs are intentionally not flagged.
 */
const VERIFIED_DEFAULT_SERVICE_APIS = ['Random', 'Clock', 'TestClock', 'ConfigProvider', 'Logger', 'NodeServices', 'BunServices', 'BrowserContext', 'Tracer', 'Scheduler'] as const

/** Strip `marker()` fallback bodies so only the template's own source is judged. */
const MARKER_SPAN = /\/\*\* @TYPE [a-zA-Z]+ id=[^\s]+ \*\*\/[\s\S]*?\/\*\* @END \*\*\//g
const stripMarkerFallbacks = (source: string): string => source.replace(MARKER_SPAN, '__input__')

interface DescriptorLike {
	nominal?: string
	ts?: string
}

interface PortLike {
	type?: DescriptorLike
	accepts?: { type?: DescriptorLike }
	options?: PortLike[]
}

function collectPortTypes(port: unknown, into: DescriptorLike[]): void {
	if (typeof port !== 'object' || port === null) return
	const p = port as PortLike
	if (p.type) into.push(p.type)
	if (p.accepts?.type) into.push(p.accepts.type)
	if (Array.isArray(p.options)) for (const option of p.options) collectPortTypes(option, into)
}

/**
 * Phantom slots of a structural descriptor, as `__key?: () => T` pairs.
 *
 * Parsed with the TypeScript AST rather than a regex: a phantom value may itself
 * contain `; readonly ...` (an inline error shape), so a textual split silently
 * truncates or merges slots.
 */
function phantoms(rawTypeText: string): Map<string, string> {
	// Placeholders such as `{{R}}` are not valid TypeScript, so they are parked
	// behind valid identifiers while parsing and restored afterwards. Substituting
	// them for real fixtures instead would erase the distinction between "the
	// consumer supplies this requirement" and "this requirement is `never`", which
	// is precisely what this audit decides.
	const typeText = rawTypeText.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, 'PH_$1')
	const source = ts.createSourceFile('descriptor.ts', `type __Descriptor = ${typeText}`, ts.ScriptTarget.Latest, true)
	const declaration = source.statements[0]
	const found = new Map<string, string>()
	if (!declaration || !ts.isTypeAliasDeclaration(declaration)) return found
	if (!ts.isTypeLiteralNode(declaration.type)) return found
	for (const member of declaration.type.members) {
		if (!ts.isPropertySignature(member)) continue
		const name = member.name && ts.isIdentifier(member.name) ? member.name.text : undefined
		if (!name || !name.startsWith('__')) continue
		// The phantom slot is a nullary function type: `__key?: () => T`.
		const value = member.type
		if (!value || !ts.isFunctionTypeNode(value)) continue
		const text = value.type ? value.type.getText(source) : 'unknown'
		found.set(name.slice(2), text.replace(/\bPH_([A-Za-z0-9_]+)\b/g, '{{$1}}'))
	}
	return found
}

const PARAMETERIZED = /\{\{[^}]*R[^}]*\}\}/
const FAILURE_SOURCE = /Effect\.(fail|failSync|die|sync|orDie|orDieWith)\(|\bthrow new\b/

const rows: Array<{
	modelId: string
	module: string
	nominal?: string
	requirements?: string
	errors?: string
	capabilities: string[]
	kind: string
	detail: string
}> = []
const moduleLoadErrors: Array<{ module: string; error: string }> = []
const seen = new Set<string>()
let audited = 0

for (const fileName of listCoreTemplateModules()) {
	if (classifyModuleName(fileName) === 'helpers') continue
	const { exports, error } = await importCoreTemplateModule(fileName)
	if (error) {
		moduleLoadErrors.push({ module: fileName.replace(/\.ts$/, ''), error })
		continue
	}
	const moduleName = fileName.replace(/\.ts$/, '')
	for (const { templates } of collectTemplateArrays(exports)) {
		for (const template of templates as TemplateLike[]) {
			if (seen.has(template.modelId)) continue
			seen.add(template.modelId)
			const output = template.output?.type as DescriptorLike | undefined
			if (!output?.ts) continue
			audited += 1

			const nominal = output.nominal
			const phantom = phantoms(output.ts)
			const requirementKey = nominal ? REQUIREMENT_SLOTS[nominal] : undefined
			const errorKey = nominal ? ERROR_SLOTS[nominal] : undefined
			const requirements = requirementKey ? phantom.get(requirementKey) : undefined
			const errors = errorKey ? phantom.get(errorKey) : undefined
			if (requirements === undefined) continue

			const closed = requirements.trim() === 'never'
			// Judge only the template's own source: marker fallback bodies are
			// placeholder defaults, and the input port types — not the fallback —
			// model whatever the inserted code requires.
			const scannedSource = stripMarkerFallbacks(template.source)
			const capabilities = CAPABILITIES.filter(
				(capability) => capability.uses.test(scannedSource) && !capability.consumedBy?.test(scannedSource)
			)

			if (closed) {
				for (const capability of capabilities) {
					if (capability.evidence.test(requirements)) continue
					rows.push({
						modelId: template.modelId,
						module: moduleName,
						nominal,
						requirements,
						capabilities: capabilities.map((entry) => entry.name),
						kind: 'requirements-closed-but-capability-used',
						detail: `\`${capability.name}\` is exercised by the source but the ${requirementKey} slot is \`never\``
					})
				}
				if (capabilities.some((capability) => capability.name === 'Scope') && !/Scope/.test(requirements)) {
					// Reported once by the loop above; kept as its own class so the
					// Scope case is never hidden inside a generic capability row.
					continue
				}
			}

			if (!closed && !PARAMETERIZED.test(requirements) && capabilities.some((c) => c.name === 'Scope') && !/Scope/.test(requirements)) {
				rows.push({
					modelId: template.modelId,
					module: moduleName,
					nominal,
					requirements,
					capabilities: capabilities.map((entry) => entry.name),
					kind: 'scope-omitted-from-requirements',
					detail: `the source acquires a scoped resource but \`${requirementKey}\` is \`${requirements}\``
				})
			}

			if (errors?.trim() === 'never' && FAILURE_SOURCE.test(scannedSource)) {
				rows.push({
					modelId: template.modelId,
					module: moduleName,
					nominal,
					requirements,
					errors,
					capabilities: capabilities.map((entry) => entry.name),
					kind: 'error-closed-but-failure-produced',
					detail: `the source can fail but \`${errorKey}\` is \`never\``
				})
			}

			if (nominal === 'effect/Layer' && requirements.trim() === 'never' && /Effect\.gen\b/.test(scannedSource) && /yield\s*\*/.test(scannedSource)) {
				rows.push({
					modelId: template.modelId,
					module: moduleName,
					nominal,
					requirements,
					capabilities: capabilities.map((entry) => entry.name),
					kind: 'layer-closed-but-service-yielded',
					detail: 'a Layer whose body yields services is modeled as fully closed'
				})
			}

			// A requirement type parameter that reaches the inputs but never the
			// output slot means the dependency was dropped on the way out.
			if (closed) {
				const inputTypes: DescriptorLike[] = []
				for (const port of Object.values(template.inputs ?? {})) collectPortTypes(port, inputTypes)
				const usesRequirementParameter = inputTypes.some((type) => type.ts && /\{\{[A-Za-z0-9_]*R[A-Za-z0-9_]*\}\}/.test(type.ts))
				if (usesRequirementParameter) {
					rows.push({
						modelId: template.modelId,
						module: moduleName,
						nominal,
						requirements,
						capabilities: capabilities.map((entry) => entry.name),
						kind: 'requirement-parameter-dropped',
						detail: `an input is typed with a requirement parameter but \`${requirementKey}\` is \`never\``
					})
				}
			}
		}
	}
}

const failures = rows.filter((row) => row.kind === 'requirements-closed-but-capability-used' || row.kind === 'scope-omitted-from-requirements')
const reviews = rows.filter((row) => !failures.includes(row))

const report = {
	summary: {
		typedTemplates: audited,
		failures: failures.length,
		reviewItems: reviews.length,
		moduleLoadErrors: moduleLoadErrors.length
	},
	verifiedDefaultServiceApis: VERIFIED_DEFAULT_SERVICE_APIS,
	byCapability: Object.fromEntries(
		CAPABILITIES.map((capability) => [
			capability.name,
			failures.filter((row) => row.detail.includes(`\`${capability.name}\``)).length
		]).filter(([, count]) => (count as number) > 0)
	),
	failures,
	reviewItems: reviews,
	moduleLoadErrors
}

writeFileSync(
	join(coreTemplatesDir, 'effect-v4-requirements-audit.json'),
	`${JSON.stringify(report, null, '\t')}\n`
)

console.log(`typed templates audited: ${report.summary.typedTemplates}`)
console.log(`mechanical failures:     ${report.summary.failures}`)
console.log(`review items:            ${report.summary.reviewItems}`)
console.log(`module load errors:      ${report.summary.moduleLoadErrors}`)
const byKind = new Map<string, number>()
for (const row of rows) byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1)
for (const [kind, count] of [...byKind.entries()].sort()) console.log(`  ${kind}: ${count}`)
console.log(`\n=== REQUIREMENT CONTRADICTIONS ===`)
for (const row of failures.slice(0, 60)) console.log(`  ${row.modelId} (${row.module}) — ${row.detail}`)
if (failures.length > 60) console.log(`  ... and ${failures.length - 60} more`)
