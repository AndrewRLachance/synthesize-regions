import {
  buildGraphCompiler,
  defineTemplate,
  fragmentCollectionPort,
  fragmentPort,
  literalPort,
  normalizeSynthesisGraph,
  type GraphTemplateDefinition,
  type GraphTemplateManifest,
  type FragmentCollectionInputPort,
  type FragmentInputPort,
  type LiteralInputPort,
  type RegionKind,
  type SynthesisGoal,
} from "../src/templates.js";

const marker = (kind: RegionKind, id: string, placeholder: string): string =>
  `/** @TYPE ${kind} id=${id} **/${placeholder}/** @END **/`;

const identifier = (description?: string): LiteralInputPort => literalPort({
  regionKind: "identifier",
  schema: { type: "string", pattern: "^[$A-Za-z_][$A-Za-z0-9_]*$" },
  ...(description === undefined ? {} : { description }),
});

const fragment = (kind: RegionKind): FragmentInputPort => fragmentPort({
  regionKind: kind,
  accepts: { outputKind: kind },
});

const collection = (
  kind: RegionKind,
  separator: string,
  minItems = 1,
): FragmentCollectionInputPort => fragmentCollectionPort({
  regionKind: kind,
  accepts: { outputKind: kind },
  minItems,
  separator,
});

const methodBody = (): FragmentCollectionInputPort => fragmentCollectionPort({
  regionKind: "statement",
  accepts: {
    outputKind: "statement",
    sourceModelIds: ["ConstDeclarationStatement", "ReturnStatement"],
  },
  minItems: 1,
  separator: "\n",
});

const constructorBody = (): FragmentCollectionInputPort => fragmentCollectionPort({
  regionKind: "statement",
  accepts: { outputKind: "statement", sourceModelIds: ["SuperCallStatement"] },
  minItems: 1,
  separator: "\n",
});

const moduleImports = (): FragmentCollectionInputPort => fragmentCollectionPort({
  regionKind: "statement",
  accepts: {
    outputKind: "statement",
    sourceModelIds: ["TypeOnlyNamedImport", "NamedImport"],
  },
  minItems: 1,
  separator: "\n",
});

// Reusable syntax catalog ----------------------------------------------------

const IdentifierToken = defineTemplate({
  modelId: "IdentifierToken",
  version: "1.0.0",
  inputs: { name: identifier("Identifier token") },
  output: { kind: "identifier" },
  source: marker("identifier", "name", "Placeholder"),
});

const importNames = (): FragmentCollectionInputPort => fragmentCollectionPort({
  regionKind: "importSpecifier",
  accepts: { outputKind: "identifier" },
  minItems: 1,
  separator: ", ",
});

const TypeOnlyNamedImport = defineTemplate({
  modelId: "TypeOnlyNamedImport",
  version: "1.0.0",
  inputs: {
    names: importNames(),
    module: literalPort({
      regionKind: "string",
      schema: { type: "string", minLength: 1 },
    }),
  },
  output: { kind: "statement" },
  source: `import type { ${marker("importSpecifier", "names", "Placeholder")} } from ${marker("string", "module", '"placeholder"')};`,
});

const NamedImport = defineTemplate({
  modelId: "NamedImport",
  version: "1.0.0",
  inputs: {
    names: importNames(),
    module: literalPort({
      regionKind: "string",
      schema: { type: "string", minLength: 1 },
    }),
  },
  output: { kind: "statement" },
  source: `import { ${marker("importSpecifier", "names", "Placeholder")} } from ${marker("string", "module", '"placeholder"')};`,
});

const NamedTypeReference = defineTemplate({
  modelId: "NamedTypeReference",
  version: "1.0.0",
  inputs: { name: identifier("Type identifier") },
  output: { kind: "type" },
  source: marker("identifier", "name", "UnknownType"),
});

const PromiseType = defineTemplate({
  modelId: "PromiseType",
  version: "1.0.0",
  inputs: { value: fragment("type") },
  output: { kind: "type" },
  source: `Promise<${marker("type", "value", "unknown")}>`,
});

