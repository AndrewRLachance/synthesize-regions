import { describe, expect, it } from 'vitest'
import {
	canonicalJsonSchemaString,
	canonicalizeSupportedJsonSchema,
	compareJsonSchemas,
	schemaWithResourceId,
	validateJsonValueAgainstSchema,
	validateSupportedJsonSchema
} from '../src/templates/schemaCompatibility.js'
import {
	JSON_SCHEMA_DIALECT_URI,
	SUPPORTED_JSON_SCHEMA_TYPE_VALUES,
	type JsonValue,
	type SupportedJsonSchema
} from '../src/templates/schemaTypes.js'

describe('supported JSON Schema validation', () => {
	it('accepts the Draft 2020-12 profile and resolves local JSON Pointer references', () => {
		const schema = {
			$schema: JSON_SCHEMA_DIALECT_URI,
			$defs: {
				identifier: { type: 'integer', minimum: 1 }
			},
			type: 'object',
			required: ['id'],
			properties: { id: { $ref: '#/$defs/identifier' } },
			additionalProperties: false
		} as const satisfies SupportedJsonSchema

		const validation = validateSupportedJsonSchema(schema)
		expect(validation.ok).toBe(true)
		expect(validateJsonValueAgainstSchema({ id: 2 }, schema).ok).toBe(true)
		const mismatch = validateJsonValueAgainstSchema({ id: 0 }, schema)
		expect(mismatch.ok).toBe(false)
		if (!mismatch.ok) expect(mismatch.issues[0]?.path).toBe('$.id')
	})

	it('rejects unknown, remote, unresolved, nested-dialect, and legacy keywords', () => {
		const values: unknown[] = [
			{ type: 'string', unknownKeyword: true },
			{ $ref: 'https://example.test/schema' },
			{ $ref: '#/$defs/missing', $defs: {} },
			{ type: 'object', properties: { value: { $schema: JSON_SCHEMA_DIALECT_URI } } },
			{ definitions: {} },
			{ $id: 'https://example.test/authored' }
		]
		for (const value of values) expect(validateSupportedJsonSchema(value).ok).toBe(false)
	})

	it('treats formats and content keywords as annotations', () => {
		const schema = {
			type: 'string',
			format: 'email',
			contentEncoding: 'base64',
			contentMediaType: 'application/json',
			contentSchema: { type: 'object' }
		} as const satisfies SupportedJsonSchema
		expect(validateJsonValueAgainstSchema('not an email or base64 value', schema).ok).toBe(true)
	})

	it('accepts Draft-valid type-less constraints and open tuples', () => {
		const typeLess = { minLength: 2 } as const satisfies SupportedJsonSchema
		expect(validateSupportedJsonSchema(typeLess).ok).toBe(true)
		expect(validateJsonValueAgainstSchema('x', typeLess).ok).toBe(false)
		expect(validateJsonValueAgainstSchema('xy', typeLess).ok).toBe(true)
		// String constraints are ignored for non-strings under JSON Schema semantics.
		expect(validateJsonValueAgainstSchema(1, typeLess).ok).toBe(true)

		const openTuple = {
			prefixItems: [{ type: 'string' }, { type: 'integer' }]
		} as const satisfies SupportedJsonSchema
		expect(validateSupportedJsonSchema(openTuple).ok).toBe(true)
		expect(validateJsonValueAgainstSchema(['head', 1, true], openTuple).ok).toBe(true)
		expect(validateJsonValueAgainstSchema(['head', 'wrong'], openTuple).ok).toBe(false)

		// Ajv strict-mode authoring hints must not narrow the published Draft
		// profile: these schemas are valid even when their keywords are ignored
		// for instances of other types or overlap another property applicator.
		for (const draftValid of [
			{ required: ['value'] },
			{ then: { type: 'string' } },
			{ minContains: 1 },
			{ properties: { value: true }, patternProperties: { '^value$': true } }
		]) {
			expect(validateSupportedJsonSchema(draftValid).ok, JSON.stringify(draftValid)).toBe(true)
		}
	})

	it('validates conditionals, dependencies, contains, and unevaluated constraints', () => {
		const conditional = {
			type: 'object',
			properties: { kind: { enum: ['count', 'label'] }, value: true },
			required: ['kind', 'value'],
			if: { properties: { kind: { const: 'count' } }, required: ['kind'] },
			then: { properties: { value: { type: 'integer' } } },
			else: { properties: { value: { type: 'string' } } },
			additionalProperties: false
		} as const satisfies SupportedJsonSchema
		expect(validateJsonValueAgainstSchema({ kind: 'count', value: 2 }, conditional).ok).toBe(true)
		expect(validateJsonValueAgainstSchema({ kind: 'count', value: 'two' }, conditional).ok).toBe(false)
		expect(validateJsonValueAgainstSchema({ kind: 'label', value: 'two' }, conditional).ok).toBe(true)

		const dependencies = {
			type: 'object',
			properties: {
				creditCard: { type: 'string' }, billingAddress: { type: 'string' },
				kind: { type: 'string' }, value: true
			},
			dependentRequired: { creditCard: ['billingAddress'] },
			dependentSchemas: {
				kind: { properties: { value: { type: 'integer' } }, required: ['value'] }
			},
			additionalProperties: false
		} as const satisfies SupportedJsonSchema
		expect(validateJsonValueAgainstSchema({ creditCard: '1', billingAddress: 'home' }, dependencies).ok).toBe(true)
		expect(validateJsonValueAgainstSchema({ creditCard: '1' }, dependencies).ok).toBe(false)
		expect(validateJsonValueAgainstSchema({ kind: 'count', value: 1 }, dependencies).ok).toBe(true)
		expect(validateJsonValueAgainstSchema({ kind: 'count', value: 'one' }, dependencies).ok).toBe(false)

		const containingArray = {
			type: 'array',
			prefixItems: [{ const: 'head' }],
			contains: { type: 'integer' }, minContains: 1, maxContains: 2
		} as const satisfies SupportedJsonSchema
		expect(validateJsonValueAgainstSchema(['head', 1, 2], containingArray).ok).toBe(true)
		expect(validateJsonValueAgainstSchema(['head'], containingArray).ok).toBe(false)
		expect(validateJsonValueAgainstSchema(['head', 1, 2, 3], containingArray).ok).toBe(false)

		const closedTuple = {
			prefixItems: [{ const: 'head' }], unevaluatedItems: false
		} as const satisfies SupportedJsonSchema
		expect(validateJsonValueAgainstSchema(['head'], closedTuple).ok).toBe(true)
		expect(validateJsonValueAgainstSchema(['head', 'tail'], closedTuple).ok).toBe(false)

		const object = {
			allOf: [{ properties: { id: { type: 'integer' } }, required: ['id'] }],
			unevaluatedProperties: false
		} as const satisfies SupportedJsonSchema
		expect(validateJsonValueAgainstSchema({ id: 1 }, object).ok).toBe(true)
		expect(validateJsonValueAgainstSchema({ id: 1, extra: true }, object).ok).toBe(false)
	})

	it('validates numeric, string, and collection bounds', () => {
		const numeric = { type: 'number', exclusiveMinimum: 0, maximum: 10, multipleOf: 0.5 } as const
		expect(validateJsonValueAgainstSchema(0.5, numeric).ok).toBe(true)
		expect(validateJsonValueAgainstSchema(0, numeric).ok).toBe(false)
		expect(validateJsonValueAgainstSchema(10.5, numeric).ok).toBe(false)
		expect(validateJsonValueAgainstSchema(1.25, numeric).ok).toBe(false)

		const text = { type: 'string', minLength: 2, maxLength: 4 } as const
		expect(validateJsonValueAgainstSchema('two', text).ok).toBe(true)
		expect(validateJsonValueAgainstSchema('x', text).ok).toBe(false)

		const list = { type: 'array', minItems: 1, maxItems: 2, uniqueItems: true } as const
		expect(validateJsonValueAgainstSchema([1, 2], list).ok).toBe(true)
		expect(validateJsonValueAgainstSchema([], list).ok).toBe(false)
		expect(validateJsonValueAgainstSchema([1, 1], list).ok).toBe(false)
	})

	it('rejects non-JSON values and reports the failing instance path', () => {
		const value = { nested: [1, Number.NaN] }
		const validation = validateJsonValueAgainstSchema(value, true)
		expect(validation.ok).toBe(false)
		if (!validation.ok) expect(validation.issues[0]?.path).toBe('$.nested[1]')
	})

	it('canonicalizes object and set-like ordering without mutating schemas', () => {
		const schema = { required: ['z', 'a', 'z'], type: ['string', 'null', 'string'] } as const satisfies SupportedJsonSchema
		const canonical = canonicalizeSupportedJsonSchema(schema)
		expect(canonical).toEqual({ required: ['a', 'z'], type: ['null', 'string'] })
		expect(schema.required).toEqual(['z', 'a', 'z'])
		expect(canonicalJsonSchemaString(schema)).toBe('{"required":["a","z"],"type":["null","string"]}')
		expect(SUPPORTED_JSON_SCHEMA_TYPE_VALUES).toContain('integer')
	})

	it('preserves oneOf multiplicity while canonicalizing branch order', () => {
		const repeated = {
			oneOf: [{ type: 'string' }, { type: 'string' }]
		} as const satisfies SupportedJsonSchema
		const canonical = canonicalizeSupportedJsonSchema(repeated)
		expect(typeof canonical).toBe('object')
		if (typeof canonical === 'object') expect(canonical.oneOf).toHaveLength(2)
		expect(validateJsonValueAgainstSchema('matches both branches', repeated).ok).toBe(false)

		expect(canonicalJsonSchemaString({ oneOf: [{ type: 'number' }, { type: 'string' }] })).toBe(
			canonicalJsonSchemaString({ oneOf: [{ type: 'string' }, { type: 'number' }] })
		)
	})

	it('adds a generated resource boundary without accepting authored IDs', () => {
		const embedded = schemaWithResourceId({
			$defs: { value: { type: ['string', 'null'] } },
			$ref: '#/$defs/value', required: ['z', 'a']
		}, 'urn:test:value')
		expect(embedded.$id).toBe('urn:test:value')
		expect(embedded.required).toEqual(['a', 'z'])
		expect((embedded.$defs as Record<string, { type: string[] }>).value?.type).toEqual(['null', 'string'])
		expect(validateSupportedJsonSchema(embedded).ok).toBe(false)
		expect(schemaWithResourceId(true, 'urn:test:true')).toEqual({ $id: 'urn:test:true' })
		expect(schemaWithResourceId(false, 'urn:test:false')).toEqual({ $id: 'urn:test:false', not: {} })
	})
})

