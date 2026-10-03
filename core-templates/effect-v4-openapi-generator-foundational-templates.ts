import { defineTemplate } from './sample-definition.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	layerType,
	marker,
	scheduleType,
	statementCollectionInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	httpApiInput,
	httpApiType,
	httpClientErrorType,
	httpClientInput,
	httpClientRequirement,
	httpClientType,
	openApiSpecType
} from './effect-http-rest-template-helpers.js'
import {
	generatedFactoryInput,
	generatedHttpClientType,
	generatedSourceBundleType,
	generatedSourceWithWarningsType,
	jsonSchemaNodeType,
	openApiGenerationWarningErrorType,
	openApiGeneratorRequirement,
	openApiGeneratorWarningType,
	openApiGeneratorType
} from './effect-openapi-generated-template-helpers.js'

/** Effect V4 @effect/openapi-generator foundations. */
const VERSION = '1.0.0' as const
const specInput = (description: string) => typedExpressionInput(description, openApiSpecType())
const generatorInput = (description: string) => typedExpressionInput(description, openApiGeneratorType())
const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

export const OpenApiGeneratorSchemaLayerTemplate = defineTemplate({
	modelId: 'OpenApiGeneratorSchemaLayer', version: VERSION,
	description: 'Provides @effect/openapi-generator for Schema-backed HttpClient and HttpApi source generation.',
	inputs: {},
	output: expressionOutput('Schema-backed OpenAPI generator Layer.', layerType(openApiGeneratorRequirement, 'never', 'never')),
	source: 'OpenApiGenerator.layerTransformerSchema'
})

export const OpenApiGeneratorTypeOnlyLayerTemplate = defineTemplate({
	modelId: 'OpenApiGeneratorTypeOnlyLayer', version: VERSION,
	description: 'Provides @effect/openapi-generator for type-only HttpClient source generation.',
	inputs: {},
	output: expressionOutput('Type-only OpenAPI generator Layer.', layerType(openApiGeneratorRequirement, 'never', 'never')),
	source: 'OpenApiGenerator.layerTransformerTs'
})

export const OpenApiGeneratorGenerateTemplate = defineTemplate({
	modelId: 'OpenApiGeneratorGenerate', version: VERSION,
	description: 'Generates Effect source from an OpenAPI/Swagger specification using explicit generator options.',
	inputs: { spec: specInput('OpenAPI specification.'), options: valueInput('OpenApiGenerateOptions: name, format, and optional hooks.') },
	output: expressionOutput('Generated TypeScript source Effect.', effectType('string', 'never', openApiGeneratorRequirement)),
	source: `Effect.flatMap(OpenApiGenerator.OpenApiGenerator, generator => generator.generate(${marker('expression', 'spec', 'spec')}, ${marker('expression', 'options', '{ name: "Client", format: "httpclient" }')}))`
})

const formatTemplate = (
	modelId: 'OpenApiGenerateHttpClient' | 'OpenApiGenerateHttpClientTypeOnly' | 'OpenApiGenerateHttpApi',
	format: 'httpclient' | 'httpclient-type-only' | 'httpapi',
	description: string
) => defineTemplate({
	modelId, version: VERSION, description,
	inputs: { spec: specInput('OpenAPI specification.'), name: effectValueInput('Generated export/client/API name.', { ts: 'string' }) },
	output: expressionOutput('Generated TypeScript source Effect.', effectType('string', 'never', openApiGeneratorRequirement)),
	source: `Effect.flatMap(OpenApiGenerator.OpenApiGenerator, generator => generator.generate(${marker('expression', 'spec', 'spec')}, { name: ${marker('expression', 'name', '"Client"')}, format: "${format}" }))`
})

export const OpenApiGenerateHttpClientTemplate = formatTemplate('OpenApiGenerateHttpClient', 'httpclient', 'Generates a runtime-Schema-backed Effect HttpClient module.')
export const OpenApiGenerateHttpClientTypeOnlyTemplate = formatTemplate('OpenApiGenerateHttpClientTypeOnly', 'httpclient-type-only', 'Generates a type-only Effect HttpClient module without runtime Schema decoding.')
export const OpenApiGenerateHttpApiTemplate = formatTemplate('OpenApiGenerateHttpApi', 'httpapi', 'Generates an executable Effect HttpApi contract module from OpenAPI.')

