import { Project, ScriptKind, ts, type FormatCodeSettings } from 'ts-morph'
import type { TemplateMode } from '../core/types.js'
import {
	GENERATED_SOURCE_MAP_VERSION,
	type GeneratedSourceMap,
	type GeneratedSourceSpan
} from './graphCoreTypes.js'

/** Text plus source ownership ranges expressed relative to that text. */
export interface SourceMappedText {
	code: string
	sourceMap: GeneratedSourceMap
}

/** One simultaneous text edit whose offsets refer to the unedited source. */
export interface SourceMappedTextEdit {
	start: number
	end: number
	text: string
	/** Ownership ranges relative to `text`, when the replacement carries generated source. */
	sourceMap?: GeneratedSourceMap
	/** Depth added to every span embedded from `sourceMap`. */
	nestingDepthOffset?: number
}

/** Minimal generated fragment shape accepted by source-map composition helpers. */
export interface SourceMappedFragment {
	code: string
	id?: string
	source: { templateId: string }
	sourceMap?: GeneratedSourceMap
}

/** Identity attached to a newly rendered node or input span. */
export interface GeneratedSourceIdentity {
	nodeId?: string
	templateId: string
}

/** Options for formatting text while retaining exact offsets through TypeScript edits. */
export interface SourceMappedFormatOptions {
	filePath?: string
	tsConfigFilePath?: string
	formatSettings?: FormatCodeSettings
}

const FORMAT_START_MARKER = '/*__synthesize_regions_mapped_start__*/'
const FORMAT_END_MARKER = '/*__synthesize_regions_mapped_end__*/'

type PositionBias = 'left' | 'right'

interface SignificantToken {
	kind: ts.SyntaxKind
	start: number
	end: number
	text: string
}

interface TokenPair {
	from: SignificantToken
	to: SignificantToken
}

/** Create an empty, versioned generated-source map. */
export function emptyGeneratedSourceMap(): GeneratedSourceMap {
	return { version: GENERATED_SOURCE_MAP_VERSION, spans: [] }
}

/** Merge maps that are already expressed in the same output coordinate space. */
export function mergeGeneratedSourceMaps(
	...sourceMaps: readonly (GeneratedSourceMap | undefined)[]
): GeneratedSourceMap {
	return normalizeGeneratedSourceMap(sourceMaps.flatMap(sourceMap => sourceMap?.spans ?? []))
}

/** Create the root ownership range for one node artifact. */
export function nodeGeneratedSourceMap(
	codeLength: number,
	identity: GeneratedSourceIdentity,
	nestingDepth = 0
): GeneratedSourceMap {
	assertNonNegativeInteger(codeLength, 'codeLength')
	assertNonNegativeInteger(nestingDepth, 'nestingDepth')
	return {
		version: GENERATED_SOURCE_MAP_VERSION,
		spans: [{
			kind: 'node',
			start: 0,
			end: codeLength,
			nestingDepth,
			...(identity.nodeId === undefined ? {} : { nodeId: identity.nodeId }),
			templateId: identity.templateId
		}]
	}
}

/** Ensure the current artifact node owns the complete rendered code range. */
export function coverGeneratedSourceMapRoot(
	sourceMap: GeneratedSourceMap,
	codeLength: number,
	identity: GeneratedSourceIdentity
): GeneratedSourceMap {
	assertNonNegativeInteger(codeLength, 'codeLength')
	let found = false
	const spans = sourceMap.spans.map(span => {
		if (span.kind !== 'node'
			|| span.nestingDepth !== 0
			|| span.templateId !== identity.templateId
			|| span.nodeId !== identity.nodeId) return span
		found = true
		return { ...span, start: 0, end: codeLength }
	})
	if (!found) spans.push(nodeGeneratedSourceMap(codeLength, identity).spans[0]!)
	return normalizeGeneratedSourceMap(spans)
}

