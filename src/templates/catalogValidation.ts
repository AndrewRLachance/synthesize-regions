import { SynthesizeRegionsError } from '../core/errors.js'
import type {
	FragmentCollectionInputPort,
	FragmentInputPort,
	GraphTemplateDefinition,
	InputPort,
	RawCodeInputPort,
	RegionKind,
	SynthesisDiagnostic
} from './graphTypes.js'

/** Template definition shape accepted by catalog validation. */
export type CatalogTemplate = GraphTemplateDefinition<any, string, any>

/** Error thrown when one or more template catalog contracts are invalid. */
export class TemplateCatalogValidationError extends SynthesizeRegionsError {
	readonly diagnostics: readonly SynthesisDiagnostic[]

	constructor(diagnostics: readonly SynthesisDiagnostic[]) {
		super(`Template catalog validation failed with ${diagnostics.length} diagnostic${diagnostics.length === 1 ? '' : 's'}.`)
		this.diagnostics = Object.freeze([...diagnostics])
	}
}

interface IndexedTemplate {
	template: CatalogTemplate
	index: number
}

interface ValidationContext {
	diagnostics: SynthesisDiagnostic[]
	byModelId: Map<string, IndexedTemplate[]>
	knownModelIds: string[]
	duplicateModelIds: Set<string>
}

function diagnostic(
	code: string,
	message: string,
	template: CatalogTemplate,
	path: string,
	details: Pick<SynthesisDiagnostic, 'inputName' | 'expected' | 'actual'> = {}
): SynthesisDiagnostic {
	return {
		stage: 'template',
		code,
		severity: 'error',
		message,
		templateId: template.modelId,
		path,
		...details
	}
}

function compareDiagnostics(left: SynthesisDiagnostic, right: SynthesisDiagnostic): number {
	function compareText(leftText: string, rightText: string): number {
		return leftText < rightText ? -1 : leftText > rightText ? 1 : 0
	}

	return compareText(left.path ?? '', right.path ?? '')
		|| compareText(left.code, right.code)
		|| compareText(left.templateId ?? '', right.templateId ?? '')
		|| compareText(left.inputName ?? '', right.inputName ?? '')
		|| compareText(left.message, right.message)
}

function concreteRegionKinds(port: InputPort): RegionKind[] {
	if (port.kind !== 'union') return [port.regionKind]
	return port.options.flatMap(concreteRegionKinds)
}

function validateCollectionBounds(
	port: FragmentCollectionInputPort,
	template: CatalogTemplate,
	inputName: string,
	path: string,
	context: ValidationContext
): void {
	const minIsValid = port.minItems === undefined
		|| (Number.isInteger(port.minItems) && port.minItems >= 0)
	const maxIsValid = port.maxItems === undefined
		|| (Number.isInteger(port.maxItems) && port.maxItems >= 0)

	if (!minIsValid) {
		context.diagnostics.push(diagnostic(
			'InvalidCollectionMinimum',
			'Collection minItems must be a non-negative integer.',
			template,
			`${path}.minItems`,
			{ inputName, expected: 'non-negative integer', actual: port.minItems }
		))
	}

	if (!maxIsValid) {
		context.diagnostics.push(diagnostic(
			'InvalidCollectionMaximum',
			'Collection maxItems must be a non-negative integer.',
			template,
			`${path}.maxItems`,
			{ inputName, expected: 'non-negative integer', actual: port.maxItems }
		))
	}

	const minItems = port.minItems ?? 0
	if (minIsValid && maxIsValid && port.maxItems !== undefined && port.maxItems < minItems) {
		context.diagnostics.push(diagnostic(
			'InvalidCollectionBounds',
			'Collection maxItems must be greater than or equal to minItems.',
			template,
			path,
			{
				inputName,
				expected: { maxItemsAtLeast: minItems },
				actual: { minItems, maxItems: port.maxItems }
			}
		))
	}
}

function validateRawCodePolicy(
	port: RawCodeInputPort,
	template: CatalogTemplate,
	inputName: string,
	path: string,
	context: ValidationContext
): void {
	const policy = port.policy
	if (!policy) return

	if (policy.maxLength !== undefined
		&& (!Number.isInteger(policy.maxLength) || policy.maxLength < 0)) {
		context.diagnostics.push(diagnostic(
			'InvalidRawCodeMaxLength',
			'Raw-code policy maxLength must be a non-negative integer.',
			template,
			`${path}.policy.maxLength`,
			{ inputName, expected: 'non-negative integer', actual: policy.maxLength }
		))
	}

	for (const [patternIndex, pattern] of (policy.forbiddenPatterns ?? []).entries()) {
		try {
			new RegExp(pattern, 'u')
		} catch (error) {
			context.diagnostics.push(diagnostic(
				'InvalidRawCodePattern',
				'Raw-code policy forbiddenPatterns must contain valid Unicode regular expressions.',
				template,
				`${path}.policy.forbiddenPatterns[${patternIndex}]`,
				{
					inputName,
					expected: 'valid regular expression source',
					actual: {
						pattern,
						message: error instanceof Error ? error.message : String(error)
					}
				}
			))
		}
	}
}

