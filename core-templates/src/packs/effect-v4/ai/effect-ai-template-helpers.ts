import type { TypeDescriptor } from 'synthesize-regions'
import { effectType } from '../core/effect-ts.js'
import { nominalType, type TypeDescriptorWithTs } from '../../../authoring/effect-v4/effect-template-helpers.js'

/**
 * Shared type descriptors and requirement phantoms for the Effect v4 AI pack
 * (`effect/unstable/ai`). Provider packages (`@effect/ai-openai`,
 * `@effect/ai-anthropic`, ...) are external: templates stay provider-agnostic
 * and model the provider layer as an input.
 */

export const aiErrorType = nominalType('effect/unstable/ai/AiError', {
	aiErrorReason: '{ readonly _tag?: string; readonly message?: string }'
})

export const aiServiceRequirement = '{ readonly __aiLanguageModelRequirement: "LanguageModel" }'
export const aiModelRequirement = '{ readonly __aiModelRequirement: "Model" }'
export const aiEmbeddingModelRequirement = '{ readonly __aiEmbeddingModelRequirement: "EmbeddingModel" }'
export const aiTokenizerRequirement = '{ readonly __aiTokenizerRequirement: "Tokenizer" }'

export const languageModelType = (): TypeDescriptor => nominalType('effect/unstable/ai/LanguageModel')
export const modelType = (): TypeDescriptor => nominalType('effect/unstable/ai/Model')
export const embeddingModelType = (): TypeDescriptor => nominalType('effect/unstable/ai/EmbeddingModel')
export const tokenizerType = (): TypeDescriptor => nominalType('effect/unstable/ai/Tokenizer')

export const aiPromptType = (): TypeDescriptor => nominalType('effect/unstable/ai/Prompt')

export const aiToolType = (name = 'string', parameters = 'unknown', success = 'unknown', failure = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/ai/Tool', {
		toolName: name,
		toolParameters: parameters,
		toolSuccess: success,
		toolFailure: failure
	})

export const toolkitType = (tools = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/ai/Toolkit', { toolkitTools: tools })

export const aiChatType = (): TypeDescriptor => nominalType('effect/unstable/ai/Chat')

export const aiGenerateTextResponseType = (tools = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/ai/Response.GenerateText', { aiResponseTools: tools })

export const aiGenerateObjectResponseType = (value = 'unknown', tools = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/ai/Response.GenerateObject', { aiResponseValue: value, aiResponseTools: tools })

export const aiStreamPartType = (tools = 'unknown'): TypeDescriptor =>
	nominalType('effect/unstable/ai/Response.StreamPart', { aiStreamPartTools: tools })

export const aiGenerateTextEffectType = (tools = 'unknown', requirements = aiServiceRequirement): TypeDescriptorWithTs =>
	effectType(aiGenerateTextResponseType(tools).ts ?? 'unknown', aiErrorType.ts ?? 'unknown', requirements)

export const aiGenerateObjectEffectType = (value = 'unknown', tools = 'unknown', requirements = aiServiceRequirement): TypeDescriptorWithTs =>
	effectType(aiGenerateObjectResponseType(value, tools).ts ?? 'unknown', aiErrorType.ts ?? 'unknown', requirements)
