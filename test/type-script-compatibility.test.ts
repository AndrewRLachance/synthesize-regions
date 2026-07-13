import { describe, expect, it } from 'vitest'
import {
	compareTypeScriptTypes,
	TYPESCRIPT_COMPATIBILITY_ENGINE_VERSION,
	validateTypeScriptType
} from '../src/templates/typeScriptCompatibility.js'

describe('TypeScript descriptor validation', () => {
	it('accepts self-contained ES2022 type expressions', () => {
		for (const typeExpression of [
			'string | number',
			'Array<Promise<number>>',
			'Map<string, ReadonlySet<number>>',
			'<T>(value: T) => T',
			'{ readonly value: string; transform(input: number): boolean }',
			'readonly [string, number?]',
			'unknown',
			'never'
		]) {
			expect(validateTypeScriptType(typeExpression)).toEqual({
				ok: true,
				typeExpression
			})
		}

		expect(TYPESCRIPT_COMPATIBILITY_ENGINE_VERSION).toBe('ts1')
	})

	it('rejects syntax errors, injected declarations, and unresolved names', () => {
		const invalid = validateTypeScriptType('Array<')
		expect(invalid.ok).toBe(false)
		if (!invalid.ok) expect(invalid.issues[0]?.code).toBe('InvalidTypeScriptType')

		const injected = validateTypeScriptType('string; type Surprise = number')
		expect(injected.ok).toBe(false)
		if (!injected.ok) expect(injected.issues[0]?.code).toBe('InvalidTypeScriptType')

		const unresolved = validateTypeScriptType('ProjectLocalType', 'descriptor.ts')
		expect(unresolved.ok).toBe(false)
		if (!unresolved.ok) {
			expect(unresolved.issues[0]).toMatchObject({
				code: 'UnresolvedTypeScriptType',
				path: 'descriptor.ts',
				compilerCode: 2304,
				compilerCategory: 'error'
			})
		}
	})

	it('rejects explicit, nested, and indirectly resolved any types', () => {
		for (const typeExpression of [
			'any',
			'Promise<any>',
			'{ nested: { value: any } }',
			'() => any',
			'ReturnType<typeof JSON.parse>',
			'Promise<ReturnType<typeof JSON.parse>>'
		]) {
			const result = validateTypeScriptType(typeExpression)
			expect(result.ok, typeExpression).toBe(false)
			if (!result.ok) expect(result.issues[0]?.code, typeExpression).toBe('ForbiddenAnyType')
		}
	})

	it('returns stable cached validation results without exposing mutable cache state', () => {
		const first = validateTypeScriptType('ReadonlyArray<{ value: string }>')
		const second = validateTypeScriptType('ReadonlyArray<{ value: string }>')
		expect(second).toEqual(first)
	})
})

describe('TypeScript compiler assignability', () => {
	it('compares unions and nested generic types directionally', () => {
		expect(compareTypeScriptTypes('string | number', 'string').status).toBe('compatible')
		expect(compareTypeScriptTypes('string', 'string | number').status).toBe('incompatible')
		expect(compareTypeScriptTypes('Promise<string | number>', 'Promise<string>').status).toBe('compatible')
		expect(compareTypeScriptTypes('Promise<string>', 'Promise<string | number>').status).toBe('incompatible')
	})

	it('uses strict structural assignability for objects and functions', () => {
		expect(compareTypeScriptTypes(
			'{ id: string }',
			'{ id: string; enabled: boolean }'
		).status).toBe('compatible')
		expect(compareTypeScriptTypes(
			'{ id: string; enabled: boolean }',
			'{ id: string }'
		).status).toBe('incompatible')
		expect(compareTypeScriptTypes(
			'(value: string) => string | number',
			'(value: string | number) => string'
		).status).toBe('compatible')
		expect(compareTypeScriptTypes(
			'(value: string | number) => string',
			'(value: string) => string'
		).status).toBe('incompatible')
	})

	it('handles readonly collections and tuples like TypeScript', () => {
		expect(compareTypeScriptTypes('readonly string[]', 'string[]').status).toBe('compatible')
		expect(compareTypeScriptTypes('string[]', 'readonly string[]').status).toBe('incompatible')
		expect(compareTypeScriptTypes('readonly [string, number]', '[string, number]').status).toBe('compatible')
		expect(compareTypeScriptTypes('[string, number]', 'readonly [string, number]').status).toBe('incompatible')
	})

	it('honors unknown and never assignability', () => {
		expect(compareTypeScriptTypes('unknown', '{ value: string }').status).toBe('compatible')
		expect(compareTypeScriptTypes('string', 'unknown').status).toBe('incompatible')
		expect(compareTypeScriptTypes('string', 'never').status).toBe('compatible')
		expect(compareTypeScriptTypes('never', 'string').status).toBe('incompatible')
	})

	it('distinguishes missing and invalid producer metadata', () => {
		expect(compareTypeScriptTypes(undefined, undefined)).toEqual({
			status: 'compatible',
			reason: 'noExpectedType'
		})
		expect(compareTypeScriptTypes(undefined, 'string')).toEqual({
			status: 'compatible',
			reason: 'noExpectedType',
			actual: 'string'
		})
		expect(compareTypeScriptTypes('string', undefined)).toEqual({
			status: 'incompatible',
			reason: 'missingActualType',
			expected: 'string'
		})

		const invalid = compareTypeScriptTypes('string', 'MissingProducerType')
		expect(invalid.status).toBe('invalid')
		if (invalid.status === 'invalid') {
			expect(invalid.issues[0]).toMatchObject({
				code: 'UnresolvedTypeScriptType',
				path: 'actual'
			})
		}
	})

	it('returns stable results for cached comparisons', () => {
		const first = compareTypeScriptTypes('ReadonlyArray<unknown>', 'string[]')
		const second = compareTypeScriptTypes('ReadonlyArray<unknown>', 'string[]')
		expect(first).toEqual({
			status: 'compatible',
			reason: 'assignable',
			expected: 'ReadonlyArray<unknown>',
			actual: 'string[]'
		})
		expect(second).toEqual(first)
	})
})
