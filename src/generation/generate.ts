import { readFileSync } from "node:fs";
import { FinalValidationError, InvalidSourceTemplateBoundaryError } from "../core/errors.js";
import { buildReplacementEdits, type PlannedReplacementEdit } from "../replacements/serialize.js";
import { discoverReplacementRegions, discoverSourceTemplates } from "../regions/discovery.js";
import { wrapTemplateSource } from "../templates/templateMode.js";
import { validateVirtualSemanticTarget } from "../templates/semanticTarget.js";
import { createProject, createSourceFile, assertFinalValid, diagnosticMessages, resetSharedProject } from "../validation/ast.js";
import type {
  DiscoveredSourceTemplate,
  GenerateDiscoveredSourceTemplateOptions,
  GenerateOptions,
  GenerateResult,
  ReplacementMap,
  TemplateMode
} from "../core/types.js";

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
  // Reset shared project at start of each compilation session to ensure clean state
  resetSharedProject();
  
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

/** Generate only the body of an explicitly discovered source template. */
export function generateDiscoveredSourceTemplate(
  template: DiscoveredSourceTemplate,
  replacements: ReplacementMap,
  options: GenerateDiscoveredSourceTemplateOptions = {}
): GenerateResult {
  // Reset shared project at start of each compilation session to ensure clean state
  resetSharedProject();
  
  const filePath = options.filePath ?? template.filePath;
  const result = generateWithReplacements(template.sourceText, replacements, {
    ...options,
    ...(filePath ? { filePath } : {}),
    checkSemanticDiagnostics: false,
    templateMode: template.templateMode
  });

  if (!options.checkSemanticDiagnostics) return result;

  const validationFilePath = filePath ?? "__synthesize_regions_source_template__.ts";
  const semanticResult = validateVirtualSemanticTarget({
    targetFile: {
      filePath: validationFilePath,
      sourceText: template.containingSourceText,
      start: template.bodyStart,
      end: template.bodyEnd
    },
    artifact: {
      code: result.code,
      kind: template.outputKind
    },
    ...(options.tsConfigFilePath ? { tsConfigFilePath: options.tsConfigFilePath } : {})
  });
  const semantic = semanticResult.diagnostics.map(diagnostic => {
    const location = diagnostic.start === undefined ? "" : ` at ${diagnostic.start}`;
    return `${diagnostic.message}${location}`;
  });
  if (semantic.length > 0) {
    throw new FinalValidationError("Generated TypeScript failed final validation.", {
      filePath: validationFilePath,
      bodyText: semantic.join("\n")
    });
  }

  return {
    ...result,
    diagnostics: { syntactic: result.diagnostics.syntactic, semantic }
  };
}

/** Discover a named source-template boundary and generate only its body. */
export function generateSourceTemplateWithReplacements(
  sourceText: string,
  templateId: string,
  replacements: ReplacementMap,
  options: GenerateDiscoveredSourceTemplateOptions = {}
): GenerateResult {
  const templates = discoverSourceTemplates(sourceText, {
    ...(options.filePath ? { filePath: options.filePath } : {}),
    ...(options.tsConfigFilePath ? { tsConfigFilePath: options.tsConfigFilePath } : {})
  });
  const template = templates.find(candidate => candidate.id === templateId);
  if (!template) {
    throw new InvalidSourceTemplateBoundaryError(`Unknown source-template id: ${templateId}`, {
      id: templateId,
      ...(options.filePath ? { filePath: options.filePath } : {})
    });
  }
  return generateDiscoveredSourceTemplate(template, replacements, options);
}

/** File-based variant of `generateSourceTemplateWithReplacements`. */
export function generateFileSourceTemplateWithReplacements(
  inputFilePath: string,
  templateId: string,
  replacements: ReplacementMap,
  options: GenerateDiscoveredSourceTemplateOptions = {}
): GenerateResult {
  return generateSourceTemplateWithReplacements(readFileSync(inputFilePath, "utf8"), templateId, replacements, {
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

    case "type":
      return {
        wrappedText: `type __partial = ${startMarker}${sourceText}${endMarker};`,
        startMarker,
        endMarker
      };

    case "typeMemberList":
      return {
        wrappedText: `interface __partial {\n${startMarker}\n${sourceText}\n${endMarker}\n}`,
        startMarker,
        endMarker
      };

    case "typeParameterList":
      return {
        wrappedText: `type __partial<${startMarker}${sourceText}${endMarker}> = unknown;`,
        startMarker,
        endMarker
      };

    case "parameterList":
      return {
        wrappedText: `declare function __partial(${startMarker}${sourceText}${endMarker}): void;`,
        startMarker,
        endMarker
      };

    case "constructorParameterList":
      return {
        wrappedText: `class __Partial { constructor(${startMarker}${sourceText}${endMarker}) {} }`,
        startMarker,
        endMarker
      };

    case "heritageTypeList":
      return {
        wrappedText: `interface __Partial extends ${startMarker}${sourceText}${endMarker} {}`,
        startMarker,
        endMarker
      };

    case "declarationList":
      return { wrappedText: `${startMarker}${sourceText}${endMarker}`, startMarker, endMarker };

    case "classMemberList":
      return {
        wrappedText: `class __Partial {\n${startMarker}\n${sourceText}\n${endMarker}\n}`,
        startMarker,
        endMarker
      };

    case "enumMemberList":
      return {
        wrappedText: `enum __Partial {\n${startMarker}\n${sourceText}\n${endMarker}\n}`,
        startMarker,
        endMarker
      };

    case "importSpecifierList":
      return {
        wrappedText: `import { ${startMarker}${sourceText}${endMarker} } from '__partial_module';`,
        startMarker,
        endMarker
      };

    case "exportSpecifierList":
      return {
        wrappedText: `export { ${startMarker}${sourceText}${endMarker} } from '__partial_module';`,
        startMarker,
        endMarker
      };
  }
}
