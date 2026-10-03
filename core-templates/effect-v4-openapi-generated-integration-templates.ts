import { defineTemplate } from './sample-definition.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	layerType,
	marker,
	statementCollectionInput,
	tagType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import {
	fileSystemRequirement,
	platformErrorType
} from './effect-platform-template-helpers.js'
import {
	httpApiInput,
	httpClientRequirement,
	httpClientType,
	httpRouterRequirement,
	httpServerRequirement,
	openApiSpecType
} from './effect-http-rest-template-helpers.js'
import {
	generatedFactoryInput,
	generatedHttpClientType,
	generatedSourceBundleType,
	openApiGenerationWarningErrorType,
	openApiGeneratorRequirement
} from './effect-openapi-generated-template-helpers.js'

/** Production OpenAPI-generated integration compositions. */
const VERSION = '1.0.0' as const
const specInput = (description: string) => typedExpressionInput(description, openApiSpecType())
const layerInput = (description: string, provided = 'unknown', error = 'unknown', requirements = 'unknown') =>
	typedExpressionInput(description, layerType(provided, error, requirements))
const serviceKeyInput = (description: string, identifier = 'unknown', service = 'unknown') =>
	typedExpressionInput(description, tagType(identifier, service))

const generateFileTemplate = (
	modelId: 'OpenApiGenerateHttpClientFile' | 'OpenApiGenerateHttpClientTypeOnlyFile' | 'OpenApiGenerateHttpApiFile',
	format: 'httpclient' | 'httpclient-type-only' | 'httpapi',
	description: string
) => defineTemplate({
	modelId, version: VERSION, description,
	inputs: {
		spec: specInput('OpenAPI specification.'),
		name: effectValueInput('Generated module name.', { ts: 'string' }),
		path: effectValueInput('Destination TypeScript file path.', { ts: 'string' })
	},
	output: expressionOutput('Generation and file-write Effect.', effectType('void', platformErrorType, `${openApiGeneratorRequirement} | ${fileSystemRequirement}`)),
	source: `Effect.gen(function* () {
	const generator = yield* OpenApiGenerator.OpenApiGenerator
	const fs = yield* FileSystem.FileSystem
	const source = yield* generator.generate(${marker('expression','spec','spec')}, { name: ${marker('expression','name','"Client"')}, format: "${format}" })
	yield* fs.writeFileString(${marker('expression','path','"./generated.ts"')}, source)
})`
})

export const OpenApiGenerateHttpClientFileTemplate = generateFileTemplate('OpenApiGenerateHttpClientFile', 'httpclient', 'Generates a Schema-backed HttpClient module and writes it to disk.')
export const OpenApiGenerateHttpClientTypeOnlyFileTemplate = generateFileTemplate('OpenApiGenerateHttpClientTypeOnlyFile', 'httpclient-type-only', 'Generates a type-only HttpClient module and writes it to disk.')
export const OpenApiGenerateHttpApiFileTemplate = generateFileTemplate('OpenApiGenerateHttpApiFile', 'httpapi', 'Generates an Effect HttpApi module and writes it to disk.')

export const OpenApiGeneratedSourceWriteIfChangedTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedSourceWriteIfChanged', version: VERSION,
	description: 'Writes generated TypeScript only when the destination contents differ, avoiding unnecessary build churn.',
	inputs: { path: effectValueInput('Generated file path.', { ts: 'string' }), source: effectValueInput('Generated TypeScript source.', { ts: 'string' }) },
	output: expressionOutput('Whether the generated file changed.', effectType('boolean', platformErrorType, fileSystemRequirement)),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const path = ${marker('expression','path','"./generated.ts"')}
	const source = ${marker('expression','source','""')}
	const exists = yield* fs.exists(path)
	if (exists) {
		const current = yield* fs.readFileString(path, "utf8")
		if (current === source) return false
	}
	yield* fs.writeFileString(path, source)
	return true
})`
})

export const OpenApiGeneratedSourceDriftCheckTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedSourceDriftCheck', version: VERSION,
	description: 'Fails CI when a checked-in generated source file does not exactly match newly generated source.',
	inputs: { path: effectValueInput('Checked-in generated file path.', { ts: 'string' }), source: effectValueInput('Freshly generated TypeScript source.', { ts: 'string' }) },
	output: expressionOutput('Generated-source drift check.', effectType('void', `${platformErrorType} | { readonly _tag: "OpenApiGeneratedSourceDrift"; readonly path: string }`, fileSystemRequirement)),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const path = ${marker('expression','path','"./generated.ts"')}
	const expected = ${marker('expression','source','""')}
	const actual = yield* fs.readFileString(path, "utf8")
	if (actual !== expected) return yield* Effect.fail({ _tag: "OpenApiGeneratedSourceDrift" as const, path })
})`
})

