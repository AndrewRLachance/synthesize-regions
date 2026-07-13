import { readFileSync } from "node:fs";
import {
  InvalidIdentifierError,
  InvalidReplacementRegionError,
  InvalidSourceTemplateBoundaryError,
  NestedReplacementRegionError,
  NestedSourceTemplateBoundaryError
} from "../core/errors.js";
import { scanMarkerComments, type MarkerToken } from "../markers/scan.js";
import {
  markerExpectedKinds,
  type DiscoveredSourceTemplate,
  type DiscoverOptions,
  type DiscoverSourceTemplatesOptions,
  type MarkerExpectedKind,
  type ReplacementRegion,
  type SourceTemplateBoundary,
  type TemplateMode
} from "../core/types.js";
import { offsetRegion, wrapTemplateSource } from "../templates/templateMode.js";
import { createProject, createSourceFile, inferExpectedKind, validateRegionContext } from "../validation/ast.js";

/**
 * Discovers replacement regions, infers omitted marker kinds, and validates each
 * region's placeholder context without applying replacements.
 *
 * Region offsets in the returned objects always refer to `sourceText`, even
 * when a partial template mode wraps the fragment for validation.
 */
export function discoverReplacementRegions(sourceText: string, options: DiscoverOptions = {}): ReplacementRegion[] {
  const filePath = options.filePath ?? "__synthesize_regions_discovery__.ts";
  const wrapped = wrapTemplateSource(sourceText, options.templateMode);
  const project = createProject(options);
  const sourceFile = createSourceFile(project, wrapped.wrappedText, filePath);
  const offset = wrapped.prefix.length;

  const pairedRegions = scanReplacementRegions(sourceText);
  const regions = finalizeRegionTypes(pairedRegions, region =>
    inferExpectedKind(sourceFile, offsetRegion(region, offset))
  );

  for (const region of regions) {
    validateRegionContext(sourceFile, offsetRegion(region, offset));
  }

  return regions;
}

/**
 * File-based variant of `discoverReplacementRegions`.
 */
export function discoverFileReplacementRegions(inputFilePath: string, options: DiscoverOptions = {}): ReplacementRegion[] {
  const sourceText = readFileSync(inputFilePath, "utf8");
  return discoverReplacementRegions(sourceText, {
    ...options,
    filePath: options.filePath ?? inputFilePath
  });
}

/**
 * Discover explicitly bounded templates in a source file.
 *
 * A boundary has the form:
 * `/** @TEMPLATE id=TemplateId output=statement *\/ ... /** @END_TEMPLATE *\/`.
 * Replacement markers inside each body are discovered and validated using the
 * parser wrapper implied by the declared output kind.
 */
export function discoverSourceTemplates(
  sourceText: string,
  options: DiscoverSourceTemplatesOptions = {}
): DiscoveredSourceTemplate[] {
  return scanSourceTemplateBoundaries(sourceText).map(boundary => {
    const templateSource = sourceText.slice(boundary.bodyStart, boundary.bodyEnd);
    const templateMode = boundary.templateMode;
    const regions = discoverReplacementRegions(templateSource, {
      ...(options.filePath ? { filePath: options.filePath } : {}),
      ...(options.tsConfigFilePath ? { tsConfigFilePath: options.tsConfigFilePath } : {}),
      templateMode
    });
    const fileRegions = regions.map(region => offsetRegionIntoFile(region, boundary.bodyStart, sourceText));

    return {
      ...boundary,
      containingSourceText: sourceText,
      sourceText: templateSource,
      templateMode,
      regions,
      fileRegions,
      ...(options.filePath ? { filePath: options.filePath } : {})
    };
  });
}

/** File-based variant of `discoverSourceTemplates`. */
export function discoverFileSourceTemplates(
  inputFilePath: string,
  options: DiscoverSourceTemplatesOptions = {}
): DiscoveredSourceTemplate[] {
  return discoverSourceTemplates(readFileSync(inputFilePath, "utf8"), {
    ...options,
    filePath: options.filePath ?? inputFilePath
  });
}

/**
 * Pair source-template boundary comments without inspecting replacement regions
 * or validating the extracted TypeScript bodies.
 */
