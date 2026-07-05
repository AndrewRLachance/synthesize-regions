import {
  buildGraphCompiler,
  compileGraph,
  createTemplateRegistry,
  defineGraph,
  defineTemplateCatalog,
  defineTemplate,
  fragmentPort,
  literalPort,
  rawCodePort,
  type SynthesisGraph,
  unionPort
} from "../src/index.js";

defineTemplate({
  modelId: "HelperCreatedPorts",
  inputs: {
    value: literalPort({
      regionKind: "expression",
      schema: { type: "number" }
    }),
    suffix: fragmentPort({
      regionKind: "expressionSuffix",
      accepts: {}
    })
  },
  output: { kind: "expression" },
  template: r => `${r("value")}${r("suffix", ".value")}`
});

defineTemplate({
  modelId: "InlineStrictPorts",
  inputs: {
    source: {
      kind: "fragment",
      regionKind: "expression",
      accepts: {
        type: { ts: "number" },
        sourceModelIds: ["NumberLiteral"]
      }
    },
    fallback: {
      kind: "union",
      options: [
        {
          kind: "literal",
          regionKind: "expression",
          schema: { type: "number" }
        },
        {
          kind: "rawCode",
          regionKind: "expression",
          policy: { allowNewlines: false }
        }
      ]
    }
  },
  output: {
    kind: "expression",
    type: { ts: "number" }
  },
  template: r => `${r("source")} ?? ${r("fallback")}`
});

// @ts-expect-error regionKind must be a supported RegionKind.
defineTemplate({
  modelId: "BadRegionKind",
  inputs: {
    value: {
      kind: "literal",
      regionKind: "notARegion"
    }
  },
  output: { kind: "expression" },
  template: r => r("value")
});

// @ts-expect-error literal ports cannot declare fragment accepts.
defineTemplate({
  modelId: "LiteralWithFragmentFields",
  inputs: {
    value: {
      kind: "literal",
      regionKind: "expression",
      accepts: {}
    }
  },
  output: { kind: "expression" },
  template: r => r("value")
});

// @ts-expect-error sourceModelIds must contain strings.
defineTemplate({
  modelId: "MalformedSourceModelIds",
  inputs: {
    source: {
      kind: "fragment",
      regionKind: "expression",
      accepts: {
        sourceModelIds: [1]
      }
    }
  },
  output: { kind: "expression" },
  template: r => r("source")
});

// @ts-expect-error raw-code ports reject unknown top-level fields.
defineTemplate({
  modelId: "RawCodeWithUnknownField",
  inputs: {
    value: {
      kind: "rawCode",
      regionKind: "expression",
      extra: true
    }
  },
  output: { kind: "expression" },
  template: r => r("value")
});

// @ts-expect-error union options are exact InputPort shapes too.
defineTemplate({
  modelId: "UnionWithInvalidNestedOption",
  inputs: {
    value: {
      kind: "union",
      options: [
        {
          kind: "literal",
          regionKind: "expression",
          extra: true
        }
      ]
    }
  },
  output: { kind: "expression" },
  template: r => r("value")
});

// @ts-expect-error output.kind must be a supported RegionKind.
defineTemplate({
  modelId: "BadOutputKind",
  inputs: {},
  output: {
    kind: "notARegion"
  },
  template: () => "undefined"
});

// @ts-expect-error helper-created literal ports reject fragment-only fields.
literalPort({ regionKind: "expression", accepts: {} });

// @ts-expect-error helper-created union ports reject invalid nested options.
unionPort({ options: [{ kind: "literal", regionKind: "expression", extra: true }] });

rawCodePort({ regionKind: "expression", policy: { allowNewlines: false } });

const NumberLiteral = defineTemplate({
  modelId: "NumberLiteral",
  inputs: {
    value: literalPort({ regionKind: "expression" })
  },
  output: { kind: "expression" },
  template: r => r("value")
});

const OptionalRawExpression = defineTemplate({
  modelId: "OptionalRawExpression",
  inputs: {
    value: rawCodePort({
      regionKind: "expression",
      required: false
    })
  },
  output: { kind: "expression" },
  template: r => r("value", "undefined")
});

const InlineRawExpression = defineTemplate({
  modelId: "InlineRawExpression",
  inputs: {
    value: {
      kind: "rawCode",
      regionKind: "expression"
    }
  },
  output: { kind: "expression" },
  template: r => r("value")
});

