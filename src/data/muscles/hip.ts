// src/data/muscles/hip.ts
//
// Hip muscle data - the 3D / ROM source of truth for the hip (coxofemoral)
// region. Analogue of src/data/muscles/knee.ts: each Muscle record carries the
// parseMeshName() base name(s) that resolve to its real meshes, so the viewer
// can highlight the complete muscle (both sides, all parts) from a stable id.
//
// +---------------------------------------------------------------------------+
// | CLINICAL CONTENT DISCLAIMER
// | origin / insertion / innervation / action fields are drafted from standard
// | anatomy (Kapandji / Neumann / Moore) as a STARTING POINT and must be
// | verified against an authoritative source before shipping. Treat as draft.
// +---------------------------------------------------------------------------+
//
// meshBases STATUS: VERIFIED against the real anatomy-index.json canonical
// names (public/anatomy-index.json). Each base was confirmed to be what
// parseMeshName() erodes the runtime mesh names down to:
//   - "<Name>_muscle" bellies erode cleanly (side l/r + o/e markers), so a
//     single "<Name>_muscle" base captures every part on both sides.
//   - Muscles NOT ending in "_muscle" (Psoas_major, Adductor_longus/magnus,
//     Tensor_fasciae_latae, Obturator_internus) keep a "_1" tendon/second-part
//     variant that parseMeshName does NOT fold (its tendon guard only fires for
//     "...muscle"/"...brachii"/etc.), so BOTH the clean base and the "_1"
//     variant are listed. Adductor magnus also ships its upper "(Adductor_
//     minimus)" slip as a bracketed mesh.
//
// DIDACTIC GROUPING (five functional families taught together):
//   - FLEXORS: iliopsoas (psoas major + iliacus) is the prime hip flexor;
//     rectus femoris, sartorius, tensor fasciae latae and pectineus assist.
//   - EXTENSOR + ABDUCTORS: gluteus maximus (prime extensor / external rotator);
//     gluteus medius + minimus are the frontal-plane pelvic stabilizers
//     (Trendelenburg), also internal rotators of their anterior fibers.
//   - ADDUCTORS: longus, brevis, magnus, gracilis, pectineus - the medial
//     compartment; magnus has an extra "hamstring" (ischiocondylar) portion.
//   - DEEP SIX external rotators: piriformis, obturator internus/externus,
//     superior/inferior gemellus, quadratus femoris - short lateral rotators
//     and dynamic stabilizers of the femoral head (the "rotator cuff" of the hip).
//
// The biarticular HAMSTRINGS (biceps femoris, semitendinosus, semimembranosus)
// are powerful hip extensors too, but they are authored in the KNEE region and
// only referenced here in prose, to avoid duplicating their cards.

import type { Muscle, MuscleRegion } from '../../types/muscle';

/* ===========================================================================
 * FLEXORS
 * ======================================================================== */
