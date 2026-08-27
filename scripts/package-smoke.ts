import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rename,
	rm,
	stat,
	symlink,
	writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

interface PackageManifest {
	readonly name: string
	readonly main?: string
	readonly types?: string
	readonly exports?: unknown
	readonly dependencies?: Readonly<Record<string, string>>
	readonly devDependencies?: Readonly<Record<string, string>>
}

interface SchemaFixture {
	readonly specifier: string
	readonly value: unknown
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceManifest = await readJson<PackageManifest>(join(projectRoot, 'package.json'))
const temporaryRoot = await mkdtemp(join(tmpdir(), `${sourceManifest.name}-package-smoke-`))
const keepTemporaryFiles = process.env.PACKAGE_SMOKE_KEEP_TEMP === '1'

try {
	const packedPackageDirectory = await packAndExtractPackage(temporaryRoot)
	const packedManifest = await readJson<PackageManifest>(join(packedPackageDirectory, 'package.json'))

	assert.equal(packedManifest.name, sourceManifest.name, 'The packed package name differs from the source manifest.')
	assert.ok(
		packedManifest.dependencies?.ajv,
		'Ajv must be published as a runtime dependency because schema validation is part of the root API.'
	)
	await assertPathExists(
		join(packedPackageDirectory, 'GLOSSARY.md'),
		'The packed package must contain the glossary linked from its README.'
	)
	await assertPathExists(
		join(packedPackageDirectory, 'docs', 'TEMPLATES.md'),
		'The packed package must contain the graph template authoring guide.'
	)
	await assertPathExists(
		join(packedPackageDirectory, 'docs', 'SYNTHESIS_GRAPHS.md'),
		'The packed package must contain the synthesis graph guide.'
	)
	await assertPathExists(
		join(packedPackageDirectory, 'docs', 'synthesis-workflow-synthesize-regions-contracts.md'),
		'The packed package must contain its generated Synthesis Workflow contract snapshot.'
	)
	await verifyManifestTargets(packedPackageDirectory, packedManifest)

	const schemaSubpaths = getJsonExportSubpaths(packedManifest)
	assert.ok(schemaSubpaths.length > 0, 'The package does not declare any exported JSON schemas.')

	const consumerDirectory = join(temporaryRoot, 'consumer')
	const consumerNodeModules = join(consumerDirectory, 'node_modules')
	const installedPackageDirectory = join(consumerNodeModules, ...packedManifest.name.split('/'))
	await mkdir(dirname(installedPackageDirectory), { recursive: true })
	await writeFile(join(consumerDirectory, 'package.json'), `${JSON.stringify({
		name: 'packed-package-consumer',
		private: true,
		type: 'module'
	}, null, 2)}\n`, 'utf8')
	await rename(packedPackageDirectory, installedPackageDirectory)
	await linkInstalledDependencies(consumerNodeModules, sourceManifest)

	const schemaFixtures = schemaSubpaths.map(subpath => ({
		specifier: `${packedManifest.name}/${subpath.slice(2)}`,
		value: fixtureForSchema(subpath)
	}))

	await runTypeScriptConsumerSmoke(consumerDirectory, packedManifest.name, schemaSubpaths, schemaFixtures)
	await runRuntimeSmoke(consumerDirectory, packedManifest.name, schemaFixtures)

	console.log(`Packed-package smoke test passed for ${packedManifest.name}.`)
} finally {
	if (keepTemporaryFiles) {
		console.log(`Packed-package smoke files retained at ${temporaryRoot}.`)
	} else {
		await rm(temporaryRoot, { recursive: true, force: true })
	}
}

async function packAndExtractPackage(root: string): Promise<string> {
	const packageDirectory = join(root, 'packed')
	const npmCacheDirectory = join(root, 'npm-cache')
	const extractDirectory = join(root, 'extracted')
	await Promise.all([
		mkdir(packageDirectory, { recursive: true }),
		mkdir(npmCacheDirectory, { recursive: true }),
		mkdir(extractDirectory, { recursive: true })
	])

	runNpm([
		'pack',
		'--ignore-scripts',
		'--offline',
		'--json',
		'--pack-destination',
		packageDirectory
	], {
		cwd: projectRoot,
		env: {
			...process.env,
			npm_config_cache: npmCacheDirectory,
			npm_config_audit: 'false',
			npm_config_fund: 'false',
			npm_config_update_notifier: 'false'
		}
	})

	const archives = (await readdir(packageDirectory)).filter(file => file.endsWith('.tgz'))
	assert.equal(archives.length, 1, `Expected one package archive, found ${archives.length}.`)
	const archive = archives[0]
	assert.ok(archive, 'npm pack did not produce an archive.')

	run('tar', ['-xzf', join(packageDirectory, archive), '-C', extractDirectory], {
		cwd: projectRoot,
		env: process.env
	})

	const extractedPackageDirectory = join(extractDirectory, 'package')
	await assertPathExists(extractedPackageDirectory, 'npm pack archive did not contain the expected package directory.')
	return extractedPackageDirectory
}

async function verifyManifestTargets(packageDirectory: string, manifest: PackageManifest): Promise<void> {
	const targets = new Set<string>()
	collectExportTargets(manifest.exports, targets)
	if (manifest.main) targets.add(normalizeManifestTarget(manifest.main))
	if (manifest.types) targets.add(normalizeManifestTarget(manifest.types))

	assert.ok(targets.size > 0, 'The packed manifest does not declare any entry-point targets.')

	for (const target of targets) {
		assert.ok(target.startsWith('./'), `Package target must be relative: ${target}`)
		assert.ok(!target.includes('*'), `Package smoke verification does not support wildcard export targets: ${target}`)

		const absoluteTarget = resolve(packageDirectory, target)
		assert.ok(
			absoluteTarget === packageDirectory || absoluteTarget.startsWith(`${packageDirectory}${sep}`),
			`Package target escapes the package directory: ${target}`
		)
		await assertPathExists(absoluteTarget, `Packed export target is missing: ${target}`)
	}
}

function collectExportTargets(value: unknown, targets: Set<string>): void {
	if (typeof value === 'string') {
		targets.add(value)
		return
	}

	if (Array.isArray(value)) {
		for (const item of value) collectExportTargets(item, targets)
		return
	}

	if (isRecord(value)) {
		for (const item of Object.values(value)) collectExportTargets(item, targets)
	}
}

function getJsonExportSubpaths(manifest: PackageManifest): string[] {
	assert.ok(isRecord(manifest.exports), 'The packed manifest must declare an exports object.')
	return Object.keys(manifest.exports)
		.filter(subpath => subpath.startsWith('./schemas/') && subpath.endsWith('.schema.json'))
		.sort()
}

async function linkInstalledDependencies(nodeModulesDirectory: string, manifest: PackageManifest): Promise<void> {
	const dependencyNames = new Set(Object.keys(manifest.dependencies ?? {}))

	for (const dependencyName of [...dependencyNames].sort()) {
		const source = join(projectRoot, 'node_modules', ...dependencyName.split('/'))
		try {
			await stat(source)
		} catch {
			throw new Error(
				`Cannot run the offline package smoke test because ${dependencyName} is not installed in the source workspace.`
			)
		}

		const target = join(nodeModulesDirectory, ...dependencyName.split('/'))
		await mkdir(dirname(target), { recursive: true })
		await symlink(source, target, process.platform === 'win32' ? 'junction' : 'dir')
	}
}

async function runRuntimeSmoke(
	consumerDirectory: string,
	packageName: string,
	schemaFixtures: readonly SchemaFixture[]
): Promise<void> {
	const runtimeFile = join(consumerDirectory, 'runtime-smoke.mjs')
	await writeFile(runtimeFile, `
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const packageName = ${JSON.stringify(packageName)}
const fixtures = JSON.parse(process.env.PACKAGE_SMOKE_SCHEMA_FIXTURES ?? '[]')
const packageModule = await import(packageName)
assert.ok(Object.keys(packageModule).length > 0, 'The package root did not expose any runtime exports.')
assert.equal(packageModule.SYNTHESIZE_REGIONS_PACKAGE_VERSION, '0.6.2')
assert.equal(packageModule.TEMPLATE_CATALOG_CONTRACT_DIGEST_VERSION, 7)
assert.equal(packageModule.TEMPLATE_MANIFEST_DIGEST_VERSION, 4)
assert.equal(packageModule.TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION, 4)
assert.equal(packageModule.TEMPLATE_CATALOG_PLANNER_SCHEMA_VERSION, 4)
assert.equal(packageModule.TEMPLATE_CAPABILITY_CLOSURE_VERSION, 3)
assert.equal(
	packageModule.checkContract(packageModule.TemplateCatalogContractDigestSchema, 'c7_' + '1'.repeat(64)),
	true
)
assert.equal(
	packageModule.checkContract(packageModule.TemplateCatalogContractDigestSchema, 'c4_' + '1'.repeat(64)),
	false
)

const supported = { type: 'array', items: { type: 'integer' }, minItems: 1 }
assert.equal(packageModule.validateSupportedJsonSchema(supported).ok, true)
assert.equal(packageModule.validateJsonValueAgainstSchema([1, 2], supported).ok, true)
assert.equal(packageModule.validateJsonValueAgainstSchema([], supported).ok, false)
assert.equal(
	packageModule.compareJsonSchemas({ type: 'integer' }, { type: 'number' }).compatibility,
	'compatible'
)
assert.equal(packageModule.validateTypeScriptType('ReadonlyArray<string>').ok, true)
assert.equal(packageModule.compareTypeScriptTypes('unknown', 'string').status, 'compatible')
assert.equal(packageModule.REGION_SYNTAX_ENGINE_VERSION, 2)
assert.ok(packageModule.REGION_KIND_VALUES.includes('type'))
assert.ok(packageModule.REGION_KIND_VALUES.includes('exportSpecifier'))
assert.equal(
	packageModule.compareTypeDescriptors(
		{ ts: 'string', schema: { type: 'string' } },
		{ ts: 'string | number', schema: { type: ['string', 'number'] } }
	).status,
	'compatible'
)
const sourceMap = {
	version: packageModule.GENERATED_SOURCE_MAP_VERSION,
	spans: [{
		kind: 'input', start: 0, end: 5, nestingDepth: 1,
		nodeId: 'mapped', templateId: 'MappedExpression', inputName: 'value'
	}]
}
assert.deepEqual(packageModule.GENERATED_SOURCE_SPAN_KIND_VALUES, ['node', 'input'])
assert.equal(packageModule.isGeneratedSourceMap(sourceMap), true)
assert.equal(packageModule.checkContract(packageModule.GeneratedSourceMapSchema, sourceMap), true)
assert.equal(packageModule.isGeneratedSourceMap({ version: 2, spans: [] }), false)

const implementationDiscovery = packageModule.discoverImplementationTargets({
	files: { 'src/packed-target.ts': 'export declare const packedTarget: { (): number };' },
	enabledTargetKinds: ['declaredCallable']
})
assert.equal(implementationDiscovery.ok, true)
assert.equal(implementationDiscovery.targets.length, 1)
const completionShell = packageModule.createCompletionShellTemplate(implementationDiscovery.targets[0].completionShell)
assert.equal(completionShell.modelId, implementationDiscovery.targets[0].requiredRootTemplateId)
assert.equal(completionShell.manifestDigest, implementationDiscovery.targets[0].requiredRootTemplateManifestDigest)

const boundedSource = '/** @TEMPLATE id=Value output=expression **/\\n/** @TYPE number id=value **/ 0 /** @END **/\\n/** @END_TEMPLATE **/'
const [discoveredTemplate] = packageModule.discoverSourceTemplates(boundedSource)
assert.equal(discoveredTemplate.id, 'Value')
assert.equal(discoveredTemplate.regions[0].id, 'value')
assert.equal(
	packageModule.generateSourceTemplateWithReplacements(
		boundedSource,
		'Value',
		{ value: { kind: 'number', value: 42 } }
	).code.trim(),
	'42'
)
const typeSource = '/** @TYPE type id=value **/ unknown /** @END **/'
assert.equal(
	packageModule.generateWithReplacements(
		typeSource,
		{ value: { kind: 'type', code: 'string | null' } },
		{ templateMode: { kind: 'type' } }
	).code.trim(),
	'string | null'
)

const manifestFixture = fixtures.find(fixture => fixture.specifier.endsWith('/template-manifest.schema.json')).value
const artifactSetPlanFixture = fixtures.find(fixture => fixture.specifier.endsWith('/artifact-set-plan.schema.json')).value
assert.equal(packageModule.checkContract(packageModule.GraphTemplateManifestSchema, manifestFixture), true)
assert.equal(packageModule.checkContract(packageModule.ArtifactSetPlanSchema, artifactSetPlanFixture), true)
const manifestRegistry = packageModule.createTemplateRegistryFromManifests([manifestFixture])
assert.match(manifestRegistry.manifestDigest, /^m4_[a-f0-9]{64}$/u)
assert.deepEqual(
	packageModule.deriveTemplateCapabilityClosure(manifestRegistry.summaries(), {
		kind: 'goal', goal: { outputKind: 'sourceFile' }
	}).map(summary => summary.modelId),
	['PackedDeclaration']
)
const catalogPartialSchema = packageModule.templateRegistryToPartialSynthesisGraphJsonSchema(manifestRegistry)
const catalogStrictSchema = packageModule.templateRegistryToSynthesisGraphJsonSchema(manifestRegistry)
const omittedRequiredInputGraph = {
	nodes: [{ id: 'packed', templateId: 'PackedDeclaration', inputs: {} }],
	finalNodeId: 'packed'
}
const compiledArtifactSet = packageModule.compileArtifactSet(artifactSetPlanFixture, manifestRegistry)
assert.equal(compiledArtifactSet.ok, true)
assert.equal(compiledArtifactSet.complete, true)
assert.equal(
	packageModule.checkContract(packageModule.ArtifactSetCompilationResultSchema, compiledArtifactSet),
	true
)
const staticValidation = packageModule.validateArtifactSetStatic(
	artifactSetPlanFixture,
	manifestRegistry
)
assert.equal(staticValidation.ok, true)

const require = createRequire(import.meta.url)
const { default: Ajv2020 } = await import('ajv/dist/2020.js')
const ajv = new Ajv2020({ allErrors: true, strict: true })
const loadedSchemas = fixtures.map(fixture => ({
	...fixture,
	schema: require(fixture.specifier)
}))

for (const fixture of loadedSchemas) {
	assert.ok(fixture.schema && typeof fixture.schema === 'object', \`Schema export did not load: \${fixture.specifier}\`)
	ajv.addSchema(fixture.schema)
}

for (const fixture of loadedSchemas) {
	const validate = ajv.getSchema(fixture.schema.$id)
	assert.ok(validate, \`Packed schema did not compile: \${fixture.specifier}\`)
	assert.ok(
		validate(fixture.value),
		\`Packed schema rejected its representative value (\${fixture.specifier}): \${JSON.stringify(validate.errors)}\`
	)
}

const partialGraphValidate = ajv.compile(catalogPartialSchema)
const strictGraphValidate = ajv.compile(catalogStrictSchema)
assert.equal(partialGraphValidate(omittedRequiredInputGraph), true)
assert.equal(strictGraphValidate(omittedRequiredInputGraph), false)

const genericRegistry = packageModule.createTemplateRegistryFromManifests([{
	modelId: 'PackedGeneric',
	typeParameters: { T: { constraint: { ts: 'string' } } },
	inputs: {},
	output: { kind: 'expression', type: { ts: '{{T}}' } },
	source: '"packed"'
}])
const genericValidate = ajv.compile(packageModule.templateRegistryToPartialSynthesisGraphJsonSchema(genericRegistry))
const genericGraph = typeArguments => ({
	nodes: [{ id: 'generic', templateId: 'PackedGeneric', ...(typeArguments ? { typeArguments } : {}), inputs: {} }],
	finalNodeId: 'generic'
})
assert.equal(genericValidate(genericGraph({ T: { ts: 'string' } })), true)
assert.equal(genericValidate(genericGraph(undefined)), false)
assert.equal(genericValidate(genericGraph({ T: { ts: 'string' }, Extra: { ts: 'number' } })), false)
`, 'utf8')

	run(process.execPath, ['--no-warnings', runtimeFile], {
		cwd: consumerDirectory,
		env: {
			...process.env,
			PACKAGE_SMOKE_SCHEMA_FIXTURES: JSON.stringify(schemaFixtures)
		}
	})
}

async function runTypeScriptConsumerSmoke(
	consumerDirectory: string,
	packageName: string,
	schemaSubpaths: readonly string[],
	schemaFixtures: readonly SchemaFixture[]
): Promise<void> {
	const graph = fixtureForSchema('./schemas/synthesis-graph.schema.json')
	const summary = fixtureForSchema('./schemas/template-summary.schema.json')
	const result = fixtureForSchema('./schemas/graph-compilation-result.schema.json')
	const schemaImports = schemaSubpaths.map((subpath, index) =>
		`import schema${index} from ${JSON.stringify(`${packageName}/${subpath.slice(2)}`)} with { type: 'json' }`
	).join('\n')

	await writeFile(join(consumerDirectory, 'consumer.ts'), `
import {
	GENERATED_SOURCE_MAP_VERSION,
	GENERATED_SOURCE_SPAN_KIND_VALUES,
	REGION_KIND_VALUES,
	REGION_SYNTAX_ENGINE_VERSION,
	SYNTHESIZE_REGIONS_PACKAGE_VERSION,
	TEMPLATE_CAPABILITY_CLOSURE_VERSION,
	TEMPLATE_CATALOG_CONTRACT_DIGEST_VERSION,
	TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION,
	TEMPLATE_CATALOG_PLANNER_SCHEMA_VERSION,
	TEMPLATE_MANIFEST_DIGEST_VERSION,
	TemplateCatalogContractDigestSchema,
	TemplateCatalogManifestDigestSchema,
	TemplateManifestDigestSchema,
	GeneratedSourceMapSchema,
	SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG,
	ArtifactSetCompilationResultSchema,
	ArtifactSetGraphCompilationResultSchema,
	ArtifactSetAssemblyResultSchema,
	ArtifactSetSemanticValidationResultSchema,
	ArtifactSetPlanSchema,
	ArtifactSetStaticValidationResultSchema,
	ConstraintBoundStaticAcceptanceSchema,
	GraphTemplateManifestSchema,
	assembleArtifactSetTargets,
	assembleCompiledArtifactSetWithImports,
	captureTemplateCatalogView,
	checkContract,
	classifySynthesisDiagnosticCode,
	compileArtifactSet,
	compileArtifactSetGraphs,
	compareJsonSchemas,
	compareTypeDescriptors,
	compareTypeScriptTypes,
	createTemplateRegistryFromManifests,
	deepestGeneratedSourceSpan,
	deriveTemplateCapabilityClosure,
	discoverImplementationTargets,
	discoverSourceTemplates,
	createCompletionShellTemplate,
	finalizeArtifactSetStatic,
	generateSourceTemplateWithReplacements,
	templateRegistryToPartialSynthesisGraphJsonSchema,
	templateRegistryToSynthesisGraphJsonSchema,
	validateArtifactSetStatic,
	validateArtifactSetSemantics,
	validateImportReconciledArtifactSetSemantics,
	validateJsonValueAgainstSchema,
	validateSupportedJsonSchema,
	validateTypeScriptType,
	validateUnresolvedRuntimeValueReferences,
	isGeneratedSourceMap,
	type TypeDescriptorComparisonResult,
	type DiscoveredSourceTemplate,
	type GeneratedSourceMap,
	type GeneratedSourceSpan,
	type JsonValue,
	type ReplacementType,
	type ArtifactSetCompilationResult,
	type ArtifactSetGraphCompilationResult,
	type ArtifactSetAssemblyResult,
	type ArtifactSetSemanticValidationResult,
	type ArtifactSetPlan,
	type ArtifactSetStaticValidationResult,
	type ConstraintBoundStaticAcceptance,
	type GraphCompilationResult,
	type GraphTemplateManifest,
	type GraphRunnerAction,
	type GraphRunnerState,
	type ImplementationTargetDiscoveryResult,
	type CompletionShellManifest,
	type UnresolvedValueTypeScriptAuthority,
	type GraphSemanticContext,
	type SemanticTargetFileContext,
	type SupportedJsonSchema,
	type SynthesisGraph,
	type TemplateSummary,
	type TemplateCatalogContractDigest,
	type TemplateCatalogManifestDigest,
	type TemplateManifestDigest,
	type ValidatedArtifactChangeSet
} from ${JSON.stringify(packageName)}
${schemaImports}

const graph: SynthesisGraph = ${JSON.stringify(graph, null, 2)}
const summary: TemplateSummary = ${JSON.stringify(summary, null, 2)}
const result: GraphCompilationResult = ${JSON.stringify(result, null, 2)}
const runnerAction: GraphRunnerAction = ${JSON.stringify(fixtureForSchema('./schemas/graph-runner-action.schema.json'), null, 2)}
const runnerState: GraphRunnerState = ${JSON.stringify(fixtureForSchema('./schemas/graph-runner-state.schema.json'), null, 2)}
const supportedSchema: SupportedJsonSchema = ${JSON.stringify(fixtureForSchema('./schemas/supported-json-schema.schema.json'), null, 2)}
const templateManifest: GraphTemplateManifest = ${JSON.stringify(fixtureForSchema('./schemas/template-manifest.schema.json'), null, 2)}
const artifactSetPlan: ArtifactSetPlan = ${JSON.stringify(fixtureForSchema('./schemas/artifact-set-plan.schema.json'), null, 2)}
const artifactSetResult: ArtifactSetCompilationResult = ${JSON.stringify(fixtureForSchema('./schemas/artifact-set-compilation-result.schema.json'), null, 2)}
const artifactSetGraphResult: ArtifactSetGraphCompilationResult = ${JSON.stringify(fixtureForSchema('./schemas/artifact-set-graph-compilation-result.schema.json'), null, 2)}
const artifactSetAssemblyResult: ArtifactSetAssemblyResult = ${JSON.stringify(fixtureForSchema('./schemas/artifact-set-assembly-result.schema.json'), null, 2)}
const artifactSetSemanticResult: ArtifactSetSemanticValidationResult = ${JSON.stringify(fixtureForSchema('./schemas/artifact-set-semantic-validation-result.schema.json'), null, 2)}
const artifactSetStaticResult: ArtifactSetStaticValidationResult = ${JSON.stringify(fixtureForSchema('./schemas/artifact-set-static-validation-result.schema.json'), null, 2)}
const constraintAcceptance: ConstraintBoundStaticAcceptance = ${JSON.stringify(fixtureForSchema('./schemas/constraint-bound-static-acceptance.schema.json'), null, 2)}
const jsonValue: JsonValue = { values: [1, 'two', null] }
const descriptorComparison: TypeDescriptorComparisonResult = compareTypeDescriptors(
	{ ts: 'string', schema: { type: 'string' } },
	{ ts: 'string | number', schema: { type: ['string', 'number'] } }
)
const generatedSourceSpan: GeneratedSourceSpan = {
	kind: 'input', start: 0, end: 5, nestingDepth: 1,
	nodeId: 'mapped', templateId: 'MappedExpression', inputName: 'value'
}
const generatedSourceMap: GeneratedSourceMap = {
	version: GENERATED_SOURCE_MAP_VERSION,
	spans: [generatedSourceSpan]
}
const semanticTarget: SemanticTargetFileContext = {
	filePath: '/virtual/consumer.ts', start: 0, sourceText: 'PLACEHOLDER'
}
const semanticContext: GraphSemanticContext = { targetFile: semanticTarget }
const sourceMapVersion: 1 = GENERATED_SOURCE_MAP_VERSION
const regionSyntaxVersion: 2 = REGION_SYNTAX_ENGINE_VERSION
const packageVersion: '0.6.2' = SYNTHESIZE_REGIONS_PACKAGE_VERSION
const catalogContractVersion: 7 = TEMPLATE_CATALOG_CONTRACT_DIGEST_VERSION
const templateManifestVersion: 4 = TEMPLATE_MANIFEST_DIGEST_VERSION
const catalogManifestVersion: 4 = TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION
const plannerSchemaVersion: 4 = TEMPLATE_CATALOG_PLANNER_SCHEMA_VERSION
const capabilityClosureVersion: 3 = TEMPLATE_CAPABILITY_CLOSURE_VERSION
const catalogContractDigest: TemplateCatalogContractDigest = 'c7_${'1'.repeat(64)}'
const templateManifestDigest: TemplateManifestDigest = 't4_${'2'.repeat(64)}'
const catalogManifestDigest: TemplateCatalogManifestDigest = 'm4_${'3'.repeat(64)}'
const catalogContractIdentityMatches: boolean = checkContract(TemplateCatalogContractDigestSchema, catalogContractDigest)
const templateManifestIdentityMatches: boolean = checkContract(TemplateManifestDigestSchema, templateManifestDigest)
const catalogManifestIdentityMatches: boolean = checkContract(TemplateCatalogManifestDigestSchema, catalogManifestDigest)
const typeReplacement: ReplacementType = { kind: 'type', code: 'string | null' }
const sourceSpanKinds: readonly ['node', 'input'] = GENERATED_SOURCE_SPAN_KIND_VALUES
const sourceMapMatchesContract: boolean = checkContract(GeneratedSourceMapSchema, generatedSourceMap)
const sourceMapGuarded: boolean = isGeneratedSourceMap(generatedSourceMap)
const deepestSpan: GeneratedSourceSpan | undefined = deepestGeneratedSourceSpan(generatedSourceMap, 1)
const unknownDiagnosticIsTerminal: boolean = classifySynthesisDiagnosticCode('package-smoke-unknown') === 'terminalFailure'
const boundedSource = '/** @TEMPLATE id=Value output=expression **/\\n/** @TYPE number id=value **/ 0 /** @END **/\\n/** @END_TEMPLATE **/'
const discoveredTemplate: DiscoveredSourceTemplate = discoverSourceTemplates(boundedSource)[0]!
const generatedTemplateCode: string = generateSourceTemplateWithReplacements(
	boundedSource,
	'Value',
	{ value: { kind: 'number', value: 42 } }
).code
const implementationDiscovery: ImplementationTargetDiscoveryResult = discoverImplementationTargets({
	files: { 'src/packed-target.ts': 'export declare const packedTarget: { (): number };' },
	enabledTargetKinds: ['declaredCallable']
})
const completionShellManifest: CompletionShellManifest = implementationDiscovery.targets[0]!.completionShell
const completionShell = createCompletionShellTemplate(completionShellManifest)
const unresolvedValueTypeScriptAuthority: UnresolvedValueTypeScriptAuthority = {
	schemaVersion: 1, tsConfigFilePath: 'tsconfig.json', authorizedProjectReferences: []
}
const unresolvedValidation = validateUnresolvedRuntimeValueReferences({
	workspaceFiles: {
		'tsconfig.json': '{"compilerOptions":{"module":"ESNext","moduleResolution":"Bundler"},"include":["src/**/*.ts"]}',
		'src/packed-target.ts': 'export declare const packedTarget: { (): number };',
		'src/packed-consumer.ts': 'import { packedTarget } from "./packed-target.js"; export const result = 0;'
	},
	changes: [{
		path: 'src/packed-consumer.ts',
		sourceText: 'import { packedTarget } from "./packed-target.js"; export const result = packedTarget();'
	}],
	unresolvedValues: implementationDiscovery.unresolvedValues,
	allowedTargetIds: [],
	typeScriptAuthority: unresolvedValueTypeScriptAuthority
})
const manifestRegistry = createTemplateRegistryFromManifests([templateManifest])
const capabilityClosure: TemplateSummary[] = deriveTemplateCapabilityClosure(manifestRegistry.summaries(), {
	kind: 'goal', goal: { outputKind: 'sourceFile' }
})
const catalogPartialSchema: Record<string, unknown> = templateRegistryToPartialSynthesisGraphJsonSchema(manifestRegistry)
const catalogStrictSchema: Record<string, unknown> = templateRegistryToSynthesisGraphJsonSchema(manifestRegistry)
const compiledArtifactSet: ArtifactSetCompilationResult = compileArtifactSet(artifactSetPlan, manifestRegistry)
const validatedChangeSet: ValidatedArtifactChangeSet = artifactSetResult.ok && artifactSetResult.complete
	? {
		validation: artifactSetResult.validation,
		changes: artifactSetResult.changes,
		changeSetHash: artifactSetResult.changeSetHash,
		contractDigest: artifactSetResult.contractDigest,
		manifestDigest: artifactSetResult.manifestDigest,
		workspaceSnapshotHash: artifactSetResult.workspaceSnapshotHash,
		staticPolicyVersion: artifactSetResult.staticPolicyVersion
	}
	: {
		validation: 'static', changes: [], changeSetHash: 'cs1_unavailable',
		contractDigest: 'c7_${'0'.repeat(64)}',
		manifestDigest: 'm4_${'0'.repeat(64)}',
		workspaceSnapshotHash: 'ws2_${'0'.repeat(64)}',
		staticPolicyVersion: 2
	}
const manifestMatchesContract: boolean = checkContract(GraphTemplateManifestSchema, templateManifest)
const planMatchesContract: boolean = checkContract(ArtifactSetPlanSchema, artifactSetPlan)
const resultMatchesContract: boolean = checkContract(ArtifactSetCompilationResultSchema, artifactSetResult)
const staticResultMatchesContract: boolean = checkContract(ArtifactSetStaticValidationResultSchema, artifactSetStaticResult)

void graph
void summary
void result
void runnerAction
void runnerState
void supportedSchema
void templateManifest
void artifactSetPlan
void artifactSetResult
void artifactSetStaticResult
void jsonValue
void descriptorComparison
void generatedSourceMap
void semanticContext
void sourceMapVersion
void regionSyntaxVersion
void packageVersion
void catalogContractVersion
void templateManifestVersion
void catalogManifestVersion
void plannerSchemaVersion
void capabilityClosureVersion
void catalogContractIdentityMatches
void templateManifestIdentityMatches
void catalogManifestIdentityMatches
void REGION_KIND_VALUES
void typeReplacement
void sourceSpanKinds
void sourceMapMatchesContract
void sourceMapGuarded
void deepestSpan
void unknownDiagnosticIsTerminal
void SYNTHESIS_DIAGNOSTIC_CLASSIFICATION_CATALOG
void discoveredTemplate
void generatedTemplateCode
void implementationDiscovery
void completionShellManifest
void completionShell
void unresolvedValueTypeScriptAuthority
void unresolvedValidation
void catalogPartialSchema
void catalogStrictSchema
void compiledArtifactSet
void validatedChangeSet
void manifestMatchesContract
void capabilityClosure
void planMatchesContract
void resultMatchesContract
void staticResultMatchesContract
void compareJsonSchemas
void compareTypeScriptTypes
void validateJsonValueAgainstSchema
void validateSupportedJsonSchema
void validateTypeScriptType
void validateArtifactSetStatic
void assembleArtifactSetTargets
void assembleCompiledArtifactSetWithImports
void validateImportReconciledArtifactSetSemantics
void captureTemplateCatalogView
void finalizeArtifactSetStatic
void [${schemaFixtures.map((_, index) => `schema${index}`).join(', ')}]
`, 'utf8')

	await writeFile(join(consumerDirectory, 'tsconfig.json'), `${JSON.stringify({
		compilerOptions: {
			target: 'ES2022',
			module: 'NodeNext',
			moduleResolution: 'NodeNext',
			resolveJsonModule: true,
			strict: true,
			noEmit: true,
			skipLibCheck: false,
			types: []
		},
		include: ['consumer.ts']
	}, null, 2)}\n`, 'utf8')

	const typeScriptCli = join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc')
	run(process.execPath, [typeScriptCli, '-p', 'tsconfig.json'], {
		cwd: consumerDirectory,
		env: process.env
	})
}

function fixtureForSchema(subpath: string): unknown {
	switch (basename(subpath)) {
		case 'implementation-target-discovery-result.schema.json':
			return { schemaVersion: 1, ok: true, discoveryDigest: `disc1_${'1'.repeat(64)}`, targets: [], unresolvedValues: [], diagnostics: [] }

		case 'completion-shell-manifest.schema.json':
			return {
				schemaVersion: 1, targetId: `it1_${'1'.repeat(64)}`,
				rootTemplateId: 'project.completion.target', rootTemplateVersion: '1',
				outputRegionKind: 'declaration', implementationRegionKind: 'expression',
				implementationInputName: 'implementation', source: 'const value = 1;',
				sourceHash: `sha256:${'2'.repeat(64)}`, declarationContractHash: `sha256:${'3'.repeat(64)}`,
				rootTemplateManifestDigest: `t4_${'4'.repeat(64)}`
			}

		case 'required-root-template-authority.schema.json':
			return {
				schemaVersion: 1, artifactId: 'artifact', requiredRootTemplateId: 'project.completion.target',
				requiredRootTemplateManifestDigest: `t4_${'4'.repeat(64)}`
			}

		case 'template-import-requirement.schema.json':
			return {
				schemaVersion: 1, moduleSpecifier: '@scope/helpers', importKind: 'named',
				importedName: 'helper', localName: 'helper', typeOnly: false
			}

		case 'artifact-import-authority.schema.json':
			return {
				schemaVersion: 1, artifactId: 'artifact', path: 'src/value.ts',
				allowed: [{
					schemaVersion: 1, moduleSpecifier: '@scope/helpers', importKind: 'named',
					importedName: 'helper', localName: 'helper', typeOnly: false
				}]
			}

		case 'import-reconciliation-result.schema.json':
			return { ok: true, files: [], diagnostics: [] }

		case 'unresolved-value-validation-result.schema.json':
			return { ok: true, references: [], diagnostics: [] }

		case 'unresolved-value-typescript-authority.schema.json':
			return { schemaVersion: 1, tsConfigFilePath: 'tsconfig.json', authorizedProjectReferences: [] }

		case 'implementation-enforcement-result.schema.json':
			return { ok: true, diagnostics: [] }

		case 'replacement-map.schema.json':
			return {
				answer: { kind: 'number', value: 42 },
				type: { kind: 'type', code: 'string | null' },
				member: { kind: 'typeMember', code: 'readonly id: string' },
				statements: [
					{ kind: 'statement', code: 'const answer = 42;' },
					{ kind: 'statement', code: 'return answer;' }
				]
			}

		case 'supported-json-schema.schema.json':
			return {
				$defs: {
					identifier: { type: 'string', minLength: 1 }
				},
				type: 'array',
				prefixItems: [{ $ref: '#/$defs/identifier' }],
				items: false,
				minItems: 1,
				maxItems: 1
			}

		case 'template-manifest.schema.json':
			return templateManifestFixture()

		case 'artifact-set-plan.schema.json':
			return artifactSetPlanFixture()

		case 'artifact-set-compilation-result.schema.json':
			return artifactSetCompilationResultFixture()

		case 'artifact-set-graph-compilation-result.schema.json':
			return {
				kind: 'artifactSetGraphCompilation', mode: 'strict', ok: false, complete: false,
				classification: 'terminalFailure', plan: artifactSetPlanFixture(), units: [], diagnostics: []
			}

		case 'artifact-set-assembly-result.schema.json':
			return { ok: false, classification: 'terminalFailure', changes: [], diagnostics: [] }

		case 'artifact-set-semantic-validation-result.schema.json':
			return { ok: false, classification: 'terminalFailure', changes: [], diagnostics: [] }

		case 'constraint-bound-static-acceptance.schema.json': {
			const hash = `sha256:${'a'.repeat(64)}`
			return {
				schemaVersion: 2, constraintEntryPath: '.constraints/main.wsc',
				constraintDigest: `wc1_${'b'.repeat(64)}`, constraintSourceSnapshotHash: hash,
				constraintEngineVersion: 4,
				evaluatorIdentity: 'workspace-constraints-evaluator-4', toolchainIdentity: 'typescript-5.9.3',
				analysisSnapshotHash: hash,
				phaseEvidence: {
					plan: { taskHash: hash, resultBlobHash: hash }, artifact: { taskHash: hash, resultBlobHash: hash },
					assembled: { taskHash: hash, resultBlobHash: hash }, semantic: { taskHash: hash, resultBlobHash: hash }
				}
			}
		}

		case 'artifact-set-static-validation-result.schema.json':
			return artifactSetStaticValidationResultFixture()

		case 'synthesis-graph.schema.json':
			return {
				nodes: [{
					id: 'root',
					templateId: 'RootTemplate',
					inputs: {
						literal: { kind: 'literal', value: 42 },
						raw: { kind: 'rawCode', code: 'request.url' },
						explicitReference: { kind: 'ref', nodeId: 'dependency' },
						shorthandReference: { $ref: 'dependency' },
						inline: {
							kind: 'inline',
							node: {
								id: 'inline',
								templateId: 'InlineTemplate',
								inputs: {
									nested: {
										kind: 'inline',
										node: { id: 'nested', templateId: 'NestedTemplate', inputs: {} }
									}
								}
							}
						},
						statements: {
							kind: 'fragmentCollection',
							items: [
								{ $ref: 'dependency' },
								{ kind: 'ref', nodeId: 'dependency' },
								{
									kind: 'inline',
									node: { id: 'collectionInline', templateId: 'StatementTemplate', inputs: {} }
								}
							]
						}
					}
				}],
				finalNodeId: 'root',
				goal: { outputKind: 'statement' }
			}

		case 'template-summary.schema.json':
			return {
				modelId: 'PackageSmokeTemplate',
				version: '1.0.0',
				description: 'Exercises every planner-facing port summary.',
				inputs: {
					name: {
						kind: 'literal',
						regionKind: 'string',
						required: true,
						schema: { type: 'string' }
					},
					body: {
						kind: 'fragmentCollection',
						regionKind: 'statement',
						required: true,
						accepts: {
							outputKind: 'statement',
							sourceModelIds: ['StatementTemplate']
						},
						separator: '\n',
						minItems: 1
					},
					code: {
						kind: 'rawCode',
						regionKind: 'expression',
						required: false,
						policy: {
							maxLength: 100,
							allowNewlines: false,
							forbiddenSubstrings: ['eval']
						}
					},
					value: {
						kind: 'union',
						required: true,
						options: [{
							kind: 'fragment',
							regionKind: 'expression',
							required: true,
							accepts: { outputKind: 'expression' }
						}]
					}
				},
				output: {
					kind: 'statement',
					description: 'A generated statement list.'
				}
			}

		case 'graph-compilation-result.schema.json':
			const compilationArtifact = mappedArtifactFixture()
			return {
				kind: 'graphCompilation',
				mode: 'strict',
				ok: true,
				finalArtifact: compilationArtifact,
				artifacts: { mapped: compilationArtifact },
				diagnostics: []
			}

		case 'graph-runner-action.schema.json':
			return {
				kind: 'fill',
				inputs: {
					value: { kind: 'fragment', fragment: mappedArtifactFixture() }
				}
			}

		case 'graph-runner-state.schema.json':
			return {
				kind: 'complete',
				graph: {
					nodes: [],
					finalNodeId: 'mapped'
				},
				artifact: mappedArtifactFixture(),
				diagnostics: []
			}

		default:
			throw new Error(`No packed-package smoke fixture is defined for ${subpath}.`)
	}
}

function templateManifestFixture(): unknown {
	return {
		modelId: 'PackedDeclaration',
		version: '1.0.0',
		description: 'A declarative manifest loaded by the packed consumer.',
		inputs: {
			value: {
				kind: 'rawCode',
				regionKind: 'expression',
				policy: { allowNewlines: false }
			}
		},
		output: { kind: 'sourceFile' },
		source: 'export const packedValue = /** @TYPE expression id=value **/0/** @END **/;'
	}
}

function artifactSetPlanFixture(): unknown {
	return {
		artifacts: [{
			id: 'packed-file',
			graph: {
				nodes: [{
					id: 'packed',
					templateId: 'PackedDeclaration',
					inputs: { value: { kind: 'rawCode', code: '1' } }
				}],
				finalNodeId: 'packed'
			},
			target: { kind: 'createFile', path: 'src/packed.ts' }
		}]
	}
}

function artifactSetCompilationResultFixture(): unknown {
	const plan = artifactSetPlanFixture() as {
		artifacts: Array<{
			id: string
			graph: { nodes: unknown[]; finalNodeId: string }
			target: { kind: 'createFile'; path: string }
		}>
	}
	const unit = plan.artifacts[0]!
	const code = 'export const packedValue = 1;'
	const artifact = {
		id: 'packed',
		code,
		kind: 'sourceFile',
		source: { templateId: 'PackedDeclaration' },
		complete: true
	}
	return {
		kind: 'artifactSetCompilation',
		mode: 'strict',
		ok: true,
		complete: true,
		validation: 'static',
		contractDigest: `c7_${'1'.repeat(64)}`,
		manifestDigest: `m4_${'2'.repeat(64)}`,
		workspaceSnapshotHash: `ws2_${'3'.repeat(64)}`,
		staticPolicyVersion: 2,
		plan,
		units: [{
			artifactId: unit.id,
			graphHash: 'g1_package_smoke',
			target: unit.target,
			compilation: {
				kind: 'graphCompilation',
				mode: 'partial',
				ok: true,
				finalArtifact: artifact,
				artifacts: { packed: artifact },
				diagnostics: []
			},
			artifact,
			artifactHash: 'a1_package_smoke',
			appliedFills: [],
			diagnostics: []
		}],
		changes: [{
			kind: 'createFile',
			path: unit.target.path,
			resultingFileHash: 'f1_package_smoke',
			sourceText: code,
			edits: [{
				artifactId: unit.id,
				start: 0,
				end: 0,
				resultStart: 0,
				resultEnd: code.length,
				replacement: code,
				artifactHash: 'a1_package_smoke'
			}]
		}],
		changeSetHash: 'cs1_package_smoke',
		diagnostics: []
	}
}

function artifactSetStaticValidationResultFixture(): unknown {
	const result = artifactSetCompilationResultFixture() as Record<string, unknown>
	return {
		ok: true,
		validation: result.validation,
		changes: result.changes,
		changeSetHash: result.changeSetHash,
		contractDigest: result.contractDigest,
		manifestDigest: result.manifestDigest,
		workspaceSnapshotHash: result.workspaceSnapshotHash,
		staticPolicyVersion: result.staticPolicyVersion,
		diagnostics: []
	}
}

function mappedArtifactFixture(): unknown {
	return {
		id: 'mapped',
		code: 'value',
		kind: 'expression',
		source: { templateId: 'MappedExpression' },
		sourceMap: {
			version: 1,
			spans: [
				{
					kind: 'node', start: 0, end: 5, nestingDepth: 0,
					nodeId: 'mapped', templateId: 'MappedExpression'
				},
				{
					kind: 'input', start: 0, end: 5, nestingDepth: 1,
					nodeId: 'mapped', templateId: 'MappedExpression', inputName: 'value'
				}
			]
		},
		complete: true
	}
}

function normalizeManifestTarget(target: string): string {
	return target.startsWith('./') ? target : `./${target}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function assertPathExists(path: string, message: string): Promise<void> {
	try {
		await stat(path)
	} catch {
		throw new Error(message)
	}
}

async function readJson<T>(path: string): Promise<T> {
	return JSON.parse(await readFile(path, 'utf8')) as T
}

interface RunOptions {
	readonly cwd: string
	readonly env: NodeJS.ProcessEnv
}

function runNpm(args: readonly string[], options: RunOptions): void {
	const npmExecPath = process.env.npm_execpath
	if (npmExecPath) {
		run(process.execPath, [npmExecPath, ...args], options)
		return
	}

	run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, options)
}

function run(command: string, args: readonly string[], options: RunOptions): void {
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		env: options.env,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	})

	if (result.status !== 0) {
		const details = [
			result.stdout,
			result.stderr,
			result.error?.message,
			result.signal ? `Terminated by signal ${result.signal}.` : undefined
		].filter(Boolean).join('\n').trim()
		throw new Error(
			`Command failed (${command} ${args.join(' ')}):${details ? `\n${details}` : ''}`
		)
	}
}
