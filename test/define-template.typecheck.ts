import {
  buildGraphCompiler,
  compileGraph,
  createTemplateRegistry,
  defineGraph,
  definePartialGraph,
  defineTemplateCatalog,
  defineTemplate,
  fragmentCollectionPort,
  fragmentPort,
  literalPort,
  rawCodePort,
  type GraphTemplateDefinition,
  type InputPort,
  type StrictTemplateCatalog,
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

// @ts-expect-error directly authored finite unions must contain an option.
defineTemplate({
  modelId: "EmptyDirectUnion",
  inputs: {
    value: {
      kind: "union",
      options: []
    }
  },
  output: { kind: "expression" },
  template: r => r("value")
});

// @ts-expect-error empty nested unions are rejected recursively.
defineTemplate({
  modelId: "NestedEmptyDirectUnion",
  inputs: {
    value: {
      kind: "union",
      options: [{ kind: "union", options: [] }]
    }
  },
  output: { kind: "expression" },
  template: r => r("value")
});

// @ts-expect-error directly authored finite unions cannot mix effective marker regions.
defineTemplate({
  modelId: "MixedDirectUnion",
  inputs: {
    value: {
      kind: "union",
      options: [
        { kind: "literal", regionKind: "expression" },
        {
          kind: "union",
          options: [{ kind: "rawCode", regionKind: "statement" }]
        }
      ]
    }
  },
  output: { kind: "expression" },
  template: r => r("value")
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

// @ts-expect-error finite union tuples must contain at least one option.
unionPort({ options: [] });

// @ts-expect-error every concrete option in a finite union must use the same marker region.
unionPort({
  options: [
    literalPort({ regionKind: "expression" }),
    rawCodePort({ regionKind: "statement" })
  ]
});

// @ts-expect-error nested union options participate in effective-region validation.
unionPort({
  options: [
    literalPort({ regionKind: "expression" }),
    unionPort({
      options: [
        rawCodePort({ regionKind: "statement" })
      ]
    })
  ]
});

unionPort({
  options: [
    literalPort({ regionKind: "expression" }),
    unionPort({
      options: [
        rawCodePort({ regionKind: "expression" }),
        fragmentPort({ regionKind: "expression", accepts: {} })
      ]
    })
  ]
});

const widenedUnionOptions: InputPort[] = [];
unionPort({ options: widenedUnionOptions });
unionPort({
  options: [
    literalPort({ regionKind: "expression" }),
    { kind: "union", options: widenedUnionOptions }
  ]
});
defineTemplate({
  modelId: "WidenedUnionOptions",
  inputs: {
    value: { kind: "union", options: widenedUnionOptions }
  },
  output: { kind: "expression" },
  template: r => r("value")
});

rawCodePort({ regionKind: "expression", policy: { allowNewlines: false } });

const NumberLiteral = defineTemplate({
  modelId: "NumberLiteral",
  inputs: {
    value: literalPort({ regionKind: "expression" })
  },
  output: { kind: "expression" },
  template: r => r("value")
});

const DuplicateNumberLiteral = defineTemplate({
  modelId: "NumberLiteral",
  inputs: {
    value: literalPort({ regionKind: "expression" })
  },
  output: { kind: "expression" },
  template: r => r("value")
});

const duplicateLiteralCatalog = [NumberLiteral, DuplicateNumberLiteral] as const;
// @ts-expect-error finite template tuples reject duplicate literal model IDs.
const rejectedDuplicateCatalog: StrictTemplateCatalog<typeof duplicateLiteralCatalog> = duplicateLiteralCatalog;
void rejectedDuplicateCatalog;

// @ts-expect-error defineTemplateCatalog rejects duplicate literal model IDs.
defineTemplateCatalog(duplicateLiteralCatalog);
// @ts-expect-error initial registry catalogs reject duplicate literal model IDs.
createTemplateRegistry(duplicateLiteralCatalog);

const widenedTemplateCatalog: readonly GraphTemplateDefinition<any, string, any>[] = [
  NumberLiteral,
  DuplicateNumberLiteral
];
const acceptedWidenedCatalog: StrictTemplateCatalog<typeof widenedTemplateCatalog> = widenedTemplateCatalog;
defineTemplateCatalog(acceptedWidenedCatalog);

const duplicateCatalogGraph = {
  nodes: [{
    id: "duplicateSource",
    templateId: "NumberLiteral",
    inputs: { value: { kind: "literal", value: 1 } }
  }],
  finalNodeId: "duplicateSource"
} as const;

// @ts-expect-error defineGraph rejects duplicate finite authored catalogs.
defineGraph(duplicateLiteralCatalog, duplicateCatalogGraph);
// @ts-expect-error buildGraphCompiler rejects duplicate finite authored catalogs.
buildGraphCompiler(duplicateLiteralCatalog);
// @ts-expect-error compileGraph rejects duplicate finite authored catalogs.
compileGraph(duplicateCatalogGraph, duplicateLiteralCatalog);

defineGraph(widenedTemplateCatalog, duplicateCatalogGraph);
buildGraphCompiler(widenedTemplateCatalog);
compileGraph(duplicateCatalogGraph, widenedTemplateCatalog);

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

const StatementCollection = defineTemplate({
  modelId: "StatementCollection",
  inputs: {
    statements: fragmentCollectionPort({
      regionKind: "statement",
      accepts: { outputKind: "statement", sourceModelIds: ["StatementTemplate"] }
    })
  },
  output: { kind: "statement" },
  template: r => r("statements")
});

const recursiveGraphTemplates = defineTemplateCatalog([...graphTemplates, StatementCollection]);
const recursiveCompiler = buildGraphCompiler(recursiveGraphTemplates);

recursiveCompiler.defineGraph({
  nodes: [{
    id: "outer",
    templateId: "ExpressionConsumer",
    inputs: {
      source: {
        kind: "inline",
        node: {
          id: "middle",
          templateId: "ExpressionConsumer",
          inputs: {
            source: {
              kind: "inline",
              node: {
                id: "deepSource",
                templateId: "NumberLiteral",
                inputs: { value: { kind: "literal", value: 1 } }
              }
            }
          }
        }
      }
    }
  }],
  finalNodeId: "deepSource"
});

recursiveCompiler.defineGraph({
  nodes: [
    {
      id: "source",
      templateId: "NumberLiteral",
      inputs: { value: { kind: "literal", value: 1 } }
    },
    {
      id: "outer",
      templateId: "ExpressionConsumer",
      inputs: {
        source: {
          kind: "inline",
          node: {
            id: "inlineConsumer",
            templateId: "ExpressionConsumer",
            inputs: { source: { $ref: "source" } }
          }
        }
      }
    }
  ],
  finalNodeId: "inlineConsumer"
});

recursiveCompiler.defineGraph({
  nodes: [
    {
      id: "left", templateId: "ExpressionConsumer", inputs: {
        source: { kind: "inline", node: {
          id: "crossBranchSource", templateId: "NumberLiteral",
          inputs: { value: { kind: "literal", value: 1 } }
        } }
      }
    },
    {
      id: "right", templateId: "ExpressionConsumer", inputs: {
        source: { kind: "inline", node: {
          id: "crossBranchConsumer", templateId: "ExpressionConsumer",
          inputs: { source: { $ref: "crossBranchSource" } }
        } }
      }
    }
  ],
  finalNodeId: "right"
});

recursiveCompiler.defineGraph({
  nodes: [{
    id: "collection",
    templateId: "StatementCollection",
    inputs: {
      statements: {
        kind: "fragmentCollection",
        items: [{
          kind: "inline",
          node: {
            id: "inlineStatement",
            templateId: "StatementTemplate",
            inputs: { body: { kind: "rawCode", code: "return;" } }
          }
        }]
      }
    }
  }],
  finalNodeId: "collection"
});

const recursiveUnknownTemplate = {
  nodes: [{
    id: "outer", templateId: "ExpressionConsumer", inputs: {
      source: { kind: "inline", node: { id: "bad", templateId: "MissingTemplate", inputs: {} } }
    }
  }],
  finalNodeId: "outer"
} as const;
// @ts-expect-error recursively inline template IDs must exist in the catalog.
recursiveCompiler.defineGraph(recursiveUnknownTemplate);

const recursiveMissingInput = {
  nodes: [{
    id: "outer", templateId: "ExpressionConsumer", inputs: {
      source: { kind: "inline", node: { id: "bad", templateId: "NumberLiteral", inputs: {} } }
    }
  }],
  finalNodeId: "outer"
} as const;
// @ts-expect-error recursively inline nodes must provide required inputs.
recursiveCompiler.defineGraph(recursiveMissingInput);

const recursiveUnknownInput = {
  nodes: [{
    id: "outer", templateId: "ExpressionConsumer", inputs: {
      source: { kind: "inline", node: {
        id: "bad", templateId: "NumberLiteral",
        inputs: { value: { kind: "literal", value: 1 }, extra: { kind: "literal", value: 2 } }
      } }
    }
  }],
  finalNodeId: "outer"
} as const;
// @ts-expect-error recursively inline nodes reject unknown inputs.
recursiveCompiler.defineGraph(recursiveUnknownInput);

const recursiveWrongInputKind = {
  nodes: [{
    id: "outer", templateId: "ExpressionConsumer", inputs: {
      source: { kind: "inline", node: {
        id: "bad", templateId: "NumberLiteral", inputs: { value: { kind: "rawCode", code: "1" } }
      } }
    }
  }],
  finalNodeId: "outer"
} as const;
// @ts-expect-error recursively inline inputs must match their selected port kind.
recursiveCompiler.defineGraph(recursiveWrongInputKind);

const recursiveBadContainingPort = {
  nodes: [{
    id: "outer", templateId: "ExpressionConsumer", inputs: {
      source: { kind: "inline", node: {
        id: "statement", templateId: "StatementTemplate",
        inputs: { body: { kind: "rawCode", code: "return;" } }
      } }
    }
  }],
  finalNodeId: "outer"
} as const;
// @ts-expect-error inline producers must satisfy the containing fragment port.
recursiveCompiler.defineGraph(recursiveBadContainingPort);

const recursiveMissingRef = {
  nodes: [{
    id: "outer", templateId: "ExpressionConsumer", inputs: {
      source: { kind: "inline", node: {
        id: "inner", templateId: "ExpressionConsumer", inputs: { source: { $ref: "missing" } }
      } }
    }
  }],
  finalNodeId: "outer"
} as const;
// @ts-expect-error references authored inside inline nodes must exist globally.
recursiveCompiler.defineGraph(recursiveMissingRef);

const recursiveWrongKindRef = {
  nodes: [
    { id: "statement", templateId: "StatementTemplate", inputs: { body: { kind: "rawCode", code: "return;" } } },
    { id: "outer", templateId: "ExpressionConsumer", inputs: {
      source: { kind: "inline", node: {
        id: "inner", templateId: "ExpressionConsumer", inputs: { source: { $ref: "statement" } }
      } }
    } }
  ],
  finalNodeId: "outer"
} as const;
// @ts-expect-error references inside inline nodes must satisfy producer output kind.
recursiveCompiler.defineGraph(recursiveWrongKindRef);

const recursiveDisallowedSourceRef = {
  nodes: [
    { id: "raw", templateId: "InlineRawExpression", inputs: { value: { kind: "rawCode", code: "1" } } },
    { id: "outer", templateId: "ExpressionConsumer", inputs: {
      source: { kind: "inline", node: {
        id: "inner", templateId: "AllowNumberLiteralOnly", inputs: { source: { $ref: "raw" } }
      } }
    } }
  ],
  finalNodeId: "outer"
} as const;
// @ts-expect-error references inside inline nodes must satisfy sourceModelIds.
recursiveCompiler.defineGraph(recursiveDisallowedSourceRef);

const duplicateTopLevelIds = {
  nodes: [
    { id: "duplicate", templateId: "NumberLiteral", inputs: { value: { kind: "literal", value: 1 } } },
    { id: "duplicate", templateId: "NumberLiteral", inputs: { value: { kind: "literal", value: 2 } } }
  ],
  finalNodeId: "duplicate"
} as const;
// @ts-expect-error duplicate top-level IDs are rejected by strict graph typing.
recursiveCompiler.defineGraph(duplicateTopLevelIds);

const duplicateTopAndInlineIds = {
  nodes: [
    { id: "duplicate", templateId: "NumberLiteral", inputs: { value: { kind: "literal", value: 1 } } },
    { id: "outer", templateId: "ExpressionConsumer", inputs: {
      source: { kind: "inline", node: {
        id: "duplicate", templateId: "NumberLiteral", inputs: { value: { kind: "literal", value: 2 } }
      } }
    } }
  ],
  finalNodeId: "outer"
} as const;
// @ts-expect-error top-level and inline IDs share one unique namespace.
recursiveCompiler.defineGraph(duplicateTopAndInlineIds);

const duplicateInlineIds = {
  nodes: [{
    id: "collection", templateId: "StatementCollection", inputs: {
      statements: { kind: "fragmentCollection", items: [
        { kind: "inline", node: {
          id: "duplicate", templateId: "StatementTemplate", inputs: { body: { kind: "rawCode", code: "return;" } }
        } },
        { kind: "inline", node: {
          id: "duplicate", templateId: "StatementTemplate", inputs: { body: { kind: "rawCode", code: "throw new Error();" } }
        } }
      ] }
    }
  }],
  finalNodeId: "collection"
} as const;
// @ts-expect-error duplicate inline IDs are rejected across collection items.
recursiveCompiler.defineGraph(duplicateInlineIds);

const widenedRecursiveNodes: SynthesisGraph["nodes"] = [{
  id: "wide",
  templateId: "ExpressionConsumer",
  inputs: { source: { kind: "inline", node: {
    id: "wideInline", templateId: "NumberLiteral", inputs: { value: { kind: "literal", value: 1 } }
  } } }
}];
recursiveCompiler.defineGraph({ nodes: widenedRecursiveNodes, finalNodeId: "wide" });

const partialMissingInputsAndTargetsGraph = {
  nodes: [
    {
      id: "incompleteSource",
      templateId: "NumberLiteral",
      inputs: {}
    },
    {
      id: "incompleteConsumer",
      templateId: "ExpressionConsumer",
      inputs: { source: { $ref: "plannedSource" } }
    }
  ],
  finalNodeId: "plannedFinal"
} as const;

const partialMissingInputsAndTargets = definePartialGraph(
  recursiveGraphTemplates,
  partialMissingInputsAndTargetsGraph
);
const partialGraphIsStillRuntimeGraph: SynthesisGraph = partialMissingInputsAndTargets;
void partialGraphIsStillRuntimeGraph;

recursiveCompiler.definePartialGraph({
  nodes: [{
    id: "partialInlineOuter",
    templateId: "ExpressionConsumer",
    inputs: {
      source: {
        kind: "inline",
        node: {
          id: "partialInlineSource",
          templateId: "NumberLiteral",
          inputs: {}
        }
      }
    }
  }],
  finalNodeId: "partialInlineOuter"
});

compileGraph({
  nodes: [{
    id: "partialCollection",
    templateId: "StatementCollection",
    inputs: {
      statements: {
        kind: "fragmentCollection",
        items: [
          {
            kind: "inline",
            node: { id: "partialInlineStatement", templateId: "StatementTemplate", inputs: {} }
          },
          { $ref: "plannedStatement" }
        ]
      }
    }
  }],
  finalNodeId: "partialCollection"
}, recursiveGraphTemplates, { mode: "partial" });

compileGraph(partialMissingInputsAndTargets, recursiveGraphTemplates, { mode: "partial" });
recursiveCompiler(partialMissingInputsAndTargets, { mode: "partial" });

// @ts-expect-error strict defineGraph still requires complete inputs and existing refs/final IDs.
defineGraph(recursiveGraphTemplates, partialMissingInputsAndTargetsGraph);
// @ts-expect-error strict compiler graph authoring does not accept the incomplete graph.
recursiveCompiler.defineGraph(partialMissingInputsAndTargetsGraph);
// @ts-expect-error strict authored-catalog compilation retains complete graph checks.
compileGraph(partialMissingInputsAndTargetsGraph, recursiveGraphTemplates);

const partialUnknownTemplate = {
  nodes: [{ id: "unknown", templateId: "MissingTemplate", inputs: {} }],
  finalNodeId: "unknown"
} as const;
// @ts-expect-error partial graphs still require every authored template ID to exist.
definePartialGraph(recursiveGraphTemplates, partialUnknownTemplate);

const partialRecursiveUnknownTemplate = {
  nodes: [{
    id: "partialUnknownInlineOuter",
    templateId: "ExpressionConsumer",
    inputs: {
      source: {
        kind: "inline",
        node: { id: "partialUnknownInline", templateId: "MissingTemplate", inputs: {} }
      }
    }
  }],
  finalNodeId: "partialUnknownInlineOuter"
} as const;
// @ts-expect-error recursively inline partial nodes must select a known template.
recursiveCompiler.definePartialGraph(partialRecursiveUnknownTemplate);

const partialExtraInput = {
  nodes: [{
    id: "extra",
    templateId: "NumberLiteral",
    inputs: { extra: { kind: "literal", value: 1 } }
  }],
  finalNodeId: "extra"
} as const;
// @ts-expect-error supplied partial inputs must be declared by the selected template.
compileGraph(partialExtraInput, recursiveGraphTemplates, { mode: "partial" });

const partialWrongInputKind = {
  nodes: [{
    id: "wrongInputKind",
    templateId: "NumberLiteral",
    inputs: { value: { kind: "rawCode", code: "1" } }
  }],
  finalNodeId: "wrongInputKind"
} as const;
// @ts-expect-error supplied partial inputs retain their concrete port shape checks.
definePartialGraph(recursiveGraphTemplates, partialWrongInputKind);

const partialKnownWrongReference = {
  nodes: [
    {
      id: "knownStatement",
      templateId: "StatementTemplate",
      inputs: {}
    },
    {
      id: "knownBadConsumer",
      templateId: "ExpressionConsumer",
      inputs: { source: { $ref: "knownStatement" } }
    }
  ],
  finalNodeId: "knownBadConsumer"
} as const;
// @ts-expect-error known partial ref targets must satisfy the consumer output kind.
recursiveCompiler.definePartialGraph(partialKnownWrongReference);

const partialKnownDisallowedSource = {
  nodes: [
    {
      id: "knownRaw",
      templateId: "InlineRawExpression",
      inputs: {}
    },
    {
      id: "knownAllowlistedConsumer",
      templateId: "AllowNumberLiteralOnly",
      inputs: { source: { kind: "ref", nodeId: "knownRaw" } }
    }
  ],
  finalNodeId: "knownAllowlistedConsumer"
} as const;
// @ts-expect-error known partial ref targets must satisfy source-model allowlists.
compileGraph(partialKnownDisallowedSource, recursiveGraphTemplates, { mode: "partial" });

const partialCollectionKnownWrongReference = {
  nodes: [
    { id: "knownCollectionExpression", templateId: "NumberLiteral", inputs: {} },
    {
      id: "knownBadCollection",
      templateId: "StatementCollection",
      inputs: {
        statements: {
          kind: "fragmentCollection",
          items: [{ $ref: "knownCollectionExpression" }]
        }
      }
    }
  ],
  finalNodeId: "knownBadCollection"
} as const;
// @ts-expect-error known partial collection refs must satisfy kind and source constraints.
definePartialGraph(recursiveGraphTemplates, partialCollectionKnownWrongReference);

const partialDuplicateIds = {
  nodes: [
    { id: "partialDuplicate", templateId: "NumberLiteral", inputs: {} },
    { id: "partialDuplicate", templateId: "NumberLiteral", inputs: {} }
  ],
  finalNodeId: "partialDuplicate"
} as const;
// @ts-expect-error partial graphs retain global node-ID uniqueness.
recursiveCompiler.definePartialGraph(partialDuplicateIds);

const partialDuplicateInlineId = {
  nodes: [
    { id: "partialInlineDuplicate", templateId: "NumberLiteral", inputs: {} },
    {
      id: "partialInlineContainer",
      templateId: "ExpressionConsumer",
      inputs: {
        source: {
          kind: "inline",
          node: { id: "partialInlineDuplicate", templateId: "NumberLiteral", inputs: {} }
        }
      }
    }
  ],
  finalNodeId: "partialInlineContainer"
} as const;
// @ts-expect-error top-level and recursively inline partial nodes share one ID namespace.
compileGraph(partialDuplicateInlineId, recursiveGraphTemplates, { mode: "partial" });

const partialBadInlineProducer = {
  nodes: [{
    id: "partialBadInlineOuter",
    templateId: "ExpressionConsumer",
    inputs: {
      source: {
        kind: "inline",
        node: { id: "partialBadInline", templateId: "StatementTemplate", inputs: {} }
      }
    }
  }],
  finalNodeId: "partialBadInlineOuter"
} as const;
// @ts-expect-error partial inline producers must remain compatible with their containing port.
definePartialGraph(recursiveGraphTemplates, partialBadInlineProducer);

const widenedPartialNodes: SynthesisGraph["nodes"] = [{
  id: "widenedPartial",
  templateId: "MissingAtCompileTime",
  inputs: {}
}];
recursiveCompiler.definePartialGraph({ nodes: widenedPartialNodes, finalNodeId: "plannedFinal" });

// Finite schema/type metadata is checked conservatively during strict graph authoring.
const StaticNumberProducer = defineTemplate({
  modelId: "StaticNumberProducer",
  inputs: {},
  output: {
    kind: "expression",
    type: { ts: "number", schema: { type: "number" } }
  },
  template: () => "1"
});

const StaticIntegerArrayProducer = defineTemplate({
  modelId: "StaticIntegerArrayProducer",
  inputs: {},
  output: {
    kind: "expression",
    type: {
      ts: "readonly number[]",
      schema: { type: "array", items: { type: "integer" } }
    }
  },
  template: () => "[1]"
});

const StaticStringProducer = defineTemplate({
  modelId: "StaticStringProducer",
  inputs: {},
  output: {
    kind: "expression",
    type: { ts: "string", schema: { type: "string" } }
  },
  template: () => "'value'"
});

const StaticUntypedProducer = defineTemplate({
  modelId: "StaticUntypedProducer",
  inputs: {},
  output: { kind: "expression" },
  template: () => "undefined"
});

const StaticObjectWithoutRequiredProducer = defineTemplate({
  modelId: "StaticObjectWithoutRequiredProducer",
  inputs: {},
  output: {
    kind: "expression",
    type: {
      schema: {
        type: "object",
        properties: { id: { type: "number" } },
        additionalProperties: false
      }
    }
  },
  template: () => "({})"
});

const StaticTupleProducer = defineTemplate({
  modelId: "StaticTupleProducer",
  inputs: {},
  output: {
    kind: "expression",
    type: {
      schema: {
        type: "array",
        prefixItems: [{ type: "number" }, { type: "string" }],
        items: false
      }
    }
  },
  template: () => "[1, 'value']"
});

const StaticNumberConsumer = defineTemplate({
  modelId: "StaticNumberConsumer",
  inputs: {
    source: fragmentPort({
      regionKind: "expression",
      accepts: { type: { ts: "number", schema: { type: "number" } } }
    })
  },
  output: { kind: "expression" },
  template: r => r("source")
});

const StaticUnknownTsConsumer = defineTemplate({
  modelId: "StaticUnknownTsConsumer",
  inputs: {
    source: fragmentPort({
      regionKind: "expression",
      accepts: { type: { ts: "unknown" } }
    })
  },
  output: { kind: "expression" },
  template: r => r("source")
});

const StaticNumberArrayCollection = defineTemplate({
  modelId: "StaticNumberArrayCollection",
  inputs: {
    sources: {
      kind: "fragmentCollection",
      regionKind: "expression",
      accepts: {
        type: { schema: { type: "array", items: { type: "number" } } }
      }
    }
  },
  output: { kind: "expression" },
  template: r => `[${r("sources")}]`
});

const StaticRequiredObjectConsumer = defineTemplate({
  modelId: "StaticRequiredObjectConsumer",
  inputs: {
    source: {
      kind: "fragment",
      regionKind: "expression",
      accepts: {
        type: {
          schema: {
            type: "object",
            properties: { id: { type: "number" } },
            required: ["id"],
            additionalProperties: false
          }
        }
      }
    }
  },
  output: { kind: "expression" },
  template: r => r("source")
});

const StaticNumberTupleConsumer = defineTemplate({
  modelId: "StaticNumberTupleConsumer",
  inputs: {
    source: {
      kind: "fragment",
      regionKind: "expression",
      accepts: {
        type: {
          schema: {
            type: "array",
            prefixItems: [{ type: "number" }, { type: "number" }],
            items: false
          }
        }
      }
    }
  },
  output: { kind: "expression" },
  template: r => r("source")
});

const StaticLiteralConsumer = defineTemplate({
  modelId: "StaticLiteralConsumer",
  inputs: {
    value: {
      kind: "literal",
      regionKind: "expression",
      schema: {
        anyOf: [
          { anyOf: [{ type: "number" }, { type: "string" }] },
          { type: "boolean" }
        ]
      }
    },
    object: {
      kind: "literal",
      regionKind: "object",
      schema: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
        additionalProperties: false
      }
    },
    tuple: {
      kind: "literal",
      regionKind: "array",
      schema: {
        type: "array",
        prefixItems: [{ type: "number" }, { type: "string" }],
        items: false
      }
    }
  },
  output: { kind: "expression" },
  template: () => "undefined"
});

const compatibilityTemplates = defineTemplateCatalog([
  StaticNumberProducer,
  StaticIntegerArrayProducer,
  StaticStringProducer,
  StaticUntypedProducer,
  StaticObjectWithoutRequiredProducer,
  StaticTupleProducer,
  StaticNumberConsumer,
  StaticUnknownTsConsumer,
  StaticNumberArrayCollection,
  StaticRequiredObjectConsumer,
  StaticNumberTupleConsumer,
  StaticLiteralConsumer
]);
const compatibilityCompiler = buildGraphCompiler(compatibilityTemplates);

compatibilityCompiler.defineGraph({
  nodes: [
    { id: "number", templateId: "StaticNumberProducer", inputs: {} },
    {
      id: "consumer",
      templateId: "StaticNumberConsumer",
      inputs: { source: { $ref: "number" } }
    }
  ],
  finalNodeId: "consumer",
  goal: { outputKind: "expression" }
});

compatibilityCompiler.defineGraph({
  nodes: [
    { id: "string", templateId: "StaticStringProducer", inputs: {} },
    {
      id: "unknownConsumer",
      templateId: "StaticUnknownTsConsumer",
      inputs: { source: { $ref: "string" } }
    }
  ],
  finalNodeId: "unknownConsumer"
});

const staticallyWrongPrimitiveRef = {
  nodes: [
    { id: "string", templateId: "StaticStringProducer", inputs: {} },
    {
      id: "consumer",
      templateId: "StaticNumberConsumer",
      inputs: { source: { $ref: "string" } }
    }
  ],
  finalNodeId: "consumer"
} as const;
// @ts-expect-error finite producer schemas must be subsets of fragment contracts.
compatibilityCompiler.defineGraph(staticallyWrongPrimitiveRef);

const staticallyMissingTypeMetadata = {
  nodes: [
    { id: "untyped", templateId: "StaticUntypedProducer", inputs: {} },
    {
      id: "consumer",
      templateId: "StaticNumberConsumer",
      inputs: { source: { $ref: "untyped" } }
    }
  ],
  finalNodeId: "consumer"
} as const;
// @ts-expect-error a typed fragment contract requires corresponding producer metadata.
compatibilityCompiler.defineGraph(staticallyMissingTypeMetadata);

const staticallyWrongInlineProducer = {
  nodes: [{
    id: "consumer",
    templateId: "PatternSchemaConsumer",
    inputs: {
      source: {
        kind: "inline",
        node: { id: "inlineString", templateId: "StaticStringProducer", inputs: {} }
      }
    }
  }],
  finalNodeId: "consumer"
} as const;
// @ts-expect-error inline producers use the same finite compatibility proof as refs.
compatibilityCompiler.defineGraph(staticallyWrongInlineProducer);

const staticallyWrongCollectionProducer = {
  nodes: [
    { id: "string", templateId: "StaticStringProducer", inputs: {} },
    {
      id: "collection",
      templateId: "StaticNumberArrayCollection",
      inputs: {
        sources: { kind: "fragmentCollection", items: [{ $ref: "string" }] }
      }
    }
  ],
  finalNodeId: "collection"
} as const;
// @ts-expect-error collection items are checked independently against their fragment contract.
compatibilityCompiler.defineGraph(staticallyWrongCollectionProducer);

const staticallyMissingRequiredObjectProperty = {
  nodes: [
    { id: "object", templateId: "StaticObjectWithoutRequiredProducer", inputs: {} },
    {
      id: "consumer",
      templateId: "StaticRequiredObjectConsumer",
      inputs: { source: { $ref: "object" } }
    }
  ],
  finalNodeId: "consumer"
} as const;
// @ts-expect-error producer object schemas must guarantee consumer-required properties.
compatibilityCompiler.defineGraph(staticallyMissingRequiredObjectProperty);

const staticallyWrongTupleItem = {
  nodes: [
    { id: "tuple", templateId: "StaticTupleProducer", inputs: {} },
    {
      id: "consumer",
      templateId: "StaticNumberTupleConsumer",
      inputs: { source: { $ref: "tuple" } }
    }
  ],
  finalNodeId: "consumer"
} as const;
// @ts-expect-error finite prefixItems tuples are compared position by position.
compatibilityCompiler.defineGraph(staticallyWrongTupleItem);

const staticallyWrongLiteralInputs = {
  nodes: [{
    id: "literal",
    templateId: "StaticLiteralConsumer",
    inputs: {
      value: { kind: "literal", value: { invalid: true } },
      object: { kind: "literal", value: {} },
      tuple: { kind: "literal", value: [1, 2] }
    }
  }],
  finalNodeId: "literal"
} as const;
// @ts-expect-error finite literal values are rejected when incompatibility is provable.
compatibilityCompiler.defineGraph(staticallyWrongLiteralInputs);

const staticallyWrongFinalGoal = {
  nodes: [{ id: "string", templateId: "StaticStringProducer", inputs: {} }],
  finalNodeId: "string",
  goal: { outputKind: "expression", type: { schema: { type: "number" } } }
} as const;
// @ts-expect-error known final goals participate in finite schema compatibility.
compatibilityCompiler.defineGraph(staticallyWrongFinalGoal);

const partialStaticallyWrongRef = {
  nodes: [
    { id: "string", templateId: "StaticStringProducer", inputs: {} },
    {
      id: "consumer",
      templateId: "StaticNumberConsumer",
      inputs: { source: { $ref: "string" } }
    }
  ],
  finalNodeId: "plannedFinal"
} as const;
// @ts-expect-error partial graphs still reject known, provably incompatible targets.
compatibilityCompiler.definePartialGraph(partialStaticallyWrongRef);

// Different arbitrary TypeScript strings are deferred to the runtime compiler checker.
const TsOnlyNumberConsumer = defineTemplate({
  modelId: "TsOnlyNumberConsumer",
  inputs: {
    source: fragmentPort({
      regionKind: "expression",
      accepts: { type: { ts: "number" } }
    })
  },
  output: { kind: "expression" },
  template: r => r("source")
});
const tsDeferredCompiler = buildGraphCompiler([
  StaticStringProducer,
  TsOnlyNumberConsumer
] as const);
tsDeferredCompiler.defineGraph({
  nodes: [
    { id: "string", templateId: "StaticStringProducer", inputs: {} },
    {
      id: "consumer",
      templateId: "TsOnlyNumberConsumer",
      inputs: { source: { $ref: "string" } }
    }
  ],
  finalNodeId: "consumer"
});

type WidenedSupportedSchema = NonNullable<Extract<InputPort, { kind: "literal" }>["schema"]>;
const widenedCompatibilitySchema: WidenedSupportedSchema = { type: "string" };
const WidenedSchemaProducer = defineTemplate({
  modelId: "WidenedSchemaProducer",
  inputs: {},
  output: { kind: "expression", type: { schema: widenedCompatibilitySchema } },
  template: () => "'value'"
});
const WidenedSchemaConsumer = defineTemplate({
  modelId: "WidenedSchemaConsumer",
  inputs: {
    source: {
      kind: "fragment",
      regionKind: "expression",
      accepts: { type: { schema: widenedCompatibilitySchema } }
    }
  },
  output: { kind: "expression" },
  template: r => r("source")
});
const PatternSchemaConsumer = defineTemplate({
  modelId: "PatternSchemaConsumer",
  inputs: {
    source: fragmentPort({
      regionKind: "expression",
      accepts: { type: { schema: { type: "string", pattern: "^[a-z]+$" } } }
    })
  },
  output: { kind: "expression" },
  template: r => r("source")
});
const deferredCompatibilityCompiler = buildGraphCompiler([
  WidenedSchemaProducer,
  WidenedSchemaConsumer,
  StaticStringProducer,
  PatternSchemaConsumer
] as const);
deferredCompatibilityCompiler.defineGraph({
  nodes: [
    { id: "widened", templateId: "WidenedSchemaProducer", inputs: {} },
    {
      id: "consumer",
      templateId: "WidenedSchemaConsumer",
      inputs: { source: { $ref: "widened" } }
    }
  ],
  finalNodeId: "consumer"
});
deferredCompatibilityCompiler.defineGraph({
  nodes: [
    { id: "string", templateId: "StaticStringProducer", inputs: {} },
    {
      id: "consumer",
      templateId: "PatternSchemaConsumer",
      inputs: { source: { $ref: "string" } }
    }
  ],
  finalNodeId: "consumer"
});
deferredCompatibilityCompiler.definePartialGraph({
	  nodes: [{
	    id: "consumer",
	    templateId: "WidenedSchemaConsumer",
	    inputs: { source: { $ref: "plannedProducer" } }
  }],
  finalNodeId: "plannedFinal"
});

const FirstClassType = defineTemplate({
  modelId: "FirstClassType",
  inputs: {
    value: rawCodePort({ regionKind: "type" })
  },
  output: { kind: "type", type: { ts: "string | number" } },
  template: r => r("value", "unknown")
});
const TypeMemberConsumer = defineTemplate({
  modelId: "TypeMemberConsumer",
  inputs: {
    member: fragmentPort({ regionKind: "typeMember", accepts: { outputKind: "typeMember" } })
  },
  output: { kind: "declaration" },
  template: r => `interface Value { ${r("member", "value: unknown")} }`
});
const TypeConsumer = defineTemplate({
  modelId: "TypeConsumer",
  inputs: {
    value: fragmentPort({ regionKind: "type", accepts: { outputKind: "type" } })
  },
  output: { kind: "type" },
  template: r => `ReadonlyArray<${r("value", "unknown")}>`
});

// @ts-expect-error literal ports cannot target first-class type/declaration syntax.
literalPort({ regionKind: "type" });

const firstClassTypeCompiler = buildGraphCompiler([
  FirstClassType,
  TypeConsumer,
  TypeMemberConsumer
] as const);
firstClassTypeCompiler.defineGraph({
  nodes: [
    {
      id: "source",
      templateId: "FirstClassType",
      inputs: { value: { kind: "rawCode", code: "string" } }
    },
    {
      id: "consumer",
      templateId: "TypeConsumer",
      inputs: { value: { $ref: "source" } }
    }
  ],
  finalNodeId: "consumer",
  goal: { outputKind: "type" }
});
firstClassTypeCompiler.definePartialGraph({
  nodes: [{ id: "source", templateId: "FirstClassType", inputs: {} }],
  finalNodeId: "source",
  goal: { outputKind: "type" }
});
firstClassTypeCompiler.defineGraph({
  nodes: [
    {
      id: "source",
      templateId: "FirstClassType",
      inputs: { value: { kind: "rawCode", code: "string" } }
    },
    {
      id: "consumer",
      templateId: "TypeMemberConsumer",
      // @ts-expect-error exact region-kind compatibility rejects type fragments in typeMember ports.
      inputs: { member: { $ref: "source" } }
    }
  ],
  finalNodeId: "consumer"
});
