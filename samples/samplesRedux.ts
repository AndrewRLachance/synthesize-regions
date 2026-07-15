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

export const stringType: TypeDescriptor = { ts: 'string', schema: { type: 'string' } }
export const voidType: TypeDescriptor = { ts: 'void' }
export const reactNodeType: TypeDescriptor = { ts: 'React.ReactNode' }
export const reactElementType: TypeDescriptor = { ts: 'React.ReactElement' }
export const reduxActionType: TypeDescriptor = { ts: 'UnknownAction' }
export const reduxPayloadActionType: TypeDescriptor = { ts: 'PayloadAction<unknown>' }
export const reduxReducerType: TypeDescriptor = { ts: 'Reducer' }
export const reduxReducerMapType: TypeDescriptor = { ts: 'ReducersMapObject' }
export const reduxStoreType: TypeDescriptor = { ts: 'EnhancedStore' }
export const reduxDispatchType: TypeDescriptor = { ts: 'Dispatch' }
export const reduxSelectorType: TypeDescriptor = { ts: '(state: unknown) => unknown' }
export const reduxSliceType: TypeDescriptor = { ts: 'Slice' }
export const reduxActionCreatorType: TypeDescriptor = { ts: 'ActionCreatorWithPayload<unknown> | ActionCreatorWithoutPayload' }
export const reduxAsyncThunkType: TypeDescriptor = { ts: 'AsyncThunk<unknown, unknown, object>' }
export const reduxEntityAdapterType: TypeDescriptor = { ts: 'EntityAdapter<unknown>' }
export const reduxEntityStateType: TypeDescriptor = { ts: 'EntityState<unknown, unknown>' }
export const rtkQueryApiType: TypeDescriptor = { ts: 'Api<any, any, any, any>' }
export const rtkQueryEndpointPropertyType: TypeDescriptor = { ts: 'endpoint definition object property' }
export const listenerMiddlewareType: TypeDescriptor = { ts: 'ListenerMiddlewareInstance' }
export const sagaEffectType: TypeDescriptor = { ts: 'SagaIterator | Effect' }

export const safeRawExpressionPolicy: RawCodePolicy = {
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

export const safeRawObjectPolicy: RawCodePolicy = {
  description: 'Single-line object or function expression for Redux configuration blocks.',
  maxLength: 1600,
  allowNewlines: false,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: ['\\bnew\\s+Function\\b', '\\bwhile\\s*\\(']
}

export const safeRawCallbackPolicy: RawCodePolicy = {
  description: 'Short callback/function expression for Redux Toolkit reducers, thunks, selectors, and endpoint builders.',
  maxLength: 1800,
  allowNewlines: true,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: ['\\bnew\\s+Function\\b']
}

export const safeRawStatementPolicy: RawCodePolicy = {
  description: 'Short statement block for generated Redux glue code.',
  maxLength: 2200,
  allowNewlines: true,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: ['\\bnew\\s+Function\\b']
}

export const identifierNameSchema = {
  type: 'string',
  pattern: '^[$A-Za-z_][$A-Za-z0-9_]*$'
}

export const propertyKeySchema = {
  type: 'string',
  minLength: 1
}

export const stringArraySchema = {
  type: 'array',
  items: { type: 'string' }
}

export const expressionFragment = (description?: string, type?: TypeDescriptor): FragmentInputPort =>
  fragmentPort({
    regionKind: 'expression',
    accepts: {
      outputKind: 'expression',
      ...(type ? { type } : {})
    },
    ...(description ? { description } : {})
  })

export const expressionSuffixFragment = (description?: string): FragmentInputPort =>
  fragmentPort({
    regionKind: 'expressionSuffix',
    accepts: { outputKind: 'expressionSuffix' },
    ...(description ? { description } : {})
  })

export const statementFragment = (description?: string): FragmentInputPort =>
  fragmentPort({
    regionKind: 'statement',
    accepts: { outputKind: 'statement' },
    ...(description ? { description } : {})
  })


export const rawExpression = (description?: string, type?: TypeDescriptor): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawExpressionPolicy,
    ...(type ? { type } : {}),
    ...(description ? { description } : {})
  })

export const rawObjectExpression = (description?: string, type?: TypeDescriptor): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawObjectPolicy,
    ...(type ? { type } : {}),
    ...(description ? { description } : {})
  })

export const rawCallbackExpression = (description?: string, type?: TypeDescriptor): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawCallbackPolicy,
    ...(type ? { type } : {}),
    ...(description ? { description } : {})
  })


export const stringLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'string',
    schema: { type: 'string' },
    ...(description ? { description } : {})
  })



export const identifierLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'identifier',
    schema: identifierNameSchema,
    ...(description ? { description } : {})
  })