export const OpenApiGenerateStrictFileTemplate = defineTemplate({
	modelId: 'OpenApiGenerateStrictFile', version: VERSION,
	description: 'Generates one target, fails on any generator warning, and writes the resulting source file.',
	inputs: { spec: specInput('OpenAPI specification.'), name: effectValueInput('Generated name.', { ts: 'string' }), format: effectValueInput('Generator format.', { ts: '"httpclient" | "httpclient-type-only" | "httpapi"' }), path: effectValueInput('Destination path.', { ts: 'string' }) },
	output: expressionOutput('Strict generation/write Effect.', effectType('void', `${openApiGenerationWarningErrorType} | ${platformErrorType}`, `${openApiGeneratorRequirement} | ${fileSystemRequirement}`)),
	source: `Effect.gen(function* () {
	const generator = yield* OpenApiGenerator.OpenApiGenerator
	const fs = yield* FileSystem.FileSystem
	const warnings: Array<OpenApiGenerator.OpenApiGeneratorWarning> = []
	const source = yield* generator.generate(${marker('expression','spec','spec')}, { name: ${marker('expression','name','"Client"')}, format: ${marker('expression','format','"httpclient"')}, onWarning: warning => warnings.push(warning) })
	if (warnings.length > 0) return yield* Effect.fail({ _tag: "OpenApiGenerationWarningError" as const, warnings })
	yield* fs.writeFileString(${marker('expression','path','"./generated.ts"')}, source)
})`
})

export const OpenApiGenerateAllFormatsFilesTemplate = defineTemplate({
	modelId: 'OpenApiGenerateAllFormatsFiles', version: VERSION,
	description: 'Generates all three OpenAPI generator formats and writes them to three explicit files.',
	inputs: {
		spec: specInput('OpenAPI specification.'), name: effectValueInput('Base generated name.', { ts: 'string' }),
		httpClientPath: effectValueInput('Schema-backed client path.', { ts: 'string' }),
		typeOnlyPath: effectValueInput('Type-only client path.', { ts: 'string' }),
		httpApiPath: effectValueInput('Generated HttpApi path.', { ts: 'string' })
	},
	output: expressionOutput('All-format generation/write Effect.', effectType('void', platformErrorType, `${openApiGeneratorRequirement} | ${fileSystemRequirement}`)),
	source: `Effect.gen(function* () {
	const generator = yield* OpenApiGenerator.OpenApiGenerator
	const fs = yield* FileSystem.FileSystem
	const spec = ${marker('expression','spec','(undefined as any)')}
	const name = ${marker('expression','name','"Api"')}
	const httpclient = yield* generator.generate(spec, { name, format: "httpclient" })
	const typeOnly = yield* generator.generate(spec, { name, format: "httpclient-type-only" })
	const httpapi = yield* generator.generate(spec, { name, format: "httpapi" })
	yield* fs.writeFileString(${marker('expression','httpClientPath','"./generated-client.ts"')}, httpclient)
	yield* fs.writeFileString(${marker('expression','typeOnlyPath','"./generated-client-types.ts"')}, typeOnly)
	yield* fs.writeFileString(${marker('expression','httpApiPath','"./generated-api.ts"')}, httpapi)
})`
})

