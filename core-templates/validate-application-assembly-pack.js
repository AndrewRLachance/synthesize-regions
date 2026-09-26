const ts = require('typescript')
const fs = require('fs')

const files = process.argv.slice(2)
let failed = false

function parseFile(file) {
  const text = fs.readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const syntax = sf.parseDiagnostics || []
  if (syntax.length) {
    failed = true
    console.error(`SYNTAX ${file}`)
    for (const d of syntax) console.error(ts.flattenDiagnosticMessageText(d.messageText, '\n'))
  } else {
    console.log(`OK syntax ${file}`)
  }
  const transpile = ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    fileName: file
  })
  const tdiags = (transpile.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)
  if (tdiags.length) {
    failed = true
    console.error(`TRANSPILE ${file}`)
    for (const d of tdiags) console.error(ts.flattenDiagnosticMessageText(d.messageText, '\n'))
  }
  return { sf, text }
}

function propName(p) {
  const n = p.name
  if (!n) return undefined
  if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n)) return n.text
  return undefined
}

function findDefineTemplates(sf) {
  const calls = []
  function visit(n) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'defineTemplate') {
      calls.push(n)
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return calls
}

function getObject(call) {
  const a = call.arguments[0]
  return a && ts.isObjectLiteralExpression(a) ? a : undefined
}

function getProp(obj, name) {
  return obj.properties.find(p => ts.isPropertyAssignment(p) && propName(p) === name)
}

function inputKeys(obj) {
  const p = getProp(obj, 'inputs')
  if (!p || !ts.isObjectLiteralExpression(p.initializer)) return []
  return p.initializer.properties.map(propName).filter(Boolean)
}

function markerIds(node) {
  const out = []
  function visit(n) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'marker') {
      const id = n.arguments[1]
      if (id && ts.isStringLiteralLike(id)) out.push(id.text)
      else out.push('<dynamic>')
    }
    ts.forEachChild(n, visit)
  }
  if (node) visit(node)
  return out
}

function stringValue(node) {
  if (ts.isStringLiteralLike(node)) return node.text
  return undefined
}

function reconstructTemplate(node, substitutions = {}) {
  if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isStringLiteral(node)) return node.text
  if (!ts.isTemplateExpression(node)) return undefined
  let s = node.head.text
  for (const span of node.templateSpans) {
    const e = span.expression
    let v
    if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'marker') {
      const fallback = e.arguments[2]
      v = fallback ? stringValue(fallback) : undefined
    } else if (ts.isIdentifier(e) && e.text in substitutions) {
      v = substitutions[e.text]
    }
    if (v === undefined) return undefined
    s += v + span.literal.text
  }
  return s
}

function parseGenerated(kind, source, label) {
  let wrapped
  if (kind === 'sourceFile') wrapped = source
  else if (kind === 'statement') wrapped = source
  else wrapped = `const __generated = (${source});`
  const sf = ts.createSourceFile(`${label}.ts`, wrapped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const diags = sf.parseDiagnostics || []
  if (diags.length) {
    failed = true
    console.error(`GENERATED SYNTAX ${label}`)
    console.error(source)
    for (const d of diags) console.error(ts.flattenDiagnosticMessageText(d.messageText, '\n'))
  }
}

function outputKind(obj) {
  const p = getProp(obj, 'output')
  if (!p) return 'expression'
  if (ts.isCallExpression(p.initializer) && ts.isIdentifier(p.initializer.expression)) {
    if (p.initializer.expression.text === 'statementOutput') return 'statement'
    if (p.initializer.expression.text === 'expressionOutput') return 'expression'
  }
  if (ts.isObjectLiteralExpression(p.initializer)) {
    const k = getProp(p.initializer, 'kind')
    if (k) return stringValue(k.initializer) || 'expression'
  }
  return 'expression'
}

for (const file of files) {
  const { sf, text } = parseFile(file)
  const calls = findDefineTemplates(sf)
  for (const [i, call] of calls.entries()) {
    const obj = getObject(call)
    if (!obj) continue
    const modelProp = getProp(obj, 'modelId')
    const model = modelProp ? stringValue(modelProp.initializer) || `<factory-${i}>` : `<unknown-${i}>`
    const inputs = inputKeys(obj)
    const sourceProp = getProp(obj, 'source')
    const markers = sourceProp ? markerIds(sourceProp.initializer) : []
    const counts = new Map()
    for (const m of markers) counts.set(m, (counts.get(m) || 0) + 1)
    const missing = inputs.filter(x => !counts.has(x))
    const repeated = inputs.filter(x => (counts.get(x) || 0) !== 1)
    const extras = [...counts.keys()].filter(x => x !== '<dynamic>' && !inputs.includes(x))
    if (missing.length || repeated.length || extras.length) {
      failed = true
      console.error(`MARKERS ${file} ${model}`, { inputs, markers, missing, repeated, extras })
    }
    if (sourceProp) {
      const srcText = sourceProp.initializer.getText(sf)
      if (srcText.includes('{{')) {
        failed = true
        console.error(`PLACEHOLDER LEAK ${file} ${model}`)
      }
      const src = reconstructTemplate(sourceProp.initializer)
      if (src !== undefined) parseGenerated(outputKind(obj), src, `${file}:${model}`)
    }
  }
  console.log(`defineTemplate calls: ${calls.length}`)
}

// Validate concrete factory-generated application-main fallbacks.
for (const [model, runtime] of [
  ['NodeApplicationAssemblyMain', 'NodeRuntime'],
  ['BunApplicationAssemblyMain', 'BunRuntime'],
  ['BrowserApplicationAssemblyMain', 'BrowserRuntime']
]) {
  parseGenerated('statement', `${runtime}.runMain(Layer.launch(ApplicationLayer))`, model)
}

if (failed) process.exit(1)
