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
// For PHYSIOTHERAPY use the priority is muscle legibility: adjacent muscles
// must read apart. A single flat red merges neighbours into one mass, so we
// apply a small DETERMINISTIC per-structure hue/lightness jitter on top of the
// base muscle color. The jitter is keyed by mesh name, so the same muscle is
// always the same shade across reloads, while two different muscles next to
// each other land on slightly different tones.
//
// Colors are sRGB hex. AnatomyModel applies them via material.color.setHex().

/** Anatomical atlas palette, grouped for readability. */
const C = {
  // Bone family — warm ivory, subtle variation so adjacent bones read apart.
  bone: 0xeae3d2,
  boneCool: 0xe2ddd0,
  teeth: 0xf4f1e8,
  cartilage: 0xbcd0e0, // pearly blue-white

  // Muscle family — brighter, more saturated meat reds for clinical clarity.
  // Bumped up from the old dull brick (0xa83236) so muscles pop against bone
  // and against the dark viewer background.
  muscle: 0xc23b3b,
  muscleDeep: 0xa12f30, // deeper layer muscles, reads "behind"
  muscleOrigin: 0xc06a52, // tendon-ish transition at attachment
  tendon: 0xe6e9ee, // pearly cool sinew — deliberately BLUER than the warm bone
  // ivory so a visible tendon reads as sinew, never as a "loose bone".
  fascia: 0xdacfba,

  // Connective — pale, slightly bluish whites.
  ligament: 0xdfe3ea,
  capsule: 0xcdd6e2,
  bursa: 0xc6e0e6,

  // Vessels.
  artery: 0xcf3a2e, // bright arterial red (kept distinct from muscle)
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
 * The set of base colors that represent MUSCLE tissue. Only meshes whose
 * resolved color is one of these get the per-structure jitter, so vessels,
 * bones, nerves etc. stay perfectly uniform.
 */
const MUSCLE_BASE_COLORS = new Set<number>([
  C.muscle,
  C.muscleDeep,
  C.muscleOrigin,
]);

/** Base colors that represent BONE tissue (ivory family). */
const BONE_BASE_COLORS = new Set<number>([C.bone, C.boneCool, C.teeth]);

/**
 * Base colors that represent the CONNECTIVE tissue that visually JOINS the
 * joints — tendon, ligament, articular capsule, cartilage. Showing these on top
 * of bone + muscle turns a scattered pile of little distal bones into a
 * recognisable, connected hand/foot (the "anatómica conectada" look). We
 * deliberately do NOT include the neurovascular swarm (nerve/artery/vein),
 * fascia, bursa or skin here — those stay hidden so the biomechanics read clean.
 */
const CONNECTIVE_BASE_COLORS = new Set<number>([
  C.tendon,
  C.ligament,
  C.capsule,
  C.cartilage,
]);

/**
 * True when a material is MUSCLE or BONE — the two layers the movement lab
 * animates.
 */
export function materialIsMuscleOrBone(name: string | undefined | null): boolean {
  const base = colorForMaterial(name);
  if (base === null) return false;
  return MUSCLE_BASE_COLORS.has(base) || BONE_BASE_COLORS.has(base);
}

/** True when a material is joint-connecting connective tissue (see set above). */
export function materialIsConnective(name: string | undefined | null): boolean {
  const base = colorForMaterial(name);
  if (base === null) return false;
  return CONNECTIVE_BASE_COLORS.has(base);
}

/**
 * True when a material is the SKIN envelope (Skin-1..8 patches + finger/toe
 * Nail plates). The body hides these globally (heavy overdraw, occludes the
 * muscles/bones the lab animates), but the movement lab shows them for the
 * HANDS and FEET only: the distal Z-Anatomy internals export as a shattered
 * pile of tiny bones + spike tendons, whereas the skin patches form one clean,
 * recognisable hand/foot. RigModel uses this to cap the extremities with skin.
 */
export function materialIsSkin(name: string | undefined | null): boolean {
  if (!name) return false;
  return name.startsWith('Skin') || name.startsWith('Nail');
}

/**
 * True for every tissue the movement lab SHOWS: muscle, bone, and the
 * joint-connecting connective layer. Everything else (nerve, artery, vein,
 * fascia, bursa, organ, skin, reference geometry) stays hidden.
 */
export function materialIsVisibleAnatomy(name: string | undefined | null): boolean {
  return materialIsMuscleOrBone(name) || materialIsConnective(name);
}

/** Tissue class of a material, for premium per-tissue shading (roughness etc.). */
export type TissueClass = 'bone' | 'muscle' | 'connective' | 'other';
export function tissueClassForMaterial(name: string | undefined | null): TissueClass {
  const base = colorForMaterial(name);
  if (base === null) return 'other';
  if (BONE_BASE_COLORS.has(base)) return 'bone';
  if (MUSCLE_BASE_COLORS.has(base)) return 'muscle';
  if (CONNECTIVE_BASE_COLORS.has(base)) return 'connective';
  return 'other';
}

/**
 * PEELABLE display layer a material belongs to, or null when the material is
 * never shown in the movement lab (nerve, vessel, fascia, bursa, organ, and all
 * reference geometry). The movement lab groups every visible mesh into one of
 * these four layers and lets the user toggle each on/off ("quitar capas"):
 *   skin       -> the outer envelope (Skin-* patches + Nail plates)
 *   muscle     -> the red muscle bellies + their action slips
 *   bone       -> the ivory skeleton
 *   connective -> the joint-connecting tendon/ligament/capsule/cartilage
 */
export type AnatomyLayer = 'skin' | 'muscle' | 'bone' | 'connective';
export function layerForMaterial(name: string | undefined | null): AnatomyLayer | null {
  if (materialIsSkin(name)) return 'skin';
  const t = tissueClassForMaterial(name);
  if (t === 'muscle' || t === 'bone' || t === 'connective') return t;
  return null;
}

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

/* ------------------------------------------------------------------ */
/*  Per-structure muscle variation (the key clinical-legibility win)  */
/* ------------------------------------------------------------------ */

/** Fast, stable string hash (FNV-1a) → unsigned 32-bit int. */
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Clamp a number into [0, 1]. */
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** sRGB hex → {r,g,b} in 0..1. */
function hexToRgb(hex: number) {
  return {
    r: ((hex >> 16) & 0xff) / 255,
    g: ((hex >> 8) & 0xff) / 255,
    b: (hex & 0xff) / 255,
  };
}

/** {r,g,b} 0..1 → sRGB hex. */
function rgbToHex(r: number, g: number, b: number): number {
  const to255 = (v: number) => Math.round(clamp01(v) * 255);
  return (to255(r) << 16) | (to255(g) << 8) | to255(b);
}

// Minimal RGB<->HSL so we can nudge hue/lightness, not raw channels.
function rgbToHsl(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) return { r: l, g: l, b: l };
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3),
    g: hue2rgb(p, q, h),
    b: hue2rgb(p, q, h - 1 / 3),
  };
}

