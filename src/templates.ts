/** Compatibility barrel for typed template definition helpers. */
export * from "./templates/definition.js";
export * from "./templates/graphTypes.js";
export * from "./templates/schemaTypes.js";
export * from "./templates/schemaContract.js";
export * from "./templates/schemaCompatibility.js";
export * from "./templates/typeScriptCompatibility.js";
export * from "./templates/compatibility.js";
export * from "./templates/diagnosticCatalog.js";
export * from "./templates/callableScope.js";
export * from "./templates/deterministic.js";
export * from "./templates/catalogValidation.js";
export * from "./templates/contractIdentity.js";
export * from "./templates/contractManifest.js";
export * from "./templates/capabilityClosure.js";
export { buildCapturedTypeScriptProject } from "./templates/capturedProject.js";
export type {
	CapturedCompilerIssue,
	CapturedCompilerIssueKind,
	CapturedTypeScriptProjectOptions,
	CapturedTypeScriptProjectResult
} from "./templates/capturedProject.js";
export {
	templateCatalogDigest,
	templateCatalogManifestDigest,
	templateManifestDigest
} from "./templates/catalogDigest.js";
export * from "./templates/registry.js";
export * from "./templates/graph.js";
export * from "./templates/graphPatch.js";
export * from "./templates/graphPatterns.js";
export * from "./templates/graphContracts.js";
export * from "./templates/artifactIntegrity.js";
export * from "./templates/runner.js";
export * from "./templates/artifactSet.js";
export * from "./templates/sourceSpans.js";
export * from "./templates/catalogCapture.js";
export * from "./templates/implementationAuthority.js";
export * from "./templates/implementationTargets.js";
export * from "./templates/importRequirements.js";
export * from "./templates/requiredRoot.js";
export * from "./templates/unresolvedValues.js";
