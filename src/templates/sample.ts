import { P } from 'ts-pattern'
import { SpecPattern, isGeneratedExpression, isGeneratedCodeFrom } from './converter.js'
import { defineTemplate } from './definition.js'

/**
 * Experimental examples showing how generated template output can feed into a
 * later template through branded `GeneratedCode` values and `ts-pattern` guards.
 */
function requiredKey<S extends object, K extends string>(key: K): Extract<keyof S, string> {
	return key as unknown as Extract<keyof S, string>
}

const defineNewConditionTemplate = <
	const M extends string,
	const S extends SpecPattern & {
		readonly arrowArray: {
			readonly input: P.Pattern<unknown>
			readonly output: 'expression'
		}
	}
>(definition: {
	readonly modelId: M
	readonly pattern: S
}) =>
	defineTemplate({
		modelId: definition.modelId,
		outputKind: 'expressionSuffix',
		pattern: definition.pattern,
		template: (region) =>
			`.with({ type: "poop", seconds: 10 }, ${region(requiredKey<S, 'arrowArray'>('arrowArray'), 'x => x')})`
	})

const ArrowArray = defineTemplate({
	modelId: 'ArrowArray',
	outputKind: 'expression',
	pattern: {
		sourceArray: {
			input: P.array(P.boolean),
			output: 'array'
		}
	},
	template: (region) => `(data: [1, 2, 3]) => ${region('sourceArray', 'someValue')}.map((x, i) => data[i] == Number(x))`
})

const NewCondition = defineNewConditionTemplate({
	modelId: 'NewCondition',
	pattern: {
		arrowArray: {
			input: P.when(isGeneratedExpression),
			output: 'expression'
		}
	}
})

const NewCondArrowOnly = defineNewConditionTemplate({
	modelId: 'NewCondArrowOnly',
	pattern: {
		arrowArray: {
			input: P.when(isGeneratedCodeFrom('expression', ArrowArray.modelId)),
			output: 'expression'
		}
	}
})

NewCondArrowOnly.apply({ arrowArray: ArrowArray.apply({ sourceArray: [true, false] }) })
