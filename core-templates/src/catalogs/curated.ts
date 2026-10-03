import { createTemplateRegistry } from 'synthesize-regions'
import type { GraphTemplateDefinition, GraphTemplateManifest, TemplateRegistry } from 'synthesize-regions'
import { effectApplicationGraphTemplateInputs } from '../packs/effect-v4/application/effect-application-templates.js'
import { effectConcurrencyGraphTemplateInputs } from '../packs/effect-v4/concurrency/effect-concurrency-templates.js'
import { effectConfigV4GraphTemplateInputs } from '../packs/effect-v4/config/effect-config-templates.js'
import { effectCoordinationGraphTemplateInputs } from '../packs/effect-v4/concurrency/effect-coordination-templates.js'
import { effectErrorGraphTemplateInputs } from '../packs/effect-v4/errors/effect-error-management-v4-templates.js'
import { effectEsToolkitGraphTemplateInputs } from '../packs/effect-v4/es-toolkit/effect-es-toolkit-templates.js'
import { effectObservabilityGraphTemplateInputs } from '../packs/effect-v4/observability/effect-observability-v4-templates.js'
import { effectResourceGraphTemplateInputs } from '../packs/effect-v4/resources/effect-resource-templates.js'
import { effectScheduleGraphTemplateInputs } from '../packs/effect-v4/schedule/effect-schedule-templates.js'
import { effectSchemaGraphTemplateInputs } from '../packs/effect-v4/schema/effect-schema-templates.js'
import { effectServiceLayerGraphTemplateInputs } from '../packs/effect-v4/layer/effect-service-layer-templates.js'
import { effectStreamV4GraphTemplateInputs } from '../packs/effect-v4/stream/effect-stream-v4-templates.js'
import { effectGraphTemplateInputs } from '../packs/effect-v4/core/effect-ts.js'
import { effectV4TestingFoundationalGraphTemplateInputs } from '../packs/effect-v4/testing/effect-v4-testing-foundational-templates.js'
import { effectWorkflowGraphTemplateInputs } from '../packs/effect-v4/workflow/effect-workflow-templates.js'
import { esToolkitGraphTemplateInputs } from '../packs/es-toolkit/es-toolkit-templates.js'
import { basePatternGraphTemplateInputs } from '../packs/base/e-samplesBasePatterns.js'

/** One named slice of the curated core-template catalog. */
export interface CoreTemplateFamily {
	/** Stable family label used in reports and catalog listings. */
	readonly family: string
	/** Stable historical provenance label for the private leaf module. */
	readonly module: string
	/** Templates contributed by that module, in declaration order. */
	readonly templates: readonly GraphTemplateDefinition<any, string, any>[]
}

/**
 * The curated core-template catalog, in the order the README presents it.
 *
 * Every entry names one private leaf module and the single array it
 * contributes. Membership is explicit and is never inferred by scanning the
 * package tree.
 */
export const coreTemplateFamilies: readonly CoreTemplateFamily[] = [
	{
		family: 'base-patterns',
		module: 'e-samplesBasePatterns',
		templates: basePatternGraphTemplateInputs
	},
	{
		family: 'concurrency',
		module: 'effect-concurrency-templates',
		templates: effectConcurrencyGraphTemplateInputs
	},
	{
		family: 'coordination',
		module: 'effect-coordination-templates',
		templates: effectCoordinationGraphTemplateInputs
	},
	{
		family: 'effect-es-toolkit',
		module: 'effect-es-toolkit-templates',
		templates: effectEsToolkitGraphTemplateInputs
	},
	{
		family: 'resource',
		module: 'effect-resource-templates',
		templates: effectResourceGraphTemplateInputs
	},
	{
		family: 'schema',
		module: 'effect-schema-templates',
		templates: effectSchemaGraphTemplateInputs
	},
	{
		family: 'stream',
		module: 'effect-stream-v4-templates',
		templates: effectStreamV4GraphTemplateInputs
	},
	{
		family: 'testing',
		module: 'effect-v4-testing-foundational-templates',
		templates: effectV4TestingFoundationalGraphTemplateInputs
	},
	{
		family: 'workflow',
		module: 'effect-workflow-templates',
		templates: effectWorkflowGraphTemplateInputs
	},
	{
		family: 'application',
		module: 'effect-application-templates',
		templates: effectApplicationGraphTemplateInputs
	},
	{
		family: 'config',
		module: 'effect-config-templates',
		templates: effectConfigV4GraphTemplateInputs
	},
	{
		family: 'error',
		module: 'effect-error-management-v4-templates',
		templates: effectErrorGraphTemplateInputs
	},
	{
		family: 'observability',
		module: 'effect-observability-v4-templates',
		templates: effectObservabilityGraphTemplateInputs
	},
	{
		family: 'schedule',
		module: 'effect-schedule-templates',
		templates: effectScheduleGraphTemplateInputs
	},
	{
		family: 'service-layer',
		module: 'effect-service-layer-templates',
		templates: effectServiceLayerGraphTemplateInputs
	},
	{
		family: 'effect',
		module: 'effect-ts',
		templates: effectGraphTemplateInputs
	},
	{
		family: 'es-toolkit',
		module: 'es-toolkit-templates',
		templates: esToolkitGraphTemplateInputs
	}
]

/**
 * Build one validated registry over the whole curated catalog.
 *
 * Registration revalidates every family together, so a `modelId` collision
 * across families throws `TemplateCatalogValidationError` here instead of
 * silently producing a catalog that drops templates.
 */
export function createCoreTemplateRegistry(): TemplateRegistry {
	return createTemplateRegistry(coreTemplateFamilies.flatMap(family => family.templates))
}

/** Reduce one definition to its declarative manifest, dropping executable members. */
function manifestOf(definition: GraphTemplateDefinition<any, string, any>): GraphTemplateManifest<any, string, any, any> {
	return {
		modelId: definition.modelId,
		...(definition.version === undefined ? {} : { version: definition.version }),
		...(definition.description === undefined ? {} : { description: definition.description }),
		...(definition.typeParameters === undefined ? {} : { typeParameters: definition.typeParameters }),
		...(definition.callableScope === undefined ? {} : { callableScope: definition.callableScope }),
		...(definition.importRequirements === undefined ? {} : { importRequirements: definition.importRequirements }),
		inputs: definition.inputs,
		output: definition.output,
		source: definition.source
	}
}

/**
 * Export the curated catalog as declarative manifests sorted by `modelId`.
 *
 * Definitions carry `manifestDigest`, `invoke`, and `invokePartial`, none of
 * which belong in an exported catalog, so each entry is reduced to its
 * manifest fields. Pass an existing registry to reuse one validation pass.
 */
export function coreTemplateManifests(
	registry: TemplateRegistry = createCoreTemplateRegistry()
): readonly GraphTemplateManifest<any, string, any, any>[] {
	return registry.snapshot().list().map(manifestOf)
}
