import type { TypeDescriptor } from 'synthesize-regions'
import { effectStructuralType } from '../core/effect-ts.js'
import { nominalType } from '../../../authoring/effect-v4/effect-template-helpers.js'

export const applicationShutdownType = (): TypeDescriptor => ({
	nominal: 'effect-template/ApplicationShutdown',
	ts: `{ readonly await: ${effectStructuralType('void', 'never', 'never')}; readonly request: ${effectStructuralType('boolean', 'never', 'never')} }`
})

export const applicationHealthType = (
	livenessSuccess = 'void',
	livenessError = 'never',
	readinessSuccess = 'void',
	readinessError = 'never'
): TypeDescriptor => ({
	nominal: 'effect-template/ApplicationHealth',
	ts: `{ readonly liveness: ${effectStructuralType(livenessSuccess, livenessError, 'never')}; readonly readiness: ${effectStructuralType(readinessSuccess, readinessError, 'never')} }`
})

export const applicationHealthSnapshotType = (
	livenessSuccess = 'void',
	livenessError = 'never',
	readinessSuccess = 'void',
	readinessError = 'never'
): TypeDescriptor => ({
	ts: `{ readonly liveness: ${resultTs(livenessSuccess, livenessError)}; readonly readiness: ${resultTs(readinessSuccess, readinessError)} }`
})

export const applicationPhaseType = (phase = 'unknown'): TypeDescriptor =>
	nominalType('effect-template/ApplicationPhase', { applicationPhase: phase })

const resultTs = (success: string, failure: string) =>
	`{ readonly _tag: "Success"; readonly success: ${success} } | { readonly _tag: "Failure"; readonly failure: ${failure} }`
