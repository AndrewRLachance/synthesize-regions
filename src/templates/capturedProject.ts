import { dirname, posix, resolve } from 'node:path'

import ts from 'typescript'

import { compareCodeUnits } from './deterministic.js'

export type CapturedCompilerIssueKind = 'configuration' | 'global' | 'syntax' | 'semantic'

/** Source-free compiler issue emitted by the hermetic captured-project builder. */
export interface CapturedCompilerIssue {
	readonly kind: CapturedCompilerIssueKind
	readonly code: number
	readonly category: 'error' | 'warning' | 'suggestion' | 'message'
	readonly message: string
	readonly path?: string
	readonly start?: number
	readonly length?: number
}

export interface CapturedTypeScriptProjectOptions {
	readonly files: ReadonlyMap<string, string>
	readonly workspaceRoot?: string
	readonly tsConfigFilePath?: string
	readonly semantic: boolean
	/** Canonical captured tsconfig paths explicitly allowed as project references. */
	readonly authorizedProjectReferences?: readonly string[]
}

export interface CapturedTypeScriptProjectResult {
	readonly compilerOptions: Readonly<ts.CompilerOptions>
	readonly rootFilePaths: readonly string[]
	readonly sourceFilePaths: readonly string[]
	readonly projectReferencePaths: readonly string[]
	readonly issues: readonly CapturedCompilerIssue[]
}

const DEFAULT_OPTIONS: ts.CompilerOptions = {
	target: ts.ScriptTarget.ES2022,
	module: ts.ModuleKind.ES2022,
	moduleResolution: ts.ModuleResolutionKind.Bundler,
	strict: true,
	skipLibCheck: true,
	noEmit: true
}

function portable(path: string): string {
	return posix.normalize(path.replace(/\\/gu, '/'))
}

function isInside(root: string, path: string): boolean {
	const relative = posix.relative(root, path)
	return relative === '' || (relative !== '..' && !relative.startsWith('../') && !posix.isAbsolute(relative))
}

function diagnosticCategory(category: ts.DiagnosticCategory): CapturedCompilerIssue['category'] {
	switch (category) {
		case ts.DiagnosticCategory.Warning: return 'warning'
		case ts.DiagnosticCategory.Suggestion: return 'suggestion'
		case ts.DiagnosticCategory.Message: return 'message'
		default: return 'error'
	}
}

function relativeCapturedPath(root: string, fileName: string): string | undefined {
	const normalized = portable(fileName)
	return isInside(root, normalized) ? portable(posix.relative(root, normalized)) : undefined
}

function compilerIssue(
	kind: CapturedCompilerIssueKind,
	diagnostic: ts.Diagnostic,
	root: string,
	fallbackPath?: string
): CapturedCompilerIssue {
	const path = diagnostic.file === undefined
		? fallbackPath
		: relativeCapturedPath(root, diagnostic.file.fileName) ?? portable(diagnostic.file.fileName)
	return {
		kind,
		code: diagnostic.code,
		category: diagnosticCategory(diagnostic.category),
		message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
		...(path === undefined ? {} : { path }),
		...(diagnostic.start === undefined ? {} : { start: diagnostic.start }),
		...(diagnostic.length === undefined ? {} : { length: diagnostic.length })
	}
}

function configIssue(code: number, message: string, path?: string): CapturedCompilerIssue {
	return { kind: 'configuration', code, category: 'error', message, ...(path === undefined ? {} : { path }) }
}

function wildcardExpression(pattern: string): RegExp {
	const normalized = portable(pattern)
	let expression = '^'
	for (let index = 0; index < normalized.length; index += 1) {
		const character = normalized[index]!
		if (character === '*') {
			if (normalized[index + 1] === '*') {
				index += 1
				if (normalized[index + 1] === '/') {
					index += 1
					expression += '(?:.*/)?'
				} else {
					expression += '.*'
				}
			} else {
				expression += '[^/]*'
			}
			continue
		}
		if (character === '?') {
			expression += '[^/]'
			continue
		}
		expression += /[\\^$.*+?()[\]{}|]/u.test(character) ? `\\${character}` : character
	}
	return new RegExp(`${expression}$`, 'u')
}

function matchesPattern(path: string, pattern: string, base: string): boolean {
	let normalizedPattern = portable(pattern)
	const candidate = posix.isAbsolute(normalizedPattern) ? path : portable(posix.relative(base, path))
	if (!/[?*]/u.test(normalizedPattern)) {
		normalizedPattern = normalizedPattern.replace(/\/$/u, '')
		return candidate === normalizedPattern || candidate.startsWith(`${normalizedPattern}/`)
	}
	return wildcardExpression(normalizedPattern).test(candidate)
}

