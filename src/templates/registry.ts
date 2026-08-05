import type {
  GraphTemplateDefinition,
  InputPort,
  RawCodePolicy,
  TemplateCatalogView,
  TemplateRegistry,
  TemplateRegistrySnapshot,
  TemplateSummary
} from "./graphTypes.js";
import { compareCodeUnits } from "./deterministic.js";
import { synthesisDiagnosticOriginForCode } from "./diagnosticCatalog.js";
import type { StrictTemplateCatalog } from "./graphStrictTypes.js";
import { REGION_KIND_VALUES } from "./graphTypes.js";
import { portIsRequired } from "./compatibility.js";
import { SupportedJsonSchemaSchema } from './schemaContract.js'
import { schemaWithResourceId } from './schemaCompatibility.js'
import { assertTemplateCatalogValid, TemplateCatalogValidationError } from "./catalogValidation.js";
import { brandTemplateCatalogView } from './catalogTrust.js'
import { defineTemplate, isLibraryOwnedTemplateDefinition } from './definition.js'
import { InvalidCallableScopeError } from './callableScope.js'
import { checkContract, GraphTemplateManifestSchema } from './graphContracts.js'
import {
  cloneTemplateSummaries,
  templateCatalogManifestDigest,
  templateManifestDigest,
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

  for (const forbidden of [...new Set(policy?.forbiddenSubstrings ?? [])].sort(compareCodeUnits)) {
    if (forbidden.length === 0) continue;
    allOf.push({ not: { pattern: escapeRegExpLiteral(forbidden) } });
  }

  for (const pattern of [...new Set(policy?.forbiddenPatterns ?? [])].sort(compareCodeUnits)) {
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

interface PlannerSchemaResourceContext {
  readonly contractDigest: string;
  readonly inputPath: string;
  readonly resources: Map<string, Record<string, unknown>> | undefined;
}

function plannerSchemaSafePath(inputPath: string): string {
  return [...inputPath]
    .map(character => /^[A-Za-z0-9._-]$/u.test(character)
      ? character
      : `_${character.codePointAt(0)!.toString(16)}_`)
    .join("");
}

function plannerSchemaResourceId(context: PlannerSchemaResourceContext): string {
  return `https://schemas.synthesize-regions.invalid/planner/${context.contractDigest}/${plannerSchemaSafePath(context.inputPath)}`;
}

function plannerSchemaResourceKey(context: PlannerSchemaResourceContext): string {
  return `${context.contractDigest}_${plannerSchemaSafePath(context.inputPath)}`;
}

function plannerSchemaResourceReference(context: PlannerSchemaResourceContext): string {
  return `#/$defs/plannerSchemas/${plannerSchemaResourceKey(context)}`;
}

function plannerSchemaResource(portSchema: NonNullable<Extract<InputPort, { kind: "literal" }>["schema"]>, id: string): Record<string, unknown> {
  const resource = schemaWithResourceId(portSchema, id);
  // Ajv recursively resolves an embedded resource whose root is itself a
  // `$ref`. Express the same conjunction through allOf so the generated `$id`
  // remains a stable resource boundary without triggering that resolver loop.
  if (typeof resource.$ref !== "string") return resource;
  const { $ref, allOf, ...rest } = resource;
  return {
    ...rest,
    allOf: [
      { $ref },
      ...(Array.isArray(allOf) ? allOf : [])
    ]
  };
}

function inputSchemaForPort(
  port: InputPort,
  context: PlannerSchemaResourceContext
): Record<string, unknown> {
  switch (port.kind) {
    case "literal":
      if (port.schema !== undefined && context.resources !== undefined) {
        const resourceId = plannerSchemaResourceId(context);
        context.resources.set(plannerSchemaResourceKey(context), plannerSchemaResource(port.schema, resourceId));
      }
      return {
        type: "object",
        additionalProperties: false,
        required: ["kind", "value"],
        properties: {
          kind: { const: "literal" },
          value: port.schema === undefined
            ? true
            : context.resources === undefined
              ? plannerSchemaResource(port.schema, plannerSchemaResourceId(context))
              : { $ref: plannerSchemaResourceReference(context) }
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
        anyOf: port.options.map((option, index) => inputSchemaForPort(option, {
          ...context,
          inputPath: `${context.inputPath}.options[${index}]`
        }))
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
      schema: { $ref: "#/$defs/supportedJsonSchema" }
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
      schema: { $ref: "#/$defs/supportedJsonSchema" }
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
      typeArguments: {
        type: "object",
        additionalProperties: { $ref: "#/$defs/typeDescriptor" }
      },
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
    supportedJsonSchema: JSON.parse(JSON.stringify(SupportedJsonSchemaSchema)) as Record<string, unknown>,
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
  return graphTemplateDefinitionToNodeSchemaWithResources(template);
}

function graphTemplateDefinitionToNodeSchemaWithResources(
  template: GraphTemplateDefinition<any, string>,
  resources?: Map<string, Record<string, unknown>>,
  requireTemplateInputs = true
): Record<string, unknown> {
  const inputEntries = Object.entries(template.inputs) as Array<[string, InputPort]>;
  const contractDigest = templateSummaryContractDigest([template.summary()]);
  const inputProperties = Object.fromEntries(
    inputEntries.map(([key, port]) => [key, inputSchemaForPort(port, {
      contractDigest,
      inputPath: `inputs.${key}`,
      resources
    })])
  );
  const requiredInputs = inputEntries
    .filter(([, port]) => portIsRequired(port))
    .map(([key]) => key);
  const typeParameterNames = Object.keys(template.typeParameters ?? {}).sort();
  const requiresTypeArguments = typeParameterNames.length > 0;

  return {
    title: `${template.modelId} SynthesisNode`,
    ...(template.description ? { description: template.description } : {}),
    type: "object",
    additionalProperties: false,
    required: ["id", "templateId", ...(requiresTypeArguments ? ["typeArguments"] : []), "inputs"],
    properties: {
      id: { type: "string" },
      templateId: { const: template.modelId },
      ...(requiresTypeArguments ? {
        typeArguments: {
          type: "object",
          additionalProperties: false,
          required: typeParameterNames,
          properties: Object.fromEntries(typeParameterNames.map(name => [
            name,
            { $ref: "#/$defs/typeDescriptor" }
          ]))
        }
      } : {}),
      inputs: {
        type: "object",
        additionalProperties: false,
        required: requireTemplateInputs ? requiredInputs : [],
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
  const resources = new Map<string, Record<string, unknown>>();
  const nodeSchema = graphTemplateDefinitionToNodeSchemaWithResources(template, resources);
  return {
    $schema: JSON_SCHEMA_URI,
    ...nodeSchema,
    $defs: {
      ...sharedGraphSchemaDefs(nodeSchema),
      plannerSchemas: Object.fromEntries(
        resources.entries()
      )
    }
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
  return templateRegistryToGraphJsonSchema(registry, false);
}

/**
 * Build a catalog-specific schema for repairable partial graphs.
 *
 * Supplied inputs remain catalog-checked, while required template inputs may
 * be omitted and reference/final IDs may remain dangling for graph repair.
 */
export function templateRegistryToPartialSynthesisGraphJsonSchema(
  registry: TemplateCatalogView
): Record<string, unknown> {
  return templateRegistryToGraphJsonSchema(registry, true);
}

function templateRegistryToGraphJsonSchema(
  registry: TemplateCatalogView,
  partial: boolean
): Record<string, unknown> {
  const templates = registry.list();
  const resources = new Map<string, Record<string, unknown>>();
  const templateNodeSchemaEntries = templates.map((template, index) => [
    `template${index}`,
    graphTemplateDefinitionToNodeSchemaWithResources(template, resources, !partial)
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
        minItems: partial ? 0 : 1,
        items: { $ref: "#/$defs/synthesisNode" }
      },
      finalNodeId: { type: "string" },
      goal: { $ref: "#/$defs/synthesisGoal" }
    },
    $defs: {
      ...sharedGraphSchemaDefs(synthesisNodeSchema),
      templateNodes: Object.fromEntries(templateNodeSchemaEntries),
      plannerSchemas: Object.fromEntries(
        resources.entries()
      )
    }
  };
}

/** Alias with the shorter name used by callers that already work in registry scope. */
export const registryToGraphJsonSchema = templateRegistryToSynthesisGraphJsonSchema;
export const registryToPartialGraphJsonSchema = templateRegistryToPartialSynthesisGraphJsonSchema;

export function defineTemplateCatalog<const T extends readonly GraphTemplateDefinition<any, string, any>[]>(
  templates: StrictTemplateCatalog<T>
): T {
  createCatalogState(templates);
  return templates;
}

interface CatalogState {
  readonly templates: Map<string, GraphTemplateDefinition<any, string>>;
  readonly summaries: TemplateSummary[];
  readonly contractDigest: string;
  readonly manifestDigest: string;
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
  const forgedDiagnostics = templates.flatMap((template, index) =>
    isLibraryOwnedTemplateDefinition(template) ? [] : [{
      origin: synthesisDiagnosticOriginForCode("UntrustedTemplateDefinition"),
      stage: "template" as const,
      code: "UntrustedTemplateDefinition",
      severity: "error" as const,
      message: "Template registries accept only definitions compiled from declarative manifests by defineTemplate().",
      path: `templates[${index}]`,
      actual: typeof template === 'object' && template !== null ? Object.keys(template) : template
    }]
  );
  if (forgedDiagnostics.length > 0) throw new TemplateCatalogValidationError(forgedDiagnostics);
  assertTemplateCatalogValid(templates);
  const sortedTemplates = [...templates].sort(compareTemplates);
  let summaries: TemplateSummary[];
  let contractDigest: string;
  let manifestDigest: string;
  try {
    summaries = cloneTemplateSummaries(sortedTemplates.map(template => template.summary()));
    contractDigest = templateSummaryContractDigest(summaries);
    const invalidManifestDigests = sortedTemplates.flatMap((template, index) => {
      const expected = templateManifestDigest(template);
      return template.manifestDigest === expected ? [] : [{
        origin: synthesisDiagnosticOriginForCode("TemplateManifestDigestMismatch"),
        stage: "template" as const,
        code: "TemplateManifestDigestMismatch",
        severity: "error" as const,
        message: `Template ${template.modelId} manifest digest does not match its source and contract.`,
        templateId: template.modelId,
        path: `templates[${index}].manifestDigest`,
        expected,
        actual: template.manifestDigest
      }];
    });
    if (invalidManifestDigests.length > 0) {
      throw new TemplateCatalogValidationError(invalidManifestDigests);
    }
    manifestDigest = templateCatalogManifestDigest(sortedTemplates);
  } catch (error) {
    if (error instanceof TemplateCatalogValidationError) throw error;
    throw new TemplateCatalogValidationError([{
      origin: synthesisDiagnosticOriginForCode("CatalogContractNotSerializable"),
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
    contractDigest,
    manifestDigest
  };
}

/** Compile and validate JSON-safe manifests into one captured template registry. */
export function createTemplateRegistryFromManifests(
  manifests: readonly import('./graphTypes.js').GraphTemplateManifest[]
): TemplateRegistry {
  const definitions: GraphTemplateDefinition<any, string>[] = [];
  const diagnostics: import('./graphTypes.js').SynthesisDiagnostic[] = [];
  for (const [index, manifest] of manifests.entries()) {
    if (!checkContract(GraphTemplateManifestSchema, manifest)) {
      diagnostics.push({
        origin: synthesisDiagnosticOriginForCode('InvalidTemplateManifest'),
        stage: 'template', code: 'InvalidTemplateManifest', severity: 'error',
        message: 'Template manifest does not match the closed declarative manifest contract.',
        path: `manifests[${index}]`, actual: manifest
      });
      continue;
    }
    try {
      definitions.push(defineTemplate(manifest));
    } catch (error) {
      if (error instanceof InvalidCallableScopeError) {
        diagnostics.push(...error.issues.map(issue => ({
          origin: synthesisDiagnosticOriginForCode(issue.code),
          stage: 'template' as const,
          code: issue.code,
          severity: 'error' as const,
          message: issue.message,
          templateId: manifest.modelId,
          path: `manifests[${index}].${issue.path}`,
          ...(issue.expected === undefined ? {} : { expected: issue.expected }),
          ...(issue.actual === undefined ? {} : { actual: issue.actual })
        })));
        continue;
      }
      diagnostics.push({
        origin: synthesisDiagnosticOriginForCode('InvalidTemplateManifestSource'),
        stage: 'template', code: 'InvalidTemplateManifestSource', severity: 'error',
        message: error instanceof Error ? error.message : String(error),
        templateId: manifest.modelId, path: `manifests[${index}].source`
      });
    }
  }
  if (diagnostics.length > 0) throw new TemplateCatalogValidationError(diagnostics);
  return createTemplateRegistry(definitions);
}

function snapshotFromState(state: CatalogState): TemplateRegistrySnapshot {
  const templates = new Map(state.templates);
  const summaries = cloneTemplateSummaries(state.summaries);
  const snapshot: TemplateRegistrySnapshot = {
    contractDigest: state.contractDigest,
    manifestDigest: state.manifestDigest,
    get(templateId: string) {
      return templates.get(templateId);
    },
    list() {
      return [...templates.values()];
    },
    summaries() {
      return cloneTemplateSummaries(summaries);
    }
  };
  brandTemplateCatalogView(snapshot);
  return Object.freeze(snapshot);
}

export function createTemplateRegistry(): TemplateRegistry;
export function createTemplateRegistry<
  const T extends readonly GraphTemplateDefinition<any, string, any>[]
>(initialTemplates: StrictTemplateCatalog<T>): TemplateRegistry;
export function createTemplateRegistry(
  initialTemplates: readonly GraphTemplateDefinition<any, string>[] = []
): TemplateRegistry {
  let state = createCatalogState(initialTemplates);

  const registry: TemplateRegistry = {
    get contractDigest() {
      return state.contractDigest;
    },

    get manifestDigest() {
      return state.manifestDigest;
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
          origin: synthesisDiagnosticOriginForCode("UnknownTemplateReplacement"),
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

  // The facade remains mutable through its closure-backed methods, while
  // freezing its properties prevents callers from replacing snapshot/list/get
  // with executable structural impostors after authenticity has been checked.
  brandTemplateCatalogView(registry);
  return Object.freeze(registry);
}
