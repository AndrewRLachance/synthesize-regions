import type { GenerateOptions } from '../core/types.js'
import { generateWithReplacements } from '../generation/generate.js'
import { bindPrevalidatedRegions } from '../generation/prevalidatedRegions.js'
import { buildReplacementEdits } from '../replacements/serialize.js'
import { discoverReplacementRegions } from '../regions/discovery.js'
import { portRegionKind, summarizeInputPort, summarizeOutputPort } from './compatibility.js'
import { templateManifestDigest } from './catalogDigest.js'
import { InvalidCallableScopeError, validateCallableScope } from './callableScope.js'
import { instantiateTemplateContracts, validateTemplateTypeParameters } from './genericTypes.js'
import { defaultFragmentCollectionSeparator, templateModeForRegionKind } from './rendering.js'
import {
	applySourceMappedTextEdits,
	coverGeneratedSourceMapRoot,
	emptyGeneratedSourceMap,
	formatSourceMappedFragment,
	inputGeneratedSourceSpan,
	mergeGeneratedSourceMaps,
	nodeGeneratedSourceMap,
	remapGeneratedSourceMap,
	shiftGeneratedSourceMap,
	sourceMappedFragment,
	sourceMappedFragmentCollection,
	type GeneratedSourceIdentity,
	type SourceMappedTextEdit
} from './sourceSpans.js'

import { graphInputsToReplacementMap } from './converter.js'
import type {
	GeneratedFragment,
	GeneratedSourceMap,
	GraphTemplateManifest,
	GraphTemplateDefinition,
	GraphTemplateInvocation,
	GraphTemplatePartialInvocation,
	InputPort,
	OutputPort,
	PartialTemplateArtifact,
	RegionKind,
	ResolvedGraphInput,
	StrictInputPortMap,
	StrictOutputPort,
	TemplateArtifact,
	TemplateTypeParameterDefinition,
	TypeDescriptor,
	UnresolvedTemplateInput
} from './graphTypes.js'
import { createHash } from 'node:crypto'
import type { ReplacementRegion } from '../core/types.js'
import { BoundedLruMap } from './deterministic.js'

interface GraphTemplateMarkerContract {
    readonly regionKind: RegionKind
    readonly arity: 'one'
    readonly occurrences: number
}

const templateMarkerContracts = new WeakMap<object, Readonly<Record<string, GraphTemplateMarkerContract>>>()
const templateReplacementRegions = new WeakMap<object, readonly ReplacementRegion[]>()
const TEMPLATE_DISCOVERY_CACHE_CAPACITY = 256
const templateDiscoveryCache = new BoundedLruMap<string, readonly ReplacementRegion[]>(TEMPLATE_DISCOVERY_CACHE_CAPACITY)
const manifestPropertyNames = new Set(['modelId', 'version', 'description', 'typeParameters', 'callableScope', 'inputs', 'output', 'source'])

/** Internal authenticity check used by registries to reject forged executable definitions. */
export function isLibraryOwnedTemplateDefinition(value: unknown): value is GraphTemplateDefinition<any, string, any> {
	return typeof value === 'object' && value !== null && templateMarkerContracts.has(value)
}

/** Declarative input shape accepted by the graph-template API. */
export type GraphTemplateDefinitionInput<
    M extends string,
    I extends Record<string, InputPort>,
    O extends OutputPort = OutputPort,
	P extends Record<string, TemplateTypeParameterDefinition> | undefined = undefined
> = GraphTemplateManifest<
    StrictInputPortMap<I>,
    M,
    StrictOutputPort<O>,
	P
>

/** Render a replacement marker opening comment with the scoped artifact ID. */
function markerComment(kind: RegionKind, arity: 'one' | 'many', id: string): string {
    const markerKind = arity === 'many' ? `${kind}[]` : kind
    return `/** @TYPE ${markerKind} id=${id} **/`
}

