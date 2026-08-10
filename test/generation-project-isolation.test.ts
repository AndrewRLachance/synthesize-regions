import { describe, expect, it } from 'vitest'
import { FinalValidationError } from '../src/core/errors.js'
import { generateWithReplacements } from '../src/generation/generate.js'

const template = 'const value: number = /** @TYPE expression id=value **/ 0 /** @END **/;'
const filePath = '/virtual/generation-project-isolation.ts'

describe('Generation project isolation', () => {
	it('isolates consecutive generations at the same file path', () => {
		const first = generateWithReplacements(template, {
			value: { kind: 'expression', code: '1 + 1' }
		}, { filePath, checkSemanticDiagnostics: true })
		const second = generateWithReplacements(template, {
			value: { kind: 'expression', code: '2 * 2' }
		}, { filePath, checkSemanticDiagnostics: true })

		expect(first.code).toBe('const value: number = 1 + 1;')
		expect(second.code).toBe('const value: number = 2 * 2;')
	})

	it('isolates a successful retry from a failed semantic validation', () => {
		expect(() => generateWithReplacements(template, {
			value: { kind: 'expression', code: '"wrong"' }
		}, { filePath, checkSemanticDiagnostics: true })).toThrow(FinalValidationError)

		const retried = generateWithReplacements(template, {
			value: { kind: 'expression', code: '2' }
		}, { filePath, checkSemanticDiagnostics: true })
		expect(retried.code).toBe('const value: number = 2;')
	})
})
