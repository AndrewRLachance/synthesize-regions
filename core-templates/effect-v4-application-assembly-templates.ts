import { defineTemplate } from './sample-definition.js'
import {
	effectSourceInput,
	effectType,
	effectValueInput
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	expressionOutput,
	identifierInput,
	layerType,
	managedRuntimeType,
	marker,
	statementCollectionInput,
	statementOutput,
	tagType,
	typeParameters,
	typedExpressionInput
} from './effect-template-helpers.js'
import { applicationHealthType, applicationShutdownType } from './effect-application-assembly-template-helpers.js'
import { latchType } from './effect-v4-operations-foundational-templates.js'

/**
 * Effect v4 application-assembly compositions.
 *
 * Runtime contract:
 *   import { Context, Effect, Layer, ManagedRuntime } from 'effect'
 * Platform entry points additionally use NodeRuntime / BunRuntime / BrowserRuntime.
 */

const VERSION = '1.0.0' as const

const layerInput = (
	description: string,
	provided = 'unknown',
	error = 'unknown',
	requirements = 'unknown'
) => typedExpressionInput(description, layerType(provided, error, requirements))

const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

const runtimeInput = (description: string, requirements = 'unknown', error = 'unknown') =>
	typedExpressionInput(description, managedRuntimeType(requirements, error))

export const ApplicationServicesLayerTemplate = defineTemplate({
	modelId: 'ApplicationServicesLayer',
	version: VERSION,
	description: 'Builds application services from infrastructure while retaining both infrastructure and service outputs.',
	typeParameters: typeParameters(
		['PInfra', 'Infrastructure services provided.'],
		['EInfra', 'Infrastructure Layer error type.'],
		['RInfra', 'Infrastructure Layer requirements.'],
		['PServices', 'Application services provided.'],
		['EServices', 'Application-service Layer error type.'],
		['RServices', 'Additional application-service requirements.']
	),
	inputs: {
		infrastructure: layerInput('Infrastructure Layer.', '{{PInfra}}', '{{EInfra}}', '{{RInfra}}'),
		services: layerInput(
			'Application-service Layer requiring infrastructure.',
			'{{PServices}}',
			'{{EServices}}',
			'{{PInfra}} | {{RServices}}'
		)
	},
	output: expressionOutput(
		'Infrastructure plus application services.',
		layerType(
			'{{PInfra}} | {{PServices}}',
			'{{EInfra}} | {{EServices}}',
			'{{RInfra}} | {{RServices}}'
		)
	),
	source: `Layer.provideMerge(
	${marker('expression', 'services', 'Layer.empty')},
	${marker('expression', 'infrastructure', 'Layer.empty')}
)`
})

export const ApplicationRootLayerTemplate = defineTemplate({
	modelId: 'ApplicationRootLayer',
	version: VERSION,
	description: 'Assembles infrastructure, domain services, runtime boundaries, and background workers into one Layer with phased dependency wiring.',
	typeParameters: typeParameters(
		['PInfra', 'Infrastructure services provided.'],
		['EInfra', 'Infrastructure errors.'],
		['RInfra', 'Infrastructure requirements.'],
		['PServices', 'Domain/application services provided.'],
		['EServices', 'Service construction errors.'],
		['RServices', 'Additional service requirements.'],
		['PBoundaries', 'Runtime-boundary services/resources provided.'],
		['EBoundaries', 'Runtime-boundary construction errors.'],
		['RBoundaries', 'Additional runtime-boundary requirements.'],
		['PWorkers', 'Background-worker services/resources provided.'],
		['EWorkers', 'Worker construction errors.'],
		['RWorkers', 'Additional worker requirements.']
	),
	inputs: {
		infrastructure: layerInput('Infrastructure Layer.', '{{PInfra}}', '{{EInfra}}', '{{RInfra}}'),
		services: layerInput('Domain/application services Layer.', '{{PServices}}', '{{EServices}}', '{{PInfra}} | {{RServices}}'),
		boundaries: layerInput('RPC/HTTP/socket or other runtime-boundary Layer.', '{{PBoundaries}}', '{{EBoundaries}}', '{{PInfra}} | {{PServices}} | {{RBoundaries}}'),
		workers: layerInput('Background-worker Layer.', '{{PWorkers}}', '{{EWorkers}}', '{{PInfra}} | {{PServices}} | {{RWorkers}}')
	},
	output: expressionOutput(
		'Fully wired application root Layer.',
		layerType(
			'{{PInfra}} | {{PServices}} | {{PBoundaries}} | {{PWorkers}}',
			'{{EInfra}} | {{EServices}} | {{EBoundaries}} | {{EWorkers}}',
			'{{RInfra}} | {{RServices}} | {{RBoundaries}} | {{RWorkers}}'
		)
	),
	source: `(() => {
	const base = Layer.provideMerge(
		${marker('expression', 'services', 'Layer.empty')},
		${marker('expression', 'infrastructure', 'Layer.empty')}
	)
	return Layer.provideMerge(
		Layer.merge(
			${marker('expression', 'boundaries', 'Layer.empty')},
			${marker('expression', 'workers', 'Layer.empty')}
		),
		base
	)
})()`
})

