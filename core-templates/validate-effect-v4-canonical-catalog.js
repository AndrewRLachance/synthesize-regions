/**
 * Phase 9 — structural validation of the canonical Effect v4 catalog.
 *
 * Checks every canonical template for:
 *   - host module parse validity
 *   - fallback generated-source parse validity
 *   - exactly one marker per declared input
 *   - no undeclared markers
 *   - no repeated markers
 *   - no unresolved `{{...}}` placeholders after representative substitution
 *   - globally unique canonical modelIds
 *   - deterministic catalog ordering
 *
 * Writes `effect-v4-canonical-catalog-validation.json` and exits non-zero on
 * any failure.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The authoritative template list comes from the catalog itself, so the
// modelId count and uniqueness check reflect what the catalog actually exports
// rather than what a syntactic walk of the pack sources happens to find.
const { effectV4CanonicalGraphTemplateInputs } = await import(
	pathToFileURL(path.join(__dirname, 'effect-v4-canonical-template-catalog.ts')).href
)
const catalogIds = effectV4CanonicalGraphTemplateInputs.map((template) => template.modelId)

const ROOT = path.resolve(__dirname, '..')
const CATALOG = path.join(__dirname, 'effect-v4-canonical-template-catalog.ts')
const OUT = path.join(__dirname, 'effect-v4-canonical-catalog-validation.json')

const failures = []
const checks = {}

function prop(obj, name) {
	return obj.properties.find(
		(p) =>
			(ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
			((ts.isIdentifier(p.name) && p.name.text === name) || (ts.isStringLiteral(p.name) && p.name.text === name))
	)
}
function litText(n) {
	if (!n) return undefined
	return ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text : undefined
}
function modelIdOf(obj) {
	const p = prop(obj, 'modelId')
	return p ? litText(p.initializer) : undefined
}
function inputNamesOf(obj) {
	const p = prop(obj, 'inputs')
	if (!p || !ts.isObjectLiteralExpression(p.initializer)) return []
	return p.initializer.properties
		.map((x) => {
			if (ts.isPropertyAssignment(x) || ts.isMethodDeclaration(x) || ts.isShorthandPropertyAssignment(x)) {
				if (ts.isIdentifier(x.name)) return x.name.text
				if (ts.isStringLiteral(x.name)) return x.name.text
			}
			return undefined
		})
		.filter(Boolean)
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

/**
 * Markers in their materialized form — an `@TYPE` open tag, the fallback, then
 * an `@END` close tag, all in comments — never appear in the AST. They are
 * collected from the source text instead.
 */
