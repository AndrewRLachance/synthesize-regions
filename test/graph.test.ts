import { P } from "ts-pattern";
import { describe, expect, it } from "vitest";
import {
  compileGraph,
  createTemplateRegistry,
  defineTemplate,
  fragmentPort,
  literalPort,
  type SynthesisGraph
} from "../src/index.js";

function createGraphRegistry() {
  const source = defineTemplate({
    modelId: "BooleanArrayLiteral",
    version: "1.0.0",
    inputs: {
      values: literalPort({
        regionKind: "expression",
        schema: {
          type: "array",
          items: { type: "boolean" }
        }
      })
    },
    output: {
      kind: "expression",
      type: { ts: "boolean[]" },
      schema: {
        type: "array",
        items: { type: "boolean" }
      }
    },
    template: r => r("values")
  });

  const mapper = defineTemplate({
    modelId: "MapBooleanArray",
    inputs: {
      source: fragmentPort({
        regionKind: "expression",
        accepts: {
          outputKind: "expression",
          type: { ts: "boolean[]" }
        }
      })
    },
    output: {
      kind: "expression",
      type: { ts: "boolean[]" }
    },
    template: r => `${r("source")}.map(x => Boolean(x))`
  });

  const expectsStatement = defineTemplate({
    modelId: "ExpectStatement",
    inputs: {
      source: fragmentPort({
        regionKind: "statement",
        accepts: {
          outputKind: "statement"
        }
      })
    },
    output: {
      kind: "statement"
    },
    template: r => r("source")
  });

  const expectsNumbers = defineTemplate({
    modelId: "ExpectNumberArray",
    inputs: {
      source: fragmentPort({
        regionKind: "expression",
        accepts: {
          outputKind: "expression",
          type: { ts: "number[]" }
        }
      })
    },
    output: {
      kind: "expression",
      type: { ts: "number[]" }
    },
    template: r => r("source")
  });

  return createTemplateRegistry([source, mapper, expectsStatement, expectsNumbers]);
}

function validGraph(): SynthesisGraph {
  return {
    nodes: [
      {
        id: "source",
        templateId: "BooleanArrayLiteral",
        inputs: {
          values: { kind: "literal", value: [true, false, true] }
        }
      },
      {
        id: "mapped",
        templateId: "MapBooleanArray",
        inputs: {
          source: { kind: "ref", nodeId: "source" }
        }
      }
    ],
    finalNodeId: "mapped"
  };
}

describe("schema-driven synthesis graph", () => {
  it("compiles a valid two-node graph", () => {
    const result = compileGraph(validGraph(), createGraphRegistry());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalFragment).toMatchObject({
      id: "mapped",
      code: "[true, false, true].map(x => Boolean(x))",
      kind: "expression",
      source: { templateId: "MapBooleanArray" },
      type: { ts: "boolean[]" }
    });
    expect(result.fragments.get("source")?.code).toBe("[true, false, true]");
  });

  it("rejects duplicate node IDs", () => {
    const graph = validGraph();
    graph.nodes.push({ ...graph.nodes[0]!, id: "source" });

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(diagnostic => diagnostic.code === "DuplicateNodeId")).toBe(true);
  });

  it("rejects unknown template IDs", () => {
    const graph = validGraph();
    graph.nodes[0] = { ...graph.nodes[0]!, templateId: "MissingTemplate" };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(diagnostic => diagnostic.code === "UnknownTemplate")).toBe(true);
  });

  it("rejects a missing final node", () => {
    const graph = { ...validGraph(), finalNodeId: "missing" };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(diagnostic => diagnostic.code === "UnknownFinalNode")).toBe(true);
  });

  it("rejects unknown references with node and input diagnostics", () => {
    const graph = validGraph();
    graph.nodes[1] = {
      ...graph.nodes[1]!,
      inputs: { source: { kind: "ref", nodeId: "missing" } }
    };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "UnknownReference",
      nodeId: "mapped",
      inputName: "source"
    }));
  });

  it("rejects cyclic graphs", () => {
    const graph: SynthesisGraph = {
      nodes: [
        {
          id: "a",
          templateId: "MapBooleanArray",
          inputs: { source: { kind: "ref", nodeId: "b" } }
        },
        {
          id: "b",
          templateId: "MapBooleanArray",
          inputs: { source: { kind: "ref", nodeId: "a" } }
        }
      ],
      finalNodeId: "a"
    };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(diagnostic => diagnostic.code === "CycleDetected")).toBe(true);
  });

  it("rejects incompatible fragment kinds", () => {
    const graph = validGraph();
    graph.nodes[1] = { ...graph.nodes[1]!, templateId: "ExpectStatement" };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(diagnostic => diagnostic.code === "IncompatibleFragmentKind")).toBe(true);
  });

  it("rejects incompatible fragment types", () => {
    const graph = validGraph();
    graph.nodes[1] = { ...graph.nodes[1]!, templateId: "ExpectNumberArray" };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(diagnostic => diagnostic.code === "IncompatibleFragmentType")).toBe(true);
  });

  it("rejects missing required inputs", () => {
    const graph = validGraph();
    graph.nodes[1] = { ...graph.nodes[1]!, inputs: {} };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(diagnostic => diagnostic.code === "MissingRequiredInput")).toBe(true);
  });

  it("rejects unknown inputs", () => {
    const graph = validGraph();
    graph.nodes[0] = {
      ...graph.nodes[0]!,
      inputs: {
        ...graph.nodes[0]!.inputs,
        extra: { kind: "literal", value: true }
      }
    };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(diagnostic => diagnostic.code === "UnknownInput")).toBe(true);
  });

  it("validates final graph goals", () => {
    const graph: SynthesisGraph = {
      ...validGraph(),
      goal: {
        outputKind: "expression",
        type: { ts: "number[]" }
      }
    };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(diagnostic => diagnostic.code === "FinalGoalTypeMismatch")).toBe(true);
  });

  it("preserves legacy pattern-based defineTemplate compatibility", () => {
    const legacy = defineTemplate({
      modelId: "LegacyAddOne",
      outputKind: "expression",
      pattern: {
        value: {
          input: P.number,
          output: "number"
        }
      },
      template: r => `${r("value", "oldValue")} + 1`
    });

    expect(legacy.apply({ value: 1 }).code).toBe("1 + 1");
  });
});

