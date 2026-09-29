import { describe, expect, it } from "vitest";
import {
  compileGraph,
  createTemplateRegistry,
  defineTemplate,
  discoverReplacementRegions,
  discoverSourceTemplates,
  fillTemplateArtifactWithCatalog,
  fragmentPort,
  generateSourceTemplateWithReplacements,
  generateWithReplacements,
  InvalidMarkerArityError,
  InvalidPlaceholderContextError,
  InvalidReplacementKindError,
  InvalidReplacementSyntaxError,
  SecurityPolicyViolationError,
  validateTemplateCatalog,
  type InputPort,
  type SynthesisGraph
} from "../src/index.js";

describe("sourceFile template syntax", () => {
  it("replaces one complete top-level source-file region", () => {
    const sourceText = `
// retained header
/** @TYPE sourceFile id=module **/
export type OldValue = string;
export const oldValue = 1;
/** @END **/
`;

    const result = generateWithReplacements(sourceText, {
      module: {
        kind: "sourceFile",
        code: "export interface User { id: string }\nexport const user: User = { id: 'one' };"
      }
    });

    expect(result.regions[0]).toMatchObject({
      id: "module",
      explicitType: "sourceFile",
      effectiveType: "sourceFile",
      arity: "one"
    });
    expect(result.code).toContain("// retained header");
    expect(result.code).toContain("export interface User");
    expect(result.code).toContain("export const user");
    expect(result.code).not.toContain("OldValue");
    expect(result.diagnostics.syntactic).toEqual([]);
  });

  it("infers sourceFile for a region containing multiple complete top-level statements", () => {
    const sourceText = `/** @TYPE id=module **/
export const first = 1;
export const second = 2;
/** @END **/`;

    expect(discoverReplacementRegions(sourceText)[0]).toMatchObject({
      inferredType: "sourceFile",
      effectiveType: "sourceFile"
    });
  });

  it("allows a complete source file to be empty", () => {
    const result = generateWithReplacements(
      "/** @TYPE sourceFile id=module **/export {};/** @END **/",
      { module: { kind: "sourceFile", code: "" } }
    );

    expect(result.code).toBe("");
    expect(result.diagnostics.syntactic).toEqual([]);
  });

  it("rejects variadic sourceFile markers", () => {
    expect(() => discoverReplacementRegions(
      "/** @TYPE sourceFile[] id=modules **/export {};/** @END **/"
    )).toThrow(InvalidMarkerArityError);
  });

  it("rejects sourceFile regions nested inside another AST construct", () => {
    expect(() => discoverReplacementRegions(`
function enclosing() {
  /** @TYPE sourceFile id=module **/return;/** @END **/
}
`)).toThrow(InvalidPlaceholderContextError);
  });

  it("rejects incompatible and syntactically invalid replacements", () => {
    const sourceText = "/** @TYPE sourceFile id=module **/export {};/** @END **/";

    expect(() => generateWithReplacements(sourceText, {
      module: { kind: "declaration", code: "export const value = 1;" }
    })).toThrow(InvalidReplacementKindError);

    expect(() => generateWithReplacements(sourceText, {
      module: { kind: "sourceFile", code: "export const = ;" }
    })).toThrow(InvalidReplacementSyntaxError);
  });

  it("applies the full raw-code security policy to source files", () => {
    const sourceText = "/** @TYPE sourceFile id=module **/export {};/** @END **/";
    const replacement = {
      module: { kind: "sourceFile" as const, code: "import { value } from './value.js';\nexport { value };" }
    };

    expect(() => generateWithReplacements(sourceText, replacement))
      .toThrow(SecurityPolicyViolationError);
    expect(() => generateWithReplacements(sourceText, replacement, {
      securityPolicy: { forbidImports: false }
    })).not.toThrow();

    for (const code of [
      "export * from './side-effect.js';",
      "export { value } from './side-effect.js';"
    ]) {
      expect(() => generateWithReplacements(sourceText, {
        module: { kind: "sourceFile", code }
      })).toThrow(SecurityPolicyViolationError);
    }

    expect(() => generateWithReplacements(sourceText, {
      module: { kind: "sourceFile", code: "const value = 1;\nexport { value };" }
    })).not.toThrow();
  });

  it("infers file mode for source-template boundaries", () => {
    const annotatedSource = `
/** @TEMPLATE id=Module output=sourceFile **/
/** @TYPE declaration id=declaration **/type Old = unknown;/** @END **/
export const version = 1;
/** @END_TEMPLATE **/
`;
    const [template] = discoverSourceTemplates(annotatedSource);

    expect(template).toMatchObject({ outputKind: "sourceFile", templateMode: { kind: "file" } });
    const result = generateSourceTemplateWithReplacements(annotatedSource, "Module", {
      declaration: { kind: "declaration", code: "export interface Value { id: string }" }
    });
    expect(result.code).toContain("export interface Value");
    expect(result.code).toContain("export const version = 1");
  });
});

