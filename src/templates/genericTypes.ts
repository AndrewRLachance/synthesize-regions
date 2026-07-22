import type {
	InputPort,
	OutputPort,
	TemplateTypeParameterDefinition,
	TypeDescriptor
} from './graphTypes.js'
import { compareTypeDescriptors } from './compatibility.js'

const PLACEHOLDER_PATTERN = /\{\{([^{}]+)\}\}/gu
const TYPE_PARAMETER_NAME_PATTERN = /^[$A-Z_a-z][$\w]*$/u

export interface GenericTypeIssue {
	code: string
	message: string
	path: string
	typeParameterName?: string
	expected?: unknown
	actual?: unknown
}

export interface InstantiatedTemplateContracts {
	typeArguments: Record<string, TypeDescriptor>
	inputs: Record<string, InputPort>
	output: OutputPort
}

function descriptorsInPort(port: InputPort): TypeDescriptor[] {
	switch (port.kind) {
		case 'fragment':
		case 'fragmentCollection': return port.accepts.type ? [port.accepts.type] : []
		case 'rawCode': return port.type ? [port.type] : []
		case 'union': return port.options.flatMap(descriptorsInPort)
		case 'literal': return []
	}
}

function placeholders(type: TypeDescriptor | undefined): string[] {
	if (!type?.ts) return []
	return [...type.ts.matchAll(PLACEHOLDER_PATTERN)].map(match => match[1] ?? '')
}

function concreteDescriptorIssues(
	type: TypeDescriptor,
	path: string,
	options: { readonly code?: string; readonly typeParameterName?: string } = {}
): GenericTypeIssue[] {
	const comparison = compareTypeDescriptors(type, undefined)
	if (comparison.status !== 'invalid') return []
	return comparison.issues.map(issue => ({
		code: options.code ?? issue.code,
		message: issue.message,
		path: `${path}${issue.path === 'actual' ? '' : `.${issue.path.replace(/^actual\.?/u, '')}`}`,
		...(options.typeParameterName === undefined ? {} : { typeParameterName: options.typeParameterName }),
		...(issue.expected === undefined ? {} : { expected: issue.expected }),
		...(issue.actual === undefined ? {} : { actual: issue.actual })
	}))
}

function substituteDescriptor(
	type: TypeDescriptor | undefined,
	typeArguments: Readonly<Record<string, TypeDescriptor>>,
	path: string
): { type?: TypeDescriptor; issues: GenericTypeIssue[] } {
	if (!type) return { issues: [] }
	const issues: GenericTypeIssue[] = []
	const isTemplated = placeholders(type).length > 0
	const ts = type.ts?.replace(PLACEHOLDER_PATTERN, (_placeholder, parameterName: string) => {
		const argument = typeArguments[parameterName]
		if (!argument?.ts) {
			issues.push({
				code: 'MissingTypeScriptTypeArgument',
				message: `Type argument ${parameterName} must provide a TypeScript type because ${path} references it.`,
				path,
				typeParameterName: parameterName,
				expected: parameterName,
				actual: argument
			})
			return 'unknown'
		}
		return `(${argument.ts.trim()})`
	})
	const instantiated = { ...type, ...(ts === undefined ? {} : { ts }) }
	if (isTemplated) issues.push(...concreteDescriptorIssues(instantiated, path))
	return { type: instantiated, issues }
}

function instantiatePort(
	port: InputPort,
	typeArguments: Readonly<Record<string, TypeDescriptor>>,
	path: string
): { port: InputPort; issues: GenericTypeIssue[] } {
	switch (port.kind) {
		case 'fragment':
		case 'fragmentCollection': {
			const instantiated = substituteDescriptor(port.accepts.type, typeArguments, `${path}.accepts.type`)
			return {
				port: {
					...port,
					accepts: { ...port.accepts, ...(instantiated.type ? { type: instantiated.type } : {}) }
				},
				issues: instantiated.issues
			}
		}
		case 'rawCode': {
			const instantiated = substituteDescriptor(port.type, typeArguments, `${path}.type`)
			return { port: { ...port, ...(instantiated.type ? { type: instantiated.type } : {}) }, issues: instantiated.issues }
		}
		case 'union': {
			const options = port.options.map((option, index) => instantiatePort(option, typeArguments, `${path}.options[${index}]`))
			return { port: { ...port, options: options.map(option => option.port) }, issues: options.flatMap(option => option.issues) }
		}
		case 'literal': return { port, issues: [] }
	}
}

