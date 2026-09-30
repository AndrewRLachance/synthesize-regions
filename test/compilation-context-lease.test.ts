import { describe, expect, it } from 'vitest'

import { FinalValidationError } from '../src/core/errors.js'
import { generateWithReplacements } from '../src/generation/generate.js'
import { defineTemplate } from '../src/templates/definition.js'
import { fragmentPort, rawCodePort } from '../src/templates/compatibility.js'
import { compileGraph } from '../src/templates/graph.js'
import { createTemplateRegistry } from '../src/templates/registry.js'
import { createGraphRunner } from '../src/templates/runner.js'
import { createCompilationContextLease } from '../src/validation/analysisContext.js'
import type { SynthesisGraph } from '../src/index.js'

const Value = defineTemplate({
	modelId: 'LeaseValue',
	inputs: { value: rawCodePort({ regionKind: 'expression' }) },
	output: { kind: 'expression', type: { ts: 'number' } },
	source: '/** @TYPE expression id=value **/0/** @END **/'
})

const Wrapper = defineTemplate({
	modelId: 'LeaseWrapper',
	inputs: {
		body: fragmentPort({ regionKind: 'expression', accepts: { outputKind: 'expression' } })
	},
	output: { kind: 'expression', type: { ts: 'number' } },
	source: '((/** @TYPE expression id=body **/0/** @END **/) + 1)'
})

/** Declares a module-scope name that a later artifact can accidentally observe. */
const LeakyFile = defineTemplate({
	modelId: 'LeaseLeakyFile',
	inputs: {},
	output: { kind: 'sourceFile' },
	source: 'export const leaseLeak = 1;'
})

/** Resolves only while `leaseLeak` is still declared by an earlier operation. */
const LeakyProbe = defineTemplate({
	modelId: 'LeaseLeakyProbe',
	inputs: {},
	output: { kind: 'sourceFile' },
	source: 'export const leaseProbe: number = leaseLeak;'
})

const registry = createTemplateRegistry([Value, Wrapper])
const leakageRegistry = createTemplateRegistry([LeakyFile, LeakyProbe])

const completeGraph: SynthesisGraph = {
	nodes: [
		{ id: 'value', templateId: 'LeaseValue', inputs: { value: { kind: 'rawCode', code: '1' } } },
		{ id: 'wrapper', templateId: 'LeaseWrapper', inputs: { body: { $ref: 'value' } } }
	],
	finalNodeId: 'wrapper'
}

function compile(): ReturnType<typeof compileGraph> {
	return compileGraph(completeGraph, registry)
}

function compileSingle(templateId: string, registryToUse = leakageRegistry): ReturnType<typeof compileGraph> {
	const graph: SynthesisGraph = {
		nodes: [{ id: 'only', templateId, inputs: {} }],
		finalNodeId: 'only'
	}
	return compileGraph(graph, registryToUse, { checkSemanticDiagnostics: true })
}

/** Compile the probe. It resolves only while `leaseLeak` is still declared. */
function probe(): boolean {
	return compileSingle('LeaseLeakyProbe').ok
}

/** Compile the declaring artifact, which is what would leak a module-scope name. */
function declare(): boolean {
	return compileSingle('LeaseLeakyFile').ok
}

