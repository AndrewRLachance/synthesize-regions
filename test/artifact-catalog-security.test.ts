import { describe, expect, it } from 'vitest'

import {
	compileArtifactSet,
	compileGraph,
	createArtifactSetArtifactHash,
	createArtifactSetGraphHash,
	createGraphRunner,
	createTemplateRegistry,
	defineTemplate,
	fillTemplateArtifactWithCatalog,
	fragmentPort,
	validateTemplateArtifactAgainstCatalog,
	type ArtifactFillLedgerEntry,
	type ArtifactSetPlan,
	type CompleteTemplateArtifact,
	type PartialTemplateArtifact,
	type SynthesisGraph,
	type TemplateCatalogView
} from '../src/index.js'

const TrustedLeaf = defineTemplate({
	modelId: 'CatalogSecurityLeaf',
	inputs: {},
	output: { kind: 'expression' },
	source: '1'
})

const TrustedParent = defineTemplate({
	modelId: 'CatalogSecurityParent',
	inputs: {
		value: fragmentPort({
			regionKind: 'expression',
			accepts: {
				outputKind: 'expression',
				sourceModelIds: [TrustedLeaf.modelId]
			}
		})
	},
	output: { kind: 'expression' },
	source: 'wrap(/** @TYPE expression id=value **/undefined/** @END **/)'
})

const catalog = createTemplateRegistry([TrustedLeaf, TrustedParent]).snapshot()
const parentGraph: SynthesisGraph = {
	nodes: [{ id: 'parent', templateId: TrustedParent.modelId, inputs: {} }],
	finalNodeId: 'parent'
}

function parentArtifact(): PartialTemplateArtifact {
	const result = compileGraph(parentGraph, catalog, { mode: 'partial' })
	expect(result.ok).toBe(true)
	if (!result.ok || result.finalArtifact.complete !== false) {
		throw new Error('Expected a partial parent artifact.')
	}
	return result.finalArtifact
}

function leafArtifact(
	code = '1',
	manifestDigest = TrustedLeaf.manifestDigest
): CompleteTemplateArtifact {
	return {
		id: 'leaf',
		code,
		kind: 'expression',
		source: {
			templateId: TrustedLeaf.modelId,
			templateManifestDigest: manifestDigest
		},
		complete: true
	}
}

describe('catalog-bound artifact validation', () => {
	it('rejects forged template identity, contracts, and security-banned artifact code', () => {
		const forgedDigest = leafArtifact('1', `t3_${'0'.repeat(64)}`)
		expect(validateTemplateArtifactAgainstCatalog(forgedDigest, catalog).map(diagnostic => diagnostic.code))
			.toContain('TemplateManifestDigestMismatch')

		const malicious = leafArtifact('process.env.SECRET')
		expect(validateTemplateArtifactAgainstCatalog(malicious, catalog).map(diagnostic => diagnostic.code))
			.toContain('RawCodeRejected')

		const partial = parentArtifact()
		const [unresolved] = partial.unresolvedInputs
		const forgedPort = {
			...partial,
			unresolvedInputs: [{
				...unresolved!,
				port: fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression' } })
			}]
		} satisfies PartialTemplateArtifact
		expect(validateTemplateArtifactAgainstCatalog(forgedPort, catalog, { screenSecurity: false })
			.map(diagnostic => diagnostic.code)).toContain('IncompatibleInputKind')
	})

	it('rejects caller-built catalog facades at the artifact trust boundary', () => {
		const forgedCatalog: TemplateCatalogView = {
			contractDigest: catalog.contractDigest,
			manifestDigest: catalog.manifestDigest,
			get: templateId => catalog.get(templateId),
			list: () => catalog.list(),
			summaries: () => catalog.summaries()
		}
		expect(validateTemplateArtifactAgainstCatalog(leafArtifact(), forgedCatalog)
			.map(diagnostic => diagnostic.code)).toContain('UntrustedTemplateCatalogView')

		const partial = parentArtifact()
		const result = fillTemplateArtifactWithCatalog(partial, {}, forgedCatalog)
		expect(result).toMatchObject({
			ok: false,
			classification: 'templatePolicyFailure',
			diagnostics: expect.arrayContaining([
				expect.objectContaining({ code: 'UntrustedTemplateCatalogView' })
			])
		})
	})

	it('screens an untrusted persisted base and every supplied child before passthrough', () => {
		const partial = parentArtifact()
		const inputId = partial.unresolvedInputs[0]!.id
		const { sourceMap: _sourceMap, ...withoutMap } = partial
		const forgedBase: PartialTemplateArtifact = {
			...withoutMap,
			code: `process.env.SECRET ?? ${partial.code}`
		}
		const rejectedBase = fillTemplateArtifactWithCatalog(forgedBase, {
			[inputId]: { kind: 'fragment', fragment: leafArtifact() }
		}, catalog, { trustedBaseArtifact: true })
		expect(rejectedBase).toMatchObject({
			ok: false,
			classification: 'terminalFailure',
			diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'RawCodeRejected' })])
		})

		const rejectedChild = fillTemplateArtifactWithCatalog(partial, {
			[inputId]: { kind: 'fragment', fragment: leafArtifact('process.env.SECRET') }
		}, catalog, { trustedBaseArtifact: true })
		expect(rejectedChild).toMatchObject({
			ok: false,
			classification: 'artifactFillable',
			artifact: partial,
			diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'RawCodeRejected' })])
		})

		const valid = fillTemplateArtifactWithCatalog(partial, {
			[inputId]: { kind: 'fragment', fragment: leafArtifact() }
		}, catalog, { trustedBaseArtifact: true })
		expect(valid).toMatchObject({ ok: true, artifact: { complete: true, code: 'wrap(1)' } })
	})

	it('keeps forged and unsafe runner fragment fills retryable', () => {
		const runner = createGraphRunner(catalog, parentGraph)
		const pending = runner.advance()
		expect(pending.kind).toBe('needsArtifactInputs')
		if (pending.kind !== 'needsArtifactInputs') return
		const inputId = pending.artifact.unresolvedInputs[0]!.id

		const forged = runner.advance({
			kind: 'fill',
			inputs: {
				[inputId]: { kind: 'fragment', fragment: leafArtifact('1', `t3_${'f'.repeat(64)}`) }
			}
		})
		expect(forged.kind).toBe('needsArtifactInputs')
		expect(forged.diagnostics.map(diagnostic => diagnostic.code)).toContain('TemplateManifestDigestMismatch')

		const unsafe = runner.advance({
			kind: 'fill',
			inputs: { [inputId]: { kind: 'fragment', fragment: leafArtifact('globalThis.SECRET') } }
		})
		expect(unsafe.kind).toBe('needsArtifactInputs')
		expect(unsafe.diagnostics.map(diagnostic => diagnostic.code)).toContain('RawCodeRejected')

		const complete = runner.advance({
			kind: 'fill',
			inputs: { [inputId]: { kind: 'fragment', fragment: leafArtifact() } }
		})
		expect(complete).toMatchObject({ kind: 'complete', artifact: { code: 'wrap(1)' } })
	})
})