export const stringArrayLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'expression',
    schema: stringArraySchema,
    ...(description ? { description } : {})
  })

export const keyLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'string',
    schema: propertyKeySchema,
    ...(description ? { description } : {})
  })

export const expressionInput = (description: string = '', type: TypeDescriptor = {}): InputPort =>
  unionPort({
    description,
    options: [
      expressionFragment(description ?? '', type),
      rawExpression(description ?? '', type)
    ]
  })

export const callbackInput = (description: string = '', type: TypeDescriptor = {}): InputPort =>
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
  source: `configureStore({ reducer: ${"/** @TYPE expression id=reducer **/undefined/** @END **/"} })`
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
  source: `configureStore({ reducer: ${"/** @TYPE expression id=reducer **/undefined/** @END **/"}, middleware: ${"/** @TYPE expression id=middleware **/undefined/** @END **/"} })`
})

export const ReduxConfigureStoreFullTemplate = defineTemplate({
  modelId: 'ReduxConfigureStoreFull',
  version: '1.0.0',
  description: 'Creates a Redux Toolkit store from a full configureStore options object.',
  inputs: {
    options: rawObjectExpression('Full configureStore options object, for example `{ reducer, middleware, devTools, preloadedState }`.', reduxStoreType)
  },
  output: out('expression', { type: reduxStoreType }),
  source: `configureStore(${"/** @TYPE expression id=options **/undefined/** @END **/"})`
})

export const ReduxCombineReducersTemplate = defineTemplate({
  modelId: 'ReduxCombineReducers',
  version: '1.0.0',
  description: 'Combines slice reducers with Redux Toolkit combineReducers(reducers).',
  inputs: {
    reducers: rawObjectExpression('Reducer map object.', reduxReducerMapType)
  },
  output: out('expression', { type: reduxReducerType }),
  source: `combineReducers(${"/** @TYPE expression id=reducers **/undefined/** @END **/"})`
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
  source: `${"/** @TYPE string id=key **/\"\"/** @END **/"}: ${"/** @TYPE expression id=reducer **/undefined/** @END **/"}`
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
  source: `createSlice({ name: ${"/** @TYPE string id=name **/\"\"/** @END **/"}, initialState: ${"/** @TYPE expression id=initialState **/undefined/** @END **/"}, reducers: ${"/** @TYPE expression id=reducers **/undefined/** @END **/"} })`
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
  source: `createSlice({ name: ${"/** @TYPE string id=name **/\"\"/** @END **/"}, initialState: ${"/** @TYPE expression id=initialState **/undefined/** @END **/"}, reducers: ${"/** @TYPE expression id=reducers **/undefined/** @END **/"}, extraReducers: ${"/** @TYPE expression id=extraReducers **/undefined/** @END **/"} })`
})

export const ReduxSliceReducerTemplate = defineTemplate({
  modelId: 'ReduxSliceReducer',
  version: '1.0.0',
  description: 'Reads the reducer from a Redux Toolkit slice.',
  inputs: {
    slice: expressionInput('Redux Toolkit slice expression.', reduxSliceType)
  },
  output: out('expression', { type: reduxReducerType }),
  source: `${"/** @TYPE expression id=slice **/undefined/** @END **/"}.reducer`
})

export const ReduxSliceActionsTemplate = defineTemplate({
  modelId: 'ReduxSliceActions',
  version: '1.0.0',
  description: 'Reads the action creator map from a Redux Toolkit slice.',
  inputs: {
    slice: expressionInput('Redux Toolkit slice expression.', reduxSliceType)
  },
  output: out('expression'),
  source: `${"/** @TYPE expression id=slice **/undefined/** @END **/"}.actions`
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
  source: `${"/** @TYPE expression id=slice **/undefined/** @END **/"}.actions.${"/** @TYPE identifier id=actionName **/placeholder/** @END **/"}`
})

export const ReduxCreateActionTemplate = defineTemplate({
  modelId: 'ReduxCreateAction',
  version: '1.0.0',
  description: 'Creates a Redux Toolkit action creator with createAction(type).',
  inputs: {
    type: stringLiteral('Action type string.')
  },
  output: out('expression', { type: reduxActionCreatorType }),
  source: `createAction(${"/** @TYPE string id=type **/\"\"/** @END **/"})`
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
  source: `createAction(${"/** @TYPE string id=type **/\"\"/** @END **/"}, ${"/** @TYPE expression id=prepare **/undefined/** @END **/"})`
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
  source: `createReducer(${"/** @TYPE expression id=initialState **/undefined/** @END **/"}, ${"/** @TYPE expression id=builder **/undefined/** @END **/"})`
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
  source: `.addCase(${"/** @TYPE expression id=actionCreator **/undefined/** @END **/"}, ${"/** @TYPE expression id=reducer **/undefined/** @END **/"})`
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
  source: `.addMatcher(${"/** @TYPE expression id=matcher **/undefined/** @END **/"}, ${"/** @TYPE expression id=reducer **/undefined/** @END **/"})`
})

