import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'

import {
	collectExecutableTests,
	collectTopLevelDeclarations,
	verifyPathTestReference
} from './invariant-checker-core.js'

interface OwnedContract {
	id: string
	owner: string
	path: string
	symbols: string[]
}

interface LedgerEntry {
	id: string
	claim: string
	authoritativeOwner: string
	enforcementBoundary: string
	contractVersion: string
	ownedSymbols: string[]
	adversarialTestIds: string[]
	residualAssumptions: string[]
}

interface Ledger {
	schemaVersion: number
	repository: string
	packageVersion: string
	ownedContracts: OwnedContract[]
	approximatedContracts: unknown[]
	documentationBoundaries: {
		path: string
		authority: string
		requiredPhrases: string[]
	}[]
	entries: LedgerEntry[]
}

const root = resolve(import.meta.dirname, '..')
const write = process.argv.includes('--write')
if (process.argv.slice(2).some(argument => argument !== '--write')) throw new TypeError('Usage: check-invariants.ts [--write]')
const ledger = JSON.parse(readFileSync(resolve(root, 'invariants/phase-1-3.json'), 'utf8')) as Ledger
const packageManifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { name?: unknown; version?: unknown }
const errors: string[] = []
const expectedOwner = `${ledger.repository}@${ledger.packageVersion}`

if (ledger.schemaVersion !== 2 || ledger.repository !== 'synthesize-regions' || !Array.isArray(ledger.entries)) {
	errors.push('Invariant ledger header is invalid.')
}
if (ledger.packageVersion !== packageManifest.version) errors.push('Invariant ledger packageVersion is stale.')
if (packageManifest.name !== ledger.repository) errors.push('Invariant ledger repository does not match the package name.')
if (!Array.isArray(ledger.approximatedContracts) || ledger.approximatedContracts.length !== 0) {
	errors.push('An authoritative package may not publish hand-authored contract approximations.')
}
for (const boundary of ledger.documentationBoundaries ?? []) {
	if (typeof boundary.authority !== 'string' || boundary.authority.length === 0
		|| !Array.isArray(boundary.requiredPhrases) || boundary.requiredPhrases.length === 0) {
		errors.push(`Documentation boundary ${boundary.path} is malformed.`)
		continue
	}
	try {
		const source = readFileSync(resolve(root, boundary.path), 'utf8')
		for (const phrase of boundary.requiredPhrases) {
			if (!source.includes(phrase)) errors.push(`${boundary.path} lost its ${boundary.authority} authority disclaimer: ${phrase}.`)
		}
	} catch {
		errors.push(`Documentation boundary is missing: ${boundary.path}.`)
	}
}

const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
	const path = resolve(directory, entry.name)
	return entry.isDirectory() ? sourceFiles(path) : entry.isFile() && entry.name.endsWith('.ts') ? [path] : []
})
const testCases = sourceFiles(resolve(root, 'test')).flatMap(path =>
	collectExecutableTests(relative(root, path).replaceAll('\\', '/'), readFileSync(path, 'utf8'))
)

const contractIds = new Set<string>()
const contractSymbols = new Map<string, string>()
for (const contract of ledger.ownedContracts ?? []) {
	if (!/^synthesize-regions-[a-z0-9-]+$/u.test(contract.id) || contractIds.has(contract.id)) {
		errors.push(`Invalid or duplicate owned contract ID ${contract.id}.`)
	}
	contractIds.add(contract.id)
	if (contract.owner !== expectedOwner) errors.push(`Contract ${contract.id} has stale owner ${contract.owner}.`)
	if (!Array.isArray(contract.symbols) || contract.symbols.length === 0 || new Set(contract.symbols).size !== contract.symbols.length) {
		errors.push(`Contract ${contract.id} must own a non-empty unique symbol list.`)
	}
	let declarations = new Map<string, boolean>()
	try {
		const path = resolve(root, contract.path)
		if (!statSync(path).isFile()) throw new Error('not a file')
		declarations = new Map(collectTopLevelDeclarations(contract.path, readFileSync(path, 'utf8')).map(value => [value.name, value.exported]))
	} catch {
		errors.push(`Contract ${contract.id} owner path is missing: ${contract.path}.`)
	}
	for (const symbol of contract.symbols ?? []) {
		const previous = contractSymbols.get(symbol)
		if (previous !== undefined) errors.push(`Contract symbol ${symbol} has multiple owners: ${previous} and ${contract.id}.`)
		contractSymbols.set(symbol, contract.id)
		if (declarations.get(symbol) !== true) errors.push(`Contract ${contract.id} does not export ${symbol} from ${contract.path}.`)
	}
}