/** Clone and recursively freeze declarative manifest data. */
function freezeManifestValue<T>(value: T, path: string, ancestors = new Set<object>()): T {
    if (value === null || value === undefined) return value
    if (typeof value !== 'object') {
        if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
            throw new TypeError(`${path} must contain declarative JSON-like values.`)
        }
        return value
    }
    if (ancestors.has(value)) throw new TypeError(`${path} must not contain cyclic values.`)

    const nextAncestors = new Set(ancestors)
    nextAncestors.add(value)
    if (Array.isArray(value)) {
        return Object.freeze(value.map((item, index) => freezeManifestValue(item, `${path}[${index}]`, nextAncestors))) as T
    }

    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`${path} must contain only plain objects and arrays.`)
    }
    const clone = Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, freezeManifestValue(child, `${path}.${key}`, nextAncestors)])
    )
    return Object.freeze(clone) as T
}

/** Validate source markers against declared ports and capture their frozen contracts. */
function markerContractsFor<I extends Record<string, InputPort>>(
    modelId: string,
    source: string,
    inputs: I,
	output: OutputPort,
	regions: readonly ReplacementRegion[]
): Readonly<Record<Extract<keyof I, string>, GraphTemplateMarkerContract>> {
	const occurrences = new Map<string, number>()

    for (const region of regions) {
        const port = inputs[region.id]
        if (!port) {
            throw new TypeError(`Template ${modelId} source contains marker ${region.id} with no declared input port.`)
        }
        const expectedKind = portRegionKind(port)
        if (region.effectiveType !== expectedKind) {
            throw new TypeError(
                `Template ${modelId} marker ${region.id} has kind ${region.effectiveType}; its input port requires ${expectedKind}.`
            )
        }
        if (region.arity !== 'one') {
            throw new TypeError(
                `Template ${modelId} marker ${region.id} must have scalar arity; graph collection ports serialize their collection into one region.`
            )
        }
        occurrences.set(region.id, (occurrences.get(region.id) ?? 0) + 1)
    }

    const contracts: Record<string, GraphTemplateMarkerContract> = {}
    for (const inputName of Object.keys(inputs).sort()) {
        const count = occurrences.get(inputName) ?? 0
        if (count !== 1) {
            throw new TypeError(
                `Template ${modelId} input ${inputName} must have exactly one marker in source; found ${count}.`
            )
        }
        contracts[inputName] = Object.freeze({
            regionKind: portRegionKind(inputs[inputName]!),
            arity: 'one',
            occurrences: count
        })
    }
    return Object.freeze(contracts) as Readonly<Record<Extract<keyof I, string>, GraphTemplateMarkerContract>>
}

/** Return immutable, content-addressed discovery data for one authored template. */
function replacementRegionsForTemplate(source: string, output: OutputPort): readonly ReplacementRegion[] {
	const mode = templateModeForRegionKind(output.kind)
	const sourceHash = createHash('sha256').update(source).digest('hex')
	const key = `template-discovery-v1:default-es2022-strict:${mode.kind}:${sourceHash}`
	const cached = templateDiscoveryCache.get(key)
	if (cached !== undefined) return cached
	const discovered = Object.freeze(
		discoverReplacementRegions(source, { templateMode: mode }).map(region => Object.freeze({ ...region }))
	)
	templateDiscoveryCache.set(key, discovered)
	return discovered
}

/** Build the fragment source metadata shared by strict and partial outputs. */
function fragmentSource<M extends string>(
    modelId: M,
    version: string | undefined,
	manifestDigest: string
): GeneratedFragment['source'] {
    return {
        templateId: modelId,
		...(version ? { templateVersion: version } : {}),
		templateManifestDigest: manifestDigest
    }
}

/** Resolve the deprecated output schema alias into the canonical descriptor. */
function effectiveOutputType(output: OutputPort): TypeDescriptor | undefined {
	if (output.schema === undefined) return output.type
	if (output.type?.schema !== undefined) return output.type
	return { ...(output.type ?? {}), schema: output.schema }
}

