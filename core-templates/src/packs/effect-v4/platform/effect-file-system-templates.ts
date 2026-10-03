import {
	type AnyEffectFamilyTemplateDefinitionInput,
	defineTemplate,
	effectType,
	effectValueInput,
	expressionOutput,
	fileSystemRequirement,
	layerType,
	marker,
	platformErrorType,
	platformPathInput,
	platformScopeRequirement,
	valueInput
} from './effect-platform-template-helpers.js'

const fsEffect = (success = 'void', requirements = fileSystemRequirement) =>
	effectType(success, platformErrorType, requirements)

const fsScopedEffect = (success: string) =>
	fsEffect(success, `${fileSystemRequirement} | ${platformScopeRequirement}`)

export const FileSystemLayerNoopTemplate = defineTemplate({
	modelId: 'FileSystemLayerNoop',
	version: '1.0.0',
	description: 'Creates a no-operation FileSystem layer with optional method overrides for tests.',
	inputs: {
		overrides: valueInput('Optional FileSystem method overrides.')
	},
	output: expressionOutput(
		'No-op FileSystem layer.',
		layerType(fileSystemRequirement, 'never', 'never')
	),
	source: `FileSystem.layerNoop(${marker('expression', 'overrides', '{}')})`
})

export const FileSystemAccessTemplate = defineTemplate({
	modelId: 'FileSystemAccess',
	version: '1.0.0',
	description: 'Checks whether a filesystem path can be accessed.',
	inputs: {
		path: platformPathInput(),
		options: effectValueInput('Optional access-level options.', { ts: 'unknown' })
	},
	output: expressionOutput('Filesystem access check Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.access(${marker('expression', 'path', '"/tmp/file.txt"')}, ${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemExistsTemplate = defineTemplate({
	modelId: 'FileSystemExists',
	version: '1.0.0',
	description: 'Checks whether a filesystem path exists.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Filesystem existence check Effect.', fsEffect('boolean')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.exists(${marker('expression', 'path', '"/some/path"')})
})`
})

export const FileSystemCopyTemplate = defineTemplate({
	modelId: 'FileSystemCopy',
	version: '1.0.0',
	description: 'Copies a file or directory recursively-capable from one path to another.',
	inputs: {
		fromPath: platformPathInput('Source path.'),
		toPath: platformPathInput('Destination path.'),
		options: effectValueInput('Optional copy options.', { ts: 'unknown' })
	},
	output: expressionOutput('Filesystem copy Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.copy(${marker('expression', 'fromPath', '"/tmp/source"')}, ${marker('expression', 'toPath', '"/tmp/destination"')}, ${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemCopyFileTemplate = defineTemplate({
	modelId: 'FileSystemCopyFile',
	version: '1.0.0',
	description: 'Copies a single file from one path to another.',
	inputs: {
		fromPath: platformPathInput('Source file path.'),
		toPath: platformPathInput('Destination file path.')
	},
	output: expressionOutput('File copy Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.copyFile(${marker('expression', 'fromPath', '"/tmp/source.txt"')}, ${marker('expression', 'toPath', '"/tmp/destination.txt"')})
})`
})

export const FileSystemChmodTemplate = defineTemplate({
	modelId: 'FileSystemChmod',
	version: '1.0.0',
	description: 'Changes filesystem permissions for a path.',
	inputs: {
		path: platformPathInput(),
		mode: effectValueInput('Filesystem mode.', { ts: 'number' })
	},
	output: expressionOutput('Permission-change Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.chmod(${marker('expression', 'path', '"/tmp/file.txt"')}, ${marker('expression', 'mode', '0o644')})
})`
})

export const FileSystemChownTemplate = defineTemplate({
	modelId: 'FileSystemChown',
	version: '1.0.0',
	description: 'Changes the owner and group of a filesystem path.',
	inputs: {
		path: platformPathInput(),
		uid: effectValueInput('Owner user identifier.', { ts: 'number' }),
		gid: effectValueInput('Owner group identifier.', { ts: 'number' })
	},
	output: expressionOutput('Ownership-change Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.chown(${marker('expression', 'path', '"/tmp/file.txt"')}, ${marker('expression', 'uid', '0')}, ${marker('expression', 'gid', '0')})
})`
})

