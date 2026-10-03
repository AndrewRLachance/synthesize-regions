import {
	type AnyEffectFamilyTemplateDefinitionInput,
	defineTemplate,
	effectValueInput,
	expressionOutput,
	fileSystemRequirement,
	layerType,
	loggerType,
	marker,
	platformErrorType,
	typedExpressionInput
} from '../platform/effect-platform-template-helpers.js'

const loggerInput = (description: string) => typedExpressionInput(description, loggerType())

export const PlatformLoggerFileLayerTemplate = defineTemplate({
	modelId: 'PlatformLoggerFileLayer',
	version: '1.0.0',
	description: 'Creates a logger layer that writes string-formatted logs to a file.',
	inputs: {
		logger: loggerInput('String-based logger to write to the file.'),
		path: effectValueInput('Destination log file path.', { ts: 'string' })
	},
	output: expressionOutput(
		'Logger layer requiring FileSystem access.',
		layerType('unknown', platformErrorType, fileSystemRequirement)
	),
	source: `Logger.layer([
	${marker('expression', 'logger', 'Logger.formatLogFmt')}.pipe(
		Logger.toFile(${marker('expression', 'path', '"/tmp/log.txt"')})
	)
])`
})

export const PlatformLoggerConsoleAndFileLayerTemplate = defineTemplate({
	modelId: 'PlatformLoggerConsoleAndFileLayer',
	version: '1.0.0',
	description: 'Creates a logger layer that writes pretty logs to the console and string-formatted logs to a file.',
	inputs: {
		fileLogger: loggerInput('String-based logger used for file output.'),
		path: effectValueInput('Destination log file path.', { ts: 'string' })
	},
	output: expressionOutput(
		'Combined console-and-file logger layer requiring FileSystem access.',
		layerType('unknown', platformErrorType, fileSystemRequirement)
	),
	source: `Logger.layer([
	Logger.consolePretty(),
	${marker('expression', 'fileLogger', 'Logger.formatLogFmt')}.pipe(
		Logger.toFile(${marker('expression', 'path', '"/tmp/log.txt"')})
	)
])`
})

export const NodeFileSystemLayerTemplate = defineTemplate({
	modelId: 'NodeFileSystemLayer',
	version: '1.0.0',
	inputs: {},
	description: 'Provides the Node.js FileSystem implementation.',
	output: expressionOutput(
		'Node.js FileSystem layer.',
		layerType(fileSystemRequirement, 'never', 'never')
	),
	source: 'NodeFileSystem.layer'
})

export const effectPlatformLoggerGraphTemplateInputs = [
	PlatformLoggerFileLayerTemplate,
	PlatformLoggerConsoleAndFileLayerTemplate,
	NodeFileSystemLayerTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