const ReadonlyArrayType = defineTemplate({
  modelId: "ReadonlyArrayType",
  version: "1.0.0",
  inputs: { element: fragment("type") },
  output: { kind: "type" },
  source: `ReadonlyArray<${marker("type", "element", "unknown")}>`,
});

const TypedParameter = defineTemplate({
  modelId: "TypedParameter",
  version: "1.0.0",
  inputs: { name: identifier(), type: fragment("type") },
  output: { kind: "parameter" },
  source: `${marker("identifier", "name", "value")}: ${marker("type", "type", "unknown")}`,
});

const PublicOverrideReadonlyConstructorParameter = defineTemplate({
  modelId: "PublicOverrideReadonlyConstructorParameter",
  version: "1.0.0",
  inputs: { name: identifier(), type: fragment("type") },
  output: { kind: "constructorParameter" },
  source: `public override readonly ${marker("identifier", "name", "dependency")}: ${marker("type", "type", "unknown")}`,
});

const PublicOverrideReadonlyProperty = defineTemplate({
  modelId: "PublicOverrideReadonlyProperty",
  version: "1.0.0",
  inputs: { name: identifier(), type: fragment("type") },
  output: { kind: "classMember" },
  source: `public override readonly ${marker("identifier", "name", "dependency")}: ${marker("type", "type", "unknown")};`,
});

const SuperCallStatement = defineTemplate({
  modelId: "SuperCallStatement",
  version: "1.0.0",
  inputs: {},
  output: { kind: "statement" },
  source: "super();",
});

const Constructor = defineTemplate({
  modelId: "Constructor",
  version: "1.0.0",
  inputs: {
    parameters: collection("constructorParameter", ",\n", 0),
    body: constructorBody(),
  },
  output: { kind: "classMember" },
  source: `constructor(\n${marker("constructorParameter", "parameters", "placeholder: unknown")}\n) {\n${marker("statement", "body", "void 0;")}\n}`,
});

const ThisExpression = defineTemplate({
  modelId: "ThisExpression",
  version: "1.0.0",
  inputs: {},
  output: { kind: "expression" },
  source: "this",
});

const IdentifierExpression = defineTemplate({
  modelId: "IdentifierExpression",
  version: "1.0.0",
  inputs: { name: identifier() },
  output: { kind: "expression" },
  source: marker("identifier", "name", "value"),
});

const PropertyAccessExpression = defineTemplate({
  modelId: "PropertyAccessExpression",
  version: "1.0.0",
  inputs: { receiver: fragment("expression"), property: identifier() },
  output: { kind: "expression" },
  source: `(${marker("expression", "receiver", "undefined")}).${marker("identifier", "property", "value")}`,
});

const MethodCallExpression = defineTemplate({
  modelId: "MethodCallExpression",
  version: "1.0.0",
  inputs: {
    receiver: fragment("expression"),
    method: identifier(),
    arguments: collection("expression", ", ", 0),
  },
  output: { kind: "expression" },
  source: `(${marker("expression", "receiver", "undefined")}).${marker("identifier", "method", "call")}(${marker("expression", "arguments", "undefined")})`,
});

const AwaitExpression = defineTemplate({
  modelId: "AwaitExpression",
  version: "1.0.0",
  inputs: { value: fragment("expression") },
  output: { kind: "expression" },
  source: `await (${marker("expression", "value", "undefined")})`,
});

const ConstDeclarationStatement = defineTemplate({
  modelId: "ConstDeclarationStatement",
  version: "1.0.0",
  inputs: { name: identifier(), initializer: fragment("expression") },
  output: { kind: "statement" },
  source: `const ${marker("identifier", "name", "value")} = ${marker("expression", "initializer", "undefined")};`,
});

const ArrowExpression = defineTemplate({
  modelId: "ArrowExpression",
  version: "1.0.0",
  inputs: {
    parameters: collection("parameter", ", ", 1),
    body: fragment("expression"),
  },
  output: { kind: "expression" },
  source: `(${marker("parameter", "parameters", "value")}) => (${marker("expression", "body", "undefined")})`,
});

