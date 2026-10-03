import type { AnyEffectFamilyTemplateDefinitionInput } from '../authoring/effect-v4/index.js'
import { allBaseGraphTemplateInputs } from '../packs/base/index.js'
import { esToolkitGraphTemplateInputs } from '../packs/es-toolkit/index.js'
import { effectV4AiGraphTemplateInputs } from '../packs/effect-v4/ai/index.js'
import { effectV4ApplicationGraphTemplateInputs } from '../packs/effect-v4/application/index.js'
import { effectV4BatchingGraphTemplateInputs } from '../packs/effect-v4/batching/index.js'
import { effectV4CacheGraphTemplateInputs } from '../packs/effect-v4/cache/index.js'
import { effectV4ChildProcessGraphTemplateInputs } from '../packs/effect-v4/child-process/index.js'
import { effectV4CliGraphTemplateInputs } from '../packs/effect-v4/cli/index.js'
import { effectV4ClusterGraphTemplateInputs } from '../packs/effect-v4/cluster/index.js'
import { effectV4ConcurrencyGraphTemplateInputs } from '../packs/effect-v4/concurrency/index.js'
import { effectV4ConfigGraphTemplateInputs } from '../packs/effect-v4/config/index.js'
import { effectV4CoreGraphTemplateInputs } from '../packs/effect-v4/core/index.js'
import { effectV4DataGraphTemplateInputs } from '../packs/effect-v4/data/index.js'
import { effectV4DatetimeGraphTemplateInputs } from '../packs/effect-v4/datetime/index.js'
import { effectV4ErrorsGraphTemplateInputs } from '../packs/effect-v4/errors/index.js'
import { effectV4EsToolkitGraphTemplateInputs } from '../packs/effect-v4/es-toolkit/index.js'
import { effectV4EventlogGraphTemplateInputs } from '../packs/effect-v4/eventlog/index.js'
import { effectV4HttpGraphTemplateInputs } from '../packs/effect-v4/http/index.js'
import { effectV4LayerGraphTemplateInputs } from '../packs/effect-v4/layer/index.js'
import { effectV4ObservabilityGraphTemplateInputs } from '../packs/effect-v4/observability/index.js'
import { effectV4OpenapiGraphTemplateInputs } from '../packs/effect-v4/openapi/index.js'
import { effectV4PlatformGraphTemplateInputs } from '../packs/effect-v4/platform/index.js'
import { effectV4ResilienceGraphTemplateInputs } from '../packs/effect-v4/resilience/index.js'
import { effectV4ResourcesGraphTemplateInputs } from '../packs/effect-v4/resources/index.js'
import { effectV4RpcGraphTemplateInputs } from '../packs/effect-v4/rpc/index.js'
import { effectV4RuntimeGraphTemplateInputs } from '../packs/effect-v4/runtime/index.js'
import { effectV4ScheduleGraphTemplateInputs } from '../packs/effect-v4/schedule/index.js'
import { effectV4SchemaGraphTemplateInputs } from '../packs/effect-v4/schema/index.js'
import { effectV4SecurityGraphTemplateInputs } from '../packs/effect-v4/security/index.js'
import { effectV4SocketGraphTemplateInputs } from '../packs/effect-v4/socket/index.js'
import { effectV4SqlGraphTemplateInputs } from '../packs/effect-v4/sql/index.js'
import { effectV4StmGraphTemplateInputs } from '../packs/effect-v4/stm/index.js'
import { effectV4StreamGraphTemplateInputs } from '../packs/effect-v4/stream/index.js'
import { effectV4TestingGraphTemplateInputs } from '../packs/effect-v4/testing/index.js'
import { effectV4WorkflowGraphTemplateInputs } from '../packs/effect-v4/workflow/index.js'

/** One explicitly owned slice of the canonical Effect v4 catalog. */
export interface EffectV4TemplatePack {
	readonly id: string
	readonly templates: readonly AnyEffectFamilyTemplateDefinitionInput[]
}

/**
 * Single source of truth for canonical catalog membership and ordering.
 * Filesystem scanning is intentionally excluded from runtime catalog assembly.
 */
export const effectV4TemplatePacks: readonly EffectV4TemplatePack[] = [
	{ id: 'base', templates: allBaseGraphTemplateInputs },
	{ id: 'ai', templates: effectV4AiGraphTemplateInputs },
	{ id: 'application', templates: effectV4ApplicationGraphTemplateInputs },
	{ id: 'batching', templates: effectV4BatchingGraphTemplateInputs },
	{ id: 'cache', templates: effectV4CacheGraphTemplateInputs },
	{ id: 'child-process', templates: effectV4ChildProcessGraphTemplateInputs },
	{ id: 'cli', templates: effectV4CliGraphTemplateInputs },
	{ id: 'cluster', templates: effectV4ClusterGraphTemplateInputs },
	{ id: 'concurrency', templates: effectV4ConcurrencyGraphTemplateInputs },
	{ id: 'config', templates: effectV4ConfigGraphTemplateInputs },
	{ id: 'core', templates: effectV4CoreGraphTemplateInputs },
	{ id: 'data', templates: effectV4DataGraphTemplateInputs },
	{ id: 'datetime', templates: effectV4DatetimeGraphTemplateInputs },
	{ id: 'errors', templates: effectV4ErrorsGraphTemplateInputs },
	{ id: 'es-toolkit', templates: effectV4EsToolkitGraphTemplateInputs },
	{ id: 'eventlog', templates: effectV4EventlogGraphTemplateInputs },
	{ id: 'http', templates: effectV4HttpGraphTemplateInputs },
	{ id: 'layer', templates: effectV4LayerGraphTemplateInputs },
	{ id: 'observability', templates: effectV4ObservabilityGraphTemplateInputs },
	{ id: 'openapi', templates: effectV4OpenapiGraphTemplateInputs },
	{ id: 'platform', templates: effectV4PlatformGraphTemplateInputs },
	{ id: 'resilience', templates: effectV4ResilienceGraphTemplateInputs },
	{ id: 'resources', templates: effectV4ResourcesGraphTemplateInputs },
	{ id: 'rpc', templates: effectV4RpcGraphTemplateInputs },
	{ id: 'runtime', templates: effectV4RuntimeGraphTemplateInputs },
	{ id: 'schedule', templates: effectV4ScheduleGraphTemplateInputs },
	{ id: 'schema', templates: effectV4SchemaGraphTemplateInputs },
	{ id: 'security', templates: effectV4SecurityGraphTemplateInputs },
	{ id: 'socket', templates: effectV4SocketGraphTemplateInputs },
	{ id: 'sql', templates: effectV4SqlGraphTemplateInputs },
	{ id: 'stm', templates: effectV4StmGraphTemplateInputs },
	{ id: 'stream', templates: effectV4StreamGraphTemplateInputs },
	{ id: 'testing', templates: effectV4TestingGraphTemplateInputs },
	{ id: 'workflow', templates: effectV4WorkflowGraphTemplateInputs },
	{ id: 'es-toolkit-standalone', templates: esToolkitGraphTemplateInputs }
]
