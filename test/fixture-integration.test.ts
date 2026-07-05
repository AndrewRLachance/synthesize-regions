import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateWithReplacements, type ReplacementMap } from "../src/index.js";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(currentDir, "fixtures");

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

const fixtureNames = readdirSync(fixturesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

describe("fixture-based integration tests", () => {
  for (const fixtureName of fixtureNames) {
    it(`generates expected output for ${fixtureName}`, () => {
      const fixtureDir = join(fixturesDir, fixtureName);
      const input = readFileSync(join(fixtureDir, "input.ts"), "utf8");
      const replacements = JSON.parse(readFileSync(join(fixtureDir, "replacements.json"), "utf8")) as ReplacementMap;
      const expected = readFileSync(join(fixtureDir, "output.ts"), "utf8");

      const result = generateWithReplacements(input, replacements, {
        filePath: `${fixtureName}.ts`
      });

      expect(normalize(result.code)).toBe(normalize(expected));
      expect(result.code).not.toContain("@TYPE");
      expect(result.code).not.toContain("@END");
      expect(result.regions.length).toBeGreaterThan(0);
      expect(result.diagnostics.syntactic).toEqual([]);
    });
  }
});