// How far we let muscle shades wander. Kept small so it reads as "anatomical
// variation" not "rainbow". Tune these two if you want more/less separation.
const HUE_JITTER = 0.035; // ±~13° of hue (toward orange / toward crimson)
const LIGHT_JITTER = 0.09; // ±9% lightness

/**
 * Final per-MESH color. Use this from AnatomyModel instead of colorForMaterial
 * when you have the mesh name available. For muscle tissue it returns a stable
 * jittered shade; for everything else it returns the flat atlas color
 * unchanged.
 *
 * @param materialName  the mesh's material name (drives base color)
 * @param meshName      the mesh's unique name (drives the stable variation)
 */
export function colorForMaterialMesh(
  materialName: string | undefined | null,
  meshName: string | undefined | null,
): number | null {
  const base = colorForMaterial(materialName);
  if (base === null) return null;

  // Only muscles get jittered.
  if (!MUSCLE_BASE_COLORS.has(base) || !meshName) return base;

  const hsl = rgbToHsl(...Object.values(hexToRgb(base)) as [number, number, number]);

  const hash = hashString(meshName);
  // Two independent pseudo-random values in [-1, 1] from the one hash.
  const r1 = ((hash & 0xffff) / 0xffff) * 2 - 1;
  const r2 = (((hash >>> 16) & 0xffff) / 0xffff) * 2 - 1;

  const h = (hsl.h + r1 * HUE_JITTER + 1) % 1;
  const l = clamp01(hsl.l + r2 * LIGHT_JITTER);
  const s = clamp01(hsl.s * 1.02); // tiny saturation bump

  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}
