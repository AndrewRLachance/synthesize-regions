import { describe, expect, it } from 'vitest'
import {
	TemplateCatalogValidationError,
	assertTemplateCatalogValid,
	defineTemplate,
	fragmentCollectionPort,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort,
	validateTemplateCatalog,
	type GraphTemplateDefinition,
	type InputPort,
	type RegionKind
} from '../src/index.js'

function template(
	modelId: string,
	inputs: Record<string, InputPort> = {},
	outputKind: RegionKind = 'expression'
): GraphTemplateDefinition<Record<string, InputPort>, string> {
	return defineTemplate({
		modelId,
		inputs,
		output: { kind: outputKind },
		template: () => outputKind === 'statement' ? 'void 0;' : 'undefined'
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
		})

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