export const ApplicationStartupGatedRootLayerTemplate = defineTemplate({
	modelId: 'ApplicationStartupGatedRootLayer',
	version: VERSION,
	description: 'Builds infrastructure and services, runs startup/preflight work against them, and launches boundaries/workers only after startup succeeds.',
	typeParameters: typeParameters(
		['PInfra', 'Infrastructure services provided.'], ['EInfra', 'Infrastructure errors.'], ['RInfra', 'Infrastructure requirements.'],
		['PServices', 'Application services provided.'], ['EServices', 'Service errors.'], ['RServices', 'Additional service requirements.'],
		['AStart', 'Startup success type.'], ['EStart', 'Startup error type.'], ['RStart', 'Additional startup requirements.'],
		['PBoundaries', 'Boundary outputs.'], ['EBoundaries', 'Boundary errors.'], ['RBoundaries', 'Additional boundary requirements.'],
		['PWorkers', 'Worker outputs.'], ['EWorkers', 'Worker errors.'], ['RWorkers', 'Additional worker requirements.']
	),
	inputs: {
		infrastructure: layerInput('Infrastructure Layer.', '{{PInfra}}', '{{EInfra}}', '{{RInfra}}'),
		services: layerInput('Application-services Layer.', '{{PServices}}', '{{EServices}}', '{{PInfra}} | {{RServices}}'),
		startup: effectSourceInput('Startup/preflight work.', effectType('{{AStart}}', '{{EStart}}', '{{PInfra}} | {{PServices}} | {{RStart}}')),
		boundaries: layerInput('Runtime-boundary Layer started only after startup succeeds.', '{{PBoundaries}}', '{{EBoundaries}}', '{{PInfra}} | {{PServices}} | {{RBoundaries}}'),
		workers: layerInput('Background-worker Layer started only after startup succeeds.', '{{PWorkers}}', '{{EWorkers}}', '{{PInfra}} | {{PServices}} | {{RWorkers}}')
	},
	output: expressionOutput(
		'Startup-gated application Layer.',
		layerType(
			'{{PInfra}} | {{PServices}} | {{PBoundaries}} | {{PWorkers}}',
			'{{EInfra}} | {{EServices}} | {{EStart}} | {{EBoundaries}} | {{EWorkers}}',
			'{{RInfra}} | {{RServices}} | {{RStart}} | {{RBoundaries}} | {{RWorkers}}'
		)
	),
	source: `(() => {
	const base = Layer.provideMerge(
		${marker('expression', 'services', 'Layer.empty')},
		${marker('expression', 'infrastructure', 'Layer.empty')}
	)
	const started = Layer.tap(
		base,
		context => Effect.provide(${marker('expression', 'startup', 'Effect.void')}, context)
	)
	return Layer.provideMerge(
		Layer.merge(
			${marker('expression', 'boundaries', 'Layer.empty')},
			${marker('expression', 'workers', 'Layer.empty')}
		),
		started
	)
})()`
})

