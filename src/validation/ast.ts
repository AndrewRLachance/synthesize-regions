import { Node, Project, ScriptKind, SyntaxKind, ts, type SourceFile } from "ts-morph";
import {
  FinalValidationError,
  InvalidIdentifierError,
  InvalidPlaceholderContextError,
  InvalidReplacementSyntaxError
} from "../core/errors.js";
import type { GenerateOptions, MarkerExpectedKind, ReplacementRegion } from "../core/types.js";

/**
 * Create the ts-morph project used for parsing and diagnostics.
 */
export function createProject(options: GenerateOptions = {}): Project {
  if (options.tsConfigFilePath) {
    return new Project({ tsConfigFilePath: options.tsConfigFilePath, skipAddingFilesFromTsConfig: true });
  }

  return new Project({
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      strict: true,
      skipLibCheck: true
    }
  });
}

/**
 * Create a TypeScript source file in a caller-provided project.
 */
export function createSourceFile(project: Project, sourceText: string, filePath = "__synthesize_regions__.ts"): SourceFile {
  return project.createSourceFile(filePath, sourceText, {
    overwrite: true,
    scriptKind: ScriptKind.TS
  });
}

/**
 * Collect syntactic diagnostics and, optionally, semantic diagnostics.
 */
export function diagnosticMessages(sourceFile: SourceFile, semantic = false): { syntactic: string[]; semantic?: string[] } {
  const project = sourceFile.getProject();
  const syntactic = project.getProgram().getSyntacticDiagnostics(sourceFile).map(diagnosticToString);
  if (!semantic) return { syntactic };
  return {
    syntactic,
    semantic: project.getProgram().getSemanticDiagnostics(sourceFile).map(diagnosticToString)
  };
}

function diagnosticToString(diagnostic: { getMessageText(): unknown; getStart(): number | undefined }): string {
  const start = diagnostic.getStart();
  const pos = start === undefined ? "" : ` at ${start}`;
  return `${String(diagnostic.getMessageText())}${pos}`;
}

/**
 * Throw when generated output fails final TypeScript validation.
 */
export function assertFinalValid(sourceFile: SourceFile, filePath?: string, semantic = false): void {
  const diagnostics = diagnosticMessages(sourceFile, semantic);
  const semanticDiagnostics = semantic ? diagnostics.semantic ?? [] : [];
  if (diagnostics.syntactic.length > 0 || semanticDiagnostics.length > 0) {
    throw new FinalValidationError("Generated TypeScript failed final validation.", {
      ...(filePath ? { filePath } : {}),
      bodyText: [...diagnostics.syntactic, ...semanticDiagnostics].join("\n")
    });
  }
}

function trimmedBodyRange(region: ReplacementRegion): { start: number; end: number } | undefined {
  const text = region.bodyText;
  const leading = text.match(/^\s*/u)?.[0].length ?? 0;
  const trailing = text.match(/\s*$/u)?.[0].length ?? 0;
  const start = region.bodyStart + leading;
  const end = region.bodyEnd - trailing;
  if (start >= end) return undefined;
  return { start, end };
}

function findSmallestNodeContaining(sourceFile: SourceFile, start: number, end: number): Node | undefined {
  let best: Node | undefined;
  sourceFile.forEachDescendant(node => {
    const nodeStart = node.getStart(false);
    const nodeEnd = node.getEnd();
    if (nodeStart <= start && nodeEnd >= end) {
      if (!best || node.getWidth() < best.getWidth()) best = node;
    }
    return undefined;
  });
  return best;
}

function findBestNodeForRegion(sourceFile: SourceFile, region: ReplacementRegion): Node | undefined {
  const range = trimmedBodyRange(region);
  if (!range) return undefined;
  let bestExact: Node | undefined;
  sourceFile.forEachDescendant(node => {
    const nodeStart = node.getStart(false);
    const nodeEnd = node.getEnd();
    if (nodeStart === range.start && nodeEnd === range.end) {
      if (!bestExact || node.getWidth() < bestExact.getWidth()) bestExact = node;
    }
    return undefined;
  });
  return bestExact ?? findSmallestNodeContaining(sourceFile, range.start, range.end);
}

function isStatementNode(node: Node): boolean {
  return ts.isStatement(node.compilerNode);
}

function isObjectPropertyNode(node: Node): boolean {
  const compilerNode = node.compilerNode;
  return (
    ts.isPropertyAssignment(compilerNode) ||
    ts.isShorthandPropertyAssignment(compilerNode) ||
    ts.isSpreadAssignment(compilerNode) ||
    ts.isMethodDeclaration(compilerNode) ||
    ts.isGetAccessorDeclaration(compilerNode) ||
    ts.isSetAccessorDeclaration(compilerNode)
  );
}

function isExpressionNode(node: Node): boolean {
  return ts.isExpression(node.compilerNode as ts.Node);
}

