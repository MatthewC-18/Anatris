// src/data/thoracicRom.ts
//
// Range-of-motion data for the THORACIC spine, modeled as JOINT MOVEMENTS with
// a phase breakdown (see src/types/rom.ts). Analogue of elbowRom.ts.
//
// AUTHORING / ENCODING RULE:
//   - User-facing strings: proper Latin American Spanish WITH accents and enie,
//     UTF-8 without BOM.
//   - Code, ids, keys, enum-like values: ASCII only.
//
// AUTHORING RULES:
//   1. Degree ranges are STANDARD REFERENCE values (Kapandji / Oatis), they vary
//      by source. Every Citation is pageVerified:false until checked.
//   2. Muscle ids match src/data/muscles/spine.ts exactly (kebab-case).
//
// GUEST MUSCLES (deliberate, didactic): trunk movement is NOT produced by the
// intrinsic spinal muscles alone. The abdominal wall (rectus abdominis,
// external/internal oblique) and quadratus lumborum LIVE in the lumbar
// sub-region but move the WHOLE trunk, so they appear here as participants in
// thoracic flexion / lateral flexion / rotation. They light up in 3D and the
// ROM panel shows their Spanish name (RomPanel resolves names via
// musclesForRomLookup, which spans the whole spine). They do NOT appear in the
// thoracic anatomical muscle LIST - only as ROM participants - so the anatomy
// list stays clean. Each guest carries a note saying it belongs to the lumbar
// region.
//
// DIDACTIC NOTES:
//   - Trunk FLEXION is concentrically driven by the abdominal wall, then
//     eccentrically controlled by the thoracic erector spinae once past the
//     balance point. The abdominal wall is the prime mover, not the extensors.
//   - Trunk ROTATION lives in the thoracic spine (the facets allow it). The
//     great rotators are the CROSSED obliques (external of one side + internal
//     of the other), a force couple - the deep rotatores/semispinalis fine-tune.
//
// Status: all movements authored. All page locators UNVERIFIED. Needs physio review.

import type { RomMovement, RomMovementIndex } from '../types/rom';

