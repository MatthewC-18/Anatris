// src/data/muscles/knee.ts
//
// Knee muscle data - the 3D / ROM source of truth for the knee region. This is
// the analogue of src/data/muscles/elbow.ts: each Muscle record carries the
// parseMeshName() base name(s) that resolve to its real meshes, so the viewer
// can highlight the complete muscle (both sides, all parts) from a stable id.
//
// +---------------------------------------------------------------------------+
// | CLINICAL CONTENT DISCLAIMER
// | origin / insertion / innervation / action fields are drafted from standard
// | anatomy as a STARTING POINT and must be verified against an authoritative
// | source before shipping in a clinical product. Treat as draft copy.
// +---------------------------------------------------------------------------+
//
// meshBases STATUS: VERIFIED. Every base below was produced by running the real
// parseMeshName() + resolveMuscleId() logic over the actual Z-Anatomy mesh
// names extracted from the model. Result: 110/110 knee muscle meshes resolve to
// 13 muscles, 0 collisions, 0 unresolved.
//
// NON-OBVIOUS MESH TRAPS (verified, NOT invented):
//   - BICEPS FEMORIS is modeled as TWO SEPARATE HEADS plus a shared insertion
//     mesh. The long head is biarticular (extends hip + flexes knee); the short
//     head is uniarticular (flexes knee only) - a key clinical distinction.
//     Both heads + the common insertion "Biceps_femoris_muscle" are listed.
//     Because the head names end in "femoris" (NOT "_muscle"), parseMeshName's
//     PART_PREDECESSOR_RE does not fire, so the origin marker stays glued:
//     "Long head of biceps femoris.o" -> base "Long_head_of_biceps_femoriso".
//     Both the clean and the marker-glued bases are listed.
//   - GASTROCNEMIUS is modeled as TWO SEPARATE HEADS (medial + lateral). Same
//     "_gastrocnemius" (not "_muscle") trap: the origin marker stays glued, so
//     "Medial_head_of_gastrocnemiuso" is listed alongside the clean base.
//   - The remaining muscles end in "_muscle", so parseMeshName cleanly erodes
//     the o/e/l/r markers and a single "<Name>_muscle" base captures all parts.
//   - TENSOR FASCIAE LATAE is intentionally OMITTED as a card: in the GLB it is
//     an origin-only mesh and it acts on the knee indirectly via the iliotibial
//     tract, not as a direct knee motor. It is mentioned in the biomechanics
//     narration instead of inflating the muscle list.
//
// DIDACTIC GROUPING (four functional families taught together):
//   - QUADRICEPS (4): the sole knee extensors; vastus medialis obliquus guides
//     patellar tracking.
//   - HAMSTRINGS (3): biarticular knee flexors + hip extensors; also tibial
//     rotators (medial: semis; lateral: biceps femoris).
//   - TRICEPS SURAE + posterior (4): gastrocnemius is a knee flexor only when
//     the ankle is free; popliteus "unlocks" the screw-home mechanism.
//   - PES ANSERINUS (sartorius + gracilis + semitendinosus): the goose-foot
//     trio, medial knee flexors and internal rotators / dynamic valgus
//     restraints.

import type { Muscle, MuscleRegion } from '../../types/muscle';

/* ===========================================================================
 * QUADRICEPS - the knee extensors
 * ======================================================================== */
