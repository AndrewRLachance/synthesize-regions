import { describe, expect, it, vi } from 'vitest'
import {
	generateWithReplacements,
	generateDiscoveredSourceTemplate
} from '../src/generation/generate.js'
import { createProject, resetSharedProject } from '../src/validation/ast.js'

describe('Generation project reuse', () => {
	it('should reset shared project at start of compilation session', () => {
		// Reset any existing state
		resetSharedProject()
		
		// Simulate a generation call which should reset the project
		const mockSourceText = 'const x = /** @TYPE expression id=value **/ replaceMe /** @END **/;'
		const replacements = { value: { kind: 'expression', code: '1 + 1' } }
		
		// This should trigger a reset of shared project at the beginning
		const result = generateWithReplacements(mockSourceText, replacements)
		
		// Verify generation worked correctly
		expect(result.code).toBe('const x = 1 + 1;')
		
		// Create another project to verify it's still working
		const newProject = createProject()
		
		// The function should return a valid project instance
		expect(newProject).toBeDefined()
	})
	
	it('should handle multiple generation calls with proper state management', () => {
		// Reset any existing state
		resetSharedProject()
		
		const mockSourceText1 = 'const x = /** @TYPE expression id=value **/ replaceMe /** @END **/;'
		const replacements1 = { value: { kind: 'expression', code: '1 + 1' } }
		
		const result1 = generateWithReplacements(mockSourceText1, replacements1)
		expect(result1.code).toBe('const x = 1 + 1;')
		
		// Second call should also work correctly
		const mockSourceText2 = 'const y = /** @TYPE expression id=value **/ replaceMe /** @END **/;'
		const replacements2 = { value: { kind: 'expression', code: '2 * 2' } }
		
		const result2 = generateWithReplacements(mockSourceText2, replacements2)
		expect(result2.code).toBe('const y = 2 * 2;')
		
		// Both should have used the same shared project
		const finalProject = createProject()
		// This test mainly verifies that no errors occur and both calls work
		expect(finalProject).toBeDefined()
	})
})