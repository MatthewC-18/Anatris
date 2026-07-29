// src/data/hipRom.ts
//
// Range-of-motion data for the HIP (coxofemoral joint), modeled as JOINT
// MOVEMENTS with a phase breakdown (see src/types/rom.ts). Analogue of
// src/data/kneeRom.ts.
//
// AUTHORING / ENCODING RULE:
//   - User-facing strings (name, overview, label, description, note): Latin
//     American Spanish WITH accents and enie, in UTF-8.
//   - Code, ids, keys (id, muscleId, role, ref, joint, plane): ASCII only.
//
// AUTHORING RULES:
//   1. Degree ranges and phase boundaries are standard but vary by source.
//      Authored from Kapandji / Neumann / Oatis conventions. Every Citation is
//      pageVerified:false until checked against your copy.
//   2. Muscle ids must match src/data/muscles/hip.ts exactly (kebab-case).
//   3. Spanish, user-facing, concise prose.
//
// CLINICAL/DIDACTIC NOTES:
//   - The hip is a ball-and-socket (triaxial) joint. Six movements are taught:
//     flexion / extension (sagittal), abduction / adduction (frontal) and
//     internal / external rotation (transverse).
//   - FLEXION reaches ~120 deg with the knee flexed; with the knee EXTENDED it
//     stops near 90 deg because the (biarticular) hamstrings reach passive
//     insufficiency. The rectus femoris assists early and then, taut, limits it.
//   - EXTENSION is a small real range past neutral (~20 deg), driven by the
//     gluteus maximus and the biarticular hamstrings; the iliofemoral ligament
//     (Y of Bigelow) is its main passive brake.
//   - ABDUCTION / the pelvic-stabilizer role: the gluteus medius + minimus keep
//     the pelvis level in single-leg stance (their failure = Trendelenburg).
//   - The deep six (piriformis, obturators, gemelli, quadratus femoris) plus the
//     gluteus maximus are the external rotators; internal rotation is weaker and
//     driven by the anterior gluteus medius/minimus and the TFL.
//   - Rig SIGNS are calibrated visually in the lab (boneMap needsVisualCheck):
//     the KINEMATICS here are correct; the +/- direction is confirmed once.

import type { RomMovement, RomMovementIndex } from '../types/rom';

/* ===========================================================================
 * FLEXION, 0 -> 120 deg, sagittal
 * ======================================================================== */