/** Create one source range owned by a concrete template input. */
export function inputGeneratedSourceSpan(
	start: number,
	end: number,
	identity: GeneratedSourceIdentity & { inputName: string },
	nestingDepth: number
): GeneratedSourceSpan {
	assertRange(start, end, Number.MAX_SAFE_INTEGER, 'input span')
	assertNonNegativeInteger(nestingDepth, 'nestingDepth')
	return {
		kind: 'input',
		start,
		end,
		nestingDepth,
		...(identity.nodeId === undefined ? {} : { nodeId: identity.nodeId }),
		templateId: identity.templateId,
		inputName: identity.inputName
	}
}

/** Shift all ranges in a map by an output offset and composition depth. */
export function shiftGeneratedSourceMap(
	sourceMap: GeneratedSourceMap,
	offset: number,
	nestingDepthOffset = 0
): GeneratedSourceMap {
	assertInteger(offset, 'offset')
	assertInteger(nestingDepthOffset, 'nestingDepthOffset')
	return normalizeGeneratedSourceMap(sourceMap.spans.map(span => ({
		...span,
		start: span.start + offset,
		end: span.end + offset,
		nestingDepth: span.nestingDepth + nestingDepthOffset
	})))
}

/**
 * Transform a source position through simultaneous, non-overlapping text edits.
 *
 * Positions inside replaced text map to the replacement's left or right edge.
 * The bias also chooses a side for a zero-width insertion at the position.
 */
export function transformSourcePositionThroughEdits(
	position: number,
	edits: readonly Pick<SourceMappedTextEdit, 'start' | 'end' | 'text'>[],
	bias: PositionBias
): number {
	assertNonNegativeInteger(position, 'position')
	const sorted = normalizeTextEdits(edits)
	let delta = 0
	let leftBoundary: number | undefined
	let rightBoundary: number | undefined

	for (const edit of sorted) {
		const outputStart = edit.start + delta
		const outputEnd = outputStart + edit.text.length

		if (position < edit.start) break
		if (position >= edit.start && position <= edit.end) {
			const localLeft = position === edit.end && edit.start !== edit.end ? outputEnd : outputStart
			leftBoundary = leftBoundary === undefined ? localLeft : Math.min(leftBoundary, localLeft)
			rightBoundary = rightBoundary === undefined ? outputEnd : Math.max(rightBoundary, outputEnd)
		}

		delta += edit.text.length - (edit.end - edit.start)
	}

	if (leftBoundary !== undefined && rightBoundary !== undefined) {
		return bias === 'left' ? leftBoundary : rightBoundary
	}
	return position + delta
}

/** Transform existing ownership ranges through text edits without adding replacement maps. */
export function transformGeneratedSourceMapThroughEdits(
	sourceMap: GeneratedSourceMap,
	edits: readonly Pick<SourceMappedTextEdit, 'start' | 'end' | 'text'>[]
): GeneratedSourceMap {
	const sorted = normalizeTextEdits(edits)
	return normalizeGeneratedSourceMap(sourceMap.spans.map(span => ({
		...span,
		start: transformSourcePositionThroughEdits(span.start, sorted, 'left'),
		// A span ending exactly where a sibling replacement begins must not
		// absorb that sibling. Enclosing/equal spans still use the right edge.
		end: transformSourcePositionThroughEdits(
			span.end,
			sorted,
			sorted.some(edit => span.start < span.end && span.end === edit.start) ? 'left' : 'right'
		)
	})))
}

/**
 * Apply simultaneous text edits and compose both existing and inserted maps.
 *
 * Edit source maps are relative to their replacement `text`. Existing enclosing
 * spans expand across replacements, so partial-child ownership survives fills.
 */
