import {
  buildGraphCompiler,
  defineTemplate,
  fragmentCollectionPort,
  fragmentPort,
  literalPort,
  normalizeSynthesisGraph,
  rawCodePort,
  type FragmentCollectionInputPort,
  type GraphTemplateDefinition,
  type GraphTemplateManifest,
  type InputPort,
  type OutputPort,
  type RegionKind,
  type SynthesisGoal,
  type TemplateTypeParameterDefinition,
} from "../src/templates.js";

const marker = (kind: RegionKind, id: string, placeholder: string): string =>
  `/** @TYPE ${kind} id=${id} **/${placeholder}/** @END **/`;

const memberName = (description: string) =>
  literalPort({
    regionKind: "identifier",
    schema: { type: "string", pattern: "^[$A-Za-z_][$A-Za-z0-9_]*$" },
    description,
  });

const memberType = (description: string) =>
  rawCodePort({
    regionKind: "type",
    description,
    policy: { maxLength: 256, allowNewlines: false },
  });

const memberInitializer = (description: string) =>
  rawCodePort({
    regionKind: "expression",
    description,
    policy: { maxLength: 1_000, allowNewlines: false },
  });

const methodBody = (description: string) =>
  rawCodePort({
    regionKind: "statement",
    description,
    policy: { maxLength: 4_000, allowNewlines: true },
  });

const classMembers = (
  description: string,
  sourceModelId: string,
): FragmentCollectionInputPort =>
  fragmentCollectionPort({
    regionKind: "classMember",
    accepts: {
      outputKind: "classMember",
      sourceModelIds: [sourceModelId],
    },
    description,
    minItems: 0,
    separator: "\n\n",
  });

const AbstractReasoningGraph = defineTemplate({
  modelId: "AbstractReasoningGraph",
  version: "1.0.0",
  description:
    "Abstract base for maintaining the provenance graph that links derived entries to supporting and contradicting evidence.",
  inputs: {
    abstractInstanceVariables: classMembers(
      "Abstract instance-variable declarations implemented by subclasses.",
      "AbstractInstanceVariable",
    ),
    privateInstanceVariables: classMembers(
      "Private instance-variable declarations owned by the base class.",
      "PrivateInstanceVariable",
    ),
    protectedInstanceVariables: classMembers(
      "Protected instance-variable declarations available to subclasses.",
      "ProtectedInstanceVariable",
    ),
    staticVariables: classMembers("Static variable declarations.", "StaticVariable"),
    privateMethods: classMembers("Private method declarations.", "PrivateMethod"),
    protectedMethods: classMembers("Protected method declarations.", "ProtectedMethod"),
    staticMethods: classMembers("Static method declarations.", "StaticMethod"),
  },
  output: { kind: "declaration" },
  source: `
/** Abstract base for maintaining the provenance graph that links derived entries to their supporting and contradicting evidence. */
export abstract class AbstractReasoningGraph implements ReasoningGraph {

    ${marker("classMember", "abstractInstanceVariables", "abstract variable: unknown")}
    ${marker("classMember", "privateInstanceVariables", "private pVariable: unknown = undefined")}
    ${marker("classMember", "protectedInstanceVariables", "protected prVariable: unknown = undefined")}

    ${marker("classMember", "staticVariables", "static sVariable: unknown = undefined")}

    ${marker("classMember", "privateMethods", "private placeholder(): void {}")}
    ${marker("classMember", "protectedMethods", "protected placeholder(): void {}")}
    ${marker("classMember", "staticMethods", "static placeholder(): void {}")}

    /** Adds provenance edges to the reasoning graph while preserving graph identity and traversal invariants. */
    abstract addEdges(edges: readonly ReasoningEdge[]): Promise<void>;

    /** Returns a reasoning edge by its stable identifier, if present. */
    abstract getEdge(id: ReasoningEdgeId): ReasoningEdge | undefined;

    /** Returns reasoning edges whose destination is the requested blackboard entry. */
    abstract incoming(entryId: BlackboardEntryId): readonly ReasoningEdge[];

    /** Returns reasoning edges whose source is the requested blackboard entry. */
    abstract outgoing(entryId: BlackboardEntryId): readonly ReasoningEdge[];

    /** Traverses the reasoning graph from configured roots and returns the bounded reachable subgraph. */
    abstract traverse(query: ReasoningGraphQuery): ReasoningSubgraph;

    /** Finds bounded provenance paths between two blackboard entries. */
    abstract findPaths(fromEntryId: BlackboardEntryId, toEntryId: BlackboardEntryId, maxDepth?: number): readonly ReasoningPath[];
}
  `,
});

const AbstractReasoningGraphSourceFile = defineTemplate({
  modelId: "AbstractReasoningGraphSourceFile",
  version: "1.0.0",
  description:
    "Complete TypeScript module containing AbstractReasoningGraph and its required type imports.",
  inputs: {
    declaration: fragmentPort({
      regionKind: "declaration",
      accepts: {
        outputKind: "declaration",
        sourceModelIds: [AbstractReasoningGraph.modelId],
      },
      description: "The AbstractReasoningGraph declaration.",
    }),
  },
  output: { kind: "sourceFile" },
  source: `
import type {
  ReasoningEdge,
  ReasoningGraph,
  ReasoningGraphQuery,
  ReasoningPath,
  ReasoningSubgraph,
} from "../blackboard/reasoning-graph";
import type {
  BlackboardEntryId,
  ReasoningEdgeId,
} from "../domain/evidence";

${marker(
  "declaration",
  "declaration",
  "export abstract class AbstractReasoningGraph {}",
)}
`,
});