describe('artifact-set ledger security', () => {
	const FileLeaf = defineTemplate({
		modelId: 'CatalogSecurityFileLeaf',
		inputs: {},
		output: { kind: 'sourceFile' },
		source: 'export const safe = 1;'
	})
	const FileParent = defineTemplate({
		modelId: 'CatalogSecurityFileParent',
		inputs: {
			module: fragmentPort({
				regionKind: 'sourceFile',
				accepts: { outputKind: 'sourceFile', sourceModelIds: [FileLeaf.modelId] }
			})
		},
		output: { kind: 'sourceFile' },
		source: '/** @TYPE sourceFile id=module **/export {};/** @END **/'
	})
	const fileCatalog = createTemplateRegistry([FileLeaf, FileParent]).snapshot()
	const graph: SynthesisGraph = {
		nodes: [{ id: 'file', templateId: FileParent.modelId, inputs: {} }],
		finalNodeId: 'file'
	}
	const plan: ArtifactSetPlan = {
		artifacts: [{ id: 'file', graph, target: { kind: 'createFile', path: 'generated/file.ts' } }]
	}

	it('rejects a hash-consistent ledger containing an unsafe externally supplied fragment', () => {
		const partial = compileArtifactSet(plan, fileCatalog, { mode: 'partial' })
		expect(partial).toMatchObject({ ok: true, complete: false })
		if (!partial.ok || partial.complete) return
		const base = partial.units[0]!.artifact!
		if (base.complete) throw new Error('Expected a partial file artifact.')
		const inputId = base.unresolvedInputs[0]!.id
		const maliciousChild: CompleteTemplateArtifact = {
			code: 'export const leaked = process.env.SECRET;',
			kind: 'sourceFile',
			source: { templateId: FileLeaf.modelId, templateManifestDigest: FileLeaf.manifestDigest },
			complete: true
		}
		const inputs = { [inputId]: { kind: 'fragment' as const, fragment: maliciousChild } }
		const ledger: ArtifactFillLedgerEntry = {
			artifactId: 'file',
			graphHash: createArtifactSetGraphHash(graph),
			baseArtifactHash: createArtifactSetArtifactHash(base),
			inputs,
			// Catalog-bound replay rejects the unsafe child before checking this hash.
			resultingArtifactHash: 'a1_unreachable'
		}

		const result = compileArtifactSet(plan, fileCatalog, { mode: 'partial', fillLedger: [ledger] })
		expect(result).toMatchObject({
			ok: false,
			classification: 'artifactFillable',
			diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'RawCodeRejected' })])
		})
	})
})