/** Build lineage metadata from resolved graph inputs. */
function fragmentProvenance(
    invocation: GraphTemplateInvocation | GraphTemplatePartialInvocation
): NonNullable<GeneratedFragment['provenance']> {
    const inputRefs = Object.values(invocation.inputs)
        .flatMap(input => input.kind === 'fragment'
            ? [input.fragment.id]
            : input.kind === 'fragmentCollection' ? input.fragments.map(fragment => fragment.id) : [])
        .filter((id): id is string => typeof id === 'string')

    const literalInputs: Record<string, unknown> = {}
    for (const [key, input] of Object.entries(invocation.inputs)) {
        if (input.kind === 'literal') {
            literalInputs[key] = input.value
        }
    }

    return {
        ...(invocation.nodeId ? { nodeId: invocation.nodeId } : {}),
        ...(inputRefs.length > 0 ? { inputRefs } : {}),
        ...(Object.keys(literalInputs).length > 0 ? { literalInputs } : {}),
		...(invocation.typeArguments && Object.keys(invocation.typeArguments).length > 0
			? { typeArguments: invocation.typeArguments }
			: {})
    }
}

/** Collect unresolved inputs carried by partial child artifacts. */
function partialChildInputs(inputs: Record<string, ResolvedGraphInput>): UnresolvedTemplateInput[] {
    const unresolved = new Map<string, UnresolvedTemplateInput>()

    for (const input of Object.values(inputs)) {
        const fragments = input.kind === 'fragment' ? [input.fragment]
            : input.kind === 'fragmentCollection' ? input.fragments : []
        for (const fragment of fragments) {
            if (fragment.complete !== false) continue
            for (const unresolvedInput of fragment.unresolvedInputs) {
                unresolved.set(unresolvedInput.id, unresolvedInput)
            }
        }
    }

    return [...unresolved.values()]
}

/** Preserve marker-bearing partial fragments instead of reducing them through structured AST values. */
function partialArtifactReplacementCode(input: ResolvedGraphInput): string | undefined {
    if (input.kind === 'fragment' && input.fragment.complete === false) return input.fragment.code
    if (input.kind === 'fragmentCollection' && input.fragments.some(fragment => fragment.complete === false)) {
        return input.fragments.map(fragment => fragment.code).join(
            input.port.separator ?? defaultFragmentCollectionSeparator(input.port.regionKind)
        )
    }
    return undefined
}

/** Map nested fragment ownership into the serialized text used by one input. */
function nestedInputSourceMap(
	input: ResolvedGraphInput | undefined,
	renderedCode: string
): GeneratedSourceMap | undefined {
	if (input?.kind === 'fragment') {
		return sourceMappedFragment(input.fragment, renderedCode).sourceMap
	}
	if (input?.kind === 'fragmentCollection') {
		const joined = sourceMappedFragmentCollection(
			input.fragments,
			input.port.separator ?? defaultFragmentCollectionSeparator(input.port.regionKind)
		)
		return remapGeneratedSourceMap(joined.code, renderedCode, joined.sourceMap)
	}
	return undefined
}

/** Build the ownership map carried by one rendered template input. */
function renderedInputSourceMap(
	code: string,
	identity: GeneratedSourceIdentity & { inputName: string },
	input?: ResolvedGraphInput
): GeneratedSourceMap {
	const inputMap: GeneratedSourceMap = {
		...emptyGeneratedSourceMap(),
		spans: [inputGeneratedSourceSpan(0, code.length, identity, 1)]
	}
	const nested = nestedInputSourceMap(input, code)
	return mergeGeneratedSourceMaps(
		inputMap,
		nested ? shiftGeneratedSourceMap(nested, 0, 2) : undefined
	)
}

