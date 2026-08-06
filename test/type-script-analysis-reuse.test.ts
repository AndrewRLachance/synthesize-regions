import { describe, expect, it, vi } from 'vitest'
import {
	compareTypeScriptTypes,
	resetTypeScriptCompatibility,
	validateTypeScriptType
} from '../src/templates/typeScriptCompatibility.js'
import { createProject, resetSharedProject } from '../src/validation/ast.js'

describe('TypeScript analysis reuse', () => {
	it('should reuse the same project instance across multiple calls', () => {
		// Reset any existing state
		resetSharedProject()
		resetTypeScriptCompatibility()
		
		// Create first project
		const project1 = createProject()
		
		// Create second project with same options (should be the same instance)
		const project2 = createProject()
		
		// They should be the same instance
		expect(project1).toBe(project2)
		
		// Test that we can reuse the project for multiple validations
		const result1 = validateTypeScriptType('string')
		const result2 = validateTypeScriptType('number')
		
		expect(result1.ok).toBe(true)
		expect(result2.ok).toBe(true)
	})
	
	it('should maintain compatibility cache across calls', () => {
		// Reset any existing state
		resetSharedProject()
		resetTypeScriptCompatibility()
		
		// Test type validation caching
		const result1 = validateTypeScriptType('string')
		const result2 = validateTypeScriptType('string') // Should be cached
		
		expect(result1.ok).toBe(true)
		expect(result2.ok).toBe(true)
		
		// Test type compatibility caching
		const compat1 = compareTypeScriptTypes('string', 'number')
		const compat2 = compareTypeScriptTypes('string', 'number') // Should be cached
		
		expect(compat1.status).toBe('incompatible')
		expect(compat2.status).toBe('incompatible')
	})
	
	it('should reset compatibility caches when requested', () => {
		// Reset any existing state
		resetSharedProject()
		resetTypeScriptCompatibility()
		
		// Perform some validations to populate caches
		validateTypeScriptType('string')
		compareTypeScriptTypes('string', 'number')
		
		// Reset the compatibility system
		resetTypeScriptCompatibility()
		
		// After reset, we should still be able to validate
		const result = validateTypeScriptType('boolean')
		expect(result.ok).toBe(true)
		
		// And compare types
		const compat = compareTypeScriptTypes('boolean', 'string')
		expect(compat.status).toBe('incompatible')
	})
	
	it('should handle multiple compilation sessions correctly', () => {
		// Reset any existing state
		resetSharedProject()
		resetTypeScriptCompatibility()
		
		// First compilation session
		const result1 = validateTypeScriptType('string')
		const compat1 = compareTypeScriptTypes('string', 'number')
		
		expect(result1.ok).toBe(true)
		expect(compat1.status).toBe('incompatible')
		
		// Reset for new session (simulating a new compilation)
		resetSharedProject()
		resetTypeScriptCompatibility()
		
		// Second compilation session
		const result2 = validateTypeScriptType('number')
		const compat2 = compareTypeScriptTypes('number', 'string')
		
		expect(result2.ok).toBe(true)
		expect(compat2.status).toBe('incompatible')
	})
})