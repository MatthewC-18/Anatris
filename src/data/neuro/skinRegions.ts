// src/data/neuro/skinRegions.ts
//
// WHICH SKIN OF THE 3D BODY BELONGS TO WHICH NERVE ROOT.
//
// -----------------------------------------------------------------------------
// WHY THIS IS POSSIBLE AT ALL
// -----------------------------------------------------------------------------
// The rig's skin is not one mesh. Z-Anatomy ships it as 486 named SURFACE-REGION
// patches, and the names are anatomical rather than arbitrary -- "Lateral border of
// forearm", "Medial malleolus", "Heel region", "Dorsum of foot", "Radial foveola".
// Several of them ARE the ASIA key points this screen already teaches, which is
// what makes a segmental map on the real body honest instead of decorative:
//
//   L4  medial malleolus     -> "Medial malleolus"
//   L5  dorsum of the foot   -> "Dorsum of foot" / "Metatarsal region"
//   S1  lateral heel         -> "Heel region" / "Lateral border of foot"
//   C6  thumb                -> "Radial foveola" (the thumb's radial hollow)
//
// Every name below was read off the shipped rig, not guessed: see
// scripts/dump-rig-skin.mts, which dumps the names and each patch's measured
// position. VERIFIED_SKIN_REGIONS at the bottom is that vocabulary, committed so a
// unit test can prove this file never references a mesh the rig does not have --
// without needing the 19 MB binary to run.
//
// -----------------------------------------------------------------------------
// HOW A TERRITORY IS ADDRESSED
// -----------------------------------------------------------------------------
// The same two coordinates as the 2D plate (see src/lib/neuroPlate.ts), because it
// is the same anatomy on a different substrate:
//
//   lateral  0..1  ACROSS the limb. 0 = the region's most MEDIAL patch,
//                  1 = its most LATERAL one.
//   level    0..1  ALONG the limb. 0 = its most DISTAL patch, 1 = most PROXIMAL.
//
// Both are fractions WITHIN one region on one side, computed at load from the
// patches actually present, so a re-exported rig with a different patch count
// still lands the boundaries in the right place. Where a region's name is already
// specific enough ("Medial malleolus") no window is given and the whole region is
// taken.
//
// Lateral is measured as distance from the midline, which the shipped rig confirms
// is the right convention all the way down the limb: "Radial foveola" -- the thumb
// -- sits at x 0.299 with the palm's edge at 0.308, so the thumb is the most
// lateral thing on the hand, exactly as anatomical position says.
//
// LATERALITY IS GEOMETRIC, NOT NOMINAL. The rig names patches ".l", ".r", ".001"
// and unsuffixed, inconsistently: "Palm.r" sits at NEGATIVE x. Side comes from the
// sign of x, the same rule dissectChannel.ts already documents.
//
// -----------------------------------------------------------------------------
// WHAT IS LEFT UNPAINTED, ON PURPOSE
// -----------------------------------------------------------------------------
// The inguinal region (L1), the posterior thigh and gluteal region (S2-S3), the
// popliteal fossa (S2) and the shoulder cap's deltopectoral triangle (C4) all
// belong to roots this screen does not cover. The wrist is skipped too: it is a
// boundary zone the rig gives as one patch spanning C6, C7 and C8, and assigning
// it whole to any one of them would be inventing a boundary.
//
// This layer is REGIONAL. The rig has no per-dermatome geometry, and the patches it
// does have cannot resolve one finger from the next -- the three "digits of hand"
// shells overlap along the whole hand rather than splitting thumb from little
// finger. So the 3D body carries the territory and the 2D plate keeps the
// finger-level truth, and the panel says as much.
//
// ASCII source.

import type { PlateFigure } from './plate';

/** A patch group this root owns, optionally narrowed to part of the region. */
export interface SkinRule {
  /** Canonical region name, as canonicalRegion() yields it. */
  region: string;
  /** Window across the limb: 0 most medial patch, 1 most lateral. */
  lateral?: [number, number];
  /** Window along the limb: 0 most distal patch, 1 most proximal. */
  level?: [number, number];
}

