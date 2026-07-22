import { describe, expect, it } from 'vitest'

import {
	collectExecutableTests,
	collectNamedImports,
	collectTopLevelDeclarations,
	verifyPathTestReference,
	verifyTokenTestReference
} from '../scripts/invariant-checker-core.js'

describe('invariant checker structure', () => {
	it('counts only exact executable test declarations', () => {
		const tests = collectExecutableTests('test/example.test.ts', `
      // it('comment-only')
      const decoy = "it('string-only')"
      it('exact test', () => {})
      it.each([[1]])('table test', () => {})
      it.skip('skipped test', () => {})
      test.todo('todo test')
    `)
		expect(tests).toEqual([
			{ file: 'test/example.test.ts', title: 'exact test' },
			{ file: 'test/example.test.ts', title: 'table test' }
		])
		expect(verifyPathTestReference('test/example.test.ts#exact test', tests)).toBeUndefined()
		expect(verifyPathTestReference('test/example.test.ts#test', tests)).toContain('found 0')
		expect(verifyTokenTestReference('RT-EXAMPLE-001-T1', collectExecutableTests('test/example.test.ts', `it('[RT-EXAMPLE-001-T1] exact', () => {})`))).toBeUndefined()
	})

	it('distinguishes exported declarations and owner imports from text matches', () => {
		const source = `
      import { OwnedSchema as ForeignSchema, classify } from 'owner-package'
      const OwnedSchema = ForeignSchema
      export const PublicSchema = ForeignSchema
      // export const CommentSchema = true
    `
		expect(collectNamedImports('consumer.ts', source)).toEqual([
			{ module: 'owner-package', imported: 'OwnedSchema', local: 'ForeignSchema' },
			{ module: 'owner-package', imported: 'classify', local: 'classify' }
		])
		expect(collectTopLevelDeclarations('consumer.ts', source)).toEqual([
			{ name: 'OwnedSchema', exported: false },
			{ name: 'PublicSchema', exported: true }
		])
	})
})
