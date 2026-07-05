import { InvalidIdentifierError, InvalidMarkerArityError, InvalidMarkerSyntaxError, InvalidMarkerTypeError } from "../core/errors.js";
import { markerExpectedKinds, type MarkerArity, type MarkerExpectedKind } from "../core/types.js";

/**
 * A raw marker comment discovered in source text before `@TYPE`/`@END` pairing.
 */
export interface MarkerToken {
  kind: "type" | "end";
  start: number;
  end: number;
  text: string;
  id?: string;
  explicitType?: MarkerExpectedKind;
  arity: MarkerArity;
}

const idPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

function cleanCommentContent(commentText: string): string {
  const withoutOpen = commentText.startsWith("/**") ? commentText.slice(3) : commentText;
  const withoutClose = withoutOpen.endsWith("*/") ? withoutOpen.slice(0, -2) : withoutOpen;
  return withoutClose.trim().replace(/\*+$/u, "").trim();
}

function isMarkerContent(content: string): boolean {
  return content.startsWith("@TYPE") || content.startsWith("@END");
}

function parseTypeContent(content: string, start: number, end: number): Omit<MarkerToken, "kind" | "start" | "end" | "text"> {
  const rest = content.slice("@TYPE".length).trim();
  if (rest.length === 0) {
    throw new InvalidMarkerSyntaxError("@TYPE marker must include id=<replacementId>.", { start, end });
  }

  const parts = rest.split(/\s+/u).filter(Boolean);
  let rawKind: string | undefined;
  let id: string | undefined;

  for (const part of parts) {
    if (part.startsWith("id=")) {
      if (id !== undefined) {
        throw new InvalidMarkerSyntaxError("@TYPE marker contains duplicate id= fields.", { start, end });
      }
      id = part.slice(3);
    } else if (rawKind === undefined) {
      rawKind = part;
    } else {
      throw new InvalidMarkerSyntaxError(`Unexpected token in @TYPE marker: ${part}`, { start, end });
    }
  }

  if (!id) {
    throw new InvalidMarkerSyntaxError("@TYPE marker must include id=<replacementId>.", { start, end });
  }
  if (!idPattern.test(id)) {
    throw new InvalidIdentifierError(`Invalid replacement id: ${id}`, { id, start, end });
  }

  let explicitType: MarkerExpectedKind | undefined;
  let arity: MarkerArity = "one";

  if (rawKind !== undefined) {
    if (rawKind.endsWith("[]")) {
      arity = "many";
      rawKind = rawKind.slice(0, -2);
    }

    if (!markerExpectedKinds.includes(rawKind as MarkerExpectedKind)) {
      throw new InvalidMarkerTypeError(`Unknown marker expected kind: ${rawKind}`, { id, start, end });
    }
    if (rawKind === "expressionSuffix" && arity === "many") {
      throw new InvalidMarkerArityError("expressionSuffix[] is not supported; compose multiple suffixes into one expressionSuffix replacement.", {
        id,
        expectedKind: "expressionSuffix",
        arity,
        start,
        end
      });
    }
    explicitType = rawKind as MarkerExpectedKind;
  }

  return explicitType ? { id, explicitType, arity } : { id, arity };
}

/**
 * Find marker-shaped block comments and parse their marker grammar.
 *
 * Non-marker comments are ignored. Pairing and AST validation happen later in
 * region discovery.
 */
export function scanMarkerComments(sourceText: string): MarkerToken[] {
  const tokens: MarkerToken[] = [];
  let cursor = 0;

  while (cursor < sourceText.length) {
    const start = sourceText.indexOf("/**", cursor);
    if (start === -1) break;

    const closeStart = sourceText.indexOf("*/", start + 3);
    if (closeStart === -1) {
      throw new InvalidMarkerSyntaxError("Unclosed block comment while scanning replacement markers.", { start });
    }

    const end = closeStart + 2;
    const text = sourceText.slice(start, end);
    const content = cleanCommentContent(text);

    if (isMarkerContent(content)) {
      if (content === "@END") {
        tokens.push({ kind: "end", start, end, text, arity: "one" });
      } else if (content.startsWith("@TYPE")) {
        const parsed = parseTypeContent(content, start, end);
        tokens.push({ kind: "type", start, end, text, ...parsed });
      } else {
        throw new InvalidMarkerSyntaxError(`Invalid marker comment: ${content}`, { start, end });
      }
    }

    cursor = end;
  }

  return tokens;
}
