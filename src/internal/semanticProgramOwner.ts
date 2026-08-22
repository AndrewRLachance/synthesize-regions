import {
	createCapturedTypeScriptProgramOwner,
	discardCapturedTypeScriptProgramOwner,
	type CapturedTypeScriptProgramOwner
} from '../templates/capturedProject.js'

let activeOwner: CapturedTypeScriptProgramOwner | undefined

/** Creates compiler state owned by one external semantic-analysis lease. @internal */
export function createSemanticProgramOwner(): CapturedTypeScriptProgramOwner {
	return createCapturedTypeScriptProgramOwner()
}

/** Discards compiler state owned by one external semantic-analysis lease. @internal */
export function discardSemanticProgramOwner(owner: CapturedTypeScriptProgramOwner): void {
	if (activeOwner === owner) activeOwner = undefined
	discardCapturedTypeScriptProgramOwner(owner)
}

/** Runs one synchronous semantic operation with its exact lease owner. @internal */
export function runWithSemanticProgramOwner<T>(
	owner: CapturedTypeScriptProgramOwner,
	operation: () => T
): T {
	if (activeOwner !== undefined) throw new Error('Semantic program owner scopes cannot overlap')
	activeOwner = owner
	try {
		return operation()
	} finally {
		activeOwner = undefined
	}
}

/** Returns the owner active for the current synchronous compiler operation. @internal */
export function currentSemanticProgramOwner(): CapturedTypeScriptProgramOwner | undefined {
	return activeOwner
}

export type { CapturedTypeScriptProgramOwner }