const ObjectLiteral2Expression = defineTemplate({
  modelId: "ObjectLiteral2Expression",
  version: "1.0.0",
  inputs: {
    firstName: identifier(),
    firstValue: fragment("expression"),
    secondName: identifier(),
    secondValue: fragment("expression"),
  },
  output: { kind: "expression" },
  source: `{\n${marker("identifier", "firstName", "first")}: ${marker("expression", "firstValue", "undefined")},\n${marker("identifier", "secondName", "second")}: ${marker("expression", "secondValue", "undefined")}\n}`,
});

const ReturnStatement = defineTemplate({
  modelId: "ReturnStatement",
  version: "1.0.0",
  inputs: { value: fragment("expression") },
  output: { kind: "statement" },
  source: `return ${marker("expression", "value", "undefined")};`,
});

const OverrideAsyncClassMethod = defineTemplate({
  modelId: "OverrideAsyncClassMethod",
  version: "1.0.0",
  inputs: {
    name: identifier(),
    parameters: collection("parameter", ", ", 1),
    returnType: fragment("type"),
    body: methodBody(),
  },
  output: { kind: "classMember" },
  source: `override async ${marker("identifier", "name", "method")}(${marker("parameter", "parameters", "value: unknown")}): ${marker("type", "returnType", "Promise<unknown>")} {\n${marker("statement", "body", "throw new Error();")}\n}`,
});

const OverrideClassMethod = defineTemplate({
  modelId: "OverrideClassMethod",
  version: "1.0.0",
  inputs: {
    name: identifier(),
    parameters: collection("parameter", ", ", 1),
    returnType: fragment("type"),
    body: methodBody(),
  },
  output: { kind: "classMember" },
  source: `override ${marker("identifier", "name", "method")}(${marker("parameter", "parameters", "value: unknown")}): ${marker("type", "returnType", "Promise<unknown>")} {\n${marker("statement", "body", "throw new Error();")}\n}`,
});

const ProtectedOverrideClassMethod = defineTemplate({
  modelId: "ProtectedOverrideClassMethod",
  version: "1.0.0",
  inputs: {
    name: identifier(),
    parameters: collection("parameter", ", ", 1),
    returnType: fragment("type"),
    body: methodBody(),
  },
  output: { kind: "classMember" },
  source: `protected override ${marker("identifier", "name", "method")}(${marker("parameter", "parameters", "value: unknown")}): ${marker("type", "returnType", "Promise<unknown>")} {\n${marker("statement", "body", "throw new Error();")}\n}`,
});

const ExportedClass = defineTemplate({
  modelId: "ExportedClass",
  version: "1.0.0",
  inputs: {
    name: identifier(),
    base: fragmentPort({
      regionKind: "heritageType",
      accepts: { outputKind: "identifier" },
    }),
    members: collection("classMember", "\n\n", 1),
  },
  output: { kind: "declaration" },
  source: `export class ${marker("identifier", "name", "Placeholder")} extends ${marker("heritageType", "base", "Object")} {\n${marker("classMember", "members", "placeholder(): void {}")}\n}`,
});

const TypeScriptModule = defineTemplate({
  modelId: "TypeScriptModule",
  version: "1.0.0",
  inputs: {
    imports: moduleImports(),
    declarations: collection("declaration", "\n\n", 1),
  },
  output: { kind: "sourceFile" },
  source: `${marker("statement", "imports", 'import type {} from "placeholder";')}\n\n${marker("declaration", "declarations", "export class Placeholder {}")}`,
});

