// src/data/muscleContentByRegion.ts
//
// Central registry mapping a region id (as held in the anatomy store's
// `region` field, aligned with regiones.ts) to that region's muscle content
// index. Components that show clinical content (e.g. SelectionPanel) look up
// the active region here instead of hard-coding a single region's index.
//
// FREE content is bundled; PREMIUM content arrives at runtime from the
// entitlement-checked `content` edge function (see data/premiumStore.ts).

import type { MuscleContentIndex } from '../types/muscleContent';
import { SHOULDER_MUSCLES } from './shoulderMuscles';
import { premiumContent } from './premiumStore';

/**
 * The FREE regions' content indexes, statically bundled.
 *
 * Do NOT add a premium region here — that would put the paid library back into
 * the public bundle.
 */
export const MUSCLE_CONTENT_BY_REGION: Record<string, MuscleContentIndex> = {
  shoulder: SHOULDER_MUSCLES,
};

/** Shared empty index for regions with no content available. */
const NO_CONTENT: MuscleContentIndex = {};

/**
 * Resolve the muscle content index for the active region.
 *
 * A region whose content is not available gets an EMPTY index, NOT the
 * shoulder's. An older fallback returned SHOULDER_MUSCLES for any unknown
 * region, so any muscle whose id exists in both places rendered the shoulder's
 * clinical card while the user was studying another region -- `levator-scapulae`
 * did exactly that in cervical, which is a PAID region showing the free
 * region's content. Callers already handle a missing entry by falling back to
 * the muscle's own fields (SelectionPanel's BasicDetail), so an empty index
 * degrades correctly.
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
  return MUSCLE_CONTENT_BY_REGION[region] ?? premiumContent(region) ?? NO_CONTENT;
}
