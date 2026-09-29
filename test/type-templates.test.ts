import { describe, expect, it } from "vitest";
import {
  buildGraphCompiler,
  compileGraph,
  defineTemplate,
  defineTemplateCatalog,
  discoverReplacementRegions,
  discoverSourceTemplates,
  generateWithReplacements,
  fillTemplateArtifact,
  fragmentCollectionPort,
  InvalidReplacementSyntaxError,
  rawCodePort,
  SecurityPolicyViolationError,
  TemplateCatalogValidationError,
  type MarkerExpectedKind,
  type Replacement,
  type TemplateMode
} from "../src/index.js";
import { validateVirtualSemanticTarget } from "../src/templates/semanticTarget.js";

const typedSyntaxCases: ReadonlyArray<{
  kind: MarkerExpectedKind;
  mode: TemplateMode;
  placeholder: string;
  replacement: Replacement;
}> = [
  { kind: "type", mode: { kind: "type" }, placeholder: "unknown", replacement: { kind: "type", code: "string | null" } },
  { kind: "typeMember", mode: { kind: "typeMemberList" }, placeholder: "value: unknown", replacement: { kind: "typeMember", code: "readonly id?: string" } },
  { kind: "typeParameter", mode: { kind: "typeParameterList" }, placeholder: "T", replacement: { kind: "typeParameter", code: "T extends object = {}" } },
  { kind: "parameter", mode: { kind: "parameterList" }, placeholder: "value: unknown", replacement: { kind: "parameter", code: "value?: string" } },
  { kind: "constructorParameter", mode: { kind: "constructorParameterList" }, placeholder: "value: unknown", replacement: { kind: "constructorParameter", code: "private readonly value: string" } },
  { kind: "heritageType", mode: { kind: "heritageTypeList" }, placeholder: "Base", replacement: { kind: "heritageType", code: "Base<string>" } },
  { kind: "declaration", mode: { kind: "declarationList" }, placeholder: "type Value = unknown;", replacement: { kind: "declaration", code: "export interface Value { id: string }" } },
  { kind: "classMember", mode: { kind: "classMemberList" }, placeholder: "value: unknown;", replacement: { kind: "classMember", code: "readonly id = 1" } },
  { kind: "enumMember", mode: { kind: "enumMemberList" }, placeholder: "Value", replacement: { kind: "enumMember", code: "Ready = 1" } },
  { kind: "importSpecifier", mode: { kind: "importSpecifierList" }, placeholder: "Value", replacement: { kind: "importSpecifier", code: "type Value as ImportedValue" } },
  { kind: "exportSpecifier", mode: { kind: "exportSpecifierList" }, placeholder: "Value", replacement: { kind: "exportSpecifier", code: "type Value as PublicValue" } }
];

