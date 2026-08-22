import {
  EmptyManyReplacementError,
  InvalidReplacementKindError,
  InvalidReplacementSyntaxError,
  MissingReplacementError,
  UnusedReplacementError
} from "../core/errors.js";
import { enforceSecurityPolicy } from "../validation/securityPolicy.js";
import { isFragmentCollectionReplacement } from "./collection.js";
import {
  diagnosticMessages,
  isValidIdentifierName,
  validateIdentifierName,
  validateRawTypedSyntax,
  validateRawTypedSyntaxCollection
} from "../validation/ast.js";
import { createAnalysisSourceFile } from "../validation/analysisContext.js";
import {
  expressionReplacementKinds,
  type GenerateOptions,
  type MarkerExpectedKind,
  type Replacement,
  type ReplacementExpression,
  type ReplacementMap,
  type ReplacementRegion,
  type ReplacementValue
} from "../core/types.js";

/**
 * A text edit that replaces one complete marker region, including both marker
 * comments.
 */
export interface PlannedReplacementEdit {
  start: number;
  end: number;
  text: string;
  region: ReplacementRegion;
}

/**
 * Build validated text edits for all discovered regions.
 *
 * This function checks missing and unused IDs before serializing so callers get
 * replacement-map errors before any output text is produced.
 */
export function buildReplacementEdits(
  regions: ReplacementRegion[],
  replacements: ReplacementMap,
  options: GenerateOptions = {},
  sourceText?: string
): PlannedReplacementEdit[] {
  const usedReplacementIds = new Set<string>();

  for (const region of regions) {
    if (!Object.prototype.hasOwnProperty.call(replacements, region.id)) {
      throw new MissingReplacementError(`Missing replacement for id=${region.id}.`, {
        id: region.id,
        expectedKind: region.effectiveType,
        arity: region.arity,
        line: region.line,
        column: region.column,
        start: region.startCommentStart,
        end: region.endCommentEnd
      });
    }
    usedReplacementIds.add(region.id);
  }

  if (!options.allowUnusedReplacements) {
    for (const key of Object.keys(replacements)) {
      if (!usedReplacementIds.has(key)) {
        throw new UnusedReplacementError(`Unused replacement id=${key}.`, { id: key });
      }
    }
  }

  return regions.map(region => {
    const value = replacements[region.id] as ReplacementValue;
    const serialized = serializeReplacementValueForRegion(region, value, options);
    const text = sourceText ? applyLineIndentation(serialized, region, sourceText) : serialized;
    return {
      start: region.startCommentStart,
      end: region.endCommentEnd,
      text,
      region
    };
  });
}

/**
 * Validate and serialize a replacement value for one marker region.
 */
export function serializeReplacementValueForRegion(
  region: ReplacementRegion,
  value: ReplacementValue,
  options: GenerateOptions = {}
): string {
  if (region.effectiveType === "sourceFile" && region.arity === "many") {
    throw new InvalidReplacementKindError("sourceFile[] regions are not supported; provide one complete sourceFile replacement.", {
      id: region.id,
      expectedKind: region.effectiveType,
      arity: region.arity,
      replacementKind: replacementKindOf(value)
    });
  }

  if (region.arity === "many") {
    if (!Array.isArray(value)) {
      throw new InvalidReplacementKindError(`Marker id=${region.id} expects an array replacement.`, {
        id: region.id,
        expectedKind: region.effectiveType,
        arity: region.arity,
        replacementKind: replacementKindOf(value)
      });
    }
    if (value.length === 0) {
      throw new EmptyManyReplacementError(`Marker id=${region.id} requires at least one replacement.`, {
        id: region.id,
        expectedKind: region.effectiveType,
        arity: region.arity
      });
    }
    for (const item of value) {
      validateSingleReplacementCompatibility(region.effectiveType, item, region, options);
    }
    return value.map(item => serializeReplacement(item, options, region)).join(separatorForMany(region.effectiveType));
  }

  if (Array.isArray(value)) {
    throw new InvalidReplacementKindError(`Marker id=${region.id} expects a single replacement.`, {
      id: region.id,
      expectedKind: region.effectiveType,
      arity: region.arity,
      replacementKind: "array"
    });
  }

  validateSingleReplacementCompatibility(region.effectiveType, value, region, options);
  return serializeReplacement(value, options, region);
}

function validateSingleReplacementCompatibility(
  expectedKind: MarkerExpectedKind,
  replacement: Replacement,
  region: ReplacementRegion,
  options: GenerateOptions
): void {
  if (!isCompatibleReplacement(expectedKind, replacement)) {
    throw new InvalidReplacementKindError(
      `Replacement kind ${replacement.kind} is not compatible with marker type ${expectedKind}.`,
      {
        id: region.id,
        expectedKind,
        arity: region.arity,
        replacementKind: replacement.kind,
        line: region.line,
        column: region.column,
        start: region.startCommentStart,
        end: region.endCommentEnd
      }
    );
  }

  validateReplacementSyntaxAndSecurity(replacement, options, region);
}

