import type { TemplateMode } from '../core/types.js'
import type { PlannedReplacementEdit } from '../replacements/serialize.js'
import type { RegionKind } from './graphTypes.js'

/** Default separator for an ordered fragment collection in one exact syntax context. */
export function defaultFragmentCollectionSeparator(kind: RegionKind): string {
	switch (kind) {
		case 'objectProperty':
		case 'enumMember': return ',\n'
		case 'type':
		case 'typeParameter':
		case 'parameter':
		case 'constructorParameter':
		case 'heritageType':
		case 'importSpecifier':
		case 'exportSpecifier': return ', '
		default: return '\n'
	}
}

/** Select the parser wrapper used to validate a generated region fragment. */
export function templateModeForRegionKind(kind: RegionKind): TemplateMode {
	switch (kind) {
		case 'expressionSuffix': return { kind: 'expressionSuffix' }
		case 'statement': return { kind: 'statementList' }
		case 'objectProperty': return { kind: 'objectPropertyList' }
		case 'type': return { kind: 'type' }
		case 'typeMember': return { kind: 'typeMemberList' }
		case 'typeParameter': return { kind: 'typeParameterList' }
		case 'parameter': return { kind: 'parameterList' }
		case 'constructorParameter': return { kind: 'constructorParameterList' }
		case 'heritageType': return { kind: 'heritageTypeList' }
		case 'declaration': return { kind: 'declarationList' }
		case 'classMember': return { kind: 'classMemberList' }
		case 'enumMember': return { kind: 'enumMemberList' }
		case 'importSpecifier': return { kind: 'importSpecifierList' }
		case 'exportSpecifier': return { kind: 'exportSpecifierList' }
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
