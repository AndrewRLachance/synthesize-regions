import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import {
	applyGraphPatch,
	checkContract,
	classifySynthesisDiagnosticCode,
	compileGraph,
	createTemplateRegistry,
	defineTemplate,
	fragmentPort,
	graphTemplateDefinitionToJsonSchema,
	GraphTemplateManifestSchema,
	SynthesisGraphSchema,
	templateRegistryToPartialSynthesisGraphJsonSchema,
	templateRegistryToSynthesisGraphJsonSchema,
	TemplateSummarySchema,
	type SynthesisGraph
} from '../src/index.js'

const GenericMap = defineTemplate({
	modelId: 'GenericTypeTestMap',
	version: '1.0.0',
	typeParameters: {
		T: { description: 'Input element.', constraint: { ts: 'unknown' } },
		U: { description: 'Output element.', constraint: { ts: 'unknown' } }
	},
	inputs: {
		array: fragmentPort({
			regionKind: 'expression',
			accepts: {
				outputKind: 'expression',
				type: { ts: 'readonly {{T}}[]', schema: { type: 'array' } }
			}
		}),
		callback: fragmentPort({
			regionKind: 'expression',
			accepts: {
				outputKind: 'expression',
				type: { ts: '(value: {{T}}, index: number, array: readonly {{T}}[]) => {{U}}' }
			}
		})
	},
	output: { kind: 'expression', type: { ts: '{{U}}[]', schema: { type: 'array' } } },
	source: `(${"/** @TYPE expression id=array **/[]/** @END **/"}).map(${"/** @TYPE expression id=callback **/undefined/** @END **/"})`
})

const Users = defineTemplate({
	modelId: 'GenericTypeTestUsers', inputs: {},
	output: { kind: 'expression', type: { ts: 'readonly { id: string }[]', schema: { type: 'array' } } },
	source: 'users'
})

const ToName = defineTemplate({
	modelId: 'GenericTypeTestToName', inputs: {},
	output: {
		kind: 'expression',
		type: { ts: '(value: { id: string }, index: number, array: readonly { id: string }[]) => string' }
	},
	source: 'toName'
})

const WrongCallback = defineTemplate({
	modelId: 'GenericTypeTestWrongCallback', inputs: {},
	output: { kind: 'expression', type: { ts: '(value: number) => string' } },
	source: 'wrongCallback'
})

const StringArrayConsumer = defineTemplate({
	modelId: 'GenericTypeTestStringArrayConsumer',
	inputs: {
		value: fragmentPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression', type: { ts: 'readonly string[]', schema: { type: 'array' } } }
		})
	},
	output: { kind: 'expression', type: { ts: 'number', schema: { type: 'number' } } },
	source: `(${"/** @TYPE expression id=value **/[]/** @END **/"}).length`
})

const StringConstrainedValue = defineTemplate({
	modelId: 'GenericTypeTestStringConstrainedValue',
	typeParameters: { T: { constraint: { ts: 'string' } } },
	inputs: {},
	output: { kind: 'expression', type: { ts: '{{T}}' } },
	source: '"value"'
})

const templates = [GenericMap, Users, ToName, WrongCallback, StringArrayConsumer, StringConstrainedValue] as const
const registry = createTemplateRegistry(templates)
const userType = { ts: '{ id: string }' }
const stringType = { ts: 'string', schema: { type: 'string' } } as const

function genericGraph(callback = 'callback'): SynthesisGraph {
	return {
		nodes: [
			{ id: 'users', templateId: Users.modelId, inputs: {} },
			{ id: callback, templateId: callback === 'callback' ? ToName.modelId : WrongCallback.modelId, inputs: {} },
			{
				id: 'mapped', templateId: GenericMap.modelId,
				typeArguments: { T: userType, U: stringType },
				inputs: {
					array: { kind: 'ref', nodeId: 'users' },
					callback: { kind: 'ref', nodeId: callback }
				}
			},
			{ id: 'consumer', templateId: StringArrayConsumer.modelId, inputs: { value: { kind: 'ref', nodeId: 'mapped' } } }
		],
		finalNodeId: 'consumer'
	}
}