export const ReduxBuilderAddDefaultCaseSuffixTemplate = defineTemplate({
  modelId: 'ReduxBuilderAddDefaultCaseSuffix',
  version: '1.0.0',
  description: 'Creates a builder-chain suffix for builder.addDefaultCase(reducer).',
  inputs: {
    reducer: callbackInput('Default case reducer callback expression.')
  },
  output: out('expressionSuffix'),
  source: `.addDefaultCase(${"/** @TYPE expression id=reducer **/undefined/** @END **/"})`
})

export const ReduxBuilderCallbackFromSuffixTemplate = defineTemplate({
  modelId: 'ReduxBuilderCallbackFromSuffix',
  version: '1.0.0',
  description: 'Wraps an expression suffix chain as an extraReducers builder callback.',
  inputs: {
    suffix: expressionSuffixFragment('Builder suffix chain.')
  },
  output: out('expression'),
  source: `builder => builder${"/** @TYPE expressionSuffix id=suffix **/.value/** @END **/"}`
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
  source: `createAsyncThunk(${"/** @TYPE string id=typePrefix **/\"\"/** @END **/"}, ${"/** @TYPE expression id=payloadCreator **/undefined/** @END **/"})`
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
  source: `createAsyncThunk(${"/** @TYPE string id=typePrefix **/\"\"/** @END **/"}, ${"/** @TYPE expression id=payloadCreator **/undefined/** @END **/"}, ${"/** @TYPE expression id=options **/undefined/** @END **/"})`
})

export const ReduxThunkPendingActionCreatorTemplate = defineTemplate({
  modelId: 'ReduxThunkPendingActionCreator',
  version: '1.0.0',
  description: 'Reads the pending lifecycle action creator from an async thunk.',
  inputs: {
    thunk: expressionInput('Async thunk expression.', reduxAsyncThunkType)
  },
  output: out('expression', { type: reduxActionCreatorType }),
  source: `${"/** @TYPE expression id=thunk **/undefined/** @END **/"}.pending`
})

export const ReduxThunkFulfilledActionCreatorTemplate = defineTemplate({
  modelId: 'ReduxThunkFulfilledActionCreator',
  version: '1.0.0',
  description: 'Reads the fulfilled lifecycle action creator from an async thunk.',
  inputs: {
    thunk: expressionInput('Async thunk expression.', reduxAsyncThunkType)
  },
  output: out('expression', { type: reduxActionCreatorType }),
  source: `${"/** @TYPE expression id=thunk **/undefined/** @END **/"}.fulfilled`
})

export const ReduxThunkRejectedActionCreatorTemplate = defineTemplate({
  modelId: 'ReduxThunkRejectedActionCreator',
  version: '1.0.0',
  description: 'Reads the rejected lifecycle action creator from an async thunk.',
  inputs: {
    thunk: expressionInput('Async thunk expression.', reduxAsyncThunkType)
  },
  output: out('expression', { type: reduxActionCreatorType }),
  source: `${"/** @TYPE expression id=thunk **/undefined/** @END **/"}.rejected`
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
  source: `${"/** @TYPE expression id=dispatch **/undefined/** @END **/"}(${"/** @TYPE expression id=thunk **/undefined/** @END **/"}(${"/** @TYPE expression id=arg **/undefined/** @END **/"}));`
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
  source: `${"/** @TYPE expression id=dispatch **/undefined/** @END **/"}(${"/** @TYPE expression id=thunk **/undefined/** @END **/"}(${"/** @TYPE expression id=arg **/undefined/** @END **/"})).unwrap()`
})

export const ReduxCreateEntityAdapterTemplate = defineTemplate({
  modelId: 'ReduxCreateEntityAdapter',
  version: '1.0.0',
  description: 'Creates an RTK entity adapter with createEntityAdapter(options).',
  inputs: {
    options: rawObjectExpression('Entity adapter options object, such as `{ selectId, sortComparer }`.')
  },
  output: out('expression', { type: reduxEntityAdapterType }),
  source: `createEntityAdapter(${"/** @TYPE expression id=options **/undefined/** @END **/"})`
})

export const ReduxCreateEntityAdapterDefaultTemplate = defineTemplate({
  modelId: 'ReduxCreateEntityAdapterDefault',
  version: '1.0.0',
  description: 'Creates a default RTK entity adapter with createEntityAdapter().',
  inputs: {},
  output: out('expression', { type: reduxEntityAdapterType }),
  source: 'createEntityAdapter()'
})

