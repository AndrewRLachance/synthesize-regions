import { readFileSync } from "node:fs";
import {
  InvalidReplacementRegionError,
  NestedReplacementRegionError
} from "../core/errors.js";
import { scanMarkerComments, type MarkerToken } from "../markers/scan.js";
import type { DiscoverOptions, ReplacementRegion } from "../core/types.js";
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
