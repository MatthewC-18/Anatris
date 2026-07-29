// src/data/ankleRom.ts
//
// Range-of-motion data for the ANKLE (talocrural) and subtalar joints, modeled
// as JOINT MOVEMENTS with a phase breakdown (see src/types/rom.ts). Analogue of
// src/data/hipRom.ts.
//
// AUTHORING RULES:
//   1. Degree ranges from Kapandji / Neumann conventions. Every Citation is
//      pageVerified:false until checked.
//   2. Muscle ids must match src/data/muscles/ankle.ts exactly (kebab-case).
//   3. Spanish, user-facing, concise prose.
//
// CLINICAL/DIDACTIC NOTES:
//   - Dorsi/plantarflexion happen at the TALOCRURAL (mortise) joint (sagittal);
//     inversion/eversion at the SUBTALAR joint (frontal). Real function is the
//     triplanar pronation/supination, but they are taught as the cardinal pairs.
//   - Plantarflexion (~50 deg) far exceeds dorsiflexion (~20 deg). The gastroc-
//     nemius loses power when the knee flexes (biarticular); the soleus does not.
//   - The main INVERTOR is tibialis posterior; the main EVERTORS are the
//     fibularis longus + brevis. Evertor weakness/laxity underlies the recurrent
//     LATERAL ankle sprain.
//   - Rig SIGNS are calibrated visually (boneMap needsVisualCheck): the axes +
//     ranges are correct; only +/- direction is confirmed once in the lab.

import type { RomMovement, RomMovementIndex } from '../types/rom';

/* ===========================================================================
 * DORSIFLEXION, 0 -> 20 deg, sagittal (talocrural)
 * ======================================================================== */
const dorsiflexion: RomMovement = {
  id: 'ankle-dorsiflexion',
  name: 'Dorsiflexión',
  joint: 'Talocrural',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 20 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'neumann', pageVerified: false }],
  overview:
    'Acercamiento del dorso del pie a la tibia. Rango pequeño (~20 grados) pero crítico para la marcha, la sentadilla y bajar escaleras. El tibial anterior es el motor; extensor de los dedos, del dedo gordo y peroneo anterior asisten. Su limitación (tríceps sural corto) altera la biomecánica de todo el miembro inferior.',
  region: 'ankle',
  rig: { axis: [1, 0, 0] },
  phases: [
    {
      startDeg: 0,
      endDeg: 10,
      label: 'Inicio',
      description:
        'El tibial anterior eleva el dorso del pie desde la posición neutra; controla también el descenso del antepié tras el choque de talón (contracción excéntrica en la marcha).',
      muscles: [
        { muscleId: 'tibialis-anterior', role: 'prime-mover', note: 'Dorsiflexor principal e invertor.' },
        { muscleId: 'extensor-digitorum-longus', role: 'assistant' },
        { muscleId: 'extensor-hallucis-longus', role: 'assistant' },
      ],
      cite: [{ ref: 'neumann', pageVerified: false }],
    },
    {
      startDeg: 10,
      endDeg: 20,
      label: 'Final',
      description:
        'La tensión del tríceps sural (gastrocnemio y sóleo) frena el arco. Con la rodilla extendida el gastrocnemio, biarticular, limita antes la dorsiflexión que con la rodilla flexionada.',
      muscles: [
        { muscleId: 'tibialis-anterior', role: 'prime-mover' },
        { muscleId: 'fibularis-tertius', role: 'assistant' },
      ],
      flag: {
        label: 'Freno del tríceps sural',
        detail: 'Un gastrocnemio/sóleo corto limita la dorsiflexión; se distingue con la rodilla extendida vs. flexionada (Silfverskiöld).',
        tone: 'pearl',
      },
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'tibialis-anterior',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.6 },
        { deg: 10, level: 0.9 },
        { deg: 20, level: 1 },
      ],
    },
    {
      muscleId: 'extensor-digitorum-longus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.4 },
        { deg: 10, level: 0.6 },
        { deg: 20, level: 0.65 },
      ],
    },
    {
      muscleId: 'extensor-hallucis-longus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 10, level: 0.55 },
        { deg: 20, level: 0.6 },
      ],
    },
    {
      muscleId: 'fibularis-tertius',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.3 },
        { deg: 10, level: 0.5 },
        { deg: 20, level: 0.55 },
      ],
    },
  ],
};

