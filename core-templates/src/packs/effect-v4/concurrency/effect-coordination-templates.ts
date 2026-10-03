import { defineTemplate } from '../../../authoring/define-template.js'
import { effectSourceInput, effectType, effectValueInput } from '../core/effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	deferredType,
	expressionOutput,
	marker,
	pubSubType,
	queueType,
	refType,
	typeParameters,
	typedExpressionInput,
	valueInput
} from '../../../authoring/effect-v4/effect-template-helpers.js'

const refInput = (value = 'unknown') => typedExpressionInput('Ref value.', refType(value))
const deferredInput = (success = 'unknown', error = 'unknown') => typedExpressionInput('Deferred value.', deferredType(success, error))
const queueInput = (value = 'unknown') => typedExpressionInput('Queue value.', queueType(value))
const pubSubInput = (value = 'unknown') => typedExpressionInput('PubSub value.', pubSubType(value))
const scope = '{ readonly __effectScopeRequirement: "Scope" }'

export const RefMakeTemplate = defineTemplate({
	modelId: 'RefMake', version: '1.0.0', description: 'Creates a mutable Ref.',
	typeParameters: typeParameters(['A', 'Ref value type.']), inputs: { value: valueInput('Initial value.', { ts: '{{A}}' }) },
	output: expressionOutput('Ref creation Effect.', effectType(`{ readonly pipe: () => unknown; readonly __refValue?: () => {{A}} }`, 'never', 'never')),
	source: `Ref.make(${marker('expression', 'value', 'undefined')})`
})

export const RefGetTemplate = defineTemplate({
	modelId: 'RefGet', version: '1.0.0', description: 'Reads a Ref value.',
	typeParameters: typeParameters(['A', 'Ref value type.']), inputs: { ref: refInput('{{A}}') },
	output: expressionOutput('Ref read Effect.', effectType('{{A}}', 'never', 'never')),
	source: `Ref.get(${marker('expression', 'ref', 'ref')})`
})

export const RefSetTemplate = defineTemplate({
	modelId: 'RefSet', version: '1.0.0', description: 'Sets a Ref value.',
	typeParameters: typeParameters(['A', 'Ref value type.']), inputs: { ref: refInput('{{A}}'), value: valueInput('New value.', { ts: '{{A}}' }) },
	output: expressionOutput('Ref set Effect.', effectType('void', 'never', 'never')),
	source: `Ref.set(${marker('expression', 'ref', 'ref')}, ${marker('expression', 'value', 'undefined')})`
})

export const RefUpdateTemplate = defineTemplate({
	modelId: 'RefUpdate', version: '1.0.0', description: 'Atomically updates a Ref.',
	typeParameters: typeParameters(['A', 'Ref value type.']), inputs: { ref: refInput('{{A}}'), update: callbackInput('Pure Ref update.', { ts: '(value: {{A}}) => {{A}}' }) },
	output: expressionOutput('Ref update Effect.', effectType('void', 'never', 'never')),
	source: `Ref.update(${marker('expression', 'ref', 'ref')}, ${marker('expression', 'update', 'value => value')})`
})

export const RefModifyTemplate = defineTemplate({
	modelId: 'RefModify', version: '1.0.0', description: 'Atomically modifies a Ref and returns a result.',
	typeParameters: typeParameters(['A', 'Ref value type.'], ['B', 'Returned result type.']), inputs: { ref: refInput('{{A}}'), modify: callbackInput('Pure callback returning [result, nextValue].', { ts: '(value: {{A}}) => readonly [{{B}}, {{A}}]' }) },
	output: expressionOutput('Ref modification Effect.', effectType('{{B}}', 'never', 'never')),
	source: `Ref.modify(${marker('expression', 'ref', 'ref')}, ${marker('expression', 'modify', 'value => [value, value] as const')})`
})

export const DeferredMakeTemplate = defineTemplate({
	modelId: 'DeferredMake', version: '1.0.0', description: 'Creates an unset Deferred.',
	typeParameters: typeParameters(['A', 'Deferred success type.'], ['E', 'Deferred error type.']), inputs: {},
	output: expressionOutput('Deferred creation Effect.', effectType(`{ readonly pipe: () => unknown; readonly __deferredSuccess?: () => {{A}}; readonly __deferredError?: () => {{E}} }`, 'never', 'never')),
	source: 'Deferred.make<unknown, unknown>()'
})

export const DeferredAwaitTemplate = defineTemplate({
	modelId: 'DeferredAwait', version: '1.0.0', description: 'Waits for a Deferred result.',
	typeParameters: typeParameters(['A', 'Deferred success type.'], ['E', 'Deferred error type.']), inputs: { deferred: deferredInput('{{A}}', '{{E}}') },
	output: expressionOutput('Deferred await Effect.', effectType('{{A}}', '{{E}}', 'never')),
	source: `Deferred.await(${marker('expression', 'deferred', 'deferred')})`
})

