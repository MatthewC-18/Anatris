// src/data/elbowRom.ts
//
// Range-of-motion data for the elbow, modeled as JOINT MOVEMENTS with a phase
// breakdown (see src/types/rom.ts: degrees belong to the movement, muscles
// contribute to ranges). Analogue of src/data/shoulderRom.ts.
//
// AUTHORING / ENCODING RULE:
//   - User-facing strings (name, overview, label, description, note): proper
//     Latin American Spanish WITH accents and enie, in UTF-8.
//   - Code, ids, keys, enum-like values (id, muscleId, role, ref, joint, plane,
//     region) and comments: ASCII only.
//   - Editor MUST save as UTF-8 without BOM.
//
// AUTHORING RULES (same spirit as the clinical muscle content):
//   1. Degree ranges and phase boundaries are standard but vary by source.
//      Authored from Kapandji / Oatis conventions. NEVER invent a page; every
//      Citation is pageVerified:false until checked against your copy.
//   2. Muscle ids must match src/data/muscles/elbow.ts exactly (kebab-case).
//   3. Spanish, user-facing, concise prose.
//
// CLINICAL/DIDACTIC NOTES baked into the role assignments:
//   - The two elbow joints are taught as four movements: flexion + extension
//     (humero-ulnar / humero-radial) and pronation + supination (proximal
//     radio-ulnar). The pivot is different, so they are separate movements.
//   - The EPICONDYLAR GROUPS (common-flexor-pronator-origin,
//     common-extensor-origin) are PRIMARILY wrist movers, NOT elbow motors.
//     They appear here as STABILIZERS: the flexor-pronator mass resists valgus
//     stress, the extensor mass resists varus, dynamically protecting the elbow
//     through the flexion arc. Every such entry carries a `note` saying so, so
//     the student does not mistake them for prime movers of the elbow.
//   - BRACHIORADIALIS is most efficient near mid-flexion with the forearm in
//     neutral; it is an assistant, strongest against resistance.
//
// Status: all four movements authored with the same structure as the shoulder.
// All page locators UNVERIFIED (pageVerified:false). Needs physio review.

import type { RomMovement, RomMovementIndex } from '../types/rom';

/* ===========================================================================
 * FLEXION (humero-ulnar / humero-radial), 0 -> ~145 deg, sagittal
 * ======================================================================== */
