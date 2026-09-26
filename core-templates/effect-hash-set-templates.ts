import { defineTemplate } from '../src/templates.js'
import { effectValueInput } from './effect-ts.js'
import {
	type AnyEffectFamilyTemplateDefinitionInput,
	callbackInput,
	expressionOutput,
	marker,
	typeParameters,
	typedExpressionInput
} from './effect-template-helpers.js'
import {
	expressionCollectionInput,
	hashSetType,
	mutableHashSetType
} from './effect-data-type-template-helpers.js'

const hashSetInput = (description: string, value = 'unknown') =>
	typedExpressionInput(description, hashSetType(value))
const mutableHashSetInput = (description: string, value = 'unknown') =>
	typedExpressionInput(description, mutableHashSetType(value))

export const HashSetEmptyTemplate = defineTemplate({
	modelId: 'HashSetEmpty', version: '1.0.0', description: 'Creates an empty immutable HashSet.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: {},
	output: expressionOutput('Empty HashSet.', hashSetType('{{A}}')),
	source: 'HashSet.empty()'
})

export const HashSetFromIterableTemplate = defineTemplate({
	modelId: 'HashSetFromIterable', version: '1.0.0', description: 'Creates an immutable HashSet from an Iterable.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { iterable: effectValueInput('Iterable source.', { ts: 'Iterable<{{A}}>' }) },
	output: expressionOutput('HashSet containing unique iterable values.', hashSetType('{{A}}')),
	source: `HashSet.fromIterable(${marker('expression', 'iterable', '[]')})`
})

export const HashSetMakeTemplate = defineTemplate({
	modelId: 'HashSetMake', version: '1.0.0', description: 'Creates an immutable HashSet from one or more values.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { values: expressionCollectionInput('HashSet values.', { ts: '{{A}}' }) },
	output: expressionOutput('HashSet containing the supplied unique values.', hashSetType('{{A}}')),
	source: `HashSet.make(${marker('expression', 'values', 'undefined')})`
})

export const HashSetHasTemplate = defineTemplate({
	modelId: 'HashSetHas', version: '1.0.0', description: 'Checks whether a HashSet contains a value.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { set: hashSetInput('HashSet to inspect.', '{{A}}'), value: effectValueInput('Value to find.', { ts: '{{A}}' }) },
	output: expressionOutput('Membership result.', { ts: 'boolean' }),
	source: `HashSet.has(${marker('expression', 'set', 'HashSet.empty()')}, ${marker('expression', 'value', 'undefined')})`
})

const hashSetPredicate = (modelId: string, method: 'some' | 'every') => defineTemplate({
	modelId, version: '1.0.0', description: `Checks HashSet elements with HashSet.${method}.`,
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: {
		set: hashSetInput('HashSet to inspect.', '{{A}}'),
		predicate: callbackInput('Element predicate.', { ts: '(value: {{A}}) => boolean' })
	},
	output: expressionOutput('Predicate result.', { ts: 'boolean' }),
	source: `HashSet.${method}(${marker('expression', 'set', 'HashSet.empty()')}, ${marker('expression', 'predicate', '() => true')})`
})

export const HashSetSomeTemplate = hashSetPredicate('HashSetSome', 'some')
export const HashSetEveryTemplate = hashSetPredicate('HashSetEvery', 'every')

export const HashSetIsSubsetTemplate = defineTemplate({
	modelId: 'HashSetIsSubset', version: '1.0.0', description: 'Checks whether one HashSet is a subset of another.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { set: hashSetInput('Candidate subset.', '{{A}}'), other: hashSetInput('Candidate superset.', '{{A}}') },
	output: expressionOutput('Subset test result.', { ts: 'boolean' }),
	source: `HashSet.isSubset(${marker('expression', 'set', 'HashSet.empty()')}, ${marker('expression', 'other', 'HashSet.empty()')})`
})

export const HashSetSizeTemplate = defineTemplate({
	modelId: 'HashSetSize', version: '1.0.0', description: 'Returns the number of elements in a HashSet.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { set: hashSetInput('HashSet to measure.', '{{A}}') },
	output: expressionOutput('HashSet size.', { ts: 'number' }),
	source: `HashSet.size(${marker('expression', 'set', 'HashSet.empty()')})`
})