const ids = new Set<string>()
const invariantSymbols = new Map<string, string>()
for (const entry of ledger.entries) {
	if (!/^SR-[A-Z0-9-]+$/u.test(entry.id) || ids.has(entry.id)) errors.push(`Invalid or duplicate invariant ID ${entry.id}.`)
	ids.add(entry.id)
	for (const field of ['claim', 'authoritativeOwner', 'enforcementBoundary', 'contractVersion'] as const) {
		if (typeof entry[field] !== 'string' || entry[field].length === 0) errors.push(`${entry.id} has an empty ${field}.`)
	}
	if (entry.authoritativeOwner !== expectedOwner) errors.push(`${entry.id} has stale authoritative owner ${entry.authoritativeOwner}.`)
	let boundaryDeclarations = new Map<string, boolean>()
	try {
		const boundaryPath = resolve(root, entry.enforcementBoundary)
		if (!statSync(boundaryPath).isFile()) throw new Error('not a file')
		boundaryDeclarations = new Map(collectTopLevelDeclarations(entry.enforcementBoundary, readFileSync(boundaryPath, 'utf8')).map(value => [value.name, value.exported]))
	} catch {
		errors.push(`${entry.id} enforcement boundary does not exist: ${entry.enforcementBoundary}.`)
	}
	if (!Array.isArray(entry.ownedSymbols) || entry.ownedSymbols.length === 0) errors.push(`${entry.id} has no owned symbols.`)
	for (const symbol of entry.ownedSymbols ?? []) {
		const previous = invariantSymbols.get(symbol)
		if (previous !== undefined) errors.push(`${symbol} has conflicting invariant owners ${previous} and ${entry.id}.`)
		invariantSymbols.set(symbol, entry.id)
		if (boundaryDeclarations.get(symbol) !== true) errors.push(`${entry.id} does not export ${symbol} from ${entry.enforcementBoundary}.`)
	}
	if (!Array.isArray(entry.adversarialTestIds) || entry.adversarialTestIds.length === 0) errors.push(`${entry.id} has no adversarial test.`)
	for (const testId of entry.adversarialTestIds ?? []) {
		const failure = verifyPathTestReference(testId, testCases)
		if (failure) errors.push(`${entry.id}: ${failure}`)
	}
	if (!Array.isArray(entry.residualAssumptions)) errors.push(`${entry.id} residual assumptions must be an array.`)
}

const inventory = `# Phase 1–3 synthesize-regions invariants

Generated from \`invariants/phase-1-3.json\`. Do not edit by hand.

| ID | Exact claim | Owner | Boundary | Contract | Adversarial tests | Residual assumptions |
| --- | --- | --- | --- | --- | --- | --- |
${ledger.entries.map(entry => `| ${entry.id} | ${entry.claim} | ${entry.authoritativeOwner} | ${entry.enforcementBoundary} | ${entry.contractVersion} | ${entry.adversarialTestIds.join(', ')} | ${entry.residualAssumptions.join(' ') || 'None'} |`).join('\n')}
`
const inventoryPath = resolve(root, 'docs/phase-1-3-invariants.md')
if (write) writeFileSync(inventoryPath, inventory, 'utf8')
else {
	try {
		if (readFileSync(inventoryPath, 'utf8') !== inventory) errors.push('Generated invariant inventory is stale.')
	} catch {
		errors.push('Generated invariant inventory is missing.')
	}
}

if (errors.length > 0) {
	throw new Error(`Phase 1-3 invariant check failed:\n${errors.map(error => `- ${error}`).join('\n')}`)
}

console.log(`Verified ${ledger.entries.length} Phase 1-3 invariants, ${testCases.length} executable tests, ${ledger.ownedContracts.length} uniquely owned shared contracts (${contractSymbols.size} symbols), and ${ledger.documentationBoundaries.length} cross-project documentation boundaries.`)