/**
 * Reduce any spelling of a skin patch's name to its anatomical region.
 *
 * This has to survive FOUR spellings in the file plus a fifth introduced at
 * runtime, and getting it wrong fails silently -- it paints nothing and the feature
 * merely looks broken:
 *
 *   in the GLB      "Palm.l"   "Cubital fossa."   "Anterior region of arm.001"
 *   in three.js     "Palml"    "Cubital_fossa"    "Anterior_region_of_arm_1"
 *
 * three's GLTFLoader sanitises node names -- spaces and dots become underscores,
 * duplicates get "_1", "_2" -- and the laterality letter ends up GLUED to the last
 * word ("Dorsum_of_handl"). The first version of this function only understood the
 * GLB form, and on the real rig it matched 1 patch out of 486.
 *
 * So it does not guess: it normalises separators and then tries progressively
 * shorter candidates against VERIFIED_SKIN_REGIONS, the vocabulary read off the
 * shipped rig, and returns the first that is actually a region. Stripping a
 * trailing "l" is only safe BECAUSE the result has to be a known region -- and the
 * unstripped candidate is always tried first, so a region whose own name ends in l
 * or r can never be truncated.
 */
export function canonicalRegion(name: string): string {
  // Underscores, dots and whitespace only. NOT hyphens: three.js leaves those
  // alone and "Infra-orbital region" is spelt with one, so folding it to a space
  // would stop the name matching itself.
  const normalised = name.replace(/[_\s.]+/g, ' ').trim();
  for (const candidate of candidates(normalised)) {
    const hit = KNOWN.get(candidate.toLowerCase());
    if (hit) return hit;
  }
  // Unknown region: hand back the tidied name so a caller can report it rather
  // than match it against something it is not.
  return normalised;
}

/** Candidate region names for a raw one, longest (most exact) first. */
function candidates(normalised: string): string[] {
  const out = new Set<string>([normalised]);
  const words = normalised.split(' ');

  // Drop a trailing duplicate index: "... 1", "... 001".
  const noIndex = /^\d+$/.test(words[words.length - 1] ?? '')
    ? words.slice(0, -1).join(' ')
    : normalised;
  out.add(noIndex);

  for (const base of [normalised, noIndex]) {
    const w = base.split(' ');
    const last = w[w.length - 1] ?? '';
    // A laterality letter as its own word: "Palm r".
    if (/^[lr]$/i.test(last)) out.add(w.slice(0, -1).join(' '));
    // Or glued to the last word: "Dorsum of handl".
    if (last.length > 1 && /[lr]$/i.test(last)) {
      out.add([...w.slice(0, -1), last.slice(0, -1)].join(' '));
    }
  }
  return [...out].filter(Boolean);
}

/**
 * UPPER LIMB. C5 takes the lateral shoulder and arm, T1 the medial arm, and the
 * forearm splits three ways into the thumb / middle / little finger the ASIA key
 * points name -- which the rig supports directly for the two borders it names
 * ("Lateral border of forearm" is C6, "Medial border of forearm" is C8) and by
 * lateral thirds for the broad anterior and posterior shells.
 */