function collectTextMarkers(sourceText) {
	const out = []
	for (const m of sourceText.matchAll(/\/\*\* @TYPE \w+ id=(\S+) \*\*\//g)) {
		out.push({ id: m[1], fallback: undefined })
	}
	return out
}
function buildFallbackSource(init) {
	if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return init.text
	if (!ts.isTemplateExpression(init)) return undefined
	let out = init.head.text
	for (const span of init.templateSpans) {
		const e = span.expression
		if (!(ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'marker')) return undefined
		const f = e.arguments[2] && litText(e.arguments[2])
		if (f === undefined) return undefined
		out += f + span.literal.text
	}
	return out
}
function outputKind(obj) {
	const p = prop(obj, 'output')
	if (!p || !p.initializer) return 'unknown'
	const i = p.initializer
	if (ts.isCallExpression(i) && ts.isIdentifier(i.expression)) {
		if (i.expression.text === 'expressionOutput') return 'expression'
		if (i.expression.text === 'statementOutput') return 'statement'
	}
	if (ts.isObjectLiteralExpression(i)) {
		const k = prop(i, 'kind')
		return (k && litText(k.initializer)) || 'unknown'
	}
	return 'unknown'
}
function parseFallback(src, kind, name) {
	const wrapped = kind === 'expression' ? `const __value = (${src});` : src
	return ts.createSourceFile(`${name}.ts`, wrapped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS).parseDiagnostics
}

// Resolve the catalog's spread list to the pack modules that define them.
const catalogSource = fs.readFileSync(CATALOG, 'utf8')
const catalogSf = ts.createSourceFile(CATALOG, catalogSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
checks.hostParseDiagnostics = catalogSf.parseDiagnostics.length
if (catalogSf.parseDiagnostics.length) {
	failures.push(`catalog module parse errors: ${catalogSf.parseDiagnostics.map((d) => d.messageText).join('; ')}`)
}

/**
 * Locate the pack-array references in the canonical catalog.
 *
 * The catalog has been generated with two shapes over time, so both are
 * accepted:
 *   - `const allEffectV4Templates = [ ...array, ... ]` (spread elements)
 *   - `const allEffectV4Templates = ( [] as T[] ).concat( array, ... )`
 */
function findPackArrays(sf) {
	for (const statement of sf.statements) {
		if (!ts.isVariableStatement(statement)) continue
		for (const decl of statement.declarationList.declarations) {
			if (!ts.isIdentifier(decl.name) || decl.name.text !== 'allEffectV4Templates') continue
			const init = decl.initializer
			if (!init) continue
			if (ts.isArrayLiteralExpression(init)) {
				return init.elements
					.filter((element) => ts.isSpreadElement(element))
					.map((element) => element.expression)
					.filter((expression) => ts.isIdentifier(expression))
					.map((expression) => expression.text)
			}
			// `( [] ).concat( a, b, c )`
			if (ts.isCallExpression(init) && init.arguments.length > 0) {
				return init.arguments
					.filter((argument) => ts.isIdentifier(argument))
					.map((argument) => argument.text)
			}
		}
	}
	return undefined
}

/** @type {Array<{ array: string; module: string }>} */
const spreads = []
const packArrayNames = findPackArrays(catalogSf)
if (!packArrayNames) {
	failures.push('could not locate the canonical catalog pack array list')
} else {
	for (const name of packArrayNames) spreads.push({ array: name, module: undefined })
}

// Map each spread array to the module that exports it.
const arrayModules = new Map()
for (const fileName of fs.readdirSync(__dirname)) {
	if (!fileName.endsWith('.ts') || fileName === 'effect-v4-canonical-template-catalog.ts') continue
	const source = fs.readFileSync(path.join(__dirname, fileName), 'utf8')
	for (const m of source.matchAll(/export const ((?:effectV4|effect|basePattern|core|esToolkit)\w*(?:TemplateInputs|GraphTemplateInputs))\s*[:=]/g)) {
		if (!arrayModules.has(m[1])) arrayModules.set(m[1], fileName)
	}
}
for (const spread of spreads) {
	spread.module = arrayModules.get(spread.array)
	if (!spread.module) failures.push(`spread array ${spread.array} has no defining module`)
}

// Validate every template in every referenced pack.
const seenIds = new Set()
const duplicateIds = []
let defineTemplateDeclarations = 0
let dynamicFactories = 0
let fallbackParseErrors = 0
let markerIssues = 0
let placeholderIssues = 0
const checked = new Set()

for (const { array, module } of spreads) {
	if (!module || checked.has(module)) continue
	checked.add(module)
	const file = path.join(__dirname, module)
	const text = fs.readFileSync(file, 'utf8')
	const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	if (sf.parseDiagnostics.length) {
		failures.push(`${module}: module parse errors: ${sf.parseDiagnostics.map((d) => d.messageText).join('; ')}`)
		continue
	}
	function walk(n) {
		if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'defineTemplate' && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
			defineTemplateDeclarations++
			const obj = n.arguments[0]
			const id = modelIdOf(obj)
			if (id) {
				if (seenIds.has(id)) duplicateIds.push(id)
				seenIds.add(id)
			} else {
				dynamicFactories++
			}
			const label = id || `<factory@${module}:${sf.getLineAndCharacterOfPosition(n.pos).line + 1}>`
			const inputs = inputNamesOf(obj)
			const sourceProp = prop(obj, 'source')
			if (!sourceProp) {
				failures.push(`${label}: missing source`)
				return
			}
			// A shorthand `source` property is a factory parameter reference and
			// cannot be evaluated statically.
			if (!sourceProp.initializer) {
				dynamicFactories++
				return
			}
			const sourceText = sourceProp.initializer.getText(sf)
			if (/\{\{[^}]+\}\}/.test(sourceText)) {
				placeholderIssues++
				failures.push(`${label}: generic placeholder leaked into source initializer`)
			}
			const fallback = buildFallbackSource(sourceProp.initializer)
			if (fallback === undefined) {
				// Factory-generated source: the marker is injected by the helper,
				// so marker ownership cannot be checked syntactically here.
				dynamicFactories++
				return
			}
			const markers = [...collectMarkers(sourceProp.initializer), ...collectTextMarkers(sourceText)]
			const counts = new Map()
			for (const m of markers) counts.set(m.id, (counts.get(m.id) || 0) + 1)
			for (const input of inputs) {
				if (!counts.has(input)) {
					markerIssues++
					failures.push(`${label}: input ${input} has no marker`)
				} else if (counts.get(input) !== 1) {
					markerIssues++
					failures.push(`${label}: input ${input} has ${counts.get(input)} markers`)
				}
			}
			for (const [mid, count] of counts) {
				if (!inputs.includes(mid)) {
					markerIssues++
					failures.push(`${label}: marker ${mid} has no declared input`)
				}
				if (count !== 1) {
					markerIssues++
					failures.push(`${label}: marker ${mid} repeated ${count} times`)
				}
			}
			if (id) {
				const diags = parseFallback(fallback, outputKind(obj), label)
				if (diags.length) {
					fallbackParseErrors++
					failures.push(`${label}: fallback parse errors: ${diags.map((d) => d.messageText).join('; ')}`)
				}
			}
		}
		ts.forEachChild(n, walk)
	}
	walk(sf)
}

