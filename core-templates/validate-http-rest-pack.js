const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const files = [
  '/mnt/data/effect-v4-http-foundational-templates.ts',
  '/mnt/data/effect-v4-http-api-foundational-templates.ts',
  '/mnt/data/effect-v4-http-rest-service-boundary-templates.ts'
]

function prop(obj, name) {
  return obj.properties.find(p => ts.isPropertyAssignment(p) && ((ts.isIdentifier(p.name) && p.name.text === name) || (ts.isStringLiteral(p.name) && p.name.text === name)))
}
function litText(node) { return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined }
function modelIdOf(obj) { const p = prop(obj, 'modelId'); return p ? litText(p.initializer) : undefined }
function inputNamesOf(obj) {
  const p = prop(obj, 'inputs')
  if (!p || !ts.isObjectLiteralExpression(p.initializer)) return []
  return p.initializer.properties.map(x => {
    if (ts.isPropertyAssignment(x) || ts.isMethodDeclaration(x) || ts.isShorthandPropertyAssignment(x)) {
      if (ts.isIdentifier(x.name)) return x.name.text
      if (ts.isStringLiteral(x.name)) return x.name.text
    }
  }).filter(Boolean)
}
function collectMarkers(node, out = []) {
  function walk(n) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'marker') {
      out.push({ id: n.arguments[1] && litText(n.arguments[1]), fallback: n.arguments[2] && litText(n.arguments[2]) })
    }
    ts.forEachChild(n, walk)
  }
  walk(node)
  return out
}
function buildFallbackSource(init) {
  if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return init.text
  if (!ts.isTemplateExpression(init)) return undefined
  let out = init.head.text
  for (const span of init.templateSpans) {
    const expr = span.expression
    if (!(ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === 'marker')) return undefined
    const fallback = expr.arguments[2] && litText(expr.arguments[2])
    if (fallback === undefined) return undefined
    out += fallback + span.literal.text
  }
  return out
}
function outputKind(obj) {
  const p = prop(obj, 'output')
  if (!p) return 'unknown'
  const init = p.initializer
  if (ts.isCallExpression(init) && ts.isIdentifier(init.expression)) {
    if (init.expression.text === 'expressionOutput') return 'expression'
    if (init.expression.text === 'statementOutput') return 'statement'
  }
  if (ts.isObjectLiteralExpression(init)) {
    const k = prop(init, 'kind')
    return k && litText(k.initializer) || 'unknown'
  }
  return 'unknown'
}
function parseFallback(src, kind, name) {
  const wrapped = kind === 'expression' ? `const __value = (${src});` : src
  return ts.createSourceFile(`${name}.ts`, wrapped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS).parseDiagnostics
}

const explicitIds = []
const failures = []
let defineTemplateDeclarations = 0
let dynamicFactories = 0
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  if (sf.parseDiagnostics.length) failures.push(`${file}: module parse errors: ${sf.parseDiagnostics.map(d => d.messageText).join('; ')}`)
  function walk(n) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'defineTemplate' && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
      defineTemplateDeclarations++
      const obj = n.arguments[0]
      const id = modelIdOf(obj)
      if (id) explicitIds.push(id); else dynamicFactories++
      const label = id || `<factory@${path.basename(file)}:${sf.getLineAndCharacterOfPosition(n.pos).line + 1}>`
      const inputs = inputNamesOf(obj)
      const sourceProp = prop(obj, 'source')
      if (!sourceProp) failures.push(`${label}: missing source`)
      else {
        const sourceText = sourceProp.initializer.getText(sf)
        if (/\{\{[^}]+\}\}/.test(sourceText)) failures.push(`${label}: generic placeholder leaked into source initializer`)
        const markers = collectMarkers(sourceProp.initializer)
        const counts = new Map()
        for (const m of markers) counts.set(m.id, (counts.get(m.id) || 0) + 1)
        for (const input of inputs) {
          if (!counts.has(input)) failures.push(`${label}: input ${input} has no marker`)
          else if (counts.get(input) !== 1) failures.push(`${label}: input ${input} has ${counts.get(input)} markers`)
        }
        for (const [mid, count] of counts) {
          if (!inputs.includes(mid)) failures.push(`${label}: marker ${mid} has no declared input`)
          if (count !== 1) failures.push(`${label}: marker ${mid} repeated ${count} times`)
        }
        if (id) {
          const fallback = buildFallbackSource(sourceProp.initializer)
          if (fallback !== undefined) {
            const diags = parseFallback(fallback, outputKind(obj), label)
            if (diags.length) failures.push(`${label}: fallback parse errors: ${diags.map(d => d.messageText).join('; ')}\nSOURCE:\n${fallback}`)
          } else failures.push(`${label}: could not evaluate fallback source`)
        }
      }
    }
    ts.forEachChild(n, walk)
  }
  walk(sf)
}

