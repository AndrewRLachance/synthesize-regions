import type { GraphTemplateDefinition, InputPort, RawCodePolicy, TemplateRegistry } from "./graphTypes.js";
import { REGION_KIND_VALUES } from "./graphTypes.js";
import { portIsRequired } from "./compatibility.js";

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
      refShorthandInputSchema()
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
  registry: TemplateRegistry
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

export function defineTemplateCatalog<const T extends readonly GraphTemplateDefinition<any, string, any>[]>(templates: T): T {
  return templates;
}

export function createTemplateRegistry(initialTemplates: readonly GraphTemplateDefinition<any, string>[] = []): TemplateRegistry {
  const templates = new Map<string, GraphTemplateDefinition<any, string>>();

  for (const template of initialTemplates) {
    templates.set(template.modelId, template);
  }

  return {
    register(template) {
      templates.set(template.modelId, template);
    },

    get(templateId) {
      return templates.get(templateId);
    },

    list() {
      return [...templates.values()];
    },

    summaries() {
      return [...templates.values()].map(template => template.summary());
    }
  };
}
