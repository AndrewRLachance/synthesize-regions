import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// import { BooleanArrayLiteral, MapBooleanArray, sampleGraph, sampleRegistry } from "../src/templates/sample.js";
import { defineTemplate, graphTemplateDefinitionToJsonSchema, literalPort, rawCodePort, unionPort } from "../src/index.js";
import type { InputPortSummary, SynthesisGraph, SynthesisInput, TemplateSummary } from "../src/index.js";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(currentDir, "..");

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(rootDir, path), "utf8")) as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRegionKind(value: unknown): boolean {
  return [
    "identifier",
    "expression",
    "expressionSuffix",
    "statement",
    "array",
    "object",
    "string",
    "number",
    "boolean",
    "null",
    "objectProperty"
  ].includes(String(value));
}

function isTypeDescriptor(value: unknown): boolean {
  return isRecord(value) &&
    (value.ts === undefined || typeof value.ts === "string") &&
    true;
}

function isSynthesisInput(value: unknown): value is SynthesisInput {
  if (!isRecord(value)) return false;

  if (typeof value.$ref === "string") {
    return Object.keys(value).length === 1;
  }

  switch (value.kind) {
    case "literal":
      return Object.prototype.hasOwnProperty.call(value, "value");
    case "ref":
      return typeof value.nodeId === "string";
    case "rawCode":
      return typeof value.code === "string";
    case "inline":
      return isSynthesisNode(value.node);
    default:
      return false;
  }
}

function isSynthesisNode(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.templateId === "string" &&
    isRecord(value.inputs) &&
    Object.values(value.inputs).every(isSynthesisInput);
}

function isSynthesisGraph(value: unknown): value is SynthesisGraph {
  return isRecord(value) &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isSynthesisNode) &&
    typeof value.finalNodeId === "string" &&
    (
      value.goal === undefined ||
      (
        isRecord(value.goal) &&
        (value.goal.outputKind === undefined || isRegionKind(value.goal.outputKind)) &&
        (value.goal.type === undefined || isTypeDescriptor(value.goal.type))
      )
    );
}

function isRawCodePolicy(value: unknown): boolean {
  return isRecord(value) &&
    (value.description === undefined || typeof value.description === "string") &&
    (value.maxLength === undefined || Number.isInteger(value.maxLength)) &&
    (value.allowNewlines === undefined || typeof value.allowNewlines === "boolean") &&
    (value.forbiddenSubstrings === undefined || (Array.isArray(value.forbiddenSubstrings) && value.forbiddenSubstrings.every(item => typeof item === "string"))) &&
    (value.forbiddenPatterns === undefined || (Array.isArray(value.forbiddenPatterns) && value.forbiddenPatterns.every(item => typeof item === "string")));
}

function isInputPortSummary(value: unknown): value is InputPortSummary {
  if (!isRecord(value) || typeof value.required !== "boolean") return false;

  switch (value.kind) {
    case "literal":
      return isRegionKind(value.regionKind);
    case "fragment":
      return isRegionKind(value.regionKind) &&
        isRecord(value.accepts) &&
        isRegionKind(value.accepts.outputKind) &&
        (value.accepts.type === undefined || isTypeDescriptor(value.accepts.type)) &&
        (
          value.accepts.sourceModelIds === undefined ||
          (Array.isArray(value.accepts.sourceModelIds) && value.accepts.sourceModelIds.every(item => typeof item === "string"))
        );
    case "rawCode":
      return isRegionKind(value.regionKind) &&
        (value.policy === undefined || isRawCodePolicy(value.policy)) &&
        (value.type === undefined || isTypeDescriptor(value.type));
    case "union":
      return Array.isArray(value.options) && value.options.every(isInputPortSummary);
    default:
      return false;
  }
}

function isTemplateSummary(value: unknown): value is TemplateSummary {
  return isRecord(value) &&
    typeof value.modelId === "string" &&
    (value.version === undefined || typeof value.version === "string") &&
    (value.description === undefined || typeof value.description === "string") &&
    isRecord(value.inputs) &&
    Object.values(value.inputs).every(isInputPortSummary) &&
    isRecord(value.output) &&
    isRegionKind(value.output.kind) &&
    (value.output.type === undefined || isTypeDescriptor(value.output.type));
}

