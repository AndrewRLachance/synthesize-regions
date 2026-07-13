import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateVirtualSemanticTarget } from '../src/templates/semanticTarget.js'

describe('virtual semantic target validation', () => {
	it('subtracts unchanged target errors and maps generated diagnostics to artifact offsets', () => {
		const placeholder = 'PLACEHOLDER'
		const sourceText = [
			'const existing: number = "already wrong";',
			`const generated = ${placeholder};`
		].join('\n')
		const start = sourceText.indexOf(placeholder)
		const code = 'knownValue + missingValue'
		const result = validateVirtualSemanticTarget({
			targetFile: {
				filePath: '/virtual/generated.ts',
				start,
				end: start + placeholder.length,
				sourceText
			},
			prelude: 'declare const knownValue: number;',
			artifact: { code, kind: 'expression', type: { ts: 'number' } }
		})

		expect(result.diagnostics.some(diagnostic => diagnostic.code === 2322 && diagnostic.message.includes('already wrong'))).toBe(false)
		const missing = result.diagnostics.find(diagnostic => diagnostic.code === 2304)
		expect(missing).toMatchObject({
			artifactOffset: code.indexOf('missingValue'),
			line: 1,
			column: code.indexOf('missingValue') + 1,
			length: 'missingValue'.length
		})
		expect(missing?.filePath).toContain('/virtual/generated.ts')
	})

	it('reads a target from disk without modifying it', () => {
		const directory = mkdtempSync(join(tmpdir(), 'synthesize-regions-semantic-'))
		const filePath = join(directory, 'target.ts')
		const placeholder = 'PLACEHOLDER'
		const sourceText = `declare const localValue: number;\nconst output = ${placeholder};\n`
		writeFileSync(filePath, sourceText)
		try {
			const start = sourceText.indexOf(placeholder)
			const result = validateVirtualSemanticTarget({
				targetFile: { filePath, start, end: start + placeholder.length },
				artifact: { code: 'localValue + 1', kind: 'expression' }
			})

			expect(result.diagnostics).toEqual([])
			expect(readFileSync(filePath, 'utf8')).toBe(sourceText)
		} finally {
			rmSync(directory, { recursive: true, force: true })
		}
	})

	it('resolves bindings imported by the real target file', () => {
		const directory = mkdtempSync(join(tmpdir(), 'synthesize-regions-import-'))
		const filePath = join(directory, 'target.ts')
		const dependencyPath = join(directory, 'dependency.ts')
		const placeholder = 'PLACEHOLDER'
		const sourceText = `import { importedValue } from './dependency';\nconst output = ${placeholder};\n`
		writeFileSync(dependencyPath, 'export const importedValue: number = 1;\n')
		writeFileSync(filePath, sourceText)
		try {
			const start = sourceText.indexOf(placeholder)
			const result = validateVirtualSemanticTarget({
				targetFile: { filePath, start, end: start + placeholder.length },
				artifact: { code: 'importedValue + 1', kind: 'expression', type: { ts: 'number' } }
			})

			expect(result.diagnostics).toEqual([])
			expect(readFileSync(filePath, 'utf8')).toBe(sourceText)
		} finally {
			rmSync(directory, { recursive: true, force: true })
		}
	})

	it('uses caller-supplied unsaved source instead of disk contents', () => {
		const directory = mkdtempSync(join(tmpdir(), 'synthesize-regions-unsaved-'))
		const filePath = join(directory, 'target.ts')
		writeFileSync(filePath, 'const diskOnly = 1;')
		const placeholder = 'PLACEHOLDER'
		const sourceText = `declare const unsavedValue: number;\nconst output = ${placeholder};`
		try {
			const start = sourceText.indexOf(placeholder)
			const result = validateVirtualSemanticTarget({
				targetFile: { filePath, sourceText, start, end: start + placeholder.length },
				artifact: { code: 'unsavedValue + 1', kind: 'expression' }
			})

			expect(result.diagnostics).toEqual([])
		} finally {
			rmSync(directory, { recursive: true, force: true })
		}
	})

	it('types an expression suffix against its real receiver and supports pure insertion', () => {
		const sourceText = [
			'declare const receiver: { length: number };',
			'const output = receiver;'
		].join('\n')
		const start = sourceText.lastIndexOf(';')
		const valid = validateVirtualSemanticTarget({
			targetFile: { filePath: '/virtual/suffix.ts', sourceText, start },
			artifact: { code: '.length', kind: 'expressionSuffix', type: { ts: 'number' } }
		})
		expect(valid.diagnostics).toEqual([])

		const invalid = validateVirtualSemanticTarget({
			targetFile: { filePath: '/virtual/suffix.ts', sourceText, start },
			artifact: { code: '.length', kind: 'expressionSuffix', type: { ts: 'boolean' } }
		})
		expect(invalid.diagnostics.some(diagnostic => diagnostic.code === 1360)).toBe(true)
	})

	it('rejects invalid target ranges before creating a virtual source file', () => {
		expect(() => validateVirtualSemanticTarget({
			targetFile: { filePath: '/virtual/range.ts', sourceText: 'const value = 1;', start: 20 },
			artifact: { code: '2', kind: 'number' }
		})).toThrow(RangeError)
	})
})
