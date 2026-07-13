import { describe, expect, it } from 'vitest'
import { GENERATED_SOURCE_MAP_VERSION, type GeneratedSourceMap } from '../src/templates/graphCoreTypes.js'
import {
	applySourceMappedTextEdits,
	deepestGeneratedSourceSpan,
	formatSourceMappedFragment,
	formatSourceMappedText,
	inputGeneratedSourceSpan,
	nodeGeneratedSourceMap,
	remapGeneratedSourceMap,
	sourceMappedFragmentCollection,
	transformSourcePositionThroughEdits
} from '../src/templates/sourceSpans.js'

function mappedExpression(
	code: string,
	nodeId: string,
	inputName?: string,
	inputStart = 0,
	inputEnd = code.length
): GeneratedSourceMap {
	const sourceMap = nodeGeneratedSourceMap(code.length, { nodeId, templateId: 'Expression' })
	if (inputName) {
		sourceMap.spans.push(inputGeneratedSourceSpan(
			inputStart,
			inputEnd,
			{ nodeId, templateId: 'Expression', inputName },
			1
		))
	}
	return sourceMap
}

describe('generated source span utilities', () => {
	it('transforms enclosing spans and embeds replacement maps transactionally', () => {
		const source = 'wrap(PENDING)'
		const root = nodeGeneratedSourceMap(source.length, { nodeId: 'root', templateId: 'Wrapper' })
		const childCode = 'bad'
		const child = mappedExpression(childCode, 'child', 'value')
		const start = source.indexOf('PENDING')
		const result = applySourceMappedTextEdits(source, root, [{
			start,
			end: start + 'PENDING'.length,
			text: childCode,
			sourceMap: child,
			nestingDepthOffset: 2
		}])

		expect(result.code).toBe('wrap(bad)')
		expect(result.sourceMap).toEqual({
			version: GENERATED_SOURCE_MAP_VERSION,
			spans: expect.arrayContaining([
				expect.objectContaining({ kind: 'node', nodeId: 'root', start: 0, end: result.code.length, nestingDepth: 0 }),
				expect.objectContaining({ kind: 'node', nodeId: 'child', start, end: start + 3, nestingDepth: 2 }),
				expect.objectContaining({ kind: 'input', nodeId: 'child', inputName: 'value', start, end: start + 3, nestingDepth: 3 })
			])
		})
	})

	it('maps positions exactly around replacements and zero-width insertions', () => {
		const edits = [
			{ start: 1, end: 3, text: 'longer' },
			{ start: 5, end: 5, text: '!' }
		]
		expect(transformSourcePositionThroughEdits(0, edits, 'left')).toBe(0)
		expect(transformSourcePositionThroughEdits(1, edits, 'left')).toBe(1)
		expect(transformSourcePositionThroughEdits(1, edits, 'right')).toBe(7)
		expect(transformSourcePositionThroughEdits(3, edits, 'left')).toBe(7)
		expect(transformSourcePositionThroughEdits(5, edits, 'left')).toBe(9)
		expect(transformSourcePositionThroughEdits(5, edits, 'right')).toBe(10)
		expect(transformSourcePositionThroughEdits(6, edits, 'left')).toBe(11)

		const adjacent = [
			{ start: 0, end: 1, text: 'aa' },
			{ start: 1, end: 2, text: 'bbb' }
		]
		expect(transformSourcePositionThroughEdits(1, adjacent, 'left')).toBe(2)
		expect(transformSourcePositionThroughEdits(1, adjacent, 'right')).toBe(5)
	})

	it('preserves authored order and duplicates physical child occurrences in collections', () => {
		const child = {
			id: 'shared',
			code: 'run();',
			source: { templateId: 'RunStatement' },
			sourceMap: mappedExpression('run();', 'shared')
		}
		const collection = sourceMappedFragmentCollection([child, child], '\n', 2)

		expect(collection.code).toBe('run();\nrun();')
		const occurrences = collection.sourceMap.spans.filter(span => span.nodeId === 'shared')
		expect(occurrences).toHaveLength(2)
		expect(occurrences.map(span => [span.start, span.end, span.nestingDepth])).toEqual([
			[0, 6, 2],
			[7, 13, 2]
		])
	})

	it('remaps nested spans through token-preserving serialization and indentation', () => {
		const before = '([alpha,\nbeta])'
		const after = '[alpha,\n  beta]'
		const betaStart = before.indexOf('beta')
		const sourceMap = mappedExpression(before, 'array', 'second', betaStart, betaStart + 4)
		const remapped = remapGeneratedSourceMap(before, after, sourceMap)
		const input = remapped.spans.find(span => span.kind === 'input')

		expect(input).toBeDefined()
		expect(after.slice(input!.start, input!.end)).toBe('beta')
		expect(remapped.spans.find(span => span.kind === 'node')).toMatchObject({ start: 0, end: after.length })
	})

	it('selects point containment before overlap and then the deepest input owner', () => {
		const sourceMap: GeneratedSourceMap = {
			version: GENERATED_SOURCE_MAP_VERSION,
			spans: [
				{ kind: 'node', start: 0, end: 20, nestingDepth: 0, nodeId: 'root', templateId: 'Root' },
				{ kind: 'input', start: 5, end: 15, nestingDepth: 1, nodeId: 'root', templateId: 'Root', inputName: 'child' },
				{ kind: 'node', start: 5, end: 15, nestingDepth: 2, nodeId: 'child', templateId: 'Child' },
				{ kind: 'input', start: 8, end: 11, nestingDepth: 3, nodeId: 'child', templateId: 'Child', inputName: 'value' },
				{ kind: 'node', start: 12, end: 15, nestingDepth: 8, nodeId: 'sibling', templateId: 'Sibling' }
			]
		}

		expect(deepestGeneratedSourceSpan(sourceMap, 9, 6)).toMatchObject({
			kind: 'input', nodeId: 'child', inputName: 'value'
		})
		// The range overlaps the deeper sibling, but its start is owned by child.value.
		expect(deepestGeneratedSourceSpan(sourceMap, 10, 5)).toMatchObject({
			kind: 'input', nodeId: 'child', inputName: 'value'
		})
	})

	it('applies TypeScript formatting edits without losing input ownership', () => {
		const code = 'function f(){const value=1+2;return value;}'
		const expressionStart = code.indexOf('1+2')
		const sourceMap = mappedExpression(code, 'function', 'initializer', expressionStart, expressionStart + 3)
		const formatted = formatSourceMappedText(code, sourceMap)
		const input = formatted.sourceMap.spans.find(span => span.kind === 'input')
		const root = formatted.sourceMap.spans.find(span => span.kind === 'node')

		expect(formatted.code).toContain('1 + 2')
		expect(input).toBeDefined()
		// Formatting whitespace inserted exactly at a range boundary is retained by
		// the enclosing input span; its significant source remains unchanged.
		expect(formatted.code.slice(input!.start, input!.end).trim()).toBe('1 + 2')
		expect(root).toMatchObject({ start: 0, end: formatted.code.length })
	})

	it('formats non-file fragments through sentinels and rebases their maps', () => {
		const code = '.map(value=>value+1)'
		const expressionStart = code.indexOf('value+1')
		const sourceMap = mappedExpression(code, 'suffix', 'handler', expressionStart, expressionStart + 7)
		const formatted = formatSourceMappedFragment(code, sourceMap, { kind: 'expressionSuffix' })
		const input = formatted.sourceMap.spans.find(span => span.kind === 'input')

		expect(formatted.code).toContain('.map(value => value + 1)')
		expect(formatted.code).not.toContain('__synthesize_regions_mapped')
		expect(formatted.code.slice(input!.start, input!.end).trim()).toBe('value + 1')
	})

	it('rejects overlapping edit ranges before changing source text', () => {
		const sourceMap = nodeGeneratedSourceMap(6, { nodeId: 'root', templateId: 'Root' })
		expect(() => applySourceMappedTextEdits('abcdef', sourceMap, [
			{ start: 1, end: 4, text: 'x' },
			{ start: 3, end: 5, text: 'y' }
		])).toThrow(/must not overlap/u)
	})
})
