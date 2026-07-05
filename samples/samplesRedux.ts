import { fragmentPort, rawCodePort, literalPort, unionPort, defineTemplate } from '../src/templates.js'
import type { GraphTemplateDefinitionInput } from '../src/templates/definition.js'
import type {
  FragmentInputPort,
  InputPort,
  LiteralInputPort,
  OutputPort,
  RawCodeInputPort,
  RawCodePolicy,
  RegionKind,
  TypeDescriptor} from '../src/templates/graphTypes.js'

export type AnyGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
  string,
  Record<string, InputPort>
>



function out(kind: RegionKind, extra: Omit<OutputPort, 'kind'> = {}): OutputPort {
  return { kind, ...extra }
}

const unknownType: TypeDescriptor = { ts: 'unknown', schema: true }
const stringType: TypeDescriptor = { ts: 'string', schema: { type: 'string' } }
const booleanType: TypeDescriptor = { ts: 'boolean', schema: { type: 'boolean' } }
const numberType: TypeDescriptor = { ts: 'number', schema: { type: 'number' } }
const voidType: TypeDescriptor = { ts: 'void' }
const reactNodeType: TypeDescriptor = { ts: 'React.ReactNode' }
const reactElementType: TypeDescriptor = { ts: 'React.ReactElement' }
const reduxActionType: TypeDescriptor = { ts: 'UnknownAction' }
const reduxPayloadActionType: TypeDescriptor = { ts: 'PayloadAction<unknown>' }
const reduxReducerType: TypeDescriptor = { ts: 'Reducer' }
const reduxReducerMapType: TypeDescriptor = { ts: 'ReducersMapObject' }
const reduxStoreType: TypeDescriptor = { ts: 'EnhancedStore' }
const reduxMiddlewareType: TypeDescriptor = { ts: 'Middleware' }
const reduxDispatchType: TypeDescriptor = { ts: 'Dispatch' }
const reduxSelectorType: TypeDescriptor = { ts: '(state: unknown) => unknown' }
const reduxSliceType: TypeDescriptor = { ts: 'Slice' }
const reduxActionCreatorType: TypeDescriptor = { ts: 'ActionCreatorWithPayload<unknown> | ActionCreatorWithoutPayload' }
const reduxAsyncThunkType: TypeDescriptor = { ts: 'AsyncThunk<unknown, unknown, object>' }
const reduxEntityAdapterType: TypeDescriptor = { ts: 'EntityAdapter<unknown>' }
const reduxEntityStateType: TypeDescriptor = { ts: 'EntityState<unknown, unknown>' }
const rtkQueryApiType: TypeDescriptor = { ts: 'Api<any, any, any, any>' }
const rtkQueryEndpointPropertyType: TypeDescriptor = { ts: 'endpoint definition object property' }
const listenerMiddlewareType: TypeDescriptor = { ts: 'ListenerMiddlewareInstance' }
const sagaEffectType: TypeDescriptor = { ts: 'SagaIterator | Effect' }

const safeRawExpressionPolicy: RawCodePolicy = {
  description: 'Single-line expression. Dangerous globals and module-loading constructs are rejected before generation.',
  maxLength: 900,
  allowNewlines: false,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: [
    '\\bnew\\s+Function\\b',
    '\\bwhile\\s*\\(',
    '\\bfor\\s*\\(',
    '\\bclass\\b'
  ]
}

const safeRawObjectPolicy: RawCodePolicy = {
  description: 'Single-line object or function expression for Redux configuration blocks.',
  maxLength: 1600,
  allowNewlines: false,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: ['\\bnew\\s+Function\\b', '\\bwhile\\s*\\(']
}

const safeRawCallbackPolicy: RawCodePolicy = {
  description: 'Short callback/function expression for Redux Toolkit reducers, thunks, selectors, and endpoint builders.',
  maxLength: 1800,
  allowNewlines: true,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: ['\\bnew\\s+Function\\b']
}

const safeRawStatementPolicy: RawCodePolicy = {
  description: 'Short statement block for generated Redux glue code.',
  maxLength: 2200,
  allowNewlines: true,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: ['\\bnew\\s+Function\\b']
}

const identifierNameSchema = {
  type: 'string',
  pattern: '^[$A-Za-z_][$A-Za-z0-9_]*$'
}

const propertyKeySchema = {
  type: 'string',
  minLength: 1
}

const stringArraySchema = {
  type: 'array',
  items: { type: 'string' }
}

const expressionFragment = (description?: string, type?: TypeDescriptor): FragmentInputPort =>
  fragmentPort({
    regionKind: 'expression',
    accepts: {
      outputKind: 'expression',
      ...(type ? { type } : {})
    },
    ...(description ? { description } : {})
  })

const expressionSuffixFragment = (description?: string): FragmentInputPort =>
  fragmentPort({
    regionKind: 'expressionSuffix',
    accepts: { outputKind: 'expressionSuffix' },
    ...(description ? { description } : {})
  })

const statementFragment = (description?: string): FragmentInputPort =>
  fragmentPort({
    regionKind: 'statement',
    accepts: { outputKind: 'statement' },
    ...(description ? { description } : {})
  })

const objectPropertyFragment = (description?: string, type?: TypeDescriptor): FragmentInputPort =>
  fragmentPort({
    regionKind: 'objectProperty',
    accepts: {
      outputKind: 'objectProperty',
      ...(type ? { type } : {})
    },
    ...(description ? { description } : {})
  })

const rawExpression = (description?: string, type?: TypeDescriptor): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawExpressionPolicy,
    ...(type ? { type } : {}),
    ...(description ? { description } : {})
  })

const rawObjectExpression = (description?: string, type?: TypeDescriptor): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawObjectPolicy,
    ...(type ? { type } : {}),
    ...(description ? { description } : {})
  })

const rawCallbackExpression = (description?: string, type?: TypeDescriptor): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawCallbackPolicy,
    ...(type ? { type } : {}),
    ...(description ? { description } : {})
  })

const rawStatement = (description?: string): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'statement',
    policy: safeRawStatementPolicy,
    ...(description ? { description } : {})
  })

const stringLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'string',
    schema: { type: 'string' },
    ...(description ? { description } : {})
  })

const booleanLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'boolean',
    schema: { type: 'boolean' },
    ...(description ? { description } : {})
  })

const numberLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'number',
    schema: { type: 'number' },
    ...(description ? { description } : {})
  })

const identifierLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'identifier',
    schema: identifierNameSchema,
    ...(description ? { description } : {})
  })

const stringArrayLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'expression',
    schema: stringArraySchema,
    ...(description ? { description } : {})
  })

const keyLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'string',
    schema: propertyKeySchema,
    ...(description ? { description } : {})
  })

const expressionInput = (description: string = '', type: TypeDescriptor = {}): InputPort =>
  unionPort({
    description,
    options: [
      expressionFragment(description ?? '', type),
      rawExpression(description ?? '', type)
    ]
  })

const callbackInput = (description: string = '', type: TypeDescriptor = {}): InputPort =>
  unionPort({
    description,
    options: [
      expressionFragment(description, type),
      rawCallbackExpression(description, type)
    ]
  })

// -----------------------------------------------------------------------------
// Redux and Redux Toolkit templates.
//
// These definitions assume the generated code context already imports the
// bindings required by a selected template, commonly from:
// - '@reduxjs/toolkit': configureStore, createSlice, createAsyncThunk,
//   createAction, createReducer, combineReducers, createEntityAdapter,
//   createListenerMiddleware, isAnyOf, isAllOf, isPending, isFulfilled,
//   isRejected, createSelector
// - '@reduxjs/toolkit/query/react': createApi, fetchBaseQuery
// - 'react-redux': Provider, useDispatch, useSelector, useStore, shallowEqual
// - 'redux-persist': persistReducer, persistStore
// - 'redux-persist/integration/react': PersistGate
// - 'redux-saga/effects': takeLatest, takeEvery, call, put, select, all, fork
// -----------------------------------------------------------------------------

