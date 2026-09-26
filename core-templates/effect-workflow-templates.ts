import { defineTemplate } from './sample-definition.js'
import {
	fragmentCollectionPort,
	fragmentPort,
	literalPort,
	rawCodePort,
	unionPort
} from '../src/templates.js'
import type { TypeDescriptor } from '../src/templates.js'
import {
	effectDurationInput,
	effectExpressionPolicy,
	effectSourceInput,
	effectStructuralType,
	effectType,
	effectValueInput
} from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	configType,
	effectReturningCallbackType,
	expressionOutput,
	identifierInput,
	layerType,
	marker,
	queueType,
	schemaType,
	statementCollectionInput,
	statementOutput,
	streamType,
	stringInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'

const scopeType = '{ readonly __effectScopeRequirement: "Scope" }'

const schemaInput = (description: string, decoded: string, encoded: string, requirements: string) =>
	typedExpressionInput(description, schemaType(decoded, encoded, requirements))

const tagInput = (description: string, identifier: string, service: string) =>
	typedExpressionInput(description, tagType(identifier, service))

const numericInput = (
	description: string,
	schema: Readonly<Record<string, unknown>>,
	type: TypeDescriptor = { ts: 'number' }
) => unionPort({
	options: [
		literalPort({ regionKind: 'expression', schema, description }),
		fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression', type }, description }),
		rawCodePort({ regionKind: 'expression', policy: effectExpressionPolicy, type, description })
	],
	description
})

const positiveIntegerInput = (description: string) => numericInput(description, {
	type: 'integer', minimum: 1
})

const nonNegativeIntegerInput = (description: string) => numericInput(description, {
	type: 'integer', minimum: 0
})

const positiveNumberInput = (description: string) => numericInput(description, {
	type: 'number', exclusiveMinimum: 0
})

export const SchemaValidatedServiceOperationTemplate = defineTemplate({
	modelId: 'SchemaValidatedServiceOperation',
	version: '1.0.0',
	description: 'Decodes unknown input, invokes an Effectful service operation, and encodes its result.',
	typeParameters: typeParameters(
		['A', 'Decoded operation input type.'],
		['I', 'Encoded input schema type.'],
		['B', 'Decoded operation result type.'],
		['O', 'Encoded operation result type.'],
		['E', 'Service operation error type.'],
		['RDecode', 'Input Schema requirements.'],
		['RService', 'Service operation requirements.'],
		['REncode', 'Output Schema requirements.']
	),
	inputs: {
		inputSchema: schemaInput('Schema used to decode the unknown input.', '{{A}}', '{{I}}', '{{RDecode}}'),
		outputSchema: schemaInput('Schema used to encode the operation result.', '{{B}}', '{{O}}', '{{REncode}}'),
		input: valueInput('Unknown operation input.'),
		operation: callbackInput(
			'Effectful service operation.',
			effectReturningCallbackType('value: {{A}}', '{{B}}', '{{E}}', '{{RService}}')
		)
	},
	output: expressionOutput(
		'Schema-validated service operation Effect.',
		effectType('{{O}}', 'unknown | {{E}}', '{{RDecode}} | {{RService}} | {{REncode}}')
	),
	source: `Effect.flatMap(Schema.decodeUnknownEffect(${marker('expression', 'inputSchema', 'Schema.Unknown')})(${marker('expression', 'input', 'undefined')}), value => Effect.flatMap((${marker('expression', 'operation', 'value => Effect.succeed(value)')})(value), Schema.encodeUnknownEffect(${marker('expression', 'outputSchema', 'Schema.Unknown')})))`
})

export const ServiceWithLiveAndTestLayersTemplate = defineTemplate({
	modelId: 'ServiceWithLiveAndTestLayers',
	version: '1.0.0',
	description: 'Declares separately named Live and Test Layers for an existing service tag.',
	typeParameters: typeParameters(
		['I', 'Service identifier type.'],
		['S', 'Service implementation type.']
	),
	inputs: {
		liveName: identifierInput('Exported Live Layer binding name.'),
		testName: identifierInput('Exported Test Layer binding name.'),
		liveTag: tagInput('Service tag used by the Live Layer.', '{{I}}', '{{S}}'),
		testTag: tagInput('Service tag used by the Test Layer.', '{{I}}', '{{S}}'),
		liveService: valueInput('Live service implementation.', { ts: '{{S}}' }),
		testService: valueInput('Test service implementation.', { ts: '{{S}}' })
	},
	output: statementOutput('Exported Live and Test Layer binding declarations.'),
	source: `export const ${marker('identifier', 'liveName', 'ServiceLive')} = Layer.succeed(${marker('expression', 'liveTag', 'Service')}, ${marker('expression', 'liveService', '{}')}), ${marker('identifier', 'testName', 'ServiceTest')} = Layer.succeed(${marker('expression', 'testTag', 'Service')}, ${marker('expression', 'testService', '{}')});`
})