const flexion: RomMovement = {
  id: 'hip-flexion',
  name: 'Flexión',
  joint: 'Coxofemoral',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 90 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'neumann', pageVerified: false },
  ],
  overview:
    'Acercamiento del muslo al tronco en el plano sagital. En el laboratorio el rig eleva la pierna con la RODILLA RECTA (elevación de pierna estirada), por lo que se muestra hasta ~90 grados, donde los isquiotibiales biarticulares frenan el arco (insuficiencia pasiva). La flexión activa real llega a ~120 grados solo con la rodilla flexionada, que relaja el recto femoral y los isquiotibiales. El iliopsoas es el motor principal; el recto femoral y el tensor de la fascia lata asisten al inicio.',
  region: 'hip',
  rig: { axis: [1, 0, 0] },
  phases: [
    {
      startDeg: 0,
      endDeg: 30,
      label: 'Inicio',
      description:
        'El iliopsoas inicia la flexión desde la posición neutra. El recto femoral, el sartorio y el tensor de la fascia lata colaboran; los aductores anteriores (largo, pectíneo) asisten en este primer tramo.',
      muscles: [
        { muscleId: 'psoas-major', role: 'prime-mover', note: 'Flexor primario junto al ilíaco (iliopsoas).' },
        { muscleId: 'iliacus', role: 'prime-mover' },
        { muscleId: 'rectus-femoris', role: 'assistant' },
        { muscleId: 'tensor-fasciae-latae', role: 'assistant' },
        { muscleId: 'pectineus', role: 'assistant' },
        { muscleId: 'adductor-longus', role: 'assistant', note: 'Asiste la flexión hasta ~70°.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 30,
      endDeg: 90,
      label: 'Rango medio',
      description:
        'Tramo de mayor eficacia del iliopsoas. El sartorio (flexión + abducción + rotación externa) y el recto femoral mantienen el movimiento. Con la rodilla extendida el arco se detiene cerca de aquí por la tensión de los isquiotibiales.',
      muscles: [
        { muscleId: 'psoas-major', role: 'prime-mover' },
        { muscleId: 'iliacus', role: 'prime-mover' },
        { muscleId: 'rectus-femoris', role: 'assistant' },
        { muscleId: 'sartorius', role: 'assistant' },
      ],
      flag: {
        label: 'Rodilla extendida',
        detail: 'Con la rodilla en extensión, la flexión se frena hacia 90° (insuficiencia pasiva de isquiotibiales).',
        tone: 'pearl',
      },
      cite: [{ ref: 'neumann', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'psoas-major',
      role: 'prime-mover',
      note: 'Motor de la flexión en todo el arco.',
      curve: [
        { deg: 0, level: 0.5 },
        { deg: 30, level: 0.85 },
        { deg: 90, level: 1 },
        { deg: 120, level: 0.9 },
      ],
    },
    {
      muscleId: 'iliacus',
      role: 'prime-mover',
      note: 'Componente ilíaco del iliopsoas.',
      curve: [
        { deg: 0, level: 0.5 },
        { deg: 30, level: 0.85 },
        { deg: 90, level: 1 },
        { deg: 120, level: 0.95 },
      ],
    },
    {
      muscleId: 'rectus-femoris',
      role: 'assistant',
      note: 'Asiste al inicio; su tensión limita el arco con la rodilla extendida.',
      curve: [
        { deg: 0, level: 0.4 },
        { deg: 30, level: 0.6 },
        { deg: 90, level: 0.4 },
        { deg: 120, level: 0.2 },
      ],
    },
    {
      muscleId: 'sartorius',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.3 },
        { deg: 45, level: 0.55 },
        { deg: 120, level: 0.5 },
      ],
    },
    {
      muscleId: 'tensor-fasciae-latae',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 30, level: 0.5 },
        { deg: 90, level: 0.3 },
      ],
    },
    {
      muscleId: 'pectineus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.3 },
        { deg: 30, level: 0.45 },
        { deg: 70, level: 0.2 },
      ],
    },
    {
      muscleId: 'adductor-longus',
      role: 'assistant',
      note: 'Asiste hasta ~70° y luego frena la flexión.',
      curve: [
        { deg: 0, level: 0.25 },
        { deg: 40, level: 0.4 },
        { deg: 70, level: 0.15 },
      ],
    },
  ],
};

/* ===========================================================================
 * EXTENSION, 0 -> 20 deg, sagittal (real range past neutral)
 * ======================================================================== */
const extension: RomMovement = {
  id: 'hip-extension',
  name: 'Extensión',
  joint: 'Coxofemoral',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 20 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'neumann', pageVerified: false },
  ],
  overview:
    'Desplazamiento del muslo por detrás del plano frontal. El rango activo es pequeño (~20 grados; algo más pasivo o con la rodilla flexionada) porque el ligamento iliofemoral (Y de Bigelow) lo frena pronto. El glúteo mayor es el motor principal, sobre todo desde flexión, con los isquiotibiales (biarticulares, descritos en la región de la rodilla) y la porción isquiocondílea del aductor mayor.',
  region: 'hip',
  rig: { axis: [1, 0, 0], sign: -1 },
  phases: [
    {
      startDeg: 0,
      endDeg: 10,
      label: 'Inicio',
      description:
        'Desde la posición neutra los isquiotibiales inician la extensión con bajo coste; el glúteo mayor entra cuando aumenta la demanda (subir escaleras, incorporarse).',
      muscles: [
        { muscleId: 'gluteus-maximus', role: 'prime-mover', note: 'Motor potente, sobre todo desde flexión de cadera.' },
        { muscleId: 'adductor-magnus', role: 'assistant', note: 'Su porción isquiocondílea extiende la cadera.' },
      ],
      cite: [{ ref: 'neumann', pageVerified: false }],
    },
    {
      startDeg: 10,
      endDeg: 20,
      label: 'Final',
      description:
        'El ligamento iliofemoral se tensa y limita la extensión; en bipedestación estabiliza la cadera casi sin gasto muscular ("apoyo pasivo"). Rango mayor con la rodilla flexionada.',
      muscles: [
        { muscleId: 'gluteus-maximus', role: 'prime-mover' },
      ],
      flag: {
        label: 'Freno ligamentoso',
        detail: 'El ligamento iliofemoral (Y de Bigelow) es el principal limitador de la extensión.',
        tone: 'pearl',
      },
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'gluteus-maximus',
      role: 'prime-mover',
      note: 'Motor de la extensión; se recluta más al aumentar la carga o desde flexión.',
      curve: [
        { deg: 0, level: 0.4 },
        { deg: 10, level: 0.8 },
        { deg: 20, level: 1 },
      ],
    },
    {
      muscleId: 'adductor-magnus',
      role: 'assistant',
      note: 'Porción isquiocondílea: extensor accesorio.',
      curve: [
        { deg: 0, level: 0.3 },
        { deg: 10, level: 0.5 },
        { deg: 20, level: 0.6 },
      ],
    },
  ],
};

