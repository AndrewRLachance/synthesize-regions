import type {
  AuthoredGraphInput,
  AuthoredGraphNode,
  FragmentInputPort,
  FragmentCollectionInputPort,
  GraphTemplateDefinition,
  InputPort,
  LiteralInputPort,
  OutputPort,
  RawCodeInputPort,
  RegionKind,
  SynthesisGraph,
  SynthesisGoal,
  UnionInputPort
} from "./graphCoreTypes.js";
import type { SupportedJsonSchema } from "./schemaTypes.js";

/** Keep authored contract objects exact without recursively expanding schemas. */
type ShallowExact<TExpected, TActual> = {
  readonly [K in Exclude<keyof TActual, keyof TExpected>]: never;
};

/** Preserve tuple positions while making each union option an exact port shape. */
type StrictInputPortList<T extends readonly InputPort[]> =
  number extends T["length"]
    ? ReadonlyArray<StrictInputPort<T[number]>>
    : { readonly [K in keyof T]: T[K] extends InputPort ? StrictInputPort<T[K]> : T[K] };

/** Every concrete marker region reachable through a possibly nested union. */
type EffectivePortRegionKinds<T extends InputPort> =
  T extends UnionInputPort
    ? EffectiveUnionRegionKinds<T["options"]>
    : T extends { readonly regionKind: infer TRegionKind extends RegionKind }
      ? TRegionKind
      : never;

type EffectiveUnionRegionKinds<T extends readonly InputPort[]> =
  T[number] extends infer TOption extends InputPort
    ? EffectivePortRegionKinds<TOption>
    : never;

type PortHasStaticallyKnownRegions<T extends InputPort> =
  T extends UnionInputPort
    ? number extends T["options"]["length"]
      ? false
      : AllPortsHaveStaticallyKnownRegions<T["options"]>
    : T extends { readonly regionKind: infer TRegionKind extends RegionKind }
      ? true extends IsUnion<TRegionKind> ? false : true
      : false;

type AllPortsHaveStaticallyKnownRegions<T extends readonly InputPort[]> =
  T extends readonly [
    infer THead extends InputPort,
    ...infer TTail extends readonly InputPort[]
  ]
    ? PortHasStaticallyKnownRegions<THead> extends true
      ? AllPortsHaveStaticallyKnownRegions<TTail>
      : false
    : true;

/**
 * Validate constraints that are knowable only for a finite union tuple.
 * Deliberately widened option arrays retain their runtime-validated fallback.
 */
type FiniteUnionOptionsAreValid<T extends readonly InputPort[]> =
  number extends T["length"]
    ? true
    : T extends readonly []
      ? false
      : AllPortsHaveStaticallyKnownRegions<T> extends true
        ? true extends IsUnion<EffectiveUnionRegionKinds<T>>
          ? false
          : true
        : true;

type StrictUnionInputPort<T extends UnionInputPort> =
  FiniteUnionOptionsAreValid<T["options"]> extends true
    ? T &
      ShallowExact<Omit<UnionInputPort, "options">, Omit<T, "options">> & {
        readonly options: StrictInputPortList<T["options"]>;
      }
    : never;

/** Compile-time exact input-port shape used by template authoring helpers. */
export type StrictInputPort<T extends InputPort> =
  T extends LiteralInputPort ? T & ShallowExact<LiteralInputPort, T> :
  T extends FragmentInputPort ? T & ShallowExact<FragmentInputPort, T> :
  T extends FragmentCollectionInputPort ? T & ShallowExact<FragmentCollectionInputPort, T> :
  T extends RawCodeInputPort ? T & ShallowExact<RawCodeInputPort, T> :
  T extends UnionInputPort ? StrictUnionInputPort<T> :
  never;

/** Exact union-port input accepted by the `unionPort` helper before `kind` is added. */
export type StrictUnionPortInput<T extends Omit<UnionInputPort, "kind">> =
  FiniteUnionOptionsAreValid<T["options"]> extends true
    ? T &
      ShallowExact<Omit<UnionInputPort, "kind" | "options">, Omit<T, "options">> & {
        readonly options: StrictInputPortList<T["options"]>;
      }
    : never;

/** Compile-time exact input-port map used by graph template definitions. */
export type StrictInputPortMap<I extends Record<string, InputPort>> =
  keyof I extends never
    ? I
    : {
        readonly [K in keyof I]: StrictInputPort<I[K]>;
      };

/** Compile-time exact output-port shape used by template authoring helpers. */
export type StrictOutputPort<T extends OutputPort> = T & ShallowExact<OutputPort, T>;

type IsTuple<T extends readonly unknown[]> =
  number extends T["length"] ? false : true;

/** Detect whether a string literal has widened to plain `string`. */
type IsWidenedString<T> =
  string extends T ? true : false;

/** Recursively detect repeated literal model IDs in a finite template tuple. */
type HasDuplicateTemplateModelIds<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[],
  TSeen extends string = never
> =
  TTemplates extends readonly [
    infer THead extends GraphTemplateDefinition<any, string, any>,
    ...infer TTail extends readonly GraphTemplateDefinition<any, string, any>[]
  ]
    ? THead["modelId"] extends TSeen
      ? true
      : HasDuplicateTemplateModelIds<TTail, TSeen | THead["modelId"]>
    : false;

/** True when every tuple member has one concrete, non-widened model ID. */
type CatalogHasFiniteLiteralModelIds<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[]
> =
  TTemplates extends readonly [
    infer THead extends GraphTemplateDefinition<any, string, any>,
    ...infer TTail extends readonly GraphTemplateDefinition<any, string, any>[]
  ]
    ? string extends THead["modelId"]
      ? false
      : true extends IsUnion<THead["modelId"]>
        ? false
        : CatalogHasFiniteLiteralModelIds<TTail>
    : true;

/**
 * Compile-time checked template catalog shape.
 *
 * Finite tuples with literal model IDs reject duplicates. Widened IDs or
 * arrays fall back to runtime catalog validation because their membership is
 * not statically knowable.
 */
export type StrictTemplateCatalog<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[]
> =
  IsTuple<TTemplates> extends true
    ? CatalogHasFiniteLiteralModelIds<TTemplates> extends true
      ? HasDuplicateTemplateModelIds<TTemplates> extends true
        ? never
        : TTemplates
      : TTemplates
    : TTemplates;

// Index the template catalog by modelId so authored nodes can be checked
// against the specific input and output contract for their selected template.
type TemplateIndex<TTemplates extends readonly GraphTemplateDefinition<any, string, any>[]> = {
  readonly [TTemplate in TTemplates[number] as TTemplate["modelId"]]: TTemplate;
};

/** All template model IDs available in an indexed catalog. */
type TemplateModelId<TTemplateIndex> =
  Extract<keyof TTemplateIndex, string>;

/** Look up one template by model ID, returning `never` for unknown IDs. */
type TemplateByModelId<TTemplateIndex, TModelId extends string> =
  TModelId extends keyof TTemplateIndex ? TTemplateIndex[TModelId] : never;

/** Extract the declared input map from a graph template definition. */
type TemplateInputMap<TTemplate> =
  TTemplate extends { readonly inputs: infer I extends Record<string, InputPort> } ? I : never;

/** Extract the declared output port from a graph template definition. */
type TemplateOutput<TTemplate> =
  TTemplate extends { readonly output: infer O extends OutputPort } ? O : never;

/** Internal switch shared by complete and partial authored-graph checking. */
type SynthesisGraphCompleteness = "complete" | "partial";

/** Conservative result used by finite, compile-time compatibility proofs. */
type StaticCompatibility = "compatible" | "incompatible" | "indeterminate";

type CombineCompatibility<
  TLeft extends StaticCompatibility,
  TRight extends StaticCompatibility
> = TLeft extends "incompatible"
  ? "incompatible"
  : TRight extends "incompatible"
    ? "incompatible"
    : TLeft extends "indeterminate"
      ? "indeterminate"
      : TRight;

type CompatibilityFromUnion<TResults> =
  "incompatible" extends TResults
    ? "incompatible"
    : "indeterminate" extends TResults
      ? "indeterminate"
      : "compatible";

type IsAny<T> = 0 extends (1 & T) ? true : false;

type IsUnknown<T> = IsAny<T> extends true
  ? false
  : unknown extends T
    ? true
    : false;

type IsExactly<TLeft, TRight> =
  [TLeft] extends [TRight]
    ? [TRight] extends [TLeft] ? true : false
    : false;

type StaticSchemaTypeName =
  | "null"
  | "boolean"
  | "object"
  | "array"
  | "number"
  | "string"
  | "integer";

type SchemaAnnotationKey =
  | "$schema"
  | "$comment"
  | "title"
  | "description"
  | "default"
  | "deprecated"
  | "readOnly"
  | "writeOnly"
  | "examples"
  | "format"
  | "contentEncoding"
  | "contentMediaType";

type SchemaHasOnlyKeys<TSchema, TKeys extends PropertyKey> =
  Exclude<keyof TSchema, TKeys | SchemaAnnotationKey> extends never ? true : false;

type FiniteSchemaTuple<T> =
  T extends readonly unknown[]
    ? number extends T["length"] ? false : true
    : false;

type SchemaTypeMembers<TSchema> =
  TSchema extends { readonly type: infer TType }
    ? TType extends StaticSchemaTypeName
      ? TType
      : TType extends readonly StaticSchemaTypeName[]
        ? number extends TType["length"] ? never : TType[number]
        : never
    : never;

type SchemaHasFiniteTypes<TSchema> =
  TSchema extends { readonly type: infer TType }
    ? TType extends StaticSchemaTypeName
      ? true
      : TType extends readonly StaticSchemaTypeName[]
        ? number extends TType["length"] ? false : true
        : false
    : false;

type SchemaTypeAccepts<
  TExpected extends StaticSchemaTypeName,
  TActual extends StaticSchemaTypeName