/**
 * Infer a marker kind from the placeholder body's AST node.
 */
export function inferExpectedKind(sourceFile: SourceFile, region: ReplacementRegion): MarkerExpectedKind {
  const node = findBestNodeForRegion(sourceFile, region);
  if (!node) {
    throw new InvalidPlaceholderContextError("Cannot infer marker type from an empty or unrecognized region.", {
      id: region.id,
      line: region.line,
      column: region.column,
      start: region.startCommentStart,
      end: region.endCommentEnd,
      bodyText: region.bodyText
    });
  }

  const compilerNode = node.compilerNode;
  const kind = node.getKind();

  if (isObjectPropertyNode(node)) return "objectProperty";
  if (isStatementNode(node)) return "statement";
  if (ts.isArrayLiteralExpression(compilerNode)) return "array";
  if (ts.isObjectLiteralExpression(compilerNode)) return "object";
  if (ts.isStringLiteral(compilerNode) || kind === SyntaxKind.NoSubstitutionTemplateLiteral) return "string";
  if (ts.isNumericLiteral(compilerNode)) return "number";
  if (kind === SyntaxKind.TrueKeyword || kind === SyntaxKind.FalseKeyword) return "boolean";
  if (kind === SyntaxKind.NullKeyword) return "null";
  if (ts.isIdentifier(compilerNode)) return "expression";
  if (isExpressionNode(node)) return "expression";

  throw new InvalidPlaceholderContextError("Cannot infer marker type from region syntax.", {
    id: region.id,
    line: region.line,
    column: region.column,
    start: region.startCommentStart,
    end: region.endCommentEnd,
    bodyText: region.bodyText
  });
}

/**
 * Ensure a marker's placeholder body is valid for the marker kind and arity.
 */
export function validateRegionContext(sourceFile: SourceFile, region: ReplacementRegion): void {
  const range = trimmedBodyRange(region);

  if (!range) {
    if (region.arity === "one") {
      throw new InvalidPlaceholderContextError("Single-replacement regions must contain a syntactic placeholder in v1.", {
        id: region.id,
        expectedKind: region.effectiveType,
        arity: region.arity,
        line: region.line,
        column: region.column,
        start: region.startCommentStart,
        end: region.endCommentEnd
      });
    }

    validateEmptyManyContext(sourceFile.getFullText(), region);
    return;
  }

  if (region.effectiveType === "expressionSuffix") {
    validateExpressionSuffixRegion(region);
    return;
  }

  const node = findBestNodeForRegion(sourceFile, region);
  if (!node) {
    throw new InvalidPlaceholderContextError("Replacement region does not correspond to a recognized TypeScript AST node.", {
      id: region.id,
      expectedKind: region.effectiveType,
      arity: region.arity,
      line: region.line,
      column: region.column,
      start: region.startCommentStart,
      end: region.endCommentEnd,
      bodyText: region.bodyText
    });
  }

  if (region.effectiveType === "statement" && !isStatementNode(node)) {
    throwInvalidContext(region, "Expected the marked body to be a statement.");
  }

  if (region.effectiveType === "objectProperty" && !isObjectPropertyNode(node)) {
    throwInvalidContext(region, "Expected the marked body to be an object-literal property.");
  }

  if (region.effectiveType === "identifier" && !ts.isIdentifier(node.compilerNode)) {
    throwInvalidContext(region, "Expected the marked body to be an identifier.");
  }

  if (["expression", "array", "object", "string", "number", "boolean", "null"].includes(region.effectiveType)) {
    if (!isExpressionNode(node)) {
      throwInvalidContext(region, "Expected the marked body to be an expression.");
    }
  }
}

function validateExpressionSuffixRegion(region: ReplacementRegion): void {
  if (!isExpressionSuffixSyntaxValid(region.bodyText)) {
    throwInvalidContext(region, "Expected the marked body to be an expression suffix beginning with . or ?..");
  }
}

function isExpressionSuffixSyntaxValid(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed.startsWith(".") && !trimmed.startsWith("?.")) return false;

  const project = createProject();
  const sourceFile = createSourceFile(project, `const __x = __partialReceiver${code};`, "__expression_suffix_context__.ts");
  const variable = sourceFile.getVariableDeclaration("__x");
  return sourceFile.getProject().getProgram().getSyntacticDiagnostics(sourceFile).length === 0 && Boolean(variable?.getInitializer());
}

function throwInvalidContext(region: ReplacementRegion, message: string): never {
  throw new InvalidPlaceholderContextError(message, {
    id: region.id,
    expectedKind: region.effectiveType,
    arity: region.arity,
    line: region.line,
    column: region.column,
    start: region.startCommentStart,
    end: region.endCommentEnd,
    bodyText: region.bodyText
  });
}

