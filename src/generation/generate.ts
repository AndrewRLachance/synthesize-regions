import { readFileSync } from "node:fs";
import { buildReplacementEdits, type PlannedReplacementEdit } from "../replacements/serialize.js";
import { discoverReplacementRegions } from "../regions/discovery.js";
import { wrapTemplateSource } from "../templates/templateMode.js";
import { createProject, createSourceFile, assertFinalValid, diagnosticMessages } from "../validation/ast.js";
import type { GenerateOptions, GenerateResult, ReplacementMap, TemplateMode } from "../core/types.js";

/**
 * Generate TypeScript by replacing every discovered marker region.
 *
 * The pipeline is intentionally strict: discover and validate marker contexts,
 * validate replacement compatibility and raw syntax, apply text edits, then
 * parse the final output before returning it.
 */
export function generateWithReplacements(
  sourceText: string,
  replacements: ReplacementMap,
  options: GenerateOptions = {}
): GenerateResult {
  const filePath = options.filePath ?? "__synthesize_regions__.ts";
  const regions = discoverReplacementRegions(sourceText, {
    ...options,
    filePath
  });

  const edits = buildReplacementEdits(regions, replacements, options, sourceText);
  let code = applyReplacementEdits(sourceText, edits);

  if (options.format === "ts-morph") {
    code = formatGeneratedCode(code, options, filePath);
  }

  const finalWrapped = wrapTemplateSource(code, options.templateMode);
  const finalProject = createProject(options);
  const finalSourceFile = createSourceFile(finalProject, finalWrapped.wrappedText, filePath);
  assertFinalValid(finalSourceFile, filePath, options.checkSemanticDiagnostics ?? false);

  return {
    code,
    regions,
    diagnostics: diagnosticMessages(finalSourceFile, options.checkSemanticDiagnostics ?? false)
  };
}

/**
 * File-based variant of `generateWithReplacements`.
 */
export function generateFileWithReplacements(
  inputFilePath: string,
  replacements: ReplacementMap,
  options: GenerateOptions = {}
): GenerateResult {
  const sourceText = readFileSync(inputFilePath, "utf8");
  return generateWithReplacements(sourceText, replacements, {
    ...options,
    filePath: options.filePath ?? inputFilePath
  });
}

function applyReplacementEdits(sourceText: string, edits: PlannedReplacementEdit[]): string {
  let output = sourceText;
  const sorted = [...edits].sort((a, b) => b.start - a.start);

  for (const edit of sorted) {
    output = `${output.slice(0, edit.start)}${edit.text}${output.slice(edit.end)}`;
  }

  return output;
}

function formatGeneratedCode(code: string, options: GenerateOptions, filePath: string): string {
  const mode = options.templateMode ?? { kind: "file" as const };
  const formattingProject = createProject(options);

  if (mode.kind === "file") {
    const formattingSourceFile = createSourceFile(formattingProject, code, filePath);
    formattingSourceFile.formatText();
    return formattingSourceFile.getFullText();
  }

  const wrapped = wrapTemplateSourceForFormatting(code, mode);
  const formattingSourceFile = createSourceFile(formattingProject, wrapped.wrappedText, filePath);
  formattingSourceFile.formatText();

  const formatted = formattingSourceFile.getFullText();
  const start = formatted.indexOf(wrapped.startMarker);
  const end = formatted.indexOf(wrapped.endMarker);

  if (start < 0 || end < 0 || end < start) {
    return code;
  }

  return formatted.slice(start + wrapped.startMarker.length, end);
}

/**
 * Wrap partial output with stable comment sentinels so ts-morph can format the
 * whole synthetic file and this module can slice the caller-owned fragment back
 * out afterward.
 */
function wrapTemplateSourceForFormatting(
  sourceText: string,
  mode: Exclude<TemplateMode, { kind: "file" }>
): { wrappedText: string; startMarker: string; endMarker: string } {
  const startMarker = "/*__synthesize_regions_partial_start__*/";
  const endMarker = "/*__synthesize_regions_partial_end__*/";

  switch (mode.kind) {
    case "expression":
      return {
        wrappedText: `const __partial = (${startMarker}${sourceText}${endMarker});`,
        startMarker,
        endMarker
      };

    case "expressionSuffix":
      return {
        wrappedText: `const __partial = __partialReceiver${startMarker}${sourceText}${endMarker};`,
        startMarker,
        endMarker
      };

    case "statementList":
      return {
        wrappedText: `function __partial() {\n${startMarker}\n${sourceText}\n${endMarker}\n}`,
        startMarker,
        endMarker
      };

    case "objectPropertyList":
      return {
        wrappedText: `const __partial = {\n${startMarker}\n${sourceText}\n${endMarker}\n};`,
        startMarker,
        endMarker
      };
  }
}
