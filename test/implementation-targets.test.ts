import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
	REGION_KIND_VALUES,
	checkContract,
	compileGraph,
	createCompletionShellTemplate,
	discoverImplementationTargets,
	ImplementationTargetDiscoveryResultSchema,
	type ImplementationSymbolSpace,
	type RegionKind
} from '../src/index.js'

const REGION_FRAGMENTS: Readonly<Record<RegionKind, string>> = {
	identifier: 'name',
	expression: '1 + 2',
	expressionSuffix: '.length',
	statement: 'return 1;',
	array: '[1]',
	object: '{ a: 1 }',
	string: '"value"',
	number: '1',
	boolean: 'true',
	null: 'null',
	objectProperty: 'a: 1',
	type: 'string',
	typeMember: 'a: string;',
	typeParameter: 'T',
	parameter: 'value: string',
	constructorParameter: 'public value: string',
	heritageType: 'Base<string>',
	declaration: 'const value = 1;',
	classMember: 'value = 1;',
	enumMember: 'Value = 1',
	importSpecifier: 'value as localValue',
	exportSpecifier: 'value as publicValue',
	sourceFile: 'const value = 1;'
}

const TYPE_SPACE_KINDS = new Set<RegionKind>([
	'type', 'typeMember', 'typeParameter', 'heritageType', 'importSpecifier', 'exportSpecifier'
])

function capturedFiles(root: string): Record<string, string> {
	const files: Record<string, string> = {}
	function visit(directory: string): void {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name)
			if (entry.isDirectory()) visit(path)
			else if (entry.isFile() && (/\.(?:cts|mts|tsx?)$/u.test(entry.name) || entry.name === 'tsconfig.json')) {
				files[relative(root, path).replaceAll('\\', '/')] = readFileSync(path, 'utf8')
			}
		}
	}
	visit(root)
	return files
}

