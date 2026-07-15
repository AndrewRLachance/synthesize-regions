import type { GraphTemplateDefinitionInput } from '../src/templates/definition.js'
import type {
  FragmentInputPort,
  InputPort,
  OutputPort,
  RawCodeInputPort,
  RawCodePolicy,
  RegionKind,
  TypeDescriptor
} from '../src/templates/graphTypes.js'
import { fragmentPort, rawCodePort } from '../src/templates/compatibility.js'
import { defineTemplate } from '../src/templates/definition.js'


export type AnyGraphTemplateDefinitionInput = GraphTemplateDefinitionInput<
  string,
  Record<string, InputPort>
>



function out(kind: RegionKind, extra: Omit<OutputPort, 'kind'> = {}): OutputPort {
  return { kind, ...extra }
}

export const unknownType: TypeDescriptor = {}
export const booleanType: TypeDescriptor = { ts: 'boolean', schema: { type: 'boolean' } }
export const stringType: TypeDescriptor = { ts: 'string', schema: { type: 'string' } }
export const stringArrayType: TypeDescriptor = {
  ts: 'string[]',
  schema: { type: 'array', items: { type: 'string' } }
}
export const stringOrUrlType: TypeDescriptor = { ts: 'string | URL' }
export const requestType: TypeDescriptor = { ts: 'Request | NextRequest' }
export const nextResponseType: TypeDescriptor = { ts: 'NextResponse' }
export const responseInitType: TypeDescriptor = { ts: 'ResponseInit' }
export const cookieOptionsType: TypeDescriptor = { ts: 'Partial<ResponseCookie>' }
export const fetchInitType: TypeDescriptor = { ts: 'RequestInit & { next?: { tags?: string[]; revalidate?: number | false } }' }
export const revalidateValueType: TypeDescriptor = { ts: 'number | false | undefined' }

