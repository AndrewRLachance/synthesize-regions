import type {
	CallableScope,
	InputPort,
	InputPortSummary,
	RegionKind
} from './graphCoreTypes.js'

/** Stable semantic-validation issue emitted for invalid callable metadata. */
export interface CallableScopeValidationIssue {
	readonly code: 'InvalidCallableScope'
	readonly message: string
	readonly path: string
	readonly expected?: unknown
	readonly actual?: unknown
}

/** Error thrown when a declarative template carries an invalid callable scope. */
export class InvalidCallableScopeError extends TypeError {
	readonly issues: readonly CallableScopeValidationIssue[]

	constructor(issues: readonly CallableScopeValidationIssue[]) {
		const first = issues[0]
		super(first === undefined
			? 'InvalidCallableScope: callable metadata is invalid.'
			: `${first.code} at ${first.path}: ${first.message}`)
		this.name = 'InvalidCallableScopeError'
		this.issues = Object.freeze([...issues])
	}
}

type CallablePort = InputPort | InputPortSummary
type ConcreteCallablePort = Exclude<CallablePort, { readonly kind: 'union' }>

const PARAMETER_KINDS = new Set<RegionKind>(['parameter', 'constructorParameter'])
const BODY_KINDS = new Set<RegionKind>(['statement', 'expression'])

function issue(
	message: string,
	path: string,
	expected?: unknown,
	actual?: unknown
): CallableScopeValidationIssue {
	return {
		code: 'InvalidCallableScope',
		message,
		path,
		...(expected === undefined ? {} : { expected }),
		...(actual === undefined ? {} : { actual })
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function concretePorts(port: CallablePort): ConcreteCallablePort[] {
	return port.kind === 'union'
		? port.options.flatMap(concretePorts)
		: [port]
}

function acceptedKind(port: Extract<ConcreteCallablePort, { readonly kind: 'fragment' | 'fragmentCollection' }>): RegionKind {
	return port.accepts.outputKind ?? port.regionKind
}

function validateParametersPort(port: CallablePort, path: string): CallableScopeValidationIssue[] {
	const variants = concretePorts(port)
	const families = [...new Set(variants.map(variant => variant.kind))]
	if (variants.length === 0
		|| families.length !== 1
		|| (families[0] !== 'fragment' && families[0] !== 'fragmentCollection')) {
		return [issue(
			'Callable parameters must use one homogeneous fragment or fragment-collection family.',
			path,
			'fragment or fragmentCollection',
			families
		)]
	}

	const invalidVariant = variants.find(variant => {
		if (variant.kind !== 'fragment' && variant.kind !== 'fragmentCollection') return true
		return !PARAMETER_KINDS.has(variant.regionKind) || !PARAMETER_KINDS.has(acceptedKind(variant))
	})
	return invalidVariant === undefined ? [] : [issue(
		'Callable parameters must occupy and accept parameter or constructorParameter regions.',
		path,
		['parameter', 'constructorParameter'],
		invalidVariant
	)]
}

function validateBodyPort(port: CallablePort, path: string): CallableScopeValidationIssue[] {
	if (port.required === false) {
		return [issue('A callable body input must be required.', path, { required: true }, { required: false })]
	}

	const variants = concretePorts(port)
	if (variants.length === 0) {
		return [issue(
			'A callable body must use structured fragments or raw code.',
			path,
			'fragment, fragmentCollection, or rawCode',
			[]
		)]
	}

	const families = [...new Set(variants.map(variant =>
		variant.kind === 'fragment' || variant.kind === 'fragmentCollection'
			? 'structured'
			: variant.kind === 'rawCode' ? 'rawCode' : variant.kind
	))]
	if (families.length !== 1 || (families[0] !== 'structured' && families[0] !== 'rawCode')) {
		return [issue(
			'Callable body unions must not mix structured fragments, raw code, or literal values.',
			path,
			'one structured or rawCode family',
			families
		)]
	}

	const invalidVariant = variants.find(variant => {
		if (!BODY_KINDS.has(variant.regionKind)) return true
		if (variant.kind === 'fragment' || variant.kind === 'fragmentCollection') {
			return !BODY_KINDS.has(acceptedKind(variant))
		}
		return variant.kind !== 'rawCode'
	})
	return invalidVariant === undefined ? [] : [issue(
		'Callable bodies must occupy and, for structured ports, accept statement or expression regions.',
		path,
		['statement', 'expression'],
		invalidVariant
	)]
}

/**
 * Validate optional callable ownership metadata against its declared inputs.
 * The check is shared by executable manifests and source-free summaries.
 */
export function validateCallableScope(
	value: unknown,
	inputs: Readonly<Record<string, CallablePort>>,
	path = 'callableScope'
): CallableScopeValidationIssue[] {
	if (value === undefined) return []
	if (!isRecord(value)) {
		return [issue('Callable scope must be a closed object.', path, ['parametersInput', 'bodyInput'], value)]
	}

	const keys = Object.keys(value).sort()
	if (keys.length !== 2 || keys[0] !== 'bodyInput' || keys[1] !== 'parametersInput') {
		return [issue(
			'Callable scope must contain only parametersInput and bodyInput.',
			path,
			['bodyInput', 'parametersInput'],
			keys
		)]
	}

	const parametersInput = value.parametersInput
	const bodyInput = value.bodyInput
	if (typeof parametersInput !== 'string' || parametersInput.length === 0) {
		return [issue('parametersInput must be a non-empty input name.', `${path}.parametersInput`, 'non-empty string', parametersInput)]
	}
	if (typeof bodyInput !== 'string' || bodyInput.length === 0) {
		return [issue('bodyInput must be a non-empty input name.', `${path}.bodyInput`, 'non-empty string', bodyInput)]
	}
	if (parametersInput === bodyInput) {
		return [issue(
			'Callable parameter and body inputs must be distinct.',
			path,
			'distinct input names',
			{ parametersInput, bodyInput }
		)]
	}

	const typedScope = value as unknown as CallableScope
	const parametersPort = inputs[typedScope.parametersInput]
	if (parametersPort === undefined) {
		return [issue(
			'parametersInput must name an existing template input.',
			`${path}.parametersInput`,
			Object.keys(inputs).sort(),
			parametersInput
		)]
	}
	const bodyPort = inputs[typedScope.bodyInput]
	if (bodyPort === undefined) {
		return [issue(
			'bodyInput must name an existing template input.',
			`${path}.bodyInput`,
			Object.keys(inputs).sort(),
			bodyInput
		)]
	}

	return [
		...validateParametersPort(parametersPort, `${path}.parametersInput`),
		...validateBodyPort(bodyPort, `${path}.bodyInput`)
	]
}

