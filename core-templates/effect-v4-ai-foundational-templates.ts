import { defineTemplate } from './sample-definition.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	effectReturningCallbackType,
	expressionOutput,
	identifierInput,
	marker,
	nominalType,
	statementOutput,
	stringInput,
	typeParameters,
	typedExpressionInput,
	valueInput
} from './effect-template-helpers.js'
import { effectSourceInput, effectType, effectValueInput } from './effect-ts.js'
import { schemaType } from './effect-template-helpers.js'
import {
	aiChatType,
	aiEmbeddingModelRequirement,
	aiErrorType,
	aiGenerateObjectEffectType,
	aiGenerateTextEffectType,
	aiModelRequirement,
	aiPromptType,
	aiServiceRequirement,
	aiStreamPartType,
	aiTokenizerRequirement,
	aiToolType,
	embeddingModelType,
	languageModelType,
	modelType,
	tokenizerType,
	toolkitType
} from './effect-ai-template-helpers.js'

const VERSION = '1.0.0' as const

const schemaInput = (description: string, decoded = 'unknown', encoded = 'unknown', decode = 'never', encode = decode) =>
	typedExpressionInput(description, schemaType(decoded, encoded, decode, encode))

const languageModelInput = (description: string) => typedExpressionInput(description, languageModelType())
const toolkitInput = (description: string) => typedExpressionInput(description, toolkitType())
const aiSourceInput = (description: string, success = 'unknown', requirements = aiServiceRequirement) =>
	effectSourceInput(description, effectType(success, aiErrorType.ts ?? 'unknown', requirements))

/**
 * Effect v4 AI foundations (`effect/unstable/ai`).
 *
 * Runtime contract:
 *   import { Effect, Layer, Schema, Stream } from 'effect'
 *   import { AiError, Chat, EmbeddingModel, ExecutionPlan, LanguageModel, Model, Tool, Toolkit, Tokenizer } from 'effect/unstable/ai'
 *
 * Provider packages (`@effect/ai-openai`, `@effect/ai-anthropic`, ...) are
 * external: templates model the provider layer/model as user inputs.
 */

// ---------------------------------------------------------------------------
// LanguageModel service
// ---------------------------------------------------------------------------

export const AiLanguageModelServiceTemplate = defineTemplate({
	modelId: 'AiLanguageModelService', version: VERSION,
	description: 'Accesses the configured LanguageModel service from the context.',
	inputs: {},
	output: expressionOutput('LanguageModel service Effect.', effectType(languageModelType().ts, 'never', aiServiceRequirement)),
	source: 'LanguageModel.LanguageModel'
})

export const AiGenerateTextTemplate = defineTemplate({
	modelId: 'AiGenerateText', version: VERSION,
	description: 'Generates plain text from a prompt through the LanguageModel service.',
	inputs: { prompt: valueInput('Prompt text or structured prompt value.') },
	output: expressionOutput('Generate-text response Effect.', aiGenerateTextEffectType('{}', aiServiceRequirement)),
	source: `Effect.flatMap(LanguageModel.LanguageModel, (model) => model.generateText({ prompt: ${marker('expression', 'prompt', '"Explain retry budgets in one paragraph"')} }))`
})

export const AiGenerateTextWithToolkitTemplate = defineTemplate({
	modelId: 'AiGenerateTextWithToolkit', version: VERSION,
	description: 'Generates text with a tool-enabled LanguageModel call and an explicit tool-choice policy.',
	inputs: {
		prompt: valueInput('Prompt text or structured prompt value.'),
		toolkit: toolkitInput('Toolkit the model may call during generation.'),
		toolChoice: effectValueInput('Tool-choice policy.', { ts: '"auto" | "required" | "none"' })
	},
	output: expressionOutput('Tool-enabled generate-text response Effect.', aiGenerateTextEffectType('unknown', aiServiceRequirement)),
	source: `Effect.flatMap(LanguageModel.LanguageModel, (model) => model.generateText({ prompt: ${marker('expression', 'prompt', '"What is the stock for p-1?"')}, toolkit: ${marker('expression', 'toolkit', 'Toolkit.empty')}, toolChoice: ${marker('expression', 'toolChoice', '"auto"')} }))`
})

export const AiGenerateObjectTemplate = defineTemplate({
	modelId: 'AiGenerateObject', version: VERSION,
	description: 'Generates a Schema-validated structured object from a prompt.',
	typeParameters: typeParameters(
		['A', 'Structured output decoded type.'],
		['I', 'Structured output encoded type.'],
		['RD', 'Structured output decoding services.']
	),
	inputs: {
		prompt: valueInput('Prompt text or structured prompt value.'),
		schema: schemaInput('Schema the model output is decoded against.', '{{A}}', '{{I}}', '{{RD}}')
	},
	output: expressionOutput('Structured generate-object response Effect.', aiGenerateObjectEffectType('{{A}}', '{}', aiServiceRequirement)),
	source: `Effect.flatMap(LanguageModel.LanguageModel, (model) => model.generateObject({ prompt: ${marker('expression', 'prompt', '"Draft a launch plan"')}, schema: ${marker('expression', 'schema', 'Schema.Struct({ title: Schema.String })')} }))`
})