function capturedReadDirectory(
	allPaths: readonly string[],
	rootDir: string,
	extensions: readonly string[],
	excludes: readonly string[] | undefined,
	includes: readonly string[],
	depth?: number
): string[] {
	const root = portable(rootDir)
	const includePatterns = includes.length === 0 ? ['**/*'] : includes
	return allPaths.filter(path => {
		if (!isInside(root, path)) return false
		if (extensions.length > 0 && !extensions.some(extension => path.endsWith(extension))) return false
		if (depth !== undefined && posix.relative(root, path).split('/').length - 1 > depth) return false
		if (!includePatterns.some(pattern => matchesPattern(path, pattern, root))) return false
		return !(excludes ?? []).some(pattern => matchesPattern(path, pattern, root))
	}).sort(compareCodeUnits)
}

function referencedConfigPath(referencePath: string, captured: ReadonlyMap<string, string>): string {
	const normalized = portable(referencePath)
	if (captured.has(normalized)) return normalized
	const nested = portable(posix.join(normalized, 'tsconfig.json'))
	return captured.has(nested) ? nested : normalized
}

/**
 * Build and diagnose one TypeScript program from captured bytes only.
 *
 * Workspace reads never fall back to `ts.sys`. The only disk reads permitted
 * are the pinned TypeScript package's own `lib*.d.ts` files, which form the
 * trusted compiler library set and are bound into the package contract manifest.
 */
