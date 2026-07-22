import { createHash } from 'node:crypto'
import type { ErrorObject, ValidateFunction } from 'ajv'
import Ajv2020 from 'ajv/dist/2020.js'
import { BoundedLruMap, compareCodeUnits } from './deterministic.js'
import {
	JSON_SCHEMA_DIALECT_URI,
	SUPPORTED_JSON_SCHEMA_KEYWORD_VALUES,
	SUPPORTED_JSON_SCHEMA_TYPE_VALUES,
	type JsonObject,
	type JsonValue,
	type SupportedJsonSchema,
	type SupportedJsonSchemaObject,
	type SupportedJsonSchemaType
} from './schemaTypes.js'

export type SupportedJsonSchemaIssueCode =
	| 'InvalidJsonSchema'
	| 'UnsupportedJsonSchemaKeyword'
	| 'UnsupportedJsonSchemaReference'
	| 'UnresolvedJsonSchemaReference'

export interface SupportedJsonSchemaIssue {
	readonly code: SupportedJsonSchemaIssueCode
	readonly message: string
	readonly path: string
	readonly keyword?: string
	readonly actual?: unknown
}

export type SupportedJsonSchemaValidationResult =
	| {
		readonly ok: true
		readonly schema: SupportedJsonSchema
		readonly canonicalSchema: SupportedJsonSchema
		readonly canonicalJson: string
	}
	| { readonly ok: false; readonly issues: readonly SupportedJsonSchemaIssue[] }

export interface JsonSchemaValueIssue {
	readonly code: 'InvalidJsonValue' | 'JsonSchemaValueMismatch'
	readonly message: string
	/** JSON-path-like location within the validated value. */
	readonly path: string
	readonly schemaPath?: string
	readonly keyword?: string
	readonly actual?: unknown
}

export type JsonSchemaValueValidationResult =
	| { readonly ok: true; readonly value: JsonValue }
	| {
		readonly ok: false
		readonly issues: readonly (SupportedJsonSchemaIssue | JsonSchemaValueIssue)[]
	}

export const SCHEMA_COMPATIBILITY_VALUES = ['compatible', 'incompatible', 'indeterminate'] as const
export type SchemaCompatibility = typeof SCHEMA_COMPATIBILITY_VALUES[number]

export interface SchemaCompatibilityIssue {
	readonly code:
		| 'InvalidActualSchema'
		| 'InvalidExpectedSchema'
		| 'SchemaConstraintMismatch'
		| 'SchemaCompatibilityIndeterminate'
	readonly message: string
	readonly path: string
	readonly expected?: unknown
	readonly actual?: unknown
}

export interface SchemaComparisonResult {
	readonly compatibility: SchemaCompatibility
	readonly issues: readonly SchemaCompatibilityIssue[]
}

const keywordSet = new Set<string>(SUPPORTED_JSON_SCHEMA_KEYWORD_VALUES)
const typeSet = new Set<string>(SUPPORTED_JSON_SCHEMA_TYPE_VALUES)
const annotationKeys = new Set([
	'$schema', '$defs', '$comment', 'title', 'description', 'default', 'deprecated',
	'readOnly', 'writeOnly', 'examples', 'format', 'contentEncoding', 'contentMediaType', 'contentSchema'
])
const advancedKeys = new Set([
	'pattern', 'contains', 'minContains', 'maxContains', 'patternProperties', 'propertyNames',
	'dependentRequired', 'dependentSchemas', 'unevaluatedItems', 'unevaluatedProperties',
	'not', 'if', 'then', 'else', 'oneOf'
])

const ajv = new Ajv2020({
	allErrors: true,
	strict: true,
	// These restrictions are useful authoring hints, but reject valid Draft
	// 2020-12 schemas whose constraints intentionally omit `type` or whose
	// tuple length is governed by another applicator.
	strictSchema: false,
	strictTypes: false,
	strictTuples: false,
	strictRequired: false,
	allowMatchingProperties: true,
	allowUnionTypes: true,
	validateFormats: false,
	messages: true
})
/** Maximum compiled validators retained by each JSON Schema cache. */
export const JSON_SCHEMA_VALIDATOR_CACHE_CAPACITY = 256 as const

