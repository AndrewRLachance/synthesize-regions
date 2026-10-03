/**
 * Phase 11 — build `effect-v4-semantic-compile-fixtures.json`.
 *
 * One fixture entry per canonical template, preparing the later module-resolved
 * semantic compile harness. Each entry records:
 *
 * - `typeArguments`       representative substitution for every declared type
 *                         parameter (from effect-v4-fixture-substitutions)
 * - `inputFallbacks`      the representative value for every declared input:
 *                         the marker fallback the template ships with
 * - `expectedImports`     module specifiers the generated source needs
 * - `expectedRequirements`
 *                         the requirement slot of the output descriptor, when
 *                         the output family models one (`never` = closed)
 * - `outputDescriptor`    the output type with fixtures substituted — the type
 *                         the harness should expect the artifact to have
 * - `fallbackCompilesStandalone`
 *                         the substituted fallback is a self-contained unit of
 *                         its output kind (false for suffix/property kinds,
 *                         which need a host prefix)
 * - `embedInSourceFile`   the template produces a fragment that must be placed
 *                         inside a source-file template (false for sourceFile
 *                         roots, which are the host)
 * - `externalPackages`    packages the generated source imports that are not
 *                         installed in this repository
 * - `needsRuntimeInfrastructure`
 *                         the fixture references platform runtime roots the
 *                         Phase-10 audit could not resolve (NodeRuntime,
 *                         BunServices, cluster runners, ...), so compiling it
 *                         needs infrastructure beyond `effect`
 * - `generic`             the template declares type parameters and needs the
 *                         concrete substitutions above
 * - `stability`           carried over from the catalog manifest
 *
 * This manifest does NOT claim semantic compilation happened; it only states
 * what the harness needs to attempt it.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { coreTemplatesDir, importCoreTemplateModule } from '../audit-lib.mts'
import { derivedTypeArgument, TYPE_ARGUMENT_FIXTURES, substituteTypePlaceholders } from '../effect-v4-fixture-substitutions.mts'

const EFFECT_VERSION = '4.0.0-rc.117'

interface TemplateLike {
	modelId: string
	typeParameters?: Record<string, unknown>
	inputs: Record<string, unknown>
	output: { kind: string; type?: { nominal?: string; ts?: string } }
	source: string
	importRequirements?: ReadonlyArray<{ moduleSpecifier: string }>
}

const manifest = JSON.parse(readFileSync(join(coreTemplatesDir, 'effect-v4-canonical-template-manifest.json'), 'utf8')) as {
	templates: Array<{
		modelId: string
		imports: readonly string[]
		typeParameters: readonly string[]
		inputIds: readonly string[]
		outputKind: string
		stability: string
	}>
	summary: { externalPackagesNotInstalled: string[]; rcSensitiveRoots: string[] }
}
const manifestById = new Map(manifest.templates.map((entry) => [entry.modelId, entry]))
const externalPackages = new Set(manifest.summary.externalPackagesNotInstalled)
const rcRoots = new Set(manifest.summary.rcSensitiveRoots)

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

/** Phantom slot extraction, mirroring audit-effect-v4-requirements.mts. */
const phantoms = (rawTypeText: string): Map<string, string> => {
	const typeText = rawTypeText.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, 'PH_$1')
	const source = ts.createSourceFile('descriptor.ts', `type __Descriptor = ${typeText}`, ts.ScriptTarget.Latest, true)
	const declaration = source.statements[0]
	const found = new Map<string, string>()
	if (!declaration || !ts.isTypeAliasDeclaration(declaration) || !ts.isTypeLiteralNode(declaration.type)) return found
	for (const member of declaration.type.members) {
		if (!ts.isPropertySignature(member)) continue
		const name = member.name && ts.isIdentifier(member.name) ? member.name.text : undefined
		if (!name?.startsWith('__')) continue
		const value = member.type
		if (!value || !ts.isFunctionTypeNode(value)) continue
		found.set(name.slice(2), (value.type ? value.type.getText(source) : 'unknown').replace(/\bPH_([A-Za-z0-9_]+)\b/g, '{{$1}}'))
	}
	return found
}

