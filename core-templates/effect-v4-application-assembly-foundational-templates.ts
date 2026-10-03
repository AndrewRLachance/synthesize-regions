import { fragmentCollectionPort } from '../src/templates.js'
import { defineTemplate } from './sample-definition.js'
import {
	effectConcurrencyInput,
	effectSourceInput,
	effectType
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	layerType,
	marker,
	tagType,
	typeParameters,
	typedExpressionInput
} from './effect-template-helpers.js'
import {
	applicationHealthSnapshotType,
	applicationHealthType,
	applicationShutdownType
} from './effect-application-assembly-template-helpers.js'

/**
 * Effect v4 application-assembly foundational templates.
 *
 * Runtime contract:
 *   import { Context, Deferred, Effect, Layer } from 'effect'
 */

const VERSION = '1.0.0' as const

const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

const layerInput = (
	description: string,
	provided = 'unknown',
	error = 'unknown',
	requirements = 'unknown'
) => typedExpressionInput(description, layerType(provided, error, requirements))

const shutdownInput = (description: string) =>
	typedExpressionInput(description, applicationShutdownType())

const healthInput = (
	description: string,
	livenessSuccess = 'void',
	livenessError = 'never',
	readinessSuccess = 'void',
	readinessError = 'never'
) => typedExpressionInput(
	description,
	applicationHealthType(livenessSuccess, livenessError, readinessSuccess, readinessError)
)