export const OpenApiJsonSpecGenerateTemplate = defineTemplate({
	modelId: 'OpenApiJsonSpecGenerate', version: VERSION,
	description: 'Reads an OpenAPI JSON file, parses it, and generates one selected Effect source target.',
	inputs: { specPath: effectValueInput('OpenAPI JSON file path.', { ts: 'string' }), name: effectValueInput('Generated name.', { ts: 'string' }), format: effectValueInput('Generator format.', { ts: '"httpclient" | "httpclient-type-only" | "httpapi"' }) },
	output: expressionOutput('Generated source from JSON spec.', effectType('string', `${platformErrorType} | unknown`, `${openApiGeneratorRequirement} | ${fileSystemRequirement}`)),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const generator = yield* OpenApiGenerator.OpenApiGenerator
	const text = yield* fs.readFileString(${marker('expression','specPath','"./openapi.json"')}, "utf8")
	const spec = yield* Effect.try(() => JSON.parse(text) as OpenApi.OpenAPISpec)
	return yield* generator.generate(spec, { name: ${marker('expression','name','"Client"')}, format: ${marker('expression','format','"httpclient"')} })
})`
})

export const OpenApiGeneratedClientApplicationLayerTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedClientApplicationLayer', version: VERSION,
	description: 'Exposes a compiled generated HttpClient module as an application service using the ambient HttpClient.',
	typeParameters: typeParameters(['I','Service identifier type.'],['Client','Generated client type.']),
	inputs: { service: serviceKeyInput('Application client service key.','{{I}}','{{Client}}'), factory: generatedFactoryInput('Generated module make function.','{{Client}}') },
	output: expressionOutput('Generated-client application Layer.', layerType('{{I}}','never',httpClientRequirement)),
	source: `Layer.effect(${marker('expression','service','RemoteApi')}, Effect.map(HttpClient.HttpClient, client => ${marker('expression','factory','make')}(client)))`
})

export const OpenApiGeneratedClientApplicationLayerWithTransformTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedClientApplicationLayerWithTransform', version: VERSION,
	description: 'Exposes a generated client service with a per-request HttpClient transform for auth, base URLs, headers, or policy.',
	typeParameters: typeParameters(['I','Service identifier type.'],['Client','Generated client type.']),
	inputs: {
		service: serviceKeyInput('Application client service key.','{{I}}','{{Client}}'),
		factory: generatedFactoryInput('Generated module make function.','{{Client}}'),
		transformClient: callbackInput('Generated-client request transform.', { ts: `(client: ${httpClientType().ts}) => ${effectType(httpClientType().ts,'never','never').ts}` })
	},
	output: expressionOutput('Transformed generated-client service Layer.', layerType('{{I}}','never',httpClientRequirement)),
	source: `Layer.effect(${marker('expression','service','RemoteApi')}, Effect.map(HttpClient.HttpClient, client => ${marker('expression','factory','make')}(client, { transformClient: ${marker('expression','transformClient','client => Effect.succeed(client)')} })))`
})

export const OpenApiGeneratedHttpApiServerIntegrationLayerTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedHttpApiServerIntegrationLayer', version: VERSION,
	description: 'Serves a compiled HttpApi produced by the OpenAPI generator using separately supplied implementation Layers.',
	typeParameters: typeParameters(['EHandlers','Handler Layer errors.'],['RHandlers','Handler Layer requirements.']),
	inputs: { api: httpApiInput('Compiled generated HttpApi contract.'), handlers: layerInput('Generated HttpApi group implementation Layers.','unknown','{{EHandlers}}','{{RHandlers}}'), builderOptions: valueInput('HttpApiBuilder options.'), serveOptions: valueInput('HttpRouter.serve options.') },
	output: expressionOutput('Generated HttpApi server Layer.', layerType('never','{{EHandlers}}',`${httpServerRequirement} | {{RHandlers}} | unknown`)),
	source: `HttpRouter.serve(Layer.provide(HttpApiBuilder.layer(${marker('expression','api','GeneratedApi')}, ${marker('expression','builderOptions','{}')}), ${marker('expression','handlers','Layer.empty')}), ${marker('expression','serveOptions','{}')})`
})

export const OpenApiGeneratedHttpApiSwaggerIntegrationLayerTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedHttpApiSwaggerIntegrationLayer', version: VERSION,
	description: 'Serves a generated HttpApi together with its implementation and Swagger UI.',
	typeParameters: typeParameters(['EHandlers','Handler Layer errors.'],['RHandlers','Handler Layer requirements.']),
	inputs: { api: httpApiInput('Compiled generated HttpApi contract.'), handlers: layerInput('Generated HttpApi implementation Layers.','unknown','{{EHandlers}}','{{RHandlers}}'), docsPath: effectValueInput('Swagger path.', { ts: 'string' }), serveOptions: valueInput('HttpRouter.serve options.') },
	output: expressionOutput('Generated HttpApi + Swagger server Layer.', layerType('never','{{EHandlers}}',`${httpServerRequirement} | {{RHandlers}} | unknown`)),
	source: `(() => { const api = ${marker('expression','api','GeneratedApi')}; const app = Layer.merge(Layer.provide(HttpApiBuilder.layer(api), ${marker('expression','handlers','Layer.empty')}), HttpApiSwagger.layer(api, { path: ${marker('expression','docsPath','"/docs"')} })); return HttpRouter.serve(app, ${marker('expression','serveOptions','{}')}) })()`
})

export const OpenApiContractGeneratedHttpApiDriftCheckTemplate = defineTemplate({
	modelId: 'OpenApiContractGeneratedHttpApiDriftCheck', version: VERSION,
	description: 'Regenerates HttpApi source from an Effect HttpApi OpenAPI contract and fails when the checked-in generated module drifts.',
	inputs: { api: httpApiInput('Source Effect HttpApi.'), name: effectValueInput('Generated API name.', { ts: 'string' }), path: effectValueInput('Checked-in generated HttpApi path.', { ts: 'string' }), openApiOptions: valueInput('OpenApi.fromApi options.') },
	output: expressionOutput('Contract-to-generated-source drift check.', effectType('void', `${platformErrorType} | { readonly _tag: "OpenApiGeneratedSourceDrift"; readonly path: string }`, `${openApiGeneratorRequirement} | ${fileSystemRequirement}`)),
	source: `Effect.gen(function* () {
	const generator = yield* OpenApiGenerator.OpenApiGenerator
	const fs = yield* FileSystem.FileSystem
	const path = ${marker('expression','path','"./generated-api.ts"')}
	const spec = OpenApi.fromApi(${marker('expression','api','HttpApi.make("Api")')}, ${marker('expression','openApiOptions','{}')})
	const expected = yield* generator.generate(spec, { name: ${marker('expression','name','"GeneratedApi"')}, format: "httpapi" })
	const actual = yield* fs.readFileString(path, "utf8")
	if (actual !== expected) return yield* Effect.fail({ _tag: "OpenApiGeneratedSourceDrift" as const, path })
})`
})

export const OpenApiGeneratedClientAdapterSourceFileTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedClientAdapterSourceFile', version: VERSION,
	description: 'Builds a source file that wraps a compiled generated HttpClient module behind application Effect services.',
	inputs: { body: statementCollectionInput('Generated-client imports, service declarations, Layers, and adapters.') },
	output: { kind: 'sourceFile', description: 'Complete generated-client adapter source file.' },
	source: `import { Context, Effect, Layer, Schedule } from "effect"