> = TActual extends TExpected
  ? true
  : TActual extends "integer"
    ? "number" extends TExpected ? true : false
    : false;

type EveryActualSchemaTypeIsAccepted<
  TActualTypes extends StaticSchemaTypeName,
  TExpectedTypes extends StaticSchemaTypeName
> = CompatibilityFromUnion<
  TActualTypes extends unknown
    ? SchemaTypeAccepts<TExpectedTypes, TActualTypes> extends true
      ? "compatible"
      : "incompatible"
    : never
>;

type SchemaTypeCompatibility<TExpected, TActual> =
  SchemaHasFiniteTypes<TExpected> extends true
    ? SchemaHasFiniteTypes<TActual> extends true
      ? EveryActualSchemaTypeIsAccepted<
          SchemaTypeMembers<TActual>,
          SchemaTypeMembers<TExpected>
        >
      : "indeterminate"
    : TExpected extends { readonly type: unknown }
      ? "indeterminate"
      : "compatible";

type IsFiniteJsonValue<TValue> =
  IsAny<TValue> extends true
    ? false
    : IsUnknown<TValue> extends true
      ? false
      : TValue extends string
        ? string extends TValue ? false : true
        : TValue extends number
          ? number extends TValue ? false : true
          : TValue extends boolean
            ? boolean extends TValue ? false : true
            : TValue extends null
              ? true
              : TValue extends readonly unknown[]
                ? number extends TValue["length"]
                  ? false
                  : false extends {
                      [K in keyof TValue]: IsFiniteJsonValue<TValue[K]>
                    }[keyof TValue]
                    ? false
                    : true
                : TValue extends object
                  ? string extends keyof TValue
                    ? false
                    : false extends {
                        [K in keyof TValue]: IsFiniteJsonValue<TValue[K]>
                      }[keyof TValue]
                      ? false
                      : true
                  : false;

type StaticValueEquality<TActual, TExpected> =
  IsExactly<TActual, TExpected> extends true
    ? IsFiniteJsonValue<TActual> extends true ? "compatible" : "indeterminate"
    : TActual extends string | number | boolean | null
      ? TExpected extends string | number | boolean | null
        ? "incompatible"
        : "indeterminate"
      : "indeterminate";

type EveryTupleCompatibility<
  TItems extends readonly unknown[],
  TExpected,
  TDepth extends readonly unknown[]
> = number extends TItems["length"]
  ? "indeterminate"
  : CompatibilityFromUnion<{
      [K in keyof TItems]: StaticSchemaCompatibility<TExpected, TItems[K], TDepth>
    }[number]>;

type SomeSchemaOptionAccepts<
  TOptions extends readonly unknown[],
  TActual,
  TDepth extends readonly unknown[]
> = number extends TOptions["length"]
  ? "indeterminate"
  : "compatible" extends {
      [K in keyof TOptions]: StaticSchemaCompatibility<TOptions[K], TActual, TDepth>
    }[number]
    ? "compatible"
    : "indeterminate" extends {
        [K in keyof TOptions]: StaticSchemaCompatibility<TOptions[K], TActual, TDepth>
      }[number]
      ? "indeterminate"
      : "incompatible";

type OneOfSchemaOptionAccepts<
  TOptions extends readonly unknown[],
  TActual,
  TDepth extends readonly unknown[],
  TFoundCompatible extends boolean = false
> = number extends TOptions["length"]
  ? "indeterminate"
  : TOptions extends readonly [infer THead, ...infer TTail]
    ? StaticSchemaCompatibility<THead, TActual, TDepth> extends infer TResult extends StaticCompatibility
      ? TResult extends "indeterminate"
        ? "indeterminate"
        : TResult extends "compatible"
          ? TFoundCompatible extends true
            ? "incompatible"
            : OneOfSchemaOptionAccepts<TTail, TActual, TDepth, true>
          : OneOfSchemaOptionAccepts<TTail, TActual, TDepth, TFoundCompatible>
      : never
    : TFoundCompatible extends true ? "compatible" : "incompatible";

type SchemaValueTypeCompatibility<TValue, TSchema> =
  SchemaHasFiniteTypes<TSchema> extends true
    ? TValue extends null
      ? "null" extends SchemaTypeMembers<TSchema> ? "compatible" : "incompatible"
      : TValue extends readonly unknown[]
        ? "array" extends SchemaTypeMembers<TSchema> ? "compatible" : "incompatible"
        : TValue extends string
          ? "string" extends SchemaTypeMembers<TSchema> ? "compatible" : "incompatible"
          : TValue extends boolean
            ? "boolean" extends SchemaTypeMembers<TSchema> ? "compatible" : "incompatible"
            : TValue extends number
              ? number extends TValue
                ? "indeterminate"
                : `${TValue}` extends `${bigint}`
                  ? "number" | "integer" extends SchemaTypeMembers<TSchema>
                    ? "compatible"
                    : "number" extends SchemaTypeMembers<TSchema>
                      ? "compatible"
                      : "integer" extends SchemaTypeMembers<TSchema>
                        ? "compatible"
                        : "incompatible"
                  : "number" extends SchemaTypeMembers<TSchema> ? "compatible" : "incompatible"
              : TValue extends object
                ? "object" extends SchemaTypeMembers<TSchema> ? "compatible" : "incompatible"
                : "indeterminate"
    : TSchema extends { readonly type: unknown }
      ? "indeterminate"
      : "compatible";

type RequiredPropertiesCompatibility<
  TValue,
  TRequired
> = TRequired extends readonly string[]
  ? number extends TRequired["length"]
    ? "indeterminate"
    : Exclude<TRequired[number], keyof TValue> extends never
      ? "compatible"
      : "incompatible"
  : "compatible";

type ObjectPropertyValueResults<
  TValue extends object,
  TProperties,
  TDepth extends readonly unknown[]
> = TProperties extends object
  ? {
      [K in Extract<keyof TValue, keyof TProperties>]: StaticValueMatchesSchema<
        TValue[K],
        TProperties[K],
        TDepth
      >
    }[Extract<keyof TValue, keyof TProperties>]
  : "compatible";

type AdditionalPropertyValueResults<
  TValue extends object,
  TProperties,
  TAdditional,
  TDepth extends readonly unknown[]
> = Exclude<keyof TValue, keyof TProperties> extends infer TExtraKeys
  ? TExtraKeys extends never
    ? "compatible"
    : TAdditional extends false
      ? "incompatible"
      : TAdditional extends true | undefined
        ? "compatible"
        : CompatibilityFromUnion<{
            [K in Extract<TExtraKeys, keyof TValue>]: StaticValueMatchesSchema<
              TValue[K],
              TAdditional,
              TDepth
            >
          }[Extract<TExtraKeys, keyof TValue>]>
  : never;

type StaticObjectValueCompatibility<
  TValue extends object,
  TSchema,
  TDepth extends readonly unknown[]
> = SchemaHasOnlyKeys<
  TSchema,
  "type" | "properties" | "required" | "additionalProperties" | "const" | "enum" | "anyOf" | "oneOf"
> extends true
  ? CombineCompatibility<
      RequiredPropertiesCompatibility<
        TValue,
        TSchema extends { readonly required: infer TRequired } ? TRequired : undefined
      >,
      CombineCompatibility<
        CompatibilityFromUnion<ObjectPropertyValueResults<
          TValue,
          TSchema extends { readonly properties: infer TProperties } ? TProperties : {},
          TDepth
        >>,
        AdditionalPropertyValueResults<
          TValue,
          TSchema extends { readonly properties: infer TProperties } ? TProperties : {},
          TSchema extends { readonly additionalProperties: infer TAdditional } ? TAdditional : undefined,
          TDepth
        >
      >
    >
  : "indeterminate";

type StaticTupleValueCompatibility<
  TValue extends readonly unknown[],
  TSchema,
  TDepth extends readonly unknown[]
> = number extends TValue["length"]
  ? "indeterminate"
  : TSchema extends { readonly prefixItems: infer TPrefix extends readonly unknown[] }
    ? number extends TPrefix["length"]
      ? "indeterminate"
      : CompatibilityFromUnion<{
          [K in keyof TValue]: K extends keyof TPrefix
            ? StaticValueMatchesSchema<TValue[K], TPrefix[K], TDepth>
            : TSchema extends { readonly items: infer TItems }
              ? StaticValueMatchesSchema<TValue[K], TItems, TDepth>
              : "compatible"
        }[number]>
    : TSchema extends { readonly items: infer TItems }
      ? CompatibilityFromUnion<{
          [K in keyof TValue]: StaticValueMatchesSchema<TValue[K], TItems, TDepth>
        }[number]>
      : "compatible";

type StaticArrayValueCompatibility<
  TValue extends readonly unknown[],
  TSchema,
  TDepth extends readonly unknown[]
> = SchemaHasOnlyKeys<
  TSchema,
  "type" | "prefixItems" | "items" | "const" | "enum" | "anyOf" | "oneOf"
> extends true
  ? StaticTupleValueCompatibility<TValue, TSchema, TDepth>
  : "indeterminate";

type StaticBaseValueCompatibility<
  TValue,
  TSchema,
  TDepth extends readonly unknown[]
> = CombineCompatibility<
  SchemaValueTypeCompatibility<TValue, TSchema>,
  TValue extends readonly unknown[]
    ? StaticArrayValueCompatibility<TValue, TSchema, TDepth>
    : TValue extends object
      ? StaticObjectValueCompatibility<TValue, TSchema, TDepth>
      : SchemaHasOnlyKeys<TSchema, "type" | "const" | "enum" | "anyOf" | "oneOf"> extends true
        ? "compatible"
        : "indeterminate"
>;

type StaticConstValueCompatibility<TValue, TSchema> =
  TSchema extends { readonly const: infer TConst }
    ? StaticValueEquality<TValue, TConst>
    : "compatible";