/** Attach node/input ownership to a set of already validated replacement edits. */
function sourceMappedTemplateEdits(
	edits: readonly { start: number; end: number; text: string; region: { id: string } }[],
	invocation: GraphTemplateInvocation | GraphTemplatePartialInvocation,
	modelId: string
): SourceMappedTextEdit[] {
	return edits.map(edit => {
		const unresolved = 'unresolvedInputs' in invocation ? invocation.unresolvedInputs[edit.region.id] : undefined
		const identity = unresolved
			? {
				...(unresolved.nodeId ? { nodeId: unresolved.nodeId } : {}),
				templateId: unresolved.templateId,
				inputName: unresolved.inputName
			}
			: {
				...(invocation.nodeId ? { nodeId: invocation.nodeId } : {}),
				templateId: modelId,
				inputName: edit.region.id
			}
		return {
			start: edit.start,
			end: edit.end,
			text: edit.text,
			sourceMap: renderedInputSourceMap(edit.text, identity, invocation.inputs[edit.region.id])
		}
	})
}

/**
 * Define a typed template that can validate ergonomic input values, synthesize
 * marker replacements, and brand the generated output with its model ID.
 */
export function defineTemplate<
	const M extends string,
	const I extends Record<string, InputPort>,
	const O extends OutputPort,
	const P extends Record<string, TemplateTypeParameterDefinition>
>(definition: GraphTemplateDefinitionInput<M, I, O, P> & { readonly typeParameters: P }): GraphTemplateDefinition<I, M, O, P>

export function defineTemplate<
	const M extends string,
	const I extends Record<string, InputPort>,
	const O extends OutputPort
>(definition: GraphTemplateDefinitionInput<M, I, O, undefined>): GraphTemplateDefinition<I, M, O, undefined>

export function defineTemplate<
	const M extends string,
	const I extends Record<string, InputPort>,
	const O extends OutputPort
>(definition: GraphTemplateDefinitionInput<
	M,
	I,
	O,
	Record<string, TemplateTypeParameterDefinition> | undefined
>): GraphTemplateDefinition<I, M, O, Record<string, TemplateTypeParameterDefinition> | undefined>

export function defineTemplate<
    const M extends string,
    const I extends Record<string, InputPort>,
    const O extends OutputPort,
	const P extends Record<string, TemplateTypeParameterDefinition> | undefined
