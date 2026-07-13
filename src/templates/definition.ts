import type { GenerateOptions, MarkerExpectedKind } from '../core/types.js'
import { generateWithReplacements } from '../generation/generate.js'
import { buildReplacementEdits } from '../replacements/serialize.js'
import { discoverReplacementRegions } from '../regions/discovery.js'
import { portRegionKind, summarizeInputPort, summarizeOutputPort } from './compatibility.js'
import { templateModeForRegionKind } from './rendering.js'
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

import { isMatching } from 'ts-pattern'
import {
	SpecPattern,
	InputPatternMap,
	ReplacementFor,
	toReplacements,
	GeneratedCode,
	generatedCode,
	graphInputsToReplacementMap
} from './converter.js'
import type {
	GeneratedFragment,
	GeneratedSourceMap,
	GraphRegionBuilder,
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
	TypeDescriptor,
	UnresolvedTemplateInput
} from './graphTypes.js'


/**
 * Extract the runtime `ts-pattern` matcher object from a template spec.
 */
export function getInputPatternMap<S extends SpecPattern>(spec: S): InputPatternMap<S> {
    return Object.fromEntries(Object.entries(spec).map(([key, value]) => [key, value.input])) as InputPatternMap<S>
}

/**
 * Runtime matcher typed so successful matches narrow to the replacement input
 * required by the spec.
 */
export const isMatchingInputPatternMap = isMatching as unknown as <S extends SpecPattern>(
    pattern: InputPatternMap<S>,
    value: unknown
) => value is ReplacementFor<S>

/**
 * A reusable source template plus its input pattern and output marker kind.
 */
export type LegacyTemplateDefinition<S extends SpecPattern, O extends MarkerExpectedKind, M extends string> = {
    /** Stable template/model identifier preserved on generated output. */
    readonly modelId: M
    /** Marker kind produced by this legacy template. */
    readonly outputKind: O
    /** Runtime input matchers and output marker kinds for each region key. */
    readonly pattern: S

    /** Generate branded code by applying replacement inputs to the template. */
    apply(replacements: ReplacementFor<S>, options?: GenerateOptions): GeneratedCode<O, M>
}

export type TemplateDefinition<S extends SpecPattern, O extends MarkerExpectedKind, M extends string> =
    LegacyTemplateDefinition<S, O, M>

/**
 * Helper passed to template functions for embedding replacement regions.
 */
export type RegionBuilder<S extends SpecPattern> = <K extends Extract<keyof S, string>>(key: K, body: string) => string

/** Declarative input shape accepted by the graph-template overload. */
export type GraphTemplateDefinitionInput<
    M extends string,
    I extends Record<string, InputPort>,
    O extends OutputPort = OutputPort
> = {
    /** Stable template/model identifier used by graph nodes and provenance. */
    readonly modelId: M
    /** Optional template version copied into generated fragment provenance. */
    readonly version?: string
    /** Optional human-readable summary surfaced in template summaries. */
    readonly description?: string
    /** Named graph input ports accepted by the template. */
    readonly inputs: StrictInputPortMap<I>
    /** Output fragment contract advertised by the template. */
    readonly output: StrictOutputPort<O>
    /** Source-template factory; call `region` to create marked placeholders. */
    readonly template: (region: GraphRegionBuilder<I>) => string
}

export type LegacyTemplateDefinitionInput<
    M extends string,
    O extends MarkerExpectedKind,
    S extends SpecPattern
> = {
    /** Stable template/model identifier preserved on generated output. */
    readonly modelId: M
    /** Marker kind produced by this legacy template. */
    readonly outputKind: O
    /** Runtime input matchers and output marker kinds for each region key. */
    readonly pattern: S
    /** Source-template factory; call `region` to create marked placeholders. */
    readonly template: (region: RegionBuilder<S>) => string
}

/** Default placeholder body used when a graph template marks an input without a fallback. */
function defaultPlaceholder(kind: RegionKind): string {
    switch (kind) {
        case 'identifier':
            return 'placeholder'
        case 'expression':
            return 'undefined'
        case 'expressionSuffix':
            return '.value'
        case 'statement':
            return 'throw new Error("placeholder");'
        case 'array':
            return '[]'
        case 'object':
            return '{}'
        case 'string':
            return '""'
        case 'number':
            return '0'
        case 'boolean':
            return 'false'
        case 'null':
            return 'null'
        case 'objectProperty':
            return 'placeholder: undefined'
    }
}

/** Render a replacement marker opening comment with the scoped artifact ID. */
function markerComment(kind: RegionKind, arity: 'one' | 'many', id: string): string {
    const markerKind = arity === 'many' ? `${kind}[]` : kind
    return `/** @TYPE ${markerKind} id=${id} **/`
}

