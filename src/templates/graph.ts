import type {
  FragmentInputPort,
  GeneratedFragment,
  GraphCompilationResult,
  GraphCompileOptions,
  GraphTemplateDefinition,
  GraphNormalizationResult,
  InputPort,
  NormalizedSynthesisInput,
  RawCodeInputPort,
  ResolvedGraphInput,
  SynthesisDiagnostic,
  SynthesisGraph,
  SynthesisInput,
  SynthesisNode,
  TemplateRegistry
} from "./graphTypes.js";
import { isTypeCompatible, portIsRequired, validateJsonSchemaSubset } from "./compatibility.js";

function errorDiagnostic(diagnostic: Omit<SynthesisDiagnostic, "severity">): SynthesisDiagnostic {
  return { ...diagnostic, severity: "error" };
}

function isRefShorthand(input: SynthesisInput): input is { "$ref": string } {
  return typeof input === "object" && input !== null && "$ref" in input && typeof input.$ref === "string";
}

export function normalizeSynthesisInput(input: SynthesisInput): Exclude<SynthesisInput, { "$ref": string }> {
  return isRefShorthand(input) ? { kind: "ref", nodeId: input.$ref } : input;
}

export function normalizeSynthesisGraph(graph: SynthesisGraph): GraphNormalizationResult {
  const nodes: SynthesisNode[] = [];

  function normalizeNode(node: SynthesisNode): SynthesisNode {
    const inputs: Record<string, NormalizedSynthesisInput> = {};

    for (const [inputName, input] of Object.entries(node.inputs)) {
      const normalized = normalizeSynthesisInput(input);
      if (normalized.kind === "inline") {
        const inlineNode = normalizeNode(normalized.node);
        nodes.push(inlineNode);
        inputs[inputName] = { kind: "ref", nodeId: inlineNode.id };
      } else {
        inputs[inputName] = normalized;
      }
    }

    return {
      id: node.id,
      templateId: node.templateId,
      inputs
    };
  }

  for (const node of graph.nodes) {
    nodes.push(normalizeNode(node));
  }

  return {
    graph: {
      nodes,
      finalNodeId: graph.finalNodeId,
      ...(graph.goal ? { goal: graph.goal } : {})
    }
  };
}

function inputDependencies(input: SynthesisInput): string[] {
  const normalized = normalizeSynthesisInput(input);
  if (normalized.kind === "ref") return [normalized.nodeId];
  if (normalized.kind === "inline") return Object.values(normalized.node.inputs).flatMap(inputDependencies);
  return [];
}

function inputPortOptions(port: InputPort): InputPort[] {
  return port.kind === "union" ? port.options : [port];
}

function templateInputs(template: GraphTemplateDefinition): Record<string, InputPort> {
  return template.inputs;
}