>(definition: GraphTemplateDefinitionInput<M, I, O, P>): GraphTemplateDefinition<I, M, O, P> {
	if (typeof definition !== 'object' || definition === null || Array.isArray(definition)) {
		throw new TypeError('Template manifest must be a plain object.')
	}
	for (const propertyName of Object.keys(definition)) {
		if (!manifestPropertyNames.has(propertyName)) {
			throw new TypeError(`Template manifest contains unknown property ${propertyName}.`)
		}
	}
	const modelId = definition.modelId
	if (typeof modelId !== 'string' || modelId.length === 0) {
		throw new TypeError('template.modelId must be a non-empty string.')
	}
	const version = definition.version
	const description = definition.description
	if (version !== undefined && typeof version !== 'string') throw new TypeError('template.version must be a string.')
	if (description !== undefined && typeof description !== 'string') throw new TypeError('template.description must be a string.')
	const inputs = freezeManifestValue(definition.inputs, 'template.inputs') as I
	const output = freezeManifestValue(definition.output, 'template.output') as O
	const typeParameters = freezeManifestValue(definition.typeParameters, 'template.typeParameters')
	const callableScope = freezeManifestValue(definition.callableScope, 'template.callableScope')
	const callableScopeIssues = validateCallableScope(callableScope, inputs)
	if (callableScopeIssues.length > 0) throw new InvalidCallableScopeError(callableScopeIssues)
	const genericIssues = validateTemplateTypeParameters(typeParameters, inputs, output)
	if (genericIssues[0]) {
		throw new TypeError(`${genericIssues[0].code} at ${genericIssues[0].path}: ${genericIssues[0].message}`)
	}
	if (typeof definition.source !== 'string') throw new TypeError('template.source must be a string.')
	const templateSource = definition.source.replace(/\r\n?/gu, '\n')
	const replacementRegions = replacementRegionsForTemplate(templateSource, output)
	const markerContracts = markerContractsFor(modelId, templateSource, inputs, output, replacementRegions)
	const templateMode = templateModeForRegionKind(output.kind)
	const summary = () => ({
		modelId,
		...(version ? { version } : {}),
		...(description ? { description } : {}),
		...(typeParameters ? { typeParameters } : {}),
		...(callableScope ? { callableScope } : {}),
		inputs: Object.fromEntries(
			Object.entries(inputs).map(([key, port]) => [key, summarizeInputPort(port)])
		),
		output: summarizeOutputPort(output)
	})
	const manifestDigest = templateManifestDigest({ source: templateSource, summary })
	const executable: GraphTemplateDefinition<I, M, O, P> = {
		modelId,
		...(version ? { version } : {}),
		...(description ? { description } : {}),
		...(typeParameters ? { typeParameters } : {}),
		...(callableScope ? { callableScope } : {}),
		inputs,
		output,
		source: templateSource,
		manifestDigest,

		toReplacementMap(inputs) {
				return graphInputsToReplacementMap(inputs)
		},

            invoke(invocation: GraphTemplateInvocation): GeneratedFragment {
				const instantiated = instantiateTemplateContracts(typeParameters, inputs, output, invocation.typeArguments)
				if (!instantiated.contracts) throw new TypeError(instantiated.issues[0]?.message ?? 'Invalid template type arguments.')
				const instantiatedOutput = instantiated.contracts.output
				const advertisedOutputType = effectiveOutputType(instantiatedOutput)
                const replacements = graphInputsToReplacementMap(invocation.inputs)
                const generationOptions: GenerateOptions = {
                    ...(invocation.options ?? {}),
                    templateMode
                }
				const result = generateWithReplacements(
					templateSource,
					replacements,
					bindPrevalidatedRegions(generationOptions, templateSource, replacementRegions)
				)
				const sourceEdits = buildReplacementEdits(result.regions, replacements, generationOptions, templateSource)
				const mapped = applySourceMappedTextEdits(
					templateSource,
					nodeGeneratedSourceMap(templateSource.length, {
						...(invocation.nodeId ? { nodeId: invocation.nodeId } : {}),
						templateId: modelId
					}),
					sourceMappedTemplateEdits(sourceEdits, invocation, modelId)
				)
				const sourceIdentity = {
					...(invocation.nodeId ? { nodeId: invocation.nodeId } : {}),
					templateId: modelId
				}
				const sourceMap = coverGeneratedSourceMapRoot(
					remapGeneratedSourceMap(mapped.code, result.code, mapped.sourceMap),
					result.code.length,
					sourceIdentity
				)

                return {
                    ...(invocation.nodeId ? { id: invocation.nodeId } : {}),
                    code: result.code,
					kind: instantiatedOutput.kind,
					source: fragmentSource(modelId, version, manifestDigest),
					...(advertisedOutputType ? { type: advertisedOutputType } : {}),
					...(instantiatedOutput.schema === undefined ? {} : { schema: instantiatedOutput.schema }),
                    provenance: fragmentProvenance(invocation),
					sourceMap
                }
            },

            invokePartial(invocation: GraphTemplatePartialInvocation): TemplateArtifact {
				const instantiated = instantiateTemplateContracts(typeParameters, inputs, output, invocation.typeArguments)
				if (!instantiated.contracts) throw new TypeError(instantiated.issues[0]?.message ?? 'Invalid template type arguments.')
				const instantiatedOutput = instantiated.contracts.output
				const advertisedOutputType = effectiveOutputType(instantiatedOutput)
                const passthroughCode = new Map<string, string>()
                const serializedInputs: Record<string, ResolvedGraphInput> = {}
                for (const [inputName, input] of Object.entries(invocation.inputs)) {
                    const code = partialArtifactReplacementCode(input)
                    if (code === undefined) serializedInputs[inputName] = input
                    else passthroughCode.set(inputName, code)
                }
                const replacements = graphInputsToReplacementMap(serializedInputs)
                const generationOptions: GenerateOptions = {
                    ...(invocation.options ?? {}),
                    templateMode
                }
				const regions = replacementRegions
                const resolvedRegions = regions.filter(region => Object.prototype.hasOwnProperty.call(replacements, region.id))
                const edits = buildReplacementEdits(
                    resolvedRegions,
                    replacements,
                    { ...generationOptions, allowUnusedReplacements: true },
                    templateSource
                )

                for (const region of regions) {
                    if (Object.prototype.hasOwnProperty.call(replacements, region.id)) continue

                    const passthrough = passthroughCode.get(region.id)
                    if (passthrough !== undefined) {
                        edits.push({
                            start: region.startCommentStart,
                            end: region.endCommentEnd,
                            text: passthrough,
                            region
                        })
                        continue
                    }

                    const unresolved = invocation.unresolvedInputs[region.id]
                    if (unresolved) {
                        edits.push({
                            start: region.startCommentStart,
							end: region.endCommentEnd,
							text: `${markerComment(region.effectiveType, region.arity, unresolved.id)}${region.bodyText}/** @END **/`,
                            region
                        })
                        continue
                    }

                    edits.push({
                        start: region.startCommentStart,
                        end: region.endCommentEnd,
                        text: region.bodyText,
                        region
                    })
                }

				let mapped = applySourceMappedTextEdits(
					templateSource,
					nodeGeneratedSourceMap(templateSource.length, {
						...(invocation.nodeId ? { nodeId: invocation.nodeId } : {}),
						templateId: modelId
					}),
					sourceMappedTemplateEdits(edits, invocation, modelId)
				)
				if (generationOptions.format === 'ts-morph') {
					mapped = formatSourceMappedFragment(mapped.code, mapped.sourceMap, templateMode, {
						...(generationOptions.filePath ? { filePath: generationOptions.filePath } : {}),
						...(generationOptions.tsConfigFilePath ? { tsConfigFilePath: generationOptions.tsConfigFilePath } : {})
					})
				}
				const { code } = mapped
				const sourceMap = coverGeneratedSourceMapRoot(mapped.sourceMap, code.length, {
					...(invocation.nodeId ? { nodeId: invocation.nodeId } : {}),
					templateId: modelId
				})
                discoverReplacementRegions(code, { ...generationOptions, filePath: '__partial_template_artifact__.ts' })

                const allUnresolved = new Map<string, UnresolvedTemplateInput>()
                for (const unresolved of [...partialChildInputs(invocation.inputs), ...Object.values(invocation.unresolvedInputs)]) {
                    allUnresolved.set(unresolved.id, unresolved)
                }
                const unresolvedInputs = [...allUnresolved.values()]
                const base = {
                    ...(invocation.nodeId ? { id: invocation.nodeId } : {}),
                    code,
					kind: instantiatedOutput.kind,
					source: fragmentSource(modelId, version, manifestDigest),
					...(advertisedOutputType ? { type: advertisedOutputType } : {}),
					...(instantiatedOutput.schema === undefined ? {} : { schema: instantiatedOutput.schema }),
                    provenance: fragmentProvenance(invocation),
					sourceMap
                }

                if (unresolvedInputs.length === 0) {
                    return { ...base, complete: true }
                }

                return {
                    ...base,
                    complete: false,
                    unresolvedInputs
                } satisfies PartialTemplateArtifact
            },

		summary
	}

	const frozen = Object.freeze(executable)
	templateMarkerContracts.set(frozen, markerContracts)
	templateReplacementRegions.set(frozen, replacementRegions)
	return frozen
}
