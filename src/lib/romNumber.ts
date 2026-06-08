// src/lib/romNumber.ts
//
// Single source of truth for the STABLE NUMBER assigned to each muscle that is
// active in a ROM highlight. Both the ROM panel (chips/list) and the 3D pins
// import this, so the "3" a student sees on a chip is the same "3" floating on
// the muscle in the 3D scene -- guaranteed, with nothing passed through props
// across the Sidebar/Canvas boundary.
//
// WHY ANATOMICAL ORDER, NOT ROLE ORDER:
// The number is a LOCATOR ("which of these violet stabilizers is which?"), not
// a ranking. Role is already encoded by color. If we numbered by role, a muscle
// could be "1" in one phase and "3" in another (its role changes across the
// arc), destroying the mental anchor exactly when the student needs it. By
// numbering in the fixed order muscles appear in the active region's muscle
// array, a given muscle keeps a consistent-feeling number across phases and
// movements.
//
// REGION-AWARE: the anatomical order depends on the ACTIVE region's muscle
// array, which the caller passes in (shoulder vs elbow vs ...). This keeps this
// module pure (no store / no region data import) and guarantees the panel and
// the 3D pins number identically as long as both pass the same region array.
//
// The number is 1-based and assigned only among the muscles present in the
// current highlight, sorted by their index in the provided region array.
// Unknown ids (not in that array) are pushed to the end in a stable way.

import type { Muscle } from '../types/muscle';

/**
 * Given the set of muscle ids active in a ROM highlight and the active region's
 * muscle array (for anatomical order), return a stable map
 * muscleId -> display number (1-based), ordered by anatomical position.
 */
export function buildRomNumbering(
  muscleIds: Iterable<string>,
  regionMuscles: Muscle[],
): Map<string, number> {
  // Build muscleId -> anatomical order index from the region array.
  const orderIndex = new Map<string, number>();
  regionMuscles.forEach((m, i) => orderIndex.set(m.id, i));

  const ids = Array.from(new Set(muscleIds));
  ids.sort((a, b) => {
    const ia = orderIndex.has(a) ? orderIndex.get(a)! : Number.MAX_SAFE_INTEGER;
    const ib = orderIndex.has(b) ? orderIndex.get(b)! : Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    // Tie-break (both unknown) alphabetically, for determinism.
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const out = new Map<string, number>();
  ids.forEach((id, i) => out.set(id, i + 1));
  return out;
}