describe('compilation context lease', () => {
	it('produces the same compilation result as unscoped compilation', () => {
		const unscoped = compile()
		const lease = createCompilationContextLease()
		try {
			expect(lease.run(() => compile())).toEqual(unscoped)
		} finally {
			lease.close()
		}
	})

	it('builds one analysis project for a multi-step repair loop', () => {
		const lease = createCompilationContextLease()
		try {
			const results = [
				lease.run(() => compile().ok),
				lease.run(() => compile().ok),
				lease.run(() => compile().ok),
				lease.run(() => compile().ok)
			]
			expect(results).toEqual([true, true, true, true])
			expect(lease.projectRebuildCount).toBe(1)
		} finally {
			lease.close()
		}
	})

	it('rebuilds when a call explicitly requests a different tsconfig', () => {
		const lease = createCompilationContextLease()
		try {
			lease.run(() => compile())
			expect(lease.projectRebuildCount).toBe(1)

			const aligned = lease.run(() => generateWithReplacements(
				'const x: number = /** @TYPE expression id=value **/ 0 /** @END **/;',
				{ value: { kind: 'expression', code: '1' } },
				{ tsConfigFilePath: 'tsconfig.typecheck.json' }
			))
			expect(aligned.code).toBe('const x: number = 1;')
			expect(lease.projectRebuildCount).toBe(2)
		} finally {
			lease.close()
		}
	})

	it('keeps a caller-omitted tsconfig from downgrading a bound project', () => {
		const lease = createCompilationContextLease({ tsConfigFilePath: 'tsconfig.typecheck.json' })
		try {
			lease.run(() => compile())
			lease.run(() => compile())
			expect(lease.projectRebuildCount).toBe(1)
		} finally {
			lease.close()
		}
	})

	it('never lets a declaration reach a later operation', () => {
		const lease = createCompilationContextLease()
		try {
			expect(lease.run(() => declare())).toBe(true)
			// A surviving scratch file would leave `leaseLeak` resolvable here.
			expect(lease.run(() => probe())).toBe(false)

			// The same sequence is isolated without a lease, so the guarantee
			// below is the lease preserving it rather than the lease providing it.
			expect(declare()).toBe(true)
			expect(probe()).toBe(false)

			expect(lease.run(() => declare())).toBe(true)
			expect(lease.run(() => probe())).toBe(false)
		} finally {
			lease.close()
		}
	})

	it('isolates a failed scoped operation from the next one', () => {
		const lease = createCompilationContextLease()
		try {
			expect(() => lease.run(() => {
				generateWithReplacements(
					'const value: number = /** @TYPE expression id=value **/ 0 /** @END **/;',
					{ value: { kind: 'expression', code: '"wrong"' } },
					{ checkSemanticDiagnostics: true }
				)
			})).toThrow(FinalValidationError)

			const retried = lease.run(() => generateWithReplacements(
				'const value: number = /** @TYPE expression id=value **/ 0 /** @END **/;',
				{ value: { kind: 'expression', code: '2' } },
				{ checkSemanticDiagnostics: true }
			))
			expect(retried.code).toBe('const value: number = 2;')
		} finally {
			lease.close()
		}
	})

	it('reuses the project across a runner repair loop', () => {
		const lease = createCompilationContextLease()
		try {
			const runner = createGraphRunner(registry, { nodes: [], finalNodeId: 'missing' })
			const repairable = lease.run(() => runner.advance())
			expect(repairable.kind).toBe('needsGraphRepair')

			const repaired = lease.run(() => runner.advance({ kind: 'replaceGraph', graph: completeGraph }))
			expect(repaired.kind).toBe('complete')
			expect(lease.projectRebuildCount).toBe(1)
		} finally {
			lease.close()
		}
	})

	it('rejects use after close and tolerates repeated close', () => {
		const lease = createCompilationContextLease()
		expect(lease.run(() => compile().ok)).toBe(true)
		lease.close()
		lease.close()
		expect(() => lease.run(() => compile())).toThrow(/has been closed/u)
	})

	it('rejects a second lease nested inside an active one', () => {
		const outer = createCompilationContextLease()
		const inner = createCompilationContextLease()
		try {
			expect(() => outer.run(() => inner.run(() => compile()))).toThrow(/cannot overlap/u)
		} finally {
			outer.close()
			inner.close()
		}
	})

	it('allows the same lease to nest inside itself', () => {
		const lease = createCompilationContextLease()
		try {
			expect(lease.run(() => lease.run(() => compile().ok))).toBe(true)
			expect(lease.projectRebuildCount).toBe(1)
		} finally {
			lease.close()
		}
	})

	it('rejects closing a lease inside its own operation', () => {
		const lease = createCompilationContextLease()
		try {
			expect(() => lease.run(() => lease.close())).toThrow(/inside its own operation/u)
		} finally {
			lease.close()
		}
	})
})