export function scanSourceTemplateBoundaries(sourceText: string): SourceTemplateBoundary[] {
  const tokens = scanSourceTemplateBoundaryComments(sourceText);
  const boundaries: SourceTemplateBoundary[] = [];
  const ids = new Set<string>();
  let open: SourceTemplateBoundaryToken | undefined;

  for (const token of tokens) {
    if (token.kind === "template") {
      if (open) {
        throw new NestedSourceTemplateBoundaryError("Nested source-template boundaries are not supported.", {
          id: token.id,
          start: token.start,
          end: token.end
        });
      }
      if (ids.has(token.id)) {
        throw new InvalidSourceTemplateBoundaryError(`Duplicate source-template id: ${token.id}`, {
          id: token.id,
          start: token.start,
          end: token.end
        });
      }
      open = token;
      continue;
    }

    if (!open) {
      throw new InvalidSourceTemplateBoundaryError("Found @END_TEMPLATE without a matching @TEMPLATE boundary.", {
        start: token.start,
        end: token.end
      });
    }

    const { line, column } = lineAndColumn(sourceText, open.start);
    boundaries.push({
      id: open.id,
      outputKind: open.outputKind,
      templateMode: open.templateMode,
      startCommentStart: open.start,
      startCommentEnd: open.end,
      bodyStart: open.end,
      bodyEnd: token.start,
      endCommentStart: token.start,
      endCommentEnd: token.end,
      line,
      column
    });
    ids.add(open.id);
    open = undefined;
  }

  if (open) {
    throw new InvalidSourceTemplateBoundaryError("Found @TEMPLATE without a matching @END_TEMPLATE boundary.", {
      id: open.id,
      start: open.start,
      end: open.end
    });
  }

  return boundaries;
}

/**
 * Scans and pairs marker comments without AST inference or context validation.
 *
 * This low-level API is useful for tooling that only needs comment ranges.
 * Most callers should use discoverReplacementRegions instead.
 */
export function scanReplacementRegions(sourceText: string): ReplacementRegion[] {
  const tokens = scanMarkerComments(sourceText);
  const regions: ReplacementRegion[] = [];
  let open: MarkerToken | undefined;

  for (const token of tokens) {
    if (token.kind === "type") {
      if (open) {
        throw new NestedReplacementRegionError("Nested replacement regions are not supported in v1.", {
          ...(token.id ? { id: token.id } : {}),
          start: token.start,
          end: token.end
        });
      }
      open = token;
      continue;
    }

    if (!open) {
      throw new InvalidReplacementRegionError("Found @END marker without a matching @TYPE marker.", {
        start: token.start,
        end: token.end
      });
    }

    if (token.start < open.end) {
      throw new InvalidReplacementRegionError("Replacement region markers overlap.", {
        ...(open.id ? { id: open.id } : {}),
        start: open.start,
        end: token.end
      });
    }

    const { line, column } = lineAndColumn(sourceText, open.start);
    const regionBase = {
      id: open.id!,
      effectiveType: open.explicitType ?? "expression",
      arity: open.arity,
      startCommentStart: open.start,
      startCommentEnd: open.end,
      bodyStart: open.end,
      bodyEnd: token.start,
      endCommentStart: token.start,
      endCommentEnd: token.end,
      bodyText: sourceText.slice(open.end, token.start),
      line,
      column
    } satisfies ReplacementRegion;

    const region: ReplacementRegion = open.explicitType
      ? { ...regionBase, explicitType: open.explicitType }
      : regionBase;

    regions.push(region);
    open = undefined;
  }

  if (open) {
    throw new InvalidReplacementRegionError("Found @TYPE marker without a matching @END marker.", {
      ...(open.id ? { id: open.id } : {}),
      start: open.start,
      end: open.end
    });
  }

  return regions;
}

/**
 * Fill in inferred marker kinds while preserving explicit marker kinds.
 */
export function finalizeRegionTypes(
  regions: ReplacementRegion[],
  inferType: (region: ReplacementRegion) => ReplacementRegion["effectiveType"]
): ReplacementRegion[] {
  return regions.map(region => {
    if (region.explicitType) return region;
    const inferredType = inferType(region);
    return {
      ...region,
      inferredType,
      effectiveType: inferredType
    };
  });
}