describe("graph JSON Schemas", () => {
  it("publishes graph and template-summary schemas as draft 2020-12 JSON Schema", () => {
    const graphSchema = readJson("schemas/synthesis-graph.schema.json");
    const summarySchema = readJson("schemas/template-summary.schema.json");

    expect(graphSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(graphSchema.title).toBe("synthesize-regions SynthesisGraph");
    expect(graphSchema).toHaveProperty("$defs.synthesisInput.oneOf");
    expect(graphSchema).toHaveProperty("$defs.refShorthandInput.properties.$ref");

    expect(summarySchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(summarySchema.title).toBe("synthesize-regions TemplateSummary");
    expect(summarySchema).toHaveProperty("$defs.inputPortSummary.oneOf");
    expect(summarySchema).toHaveProperty("$defs.rawCodePolicy.properties.forbiddenPatterns");
  });

  it("exports graph schemas from package subpaths", () => {
    const packageJson = readJson("package.json");
    const exportsMap = packageJson.exports as Record<string, unknown>;

    expect(exportsMap["./schemas/replacement-map.schema.json"]).toBe("./schemas/replacement-map.schema.json");
    expect(exportsMap["./schemas/synthesis-graph.schema.json"]).toBe("./schemas/synthesis-graph.schema.json");
    expect(exportsMap["./schemas/template-summary.schema.json"]).toBe("./schemas/template-summary.schema.json");
  });

  // it("models canonical graph and template-summary values structurally", () => {
  //   expect(isSynthesisGraph(sampleGraph)).toBe(true);
  //   expect(sampleRegistry.summaries().every(isTemplateSummary)).toBe(true);
  // });

  it("models shorthand refs, inline nodes, and main rejected graph structures", () => {
    expect(isSynthesisGraph({
      nodes: [
        {
          id: "mapped",
          templateId: "MapBooleanArray",
          inputs: {
            source: {
              kind: "inline",
              node: {
                id: "source",
                templateId: "BooleanArrayLiteral",
                inputs: {
                  values: { kind: "literal", value: [true] }
                }
              }
            }
          }
        },
        {
          id: "mappedAgain",
          templateId: "MapBooleanArray",
          inputs: {
            source: { "$ref": "mapped" }
          }
        }
      ],
      finalNodeId: "mappedAgain"
    })).toBe(true);

    expect(isSynthesisGraph({ nodes: [], finalNodeId: 1 })).toBe(false);
    expect(isSynthesisGraph({ nodes: [{ id: "x", templateId: "T", inputs: { value: { kind: "ref" } } }], finalNodeId: "x" })).toBe(false);
    expect(isTemplateSummary({ modelId: "T", inputs: {}, output: { kind: "notARegionKind" } })).toBe(false);
  });

  // it("converts literal-port template definitions into node JSON Schema", () => {
  //   const schema = graphTemplateDefinitionToJsonSchema(BooleanArrayLiteral);

  //   expect(schema).toMatchObject({
  //     $schema: "https://json-schema.org/draft/2020-12/schema",
  //     title: "BooleanArrayLiteral SynthesisNode",
  //     description: "Produces a boolean array expression from a literal input.",
  //     type: "object",
  //     additionalProperties: false,
  //     required: ["id", "templateId", "inputs"],
  //     properties: {
  //       templateId: { const: "BooleanArrayLiteral" },
  //       inputs: {
  //         type: "object",
  //         additionalProperties: false,
  //         required: ["values"],
  //         properties: {
  //           values: {
  //             type: "object",
  //             additionalProperties: false,
  //             required: ["kind", "value"],
  //             properties: {
  //               kind: { const: "literal" },
  //               value: {
  //                 type: "array",
  //                 items: { type: "boolean" }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   });
  // });

  // it("converts fragment-port template definitions into ref-compatible node JSON Schema", () => {
  //   const schema = graphTemplateDefinitionToJsonSchema(MapBooleanArray);
  //   const properties = schema.properties as Record<string, unknown>;
  //   const inputs = (properties.inputs as Record<string, unknown>).properties as Record<string, unknown>;
  //   const source = inputs.source as Record<string, unknown>;

  //   expect((properties.templateId as Record<string, unknown>).const).toBe("MapBooleanArray");
  //   expect(source).toHaveProperty("anyOf");
  //   expect(source.anyOf).toEqual([
  //     expect.objectContaining({ required: ["kind", "nodeId"] }),
  //     expect.objectContaining({ required: ["$ref"] }),
  //     expect.objectContaining({ required: ["kind", "node"] })
  //   ]);
  //   expect(schema).toHaveProperty("$defs.synthesisNode");
  //   expect(schema).toHaveProperty("$defs.synthesisInput");
  // });

  it("converts raw-code and union ports into node JSON Schema", () => {
    const template = defineTemplate({
      modelId: "ScoreOrExpression",
      inputs: {
        score: unionPort({
          required: false,
          options: [
            literalPort({
              regionKind: "expression",
              schema: { type: "number" }
            }),
            rawCodePort({
              regionKind: "expression",
              policy: {
                maxLength: 24,
                allowNewlines: false
              }
            })
          ]
        })
      },
      output: { kind: "expression" },
      template: r => `${r("score")} + 1`
    });

    const schema = graphTemplateDefinitionToJsonSchema(template);
    const properties = schema.properties as Record<string, unknown>;
    const inputs = properties.inputs as Record<string, unknown>;
    const inputProperties = inputs.properties as Record<string, unknown>;
    const score = inputProperties.score as Record<string, unknown>;
    const options = score.anyOf as Array<Record<string, unknown>>;
    const rawCodeOption = options[1] as Record<string, unknown>;
    const rawCodeProperties = rawCodeOption.properties as Record<string, unknown>;
    const code = rawCodeProperties.code as Record<string, unknown>;

    expect(inputs.required).toEqual([]);
    expect(options[0]).toMatchObject({
      properties: {
        kind: { const: "literal" },
        value: { type: "number" }
      }
    });
    expect(rawCodeOption).toMatchObject({
      properties: {
        kind: { const: "rawCode" }
      }
    });
    expect(code).toMatchObject({
      type: "string",
      maxLength: 24,
      pattern: "^[^\\r\\n]*$"
    });
  });
});
