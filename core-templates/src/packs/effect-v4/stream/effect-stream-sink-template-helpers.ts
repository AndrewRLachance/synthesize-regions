import type { TypeDescriptor } from 'synthesize-regions'
import {
	pubSubType,
	queueType,
	streamType,
	typedExpressionInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'
import { nominalType } from '../../../authoring/effect-v4/effect-template-helpers.js'

export const sinkType = (
	result = 'unknown',
	input = 'unknown',
	leftover = 'never',
	error = 'never',
	requirements = 'never'
): TypeDescriptor => nominalType('effect/Sink', {
	sinkResult: result,
	sinkInput: input,
	sinkLeftover: leftover,
	sinkError: error,
	sinkRequirements: requirements
})

export const streamInput = (
	description: string,
	success = 'unknown',
	error = 'unknown',
	requirements = 'unknown'
) => typedExpressionInput(description, streamType(success, error, requirements))

export const sinkInput = (
	description: string,
	result = 'unknown',
	input = 'unknown',
	leftover = 'never',
	error = 'never',
	requirements = 'never'
) => typedExpressionInput(description, sinkType(result, input, leftover, error, requirements))

export const queueInput = (description: string, value = 'unknown') =>
	typedExpressionInput(description, queueType(value))

export const pubSubInput = (description: string, value = 'unknown') =>
	typedExpressionInput(description, pubSubType(value))
