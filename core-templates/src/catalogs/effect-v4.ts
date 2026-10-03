import {
	createTemplateRegistry,
	type GraphTemplateDefinition,
	type TemplateRegistry
} from 'synthesize-regions'
import type { AnyEffectFamilyTemplateDefinitionInput } from '../authoring/effect-v4/index.js'
import { effectV4TemplatePacks } from './effect-v4-packs.js'

const canonicalTemplates: AnyEffectFamilyTemplateDefinitionInput[] = []
const owners = new Map<string, string>()

for (const pack of effectV4TemplatePacks) {
	for (const template of pack.templates) {
		const owner = owners.get(template.modelId)
		if (owner) throw new Error(`Duplicate canonical modelId ${template.modelId} in packs ${owner} and ${pack.id}`)
		owners.set(template.modelId, pack.id)
		canonicalTemplates.push(template)
	}
}

/** Every canonical Effect v4 graph template, exactly once. */
export const effectV4CanonicalGraphTemplateInputs: readonly AnyEffectFamilyTemplateDefinitionInput[] = canonicalTemplates

/** Build a validated registry over the complete canonical Effect v4 catalog. */
export function createEffectV4CanonicalRegistry(): TemplateRegistry {
	return createTemplateRegistry(
		effectV4CanonicalGraphTemplateInputs as readonly GraphTemplateDefinition<any, string, any>[]
	)
}

export { effectV4TemplatePacks }
export type { EffectV4TemplatePack } from './effect-v4-packs.js'