export const AiStreamTextTemplate = defineTemplate({
	modelId: 'AiStreamText', version: VERSION,
	description: 'Streams incremental response parts from a prompt through the LanguageModel service.',
	inputs: { prompt: valueInput('Prompt text or structured prompt value.') },
	output: expressionOutput('Stream of AI response parts.', nominalType('effect/Stream', { streamSuccess: aiStreamPartType('{}').ts, streamError: aiErrorType.ts ?? 'unknown', streamRequirements: aiServiceRequirement })),
	source: `Stream.unwrap(Effect.map(LanguageModel.LanguageModel, (model) => model.streamText({ prompt: ${marker('expression', 'prompt', '"Count to five slowly"')} })))`
})

// ---------------------------------------------------------------------------
// Models and providers
// ---------------------------------------------------------------------------

export const AiModelMakeTemplate = defineTemplate({
	modelId: 'AiModelMake', version: VERSION,
	description: 'Builds a provider-agnostic AI Model from a provider name, model name, and provider layer.',
	inputs: {
		provider: stringInput('Provider identifier (e.g. openai, anthropic).'),
		modelName: stringInput('Provider-side model name.'),
		layer: typedExpressionInput('Layer building the provider client.', nominalType('effect/Layer', { layerProvided: 'unknown', layerError: 'never', layerRequirements: 'unknown' }))
	},
	output: expressionOutput('AI Model value.', modelType()),
	source: `Model.make(${marker('string', 'provider', '"openai"')}, ${marker('string', 'modelName', '"gpt-5"')}, ${marker('expression', 'layer', 'Layer.empty')})`
})

export const AiModelWithFallbackTemplate = defineTemplate({
	modelId: 'AiModelWithFallback', version: VERSION,
	description: 'Defines an ExecutionPlan that retries a primary model and falls back to a secondary model.',
	inputs: {
		primary: typedExpressionInput('Primary Model.', modelType()),
		secondary: typedExpressionInput('Fallback Model.', modelType()),
		primaryAttempts: effectValueInput('Attempts for the primary model.', { ts: 'number' }),
		secondaryAttempts: effectValueInput('Attempts for the fallback model.', { ts: 'number' })
	},
	output: expressionOutput('Model ExecutionPlan with fallback.', nominalType('effect/ExecutionPlan')),
	source: `ExecutionPlan.make(
	{ provide: ${marker('expression', 'primary', 'PrimaryModel')}, attempts: ${marker('expression', 'primaryAttempts', '3')} },
	{ provide: ${marker('expression', 'secondary', 'SecondaryModel')}, attempts: ${marker('expression', 'secondaryAttempts', '2')} }
)`
})

// ---------------------------------------------------------------------------
// Tools and toolkits
// ---------------------------------------------------------------------------

export const AiToolMakeTemplate = defineTemplate({
	modelId: 'AiToolMake', version: VERSION,
	description: 'Defines an AI tool with a parameters Schema the model fills in and a success Schema for the handler result.',
	typeParameters: typeParameters(
		['P', 'Decoded tool parameters type.'],
		['S', 'Tool success type.'],
		['F', 'Tool failure type.']
	),
	inputs: {
		name: stringInput('Tool name shown to the model.'),
		description: stringInput('Tool description guiding model use.'),
		parameters: typedExpressionInput('Parameters Schema (usually Schema.Struct).', nominalType('effect/Schema', { schemaDecoded: '{{P}}', schemaEncoded: 'unknown', schemaRequirements: 'never', schemaDecodingServices: 'never', schemaEncodingServices: 'never' })),
		success: schemaInput('Success Schema for the handler result.', '{{S}}'),
		failure: schemaInput('Failure Schema for handler errors.', '{{F}}')
	},
	output: expressionOutput('AI Tool definition.', aiToolType('string', '{{P}}', '{{S}}', '{{F}}')),
	source: `Tool.make(${marker('string', 'name', '"SearchProducts"')}, { description: ${marker('string', 'description', '"Search the product catalog"')}, parameters: ${marker('expression', 'parameters', 'Schema.Struct({ query: Schema.String })')}, success: ${marker('expression', 'success', 'Schema.Array(Schema.String)')}, failure: ${marker('expression', 'failure', 'Schema.Never')} })`
})

export const AiToolkitMakeTemplate = defineTemplate({
	modelId: 'AiToolkitMake', version: VERSION,
	description: 'Groups AI tools into a typed Toolkit that can be passed to generateText or implemented as a Layer.',
	inputs: {
		toolA: typedExpressionInput('First AI Tool.', aiToolType()),
		toolB: typedExpressionInput('Second AI Tool.', aiToolType())
	},
	output: expressionOutput('Typed Toolkit.', toolkitType()),
	source: `Toolkit.make(${marker('expression', 'toolA', 'SearchProducts')}, ${marker('expression', 'toolB', 'GetInventory')})`
})

