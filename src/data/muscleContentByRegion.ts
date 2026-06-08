// src/data/muscleContentByRegion.ts
//
// Central registry mapping a region id (as held in the anatomy store's
// `region` field, aligned with regiones.ts) to that region's muscle content
// index. Components that show clinical content (e.g. SelectionPanel) look up
// the active region here instead of hard-coding a single region's index.
//
// Adding a new region = add its MuscleContentIndex import + one entry here.

import type { MuscleContentIndex } from '../types/muscleContent';
import { SHOULDER_MUSCLES } from './shoulderMuscles';
import { ELBOW_MUSCLES } from './elbowMuscles';
import { KNEE_MUSCLES } from './kneeMuscles';

/** region id -> muscle content index. Keys match regiones.ts / store.region. */
export const MUSCLE_CONTENT_BY_REGION: Record<string, MuscleContentIndex> = {
  shoulder: SHOULDER_MUSCLES,
  elbow: ELBOW_MUSCLES,
  knee: KNEE_MUSCLES,
};

/**
 * Resolve the muscle content index for the active region. Falls back to the
 * shoulder index when no region is set (whole-body / initial boot), preserving
 * the previous behaviour where the panel always read SHOULDER_MUSCLES.
 *
 * @param region the store's current region id (null = whole body)
 */
export function muscleContentForRegion(
  region: string | null,
): MuscleContentIndex {
  if (region && MUSCLE_CONTENT_BY_REGION[region]) {
    return MUSCLE_CONTENT_BY_REGION[region];
  }
  return SHOULDER_MUSCLES;
}
