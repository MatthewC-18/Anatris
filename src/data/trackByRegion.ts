// src/data/trackByRegion.ts
//
// Central registry mapping a region id (as held in the anatomy store's
// `region` field, aligned with regiones.ts) to that region's 7-phase
// pedagogical track. PhaseTrack looks the active region up here instead of
// hard-coding a single region's track.
//
// Adding a new region = add its RegionTrack import + one entry here.

import type { RegionTrack } from '../types/pedagogy';
import { SHOULDER_TRACK } from './shoulderPhases';
import { ELBOW_TRACK } from './elbowPhases';
import { CERVICAL_TRACK } from './cervicalPhases';
import { THORACIC_TRACK } from './thoracicPhases';
import { LUMBAR_TRACK } from './lumbarPhases';
import { KNEE_TRACK } from './kneePhases';

/** region id -> pedagogical track. Keys match regiones.ts / store.region. */
export const TRACK_BY_REGION: Record<string, RegionTrack> = {
  shoulder: SHOULDER_TRACK,
  elbow: ELBOW_TRACK,
  cervical: CERVICAL_TRACK,
  thoracic: THORACIC_TRACK,
  lumbar: LUMBAR_TRACK,
  knee: KNEE_TRACK,
};

/**
 * Resolve the pedagogical track for the active region. Falls back to the
 * shoulder track when no region is set, preserving the previous default.
 *
 * @param region the store's current region id (null = whole body)
 */
export function trackForRegion(region: string | null): RegionTrack {
  if (region && TRACK_BY_REGION[region]) {
    return TRACK_BY_REGION[region];
  }
  return SHOULDER_TRACK;
}
