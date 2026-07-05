import type { GenerateOptions, MarkerExpectedKind } from '../core/types.js'
import { generateWithReplacements } from '../generation/generate.js'

import { isMatching, P } from 'ts-pattern'
import {
	SpecPattern,
	InputPatternMap,
	ReplacementFor,
	toReplacements,
	GeneratedCode,
	generatedCode
} from './converter.js'


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
export type TemplateDefinition<S extends SpecPattern, O extends MarkerExpectedKind, M extends string> = {
    readonly modelId: M
    readonly outputKind: O
    readonly pattern: S

    apply(replacements: ReplacementFor<S>, options?: GenerateOptions): GeneratedCode<O, M>
}

/**
 * Helper passed to template functions for embedding replacement regions.
 */
export type RegionBuilder<S extends SpecPattern> = <K extends Extract<keyof S, string>>(key: K, body: string) => string

/**
 * Define a typed template that can validate ergonomic input values, synthesize
 * marker replacements, and brand the generated output with its model ID.
 */
export function defineTemplate<
    const M extends string,
    const O extends MarkerExpectedKind,
    const S extends SpecPattern
>(definition: {
    readonly modelId: M
    readonly outputKind: O
    readonly pattern: S
    readonly template: (region: RegionBuilder<S>) => string
}): TemplateDefinition<S, O, M> {
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
