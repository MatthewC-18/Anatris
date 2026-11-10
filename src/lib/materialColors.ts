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
// base muscle color. The jitter is keyed by the muscle's BASE name, so the same
// muscle is always the same shade across reloads AND on both sides of the body,
// while two different muscles next to each other land on slightly different
// tones (see colorForMaterialMesh).
//
// Colors are sRGB hex. AnatomyModel applies them via material.color.setHex().

import { structureKey } from './parseMeshName';

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
  // LA BOLSA SEROSA SE SALE DE LA FAMILIA PALIDA A PROPOSITO.
  //
  // Valia 0xc6e0e6, que es otro blanco azulado, y con su propio interruptor en
  // el panel eso ya no vale: una bolsa encendida tenia que distinguirse del
  // cartilago y del tendon que hay DEBAJO y ALREDEDOR de ella. Medido en
  // distancia perceptual (CIE Lab, dE76) contra los tejidos que el laboratorio
  // dibuja a la vez: el valor viejo quedaba a 7,7 del cartilago y a 9,2 del
  // tendon, menos que la distancia que ya separa al tendon del cartilago (12,7),
  // o sea indistinguible. Este queda a 20,6 del cartilago, 24,9 de la capsula y
  // 31,3 del tendon, y es el minimo contra CUALQUIER color de la paleta.
  //
  // Se descarto el ambar sinovial (0xd9b85c), que es lo que usan algunos atlas:
  // cae a 12,1 del amarillo del nervio, que es un color reservado.
  bursa: 0x6fb3bd,

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
 * fascia or skin here — those stay hidden so the biomechanics read clean.
 *
 * ESTE CONJUNTO ES LA FAMILIA DE REPARACION, NO LA DEL INTERRUPTOR. El panel
 * parte estas cuatro en dos botones (cuerdas / superficies articulares); la
 * particion vive en `panelLayerForMaterial`, y ahi esta medido por que no se
 * puede hacer aqui.
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
 * True when a material is TENDON, que es el subconjunto de lo conectivo que NO
 * se puede apagar sin amputar un musculo.
 *
 * POR QUE EXISTE ESTA PREGUNTA APARTE. La mitad distal de un antebrazo ES
 * tendon: los vientres del flexor y del extensor acaban hacia la mitad del
 * segmento y lo que llega a la muneca son sus cuerdas. El laboratorio arrancaba
 * con la capa conectiva apagada, asi que de la mitad del antebrazo para abajo no
 * quedaba mas que el radio y el cubito al aire, entre un brazo con musculo y una
 * mano con piel solida. Medido en pantalla sobre el eje del antebrazo: ocultando
 * piel y hueso, el pixel a t=0,45 y t=0,75 es FONDO (rgb 32,10,12 y 0,0,0); con
 * lo conectivo encendido se llena (rgb 121,122,124). `npm run audit-tendon-cover`
 * lo mide sin camara, por sectores, sobre el GLB.
 *
 * Asi que el tendon viaja con su musculo (capa `muscle`) y el interruptor se
 * queda con ligamento, capsula y cartilago, que si son opcionales.
 */
export function materialIsTendon(name: string | undefined | null): boolean {
  return colorForMaterial(name) === C.tendon;
}

/**
 * True para las BOLSAS SEROSAS (material 'Bursa').
 *
 * Tienen capa propia desde que el panel de pruebas dejo de pedir perdon por
 * ellas: Neer, Hawkins-Kennedy y el arco doloroso llevaban escrito que "la
 * bolsa subacromial esta en el modelo pero su material la deja en una capa que
 * el laboratorio no muestra nunca", y eso se leia en la region GRATIS con la
 * que se vende el producto.
 *
 * LA MEDIDA. `npm run audit-glb-waste` daba la fila `Bursa 42 mallas 3902
 * vertices 0,45% [ENCENDER?]`: ya descargadas, ya parseadas y jamas encendidas.
 * Entre ellas la subacromial (206 vertices por lado), la subdeltoidea (189 y
 * 187), las tres prerrotulianas, la infrarrotuliana profunda y la anserina.
 * Ninguna cae en la region distal, asi que el casquete de la mano no tapa ni
 * una, y ninguna la descarta el recorte del miembro ni el filtro de pinchos.
 * Con capa, ese mismo banco pasa de 2.360 a 2.402 mallas "con capa" (+3.902
 * vertices) y la fila desaparece del peso muerto.
 *
 * Se encienden 38 de las 42: el deduplicado de solapados (DUP_EPS = 4 mm, mismo
 * hueso dominante) colapsa las TRES bolsas prerrotulianas de cada lado en una
 * --estan a 0,8, 1,9 y 2,7 mm y las tres cuelgan de la rotula, asi que
 * dibujadas juntas parpadean-- y conserva la subfascial, que es la del medio.
 */
export function materialIsBursa(name: string | undefined | null): boolean {
  return colorForMaterial(name) === C.bursa;
}

