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
		.filter(subpath => subpath.endsWith('.json'))
		.sort()
}

async function linkInstalledDependencies(nodeModulesDirectory: string, manifest: PackageManifest): Promise<void> {
	const dependencyNames = new Set([
		...Object.keys(manifest.dependencies ?? {}),
		...Object.keys(manifest.devDependencies ?? {})
	])

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
import type { GraphCompilationResult, SynthesisGraph, TemplateSummary } from ${JSON.stringify(packageName)}
${schemaImports}

const graph: SynthesisGraph = ${JSON.stringify(graph, null, 2)}
const summary: TemplateSummary = ${JSON.stringify(summary, null, 2)}
const result: GraphCompilationResult = ${JSON.stringify(result, null, 2)}

void graph
void summary
void result
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
		case 'replacement-map.schema.json':
			return {
				answer: { kind: 'number', value: 42 },
				statements: [
					{ kind: 'statement', code: 'const answer = 42;' },
					{ kind: 'statement', code: 'return answer;' }
				]
			}

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
			return {
				kind: 'graphCompilation',
				mode: 'strict',
				ok: false,
				diagnostics: [{
					stage: 'type',
					code: 'TypeScriptSemanticError',
					severity: 'error',
					message: "Type 'string' is not assignable to type 'number'.",
					nodeId: 'root',
					templateId: 'RootTemplate',
					path: 'generated.ts',
					compilerCode: 2322,
					compilerCategory: 'error',
					line: 1,
					column: 7
				}]
			}

		default:
			throw new Error(`No packed-package smoke fixture is defined for ${subpath}.`)
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