describe('schema compatibility', () => {
	it('uses producer-subset-of-consumer direction for types, finite values, and bounds', () => {
		expect(compareJsonSchemas({ type: 'integer', minimum: 2 }, { type: 'number', minimum: 1 }).compatibility).toBe('compatible')
		expect(compareJsonSchemas({ type: 'number' }, { type: 'integer' }).compatibility).toBe('incompatible')
		expect(compareJsonSchemas({ enum: [1, 2] }, { type: 'number', maximum: 2 }).compatibility).toBe('compatible')
		expect(compareJsonSchemas({ const: 3 }, { enum: [1, 2] }).compatibility).toBe('incompatible')
	})

	it('compares required object properties and additional-property policies', () => {
		const actual = {
			type: 'object', required: ['id'],
			properties: { id: { type: 'integer', minimum: 1 } }, additionalProperties: false
		} as const
		const expected = {
			type: 'object', required: ['id'],
			properties: { id: { type: 'number', minimum: 0 } }, additionalProperties: false
		} as const
		expect(compareJsonSchemas(actual, expected).compatibility).toBe('compatible')
		expect(compareJsonSchemas({ ...actual, required: [] }, expected).compatibility).toBe('incompatible')
	})

	it('compares tuples, homogeneous arrays, and collection bounds', () => {
		const tuple = { type: 'array', prefixItems: [{ type: 'integer' }, { const: 'ok' }], items: false, minItems: 2, maxItems: 2 } as const
		const expected = { type: 'array', prefixItems: [{ type: 'number' }, { type: 'string' }], items: false, minItems: 2, maxItems: 2 } as const
		expect(compareJsonSchemas(tuple, expected).compatibility).toBe('compatible')
		expect(compareJsonSchemas({ type: 'array', items: { type: 'number' } }, { type: 'array', items: { type: 'string' } }).compatibility).toBe('incompatible')
	})

	it('returns indeterminate for advanced relationships that cannot be proven', () => {
		expect(compareJsonSchemas({ type: 'string', pattern: '^a' }, { type: 'string', pattern: '^a.*z$' }).compatibility).toBe('indeterminate')
		expect(compareJsonSchemas({ type: 'number' }, { anyOf: [{ type: 'integer' }, { type: 'number', not: { type: 'integer' } }] }).compatibility).toBe('indeterminate')

		// The evaluated property/item sets depend on sibling applicators. Even
		// equal unevaluated declarations are unsafe to compare structurally when
		// those siblings differ.
		expect(compareJsonSchemas(
			{ properties: { value: true }, unevaluatedProperties: false },
			{ properties: {}, unevaluatedProperties: false }
		).compatibility).toBe('indeterminate')
		expect(compareJsonSchemas(
			{ prefixItems: [true], unevaluatedItems: false },
			{ prefixItems: [], unevaluatedItems: false }
		).compatibility).toBe('indeterminate')
	})

	it('includes composition siblings in consumer subset proofs', () => {
		expect(compareJsonSchemas(
			{ type: 'number', minimum: 0 },
			{ allOf: [{ type: 'number' }], minimum: 10 }
		).compatibility).toBe('incompatible')
		expect(compareJsonSchemas(
			{ type: 'number', minimum: 0 },
			{ anyOf: [{ type: 'number' }, { type: 'string' }], minimum: 10 }
		).compatibility).toBe('incompatible')
		expect(compareJsonSchemas(
			{ type: 'array' },
			{ allOf: [{ type: 'array' }], minItems: 2 }
		).compatibility).toBe('incompatible')
		expect(compareJsonSchemas(
			{ type: 'number', minimum: 10 },
			{ allOf: [{ type: 'number' }], minimum: 10 }
		).compatibility).toBe('compatible')
	})

	it('resolves nested references against each schema document root', () => {
		const actual = {
			$defs: { value: { type: 'integer', minimum: 1 } },
			type: 'object', required: ['value'], additionalProperties: false,
			properties: { value: { $ref: '#/$defs/value' } }
		} as const satisfies SupportedJsonSchema
		const compatibleExpected = {
			$defs: { value: { type: 'number', minimum: 0 } },
			type: 'object', required: ['value'], additionalProperties: false,
			properties: { value: { $ref: '#/$defs/value' } }
		} as const satisfies SupportedJsonSchema
		const incompatibleExpected = {
			$defs: { value: { type: 'string' } },
			type: 'object', required: ['value'], additionalProperties: false,
			properties: { value: { $ref: '#/$defs/value' } }
		} as const satisfies SupportedJsonSchema

		expect(compareJsonSchemas(actual, compatibleExpected).compatibility).toBe('compatible')
		expect(compareJsonSchemas(actual, incompatibleExpected).compatibility).toBe('incompatible')
	})

	it('validates nested finite producers in their own root context', () => {
		const actual = {
			type: 'object', required: ['value'], additionalProperties: false,
			properties: { value: { const: 3 } }
		} as const satisfies SupportedJsonSchema
		const expected = {
			$defs: {
				atMostTwo: { allOf: [{ $ref: '#/$defs/number' }, { maximum: 2 }] },
				number: { type: 'number' }
			},
			type: 'object', required: ['value'], additionalProperties: false,
			properties: { value: { $ref: '#/$defs/atMostTwo' } }
		} as const satisfies SupportedJsonSchema

		expect(compareJsonSchemas(actual, expected).compatibility).toBe('incompatible')
		expect(compareJsonSchemas({ ...actual, properties: { value: { const: 2 } } }, expected).compatibility).toBe('compatible')
	})

	it('exposes a recursive JSON value type', () => {
		const value: JsonValue = { values: [1, 'two', null] }
		expect(value).toEqual({ values: [1, 'two', null] })
	})
})
