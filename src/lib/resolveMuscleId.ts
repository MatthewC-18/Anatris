// src/lib/resolveMuscleId.ts
//
// Maps a clicked mesh name (Z-Anatomy flattened, e.g. "Supraspinatus_muscler",
// "Supraspinatus_muscleol", "Clavicular_part_of_deltoid_muscle") to a stable
// muscleId used as the key in the content index (e.g. "supraspinatus").
//
// Strategy:
//   1. Strip Z-Anatomy technical suffixes/markers from the mesh name to get a
//      clean base token (side r/l, origin/end markers o/o1/e/e1, tendon _1,
//      instance suffixes, trailing group letters).
//   2. Normalize to a lowercase, accent-free, underscore-collapsed slug.
//   3. Look the slug up against a table of known shoulder muscles, matching by
//      the most specific alias first (so "clavicular_part_of_deltoid" maps to
//      the deltoid before a generic "deltoid" rule would).
//
// Returns null when no known muscle matches — the caller then shows the raw
// anatomy entry without clinical content.

/** Known muscleId -> list of name fragments (already slugified) that map to it.
 *  Order within the array doesn't matter; longer/more specific keys across the
 *  whole table are tried first (see buildMatchers).
 *
 *  IMPORTANT: use the FULL muscle slug as the alias, never a generic stem.
 *    - "teres_minor" (NOT "teres") so the redondo mayor (teres_major), which
 *      is NOT part of the cuff, never resolves to teres_minor.
 *    - "subscapularis" is distinct from "scapula", so no clash there. */
const MUSCLE_ALIASES: Record<string, string[]> = {
  supraspinatus: ['supraspinatus'],
  infraspinatus: ['infraspinatus'],
  teres_minor: ['teres_minor'],
  subscapularis: ['subscapularis'],
  // Future shoulder muscles go here as content is authored, e.g.:
  // deltoid: ['deltoid', 'clavicular_part_of_deltoid', 'acromial_part_of_deltoid', 'spinal_part_of_deltoid'],
};

/** Suffix/marker patterns appended by Z-Anatomy to a muscle's base name. */
const MESH_NOISE = [
  /_\d+$/, // tendon/extra parts: _1, _2
  /_instance_\d+$/, // instanced copies
  /(o\d*|e\d*)(l|r)?$/, // origin/end markers with optional side: ol, or, o1l, e2r, e, o
  /(l|r)$/, // trailing side letter
];

/** Turn any string into a comparable slug: lowercase, no accents, underscores. */
function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Strip Z-Anatomy noise from a mesh name and slugify the remainder. */
function baseSlugFromMesh(meshName: string): string {
  let s = meshName;
  // Remove a leading/embedded "_muscle" token's trailing markers carefully:
  // first peel known noise suffixes iteratively.
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of MESH_NOISE) {
      const next = s.replace(re, '');
      if (next !== s) {
        s = next;
        changed = true;
      }
    }
  }
  return slugify(s);
}

// Precompute matchers sorted by specificity (longest alias slug first) so a
// more specific alias wins over a generic one.
interface Matcher {
  muscleId: string;
  aliasSlug: string;
}
const MATCHERS: Matcher[] = Object.entries(MUSCLE_ALIASES)
  .flatMap(([muscleId, aliases]) =>
    aliases.map((a) => ({ muscleId, aliasSlug: slugify(a) })),
  )
  .sort((a, b) => b.aliasSlug.length - a.aliasSlug.length);

/**
 * Resolve a mesh name to a known muscleId, or null if none matches.
 * Matching is substring-based on the cleaned slug so that, e.g.,
 * "clavicular_part_of_deltoid_muscle" contains "deltoid".
 */
export function resolveMuscleId(meshName: string): string | null {
  const base = baseSlugFromMesh(meshName);
  if (!base) return null;
  for (const m of MATCHERS) {
    if (base.includes(m.aliasSlug)) return m.muscleId;
  }
  return null;
}
