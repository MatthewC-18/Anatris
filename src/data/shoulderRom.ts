// src/data/shoulderRom.ts
//
// Range-of-motion data for the shoulder, modeled as JOINT MOVEMENTS with a
// phase breakdown (see src/types/rom.ts for the rationale: degrees belong to
// the movement, muscles contribute to ranges).
//
// AUTHORING RULES (same spirit as the clinical muscle content):
//   1. Degree ranges and phase boundaries are standard but vary slightly by
//      source. They're authored from Kapandji/Oatis conventions. NEVER invent a
//      page; every Citation is pageVerified:false until checked in your copy.
//   2. Muscle ids must match src/data/muscles/shoulder.ts exactly (kebab-case).
//   3. Spanish, user-facing, concise prose.
//
// ENCODING / AUTHORING RULE:
//   - User-facing strings (name, joint, plane, overview, label, description,
//     note): Latin American Spanish WITH accents and enies, UTF-8.
//   - Code, ids, keys, enum-like values (id, muscleId, role, region, ref) and
//     comments: ASCII.
//   - Editor ALWAYS UTF-8 without BOM.
//
// Status: abduction authored in full as the reference template (its 3-phase arc
// is the clearest teaching case). Flexion + rotations authored with the same
// structure. All page locators UNVERIFIED.

import type { RomMovement, RomMovementIndex } from '../types/rom';