/**
 * Color de la CARNE PROFUNDA: lo que se ve por el hueco entre dos vientres.
 *
 * Mas oscuro y mas mate que cualquier vientre (los vientres del rig viven entre
 * 0xa13042 y 0xce725a), porque su papel es ser fondo: tiene que cerrar el
 * miembro sin competir con el musculo que hay delante ni leerse como un vientre
 * mas.
 */
export const DEEP_FLESH = 0x7e2c30;

/**
 * La FASCIA ANTEBRAQUIAL, que es la unica pieza de fascia que el laboratorio
 * tiene que ensenar.
 *
 * EL DEFECTO, MEDIDO. En /hombro/movimiento, contando por filas de pantalla lo
 * que hay dentro del contorno de cada segmento (la medida esta en
 * `npm run audit-tendon-cover` y en la sonda de navegador que la acompana):
 *
 *   segmento      musculo   palido (hueso/tendon)   hueco al fondo
 *   brazo            86%            13%                  0,5%
 *   muslo            86%            12%                  0,3%
 *   ANTEBRAZO        52%            37%                 10,8%
 *
 * O sea: el antebrazo era el UNICO segmento que ensenaba hueso pelado --una
 * varilla de marfil entre un brazo con musculo y una mano con piel solida-- y
 * el unico que dejaba ver el escenario a traves del miembro. No era la piel
 * fantasma (ocultarla no cambiaba el pixel: 150,126,120 -> 148,123,120) ni el
 * recorte del antebrazo (las mallas dibujan el 100% de sus triangulos) ni los
 * tendones (encenderlos solo subia lo palido).
 *
 * La causa es anatomica: entre el grupo flexor y el extensor hay un hueco que
 * en el cuerpo cierra la FASCIA ANTEBRAQUIAL, y el laboratorio la tenia apagada
 * con el resto de la fascia. Encendiendola tal cual sale peor --es marfil, y
 * convierte los dos brazos en mangas blancas--, asi que se enciende pintada de
 * CARNE PROFUNDA y empujada por detras: donde hay vientre, gana el vientre;
 * donde habia hueco, ahora hay carne.
 *
 * Medido con la fascia puesta: el antebrazo pasa a 83% de musculo y 0% de
 * palido, que es el reparto del brazo y del muslo.
 *
 * El resto de la fascia (la lata del muslo, la cervical, la toracolumbar) sigue
 * apagada: no cierra ningun hueco y si taparia musculo.
 */
