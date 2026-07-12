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
  SynthesisNode,
  UnionInputPort
} from "./graphCoreTypes.js";

/** Preserve tuple positions while making each union option an exact port shape. */
type StrictInputPortList<T extends readonly InputPort[]> =
  number extends T["length"]
    ? ReadonlyArray<StrictInputPort<T[number]>>
    : { readonly [K in keyof T]: T[K] extends InputPort ? StrictInputPort<T[K]> : T[K] };

type StrictUnionInputPort<T extends UnionInputPort> =
  T &
  Exact<Omit<UnionInputPort, "options">, Omit<T, "options">> & {
    readonly options: StrictInputPortList<T["options"]>;
  };

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
  T &
  Exact<Omit<UnionInputPort, "kind" | "options">, Omit<T, "options">> & {
    readonly options: StrictInputPortList<T["options"]>;
  };

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

/** Union of node IDs authored in one graph. */
type AuthoredNodeId<TGraph extends AuthoredGraphInput> =
  TGraph["nodes"][number]["id"];

/** Index authored graph nodes by node ID. */
type NodeIndex<TGraph extends AuthoredGraphInput> = {
  readonly [TNode in TGraph["nodes"][number] as TNode["id"]]: TNode;
};

// Build a producer map from authored graph nodes so fragment inputs can narrow
// refs to nodes whose output kind and source model constraints are compatible.
type ProducerIndex<
  TTemplateIndex,
  TGraph extends AuthoredGraphInput
> = {
  readonly [TNode in TGraph["nodes"][number] as TNode["id"]]:
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

/** Reference input forms accepted for a compatible producer node ID. */
type RefSynthesisInput<TNodeId extends string> =
  | {
      readonly kind: "ref";
      readonly nodeId: TNodeId;
    }
  | {
      readonly "$ref": TNodeId;
    }
  | {
      readonly kind: "inline";
      readonly node: SynthesisNode;
    };

type FragmentCollectionSynthesisInput<TNodeId extends string> = {
  readonly kind: "fragmentCollection";
  readonly items: ReadonlyArray<RefSynthesisInput<TNodeId>>;
};

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

// Convert each template input port into the graph input shape an author may
// provide, preserving literal/raw/fragment distinctions and union alternatives.
type SynthesisInputForPort<
  TPort extends InputPort,
  TNodeId extends string,
  TProducerIndex
> =
  TPort extends LiteralInputPort ? LiteralSynthesisInput :
  TPort extends FragmentInputPort ? RefSynthesisInput<CompatibleFragmentNodeIds<TProducerIndex, TPort>> :
  TPort extends FragmentCollectionInputPort ? FragmentCollectionSynthesisInput<CompatibleFragmentNodeIds<TProducerIndex, TPort>> :
  TPort extends RawCodeInputPort ? RawCodeSynthesisInput :
  TPort extends UnionInputPort ? SynthesisInputForPort<TPort["options"][number], TNodeId, TProducerIndex> :
  never;

type SynthesisInputsForPorts<
  TInputs extends Record<string, InputPort>,
  TNodeId extends string,
  TProducerIndex
> = {
  readonly [K in RequiredInputKeys<TInputs>]: SynthesisInputForPort<TInputs[K], TNodeId, TProducerIndex>;
} & {
  readonly [K in OptionalInputKeys<TInputs>]?: SynthesisInputForPort<TInputs[K], TNodeId, TProducerIndex>;
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
  TInputs extends Record<string, InputPort>,
  TActualInputs extends Record<string, unknown>,
  TNodeId extends string,
  TProducerIndex
> =
  keyof TInputs extends never
    ? StrictEmptyInputMap<TActualInputs>
    : SynthesisInputsForPorts<TInputs, TNodeId, TProducerIndex> extends infer TExpected
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
          TInputs,
          TNode["inputs"],
          TNode["id"],
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

// Strict checking is possible only when both the template catalog and node list
// are finite tuples with literal IDs. Wider arrays fall back to shape checking.
type StrictFiniteSynthesisGraph<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[],
  TGraph extends AuthoredGraphInput,
  TTemplateIndex = TemplateIndex<TTemplates>,
  TNodeIndex = NodeIndex<TGraph>,
  TProducerIndex = ProducerIndex<TTemplateIndex, TGraph>
> =
  TGraph &
  {
    readonly nodes: StrictSynthesisNodeList<TTemplateIndex, TProducerIndex, TGraph["nodes"]>;
    readonly finalNodeId: Extract<keyof TNodeIndex, string>;
    readonly goal?: SynthesisGoal;
  } &
  NoExtraProperties<{
    readonly nodes: readonly AuthoredGraphNode[];
    readonly finalNodeId: string;
    readonly goal?: SynthesisGoal;
  }, TGraph>;

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
