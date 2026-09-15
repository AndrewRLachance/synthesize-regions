import { readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createTemplateRegistry, type GraphTemplateDefinition, type GraphTemplateManifest } from '../src/templates.js'

export async function miningManifests(): Promise<readonly GraphTemplateManifest[]> {
  const directory = new URL('../temp-samples/', import.meta.url)
  const templates: GraphTemplateDefinition[] = []
  for (const name of (await readdir(directory)).sort()) {
    if (!name.endsWith('.ts') || name === 'e-samplesBasePatterns.ts') continue
    const module = await import(new URL(name, directory).href)
    for (const value of Object.values(module)) {
      if (Array.isArray(value) && value.length > 0 && value.every(t => t?.modelId)) templates.push(...value)
    }
  }
  const catalog = createTemplateRegistry(templates).snapshot()
  return catalog.list().map(({ modelId, version, description, typeParameters, callableScope, importRequirements, inputs, output, source }) => ({
    modelId, ...(version === undefined ? {} : { version }), ...(description === undefined ? {} : { description }),
    ...(typeParameters === undefined ? {} : { typeParameters }), ...(callableScope === undefined ? {} : { callableScope }),
    ...(importRequirements === undefined ? {} : { importRequirements }), inputs, output, source
  }))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = process.argv[2]
  if (!output) throw new Error('Usage: npm run samples:export -- <catalog.json>')
  const manifests = await miningManifests()
  await writeFile(output, JSON.stringify(manifests, null, 2) + '\n')
  console.log(`Exported ${manifests.length} validated templates to ${output}`)
}
