/**
 * Canonical Effect v4 template helpers.
 *
 * Single import point for the shared descriptors and factories the Effect v4
 * graph-template packs use. Re-exporting from the authoritative modules here
 * resolves helper drift: a pack that needs the canonical `nominalType` or
 * `structuralTypeWithPhantoms` imports it from one place instead of redefining
 * it, which is how the catalog ended up with three generations of
 * `resultType` and two of `nominalType`.
 *
 * The re-exports are grouped by the module that owns them. `resultType` is
 * re-exported from `effect-ts.js`, where it is defined locally to avoid a
 * circular import (`effect-data-type-template-helpers.js` reaches
 * `effect-template-helpers.js`, which imports `effect-ts.js`).
 */

// --- Core structural descriptors (effect-template-helpers.js) -------------

export {
	structuralTypeWithPhantoms,
	nominalType,
	schemaType,
	schemaPropertySignatureType,
	effectReturningCallbackType,
	tagType,
	layerType,
	scheduleType,
	configType,
	refType,
	deferredType,
	queueType,
	pubSubType,
	streamType,
	metricType,
	managedRuntimeType,
	fiberType,
	typeCodeInput,
	statementCollectionInput,
	rawCallbackInput,
	identifierInput,
	stringInput,
	typeParameters,
	typeParameter,
	marker,
	expressionOutput,
	statementOutput,
	typedExpressionInput,
	callbackInput,
	valueInput
} from './effect-template-helpers.js'

export type { AnyEffectFamilyTemplateDefinitionInput, TypeDescriptorWithTs } from './effect-template-helpers.js'

// --- Data-type descriptors (effect-data-type-template-helpers.js) ----------

export {
	urlType,
	durationType,
	optionType,
	causeType,
	exitType,
	redactedType,
	bigDecimalType,
	chunkType,
	dateTimeType,
	dateTimeUtcType,
	dateTimeZonedType,
	configProviderType
} from '../../packs/effect-v4/data/effect-data-type-template-helpers.js'

// --- Effect-specific helpers (effect-ts.js) --------------------------------

export { resultType } from '../../packs/effect-v4/core/effect-ts.js'

// --- Socket helpers (effect-socket-template-helpers.js) --------------------

export { socketFallback } from '../../packs/effect-v4/socket/effect-socket-template-helpers.js'