/* ===========================================================================
 * ABDUCTION, 0 -> 45 deg, frontal
 * ======================================================================== */
const abduction: RomMovement = {
  id: 'hip-abduction',
  name: 'Abducción',
  joint: 'Coxofemoral',
  plane: 'Frontal',
  totalRangeDeg: { min: 0, max: 45 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'neumann', pageVerified: false }],
  overview:
    'Separación del muslo de la línea media en el plano frontal. El glúteo medio y el menor son los motores; el tensor de la fascia lata asiste. Su papel clínico clave es ESTABILIZAR la pelvis en el apoyo monopodal: si fallan, la pelvis cae al lado contrario (Trendelenburg). El límite lo marcan los aductores y el ligamento pubofemoral.',
  region: 'hip',
  rig: { axis: [0, 0, 1] },
  phases: [
    {
      startDeg: 0,
      endDeg: 25,
      label: 'Inicio - rango medio',
      description:
        'El glúteo medio y el menor separan el muslo. El tensor de la fascia lata y las fibras superiores del glúteo mayor colaboran.',
      muscles: [
        { muscleId: 'gluteus-medius', role: 'prime-mover', note: 'Abductor principal.' },
        { muscleId: 'gluteus-minimus', role: 'prime-mover' },
        { muscleId: 'tensor-fasciae-latae', role: 'assistant' },
        { muscleId: 'gluteus-maximus', role: 'assistant', note: 'Sus fibras superiores asisten la abducción.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 25,
      endDeg: 45,
      label: 'Final',
      description:
        'La tensión de los aductores y del ligamento pubofemoral frena el arco. En carga, el mecanismo abductor sostiene la pelvis nivelada durante la fase de apoyo de la marcha.',
      muscles: [
        { muscleId: 'gluteus-medius', role: 'prime-mover' },
        { muscleId: 'gluteus-minimus', role: 'assistant' },
      ],
      flag: {
        label: 'Trendelenburg',
        detail: 'La debilidad del glúteo medio hace caer la pelvis contralateral en el apoyo monopodal.',
        tone: 'warn',
      },
      cite: [{ ref: 'neumann', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'gluteus-medius',
      role: 'prime-mover',
      note: 'Abductor y estabilizador pélvico principal.',
      curve: [
        { deg: 0, level: 0.5 },
        { deg: 25, level: 1 },
        { deg: 45, level: 0.9 },
      ],
    },
    {
      muscleId: 'gluteus-minimus',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.45 },
        { deg: 25, level: 0.9 },
        { deg: 45, level: 0.8 },
      ],
    },
    {
      muscleId: 'tensor-fasciae-latae',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 25, level: 0.6 },
        { deg: 45, level: 0.55 },
      ],
    },
    {
      muscleId: 'gluteus-maximus',
      role: 'assistant',
      note: 'Fibras superiores.',
      curve: [
        { deg: 0, level: 0.2 },
        { deg: 25, level: 0.4 },
        { deg: 45, level: 0.45 },
      ],
    },
  ],
};

/* ===========================================================================
 * ADDUCTION, 0 -> 30 deg, frontal
 * ======================================================================== */
