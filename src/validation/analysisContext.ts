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

/** One operation-local project whose scratch files never escape the operation. */
class TypeScriptAnalysisContext {
  readonly project: Project;
  #scratchFile: SourceFile | undefined;

  constructor(options: GenerateOptions) {
    this.project = createIndependentAnalysisProject(options);
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

  /** Release only files created by this context; dependency files remain caller-owned. */
  dispose(): void {
    this.clearScratchFile();
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
  const inherited = contextFor(options);
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
  const context = contextFor(options);
  if (context !== undefined) return context.createSourceFile(sourceText, filePath);

  return createIndependentAnalysisProject(options).createSourceFile(filePath, sourceText, {
    overwrite: true,
    scriptKind: ScriptKind.TS
  });
}