const flexion: RomMovement = {
  id: 'elbow-flexion',
  name: 'Flexión',
  joint: 'Humero-ulnar y humero-radial',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 145 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'Flexión del antebrazo sobre el brazo en el plano sagital, hasta unos 145 grados de flexión activa. El braquial y el bíceps lideran; el braquiorradial asiste sobre todo contra resistencia y con el antebrazo en posición neutra. La masa flexora-pronadora de la epitróclea no flexiona el codo: estabiliza su cara medial frente al valgo.',
  region: 'elbow',
  phases: [
    {
      startDeg: 0,
      endDeg: 30,
      label: 'Inicio',
      description:
        'Desde la extensión, el braquial inicia la flexión como motor constante (actúa con independencia de la posición del antebrazo). El bíceps colabora, más eficaz si el antebrazo está supinado.',
      muscles: [
        {
          muscleId: 'brachialis',
          role: 'prime-mover',
          note: 'Flexor puro y constante del codo ("caballo de tiro").',
        },
        {
          muscleId: 'biceps-brachii',
          role: 'assistant',
          note: 'Más eficaz con el antebrazo supinado.',
        },
        {
          muscleId: 'common-flexor-pronator-origin',
          role: 'stabilizer',
          note: 'No flexiona el codo: estabiliza la cara medial frente al valgo.',
        },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      startDeg: 30,
      endDeg: 100,
      label: 'Rango medio',
      description:
        'Tramo de mayor ventaja mecánica. El bíceps y el braquial trabajan juntos como motores; el braquiorradial se suma con eficacia, sobre todo con el antebrazo en posición neutra (pulgar arriba) y contra carga.',
      muscles: [
        { muscleId: 'brachialis', role: 'prime-mover' },
        {
          muscleId: 'biceps-brachii',
          role: 'prime-mover',
          note: 'Máxima eficacia de flexión en el rango medio.',
        },
        {
          muscleId: 'brachioradialis',
          role: 'assistant',
          note: 'Eficaz en posición neutra y contra resistencia.',
        },
        {
          muscleId: 'common-flexor-pronator-origin',
          role: 'stabilizer',
          note: 'Estabilizador dinámico medial frente al valgo.',
        },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      startDeg: 100,
      endDeg: 145,
      label: 'Final',
      description:
        'Al final del arco la flexión se ve limitada por el choque de las partes blandas y la congruencia ósea. El braquial y el bíceps mantienen el esfuerzo en una posición de menor ventaja mecánica.',
      muscles: [
        { muscleId: 'brachialis', role: 'prime-mover' },
        { muscleId: 'biceps-brachii', role: 'assistant' },
        { muscleId: 'brachioradialis', role: 'assistant' },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],
};

/* ===========================================================================
 * EXTENSION (return from flexion), ~145 -> 0 deg, sagittal
 * ======================================================================== */
const extension: RomMovement = {
  id: 'elbow-extension',
  name: 'Extensión',
  joint: 'Humero-ulnar y humero-radial',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 145 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Extensión del antebrazo desde la flexión hasta la posición anatómica (0 grados). El tríceps es el extensor principal; el ancóneo lo asiste y estabiliza el cúbito. La masa extensora del epicóndilo lateral no extiende el codo: estabiliza su cara lateral frente al varo. El rango se mide desde la flexión máxima hacia 0; un valor negativo indicaría hiperextensión.',
  region: 'elbow',
  phases: [
    {
      startDeg: 0,
      endDeg: 30,
      label: 'Tramo final (cerca de 0 grados)',
      description:
        'En los últimos grados hasta la extensión completa, el tríceps trabaja en posición acortada. La cabeza medial es la porción constante; las cabezas lateral y larga se reclutan contra resistencia.',
      muscles: [
        {
          muscleId: 'triceps-brachii',
          role: 'prime-mover',
          note: 'La cabeza medial es la trabajadora constante de la extensión.',
        },
        {
          muscleId: 'anconeus',
          role: 'assistant',
          note: 'Asiste al tríceps y estabiliza el cúbito.',
        },
        {
          muscleId: 'common-extensor-origin',
          role: 'stabilizer',
          note: 'No extiende el codo: estabiliza la cara lateral frente al varo.',
        },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 30,
      endDeg: 100,
      label: 'Rango medio',
      description:
        'Tramo de mayor demanda del tríceps, que extiende desde la flexión contra la gravedad y la carga. La cabeza larga, biarticular, es más eficaz si el hombro está flexionado (preestiramiento).',
      muscles: [
        { muscleId: 'triceps-brachii', role: 'prime-mover' },
        { muscleId: 'anconeus', role: 'assistant' },
        {
          muscleId: 'common-extensor-origin',
          role: 'stabilizer',
          note: 'Estabilizador dinámico lateral frente al varo.',
        },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 100,
      endDeg: 145,
      label: 'Inicio (desde flexión máxima)',
      description:
        'Al iniciar la extensión desde la flexión máxima, el tríceps actúa preestirado, en buena ventaja mecánica para vencer la posición flexionada.',
      muscles: [
        {
          muscleId: 'triceps-brachii',
          role: 'prime-mover',
          note: 'Preestirado en flexión máxima: buena ventaja para iniciar.',
        },
        { muscleId: 'anconeus', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * PRONATION (proximal radio-ulnar), 0 -> ~85 deg, transverse
 * ======================================================================== */
const pronation: RomMovement = {
  id: 'elbow-pronation',
  name: 'Pronación',
  joint: 'Radio-cubital proximal (y distal)',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 85 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Rotación del antebrazo que lleva la palma hacia abajo, evaluada con el codo flexionado a 90 grados y pegado al cuerpo para anular la rotación del hombro. El pronador cuadrado inicia y mantiene; el pronador redondo se suma para los movimientos rápidos y contra resistencia.',
  region: 'elbow',
  phases: [
    {
      startDeg: 0,
      endDeg: 40,
      label: 'Inicio',
      description:
        'El pronador cuadrado es el pronador primario: inicia y mantiene la pronación en todo el rango, con bajo coste energético.',
      muscles: [
        {
          muscleId: 'pronator-quadratus',
          role: 'prime-mover',
          note: 'Pronador primario: inicia y sostiene la pronación.',
        },
        { muscleId: 'pronator-teres', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 40,
      endDeg: 85,
      label: 'Rango medio-final',
      description:
        'Para los movimientos rápidos o contra resistencia se recluta el pronador redondo, motor de la pronación potente. El nervio mediano pasa entre sus dos cabezas (síndrome del pronador redondo).',
      muscles: [
        {
          muscleId: 'pronator-teres',
          role: 'prime-mover',
          note: 'Motor de la pronación rápida y contra resistencia.',
        },
        {
          muscleId: 'pronator-quadratus',
          role: 'assistant',
          note: 'Mantiene la pronación en todo el arco.',
        },
        {
          muscleId: 'common-flexor-pronator-origin',
          role: 'stabilizer',
          note: 'La masa flexora-pronadora colabora y estabiliza la cara medial.',
        },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * SUPINATION (proximal radio-ulnar), 0 -> ~90 deg, transverse
 * ======================================================================== */
const supination: RomMovement = {
  id: 'elbow-supination',
  name: 'Supinación',
  joint: 'Radio-cubital proximal (y distal)',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 90 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Rotación del antebrazo que lleva la palma hacia arriba, evaluada con el codo a 90 grados pegado al cuerpo. El supinador actúa en movimientos lentos sin resistencia; el bíceps se suma como supinador potente cuando el codo está flexionado y hay carga.',
  region: 'elbow',
  phases: [
    {
      startDeg: 0,
      endDeg: 45,
      label: 'Inicio',
      description:
        'El supinador es el motor constante de la supinación en movimientos lentos y sin resistencia, con el codo en cualquier ángulo.',
      muscles: [
        {
          muscleId: 'supinator',
          role: 'prime-mover',
          note: 'Supinador constante en movimientos lentos sin resistencia.',
        },
        { muscleId: 'biceps-brachii', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 45,
      endDeg: 90,
      label: 'Rango medio-final',
      description:
        'Contra resistencia y con el codo flexionado a 90 grados, el bíceps se vuelve el supinador más potente; el supinador mantiene su aporte constante.',
      muscles: [
        {
          muscleId: 'biceps-brachii',
          role: 'prime-mover',
          note: 'Supinador más fuerte con el codo flexionado a 90 grados.',
        },
        {
          muscleId: 'supinator',
          role: 'assistant',
          note: 'Mantiene el aporte constante a la supinación.',
        },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
};

/**
 * Elbow ROM movements, keyed by id. Same structure as SHOULDER_ROM.
 */
export const ELBOW_ROM: RomMovementIndex = {
  'elbow-flexion': flexion,
  'elbow-extension': extension,
  'elbow-pronation': pronation,
  'elbow-supination': supination,
};

/** Convenience array for iterating/rendering all elbow movements. */
export const ELBOW_ROM_LIST: RomMovement[] = Object.values(ELBOW_ROM);