export const safeRawExpressionPolicy: RawCodePolicy = {
  description: 'Single-line expression. Dangerous globals and module-loading constructs are rejected before generation.',
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

export const statementFragment = (description?: string, type?: TypeDescriptor): FragmentInputPort =>
  fragmentPort({
    regionKind: 'statement',
    accepts: {
      outputKind: 'statement',
      ...(type ? { type } : {})
    },
    ...(description ? { description } : {})
  })

export const expressionSuffixFragment = (description?: string, type?: TypeDescriptor): FragmentInputPort =>
  fragmentPort({
    regionKind: 'expressionSuffix',
    accepts: {
      outputKind: 'expressionSuffix',
      ...(type ? { type } : {})
    },
    ...(description ? { description } : {})
  })

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

export const booleanExpressionFragment = (description?: string): FragmentInputPort =>
  expressionFragment(description, booleanType)

export const rawExpression = (description?: string, type?: TypeDescriptor): RawCodeInputPort =>
  rawCodePort({
    regionKind: 'expression',
    policy: safeRawExpressionPolicy,
    ...(type ? { type } : {}),
    ...(description ? { description } : {})
  })

// -----------------------------------------------------------------------------
// Composed Next.js App Router / Server Runtime templates.
//
// These are intentionally higher-level than one-call wrappers. They combine
// multiple Next.js operations into one reusable graph operator for agentic
// synthesis planning.
//
// Expected generated-code bindings by template:
// - NextResponse from 'next/server'
// - userAgent from 'next/server'
// - cookies and draftMode from 'next/headers'
// - revalidatePath, revalidateTag, updateTag, refresh from 'next/cache'
//
// Context-sensitive constraints:
// - templates using await must be emitted inside an async server context.
// - refresh() and updateTag() are Server Action oriented.
// - draftMode().enable()/disable() are Route Handler oriented.
// - revalidatePath()/revalidateTag() must run in server-side invalidation contexts.
// -----------------------------------------------------------------------------

export const NextJsonSetCookieRevalidateTemplate = defineTemplate({
  modelId: 'NextJsonSetCookieRevalidate',
  version: '1.0.0',
  description: 'Route Handler statement block: create a JSON response, set a response cookie, revalidate a path, and return the response.',
  inputs: {
    body: expressionFragment('JSON-serializable response body expression.'),
    init: rawExpression('NextResponse.json init expression, commonly `{ status: 200 }` or `{}`.', responseInitType),
    cookieName: stringExpressionFragment('Response cookie name expression.'),
    cookieValue: stringExpressionFragment('Response cookie value expression.'),
    cookieOptions: rawExpression('Response cookie options expression, commonly `{ httpOnly: true, path: "/" }` or `{}`.', cookieOptionsType),
    path: stringExpressionFragment('Path or route pattern to revalidate.'),
    pathType: rawExpression('Optional path type expression: `"page"`, `"layout"`, or `undefined`.')
  },
  output: out('statement'),
  source: `const __sr_response = NextResponse.json(${"/** @TYPE expression id=body **/undefined/** @END **/"}, ${"/** @TYPE expression id=init **/undefined/** @END **/"});
__sr_response.cookies.set(${"/** @TYPE expression id=cookieName **/undefined/** @END **/"}, ${"/** @TYPE expression id=cookieValue **/undefined/** @END **/"}, ${"/** @TYPE expression id=cookieOptions **/undefined/** @END **/"});
revalidatePath(${"/** @TYPE expression id=path **/undefined/** @END **/"}, ${"/** @TYPE expression id=pathType **/undefined/** @END **/"});
return __sr_response;`
})

export const NextAuthGuardJsonOrRedirectTemplate = defineTemplate({
  modelId: 'NextAuthGuardJsonOrRedirect',
  version: '1.0.0',
  description: 'Expression: return a redirect response when an auth/session expression is missing, otherwise return a JSON response.',
  inputs: {
    auth: expressionFragment('Auth/session/user expression. Nullish values trigger redirect.'),
    request: expressionFragment('Request or NextRequest expression used to resolve relative redirect URLs.', requestType),
    loginPath: expressionFragment('Login destination expression, usually a string path such as `"/login"`.', stringOrUrlType),
    redirectInit: rawExpression('Redirect init expression, commonly `307`, `{ status: 307 }`, or `undefined`.'),
    body: expressionFragment('Authenticated JSON response body expression.'),
    init: rawExpression('Authenticated JSON response init expression, commonly `{ status: 200 }` or `{}`.', responseInitType)
  },
  output: out('expression', { type: nextResponseType }),
  source: `(${"/** @TYPE expression id=auth **/undefined/** @END **/"} == null ? NextResponse.redirect(new URL(${"/** @TYPE expression id=loginPath **/undefined/** @END **/"}, ${"/** @TYPE expression id=request **/undefined/** @END **/"}.url), ${"/** @TYPE expression id=redirectInit **/undefined/** @END **/"}) : NextResponse.json(${"/** @TYPE expression id=body **/undefined/** @END **/"}, ${"/** @TYPE expression id=init **/undefined/** @END **/"}))`
})

export const NextDraftModeRedirectRevalidateTemplate = defineTemplate({
  modelId: 'NextDraftModeRedirectRevalidate',
  version: '1.0.0',
  description: 'Route Handler statement block: enable or disable Draft Mode, revalidate a path, and redirect the user.',
  inputs: {
    enabled: booleanExpressionFragment('Boolean expression. True enables Draft Mode; false disables it.'),
    path: stringExpressionFragment('Path or route pattern to revalidate after toggling Draft Mode.'),
    pathType: rawExpression('Optional path type expression: `"page"`, `"layout"`, or `undefined`.'),
    redirectUrl: expressionFragment('Redirect destination expression, usually a string or URL.', stringOrUrlType),
    redirectInit: rawExpression('Redirect init expression, commonly `307`, `{ status: 307 }`, or `undefined`.')
  },
  output: out('statement'),
  source: `const __sr_draft = await draftMode();
if (${"/** @TYPE expression id=enabled **/undefined/** @END **/"}) {
  __sr_draft.enable();
} else {
  __sr_draft.disable();
}
revalidatePath(${"/** @TYPE expression id=path **/undefined/** @END **/"}, ${"/** @TYPE expression id=pathType **/undefined/** @END **/"});
return NextResponse.redirect(${"/** @TYPE expression id=redirectUrl **/undefined/** @END **/"}, ${"/** @TYPE expression id=redirectInit **/undefined/** @END **/"});`
})

export const NextServerActionMutationRefreshTemplate = defineTemplate({
  modelId: 'NextServerActionMutationRefresh',
  version: '1.0.0',
  description: 'Server Action statement block: set a cookie, update/revalidate cache tags and paths, then refresh the client router.',
  inputs: {
    cookieName: stringExpressionFragment('Cookie name expression.'),
    cookieValue: stringExpressionFragment('Cookie value expression.'),
    cookieOptions: rawExpression('Cookie options expression, commonly `{ httpOnly: true, path: "/" }` or `{}`.', cookieOptionsType),
    updateTagName: stringExpressionFragment('Cache tag expression to expire immediately with updateTag().'),
    revalidateTagName: stringExpressionFragment('Cache tag expression to revalidate with stale-while-revalidate semantics.'),
    revalidateProfile: rawExpression('revalidateTag profile expression, preferably `"max"`, or an object such as `{ expire: 0 }`.'),
    path: stringExpressionFragment('Path or route pattern to revalidate.'),
    pathType: rawExpression('Optional path type expression: `"page"`, `"layout"`, or `undefined`.')
  },
  output: out('statement'),
  source: `(await cookies()).set(${"/** @TYPE expression id=cookieName **/undefined/** @END **/"}, ${"/** @TYPE expression id=cookieValue **/undefined/** @END **/"}, ${"/** @TYPE expression id=cookieOptions **/undefined/** @END **/"});
updateTag(${"/** @TYPE expression id=updateTagName **/undefined/** @END **/"});
revalidateTag(${"/** @TYPE expression id=revalidateTagName **/undefined/** @END **/"}, ${"/** @TYPE expression id=revalidateProfile **/undefined/** @END **/"});
revalidatePath(${"/** @TYPE expression id=path **/undefined/** @END **/"}, ${"/** @TYPE expression id=pathType **/undefined/** @END **/"});
refresh();`
})

export const NextCachedJsonFetchWithTagsTemplate = defineTemplate({
  modelId: 'NextCachedJsonFetchWithTags',
  version: '1.0.0',
  description: 'Async expression: perform a Next.js server fetch with cache tags/revalidate metadata, throw on non-OK response, and return parsed JSON.',
  inputs: {
    url: expressionFragment('Fetch URL expression.', stringOrUrlType),
    init: rawExpression('Base fetch init expression. It is evaluated once before merging `next` cache metadata.', fetchInitType),
    tags: expressionFragment('Array of Next.js cache tags.', stringArrayType),
    revalidate: expressionFragment('Revalidate interval expression, usually a number, false, or undefined.', revalidateValueType)
  },
  output: out('expression', { type: unknownType }),
  source: `(await (async () => {
  const __sr_init = ${"/** @TYPE expression id=init **/undefined/** @END **/"};
  const __sr_response = await fetch(${"/** @TYPE expression id=url **/undefined/** @END **/"}, {
    ...__sr_init,
    next: {
      ...(__sr_init.next ?? {}),
      tags: ${"/** @TYPE expression id=tags **/undefined/** @END **/"},
      revalidate: ${"/** @TYPE expression id=revalidate **/undefined/** @END **/"}
    }
  });
  if (!__sr_response.ok) {
    throw new Error(\`Next.js fetch failed: \${__sr_response.status} \${__sr_response.statusText}\`);
  }
  return __sr_response.json();
})())`
})

export const nextjsComposedGraphTemplateInputs = [
  NextJsonSetCookieRevalidateTemplate,
  NextAuthGuardJsonOrRedirectTemplate,
  NextDraftModeRedirectRevalidateTemplate,
  NextServerActionMutationRefreshTemplate,
  NextCachedJsonFetchWithTagsTemplate
] as const satisfies readonly AnyGraphTemplateDefinitionInput[]
