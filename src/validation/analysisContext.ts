import { Project, ScriptKind, ts, type SourceFile } from "ts-morph";
import type { GenerateOptions } from "../core/types.js";

/** Private option key used to carry analysis ownership through internal calls. */
const ANALYSIS_CONTEXT = Symbol("synthesize-regions.analysis-context");

type AnalysisAwareOptions = GenerateOptions & {
  readonly [ANALYSIS_CONTEXT]?: TypeScriptAnalysisContext;
};

/** Active synchronous ownership scopes. Compilation and generation APIs are synchronous. */
const activeContexts: TypeScriptAnalysisContext[] = [];

/** Construct one independently owned ts-morph project using the public defaults. */
export function createIndependentAnalysisProject(options: GenerateOptions = {}): Project {
  if (options.tsConfigFilePath) {
    return new Project({ tsConfigFilePath: options.tsConfigFilePath, skipAddingFilesFromTsConfig: true });
  }

  return new Project({
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      strict: true,
      skipLibCheck: true
    }
  });
}

/** Identify the compiler configuration one analysis project was built for. */
function configurationIdentity(tsConfigFilePath: string | undefined): string {
  return JSON.stringify({ tsVersion: ts.version, tsConfigFilePath: tsConfigFilePath ?? null });
}

/** One operation-local project whose scratch files never escape the operation. */
class TypeScriptAnalysisContext {
  #project: Project;
  #configurationIdentity: string;
  #rebuildCount = 1;
  #scratchFile: SourceFile | undefined;
  readonly #transientFiles = new Set<SourceFile>();

  constructor(options: GenerateOptions) {
    this.#project = createIndependentAnalysisProject(options);
    this.#configurationIdentity = configurationIdentity(options.tsConfigFilePath);
  }

  get project(): Project {
    return this.#project;
  }

  /** Number of analysis projects this context has built, including the first. */
  get rebuildCount(): number {
    return this.#rebuildCount;
  }