import { HttpClient } from "effect/unstable/http"

${marker('statement','body','void 0;')}`
})

export const OpenApiGeneratedHttpApiServerSourceFileTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedHttpApiServerSourceFile', version: VERSION,
	description: 'Builds a server source file around a compiled HttpApi generated from OpenAPI.',
	inputs: { body: statementCollectionInput('Generated HttpApi imports, group implementations, middleware, and server Layer.') },
	output: { kind: 'sourceFile', description: 'Complete generated-HttpApi server source file.' },
	source: `import { Effect, Layer } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { HttpApiBuilder, HttpApiSwagger } from "effect/unstable/httpapi"

${marker('statement','body','void 0;')}`
})

export const OpenApiGeneratedIntegrationTestSourceFileTemplate = defineTemplate({
	modelId: 'OpenApiGeneratedIntegrationTestSourceFile', version: VERSION,
	description: 'Builds a test source file for generated clients or generated HttpApi modules.',
	inputs: { body: statementCollectionInput('Generated integration test declarations and cases.') },
	output: { kind: 'sourceFile', description: 'Complete OpenAPI-generated integration test source file.' },
	source: `import { Effect, Layer } from "effect"
import { HttpClient } from "effect/unstable/http"
import { it } from "@effect/vitest"

${marker('statement','body','void 0;')}`
})

export const effectV4OpenApiGeneratedIntegrationGraphTemplateInputs = [
	OpenApiGenerateHttpClientFileTemplate,
	OpenApiGenerateHttpClientTypeOnlyFileTemplate,
	OpenApiGenerateHttpApiFileTemplate,
	OpenApiGeneratedSourceWriteIfChangedTemplate,
	OpenApiGeneratedSourceDriftCheckTemplate,
	OpenApiGenerateStrictFileTemplate,
	OpenApiGenerateAllFormatsFilesTemplate,
	OpenApiJsonSpecGenerateTemplate,
	OpenApiGeneratedClientApplicationLayerTemplate,
	OpenApiGeneratedClientApplicationLayerWithTransformTemplate,
	OpenApiGeneratedHttpApiServerIntegrationLayerTemplate,
	OpenApiGeneratedHttpApiSwaggerIntegrationLayerTemplate,
	OpenApiContractGeneratedHttpApiDriftCheckTemplate,
	OpenApiGeneratedClientAdapterSourceFileTemplate,
	OpenApiGeneratedHttpApiServerSourceFileTemplate,
	OpenApiGeneratedIntegrationTestSourceFileTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
