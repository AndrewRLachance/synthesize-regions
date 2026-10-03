/**
 * Canonical name → import-requirement bindings for the Effect v4 template
 * catalog, generated from the pinned package export declarations by
 * `core-templates/.semantic-compile/derive-imports.mts`. Consumed by
 * `sample-definition.js` to derive template importRequirements automatically.
 *
 * Each name maps to its candidate bindings in preference order (effect root,
 * then unstable domain barrels, then platform packages). Domain collisions
 * (e.g. `Prompt` in unstable/ai and unstable/cli) carry namespace member
 * maps so the wrapper can pick the barrel that actually exports the used
 * members. `plainModule` marks plain module files (no barrel): when a
 * template uses the name with member access, the whole module is imported as
 * a namespace.
 */
export interface EffectV4ImportBindingCandidate {
	moduleSpecifier: string
	importKind: 'named' | 'namespace'
	importedName?: string
	localName: string
	typeOnly: boolean
	plainModule?: boolean
	members?: string[]
}

export const effectV4ImportBindings: Readonly<Record<string, readonly EffectV4ImportBindingCandidate[]>> = {
	"absurd": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "absurd",
			"localName": "absurd",
			"typeOnly": false
		}
	],
	"Activity": [
		{
			"moduleSpecifier": "effect/unstable/workflow",
			"importKind": "named",
			"importedName": "Activity",
			"localName": "Activity",
			"typeOnly": false,
			"members": [
				"Activity",
				"Any",
				"AnyWithProps",
				"CurrentAttempt",
				"idempotencyKey",
				"make",
				"raceAll",
				"retry"
			]
		}
	],
	"addEqualityTesters": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "addEqualityTesters",
			"localName": "addEqualityTesters",
			"typeOnly": false
		}
	],
	"afterAll": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "afterAll",
			"localName": "afterAll",
			"typeOnly": false
		}
	],
	"afterEach": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "afterEach",
			"localName": "afterEach",
			"typeOnly": false
		}
	],
	"AfterSuiteRunMeta": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "AfterSuiteRunMeta",
			"localName": "AfterSuiteRunMeta",
			"typeOnly": false
		}
	],
	"AiError": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "AiError",
			"localName": "AiError",
			"typeOnly": false,
			"members": [
				"AiError",
				"AiErrorEncoded",
				"AiErrorReason",
				"AuthenticationError",
				"AuthenticationErrorMetadata",
				"ContentPolicyError",
				"ContentPolicyErrorMetadata",
				"HttpContext",
				"HttpRequestDetails",
				"HttpResponseDetails",
				"InternalProviderError",
				"InternalProviderErrorMetadata",
				"InvalidOutputError",
				"InvalidOutputErrorMetadata",
				"InvalidRequestError",
				"InvalidRequestErrorMetadata",
				"InvalidToolResultError",
				"InvalidUserInputError",
				"NetworkError",
				"ProviderMetadata",
				"QuotaExhaustedError",
				"QuotaExhaustedErrorMetadata",
				"RateLimitError",
				"RateLimitErrorMetadata",
				"StructuredOutputError",
				"StructuredOutputErrorMetadata",
				"ToolConfigurationError",
				"ToolNotFoundError",
				"ToolParameterValidationError",
				"ToolResultEncodingError",
				"ToolkitRequiredError",
				"UnknownError",
				"UnknownErrorMetadata",
				"UnsupportedSchemaError",
				"UnsupportedSchemaErrorMetadata",
				"UsageInfo",
				"buildErrorDescription",
				"isAiError",
				"isAiErrorReason",
				"make",
				"reasonFromHttpStatus"
			]
		}
	],
	"AnthropicStructuredOutput": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "AnthropicStructuredOutput",
			"localName": "AnthropicStructuredOutput",
			"typeOnly": false,
			"members": [
				"toCodecAnthropic"
			]
		}
	],
	"API": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "API",
			"localName": "API",
			"typeOnly": false
		}
	],
	"applyPatches": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "applyPatches",
			"localName": "applyPatches",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"Arbitrary": [
		{
			"moduleSpecifier": "effect/unstable/arbitrary",
			"importKind": "named",
			"importedName": "Arbitrary",
			"localName": "Arbitrary",
			"typeOnly": false,
			"members": [
				"Arbitrary",
				"ArrayOptions",
				"CheckOptions",
				"CheckResult",
				"Constant",
				"Exhausted",
				"Falsified",
				"Passed",
				"PropertyError",
				"PropertyFailure",
				"Replay",
				"ReplayMismatch",
				"ReturnedFalse",
				"SampleError",
				"SampleOptions",
				"SchemaOptions",
				"TypeId",
				"all",
				"array",
				"checkEffect",
				"filter",
				"filterMap",
				"flatMap",
				"formatCheckFailure",
				"isArbitrary",
				"map",
				"sampleEffect",
				"schema"
			]
		}
	],
	"Argument": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "Argument",
			"localName": "Argument",
			"typeOnly": false,
			"members": [
				"Argument",
				"ChoiceWithValue",
				"Date",
				"Directory",
				"File",
				"FileParse",
				"FileSchema",
				"FileText",
				"Finite",
				"Int",
				"Literals",
				"Never",
				"Path",
				"Redacted",
				"String",
				"atLeast",
				"atMost",
				"between",
				"filter",
				"filterMap",
				"map",
				"mapEffect",
				"mapTryCatch",
				"optional",
				"orElse",
				"orElseResult",
				"variadic",
				"withDefault",
				"withDescription",
				"withFallbackConfig",
				"withFallbackPrompt",
				"withMetavar",
				"withSchema"
			]
		}
	],
	"aroundAll": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "aroundAll",
			"localName": "aroundAll",
			"typeOnly": false
		}
	],
	"aroundEach": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "aroundEach",
			"localName": "aroundEach",
			"typeOnly": false
		}
	],
	"Array": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Array",
			"localName": "Array",
			"typeOnly": false,
			"members": [
				"Array",
				"Do",
				"NonEmptyArray",
				"NonEmptyReadonlyArray",
				"ReadonlyArray",
				"ReadonlyArrayTypeLambda",
				"allocate",
				"append",
				"appendAll",
				"bind",
				"bindTo",
				"cartesian",
				"cartesianWith",
				"chop",
				"chunksOf",
				"contains",
				"containsWith",
				"copy",
				"countBy",
				"dedupe",
				"dedupeAdjacent",
				"dedupeAdjacentWith",
				"dedupeWith",
				"difference",
				"differenceWith",
				"drop",
				"dropRight",
				"dropWhile",
				"dropWhileFilter",
				"empty",
				"ensure",
				"every",
				"extend",
				"filter",
				"filterMap",
				"findFirst",
				"findFirstIndex",
				"findFirstWithIndex",
				"findLast",
				"findLastIndex",
				"flatMap",
				"flatMapNullishOr",
				"flatten",
				"forEach",
				"fromIterable",
				"fromNullishOr",
				"fromOption",
				"fromRecord",
				"get",
				"getFailures",
				"getReadonlyReducerConcat",
				"getSomes",
				"getSuccesses",
				"getUnsafe",
				"group",
				"groupBy",
				"groupWith",
				"head",
				"headNonEmpty",
				"init",
				"initNonEmpty",
				"insertAt",
				"intersection",
				"intersectionWith",
				"intersperse",
				"isArray",
				"isArrayEmpty",
				"isArrayNonEmpty",
				"isReadonlyArrayEmpty",
				"isReadonlyArrayNonEmpty",
				"join",
				"last",
				"lastNonEmpty",
				"length",
				"let",
				"liftNullishOr",
				"liftOption",
				"liftPredicate",
				"liftResult",
				"make",
				"makeBy",
				"makeEquivalence",
				"makeOrder",
				"makeReducerConcat",
				"map",
				"mapAccum",
				"match",
				"matchLeft",
				"matchRight",
				"max",
				"min",
				"modify",
				"modifyHeadNonEmpty",
				"modifyLastNonEmpty",
				"of",
				"pad",
				"partition",
				"prepend",
				"prependAll",
				"range",
				"reduce",
				"reduceRight",
				"remove",
				"replace",
				"replicate",
				"reverse",
				"rotate",
				"scan",
				"scanRight",
				"separate",
				"setHeadNonEmpty",
				"setLastNonEmpty",
				"some",
				"sort",
				"sortBy",
				"sortWith",
				"span",
				"split",
				"splitAt",
				"splitAtNonEmpty",
				"splitWhere",
				"tail",
				"tailNonEmpty",
				"take",
				"takeRight",
				"takeWhile",
				"takeWhileFilter",
				"unappend",
				"unfold",
				"union",
				"unionWith",
				"unprepend",
				"unzip",
				"window",
				"zip",
				"zipWith"
			]
		}
	],
	"assert": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "assert",
			"localName": "assert",
			"typeOnly": false
		}
	],
	"Assertion": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "Assertion",
			"localName": "Assertion",
			"typeOnly": false
		}
	],
	"assertType": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "assertType",
			"localName": "assertType",
			"typeOnly": false
		}
	],
	"AssertType": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "AssertType",
			"localName": "AssertType",
			"typeOnly": false
		}
	],
	"AsymmetricMatchersContaining": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "AsymmetricMatchersContaining",
			"localName": "AsymmetricMatchersContaining",
			"typeOnly": false
		}
	],
	"AsyncMatcherResult": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "AsyncMatcherResult",
			"localName": "AsyncMatcherResult",
			"typeOnly": false
		}
	],
	"AsyncResult": [
		{
			"moduleSpecifier": "effect/unstable/reactivity",
			"importKind": "named",
			"importedName": "AsyncResult",
			"localName": "AsyncResult",
			"typeOnly": false,
			"members": [
				"AsyncResult",
				"Builder",
				"Defect",
				"Failure",
				"Initial",
				"Interrupt",
				"Schema",
				"Success",
				"TypeId",
				"With",
				"all",
				"builder",
				"cause",
				"error",
				"fail",
				"failWithPrevious",
				"failure",
				"failureWithPrevious",
				"flatMap",
				"fromExit",
				"fromExitWithPrevious",
				"getOrElse",
				"getOrThrow",
				"initial",
				"isAsyncResult",
				"isFailure",
				"isInitial",
				"isInterrupted",
				"isNotInitial",
				"isSuccess",
				"isWaiting",
				"map",
				"match",
				"matchWithError",
				"matchWithWaiting",
				"replacePrevious",
				"success",
				"toExit",
				"touch",
				"value",
				"waiting",
				"waitingFrom"
			]
		}
	],
	"Atom": [
		{
			"moduleSpecifier": "effect/unstable/reactivity",
			"importKind": "named",
			"importedName": "Atom",
			"localName": "Atom",
			"typeOnly": false,
			"members": [
				"Atom",
				"AtomContext",
				"AtomResultFn",
				"AtomRuntime",
				"Failure",
				"FnContext",
				"Interrupt",
				"PullResult",
				"PullSuccess",
				"RegistryRuntimeFactory",
				"Reset",
				"RuntimeFactory",
				"Serializable",
				"SerializableTypeId",
				"ServerValueTypeId",
				"SharedRuntimeFactory",
				"Success",
				"Type",
				"TypeId",
				"WithoutSerializable",
				"Writable",
				"WritableTypeId",
				"WriteContext",
				"autoDispose",
				"batch",
				"context",
				"debounce",
				"family",
				"fn",
				"fnSync",
				"get",
				"getResult",
				"getServerValue",
				"initialValue",
				"isAtom",
				"isSerializable",
				"isWritable",
				"keepAlive",
				"kvs",
				"make",
				"makeRefreshOnSignal",
				"map",
				"mapResult",
				"modify",
				"mount",
				"optimistic",
				"optimisticFn",
				"pull",
				"readable",
				"refresh",
				"refreshOnWindowFocus",
				"runtime",
				"searchParam",
				"serializable",
				"set",
				"setIdleTTL",
				"setLazy",
				"subscriptionRef",
				"swr",
				"toStream",
				"toStreamResult",
				"transform",
				"update",
				"windowFocusSignal",
				"withEquality",
				"withFallback",
				"withLabel",
				"withReactivity",
				"withRefresh",
				"withServerValue",
				"withServerValueInitial",
				"writable"
			]
		}
	],
	"AtomHttpApi": [
		{
			"moduleSpecifier": "effect/unstable/reactivity",
			"importKind": "named",
			"importedName": "AtomHttpApi",
			"localName": "AtomHttpApi",
			"typeOnly": false,
			"members": [
				"AtomHttpApiClient",
				"Service"
			]
		}
	],
	"AtomRef": [
		{
			"moduleSpecifier": "effect/unstable/reactivity",
			"importKind": "named",
			"importedName": "AtomRef",
			"localName": "AtomRef",
			"typeOnly": false,
			"members": [
				"AtomRef",
				"Collection",
				"ReadonlyRef",
				"TypeId",
				"collection",
				"make"
			]
		}
	],
	"AtomRegistry": [
		{
			"moduleSpecifier": "effect/unstable/reactivity",
			"importKind": "named",
			"importedName": "AtomRegistry",
			"localName": "AtomRegistry",
			"typeOnly": false,
			"members": [
				"AtomRegistry",
				"Node",
				"TypeId",
				"getResult",
				"isAtomRegistry",
				"layer",
				"layerOptions",
				"make",
				"mount",
				"toStream",
				"toStreamResult"
			]
		}
	],
	"AtomRpc": [
		{
			"moduleSpecifier": "effect/unstable/reactivity",
			"importKind": "named",
			"importedName": "AtomRpc",
			"localName": "AtomRpc",
			"typeOnly": false,
			"members": [
				"AtomRpcClient",
				"Service"
			]
		}
	],
	"BaselineData": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BaselineData",
			"localName": "BaselineData",
			"typeOnly": false
		}
	],
	"beforeAll": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "beforeAll",
			"localName": "beforeAll",
			"typeOnly": false
		}
	],
	"beforeEach": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "beforeEach",
			"localName": "beforeEach",
			"typeOnly": false
		}
	],
	"Bench": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "Bench",
			"localName": "Bench",
			"typeOnly": false
		}
	],
	"BenchCompareOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchCompareOptions",
			"localName": "BenchCompareOptions",
			"typeOnly": false
		}
	],
	"BenchFn": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchFn",
			"localName": "BenchFn",
			"typeOnly": false
		}
	],
	"BenchFnOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchFnOptions",
			"localName": "BenchFnOptions",
			"typeOnly": false
		}
	],
	"BenchFromSource": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchFromSource",
			"localName": "BenchFromSource",
			"typeOnly": false
		}
	],
	"BenchmarkGroup": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchmarkGroup",
			"localName": "BenchmarkGroup",
			"typeOnly": false
		}
	],
	"BenchmarkProvider": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchmarkProvider",
			"localName": "BenchmarkProvider",
			"typeOnly": false
		}
	],
	"BenchOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchOptions",
			"localName": "BenchOptions",
			"typeOnly": false
		}
	],
	"BenchRegistration": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchRegistration",
			"localName": "BenchRegistration",
			"typeOnly": false
		}
	],
	"BenchRegistrationInput": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchRegistrationInput",
			"localName": "BenchRegistrationInput",
			"typeOnly": false
		}
	],
	"BenchResult": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchResult",
			"localName": "BenchResult",
			"typeOnly": false
		}
	],
	"BenchRunOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchRunOptions",
			"localName": "BenchRunOptions",
			"typeOnly": false
		}
	],
	"BenchStorage": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BenchStorage",
			"localName": "BenchStorage",
			"typeOnly": false
		}
	],
	"BigDecimal": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "BigDecimal",
			"localName": "BigDecimal",
			"typeOnly": false,
			"members": [
				"BigDecimal",
				"Equivalence",
				"Order",
				"RoundingMode",
				"abs",
				"between",
				"ceil",
				"clamp",
				"divide",
				"divideUnsafe",
				"equals",
				"floor",
				"format",
				"fromBigInt",
				"fromNumber",
				"fromNumberUnsafe",
				"fromString",
				"fromStringUnsafe",
				"isBigDecimal",
				"isGreaterThan",
				"isGreaterThanOrEqualTo",
				"isInteger",
				"isLessThan",
				"isLessThanOrEqualTo",
				"isNegative",
				"isPositive",
				"isZero",
				"make",
				"max",
				"min",
				"multiply",
				"multiplyAll",
				"negate",
				"normalize",
				"remainder",
				"remainderUnsafe",
				"round",
				"scale",
				"sign",
				"subtract",
				"sum",
				"sumAll",
				"toExponential",
				"toNumberUnsafe",
				"truncate"
			]
		}
	],
	"BigInt": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "BigInt",
			"localName": "BigInt",
			"typeOnly": false,
			"members": [
				"BigInt",
				"CombinerMax",
				"CombinerMin",
				"Equivalence",
				"Order",
				"ReducerMultiply",
				"ReducerSum",
				"abs",
				"between",
				"clamp",
				"decrement",
				"divide",
				"divideUnsafe",
				"fromNumber",
				"fromString",
				"gcd",
				"increment",
				"isBigInt",
				"isGreaterThan",
				"isGreaterThanOrEqualTo",
				"isLessThan",
				"isLessThanOrEqualTo",
				"lcm",
				"max",
				"min",
				"multiply",
				"multiplyAll",
				"remainder",
				"sign",
				"sqrt",
				"sqrtUnsafe",
				"subtract",
				"sum",
				"sumAll",
				"toNumber"
			]
		}
	],
	"Boolean": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Boolean",
			"localName": "Boolean",
			"typeOnly": false,
			"members": [
				"Boolean",
				"Equivalence",
				"Order",
				"ReducerAnd",
				"ReducerOr",
				"and",
				"eqv",
				"every",
				"implies",
				"isBoolean",
				"match",
				"nand",
				"nor",
				"not",
				"or",
				"some",
				"xor"
			]
		}
	],
	"Brand": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Brand",
			"localName": "Brand",
			"typeOnly": false,
			"members": [
				"Brand",
				"BrandError",
				"Branded",
				"Constructor",
				"all",
				"check",
				"make",
				"nominal"
			]
		}
	],
	"BrowserCrypto": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "BrowserCrypto",
			"localName": "BrowserCrypto",
			"typeOnly": false,
			"members": [
				"WebCrypto",
				"layer"
			]
		}
	],
	"BrowserHttpClient": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "BrowserHttpClient",
			"localName": "BrowserHttpClient",
			"typeOnly": false,
			"members": [
				"CurrentXHRResponseType",
				"Fetch",
				"RequestInit",
				"XHRResponseType",
				"XMLHttpRequest",
				"layerFetch",
				"layerXMLHttpRequest",
				"withXHRArrayBuffer"
			]
		}
	],
	"BrowserKeyValueStore": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "BrowserKeyValueStore",
			"localName": "BrowserKeyValueStore",
			"typeOnly": false,
			"members": [
				"layerIndexedDb",
				"layerLocalStorage",
				"layerSessionStorage"
			]
		}
	],
	"BrowserPersistence": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "BrowserPersistence",
			"localName": "BrowserPersistence",
			"typeOnly": false,
			"members": [
				"layerBackingIndexedDb",
				"layerIndexedDb"
			]
		}
	],
	"BrowserRuntime": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "BrowserRuntime",
			"localName": "BrowserRuntime",
			"typeOnly": false,
			"members": [
				"runMain"
			]
		}
	],
	"BrowserSocket": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "BrowserSocket",
			"localName": "BrowserSocket",
			"typeOnly": false,
			"members": [
				"layerWebSocket",
				"layerWebSocketConstructor"
			]
		}
	],
	"BrowserStream": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "BrowserStream",
			"localName": "BrowserStream",
			"typeOnly": false,
			"members": [
				"fromEventListenerDocument",
				"fromEventListenerWindow"
			]
		}
	],
	"BrowserTesterOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BrowserTesterOptions",
			"localName": "BrowserTesterOptions",
			"typeOnly": false
		}
	],
	"BrowserTraceArtifact": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BrowserTraceArtifact",
			"localName": "BrowserTraceArtifact",
			"typeOnly": false
		}
	],
	"BrowserUI": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "BrowserUI",
			"localName": "BrowserUI",
			"typeOnly": false
		}
	],
	"BrowserWorker": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "BrowserWorker",
			"localName": "BrowserWorker",
			"typeOnly": false,
			"members": [
				"layer",
				"layerPlatform"
			]
		}
	],
	"BrowserWorkerRunner": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "BrowserWorkerRunner",
			"localName": "BrowserWorkerRunner",
			"typeOnly": false,
			"members": [
				"layer",
				"layerMessagePort",
				"make"
			]
		}
	],
	"BunChildProcessSpawner": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunChildProcessSpawner",
			"localName": "BunChildProcessSpawner",
			"typeOnly": false,
			"members": []
		}
	],
	"BunClusterHttp": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunClusterHttp",
			"localName": "BunClusterHttp",
			"typeOnly": false,
			"members": [
				"layer",
				"layerHttpServer",
				"layerK8sHttpClient"
			]
		}
	],
	"BunClusterSocket": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunClusterSocket",
			"localName": "BunClusterSocket",
			"typeOnly": false,
			"members": [
				"layer",
				"layerClientProtocol",
				"layerK8sHttpClient",
				"layerSocketServer"
			]
		}
	],
	"BunCrypto": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunCrypto",
			"localName": "BunCrypto",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"BunFileSystem": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunFileSystem",
			"localName": "BunFileSystem",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"BunHttpClient": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunHttpClient",
			"localName": "BunHttpClient",
			"typeOnly": false,
			"members": []
		}
	],
	"BunHttpPlatform": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunHttpPlatform",
			"localName": "BunHttpPlatform",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"BunHttpServer": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunHttpServer",
			"localName": "BunHttpServer",
			"typeOnly": false,
			"members": [
				"ServeOptions",
				"WebSocketOptions",
				"layer",
				"layerConfig",
				"layerHttpServices",
				"layerServer",
				"layerTest",
				"make"
			]
		}
	],
	"BunHttpServerRequest": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunHttpServerRequest",
			"localName": "BunHttpServerRequest",
			"typeOnly": false,
			"members": [
				"toBunServerRequest"
			]
		}
	],
	"BunMultipart": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunMultipart",
			"localName": "BunMultipart",
			"typeOnly": false,
			"members": [
				"persisted",
				"stream"
			]
		}
	],
	"BunPath": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunPath",
			"localName": "BunPath",
			"typeOnly": false,
			"members": [
				"layer",
				"layerPosix",
				"layerWin32"
			]
		}
	],
	"BunRedis": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunRedis",
			"localName": "BunRedis",
			"typeOnly": false,
			"members": [
				"BunRedis",
				"layer",
				"layerConfig"
			]
		}
	],
	"BunRuntime": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunRuntime",
			"localName": "BunRuntime",
			"typeOnly": false,
			"members": [
				"runMain"
			]
		}
	],
	"BunServices": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunServices",
			"localName": "BunServices",
			"typeOnly": false,
			"members": [
				"BunServices",
				"layer"
			]
		}
	],
	"BunSink": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunSink",
			"localName": "BunSink",
			"typeOnly": false,
			"members": []
		}
	],
	"BunSocket": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunSocket",
			"localName": "BunSocket",
			"typeOnly": false,
			"members": [
				"layerWebSocket",
				"layerWebSocketConstructor"
			]
		}
	],
	"BunSocketServer": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunSocketServer",
			"localName": "BunSocketServer",
			"typeOnly": false,
			"members": []
		}
	],
	"BunStdio": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunStdio",
			"localName": "BunStdio",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"BunStream": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunStream",
			"localName": "BunStream",
			"typeOnly": false,
			"members": [
				"fromReadableStream"
			]
		}
	],
	"BunTerminal": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunTerminal",
			"localName": "BunTerminal",
			"typeOnly": false,
			"members": [
				"layer",
				"make"
			]
		}
	],
	"BunWorker": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunWorker",
			"localName": "BunWorker",
			"typeOnly": false,
			"members": [
				"layer",
				"layerPlatform"
			]
		}
	],
	"BunWorkerRunner": [
		{
			"moduleSpecifier": "@effect/platform-bun",
			"importKind": "named",
			"importedName": "BunWorkerRunner",
			"localName": "BunWorkerRunner",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"ByteSize": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "ByteSize",
			"localName": "ByteSize",
			"typeOnly": false,
			"members": [
				"BinaryUnit",
				"ByteSize",
				"CombinerMax",
				"CombinerMin",
				"DecimalUnit",
				"Equivalence",
				"FormatOptions",
				"Input",
				"Order",
				"ReducerSum",
				"Unit",
				"between",
				"bytes",
				"clamp",
				"divide",
				"equals",
				"exabytes",
				"exbibytes",
				"format",
				"fromInput",
				"fromInputUnsafe",
				"fromString",
				"fromStringUnsafe",
				"gibibytes",
				"gigabytes",
				"isByteSize",
				"isGreaterThan",
				"isGreaterThanOrEqualTo",
				"isLessThan",
				"isLessThanOrEqualTo",
				"isZero",
				"kibibytes",
				"kilobytes",
				"max",
				"mebibytes",
				"megabytes",
				"min",
				"pebibytes",
				"petabytes",
				"quettabytes",
				"ronnabytes",
				"subtract",
				"subtractUnsafe",
				"sum",
				"tebibytes",
				"terabytes",
				"times",
				"toBigInt",
				"toNumber",
				"toNumberUnsafe",
				"toUnit",
				"yobibytes",
				"yottabytes",
				"zebibytes",
				"zero",
				"zettabytes"
			]
		}
	],
	"Cache": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Cache",
			"localName": "Cache",
			"typeOnly": false,
			"members": [
				"Cache",
				"Entry",
				"entries",
				"get",
				"getOption",
				"getSuccess",
				"has",
				"invalidate",
				"invalidateAll",
				"invalidateWhen",
				"keys",
				"make",
				"makeWith",
				"refresh",
				"set",
				"size",
				"values"
			]
		}
	],
	"camelize": [
		{
			"moduleSpecifier": "@effect/openapi-generator/Utils",
			"importKind": "named",
			"importedName": "camelize",
			"localName": "camelize",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"CancelReason": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "CancelReason",
			"localName": "CancelReason",
			"typeOnly": false
		}
	],
	"cast": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "cast",
			"localName": "cast",
			"typeOnly": false
		}
	],
	"Cause": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Cause",
			"localName": "Cause",
			"typeOnly": false,
			"members": [
				"AsyncFiberError",
				"AsyncFiberErrorTypeId",
				"Cause",
				"Die",
				"Done",
				"DoneTypeId",
				"ExceededCapacityError",
				"ExceededCapacityErrorTypeId",
				"Fail",
				"IllegalArgumentError",
				"IllegalArgumentErrorTypeId",
				"Interrupt",
				"InterruptorStackTrace",
				"NoSuchElementError",
				"NoSuchElementErrorTypeId",
				"Reason",
				"ReasonTypeId",
				"StackTrace",
				"TimeoutError",
				"TimeoutErrorTypeId",
				"TypeId",
				"UnknownError",
				"UnknownErrorTypeId",
				"YieldableError",
				"annotate",
				"annotations",
				"combine",
				"die",
				"done",
				"empty",
				"fail",
				"filterInterruptors",
				"findDefect",
				"findDie",
				"findError",
				"findErrorOption",
				"findFail",
				"findInterrupt",
				"fromReasons",
				"hasDies",
				"hasFails",
				"hasInterrupts",
				"hasInterruptsOnly",
				"interrupt",
				"interruptors",
				"isAsyncFiberError",
				"isCause",
				"isDieReason",
				"isDone",
				"isExceededCapacityError",
				"isFailReason",
				"isIllegalArgumentError",
				"isInterruptReason",
				"isNoSuchElementError",
				"isReason",
				"isTimeoutError",
				"isUnknownError",
				"makeDieReason",
				"makeFailReason",
				"makeInterruptReason",
				"map",
				"pretty",
				"prettyErrors",
				"reasonAnnotations",
				"squash"
			]
		}
	],
	"chai": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "chai",
			"localName": "chai",
			"typeOnly": false
		}
	],
	"Channel": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Channel",
			"localName": "Channel",
			"typeOnly": false,
			"members": [
				"Channel",
				"ChannelUnify",
				"ChannelUnifyIgnore",
				"DefaultChunkSize",
				"Do",
				"HaltStrategy",
				"TypeId",
				"Variance",
				"VarianceStruct",
				"acquireRelease",
				"acquireUseRelease",
				"bind",
				"bindTo",
				"buffer",
				"bufferArray",
				"callback",
				"callbackArray",
				"catch",
				"catchCause",
				"catchCauseFilter",
				"catchCauseIf",
				"catchDefect",
				"catchFilter",
				"catchIf",
				"catchReason",
				"catchReasons",
				"catchTag",
				"combine",
				"concat",
				"concatWith",
				"contextWith",
				"decodeText",
				"die",
				"drain",
				"embedInput",
				"empty",
				"encodeText",
				"end",
				"endSync",
				"ensuring",
				"fail",
				"failCause",
				"failCauseSync",
				"failSync",
				"filter",
				"filterArray",
				"filterArrayEffect",
				"filterEffect",
				"filterMap",
				"filterMapArray",
				"filterMapArrayEffect",
				"filterMapEffect",
				"flatMap",
				"flatten",
				"flattenArray",
				"flattenTake",
				"forever",
				"fromArray",
				"fromAsyncIterable",
				"fromAsyncIterableArray",
				"fromChunk",
				"fromEffect",
				"fromEffectDone",
				"fromEffectDrain",
				"fromEffectTake",
				"fromIterable",
				"fromIterableArray",
				"fromIterator",
				"fromIteratorArray",
				"fromPubSub",
				"fromPubSubArray",
				"fromPubSubTake",
				"fromPull",
				"fromQueue",
				"fromQueueArray",
				"fromReadableStream",
				"fromSchedule",
				"fromSubscription",
				"fromSubscriptionArray",
				"fromTransform",
				"fromTransformBracket",
				"fromTransformStream",
				"fromWritableStream",
				"haltWhen",
				"identity",
				"ignore",
				"ignoreCause",
				"interruptWhen",
				"isChannel",
				"let",
				"map",
				"mapAccum",
				"mapDone",
				"mapDoneEffect",
				"mapEffect",
				"mapError",
				"mapInput",
				"mapInputError",
				"merge",
				"mergeAll",
				"mergeEffect",
				"mkUint8Array",
				"never",
				"onEnd",
				"onError",
				"onExit",
				"onFirst",
				"onStart",
				"orDie",
				"orElseIfEmpty",
				"pipeTo",
				"pipeToOrFail",
				"provide",
				"provideContext",
				"provideService",
				"provideServiceEffect",
				"repeat",
				"retry",
				"runCollect",
				"runCount",
				"runDrain",
				"runFold",
				"runFoldEffect",
				"runForEach",
				"runForEachWhile",
				"runHead",
				"runIntoPubSub",
				"runIntoPubSubArray",
				"runIntoQueue",
				"runIntoQueueArray",
				"runLast",
				"scan",
				"scanEffect",
				"schedule",
				"scoped",
				"splitLines",
				"succeed",
				"suspend",
				"switchMap",
				"sync",
				"tap",
				"tapCause",
				"tapError",
				"toPubSub",
				"toPubSubArray",
				"toPubSubTake",
				"toPull",
				"toPullScoped",
				"toQueue",
				"toQueueArray",
				"toTransform",
				"transformPull",
				"unwrap",
				"unwrapReason",
				"updateContext",
				"updateService",
				"withSpan"
			]
		}
	],
	"ChannelSchema": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "ChannelSchema",
			"localName": "ChannelSchema",
			"typeOnly": false,
			"members": [
				"decode",
				"decodeUnknown",
				"duplex",
				"duplexUnknown",
				"encode",
				"encodeUnknown"
			]
		}
	],
	"Chat": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "Chat",
			"localName": "Chat",
			"typeOnly": false,
			"members": [
				"Chat",
				"ChatNotFoundError",
				"Persisted",
				"Persistence",
				"TypeId",
				"empty",
				"fromExport",
				"fromJson",
				"fromPrompt",
				"layerPersisted",
				"makePersisted"
			]
		}
	],
	"ChildProcess": [
		{
			"moduleSpecifier": "effect/unstable/process",
			"importKind": "named",
			"importedName": "ChildProcess",
			"localName": "ChildProcess",
			"typeOnly": false,
			"members": [
				"AdditionalFdConfig",
				"Command",
				"CommandInput",
				"CommandOptions",
				"CommandOutput",
				"Encoding",
				"KillOptions",
				"PipeFromOption",
				"PipeOptions",
				"PipeToOption",
				"PipedCommand",
				"Signal",
				"StandardCommand",
				"StderrConfig",
				"StdinConfig",
				"StdoutConfig",
				"TemplateExpression",
				"TemplateExpressionItem",
				"fdName",
				"isCommand",
				"isPipedCommand",
				"isStandardCommand",
				"make",
				"parseFdName",
				"pipeTo",
				"prefix",
				"setCwd",
				"setEnv"
			]
		}
	],
	"ChildProcessSpawner": [
		{
			"moduleSpecifier": "effect/unstable/process",
			"importKind": "named",
			"importedName": "ChildProcessSpawner",
			"localName": "ChildProcessSpawner",
			"typeOnly": false,
			"members": [
				"ChildProcessHandle",
				"ChildProcessSpawner",
				"ExitCode",
				"ProcessId",
				"Reref",
				"make",
				"makeHandle"
			]
		}
	],
	"Chunk": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Chunk",
			"localName": "Chunk",
			"typeOnly": false,
			"members": [
				"Chunk",
				"ChunkTypeLambda",
				"NonEmptyChunk",
				"append",
				"appendAll",
				"chunksOf",
				"compact",
				"contains",
				"containsWith",
				"dedupe",
				"dedupeAdjacent",
				"difference",
				"differenceWith",
				"drop",
				"dropRight",
				"dropWhile",
				"empty",
				"every",
				"filter",
				"filterMap",
				"filterMapWhile",
				"findFirst",
				"findFirstIndex",
				"findLast",
				"findLastIndex",
				"flatMap",
				"flatten",
				"forEach",
				"fromArrayUnsafe",
				"fromIterable",
				"fromNonEmptyArrayUnsafe",
				"get",
				"getUnsafe",
				"head",
				"headNonEmpty",
				"headUnsafe",
				"intersection",
				"isChunk",
				"isEmpty",
				"isNonEmpty",
				"join",
				"last",
				"lastNonEmpty",
				"lastUnsafe",
				"make",
				"makeBy",
				"makeEquivalence",
				"map",
				"mapAccum",
				"modify",
				"of",
				"partition",
				"prepend",
				"prependAll",
				"range",
				"reduce",
				"reduceRight",
				"remove",
				"replace",
				"reverse",
				"separate",
				"size",
				"some",
				"sort",
				"sortWith",
				"split",
				"splitAt",
				"splitNonEmptyAt",
				"splitWhere",
				"tail",
				"tailNonEmpty",
				"take",
				"takeRight",
				"takeWhile",
				"toArray",
				"toReadonlyArray",
				"union",
				"unzip",
				"zip",
				"zipWith"
			]
		}
	],
	"CliConfig": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "CliConfig",
			"localName": "CliConfig",
			"typeOnly": false,
			"members": [
				"CliConfig",
				"defaults",
				"layer",
				"make"
			]
		}
	],
	"CliError": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "CliError",
			"localName": "CliError",
			"typeOnly": false,
			"members": [
				"CliError",
				"DuplicateOption",
				"InvalidValue",
				"MissingArgument",
				"MissingOption",
				"NonShowHelpErrors",
				"ShowHelp",
				"UnexpectedArgument",
				"UnknownSubcommand",
				"UnrecognizedOption",
				"UserError",
				"isCliError"
			]
		}
	],
	"CliOutput": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "CliOutput",
			"localName": "CliOutput",
			"typeOnly": false,
			"members": [
				"Formatter",
				"defaultFormatter",
				"layer"
			]
		}
	],
	"Clipboard": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "Clipboard",
			"localName": "Clipboard",
			"typeOnly": false,
			"members": [
				"Clipboard",
				"ClipboardError",
				"layer",
				"make"
			]
		}
	],
	"Clock": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Clock",
			"localName": "Clock",
			"typeOnly": false,
			"members": [
				"Clock",
				"clockWith",
				"currentTimeMillis",
				"currentTimeNanos",
				"monotonicTimeNanos"
			]
		}
	],
	"ClusterCron": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "ClusterCron",
			"localName": "ClusterCron",
			"typeOnly": false,
			"members": [
				"make"
			]
		}
	],
	"ClusterError": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "ClusterError",
			"localName": "ClusterError",
			"typeOnly": false,
			"members": [
				"AlreadyProcessingMessage",
				"EntityNotAssignedToRunner",
				"MailboxFull",
				"MalformedMessage",
				"PersistenceError",
				"RunnerNotRegistered",
				"RunnerUnavailable"
			]
		}
	],
	"ClusterMetrics": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "ClusterMetrics",
			"localName": "ClusterMetrics",
			"typeOnly": false,
			"members": [
				"entities",
				"runners",
				"runnersHealthy",
				"shards",
				"singletons"
			]
		}
	],
	"ClusterSchema": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "ClusterSchema",
			"localName": "ClusterSchema",
			"typeOnly": false,
			"members": [
				"Abandon",
				"ClientTracingEnabled",
				"Dynamic",
				"Persisted",
				"ShardGroup",
				"Uninterruptible",
				"WithTransaction",
				"isUninterruptibleForClient",
				"isUninterruptibleForServer"
			]
		}
	],
	"ClusterWorkflowEngine": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "ClusterWorkflowEngine",
			"localName": "ClusterWorkflowEngine",
			"typeOnly": false,
			"members": [
				"layer",
				"make"
			]
		}
	],
	"Combiner": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Combiner",
			"localName": "Combiner",
			"typeOnly": false,
			"members": [
				"Combiner",
				"constant",
				"first",
				"flip",
				"intercalate",
				"last",
				"make",
				"max",
				"min"
			]
		}
	],
	"Command": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "Command",
			"localName": "Command",
			"typeOnly": false,
			"members": [
				"Command",
				"CommandContext",
				"Environment",
				"Error",
				"ParsedTokens",
				"Services",
				"annotate",
				"annotateMerge",
				"isCommand",
				"make",
				"provide",
				"provideEffect",
				"provideEffectDiscard",
				"provideSync",
				"run",
				"runWith",
				"unlisted",
				"withAlias",
				"withDescription",
				"withExamples",
				"withGlobalFlags",
				"withHandler",
				"withSharedFlags",
				"withShortDescription",
				"withSubcommands",
				"wizard"
			]
		}
	],
	"Completions": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "Completions",
			"localName": "Completions",
			"typeOnly": false,
			"members": [
				"ArgumentDescriptor",
				"ArgumentType",
				"CommandDescriptor",
				"FlagDescriptor",
				"FlagType",
				"Shell",
				"generate"
			]
		}
	],
	"Config": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Config",
			"localName": "Config",
			"typeOnly": false,
			"members": [
				"Array",
				"Boolean",
				"ByteSize",
				"Config",
				"ConfigError",
				"Date",
				"Duration",
				"Finite",
				"Int",
				"Literal",
				"Literals",
				"LogLevel",
				"NonEmptyString",
				"Number",
				"Port",
				"Record",
				"Redacted",
				"String",
				"Success",
				"URL",
				"Wrap",
				"all",
				"fail",
				"isConfig",
				"map",
				"mapEffect",
				"nested",
				"option",
				"orElse",
				"schema",
				"succeed",
				"unwrap",
				"withDefault"
			]
		}
	],
	"ConfigProvider": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "ConfigProvider",
			"localName": "ConfigProvider",
			"typeOnly": false,
			"members": [
				"ConfigProvider",
				"Node",
				"Path",
				"SourceError",
				"constantCase",
				"fromDir",
				"fromDotEnv",
				"fromDotEnvContents",
				"fromEnv",
				"fromEnvRecord",
				"fromUnknown",
				"layer",
				"layerAdd",
				"make",
				"makeArray",
				"makeRecord",
				"makeValue",
				"mapInput",
				"nested",
				"orElse"
			]
		}
	],
	"Console": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Console",
			"localName": "Console",
			"typeOnly": false,
			"members": [
				"Console",
				"assert",
				"clear",
				"consoleWith",
				"count",
				"countReset",
				"debug",
				"dir",
				"dirxml",
				"error",
				"group",
				"info",
				"log",
				"table",
				"time",
				"timeLog",
				"trace",
				"warn",
				"withGroup",
				"withTime"
			]
		}
	],
	"Context": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Context",
			"localName": "Context",
			"typeOnly": false,
			"members": [
				"Context",
				"Key",
				"Reference",
				"Service",
				"ServiceClass",
				"ServiceTypeId",
				"add",
				"addOrOmit",
				"addUnsafe",
				"empty",
				"get",
				"getOption",
				"getOrElse",
				"getOrUndefined",
				"getUnsafe",
				"isContext",
				"isKey",
				"isReference",
				"make",
				"makeUnsafe",
				"merge",
				"mergeAll",
				"omit",
				"pick"
			]
		}
	],
	"ContextRPC": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "ContextRPC",
			"localName": "ContextRPC",
			"typeOnly": false
		}
	],
	"ContextTestEnvironment": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "ContextTestEnvironment",
			"localName": "ContextTestEnvironment",
			"typeOnly": false
		}
	],
	"Cookies": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "Cookies",
			"localName": "Cookies",
			"typeOnly": false,
			"members": [
				"Cookie",
				"Cookies",
				"CookiesError",
				"CookiesErrorReason",
				"empty",
				"expireCookie",
				"expireCookieUnsafe",
				"fromIterable",
				"fromReadonlyRecord",
				"fromSetCookie",
				"get",
				"getValue",
				"isCookie",
				"isCookies",
				"isEmpty",
				"makeCookie",
				"makeCookieUnsafe",
				"merge",
				"parseHeader",
				"remove",
				"serializeCookie",
				"set",
				"setAll",
				"setAllCookie",
				"setAllUnsafe",
				"setCookie",
				"setUnsafe",
				"toCookieHeader",
				"toRecord",
				"toSetCookieHeaders"
			]
		}
	],
	"createExpect": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "createExpect",
			"localName": "createExpect",
			"typeOnly": false
		}
	],
	"Cron": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Cron",
			"localName": "Cron",
			"typeOnly": false,
			"members": [
				"Cron",
				"CronParseError",
				"Equivalence",
				"equals",
				"format",
				"isCron",
				"isCronParseError",
				"make",
				"match",
				"next",
				"parse",
				"parseUnsafe",
				"prev",
				"sequence"
			]
		}
	],
	"Crypto": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Crypto",
			"localName": "Crypto",
			"typeOnly": false,
			"members": [
				"Crypto",
				"DigestAlgorithm",
				"make"
			]
		}
	],
	"Data": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Data",
			"localName": "Data",
			"typeOnly": false,
			"members": [
				"Class",
				"Error",
				"TaggedClass",
				"TaggedEnum",
				"TaggedError",
				"taggedEnum"
			]
		}
	],
	"DateTime": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "DateTime",
			"localName": "DateTime",
			"typeOnly": false,
			"members": [
				"CurrentTimeZone",
				"DateTime",
				"Disambiguation",
				"Equivalence",
				"Order",
				"TimeZone",
				"Utc",
				"Zoned",
				"add",
				"addDuration",
				"between",
				"clamp",
				"distance",
				"endOf",
				"format",
				"formatIntl",
				"formatIso",
				"formatIsoDate",
				"formatIsoDateUtc",
				"formatIsoOffset",
				"formatIsoZoned",
				"formatLocal",
				"formatUtc",
				"fromDateUnsafe",
				"fromEpochSeconds",
				"getPart",
				"getPartUtc",
				"isDateTime",
				"isFuture",
				"isFutureUnsafe",
				"isGreaterThan",
				"isGreaterThanOrEqualTo",
				"isLessThan",
				"isLessThanOrEqualTo",
				"isPast",
				"isPastUnsafe",
				"isTimeZone",
				"isTimeZoneNamed",
				"isTimeZoneOffset",
				"isUtc",
				"isZoned",
				"layerCurrentZone",
				"layerCurrentZoneLocal",
				"layerCurrentZoneNamed",
				"layerCurrentZoneOffset",
				"make",
				"makeUnsafe",
				"makeZoned",
				"makeZonedFromString",
				"makeZonedUnsafe",
				"mapEpochMillis",
				"match",
				"max",
				"min",
				"mutate",
				"mutateUtc",
				"nearest",
				"now",
				"nowAsDate",
				"nowInCurrentZone",
				"nowUnsafe",
				"removeTime",
				"setParts",
				"setPartsUtc",
				"setZone",
				"setZoneCurrent",
				"setZoneNamed",
				"setZoneNamedUnsafe",
				"setZoneOffset",
				"startOf",
				"subtract",
				"subtractDuration",
				"toDate",
				"toDateUtc",
				"toEpochMillis",
				"toEpochSeconds",
				"toParts",
				"toPartsUtc",
				"toUtc",
				"withCurrentZone",
				"withCurrentZoneLocal",
				"withCurrentZoneNamed",
				"withCurrentZoneOffset",
				"withDate",
				"withDateUtc",
				"zoneFromString",
				"zoneMakeLocal",
				"zoneMakeNamed",
				"zoneMakeNamedEffect",
				"zoneMakeNamedUnsafe",
				"zoneMakeOffset",
				"zoneToString",
				"zonedOffset",
				"zonedOffsetIso"
			]
		}
	],
	"Decision": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "Decision",
			"localName": "Decision",
			"typeOnly": false,
			"members": [
				"Answer",
				"Answers",
				"Any",
				"Classify",
				"ClassifyAnswer",
				"Definition",
				"Probability",
				"ProbabilityAnswer",
				"Rate",
				"RateAnswer",
				"TypeId",
				"classify",
				"make",
				"probability",
				"rate"
			]
		}
	],
	"DecisionModel": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "DecisionModel",
			"localName": "DecisionModel",
			"typeOnly": false,
			"members": [
				"DecideOptions",
				"DecideResponse",
				"DecisionModel",
				"DecisionUsage",
				"ProviderAnswer",
				"ProviderClassifyAnswer",
				"ProviderOptions",
				"ProviderProbabilityAnswer",
				"ProviderRateAnswer",
				"ProviderResponse",
				"TypeId",
				"decide",
				"make"
			]
		}
	],
	"DeeplyAllowMatchers": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "DeeplyAllowMatchers",
			"localName": "DeeplyAllowMatchers",
			"typeOnly": false
		}
	],
	"Deferred": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Deferred",
			"localName": "Deferred",
			"typeOnly": false,
			"members": [
				"Deferred",
				"await",
				"complete",
				"completeWith",
				"die",
				"dieSync",
				"done",
				"doneUnsafe",
				"fail",
				"failCause",
				"failCauseSync",
				"failSync",
				"interrupt",
				"interruptWith",
				"into",
				"isDeferred",
				"isDone",
				"isDoneUnsafe",
				"make",
				"makeUnsafe",
				"poll",
				"succeed",
				"sync"
			]
		}
	],
	"DeliverAt": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "DeliverAt",
			"localName": "DeliverAt",
			"typeOnly": false,
			"members": [
				"DeliverAt",
				"isDeliverAt",
				"symbol",
				"toMillis"
			]
		}
	],
	"describe": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "describe",
			"localName": "describe",
			"typeOnly": false
		}
	],
	"describeWrapped": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "describeWrapped",
			"localName": "describeWrapped",
			"typeOnly": false
		}
	],
	"DevTools": [
		{
			"moduleSpecifier": "effect/unstable/devtools",
			"importKind": "named",
			"importedName": "DevTools",
			"localName": "DevTools",
			"typeOnly": false,
			"members": [
				"layer",
				"layerSocket",
				"layerWebSocket"
			]
		}
	],
	"DevToolsClient": [
		{
			"moduleSpecifier": "effect/unstable/devtools",
			"importKind": "named",
			"importedName": "DevToolsClient",
			"localName": "DevToolsClient",
			"typeOnly": false,
			"members": [
				"DevToolsClient",
				"layer",
				"layerTracer",
				"make",
				"makeTracer"
			]
		}
	],
	"DevToolsSchema": [
		{
			"moduleSpecifier": "effect/unstable/devtools",
			"importKind": "named",
			"importedName": "DevToolsSchema",
			"localName": "DevToolsSchema",
			"typeOnly": false,
			"members": [
				"Counter",
				"ExternalSpan",
				"Frequency",
				"Gauge",
				"Histogram",
				"Metric",
				"MetricLabel",
				"MetricsRequest",
				"MetricsSnapshot",
				"ParentSpan",
				"Ping",
				"Pong",
				"Request",
				"Response",
				"Span",
				"SpanEvent",
				"SpanStatus",
				"SpanStatusEnded",
				"SpanStatusStarted",
				"Summary"
			]
		}
	],
	"DevToolsServer": [
		{
			"moduleSpecifier": "effect/unstable/devtools",
			"importKind": "named",
			"importedName": "DevToolsServer",
			"localName": "DevToolsServer",
			"typeOnly": false,
			"members": [
				"Client",
				"run"
			]
		}
	],
	"Differ": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Differ",
			"localName": "Differ",
			"typeOnly": false,
			"members": [
				"Differ"
			]
		}
	],
	"DiffOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "DiffOptions",
			"localName": "DiffOptions",
			"typeOnly": false
		}
	],
	"DomainMatchResult": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "DomainMatchResult",
			"localName": "DomainMatchResult",
			"typeOnly": false
		}
	],
	"DomainSnapshotAdapter": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "DomainSnapshotAdapter",
			"localName": "DomainSnapshotAdapter",
			"typeOnly": false
		}
	],
	"DurableClock": [
		{
			"moduleSpecifier": "effect/unstable/workflow",
			"importKind": "named",
			"importedName": "DurableClock",
			"localName": "DurableClock",
			"typeOnly": false,
			"members": [
				"DurableClock",
				"make",
				"sleep"
			]
		}
	],
	"DurableDeferred": [
		{
			"moduleSpecifier": "effect/unstable/workflow",
			"importKind": "named",
			"importedName": "DurableDeferred",
			"localName": "DurableDeferred",
			"typeOnly": false,
			"members": [
				"Any",
				"AnyWithProps",
				"DurableDeferred",
				"Token",
				"TokenParsed",
				"TokenTypeId",
				"await",
				"done",
				"fail",
				"failCause",
				"into",
				"make",
				"raceAll",
				"succeed",
				"token",
				"tokenFromExecutionId",
				"tokenFromPayload"
			]
		}
	],
	"DurableQueue": [
		{
			"moduleSpecifier": "effect/unstable/workflow",
			"importKind": "named",
			"importedName": "DurableQueue",
			"localName": "DurableQueue",
			"typeOnly": false,
			"members": [
				"DurableQueue",
				"TypeId",
				"make",
				"makeWorker",
				"process",
				"worker"
			]
		}
	],
	"Duration": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Duration",
			"localName": "Duration",
			"typeOnly": false,
			"members": [
				"CombinerMax",
				"CombinerMin",
				"Duration",
				"DurationObject",
				"DurationValue",
				"Equivalence",
				"Input",
				"Order",
				"ReducerSum",
				"Unit",
				"abs",
				"between",
				"clamp",
				"days",
				"divide",
				"divideUnsafe",
				"equals",
				"format",
				"fromInput",
				"fromInputUnsafe",
				"hours",
				"infinity",
				"isDuration",
				"isFinite",
				"isGreaterThan",
				"isGreaterThanOrEqualTo",
				"isLessThan",
				"isLessThanOrEqualTo",
				"isNegative",
				"isPositive",
				"isZero",
				"match",
				"matchPair",
				"max",
				"micros",
				"millis",
				"min",
				"minutes",
				"nanos",
				"negate",
				"negativeInfinity",
				"parts",
				"seconds",
				"subtract",
				"sum",
				"times",
				"toDays",
				"toHours",
				"toHrTime",
				"toMillis",
				"toMinutes",
				"toNanos",
				"toNanosUnsafe",
				"toSeconds",
				"toWeeks",
				"weeks",
				"zero"
			]
		}
	],
	"effect": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "effect",
			"localName": "effect",
			"typeOnly": false
		}
	],
	"Effect": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Effect",
			"localName": "Effect",
			"typeOnly": false,
			"members": [
				"All",
				"Do",
				"Effect",
				"EffectIterator",
				"EffectTypeLambda",
				"EffectUnify",
				"Effectify",
				"Error",
				"Repeat",
				"Retry",
				"RunOptions",
				"Services",
				"Success",
				"TagsWithReason",
				"Transaction",
				"TypeId",
				"Variance",
				"abortSignal",
				"acquireDisposable",
				"acquireRelease",
				"acquireUseRelease",
				"addFinalizer",
				"all",
				"andThen",
				"annotateCurrentSpan",
				"annotateLogs",
				"annotateLogsScoped",
				"annotateSpans",
				"as",
				"asSome",
				"asVoid",
				"awaitAllChildren",
				"bind",
				"bindTo",
				"cached",
				"cachedInvalidateWithTTL",
				"cachedWithTTL",
				"callback",
				"catch",
				"catchCause",
				"catchCauseFilter",
				"catchCauseIf",
				"catchDefect",
				"catchEager",
				"catchFilter",
				"catchIf",
				"catchNoSuchElement",
				"catchReason",
				"catchReasons",
				"catchTag",
				"catchTags",
				"clockWith",
				"context",
				"contextWith",
				"currentParentSpan",
				"currentSpan",
				"delay",
				"die",
				"effectify",
				"ensuring",
				"eventually",
				"exit",
				"fail",
				"failCause",
				"failCauseSync",
				"failSync",
				"fiber",
				"fiberId",
				"filter",
				"filterMap",
				"filterMapEffect",
				"filterMapOrElse",
				"filterMapOrFail",
				"filterOrElse",
				"filterOrFail",
				"findFirst",
				"findFirstFilter",
				"firstSuccessOf",
				"flatMap",
				"flatMapEager",
				"flatten",
				"flip",
				"fn",
				"fnUntraced",
				"fnUntracedEager",
				"forEach",
				"forever",
				"forkChild",
				"forkDetach",
				"forkIn",
				"forkScoped",
				"fromNullishOr",
				"fromOption",
				"fromResult",
				"gen",
				"head",
				"ignore",
				"ignoreCause",
				"interrupt",
				"interruptible",
				"interruptibleMask",
				"isEffect",
				"isFailure",
				"isSuccess",
				"let",
				"linkSpans",
				"log",
				"logDebug",
				"logError",
				"logFatal",
				"logInfo",
				"logTrace",
				"logWarning",
				"logWithLevel",
				"makeSpan",
				"makeSpanScoped",
				"map",
				"mapBoth",
				"mapBothEager",
				"mapEager",
				"mapError",
				"mapErrorEager",
				"match",
				"matchCause",
				"matchCauseEager",
				"matchCauseEffect",
				"matchCauseEffectEager",
				"matchEager",
				"matchEffect",
				"never",
				"onError",
				"onErrorFilter",
				"onErrorIf",
				"onExit",
				"onExitFilter",
				"onExitIf",
				"onExitPrimitive",
				"onInterrupt",
				"option",
				"orDie",
				"orElseSucceed",
				"partition",
				"promise",
				"provide",
				"provideContext",
				"provideService",
				"provideServiceEffect",
				"race",
				"raceAll",
				"raceAllFirst",
				"raceFirst",
				"reduce",
				"repeat",
				"repeatOrElse",
				"replicate",
				"replicateEffect",
				"request",
				"requestUnsafe",
				"result",
				"retry",
				"retryOrElse",
				"runCallback",
				"runCallbackWith",
				"runFork",
				"runForkWith",
				"runPromise",
				"runPromiseExit",
				"runPromiseExitWith",
				"runPromiseWith",
				"runSync",
				"runSyncExit",
				"runSyncExitWith",
				"runSyncWith",
				"sandbox",
				"satisfiesErrorType",
				"satisfiesServicesType",
				"satisfiesSuccessType",
				"schedule",
				"scheduleFrom",
				"scope",
				"scoped",
				"scopedWith",
				"service",
				"serviceOption",
				"setContext",
				"sleep",
				"spanAnnotations",
				"spanLinks",
				"succeed",
				"succeedNone",
				"succeedSome",
				"suspend",
				"sync",
				"tap",
				"tapCause",
				"tapCauseFilter",
				"tapCauseIf",
				"tapDefect",
				"tapError",
				"tapErrorTag",
				"timed",
				"timeout",
				"timeoutOption",
				"timeoutOrElse",
				"tracer",
				"track",
				"trackDefects",
				"trackDuration",
				"trackErrors",
				"trackSuccesses",
				"transposeOption",
				"try",
				"tryPromise",
				"tx",
				"txRetry",
				"undefined",
				"uninterruptible",
				"uninterruptibleMask",
				"unwrapReason",
				"updateContext",
				"updateService",
				"updateServiceScoped",
				"useSpan",
				"validate",
				"void",
				"when",
				"whileLoop",
				"withErrorReporting",
				"withExecutionPlan",
				"withFiber",
				"withFiberSucceed",
				"withLogSpan",
				"withLogger",
				"withParentSpan",
				"withSpan",
				"withSpanScoped",
				"withTracer",
				"withTracerEnabled",
				"withTracerTiming",
				"yieldNow",
				"yieldNowWith",
				"zip",
				"zipWith"
			]
		}
	],
	"Effectable": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Effectable",
			"localName": "Effectable",
			"typeOnly": false,
			"members": [
				"Class",
				"Mixin",
				"Prototype"
			]
		}
	],
	"EmbeddingModel": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "EmbeddingModel",
			"localName": "EmbeddingModel",
			"typeOnly": false,
			"members": [
				"Dimensions",
				"EmbedManyResponse",
				"EmbedResponse",
				"EmbeddingModel",
				"EmbeddingRequest",
				"EmbeddingUsage",
				"ProviderOptions",
				"ProviderResponse",
				"TypeId",
				"make"
			]
		}
	],
	"Encoding": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Encoding",
			"localName": "Encoding",
			"typeOnly": false,
			"members": [
				"EncodingError",
				"EncodingErrorTypeId",
				"decodeBase64",
				"decodeBase64String",
				"decodeBase64Url",
				"decodeBase64UrlString",
				"decodeHex",
				"decodeHexString",
				"encodeBase64",
				"encodeBase64Url",
				"encodeHex",
				"isEncodingError",
				"randomHex"
			]
		}
	],
	"Entity": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "Entity",
			"localName": "Entity",
			"typeOnly": false,
			"members": [
				"Any",
				"CurrentAddress",
				"CurrentRunnerAddress",
				"Entity",
				"HandlersFrom",
				"KeepAliveLatch",
				"KeepAliveRpc",
				"Replier",
				"Request",
				"fromRpcGroup",
				"isEntity",
				"keepAlive",
				"make",
				"makeTestClient"
			]
		}
	],
	"EntityAddress": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "EntityAddress",
			"localName": "EntityAddress",
			"typeOnly": false,
			"members": [
				"EntityAddress",
				"make"
			]
		}
	],
	"EntityId": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "EntityId",
			"localName": "EntityId",
			"typeOnly": false,
			"members": [
				"EntityId",
				"make"
			]
		}
	],
	"EntityProxy": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "EntityProxy",
			"localName": "EntityProxy",
			"typeOnly": false,
			"members": [
				"ConvertHttpApi",
				"ConvertRpcs",
				"toHttpApiGroup",
				"toRpcGroup"
			]
		}
	],
	"EntityProxyServer": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "EntityProxyServer",
			"localName": "EntityProxyServer",
			"typeOnly": false,
			"members": [
				"RpcHandlers",
				"layerHttpApi",
				"layerRpcHandlers"
			]
		}
	],
	"EntityResource": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "EntityResource",
			"localName": "EntityResource",
			"typeOnly": false,
			"members": [
				"CloseScope",
				"EntityResource",
				"TypeId",
				"make",
				"makeK8sPod"
			]
		}
	],
	"EntityType": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "EntityType",
			"localName": "EntityType",
			"typeOnly": false,
			"members": [
				"EntityType",
				"make"
			]
		}
	],
	"Envelope": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "Envelope",
			"localName": "Envelope",
			"typeOnly": false,
			"members": [
				"AckChunk",
				"AckChunkEncoded",
				"Encoded",
				"Envelope",
				"Interrupt",
				"InterruptEncoded",
				"OpaqueHole",
				"Partial",
				"PartialArray",
				"PartialJson",
				"PartialRequest",
				"PartialRequestEncoded",
				"Request",
				"RequestTransform",
				"TypeId",
				"isEnvelope",
				"makeRequest",
				"primaryKey",
				"primaryKeyByAddress"
			]
		}
	],
	"Equal": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Equal",
			"localName": "Equal",
			"typeOnly": false,
			"members": [
				"Equal",
				"asEquivalence",
				"byReference",
				"byReferenceUnsafe",
				"equals",
				"isEqual",
				"symbol"
			]
		}
	],
	"Equivalence": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Equivalence",
			"localName": "Equivalence",
			"typeOnly": false,
			"members": [
				"Array",
				"BigInt",
				"Boolean",
				"Date",
				"Equivalence",
				"EquivalenceTypeLambda",
				"Number",
				"Record",
				"String",
				"Struct",
				"Tuple",
				"combine",
				"combineAll",
				"make",
				"makeReducer",
				"mapInput",
				"strictEqual"
			]
		}
	],
	"ErrorReporter": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "ErrorReporter",
			"localName": "ErrorReporter",
			"typeOnly": false,
			"members": [
				"CurrentErrorReporters",
				"ErrorReporter",
				"Reportable",
				"TypeId",
				"attributes",
				"getAttributes",
				"getSeverity",
				"ignore",
				"isIgnored",
				"layer",
				"make",
				"report",
				"severity"
			]
		}
	],
	"Etag": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "Etag",
			"localName": "Etag",
			"typeOnly": false,
			"members": [
				"Etag",
				"Generator",
				"Strong",
				"Weak",
				"layer",
				"layerWeak",
				"toString"
			]
		}
	],
	"EvaluatedModules": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "EvaluatedModules",
			"localName": "EvaluatedModules",
			"typeOnly": false
		}
	],
	"Event": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "Event",
			"localName": "Event",
			"typeOnly": false,
			"members": [
				"AddError",
				"Any",
				"AnyWithProps",
				"Error",
				"ErrorSchema",
				"ErrorWithTag",
				"Event",
				"EventHandler",
				"ExcludeTag",
				"Payload",
				"PayloadSchema",
				"PayloadSchemaWithTag",
				"PayloadWithTag",
				"Services",
				"ServicesClient",
				"ServicesClientWithTag",
				"ServicesServer",
				"Success",
				"SuccessSchema",
				"SuccessWithTag",
				"Tag",
				"TaggedPayload",
				"ToService",
				"TypeId",
				"WithTag",
				"addError",
				"isEvent",
				"make"
			]
		}
	],
	"EventGroup": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "EventGroup",
			"localName": "EventGroup",
			"typeOnly": false,
			"members": [
				"Any",
				"AnyWithProps",
				"EventGroup",
				"Events",
				"ServicesClient",
				"ServicesServer",
				"ToService",
				"TypeId",
				"empty",
				"isEventGroup"
			]
		}
	],
	"EventJournal": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "EventJournal",
			"localName": "EventJournal",
			"typeOnly": false,
			"members": [
				"Entry",
				"EntryId",
				"EntryIdOrder",
				"EntryIdTypeId",
				"EventJournal",
				"EventJournalError",
				"RemoteEntry",
				"RemoteId",
				"RemoteIdTypeId",
				"entryIdMillis",
				"layerIndexedDb",
				"layerMemory",
				"makeEntryIdUnsafe",
				"makeIndexedDb",
				"makeMemory",
				"makeRemoteIdUnsafe"
			]
		}
	],
	"EventLog": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "EventLog",
			"localName": "EventLog",
			"typeOnly": false,
			"members": [
				"CurrentStoreId",
				"EventLog",
				"EventLogSchema",
				"Handlers",
				"HandlersTypeId",
				"Identity",
				"IdentitySchema",
				"Registry",
				"SchemaTypeId",
				"decodeIdentityString",
				"encodeIdentityString",
				"group",
				"groupCompaction",
				"groupReactivity",
				"isEventLogSchema",
				"layer",
				"layerEventLog",
				"layerRegistry",
				"makeClient",
				"makeIdentity",
				"makeReplayFromRemote",
				"schema"
			]
		}
	],
	"EventLogEncryption": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "EventLogEncryption",
			"localName": "EventLogEncryption",
			"typeOnly": false,
			"members": [
				"EncryptedEntry",
				"EncryptedRemoteEntry",
				"EventLogEncryption",
				"layerSubtle",
				"makeEncryptionSubtle"
			]
		}
	],
	"EventLogMessage": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "EventLogMessage",
			"localName": "EventLogMessage",
			"typeOnly": false,
			"members": [
				"Authenticate",
				"AuthenticateRpc",
				"ChangesRpc",
				"ChunkedMessage",
				"EventLogAuthentication",
				"EventLogProtocolError",
				"EventLogRemoteRpcs",
				"HelloResponse",
				"HelloRpc",
				"SingleMessage",
				"StoreId",
				"StoreIdTypeId",
				"WriteChunkedRpc",
				"WriteEntries",
				"WriteEntriesUnencrypted",
				"WriteSingleRpc"
			]
		}
	],
	"EventLogRemote": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "EventLogRemote",
			"localName": "EventLogRemote",
			"typeOnly": false,
			"members": [
				"EventLogRemote",
				"EventLogRemoteClient",
				"EventLogRemoteError",
				"layerEncrypted",
				"layerUnencrypted",
				"makeEncrypted",
				"makeUnencrypted",
				"makeWith"
			]
		}
	],
	"EventLogServer": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "EventLogServer",
			"localName": "EventLogServer",
			"typeOnly": false,
			"members": [
				"AuthenticatedIdentities",
				"ChunkedMessageState",
				"layerAuthMiddleware",
				"layerRpcHandlers"
			]
		}
	],
	"EventLogServerEncrypted": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "EventLogServerEncrypted",
			"localName": "EventLogServerEncrypted",
			"typeOnly": false,
			"members": [
				"PersistedEntry",
				"Storage",
				"layer",
				"layerRpcHandlers",
				"layerStorageMemory",
				"makeStorageMemory"
			]
		}
	],
	"EventLogServerUnencrypted": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "EventLogServerUnencrypted",
			"localName": "EventLogServerUnencrypted",
			"typeOnly": false,
			"members": [
				"EventLogServerAuthError",
				"EventLogServerAuthorization",
				"EventLogServerStoreError",
				"EventLogServerUnencrypted",
				"Storage",
				"StoreMapping",
				"compactBacklog",
				"layer",
				"layerNoRpcServer",
				"layerRpcHandlers",
				"layerServer",
				"layerStorageMemory",
				"layerStoreMappingStatic",
				"make",
				"makeStorageMemory",
				"makeWrite"
			]
		}
	],
	"EventLogSessionAuth": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "EventLogSessionAuth",
			"localName": "EventLogSessionAuth",
			"typeOnly": false,
			"members": [
				"AuthPayloadContext",
				"Ed25519PublicKeyLength",
				"Ed25519SignatureLength",
				"EventLogSessionAuthError",
				"SessionAuthChallengeLength",
				"SessionAuthChallengeTimeToLiveMillis",
				"SessionAuthPayload",
				"decodeSessionAuthPayload",
				"encodeSessionAuthPayload",
				"makeSessionAuthChallenge",
				"signSessionAuthPayload",
				"signSessionAuthPayloadBytes",
				"verifySessionAuthPayload",
				"verifySessionAuthPayloadBytes",
				"verifySessionAuthenticateRequest"
			]
		}
	],
	"ExecutionPlan": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "ExecutionPlan",
			"localName": "ExecutionPlan",
			"typeOnly": false,
			"members": [
				"AttemptFailure",
				"AttemptStart",
				"AttemptSuccess",
				"ConfigBase",
				"CurrentMetadata",
				"Event",
				"ExecutionPlan",
				"Metadata",
				"TypeId",
				"isExecutionPlan",
				"make",
				"merge"
			]
		}
	],
	"Exit": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Exit",
			"localName": "Exit",
			"typeOnly": false,
			"members": [
				"Exit",
				"Failure",
				"Success",
				"asVoid",
				"asVoidAll",
				"die",
				"fail",
				"failCause",
				"filterCause",
				"filterFailure",
				"filterSuccess",
				"filterValue",
				"findDefect",
				"findError",
				"findErrorOption",
				"getCause",
				"getSuccess",
				"hasDies",
				"hasFails",
				"hasInterrupts",
				"interrupt",
				"isExit",
				"isFailure",
				"isSuccess",
				"map",
				"mapBoth",
				"mapError",
				"match",
				"succeed",
				"void"
			]
		}
	],
	"expect": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "expect",
			"localName": "expect",
			"typeOnly": false
		}
	],
	"ExpectStatic": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "ExpectStatic",
			"localName": "ExpectStatic",
			"typeOnly": false
		}
	],
	"expectTypeOf": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "expectTypeOf",
			"localName": "expectTypeOf",
			"typeOnly": false
		}
	],
	"ExpectTypeOf": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "ExpectTypeOf",
			"localName": "ExpectTypeOf",
			"typeOnly": false
		}
	],
	"Experimental": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "Experimental",
			"localName": "Experimental",
			"typeOnly": false
		}
	],
	"ExternalResult": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "ExternalResult",
			"localName": "ExternalResult",
			"typeOnly": false
		}
	],
	"FailureScreenshotArtifact": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "FailureScreenshotArtifact",
			"localName": "FailureScreenshotArtifact",
			"typeOnly": false
		}
	],
	"FetchHttpClient": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "FetchHttpClient",
			"localName": "FetchHttpClient",
			"typeOnly": false,
			"members": [
				"Fetch",
				"RequestInit",
				"layer"
			]
		}
	],
	"Fiber": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Fiber",
			"localName": "Fiber",
			"typeOnly": false,
			"members": [
				"Fiber",
				"await",
				"awaitAll",
				"getCurrent",
				"interrupt",
				"interruptAll",
				"interruptAllAs",
				"interruptAs",
				"isFiber",
				"join",
				"joinAll",
				"runIn"
			]
		}
	],
	"FiberHandle": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "FiberHandle",
			"localName": "FiberHandle",
			"typeOnly": false,
			"members": [
				"FiberHandle",
				"awaitEmpty",
				"clear",
				"get",
				"getUnsafe",
				"isFiberHandle",
				"join",
				"make",
				"makeRuntime",
				"makeRuntimePromise",
				"run",
				"runtime",
				"runtimePromise",
				"set",
				"setUnsafe"
			]
		}
	],
	"FiberMap": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "FiberMap",
			"localName": "FiberMap",
			"typeOnly": false,
			"members": [
				"FiberMap",
				"awaitEmpty",
				"clear",
				"get",
				"getUnsafe",
				"has",
				"hasUnsafe",
				"isFiberMap",
				"join",
				"make",
				"makeRuntime",
				"makeRuntimePromise",
				"remove",
				"run",
				"runtime",
				"runtimePromise",
				"set",
				"setUnsafe",
				"size"
			]
		}
	],
	"FiberSet": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "FiberSet",
			"localName": "FiberSet",
			"typeOnly": false,
			"members": [
				"FiberSet",
				"add",
				"addUnsafe",
				"awaitEmpty",
				"clear",
				"isFiberSet",
				"join",
				"make",
				"makeRuntime",
				"makeRuntimePromise",
				"run",
				"runtime",
				"runtimePromise",
				"size"
			]
		}
	],
	"FileSystem": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "FileSystem",
			"localName": "FileSystem",
			"typeOnly": false,
			"members": [
				"File",
				"FileSystem",
				"FileTypeId",
				"OpenFlag",
				"SeekMode",
				"WatchBackend",
				"WatchEvent",
				"WatchOptions",
				"isFile",
				"layerNoop",
				"make",
				"makeNoop"
			]
		}
	],
	"Filter": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Filter",
			"localName": "Filter",
			"typeOnly": false,
			"members": [
				"Filter",
				"FilterEffect",
				"andLeft",
				"andRight",
				"bigint",
				"boolean",
				"compose",
				"composePassthrough",
				"date",
				"equals",
				"equalsStrict",
				"fromPredicate",
				"fromPredicateOption",
				"has",
				"instanceOf",
				"make",
				"makeEffect",
				"mapFail",
				"number",
				"or",
				"reason",
				"string",
				"symbol",
				"tagged",
				"toOption",
				"toPredicate",
				"toResult",
				"try",
				"zip",
				"zipWith"
			]
		}
	],
	"FindMyWay": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "FindMyWay",
			"localName": "FindMyWay",
			"typeOnly": false,
			"members": [
				"FindResult",
				"PathInput",
				"Router",
				"RouterConfig",
				"make"
			]
		}
	],
	"Flag": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "Flag",
			"localName": "Flag",
			"typeOnly": false,
			"members": [
				"Boolean",
				"ChoiceWithValue",
				"Date",
				"Directory",
				"File",
				"FileParse",
				"FileSchema",
				"FileText",
				"Finite",
				"Flag",
				"Int",
				"KeyValuePair",
				"Literals",
				"Never",
				"Path",
				"Redacted",
				"String",
				"atLeast",
				"atMost",
				"between",
				"filter",
				"filterMap",
				"map",
				"mapEffect",
				"mapTryCatch",
				"optional",
				"orElse",
				"orElseResult",
				"withAlias",
				"withDefault",
				"withDescription",
				"withFallbackConfig",
				"withFallbackPrompt",
				"withHidden",
				"withMetavar",
				"withSchema"
			]
		}
	],
	"flakyTest": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "flakyTest",
			"localName": "flakyTest",
			"typeOnly": false
		}
	],
	"flow": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "flow",
			"localName": "flow",
			"typeOnly": false
		}
	],
	"Formatter": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Formatter",
			"localName": "Formatter",
			"typeOnly": false,
			"members": [
				"Formatter",
				"format",
				"formatJson"
			]
		}
	],
	"Function": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Function",
			"localName": "Function",
			"typeOnly": false,
			"members": [
				"FunctionN",
				"FunctionTypeLambda",
				"LazyArg",
				"SK",
				"absurd",
				"apply",
				"cast",
				"compose",
				"constFalse",
				"constNull",
				"constTrue",
				"constUndefined",
				"constVoid",
				"constant",
				"dual",
				"flip",
				"flow",
				"hole",
				"identity",
				"memoize",
				"memoizeIdempotent",
				"pipe",
				"satisfies",
				"tupled",
				"untupled"
			]
		}
	],
	"Geolocation": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "Geolocation",
			"localName": "Geolocation",
			"typeOnly": false,
			"members": [
				"Geolocation",
				"GeolocationError",
				"GeolocationErrorReason",
				"PermissionDenied",
				"PositionUnavailable",
				"Timeout",
				"layer",
				"watchPosition"
			]
		}
	],
	"GlobalFlag": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "GlobalFlag",
			"localName": "GlobalFlag",
			"typeOnly": false,
			"members": [
				"Action",
				"BuiltIn",
				"BuiltIns",
				"Completions",
				"GlobalFlag",
				"HandlerContext",
				"Help",
				"LogLevel",
				"Setting",
				"Version",
				"Wizard"
			]
		}
	],
	"Graph": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Graph",
			"localName": "Graph",
			"typeOnly": false,
			"members": [
				"AllPairsResult",
				"AllShortestPathsConfig",
				"AstarConfig",
				"BellmanFordConfig",
				"BipartiteMatch",
				"CycleResult",
				"DijkstraConfig",
				"DirectedGraph",
				"Direction",
				"Edge",
				"EdgeIndex",
				"EdgeWalker",
				"ExternalsConfig",
				"Graph",
				"GraphError",
				"GraphVizOptions",
				"IdentityOptions",
				"IndexedEdge",
				"IndexedNode",
				"Kind",
				"MaximumFlowConfig",
				"MaximumFlowResult",
				"MermaidDiagramType",
				"MermaidDirection",
				"MermaidNodeShape",
				"MermaidOptions",
				"MinimumCutResult",
				"MutableDirectedGraph",
				"MutableGraph",
				"MutableUndirectedGraph",
				"NeighborhoodConfig",
				"NodeIndex",
				"NodeWalker",
				"PathResult",
				"PathWalker",
				"ReachabilityConfig",
				"SearchConfig",
				"SimplePathsConfig",
				"Snapshot",
				"TopoConfig",
				"TraversalDirection",
				"UndirectedGraph",
				"Walker",
				"addEdge",
				"addNode",
				"allShortestPaths",
				"articulationPoints",
				"astar",
				"beginMutation",
				"bellmanFord",
				"bfs",
				"biconnectedComponents",
				"bridges",
				"complement",
				"compose",
				"connectedComponents",
				"degree",
				"dfs",
				"dfsPostOrder",
				"difference",
				"dijkstra",
				"directed",
				"edgeCount",
				"edges",
				"edgesBetween",
				"endMutation",
				"entries",
				"externals",
				"filterEdges",
				"filterMapEdges",
				"filterMapNodes",
				"filterNodes",
				"findCycle",
				"findEdge",
				"findEdges",
				"findNode",
				"findNodes",
				"floydWarshall",
				"fromSnapshot",
				"getEdge",
				"getNode",
				"hasEdge",
				"hasNode",
				"hasPath",
				"inDegree",
				"incidentEdges",
				"incomingEdges",
				"indices",
				"inducedSubgraph",
				"intersection",
				"isAcyclic",
				"isBipartite",
				"isConnected",
				"isGraph",
				"isStronglyConnected",
				"isTree",
				"isWeaklyConnected",
				"make",
				"mapEdges",
				"mapNodes",
				"maximumBipartiteMatching",
				"maximumFlow",
				"minimumCut",
				"minimumSpanningForest",
				"mutate",
				"neighborhood",
				"neighbors",
				"neighborsDirected",
				"nodeCount",
				"nodes",
				"outDegree",
				"outgoingEdges",
				"predecessors",
				"removeEdge",
				"removeEdges",
				"removeNode",
				"removeNodes",
				"reverse",
				"simplePaths",
				"stronglyConnectedComponents",
				"successors",
				"sum",
				"symmetricDifference",
				"toGraphViz",
				"toMermaid",
				"toSnapshot",
				"topo",
				"transitiveReduction",
				"undirected",
				"unweightedDistances",
				"updateEdge",
				"updateNode",
				"values",
				"weaklyConnectedComponents"
			]
		}
	],
	"Hash": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Hash",
			"localName": "Hash",
			"typeOnly": false,
			"members": [
				"Hash",
				"array",
				"combine",
				"hash",
				"isHash",
				"number",
				"optimize",
				"random",
				"string",
				"structure",
				"structureKeys",
				"symbol"
			]
		}
	],
	"HashMap": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "HashMap",
			"localName": "HashMap",
			"typeOnly": false,
			"members": [
				"HashMap",
				"beginMutation",
				"compact",
				"empty",
				"endMutation",
				"entries",
				"every",
				"filter",
				"filterMap",
				"findFirst",
				"flatMap",
				"forEach",
				"fromIterable",
				"get",
				"getHash",
				"getUnsafe",
				"has",
				"hasBy",
				"hasHash",
				"isEmpty",
				"isHashMap",
				"keys",
				"make",
				"map",
				"modify",
				"modifyAt",
				"modifyHash",
				"mutate",
				"reduce",
				"remove",
				"removeMany",
				"set",
				"setMany",
				"size",
				"some",
				"toEntries",
				"toValues",
				"union",
				"values"
			]
		}
	],
	"HashRing": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "HashRing",
			"localName": "HashRing",
			"typeOnly": false,
			"members": [
				"HashRing",
				"add",
				"addMany",
				"get",
				"getShards",
				"has",
				"isHashRing",
				"make",
				"remove"
			]
		}
	],
	"HashSet": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "HashSet",
			"localName": "HashSet",
			"typeOnly": false,
			"members": [
				"HashSet",
				"add",
				"difference",
				"empty",
				"every",
				"filter",
				"fromIterable",
				"has",
				"intersection",
				"isEmpty",
				"isHashSet",
				"isSubset",
				"make",
				"map",
				"reduce",
				"remove",
				"size",
				"some",
				"union"
			]
		}
	],
	"Headers": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "Headers",
			"localName": "Headers",
			"typeOnly": false,
			"members": [
				"CurrentRedactedNames",
				"Equivalence",
				"Headers",
				"Input",
				"TypeId",
				"empty",
				"fromInput",
				"fromRecordUnsafe",
				"get",
				"has",
				"isHeaders",
				"isRedactedName",
				"merge",
				"redact",
				"remove",
				"removeMany",
				"set",
				"setAll"
			]
		}
	],
	"HelpDoc": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "HelpDoc",
			"localName": "HelpDoc",
			"typeOnly": false,
			"members": [
				"ArgDoc",
				"ExampleDoc",
				"FlagDoc",
				"HelpDoc",
				"SubcommandDoc",
				"SubcommandGroupDoc"
			]
		}
	],
	"HKT": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "HKT",
			"localName": "HKT",
			"typeOnly": false,
			"members": [
				"Kind",
				"TypeClass",
				"TypeLambda",
				"URI"
			]
		}
	],
	"hole": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "hole",
			"localName": "hole",
			"typeOnly": false
		}
	],
	"HttpApi": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApi",
			"localName": "HttpApi",
			"typeOnly": false,
			"members": [
				"AdditionalSchemas",
				"Constraint",
				"HttpApi",
				"ParseOptions",
				"Top",
				"isHttpApi",
				"make",
				"reflect"
			]
		}
	],
	"HttpApiBuilder": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiBuilder",
			"localName": "HttpApiBuilder",
			"typeOnly": false,
			"members": [
				"Handlers",
				"endpoint",
				"group",
				"handler",
				"layer",
				"securityDecode",
				"securitySetCookie"
			]
		}
	],
	"HttpApiClient": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiClient",
			"localName": "HttpApiClient",
			"typeOnly": false,
			"members": [
				"Client",
				"ForApi",
				"UrlBuilder",
				"endpoint",
				"group",
				"make",
				"makeWith",
				"urlBuilder"
			]
		}
	],
	"HttpApiEndpoint": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiEndpoint",
			"localName": "HttpApiEndpoint",
			"typeOnly": false,
			"members": [
				"AddMiddleware",
				"AddPrefix",
				"ClientRequest",
				"ClientResponseMode",
				"ClientServices",
				"Constraint",
				"ConstraintRequest",
				"Error",
				"ErrorConstraint",
				"ErrorServicesDecode",
				"ErrorServicesEncode",
				"Errors",
				"ErrorsWithIdentifier",
				"ExcludeIdentifier",
				"ExcludeProvided",
				"ExcludeProvidedWithIdentifier",
				"Handler",
				"HandlerRaw",
				"HandlerRawWithIdentifier",
				"HandlerWithIdentifier",
				"Headers",
				"HeadersConstraint",
				"HttpApiEndpoint",
				"Identifier",
				"Middleware",
				"MiddlewareClient",
				"MiddlewareError",
				"MiddlewareProvides",
				"MiddlewareServices",
				"MiddlewareServicesWithIdentifier",
				"MiddlewareWithIdentifier",
				"Params",
				"ParamsConstraint",
				"Payload",
				"PayloadConstraint",
				"PayloadConstraintCodecs",
				"PayloadMap",
				"Query",
				"QueryConstraint",
				"Request",
				"RequestRaw",
				"ServerServices",
				"ServerServicesWithIdentifier",
				"Success",
				"SuccessConstraint",
				"SuccessWithIdentifier",
				"Top",
				"WithIdentifier",
				"delete",
				"get",
				"head",
				"isHttpApiEndpoint",
				"make",
				"options",
				"patch",
				"post",
				"put",
				"query"
			]
		}
	],
	"HttpApiError": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiError",
			"localName": "HttpApiError",
			"typeOnly": false,
			"members": [
				"BadRequest",
				"BadRequestNoContent",
				"Conflict",
				"ConflictNoContent",
				"Forbidden",
				"ForbiddenNoContent",
				"Gone",
				"GoneNoContent",
				"HttpApiSchemaError",
				"HttpApiSchemaErrorTypeId",
				"InternalServerError",
				"InternalServerErrorNoContent",
				"MethodNotAllowed",
				"MethodNotAllowedNoContent",
				"NotAcceptable",
				"NotAcceptableNoContent",
				"NotFound",
				"NotFoundNoContent",
				"NotImplemented",
				"NotImplementedNoContent",
				"RequestTimeout",
				"RequestTimeoutNoContent",
				"ServiceUnavailable",
				"ServiceUnavailableNoContent",
				"Unauthorized",
				"UnauthorizedNoContent",
				"UnprocessableEntity",
				"UnprocessableEntityNoContent"
			]
		}
	],
	"HttpApiGroup": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiGroup",
			"localName": "HttpApiGroup",
			"typeOnly": false,
			"members": [
				"AddMiddleware",
				"AddPrefix",
				"ClientServices",
				"Constraint",
				"Endpoints",
				"EndpointsWithIdentifier",
				"ErrorServicesDecode",
				"ErrorServicesEncode",
				"HttpApiGroup",
				"Identifier",
				"MiddlewareClient",
				"MiddlewareError",
				"MiddlewareProvides",
				"MiddlewareServices",
				"Service",
				"ToService",
				"Top",
				"WithIdentifier",
				"isHttpApiGroup",
				"make"
			]
		}
	],
	"HttpApiMiddleware": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiMiddleware",
			"localName": "HttpApiMiddleware",
			"typeOnly": false,
			"members": [
				"AnyId",
				"AnyService",
				"AnyServiceSecurity",
				"ApplyServices",
				"ClientError",
				"Error",
				"ErrorSchema",
				"ErrorServicesDecode",
				"ErrorServicesEncode",
				"ForClient",
				"HttpApiMiddleware",
				"HttpApiMiddlewareClient",
				"HttpApiMiddlewareSecurity",
				"MiddlewareClient",
				"Provides",
				"Requires",
				"Service",
				"ServiceClass",
				"isSecurity",
				"layerClient",
				"layerSchemaErrorTransform"
			]
		}
	],
	"HttpApiScalar": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiScalar",
			"localName": "HttpApiScalar",
			"typeOnly": false,
			"members": [
				"ScalarConfig",
				"ScalarThemeId",
				"layer",
				"layerCdn"
			]
		}
	],
	"HttpApiSchema": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiSchema",
			"localName": "HttpApiSchema",
			"typeOnly": false,
			"members": [
				"Accepted",
				"Created",
				"Empty",
				"Encoding",
				"MultipartStreamTypeId",
				"MultipartTypeId",
				"NoContent",
				"PayloadEncoding",
				"ResponseEncoding",
				"SseEventFromData",
				"StatusLiteral",
				"StreamSchema",
				"StreamSse",
				"StreamSseMode",
				"StreamUint8Array",
				"WithHeaders",
				"WithHeadersTypeId",
				"WithHeadersValueTypeId",
				"asFormUrlEncoded",
				"asJson",
				"asMultipart",
				"asMultipartStream",
				"asNoContent",
				"asText",
				"asUint8Array",
				"encodeToWithHeaders",
				"isNoContent",
				"isWithHeaders",
				"status",
				"withHeaders"
			]
		}
	],
	"HttpApiSecurity": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiSecurity",
			"localName": "HttpApiSecurity",
			"typeOnly": false,
			"members": [
				"ApiKey",
				"Basic",
				"Credentials",
				"Http",
				"HttpApiSecurity",
				"annotate",
				"annotateMerge",
				"apiKey",
				"basic",
				"bearer",
				"http"
			]
		}
	],
	"HttpApiSwagger": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiSwagger",
			"localName": "HttpApiSwagger",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"HttpApiTest": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "HttpApiTest",
			"localName": "HttpApiTest",
			"typeOnly": false,
			"members": [
				"groups"
			]
		}
	],
	"HttpBody": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpBody",
			"localName": "HttpBody",
			"typeOnly": false,
			"members": [
				"Empty",
				"ErrorReason",
				"FormData",
				"FormDataCoercible",
				"FormDataInput",
				"HttpBody",
				"HttpBodyError",
				"Raw",
				"Stream",
				"Uint8Array",
				"empty",
				"file",
				"fileFromInfo",
				"formData",
				"formDataRecord",
				"isHttpBody",
				"json",
				"jsonSchema",
				"jsonUnsafe",
				"raw",
				"stream",
				"text",
				"uint8Array",
				"urlParams"
			]
		}
	],
	"HttpClient": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpClient",
			"localName": "HttpClient",
			"typeOnly": false,
			"members": [
				"HttpClient",
				"Retry",
				"SpanNameGenerator",
				"TracerDisabledWhen",
				"TracerHeaderFilter",
				"TracerPropagationEnabled",
				"WithRateLimiter",
				"catch",
				"catchTag",
				"catchTags",
				"del",
				"execute",
				"filterOrElse",
				"filterOrFail",
				"filterStatus",
				"filterStatusOk",
				"followRedirects",
				"get",
				"head",
				"isHttpClient",
				"layerMergedContext",
				"make",
				"makeWith",
				"mapRequest",
				"mapRequestEffect",
				"mapRequestInput",
				"mapRequestInputEffect",
				"options",
				"patch",
				"post",
				"put",
				"query",
				"retry",
				"retryTransient",
				"tap",
				"tapError",
				"tapRequest",
				"transform",
				"transformResponse",
				"withCookiesRef",
				"withRateLimiter",
				"withScope"
			]
		}
	],
	"HttpClientError": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpClientError",
			"localName": "HttpClientError",
			"typeOnly": false,
			"members": [
				"DecodeError",
				"EmptyBodyError",
				"EncodeError",
				"HttpClientError",
				"HttpClientErrorReason",
				"HttpClientErrorSchema",
				"InvalidUrlError",
				"RequestError",
				"ResponseError",
				"StatusCodeError",
				"TransportError",
				"isHttpClientError"
			]
		}
	],
	"HttpClientRequest": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpClientRequest",
			"localName": "HttpClientRequest",
			"typeOnly": false,
			"members": [
				"HttpClientRequest",
				"Options",
				"accept",
				"acceptJson",
				"appendUrl",
				"appendUrlParam",
				"appendUrlParams",
				"basicAuth",
				"bearerToken",
				"bodyFile",
				"bodyFormData",
				"bodyFormDataRecord",
				"bodyJson",
				"bodyJsonUnsafe",
				"bodyStream",
				"bodyText",
				"bodyUint8Array",
				"bodyUrlParams",
				"delete",
				"empty",
				"fromWeb",
				"get",
				"head",
				"isHttpClientRequest",
				"make",
				"makeWith",
				"modify",
				"options",
				"patch",
				"post",
				"prependUrl",
				"put",
				"query",
				"removeHash",
				"removeHeader",
				"schemaBodyJson",
				"setBody",
				"setHash",
				"setHeader",
				"setHeaders",
				"setMethod",
				"setUrl",
				"setUrlParam",
				"setUrlParams",
				"toUrl",
				"toWeb",
				"toWebResult",
				"trace",
				"updateHeaders",
				"updateUrl"
			]
		}
	],
	"HttpClientResponse": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpClientResponse",
			"localName": "HttpClientResponse",
			"typeOnly": false,
			"members": [
				"HttpClientResponse",
				"TypeId",
				"filterStatus",
				"filterStatusOk",
				"fromWeb",
				"matchStatus",
				"schemaBodyJson",
				"schemaBodyUrlParams",
				"schemaHeaders",
				"schemaJson",
				"schemaNoBody",
				"stream"
			]
		}
	],
	"HttpEffect": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpEffect",
			"localName": "HttpEffect",
			"typeOnly": false,
			"members": [
				"PreResponseHandler",
				"appendPreResponseHandler",
				"appendPreResponseHandlerUnsafe",
				"fromWebHandler",
				"scopeDisableClose",
				"scopeTransferToStream",
				"toHandled",
				"toWebHandler",
				"toWebHandlerLayer",
				"toWebHandlerLayerWith",
				"toWebHandlerWith",
				"withPreResponseHandler"
			]
		}
	],
	"HttpIncomingMessage": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpIncomingMessage",
			"localName": "HttpIncomingMessage",
			"typeOnly": false,
			"members": [
				"HttpIncomingMessage",
				"JsonOptions",
				"MaxBodySize",
				"TypeId",
				"inspect",
				"isHttpIncomingMessage",
				"schemaBodyJson",
				"schemaBodyUrlParams",
				"schemaHeaders"
			]
		}
	],
	"HttpMethod": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpMethod",
			"localName": "HttpMethod",
			"typeOnly": false,
			"members": [
				"HttpMethod",
				"all",
				"allShort",
				"hasBody",
				"isHttpMethod"
			]
		}
	],
	"HttpMiddleware": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpMiddleware",
			"localName": "HttpMiddleware",
			"typeOnly": false,
			"members": [
				"HttpMiddleware",
				"SpanNameGenerator",
				"TracerDisabledWhen",
				"compression",
				"cors",
				"layerTracerDisabledForUrls",
				"logger",
				"make",
				"searchParamsParser",
				"tracer",
				"withLoggerDisabled",
				"xForwardedHeaders"
			]
		}
	],
	"HttpPlatform": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpPlatform",
			"localName": "HttpPlatform",
			"typeOnly": false,
			"members": [
				"Compression",
				"CompressionAlgorithm",
				"CompressionOptions",
				"HttpPlatform",
				"compressionTransformWeb",
				"layer",
				"make",
				"makeCompressionWeb"
			]
		}
	],
	"HttpRouter": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpRouter",
			"localName": "HttpRouter",
			"typeOnly": false,
			"members": [
				"GlobalProvided",
				"HttpRouter",
				"Middleware",
				"PathInput",
				"Provided",
				"Request",
				"Route",
				"RouteContext",
				"RouterConfig",
				"add",
				"addAll",
				"cors",
				"disableLogger",
				"layer",
				"make",
				"middleware",
				"params",
				"prefixPath",
				"prefixRoute",
				"provideRequest",
				"route",
				"schemaJson",
				"schemaNoBody",
				"schemaParams",
				"schemaPathParams",
				"serve",
				"toHttpEffect",
				"toWebHandler",
				"use"
			]
		}
	],
	"HttpRunner": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "HttpRunner",
			"localName": "HttpRunner",
			"typeOnly": false,
			"members": [
				"layerClient",
				"layerClientProtocolHttp",
				"layerClientProtocolHttpDefault",
				"layerClientProtocolWebsocket",
				"layerClientProtocolWebsocketDefault",
				"layerHttp",
				"layerHttpClientOnly",
				"layerHttpOptions",
				"layerWebsocket",
				"layerWebsocketClientOnly",
				"layerWebsocketOptions",
				"toHttpEffect",
				"toHttpEffectWebsocket"
			]
		}
	],
	"HttpServer": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpServer",
			"localName": "HttpServer",
			"typeOnly": false,
			"members": [
				"HttpServer",
				"addressFormattedWith",
				"formatAddress",
				"layerServices",
				"layerTestClient",
				"logAddress",
				"make",
				"makeTestClient",
				"serve",
				"serveEffect",
				"withLogAddress"
			]
		}
	],
	"HttpServerError": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpServerError",
			"localName": "HttpServerError",
			"typeOnly": false,
			"members": [
				"ClientAbort",
				"HttpServerError",
				"HttpServerErrorReason",
				"InternalError",
				"RequestError",
				"RequestParseError",
				"ResponseError",
				"RouteNotFound",
				"ServeError",
				"causeResponse",
				"causeResponseStripped",
				"exitResponse",
				"isHttpServerError"
			]
		}
	],
	"HttpServerRequest": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpServerRequest",
			"localName": "HttpServerRequest",
			"typeOnly": false,
			"members": [
				"HttpServerRequest",
				"MaxBodySize",
				"ParsedSearchParams",
				"TypeId",
				"fromClientRequest",
				"fromWeb",
				"schemaBodyForm",
				"schemaBodyFormJson",
				"schemaBodyJson",
				"schemaBodyMultipart",
				"schemaBodyUrlParams",
				"schemaCookies",
				"schemaHeaders",
				"schemaSearchParams",
				"searchParamsFromURL",
				"toClientRequest",
				"toURL",
				"toWeb",
				"toWebResult",
				"upgradeChannel"
			]
		}
	],
	"HttpServerRespondable": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpServerRespondable",
			"localName": "HttpServerRespondable",
			"typeOnly": false,
			"members": [
				"Respondable",
				"isRespondable",
				"symbol",
				"toResponse",
				"toResponseOrElse",
				"toResponseOrElseDefect"
			]
		}
	],
	"HttpServerResponse": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpServerResponse",
			"localName": "HttpServerResponse",
			"typeOnly": false,
			"members": [
				"HttpServerResponse",
				"Options",
				"empty",
				"expireCookie",
				"expireCookieUnsafe",
				"file",
				"fileWeb",
				"formData",
				"fromClientResponse",
				"fromWeb",
				"html",
				"htmlStream",
				"isHttpServerResponse",
				"json",
				"jsonUnsafe",
				"mergeCookies",
				"omitsBody",
				"raw",
				"redirect",
				"removeCookie",
				"removeHeader",
				"replaceCookies",
				"schemaJson",
				"setBody",
				"setCookie",
				"setCookieUnsafe",
				"setCookies",
				"setCookiesUnsafe",
				"setHeader",
				"setHeaders",
				"setStatus",
				"stream",
				"text",
				"toClientResponse",
				"toWeb",
				"uint8Array",
				"updateCookies",
				"urlParams"
			]
		}
	],
	"HttpStaticServer": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpStaticServer",
			"localName": "HttpStaticServer",
			"typeOnly": false,
			"members": [
				"layer",
				"make"
			]
		}
	],
	"HttpStatus": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpStatus",
			"localName": "HttpStatus",
			"typeOnly": false,
			"members": [
				"Literal",
				"fromLiteral"
			]
		}
	],
	"HttpTraceContext": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "HttpTraceContext",
			"localName": "HttpTraceContext",
			"typeOnly": false,
			"members": [
				"FromHeaders",
				"b3",
				"fromHeaders",
				"toHeaders",
				"w3c",
				"xb3"
			]
		}
	],
	"Hydration": [
		{
			"moduleSpecifier": "effect/unstable/reactivity",
			"importKind": "named",
			"importedName": "Hydration",
			"localName": "Hydration",
			"typeOnly": false,
			"members": [
				"DehydratedAtom",
				"DehydratedAtomValue",
				"dehydrate",
				"hydrate",
				"toValues"
			]
		}
	],
	"identifier": [
		{
			"moduleSpecifier": "@effect/openapi-generator/Utils",
			"importKind": "named",
			"importedName": "identifier",
			"localName": "identifier",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"identity": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "identity",
			"localName": "identity",
			"typeOnly": false
		}
	],
	"IdGenerator": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "IdGenerator",
			"localName": "IdGenerator",
			"typeOnly": false,
			"members": [
				"IdGenerator",
				"MakeOptions",
				"Service",
				"defaultIdGenerator",
				"layer",
				"make"
			]
		}
	],
	"ImportDuration": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "ImportDuration",
			"localName": "ImportDuration",
			"typeOnly": false
		}
	],
	"imports": [
		{
			"moduleSpecifier": "@effect/openapi-generator/HttpApiTransformer",
			"importKind": "named",
			"importedName": "imports",
			"localName": "imports",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"IndexedDb": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "IndexedDb",
			"localName": "IndexedDb",
			"typeOnly": false,
			"members": [
				"AutoIncrement",
				"IDBValidKey",
				"IndexedDb",
				"layerWindow",
				"make"
			]
		}
	],
	"IndexedDbDatabase": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "IndexedDbDatabase",
			"localName": "IndexedDbDatabase",
			"typeOnly": false,
			"members": [
				"Any",
				"AnySchema",
				"ErrorReason",
				"IndexFromTable",
				"IndexFromTableName",
				"IndexedDbDatabase",
				"IndexedDbDatabaseError",
				"IndexedDbSchema",
				"Transaction",
				"make"
			]
		}
	],
	"IndexedDbQueryBuilder": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "IndexedDbQueryBuilder",
			"localName": "IndexedDbQueryBuilder",
			"typeOnly": false,
			"members": [
				"ErrorReason",
				"IndexedDbQuery",
				"IndexedDbQueryBuilder",
				"IndexedDbQueryError",
				"IndexedDbTransaction",
				"KeyPath",
				"KeyPathNumber",
				"make"
			]
		}
	],
	"IndexedDbTable": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "IndexedDbTable",
			"localName": "IndexedDbTable",
			"typeOnly": false,
			"members": [
				"Any",
				"AnySchemaStruct",
				"AnyWithProps",
				"AutoIncrement",
				"Context",
				"Encoded",
				"IndexedDbTable",
				"Indexes",
				"KeyPath",
				"TableName",
				"TableSchema",
				"WithName",
				"make"
			]
		}
	],
	"IndexedDbVersion": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "IndexedDbVersion",
			"localName": "IndexedDbVersion",
			"typeOnly": false,
			"members": [
				"Any",
				"AnyWithProps",
				"IndexedDbVersion",
				"SchemaWithName",
				"TableWithName",
				"Tables",
				"make"
			]
		}
	],
	"Ini": [
		{
			"moduleSpecifier": "effect/unstable/encoding",
			"importKind": "named",
			"importedName": "Ini",
			"localName": "Ini",
			"typeOnly": false,
			"members": [
				"parse"
			]
		}
	],
	"inject": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "inject",
			"localName": "inject",
			"typeOnly": false
		}
	],
	"Inspectable": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Inspectable",
			"localName": "Inspectable",
			"typeOnly": false,
			"members": [
				"BaseProto",
				"Class",
				"Inspectable",
				"NodeInspectSymbol",
				"toJson",
				"toStringUnknown"
			]
		}
	],
	"IpInterface": [
		{
			"moduleSpecifier": "effect/unstable/net",
			"importKind": "named",
			"importedName": "IpInterface",
			"localName": "IpInterface",
			"typeOnly": false,
			"members": [
				"IpInterface",
				"Ipv4Interface",
				"Ipv6Interface",
				"format",
				"fromString",
				"fromStringUnsafe",
				"ipv4FromString",
				"ipv6FromString",
				"isIpInterface",
				"isIpv4Interface",
				"isIpv6Interface",
				"make",
				"makeUnsafe"
			]
		}
	],
	"IpNetwork": [
		{
			"moduleSpecifier": "effect/unstable/net",
			"importKind": "named",
			"importedName": "IpNetwork",
			"localName": "IpNetwork",
			"typeOnly": false,
			"members": [
				"IpNetwork",
				"Ipv4Network",
				"Ipv6Network",
				"addressCount",
				"contains",
				"containsNetwork",
				"firstAddress",
				"format",
				"fromAddress",
				"fromAddressUnsafe",
				"fromInterface",
				"fromString",
				"fromStringUnsafe",
				"ipv4FromString",
				"ipv6FromString",
				"isIpNetwork",
				"isIpv4Network",
				"isIpv6Network",
				"lastAddress",
				"make",
				"makeUnsafe",
				"overlaps"
			]
		}
	],
	"isMatching": [
		{
			"moduleSpecifier": "ts-pattern",
			"importKind": "named",
			"importedName": "isMatching",
			"localName": "isMatching",
			"typeOnly": false
		}
	],
	"it": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "it",
			"localName": "it",
			"typeOnly": false
		}
	],
	"Iterable": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Iterable",
			"localName": "Iterable",
			"typeOnly": false,
			"members": [
				"append",
				"appendAll",
				"cartesian",
				"cartesianWith",
				"chunksOf",
				"contains",
				"containsWith",
				"countBy",
				"dedupeAdjacent",
				"dedupeAdjacentWith",
				"drop",
				"empty",
				"filter",
				"filterMap",
				"filterMapWhile",
				"findFirst",
				"findLast",
				"flatMap",
				"flatMapNullishOr",
				"flatten",
				"forEach",
				"forever",
				"fromRecord",
				"getFailures",
				"getSomes",
				"getSuccesses",
				"group",
				"groupBy",
				"groupWith",
				"head",
				"headUnsafe",
				"intersperse",
				"isEmpty",
				"makeBy",
				"map",
				"of",
				"prepend",
				"prependAll",
				"range",
				"reduce",
				"repeat",
				"replicate",
				"scan",
				"size",
				"some",
				"take",
				"takeWhile",
				"unfold",
				"zip",
				"zipWith"
			]
		}
	],
	"JestAssertion": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "JestAssertion",
			"localName": "JestAssertion",
			"typeOnly": false
		}
	],
	"JsonPatch": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "JsonPatch",
			"localName": "JsonPatch",
			"typeOnly": false,
			"members": [
				"JsonPatch",
				"JsonPatchOperation",
				"apply",
				"get"
			]
		}
	],
	"JsonPatchAdd": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "JsonPatchAdd",
			"localName": "JsonPatchAdd",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"JsonPatchAggregateError": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "JsonPatchAggregateError",
			"localName": "JsonPatchAggregateError",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"JsonPatchApplicationError": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "JsonPatchApplicationError",
			"localName": "JsonPatchApplicationError",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"JsonPatchDocument": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "JsonPatchDocument",
			"localName": "JsonPatchDocument",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"JsonPatchOperation": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "JsonPatchOperation",
			"localName": "JsonPatchOperation",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"JsonPatchParseError": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "JsonPatchParseError",
			"localName": "JsonPatchParseError",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"JsonPatchRemove": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "JsonPatchRemove",
			"localName": "JsonPatchRemove",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"JsonPatchReplace": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "JsonPatchReplace",
			"localName": "JsonPatchReplace",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"JsonPatchValidationError": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "JsonPatchValidationError",
			"localName": "JsonPatchValidationError",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"JsonPointer": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "JsonPointer",
			"localName": "JsonPointer",
			"typeOnly": false,
			"members": [
				"escapeToken",
				"formatUriFragment",
				"parseUriFragment",
				"unescapeToken"
			]
		}
	],
	"JsonSchema": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "JsonSchema",
			"localName": "JsonSchema",
			"typeOnly": false,
			"members": [
				"Definitions",
				"Dialect",
				"Document",
				"JsonSchema",
				"META_SCHEMA_URI_DRAFT_04",
				"META_SCHEMA_URI_DRAFT_07",
				"META_SCHEMA_URI_DRAFT_2020_12",
				"MultiDocument",
				"Type",
				"fromSchemaDraft07",
				"fromSchemaDraft2020_12",
				"fromSchemaOpenApi3_0",
				"fromSchemaOpenApi3_1",
				"toDocumentDraft04",
				"toDocumentDraft07",
				"toMultiDocumentOpenApi3_1"
			]
		}
	],
	"K8sHttpClient": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "K8sHttpClient",
			"localName": "K8sHttpClient",
			"typeOnly": false,
			"members": [
				"K8sHttpClient",
				"Pod",
				"PodStatus",
				"layer",
				"makeCreatePod",
				"makeGetPods"
			]
		}
	],
	"K8sTypes": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "K8sTypes",
			"localName": "K8sTypes",
			"typeOnly": false,
			"members": [
				"AWSElasticBlockStoreVolumeSource",
				"Affinity",
				"AppArmorProfile",
				"AzureDiskVolumeSource",
				"AzureFileVolumeSource",
				"CSIVolumeSource",
				"Capabilities",
				"CephFSVolumeSource",
				"CinderVolumeSource",
				"ClaimSource",
				"ClusterTrustBundleProjection",
				"ConfigMapEnvSource",
				"ConfigMapKeySelector",
				"ConfigMapProjection",
				"ConfigMapVolumeSource",
				"Container",
				"ContainerPort",
				"ContainerResizePolicy",
				"ContainerState",
				"ContainerStateRunning",
				"ContainerStateTerminated",
				"ContainerStateWaiting",
				"ContainerStatus",
				"DownwardAPIProjection",
				"DownwardAPIVolumeFile",
				"DownwardAPIVolumeSource",
				"EmptyDirVolumeSource",
				"EnvFromSource",
				"EnvVar",
				"EnvVarSource",
				"EphemeralContainer",
				"EphemeralVolumeSource",
				"ExecAction",
				"FCVolumeSource",
				"FieldsV1",
				"FlexVolumeSource",
				"FlockerVolumeSource",
				"GCEPersistentDiskVolumeSource",
				"GRPCAction",
				"GitRepoVolumeSource",
				"GlusterfsVolumeSource",
				"HTTPGetAction",
				"HTTPHeader",
				"HostAlias",
				"HostIP",
				"HostPathVolumeSource",
				"ISCSIVolumeSource",
				"KeyToPath",
				"LabelSelector",
				"LabelSelectorRequirement",
				"Lifecycle",
				"LifecycleHandler",
				"LocalObjectReference",
				"ManagedFieldsEntry",
				"NFSVolumeSource",
				"NodeAffinity",
				"NodeSelector",
				"NodeSelectorRequirement",
				"NodeSelectorTerm",
				"ObjectFieldSelector",
				"ObjectMeta",
				"OwnerReference",
				"PersistentVolumeClaimSpec",
				"PersistentVolumeClaimTemplate",
				"PersistentVolumeClaimVolumeSource",
				"PhotonPersistentDiskVolumeSource",
				"Pod",
				"PodAffinity",
				"PodAffinityTerm",
				"PodAntiAffinity",
				"PodCondition",
				"PodDNSConfig",
				"PodDNSConfigOption",
				"PodIP",
				"PodOS",
				"PodReadinessGate",
				"PodResourceClaim",
				"PodResourceClaimStatus",
				"PodSchedulingGate",
				"PodSecurityContext",
				"PodSpec",
				"PodStatus",
				"PortworxVolumeSource",
				"PreferredSchedulingTerm",
				"Probe",
				"ProjectedVolumeSource",
				"Quantity",
				"QuobyteVolumeSource",
				"RBDVolumeSource",
				"ResourceClaim",
				"ResourceFieldSelector",
				"ResourceRequirements",
				"SELinuxOptions",
				"ScaleIOVolumeSource",
				"SeccompProfile",
				"SecretEnvSource",
				"SecretKeySelector",
				"SecretProjection",
				"SecretVolumeSource",
				"SecurityContext",
				"ServiceAccountTokenProjection",
				"SleepAction",
				"StorageOSVolumeSource",
				"Sysctl",
				"TCPSocketAction",
				"Time",
				"Toleration",
				"TopologySpreadConstraint",
				"TypedLocalObjectReference",
				"TypedObjectReference",
				"Volume",
				"VolumeDevice",
				"VolumeMount",
				"VolumeMountStatus",
				"VolumeProjection",
				"VolumeResourceRequirements",
				"VsphereVirtualDiskVolumeSource",
				"WeightedPodAffinityTerm",
				"WindowsSecurityContextOptions"
			]
		}
	],
	"KeyValueStore": [
		{
			"moduleSpecifier": "effect/unstable/persistence",
			"importKind": "named",
			"importedName": "KeyValueStore",
			"localName": "KeyValueStore",
			"typeOnly": false,
			"members": [
				"KeyValueStore",
				"KeyValueStoreError",
				"LayerSqlOptions",
				"MakeOptions",
				"MakeStringOptions",
				"SchemaStore",
				"layerFileSystem",
				"layerMemory",
				"layerSql",
				"layerStorage",
				"make",
				"makeStringOnly",
				"prefix",
				"toSchemaStore"
			]
		}
	],
	"LabelColor": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "LabelColor",
			"localName": "LabelColor",
			"typeOnly": false
		}
	],
	"LanguageModel": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "LanguageModel",
			"localName": "LanguageModel",
			"typeOnly": false,
			"members": [
				"CodecTransformer",
				"ExtractError",
				"ExtractServices",
				"ExtractToolParametersMode",
				"ExtractTools",
				"GenerateObjectOptions",
				"GenerateObjectResponse",
				"GenerateTextOptions",
				"GenerateTextResponse",
				"LanguageModel",
				"ProviderOptions",
				"ToolChoice",
				"ToolkitInput",
				"ToolkitOption",
				"TypeId",
				"defaultCodecTransformer",
				"generateObject",
				"generateText",
				"make",
				"streamText"
			]
		}
	],
	"Latch": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Latch",
			"localName": "Latch",
			"typeOnly": false,
			"members": [
				"Latch",
				"await",
				"close",
				"closeUnsafe",
				"isOpen",
				"make",
				"makeUnsafe",
				"open",
				"openUnsafe",
				"release",
				"whenOpen"
			]
		}
	],
	"layer": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "layer",
			"localName": "layer",
			"typeOnly": false
		}
	],
	"Layer": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Layer",
			"localName": "Layer",
			"typeOnly": false,
			"members": [
				"Any",
				"CurrentMemoMap",
				"Error",
				"Layer",
				"LayerUnify",
				"LayerUnifyIgnore",
				"MemoMap",
				"PartialEffectful",
				"Services",
				"SpanOptions",
				"Success",
				"Variance",
				"build",
				"buildWithMemoMap",
				"buildWithScope",
				"catch",
				"catchCause",
				"catchTag",
				"effect",
				"effectContext",
				"effectDiscard",
				"empty",
				"flatMap",
				"forkMemoMap",
				"forkMemoMapUnsafe",
				"fresh",
				"fromBuild",
				"fromBuildMemo",
				"isLayer",
				"launch",
				"makeMemoMap",
				"makeMemoMapUnsafe",
				"merge",
				"mergeAll",
				"mock",
				"orDie",
				"parentSpan",
				"provide",
				"provideMerge",
				"satisfiesErrorType",
				"satisfiesServicesType",
				"satisfiesSuccessType",
				"span",
				"succeed",
				"succeedContext",
				"suspend",
				"sync",
				"syncContext",
				"tap",
				"tapCause",
				"tapError",
				"unwrap",
				"updateService",
				"withParentSpan",
				"withSpan"
			]
		}
	],
	"LayerMap": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "LayerMap",
			"localName": "LayerMap",
			"typeOnly": false,
			"members": [
				"LayerMap",
				"Service",
				"TagClass",
				"fromRecord",
				"make"
			]
		}
	],
	"LayerRef": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "LayerRef",
			"localName": "LayerRef",
			"typeOnly": false,
			"members": [
				"LayerRef",
				"Service",
				"TagClass",
				"make"
			]
		}
	],
	"layerTransformerSchema": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiGenerator",
			"importKind": "named",
			"importedName": "layerTransformerSchema",
			"localName": "layerTransformerSchema",
			"typeOnly": false,
			"plainModule": true
		},
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiTransformer",
			"importKind": "named",
			"importedName": "layerTransformerSchema",
			"localName": "layerTransformerSchema",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"layerTransformerTs": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiGenerator",
			"importKind": "named",
			"importedName": "layerTransformerTs",
			"localName": "layerTransformerTs",
			"typeOnly": false,
			"plainModule": true
		},
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiTransformer",
			"importKind": "named",
			"importedName": "layerTransformerTs",
			"localName": "layerTransformerTs",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"live": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "live",
			"localName": "live",
			"typeOnly": false
		}
	],
	"Logger": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Logger",
			"localName": "Logger",
			"typeOnly": false,
			"members": [
				"CurrentLoggers",
				"LogToStderr",
				"Logger",
				"Options",
				"batched",
				"consoleJson",
				"consoleLogFmt",
				"consolePretty",
				"consolePrettyBrowser",
				"consolePrettyTty",
				"consoleStructured",
				"defaultLogger",
				"formatJson",
				"formatLogFmt",
				"formatSimple",
				"formatStructured",
				"isLogger",
				"layer",
				"make",
				"map",
				"toFile",
				"tracerLogger",
				"withConsoleError",
				"withConsoleLog",
				"withLeveledConsole"
			]
		}
	],
	"LogLevel": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "LogLevel",
			"localName": "LogLevel",
			"typeOnly": false,
			"members": [
				"Equivalence",
				"LogLevel",
				"Order",
				"Severity",
				"getOrdinal",
				"isEnabled",
				"isGreaterThan",
				"isGreaterThanOrEqualTo",
				"isLessThan",
				"isLessThanOrEqualTo",
				"values"
			]
		}
	],
	"MachineId": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "MachineId",
			"localName": "MachineId",
			"typeOnly": false,
			"members": [
				"MachineId",
				"make"
			]
		}
	],
	"make": [
		{
			"moduleSpecifier": "@effect/openapi-generator/JsonSchemaGenerator",
			"importKind": "named",
			"importedName": "make",
			"localName": "make",
			"typeOnly": false,
			"plainModule": true
		},
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiGenerator",
			"importKind": "named",
			"importedName": "make",
			"localName": "make",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"makeDeepMutable": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "makeDeepMutable",
			"localName": "makeDeepMutable",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"makeMethods": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "makeMethods",
			"localName": "makeMethods",
			"typeOnly": false
		}
	],
	"makeTransformerSchema": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiTransformer",
			"importKind": "named",
			"importedName": "makeTransformerSchema",
			"localName": "makeTransformerSchema",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"makeTransformerTs": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiTransformer",
			"importKind": "named",
			"importedName": "makeTransformerTs",
			"localName": "makeTransformerTs",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ManagedRuntime": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "ManagedRuntime",
			"localName": "ManagedRuntime",
			"typeOnly": false,
			"members": [
				"ManagedRuntime",
				"isManagedRuntime",
				"make"
			]
		}
	],
	"match": [
		{
			"moduleSpecifier": "ts-pattern",
			"importKind": "named",
			"importedName": "match",
			"localName": "match",
			"typeOnly": false
		}
	],
	"Match": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Match",
			"localName": "Match",
			"typeOnly": false,
			"members": [
				"Case",
				"Matcher",
				"Not",
				"SafeRefinement",
				"TypeMatcher",
				"Types",
				"ValueFlavor",
				"ValueMatcher",
				"When",
				"any",
				"bigint",
				"boolean",
				"date",
				"defined",
				"discriminator",
				"discriminatorStartsWith",
				"discriminators",
				"discriminatorsExhaustive",
				"exhaustive",
				"fn",
				"instanceOf",
				"instanceOfUnsafe",
				"is",
				"nonEmptyString",
				"not",
				"null",
				"number",
				"option",
				"orElse",
				"orElseAbsurd",
				"record",
				"result",
				"string",
				"symbol",
				"tag",
				"tagStartsWith",
				"tags",
				"tagsExhaustive",
				"type",
				"typeTags",
				"undefined",
				"value",
				"valueTags",
				"when",
				"whenAnd",
				"whenOr",
				"withReturnType"
			]
		}
	],
	"Matcher": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "Matcher",
			"localName": "Matcher",
			"typeOnly": false
		}
	],
	"MatcherResult": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MatcherResult",
			"localName": "MatcherResult",
			"typeOnly": false
		}
	],
	"Matchers": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "Matchers",
			"localName": "Matchers",
			"typeOnly": false
		}
	],
	"MatchersObject": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MatchersObject",
			"localName": "MatchersObject",
			"typeOnly": false
		}
	],
	"MatcherState": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MatcherState",
			"localName": "MatcherState",
			"typeOnly": false
		}
	],
	"McpProtocol": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "McpProtocol",
			"localName": "McpProtocol",
			"typeOnly": false,
			"members": [
				"AnyProtocolAdapter",
				"ErasedClientRpcGroup",
				"ErasedRpcGroup",
				"PayloadCodecs",
				"ProjectedNotification",
				"ProtocolAdapter",
				"ProtocolVersion",
				"RuntimeDescriptor",
				"StatefulProtocolVersion",
				"StatefulRuntimeDescriptor",
				"StatelessRuntimeDescriptor",
				"StatelessRuntimeProfile",
				"TransportPolicy",
				"v2024_11_05",
				"v2025_03_26",
				"v2025_06_18",
				"v2025_11_25",
				"v2026_07_28"
			]
		}
	],
	"McpSchema": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "McpSchema",
			"localName": "McpSchema",
			"typeOnly": false,
			"members": [
				"Annotations",
				"AudioContent",
				"BlobResourceContents",
				"CallTool",
				"CallToolResult",
				"CancelledNotification",
				"ClientCapabilities",
				"ClientFailureEncoded",
				"ClientNotificationEncoded",
				"ClientNotificationRpcs",
				"ClientRequestEncoded",
				"ClientRequestRpcs",
				"ClientRpcs",
				"ClientSuccessEncoded",
				"Complete",
				"CompleteResult",
				"ContentBlock",
				"CreateMessage",
				"CreateMessageResult",
				"Cursor",
				"Elicit",
				"ElicitAcceptResult",
				"ElicitDeclineResult",
				"ElicitRequestFormParams",
				"ElicitRequestParams",
				"ElicitRequestURLParams",
				"ElicitResult",
				"ElicitationBoolean",
				"ElicitationCompleteNotification",
				"ElicitationDeclined",
				"ElicitationEnum",
				"ElicitationNumber",
				"ElicitationString",
				"EmbeddedResource",
				"EnabledWhen",
				"FailureEncoded",
				"FromClientEncoded",
				"FromServerEncoded",
				"GetPrompt",
				"GetPromptResult",
				"HEADER_MISMATCH_ERROR_CODE",
				"INTERNAL_ERROR_CODE",
				"INVALID_PARAMS_ERROR_CODE",
				"INVALID_REQUEST_ERROR_CODE",
				"Icon",
				"ImageContent",
				"Implementation",
				"Initialize",
				"InitializeResult",
				"InitializedNotification",
				"InputRequired",
				"InternalError",
				"InvalidParams",
				"InvalidRequest",
				"LegacyTitledEnum",
				"ListPrompts",
				"ListPromptsResult",
				"ListResourceTemplates",
				"ListResourceTemplatesResult",
				"ListResources",
				"ListResourcesResult",
				"ListRoots",
				"ListRootsResult",
				"ListTools",
				"ListToolsResult",
				"LoggingLevel",
				"LoggingMessageNotification",
				"METHOD_NOT_FOUND_ERROR_CODE",
				"McpError",
				"McpErrorBase",
				"McpInputRequest",
				"McpInputResponse",
				"McpRequestContext",
				"McpReverseClient",
				"McpReverseOperationError",
				"McpReverseOperationUnsupported",
				"McpServerClient",
				"McpServerClientMiddleware",
				"MethodNotFound",
				"ModelHint",
				"ModelPreferences",
				"MultiSelectEnum",
				"NotificationEncoded",
				"NotificationMeta",
				"PARSE_ERROR_CODE",
				"PaginatedRequestMeta",
				"PaginatedResultMeta",
				"Param",
				"ParseError",
				"Ping",
				"PrimitiveSchemaDefinition",
				"ProgressNotification",
				"ProgressToken",
				"Prompt",
				"PromptArgument",
				"PromptListChangedNotification",
				"PromptMessage",
				"PromptReference",
				"ReadResource",
				"ReadResourceResult",
				"RequestEncoded",
				"RequestId",
				"RequestMeta",
				"Resource",
				"ResourceContents",
				"ResourceLink",
				"ResourceListChangedNotification",
				"ResourceReference",
				"ResourceTemplate",
				"ResourceUpdatedNotification",
				"ResultMeta",
				"Role",
				"Root",
				"RootsListChangedNotification",
				"SamplingMessage",
				"SamplingMessageContentBlock",
				"ServerCapabilities",
				"ServerFailureEncoded",
				"ServerNotificationEncoded",
				"ServerNotificationRpcs",
				"ServerRequestEncoded",
				"ServerRequestRpcs",
				"ServerResultEncoded",
				"ServerSuccessEncoded",
				"SetLevel",
				"SingleSelectEnum",
				"Subscribe",
				"SuccessEncoded",
				"TextContent",
				"TextResourceContents",
				"TitledMultiSelectEnum",
				"TitledSingleSelectEnum",
				"Tool",
				"ToolAnnotations",
				"ToolChoice",
				"ToolJson",
				"ToolListChangedNotification",
				"ToolOutputJson",
				"ToolResultContent",
				"ToolUseContent",
				"Unsubscribe",
				"UntitledMultiSelectEnum",
				"UntitledSingleSelectEnum",
				"isParam",
				"optional",
				"optionalWithDefault",
				"param"
			]
		}
	],
	"McpServer": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "McpServer",
			"localName": "McpServer",
			"typeOnly": false,
			"members": [
				"McpServer",
				"ResourceCompletions",
				"ValidateCompletions",
				"clientCapabilities",
				"elicit",
				"layer",
				"layerHttp",
				"layerStdio",
				"prompt",
				"registerPrompt",
				"registerResource",
				"registerToolkit",
				"resource",
				"run",
				"toolkit"
			]
		}
	],
	"Message": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "Message",
			"localName": "Message",
			"typeOnly": false,
			"members": [
				"Incoming",
				"IncomingEnvelope",
				"IncomingLocal",
				"IncomingRequest",
				"IncomingRequestLocal",
				"Outgoing",
				"OutgoingEnvelope",
				"OutgoingRequest",
				"deserializeLocal",
				"incomingLocalFromOutgoing",
				"serialize",
				"serializeEnvelope",
				"serializeRequest"
			]
		}
	],
	"MessageStorage": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "MessageStorage",
			"localName": "MessageStorage",
			"typeOnly": false,
			"members": [
				"Encoded",
				"EncodedRepliesOptions",
				"EncodedUnprocessedOptions",
				"MemoryDriver",
				"MemoryEntry",
				"MemoryTransaction",
				"MessageStorage",
				"SaveResult",
				"SaveResultEncoded",
				"layerMemory",
				"layerNoop",
				"make",
				"makeEncoded",
				"noop"
			]
		}
	],
	"Metric": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Metric",
			"localName": "Metric",
			"typeOnly": false,
			"members": [
				"Counter",
				"CounterState",
				"CurrentMetricAttributes",
				"CurrentMetricAttributesKey",
				"FiberRuntimeMetrics",
				"FiberRuntimeMetricsImpl",
				"FiberRuntimeMetricsKey",
				"FiberRuntimeMetricsService",
				"Frequency",
				"FrequencyState",
				"Gauge",
				"GaugeState",
				"Histogram",
				"HistogramState",
				"Metric",
				"MetricRegistry",
				"Summary",
				"SummaryState",
				"boundariesFromIterable",
				"counter",
				"disableRuntimeMetrics",
				"disableRuntimeMetricsLayer",
				"dump",
				"enableRuntimeMetrics",
				"enableRuntimeMetricsLayer",
				"exponentialBoundaries",
				"frequency",
				"gauge",
				"histogram",
				"isMetric",
				"linearBoundaries",
				"mapInput",
				"modify",
				"snapshot",
				"snapshotUnsafe",
				"summary",
				"summaryWithTimestamp",
				"timer",
				"update",
				"value",
				"withAttributes",
				"withConstantInput"
			]
		}
	],
	"Migrator": [
		{
			"moduleSpecifier": "effect/unstable/sql",
			"importKind": "named",
			"importedName": "Migrator",
			"localName": "Migrator",
			"typeOnly": false,
			"members": [
				"Loader",
				"Migration",
				"MigrationError",
				"MigratorOptions",
				"ResolvedMigration",
				"fromBabelGlob",
				"fromFileSystem",
				"fromGlob",
				"fromRecord",
				"make"
			]
		}
	],
	"Mime": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "Mime",
			"localName": "Mime",
			"typeOnly": false,
			"members": [
				"getAllExtensions",
				"getExtension",
				"getType"
			]
		}
	],
	"Mock": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "Mock",
			"localName": "Mock",
			"typeOnly": false
		}
	],
	"MockContext": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockContext",
			"localName": "MockContext",
			"typeOnly": false
		}
	],
	"Mocked": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "Mocked",
			"localName": "Mocked",
			"typeOnly": false
		}
	],
	"MockedClass": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockedClass",
			"localName": "MockedClass",
			"typeOnly": false
		}
	],
	"MockedFunction": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockedFunction",
			"localName": "MockedFunction",
			"typeOnly": false
		}
	],
	"MockedObject": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockedObject",
			"localName": "MockedObject",
			"typeOnly": false
		}
	],
	"MockInstance": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockInstance",
			"localName": "MockInstance",
			"typeOnly": false
		}
	],
	"MockResult": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockResult",
			"localName": "MockResult",
			"typeOnly": false
		}
	],
	"MockResultIncomplete": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockResultIncomplete",
			"localName": "MockResultIncomplete",
			"typeOnly": false
		}
	],
	"MockResultReturn": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockResultReturn",
			"localName": "MockResultReturn",
			"typeOnly": false
		}
	],
	"MockResultThrow": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockResultThrow",
			"localName": "MockResultThrow",
			"typeOnly": false
		}
	],
	"MockSettledResult": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockSettledResult",
			"localName": "MockSettledResult",
			"typeOnly": false
		}
	],
	"MockSettledResultFulfilled": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockSettledResultFulfilled",
			"localName": "MockSettledResultFulfilled",
			"typeOnly": false
		}
	],
	"MockSettledResultIncomplete": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockSettledResultIncomplete",
			"localName": "MockSettledResultIncomplete",
			"typeOnly": false
		}
	],
	"MockSettledResultRejected": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "MockSettledResultRejected",
			"localName": "MockSettledResultRejected",
			"typeOnly": false
		}
	],
	"Model": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "Model",
			"localName": "Model",
			"typeOnly": false,
			"members": [
				"Model",
				"ModelName",
				"ProviderName",
				"make"
			]
		},
		{
			"moduleSpecifier": "effect/unstable/schema",
			"importKind": "named",
			"importedName": "Model",
			"localName": "Model",
			"typeOnly": false,
			"members": [
				"Any",
				"BooleanSqlite",
				"Class",
				"Date",
				"DateTimeFromDateWithNow",
				"DateTimeFromNumberWithNow",
				"DateTimeInsert",
				"DateTimeInsertFromDate",
				"DateTimeInsertFromNumber",
				"DateTimeUpdate",
				"DateTimeUpdateFromDate",
				"DateTimeUpdateFromNumber",
				"DateTimeWithNow",
				"DateWithNow",
				"Field",
				"FieldExcept",
				"FieldOnly",
				"FieldOption",
				"GeneratedByApp",
				"GeneratedByDb",
				"JsonFromString",
				"Override",
				"Sensitive",
				"Struct",
				"Uint8Array",
				"Union",
				"UuidV4BytesInsert",
				"UuidV4BytesWithGenerate",
				"UuidV4Insert",
				"UuidV4WithGenerate",
				"UuidV7Insert",
				"UuidV7WithGenerate",
				"VariantsDatabase",
				"VariantsJson",
				"extract",
				"fieldEvolve",
				"fields",
				"optionalOption"
			]
		}
	],
	"ModuleGraphData": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "ModuleGraphData",
			"localName": "ModuleGraphData",
			"typeOnly": false
		}
	],
	"Multipart": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "Multipart",
			"localName": "Multipart",
			"typeOnly": false,
			"members": [
				"Field",
				"FieldMimeTypes",
				"File",
				"FilesSchema",
				"MaxFieldSize",
				"MaxFileSize",
				"MaxParts",
				"MultipartError",
				"MultipartErrorReason",
				"Part",
				"Persisted",
				"PersistedFile",
				"PersistedFileSchema",
				"SingleFileSchema",
				"TypeId",
				"collectUint8Array",
				"isField",
				"isFile",
				"isPart",
				"isPersistedFile",
				"isStreamPart",
				"limitsServices",
				"makeChannel",
				"makeConfig",
				"schemaJson",
				"schemaPersisted",
				"toPersisted",
				"withLimits"
			]
		}
	],
	"MultipartParser": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "MultipartParser",
			"localName": "MultipartParser",
			"typeOnly": false,
			"members": [
				"BaseConfig",
				"Config",
				"MultipartError",
				"Parser",
				"PartInfo",
				"decodeField",
				"defaultIsFile",
				"make"
			]
		}
	],
	"MutableHashMap": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "MutableHashMap",
			"localName": "MutableHashMap",
			"typeOnly": false,
			"members": [
				"MutableHashMap",
				"clear",
				"empty",
				"forEach",
				"fromIterable",
				"get",
				"has",
				"isEmpty",
				"isMutableHashMap",
				"keys",
				"make",
				"modify",
				"modifyAt",
				"remove",
				"set",
				"size",
				"values"
			]
		}
	],
	"MutableHashSet": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "MutableHashSet",
			"localName": "MutableHashSet",
			"typeOnly": false,
			"members": [
				"MutableHashSet",
				"add",
				"clear",
				"empty",
				"fromIterable",
				"has",
				"isMutableHashSet",
				"make",
				"remove",
				"size"
			]
		}
	],
	"MutableList": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "MutableList",
			"localName": "MutableList",
			"typeOnly": false,
			"members": [
				"Empty",
				"MutableList",
				"append",
				"appendAll",
				"appendAllUnsafe",
				"clear",
				"filter",
				"make",
				"prepend",
				"prependAll",
				"prependAllUnsafe",
				"remove",
				"take",
				"takeAll",
				"takeN",
				"takeNVoid",
				"toArray",
				"toArrayN"
			]
		}
	],
	"MutableRef": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "MutableRef",
			"localName": "MutableRef",
			"typeOnly": false,
			"members": [
				"MutableRef",
				"compareAndSet",
				"decrement",
				"decrementAndGet",
				"get",
				"getAndDecrement",
				"getAndIncrement",
				"getAndSet",
				"getAndUpdate",
				"increment",
				"incrementAndGet",
				"make",
				"set",
				"setAndGet",
				"toggle",
				"update",
				"updateAndGet"
			]
		}
	],
	"Ndjson": [
		{
			"moduleSpecifier": "effect/unstable/encoding",
			"importKind": "named",
			"importedName": "Ndjson",
			"localName": "Ndjson",
			"typeOnly": false,
			"members": [
				"NdjsonError",
				"decode",
				"decodeSchema",
				"decodeSchemaString",
				"decodeString",
				"duplex",
				"duplexSchema",
				"duplexSchemaString",
				"duplexString",
				"encode",
				"encodeSchema",
				"encodeSchemaString",
				"encodeString"
			]
		}
	],
	"NetAddress": [
		{
			"moduleSpecifier": "effect/unstable/net",
			"importKind": "named",
			"importedName": "NetAddress",
			"localName": "NetAddress",
			"typeOnly": false,
			"members": [
				"BroadcastAddress",
				"InetAddress",
				"InetAddressV4",
				"InetAddressV6",
				"IpAddress",
				"Ipv4Address",
				"Ipv6Address",
				"LinkLocalAddress",
				"LocallyAdministeredAddress",
				"LoopbackAddress",
				"MacAddress",
				"MulticastAddress",
				"NetAddressError",
				"NetworkInterfaceAddress",
				"PrivateAddress",
				"SocketAddress",
				"UnicastAddress",
				"UniqueLocalAddress",
				"UniversallyAdministeredAddress",
				"UnixPathAddress",
				"UnspecifiedAddress",
				"formatHost",
				"formatInet",
				"formatIp",
				"formatMacAddress",
				"formatMulticastInterface",
				"formatNativeHost",
				"formatSocketAddress",
				"formatUnixPath",
				"formatUrl",
				"formatUrlHost",
				"formatUrlHostString",
				"formatUrlUnsafe",
				"fromIpv4Mapped",
				"inetAddress",
				"inetAddressFromHostString",
				"inetAddressFromIpString",
				"inetAddressFromIpStringUnsafe",
				"inetAddressFromString",
				"inetAddressFromStringUnsafe",
				"inetAddressUnsafe",
				"inetAddressV4",
				"inetAddressV6",
				"ipFromString",
				"ipFromStringUnsafe",
				"ipv4Broadcast",
				"ipv4FromBytesUnsafe",
				"ipv4FromOctets",
				"ipv4FromString",
				"ipv4Loopback",
				"ipv4ToOctets",
				"ipv4Unspecified",
				"ipv6FromBytesUnsafe",
				"ipv6FromSegments",
				"ipv6FromString",
				"ipv6Loopback",
				"ipv6ToOctets",
				"ipv6ToSegments",
				"ipv6Unspecified",
				"isBroadcast",
				"isInetAddress",
				"isInetAddressV4",
				"isInetAddressV6",
				"isIpAddress",
				"isIpv4Address",
				"isIpv4Mapped",
				"isIpv6Address",
				"isLinkLocal",
				"isLoopback",
				"isMacAddress",
				"isMacBroadcast",
				"isMacLocallyAdministered",
				"isMacMulticast",
				"isMacUnicast",
				"isMacUniversallyAdministered",
				"isMulticast",
				"isPrivate",
				"isSocketAddress",
				"isUnicast",
				"isUniqueLocal",
				"isUnixPathAddress",
				"isUnspecified",
				"macAddressFromOctets",
				"macAddressFromString",
				"macAddressFromStringUnsafe",
				"macAddressToOctets",
				"match",
				"scopeIdsFromInterfaces",
				"socketAddressFromInput",
				"socketAddressFromInputUnsafe",
				"toCanonical",
				"toIpv4Mapped",
				"toUrl",
				"unixPathAddress",
				"width"
			]
		}
	],
	"Newtype": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Newtype",
			"localName": "Newtype",
			"typeOnly": false,
			"members": [
				"Newtype",
				"makeCombiner",
				"makeEquivalence",
				"makeIso",
				"makeOrder",
				"makeReducer",
				"value"
			]
		}
	],
	"NodeChildProcessSpawner": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeChildProcessSpawner",
			"localName": "NodeChildProcessSpawner",
			"typeOnly": false,
			"members": []
		}
	],
	"NodeClusterHttp": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeClusterHttp",
			"localName": "NodeClusterHttp",
			"typeOnly": false,
			"members": [
				"layer",
				"layerHttpServer",
				"layerK8sHttpClient"
			]
		}
	],
	"NodeClusterSocket": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeClusterSocket",
			"localName": "NodeClusterSocket",
			"typeOnly": false,
			"members": [
				"layer",
				"layerClientProtocol",
				"layerDispatcherK8s",
				"layerK8sHttpClient",
				"layerSocketServer"
			]
		}
	],
	"NodeCrypto": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeCrypto",
			"localName": "NodeCrypto",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"NodeFileSystem": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeFileSystem",
			"localName": "NodeFileSystem",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"NodeHttpClient": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeHttpClient",
			"localName": "NodeHttpClient",
			"typeOnly": false,
			"members": [
				"Dispatcher",
				"Fetch",
				"HttpAgent",
				"RequestInit",
				"UndiciOptions",
				"dispatcherLayerGlobal",
				"layerAgent",
				"layerAgentOptions",
				"layerDispatcher",
				"layerFetch",
				"layerNodeHttp",
				"layerNodeHttpNoAgent",
				"layerUndici",
				"layerUndiciNoDispatcher",
				"makeAgent",
				"makeDispatcher",
				"makeNodeHttp",
				"makeUndici"
			]
		}
	],
	"NodeHttpIncomingMessage": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeHttpIncomingMessage",
			"localName": "NodeHttpIncomingMessage",
			"typeOnly": false,
			"members": [
				"NodeHttpIncomingMessage"
			]
		}
	],
	"NodeHttpPlatform": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeHttpPlatform",
			"localName": "NodeHttpPlatform",
			"typeOnly": false,
			"members": [
				"layer",
				"make"
			]
		}
	],
	"NodeHttpServer": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeHttpServer",
			"localName": "NodeHttpServer",
			"typeOnly": false,
			"members": [
				"Options",
				"layer",
				"layerConfig",
				"layerHttpServices",
				"layerServer",
				"layerTest",
				"make",
				"makeHandler",
				"makeUpgradeHandler"
			]
		}
	],
	"NodeHttpServerRequest": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeHttpServerRequest",
			"localName": "NodeHttpServerRequest",
			"typeOnly": false,
			"members": [
				"toIncomingMessage",
				"toServerResponse"
			]
		}
	],
	"NodeMultipart": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeMultipart",
			"localName": "NodeMultipart",
			"typeOnly": false,
			"members": [
				"fileToReadable",
				"persisted",
				"stream"
			]
		}
	],
	"NodeMultipartParser": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeMultipartParser",
			"localName": "NodeMultipartParser",
			"typeOnly": false,
			"members": [
				"Field",
				"FileStream",
				"MultipartStream",
				"NodeConfig",
				"Part",
				"make"
			]
		}
	],
	"NodePath": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodePath",
			"localName": "NodePath",
			"typeOnly": false,
			"members": [
				"layer",
				"layerPosix",
				"layerWin32"
			]
		}
	],
	"NodeRedis": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeRedis",
			"localName": "NodeRedis",
			"typeOnly": false,
			"members": [
				"NodeRedis",
				"layer",
				"layerConfig"
			]
		}
	],
	"NodeRuntime": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeRuntime",
			"localName": "NodeRuntime",
			"typeOnly": false,
			"members": [
				"runMain"
			]
		}
	],
	"NodeSdk": [
		{
			"moduleSpecifier": "@effect/opentelemetry",
			"importKind": "named",
			"importedName": "NodeSdk",
			"localName": "NodeSdk",
			"typeOnly": false,
			"members": [
				"Configuration",
				"layer",
				"layerEmpty",
				"layerTracerProvider"
			]
		}
	],
	"NodeServices": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeServices",
			"localName": "NodeServices",
			"typeOnly": false,
			"members": [
				"NodeServices",
				"layer"
			]
		}
	],
	"NodeSink": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeSink",
			"localName": "NodeSink",
			"typeOnly": false,
			"members": []
		}
	],
	"NodeSocket": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeSocket",
			"localName": "NodeSocket",
			"typeOnly": false,
			"members": [
				"layerWebSocket",
				"layerWebSocketConstructor",
				"layerWebSocketConstructorWS"
			]
		}
	],
	"NodeSocketServer": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeSocketServer",
			"localName": "NodeSocketServer",
			"typeOnly": false,
			"members": []
		}
	],
	"NodeStdio": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeStdio",
			"localName": "NodeStdio",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"NodeStream": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeStream",
			"localName": "NodeStream",
			"typeOnly": false,
			"members": []
		}
	],
	"NodeTerminal": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeTerminal",
			"localName": "NodeTerminal",
			"typeOnly": false,
			"members": [
				"layer",
				"make"
			]
		}
	],
	"NodeWorker": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeWorker",
			"localName": "NodeWorker",
			"typeOnly": false,
			"members": [
				"layer",
				"layerPlatform"
			]
		}
	],
	"NodeWorkerRunner": [
		{
			"moduleSpecifier": "@effect/platform-node",
			"importKind": "named",
			"importedName": "NodeWorkerRunner",
			"localName": "NodeWorkerRunner",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"NonEmptyIterable": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "NonEmptyIterable",
			"localName": "NonEmptyIterable",
			"typeOnly": false,
			"members": [
				"NonEmptyIterable",
				"nonEmpty",
				"unprepend"
			]
		}
	],
	"nonEmptyString": [
		{
			"moduleSpecifier": "@effect/openapi-generator/Utils",
			"importKind": "named",
			"importedName": "nonEmptyString",
			"localName": "nonEmptyString",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"NonExhaustiveError": [
		{
			"moduleSpecifier": "ts-pattern",
			"importKind": "named",
			"importedName": "NonExhaustiveError",
			"localName": "NonExhaustiveError",
			"typeOnly": false
		}
	],
	"Number": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Number",
			"localName": "Number",
			"typeOnly": false,
			"members": [
				"Equivalence",
				"Number",
				"Order",
				"ReducerMax",
				"ReducerMin",
				"ReducerMultiply",
				"ReducerSum",
				"between",
				"clamp",
				"decrement",
				"divide",
				"divideUnsafe",
				"increment",
				"isGreaterThan",
				"isGreaterThanOrEqualTo",
				"isLessThan",
				"isLessThanOrEqualTo",
				"isNumber",
				"max",
				"min",
				"multiply",
				"multiplyAll",
				"nextPow2",
				"parse",
				"remainder",
				"round",
				"sign",
				"subtract",
				"sum",
				"sumAll"
			]
		}
	],
	"onTestFailed": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "onTestFailed",
			"localName": "onTestFailed",
			"typeOnly": false
		}
	],
	"OnTestFailedHandler": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "OnTestFailedHandler",
			"localName": "OnTestFailedHandler",
			"typeOnly": false
		}
	],
	"onTestFinished": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "onTestFinished",
			"localName": "onTestFinished",
			"typeOnly": false
		}
	],
	"OnTestFinishedHandler": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "OnTestFinishedHandler",
			"localName": "OnTestFinishedHandler",
			"typeOnly": false
		}
	],
	"OpenAiStructuredOutput": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "OpenAiStructuredOutput",
			"localName": "OpenAiStructuredOutput",
			"typeOnly": false,
			"members": [
				"toCodecOpenAI"
			]
		}
	],
	"OpenApi": [
		{
			"moduleSpecifier": "effect/unstable/httpapi",
			"importKind": "named",
			"importedName": "OpenApi",
			"localName": "OpenApi",
			"typeOnly": false,
			"members": [
				"Deprecated",
				"Description",
				"Exclude",
				"ExternalDocs",
				"Format",
				"Identifier",
				"License",
				"OpenAPIApiKeySecurityScheme",
				"OpenAPIComponents",
				"OpenAPIHTTPSecurityScheme",
				"OpenAPISecurityRequirement",
				"OpenAPISecurityScheme",
				"OpenAPISpec",
				"OpenAPISpecExternalDocs",
				"OpenAPISpecHeader",
				"OpenAPISpecInfo",
				"OpenAPISpecLicense",
				"OpenAPISpecMethodName",
				"OpenAPISpecOperation",
				"OpenAPISpecParameter",
				"OpenAPISpecPathItem",
				"OpenAPISpecPaths",
				"OpenAPISpecRequestBody",
				"OpenAPISpecResponses",
				"OpenAPISpecServer",
				"OpenAPISpecServerVariable",
				"OpenAPISpecTag",
				"OpenApiSpecContent",
				"OpenApiSpecEffectStream",
				"OpenApiSpecMediaType",
				"OpenApiSpecResponse",
				"Override",
				"Servers",
				"Summary",
				"Title",
				"Transform",
				"Version",
				"annotations",
				"fromApi"
			]
		}
	],
	"OpenApiGenerateOptions": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiGenerator",
			"importKind": "named",
			"importedName": "OpenApiGenerateOptions",
			"localName": "OpenApiGenerateOptions",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"OpenApiGenerator": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiGenerator",
			"importKind": "named",
			"importedName": "OpenApiGenerator",
			"localName": "OpenApiGenerator",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"OpenApiGeneratorFormat": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiGenerator",
			"importKind": "named",
			"importedName": "OpenApiGeneratorFormat",
			"localName": "OpenApiGeneratorFormat",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"OpenApiGeneratorWarning": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiGenerator",
			"importKind": "named",
			"importedName": "OpenApiGeneratorWarning",
			"localName": "OpenApiGeneratorWarning",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"OpenApiGeneratorWarningCode": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiGenerator",
			"importKind": "named",
			"importedName": "OpenApiGeneratorWarningCode",
			"localName": "OpenApiGeneratorWarningCode",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"OpenApiTransformer": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiTransformer",
			"importKind": "named",
			"importedName": "OpenApiTransformer",
			"localName": "OpenApiTransformer",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"Optic": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Optic",
			"localName": "Optic",
			"typeOnly": false,
			"members": [
				"Iso",
				"Lens",
				"Optional",
				"Prism",
				"Traversal",
				"entries",
				"failure",
				"fromChecks",
				"get",
				"getAll",
				"getResult",
				"id",
				"makeIso",
				"makeLens",
				"makeOptional",
				"makePrism",
				"modify",
				"modifyAll",
				"none",
				"replace",
				"replaceResult",
				"set",
				"some",
				"success"
			]
		}
	],
	"Option": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Option",
			"localName": "Option",
			"typeOnly": false,
			"members": [
				"Do",
				"None",
				"Option",
				"OptionIterator",
				"OptionTypeLambda",
				"OptionUnify",
				"OptionUnifyIgnore",
				"Some",
				"all",
				"andThen",
				"as",
				"asVoid",
				"bind",
				"bindTo",
				"composeK",
				"contains",
				"containsWith",
				"exists",
				"filter",
				"filterMap",
				"firstSomeOf",
				"flatMap",
				"flatMapNullishOr",
				"flatten",
				"fromIterable",
				"fromNullOr",
				"fromNullishOr",
				"fromUndefinedOr",
				"gen",
				"getFailure",
				"getOrElse",
				"getOrNull",
				"getOrThrow",
				"getOrThrowWith",
				"getOrUndefined",
				"getSuccess",
				"isNone",
				"isOption",
				"isSome",
				"let",
				"lift2",
				"liftNullishOr",
				"liftPredicate",
				"liftThrowable",
				"makeCombinerFailFast",
				"makeEquivalence",
				"makeOrder",
				"makeReducer",
				"makeReducerFailFast",
				"map",
				"match",
				"none",
				"orElse",
				"orElseResult",
				"orElseSome",
				"partitionMap",
				"product",
				"productMany",
				"reduceCompact",
				"some",
				"tap",
				"toArray",
				"toRefinement",
				"void",
				"zipLeft",
				"zipRight",
				"zipWith"
			]
		}
	],
	"Order": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Order",
			"localName": "Order",
			"typeOnly": false,
			"members": [
				"Array",
				"BigInt",
				"Boolean",
				"Date",
				"Number",
				"Order",
				"OrderTypeLambda",
				"String",
				"Struct",
				"Tuple",
				"alwaysEqual",
				"clamp",
				"combine",
				"combineAll",
				"flip",
				"isBetween",
				"isGreaterThan",
				"isGreaterThanOrEqualTo",
				"isLessThan",
				"isLessThanOrEqualTo",
				"make",
				"makeReducer",
				"mapInput",
				"max",
				"min"
			]
		}
	],
	"Ordering": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Ordering",
			"localName": "Ordering",
			"typeOnly": false,
			"members": [
				"Ordering",
				"Reducer",
				"match",
				"reverse"
			]
		}
	],
	"OtelLogger": [
		{
			"moduleSpecifier": "@effect/opentelemetry",
			"importKind": "named",
			"importedName": "OtelLogger",
			"localName": "OtelLogger",
			"typeOnly": false,
			"members": [
				"OtelLoggerProvider",
				"layer",
				"layerLoggerProvider",
				"logLevelToSeverityNumber",
				"make"
			]
		}
	],
	"OtelMetrics": [
		{
			"moduleSpecifier": "@effect/opentelemetry",
			"importKind": "named",
			"importedName": "OtelMetrics",
			"localName": "OtelMetrics",
			"typeOnly": false,
			"members": [
				"TemporalityPreference",
				"layer",
				"makeProducer",
				"registerProducer"
			]
		}
	],
	"OtelTracer": [
		{
			"moduleSpecifier": "@effect/opentelemetry",
			"importKind": "named",
			"importedName": "OtelTracer",
			"localName": "OtelTracer",
			"typeOnly": false,
			"members": [
				"OtelTraceFlags",
				"OtelTraceState",
				"OtelTracer",
				"OtelTracerProvider",
				"currentOtelSpan",
				"layer",
				"layerGlobal",
				"layerGlobalProvider",
				"layerGlobalTracer",
				"layerTracer",
				"layerWithoutOtelTracer",
				"make",
				"makeExternalSpan",
				"withSpanContext"
			]
		}
	],
	"Otlp": [
		{
			"moduleSpecifier": "effect/unstable/observability",
			"importKind": "named",
			"importedName": "Otlp",
			"localName": "Otlp",
			"typeOnly": false,
			"members": [
				"layer",
				"layerFromConfig",
				"layerJson",
				"layerProtobuf"
			]
		}
	],
	"OtlpExporter": [
		{
			"moduleSpecifier": "effect/unstable/observability",
			"importKind": "named",
			"importedName": "OtlpExporter",
			"localName": "OtlpExporter",
			"typeOnly": false,
			"members": [
				"Flusher",
				"layerFlusher",
				"make"
			]
		}
	],
	"OtlpLogger": [
		{
			"moduleSpecifier": "effect/unstable/observability",
			"importKind": "named",
			"importedName": "OtlpLogger",
			"localName": "OtlpLogger",
			"typeOnly": false,
			"members": [
				"LogsData",
				"layer",
				"layerFromConfig",
				"make"
			]
		}
	],
	"OtlpMetrics": [
		{
			"moduleSpecifier": "effect/unstable/observability",
			"importKind": "named",
			"importedName": "OtlpMetrics",
			"localName": "OtlpMetrics",
			"typeOnly": false,
			"members": [
				"AggregationTemporality",
				"MetricsData",
				"layer",
				"layerFromConfig",
				"make"
			]
		}
	],
	"OtlpResource": [
		{
			"moduleSpecifier": "effect/unstable/observability",
			"importKind": "named",
			"importedName": "OtlpResource",
			"localName": "OtlpResource",
			"typeOnly": false,
			"members": [
				"AnyValue",
				"ArrayValue",
				"Fixed64",
				"KeyValue",
				"KeyValueList",
				"LongBits",
				"Resource",
				"entriesToAttributes",
				"fromConfig",
				"make",
				"serviceNameUnsafe",
				"unknownToAttributeValue"
			]
		}
	],
	"OtlpSerialization": [
		{
			"moduleSpecifier": "effect/unstable/observability",
			"importKind": "named",
			"importedName": "OtlpSerialization",
			"localName": "OtlpSerialization",
			"typeOnly": false,
			"members": [
				"OtlpSerialization",
				"layerJson",
				"layerProtobuf"
			]
		}
	],
	"OtlpTracer": [
		{
			"moduleSpecifier": "effect/unstable/observability",
			"importKind": "named",
			"importedName": "OtlpTracer",
			"localName": "OtlpTracer",
			"typeOnly": false,
			"members": [
				"ResourceSpan",
				"ScopeSpan",
				"TraceData",
				"layer",
				"layerFromConfig",
				"make"
			]
		}
	],
	"P": [
		{
			"moduleSpecifier": "ts-pattern",
			"importKind": "named",
			"importedName": "P",
			"localName": "P",
			"typeOnly": false
		}
	],
	"Param": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "Param",
			"localName": "Param",
			"typeOnly": false,
			"members": [
				"Any",
				"AnyArgument",
				"AnyFlag",
				"Boolean",
				"ChoiceWithValue",
				"Date",
				"Directory",
				"FallbackPrompt",
				"File",
				"FileParse",
				"FileSchema",
				"FileText",
				"Finite",
				"Flags",
				"Int",
				"KeyValuePair",
				"Literals",
				"Map",
				"Never",
				"Optional",
				"Param",
				"ParamKind",
				"Parse",
				"ParsedArgs",
				"Path",
				"Redacted",
				"Single",
				"String",
				"Transform",
				"Variadic",
				"VariadicParamOptions",
				"argumentKind",
				"atLeast",
				"atMost",
				"between",
				"filter",
				"filterMap",
				"flagKind",
				"isParam",
				"isSingle",
				"makeSingle",
				"map",
				"mapEffect",
				"mapTryCatch",
				"optional",
				"orElse",
				"orElseResult",
				"variadic",
				"withAlias",
				"withDefault",
				"withDescription",
				"withFallbackConfig",
				"withFallbackPrompt",
				"withHidden",
				"withMetavar",
				"withSchema"
			]
		}
	],
	"ParsedOpenApi": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOpenApi",
			"localName": "ParsedOpenApi",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOpenApiMetadata": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOpenApiMetadata",
			"localName": "ParsedOpenApiMetadata",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOpenApiSecurityScheme": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOpenApiSecurityScheme",
			"localName": "ParsedOpenApiSecurityScheme",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOpenApiTag": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOpenApiTag",
			"localName": "ParsedOpenApiTag",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOperation": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOperation",
			"localName": "ParsedOperation",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOperationHttpClientResponses": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOperationHttpClientResponses",
			"localName": "ParsedOperationHttpClientResponses",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOperationMediaTypeEncoding": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOperationMediaTypeEncoding",
			"localName": "ParsedOperationMediaTypeEncoding",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOperationMediaTypeSchema": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOperationMediaTypeSchema",
			"localName": "ParsedOperationMediaTypeSchema",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOperationMetadata": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOperationMetadata",
			"localName": "ParsedOperationMetadata",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOperationParameter": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOperationParameter",
			"localName": "ParsedOperationParameter",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOperationRequestBody": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOperationRequestBody",
			"localName": "ParsedOperationRequestBody",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOperationResponse": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOperationResponse",
			"localName": "ParsedOperationResponse",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedOperationSecurityRequirement": [
		{
			"moduleSpecifier": "@effect/openapi-generator/ParsedOperation",
			"importKind": "named",
			"importedName": "ParsedOperationSecurityRequirement",
			"localName": "ParsedOperationSecurityRequirement",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"ParsedStack": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "ParsedStack",
			"localName": "ParsedStack",
			"typeOnly": false
		}
	],
	"parsePatchInput": [
		{
			"moduleSpecifier": "@effect/openapi-generator/OpenApiPatch",
			"importKind": "named",
			"importedName": "parsePatchInput",
			"localName": "parsePatchInput",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"PartitionedSemaphore": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "PartitionedSemaphore",
			"localName": "PartitionedSemaphore",
			"typeOnly": false,
			"members": [
				"Partitioned",
				"PartitionedSemaphore",
				"PartitionedTypeId",
				"available",
				"capacity",
				"make",
				"makeUnsafe",
				"release",
				"take",
				"withPermit",
				"withPermits",
				"withPermitsIfAvailable"
			]
		}
	],
	"Path": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Path",
			"localName": "Path",
			"typeOnly": false,
			"members": [
				"Path",
				"TypeId",
				"layer"
			]
		}
	],
	"Pattern": [
		{
			"moduleSpecifier": "ts-pattern",
			"importKind": "named",
			"importedName": "Pattern",
			"localName": "Pattern",
			"typeOnly": false
		}
	],
	"Permissions": [
		{
			"moduleSpecifier": "@effect/platform-browser",
			"importKind": "named",
			"importedName": "Permissions",
			"localName": "Permissions",
			"typeOnly": false,
			"members": [
				"Permissions",
				"PermissionsError",
				"PermissionsErrorReason",
				"PermissionsInvalidStateError",
				"PermissionsTypeError",
				"layer"
			]
		}
	],
	"Persistable": [
		{
			"moduleSpecifier": "effect/unstable/persistence",
			"importKind": "named",
			"importedName": "Persistable",
			"localName": "Persistable",
			"typeOnly": false,
			"members": [
				"Any",
				"Class",
				"DecodingServices",
				"EncodingServices",
				"Error",
				"ErrorSchema",
				"Persistable",
				"Services",
				"Success",
				"SuccessSchema",
				"TimeToLiveFn",
				"deserializeExit",
				"exitSchema",
				"serializeExit",
				"symbol"
			]
		}
	],
	"PersistedCache": [
		{
			"moduleSpecifier": "effect/unstable/persistence",
			"importKind": "named",
			"importedName": "PersistedCache",
			"localName": "PersistedCache",
			"typeOnly": false,
			"members": [
				"PersistedCache",
				"make"
			]
		}
	],
	"PersistedQueue": [
		{
			"moduleSpecifier": "effect/unstable/persistence",
			"importKind": "named",
			"importedName": "PersistedQueue",
			"localName": "PersistedQueue",
			"typeOnly": false,
			"members": [
				"ErrorTypeId",
				"PersistedQueue",
				"PersistedQueueError",
				"PersistedQueueFactory",
				"PersistedQueueStore",
				"TypeId",
				"layer",
				"layerCleanup",
				"layerStoreMemory",
				"layerStoreRedis",
				"layerStoreSql",
				"make",
				"makeFactory",
				"makeStoreRedis",
				"makeStoreSql"
			]
		}
	],
	"Persistence": [
		{
			"moduleSpecifier": "effect/unstable/persistence",
			"importKind": "named",
			"importedName": "Persistence",
			"localName": "Persistence",
			"typeOnly": false,
			"members": [
				"BackingPersistence",
				"BackingPersistenceStore",
				"Persistence",
				"PersistenceError",
				"PersistenceStore",
				"layer",
				"layerBackingKvs",
				"layerBackingMemory",
				"layerBackingRedis",
				"layerBackingSql",
				"layerBackingSqlMultiTable",
				"layerKvs",
				"layerMemory",
				"layerRedis",
				"layerSql",
				"layerSqlMultiTable",
				"unsafeTtlToExpires"
			]
		}
	],
	"PgAuth": [
		{
			"moduleSpecifier": "@effect/sql-pg",
			"importKind": "named",
			"importedName": "PgAuth",
			"localName": "PgAuth",
			"typeOnly": false,
			"members": [
				"AuthError",
				"SCRAM_SHA_256",
				"ScramFinal",
				"ScramFirst",
				"ScramState",
				"md5Password",
				"scramContinue",
				"scramFinish",
				"scramInit"
			]
		}
	],
	"PgClient": [
		{
			"moduleSpecifier": "@effect/sql-pg",
			"importKind": "named",
			"importedName": "PgClient",
			"localName": "PgClient",
			"typeOnly": false,
			"members": [
				"PgClient",
				"PgClientConfig",
				"PgCustom",
				"PgPoolConfig",
				"TypeId",
				"layer",
				"layerConfig",
				"layerFrom",
				"make",
				"makeClient",
				"makeCompiler"
			]
		}
	],
	"PgConnection": [
		{
			"moduleSpecifier": "@effect/sql-pg",
			"importKind": "named",
			"importedName": "PgConnection",
			"localName": "PgConnection",
			"typeOnly": false,
			"members": [
				"Config",
				"Field",
				"Notification",
				"PgConnection",
				"Result",
				"Row",
				"TypeId",
				"make"
			]
		}
	],
	"PgMigrator": [
		{
			"moduleSpecifier": "@effect/sql-pg",
			"importKind": "named",
			"importedName": "PgMigrator",
			"localName": "PgMigrator",
			"typeOnly": false,
			"members": [
				"layer",
				"run"
			]
		}
	],
	"PgPool": [
		{
			"moduleSpecifier": "@effect/sql-pg",
			"importKind": "named",
			"importedName": "PgPool",
			"localName": "PgPool",
			"typeOnly": false,
			"members": [
				"Config",
				"PgPool",
				"TypeId",
				"make"
			]
		}
	],
	"PgProtocol": [
		{
			"moduleSpecifier": "@effect/sql-pg",
			"importKind": "named",
			"importedName": "PgProtocol",
			"localName": "PgProtocol",
			"typeOnly": false,
			"members": [
				"AuthenticationCleartextPassword",
				"AuthenticationMD5Password",
				"AuthenticationOk",
				"AuthenticationSASL",
				"AuthenticationSASLContinue",
				"AuthenticationSASLFinal",
				"AuthenticationUnsupported",
				"BackendKeyData",
				"BackendMessage",
				"Bind",
				"BindComplete",
				"Close",
				"CloseComplete",
				"CommandComplete",
				"CopyBothResponse",
				"CopyData",
				"CopyDone",
				"CopyInResponse",
				"CopyOutResponse",
				"DataRow",
				"Describe",
				"DescribeTarget",
				"EmptyQueryResponse",
				"EncodeError",
				"ErrorFields",
				"ErrorResponse",
				"Execute",
				"FieldDescription",
				"FieldReader",
				"Flush",
				"FrontendMessage",
				"NegotiateProtocolVersion",
				"NoData",
				"NoticeResponse",
				"NotificationResponse",
				"ParameterDescription",
				"ParameterStatus",
				"Parse",
				"ParseComplete",
				"ParseError",
				"Parser",
				"PasswordMessage",
				"PortalSuspended",
				"ReadyForQuery",
				"RowDescription",
				"SASLInitialResponse",
				"SASLResponse",
				"StartupParameters",
				"Sync",
				"Terminate",
				"TransactionStatus",
				"Unknown",
				"ValueSink",
				"decodeSslResponse",
				"defaultMaxMessageSize",
				"encode",
				"encodeBind",
				"encodeCancelRequest",
				"encodeClose",
				"encodeDescribe",
				"encodeExecute",
				"encodeFlush",
				"encodeParse",
				"encodePasswordMessage",
				"encodeSASLInitialResponse",
				"encodeSASLResponse",
				"encodeSslRequest",
				"encodeStartupMessage",
				"encodeSync",
				"encodeTerminate",
				"makeBindEncoder",
				"makeParser"
			]
		}
	],
	"PgTypes": [
		{
			"moduleSpecifier": "@effect/sql-pg",
			"importKind": "named",
			"importedName": "PgTypes",
			"localName": "PgTypes",
			"typeOnly": false,
			"members": [
				"Codec",
				"CodecError",
				"Column",
				"OID",
				"Parameter",
				"ParameterTypeId",
				"RegisterOptions",
				"Registry",
				"array",
				"arrayOidFor",
				"bool",
				"bpchar",
				"bytea",
				"cidr",
				"date",
				"decode",
				"encode",
				"encodeParameter",
				"float4",
				"float8",
				"inet",
				"int2",
				"int4",
				"int8",
				"isParameter",
				"isTextFormat",
				"json",
				"jsonb",
				"makeFieldReader",
				"makeRegistry",
				"name",
				"numeric",
				"oid",
				"register",
				"text",
				"time",
				"timestamp",
				"timestamptz",
				"timetz",
				"unregister",
				"uuid",
				"varchar",
				"writeParameter"
			]
		}
	],
	"pipe": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "pipe",
			"localName": "pipe",
			"typeOnly": false
		}
	],
	"Pipeable": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Pipeable",
			"localName": "Pipeable",
			"typeOnly": false,
			"members": [
				"Class",
				"Mixin",
				"Pipeable",
				"PipeableConstructor",
				"Prototype",
				"pipeArguments"
			]
		}
	],
	"PlatformError": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "PlatformError",
			"localName": "PlatformError",
			"typeOnly": false,
			"members": [
				"BadArgument",
				"PlatformError",
				"SystemError",
				"SystemErrorTag",
				"badArgument",
				"systemError"
			]
		}
	],
	"Pool": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Pool",
			"localName": "Pool",
			"typeOnly": false,
			"members": [
				"Config",
				"Pool",
				"PoolItem",
				"State",
				"Strategy",
				"get",
				"invalidate",
				"isPool",
				"make",
				"makeWithStrategy",
				"makeWithTTL",
				"reserve",
				"use"
			]
		}
	],
	"Predicate": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Predicate",
			"localName": "Predicate",
			"typeOnly": false,
			"members": [
				"Predicate",
				"PredicateTypeLambda",
				"Refinement",
				"Struct",
				"Tuple",
				"and",
				"compose",
				"eqv",
				"every",
				"hasProperty",
				"implies",
				"isBigInt",
				"isBoolean",
				"isDate",
				"isError",
				"isFunction",
				"isIterable",
				"isMap",
				"isNever",
				"isNotNull",
				"isNotNullish",
				"isNotUndefined",
				"isNull",
				"isNullish",
				"isNumber",
				"isObject",
				"isObjectKeyword",
				"isObjectOrArray",
				"isPromise",
				"isPromiseLike",
				"isPropertyKey",
				"isReadonlyObject",
				"isRegExp",
				"isSet",
				"isString",
				"isSymbol",
				"isTagged",
				"isTruthy",
				"isTupleOf",
				"isTupleOfAtLeast",
				"isUint8Array",
				"isUndefined",
				"isUnknown",
				"mapInput",
				"nand",
				"nor",
				"not",
				"or",
				"some",
				"xor"
			]
		}
	],
	"PrimaryKey": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "PrimaryKey",
			"localName": "PrimaryKey",
			"typeOnly": false,
			"members": [
				"PrimaryKey",
				"isPrimaryKey",
				"symbol",
				"value"
			]
		}
	],
	"Primitive": [
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "Primitive",
			"localName": "Primitive",
			"typeOnly": false,
			"members": [
				"Boolean",
				"Choice",
				"Date",
				"FileParse",
				"FileParseOptions",
				"FileSchema",
				"FileSchemaOptions",
				"FileText",
				"Finite",
				"Int",
				"KeyValuePair",
				"Never",
				"Path",
				"PathType",
				"Primitive",
				"Redacted",
				"String",
				"getTypeName"
			]
		}
	],
	"PrometheusMetrics": [
		{
			"moduleSpecifier": "effect/unstable/observability",
			"importKind": "named",
			"importedName": "PrometheusMetrics",
			"localName": "PrometheusMetrics",
			"typeOnly": false,
			"members": [
				"FormatOptions",
				"HttpOptions",
				"MetricNameMapper",
				"format",
				"formatUnsafe",
				"layerHttp"
			]
		}
	],
	"Prompt": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "Prompt",
			"localName": "Prompt",
			"typeOnly": false,
			"members": [
				"AssistantMessage",
				"AssistantMessageEncoded",
				"AssistantMessageOptions",
				"AssistantMessagePart",
				"AssistantMessagePartEncoded",
				"BaseMessage",
				"BaseMessageEncoded",
				"BasePart",
				"BasePartEncoded",
				"ContentFromString",
				"FilePart",
				"FilePartEncoded",
				"FilePartOptions",
				"Message",
				"MessageConstructorParams",
				"MessageEncoded",
				"Part",
				"PartConstructorParams",
				"PartEncoded",
				"Prompt",
				"PromptEncoded",
				"ProviderOptions",
				"RawInput",
				"ReasoningPart",
				"ReasoningPartEncoded",
				"ReasoningPartOptions",
				"SystemMessage",
				"SystemMessageEncoded",
				"SystemMessageOptions",
				"TextPart",
				"TextPartEncoded",
				"TextPartOptions",
				"ToolApprovalRequestPart",
				"ToolApprovalRequestPartEncoded",
				"ToolApprovalRequestPartOptions",
				"ToolApprovalResponsePart",
				"ToolApprovalResponsePartEncoded",
				"ToolApprovalResponsePartOptions",
				"ToolCallPart",
				"ToolCallPartEncoded",
				"ToolCallPartOptions",
				"ToolMessage",
				"ToolMessageEncoded",
				"ToolMessageOptions",
				"ToolMessagePart",
				"ToolMessagePartEncoded",
				"ToolResultPart",
				"ToolResultPartEncoded",
				"ToolResultPartOptions",
				"UserMessage",
				"UserMessageEncoded",
				"UserMessageOptions",
				"UserMessagePart",
				"UserMessagePartEncoded",
				"appendSystem",
				"assistantMessage",
				"concat",
				"empty",
				"filePart",
				"fromMessages",
				"fromResponseParts",
				"isMessage",
				"isPart",
				"isPrompt",
				"make",
				"makeMessage",
				"makePart",
				"prependSystem",
				"reasoningPart",
				"setSystem",
				"systemMessage",
				"textPart",
				"toolApprovalRequestPart",
				"toolApprovalResponsePart",
				"toolCallPart",
				"toolMessage",
				"toolResultPart",
				"userMessage"
			]
		},
		{
			"moduleSpecifier": "effect/unstable/cli",
			"importKind": "named",
			"importedName": "Prompt",
			"localName": "Prompt",
			"typeOnly": false,
			"members": [
				"Action",
				"ActionDefinition",
				"All",
				"Any",
				"AutoComplete",
				"AutoCompleteOptions",
				"Confirm",
				"ConfirmOptions",
				"Custom",
				"Date",
				"DateOptions",
				"Environment",
				"File",
				"FileOptions",
				"Handlers",
				"Hidden",
				"Int",
				"IntOptions",
				"List",
				"ListOptions",
				"MultiSelect",
				"MultiSelectOptions",
				"Number",
				"NumberOptions",
				"Password",
				"ProcessInput",
				"Prompt",
				"Select",
				"SelectChoice",
				"SelectOptions",
				"String",
				"TextOptions",
				"Theme",
				"ThemeOptions",
				"Toggle",
				"ToggleOptions",
				"all",
				"flatMap",
				"isPrompt",
				"makeTheme",
				"map",
				"run",
				"succeed"
			]
		}
	],
	"prop": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "prop",
			"localName": "prop",
			"typeOnly": false
		}
	],
	"ProvidedContext": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "ProvidedContext",
			"localName": "ProvidedContext",
			"typeOnly": false
		}
	],
	"PubSub": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "PubSub",
			"localName": "PubSub",
			"typeOnly": false,
			"members": [
				"BackPressureStrategy",
				"DroppingStrategy",
				"PubSub",
				"SlidingStrategy",
				"Subscription",
				"awaitShutdown",
				"bounded",
				"capacity",
				"dropping",
				"isEmpty",
				"isFull",
				"isShutdown",
				"isShutdownUnsafe",
				"make",
				"makeAtomicBounded",
				"makeAtomicUnbounded",
				"publish",
				"publishAll",
				"publishUnsafe",
				"remaining",
				"remainingUnsafe",
				"shutdown",
				"size",
				"sizeUnsafe",
				"sliding",
				"subscribe",
				"take",
				"takeAll",
				"takeBetween",
				"takeUpTo",
				"unbounded"
			]
		}
	],
	"Pull": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Pull",
			"localName": "Pull",
			"typeOnly": false,
			"members": [
				"Error",
				"ExcludeDone",
				"Leftover",
				"Pull",
				"Services",
				"Success",
				"catchDone",
				"doneExitFromCause",
				"filterDone",
				"filterDoneLeftover",
				"filterDoneVoid",
				"filterNoDone",
				"isDoneCause",
				"isDoneFailure",
				"matchEffect"
			]
		}
	],
	"Queue": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Queue",
			"localName": "Queue",
			"typeOnly": false,
			"members": [
				"Dequeue",
				"Enqueue",
				"Queue",
				"asDequeue",
				"asEnqueue",
				"await",
				"bounded",
				"clear",
				"collect",
				"dropping",
				"end",
				"endUnsafe",
				"fail",
				"failCause",
				"failCauseUnsafe",
				"flush",
				"flushUnsafe",
				"interrupt",
				"into",
				"isDequeue",
				"isEnqueue",
				"isFull",
				"isFullUnsafe",
				"isQueue",
				"make",
				"offer",
				"offerAll",
				"offerAllUnsafe",
				"offerUnsafe",
				"peek",
				"poll",
				"shutdown",
				"shutdownUnsafe",
				"size",
				"sizeUnsafe",
				"sliding",
				"take",
				"takeAll",
				"takeBetween",
				"takeN",
				"takeUnsafe",
				"unbounded"
			]
		}
	],
	"Random": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Random",
			"localName": "Random",
			"typeOnly": false,
			"members": [
				"Random",
				"choice",
				"next",
				"nextBetween",
				"nextBoolean",
				"nextInt",
				"nextIntBetween",
				"shuffle",
				"withSeed"
			]
		}
	],
	"RateLimiter": [
		{
			"moduleSpecifier": "effect/unstable/persistence",
			"importKind": "named",
			"importedName": "RateLimiter",
			"localName": "RateLimiter",
			"typeOnly": false,
			"members": [
				"AdaptiveConsumeOptions",
				"AdaptiveConsumeResult",
				"AdaptiveFeedbackOptions",
				"AdaptivePhase",
				"ConsumeResult",
				"ErrorTypeId",
				"RateLimitExceeded",
				"RateLimitStoreError",
				"RateLimiter",
				"RateLimiterError",
				"RateLimiterErrorReason",
				"RateLimiterStore",
				"TypeId",
				"layer",
				"layerStoreMemory",
				"layerStoreRedis",
				"layerStoreRedisConfig",
				"make",
				"makeStoreRedis",
				"makeWithRateLimiter",
				"sleep"
			]
		}
	],
	"RcMap": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "RcMap",
			"localName": "RcMap",
			"typeOnly": false,
			"members": [
				"RcMap",
				"State",
				"get",
				"getOption",
				"has",
				"invalidate",
				"keys",
				"make",
				"touch"
			]
		}
	],
	"RcRef": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "RcRef",
			"localName": "RcRef",
			"typeOnly": false,
			"members": [
				"RcRef",
				"get",
				"invalidate",
				"make"
			]
		}
	],
	"Reactivity": [
		{
			"moduleSpecifier": "effect/unstable/reactivity",
			"importKind": "named",
			"importedName": "Reactivity",
			"localName": "Reactivity",
			"typeOnly": false,
			"members": [
				"Reactivity",
				"TypeId",
				"invalidate",
				"layer",
				"make",
				"mutation",
				"query",
				"stream"
			]
		}
	],
	"Record": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Record",
			"localName": "Record",
			"typeOnly": false,
			"members": [
				"ReadonlyRecord",
				"ReadonlyRecordTypeLambda",
				"assignProperty",
				"collect",
				"difference",
				"empty",
				"every",
				"filter",
				"filterMap",
				"findFirst",
				"fromEntries",
				"fromIterableBy",
				"fromIterableWith",
				"get",
				"getFailures",
				"getSomes",
				"getSuccesses",
				"has",
				"intersection",
				"isEmptyReadonlyRecord",
				"isEmptyRecord",
				"isSubrecord",
				"isSubrecordBy",
				"keys",
				"makeEquivalence",
				"makeReducerIntersection",
				"makeReducerUnion",
				"map",
				"mapEntries",
				"mapKeys",
				"modify",
				"partition",
				"pop",
				"reduce",
				"remove",
				"replace",
				"separate",
				"set",
				"singleton",
				"size",
				"some",
				"toEntries",
				"union",
				"values"
			]
		}
	],
	"recordArtifact": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "recordArtifact",
			"localName": "recordArtifact",
			"typeOnly": false
		}
	],
	"Redactable": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Redactable",
			"localName": "Redactable",
			"typeOnly": false,
			"members": [
				"Redactable",
				"getRedacted",
				"isRedactable",
				"redact",
				"symbolRedactable"
			]
		}
	],
	"Redacted": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Redacted",
			"localName": "Redacted",
			"typeOnly": false,
			"members": [
				"Redacted",
				"isRedacted",
				"make",
				"makeEquivalence",
				"value",
				"wipeUnsafe"
			]
		}
	],
	"Redis": [
		{
			"moduleSpecifier": "effect/unstable/persistence",
			"importKind": "named",
			"importedName": "Redis",
			"localName": "Redis",
			"typeOnly": false,
			"members": [
				"Redis",
				"RedisError",
				"RedisMessage",
				"Script",
				"make",
				"script"
			]
		}
	],
	"Reducer": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Reducer",
			"localName": "Reducer",
			"typeOnly": false,
			"members": [
				"Reducer",
				"flip",
				"make"
			]
		}
	],
	"Ref": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Ref",
			"localName": "Ref",
			"typeOnly": false,
			"members": [
				"Ref",
				"get",
				"getAndSet",
				"getAndUpdate",
				"getAndUpdateSome",
				"getUnsafe",
				"make",
				"makeUnsafe",
				"modify",
				"modifySome",
				"set",
				"setAndGet",
				"update",
				"updateAndGet",
				"updateSome",
				"updateSomeAndGet"
			]
		}
	],
	"References": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "References",
			"localName": "References",
			"typeOnly": false,
			"members": [
				"CurrentLogAnnotations",
				"CurrentLogLevel",
				"CurrentLogSpans",
				"CurrentLoggers",
				"CurrentStackFrame",
				"CurrentTraceLevel",
				"DisablePropagation",
				"LogToStderr",
				"MaxOpsBeforeYield",
				"MinimumLogLevel",
				"MinimumTraceLevel",
				"PreventSchedulerYield",
				"Scheduler",
				"StackFrame",
				"Tracer",
				"TracerEnabled",
				"TracerSpanAnnotations",
				"TracerSpanLinks",
				"TracerTimingEnabled",
				"UnhandledLogLevel"
			]
		}
	],
	"RegExp": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "RegExp",
			"localName": "RegExp",
			"typeOnly": false,
			"members": [
				"RegExp",
				"escape",
				"isRegExp"
			]
		}
	],
	"Reply": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "Reply",
			"localName": "Reply",
			"typeOnly": false,
			"members": [
				"Chunk",
				"ChunkEncoded",
				"Encoded",
				"Reply",
				"ReplyWithContext",
				"WithExit",
				"WithExitEncoded",
				"isReply",
				"serialize",
				"serializeLastReceived",
				"serializeOrDefect"
			]
		}
	],
	"Request": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Request",
			"localName": "Request",
			"typeOnly": false,
			"members": [
				"Any",
				"Class",
				"Constructor",
				"Entry",
				"Error",
				"Request",
				"RequestPrototype",
				"Result",
				"Services",
				"Success",
				"TaggedClass",
				"Variance",
				"complete",
				"completeEffect",
				"fail",
				"failCause",
				"isRequest",
				"makeEntry",
				"of",
				"succeed",
				"tagged"
			]
		}
	],
	"RequestResolver": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "RequestResolver",
			"localName": "RequestResolver",
			"typeOnly": false,
			"members": [
				"RequestResolver",
				"around",
				"asCache",
				"batchN",
				"fromEffect",
				"fromEffectTagged",
				"fromFunction",
				"fromFunctionBatched",
				"grouped",
				"isRequestResolver",
				"make",
				"makeGrouped",
				"makeWith",
				"never",
				"persisted",
				"race",
				"setDelay",
				"setDelayEffect",
				"withCache",
				"withSpan"
			]
		}
	],
	"Resource": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Resource",
			"localName": "Resource",
			"typeOnly": false,
			"members": [
				"Resource",
				"auto",
				"get",
				"isResource",
				"manual",
				"refresh"
			]
		},
		{
			"moduleSpecifier": "@effect/opentelemetry",
			"importKind": "named",
			"importedName": "Resource",
			"localName": "Resource",
			"typeOnly": false,
			"members": [
				"Resource",
				"configToAttributes",
				"layer",
				"layerEmpty",
				"layerFromEnv"
			]
		}
	],
	"Response": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "Response",
			"localName": "Response",
			"typeOnly": false,
			"members": [
				"AllParts",
				"AllPartsEncoded",
				"AnyPart",
				"AnyPartEncoded",
				"BasePart",
				"BasePartEncoded",
				"BaseToolResult",
				"ConstructorParams",
				"DocumentSourcePart",
				"DocumentSourcePartEncoded",
				"DocumentSourcePartMetadata",
				"ErrorPart",
				"ErrorPartEncoded",
				"ErrorPartMetadata",
				"FilePart",
				"FilePartEncoded",
				"FilePartMetadata",
				"FinishPart",
				"FinishPartEncoded",
				"FinishPartMetadata",
				"FinishReason",
				"HttpRequestDetails",
				"HttpResponseDetails",
				"Part",
				"PartEncoded",
				"ProviderMetadata",
				"ReasoningDeltaPart",
				"ReasoningDeltaPartEncoded",
				"ReasoningDeltaPartMetadata",
				"ReasoningEndPart",
				"ReasoningEndPartEncoded",
				"ReasoningEndPartMetadata",
				"ReasoningPart",
				"ReasoningPartEncoded",
				"ReasoningPartMetadata",
				"ReasoningStartPart",
				"ReasoningStartPartEncoded",
				"ReasoningStartPartMetadata",
				"ResponseMetadataPart",
				"ResponseMetadataPartEncoded",
				"ResponseMetadataPartMetadata",
				"StreamPart",
				"StreamPartEncoded",
				"TextDeltaPart",
				"TextDeltaPartEncoded",
				"TextDeltaPartMetadata",
				"TextEndPart",
				"TextEndPartEncoded",
				"TextEndPartMetadata",
				"TextPart",
				"TextPartEncoded",
				"TextPartMetadata",
				"TextStartPart",
				"TextStartPartEncoded",
				"TextStartPartMetadata",
				"ToolApprovalRequestPart",
				"ToolApprovalRequestPartEncoded",
				"ToolApprovalRequestPartMetadata",
				"ToolCallPart",
				"ToolCallPartEncoded",
				"ToolCallPartMetadata",
				"ToolCallParts",
				"ToolParametersMode",
				"ToolParamsDeltaPart",
				"ToolParamsDeltaPartEncoded",
				"ToolParamsDeltaPartMetadata",
				"ToolParamsEndPart",
				"ToolParamsEndPartEncoded",
				"ToolParamsEndPartMetadata",
				"ToolParamsStartPart",
				"ToolParamsStartPartEncoded",
				"ToolParamsStartPartMetadata",
				"ToolResultFailure",
				"ToolResultPart",
				"ToolResultPartEncoded",
				"ToolResultPartMetadata",
				"ToolResultParts",
				"ToolResultSuccess",
				"UrlSourcePart",
				"UrlSourcePartEncoded",
				"UrlSourcePartMetadata",
				"Usage",
				"isPart",
				"makePart",
				"toolApprovalRequestPart",
				"toolCallPart",
				"toolResultPart"
			]
		}
	],
	"ResponseIdTracker": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "ResponseIdTracker",
			"localName": "ResponseIdTracker",
			"typeOnly": false,
			"members": [
				"PrepareResult",
				"ResponseIdTracker",
				"Service",
				"make"
			]
		}
	],
	"Result": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Result",
			"localName": "Result",
			"typeOnly": false,
			"members": [
				"Do",
				"Failure",
				"Result",
				"ResultIterator",
				"ResultTypeLambda",
				"ResultUnify",
				"ResultUnifyIgnore",
				"Success",
				"all",
				"andThen",
				"bind",
				"bindTo",
				"fail",
				"failVoid",
				"filterOrFail",
				"flatMap",
				"flip",
				"fromNullishOr",
				"fromOption",
				"gen",
				"getFailure",
				"getOrElse",
				"getOrNull",
				"getOrThrow",
				"getOrThrowWith",
				"getOrUndefined",
				"getSuccess",
				"isFailure",
				"isResult",
				"isSuccess",
				"let",
				"liftPredicate",
				"makeEquivalence",
				"map",
				"mapBoth",
				"mapError",
				"match",
				"merge",
				"orElse",
				"succeed",
				"succeedNone",
				"succeedSome",
				"tap",
				"transposeMapOption",
				"transposeOption",
				"try",
				"void"
			]
		}
	],
	"Rpc": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "Rpc",
			"localName": "Rpc",
			"typeOnly": false,
			"members": [
				"AddError",
				"AddMiddleware",
				"Any",
				"AnyWithProps",
				"Custom",
				"DefectSchema",
				"Error",
				"ErrorExit",
				"ErrorExitSchema",
				"ErrorSchema",
				"ExcludeProvides",
				"Exit",
				"ExtractProvides",
				"ExtractRequires",
				"ExtractTag",
				"Handler",
				"IsStream",
				"Middleware",
				"MiddlewareClient",
				"Payload",
				"PayloadConstructor",
				"Prefixed",
				"ResultFrom",
				"Rpc",
				"ServerClient",
				"Services",
				"ServicesClient",
				"ServicesServer",
				"Success",
				"SuccessChunk",
				"SuccessEncoded",
				"SuccessExit",
				"SuccessExitSchema",
				"SuccessSchema",
				"Tag",
				"ToHandler",
				"ToHandlerFn",
				"Wrapper",
				"WrapperOr",
				"custom",
				"exitSchema",
				"fork",
				"isRpc",
				"isWrapper",
				"make",
				"uninterruptible",
				"unwrap",
				"wrap",
				"wrapMap"
			]
		}
	],
	"RpcClient": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "RpcClient",
			"localName": "RpcClient",
			"typeOnly": false,
			"members": [
				"ConnectionHooks",
				"CurrentHeaders",
				"FromGroup",
				"Protocol",
				"RpcClient",
				"layerProtocolHttp",
				"layerProtocolSocket",
				"layerProtocolWorker",
				"make",
				"makeNoSerialization",
				"makeProtocolHttp",
				"makeProtocolSocket",
				"makeProtocolWorker",
				"withHeaders"
			]
		}
	],
	"RpcClientError": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "RpcClientError",
			"localName": "RpcClientError",
			"typeOnly": false,
			"members": [
				"RpcClientDefect",
				"RpcClientError"
			]
		}
	],
	"RpcGroup": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "RpcGroup",
			"localName": "RpcGroup",
			"typeOnly": false,
			"members": [
				"Any",
				"HandlerFrom",
				"HandlerServices",
				"HandlersFrom",
				"HandlersServices",
				"RpcGroup",
				"Rpcs",
				"make"
			]
		}
	],
	"RpcMessage": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "RpcMessage",
			"localName": "RpcMessage",
			"typeOnly": false,
			"members": [
				"Ack",
				"AckEncoded",
				"ClientEnd",
				"ClientProtocolError",
				"EncodedSchema",
				"Eof",
				"ExitEncoded",
				"FromClient",
				"FromClientEncoded",
				"FromServer",
				"FromServerEncoded",
				"Interrupt",
				"InterruptEncoded",
				"Ping",
				"Pong",
				"Request",
				"RequestEncoded",
				"RequestId",
				"ResponseChunk",
				"ResponseChunkEncoded",
				"ResponseDefect",
				"ResponseDefectEncoded",
				"ResponseExit",
				"ResponseExitDieEncoded",
				"ResponseExitEncoded",
				"ResponseId",
				"ResponseIdTypeId",
				"constEof",
				"constPing",
				"constPong",
				"isTerminalResponse"
			]
		}
	],
	"RpcMiddleware": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "RpcMiddleware",
			"localName": "RpcMiddleware",
			"typeOnly": false,
			"members": [
				"Any",
				"AnyId",
				"AnyService",
				"AnyServiceWithProps",
				"ApplyServices",
				"Error",
				"ErrorSchema",
				"ErrorServicesDecode",
				"ErrorServicesEncode",
				"ForClient",
				"Provides",
				"Requires",
				"RpcMiddleware",
				"RpcMiddlewareClient",
				"Service",
				"ServiceClass",
				"SuccessValue",
				"TypeId",
				"layerClient"
			]
		}
	],
	"RpcSchema": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "RpcSchema",
			"localName": "RpcSchema",
			"typeOnly": false,
			"members": [
				"ClientAbort",
				"Stream",
				"isStreamSchema"
			]
		}
	],
	"RpcSerialization": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "RpcSerialization",
			"localName": "RpcSerialization",
			"typeOnly": false,
			"members": [
				"CodecFor",
				"MaxBufferSizeExceeded",
				"Parser",
				"RpcSerialization",
				"StreamOptions",
				"json",
				"jsonRpc",
				"layerJson",
				"layerJsonRpc",
				"layerNdJsonRpc",
				"layerNdjson",
				"layerNdjsonWith",
				"layerSchemaBinary",
				"makeNdjson",
				"ndJsonRpc",
				"ndjson"
			]
		}
	],
	"RpcServer": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "RpcServer",
			"localName": "RpcServer",
			"typeOnly": false,
			"members": [
				"Protocol",
				"RpcServer",
				"layer",
				"layerHttp",
				"layerProtocolHttp",
				"layerProtocolSocketServer",
				"layerProtocolStdio",
				"layerProtocolWebsocket",
				"layerProtocolWorkerRunner",
				"make",
				"makeNoSerialization",
				"makeProtocolHttp",
				"makeProtocolSocketServer",
				"makeProtocolStdio",
				"makeProtocolWebsocket",
				"makeProtocolWithHttpEffect",
				"makeProtocolWithHttpEffectWebsocket",
				"makeProtocolWorkerRunner",
				"toHttpEffect",
				"toHttpEffectWebsocket"
			]
		}
	],
	"RpcTest": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "RpcTest",
			"localName": "RpcTest",
			"typeOnly": false,
			"members": [
				"makeClient"
			]
		}
	],
	"RpcWorker": [
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "RpcWorker",
			"localName": "RpcWorker",
			"typeOnly": false,
			"members": [
				"InitialMessage",
				"initialMessage",
				"layerInitialMessage",
				"makeInitialMessage"
			]
		}
	],
	"run": [
		{
			"moduleSpecifier": "@effect/openapi-generator/main",
			"importKind": "named",
			"importedName": "run",
			"localName": "run",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"RunMode": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RunMode",
			"localName": "RunMode",
			"typeOnly": false
		}
	],
	"Runner": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "Runner",
			"localName": "Runner",
			"typeOnly": false,
			"members": [
				"Runner",
				"make"
			]
		}
	],
	"RunnerAddress": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "RunnerAddress",
			"localName": "RunnerAddress",
			"typeOnly": false,
			"members": [
				"RunnerAddress",
				"make"
			]
		}
	],
	"RunnerHealth": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "RunnerHealth",
			"localName": "RunnerHealth",
			"typeOnly": false,
			"members": [
				"RunnerHealth",
				"layerK8s",
				"layerNoop",
				"layerPing",
				"makeK8s",
				"makePing"
			]
		}
	],
	"RunnerRPC": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RunnerRPC",
			"localName": "RunnerRPC",
			"typeOnly": false
		}
	],
	"Runners": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "Runners",
			"localName": "Runners",
			"typeOnly": false,
			"members": [
				"RpcClient",
				"RpcClientProtocol",
				"Rpcs",
				"Runners",
				"layerNoop",
				"layerRpc",
				"make",
				"makeNoop",
				"makeRpc",
				"makeRpcClient"
			]
		}
	],
	"RunnerServer": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "RunnerServer",
			"localName": "RunnerServer",
			"typeOnly": false,
			"members": [
				"layer",
				"layerClientOnly",
				"layerHandlers",
				"layerWithClients"
			]
		}
	],
	"RunnerStorage": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "RunnerStorage",
			"localName": "RunnerStorage",
			"typeOnly": false,
			"members": [
				"Encoded",
				"RunnerStorage",
				"layerMemory",
				"makeEncoded",
				"makeMemory"
			]
		}
	],
	"RunnerTask": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RunnerTask",
			"localName": "RunnerTask",
			"typeOnly": false
		}
	],
	"RunnerTaskBase": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RunnerTaskBase",
			"localName": "RunnerTaskBase",
			"typeOnly": false
		}
	],
	"RunnerTaskEventPack": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RunnerTaskEventPack",
			"localName": "RunnerTaskEventPack",
			"typeOnly": false
		}
	],
	"RunnerTaskResult": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RunnerTaskResult",
			"localName": "RunnerTaskResult",
			"typeOnly": false
		}
	],
	"RunnerTaskResultPack": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RunnerTaskResultPack",
			"localName": "RunnerTaskResultPack",
			"typeOnly": false
		}
	],
	"RunnerTestCase": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RunnerTestCase",
			"localName": "RunnerTestCase",
			"typeOnly": false
		}
	],
	"RunnerTestFile": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RunnerTestFile",
			"localName": "RunnerTestFile",
			"typeOnly": false
		}
	],
	"RunnerTestSuite": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RunnerTestSuite",
			"localName": "RunnerTestSuite",
			"typeOnly": false
		}
	],
	"Runtime": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Runtime",
			"localName": "Runtime",
			"typeOnly": false,
			"members": [
				"Teardown",
				"defaultTeardown",
				"errorExitCode",
				"errorReported",
				"getErrorExitCode",
				"getErrorReported",
				"makeRunMain"
			]
		}
	],
	"RuntimeConfig": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RuntimeConfig",
			"localName": "RuntimeConfig",
			"typeOnly": false
		}
	],
	"RuntimeRPC": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "RuntimeRPC",
			"localName": "RuntimeRPC",
			"typeOnly": false
		}
	],
	"Schedule": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Schedule",
			"localName": "Schedule",
			"typeOnly": false,
			"members": [
				"CurrentMetadata",
				"Env",
				"Error",
				"Input",
				"InputMetadata",
				"Metadata",
				"Output",
				"Schedule",
				"addDelay",
				"concat",
				"concatResult",
				"cron",
				"duration",
				"during",
				"exponential",
				"fibonacci",
				"fixed",
				"forever",
				"fromStep",
				"fromStepWithMetadata",
				"identity",
				"isSchedule",
				"jittered",
				"map",
				"max",
				"min",
				"modifyDelay",
				"passthrough",
				"recurs",
				"setInputType",
				"spaced",
				"tap",
				"toStep",
				"toStepWithMetadata",
				"toStepWithSleep",
				"upTo",
				"while",
				"windowed"
			]
		}
	],
	"Scheduler": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Scheduler",
			"localName": "Scheduler",
			"typeOnly": false,
			"members": [
				"MaxOpsBeforeYield",
				"MixedScheduler",
				"PreventSchedulerYield",
				"Scheduler",
				"SchedulerDispatcher"
			]
		}
	],
	"Schema": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Schema",
			"localName": "Schema",
			"typeOnly": false,
			"members": [
				"$Array",
				"$ReadonlyMap",
				"$ReadonlySet",
				"$Record",
				"Annotations",
				"Any",
				"Array",
				"ArrayEnsure",
				"BigDecimal",
				"BigDecimalFromString",
				"BigInt",
				"BigIntFromString",
				"Boolean",
				"BooleanFromBit",
				"Bottom",
				"BottomLazy",
				"BottomLazyWithoutNew",
				"BottomWithoutNew",
				"ByteSize",
				"ByteSizeFromBigInt",
				"ByteSizeFromNumber",
				"ByteSizeFromString",
				"Cause",
				"CauseIso",
				"CauseReason",
				"CauseReasonIso",
				"Char",
				"Chunk",
				"ChunkIso",
				"Class",
				"Codec",
				"Constraint",
				"ConstraintCodec",
				"ConstraintDecoder",
				"ConstraintEncoder",
				"ConstraintRebuildable",
				"ConstructorDefault",
				"Cookie",
				"Cookies",
				"Date",
				"DateFromMillis",
				"DateFromString",
				"DateTimeUtc",
				"DateTimeUtcFromDate",
				"DateTimeUtcFromMillis",
				"DateTimeUtcFromString",
				"DateTimeZoned",
				"DateTimeZonedFromString",
				"Decoder",
				"DecodingDefaultOptions",
				"Defect",
				"Duration",
				"DurationFromMillis",
				"DurationFromNanos",
				"DurationFromString",
				"EncodedGraph",
				"Encoder",
				"Enum",
				"Error",
				"ErrorInstance",
				"ErrorOptions",
				"Exit",
				"ExitIso",
				"File",
				"FilterIssue",
				"FilterOutput",
				"Finite",
				"FiniteFromString",
				"FormData",
				"Graph",
				"GraphIso",
				"HashMap",
				"HashMapIso",
				"HashSet",
				"HashSetIso",
				"Headers",
				"InetAddress",
				"InetAddressFromString",
				"InetAddressV4",
				"InetAddressV6",
				"Int",
				"IpAddress",
				"IpAddressFromString",
				"IpInterface",
				"IpInterfaceFromString",
				"IpLinkLocalAddress",
				"IpLinkLocalAddressFromString",
				"IpLoopbackAddress",
				"IpLoopbackAddressFromString",
				"IpMulticastAddress",
				"IpMulticastAddressFromString",
				"IpNetwork",
				"IpNetworkFromString",
				"IpUnicastAddress",
				"IpUnicastAddressFromString",
				"IpUnspecifiedAddress",
				"IpUnspecifiedAddressFromString",
				"Ipv4Address",
				"Ipv4AddressFromString",
				"Ipv4BroadcastAddress",
				"Ipv4BroadcastAddressFromString",
				"Ipv4Interface",
				"Ipv4InterfaceFromString",
				"Ipv4Network",
				"Ipv4NetworkFromString",
				"Ipv4PrivateAddress",
				"Ipv4PrivateAddressFromString",
				"Ipv6Address",
				"Ipv6AddressFromString",
				"Ipv6Interface",
				"Ipv6InterfaceFromString",
				"Ipv6Network",
				"Ipv6NetworkFromString",
				"Ipv6UniqueLocalAddress",
				"Ipv6UniqueLocalAddressFromString",
				"Json",
				"JsonArray",
				"JsonFromUrlParamsField",
				"JsonObject",
				"Literal",
				"Literals",
				"MacAddress",
				"MacAddressFromString",
				"MacBroadcastAddress",
				"MacBroadcastAddressFromString",
				"MacLocallyAdministeredAddress",
				"MacLocallyAdministeredAddressFromString",
				"MacMulticastAddress",
				"MacMulticastAddressFromString",
				"MacUnicastAddress",
				"MacUnicastAddressFromString",
				"MacUniversallyAdministeredAddress",
				"MacUniversallyAdministeredAddressFromString",
				"MakeOptions",
				"Mutability",
				"MutableJson",
				"MutableJsonArray",
				"MutableJsonObject",
				"Natural",
				"Never",
				"NonEmptyArray",
				"NonEmptyString",
				"Null",
				"NullOr",
				"NullishOr",
				"Number",
				"NumberFromString",
				"ObjectKeyword",
				"Opaque",
				"Optic",
				"Option",
				"OptionFromNullOr",
				"OptionFromNullishOr",
				"OptionFromOptional",
				"OptionFromOptionalKey",
				"OptionFromOptionalNullOr",
				"OptionFromUndefinedOr",
				"OptionIso",
				"Optionality",
				"PropertyKey",
				"ReadonlyMap",
				"ReadonlyMapIso",
				"ReadonlySet",
				"ReadonlySetIso",
				"Record",
				"RecordFromCookies",
				"RecordFromUrlParams",
				"Redacted",
				"RedactedFromValue",
				"RegExp",
				"Result",
				"ResultIso",
				"Schema",
				"SchemaError",
				"SocketAddress",
				"StandardSchemaV1FailureResult",
				"String",
				"StringFromBase64",
				"StringFromBase64Url",
				"StringFromHex",
				"StringFromUriComponent",
				"StringTree",
				"Struct",
				"StructWithRest",
				"Symbol",
				"TaggedClass",
				"TaggedError",
				"TaggedStruct",
				"TaggedUnion",
				"TemplateLiteral",
				"TemplateLiteralParser",
				"TimeZone",
				"TimeZoneFromString",
				"TimeZoneNamed",
				"TimeZoneNamedFromString",
				"TimeZoneOffset",
				"ToJsonSchemaOptions",
				"Top",
				"Tree",
				"TreeRecord",
				"Trim",
				"Trimmed",
				"Tuple",
				"TupleWithRest",
				"URL",
				"URLFromString",
				"URLSearchParams",
				"Uint8Array",
				"Uint8ArrayFromBase64",
				"Uint8ArrayFromBase64Url",
				"Uint8ArrayFromHex",
				"Undefined",
				"UndefinedOr",
				"Union",
				"UniqueArray",
				"UniqueSymbol",
				"UnixPathAddress",
				"UnixPathAddressFromString",
				"Unknown",
				"UrlParams",
				"Void",
				"WithoutConstructorDefault",
				"annotate",
				"annotateEncoded",
				"annotateKey",
				"asserts",
				"brand",
				"catchDecoding",
				"catchDecodingWithContext",
				"catchEncoding",
				"catchEncodingWithContext",
				"check",
				"compose",
				"declare",
				"declareConstructor",
				"decode",
				"decodeEffect",
				"decodeExit",
				"decodeOption",
				"decodePromise",
				"decodeResult",
				"decodeSync",
				"decodeTo",
				"decodeUnknownEffect",
				"decodeUnknownExit",
				"decodeUnknownOption",
				"decodeUnknownPromise",
				"decodeUnknownResult",
				"decodeUnknownSync",
				"encode",
				"encodeEffect",
				"encodeExit",
				"encodeKeys",
				"encodeOption",
				"encodePromise",
				"encodeResult",
				"encodeSync",
				"encodeTo",
				"encodeUnknownEffect",
				"encodeUnknownExit",
				"encodeUnknownOption",
				"encodeUnknownPromise",
				"encodeUnknownResult",
				"encodeUnknownSync",
				"extendTo",
				"fieldsAssign",
				"flip",
				"fromBrand",
				"fromFormData",
				"fromJsonString",
				"fromURLSearchParams",
				"instanceOf",
				"is",
				"isBase64",
				"isBase64Url",
				"isBetween",
				"isBetweenBigDecimal",
				"isBetweenBigInt",
				"isBetweenDate",
				"isCapitalized",
				"isEndsWith",
				"isFinite",
				"isGUID",
				"isGreaterThan",
				"isGreaterThanBigDecimal",
				"isGreaterThanBigInt",
				"isGreaterThanDate",
				"isGreaterThanOrEqualTo",
				"isGreaterThanOrEqualToBigDecimal",
				"isGreaterThanOrEqualToBigInt",
				"isGreaterThanOrEqualToDate",
				"isIncludes",
				"isInt",
				"isInt32",
				"isLengthBetween",
				"isLessThan",
				"isLessThanBigDecimal",
				"isLessThanBigInt",
				"isLessThanDate",
				"isLessThanOrEqualTo",
				"isLessThanOrEqualToBigDecimal",
				"isLessThanOrEqualToBigInt",
				"isLessThanOrEqualToDate",
				"isLowercased",
				"isMaxLength",
				"isMaxProperties",
				"isMaxSize",
				"isMinLength",
				"isMinProperties",
				"isMinSize",
				"isMultipleOf",
				"isNonEmpty",
				"isPattern",
				"isPropertiesLengthBetween",
				"isPropertyNames",
				"isSchema",
				"isSchemaError",
				"isSizeBetween",
				"isStartsWith",
				"isStringBigInt",
				"isStringFinite",
				"isStringSymbol",
				"isTrimmed",
				"isULID",
				"isUUID",
				"isUint32",
				"isUncapitalized",
				"isUnique",
				"isUniqueKey",
				"isUppercased",
				"link",
				"make",
				"makeFilter",
				"makeFilterGroup",
				"makeIsBetween",
				"makeIsGreaterThan",
				"makeIsGreaterThanOrEqualTo",
				"makeIsLessThan",
				"makeIsLessThanOrEqualTo",
				"makeIsMultipleOf",
				"middlewareDecoding",
				"middlewareEncoding",
				"mutable",
				"mutableKey",
				"optional",
				"optionalKey",
				"overrideToCodecIso",
				"overrideToEquivalence",
				"overrideToFormatter",
				"readonlyKey",
				"refine",
				"required",
				"requiredKey",
				"resolveAnnotations",
				"resolveAnnotationsKey",
				"revealBottom",
				"revealCodec",
				"suspend",
				"tag",
				"tagDefaultOmit",
				"toCodecArrayFromSingle",
				"toCodecIso",
				"toCodecJson",
				"toCodecStringTree",
				"toDifferJsonPatch",
				"toEncoded",
				"toEncoderXml",
				"toEquivalence",
				"toFormatter",
				"toIso",
				"toIsoFocus",
				"toIsoSource",
				"toJsonSchemaDocument",
				"toRepresentation",
				"toStandardJSONSchemaV1",
				"toStandardSchemaV1",
				"toTaggedUnion",
				"toType",
				"withConstructorDefault",
				"withDecodingDefault",
				"withDecodingDefaultKey",
				"withDecodingDefaultType",
				"withDecodingDefaultTypeKey"
			]
		}
	],
	"SchemaAOTCompiler": [
		{
			"moduleSpecifier": "effect/unstable/schema",
			"importKind": "named",
			"importedName": "SchemaAOTCompiler",
			"localName": "SchemaAOTCompiler",
			"typeOnly": false,
			"members": [
				"Operation",
				"Target",
				"compile"
			]
		}
	],
	"SchemaAST": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "SchemaAST",
			"localName": "SchemaAST",
			"typeOnly": false,
			"members": [
				"AST",
				"Any",
				"Arrays",
				"BigInt",
				"Boolean",
				"Check",
				"Checks",
				"Context",
				"Declaration",
				"Encoding",
				"Enum",
				"Filter",
				"FilterGroup",
				"IndexSignature",
				"Link",
				"Literal",
				"LiteralValue",
				"Never",
				"Null",
				"Number",
				"ObjectKeyword",
				"Objects",
				"ParseOptions",
				"PropertySignature",
				"String",
				"Suspend",
				"Symbol",
				"TemplateLiteral",
				"Undefined",
				"Union",
				"UnionOptions",
				"UniqueSymbol",
				"Unknown",
				"Void",
				"any",
				"bigInt",
				"boolean",
				"decodeTo",
				"flip",
				"isAST",
				"isAny",
				"isArrays",
				"isBigInt",
				"isBoolean",
				"isDeclaration",
				"isEnum",
				"isLiteral",
				"isNever",
				"isNull",
				"isNumber",
				"isObjectKeyword",
				"isObjects",
				"isOptional",
				"isPattern",
				"isString",
				"isSuspend",
				"isSymbol",
				"isTemplateLiteral",
				"isUndefined",
				"isUnion",
				"isUniqueSymbol",
				"isUnknown",
				"isVoid",
				"mapOrSame",
				"never",
				"null",
				"number",
				"objectKeyword",
				"resolve",
				"resolveAt",
				"resolveDescription",
				"resolveIdentifier",
				"resolveTitle",
				"string",
				"symbol",
				"toEncoded",
				"toType",
				"undefined",
				"unknown",
				"void"
			]
		}
	],
	"SchemaBinary": [
		{
			"moduleSpecifier": "effect/unstable/encoding",
			"importKind": "named",
			"importedName": "SchemaBinary",
			"localName": "SchemaBinary",
			"typeOnly": false,
			"members": [
				"Encoder",
				"Options",
				"Parser",
				"StreamOptions",
				"decode",
				"duplex",
				"encode",
				"encoder",
				"fieldId",
				"parser",
				"toCodec"
			]
		}
	],
	"SchemaCompiler": [
		{
			"moduleSpecifier": "effect/unstable/schema",
			"importKind": "named",
			"importedName": "SchemaCompiler",
			"localName": "SchemaCompiler",
			"typeOnly": false,
			"members": [
				"CompiledDecoder",
				"Decode",
				"DecodeEffect",
				"Is",
				"Make",
				"MakeEffect",
				"invalid",
				"missing",
				"set"
			]
		}
	],
	"SchemaGetter": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "SchemaGetter",
			"localName": "SchemaGetter",
			"typeOnly": false,
			"members": [
				"BigInt",
				"Boolean",
				"Date",
				"Getter",
				"JsonReplacer",
				"Number",
				"Passthrough",
				"String",
				"Transform",
				"TransformEffect",
				"TransformOptional",
				"TransformOptionalEffect",
				"camelToSnake",
				"capitalize",
				"checkEffect",
				"collectBracketPathEntries",
				"compose",
				"dateTimeUtcFromInput",
				"decodeBase64",
				"decodeBase64String",
				"decodeBase64Url",
				"decodeBase64UrlString",
				"decodeFormData",
				"decodeHex",
				"decodeHexString",
				"decodeURLSearchParams",
				"decodeUriComponent",
				"encodeBase64",
				"encodeBase64Url",
				"encodeFormData",
				"encodeHex",
				"encodeURLSearchParams",
				"encodeUriComponent",
				"fail",
				"forbidden",
				"forbiddenEncoding",
				"joinKeyValue",
				"makeTreeRecord",
				"map",
				"omit",
				"parseJson",
				"passthrough",
				"passthroughSubtype",
				"passthroughSupertype",
				"required",
				"run",
				"snakeToCamel",
				"split",
				"splitKeyValue",
				"stringifyJson",
				"succeed",
				"toLowerCase",
				"toUpperCase",
				"transform",
				"transformEffect",
				"transformOptional",
				"transformOptionalEffect",
				"trim",
				"uncapitalize",
				"withDefault"
			]
		}
	],
	"SchemaIssue": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "SchemaIssue",
			"localName": "SchemaIssue",
			"typeOnly": false,
			"members": [
				"AnyOf",
				"CheckHook",
				"Composite",
				"Encoding",
				"Filter",
				"Forbidden",
				"Formatter",
				"InvalidType",
				"InvalidValue",
				"Issue",
				"Leaf",
				"LeafHook",
				"MissingKey",
				"OneOf",
				"Pointer",
				"UnexpectedKey",
				"defaultCheckHook",
				"defaultLeafHook",
				"hasInput",
				"isIssue",
				"makeFormatterDefault",
				"makeFormatterStandardSchemaV1"
			]
		}
	],
	"SchemaJITCompiler": [
		{
			"moduleSpecifier": "effect/unstable/schema",
			"importKind": "named",
			"importedName": "SchemaJITCompiler",
			"localName": "SchemaJITCompiler",
			"typeOnly": false,
			"members": [
				"enable"
			]
		}
	],
	"SchemaParser": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "SchemaParser",
			"localName": "SchemaParser",
			"typeOnly": false,
			"members": [
				"asserts",
				"decodeEffect",
				"decodeExit",
				"decodePromise",
				"decodeResult",
				"decodeSync",
				"decodeUnknownEffect",
				"decodeUnknownExit",
				"decodeUnknownPromise",
				"decodeUnknownResult",
				"decodeUnknownSync",
				"encodeEffect",
				"encodeExit",
				"encodePromise",
				"encodeResult",
				"encodeSync",
				"encodeUnknownEffect",
				"encodeUnknownExit",
				"encodeUnknownPromise",
				"encodeUnknownResult",
				"encodeUnknownSync",
				"is",
				"make",
				"makeEffect",
				"makeOption"
			]
		}
	],
	"SchemaRepresentation": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "SchemaRepresentation",
			"localName": "SchemaRepresentation",
			"typeOnly": false,
			"members": [
				"Any",
				"AnyReviver",
				"Arrays",
				"Artifact",
				"BigDecimalReviver",
				"BigInt",
				"Boolean",
				"ByteSizeReviver",
				"CauseReasonReviver",
				"CauseReviver",
				"Check",
				"CheckRepresentationAnnotation",
				"CheckReviver",
				"ChunkReviver",
				"Code",
				"CodeDocument",
				"DateReviver",
				"DateTimeUtcReviver",
				"DateTimeZonedReviver",
				"Declaration",
				"DeclarationReviver",
				"Document",
				"DurationReviver",
				"Element",
				"Enum",
				"ErrorInstanceReviver",
				"ExitReviver",
				"FileReviver",
				"Filter",
				"FilterGroup",
				"FilterGroupReviver",
				"FilterReviver",
				"FormDataReviver",
				"FromJsonSchemaOptions",
				"Generation",
				"GraphReviver",
				"HashMapReviver",
				"HashSetReviver",
				"IndexSignature",
				"JsonReviver",
				"Literal",
				"MultiDocument",
				"MutableJsonReviver",
				"Never",
				"Null",
				"Number",
				"ObjectKeyword",
				"Objects",
				"OptionReviver",
				"PropertySignature",
				"ReadonlyMapReviver",
				"ReadonlySetReviver",
				"RedactedReviver",
				"Reference",
				"ReferencePolicy",
				"ReferencePolicyInput",
				"References",
				"RegExpReviver",
				"Representation",
				"RepresentationAnnotation",
				"ResultReviver",
				"Reviver",
				"String",
				"Suspend",
				"Symbol",
				"TemplateLiteral",
				"TimeZoneNamedReviver",
				"TimeZoneOffsetReviver",
				"TimeZoneReviver",
				"ToJsonSchema",
				"ToRepresentationOptions",
				"URLReviver",
				"URLSearchParamsReviver",
				"Uint8ArrayReviver",
				"Undefined",
				"Union",
				"UniqueSymbol",
				"Unknown",
				"Void",
				"fromJson",
				"fromJsonMultiDocument",
				"fromJsonSchemaDocument",
				"fromJsonSchemaMultiDocument",
				"fromRepresentation",
				"fromRepresentations",
				"isBase64Reviver",
				"isBase64UrlReviver",
				"isBetweenBigIntReviver",
				"isBetweenDateReviver",
				"isBetweenReviver",
				"isCapitalizedReviver",
				"isEndsWithReviver",
				"isFiniteReviver",
				"isGUIDReviver",
				"isGreaterThanBigIntReviver",
				"isGreaterThanDateReviver",
				"isGreaterThanOrEqualToBigIntReviver",
				"isGreaterThanOrEqualToDateReviver",
				"isGreaterThanOrEqualToReviver",
				"isGreaterThanReviver",
				"isIncludesReviver",
				"isIntReviver",
				"isLengthBetweenReviver",
				"isLessThanBigIntReviver",
				"isLessThanDateReviver",
				"isLessThanOrEqualToBigIntReviver",
				"isLessThanOrEqualToDateReviver",
				"isLessThanOrEqualToReviver",
				"isLessThanReviver",
				"isLowercasedReviver",
				"isMaxLengthReviver",
				"isMaxPropertiesReviver",
				"isMaxSizeReviver",
				"isMinLengthReviver",
				"isMinPropertiesReviver",
				"isMinSizeReviver",
				"isMultipleOfReviver",
				"isPatternReviver",
				"isPropertiesLengthBetweenReviver",
				"isPropertyNamesReviver",
				"isSizeBetweenReviver",
				"isStartsWithReviver",
				"isStringBigIntReviver",
				"isStringFiniteReviver",
				"isStringSymbolReviver",
				"isTrimmedReviver",
				"isULIDReviver",
				"isUUIDReviver",
				"isUncapitalizedReviver",
				"isUniqueKeyReviver",
				"isUniqueReviver",
				"isUppercasedReviver",
				"makeCode",
				"makeReviverDeclaration",
				"makeReviverFilter",
				"makeReviverFilterGroup",
				"toCodeDocument",
				"toJson",
				"toJsonMultiDocument",
				"toJsonSchemaDocument",
				"toJsonSchemaMultiDocument",
				"toMultiDocument",
				"toRepresentation",
				"toRepresentations"
			]
		}
	],
	"SchemaTransformation": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "SchemaTransformation",
			"localName": "SchemaTransformation",
			"typeOnly": false,
			"members": [
				"Middleware",
				"Transformation",
				"bigDecimalFromString",
				"bigintFromString",
				"byteSizeFromBigInt",
				"byteSizeFromNumber",
				"byteSizeFromString",
				"capitalize",
				"composeTransformation",
				"dateFromMillis",
				"dateFromString",
				"dateTimeUtcFromString",
				"dateTimeZonedFromString",
				"durationFromMillis",
				"durationFromNanos",
				"durationFromString",
				"fromFormData",
				"fromJsonString",
				"fromURLSearchParams",
				"isTransformation",
				"makeTransformation",
				"numberFromString",
				"optionFromNullOr",
				"optionFromNullishOr",
				"optionFromOptional",
				"optionFromOptionalKey",
				"optionFromUndefinedOr",
				"passthrough",
				"passthroughSubtype",
				"passthroughSupertype",
				"snakeToCamel",
				"splitKeyValue",
				"stringFromBase64String",
				"stringFromBase64UrlString",
				"stringFromHexString",
				"stringFromUriComponent",
				"timeZoneFromString",
				"timeZoneNamedFromString",
				"timeZoneOffsetFromNumber",
				"toLowerCase",
				"toUpperCase",
				"transform",
				"transformEffect",
				"transformOptional",
				"trim",
				"uint8ArrayFromBase64String",
				"uncapitalize",
				"urlFromString"
			]
		}
	],
	"Scope": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Scope",
			"localName": "Scope",
			"typeOnly": false,
			"members": [
				"Closeable",
				"Scope",
				"State",
				"addFinalizer",
				"addFinalizerExit",
				"close",
				"closeUnsafe",
				"fork",
				"forkUnsafe",
				"make",
				"makeUnsafe",
				"provide",
				"use"
			]
		}
	],
	"ScopedCache": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "ScopedCache",
			"localName": "ScopedCache",
			"typeOnly": false,
			"members": [
				"Entry",
				"ScopedCache",
				"State",
				"entries",
				"get",
				"getOption",
				"getSuccess",
				"has",
				"invalidate",
				"invalidateAll",
				"invalidateWhen",
				"keys",
				"make",
				"makeWith",
				"refresh",
				"set",
				"size",
				"values"
			]
		}
	],
	"ScopedRef": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "ScopedRef",
			"localName": "ScopedRef",
			"typeOnly": false,
			"members": [
				"ScopedRef",
				"fromAcquire",
				"get",
				"getUnsafe",
				"make",
				"set"
			]
		}
	],
	"Semaphore": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Semaphore",
			"localName": "Semaphore",
			"typeOnly": false,
			"members": [
				"Semaphore",
				"make",
				"makeUnsafe",
				"release",
				"releaseAll",
				"resize",
				"take",
				"takeIfAvailable",
				"withPermit",
				"withPermits",
				"withPermitsIfAvailable"
			]
		}
	],
	"SerializedConfig": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SerializedConfig",
			"localName": "SerializedConfig",
			"typeOnly": false
		}
	],
	"SerializedCoverageConfig": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SerializedCoverageConfig",
			"localName": "SerializedCoverageConfig",
			"typeOnly": false
		}
	],
	"SerializedError": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SerializedError",
			"localName": "SerializedError",
			"typeOnly": false
		}
	],
	"SerializedRootConfig": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SerializedRootConfig",
			"localName": "SerializedRootConfig",
			"typeOnly": false
		}
	],
	"SerializedTestSpecification": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SerializedTestSpecification",
			"localName": "SerializedTestSpecification",
			"typeOnly": false
		}
	],
	"ShardId": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "ShardId",
			"localName": "ShardId",
			"typeOnly": false,
			"members": [
				"ShardId",
				"fromString",
				"fromStringEncoded",
				"isShardId",
				"make",
				"toString"
			]
		}
	],
	"Sharding": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "Sharding",
			"localName": "Sharding",
			"typeOnly": false,
			"members": [
				"Sharding",
				"layer"
			]
		}
	],
	"ShardingConfig": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "ShardingConfig",
			"localName": "ShardingConfig",
			"typeOnly": false,
			"members": [
				"ShardingConfig",
				"config",
				"configFromEnv",
				"defaults",
				"layer",
				"layerDefaults",
				"layerFromEnv",
				"shardGroupConfig"
			]
		}
	],
	"ShardingRegistrationEvent": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "ShardingRegistrationEvent",
			"localName": "ShardingRegistrationEvent",
			"typeOnly": false,
			"members": [
				"EntityRegistered",
				"ShardingRegistrationEvent",
				"SingletonRegistered",
				"match"
			]
		}
	],
	"should": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "should",
			"localName": "should",
			"typeOnly": false
		}
	],
	"SingleRunner": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "SingleRunner",
			"localName": "SingleRunner",
			"typeOnly": false,
			"members": [
				"layer"
			]
		}
	],
	"Singleton": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "Singleton",
			"localName": "Singleton",
			"typeOnly": false,
			"members": [
				"make"
			]
		}
	],
	"SingletonAddress": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "SingletonAddress",
			"localName": "SingletonAddress",
			"typeOnly": false,
			"members": [
				"SingletonAddress"
			]
		}
	],
	"Sink": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Sink",
			"localName": "Sink",
			"typeOnly": false,
			"members": [
				"End",
				"Sink",
				"SinkUnify",
				"SinkUnifyIgnore",
				"as",
				"catch",
				"catchCause",
				"collect",
				"count",
				"die",
				"drain",
				"ensuring",
				"every",
				"fail",
				"failCause",
				"failCauseSync",
				"failSync",
				"find",
				"findEffect",
				"flatMap",
				"fold",
				"foldArray",
				"foldUntil",
				"forEach",
				"forEachArray",
				"forEachWhile",
				"forEachWhileArray",
				"fromChannel",
				"fromEffect",
				"fromEffectEnd",
				"fromPubSub",
				"fromQueue",
				"fromTransform",
				"fromWritableStream",
				"head",
				"ignoreLeftover",
				"isSink",
				"last",
				"make",
				"map",
				"mapEffect",
				"mapEffectEnd",
				"mapEnd",
				"mapError",
				"mapInput",
				"mapInputArray",
				"mapInputArrayEffect",
				"mapInputEffect",
				"mapLeftover",
				"never",
				"onExit",
				"orElse",
				"provideContext",
				"provideService",
				"reduce",
				"reduceArray",
				"reduceEffect",
				"reduceWhile",
				"reduceWhileArray",
				"reduceWhileArrayEffect",
				"reduceWhileEffect",
				"some",
				"succeed",
				"sum",
				"summarized",
				"suspend",
				"sync",
				"take",
				"takeUntil",
				"takeUntilEffect",
				"takeWhile",
				"takeWhileEffect",
				"takeWhileFilter",
				"takeWhileFilterEffect",
				"timed",
				"toChannel",
				"unwrap",
				"withDuration"
			]
		}
	],
	"SnapshotData": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SnapshotData",
			"localName": "SnapshotData",
			"typeOnly": false
		}
	],
	"SnapshotMatchOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SnapshotMatchOptions",
			"localName": "SnapshotMatchOptions",
			"typeOnly": false
		}
	],
	"SnapshotResult": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SnapshotResult",
			"localName": "SnapshotResult",
			"typeOnly": false
		}
	],
	"Snapshots": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "Snapshots",
			"localName": "Snapshots",
			"typeOnly": false
		}
	],
	"SnapshotSerializer": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SnapshotSerializer",
			"localName": "SnapshotSerializer",
			"typeOnly": false
		}
	],
	"SnapshotStateOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SnapshotStateOptions",
			"localName": "SnapshotStateOptions",
			"typeOnly": false
		}
	],
	"SnapshotSummary": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SnapshotSummary",
			"localName": "SnapshotSummary",
			"typeOnly": false
		}
	],
	"SnapshotUpdateState": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SnapshotUpdateState",
			"localName": "SnapshotUpdateState",
			"typeOnly": false
		}
	],
	"Snowflake": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "Snowflake",
			"localName": "Snowflake",
			"typeOnly": false,
			"members": [
				"Generator",
				"Snowflake",
				"SnowflakeFromBigInt",
				"SnowflakeFromString",
				"TypeId",
				"constEpochMillis",
				"dateTime",
				"layerGenerator",
				"machineId",
				"make",
				"makeGenerator",
				"sequence",
				"timestamp",
				"toParts"
			]
		}
	],
	"Socket": [
		{
			"moduleSpecifier": "effect/unstable/socket",
			"importKind": "named",
			"importedName": "Socket",
			"localName": "Socket",
			"typeOnly": false,
			"members": [
				"CloseEvent",
				"InputTransformStream",
				"Reader",
				"Socket",
				"SocketCloseError",
				"SocketError",
				"SocketErrorReason",
				"SocketErrorTypeId",
				"SocketOpenError",
				"SocketReadError",
				"SocketUpgradeError",
				"SocketWriteError",
				"TlsUpgradeOptions",
				"TypeId",
				"WebSocket",
				"WebSocketClientOptions",
				"WebSocketConstructor",
				"WebSocketConstructorOptions",
				"WebSocketEvent",
				"WebSocketLike",
				"Writer",
				"fromTransformStream",
				"fromWebSocket",
				"isCloseEvent",
				"isSocket",
				"isSocketError",
				"layerWebSocket",
				"layerWebSocketConstructorGlobal",
				"make",
				"makeChannel",
				"makeWebSocket",
				"makeWebSocketChannel",
				"readerBytes",
				"readerString",
				"toChannel",
				"toChannelString",
				"toChannelWith",
				"toStream"
			]
		}
	],
	"SocketRunner": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "SocketRunner",
			"localName": "SocketRunner",
			"typeOnly": false,
			"members": [
				"layer",
				"layerClientOnly"
			]
		}
	],
	"SocketServer": [
		{
			"moduleSpecifier": "effect/unstable/socket",
			"importKind": "named",
			"importedName": "SocketServer",
			"localName": "SocketServer",
			"typeOnly": false,
			"members": [
				"ErrorTypeId",
				"SocketServer",
				"SocketServerError",
				"SocketServerErrorReason",
				"SocketServerOpenError",
				"SocketServerUnknownError"
			]
		}
	],
	"spreadElementsInto": [
		{
			"moduleSpecifier": "@effect/openapi-generator/Utils",
			"importKind": "named",
			"importedName": "spreadElementsInto",
			"localName": "spreadElementsInto",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"SqlClient": [
		{
			"moduleSpecifier": "effect/unstable/sql",
			"importKind": "named",
			"importedName": "SqlClient",
			"localName": "SqlClient",
			"typeOnly": false,
			"members": [
				"SafeIntegers",
				"SqlClient",
				"TransactionConnection",
				"make",
				"makeWithTransaction"
			]
		}
	],
	"SqlConnection": [
		{
			"moduleSpecifier": "effect/unstable/sql",
			"importKind": "named",
			"importedName": "SqlConnection",
			"localName": "SqlConnection",
			"typeOnly": false,
			"members": [
				"Acquirer",
				"Borrower",
				"Connection",
				"Row"
			]
		}
	],
	"SqlError": [
		{
			"moduleSpecifier": "effect/unstable/sql",
			"importKind": "named",
			"importedName": "SqlError",
			"localName": "SqlError",
			"typeOnly": false,
			"members": [
				"AuthenticationError",
				"AuthorizationError",
				"ConnectionError",
				"ConstraintError",
				"DeadlockError",
				"LockTimeoutError",
				"ResultLengthMismatch",
				"SerializationError",
				"SqlError",
				"SqlErrorReason",
				"SqlSyntaxError",
				"StatementTimeoutError",
				"UniqueViolation",
				"UnknownError",
				"classifySqliteError",
				"isSqlError",
				"isSqlErrorReason"
			]
		}
	],
	"SqlEventJournal": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "SqlEventJournal",
			"localName": "SqlEventJournal",
			"typeOnly": false,
			"members": [
				"layer",
				"make"
			]
		}
	],
	"SqlEventLogServerEncrypted": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "SqlEventLogServerEncrypted",
			"localName": "SqlEventLogServerEncrypted",
			"typeOnly": false,
			"members": [
				"layerStorage",
				"layerStorageSubtle",
				"makeStorage"
			]
		}
	],
	"SqlEventLogServerUnencrypted": [
		{
			"moduleSpecifier": "effect/unstable/eventlog",
			"importKind": "named",
			"importedName": "SqlEventLogServerUnencrypted",
			"localName": "SqlEventLogServerUnencrypted",
			"typeOnly": false,
			"members": [
				"layerStorage",
				"makeStorage"
			]
		}
	],
	"SqlMessageStorage": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "SqlMessageStorage",
			"localName": "SqlMessageStorage",
			"typeOnly": false,
			"members": [
				"layer",
				"layerWith",
				"make",
				"makeEncoded"
			]
		}
	],
	"SqlModel": [
		{
			"moduleSpecifier": "effect/unstable/sql",
			"importKind": "named",
			"importedName": "SqlModel",
			"localName": "SqlModel",
			"typeOnly": false,
			"members": [
				"makeRepository",
				"makeResolvers"
			]
		}
	],
	"SqlResolver": [
		{
			"moduleSpecifier": "effect/unstable/sql",
			"importKind": "named",
			"importedName": "SqlResolver",
			"localName": "SqlResolver",
			"typeOnly": false,
			"members": [
				"SqlRequest",
				"findById",
				"grouped",
				"ordered",
				"request",
				"void"
			]
		}
	],
	"SqlRunnerStorage": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "SqlRunnerStorage",
			"localName": "SqlRunnerStorage",
			"typeOnly": false,
			"members": [
				"layer",
				"layerWith",
				"make"
			]
		}
	],
	"SqlSchema": [
		{
			"moduleSpecifier": "effect/unstable/sql",
			"importKind": "named",
			"importedName": "SqlSchema",
			"localName": "SqlSchema",
			"typeOnly": false,
			"members": [
				"findAll",
				"findNonEmpty",
				"findOne",
				"findOneOption",
				"void"
			]
		}
	],
	"SqlStream": [
		{
			"moduleSpecifier": "effect/unstable/sql",
			"importKind": "named",
			"importedName": "SqlStream",
			"localName": "SqlStream",
			"typeOnly": false,
			"members": [
				"asyncPauseResume"
			]
		}
	],
	"Sse": [
		{
			"moduleSpecifier": "effect/unstable/encoding",
			"importKind": "named",
			"importedName": "Sse",
			"localName": "Sse",
			"typeOnly": false,
			"members": [
				"AnyEvent",
				"DecodeOptions",
				"Encoder",
				"Event",
				"EventCodec",
				"EventEncoded",
				"EventTooLarge",
				"Parser",
				"Retry",
				"SseError",
				"SseErrorReason",
				"decode",
				"decodeDataSchema",
				"decodeSchema",
				"encode",
				"encodeSchema",
				"encoder",
				"makeParser",
				"transformEvent"
			]
		}
	],
	"StandardSchema": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "StandardSchema",
			"localName": "StandardSchema",
			"typeOnly": false,
			"members": [
				"StandardJSONSchemaV1",
				"StandardSchemaV1",
				"StandardTypedV1"
			]
		}
	],
	"Statement": [
		{
			"moduleSpecifier": "effect/unstable/sql",
			"importKind": "named",
			"importedName": "Statement",
			"localName": "Statement",
			"typeOnly": false,
			"members": [
				"ArrayHelper",
				"Compiler",
				"CompilerOptions",
				"Constructor",
				"CurrentTransformer",
				"Custom",
				"Dialect",
				"Fragment",
				"Helper",
				"Identifier",
				"Literal",
				"Parameter",
				"PrimitiveKind",
				"RecordInsertHelper",
				"RecordUpdateHelper",
				"RecordUpdateHelperSingle",
				"Segment",
				"SpanPropagationEnabled",
				"Statement",
				"Transformer",
				"and",
				"arrayHelper",
				"csv",
				"custom",
				"defaultEscape",
				"defaultTransforms",
				"fragment",
				"identifier",
				"isCustom",
				"isFragment",
				"join",
				"literal",
				"make",
				"makeCompiler",
				"makeCompilerSqlite",
				"or",
				"parameter",
				"primitiveKind",
				"recordInsertHelper",
				"recordUpdateHelper",
				"recordUpdateHelperSingle",
				"statement"
			]
		}
	],
	"Stdio": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Stdio",
			"localName": "Stdio",
			"typeOnly": false,
			"members": [
				"Stdio",
				"TypeId",
				"layerTest",
				"make"
			]
		}
	],
	"Stream": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Stream",
			"localName": "Stream",
			"typeOnly": false,
			"members": [
				"DefaultChunkSize",
				"Do",
				"Error",
				"EventListener",
				"HaltStrategy",
				"Services",
				"Stream",
				"StreamTypeLambda",
				"StreamUnify",
				"StreamUnifyIgnore",
				"Success",
				"TypeId",
				"Variance",
				"VarianceStruct",
				"accumulate",
				"aggregate",
				"aggregateWithin",
				"as",
				"bind",
				"bindEffect",
				"bindTo",
				"broadcast",
				"broadcastN",
				"buffer",
				"bufferArray",
				"callback",
				"catch",
				"catchCause",
				"catchCauseFilter",
				"catchCauseIf",
				"catchDefect",
				"catchFilter",
				"catchIf",
				"catchReason",
				"catchReasons",
				"catchTag",
				"catchTags",
				"changes",
				"changesWith",
				"changesWithEffect",
				"chunks",
				"collect",
				"combine",
				"combineArray",
				"concat",
				"cross",
				"crossWith",
				"debounce",
				"decodeText",
				"die",
				"drain",
				"drainFork",
				"drop",
				"dropRight",
				"dropUntil",
				"dropUntilEffect",
				"dropWhile",
				"dropWhileEffect",
				"dropWhileFilter",
				"empty",
				"encodeText",
				"ensuring",
				"fail",
				"failCause",
				"failCauseSync",
				"failSync",
				"filter",
				"filterEffect",
				"filterMap",
				"filterMapEffect",
				"flatMap",
				"flatten",
				"flattenArray",
				"flattenEffect",
				"flattenIterable",
				"flattenTake",
				"forever",
				"fromArray",
				"fromArrayEffect",
				"fromArrays",
				"fromAsyncIterable",
				"fromChannel",
				"fromEffect",
				"fromEffectDrain",
				"fromEffectRepeat",
				"fromEffectSchedule",
				"fromEventListener",
				"fromIterable",
				"fromIterableEffect",
				"fromIterableEffectRepeat",
				"fromIteratorSucceed",
				"fromPubSub",
				"fromPubSubTake",
				"fromPull",
				"fromQueue",
				"fromReadableStream",
				"fromSchedule",
				"fromSubscription",
				"groupAdjacentBy",
				"groupBy",
				"groupByKey",
				"grouped",
				"groupedWithin",
				"haltWhen",
				"ignore",
				"ignoreCause",
				"interleave",
				"interleaveWith",
				"interruptWhen",
				"intersperse",
				"intersperseAffixes",
				"isStream",
				"iterate",
				"let",
				"limitBytes",
				"make",
				"map",
				"mapAccum",
				"mapAccumArray",
				"mapAccumArrayEffect",
				"mapAccumEffect",
				"mapArray",
				"mapArrayEffect",
				"mapBoth",
				"mapEffect",
				"mapError",
				"merge",
				"mergeAll",
				"mergeEffect",
				"mergeLeft",
				"mergeResult",
				"mergeRight",
				"mkArrayBuffer",
				"mkString",
				"mkUint8Array",
				"never",
				"onEnd",
				"onError",
				"onExit",
				"onFirst",
				"onStart",
				"orDie",
				"orElseIfEmpty",
				"orElseSucceed",
				"paginate",
				"partition",
				"partitionEffect",
				"partitionQueue",
				"peel",
				"pipeThrough",
				"pipeThroughChannel",
				"pipeThroughChannelOrFail",
				"prepend",
				"provide",
				"provideContext",
				"provideService",
				"provideServiceEffect",
				"race",
				"raceAll",
				"range",
				"rechunk",
				"repeat",
				"repeatElements",
				"result",
				"retry",
				"run",
				"runCollect",
				"runCount",
				"runDrain",
				"runFold",
				"runFoldEffect",
				"runForEach",
				"runForEachArray",
				"runForEachWhile",
				"runHead",
				"runIntoPubSub",
				"runIntoQueue",
				"runLast",
				"runSum",
				"scan",
				"scanEffect",
				"schedule",
				"scoped",
				"service",
				"serviceOption",
				"share",
				"sliding",
				"slidingSize",
				"split",
				"splitLines",
				"succeed",
				"suspend",
				"switchMap",
				"sync",
				"take",
				"takeRight",
				"takeUntil",
				"takeUntilEffect",
				"takeWhile",
				"takeWhileEffect",
				"takeWhileFilter",
				"tap",
				"tapBoth",
				"tapCause",
				"tapDefect",
				"tapError",
				"tapErrorTag",
				"tapSink",
				"throttle",
				"throttleEffect",
				"tick",
				"timeout",
				"timeoutOrElse",
				"toAsyncIterable",
				"toAsyncIterableEffect",
				"toAsyncIterableWith",
				"toChannel",
				"toPubSub",
				"toPubSubTake",
				"toPull",
				"toQueue",
				"toReadableStream",
				"toReadableStreamEffect",
				"toReadableStreamWith",
				"transduce",
				"transformPull",
				"transformPullBracket",
				"unfold",
				"unwrap",
				"unwrapReason",
				"updateContext",
				"updateService",
				"when",
				"withExecutionPlan",
				"withSpan",
				"zip",
				"zipFlatten",
				"zipLatest",
				"zipLatestAll",
				"zipLatestWith",
				"zipLeft",
				"zipRight",
				"zipWith",
				"zipWithArray",
				"zipWithIndex",
				"zipWithNext",
				"zipWithPrevious",
				"zipWithPreviousAndNext"
			]
		}
	],
	"String": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "String",
			"localName": "String",
			"typeOnly": false,
			"members": [
				"Concat",
				"Equivalence",
				"Order",
				"ReducerConcat",
				"String",
				"Trim",
				"TrimEnd",
				"TrimStart",
				"at",
				"camelCase",
				"camelToSnake",
				"capitalize",
				"charAt",
				"charCodeAt",
				"codePointAt",
				"concat",
				"configCase",
				"constantCase",
				"empty",
				"endsWith",
				"includes",
				"indexOf",
				"isEmpty",
				"isNonEmpty",
				"isString",
				"kebabCase",
				"kebabToSnake",
				"lastIndexOf",
				"length",
				"linesIterator",
				"linesWithSeparators",
				"localeCompare",
				"match",
				"matchAll",
				"noCase",
				"normalize",
				"padEnd",
				"padStart",
				"pascalCase",
				"pascalToSnake",
				"repeat",
				"replace",
				"replaceAll",
				"search",
				"slice",
				"snakeCase",
				"snakeToCamel",
				"snakeToKebab",
				"snakeToPascal",
				"split",
				"startsWith",
				"stripMargin",
				"stripMarginWith",
				"substring",
				"takeLeft",
				"takeRight",
				"toLocaleLowerCase",
				"toLocaleUpperCase",
				"toLowerCase",
				"toUpperCase",
				"trim",
				"trimEnd",
				"trimStart",
				"uncapitalize"
			]
		}
	],
	"Struct": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Struct",
			"localName": "Struct",
			"typeOnly": false,
			"members": [
				"Apply",
				"Assign",
				"Lambda",
				"Mutable",
				"Record",
				"Simplify",
				"assign",
				"evolve",
				"evolveEntries",
				"evolveKeys",
				"get",
				"keys",
				"lambda",
				"makeCombiner",
				"makeEquivalence",
				"makeOrder",
				"makeReducer",
				"map",
				"mapOmit",
				"mapPick",
				"omit",
				"pick",
				"renameKeys"
			]
		}
	],
	"SubscriptionRef": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "SubscriptionRef",
			"localName": "SubscriptionRef",
			"typeOnly": false,
			"members": [
				"SubscriptionRef",
				"changes",
				"get",
				"getAndSet",
				"getAndUpdate",
				"getAndUpdateEffect",
				"getAndUpdateSome",
				"getAndUpdateSomeEffect",
				"getUnsafe",
				"isSubscriptionRef",
				"make",
				"modify",
				"modifyEffect",
				"modifySome",
				"modifySomeEffect",
				"set",
				"setAndGet",
				"update",
				"updateAndGet",
				"updateAndGetEffect",
				"updateEffect",
				"updateSome",
				"updateSomeAndGet",
				"updateSomeAndGetEffect",
				"updateSomeEffect"
			]
		}
	],
	"suite": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "suite",
			"localName": "suite",
			"typeOnly": false
		}
	],
	"SuiteAPI": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SuiteAPI",
			"localName": "SuiteAPI",
			"typeOnly": false
		}
	],
	"SuiteCollector": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SuiteCollector",
			"localName": "SuiteCollector",
			"typeOnly": false
		}
	],
	"SuiteFactory": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SuiteFactory",
			"localName": "SuiteFactory",
			"typeOnly": false
		}
	],
	"SuiteOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SuiteOptions",
			"localName": "SuiteOptions",
			"typeOnly": false
		}
	],
	"Symbol": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Symbol",
			"localName": "Symbol",
			"typeOnly": false,
			"members": [
				"isSymbol"
			]
		}
	],
	"SynchronizedRef": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "SynchronizedRef",
			"localName": "SynchronizedRef",
			"typeOnly": false,
			"members": [
				"SynchronizedRef",
				"get",
				"getAndSet",
				"getAndUpdate",
				"getAndUpdateEffect",
				"getAndUpdateSome",
				"getAndUpdateSomeEffect",
				"getUnsafe",
				"make",
				"makeUnsafe",
				"modify",
				"modifyEffect",
				"modifySome",
				"modifySomeEffect",
				"set",
				"setAndGet",
				"update",
				"updateAndGet",
				"updateAndGetEffect",
				"updateEffect",
				"updateSome",
				"updateSomeAndGet",
				"updateSomeAndGetEffect",
				"updateSomeEffect"
			]
		}
	],
	"SyncMatcherResult": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "SyncMatcherResult",
			"localName": "SyncMatcherResult",
			"typeOnly": false
		}
	],
	"Take": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Take",
			"localName": "Take",
			"typeOnly": false,
			"members": [
				"Take",
				"toPull"
			]
		}
	],
	"TaskCustomOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TaskCustomOptions",
			"localName": "TaskCustomOptions",
			"typeOnly": false
		}
	],
	"TaskMeta": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TaskMeta",
			"localName": "TaskMeta",
			"typeOnly": false
		}
	],
	"TaskState": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TaskState",
			"localName": "TaskState",
			"typeOnly": false
		}
	],
	"Telemetry": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "Telemetry",
			"localName": "Telemetry",
			"typeOnly": false,
			"members": [
				"AllAttributes",
				"AttributesWithPrefix",
				"BaseAttributes",
				"CurrentSpanTransformer",
				"FormatAttributeName",
				"GenAITelemetryAttributeOptions",
				"GenAITelemetryAttributes",
				"OperationAttributes",
				"RequestAttributes",
				"ResponseAttributes",
				"SpanTransformer",
				"TokenAttributes",
				"UsageAttributes",
				"WellKnownOperationName",
				"WellKnownSystem",
				"addGenAIAnnotations",
				"addSpanAttributes"
			]
		}
	],
	"Template": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "Template",
			"localName": "Template",
			"typeOnly": false,
			"members": [
				"Interpolated",
				"InterpolatedWithStream",
				"Primitive",
				"PrimitiveValue",
				"make",
				"stream"
			]
		}
	],
	"Terminal": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Terminal",
			"localName": "Terminal",
			"typeOnly": false,
			"members": [
				"Key",
				"QuitError",
				"Terminal",
				"UserInput",
				"isQuitError",
				"make"
			]
		}
	],
	"test": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "test",
			"localName": "test",
			"typeOnly": false
		}
	],
	"TestAnnotation": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestAnnotation",
			"localName": "TestAnnotation",
			"typeOnly": false
		}
	],
	"TestAnnotationArtifact": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestAnnotationArtifact",
			"localName": "TestAnnotationArtifact",
			"typeOnly": false
		}
	],
	"TestAnnotationLocation": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestAnnotationLocation",
			"localName": "TestAnnotationLocation",
			"typeOnly": false
		}
	],
	"TestAPI": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestAPI",
			"localName": "TestAPI",
			"typeOnly": false
		}
	],
	"TestArtifact": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestArtifact",
			"localName": "TestArtifact",
			"typeOnly": false
		}
	],
	"TestArtifactBase": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestArtifactBase",
			"localName": "TestArtifactBase",
			"typeOnly": false
		}
	],
	"TestArtifactLocation": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestArtifactLocation",
			"localName": "TestArtifactLocation",
			"typeOnly": false
		}
	],
	"TestArtifactRegistry": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestArtifactRegistry",
			"localName": "TestArtifactRegistry",
			"typeOnly": false
		}
	],
	"TestAttachment": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestAttachment",
			"localName": "TestAttachment",
			"typeOnly": false
		}
	],
	"TestBenchmark": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestBenchmark",
			"localName": "TestBenchmark",
			"typeOnly": false
		}
	],
	"TestBenchmarkTask": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestBenchmarkTask",
			"localName": "TestBenchmarkTask",
			"typeOnly": false
		}
	],
	"TestClock": [
		{
			"moduleSpecifier": "effect/testing",
			"importKind": "named",
			"importedName": "TestClock",
			"localName": "TestClock",
			"typeOnly": false,
			"members": [
				"TestClock",
				"adjust",
				"layer",
				"make",
				"setTime",
				"testClockWith",
				"withLive"
			]
		}
	],
	"TestConsole": [
		{
			"moduleSpecifier": "effect/testing",
			"importKind": "named",
			"importedName": "TestConsole",
			"localName": "TestConsole",
			"typeOnly": false,
			"members": [
				"TestConsole",
				"errorLines",
				"layer",
				"logLines",
				"make",
				"testConsoleWith"
			]
		}
	],
	"TestContext": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestContext",
			"localName": "TestContext",
			"typeOnly": false
		}
	],
	"TestError": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestError",
			"localName": "TestError",
			"typeOnly": false
		}
	],
	"TestExecutionMethod": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestExecutionMethod",
			"localName": "TestExecutionMethod",
			"typeOnly": false
		}
	],
	"TestFunction": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestFunction",
			"localName": "TestFunction",
			"typeOnly": false
		}
	],
	"TestOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestOptions",
			"localName": "TestOptions",
			"typeOnly": false
		}
	],
	"TestRunner": [
		{
			"moduleSpecifier": "effect/unstable/cluster",
			"importKind": "named",
			"importedName": "TestRunner",
			"localName": "TestRunner",
			"typeOnly": false,
			"members": [
				"layer"
			]
		},
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestRunner",
			"localName": "TestRunner",
			"typeOnly": false
		}
	],
	"TestRunnerConfig": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestRunnerConfig",
			"localName": "TestRunnerConfig",
			"typeOnly": false
		}
	],
	"TestSchema": [
		{
			"moduleSpecifier": "effect/testing",
			"importKind": "named",
			"importedName": "TestSchema",
			"localName": "TestSchema",
			"typeOnly": false,
			"members": [
				"Asserts",
				"Decoding",
				"Encoding"
			]
		}
	],
	"TestTagDefinition": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestTagDefinition",
			"localName": "TestTagDefinition",
			"typeOnly": false
		}
	],
	"TestTags": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestTags",
			"localName": "TestTags",
			"typeOnly": false
		}
	],
	"TestTryOptions": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TestTryOptions",
			"localName": "TestTryOptions",
			"typeOnly": false
		}
	],
	"toComment": [
		{
			"moduleSpecifier": "@effect/openapi-generator/Utils",
			"importKind": "named",
			"importedName": "toComment",
			"localName": "toComment",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"toImplementation": [
		{
			"moduleSpecifier": "@effect/openapi-generator/HttpApiTransformer",
			"importKind": "named",
			"importedName": "toImplementation",
			"localName": "toImplementation",
			"typeOnly": false,
			"plainModule": true
		}
	],
	"Tokenizer": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "Tokenizer",
			"localName": "Tokenizer",
			"typeOnly": false,
			"members": [
				"Service",
				"Tokenizer",
				"make"
			]
		}
	],
	"Toml": [
		{
			"moduleSpecifier": "effect/unstable/encoding",
			"importKind": "named",
			"importedName": "Toml",
			"localName": "Toml",
			"typeOnly": false,
			"members": [
				"parse"
			]
		}
	],
	"Tool": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "Tool",
			"localName": "Tool",
			"typeOnly": false,
			"members": [
				"Any",
				"AnyDynamic",
				"AnyProviderDefined",
				"Destructive",
				"Dynamic",
				"DynamicTypeId",
				"EmptyParams",
				"ExecutionFailure",
				"Failure",
				"FailureEncoded",
				"FailureMode",
				"FailureOrigin",
				"FailureResult",
				"FailureResultEncoded",
				"Handler",
				"HandlerError",
				"HandlerOutput",
				"HandlerResult",
				"HandlerServices",
				"HandlersFor",
				"Idempotent",
				"Meta",
				"Name",
				"NameMapper",
				"NeedsApproval",
				"NeedsApprovalContext",
				"NeedsApprovalFunction",
				"OpenWorld",
				"Parameters",
				"ParametersEncoded",
				"ParametersEncodingServices",
				"ParametersSchema",
				"ProviderDefined",
				"ProviderDefinedTypeId",
				"Readonly",
				"RequiresHandler",
				"Result",
				"ResultDecodingServices",
				"ResultEncoded",
				"ResultEncodingServices",
				"Strict",
				"Success",
				"SuccessEncoded",
				"SuccessSchema",
				"Title",
				"Tool",
				"TypeId",
				"dynamic",
				"failureResultSchema",
				"getDescription",
				"getJsonSchema",
				"getJsonSchemaFromSchema",
				"getStrictMode",
				"isDynamic",
				"isProviderDefined",
				"isUserDefined",
				"make",
				"providerDefined",
				"unsafeSecureJsonParse"
			]
		}
	],
	"Toolkit": [
		{
			"moduleSpecifier": "effect/unstable/ai",
			"importKind": "named",
			"importedName": "Toolkit",
			"localName": "Toolkit",
			"typeOnly": false,
			"members": [
				"Any",
				"FailureOrigin",
				"HandlerContext",
				"HandlersFrom",
				"MergeRecords",
				"MergedTools",
				"SimplifyRecord",
				"Toolkit",
				"Tools",
				"ToolsByName",
				"WithHandler",
				"WithHandlerTools",
				"empty",
				"make",
				"merge"
			]
		}
	],
	"Tracer": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Tracer",
			"localName": "Tracer",
			"typeOnly": false,
			"members": [
				"AnySpan",
				"CurrentTraceLevel",
				"DisablePropagation",
				"EffectPrimitive",
				"ExternalSpan",
				"MinimumTraceLevel",
				"NativeSpan",
				"ParentSpan",
				"ParentSpanKey",
				"Span",
				"SpanKind",
				"SpanLink",
				"SpanOptions",
				"SpanOptionsNoTrace",
				"SpanStatus",
				"TraceOptions",
				"Tracer",
				"TracerKey",
				"externalSpan",
				"make",
				"nativeTracer"
			]
		}
	],
	"Transferable": [
		{
			"moduleSpecifier": "effect/unstable/workers",
			"importKind": "named",
			"importedName": "Transferable",
			"localName": "Transferable",
			"typeOnly": false,
			"members": [
				"Collector",
				"ImageData",
				"MessagePort",
				"Transferable",
				"Uint8Array",
				"addAll",
				"getterAddAll",
				"makeCollector",
				"makeCollectorUnsafe",
				"schema"
			]
		}
	],
	"TransformResultWithSource": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "TransformResultWithSource",
			"localName": "TransformResultWithSource",
			"typeOnly": false
		}
	],
	"Trie": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Trie",
			"localName": "Trie",
			"typeOnly": false,
			"members": [
				"Trie",
				"compact",
				"empty",
				"entries",
				"entriesWithPrefix",
				"filter",
				"filterMap",
				"forEach",
				"fromIterable",
				"get",
				"getUnsafe",
				"has",
				"insert",
				"insertMany",
				"isEmpty",
				"keys",
				"keysWithPrefix",
				"longestPrefixOf",
				"make",
				"map",
				"modify",
				"reduce",
				"remove",
				"removeMany",
				"size",
				"toEntries",
				"toEntriesWithPrefix",
				"values",
				"valuesWithPrefix"
			]
		}
	],
	"Tuple": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Tuple",
			"localName": "Tuple",
			"typeOnly": false,
			"members": [
				"appendElement",
				"appendElements",
				"evolve",
				"get",
				"isTupleOf",
				"isTupleOfAtLeast",
				"make",
				"makeCombiner",
				"makeEquivalence",
				"makeOrder",
				"makeReducer",
				"map",
				"mapOmit",
				"mapPick",
				"omit",
				"pick",
				"renameIndices"
			]
		}
	],
	"TxChunk": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxChunk",
			"localName": "TxChunk",
			"typeOnly": false,
			"members": [
				"TxChunk",
				"append",
				"appendAll",
				"concat",
				"drop",
				"empty",
				"filter",
				"fromIterable",
				"get",
				"isEmpty",
				"isNonEmpty",
				"make",
				"makeUnsafe",
				"map",
				"modify",
				"prepend",
				"prependAll",
				"set",
				"size",
				"slice",
				"take",
				"update"
			]
		}
	],
	"TxDeferred": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxDeferred",
			"localName": "TxDeferred",
			"typeOnly": false,
			"members": [
				"TxDeferred",
				"await",
				"done",
				"fail",
				"isTxDeferred",
				"make",
				"poll",
				"succeed"
			]
		}
	],
	"TxHashMap": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxHashMap",
			"localName": "TxHashMap",
			"typeOnly": false,
			"members": [
				"TxHashMap",
				"clear",
				"compact",
				"empty",
				"entries",
				"every",
				"filter",
				"filterMap",
				"findFirst",
				"flatMap",
				"forEach",
				"fromIterable",
				"get",
				"getHash",
				"has",
				"hasBy",
				"hasHash",
				"isEmpty",
				"isNonEmpty",
				"isTxHashMap",
				"keys",
				"make",
				"map",
				"modify",
				"modifyAt",
				"reduce",
				"remove",
				"removeMany",
				"set",
				"setMany",
				"size",
				"snapshot",
				"some",
				"toEntries",
				"toValues",
				"union",
				"values"
			]
		}
	],
	"TxHashSet": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxHashSet",
			"localName": "TxHashSet",
			"typeOnly": false,
			"members": [
				"TxHashSet",
				"add",
				"clear",
				"difference",
				"empty",
				"every",
				"filter",
				"fromHashSet",
				"fromIterable",
				"has",
				"intersection",
				"isEmpty",
				"isSubset",
				"isTxHashSet",
				"make",
				"map",
				"reduce",
				"remove",
				"size",
				"some",
				"toHashSet",
				"union"
			]
		}
	],
	"TxPriorityQueue": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxPriorityQueue",
			"localName": "TxPriorityQueue",
			"typeOnly": false,
			"members": [
				"TxPriorityQueue",
				"empty",
				"fromIterable",
				"isEmpty",
				"isNonEmpty",
				"isTxPriorityQueue",
				"make",
				"offer",
				"offerAll",
				"peek",
				"peekOption",
				"removeIf",
				"retainIf",
				"size",
				"take",
				"takeAll",
				"takeOption",
				"takeUpTo",
				"toArray"
			]
		}
	],
	"TxPubSub": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxPubSub",
			"localName": "TxPubSub",
			"typeOnly": false,
			"members": [
				"TxPubSub",
				"acquireSubscriber",
				"awaitShutdown",
				"bounded",
				"capacity",
				"dropping",
				"isEmpty",
				"isFull",
				"isShutdown",
				"isTxPubSub",
				"publish",
				"publishAll",
				"releaseSubscriber",
				"shutdown",
				"size",
				"sliding",
				"subscribe",
				"unbounded"
			]
		}
	],
	"TxQueue": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxQueue",
			"localName": "TxQueue",
			"typeOnly": false,
			"members": [
				"State",
				"TxDequeue",
				"TxEnqueue",
				"TxQueue",
				"TxQueueState",
				"awaitCompletion",
				"bounded",
				"clear",
				"dropping",
				"end",
				"fail",
				"failCause",
				"interrupt",
				"isClosing",
				"isDone",
				"isEmpty",
				"isFull",
				"isOpen",
				"isShutdown",
				"isTxDequeue",
				"isTxEnqueue",
				"isTxQueue",
				"offer",
				"offerAll",
				"peek",
				"poll",
				"shutdown",
				"size",
				"sliding",
				"take",
				"takeAll",
				"takeBetween",
				"takeN",
				"unbounded"
			]
		}
	],
	"TxReentrantLock": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxReentrantLock",
			"localName": "TxReentrantLock",
			"typeOnly": false,
			"members": [
				"TxReentrantLock",
				"acquireRead",
				"acquireWrite",
				"isTxReentrantLock",
				"locked",
				"make",
				"readLock",
				"readLocked",
				"readLocks",
				"releaseRead",
				"releaseWrite",
				"withLock",
				"withReadLock",
				"withWriteLock",
				"writeLock",
				"writeLocked",
				"writeLocks"
			]
		}
	],
	"TxRef": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxRef",
			"localName": "TxRef",
			"typeOnly": false,
			"members": [
				"TxRef",
				"get",
				"make",
				"makeUnsafe",
				"modify",
				"set",
				"update"
			]
		}
	],
	"TxSemaphore": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxSemaphore",
			"localName": "TxSemaphore",
			"typeOnly": false,
			"members": [
				"TxSemaphore",
				"acquire",
				"acquireN",
				"available",
				"capacity",
				"isTxSemaphore",
				"make",
				"release",
				"releaseN",
				"tryAcquire",
				"tryAcquireN",
				"withPermit",
				"withPermitScoped",
				"withPermits"
			]
		}
	],
	"TxSubscriptionRef": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "TxSubscriptionRef",
			"localName": "TxSubscriptionRef",
			"typeOnly": false,
			"members": [
				"TxSubscriptionRef",
				"changes",
				"changesStream",
				"get",
				"getAndSet",
				"getAndUpdate",
				"isTxSubscriptionRef",
				"make",
				"modify",
				"set",
				"update",
				"updateAndGet"
			]
		}
	],
	"Types": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Types",
			"localName": "Types",
			"typeOnly": false,
			"members": [
				"Concurrency",
				"Contravariant",
				"Covariant",
				"DeepMutable",
				"Equals",
				"EqualsWith",
				"ExcludeReason",
				"ExcludeTag",
				"ExtractReason",
				"ExtractTag",
				"Has",
				"Invariant",
				"IsUnion",
				"MergeLeft",
				"MergeRight",
				"Mutable",
				"NarrowReason",
				"NoExcessProperties",
				"NoInfer",
				"NotFunction",
				"OmitReason",
				"ReasonOf",
				"ReasonTags",
				"RequiredKeys",
				"Simplify",
				"Tags",
				"TupleOf",
				"TupleOfAtLeast",
				"UnionToIntersection",
				"VoidIfEmpty",
				"unassigned",
				"unhandled"
			]
		}
	],
	"UncheckedSnapshot": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "UncheckedSnapshot",
			"localName": "UncheckedSnapshot",
			"typeOnly": false
		}
	],
	"UndefinedOr": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "UndefinedOr",
			"localName": "UndefinedOr",
			"typeOnly": false,
			"members": [
				"getOrThrow",
				"getOrThrowWith",
				"liftThrowable",
				"makeCombinerFailFast",
				"makeReducer",
				"makeReducerFailFast",
				"map",
				"match"
			]
		}
	],
	"Unify": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Unify",
			"localName": "Unify",
			"typeOnly": false,
			"members": [
				"Unify",
				"ignoreSymbol",
				"typeSymbol",
				"unify",
				"unifySymbol"
			]
		}
	],
	"Url": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "Url",
			"localName": "Url",
			"typeOnly": false,
			"members": [
				"UrlError",
				"fromString",
				"make",
				"modifyUrlParams",
				"mutate",
				"setHash",
				"setHost",
				"setHostname",
				"setHref",
				"setPassword",
				"setPathname",
				"setPort",
				"setProtocol",
				"setSearch",
				"setUrlParams",
				"setUsername",
				"urlParams"
			]
		}
	],
	"UrlParams": [
		{
			"moduleSpecifier": "effect/unstable/http",
			"importKind": "named",
			"importedName": "UrlParams",
			"localName": "UrlParams",
			"typeOnly": false,
			"members": [
				"Coercible",
				"CoercibleRecord",
				"Equivalence",
				"Input",
				"UrlParams",
				"append",
				"appendAll",
				"empty",
				"fromInput",
				"getAll",
				"getFirst",
				"getLast",
				"isUrlParams",
				"make",
				"remove",
				"set",
				"setAll",
				"toReadonlyRecord",
				"toRecord",
				"toString",
				"transform"
			]
		}
	],
	"UserConsoleLog": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "UserConsoleLog",
			"localName": "UserConsoleLog",
			"typeOnly": false
		}
	],
	"Utils": [
		{
			"moduleSpecifier": "effect",
			"importKind": "named",
			"importedName": "Utils",
			"localName": "Utils",
			"typeOnly": false,
			"members": [
				"Gen",
				"SingleShotGen",
				"Variance"
			]
		},
		{
			"moduleSpecifier": "effect/unstable/rpc",
			"importKind": "named",
			"importedName": "Utils",
			"localName": "Utils",
			"typeOnly": false,
			"members": [
				"withRun",
				"withRunClient"
			]
		}
	],
	"VariantSchema": [
		{
			"moduleSpecifier": "effect/unstable/schema",
			"importKind": "named",
			"importedName": "VariantSchema",
			"localName": "VariantSchema",
			"typeOnly": false,
			"members": [
				"Class",
				"Extract",
				"ExtractFields",
				"Field",
				"Override",
				"Overrideable",
				"Struct",
				"TypeId",
				"Union",
				"fields",
				"isField",
				"isStruct",
				"make"
			]
		}
	],
	"vi": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "vi",
			"localName": "vi",
			"typeOnly": false
		}
	],
	"VisualRegressionArtifact": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "VisualRegressionArtifact",
			"localName": "VisualRegressionArtifact",
			"typeOnly": false
		}
	],
	"vitest": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "vitest",
			"localName": "vitest",
			"typeOnly": false
		}
	],
	"Vitest": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "Vitest",
			"localName": "Vitest",
			"typeOnly": false
		}
	],
	"VitestTestRunner": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "VitestTestRunner",
			"localName": "VitestTestRunner",
			"typeOnly": false
		}
	],
	"VitestUtils": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "VitestUtils",
			"localName": "VitestUtils",
			"typeOnly": false
		}
	],
	"WebSdk": [
		{
			"moduleSpecifier": "@effect/opentelemetry",
			"importKind": "named",
			"importedName": "WebSdk",
			"localName": "WebSdk",
			"typeOnly": false,
			"members": [
				"Configuration",
				"layer",
				"layerTracerProvider"
			]
		}
	],
	"WebSocketEvents": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "WebSocketEvents",
			"localName": "WebSocketEvents",
			"typeOnly": false
		}
	],
	"WebSocketHandlers": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "WebSocketHandlers",
			"localName": "WebSocketHandlers",
			"typeOnly": false
		}
	],
	"WebSocketRPC": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "WebSocketRPC",
			"localName": "WebSocketRPC",
			"typeOnly": false
		}
	],
	"Worker": [
		{
			"moduleSpecifier": "effect/unstable/workers",
			"importKind": "named",
			"importedName": "Worker",
			"localName": "Worker",
			"typeOnly": false,
			"members": [
				"PlatformMessage",
				"Spawner",
				"SpawnerFn",
				"Worker",
				"WorkerPlatform",
				"layerSpawner",
				"makePlatform",
				"makeUnsafe"
			]
		}
	],
	"WorkerError": [
		{
			"moduleSpecifier": "effect/unstable/workers",
			"importKind": "named",
			"importedName": "WorkerError",
			"localName": "WorkerError",
			"typeOnly": false,
			"members": [
				"TypeId",
				"WorkerError",
				"WorkerErrorReason",
				"WorkerReceiveError",
				"WorkerSendError",
				"WorkerSpawnError",
				"WorkerUnknownError",
				"isWorkerError"
			]
		}
	],
	"WorkerGlobalState": [
		{
			"moduleSpecifier": "@effect/vitest",
			"importKind": "named",
			"importedName": "WorkerGlobalState",
			"localName": "WorkerGlobalState",
			"typeOnly": false
		}
	],
	"WorkerRunner": [
		{
			"moduleSpecifier": "effect/unstable/workers",
			"importKind": "named",
			"importedName": "WorkerRunner",
			"localName": "WorkerRunner",
			"typeOnly": false,
			"members": [
				"PlatformMessage",
				"WorkerRunner",
				"WorkerRunnerPlatform"
			]
		}
	],
	"Workflow": [
		{
			"moduleSpecifier": "effect/unstable/workflow",
			"importKind": "named",
			"importedName": "Workflow",
			"localName": "Workflow",
			"typeOnly": false,
			"members": [
				"Any",
				"AnyStructSchema",
				"AnyWithProps",
				"CaptureDefects",
				"Complete",
				"CompleteEncoded",
				"CompleteSchema",
				"Execution",
				"PayloadSchema",
				"RequirementsClient",
				"RequirementsHandler",
				"Result",
				"ResultEncoded",
				"SuspendOnFailure",
				"Suspended",
				"Workflow",
				"addFinalizer",
				"intoResult",
				"isResult",
				"make",
				"provideScope",
				"scope",
				"suspend",
				"withCompensation",
				"wrapActivityResult"
			]
		}
	],
	"WorkflowEngine": [
		{
			"moduleSpecifier": "effect/unstable/workflow",
			"importKind": "named",
			"importedName": "WorkflowEngine",
			"localName": "WorkflowEngine",
			"typeOnly": false,
			"members": [
				"DeferredState",
				"Encoded",
				"WorkflowEngine",
				"WorkflowInstance",
				"layerMemory",
				"makeDeferredState",
				"makeUnsafe"
			]
		}
	],
	"WorkflowProxy": [
		{
			"moduleSpecifier": "effect/unstable/workflow",
			"importKind": "named",
			"importedName": "WorkflowProxy",
			"localName": "WorkflowProxy",
			"typeOnly": false,
			"members": [
				"ConvertHttpApi",
				"ConvertRpcs",
				"toHttpApiGroup",
				"toRpcGroup"
			]
		}
	],
	"WorkflowProxyServer": [
		{
			"moduleSpecifier": "effect/unstable/workflow",
			"importKind": "named",
			"importedName": "WorkflowProxyServer",
			"localName": "WorkflowProxyServer",
			"typeOnly": false,
			"members": [
				"RpcHandlers",
				"layerHttpApi",
				"layerRpcHandlers"
			]
		}
	],
	"Yaml": [
		{
			"moduleSpecifier": "effect/unstable/encoding",
			"importKind": "named",
			"importedName": "Yaml",
			"localName": "Yaml",
			"typeOnly": false,
			"members": [
				"parse"
			]
		}
	]
}

export const effectV4ImportNamespaceBindings: Readonly<Record<string, EffectV4ImportBindingCandidate>> = {
	"esToolkit": {
		"moduleSpecifier": "es-toolkit",
		"importKind": "namespace",
		"localName": "esToolkit",
		"typeOnly": false
	}
}