type StaticEnumValueCompatibility<TValue, TSchema> =
  TSchema extends { readonly enum: infer TEnum extends readonly unknown[] }
    ? number extends TEnum["length"]
      ? "indeterminate"
      : "compatible" extends {
          [K in keyof TEnum]: StaticValueEquality<TValue, TEnum[K]>
        }[number]
        ? "compatible"
        : "indeterminate" extends {
            [K in keyof TEnum]: StaticValueEquality<TValue, TEnum[K]>
          }[number]
          ? "indeterminate"
          : "incompatible"
    : "compatible";

type StaticAnyOfValueCompatibility<
  TValue,
  TSchema,
  TDepth extends readonly unknown[]
> = TSchema extends { readonly anyOf: infer TOptions extends readonly unknown[] }
  ? number extends TOptions["length"]
    ? "indeterminate"
    : "compatible" extends {
        [K in keyof TOptions]: StaticValueMatchesSchema<TValue, TOptions[K], TDepth>
      }[number]
      ? "compatible"
      : "indeterminate" extends {
          [K in keyof TOptions]: StaticValueMatchesSchema<TValue, TOptions[K], TDepth>
        }[number]
        ? "indeterminate"
        : "incompatible"
  : "compatible";

type StaticOneOfValueCompatibility<
  TValue,
  TSchema,
  TDepth extends readonly unknown[]
> = TSchema extends { readonly oneOf: infer TOptions extends readonly unknown[] }
  ? OneOfValueOptionCompatibility<TValue, TOptions, TDepth>
  : "compatible";

type SchemaIsWidened<TSchema> =
  SupportedJsonSchema extends TSchema ? true : false;

type SchemaHasAdvancedStaticFeatures<TSchema> =
  TSchema extends
    | { readonly $ref: unknown }
    | { readonly $defs: unknown }
    | { readonly multipleOf: unknown }
    | { readonly maximum: unknown }
    | { readonly exclusiveMaximum: unknown }
    | { readonly minimum: unknown }
    | { readonly exclusiveMinimum: unknown }
    | { readonly maxLength: unknown }
    | { readonly minLength: unknown }
    | { readonly pattern: unknown }
    | { readonly contains: unknown }
    | { readonly minContains: unknown }
    | { readonly maxContains: unknown }
    | { readonly minItems: unknown }
    | { readonly maxItems: unknown }
    | { readonly uniqueItems: unknown }
    | { readonly unevaluatedItems: unknown }
    | { readonly patternProperties: unknown }
    | { readonly propertyNames: unknown }
    | { readonly minProperties: unknown }
    | { readonly maxProperties: unknown }
    | { readonly dependentRequired: unknown }
    | { readonly dependentSchemas: unknown }
    | { readonly unevaluatedProperties: unknown }
    | { readonly allOf: unknown }
    | { readonly not: unknown }
    | { readonly if: unknown }
    | { readonly then: unknown }
    | { readonly else: unknown }
    ? true
    : false;

type StaticShallowValueMatchesSchema<TValue, TSchema> =
  [TSchema] extends [true]
    ? "compatible"
    : [TSchema] extends [false]
      ? "incompatible"
      : CombineCompatibility<
          StaticConstValueCompatibility<TValue, TSchema>,
          CombineCompatibility<
            StaticEnumValueCompatibility<TValue, TSchema>,
            SchemaValueTypeCompatibility<TValue, TSchema>
          >
        >;

type SomeShallowValueOptionAccepts<
  TValue,
  TOptions extends readonly unknown[]
> = number extends TOptions["length"]
  ? "indeterminate"
  : "compatible" extends {
      [K in keyof TOptions]: StaticShallowValueMatchesSchema<TValue, TOptions[K]>
    }[number]
    ? "compatible"
    : "indeterminate" extends {
        [K in keyof TOptions]: StaticShallowValueMatchesSchema<TValue, TOptions[K]>
      }[number]
      ? "indeterminate"
      : "incompatible";

type OneShallowValueOptionAccepts<
  TValue,
  TOptions extends readonly unknown[],
  TFoundCompatible extends boolean = false
> = number extends TOptions["length"]
  ? "indeterminate"
  : TOptions extends readonly [infer THead, ...infer TTail]
    ? StaticShallowValueMatchesSchema<TValue, THead> extends infer TResult extends StaticCompatibility
      ? TResult extends "indeterminate"
        ? "indeterminate"
        : TResult extends "compatible"
          ? TFoundCompatible extends true
            ? "incompatible"
            : OneShallowValueOptionAccepts<TValue, TTail, true>
          : OneShallowValueOptionAccepts<TValue, TTail, TFoundCompatible>
      : never
    : TFoundCompatible extends true ? "compatible" : "incompatible";

type StaticMidValueMatchesSchema<TValue, TSchema> =
  CombineCompatibility<
    StaticShallowValueMatchesSchema<TValue, TSchema>,
    CombineCompatibility<
      TSchema extends { readonly anyOf: infer TOptions extends readonly unknown[] }
        ? SomeShallowValueOptionAccepts<TValue, TOptions>
        : "compatible",
      TSchema extends { readonly oneOf: infer TOptions extends readonly unknown[] }
        ? OneShallowValueOptionAccepts<TValue, TOptions>
        : "compatible"
    >
  >;

type SomeMidValueOptionAccepts<
  TValue,
  TOptions extends readonly unknown[]
> = number extends TOptions["length"]
  ? "indeterminate"
  : "compatible" extends {
      [K in keyof TOptions]: StaticMidValueMatchesSchema<TValue, TOptions[K]>
    }[number]
    ? "compatible"
    : "indeterminate" extends {
        [K in keyof TOptions]: StaticMidValueMatchesSchema<TValue, TOptions[K]>
      }[number]
      ? "indeterminate"
      : "incompatible";

type OneMidValueOptionAccepts<
  TValue,
  TOptions extends readonly unknown[],
  TFoundCompatible extends boolean = false
> = number extends TOptions["length"]
  ? "indeterminate"
  : TOptions extends readonly [infer THead, ...infer TTail]
    ? StaticMidValueMatchesSchema<TValue, THead> extends infer TResult extends StaticCompatibility
      ? TResult extends "indeterminate"
        ? "indeterminate"
        : TResult extends "compatible"
          ? TFoundCompatible extends true
            ? "incompatible"
            : OneMidValueOptionAccepts<TValue, TTail, true>
          : OneMidValueOptionAccepts<TValue, TTail, TFoundCompatible>
      : never
    : TFoundCompatible extends true ? "compatible" : "incompatible";

type StaticFiniteObjectValueCompatibility<TValue extends object, TSchema> =
  string extends keyof TValue
    ? "indeterminate"
    : CombineCompatibility<
        RequiredPropertiesCompatibility<
          TValue,
          TSchema extends { readonly required: infer TRequired } ? TRequired : undefined
        >,
        CombineCompatibility<
          CompatibilityFromUnion<
            TSchema extends { readonly properties: infer TProperties extends object }
              ? {
                  [K in Extract<keyof TValue, keyof TProperties>]:
                    StaticMidValueMatchesSchema<TValue[K], TProperties[K]>
                }[Extract<keyof TValue, keyof TProperties>]
              : "compatible"
          >,
          TSchema extends { readonly additionalProperties: infer TAdditional }
            ? Exclude<
                keyof TValue,
                keyof (TSchema extends { readonly properties: infer TProperties } ? TProperties : {})
              > extends infer TExtraKeys
              ? TExtraKeys extends never
                ? "compatible"
                : TAdditional extends false
                  ? "incompatible"
                  : TAdditional extends true
                    ? "compatible"
                    : CompatibilityFromUnion<{
                        [K in Extract<TExtraKeys, keyof TValue>]:
                          StaticMidValueMatchesSchema<TValue[K], TAdditional>
                      }[Extract<TExtraKeys, keyof TValue>]>
              : never
            : "compatible"
        >
      >;

type StaticFiniteTupleValueCompatibility<
  TValue extends readonly unknown[],
  TSchema
> = number extends TValue["length"]
  ? "indeterminate"
  : TSchema extends { readonly prefixItems: infer TPrefix extends readonly unknown[] }
    ? number extends TPrefix["length"]
      ? "indeterminate"
      : CompatibilityFromUnion<{
          [K in keyof TValue]: K extends keyof TPrefix
            ? StaticMidValueMatchesSchema<TValue[K], TPrefix[K]>
            : TSchema extends { readonly items: infer TItems }
              ? StaticMidValueMatchesSchema<TValue[K], TItems>
              : "compatible"
        }[number]>
    : TSchema extends { readonly items: infer TItems }
      ? CompatibilityFromUnion<{
          [K in keyof TValue]: StaticMidValueMatchesSchema<TValue[K], TItems>
        }[number]>
      : "compatible";

type StaticFiniteStructuredValueCompatibility<TValue, TSchema> =
  TValue extends readonly unknown[]
    ? StaticFiniteTupleValueCompatibility<TValue, TSchema>
    : TValue extends object
      ? StaticFiniteObjectValueCompatibility<TValue, TSchema>
      : "compatible";

type StaticDirectObjectValueCompatibility<
  TValue extends object,
  TSchema,
  TDepth extends readonly unknown[]
> = string extends keyof TValue
  ? "indeterminate"
  : CombineCompatibility<
      RequiredPropertiesCompatibility<
        TValue,
        TSchema extends { readonly required: infer TRequired } ? TRequired : undefined
      >,
      CombineCompatibility<
        CompatibilityFromUnion<ObjectPropertyValueResults<
          TValue,
          TSchema extends { readonly properties: infer TProperties } ? TProperties : {},
          TDepth
        >>,
        AdditionalPropertyValueResults<
          TValue,
          TSchema extends { readonly properties: infer TProperties } ? TProperties : {},
          TSchema extends { readonly additionalProperties: infer TAdditional } ? TAdditional : undefined,
          TDepth
        >
      >
    >;

