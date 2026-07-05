import {
	type GraphCompilationResult} from '../src/templates/graphTypes.js'
import { fragmentPort, literalPort, rawCodePort } from '../src/templates/compatibility.js'
import { defineTemplate } from '../src/templates/definition.js'
import type { GraphTemplateDefinitionInput } from '../src/templates/definition.js'
import type {
  FragmentInputPort,
  InputPort,
  LiteralInputPort,
  OutputPort,
  RawCodeInputPort,
  RawCodePolicy,
  RegionKind,
  TypeDescriptor
} from '../src/templates/graphTypes.js'

export type AnyGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
  string,
  Record<string, InputPort>
>



function out(kind: RegionKind, extra: Omit<OutputPort, 'kind'> = {}): OutputPort {
  return { kind, ...extra }
}

const stringType: TypeDescriptor = { ts: 'string', schema: { type: 'string' } }
const stringOrUrlType: TypeDescriptor = { ts: 'string | URL' }
const requestType: TypeDescriptor = { ts: 'Request | NextRequest' }
const userAgentType: TypeDescriptor = { ts: 'ReturnType<typeof userAgent>' }
const booleanType: TypeDescriptor = { ts: 'boolean', schema: { type: 'boolean' } }

const safeRawExpressionPolicy: RawCodePolicy = {
  description: 'Single-line expression. Dangerous globals and module-loading constructs are rejected before generation.',
  maxLength: 600,
  allowNewlines: false,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: [
    '\\bnew\\s+Function\\b',
    '\\bwhile\\s*\\(',
    '\\bfor\\s*\\(',
    '\\bclass\\b'
  ]
}

const safeRawCallbackPolicy: RawCodePolicy = {
  description: 'Single-line callback expression, such as `() => log()` or `async () => sendMetric()`.',
  maxLength: 800,
  allowNewlines: false,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: [
    '\\bnew\\s+Function\\b',
    '\\bwhile\\s*\\(',
    '\\bfor\\s*\\(',
    '\\bclass\\b'
  ]
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

const stringExpressionFragment = (description?: string): FragmentInputPort =>
  expressionFragment(description, stringType)

const rawExpression = (description?: string, type?: TypeDescriptor): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawExpressionPolicy,
    ...(type ? { type } : {}),
    ...(description ? { description } : {})
  })

const rawCallbackExpression = (description?: string): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawCallbackPolicy,
    type: { ts: '() => void | Promise<void>' },
    ...(description ? { description } : {})
  })

const cacheLifeProfileLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'string',
    schema: {
      enum: ['default', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'max']
    },
    ...(description ? { description } : {})
  })

// -----------------------------------------------------------------------------
// Additional Next.js App Router / Server Runtime templates.
//
// These definitions assume the corresponding Next.js bindings are imported in
// the generated code context:
// - permanentRedirect from 'next/navigation'
// - refresh, updateTag, cacheTag, cacheLife from 'next/cache'
// - draftMode from 'next/headers'
// - userAgent and after from 'next/server'
//
// Several templates are context-sensitive:
// - refresh() and updateTag() are Server Action only.
// - draftMode().enable()/disable() are for Route Handlers.
// - cacheTag() and cacheLife() require a Cache Components / `use cache` scope.
// -----------------------------------------------------------------------------

export const NextPermanentRedirectStatementTemplate = defineTemplate({
  modelId: 'NextPermanentRedirectStatement',
  version: '1.0.0',
  description: 'Emits permanentRedirect(path) for a 308-style permanent redirect. Assumes `permanentRedirect` is in scope from next/navigation.',
  inputs: {
    path: expressionFragment('Permanent redirect destination expression.', stringOrUrlType)
  },
  output: out('statement'),
  template: r => `permanentRedirect(${r('path')});`
})

export const NextRefreshStatementTemplate = defineTemplate({
  modelId: 'NextRefreshStatement',
  version: '1.0.0',
  description: 'Emits refresh() to refresh the client router from a Server Action. Assumes `refresh` is in scope from next/cache.',
  inputs: {},
  output: out('statement'),
  template: () => 'refresh();'
})