const UPPER: Record<string, SkinRule[]> = {
  C5: [
    { region: 'Deltoid region' },
    { region: 'Lateral bicipital groove' },
    { region: 'Anterior region of arm', lateral: [0.5, 1] },
    { region: 'Posterior region of arm', lateral: [0.5, 1] },
    // The ASIA C5 key point is the LATERAL antecubital fossa; T1's is the medial
    // one, and the rig gives the fossa as two patches that separate cleanly.
    { region: 'Cubital fossa', lateral: [0.5, 1] },
  ],
  C6: [
    { region: 'Lateral border of forearm' },
    { region: 'Radial foveola' },
    { region: 'Anterior region of elbow', lateral: [0.5, 1] },
    { region: 'Posterior region of elbow', lateral: [0.5, 1] },
    { region: 'Anterior region of forearm', lateral: [0.55, 1] },
    { region: 'Posterior region of forearm', lateral: [0.66, 1] },
    { region: 'Palm', lateral: [0.66, 1] },
    { region: 'Palmar surfaces of digits of hand', lateral: [0.5, 1] },
    { region: 'Dorsal surfaces of digits of hand', lateral: [0.66, 1] },
  ],
  C7: [
    { region: 'Posterior region of forearm', lateral: [0.33, 0.66] },
    // One patch per side, and the mid dorsum is C7's. Taken whole rather than
    // split, because a single patch has no fraction to window on.
    { region: 'Dorsum of hand' },
    { region: 'Dorsal surfaces of digits of hand', lateral: [0.33, 0.66] },
  ],
  C8: [
    { region: 'Medial border of forearm' },
    { region: 'Anterior region of forearm', lateral: [0, 0.45] },
    { region: 'Posterior region of forearm', lateral: [0, 0.33] },
    { region: 'Posterior region of elbow', lateral: [0, 0.5] },
    { region: 'Palm', lateral: [0, 0.5] },
    { region: 'Palmar surfaces of digits of hand', lateral: [0, 0.5] },
    { region: 'Dorsal surfaces of digits of hand', lateral: [0, 0.33] },
  ],
  T1: [
    { region: 'Medial bicipital groove' },
    { region: 'Anterior region of arm', lateral: [0, 0.5] },
    { region: 'Posterior region of arm', lateral: [0, 0.5] },
    { region: 'Cubital fossa', lateral: [0, 0.5] },
  ],
};

/**
 * LOWER LIMB. The thigh splits by LEVEL (L2 proximal, L3 distal) because lumbar
 * dermatomes descend it in transverse bands; below the knee it splits by SIDE (L4
 * medial to the medial malleolus, L5 lateral into the dorsum), which is the switch
 * that makes L4 and L5 separable at the bedside. S1 takes the calf, the heel and
 * the sole -- where both its key point and its reflex live.
 */
const LOWER: Record<string, SkinRule[]> = {
  L2: [
    { region: 'Femoral triangle' },
    { region: 'Anterior region of thigh', level: [0.6, 1] },
  ],
  L3: [
    { region: 'Anterior region of thigh', level: [0, 0.6] },
    { region: 'Anterior region of knee' },
  ],
  L4: [
    { region: 'Anterior region of leg', lateral: [0, 0.45] },
    { region: 'Medial malleolus' },
    { region: 'Medial retromalleolar region' },
    { region: 'Medial border of foot' },
  ],
  L5: [
    { region: 'Anterior region of leg', lateral: [0.45, 1] },
    { region: 'Anterior region of ankle' },
    { region: 'Dorsum of foot' },
    { region: 'Metatarsal region' },
    { region: 'Hallucial eminence' },
    { region: 'Dorsal surfaces of digits of foot' },
  ],
  S1: [
    { region: 'Posterior region of leg' },
    { region: 'Lateral malleolus' },
    { region: 'Lateral retromalleolar region' },
    { region: 'Heel region' },
    { region: 'Lateral border of foot' },
    { region: 'Sole' },
    { region: 'Plantar surfaces of digits of foot' },
    { region: 'Lateral part of longitudinal arch of foot' },
    { region: 'Medial part of longitudinal arch of foot' },
    { region: 'Proximal transverse arch of foot' },
    { region: 'Distal transverse arch of foot' },
  ],
};

/** figure -> root -> the skin it owns. */
export const SKIN_BY_ROOT: Record<PlateFigure, Record<string, SkinRule[]>> = {
  'upper-limb': UPPER,
  'lower-limb': LOWER,
};

/**
 * Every canonical skin-region name the shipped rig actually contains.
 *
 * Committed so the mapping above can be checked against reality by a unit test
 * that does not need the GLB (which is an LFS object, absent in a plain clone).
 * Regenerate with:
 *
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/dump-rig-skin.mts <rig.glb>
 *
 * and canonicalise the region names it lists.
 */