const flexion: RomMovement = {
  id: 'thoracic-flexion',
  name: 'Flexión',
  joint: 'Torácica',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 45 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
  overview:
    'Flexión de la columna torácica, hasta unos 30-45 grados, limitada por la caja torácica y la orientación de las carillas. La pared abdominal es el motor concéntrico que inicia y produce la flexión del tronco; una vez vencido el punto de equilibrio, el erector espinal torácico controla excéntricamente el descenso. Aunque la pared abdominal pertenece a la región lumbar, se ilumina aquí porque mueve todo el tronco.',
  region: 'thoracic',
  phases: [
    {
      startDeg: 0,
      endDeg: 20,
      label: 'Inicio (motor abdominal)',
      description:
        'La pared abdominal inicia la flexión del tronco concéntricamente: el recto del abdomen aproxima el tórax a la pelvis y los oblicuos colaboran. El erector torácico comienza a frenar excéntricamente.',
      muscles: [
        { muscleId: 'rectus-abdominis', role: 'prime-mover', note: 'Flexor principal del tronco; vive en la región lumbar pero flexiona todo el raquis.' },
        { muscleId: 'external-oblique', role: 'assistant', note: 'Pared abdominal: colabora en la flexión del tronco.' },
        { muscleId: 'internal-oblique', role: 'assistant', note: 'Pared abdominal: colabora en la flexión del tronco.' },
        { muscleId: 'longissimus-thoracis', role: 'stabilizer', note: 'Control excéntrico inicial del descenso.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 20,
      endDeg: 45,
      label: 'Rango medio-final (control excéntrico)',
      description:
        'Superado el equilibrio, la gravedad mueve el tronco hacia delante y el erector torácico y el transversoespinoso frenan excéntricamente el descenso, controlando la velocidad de la flexión hasta el tope de la caja torácica.',
      muscles: [
        { muscleId: 'longissimus-thoracis', role: 'prime-mover', note: 'Control excéntrico del descenso del tronco en flexión.' },
        { muscleId: 'iliocostalis-thoracis', role: 'assistant', note: 'Frena excéntricamente la flexión.' },
        { muscleId: 'multifidus-thoracis', role: 'stabilizer', note: 'Estabilización segmentaria durante la flexión.' },
        { muscleId: 'rectus-abdominis', role: 'assistant', note: 'Mantiene la tracción del tronco hacia la flexión.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

const extension: RomMovement = {
  id: 'thoracic-extension',
  name: 'Extensión',
  joint: 'Torácica',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 25 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
  overview:
    'Extensión de la columna torácica, hasta unos 20-25 grados, limitada por las apófisis espinosas y la caja torácica. El erector espinal torácico es el motor concéntrico; el transversoespinoso estabiliza segmento a segmento.',
  region: 'thoracic',
  phases: [
    {
      startDeg: 0,
      endDeg: 15,
      label: 'Inicio-medio',
      description:
        'El erector espinal torácico (longísimo, iliocostal y espinoso) extiende la columna concéntricamente, enderezando la cifosis torácica.',
      muscles: [
        { muscleId: 'longissimus-thoracis', role: 'prime-mover', note: 'Extensor antigravitatorio principal del tronco.' },
        { muscleId: 'iliocostalis-thoracis', role: 'prime-mover', note: 'Extiende la columna torácica.' },
        { muscleId: 'spinalis-thoracis', role: 'assistant', note: 'Extensión medial.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 15,
      endDeg: 25,
      label: 'Final',
      description:
        'Cerca del límite, el semiespinoso y los multífidos torácicos aseguran la extensión segmentaria mientras las apófisis espinosas se aproximan.',
      muscles: [
        { muscleId: 'semispinalis-thoracis', role: 'prime-mover', note: 'Extiende la columna torácica.' },
        { muscleId: 'multifidus-thoracis', role: 'assistant', note: 'Estabilización y extensión segmentaria.' },
        { muscleId: 'longissimus-thoracis', role: 'assistant', note: 'Mantiene la extensión.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

const lateralFlexion: RomMovement = {
  id: 'thoracic-lateral-flexion',
  name: 'Inclinación lateral',
  joint: 'Torácica',
  plane: 'Frontal',
  totalRangeDeg: { min: 0, max: 30 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
  overview:
    'Inclinación lateral de la columna torácica, hasta unos 20-30 grados, limitada por la caja torácica. El erector espinal y el oblicuo externo ipsilaterales producen el movimiento; el cuadrado lumbar fija la base y los músculos contralaterales frenan excéntricamente. Los abdominales y el cuadrado lumbar viven en la región lumbar pero participan en la inclinación de todo el tronco.',
  region: 'thoracic',
  phases: [
    {
      startDeg: 0,
      endDeg: 15,
      label: 'Inicio',
      description:
        'El iliocostal y el longísimo torácicos del lado hacia el que se inclina inician la inclinación; el oblicuo externo ipsilateral colabora aproximando las costillas a la pelvis.',
      muscles: [
        { muscleId: 'iliocostalis-thoracis', role: 'prime-mover', note: 'Inclinación lateral ipsilateral.' },
        { muscleId: 'external-oblique', role: 'assistant', note: 'Pared abdominal: aproxima la caja torácica a la pelvis del mismo lado.' },
        { muscleId: 'longissimus-thoracis', role: 'assistant', note: 'Asiste la inclinación ipsilateral.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 15,
      endDeg: 30,
      label: 'Rango medio-final',
      description:
        'El transversoespinoso ipsilateral completa la inclinación; el cuadrado lumbar fija la base lumbopélvica y el erector contralateral controla excéntricamente el final del rango.',
      muscles: [
        { muscleId: 'multifidus-thoracis', role: 'assistant', note: 'Inclinación y estabilización segmentaria.' },
        { muscleId: 'iliocostalis-thoracis', role: 'prime-mover', note: 'Completa la inclinación ipsilateral.' },
        { muscleId: 'quadratus-lumborum', role: 'stabilizer', note: 'Fija la base lumbopélvica durante la inclinación del tronco.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

const rotation: RomMovement = {
  id: 'thoracic-rotation',
  name: 'Rotación',
  joint: 'Torácica',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 35 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
  overview:
    'Rotación de la columna torácica, hasta unos 30-35 grados. Es la región del raquis donde más rotación se produce: la orientación de las carillas torácicas la favorece. El transversoespinoso contralateral es el motor profundo, pero el gran motor de la rotación del tronco son los oblicuos abdominales cruzados, que aunque pertenecen a la región lumbar rotan toda la caja torácica.',
  region: 'thoracic',
  phases: [
    {
      startDeg: 0,
      endDeg: 20,
      label: 'Inicio (motor profundo)',
      description:
        'Los rotadores y el semiespinoso torácico del lado opuesto inician la rotación segmento a segmento. Los rotadores son sobre todo órganos propioceptivos que afinan el movimiento.',
      muscles: [
        { muscleId: 'rotatores', role: 'prime-mover', note: 'Rotación segmentaria hacia el lado opuesto; función propioceptiva.' },
        { muscleId: 'semispinalis-thoracis', role: 'assistant', note: 'Rotación hacia el lado opuesto.' },
        { muscleId: 'multifidus-thoracis', role: 'assistant', note: 'Rotación contralateral y estabilización.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      startDeg: 20,
      endDeg: 35,
      label: 'Rango medio-final (motor abdominal)',
      description:
        'Los oblicuos cruzados generan la rotación potente del tronco: el oblicuo externo de un lado y el oblicuo interno del lado opuesto forman un par de fuerzas que gira la caja torácica. Es el motor real de gestos como lanzar o girar el tronco.',
      muscles: [
        { muscleId: 'external-oblique', role: 'prime-mover', note: 'Par rotador del tronco: el externo gira hacia el lado opuesto. Vive en la región lumbar.' },
        { muscleId: 'internal-oblique', role: 'prime-mover', note: 'Par rotador del tronco: el interno gira hacia el mismo lado. Vive en la región lumbar.' },
        { muscleId: 'semispinalis-thoracis', role: 'assistant', note: 'Rotación contralateral profunda.' },
        { muscleId: 'longissimus-thoracis', role: 'stabilizer', note: 'Estabiliza el lado ipsilateral durante la rotación.' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
  ],
};

/** Torácica ROM movements, keyed by id. */
export const THORACIC_ROM: RomMovementIndex = {
  'thoracic-flexion': flexion,
  'thoracic-extension': extension,
  'thoracic-lateral-flexion': lateralFlexion,
  'thoracic-rotation': rotation,
};

/** Convenience array for iterating/rendering all thoracic movements. */
export const THORACIC_ROM_LIST: RomMovement[] = Object.values(THORACIC_ROM);
