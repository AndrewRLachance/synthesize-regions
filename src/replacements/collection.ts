import type { Replacement } from "../core/types.js";

const fragmentCollectionReplacements = new WeakSet<object>();

/** Tag a graph-produced replacement whose code represents an ordered fragment collection. */
export function markFragmentCollectionReplacement<T extends Replacement>(replacement: T): T {
  fragmentCollectionReplacements.add(replacement);
  return replacement;
}

/** Distinguish graph collection insertion from a public exact-one replacement. */
export function isFragmentCollectionReplacement(replacement: Replacement): boolean {
  return fragmentCollectionReplacements.has(replacement);
}
