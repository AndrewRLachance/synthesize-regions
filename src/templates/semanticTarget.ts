import { readFileSync } from 'node:fs'
import { ts } from 'ts-morph'
import type { GenerateOptions } from '../core/types.js'
import {
	createProject,
	createSourceFile,
	structuredSemanticDiagnostics,
	type StructuredTypeScriptDiagnostic
} from '../validation/ast.js'
import type { RegionKind, SemanticTargetFileContext, TypeDescriptor } from './graphTypes.js'

/** Final artifact information needed for virtual target-file validation. */
export interface VirtualSemanticArtifact {
	/** Generated source inserted into the virtual target. */
	code: string
	/** Syntactic fragment kind used to select contextual type enforcement. */
	kind: RegionKind
	/** Advertised output metadata; only the TypeScript expression is used here. */
	type?: Pick<TypeDescriptor, 'ts'>
}

/** Validate an artifact as though it replaced a range in a real TypeScript file. */
export interface VirtualSemanticTargetOptions extends Pick<GenerateOptions, 'tsConfigFilePath'> {
	/** Real or caller-supplied file and replacement range. */
	targetFile: SemanticTargetFileContext
	/** Declarations or imports added to the virtual file before validation. */
	prelude?: string
	/** Complete generated artifact to insert. */
	artifact: VirtualSemanticArtifact
}

/** A compiler diagnostic enriched with a location in generated artifact code. */
export interface VirtualSemanticTargetDiagnostic extends StructuredTypeScriptDiagnostic {
	/** Zero-based UTF-16 offset in the artifact when the diagnostic overlaps it. */
	artifactOffset?: number
	/** One-based line in artifact code when the diagnostic overlaps it. */
	line?: number
	/** One-based column in artifact code when the diagnostic overlaps it. */
	column?: number
}

/** Result of semantic validation in a non-persisted target-file projection. */
export interface VirtualSemanticTargetResult {
	filePath: string
	diagnostics: VirtualSemanticTargetDiagnostic[]
}

interface CandidateSource {
	text: string
	artifactStart: number
	artifactEnd: number
	toBaselineOffset(offset: number): number | undefined
}

const DIRECTLY_ANNOTATABLE_EXPRESSION_KINDS = new Set<RegionKind>([
	'identifier',
	'expression',
	'array',
	'object',
	'string',
	'number',
	'boolean',
	'null'
])

const TYPE_ASSERTION_HELPER = 'type __SynthesizeRegionsAssertAssignable<Expected, Actual extends Expected> = Actual;'

/**
 * Collect only semantic issues introduced by virtually inserting an artifact.
 *
 * The target file is never saved. Diagnostics already present in the target
 * (with the same prelude) are subtracted after their offsets are translated
 * across the virtual edit.
 */
export function validateVirtualSemanticTarget(
	options: VirtualSemanticTargetOptions
): VirtualSemanticTargetResult {
	const { targetFile } = options
	const targetText = targetFile.sourceText ?? readFileSync(targetFile.filePath, 'utf8')
	const targetEnd = targetFile.end ?? targetFile.start
	validateTargetRange(targetText, targetFile.start, targetEnd)

	const advertisedType = options.artifact.type?.ts?.trim()
	const internalPrelude = options.artifact.kind === 'type' && advertisedType
		? `${TYPE_ASSERTION_HELPER}\n${options.prelude ?? ''}`
		: options.prelude
	const baseline = addPrelude(targetText, internalPrelude)
	if (baseline.insertedLength > 0 && targetFile.start < baseline.anchor && targetEnd > baseline.anchor) {
		throw new RangeError('The semantic target range cannot cross the prelude insertion point.')
	}
	const start = mapTargetOffset(targetFile.start, baseline.anchor, baseline.insertedLength)
	const end = mapTargetOffset(targetEnd, baseline.anchor, baseline.insertedLength)
	const candidate = buildCandidateSource(baseline.text, start, end, options)

	const baselineDiagnostics = collectSemanticDiagnostics(baseline.text, options)
	const candidateDiagnostics = collectSemanticDiagnostics(candidate.text, options)
	const remainingBaseline = diagnosticMultiset(baselineDiagnostics, diagnostic => diagnostic.start)
	const diagnostics: VirtualSemanticTargetDiagnostic[] = []

	for (const diagnostic of candidateDiagnostics) {
		const artifactOffset = overlappingArtifactOffset(
			diagnostic,
			candidate.artifactStart,
			candidate.artifactEnd,
			options.artifact.code.length
		)
		if (artifactOffset === undefined) {
			const baselineOffset = diagnostic.start === undefined
				? undefined
				: candidate.toBaselineOffset(diagnostic.start)
			const key = diagnosticKey(diagnostic, baselineOffset)
			const count = remainingBaseline.get(key) ?? 0
			if (count > 0) {
				if (count === 1) remainingBaseline.delete(key)
				else remainingBaseline.set(key, count - 1)
				continue
			}
		}

		const artifactLocation = artifactOffset === undefined
			? undefined
			: artifactLineAndColumn(options.artifact.code, artifactOffset)
		diagnostics.push({
			...diagnostic,
			...(artifactOffset === undefined ? {} : { artifactOffset }),
			...(artifactLocation ?? {})
		})
	}

	return { filePath: targetFile.filePath, diagnostics }
}

