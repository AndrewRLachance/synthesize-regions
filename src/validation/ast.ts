import { Node, Project, ScriptKind, SyntaxKind, ts, type SourceFile } from "ts-morph";
import {
  FinalValidationError,
  InvalidIdentifierError,
  InvalidPlaceholderContextError,
  InvalidReplacementSyntaxError
} from "../core/errors.js";
import type { GenerateOptions, MarkerExpectedKind, ReplacementRegion, TemplateMode } from "../core/types.js";
import { wrapTemplateSource } from "../templates/templateMode.js";

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

export interface StructuredTypeScriptDiagnostic {
  code: number;
  category: "error" | "warning" | "suggestion" | "message";
  message: string;
  /** Source-file identity reported by TypeScript, when available. */
  filePath?: string;
  start?: number;
  /** Diagnostic width in UTF-16 code units, when available. */
  length?: number;
}

/** Collect semantic diagnostics without flattening away compiler codes and locations. */
export function structuredSemanticDiagnostics(sourceFile: SourceFile): StructuredTypeScriptDiagnostic[] {
  return sourceFile.getProject().getProgram().getSemanticDiagnostics(sourceFile).map(diagnostic => {
    const start = diagnostic.getStart();
    const length = diagnostic.getLength();
    const diagnosticSourceFile = diagnostic.getSourceFile();
    return {
      code: diagnostic.getCode(),
      category: diagnosticCategoryName(diagnostic.getCategory()),
      message: ts.flattenDiagnosticMessageText(diagnostic.compilerObject.messageText, "\n"),
      ...(diagnosticSourceFile === undefined ? {} : { filePath: diagnosticSourceFile.getFilePath() }),
      ...(start === undefined ? {} : { start }),
      ...(length === undefined ? {} : { length })
    };
  });
}

