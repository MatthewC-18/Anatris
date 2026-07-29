// src/data/muscles/ankle.ts
//
// Ankle / foot muscle data - the 3D / ROM source of truth for the ankle region.
// Analogue of src/data/muscles/hip.ts.
//
// +---------------------------------------------------------------------------+
// | CLINICAL CONTENT DISCLAIMER
// | origin / insertion / innervation / action fields are drafted from standard
// | anatomy (Neumann / Kapandji / Moore) as a STARTING POINT and must be
// | verified against an authoritative source before shipping. Treat as draft.
// +---------------------------------------------------------------------------+
//
// meshBases STATUS: VERIFIED against the real anatomy-index.json canonical names.
//   - "<Name>_muscle" bellies (tibialis, fibularis, soleus, plantaris) erode
//     cleanly, so a single base captures both sides + all markers (the "_1"
//     tendon folds too).
//   - Names NOT ending in "_muscle" (Extensor/Flexor digitorum/hallucis longus,
//     the gastrocnemius heads) keep a "_1" variant parseMeshName does not fold,
//     so BOTH the clean base and the "_1" variant are listed.
//
// DIDACTIC GROUPING (four functional families):
//   - DORSIFLEXORS (anterior compartment): tibialis anterior (also invertor),
//     extensor digitorum longus, extensor hallucis longus, fibularis tertius.
//   - PLANTARFLEXORS - triceps surae: gastrocnemius (biarticular) + soleus, via
//     the Achilles tendon; plantaris assists.
//   - DEEP POSTERIOR (plantarflex + invert + support the arch): tibialis
//     posterior (main invertor), flexor digitorum longus, flexor hallucis longus.
//   - FIBULARIS (lateral compartment, evertors): fibularis longus + brevis.
//
// The POPLITEUS is a knee unlocker, not an ankle mover, so it lives in the knee
// region and is not repeated here.

import type { Muscle, MuscleRegion } from '../../types/muscle';

/* ===========================================================================
 * DORSIFLEXORS (anterior compartment) - deep fibular nerve
 * ======================================================================== */