/* ===========================================================================
 * PLANTARFLEXION, 0 -> 50 deg, sagittal (talocrural)
 * ======================================================================== */
const plantarflexion: RomMovement = {
  id: 'ankle-plantarflexion',
  name: 'Flexión plantar',
  joint: 'Talocrural',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 50 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'neumann', pageVerified: false }],
  overview:
    'Alejamiento del dorso del pie de la tibia (ponerse de puntillas, despegue en la marcha). Rango amplio (~50 grados). El tríceps sural (gastrocnemio + sóleo, vía tendón de Aquiles) es el motor potente; peroneos, tibial posterior y flexores largos asisten. El gastrocnemio pierde potencia con la rodilla flexionada; el sóleo no.',
  region: 'ankle',
  rig: { axis: [1, 0, 0], sign: -1 },
  phases: [
    {
      startDeg: 0,
      endDeg: 25,
      label: 'Inicio - rango medio',
      description:
        'El tríceps sural dirige el descenso del talón y la puesta de puntillas. El sóleo domina en el control lento y postural; el gastrocnemio aporta la potencia rápida.',
      muscles: [
        { muscleId: 'gastrocnemius', role: 'prime-mover', note: 'Potencia rápida; más eficaz con la rodilla extendida.' },
        { muscleId: 'soleus', role: 'prime-mover', note: 'Motor postural; activo con la rodilla flexionada.' },
        { muscleId: 'tibialis-posterior', role: 'assistant' },
        { muscleId: 'fibularis-longus', role: 'assistant' },
      ],
      cite: [{ ref: 'neumann', pageVerified: false }],
    },
    {
      startDeg: 25,
      endDeg: 50,
      label: 'Final (despegue)',
      description:
        'Impulso final del despegue (push-off). Los flexores largos de los dedos y del dedo gordo añaden agarre y estabilizan el antepié; el aporte plantar del gastrocnemio decae si la rodilla se flexiona.',
      muscles: [
        { muscleId: 'gastrocnemius', role: 'prime-mover' },
        { muscleId: 'soleus', role: 'prime-mover' },
        { muscleId: 'flexor-hallucis-longus', role: 'assistant', note: 'Impulso del despegue.' },
        { muscleId: 'flexor-digitorum-longus', role: 'assistant' },
        { muscleId: 'plantaris', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'gastrocnemius',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.5 },
        { deg: 25, level: 0.95 },
        { deg: 50, level: 1 },
      ],
    },
    {
      muscleId: 'soleus',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.55 },
        { deg: 25, level: 0.95 },
        { deg: 50, level: 0.9 },
      ],
    },
    {
      muscleId: 'tibialis-posterior',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 25, level: 0.6 },
        { deg: 50, level: 0.6 },
      ],
    },
    {
      muscleId: 'fibularis-longus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 25, level: 0.6 },
        { deg: 50, level: 0.6 },
      ],
    },
    {
      muscleId: 'flexor-hallucis-longus',
      role: 'assistant',
      curve: [
        { deg: 20, level: 0.3 },
        { deg: 40, level: 0.6 },
        { deg: 50, level: 0.7 },
      ],
    },
    {
      muscleId: 'flexor-digitorum-longus',
      role: 'assistant',
      curve: [
        { deg: 20, level: 0.3 },
        { deg: 40, level: 0.55 },
        { deg: 50, level: 0.6 },
      ],
    },
    {
      muscleId: 'plantaris',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.2 },
        { deg: 25, level: 0.35 },
        { deg: 50, level: 0.4 },
      ],
    },
  ],
};

/* ===========================================================================
 * INVERSION, 0 -> 35 deg, frontal (subtalar)
 * ======================================================================== */