export const FileSystemLinkTemplate = defineTemplate({
	modelId: 'FileSystemLink',
	version: '1.0.0',
	description: 'Creates a hard link between filesystem paths.',
	inputs: {
		fromPath: platformPathInput('Existing path.'),
		toPath: platformPathInput('New hard-link path.')
	},
	output: expressionOutput('Hard-link creation Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.link(${marker('expression', 'fromPath', '"/tmp/source.txt"')}, ${marker('expression', 'toPath', '"/tmp/link.txt"')})
})`
})

export const FileSystemMakeDirectoryTemplate = defineTemplate({
	modelId: 'FileSystemMakeDirectory',
	version: '1.0.0',
	description: 'Creates a directory, optionally using recursive creation options.',
	inputs: {
		path: platformPathInput(),
		options: effectValueInput('Optional directory creation options.', { ts: 'unknown' })
	},
	output: expressionOutput('Directory creation Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.makeDirectory(${marker('expression', 'path', '"/tmp/example"')}, ${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemMakeTempDirectoryTemplate = defineTemplate({
	modelId: 'FileSystemMakeTempDirectory',
	version: '1.0.0',
	description: 'Creates a temporary directory.',
	inputs: {
		options: effectValueInput('Optional temporary-directory options.', { ts: 'unknown' })
	},
	output: expressionOutput('Temporary-directory creation Effect.', fsEffect('string')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.makeTempDirectory(${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemMakeTempDirectoryScopedTemplate = defineTemplate({
	modelId: 'FileSystemMakeTempDirectoryScoped',
	version: '1.0.0',
	description: 'Creates a temporary directory that is removed when its Scope closes.',
	inputs: {
		options: effectValueInput('Optional temporary-directory options.', { ts: 'unknown' })
	},
	output: expressionOutput('Scoped temporary-directory creation Effect.', fsScopedEffect('string')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.makeTempDirectoryScoped(${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemMakeTempFileTemplate = defineTemplate({
	modelId: 'FileSystemMakeTempFile',
	version: '1.0.0',
	description: 'Creates a temporary file.',
	inputs: {
		options: effectValueInput('Optional temporary-file options.', { ts: 'unknown' })
	},
	output: expressionOutput('Temporary-file creation Effect.', fsEffect('string')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.makeTempFile(${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemMakeTempFileScopedTemplate = defineTemplate({
	modelId: 'FileSystemMakeTempFileScoped',
	version: '1.0.0',
	description: 'Creates a temporary file that is removed when its Scope closes.',
	inputs: {
		options: effectValueInput('Optional temporary-file options.', { ts: 'unknown' })
	},
	output: expressionOutput('Scoped temporary-file creation Effect.', fsScopedEffect('string')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.makeTempFileScoped(${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemOpenTemplate = defineTemplate({
	modelId: 'FileSystemOpen',
	version: '1.0.0',
	description: 'Opens a file handle that is automatically closed when its Scope closes.',
	inputs: {
		path: platformPathInput(),
		options: effectValueInput('Optional file-open options.', { ts: 'unknown' })
	},
	output: expressionOutput('Scoped file-open Effect.', fsScopedEffect('unknown')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.open(${marker('expression', 'path', '"/tmp/file.txt"')}, ${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemReadDirectoryTemplate = defineTemplate({
	modelId: 'FileSystemReadDirectory',
	version: '1.0.0',
	description: 'Reads entries from a directory, optionally recursively.',
	inputs: {
		path: platformPathInput(),
		options: effectValueInput('Optional directory-read options.', { ts: 'unknown' })
	},
	output: expressionOutput('Directory listing Effect.', fsEffect('ReadonlyArray<string>')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.readDirectory(${marker('expression', 'path', '"/tmp"')}, ${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemReadFileTemplate = defineTemplate({
	modelId: 'FileSystemReadFile',
	version: '1.0.0',
	description: 'Reads a file as bytes.',
	inputs: {
		path: platformPathInput()
	},
	output: expressionOutput('Binary file-read Effect.', fsEffect('Uint8Array')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.readFile(${marker('expression', 'path', '"/tmp/file.bin"')})
})`
})

export const FileSystemReadFileStringTemplate = defineTemplate({
	modelId: 'FileSystemReadFileString',
	version: '1.0.0',
	description: 'Reads a file as a string.',
	inputs: {
		path: platformPathInput(),
		encoding: effectValueInput('Optional text encoding.', { ts: 'string | undefined' })
	},
	output: expressionOutput('Text file-read Effect.', fsEffect('string')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.readFileString(${marker('expression', 'path', '"./index.ts"')}, ${marker('expression', 'encoding', '"utf8"')})
})`
})

export const FileSystemReadLinkTemplate = defineTemplate({
	modelId: 'FileSystemReadLink',
	version: '1.0.0',
	description: 'Reads the destination of a symbolic link.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Symbolic-link read Effect.', fsEffect('string')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.readLink(${marker('expression', 'path', '"/tmp/link"')})
})`
})

export const FileSystemRealPathTemplate = defineTemplate({
	modelId: 'FileSystemRealPath',
	version: '1.0.0',
	description: 'Resolves a path to its canonicalized absolute pathname.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Canonical path Effect.', fsEffect('string')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.realPath(${marker('expression', 'path', '"/tmp/file.txt"')})
})`
})

export const FileSystemRemoveTemplate = defineTemplate({
	modelId: 'FileSystemRemove',
	version: '1.0.0',
	description: 'Removes a file or directory, optionally recursively.',
	inputs: {
		path: platformPathInput(),
		options: effectValueInput('Optional removal options.', { ts: 'unknown' })
	},
	output: expressionOutput('Filesystem removal Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.remove(${marker('expression', 'path', '"/tmp/example"')}, ${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemRenameTemplate = defineTemplate({
	modelId: 'FileSystemRename',
	version: '1.0.0',
	description: 'Renames or moves a filesystem entry.',
	inputs: {
		fromPath: platformPathInput('Current path.'),
		toPath: platformPathInput('New path.')
	},
	output: expressionOutput('Filesystem rename Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.rename(${marker('expression', 'fromPath', '"/tmp/old.txt"')}, ${marker('expression', 'toPath', '"/tmp/new.txt"')})
})`
})

