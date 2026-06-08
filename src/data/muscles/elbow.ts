// src/data/muscles/elbow.ts
//
// Elbow muscle data - the 3D / ROM source of truth for the elbow region. This
// is the analogue of src/data/muscles/shoulder.ts: each Muscle record carries
// the parseMeshName() base name(s) that resolve to its real meshes, so the
// viewer can highlight the complete muscle (both sides, all parts) from a
// stable id.
//
// +---------------------------------------------------------------------------+
// | CLINICAL CONTENT DISCLAIMER
// | origin / insertion / innervation / action fields are drafted from standard
// | anatomy as a STARTING POINT and must be verified against an authoritative
// | source before shipping in a clinical product. Treat as draft copy.
// +---------------------------------------------------------------------------+
//
// meshBases STATUS: VERIFIED. Every base below was produced by running the real
// parseMeshName() logic over the actual Z-Anatomy mesh names extracted from the
// model (scene traverse). This matters here MORE than for the
// shoulder, because several elbow muscles do NOT end in "_muscle", so the
// parser's part/side erosion produces extra non-obvious bases that we must list
// explicitly or the origin/insertion marker meshes won't group with the belly:
//
//   - SUPINATOR  ("Supinator", no "_muscle"): the bare belly "Supinator"
//     erodes to "Supinato" (the final r is eaten as a side marker!), the
//     lateralized belly "Supinatorl/r" -> "Supinator", and the o/e markers
//     -> "Supinatoro" / "Supinatore". All four bases are listed.
//   - PRONATOR TERES ("Pronator_teres..."): o/e markers -> "Pronator_tereso" /
//     "Pronator_terese"; the two heads keep their full names.
//   - PRONATOR QUADRATUS: belly clean, markers -> "Pronator_quadratuso/e".
//   - The EPICONDYLAR WRIST MOVERS (ECRL/ECRB/ECU/FCR/FCU/FDS) likewise erode
//     because none end in "_muscle": e.g. "Extensor_carpi_radialis_longuso/e".
//
// EPICONDYLAR GROUPS (didactic decision): the wrist movers that cross the elbow
// are taught as two GROUPS, not individual cards - the common flexor-pronator
// origin (golfer's elbow) and the common extensor origin (tennis elbow). Each
// group is ONE Muscle record whose meshBases union all its members' bases, so
// clicking any member highlights the whole group and resolves to the group's
// clinical card. The ULNAR heads of ECU/FCU are intentionally excluded (their
// origin is on the distal ulna, not the epicondyle; they belong to the
// forearm/wrist module).

import type { Muscle, MuscleRegion } from '../../types/muscle';

/* ===========================================================================
 * ELBOW FLEXORS
 * ======================================================================== */
