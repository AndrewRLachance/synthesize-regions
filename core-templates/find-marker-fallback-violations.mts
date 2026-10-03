/**
 * Diagnostic — locate `marker(...)` calls whose fallback body does not parse as
 * a single expression of the declared region kind.
 *
 * Run: node --import tsx core-templates/find-marker-fallback-violations.mts [file...]
 */
import { Project, ScriptKind, SyntaxKind, ts } from 'ts-morph'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { coreTemplatesDir } from './audit-lib.mts'

const project = new Project({
	compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
	skipAddingFilesFromTsConfig: true
})

const targets = process.argv.slice(2).length > 0
	? process.argv.slice(2)
	: readdirSync(coreTemplatesDir).filter((n) => n.endsWith('.ts')).sort()

interface Violation {
	file: string
	line: number
	kind: string
	id: string
	fallback: string
	reason: string
}

const violations: Violation[] = []
let scanned = 0

for (const fileName of targets) {
	const absolute = join(coreTemplatesDir, fileName.endsWith('.ts') ? fileName : `${fileName}.ts`)
	let sourceFile
	try {
		sourceFile = project.addSourceFileAtPath(absolute)
	} catch {
		continue
	}
	for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		const expr = call.getExpression()
		if (expr.getText() !== 'marker') continue
		const args = call.getArguments()
		if (args.length < 3) continue
		const kindArg = args[0]!
		const idArg = args[1]!
		const fallbackArg = args[2]!
		// Only literal fallbacks can be checked statically. `marker()` accepts
		// both single-quoted strings and backtick literals with no substitution.
		const literalText = (node: { getKind(): SyntaxKind; getLiteralText(): string }): string | undefined =>
			node.getKind() === SyntaxKind.StringLiteral || node.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral
				? node.getLiteralText()
				: undefined
		const kind = literalText(kindArg as never)
		const id = literalText(idArg as never)
		const fallback = literalText(fallbackArg as never)
		if (kind === undefined || id === undefined || fallback === undefined) continue
		scanned += 1

		if (kind === 'statement' || kind === 'sourceFile' || kind === 'type') continue

		// Substitute `{{...}}` placeholders with a neutral identifier so the
		// remainder of the body is what actually gets parsed.
		const substituted = fallback.replace(/\{\{[^}]*\}\}/g, '__p')
		const text = kind === 'identifier' || kind === 'string' || kind === 'number'
			? `const __v = ${substituted};`
			: `const __v = (${substituted});`

		const sf = project.createSourceFile(`/__probe__/${fileName}.probe.ts`, text, { overwrite: true })
		// Only syntactic shape matters here: the marked body must map to a
		// recognized AST node. Unresolved identifiers are legitimate because the
		// fallback references symbols imported by the eventual target file.
		const hard = project.getProgram().getSyntacticDiagnostics(sf)
		if (hard.length > 0) {
			violations.push({
				file: fileName,
				line: call.getStartLineNumber(),
				kind,
				id,
				fallback: fallback.length > 120 ? `${fallback.slice(0, 117)}...` : fallback,
				reason: hard
					.slice(0, 2)
					.map((d) => ts.flattenDiagnosticMessageText(d.compilerObject.messageText, ' '))
					.join(' | ')
			})
		}
		project.removeSourceFile(sf)
	}
}

console.log(`marker fallbacks scanned: ${scanned}`)
console.log(`violations: ${violations.length}`)
for (const v of violations) {
	console.log(`\n${v.file}:${v.line} [${v.kind}] id=${v.id}`)
	console.log(`  fallback: ${v.fallback}`)
	console.log(`  reason:   ${v.reason}`)
}