const quadriceps: Muscle[] = [
  {
    id: 'rectus-femoris',
    name: 'Recto femoral',
    latin: 'Musculus rectus femoris',
    meshBases: ['Rectus_femoris_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['extensor', 'flexor'],
    origin:
      'Cabeza recta: espina ilíaca anteroinferior. Cabeza refleja: surco supraacetabular del ilion.',
    insertion:
      'Base de la rótula y, vía tendón rotuliano, a la tuberosidad tibial; forma parte del tendón cuadricipital.',
    innervation: 'Nervio femoral',
    roots: ['L2', 'L3', 'L4'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Extensión',
        note: 'Único componente biarticular del cuádriceps; más eficaz como extensor con la cadera extendida.',
      },
      {
        joint: 'Cadera',
        movement: 'Flexión',
        note: 'Flexor accesorio de cadera; su tensión limita la flexión de rodilla con la cadera extendida.',
      },
    ],
    clinicalNote:
      'Su carácter biarticular explica la insuficiencia activa: no genera extensión máxima de rodilla con la cadera ya flexionada. Lesión frecuente en el deportista (sprint, patada).',
  },
  {
    id: 'vastus-lateralis',
    name: 'Vasto lateral',
    latin: 'Musculus vastus lateralis',
    meshBases: ['Vastus_lateralis_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['extensor'],
    origin:
      'Línea intertrocantérea, borde anterior e inferior del trocánter mayor, línea áspera (labio lateral).',
    insertion: 'Base y borde lateral de la rótula; tendón cuadricipital.',
    innervation: 'Nervio femoral',
    roots: ['L2', 'L3', 'L4'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Extensión',
        note: 'El vasto más voluminoso; tracción lateral sobre la rótula.',
      },
    ],
    clinicalNote:
      'Su tracción lateral debe equilibrarse con el vasto medial oblicuo; el desequilibrio favorece el síndrome femoropatelar y la subluxación lateral de rótula.',
  },
  {
    id: 'vastus-medialis',
    name: 'Vasto medial',
    latin: 'Musculus vastus medialis',
    meshBases: ['Vastus_medialis_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['extensor'],
    origin:
      'Línea intertrocantérea (mitad inferior), línea áspera (labio medial) y línea supracondílea medial.',
    insertion:
      'Borde medial de la rótula; sus fibras más distales y oblicuas forman el vasto medial oblicuo (VMO).',
    innervation: 'Nervio femoral',
    roots: ['L2', 'L3', 'L4'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Extensión',
        note: 'El VMO estabiliza la rótula en sentido medial, sobre todo en los últimos 30° de extensión.',
      },
    ],
    clinicalNote:
      'El VMO es el primer músculo en inhibirse tras derrame o dolor de rodilla; su reeducación es clave en el síndrome femoropatelar.',
  },
  {
    id: 'vastus-intermedius',
    name: 'Vasto intermedio',
    latin: 'Musculus vastus intermedius',
    meshBases: ['Vastus_intermedius_muscle'],
    layer: 'muscles',
    depth: 3,
    groups: ['extensor'],
    origin: 'Caras anterior y lateral de los dos tercios proximales del cuerpo del fémur.',
    insertion: 'Cara profunda del tendón cuadricipital y base de la rótula.',
    innervation: 'Nervio femoral',
    roots: ['L2', 'L3', 'L4'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Extensión',
        note: 'Extensor puro y profundo; su porción más distal (músculo articular de la rodilla) tensa la cápsula.',
      },
    ],
    clinicalNote:
      'El músculo articular de la rodilla, derivado de sus fibras distales, retrae la bolsa suprarrotuliana y evita su pinzamiento en la extensión.',
  },
];

/* ===========================================================================
 * HAMSTRINGS - biarticular knee flexors + tibial rotators
 * ======================================================================== */