function validateStaticGraph(
  graph: SynthesisGraph,
  registry: TemplateRegistry
): { diagnostics: SynthesisDiagnostic[]; nodesById: Map<string, SynthesisNode> } {
  const diagnostics: SynthesisDiagnostic[] = [];
  const nodesById = new Map<string, SynthesisNode>();
  const seen = new Set<string>();

  for (const node of graph.nodes) {
    if (seen.has(node.id)) {
      diagnostics.push(errorDiagnostic({
        stage: "graph",
        code: "DuplicateNodeId",
        message: `Duplicate node id ${node.id}.`,
        nodeId: node.id,
        path: `nodes.${node.id}`
      }));
      continue;
    }
    seen.add(node.id);
    nodesById.set(node.id, node);
  }

  if (!nodesById.has(graph.finalNodeId)) {
    diagnostics.push(errorDiagnostic({
      stage: "graph",
      code: "UnknownFinalNode",
      message: `Final node ${graph.finalNodeId} does not exist.`,
      path: "finalNodeId",
      actual: graph.finalNodeId
    }));
  }

  for (const node of graph.nodes) {
    const template = registry.get(node.templateId);
    if (!template) {
      diagnostics.push(errorDiagnostic({
        stage: "template",
        code: "UnknownTemplate",
        message: `Unknown template ${node.templateId}.`,
        nodeId: node.id,
        templateId: node.templateId,
        path: `nodes.${node.id}.templateId`
      }));
      continue;
    }

    const ports = templateInputs(template);
    for (const [inputName, port] of Object.entries(ports)) {
      if (portIsRequired(port) && !Object.prototype.hasOwnProperty.call(node.inputs, inputName)) {
        diagnostics.push(errorDiagnostic({
          stage: "input",
          code: "MissingRequiredInput",
          message: `Missing required input ${inputName}.`,
          nodeId: node.id,
          templateId: node.templateId,
          inputName,
          path: `nodes.${node.id}.inputs.${inputName}`,
          expected: port
        }));
      }
    }

    for (const inputName of Object.keys(node.inputs)) {
      if (!Object.prototype.hasOwnProperty.call(ports, inputName)) {
        diagnostics.push(errorDiagnostic({
          stage: "input",
          code: "UnknownInput",
          message: `Unknown input ${inputName}.`,
          nodeId: node.id,
          templateId: node.templateId,
          inputName,
          path: `nodes.${node.id}.inputs.${inputName}`
        }));
      }
    }

    for (const [inputName, input] of Object.entries(node.inputs)) {
      for (const dependency of inputDependencies(input)) {
        if (!nodesById.has(dependency)) {
          diagnostics.push(errorDiagnostic({
            stage: "graph",
            code: "UnknownReference",
            message: `Input ${inputName} references unknown node ${dependency}.`,
            nodeId: node.id,
            templateId: node.templateId,
            inputName,
            path: `nodes.${node.id}.inputs.${inputName}`,
            actual: dependency
          }));
        }
      }
    }
  }

  diagnostics.push(...detectCycles(nodesById));
  return { diagnostics, nodesById };
}