checks.spreadArrays = spreads.length
checks.referencedModules = checked.size
checks.defineTemplateDeclarations = defineTemplateDeclarations
checks.dynamicFactories = dynamicFactories
checks.distinctModelIds = new Set(catalogIds).size
checks.totalTemplates = catalogIds.length
checks.duplicateModelIds = catalogIds.length - new Set(catalogIds).size
checks.fallbackParseErrors = fallbackParseErrors
checks.markerIssues = markerIssues
checks.placeholderIssues = placeholderIssues

if (checks.duplicateModelIds > 0) {
	failures.push(`duplicate modelIds in catalog: ${checks.duplicateModelIds}`)
}

// Deterministic ordering: the catalog's spread list must be sorted by module.
const moduleOrder = spreads.map((s) => s.module).filter(Boolean)
const sortedOrder = [...moduleOrder].sort()
checks.deterministicOrder = JSON.stringify(moduleOrder) === JSON.stringify(sortedOrder)
if (!checks.deterministicOrder) failures.push('catalog spread list is not in deterministic (sorted) order')

// --- Materialized checks (runtime view of the catalog). ----------------------
// These complement the source-level checks above: they validate the
// materialized templates exactly as the synthesis engine consumes them —
// marker spans with fallbacks, whole-source parse per output kind, type
// descriptors after fixture substitution, and replacement lineage.
const { substituteTypePlaceholders } = await import(
	pathToFileURL(path.join(__dirname, 'effect-v4-fixture-substitutions.mts')).href
)

const parkPlaceholders = (text) => text.replace(/\{\{[^{}]*\}\}/g, '__p')
const MARKER_SPAN = /\/\*\* @TYPE ([a-zA-Z]+) id=([^\s]+) \*\*\/([\s\S]*?)\/\*\* @END \*\*\//g
const TYPE_MARKER = /\/\*\* @TYPE [a-zA-Z]+ id=[^\s]+ \*\*\//g
const END_MARKER = /\/\*\* @END \*\*\//g

const parseDiagnosticFree = (fileName, text) => {
	const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	if (!sf.parseDiagnostics.length) return undefined
	return ts.flattenDiagnosticMessageText(sf.parseDiagnostics[0].messageText, ' ')
}