export function buildCapturedTypeScriptProject(
	options: CapturedTypeScriptProjectOptions
): CapturedTypeScriptProjectResult {
	if (options.files.size === 0) {
		return { compilerOptions: DEFAULT_OPTIONS, rootFilePaths: [], sourceFilePaths: [], projectReferencePaths: [], issues: [] }
	}

	const root = portable(resolve(options.workspaceRoot ?? '/__synthesize_regions_workspace__'))
	const captured = new Map<string, string>()
	for (const [relativePath, sourceText] of options.files) {
		captured.set(portable(resolve(root, relativePath)), sourceText)
	}
	const capturedPaths = [...captured.keys()].sort(compareCodeUnits)
	const configPath = options.tsConfigFilePath === undefined
		? undefined
		: portable(resolve(root, options.tsConfigFilePath))
	const configurationDiagnostics: ts.Diagnostic[] = []

	let compilerOptions: ts.CompilerOptions = { ...DEFAULT_OPTIONS }
	let rootNames = capturedPaths.filter(path => /\.(?:cts|mts|tsx?|d\.ts)$/u.test(path))
	let projectReferences: readonly ts.ProjectReference[] | undefined
	if (configPath !== undefined) {
		if (!captured.has(configPath)) {
			return {
				compilerOptions,
				rootFilePaths: [], sourceFilePaths: [], projectReferencePaths: [],
				issues: [configIssue(5083, `Cannot read captured project configuration ${options.tsConfigFilePath}.`, options.tsConfigFilePath)]
			}
		}
		const parseHost: ts.ParseConfigFileHost = {
			useCaseSensitiveFileNames: true,
			fileExists: fileName => captured.has(portable(fileName)),
			readFile: fileName => captured.get(portable(fileName)),
			readDirectory: (directory, extensions, excludes, includes, depth) =>
				capturedReadDirectory(capturedPaths, directory, extensions, excludes, includes, depth),
			getCurrentDirectory: () => root,
			onUnRecoverableConfigFileDiagnostic: diagnostic => configurationDiagnostics.push(diagnostic),
			realpath: path => portable(path),
			directoryExists: directory => {
				const prefix = `${portable(directory).replace(/\/$/u, '')}/`
				return capturedPaths.some(path => path.startsWith(prefix))
			},
			getDirectories: directory => {
				const normalized = `${portable(directory).replace(/\/$/u, '')}/`
				return [...new Set(capturedPaths
					.filter(path => path.startsWith(normalized))
					.map(path => path.slice(normalized.length).split('/')[0])
					.filter((part): part is string => part !== undefined && part.length > 0))]
					.sort(compareCodeUnits)
			}
		}
		const parsed = ts.getParsedCommandLineOfConfigFile(configPath, { noEmit: true }, parseHost)
		if (parsed === undefined) {
			return {
				compilerOptions,
				rootFilePaths: [], sourceFilePaths: [], projectReferencePaths: [],
				issues: configurationDiagnostics.map(diagnostic => compilerIssue('configuration', diagnostic, root, options.tsConfigFilePath))
			}
		}
		compilerOptions = { ...parsed.options, noEmit: true }
		rootNames = parsed.fileNames.map(portable)
		projectReferences = parsed.projectReferences
		configurationDiagnostics.push(...parsed.errors)
	}

	const authorizedReferences = new Set((options.authorizedProjectReferences ?? [])
		.map(path => portable(resolve(root, path))))
	const projectReferencePaths = (projectReferences ?? []).map(reference =>
		referencedConfigPath(portable(reference.path), captured)
	).sort(compareCodeUnits)
	const referenceIssues = projectReferencePaths.flatMap(path => authorizedReferences.has(path) && captured.has(path)
		? []
		: [configIssue(
			6307,
			`Project reference ${relativeCapturedPath(root, path) ?? path} is not an authorized captured tsconfig.`,
			relativeCapturedPath(root, path) ?? path
		)])

	const defaultLibraryPath = portable(ts.getDefaultLibFilePath(compilerOptions))
	const trustedLibraryDirectory = portable(dirname(defaultLibraryPath))
	const isTrustedLibrary = (path: string): boolean => {
		const normalized = portable(path)
		return posix.dirname(normalized) === trustedLibraryDirectory && /^lib(?:\..+)?\.d\.ts$/u.test(posix.basename(normalized))
	}
	const readTrustedLibrary = (path: string): string | undefined => isTrustedLibrary(path) ? ts.sys.readFile(path) : undefined
	const sourceCache = new Map<string, ts.SourceFile>()
	const host: ts.CompilerHost = {
		getSourceFile: (fileName, languageVersion) => {
			const normalized = portable(fileName)
			const existing = sourceCache.get(normalized)
			if (existing) return existing
			const sourceText = captured.get(normalized) ?? readTrustedLibrary(normalized)
			if (sourceText === undefined) return undefined
			const sourceFile = ts.createSourceFile(normalized, sourceText, languageVersion, true)
			sourceCache.set(normalized, sourceFile)
			return sourceFile
		},
		getDefaultLibFileName: () => defaultLibraryPath,
		writeFile: () => undefined,
		getCurrentDirectory: () => root,
		getCanonicalFileName: fileName => portable(fileName),
		useCaseSensitiveFileNames: () => true,
		getNewLine: () => '\n',
		fileExists: fileName => captured.has(portable(fileName)) || isTrustedLibrary(fileName),
		readFile: fileName => captured.get(portable(fileName)) ?? readTrustedLibrary(fileName),
		realpath: fileName => portable(fileName),
		directoryExists: directory => {
			const normalized = portable(directory)
			if (normalized === trustedLibraryDirectory) return true
			const prefix = `${normalized.replace(/\/$/u, '')}/`
			return capturedPaths.some(path => path.startsWith(prefix))
		},
		getDirectories: directory => {
			const normalized = `${portable(directory).replace(/\/$/u, '')}/`
			return [...new Set(capturedPaths
				.filter(path => path.startsWith(normalized))
				.map(path => path.slice(normalized.length).split('/')[0])
				.filter((part): part is string => part !== undefined && part.length > 0))]
				.sort(compareCodeUnits)
		}
	}

	const program = ts.createProgram({
		rootNames,
		options: compilerOptions,
		...(projectReferences === undefined ? {} : { projectReferences }),
		host
	})
	const issues: CapturedCompilerIssue[] = [
		...configurationDiagnostics.map(diagnostic => compilerIssue('configuration', diagnostic, root, options.tsConfigFilePath)),
		...referenceIssues,
		...program.getOptionsDiagnostics().map(diagnostic => compilerIssue('configuration', diagnostic, root, options.tsConfigFilePath)),
		...program.getGlobalDiagnostics().map(diagnostic => compilerIssue('global', diagnostic, root)),
		...program.getSyntacticDiagnostics().map(diagnostic => compilerIssue('syntax', diagnostic, root)),
		...(options.semantic ? program.getSemanticDiagnostics().map(diagnostic => compilerIssue('semantic', diagnostic, root)) : [])
	]
	const sourceFilePaths = program.getSourceFiles()
		.map(sourceFile => relativeCapturedPath(root, sourceFile.fileName))
		.filter((path): path is string => path !== undefined)
		.sort(compareCodeUnits)

	return {
		compilerOptions,
		rootFilePaths: rootNames.map(path => relativeCapturedPath(root, path) ?? path).sort(compareCodeUnits),
		sourceFilePaths,
		projectReferencePaths: projectReferencePaths.map(path => relativeCapturedPath(root, path) ?? path),
		issues: issues.sort((left, right) =>
			compareCodeUnits(left.path ?? '', right.path ?? '')
			|| (left.start ?? -1) - (right.start ?? -1)
			|| left.code - right.code
			|| compareCodeUnits(left.message, right.message))
	}
}
