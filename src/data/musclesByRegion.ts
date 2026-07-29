// src/data/musclesByRegion.ts
//
// Central registry mapping a region id (store.region) to that region's muscle
// list. Components (MuscleList, AnatomyModel, RomPanel, RomMuscleMarkers) look
// the active region up here instead of importing each region's data directly
// and rebuilding the map locally (which caused the recurring "stale state /
// forgotten site" bug). Exact mirror of romByRegion.ts.
//
// Adding a new region = import its muscle array and add one entry.

import type { Muscle } from '../types/muscle';
import { shoulderMuscles } from './muscles/shoulder';
import { elbowMuscles } from './muscles/elbow';
import { hipMuscles } from './muscles/hip';
import { kneeMuscles } from './muscles/knee';
import { ankleMuscles } from './muscles/ankle';
import {
  cervicalMuscles,
  thoracicMuscles,
  lumbarMuscles,
} from './muscles/spine';

// The anterolateral abdominal wall + quadratus lumborum flex / side-bend / rotate
// the WHOLE trunk, so the THORACIC ROM (thoracic-flexion / lateral-flexion /
// rotation) cites them as movers. They are authored once in lumbarMuscles; share
// those exact records into the thoracic resolver so their glow/markers resolve
// (audit fix: without this, thoracic ROM referenced muscle ids absent from the
// thoracic list and the highlight silently no-oped).
const THORACIC_SHARED_TRUNK = new Set([
  'rectus-abdominis',
  'external-oblique',
  'internal-oblique',
  'quadratus-lumborum',
]);
const thoracicSharedTrunkMuscles = lumbarMuscles.filter((m) =>
  THORACIC_SHARED_TRUNK.has(m.id),
);

/** region id -> muscles. Keys match regiones.ts / store.region. */
export const MUSCLES_BY_REGION: Record<string, Muscle[]> = {
  shoulder: shoulderMuscles,
  elbow: elbowMuscles,
  hip: hipMuscles,
  knee: kneeMuscles,
  ankle: ankleMuscles,
  cervical: cervicalMuscles,
  thoracic: [...thoracicMuscles, ...thoracicSharedTrunkMuscles],
  lumbar: lumbarMuscles,
};

/**
 * Resolve the muscle list for the active region. Falls back to the shoulder
 * list when no region is set, preserving the components' previous default.
 *
 * @param region the store's current region id (null = whole body)
 */
export function musclesForRegion(region: string | null): Muscle[] {
  if (region && MUSCLES_BY_REGION[region]) {
    return MUSCLES_BY_REGION[region];
  }
  return shoulderMuscles;
}

/** The three spine sub-regions, which together form one continuous chain. */
const SPINE_REGION_IDS = new Set(['cervical', 'thoracic', 'lumbar']);

/** Every muscle of the whole spine, across all three sub-regions. */
const ALL_SPINE_MUSCLES: Muscle[] = [
  ...cervicalMuscles,
  ...thoracicMuscles,
  ...lumbarMuscles,
];

/**
 * Muscle universe for resolving the NAMES of muscles that participate in a ROM
 * movement (the ROM phase chips), as opposed to the anatomical muscle LIST of a
 * region (which stays `musclesForRegion`).
 *
 * They differ for the spine: a thoracic movement (e.g. rotation) legitimately
 * recruits the abdominal wall, which lives in the lumbar sub-region. Those
 * "guest" muscles must light up in 3D AND show their proper Spanish name in the
 * ROM panel, even though they are not part of the active sub-region's anatomy
 * list. So for any spine sub-region we return the WHOLE spine; otherwise we
 * behave exactly like musclesForRegion.
 *
 * @param region the store's current region id (null = whole body)
 */
export function musclesForRomLookup(region: string | null): Muscle[] {
  if (region && SPINE_REGION_IDS.has(region)) {
    return ALL_SPINE_MUSCLES;
  }
  return musclesForRegion(region);
}