function collectSemanticDiagnostics(
	sourceText: string,
	options: Pick<VirtualSemanticTargetOptions, 'targetFile' | 'tsConfigFilePath'>
): StructuredTypeScriptDiagnostic[] {
	const project = createProject(options.tsConfigFilePath === undefined
		? {}
		: { tsConfigFilePath: options.tsConfigFilePath })
	const sourceFile = createSourceFile(project, sourceText, options.targetFile.filePath)
	return structuredSemanticDiagnostics(sourceFile)
}

function validateTargetRange(sourceText: string, start: number, end: number): void {
	if (!Number.isInteger(start) || !Number.isInteger(end)) {
		throw new RangeError('Semantic target offsets must be integers.')
	}
	if (start < 0 || end < start || end > sourceText.length) {
		throw new RangeError(`Invalid semantic target range [${start}, ${end}) for source length ${sourceText.length}.`)
	}
}

function addPrelude(sourceText: string, prelude: string | undefined): {
	text: string
	anchor: number
	insertedLength: number
} {
	const anchor = sourcePrologueEnd(sourceText)
	if (!prelude) return { text: sourceText, anchor, insertedLength: 0 }
	const inserted = prelude.endsWith('\n') ? prelude : `${prelude}\n`
	return {
		text: `${sourceText.slice(0, anchor)}${inserted}${sourceText.slice(anchor)}`,
		anchor,
		insertedLength: inserted.length
	}
}

/** Keep a BOM, shebang, and leading triple-slash directives ahead of a prelude. */
export function sourcePrologueEnd(sourceText: string): number {
	let offset = sourceText.charCodeAt(0) === 0xfeff ? 1 : 0
	if (sourceText.startsWith('#!', offset)) {
		const newline = sourceText.indexOf('\n', offset)
		offset = newline < 0 ? sourceText.length : newline + 1
	}

	while (offset < sourceText.length) {
		const newline = sourceText.indexOf('\n', offset)
		const lineEnd = newline < 0 ? sourceText.length : newline + 1
		const line = sourceText.slice(offset, newline < 0 ? sourceText.length : newline)
		if (!/^\s*\/\/\/\s*</u.test(line)) break
		offset = lineEnd
	}
	return offset
}

function mapTargetOffset(offset: number, preludeAnchor: number, preludeLength: number): number {
	return offset >= preludeAnchor ? offset + preludeLength : offset
}

