import { describe, expect, it } from "vitest";
import {
  buildGraphCompiler,
  compareTypeDescriptors,
  compileGraph,
  createTemplateRegistry,
  defineGraph,
  defineTemplateCatalog,
  defineTemplate,
  fillTemplateArtifact,
  fragmentCollectionPort,
  fragmentPort,
  finalizeTemplateArtifact,
  isTypeCompatible,
  literalPort,
  normalizeSynthesisGraph,
  rawCodePort,
  TemplateCatalogValidationError,
  unionPort,
  validateJsonSchemaSubset,
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
    source: "/** @TYPE expression id=values **/undefined/** @END **/"
  });

  const mapper = defineTemplate({
    modelId: "MapBooleanArray",
    inputs: {
      source: fragmentPort({
        regionKind: "expression",
        accepts: {
          outputKind: "expression",
          type: { ts: "unknown[]" }
        }
      })
    },
    output: {
      kind: "expression",
      type: { ts: "boolean[]" }
    },
    source: `${"/** @TYPE expression id=source **/undefined/** @END **/"}.map(x => Boolean(x))`
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
    source: "/** @TYPE statement id=source **/throw new Error(\"placeholder\");/** @END **/"
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
    source: "/** @TYPE expression id=source **/undefined/** @END **/"
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

function createRawPolicyRegistry() {
  const rawExpression = defineTemplate({
    modelId: "RawExpression",
    inputs: {
      value: rawCodePort({
        regionKind: "expression",
        policy: {
          maxLength: 24,
          allowNewlines: false,
          forbiddenSubstrings: ["process"],
          forbiddenPatterns: ["\\beval\\s*\\("]
        }
      })
    },
    output: {
      kind: "expression",
      type: { ts: "number" }
    },
		source: "/** @TYPE expression id=value **/undefined/** @END **/"
  });

  return createTemplateRegistry([rawExpression]);
}

function rawPolicyGraph(code: string): SynthesisGraph {
  return {
    nodes: [
      {
        id: "raw",
        templateId: "RawExpression",
        inputs: {
          value: { kind: "rawCode", code }
        }
      }
    ],
    finalNodeId: "raw"
  };
}

function createStructuredConversionRegistry() {
  const arrayLiteral = defineTemplate({
    modelId: "ArrayLiteral",
    inputs: {
      value: literalPort({
        regionKind: "array",
        schema: { type: "array" }
      })
    },
    output: { kind: "array" },
    source: "/** @TYPE array id=value **/[]/** @END **/"
  });

  const objectLiteral = defineTemplate({
    modelId: "ObjectLiteral",
    inputs: {
      value: literalPort({
        regionKind: "object",
        schema: { type: "object" }
      })
    },
    output: { kind: "object" },
    source: "/** @TYPE object id=value **/{}/** @END **/"
  });

  const stringLiteral = defineTemplate({
    modelId: "StringLiteral",
    inputs: {
      value: literalPort({
        regionKind: "string",
        schema: { type: "string" }
      })
    },
    output: { kind: "string" },
    source: "/** @TYPE string id=value **/\"\"/** @END **/"
  });

  const numberLiteral = defineTemplate({
    modelId: "NumberLiteral",
    inputs: {
      value: literalPort({
        regionKind: "number",
        schema: { type: "number" }
      })
    },
    output: { kind: "number" },
    source: "/** @TYPE number id=value **/0/** @END **/"
  });

  const booleanLiteral = defineTemplate({
    modelId: "BooleanLiteral",
    inputs: {
      value: literalPort({
        regionKind: "boolean",
        schema: { type: "boolean" }
      })
    },
    output: { kind: "boolean" },
    source: "/** @TYPE boolean id=value **/false/** @END **/"
  });

  const nullLiteral = defineTemplate({
    modelId: "NullLiteral",
    inputs: {
      value: literalPort({
        regionKind: "null",
        schema: { type: "null" }
      })
    },
    output: { kind: "null" },
    source: "/** @TYPE null id=value **/null/** @END **/"
  });

  const objectPropertyLiteral = defineTemplate({
    modelId: "ObjectPropertyLiteral",
    inputs: {
      prop: literalPort({
        regionKind: "objectProperty",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" }
          },
          required: ["name"]
        }
      })
    },
    output: { kind: "objectProperty" },
    source: "/** @TYPE objectProperty id=prop **/placeholder: undefined/** @END **/"
  });

  const arrayConsumer = defineTemplate({
    modelId: "ArrayConsumer",
    inputs: {
      source: fragmentPort({
        regionKind: "array",
        accepts: { outputKind: "array" }
      })
    },
    output: { kind: "expression" },
    source: `${"/** @TYPE array id=source **/[]/** @END **/"}.length`
  });

  const objectConsumer = defineTemplate({
    modelId: "ObjectConsumer",
    inputs: {
      source: fragmentPort({
        regionKind: "object",
        accepts: { outputKind: "object" }
      })
    },
    output: { kind: "expression" },
    source: `Object.keys(${"/** @TYPE object id=source **/{}/** @END **/"})`
  });

  const scalarConsumer = defineTemplate({
    modelId: "ScalarConsumer",
    inputs: {
      label: fragmentPort({
        regionKind: "string",
        accepts: { outputKind: "string" }
      }),
      count: fragmentPort({
        regionKind: "number",
        accepts: { outputKind: "number" }
      }),
      enabled: fragmentPort({
        regionKind: "boolean",
        accepts: { outputKind: "boolean" }
      }),
      empty: fragmentPort({
        regionKind: "null",
        accepts: { outputKind: "null" }
      })
    },
    output: { kind: "expression" },
    source: `({ label: ${"/** @TYPE string id=label **/\"\"/** @END **/"}, count: ${"/** @TYPE number id=count **/0/** @END **/"}, enabled: ${"/** @TYPE boolean id=enabled **/false/** @END **/"}, empty: ${"/** @TYPE null id=empty **/null/** @END **/"} })`
  });

  const objectPropertyConsumer = defineTemplate({
    modelId: "ObjectPropertyConsumer",
    inputs: {
      prop: fragmentPort({
        regionKind: "objectProperty",
        accepts: { outputKind: "objectProperty" }
      })
    },
    output: { kind: "expression" },
    source: `({ ${"/** @TYPE objectProperty id=prop **/placeholder: undefined/** @END **/"} })`
  });

  const rawArray = defineTemplate({
    modelId: "RawArray",
    inputs: {
      value: rawCodePort({
        regionKind: "array"
      })
    },
    output: { kind: "expression" },
    source: `${"/** @TYPE array id=value **/[]/** @END **/"}.length`
  });

  const rawObjectProperty = defineTemplate({
    modelId: "RawObjectProperty",
    inputs: {
      prop: rawCodePort({
        regionKind: "objectProperty"
      })
    },
    output: { kind: "expression" },
    source: `({ ${"/** @TYPE objectProperty id=prop **/placeholder: undefined/** @END **/"} })`
  });

  const unionExpression = defineTemplate({
    modelId: "UnionExpression",
    inputs: {
      value: unionPort({
        options: [
          literalPort({
            regionKind: "expression",
            schema: { type: "number" }
          }),
          rawCodePort({
            regionKind: "expression",
            policy: { allowNewlines: false }
          })
        ]
      })
    },
    output: { kind: "expression" },
    source: `${"/** @TYPE expression id=value **/undefined/** @END **/"} + 1`
  });

  return createTemplateRegistry([
    arrayLiteral,
    objectLiteral,
    stringLiteral,
    numberLiteral,
    booleanLiteral,
    nullLiteral,
    objectPropertyLiteral,
    arrayConsumer,
    objectConsumer,
    scalarConsumer,
    objectPropertyConsumer,
    rawArray,
    rawObjectProperty,
    unionExpression
  ]);
}

