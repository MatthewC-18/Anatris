// src/data/trackByRegion.ts
//
// Central registry mapping a region id (as held in the anatomy store's
// `region` field, aligned with regiones.ts) to that region's 7-phase
// pedagogical track. PhaseTrack looks the active region up here instead of
// hard-coding a single region's track.
//
// FREE content is bundled; PREMIUM content arrives at runtime from the
// entitlement-checked `content` edge function (see data/premiumStore.ts).

import type { RegionTrack } from '../types/pedagogy';
import { SHOULDER_TRACK } from './shoulderPhases';
import { premiumTrack } from './premiumStore';

/**
 * The FREE regions' tracks, statically bundled.
 *
 * Do NOT add a premium region here — that would put the paid library back into
 * the public bundle.
 */
export const TRACK_BY_REGION: Record<string, RegionTrack> = {
  shoulder: SHOULDER_TRACK,
};

/**
 * Resolve the pedagogical track for the active region. Falls back to the
 * shoulder track when no region is set or the region's content has not
 * arrived, preserving the previous default.
 *
 * @param region the store's current region id (null = whole body)
 */
export function trackForRegion(region: string | null): RegionTrack {
  if (!region) return SHOULDER_TRACK;
  return TRACK_BY_REGION[region] ?? premiumTrack(region) ?? SHOULDER_TRACK;
}