const hamstrings: Muscle[] = [
  {
    id: 'biceps-femoris',
    name: 'Bíceps femoral',
    latin: 'Musculus biceps femoris',
    // Two separate heads + shared insertion. The head names end in "femoris"
    // (not "_muscle"), so the origin marker stays glued -> "...femoriso".
    meshBases: [
      'Long_head_of_biceps_femoris',
      'Long_head_of_biceps_femoriso',
      'Short_head_of_biceps_femoris',
      'Short_head_of_biceps_femorise',
      'Biceps_femoris_muscle',
    ],
    layer: 'muscles',
    depth: 2,
    groups: ['flexor', 'external-rotator'],
    origin:
      'Cabeza larga: tuberosidad isquiática (con el semitendinoso). Cabeza corta: línea áspera y línea supracondílea lateral del fémur.',
    insertion: 'Cabeza del peroné; algunas fibras al cóndilo tibial lateral.',
    innervation:
      'Cabeza larga: nervio tibial (ciático). Cabeza corta: nervio peroneo común (ciático).',
    roots: ['L5', 'S1', 'S2'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Flexión',
        note: 'Flexor; la cabeza corta es uniarticular (flexiona solo la rodilla).',
      },
      {
        joint: 'Rodilla',
        movement: 'Rotación externa de la tibia',
        note: 'Rotador externo de la tibia con la rodilla flexionada.',
      },
      {
        joint: 'Cadera',
        movement: 'Extensión',
        note: 'Solo la cabeza larga, biarticular; extiende la cadera.',
      },
    ],
    clinicalNote:
      'La doble inervación (tibial + peroneo común) de sus dos cabezas es única. La cabeza larga es la porción más lesionada en el "tirón de isquios" del sprint.',
  },
  {
    id: 'semitendinosus',
    name: 'Semitendinoso',
    latin: 'Musculus semitendinosus',
    meshBases: ['Semitendinosus_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor', 'internal-rotator'],
    origin: 'Tuberosidad isquiática (tendón común con la cabeza larga del bíceps femoral).',
    insertion: 'Cara medial de la tibia proximal, en la pata de ganso (con sartorio y gracilis).',
    innervation: 'Nervio tibial (ciático)',
    roots: ['L5', 'S1', 'S2'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Flexión',
        note: 'Flexor; su tendón largo y superficial es referencia palpable medial.',
      },
      {
        joint: 'Rodilla',
        movement: 'Rotación interna de la tibia',
        note: 'Rotador interno de la tibia con la rodilla flexionada.',
      },
      { joint: 'Cadera', movement: 'Extensión', note: 'Extensor de cadera, biarticular.' },
    ],
    clinicalNote:
      'Su tendón es el injerto autólogo más usado en la reconstrucción del LCA (a menudo con el del gracilis).',
  },
  {
    id: 'semimembranosus',
    name: 'Semimembranoso',
    latin: 'Musculus semimembranosus',
    meshBases: ['Semimembranosus_muscle'],
    layer: 'muscles',
    depth: 3,
    groups: ['flexor', 'internal-rotator'],
    origin: 'Tuberosidad isquiática (más profundo y proximal que el semitendinoso).',
    insertion:
      'Cara posteromedial del cóndilo tibial medial; expansiones al ligamento poplíteo oblicuo y al menisco medial.',
    innervation: 'Nervio tibial (ciático)',
    roots: ['L5', 'S1', 'S2'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Flexión',
        note: 'Flexor potente; tracciona el menisco medial hacia atrás protegiéndolo en la flexión.',
      },
      {
        joint: 'Rodilla',
        movement: 'Rotación interna de la tibia',
        note: 'Rotador interno de la tibia con la rodilla flexionada.',
      },
      { joint: 'Cadera', movement: 'Extensión', note: 'Extensor de cadera, biarticular.' },
    ],
    clinicalNote:
      'Sus expansiones forman parte del ángulo posteromedial, estabilizador clave; su bolsa puede dar el quiste de Baker en el hueco poplíteo.',
  },
];

/* ===========================================================================
 * TRICEPS SURAE + posterior knee (flexion / unlocking)
 * ======================================================================== */
const posterior: Muscle[] = [
  {
    id: 'gastrocnemius',
    name: 'Gastrocnemio',
    latin: 'Musculus gastrocnemius',
    // Two separate heads. Names end in "gastrocnemius" (not "_muscle"), so the
    // origin marker stays glued -> "...gastrocnemiuso".
    meshBases: [
      'Medial_head_of_gastrocnemius',
      'Medial_head_of_gastrocnemiuso',
      'Lateral_head_of_gastrocnemius',
      'Lateral_head_of_gastrocnemiuso',
    ],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor'],
    origin:
      'Cabeza medial: cara posterior del cóndilo femoral medial. Cabeza lateral: cara lateral del cóndilo femoral lateral.',
    insertion: 'Tendón calcáneo (de Aquiles), en la cara posterior del calcáneo.',
    innervation: 'Nervio tibial',
    roots: ['S1', 'S2'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Flexión',
        note: 'Flexor de rodilla solo cuando el tobillo está libre; biarticular.',
      },
      {
        joint: 'Tobillo',
        movement: 'Flexión plantar',
        note: 'Su acción principal; máxima eficacia con la rodilla extendida.',
      },
    ],
    clinicalNote:
      'Su carácter biarticular crea insuficiencia activa: la flexión plantar es débil con la rodilla flexionada. La cabeza medial es el sitio típico del "tennis leg" (desgarro).',
  },
  {
    id: 'soleus',
    name: 'Sóleo',
    latin: 'Musculus soleus',
    meshBases: ['Soleus_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['flexor'],
    origin: 'Línea del sóleo y borde medial de la tibia; cabeza y tercio proximal del peroné; arco tendinoso.',
    insertion: 'Tendón calcáneo (de Aquiles), con el gastrocnemio.',
    innervation: 'Nervio tibial',
    roots: ['S1', 'S2'],
    actions: [
      {
        joint: 'Tobillo',
        movement: 'Flexión plantar',
        note: 'Uniarticular: no cruza la rodilla; flexor plantar constante (control postural).',
      },
    ],
    clinicalNote:
      'Es la "bomba muscular" del retorno venoso de la pierna. No participa en la rodilla, pero se incluye por su relación con el tríceps sural y el diagnóstico diferencial del dolor posterior de pierna.',
  },
  {
    id: 'plantaris',
    name: 'Plantar delgado',
    latin: 'Musculus plantaris',
    meshBases: ['Plantaris_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['flexor'],
    origin: 'Línea supracondílea lateral del fémur, sobre la cabeza lateral del gastrocnemio.',
    insertion: 'Cara posterior del calcáneo, medial al tendón calcáneo.',
    innervation: 'Nervio tibial',
    roots: ['S1', 'S2'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Flexión',
        note: 'Asistente débil de la flexión de rodilla y la flexión plantar; rico en husos (propioceptor).',
      },
    ],
    clinicalNote:
      'Su vientre corto y tendón largo lo hacen susceptible de rotura ("tennis leg"); a menudo se confunde clínicamente con desgarro del gastrocnemio medial.',
  },
  {
    id: 'popliteus',
    name: 'Poplíteo',
    latin: 'Musculus popliteus',
    meshBases: ['Popliteus_muscle'],
    layer: 'muscles',
    depth: 3,
    groups: ['flexor', 'internal-rotator'],
    origin: 'Cara lateral del cóndilo femoral lateral y menisco lateral; ligamento poplíteo arqueado.',
    insertion: 'Cara posterior de la tibia, por encima de la línea del sóleo.',
    innervation: 'Nervio tibial',
    roots: ['L4', 'L5', 'S1'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Rotación interna de la tibia',
        note: '"Desbloquea" la rodilla: rota la tibia internamente (o el fémur externamente) para iniciar la flexión desde la extensión completa.',
      },
      {
        joint: 'Rodilla',
        movement: 'Flexión',
        note: 'Flexor débil; estabilizador posterolateral dinámico.',
      },
    ],
    clinicalNote:
      'Llave del mecanismo de tornillo (screw-home): sin su desbloqueo, la rodilla no puede flexionarse desde la extensión bloqueada. Tracciona el menisco lateral hacia atrás, protegiéndolo.',
  },
];