const texts = files.map(f => fs.readFileSync(f, 'utf8')).join('\n')
const factoryIds = [
  ...[...texts.matchAll(/requestCtor\('([^']+)'/g)].map(m => m[1]),
  ...[...texts.matchAll(/clientAccessor\('([^']+)'/g)].map(m => m[1]),
  ...[...texts.matchAll(/endpointCtor\('([^']+)'/g)].map(m => m[1])
]
const allIds = [...explicitIds, ...factoryIds]
const dup = allIds.filter((id, i) => allIds.indexOf(id) !== i)
if (dup.length) failures.push(`duplicate new modelIds: ${[...new Set(dup)].join(', ')}`)

// Concrete generated-source smoke tests for factory-created templates.
for (const [name, src] of [
  ['HttpClientRequestGet','HttpClientRequest.get("https://example.com", {})'],
  ['HttpClientRequestPost','HttpClientRequest.post("https://example.com", {})'],
  ['HttpClientRequestPut','HttpClientRequest.put("https://example.com", {})'],
  ['HttpClientRequestPatch','HttpClientRequest.patch("https://example.com", {})'],
  ['HttpClientRequestDelete','HttpClientRequest.delete("https://example.com", {})'],
  ['HttpClientRequestHead','HttpClientRequest.head("https://example.com", {})'],
  ['HttpClientRequestOptions','HttpClientRequest.options("https://example.com", {})'],
  ['HttpClientGet','HttpClient.get("https://example.com", {})'],
  ['HttpClientPost','HttpClient.post("https://example.com", {})'],
  ['HttpClientPut','HttpClient.put("https://example.com", {})'],
  ['HttpClientPatch','HttpClient.patch("https://example.com", {})'],
  ['HttpClientDelete','HttpClient.del("https://example.com", {})'],
  ['HttpApiEndpointGet','HttpApiEndpoint.get("endpoint", "/resource", {})'],
  ['HttpApiEndpointPost','HttpApiEndpoint.post("endpoint", "/resource", {})'],
  ['HttpApiEndpointPut','HttpApiEndpoint.put("endpoint", "/resource", {})'],
  ['HttpApiEndpointPatch','HttpApiEndpoint.patch("endpoint", "/resource", {})'],
  ['HttpApiEndpointDelete','HttpApiEndpoint.delete("endpoint", "/resource", {})']
]) {
  const diags = parseFallback(src, 'expression', name)
  if (diags.length) failures.push(`${name}: factory fallback parse errors: ${diags.map(d => d.messageText).join('; ')}`)
}

const newFiles = new Set([
  'effect-http-rest-template-helpers.ts',
  'effect-v4-http-foundational-templates.ts',
  'effect-v4-http-api-foundational-templates.ts',
  'effect-v4-http-rest-service-boundary-templates.ts',
  'effect-v4-http-rest-service-boundary-template-catalog.ts',
  'effect-v4-expanded-with-http-rest-service-boundary-template-catalog.ts'
])
const previousIds = []
for (const entry of fs.readdirSync('/mnt/data')) {
  if (!entry.endsWith('.ts') || newFiles.has(entry)) continue
  const p = `/mnt/data/${entry}`
  const text = fs.readFileSync(p, 'utf8')
  for (const m of text.matchAll(/modelId:\s*['"]([^'"]+)['"]/g)) previousIds.push(m[1])
  for (const m of text.matchAll(/(?:Template|template|Constructor|constructor)\(\s*['"]([^'"]+)['"]/g)) previousIds.push(m[1])
}
const collisions = allIds.filter(id => previousIds.includes(id))
if (collisions.length) failures.push(`collisions with prior catalog files: ${[...new Set(collisions)].join(', ')}`)

console.log(JSON.stringify({
  defineTemplateDeclarations,
  dynamicFactories,
  concreteTemplateCount: allIds.length,
  explicitModelIds: explicitIds.length,
  factoryModelIds: factoryIds.length,
  modelIds: allIds,
  failures
}, null, 2))
process.exit(failures.length ? 1 : 0)
