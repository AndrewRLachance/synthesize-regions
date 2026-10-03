import { defineTemplate } from '../../../authoring/define-template.js'
import {
	type AnyDrizzleTemplateDefinitionInput,
	expressionInput,
	expressionOutput,
	marker,
	objectInput,
	tableInput
} from './drizzle-template-helpers.js'
import { schemaType } from '../../../authoring/effect-v4/effect-template-helpers.js'

const derivedSchema = (
	modelId: string,
	fn: 'createSelectSchema' | 'createInsertSchema' | 'createUpdateSchema',
	description: string
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	inputs: { table: expressionInput('Drizzle table, view, or enum supported by the selected derivation.') },
	output: expressionOutput('Derived Effect Schema.', schemaType()),
	source: `${fn}(${marker('expression', 'table', 'undefined')})`
})

const derivedSchemaWithOverrides = (
	modelId: string,
	fn: 'createSelectSchema' | 'createInsertSchema' | 'createUpdateSchema',
	description: string
) => defineTemplate({
	modelId,
	version: '1.0.0',
	description,
	inputs: {
		table: expressionInput('Drizzle table, view, or enum supported by the selected derivation.'),
		overrides: objectInput('Field-level Effect Schema overrides or refinement callbacks.')
	},
	output: expressionOutput('Customized derived Effect Schema.', schemaType()),
	source: `${fn}(${marker('expression', 'table', 'undefined')}, ${marker('expression', 'overrides', '{}')})`
})

export const DrizzleEffectSelectSchemaTemplate = derivedSchema(
	'DrizzleEffectSelectSchema',
	'createSelectSchema',
	'Derives an Effect Schema for values selected from a Drizzle table, view, or enum.'
)
export const DrizzleEffectInsertSchemaTemplate = derivedSchema(
	'DrizzleEffectInsertSchema',
	'createInsertSchema',
	'Derives an Effect Schema for insert payloads from a Drizzle table.'
)
export const DrizzleEffectUpdateSchemaTemplate = derivedSchema(
	'DrizzleEffectUpdateSchema',
	'createUpdateSchema',
	'Derives an Effect Schema for update payloads from a Drizzle table.'
)
export const DrizzleEffectSelectSchemaOverridesTemplate = derivedSchemaWithOverrides(
	'DrizzleEffectSelectSchemaOverrides',
	'createSelectSchema',
	'Derives a select Effect Schema with field-level overrides or refinements.'
)
export const DrizzleEffectInsertSchemaOverridesTemplate = derivedSchemaWithOverrides(
	'DrizzleEffectInsertSchemaOverrides',
	'createInsertSchema',
	'Derives an insert Effect Schema with field-level overrides or refinements.'
)
export const DrizzleEffectUpdateSchemaOverridesTemplate = derivedSchemaWithOverrides(
	'DrizzleEffectUpdateSchemaOverrides',
	'createUpdateSchema',
	'Derives an update Effect Schema with field-level overrides or refinements.'
)

export const drizzleEffectSchemaGraphTemplateInputs = [
	DrizzleEffectSelectSchemaTemplate,
	DrizzleEffectInsertSchemaTemplate,
	DrizzleEffectUpdateSchemaTemplate,
	DrizzleEffectSelectSchemaOverridesTemplate,
	DrizzleEffectInsertSchemaOverridesTemplate,
	DrizzleEffectUpdateSchemaOverridesTemplate
] satisfies ReadonlyArray<AnyDrizzleTemplateDefinitionInput>
