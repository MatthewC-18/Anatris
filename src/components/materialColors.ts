// src/lib/materialColors.ts
//
// Z-Anatomy ships meshes with semantically-named materials (Artery, Vein,
// Nerve-1..8, Bone-1..8, Trapezius, Cartilage, ...) but the exported/optimized
// GLB renders them all near-white, so nothing is visually distinguishable.
//
// This module re-colors the model at load time using the standard anatomical
// atlas palette (muscles red, arteries red, veins blue, nerves yellow, bone
// ivory, cartilage pearly blue, etc.). We resolve a color per material NAME,
// with a fast exact-match map plus prefix fallbacks for the numbered families.
//
// Colors are sRGB hex. AnatomyModel applies them via material.color.setHex().

/** Anatomical atlas palette, grouped for readability. */
const C = {
  // Bone family — warm ivory, subtle variation so adjacent bones read apart.
  bone: 0xeae3d2,
  boneCool: 0xe2ddd0,
  teeth: 0xf4f1e8,
  cartilage: 0xbcd0e0, // pearly blue-white

  // Muscle family — meat reds. Origins/insertions slightly desaturated.
  muscle: 0xa83236,
  muscleDeep: 0x8f2a2f,
  muscleOrigin: 0xb05a4a, // tendon-ish transition at attachment
  tendon: 0xe8e2d4, // off-white sinew
  fascia: 0xd8cdb8,

  // Connective — pale, slightly bluish whites.
  ligament: 0xdfe3ea,
  capsule: 0xcdd6e2,
  bursa: 0xc6e0e6,

  // Vessels.
  artery: 0xc0392b, // bright arterial red
  pulmonaryArtery: 0x9b59b6, // convention: pulmonary art. shown blue/purple
  vein: 0x3a5fa0, // venous blue
  pulmonaryVein: 0xb0463a, // oxygenated → reddish
  lymph: 0x8fbf7a, // lymphatic green

  // Nerves & CNS.
  nerve: 0xe6c14b, // nerve yellow
  brain: 0xd8b8b0, // cortical pinkish-grey
  whiteMatter: 0xeae6dd,
  nucleus: 0xc99a8e,

  // Organs / viscera.
  organ: 0xb56a55,
  gland: 0xc98a6a,
  mucosa: 0xc77a78,
  bronchi: 0xd7c0a8,
  intestine: 0xc08a5a,
  fat: 0xe8d98a,
  eye: 0xeef2f4,
  iris: 0x5a7a8a,

  // Skin — colored, but AnatomyModel renders it translucent regardless.
  skin: 0xd9b89c,
} as const;

/** Exact material-name → color. Checked first. */
const EXACT: Record<string, number> = {
  // Bones
  Bone: C.bone,
  Teeth: C.teeth,
  'Teeth-roots': 0xe8dcc4, // root/dentin, slightly warmer than crown
  Cartilage: C.cartilage,

  // Connective
  Ligament: C.ligament,
  'Articular capsule': C.capsule,
  Bursa: C.bursa,
  Fascia: C.fascia,
  Tendon: C.tendon,
  'Origin-Ligament': C.ligament,

  // Vessels
  Artery: C.artery,
  'Pulmonary artery': C.pulmonaryArtery,
  Vein: C.vein,
  'Pulmonary vein': C.pulmonaryVein,

  // Nerves / CNS
  Nerve: C.nerve,
  'White matter': C.whiteMatter,
  Brain: C.brain,
  'Brain-Inner': C.brain,
  Nucleus: C.nucleus,
  'Nucleus (afferent fibers)': C.nucleus,
  'Nucleus (efferent fibers)': C.nucleus,
  Cerebellum: C.brain,
  Insula: C.brain,
  'Frontal lobe': C.brain,
  'Parietal lobe': C.brain,
  'Temporal lobe': C.brain,
  'Occipital lobe': C.brain,
  'Limbic lobe': C.brain,
  'Interlobar sulci': C.whiteMatter,
  LCR: 0xcfe3ee, // cerebrospinal fluid, pale blue

  // Organs
  Organ: C.organ,
  Gland: C.gland,
  Mucosa: C.mucosa,
  Intestine: C.intestine,
  Fat: C.fat,
  Eye: C.eye,
  Cornea: C.eye,
  Iris: C.iris,
  Gallbladder: 0x6fae6a,
  Peritoneum: 0xe0cbb0,
  Ductus: C.bronchi,
  'Lung-base': 0xc99a96,

  // Muscle (named single muscles)
  Trapezius: C.muscle,
  Diaphragm: C.muscleDeep,
  Masticator: C.muscle,
  Levator: C.muscle,
  Depressor: C.muscle,
  Abductor: C.muscle,
  Adductor: C.muscle,
  Biarticular: C.muscle,
  Superficial: C.muscle,
  Extension: C.muscle,
  Flexion: C.muscle,
  'External rotation': C.muscle,
  'Internal rotator': C.muscle,
  'Extensor extremities': C.muscle,
  'Orbicularis/Constrictor': C.muscle,
  Phonation: C.muscle,
  Ingestion: C.muscle,
  'Muscular origin': C.muscleOrigin,
};

/**
 * Prefix-based fallbacks for numbered / patterned material families.
 * Order matters: first matching prefix wins.
 */
const PREFIXES: Array<[string, number]> = [
  ['Bone-', C.boneCool],
  ['Suture', C.boneCool], // cranial sutures read as bone
  ['Skin', C.skin],
  ['Nail', 0xe7d9c8],
  ['Nerve-', C.nerve],
  ['Lymph', C.lymph],
  ['Lung', 0xc99a96], // lung tissue (Lung-base, Lung-1, ...)
  ['Bronchi', C.bronchi],
  ['Organ-', C.organ],
  // Muscle action families — all the End-/Origin-/*-fingers/*-hand/foot etc.
  ['Origin-', C.muscleOrigin],
  ['End-', C.muscle],
  ['Flexion', C.muscle],
  ['Extension', C.muscle],
  ['Mastication', C.muscle],
];

/**
 * Resolve a display color for a material name. Returns null when the material
 * is non-anatomical reference geometry (Text, Lines, Planes, etc.) — those are
 * left untouched / hidden by the layer system.
 */
export function colorForMaterial(name: string | undefined | null): number | null {
  if (!name) return null;

  // Reference / non-anatomical materials: skip coloring.
  if (
    name === 'Text' ||
    name === 'Text-2' ||
    name === 'Lines' ||
    name === 'Planes' ||
    name === 'Directions' ||
    name === 'Movement' ||
    name === 'Black' ||
    name === '(none)'
  ) {
    return null;
  }

  const exact = EXACT[name];
  if (exact !== undefined) return exact;

  for (const [prefix, color] of PREFIXES) {
    if (name.startsWith(prefix)) return color;
  }

  // Unknown anatomical material: neutral tissue tone rather than white.
  return 0xbfae9a;
}
