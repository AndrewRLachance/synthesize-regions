import { TemplateCatalogValidationError } from './catalogValidation.js'
import { isLibraryOwnedTemplateCatalogView } from './catalogTrust.js'
import type {
	GraphTemplateDefinition,
	TemplateCatalogView,
	TemplateRegistry,
	TemplateRegistrySnapshot
} from './graphTypes.js'
import { createTemplateRegistry } from './registry.js'

/**
 * Capture one immutable, validated catalog from a trusted registry/snapshot or
 * from a raw template array whose definitions are revalidated by construction.
 */
export function captureTemplateCatalogView(
	catalog: TemplateCatalogView | readonly GraphTemplateDefinition<any, string>[]
): TemplateRegistrySnapshot {
	if (Array.isArray(catalog)) return createTemplateRegistry(catalog).snapshot()
	if (!isLibraryOwnedTemplateCatalogView(catalog)) {
		throw new TemplateCatalogValidationError([{
			stage: 'template',
			code: 'UntrustedTemplateCatalogView',
			severity: 'error',
			message: 'Catalog views must be library-created registries or snapshots; pass declarative manifests through createTemplateRegistryFromManifests().',
			path: 'catalog',
			actual: { type: typeof catalog }
		}])
	}
	if ('snapshot' in catalog && typeof (catalog as TemplateRegistry).snapshot === 'function') {
		return (catalog as TemplateRegistry).snapshot()
	}
	return catalog as TemplateRegistrySnapshot
}