const ExpressionConsumer = defineTemplate({
  modelId: "ExpressionConsumer",
  inputs: {
    source: fragmentPort({
      regionKind: "expression",
      accepts: {}
    })
  },
  output: { kind: "expression" },
  template: r => `consume(${r("source")})`
});

const UnionConsumer = defineTemplate({
  modelId: "UnionConsumer",
  inputs: {
    value: unionPort({
      options: [
        literalPort({ regionKind: "expression" }),
        rawCodePort({ regionKind: "expression" }),
        fragmentPort({ regionKind: "expression", accepts: {} })
      ]
    })
  },
  output: { kind: "expression" },
  template: r => r("value")
});

const StatementTemplate = defineTemplate({
  modelId: "StatementTemplate",
  inputs: {
    body: rawCodePort({ regionKind: "statement" })
  },
  output: { kind: "statement" },
  template: r => r("body")
});

const AllowNumberLiteralOnly = defineTemplate({
  modelId: "AllowNumberLiteralOnly",
  inputs: {
    source: fragmentPort({
      regionKind: "expression",
      accepts: {
        sourceModelIds: ["NumberLiteral"]
      }
    })
  },
  output: { kind: "expression" },
  template: r => r("source")
});

const graphTemplates = defineTemplateCatalog([
  NumberLiteral,
  OptionalRawExpression,
  InlineRawExpression,
  ExpressionConsumer,
  UnionConsumer,
  StatementTemplate,
  AllowNumberLiteralOnly
]);

defineGraph(graphTemplates, {
  nodes: [
    {
      id: "source",
      templateId: "NumberLiteral",
      inputs: {
        value: { kind: "literal", value: 1 }
      }
    },
    {
      id: "optional",
      templateId: "OptionalRawExpression",
      inputs: {}
    },
    {
      id: "inlineRaw",
      templateId: "InlineRawExpression",
      inputs: {
        value: { kind: "rawCode", code: "input.value" }
      }
    },
    {
      id: "shorthand",
      templateId: "ExpressionConsumer",
      inputs: {
        source: { "$ref": "source" }
      }
    },
    {
      id: "explicit",
      templateId: "ExpressionConsumer",
      inputs: {
        source: { kind: "ref", nodeId: "shorthand" }
      }
    },
    {
      id: "unionRaw",
      templateId: "UnionConsumer",
      inputs: {
        value: { kind: "rawCode", code: "input.other" }
      }
    },
    {
      id: "unionRef",
      templateId: "UnionConsumer",
      inputs: {
        value: { "$ref": "explicit" }
      }
    }
  ],
  finalNodeId: "unionRef",
  goal: {
    outputKind: "expression"
  }
});

const checkedGraph = defineGraph(graphTemplates, {
  nodes: [
    {
      id: "source",
      templateId: "NumberLiteral",
      inputs: {
        value: { kind: "literal", value: 1 }
      }
    },
    {
      id: "consumer",
      templateId: "ExpressionConsumer",
      inputs: {
        source: { "$ref": "source" }
      }
    }
  ],
  finalNodeId: "consumer"
});

compileGraph(checkedGraph, graphTemplates);
const checkedGraphForRegistry: SynthesisGraph = checkedGraph;
compileGraph(checkedGraphForRegistry, createTemplateRegistry([NumberLiteral, ExpressionConsumer]));

const graphCompiler = buildGraphCompiler(graphTemplates);

const compilerDefinedGraph = graphCompiler.defineGraph({
  nodes: [
    {
      id: "source",
      templateId: "NumberLiteral",
      inputs: {
        value: { kind: "literal", value: 1 }
      }
    },
    {
      id: "consumer",
      templateId: "ExpressionConsumer",
      inputs: {
        source: { "$ref": "source" }
      }
    }
  ],
  finalNodeId: "consumer"
});
graphCompiler(compilerDefinedGraph);

graphCompiler({
  nodes: [
    {
      id: "source",
      templateId: "NumberLiteral",
      inputs: {
        value: { kind: "literal", value: 1 }
      }
    },
    {
      id: "consumer",
      templateId: "ExpressionConsumer",
      inputs: {
        source: { "$ref": "source" }
      }
    }
  ],
  finalNodeId: "consumer"
});