function lineAndColumn(sourceText: string, position: number): { line: number; column: number } {
  let line = 1;
  let column = 1;

  for (let index = 0; index < position; index += 1) {
    if (sourceText[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

interface SourceTemplateBoundaryToken {
  kind: "template" | "endTemplate";
  start: number;
  end: number;
  id: string;
  outputKind: MarkerExpectedKind;
  templateMode: TemplateMode;
}

const sourceTemplateIdPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

function scanSourceTemplateBoundaryComments(sourceText: string): SourceTemplateBoundaryToken[] {
  const tokens: SourceTemplateBoundaryToken[] = [];
  let cursor = 0;

  while (cursor < sourceText.length) {
    const start = sourceText.indexOf("/**", cursor);
    if (start === -1) break;
    const closeStart = sourceText.indexOf("*/", start + 3);
    if (closeStart === -1) {
      throw new InvalidSourceTemplateBoundaryError("Unclosed block comment while scanning source-template boundaries.", {
        start
      });
    }

    const end = closeStart + 2;
    const content = cleanBlockComment(sourceText.slice(start, end));
    if (content === "@END_TEMPLATE") {
      tokens.push({
        kind: "endTemplate",
        start,
        end,
        id: "",
        outputKind: "statement",
        templateMode: { kind: "statementList" }
      });
    } else if (content.startsWith("@END_TEMPLATE")) {
      throw new InvalidSourceTemplateBoundaryError(`Invalid source-template boundary: ${content}`, { start, end });
    } else if (content.startsWith("@TEMPLATE")) {
      const parsed = parseSourceTemplateOpening(content, start, end);
      tokens.push({ kind: "template", start, end, ...parsed });
    }
    cursor = end;
  }

  return tokens;
}

function parseSourceTemplateOpening(
  content: string,
  start: number,
  end: number
): Pick<SourceTemplateBoundaryToken, "id" | "outputKind" | "templateMode"> {
  const parts = content.slice("@TEMPLATE".length).trim().split(/\s+/u).filter(Boolean);
  let id: string | undefined;
  let outputKind: string | undefined;
  let modeKind: TemplateMode["kind"] | undefined;

  for (const part of parts) {
    const separator = part.indexOf("=");
    if (separator <= 0 || separator === part.length - 1) {
      throw new InvalidSourceTemplateBoundaryError(`Invalid @TEMPLATE field: ${part}`, { start, end });
    }
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (key === "id") {
      if (id !== undefined) {
        throw new InvalidSourceTemplateBoundaryError("@TEMPLATE contains duplicate id fields.", { start, end });
      }
      id = value;
    } else if (key === "output") {
      if (outputKind !== undefined) {
        throw new InvalidSourceTemplateBoundaryError("@TEMPLATE contains duplicate output fields.", { start, end });
      }
      outputKind = value;
    } else if (key === "mode") {
      if (modeKind !== undefined) {
        throw new InvalidSourceTemplateBoundaryError("@TEMPLATE contains duplicate mode fields.", { start, end });
      }
      if (!templateModeKinds.includes(value as TemplateMode["kind"])) {
        throw new InvalidSourceTemplateBoundaryError(`Unknown source-template mode: ${value}`, { start, end });
      }
      modeKind = value as TemplateMode["kind"];
    } else {
      throw new InvalidSourceTemplateBoundaryError(`Unknown @TEMPLATE field: ${key}`, { start, end });
    }
  }

  if (!id) {
    throw new InvalidSourceTemplateBoundaryError("@TEMPLATE must include id=<templateId>.", { start, end });
  }
  if (!sourceTemplateIdPattern.test(id)) {
    throw new InvalidIdentifierError(`Invalid source-template id: ${id}`, { id, start, end });
  }
  if (!outputKind) {
    throw new InvalidSourceTemplateBoundaryError("@TEMPLATE must include output=<regionKind>.", { id, start, end });
  }
  if (!markerExpectedKinds.includes(outputKind as MarkerExpectedKind)) {
    throw new InvalidSourceTemplateBoundaryError(`Unknown source-template output kind: ${outputKind}`, {
      id,
      start,
      end
    });
  }

  const typedOutputKind = outputKind as MarkerExpectedKind;
  const inferredMode = templateModeForOutputKind(typedOutputKind);
  const templateMode: TemplateMode = { kind: modeKind ?? inferredMode.kind } as TemplateMode;
  if (!isOutputKindValidInTemplateMode(typedOutputKind, templateMode)) {
    throw new InvalidSourceTemplateBoundaryError(
      `Source-template output kind ${typedOutputKind} is incompatible with mode ${templateMode.kind}.`,
      { id, start, end }
    );
  }

  return { id, outputKind: typedOutputKind, templateMode };
}

function cleanBlockComment(commentText: string): string {
  return commentText.slice(3, -2).trim().replace(/\*+$/u, "").trim();
}

function templateModeForOutputKind(kind: MarkerExpectedKind): TemplateMode {
  if (kind === "expressionSuffix") return { kind: "expressionSuffix" };
  if (kind === "statement") return { kind: "statementList" };
  if (kind === "objectProperty") return { kind: "objectPropertyList" };
  return { kind: "expression" };
}

const templateModeKinds = [
  "file",
  "expression",
  "expressionSuffix",
  "statementList",
  "objectPropertyList"
] as const satisfies readonly TemplateMode["kind"][];

function isOutputKindValidInTemplateMode(kind: MarkerExpectedKind, mode: TemplateMode): boolean {
  if (kind === "statement") return mode.kind === "statementList" || mode.kind === "file";
  return mode.kind === templateModeForOutputKind(kind).kind;
}

function offsetRegionIntoFile(
  region: ReplacementRegion,
  offset: number,
  sourceText: string
): ReplacementRegion {
  const translated = offsetRegion(region, offset);
  const location = lineAndColumn(sourceText, translated.startCommentStart);
  return { ...translated, ...location };
}