const inversion: RomMovement = {
  id: 'ankle-inversion',
  name: 'Inversión',
  joint: 'Subastragalina',
  plane: 'Frontal',
  totalRangeDeg: { min: 0, max: 35 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Giro de la planta hacia la línea media, en la articulación subastragalina. El tibial posterior es el invertor principal, con el tibial anterior y los flexores largos. Es el mecanismo del esguince de tobillo más frecuente (inversión forzada), que lesiona el ligamento peroneoastragalino anterior.',
  region: 'ankle',
  rig: { axis: [0, 1, 0] },
  phases: [
    {
      startDeg: 0,
      endDeg: 35,
      label: 'Arco completo',
      description:
        'El tibial posterior lleva la planta hacia dentro y sostiene el arco medial; el tibial anterior y los flexores largos de los dedos asisten. El rango pasivo excede al activo y es donde ocurre el esguince por inversión.',
      muscles: [
        { muscleId: 'tibialis-posterior', role: 'prime-mover', note: 'Invertor principal.' },
        { muscleId: 'tibialis-anterior', role: 'prime-mover', note: 'Dorsiflexor con componente invertor.' },
        { muscleId: 'flexor-digitorum-longus', role: 'assistant' },
        { muscleId: 'flexor-hallucis-longus', role: 'assistant' },
      ],
      flag: {
        label: 'Esguince por inversión',
        detail: 'La inversión forzada lesiona el ligamento peroneoastragalino anterior (el esguince más frecuente).',
        tone: 'warn',
      },
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'tibialis-posterior',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.55 },
        { deg: 18, level: 0.9 },
        { deg: 35, level: 1 },
      ],
    },
    {
      muscleId: 'tibialis-anterior',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.5 },
        { deg: 18, level: 0.8 },
        { deg: 35, level: 0.85 },
      ],
    },
    {
      muscleId: 'flexor-digitorum-longus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 18, level: 0.55 },
        { deg: 35, level: 0.6 },
      ],
    },
    {
      muscleId: 'flexor-hallucis-longus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.3 },
        { deg: 18, level: 0.5 },
        { deg: 35, level: 0.55 },
      ],
    },
  ],
};

/* ===========================================================================
 * EVERSION, 0 -> 15 deg, frontal (subtalar)
 * ======================================================================== */
const eversion: RomMovement = {
  id: 'ankle-eversion',
  name: 'Eversión',
  joint: 'Subastragalina',
  plane: 'Frontal',
  totalRangeDeg: { min: 0, max: 15 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Giro de la planta hacia fuera, en la articulación subastragalina. Rango menor que la inversión (~15 grados). Los peroneos largo y corto son los motores; asisten el peroneo anterior y el extensor de los dedos. Los peroneos protegen el tobillo frente al esguince por inversión: su debilidad favorece la inestabilidad crónica.',
  region: 'ankle',
  rig: { axis: [0, 1, 0], sign: -1 },
  phases: [
    {
      startDeg: 0,
      endDeg: 15,
      label: 'Arco completo',
      description:
        'Los peroneos largo y corto llevan la planta hacia fuera y estabilizan el tobillo. El peroneo anterior y el extensor de los dedos, evertores dorsiflexores, colaboran.',
      muscles: [
        { muscleId: 'fibularis-longus', role: 'prime-mover', note: 'Evertor principal; sostiene los arcos.' },
        { muscleId: 'fibularis-brevis', role: 'prime-mover', note: 'Evertor principal.' },
        { muscleId: 'fibularis-tertius', role: 'assistant' },
        { muscleId: 'extensor-digitorum-longus', role: 'assistant' },
      ],
      flag: {
        label: 'Protectores del tobillo',
        detail: 'La debilidad de los peroneos favorece la inestabilidad lateral crónica y el esguince recidivante.',
        tone: 'pearl',
      },
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'fibularis-longus',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.55 },
        { deg: 8, level: 0.9 },
        { deg: 15, level: 1 },
      ],
    },
    {
      muscleId: 'fibularis-brevis',
      role: 'prime-mover',
      curve: [
        { deg: 0, level: 0.55 },
        { deg: 8, level: 0.9 },
        { deg: 15, level: 1 },
      ],
    },
    {
      muscleId: 'fibularis-tertius',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.35 },
        { deg: 8, level: 0.6 },
        { deg: 15, level: 0.65 },
      ],
    },
    {
      muscleId: 'extensor-digitorum-longus',
      role: 'assistant',
      curve: [
        { deg: 0, level: 0.3 },
        { deg: 8, level: 0.5 },
        { deg: 15, level: 0.55 },
      ],
    },
  ],
};

/**
 * Ankle ROM movements, keyed by id. Same structure as HIP_ROM.
 */
export const ANKLE_ROM: RomMovementIndex = {
  'ankle-dorsiflexion': dorsiflexion,
  'ankle-plantarflexion': plantarflexion,
  'ankle-inversion': inversion,
  'ankle-eversion': eversion,
};

/** Convenience array for iterating/rendering all ankle movements. */
export const ANKLE_ROM_LIST: RomMovement[] = Object.values(ANKLE_ROM);