  /**
   * Rebuild the project when a caller explicitly requests another configuration.
   *
   * Reusing a project built for a different `tsConfigFilePath` would validate
   * under the wrong compiler options. An absent request never downgrades an
   * existing project, so callers that deliberately omit the option keep the
   * analysis they are already inside.
   */
  alignTo(options: GenerateOptions): void {
    const requested = options.tsConfigFilePath;
    if (requested === undefined || configurationIdentity(requested) === this.#configurationIdentity) return;
    this.clearFiles();
    this.#project = createIndependentAnalysisProject({ tsConfigFilePath: requested });
    this.#configurationIdentity = configurationIdentity(requested);
    this.#rebuildCount += 1;
  }

  /** Replace the preceding operation-owned scratch file with one new source. */
  createSourceFile(sourceText: string, filePath: string): SourceFile {
    this.clearScratchFile();
    this.#scratchFile = this.project.createSourceFile(filePath, sourceText, {
      overwrite: true,
      scriptKind: ScriptKind.TS
    });
    return this.#scratchFile;
  }

  /**
   * Create a short-lived source file beside the current scratch file.
   *
   * A caller that already holds the scratch file keeps it: nested region and
   * target-file checks must not invalidate the file they are inspecting.
   */
  createTransientFile(sourceText: string, filePath: string): SourceFile {
    const sourceFile = this.project.createSourceFile(filePath, sourceText, {
      overwrite: true,
      scriptKind: ScriptKind.TS
    });
    this.#transientFiles.add(sourceFile);
    return sourceFile;
  }

  /** Release one transient file created by this context. */
  releaseTransientFile(sourceFile: SourceFile): void {
    if (!this.#transientFiles.delete(sourceFile)) return;
    this.project.removeSourceFile(sourceFile);
  }

  /**
   * Release every source file this context created, keeping the project.
   *
   * A reusable scope calls this between operations so no declaration survives
   * into the next one while the compiler state itself is retained.
   */
  clearFiles(): void {
    for (const sourceFile of this.#transientFiles) this.project.removeSourceFile(sourceFile);
    this.#transientFiles.clear();
    this.clearScratchFile();
  }

  /** Release only files created by this context; dependency files remain caller-owned. */
  dispose(): void {
    this.clearFiles();
  }

  private clearScratchFile(): void {
    if (this.#scratchFile === undefined) return;
    this.project.removeSourceFile(this.#scratchFile);
    this.#scratchFile = undefined;
  }
}

/** Resolve a context explicitly bound to options or inherited by a synchronous nested call. */
function contextFor(options: GenerateOptions): TypeScriptAnalysisContext | undefined {
  return (options as AnalysisAwareOptions)[ANALYSIS_CONTEXT] ?? activeContexts.at(-1);
}

/** Resolve the active context and reconcile it with the caller's configuration request. */
function alignedContextFor(options: GenerateOptions): TypeScriptAnalysisContext | undefined {
  const context = contextFor(options);
  context?.alignTo(options);
  return context;
}

/** Bind one context without adding any enumerable public string-keyed option. */
function bindContext<TOptions extends GenerateOptions>(options: TOptions, context: TypeScriptAnalysisContext): TOptions {
  const bound = { ...options } as TOptions & { [ANALYSIS_CONTEXT]?: TypeScriptAnalysisContext };
  Object.defineProperty(bound, ANALYSIS_CONTEXT, {
    configurable: false,
    enumerable: true,
    writable: false,
    value: context
  });
  return bound;
}

/**
 * Run a synchronous operation with one isolated analysis project. Nested calls
 * inherit the same owner; the outermost call releases all scratch state.
 */
export function runWithAnalysisContext<T, TOptions extends GenerateOptions>(
  options: TOptions,
  operation: (boundOptions: TOptions) => T
): T {
  const inherited = alignedContextFor(options);
  if (inherited !== undefined) {
    const bound = (options as AnalysisAwareOptions)[ANALYSIS_CONTEXT] === inherited
      ? options
      : bindContext(options, inherited);
    activeContexts.push(inherited);
    try {
      return operation(bound);
    } finally {
      activeContexts.pop();
    }
  }

  const owned = new TypeScriptAnalysisContext(options);
  const bound = bindContext(options, owned);
  activeContexts.push(owned);
  try {
    return operation(bound);
  } finally {
    activeContexts.pop();
    owned.dispose();
  }
}

/** Create a source in the current operation, or an independent public project. */
export function createAnalysisSourceFile(
  options: GenerateOptions,
  sourceText: string,
  filePath = "__synthesize_regions__.ts"
): SourceFile {
  const context = alignedContextFor(options);
  if (context !== undefined) return context.createSourceFile(sourceText, filePath);

  return createIndependentAnalysisProject(options).createSourceFile(filePath, sourceText, {
    overwrite: true,
    scriptKind: ScriptKind.TS
  });
}

/**
 * Analyze one short-lived source file inside the caller's analysis ownership.
 *
 * Nested checks reuse the current project instead of building a private one, so
 * a caller-owned analysis scope keeps its compiler state across calls. The
 * transient file is released before returning, which is what lets a caller
 * continue to hold its own scratch file. Without an active scope the file is
 * analyzed in a private project and released immediately.
 */
export function withAnalysisSourceFile<T>(
  options: GenerateOptions,
  sourceText: string,
  filePath: string,
  operation: (sourceFile: SourceFile) => T
): T {
  const context = alignedContextFor(options);
  if (context !== undefined) {
    const sourceFile = context.createTransientFile(sourceText, filePath);
    try {
      return operation(sourceFile);
    } finally {
      context.releaseTransientFile(sourceFile);
    }
  }

  const project = createIndependentAnalysisProject(options);
  const sourceFile = project.createSourceFile(filePath, sourceText, {
    overwrite: true,
    scriptKind: ScriptKind.TS
  });
  try {
    return operation(sourceFile);
  } finally {
    project.removeSourceFile(sourceFile);
  }
}

const compilationContextLeaseBrand: unique symbol = Symbol("synthesize-regions.compilation-context-lease");

/**
 * A caller-owned scope that keeps one TypeScript analysis project across calls.
 *
 * Repeated graph compilation, filling, and runner repair normally rebuild a
 * compiler project per call. A lease reuses the project between operations
 * while releasing every scratch file after each one, so no declaration survives
 * from one iteration to the next. The lease is deliberately not a TypeScript
 * project: callers never receive compiler objects or path-based read authority.
 *
 * A lease is not a repair *session*. It holds no graph, artifact, or durable
 * state, and the decision to keep one open across a unit of work belongs to the
 * integrating runtime.
 */
export interface CompilationContextLease {
  readonly [compilationContextLeaseBrand]: true;
  /** Number of analysis projects this lease has built, including the first. */
  readonly projectRebuildCount: number;
  /** Run one synchronous operation that reuses this lease's analysis project. */
  run<T>(operation: () => T): T;
  /** Irrevocably release this lease's analysis project. */
  close(): void;
}

interface CompilationContextLeaseState {
  readonly baseOptions: GenerateOptions;
  context: TypeScriptAnalysisContext | undefined;
  closed: boolean;
}

/** The lease currently driving synchronous analysis, if any. */
let activeLease: CompilationContextLease | undefined;

const compilationContextLeaseStates = new WeakMap<object, CompilationContextLeaseState>();

/** The only constructible lease. Its brand keeps the type unforgeable off-module. */
class LibraryCompilationContextLease implements CompilationContextLease {
  readonly [compilationContextLeaseBrand] = true as const;
  readonly #state: CompilationContextLeaseState;

  constructor(state: CompilationContextLeaseState) {
    this.#state = state;
    compilationContextLeaseStates.set(this, state);
  }

  get projectRebuildCount(): number {
    return this.#state.context?.rebuildCount ?? 0;
  }

  run<T>(operation: () => T): T {
    const state = this.#state;
    if (state.closed) throw new TypeError('Compilation context lease has been closed');
    if (activeLease !== undefined && activeLease !== this) {
      throw new Error('Compilation context lease scopes cannot overlap');
    }

    const context = state.context ??= new TypeScriptAnalysisContext(state.baseOptions);
    const previous = activeLease;
    activeLease = this;
    activeContexts.push(context);
    try {
      return operation();
    } finally {
      activeContexts.pop();
      activeLease = previous;
      // Retain the project; drop every source file so the next operation cannot
      // observe a declaration from this one.
      context.clearFiles();
    }
  }

  close(): void {
    const state = this.#state;
    if (activeLease === this) {
      throw new Error('Compilation context lease cannot be closed inside its own operation');
    }
    state.context?.clearFiles();
    state.context = undefined;
    state.closed = true;
  }
}

/**
 * Create a caller-owned scope that reuses one analysis project across calls.
 *
 * `tsConfigFilePath` binds the lease's project. A call that explicitly requests
 * a different project rebuilds it rather than validating under the wrong
 * compiler options; the rebuild is counted by `projectRebuildCount`.
 */
export function createCompilationContextLease(options: GenerateOptions = {}): CompilationContextLease {
  return new LibraryCompilationContextLease({
    baseOptions: { ...options },
    context: undefined,
    closed: false
  });
}

