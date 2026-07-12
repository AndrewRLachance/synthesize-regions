import type { Exact } from "type-fest";
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
      Exact<Omit<UnionInputPort, "options">, Omit<T, "options">> & {
        readonly options: StrictInputPortList<T["options"]>;
      }
    : never;

/** Compile-time exact input-port shape used by template authoring helpers. */
export type StrictInputPort<T extends InputPort> =
  T extends LiteralInputPort ? T & Exact<LiteralInputPort, T> :
  T extends FragmentInputPort ? T & Exact<FragmentInputPort, T> :
  T extends FragmentCollectionInputPort ? T & Exact<FragmentCollectionInputPort, T> :
  T extends RawCodeInputPort ? T & Exact<RawCodeInputPort, T> :
  T extends UnionInputPort ? StrictUnionInputPort<T> :
  never;

/** Exact union-port input accepted by the `unionPort` helper before `kind` is added. */
export type StrictUnionPortInput<T extends Omit<UnionInputPort, "kind">> =
  FiniteUnionOptionsAreValid<T["options"]> extends true
    ? T &
      Exact<Omit<UnionInputPort, "kind" | "options">, Omit<T, "options">> & {
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
export type StrictOutputPort<T extends OutputPort> = T & Exact<OutputPort, T>;

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
          ? TNodeId
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

/** Check an inline node's selected producer template against a fragment port. */
type InlineNodeIsCompatible<
  TTemplateIndex,
  TPort extends FragmentInputPort | FragmentCollectionInputPort,
  TNode extends AuthoredGraphNode,
  TTemplate = TemplateByModelId<TTemplateIndex, TNode["templateId"]>
> =
  TTemplate extends GraphTemplateDefinition<any, infer TModelId extends string, infer TOutput extends OutputPort>
    ? TOutput["kind"] extends FragmentExpectedOutputKind<TPort>
      ? FragmentAcceptsSourceModel<TPort, TModelId>
      : false
    : false;

/** Recursively validate one ref or inline producer against a fragment port. */
type StrictFragmentInput<
  TTemplateIndex,
  TProducerIndex,
  TPort extends FragmentInputPort | FragmentCollectionInputPort,
  TActual
> =
  TActual extends { readonly kind: "ref"; readonly nodeId: infer TNodeId extends string }
    ? TActual & { readonly kind: "ref"; readonly nodeId: Extract<TNodeId, CompatibleFragmentNodeIds<TProducerIndex, TPort>> }
    : TActual extends { readonly "$ref": infer TNodeId extends string }
      ? TActual & { readonly "$ref": Extract<TNodeId, CompatibleFragmentNodeIds<TProducerIndex, TPort>> }
      : TActual extends { readonly kind: "inline"; readonly node: infer TNode extends AuthoredGraphNode }
        ? InlineNodeIsCompatible<TTemplateIndex, TPort, TNode> extends true
          ? TActual & {
              readonly kind: "inline";
              readonly node: StrictSynthesisNode<TTemplateIndex, TProducerIndex, TNode>;
            }
          : never
        : never;

/** Preserve tuple positions while recursively validating collection items. */
type StrictFragmentCollectionItems<
  TTemplateIndex,
  TProducerIndex,
  TPort extends FragmentCollectionInputPort,
  TItems extends readonly unknown[]
> = number extends TItems["length"]
  ? ReadonlyArray<StrictFragmentInput<TTemplateIndex, TProducerIndex, TPort, TItems[number]>>
  : { readonly [K in keyof TItems]: StrictFragmentInput<TTemplateIndex, TProducerIndex, TPort, TItems[K]> };

// Validate an actual authored input against one concrete port while retaining
// the actual shape needed for recursive inline-node inference.
type StrictSynthesisInputForPort<
  TTemplateIndex,
  TPort extends InputPort,
  TProducerIndex,
  TActual
> =
  TPort extends LiteralInputPort ? TActual & LiteralSynthesisInput :
  TPort extends FragmentInputPort ? StrictFragmentInput<TTemplateIndex, TProducerIndex, TPort, TActual> :
  TPort extends FragmentCollectionInputPort
    ? TActual extends { readonly kind: "fragmentCollection"; readonly items: infer TItems extends readonly unknown[] }
      ? TActual & {
          readonly kind: "fragmentCollection";
          readonly items: StrictFragmentCollectionItems<TTemplateIndex, TProducerIndex, TPort, TItems>;
        }
      : never :
  TPort extends RawCodeInputPort ? TActual & RawCodeSynthesisInput :
  TPort extends UnionInputPort ? StrictSynthesisInputForPort<TTemplateIndex, TPort["options"][number], TProducerIndex, TActual> :
  never;

type SynthesisInputsForPorts<
  TTemplateIndex,
  TInputs extends Record<string, InputPort>,
  TActualInputs extends Record<string, unknown>,
  TProducerIndex,
> = {
  readonly [K in RequiredInputKeys<TInputs>]: StrictSynthesisInputForPort<
    TTemplateIndex,
    TInputs[K],
    TProducerIndex,
    K extends keyof TActualInputs ? TActualInputs[K] : never
  >;
} & {
  readonly [K in OptionalInputKeys<TInputs>]?: StrictSynthesisInputForPort<
    TTemplateIndex,
    TInputs[K],
    TProducerIndex,
    K extends keyof TActualInputs ? TActualInputs[K] : never
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
  TProducerIndex
> =
  keyof TInputs extends never
    ? StrictEmptyInputMap<TActualInputs>
    : SynthesisInputsForPorts<TTemplateIndex, TInputs, TActualInputs, TProducerIndex> extends infer TExpected
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
          TProducerIndex
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
> =
  number extends TNodes["length"]
    ? ReadonlyArray<StrictSynthesisNode<TTemplateIndex, TProducerIndex, TNodes[number]>>
    : { readonly [K in keyof TNodes]: TNodes[K] extends AuthoredGraphNode
        ? StrictSynthesisNode<TTemplateIndex, TProducerIndex, TNodes[K]>
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

// Strict checking is possible only when both the template catalog and node list
// are finite tuples with literal IDs. Wider arrays fall back to shape checking.
type StrictFiniteSynthesisGraph<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[],
  TGraph extends AuthoredGraphInput,
  TTemplateIndex = TemplateIndex<TTemplates>,
  TNodeIndex = NodeIndex<TGraph>,
  TProducerIndex = ProducerIndex<TTemplateIndex, TGraph>
> =
  DuplicateNodeIds<TGraph> extends never ? TGraph &
  {
    readonly nodes: StrictSynthesisNodeList<TTemplateIndex, TProducerIndex, TGraph["nodes"]>;
    readonly finalNodeId: Extract<keyof TNodeIndex, string>;
    readonly goal?: SynthesisGoal;
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
        : StrictFiniteSynthesisGraph<TTemplates, TGraph>
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