function detectCycles(nodesById: Map<string, SynthesisNode>): SynthesisDiagnostic[] {
  const diagnostics: SynthesisDiagnostic[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(nodeId: string, path: string[]): void {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      diagnostics.push(errorDiagnostic({
        stage: "graph",
        code: "CycleDetected",
        message: `Cycle detected: ${[...path, nodeId].join(" -> ")}.`,
        nodeId,
        path: [...path, nodeId].join(" -> ")
      }));
      return;
    }

    const node = nodesById.get(nodeId);
    if (!node) return;
    visiting.add(nodeId);
    for (const dependency of Object.values(node.inputs).flatMap(inputDependencies)) {
      visit(dependency, [...path, nodeId]);
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  for (const nodeId of nodesById.keys()) {
    visit(nodeId, []);
  }

  return diagnostics;
}

function fragmentCompatible(
  port: FragmentInputPort,
  fragment: GeneratedFragment,
  node: SynthesisNode,
  inputName: string
): SynthesisDiagnostic | undefined {
  if (port.accepts.outputKind !== fragment.kind) {
    return errorDiagnostic({
      stage: "port",
      code: "IncompatibleFragmentKind",
      message: `Input ${inputName} expected ${port.accepts.outputKind} but received ${fragment.kind}.`,
      nodeId: node.id,
      templateId: node.templateId,
      inputName,
      expected: port.accepts.outputKind,
      actual: fragment.kind
    });
  }

  if (!isTypeCompatible(port.accepts.type, fragment.type)) {
    return errorDiagnostic({
      stage: "type",
      code: "IncompatibleFragmentType",
      message: `Input ${inputName} received an incompatible fragment type.`,
      nodeId: node.id,
      templateId: node.templateId,
      inputName,
      expected: port.accepts.type,
      actual: fragment.type
    });
  }

  if (port.accepts.sourceModelIds && !port.accepts.sourceModelIds.includes(fragment.source.templateId)) {
    return errorDiagnostic({
      stage: "port",
      code: "IncompatibleFragmentSource",
      message: `Input ${inputName} does not accept fragments from ${fragment.source.templateId}.`,
      nodeId: node.id,
      templateId: node.templateId,
      inputName,
      expected: port.accepts.sourceModelIds,
      actual: fragment.source.templateId
    });
  }

  return undefined;
}

function rawCodeCompatible(port: RawCodeInputPort, code: string, node: SynthesisNode, inputName: string): SynthesisDiagnostic | undefined {
  if (code.trim().length === 0) {
    return errorDiagnostic({
      stage: "policy",
      code: "RawCodeRejected",
      message: `Raw code input ${inputName} must not be empty.`,
      nodeId: node.id,
      templateId: node.templateId,
      inputName
    });
  }

  const policy = port.policy;
  if (!policy) return undefined;

  if (policy.maxLength !== undefined && code.length > policy.maxLength) {
    return errorDiagnostic({
      stage: "policy",
      code: "RawCodeRejected",
      message: `Raw code input ${inputName} exceeds the maximum length of ${policy.maxLength}.`,
      nodeId: node.id,
      templateId: node.templateId,
      inputName,
      expected: { maxLength: policy.maxLength },
      actual: { length: code.length },
      repairHints: [{ kind: "shortenRawCode", message: "Use a shorter raw-code expression or a structured template input." }]
    });
  }

  if (policy.allowNewlines === false && /\r|\n/u.test(code)) {
    return errorDiagnostic({
      stage: "policy",
      code: "RawCodeRejected",
      message: `Raw code input ${inputName} must not contain newlines.`,
      nodeId: node.id,
      templateId: node.templateId,
      inputName,
      expected: { allowNewlines: false },
      actual: code,
      repairHints: [{ kind: "removeNewlines", message: "Submit the raw code as a single-line fragment." }]
    });
  }

  for (const forbidden of policy.forbiddenSubstrings ?? []) {
    if (forbidden.length > 0 && code.includes(forbidden)) {
      return errorDiagnostic({
        stage: "policy",
        code: "RawCodeRejected",
        message: `Raw code input ${inputName} contains a forbidden substring.`,
        nodeId: node.id,
        templateId: node.templateId,
        inputName,
        expected: { forbiddenSubstrings: policy.forbiddenSubstrings },
        actual: forbidden,
        repairHints: [{ kind: "removeForbiddenSubstring", message: `Remove ${forbidden} from the raw-code input.` }]
      });
    }
  }

  for (const pattern of policy.forbiddenPatterns ?? []) {
    let regexp: RegExp;
    try {
      regexp = new RegExp(pattern, "u");
    } catch (error) {
      return errorDiagnostic({
        stage: "policy",
        code: "InvalidRawCodePolicy",
        message: `Raw code policy contains an invalid forbidden pattern: ${pattern}.`,
        nodeId: node.id,
        templateId: node.templateId,
        inputName,
        expected: "valid regular expression pattern",
        actual: error
      });
    }

    if (regexp.test(code)) {
      return errorDiagnostic({
        stage: "policy",
        code: "RawCodeRejected",
        message: `Raw code input ${inputName} matches a forbidden pattern.`,
        nodeId: node.id,
        templateId: node.templateId,
        inputName,
        expected: { forbiddenPatterns: policy.forbiddenPatterns },
        actual: pattern,
        repairHints: [{ kind: "avoidForbiddenPattern", message: `Avoid code matching /${pattern}/u.` }]
      });
    }
  }

  return undefined;
}

function literalCompatible(port: InputPort, value: unknown, node: SynthesisNode, inputName: string): SynthesisDiagnostic | undefined {
  if (port.kind !== "literal") return undefined;
  const result = validateJsonSchemaSubset(value, port.schema);
  if (result.ok) return undefined;

  return errorDiagnostic({
    stage: "input",
    code: "InvalidLiteralInput",
    message: result.message,
    nodeId: node.id,
    templateId: node.templateId,
    inputName,
    path: result.path,
    expected: result.expected,
    actual: result.actual
  });
}

function validateFinalGoal(graph: SynthesisGraph, finalFragment: GeneratedFragment): SynthesisDiagnostic[] {
  const goal = graph.goal;
  if (!goal) return [];
  const diagnostics: SynthesisDiagnostic[] = [];

  if (goal.outputKind && goal.outputKind !== finalFragment.kind) {
    diagnostics.push(errorDiagnostic({
      stage: "graph",
      code: "FinalGoalKindMismatch",
      message: `Final fragment kind ${finalFragment.kind} does not satisfy goal ${goal.outputKind}.`,
      path: "goal.outputKind",
      expected: goal.outputKind,
      actual: finalFragment.kind
    }));
  }

  if (!isTypeCompatible(goal.type, finalFragment.type)) {
    diagnostics.push(errorDiagnostic({
      stage: "type",
      code: "FinalGoalTypeMismatch",
      message: "Final fragment type does not satisfy graph goal.",
      path: "goal.type",
      expected: goal.type,
      actual: finalFragment.type
    }));
  }

  if (!isTypeCompatible(goal.schema ? { schema: goal.schema } : undefined, finalFragment.schema ? { schema: finalFragment.schema } : undefined)) {
    diagnostics.push(errorDiagnostic({
      stage: "type",
      code: "FinalGoalSchemaMismatch",
      message: "Final fragment schema does not satisfy graph goal.",
      path: "goal.schema",
      expected: goal.schema,
      actual: finalFragment.schema
    }));
  }

  return diagnostics;
}

export function compileGraph(
  graph: SynthesisGraph,
  registry: TemplateRegistry,
  options: GraphCompileOptions = {}
): GraphCompilationResult {
  const normalized = normalizeSynthesisGraph(graph).graph;
  const { diagnostics, nodesById } = validateStaticGraph(normalized, registry);
  if (diagnostics.some(diagnostic => diagnostic.severity === "error")) {
    return { ok: false, diagnostics };
  }

  const fragments = new Map<string, GeneratedFragment>();
  const executing = new Set<string>();

  function executeNode(nodeId: string): GeneratedFragment | undefined {
    const existing = fragments.get(nodeId);
    if (existing) return existing;

    const node = nodesById.get(nodeId);
    if (!node) return undefined;
    const template = registry.get(node.templateId);
    if (!template) return undefined;
    if (executing.has(nodeId)) return undefined;
    executing.add(nodeId);

    const resolvedInputs: Record<string, ResolvedGraphInput> = {};

    for (const [inputName, rawInput] of Object.entries(node.inputs)) {
      const port = template.inputs[inputName];
      if (!port) continue;
      const input = normalizeSynthesisInput(rawInput);

      let resolved: ResolvedGraphInput | undefined;
      let lastDiagnostic: SynthesisDiagnostic | undefined;

      for (const option of inputPortOptions(port)) {
        if (option.kind === "literal" && input.kind === "literal") {
          lastDiagnostic = literalCompatible(option, input.value, node, inputName);
          if (!lastDiagnostic) {
            resolved = { kind: "literal", value: input.value, port: option };
            break;
          }
        }

        if (option.kind === "rawCode" && input.kind === "rawCode") {
          lastDiagnostic = rawCodeCompatible(option, input.code, node, inputName);
          if (!lastDiagnostic) {
            resolved = { kind: "rawCode", code: input.code, port: option };
            break;
          }
        }

        if (option.kind === "fragment" && input.kind === "ref") {
          const fragment = executeNode(input.nodeId);

          if (!fragment) continue;
          lastDiagnostic = fragmentCompatible(option, fragment, node, inputName);
          if (!lastDiagnostic) {
            resolved = { kind: "fragment", fragment, port: option };
            break;
          }
        }
      }

      if (!resolved) {
        diagnostics.push(lastDiagnostic ?? errorDiagnostic({
          stage: "port",
          code: "IncompatibleInputKind",
          message: `Input ${inputName} is not compatible with its port.`,
          nodeId: node.id,
          templateId: node.templateId,
          inputName,
          expected: port,
          actual: input
        }));
        continue;
      }

      resolvedInputs[inputName] = resolved;
    }

    if (diagnostics.some(diagnostic => diagnostic.severity === "error")) {
      executing.delete(nodeId);
      return undefined;
    }

    try {
      const fragment = template.invoke({ nodeId: node.id, inputs: resolvedInputs, options });
      fragments.set(node.id, fragment);
      executing.delete(nodeId);
      return fragment;
    } catch (error) {
      diagnostics.push(errorDiagnostic({
        stage: "ast",
        code: "GeneratedTypeScriptInvalid",
        message: error instanceof Error ? error.message : String(error),
        nodeId: node.id,
        templateId: node.templateId,
        actual: error
      }));
      executing.delete(nodeId);
      return undefined;
    }
  }

  const finalFragment = executeNode(normalized.finalNodeId);
  if (finalFragment) {
    diagnostics.push(...validateFinalGoal(normalized, finalFragment));
  }

  if (!finalFragment || diagnostics.some(diagnostic => diagnostic.severity === "error")) {
    return { ok: false, diagnostics, partialFragments: fragments };
  }

  return {
    ok: true,
    finalFragment,
    fragments,
    diagnostics
  };
}
