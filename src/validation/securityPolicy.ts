import { Node, SyntaxKind, ts, type SourceFile } from "ts-morph";
import { SecurityPolicyViolationError } from "../core/errors.js";
import type { SecurityPolicyOptions } from "../core/types.js";

/**
 * Conservative defaults for raw-code replacements.
 */
export const defaultSecurityPolicy: Required<SecurityPolicyOptions> = {
  forbidImports: true,
  forbidDynamicImport: true,
  forbidEval: true,
  forbidNewFunction: true,
  forbidProcessAccess: true,
  forbidGlobalThis: true,
  forbidRequire: true
};

/**
 * Merge caller overrides with the package defaults.
 */
export function resolveSecurityPolicy(policy: SecurityPolicyOptions | undefined): Required<SecurityPolicyOptions> {
  return { ...defaultSecurityPolicy, ...(policy ?? {}) };
}

/**
 * Walk parsed raw replacement code and reject configured high-risk constructs.
 */
export function enforceSecurityPolicy(
  sourceFile: SourceFile,
  policyOptions: SecurityPolicyOptions | undefined,
  metadata: { id?: string; bodyText?: string } = {}
): void {
  const policy = resolveSecurityPolicy(policyOptions);

  sourceFile.forEachDescendant(node => {
    if (policy.forbidImports && isStaticImport(node)) {
      violation("Static import syntax is forbidden by the security policy.", node, metadata);
    }

    if (policy.forbidDynamicImport && isDynamicImport(node)) {
      violation("Dynamic import() is forbidden by the security policy.", node, metadata);
    }

    if (policy.forbidEval && isNamedCall(node, "eval")) {
      violation("eval() is forbidden by the security policy.", node, metadata);
    }

    if (policy.forbidNewFunction && isNewFunction(node)) {
      violation("new Function() is forbidden by the security policy.", node, metadata);
    }

    if (policy.forbidProcessAccess && isIdentifier(node, "process")) {
      violation("process access is forbidden by the security policy.", node, metadata);
    }

    if (policy.forbidGlobalThis && isIdentifier(node, "globalThis")) {
      violation("globalThis access is forbidden by the security policy.", node, metadata);
    }

    if (policy.forbidRequire && (isNamedCall(node, "require") || isIdentifier(node, "require"))) {
      violation("require access is forbidden by the security policy.", node, metadata);
    }

    return undefined;
  });
}

function isStaticImport(node: Node): boolean {
  const kind = node.getKind();
  return kind === SyntaxKind.ImportDeclaration || kind === SyntaxKind.ImportEqualsDeclaration;
}

function isDynamicImport(node: Node): boolean {
  if (!Node.isCallExpression(node)) return false;
  return node.getExpression().getKind() === SyntaxKind.ImportKeyword;
}

function isNamedCall(node: Node, name: string): boolean {
  if (!Node.isCallExpression(node)) return false;
  const expression = node.getExpression();
  return Node.isIdentifier(expression) && expression.getText() === name;
}

function isNewFunction(node: Node): boolean {
  if (!Node.isNewExpression(node)) return false;
  const expression = node.getExpression();
  return Node.isIdentifier(expression) && expression.getText() === "Function";
}

function isIdentifier(node: Node, name: string): boolean {
  return ts.isIdentifier(node.compilerNode) && node.getText() === name;
}

function violation(message: string, node: Node, metadata: { id?: string; bodyText?: string }): never {
  throw new SecurityPolicyViolationError(message, {
    ...metadata,
    start: node.getStart(),
    end: node.getEnd()
  });
}