/**
 * Type guard for replacement variants that can appear inside expression-shaped
 * structured replacements.
 */
export function isExpressionReplacement(replacement: Replacement): replacement is ReplacementExpression {
  return expressionReplacementKinds.includes(replacement.kind as never);
}

/**
 * Check marker/replacement compatibility without validating raw code syntax.
 */
export function isCompatibleReplacement(expectedKind: MarkerExpectedKind, replacement: Replacement): boolean {
  switch (expectedKind) {
    case "identifier":
      return replacement.kind === "identifier";
    case "expression":
      return isExpressionReplacement(replacement);
    case "expressionSuffix":
      return replacement.kind === "expressionSuffix";
    case "statement":
      return replacement.kind === "statement";
    case "type": return replacement.kind === "type";
    case "typeMember": return replacement.kind === "typeMember";
    case "typeParameter": return replacement.kind === "typeParameter";
    case "parameter": return replacement.kind === "parameter";
    case "constructorParameter": return replacement.kind === "constructorParameter";
    case "heritageType": return replacement.kind === "heritageType";
    case "declaration": return replacement.kind === "declaration";
    case "classMember": return replacement.kind === "classMember";
    case "enumMember": return replacement.kind === "enumMember";
    case "importSpecifier": return replacement.kind === "importSpecifier";
    case "exportSpecifier": return replacement.kind === "exportSpecifier";
    case "sourceFile": return replacement.kind === "sourceFile";
    case "array":
      return replacement.kind === "array";
    case "object":
      return replacement.kind === "object";
    case "string":
      return replacement.kind === "string";
    case "number":
      return replacement.kind === "number";
    case "boolean":
      return replacement.kind === "boolean";
    case "null":
      return replacement.kind === "null";
    case "objectProperty":
      return replacement.kind === "objectProperty";
  }
}

function validateReplacementSyntaxAndSecurity(
  replacement: Replacement,
  options: GenerateOptions,
  region: ReplacementRegion
): void {
  const metadata = { id: region.id, expectedKind: region.effectiveType, arity: region.arity };

  switch (replacement.kind) {
    case "identifier":
      validateIdentifierName(replacement.name, { id: region.id });
      return;
    case "expression": {
      const sourceFile = createAnalysisSourceFile(options, `const __x = (${replacement.code});`, "__security_expression__.ts");
      const syntactic = diagnosticMessages(sourceFile).syntactic;
      if (syntactic.length > 0 || !sourceFile.getVariableDeclaration("__x")?.getInitializer()) {
        throw new InvalidReplacementSyntaxError("Invalid raw expression replacement syntax.", {
          id: region.id,
          bodyText: syntactic.join("\n") || replacement.code
        });
      }
      enforceSecurityPolicy(sourceFile, options.securityPolicy, { id: region.id, bodyText: replacement.code });
      return;
    }
    case "expressionSuffix": {
      const sourceFile = createAnalysisSourceFile(options, `const __x = __partialReceiver${replacement.code};`, "__security_expression_suffix__.ts");
      const syntactic = diagnosticMessages(sourceFile).syntactic;
      const trimmed = replacement.code.trim();
      if ((!trimmed.startsWith(".") && !trimmed.startsWith("?."))
        || syntactic.length > 0
        || !sourceFile.getVariableDeclaration("__x")?.getInitializer()) {
        throw new InvalidReplacementSyntaxError("Invalid raw expressionSuffix replacement syntax.", {
          id: region.id,
          bodyText: syntactic.join("\n") || replacement.code
        });
      }
      enforceSecurityPolicy(sourceFile, options.securityPolicy, { id: region.id, bodyText: replacement.code });
      return;
    }
    case "statement": {
      const sourceFile = createAnalysisSourceFile(options, `function __f() {\n${replacement.code}\n}`, "__security_statement__.ts");
      const syntactic = diagnosticMessages(sourceFile).syntactic;
      const requiresOneStatement = !isFragmentCollectionReplacement(replacement);
      if (syntactic.length > 0 || (requiresOneStatement && sourceFile.getFunction("__f")?.getStatements().length === 0)) {
        throw new InvalidReplacementSyntaxError("Invalid raw statement replacement syntax.", {
          id: region.id,
          bodyText: syntactic.join("\n") || replacement.code
        });
      }
      enforceSecurityPolicy(sourceFile, options.securityPolicy, { id: region.id, bodyText: replacement.code });
      return;
    }
    case "type":
    case "typeMember":
    case "typeParameter":
    case "heritageType":
    case "importSpecifier":
    case "exportSpecifier":
      if (isFragmentCollectionReplacement(replacement)) {
        validateRawTypedSyntaxCollection(replacement.kind, replacement.code, options, { id: region.id });
      } else {
        validateRawTypedSyntax(replacement.kind, replacement.code, options, { id: region.id });
      }
      return;
    case "parameter":
    case "constructorParameter":
    case "declaration":
    case "classMember":
    case "enumMember":
    case "sourceFile": {
      const sourceFile = isFragmentCollectionReplacement(replacement)
        ? validateRawTypedSyntaxCollection(replacement.kind, replacement.code, options, { id: region.id })
        : validateRawTypedSyntax(replacement.kind, replacement.code, options, { id: region.id });
      enforceSecurityPolicy(sourceFile, options.securityPolicy, { id: region.id, bodyText: replacement.code });
      return;
    }
    case "array":
      for (const element of replacement.elements) validateExpressionReplacement(element, options, region);
      return;
    case "object":
      for (const value of Object.values(replacement.properties)) validateExpressionReplacement(value, options, region);
      return;
    case "objectProperty":
      if (replacement.computed) {
        const sourceFile = createAnalysisSourceFile(options, `const __x = (${replacement.name});`, "__security_property_name__.ts");
        const syntactic = diagnosticMessages(sourceFile).syntactic;
        if (syntactic.length > 0 || !sourceFile.getVariableDeclaration("__x")?.getInitializer()) {
          throw new InvalidReplacementSyntaxError("Invalid raw expression replacement syntax.", {
            id: region.id,
            bodyText: syntactic.join("\n") || replacement.name
          });
        }
        enforceSecurityPolicy(sourceFile, options.securityPolicy, { id: region.id, bodyText: replacement.name });
      }
      validateExpressionReplacement(replacement.value, options, region);
      return;
    case "number":
      if (!Number.isFinite(replacement.value)) {
        throw new InvalidReplacementSyntaxError("number replacements must be finite.", {
          ...metadata,
          replacementKind: replacement.kind
        });
      }
      return;
    case "string":
    case "boolean":
    case "null":
      return;
  }
}

