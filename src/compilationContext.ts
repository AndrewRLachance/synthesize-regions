/**
 * Public entry point for reusable TypeScript analysis scope.
 *
 * The lease is the only supported handle for reuse. The analysis project it
 * owns stays internal so callers cannot depend on compiler objects or on
 * path-based read authority.
 */
export {
	createCompilationContextLease,
	type CompilationContextLease
} from "./validation/analysisContext.js";