const adduction: RomMovement = {
  id: 'hip-adduction',
  name: 'Aducción',
  joint: 'Coxofemoral',
  plane: 'Frontal',
  totalRangeDeg: { min: 0, max: 20 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Aproximación del muslo a la línea media. Clínicamente la aducción pura alcanza ~30 grados cruzando por delante o detrás de la pierna contraria; en el laboratorio, con ambas piernas presentes y la rodilla recta, se muestra hasta ~20 grados para que el cruce se lea sin atravesar la pierna de apoyo. El compartimento medial es el motor: aductor mayor (el más potente), largo, corto, grácil y pectíneo.',
  region: 'hip',
  rig: { axis: [0, 0, 1], sign: -1 },
  phases: [
    {
      startDeg: 0,
      endDeg: 10,
      label: 'Inicio',
      description:
        'Desde una posición abducida, los aductores llevan el muslo hacia la línea media. El aductor mayor lidera; largo, corto, grácil y pectíneo colaboran.',
      muscles: [
        { muscleId: 'adductor-magnus', role: 'prime-mover', note: 'Aductor más potente.' },
        { muscleId: 'adductor-longus', role: 'prime-mover' },
        { muscleId: 'adductor-brevis', role: 'assistant' },
        { muscleId: 'gracilis', role: 'assistant' },
        { muscleId: 'pectineus', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 10,
      endDeg: 20,
      label: 'Final',
      description:
        'El muslo alcanza la línea media (clínicamente la cruza con algo de flexión o extensión para no chocar con el contralateral). Rango útil en gestos de cambio de dirección y en el control del valgo dinámico.',
      muscles: [
        { muscleId: 'adductor-magnus', role: 'prime-mover' },
        { muscleId: 'adductor-longus', role: 'assistant' },
      ],
      flag: {
        label: 'Pubalgia',
        detail: 'El aductor largo es el más lesionado (sobrecarga en cambios de dirección y patada).',
        tone: 'warn',
      },
      cite: [{ ref: 'neumann', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'adductor-magnus',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.6 },
        { deg: 15, level: 1 },
        { deg: 30, level: 0.9 },
      ],
    },
    {
      muscleId: 'adductor-longus',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.55 },
        { deg: 15, level: 0.9 },
        { deg: 30, level: 0.8 },
      ],
    },
    {
      muscleId: 'adductor-brevis',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.45 },
        { deg: 15, level: 0.75 },
        { deg: 30, level: 0.65 },
      ],
    },
    {
      muscleId: 'gracilis',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.4 },
        { deg: 15, level: 0.65 },
        { deg: 30, level: 0.6 },
      ],
    },
    {
      muscleId: 'pectineus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 15, level: 0.55 },
        { deg: 30, level: 0.45 },
      ],
    },
  ],
};

/* ===========================================================================
 * INTERNAL ROTATION, 0 -> 40 deg, transverse
 * ======================================================================== */
const internalRotation: RomMovement = {
  id: 'hip-internal-rotation',
  name: 'Rotación interna',
  joint: 'Coxofemoral',
  plane: 'Transverso',
  totalRangeDeg: { min: 0, max: 40 },
  rangeCite: [{ ref: 'neumann', pageVerified: false }],
  overview:
    'Giro del muslo hacia dentro alrededor del eje longitudinal (se evalúa habitualmente con la cadera y la rodilla a 90°). No hay rotadores internos "puros": la producen las fibras anteriores del glúteo medio y menor y el tensor de la fascia lata. Su pérdida temprana es un signo sensible de artrosis y de pinzamiento femoroacetabular (FAI).',
  region: 'hip',
  rig: { axis: [0, 1, 0] },
  phases: [
    {
      startDeg: 0,
      endDeg: 40,
      label: 'Arco completo',
      description:
        'Las fibras anteriores del glúteo medio y menor y el tensor de la fascia lata rotan el muslo internamente. Los aductores contribuyen de forma variable según la posición de la cadera.',
      muscles: [
        { muscleId: 'gluteus-minimus', role: 'prime-mover', note: 'Fibras anteriores: rotación interna.' },
        { muscleId: 'gluteus-medius', role: 'prime-mover', note: 'Fibras anteriores.' },
        { muscleId: 'tensor-fasciae-latae', role: 'assistant' },
      ],
      flag: {
        label: 'Signo de FAI / artrosis',
        detail: 'La rotación interna limitada y dolorosa (FADIR) orienta a pinzamiento femoroacetabular o artrosis.',
        tone: 'warn',
      },
      cite: [{ ref: 'neumann', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'gluteus-minimus',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.5 },
        { deg: 20, level: 0.9 },
        { deg: 40, level: 1 },
      ],
    },
    {
      muscleId: 'gluteus-medius',
      role: 'prime-mover',
      note: 'Fibras anteriores.',
      curve: [
        { deg: 0, level: 0.45 },
        { deg: 20, level: 0.8 },
        { deg: 40, level: 0.9 },
      ],
    },
    {
      muscleId: 'tensor-fasciae-latae',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 20, level: 0.6 },
        { deg: 40, level: 0.65 },
      ],
    },
  ],
};