export const FileSystemStatTemplate = defineTemplate({
	modelId: 'FileSystemStat',
	version: '1.0.0',
	description: 'Reads filesystem metadata for a path.',
	inputs: { path: platformPathInput() },
	output: expressionOutput('Filesystem stat Effect.', fsEffect('unknown')),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.stat(${marker('expression', 'path', '"/tmp/file.txt"')})
})`
})

export const FileSystemSymlinkTemplate = defineTemplate({
	modelId: 'FileSystemSymlink',
	version: '1.0.0',
	description: 'Creates a symbolic link between filesystem paths.',
	inputs: {
		fromPath: platformPathInput('Link target path.'),
		toPath: platformPathInput('New symbolic-link path.')
	},
	output: expressionOutput('Symbolic-link creation Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.symlink(${marker('expression', 'fromPath', '"/tmp/source.txt"')}, ${marker('expression', 'toPath', '"/tmp/link.txt"')})
})`
})

export const FileSystemTruncateTemplate = defineTemplate({
	modelId: 'FileSystemTruncate',
	version: '1.0.0',
	description: 'Truncates a file to the requested length.',
	inputs: {
		path: platformPathInput(),
		length: effectValueInput('Target file length.', { ts: 'number | undefined' })
	},
	output: expressionOutput('File truncation Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.truncate(${marker('expression', 'path', '"/tmp/file.txt"')}, ${marker('expression', 'length', '0')})
})`
})

export const FileSystemUtimesTemplate = defineTemplate({
	modelId: 'FileSystemUtimes',
	version: '1.0.0',
	description: 'Changes access and modification timestamps for a filesystem path.',
	inputs: {
		path: platformPathInput(),
		atime: effectValueInput('Access time value.', { ts: 'unknown' }),
		mtime: effectValueInput('Modification time value.', { ts: 'unknown' })
	},
	output: expressionOutput('Filesystem timestamp update Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.utimes(${marker('expression', 'path', '"/tmp/file.txt"')}, ${marker('expression', 'atime', 'new Date()')}, ${marker('expression', 'mtime', 'new Date()')})
})`
})

export const FileSystemWriteFileTemplate = defineTemplate({
	modelId: 'FileSystemWriteFile',
	version: '1.0.0',
	description: 'Writes bytes to a file.',
	inputs: {
		path: platformPathInput(),
		data: effectValueInput('Bytes to write.', { ts: 'Uint8Array' }),
		options: effectValueInput('Optional file-write options.', { ts: 'unknown' })
	},
	output: expressionOutput('Binary file-write Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.writeFile(${marker('expression', 'path', '"/tmp/file.bin"')}, ${marker('expression', 'data', 'new Uint8Array()')}, ${marker('expression', 'options', 'undefined')})
})`
})

export const FileSystemWriteFileStringTemplate = defineTemplate({
	modelId: 'FileSystemWriteFileString',
	version: '1.0.0',
	description: 'Writes a string to a file.',
	inputs: {
		path: platformPathInput(),
		data: effectValueInput('Text to write.', { ts: 'string' }),
		options: effectValueInput('Optional string-write options.', { ts: 'unknown' })
	},
	output: expressionOutput('Text file-write Effect.', fsEffect()),
	source: `Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	return yield* fs.writeFileString(${marker('expression', 'path', '"/tmp/file.txt"')}, ${marker('expression', 'data', '"text"')}, ${marker('expression', 'options', 'undefined')})
})`
})

export const effectFileSystemGraphTemplateInputs = [
	FileSystemLayerNoopTemplate,
	FileSystemAccessTemplate,
	FileSystemExistsTemplate,
	FileSystemCopyTemplate,
	FileSystemCopyFileTemplate,
	FileSystemChmodTemplate,
	FileSystemChownTemplate,
	FileSystemLinkTemplate,
	FileSystemMakeDirectoryTemplate,
	FileSystemMakeTempDirectoryTemplate,
	FileSystemMakeTempDirectoryScopedTemplate,
	FileSystemMakeTempFileTemplate,
	FileSystemMakeTempFileScopedTemplate,
	FileSystemOpenTemplate,
	FileSystemReadDirectoryTemplate,
	FileSystemReadFileTemplate,
	FileSystemReadFileStringTemplate,
	FileSystemReadLinkTemplate,
	FileSystemRealPathTemplate,
	FileSystemRemoveTemplate,
	FileSystemRenameTemplate,
	FileSystemStatTemplate,
	FileSystemSymlinkTemplate,
	FileSystemTruncateTemplate,
	FileSystemUtimesTemplate,
	FileSystemWriteFileTemplate,
	FileSystemWriteFileStringTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
