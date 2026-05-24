// src/data/regiones.ts
//
// Region -> mesh-name resolution. The model holds the WHOLE body in one GLB,
// so to study a single region (e.g. the shoulder) we need to know which meshes
// belong to it and hide the rest. Listing all ~200 raw mesh names per region
// by hand is brittle (Z-Anatomy names have many variants: "Humerus",
// "Head_of_humerust_1_instance_0", "Body_of_humerust_1_instance_1", ...), so
// instead each region is defined by ANATOMICAL KEYWORDS. At runtime we scan the
// actual mesh names present in the scene and keep the ones that match.
//
// Matching rules:
// - `include`: a mesh belongs to the region if its (lowercased) name contains
//   ANY of these keyword fragments.
// - `exclude`: ...UNLESS it also contains one of these (catches neighbors that
//   share a word — e.g. forearm muscles named "...humeral head of flexor
//   carpi..." would be pulled in by "humer" but are NOT part of the shoulder).
//
// Keywords are matched as plain substrings against the lowercased mesh name,
// AFTER stripping the trailing Z-Anatomy bookkeeping suffixes does NOT happen
// here on purpose — we match the raw runtime name so "humerust_1_instance_0"
// still matches the "humer" fragment. Keep fragments lowercase.

export interface RegionDef {
  id: string;
  /** Human label (Spanish, shown to the user). */
  name: string;
  /** A mesh is in-region if its name contains ANY of these (lowercase). */
  include: string[];
  /** ...unless it ALSO contains one of these (lowercase). Optional. */
  exclude?: string[];
}

/* ---------------------------------------------------------------------------
 * SHOULDER
 * Bones: scapula, humerus (proximal — the shaft/elbow landmarks come along,
 *   which is fine as visual context), clavicle.
 * Joints + ligaments: glenohumeral, acromioclavicular, sternoclavicular,
 *   coracohumeral, scapular ligaments, etc.
 * Muscles: the 17 functional shoulder muscles (rotator cuff + superficial
 *   movers + scapulothoracic + biarticular arm muscles that cross the joint).
 * Vessels + nerves of the region.
 * EXCLUDES forearm/hand structures that merely share a word ("humeral head of
 *   flexor carpi ulnaris", "...flexor digitorum...", "...extensor carpi...").
 * ------------------------------------------------------------------------- */
const shoulder: RegionDef = {
  id: 'shoulder',
  name: 'Hombro',
  include: [
    // --- bones / bony landmarks ---
    'scapula',
    'scapular',
    'humer', // humerus + all "..._of_humerus..." landmarks
    'clavic', // clavicle + clavicular landmarks
    'glenoid',
    'coracoid',
    'acromi', // acromion / acromioclavicular

    // --- joints ---
    'glenohumeral_joint',
    'acromioclavicular_joint',
    'sternoclavicular_joint',
    'scapulohumeral',

    // --- ligaments / capsules ---
    'coracohumeral',
    'glenohumeral_ligament',
    'transverse_humeral_ligament',
    'scapular_ligament',
    'acromioclavicular_ligament',
    'sternoclavicular_ligament',
    'coracoclavicular',
    'costoclavicular',
    'interclavicular',
    'coracoacromial',

    // --- muscles (the 17 functional shoulder muscles) ---
    'supraspinatus',
    'infraspinatus',
    'teres_minor',
    'teres_major',
    'subscapularis',
    'deltoid',
    'pectoralis_major',
    'pectoralis_minor',
    'latissimus_dorsi',
    'trapezius',
    'rhomboid',
    'serratus_anterior',
    'levator_scapulae',
    'subclavius',
    'omohyoid',
    'biceps_brachii',
    'triceps_brachii',
    'coracobrachialis',

    // --- vessels of the region ---
    'circumflex_humeral',
    'circumflex_scapular',
    'suprascapular_artery',
    'suprascapular_vein',
    'subscapular_artery',
    'subscapular_vein',

    // --- nerves / plexus of the region ---
    'suprascapular_nerve',
    'subscapular_nerve',
    'dorsal_scapular_nerve',
    'brachial_plexus',
    'axillary_nerve',
  ],
  exclude: [
    // Forearm / hand muscles that share "humeral head" wording but are NOT
    // shoulder structures.
    'flexor_carpi',
    'extensor_carpi',
    'flexor_digitorum',
    'extensor_digitorum',
    'pronator',
    'palmaris',
    // Elbow-only humeral landmarks we don't want as shoulder content. (We keep
    // the humeral shaft for context but drop the distal elbow articulations.)
    'humero-ulnar_joint',
    'humeroradial_joint',
    'trochlea_of_humer',
    'capitulum_of_humer',
  ],
};

/** All defined regions, keyed by id. Add elbow, knee, etc. here later. */
export const REGIONS: Record<string, RegionDef> = {
  shoulder,
};

/**
 * Resolve a region definition against the real mesh names present in the
 * scene. Returns the Set of mesh names that belong to the region, ready to
 * hand to <Viewer3D regionMeshes={...} />.
 *
 * @param region    a RegionDef (or its keyword config)
 * @param allNames  every mesh name in the loaded model
 */
export function resolveRegionMeshes(
  region: RegionDef,
  allNames: Iterable<string>,
): Set<string> {
  const inc = region.include.map((s) => s.toLowerCase());
  const exc = (region.exclude ?? []).map((s) => s.toLowerCase());
  const result = new Set<string>();

  for (const name of allNames) {
    const lower = name.toLowerCase();
    if (exc.some((frag) => lower.includes(frag))) continue;
    if (inc.some((frag) => lower.includes(frag))) result.add(name);
  }
  return result;
}
