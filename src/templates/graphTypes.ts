import type { GenerateOptions, MarkerExpectedKind, ReplacementMap } from "../core/types.js";
import type { Exact } from "type-fest";

export type RegionKind = MarkerExpectedKind;

/**
 * Optional type metadata used for graph compatibility checks.
 *
 * `ts` is a lightweight TypeScript type string, while `schema` is a supported
 * JSON Schema subset for literal values and fragment goals.
 */
export interface TypeDescriptor {
  /** Lightweight TypeScript type string used for conservative compatibility checks. */
  ts?: string;
  /** JSON Schema subset used for literal validation and schema compatibility. */
  schema?: unknown;
}

/** Planner-facing suggestion for how to repair a diagnostic. */
export interface SynthesisRepairHint {
  /** Machine-readable repair category. */
  kind: string;
  /** Human-readable repair suggestion. */
  message: string;
  /** Additional repair-specific metadata. */
  [key: string]: unknown;
}

/** Structured validation or compilation issue emitted by graph compilation. */
export interface SynthesisDiagnostic {
  /** Pipeline stage that produced the diagnostic. */
  stage:
    | "graph"
    | "template"
    | "input"
    | "port"
    | "region"
    | "ast"
    | "type"
    | "policy";
  /** Machine-readable diagnostic code. */
  code: string;
  /** Diagnostic severity. */
  severity: "error" | "warning";
  /** Human-readable diagnostic message. */
  message: string;
  /** Graph node ID associated with the diagnostic, when available. */
  nodeId?: string;
  /** Template model ID associated with the diagnostic, when available. */
  templateId?: string;
  /** Template input name associated with the diagnostic, when available. */
  inputName?: string;
  /** Path to the problematic graph or input value, when available. */
  path?: string;
  /** Expected value, type, schema, or port metadata. */
  expected?: unknown;
  /** Actual value, type, schema, or error metadata. */
  actual?: unknown;
  /** Optional suggestions for repairing planner-provided input. */
  repairHints?: SynthesisRepairHint[];
}

/**
 * Code produced by a graph template invocation.
 *
 * Fragments carry their syntactic region kind plus optional type/schema
 * metadata so downstream fragment ports can validate compatibility.
 */
export interface GeneratedFragment {
  /** Graph node ID that produced the fragment, when available. */
  id?: string;
  /** Generated TypeScript source fragment. */
  code: string;
  /** Syntactic region kind of the generated fragment. */
  kind: RegionKind;
  /** Template identity that produced the fragment. */
  source: {
    /** Template model ID that produced the fragment. */
    templateId: string;
    /** Template version that produced the fragment, when provided. */
    templateVersion?: string;
  };
  /** Optional TypeScript/JSON-schema type metadata for compatibility checks. */
  type?: TypeDescriptor;
  /** Optional JSON Schema describing the generated value. */
  schema?: unknown;
  /** Optional lineage metadata for downstream inspection. */
  provenance?: {
    /** Graph node ID that produced the fragment. */
    nodeId?: string;
    /** Referenced fragment IDs consumed by this fragment. */
    inputRefs?: string[];
    /** Literal input values consumed by this fragment. */
    literalInputs?: Record<string, unknown>;
  };
  /** Diagnostics attached to this fragment, if a producer supplies them. */
  diagnostics?: SynthesisDiagnostic[];
}

/**
 * Opt-in restrictions for raw-code graph inputs before they reach generation.
 *
 * Raw code is still parsed and checked by the normal replacement security
 * policy after graph validation; this policy is an earlier planner-facing gate.
 */
export interface RawCodePolicy {
  /** Human-readable policy description for planners and summaries. */
  description?: string;
  /** Maximum number of characters accepted for the raw-code input. */
  maxLength?: number;
  /** Set to false to reject raw-code inputs containing CR or LF characters. */
  allowNewlines?: boolean;
  /** Literal substrings that must not appear in the raw-code input. */
  forbiddenSubstrings?: string[];
  /** Regular expression source strings matched with the `u` flag. */
  forbiddenPatterns?: string[];
}

/**
 * A template input contract. Each variant describes one accepted graph input
 * shape and the replacement region kind it will feed in the template source.
 */
export type InputPort =
  | LiteralInputPort
  | FragmentInputPort
  | RawCodeInputPort
  | UnionInputPort;

/** A JSON-like value validated with the supported schema subset. */
export interface LiteralInputPort {
  /** Port discriminator for JSON-like literal inputs. */
  kind: "literal";
  /** Replacement region kind the literal will feed. */
  regionKind: RegionKind;
  /** Optional JSON Schema subset used to validate the literal value. */
  schema?: unknown;
  /** Whether this input must be present; defaults to true. */
  required?: boolean;
  /** Human-readable input description for planners and summaries. */
  description?: string;
}

