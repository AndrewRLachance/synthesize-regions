import {
	type AnyEffectFamilyTemplateDefinitionInput,
	defineTemplate,
	effectType,
	effectValueInput,
	expressionOutput,
	layerType,
	marker,
	platformErrorType,
	terminalQuitErrorType,
	terminalRequirement
} from './effect-platform-template-helpers.js'

export const TerminalDisplayTemplate = defineTemplate({
	modelId: 'TerminalDisplay',
	version: '1.0.0',
	description: 'Displays text through the active Terminal service.',
	inputs: {
		message: effectValueInput('Text to display.', { ts: 'string' })
	},
	output: expressionOutput(
		'Terminal display Effect.',
		effectType('void', platformErrorType, terminalRequirement)
	),
	source: `Effect.gen(function* () {
	const terminal = yield* Terminal.Terminal
	return yield* terminal.display(${marker('expression', 'message', '"a message\\n"')})
})`
})

export const TerminalReadLineTemplate = defineTemplate({
	modelId: 'TerminalReadLine',
	version: '1.0.0',
	inputs: {},
	description: 'Reads one line from standard input through the active Terminal service.',
	output: expressionOutput(
		'Terminal line-read Effect.',
		effectType('string', `${terminalQuitErrorType} | ${platformErrorType}`, terminalRequirement)
	),
	source: `Effect.gen(function* () {
	const terminal = yield* Terminal.Terminal
	return yield* terminal.readLine
})`
})

export const NodeTerminalLayerTemplate = defineTemplate({
	modelId: 'NodeTerminalLayer',
	version: '1.0.0',
	inputs: {},
	description: 'Provides the Node.js Terminal implementation.',
	output: expressionOutput(
		'Node.js Terminal layer.',
		layerType(terminalRequirement, 'never', 'never')
	),
	source: 'NodeTerminal.layer'
})

export const effectTerminalGraphTemplateInputs = [
	TerminalDisplayTemplate,
	TerminalReadLineTemplate,
	NodeTerminalLayerTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