export function applySourceMappedTextEdits(
	code: string,
	sourceMap: GeneratedSourceMap,
	edits: readonly SourceMappedTextEdit[]
): SourceMappedText {
	const sorted = normalizeTextEdits(edits, code.length)
	let output = code
	for (const edit of [...sorted].reverse()) {
		output = `${output.slice(0, edit.start)}${edit.text}${output.slice(edit.end)}`
	}

	const spans = transformGeneratedSourceMapThroughEdits(sourceMap, sorted).spans
	let delta = 0
	for (const edit of sorted) {
		const outputStart = edit.start + delta
		if (edit.sourceMap) {
			assertSourceMapWithinCode(edit.sourceMap, edit.text.length, 'edit.sourceMap')
			spans.push(...shiftGeneratedSourceMap(
				edit.sourceMap,
				outputStart,
				edit.nestingDepthOffset ?? 0
			).spans)
		}
		delta += edit.text.length - (edit.end - edit.start)
	}

	return { code: output, sourceMap: normalizeGeneratedSourceMap(spans) }
}

/**
 * Remap ownership ranges when serialization changes the surrounding text.
 *
 * Significant TypeScript tokens are aligned first. Offsets inside matching
 * tokens and the trivia between them are then interpolated monotonically. This
 * preserves useful nested ranges across indentation, parentheses normalization,
 * and structured graph-fragment serialization.
 */
export function remapGeneratedSourceMap(
	fromCode: string,
	toCode: string,
	sourceMap: GeneratedSourceMap
): GeneratedSourceMap {
	assertSourceMapWithinCode(sourceMap, fromCode.length, 'sourceMap')
	if (fromCode === toCode) return normalizeGeneratedSourceMap(sourceMap.spans)

	const pairs = alignSignificantTokens(scanSignificantTokens(fromCode), scanSignificantTokens(toCode))
	return normalizeGeneratedSourceMap(sourceMap.spans.map(span => ({
		...span,
		start: remapOffset(span.start, fromCode.length, toCode.length, pairs, 'left'),
		end: remapOffset(span.end, fromCode.length, toCode.length, pairs, 'right')
	})))
}

/** Build mapped fragment text, synthesizing a whole-node fallback for legacy artifacts. */
export function sourceMappedFragment(
	fragment: SourceMappedFragment,
	renderedCode = fragment.code,
	nestingDepthOffset = 0
): SourceMappedText {
	const intrinsic = fragment.sourceMap ?? nodeGeneratedSourceMap(fragment.code.length, {
		...(fragment.id === undefined ? {} : { nodeId: fragment.id }),
		templateId: fragment.source.templateId
	})
	const remapped = remapGeneratedSourceMap(fragment.code, renderedCode, intrinsic)
	return {
		code: renderedCode,
		sourceMap: shiftGeneratedSourceMap(remapped, 0, nestingDepthOffset)
	}
}

/** Concatenate mapped fragments in authored order while leaving separators unowned. */
export function sourceMappedFragmentCollection(
	fragments: readonly SourceMappedFragment[],
	separator = '\n',
	nestingDepthOffset = 0
): SourceMappedText {
	let code = ''
	const spans: GeneratedSourceSpan[] = []
	for (const [index, fragment] of fragments.entries()) {
		if (index > 0) code += separator
		const offset = code.length
		const mapped = sourceMappedFragment(fragment, fragment.code, nestingDepthOffset)
		code += mapped.code
		spans.push(...shiftGeneratedSourceMap(mapped.sourceMap, offset).spans)
	}
	return { code, sourceMap: normalizeGeneratedSourceMap(spans) }
}

/**
 * Select the most specific contributor for a compiler diagnostic.
 *
 * Point containment is authoritative. Range overlap is considered only when no
 * span contains the diagnostic start, preventing a broad diagnostic from being
 * assigned to an arbitrary nested sibling.
 */