describe("sourceFile graph contracts", () => {
  const SourceModule = defineTemplate({
    modelId: "SourceModule",
    inputs: {},
    output: { kind: "sourceFile" },
    source: "export const value = 1;"
  });
  const SourceModuleConsumer = defineTemplate({
    modelId: "SourceModuleConsumer",
    inputs: {
      module: fragmentPort({
        regionKind: "sourceFile",
        accepts: { outputKind: "sourceFile", sourceModelIds: ["SourceModule"] }
      })
    },
    output: { kind: "sourceFile" },
    source: "/** @TYPE sourceFile id=module **/export {};/** @END **/"
  });
  const DeclarationModule = defineTemplate({
    modelId: "DeclarationModule",
    inputs: {},
    output: { kind: "declaration" },
    source: "export const value = 1;"
  });

  it("rejects non-scalar and value-metadata sourceFile catalog contracts", () => {
    const sourceMarker = (kind: "sourceFile" | "declaration", id: string, body: string) =>
      `/** @TYPE ${kind} id=${id} **/${body}/** @END **/`;
    const invalid = defineTemplate({
      modelId: "InvalidSourceFileContracts",
      inputs: {
        literal: { kind: "literal", regionKind: "sourceFile" } as InputPort,
        raw: { kind: "rawCode", regionKind: "sourceFile" } as InputPort,
        collection: {
          kind: "fragmentCollection",
          regionKind: "sourceFile",
          accepts: { outputKind: "sourceFile" }
        } as InputPort,
        typedFragment: {
          kind: "fragment",
          regionKind: "sourceFile",
          accepts: { outputKind: "sourceFile", type: { ts: "string" } }
        } as InputPort,
        wrongOutput: {
          kind: "fragment",
          regionKind: "sourceFile",
          accepts: { outputKind: "expression" }
        } as InputPort,
        wrongRegion: {
          kind: "fragment",
          regionKind: "declaration",
          accepts: { outputKind: "sourceFile" }
        } as InputPort
      },
      output: {
        kind: "sourceFile",
        type: { ts: "string" },
        schema: { type: "string" }
      } as any,
      source: [
        sourceMarker("sourceFile", "literal", "export {};"),
        sourceMarker("sourceFile", "raw", "export {};"),
        sourceMarker("sourceFile", "collection", "export {};"),
        sourceMarker("sourceFile", "typedFragment", "export {};"),
        sourceMarker("sourceFile", "wrongOutput", "export {};"),
        sourceMarker("declaration", "wrongRegion", "export const old = 1;")
      ].join("\n")
    });

    const diagnostics = validateTemplateCatalog([invalid]);
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "IncompatibleInputKind", path: "templates[0].inputs.literal.regionKind" }),
      expect.objectContaining({ code: "IncompatibleInputKind", path: "templates[0].inputs.raw.regionKind" }),
      expect.objectContaining({ code: "IncompatibleInputKind", path: "templates[0].inputs.collection.regionKind" }),
      expect.objectContaining({ code: "IncompatibleSourceFileMetadata", path: "templates[0].inputs.typedFragment.accepts.type" }),
      expect.objectContaining({ code: "IncompatibleFragmentKind", path: "templates[0].inputs.wrongOutput.accepts.outputKind" }),
      expect.objectContaining({ code: "IncompatibleFragmentKind", path: "templates[0].inputs.wrongRegion.accepts.outputKind" }),
      expect.objectContaining({ code: "IncompatibleSourceFileMetadata", path: "templates[0].output.type" }),
      expect.objectContaining({ code: "IncompatibleSourceFileMetadata", path: "templates[0].output.schema" })
    ]));
  });

  it("composes sourceFile fragments by exact kind and validates file semantics", () => {
    const registry = createTemplateRegistry([SourceModule, SourceModuleConsumer]);
    const result = compileGraph({
      nodes: [
        { id: "source", templateId: "SourceModule", inputs: {} },
        { id: "consumer", templateId: "SourceModuleConsumer", inputs: { module: { $ref: "source" } } }
      ],
      finalNodeId: "consumer",
      goal: { outputKind: "sourceFile" }
    }, registry, { checkSemanticDiagnostics: true });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalArtifact).toMatchObject({ kind: "sourceFile", code: "export const value = 1;" });
    }

    const InvalidSemanticModule = defineTemplate({
      modelId: "InvalidSemanticModule",
      inputs: {},
      output: { kind: "sourceFile" },
      source: "export const value: string = 1;"
    });
    const invalid = compileGraph({
      nodes: [{ id: "invalid", templateId: "InvalidSemanticModule", inputs: {} }],
      finalNodeId: "invalid",
      goal: { outputKind: "sourceFile" }
    }, createTemplateRegistry([InvalidSemanticModule]), { checkSemanticDiagnostics: true });
    expect(invalid.ok).toBe(false);
    expect(invalid.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "TypeScriptSemanticError", nodeId: "invalid" })
    ]));
  });

  it("keeps source-file prologues ahead of semantic preludes and checks prelude syntax", () => {
    const HashbangModule = defineTemplate({
      modelId: "HashbangModule",
      inputs: {},
      output: { kind: "sourceFile" },
      source: "#!/usr/bin/env node\nexport const value: number = externalValue;"
    });
    const graph = {
      nodes: [{ id: "module", templateId: "HashbangModule", inputs: {} }],
      finalNodeId: "module",
      goal: { outputKind: "sourceFile" }
    } as const;

    const valid = compileGraph(graph, [HashbangModule], {
      checkSemanticDiagnostics: true,
      semanticContext: { prelude: "declare const externalValue: number;" }
    });
    expect(valid.ok).toBe(true);

    const invalidPrelude = compileGraph(graph, [HashbangModule], {
      checkSemanticDiagnostics: true,
      semanticContext: { prelude: "declare const externalValue: ;" }
    });
    expect(invalidPrelude.ok).toBe(false);
    expect(invalidPrelude.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "TypeScriptSemanticError", nodeId: "module" })
    ]));
  });

  it("rejects value-level sourceFile goal metadata", () => {
    const registry = createTemplateRegistry([SourceModule]);
    const graph: SynthesisGraph = {
      nodes: [{ id: "source", templateId: "SourceModule", inputs: {} }],
      finalNodeId: "source",
      goal: {
        outputKind: "sourceFile",
        type: { ts: "string" },
        schema: { type: "string" }
      }
    };
    const result = compileGraph(graph, registry);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.classification).toBe("graphRepairable");
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "IncompatibleSourceFileMetadata", path: "goal.type" }),
      expect.objectContaining({ code: "IncompatibleSourceFileMetadata", path: "goal.schema" })
    ]));

    const inferredGoal = compileGraph({
      ...graph,
      goal: { type: { ts: "string" } }
    }, registry);
    expect(inferredGoal.ok).toBe(false);
    expect(inferredGoal.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "IncompatibleSourceFileMetadata", path: "goal.type" })
    ]));
  });

  it("checks sourceFile kinds and metadata when filling partial artifacts", () => {
    const registry = createTemplateRegistry([SourceModule, SourceModuleConsumer, DeclarationModule]);
    const source = compileGraph({
      nodes: [{ id: "source", templateId: "SourceModule", inputs: {} }],
      finalNodeId: "source"
    }, registry);
    const declaration = compileGraph({
      nodes: [{ id: "declaration", templateId: "DeclarationModule", inputs: {} }],
      finalNodeId: "declaration"
    }, registry);
    const partial = compileGraph({
      nodes: [{ id: "consumer", templateId: "SourceModuleConsumer", inputs: {} }],
      finalNodeId: "consumer"
    } as SynthesisGraph, registry, { mode: "partial" });
    expect(source.ok && declaration.ok && partial.ok && partial.finalArtifact.complete === false).toBe(true);
    if (!source.ok || !declaration.ok || !partial.ok || partial.finalArtifact.complete !== false) return;

    const inputId = partial.finalArtifact.unresolvedInputs[0]!.id;
    const wrongKind = fillTemplateArtifactWithCatalog(partial.finalArtifact, {
      [inputId]: { kind: "fragment", fragment: declaration.finalArtifact }
    }, registry);
    expect(wrongKind.ok).toBe(false);
    expect(wrongKind.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "IncompatibleFragmentKind" })
    ]));

    const invalidMetadata = fillTemplateArtifactWithCatalog(partial.finalArtifact, {
      [inputId]: {
        kind: "fragment",
        fragment: { ...source.finalArtifact, type: { ts: "string" } }
      }
    }, registry);
    expect(invalidMetadata.ok).toBe(false);
    expect(invalidMetadata.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "IncompatibleSourceFileMetadata", path: "type" })
    ]));

    const filled = fillTemplateArtifactWithCatalog(partial.finalArtifact, {
      [inputId]: { kind: "fragment", fragment: source.finalArtifact }
    }, registry);
    expect(filled.ok).toBe(true);
    if (filled.ok) expect(filled.artifact).toMatchObject({ kind: "sourceFile", code: "export const value = 1;" });
  });
});
