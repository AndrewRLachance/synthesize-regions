/**
 * Representative type-argument substitutions for the Effect V4 catalog.
 *
 * Structural validation has to substitute `{{...}}` placeholders before it can
 * compile a descriptor: the shipped validator compiles each expression in a
 * project with no imports, so an unsubstituted `{{A}}` is not a type at all.
 *
 * These values are *fixtures*, not contracts. They exist so a descriptor can be
 * proven self-contained and so the later module-resolved semantic compile
 * harness receives a concrete program. They deliberately stay inside the
 * ES2022 lib the structural validator provides.
 */

/**
 * Fallback used for any type parameter this table does not name.
 *
 * `unknown` is the honest choice for an abstract parameter: it never invents a
 * constraint and never weakens a descriptor into something assignable that the
 * author did not promise.
 */
export const DEFAULT_TYPE_ARGUMENT = 'unknown'

/**
 * Substitutions keyed by the catalog's conventional type-parameter names.
 *
 * Names are reused across packs (`A` is always the success/value type, `E` the
 * error, `R` the requirements), which is what makes a single table possible.
 */
export const TYPE_ARGUMENT_FIXTURES: Readonly<Record<string, string>> = {
	A: 'string',
	B: 'string',
	C: 'string',
	S: 'string',
	X: 'string',
	Y: 'string',
	Value: 'string',
	Result: 'string',
	Item: 'string',
	Input: 'string',
	Output: 'string',
	Row: 'string',
	Key: 'string',
	Id: 'string',
	Name: 'string',
	Message: 'string',
	Path: 'string',
	Url: 'string',
	Header: 'string',
	Method: 'string',
	Tag: '"Tagged"',
	E: 'Error',
	EX: 'Error',
	RX: 'never',
	I: 'string',
	O: 'string',
	R: 'never',
	RD: 'never',
	RE: 'never',
	RI: 'never',
	RO: 'never',
	RM: 'never',
	RC: 'never',
	RDefault: 'never',
	RModel: 'never',
	// Two-channel combinators name their sides with numeric suffixes.
	S0: 'string',
	S1: 'string',
	E0: 'Error',
	E1: 'Error',
	E2: 'Error',
	E3: 'Error',
	E4: 'Error',
	R1: 'never',
	R2: 'never',
	R3: 'never',
	R4: 'never',
	P0: 'string',
	P1: 'never',
	P2: 'never',
	P3: 'never',
	P4: 'never',
	In: 'string',
	In0: 'string',
	In1: 'string',
	Out: 'string',
	Out0: 'string',
	Out1: 'string',
	Effect: 'Promise<void>',
	Fn: '(value: string) => string',
	Predicate: '(value: string) => boolean',
	Mapper: '(value: string) => string',
	Reducer: '(accumulator: string, value: string) => string',
	// Names the catalog uses for specific channels outside the A/E/R convention.
	AStart: 'string',
	Client: 'string',
	ContextInput: 'string',
	Element: 'string',
	Event: 'string',
	Insert: '{ readonly id: string }',
	K: 'string',
	KI: 'string',
	L: 'never',
	LE: 'Error',
	LR: 'never',
	M: 'string',
	MetricState: '{ readonly count: number; readonly min: number; readonly max: number; readonly sum: number }',
	P: 'never',
	Payload: 'string',
	Q: '{}',
	Rdy: 'string',
	Reason: 'Error',
	RepeatOut: 'string',
	Req: 'string',
	ReqI: 'string',
	Request: 'string',
	Res: 'string',
	ResI: 'string',
	Reservation: 'string',
	Response: 'string',
	RetryOut: 'string',
	Rpcs: 'string',
	SE: 'string',
	ScheduleOut: 'string',
	ScheduleR: 'never',
	Shared: 'boolean',
	State: '{ readonly nanos: bigint }',
	Success: 'string',
	T: 'string',
	Tick: 'string',
	U: 'string',
	Update: '{ readonly id: string }',
	User: '{ readonly id: string }',
	V: 'string',
	VI: 'string',
	WE: 'Error',
	WP: 'string',
	PE: 'string',
	PI: 'string',
	PP: 'never',
	PW: 'never',
	WP0: 'string',
	PBase: 'never',
	PBoundaries: 'never',
	PInfra: 'never',
	POut: 'never',
	PWorkers: 'never',
}

/** Canonical descriptions reused when a fixture needs a human-readable label. */
export const TYPE_ARGUMENT_DESCRIPTIONS: Readonly<Record<string, string>> = {
	A: 'success or primary value type',
	B: 'secondary value type',
	C: 'tertiary value type',
	S: 'service or success type',
	X: 'additional value type',
	Y: 'additional value type',
	Value: 'value type',
	Input: 'input type',
	Output: 'output type',
	Row: 'database row type',
	Key: 'key type',
	Id: 'identifier type',
	Tag: 'discriminant literal type',
	E: 'error type',
	EX: 'layer error type',
	RX: 'layer requirement type',
	I: 'encoded type',
	O: 'output type',
	R: 'requirements type',
	RD: 'decoding services type',
	RE: 'encoding services type',
	RI: 'layer input requirements type',
	RO: 'layer output requirements type',
	RM: 'model requirements type',
	RC: 'constructor requirements type',
	RDefault: 'default-effect requirements type',
	RModel: 'repository model requirements type'
}

/**
 * Naming conventions the catalog follows, used to derive a fixture for a type
 * parameter this table does not name explicitly.
 *
 * The catalog is internally consistent about prefixes and suffixes: `E...` /
 * `...Error` is an error channel, `R...` / `...Requirements` is a requirements
 * channel, `I...` / `...Encoded` is an encoded type. Deriving from those keeps
 * substitution total without inventing a constraint for an unknown name, and
 * the result is still reported in `unresolved` so a fixture never silently
 * stands in for a missing table entry.
 */
const CONVENTIONS: ReadonlyArray<{ pattern: RegExp; fixture: string }> = [
	{ pattern: /Error$/u, fixture: 'Error' },
	{ pattern: /^E[A-Z]/u, fixture: 'Error' },
	{ pattern: /Errors$/u, fixture: 'Error' },
	{ pattern: /Requirements$/u, fixture: 'never' },
	{ pattern: /^R[A-Z]/u, fixture: 'never' },
	{ pattern: /Services$/u, fixture: 'never' },
	{ pattern: /Encoded$/u, fixture: 'string' },
	{ pattern: /^I[A-Z]/u, fixture: 'string' }
]

/** Derive a fixture from the catalog's naming conventions. */
export function derivedTypeArgument(name: string): string | undefined {
	for (const { pattern, fixture } of CONVENTIONS) {
		if (pattern.test(name)) return fixture
	}
	return undefined
}

/** Substitute every `{{Name}}` placeholder, mirroring `src/templates/genericTypes.ts`. */
export function substituteTypePlaceholders(expression: string): {
	ts: string
	unresolved: string[]
} {
	const unresolved: string[] = []
	const ts = expression.replace(/\{\{([^{}]+)\}\}/g, (_match, rawName: string) => {
		const name = rawName.trim()
		const fixture = TYPE_ARGUMENT_FIXTURES[name] ?? derivedTypeArgument(name)
		if (fixture === undefined) {
			unresolved.push(name)
			return `(${DEFAULT_TYPE_ARGUMENT})`
		}
		return `(${fixture})`
	})
	return { ts, unresolved }
}

/**
 * Substitute for the common `{{X}} | never` requirement spellings so a
 * substituted descriptor never contains a dangling union.
 */
export function substituteTemplateTypeDescriptors(expression: string): string {
	return substituteTypePlaceholders(expression).ts
}