type StaticDirectBaseValueCompatibility<
  TValue,
  TSchema,
  TDepth extends readonly unknown[]
> = CombineCompatibility<
  SchemaValueTypeCompatibility<TValue, TSchema>,
  TValue extends readonly unknown[]
    ? StaticTupleValueCompatibility<TValue, TSchema, TDepth>
    : TValue extends object
      ? StaticDirectObjectValueCompatibility<TValue, TSchema, TDepth>
      : "compatible"
>;

type OneOfValueOptionCompatibility<
  TValue,
  TOptions extends readonly unknown[],
  TDepth extends readonly unknown[],
  TFoundCompatible extends boolean = false
> = number extends TOptions["length"]
  ? "indeterminate"
  : TOptions extends readonly [infer THead, ...infer TTail]
    ? StaticValueMatchesSchema<TValue, THead, TDepth> extends infer TResult extends StaticCompatibility
      ? TResult extends "indeterminate"
        ? "indeterminate"
        : TResult extends "compatible"
          ? TFoundCompatible extends true
            ? "incompatible"
            : OneOfValueOptionCompatibility<TValue, TTail, TDepth, true>
          : OneOfValueOptionCompatibility<TValue, TTail, TDepth, TFoundCompatible>
      : never
    : TFoundCompatible extends true ? "compatible" : "incompatible";

/** Prove a finite JSON literal against the supported schema subset when safe. */
type StaticValueMatchesSchema<
  TValue,
  TSchema,
  TDepth extends readonly unknown[] = []
> = TDepth["length"] extends 7
  ? "indeterminate"
  : [TSchema] extends [true]
    ? "compatible"
    : [TSchema] extends [false]
      ? "incompatible"
      : CombineCompatibility<
          StaticMidValueMatchesSchema<TValue, TSchema>,
          CombineCompatibility<
            TSchema extends { readonly anyOf: infer TOptions extends readonly unknown[] }
              ? SomeMidValueOptionAccepts<TValue, TOptions>
              : "compatible",
            CombineCompatibility<
              TSchema extends { readonly oneOf: infer TOptions extends readonly unknown[] }
                ? OneMidValueOptionAccepts<TValue, TOptions>
                : "compatible",
              CombineCompatibility<
                StaticFiniteStructuredValueCompatibility<TValue, TSchema>,
                SchemaHasAdvancedStaticFeatures<TSchema> extends true
                  ? "indeterminate"
                  : "compatible"
              >
            >
          >
        >;

type StaticSchemaTupleValuesCompatibility<
  TExpected,
  TValues extends readonly unknown[],
  TDepth extends readonly unknown[]
> = number extends TValues["length"]
  ? "indeterminate"
  : CompatibilityFromUnion<{
      [K in keyof TValues]: StaticValueMatchesSchema<TValues[K], TExpected, TDepth>
    }[number]>;

type RequiredSchemaPropertiesCompatibility<TExpected, TActual> =
  TExpected extends { readonly required: infer TExpectedRequired extends readonly string[] }
    ? number extends TExpectedRequired["length"]
      ? "indeterminate"
      : TActual extends { readonly required: infer TActualRequired extends readonly string[] }
        ? number extends TActualRequired["length"]
          ? "indeterminate"
          : Exclude<TExpectedRequired[number], TActualRequired[number]> extends never
            ? "compatible"
            : TActualRequired extends readonly []
              ? "incompatible"
              : "indeterminate"
        : TExpectedRequired extends readonly [] ? "compatible" : "incompatible"
    : "compatible";

type ObjectSchemaPropertyResults<
  TExpectedProperties,
  TActualProperties,
  TDepth extends readonly unknown[]
> = TExpectedProperties extends object
  ? TActualProperties extends object
    ? {
        [K in Extract<keyof TExpectedProperties, keyof TActualProperties>]: StaticSchemaCompatibility<
          TExpectedProperties[K],
          TActualProperties[K],
          TDepth
        >
      }[Extract<keyof TExpectedProperties, keyof TActualProperties>]
    : "compatible"
  : "compatible";

type RequiredPropertySchemasCompatibility<
  TExpected,
  TActual,
  TDepth extends readonly unknown[]
> = TExpected extends {
  readonly required: infer TRequired extends readonly string[];
  readonly properties: infer TExpectedProperties;
}
  ? number extends TRequired["length"]
    ? "indeterminate"
    : TActual extends { readonly properties: infer TActualProperties }
      ? CompatibilityFromUnion<{
          [K in Extract<TRequired[number], keyof TExpectedProperties>]:
            K extends keyof TActualProperties
              ? StaticSchemaCompatibility<TExpectedProperties[K], TActualProperties[K], TDepth>
              : "indeterminate"
        }[Extract<TRequired[number], keyof TExpectedProperties>]>
      : Extract<TRequired[number], keyof TExpectedProperties> extends never
        ? "compatible"
        : "indeterminate"
  : "compatible";

type AdditionalPropertiesSchemaCompatibility<TExpected, TActual> =
  TExpected extends { readonly additionalProperties: false }
    ? TActual extends { readonly additionalProperties: false }
      ? TActual extends { readonly properties: infer TActualProperties }
        ? TExpected extends { readonly properties: infer TExpectedProperties }
          ? Exclude<keyof TActualProperties, keyof TExpectedProperties> extends never
            ? "compatible"
            : "incompatible"
          : keyof TActualProperties extends never ? "compatible" : "incompatible"
        : "compatible"
      : "incompatible"
    : "compatible";

type StaticObjectSchemaCompatibility<
  TExpected,
  TActual,
  TDepth extends readonly unknown[]
> = SchemaHasOnlyKeys<
  TExpected,
  "type" | "properties" | "required" | "additionalProperties"
> extends true
  ? SchemaHasOnlyKeys<
      TActual,
      "type" | "properties" | "required" | "additionalProperties"
    > extends true
    ? CombineCompatibility<
        RequiredSchemaPropertiesCompatibility<TExpected, TActual>,
        CombineCompatibility<
          CompatibilityFromUnion<ObjectSchemaPropertyResults<
            TExpected extends { readonly properties: infer TExpectedProperties } ? TExpectedProperties : {},
            TActual extends { readonly properties: infer TActualProperties } ? TActualProperties : {},
            TDepth
          >>,
          CombineCompatibility<
            RequiredPropertySchemasCompatibility<TExpected, TActual, TDepth>,
            AdditionalPropertiesSchemaCompatibility<TExpected, TActual>
          >
        >
      >
    : "indeterminate"
  : "indeterminate";

type ArrayItemsOrTrue<TSchema> =
  TSchema extends { readonly items: infer TItems } ? TItems : true;

type ArrayPrefixOrEmpty<TSchema> =
  TSchema extends { readonly prefixItems: infer TPrefix extends readonly unknown[] }
    ? TPrefix
    : readonly [];

type StaticArrayPositionCompatibility<
  TExpectedPrefix extends readonly unknown[],
  TExpectedItems,
  TActualPrefix extends readonly unknown[],
  TActualItems,
  TDepth extends readonly unknown[]
> = number extends TExpectedPrefix["length"] | TActualPrefix["length"]
  ? "indeterminate"
  : TActualPrefix extends readonly [infer TActualHead, ...infer TActualTail]
    ? TExpectedPrefix extends readonly [infer TExpectedHead, ...infer TExpectedTail]
      ? CombineCompatibility<
          StaticSchemaCompatibility<TExpectedHead, TActualHead, TDepth>,
          StaticArrayPositionCompatibility<
            TExpectedTail,
            TExpectedItems,
            TActualTail,
            TActualItems,
            TDepth
          >
        >
      : CombineCompatibility<
          StaticSchemaCompatibility<TExpectedItems, TActualHead, TDepth>,
          StaticArrayPositionCompatibility<
            readonly [],
            TExpectedItems,
            TActualTail,
            TActualItems,
            TDepth
          >
        >
    : TExpectedPrefix extends readonly [infer TExpectedHead, ...infer TExpectedTail]
      ? CombineCompatibility<
          StaticSchemaCompatibility<TExpectedHead, TActualItems, TDepth>,
          StaticArrayPositionCompatibility<
            TExpectedTail,
            TExpectedItems,
            readonly [],
            TActualItems,
            TDepth
          >
        >
      : StaticSchemaCompatibility<TExpectedItems, TActualItems, TDepth>;

type StaticArraySchemaCompatibility<
  TExpected,
  TActual,
  TDepth extends readonly unknown[]
> = SchemaHasOnlyKeys<TExpected, "type" | "prefixItems" | "items"> extends true
  ? SchemaHasOnlyKeys<TActual, "type" | "prefixItems" | "items"> extends true
    ? StaticArrayPositionCompatibility<
        ArrayPrefixOrEmpty<TExpected>,
        ArrayItemsOrTrue<TExpected>,
        ArrayPrefixOrEmpty<TActual>,
        ArrayItemsOrTrue<TActual>,
        TDepth
      >
    : "indeterminate"
  : "indeterminate";

type StaticTypedSchemaCompatibility<
  TExpected,
  TActual,
  TDepth extends readonly unknown[]
> = SchemaTypeCompatibility<TExpected, TActual> extends infer TTypeResult extends StaticCompatibility
  ? TTypeResult extends "incompatible"
    ? SchemaHasOnlyKeys<TActual, "type"> extends true
      ? "incompatible"
      : "indeterminate"
    : TTypeResult extends "indeterminate"
      ? "indeterminate"
      : "object" extends SchemaTypeMembers<TExpected>
        ? "object" extends SchemaTypeMembers<TActual>
          ? StaticObjectSchemaCompatibility<TExpected, TActual, TDepth>
          : SchemaHasOnlyKeys<TExpected, "type"> extends true ? "compatible" : "indeterminate"
        : "array" extends SchemaTypeMembers<TExpected>
          ? "array" extends SchemaTypeMembers<TActual>
            ? StaticArraySchemaCompatibility<TExpected, TActual, TDepth>
            : SchemaHasOnlyKeys<TExpected, "type"> extends true ? "compatible" : "indeterminate"
          : SchemaHasOnlyKeys<TExpected, "type"> extends true
            ? "compatible"
            : "indeterminate"
  : never;