export const DeferredSucceedTemplate = defineTemplate({
	modelId: 'DeferredSucceed', version: '1.0.0', description: 'Completes a Deferred successfully.',
	typeParameters: typeParameters(['A', 'Deferred success type.'], ['E', 'Deferred error type.']), inputs: { deferred: deferredInput('{{A}}', '{{E}}'), value: valueInput('Success value.', { ts: '{{A}}' }) },
	output: expressionOutput('Deferred completion Effect.', effectType('boolean', 'never', 'never')),
	source: `Deferred.succeed(${marker('expression', 'deferred', 'deferred')}, ${marker('expression', 'value', 'undefined')})`
})

export const QueueBoundedTemplate = defineTemplate({
	modelId: 'QueueBounded', version: '1.0.0', description: 'Creates a bounded back-pressured Queue.',
	typeParameters: typeParameters(['A', 'Queue element type.']), inputs: { capacity: effectValueInput('Positive Queue capacity.', { ts: 'number' }) },
	output: expressionOutput('Queue creation Effect.', effectType(`{ readonly pipe: () => unknown; readonly __queueValue?: () => {{A}} }`, 'never', 'never')),
	source: `Queue.bounded<unknown>(${marker('expression', 'capacity', '1')})`
})

export const QueueOfferTemplate = defineTemplate({
	modelId: 'QueueOffer', version: '1.0.0', description: 'Offers one value to a Queue.',
	typeParameters: typeParameters(['A', 'Queue element type.']), inputs: { queue: queueInput('{{A}}'), value: valueInput('Value to offer.', { ts: '{{A}}' }) },
	output: expressionOutput('Queue offer Effect.', effectType('boolean', 'never', 'never')),
	source: `Queue.offer(${marker('expression', 'queue', 'queue')}, ${marker('expression', 'value', 'undefined')})`
})

export const QueueTakeTemplate = defineTemplate({
	modelId: 'QueueTake', version: '1.0.0', description: 'Takes the next value from a Queue.',
	typeParameters: typeParameters(['A', 'Queue element type.']), inputs: { queue: queueInput('{{A}}') },
	output: expressionOutput('Queue take Effect.', effectType('{{A}}', 'never', 'never')),
	source: `Queue.take(${marker('expression', 'queue', 'queue')})`
})

export const QueueShutdownTemplate = defineTemplate({
	modelId: 'QueueShutdown', version: '1.0.0', description: 'Shuts down a Queue.',
	typeParameters: typeParameters(['A', 'Queue element type.']), inputs: { queue: queueInput('{{A}}') },
	output: expressionOutput('Queue shutdown Effect.', effectType('void', 'never', 'never')),
	source: `Queue.shutdown(${marker('expression', 'queue', 'queue')})`
})

export const PubSubPublishTemplate = defineTemplate({
	modelId: 'PubSubPublish', version: '1.0.0', description: 'Publishes a value to a PubSub.',
	typeParameters: typeParameters(['A', 'Published value type.']), inputs: { pubSub: pubSubInput('{{A}}'), value: valueInput('Value to publish.', { ts: '{{A}}' }) },
	output: expressionOutput('PubSub publish Effect.', effectType('boolean', 'never', 'never')),
	source: `PubSub.publish(${marker('expression', 'pubSub', 'pubSub')}, ${marker('expression', 'value', 'undefined')})`
})

export const PubSubSubscribeTemplate = defineTemplate({
	modelId: 'PubSubSubscribe', version: '1.0.0', description: 'Creates a scoped subscription Queue for a PubSub.',
	typeParameters: typeParameters(['A', 'Published value type.']), inputs: { pubSub: pubSubInput('{{A}}') },
	output: expressionOutput('Scoped PubSub subscription Effect.', effectType(`{ readonly pipe: () => unknown; readonly __queueValue?: () => {{A}} }`, 'never', scope)),
	source: `PubSub.subscribe(${marker('expression', 'pubSub', 'pubSub')})`
})

export const effectCoordinationGraphTemplateInputs = [
	RefMakeTemplate, RefGetTemplate, RefSetTemplate, RefUpdateTemplate, RefModifyTemplate,
	DeferredMakeTemplate, DeferredAwaitTemplate, DeferredSucceedTemplate,
	QueueBoundedTemplate, QueueOfferTemplate, QueueTakeTemplate, QueueShutdownTemplate,
	PubSubPublishTemplate, PubSubSubscribeTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]