/* ===========================================================================
 * EXTERNAL ROTATION, 0 -> 45 deg, transverse
 * ======================================================================== */
const externalRotation: RomMovement = {
  id: 'hip-external-rotation',
  name: 'Rotación externa',
  joint: 'Coxofemoral',
  plane: 'Transverso',
  totalRangeDeg: { min: 0, max: 45 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'neumann', pageVerified: false }],
  overview:
    'Giro del muslo hacia fuera. La producen los "seis profundos" (piriforme, obturadores interno y externo, gemelos superior e inferior y cuadrado femoral) junto al glúteo mayor. Actúan además como estabilizadores dinámicos de la cabeza femoral (el "manguito rotador" de la cadera).',
  region: 'hip',
  rig: { axis: [0, 1, 0], sign: -1 },
  phases: [
    {
      startDeg: 0,
      endDeg: 45,
      label: 'Arco completo',
      description:
        'Los rotadores profundos rotan el muslo externamente y centran la cabeza femoral; el glúteo mayor añade potencia. El piriforme cambia a abductor/rotador interno cuando la cadera está flexionada más de 90°.',
      muscles: [
        { muscleId: 'gluteus-maximus', role: 'prime-mover', note: 'Rotador externo potente.' },
        { muscleId: 'piriformis', role: 'prime-mover' },
        { muscleId: 'quadratus-femoris', role: 'prime-mover' },
        { muscleId: 'obturator-internus', role: 'assistant' },
        { muscleId: 'obturator-externus', role: 'assistant' },
        { muscleId: 'superior-gemellus', role: 'assistant' },
        { muscleId: 'inferior-gemellus', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'gluteus-maximus',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.4 },
        { deg: 25, level: 0.8 },
        { deg: 45, level: 1 },
      ],
    },
    {
      muscleId: 'piriformis',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.5 },
        { deg: 25, level: 0.85 },
        { deg: 45, level: 0.9 },
      ],
    },
    {
      muscleId: 'quadratus-femoris',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.5 },
        { deg: 25, level: 0.85 },
        { deg: 45, level: 0.9 },
      ],
    },
    {
      muscleId: 'obturator-internus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.4 },
        { deg: 25, level: 0.7 },
        { deg: 45, level: 0.75 },
      ],
    },
    {
      muscleId: 'obturator-externus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.4 },
        { deg: 25, level: 0.65 },
        { deg: 45, level: 0.7 },
      ],
    },
    {
      muscleId: 'superior-gemellus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 25, level: 0.6 },
        { deg: 45, level: 0.65 },
      ],
    },
    {
      muscleId: 'inferior-gemellus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 25, level: 0.6 },
        { deg: 45, level: 0.65 },
      ],
    },
  ],
};

/**
 * Hip ROM movements, keyed by id. Same structure as KNEE_ROM.
 */
export const HIP_ROM: RomMovementIndex = {
  'hip-flexion': flexion,
  'hip-extension': extension,
  'hip-abduction': abduction,
  'hip-adduction': adduction,
  'hip-internal-rotation': internalRotation,
  'hip-external-rotation': externalRotation,
};

/** Convenience array for iterating/rendering all hip movements. */
export const HIP_ROM_LIST: RomMovement[] = Object.values(HIP_ROM);
