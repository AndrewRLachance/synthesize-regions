import { isMatching, type P } from "ts-pattern";
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
  REGION_KIND_VALUES,
  regionKindPattern,
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

/**
 * Match a value against an exported pattern.
 *
 * The two-argument `isMatching(pattern, value)` overload infers its value type
 * from the pattern, and `KnownPattern<T>` is invariant in `T`, so a pattern over
 * a wide union rejects the narrower literal shapes these tests intentionally
 * probe. The curried overload takes the value as `unknown`, which keeps the
 * runtime check identical while letting these tests assert both accepting and
 * rejecting inputs.
 */
function matches(pattern: P.Pattern<unknown>, value: unknown): boolean {
  return isMatching(pattern)(value);
}

describe("graph ts-pattern matchers", () => {
  it("matches every exact region syntax context", () => {
    for (const kind of REGION_KIND_VALUES) expect(matches(regionKindPattern, kind)).toBe(true);
    expect(matches(regionKindPattern, "methodBody")).toBe(false);
  });

  it("matches strict graph compilation results deeply", () => {
    const result = {
      kind: "graphCompilation",
      mode: "strict",
      ok: true,
      finalArtifact: { ...fragment, complete: true },
      artifacts: { source: { ...fragment, complete: true } },
      diagnostics: []
    };

    expect(matches(graphCompilationResultPattern, result)).toBe(true);
    expect(isGraphCompilationResult(result)).toBe(true);
  });

  it("matches structured TypeScript semantic diagnostics", () => {
    const result = {
      kind: "graphCompilation",
      mode: "strict",
      ok: false,
      classification: "graphRepairable",
      diagnostics: [{
        origin: "candidate",
        stage: "type",
        code: "TypeScriptSemanticError",
        severity: "error",
        message: "Type mismatch.",
        compilerCode: 2322,
        compilerCategory: "error",
        line: 1,
        column: 7
      }]
    };

    expect(matches(graphCompilationResultPattern, result)).toBe(true);
    expect(isGraphCompilationResult(result)).toBe(true);
  });

  it("rejects strict result maps with invalid fragment values", () => {
    expect(matches(generatedFragmentRecordPattern, { source: { code: "value" } })).toBe(false);
  });

  it("matches nested union input ports", () => {
    expect(matches(inputPortPattern, {
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
    expect(matches(inputPortPattern, {
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

    expect(matches(synthesisGraphPattern, graph)).toBe(true);
    expect(matches(definedSynthesisGraphPattern, graph)).toBe(true);
    expect(matches(strictSynthesisGraphPattern, graph)).toBe(true);
    expect(isSynthesisGraph(graph)).toBe(true);
  });

  it("rejects synthesis graphs with invalid nested graph inputs", () => {
    expect(matches(synthesisGraphPattern, {
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

    expect(matches(partialTemplateArtifactPattern, partialArtifact)).toBe(true);
    expect(matches(graphPartialCompilationResultPattern, result)).toBe(true);
    expect(isGraphPartialCompilationResult(result)).toBe(true);
    expect(matches(graphPartialCompilationCompleteSuccessPattern, result)).toBe(false);
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

    expect(matches(graphPartialCompilationCompleteSuccessPattern, result)).toBe(true);
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

    expect(matches(graphPartialCompilationCompleteSuccessPattern, result)).toBe(false);
  });

  it("matches artifact fill/finalize results", () => {
    const result = {
      kind: "templateArtifact",
      ok: true,
      artifact: { ...fragment, complete: true },
      diagnostics: []
    };

    expect(matches(templateArtifactResultPattern, result)).toBe(true);
    expect(isTemplateArtifactResult(result)).toBe(true);
    expect(matches(templateArtifactCompleteSuccessPattern, result)).toBe(true);
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

    expect(matches(templateArtifactResultPattern, result)).toBe(true);
    expect(matches(templateArtifactCompleteSuccessPattern, result)).toBe(false);
  });

  it("does not cross-match result failure families", () => {
    const artifactFailure = {
      kind: "templateArtifact",
      ok: false,
      classification: "artifactFillable",
      diagnostics: []
    } as const;

    expect(matches(templateArtifactResultPattern, artifactFailure)).toBe(true);
    expect(matches(graphCompilationResultPattern, artifactFailure)).toBe(false);
    expect(matches(graphPartialCompilationResultPattern, artifactFailure)).toBe(false);
  });
});
