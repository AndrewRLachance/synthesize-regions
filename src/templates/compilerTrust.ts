import type { GraphCompiler } from './graph.js'

const libraryOwnedGraphCompilers = new WeakSet<object>()

/** Brand a compiler closure created by the library. */
export function brandGraphCompiler<T extends GraphCompiler<any>>(compiler: T): T {
	libraryOwnedGraphCompilers.add(compiler)
	return compiler
}

/** Reject callable compiler impostors before a runner can invoke them. */
export function isLibraryOwnedGraphCompiler(value: unknown): value is GraphCompiler<any> {
	return typeof value === 'function' && libraryOwnedGraphCompilers.has(value)
}