/** A reference to another generated fragment with kind/type/source checks. */
export interface FragmentInputPort {
  /** Port discriminator for graph fragment references. */
  kind: "fragment";
  /** Replacement region kind the referenced fragment will feed. */
  regionKind: RegionKind;
  /** Fragment compatibility requirements. */
  accepts: {
    /** Required output kind of the referenced fragment; defaults to `regionKind`. */
    outputKind?: RegionKind;
    /** Optional type metadata the referenced fragment must satisfy. */
    type?: TypeDescriptor;
    /** Optional allowlist of template model IDs that may produce the fragment. */
    sourceModelIds?: string[];
  };
  /** Whether this input must be present; defaults to true. */
  required?: boolean;
  /** Human-readable input description for planners and summaries. */
  description?: string;
}

/** A caller-provided TypeScript snippet gated by an optional raw-code policy. */
export interface RawCodeInputPort {
  /** Port discriminator for raw TypeScript snippets. */
  kind: "rawCode";
  /** Replacement region kind the raw code will feed. */
  regionKind: RegionKind;
  /** Optional planner-facing raw-code restrictions. */
  policy?: RawCodePolicy;
  /** Optional type metadata describing the raw-code snippet. */
  type?: TypeDescriptor;
  /** Whether this input must be present; defaults to true. */
  required?: boolean;
  /** Human-readable input description for planners and summaries. */
  description?: string;
}

/**
 * A port that accepts any one of several concrete input port shapes.
 *
 * The region builder currently emits one marker using the first option's
 * `regionKind`, so options should share a region kind unless the template body
 * is intentionally relying on that first-option marker.
 */
export interface UnionInputPort {
  /** Port discriminator for multi-shape inputs. */
  kind: "union";
  /** Ordered concrete port options accepted for this input. */
  options: InputPort[];
  /** Whether this input must be present; defaults to true. */
  required?: boolean;
  /** Human-readable input description for planners and summaries. */
  description?: string;
}

/** Output contract advertised by a graph template. */
export interface OutputPort {
  /** Syntactic region kind produced by the template. */
  kind: RegionKind;
  /** Optional TypeScript/JSON-schema type metadata for compatibility checks. */
  type?: TypeDescriptor;
  /** Optional JSON Schema describing the generated output. */
  schema?: unknown;
  /** Human-readable output description for planners and summaries. */
  description?: string;
}

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
  T extends RawCodeInputPort ? T & Exact<RawCodeInputPort, T> :
  T extends UnionInputPort ? StrictUnionInputPort<T> :
  never;

export type StrictUnionPortInput<T extends Omit<UnionInputPort, "kind">> =
  T &
  Exact<Omit<UnionInputPort, "kind" | "options">, Omit<T, "options">> & {
    readonly options: StrictInputPortList<T["options"]>;
  };

/** Compile-time exact input-port map used by graph template definitions. */
export type StrictInputPortMap<I extends Record<string, InputPort>> = {
  readonly [K in keyof I]: StrictInputPort<I[K]>;
};

/** Compile-time exact output-port shape used by template authoring helpers. */
export type StrictOutputPort<T extends OutputPort> = T & Exact<OutputPort, T>;

/** Declarative graph of template nodes with one requested final node. */
export interface SynthesisGraph {
  /** Nodes available to compile. */
  nodes: SynthesisNode[];
  /** Node ID whose fragment should be returned as the final result. */
  finalNodeId: string;
  /** Optional constraints for the final generated fragment. */
  goal?: SynthesisGoal;
}

/** One graph node: select a template and provide inputs by template port name. */
export interface SynthesisNode {
  /** Unique node identifier within the graph. */
  id: string;
  /** Template model ID to invoke for this node. */
  templateId: string;
  /** Inputs keyed by the selected template's port names. */
  inputs: Record<string, SynthesisInput>;
}

/**
 * Input value syntax accepted in graph definitions.
 *
 * `$ref` is shorthand for `{ kind: "ref", nodeId }`; `inline` nodes are
 * normalized into standalone nodes before validation.
 */
