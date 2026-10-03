import {
	type AnyEffectFamilyTemplateDefinitionInput,
	defineTemplate,
	effectType,
	effectValueInput,
	expressionOutput,
	layerType,
	marker,
	pathRequirement,
	platformPathInput
} from './effect-platform-template-helpers.js'

const pathEffect = (success: string) => effectType(success, 'never', pathRequirement)

export const PathLayerTemplate = defineTemplate({
	modelId: 'PathLayer',
	version: '1.0.0',
	inputs: {},
	description: 'Provides the platform-independent Path service.',
	output: expressionOutput('Layer providing Path.Path.', layerType(pathRequirement, 'never', 'never')),
	source: 'Path.layer'
})

export const PathJoinTemplate = defineTemplate({
	modelId: 'PathJoin',
	version: '1.0.0',
	description: 'Joins path segments using the active Path service.',
	inputs: {
		segments: effectValueInput('Ordered path segments.', { ts: 'ReadonlyArray<string>' })
	},
	output: expressionOutput('Effect producing the joined path.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const path = yield* Path.Path
	return path.join(...${marker('expression', 'segments', '["tmp", "file.txt"]')})
})`
})

export const PathBasenameTemplate = defineTemplate({
	modelId: 'PathBasename',
	version: '1.0.0',
	description: 'Returns the last part of a path, optionally removing a suffix.',
	inputs: {
		path: platformPathInput(),
		suffix: effectValueInput('Optional suffix to remove.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Effect producing the basename.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const pathService = yield* Path.Path
	return pathService.basename(${marker('expression', 'path', '"tmp/file.txt"')}, ${marker('expression', 'suffix', 'undefined')})
})`
})

export const PathDirnameTemplate = defineTemplate({
	modelId: 'PathDirname',
	version: '1.0.0',
	description: 'Returns the directory portion of a path.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Effect producing the directory path.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const pathService = yield* Path.Path
	return pathService.dirname(${marker('expression', 'path', '"tmp/file.txt"')})
})`
})

export const PathExtnameTemplate = defineTemplate({
	modelId: 'PathExtname',
	version: '1.0.0',
	description: 'Returns the file extension portion of a path.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Effect producing the extension.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const pathService = yield* Path.Path
	return pathService.extname(${marker('expression', 'path', '"tmp/file.txt"')})
})`
})

export const PathNormalizeTemplate = defineTemplate({
	modelId: 'PathNormalize',
	version: '1.0.0',
	description: 'Normalizes a path by resolving dot and dot-dot segments.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Effect producing the normalized path.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const pathService = yield* Path.Path
	return pathService.normalize(${marker('expression', 'path', '"tmp/../file.txt"')})
})`
})

export const PathIsAbsoluteTemplate = defineTemplate({
	modelId: 'PathIsAbsolute',
	version: '1.0.0',
	description: 'Checks whether a path is absolute.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Effect producing whether the path is absolute.', pathEffect('boolean')),
	source: `Effect.gen(function* () {
	const pathService = yield* Path.Path
	return pathService.isAbsolute(${marker('expression', 'path', '"/tmp/file.txt"')})
})`
})

export const PathRelativeTemplate = defineTemplate({
	modelId: 'PathRelative',
	version: '1.0.0',
	description: 'Computes the relative path from one path to another.',
	inputs: {
		from: platformPathInput('Starting path.'),
		to: platformPathInput('Destination path.')
	},
	output: expressionOutput('Effect producing the relative path.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const pathService = yield* Path.Path
	return pathService.relative(${marker('expression', 'from', '"/tmp"')}, ${marker('expression', 'to', '"/tmp/file.txt"')})
})`
})

export const PathResolveTemplate = defineTemplate({
	modelId: 'PathResolve',
	version: '1.0.0',
	description: 'Resolves path segments to an absolute path.',
	inputs: {
		segments: effectValueInput('Ordered path segments.', { ts: 'ReadonlyArray<string>' })
	},
	output: expressionOutput('Effect producing the resolved absolute path.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const path = yield* Path.Path
	return path.resolve(...${marker('expression', 'segments', '["tmp", "file.txt"]')})
})`
})

export const PathParseTemplate = defineTemplate({
	modelId: 'PathParse',
	version: '1.0.0',
	description: 'Parses a path into its path-segment object.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Effect producing the parsed path object.', pathEffect('unknown')),
	source: `Effect.gen(function* () {
	const pathService = yield* Path.Path
	return pathService.parse(${marker('expression', 'path', '"/tmp/file.txt"')})
})`
})

export const PathFormatTemplate = defineTemplate({
	modelId: 'PathFormat',
	version: '1.0.0',
	description: 'Formats a parsed path object into a path string.',
	inputs: {
		pathObject: effectValueInput('Path object accepted by Path.format.', { ts: 'unknown' })
	},
	output: expressionOutput('Effect producing the formatted path.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const path = yield* Path.Path
	return path.format(${marker('expression', 'pathObject', '{}')})
})`
})

export const PathFromFileUrlTemplate = defineTemplate({
	modelId: 'PathFromFileUrl',
	version: '1.0.0',
	description: 'Converts a file URL to a filesystem path.',
	inputs: {
		url: effectValueInput('File URL.', { ts: '{ readonly href: string }' })
	},
	output: expressionOutput('Effect producing the filesystem path.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const path = yield* Path.Path
	return path.fromFileUrl(${marker('expression', 'url', 'new URL("file:///tmp/file.txt")')})
})`
})

export const PathToFileUrlTemplate = defineTemplate({
	modelId: 'PathToFileUrl',
	version: '1.0.0',
	description: 'Converts a filesystem path to a file URL.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Effect producing the file URL.', pathEffect('{ readonly href: string }')),
	source: `Effect.gen(function* () {
	const pathService = yield* Path.Path
	return pathService.toFileUrl(${marker('expression', 'path', '"/tmp/file.txt"')})
})`
})

export const PathToNamespacedPathTemplate = defineTemplate({
	modelId: 'PathToNamespacedPath',
	version: '1.0.0',
	description: 'Converts a path to its platform-specific namespaced representation.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Effect producing the namespaced path.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const pathService = yield* Path.Path
	return pathService.toNamespacedPath(${marker('expression', 'path', '"C:\\\\tmp\\\\file.txt"')})
})`
})

export const PathSeparatorTemplate = defineTemplate({
	modelId: 'PathSeparator',
	version: '1.0.0',
	inputs: {},
	description: 'Reads the active platform path separator.',
	output: expressionOutput('Effect producing the platform path separator.', pathEffect('string')),
	source: `Effect.gen(function* () {
	const path = yield* Path.Path
	return path.sep
})`
})

export const effectPathGraphTemplateInputs = [
	PathLayerTemplate,
	PathJoinTemplate,
	PathBasenameTemplate,
	PathDirnameTemplate,
	PathExtnameTemplate,
	PathNormalizeTemplate,
	PathIsAbsoluteTemplate,
	PathRelativeTemplate,
	PathResolveTemplate,
	PathParseTemplate,
	PathFormatTemplate,
	PathFromFileUrlTemplate,
	PathToFileUrlTemplate,
	PathToNamespacedPathTemplate,
	PathSeparatorTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