export const ApplicationShutdownLayerTemplate = defineTemplate({
	modelId: 'ApplicationShutdownLayer',
	version: VERSION,
	description: 'Creates a shared one-shot application shutdown signal backed by Deferred.',
	typeParameters: typeParameters(['I', 'Provided shutdown-service identifier type.']),
	inputs: {
		service: serviceKeyInput(
			'Context.Service key whose implementation exposes await and request shutdown operations.',
			'{{I}}',
			applicationShutdownType().ts
		)
	},
	output: expressionOutput('Application shutdown-signal Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.effect(${marker('expression', 'service', 'ApplicationShutdown')}, Effect.map(Deferred.make<void>(), deferred => ({
	await: Deferred.await(deferred),
	request: Deferred.succeed(deferred, undefined)
})))`
})

export const ApplicationShutdownAwaitTemplate = defineTemplate({
	modelId: 'ApplicationShutdownAwait',
	version: VERSION,
	description: 'Waits until the shared application shutdown signal is requested.',
	inputs: {
		shutdown: shutdownInput('Application shutdown service.')
	},
	output: expressionOutput('Application shutdown wait Effect.', effectType('void', 'never', 'never')),
	source: `${marker('expression', 'shutdown', 'shutdown')}.await`
})

export const ApplicationShutdownRequestTemplate = defineTemplate({
	modelId: 'ApplicationShutdownRequest',
	version: VERSION,
	description: 'Requests application shutdown and reports whether this call completed the signal.',
	inputs: {
		shutdown: shutdownInput('Application shutdown service.')
	},
	output: expressionOutput('Application shutdown request Effect.', effectType('boolean', 'never', 'never')),
	source: `${marker('expression', 'shutdown', 'shutdown')}.request`
})

export const ApplicationHealthLayerTemplate = defineTemplate({
	modelId: 'ApplicationHealthLayer',
	version: VERSION,
	description: 'Exposes closed liveness and readiness Effects as one reusable application-health service.',
	typeParameters: typeParameters(
		['I', 'Provided health-service identifier type.'],
		['L', 'Liveness success type.'],
		['ELive', 'Liveness failure type.'],
		['Rdy', 'Readiness success type.'],
		['EReady', 'Readiness failure type.']
	),
	inputs: {
		service: serviceKeyInput(
			'Context.Service key for the application-health service.',
			'{{I}}',
			applicationHealthType('{{L}}', '{{ELive}}', '{{Rdy}}', '{{EReady}}').ts
		),
		liveness: effectSourceInput('Closed liveness probe Effect.', effectType('{{L}}', '{{ELive}}', 'never')),
		readiness: effectSourceInput('Closed readiness probe Effect.', effectType('{{Rdy}}', '{{EReady}}', 'never'))
	},
	output: expressionOutput('Application-health service Layer.', layerType('{{I}}', 'never', 'never')),
	source: `Layer.succeed(${marker('expression', 'service', 'ApplicationHealth')}, {
	liveness: ${marker('expression', 'liveness', 'Effect.void')},
	readiness: ${marker('expression', 'readiness', 'Effect.void')}
})`
})

export const ApplicationHealthLivenessTemplate = defineTemplate({
	modelId: 'ApplicationHealthLiveness',
	version: VERSION,
	description: 'Runs the liveness probe exposed by an application-health service.',
	typeParameters: typeParameters(
		['L', 'Liveness success type.'],
		['ELive', 'Liveness failure type.'],
		['Rdy', 'Readiness success type.'],
		['EReady', 'Readiness failure type.']
	),
	inputs: {
		health: healthInput('Application-health service.', '{{L}}', '{{ELive}}', '{{Rdy}}', '{{EReady}}')
	},
	output: expressionOutput('Application liveness Effect.', effectType('{{L}}', '{{ELive}}', 'never')),
	source: `${marker('expression', 'health', 'health')}.liveness`
})

export const ApplicationHealthReadinessTemplate = defineTemplate({
	modelId: 'ApplicationHealthReadiness',
	version: VERSION,
	description: 'Runs the readiness probe exposed by an application-health service.',
	typeParameters: typeParameters(
		['L', 'Liveness success type.'],
		['ELive', 'Liveness failure type.'],
		['Rdy', 'Readiness success type.'],
		['EReady', 'Readiness failure type.']
	),
	inputs: {
		health: healthInput('Application-health service.', '{{L}}', '{{ELive}}', '{{Rdy}}', '{{EReady}}')
	},
	output: expressionOutput('Application readiness Effect.', effectType('{{Rdy}}', '{{EReady}}', 'never')),
	source: `${marker('expression', 'health', 'health')}.readiness`
})

export const ApplicationHealthSnapshotTemplate = defineTemplate({
	modelId: 'ApplicationHealthSnapshot',
	version: VERSION,
	description: 'Runs liveness and readiness probes and captures both typed outcomes as data.',
	typeParameters: typeParameters(
		['L', 'Liveness success type.'],
		['ELive', 'Liveness failure type.'],
		['Rdy', 'Readiness success type.'],
		['EReady', 'Readiness failure type.']
	),
	inputs: {
		health: healthInput('Application-health service.', '{{L}}', '{{ELive}}', '{{Rdy}}', '{{EReady}}')
	},
	output: expressionOutput(
		'Captured liveness/readiness snapshot.',
		effectType(applicationHealthSnapshotType('{{L}}', '{{ELive}}', '{{Rdy}}', '{{EReady}}').ts, 'never', 'never')
	),
	source: `Effect.gen(function* () {
	const health = ${marker('expression', 'health', '(undefined as any)')}
	const liveness = yield* Effect.result(health.liveness)
	const readiness = yield* Effect.result(health.readiness)
	return { liveness, readiness }
})`
})

export const ApplicationStartupChecksTemplate = defineTemplate({
	modelId: 'ApplicationStartupChecks',
	version: VERSION,
	description: 'Runs one or more startup/preflight Effects under an explicit concurrency policy.',
	typeParameters: typeParameters(
		['A', 'Startup-check success type.'],
		['E', 'Startup-check failure type.'],
		['R', 'Startup-check requirements.']
	),
	inputs: {
		checks: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression', type: effectType('{{A}}', '{{E}}', '{{R}}') },
			minItems: 1,
			separator: ', ',
			description: 'Startup/preflight Effects.'
		}),
		concurrency: effectConcurrencyInput('Startup-check concurrency.')
	},
	output: expressionOutput(
		'Startup-check results.',
		effectType('ReadonlyArray<{{A}}>', '{{E}}', '{{R}}')
	),
	source: `Effect.all([${marker('expression', 'checks', 'Effect.void')}], { concurrency: ${marker('expression', 'concurrency', '1')} })`
})

export const ApplicationLayerTapStartupTemplate = defineTemplate({
	modelId: 'ApplicationLayerTapStartup',
	version: VERSION,
	description: 'Runs startup work only after a Layer builds successfully and before that Layer is exposed downstream.',
	typeParameters: typeParameters(
		['P', 'Services provided by the Layer.'],
		['E', 'Layer construction error type.'],
		['R', 'Layer requirements.'],
		['AStart', 'Startup result type.'],
		['EStart', 'Startup error type.'],
		['RStart', 'Additional startup requirements not supplied by the Layer output.']
	),
	inputs: {
		layer: layerInput('Layer whose successful construction gates startup work.', '{{P}}', '{{E}}', '{{R}}'),
		startup: effectSourceInput(
			'Startup Effect that may use services produced by the Layer.',
			effectType('{{AStart}}', '{{EStart}}', '{{P}} | {{RStart}}')
		)
	},
	output: expressionOutput(
		'Layer exposed only after startup succeeds.',
		layerType('{{P}}', '{{E}} | {{EStart}}', '{{R}} | {{RStart}}')
	),
	source: `Layer.tap(
	${marker('expression', 'layer', 'Layer.empty')},
	context => Effect.provide(${marker('expression', 'startup', 'Effect.void')}, context)
)`
})

export const effectV4ApplicationAssemblyFoundationalGraphTemplateInputs = [
	ApplicationShutdownLayerTemplate,
	ApplicationShutdownAwaitTemplate,
	ApplicationShutdownRequestTemplate,
	ApplicationHealthLayerTemplate,
	ApplicationHealthLivenessTemplate,
	ApplicationHealthReadinessTemplate,
	ApplicationHealthSnapshotTemplate,
	ApplicationStartupChecksTemplate,
	ApplicationLayerTapStartupTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