export const ApplicationMigrationReadinessLayerTemplate = defineTemplate({
	modelId: 'ApplicationMigrationReadinessLayer',
	version: VERSION,
	description: 'Builds application dependencies plus a readiness Latch, runs migrations/startup work using the built context, and opens readiness only after success.',
	typeParameters: typeParameters(
		['P', 'Base application services provided.'],
		['E', 'Base Layer error type.'],
		['R', 'Base Layer requirements.'],
		['IReady', 'Readiness service identifier type.'],
		['EReadyLayer', 'Readiness Layer error type.'],
		['RReadyLayer', 'Readiness Layer requirements.'],
		['AStart', 'Migration/startup success type.'],
		['EStart', 'Migration/startup error type.'],
		['RStart', 'Additional migration/startup requirements.']
	),
	inputs: {
		base: layerInput('Base application Layer whose services are needed by migrations/startup.', '{{P}}', '{{E}}', '{{R}}'),
		readinessLayer: layerInput('Layer providing the readiness Latch.', '{{IReady}}', '{{EReadyLayer}}', '{{RReadyLayer}}'),
		readinessService: serviceKeyInput('Context.Service key for the readiness Latch.', '{{IReady}}', latchType().ts),
		startup: effectSourceInput('Migration/startup Effect run before readiness opens.', effectType('{{AStart}}', '{{EStart}}', '{{P}} | {{IReady}} | {{RStart}}'))
	},
	output: expressionOutput(
		'Base Layer with readiness opened only after migration/startup succeeds.',
		layerType('{{P}} | {{IReady}}', '{{E}} | {{EReadyLayer}} | {{EStart}}', '{{R}} | {{RReadyLayer}} | {{RStart}}')
	),
	source: `Layer.tap(
	Layer.merge(
		${marker('expression', 'base', 'Layer.empty')},
		${marker('expression', 'readinessLayer', 'Layer.empty')}
	),
	context => Effect.gen(function* () {
		yield* Effect.provide(${marker('expression', 'startup', 'Effect.void')}, context)
		const readiness = Context.get(context, ${marker('expression', 'readinessService', 'Readiness')})
		yield* readiness.open
	})
)`
})

export const ApplicationReadinessRootLayerTemplate = defineTemplate({
	modelId: 'ApplicationReadinessRootLayer',
	version: VERSION,
	description: 'Assembles a root Layer whose boundaries and workers start only after startup succeeds and readiness is opened.',
	typeParameters: typeParameters(
		['PBase', 'Base application services.'], ['EBase', 'Base Layer errors.'], ['RBase', 'Base Layer requirements.'],
		['IReady', 'Readiness service identifier.'], ['EReady', 'Readiness Layer errors.'], ['RReady', 'Readiness Layer requirements.'],
		['AStart', 'Startup success type.'], ['EStart', 'Startup error type.'], ['RStart', 'Additional startup requirements.'],
		['PBoundaries', 'Boundary outputs.'], ['EBoundaries', 'Boundary errors.'], ['RBoundaries', 'Additional boundary requirements.'],
		['PWorkers', 'Worker outputs.'], ['EWorkers', 'Worker errors.'], ['RWorkers', 'Additional worker requirements.']
	),
	inputs: {
		base: layerInput('Already-wired infrastructure and service Layer.', '{{PBase}}', '{{EBase}}', '{{RBase}}'),
		readinessLayer: layerInput('Readiness Latch Layer.', '{{IReady}}', '{{EReady}}', '{{RReady}}'),
		readinessService: serviceKeyInput('Readiness Latch service key.', '{{IReady}}', latchType().ts),
		startup: effectSourceInput('Startup/preflight Effect.', effectType('{{AStart}}', '{{EStart}}', '{{PBase}} | {{IReady}} | {{RStart}}')),
		boundaries: layerInput('Runtime-boundary Layer.', '{{PBoundaries}}', '{{EBoundaries}}', '{{PBase}} | {{IReady}} | {{RBoundaries}}'),
		workers: layerInput('Background-worker Layer.', '{{PWorkers}}', '{{EWorkers}}', '{{PBase}} | {{IReady}} | {{RWorkers}}')
	},
	output: expressionOutput(
		'Readiness-gated root application Layer.',
		layerType(
			'{{PBase}} | {{IReady}} | {{PBoundaries}} | {{PWorkers}}',
			'{{EBase}} | {{EReady}} | {{EStart}} | {{EBoundaries}} | {{EWorkers}}',
			'{{RBase}} | {{RReady}} | {{RStart}} | {{RBoundaries}} | {{RWorkers}}'
		)
	),
	source: `(() => {
	const readyBase = Layer.tap(
		Layer.merge(
			${marker('expression', 'base', 'Layer.empty')},
			${marker('expression', 'readinessLayer', 'Layer.empty')}
		),
		context => Effect.gen(function* () {
			yield* Effect.provide(${marker('expression', 'startup', 'Effect.void')}, context)
			const readiness = Context.get(context, ${marker('expression', 'readinessService', 'Readiness')})
			yield* readiness.open
		})
	)
	return Layer.provideMerge(
		Layer.merge(
			${marker('expression', 'boundaries', 'Layer.empty')},
			${marker('expression', 'workers', 'Layer.empty')}
		),
		readyBase
	)
})()`
})

