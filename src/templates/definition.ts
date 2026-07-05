import type { GenerateOptions, MarkerExpectedKind, TemplateMode } from '../core/types.js'
import { generateWithReplacements } from '../generation/generate.js'
import { discoverReplacementRegions } from '../regions/discovery.js'
import { portRegionKind, summarizeInputPort, summarizeOutputPort } from './compatibility.js'

import { isMatching, match, P } from 'ts-pattern'
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
	GraphRegionBuilder,
	GraphTemplateDefinition,
	GraphTemplateInvocation,
	InputPort,
	OutputPort,
	RegionKind,
	StrictInputPortMap,
	StrictOutputPort
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

function defaultPlaceholder(kind: RegionKind): string {
    return match(kind)
        .returnType<string>()
        .with('identifier', () => 'placeholder')
        .with('expression', () => 'undefined')
        .with('expressionSuffix', () => '.value')
        .with('statement', () => 'throw new Error("placeholder");')
        .with('array', () => '[]')
        .with('object', () => '{}')
        .with('string', () => '""')
        .with('number', () => '0')
        .with('boolean', () => 'false')
        .with('null', () => 'null')
        .with('objectProperty', () => 'placeholder: undefined')
        .exhaustive()
}

function templateModeForOutput(kind: RegionKind): TemplateMode {
    return match(kind)
        .returnType<TemplateMode>()
        .with('expressionSuffix', () => ({ kind: 'expressionSuffix' }))
        .with('statement', () => ({ kind: 'statementList' }))
        .with('objectProperty', () => ({ kind: 'objectPropertyList' }))
        .otherwise(() => ({ kind: 'expression' }))
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
        const region: GraphRegionBuilder<Record<string, InputPort>> = (key, body) => {
            const port = definition.inputs[key]
            if (!port) {
                throw new Error(`Unknown template input: ${key}`)
            }

            const marker = portRegionKind(port)
            return `/** @TYPE ${marker} id=${key} **/${body ?? defaultPlaceholder(marker)}/** @END **/`
        }

        const templateMode = templateModeForOutput(definition.output.kind)
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
                    templateMode: invocation.options?.templateMode ?? templateMode
                }
                const result = generateWithReplacements(
                    templateSource,
                    replacements,
                    generationOptions
                )

                const inputRefs = Object.values(invocation.inputs)
                    .filter(input => input.kind === 'fragment')
                    .map(input => input.fragment.id)
                    .filter((id): id is string => typeof id === 'string')

                const literalInputs: Record<string, unknown> = {}
                for (const [key, input] of Object.entries(invocation.inputs)) {
                    if (input.kind === 'literal') {
                        literalInputs[key] = input.value
                    }
                }

                return {
                    ...(invocation.nodeId ? { id: invocation.nodeId } : {}),
                    code: result.code,
                    kind: definition.output.kind,
                    source: {
                        templateId: definition.modelId,
                        ...(definition.version ? { templateVersion: definition.version } : {})
                    },
                    ...(definition.output.type ? { type: definition.output.type } : {}),
                    ...(definition.output.schema === undefined ? {} : { schema: definition.output.schema }),
                    provenance: {
                        ...(invocation.nodeId ? { nodeId: invocation.nodeId } : {}),
                        ...(inputRefs.length > 0 ? { inputRefs } : {}),
                        ...(Object.keys(literalInputs).length > 0 ? { literalInputs } : {})
                    }
                }
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