describe('generic template type contracts', () => {
	it('summarizes declared parameters and changes manifest identity', () => {
		expect(GenericMap.summary().typeParameters).toEqual(GenericMap.typeParameters)
		expect(GenericMap.manifestDigest).toMatch(/^t4_[a-f0-9]{64}$/u)
		expect(registry.contractDigest).toMatch(/^c7_[a-f0-9]{64}$/u)
		expect(registry.manifestDigest).toMatch(/^m4_[a-f0-9]{64}$/u)
	})

	it('round-trips generic declarations and bindings through closed contracts', () => {
		const manifest = {
			modelId: GenericMap.modelId,
			version: GenericMap.version,
			typeParameters: GenericMap.typeParameters,
			inputs: GenericMap.inputs,
			output: GenericMap.output,
			source: GenericMap.source
		}
		expect(checkContract(GraphTemplateManifestSchema, manifest)).toBe(true)
		expect(checkContract(TemplateSummarySchema, GenericMap.summary())).toBe(true)
		expect(checkContract(SynthesisGraphSchema, genericGraph())).toBe(true)
	})

	it('instantiates correlated inputs and propagates the concrete output type', () => {
		const result = compileGraph(genericGraph(), registry)
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (!result.ok) return
		expect(result.finalArtifact.code).toBe('((users).map(toName)).length')
		expect(result.artifacts.mapped?.type).toEqual({ ts: '(string)[]', schema: { type: 'array' } })
		expect(result.artifacts.mapped?.provenance?.typeArguments).toEqual({ T: userType, U: stringType })
	})

	it('rejects missing, extra, invalid, and incompatible explicit arguments', () => {
		const missing = genericGraph()
		delete missing.nodes[2]?.typeArguments?.U
		expect(compileGraph(missing, registry).diagnostics).toContainEqual(expect.objectContaining({
			code: 'MissingTypeArgument', typeParameterName: 'U'
		}))

		const extra = genericGraph()
		extra.nodes[2]!.typeArguments!.Extra = { ts: 'string' }
		expect(compileGraph(extra, registry).diagnostics).toContainEqual(expect.objectContaining({
			code: 'UnknownTypeArgument', typeParameterName: 'Extra'
		}))

		const invalid = genericGraph()
		invalid.nodes[2]!.typeArguments!.T = { ts: 'any' }
		expect(compileGraph(invalid, registry).diagnostics).toContainEqual(expect.objectContaining({
			code: 'InvalidTypeArgument', typeParameterName: 'T'
		}))
		expect(classifySynthesisDiagnosticCode('InvalidTypeArgument')).toBe('graphRepairable')

		const unresolved = genericGraph()
		unresolved.nodes[2]!.typeArguments!.T = { ts: 'GenericTypeTestMissingType' }
		expect(compileGraph(unresolved, registry).diagnostics).toContainEqual(expect.objectContaining({
			code: 'InvalidTypeArgument', typeParameterName: 'T'
		}))
		expect(classifySynthesisDiagnosticCode('InvalidTypeScriptType')).toBe('terminalFailure')
		expect(classifySynthesisDiagnosticCode('UnresolvedTypeScriptType')).toBe('terminalFailure')
		expect(classifySynthesisDiagnosticCode('ForbiddenAnyType')).toBe('terminalFailure')
		expect(classifySynthesisDiagnosticCode('InvalidTypeParameterName')).toBe('templatePolicyFailure')
		expect(classifySynthesisDiagnosticCode('GenericTypeParameterConstraint')).toBe('templatePolicyFailure')
		expect(classifySynthesisDiagnosticCode('UndeclaredTypeParameter')).toBe('templatePolicyFailure')
		expect(classifySynthesisDiagnosticCode('UnusedTypeParameter')).toBe('templatePolicyFailure')

		expect(compileGraph(genericGraph('wrong'), registry).diagnostics).toContainEqual(
			expect.objectContaining({ code: 'IncompatibleFragmentType', inputName: 'callback' })
		)
	})

	it('leaves constraint assignability to authoritative graph compilation', () => {
		const graph: SynthesisGraph = {
			nodes: [{
				id: 'constrained',
				templateId: StringConstrainedValue.modelId,
				typeArguments: { T: { ts: 'number' } },
				inputs: {}
			}],
			finalNodeId: 'constrained'
		}
		const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
			templateRegistryToSynthesisGraphJsonSchema(registry)
		)
		expect(validate(graph), JSON.stringify(validate.errors, null, 2)).toBe(true)
		expect(compileGraph(graph, registry)).toMatchObject({
			ok: false,
			classification: 'graphRepairable',
			diagnostics: [{
				code: 'IncompatibleTypeArgument',
				typeParameterName: 'T',
				nodeId: 'constrained'
			}]
		})
	})

	it('derives exact generic bindings in standalone, strict, partial, and recursive planner schemas', () => {
		const ajv = new Ajv2020({ allErrors: true, strict: true })
		const standalone = ajv.compile(graphTemplateDefinitionToJsonSchema(GenericMap))
		const strict = ajv.compile(templateRegistryToSynthesisGraphJsonSchema(registry))
		const partial = ajv.compile(templateRegistryToPartialSynthesisGraphJsonSchema(registry))
		const mapped = genericGraph().nodes[2]!

		expect(standalone(mapped), JSON.stringify(standalone.errors, null, 2)).toBe(true)
		expect(standalone({ ...mapped, typeArguments: undefined })).toBe(false)
		expect(standalone({ ...mapped, typeArguments: { T: userType } })).toBe(false)
		expect(standalone({
			...mapped,
			typeArguments: { ...mapped.typeArguments, Extra: { ts: 'number' } }
		})).toBe(false)

		expect(strict(genericGraph()), JSON.stringify(strict.errors, null, 2)).toBe(true)
		const missingInputs = genericGraph()
		missingInputs.nodes[2]!.inputs = {}
		expect(strict(missingInputs)).toBe(false)
		expect(partial(missingInputs), JSON.stringify(partial.errors, null, 2)).toBe(true)
		delete missingInputs.nodes[2]!.typeArguments
		expect(partial(missingInputs)).toBe(false)

		const nongenericArguments = genericGraph()
		nongenericArguments.nodes[0]!.typeArguments = { T: userType }
		expect(partial(nongenericArguments)).toBe(false)

		const recursive = genericGraph()
		recursive.nodes[3]!.inputs.value = {
			kind: 'inline',
			node: { ...recursive.nodes[2]!, id: 'inline-mapped' }
		}
		recursive.nodes.splice(2, 1)
		expect(strict(recursive), JSON.stringify(strict.errors, null, 2)).toBe(true)
		const inlineValue = recursive.nodes[2]!.inputs.value
		if (!inlineValue || !('kind' in inlineValue) || inlineValue.kind !== 'inline') {
			throw new Error('Expected recursive inline test node.')
		}
		delete inlineValue.node.typeArguments
		expect(strict(recursive)).toBe(false)
	})

	it('instantiates unresolved partial ports', () => {
		const graph = genericGraph()
		delete graph.nodes[2]!.inputs.callback
		const result = compileGraph(graph, registry, { mode: 'partial' })
		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		if (!result.ok || result.finalArtifact.complete) return
		const callback = result.finalArtifact.unresolvedInputs.find(input => input.inputName === 'callback')
		expect(callback?.port).toMatchObject({
			kind: 'fragment',
			accepts: { type: { ts: '(value: ({ id: string }), index: number, array: readonly ({ id: string })[]) => (string)' } }
		})
	})

	it('supports immutable type-argument patch actions', () => {
		const graph = genericGraph()
		const removed = applyGraphPatch(graph, { kind: 'removeTypeArgument', nodeId: 'mapped', parameterName: 'U' })
		expect(removed.ok).toBe(true)
		if (!removed.ok) return
		const restored = applyGraphPatch(removed.graph, {
			kind: 'setTypeArgument', nodeId: 'mapped', parameterName: 'U', typeArgument: stringType
		})
		expect(restored.ok).toBe(true)
		expect(graph.nodes[2]?.typeArguments?.U).toEqual(stringType)

		const missing = applyGraphPatch(graph, {
			kind: 'removeTypeArgument', nodeId: 'mapped', parameterName: 'Missing'
		})
		expect(missing).toMatchObject({
			ok: false,
			diagnostics: [{ code: 'GraphPatchTypeArgumentNotFound', typeParameterName: 'Missing' }]
		})
	})

	it('rejects undeclared and unused manifest parameters', () => {
		expect(() => defineTemplate({
			modelId: 'GenericTypeTestUndeclared', inputs: {},
			output: { kind: 'expression', type: { ts: '{{T}}' } }, source: 'undefined'
		})).toThrow(/UndeclaredTypeParameter/u)

		expect(() => defineTemplate({
			modelId: 'GenericTypeTestUnused', typeParameters: { T: { constraint: { ts: 'unknown' } } },
			inputs: {}, output: { kind: 'expression', type: { ts: 'string' } }, source: '"value"'
		})).toThrow(/UnusedTypeParameter/u)
	})
})