export type SynthesisInput =
  | {
      /** Input discriminator for JSON-like literal values. */
      kind: "literal";
      /** Literal value supplied to a literal port. */
      value: unknown;
    }
  | {
      /** Input discriminator for references to another graph node. */
      kind: "ref";
      /** Node ID whose generated fragment should feed the input. */
      nodeId: string;
    }
  | {
      /** Input discriminator for caller-provided TypeScript snippets. */
      kind: "rawCode";
      /** Raw TypeScript source supplied to a raw-code port. */
      code: string;
    }
  | {
      /** Input discriminator for nested nodes normalized before validation. */
      kind: "inline";
      /** Inline node definition to compile as an input dependency. */
      node: SynthesisNode;
    }
  | {
      /** Shorthand node reference equivalent to `{ kind: "ref", nodeId }`. */
      "$ref": string;
    };

/** Graph input shape after shorthand refs and inline nodes are expanded. */
export type NormalizedSynthesisInput = Exclude<SynthesisInput, { "$ref": string } | { kind: "inline"; node: SynthesisNode }>;

/** Result of graph normalization before validation and compilation. */
export interface GraphNormalizationResult {
  /** Graph after shorthand refs and inline nodes have been expanded. */
  graph: SynthesisGraph;
}

/** Optional final-fragment constraints checked after graph compilation. */
export interface SynthesisGoal {
  /** Final fragment region kind. */
  outputKind?: RegionKind;
  /** Final fragment type metadata. */
  type?: TypeDescriptor;
  /** Final fragment JSON Schema metadata. */
  schema?: unknown;
}

/** Public, implementation-free template metadata for planners and UIs. */
export interface TemplateSummary {
  /** Template model ID. */
  modelId: string;
  /** Template version, when provided by the definition. */
  version?: string;
  /** Human-readable template description. */
  description?: string;
  /** Summaries of accepted inputs keyed by input name. */
  inputs: Record<string, InputPortSummary>;
  /** Summary of the generated output. */
  output: OutputPortSummary;
}

/** Mutable registry used by graph compilation to resolve template IDs. */
export interface TemplateRegistry {
  /** Add or replace a template by its model ID. */
  register(template: GraphTemplateDefinition<any, string>): void;
  /** Look up a template by model ID. */
  get(templateId: string): GraphTemplateDefinition<any, string> | undefined;
  /** Return all registered templates. */
  list(): GraphTemplateDefinition<any, string>[];
  /** Return planner-facing summaries for all registered templates. */
  summaries(): TemplateSummary[];
}

/** Success or failure result returned by graph compilation. */
export type GraphCompilationResult =
  | {
      /** Success discriminator. */
      ok: true;
      /** Fragment produced by the graph's final node. */
      finalFragment: GeneratedFragment;
      /** All compiled fragments keyed by node ID. */
      fragments: Map<string, GeneratedFragment>;
      /** Non-fatal diagnostics collected during compilation. */
      diagnostics: SynthesisDiagnostic[];
    }
  | {
      /** Failure discriminator. */
      ok: false;
      /** Error and warning diagnostics collected during compilation. */
      diagnostics: SynthesisDiagnostic[];
      /** Fragments compiled before failure, when any were produced. */
      partialFragments?: Map<string, GeneratedFragment>;
    };

/** Concrete graph input after validation has matched it to a concrete port. */
export type ResolvedGraphInput =
  | {
      /** Resolved input discriminator for literal values. */
      kind: "literal";
      /** Validated literal value. */
      value: unknown;
      /** Concrete literal port that accepted the value. */
      port: LiteralInputPort;
    }
  | {
      /** Resolved input discriminator for generated fragments. */
      kind: "fragment";
      /** Referenced fragment that satisfied the fragment port. */
      fragment: GeneratedFragment;
      /** Concrete fragment port that accepted the fragment. */
      port: FragmentInputPort;
    }
  | {
      /** Resolved input discriminator for raw-code snippets. */
      kind: "rawCode";
      /** Raw TypeScript source accepted by the raw-code port. */
      code: string;
      /** Concrete raw-code port that accepted the snippet. */
      port: RawCodeInputPort;
    };

export interface GraphTemplateInvocation {
  /** Graph node ID for provenance, when invoked from graph compilation. */
  nodeId?: string;
  /** Inputs resolved and matched to concrete ports. */
  inputs: Record<string, ResolvedGraphInput>;
  /** Generation options forwarded to the replacement engine. */
  options?: GenerateOptions;
}

/** Helper available inside graph template source functions to mark regions. */
export type GraphRegionBuilder<I extends Record<string, InputPort>> =
  <K extends Extract<keyof I, string>>(key: K, body?: string) => string;

/**
 * Executable graph template definition.
 *
 * `defineTemplate` creates this shape from a declarative template definition
 * and wires invocation through the lower-level replacement engine.
 */
export interface GraphTemplateDefinition<
  I extends Record<string, InputPort> = Record<string, InputPort>,
  M extends string = string,
  O extends OutputPort = OutputPort