export function meshIsForearmFascia(
  meshName: string | undefined | null,
  materialName?: string | undefined | null,
): boolean {
  if (!meshName) return false;
  if (materialName != null && materialName !== 'Fascia') return false;
  return /^Antebrachial_fascia/i.test(meshName);
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
 * True for every tissue the movement lab CAN show: muscle, bone, the
 * joint-connecting connective layer and the serous bursae. Everything else
 * (nerve, artery, vein, fascia, organ, skin, reference geometry) stays hidden.
 */
export function materialIsVisibleAnatomy(name: string | undefined | null): boolean {
  return materialIsMuscleOrBone(name) || materialIsConnective(name) || materialIsBursa(name);
}

/**
 * ACCESSORY CONNECTIVE TISSUE: serous bursae, fascial sheets / intermuscular
 * septa, and tendon sheaths.
 *
 * These are real structures with real teaching value (subacromial bursitis,
 * trochanteric bursitis, the iliopsoas fascia), but there are 134 of them and
 * they are pale, thin and everywhere: with them on by default the hip opened on
 * two shard-edged sheets of iliopsoas fascia standing over the pelvis, and 11 of
 * the 22 "ligaments" the knee showed were bursae. Explorar hides them until the
 * user asks for them ("Bolsas y fascias" in the sidebar), the same way it hides
 * the origin/insertion markers.
 *
 * Classified by MATERIAL, not by name: the tensor fasciae latae is a muscle, not
 * a fascia, and matching "fasci" on the mesh name would swallow it. Tendon
 * sheaths carry the "Articular capsule" material, so those are caught by name —
 * no muscle or ligament in the atlas has "sheath" in its name.
 */
export function materialIsAccessoryTissue(
  materialName: string | undefined | null,
  meshName?: string | undefined | null,
): boolean {
  if (materialName === 'Bursa' || materialName === 'Fascia') return true;
  return meshName != null && /sheath/i.test(meshName);
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
 * TISSUE FAMILY a material belongs to, or null when the material is never shown
 * in the movement lab (nerve, vessel, fascia, organ, and all reference
 * geometry):
 *   skin       -> the outer envelope (Skin-* patches + Nail plates)
 *   muscle     -> the red muscle bellies + their action slips
 *   bone       -> the ivory skeleton
 *   connective -> the joint-connecting tendon/ligament/capsule/cartilage
 *   bursa      -> the serous bursae (see materialIsBursa)
 *
 * ESTO NO ES LO QUE DICE EL PANEL, y la diferencia importa. Media docena de
 * pases de REPARACION GEOMETRICA preguntan aqui de que familia es un tejido
 * para decidir si lo religan: `skinSeamRelax`, `shoulderMuscleBinding`,
 * `rigSpineSkin.smoothSpineConnective`, `rigPelvicOrigin`, `rigSkinRootWeight`
 * y el recorte de `rigLimbTrim`. Lo que el usuario enciende con un interruptor
 * lo decide `panelLayerForMaterial`, que parte esta respuesta en dos sin tocar
 * ninguno de esos pases.
 */
export type AnatomyLayer = 'skin' | 'muscle' | 'bone' | 'connective' | 'bursa';
export function layerForMaterial(name: string | undefined | null): AnatomyLayer | null {
  if (materialIsSkin(name)) return 'skin';
  if (materialIsBursa(name)) return 'bursa';
  const t = tissueClassForMaterial(name);
  if (t === 'muscle' || t === 'bone' || t === 'connective') return t;
  return null;
}

/**
 * LA CAPA DEL PANEL: lo que un interruptor de "Capas" enciende y apaga.
 *
 * Es `layerForMaterial` con UNA particion encima: lo conectivo se parte en las
 * CUERDAS (tendon, ligamento) y las SUPERFICIES ARTICULARES (cartilago,
 * capsula).
 *
 * POR QUE SE PARTE. El interruptor se llamaba "Tendones y ligamentos" y nombraba
 * el 67% de lo que encendia. Medido sobre public/cuerpo-rig.opt.glb, con los
 * pases de descarte del laboratorio aplicados, de las 446 mallas que la capa
 * conectiva enciende: Tendon 191 (42,8%), Cartilage 122 (27,4%), Ligament 97
 * (21,7%), Articular capsule 28 (6,3%), Origin-Ligament 8 (1,8%). O sea 150
 * mallas --un tercio-- que no son ni tendon ni ligamento, y entre ellas 17
 * VAINAS tendinosas, el cartilago costal, los discos y hasta los huesecillos
 * del oido. El fisio que buscaba el menisco o el cartilago articular no tenia
 * ningun interruptor que los nombrara, y el que encendia "Tendones" esperando
 * cuerdas veia cambiar de color medio esqueleto.
 *
 * Partirlo deja 313 mallas (78.333 vertices) en las cuerdas --las 296 de
 * material tendon/ligamento mas las 17 vainas, ver abajo-- y 133 (17.657) en
 * las superficies. Ninguna mitad se queda en nada: por region, cuerdas contra
 * superficies, hombro 96/61, tronco 37/8, cadera 34/2, rodilla 44/10, tobillo
 * 102/52.
 *
 * POR QUE AQUI Y NO EN `layerForMaterial`. Porque esa respuesta la usan los
 * pases de reparacion geometrica (ver su bloque), y sacar el cartilago de
 * 'connective' los apagaria sobre 150 mallas sin que nadie lo pidiera: la
 * capsula y el cartilago del hombro dejarian de recibir el gradiente
 * escapula->humero (61 piezas solo en esa region) y los discos y el cartilago
 * costal se caerian del re-pesado del raquis. El interruptor es cosa del panel;
 * el religado, del tejido.
 */
export type PanelLayer = AnatomyLayer | 'cartilage';
export function panelLayerForMaterial(
  name: string | undefined | null,
  meshName?: string | undefined | null,
): PanelLayer | null {
  const layer = layerForMaterial(name);
  if (layer !== 'connective') return layer;
  const base = colorForMaterial(name);
  if (base !== C.cartilage && base !== C.capsule) return 'connective';
  // LAS VAINAS TENDINOSAS VAN CON SU TENDON, aunque lleven el material de la
  // capsula. Son 17 de las 150 superficies y el material es lo unico que las
  // distingue mal: la vaina de los fibulares o la del abductor largo del pulgar
  // (De Quervain) es lo que el fisio busca cuando enciende "Tendones", no
  // cuando busca cartilago. Se cogen por nombre por el mismo motivo que en
  // `materialIsAccessoryTissue`: ningun musculo ni ligamento del atlas lleva
  // "sheath" en el nombre.
  return meshName != null && /sheath/i.test(meshName) ? 'connective' : 'cartilage';
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
 * The jitter is keyed on the STRUCTURE, not the raw mesh name (see structureKey).
 * Z-Anatomy names each side separately -- "...ol"/"...or", and where it forgot the
 * marker, Blender's ".001" -- so hashing the raw name drew two unrelated shades
 * for the two copies of one muscle: measured on the shipped rig, left and right
 * disagreed by up to 65 of 255 per channel (the supraspinatus came out crimson on
 * one side and salmon on the other), and the body read as split down the midline.
 * Keying on the structure makes a muscle one color on both sides, and keeps every
 * belly distinct from its neighbours, which is what the jitter is for. It also
 * gives a muscle's belly, origin and insertion patches one shade instead of
 * three.
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

  const hash = hashString(structureKey(meshName) || meshName);
  // Two independent pseudo-random values in [-1, 1] from the one hash.
  const r1 = ((hash & 0xffff) / 0xffff) * 2 - 1;
  const r2 = (((hash >>> 16) & 0xffff) / 0xffff) * 2 - 1;

  const h = (hsl.h + r1 * HUE_JITTER + 1) % 1;
  const l = clamp01(hsl.l + r2 * LIGHT_JITTER);
  const s = clamp01(hsl.s * 1.02); // tiny saturation bump

  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}
