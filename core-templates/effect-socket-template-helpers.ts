import type { TypeDescriptor } from '../src/templates.js'
import { nominalType, typedExpressionInput } from './effect-template-helpers.js'

/** Shared Effect v4 unstable/socket template descriptors. */
export const socketScopeRequirement = '{ readonly __effectScopeRequirement: "Scope" }'
export const socketRequirement = '{ readonly __socketRequirement: "Socket" }'
export const socketServerRequirement = '{ readonly __socketServerRequirement: "SocketServer" }'
export const webSocketConstructorRequirement = '{ readonly __webSocketConstructorRequirement: "WebSocketConstructor" }'

export const socketErrorType = '{ readonly _tag: "SocketError"; readonly reason: unknown }'
export const socketServerErrorType = '{ readonly _tag: "SocketServerError"; readonly reason: unknown }'

export const socketType = (): TypeDescriptor => nominalType('effect/unstable/socket/Socket')
export const socketReaderType = (frame = 'Uint8Array | string'): TypeDescriptor =>
	nominalType('effect/unstable/socket/Socket.Reader', { socketReaderFrame: frame })
export const socketWriterType = (): TypeDescriptor => nominalType('effect/unstable/socket/Socket.Writer')
export const socketCloseEventType = (): TypeDescriptor => nominalType('effect/unstable/socket/Socket.CloseEvent')
export const socketServerType = (): TypeDescriptor => nominalType('effect/unstable/socket/SocketServer.SocketServer')
export const socketAddressType = (): TypeDescriptor => nominalType('effect/unstable/socket/SocketServer.Address')
export const webSocketConstructorType = (): TypeDescriptor => nominalType('effect/unstable/socket/Socket.WebSocketConstructor')
export const webSocketLikeType = (): TypeDescriptor => nominalType('effect/unstable/socket/Socket.WebSocketLike')
export const inputTransformStreamType = (): TypeDescriptor => nominalType('effect/unstable/socket/Socket.InputTransformStream')

export const channelType = (
	output = 'unknown',
	error = 'unknown',
	done = 'unknown',
	input = 'unknown',
	inputError = 'unknown',
	inputDone = 'unknown',
	requirements = 'never'
): TypeDescriptor => nominalType('effect/Channel', {
	channelOutput: output,
	channelError: error,
	channelDone: done,
	channelInput: input,
	channelInputError: inputError,
	channelInputDone: inputDone,
	channelRequirements: requirements
})

export const nonEmptyReadonlyArrayTs = (value: string): string => `readonly [${value}, ...Array<${value}>]`

export const socketInput = (description: string) => typedExpressionInput(description, socketType())
export const socketReaderInput = (description: string, frame = 'Uint8Array | string') =>
	typedExpressionInput(description, socketReaderType(frame))
export const socketWriterInput = (description: string) => typedExpressionInput(description, socketWriterType())
export const socketServerInput = (description: string) => typedExpressionInput(description, socketServerType())