const flexors: Muscle[] = [
  {
    id: 'psoas-major',
    name: 'Psoas mayor',
    latin: 'Musculus psoas major',
    meshBases: ['Psoas_major', 'Psoas_major_1'],
    layer: 'muscles',
    depth: 3,
    groups: ['flexor'],
    origin:
      'Caras laterales de los cuerpos vertebrales y discos de T12-L4 y apófisis transversas de L1-L5.',
    insertion:
      'Trocánter menor del fémur (por el tendón común del iliopsoas con el ilíaco).',
    innervation: 'Ramos ventrales directos del plexo lumbar',
    roots: ['L1', 'L2', 'L3'],
    actions: [
      {
        joint: 'Cadera',
        movement: 'Flexión',
        note: 'Flexor más potente de la cadera; también rotador externo y estabilizador de la columna lumbar.',
      },
      {
        joint: 'Columna lumbar',
        movement: 'Flexión lateral',
        note: 'Con el fémur fijo, inclina y estabiliza el raquis lumbar.',
      },
    ],
    clinicalNote:
      'Su acortamiento (test de Thomas positivo) aumenta la lordosis lumbar y limita la extensión de cadera. Punto clave en pubalgia y dolor lumbar.',
  },
  {
    id: 'iliacus',
    name: 'Ilíaco',
    latin: 'Musculus iliacus',
    meshBases: ['Iliacus_muscle', 'Iliopsoas_muscle'],
    layer: 'muscles',
    depth: 3,
    groups: ['flexor'],
    origin: 'Fosa ilíaca y espina ilíaca anteroinferior.',
    insertion:
      'Trocánter menor del fémur, uniéndose al tendón del psoas mayor (tendón del iliopsoas).',
    innervation: 'Nervio femoral',
    roots: ['L2', 'L3'],
    actions: [
      {
        joint: 'Cadera',
        movement: 'Flexión',
        note: 'Junto al psoas forma el iliopsoas, flexor primario de la cadera.',
      },
    ],
    clinicalNote:
      'Componente ilíaco del iliopsoas; se explora en conjunto con el psoas (Thomas).',
  },
  {
    id: 'rectus-femoris',
    name: 'Recto femoral',
    latin: 'Musculus rectus femoris',
    meshBases: ['Rectus_femoris_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor', 'extensor'],
    origin:
      'Cabeza recta: espina ilíaca anteroinferior. Cabeza refleja: surco supraacetabular del ilion.',
    insertion:
      'Base de la rótula y, vía tendón rotuliano, a la tuberosidad tibial (tendón cuadricipital).',
    innervation: 'Nervio femoral',
    roots: ['L2', 'L3', 'L4'],
    actions: [
      {
        joint: 'Cadera',
        movement: 'Flexión',
        note: 'Único componente biarticular del cuádriceps; flexor de cadera además de extensor de rodilla.',
      },
      { joint: 'Rodilla', movement: 'Extensión' },
    ],
    clinicalNote:
      'Su tensión (insuficiencia pasiva) frena la flexión de rodilla con la cadera extendida; se elonga en el test de Ely.',
  },
  {
    id: 'sartorius',
    name: 'Sartorio',
    latin: 'Musculus sartorius',
    meshBases: ['Sartorius_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor', 'abductor', 'external-rotator'],
    origin: 'Espina ilíaca anterosuperior.',
    insertion:
      'Cara medial de la tibia proximal (pata de ganso), superficial al grácil y semitendinoso.',
    innervation: 'Nervio femoral',
    roots: ['L2', 'L3'],
    actions: [
      {
        joint: 'Cadera',
        movement: 'Flexión',
        note: 'Flexiona, abduce y rota externamente la cadera (posición de "sastre").',
      },
      { joint: 'Rodilla', movement: 'Flexión', note: 'Flexor débil y rotador interno de rodilla.' },
    ],
    clinicalNote: 'Músculo más largo del cuerpo; parte de la pata de ganso, referencia del triángulo femoral.',
  },
  {
    id: 'tensor-fasciae-latae',
    name: 'Tensor de la fascia lata',
    latin: 'Musculus tensor fasciae latae',
    meshBases: ['Tensor_fasciae_latae', 'Tensor_fasciae_latae_1'],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor', 'abductor', 'internal-rotator'],
    origin: 'Espina ilíaca anterosuperior y labio externo de la cresta ilíaca.',
    insertion:
      'Tracto iliotibial (banda iliotibial), que llega al tubérculo de Gerdy en la tibia.',
    innervation: 'Nervio glúteo superior',
    roots: ['L4', 'L5', 'S1'],
    actions: [
      { joint: 'Cadera', movement: 'Flexión', note: 'Flexiona, abduce y rota internamente la cadera.' },
      { joint: 'Cadera', movement: 'Abducción' },
    ],
    clinicalNote:
      'Tensa la banda iliotibial; implicado en el síndrome de la banda iliotibial y en la marcha antiálgica.',
  },
  {
    id: 'pectineus',
    name: 'Pectíneo',
    latin: 'Musculus pectineus',
    meshBases: ['Pectineus_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['flexor', 'adductor'],
    origin: 'Rama superior del pubis (línea pectínea).',
    insertion: 'Línea pectínea del fémur, distal al trocánter menor.',
    innervation: 'Nervio femoral (a veces también obturador)',
    roots: ['L2', 'L3'],
    actions: [
      { joint: 'Cadera', movement: 'Flexión' },
      { joint: 'Cadera', movement: 'Aducción', note: 'Flexor y aductor; puente entre ambos grupos.' },
    ],
    clinicalNote: 'Suelo del triángulo femoral; participa en la pubalgia del deportista.',
  },
];

/* ===========================================================================
 * EXTENSOR + ABDUCTORS (gluteal group)
 * ======================================================================== */
const glutealGroup: Muscle[] = [
  {
    id: 'gluteus-maximus',
    name: 'Glúteo mayor',
    latin: 'Musculus gluteus maximus',
    meshBases: ['Gluteus_maximus_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['extensor', 'external-rotator'],
    origin:
      'Cara posterior del ilion (tras la línea glútea posterior), fascia toracolumbar, sacro, cóccix y ligamento sacrotuberoso.',
    insertion:
      'Fibras superficiales al tracto iliotibial; fibras profundas a la tuberosidad glútea del fémur.',
    innervation: 'Nervio glúteo inferior',
    roots: ['L5', 'S1', 'S2'],
    actions: [
      {
        joint: 'Cadera',
        movement: 'Extensión',
        note: 'Extensor más potente, sobre todo desde flexión (subir escaleras, levantarse, correr).',
      },
      { joint: 'Cadera', movement: 'Rotación externa' },
    ],
    clinicalNote:
      'Su debilidad altera la extensión de cadera y sobrecarga los isquiotibiales/lumbares; clave en RTP y readaptación.',
  },
  {
    id: 'gluteus-medius',
    name: 'Glúteo medio',
    latin: 'Musculus gluteus medius',
    meshBases: ['Gluteus_medius_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['abductor', 'internal-rotator'],
    origin: 'Cara externa del ilion, entre las líneas glúteas anterior y posterior.',
    insertion: 'Cara lateral del trocánter mayor del fémur.',
    innervation: 'Nervio glúteo superior',
    roots: ['L4', 'L5', 'S1'],
    actions: [
      {
        joint: 'Cadera',
        movement: 'Abducción',
        note: 'Abductor principal; estabiliza la pelvis en el apoyo monopodal.',
      },
      {
        joint: 'Cadera',
        movement: 'Rotación interna',
        note: 'Fibras anteriores: rotación interna; posteriores: rotación externa.',
      },
    ],
    clinicalNote:
      'Su insuficiencia produce signo de Trendelenburg y marcha en báscula pélvica; foco de la tendinopatía glútea.',
  },
  {
    id: 'gluteus-minimus',
    name: 'Glúteo menor',
    latin: 'Musculus gluteus minimus',
    meshBases: ['Gluteus_minimus_muscle'],
    layer: 'muscles',
    depth: 3,
    groups: ['abductor', 'internal-rotator'],
    origin: 'Cara externa del ilion, entre las líneas glúteas anterior e inferior.',
    insertion: 'Borde anterior del trocánter mayor del fémur.',
    innervation: 'Nervio glúteo superior',
    roots: ['L4', 'L5', 'S1'],
    actions: [
      { joint: 'Cadera', movement: 'Abducción' },
      { joint: 'Cadera', movement: 'Rotación interna', note: 'Sinergista profundo del glúteo medio.' },
    ],
    clinicalNote: 'Estabilizador profundo; junto al medio forma el mecanismo abductor de la pelvis.',
  },
];

/* ===========================================================================
 * ADDUCTORS (medial compartment)
 * ======================================================================== */
const adductors: Muscle[] = [
  {
    id: 'adductor-longus',
    name: 'Aductor largo',
    latin: 'Musculus adductor longus',
    meshBases: ['Adductor_longus', 'Adductor_longus_1'],
    layer: 'muscles',
    depth: 2,
    groups: ['adductor'],
    origin: 'Cuerpo del pubis, debajo de la cresta púbica.',
    insertion: 'Tercio medio de la línea áspera del fémur.',
    innervation: 'Nervio obturador (rama anterior)',
    roots: ['L2', 'L3', 'L4'],
    actions: [
      { joint: 'Cadera', movement: 'Aducción', note: 'Aductor más anterior y palpable del grupo.' },
      { joint: 'Cadera', movement: 'Flexión', note: 'Asiste la flexión hasta ~70° y frena más allá.' },
    ],
    clinicalNote:
      'El más lesionado del grupo (pubalgia / "adductor strain"); su tendón proximal se palpa en el pliegue inguinal.',
  },
  {
    id: 'adductor-brevis',
    name: 'Aductor corto',
    latin: 'Musculus adductor brevis',
    meshBases: ['Adductor_brevis'],
    layer: 'muscles',
    depth: 3,
    groups: ['adductor'],
    origin: 'Cuerpo y rama inferior del pubis.',
    insertion: 'Línea pectínea y tercio proximal de la línea áspera del fémur.',
    innervation: 'Nervio obturador',
    roots: ['L2', 'L3', 'L4'],
    actions: [
      { joint: 'Cadera', movement: 'Aducción' },
      { joint: 'Cadera', movement: 'Flexión', note: 'Asistente de la flexión.' },
    ],
    clinicalNote: 'Separa las ramas anterior y posterior del nervio obturador (referencia quirúrgica).',
  },
  {
    id: 'adductor-magnus',
    name: 'Aductor mayor',
    latin: 'Musculus adductor magnus',
    meshBases: ['Adductor_magnus', 'Adductor_magnus_1', '(Adductor_minimus)'],
    layer: 'muscles',
    depth: 3,
    groups: ['adductor', 'extensor'],
    origin:
      'Porción aductora: rama isquiopúbica. Porción isquiocondílea ("hamstring"): tuberosidad isquiática.',
    insertion:
      'Línea áspera y línea pectínea (porción aductora) y tubérculo del aductor del cóndilo femoral medial (porción isquiocondílea).',
    innervation:
      'Porción aductora: nervio obturador. Porción isquiocondílea: parte tibial del nervio ciático.',
    roots: ['L2', 'L3', 'L4', 'L5'],
    actions: [
      { joint: 'Cadera', movement: 'Aducción', note: 'Aductor más potente del grupo.' },
      {
        joint: 'Cadera',
        movement: 'Extensión',
        note: 'La porción isquiocondílea extiende la cadera (comportamiento de isquiotibial).',
      },
    ],
    clinicalNote:
      'Doble inervación e hiato del aductor (paso de vasos femorales a poplíteos); punto de referencia vascular.',
  },
  {
    id: 'gracilis',
    name: 'Grácil',
    latin: 'Musculus gracilis',
    meshBases: ['Gracilis_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['adductor', 'flexor'],
    origin: 'Cuerpo y rama inferior del pubis.',
    insertion: 'Cara medial de la tibia proximal (pata de ganso).',
    innervation: 'Nervio obturador',
    roots: ['L2', 'L3'],
    actions: [
      { joint: 'Cadera', movement: 'Aducción', note: 'Único aductor biarticular.' },
      { joint: 'Rodilla', movement: 'Flexión', note: 'Flexor y rotador interno de rodilla (pata de ganso).' },
    ],
    clinicalNote: 'Injerto frecuente en reconstrucción de LCA; parte de la pata de ganso.',
  },
];

/* ===========================================================================
 * DEEP SIX external rotators (the "rotator cuff" of the hip)
 * ======================================================================== */
const deepRotators: Muscle[] = [
  {
    id: 'piriformis',
    name: 'Piriforme',
    latin: 'Musculus piriformis',
    meshBases: ['Piriformis_muscle'],
    layer: 'muscles',
    depth: 3,
    groups: ['external-rotator', 'abductor'],
    origin: 'Cara anterior del sacro (S2-S4), saliendo por la escotadura ciática mayor.',
    insertion: 'Borde superior del trocánter mayor del fémur.',
    innervation: 'Ramos del plexo sacro (nervio del piriforme, S1-S2)',
    roots: ['S1', 'S2'],
    actions: [
      { joint: 'Cadera', movement: 'Rotación externa', note: 'Rotador externo con la cadera extendida.' },
      {
        joint: 'Cadera',
        movement: 'Abducción',
        note: 'Con la cadera flexionada >90° pasa a abductor/rotador interno.',
      },
    ],
    clinicalNote:
      'Relación íntima con el nervio ciático (síndrome del piriforme); referencia de la región glútea profunda.',
  },
  {
    id: 'obturator-internus',
    name: 'Obturador interno',
    latin: 'Musculus obturatorius internus',
    meshBases: ['Obturator_internus', 'Obturator_internus_1'],
    layer: 'muscles',
    depth: 4,
    groups: ['external-rotator'],
    origin: 'Cara interna de la membrana obturatriz y márgenes óseos del agujero obturado.',
    insertion: 'Cara medial del trocánter mayor (fosa trocantérea), con los gemelos.',
    innervation: 'Nervio del obturador interno',
    roots: ['L5', 'S1'],
    actions: [{ joint: 'Cadera', movement: 'Rotación externa', note: 'Rota externamente y estabiliza la cabeza femoral.' }],
    clinicalNote: 'Sale por la escotadura ciática menor; forma con los gemelos el complejo tríceps coxal.',
  },
  {
    id: 'obturator-externus',
    name: 'Obturador externo',
    latin: 'Musculus obturatorius externus',
    meshBases: ['Obturator_externus'],
    layer: 'muscles',
    depth: 4,
    groups: ['external-rotator'],
    origin: 'Cara externa de la membrana obturatriz y márgenes del agujero obturado.',
    insertion: 'Fosa trocantérea del fémur.',
    innervation: 'Nervio obturador (rama posterior)',
    roots: ['L3', 'L4'],
    actions: [{ joint: 'Cadera', movement: 'Rotación externa', note: 'Rotador externo y estabilizador profundo.' }],
    clinicalNote: 'Único de los "seis" inervado por el obturador; cruza por debajo del cuello femoral.',
  },
  {
    id: 'superior-gemellus',
    name: 'Gemelo superior',
    latin: 'Musculus gemellus superior',
    meshBases: ['Superior_gemellus_muscle'],
    layer: 'muscles',
    depth: 4,
    groups: ['external-rotator'],
    origin: 'Espina isquiática.',
    insertion: 'Trocánter mayor, con el tendón del obturador interno.',
    innervation: 'Nervio del obturador interno',
    roots: ['L5', 'S1'],
    actions: [{ joint: 'Cadera', movement: 'Rotación externa' }],
    clinicalNote: 'Refuerza el tendón del obturador interno (complejo tríceps coxal).',
  },
  {
    id: 'inferior-gemellus',
    name: 'Gemelo inferior',
    latin: 'Musculus gemellus inferior',
    meshBases: ['Inferior_gemellus_muscle'],
    layer: 'muscles',
    depth: 4,
    groups: ['external-rotator'],
    origin: 'Tuberosidad isquiática.',
    insertion: 'Trocánter mayor, con el tendón del obturador interno.',
    innervation: 'Nervio del cuadrado femoral',
    roots: ['L5', 'S1'],
    actions: [{ joint: 'Cadera', movement: 'Rotación externa' }],
    clinicalNote: 'Sinergista de los rotadores externos profundos.',
  },
  {
    id: 'quadratus-femoris',
    name: 'Cuadrado femoral',
    latin: 'Musculus quadratus femoris',
    meshBases: ['Quadratus_femoris_muscle'],
    layer: 'muscles',
    depth: 4,
    groups: ['external-rotator', 'adductor'],
    origin: 'Borde lateral de la tuberosidad isquiática.',
    insertion: 'Cresta intertrocantérea (tubérculo cuadrado) del fémur.',
    innervation: 'Nervio del cuadrado femoral',
    roots: ['L5', 'S1'],
    actions: [
      { joint: 'Cadera', movement: 'Rotación externa', note: 'Rotador externo potente y estabilizador.' },
      { joint: 'Cadera', movement: 'Aducción' },
    ],
    clinicalNote: 'El más inferior de los rotadores profundos; puede comprimirse en el pinzamiento isquiofemoral.',
  },
];

/** The hip region: flexors + gluteal group + adductors + deep rotators. */
export const hipRegion: MuscleRegion = {
  id: 'hip',
  name: 'Cadera',
  muscles: [...flexors, ...glutealGroup, ...adductors, ...deepRotators],
};

/** Flat muscle list for the registries (musclesByRegion). */
export const hipMuscles: Muscle[] = hipRegion.muscles;