export const ReduxEntityAdapterInitialStateTemplate = defineTemplate({
  modelId: 'ReduxEntityAdapterInitialState',
  version: '1.0.0',
  description: 'Calls adapter.getInitialState().',
  inputs: {
    adapter: expressionInput('Entity adapter expression.', reduxEntityAdapterType)
  },
  output: out('expression', { type: reduxEntityStateType }),
  source: `${"/** @TYPE expression id=adapter **/undefined/** @END **/"}.getInitialState()`
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
  source: `${"/** @TYPE expression id=adapter **/undefined/** @END **/"}.getInitialState(${"/** @TYPE expression id=extraState **/undefined/** @END **/"})`
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
  source: `${"/** @TYPE expression id=adapter **/undefined/** @END **/"}.getSelectors(${"/** @TYPE expression id=selectState **/undefined/** @END **/"})`
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
  source: `${"/** @TYPE expression id=selectors **/undefined/** @END **/"}.selectAll(${"/** @TYPE expression id=state **/undefined/** @END **/"})`
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
  source: `${"/** @TYPE expression id=selectors **/undefined/** @END **/"}.selectById(${"/** @TYPE expression id=state **/undefined/** @END **/"}, ${"/** @TYPE expression id=id **/undefined/** @END **/"})`
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
  source: `${"/** @TYPE expression id=adapter **/undefined/** @END **/"}.setAll(${"/** @TYPE expression id=state **/undefined/** @END **/"}, ${"/** @TYPE expression id=entities **/undefined/** @END **/"});`
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
  source: `${"/** @TYPE expression id=adapter **/undefined/** @END **/"}.addOne(${"/** @TYPE expression id=state **/undefined/** @END **/"}, ${"/** @TYPE expression id=entity **/undefined/** @END **/"});`
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
  source: `${"/** @TYPE expression id=adapter **/undefined/** @END **/"}.upsertMany(${"/** @TYPE expression id=state **/undefined/** @END **/"}, ${"/** @TYPE expression id=entities **/undefined/** @END **/"});`
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
  source: `${"/** @TYPE expression id=adapter **/undefined/** @END **/"}.updateOne(${"/** @TYPE expression id=state **/undefined/** @END **/"}, ${"/** @TYPE expression id=update **/undefined/** @END **/"});`
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
  source: `${"/** @TYPE expression id=adapter **/undefined/** @END **/"}.removeOne(${"/** @TYPE expression id=state **/undefined/** @END **/"}, ${"/** @TYPE expression id=id **/undefined/** @END **/"});`
})

export const ReduxFetchBaseQueryTemplate = defineTemplate({
  modelId: 'ReduxFetchBaseQuery',
  version: '1.0.0',
  description: 'Creates an RTK Query fetch base query with fetchBaseQuery(options).',
  inputs: {
    options: rawObjectExpression('fetchBaseQuery options object, such as `{ baseUrl, prepareHeaders }`.')
  },
  output: out('expression'),
  source: `fetchBaseQuery(${"/** @TYPE expression id=options **/undefined/** @END **/"})`
})

export const ReduxCreateApiTemplate = defineTemplate({
  modelId: 'ReduxCreateApi',
  version: '1.0.0',
  description: 'Creates an RTK Query API slice from a full createApi options object.',
  inputs: {
    options: rawObjectExpression('createApi options object.', rtkQueryApiType)
  },
  output: out('expression', { type: rtkQueryApiType }),
  source: `createApi(${"/** @TYPE expression id=options **/undefined/** @END **/"})`
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
  source: `createApi({ reducerPath: ${"/** @TYPE string id=reducerPath **/\"\"/** @END **/"}, baseQuery: ${"/** @TYPE expression id=baseQuery **/undefined/** @END **/"}, tagTypes: ${"/** @TYPE expression id=tagTypes **/undefined/** @END **/"}, endpoints: ${"/** @TYPE expression id=endpoints **/undefined/** @END **/"} })`
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
  source: `${"/** @TYPE string id=name **/\"\"/** @END **/"}: build.query(${"/** @TYPE expression id=config **/undefined/** @END **/"})`
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
  source: `${"/** @TYPE string id=name **/\"\"/** @END **/"}: build.mutation(${"/** @TYPE expression id=config **/undefined/** @END **/"})`
})

export const ReduxApiReducerPathTemplate = defineTemplate({
  modelId: 'ReduxApiReducerPath',
  version: '1.0.0',
  description: 'Reads api.reducerPath from an RTK Query API slice.',
  inputs: {
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType)
  },
  output: out('expression', { type: stringType }),
  source: `${"/** @TYPE expression id=api **/undefined/** @END **/"}.reducerPath`
})

