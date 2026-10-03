import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createCoreTemplateRegistry } from '@synthesize-regions/core-templates'
import type { SynthesisInput, TemplateRegistry } from 'synthesize-regions'

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const outputRoot = join(projectRoot, 'demo-output')

const writtenFiles: string[] = []

let registry: TemplateRegistry | undefined

/** Build the curated 479-template registry once per demo run. */
export function coreRegistry(): TemplateRegistry {
	registry ??= createCoreTemplateRegistry()
	return registry
}

/** Remove every artifact from a previous demo run. */
export function resetOutput(): void {
	rmSync(outputRoot, { recursive: true, force: true })
	writtenFiles.length = 0
}

/** Write one generated artifact and record it for the closing summary. */
export function writeOutput(relativePath: string, contents: string): string {
	const target = join(outputRoot, relativePath)
	mkdirSync(dirname(target), { recursive: true })
	writeFileSync(target, contents.endsWith('\n') ? contents : `${contents}\n`)
	writtenFiles.push(relativePath)
	return target
}

/** Files written so far, in write order. */
export function writtenOutputs(): readonly string[] {
	return writtenFiles
}

/** Print one step heading. */
export function step(title: string, detail: string): void {
	console.log(`\n${'='.repeat(78)}\n${title}\n${detail}\n${'='.repeat(78)}`)
}

/** Print a labelled block of generated code. */
export function code(label: string, source: string): void {
	console.log(`\n--- ${label} ${'-'.repeat(Math.max(0, 72 - label.length))}`)
	console.log(source)
}

/** Print a labelled key/value line. */
export function fact(label: string, value: string): void {
	console.log(`  ${label.padEnd(26)} ${value}`)
}

/** Print a left-aligned label followed by an indented body. */
export function block(label: string, body: string): void {
	console.log(`\n--- ${label} ${'-'.repeat(Math.max(0, 72 - label.length))}`)
	console.log(body.split('\n').map(line => `  ${line}`).join('\n'))
}

/** Render one row of a fixed-width table. */
export function row(cells: readonly string[], widths: readonly number[]): string {
	return cells.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join('  ').trimEnd()
}

/** Render the header for a fixed-width table. */
export function tableHeader(cells: readonly string[], widths: readonly number[]): string {
	return row(cells, widths)
}

/** Compact single-line rendering of one synthesis diagnostic. */
export function diagnosticLine(diagnostic: {
	code: string
	message: string
	stage: string
	nodeId?: string
	inputName?: string
}): string {
	const target = [diagnostic.nodeId, diagnostic.inputName].filter(Boolean).join('.')
	return `[${diagnostic.stage}] ${diagnostic.code}${target ? ` (${target})` : ''}: ${diagnostic.message}`
}

/** Build a raw-code graph input. */
export const raw = (code: string): SynthesisInput => ({ kind: 'rawCode', code })

/** Build a literal graph input. */
export const literal = (value: unknown): SynthesisInput => ({ kind: 'literal', value })

/** Build a fragment reference input. */
export const ref = (nodeId: string): SynthesisInput => ({ kind: 'ref', nodeId })

/** Build an ordered fragment-collection input. */
export const collection = (...nodeIds: readonly string[]): SynthesisInput => ({
	kind: 'fragmentCollection',
	items: nodeIds.map(nodeId => ({ kind: 'ref', nodeId }))
})

/** Fail the demo run when a compilation did not succeed. */
export function assertOk<T extends { ok: true } | { ok: false; diagnostics: readonly unknown[] }>(
	result: T,
	context: string
): asserts result is Extract<T, { ok: true }> {
	if (result.ok) return
	const diagnostics = result.diagnostics
		.map(diagnostic => diagnosticLine(diagnostic as Parameters<typeof diagnosticLine>[0]))
		.join('\n')
	throw new Error(`${context} failed:\n${diagnostics}`)
}
