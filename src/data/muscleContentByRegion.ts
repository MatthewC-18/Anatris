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
import { HIP_MUSCLES } from './hipMuscleContent';
import { KNEE_MUSCLES } from './kneeMuscles';
import { ANKLE_MUSCLES } from './ankleMuscleContent';
import {
  CERVICAL_MUSCLES,
  THORACIC_MUSCLES,
  LUMBAR_MUSCLES,
} from './spineMuscleContent';

/** region id -> muscle content index. Keys match regiones.ts / store.region. */
export const MUSCLE_CONTENT_BY_REGION: Record<string, MuscleContentIndex> = {
  shoulder: SHOULDER_MUSCLES,
  elbow: ELBOW_MUSCLES,
  hip: HIP_MUSCLES,
  knee: KNEE_MUSCLES,
  ankle: ANKLE_MUSCLES,
  cervical: CERVICAL_MUSCLES,
  thoracic: THORACIC_MUSCLES,
  lumbar: LUMBAR_MUSCLES,
};

/** Shared empty index for regions with no rich content authored yet. */
const NO_CONTENT: MuscleContentIndex = {};

/**
 * Resolve the muscle content index for the active region.
 *
 * A region that is NOT in the registry above gets an EMPTY index, not the
 * shoulder's. The old fallback returned SHOULDER_MUSCLES for any unknown region,
 * so any muscle whose id exists in both places rendered the shoulder's clinical
 * card while the user was studying another region -- `levator-scapulae` did
 * exactly that in cervical, which is a PAID region showing the free region's
 * content. Callers already handle a missing entry by falling back to the
 * muscle's own fields (SelectionPanel's BasicDetail), so an empty index degrades
 * correctly. As of the spine content pass all eight anatomical regions are
 * registered, so the empty path is only a safety net.
 *
 * Only the null region (whole-body / initial boot) still defaults to the
 * shoulder, which is the app's default region anyway.
 *
 * @param region the store's current region id (null = whole body)
 */
export function muscleContentForRegion(
  region: string | null,
): MuscleContentIndex {
  if (region == null) return SHOULDER_MUSCLES;
  return MUSCLE_CONTENT_BY_REGION[region] ?? NO_CONTENT;
}