describe("schema-driven synthesis graph", () => {
  it("validates graph template marker placement when defining templates", () => {
    expect(() => defineTemplate({
      modelId: "InvalidIdentifierMarkerPlacement",
      inputs: {
        param: rawCodePort({ regionKind: "identifier" })
      },
      output: { kind: "expression" },
      source: `(${"/** @TYPE identifier id=param **/x/** @END **/"}) => x`
    })).toThrow("Expected the marked body to be an identifier.");
  });

  it("returns authored graphs unchanged from defineGraph", () => {
	    const source = defineTemplate({
	      modelId: "DefineGraphSource",
      inputs: {
        value: literalPort({ regionKind: "expression" })
      },
	      output: { kind: "expression" },
	      source: "/** @TYPE expression id=value **/undefined/** @END **/"
    });
    const graph = {
      nodes: [
        {
          id: "source",
          templateId: "DefineGraphSource",
          inputs: {
            value: { kind: "literal", value: 1 }
          }
        }
      ],
      finalNodeId: "source"
    };

    expect(defineGraph([source] as const, graph)).toBe(graph);
  });

  it("compiles authored template catalogs the same as registries", () => {
    const source = defineTemplate({
      modelId: "CatalogCompileSource",
      inputs: {
        value: literalPort({ regionKind: "expression" })
      },
      output: { kind: "expression" },
      source: "/** @TYPE expression id=value **/undefined/** @END **/"
    });
    const consumer = defineTemplate({
      modelId: "CatalogCompileConsumer",
      inputs: {
        source: fragmentPort({ regionKind: "expression", accepts: {} })
      },
      output: { kind: "expression" },
      source: `wrap(${"/** @TYPE expression id=source **/undefined/** @END **/"})`
    });
    const templates = defineTemplateCatalog([source, consumer]);
    const graph = {
      nodes: [
        {
          id: "source",
          templateId: "CatalogCompileSource",
          inputs: {
            value: { kind: "literal", value: 42 }
          }
        },
        {
          id: "consumer",
          templateId: "CatalogCompileConsumer",
          inputs: {
            source: { "$ref": "source" }
          }
        }
      ],
      finalNodeId: "consumer"
    } as const;

    const catalogResult = compileGraph(graph, templates);
    const registryResult = compileGraph(graph as unknown as SynthesisGraph, createTemplateRegistry(templates));

    expect(catalogResult.ok).toBe(true);
    expect(registryResult.ok).toBe(true);
    if (!catalogResult.ok || !registryResult.ok) return;
    expect(catalogResult.finalArtifact).toEqual(registryResult.finalArtifact);
  });

  it("builds typed graph compilers from authored template catalogs", () => {
    const source = defineTemplate({
      modelId: "BuiltCompilerSource",
      inputs: {
        value: literalPort({ regionKind: "expression" })
      },
      output: { kind: "expression" },
      source: "/** @TYPE expression id=value **/undefined/** @END **/"
    });
    const consumer = defineTemplate({
      modelId: "BuiltCompilerConsumer",
      inputs: {
        source: fragmentPort({ regionKind: "expression", accepts: {} })
      },
      output: { kind: "expression" },
      source: `built(${"/** @TYPE expression id=source **/undefined/** @END **/"})`
    });
    const templates = defineTemplateCatalog([source, consumer]);
    const compiler = buildGraphCompiler(templates);

    const result = compiler({
      nodes: [
        {
          id: "source",
          templateId: "BuiltCompilerSource",
          inputs: {
            value: { kind: "literal", value: 7 }
          }
        },
        {
          id: "consumer",
          templateId: "BuiltCompilerConsumer",
          inputs: {
            source: { "$ref": "source" }
          }
        }
      ],
      finalNodeId: "consumer"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.code).toBe("built(7)");
  });

  it("supports conservative TypeScript type compatibility beyond exact matches", () => {
    expect(isTypeCompatible({ ts: "unknown[]" }, { ts: "boolean[]" })).toBe(true);
    expect(isTypeCompatible({ ts: "Array<unknown>" }, { ts: "Array<boolean>" })).toBe(true);
    expect(isTypeCompatible({ ts: "string | number" }, { ts: "string" })).toBe(true);
    expect(isTypeCompatible({ ts: "string" }, { ts: "string | number" })).toBe(false);
    expect(isTypeCompatible({ ts: "boolean[]" }, { ts: "unknown[]" })).toBe(false);
  });

  it("supports a richer conservative JSON Schema subset", () => {
    expect(isTypeCompatible(
      { schema: { type: "array", items: { type: ["boolean", "null"] } } },
      { schema: { type: "array", items: { type: "boolean" } } }
    )).toBe(true);
    expect(isTypeCompatible(
      { schema: { type: "string", enum: ["strict", "loose"] } },
      { schema: { type: "string", enum: ["strict"] } }
    )).toBe(true);
    expect(validateJsonSchemaSubset("strict", { enum: ["strict", "loose"] }).ok).toBe(true);
    expect(validateJsonSchemaSubset("other", { const: "strict" }).ok).toBe(false);
  });

  it("returns structured canonical descriptor comparison results", () => {
    expect(compareTypeDescriptors(
      { ts: "'ready'", schema: { const: "ready" } },
      { ts: "string", schema: { type: "string" } }
    ).status).toBe("compatible");
    expect(compareTypeDescriptors(
      { ts: "string | number" },
      { ts: "string" }
    ).status).toBe("incompatible");
    expect(compareTypeDescriptors(
      { schema: { type: "string", pattern: "^producer" } },
      { schema: { type: "string", pattern: "^consumer" } }
    ).status).toBe("indeterminate");
    expect(compareTypeDescriptors({ ts: "any" }, { ts: "unknown" }).status).toBe("invalid");
    expect(compareTypeDescriptors({ ts: 42 } as never, undefined).status).toBe("invalid");
    expect(compareTypeDescriptors(
      { nominal: "effect/Effect", ts: "{ pipe(): unknown }" },
      { nominal: "effect/Effect", ts: "{ pipe(): unknown }" }
    ).status).toBe("compatible");
    expect(compareTypeDescriptors(
      { nominal: "effect/Layer", ts: "{ pipe(): unknown }" },
      { nominal: "effect/Effect", ts: "{ pipe(): unknown }" }
    )).toMatchObject({
      status: "incompatible",
      issues: [expect.objectContaining({ code: "NominalTypeMismatch", path: "nominal" })]
    });
    expect(compareTypeDescriptors(
      { ts: "{ pipe(): unknown }" },
      { nominal: "effect/Effect", ts: "{ pipe(): unknown }" }
    ).status).toBe("incompatible");
    expect(compareTypeDescriptors(
      { nominal: "effect/Effect", ts: "{ pipe(): unknown }" },
      { ts: "{ pipe(): unknown }" }
    ).status).toBe("compatible");
    expect(compareTypeDescriptors(
      { nominal: "", ts: "unknown" },
      undefined
    ).status).toBe("invalid");
  });

  it("serializes LLM-facing template summaries without template internals", () => {
    const template = defineTemplate({
      modelId: "SummaryExample",
      version: "1.0.0",
      description: "Example for planner summaries.",
      inputs: {
        fragment: fragmentPort({
          regionKind: "expression",
          accepts: {},
          description: "Expression fragment."
        }),
        value: unionPort({
          description: "A literal value or raw expression.",
          options: [
            literalPort({
              regionKind: "expression",
              schema: { type: "boolean" },
              description: "Boolean literal."
            }),
            rawCodePort({
              regionKind: "expression",
              policy: { description: "Expression-only raw code." },
              type: { ts: "boolean" }
            })
          ]
        })
      },
	      output: {
	        kind: "expression",
	        type: { ts: "boolean" },
	        description: "Boolean expression."
	      },
	      source: `(${"/** @TYPE expression id=fragment **/undefined/** @END **/"}, ${"/** @TYPE expression id=value **/undefined/** @END **/"})`
	    });

    const registry = createTemplateRegistry([template]);
    const summary = registry.summaries()[0];

    expect(summary).toEqual({
      modelId: "SummaryExample",
      version: "1.0.0",
      description: "Example for planner summaries.",
      inputs: {
        fragment: {
          kind: "fragment",
          regionKind: "expression",
          required: true,
          description: "Expression fragment.",
          accepts: {
            outputKind: "expression"
          }
        },
        value: {
          kind: "union",
          required: true,
          description: "A literal value or raw expression.",
          options: [
            {
              kind: "literal",
              regionKind: "expression",
              required: true,
              description: "Boolean literal.",
              schema: { type: "boolean" }
            },
            {
              kind: "rawCode",
              regionKind: "expression",
              required: true,
              policy: { description: "Expression-only raw code." },
              type: { ts: "boolean" }
            }
          ]
        }
      },
      output: {
        kind: "expression",
        type: { ts: "boolean" },
        description: "Boolean expression."
      }
    });
    expect(summary).not.toHaveProperty("template");
  });

  it("defaults omitted fragment outputKind to the port regionKind", () => {
    const source = defineTemplate({
      modelId: "DefaultOutputKindSource",
      inputs: {
        value: literalPort({
          regionKind: "expression",
          schema: { type: "number" }
        })
      },
      output: { kind: "expression" },
      source: "/** @TYPE expression id=value **/undefined/** @END **/"
    });

    const consumer = defineTemplate({
      modelId: "DefaultOutputKindConsumer",
      inputs: {
        source: fragmentPort({
          regionKind: "expression",
          accepts: {}
        })
      },
      output: { kind: "expression" },
      source: `${"/** @TYPE expression id=source **/undefined/** @END **/"} + 1`
    });

    const result = compileGraph(
      {
        nodes: [
          {
            id: "source",
            templateId: "DefaultOutputKindSource",
            inputs: {
              value: { kind: "literal", value: 41 }
            }
          },
          {
            id: "consumer",
            templateId: "DefaultOutputKindConsumer",
            inputs: {
              source: { kind: "ref", nodeId: "source" }
            }
          }
        ],
        finalNodeId: "consumer"
      },
      createTemplateRegistry([source, consumer])
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.code).toBe("41 + 1");
  });

  it("normalizes ref shorthand and inline nodes before validation", () => {
    const graph: SynthesisGraph = {
      nodes: [
        {
          id: "mapped",
          templateId: "MapBooleanArray",
          inputs: {
            source: {
              kind: "inline",
              node: {
                id: "inlineSource",
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
    };

    expect(normalizeSynthesisGraph(graph).graph.nodes).toEqual([
      {
        id: "inlineSource",
        templateId: "BooleanArrayLiteral",
        inputs: {
          values: { kind: "literal", value: [true] }
        }
      },
      {
        id: "mapped",
        templateId: "MapBooleanArray",
        inputs: {
          source: { kind: "ref", nodeId: "inlineSource" }
        }
      },
      {
        id: "mappedAgain",
        templateId: "MapBooleanArray",
        inputs: {
          source: { kind: "ref", nodeId: "mapped" }
        }
      }
    ]);
  });

  it("compiles graphs that use inline nodes and ref shorthand", () => {
    const graph: SynthesisGraph = {
      nodes: [
        {
          id: "mapped",
          templateId: "MapBooleanArray",
          inputs: {
            source: {
              kind: "inline",
              node: {
                id: "inlineSource",
                templateId: "BooleanArrayLiteral",
                inputs: {
                  values: { kind: "literal", value: [true, false] }
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
    };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.code).toBe("[true, false].map(x => Boolean(x)).map(x => Boolean(x))");
    expect(result.artifacts.inlineSource?.code).toBe("[true, false]");
  });

  it("accepts raw code that satisfies the port policy", () => {
    const result = compileGraph(rawPolicyGraph("input.count + 1"), createRawPolicyRegistry());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.code).toBe("input.count + 1");
  });

  it("rejects raw code that violates max length policy", () => {
    const result = compileGraph(rawPolicyGraph("input.count + input.otherCount + 1"), createRawPolicyRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "RawCodeRejected",
      stage: "policy",
      inputName: "value"
    }));
  });

  it("rejects raw code that violates newline policy", () => {
    const result = compileGraph(rawPolicyGraph("input.count\n+ 1"), createRawPolicyRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "RawCodeRejected",
      stage: "policy",
      inputName: "value"
    }));
  });

  it("rejects raw code that violates substring policy", () => {
    const result = compileGraph(rawPolicyGraph("process.env.X"), createRawPolicyRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "RawCodeRejected",
      stage: "policy",
      inputName: "value"
    }));
  });

  it("rejects raw code that violates regex pattern policy", () => {
    const result = compileGraph(rawPolicyGraph("eval(\"1\")"), createRawPolicyRegistry());

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "RawCodeRejected",
      stage: "policy",
      inputName: "value"
    }));
  });

  it("reports invalid raw-code policy patterns during registry construction", () => {
    const template = defineTemplate({
      modelId: "InvalidPolicy",
      inputs: {
        value: rawCodePort({
          regionKind: "expression",
          policy: {
            forbiddenPatterns: ["["]
          }
        })
      },
      output: { kind: "expression" },
      source: "/** @TYPE expression id=value **/undefined/** @END **/"
    });

    let thrown: unknown;
    try {
      createTemplateRegistry([template]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TemplateCatalogValidationError);
    expect((thrown as TemplateCatalogValidationError).diagnostics).toContainEqual(expect.objectContaining({
      code: "InvalidRawCodePattern",
      stage: "template",
      inputName: "value"
    }));
  });

  it("converts array fragments into structured array ports", () => {
    const result = compileGraph(
      {
        nodes: [
          {
            id: "source",
            templateId: "ArrayLiteral",
            inputs: {
              value: { kind: "literal", value: [1, "two", true, null] }
            }
          },
          {
            id: "consumer",
            templateId: "ArrayConsumer",
            inputs: {
              source: { kind: "ref", nodeId: "source" }
            }
          }
        ],
        finalNodeId: "consumer"
      },
      createStructuredConversionRegistry()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.code).toBe("[1, \"two\", true, null].length");
  });

  it("converts object fragments into structured object ports", () => {
    const result = compileGraph(
      {
        nodes: [
          {
            id: "source",
            templateId: "ObjectLiteral",
            inputs: {
              value: { kind: "literal", value: { mode: "strict", count: 3 } }
            }
          },
          {
            id: "consumer",
            templateId: "ObjectConsumer",
            inputs: {
              source: { kind: "ref", nodeId: "source" }
            }
          }
        ],
        finalNodeId: "consumer"
      },
      createStructuredConversionRegistry()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.code).toBe("Object.keys({ mode: \"strict\", count: 3 })");
  });

  it("converts scalar fragments into matching structured scalar ports", () => {
    const result = compileGraph(
      {
        nodes: [
          {
            id: "label",
            templateId: "StringLiteral",
            inputs: {
              value: { kind: "literal", value: "ready" }
            }
          },
          {
            id: "count",
            templateId: "NumberLiteral",
            inputs: {
              value: { kind: "literal", value: -2 }
            }
          },
          {
            id: "enabled",
            templateId: "BooleanLiteral",
            inputs: {
              value: { kind: "literal", value: true }
            }
          },
          {
            id: "empty",
            templateId: "NullLiteral",
            inputs: {
              value: { kind: "literal", value: null }
            }
          },
          {
            id: "consumer",
            templateId: "ScalarConsumer",
            inputs: {
              label: { kind: "ref", nodeId: "label" },
              count: { kind: "ref", nodeId: "count" },
              enabled: { kind: "ref", nodeId: "enabled" },
              empty: { kind: "ref", nodeId: "empty" }
            }
          }
        ],
        finalNodeId: "consumer"
      },
      createStructuredConversionRegistry()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.code).toBe("({ label: \"ready\", count: -2, enabled: true, empty: null })");
  });

  it("converts object-property fragments into structured object-property ports", () => {
    const result = compileGraph(
      {
        nodes: [
          {
            id: "source",
            templateId: "ObjectPropertyLiteral",
            inputs: {
              prop: { kind: "literal", value: { name: "mode", value: "strict" } }
            }
          },
          {
            id: "consumer",
            templateId: "ObjectPropertyConsumer",
            inputs: {
              prop: { kind: "ref", nodeId: "source" }
            }
          }
        ],
        finalNodeId: "consumer"
      },
      createStructuredConversionRegistry()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.code).toBe("({ mode: \"strict\" })");
  });

  it("converts raw code into structured array and object-property ports", () => {
    const registry = createStructuredConversionRegistry();

    const arrayResult = compileGraph(
      {
        nodes: [
          {
            id: "rawArray",
            templateId: "RawArray",
            inputs: {
              value: { kind: "rawCode", code: "[id, 2, { ok: true }]" }
            }
          }
        ],
        finalNodeId: "rawArray"
      },
      registry
    );

    expect(arrayResult.ok).toBe(true);
    if (arrayResult.ok) {
      expect(arrayResult.finalArtifact.code).toBe("[id, 2, { ok: true }].length");
    }

    const propertyResult = compileGraph(
      {
        nodes: [
          {
            id: "rawProp",
            templateId: "RawObjectProperty",
            inputs: {
              prop: { kind: "rawCode", code: "\"with-dash\": -1" }
            }
          }
        ],
        finalNodeId: "rawProp"
      },
      registry
    );

    expect(propertyResult.ok).toBe(true);
    if (propertyResult.ok) {
      expect(propertyResult.finalArtifact.code).toBe("({ \"with-dash\": -1 })");
    }
  });

  it("rejects arbitrary raw expressions for structured array ports", () => {
    const result = compileGraph(
      {
        nodes: [
          {
            id: "rawArray",
            templateId: "RawArray",
            inputs: {
              value: { kind: "rawCode", code: "makeItems()" }
            }
          }
        ],
        finalNodeId: "rawArray"
      },
      createStructuredConversionRegistry()
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "GeneratedTypeScriptInvalid",
      stage: "ast",
      nodeId: "rawArray"
    }));
  });

  it("compiles union ports with literal and raw-code options sharing the same region kind", () => {
    const registry = createStructuredConversionRegistry();

    const literalResult = compileGraph(
      {
        nodes: [
          {
            id: "literal",
            templateId: "UnionExpression",
            inputs: {
              value: { kind: "literal", value: 2 }
            }
          }
        ],
        finalNodeId: "literal"
      },
      registry
    );

    expect(literalResult.ok).toBe(true);
    if (literalResult.ok) {
      expect(literalResult.finalArtifact.code).toBe("2 + 1");
    }

    const rawResult = compileGraph(
      {
        nodes: [
          {
            id: "raw",
            templateId: "UnionExpression",
            inputs: {
              value: { kind: "rawCode", code: "input.count" }
            }
          }
        ],
        finalNodeId: "raw"
      },
      registry
    );

    expect(rawResult.ok).toBe(true);
    if (rawResult.ok) {
      expect(rawResult.finalArtifact.code).toBe("input.count + 1");
    }
  });

  it("partial-compiles missing required inputs into fillable marker artifacts", () => {
    const manualExpression = defineTemplate({
      modelId: "ManualExpression",
      inputs: {},
      output: { kind: "expression" },
      source: "value"
    });
    const wrapper = defineTemplate({
      modelId: "PartialWrapper",
      inputs: {
        source: fragmentPort({ regionKind: "expression", accepts: {} })
      },
      output: { kind: "expression" },
      source: `wrap(${"/** @TYPE expression id=source **/fallback/** @END **/"})`
    });
    const registry = createTemplateRegistry([manualExpression, wrapper]);

    const result = compileGraph(
      {
        nodes: [
          {
            id: "wrap",
            templateId: "PartialWrapper",
            inputs: {}
          }
        ],
        finalNodeId: "wrap"
      },
      registry,
      { mode: "partial" }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.complete).toBe(false);
    if (result.finalArtifact.complete !== false) return;
    expect(result.finalArtifact.code).toContain("@TYPE expression id=");
    expect(result.finalArtifact.unresolvedInputs).toHaveLength(1);
    expect(result.finalArtifact.unresolvedInputs[0]).toMatchObject({
      inputName: "source",
      nodeId: "wrap",
      templateId: "PartialWrapper"
    });

    const manual = compileGraph({
      nodes: [{ id: "manual", templateId: manualExpression.modelId, inputs: {} }],
      finalNodeId: "manual"
    }, registry);
    expect(manual.ok).toBe(true);
    if (!manual.ok) return;

    const filled = fillTemplateArtifact(result.finalArtifact, {
      source: {
        kind: "fragment",
        fragment: manual.finalArtifact
      }
    });

    expect(filled.ok).toBe(true);
    if (!filled.ok) return;
    expect(filled.artifact.complete).toBe(true);
    expect(filled.artifact.code).toBe("wrap(value)");
  });

  it("applies partial suffix artifacts repeatedly while preserving shared unresolved IDs", () => {
    const source = defineTemplate({
      modelId: "PartialSource",
      inputs: {
        value: literalPort({ regionKind: "expression" })
      },
      output: { kind: "expression" },
      source: "/** @TYPE expression id=value **/undefined/** @END **/"
    });
    const suffix = defineTemplate({
      modelId: "PartialSuffix",
      inputs: {
        handler: fragmentPort({ regionKind: "expression", accepts: {} })
      },
      output: { kind: "expressionSuffix" },
      source: `.with(${"/** @TYPE expression id=handler **/x => x/** @END **/"})`
    });
    const applySuffix = defineTemplate({
      modelId: "PartialApplySuffix",
      inputs: {
        source: fragmentPort({ regionKind: "expression", accepts: {} }),
        suffix: fragmentPort({
          regionKind: "expressionSuffix",
          accepts: { outputKind: "expressionSuffix" }
        })
      },
      output: { kind: "expression" },
      source: `${"/** @TYPE expression id=source **/undefined/** @END **/"}${"/** @TYPE expressionSuffix id=suffix **/.value/** @END **/"}`
    });
    const handler = defineTemplate({
      modelId: "ManualHandler",
      inputs: {},
      output: { kind: "expression" },
      source: "x => x.ok"
    });
    const registry = createTemplateRegistry([source, suffix, applySuffix, handler]);

    const result = compileGraph(
      {
        nodes: [
          {
            id: "source",
            templateId: "PartialSource",
            inputs: { value: { kind: "literal", value: "items" } }
          },
          {
            id: "suffix",
            templateId: "PartialSuffix",
            inputs: {}
          },
          {
            id: "once",
            templateId: "PartialApplySuffix",
            inputs: {
              source: { "$ref": "source" },
              suffix: { "$ref": "suffix" }
            }
          },
          {
            id: "twice",
            templateId: "PartialApplySuffix",
            inputs: {
              source: { "$ref": "once" },
              suffix: { "$ref": "suffix" }
            }
          }
        ],
        finalNodeId: "twice"
      },
      registry,
      { mode: "partial" }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.complete).toBe(false);
    if (result.finalArtifact.complete !== false) return;
    expect(result.finalArtifact.unresolvedInputs).toHaveLength(1);

    const unresolvedId = result.finalArtifact.unresolvedInputs[0]!.id;
    const occurrences = result.finalArtifact.code.match(new RegExp(`id=${unresolvedId}`, "g")) ?? [];
    expect(occurrences).toHaveLength(2);
    const compiledHandler = compileGraph({
      nodes: [{ id: "handler", templateId: handler.modelId, inputs: {} }],
      finalNodeId: "handler"
    }, registry);
    expect(compiledHandler.ok).toBe(true);
    if (!compiledHandler.ok) return;

    const finalized = finalizeTemplateArtifact(result.finalArtifact, {
      [unresolvedId]: {
        kind: "fragment",
        fragment: compiledHandler.finalArtifact
      }
    });

    expect(finalized.ok).toBe(true);
    if (!finalized.ok) return;
    expect(finalized.artifact.complete).toBe(true);
    expect(finalized.artifact.code).toBe("items.with(x => x.ok).with(x => x.ok)");
  });

  it("gives repeated compilations reproducible IDs and supports explicit scopes", () => {
    const template = defineTemplate({
      modelId: "ScopedPartial",
      inputs: {
        value: fragmentPort({ regionKind: "expression", accepts: {} })
      },
      output: { kind: "expression" },
      source: "/** @TYPE expression id=value **/fallback/** @END **/"
    });
    const graph: SynthesisGraph = {
      nodes: [
        {
          id: "sameNode",
          templateId: "ScopedPartial",
          inputs: {}
        }
      ],
      finalNodeId: "sameNode"
    };
    const registry = createTemplateRegistry([template]);

    const first = compileGraph(graph, registry, { mode: "partial" });
    const second = compileGraph(graph, registry, { mode: "partial" });
    const independentlyScoped = compileGraph(graph, registry, {
      mode: "partial",
      compilationScope: "independent-job"
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(independentlyScoped.ok).toBe(true);
    if (!first.ok || !second.ok || !independentlyScoped.ok) return;
    expect(first.finalArtifact.complete).toBe(false);
    expect(second.finalArtifact.complete).toBe(false);
    expect(independentlyScoped.finalArtifact.complete).toBe(false);
    if (
      first.finalArtifact.complete !== false ||
      second.finalArtifact.complete !== false ||
      independentlyScoped.finalArtifact.complete !== false
    ) return;
    expect(first.finalArtifact.unresolvedInputs[0]!.id).toBe(second.finalArtifact.unresolvedInputs[0]!.id);
    expect(first.finalArtifact.unresolvedInputs[0]!.id)
      .not.toBe(independentlyScoped.finalArtifact.unresolvedInputs[0]!.id);
  });

  it("uses optional input fallback bodies without leaving partial holes", () => {
    const optional = defineTemplate({
      modelId: "OptionalFallback",
      inputs: {
        value: rawCodePort({
          regionKind: "expression",
          required: false
        })
      },
      output: { kind: "expression" },
      source: `maybe(${"/** @TYPE expression id=value **/fallback/** @END **/"})`
    });

    const result = compileGraph(
      {
        nodes: [
          {
            id: "optional",
            templateId: "OptionalFallback",
            inputs: {}
          }
        ],
        finalNodeId: "optional"
      },
      createTemplateRegistry([optional]),
      { mode: "partial" }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.complete).toBe(true);
    expect(result.finalArtifact.code).toBe("maybe(fallback)");
    expect(result.finalArtifact.code).not.toContain("@TYPE");
  });

  it("keeps provided invalid inputs as partial-mode diagnostics", () => {
    const result = compileGraph(rawPolicyGraph("process.env.X"), createRawPolicyRegistry(), { mode: "partial" });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "RawCodeRejected",
      stage: "policy",
      inputName: "value"
    }));
  });

  it("compiles a valid two-node graph", () => {
    const result = compileGraph(validGraph(), createGraphRegistry());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact).toMatchObject({
      id: "mapped",
      code: "[true, false, true].map(x => Boolean(x))",
      kind: "expression",
      source: { templateId: "MapBooleanArray" },
      type: { ts: "boolean[]" }
    });
    expect(result.artifacts.source?.code).toBe("[true, false, true]");
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

  it("validates goal descriptors and deprecated schema aliases before compilation", () => {
    const graph: SynthesisGraph = {
      ...validGraph(),
      goal: {
        type: { ts: "unknown", schema: { const: "nested" } },
        schema: { const: "alias" }
      }
    };

    const result = compileGraph(graph, createGraphRegistry());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.classification).toBe("graphRepairable");
    expect(result.diagnostics.map(diagnostic => diagnostic.code)).toContain("ConflictingSchemaMetadata");

    const invalid = compileGraph({
      ...validGraph(),
      goal: { type: { ts: "any" } }
    }, createGraphRegistry());
    expect(invalid.ok).toBe(false);
    expect(invalid.diagnostics.map(diagnostic => diagnostic.code)).toContain("ForbiddenAnyType");

    const malformed = compileGraph({
      ...validGraph(),
      goal: {
        type: { ts: 42 } as never,
        schema: { type: "array", items: { type: "boolean" } }
      }
    }, createGraphRegistry());
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.classification).toBe("graphRepairable");
    expect(malformed.diagnostics.map(diagnostic => diagnostic.code)).toContain("InvalidTypeScriptType");
  });

  it("rejects indeterminate fragment schema compatibility distinctly", () => {
    const producer = defineTemplate({
      modelId: "PatternProducer",
      inputs: {},
      output: {
        kind: "expression",
        type: { schema: { type: "string", pattern: "^producer" } }
      },
      source: '"producer"'
    });
    const consumer = defineTemplate({
      modelId: "PatternConsumer",
      inputs: {
        value: fragmentPort({
          regionKind: "expression",
          accepts: { type: { schema: { type: "string", pattern: "^consumer" } } }
        })
      },
      output: { kind: "expression" },
      source: `consume(${"/** @TYPE expression id=value **/undefined/** @END **/"})`
    });

    const result = compileGraph({
      nodes: [
        { id: "producer", templateId: producer.modelId, inputs: {} },
        { id: "consumer", templateId: consumer.modelId, inputs: { value: { $ref: "producer" } } }
      ],
      finalNodeId: "consumer"
    }, [producer, consumer]);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map(diagnostic => diagnostic.code)).toContain("SchemaCompatibilityIndeterminate");
  });

  it("rejects the removed executable legacy template shape", () => {
    expect(() => defineTemplate({
      modelId: "LegacyAddOne",
      outputKind: "expression",
      pattern: { value: { output: "number" } },
      source: `${"/** @TYPE expression id=value **/oldValue/** @END **/"} + 1`
    } as never)).toThrow(/unknown property outputKind/u);
  });

  it("compiles ordered variadic fragment collections", () => {
    const first = defineTemplate({
      modelId: "FirstStatement", inputs: {}, output: { kind: "statement" },
      source: "const first = 1;"
    });
    const second = defineTemplate({
      modelId: "SecondStatement", inputs: {}, output: { kind: "statement" },
      source: "const second = 2;"
    });
    const statementList = defineTemplate({
      modelId: "StatementList",
      inputs: {
        statements: fragmentCollectionPort({
          regionKind: "statement",
          accepts: { outputKind: "statement" },
          minItems: 1
        })
      },
      output: { kind: "statement" },
      source: "/** @TYPE statement id=statements **/throw new Error(\"placeholder\");/** @END **/"
    });

    const result = compileGraph({
      nodes: [
        { id: "first", templateId: "FirstStatement", inputs: {} },
        { id: "second", templateId: "SecondStatement", inputs: {} },
        {
          id: "list", templateId: "StatementList", inputs: {
            statements: { kind: "fragmentCollection", items: [{ $ref: "first" }, { $ref: "second" }] }
          }
        }
      ],
      finalNodeId: "list"
    }, [first, second, statementList]);

    expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true);
    if (result.ok) expect(result.finalArtifact.code).toBe("const first = 1;\nconst second = 2;");
  });

  it("validates variadic fragment collection bounds", () => {
    const statementList = defineTemplate({
      modelId: "NonEmptyStatementList",
      inputs: {
        statements: fragmentCollectionPort({
          regionKind: "statement", accepts: { outputKind: "statement" }, minItems: 1
        })
      },
      output: { kind: "statement" },
      source: "/** @TYPE statement id=statements **/throw new Error(\"placeholder\");/** @END **/"
    });
    const result = compileGraph({
      nodes: [{
        id: "list", templateId: "NonEmptyStatementList", inputs: {
          statements: { kind: "fragmentCollection", items: [] }
        }
      }],
      finalNodeId: "list"
    }, [statementList]);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.some(diagnostic => diagnostic.code === "IncompatibleCollectionSize")).toBe(true);
  });

  it("accepts empty typed fragment collections when their port permits zero items", () => {
    const optionalMembers = defineTemplate({
      modelId: "OptionalClassMembers",
      inputs: {
        members: fragmentCollectionPort({
          regionKind: "classMember",
          accepts: { outputKind: "classMember" },
          minItems: 0
        })
      },
      output: { kind: "declaration" },
      source: "class Empty {\n/** @TYPE classMember id=members **/placeholder(): void {}/** @END **/\n}"
    });
    const result = compileGraph({
      nodes: [{
        id: "empty", templateId: "OptionalClassMembers", inputs: {
          members: { kind: "fragmentCollection", items: [] }
        }
      }],
      finalNodeId: "empty"
    }, [optionalMembers]);

    expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true);
    if (result.ok) {
      expect(result.finalArtifact.code).toContain("class Empty");
      expect(result.finalArtifact.code).not.toContain("placeholder");
    }
  });

  it("optionally reports structured TypeScript semantic diagnostics for a complete graph", () => {
    const invalid = defineTemplate({
      modelId: "SemanticMismatch",
      inputs: {},
      output: { kind: "statement" },
      source: 'const value: number = "wrong";'
    });
    const graph: SynthesisGraph = {
      nodes: [{ id: "invalid", templateId: "SemanticMismatch", inputs: {} }],
      finalNodeId: "invalid"
    };

    expect(compileGraph(graph, [invalid]).ok).toBe(true);
    const checked = compileGraph(graph, [invalid], {
      checkSemanticDiagnostics: true,
      filePath: "generated/semantic.ts"
    });

    expect(checked.ok).toBe(false);
    if (!checked.ok) expect(checked.classification).toBe("graphRepairable");
    const diagnostic = checked.diagnostics.find(item => item.code === "TypeScriptSemanticError");
    expect(diagnostic).toMatchObject({
      stage: "type",
      severity: "error",
      nodeId: "invalid",
      templateId: "SemanticMismatch",
      path: "generated/semantic.ts",
      compilerCode: 2322,
      compilerCategory: "error",
      line: 1
    });
    expect(diagnostic?.column).toBeGreaterThan(0);
  });

  it("semantically enforces an expression artifact's advertised TypeScript type", () => {
    const incorrectlyAdvertised = defineTemplate({
      modelId: "IncorrectlyAdvertisedExpression",
      inputs: {},
      output: { kind: "expression", type: { ts: "number" } },
      source: '"not a number"'
    });

    expect(compileGraph({
      nodes: [{ id: "value", templateId: incorrectlyAdvertised.modelId, inputs: {} }],
      finalNodeId: "value"
    }, [incorrectlyAdvertised]).ok).toBe(true);

    const checked = compileGraph({
      nodes: [{ id: "value", templateId: incorrectlyAdvertised.modelId, inputs: {} }],
      finalNodeId: "value"
    }, [incorrectlyAdvertised], { checkSemanticDiagnostics: true });

    expect(checked.ok).toBe(false);
    expect(checked.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "TypeScriptSemanticError",
        compilerCode: 2322,
        nodeId: "value",
        templateId: incorrectlyAdvertised.modelId
      })
    ]));
    expect(checked.diagnostics.some(diagnostic => diagnostic.compilerCode === 2451)).toBe(false);
  });

  it("semantically enforces an expression-suffix artifact's advertised TypeScript type", () => {
    const incorrectlyAdvertised = defineTemplate({
      modelId: "IncorrectlyAdvertisedSuffix",
      inputs: {},
      output: { kind: "expressionSuffix", type: { ts: "boolean" } },
      source: ".length"
    });

    const graph: SynthesisGraph = {
      nodes: [{ id: "suffix", templateId: incorrectlyAdvertised.modelId, inputs: {} }],
      finalNodeId: "suffix"
    };
    expect(compileGraph(graph, [incorrectlyAdvertised]).ok).toBe(true);

    const checked = compileGraph(graph, [incorrectlyAdvertised], { checkSemanticDiagnostics: true });
    expect(checked.ok).toBe(false);
    expect(checked.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "TypeScriptSemanticError",
        compilerCode: 2322,
        nodeId: "suffix",
        templateId: incorrectlyAdvertised.modelId
      })
    ]));
    expect(checked.diagnostics.some(diagnostic => diagnostic.compilerCode === 2451)).toBe(false);

    const explicitlyNarrowed = defineTemplate({
      modelId: "AdvertisedConcreteSuffix",
      inputs: {},
      output: { kind: "expressionSuffix", type: { ts: "boolean" } },
      source: " as boolean"
    });
    const narrowed = compileGraph({
      nodes: [{ id: "suffix", templateId: explicitlyNarrowed.modelId, inputs: {} }],
      finalNodeId: "suffix"
    }, [explicitlyNarrowed], { checkSemanticDiagnostics: true });
    expect(narrowed.ok, JSON.stringify(narrowed.diagnostics, null, 2)).toBe(true);
    expect(narrowed.diagnostics.some(diagnostic => diagnostic.compilerCode === 2451)).toBe(false);
  });

  it("uses a semantic prelude to provide insertion-site bindings", () => {
    const external = defineTemplate({
      modelId: "ExternalExpression",
      inputs: {},
      output: { kind: "expression" },
      source: "externalValue + 1"
    });
    const graph: SynthesisGraph = {
      nodes: [{ id: "external", templateId: "ExternalExpression", inputs: {} }],
      finalNodeId: "external"
    };

    const missing = compileGraph(graph, [external], { checkSemanticDiagnostics: true });
    expect(missing.ok).toBe(false);
    expect(missing.diagnostics.some(diagnostic => diagnostic.compilerCode === 2304)).toBe(true);
    expect(missing.diagnostics.some(diagnostic => diagnostic.compilerCode === 2451)).toBe(false);

    const supplied = compileGraph(graph, [external], {
      checkSemanticDiagnostics: true,
      semanticContext: { prelude: "declare const externalValue: number;" }
    });
    expect(supplied.ok, JSON.stringify(supplied.diagnostics, null, 2)).toBe(true);
    expect(supplied.diagnostics.some(diagnostic => diagnostic.compilerCode === 2451)).toBe(false);
  });

  it("isolates a valid semantic compilation from a preceding failure", () => {
    const invalid = defineTemplate({
      modelId: "IsolatedInvalidExpression",
      inputs: {},
      output: { kind: "expression" },
      source: "missingValue"
    });
    const invalidResult = compileGraph({
      nodes: [{ id: "invalid", templateId: invalid.modelId, inputs: {} }],
      finalNodeId: "invalid"
    }, [invalid], { checkSemanticDiagnostics: true });
    expect(invalidResult.ok).toBe(false);
    expect(invalidResult.diagnostics.some(diagnostic => diagnostic.compilerCode === 2304)).toBe(true);
    expect(invalidResult.diagnostics.some(diagnostic => diagnostic.compilerCode === 2451)).toBe(false);

    const valid = defineTemplate({
      modelId: "IsolatedValidExpression",
      inputs: {},
      output: { kind: "expression" },
      source: "1 + 1"
    });
    const validResult = compileGraph({
      nodes: [{ id: "valid", templateId: valid.modelId, inputs: {} }],
      finalNodeId: "valid"
    }, [valid], { checkSemanticDiagnostics: true });
    expect(validResult.ok, JSON.stringify(validResult.diagnostics, null, 2)).toBe(true);
    expect(validResult.diagnostics.some(diagnostic => diagnostic.compilerCode === 2451)).toBe(false);
  });

  it("defers semantic checks until a partial artifact is filled", () => {
    const partial = defineTemplate({
      modelId: "PartialSemanticMismatch",
      inputs: {
        value: rawCodePort({ regionKind: "expression" })
      },
      output: { kind: "statement" },
      source: `const value: number = ${"/** @TYPE expression id=value **/undefined/** @END **/"};`
    });
    const graph: SynthesisGraph = {
      nodes: [{ id: "partial", templateId: "PartialSemanticMismatch", inputs: {} }],
      finalNodeId: "partial"
    };

    const compiled = compileGraph(graph, [partial], {
      mode: "partial",
      checkSemanticDiagnostics: true
    });
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.finalArtifact.complete).toBe(false);
    if (compiled.finalArtifact.complete !== false) return;

    const filled = fillTemplateArtifact(compiled.finalArtifact, {
      value: { kind: "rawCode", code: '"wrong"' }
    }, { checkSemanticDiagnostics: true });
    expect(filled.ok).toBe(false);
    expect(filled.diagnostics.some(diagnostic => diagnostic.compilerCode === 2322)).toBe(true);
  });

  it("reports artifact-relative semantic locations for supported wrappers", () => {
    const cases = [
      { modelId: "BadExpression", kind: "expression" as const, code: "missingExpression", column: 1 },
      { modelId: "BadStatement", kind: "statement" as const, code: "missingStatement();", column: 1 },
      { modelId: "BadProperty", kind: "objectProperty" as const, code: "value: missingProperty", column: 8 }
    ];

    for (const item of cases) {
      const template = defineTemplate({
        modelId: item.modelId,
        inputs: {},
        output: { kind: item.kind },
        source: item.code
      });
      const result = compileGraph({
        nodes: [{ id: "bad", templateId: item.modelId, inputs: {} }],
        finalNodeId: "bad"
      }, [template], { checkSemanticDiagnostics: true });
      const diagnostic = result.diagnostics.find(entry =>
        entry.code === "TypeScriptSemanticError" && entry.compilerCode === 2304
      );
      expect(result.ok).toBe(false);
      expect(result.diagnostics.some(entry => entry.compilerCode === 2451)).toBe(false);
      expect(diagnostic?.line).toBe(1);
      expect(diagnostic?.column).toBe(item.column);
    }
  });
});