const templates = [
  IdentifierToken,
  TypeOnlyNamedImport,
  NamedImport,
  NamedTypeReference,
  PromiseType,
  ReadonlyArrayType,
  TypedParameter,
  PublicOverrideReadonlyConstructorParameter,
  PublicOverrideReadonlyProperty,
  SuperCallStatement,
  Constructor,
  ThisExpression,
  IdentifierExpression,
  PropertyAccessExpression,
  MethodCallExpression,
  AwaitExpression,
  ConstDeclarationStatement,
  ArrowExpression,
  ObjectLiteral2Expression,
  ReturnStatement,
  OverrideAsyncClassMethod,
  OverrideClassMethod,
  ProtectedOverrideClassMethod,
  ExportedClass,
  TypeScriptModule,
] as const;

const literal = <const TValue>(value: TValue) => ({ kind: "literal" as const, value });
const ref = <const TNodeId extends string>(nodeId: TNodeId) => ({ $ref: nodeId });
const refs = <const TNodeIds extends readonly string[]>(...nodeIds: TNodeIds) => ({
  kind: "fragmentCollection" as const,
  items: nodeIds.map((nodeId) => ({ $ref: nodeId })),
});

const contractModule = "@application-platform/edi-transaction-interpreter";
const goal = { outputKind: "sourceFile" } as const satisfies SynthesisGoal;
const compiler = buildGraphCompiler(templates);

// Type-derived starter graph -------------------------------------------------