describe('project implementation target discovery', () => {
	it('discovers predefined executable forms only under explicit rules and exact placeholder profiles', () => {
		const source = [
			'export declare const ambient: { (value: string): number };',
			'export declare const ambientValue: Promise<number>;',
			'export function bodyless(value: string): number;',
			'class Example {',
			'  method(value: string): number;',
			'  property: string;',
			'  placeholder(): number { throw new Error("not implemented"); }',
			'}',
			'export const arrow = () => { throw new Error("not implemented"); };',
			'export const expression = undefined as never;'
		].join('\n')
		const result = discoverImplementationTargets({
			files: { 'src/forms.ts': source },
			enabledTargetKinds: [
				'declaredCallable', 'declaredValue', 'bodylessFunction', 'bodylessMethod',
				'missingPropertyInitializer', 'placeholderBody'
			],
			exactPlaceholderBodies: ['{ throw new Error("not implemented"); }'],
			exactPlaceholderExpressions: ['undefined as never']
		})

		expect(result.ok).toBe(true)
		expect(result.targets).toHaveLength(8)
		expect(result.targets.map(target => target.targetKey.targetKind)).toEqual([
			'declaredCallable', 'declaredValue', 'bodylessFunction', 'bodylessMethod',
			'missingPropertyInitializer', 'placeholderBody', 'placeholderBody', 'placeholderBody'
		])
		expect(new Set(result.targets.map(target => target.targetId)).size).toBe(result.targets.length)
		expect(result.targets.every(target => target.start < target.end)).toBe(true)
		expect(result.targets.every(target => /^sha256:[a-f0-9]{64}$/u.test(target.baseContentHash))).toBe(true)
		expect(result.targets.every(target => /^f1_[a-f0-9]{64}$/u.test(target.baseArtifactFileHash))).toBe(true)
		expect(result.unresolvedValues).toHaveLength(8)
		expect(checkContract(ImplementationTargetDiscoveryResultSchema, result)).toBe(true)
	})

	it('supports every RegionKind only through explicit non-empty existing ranges', () => {
		const files: Record<string, string> = {}
		const configuredRanges = REGION_KIND_VALUES.map((regionKind, index) => {
			const path = `src/region-${index}.ts`
			const exactText = REGION_FRAGMENTS[regionKind]
			files[path] = exactText
			return {
				id: `region-${index}`,
				path,
				qualifiedName: `Explicit.${regionKind}`,
				regionKind,
				symbolSpace: (TYPE_SPACE_KINDS.has(regionKind) ? 'type' : 'value') as ImplementationSymbolSpace,
				selector: { kind: 'range' as const, start: 0, end: exactText.length, expectedText: exactText }
			}
		})
		const result = discoverImplementationTargets({ files, enabledTargetKinds: [], configuredRanges })

		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		expect(result.targets).toHaveLength(REGION_KIND_VALUES.length)
		expect(new Set(result.targets.map(target => target.regionKind))).toEqual(new Set(REGION_KIND_VALUES))
		for (const target of result.targets) {
			const shell = createCompletionShellTemplate(target.completionShell)
			expect(shell.modelId).toBe(target.requiredRootTemplateId)
			expect(shell.manifestDigest).toBe(target.requiredRootTemplateManifestDigest)
			expect(shell.output.kind).toBe(target.regionKind)
			expect(Object.keys(shell.inputs)).toEqual(['implementation'])
		}
	})

	it('discovers an explicitly marked structural member while retaining its non-empty body range', () => {
		const source = 'interface Contract {\n/** @TYPE typeMember id=repair **/old: string;/** @END **/\n}\n'
		const result = discoverImplementationTargets({
			files: { 'src/contract.ts': source },
			enabledTargetKinds: [],
			configuredRanges: [{
				id: 'repair', path: 'src/contract.ts', qualifiedName: 'Contract.old',
				regionKind: 'typeMember', symbolSpace: 'type', selector: { kind: 'marker', markerId: 'repair' }
			}]
		})

		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		expect(source.slice(result.targets[0]!.start, result.targets[0]!.end)).toBe('old: string;')
		expect(result.targets[0]!.symbol).toMatchObject({
			name: 'old', qualifiedName: 'Contract.old',
			declarationStart: source.indexOf('old: string;'),
			declarationEnd: source.indexOf('old: string;') + 'old: string;'.length
		})
	})

	it('maps configured expression, body, and member selectors to their owning declaration facts', () => {
		const expressionSource = 'export const calculate = fallback();\n'
		const bodySource = 'export function execute(): number {\n/** @TYPE statement id=body **/return 1;/** @END **/\n}\n'
		const memberSource = 'export class Service {\n  work(): number { return 1; }\n}\n'
		const memberText = 'work(): number { return 1; }'
		const memberStart = memberSource.indexOf(memberText)
		const result = discoverImplementationTargets({
			files: {
				'src/expression.ts': expressionSource,
				'src/body.ts': bodySource,
				'src/member.ts': memberSource
			},
			enabledTargetKinds: [],
			configuredRanges: [{
				id: 'expression', path: 'src/expression.ts', qualifiedName: 'calculate',
				regionKind: 'expression', symbolSpace: 'value',
				selector: { kind: 'text', exactText: 'fallback()' }
			}, {
				id: 'body', path: 'src/body.ts', qualifiedName: 'execute',
				regionKind: 'statement', symbolSpace: 'value',
				selector: { kind: 'marker', markerId: 'body' }
			}, {
				id: 'member', path: 'src/member.ts', qualifiedName: 'Service.work',
				regionKind: 'classMember', symbolSpace: 'value',
				selector: {
					kind: 'range', start: memberStart, end: memberStart + memberText.length,
					expectedText: memberText
				}
			}]
		})

		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		expect(result.targets.map(target => ({
			qualifiedName: target.symbol.qualifiedName,
			declarationStart: target.symbol.declarationStart,
			targetStart: target.start,
			exported: target.symbol.exported
		}))).toEqual([{
			qualifiedName: 'execute',
			declarationStart: bodySource.indexOf('export function'),
			targetStart: bodySource.indexOf('return 1;'),
			exported: true
		}, {
			qualifiedName: 'calculate',
			declarationStart: expressionSource.indexOf('calculate'),
			targetStart: expressionSource.indexOf('fallback()'),
			exported: true
		}, {
			qualifiedName: 'Service.work',
			declarationStart: memberStart,
			targetStart: memberStart,
			exported: true
		}])
		expect(result.unresolvedValues.map(value => ({
			qualifiedName: value.qualifiedName,
			declarationStart: value.declarationStart,
			declarationEnd: value.declarationEnd
		}))).toEqual(result.targets.map(target => ({
			qualifiedName: target.symbol.qualifiedName,
			declarationStart: target.symbol.declarationStart,
			declarationEnd: target.symbol.declarationEnd
		})))
	})

	it('rejects stale, overlapping, declaration-file, zero-length, and overloaded targets', () => {
		const invalid = discoverImplementationTargets({
			files: {
				'src/range.ts': '1 + 2',
				'src/contracts.d.ts': 'declare function ambient(value: number): number;',
				'src/overload.ts': 'export function overloaded(x: string): string;\nexport function overloaded(x: number): number;'
			},
			enabledTargetKinds: ['bodylessFunction'],
			configuredRanges: [
				{ id: 'outer', path: 'src/range.ts', qualifiedName: 'outer', regionKind: 'expression', symbolSpace: 'value', selector: { kind: 'range', start: 0, end: 5, expectedText: 'stale' } },
				{ id: 'inner', path: 'src/range.ts', qualifiedName: 'inner', regionKind: 'expression', symbolSpace: 'value', selector: { kind: 'range', start: 4, end: 5, expectedText: '2' } },
				{ id: 'zero', path: 'src/range.ts', qualifiedName: 'zero', regionKind: 'expression', symbolSpace: 'value', selector: { kind: 'range', start: 1, end: 1, expectedText: 'x' } },
				{ id: 'declaration-file', path: 'src/contracts.d.ts', qualifiedName: 'ambient', regionKind: 'declaration', symbolSpace: 'value', selector: { kind: 'range', start: 0, end: 30, expectedText: 'declare const ambient: number;' } }
			]
		})

		expect(invalid.ok).toBe(false)
		const codes = new Set(invalid.diagnostics.map(diagnostic => diagnostic.code))
		expect(codes).toEqual(expect.objectContaining(new Set([
			'StaleImplementationTargetRange',
			'OverlappingImplementationTargets',
			'InvalidImplementationTargetRange',
			'DeclarationFileImplementationTarget',
			'AmbiguousImplementationOverload'
		])))
	})

	it('rejects ambiguous global declaration merges across captured files and invalid range syntax', () => {
		const merged = discoverImplementationTargets({
			files: {
				'src/first.ts': 'declare function shared(value: string): string;',
				'src/second.ts': 'declare function shared(value: number): number;',
				'src/invalid.ts': '1 +'
			},
			enabledTargetKinds: ['bodylessFunction'],
			configuredRanges: [{
				id: 'invalid', path: 'src/invalid.ts', qualifiedName: 'invalid',
				regionKind: 'expression', symbolSpace: 'value',
				selector: { kind: 'range', start: 0, end: 3, expectedText: '1 +' }
			}]
		})
		const codes = merged.diagnostics.map(diagnostic => diagnostic.code)
		expect(merged.ok).toBe(false)
		expect(codes).toContain('AmbiguousImplementationDeclarationMerge')
		expect(codes).toContain('InvalidImplementationRangeSyntax')
	})

	it('builds a contract-preserving required root whose only open port is implementation', () => {
		const result = discoverImplementationTargets({
			files: { 'src/value.ts': 'export declare const calculate: { (value: string): number };' },
			enabledTargetKinds: ['declaredCallable']
		})
		const target = result.targets[0]!
		const shell = createCompletionShellTemplate(target.completionShell)
		const compiled = compileGraph({
			nodes: [{
				id: 'root', templateId: shell.modelId,
				inputs: { implementation: { kind: 'rawCode', code: '(value: string) => value.length' } }
			}],
			finalNodeId: 'root'
		}, [shell])

		expect(compiled.ok).toBe(true)
		if (!compiled.ok) return
		expect(compiled.finalArtifact.code).toBe('export const calculate: { (value: string): number } = (value: string) => value.length;')
		expect(compiled.finalArtifact.source.templateId).toBe(target.requiredRootTemplateId)
		expect(compiled.finalArtifact.source.templateManifestDigest).toBe(target.requiredRootTemplateManifestDigest)
	})

	it('reports the real image-processor inventory without modifying its files', () => {
		const root = resolve(import.meta.dirname, '../../manual-test-workspace/apps/workers/image-processor')
		const before = capturedFiles(root)
		const result = discoverImplementationTargets({
			files: before,
			sourcePaths: Object.keys(before).filter(path => path.startsWith('src/') && /\.(?:cts|mts|tsx?)$/u.test(path)),
			enabledTargetKinds: ['declaredCallable', 'declaredValue']
		})
		const after = capturedFiles(root)

		expect(result.ok, JSON.stringify(result.diagnostics, null, 2)).toBe(true)
		expect(result.targets).toHaveLength(36)
		expect(result.targets.filter(target => target.path === 'src/job.ts')).toHaveLength(20)
		expect(after).toEqual(before)
	})
})