type StaticObjectSchemaCompatibilityDispatch<
  TExpected,
  TActual,
  TDepth extends readonly unknown[]
> = TActual extends { readonly anyOf: infer TActualOptions extends readonly unknown[] }
  ? SchemaHasOnlyKeys<TActual, "anyOf"> extends true
    ? EveryTupleCompatibility<TActualOptions, TExpected, TDepth>
    : "indeterminate"
  : TActual extends { readonly oneOf: infer TActualOptions extends readonly unknown[] }
    ? SchemaHasOnlyKeys<TActual, "oneOf"> extends true
      ? EveryTupleCompatibility<TActualOptions, TExpected, TDepth>
      : "indeterminate"
    : TActual extends { readonly const: infer TActualConst }
      ? SchemaHasOnlyKeys<TActual, "const" | "type"> extends true
        ? StaticValueMatchesSchema<TActualConst, TExpected, TDepth>
        : "indeterminate"
      : TActual extends { readonly enum: infer TActualEnum extends readonly unknown[] }
        ? SchemaHasOnlyKeys<TActual, "enum" | "type"> extends true
          ? StaticSchemaTupleValuesCompatibility<TExpected, TActualEnum, TDepth>
          : "indeterminate"
        : TExpected extends { readonly anyOf: infer TExpectedOptions extends readonly unknown[] }
          ? SchemaHasOnlyKeys<TExpected, "anyOf"> extends true
            ? SomeSchemaOptionAccepts<TExpectedOptions, TActual, TDepth>
            : "indeterminate"
          : TExpected extends { readonly oneOf: infer TExpectedOptions extends readonly unknown[] }
            ? SchemaHasOnlyKeys<TExpected, "oneOf"> extends true
              ? OneOfSchemaOptionAccepts<TExpectedOptions, TActual, TDepth>
              : "indeterminate"
            : TExpected extends { readonly const: infer TExpectedConst }
              ? TActual extends { readonly const: infer TActualConst }
                ? StaticValueEquality<TActualConst, TExpectedConst>
                : TActual extends { readonly enum: infer TActualEnum extends readonly unknown[] }
                  ? StaticSchemaTupleValuesCompatibility<TExpected, TActualEnum, TDepth>
                  : SchemaHasOnlyKeys<TActual, "type"> extends true ? "incompatible" : "indeterminate"
              : TExpected extends { readonly enum: readonly unknown[] }
                ? TActual extends { readonly const: infer TActualConst }
                  ? StaticValueMatchesSchema<TActualConst, TExpected, TDepth>
                  : TActual extends { readonly enum: infer TActualEnum extends readonly unknown[] }
                    ? StaticSchemaTupleValuesCompatibility<TExpected, TActualEnum, TDepth>
                    : SchemaHasOnlyKeys<TActual, "type"> extends true ? "incompatible" : "indeterminate"
                : StaticTypedSchemaCompatibility<TExpected, TActual, TDepth>;

type StaticShallowSchemaCompatibility<TExpected, TActual> =
  IsExactly<TExpected, TActual> extends true
    ? "compatible"
    : [TExpected] extends [true]
      ? "compatible"
      : [TActual] extends [false]
        ? "compatible"
        : [TExpected] extends [false]
          ? [TActual] extends [true] ? "incompatible" : "indeterminate"
          : TActual extends { readonly const: infer TActualConst }
            ? StaticShallowValueMatchesSchema<TActualConst, TExpected>
            : TActual extends { readonly enum: infer TActualEnum extends readonly unknown[] }
              ? number extends TActualEnum["length"]
                ? "indeterminate"
                : CompatibilityFromUnion<{
                    [K in keyof TActualEnum]: StaticShallowValueMatchesSchema<
                      TActualEnum[K],
                      TExpected
                    >
                  }[number]>
              : TExpected extends { readonly const: unknown } | { readonly enum: readonly unknown[] }
                ? SchemaHasFiniteTypes<TActual> extends true ? "incompatible" : "indeterminate"
                : SchemaTypeCompatibility<TExpected, TActual>;

type EveryShallowSchemaOptionIsAccepted<
  TExpected,
  TOptions extends readonly unknown[]
> = number extends TOptions["length"]
  ? "indeterminate"
  : CompatibilityFromUnion<{
      [K in keyof TOptions]: StaticShallowSchemaCompatibility<TExpected, TOptions[K]>
    }[number]>;

type SomeShallowSchemaOptionAccepts<
  TExpectedOptions extends readonly unknown[],
  TActual
> = number extends TExpectedOptions["length"]
  ? "indeterminate"
  : "compatible" extends {
      [K in keyof TExpectedOptions]: StaticShallowSchemaCompatibility<
        TExpectedOptions[K],
        TActual
      >
    }[number]
    ? "compatible"
    : "indeterminate" extends {
        [K in keyof TExpectedOptions]: StaticShallowSchemaCompatibility<
          TExpectedOptions[K],
          TActual
        >
      }[number]
      ? "indeterminate"
      : "incompatible";

type OneShallowSchemaOptionAccepts<
  TExpectedOptions extends readonly unknown[],
  TActual,
  TFoundCompatible extends boolean = false
> = number extends TExpectedOptions["length"]
  ? "indeterminate"
  : TExpectedOptions extends readonly [infer THead, ...infer TTail]
    ? StaticShallowSchemaCompatibility<THead, TActual> extends infer TResult extends StaticCompatibility
      ? TResult extends "indeterminate"
        ? "indeterminate"
        : TResult extends "compatible"
          ? TFoundCompatible extends true
            ? "incompatible"
            : OneShallowSchemaOptionAccepts<TTail, TActual, true>
          : OneShallowSchemaOptionAccepts<TTail, TActual, TFoundCompatible>
      : never
    : TFoundCompatible extends true ? "compatible" : "incompatible";

type StaticMidSchemaCompatibility<TExpected, TActual> =
  TActual extends { readonly anyOf: infer TOptions extends readonly unknown[] }
    ? EveryShallowSchemaOptionIsAccepted<TExpected, TOptions>
    : TActual extends { readonly oneOf: infer TOptions extends readonly unknown[] }
      ? EveryShallowSchemaOptionIsAccepted<TExpected, TOptions>
      : TExpected extends { readonly anyOf: infer TOptions extends readonly unknown[] }
        ? SomeShallowSchemaOptionAccepts<TOptions, TActual>
        : TExpected extends { readonly oneOf: infer TOptions extends readonly unknown[] }
          ? OneShallowSchemaOptionAccepts<TOptions, TActual>
          : StaticShallowSchemaCompatibility<TExpected, TActual>;

type EveryMidSchemaOptionIsAccepted<
  TExpected,
  TOptions extends readonly unknown[]
> = number extends TOptions["length"]
  ? "indeterminate"
  : CompatibilityFromUnion<{
      [K in keyof TOptions]: StaticMidSchemaCompatibility<TExpected, TOptions[K]>
    }[number]>;

type SomeMidSchemaOptionAccepts<
  TExpectedOptions extends readonly unknown[],
  TActual
> = number extends TExpectedOptions["length"]
  ? "indeterminate"
  : "compatible" extends {
      [K in keyof TExpectedOptions]: StaticMidSchemaCompatibility<TExpectedOptions[K], TActual>
    }[number]
    ? "compatible"
    : "indeterminate" extends {
        [K in keyof TExpectedOptions]: StaticMidSchemaCompatibility<TExpectedOptions[K], TActual>
      }[number]
      ? "indeterminate"
      : "incompatible";

type OneMidSchemaOptionAccepts<
  TExpectedOptions extends readonly unknown[],
  TActual,
  TFoundCompatible extends boolean = false
> = number extends TExpectedOptions["length"]
  ? "indeterminate"
  : TExpectedOptions extends readonly [infer THead, ...infer TTail]
    ? StaticMidSchemaCompatibility<THead, TActual> extends infer TResult extends StaticCompatibility
      ? TResult extends "indeterminate"
        ? "indeterminate"
        : TResult extends "compatible"
          ? TFoundCompatible extends true
            ? "incompatible"
            : OneMidSchemaOptionAccepts<TTail, TActual, true>
          : OneMidSchemaOptionAccepts<TTail, TActual, TFoundCompatible>
      : never
    : TFoundCompatible extends true ? "compatible" : "incompatible";

type StaticFiniteObjectSchemaCompatibility<TExpected, TActual> =
  CombineCompatibility<
    RequiredSchemaPropertiesCompatibility<TExpected, TActual>,
    CombineCompatibility<
      CompatibilityFromUnion<
        TExpected extends { readonly properties: infer TExpectedProperties extends object }
          ? TActual extends { readonly properties: infer TActualProperties extends object }
            ? {
                [K in Extract<keyof TExpectedProperties, keyof TActualProperties>]:
                  StaticMidSchemaCompatibility<
                    TExpectedProperties[K],
                    TActualProperties[K]
                  >
              }[Extract<keyof TExpectedProperties, keyof TActualProperties>]
            : "compatible"
          : "compatible"
      >,
      CombineCompatibility<
        TExpected extends {
          readonly required: infer TRequired extends readonly string[];
          readonly properties: infer TExpectedProperties extends object;
        }
          ? TActual extends { readonly properties: infer TActualProperties extends object }
            ? CompatibilityFromUnion<{
                [K in Extract<TRequired[number], keyof TExpectedProperties>]:
                  K extends keyof TActualProperties
                    ? StaticMidSchemaCompatibility<
                        TExpectedProperties[K],
                        TActualProperties[K]
                      >
                    : "indeterminate"
              }[Extract<TRequired[number], keyof TExpectedProperties>]>
            : "indeterminate"
          : "compatible",
        AdditionalPropertiesSchemaCompatibility<TExpected, TActual>
      >
    >
  >;