const graph = compiler.definePartialGraph({
  nodes: [
    {
      id: "base-symbol",
      templateId: "IdentifierToken",
      inputs: { name: literal("EdiDocumentInterpreter") },
    },
    {
      id: "base-import",
      templateId: "NamedImport",
      inputs: {
        names: refs("base-symbol"),
        module: literal(contractModule),
      },
    },
    {
      id: "import-type-document-assembler",
      templateId: "IdentifierToken",
      inputs: { name: literal("DocumentAssembler") },
    },
    {
      id: "import-type-document-evidence-indexer",
      templateId: "IdentifierToken",
      inputs: { name: literal("DocumentEvidenceIndexer") },
    },
    {
      id: "import-type-hierarchical-top-k-classifier",
      templateId: "IdentifierToken",
      inputs: { name: literal("HierarchicalTopKClassifier") },
    },
    {
      id: "import-type-top-k-extraction-coordinator",
      templateId: "IdentifierToken",
      inputs: { name: literal("TopKExtractionCoordinator") },
    },
    {
      id: "import-type-extraction-candidate-validator",
      templateId: "IdentifierToken",
      inputs: { name: literal("ExtractionCandidateValidator") },
    },
    {
      id: "import-type-extraction-candidate-ranker",
      templateId: "IdentifierToken",
      inputs: { name: literal("ExtractionCandidateRanker") },
    },
    {
      id: "import-type-transaction-document-factory",
      templateId: "IdentifierToken",
      inputs: { name: literal("TransactionDocumentFactory") },
    },
    {
      id: "import-type-extraction-candidate-scoring-policy",
      templateId: "IdentifierToken",
      inputs: { name: literal("ExtractionCandidateScoringPolicy") },
    },
    {
      id: "import-type-extraction-candidate-acceptance-policy",
      templateId: "IdentifierToken",
      inputs: { name: literal("ExtractionCandidateAcceptancePolicy") },
    },
    {
      id: "import-type-edi-interpretation-request",
      templateId: "IdentifierToken",
      inputs: { name: literal("EdiInterpretationRequest") },
    },
    {
      id: "import-type-edi-interpretation-batch-outcome",
      templateId: "IdentifierToken",
      inputs: { name: literal("EdiInterpretationBatchOutcome") },
    },
    {
      id: "import-type-document-assembly-result",
      templateId: "IdentifierToken",
      inputs: { name: literal("DocumentAssemblyResult") },
    },
    {
      id: "import-type-logical-document",
      templateId: "IdentifierToken",
      inputs: { name: literal("LogicalDocument") },
    },
    {
      id: "import-type-document-evidence-index",
      templateId: "IdentifierToken",
      inputs: { name: literal("DocumentEvidenceIndex") },
    },
    {
      id: "import-type-family-classification-request",
      templateId: "IdentifierToken",
      inputs: { name: literal("FamilyClassificationRequest") },
    },
    {
      id: "import-type-hierarchical-classification-result",
      templateId: "IdentifierToken",
      inputs: { name: literal("HierarchicalClassificationResult") },
    },
    {
      id: "import-type-extraction-batch-result",
      templateId: "IdentifierToken",
      inputs: { name: literal("ExtractionBatchResult") },
    },
    {
      id: "import-type-validated-extraction-candidate",
      templateId: "IdentifierToken",
      inputs: { name: literal("ValidatedExtractionCandidate") },
    },
    {
      id: "import-type-candidate-ranking-result",
      templateId: "IdentifierToken",
      inputs: { name: literal("CandidateRankingResult") },
    },
    {
      id: "contract-types-import",
      templateId: "TypeOnlyNamedImport",
      inputs: {
        names: refs(
          "import-type-document-assembler",
          "import-type-document-evidence-indexer",
          "import-type-hierarchical-top-k-classifier",
          "import-type-top-k-extraction-coordinator",
          "import-type-extraction-candidate-validator",
          "import-type-extraction-candidate-ranker",
          "import-type-transaction-document-factory",
          "import-type-extraction-candidate-scoring-policy",
          "import-type-extraction-candidate-acceptance-policy",
          "import-type-edi-interpretation-request",
          "import-type-edi-interpretation-batch-outcome",
          "import-type-document-assembly-result",
          "import-type-logical-document",
          "import-type-document-evidence-index",
          "import-type-family-classification-request",
          "import-type-hierarchical-classification-result",
          "import-type-extraction-batch-result",
          "import-type-validated-extraction-candidate",
          "import-type-candidate-ranking-result",
        ),
        module: literal(contractModule),
      },
    },
    {
      id: "type-document-assembler",
      templateId: "NamedTypeReference",
      inputs: { name: literal("DocumentAssembler") },
    },
    {
      id: "type-document-evidence-indexer",
      templateId: "NamedTypeReference",
      inputs: { name: literal("DocumentEvidenceIndexer") },
    },
    {
      id: "type-hierarchical-top-k-classifier",
      templateId: "NamedTypeReference",
      inputs: { name: literal("HierarchicalTopKClassifier") },
    },
    {
      id: "type-top-k-extraction-coordinator",
      templateId: "NamedTypeReference",
      inputs: { name: literal("TopKExtractionCoordinator") },
    },
    {
      id: "type-extraction-candidate-validator",
      templateId: "NamedTypeReference",
      inputs: { name: literal("ExtractionCandidateValidator") },
    },
    {
      id: "type-extraction-candidate-ranker",
      templateId: "NamedTypeReference",
      inputs: { name: literal("ExtractionCandidateRanker") },
    },
    {
      id: "type-transaction-document-factory",
      templateId: "NamedTypeReference",
      inputs: { name: literal("TransactionDocumentFactory") },
    },
    {
      id: "type-extraction-candidate-scoring-policy",
      templateId: "NamedTypeReference",
      inputs: { name: literal("ExtractionCandidateScoringPolicy") },
    },
    {
      id: "type-extraction-candidate-acceptance-policy",
      templateId: "NamedTypeReference",
      inputs: { name: literal("ExtractionCandidateAcceptancePolicy") },
    },
    {
      id: "type-edi-interpretation-request",
      templateId: "NamedTypeReference",
      inputs: { name: literal("EdiInterpretationRequest") },
    },
    {
      id: "type-edi-interpretation-batch-outcome",
      templateId: "NamedTypeReference",
      inputs: { name: literal("EdiInterpretationBatchOutcome") },
    },
    {
      id: "type-document-assembly-result",
      templateId: "NamedTypeReference",
      inputs: { name: literal("DocumentAssemblyResult") },
    },
    {
      id: "type-logical-document",
      templateId: "NamedTypeReference",
      inputs: { name: literal("LogicalDocument") },
    },
    {
      id: "type-document-evidence-index",
      templateId: "NamedTypeReference",
      inputs: { name: literal("DocumentEvidenceIndex") },
    },
    {
      id: "type-family-classification-request",
      templateId: "NamedTypeReference",
      inputs: { name: literal("FamilyClassificationRequest") },
    },
    {
      id: "type-hierarchical-classification-result",
      templateId: "NamedTypeReference",
      inputs: { name: literal("HierarchicalClassificationResult") },
    },
    {
      id: "type-extraction-batch-result",
      templateId: "NamedTypeReference",
      inputs: { name: literal("ExtractionBatchResult") },
    },
    {
      id: "type-validated-extraction-candidate",
      templateId: "NamedTypeReference",
      inputs: { name: literal("ValidatedExtractionCandidate") },
    },
    {
      id: "type-candidate-ranking-result",
      templateId: "NamedTypeReference",
      inputs: { name: literal("CandidateRankingResult") },
    },
    {
      id: "type-readonly-validated-extraction-candidates",
      templateId: "ReadonlyArrayType",
      inputs: { element: ref("type-validated-extraction-candidate") },
    },
    {
      id: "constructor-parameter-assembler",
      templateId: "PublicOverrideReadonlyConstructorParameter",
      inputs: {
        name: literal("assembler"),
        type: ref("type-document-assembler"),
      },
    },
    {
      id: "constructor-parameter-evidence-indexer",
      templateId: "PublicOverrideReadonlyConstructorParameter",
      inputs: {
        name: literal("evidenceIndexer"),
        type: ref("type-document-evidence-indexer"),
      },
    },
    {
      id: "constructor-parameter-classifier",
      templateId: "PublicOverrideReadonlyConstructorParameter",
      inputs: {
        name: literal("classifier"),
        type: ref("type-hierarchical-top-k-classifier"),
      },
    },
    {
      id: "constructor-parameter-extractor",
      templateId: "PublicOverrideReadonlyConstructorParameter",
      inputs: {
        name: literal("extractor"),
        type: ref("type-top-k-extraction-coordinator"),
      },
    },
    {
      id: "constructor-parameter-validator",
      templateId: "PublicOverrideReadonlyConstructorParameter",
      inputs: {
        name: literal("validator"),
        type: ref("type-extraction-candidate-validator"),
      },
    },
    {
      id: "constructor-parameter-ranker",
      templateId: "PublicOverrideReadonlyConstructorParameter",
      inputs: {
        name: literal("ranker"),
        type: ref("type-extraction-candidate-ranker"),
      },
    },
    {
      id: "constructor-parameter-document-factory",
      templateId: "PublicOverrideReadonlyConstructorParameter",
      inputs: {
        name: literal("documentFactory"),
        type: ref("type-transaction-document-factory"),
      },
    },
    {
      id: "constructor-parameter-scoring-policy",
      templateId: "PublicOverrideReadonlyConstructorParameter",
      inputs: {
        name: literal("scoringPolicy"),
        type: ref("type-extraction-candidate-scoring-policy"),
      },
    },
    {
      id: "constructor-parameter-acceptance-policy",
      templateId: "PublicOverrideReadonlyConstructorParameter",
      inputs: {
        name: literal("acceptancePolicy"),
        type: ref("type-extraction-candidate-acceptance-policy"),
      },
    },
    {
      id: "constructor-super-call",
      templateId: "SuperCallStatement",
      inputs: {},
    },
    {
      id: "interpreter-constructor",
      templateId: "Constructor",
      inputs: {
        parameters: refs(
          "constructor-parameter-assembler",
          "constructor-parameter-evidence-indexer",
          "constructor-parameter-classifier",
          "constructor-parameter-extractor",
          "constructor-parameter-validator",
          "constructor-parameter-ranker",
          "constructor-parameter-document-factory",
          "constructor-parameter-scoring-policy",
          "constructor-parameter-acceptance-policy",
        ),
        body: refs("constructor-super-call"),
      },
    },
    {
      id: "parameter-interpret-request",
      templateId: "TypedParameter",
      inputs: {
        name: literal("request"),
        type: ref("type-edi-interpretation-request"),
      },
    },
    {
      id: "parameter-assemble-request",
      templateId: "TypedParameter",
      inputs: {
        name: literal("request"),
        type: ref("type-edi-interpretation-request"),
      },
    },
    {
      id: "parameter-index-document",
      templateId: "TypedParameter",
      inputs: {
        name: literal("document"),
        type: ref("type-logical-document"),
      },
    },
    {
      id: "parameter-classify-request",
      templateId: "TypedParameter",
      inputs: {
        name: literal("request"),
        type: ref("type-family-classification-request"),
      },
    },
    {
      id: "parameter-extract-evidence",
      templateId: "TypedParameter",
      inputs: {
        name: literal("evidence"),
        type: ref("type-document-evidence-index"),
      },
    },
    {
      id: "parameter-extract-classification",
      templateId: "TypedParameter",
      inputs: {
        name: literal("classification"),
        type: ref("type-hierarchical-classification-result"),
      },
    },
    {
      id: "parameter-validate-evidence",
      templateId: "TypedParameter",
      inputs: {
        name: literal("evidence"),
        type: ref("type-document-evidence-index"),
      },
    },
    {
      id: "parameter-validate-extraction",
      templateId: "TypedParameter",
      inputs: {
        name: literal("extraction"),
        type: ref("type-extraction-batch-result"),
      },
    },
    {
      id: "parameter-rank-candidates",
      templateId: "TypedParameter",
      inputs: {
        name: literal("candidates"),
        type: ref("type-readonly-validated-extraction-candidates"),
      },
    },
    {
      id: "promise-edi-interpretation-batch-outcome",
      templateId: "PromiseType",
      inputs: { value: ref("type-edi-interpretation-batch-outcome") },
    },
    {
      id: "promise-document-assembly-result",
      templateId: "PromiseType",
      inputs: { value: ref("type-document-assembly-result") },
    },
    {
      id: "promise-document-evidence-index",
      templateId: "PromiseType",
      inputs: { value: ref("type-document-evidence-index") },
    },
    {
      id: "promise-hierarchical-classification-result",
      templateId: "PromiseType",
      inputs: { value: ref("type-hierarchical-classification-result") },
    },
    {
      id: "promise-extraction-batch-result",
      templateId: "PromiseType",
      inputs: { value: ref("type-extraction-batch-result") },
    },
    {
      id: "promise-readonly-validated-extraction-candidates",
      templateId: "PromiseType",
      inputs: { value: ref("type-readonly-validated-extraction-candidates") },
    },
    {
      id: "promise-candidate-ranking-result",
      templateId: "PromiseType",
      inputs: { value: ref("type-candidate-ranking-result") },
    },
    {
      id: "method-interpret",
      templateId: "OverrideClassMethod",
      inputs: {
        name: literal("interpret"),
        parameters: refs("parameter-interpret-request"),
        returnType: ref("promise-edi-interpretation-batch-outcome"),
      },
    },
    {
      id: "method-assemble",
      templateId: "ProtectedOverrideClassMethod",
      inputs: {
        name: literal("assemble"),
        parameters: refs("parameter-assemble-request"),
        returnType: ref("promise-document-assembly-result"),
      },
    },
    {
      id: "method-index-evidence",
      templateId: "ProtectedOverrideClassMethod",
      inputs: {
        name: literal("indexEvidence"),
        parameters: refs("parameter-index-document"),
        returnType: ref("promise-document-evidence-index"),
      },
    },
    {
      id: "method-classify",
      templateId: "ProtectedOverrideClassMethod",
      inputs: {
        name: literal("classify"),
        parameters: refs("parameter-classify-request"),
        returnType: ref("promise-hierarchical-classification-result"),
      },
    },
    {
      id: "method-extract",
      templateId: "ProtectedOverrideClassMethod",
      inputs: {
        name: literal("extract"),
        parameters: refs(
          "parameter-extract-evidence",
          "parameter-extract-classification",
        ),
        returnType: ref("promise-extraction-batch-result"),
      },
    },
    {
      id: "method-validate",
      templateId: "ProtectedOverrideClassMethod",
      inputs: {
        name: literal("validate"),
        parameters: refs(
          "parameter-validate-evidence",
          "parameter-validate-extraction",
        ),
        returnType: ref("promise-readonly-validated-extraction-candidates"),
      },
    },
    {
      id: "method-rank",
      templateId: "ProtectedOverrideClassMethod",
      inputs: {
        name: literal("rank"),
        parameters: refs("parameter-rank-candidates"),
        returnType: ref("promise-candidate-ranking-result"),
      },
    },
    {
      id: "interpreter-class",
      templateId: "ExportedClass",
      inputs: {
        name: literal("DefaultEdiDocumentInterpreter"),
        base: ref("base-symbol"),
        members: refs(
          "interpreter-constructor",
          "method-interpret",
          "method-assemble",
          "method-index-evidence",
          "method-classify",
          "method-extract",
          "method-validate",
          "method-rank",
        ),
      },
    },
    {
      id: "source-file",
      templateId: "TypeScriptModule",
      inputs: {
        imports: refs("base-import", "contract-types-import"),
        declarations: refs("interpreter-class"),
      },
    },
  ],
  finalNodeId: "source-file",
  goal,
});

