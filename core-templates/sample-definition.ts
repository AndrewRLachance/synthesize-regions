import ts from 'typescript'
import { defineTemplate as defineAuthoritativeTemplate } from '../src/templates.js'
import type { GraphTemplateManifest, TemplateImportRequirement } from '../src/templates.js'

// Explicit import authority for these authored samples, not a general package inference rule.
const effectNames = ['Config', 'Context', 'Deferred', 'Effect', 'Fiber', 'Layer', 'ManagedRuntime', 'Metric', 'Option', 'PubSub', 'Queue', 'Ref', 'Schedule', 'Schema', 'Semaphore', 'Stream']
const bindings: Readonly<Record<string, TemplateImportRequirement>> = Object.fromEntries([
  ...effectNames.map(name => [name, { schemaVersion: 1, moduleSpecifier: 'effect', importKind: 'named', importedName: name, localName: name, typeOnly: false }] as const),
  ['esToolkit', { schemaVersion: 1, moduleSpecifier: 'es-toolkit', importKind: 'namespace', localName: 'esToolkit', typeOnly: false }],
  ['TestClock', { schemaVersion: 1, moduleSpecifier: 'effect/testing', importKind: 'named', importedName: 'TestClock', localName: 'TestClock', typeOnly: false }],
  ['it', { schemaVersion: 1, moduleSpecifier: '@effect/vitest', importKind: 'named', importedName: 'it', localName: 'it', typeOnly: false }]
])

export function sampleImportRequirements(source: string): readonly TemplateImportRequirement[] {
  const used = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && bindings[node.text]) used.add(node.text)
    ts.forEachChild(node, visit)
  }
  visit(ts.createSourceFile('sample.ts', source, ts.ScriptTarget.Latest, true))
  return [...used].sort().map(name => bindings[name]!)
}

export const defineTemplate: typeof defineAuthoritativeTemplate = ((manifest: GraphTemplateManifest) =>
  defineAuthoritativeTemplate({ ...manifest, importRequirements: manifest.importRequirements ?? sampleImportRequirements(manifest.source) })
) as typeof defineAuthoritativeTemplate
