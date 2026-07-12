import type {
  GraphTemplateDefinition,
  InputPort,
  RawCodePolicy,
  TemplateCatalogView,
  TemplateRegistry,
  TemplateRegistrySnapshot,
  TemplateSummary
} from "./graphTypes.js";
import type { StrictTemplateCatalog } from "./graphStrictTypes.js";
import { REGION_KIND_VALUES } from "./graphTypes.js";
import { portIsRequired } from "./compatibility.js";
import { assertTemplateCatalogValid, TemplateCatalogValidationError } from "./catalogValidation.js";
import {
  cloneTemplateSummaries,
  templateCatalogDigest,
  templateSummaryContractDigest
} from "./catalogDigest.js";

const JSON_SCHEMA_URI = "https://json-schema.org/draft/2020-12/schema";

function escapeRegExpLiteral(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function refInputSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["kind", "nodeId"],
    properties: {
      kind: { const: "ref" },
      nodeId: { type: "string" }
    }
  };
}

function refShorthandInputSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["$ref"],
    properties: {
      $ref: { type: "string" }
    }
  };
}

function inlineInputSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["kind", "node"],
    properties: {
      kind: { const: "inline" },
      node: { $ref: "#/$defs/synthesisNode" }
    }
  };
}

function rawCodeSchemaFromPolicy(policy: RawCodePolicy | undefined): Record<string, unknown> {
  const codeSchema: Record<string, unknown> = { type: "string" };
  const allOf: Record<string, unknown>[] = [];

  if (policy?.maxLength !== undefined && Number.isInteger(policy.maxLength) && policy.maxLength >= 0) {
    codeSchema.maxLength = policy.maxLength;
  }

  if (policy?.allowNewlines === false) {
    codeSchema.pattern = "^[^\\r\\n]*$";
  }

  for (const forbidden of policy?.forbiddenSubstrings ?? []) {
    if (forbidden.length === 0) continue;
    allOf.push({ not: { pattern: escapeRegExpLiteral(forbidden) } });
  }

  for (const pattern of policy?.forbiddenPatterns ?? []) {
    // Keep schema generation aligned with compileGraph's raw-code policy check,
    // which treats invalid patterns as invalid policy diagnostics.
    new RegExp(pattern, "u");
    allOf.push({ not: { pattern } });
  }

  if (allOf.length > 0) {
    codeSchema.allOf = allOf;
  }

  return codeSchema;
}

function inputSchemaForPort(port: InputPort): Record<string, unknown> {
  switch (port.kind) {
    case "literal":
      return {
        type: "object",
        additionalProperties: false,
        required: ["kind", "value"],
        properties: {
          kind: { const: "literal" },
          value: port.schema ?? true
        }
      };
    case "fragment":
      return {
        anyOf: [
          refInputSchema(),
          refShorthandInputSchema(),
          inlineInputSchema()
        ]
      };
    case "fragmentCollection": {
      const item = { anyOf: [refInputSchema(), refShorthandInputSchema(), inlineInputSchema()] };
      return {
        type: "object",
        additionalProperties: false,
        required: ["kind", "items"],
        properties: {
          kind: { const: "fragmentCollection" },
          items: {
            type: "array",
            items: item,
            minItems: port.minItems ?? 0,
            ...(port.maxItems === undefined ? {} : { maxItems: port.maxItems })
          }
        }
      };
    }
    case "rawCode":
      return {
        type: "object",
        additionalProperties: false,
        required: ["kind", "code"],
        properties: {
          kind: { const: "rawCode" },
          code: rawCodeSchemaFromPolicy(port.policy)
        }
      };
    case "union":
      return {
        anyOf: port.options.map(inputSchemaForPort)
      };
  }
}

function genericSynthesisInputSchema(): Record<string, unknown> {
  return {
    anyOf: [
      {
        type: "object",
        additionalProperties: false,
        required: ["kind", "value"],
        properties: {
          kind: { const: "literal" },
          value: true
        }
      },
      refInputSchema(),
      {
        type: "object",
        additionalProperties: false,
        required: ["kind", "code"],
        properties: {
          kind: { const: "rawCode" },
          code: { type: "string" }
        }
      },
      inlineInputSchema(),
      refShorthandInputSchema(),
      {
        type: "object",
        additionalProperties: false,
        required: ["kind", "items"],
        properties: {
          kind: { const: "fragmentCollection" },
          items: { type: "array", items: { anyOf: [refInputSchema(), refShorthandInputSchema(), inlineInputSchema()] } }
        }
      }
    ]
  };
}

function typeDescriptorSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      ts: { type: "string" },
      schema: true
    }
  };
}

function synthesisGoalSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      outputKind: regionKindSchema(),
      type: { $ref: "#/$defs/typeDescriptor" },
      schema: true
    }
  };
}

function regionKindSchema(): Record<string, unknown> {
  return { enum: [...REGION_KIND_VALUES] };
}

function genericSynthesisNodeSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["id", "templateId", "inputs"],
    properties: {
      id: { type: "string" },
      templateId: { type: "string" },
      inputs: {
        type: "object",
        additionalProperties: { $ref: "#/$defs/synthesisInput" }
      }
    }
  };
}

function sharedGraphSchemaDefs(synthesisNodeSchema: Record<string, unknown> = genericSynthesisNodeSchema()): Record<string, unknown> {
  return {
    synthesisNode: synthesisNodeSchema,
    synthesisInput: genericSynthesisInputSchema(),
    synthesisGoal: synthesisGoalSchema(),
    typeDescriptor: typeDescriptorSchema(),
    regionKind: regionKindSchema()
  };
}

/**
 * Build the structural JSON Schema for a graph node that invokes one template.
 *
 * This intentionally does not include `$schema` or `$defs`, so it can be reused
 * inside whole-graph schemas. Use `graphTemplateDefinitionToJsonSchema` when a
 * standalone schema document is needed.
 */
export function graphTemplateDefinitionToNodeSchema(
  template: GraphTemplateDefinition<any, string>
): Record<string, unknown> {
  const inputEntries = Object.entries(template.inputs) as Array<[string, InputPort]>;
  const inputProperties = Object.fromEntries(
    inputEntries.map(([key, port]) => [key, inputSchemaForPort(port)])
  );
  const requiredInputs = inputEntries
    .filter(([, port]) => portIsRequired(port))
    .map(([key]) => key);

  return {
    title: `${template.modelId} SynthesisNode`,
    ...(template.description ? { description: template.description } : {}),
    type: "object",
    additionalProperties: false,
    required: ["id", "templateId", "inputs"],
    properties: {
      id: { type: "string" },
      templateId: { const: template.modelId },
      inputs: {
        type: "object",
        additionalProperties: false,
        required: requiredInputs,
        properties: inputProperties
      }
    }
  };
}

/**
 * Build a standalone structural JSON Schema for a graph node that invokes one
 * template.
 */
export function graphTemplateDefinitionToJsonSchema(
  template: GraphTemplateDefinition<any, string>
): Record<string, unknown> {
  return {
    $schema: JSON_SCHEMA_URI,
    ...graphTemplateDefinitionToNodeSchema(template),
    $defs: sharedGraphSchemaDefs()
  };
}

/**
 * Build a structural JSON Schema for a full SynthesisGraph whose nodes may
 * invoke any template currently registered in `registry`.
 *
 * This is a planner-facing shape/schema gate. It validates graph document shape,
 * template IDs, required/unknown inputs, literal input schemas, raw-code surface
 * policy, and recursive inline nodes. It intentionally does not replace
 * `compileGraph`: reference existence, duplicate node IDs, cycle detection,
 * fragment type/source compatibility, and final-goal compatibility remain
 * compiler/semantic checks.
 */
export function templateRegistryToSynthesisGraphJsonSchema(
  registry: TemplateCatalogView
): Record<string, unknown> {
  const templates = registry.list();
  const templateNodeSchemaEntries = templates.map((template, index) => [
    `template${index}`,
    graphTemplateDefinitionToNodeSchema(template)
  ] as const);

  const synthesisNodeSchema: Record<string, unknown> = templateNodeSchemaEntries.length === 0
    ? { not: {} }
    : {
        oneOf: templateNodeSchemaEntries.map(([key]) => ({
          $ref: `#/$defs/templateNodes/${key}`
        }))
      };

  return {
    $schema: JSON_SCHEMA_URI,
    title: "SynthesisGraph",
    type: "object",
    additionalProperties: false,
    required: ["nodes", "finalNodeId"],
    properties: {
      nodes: {
        type: "array",
        minItems: 1,
        items: { $ref: "#/$defs/synthesisNode" }
      },
      finalNodeId: { type: "string" },
      goal: { $ref: "#/$defs/synthesisGoal" }
    },
    $defs: {
      ...sharedGraphSchemaDefs(synthesisNodeSchema),
      templateNodes: Object.fromEntries(templateNodeSchemaEntries)
    }
  };
}