const initializedVariableClassMemberTemplate = <const M extends string>(
  modelId: M,
  modifier: "private" | "protected" | "static",
  description: string,
) => defineTemplate({
  modelId,
  version: "1.0.0",
  description,
  inputs: {
    name: memberName("Property name."),
    type: memberType("Property type."),
    initializer: memberInitializer("Initial property value."),
  },
  output: { kind: "classMember" },
  source: `${modifier} ${marker("identifier", "name", "value")}: ${marker("type", "type", "unknown")} = ${marker("expression", "initializer", "undefined")};`,
});

const AbstractInstanceVariable = defineTemplate({
  modelId: "AbstractInstanceVariable",
  version: "1.0.0",
  description:
    "One protected abstract instance-variable declaration implemented by subclasses.",
  inputs: {
    name: memberName("Abstract property name."),
    type: memberType("Abstract property type."),
  },
  output: { kind: "classMember" },
  source: `protected abstract ${marker("identifier", "name", "value")}: ${marker("type", "type", "unknown")};`,
});
const PrivateInstanceVariable = initializedVariableClassMemberTemplate(
  "PrivateInstanceVariable",
  "private",
  "One initialized private instance-variable declaration owned by the base class.",
);
const ProtectedInstanceVariable = initializedVariableClassMemberTemplate(
  "ProtectedInstanceVariable",
  "protected",
  "One initialized protected instance-variable declaration available to subclasses.",
);
const StaticVariable = initializedVariableClassMemberTemplate(
  "StaticVariable",
  "static",
  "One initialized static variable declaration.",
);

const methodClassMemberTemplate = <const M extends string>(
  modelId: M,
  modifier: "private" | "protected" | "static",
  description: string,
) => defineTemplate({
  modelId,
  version: "1.0.0",
  description,
  inputs: {
    name: memberName("Method name."),
    body: methodBody("One method-body statement; use a block statement for multiple operations."),
  },
  output: { kind: "classMember" },
  source: `${modifier} ${marker("identifier", "name", "method")}(): void {\n${marker("statement", "body", "return;")}\n}`,
});

const PrivateMethod = methodClassMemberTemplate(
  "PrivateMethod",
  "private",
  "One private method declaration.",
);
const ProtectedMethod = methodClassMemberTemplate(
  "ProtectedMethod",
  "protected",
  "One protected method declaration.",
);
const StaticMethod = methodClassMemberTemplate(
  "StaticMethod",
  "static",
  "One static method declaration.",
);

const templates = [
  AbstractReasoningGraphSourceFile,
  AbstractReasoningGraph,
  AbstractInstanceVariable,
  PrivateInstanceVariable,
  ProtectedInstanceVariable,
  StaticVariable,
  PrivateMethod,
  ProtectedMethod,
  StaticMethod,
] as const;
const goal = { outputKind: "sourceFile" } as const satisfies SynthesisGoal;
const compiler = buildGraphCompiler(templates);
const emptyRefs = () => ({
  kind: "fragmentCollection" as const,
  items: [] as const,
});

const graph = compiler.defineGraph({
  nodes: [
    {
      id: "abstract-reasoning-graph",
      templateId: "AbstractReasoningGraph",
      inputs: {
        abstractInstanceVariables: emptyRefs(),
        privateInstanceVariables: emptyRefs(),
        protectedInstanceVariables: emptyRefs(),
        staticVariables: emptyRefs(),
        privateMethods: emptyRefs(),
        protectedMethods: emptyRefs(),
        staticMethods: emptyRefs(),
      },
    },
    {
      id: "abstract-reasoning-graph-source-file",
      templateId: "AbstractReasoningGraphSourceFile",
      inputs: {
        declaration: { $ref: "abstract-reasoning-graph" },
      },
    },
  ],
  finalNodeId: "abstract-reasoning-graph-source-file",
  goal,
});

function manifestOf<
  I extends Record<string, InputPort>,
  M extends string,
  O extends OutputPort,
  P extends Record<string, TemplateTypeParameterDefinition> | undefined,
>(
  template: GraphTemplateDefinition<I, M, O, P>,
): GraphTemplateManifest<I, M, O, P> {
  return {
    modelId: template.modelId,
    ...(template.version === undefined ? {} : { version: template.version }),
    ...(template.description === undefined
      ? {}
      : { description: template.description }),
    ...(template.typeParameters === undefined
      ? {}
      : { typeParameters: template.typeParameters }),
    ...(template.callableScope === undefined
      ? {}
      : { callableScope: template.callableScope }),
    inputs: template.inputs,
    output: template.output,
    source: template.source,
  };
}

export const validateEditTemplateManifests: readonly GraphTemplateManifest<
  any,
  string,
  OutputPort,
  any
>[] = [
  manifestOf(AbstractReasoningGraphSourceFile),
  manifestOf(AbstractReasoningGraph),
  manifestOf(AbstractInstanceVariable),
  manifestOf(PrivateInstanceVariable),
  manifestOf(ProtectedInstanceVariable),
  manifestOf(StaticVariable),
  manifestOf(PrivateMethod),
  manifestOf(ProtectedMethod),
  manifestOf(StaticMethod),
];

export const validateEditStarterGraph = normalizeSynthesisGraph(graph).graph;

export const validateEditGoal = goal;

// const result = compiler(graph, {
//   mode: "partial",
//   compilationScope: "abstract-reasoning-graph-preview",
//   checkSemanticDiagnostics: false,
//   format: "ts-morph",
// });

// if (!result.ok) {
//   console.error(result.diagnostics);
// } else {
//   console.log(result.finalArtifact.code);

//   if (!result.finalArtifact.complete) {
//     console.log("Unresolved inputs:", result.finalArtifact.unresolvedInputs);
//   }
// }