type StaticFiniteArrayPositionCompatibility<
  TExpectedPrefix extends readonly unknown[],
  TExpectedItems,
  TActualPrefix extends readonly unknown[],
  TActualItems
> = number extends TExpectedPrefix["length"] | TActualPrefix["length"]
  ? "indeterminate"
  : TActualPrefix extends readonly [infer TActualHead, ...infer TActualTail]
    ? TExpectedPrefix extends readonly [infer TExpectedHead, ...infer TExpectedTail]
      ? CombineCompatibility<
          StaticMidSchemaCompatibility<TExpectedHead, TActualHead>,
          StaticFiniteArrayPositionCompatibility<
            TExpectedTail,
            TExpectedItems,
            TActualTail,
            TActualItems
          >
        >
      : CombineCompatibility<
          StaticMidSchemaCompatibility<TExpectedItems, TActualHead>,
          StaticFiniteArrayPositionCompatibility<
            readonly [],
            TExpectedItems,
            TActualTail,
            TActualItems
          >
        >
    : TExpectedPrefix extends readonly [infer TExpectedHead, ...infer TExpectedTail]
      ? CombineCompatibility<
          StaticMidSchemaCompatibility<TExpectedHead, TActualItems>,
          StaticFiniteArrayPositionCompatibility<
            TExpectedTail,
            TExpectedItems,
            readonly [],
            TActualItems
          >
        >
      : StaticMidSchemaCompatibility<TExpectedItems, TActualItems>;

type StaticFiniteArraySchemaCompatibility<TExpected, TActual> =
  StaticFiniteArrayPositionCompatibility<
    ArrayPrefixOrEmpty<TExpected>,
    ArrayItemsOrTrue<TExpected>,
    ArrayPrefixOrEmpty<TActual>,
    ArrayItemsOrTrue<TActual>
  >;

type StaticFiniteSchemaCompatibility<TExpected, TActual> =
  TActual extends { readonly anyOf: infer TOptions extends readonly unknown[] }
    ? EveryMidSchemaOptionIsAccepted<TExpected, TOptions>
    : TActual extends { readonly oneOf: infer TOptions extends readonly unknown[] }
      ? EveryMidSchemaOptionIsAccepted<TExpected, TOptions>
      : TExpected extends { readonly anyOf: infer TOptions extends readonly unknown[] }
        ? SomeMidSchemaOptionAccepts<TOptions, TActual>
        : TExpected extends { readonly oneOf: infer TOptions extends readonly unknown[] }
          ? OneMidSchemaOptionAccepts<TOptions, TActual>
          : StaticShallowSchemaCompatibility<TExpected, TActual> extends infer TBase extends StaticCompatibility
            ? TBase extends "incompatible"
              ? TBase
              : "object" extends SchemaTypeMembers<TExpected>
                ? "object" extends SchemaTypeMembers<TActual>
                  ? CombineCompatibility<TBase, StaticFiniteObjectSchemaCompatibility<TExpected, TActual>>
                  : TBase
                : "array" extends SchemaTypeMembers<TExpected>
                  ? "array" extends SchemaTypeMembers<TActual>
                    ? CombineCompatibility<TBase, StaticFiniteArraySchemaCompatibility<TExpected, TActual>>
                    : TBase
                  : TBase
            : never;

/**
 * Prove producer-schema inclusion in a consumer schema for finite metadata.
 * Anything outside the deliberately small proof surface remains indeterminate.
 */
type StaticSchemaCompatibility<
  TExpected,
  TActual,
  TDepth extends readonly unknown[] = []
> = TDepth["length"] extends 7
  ? "indeterminate"
  : CombineCompatibility<
      StaticFiniteSchemaCompatibility<TExpected, TActual>,
      SchemaHasAdvancedStaticFeatures<TExpected | TActual> extends true
        ? "indeterminate"
        : "compatible"
    >;

type StaticTsCompatibility<TExpected, TActual> =
  TExpected extends { readonly ts: infer TExpectedTs extends string }
    ? TExpectedTs extends "unknown"
      ? "compatible"
      : TActual extends { readonly ts: infer TActualTs extends string }
        ? string extends TExpectedTs | TActualTs
          ? "indeterminate"
          : IsExactly<TExpectedTs, TActualTs> extends true
            ? "compatible"
            : "indeterminate"
        : "incompatible"
    : "compatible";

type DescriptorSchema<TDescriptor, TFallbackSchema = undefined> =
  TDescriptor extends { readonly schema: infer TSchema }
    ? TSchema
    : TFallbackSchema;

type StaticDescriptorSchemaCompatibility<TExpectedSchema, TActualSchema> =
  SupportedJsonSchema extends TExpectedSchema
    ? "indeterminate"
    : SupportedJsonSchema extends TActualSchema
      ? "indeterminate"
      : CombineCompatibility<
          SchemaTypeCompatibility<TExpectedSchema, TActualSchema>,
          CombineCompatibility<
            StaticFiniteArrayMemberCompatibility<TExpectedSchema, TActualSchema>,
            StaticSchemaCompatibility<TExpectedSchema, TActualSchema>
          >
        >;

type StaticFinitePrefixItemCompatibility<
  TExpected extends readonly unknown[],
  TActual extends readonly unknown[]
> = number extends TExpected["length"] | TActual["length"]
  ? "indeterminate"
  : TExpected extends readonly [infer TExpectedHead, ...infer TExpectedTail]
    ? TActual extends readonly [infer TActualHead, ...infer TActualTail]
      ? CombineCompatibility<
          SchemaTypeCompatibility<TExpectedHead, TActualHead>,
          StaticFinitePrefixItemCompatibility<TExpectedTail, TActualTail>
        >
      : "compatible"
    : "compatible";

type StaticFiniteArrayMemberCompatibility<TExpectedSchema, TActualSchema> =
  CombineCompatibility<
    TExpectedSchema extends { readonly items: infer TExpectedItems }
      ? TActualSchema extends { readonly items: infer TActualItems }
        ? SchemaTypeCompatibility<TExpectedItems, TActualItems>
        : "indeterminate"
      : "compatible",
    TExpectedSchema extends { readonly prefixItems: infer TExpectedPrefix extends readonly unknown[] }
      ? TActualSchema extends { readonly prefixItems: infer TActualPrefix extends readonly unknown[] }
        ? StaticFinitePrefixItemCompatibility<TExpectedPrefix, TActualPrefix>
        : "indeterminate"
      : "compatible"
  >;

type StaticTypeDescriptorCompatibility<
  TExpected,
  TActual,
  TActualFallbackSchema = undefined
> = TExpected extends object
  ? CombineCompatibility<
      StaticTsCompatibility<TExpected, TActual>,
      TExpected extends { readonly schema: unknown }
        ? DescriptorSchema<TActual, TActualFallbackSchema> extends infer TActualSchema
          ? [TActualSchema] extends [undefined]
            ? "incompatible"
            : StaticDescriptorSchemaCompatibility<DescriptorSchema<TExpected>, TActualSchema>
          : never
        : "compatible"
    >
  : "compatible";

/** Recursively collect inline nodes from one authored input value. */
type InlineNodesFromInput<TInput> =
  TInput extends { readonly kind: "inline"; readonly node: infer TNode extends AuthoredGraphNode }
    ? TNode | InlineNodesFromNode<TNode>
    : TInput extends { readonly kind: "fragmentCollection"; readonly items: infer TItems extends readonly unknown[] }
      ? InlineNodesFromInput<TItems[number]>
      : never;

/** Recursively collect inline nodes nested in any input of one node. */
type InlineNodesFromNode<TNode extends AuthoredGraphNode> =
  TNode extends AuthoredGraphNode
    ? InlineNodesFromInput<TNode["inputs"][keyof TNode["inputs"]]>
    : never;

/** Every top-level and recursively inline authored node. */
type AllAuthoredNodes<TGraph extends AuthoredGraphInput> =
  TGraph["nodes"][number] | InlineNodesFromNode<TGraph["nodes"][number]>;

/** Union of all node IDs in the runtime-equivalent flattened graph. */
type AuthoredNodeId<TGraph extends AuthoredGraphInput> = AllAuthoredNodes<TGraph>["id"];

/** Index top-level and recursively inline graph nodes by their global ID. */
type NodeIndex<TGraph extends AuthoredGraphInput> = {
  readonly [TNode in AllAuthoredNodes<TGraph> as TNode["id"]]: TNode;
};

// Build a producer map from authored graph nodes so fragment inputs can narrow
// refs to nodes whose output kind and source model constraints are compatible.
type ProducerIndex<
  TTemplateIndex,
  TGraph extends AuthoredGraphInput
> = {
  readonly [TNode in AllAuthoredNodes<TGraph> as TNode["id"]]:
    TemplateByModelId<TTemplateIndex, TNode["templateId"]> extends infer TTemplate extends GraphTemplateDefinition<any, string, any>
      ? {
          readonly modelId: TTemplate["modelId"];
          readonly output: TemplateOutput<TTemplate>;
        }
      : never;
};

type RequiredInputKeys<TInputs extends Record<string, InputPort>> = {
  [K in keyof TInputs]-?: TInputs[K] extends { readonly required: false } ? never : K;
}[keyof TInputs];

/** Input keys that may be omitted because their ports are marked optional. */
type OptionalInputKeys<TInputs extends Record<string, InputPort>> = {
  [K in keyof TInputs]-?: TInputs[K] extends { readonly required: false } ? K : never;
}[keyof TInputs];