/** Alias with the shorter name used by callers that already work in registry scope. */
export const registryToGraphJsonSchema = templateRegistryToSynthesisGraphJsonSchema;

export function defineTemplateCatalog<const T extends readonly GraphTemplateDefinition<any, string, any>[]>(
  templates: StrictTemplateCatalog<T>
): T {
  templateCatalogDigest(templates);
  return templates;
}

interface CatalogState {
  readonly templates: Map<string, GraphTemplateDefinition<any, string>>;
  readonly summaries: TemplateSummary[];
  readonly contractDigest: string;
}

function compareTemplates(
  left: GraphTemplateDefinition<any, string>,
  right: GraphTemplateDefinition<any, string>
): number {
  return left.modelId < right.modelId ? -1 : left.modelId > right.modelId ? 1 : 0;
}

function createCatalogState(
  templates: readonly GraphTemplateDefinition<any, string>[]
): CatalogState {
  assertTemplateCatalogValid(templates);
  const sortedTemplates = [...templates].sort(compareTemplates);
  let summaries: TemplateSummary[];
  let contractDigest: string;
  try {
    summaries = cloneTemplateSummaries(sortedTemplates.map(template => template.summary()));
    contractDigest = templateSummaryContractDigest(summaries);
  } catch (error) {
    throw new TemplateCatalogValidationError([{
      stage: "template",
      code: "CatalogContractNotSerializable",
      severity: "error",
      message: "Template catalog metadata must be deterministic JSON data.",
      actual: error instanceof Error ? { name: error.name, message: error.message } : error
    }]);
  }

  return {
    templates: new Map(sortedTemplates.map(template => [template.modelId, template])),
    summaries,
    contractDigest
  };
}

function snapshotFromState(state: CatalogState): TemplateRegistrySnapshot {
  const templates = new Map(state.templates);
  const summaries = cloneTemplateSummaries(state.summaries);
  return Object.freeze({
    contractDigest: state.contractDigest,
    get(templateId: string) {
      return templates.get(templateId);
    },
    list() {
      return [...templates.values()];
    },
    summaries() {
      return cloneTemplateSummaries(summaries);
    }
  });
}

export function createTemplateRegistry(): TemplateRegistry;
export function createTemplateRegistry<
  const T extends readonly GraphTemplateDefinition<any, string, any>[]
>(initialTemplates: StrictTemplateCatalog<T>): TemplateRegistry;
export function createTemplateRegistry(
  initialTemplates: readonly GraphTemplateDefinition<any, string>[] = []
): TemplateRegistry {
  let state = createCatalogState(initialTemplates);

  return {
    get contractDigest() {
      return state.contractDigest;
    },

    register(template) {
      const nextState = createCatalogState([...state.templates.values(), template]);
      state = nextState;
    },

    registerAll(templates) {
      if (templates.length === 0) return;
      const candidate = [...state.templates.values(), ...templates];
      const nextState = createCatalogState(candidate);
      state = nextState;
    },

    replace(template) {
      if (!state.templates.has(template.modelId)) {
        throw new TemplateCatalogValidationError([{
          stage: "template",
          code: "UnknownTemplateReplacement",
          severity: "error",
          message: `Cannot replace unknown template ${template.modelId}.`,
          templateId: template.modelId,
          path: "template.modelId",
          expected: [...state.templates.keys()],
          actual: template.modelId
        }]);
      }
      const candidate = new Map(state.templates);
      candidate.set(template.modelId, template);
      const nextState = createCatalogState([...candidate.values()]);
      state = nextState;
    },

    get(templateId) {
      return state.templates.get(templateId);
    },

    list() {
      return [...state.templates.values()];
    },

    summaries() {
      return cloneTemplateSummaries(state.summaries);
    },

    snapshot() {
      return snapshotFromState(state);
    }
  };
}