const flexors: Muscle[] = [
  {
    id: 'biceps-brachii',
    name: 'Bíceps braquial',
    latin: 'Musculus biceps brachii',
    // Long + short head; shared insertion lives under "Biceps_brachii_muscle"
    // but that belongs to the SHOULDER region's record. Here we list the heads
    // (both cross to the radial tuberosity = elbow flexor/supinator).
    meshBases: ['Long_head_of_biceps_brachii', 'Short_head_of_biceps_brachii'],
    layer: 'muscles',
    depth: 2,
    groups: ['flexor'],
    origin:
      'Cabeza larga: tubérculo supraglenoideo de la escápula. Cabeza corta: apófisis coracoides.',
    insertion:
      'Tuberosidad del radio y, vía aponeurosis bicipital, a la fascia del antebrazo.',
    innervation: 'Nervio musculocutáneo',
    roots: ['C5', 'C6'],
    actions: [
      {
        joint: 'Codo',
        movement: 'Flexión',
        note: 'Flexor potente, máximo con el antebrazo supinado.',
      },
      {
        joint: 'Radio-cubital',
        movement: 'Supinación',
        note: 'Supinador más fuerte con el codo flexionado a 90°.',
      },
    ],
    clinicalNote:
      'La rotura del tendón distal produce debilidad de la supinación y un defecto palpable en la flexura; se explora con el hook test.',
  },
  {
    id: 'brachialis',
    name: 'Braquial',
    latin: 'Musculus brachialis',
    meshBases: ['Brachialis_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['flexor'],
    origin: 'Mitad distal de la cara anterior del húmero.',
    insertion: 'Tuberosidad del cúbito y cara anterior de la apófisis coronoides.',
    innervation: 'Nervio musculocutáneo (porción lateral, nervio radial)',
    roots: ['C5', 'C6'],
    actions: [
      {
        joint: 'Codo',
        movement: 'Flexión',
        note: 'Flexor puro y constante: actúa con independencia de la posición del antebrazo.',
      },
    ],
    clinicalNote:
      'Flexor más constante del codo ("caballo de tiro"). Tiende a la miositis osificante tras traumatismo o luxación del codo.',
  },
  {
    id: 'brachioradialis',
    name: 'Braquiorradial',
    latin: 'Musculus brachioradialis',
    meshBases: ['Brachioradialis_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor'],
    origin: 'Cresta supracondílea lateral del húmero.',
    insertion: 'Cara lateral del extremo distal del radio (sobre la estiloides).',
    innervation: 'Nervio radial',
    roots: ['C5', 'C6'],
    actions: [
      {
        joint: 'Codo',
        movement: 'Flexión',
        note: 'Eficaz con el antebrazo en posición neutra (pulgar arriba) y contra carga.',
      },
    ],
    clinicalNote:
      'Forma el límite lateral de la fosa cubital. Su reflejo explora la raíz C6. Inervado por el radial, útil para localizar lesiones nerviosas.',
  },
];

/* ===========================================================================
 * ELBOW EXTENSORS
 * ======================================================================== */
const extensors: Muscle[] = [
  {
    id: 'triceps-brachii',
    name: 'Tríceps braquial',
    latin: 'Musculus triceps brachii',
    // Three heads; shared insertion under "Triceps_brachii_muscle" belongs to
    // the shoulder record. All heads converge on the olecranon (elbow extensor)
    // so all three head bases are listed.
    meshBases: [
      'Long_head_of_triceps_brachii',
      'Lateral_head_of_triceps_brachii',
      'Medial_head_of_triceps_brachii',
    ],
    layer: 'muscles',
    depth: 1,
    groups: ['extensor'],
    origin:
      'Cabeza larga: tubérculo infraglenoideo de la escápula. Cabezas lateral y medial: cara posterior del húmero.',
    insertion: 'Olécranon del cúbito.',
    innervation: 'Nervio radial',
    roots: ['C6', 'C7', 'C8'],
    actions: [
      {
        joint: 'Codo',
        movement: 'Extensión',
        note: 'Extensor principal del codo; la cabeza medial es la trabajadora constante.',
      },
    ],
    clinicalNote:
      'El reflejo tricipital explora la raíz C7. La cabeza larga es biarticular: se preestira con el hombro flexionado, aumentando su eficacia.',
  },
  {
    id: 'anconeus',
    name: 'Ancóneo',
    latin: 'Musculus anconeus',
    meshBases: ['Anconeus_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['extensor'],
    origin: 'Cara posterior del epicóndilo lateral del húmero.',
    insertion: 'Cara lateral del olécranon y cara posterior proximal del cúbito.',
    innervation: 'Nervio radial',
    roots: ['C7', 'C8'],
    actions: [
      {
        joint: 'Codo',
        movement: 'Extensión',
        note: 'Asiste al tríceps; estabiliza el cúbito durante la prono-supinación.',
      },
    ],
    clinicalNote:
      'Reparo para el portal posterolateral en artroscopia de codo y para infiltración articular.',
  },
];

/* ===========================================================================
 * PRONO-SUPINATION (proximal radio-ulnar)
 * ======================================================================== */
const pronoSupination: Muscle[] = [
  {
    id: 'pronator-teres',
    name: 'Pronador redondo',
    latin: 'Musculus pronator teres',
    // Two heads (humeral + ulnar) keep full names; o/e markers erode to
    // "Pronator_tereso" / "Pronator_terese" (no "_muscle" to protect them).
    meshBases: [
      'Superficial_head_of_pronator_teres',
      'Superficial_head_of_pronator_teres_1',
      'Deep_head_of_pronator_teres',
      'Deep_head_of_pronator_teres_1',
      'Pronator_tereso',
      'Pronator_terese',
    ],
    layer: 'muscles',
    depth: 2,
    groups: ['flexor'],
    origin:
      'Cabeza humeral: epicóndilo medial (epitróclea). Cabeza cubital: apófisis coronoides.',
    insertion: 'Cara lateral del radio, en su punto medio.',
    innervation: 'Nervio mediano',
    roots: ['C6', 'C7'],
    actions: [
      {
        joint: 'Radio-cubital',
        movement: 'Pronación',
        note: 'Motor principal de la pronación rápida.',
      },
      { joint: 'Codo', movement: 'Flexión', note: 'Asistente débil.' },
    ],
    clinicalNote:
      'El nervio mediano pasa entre sus dos cabezas: punto del síndrome del pronador redondo.',
  },
  {
    id: 'pronator-quadratus',
    name: 'Pronador cuadrado',
    latin: 'Musculus pronator quadratus',
    meshBases: [
      'Pronator_quadratus',
      'Pronator_quadratus_1',
      'Pronator_quadratuso',
      'Pronator_quadratuse',
    ],
    layer: 'muscles',
    depth: 4,
    groups: ['flexor'],
    origin: 'Cuarto distal de la cara anterior del cúbito.',
    insertion: 'Cuarto distal de la cara anterior del radio.',
    innervation: 'Nervio interóseo anterior (rama del mediano)',
    roots: ['C7', 'C8'],
    actions: [
      {
        joint: 'Radio-cubital',
        movement: 'Pronación',
        note: 'Pronador primario: inicia y mantiene la pronación en todo el rango.',
      },
    ],
    clinicalNote:
      'Se afecta en el síndrome del interóseo anterior (Kiloh-Nevin). Coapta la articulación radio-cubital distal.',
  },
  {
    id: 'supinator',
    name: 'Supinador',
    latin: 'Musculus supinator',
    // No "_muscle": bare belly "Supinator" erodes to "Supinato", lateralized
    // belly "Supinatorl/r" -> "Supinator", markers -> "Supinatoro/e".
    meshBases: ['Supinato', 'Supinator', 'Supinatoro', 'Supinatore'],
    layer: 'muscles',
    depth: 3,
    groups: ['external-rotator'],
    origin:
      'Epicóndilo lateral, ligamentos colateral radial y anular, y cresta del supinador del cúbito.',
    insertion: 'Tercio proximal del radio (lo rodea).',
    innervation: 'Nervio interóseo posterior (ramo profundo del radial)',
    roots: ['C6', 'C7'],
    actions: [
      {
        joint: 'Radio-cubital',
        movement: 'Supinación',
        note: 'Supinador constante en movimientos lentos sin resistencia.',
      },
    ],
    clinicalNote:
      'El nervio interóseo posterior lo atraviesa por la arcada de Frohse: síndrome del túnel radial. Diagnóstico diferencial con la epicondilitis lateral.',
  },
];

/* ===========================================================================
 * EPICONDYLAR GROUPS (wrist movers crossing the elbow, taught as groups)
 * ======================================================================== */
const epicondylarGroups: Muscle[] = [
  {
    id: 'common-flexor-pronator-origin',
    name: 'Grupo flexor-pronador (epitróclea)',
    latin: 'Origo communis flexorum',
    // Members crossing the elbow from the medial epicondyle. Ulnar heads of FCU
    // excluded (distal-ulnar origin). Pronator teres bases are ALSO in its own
    // record above; listing here too means a click on it can resolve to either
    // - resolveMuscleId decides which card; the 3D highlight unions both.
    meshBases: [
      'Flexor_carpi_radialis',
      'Flexor_carpi_radialis_1',
      'Humeral_head_of_flexor_carpi_ulnaris',
      'Humeral_head_of_flexor_carpi_ulnaris_1',
      'Flexor_carpi_ulnarise',
      'Humero-ulnar_head_of_flexor_digitorum_superficialis',
      'Humero-ulnar_head_of_flexor_digitorum_superficialis_1',
      'Flexor_digitorum_superficialiso',
      'Flexor_digitorum_superficialise',
    ],
    layer: 'muscles',
    depth: 2,
    groups: ['flexor'],
    origin:
      'Tendón flexor común en el epicóndilo medial (epitróclea): pronador redondo, flexor radial del carpo, palmar largo, flexor cubital del carpo y cabeza húmero-cubital del flexor superficial de los dedos.',
    insertion:
      'Cada músculo tiene su inserción distal propia; la tracción común es sobre la epitróclea.',
    innervation: 'Nervio mediano (flexor cubital del carpo, nervio cubital)',
    roots: ['C6', 'C7', 'C8', 'T1'],
    actions: [
      {
        joint: 'Muñeca',
        movement: 'Flexión',
        note: 'Y pronación del antebrazo; estabilizadores dinámicos mediales del codo frente al valgo.',
      },
    ],
    clinicalNote:
      'Epicondilitis medial ("codo del golfista" / epitrocleítis). El nervio cubital discurre por detrás de la epitróclea: explorar siempre el túnel cubital.',
  },
  {
    id: 'common-extensor-origin',
    name: 'Grupo extensor (epicóndilo lateral)',
    latin: 'Origo communis extensorum',
    // Members crossing the elbow from the lateral epicondyle. Ulnar head of ECU
    // excluded (distal-ulnar origin).
    meshBases: [
      'Extensor_carpi_radialis_longus',
      'Extensor_carpi_radialis_longus_1',
      'Extensor_carpi_radialis_longuso',
      'Extensor_carpi_radialis_longuse',
      'Extensor_carpi_radialis_brevis',
      'Extensor_carpi_radialis_brevis_1',
      'Extensor_carpi_radialis_brevise',
      'Humeral_head_of_extensor_carpi_ulnaris',
      'Humeral_head_of_extensor_carpi_ulnaris_1',
      'Extensor_carpi_ulnarise',
      'Extensor_carpi_ulnariso',
    ],
    layer: 'muscles',
    depth: 1,
    groups: ['extensor'],
    origin:
      'Tendón extensor común en el epicóndilo lateral: extensor radial corto del carpo, extensor de los dedos, extensor del meñique y extensor cubital del carpo. El extensor radial largo nace algo más arriba en la cresta supracondílea.',
    insertion:
      'Cada músculo tiene su inserción distal propia; la tracción común es sobre el epicóndilo lateral.',
    innervation: 'Nervio radial y su ramo profundo (interóseo posterior)',
    roots: ['C6', 'C7', 'C8'],
    actions: [
      {
        joint: 'Muñeca',
        movement: 'Extensión',
        note: 'El extensor radial corto del carpo es el más implicado en la epicondilitis lateral.',
      },
    ],
    clinicalNote:
      'Epicondilitis lateral ("codo de tenista"). Diagnóstico diferencial con el síndrome del túnel radial (más distal, de origen nervioso).',
  },
];

export const elbowRegion: MuscleRegion = {
  id: 'elbow',
  name: 'Codo',
  muscles: [...flexors, ...extensors, ...pronoSupination, ...epicondylarGroups],
};

/** Flat export for convenience / lookups. */
export const elbowMuscles: Muscle[] = elbowRegion.muscles;
