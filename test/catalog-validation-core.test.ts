import { describe, expect, it } from 'vitest'
import {
	TemplateCatalogValidationError,
	assertTemplateCatalogValid,
	defineTemplate,
	fragmentCollectionPort,
	fragmentPort,
	literalPort,
	portRegionKind,
	rawCodePort,
	unionPort,
	validateTemplateCatalog,
	type GraphTemplateDefinition,
	type InputPort,
	type RegionKind,
	type SupportedJsonSchema
} from '../src/index.js'

function template(
	modelId: string,
	inputs: Record<string, InputPort> = {},
	outputKind: RegionKind = 'expression'
): GraphTemplateDefinition<Record<string, InputPort>, string> {
	const marker = (inputName: string, port: InputPort): string => {
		const kind = portRegionKind(port)
		const fallback = kind === 'statement' ? 'void 0;'
			: kind === 'expressionSuffix' ? '.value'
				: kind === 'identifier' ? 'placeholder'
					: kind === 'string' ? '""'
						: kind === 'number' ? '0'
							: kind === 'boolean' ? 'false'
								: kind === 'null' ? 'null'
									: 'undefined'
		return `/** @TYPE ${kind} id=${inputName} **/${fallback}/** @END **/`
	}
	const markedInputs = Object.entries(inputs).map(([inputName, port]) => ({
		kind: portRegionKind(port),
		code: marker(inputName, port)
	}))
	const source = outputKind === 'statement'
		? markedInputs.map(input => input.kind === 'statement'
			? input.code
			: input.kind === 'expressionSuffix'
				? `undefined${input.code};`
				: `void (${input.code});`).join('\n') || 'void 0;'
		: markedInputs.length === 0 ? 'undefined' : `(${markedInputs.map(input => input.code).join(', ')})`
	return defineTemplate({
		modelId,
		inputs,
		output: { kind: outputKind },
		source
	})
}

function diagnosticCodes(templates: readonly GraphTemplateDefinition<any, string>[]): string[] {
	return validateTemplateCatalog(templates).map(diagnostic => diagnostic.code)
}