describe("first-class type and declaration templates", () => {
  it.each(typedSyntaxCases)("discovers, infers, and replaces $kind syntax", ({ kind, mode, placeholder, replacement }) => {
    const inferredSource = `/** @TYPE id=value **/ ${placeholder} /** @END **/`;
    expect(discoverReplacementRegions(inferredSource, { templateMode: mode })[0]?.effectiveType).toBe(kind);

    const explicitSource = `/** @TYPE ${kind} id=value **/ ${placeholder} /** @END **/`;
    const result = generateWithReplacements(explicitSource, { value: replacement }, { templateMode: mode });
    expect(result.code.trim()).toBe("code" in replacement ? replacement.code : "");
  });

  it("uses the defined separators for variadic typed syntax", () => {
    const members = generateWithReplacements(
      "/** @TYPE typeMember[] id=members **/ old: unknown /** @END **/",
      { members: [{ kind: "typeMember", code: "a: string" }, { kind: "typeMember", code: "b: number" }] },
      { templateMode: { kind: "typeMemberList" } }
    );
    expect(members.code).toBe("a: string\nb: number");

    const enumMembers = generateWithReplacements(
      "/** @TYPE enumMember[] id=members **/ Old /** @END **/",
      { members: [{ kind: "enumMember", code: "A" }, { kind: "enumMember", code: "B = 2" }] },
      { templateMode: { kind: "enumMemberList" } }
    );
    expect(enumMembers.code).toBe("A,\nB = 2");

    const parameters = generateWithReplacements(
      "/** @TYPE parameter[] id=parameters **//** @END **/",
      { parameters: [{ kind: "parameter", code: "id: string" }, { kind: "parameter", code: "count = 1" }] },
      { templateMode: { kind: "parameterList" } }
    );
    expect(parameters.code).toBe("id: string, count = 1");
  });

  it("requires exactly one AST item in a single replacement", () => {
    expect(() => generateWithReplacements(
      "/** @TYPE typeMember id=member **/ old: unknown /** @END **/",
      { member: { kind: "typeMember", code: "a: string; b: number" } },
      { templateMode: { kind: "typeMemberList" } }
    )).toThrow(InvalidReplacementSyntaxError);

    expect(() => generateWithReplacements(
      "/** @TYPE declaration id=declaration **/ type Old = unknown; /** @END **/",
      { declaration: { kind: "declaration", code: "type A = string; type B = number;" } },
      { templateMode: { kind: "declarationList" } }
    )).toThrow(InvalidReplacementSyntaxError);
  });

  it("accepts only declared module items as declarations", () => {
    expect(() => generateWithReplacements(
      "/** @TYPE declaration id=declaration **/ type Old = unknown; /** @END **/",
      { declaration: { kind: "declaration", code: "if (ready) run();" } },
      { templateMode: { kind: "declarationList" } }
    )).toThrow(InvalidReplacementSyntaxError);
  });

  it("uses erased-syntax security while retaining runtime-capable checks", () => {
    expect(() => generateWithReplacements(
      "/** @TYPE type id=value **/ unknown /** @END **/",
      { value: { kind: "type", code: "import('pkg').Value | typeof process" } },
      { templateMode: { kind: "type" } }
    )).not.toThrow();

    expect(() => generateWithReplacements(
      "/** @TYPE declaration id=value **/ type Old = unknown; /** @END **/",
      { value: { kind: "declaration", code: "import value from 'pkg';" } },
      { templateMode: { kind: "declarationList" } }
    )).toThrow(SecurityPolicyViolationError);
  });

  it("infers source-template modes for type outputs", () => {
    const [template] = discoverSourceTemplates(`
/** @TEMPLATE id=Maybe output=type **/
/** @TYPE type id=value **/ unknown /** @END **/ | null
/** @END_TEMPLATE **/
`);
    expect(template?.templateMode).toEqual({ kind: "type" });
    expect(template?.regions[0]?.effectiveType).toBe("type");
  });

  it("preserves identifier inference for an ambiguous bare type name", () => {
    const [region] = discoverReplacementRegions(
      "/** @TYPE id=value **/ ExistingType /** @END **/",
      { templateMode: { kind: "type" } }
    );
    expect(region?.effectiveType).toBe("identifier");
    expect(generateWithReplacements(
      "/** @TYPE id=value **/ ExistingType /** @END **/",
      { value: { kind: "identifier", name: "ReplacementType" } },
      { templateMode: { kind: "type" } }
    ).code.trim()).toBe("ReplacementType");
  });
});

