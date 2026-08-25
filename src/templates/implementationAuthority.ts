import { Type, type Static } from '@sinclair/typebox'

/** Version shared by project-target discovery and static enforcement data. */
export const PROJECT_IMPLEMENTATION_AUTHORITY_VERSION = 1 as const

/** A source-free diagnostic emitted by project implementation authority checks. */
export const ImplementationEnforcementDiagnosticSchema = Type.Object({
	code: Type.String({ minLength: 1 }),
	severity: Type.Union([Type.Literal('error'), Type.Literal('warning')]),
	message: Type.String({ minLength: 1 }),
	path: Type.Optional(Type.String({ minLength: 1 })),
	artifactId: Type.Optional(Type.String({ minLength: 1 })),
	templateId: Type.Optional(Type.String({ minLength: 1 })),
	targetId: Type.Optional(Type.String({ minLength: 1 })),
	symbolId: Type.Optional(Type.String({ minLength: 1 })),
	start: Type.Optional(Type.Integer({ minimum: 0 })),
	end: Type.Optional(Type.Integer({ minimum: 0 })),
	expected: Type.Optional(Type.Unknown()),
	actual: Type.Optional(Type.Unknown())
}, { additionalProperties: false })

export type ImplementationEnforcementDiagnostic = Static<typeof ImplementationEnforcementDiagnosticSchema>

/** Common result returned by pure project implementation authority validators. */
export const ImplementationEnforcementResultSchema = Type.Object({
	ok: Type.Boolean(),
	diagnostics: Type.Array(ImplementationEnforcementDiagnosticSchema)
}, { additionalProperties: false })

export type ImplementationEnforcementResult = Static<typeof ImplementationEnforcementResultSchema>

/** @internal Create one consistently shaped authority diagnostic. */
export function implementationDiagnostic(
	code: string,
	message: string,
	details: Omit<ImplementationEnforcementDiagnostic, 'code' | 'message' | 'severity'> = {},
	severity: ImplementationEnforcementDiagnostic['severity'] = 'error'
): ImplementationEnforcementDiagnostic {
	return { code, severity, message, ...details }
}

/** @internal Finalize diagnostics into the common immutable result shape. */
export function implementationEnforcementResult(
	diagnostics: readonly ImplementationEnforcementDiagnostic[]
): ImplementationEnforcementResult {
	const copied = diagnostics.map(diagnostic => ({ ...diagnostic }))
	return {
		ok: !copied.some(diagnostic => diagnostic.severity === 'error'),
		diagnostics: copied
	}
}