const hashSetMutation = (modelId: string, method: 'add' | 'remove') => defineTemplate({
	modelId, version: '1.0.0', description: `${method === 'add' ? 'Adds' : 'Removes'} a value and returns a new immutable HashSet.`,
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { set: hashSetInput('Source HashSet.', '{{A}}'), value: effectValueInput('Element value.', { ts: '{{A}}' }) },
	output: expressionOutput('Updated immutable HashSet.', hashSetType('{{A}}')),
	source: `HashSet.${method}(${marker('expression', 'set', 'HashSet.empty()')}, ${marker('expression', 'value', 'undefined')})`
})

export const HashSetAddTemplate = hashSetMutation('HashSetAdd', 'add')
export const HashSetRemoveTemplate = hashSetMutation('HashSetRemove', 'remove')

const hashSetBinary = (modelId: string, method: 'difference' | 'intersection' | 'union') => defineTemplate({
	modelId, version: '1.0.0', description: `Combines HashSets using HashSet.${method}.`,
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { left: hashSetInput('Left HashSet.', '{{A}}'), right: hashSetInput('Right HashSet.', '{{A}}') },
	output: expressionOutput('Combined HashSet.', hashSetType('{{A}}')),
	source: `HashSet.${method}(${marker('expression', 'left', 'HashSet.empty()')}, ${marker('expression', 'right', 'HashSet.empty()')})`
})

export const HashSetDifferenceTemplate = hashSetBinary('HashSetDifference', 'difference')
export const HashSetIntersectionTemplate = hashSetBinary('HashSetIntersection', 'intersection')
export const HashSetUnionTemplate = hashSetBinary('HashSetUnion', 'union')

export const HashSetMapTemplate = defineTemplate({
	modelId: 'HashSetMap', version: '1.0.0', description: 'Transforms every HashSet element and deduplicates the mapped values.',
	typeParameters: typeParameters(['A', 'Input element type.'], ['B', 'Mapped element type.']),
	inputs: { set: hashSetInput('Source HashSet.', '{{A}}'), transform: callbackInput('Element transform.', { ts: '(value: {{A}}) => {{B}}' }) },
	output: expressionOutput('Mapped HashSet.', hashSetType('{{B}}')),
	source: `HashSet.map(${marker('expression', 'set', 'HashSet.empty()')}, ${marker('expression', 'transform', 'value => value')})`
})

export const HashSetReduceTemplate = defineTemplate({
	modelId: 'HashSetReduce', version: '1.0.0', description: 'Reduces a HashSet to a single value.',
	typeParameters: typeParameters(['A', 'Set element type.'], ['B', 'Accumulator type.']),
	inputs: {
		set: hashSetInput('Source HashSet.', '{{A}}'),
		initial: effectValueInput('Initial accumulator.', { ts: '{{B}}' }),
		reducer: callbackInput('Reducer callback.', { ts: '(accumulator: {{B}}, value: {{A}}) => {{B}}' })
	},
	output: expressionOutput('Reduced value.', { ts: '{{B}}' }),
	source: `HashSet.reduce(${marker('expression', 'set', 'HashSet.empty()')}, ${marker('expression', 'initial', 'undefined')}, ${marker('expression', 'reducer', 'accumulator => accumulator')})`
})

export const HashSetFilterTemplate = defineTemplate({
	modelId: 'HashSetFilter', version: '1.0.0', description: 'Keeps HashSet elements that satisfy a predicate.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { set: hashSetInput('Source HashSet.', '{{A}}'), predicate: callbackInput('Element predicate.', { ts: '(value: {{A}}) => boolean' }) },
	output: expressionOutput('Filtered HashSet.', hashSetType('{{A}}')),
	source: `HashSet.filter(${marker('expression', 'set', 'HashSet.empty()')}, ${marker('expression', 'predicate', '() => true')})`
})

export const MutableHashSetEmptyTemplate = defineTemplate({
	modelId: 'MutableHashSetEmpty', version: '1.0.0', description: 'Creates an empty MutableHashSet.',
	typeParameters: typeParameters(['A', 'Set element type.']), inputs: {},
	output: expressionOutput('Empty MutableHashSet.', mutableHashSetType('{{A}}')),
	source: 'MutableHashSet.empty()'
})