export const ReduxApiReducerMapPropertyTemplate = defineTemplate({
  modelId: 'ReduxApiReducerMapProperty',
  version: '1.0.0',
  description: 'Creates a computed reducer-map property for an RTK Query API slice: [api.reducerPath]: api.reducer.',
  inputs: {
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType)
  },
  output: out('expression'),
  source: `(api => ({ [api.reducerPath]: api.reducer }))(${"/** @TYPE expression id=api **/undefined/** @END **/"})`
})

export const ReduxApiMiddlewareConcatTemplate = defineTemplate({
  modelId: 'ReduxApiMiddlewareConcat',
  version: '1.0.0',
  description: 'Creates a configureStore middleware callback that concatenates api.middleware.',
  inputs: {
    api: expressionInput('RTK Query API slice expression.', rtkQueryApiType)
  },
  output: out('expression'),
  source: `getDefaultMiddleware => getDefaultMiddleware().concat(${"/** @TYPE expression id=api **/undefined/** @END **/"}.middleware)`
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
  source: `${"/** @TYPE expression id=api **/undefined/** @END **/"}.injectEndpoints({ endpoints: ${"/** @TYPE expression id=endpoints **/undefined/** @END **/"} })`
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
  source: `${"/** @TYPE expression id=api **/undefined/** @END **/"}.enhanceEndpoints(${"/** @TYPE expression id=options **/undefined/** @END **/"})`
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
  source: `${"/** @TYPE expression id=api **/undefined/** @END **/"}.util.invalidateTags(${"/** @TYPE expression id=tags **/undefined/** @END **/"})`
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
  source: `${"/** @TYPE expression id=dispatch **/undefined/** @END **/"}(${"/** @TYPE expression id=api **/undefined/** @END **/"}.util.prefetch(${"/** @TYPE string id=endpointName **/\"\"/** @END **/"}, ${"/** @TYPE expression id=arg **/undefined/** @END **/"}, ${"/** @TYPE expression id=options **/undefined/** @END **/"}));`
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
  source: `React.createElement(Provider, { store: ${"/** @TYPE expression id=store **/undefined/** @END **/"} }, ${"/** @TYPE expression id=children **/undefined/** @END **/"})`
})

export const ReactReduxUseDispatchTemplate = defineTemplate({
  modelId: 'ReactReduxUseDispatch',
  version: '1.0.0',
  description: 'Calls useDispatch().',
  inputs: {},
  output: out('expression', { type: reduxDispatchType }),
  source: 'useDispatch()'
})

export const ReactReduxUseSelectorTemplate = defineTemplate({
  modelId: 'ReactReduxUseSelector',
  version: '1.0.0',
  description: 'Calls useSelector(selector).',
  inputs: {
    selector: expressionInput('Selector callback expression.', reduxSelectorType)
  },
  output: out('expression'),
  source: `useSelector(${"/** @TYPE expression id=selector **/undefined/** @END **/"})`
})

export const ReactReduxUseSelectorShallowEqualTemplate = defineTemplate({
  modelId: 'ReactReduxUseSelectorShallowEqual',
  version: '1.0.0',
  description: 'Calls useSelector(selector, shallowEqual). Assumes shallowEqual is imported from react-redux.',
  inputs: {
    selector: expressionInput('Selector callback expression.', reduxSelectorType)
  },
  output: out('expression'),
  source: `useSelector(${"/** @TYPE expression id=selector **/undefined/** @END **/"}, shallowEqual)`
})

export const ReactReduxUseStoreTemplate = defineTemplate({
  modelId: 'ReactReduxUseStore',
  version: '1.0.0',
  description: 'Calls useStore().',
  inputs: {},
  output: out('expression', { type: reduxStoreType }),
  source: 'useStore()'
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
  source: `${"/** @TYPE expression id=dispatch **/undefined/** @END **/"}(${"/** @TYPE expression id=action **/undefined/** @END **/"});`
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
  source: `${"/** @TYPE expression id=dispatch **/undefined/** @END **/"}(${"/** @TYPE expression id=actionCreator **/undefined/** @END **/"}(${"/** @TYPE expression id=payload **/undefined/** @END **/"}));`
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
  source: `export const ${"/** @TYPE identifier id=dispatchHookName **/placeholder/** @END **/"} = useDispatch.withTypes<${"/** @TYPE identifier id=appDispatchType **/placeholder/** @END **/"}>();\nexport const ${"/** @TYPE identifier id=selectorHookName **/placeholder/** @END **/"} = useSelector.withTypes<${"/** @TYPE identifier id=rootStateType **/placeholder/** @END **/"}>();\nexport const ${"/** @TYPE identifier id=storeHookName **/placeholder/** @END **/"} = useStore.withTypes<${"/** @TYPE identifier id=appStoreType **/placeholder/** @END **/"}>();`
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
  source: `export type ${"/** @TYPE identifier id=typeName **/placeholder/** @END **/"} = ReturnType<typeof ${"/** @TYPE identifier id=storeIdentifier **/placeholder/** @END **/"}.getState>;`
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
  source: `export type ${"/** @TYPE identifier id=typeName **/placeholder/** @END **/"} = typeof ${"/** @TYPE identifier id=storeIdentifier **/placeholder/** @END **/"}.dispatch;`
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
  source: `createSelector([${"/** @TYPE expression id=selectorA **/undefined/** @END **/"}, ${"/** @TYPE expression id=selectorB **/undefined/** @END **/"}], ${"/** @TYPE expression id=result **/undefined/** @END **/"})`
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
  source: `createSelector([${"/** @TYPE expression id=selectorA **/undefined/** @END **/"}, ${"/** @TYPE expression id=selectorB **/undefined/** @END **/"}, ${"/** @TYPE expression id=selectorC **/undefined/** @END **/"}], ${"/** @TYPE expression id=result **/undefined/** @END **/"})`
})