> {
  /** Stable template/model identifier used by graph nodes. */
  readonly modelId: M;
  /** Optional template version copied into generated fragment provenance. */
  readonly version?: string;
  /** Optional human-readable summary for planners and registries. */
  readonly description?: string;
  /** Named input ports accepted by this template. */
  readonly inputs: I;
  /** Output fragment contract produced by this template. */
  readonly output: O;
  /** Source-template factory that creates marked regions with `region`. */
  readonly template: (region: GraphRegionBuilder<I>) => string;
  /** Invoke the template with already-resolved graph inputs. */
  invoke(invocation: GraphTemplateInvocation): GeneratedFragment;
  /** Convert already-resolved graph inputs to a low-level replacement map. */
  toReplacementMap(inputs: Record<string, ResolvedGraphInput>): ReplacementMap;
  /** Produce planner-facing metadata without exposing template source. */
  summary(): TemplateSummary;
}

type AuthoredSynthesisNode = {
  readonly id: string;
  readonly templateId: string;
  readonly inputs: Record<string, unknown>;
};

type AuthoredSynthesisGraph = {
  readonly nodes: readonly AuthoredSynthesisNode[];
  readonly finalNodeId: string;
  readonly goal?: SynthesisGoal;
};

type IsTuple<T extends readonly unknown[]> =
  number extends T["length"] ? false : true;

type IsWidenedString<T> =
  string extends T ? true : false;

type TemplateIndex<TTemplates extends readonly GraphTemplateDefinition<any, string, any>[]> = {
  readonly [TTemplate in TTemplates[number] as TTemplate["modelId"]]: TTemplate;
};

type TemplateModelId<TTemplateIndex> =
  Extract<keyof TTemplateIndex, string>;

type TemplateByModelId<TTemplateIndex, TModelId extends string> =
  TModelId extends keyof TTemplateIndex ? TTemplateIndex[TModelId] : never;

type TemplateInputMap<TTemplate> =
  TTemplate extends GraphTemplateDefinition<infer I, string, OutputPort> ? I : never;

type TemplateOutput<TTemplate> =
  TTemplate extends GraphTemplateDefinition<any, string, infer O> ? O : never;

type AuthoredNodeId<TGraph extends AuthoredSynthesisGraph> =
  TGraph["nodes"][number]["id"];

type NodeIndex<TGraph extends AuthoredSynthesisGraph> = {
  readonly [TNode in TGraph["nodes"][number] as TNode["id"]]: TNode;
};

type ProducerIndex<
  TTemplateIndex,
  TGraph extends AuthoredSynthesisGraph
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

type OptionalInputKeys<TInputs extends Record<string, InputPort>> = {
  [K in keyof TInputs]-?: TInputs[K] extends { readonly required: false } ? K : never;
}[keyof TInputs];

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

type LiteralSynthesisInput = {
  readonly kind: "literal";
  readonly value: unknown;
};

type RawCodeSynthesisInput = {
  readonly kind: "rawCode";
  readonly code: string;
};

type FragmentExpectedOutputKind<TPort extends FragmentInputPort> =
  TPort["accepts"] extends { readonly outputKind: infer O extends RegionKind } ? O : TPort["regionKind"];

type FragmentAcceptsSourceModel<
  TPort extends FragmentInputPort,
  TModelId extends string
> =
  TPort["accepts"] extends { readonly sourceModelIds: readonly string[] }
    ? TModelId extends TPort["accepts"]["sourceModelIds"][number] ? true : false
    : true;

type FragmentCompatibleNodeId<
  TProducerIndex,
  TPort extends FragmentInputPort,
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

type CompatibleFragmentNodeIds<
  TProducerIndex,
  TPort extends FragmentInputPort
> = {
  [K in Extract<keyof TProducerIndex, string>]: FragmentCompatibleNodeId<TProducerIndex, TPort, K>;
}[Extract<keyof TProducerIndex, string>];

type SynthesisInputForPort<
  TPort extends InputPort,
  TNodeId extends string,
  TProducerIndex
> =
  TPort extends LiteralInputPort ? LiteralSynthesisInput :
  TPort extends FragmentInputPort ? RefSynthesisInput<CompatibleFragmentNodeIds<TProducerIndex, TPort>> :
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

type NoExtraProperties<TExpected, TActual> = {
  readonly [K in Exclude<keyof TActual, keyof TExpected>]: never;
};

type StrictSynthesisInputMap<
  TInputs extends Record<string, InputPort>,
  TActualInputs extends Record<string, unknown>,
  TNodeId extends string,
  TProducerIndex