export const AiToolkitToLayerTemplate = defineTemplate({
	modelId: 'AiToolkitToLayer', version: VERSION,
	description: 'Implements every tool handler in a Toolkit as a Layer; each handler receives the decoded parameters.',
	typeParameters: typeParameters(['E', 'Handler construction error type.'], ['R', 'Handler construction requirements.']),
	inputs: {
		toolkit: toolkitInput('Toolkit whose handlers are implemented.'),
		handlers: callbackInput('Handler record: one Effectful function per tool, keyed by tool name.', { ts: '(params: any) => unknown' })
	},
	output: expressionOutput('Toolkit handler Layer.', nominalType('effect/Layer', { layerProvided: 'unknown', layerError: '{{E}}', layerRequirements: '{{R}}' })),
	source: `${marker('expression', 'toolkit', 'ProductToolkit')}.toLayer(${marker('expression', 'handlers', '{ SearchProducts: ({ query }) => Effect.succeed([]), GetInventory: ({ productId }) => Effect.succeed({ productId, available: 0 }) }')})`
})

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const AiChatMakeTemplate = defineTemplate({
	modelId: 'AiChatMake', version: VERSION,
	description: 'Creates an empty stateful AI Chat session that tracks conversation history.',
	inputs: {},
	output: expressionOutput('Chat session Effect.', effectType(aiChatType().ts, 'never', 'never')),
	source: 'Chat.empty'
})

export const AiChatGenerateTextTemplate = defineTemplate({
	modelId: 'AiChatGenerateText', version: VERSION,
	description: 'Sends a prompt through a stateful Chat session, appending the exchange to its history.',
	inputs: { chat: typedExpressionInput('Chat session.', aiChatType()), prompt: valueInput('Prompt text.') },
	output: expressionOutput('Chat generate-text response Effect.', aiGenerateTextEffectType('{}', aiServiceRequirement)),
	source: `Effect.flatMap(${marker('expression', 'chat', 'Chat.empty')}, (chat) => chat.generateText({ prompt: ${marker('expression', 'prompt', '"Summarize our discussion so far"')} }))`
})

// ---------------------------------------------------------------------------
// Supporting services and errors
// ---------------------------------------------------------------------------

export const AiEmbeddingModelEmbedTemplate = defineTemplate({
	modelId: 'AiEmbeddingModelEmbed', version: VERSION,
	description: 'Embeds a single input string through the configured EmbeddingModel service.',
	inputs: { input: stringInput('Text to embed.') },
	output: expressionOutput('Embedding response Effect.', effectType('unknown', aiErrorType.ts ?? 'unknown', aiEmbeddingModelRequirement)),
	source: `Effect.flatMap(EmbeddingModel.EmbeddingModel, (model) => model.embed(${marker('string', 'input', '"retry budget guidance"')}))`
})

export const AiTokenizerCountTemplate = defineTemplate({
	modelId: 'AiTokenizerCount', version: VERSION,
	description: 'Counts the tokens of a text with the configured Tokenizer service.',
	inputs: { input: stringInput('Text to tokenize.') },
	output: expressionOutput('Token count Effect.', effectType('number', 'never', aiTokenizerRequirement)),
	source: `Effect.flatMap(Tokenizer, (tokenizer) => tokenizer.count(${marker('string', 'input', '"retry budget guidance"')}))`
})

export const AiErrorRecoveryTemplate = defineTemplate({
	modelId: 'AiErrorRecovery', version: VERSION,
	description: 'Recovers from an AiError with a tagged recovery handler.',
	typeParameters: typeParameters(
		['A', 'Source success type.'],
		['R', 'Source requirements.'],
		['B', 'Recovery success type.'],
		['E2', 'Recovery error type.'],
		['R2', 'Recovery requirements.']
	),
	inputs: {
		source: effectSourceInput('AI Effect that may fail with AiError.', effectType('{{A}}', aiErrorType.ts ?? 'unknown', '{{R}}')),
		handler: callbackInput('AiError recovery handler.', effectReturningCallbackType('error: unknown', '{{B}}', '{{E2}}', '{{R2}}'))
	},
	output: expressionOutput('AI Effect with AiError recovery.', effectType('{{A}} | {{B}}', '{{E2}}', '{{R}} | {{R2}}')),
	source: `Effect.catchTag(${marker('expression', 'source', 'Effect.fail(new AiError.AiError({ reason: { _tag: "UnknownError" } }))')}, "AiError", ${marker('expression', 'handler', '() => Effect.void')})`
})

export const effectV4AiFoundationalGraphTemplateInputs = [
	AiLanguageModelServiceTemplate,
	AiGenerateTextTemplate,
	AiGenerateTextWithToolkitTemplate,
	AiGenerateObjectTemplate,
	AiStreamTextTemplate,
	AiModelMakeTemplate,
	AiModelWithFallbackTemplate,
	AiToolMakeTemplate,
	AiToolkitMakeTemplate,
	AiToolkitToLayerTemplate,
	AiChatMakeTemplate,
	AiChatGenerateTextTemplate,
	AiEmbeddingModelEmbedTemplate,
	AiTokenizerCountTemplate,
	AiErrorRecoveryTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