/** Build the fragment source metadata shared by strict and partial outputs. */
function fragmentSource<M extends string>(
    modelId: M,
    version: string | undefined
): GeneratedFragment['source'] {
    return {
        templateId: modelId,
        ...(version ? { templateVersion: version } : {})
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
        ...(Object.keys(literalInputs).length > 0 ? { literalInputs } : {})
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
        return input.fragments.map(fragment => fragment.code).join(input.port.separator ?? '\n')
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
		const joined = sourceMappedFragmentCollection(input.fragments, input.port.separator ?? '\n')
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
    const O extends OutputPort
>(definition: GraphTemplateDefinitionInput<M, I, O>): GraphTemplateDefinition<I, M, O>

export function defineTemplate<
    const M extends string,
    const O extends MarkerExpectedKind,
    const S extends SpecPattern
>(definition: LegacyTemplateDefinitionInput<M, O, S>): LegacyTemplateDefinition<S, O, M>

export function defineTemplate<
    const M extends string,
    const O extends MarkerExpectedKind,
    const S extends SpecPattern
>(definition: {
    readonly modelId: M
    readonly outputKind: O
    readonly pattern: S
    readonly template: (region: RegionBuilder<S>) => string
} | GraphTemplateDefinitionInput<M, Record<string, InputPort>>): LegacyTemplateDefinition<S, O, M> | GraphTemplateDefinition<Record<string, InputPort>, M> {
	if ('inputs' in definition) {
		const advertisedOutputType = effectiveOutputType(definition.output)
        const region: GraphRegionBuilder<Record<string, InputPort>> = (key, body) => {
            const port = definition.inputs[key]
            if (!port) {
                throw new Error(`Unknown template input: ${key}`)
            }

            const marker = portRegionKind(port)
            return `/** @TYPE ${marker} id=${key} **/${body ?? defaultPlaceholder(marker)}/** @END **/`
        }

                const templateMode = templateModeForRegionKind(definition.output.kind)
        const templateSource = definition.template(region)
        discoverReplacementRegions(templateSource, { templateMode })

        return {
            modelId: definition.modelId,
            ...(definition.version ? { version: definition.version } : {}),
            ...(definition.description ? { description: definition.description } : {}),
            inputs: definition.inputs,
            output: definition.output,
            template: definition.template,

            toReplacementMap(inputs) {
                return graphInputsToReplacementMap(inputs)
            },

            invoke(invocation: GraphTemplateInvocation): GeneratedFragment {
                const replacements = graphInputsToReplacementMap(invocation.inputs)
                const generationOptions: GenerateOptions = {
                    ...(invocation.options ?? {}),
                    templateMode
                }
                const result = generateWithReplacements(
                    templateSource,
                    replacements,
                    generationOptions
                )
				const sourceEdits = buildReplacementEdits(result.regions, replacements, generationOptions, templateSource)
				const mapped = applySourceMappedTextEdits(
					templateSource,
					nodeGeneratedSourceMap(templateSource.length, {
						...(invocation.nodeId ? { nodeId: invocation.nodeId } : {}),
						templateId: definition.modelId
					}),
					sourceMappedTemplateEdits(sourceEdits, invocation, definition.modelId)
				)
				const sourceIdentity = {
					...(invocation.nodeId ? { nodeId: invocation.nodeId } : {}),
					templateId: definition.modelId
				}
				const sourceMap = coverGeneratedSourceMapRoot(
					remapGeneratedSourceMap(mapped.code, result.code, mapped.sourceMap),
					result.code.length,
					sourceIdentity
				)

                return {
                    ...(invocation.nodeId ? { id: invocation.nodeId } : {}),
                    code: result.code,
                    kind: definition.output.kind,
                    source: fragmentSource(definition.modelId, definition.version),
					...(advertisedOutputType ? { type: advertisedOutputType } : {}),
                    ...(definition.output.schema === undefined ? {} : { schema: definition.output.schema }),
                    provenance: fragmentProvenance(invocation),
					sourceMap
                }
            },

            invokePartial(invocation: GraphTemplatePartialInvocation): TemplateArtifact {
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
                const regions = discoverReplacementRegions(templateSource, { templateMode })
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
						templateId: definition.modelId
					}),
					sourceMappedTemplateEdits(edits, invocation, definition.modelId)
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
					templateId: definition.modelId
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
                    kind: definition.output.kind,
                    source: fragmentSource(definition.modelId, definition.version),
					...(advertisedOutputType ? { type: advertisedOutputType } : {}),
                    ...(definition.output.schema === undefined ? {} : { schema: definition.output.schema }),
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

            summary() {
                return {
                    modelId: definition.modelId,
                    ...(definition.version ? { version: definition.version } : {}),
                    ...(definition.description ? { description: definition.description } : {}),
                    inputs: Object.fromEntries(
                        Object.entries(definition.inputs).map(([key, port]) => [key, summarizeInputPort(port)])
                    ),
                    output: summarizeOutputPort(definition.output)
                }
            }
        }
    }

    const region: RegionBuilder<S> = (key, body) => {
        const marker = definition.pattern[key]?.output

        return `/** @TYPE ${marker} id=${key} **/${body}/** @END **/`
    }

    return {
        modelId: definition.modelId,
        outputKind: definition.outputKind,
        pattern: definition.pattern,

        apply(replacements, options) {
            const inputPattern = getInputPatternMap(definition.pattern)

            if (!isMatchingInputPatternMap(inputPattern, replacements)) {
                throw new Error('Invalid replacement map')
            }

            const result = generateWithReplacements(
                definition.template(region),
                toReplacements(definition.pattern, replacements),
                options
            )

            return generatedCode(definition.outputKind, definition.modelId, result.code)
        }
    }
}