export const ReduxSelectorPathTemplate = defineTemplate({
  modelId: 'ReduxSelectorPath',
  version: '1.0.0',
  description: 'Creates a simple selector that reads state[key].',
  inputs: {
    key: identifierLiteral('Root state property name.')
  },
  output: out('expression', { type: reduxSelectorType }),
  source: `(state => state.${"/** @TYPE identifier id=key **/placeholder/** @END **/"})`
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
  source: `(state => state.${"/** @TYPE identifier id=parent **/placeholder/** @END **/"}.${"/** @TYPE identifier id=child **/placeholder/** @END **/"})`
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
  source: `(state => ${"/** @TYPE expression id=selector **/undefined/** @END **/"}(state).map(${"/** @TYPE expression id=mapper **/undefined/** @END **/"}))`
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
  source: `(state => ${"/** @TYPE expression id=selector **/undefined/** @END **/"}(state).filter(${"/** @TYPE expression id=predicate **/undefined/** @END **/"}))`
})

export const ReduxCreateListenerMiddlewareTemplate = defineTemplate({
  modelId: 'ReduxCreateListenerMiddleware',
  version: '1.0.0',
  description: 'Creates an RTK listener middleware instance.',
  inputs: {},
  output: out('expression', { type: listenerMiddlewareType }),
  source: 'createListenerMiddleware()'
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
  source: `${"/** @TYPE expression id=listenerMiddleware **/undefined/** @END **/"}.startListening({ predicate: ${"/** @TYPE expression id=predicate **/undefined/** @END **/"}, effect: ${"/** @TYPE expression id=effect **/undefined/** @END **/"} });`
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
  source: `${"/** @TYPE expression id=listenerMiddleware **/undefined/** @END **/"}.startListening({ actionCreator: ${"/** @TYPE expression id=actionCreator **/undefined/** @END **/"}, effect: ${"/** @TYPE expression id=effect **/undefined/** @END **/"} });`
})

export const ReduxListenerMiddlewarePrependTemplate = defineTemplate({
  modelId: 'ReduxListenerMiddlewarePrepend',
  version: '1.0.0',
  description: 'Creates a configureStore middleware callback that prepends listenerMiddleware.middleware.',
  inputs: {
    listenerMiddleware: expressionInput('Listener middleware instance.', listenerMiddlewareType)
  },
  output: out('expression'),
  source: `getDefaultMiddleware => getDefaultMiddleware().prepend(${"/** @TYPE expression id=listenerMiddleware **/undefined/** @END **/"}.middleware)`
})

export const ReduxIsAnyOfTemplate = defineTemplate({
  modelId: 'ReduxIsAnyOf',
  version: '1.0.0',
  description: 'Creates an RTK matcher with isAnyOf(...actionCreators).',
  inputs: {
    actionCreators: rawExpression('Comma-separated action creators or an array spread, such as `a, b` or `...actions`.'),
  },
  output: out('expression'),
  source: `isAnyOf(${"/** @TYPE expression id=actionCreators **/undefined/** @END **/"})`
})

export const ReduxIsAllOfTemplate = defineTemplate({
  modelId: 'ReduxIsAllOf',
  version: '1.0.0',
  description: 'Creates an RTK matcher with isAllOf(...matchers).',
  inputs: {
    matchers: rawExpression('Comma-separated matcher expressions or an array spread, such as `a, b` or `...matchers`.'),
  },
  output: out('expression'),
  source: `isAllOf(${"/** @TYPE expression id=matchers **/undefined/** @END **/"})`
})

