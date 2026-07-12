import {
  buildGraphCompiler,
  compileGraph,
  createTemplateRegistry,
  defineGraph,
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