function previousNonWhitespace(sourceText: string, before: number): string | undefined {
  for (let index = before - 1; index >= 0; index -= 1) {
    const char = sourceText[index];
    if (char && !/\s/u.test(char)) return char;
  }
  return undefined;
}

function nextNonWhitespace(sourceText: string, after: number): string | undefined {
  for (let index = after; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    if (char && !/\s/u.test(char)) return char;
  }
  return undefined;
}

function validateEmptyManyContext(sourceText: string, region: ReplacementRegion): void {
  const prev = previousNonWhitespace(sourceText, region.startCommentStart);
  const next = nextNonWhitespace(sourceText, region.endCommentEnd);

  if (region.effectiveType === "expression") {
    if (!prev || !next || !"([,".includes(prev) || !")],".includes(next)) {
      throwInvalidContext(region, "Empty expression[] regions are only supported in expression-list contexts.");
    }
  }

  if (region.effectiveType === "objectProperty") {
    if (!prev || !next || !"{,".includes(prev) || !"},".includes(next)) {
      throwInvalidContext(region, "Empty objectProperty[] regions are only supported in object-literal bodies.");
    }
  }
}

const reservedIdentifierWords = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do",
  "else", "enum", "export", "extends", "false", "finally", "for", "function", "if", "import",
  "in", "instanceof", "new", "null", "return", "super", "switch", "this", "throw", "true",
  "try", "typeof", "var", "void", "while", "with", "as", "implements", "interface", "let",
  "package", "private", "protected", "public", "static", "yield", "any", "boolean", "constructor",
  "declare", "get", "module", "require", "number", "set", "string", "symbol", "type", "from",
  "of", "async", "await"
]);

function isIdentifierText(name: string): boolean {
  if (reservedIdentifierWords.has(name)) return false;
  return /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(name);
}

/**
 * Validate a TypeScript identifier and throw with package metadata on failure.
 */
export function validateIdentifierName(name: string, metadata: { id?: string; start?: number; end?: number } = {}): void {
  if (!isIdentifierText(name)) {
    throw new InvalidIdentifierError(`Invalid TypeScript identifier: ${name}`, metadata);
  }
}

/**
 * Boolean form of `validateIdentifierName`.
 */
export function isValidIdentifierName(name: string): boolean {
  return isIdentifierText(name);
}

/**
 * Parse raw expression replacement code in an expression context.
 */
export function validateRawExpressionSyntax(code: string, options: GenerateOptions = {}, metadata: { id?: string } = {}): void {
  const project = createProject(options);
  const sourceFile = createSourceFile(project, `const __x = (${code});`, "__replacement_expression__.ts");
  const diagnostics = sourceFile.getProject().getProgram().getSyntacticDiagnostics(sourceFile);
  const variable = sourceFile.getVariableDeclaration("__x");
  if (diagnostics.length > 0 || !variable?.getInitializer()) {
    throw new InvalidReplacementSyntaxError("Invalid raw expression replacement syntax.", {
      ...metadata,
      bodyText: diagnostics.map(diagnosticToString).join("\n") || code
    });
  }
}

/**
 * Parse receiver-dependent suffix code after a synthetic receiver.
 */
export function validateRawExpressionSuffixSyntax(code: string, options: GenerateOptions = {}, metadata: { id?: string } = {}): void {
  const trimmed = code.trim();
  const project = createProject(options);
  const sourceFile = createSourceFile(project, `const __x = __partialReceiver${code};`, "__replacement_expression_suffix__.ts");
  const diagnostics = sourceFile.getProject().getProgram().getSyntacticDiagnostics(sourceFile);
  const variable = sourceFile.getVariableDeclaration("__x");
  if ((!trimmed.startsWith(".") && !trimmed.startsWith("?.")) || diagnostics.length > 0 || !variable?.getInitializer()) {
    throw new InvalidReplacementSyntaxError("Invalid raw expressionSuffix replacement syntax.", {
      ...metadata,
      bodyText: diagnostics.map(diagnosticToString).join("\n") || code
    });
  }
}

/**
 * Parse raw statement replacement code inside a synthetic function body.
 */
export function validateRawStatementSyntax(code: string, options: GenerateOptions = {}, metadata: { id?: string } = {}): void {
  const project = createProject(options);
  const sourceFile = createSourceFile(project, `function __f() {\n${code}\n}`, "__replacement_statement__.ts");
  const diagnostics = sourceFile.getProject().getProgram().getSyntacticDiagnostics(sourceFile);
  const functionDeclaration = sourceFile.getFunctionOrThrow("__f");
  if (diagnostics.length > 0 || functionDeclaration.getStatements().length === 0) {
    throw new InvalidReplacementSyntaxError("Invalid raw statement replacement syntax.", {
      ...metadata,
      bodyText: diagnostics.map(diagnosticToString).join("\n") || code
    });
  }
}