export function deepestGeneratedSourceSpan(
	sourceMap: GeneratedSourceMap | undefined,
	diagnosticStart: number,
	diagnosticLength = 0
): GeneratedSourceSpan | undefined {
	if (!sourceMap || !Number.isInteger(diagnosticStart) || diagnosticStart < 0) return undefined
	const containing = sourceMap.spans.filter(span => span.start <= diagnosticStart && diagnosticStart < span.end)
	if (containing.length > 0) return [...containing].sort(compareDeepestFirst)[0]
	if (!Number.isInteger(diagnosticLength) || diagnosticLength <= 0) return undefined
	const diagnosticEnd = diagnosticStart + diagnosticLength
	const overlapping = sourceMap.spans.filter(span => span.start < diagnosticEnd && span.end > diagnosticStart)
	return [...overlapping].sort(compareDeepestFirst)[0]
}

/** Format one complete TypeScript source text and transform its map through exact compiler edits. */
export function formatSourceMappedText(
	code: string,
	sourceMap: GeneratedSourceMap,
	options: SourceMappedFormatOptions = {}
): SourceMappedText {
	assertSourceMapWithinCode(sourceMap, code.length, 'sourceMap')
	const project = options.tsConfigFilePath
		? new Project({ tsConfigFilePath: options.tsConfigFilePath, skipAddingFilesFromTsConfig: true })
		: new Project({
			compilerOptions: {
				target: ts.ScriptTarget.ES2022,
				module: ts.ModuleKind.ES2022,
				strict: true,
				skipLibCheck: true
			}
		})
	const filePath = options.filePath ?? '__generated_source_map_format__.ts'
	const sourceFile = project.createSourceFile(filePath, code, { overwrite: true, scriptKind: ScriptKind.TS })
	const changes = project.getLanguageService().getFormattingEditsForDocument(
		sourceFile.getFilePath(),
		options.formatSettings ?? {}
	)
	const edits: SourceMappedTextEdit[] = changes.map(change => ({
		start: change.getSpan().getStart(),
		end: change.getSpan().getEnd(),
		text: change.getNewText()
	}))
	return applySourceMappedTextEdits(code, sourceMap, edits)
}

/** Clip mapped text to a substring and rebase all intersecting ownership ranges. */
export function sliceSourceMappedText(
	mapped: SourceMappedText,
	start: number,
	end = mapped.code.length
): SourceMappedText {
	assertRange(start, end, mapped.code.length, 'slice')
	const spans = mapped.sourceMap.spans
		.filter(span => span.start < end && span.end > start)
		.map(span => ({
			...span,
			start: Math.max(span.start, start) - start,
			end: Math.min(span.end, end) - start
		}))
	return {
		code: mapped.code.slice(start, end),
		sourceMap: normalizeGeneratedSourceMap(spans)
	}
}

/**
 * Format an artifact fragment in the wrapper required by its syntactic kind.
 * Stable comment sentinels let the formatted fragment and its transformed map
 * be sliced back out without guessing formatter-induced offsets.
 */
export function formatSourceMappedFragment(
	code: string,
	sourceMap: GeneratedSourceMap,
	mode: TemplateMode,
	options: SourceMappedFormatOptions = {}
): SourceMappedText {
	if (mode.kind === 'file') return formatSourceMappedText(code, sourceMap, options)
	const wrapped = sourceMapFormattingWrapper(code, mode)
	const wrappedMap = shiftGeneratedSourceMap(sourceMap, wrapped.sourceStart)
	const formatted = formatSourceMappedText(wrapped.code, wrappedMap, options)
	const startMarker = formatted.code.indexOf(FORMAT_START_MARKER)
	const endMarker = formatted.code.indexOf(FORMAT_END_MARKER, startMarker + FORMAT_START_MARKER.length)
	if (startMarker < 0 || endMarker < 0) return { code, sourceMap }
	return sliceSourceMappedText(formatted, startMarker + FORMAT_START_MARKER.length, endMarker)
}