const validatorCache = new BoundedLruMap<string, ValidateFunction<unknown>>(JSON_SCHEMA_VALIDATOR_CACHE_CAPACITY)
const contextualValidatorCache = new BoundedLruMap<string, ValidateFunction<unknown>>(JSON_SCHEMA_VALIDATOR_CACHE_CAPACITY)

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pathKey(path: string, key: string): string {
	return /^[A-Za-z_$][\w$]*$/u.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`
}

function pointerPath(pointer: string, base: string): string {
	if (!pointer) return base
	return pointer.split('/').slice(1).reduce((path, raw) => pathKey(path, raw.replace(/~1/gu, '/').replace(/~0/gu, '~')), base)
}

function jsonIssue(value: unknown, path: string, active = new Set<object>()): JsonSchemaValueIssue | undefined {
	if (value === null || typeof value === 'string' || typeof value === 'boolean') return undefined
	if (typeof value === 'number') {
		return Number.isFinite(value)
			? undefined
			: { code: 'InvalidJsonValue', message: 'JSON numbers must be finite.', path, actual: value }
	}
	if (typeof value !== 'object') {
		return { code: 'InvalidJsonValue', message: 'Value is not representable in JSON.', path, actual: value }
	}
	if (active.has(value)) {
		return { code: 'InvalidJsonValue', message: 'JSON values cannot contain cycles.', path, actual: value }
	}
	if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
		return { code: 'InvalidJsonValue', message: 'JSON objects must be plain records.', path, actual: value }
	}
	active.add(value)
	const entries = Array.isArray(value)
		? value.map((item, index) => [String(index), item] as const)
		: Object.entries(value)
	for (const [key, item] of entries) {
		const issue = jsonIssue(item, Array.isArray(value) ? `${path}[${key}]` : pathKey(path, key), active)
		if (issue) return issue
	}
	active.delete(value)
	return undefined
}

function canonicalize(value: JsonValue, parentKey?: string): JsonValue {
	if (Array.isArray(value)) {
		const items = value.map(item => canonicalize(item))
		if (parentKey === 'oneOf') {
			// `oneOf` is order-insensitive, but not multiplicity-insensitive: two
			// identical matching branches cause validation to fail.
			return [...items].sort((left, right) => compareCodeUnits(JSON.stringify(left), JSON.stringify(right)))
		}
		if (parentKey === 'type' || parentKey === 'required' || parentKey === 'enum' || parentKey === 'allOf' || parentKey === 'anyOf') {
			const unique = new Map(items.map(item => [JSON.stringify(item), item]))
			return [...unique.entries()].sort(([left], [right]) => compareCodeUnits(left, right)).map(([, item]) => item)
		}
		return items
	}
	if (!isRecord(value)) return Object.is(value, -0) ? 0 : value
	const result: Record<string, JsonValue> = {}
	for (const key of Object.keys(value).sort()) {
		const item = value[key] as JsonValue
		if (key === 'dependentRequired' && isRecord(item)) {
			const dependencies: Record<string, JsonValue> = {}
			for (const dependency of Object.keys(item).sort()) dependencies[dependency] = canonicalize(item[dependency] as JsonValue, 'required')
			result[key] = dependencies
		} else {
			result[key] = canonicalize(item, key)
		}
	}
	return result
}

/** Deterministically orders object keys and set-like arrays without mutating the input. */
export function canonicalizeSupportedJsonSchema(schema: SupportedJsonSchema): SupportedJsonSchema {
	return canonicalize(schema as JsonValue) as SupportedJsonSchema
}

export function canonicalJsonSchemaString(schema: SupportedJsonSchema): string {
	return JSON.stringify(canonicalizeSupportedJsonSchema(schema))
}

function localReferenceTarget(root: unknown, reference: string): unknown {
	if (reference === '#') return root
	if (!/^#(?:\/(?:[^~]|~[01])*)+$/u.test(reference)) return undefined
	let current = root
	for (const raw of reference.slice(2).split('/')) {
		const key = raw.replace(/~1/gu, '/').replace(/~0/gu, '~')
		if (!isRecord(current) && !Array.isArray(current)) return undefined
		if (!Object.prototype.hasOwnProperty.call(current, key)) return undefined
		current = (current as Record<string, unknown>)[key]
	}
	return current
}

function walkSchema(
	node: unknown,
	root: unknown,
	path: string,
	issues: SupportedJsonSchemaIssue[],
	seen: Set<object>
): void {
	if (typeof node === 'boolean') return
	if (!isRecord(node)) {
		issues.push({ code: 'InvalidJsonSchema', message: 'A schema must be a boolean or object.', path, actual: node })
		return
	}
	if (seen.has(node)) return
	seen.add(node)
	for (const key of Object.keys(node).sort()) {
		if (!keywordSet.has(key)) {
			issues.push({
				code: 'UnsupportedJsonSchemaKeyword',
				message: `JSON Schema keyword ${key} is not supported.`,
				path: pathKey(path, key), keyword: key, actual: node[key]
			})
		}
	}
	if ('$schema' in node && (path !== '$' || node.$schema !== JSON_SCHEMA_DIALECT_URI)) {
		issues.push({
			code: 'InvalidJsonSchema',
			message: path === '$'
				? `Only ${JSON_SCHEMA_DIALECT_URI} is supported.`
				: '$schema is only permitted at the root schema.',
			path: pathKey(path, '$schema'), keyword: '$schema', actual: node.$schema
		})
	}
	if ('$ref' in node) {
		if (typeof node.$ref !== 'string' || !(node.$ref === '#' || node.$ref.startsWith('#/'))) {
			issues.push({
				code: 'UnsupportedJsonSchemaReference', message: 'Only local JSON Pointer references are supported.',
				path: pathKey(path, '$ref'), keyword: '$ref', actual: node.$ref
			})
		} else if (localReferenceTarget(root, node.$ref) === undefined) {
			issues.push({
				code: 'UnresolvedJsonSchemaReference', message: `Local reference ${node.$ref} cannot be resolved.`,
				path: pathKey(path, '$ref'), keyword: '$ref', actual: node.$ref
			})
		}
	}
	if (typeof node.pattern === 'string') {
		try { new RegExp(node.pattern, 'u') } catch {
			issues.push({ code: 'InvalidJsonSchema', message: 'pattern must be a valid regular expression.', path: pathKey(path, 'pattern'), keyword: 'pattern', actual: node.pattern })
		}
	}
	if (isRecord(node.patternProperties)) {
		for (const pattern of Object.keys(node.patternProperties)) {
			try { new RegExp(pattern, 'u') } catch {
				issues.push({ code: 'InvalidJsonSchema', message: 'patternProperties keys must be valid regular expressions.', path: pathKey(pathKey(path, 'patternProperties'), pattern), keyword: 'patternProperties', actual: pattern })
			}
		}
	}
	const directChildren = ['items', 'contains', 'unevaluatedItems', 'additionalProperties', 'propertyNames', 'unevaluatedProperties', 'not', 'if', 'then', 'else', 'contentSchema'] as const
	for (const key of directChildren) if (node[key] !== undefined) walkSchema(node[key], root, pathKey(path, key), issues, seen)
	const arrayChildren = ['prefixItems', 'allOf', 'anyOf', 'oneOf'] as const
	for (const key of arrayChildren) {
		if (!Array.isArray(node[key])) continue
		node[key].forEach((child, index) => walkSchema(child, root, `${pathKey(path, key)}[${index}]`, issues, seen))
	}
	const mapChildren = ['$defs', 'properties', 'patternProperties', 'dependentSchemas'] as const
	for (const key of mapChildren) {
		if (!isRecord(node[key])) continue
		for (const [name, child] of Object.entries(node[key])) walkSchema(child, root, pathKey(pathKey(path, key), name), issues, seen)
	}
}

function ajvIssue(error: ErrorObject, basePath: string): SupportedJsonSchemaIssue {
	return {
		code: 'InvalidJsonSchema',
		message: error.message ? `Invalid JSON Schema: ${error.message}.` : 'Invalid JSON Schema.',
		path: pointerPath(error.instancePath, basePath),
		keyword: error.keyword,
		actual: error.params
	}
}

/** Validate an authored schema against the closed dialect and return every discovered issue. */
export function validateSupportedJsonSchema(schema: unknown, path = '$'): SupportedJsonSchemaValidationResult {
	const jsonValueIssue = jsonIssue(schema, path)
	if (jsonValueIssue) {
		return { ok: false, issues: [{ code: 'InvalidJsonSchema', message: jsonValueIssue.message, path: jsonValueIssue.path, actual: jsonValueIssue.actual }] }
	}
	const issues: SupportedJsonSchemaIssue[] = []
	walkSchema(schema, schema, path, issues, new Set())
	if (issues.length === 0) {
		try {
			if (!ajv.validateSchema(schema as object | boolean)) {
				issues.push(...(ajv.errors ?? []).map(error => ajvIssue(error, path)))
			} else {
				ajv.compile(schema as object | boolean)
			}
		} catch (error) {
			issues.push({ code: 'InvalidJsonSchema', message: error instanceof Error ? error.message : String(error), path })
		}
	}
	if (issues.length > 0) return { ok: false, issues }
	const typed = schema as SupportedJsonSchema
	const canonicalSchema = canonicalizeSupportedJsonSchema(typed)
	return { ok: true, schema: typed, canonicalSchema, canonicalJson: JSON.stringify(canonicalSchema) }
}

function compiledValidator(schema: SupportedJsonSchema): ValidateFunction<unknown> {
	const key = canonicalJsonSchemaString(schema)
	const cached = validatorCache.get(key)
	if (cached) return cached
	const validator = ajv.compile(schema as object | boolean)
	validatorCache.set(key, validator)
	return validator
}

const schemaChildKeys = [
	'items', 'contains', 'unevaluatedItems', 'additionalProperties', 'propertyNames',
	'unevaluatedProperties', 'not', 'if', 'then', 'else', 'contentSchema'
] as const
const schemaArrayChildKeys = ['prefixItems', 'allOf', 'anyOf', 'oneOf'] as const
const schemaMapChildKeys = ['$defs', 'properties', 'patternProperties', 'dependentSchemas'] as const

function escapePointerSegment(value: string): string {
	return value.replace(/~/gu, '~0').replace(/\//gu, '~1')
}

/** Find a subschema by identity without accidentally descending into JSON-valued annotations. */
function schemaPointer(root: SupportedJsonSchema, target: SupportedJsonSchema): string | undefined {
	const seen = new Set<object>()
	function visit(node: SupportedJsonSchema, pointer: string): string | undefined {
		if (node === target) return pointer
		if (typeof node === 'boolean' || seen.has(node)) return undefined
		seen.add(node)
		for (const key of schemaChildKeys) {
			const child = node[key]
			if (child === undefined) continue
			const found = visit(child, `${pointer}/${escapePointerSegment(key)}`)
			if (found !== undefined) return found
		}
		for (const key of schemaArrayChildKeys) {
			const children = node[key]
			if (!children) continue
			for (let index = 0; index < children.length; index += 1) {
				const found = visit(children[index]!, `${pointer}/${escapePointerSegment(key)}/${index}`)
				if (found !== undefined) return found
			}
		}
		for (const key of schemaMapChildKeys) {
			const children = node[key]
			if (!children) continue
			for (const [name, child] of Object.entries(children)) {
				const found = visit(child, `${pointer}/${escapePointerSegment(key)}/${escapePointerSegment(name)}`)
				if (found !== undefined) return found
			}
		}
		return undefined
	}
	return visit(root, '#')
}

function contextualValidator(
	root: SupportedJsonSchema,
	schema: SupportedJsonSchema
): ValidateFunction<unknown> {
	if (root === schema) return compiledValidator(root)
	const pointer = schemaPointer(root, schema)
	if (pointer === undefined) return compiledValidator(schema)
	const rootJson = canonicalJsonSchemaString(root)
	const cacheKey = `${rootJson}\n${pointer}`
	const cached = contextualValidatorCache.get(cacheKey)
	if (cached) return cached

	const digest = createHash('sha256').update(rootJson, 'utf8').digest('hex')
	const resourceId = `urn:synthesize-regions:schema:${digest}`
	if (!ajv.getSchema(resourceId)) ajv.addSchema(schemaWithResourceId(root, resourceId))
	const validator = ajv.compile({ $ref: `${resourceId}${pointer}` })
	contextualValidatorCache.set(cacheKey, validator)
	return validator
}

function validatesInContext(
	value: JsonValue,
	schema: SupportedJsonSchema,
	root: SupportedJsonSchema
): boolean {
	return contextualValidator(root, schema)(value) as boolean
}

/** Validate a JSON value with cached Ajv 2020 compilation; formats and content remain annotations. */
export function validateJsonValueAgainstSchema(value: unknown, schema: unknown, path = '$'): JsonSchemaValueValidationResult {
	const schemaResult = validateSupportedJsonSchema(schema)
	if (!schemaResult.ok) return schemaResult
	const invalidJson = jsonIssue(value, path)
	if (invalidJson) return { ok: false, issues: [invalidJson] }
	const validator = compiledValidator(schemaResult.canonicalSchema)
	if (validator(value)) return { ok: true, value: value as JsonValue }
	return {
		ok: false,
		issues: (validator.errors ?? []).map(error => ({
			code: 'JsonSchemaValueMismatch' as const,
			message: error.message ?? 'Value does not satisfy the JSON Schema.',
			path: pointerPath(error.instancePath, path),
			schemaPath: error.schemaPath,
			keyword: error.keyword,
			actual: error.data
		}))
	}
}

/**
 * Add a generated JSON Schema resource boundary before embedding an authored
 * schema in a larger planner document. Authored `$id` remains unsupported.
 */
export function schemaWithResourceId(schema: SupportedJsonSchema, id: string): Record<string, unknown> {
	if (schema === true) return { $id: id }
	if (schema === false) return { $id: id, not: {} }
	return { ...(canonicalizeSupportedJsonSchema(schema) as SupportedJsonSchemaObject), $id: id }
}

function schemaObject(schema: SupportedJsonSchema): SupportedJsonSchemaObject | undefined {
	return typeof schema === 'boolean' ? undefined : schema
}

function typesOf(schema: SupportedJsonSchemaObject): readonly SupportedJsonSchemaType[] | undefined {
	if (typeof schema.type === 'string') return [schema.type]
	return schema.type

}

function typeSubset(actual: SupportedJsonSchemaType, expected: SupportedJsonSchemaType): boolean {
	return actual === expected || (actual === 'integer' && expected === 'number')
}

function result(compatibility: SchemaCompatibility, message?: string, path = '$', actual?: unknown, expected?: unknown): SchemaComparisonResult {
	return {
		compatibility,
		issues: message
			? [{
				code: compatibility === 'indeterminate' ? 'SchemaCompatibilityIndeterminate' : 'SchemaConstraintMismatch',
				message, path,
				...(actual === undefined ? {} : { actual }),
				...(expected === undefined ? {} : { expected })
			}]
			: []
	}
}

function mergeResults(results: readonly SchemaComparisonResult[]): SchemaComparisonResult {
	const incompatible = results.find(item => item.compatibility === 'incompatible')
	if (incompatible) return incompatible
	const uncertain = results.find(item => item.compatibility === 'indeterminate')
	return uncertain ?? result('compatible')
}

function finiteValues(schema: SupportedJsonSchema, root: SupportedJsonSchema): readonly JsonValue[] | undefined {
	if (schema === false) return []
	if (schema === true) return undefined
	if (Object.prototype.hasOwnProperty.call(schema, 'const')) {
		return validatesInContext(schema.const as JsonValue, schema, root) ? [schema.const as JsonValue] : []
	}
	if (schema.enum) return schema.enum.filter(value => validatesInContext(value, schema, root))
	return undefined
}

function resolveSimpleReference(schema: SupportedJsonSchema, root: SupportedJsonSchema): SupportedJsonSchema | undefined {
	if (typeof schema === 'boolean' || !schema.$ref) return schema
	const validationSiblings = Object.keys(schema).filter(key => key !== '$ref' && !annotationKeys.has(key))
	if (validationSiblings.length > 0) return undefined
	return localReferenceTarget(root, schema.$ref) as SupportedJsonSchema | undefined
}

function containsLocalReference(schema: SupportedJsonSchema, seen = new Set<object>()): boolean {
	if (typeof schema === 'boolean' || seen.has(schema)) return false
	seen.add(schema)
	if (schema.$ref !== undefined) return true
	for (const key of schemaChildKeys) {
		const child = schema[key]
		if (child !== undefined && containsLocalReference(child, seen)) return true
	}
	for (const key of schemaArrayChildKeys) {
		if (schema[key]?.some(child => containsLocalReference(child, seen))) return true
	}
	for (const key of schemaMapChildKeys) {
		if (Object.values(schema[key] ?? {}).some(child => containsLocalReference(child, seen))) return true
	}
	return false
}

function hasUnmatchedAdvanced(actual: SupportedJsonSchemaObject, expected: SupportedJsonSchemaObject): boolean {
	return [...advancedKeys].some(key => key in actual && JSON.stringify(actual[key as keyof SupportedJsonSchemaObject]) !== JSON.stringify(expected[key as keyof SupportedJsonSchemaObject]))
}

/** Return the validation siblings of one composition applicator. */
function withoutComposition(
	schema: SupportedJsonSchemaObject,
	keyword: 'allOf' | 'anyOf'
): SupportedJsonSchemaObject {
	const siblings = { ...schema }
	delete siblings[keyword]
	return siblings
}

function compareLower(actual: SupportedJsonSchemaObject, expected: SupportedJsonSchemaObject): boolean {
	const expectedBound = expected.exclusiveMinimum === undefined
		? expected.minimum === undefined ? undefined : { value: expected.minimum, exclusive: false }
		: expected.minimum === undefined || expected.exclusiveMinimum >= expected.minimum
			? { value: expected.exclusiveMinimum, exclusive: true }
			: { value: expected.minimum, exclusive: false }
	if (!expectedBound) return true
	const actualBound = actual.exclusiveMinimum === undefined
		? actual.minimum === undefined ? undefined : { value: actual.minimum, exclusive: false }
		: actual.minimum === undefined || actual.exclusiveMinimum >= actual.minimum
			? { value: actual.exclusiveMinimum, exclusive: true }
			: { value: actual.minimum, exclusive: false }
	return !!actualBound && (actualBound.value > expectedBound.value || (actualBound.value === expectedBound.value && (!expectedBound.exclusive || actualBound.exclusive)))
}

function compareUpper(actual: SupportedJsonSchemaObject, expected: SupportedJsonSchemaObject): boolean {
	const expectedBound = expected.exclusiveMaximum === undefined
		? expected.maximum === undefined ? undefined : { value: expected.maximum, exclusive: false }
		: expected.maximum === undefined || expected.exclusiveMaximum <= expected.maximum
			? { value: expected.exclusiveMaximum, exclusive: true }
			: { value: expected.maximum, exclusive: false }
	if (!expectedBound) return true
	const actualBound = actual.exclusiveMaximum === undefined
		? actual.maximum === undefined ? undefined : { value: actual.maximum, exclusive: false }
		: actual.maximum === undefined || actual.exclusiveMaximum <= actual.maximum
			? { value: actual.exclusiveMaximum, exclusive: true }
			: { value: actual.maximum, exclusive: false }
	return !!actualBound && (actualBound.value < expectedBound.value || (actualBound.value === expectedBound.value && (!expectedBound.exclusive || actualBound.exclusive)))
}

function minCompatible(actual: number | undefined, expected: number | undefined): boolean {
	return expected === undefined || (actual !== undefined && actual >= expected)
}

function maxCompatible(actual: number | undefined, expected: number | undefined): boolean {
	return expected === undefined || (actual !== undefined && actual <= expected)
}

function compareObjectSchemas(actual: SupportedJsonSchemaObject, expected: SupportedJsonSchemaObject, context: CompareContext): SchemaComparisonResult {
	if (!minCompatible(actual.minProperties, expected.minProperties) || !maxCompatible(actual.maxProperties, expected.maxProperties)) {
		return result('incompatible', 'Object size bounds are wider than the expected schema.')
	}
	const actualRequired = new Set(actual.required ?? [])
	for (const key of expected.required ?? []) {
		if (!actualRequired.has(key)) return result('incompatible', `Required property ${key} is not guaranteed.`, pathKey('$.properties', key))
	}
	const expectedProperties = expected.properties ?? {}
	const actualProperties = actual.properties ?? {}
	for (const [key, expectedProperty] of Object.entries(expectedProperties)) {
		let actualProperty = actualProperties[key]
		if (actualProperty === undefined) {
			if (actual.additionalProperties === false) continue
			actualProperty = actual.additionalProperties ?? true
		}
		const compared = compareSchemas(actualProperty, expectedProperty, context)
		if (compared.compatibility !== 'compatible') return compared
	}
	if (expected.additionalProperties === false) {
		if (actual.additionalProperties !== false) return result('incompatible', 'The producer permits additional object properties.')
		for (const [key, property] of Object.entries(actualProperties)) {
			if (!(key in expectedProperties) && property !== false) return result('incompatible', `Property ${key} is not permitted by the expected schema.`)
		}
	} else if (expected.additionalProperties !== undefined && expected.additionalProperties !== true) {
		for (const [key, property] of Object.entries(actualProperties)) {
			if (key in expectedProperties || property === false) continue
			const compared = compareSchemas(property, expected.additionalProperties, context)
			if (compared.compatibility !== 'compatible') return compared
		}
		if (actual.additionalProperties !== false) {
			const compared = compareSchemas(actual.additionalProperties ?? true, expected.additionalProperties, context)
			if (compared.compatibility !== 'compatible') return compared
		}
	}
	return result('compatible')
}

function effectiveArrayMaximum(schema: SupportedJsonSchemaObject): number {
	const tupleMaximum = schema.items === false ? (schema.prefixItems?.length ?? 0) : Number.POSITIVE_INFINITY
	return Math.min(schema.maxItems ?? Number.POSITIVE_INFINITY, tupleMaximum)
}

function arrayItemAt(schema: SupportedJsonSchemaObject, index: number): SupportedJsonSchema {
	return schema.prefixItems?.[index] ?? schema.items ?? true
}

function compareArraySchemas(actual: SupportedJsonSchemaObject, expected: SupportedJsonSchemaObject, context: CompareContext): SchemaComparisonResult {
	if (!minCompatible(actual.minItems, expected.minItems) || !maxCompatible(effectiveArrayMaximum(actual), expected.maxItems)) {
		return result('incompatible', 'Array size bounds are wider than the expected schema.')
	}
	if (expected.uniqueItems === true && actual.uniqueItems !== true) return result('incompatible', 'Array uniqueness is not guaranteed.')
	const actualMaximum = effectiveArrayMaximum(actual)
	const expectedPrefixLength = expected.prefixItems?.length ?? 0
	for (let index = 0; index < expectedPrefixLength && index < actualMaximum; index += 1) {
		const compared = compareSchemas(arrayItemAt(actual, index), expected.prefixItems![index]!, context)
		if (compared.compatibility !== 'compatible') return compared
	}
	const expectedRest = expected.items ?? true
	const actualPrefixLength = actual.prefixItems?.length ?? 0
	for (let index = expectedPrefixLength; index < actualPrefixLength && index < actualMaximum; index += 1) {
		const compared = compareSchemas(actual.prefixItems![index]!, expectedRest, context)
		if (compared.compatibility !== 'compatible') return compared
	}
	if (actual.items !== false && actualMaximum > Math.max(actualPrefixLength, expectedPrefixLength)) {
		const compared = compareSchemas(actual.items ?? true, expectedRest, context)
		if (compared.compatibility !== 'compatible') return compared
	}
	return result('compatible')
}

interface CompareContext {
	readonly actualRoot: SupportedJsonSchema
	readonly expectedRoot: SupportedJsonSchema
	readonly depth: number
}

function compareSchemas(actualInput: SupportedJsonSchema, expectedInput: SupportedJsonSchema, context: CompareContext): SchemaComparisonResult {
	if (context.depth > 64) return result('indeterminate', 'Schema comparison exceeded the recursive reference limit.')
	if (actualInput === false || expectedInput === true) return result('compatible')
	if (expectedInput === false) return result('incompatible', 'The expected schema accepts no values.')
	if (actualInput === true) return result('incompatible', 'The producer schema accepts values outside the expected schema.')

	const actualResolved = resolveSimpleReference(actualInput, context.actualRoot)
	const expectedResolved = resolveSimpleReference(expectedInput, context.expectedRoot)
	if (!actualResolved || !expectedResolved) return result('indeterminate', 'References with validation siblings cannot be compared conservatively.')
	if (actualResolved !== actualInput || expectedResolved !== expectedInput) {
		return compareSchemas(actualResolved, expectedResolved, { ...context, depth: context.depth + 1 })
	}

	const schemasEqual = canonicalJsonSchemaString(actualInput) === canonicalJsonSchemaString(expectedInput)
	const rootsEqual = canonicalJsonSchemaString(context.actualRoot) === canonicalJsonSchemaString(context.expectedRoot)
	if (schemasEqual && (rootsEqual || (!containsLocalReference(actualInput) && !containsLocalReference(expectedInput)))) {
		return result('compatible')
	}

	const finite = finiteValues(actualInput, context.actualRoot)
	if (finite) {
		for (const value of finite) {
			if (!validatesInContext(value, expectedInput, context.expectedRoot)) return result('incompatible', 'A finite producer value is rejected by the expected schema.', '$', value, expectedInput)
		}
		return result('compatible')
	}

	const actual = schemaObject(actualInput)!
	const expected = schemaObject(expectedInput)!
	const nextContext = { ...context, depth: context.depth + 1 }

	// Unlike ordinary validation keywords, unevaluated* depends on which
	// locations sibling applicators mark as evaluated. Equal unevaluated
	// declarations are therefore not enough to compare otherwise different
	// schemas soundly. Canonical equality and finite producers were handled
	// above; every other interaction stays deliberately indeterminate.
	if (
		'unevaluatedItems' in actual || 'unevaluatedItems' in expected
		|| 'unevaluatedProperties' in actual || 'unevaluatedProperties' in expected
	) {
		return result(
			'indeterminate',
			'Compatibility involving unevaluated constraints cannot be proven conservatively.'
		)
	}

	if (actual.anyOf || actual.oneOf) {
		const options = actual.anyOf ?? actual.oneOf!
		const comparisons = options.map(option => compareSchemas(option, expectedInput, nextContext))
		return comparisons.every(item => item.compatibility === 'compatible')
			? result('compatible')
			: result('indeterminate', 'A producer union cannot be proven to be a subset.')
	}
	if (expected.allOf) {
		// Applicators do not replace their siblings in Draft 2020-12. Proving
		// inclusion in every allOf branch is insufficient unless the producer is
		// also a subset of the remaining consumer constraints.
		return mergeResults([
			compareSchemas(actualInput, withoutComposition(expected, 'allOf'), nextContext),
			...expected.allOf.map(option => compareSchemas(actualInput, option, nextContext))
		])
	}
	if (expected.anyOf) {
		const siblingComparison = compareSchemas(
			actualInput,
			withoutComposition(expected, 'anyOf'),
			nextContext
		)
		if (siblingComparison.compatibility !== 'compatible') return siblingComparison
		const comparisons = expected.anyOf.map(option => compareSchemas(actualInput, option, nextContext))
		return comparisons.find(item => item.compatibility === 'compatible') ?? result('indeterminate', 'The expected union may cover the producer only across multiple branches.')
	}
	if (actual.allOf) {
		const comparisons = actual.allOf.map(option => compareSchemas(option, expectedInput, nextContext))
		return comparisons.find(item => item.compatibility === 'compatible') ?? result('indeterminate', 'An intersection cannot be compared from its members independently.')
	}

	for (const key of advancedKeys) {
		if (key in expected && JSON.stringify(expected[key as keyof SupportedJsonSchemaObject]) !== JSON.stringify(actual[key as keyof SupportedJsonSchemaObject])) {
			return result('indeterminate', `Compatibility for ${key} cannot be proven conservatively.`, pathKey('$', key))
		}
	}
	const actualHasNarrowingAdvanced = hasUnmatchedAdvanced(actual, expected)

	const expectedTypes = typesOf(expected)
	const actualTypes = typesOf(actual)
	if (expectedTypes) {
		if (!actualTypes || !actualTypes.every(actualType => expectedTypes.some(expectedType => typeSubset(actualType, expectedType)))) {
			return actualHasNarrowingAdvanced
				? result('indeterminate', 'Advanced producer constraints may narrow an apparent type mismatch.')
				: result('incompatible', 'Producer schema types are not a subset of expected schema types.', '$.type', actual.type, expected.type)
		}
	}
	if (expected.const !== undefined || expected.enum !== undefined) return result('indeterminate', 'A non-finite producer cannot be proven to satisfy const or enum.')

	const possibleTypes = actualTypes ?? SUPPORTED_JSON_SCHEMA_TYPE_VALUES
	for (const type of possibleTypes) {
		if ((type === 'number' || type === 'integer') && (!compareLower(actual, expected) || !compareUpper(actual, expected))) {
			return result(actualHasNarrowingAdvanced ? 'indeterminate' : 'incompatible', 'Numeric bounds are wider than the expected schema.')
		}
		if ((type === 'number' || type === 'integer') && expected.multipleOf !== undefined) {
			const ratio = actual.multipleOf === undefined ? Number.NaN : actual.multipleOf / expected.multipleOf
			if (!Number.isInteger(ratio)) return result(actualHasNarrowingAdvanced ? 'indeterminate' : 'incompatible', 'multipleOf is not a subset of the expected constraint.')
		}
		if (type === 'string' && (!minCompatible(actual.minLength, expected.minLength) || !maxCompatible(actual.maxLength, expected.maxLength))) {
			return result(actualHasNarrowingAdvanced ? 'indeterminate' : 'incompatible', 'String length bounds are wider than the expected schema.')
		}
		if (type === 'array') {
			const compared = compareArraySchemas(actual, expected, nextContext)
			if (compared.compatibility !== 'compatible') return actualHasNarrowingAdvanced && compared.compatibility === 'incompatible'
				? result('indeterminate', 'Advanced producer constraints may narrow an array mismatch.') : compared
		}
		if (type === 'object') {
			const compared = compareObjectSchemas(actual, expected, nextContext)
			if (compared.compatibility !== 'compatible') return actualHasNarrowingAdvanced && compared.compatibility === 'incompatible'
				? result('indeterminate', 'Advanced producer constraints may narrow an object mismatch.') : compared
		}
	}
	return result('compatible')
}

/** Compare producer (`actual`) values to a consumer (`expected`) contract. */
export function compareJsonSchemas(actualSchema: unknown, expectedSchema: unknown): SchemaComparisonResult {
	const actual = validateSupportedJsonSchema(actualSchema, '$.actual')
	if (!actual.ok) {
		return {
			compatibility: 'indeterminate',
			issues: actual.issues.map(issue => ({ code: 'InvalidActualSchema', message: issue.message, path: issue.path, actual: issue.actual }))
		}
	}
	const expected = validateSupportedJsonSchema(expectedSchema, '$.expected')
	if (!expected.ok) {
		return {
			compatibility: 'indeterminate',
			issues: expected.issues.map(issue => ({ code: 'InvalidExpectedSchema', message: issue.message, path: issue.path, actual: issue.actual }))
		}
	}
	return compareSchemas(actual.canonicalSchema, expected.canonicalSchema, {
		actualRoot: actual.canonicalSchema,
		expectedRoot: expected.canonicalSchema,
		depth: 0
	})
}