const expectedHoles = [
  "method-assemble.body",
  "method-classify.body",
  "method-extract.body",
  "method-index-evidence.body",
  "method-interpret.body",
  "method-rank.body",
  "method-validate.body",
];

const rawInputs = graph.nodes.flatMap((currentNode) =>
  Object.entries(currentNode.inputs)
    .filter(([, input]) =>
      typeof input === "object"
      && input !== null
      && "kind" in input
      && input.kind === "rawCode"
    )
    .map(([inputName]) => `${currentNode.id}.${inputName}`)
);

if (rawInputs.length > 0) {
  throw new Error(`Starter graph contains raw-code inputs: ${rawInputs.join(", ")}`);
}

const result = compiler(graph, {
  mode: "partial",
  compilationScope: "edi-interpreter-type-derived-starter",
  checkSemanticDiagnostics: false,
  securityPolicy: { forbidImports: false },
  format: "ts-morph",
});

function manifestOf(
  template: GraphTemplateDefinition,
): GraphTemplateManifest {
  return {
    modelId: template.modelId,
    ...(template.version === undefined ? {} : { version: template.version }),
    ...(template.description === undefined
      ? {}
      : { description: template.description }),
    ...(template.typeParameters === undefined
      ? {}
      : { typeParameters: template.typeParameters }),
    inputs: template.inputs,
    output: template.output,
    source: template.source,
  };
}