compileGraph({
  nodes: [
    {
      id: "source",
      templateId: "NumberLiteral",
      inputs: {
        value: { kind: "literal", value: 1 }
      }
    },
    {
      id: "consumer",
      templateId: "ExpressionConsumer",
      inputs: {
        source: { "$ref": "source" }
      }
    }
  ],
  finalNodeId: "consumer"
}, graphTemplates);

const inlineUnknownTemplateGraph = {
  nodes: [
    {
      id: "bad",
      templateId: "MissingTemplate",
      inputs: {}
    }
  ],
  finalNodeId: "bad"
} as const;
// @ts-expect-error unknown template ids are rejected in typed compileGraph.
compileGraph(inlineUnknownTemplateGraph, graphTemplates);

const inlineMissingInputGraph = {
  nodes: [
    {
      id: "missingInput",
      templateId: "NumberLiteral",
      inputs: {}
    }
  ],
  finalNodeId: "missingInput"
} as const;
// @ts-expect-error required inputs are checked in typed compileGraph.
compileGraph(inlineMissingInputGraph, graphTemplates);

const inlineUnknownInputGraph = {
  nodes: [
    {
      id: "unknownInput",
      templateId: "NumberLiteral",
      inputs: {
        value: { kind: "literal", value: 1 },
        extra: { kind: "literal", value: 2 }
      }
    }
  ],
  finalNodeId: "unknownInput"
} as const;
// @ts-expect-error unknown inputs are checked in typed compileGraph.
compileGraph(inlineUnknownInputGraph, graphTemplates);

const inlineBadRefGraph = {
  nodes: [
    {
      id: "badRef",
      templateId: "ExpressionConsumer",
      inputs: {
        source: { "$ref": "missingNode" }
      }
    }
  ],
  finalNodeId: "badRef"
} as const;
// @ts-expect-error refs must target authored node ids in typed compileGraph.
compileGraph(inlineBadRefGraph, graphTemplates);

const inlineBadOutputKindGraph = {
  nodes: [
    {
      id: "statement",
      templateId: "StatementTemplate",
      inputs: {
        body: { kind: "rawCode", code: "return;" }
      }
    },
    {
      id: "badKindRef",
      templateId: "ExpressionConsumer",
      inputs: {
        source: { "$ref": "statement" }
      }
    }
  ],
  finalNodeId: "badKindRef"
} as const;
// @ts-expect-error fragment refs must satisfy output kind in typed compileGraph.
compileGraph(inlineBadOutputKindGraph, graphTemplates);

const inlineBadSourceModelGraph = {
  nodes: [
    {
      id: "rawExpression",
      templateId: "InlineRawExpression",
      inputs: {
        value: { kind: "rawCode", code: "1" }
      }
    },
    {
      id: "badSourceModel",
      templateId: "AllowNumberLiteralOnly",
      inputs: {
        source: { kind: "ref", nodeId: "rawExpression" }
      }
    }
  ],
  finalNodeId: "badSourceModel"
} as const;
// @ts-expect-error fragment refs must satisfy sourceModelIds in typed compileGraph.
compileGraph(inlineBadSourceModelGraph, graphTemplates);

const compilerMissingInputGraph = {
  nodes: [
    {
      id: "missingInput",
      templateId: "NumberLiteral",
      inputs: {}
    }
  ],
  finalNodeId: "missingInput"
} as const;
// @ts-expect-error buildGraphCompiler checks required inputs on the returned function.
graphCompiler(compilerMissingInputGraph);

graphCompiler.defineGraph({
  nodes: [
    {
      id: "missingInput",
      templateId: "NumberLiteral",
      // @ts-expect-error buildGraphCompiler.defineGraph checks required inputs at declaration time.
      inputs: {}
    }
  ],
  finalNodeId: "missingInput"
});

const compilerBadRefGraph = {
  nodes: [
    {
      id: "badRef",
      templateId: "ExpressionConsumer",
      inputs: {
        source: { "$ref": "missingNode" }
      }
    }
  ],
  finalNodeId: "badRef"
} as const;
// @ts-expect-error buildGraphCompiler checks refs on the returned function.
graphCompiler(compilerBadRefGraph);

