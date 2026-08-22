import type { GenerateOptions, ReplacementRegion } from "../core/types.js";

/** Private option key for immutable regions validated when a template was defined. */
const PREVALIDATED_REGIONS = Symbol("synthesize-regions.prevalidated-regions");

interface PrevalidatedRegionBinding {
  readonly sourceText: string;
  readonly regions: readonly ReplacementRegion[];
}

type RegionAwareOptions = GenerateOptions & {
  readonly [PREVALIDATED_REGIONS]?: PrevalidatedRegionBinding;
};

/** Attach already validated template regions without changing public option keys. */
export function bindPrevalidatedRegions<TOptions extends GenerateOptions>(
  options: TOptions,
  sourceText: string,
  regions: readonly ReplacementRegion[]
): TOptions {
  const bound = { ...options } as TOptions & { [PREVALIDATED_REGIONS]?: PrevalidatedRegionBinding };
  Object.defineProperty(bound, PREVALIDATED_REGIONS, {
    configurable: false,
    enumerable: true,
    writable: false,
    value: { sourceText, regions }
  });
  return bound;
}

/** Read regions only when they remain attached to the exact authored source. */
export function prevalidatedRegionsFor(
  options: GenerateOptions,
  sourceText: string
): readonly ReplacementRegion[] | undefined {
  const binding = (options as RegionAwareOptions)[PREVALIDATED_REGIONS];
  return binding?.sourceText === sourceText ? binding.regions : undefined;
}