/** Graph input shape accepted by literal ports. */
type LiteralSynthesisInput = {
  readonly kind: "literal";
  readonly value: unknown;
};

/** Graph input shape accepted by raw-code ports. */
type RawCodeSynthesisInput = {
  readonly kind: "rawCode";
  readonly code: string;
};

/** Resolve the fragment output kind expected by a fragment port. */
type FragmentExpectedOutputKind<TPort extends FragmentInputPort | FragmentCollectionInputPort> =
  TPort["accepts"] extends { readonly outputKind: infer O extends RegionKind } ? O : TPort["regionKind"];

/** Check a producer model ID against a fragment port source allowlist. */
type FragmentAcceptsSourceModel<
  TPort extends FragmentInputPort | FragmentCollectionInputPort,
  TModelId extends string
> =
  TPort["accepts"] extends { readonly sourceModelIds: readonly string[] }
    ? TModelId extends TPort["accepts"]["sourceModelIds"][number] ? true : false
    : true;

/** Prove advertised producer metadata against a fragment-port type contract. */
type FragmentTypeCompatibility<
  TPort extends FragmentInputPort | FragmentCollectionInputPort,
  TOutput extends OutputPort
> = TPort["accepts"] extends { readonly type: infer TExpectedType }
  ? StaticTypeDescriptorCompatibility<
      TExpectedType,
      TOutput extends { readonly type: infer TActualType } ? TActualType : undefined,
      TOutput extends { readonly schema: infer TActualSchema } ? TActualSchema : undefined
    >
  : "compatible";

/** Return the node ID only when the producer satisfies a fragment port. */
type FragmentCompatibleNodeId<
  TProducerIndex,
  TPort extends FragmentInputPort | FragmentCollectionInputPort,
  TNodeId extends string
> =
  TNodeId extends keyof TProducerIndex
    ? TProducerIndex[TNodeId] extends { readonly modelId: infer TModelId extends string; readonly output: infer TOutput extends OutputPort }
      ? TOutput["kind"] extends FragmentExpectedOutputKind<TPort>
        ? FragmentAcceptsSourceModel<TPort, TModelId> extends true
          ? FragmentTypeCompatibility<TPort, TOutput> extends "incompatible"
            ? never
            : TNodeId
          : never
        : never
      : never
    : never;

/** Union of all authored node IDs compatible with one fragment port. */
type CompatibleFragmentNodeIds<
  TProducerIndex,
  TPort extends FragmentInputPort | FragmentCollectionInputPort
> = {
  [K in Extract<keyof TProducerIndex, string>]: FragmentCompatibleNodeId<TProducerIndex, TPort, K>;
}[Extract<keyof TProducerIndex, string>];

/** Resolve one authored ref target under complete or repair-oriented rules. */
type StrictFragmentReferenceNodeId<
  TProducerIndex,
  TPort extends FragmentInputPort | FragmentCollectionInputPort,
  TNodeId extends string,
  TCompleteness extends SynthesisGraphCompleteness
> = TCompleteness extends "partial"
  ? TNodeId extends keyof TProducerIndex
    ? Extract<TNodeId, CompatibleFragmentNodeIds<TProducerIndex, TPort>>
    : TNodeId
  : Extract<TNodeId, CompatibleFragmentNodeIds<TProducerIndex, TPort>>;

/** Check an inline node's selected producer template against a fragment port. */
type InlineNodeIsCompatible<
  TTemplateIndex,
  TPort extends FragmentInputPort | FragmentCollectionInputPort,
  TNode extends AuthoredGraphNode,
  TTemplate = TemplateByModelId<TTemplateIndex, TNode["templateId"]>
> =
  TTemplate extends GraphTemplateDefinition<any, infer TModelId extends string, infer TOutput extends OutputPort>
    ? TOutput["kind"] extends FragmentExpectedOutputKind<TPort>
      ? FragmentAcceptsSourceModel<TPort, TModelId> extends true
        ? FragmentTypeCompatibility<TPort, TOutput> extends "incompatible" ? false : true
        : false
      : false
    : false;

/** Recursively validate one ref or inline producer against a fragment port. */
type StrictFragmentInput<
  TTemplateIndex,
  TProducerIndex,
  TPort extends FragmentInputPort | FragmentCollectionInputPort,
  TActual,
  TCompleteness extends SynthesisGraphCompleteness
> =
  TActual extends { readonly kind: "ref"; readonly nodeId: infer TNodeId extends string }
    ? TActual & {
        readonly kind: "ref";
        readonly nodeId: StrictFragmentReferenceNodeId<TProducerIndex, TPort, TNodeId, TCompleteness>;
      }
    : TActual extends { readonly "$ref": infer TNodeId extends string }
      ? TActual & {
          readonly "$ref": StrictFragmentReferenceNodeId<TProducerIndex, TPort, TNodeId, TCompleteness>;
        }
      : TActual extends { readonly kind: "inline"; readonly node: infer TNode extends AuthoredGraphNode }
        ? InlineNodeIsCompatible<TTemplateIndex, TPort, TNode> extends true
          ? TActual & {
              readonly kind: "inline";
              readonly node: StrictSynthesisNode<TTemplateIndex, TProducerIndex, TNode, TCompleteness>;
            }
          : never
        : never;

/** Preserve tuple positions while recursively validating collection items. */
type StrictFragmentCollectionItems<
  TTemplateIndex,
  TProducerIndex,
  TPort extends FragmentCollectionInputPort,
  TItems extends readonly unknown[],
  TCompleteness extends SynthesisGraphCompleteness
> = number extends TItems["length"]
  ? ReadonlyArray<StrictFragmentInput<TTemplateIndex, TProducerIndex, TPort, TItems[number], TCompleteness>>
  : { readonly [K in keyof TItems]: StrictFragmentInput<TTemplateIndex, TProducerIndex, TPort, TItems[K], TCompleteness> };

// Validate an actual authored input against one concrete port while retaining
// the actual shape needed for recursive inline-node inference.
type StrictSynthesisInputForPort<
  TTemplateIndex,
  TPort extends InputPort,
  TProducerIndex,
  TActual,
  TCompleteness extends SynthesisGraphCompleteness
> =
  TPort extends LiteralInputPort
    ? TActual extends { readonly kind: "literal"; readonly value: infer TValue }
      ? TPort extends { readonly schema: infer TSchema }
        ? StaticValueMatchesSchema<TValue, TSchema> extends "incompatible"
          ? never
          : TActual & LiteralSynthesisInput
        : TActual & LiteralSynthesisInput
      : never :
  TPort extends FragmentInputPort ? StrictFragmentInput<TTemplateIndex, TProducerIndex, TPort, TActual, TCompleteness> :
  TPort extends FragmentCollectionInputPort
    ? TActual extends { readonly kind: "fragmentCollection"; readonly items: infer TItems extends readonly unknown[] }
      ? TActual & {
          readonly kind: "fragmentCollection";
          readonly items: StrictFragmentCollectionItems<TTemplateIndex, TProducerIndex, TPort, TItems, TCompleteness>;
        }
      : never :
  TPort extends RawCodeInputPort ? TActual & RawCodeSynthesisInput :
  TPort extends UnionInputPort ? StrictSynthesisInputForPort<TTemplateIndex, TPort["options"][number], TProducerIndex, TActual, TCompleteness> :
  never;

type SynthesisInputsForPorts<
  TTemplateIndex,
  TInputs extends Record<string, InputPort>,
  TActualInputs extends Record<string, unknown>,
  TProducerIndex,
  TCompleteness extends SynthesisGraphCompleteness,
> = TCompleteness extends "partial"
  ? {
      readonly [K in keyof TInputs]?: StrictSynthesisInputForPort<
        TTemplateIndex,
        TInputs[K],
        TProducerIndex,
        K extends keyof TActualInputs ? TActualInputs[K] : never,
        "partial"
      >;
    }
  : {
      readonly [K in RequiredInputKeys<TInputs>]: StrictSynthesisInputForPort<
        TTemplateIndex,
        TInputs[K],
        TProducerIndex,
        K extends keyof TActualInputs ? TActualInputs[K] : never,
        "complete"
      >;
    } & {
      readonly [K in OptionalInputKeys<TInputs>]?: StrictSynthesisInputForPort<
        TTemplateIndex,
        TInputs[K],
        TProducerIndex,
        K extends keyof TActualInputs ? TActualInputs[K] : never,
        "complete"
      >;
    };

/** Mark properties outside the expected shape as `never`. */
type NoExtraProperties<TExpected, TActual> = {
  readonly [K in Exclude<keyof TActual, keyof TExpected>]: never;
};

/** Require empty input objects for templates with no declared inputs. */
type StrictEmptyInputMap<TActualInputs extends Record<string, unknown>> =
  keyof TActualInputs extends never
    ? TActualInputs
    : never;

/** Exact graph input map for one node's selected template. */
type StrictSynthesisInputMap<
  TTemplateIndex,
  TInputs extends Record<string, InputPort>,
  TActualInputs extends Record<string, unknown>,
  TProducerIndex,
  TCompleteness extends SynthesisGraphCompleteness
> =
  keyof TInputs extends never
    ? StrictEmptyInputMap<TActualInputs>
    : SynthesisInputsForPorts<TTemplateIndex, TInputs, TActualInputs, TProducerIndex, TCompleteness> extends infer TExpected
      ? TExpected extends Record<string, unknown>
        ? TActualInputs &
          TExpected &
          NoExtraProperties<TExpected, TActualInputs>
        : never
      : never;

/** Exact checked graph node shape for one authored node. */
type StrictSynthesisNode<
  TTemplateIndex,
  TProducerIndex,
  TNode extends AuthoredGraphNode,
  TCompleteness extends SynthesisGraphCompleteness,
  TTemplate = TemplateByModelId<TTemplateIndex, TNode["templateId"]>,
  TInputs extends Record<string, InputPort> = TemplateInputMap<TTemplate>