const compilerBadOutputKindGraph = {
  nodes: [
    {
      id: "statement",
      templateId: "StatementTemplate",
      inputs: {
        body: { kind: "rawCode", code: "return;" }
      }
    },
    {
      id: "badKindRef",
      templateId: "ExpressionConsumer",
      inputs: {
        source: { "$ref": "statement" }
      }
    }
  ],
  finalNodeId: "badKindRef"
} as const;
// @ts-expect-error buildGraphCompiler checks producer output kind on the returned function.
graphCompiler(compilerBadOutputKindGraph);

defineGraph(graphTemplates, {
  nodes: [
    {
      // @ts-expect-error unknown template ids collapse the typed node shape.
      id: "bad",
      // @ts-expect-error graph nodes must use a template from the supplied template tuple.
      templateId: "MissingTemplate",
      // @ts-expect-error inputs cannot be typed for an unknown template.
      inputs: {}
    }
  ],
  finalNodeId: "bad"
});

defineGraph(graphTemplates, {
  nodes: [
    {
      id: "missingInput",
      templateId: "NumberLiteral",
      // @ts-expect-error required template inputs must be present.
      inputs: {}
    }
  ],
  finalNodeId: "missingInput"
});

defineGraph(graphTemplates, {
  nodes: [
    {
      id: "unknownInput",
      templateId: "NumberLiteral",
      inputs: {
        value: { kind: "literal", value: 1 },
        // @ts-expect-error node inputs must be declared by the selected template.
        extra: { kind: "literal", value: 2 }
      }
    }
  ],
  finalNodeId: "unknownInput"
});

defineGraph(graphTemplates, {
  nodes: [
    {
      id: "literalToRaw",
      templateId: "InlineRawExpression",
      inputs: {
        // @ts-expect-error raw-code ports do not accept literal inputs.
        value: { kind: "literal", value: 1 }
      }
    }
  ],
  finalNodeId: "literalToRaw"
});

defineGraph(graphTemplates, {
  nodes: [
    {
      id: "rawToLiteral",
      templateId: "NumberLiteral",
      inputs: {
        // @ts-expect-error literal ports do not accept raw-code inputs.
        value: { kind: "rawCode", code: "1" }
      }
    }
  ],
  finalNodeId: "rawToLiteral"
});

defineGraph(graphTemplates, {
  nodes: [
    {
      id: "statement",
      templateId: "StatementTemplate",
      inputs: {
        body: { kind: "rawCode", code: "return;" }
      }
    },
    {
      id: "badKindRef",
      templateId: "ExpressionConsumer",
      inputs: {
        // @ts-expect-error fragment refs must satisfy the consumer output kind.
        source: { "$ref": "statement" }
      }
    }
  ],
  finalNodeId: "badKindRef"
});

defineGraph(graphTemplates, {
  nodes: [
    {
      id: "rawExpression",
      templateId: "InlineRawExpression",
      inputs: {
        value: { kind: "rawCode", code: "1" }
      }
    },
    {
      id: "badSourceModel",
      templateId: "AllowNumberLiteralOnly",
      inputs: {
        // @ts-expect-error fragment refs must satisfy sourceModelIds allowlists.
        source: { kind: "ref", nodeId: "rawExpression" }
      }
    }
  ],
  finalNodeId: "badSourceModel"
});

defineGraph(graphTemplates, {
  nodes: [
    {
      id: "badRef",
      templateId: "ExpressionConsumer",
      inputs: {
        // @ts-expect-error fragment ports require refs to authored node ids.
        source: { "$ref": "missingNode" }
      }
    }
  ],
  finalNodeId: "badRef"
});

defineGraph(graphTemplates, {
  nodes: [
    {
      id: "badExplicitRef",
      templateId: "ExpressionConsumer",
      inputs: {
        // @ts-expect-error explicit refs must target authored node ids too.
        source: { kind: "ref", nodeId: "missingNode" }
      }
    }
  ],
  finalNodeId: "badExplicitRef"
});

defineGraph(graphTemplates, {
  // @ts-expect-error invalid finalNodeId collapses the graph shape.
  nodes: [
    {
      id: "source",
      templateId: "NumberLiteral",
      inputs: {
        value: { kind: "literal", value: 1 }
      }
    }
  ],
  // @ts-expect-error finalNodeId must target an authored node id.
  finalNodeId: "missingNode"
});
