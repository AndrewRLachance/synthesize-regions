import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  discoverFileSourceTemplates,
  discoverReplacementRegions,
  discoverSourceTemplates,
  generateFileSourceTemplateWithReplacements,
  generateSourceTemplateWithReplacements,
  InvalidSourceTemplateBoundaryError,
  NestedSourceTemplateBoundaryError,
  scanSourceTemplateBoundaries
} from "../src/index.js";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

const annotatedSource = `
import { audit } from "./audit.js";

const outside = 1;

/** @TEMPLATE id=Handler output=statement mode=file **/
export async function handler(request: Request) {
  const body = /** @TYPE expression id=body **/ await request.json() /** @END **/;
  /** @TYPE statement[] id=steps **/ audit(body); /** @END **/
}
/** @END_TEMPLATE **/

/** @TEMPLATE output=expression id=Predicate **/
value === /** @TYPE string id=expected **/ "old" /** @END **/
/** @END_TEMPLATE **/
`;

describe("source-template boundary discovery", () => {
  it("extracts only explicitly bounded source and discovers its nested regions", () => {
    const templates = discoverSourceTemplates(annotatedSource, { filePath: "annotated.ts" });

    expect(templates.map(template => ({
      id: template.id,
      outputKind: template.outputKind,
      mode: template.templateMode.kind,
      regionIds: template.regions.map(region => region.id)
    }))).toEqual([
      { id: "Handler", outputKind: "statement", mode: "file", regionIds: ["body", "steps"] },
      { id: "Predicate", outputKind: "expression", mode: "expression", regionIds: ["expected"] }
    ]);

    const handler = templates[0]!;
    expect(handler.sourceText).toContain("export async function handler");
    expect(handler.sourceText).not.toContain("import { audit }");
    expect(handler.sourceText).not.toContain("const outside");
    expect(handler.filePath).toBe("annotated.ts");

    const relativeMarkerStart = handler.sourceText.indexOf("/** @TYPE expression id=body **/");
    const absoluteMarkerStart = annotatedSource.indexOf("/** @TYPE expression id=body **/");
    expect(handler.regions[0]?.startCommentStart).toBe(relativeMarkerStart);
    expect(handler.fileRegions[0]?.startCommentStart).toBe(absoluteMarkerStart);
    expect(handler.sourceText).toBe(annotatedSource.slice(handler.bodyStart, handler.bodyEnd));
  });

  it("generates one named boundary without emitting its surrounding file", () => {
    const result = generateSourceTemplateWithReplacements(annotatedSource, "Predicate", {
      expected: { kind: "string", value: "ready" }
    });

    expect(result.code.trim()).toBe('value === "ready"');
    expect(result.code).not.toContain("@TEMPLATE");
    expect(result.code).not.toContain("const outside");
  });

  it("uses the containing file as semantic insertion-site context", () => {
    const sourceText = `
const base: number = 2;
const preexisting: MissingProjectType = {};
/** @TEMPLATE id=Increment output=expression **/
base + /** @TYPE number id=amount **/ 1 /** @END **/
/** @END_TEMPLATE **/
`;

    expect(() => generateSourceTemplateWithReplacements(sourceText, "Increment", {
      amount: { kind: "number", value: 3 }
    }, { checkSemanticDiagnostics: true })).not.toThrow();
  });

  it("reports semantic errors introduced by the generated boundary body", () => {
    const sourceText = `
const base: number = 2;
/** @TEMPLATE id=Increment output=expression **/
base + /** @TYPE expression id=amount **/ 1 /** @END **/
/** @END_TEMPLATE **/
`;

    expect(() => generateSourceTemplateWithReplacements(sourceText, "Increment", {
      amount: { kind: "expression", code: "missingGeneratedValue" }
    }, { checkSemanticDiagnostics: true })).toThrow("Generated TypeScript failed final validation");
  });

  it("supports file-based discovery and scoped generation", () => {
    const filePath = join(currentDir, "source-fixtures", "annotated-templates.ts");
    const templates = discoverFileSourceTemplates(filePath);
    expect(templates.map(template => template.id)).toEqual(["Message"]);

    const result = generateFileSourceTemplateWithReplacements(filePath, "Message", {
      name: { kind: "string", value: "Codex" }
    });
    expect(result.code.trim()).toBe('`Hello, ${"Codex"}!`');
  });

  it("keeps ordinary replacement discovery compatible with outer boundaries", () => {
    const regions = discoverReplacementRegions(annotatedSource);
    expect(regions.map(region => region.id)).toEqual(["body", "steps", "expected"]);
  });

  it("offers boundary-only scanning for tools that do not need AST validation", () => {
    const boundaries = scanSourceTemplateBoundaries(
      "/** @TEMPLATE id=Empty output=expression **//** @END_TEMPLATE **/"
    );
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]).toMatchObject({ id: "Empty", outputKind: "expression" });
    expect(boundaries[0]?.bodyStart).toBe(boundaries[0]?.bodyEnd);
  });

  it.each([
    ["missing end", "/** @TEMPLATE id=A output=expression **/x"],
    ["unmatched end", "/** @END_TEMPLATE **/"],
    ["missing id", "/** @TEMPLATE output=expression **/x/** @END_TEMPLATE **/"],
    ["unknown output", "/** @TEMPLATE id=A output=nope **/x/** @END_TEMPLATE **/"],
    ["incompatible mode", "/** @TEMPLATE id=A output=expression mode=file **/x/** @END_TEMPLATE **/"],
    ["duplicate id", "/** @TEMPLATE id=A output=expression **/x/** @END_TEMPLATE **//** @TEMPLATE id=A output=expression **/y/** @END_TEMPLATE **/"]
  ])("rejects invalid boundaries: %s", (_name, sourceText) => {
    expect(() => discoverSourceTemplates(sourceText)).toThrow(InvalidSourceTemplateBoundaryError);
  });

  it("rejects nested template boundaries", () => {
    expect(() => discoverSourceTemplates(
      "/** @TEMPLATE id=A output=expression **//** @TEMPLATE id=B output=expression **/x/** @END_TEMPLATE **//** @END_TEMPLATE **/"
    )).toThrow(NestedSourceTemplateBoundaryError);
  });

  it("rejects generation requests for unknown template IDs", () => {
    expect(() => generateSourceTemplateWithReplacements(annotatedSource, "Missing", {}))
      .toThrow(InvalidSourceTemplateBoundaryError);
  });
});