> =
  TNode &
  {
    readonly id: TNode["id"];
    readonly templateId: TemplateModelId<TTemplateIndex>;
    readonly inputs: keyof TInputs extends never
      ? StrictEmptyInputMap<TNode["inputs"]>
      : StrictSynthesisInputMap<
          TTemplateIndex,
          TInputs,
          TNode["inputs"],
          TProducerIndex,
          TCompleteness
        >;
  } &
  NoExtraProperties<{
    readonly id: string;
    readonly templateId: string;
    readonly inputs: Record<string, unknown>;
      }, TNode>;

/** Exact checked node-list shape that preserves tuple positions when possible. */
type StrictSynthesisNodeList<
  TTemplateIndex,
  TProducerIndex,
  TNodes extends readonly AuthoredGraphNode[],
  TCompleteness extends SynthesisGraphCompleteness,
> =
  number extends TNodes["length"]
    ? ReadonlyArray<StrictSynthesisNode<TTemplateIndex, TProducerIndex, TNodes[number], TCompleteness>>
    : { readonly [K in keyof TNodes]: TNodes[K] extends AuthoredGraphNode
        ? StrictSynthesisNode<TTemplateIndex, TProducerIndex, TNodes[K], TCompleteness>
        : TNodes[K]
      };

/** Shape-only graph checking used when literal tuple information is unavailable. */
type LooseAuthoredSynthesisGraph<TGraph extends AuthoredGraphInput> =
  TGraph &
  NoExtraProperties<{
    readonly nodes: readonly AuthoredGraphNode[];
    readonly finalNodeId: string;
    readonly goal?: SynthesisGoal;
  }, TGraph>;

/** One node occurrence branded by its unique authored object path. */
type NodeOccurrence<TNode extends AuthoredGraphNode, TPath extends string> = {
  readonly id: TNode["id"];
  readonly path: TPath;
};

type TupleKeys<TItems extends readonly unknown[]> = Exclude<keyof TItems, keyof readonly unknown[]>;

type InputNodeOccurrences<TInput, TPath extends string> =
  TInput extends { readonly kind: "inline"; readonly node: infer TNode extends AuthoredGraphNode }
    ? NodeOccurrences<TNode, `${TPath}.node`>
    : TInput extends { readonly kind: "fragmentCollection"; readonly items: infer TItems extends readonly unknown[] }
      ? {
          [K in TupleKeys<TItems>]: InputNodeOccurrences<TItems[K], `${TPath}.items.${K & string}`>
        }[TupleKeys<TItems>]
      : never;

type NestedNodeOccurrences<TNode extends AuthoredGraphNode, TPath extends string> = {
  [K in keyof TNode["inputs"]]: InputNodeOccurrences<
    TNode["inputs"][K],
    `${TPath}.inputs.${K & string}`
  >
}[keyof TNode["inputs"]];

type NodeOccurrences<TNode extends AuthoredGraphNode, TPath extends string> =
  | NodeOccurrence<TNode, TPath>
  | NestedNodeOccurrences<TNode, TPath>;

type GraphNodeOccurrences<TGraph extends AuthoredGraphInput> = {
  [K in TupleKeys<TGraph["nodes"]>]: TGraph["nodes"][K] extends AuthoredGraphNode
    ? NodeOccurrences<TGraph["nodes"][K], `nodes.${K & string}`>
    : never
}[TupleKeys<TGraph["nodes"]>];

/** True only when T contains more than one distinct union member. */
type IsUnion<T, TWhole = T> = T extends unknown
  ? [TWhole] extends [T] ? false : true
  : never;

type OccurrencePathsForId<TGraph extends AuthoredGraphInput, TId extends string> =
  Extract<GraphNodeOccurrences<TGraph>, { readonly id: TId }>["path"];

type GraphOccurrenceIds<TGraph extends AuthoredGraphInput> =
  GraphNodeOccurrences<TGraph> extends infer TOccurrence
    ? TOccurrence extends { readonly id: infer TId extends string } ? TId : never
    : never;

/** IDs appearing at two or more authored paths in the flattened graph. */
type DuplicateNodeIds<TGraph extends AuthoredGraphInput> = {
  [TId in GraphOccurrenceIds<TGraph>]:
    true extends IsUnion<OccurrencePathsForId<TGraph, TId>> ? TId : never
}[GraphOccurrenceIds<TGraph>];

type GoalOutputKindCompatibility<TGoal extends SynthesisGoal, TOutput extends OutputPort> =
  TGoal extends { readonly outputKind: infer TExpectedKind extends RegionKind }
    ? TOutput["kind"] extends TExpectedKind ? "compatible" : "incompatible"
    : "compatible";

type GoalTypeCompatibility<TGoal extends SynthesisGoal, TOutput extends OutputPort> =
  CombineCompatibility<
    TGoal extends { readonly type: infer TExpectedType }
      ? StaticTypeDescriptorCompatibility<
          TExpectedType,
          TOutput extends { readonly type: infer TActualType } ? TActualType : undefined,
          TOutput extends { readonly schema: infer TActualSchema } ? TActualSchema : undefined
        >
      : "compatible",
    TGoal extends { readonly schema: infer TExpectedSchema }
      ? DescriptorSchema<
          TOutput extends { readonly type: infer TActualType } ? TActualType : undefined,
          TOutput extends { readonly schema: infer TActualSchema } ? TActualSchema : undefined
        > extends infer TActualSchema
        ? [TActualSchema] extends [undefined]
          ? "incompatible"
          : StaticSchemaCompatibility<TExpectedSchema, TActualSchema>
        : never
      : "compatible"
  >;

type StrictGoalForFinalNode<
  TProducerIndex,
  TGoal extends SynthesisGoal,
  TFinalNodeId extends string
> = TFinalNodeId extends keyof TProducerIndex
  ? TProducerIndex[TFinalNodeId] extends { readonly output: infer TOutput extends OutputPort }
    ? CombineCompatibility<
        GoalOutputKindCompatibility<TGoal, TOutput>,
        GoalTypeCompatibility<TGoal, TOutput>
      > extends "incompatible"
      ? never
      : TGoal
    : TGoal
  : TGoal;

type StrictGraphGoal<
  TProducerIndex,
  TGraph extends AuthoredGraphInput
> = TGraph extends { readonly goal: infer TGoal extends SynthesisGoal }
  ? StrictGoalForFinalNode<TProducerIndex, TGoal, TGraph["finalNodeId"]>
  : SynthesisGoal;

// Strict checking is possible only when both the template catalog and node list
// are finite tuples with literal IDs. Wider arrays fall back to shape checking.
type StrictFiniteSynthesisGraph<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[],
  TGraph extends AuthoredGraphInput,
  TCompleteness extends SynthesisGraphCompleteness,
  TTemplateIndex = TemplateIndex<TTemplates>,
  TNodeIndex = NodeIndex<TGraph>,
  TProducerIndex = ProducerIndex<TTemplateIndex, TGraph>
> =
  DuplicateNodeIds<TGraph> extends never ? TGraph &
  {
    readonly nodes: StrictSynthesisNodeList<TTemplateIndex, TProducerIndex, TGraph["nodes"], TCompleteness>;
    readonly finalNodeId: TCompleteness extends "partial"
      ? string
      : Extract<keyof TNodeIndex, string>;
    readonly goal?: StrictGraphGoal<TProducerIndex, TGraph>;
  } &
  NoExtraProperties<{
    readonly nodes: readonly AuthoredGraphNode[];
    readonly finalNodeId: string;
    readonly goal?: SynthesisGoal;
  }, TGraph> : never;

/** Compile-time checked graph shape used by authored graph helpers. */
export type StrictSynthesisGraph<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[],
  TGraph extends AuthoredGraphInput
> =
  IsTuple<TTemplates> extends true
    ? IsTuple<TGraph["nodes"]> extends true
      ? IsWidenedString<AuthoredNodeId<TGraph>> extends true
        ? LooseAuthoredSynthesisGraph<TGraph>
        : StrictFiniteSynthesisGraph<TTemplates, TGraph, "complete">
      : LooseAuthoredSynthesisGraph<TGraph>
    : LooseAuthoredSynthesisGraph<TGraph>;

/**
 * Compile-time checked partial graph shape used by repair-oriented helpers.
 *
 * Partial graphs may omit required inputs and may contain dangling references
 * or a dangling final node ID. Supplied inputs, known reference targets,
 * recursively inline nodes, template IDs, and global node-ID uniqueness remain
 * checked against the finite catalog whenever literal analysis is available.
 */
export type StrictPartialSynthesisGraph<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[],
  TGraph extends AuthoredGraphInput
> =
  IsTuple<TTemplates> extends true
    ? IsTuple<TGraph["nodes"]> extends true
      ? IsWidenedString<AuthoredNodeId<TGraph>> extends true
        ? LooseAuthoredSynthesisGraph<TGraph>
        : StrictFiniteSynthesisGraph<TTemplates, TGraph, "partial">
      : LooseAuthoredSynthesisGraph<TGraph>
    : LooseAuthoredSynthesisGraph<TGraph>;

declare const definedSynthesisGraphBrand: unique symbol;

/**
 * Type-only marker attached to graphs returned by `defineGraph`.
 *
 * This lets APIs accept an already-checked graph with its template catalog
 * without re-instantiating the full strict graph constraint.
 */
export type DefinedSynthesisGraph<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[]
> = SynthesisGraph & {
  readonly [definedSynthesisGraphBrand]: TTemplates;
};

declare const definedPartialSynthesisGraphBrand: unique symbol;

/** Type-only marker attached to partial graphs returned by `definePartialGraph`. */
export type DefinedPartialSynthesisGraph<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[]
> = SynthesisGraph & {
  readonly [definedPartialSynthesisGraphBrand]: TTemplates;
};