function validateExpressionReplacement(
  replacement: ReplacementExpression,
  options: GenerateOptions,
  region: ReplacementRegion
): void {
  validateReplacementSyntaxAndSecurity(replacement, options, region);
}

/**
 * Convert one already-compatible replacement object into TypeScript source.
 *
 * Compatibility, syntax, and security checks are performed by callers before
 * generation; this function is intentionally only a serializer.
 */
export function serializeReplacement(replacement: Replacement, options: GenerateOptions = {}, region?: ReplacementRegion): string {
  void options;
  void region;

  switch (replacement.kind) {
    case "identifier":
      return replacement.name;
    case "expression":
      return replacement.code;
    case "expressionSuffix":
      return replacement.code;
    case "statement":
    case "type":
    case "typeMember":
    case "typeParameter":
    case "parameter":
    case "constructorParameter":
    case "heritageType":
    case "declaration":
    case "classMember":
    case "enumMember":
    case "importSpecifier":
    case "exportSpecifier":
    case "sourceFile":
      return replacement.code;
    case "array":
      return `[${replacement.elements.map(element => serializeReplacement(element, options, region)).join(", ")}]`;
    case "object":
      return `{ ${Object.entries(replacement.properties)
        .map(([key, value]) => `${serializePropertyName(key)}: ${serializeReplacement(value, options, region)}`)
        .join(", ")} }`;
    case "objectProperty":
      return `${replacement.computed ? `[${replacement.name}]` : serializePropertyName(replacement.name)}: ${serializeReplacement(
        replacement.value,
        options,
        region
      )}`;
    case "string":
      return JSON.stringify(replacement.value);
    case "number":
      return String(replacement.value);
    case "boolean":
      return replacement.value ? "true" : "false";
    case "null":
      return "null";
  }
}

function serializePropertyName(name: string): string {
  return isValidIdentifierName(name) ? name : JSON.stringify(name);
}

function separatorForMany(expectedKind: MarkerExpectedKind): string {
  if (["statement", "typeMember", "declaration", "classMember"].includes(expectedKind)) return "\n";
  if (["objectProperty", "enumMember"].includes(expectedKind)) return ",\n";
  return ", ";
}

function replacementKindOf(value: ReplacementValue): string {
  return Array.isArray(value) ? "array" : value.kind;
}

function applyLineIndentation(text: string, region: ReplacementRegion, sourceText: string): string {
  if (!text.includes("\n")) return text;
  if (!["statement", "objectProperty", "typeMember", "declaration", "classMember", "enumMember"].includes(region.effectiveType)) return text;
  const lineStart = sourceText.lastIndexOf("\n", region.startCommentStart - 1) + 1;
  const prefix = sourceText.slice(lineStart, region.startCommentStart);
  const indent = prefix.match(/^[ \t]*/u)?.[0] ?? "";
  const lines = text.split("\n");
  return lines.map((line, index) => (index === 0 ? line : `${indent}${line}`)).join("\n");
}