export const ApplicationHealthFromRootLayerTemplate = defineTemplate({
	modelId: 'ApplicationHealthFromRootLayer',
	version: VERSION,
	description: 'Adds a health service whose liveness and readiness probes are closed over the already-built root Layer context without rebuilding application resources.',
	typeParameters: typeParameters(
		['P', 'Services provided by the root Layer.'],
		['E', 'Root Layer error type.'],
		['R', 'Root Layer requirements.'],
		['IHealth', 'Health service identifier.'],
		['L', 'Liveness success type.'],
		['ELive', 'Liveness failure type.'],
		['Rdy', 'Readiness success type.'],
		['EReady', 'Readiness failure type.']
	),
	inputs: {
		root: layerInput('Root application Layer whose built Context supplies health-probe dependencies.', '{{P}}', '{{E}}', '{{R}}'),
		healthService: serviceKeyInput(
			'Context.Service key for the application-health service.',
			'{{IHealth}}',
			applicationHealthType('{{L}}', '{{ELive}}', '{{Rdy}}', '{{EReady}}').ts
		),
		liveness: effectSourceInput('Liveness probe using root application services.', effectType('{{L}}', '{{ELive}}', '{{P}}')),
		readiness: effectSourceInput('Readiness probe using root application services.', effectType('{{Rdy}}', '{{EReady}}', '{{P}}'))
	},
	output: expressionOutput(
		'Root application Layer plus a health service closed over the shared root Context.',
		layerType('{{P}} | {{IHealth}}', '{{E}}', '{{R}}')
	),
	source: `(() => {
	const root = ${marker('expression', 'root', 'Layer.empty')}
	const health = Layer.flatMap(root, context =>
		Layer.succeed(${marker('expression', 'healthService', 'ApplicationHealth')}, {
			liveness: Effect.provide(${marker('expression', 'liveness', 'Effect.void')}, context),
			readiness: Effect.provide(${marker('expression', 'readiness', 'Effect.void')}, context)
		})
	)
	return Layer.merge(root, health)
})()`
})

export const ApplicationHealthRootLayerTemplate = defineTemplate({
	modelId: 'ApplicationHealthRootLayer',
	version: VERSION,
	description: 'Adds an application-health service Layer to an assembled root Layer.',
	typeParameters: typeParameters(
		['P', 'Root services provided.'], ['E', 'Root Layer error type.'], ['R', 'Root Layer requirements.'],
		['IHealth', 'Health service identifier.'], ['EHealth', 'Health Layer error type.'], ['RHealth', 'Health Layer requirements.']
	),
	inputs: {
		root: layerInput('Assembled application root Layer.', '{{P}}', '{{E}}', '{{R}}'),
		health: layerInput('Application-health service Layer.', '{{IHealth}}', '{{EHealth}}', '{{RHealth}}')
	},
	output: expressionOutput(
		'Application root including health service.',
		layerType('{{P}} | {{IHealth}}', '{{E}} | {{EHealth}}', '{{R}} | {{RHealth}}')
	),
	source: `Layer.merge(
	${marker('expression', 'root', 'Layer.empty')},
	${marker('expression', 'health', 'Layer.empty')}
)`
})

