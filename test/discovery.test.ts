import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  discoverFileReplacementRegions,
  discoverReplacementRegions,
  InvalidPlaceholderContextError,
  scanReplacementRegions
} from "../src/index.js";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

function regionSummary(sourceText: string) {
  return discoverReplacementRegions(sourceText).map(region => ({
    id: region.id,
    explicitType: region.explicitType,
    inferredType: region.inferredType,
    effectiveType: region.effectiveType,
    arity: region.arity
  }));
}

describe("region discovery API", () => {
  it("discovers explicit regions without requiring replacements", () => {
    const sourceText = `const xs = [\n  /** @TYPE expression[] id=items **//** @END **/\n];`;

    expect(regionSummary(sourceText)).toEqual([
      {
        id: "items",
        explicitType: "expression",
        inferredType: undefined,
        effectiveType: "expression",
        arity: "many"
      }
    ]);
  });

  it("infers omitted marker kinds in read-only discovery", () => {
    const sourceText = `
const value = /** @TYPE id=value **/ oldValue /** @END **/;
const label = /** @TYPE id=label **/ "old" /** @END **/;
const settings = /** @TYPE id=settings **/ {} /** @END **/;
`;

    expect(regionSummary(sourceText)).toEqual([
      {
        id: "value",
        explicitType: undefined,
        inferredType: "expression",
        effectiveType: "expression",
        arity: "one"
      },
      {
        id: "label",
        explicitType: undefined,
        inferredType: "string",
        effectiveType: "string",
        arity: "one"
      },
      {
        id: "settings",
        explicitType: undefined,
        inferredType: "object",
        effectiveType: "object",
        arity: "one"
      }
    ]);
  });

  it("discovers regions from a file", () => {
    const inputFilePath = join(currentDir, "fixtures", "transform-template", "input.ts");
    const sourceText = readFileSync(inputFilePath, "utf8");

    const fromText = discoverReplacementRegions(sourceText, { filePath: inputFilePath });
    const fromFile = discoverFileReplacementRegions(inputFilePath);

    expect(fromFile.map(region => region.id)).toEqual(["configProps", "args", "body"]);
    expect(fromFile).toEqual(fromText);
  });

  it("validates placeholder context during discovery", () => {
    expect(() => discoverReplacementRegions("const x = /** @TYPE expression id=value **//** @END **/;")).toThrow(
      InvalidPlaceholderContextError
    );
  });

  it("still exposes raw marker scanning when callers need unvalidated ranges", () => {
    const regions = scanReplacementRegions("const x = /** @TYPE id=value **/ oldValue /** @END **/;");

    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({
      id: "value",
      effectiveType: "expression",
      arity: "one"
    });
    expect(regions[0]?.inferredType).toBeUndefined();
  });
});