const wrapForRegionKind = (kind, body) => {
	switch (kind) {
		case 'expression':
		case 'array':
		case 'object':
			return `const __v = (${body});`
		case 'expressionSuffix':
			return `const __v = __base${body};`
		case 'statement':
			return body
		case 'identifier':
			return `const ${body} = 0;`
		case 'string':
		case 'number':
		case 'boolean':
		case 'null':
			return `const __v = ${body};`
		case 'objectProperty':
			return `const __v = { ${body} };`
		case 'type':
			return `type __T = ${body};`
		case 'sourceFile':
			return body
		default:
			return undefined
	}
}

const collectPortDescriptors = (port, into) => {
	if (!port || typeof port !== 'object') return
	if (port.type) into.push(port.type)
	if (port.accepts?.type) into.push(port.accepts.type)
	if (Array.isArray(port.options)) for (const option of port.options) collectPortDescriptors(option, into)
}

let materializedMarkers = 0
let materializedMarkerIssues = 0
let materializedFallbacksParsed = 0
let materializedFallbackParseErrors = 0
let materializedSourcesParsed = 0
let materializedSourceParseErrors = 0
let materializedDescriptorsChecked = 0
let materializedDescriptorErrors = 0
let materializedUnresolvedPlaceholders = 0

for (const template of effectV4CanonicalGraphTemplateInputs) {
	const label = template.modelId
	const openCount = (template.source.match(TYPE_MARKER) ?? []).length
	const endCount = (template.source.match(END_MARKER) ?? []).length
	if (openCount !== endCount) {
		materializedMarkerIssues++
		failures.push(`${label}: unbalanced markers: ${openCount} @TYPE vs ${endCount} @END`)
		continue
	}
	const spans = [...template.source.matchAll(MARKER_SPAN)].map((m) => ({ kind: m[1], id: m[2], fallback: m[3] }))
	materializedMarkers += spans.length
	const declared = new Set(Object.keys(template.inputs ?? {}))
	const spanIds = new Set()
	for (const span of spans) {
		if (spanIds.has(span.id)) {
			materializedMarkerIssues++
			failures.push(`${label}: marker id ${span.id} appears more than once`)
		}
		spanIds.add(span.id)
		if (!declared.has(span.id)) {
			materializedMarkerIssues++
			failures.push(`${label}: marker id ${span.id} has no declared input`)
		}
	}
	for (const inputId of declared) {
		if (!spanIds.has(inputId)) {
			materializedMarkerIssues++
			failures.push(`${label}: declared input ${inputId} has no physical marker`)
		}
	}
	for (const span of spans) {
		const wrapped = wrapForRegionKind(span.kind, parkPlaceholders(span.fallback))
		if (wrapped === undefined) {
			materializedFallbackParseErrors++
			failures.push(`${label}: unknown region kind ${span.kind} for marker ${span.id}`)
			continue
		}
		const error = parseDiagnosticFree(`${label}.${span.id}.ts`, wrapped)
		if (error) {
			materializedFallbackParseErrors++
			failures.push(`${label}: marker ${span.id} (${span.kind}) fallback does not parse: ${error}`)
		} else {
			materializedFallbacksParsed++
		}
	}
	const substitutedSource = template.source.replace(MARKER_SPAN, (_m, _kind, _id, fallback) => parkPlaceholders(String(fallback)))
	const wrappedSource = wrapForRegionKind(template.output.kind, substitutedSource)
	if (wrappedSource === undefined) {
		materializedSourceParseErrors++
		failures.push(`${label}: unknown output kind ${template.output.kind}`)
	} else {
		const error = parseDiagnosticFree(`${label}.ts`, wrappedSource)
		if (error) {
			materializedSourceParseErrors++
			failures.push(`${label}: source with fallbacks does not parse as ${template.output.kind}: ${error}`)
		} else {
			materializedSourcesParsed++
		}
	}
	const descriptors = []
	if (template.output.type) descriptors.push(template.output.type)
	for (const port of Object.values(template.inputs ?? {})) collectPortDescriptors(port, descriptors)
	for (const descriptor of descriptors) {
		if (!descriptor.ts) continue
		materializedDescriptorsChecked++
		const { ts: substitutedType, unresolved } = substituteTypePlaceholders(descriptor.ts)
		for (const name of unresolved) {
			materializedUnresolvedPlaceholders++
			failures.push(`${label}: type parameter {{${name}}} has no fixture in effect-v4-fixture-substitutions`)
		}
		const error = parseDiagnosticFree(`${label}.descriptor.ts`, `type __T = ${substitutedType};`)
		if (error) {
			materializedDescriptorErrors++
			failures.push(`${label}: descriptor does not parse after substitution: ${error}`)
		}
	}
}

