import type { TemplateMode } from '../core/types.js'
import type { PlannedReplacementEdit } from '../replacements/serialize.js'
import type { RegionKind } from './graphTypes.js'

/** Select the parser wrapper used to validate a generated region fragment. */
export function templateModeForRegionKind(kind: RegionKind): TemplateMode {
	switch (kind) {
		case 'expressionSuffix': return { kind: 'expressionSuffix' }
		case 'statement': return { kind: 'statementList' }
		case 'objectProperty': return { kind: 'objectPropertyList' }
		default: return { kind: 'expression' }
	}
}

/** Apply already validated edits from right to left without shifting offsets. */
export function applyReplacementEdits(sourceText: string, edits: PlannedReplacementEdit[]): string {
	let output = sourceText
	for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
		output = `${output.slice(0, edit.start)}${edit.text}${output.slice(edit.end)}`
	}
	return output
}
