import { execFileSync } from 'node:child_process'

const domains = [
	'ai', 'application', 'batching', 'cache', 'child-process', 'cli', 'cluster',
	'concurrency', 'config', 'core', 'data', 'datetime', 'errors', 'es-toolkit',
	'eventlog', 'http', 'layer', 'observability', 'openapi', 'platform',
	'resilience', 'resources', 'rpc', 'runtime', 'schedule', 'schema', 'security',
	'socket', 'sql', 'stm', 'stream', 'testing', 'workflow'
]

for (const specifier of [
	'@synthesize-regions/core-templates',
	'@synthesize-regions/core-templates/curated',
	'@synthesize-regions/core-templates/effect-v4',
	'@synthesize-regions/core-templates/effect-v4/authoring',
	'@synthesize-regions/core-templates/base',
	'@synthesize-regions/core-templates/es-toolkit',
	'@synthesize-regions/core-templates/drizzle-orm/v1',
	...domains.map((domain) => `@synthesize-regions/core-templates/effect-v4/${domain}`)
]) {
	await import(specifier)
}

for (const specifier of [
	'@synthesize-regions/core-templates/metadata/effect-v4.json',
	'@synthesize-regions/core-templates/metadata/effect-v4-replacements.json',
	'@synthesize-regions/core-templates/metadata/drizzle-orm-v1.json'
]) {
	const loaded = await import(specifier, { with: { type: 'json' } })
	if (loaded.default === undefined) throw new Error(`JSON export did not load: ${specifier}`)
}

const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], { encoding: 'utf8' }))
const files = packed[0].files.map((entry) => entry.path)
for (const forbidden of ['scripts/', 'tools/', 'test/', 'evidence/', '.artifacts/', 'effect-v4-catalog-raw-inventory.json']) {
	if (files.some((file) => file.startsWith(forbidden))) throw new Error(`package contains forbidden path ${forbidden}`)
}
if (files.some((file) => file.endsWith('.zip'))) throw new Error('package contains an archive')
for (const required of [
	'dist/index.js',
	'dist/packs/drizzle-orm/v1/index.js',
	'metadata/effect-v4-catalog-manifest.json',
	'metadata/drizzle-orm-v1-catalog-manifest.json',
	'README.md'
]) {
	if (!files.includes(required)) throw new Error(`package is missing ${required}`)
}
console.log(`package smoke passed (${files.length} packed files)`)
