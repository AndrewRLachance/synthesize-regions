import { describe, expect, it } from "vitest";
import {
  discoverReplacementRegions,
  generateWithReplacements,
  InvalidMarkerArityError,
  InvalidPlaceholderContextError,
  InvalidReplacementKindError,
  InvalidReplacementSyntaxError,
  SecurityPolicyViolationError
} from "../src/index.js";

function nl(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

describe("partial template modes", () => {
  it("validates and generates expression partial templates inside an expression wrapper", () => {
    const result = generateWithReplacements(
      "/** @TYPE id=value **/ replaceMe /** @END **/ + 1",
      { value: { kind: "expression", code: "input.foo" } },
      { templateMode: { kind: "expression" } }
    );

    expect(result.code).toBe("input.foo + 1");
    expect(result.regions[0]).toMatchObject({
      id: "value",
      inferredType: "expression",
      effectiveType: "expression",
      startCommentStart: 0
    });
    expect(result.diagnostics.syntactic).toEqual([]);
  });


  it("validates and generates expression-suffix partial templates with a synthetic receiver", () => {
    const result = generateWithReplacements(
      `.with({ type: "video", seconds: 10 }, /** @TYPE expression id=arrowArray **/ x => x /** @END **/)`,
      {
        arrowArray: {
          kind: "expression",
          code: "(x) => [x]"
        }
      },
      { templateMode: { kind: "expressionSuffix" } }
    );

    expect(result.code).toBe(`.with({ type: "video", seconds: 10 }, (x) => [x])`);
    expect(result.regions[0]).toMatchObject({
      id: "arrowArray",
      explicitType: "expression",
      effectiveType: "expression"
    });
    expect(result.diagnostics.syntactic).toEqual([]);
  });

  it("discovers expression-suffix regions with original-source offsets", () => {
    const sourceText = `.with({ type: "video" }, /** @TYPE expression id=handler **/ x => x /** @END **/)`;
    const regions = discoverReplacementRegions(sourceText, {
      templateMode: { kind: "expressionSuffix" }
    });

    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({
      id: "handler",
      explicitType: "expression",
      effectiveType: "expression"
    });
    expect(regions[0]?.startCommentStart).toBe(sourceText.indexOf("/** @TYPE"));
    expect(regions[0]?.endCommentEnd).toBe(sourceText.indexOf("**/)") + "**/".length);
  });

  it("formats expression-suffix partial output without returning the synthetic receiver", () => {
    const result = generateWithReplacements(
      `.with({type:"video",seconds:10},/** @TYPE expression id=handler **/x=>x/** @END **/)`,
      {
        handler: {
          kind: "expression",
          code: "(x) => [x]"
        }
      },
      { templateMode: { kind: "expressionSuffix" }, format: "ts-morph" }
    );

    expect(result.code).not.toContain("__partialReceiver");
    expect(result.code).toContain(".with");
    expect(result.code).toContain("(x) => [x]");
    expect(result.diagnostics.syntactic).toEqual([]);
  });

  it("validates and generates statement-list partial templates inside a function-body wrapper", () => {
    const result = generateWithReplacements(
      `/** @TYPE statement[] id=body **/\nthrow new Error("todo");\n/** @END **/`,
      {
        body: [
          { kind: "statement", code: "const x = input.value;" },
          { kind: "statement", code: "return x;" }
        ]
      },
      { templateMode: { kind: "statementList" } }
    );

    expect(nl(result.code)).toBe(`const x = input.value;\nreturn x;`);
    expect(result.diagnostics.syntactic).toEqual([]);
  });

  it("validates and generates object-property-list partial templates inside an object-literal wrapper", () => {
    const result = generateWithReplacements(
      `/** @TYPE objectProperty[] id=props **//** @END **/`,
      {
        props: [
          { kind: "objectProperty", name: "mode", value: { kind: "string", value: "strict" } },
          { kind: "objectProperty", name: "count", value: { kind: "number", value: 3 } }
        ]
      },
      { templateMode: { kind: "objectPropertyList" } }
    );

    expect(nl(result.code)).toBe(`mode: "strict",\ncount: 3`);
    expect(result.diagnostics.syntactic).toEqual([]);
  });

  it("discovers regions in partial object-property templates with original-source offsets", () => {
    const sourceText = `/** @TYPE objectProperty id=prop **/ oldName: true /** @END **/`;
    const regions = discoverReplacementRegions(sourceText, {
      templateMode: { kind: "objectPropertyList" }
    });

    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({
      id: "prop",
      explicitType: "objectProperty",
      effectiveType: "objectProperty",
      startCommentStart: 0,
      endCommentEnd: sourceText.length
    });
  });

  it("uses the same partial wrapper for final validation", () => {
    const result = generateWithReplacements(
      `/** @TYPE objectProperty[] id=props **//** @END **/`,
      { props: [{ kind: "objectProperty", name: "mode", value: { kind: "string", value: "strict" } }] },
      { templateMode: { kind: "objectPropertyList" } }
    );

    // The returned fragment is not a valid standalone TypeScript file, but it is
    // valid when checked inside the object-literal partial wrapper.
    expect(result.code).toBe('mode: "strict"');
    expect(result.diagnostics.syntactic).toEqual([]);
  });

  it("uses expressionSuffix replacements as receiver-dependent marked regions", () => {
    const result = generateWithReplacements(
      `const output = match(input)/** @TYPE expressionSuffix id=videoCase **/.otherwise(() => null)/** @END **/;`,
      {
        videoCase: {
          kind: "expressionSuffix",
          code: `.with({ type: "video", seconds: 10 }, (x) => [x])`
        }
      }
    );

    expect(result.code).toBe(`const output = match(input).with({ type: "video", seconds: 10 }, (x) => [x]);`);
    expect(result.regions[0]).toMatchObject({
      id: "videoCase",
      explicitType: "expressionSuffix",
      effectiveType: "expressionSuffix"
    });
    expect(result.diagnostics.syntactic).toEqual([]);
  });

  it("reuses expressionSuffix partial output as an expressionSuffix replacement", () => {
    const suffix = generateWithReplacements(
      `.with({ type: "video" }, /** @TYPE expression id=handler **/ x => x /** @END **/)`,
      { handler: { kind: "expression", code: "(x) => [x]" } },
      { templateMode: { kind: "expressionSuffix" } }
    );

    const result = generateWithReplacements(
      `const output = match(input)/** @TYPE expressionSuffix id=caseSuffix **/.otherwise(() => null)/** @END **/;`,
      { caseSuffix: { kind: "expressionSuffix", code: suffix.code } }
    );

    expect(result.code).toBe(`const output = match(input).with({ type: "video" }, (x) => [x]);`);
    expect(result.diagnostics.syntactic).toEqual([]);
  });

  it("rejects expressionSuffix[] markers", () => {
    expect(() =>
      discoverReplacementRegions(
        `match(input)/** @TYPE expressionSuffix[] id=suffixes **/.with({ type: "todo" }, x => x)/** @END **/;`
      )
    ).toThrow(InvalidMarkerArityError);
  });

  it("rejects incompatible expressionSuffix replacement kinds", () => {
    expect(() =>
      generateWithReplacements(
        `const output = match(input)/** @TYPE expressionSuffix id=suffix **/.otherwise(() => null)/** @END **/;`,
        { suffix: { kind: "expression", code: ".with({ type: 'video' }, x => x)" } }
      )
    ).toThrow(InvalidReplacementKindError);
  });

  it("rejects expressionSuffix replacements outside expressionSuffix markers", () => {
    expect(() =>
      generateWithReplacements(
        `const output = /** @TYPE expression id=value **/ match(input) /** @END **/;`,
        { value: { kind: "expressionSuffix", code: ".with({ type: 'video' }, x => x)" } }
      )
    ).toThrow(InvalidReplacementKindError);
  });

  it("rejects invalid expressionSuffix replacement syntax", () => {
    expect(() =>
      generateWithReplacements(
        `const output = match(input)/** @TYPE expressionSuffix id=suffix **/.otherwise(() => null)/** @END **/;`,
        { suffix: { kind: "expressionSuffix", code: "+ 1" } }
      )
    ).toThrow(InvalidReplacementSyntaxError);
  });

  it("rejects invalid expressionSuffix placeholder bodies", () => {
    expect(() =>
      discoverReplacementRegions(
        `const output = match(input)/** @TYPE expressionSuffix id=suffix **/+ 1/** @END **/;`
      )
    ).toThrow(InvalidPlaceholderContextError);
  });


  it("applies security policy checks to expressionSuffix replacements", () => {
    expect(() =>
      generateWithReplacements(
        `const output = match(input)/** @TYPE expressionSuffix id=suffix **/.otherwise(() => null)/** @END **/;`,
        { suffix: { kind: "expressionSuffix", code: `.with(eval("x"), x => x)` } }
      )
    ).toThrow(SecurityPolicyViolationError);
  });

});