export const ApplicationShutdownRootLayerTemplate = defineTemplate({
	modelId: 'ApplicationShutdownRootLayer',
	version: VERSION,
	description: 'Adds an internal shutdown-signal service to an assembled root Layer.',
	typeParameters: typeParameters(
		['P', 'Root services provided.'], ['E', 'Root Layer error type.'], ['R', 'Root Layer requirements.'],
		['IShutdown', 'Shutdown service identifier.'], ['EShutdown', 'Shutdown Layer error type.'], ['RShutdown', 'Shutdown Layer requirements.']
	),
	inputs: {
		root: layerInput('Assembled application root Layer.', '{{P}}', '{{E}}', '{{R}}'),
		shutdown: layerInput('Application shutdown-signal Layer.', '{{IShutdown}}', '{{EShutdown}}', '{{RShutdown}}')
	},
	output: expressionOutput(
		'Application root including shutdown signal.',
		layerType('{{P}} | {{IShutdown}}', '{{E}} | {{EShutdown}}', '{{R}} | {{RShutdown}}')
	),
	source: `Layer.merge(
	${marker('expression', 'root', 'Layer.empty')},
	${marker('expression', 'shutdown', 'Layer.empty')}
)`
})

export const ApplicationLifecycleRootLayerTemplate = defineTemplate({
	modelId: 'ApplicationLifecycleRootLayer',
	version: VERSION,
	description: 'Combines an assembled root with health and internal-shutdown services as the final lifecycle Layer.',
	typeParameters: typeParameters(
		['P', 'Root services provided.'], ['E', 'Root errors.'], ['R', 'Root requirements.'],
		['IHealth', 'Health service identifier.'], ['EHealth', 'Health errors.'], ['RHealth', 'Health requirements.'],
		['IShutdown', 'Shutdown service identifier.'], ['EShutdown', 'Shutdown errors.'], ['RShutdown', 'Shutdown requirements.']
	),
	inputs: {
		root: layerInput('Assembled application root Layer.', '{{P}}', '{{E}}', '{{R}}'),
		health: layerInput('Application-health service Layer.', '{{IHealth}}', '{{EHealth}}', '{{RHealth}}'),
		shutdown: layerInput('Application shutdown-signal Layer.', '{{IShutdown}}', '{{EShutdown}}', '{{RShutdown}}')
	},
	output: expressionOutput(
		'Complete application lifecycle Layer.',
		layerType(
			'{{P}} | {{IHealth}} | {{IShutdown}}',
			'{{E}} | {{EHealth}} | {{EShutdown}}',
			'{{R}} | {{RHealth}} | {{RShutdown}}'
		)
	),
	source: `Layer.mergeAll(
	${marker('expression', 'root', 'Layer.empty')},
	${marker('expression', 'health', 'Layer.empty')},
	${marker('expression', 'shutdown', 'Layer.empty')}
)`
})

export const ApplicationObservedRootLayerTemplate = defineTemplate({
	modelId: 'ApplicationObservedRootLayer',
	version: VERSION,
	description: 'Logs successful root-Layer construction and typed construction failures without changing the Layer outputs.',
	typeParameters: typeParameters(
		['P', 'Root services provided.'],
		['E', 'Root Layer error type.'],
		['R', 'Root Layer requirements.']
	),
	inputs: {
		root: layerInput('Root application Layer.', '{{P}}', '{{E}}', '{{R}}'),
		startedMessage: effectValueInput('Structured value logged after the root Layer is built.'),
		failedMessage: effectValueInput('Structured value included when root construction fails.')
	},
	output: expressionOutput('Observed root application Layer.', layerType('{{P}}', '{{E}}', '{{R}}')),
	source: `Layer.tapError(
	Layer.tap(
		${marker('expression', 'root', 'Layer.empty')},
		() => Effect.logInfo(${marker('expression', 'startedMessage', '"application.ready"')})
	),
	error => Effect.logError({ message: ${marker('expression', 'failedMessage', '"application.startup.failed"')}, error })
)`
})