function normalizeGeneratedSourceMap(spans: readonly GeneratedSourceSpan[]): GeneratedSourceMap {
	const unique = new Map<string, GeneratedSourceSpan>()
	for (const [index, span] of spans.entries()) {
		assertRange(span.start, span.end, Number.MAX_SAFE_INTEGER, `spans[${index}]`)
		assertNonNegativeInteger(span.nestingDepth, `spans[${index}].nestingDepth`)
		const key = [
			span.kind,
			span.start,
			span.end,
			span.nestingDepth,
			span.nodeId ?? '',
			span.templateId,
			span.kind === 'input' ? span.inputName : ''
		].join('\u0000')
		if (!unique.has(key)) unique.set(key, span)
	}
	return {
		version: GENERATED_SOURCE_MAP_VERSION,
		spans: [...unique.values()].sort(comparePersistedSpans)
	}
}

function sourceMapFormattingWrapper(
	code: string,
	mode: Exclude<TemplateMode, { kind: 'file' }>
): { code: string; sourceStart: number } {
	let prefix: string
	let suffix: string
	switch (mode.kind) {
		case 'expression':
			prefix = `const __partial = (${FORMAT_START_MARKER}`
			suffix = `${FORMAT_END_MARKER});`
			break
		case 'expressionSuffix':
			prefix = `const __partial = __partialReceiver${FORMAT_START_MARKER}`
			suffix = `${FORMAT_END_MARKER};`
			break
		case 'statementList':
			prefix = `function __partial() {\n${FORMAT_START_MARKER}\n`
			suffix = `\n${FORMAT_END_MARKER}\n}`
			break
		case 'objectPropertyList':
			prefix = `const __partial = {\n${FORMAT_START_MARKER}\n`
			suffix = `\n${FORMAT_END_MARKER}\n};`
			break
	}
	return { code: `${prefix}${code}${suffix}`, sourceStart: prefix.length }
}

function comparePersistedSpans(left: GeneratedSourceSpan, right: GeneratedSourceSpan): number {
	return left.start - right.start
		|| right.end - left.end
		|| left.nestingDepth - right.nestingDepth
		|| left.kind.localeCompare(right.kind)
		|| (left.nodeId ?? '').localeCompare(right.nodeId ?? '')
		|| left.templateId.localeCompare(right.templateId)
		|| (left.kind === 'input' ? left.inputName : '').localeCompare(right.kind === 'input' ? right.inputName : '')
}

function compareDeepestFirst(left: GeneratedSourceSpan, right: GeneratedSourceSpan): number {
	return right.nestingDepth - left.nestingDepth
		|| Number(right.kind === 'input') - Number(left.kind === 'input')
		|| (left.end - left.start) - (right.end - right.start)
		|| right.start - left.start
		|| left.templateId.localeCompare(right.templateId)
		|| (left.nodeId ?? '').localeCompare(right.nodeId ?? '')
		|| (left.kind === 'input' ? left.inputName : '').localeCompare(right.kind === 'input' ? right.inputName : '')
}

function normalizeTextEdits<T extends Pick<SourceMappedTextEdit, 'start' | 'end' | 'text'>>(
	edits: readonly T[],
	codeLength?: number
): T[] {
	const sorted = [...edits].sort((left, right) => left.start - right.start || left.end - right.end)
	let previous: T | undefined
	for (const [index, edit] of sorted.entries()) {
		const maximum = codeLength ?? Number.MAX_SAFE_INTEGER
		assertRange(edit.start, edit.end, maximum, `edits[${index}]`)
		if (previous && (edit.start < previous.end
			|| (edit.start === previous.start && edit.end === previous.end))) {
			throw new RangeError('Source-mapped text edits must not overlap or share an identical range.')
		}
		previous = edit
	}
	return sorted
}

function assertSourceMapWithinCode(sourceMap: GeneratedSourceMap, codeLength: number, label: string): void {
	if (sourceMap.version !== GENERATED_SOURCE_MAP_VERSION) {
		throw new RangeError(`${label}.version must be ${GENERATED_SOURCE_MAP_VERSION}.`)
	}
	for (const [index, span] of sourceMap.spans.entries()) {
		assertRange(span.start, span.end, codeLength, `${label}.spans[${index}]`)
		assertNonNegativeInteger(span.nestingDepth, `${label}.spans[${index}].nestingDepth`)
	}
}