export const ReduxConfigureStoreTemplate = defineTemplate({
  modelId: 'ReduxConfigureStore',
  version: '1.0.0',
  description: 'Creates a Redux Toolkit store with configureStore({ reducer }).',
  inputs: {
    reducer: expressionInput('Root reducer or reducer map object.', reduxReducerType)
  },
  output: out('expression', { type: reduxStoreType }),
  template: r => `configureStore({ reducer: ${r('reducer')} })`
})

export const ReduxConfigureStoreWithMiddlewareTemplate = defineTemplate({
  modelId: 'ReduxConfigureStoreWithMiddleware',
  version: '1.0.0',
  description: 'Creates a Redux Toolkit store with a reducer and explicit middleware callback.',
  inputs: {
    reducer: expressionInput('Root reducer or reducer map object.', reduxReducerType),
    middleware: callbackInput('configureStore middleware callback, usually `getDefaultMiddleware => getDefaultMiddleware().concat(...)`.')
  },
  output: out('expression', { type: reduxStoreType }),
  template: r => `configureStore({ reducer: ${r('reducer')}, middleware: ${r('middleware')} })`
})

export const ReduxConfigureStoreFullTemplate = defineTemplate({
  modelId: 'ReduxConfigureStoreFull',
  version: '1.0.0',
  description: 'Creates a Redux Toolkit store from a full configureStore options object.',
  inputs: {
    options: rawObjectExpression('Full configureStore options object, for example `{ reducer, middleware, devTools, preloadedState }`.', reduxStoreType)
  },
  output: out('expression', { type: reduxStoreType }),
  template: r => `configureStore(${r('options')})`
})

export const ReduxCombineReducersTemplate = defineTemplate({
  modelId: 'ReduxCombineReducers',
  version: '1.0.0',
  description: 'Combines slice reducers with Redux Toolkit combineReducers(reducers).',
  inputs: {
    reducers: rawObjectExpression('Reducer map object.', reduxReducerMapType)
  },
  output: out('expression', { type: reduxReducerType }),
  template: r => `combineReducers(${r('reducers')})`
})

export const ReduxReducerMapPropertyTemplate = defineTemplate({
  modelId: 'ReduxReducerMapProperty',
  version: '1.0.0',
  description: 'Creates one object property for a reducer map, such as `todos: todosReducer`.',
  inputs: {
    key: keyLiteral('Reducer key in the root state.'),
    reducer: expressionInput('Reducer expression.', reduxReducerType)
  },
  output: out('objectProperty'),
  template: r => `${r('key')}: ${r('reducer')}`
})

export const ReduxCreateSliceTemplate = defineTemplate({
  modelId: 'ReduxCreateSlice',
  version: '1.0.0',
  description: 'Creates a Redux Toolkit slice from name, initialState, and reducers object.',
  inputs: {
    name: stringLiteral('Slice name.'),
    initialState: expressionInput('Initial state expression.'),
    reducers: rawObjectExpression('Reducers object. Case reducers may use Immer-style mutations.')
  },
  output: out('expression', { type: reduxSliceType }),
  template: r => `createSlice({ name: ${r('name')}, initialState: ${r('initialState')}, reducers: ${r('reducers')} })`
})

export const ReduxCreateSliceWithExtraReducersTemplate = defineTemplate({
  modelId: 'ReduxCreateSliceWithExtraReducers',
  version: '1.0.0',
  description: 'Creates a Redux Toolkit slice with reducers and an extraReducers builder callback.',
  inputs: {
    name: stringLiteral('Slice name.'),
    initialState: expressionInput('Initial state expression.'),
    reducers: rawObjectExpression('Reducers object.'),
    extraReducers: callbackInput('extraReducers builder callback, such as `builder => builder.addCase(...)`.')
  },
  output: out('expression', { type: reduxSliceType }),
  template: r => `createSlice({ name: ${r('name')}, initialState: ${r('initialState')}, reducers: ${r('reducers')}, extraReducers: ${r('extraReducers')} })`
})

export const ReduxSliceReducerTemplate = defineTemplate({
  modelId: 'ReduxSliceReducer',
  version: '1.0.0',
  description: 'Reads the reducer from a Redux Toolkit slice.',
  inputs: {
    slice: expressionInput('Redux Toolkit slice expression.', reduxSliceType)
  },
  output: out('expression', { type: reduxReducerType }),
  template: r => `${r('slice')}.reducer`
})

export const ReduxSliceActionsTemplate = defineTemplate({
  modelId: 'ReduxSliceActions',
  version: '1.0.0',
  description: 'Reads the action creator map from a Redux Toolkit slice.',
  inputs: {
    slice: expressionInput('Redux Toolkit slice expression.', reduxSliceType)
  },
  output: out('expression'),
  template: r => `${r('slice')}.actions`
})

export const ReduxSliceActionTemplate = defineTemplate({
  modelId: 'ReduxSliceAction',
  version: '1.0.0',
  description: 'Reads one action creator from a Redux Toolkit slice by action name.',
  inputs: {
    slice: expressionInput('Redux Toolkit slice expression.', reduxSliceType),
    actionName: identifierLiteral('Action creator property name.')
  },
  output: out('expression', { type: reduxActionCreatorType }),
  template: r => `${r('slice')}.actions.${r('actionName')}`
})

export const ReduxCreateActionTemplate = defineTemplate({
  modelId: 'ReduxCreateAction',
  version: '1.0.0',
  description: 'Creates a Redux Toolkit action creator with createAction(type).',
  inputs: {
    type: stringLiteral('Action type string.')
  },
  output: out('expression', { type: reduxActionCreatorType }),
  template: r => `createAction(${r('type')})`
})

export const ReduxCreateActionWithPrepareTemplate = defineTemplate({
  modelId: 'ReduxCreateActionWithPrepare',
  version: '1.0.0',
  description: 'Creates a Redux Toolkit action creator with a prepare callback.',
  inputs: {
    type: stringLiteral('Action type string.'),
    prepare: callbackInput('Prepare callback expression.')
  },
  output: out('expression', { type: reduxActionCreatorType }),
  template: r => `createAction(${r('type')}, ${r('prepare')})`
})

export const ReduxCreateReducerTemplate = defineTemplate({
  modelId: 'ReduxCreateReducer',
  version: '1.0.0',
  description: 'Creates a reducer with createReducer(initialState, builderCallback).',
  inputs: {
    initialState: expressionInput('Initial state expression.'),
    builder: callbackInput('Builder callback expression, such as `builder => builder.addCase(...)`.')
  },
  output: out('expression', { type: reduxReducerType }),
  template: r => `createReducer(${r('initialState')}, ${r('builder')})`
})

export const ReduxBuilderAddCaseSuffixTemplate = defineTemplate({
  modelId: 'ReduxBuilderAddCaseSuffix',
  version: '1.0.0',
  description: 'Creates a builder-chain suffix for builder.addCase(actionCreator, reducer).',
  inputs: {
    actionCreator: expressionInput('Action creator or thunk lifecycle action creator.', reduxActionCreatorType),
    reducer: callbackInput('Case reducer callback expression.')
  },
  output: out('expressionSuffix'),
  template: r => `.addCase(${r('actionCreator')}, ${r('reducer')})`
})

export const ReduxBuilderAddMatcherSuffixTemplate = defineTemplate({
  modelId: 'ReduxBuilderAddMatcherSuffix',
  version: '1.0.0',
  description: 'Creates a builder-chain suffix for builder.addMatcher(matcher, reducer).',
  inputs: {
    matcher: expressionInput('Matcher predicate expression.'),
    reducer: callbackInput('Case reducer callback expression.')
  },
  output: out('expressionSuffix'),
  template: r => `.addMatcher(${r('matcher')}, ${r('reducer')})`
})