export const ApplicationLaunchUntilShutdownTemplate = defineTemplate({
	modelId: 'ApplicationLaunchUntilShutdown',
	version: VERSION,
	description: 'Builds a root Layer in a Scope, waits for its internal shutdown service, then exits so Layer finalizers release resources.',
	typeParameters: typeParameters(
		['P', 'Other services provided by the root Layer.'],
		['IShutdown', 'Shutdown service identifier.'],
		['E', 'Root Layer error type.'],
		['R', 'Root Layer requirements.']
	),
	inputs: {
		root: layerInput('Root Layer containing the shutdown service.', '{{P}} | {{IShutdown}}', '{{E}}', '{{R}}'),
		shutdownService: serviceKeyInput('Context.Service key for the shutdown service.', '{{IShutdown}}', applicationShutdownType().ts)
	},
	output: expressionOutput('Application lifetime Effect ending on internal shutdown.', effectType('void', '{{E}}', '{{R}}')),
	source: `Effect.scoped(Effect.gen(function* () {
	const context = yield* Layer.build(${marker('expression', 'root', 'Layer.empty')})
	const shutdown = Context.get(context, ${marker('expression', 'shutdownService', 'ApplicationShutdown')})
	yield* shutdown.await
}))`
})

export const ApplicationManagedRuntimeDeclarationTemplate = defineTemplate({
	modelId: 'ApplicationManagedRuntimeDeclaration',
	version: VERSION,
	description: 'Declares an exported reusable ManagedRuntime for imperative or serverless integration boundaries.',
	typeParameters: typeParameters(
		['R', 'Services supplied by the ManagedRuntime.'],
		['E', 'Root Layer construction error type.']
	),
	inputs: {
		name: identifierInput('Exported ManagedRuntime binding name.'),
		layer: layerInput('Closed application Layer used by the ManagedRuntime.', '{{R}}', '{{E}}', 'never')
	},
	output: statementOutput('Exported ManagedRuntime declaration.'),
	source: `export const ${marker('identifier', 'name', 'ApplicationRuntime')} = ManagedRuntime.make(${marker('expression', 'layer', 'ApplicationLayer')})`
})

export const ApplicationManagedRuntimeDisposeDeclarationTemplate = defineTemplate({
	modelId: 'ApplicationManagedRuntimeDisposeDeclaration',
	version: VERSION,
	description: 'Declares an exported Promise-returning disposer for a reusable application ManagedRuntime.',
	typeParameters: typeParameters(
		['R', 'Services supplied by the ManagedRuntime.'],
		['E', 'ManagedRuntime Layer error type.']
	),
	inputs: {
		name: identifierInput('Exported disposer function name.'),
		runtime: runtimeInput('ManagedRuntime to dispose.', '{{R}}', '{{E}}')
	},
	output: statementOutput('ManagedRuntime disposer declaration.'),
	source: `export const ${marker('identifier', 'name', 'disposeApplication')} = (): Promise<void> => ${marker('expression', 'runtime', 'ApplicationRuntime')}.dispose()`
})

const layerMainTemplate = (
	modelId: 'NodeApplicationAssemblyMain' | 'BunApplicationAssemblyMain' | 'BrowserApplicationAssemblyMain',
	runtime: 'NodeRuntime' | 'BunRuntime' | 'BrowserRuntime',
	platform: string
) => defineTemplate({
	modelId,
	version: VERSION,
	description: `Launches a closed long-lived application Layer with ${platform} runMain signal/error/teardown handling.`,
	typeParameters: typeParameters(['P', 'Services retained by the application Layer.'], ['E', 'Application Layer error type.']),
	inputs: {
		layer: layerInput('Closed application root Layer.', '{{P}}', '{{E}}', 'never')
	},
	output: statementOutput(`${platform} application entry point.`),
	source: `${runtime}.runMain(Layer.launch(${marker('expression', 'layer', 'ApplicationLayer')}))`
})

export const NodeApplicationAssemblyMainTemplate = layerMainTemplate(
	'NodeApplicationAssemblyMain',
	'NodeRuntime',
	'Node.js'
)
export const BunApplicationAssemblyMainTemplate = layerMainTemplate(
	'BunApplicationAssemblyMain',
	'BunRuntime',
	'Bun'
)
export const BrowserApplicationAssemblyMainTemplate = layerMainTemplate(
	'BrowserApplicationAssemblyMain',
	'BrowserRuntime',
	'browser'
)

