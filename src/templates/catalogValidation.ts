import { SynthesizeRegionsError } from '../core/errors.js'
import { TYPED_SYNTAX_REGION_KIND_VALUES } from './graphTypes.js'
import type {
	FragmentCollectionInputPort,
	FragmentInputPort,
	GraphTemplateDefinition,
	InputPort,
	RawCodeInputPort,
	RegionKind,
	SynthesisDiagnostic,
	TemplateTypeParameterDefinition,
	TypeDescriptor
} from './graphTypes.js'
import {
	compareJsonSchemas,
	validateSupportedJsonSchema,
	type SupportedJsonSchemaIssue
} from './schemaCompatibility.js'
import {
	compareTypeScriptTypes,
	validateTypeScriptType,
	type TypeScriptTypeIssue
} from './typeScriptCompatibility.js'
import { instantiateTemplateContracts } from './genericTypes.js'
import { compareCodeUnits } from './deterministic.js'
import { synthesisDiagnosticOriginForCode } from './diagnosticCatalog.js'
import { validateCallableScope } from './callableScope.js'

/** Template definition shape accepted by catalog validation. */
export type CatalogTemplate = GraphTemplateDefinition<any, string, any, any>

/** Error thrown when one or more template catalog contracts are invalid. */
export class TemplateCatalogValidationError extends SynthesizeRegionsError {
	readonly classification = 'templatePolicyFailure' as const
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
	invalidOutputModelIds: Set<string>
	invalidAcceptsPaths: Set<string>
}