function buildCandidateSource(
	baselineText: string,
	start: number,
	end: number,
	options: VirtualSemanticTargetOptions
): CandidateSource {
	const advertisedType = options.artifact.type?.ts?.trim()
	const directlyAnnotated = advertisedType !== undefined && advertisedType.length > 0 &&
		DIRECTLY_ANNOTATABLE_EXPRESSION_KINDS.has(options.artifact.kind)
	const typeAnnotated = options.artifact.kind === 'type' && advertisedType !== undefined && advertisedType.length > 0
	const prefix = directlyAnnotated
		? '('
		: typeAnnotated ? `__SynthesizeRegionsAssertAssignable<${advertisedType}, ` : ''
	const suffix = directlyAnnotated
		? ` satisfies ${advertisedType})`
		: typeAnnotated ? '>' : ''
	const replacement = `${prefix}${options.artifact.code}${suffix}`
	const initialText = `${baselineText.slice(0, start)}${replacement}${baselineText.slice(end)}`
	const initialArtifactStart = start + prefix.length
	const initialArtifactEnd = initialArtifactStart + options.artifact.code.length
	const replacementEnd = start + replacement.length
	const removedLength = end - start
	const toBaselineAfterReplacement = (offset: number): number | undefined => {
		if (offset < start) return offset
		if (offset >= replacementEnd) return offset - replacement.length + removedLength
		return undefined
	}

	if (options.artifact.kind !== 'expressionSuffix' || !advertisedType) {
		return {
			text: initialText,
			artifactStart: initialArtifactStart,
			artifactEnd: initialArtifactEnd,
			toBaselineOffset: toBaselineAfterReplacement
		}
	}

	const expression = findSuffixReceiverExpression(
		initialText,
		options.targetFile.filePath,
		initialArtifactStart,
		initialArtifactEnd,
		options.tsConfigFilePath
	)
	if (!expression) {
		throw new Error('Cannot locate an expression receiving the generated expression suffix at the target range.')
	}

	const typeSuffix = ` satisfies ${advertisedType})`
	const text = `${initialText.slice(0, expression.start)}(${initialText.slice(expression.start, expression.end)}${typeSuffix}${initialText.slice(expression.end)}`
	const artifactStart = initialArtifactStart + 1
	const artifactEnd = initialArtifactEnd + 1
	const expressionContentEnd = expression.end + 1
	const expressionWrapperEnd = expressionContentEnd + typeSuffix.length
	const toInitialOffset = (offset: number): number | undefined => {
		if (offset < expression.start) return offset
		if (offset === expression.start) return undefined
		if (offset < expressionContentEnd) return offset - 1
		if (offset < expressionWrapperEnd) return undefined
		return offset - 1 - typeSuffix.length
	}

	return {
		text,
		artifactStart,
		artifactEnd,
		toBaselineOffset(offset) {
			const initialOffset = toInitialOffset(offset)
			return initialOffset === undefined ? undefined : toBaselineAfterReplacement(initialOffset)
		}
	}
}

function findSuffixReceiverExpression(
	sourceText: string,
	filePath: string,
	artifactStart: number,
	artifactEnd: number,
	tsConfigFilePath: string | undefined
): { start: number; end: number } | undefined {
	const project = createProject(tsConfigFilePath === undefined ? {} : { tsConfigFilePath })
	const sourceFile = createSourceFile(project, sourceText, filePath)
	let best: { start: number; end: number } | undefined
	sourceFile.forEachDescendant(node => {
		if (!ts.isExpression(node.compilerNode)) return undefined
		const start = node.getStart(false)
		const end = node.getEnd()
		if (start >= artifactStart || end < artifactEnd) return undefined
		if (!best || end - start < best.end - best.start) best = { start, end }
		return undefined
	})
	return best
}

function diagnosticMultiset(
	diagnostics: readonly StructuredTypeScriptDiagnostic[],
	offset: (diagnostic: StructuredTypeScriptDiagnostic) => number | undefined
): Map<string, number> {
	const counts = new Map<string, number>()
	for (const diagnostic of diagnostics) {
		const key = diagnosticKey(diagnostic, offset(diagnostic))
		counts.set(key, (counts.get(key) ?? 0) + 1)
	}
	return counts
}

function diagnosticKey(diagnostic: StructuredTypeScriptDiagnostic, offset: number | undefined): string {
	return JSON.stringify([
		diagnostic.code,
		diagnostic.category,
		diagnostic.message,
		offset ?? null,
		diagnostic.length ?? null
	])
}

function overlappingArtifactOffset(
	diagnostic: StructuredTypeScriptDiagnostic,
	artifactStart: number,
	artifactEnd: number,
	artifactLength: number
): number | undefined {
	if (diagnostic.start === undefined || artifactLength === 0) return undefined
	const diagnosticLength = Math.max(diagnostic.length ?? 0, 1)
	const diagnosticEnd = diagnostic.start + diagnosticLength
	if (diagnostic.start >= artifactEnd || diagnosticEnd <= artifactStart) return undefined
	return Math.min(artifactLength, Math.max(0, diagnostic.start - artifactStart))
}

function artifactLineAndColumn(code: string, offset: number): { line: number; column: number } {
	const before = code.slice(0, offset)
	const lines = before.split('\n')
	return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 }
}