export const ReduxIsPendingTemplate = defineTemplate({
  modelId: 'ReduxIsPending',
  version: '1.0.0',
  description: 'Creates an RTK matcher for pending async thunk actions.',
  inputs: {
    thunks: rawExpression('Comma-separated async thunk expressions or an array spread.')
  },
  output: out('expression'),
  source: `isPending(${"/** @TYPE expression id=thunks **/undefined/** @END **/"})`
})

export const ReduxIsFulfilledTemplate = defineTemplate({
  modelId: 'ReduxIsFulfilled',
  version: '1.0.0',
  description: 'Creates an RTK matcher for fulfilled async thunk actions.',
  inputs: {
    thunks: rawExpression('Comma-separated async thunk expressions or an array spread.')
  },
  output: out('expression'),
  source: `isFulfilled(${"/** @TYPE expression id=thunks **/undefined/** @END **/"})`
})

export const ReduxIsRejectedTemplate = defineTemplate({
  modelId: 'ReduxIsRejected',
  version: '1.0.0',
  description: 'Creates an RTK matcher for rejected async thunk actions.',
  inputs: {
    thunks: rawExpression('Comma-separated async thunk expressions or an array spread.')
  },
  output: out('expression'),
  source: `isRejected(${"/** @TYPE expression id=thunks **/undefined/** @END **/"})`
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
  source: `${"/** @TYPE expression id=actionCreator **/undefined/** @END **/"}(${"/** @TYPE expression id=payload **/undefined/** @END **/"})`
})

export const ReduxActionCreatorNoPayloadCallTemplate = defineTemplate({
  modelId: 'ReduxActionCreatorNoPayloadCall',
  version: '1.0.0',
  description: 'Calls an action creator with no payload arguments.',
  inputs: {
    actionCreator: expressionInput('Action creator expression.', reduxActionCreatorType)
  },
  output: out('expression', { type: reduxPayloadActionType }),
  source: `${"/** @TYPE expression id=actionCreator **/undefined/** @END **/"}()`
})

export const ReduxPayloadActionPayloadTemplate = defineTemplate({
  modelId: 'ReduxPayloadActionPayload',
  version: '1.0.0',
  description: 'Reads action.payload from a Redux Toolkit PayloadAction.',
  inputs: {
    action: expressionInput('PayloadAction expression.', reduxPayloadActionType)
  },
  output: out('expression'),
  source: `${"/** @TYPE expression id=action **/undefined/** @END **/"}.payload`
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
  source: `${"/** @TYPE expression id=draft **/undefined/** @END **/"}.${"/** @TYPE identifier id=key **/placeholder/** @END **/"} = ${"/** @TYPE expression id=value **/undefined/** @END **/"};`
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
  source: `${"/** @TYPE expression id=draft **/undefined/** @END **/"}.${"/** @TYPE identifier id=key **/placeholder/** @END **/"}.push(${"/** @TYPE expression id=value **/undefined/** @END **/"});`
})

export const ReduxReturnStateStatementTemplate = defineTemplate({
  modelId: 'ReduxReturnStateStatement',
  version: '1.0.0',
  description: 'Returns an expression from a case reducer or selector helper.',
  inputs: {
    value: expressionInput('Returned value expression.')
  },
  output: out('statement'),
  source: `return ${"/** @TYPE expression id=value **/undefined/** @END **/"};`
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
  source: `persistReducer(${"/** @TYPE expression id=config **/undefined/** @END **/"}, ${"/** @TYPE expression id=reducer **/undefined/** @END **/"})`
})

export const ReduxPersistStoreTemplate = defineTemplate({
  modelId: 'ReduxPersistStore',
  version: '1.0.0',
  description: 'Creates a persistor with persistStore(store).',
  inputs: {
    store: expressionInput('Redux store expression.', reduxStoreType)
  },
  output: out('expression'),
  source: `persistStore(${"/** @TYPE expression id=store **/undefined/** @END **/"})`
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
  source: `React.createElement(PersistGate, { persistor: ${"/** @TYPE expression id=persistor **/undefined/** @END **/"}, loading: ${"/** @TYPE expression id=loading **/undefined/** @END **/"} }, ${"/** @TYPE expression id=children **/undefined/** @END **/"})`
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
  source: `yield takeLatest(${"/** @TYPE expression id=pattern **/undefined/** @END **/"}, ${"/** @TYPE expression id=worker **/undefined/** @END **/"}${"/** @TYPE expression id=args **/undefined/** @END **/"});`
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
  source: `yield takeEvery(${"/** @TYPE expression id=pattern **/undefined/** @END **/"}, ${"/** @TYPE expression id=worker **/undefined/** @END **/"}${"/** @TYPE expression id=args **/undefined/** @END **/"});`
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
  source: `call(${"/** @TYPE expression id=fn **/undefined/** @END **/"}${"/** @TYPE expression id=args **/undefined/** @END **/"})`
})

