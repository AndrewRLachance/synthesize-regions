import type { ReplacementRegion, TemplateMode } from "../core/types.js";

/**
 * Source text plus the synthetic wrapper used to make partial templates parse.
 */
export interface WrappedTemplateSource {
  /** Template mode used to choose the wrapper shape. */
  mode: TemplateMode;
  /** Caller-provided source text before wrapping. */
  originalText: string;
  /** Source text after adding any synthetic wrapper. */
  wrappedText: string;
  /** Text prepended before the original fragment. */
  prefix: string;
  /** Text appended after the original fragment. */
  suffix: string;
}

/**
 * Default missing template mode to full-file validation.
 */
export function normalizeTemplateMode(mode: TemplateMode | undefined): TemplateMode {
  return mode ?? { kind: "file" };
}

/**
 * Wrap a template fragment in the smallest TypeScript context that can validate
 * the requested partial mode.
 */
export function wrapTemplateSource(sourceText: string, modeInput?: TemplateMode): WrappedTemplateSource {
  const mode = normalizeTemplateMode(modeInput);

  switch (mode.kind) {
    case "file":
      return {
        mode,
        originalText: sourceText,
        wrappedText: sourceText,
        prefix: "",
        suffix: ""
      };

    case "expression": {
      const prefix = "const __partial = (";
      const suffix = ");";
      return {
        mode,
        originalText: sourceText,
        wrappedText: `${prefix}${sourceText}${suffix}`,
        prefix,
        suffix
      };
    }

    case "expressionSuffix": {
      const prefix = "const __partial = __partialReceiver";
      const suffix = ";";
      return {
        mode,
        originalText: sourceText,
        wrappedText: `${prefix}${sourceText}${suffix}`,
        prefix,
        suffix
      };
    }

    case "statementList": {
      const prefix = "function __partial() {\n";
      const suffix = "\n}";
      return {
        mode,
        originalText: sourceText,
        wrappedText: `${prefix}${sourceText}${suffix}`,
        prefix,
        suffix
      };
    }

    case "objectPropertyList": {
      const prefix = "const __partial = {\n";
      const suffix = "\n};";
      return {
        mode,
        originalText: sourceText,
        wrappedText: `${prefix}${sourceText}${suffix}`,
        prefix,
        suffix
      };
    }
  }
}

/**
 * True when the caller is validating a fragment instead of a complete file.
 */
export function isPartialTemplateMode(modeInput?: TemplateMode): boolean {
  return normalizeTemplateMode(modeInput).kind !== "file";
}

/**
 * Move region offsets into a wrapped source file before AST lookup.
 */
export function offsetRegion(region: ReplacementRegion, offset: number): ReplacementRegion {
  if (offset === 0) return region;

  return {
    ...region,
    startCommentStart: region.startCommentStart + offset,
    startCommentEnd: region.startCommentEnd + offset,
    bodyStart: region.bodyStart + offset,
    bodyEnd: region.bodyEnd + offset,
    endCommentStart: region.endCommentStart + offset,
    endCommentEnd: region.endCommentEnd + offset
  };
}