const MARKER_SPAN = /\/\*\* @TYPE ([a-zA-Z]+) id=([^\s]+) \*\*\/([\s\S]*?)\/\*\* @END \*\*\//g

const { exports: catalogExports } = await importCoreTemplateModule('effect-v4-canonical-template-catalog.ts')
const templates = catalogExports.effectV4CanonicalGraphTemplateInputs as TemplateLike[]

const fixtures = templates.map((template) => {
	const meta = manifestById.get(template.modelId)
	if (!meta) throw new Error(`manifest missing ${template.modelId}`)

	const typeArguments: Record<string, string> = {}
	for (const name of meta.typeParameters) {
		typeArguments[name] = TYPE_ARGUMENT_FIXTURES[name] ?? derivedTypeArgument(name) ?? 'unknown'
	}

	const inputFallbacks: Record<string, string> = {}
	for (const match of template.source.matchAll(MARKER_SPAN)) {
		inputFallbacks[match[2]!] = match[3]!
	}

	const expectedImports = new Set<string>(meta.imports)
	for (const requirement of template.importRequirements ?? []) expectedImports.add(requirement.moduleSpecifier)

	const nominal = template.output.type?.nominal
	const requirementKey = nominal ? REQUIREMENT_SLOTS[nominal] : undefined
	const slots = template.output.type?.ts ? phantoms(template.output.type.ts) : new Map<string, string>()
	const rawRequirements = requirementKey ? slots.get(requirementKey) : undefined
	const expectedRequirements = rawRequirements === undefined ? undefined : substituteTypePlaceholders(rawRequirements).ts

	const outputDescriptor = template.output.type?.ts ? substituteTypePlaceholders(template.output.type.ts).ts : undefined

	const kind = template.output.kind
	const fallbackCompilesStandalone = kind !== 'expressionSuffix' && kind !== 'objectProperty'
	const embedInSourceFile = kind !== 'sourceFile'

	const external = [...expectedImports].filter((specifier) => externalPackages.has(specifier)).sort()
	const referencedRcRoots = [...rcRoots].filter((root) => new RegExp(`\\b${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(template.source)).sort()

	return {
		modelId: template.modelId,
		outputKind: kind,
		stability: meta.stability,
		generic: meta.typeParameters.length > 0,
		typeArguments,
		inputFallbacks,
		expectedImports: [...expectedImports].sort(),
		...(expectedRequirements !== undefined ? { expectedRequirements } : {}),
		...(outputDescriptor !== undefined ? { outputDescriptor } : {}),
		fallbackCompilesStandalone,
		embedInSourceFile,
		externalPackages: external,
		needsRuntimeInfrastructure: referencedRcRoots.length > 0,
		...(referencedRcRoots.length > 0 ? { unverifiedRoots: referencedRcRoots } : {})
	}
})

const result = {
	effectVersion: EFFECT_VERSION,
	generatedBy: 'core-templates/.probe/build-semantic-compile-fixtures.mts',
	purpose: 'Input manifest for the later module-resolved semantic compile harness. No semantic compilation has been run yet.',
	summary: {
		fixtures: fixtures.length,
		generic: fixtures.filter((fixture) => fixture.generic).length,
		embedInSourceFile: fixtures.filter((fixture) => fixture.embedInSourceFile).length,
		standaloneSourceFiles: fixtures.filter((fixture) => !fixture.embedInSourceFile).length,
		needsExternalPackages: fixtures.filter((fixture) => fixture.externalPackages.length > 0).length,
		needsRuntimeInfrastructure: fixtures.filter((fixture) => fixture.needsRuntimeInfrastructure).length,
		withExpectedRequirements: fixtures.filter((fixture) => 'expectedRequirements' in fixture).length
	},
	fixtures
}

writeFileSync(
	join(coreTemplatesDir, 'effect-v4-semantic-compile-fixtures.json'),
	`${JSON.stringify(result, null, '\t')}\n`
)
console.log(`fixtures: ${result.summary.fixtures}`)
console.log(`generic: ${result.summary.generic}`)
console.log(`needs external packages: ${result.summary.needsExternalPackages}`)
console.log(`needs runtime infrastructure: ${result.summary.needsRuntimeInfrastructure}`)
console.log(`written: core-templates/effect-v4-semantic-compile-fixtures.json`)