const abduction: RomMovement = {
  id: 'glenohumeral-abduction',
  name: 'Abducción',
  joint: 'Glenohumeral (con participación escapulotorácica)',
  plane: 'Frontal',
  totalRangeDeg: { min: 0, max: 180 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'La elevación del brazo en el plano frontal hasta 180° no es solo glenohumeral: combina movimiento en la articulación glenohumeral y rotación de la escápula sobre el tórax, en una proporción aproximada de 2:1 (ritmo escapulohumeral). Distintos músculos lideran en distintos tramos del arco.',
  region: 'shoulder',
  // Frontal plane -> rig local Z. Advisory data for markers/camera framing.
  rig: { axis: [0, 0, 1] },
  // Lab-only: the arc continues past neutral into cross-body ADDUCTION, so the
  // lab can sweep a signed abduccion/aduccion arc through 0.
  labReverse: {
    name: 'Aducción',
    minDeg: -30,
    phases: [
      {
        startDeg: -30,
        endDeg: 0,
        label: 'Aducción',
        description:
          'Desde la abducción, llevar el brazo hacia la línea media (y cruzarla) es trabajo del pectoral mayor, el dorsal ancho y el redondo mayor. El subescapular acompaña centrando la cabeza humeral.',
        muscles: [
          {
            muscleId: 'pectoralis-major',
            role: 'prime-mover',
            note: 'Aductor potente, sobre todo al cruzar la línea media.',
          },
          {
            muscleId: 'latissimus-dorsi',
            role: 'prime-mover',
            note: 'Aductor y extensor; desciende y aproxima el húmero.',
          },
          { muscleId: 'teres-major', role: 'assistant' },
          { muscleId: 'subscapularis', role: 'stabilizer' },
        ],
        cite: [
          { ref: 'kapandji', pageVerified: false },
          { ref: 'oatis', pageVerified: false },
        ],
      },
    ],
  },
  phases: [
    {
      startDeg: 0,
      endDeg: 15,
      label: 'Inicio',
      description:
        'El supraespinoso inicia el movimiento y centra la cabeza humeral, porque a 0° la línea de acción del deltoides es casi vertical y poco eficiente para abducir.',
      muscles: [
        {
          muscleId: 'supraspinatus',
          role: 'prime-mover',
          note: 'Inicia la abducción y comprime la cabeza humeral contra la glenoides.',
        },
        {
          muscleId: 'deltoid',
          role: 'assistant',
          note: 'Participa, pero con poca ventaja mecánica en este tramo.',
        },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      startDeg: 15,
      endDeg: 90,
      label: 'Rango medio',
      description:
        'El deltoides (porción media) se vuelve el motor principal. El manguito rotador actúa como par estabilizador, deprimiendo y centrando la cabeza humeral para que no ascienda contra el acromion.',
      muscles: [
        {
          muscleId: 'deltoid',
          role: 'prime-mover',
          note: 'Porción acromial (media): máxima eficiencia entre ~15° y 90°.',
        },
        {
          muscleId: 'supraspinatus',
          role: 'assistant',
          note: 'Sigue contribuyendo a la abducción y a la estabilización.',
        },
        {
          muscleId: 'infraspinatus',
          role: 'stabilizer',
          note: 'Con el subescapular, forma el par que centra la cabeza humeral.',
        },
        {
          muscleId: 'subscapularis',
          role: 'stabilizer',
        },
        {
          muscleId: 'teres-minor',
          role: 'stabilizer',
        },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      startDeg: 90,
      endDeg: 180,
      label: 'Final',
      description:
        'Por encima de los 90° la elevación depende de la rotación superior de la escápula: el trapecio y el serrato anterior giran la glenoides hacia arriba (ritmo escapulohumeral). Sin esta rotación escapular el brazo no llega a la vertical.',
      muscles: [
        {
          muscleId: 'trapezius',
          role: 'prime-mover',
          note: 'Fibras superiores e inferiores rotan superiormente la escápula.',
        },
        {
          muscleId: 'serratus-anterior',
          role: 'prime-mover',
          note: 'Junto con el trapecio, completa la rotación superior de la escápula.',
        },
        {
          muscleId: 'deltoid',
          role: 'assistant',
        },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],
};

const flexion: RomMovement = {
  id: 'glenohumeral-flexion',
  name: 'Flexión',
  joint: 'Glenohumeral (con participación escapulotorácica)',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 180 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Elevación del brazo hacia adelante en el plano sagital. Como en la abducción, los últimos grados dependen de la rotación superior de la escápula.',
  region: 'shoulder',
  // Sagittal plane -> rig local X.
  rig: { axis: [1, 0, 0] },
  // Lab-only: the arc continues past neutral into EXTENSION, so a flexion in the
  // lab arranca desde la extensión máxima y barre hasta la flexión completa.
  labReverse: {
    name: 'Extensión',
    minDeg: -60,
    phases: [
      {
        startDeg: -60,
        endDeg: 0,
        label: 'Extensión',
        description:
          'Llevar el brazo hacia atrás en el plano sagital lo realizan el dorsal ancho, el redondo mayor y la porción espinal (posterior) del deltoides; la porción larga del tríceps asiste desde la escápula.',
        muscles: [
          {
            muscleId: 'latissimus-dorsi',
            role: 'prime-mover',
            note: 'Principal extensor del hombro desde la flexión.',
          },
          {
            muscleId: 'deltoid',
            role: 'prime-mover',
            note: 'Porción espinal (posterior): extensor y rotador externo.',
          },
          { muscleId: 'teres-major', role: 'assistant' },
          {
            muscleId: 'triceps-brachii',
            role: 'assistant',
            note: 'Porción larga; cruza el hombro y asiste la extensión.',
          },
        ],
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
    ],
  },
  phases: [
    {
      startDeg: 0,
      endDeg: 60,
      label: 'Inicio',
      description:
        'La porción clavicular (anterior) del deltoides y el pectoral mayor (cabeza clavicular) impulsan los primeros grados de flexión.',
      muscles: [
        {
          muscleId: 'deltoid',
          role: 'prime-mover',
          note: 'Porción clavicular (anterior).',
        },
        {
          muscleId: 'pectoralis-major',
          role: 'assistant',
          note: 'Cabeza clavicular; flexiona el brazo desde la extensión.',
        },
        {
          muscleId: 'coracobrachialis',
          role: 'assistant',
        },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 60,
      endDeg: 120,
      label: 'Rango medio',
      description:
        'Continúa el deltoides anterior, mientras el manguito estabiliza la cabeza humeral y comienza a sumarse la rotación escapular.',
      muscles: [
        { muscleId: 'deltoid', role: 'prime-mover' },
        { muscleId: 'supraspinatus', role: 'stabilizer' },
        { muscleId: 'infraspinatus', role: 'stabilizer' },
        { muscleId: 'subscapularis', role: 'stabilizer' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 120,
      endDeg: 180,
      label: 'Final',
      description:
        'La rotación superior de la escápula (trapecio y serrato anterior) permite alcanzar la vertical.',
      muscles: [
        { muscleId: 'trapezius', role: 'prime-mover' },
        { muscleId: 'serratus-anterior', role: 'prime-mover' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
};

const externalRotation: RomMovement = {
  id: 'glenohumeral-external-rotation',
  name: 'Rotación externa',
  joint: 'Glenohumeral',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 80 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Rotación del húmero hacia afuera, evaluada con el codo flexionado a 90° y pegado al cuerpo. Rango aproximado de 80°, variable entre fuentes y sujetos.',
  region: 'shoulder',
  // Transverse plane -> rig local Y.
  rig: { axis: [0, 1, 0] },
  // Lab-only: the transverse arc continues past neutral into INTERNAL rotation,
  // so the rotation gesture sweeps the full internal<->external range.
  labReverse: {
    name: 'Rotación interna',
    minDeg: -100,
    phases: [
      {
        startDeg: -100,
        endDeg: 0,
        label: 'Rotación interna',
        description:
          'Hacia el lado interno del arco transversal, el subescapular es el rotador interno del manguito y el pectoral mayor, el dorsal ancho y el redondo mayor aportan potencia.',
        muscles: [
          {
            muscleId: 'subscapularis',
            role: 'prime-mover',
            note: 'Único componente anterior del manguito.',
          },
          { muscleId: 'pectoralis-major', role: 'assistant' },
          { muscleId: 'latissimus-dorsi', role: 'assistant' },
          { muscleId: 'teres-major', role: 'assistant' },
        ],
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
    ],
  },
  phases: [
    {
      startDeg: 0,
      endDeg: 80,
      label: 'Arco completo',
      description:
        'El infraespinoso y el redondo menor son los rotadores externos principales en todo el arco; el deltoides posterior asiste.',
      muscles: [
        {
          muscleId: 'infraspinatus',
          role: 'prime-mover',
          note: 'Principal rotador externo.',
        },
        {
          muscleId: 'teres-minor',
          role: 'prime-mover',
        },
        {
          muscleId: 'deltoid',
          role: 'assistant',
          note: 'Porción espinal (posterior).',
        },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
};

const internalRotation: RomMovement = {
  id: 'glenohumeral-internal-rotation',
  name: 'Rotación interna',
  joint: 'Glenohumeral',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 100 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Rotación del húmero hacia adentro. El rango efectivo es mayor que el de la rotación externa, en parte porque el tronco deja de limitar cuando la mano pasa por detrás.',
  region: 'shoulder',
  // Transverse plane -> rig local Y.
  rig: { axis: [0, 1, 0] },
  // Lab-only: the arc continues past neutral into EXTERNAL rotation.
  labReverse: {
    name: 'Rotación externa',
    minDeg: -80,
    phases: [
      {
        startDeg: -80,
        endDeg: 0,
        label: 'Rotación externa',
        description:
          'Hacia el lado externo del arco transversal, el infraespinoso y el redondo menor son los rotadores externos principales; el deltoides posterior asiste.',
        muscles: [
          { muscleId: 'infraspinatus', role: 'prime-mover' },
          { muscleId: 'teres-minor', role: 'prime-mover' },
          {
            muscleId: 'deltoid',
            role: 'assistant',
            note: 'Porción espinal (posterior).',
          },
        ],
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
    ],
  },
  phases: [
    {
      startDeg: 0,
      endDeg: 100,
      label: 'Arco completo',
      description:
        'El subescapular es el rotador interno principal del manguito; el pectoral mayor, el dorsal ancho y el redondo mayor son rotadores internos potentes que asisten.',
      muscles: [
        {
          muscleId: 'subscapularis',
          role: 'prime-mover',
          note: 'Único componente anterior del manguito.',
        },
        { muscleId: 'pectoralis-major', role: 'assistant' },
        { muscleId: 'latissimus-dorsi', role: 'assistant' },
        { muscleId: 'teres-major', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
};

/**
 * Shoulder ROM movements, keyed by id. Add elbow/other regions in their own
 * files following this same structure.
 */
export const SHOULDER_ROM: RomMovementIndex = {
  'glenohumeral-abduction': abduction,
  'glenohumeral-flexion': flexion,
  'glenohumeral-external-rotation': externalRotation,
  'glenohumeral-internal-rotation': internalRotation,
};

/** Convenience array for iterating/rendering all shoulder movements. */
export const SHOULDER_ROM_LIST: RomMovement[] = Object.values(SHOULDER_ROM);