/** Validate generic declarations and placeholder use in one authored template manifest. */
export function validateTemplateTypeParameters(
	typeParameters: Readonly<Record<string, TemplateTypeParameterDefinition>> | undefined,
	inputs: Readonly<Record<string, InputPort>>,
	output: OutputPort
): GenericTypeIssue[] {
	const declarations = typeParameters ?? {}
	const issues: GenericTypeIssue[] = []
	const used = new Set<string>()
	for (const [name, definition] of Object.entries(declarations)) {
		if (!TYPE_PARAMETER_NAME_PATTERN.test(name)) {
			issues.push({ code: 'InvalidTypeParameterName', message: `Type parameter ${name} is not an identifier.`, path: `typeParameters.${name}`, actual: name })
		}
		if (definition.constraint) {
			if (placeholders(definition.constraint).length > 0) {
				issues.push({ code: 'GenericTypeParameterConstraint', message: 'Type parameter constraints must be concrete.', path: `typeParameters.${name}.constraint` })
			} else {
				issues.push(...concreteDescriptorIssues(definition.constraint, `typeParameters.${name}.constraint`))
			}
		}
	}

	const descriptors = [
		...Object.entries(inputs).flatMap(([inputName, port]) =>
			descriptorsInPort(port).map((type, index) => ({ type, path: `inputs.${inputName}.type[${index}]` }))
		),
		...(output.type ? [{ type: output.type, path: 'output.type' }] : [])
	]
	for (const { type, path } of descriptors) {
		const referencedParameters = placeholders(type)
		for (const name of referencedParameters) {
			used.add(name)
			if (!Object.prototype.hasOwnProperty.call(declarations, name)) {
				issues.push({ code: 'UndeclaredTypeParameter', message: `Type descriptor references undeclared type parameter ${name}.`, path: `${path}.ts`, actual: name })
			}
		}
		if (referencedParameters.length > 0) {
			const sentinelArguments = Object.fromEntries(Object.keys(declarations).map(name => [name, { ts: 'unknown' }]))
			issues.push(...substituteDescriptor(type, sentinelArguments, path).issues.filter(issue => issue.code !== 'MissingTypeScriptTypeArgument'))
		}
	}
	for (const name of Object.keys(declarations)) {
		if (!used.has(name)) {
			issues.push({ code: 'UnusedTypeParameter', message: `Type parameter ${name} is never referenced by an input or output type.`, path: `typeParameters.${name}`, actual: name })
		}
	}
	return issues
}

/** Validate explicit node bindings and instantiate a template's port/output descriptors. */
export function instantiateTemplateContracts(
	typeParameters: Readonly<Record<string, TemplateTypeParameterDefinition>> | undefined,
	inputs: Readonly<Record<string, InputPort>>,
	output: OutputPort,
	supplied: Readonly<Record<string, TypeDescriptor>> | undefined
): { contracts?: InstantiatedTemplateContracts; issues: GenericTypeIssue[] } {
	const declarations = typeParameters ?? {}
	const argumentsRecord = supplied ?? {}
	const issues: GenericTypeIssue[] = []
	for (const name of Object.keys(declarations)) {
		const argument = argumentsRecord[name]
		if (!argument) {
			issues.push({
				code: 'MissingTypeArgument', message: `Missing required type argument ${name}.`,
				path: `typeArguments.${name}`, typeParameterName: name, expected: name
			})
			continue
		}
		issues.push(...concreteDescriptorIssues(argument, `typeArguments.${name}`, {
			code: 'InvalidTypeArgument',
			typeParameterName: name
		}))
		const constraint = declarations[name]?.constraint
		if (constraint) {
			const comparison = compareTypeDescriptors(argument, constraint)
			if (comparison.status === 'incompatible' || comparison.status === 'indeterminate') {
				issues.push({
					code: 'IncompatibleTypeArgument',
					message: `Type argument ${name} does not satisfy its constraint.`,
					path: `typeArguments.${name}`,
					typeParameterName: name,
					expected: constraint,
					actual: argument
				})
			}
		}
	}
	for (const name of Object.keys(argumentsRecord)) {
		if (!Object.prototype.hasOwnProperty.call(declarations, name)) {
			issues.push({
				code: 'UnknownTypeArgument', message: `Template does not declare type parameter ${name}.`,
				path: `typeArguments.${name}`, typeParameterName: name, actual: name
			})
		}
	}
	if (issues.length > 0) return { issues }

	const instantiatedInputs = Object.entries(inputs).map(([name, port]) => {
		const instantiated = instantiatePort(port, argumentsRecord, `inputs.${name}`)
		issues.push(...instantiated.issues)
		return [name, instantiated.port] as const
	})
	const instantiatedOutput = substituteDescriptor(output.type, argumentsRecord, 'output.type')
	issues.push(...instantiatedOutput.issues)
	if (issues.length > 0) return { issues }
	return {
		contracts: {
			typeArguments: { ...argumentsRecord },
			inputs: Object.fromEntries(instantiatedInputs),
			output: { ...output, ...(instantiatedOutput.type ? { type: instantiatedOutput.type } : {}) }
		},
		issues
	}
}
