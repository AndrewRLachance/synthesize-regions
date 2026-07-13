import { describe, expect, it } from 'vitest'

import {
	JsonValueSchema,
	SupportedJsonSchemaSchema,
	isJsonValueContract,
	isSupportedJsonSchemaContract
} from '../src/templates/schemaContract.js'
import { JSON_SCHEMA_DIALECT_URI } from '../src/templates/schemaTypes.js'
import { Value } from '@sinclair/typebox/value'

describe('supported JSON Schema contract', () => {
	it('accepts boolean schemas and the closed Draft 2020-12 profile', () => {
		for (const schema of [true, false, {}]) {
			expect(isSupportedJsonSchemaContract(schema)).toBe(true)
			expect(Value.Check(SupportedJsonSchemaSchema, schema)).toBe(true)
		}

		expect(isSupportedJsonSchemaContract({
			$schema: JSON_SCHEMA_DIALECT_URI,
			$comment: 'A representative supported schema.',
			title: 'Record list',
			description: 'Exercises validation, applicator, and annotation keywords.',
			default: [{ id: 1 }],
			deprecated: false,
			readOnly: true,
			writeOnly: false,
			examples: [[], [{ id: 2 }]],
			type: ['array'],
			prefixItems: [{ type: 'object' }],
			items: {
				type: 'object',
				properties: {
					id: { type: 'integer', minimum: 0 },
					label: {
						type: 'string', minLength: 1, maxLength: 80, pattern: '^[A-Z]',
						format: 'display-label', contentEncoding: 'identity', contentMediaType: 'text/plain',
						contentSchema: true
					}
				},
				patternProperties: { '^x-': { type: ['string', 'null'] } },
				additionalProperties: false,
				propertyNames: { type: 'string' },
				required: ['id'],
				minProperties: 1,
				maxProperties: 10,
				dependentRequired: { label: ['id'] },
				dependentSchemas: { label: { required: ['id'] } },
				unevaluatedProperties: false
			},
			contains: { $ref: '#/$defs/record' },
			minContains: 1,
			maxContains: 4,
			minItems: 1,
			maxItems: 5,
			uniqueItems: true,
			unevaluatedItems: false,
			$defs: {
				record: {
					allOf: [
						{ type: 'object' },
						{ anyOf: [{ const: { id: 1 } }, { enum: [{ id: 2 }, { id: 3 }] }] }
					]
				}
			},
			oneOf: [{ type: 'array' }, { not: { type: 'null' } }],
			if: { minItems: 2 },
			then: { maxItems: 5 },
			else: { maxItems: 1 }
		})).toBe(true)
	})

	it('accepts recursive JSON values and rejects non-JSON values', () => {
		const value = {
			nullValue: null,
			primitives: [true, 1, 'value'],
			nested: { list: [{ ok: false }] }
		}

		expect(Value.Check(JsonValueSchema, value)).toBe(true)
		expect(isJsonValueContract(value)).toBe(true)
		expect(isJsonValueContract({ ['line\nbreak']: { nested: true } })).toBe(true)
		expect(isJsonValueContract({ ['line\nbreak']: undefined })).toBe(false)
		expect(isJsonValueContract({ value: undefined })).toBe(false)
		expect(isJsonValueContract({ value: 1n })).toBe(false)
		expect(isSupportedJsonSchemaContract({ const: { value: undefined } })).toBe(false)
	})

	it('accepts only local JSON Pointer references', () => {
		for (const $ref of ['#', '#/', '#/$defs/value', '#/$defs/a~1b', '#/tilde~0name', '#/empty//segment']) {
			expect(isSupportedJsonSchemaContract({ $ref })).toBe(true)
		}

		for (const $ref of [
			'', '/$defs/value', 'other.json#/$defs/value', 'https://example.com/schema',
			'#anchor', '#/$defs/bad~2escape', '#/$defs/trailing~'
		]) {
			expect(isSupportedJsonSchemaContract({ $ref })).toBe(false)
		}
	})

	it('rejects unknown and legacy keywords at every recursive level', () => {
		for (const schema of [
			{ $id: 'example' },
			{ $anchor: 'example' },
			{ $dynamicRef: '#node' },
			{ definitions: {} },
			{ dependencies: {} },
			{ nullable: true },
			{ properties: { nested: { unknownKeyword: true } } }
		]) {
			expect(isSupportedJsonSchemaContract(schema)).toBe(false)
		}
	})

	it('enforces recursive child shapes and structural collection constraints', () => {
		for (const schema of [
			{ properties: { value: null } },
			{ patternProperties: { '^x': 'string' } },
			{ items: [] },
			{ prefixItems: [] },
			{ prefixItems: [{ type: 'unknown' }] },
			{ contentSchema: null },
			{ allOf: [] },
			{ anyOf: [] },
			{ oneOf: [] },
			{ enum: [] },
			{ type: [] },
			{ type: ['string', 'string'] },
			{ required: ['value', 'value'] },
			{ dependentRequired: { value: ['other', 'other'] } }
		]) {
			expect(isSupportedJsonSchemaContract(schema)).toBe(false)
		}
	})

	it('requires nonnegative integers and a positive multipleOf value', () => {
		for (const keyword of [
			'maxLength', 'minLength', 'minContains', 'maxContains', 'minItems', 'maxItems',
			'minProperties', 'maxProperties'
		] as const) {
			expect(isSupportedJsonSchemaContract({ [keyword]: 0 })).toBe(true)
			expect(isSupportedJsonSchemaContract({ [keyword]: -1 })).toBe(false)
			expect(isSupportedJsonSchemaContract({ [keyword]: 1.5 })).toBe(false)
		}

		expect(isSupportedJsonSchemaContract({ multipleOf: 0.5 })).toBe(true)
		expect(isSupportedJsonSchemaContract({ multipleOf: 0 })).toBe(false)
		expect(isSupportedJsonSchemaContract({ multipleOf: -1 })).toBe(false)
	})
})
