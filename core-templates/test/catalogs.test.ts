import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { coreTemplateFamilies } from '../src/catalogs/curated.js'
import { effectV4CanonicalGraphTemplateInputs, effectV4TemplatePacks } from '../src/catalogs/effect-v4.js'

const identityHash = (templates: readonly { modelId: string; manifestDigest: string }[]): string =>
	createHash('sha256')
		.update(templates.map((template) => `${template.modelId}:${template.manifestDigest}`).sort().join('\n'))
		.digest('hex')

describe('companion catalogs', () => {
	it('preserves canonical and curated membership and identities', () => {
		const curated = coreTemplateFamilies.flatMap((family) => family.templates)
		expect(effectV4CanonicalGraphTemplateInputs).toHaveLength(1794)
		expect(new Set(effectV4CanonicalGraphTemplateInputs.map((template) => template.modelId)).size).toBe(1794)
		expect(curated).toHaveLength(479)
		expect(new Set(curated.map((template) => template.modelId)).size).toBe(479)
		expect(identityHash(effectV4CanonicalGraphTemplateInputs)).toBe('cc08a917fa80b4c0039ebd1aafda00ad7375a4f2ca29b582a8ac1d251a6a4a3c')
		expect(identityHash(curated)).toBe('9a20c311d354e1b129bbe95c19d0c87c8a540ee660eb6ef87daa5652444fb2fd')
	})

	it('assigns each canonical model ID to one explicit pack', () => {
		const ownership = effectV4TemplatePacks.flatMap((pack) => pack.templates.map((template) => [template.modelId, pack.id] as const))
		expect(new Set(effectV4TemplatePacks.map((pack) => pack.id)).size).toBe(effectV4TemplatePacks.length)
		expect(ownership).toHaveLength(1794)
		expect(new Set(ownership.map(([modelId]) => modelId)).size).toBe(1794)
		expect(effectV4TemplatePacks.find((pack) => pack.id === 'ai')?.templates).toHaveLength(15)
	})

	it('keeps generated metadata and structural evidence aligned', () => {
		const manifest = JSON.parse(readFileSync(new URL('../metadata/effect-v4-catalog-manifest.json', import.meta.url), 'utf8'))
		const replacements = JSON.parse(readFileSync(new URL('../metadata/effect-v4-template-replacements.json', import.meta.url), 'utf8'))
		const evidence = JSON.parse(readFileSync(new URL('../evidence/effect-v4-structural-validation.json', import.meta.url), 'utf8'))
		const liveIds = effectV4CanonicalGraphTemplateInputs.map((template) => template.modelId).sort()
		expect(manifest.summary.canonical).toBe(1794)
		expect(manifest.templates).toHaveLength(1794)
		expect(manifest.templates.map((template: { modelId: string }) => template.modelId).sort()).toEqual(liveIds)
		expect(Object.keys(manifest.summary.countsByPack).sort()).toEqual(effectV4TemplatePacks.map((pack) => pack.id).sort())
		for (const pack of effectV4TemplatePacks) {
			expect(manifest.templates.filter((template: { pack: string }) => template.pack === pack.id)).toHaveLength(pack.templates.length)
		}
		const liveAiIds = effectV4TemplatePacks.find((pack) => pack.id === 'ai')!.templates.map((template) => template.modelId).sort()
		expect(manifest.templates.filter((template: { category: string }) => template.category === 'ai').map((template: { modelId: string }) => template.modelId).sort()).toEqual(liveAiIds)
		for (const removal of replacements.removals as Array<{ modelId: string; replacedBy?: string }>) {
			expect(liveIds).not.toContain(removal.modelId)
			if (removal.replacedBy) expect(liveIds).toContain(removal.replacedBy)
		}
		expect(evidence.summary.aiTemplates).toBe(15)
		expect(evidence.summary.manifestEntries).toBe(manifest.templates.length)
		expect(evidence.failures).toEqual([])
	})
})