function assertRange(start: number, end: number, maximum: number, label: string): void {
	assertNonNegativeInteger(start, `${label}.start`)
	assertNonNegativeInteger(end, `${label}.end`)
	if (end < start || end > maximum) throw new RangeError(`${label} must be within the source text.`)
}

function assertNonNegativeInteger(value: number, label: string): void {
	if (!Number.isInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative integer.`)
}

function assertInteger(value: number, label: string): void {
	if (!Number.isInteger(value)) throw new RangeError(`${label} must be an integer.`)
}

function scanSignificantTokens(code: string): SignificantToken[] {
	const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, code)
	const tokens: SignificantToken[] = []
	for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
		const start = scanner.getTokenPos()
		const end = scanner.getTextPos()
		tokens.push({ kind, start, end, text: code.slice(start, end) })
	}
	return tokens
}

function alignSignificantTokens(from: readonly SignificantToken[], to: readonly SignificantToken[]): TokenPair[] {
	if (from.length === to.length && from.every((token, index) => token.kind === to[index]?.kind)) {
		return from.map((token, index) => ({ from: token, to: to[index]! }))
	}

	const positions = new Map<string, number[]>()
	for (const [index, token] of to.entries()) {
		const key = tokenKey(token)
		const indices = positions.get(key)
		if (indices) indices.push(index)
		else positions.set(key, [index])
	}

	const pairs: TokenPair[] = []
	let minimumIndex = 0
	for (const token of from) {
		const candidates = positions.get(tokenKey(token))
		if (!candidates) continue
		const targetIndex = firstAtLeast(candidates, minimumIndex)
		if (targetIndex === undefined) continue
		pairs.push({ from: token, to: to[targetIndex]! })
		minimumIndex = targetIndex + 1
	}
	return pairs
}

function tokenKey(token: SignificantToken): string {
	return `${token.kind}\u0000${token.text}`
}

function firstAtLeast(values: readonly number[], minimum: number): number | undefined {
	let low = 0
	let high = values.length
	while (low < high) {
		const middle = (low + high) >>> 1
		if (values[middle]! < minimum) low = middle + 1
		else high = middle
	}
	return values[low]
}

function remapOffset(
	offset: number,
	fromLength: number,
	toLength: number,
	pairs: readonly TokenPair[],
	bias: PositionBias
): number {
	if (offset <= 0) return 0
	if (offset >= fromLength) return toLength

	for (const pair of pairs) {
		if (offset >= pair.from.start && offset <= pair.from.end) {
			return interpolateOffset(
				offset,
				pair.from.start,
				pair.from.end,
				pair.to.start,
				pair.to.end,
				bias
			)
		}
	}

	let previousFrom = 0
	let previousTo = 0
	let nextFrom = fromLength
	let nextTo = toLength
	for (const pair of pairs) {
		if (pair.from.end <= offset) {
			previousFrom = pair.from.end
			previousTo = pair.to.end
			continue
		}
		if (pair.from.start >= offset) {
			nextFrom = pair.from.start
			nextTo = pair.to.start
			break
		}
	}
	return interpolateOffset(offset, previousFrom, nextFrom, previousTo, nextTo, bias)
}

function interpolateOffset(
	offset: number,
	fromStart: number,
	fromEnd: number,
	toStart: number,
	toEnd: number,
	bias: PositionBias
): number {
	if (fromEnd <= fromStart) return bias === 'left' ? toStart : toEnd
	const ratio = (offset - fromStart) / (fromEnd - fromStart)
	const raw = toStart + ratio * (toEnd - toStart)
	const rounded = bias === 'left' ? Math.floor(raw) : Math.ceil(raw)
	return Math.max(Math.min(rounded, Math.max(toStart, toEnd)), Math.min(toStart, toEnd))
}
