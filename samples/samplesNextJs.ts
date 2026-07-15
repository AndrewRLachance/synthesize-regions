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

export const stringType: TypeDescriptor = { ts: 'string', schema: { type: 'string' } }
export const stringOrUrlType: TypeDescriptor = { ts: 'string | URL' }
export const nextResponseType: TypeDescriptor = { ts: 'NextResponse' }
export const cookieValueType: TypeDescriptor = { ts: 'string | undefined' }
export const headerValueType: TypeDescriptor = { ts: 'string | null' }

export const safeRawExpressionPolicy: RawCodePolicy = {
  description: 'Single-line expression. Dangerous globals and module-loading constructs are rejected before generation.',
  maxLength: 500,
  allowNewlines: false,
  forbiddenSubstrings: ['import', 'require', 'process', 'globalThis', 'Function', 'eval'],
  forbiddenPatterns: [
    '\\bnew\\s+Function\\b',
    '\\bwhile\\s*\\(',
    '\\bfor\\s*\\(',
    '\\bclass\\b'
  ]
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

export const stringExpressionFragment = (description?: string): FragmentInputPort =>
  expressionFragment(description, stringType)

export const stringLiteral = (description?: string): LiteralInputPort =>
  literalPort({
    regionKind: 'string',
    schema: { type: 'string' },
    ...(description ? { description } : {})
  })

export const rawExpression = (description?: string, type?: TypeDescriptor): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawExpressionPolicy,
    ...(type ? { type } : {}),
    ...(description ? { description } : {})
  })

// -----------------------------------------------------------------------------
// Next.js App Router templates.
//
// These definitions assume the corresponding Next.js bindings are imported in
// the generated code context:
// - NextResponse from 'next/server'
// - redirect and notFound from 'next/navigation'
// - revalidatePath and revalidateTag from 'next/cache'
// - cookies and headers from 'next/headers'
//
// Templates that use cookies() or headers() emit await expressions/statements and
// must be composed into an async Server Component, Server Function, Route Handler,
// or other server-only async context.
// -----------------------------------------------------------------------------

export const NextResponseJsonTemplate = defineTemplate({
  modelId: 'NextResponseJson',
  version: '1.0.0',
  description: 'Creates a Next.js JSON response with NextResponse.json(body, init). Assumes `NextResponse` is in scope from next/server.',
  inputs: {
    body: expressionFragment('JSON-serializable response body expression.'),
    init: rawExpression('Response init expression, such as `{ status: 200 }` or `{ headers }`.')
  },
  output: out('expression', { type: nextResponseType }),
  source: `NextResponse.json(${"/** @TYPE expression id=body **/undefined/** @END **/"}, ${"/** @TYPE expression id=init **/undefined/** @END **/"})`
})

export const NextResponseRedirectTemplate = defineTemplate({
  modelId: 'NextResponseRedirect',
  version: '1.0.0',
  description: 'Creates a redirect response with NextResponse.redirect(url, init). Assumes `NextResponse` is in scope from next/server.',
  inputs: {
    url: expressionFragment('Redirect URL expression, usually a string or URL.', stringOrUrlType),
    init: rawExpression('Redirect init expression, such as `307` or `{ status: 308 }`.')
  },
  output: out('expression', { type: nextResponseType }),
  source: `NextResponse.redirect(${"/** @TYPE expression id=url **/undefined/** @END **/"}, ${"/** @TYPE expression id=init **/undefined/** @END **/"})`
})

export const NextResponseRewriteTemplate = defineTemplate({
  modelId: 'NextResponseRewrite',
  version: '1.0.0',
  description: 'Creates a rewrite response with NextResponse.rewrite(url, init). Assumes `NextResponse` is in scope from next/server.',
  inputs: {
    url: expressionFragment('Rewrite target URL expression, usually a URL.', stringOrUrlType),
    init: rawExpression('Rewrite init expression, usually `{ request: { headers } }` or `{}`.')
  },
  output: out('expression', { type: nextResponseType }),
  source: `NextResponse.rewrite(${"/** @TYPE expression id=url **/undefined/** @END **/"}, ${"/** @TYPE expression id=init **/undefined/** @END **/"})`
})

export const NextRedirectStatementTemplate = defineTemplate({
  modelId: 'NextRedirectStatement',
  version: '1.0.0',
  description: 'Emits a redirect(path) statement for Server Components, Server Functions, Route Handlers, or Server Actions. Assumes `redirect` is in scope from next/navigation.',
  inputs: {
    path: expressionFragment('Redirect destination expression.', stringOrUrlType)
  },
  output: out('statement'),
  source: `redirect(${"/** @TYPE expression id=path **/undefined/** @END **/"});`
})

