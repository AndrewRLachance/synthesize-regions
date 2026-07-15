import type { TemplateCatalogView } from './graphTypes.js'

const libraryOwnedTemplateCatalogViews = new WeakSet<object>()

/** Brand a catalog facade whose methods and membership are owned by the library. */
export function brandTemplateCatalogView<T extends TemplateCatalogView>(catalog: T): T {
	libraryOwnedTemplateCatalogViews.add(catalog)
	return catalog
}

/** Return whether a registry or snapshot was constructed by the library. */
export function isLibraryOwnedTemplateCatalogView(value: unknown): value is TemplateCatalogView {
	return typeof value === 'object' && value !== null && libraryOwnedTemplateCatalogViews.has(value)
}