// Replacement lineage: removed ids stay removed and their replacements exist.
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'effect-v4-canonical-template-manifest.json'), 'utf8'))
const replacementsMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'effect-v4-template-replacements.json'), 'utf8'))
const canonicalIdSet = new Set(catalogIds)
let replacementLineageIssues = 0
for (const removed of manifest.removed ?? []) {
	if (canonicalIdSet.has(removed.modelId)) {
		replacementLineageIssues++
		failures.push(`${removed.modelId}: removed modelId is still present in the canonical catalog`)
	}
	if (removed.replacedBy && !canonicalIdSet.has(removed.replacedBy)) {
		replacementLineageIssues++
		failures.push(`${removed.modelId}: replacedBy ${removed.replacedBy} is not a canonical template`)
	}
}
for (const removal of replacementsMap.removals ?? []) {
	if (canonicalIdSet.has(removal.modelId)) {
		replacementLineageIssues++
		failures.push(`${removal.modelId}: replacement-map removal is still present in the canonical catalog`)
	}
}
if ((manifest.templates ?? []).length !== catalogIds.length) {
	replacementLineageIssues++
	failures.push(`manifest has ${(manifest.templates ?? []).length} entries but the catalog has ${catalogIds.length}`)
}

checks.materializedMarkers = materializedMarkers
checks.materializedMarkerIssues = materializedMarkerIssues
checks.materializedFallbacksParsed = materializedFallbacksParsed
checks.materializedFallbackParseErrors = materializedFallbackParseErrors
checks.materializedSourcesParsed = materializedSourcesParsed
checks.materializedSourceParseErrors = materializedSourceParseErrors
checks.materializedDescriptorsChecked = materializedDescriptorsChecked
checks.materializedDescriptorErrors = materializedDescriptorErrors
checks.materializedUnresolvedPlaceholders = materializedUnresolvedPlaceholders
checks.replacementLineageIssues = replacementLineageIssues

const result = {
	effectVersion: '4.0.0-rc.117',
	scope: 'structural',
	note: 'Structural validation only; module-resolved semantic compilation is the next phase (see effect-v4-semantic-compile-fixtures.json).',
	summary: {
		spreadArrays: checks.spreadArrays,
		referencedModules: checks.referencedModules,
		distinctModelIds: checks.distinctModelIds,
		duplicateModelIds: checks.duplicateModelIds,
		fallbackParseErrors: checks.fallbackParseErrors,
		markerIssues: checks.markerIssues,
		placeholderIssues: checks.placeholderIssues,
		deterministicOrder: checks.deterministicOrder,
		hostParseDiagnostics: checks.hostParseDiagnostics,
		materializedMarkers: checks.materializedMarkers,
		materializedMarkerIssues: checks.materializedMarkerIssues,
		materializedFallbacksParsed: checks.materializedFallbacksParsed,
		materializedFallbackParseErrors: checks.materializedFallbackParseErrors,
		materializedSourcesParsed: checks.materializedSourcesParsed,
		materializedSourceParseErrors: checks.materializedSourceParseErrors,
		materializedDescriptorsChecked: checks.materializedDescriptorsChecked,
		materializedDescriptorErrors: checks.materializedDescriptorErrors,
		materializedUnresolvedPlaceholders: checks.materializedUnresolvedPlaceholders,
		replacementLineageIssues: checks.replacementLineageIssues,
		failures: failures.length
	},
	checks,
	failures
}

fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result.summary, null, 2))
process.exit(failures.length ? 1 : 0)