export const NextNotFoundStatementTemplate = defineTemplate({
  modelId: 'NextNotFoundStatement',
  version: '1.0.0',
  description: 'Emits a notFound() statement to render the nearest not-found boundary. Assumes `notFound` is in scope from next/navigation.',
  inputs: {},
  output: out('statement'),
  source: 'notFound();'
})

export const NextRevalidatePathStatementTemplate = defineTemplate({
  modelId: 'NextRevalidatePathStatement',
  version: '1.0.0',
  description: 'Emits revalidatePath(path, type) for Server Functions or Route Handlers. Assumes `revalidatePath` is in scope from next/cache.',
  inputs: {
    path: stringExpressionFragment('Route path or route pattern to revalidate.'),
    type: rawExpression('Path type expression: `"page"`, `"layout"`, `undefined`, or a compatible variable.')
  },
  output: out('statement'),
  source: `revalidatePath(${"/** @TYPE expression id=path **/undefined/** @END **/"}, ${"/** @TYPE expression id=type **/undefined/** @END **/"});`
})

export const NextRevalidateTagStatementTemplate = defineTemplate({
  modelId: 'NextRevalidateTagStatement',
  version: '1.0.0',
  description: 'Emits revalidateTag(tag, profile) for Server Functions or Route Handlers. Assumes `revalidateTag` is in scope from next/cache.',
  inputs: {
    tag: stringExpressionFragment('Cache tag to revalidate.'),
    profile: rawExpression('Revalidation profile expression, preferably `"max"`, or an object such as `{ expire: 0 }`.')
  },
  output: out('statement'),
  source: `revalidateTag(${"/** @TYPE expression id=tag **/undefined/** @END **/"}, ${"/** @TYPE expression id=profile **/undefined/** @END **/"});`
})

export const NextCookiesGetValueTemplate = defineTemplate({
  modelId: 'NextCookiesGetValue',
  version: '1.0.0',
  description: 'Reads a cookie value with (await cookies()).get(name)?.value. Assumes `cookies` is in scope from next/headers and the generated code is in an async server context.',
  inputs: {
    name: stringExpressionFragment('Cookie name expression.')
  },
  output: out('expression', { type: cookieValueType }),
  source: `(await cookies()).get(${"/** @TYPE expression id=name **/undefined/** @END **/"})?.value`
})

export const NextCookiesSetStatementTemplate = defineTemplate({
  modelId: 'NextCookiesSetStatement',
  version: '1.0.0',
  description: 'Sets a cookie with (await cookies()).set(name, value, options). Assumes `cookies` is in scope from next/headers and the generated code is in a Server Function or Route Handler.',
  inputs: {
    name: stringExpressionFragment('Cookie name expression.'),
    value: stringExpressionFragment('Cookie value expression.'),
    options: rawExpression('Cookie options expression, such as `{ httpOnly: true, path: "/" }` or `{}`.')
  },
  output: out('statement'),
  source: `(await cookies()).set(${"/** @TYPE expression id=name **/undefined/** @END **/"}, ${"/** @TYPE expression id=value **/undefined/** @END **/"}, ${"/** @TYPE expression id=options **/undefined/** @END **/"});`
})

export const NextHeadersGetTemplate = defineTemplate({
  modelId: 'NextHeadersGet',
  version: '1.0.0',
  description: 'Reads an incoming request header with (await headers()).get(name). Assumes `headers` is in scope from next/headers and the generated code is in an async server context.',
  inputs: {
    name: stringExpressionFragment('Header name expression, such as `"authorization"` or `"user-agent"`.')
  },
  output: out('expression', { type: headerValueType }),
  source: `(await headers()).get(${"/** @TYPE expression id=name **/undefined/** @END **/"})`
})

export const nextjsGraphTemplateInputs = [
  NextResponseJsonTemplate,
  NextResponseRedirectTemplate,
  NextResponseRewriteTemplate,
  NextRedirectStatementTemplate,
  NextNotFoundStatementTemplate,
  NextRevalidatePathStatementTemplate,
  NextRevalidateTagStatementTemplate,
  NextCookiesGetValueTemplate,
  NextCookiesSetStatementTemplate,
  NextHeadersGetTemplate
] satisfies readonly AnyGraphTemplateDefinitionInput[]
