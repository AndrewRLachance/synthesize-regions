import { describe, expect, it } from "vitest";
import {
  EmptyManyReplacementError,
  FinalValidationError,
  InvalidIdentifierError,
  InvalidMarkerSyntaxError,
  InvalidMarkerTypeError,
  InvalidReplacementKindError,
  InvalidReplacementRegionError,
  InvalidReplacementSyntaxError,
  NestedReplacementRegionError,
  SecurityPolicyViolationError,
  UnusedReplacementError,
  MissingReplacementError,
  generateWithReplacements
} from "../src/index.js";

function nl(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

describe("generateWithReplacements", () => {
  it("1. replaces a single expression", () => {
    const result = generateWithReplacements(
      "const x = /** @TYPE expression id=value **/ replaceMe /** @END **/;",
      { value: { kind: "expression", code: "input.foo + 1" } }
    );
    expect(result.code).toBe("const x = input.foo + 1;");
  });

  it("2. replaces a single statement", () => {
    const result = generateWithReplacements(
      `function f() {\n  /** @TYPE statement id=body **/\n  throw new Error("todo");\n  /** @END **/\n}`,
      { body: { kind: "statement", code: "return 1;" } }
    );
    expect(nl(result.code)).toBe(`function f() {\n  return 1;\n}`);
  });

  it("3. replaces a single identifier", () => {
    const result = generateWithReplacements(
      "const /** @TYPE identifier id=name **/ oldName /** @END **/ = 1;",
      { name: { kind: "identifier", name: "newName" } }
    );
    expect(result.code).toBe("const newName = 1;");
  });

  it("4. replaces a single string", () => {
    const result = generateWithReplacements(
      'const s = /** @TYPE string id=value **/ "old" /** @END **/;',
      { value: { kind: "string", value: "hello" } }
    );
    expect(result.code).toBe('const s = "hello";');
  });

  it("5. replaces a single number", () => {
    const result = generateWithReplacements(
      "const n = /** @TYPE number id=value **/ 0 /** @END **/;",
      { value: { kind: "number", value: 42 } }
    );
    expect(result.code).toBe("const n = 42;");
  });

  it("6. replaces a single boolean", () => {
    const result = generateWithReplacements(
      "const ok = /** @TYPE boolean id=value **/ false /** @END **/;",
      { value: { kind: "boolean", value: true } }
    );
    expect(result.code).toBe("const ok = true;");
  });

  it("7. replaces a single null", () => {
    const result = generateWithReplacements(
      "const v = /** @TYPE null id=value **/ null /** @END **/;",
      { value: { kind: "null" } }
    );
    expect(result.code).toBe("const v = null;");
  });

  it("8. replaces a single array", () => {
    const result = generateWithReplacements(
      "const xs = /** @TYPE array id=value **/ [] /** @END **/;",
      { value: { kind: "array", elements: [{ kind: "number", value: 1 }, { kind: "string", value: "a" }] } }
    );
    expect(result.code).toBe('const xs = [1, "a"];');
  });

  it("9. replaces a single object", () => {
    const result = generateWithReplacements(
      "const obj = /** @TYPE object id=value **/ {} /** @END **/;",
      { value: { kind: "object", properties: { mode: { kind: "string", value: "strict" }, count: { kind: "number", value: 3 } } } }
    );
    expect(result.code).toBe('const obj = { mode: "strict", count: 3 };');
  });

  it("10. replaces a single object property", () => {
    const result = generateWithReplacements(
      "const obj = { /** @TYPE objectProperty id=prop **/ old: true /** @END **/ };",
      { prop: { kind: "objectProperty", name: "mode", value: { kind: "string", value: "strict" } } }
    );
    expect(result.code).toBe('const obj = { mode: "strict" };');
  });

  it("11. replaces an expression list with a non-empty original body", () => {
    const result = generateWithReplacements(
      "const xs = [/** @TYPE expression[] id=items **/ placeholder /** @END **/];",
      { items: [{ kind: "string", value: "a" }, { kind: "number", value: 1 }] }
    );
    expect(result.code).toBe('const xs = ["a", 1];');
  });

  it("12. inserts an expression list into an empty body", () => {
    const result = generateWithReplacements(
      `const xs = [\n  /** @TYPE expression[] id=items **//** @END **/\n];`,
      { items: [{ kind: "string", value: "a" }, { kind: "number", value: 1 }, { kind: "identifier", name: "someValue" }] }
    );
    expect(nl(result.code)).toBe(`const xs = [\n  "a", 1, someValue\n];`);
  });

  it("13. replaces a statement list with a non-empty original body", () => {
    const result = generateWithReplacements(
      `function f() {\n  /** @TYPE statement[] id=body **/\n  throw new Error("todo");\n  /** @END **/\n}`,
      { body: [{ kind: "statement", code: "const x = 1;" }, { kind: "statement", code: "return x;" }] }
    );
    expect(nl(result.code)).toBe(`function f() {\n  const x = 1;\n  return x;\n}`);
  });

  it("14. inserts a statement list into an empty body", () => {
    const result = generateWithReplacements(
      `function f() {\n  /** @TYPE statement[] id=body **/\n  /** @END **/\n}`,
      { body: [{ kind: "statement", code: "const x = 1;" }, { kind: "statement", code: "return x;" }] }
    );
    expect(nl(result.code)).toBe(`function f() {\n  const x = 1;\n  return x;\n}`);
  });

  it("15. replaces an object-property list with a non-empty original body", () => {
    const result = generateWithReplacements(
      `const obj = {\n  /** @TYPE objectProperty[] id=props **/\n  placeholder: true\n  /** @END **/\n};`,
      { props: [{ kind: "objectProperty", name: "mode", value: { kind: "string", value: "strict" } }, { kind: "objectProperty", name: "count", value: { kind: "number", value: 3 } }] }
    );
    expect(nl(result.code)).toBe(`const obj = {\n  mode: "strict",\n  count: 3\n};`);
  });

  it("16. inserts an object-property list into an empty body", () => {
    const result = generateWithReplacements(
      `const obj = {\n  /** @TYPE objectProperty[] id=props **//** @END **/\n};`,
      { props: [{ kind: "objectProperty", name: "mode", value: { kind: "string", value: "strict" } }, { kind: "objectProperty", name: "count", value: { kind: "number", value: 3 } }] }
    );
    expect(nl(result.code)).toBe(`const obj = {\n  mode: "strict",\n  count: 3\n};`);
  });

  it("17. infers expression type", () => {
    const result = generateWithReplacements(
      "const x = /** @TYPE id=value **/ replaceMe /** @END **/;",
      { value: { kind: "expression", code: "input.x" } }
    );
    expect(result.regions[0]?.inferredType).toBe("expression");
    expect(result.code).toBe("const x = input.x;");
  });

  it("18. infers string type", () => {
    const result = generateWithReplacements(
      'const x = /** @TYPE id=value **/ "old" /** @END **/;',
      { value: { kind: "string", value: "new" } }
    );
    expect(result.regions[0]?.inferredType).toBe("string");
    expect(result.code).toBe('const x = "new";');
  });

  it("19. infers object type", () => {
    const result = generateWithReplacements(
      "const x = /** @TYPE id=value **/ {} /** @END **/;",
      { value: { kind: "object", properties: { ok: { kind: "boolean", value: true } } } }
    );
    expect(result.regions[0]?.inferredType).toBe("object");
    expect(result.code).toBe("const x = { ok: true };");
  });

  it("20. rejects missing replacement", () => {
    expect(() => generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/;", {})).toThrow(MissingReplacementError);
  });

  it("21. rejects unused replacement", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/;", {
        value: { kind: "number", value: 1 },
        extra: { kind: "number", value: 2 }
      })
    ).toThrow(UnusedReplacementError);
  });

  it("22. rejects invalid marker syntax", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression value **/ old /** @END **/;", {
        value: { kind: "number", value: 1 }
      })
    ).toThrow(InvalidMarkerSyntaxError);
  });

  it("23. rejects unknown marker type", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE Nope id=value **/ old /** @END **/;", {
        value: { kind: "number", value: 1 }
      })
    ).toThrow(InvalidMarkerTypeError);
  });

  it("24. rejects missing id", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression **/ old /** @END **/;", {
        value: { kind: "number", value: 1 }
      })
    ).toThrow(InvalidMarkerSyntaxError);
  });

  it("25. rejects invalid id", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=foo-bar **/ old /** @END **/;", {
        value: { kind: "number", value: 1 }
      })
    ).toThrow(InvalidIdentifierError);
  });

  it("26. rejects a single marker receiving an array replacement", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/;", {
        value: [{ kind: "number", value: 1 }]
      })
    ).toThrow(InvalidReplacementKindError);
  });

  it("27. rejects a many marker receiving a single replacement", () => {
    expect(() =>
      generateWithReplacements("const xs = [/** @TYPE expression[] id=items **/ old /** @END **/];", {
        items: { kind: "number", value: 1 }
      })
    ).toThrow(InvalidReplacementKindError);
  });

  it("28. rejects an empty many replacement", () => {
    expect(() =>
      generateWithReplacements("const xs = [/** @TYPE expression[] id=items **/ old /** @END **/];", {
        items: []
      })
    ).toThrow(EmptyManyReplacementError);
  });

  it("29. allows duplicate region ids to reuse the same replacement", () => {
    const result = generateWithReplacements(
      "const a = /** @TYPE expression id=value **/ oldA /** @END **/; const b = /** @TYPE expression id=value **/ oldB /** @END **/;",
      { value: { kind: "number", value: 1 } }
    );
    expect(result.code).toBe("const a = 1; const b = 1;");
  });

  it("30. rejects nested regions", () => {
    expect(() =>
      generateWithReplacements(
        "const x = /** @TYPE expression id=a **/ /** @TYPE expression id=b **/ old /** @END **/ /** @END **/;",
        { a: { kind: "number", value: 1 }, b: { kind: "number", value: 2 } }
      )
    ).toThrow(NestedReplacementRegionError);
  });

  it("31. rejects overlapping/malformed regions", () => {
    expect(() =>
      generateWithReplacements(
        "const x = /** @TYPE expression id=a **/ old /** @TYPE expression id=b **/ old /** @END **/ /** @END **/;",
        { a: { kind: "number", value: 1 }, b: { kind: "number", value: 2 } }
      )
    ).toThrow(NestedReplacementRegionError);
  });

  it("32. rejects unmatched @TYPE", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old;", {
        value: { kind: "number", value: 1 }
      })
    ).toThrow(InvalidReplacementRegionError);
  });

  it("33. rejects unmatched @END", () => {
    expect(() =>
      generateWithReplacements("const x = old /** @END **/;", {
        value: { kind: "number", value: 1 }
      })
    ).toThrow(InvalidReplacementRegionError);
  });

  it("34. rejects replacement kind incompatible with marker type", () => {
    expect(() =>
      generateWithReplacements('const s = /** @TYPE string id=value **/ "old" /** @END **/;', {
        value: { kind: "number", value: 1 }
      })
    ).toThrow(InvalidReplacementKindError);
  });

  it("35. rejects invalid raw expression syntax", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/;", {
        value: { kind: "expression", code: "input +" }
      })
    ).toThrow(InvalidReplacementSyntaxError);
  });

  it("36. rejects invalid raw statement syntax", () => {
    expect(() =>
      generateWithReplacements("function f() { /** @TYPE statement id=body **/ throw new Error(); /** @END **/ }", {
        body: { kind: "statement", code: "const = ;" }
      })
    ).toThrow(InvalidReplacementSyntaxError);
  });

  it("37. rejects eval", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/;", {
        value: { kind: "expression", code: "eval('1')" }
      })
    ).toThrow(SecurityPolicyViolationError);
  });

  it("38. rejects new Function", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/;", {
        value: { kind: "expression", code: "new Function('return 1')" }
      })
    ).toThrow(SecurityPolicyViolationError);
  });

  it("39. rejects process", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/;", {
        value: { kind: "expression", code: "process.env" }
      })
    ).toThrow(SecurityPolicyViolationError);
  });

  it("40. rejects globalThis", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/;", {
        value: { kind: "expression", code: "globalThis.crypto" }
      })
    ).toThrow(SecurityPolicyViolationError);
  });

  it("41. rejects require", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/;", {
        value: { kind: "expression", code: "require('fs')" }
      })
    ).toThrow(SecurityPolicyViolationError);
  });

  it("42. rejects dynamic import", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/;", {
        value: { kind: "expression", code: "import('fs')" }
      })
    ).toThrow(SecurityPolicyViolationError);
  });

  it("43. rejects final generated file syntactic errors", () => {
    expect(() =>
      generateWithReplacements("const x = /** @TYPE expression id=value **/ old /** @END **/ const y = 1;", {
        value: { kind: "number", value: 1 }
      })
    ).toThrow(FinalValidationError);
  });

  it("44. removes marker comments from output", () => {
    const result = generateWithReplacements(
      "const x = /** @TYPE expression id=value **/ old /** @END **/;",
      { value: { kind: "number", value: 1 } }
    );
    expect(result.code).not.toContain("@TYPE");
    expect(result.code).not.toContain("@END");
  });
});