function diagnosticCategoryName(category: ts.DiagnosticCategory): StructuredTypeScriptDiagnostic["category"] {
  switch (category) {
    case ts.DiagnosticCategory.Warning: return "warning";
    case ts.DiagnosticCategory.Suggestion: return "suggestion";
    case ts.DiagnosticCategory.Message: return "message";
    default: return "error";
  }
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

function findBestNodeForRegion(
  sourceFile: SourceFile,
  region: ReplacementRegion,
  expectedKind?: MarkerExpectedKind
): Node | undefined {
  const range = trimmedBodyRange(region);
  if (!range) return undefined;
  let bestExact: Node | undefined;
  sourceFile.forEachDescendant(node => {
    const nodeStart = node.getStart(false);
    const nodeEnd = node.getEnd();
    if (nodeStart === range.start && nodeEnd === range.end) {
      const identifierInBareTypeReference = expectedKind === "identifier" &&
        ts.isIdentifier(node.compilerNode) && ts.isTypeReferenceNode(node.compilerNode.parent) &&
        node.compilerNode.parent.typeName === node.compilerNode;
      if (expectedKind && (isTypedSyntaxKind(expectedKind) || identifierInBareTypeReference) &&
        nodeMatchesRegionKind(node, expectedKind)) {
        bestExact = node;
        return false;
      }
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
  const parent = compilerNode.parent;
  if (!ts.isObjectLiteralExpression(parent)) return false;
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

function isAllowedDeclarationNode(node: ts.Node): boolean {
  return ts.isImportDeclaration(node) ||
    ts.isImportEqualsDeclaration(node) ||
    ts.isExportDeclaration(node) ||
    ts.isVariableStatement(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isModuleDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node);
}

function isClassMemberNode(node: ts.Node): boolean {
  const parent = node.parent;
  return (ts.isClassDeclaration(parent) || ts.isClassExpression(parent)) && parent.members.includes(node as ts.ClassElement);
}

function nodeMatchesRegionKind(node: Node, kind: MarkerExpectedKind): boolean {
  const compilerNode = node.compilerNode;
  switch (kind) {
    case "type": return ts.isTypeNode(compilerNode);
    case "typeMember": return ts.isTypeElement(compilerNode);
    case "typeParameter": return ts.isTypeParameterDeclaration(compilerNode);
    case "parameter": return ts.isParameter(compilerNode) && !ts.isConstructorDeclaration(compilerNode.parent);
    case "constructorParameter": return ts.isParameter(compilerNode) && ts.isConstructorDeclaration(compilerNode.parent);
    case "heritageType": return ts.isExpressionWithTypeArguments(compilerNode);
    case "declaration": return isAllowedDeclarationNode(compilerNode) && ts.isSourceFile(compilerNode.parent);
    case "classMember": return isClassMemberNode(compilerNode);
    case "enumMember": return ts.isEnumMember(compilerNode);
    case "importSpecifier": return ts.isImportSpecifier(compilerNode);
    case "exportSpecifier": return ts.isExportSpecifier(compilerNode);
    case "statement": return isStatementNode(node);
    case "objectProperty": return isObjectPropertyNode(node);
    case "identifier": return ts.isIdentifier(compilerNode);
    case "expression":
    case "array":
    case "object":
    case "string":
    case "number":
    case "boolean":
    case "null": return isExpressionNode(node);
    case "expressionSuffix": return false;
  }
}

function isTypedSyntaxKind(kind: MarkerExpectedKind): boolean {
  return kind === "type" || kind === "typeMember" || kind === "typeParameter" ||
    kind === "parameter" || kind === "constructorParameter" || kind === "heritageType" ||
    kind === "declaration" || kind === "classMember" || kind === "enumMember" ||
    kind === "importSpecifier" || kind === "exportSpecifier";
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

  if (nodeMatchesRegionKind(node, "declaration")) return "declaration";
  if (nodeMatchesRegionKind(node, "classMember")) return "classMember";
  if (nodeMatchesRegionKind(node, "enumMember")) return "enumMember";
  if (nodeMatchesRegionKind(node, "importSpecifier")) return "importSpecifier";
  if (nodeMatchesRegionKind(node, "exportSpecifier")) return "exportSpecifier";
  if (nodeMatchesRegionKind(node, "constructorParameter")) return "constructorParameter";
  if (nodeMatchesRegionKind(node, "parameter")) return "parameter";
  if (nodeMatchesRegionKind(node, "typeParameter")) return "typeParameter";
  if (nodeMatchesRegionKind(node, "heritageType")) return "heritageType";
  if (nodeMatchesRegionKind(node, "typeMember")) return "typeMember";
  if (ts.isTypeReferenceNode(compilerNode) && ts.isIdentifier(compilerNode.typeName) &&
    compilerNode.typeArguments === undefined) return "identifier";
  if (nodeMatchesRegionKind(node, "type")) return "type";
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

  const node = findBestNodeForRegion(sourceFile, region, region.effectiveType);
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

  if (!nodeMatchesRegionKind(node, region.effectiveType)) {
    if (region.effectiveType === "statement") throwInvalidContext(region, "Expected the marked body to be a statement.");
    if (region.effectiveType === "objectProperty") throwInvalidContext(region, "Expected the marked body to be an object-literal property.");
    if (region.effectiveType === "identifier") throwInvalidContext(region, "Expected the marked body to be an identifier.");
    if (["expression", "array", "object", "string", "number", "boolean", "null"].includes(region.effectiveType)) {
      throwInvalidContext(region, "Expected the marked body to be an expression.");
    }
    throwInvalidContext(region, `Expected the marked body to be ${region.effectiveType} syntax.`);
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

const typedSyntaxKinds = new Set<MarkerExpectedKind>([
  "type", "typeMember", "typeParameter", "parameter", "constructorParameter",
  "heritageType", "declaration", "classMember", "enumMember", "importSpecifier", "exportSpecifier"
]);

function typedSyntaxMode(kind: MarkerExpectedKind): TemplateMode | undefined {
  switch (kind) {
    case "type": return { kind: "type" };
    case "typeMember": return { kind: "typeMemberList" };
    case "typeParameter": return { kind: "typeParameterList" };
    case "parameter": return { kind: "parameterList" };
    case "constructorParameter": return { kind: "constructorParameterList" };
    case "heritageType": return { kind: "heritageTypeList" };
    case "declaration": return { kind: "declarationList" };
    case "classMember": return { kind: "classMemberList" };
    case "enumMember": return { kind: "enumMemberList" };
    case "importSpecifier": return { kind: "importSpecifierList" };
    case "exportSpecifier": return { kind: "exportSpecifierList" };
    default: return undefined;
  }
}

function wrapTypedSyntaxCollection(kind: MarkerExpectedKind, code: string): ReturnType<typeof wrapTemplateSource> {
  if (kind === "type") {
    const prefix = "type __partial = [";
    const suffix = "];";
    return { mode: { kind: "type" }, originalText: code, wrappedText: `${prefix}${code}${suffix}`, prefix, suffix };
  }
  return wrapTemplateSource(code, typedSyntaxMode(kind));
}

function templateModeRootNodes(sourceFile: SourceFile, mode: TemplateMode): readonly ts.Node[] | undefined {
  const statements = sourceFile.compilerNode.statements;
  switch (mode.kind) {
    case "type": {
      const alias = statements.find(ts.isTypeAliasDeclaration);
      return alias ? [alias.type] : [];
    }
    case "typeMemberList": {
      const declaration = statements.find(ts.isInterfaceDeclaration);
      return declaration?.members ?? [];
    }
    case "typeParameterList": {
      const alias = statements.find(ts.isTypeAliasDeclaration);
      return alias?.typeParameters ?? [];
    }
    case "parameterList": {
      const declaration = statements.find(ts.isFunctionDeclaration);
      return declaration?.parameters ?? [];
    }
    case "constructorParameterList": {
      const declaration = statements.find(ts.isClassDeclaration);
      const constructor = declaration?.members.find(ts.isConstructorDeclaration);
      return constructor?.parameters ?? [];
    }
    case "heritageTypeList": {
      const declaration = statements.find(ts.isInterfaceDeclaration);
      return declaration?.heritageClauses?.flatMap(clause => [...clause.types]) ?? [];
    }
    case "declarationList": return statements;
    case "classMemberList": {
      const declaration = statements.find(ts.isClassDeclaration);
      return declaration?.members ?? [];
    }
    case "enumMemberList": {
      const declaration = statements.find(ts.isEnumDeclaration);
      return declaration?.members ?? [];
    }
    case "importSpecifierList": {
      const declaration = statements.find(ts.isImportDeclaration);
      const bindings = declaration?.importClause?.namedBindings;
      return bindings && ts.isNamedImports(bindings) ? bindings.elements : [];
    }
    case "exportSpecifierList": {
      const declaration = statements.find(ts.isExportDeclaration);
      const clause = declaration?.exportClause;
      return clause && ts.isNamedExports(clause) ? clause.elements : [];
    }
    default: return undefined;
  }
}

/** Enforce the exact-one AST contract for first-class typed syntax modes. */
export function validateTemplateModeRoot(
  sourceFile: SourceFile,
  mode: TemplateMode,
  metadata: { id?: string; bodyText?: string } = {},
  allowEmpty = false
): void {
  const nodes = templateModeRootNodes(sourceFile, mode);
  if (nodes === undefined) return;
  const declarationsValid = mode.kind !== "declarationList" || nodes.every(isAllowedDeclarationNode);
  if ((!allowEmpty && nodes.length !== 1) || (allowEmpty && nodes.length > 1) || !declarationsValid) {
    throw new InvalidReplacementSyntaxError("Typed syntax fragments must contain exactly one AST item of the declared kind.", {
      ...metadata,
      bodyText: metadata.bodyText ?? sourceFile.getFullText()
    });
  }
}

/** Parse one raw first-class type/declaration replacement in its exact AST context. */
export function validateRawTypedSyntax(
  kind: MarkerExpectedKind,
  code: string,
  options: GenerateOptions = {},
  metadata: { id?: string } = {}
): SourceFile {
  if (!typedSyntaxKinds.has(kind)) {
    throw new TypeError(`Expected a typed syntax kind, received ${kind}.`);
  }
  const mode = typedSyntaxMode(kind)!;
  const wrapped = wrapTemplateSource(code, mode);
  const project = createProject(options);
  const sourceFile = createSourceFile(project, wrapped.wrappedText, `__replacement_${kind}.ts`);
  const diagnostics = sourceFile.getProject().getProgram().getSyntacticDiagnostics(sourceFile);
  if (diagnostics.length > 0) {
    throw new InvalidReplacementSyntaxError(`Invalid raw ${kind} replacement syntax.`, {
      ...metadata,
      bodyText: diagnostics.map(diagnosticToString).join("\n") || code
    });
  }
  validateTemplateModeRoot(sourceFile, mode, { ...metadata, bodyText: code });
  return sourceFile;
}

/** Parse a graph fragment collection as one or more items in its exact list context. */
export function validateRawTypedSyntaxCollection(
  kind: MarkerExpectedKind,
  code: string,
  options: GenerateOptions = {},
  metadata: { id?: string } = {}
): SourceFile {
  if (!typedSyntaxKinds.has(kind)) {
    throw new TypeError(`Expected a typed syntax kind, received ${kind}.`);
  }
  const wrapped = wrapTypedSyntaxCollection(kind, code);
  const project = createProject(options);
  const sourceFile = createSourceFile(project, wrapped.wrappedText, `__replacement_${kind}_collection.ts`);
  const diagnostics = sourceFile.getProject().getProgram().getSyntacticDiagnostics(sourceFile);
  if (diagnostics.length > 0) {
    throw new InvalidReplacementSyntaxError(`Invalid raw ${kind} collection replacement syntax.`, {
      ...metadata,
      bodyText: diagnostics.map(diagnosticToString).join("\n") || code
    });
  }
  const mode = typedSyntaxMode(kind)!;
  const nodes = kind === "type"
    ? sourceFile.compilerNode.statements.find(ts.isTypeAliasDeclaration)?.type
    : undefined;
  if (kind === "type") {
    if (!nodes || !ts.isTupleTypeNode(nodes) || nodes.elements.length === 0) {
      throw new InvalidReplacementSyntaxError("Type collections must contain at least one type item.", {
        ...metadata, bodyText: code
      });
    }
    return sourceFile;
  }
  const rootNodes = templateModeRootNodes(sourceFile, mode) ?? [];
  const declarationsValid = mode.kind !== "declarationList" || rootNodes.every(isAllowedDeclarationNode);
  if (rootNodes.length === 0 || !declarationsValid) {
    throw new InvalidReplacementSyntaxError(`Invalid raw ${kind} collection replacement syntax.`, {
      ...metadata, bodyText: code
    });
  }
  return sourceFile;
}
