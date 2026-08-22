import { describe, expect, it } from 'vitest'

import {
	buildCapturedTypeScriptProject,
	buildCapturedTypeScriptProjectWithOwner,
	createCapturedTypeScriptProgramOwner,
	discardCapturedTypeScriptProgramOwner
} from '../src/templates/capturedProject.js'

function projectFiles(candidate: string, strict = true): Map<string, string> {
	return new Map([
		['tsconfig.json', JSON.stringify({ compilerOptions: { strict, noEmit: true }, include: ['src/**/*.ts'] })],
		['src/contracts.ts', 'export interface Value { readonly count: number }'],
		['src/candidate.ts', candidate]
	])
}

describe('captured TypeScript incremental program ownership', () => {
	it('matches a fresh semantic program across candidate revisions', () => {
		const owner = createCapturedTypeScriptProgramOwner()
		const invalid = buildCapturedTypeScriptProjectWithOwner({
			files: projectFiles("import type { Value } from './contracts.js'; export const value: Value = { count: 'bad' };"),
			tsConfigFilePath: 'tsconfig.json',
			semantic: true
		}, owner)
		expect(invalid.issues.some(issue => issue.code === 2322)).toBe(true)

		const correctedFiles = projectFiles("import type { Value } from './contracts.js'; export const value: Value = { count: 1 };")
		const incremental = buildCapturedTypeScriptProjectWithOwner({
			files: correctedFiles,
			tsConfigFilePath: 'tsconfig.json',
			semantic: true
		}, owner)
		const fresh = buildCapturedTypeScriptProject({
			files: correctedFiles,
			tsConfigFilePath: 'tsconfig.json',
			semantic: true
		})
		expect(incremental).toEqual(fresh)
		expect(incremental.issues).toEqual([])
	})

	it('resets on compiler identity changes and rejects a discarded owner', () => {
		const owner = createCapturedTypeScriptProgramOwner()
		const strict = buildCapturedTypeScriptProjectWithOwner({
			files: projectFiles('export function identity(value) { return value }'),
			tsConfigFilePath: 'tsconfig.json',
			semantic: true
		}, owner)
		expect(strict.issues.some(issue => issue.code === 7006)).toBe(true)

		const relaxedFiles = projectFiles('export function identity(value) { return value }', false)
		const relaxed = buildCapturedTypeScriptProjectWithOwner({
			files: relaxedFiles,
			tsConfigFilePath: 'tsconfig.json',
			semantic: true
		}, owner)
		expect(relaxed).toEqual(buildCapturedTypeScriptProject({
			files: relaxedFiles,
			tsConfigFilePath: 'tsconfig.json',
			semantic: true
		}))
		expect(relaxed.issues).toEqual([])

		discardCapturedTypeScriptProgramOwner(owner)
		expect(() => buildCapturedTypeScriptProjectWithOwner({
			files: relaxedFiles,
			tsConfigFilePath: 'tsconfig.json',
			semantic: true
		}, owner)).toThrow(/discarded/u)
	})
})