describe('catalog validation core', () => {
	it('allows forward, self, and explicitly empty fragment source allowlists', () => {
		const consumer = template('Consumer', {
			forward: fragmentPort({
				regionKind: 'expression',
				accepts: { sourceModelIds: ['Source'] }
			}),
			empty: fragmentPort({
				regionKind: 'expression',
				accepts: { sourceModelIds: [] }
			})
		})
		const self = template('Self', {
			value: fragmentPort({
				regionKind: 'expression',
				accepts: { sourceModelIds: ['Self'] }
			})
		})
		const source = template('Source')

		expect(validateTemplateCatalog([consumer, self, source])).toEqual([])
		expect(() => assertTemplateCatalogValid([consumer, self, source])).not.toThrow()
	})

	it('reports duplicate IDs without guessing the output contract of an ambiguous source', () => {
		const expressionSource = template('Duplicate')
		const statementSource = template('Duplicate', {}, 'statement')
		const consumer = template('Consumer', {
			value: fragmentPort({
				regionKind: 'expression',
				accepts: { sourceModelIds: ['Duplicate'] }
			})
		})

		const diagnostics = validateTemplateCatalog([expressionSource, statementSource, consumer])
		expect(diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([{
			code: 'DuplicateTemplateId',
			path: 'templates[1].modelId'
		}])
	})

	it('recursively rejects empty and mixed-region union ports', () => {
		const nestedEmpty = unionPort({ options: [] }) as InputPort
		const mixed = unionPort({
			options: [
				literalPort({ regionKind: 'expression' }),
				unionPort({
					options: [
						rawCodePort({ regionKind: 'statement' }),
						nestedEmpty
					]
				})
			]
		}) as InputPort

		const diagnostics = validateTemplateCatalog([template('Choice', { choice: mixed })])
		expect(diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([
			{
				code: 'MixedUnionRegionKinds',
				path: 'templates[0].inputs.choice.options'
			},
			{
				code: 'EmptyUnionPort',
				path: 'templates[0].inputs.choice.options[1].options[1].options'
			}
		])
	})

	it('aggregates invalid collection bounds and raw-code policies', () => {
		const invalid = template('InvalidPolicies', {
			negativeMinimum: fragmentCollectionPort({
				regionKind: 'statement',
				accepts: { outputKind: 'statement' },
				minItems: -1
			}),
			fractionalMaximum: fragmentCollectionPort({
				regionKind: 'statement',
				accepts: { outputKind: 'statement' },
				maxItems: 1.5
			}),
			reversedBounds: fragmentCollectionPort({
				regionKind: 'statement',
				accepts: { outputKind: 'statement' },
				minItems: 3,
				maxItems: 2
			}),
			raw: rawCodePort({
				regionKind: 'expression',
				policy: {
					maxLength: -1,
					forbiddenPatterns: ['[', '(valid)']
				}
			})
		}, 'statement')

		expect(diagnosticCodes([invalid])).toEqual([
			'InvalidCollectionMaximum',
			'InvalidCollectionMinimum',
			'InvalidRawCodePattern',
			'InvalidRawCodeMaxLength',
			'InvalidCollectionBounds'
		])
	})

	it('rejects unknown and output-kind-incompatible allowlisted sources', () => {
		const expressionSource = template('ExpressionSource')
		const consumer = template('Consumer', {
			statements: fragmentCollectionPort({
				regionKind: 'statement',
				accepts: {
					outputKind: 'statement',
					sourceModelIds: ['Missing', 'ExpressionSource']
				}
			})
		}, 'statement')

		const diagnostics = validateTemplateCatalog([consumer, expressionSource])
		expect(diagnostics.map(({ code, actual }) => ({ code, actual }))).toEqual([
			{ code: 'UnknownSourceModelId', actual: 'Missing' },
			{ code: 'IncompatibleSourceOutputKind', actual: 'expression' }
		])
	})

	it('recursively validates TypeScript descriptors with deterministic catalog paths', () => {
		const invalid = defineTemplate({
			modelId: 'InvalidTypes',
			inputs: {
				choice: unionPort({
					options: [fragmentPort({
						regionKind: 'expression',
						accepts: { type: { ts: 'any' } }
					})]
				}),
				raw: rawCodePort({
					regionKind: 'expression',
					type: { ts: 'ProjectLocalType' }
				})
			},
			output: { kind: 'expression', type: { ts: 'Array<' } },
			source: `${"/** @TYPE expression id=choice **/undefined/** @END **/"} ?? ${"/** @TYPE expression id=raw **/undefined/** @END **/"}`
		})

		const diagnostics = validateTemplateCatalog([invalid])
		expect(diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([
			{
				code: 'ForbiddenAnyType',
				path: 'templates[0].inputs.choice.options[0].accepts.type.ts'
			},
			{
				code: 'UnresolvedTypeScriptType',
				path: 'templates[0].inputs.raw.type.ts'
			},
			{
				code: 'InvalidTypeScriptType',
				path: 'templates[0].output.type.ts'
			}
		])
		expect(diagnostics[1]).toMatchObject({
			compilerCode: 2304,
			compilerCategory: 'error'
		})
	})

	it('requires allowlisted producer TypeScript types to be assignable', () => {
		const stringSource = defineTemplate({
			modelId: 'StringSource',
			inputs: {},
			output: { kind: 'expression', type: { ts: 'string' } },
			source: '"value"'
		})
		const missingType = template('MissingType')
		const consumer = defineTemplate({
			modelId: 'Consumer',
			inputs: {
				value: fragmentPort({
					regionKind: 'expression',
					accepts: {
						type: { ts: 'number' },
						sourceModelIds: ['StringSource', 'MissingType']
					}
				})
			},
			output: { kind: 'expression' },
			source: "/** @TYPE expression id=value **/undefined/** @END **/"
		})

		const diagnostics = validateTemplateCatalog([consumer, missingType, stringSource])
		expect(diagnostics.map(({ code, actual }) => ({ code, actual }))).toEqual([
			{ code: 'IncompatibleSourceType', actual: 'string' },
			{ code: 'IncompatibleSourceType', actual: undefined }
		])
	})

	it('suppresses dependent source checks when consumer or producer metadata is invalid', () => {
		const invalidSource = defineTemplate({
			modelId: 'InvalidSource',
			inputs: {},
			output: { kind: 'expression', type: { ts: 'any' } },
			source: 'undefined'
		})
		const validSource = defineTemplate({
			modelId: 'ValidSource',
			inputs: {},
			output: { kind: 'expression', type: { ts: 'string' } },
			source: '"value"'
		})
		const consumer = defineTemplate({
			modelId: 'Consumer',
			inputs: {
				invalidProducer: fragmentPort({
					regionKind: 'expression',
					accepts: { type: { ts: 'string' }, sourceModelIds: ['InvalidSource'] }
				}),
				invalidConsumer: fragmentPort({
					regionKind: 'expression',
					accepts: { type: { ts: 'ProjectLocal' }, sourceModelIds: ['ValidSource'] }
				})
			},
			output: { kind: 'expression' },
			source: `${"/** @TYPE expression id=invalidProducer **/undefined/** @END **/"} ?? ${"/** @TYPE expression id=invalidConsumer **/undefined/** @END **/"}`
		})

		expect(validateTemplateCatalog([consumer, invalidSource, validSource])
			.map(({ code, path }) => ({ code, path }))).toEqual([
				{
					code: 'UnresolvedTypeScriptType',
					path: 'templates[0].inputs.invalidConsumer.accepts.type.ts'
				},
				{
					code: 'ForbiddenAnyType',
					path: 'templates[1].output.type.ts'
				}
			])
	})

	it('recursively validates schemas and rejects conflicting output schema aliases', () => {
		const invalid = defineTemplate({
			modelId: 'InvalidSchemas',
			inputs: {
				literal: literalPort({
					regionKind: 'expression',
					schema: { unsupportedKeyword: true } as unknown as SupportedJsonSchema
				}),
				invalidPattern: literalPort({
					regionKind: 'expression',
					schema: { type: 'string', pattern: '[' }
				}),
				choice: unionPort({
					options: [rawCodePort({
						regionKind: 'expression',
						type: { schema: { $ref: '#/$defs/missing' } }
					})]
				})
			},
			output: {
				kind: 'expression',
				type: { schema: { type: 'string' } },
				schema: { type: 'number' }
			},
			source: `${"/** @TYPE expression id=literal **/undefined/** @END **/"} ?? ${"/** @TYPE expression id=invalidPattern **/undefined/** @END **/"} ?? ${"/** @TYPE expression id=choice **/undefined/** @END **/"}`
		})

		const diagnostics = validateTemplateCatalog([invalid])
		expect(diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([
			{
				code: 'UnresolvedLocalSchemaReference',
				path: 'templates[0].inputs.choice.options[0].type.schema.$ref'
			},
			{
				code: 'InvalidJsonSchema',
				path: 'templates[0].inputs.invalidPattern.schema.pattern'
			},
			{
				code: 'UnsupportedSchemaKeyword',
				path: 'templates[0].inputs.literal.schema.unsupportedKeyword'
			},
			{
				code: 'ConflictingSchemaMetadata',
				path: 'templates[0].output.schema'
			}
		])
	})

	it('checks allowlisted producer schemas and distinguishes indeterminate inclusion', () => {
		const numberSource = defineTemplate({
			modelId: 'NumberSource',
			inputs: {},
			output: { kind: 'expression', type: { schema: { type: 'number' } } },
			source: '1'
		})
		const patternedSource = defineTemplate({
			modelId: 'PatternedSource',
			inputs: {},
			output: {
				kind: 'expression',
				type: { schema: { type: 'string', pattern: '^a' } },
				schema: { type: 'string', pattern: '^a' }
			},
			source: '"alpha"'
		})
		const legacyAliasSource = defineTemplate({
			modelId: 'LegacyAliasSource',
			inputs: {},
			output: { kind: 'expression', schema: { type: 'string' } },
			source: '"legacy"'
		})
		const consumer = defineTemplate({
			modelId: 'Consumer',
			inputs: {
				wrong: fragmentPort({
					regionKind: 'expression',
					accepts: {
						type: { schema: { type: 'string' } },
						sourceModelIds: ['NumberSource']
					}
				}),
				uncertain: fragmentPort({
					regionKind: 'expression',
					accepts: {
						type: { schema: { type: 'string', pattern: '^.' } },
						sourceModelIds: ['PatternedSource']
					}
				}),
				legacy: fragmentPort({
					regionKind: 'expression',
					accepts: {
						type: { schema: { type: 'string' } },
						sourceModelIds: ['LegacyAliasSource']
					}
				})
			},
			output: { kind: 'expression' },
			source: `${"/** @TYPE expression id=wrong **/undefined/** @END **/"} ?? ${"/** @TYPE expression id=uncertain **/undefined/** @END **/"} ?? ${"/** @TYPE expression id=legacy **/undefined/** @END **/"}`
		})

		const diagnostics = validateTemplateCatalog([consumer, legacyAliasSource, numberSource, patternedSource])
		expect(diagnostics.map(({ code, path }) => ({ code, path }))).toEqual([
			{
				code: 'SchemaCompatibilityIndeterminate',
				path: 'templates[0].inputs.uncertain.accepts.sourceModelIds[0]'
			},
			{
				code: 'IncompatibleSourceSchema',
				path: 'templates[0].inputs.wrong.accepts.sourceModelIds[0]'
			}
		])
	})

	it('throws one aggregate package error containing deterministic diagnostics', () => {
		const invalid = template('Invalid', {
			choice: unionPort({ options: [] }) as InputPort
		})

		try {
			assertTemplateCatalogValid([invalid])
			throw new Error('Expected catalog validation to fail.')
		} catch (error) {
			expect(error).toBeInstanceOf(TemplateCatalogValidationError)
			const validationError = error as TemplateCatalogValidationError
			expect(validationError.diagnostics).toHaveLength(1)
			expect(validationError.diagnostics[0]?.code).toBe('EmptyUnionPort')
			expect(Object.isFrozen(validationError.diagnostics)).toBe(true)
		}
	})
})
