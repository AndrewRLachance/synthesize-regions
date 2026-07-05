import { describe, expect, it } from "vitest";
import { InvalidIdentifierError, code, generateWithReplacements } from "../src/index.js";

function nl(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

describe("code builders", () => {
  it("builds nested expression and statement code for replacement code properties", () => {
    const valueExpr = code.expr.call(code.expr.id("normalize"), [code.expr.prop(code.expr.id("input"), "value")]);

    const replacements = {
      body: [
        code.replacement.statement(code.stmt.const("x", valueExpr)),
        code.replacement.statement(code.stmt.return(code.expr.id("x")))
      ]
    };

    const result = generateWithReplacements(
      `function transform(input: Input): Output {\n  /** @TYPE statement[] id=body **/\n  throw new Error("todo");\n  /** @END **/\n}`,
      replacements
    );

    expect(nl(result.code)).toBe(
      `function transform(input: Input): Output {\n  const x = normalize(input.value);\n  return x;\n}`
    );
  });

  it("builds expression, array, object, and object-property snippets", () => {
    const result = generateWithReplacements(
      `const args = [/** @TYPE expression[] id=args **/ oldValue /** @END **/];\nconst config = { /** @TYPE objectProperty[] id=props **/ old: true /** @END **/ };`,
      {
        args: [
          code.replacement.expression(code.expr.string("strict")),
          code.replacement.expression(code.expr.number(3)),
          code.replacement.expression(code.expr.array([code.expr.boolean(true), code.expr.null()]))
        ],
        props: [
          { kind: "objectProperty", name: "mode", value: { kind: "expression", code: code.expr.string("strict") } },
          { kind: "objectProperty", name: "with-dash", value: { kind: "expression", code: code.expr.object({ count: code.expr.number(3) }) } }
        ]
      }
    );

    expect(result.code).toBe(
      `const args = ["strict", 3, [true, null]];\nconst config = { mode: "strict",
"with-dash": { count: 3 } };`
    );
  });

  it("quotes non-identifier property access and object keys", () => {
    expect(code.expr.prop("input", "with-dash")).toBe('input["with-dash"]');
    expect(code.prop.pair("with-dash", code.expr.number(1))).toBe('"with-dash": 1');
    expect(code.expr.object({ "with-dash": code.expr.boolean(true) })).toBe('{ "with-dash": true }');
  });

  it("rejects invalid identifiers in identifier-oriented builders", () => {
    expect(() => code.expr.id("class")).toThrow(InvalidIdentifierError);
    expect(() => code.stmt.const("hello-world", code.expr.number(1))).toThrow(InvalidIdentifierError);
  });

  it("rejects non-finite numeric expression snippets", () => {
    expect(() => code.expr.number(Number.NaN)).toThrow(TypeError);
    expect(() => code.expr.number(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it("builds expression-suffix replacement snippets", () => {
    const suffix = code.suffix.method("with", [code.expr.object({ type: code.expr.string("video") }), "(x) => [x]"]);

    const result = generateWithReplacements(
      `const output = match(input)/** @TYPE expressionSuffix id=suffix **/.otherwise(() => null)/** @END **/;`,
      { suffix: code.replacement.expressionSuffix(suffix) }
    );

    expect(result.code).toBe(`const output = match(input).with({ "type": "video" }, (x) => [x]);`);
  });

  it("builds optional expression-suffix snippets", () => {
    expect(code.suffix.optionalMethod("with", [code.expr.string("x")])).toBe('?.with("x")');
    expect(code.suffix.prop("value")).toBe(".value");
    expect(code.suffix.optionalProp("value")).toBe("?.value");
  });

});