export const ConfigToApplicationLayerTemplate = defineTemplate({
	modelId: 'ConfigToApplicationLayer',
	version: '1.0.0',
	description: 'Loads Config, constructs a service value, and exposes it as an application Layer.',
	typeParameters: typeParameters(
		['C', 'Loaded configuration type.'],
		['I', 'Provided service identifier type.'],
		['S', 'Constructed service implementation type.']
	),
	inputs: {
		tag: tagInput('Application service tag.', '{{I}}', '{{S}}'),
		config: typedExpressionInput('Configuration description.', configType('{{C}}')),
		makeService: callbackInput('Pure service constructor.', { ts: '(config: {{C}}) => {{S}}' })
	},
	output: expressionOutput('Config-backed application Layer.', layerType('{{I}}', 'unknown', 'never')),
	source: `Layer.effect(${marker('expression', 'tag', 'Service')}, Effect.map(${marker('expression', 'config', 'Config.String()')}, ${marker('expression', 'makeService', 'config => config')}))`
})

export const ResilientClientCallTemplate = defineTemplate({
	modelId: 'ResilientClientCall',
	version: '1.0.0',
	description: 'Runs a client call with per-attempt timeout, bounded jittered exponential retry, and tagged recovery.',
	typeParameters: typeParameters(
		['A', 'Client call success type.'],
		['E', 'Client call expected-error type.'],
		['R', 'Client call requirements.'],
		['B', 'Recovery success type.'],
		['E2', 'Recovery error type.'],
		['R2', 'Recovery requirements.'],
		['EOut', 'Errors not handled by the selected tag.']
	),
	inputs: {
		call: effectSourceInput('Client call Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
		timeout: effectDurationInput('Timeout applied independently to each attempt.'),
		baseDelay: effectDurationInput('Initial exponential-backoff delay.'),
		factor: positiveNumberInput('Positive exponential-backoff factor.'),
		retries: nonNegativeIntegerInput('Maximum retry count.'),
		tag: stringInput('Expected-error _tag recovered after retries are exhausted.'),
		recover: callbackInput(
			'Tagged recovery handler.',
			effectReturningCallbackType('error: {{E}}', '{{B}}', '{{E2}}', '{{R2}}')
		)
	},
	output: expressionOutput(
		'Resilient client-call Effect.',
		effectType('{{A}} | {{B}}', '{{EOut}} | {{E2}}', '{{R}} | {{R2}}')
	),
	source: `Effect.retry(Effect.timeout(${marker('expression', 'call', 'Effect.void')}, ${marker('expression', 'timeout', '1000')}), Schedule.jittered(Schedule.max([Schedule.exponential(${marker('expression', 'baseDelay', '100')}, ${marker('expression', 'factor', '2')}), Schedule.recurs(${marker('expression', 'retries', '3')})]))).pipe(Effect.catchTag(${marker('string', 'tag', '"ClientError"')}, ${marker('expression', 'recover', '() => Effect.void')}))`
})

export const BoundedParallelTraverseTemplate = defineTemplate({
	modelId: 'BoundedParallelTraverse',
	version: '1.0.0',
	description: 'Traverses an Iterable with an Effectful callback under a positive concurrency bound.',
	typeParameters: typeParameters(
		['A', 'Input element type.'],
		['B', 'Result element type.'],
		['E', 'Traversal error type.'],
		['R', 'Traversal requirements.']
	),
	inputs: {
		iterable: effectValueInput('Iterable input.', { ts: 'Iterable<{{A}}>' }),
		body: callbackInput(
			'Effectful element callback.',
			effectReturningCallbackType('value: {{A}}, index: number', '{{B}}', '{{E}}', '{{R}}')
		),
		concurrency: positiveIntegerInput('Positive maximum concurrency.')
	},
	output: expressionOutput(
		'Bounded parallel traversal Effect.',
		effectType('ReadonlyArray<{{B}}>', '{{E}}', '{{R}}')
	),
	source: `Effect.forEach(${marker('expression', 'iterable', '[]')}, ${marker('expression', 'body', 'value => Effect.succeed(value)')}, { concurrency: ${marker('expression', 'concurrency', '1')} })`
})

export const ScopedResourceServiceTemplate = defineTemplate({
	modelId: 'ScopedResourceService',
	version: '1.0.0',
	description: 'Acquires and releases a resource and exposes it as a scoped service Layer.',
	typeParameters: typeParameters(
		['I', 'Provided service identifier type.'],
		['S', 'Acquired service implementation type.'],
		['E', 'Acquisition error type.'],
		['RAcquire', 'Acquisition requirements.'],
		['RRelease', 'Release requirements.']
	),
	inputs: {
		tag: tagInput('Service tag.', '{{I}}', '{{S}}'),
		acquire: effectSourceInput('Service acquisition Effect.', effectType('{{S}}', '{{E}}', '{{RAcquire}}')),
		release: callbackInput(
			'Infallible release callback receiving the service and Exit.',
			effectReturningCallbackType('service: {{S}}, exit: unknown', 'unknown', 'never', '{{RRelease}}')
		)
	},
	output: expressionOutput(
		'Scoped resource service Layer.',
		layerType('{{I}}', '{{E}}', '{{RAcquire}} | {{RRelease}}')
	),
	source: `Layer.effect(${marker('expression', 'tag', 'Service')}, Effect.acquireRelease(${marker('expression', 'acquire', 'Effect.succeed({})')}, ${marker('expression', 'release', '() => Effect.void')}))`
})

export const QueueWorkerWithScopedFiberTemplate = defineTemplate({
	modelId: 'QueueWorkerWithScopedFiber',
	version: '1.0.0',
	description: 'Runs a Queue worker forever in a Fiber tied to the current Scope.',
	typeParameters: typeParameters(
		['A', 'Queue element type.'],
		['E', 'Worker error type.'],
		['R', 'Worker requirements.']
	),
	inputs: {
		queue: typedExpressionInput('Queue consumed by the worker.', queueType('{{A}}')),
		worker: callbackInput(
			'Effectful Queue-item processor.',
			effectReturningCallbackType('value: {{A}}', 'unknown', '{{E}}', '{{R}}')
		)
	},
	output: expressionOutput(
		'Scoped Queue-worker Fiber creation Effect.',
		effectType(
			`{ readonly pipe: () => unknown; readonly __fiberSuccess?: () => never; readonly __fiberError?: () => {{E}} }`,
			'never',
			`{{R}} | ${scopeType}`
		)
	),
	source: `Effect.forkScoped(Effect.forever(Effect.flatMap(Queue.take(${marker('expression', 'queue', 'queue')}), ${marker('expression', 'worker', 'value => Effect.succeed(value)')})))`
})

export const SchemaValidatedHttpEndpointTemplate = defineTemplate({
	modelId: 'SchemaValidatedHttpEndpoint',
	version: '1.0.0',
	description: 'Creates a framework-neutral request handler with decoded input and encoded output.',
	typeParameters: typeParameters(
		['Request', 'Framework request type.'],
		['Response', 'Framework response type.'],
		['A', 'Decoded request body type.'],
		['I', 'Encoded request body type.'],
		['B', 'Decoded operation result type.'],
		['O', 'Encoded response body type.'],
		['E', 'Endpoint operation error type.'],
		['RDecode', 'Request Schema requirements.'],
		['ROperation', 'Endpoint operation requirements.'],
		['REncode', 'Response Schema requirements.']
	),
	inputs: {
		requestSchema: schemaInput('Schema used to decode the extracted request input.', '{{A}}', '{{I}}', '{{RDecode}}'),
		responseSchema: schemaInput('Schema used to encode the operation result.', '{{B}}', '{{O}}', '{{REncode}}'),
		extract: callbackInput('Pure request-input extractor.', { ts: '(request: {{Request}}) => unknown' }),
		operation: callbackInput(
			'Effectful endpoint operation.',
			effectReturningCallbackType('value: {{A}}', '{{B}}', '{{E}}', '{{ROperation}}')
		),
		respond: callbackInput('Pure encoded-response constructor.', { ts: '(encoded: {{O}}) => {{Response}}' })
	},
	output: expressionOutput(
		'Framework-neutral Schema-validated endpoint handler.',
		{
			ts: `(request: {{Request}}) => ${effectStructuralType(
				'{{Response}}',
				'unknown | {{E}}',
				'{{RDecode}} | {{ROperation}} | {{REncode}}'
			)}`
		}
	),
	source: `(request => Effect.flatMap(Schema.decodeUnknownEffect(${marker('expression', 'requestSchema', 'Schema.Unknown')})((${marker('expression', 'extract', 'request => request')})(request)), value => Effect.flatMap((${marker('expression', 'operation', 'value => Effect.succeed(value)')})(value), result => Effect.map(Schema.encodeUnknownEffect(${marker('expression', 'responseSchema', 'Schema.Unknown')})(result), ${marker('expression', 'respond', 'encoded => encoded')}))))`
})

export const StreamIngestionPipelineTemplate = defineTemplate({
	modelId: 'StreamIngestionPipeline',
	version: '1.0.0',
	description: 'Decodes every unknown Stream element and returns a reusable validated Stream.',
	typeParameters: typeParameters(
		['A', 'Decoded Stream element type.'],
		['I', 'Encoded Schema input type.'],
		['ESource', 'Source Stream error type.'],
		['RSource', 'Source Stream requirements.'],
		['RSchema', 'Element Schema requirements.']
	),
	inputs: {
		stream: typedExpressionInput(
			'Unknown-element source Stream.',
			streamType('unknown', '{{ESource}}', '{{RSource}}')
		),
		schema: schemaInput('Schema used to decode every Stream element.', '{{A}}', '{{I}}', '{{RSchema}}')
	},
	output: expressionOutput(
		'Schema-validated ingestion Stream.',
		streamType('{{A}}', '{{ESource}} | unknown', '{{RSource}} | {{RSchema}}')
	),
	source: `Stream.mapEffect(${marker('expression', 'stream', 'Stream.empty')}, Schema.decodeUnknownEffect(${marker('expression', 'schema', 'Schema.Unknown')}))`
})

export const ApplicationMainTemplate = defineTemplate({
	modelId: 'ApplicationMain',
	version: '1.0.0',
	description: 'Builds a complete Effect application with Layer composition, ManagedRuntime execution, and disposal.',
	typeParameters: typeParameters(
		['A', 'Application program success type.'],
		['EProgram', 'Application program error type.'],
		['P', 'Services required by the program and provided by the application Layer.'],
		['ELayer', 'Application Layer construction error type.']
	),
	inputs: {
		declarations: statementCollectionInput('Optional top-level application declarations.', 0),
		layers: fragmentCollectionPort({
			regionKind: 'expression',
			accepts: { outputKind: 'expression', type: layerType('{{P}}', '{{ELayer}}', 'never') },
			minItems: 1,
			separator: ', ',
			description: 'Closed application Layers composed with Layer.mergeAll.'
		}),
		program: effectSourceInput(
			'Application Effect requiring the services supplied by the merged Layer.',
			effectType('{{A}}', '{{EProgram}}', '{{P}}')
		)
	},
	output: { kind: 'sourceFile', description: 'Complete ManagedRuntime-backed Effect application source file.' },
	source: `import { Config, Context, Deferred, Effect, Fiber, Layer, ManagedRuntime, Metric, Option, PubSub, Queue, Ref, Schedule, Schema, Stream } from "effect"
${marker('statement', 'declarations', 'void 0;')}
const ApplicationLayer = Layer.mergeAll(${marker('expression', 'layers', 'Layer.empty')})
const ApplicationRuntime = ManagedRuntime.make(ApplicationLayer)
const ApplicationProgram = ${marker('expression', 'program', 'Effect.void')}
void ApplicationRuntime.runPromise(ApplicationProgram).finally(() => ApplicationRuntime.dispose())`
})

export const effectWorkflowGraphTemplateInputs = [
	SchemaValidatedServiceOperationTemplate,
	ServiceWithLiveAndTestLayersTemplate,
	ConfigToApplicationLayerTemplate,
	ResilientClientCallTemplate,
	BoundedParallelTraverseTemplate,
	ScopedResourceServiceTemplate,
	QueueWorkerWithScopedFiberTemplate,
	SchemaValidatedHttpEndpointTemplate,
	StreamIngestionPipelineTemplate,
	ApplicationMainTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