export const validateEditTemplateManifests =
  templates.map(manifestOf);

export const validateEditStarterGraph =
  normalizeSynthesisGraph(graph).graph;

export const validateEditGoal = goal;



// if (!result.ok) {
//   console.error(JSON.stringify({ ok: false, diagnostics: result.diagnostics }, null, 2));
//   process.exitCode = 1;
// } else if (!("unresolvedInputs" in result.finalArtifact)) {
//   console.error("Starter graph unexpectedly produced a complete artifact.");
//   process.exitCode = 1;
// } else {
//   const actualHoles = result.finalArtifact.unresolvedInputs
//     .map((input) => `${input.nodeId}.${input.inputName}`)
//     .sort();

//   if (JSON.stringify(actualHoles) !== JSON.stringify(expectedHoles)) {
//     throw new Error(
//       `Starter holes changed: expected ${expectedHoles.join(", ")}; received ${actualHoles.join(", ")}`
//     );
//   }

//   console.log(JSON.stringify({
//     ok: true,
//     templateCount: compiler.catalog.summaries().length,
//     nodeCount: graph.nodes.length,
//     rawInputCount: rawInputs.length,
//     artifactState: "partial",
//     unresolvedInputCount: actualHoles.length,
//     unresolvedInputs: actualHoles,
//     code: result.finalArtifact.code,
//   }, null, 2));
// }