const dorsiflexors: Muscle[] = [
  {
    id: 'tibialis-anterior',
    name: 'Tibial anterior',
    latin: 'Musculus tibialis anterior',
    meshBases: ['Tibialis_anterior_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor', 'adductor'],
    origin: 'Cóndilo lateral y mitad proximal de la cara lateral de la tibia, membrana interósea.',
    insertion: 'Cara medial y plantar del primer cuneiforme y base del primer metatarsiano.',
    innervation: 'Nervio fibular (peroneo) profundo',
    roots: ['L4', 'L5'],
    actions: [
      { joint: 'Tobillo', movement: 'Dorsiflexión', note: 'Dorsiflexor principal; controla el descenso del pie tras el choque de talón.' },
      { joint: 'Subastragalina', movement: 'Inversión' },
    ],
    clinicalNote:
      'Su debilidad (lesión del fibular profundo, L4-L5) causa pie caído y marcha en estepaje. Implicado en la periostitis tibial.',
  },
  {
    id: 'extensor-digitorum-longus',
    name: 'Extensor largo de los dedos',
    latin: 'Musculus extensor digitorum longus',
    meshBases: ['Extensor_digitorum_longus', 'Extensor_digitorum_longus_1', 'Tendon_of_extensor_digitorum_longus'],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor', 'abductor'],
    origin: 'Cóndilo lateral de la tibia, cara anterior de la fíbula y membrana interósea.',
    insertion: 'Falanges media y distal de los dedos 2.º a 5.º (expansión extensora).',
    innervation: 'Nervio fibular (peroneo) profundo',
    roots: ['L5', 'S1'],
    actions: [
      { joint: 'Tobillo', movement: 'Dorsiflexión', note: 'Asiste la dorsiflexión y la eversión.' },
      { joint: 'Dedos', movement: 'Extensión' },
    ],
    clinicalNote: 'Sus tendones son visibles en el dorso del pie durante la dorsiflexión resistida.',
  },
  {
    id: 'extensor-hallucis-longus',
    name: 'Extensor largo del dedo gordo',
    latin: 'Musculus extensor hallucis longus',
    meshBases: ['Extensor_hallucis_longus', 'Extensor_hallucis_longus_1'],
    layer: 'muscles',
    depth: 2,
    groups: ['flexor'],
    origin: 'Cara anterior media de la fíbula y membrana interósea.',
    insertion: 'Base de la falange distal del dedo gordo (hallux).',
    innervation: 'Nervio fibular (peroneo) profundo',
    roots: ['L5', 'S1'],
    actions: [
      { joint: 'Tobillo', movement: 'Dorsiflexión', note: 'Asiste la dorsiflexión.' },
      { joint: 'Dedo gordo', movement: 'Extensión' },
    ],
    clinicalNote: 'La extensión del hallux valora la raíz L5 (miotoma).',
  },
  {
    id: 'fibularis-tertius',
    name: 'Peroneo anterior (tercero)',
    latin: 'Musculus fibularis tertius',
    meshBases: ['Fibularis_tertius_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['flexor', 'abductor'],
    origin: 'Cara anterior distal de la fíbula (parte inferior del extensor de los dedos).',
    insertion: 'Base del quinto metatarsiano.',
    innervation: 'Nervio fibular (peroneo) profundo',
    roots: ['L5', 'S1'],
    actions: [
      { joint: 'Tobillo', movement: 'Dorsiflexión' },
      { joint: 'Subastragalina', movement: 'Eversión', note: 'Dorsiflexor y evertor; ayuda a despejar el pie en la marcha.' },
    ],
    clinicalNote: 'Inconstante (ausente en ~10%); único evertor inervado por el fibular profundo.',
  },
];

/* ===========================================================================
 * PLANTARFLEXORS - triceps surae (tibial nerve, via Achilles)
 * ======================================================================== */
const tricepsSurae: Muscle[] = [
  {
    id: 'gastrocnemius',
    name: 'Gastrocnemio',
    latin: 'Musculus gastrocnemius',
    meshBases: [
      'Medial_head_of_gastrocnemius',
      'Medial_head_of_gastrocnemius_1',
      'Lateral_head_of_gastrocnemius',
      'Lateral_head_of_gastrocnemius_1',
    ],
    layer: 'muscles',
    depth: 1,
    groups: ['extensor', 'flexor'],
    origin: 'Cabeza medial: cóndilo femoral medial. Cabeza lateral: cóndilo femoral lateral.',
    insertion: 'Tuberosidad del calcáneo por el tendón calcáneo (de Aquiles).',
    innervation: 'Nervio tibial',
    roots: ['S1', 'S2'],
    actions: [
      { joint: 'Tobillo', movement: 'Flexión plantar', note: 'Flexor plantar potente; más eficaz con la rodilla extendida.' },
      { joint: 'Rodilla', movement: 'Flexión', note: 'Biarticular: su tensión en flexión de rodilla reduce su potencia plantar.' },
    ],
    clinicalNote:
      'Biarticular: se elonga en dorsiflexión con la rodilla extendida (test de Silfverskiöld distingue gastrocnemio de sóleo).',
  },
  {
    id: 'soleus',
    name: 'Sóleo',
    latin: 'Musculus soleus',
    meshBases: ['Soleus_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['extensor'],
    origin: 'Cabeza y cuerpo posterior de la fíbula y línea del sóleo de la tibia.',
    insertion: 'Tuberosidad del calcáneo por el tendón calcáneo (de Aquiles).',
    innervation: 'Nervio tibial',
    roots: ['S1', 'S2'],
    actions: [
      { joint: 'Tobillo', movement: 'Flexión plantar', note: 'Flexor plantar principal; uniarticular, activo también con la rodilla flexionada. Bomba muscular venosa ("corazón periférico").' },
    ],
    clinicalNote:
      'No cruza la rodilla: su acortamiento se valora en dorsiflexión con la rodilla flexionada. Clave en el retorno venoso.',
  },
  {
    id: 'plantaris',
    name: 'Plantar delgado',
    latin: 'Musculus plantaris',
    meshBases: ['Plantaris_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['extensor', 'flexor'],
    origin: 'Línea supracondílea lateral del fémur, sobre la cabeza lateral del gastrocnemio.',
    insertion: 'Tuberosidad del calcáneo (medial al tendón de Aquiles).',
    innervation: 'Nervio tibial',
    roots: ['S1', 'S2'],
    actions: [
      { joint: 'Tobillo', movement: 'Flexión plantar', note: 'Aporte menor; asiste la flexión de rodilla.' },
    ],
    clinicalNote: 'Su rotura simula un "latigazo" en la pantorrilla ("tennis leg"); tendón largo usado como injerto.',
  },
];

/* ===========================================================================
 * DEEP POSTERIOR (plantarflex + invert + arch support) - tibial nerve
 * ======================================================================== */
const deepPosterior: Muscle[] = [
  {
    id: 'tibialis-posterior',
    name: 'Tibial posterior',
    latin: 'Musculus tibialis posterior',
    meshBases: ['Tibialis_posterior_muscle'],
    layer: 'muscles',
    depth: 3,
    groups: ['extensor', 'adductor'],
    origin: 'Membrana interósea y caras posteriores adyacentes de tibia y fíbula.',
    insertion: 'Tuberosidad del navicular y, en abanico, cuneiformes, cuboides y bases de metatarsianos medios.',
    innervation: 'Nervio tibial',
    roots: ['L4', 'L5'],
    actions: [
      { joint: 'Subastragalina', movement: 'Inversión', note: 'Invertor principal del pie.' },
      { joint: 'Tobillo', movement: 'Flexión plantar', note: 'Asiste la flexión plantar y sostiene el arco longitudinal medial.' },
    ],
    clinicalNote:
      'Su disfunción (DTP) es la causa más frecuente de pie plano adquirido del adulto; signo de "demasiados dedos".',
  },
  {
    id: 'flexor-digitorum-longus',
    name: 'Flexor largo de los dedos',
    latin: 'Musculus flexor digitorum longus',
    meshBases: ['Flexor_digitorum_longus', 'Flexor_digitorum_longus_1'],
    layer: 'muscles',
    depth: 3,
    groups: ['extensor'],
    origin: 'Cara posterior media de la tibia, distal a la línea del sóleo.',
    insertion: 'Bases de las falanges distales de los dedos 2.º a 5.º.',
    innervation: 'Nervio tibial',
    roots: ['L5', 'S1'],
    actions: [
      { joint: 'Dedos', movement: 'Flexión' },
      { joint: 'Tobillo', movement: 'Flexión plantar', note: 'Asiste flexión plantar e inversión; da agarre en la marcha.' },
    ],
    clinicalNote: 'Pasa por detrás del maléolo medial; su tendón cruza al FHL en el quiasma plantar (nudo de Henry).',
  },
  {
    id: 'flexor-hallucis-longus',
    name: 'Flexor largo del dedo gordo',
    latin: 'Musculus flexor hallucis longus',
    meshBases: ['Flexor_hallucis_longus', 'Flexor_hallucis_longus_1'],
    layer: 'muscles',
    depth: 3,
    groups: ['extensor'],
    origin: 'Cara posterior distal de la fíbula y membrana interósea.',
    insertion: 'Base de la falange distal del dedo gordo (hallux).',
    innervation: 'Nervio tibial',
    roots: ['L5', 'S1', 'S2'],
    actions: [
      { joint: 'Dedo gordo', movement: 'Flexión' },
      { joint: 'Tobillo', movement: 'Flexión plantar', note: 'Impulso final del despegue (push-off); sostiene el arco medial.' },
    ],
    clinicalNote: 'Tendinopatía del bailarín (pinzamiento posterior); pasa entre los tubérculos del astrágalo.',
  },
];

/* ===========================================================================
 * FIBULARIS (lateral compartment, evertors) - superficial fibular nerve
 * ======================================================================== */
const fibularis: Muscle[] = [
  {
    id: 'fibularis-longus',
    name: 'Peroneo largo',
    latin: 'Musculus fibularis longus',
    meshBases: ['Fibularis_longus_muscle'],
    layer: 'muscles',
    depth: 1,
    groups: ['extensor', 'abductor'],
    origin: 'Cabeza y dos tercios proximales de la cara lateral de la fíbula.',
    insertion: 'Cruza la planta hasta el primer cuneiforme y la base del primer metatarsiano.',
    innervation: 'Nervio fibular (peroneo) superficial',
    roots: ['L5', 'S1'],
    actions: [
      { joint: 'Subastragalina', movement: 'Eversión', note: 'Evertor principal.' },
      { joint: 'Tobillo', movement: 'Flexión plantar', note: 'Asiste la flexión plantar y sostiene los arcos transverso y longitudinal.' },
    ],
    clinicalNote: 'Rodea el maléolo lateral; estabiliza el tobillo frente a la inversión (protector del esguince lateral).',
  },
  {
    id: 'fibularis-brevis',
    name: 'Peroneo corto',
    latin: 'Musculus fibularis brevis',
    meshBases: ['Fibularis_brevis_muscle'],
    layer: 'muscles',
    depth: 2,
    groups: ['extensor', 'abductor'],
    origin: 'Dos tercios distales de la cara lateral de la fíbula.',
    insertion: 'Tuberosidad de la base del quinto metatarsiano.',
    innervation: 'Nervio fibular (peroneo) superficial',
    roots: ['L5', 'S1'],
    actions: [
      { joint: 'Subastragalina', movement: 'Eversión', note: 'Evertor principal junto al peroneo largo.' },
    ],
    clinicalNote:
      'Su inserción se avulsiona en la fractura de Jones / pseudo-Jones durante el esguince por inversión.',
  },
];

/** The ankle region: dorsiflexors + triceps surae + deep posterior + fibularis. */
export const ankleRegion: MuscleRegion = {
  id: 'ankle',
  name: 'Tobillo y pie',
  muscles: [...dorsiflexors, ...tricepsSurae, ...deepPosterior, ...fibularis],
};

/** Flat muscle list for the registries (musclesByRegion). */
export const ankleMuscles: Muscle[] = ankleRegion.muscles;
