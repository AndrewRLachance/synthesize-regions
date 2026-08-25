import { describe, expect, it } from 'vitest'
import {
	ArtifactSetGraphCompilationResultSchema,
	SYNTHESIZE_REGIONS_PACKAGE_VERSION,
	TEMPLATE_CAPABILITY_CLOSURE_VERSION,
	TEMPLATE_CATALOG_CONTRACT_DIGEST_PATTERN,
	TEMPLATE_CATALOG_CONTRACT_DIGEST_VERSION,
	TEMPLATE_CATALOG_MANIFEST_DIGEST_PATTERN,
	TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION,
	TEMPLATE_CATALOG_PLANNER_SCHEMA_VERSION,
	TEMPLATE_MANIFEST_DIGEST_PATTERN,
	TEMPLATE_MANIFEST_DIGEST_VERSION,
	TemplateCatalogContractDigestSchema,
	TemplateCatalogManifestDigestSchema,
	TemplateManifestDigestSchema,
	checkContract,
	type TemplateCatalogContractDigest,
	type TemplateCatalogManifestDigest,
	type TemplateManifestDigest
} from '../src/index.js'

describe('public synthesize-regions contract identity', () => {
	it('publishes one exact supported package and engine version matrix', () => {
		expect(SYNTHESIZE_REGIONS_PACKAGE_VERSION).toBe('0.5.0')
		expect(TEMPLATE_CATALOG_CONTRACT_DIGEST_VERSION).toBe(7)
		expect(TEMPLATE_MANIFEST_DIGEST_VERSION).toBe(4)
		expect(TEMPLATE_CATALOG_MANIFEST_DIGEST_VERSION).toBe(4)
		expect(TEMPLATE_CATALOG_PLANNER_SCHEMA_VERSION).toBe(4)
		expect(TEMPLATE_CAPABILITY_CLOSURE_VERSION).toBe(3)
	})

	it('exports closed digest patterns and TypeBox contracts', () => {
		const contractDigest: TemplateCatalogContractDigest = `c7_${'1'.repeat(64)}`
		const templateDigest: TemplateManifestDigest = `t4_${'2'.repeat(64)}`
		const manifestDigest: TemplateCatalogManifestDigest = `m4_${'3'.repeat(64)}`

		expect(TEMPLATE_CATALOG_CONTRACT_DIGEST_PATTERN).toBe('^c7_[a-f0-9]{64}$')
		expect(TEMPLATE_MANIFEST_DIGEST_PATTERN).toBe('^t4_[a-f0-9]{64}$')
		expect(TEMPLATE_CATALOG_MANIFEST_DIGEST_PATTERN).toBe('^m4_[a-f0-9]{64}$')
		expect(checkContract(TemplateCatalogContractDigestSchema, contractDigest)).toBe(true)
		expect(checkContract(TemplateManifestDigestSchema, templateDigest)).toBe(true)
		expect(checkContract(TemplateCatalogManifestDigestSchema, manifestDigest)).toBe(true)
		expect(checkContract(TemplateCatalogContractDigestSchema, `c4_${'1'.repeat(64)}`)).toBe(false)
		expect(checkContract(TemplateManifestDigestSchema, `t1_${'2'.repeat(64)}`)).toBe(false)
		expect(checkContract(TemplateCatalogManifestDigestSchema, `m1_${'3'.repeat(64)}`)).toBe(false)
	})

	it('keeps identity-mismatch failures representable with the verified active catalog identity', () => {
		const currentContractDigest = `c7_${'1'.repeat(64)}`
		const failure = {
			kind: 'artifactSetGraphCompilation',
			mode: 'strict',
			ok: false,
			complete: false,
			classification: 'terminalFailure',
			plan: {
				artifacts: [{
					id: 'identity-check',
					graph: { nodes: [], finalNodeId: 'missing' },
					target: { kind: 'createFile', path: 'src/identity-check.ts' }
				}]
			},
			units: [],
			diagnostics: [{
				origin: 'integrity',
				stage: 'template',
				code: 'CatalogDigestMismatch',
				severity: 'error',
				message: 'The requested catalog identity is stale.',
				expected: `c4_${'4'.repeat(64)}`,
				actual: currentContractDigest
			}],
			contractDigest: currentContractDigest,
			manifestDigest: `m4_${'2'.repeat(64)}`,
			workspaceSnapshotHash: `ws2_${'3'.repeat(64)}`
		}

		expect(checkContract(ArtifactSetGraphCompilationResultSchema, failure)).toBe(true)
		expect(checkContract(ArtifactSetGraphCompilationResultSchema, {
			...failure,
			contractDigest: `c4_${'1'.repeat(64)}`
		})).toBe(false)
		const {
			contractDigest: _contractDigest,
			manifestDigest: _manifestDigest,
			...failureBeforeCatalogCapture
		} = failure
		expect(checkContract(ArtifactSetGraphCompilationResultSchema, failureBeforeCatalogCapture)).toBe(true)
	})
})