/* ===========================================================================
 * PES ANSERINUS - medial goose-foot (sartorius + gracilis; semitendinosus above)
 * ======================================================================== */
const pesAnserinus: Muscle[] = [
  {
    id: 'sartorius',
    name: 'Sartorio',
    latin: 'Musculus sartorius',
    meshBases: ['Sartorius_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor', 'internal-rotator'],
    origin: 'Espina ilíaca anterosuperior.',
    insertion: 'Cara medial de la tibia proximal, en la pata de ganso (el más anterior de los tres).',
    innervation: 'Nervio femoral',
    roots: ['L2', 'L3'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Flexión',
        note: 'Flexor débil; con el semitendinoso y el gracilis flexiona y rota internamente la tibia.',
      },
      {
        joint: 'Cadera',
        movement: 'Flexión',
        note: 'Flexor, abductor y rotador externo de cadera: lleva el talón a la rodilla opuesta ("posición del sastre").',
      },
    ],
    clinicalNote:
      'El músculo más largo del cuerpo; biarticular. Forma el límite lateral del triángulo femoral y el techo del conducto de los aductores.',
  },
  {
    id: 'gracilis',
    name: 'Recto interno (gracilis)',
    latin: 'Musculus gracilis',
    meshBases: ['Gracilis_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor', 'adductor', 'internal-rotator'],
    origin: 'Rama isquiopúbica (cuerpo y rama inferior del pubis).',
    insertion: 'Cara medial de la tibia proximal, en la pata de ganso (entre sartorio y semitendinoso).',
    innervation: 'Nervio obturador',
    roots: ['L2', 'L3'],
    actions: [
      {
        joint: 'Rodilla',
        movement: 'Flexión',
        note: 'Flexor y rotador interno de la tibia con la rodilla flexionada.',
      },
      { joint: 'Cadera', movement: 'Aducción', note: 'Único aductor biarticular que cruza la rodilla.' },
    ],
    clinicalNote:
      'Donante frecuente de injerto (con el semitendinoso) para el LCA, y de colgajos. La tendinitis de la pata de ganso da dolor medial de rodilla, distal a la interlínea.',
  },
];

export const kneeRegion: MuscleRegion = {
  id: 'knee',
  name: 'Rodilla',
  muscles: [...quadriceps, ...hamstrings, ...posterior, ...pesAnserinus],
};

/** Flat export for convenience / lookups. */
export const kneeMuscles: Muscle[] = kneeRegion.muscles;