function diagnostic(
	code: string,
	message: string,
	template: CatalogTemplate,
	path: string,
	details: Pick<SynthesisDiagnostic, 'inputName' | 'expected' | 'actual'> = {}
): SynthesisDiagnostic {
	return {
		origin: synthesisDiagnosticOriginForCode(code),
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

function typeIssueDiagnostic(
	issue: TypeScriptTypeIssue,
	template: CatalogTemplate,
	inputName: string | undefined,
	actual: string
): SynthesisDiagnostic {
	return {
		...diagnostic(issue.code, issue.message, template, issue.path, {
			...(inputName === undefined ? {} : { inputName }),
			actual
		}),
		...(issue.compilerCode === undefined ? {} : { compilerCode: issue.compilerCode }),
		...(issue.compilerCategory === undefined ? {} : { compilerCategory: issue.compilerCategory }),
		...(issue.line === undefined ? {} : { line: issue.line }),
		...(issue.column === undefined ? {} : { column: issue.column })
	}
}

function schemaIssueCode(issue: SupportedJsonSchemaIssue): string {
	switch (issue.code) {
		case 'UnsupportedJsonSchemaKeyword': return 'UnsupportedSchemaKeyword'
		case 'UnresolvedJsonSchemaReference': return 'UnresolvedLocalSchemaReference'
		case 'UnsupportedJsonSchemaReference':
		case 'InvalidJsonSchema': return 'InvalidJsonSchema'
	}
}

function validateSchema(
	schema: unknown,
	template: CatalogTemplate,
	inputName: string | undefined,
	path: string,
	context: ValidationContext
): boolean {
	if (schema === undefined) return true

	const result = validateSupportedJsonSchema(schema, path)
	if (result.ok) return true

	for (const issue of result.issues) {
		context.diagnostics.push(diagnostic(
			schemaIssueCode(issue),
			issue.message,
			template,
			issue.path,
			{
				...(inputName === undefined ? {} : { inputName }),
				actual: issue.actual ?? schema
			}
		))
	}
	return false
}

function validateTypeDescriptor(
	descriptor: TypeDescriptor | undefined,
	template: CatalogTemplate,
	inputName: string | undefined,
	path: string,
	context: ValidationContext
): boolean {
	if (descriptor === undefined) return true

	let valid = validateSchema(descriptor.schema, template, inputName, `${path}.schema`, context)
	if (descriptor.nominal !== undefined &&
		(typeof descriptor.nominal !== 'string' || descriptor.nominal.trim().length === 0)) {
		context.diagnostics.push(diagnostic(
			'InvalidNominalType',
			'TypeDescriptor.nominal must be a non-empty string.',
			template,
			`${path}.nominal`,
			{ ...(inputName === undefined ? {} : { inputName }), actual: descriptor.nominal }
		))
		valid = false
	}
	if (descriptor.ts === undefined) return valid

	const result = validateTypeScriptType(descriptor.ts, `${path}.ts`)
	if (result.ok) return valid

	for (const issue of result.issues) {
		context.diagnostics.push(typeIssueDiagnostic(issue, template, inputName, descriptor.ts))
	}
	valid = false
	return valid
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

	const patterns = [...new Set(policy.forbiddenPatterns ?? [])].sort(compareCodeUnits)
	for (const [patternIndex, pattern] of patterns.entries()) {
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
			continue
		}

		if (context.invalidAcceptsPaths.has(path)
			|| context.invalidOutputModelIds.has(sourceModelId)) continue

		const expectedType = port.accepts.type
		const actualType = candidates[0]!.template.output.type
		const typeCompatibility = compareTypeScriptTypes(expectedType?.ts, actualType?.ts)
		if (typeCompatibility.status === 'incompatible') {
			context.diagnostics.push(diagnostic(
				'IncompatibleSourceType',
				`Template ${sourceModelId} does not produce a TypeScript type assignable to the fragment port contract.`,
				template,
				sourcePath,
				{
					inputName,
					expected: typeCompatibility.expected,
					actual: typeCompatibility.actual
				}
			))
		}

		const expectedSchema = expectedType?.schema
		if (expectedSchema === undefined) continue

		const sourceOutput = candidates[0]!.template.output
		const actualSchema = sourceOutput.type?.schema ?? sourceOutput.schema
		if (actualSchema === undefined) {
			context.diagnostics.push(diagnostic(
				'IncompatibleSourceSchema',
				`Template ${sourceModelId} does not declare the JSON Schema required by the fragment port contract.`,
				template,
				sourcePath,
				{ inputName, expected: expectedSchema, actual: undefined }
			))
			continue
		}

		const schemaCompatibility = compareJsonSchemas(actualSchema, expectedSchema)
		if (schemaCompatibility.compatibility === 'incompatible') {
			context.diagnostics.push(diagnostic(
				'IncompatibleSourceSchema',
				`Template ${sourceModelId} produces values outside the fragment port's JSON Schema contract.`,
				template,
				sourcePath,
				{ inputName, expected: expectedSchema, actual: actualSchema }
			))
		} else if (schemaCompatibility.compatibility === 'indeterminate') {
			context.diagnostics.push(diagnostic(
				'SchemaCompatibilityIndeterminate',
				`Compatibility between template ${sourceModelId} and the fragment port's JSON Schema cannot be proven.`,
				template,
				sourcePath,
				{ inputName, expected: expectedSchema, actual: actualSchema }
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
		case 'fragment': {
			const outputKind = port.accepts.outputKind ?? port.regionKind
			if ((port.regionKind === 'sourceFile' || outputKind === 'sourceFile')
				&& port.regionKind !== outputKind) {
				context.diagnostics.push(diagnostic(
					'IncompatibleFragmentKind',
					'sourceFile fragment ports must consume sourceFile outputs without cross-context reinterpretation.',
					template,
					`${path}.accepts.outputKind`,
					{ inputName, expected: port.regionKind, actual: outputKind }
				))
			}
			if (port.regionKind === 'sourceFile' && port.accepts.type !== undefined) {
				context.diagnostics.push(diagnostic(
					'IncompatibleSourceFileMetadata',
					'sourceFile fragment ports cannot declare value-level TypeDescriptor metadata.',
					template,
					`${path}.accepts.type`,
					{ inputName, expected: undefined, actual: port.accepts.type }
				))
				context.invalidAcceptsPaths.add(path)
			}
			if (!validateTypeDescriptor(
				port.accepts.type,
				template,
				inputName,
				`${path}.accepts.type`,
				context
			)) context.invalidAcceptsPaths.add(path)
			break
		}
		case 'fragmentCollection': {
			const outputKind = port.accepts.outputKind ?? port.regionKind
			if (port.regionKind === 'sourceFile' || outputKind === 'sourceFile') {
				context.diagnostics.push(diagnostic(
					'IncompatibleInputKind',
					'sourceFile inputs must use one scalar fragment port; fragment collections are not supported.',
					template,
					`${path}.regionKind`,
					{ inputName, expected: 'scalar fragment', actual: 'fragmentCollection' }
				))
				context.invalidAcceptsPaths.add(path)
			}
			validateCollectionBounds(port, template, inputName, path, context)
			if (!validateTypeDescriptor(
				port.accepts.type,
				template,
				inputName,
				`${path}.accepts.type`,
				context
			)) context.invalidAcceptsPaths.add(path)
			break
		}
		case 'rawCode':
			if (port.regionKind === 'sourceFile') {
				context.diagnostics.push(diagnostic(
					'IncompatibleInputKind',
					'sourceFile inputs must use a scalar fragment port; raw-code ports are not supported.',
					template,
					`${path}.regionKind`,
					{ inputName, expected: 'fragment', actual: 'rawCode' }
				))
			}
			validateRawCodePolicy(port, template, inputName, path, context)
			validateTypeDescriptor(port.type, template, inputName, `${path}.type`, context)
			break
		case 'literal':
			if (TYPED_SYNTAX_REGION_KIND_VALUES.includes(port.regionKind as never)) {
				const sourceFile = port.regionKind === 'sourceFile'
				context.diagnostics.push(diagnostic(
					'IncompatibleInputKind',
					sourceFile
						? 'sourceFile inputs must use a scalar fragment port; literal ports are not supported.'
						: 'Literal ports cannot feed first-class type or declaration syntax regions.',
					template,
					`${path}.regionKind`,
					{
						inputName,
						expected: sourceFile ? 'fragment' : 'rawCode, fragment, fragmentCollection, or union',
						actual: port.regionKind
					}
				))
			}
			validateSchema(port.schema, template, inputName, `${path}.schema`, context)
			break
	}
}

function validatePortSourceAllowlists(
	port: InputPort,
	template: CatalogTemplate,
	inputName: string,
	path: string,
	context: ValidationContext
): void {
	if (port.kind === 'union') {
		for (const [optionIndex, option] of port.options.entries()) {
			validatePortSourceAllowlists(
				option,
				template,
				inputName,
				`${path}.options[${optionIndex}]`,
				context
			)
		}
		return
	}

	if (port.kind === 'fragment' || port.kind === 'fragmentCollection') {
		validateSourceAllowlist(port, template, inputName, path, context)
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
	const context: ValidationContext = {
		diagnostics,
		byModelId,
		knownModelIds,
		duplicateModelIds,
		invalidOutputModelIds: new Set(),
		invalidAcceptsPaths: new Set()
	}

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
		for (const issue of validateCallableScope(template.callableScope, template.inputs)) {
			context.diagnostics.push(diagnostic(
				issue.code,
				issue.message,
				template,
				`templates[${templateIndex}].${issue.path}`,
				{ expected: issue.expected, actual: issue.actual }
			))
		}
		const templateTypeParameters = (template.typeParameters ?? {}) as Record<string, TemplateTypeParameterDefinition>
		const validationArguments = Object.fromEntries(
			Object.entries(templateTypeParameters).map(([name, parameter]) => [
				name,
				parameter.constraint ?? { ts: 'unknown' }
			])
		)
		const instantiated = instantiateTemplateContracts(
			template.typeParameters,
			template.inputs,
			template.output,
			validationArguments
		)
		if (!instantiated.contracts) {
			for (const issue of instantiated.issues) {
				context.diagnostics.push(diagnostic(
					issue.code,
					issue.message,
					template,
					`templates[${templateIndex}].${issue.path}`,
					{ expected: issue.expected, actual: issue.actual }
				))
			}
			continue
		}
		const validationInputs = instantiated.contracts.inputs
		const validationOutput = instantiated.contracts.output
		for (const inputName of Object.keys(validationInputs).sort()) {
			validatePort(
				validationInputs[inputName]!,
				template,
				inputName,
				`templates[${templateIndex}].inputs.${inputName}`,
				context
			)
		}

		let outputIsValid = validateTypeDescriptor(
			validationOutput.type,
			template,
			undefined,
			`templates[${templateIndex}].output.type`,
			context
		)
		if (validationOutput.kind === 'sourceFile') {
			if (validationOutput.type !== undefined) {
				context.diagnostics.push(diagnostic(
					'IncompatibleSourceFileMetadata',
					'sourceFile outputs cannot declare value-level TypeDescriptor metadata.',
					template,
					`templates[${templateIndex}].output.type`,
					{ expected: undefined, actual: validationOutput.type }
				))
				outputIsValid = false
			}
			if (template.output.schema !== undefined) {
				context.diagnostics.push(diagnostic(
					'IncompatibleSourceFileMetadata',
					'sourceFile outputs cannot declare value-level JSON Schema metadata.',
					template,
					`templates[${templateIndex}].output.schema`,
					{ expected: undefined, actual: template.output.schema }
				))
				outputIsValid = false
			}
		}
		const aliasIsValid = validateSchema(
			template.output.schema,
			template,
			undefined,
			`templates[${templateIndex}].output.schema`,
			context
		)
		outputIsValid = outputIsValid && aliasIsValid

		const descriptorSchema = template.output.type?.schema
		const aliasSchema = template.output.schema
		if (descriptorSchema !== undefined && aliasSchema !== undefined
			&& outputIsValid) {
			const descriptorToAlias = compareJsonSchemas(descriptorSchema, aliasSchema)
			const aliasToDescriptor = compareJsonSchemas(aliasSchema, descriptorSchema)
			if (descriptorToAlias.compatibility !== 'compatible'
				|| aliasToDescriptor.compatibility !== 'compatible') {
				context.diagnostics.push(diagnostic(
					'ConflictingSchemaMetadata',
					'Output type.schema and the deprecated output.schema alias must describe equivalent value sets.',
					template,
					`templates[${templateIndex}].output.schema`,
					{ expected: descriptorSchema, actual: aliasSchema }
				))
				outputIsValid = false
			}
		}

		if (!outputIsValid) context.invalidOutputModelIds.add(template.modelId)
	}

	for (const [templateIndex, template] of templates.entries()) {
		for (const inputName of Object.keys(template.inputs).sort()) {
			validatePortSourceAllowlists(
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