export const NodeApplicationAssemblySourceFileTemplate = defineTemplate({
	modelId: 'NodeApplicationAssemblySourceFile',
	version: VERSION,
	description: 'Builds a complete Node.js application-assembly source file with core lifecycle primitives and NodeRuntime in scope.',
	inputs: {
		body: statementCollectionInput('Top-level imports/declarations, Layers, and main invocation.')
	},
	output: { kind: 'sourceFile', description: 'Complete Node.js Effect application-assembly source file.' },
	source: `import { Context, Deferred, Effect, Latch, Layer, ManagedRuntime, Metric, Schedule, Schema } from "effect"
import { NodeRuntime, NodeServices } from "@effect/platform-node"

${marker('statement', 'body', 'NodeRuntime.runMain(Effect.void)')}`
})

export const BunApplicationAssemblySourceFileTemplate = defineTemplate({
	modelId: 'BunApplicationAssemblySourceFile',
	version: VERSION,
	description: 'Builds a complete Bun application-assembly source file with core lifecycle primitives and BunRuntime in scope.',
	inputs: {
		body: statementCollectionInput('Top-level imports/declarations, Layers, and main invocation.')
	},
	output: { kind: 'sourceFile', description: 'Complete Bun Effect application-assembly source file.' },
	source: `import { Context, Deferred, Effect, Latch, Layer, ManagedRuntime, Metric, Schedule, Schema } from "effect"
import { BunRuntime, BunServices } from "@effect/platform-bun"

${marker('statement', 'body', 'BunRuntime.runMain(Effect.void)')}`
})

export const BrowserApplicationAssemblySourceFileTemplate = defineTemplate({
	modelId: 'BrowserApplicationAssemblySourceFile',
	version: VERSION,
	description: 'Builds a browser application-assembly source file with BrowserRuntime at the outer execution boundary.',
	inputs: {
		body: statementCollectionInput('Top-level imports/declarations, Layers, and main invocation.')
	},
	output: { kind: 'sourceFile', description: 'Complete browser Effect application-assembly source file.' },
	source: `import { Context, Deferred, Effect, Latch, Layer, ManagedRuntime, Metric, Schedule, Schema } from "effect"
import { BrowserRuntime } from "@effect/platform-browser"

${marker('statement', 'body', 'BrowserRuntime.runMain(Effect.void)')}`
})

export const ManagedRuntimeApplicationSourceFileTemplate = defineTemplate({
	modelId: 'ManagedRuntimeApplicationSourceFile',
	version: VERSION,
	description: 'Builds an application-integration source file centered on a reusable ManagedRuntime rather than a process-owned runMain entry point.',
	inputs: {
		body: statementCollectionInput('Top-level imports/declarations, ManagedRuntime, handlers, and disposer exports.')
	},
	output: { kind: 'sourceFile', description: 'Complete ManagedRuntime-backed Effect integration source file.' },
	source: `import { Context, Effect, Layer, ManagedRuntime, Schema } from "effect"

${marker('statement', 'body', 'export const runtime = ManagedRuntime.make(Layer.empty)')}`
})

export const effectV4ApplicationAssemblyCompositionGraphTemplateInputs = [
	ApplicationServicesLayerTemplate,
	ApplicationRootLayerTemplate,
	ApplicationStartupGatedRootLayerTemplate,
	ApplicationMigrationReadinessLayerTemplate,
	ApplicationReadinessRootLayerTemplate,
	ApplicationHealthFromRootLayerTemplate,
	ApplicationHealthRootLayerTemplate,
	ApplicationShutdownRootLayerTemplate,
	ApplicationLifecycleRootLayerTemplate,
	ApplicationObservedRootLayerTemplate,
	ApplicationLaunchUntilShutdownTemplate,
	ApplicationManagedRuntimeDeclarationTemplate,
	ApplicationManagedRuntimeDisposeDeclarationTemplate,
	NodeApplicationAssemblyMainTemplate,
	BunApplicationAssemblyMainTemplate,
	BrowserApplicationAssemblyMainTemplate,
	NodeApplicationAssemblySourceFileTemplate,
	BunApplicationAssemblySourceFileTemplate,
	BrowserApplicationAssemblySourceFileTemplate,
	ManagedRuntimeApplicationSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