export const OpenApiGenerateWithWarningsTemplate = defineTemplate({
	modelId: 'OpenApiGenerateWithWarnings', version: VERSION,
	description: 'Generates source while collecting structured non-fatal generator warnings as data.',
	inputs: { spec: specInput('OpenAPI specification.'), name: effectValueInput('Generated name.', { ts: 'string' }), format: effectValueInput('Generator format.', { ts: '"httpclient" | "httpclient-type-only" | "httpapi"' }) },
	output: expressionOutput('Generated source plus warnings.', effectType(generatedSourceWithWarningsType().ts, 'never', openApiGeneratorRequirement)),
	source: `Effect.gen(function* () {
	const generator = yield* OpenApiGenerator.OpenApiGenerator
	const warnings: Array<OpenApiGenerator.OpenApiGeneratorWarning> = []
	const source = yield* generator.generate(${marker('expression', 'spec', 'spec')}, { name: ${marker('expression', 'name', '"Client"')}, format: ${marker('expression', 'format', '"httpclient"')}, onWarning: warning => warnings.push(warning) })
	return { source, warnings }
})`
})

export const OpenApiGenerateStrictTemplate = defineTemplate({
	modelId: 'OpenApiGenerateStrict', version: VERSION,
	description: 'Generates source and fails when the generator emits any non-fatal warning.',
	inputs: { spec: specInput('OpenAPI specification.'), name: effectValueInput('Generated name.', { ts: 'string' }), format: effectValueInput('Generator format.', { ts: '"httpclient" | "httpclient-type-only" | "httpapi"' }) },
	output: expressionOutput('Strict generated source Effect.', effectType('string', openApiGenerationWarningErrorType, openApiGeneratorRequirement)),
	source: `Effect.gen(function* () {
	const generator = yield* OpenApiGenerator.OpenApiGenerator
	const warnings: Array<OpenApiGenerator.OpenApiGeneratorWarning> = []
	const source = yield* generator.generate(${marker('expression', 'spec', 'spec')}, { name: ${marker('expression', 'name', '"Client"')}, format: ${marker('expression', 'format', '"httpclient"')}, onWarning: warning => warnings.push(warning) })
	if (warnings.length > 0) return yield* Effect.fail({ _tag: "OpenApiGenerationWarningError" as const, warnings })
	return source
})`
})

export const OpenApiGenerateWithSchemaTransformTemplate = defineTemplate({
	modelId: 'OpenApiGenerateWithSchemaTransform', version: VERSION,
	description: 'Generates source after applying a pure transform to each visited JSON Schema node.',
	inputs: {
		spec: specInput('OpenAPI specification.'),
		name: effectValueInput('Generated name.', { ts: 'string' }),
		format: effectValueInput('Generator format.', { ts: '"httpclient" | "httpclient-type-only" | "httpapi"' }),
		onEnter: callbackInput('Pure JSON Schema node transform.', { ts: `(schema: ${jsonSchemaNodeType().ts}) => ${jsonSchemaNodeType().ts}` })
	},
	output: expressionOutput('Generated transformed source Effect.', effectType('string', 'never', openApiGeneratorRequirement)),
	source: `Effect.flatMap(OpenApiGenerator.OpenApiGenerator, generator => generator.generate(${marker('expression', 'spec', 'spec')}, { name: ${marker('expression', 'name', '"Client"')}, format: ${marker('expression', 'format', '"httpclient"')}, onEnter: ${marker('expression', 'onEnter', 'schema => schema')} }))`
})

export const OpenApiGenerateAllFormatsTemplate = defineTemplate({
	modelId: 'OpenApiGenerateAllFormats', version: VERSION,
	description: 'Generates Schema-backed client, type-only client, and HttpApi source from one specification.',
	inputs: { spec: specInput('OpenAPI specification.'), name: effectValueInput('Base generated name.', { ts: 'string' }) },
	output: expressionOutput('All generator outputs.', effectType(generatedSourceBundleType().ts, 'never', openApiGeneratorRequirement)),
	source: `Effect.gen(function* () {
	const generator = yield* OpenApiGenerator.OpenApiGenerator
	const spec = ${marker('expression', 'spec', '(undefined as any)')}
	const name = ${marker('expression', 'name', '"Api"')}
	const httpclient = yield* generator.generate(spec, { name, format: "httpclient" })
	const httpclientTypeOnly = yield* generator.generate(spec, { name, format: "httpclient-type-only" })
	const httpapi = yield* generator.generate(spec, { name, format: "httpapi" })
	return { httpclient, httpclientTypeOnly, httpapi }
})`
})

export const OpenApiGeneratedClientMakeTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedClientMake', version: VERSION,
	description: 'Instantiates a generated HttpClient module with an explicit Effect HttpClient.',
	typeParameters: typeParameters(['Client', 'Generated client object type.']),
	inputs: { factory: generatedFactoryInput('Generated module make function.', '{{Client}}'), httpClient: httpClientInput('HttpClient supplied to the generated client.') },
	output: expressionOutput('Generated client object.', generatedHttpClientType('{{Client}}')),
	source: `${marker('expression', 'factory', 'make')}(${marker('expression', 'httpClient', 'httpClient')})`
})

export const OpenApiGeneratedClientMakeWithTransformTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedClientMakeWithTransform', version: VERSION,
	description: 'Instantiates a generated client with a per-request Effectful HttpClient transform.',
	typeParameters: typeParameters(['Client', 'Generated client object type.']),
	inputs: {
		factory: generatedFactoryInput('Generated module make function.', '{{Client}}'),
		httpClient: httpClientInput('Base HttpClient.'),
		transformClient: callbackInput('Per-request HttpClient transform.', { ts: `(client: ${httpClientType().ts}) => ${effectType(httpClientType().ts, 'never', 'never').ts}` })
	},
	output: expressionOutput('Generated client object.', generatedHttpClientType('{{Client}}')),
	source: `${marker('expression', 'factory', 'make')}(${marker('expression', 'httpClient', 'httpClient')}, { transformClient: ${marker('expression', 'transformClient', 'client => Effect.succeed(client)')} })`
})

export const OpenApiGeneratedClientServiceLayerTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedClientServiceLayer', version: VERSION,
	description: 'Exposes a compiled generated HttpClient module as an application Context.Service.',
	typeParameters: typeParameters(['I', 'Client service identifier.'], ['Client', 'Generated client type.']),
	inputs: { service: serviceKeyInput('Client service key.', '{{I}}', '{{Client}}'), factory: generatedFactoryInput('Generated module make function.', '{{Client}}') },
	output: expressionOutput('Generated client service Layer.', layerType('{{I}}', 'never', httpClientRequirement)),
	source: `Layer.effect(${marker('expression', 'service', 'GeneratedClient')}, Effect.map(HttpClient.HttpClient, httpClient => ${marker('expression', 'factory', 'make')}(httpClient)))`
})

export const OpenApiGeneratedClientCallTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedClientCall', version: VERSION,
	description: 'Invokes one operation on a compiled generated client without coupling the graph to a generated operation name.',
	typeParameters: typeParameters(['Client', 'Generated client type.'], ['A', 'Operation success type.'], ['E', 'Operation error type.'], ['R', 'Operation requirements.']),
	inputs: { client: typedExpressionInput('Generated client object.', generatedHttpClientType('{{Client}}')), call: callbackInput('Generated operation invocation.', { ts: `(client: {{Client}}) => ${effectType('{{A}}', '{{E}}', '{{R}}').ts}` }) },
	output: expressionOutput('Generated client operation Effect.', effectType('{{A}}', '{{E}}', '{{R}}')),
	source: `(${marker('expression', 'call', 'client => Effect.void')})(${marker('expression', 'client', 'client')})`
})

export const OpenApiGeneratedClientObservedCallTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedClientObservedCall', version: VERSION,
	description: 'Runs a generated-client operation inside a tracing span.',
	typeParameters: typeParameters(['Client','Generated client type.'],['A','Success type.'],['E','Error type.'],['R','Requirements.']),
	inputs: { client: typedExpressionInput('Generated client object.', generatedHttpClientType('{{Client}}')), call: callbackInput('Generated operation invocation.', { ts: `(client: {{Client}}) => ${effectType('{{A}}','{{E}}','{{R}}').ts}` }), spanName: effectValueInput('Tracing span name.', { ts: 'string' }) },
	output: expressionOutput('Observed generated-client operation.', effectType('{{A}}','{{E}}','{{R}}')),
	source: `Effect.withSpan((${marker('expression','call','client => Effect.void')})(${marker('expression','client','client')}), ${marker('expression','spanName','"openapi.client"')})`
})

export const OpenApiGeneratedClientRetryCallTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedClientRetryCall', version: VERSION,
	description: 'Retries a generated-client operation with a caller-supplied Schedule.',
	typeParameters: typeParameters(['Client','Generated client type.'],['A','Success type.'],['E','Error type.'],['R','Requirements.'],['Out','Schedule output.'],['RSchedule','Schedule requirements.']),
	inputs: { client: typedExpressionInput('Generated client object.', generatedHttpClientType('{{Client}}')), call: callbackInput('Generated operation invocation.', { ts: `(client: {{Client}}) => ${effectType('{{A}}','{{E}}','{{R}}').ts}` }), schedule: typedExpressionInput('Retry Schedule.', scheduleType('{{Out}}','{{E}}','{{RSchedule}}')) },
	output: expressionOutput('Retried generated-client operation.', effectType('{{A}}','{{E}}','{{R}} | {{RSchedule}}')),
	source: `Effect.retry((${marker('expression','call','client => Effect.void')})(${marker('expression','client','client')}), ${marker('expression','schedule','Schedule.recurs(2)')})`
})

export const OpenApiGeneratedHttpApiRoundTripTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedHttpApiRoundTrip', version: VERSION,
	description: 'Converts an Effect HttpApi to OpenAPI 3.1 and regenerates an HttpApi source module from that contract.',
	inputs: { api: httpApiInput('Effect HttpApi contract.'), name: effectValueInput('Generated HttpApi class name.', { ts: 'string' }), openApiOptions: valueInput('OpenApi.fromApi options.') },
	output: expressionOutput('Regenerated HttpApi source Effect.', effectType('string','never',openApiGeneratorRequirement)),
	source: `Effect.flatMap(OpenApiGenerator.OpenApiGenerator, generator => generator.generate(OpenApi.fromApi(${marker('expression','api','HttpApi.make("Api")')}, ${marker('expression','openApiOptions','{}')}), { name: ${marker('expression','name','"GeneratedApi"')}, format: "httpapi" }))`
})

export const OpenApiGeneratorBuildSourceFileTemplate = defineTemplate({
	modelId: 'OpenApiGeneratorBuildSourceFile', version: VERSION,
	description: 'Builds an Effect source file for programmatic OpenAPI code generation.',
	inputs: { body: statementCollectionInput('Top-level generation declarations and program.') },
	output: { kind: 'sourceFile', description: 'Complete OpenAPI generator source file.' },
	source: `import { Effect, Layer } from "effect"
import { FileSystem } from "effect"
import { OpenApi } from "effect/unstable/httpapi"
import * as OpenApiGenerator from "@effect/openapi-generator/OpenApiGenerator"

${marker('statement','body','export const program = Effect.void')}`
})

export const effectV4OpenApiGeneratorFoundationalGraphTemplateInputs = [
	OpenApiGeneratorSchemaLayerTemplate,
	OpenApiGeneratorTypeOnlyLayerTemplate,
	OpenApiGeneratorGenerateTemplate,
	OpenApiGenerateHttpClientTemplate,
	OpenApiGenerateHttpClientTypeOnlyTemplate,
	OpenApiGenerateHttpApiTemplate,
	OpenApiGenerateWithWarningsTemplate,
	OpenApiGenerateStrictTemplate,
	OpenApiGenerateWithSchemaTransformTemplate,
	OpenApiGenerateAllFormatsTemplate,
	OpenApiGeneratedClientMakeTemplate,
	OpenApiGeneratedClientMakeWithTransformTemplate,
	OpenApiGeneratedClientServiceLayerTemplate,
	OpenApiGeneratedClientCallTemplate,
	OpenApiGeneratedClientObservedCallTemplate,
	OpenApiGeneratedClientRetryCallTemplate,
	OpenApiGeneratedHttpApiRoundTripTemplate,
	OpenApiGeneratorBuildSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