describe("type syntax graph integration", () => {
  const ValidType = defineTemplate({
    modelId: "ValidType",
    inputs: {},
    output: { kind: "type", type: { ts: "string | number" } },
    source: "string"
  });

  const InvalidAdvertisedType = defineTemplate({
    modelId: "InvalidAdvertisedType",
    inputs: {},
    output: { kind: "type", type: { ts: "string" } },
    source: "string | number"
  });

  it("semantically proves complete type artifacts against their advertised type", () => {
    const compiler = buildGraphCompiler(defineTemplateCatalog([ValidType, InvalidAdvertisedType] as const));
    const valid = compiler({
      nodes: [{ id: "value", templateId: "ValidType", inputs: {} }],
      finalNodeId: "value",
      goal: { outputKind: "type" }
    }, { checkSemanticDiagnostics: true });
    expect(valid.ok).toBe(true);

    const invalid = compiler({
      nodes: [{ id: "value", templateId: "InvalidAdvertisedType", inputs: {} }],
      finalNodeId: "value",
      goal: { outputKind: "type" }
    }, { checkSemanticDiagnostics: true });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      const diagnostic = invalid.diagnostics.find(candidate => candidate.code === "TypeScriptSemanticError");
      expect(diagnostic).toMatchObject({ nodeId: "value", templateId: "InvalidAdvertisedType", line: 1 });
      expect(diagnostic?.column).toBeTypeOf("number");
    }
  });

  it("rejects literal ports for first-class typed syntax", () => {
    expect(() => defineTemplateCatalog([defineTemplate({
      modelId: "InvalidLiteralTypePort",
      inputs: {
        // Deliberately bypass the finite helper rejection to exercise runtime catalog validation.
        value: { kind: "literal", regionKind: "type" } as any
      },
      output: { kind: "type" },
      source: "/** @TYPE type id=value **/unknown/** @END **/"
    })])).toThrow(TemplateCatalogValidationError);
  });

  it("accepts raw type ports and keeps output kinds exact", () => {
    const RawType = defineTemplate({
      modelId: "RawType",
      inputs: { value: rawCodePort({ regionKind: "type" }) },
      output: { kind: "type" },
      source: "/** @TYPE type id=value **/unknown/** @END **/"
    });
    const compiler = buildGraphCompiler(defineTemplateCatalog([RawType] as const));
    const result = compiler({
      nodes: [{ id: "value", templateId: "RawType", inputs: { value: { kind: "rawCode", code: "ReadonlyArray<string>" } } }],
      finalNodeId: "value",
      goal: { outputKind: "type" }
    });
    expect(result.ok).toBe(true);
  });

  it("preserves partial type artifacts and validates their final fill", () => {
    const RawType = defineTemplate({
      modelId: "PartialRawType",
      inputs: { value: rawCodePort({ regionKind: "type" }) },
      output: { kind: "type", type: { ts: "string | null" } },
      source: "/** @TYPE type id=value **/unknown/** @END **/"
    });
    const compiled = compileGraph({
      nodes: [{ id: "value", templateId: "PartialRawType", inputs: {} }],
      finalNodeId: "value",
      goal: { outputKind: "type" }
    }, [RawType], { mode: "partial", checkSemanticDiagnostics: true });
    expect(compiled.ok).toBe(true);
    if (!compiled.ok || compiled.finalArtifact.complete !== false) return;
    expect(compiled.finalArtifact.unresolvedInputs[0]?.port).toMatchObject({ regionKind: "type" });

    const filled = fillTemplateArtifact(compiled.finalArtifact, {
      value: { kind: "rawCode", code: "string" }
    }, { checkSemanticDiagnostics: true });
    expect(filled.ok).toBe(true);
    if (filled.ok) expect(filled.artifact).toMatchObject({ kind: "type", complete: true, code: "string" });
  });

  it("composes typed syntax collections in authored order with provenance", () => {
    const IdMember = defineTemplate({
      modelId: "IdMember", inputs: {}, output: { kind: "typeMember" }, source: "readonly id: string"
    });
    const NameMember = defineTemplate({
      modelId: "NameMember", inputs: {}, output: { kind: "typeMember" }, source: "name?: string"
    });
    const InterfaceDeclaration = defineTemplate({
      modelId: "InterfaceDeclaration",
      inputs: {
        members: fragmentCollectionPort({
          regionKind: "typeMember",
          accepts: { outputKind: "typeMember", sourceModelIds: ["IdMember", "NameMember"] },
          minItems: 1
        })
      },
      output: { kind: "declaration" },
      source: `export interface User {\n${"/** @TYPE typeMember id=members **/value: unknown/** @END **/"}\n}`
    });
    const result = compileGraph({
      nodes: [
        { id: "id", templateId: "IdMember", inputs: {} },
        { id: "name", templateId: "NameMember", inputs: {} },
        {
          id: "user", templateId: "InterfaceDeclaration",
          inputs: { members: { kind: "fragmentCollection", items: [{ $ref: "id" }, { $ref: "name" }] } }
        }
      ],
      finalNodeId: "user",
      goal: { outputKind: "declaration" }
    }, [IdMember, NameMember, InterfaceDeclaration], { format: "ts-morph" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalArtifact.code).toMatch(/readonly id: string\s+name\?: string/u);
    expect(result.finalArtifact.sourceMap?.spans.some(span => span.nodeId === "id")).toBe(true);
    expect(result.finalArtifact.sourceMap?.spans.some(span => span.nodeId === "name")).toBe(true);
  });

  it("validates advertised types in a virtual generic insertion context", () => {
    const sourceText = "type Result<T> = PLACEHOLDER;";
    const start = sourceText.indexOf("PLACEHOLDER");
    const valid = validateVirtualSemanticTarget({
      targetFile: { filePath: "/virtual/types.ts", sourceText, start, end: start + "PLACEHOLDER".length },
      artifact: { kind: "type", code: "T | null", type: { ts: "T | null" } }
    });
    expect(valid.diagnostics).toEqual([]);

    const invalid = validateVirtualSemanticTarget({
      targetFile: { filePath: "/virtual/types.ts", sourceText, start, end: start + "PLACEHOLDER".length },
      artifact: { kind: "type", code: "T | number", type: { ts: "T" } }
    });
    expect(invalid.diagnostics.length).toBeGreaterThan(0);
  });
});