export const ReduxSagaPutStatementTemplate = defineTemplate({
  modelId: 'ReduxSagaPutStatement',
  version: '1.0.0',
  description: 'Yields a redux-saga put(action) effect.',
  inputs: {
    action: expressionInput('Action expression.', reduxActionType)
  },
  output: out('statement', { type: sagaEffectType }),
  source: `yield put(${"/** @TYPE expression id=action **/undefined/** @END **/"});`
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
  source: `select(${"/** @TYPE expression id=selector **/undefined/** @END **/"}${"/** @TYPE expression id=args **/undefined/** @END **/"})`
})

export const ReduxSagaAllExpressionTemplate = defineTemplate({
  modelId: 'ReduxSagaAllExpression',
  version: '1.0.0',
  description: 'Creates a redux-saga all(effects) expression.',
  inputs: {
    effects: expressionInput('Array or object of saga effects.')
  },
  output: out('expression', { type: sagaEffectType }),
  source: `all(${"/** @TYPE expression id=effects **/undefined/** @END **/"})`
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
  source: `yield fork(${"/** @TYPE expression id=fn **/undefined/** @END **/"}${"/** @TYPE expression id=args **/undefined/** @END **/"});`
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
  source: `${"/** @TYPE statement id=first **/throw new Error(\"placeholder\");/** @END **/"}\n${"/** @TYPE statement id=second **/throw new Error(\"placeholder\");/** @END **/"}`
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
  source: `${"/** @TYPE statement id=first **/throw new Error(\"placeholder\");/** @END **/"}\n${"/** @TYPE statement id=second **/throw new Error(\"placeholder\");/** @END **/"}\n${"/** @TYPE statement id=third **/throw new Error(\"placeholder\");/** @END **/"}`
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
  source: `const ${"/** @TYPE identifier id=name **/placeholder/** @END **/"} = ${"/** @TYPE expression id=value **/undefined/** @END **/"};`
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
  source: `export const ${"/** @TYPE identifier id=name **/placeholder/** @END **/"} = ${"/** @TYPE expression id=value **/undefined/** @END **/"};`
})

export const ReduxExportDefaultStatementTemplate = defineTemplate({
  modelId: 'ReduxExportDefaultStatement',
  version: '1.0.0',
  description: 'Exports an expression as default.',
  inputs: {
    value: expressionInput('Default export expression.')
  },
  output: out('statement'),
  source: `export default ${"/** @TYPE expression id=value **/undefined/** @END **/"};`
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
  source: `(api => configureStore({ reducer: { ...${"/** @TYPE expression id=reducers **/undefined/** @END **/"}, [api.reducerPath]: api.reducer }, middleware: getDefaultMiddleware => getDefaultMiddleware().concat(api.middleware) }))(${"/** @TYPE expression id=api **/undefined/** @END **/"})`
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
  source: `(adapter => createSlice({ name: ${"/** @TYPE string id=name **/\"\"/** @END **/"}, initialState: adapter.getInitialState(), reducers: { setAll: adapter.setAll, addOne: adapter.addOne, upsertMany: adapter.upsertMany, removeOne: adapter.removeOne, ...${"/** @TYPE expression id=extraReducers **/undefined/** @END **/"} } }))(${"/** @TYPE expression id=adapter **/undefined/** @END **/"})`
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
  source: `((resourcePath, tagType) => createApi({ reducerPath: ${"/** @TYPE string id=reducerPath **/\"\"/** @END **/"}, baseQuery: fetchBaseQuery({ baseUrl: ${"/** @TYPE string id=baseUrl **/\"\"/** @END **/"} }), tagTypes: [tagType], endpoints: build => ({ list: build.query({ query: () => resourcePath, providesTags: [tagType] }), get: build.query({ query: id => \`\${resourcePath}/\${id}\`, providesTags: (_result, _error, id) => [{ type: tagType, id }] }), create: build.mutation({ query: body => ({ url: resourcePath, method: 'POST', body }), invalidatesTags: [tagType] }), update: build.mutation({ query: ({ id, ...patch }) => ({ url: \`\${resourcePath}/\${id}\`, method: 'PATCH', body: patch }), invalidatesTags: (_result, _error, { id }) => [{ type: tagType, id }] }), delete: build.mutation({ query: id => ({ url: \`\${resourcePath}/\${id}\`, method: 'DELETE' }), invalidatesTags: [tagType] }) }) }))(${"/** @TYPE string id=resourcePath **/\"\"/** @END **/"}, ${"/** @TYPE string id=tagType **/\"\"/** @END **/"})`
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