export const VERIFIED_SKIN_REGIONS: readonly string[] = [
  'Anal region',
  'Angle of mouth',
  'Anterior notch of auricle',
  'Anterior region of ankle',
  'Anterior region of arm',
  'Anterior region of elbow',
  'Anterior region of forearm',
  'Anterior region of knee',
  'Anterior region of leg',
  'Anterior region of thigh',
  'Anterior region of wrist',
  'Antihelix',
  'Antitragus',
  'Apex of auricle',
  'Auricular region',
  'Auricular tubercle',
  'Buccal region',
  'Carotid triangle',
  'Cavity of concha',
  'Concha of auricle',
  'Crura of antihelix',
  'Cubital fossa',
  'Cymba conchae',
  'Deltoid region',
  'Deltopectoral triangle',
  'Distal transverse arch of foot',
  'Dorsal surfaces of digits of foot',
  'Dorsal surfaces of digits of hand',
  'Dorsum of foot',
  'Dorsum of hand',
  'Eminentia conchae',
  'Eminentia fossae triangularis',
  'Eminentia scaphae',
  'Epigastric region',
  'Eyebrow',
  'Femoral triangle',
  'Fossa antihelica',
  'Frontal region',
  'Gluteal fold',
  'Gluteal region',
  'Greater supraclavicular fossa',
  'Hallucial eminence',
  'Heel region',
  'Helix',
  'Hip region',
  'Hypochondriac region',
  'Hypogastric region',
  'Infra-orbital region',
  'Infraclavicular fossa',
  'Inframammary region',
  'Infrascapular region',
  'Inguinal region',
  'Interscapular region',
  'Intertragic incisure',
  'Labial commissure',
  'Lateral bicipital groove',
  'Lateral border of foot',
  'Lateral border of forearm',
  'Lateral malleolus',
  'Lateral part of longitudinal arch of foot',
  'Lateral region of abdomen',
  'Lateral region of neck',
  'Lateral region of thorax',
  'Lateral retromalleolar region',
  'Lesser supraclavicular fossa',
  'Lobule of auricle',
  'Lumbar region',
  'Mammary region',
  'Mastoid region',
  'Medial bicipital groove',
  'Medial border of foot',
  'Medial border of forearm',
  'Medial malleolus',
  'Medial part of longitudinal arch of foot',
  'Medial retromalleolar region',
  'Mental region',
  'Mentolabial sulcus',
  'Metatarsal region',
  'Muscular triangle',
  'Nail plate',
  'Nail plate (foot)',
  'Nasal region',
  'Nasolabial sulcus',
  'Occipital region',
  'Oral region',
  'Orbital region',
  'Palm',
  'Palmar surfaces of digits of hand',
  'Parietal region',
  'Parotideomasseteric region',
  'Pectoral region',
  'Philtrum',
  'Plantar surfaces of digits of foot',
  'Popliteal fossa',
  'Posterior auricular groove',
  'Posterior axillary line',
  'Posterior region of arm',
  'Posterior region of elbow',
  'Posterior region of forearm',
  'Posterior region of knee',
  'Posterior region of leg',
  'Posterior region of neck',
  'Posterior region of thigh',
  'Posterior region of wrist',
  'Presternal region',
  'Proximal transverse arch of foot',
  'Radial foveola',
  'Sacral region',
  'Scapha',
  'Scapular region',
  'Sole',
  'Sternocleidomastoid region',
  'Submandibular triangle',
  'Submental triangle',
  'Temporal region',
  'Tragus',
  'Triangle of auscultation',
  'Triangular fossa',
  'Tubercle of upper lip',
  'Umbilical region',
  'Umbilicus',
  'Urogenital region',
  'Vertebral region',
  'Zygomatic region',
];

/**
 * lowercase name -> canonical spelling. Built once, after the list above exists
 * (canonicalRegion is only ever called at runtime, never during module init).
 */
const KNOWN: Map<string, string> = new Map(
  VERIFIED_SKIN_REGIONS.map((r) => [r.toLowerCase(), r]),
);
