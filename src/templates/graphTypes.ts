import type { GenerateOptions, MarkerExpectedKind, ReplacementMap } from "../core/types.js";

export type RegionKind = MarkerExpectedKind;

export interface TypeDescriptor {
  ts?: string;
  schema?: unknown;
}

export interface SynthesisRepairHint {
  kind: string;
  message: string;
  [key: string]: unknown;
}

export interface SynthesisDiagnostic {
  stage:
    | "graph"
    | "template"
    | "input"
    | "port"
    | "region"
    | "ast"
    | "type"
    | "policy";
  code: string;
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
  templateId?: string;
  inputName?: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
  repairHints?: SynthesisRepairHint[];
}

export interface GeneratedFragment {
  id?: string;
  code: string;
  kind: RegionKind;
  source: {
    templateId: string;
    templateVersion?: string;
  };
  type?: TypeDescriptor;
  schema?: unknown;
  provenance?: {
    nodeId?: string;
    inputRefs?: string[];
    literalInputs?: Record<string, unknown>;
  };
  diagnostics?: SynthesisDiagnostic[];
}

export interface RawCodePolicy {
  description?: string;
}

export type InputPort =
  | LiteralInputPort
  | FragmentInputPort
  | RawCodeInputPort
  | UnionInputPort;

export interface LiteralInputPort {
  kind: "literal";
  regionKind: RegionKind;
  schema?: unknown;
  required?: boolean;
  description?: string;
}

export interface FragmentInputPort {
  kind: "fragment";
  regionKind: RegionKind;
  accepts: {
    outputKind: RegionKind;
    type?: TypeDescriptor;
    sourceModelIds?: string[];
  };
  required?: boolean;
  description?: string;
}

export interface RawCodeInputPort {
  kind: "rawCode";
  regionKind: RegionKind;
  policy?: RawCodePolicy;
  type?: TypeDescriptor;
  required?: boolean;
  description?: string;
}

export interface UnionInputPort {
  kind: "union";
  options: InputPort[];
  required?: boolean;
  description?: string;
}

export interface OutputPort {
  kind: RegionKind;
  type?: TypeDescriptor;
  schema?: unknown;
  description?: string;
}

export interface SynthesisGraph {
  nodes: SynthesisNode[];
  finalNodeId: string;
  goal?: SynthesisGoal;
}

export interface SynthesisNode {
  id: string;
  templateId: string;
  inputs: Record<string, SynthesisInput>;
}

export type SynthesisInput =
  | { kind: "literal"; value: unknown }
  | { kind: "ref"; nodeId: string }
  | { kind: "rawCode"; code: string }
  | { kind: "inline"; node: SynthesisNode }
  | { "$ref": string };

export interface SynthesisGoal {
  outputKind?: RegionKind;
  type?: TypeDescriptor;
  schema?: unknown;
}

export interface TemplateSummary {
  modelId: string;
  version?: string;
  description?: string;
  inputs: Record<string, unknown>;
  output: OutputPort;
}

export interface TemplateRegistry {
  register(template: GraphTemplateDefinition<any, string>): void;
  get(templateId: string): GraphTemplateDefinition<any, string> | undefined;
  list(): GraphTemplateDefinition<any, string>[];
}

export type GraphCompilationResult =
  | {
      ok: true;
      finalFragment: GeneratedFragment;
      fragments: Map<string, GeneratedFragment>;
      diagnostics: SynthesisDiagnostic[];
    }
  | {
      ok: false;
      diagnostics: SynthesisDiagnostic[];
      partialFragments?: Map<string, GeneratedFragment>;
    };

export type ResolvedGraphInput =
  | { kind: "literal"; value: unknown; port: LiteralInputPort }
  | { kind: "fragment"; fragment: GeneratedFragment; port: FragmentInputPort }
  | { kind: "rawCode"; code: string; port: RawCodeInputPort };

export interface GraphTemplateInvocation {
  nodeId?: string;
  inputs: Record<string, ResolvedGraphInput>;
  options?: GenerateOptions;
}

export type GraphRegionBuilder<I extends Record<string, InputPort>> =
  <K extends Extract<keyof I, string>>(key: K, body?: string) => string;

export interface GraphTemplateDefinition<
  I extends Record<string, InputPort> = Record<string, InputPort>,
  M extends string = string
> {
  readonly modelId: M;
  readonly version?: string;
  readonly description?: string;
  readonly inputs: I;
  readonly output: OutputPort;
  readonly template: (region: GraphRegionBuilder<I>) => string;
  invoke(invocation: GraphTemplateInvocation): GeneratedFragment;
  toReplacementMap(inputs: Record<string, ResolvedGraphInput>): ReplacementMap;
  summary(): TemplateSummary;
}

export interface GraphCompileOptions extends GenerateOptions {}
