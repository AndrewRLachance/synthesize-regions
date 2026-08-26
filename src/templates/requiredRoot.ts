import { Type, type Static } from '@sinclair/typebox'

import type { ArtifactSetAssemblyUnit, ArtifactSetPlan } from './artifactSet.js'
import {
	implementationDiagnostic,
	implementationEnforcementResult,
	type ImplementationEnforcementDiagnostic,
	type ImplementationEnforcementResult
} from './implementationAuthority.js'

/** Exact root-template authority for one fixed artifact outline entry. */
export const RequiredRootTemplateAuthoritySchema = Type.Object({
	schemaVersion: Type.Literal(1),
	artifactId: Type.String({ minLength: 1 }),
	requiredRootTemplateId: Type.String({ minLength: 1 }),
	requiredRootTemplateManifestDigest: Type.String({ pattern: '^t[0-9]+_[a-f0-9]{64}$' })
}, { additionalProperties: false })

export type RequiredRootTemplateAuthority = Static<typeof RequiredRootTemplateAuthoritySchema>

/**
 * Enforce the target-specific final/root template before and after compilation.
 *
 * Passing `undefined` artifacts validates graph roots only. Passing complete
 * assembly units additionally binds the produced artifact provenance and exact
 * executable manifest digest. The function is pure and never compiles a graph.
 */
export function validateRequiredRootTemplates(
	plan: ArtifactSetPlan,
	artifacts: readonly ArtifactSetAssemblyUnit[] | undefined,
	authority: readonly RequiredRootTemplateAuthority[]
): ImplementationEnforcementResult {
	const diagnostics: ImplementationEnforcementDiagnostic[] = []
	const authorityByArtifact = new Map<string, RequiredRootTemplateAuthority>()
	for (const [index, item] of authority.entries()) {
		if (item.schemaVersion !== 1) diagnostics.push(implementationDiagnostic(
			'InvalidRequiredRootAuthority', 'Required-root authority schemaVersion must be 1.',
			{ artifactId: item.artifactId, path: `authority[${index}].schemaVersion`, expected: 1, actual: item.schemaVersion }
		))
		if (authorityByArtifact.has(item.artifactId)) diagnostics.push(implementationDiagnostic(
			'DuplicateRequiredRootAuthority', `Required-root authority for artifact ${item.artifactId} is duplicated.`,
			{ artifactId: item.artifactId, path: `authority[${index}]` }
		))
		authorityByArtifact.set(item.artifactId, item)
	}

	const planIds = new Set<string>()
	for (const [index, unit] of plan.artifacts.entries()) {
		planIds.add(unit.id)
		const requirement = authorityByArtifact.get(unit.id)
		if (requirement === undefined) {
			diagnostics.push(implementationDiagnostic('MissingRequiredRootAuthority', `Artifact ${unit.id} has no required-root authority.`, {
				artifactId: unit.id, path: `artifacts[${index}]`
			}))
			continue
		}
		const requiredTemplateNodes = unit.graph.nodes.filter(
			node => node.templateId === requirement.requiredRootTemplateId
		)
		if (requiredTemplateNodes.length !== 1) {
			diagnostics.push(implementationDiagnostic(
				'InvalidRequiredRootTemplateMultiplicity',
				`Artifact ${unit.id} must contain required root template ${requirement.requiredRootTemplateId} exactly once.`,
				{
					artifactId: unit.id,
					templateId: requirement.requiredRootTemplateId,
					path: `artifacts[${index}].graph.nodes`,
					expected: 1,
					actual: requiredTemplateNodes.length
				}
			))
		}
		const roots = unit.graph.nodes.filter(node => node.id === unit.graph.finalNodeId)
		if (roots.length !== 1) {
			diagnostics.push(implementationDiagnostic('InvalidRequiredRootNode', `Artifact ${unit.id} must resolve exactly one final graph node.`, {
				artifactId: unit.id, path: `artifacts[${index}].graph.finalNodeId`,
				expected: unit.graph.finalNodeId, actual: roots.map(node => node.id)
			}))
			continue
		}
		if (roots[0]!.templateId !== requirement.requiredRootTemplateId) {
			diagnostics.push(implementationDiagnostic('RequiredRootTemplateMismatch', `Artifact ${unit.id} must finish with template ${requirement.requiredRootTemplateId}.`, {
				artifactId: unit.id,
				templateId: roots[0]!.templateId,
				path: `artifacts[${index}].graph.finalNodeId`,
				expected: requirement.requiredRootTemplateId,
				actual: roots[0]!.templateId
			}))
		}
	}
	for (const item of authority) {
		if (!planIds.has(item.artifactId)) diagnostics.push(implementationDiagnostic(
			'DetachedRequiredRootAuthority', `Required-root authority references unknown artifact ${item.artifactId}.`,
			{ artifactId: item.artifactId }
		))
	}

	if (artifacts !== undefined) {
		const produced = new Map<string, ArtifactSetAssemblyUnit>()
		for (const [index, artifact] of artifacts.entries()) {
			if (produced.has(artifact.id)) diagnostics.push(implementationDiagnostic(
				'DuplicateRequiredRootArtifact', `Compiled artifact ${artifact.id} is duplicated.`,
				{ artifactId: artifact.id, path: `compiledArtifacts[${index}]` }
			))
			produced.set(artifact.id, artifact)
		}
		for (const [artifactId, requirement] of authorityByArtifact) {
			const artifact = produced.get(artifactId)
			if (artifact === undefined) {
				diagnostics.push(implementationDiagnostic('MissingRequiredRootArtifact', `Compiled artifact ${artifactId} is missing.`, { artifactId }))
				continue
			}
			if (artifact.artifact.source.templateId !== requirement.requiredRootTemplateId) {
				diagnostics.push(implementationDiagnostic('RequiredRootArtifactTemplateMismatch', `Compiled artifact ${artifactId} has detached root provenance.`, {
					artifactId,
					templateId: artifact.artifact.source.templateId,
					expected: requirement.requiredRootTemplateId,
					actual: artifact.artifact.source.templateId
				}))
			}
			if (artifact.artifact.source.templateManifestDigest !== requirement.requiredRootTemplateManifestDigest) {
				diagnostics.push(implementationDiagnostic('RequiredRootManifestMismatch', `Compiled artifact ${artifactId} has detached root manifest provenance.`, {
					artifactId,
					templateId: artifact.artifact.source.templateId,
					expected: requirement.requiredRootTemplateManifestDigest,
					actual: artifact.artifact.source.templateManifestDigest
				}))
			}
		}
	}

	return implementationEnforcementResult(diagnostics)
}