export const NextUpdateTagStatementTemplate = defineTemplate({
  modelId: 'NextUpdateTagStatement',
  version: '1.0.0',
  description: 'Emits updateTag(tag) for read-your-own-writes cache invalidation in a Server Action. Assumes `updateTag` is in scope from next/cache.',
  inputs: {
    tag: stringExpressionFragment('Cache tag expression to expire immediately.')
  },
  output: out('statement'),
  template: r => `updateTag(${r('tag')});`
})

export const NextDraftModeIsEnabledTemplate = defineTemplate({
  modelId: 'NextDraftModeIsEnabled',
  version: '1.0.0',
  description: 'Reads Draft Mode state with (await draftMode()).isEnabled. Assumes `draftMode` is in scope from next/headers and the generated code is in an async server context.',
  inputs: {},
  output: out('expression', { type: booleanType, schema: { type: 'boolean' } }),
  template: () => `(await draftMode()).isEnabled`
})

export const NextDraftModeEnableStatementTemplate = defineTemplate({
  modelId: 'NextDraftModeEnableStatement',
  version: '1.0.0',
  description: 'Enables Draft Mode with (await draftMode()).enable(). Assumes `draftMode` is in scope from next/headers and the generated code is in a Route Handler.',
  inputs: {},
  output: out('statement'),
  template: () => `(await draftMode()).enable();`
})

export const NextDraftModeDisableStatementTemplate = defineTemplate({
  modelId: 'NextDraftModeDisableStatement',
  version: '1.0.0',
  description: 'Disables Draft Mode with (await draftMode()).disable(). Assumes `draftMode` is in scope from next/headers and the generated code is in a Route Handler.',
  inputs: {},
  output: out('statement'),
  template: () => `(await draftMode()).disable();`
})

export const NextUserAgentTemplate = defineTemplate({
  modelId: 'NextUserAgent',
  version: '1.0.0',
  description: 'Parses a Request or NextRequest with userAgent(request). Assumes `userAgent` is in scope from next/server.',
  inputs: {
    request: expressionFragment('Request or NextRequest expression.', requestType)
  },
  output: out('expression', { type: userAgentType }),
  template: r => `userAgent(${r('request')})`
})

export const NextAfterStatementTemplate = defineTemplate({
  modelId: 'NextAfterStatement',
  version: '1.0.0',
  description: 'Schedules non-blocking work after the response or prerender finishes with after(callback). Assumes `after` is in scope from next/server.',
  inputs: {
    callback: rawCallbackExpression('Callback expression to run after the response, such as `() => log()` or `async () => sendMetric()`.' )
  },
  output: out('statement'),
  template: r => `after(${r('callback')});`
})

export const NextCacheTagStatementTemplate = defineTemplate({
  modelId: 'NextCacheTagStatement',
  version: '1.0.0',
  description: 'Adds a cache tag inside a `use cache` scope with cacheTag(tag). Assumes `cacheTag` is in scope from next/cache.',
  inputs: {
    tag: stringExpressionFragment('Cache tag expression to associate with cached data.')
  },
  output: out('statement'),
  template: r => `cacheTag(${r('tag')});`
})

export const NextCacheLifeStatementTemplate = defineTemplate({
  modelId: 'NextCacheLifeStatement',
  version: '1.0.0',
  description: 'Sets cache lifetime inside a `use cache` scope with cacheLife(profile). Assumes `cacheLife` is in scope from next/cache.',
  inputs: {
    profile: cacheLifeProfileLiteral('Cache lifetime profile, such as `seconds`, `minutes`, `hours`, `days`, `weeks`, or `max`.')
  },
  output: out('statement'),
  template: r => `cacheLife(${r('profile')});`
})

export const nextjsMoreGraphTemplateInputs = [
  NextPermanentRedirectStatementTemplate,
  NextRefreshStatementTemplate,
  NextUpdateTagStatementTemplate,
  NextDraftModeIsEnabledTemplate,
  NextDraftModeEnableStatementTemplate,
  NextDraftModeDisableStatementTemplate,
  NextUserAgentTemplate,
  NextAfterStatementTemplate,
  NextCacheTagStatementTemplate,
  NextCacheLifeStatementTemplate
] satisfies readonly AnyGraphTemplateDefinitionInput[]