export const ReduxBuilderAddDefaultCaseSuffixTemplate = defineTemplate({
  modelId: 'ReduxBuilderAddDefaultCaseSuffix',
  version: '1.0.0',
  description: 'Creates a builder-chain suffix for builder.addDefaultCase(reducer).',
  inputs: {
    reducer: callbackInput('Default case reducer callback expression.')
  },
  output: out('expressionSuffix'),
  template: r => `.addDefaultCase(${r('reducer')})`
})

export const ReduxBuilderCallbackFromSuffixTemplate = defineTemplate({
  modelId: 'ReduxBuilderCallbackFromSuffix',
  version: '1.0.0',
  description: 'Wraps an expression suffix chain as an extraReducers builder callback.',
  inputs: {
    suffix: expressionSuffixFragment('Builder suffix chain.')
  },
  output: out('expression'),
  template: r => `builder => builder${r('suffix')}`
})

export const ReduxCreateAsyncThunkTemplate = defineTemplate({
  modelId: 'ReduxCreateAsyncThunk',
  version: '1.0.0',
  description: 'Creates an async thunk with createAsyncThunk(typePrefix, payloadCreator).',
  inputs: {
    typePrefix: stringLiteral('Thunk action type prefix.'),
    payloadCreator: callbackInput('Async payload creator callback expression.')
  },
  output: out('expression', { type: reduxAsyncThunkType }),
  template: r => `createAsyncThunk(${r('typePrefix')}, ${r('payloadCreator')})`
})

export const ReduxCreateAsyncThunkWithOptionsTemplate = defineTemplate({
  modelId: 'ReduxCreateAsyncThunkWithOptions',
  version: '1.0.0',
  description: 'Creates an async thunk with createAsyncThunk(typePrefix, payloadCreator, options).',
  inputs: {
    typePrefix: stringLiteral('Thunk action type prefix.'),
    payloadCreator: callbackInput('Async payload creator callback expression.'),
    options: rawObjectExpression('createAsyncThunk options object.')
  },
  output: out('expression', { type: reduxAsyncThunkType }),
  template: r => `createAsyncThunk(${r('typePrefix')}, ${r('payloadCreator')}, ${r('options')})`
})

export const ReduxThunkPendingActionCreatorTemplate = defineTemplate({
  modelId: 'ReduxThunkPendingActionCreator',
  version: '1.0.0',
  description: 'Reads the pending lifecycle action creator from an async thunk.',
  inputs: {
    thunk: expressionInput('Async thunk expression.', reduxAsyncThunkType)
  },
  output: out('expression', { type: reduxActionCreatorType }),
  template: r => `${r('thunk')}.pending`
})

export const ReduxThunkFulfilledActionCreatorTemplate = defineTemplate({
  modelId: 'ReduxThunkFulfilledActionCreator',
  version: '1.0.0',
  description: 'Reads the fulfilled lifecycle action creator from an async thunk.',
  inputs: {
    thunk: expressionInput('Async thunk expression.', reduxAsyncThunkType)
  },
  output: out('expression', { type: reduxActionCreatorType }),
  template: r => `${r('thunk')}.fulfilled`
})

export const ReduxThunkRejectedActionCreatorTemplate = defineTemplate({
  modelId: 'ReduxThunkRejectedActionCreator',
  version: '1.0.0',
  description: 'Reads the rejected lifecycle action creator from an async thunk.',
  inputs: {
    thunk: expressionInput('Async thunk expression.', reduxAsyncThunkType)
  },
  output: out('expression', { type: reduxActionCreatorType }),
  template: r => `${r('thunk')}.rejected`
})

export const ReduxDispatchThunkStatementTemplate = defineTemplate({
  modelId: 'ReduxDispatchThunkStatement',
  version: '1.0.0',
  description: 'Dispatches an async thunk call as a statement.',
  inputs: {
    dispatch: expressionInput('Dispatch expression.', reduxDispatchType),
    thunk: expressionInput('Async thunk expression.', reduxAsyncThunkType),
    arg: expressionInput('Thunk argument expression.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('dispatch')}(${r('thunk')}(${r('arg')}));`
})

export const ReduxThunkUnwrapExpressionTemplate = defineTemplate({
  modelId: 'ReduxThunkUnwrapExpression',
  version: '1.0.0',
  description: 'Dispatches a thunk and unwraps its result promise with .unwrap().',
  inputs: {
    dispatch: expressionInput('Dispatch expression.', reduxDispatchType),
    thunk: expressionInput('Async thunk expression.', reduxAsyncThunkType),
    arg: expressionInput('Thunk argument expression.')
  },
  output: out('expression'),
  template: r => `${r('dispatch')}(${r('thunk')}(${r('arg')})).unwrap()`
})

export const ReduxCreateEntityAdapterTemplate = defineTemplate({
  modelId: 'ReduxCreateEntityAdapter',
  version: '1.0.0',
  description: 'Creates an RTK entity adapter with createEntityAdapter(options).',
  inputs: {
    options: rawObjectExpression('Entity adapter options object, such as `{ selectId, sortComparer }`.')
  },
  output: out('expression', { type: reduxEntityAdapterType }),
  template: r => `createEntityAdapter(${r('options')})`
})

export const ReduxCreateEntityAdapterDefaultTemplate = defineTemplate({
  modelId: 'ReduxCreateEntityAdapterDefault',
  version: '1.0.0',
  description: 'Creates a default RTK entity adapter with createEntityAdapter().',
  inputs: {},
  output: out('expression', { type: reduxEntityAdapterType }),
  template: () => 'createEntityAdapter()'
})

export const ReduxEntityAdapterInitialStateTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterInitialState',
  version: '1.0.0',
  description: 'Calls adapter.getInitialState().',
  inputs: {
    adapter: expressionInput('Entity adapter expression.', reduxEntityAdapterType)
  },
  output: out('expression', { type: reduxEntityStateType }),
  template: r => `${r('adapter')}.getInitialState()`
})

export const ReduxEntityAdapterInitialStateWithExtraTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterInitialStateWithExtra',
  version: '1.0.0',
  description: 'Calls adapter.getInitialState(extraState).',
  inputs: {
    adapter: expressionInput('Entity adapter expression.', reduxEntityAdapterType),
    extraState: rawObjectExpression('Extra state fields object.')
  },
  output: out('expression', { type: reduxEntityStateType }),
  template: r => `${r('adapter')}.getInitialState(${r('extraState')})`
})

export const ReduxEntityAdapterSelectorsTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterSelectors',
  version: '1.0.0',
  description: 'Calls adapter.getSelectors(selectState).',
  inputs: {
    adapter: expressionInput('Entity adapter expression.', reduxEntityAdapterType),
    selectState: callbackInput('Selector that returns the entity state.')
  },
  output: out('expression'),
  template: r => `${r('adapter')}.getSelectors(${r('selectState')})`
})

export const ReduxEntityAdapterSelectAllTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterSelectAll',
  version: '1.0.0',
  description: 'Calls adapter selectors selectAll(state).',
  inputs: {
    selectors: expressionInput('Adapter selectors expression.'),
    state: expressionInput('Root state expression.')
  },
  output: out('expression'),
  template: r => `${r('selectors')}.selectAll(${r('state')})`
})

export const ReduxEntityAdapterSelectByIdTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterSelectById',
  version: '1.0.0',
  description: 'Calls adapter selectors selectById(state, id).',
  inputs: {
    selectors: expressionInput('Adapter selectors expression.'),
    state: expressionInput('Root state expression.'),
    id: expressionInput('Entity ID expression.')
  },
  output: out('expression'),
  template: r => `${r('selectors')}.selectById(${r('state')}, ${r('id')})`
})

export const ReduxEntityAdapterSetAllStatementTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterSetAllStatement',
  version: '1.0.0',
  description: 'Emits adapter.setAll(state, entities); as an Immer-compatible case reducer statement.',
  inputs: {
    adapter: expressionInput('Entity adapter expression.', reduxEntityAdapterType),
    state: expressionInput('Entity state draft expression.'),
    entities: expressionInput('Entities array or record expression.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('adapter')}.setAll(${r('state')}, ${r('entities')});`
})

export const ReduxEntityAdapterAddOneStatementTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterAddOneStatement',
  version: '1.0.0',
  description: 'Emits adapter.addOne(state, entity); as an Immer-compatible case reducer statement.',
  inputs: {
    adapter: expressionInput('Entity adapter expression.', reduxEntityAdapterType),
    state: expressionInput('Entity state draft expression.'),
    entity: expressionInput('Entity expression.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('adapter')}.addOne(${r('state')}, ${r('entity')});`
})

export const ReduxEntityAdapterUpsertManyStatementTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterUpsertManyStatement',
  version: '1.0.0',
  description: 'Emits adapter.upsertMany(state, entities); as an Immer-compatible case reducer statement.',
  inputs: {
    adapter: expressionInput('Entity adapter expression.', reduxEntityAdapterType),
    state: expressionInput('Entity state draft expression.'),
    entities: expressionInput('Entities array or record expression.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('adapter')}.upsertMany(${r('state')}, ${r('entities')});`
})

export const ReduxEntityAdapterUpdateOneStatementTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterUpdateOneStatement',
  version: '1.0.0',
  description: 'Emits adapter.updateOne(state, update); as an Immer-compatible case reducer statement.',
  inputs: {
    adapter: expressionInput('Entity adapter expression.', reduxEntityAdapterType),
    state: expressionInput('Entity state draft expression.'),
    update: expressionInput('Entity update object expression.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('adapter')}.updateOne(${r('state')}, ${r('update')});`
})

export const ReduxEntityAdapterRemoveOneStatementTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterRemoveOneStatement',
  version: '1.0.0',
  description: 'Emits adapter.removeOne(state, id); as an Immer-compatible case reducer statement.',
  inputs: {
    adapter: expressionInput('Entity adapter expression.', reduxEntityAdapterType),
    state: expressionInput('Entity state draft expression.'),
    id: expressionInput('Entity ID expression.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('adapter')}.removeOne(${r('state')}, ${r('id')});`
})

export const ReduxFetchBaseQueryTemplate = defineTemplate({
  modelId: 'ReduxFetchBaseQuery',
  version: '1.0.0',
  description: 'Creates an RTK Query fetch base query with fetchBaseQuery(options).',
  inputs: {
    options: rawObjectExpression('fetchBaseQuery options object, such as `{ baseUrl, prepareHeaders }`.')
  },
  output: out('expression'),
  template: r => `fetchBaseQuery(${r('options')})`
})

export const ReduxCreateApiTemplate = defineTemplate({
  modelId: 'ReduxCreateApi',
  version: '1.0.0',
  description: 'Creates an RTK Query API slice from a full createApi options object.',
  inputs: {
    options: rawObjectExpression('createApi options object.', rtkQueryApiType)
  },
  output: out('expression', { type: rtkQueryApiType }),
  template: r => `createApi(${r('options')})`
})

export const ReduxCreateApiBasicTemplate = defineTemplate({
  modelId: 'ReduxCreateApiBasic',
  version: '1.0.0',
  description: 'Creates an RTK Query API slice from reducerPath, baseQuery, tagTypes, and endpoints callback.',
  inputs: {
    reducerPath: stringLiteral('RTK Query reducer path.'),
    baseQuery: expressionInput('RTK Query baseQuery expression.'),
    tagTypes: stringArrayLiteral('Array of RTK Query tag type strings.'),
    endpoints: callbackInput('Endpoint builder callback, such as `build => ({ getPost: build.query(...) })`.')
  },
  output: out('expression', { type: rtkQueryApiType }),
  template: r => `createApi({ reducerPath: ${r('reducerPath')}, baseQuery: ${r('baseQuery')}, tagTypes: ${r('tagTypes')}, endpoints: ${r('endpoints')} })`
})

export const ReduxQueryEndpointPropertyTemplate = defineTemplate({
  modelId: 'ReduxQueryEndpointProperty',
  version: '1.0.0',
  description: 'Creates one RTK Query endpoint object property using build.query(config).',
  inputs: {
    name: keyLiteral('Endpoint property name.'),
    config: rawObjectExpression('Endpoint config object for build.query(...).')
  },
  output: out('objectProperty', { type: rtkQueryEndpointPropertyType }),
  template: r => `${r('name')}: build.query(${r('config')})`
})

export const ReduxMutationEndpointPropertyTemplate = defineTemplate({
  modelId: 'ReduxMutationEndpointProperty',
  version: '1.0.0',
  description: 'Creates one RTK Query endpoint object property using build.mutation(config).',
  inputs: {
    name: keyLiteral('Endpoint property name.'),
    config: rawObjectExpression('Endpoint config object for build.mutation(...).')
  },
  output: out('objectProperty', { type: rtkQueryEndpointPropertyType }),
  template: r => `${r('name')}: build.mutation(${r('config')})`
})

export const ReduxApiReducerPathTemplate = defineTemplate({
  modelId: 'ReduxApiReducerPath',
  version: '1.0.0',
  description: 'Reads api.reducerPath from an RTK Query API slice.',
  inputs: {
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType)
  },
  output: out('expression', { type: stringType }),
  template: r => `${r('api')}.reducerPath`
})

export const ReduxApiReducerMapPropertyTemplate = defineTemplate({
  modelId: 'ReduxApiReducerMapProperty',
  version: '1.0.0',
  description: 'Creates a computed reducer-map property for an RTK Query API slice: [api.reducerPath]: api.reducer.',
  inputs: {
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType)
  },
  output: out('expression'),
  template: r => `({ [${r('api')}.reducerPath]: ${r('api')}.reducer })`
})

export const ReduxApiMiddlewareConcatTemplate = defineTemplate({
  modelId: 'ReduxApiMiddlewareConcat',
  version: '1.0.0',
  description: 'Creates a configureStore middleware callback that concatenates api.middleware.',
  inputs: {
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType)
  },
  output: out('expression'),
  template: r => `getDefaultMiddleware => getDefaultMiddleware().concat(${r('api')}.middleware)`
})

export const ReduxApiInjectEndpointsTemplate = defineTemplate({
  modelId: 'ReduxApiInjectEndpoints',
  version: '1.0.0',
  description: 'Injects endpoints into an RTK Query API slice.',
  inputs: {
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType),
    endpoints: callbackInput('Endpoint builder callback for injectEndpoints.')
  },
  output: out('expression', { type: rtkQueryApiType }),
  template: r => `${r('api')}.injectEndpoints({ endpoints: ${r('endpoints')} })`
})

export const ReduxApiEnhanceEndpointsTemplate = defineTemplate({
  modelId: 'ReduxApiEnhanceEndpoints',
  version: '1.0.0',
  description: 'Enhances RTK Query endpoints with addTagTypes/endpoints metadata.',
  inputs: {
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType),
    options: rawObjectExpression('enhanceEndpoints options object.')
  },
  output: out('expression', { type: rtkQueryApiType }),
  template: r => `${r('api')}.enhanceEndpoints(${r('options')})`
})

export const ReduxApiInvalidateTagsActionTemplate = defineTemplate({
  modelId: 'ReduxApiInvalidateTagsAction',
  version: '1.0.0',
  description: 'Creates an RTK Query api.util.invalidateTags(tags) action.',
  inputs: {
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType),
    tags: expressionInput('Tag descriptions expression.')
  },
  output: out('expression', { type: reduxActionType }),
  template: r => `${r('api')}.util.invalidateTags(${r('tags')})`
})