export const MutableHashSetFromIterableTemplate = defineTemplate({
	modelId: 'MutableHashSetFromIterable', version: '1.0.0', description: 'Creates a MutableHashSet from an Iterable.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { iterable: effectValueInput('Iterable source.', { ts: 'Iterable<{{A}}>' }) },
	output: expressionOutput('MutableHashSet containing unique iterable values.', mutableHashSetType('{{A}}')),
	source: `MutableHashSet.fromIterable(${marker('expression', 'iterable', '[]')})`
})

export const MutableHashSetMakeTemplate = defineTemplate({
	modelId: 'MutableHashSetMake', version: '1.0.0', description: 'Creates a MutableHashSet from one or more values.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { values: expressionCollectionInput('MutableHashSet values.', { ts: '{{A}}' }) },
	output: expressionOutput('MutableHashSet containing the supplied values.', mutableHashSetType('{{A}}')),
	source: `MutableHashSet.make(${marker('expression', 'values', 'undefined')})`
})

export const MutableHashSetHasTemplate = defineTemplate({
	modelId: 'MutableHashSetHas', version: '1.0.0', description: 'Checks whether a MutableHashSet contains a value.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { set: mutableHashSetInput('MutableHashSet to inspect.', '{{A}}'), value: effectValueInput('Value to find.', { ts: '{{A}}' }) },
	output: expressionOutput('Membership result.', { ts: 'boolean' }),
	source: `MutableHashSet.has(${marker('expression', 'set', 'MutableHashSet.empty()')}, ${marker('expression', 'value', 'undefined')})`
})

const mutableMutation = (modelId: string, method: 'add' | 'remove') => defineTemplate({
	modelId, version: '1.0.0', description: `${method === 'add' ? 'Adds' : 'Removes'} a value in place on a MutableHashSet.`,
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { set: mutableHashSetInput('MutableHashSet to mutate.', '{{A}}'), value: effectValueInput('Element value.', { ts: '{{A}}' }) },
	output: expressionOutput('Mutation result.', { ts: 'void' }),
	source: `MutableHashSet.${method}(${marker('expression', 'set', 'MutableHashSet.empty()')}, ${marker('expression', 'value', 'undefined')})`
})

export const MutableHashSetAddTemplate = mutableMutation('MutableHashSetAdd', 'add')
export const MutableHashSetRemoveTemplate = mutableMutation('MutableHashSetRemove', 'remove')

export const MutableHashSetSizeTemplate = defineTemplate({
	modelId: 'MutableHashSetSize', version: '1.0.0', description: 'Returns the number of elements in a MutableHashSet.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { set: mutableHashSetInput('MutableHashSet to measure.', '{{A}}') },
	output: expressionOutput('MutableHashSet size.', { ts: 'number' }),
	source: `MutableHashSet.size(${marker('expression', 'set', 'MutableHashSet.empty()')})`
})

export const MutableHashSetClearTemplate = defineTemplate({
	modelId: 'MutableHashSetClear', version: '1.0.0', description: 'Removes all values from a MutableHashSet in place.',
	typeParameters: typeParameters(['A', 'Set element type.']),
	inputs: { set: mutableHashSetInput('MutableHashSet to clear.', '{{A}}') },
	output: expressionOutput('Mutation result.', { ts: 'void' }),
	source: `MutableHashSet.clear(${marker('expression', 'set', 'MutableHashSet.empty()')})`
})

export const effectHashSetGraphTemplateInputs = [
	HashSetEmptyTemplate,
	HashSetFromIterableTemplate,
	HashSetMakeTemplate,
	HashSetHasTemplate,
	HashSetSomeTemplate,
	HashSetEveryTemplate,
	HashSetIsSubsetTemplate,
	HashSetSizeTemplate,
	HashSetAddTemplate,
	HashSetRemoveTemplate,
	HashSetDifferenceTemplate,
	HashSetIntersectionTemplate,
	HashSetUnionTemplate,
	HashSetMapTemplate,
	HashSetReduceTemplate,
	HashSetFilterTemplate,
	MutableHashSetEmptyTemplate,
	MutableHashSetFromIterableTemplate,
	MutableHashSetMakeTemplate,
	MutableHashSetHasTemplate,
	MutableHashSetAddTemplate,
	MutableHashSetRemoveTemplate,
	MutableHashSetSizeTemplate,
	MutableHashSetClearTemplate
] satisfies readonly AnyEffectFamilyTemplateDefinitionInput[]
