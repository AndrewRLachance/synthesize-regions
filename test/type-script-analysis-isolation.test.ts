import { beforeEach, describe, expect, it } from 'vitest'
import {
	compareTypeScriptTypes,
	resetTypeScriptCompatibility,
	validateTypeScriptType
} from '../src/templates/typeScriptCompatibility.js'
import {
	createProject,
	createSourceFile,
	resetSharedProject
} from '../src/validation/ast.js'

describe('TypeScript analysis isolation', () => {
	beforeEach(() => {
		resetTypeScriptCompatibility()
	})

	it('creates independent default projects', () => {
		const first = createProject()
		const firstFile = createSourceFile(first, 'const collision = 1;', '/virtual/first.ts')
		const second = createProject()

		expect(second).not.toBe(first)
		expect(second.getSourceFiles()).toHaveLength(0)

		const secondFile = createSourceFile(second, 'const collision = 2;', '/virtual/second.ts')
		expect(firstFile.getFullText()).toBe('const collision = 1;')
		expect(secondFile.getFullText()).toBe('const collision = 2;')
		expect(second.getProgram().getSemanticDiagnostics(secondFile)).toEqual([])
	})

	it('keeps the deprecated reset shim callable without introducing shared state', () => {
		const first = createProject()
		expect(() => resetSharedProject()).not.toThrow()
		expect(createProject()).not.toBe(first)
	})

	it('maintains compatibility results across calls', () => {
		expect(validateTypeScriptType('string').ok).toBe(true)
		expect(validateTypeScriptType('string').ok).toBe(true)
		expect(compareTypeScriptTypes('string', 'number').status).toBe('incompatible')
		expect(compareTypeScriptTypes('string', 'number').status).toBe('incompatible')
	})

	it('continues cleanly after an invalid type descriptor', () => {
		expect(validateTypeScriptType('Array<').ok).toBe(false)
		expect(validateTypeScriptType('Array<string>')).toEqual({
			ok: true,
			typeExpression: 'Array<string>'
		})
		expect(compareTypeScriptTypes('string', 'number').status).toBe('incompatible')
	})

	it('remains usable after compatibility caches are reset', () => {
		expect(validateTypeScriptType('string').ok).toBe(true)
		expect(compareTypeScriptTypes('string', 'number').status).toBe('incompatible')

		resetTypeScriptCompatibility()

		expect(validateTypeScriptType('boolean')).toEqual({
			ok: true,
			typeExpression: 'boolean'
		})
		expect(compareTypeScriptTypes('boolean', 'string').status).toBe('incompatible')
	})
})
