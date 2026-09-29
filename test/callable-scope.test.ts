import { describe, expect, it } from 'vitest'

import {
	GraphTemplateManifestSchema,
	TemplateSummarySchema,
	checkContract,
	defineTemplate,
	fragmentCollectionPort,
	fragmentPort,
	literalPort,
	rawCodePort,
	templateCatalogDigest,
	templateCatalogManifestDigest,
	type InputPort
} from '../src/index.js'

const marker = (kind: string, inputName: string, fallback: string) =>
	`/** @TYPE ${kind} id=${inputName} **/${fallback}/** @END **/`

const parametersPort = () => fragmentCollectionPort({
	regionKind: 'parameter',
	accepts: { outputKind: 'parameter' },
	minItems: 1,
	separator: ', '
})

const rawBodyPort = () => rawCodePort({ regionKind: 'expression' })

const callableSource =
	`(${marker('parameter', 'args', 'value: unknown')}) => (${marker('expression', 'implementation', 'undefined')})`

function callableWithBody(body: InputPort) {
	return {
		modelId: 'CallableWithCustomNames',
		inputs: {
			args: parametersPort(),
			implementation: body
		},
		callableScope: {
			parametersInput: 'args' as const,
			bodyInput: 'implementation' as const
		},
		output: { kind: 'expression' as const },
		source: callableSource
	}
}

describe('callable template metadata', () => {
	it('accepts nonstandard input names, freezes them, and discloses them in summaries', () => {
		const authoredScope = {
			parametersInput: 'args' as const,
			bodyInput: 'implementation' as const
		}
		const template = defineTemplate({
			...callableWithBody(rawBodyPort()),
			callableScope: authoredScope
		})

		;(authoredScope as { parametersInput: string }).parametersInput = 'changed'

		expect(template.callableScope).toEqual({
			parametersInput: 'args',
			bodyInput: 'implementation'
		})
		expect(template.callableScope).not.toBe(authoredScope)
		expect(Object.isFrozen(template.callableScope)).toBe(true)
		expect(template.summary().callableScope).toEqual(template.callableScope)
		expect(Object.isFrozen(template.summary().callableScope)).toBe(true)
		expect(checkContract(TemplateSummarySchema, template.summary())).toBe(true)
	})

	it('keeps the closed schema strict while leaving port semantics to catalog validation', () => {
		const manifest = callableWithBody(rawBodyPort())
		expect(checkContract(GraphTemplateManifestSchema, manifest)).toBe(true)
		expect(checkContract(GraphTemplateManifestSchema, {
			...manifest,
			callableScope: { ...manifest.callableScope, inferred: true }
		})).toBe(false)
		expect(checkContract(GraphTemplateManifestSchema, {
			...manifest,
			callableScope: { parametersInput: '', bodyInput: 'implementation' }
		})).toBe(false)

		const missingInput = {
			...manifest,
			callableScope: { parametersInput: 'missing', bodyInput: 'implementation' }
		}
		expect(checkContract(GraphTemplateManifestSchema, missingInput)).toBe(true)
		expect(() => defineTemplate(missingInput as never)).toThrow(/InvalidCallableScope.*parametersInput/u)
	})

	it('accepts structured statement bodies and constructor-parameter families', () => {
		const template = defineTemplate({
			modelId: 'StructuredConstructorCallable',
			inputs: {
				args: fragmentCollectionPort({
					regionKind: 'constructorParameter',
					accepts: { outputKind: 'constructorParameter' },
					separator: ', '
				}),
				implementation: fragmentCollectionPort({
					regionKind: 'statement',
					accepts: { outputKind: 'statement' },
					separator: '\n'
				})
			},
			callableScope: {
				parametersInput: 'args',
				bodyInput: 'implementation'
			},
			output: { kind: 'classMember' },
			source: `constructor(${marker('constructorParameter', 'args', 'value: unknown')}) {\n${marker('statement', 'implementation', 'void 0;')}\n}`
		})

		expect(template.callableScope?.bodyInput).toBe('implementation')
	})

	it.each([
		[
			'identical keys',
			callableWithBody(rawBodyPort()),
			{ parametersInput: 'args', bodyInput: 'args' }
		],
		[
			'literal parameters',
			{
				...callableWithBody(rawBodyPort()),
				inputs: {
					args: literalPort({ regionKind: 'expression' }),
					implementation: rawBodyPort()
				}
			},
			{ parametersInput: 'args', bodyInput: 'implementation' }
		],
		[
			'optional body',
			callableWithBody(rawCodePort({ regionKind: 'expression', required: false })),
			{ parametersInput: 'args', bodyInput: 'implementation' }
		],
		[
			'literal body',
			callableWithBody(literalPort({ regionKind: 'expression' })),
			{ parametersInput: 'args', bodyInput: 'implementation' }
		],
		[
			'mixed structured/raw body union',
			callableWithBody({
				kind: 'union',
				options: [
					fragmentPort({
						regionKind: 'expression',
						accepts: { outputKind: 'expression' }
					}),
					rawBodyPort()
				]
			}),
			{ parametersInput: 'args', bodyInput: 'implementation' }
		]
	] as const)('rejects %s ownership metadata', (_name, manifest, callableScope) => {
		expect(() => defineTemplate({
			...manifest,
			callableScope
		} as never)).toThrow(/InvalidCallableScope/u)
	})

	it('binds callable ownership into planner and executable identities', () => {
		const { callableScope: _omitted, ...withoutScopeDefinition } = callableWithBody(rawBodyPort())
		const withoutScope = defineTemplate(withoutScopeDefinition)
		const withScope = defineTemplate(callableWithBody(rawBodyPort()))

		expect(withScope.manifestDigest).not.toBe(withoutScope.manifestDigest)
		expect(templateCatalogDigest([withScope])).not.toBe(templateCatalogDigest([withoutScope]))
		expect(templateCatalogManifestDigest([withScope]))
			.not.toBe(templateCatalogManifestDigest([withoutScope]))
	})
})
