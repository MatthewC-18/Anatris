// src/lib/resolveMuscleId.ts
//
// Maps a clicked mesh name (Z-Anatomy flattened, e.g. "Supraspinatus_muscler",
// "Clavicular_part_of_deltoid_muscleol", "Long_head_of_biceps_brachiiol") to a
// stable muscleId used as the key in the content index (e.g. "supraspinatus").
//
// Strategy:
//   0. REJECT non-muscle entities up front. Z-Anatomy includes structures whose
//      names embed a muscle name as a qualifier but which are NOT the muscle
//      belly: "Groove_for_subclavius_muscle", "Subtendinous_bursa_of_teres_
//      major_muscle", tendons, sheaths, etc. These must resolve to null so the
//      panel never shows the wrong muscle's clinical content for a bursa/groove.
//   1. Strip Z-Anatomy technical suffixes/markers from the mesh name to get a
//      clean base token (side r/l, origin/end markers o/o1/e/e1, tendon _1,
//      instance suffixes, trailing group letters).
//   2. Normalize to a lowercase, accent-free, underscore-collapsed slug.
//   3. Look the slug up against a table of known shoulder muscles, matching by
//      the most specific alias first (so "clavicular_part_of_deltoid" maps to
//      the deltoid before a generic "deltoid" rule would), and only when the
//      alias aligns to a TOKEN BOUNDARY (start of slug or right after '_') so a
//      muscle name buried inside another entity's name can't match.
//
// Returns null when no known muscle matches -- the caller then shows the raw
// anatomy entry without clinical content.
//
// IDS ARE KEBAB-CASE, aligned with src/data/muscles/shoulder.ts and the keys
// of SHOULDER_MUSCLES. The ALIAS slugs are matched against snake_case mesh
// names; slugify() collapses '-' and '_' alike, so a kebab id key and a
// snake alias coexist without clashing.
//
// VERIFIED against the real Z-Anatomy mesh dump (window.__scene traverse):
//   - 62 representative real shoulder meshes resolve to the correct muscle.
//   - Levator scapulae (every marker variant) resolves to "levator-scapulae".
//   - 7 dangerous decoys (grooves + subtendinous bursae) correctly resolve to
//     null instead of mis-mapping to subclavius/infraspinatus/teres-major/
//     triceps-brachii.
//   - Non-shoulder "Levator_*" muscles (ani, anguli oris, nasolabialis,
//     palpebrae superioris, levatores costarum) correctly resolve to null.

/** Known muscleId -> list of name fragments that map to it.
 *  Order within the array doesn't matter; longer/more specific alias slugs
 *  across the whole table are tried first (see MATCHERS sort).
 *
 *  IMPORTANT alias rules learned from the real mesh names:
 *    - Real shoulder meshes almost all end in "_muscle" (e.g.
 *      "Teres_minor_muscleol"), which protects the muscle's real final letter
 *      from the marker-erosion rules. So full slugs like "teres_minor" match
 *      cleanly and the two teres muscles never cross-resolve.
 *    - Multi-part muscles (deltoid, pectoralis major, biceps, triceps, trapezius)
 *      list every part/head base so a click on ANY part resolves to the whole
 *      muscle. The bare "deltoid" alias is a last-resort safety net for the rare
 *      "Deltoid_muscleel/er" meshes that erode to "deltoid_musc".
 *    - "levator_scapula" (no trailing 'e') is kept alongside "levator_scapulae"
 *      because the no-"_muscle" levator meshes (e.g. "Levator_scapulaeel") erode
 *      down to "levator_scapula".
 *    - "rhomboid_major"/"rhomboid_minor" both map to the single "rhomboids" card. */
