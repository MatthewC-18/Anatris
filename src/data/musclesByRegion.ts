// src/data/musclesByRegion.ts
//
// Central registry mapping a region id (store.region) to that region's muscle
// list. Components (MuscleList, AnatomyModel, RomPanel, RomMuscleMarkers) look
// the active region up here instead of importing each region's data directly
// and rebuilding the map locally (which caused the recurring "stale state /
// forgotten site" bug). Exact mirror of romByRegion.ts.
//
// FREE content is bundled; PREMIUM content arrives at runtime from the
// entitlement-checked `content` edge function (see data/premiumStore.ts).

import type { Muscle } from '../types/muscle';
import { shoulderMuscles } from './muscles/shoulder';
import { premiumMuscles, premiumRomLookupMuscles } from './premiumStore';

/**
 * The FREE regions' muscle lists, statically bundled.
 *
 * Do NOT add a premium region here — that would put the paid library back into
 * the public bundle.
 */
export const MUSCLES_BY_REGION: Record<string, Muscle[]> = {
  shoulder: shoulderMuscles,
};

/**
 * Resolve the muscle list for the active region. Falls back to the shoulder
 * list when no region is set or the region's content has not arrived,
 * preserving the components' previous default.
 *
 * @param region the store's current region id (null = whole body)
 */
export function musclesForRegion(region: string | null): Muscle[] {
  if (!region) return shoulderMuscles;
  return MUSCLES_BY_REGION[region] ?? premiumMuscles(region) ?? shoulderMuscles;
}

/**
 * Muscle universe for resolving the NAMES of muscles that participate in a ROM
 * movement (the ROM phase chips), as opposed to the anatomical muscle LIST of a
 * region (which stays `musclesForRegion`).
 *
 * They differ for the spine: a thoracic movement (e.g. rotation) legitimately
 * recruits the abdominal wall, which lives in the lumbar sub-region. Those
 * "guest" muscles must light up in 3D AND show their proper Spanish name in the
 * ROM panel, even though they are not part of the active sub-region's anatomy
 * list.
 *
 * The spine is entirely premium, so that whole-spine union is resolved at BUILD
 * time and shipped inside the region's payload (`romLookupMuscles`). The
 * runtime therefore never needs a sibling region loaded to render this one.
 *
 * @param region the store's current region id (null = whole body)
 */
export function musclesForRomLookup(region: string | null): Muscle[] {
  if (!region) return shoulderMuscles;
  return (
    MUSCLES_BY_REGION[region] ??
    premiumRomLookupMuscles(region) ??
    premiumMuscles(region) ??
    shoulderMuscles
  );
}
