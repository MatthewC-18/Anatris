// src/lib/peelOrder.ts
//
// Defines the anatomical "peel" order for the depth slider, from most
// superficial (outside the body) to deepest (the skeleton). The depth slider
// in the Sidebar writes directly into the store's `activeLayers` using this
// order, so there is a single source of truth for visibility: peeling is just
// a guided way of toggling the same layers the checkboxes control.
//
// `reference` and `uncategorized` are intentionally excluded: they are not
// physical body layers, so they keep their own independent checkbox.

import type { AnatomyLayer } from '../types/anatomy';

/**
 * Layers ordered superficial -> deep. Index = how "outer" a layer is.
 * Peeling to level N hides everything with an index < N and shows the rest.
 */
export const PEEL_ORDER: AnatomyLayer[] = [
  'skin',
  'organs',
  'vessels',
  'nerves',
  'muscles',
  'ligaments',
  'bones',
];

/** Short Spanish caption shown under the slider for each depth level. */
export const PEEL_LEVEL_LABELS: string[] = [
  'Piel y todo',          // 0: nothing peeled
  'Bajo la piel',         // 1: skin off
  'Sin órganos',          // 2
  'Sin vasos',            // 3
  'Sistema nervioso',     // 4
  'Solo músculos',        // 5: muscles + ligaments + bones
  'Cápsula y ligamentos', // 6: ligaments + bones
  'Solo esqueleto',       // 7: bones only
];

/** Number of slider stops (0..PEEL_MAX inclusive). */
export const PEEL_MAX = PEEL_ORDER.length; // 7

/**
 * Given the set of currently active layers, infer which peel level best
 * matches it. We find the shallowest layer in PEEL_ORDER that is still active;
 * everything before it is hidden, so the level equals that layer's index.
 * If no peel layer is active at all, we are at the deepest level (PEEL_MAX).
 *
 * This lets the slider position be DERIVED from real state instead of stored
 * separately, so manual checkbox edits never make the slider lie.
 */
export function inferPeelLevel(active: Set<AnatomyLayer>): number {
  for (let i = 0; i < PEEL_ORDER.length; i++) {
    if (active.has(PEEL_ORDER[i])) return i;
  }
  return PEEL_MAX;
}

/**
 * Compute the desired on/off state for each peelable layer at a given level.
 * Layers with index >= level are ON; layers with index < level are OFF.
 * Returns an array of [layer, on] pairs for the caller to apply.
 */
export function layersForPeelLevel(
  level: number,
): Array<[AnatomyLayer, boolean]> {
  return PEEL_ORDER.map((layer, i) => [layer, i >= level]);
}