const MUSCLE_ALIASES: Record<string, string[]> = {
  // ----- Rotator cuff -----
  supraspinatus: ['supraspinatus'],
  infraspinatus: ['infraspinatus'],
  'teres-minor': ['teres_minor'],
  subscapularis: ['subscapularis'],

  // ----- Superficial glenohumeral movers -----
  deltoid: [
    'acromial_part_of_deltoid',
    'clavicular_part_of_deltoid',
    'scapular_spinal_part_of_deltoid',
    'deltoid_muscle',
    'deltoid', // last-resort: "Deltoid_muscleel" erodes to "deltoid_musc"
  ],
  'pectoralis-major': [
    'clavicular_head_of_pectoralis_major',
    'sternocostal_head_of_pectoralis_major',
    'abdominal_part_of_pectoralis_major',
    'pectoralis_major',
  ],
  'pectoralis-minor': ['pectoralis_minor'],
  'teres-major': ['teres_major'],

  // ----- Scapulothoracic movers -----
  'latissimus-dorsi': ['latissimus_dorsi'],
  trapezius: [
    'descending_part_of_trapezius',
    'transverse_part_of_trapezius',
    'ascending_part_of_trapezius',
    'trapezius',
  ],
  rhomboids: ['rhomboid_major', 'rhomboid_minor'],
  'serratus-anterior': ['serratus_anterior'],
  'levator-scapulae': ['levator_scapulae', 'levator_scapula'],
  subclavius: ['subclavius'],
  omohyoid: ['omohyoid'],

  // ----- Biarticular arm muscles -----
  'biceps-brachii': [
    'long_head_of_biceps_brachii',
    'short_head_of_biceps_brachii',
    'biceps_brachii',
  ],
  'triceps-brachii': [
    'long_head_of_triceps_brachii',
    'lateral_head_of_triceps_brachii',
    'medial_head_of_triceps_brachii',
    'triceps_brachii',
  ],
  coracobrachialis: ['coracobrachialis'],
};

/** Non-muscle entities whose names embed a muscle name as a qualifier.
 *  If the slugified raw mesh name starts with (or contains as a token-prefixed
 *  segment) one of these, the mesh is a groove/bursa/tendon/sheath, NOT a
 *  muscle belly, and must resolve to null. Checked BEFORE any alias matching. */
const NON_MUSCLE_PREFIXES = [
  'groove_for_',
  'subtendinous_bursa_of_',
  'subtendinous_bursa_',
  'bursa_of_',
  'bursa_',
  'tendon_of_',
  'sheath_of_',
  'synovial_',
];

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
  // Peel known noise suffixes iteratively.
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

/** True if `alias` occurs in `base` starting at a token boundary (index 0 or
 *  immediately after an underscore). Prevents a muscle name buried mid-token
 *  inside another entity's name from matching. */
function tokenIncludes(base: string, alias: string): boolean {
  let from = 0;
  for (;;) {
    const i = base.indexOf(alias, from);
    if (i < 0) return false;
    if (i === 0 || base[i - 1] === '_') return true;
    from = i + 1;
  }
}

/** True if the slugified raw mesh name denotes a non-muscle entity. */
function isNonMuscleEntity(rawSlug: string): boolean {
  for (const p of NON_MUSCLE_PREFIXES) {
    if (rawSlug.startsWith(p) || rawSlug.includes('_' + p)) return true;
  }
  return false;
}

// Precompute matchers sorted by specificity (longest alias slug first) so a
// more specific alias wins over a generic one (e.g. a deltoid PART beats the
// bare "deltoid" safety net, and "teres_major" can't be shadowed).
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
 * Non-muscle entities (grooves, bursae, tendons, sheaths) are rejected first.
 * Matching is token-boundary-aligned substring on the cleaned slug so that,
 * e.g., "clavicular_part_of_deltoid_muscle" contains "clavicular_part_of_deltoid"
 * but "groove_for_subclavius_muscle" does NOT count as "subclavius".
 */
export function resolveMuscleId(meshName: string): string | null {
  const rawSlug = slugify(meshName);
  if (isNonMuscleEntity(rawSlug)) return null;

  const base = baseSlugFromMesh(meshName);
  if (!base) return null;

  for (const m of MATCHERS) {
    if (tokenIncludes(base, m.aliasSlug)) return m.muscleId;
  }
  return null;
}