export const ReduxApiPrefetchDispatchStatementTemplate = defineTemplate({
  modelId: 'ReduxApiPrefetchDispatchStatement',
  version: '1.0.0',
  description: 'Dispatches api.util.prefetch(endpointName, arg, options).',
  inputs: {
    dispatch: expressionInput('Dispatch expression.', reduxDispatchType),
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType),
    endpointName: stringLiteral('Endpoint name.'),
    arg: expressionInput('Endpoint argument expression.'),
    options: rawObjectExpression('Prefetch options object.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('dispatch')}(${r('api')}.util.prefetch(${r('endpointName')}, ${r('arg')}, ${r('options')}));`
})

export const ReactReduxProviderElementTemplate = defineTemplate({
  modelId: 'ReactReduxProviderElement',
  version: '1.0.0',
  description: 'Creates a React Redux Provider element without JSX using React.createElement(Provider, { store }, children).',
  inputs: {
    store: expressionInput('Redux store expression.', reduxStoreType),
    children: expressionInput('Provider children expression.', reactNodeType)
  },
  output: out('expression', { type: reactElementType }),
  template: r => `React.createElement(Provider, { store: ${r('store')} }, ${r('children')})`
})

export const ReactReduxUseDispatchTemplate = defineTemplate({
  modelId: 'ReactReduxUseDispatch',
  version: '1.0.0',
  description: 'Calls useDispatch().',
  inputs: {},
  output: out('expression', { type: reduxDispatchType }),
  template: () => 'useDispatch()'
})

export const ReactReduxUseSelectorTemplate = defineTemplate({
  modelId: 'ReactReduxUseSelector',
  version: '1.0.0',
  description: 'Calls useSelector(selector).',
  inputs: {
    selector: expressionInput('Selector callback expression.', reduxSelectorType)
  },
  output: out('expression'),
  template: r => `useSelector(${r('selector')})`
})

export const ReactReduxUseSelectorShallowEqualTemplate = defineTemplate({
  modelId: 'ReactReduxUseSelectorShallowEqual',
  version: '1.0.0',
  description: 'Calls useSelector(selector, shallowEqual). Assumes shallowEqual is imported from react-redux.',
  inputs: {
    selector: expressionInput('Selector callback expression.', reduxSelectorType)
  },
  output: out('expression'),
  template: r => `useSelector(${r('selector')}, shallowEqual)`
})

export const ReactReduxUseStoreTemplate = defineTemplate({
  modelId: 'ReactReduxUseStore',
  version: '1.0.0',
  description: 'Calls useStore().',
  inputs: {},
  output: out('expression', { type: reduxStoreType }),
  template: () => 'useStore()'
})

export const ReactReduxDispatchActionStatementTemplate = defineTemplate({
  modelId: 'ReactReduxDispatchActionStatement',
  version: '1.0.0',
  description: 'Dispatches an action expression.',
  inputs: {
    dispatch: expressionInput('Dispatch expression.', reduxDispatchType),
    action: expressionInput('Action expression.', reduxActionType)
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('dispatch')}(${r('action')});`
})

export const ReactReduxDispatchActionCreatorStatementTemplate = defineTemplate({
  modelId: 'ReactReduxDispatchActionCreatorStatement',
  version: '1.0.0',
  description: 'Dispatches actionCreator(payload).',
  inputs: {
    dispatch: expressionInput('Dispatch expression.', reduxDispatchType),
    actionCreator: expressionInput('Action creator expression.', reduxActionCreatorType),
    payload: expressionInput('Payload expression.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('dispatch')}(${r('actionCreator')}(${r('payload')}));`
})

export const ReactReduxTypedHooksStatementTemplate = defineTemplate({
  modelId: 'ReactReduxTypedHooksStatement',
  version: '1.0.0',
  description: 'Declares typed React Redux hooks using .withTypes<AppDispatch>() and .withTypes<RootState>().',
  inputs: {
    dispatchHookName: identifierLiteral('Name of the typed dispatch hook to export.'),
    selectorHookName: identifierLiteral('Name of the typed selector hook to export.'),
    storeHookName: identifierLiteral('Name of the typed store hook to export.'),
    appDispatchType: identifierLiteral('AppDispatch type identifier.'),
    rootStateType: identifierLiteral('RootState type identifier.'),
    appStoreType: identifierLiteral('AppStore type identifier.')
  },
  output: out('statement', { type: voidType }),
  template: r => `export const ${r('dispatchHookName')} = useDispatch.withTypes<${r('appDispatchType')}>();\nexport const ${r('selectorHookName')} = useSelector.withTypes<${r('rootStateType')}>();\nexport const ${r('storeHookName')} = useStore.withTypes<${r('appStoreType')}>();`
})

export const ReduxRootStateTypeStatementTemplate = defineTemplate({
  modelId: 'ReduxRootStateTypeStatement',
  version: '1.0.0',
  description: 'Exports RootState as ReturnType<typeof store.getState>.',
  inputs: {
    typeName: identifierLiteral('Exported type name, usually RootState.'),
    storeIdentifier: identifierLiteral('Store identifier.')
  },
  output: out('statement', { type: voidType }),
  template: r => `export type ${r('typeName')} = ReturnType<typeof ${r('storeIdentifier')}.getState>;`
})

export const ReduxAppDispatchTypeStatementTemplate = defineTemplate({
  modelId: 'ReduxAppDispatchTypeStatement',
  version: '1.0.0',
  description: 'Exports AppDispatch as typeof store.dispatch.',
  inputs: {
    typeName: identifierLiteral('Exported type name, usually AppDispatch.'),
    storeIdentifier: identifierLiteral('Store identifier.')
  },
  output: out('statement', { type: voidType }),
  template: r => `export type ${r('typeName')} = typeof ${r('storeIdentifier')}.dispatch;`
})

export const ReduxCreateSelector2Template = defineTemplate({
  modelId: 'ReduxCreateSelector2',
  version: '1.0.0',
  description: 'Creates a memoized selector from two input selectors and a result function.',
  inputs: {
    selectorA: expressionInput('First input selector.', reduxSelectorType),
    selectorB: expressionInput('Second input selector.', reduxSelectorType),
    result: callbackInput('Result callback expression.')
  },
  output: out('expression', { type: reduxSelectorType }),
  template: r => `createSelector([${r('selectorA')}, ${r('selectorB')}], ${r('result')})`
})

export const ReduxCreateSelector3Template = defineTemplate({
  modelId: 'ReduxCreateSelector3',
  version: '1.0.0',
  description: 'Creates a memoized selector from three input selectors and a result function.',
  inputs: {
    selectorA: expressionInput('First input selector.', reduxSelectorType),
    selectorB: expressionInput('Second input selector.', reduxSelectorType),
    selectorC: expressionInput('Third input selector.', reduxSelectorType),
    result: callbackInput('Result callback expression.')
  },
  output: out('expression', { type: reduxSelectorType }),
  template: r => `createSelector([${r('selectorA')}, ${r('selectorB')}, ${r('selectorC')}], ${r('result')})`
})

export const ReduxSelectorPathTemplate = defineTemplate({
  modelId: 'ReduxSelectorPath',
  version: '1.0.0',
  description: 'Creates a simple selector that reads state[key].',
  inputs: {
    key: identifierLiteral('Root state property name.')
  },
  output: out('expression', { type: reduxSelectorType }),
  template: r => `(state => state.${r('key')})`
})

export const ReduxSelectorNestedPathTemplate = defineTemplate({
  modelId: 'ReduxSelectorNestedPath',
  version: '1.0.0',
  description: 'Creates a simple selector that reads state[parent][child] via property access.',
  inputs: {
    parent: identifierLiteral('Root state property name.'),
    child: identifierLiteral('Nested property name.')
  },
  output: out('expression', { type: reduxSelectorType }),
  template: r => `(state => state.${r('parent')}.${r('child')})`
})

export const ReduxSelectorMapArrayTemplate = defineTemplate({
  modelId: 'ReduxSelectorMapArray',
  version: '1.0.0',
  description: 'Creates a selector that maps the result of another selector.',
  inputs: {
    selector: expressionInput('Selector expression.', reduxSelectorType),
    mapper: callbackInput('Array mapper callback expression.')
  },
  output: out('expression', { type: reduxSelectorType }),
  template: r => `(state => ${r('selector')}(state).map(${r('mapper')}))`
})

export const ReduxSelectorFilterArrayTemplate = defineTemplate({
  modelId: 'ReduxSelectorFilterArray',
  version: '1.0.0',
  description: 'Creates a selector that filters the result of another selector.',
  inputs: {
    selector: expressionInput('Selector expression.', reduxSelectorType),
    predicate: callbackInput('Array predicate callback expression.')
  },
  output: out('expression', { type: reduxSelectorType }),
  template: r => `(state => ${r('selector')}(state).filter(${r('predicate')}))`
})

export const ReduxCreateListenerMiddlewareTemplate = defineTemplate({
  modelId: 'ReduxCreateListenerMiddleware',
  version: '1.0.0',
  description: 'Creates an RTK listener middleware instance.',
  inputs: {},
  output: out('expression', { type: listenerMiddlewareType }),
  template: () => 'createListenerMiddleware()'
})

export const ReduxListenerStartListeningStatementTemplate = defineTemplate({
  modelId: 'ReduxListenerStartListeningStatement',
  version: '1.0.0',
  description: 'Registers a listener middleware effect with predicate and effect callbacks.',
  inputs: {
    listenerMiddleware: expressionInput('Listener middleware instance.', listenerMiddlewareType),
    predicate: callbackInput('Listener predicate callback.'),
    effect: callbackInput('Listener effect callback.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('listenerMiddleware')}.startListening({ predicate: ${r('predicate')}, effect: ${r('effect')} });`
})

export const ReduxListenerStartListeningActionCreatorStatementTemplate = defineTemplate({
  modelId: 'ReduxListenerStartListeningActionCreatorStatement',
  version: '1.0.0',
  description: 'Registers a listener middleware effect for one action creator.',
  inputs: {
    listenerMiddleware: expressionInput('Listener middleware instance.', listenerMiddlewareType),
    actionCreator: expressionInput('Action creator expression.', reduxActionCreatorType),
    effect: callbackInput('Listener effect callback.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('listenerMiddleware')}.startListening({ actionCreator: ${r('actionCreator')}, effect: ${r('effect')} });`
})

export const ReduxListenerMiddlewarePrependTemplate = defineTemplate({
  modelId: 'ReduxListenerMiddlewarePrepend',
  version: '1.0.0',
  description: 'Creates a configureStore middleware callback that prepends listenerMiddleware.middleware.',
  inputs: {
    listenerMiddleware: expressionInput('Listener middleware instance.', listenerMiddlewareType)
  },
  output: out('expression'),
  template: r => `getDefaultMiddleware => getDefaultMiddleware().prepend(${r('listenerMiddleware')}.middleware)`
})

export const ReduxIsAnyOfTemplate = defineTemplate({
  modelId: 'ReduxIsAnyOf',
  version: '1.0.0',
  description: 'Creates an RTK matcher with isAnyOf(...actionCreators).',
  inputs: {
    actionCreators: rawExpression('Comma-separated action creators or an array spread, such as `a, b` or `...actions`.'),
  },
  output: out('expression'),
  template: r => `isAnyOf(${r('actionCreators')})`
})

export const ReduxIsAllOfTemplate = defineTemplate({
  modelId: 'ReduxIsAllOf',
  version: '1.0.0',
  description: 'Creates an RTK matcher with isAllOf(...matchers).',
  inputs: {
    matchers: rawExpression('Comma-separated matcher expressions or an array spread, such as `a, b` or `...matchers`.'),
  },
  output: out('expression'),
  template: r => `isAllOf(${r('matchers')})`
})

export const ReduxIsPendingTemplate = defineTemplate({
  modelId: 'ReduxIsPending',
  version: '1.0.0',
  description: 'Creates an RTK matcher for pending async thunk actions.',
  inputs: {
    thunks: rawExpression('Comma-separated async thunk expressions or an array spread.')
  },
  output: out('expression'),
  template: r => `isPending(${r('thunks')})`
})

export const ReduxIsFulfilledTemplate = defineTemplate({
  modelId: 'ReduxIsFulfilled',
  version: '1.0.0',
  description: 'Creates an RTK matcher for fulfilled async thunk actions.',
  inputs: {
    thunks: rawExpression('Comma-separated async thunk expressions or an array spread.')
  },
  output: out('expression'),
  template: r => `isFulfilled(${r('thunks')})`
})

export const ReduxIsRejectedTemplate = defineTemplate({
  modelId: 'ReduxIsRejected',
  version: '1.0.0',
  description: 'Creates an RTK matcher for rejected async thunk actions.',
  inputs: {
    thunks: rawExpression('Comma-separated async thunk expressions or an array spread.')
  },
  output: out('expression'),
  template: r => `isRejected(${r('thunks')})`
})

export const ReduxActionCreatorCallTemplate = defineTemplate({
  modelId: 'ReduxActionCreatorCall',
  version: '1.0.0',
  description: 'Calls an action creator with one payload argument.',
  inputs: {
    actionCreator: expressionInput('Action creator expression.', reduxActionCreatorType),
    payload: expressionInput('Payload expression.')
  },
  output: out('expression', { type: reduxPayloadActionType }),
  template: r => `${r('actionCreator')}(${r('payload')})`
})

export const ReduxActionCreatorNoPayloadCallTemplate = defineTemplate({
  modelId: 'ReduxActionCreatorNoPayloadCall',
  version: '1.0.0',
  description: 'Calls an action creator with no payload arguments.',
  inputs: {
    actionCreator: expressionInput('Action creator expression.', reduxActionCreatorType)
  },
  output: out('expression', { type: reduxPayloadActionType }),
  template: r => `${r('actionCreator')}()`
})

export const ReduxPayloadActionPayloadTemplate = defineTemplate({
  modelId: 'ReduxPayloadActionPayload',
  version: '1.0.0',
  description: 'Reads action.payload from a Redux Toolkit PayloadAction.',
  inputs: {
    action: expressionInput('PayloadAction expression.', reduxPayloadActionType)
  },
  output: out('expression'),
  template: r => `${r('action')}.payload`
})

export const ReduxDraftAssignTemplate = defineTemplate({
  modelId: 'ReduxDraftAssign',
  version: '1.0.0',
  description: 'Emits an Immer-style draft assignment statement: state.key = value;',
  inputs: {
    draft: expressionInput('Draft state expression.'),
    key: identifierLiteral('Draft property name.'),
    value: expressionInput('Assigned value expression.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('draft')}.${r('key')} = ${r('value')};`
})

export const ReduxDraftPushTemplate = defineTemplate({
  modelId: 'ReduxDraftPush',
  version: '1.0.0',
  description: 'Emits an Immer-style draft array push statement: state.key.push(value);',
  inputs: {
    draft: expressionInput('Draft state expression.'),
    key: identifierLiteral('Draft array property name.'),
    value: expressionInput('Pushed value expression.')
  },
  output: out('statement', { type: voidType }),
  template: r => `${r('draft')}.${r('key')}.push(${r('value')});`
})

export const ReduxReturnStateStatementTemplate = defineTemplate({
  modelId: 'ReduxReturnStateStatement',
  version: '1.0.0',
  description: 'Returns an expression from a case reducer or selector helper.',
  inputs: {
    value: expressionInput('Returned value expression.')
  },
  output: out('statement'),
  template: r => `return ${r('value')};`
})

export const ReduxPersistReducerTemplate = defineTemplate({
  modelId: 'ReduxPersistReducer',
  version: '1.0.0',
  description: 'Wraps a reducer with redux-persist persistReducer(config, reducer).',
  inputs: {
    config: rawObjectExpression('redux-persist configuration object.'),
    reducer: expressionInput('Reducer expression.', reduxReducerType)
  },
  output: out('expression', { type: reduxReducerType }),
  template: r => `persistReducer(${r('config')}, ${r('reducer')})`
})

export const ReduxPersistStoreTemplate = defineTemplate({
  modelId: 'ReduxPersistStore',
  version: '1.0.0',
  description: 'Creates a persistor with persistStore(store).',
  inputs: {
    store: expressionInput('Redux store expression.', reduxStoreType)
  },
  output: out('expression'),
  template: r => `persistStore(${r('store')})`
})

export const ReduxPersistGateElementTemplate = defineTemplate({
  modelId: 'ReduxPersistGateElement',
  version: '1.0.0',
  description: 'Creates a PersistGate element without JSX using React.createElement(PersistGate, { persistor, loading }, children).',
  inputs: {
    persistor: expressionInput('redux-persist persistor expression.'),
    loading: expressionInput('Loading fallback expression.', reactNodeType),
    children: expressionInput('Children expression.', reactNodeType)
  },
  output: out('expression', { type: reactElementType }),
  template: r => `React.createElement(PersistGate, { persistor: ${r('persistor')}, loading: ${r('loading')} }, ${r('children')})`
})

export const ReduxSagaTakeLatestStatementTemplate = defineTemplate({
  modelId: 'ReduxSagaTakeLatestStatement',
  version: '1.0.0',
  description: 'Yields a redux-saga takeLatest(pattern, worker, ...args) effect.',
  inputs: {
    pattern: expressionInput('Action pattern or action creator expression.'),
    worker: expressionInput('Saga worker function expression.'),
    args: rawExpression('Optional comma-prefixed extra args, or empty string via raw code if your policy allows it.')
  },
  output: out('statement', { type: sagaEffectType }),
  template: r => `yield takeLatest(${r('pattern')}, ${r('worker')}${r('args')});`
})

export const ReduxSagaTakeEveryStatementTemplate = defineTemplate({
  modelId: 'ReduxSagaTakeEveryStatement',
  version: '1.0.0',
  description: 'Yields a redux-saga takeEvery(pattern, worker, ...args) effect.',
  inputs: {
    pattern: expressionInput('Action pattern or action creator expression.'),
    worker: expressionInput('Saga worker function expression.'),
    args: rawExpression('Optional comma-prefixed extra args, or empty string via raw code if your policy allows it.')
  },
  output: out('statement', { type: sagaEffectType }),
  template: r => `yield takeEvery(${r('pattern')}, ${r('worker')}${r('args')});`
})

export const ReduxSagaCallExpressionTemplate = defineTemplate({
  modelId: 'ReduxSagaCallExpression',
  version: '1.0.0',
  description: 'Creates a redux-saga call(fn, ...args) effect expression.',
  inputs: {
    fn: expressionInput('Function expression.'),
    args: rawExpression('Comma-separated call arguments or empty string if no args.')
  },
  output: out('expression', { type: sagaEffectType }),
  template: r => `call(${r('fn')}${r('args')})`
})

export const ReduxSagaPutStatementTemplate = defineTemplate({
  modelId: 'ReduxSagaPutStatement',
  version: '1.0.0',
  description: 'Yields a redux-saga put(action) effect.',
  inputs: {
    action: expressionInput('Action expression.', reduxActionType)
  },
  output: out('statement', { type: sagaEffectType }),
  template: r => `yield put(${r('action')});`
})

export const ReduxSagaSelectExpressionTemplate = defineTemplate({
  modelId: 'ReduxSagaSelectExpression',
  version: '1.0.0',
  description: 'Creates a redux-saga select(selector, ...args) effect expression.',
  inputs: {
    selector: expressionInput('Selector expression.', reduxSelectorType),
    args: rawExpression('Comma-separated selector arguments or empty string if no args.')
  },
  output: out('expression', { type: sagaEffectType }),
  template: r => `select(${r('selector')}${r('args')})`
})

export const ReduxSagaAllExpressionTemplate = defineTemplate({
  modelId: 'ReduxSagaAllExpression',
  version: '1.0.0',
  description: 'Creates a redux-saga all(effects) expression.',
  inputs: {
    effects: expressionInput('Array or object of saga effects.')
  },
  output: out('expression', { type: sagaEffectType }),
  template: r => `all(${r('effects')})`
})

export const ReduxSagaForkStatementTemplate = defineTemplate({
  modelId: 'ReduxSagaForkStatement',
  version: '1.0.0',
  description: 'Yields a redux-saga fork(fn, ...args) effect.',
  inputs: {
    fn: expressionInput('Saga function expression.'),
    args: rawExpression('Comma-separated fork arguments or empty string if no args.')
  },
  output: out('statement', { type: sagaEffectType }),
  template: r => `yield fork(${r('fn')}${r('args')});`
})

export const ReduxStatementList2Template = defineTemplate({
  modelId: 'ReduxStatementList2',
  version: '1.0.0',
  description: 'Combines two Redux-related statement fragments.',
  inputs: {
    first: statementFragment('First statement fragment.'),
    second: statementFragment('Second statement fragment.')
  },
  output: out('statement'),
  template: r => `${r('first')}\n${r('second')}`
})

export const ReduxStatementList3Template = defineTemplate({
  modelId: 'ReduxStatementList3',
  version: '1.0.0',
  description: 'Combines three Redux-related statement fragments.',
  inputs: {
    first: statementFragment('First statement fragment.'),
    second: statementFragment('Second statement fragment.'),
    third: statementFragment('Third statement fragment.')
  },
  output: out('statement'),
  template: r => `${r('first')}\n${r('second')}\n${r('third')}`
})

export const ReduxDeclareConstStatementTemplate = defineTemplate({
  modelId: 'ReduxDeclareConstStatement',
  version: '1.0.0',
  description: 'Declares a const from an expression.',
  inputs: {
    name: identifierLiteral('Const identifier name.'),
    value: expressionInput('Initializer expression.')
  },
  output: out('statement'),
  template: r => `const ${r('name')} = ${r('value')};`
})

export const ReduxExportConstStatementTemplate = defineTemplate({
  modelId: 'ReduxExportConstStatement',
  version: '1.0.0',
  description: 'Exports a const from an expression.',
  inputs: {
    name: identifierLiteral('Const identifier name.'),
    value: expressionInput('Initializer expression.')
  },
  output: out('statement'),
  template: r => `export const ${r('name')} = ${r('value')};`
})

export const ReduxExportDefaultStatementTemplate = defineTemplate({
  modelId: 'ReduxExportDefaultStatement',
  version: '1.0.0',
  description: 'Exports an expression as default.',
  inputs: {
    value: expressionInput('Default export expression.')
  },
  output: out('statement'),
  template: r => `export default ${r('value')};`
})

export const ReduxToolkitStoreSetupWithApiTemplate = defineTemplate({
  modelId: 'ReduxToolkitStoreSetupWithApi',
  version: '1.0.0',
  description: 'Composed store setup for normal reducers plus one RTK Query API reducer and middleware.',
  inputs: {
    reducers: rawObjectExpression('Reducer map object without the API reducer.'),
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType)
  },
  output: out('expression', { type: reduxStoreType }),
  template: r => `configureStore({ reducer: { ...${r('reducers')}, [${r('api')}.reducerPath]: ${r('api')}.reducer }, middleware: getDefaultMiddleware => getDefaultMiddleware().concat(${r('api')}.middleware) })`
})

export const ReduxEntitySliceTemplate = defineTemplate({
  modelId: 'ReduxEntitySlice',
  version: '1.0.0',
  description: 'Composed entity slice using adapter.getInitialState() and adapter reducers.',
  inputs: {
    name: stringLiteral('Slice name.'),
    adapter: expressionInput('Entity adapter expression.', reduxEntityAdapterType),
    extraReducers: rawObjectExpression('Additional reducers object to spread after adapter reducers.')
  },
  output: out('expression', { type: reduxSliceType }),
  template: r => `createSlice({ name: ${r('name')}, initialState: ${r('adapter')}.getInitialState(), reducers: { setAll: ${r('adapter')}.setAll, addOne: ${r('adapter')}.addOne, upsertMany: ${r('adapter')}.upsertMany, removeOne: ${r('adapter')}.removeOne, ...${r('extraReducers')} } })`
})

export const ReduxCrudApiTemplate = defineTemplate({
  modelId: 'ReduxCrudApi',
  version: '1.0.0',
  description: 'Composed RTK Query CRUD API for a REST resource with list/get/create/update/delete endpoints.',
  inputs: {
    reducerPath: stringLiteral('RTK Query reducer path.'),
    baseUrl: stringLiteral('Base URL for fetchBaseQuery.'),
    resourcePath: stringLiteral('Resource path, such as `/posts`.'),
    tagType: stringLiteral('RTK Query tag type, such as `Post`.')
  },
  output: out('expression', { type: rtkQueryApiType }),
  template: r => `createApi({ reducerPath: ${r('reducerPath')}, baseQuery: fetchBaseQuery({ baseUrl: ${r('baseUrl')} }), tagTypes: [${r('tagType')}], endpoints: build => ({ list: build.query({ query: () => ${r('resourcePath')}, providesTags: [${r('tagType')}] }), get: build.query({ query: id => \`${r('resourcePath')}/\${id}\`, providesTags: (_result, _error, id) => [{ type: ${r('tagType')}, id }] }), create: build.mutation({ query: body => ({ url: ${r('resourcePath')}, method: 'POST', body }), invalidatesTags: [${r('tagType')}] }), update: build.mutation({ query: ({ id, ...patch }) => ({ url: \`${r('resourcePath')}/\${id}\`, method: 'PATCH', body: patch }), invalidatesTags: (_result, _error, { id }) => [{ type: ${r('tagType')}, id }] }), delete: build.mutation({ query: id => ({ url: \`${r('resourcePath')}/\${id}\`, method: 'DELETE' }), invalidatesTags: [${r('tagType')}] }) }) })`
})

export const reduxGraphTemplateInputs = [
  ReduxConfigureStoreTemplate,
  ReduxConfigureStoreWithMiddlewareTemplate,
  ReduxConfigureStoreFullTemplate,
  ReduxCombineReducersTemplate,
  ReduxReducerMapPropertyTemplate,
  ReduxCreateSliceTemplate,
  ReduxCreateSliceWithExtraReducersTemplate,
  ReduxSliceReducerTemplate,
  ReduxSliceActionsTemplate,
  ReduxSliceActionTemplate,
  ReduxCreateActionTemplate,
  ReduxCreateActionWithPrepareTemplate,
  ReduxCreateReducerTemplate,
  ReduxBuilderAddCaseSuffixTemplate,
  ReduxBuilderAddMatcherSuffixTemplate,
  ReduxBuilderAddDefaultCaseSuffixTemplate,
  ReduxBuilderCallbackFromSuffixTemplate,
  ReduxCreateAsyncThunkTemplate,
  ReduxCreateAsyncThunkWithOptionsTemplate,
  ReduxThunkPendingActionCreatorTemplate,
  ReduxThunkFulfilledActionCreatorTemplate,
  ReduxThunkRejectedActionCreatorTemplate,
  ReduxDispatchThunkStatementTemplate,
  ReduxThunkUnwrapExpressionTemplate,
  ReduxCreateEntityAdapterTemplate,
  ReduxCreateEntityAdapterDefaultTemplate,
  ReduxEntityAdapterInitialStateTemplate,
  ReduxEntityAdapterInitialStateWithExtraTemplate,
  ReduxEntityAdapterSelectorsTemplate,
  ReduxEntityAdapterSelectAllTemplate,
  ReduxEntityAdapterSelectByIdTemplate,
  ReduxEntityAdapterSetAllStatementTemplate,
  ReduxEntityAdapterAddOneStatementTemplate,
  ReduxEntityAdapterUpsertManyStatementTemplate,
  ReduxEntityAdapterUpdateOneStatementTemplate,
  ReduxEntityAdapterRemoveOneStatementTemplate,
  ReduxFetchBaseQueryTemplate,
  ReduxCreateApiTemplate,
  ReduxCreateApiBasicTemplate,
  ReduxQueryEndpointPropertyTemplate,
  ReduxMutationEndpointPropertyTemplate,
  ReduxApiReducerPathTemplate,
  ReduxApiReducerMapPropertyTemplate,
  ReduxApiMiddlewareConcatTemplate,
  ReduxApiInjectEndpointsTemplate,
  ReduxApiEnhanceEndpointsTemplate,
  ReduxApiInvalidateTagsActionTemplate,
  ReduxApiPrefetchDispatchStatementTemplate,
  ReactReduxProviderElementTemplate,
  ReactReduxUseDispatchTemplate,
  ReactReduxUseSelectorTemplate,
  ReactReduxUseSelectorShallowEqualTemplate,
  ReactReduxUseStoreTemplate,
  ReactReduxDispatchActionStatementTemplate,
  ReactReduxDispatchActionCreatorStatementTemplate,
  ReactReduxTypedHooksStatementTemplate,
  ReduxRootStateTypeStatementTemplate,
  ReduxAppDispatchTypeStatementTemplate,
  ReduxCreateSelector2Template,
  ReduxCreateSelector3Template,
  ReduxSelectorPathTemplate,
  ReduxSelectorNestedPathTemplate,
  ReduxSelectorMapArrayTemplate,
  ReduxSelectorFilterArrayTemplate,
  ReduxCreateListenerMiddlewareTemplate,
  ReduxListenerStartListeningStatementTemplate,
  ReduxListenerStartListeningActionCreatorStatementTemplate,
  ReduxListenerMiddlewarePrependTemplate,
  ReduxIsAnyOfTemplate,
  ReduxIsAllOfTemplate,
  ReduxIsPendingTemplate,
  ReduxIsFulfilledTemplate,
  ReduxIsRejectedTemplate,
  ReduxActionCreatorCallTemplate,
  ReduxActionCreatorNoPayloadCallTemplate,
  ReduxPayloadActionPayloadTemplate,
  ReduxDraftAssignTemplate,
  ReduxDraftPushTemplate,
  ReduxReturnStateStatementTemplate,
  ReduxPersistReducerTemplate,
  ReduxPersistStoreTemplate,
  ReduxPersistGateElementTemplate,
  ReduxSagaTakeLatestStatementTemplate,
  ReduxSagaTakeEveryStatementTemplate,
  ReduxSagaCallExpressionTemplate,
  ReduxSagaPutStatementTemplate,
  ReduxSagaSelectExpressionTemplate,
  ReduxSagaAllExpressionTemplate,
  ReduxSagaForkStatementTemplate,
  ReduxStatementList2Template,
  ReduxStatementList3Template,
  ReduxDeclareConstStatementTemplate,
  ReduxExportConstStatementTemplate,
  ReduxExportDefaultStatementTemplate,
  ReduxToolkitStoreSetupWithApiTemplate,
  ReduxEntitySliceTemplate,
  ReduxCrudApiTemplate
] satisfies readonly AnyGraphTemplateDefinitionInput[]