> =
  SynthesisInputsForPorts<TInputs, TNodeId, TProducerIndex> extends infer TExpected
    ? TExpected extends Record<string, unknown>
      ? TActualInputs &
        TExpected &
        NoExtraProperties<TExpected, TActualInputs>
      : never
    : never;

type StrictSynthesisNode<
  TTemplateIndex,
  TProducerIndex,
  TNode extends AuthoredSynthesisNode,
> =
  TNode &
  {
    readonly id: TNode["id"];
    readonly templateId: TemplateModelId<TTemplateIndex>;
    readonly inputs: StrictSynthesisInputMap<
      TemplateInputMap<TemplateByModelId<TTemplateIndex, TNode["templateId"]>>,
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

type StrictSynthesisNodeList<
  TTemplateIndex,
  TProducerIndex,
  TNodes extends readonly AuthoredSynthesisNode[],
> =
  number extends TNodes["length"]
    ? ReadonlyArray<StrictSynthesisNode<TTemplateIndex, TProducerIndex, TNodes[number]>>
    : { readonly [K in keyof TNodes]: TNodes[K] extends AuthoredSynthesisNode
        ? StrictSynthesisNode<TTemplateIndex, TProducerIndex, TNodes[K]>
        : TNodes[K]
      };

type LooseAuthoredSynthesisGraph<TGraph extends AuthoredSynthesisGraph> =
  TGraph &
  NoExtraProperties<{
    readonly nodes: readonly AuthoredSynthesisNode[];
    readonly finalNodeId: string;
    readonly goal?: SynthesisGoal;
  }, TGraph>;

type StrictFiniteSynthesisGraph<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[],
  TGraph extends AuthoredSynthesisGraph,
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
    readonly nodes: readonly AuthoredSynthesisNode[];
    readonly finalNodeId: string;
    readonly goal?: SynthesisGoal;
  }, TGraph>;

/** Compile-time checked graph shape used by authored graph helpers. */
export type StrictSynthesisGraph<
  TTemplates extends readonly GraphTemplateDefinition<any, string, any>[],
  TGraph extends AuthoredSynthesisGraph
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

/** Graph compilation options are the normal generation options. */
export interface GraphCompileOptions extends GenerateOptions {}

/** Serialized input-port metadata without template implementation details. */
export type InputPortSummary =
  | LiteralInputPortSummary
  | FragmentInputPortSummary
  | RawCodeInputPortSummary
  | UnionInputPortSummary;

export interface BasePortSummary {
  /** Summary discriminator matching the original port kind. */
  kind: string;
  /** Whether the summarized input is required. */
  required: boolean;
  /** Human-readable input description, when provided. */
  description?: string;
}

export interface LiteralInputPortSummary extends BasePortSummary {
  /** Summary discriminator for literal ports. */
  kind: "literal";
  /** Replacement region kind the literal feeds. */
  regionKind: RegionKind;
  /** JSON Schema subset used to validate literal values, when provided. */
  schema?: unknown;
}

export interface FragmentInputPortSummary extends BasePortSummary {
  /** Summary discriminator for fragment ports. */
  kind: "fragment";
  /** Replacement region kind the referenced fragment feeds. */
  regionKind: RegionKind;
  /** Fragment compatibility requirements. */
  accepts: {
    /** Required output kind of referenced fragments, resolved from the port default. */
    outputKind: RegionKind;
    /** Type metadata referenced fragments must satisfy, when provided. */
    type?: TypeDescriptor;
    /** Template model IDs allowed as fragment sources, when provided. */
    sourceModelIds?: string[];
  };
}

export interface RawCodeInputPortSummary extends BasePortSummary {
  /** Summary discriminator for raw-code ports. */
  kind: "rawCode";
  /** Replacement region kind the raw code feeds. */
  regionKind: RegionKind;
  /** Planner-facing raw-code restrictions, when provided. */
  policy?: RawCodePolicy;
  /** Type metadata describing accepted raw code, when provided. */
  type?: TypeDescriptor;
}

export interface UnionInputPortSummary extends BasePortSummary {
  /** Summary discriminator for union ports. */
  kind: "union";
  /** Summaries of the concrete port options accepted by the union. */
  options: InputPortSummary[];
}

export interface OutputPortSummary {
  /** Syntactic region kind produced by the template. */
  kind: RegionKind;
  /** Type metadata advertised by the template output, when provided. */
  type?: TypeDescriptor;
  /** JSON Schema advertised by the template output, when provided. */
  schema?: unknown;
  /** Human-readable output description, when provided. */
  description?: string;
}