function validateSourceAllowlist(
	port: FragmentInputPort | FragmentCollectionInputPort,
	template: CatalogTemplate,
	inputName: string,
	path: string,
	context: ValidationContext
): void {
	const sourceModelIds = port.accepts.sourceModelIds
	if (!sourceModelIds) return

	const expectedOutputKind = port.accepts.outputKind ?? port.regionKind
	for (const [sourceIndex, sourceModelId] of sourceModelIds.entries()) {
		const sourcePath = `${path}.accepts.sourceModelIds[${sourceIndex}]`
		const candidates = context.byModelId.get(sourceModelId)
		if (!candidates) {
			context.diagnostics.push(diagnostic(
				'UnknownSourceModelId',
				`Fragment source allowlist references unknown template ${sourceModelId}.`,
				template,
				sourcePath,
				{ inputName, expected: context.knownModelIds, actual: sourceModelId }
			))
			continue
		}

		// A duplicate ID does not identify one authoritative producer contract.
		if (context.duplicateModelIds.has(sourceModelId)) continue

		const actualOutputKind = candidates[0]!.template.output.kind
		if (actualOutputKind !== expectedOutputKind) {
			context.diagnostics.push(diagnostic(
				'IncompatibleSourceOutputKind',
				`Template ${sourceModelId} produces ${actualOutputKind}, not the required ${expectedOutputKind} output kind.`,
				template,
				sourcePath,
				{ inputName, expected: expectedOutputKind, actual: actualOutputKind }
			))
		}
	}
}

function validatePort(
	port: InputPort,
	template: CatalogTemplate,
	inputName: string,
	path: string,
	context: ValidationContext
): void {
	switch (port.kind) {
		case 'union': {
			if (port.options.length === 0) {
				context.diagnostics.push(diagnostic(
					'EmptyUnionPort',
					'Union input ports must contain at least one option.',
					template,
					`${path}.options`,
					{ inputName, expected: 'at least one option', actual: 0 }
				))
			}

			const regionKinds = [...new Set(concreteRegionKinds(port))].sort()
			if (regionKinds.length > 1) {
				context.diagnostics.push(diagnostic(
					'MixedUnionRegionKinds',
					'Union input port options must use one compatible region kind.',
					template,
					`${path}.options`,
					{ inputName, expected: 'one region kind', actual: regionKinds }
				))
			}

			for (const [optionIndex, option] of port.options.entries()) {
				validatePort(option, template, inputName, `${path}.options[${optionIndex}]`, context)
			}
			break
		}
		case 'fragment':
			validateSourceAllowlist(port, template, inputName, path, context)
			break
		case 'fragmentCollection':
			validateCollectionBounds(port, template, inputName, path, context)
			validateSourceAllowlist(port, template, inputName, path, context)
			break
		case 'rawCode':
			validateRawCodePolicy(port, template, inputName, path, context)
			break
		case 'literal':
			break
	}
}

/**
 * Validate all contracts in a template catalog without throwing.
 *
 * Validation is catalog-wide, so self references and forward references are
 * resolved before any fragment source allowlist is checked.
 */
export function validateTemplateCatalog(
	templates: readonly CatalogTemplate[]
): SynthesisDiagnostic[] {
	const byModelId = new Map<string, IndexedTemplate[]>()
	for (const [index, template] of templates.entries()) {
		const candidates = byModelId.get(template.modelId) ?? []
		candidates.push({ template, index })
		byModelId.set(template.modelId, candidates)
	}

	const diagnostics: SynthesisDiagnostic[] = []
	const duplicateModelIds = new Set(
		[...byModelId.entries()]
			.filter(([, candidates]) => candidates.length > 1)
			.map(([modelId]) => modelId)
	)
	const knownModelIds = [...byModelId.keys()].sort()
	const context: ValidationContext = { diagnostics, byModelId, knownModelIds, duplicateModelIds }

	for (const modelId of [...duplicateModelIds].sort()) {
		const candidates = byModelId.get(modelId)!
		for (const candidate of candidates.slice(1)) {
			diagnostics.push(diagnostic(
				'DuplicateTemplateId',
				`Template model ID ${modelId} is already defined in this catalog.`,
				candidate.template,
				`templates[${candidate.index}].modelId`,
				{
					expected: 'unique modelId',
					actual: modelId
				}
			))
		}
	}

	for (const [templateIndex, template] of templates.entries()) {
		for (const inputName of Object.keys(template.inputs).sort()) {
			validatePort(
				template.inputs[inputName]!,
				template,
				inputName,
				`templates[${templateIndex}].inputs.${inputName}`,
				context
			)
		}
	}

	return diagnostics.sort(compareDiagnostics)
}

/** Validate a catalog and throw one aggregate error if any contract is invalid. */
export function assertTemplateCatalogValid(
	templates: readonly CatalogTemplate[]
): void {
	const diagnostics = validateTemplateCatalog(templates)
	if (diagnostics.length > 0) throw new TemplateCatalogValidationError(diagnostics)
}
