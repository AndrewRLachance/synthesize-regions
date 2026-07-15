import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import type { Replacement, ReplacementExpression, ReplacementMap, ReplacementValue } from "../src/index.js";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(currentDir, "..");
const schemaPath = join(rootDir, "schemas", "replacement-map.schema.json");
const fixturesDir = join(currentDir, "fixtures");

function readSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(schemaPath, "utf8")) as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReplacementExpression(value: unknown): value is ReplacementExpression {
  if (!isReplacement(value)) return false;
  return [
    "identifier", "expression", "array", "object", "string", "number", "boolean", "null"
  ].includes(value.kind);
}

function isReplacement(value: unknown): value is Replacement {
  if (!isRecord(value) || typeof value.kind !== "string") return false;

  switch (value.kind) {
    case "identifier":
      return typeof value.name === "string";
    case "expression":
    case "expressionSuffix":
    case "statement":
    case "type":
    case "typeMember":
    case "typeParameter":
    case "parameter":
    case "constructorParameter":
    case "heritageType":
    case "declaration":
    case "classMember":
    case "enumMember":
    case "importSpecifier":
    case "exportSpecifier":
      return typeof value.code === "string" && value.code.length > 0;
    case "sourceFile":
      return typeof value.code === "string";
    case "array":
      return Array.isArray(value.elements) && value.elements.every(isReplacementExpression);
    case "object":
      return isRecord(value.properties) && Object.values(value.properties).every(isReplacementExpression);
    case "objectProperty":
      return (
        typeof value.name === "string" &&
        isReplacementExpression(value.value) &&
        (value.computed === undefined || typeof value.computed === "boolean")
      );
    case "string":
      return typeof value.value === "string";
    case "number":
      return typeof value.value === "number" && Number.isFinite(value.value);
    case "boolean":
      return typeof value.value === "boolean";
    case "null":
      return true;
    default:
      return false;
  }
}

function isReplacementValue(value: unknown): value is ReplacementValue {
  return isReplacement(value) || (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isReplacement) &&
    value.every(replacement => replacement.kind !== "sourceFile")
  );
}

function isReplacementMap(value: unknown): value is ReplacementMap {
  return isRecord(value) && Object.keys(value).every(key => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) && Object.values(value).every(isReplacementValue);
}

describe("ReplacementMap JSON Schema", () => {
  it("is published as draft 2020-12 JSON Schema", () => {
    const schema = readSchema();

    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.title).toBe("synthesize-regions ReplacementMap");
    expect(schema).toHaveProperty("$defs.replacementValue.oneOf");
    expect(schema).toHaveProperty("$defs.replacementExpression.oneOf");
  });

  it("documents the ReplacementMap key and non-empty array constraints", () => {
    const schema = readSchema();
    const propertyNames = schema.propertyNames as { pattern?: string };
    const defs = schema.$defs as Record<string, unknown>;
    const replacementValue = defs.replacementValue as { oneOf: Array<Record<string, unknown>> };
    const manyReplacement = replacementValue.oneOf.find(candidate => candidate.type === "array");

    expect(propertyNames.pattern).toBe("^[A-Za-z_][A-Za-z0-9_]*$");
    expect(manyReplacement).toMatchObject({
      type: "array",
      minItems: 1,
      items: {
        allOf: [
          { $ref: "#/$defs/replacement" },
          { not: { $ref: "#/$defs/sourceFileReplacement" } }
        ]
      }
    });
  });

  it("accepts every canonical fixture replacement map structurally", () => {
    const fixtureNames = readdirSync(fixturesDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    for (const fixtureName of fixtureNames) {
      const replacements = JSON.parse(readFileSync(join(fixturesDir, fixtureName, "replacements.json"), "utf8"));
      expect(isReplacementMap(replacements), fixtureName).toBe(true);
    }
  });

  it("accepts every first-class type and declaration replacement", () => {
    const kinds = [
      "type", "typeMember", "typeParameter", "parameter", "constructorParameter",
      "heritageType", "declaration", "classMember", "enumMember", "importSpecifier", "exportSpecifier"
    ] as const;
    const replacements = Object.fromEntries(kinds.map(kind => [kind, { kind, code: "placeholder" }]));
    expect(isReplacementMap(replacements)).toBe(true);
    const validate = new Ajv2020({ strict: true }).compile(readSchema());
    expect(validate(replacements), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ value: { kind: "type", code: "string", extra: true } })).toBe(false);
  });

  it("accepts scalar source files and rejects source-file collections", () => {
    const validate = new Ajv2020({ strict: true }).compile(readSchema());
    const populated = { module: { kind: "sourceFile", code: "export const answer = 42;" } };
    const empty = { module: { kind: "sourceFile", code: "" } };
    const collection = {
      modules: [
        { kind: "sourceFile", code: "export const first = 1;" },
        { kind: "sourceFile", code: "export const second = 2;" }
      ]
    };

    expect(isReplacementMap(populated)).toBe(true);
    expect(isReplacementMap(empty)).toBe(true);
    expect(isReplacementMap(collection)).toBe(false);
    expect(validate(populated), JSON.stringify(validate.errors)).toBe(true);
    expect(validate(empty), JSON.stringify(validate.errors)).toBe(true);
    expect(validate(collection)).toBe(false);
  });

  it("models the main rejected structural cases", () => {
    expect(isReplacementMap({ "bad-id": { kind: "number", value: 1 } })).toBe(false);
    expect(isReplacementMap({ value: [] })).toBe(false);
    expect(isReplacementMap({ value: { kind: "number", value: Number.POSITIVE_INFINITY } })).toBe(false);
    expect(isReplacementMap({ value: { kind: "object", properties: { bad: { kind: "statement", code: "return 1;" } } } })).toBe(false);
    expect(isReplacementMap({ value: { kind: "object", properties: { bad: { kind: "expressionSuffix", code: ".with()" } } } })).toBe(false);
    expect(isReplacementMap({ value: { kind: "objectProperty", name: "x", value: { kind: "objectProperty", name: "y", value: { kind: "number", value: 1 } } } })).toBe(false);
  });
});
