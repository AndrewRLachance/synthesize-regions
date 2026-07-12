import { isMatching } from "ts-pattern";
import { describe, expect, it } from "vitest";
import {
  definedSynthesisGraphPattern,
  generatedFragmentRecordPattern,
  graphCompilationResultPattern,
  graphPartialCompilationCompleteSuccessPattern,
  graphPartialCompilationResultPattern,
  inputPortPattern,
  isGraphCompilationResult,
  isGraphPartialCompilationResult,
  isSynthesisGraph,
  isTemplateArtifactResult,
  partialTemplateArtifactPattern,
  strictSynthesisGraphPattern,
  synthesisGraphPattern,
  templateArtifactCompleteSuccessPattern,
  templateArtifactResultPattern
} from "../src/index.js";

const fragment = {
  id: "source",
  code: "value",
  kind: "expression",
  source: { templateId: "SourceTemplate" }
} as const;

describe("graph ts-pattern matchers", () => {
  it("matches strict graph compilation results deeply", () => {
    const result = {
      kind: "graphCompilation",
      mode: "strict",
      ok: true,
      finalArtifact: { ...fragment, complete: true },
      artifacts: { source: { ...fragment, complete: true } },
      diagnostics: []
    };

    expect(isMatching(graphCompilationResultPattern, result)).toBe(true);
    expect(isGraphCompilationResult(result)).toBe(true);
  });

  it("rejects strict result maps with invalid fragment values", () => {
    expect(isMatching(generatedFragmentRecordPattern, { source: { code: "value" } })).toBe(false);
  });

  it("matches nested union input ports", () => {
    expect(isMatching(inputPortPattern, {
      kind: "union",
      options: [
        {
          kind: "literal",
          regionKind: "expression",
          schema: { type: "boolean" }
        },
        {
          kind: "rawCode",
          regionKind: "expression",
          policy: { allowNewlines: false }
        }
      ]
    })).toBe(true);
  });

  it("rejects union input ports with invalid nested options", () => {
    expect(isMatching(inputPortPattern, {
      kind: "union",
      options: [{ kind: "literal", regionKind: "not-a-region-kind" }]
    })).toBe(false);
  });

  it("matches synthesis graphs through base, defined, and strict graph patterns", () => {
    const graph = {
      nodes: [
        {
          id: "source",
          templateId: "SourceTemplate",
          inputs: {
            value: { kind: "literal", value: true },
            fallback: { kind: "rawCode", code: "x => x" }
          }
        },
        {
          id: "consumer",
          templateId: "ConsumerTemplate",
          inputs: {
            source: { $ref: "source" },
            nested: {
              kind: "inline",
              node: {
                id: "nested",
                templateId: "NestedTemplate",
                inputs: {
                  source: { kind: "ref", nodeId: "source" }
                }
              }
            }
          }
        }
      ],
      finalNodeId: "consumer",
      goal: {
        outputKind: "expression"
      }
    } as const;

    expect(isMatching(synthesisGraphPattern, graph)).toBe(true);
    expect(isMatching(definedSynthesisGraphPattern, graph)).toBe(true);
    expect(isMatching(strictSynthesisGraphPattern, graph)).toBe(true);
    expect(isSynthesisGraph(graph)).toBe(true);
  });

  it("rejects synthesis graphs with invalid nested graph inputs", () => {
    expect(isMatching(synthesisGraphPattern, {
      nodes: [
        {
          id: "source",
          templateId: "SourceTemplate",
          inputs: {
            source: { kind: "ref" }
          }
        }
      ],
      finalNodeId: "source"
    })).toBe(false);
  });

  it("matches partial artifacts and partial compilation results deeply", () => {
    const partialArtifact = {
      ...fragment,
      complete: false,
      unresolvedInputs: [
        {
          id: "partial1__node__handler",
          inputName: "handler",
          nodeId: "node",
          templateId: "Consumer",
          port: {
            kind: "fragment",
            regionKind: "expression",
            accepts: { outputKind: "expression" }
          }
        }
      ]
    };
    const result = {
      kind: "graphCompilation",
      mode: "partial",
      ok: true,
      finalArtifact: partialArtifact,
      artifacts: { node: partialArtifact },
      diagnostics: []
    };

    expect(isMatching(partialTemplateArtifactPattern, partialArtifact)).toBe(true);
    expect(isMatching(graphPartialCompilationResultPattern, result)).toBe(true);
    expect(isGraphPartialCompilationResult(result)).toBe(true);
    expect(isMatching(graphPartialCompilationCompleteSuccessPattern, result)).toBe(false);
  });

  it("matches partial compilation results with an explicitly complete final artifact", () => {
    const completeArtifact = {
      ...fragment,
      complete: true
    } as const;
    const result = {
      kind: "graphCompilation",
      mode: "partial",
      ok: true,
      finalArtifact: completeArtifact,
      artifacts: { source: completeArtifact },
      diagnostics: []
    } as const;

    expect(isMatching(graphPartialCompilationCompleteSuccessPattern, result)).toBe(true);
  });

  it("requires complete to be explicitly true for complete partial compilation results", () => {
    const result = {
      kind: "graphCompilation",
      mode: "partial",
      ok: true,
      finalArtifact: fragment,
      artifacts: { source: fragment },
      diagnostics: []
    } as const;

    expect(isMatching(graphPartialCompilationCompleteSuccessPattern, result)).toBe(false);
  });

  it("matches artifact fill/finalize results", () => {
    const result = {
      kind: "templateArtifact",
      ok: true,
      artifact: { ...fragment, complete: true },
      diagnostics: []
    };

    expect(isMatching(templateArtifactResultPattern, result)).toBe(true);
    expect(isTemplateArtifactResult(result)).toBe(true);
    expect(isMatching(templateArtifactCompleteSuccessPattern, result)).toBe(true);
  });

  it("rejects partial artifacts for complete artifact success results", () => {
    const result = {
      kind: "templateArtifact",
      ok: true,
      artifact: {
        ...fragment,
        complete: false,
        unresolvedInputs: [
          {
            id: "partial1__node__handler",
            inputName: "handler",
            nodeId: "node",
            templateId: "Consumer",
            port: {
              kind: "fragment",
              regionKind: "expression",
              accepts: { outputKind: "expression" }
            }
          }
        ]
      },
      diagnostics: []
    };

    expect(isMatching(templateArtifactResultPattern, result)).toBe(true);
    expect(isMatching(templateArtifactCompleteSuccessPattern, result)).toBe(false);
  });

  it("does not cross-match result failure families", () => {
    const artifactFailure = {
      kind: "templateArtifact",
      ok: false,
      diagnostics: []
    } as const;

    expect(isMatching(templateArtifactResultPattern, artifactFailure)).toBe(true);
    expect(isMatching(graphCompilationResultPattern, artifactFailure)).toBe(false);
    expect(isMatching(graphPartialCompilationResultPattern, artifactFailure)).toBe(false);
  });
});
