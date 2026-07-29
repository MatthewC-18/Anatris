// src/data/kneeRom.ts
//
// Range-of-motion data for the knee, modeled as JOINT MOVEMENTS with a phase
// breakdown (see src/types/rom.ts: degrees belong to the movement, muscles
// contribute to ranges). Analogue of src/data/elbowRom.ts.
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
//   2. Muscle ids must match src/data/muscles/knee.ts exactly (kebab-case).
//   3. Spanish, user-facing, concise prose.
//
// CLINICAL/DIDACTIC NOTES baked into the role assignments:
//   - The knee is taught as four movements: flexion + extension (femoro-tibial,
//     sagittal) and tibial internal + external rotation (only available with
//     the knee FLEXED; the extended knee is locked by the screw-home mechanism).
//   - SCREW-HOME (mecanismo de tornillo): the last ~30 deg of extension forces
//     ~10 deg of automatic tibial EXTERNAL rotation that locks the joint. The
//     POPLITEUS "unlocks" it by rotating the tibia internally to begin flexion.
//     This is why popliteus leads the very first phase of flexion.
//   - GASTROCNEMIUS flexes the knee only when the ankle is free; it is an
//     assistant, listed with a note. SOLEUS does NOT cross the knee and never
//     appears here.
//   - HAMSTRING ROTATION RULE: with the knee flexed, the MEDIAL hamstrings
//     (semitendinosus, semimembranosus) + popliteus + the goose-foot
//     (sartorius, gracilis) rotate the tibia INTERNALLY; the LATERAL hamstring
//     (biceps femoris) rotates it EXTERNALLY.
//   - RECTUS FEMORIS is the only biarticular quadriceps head; it appears in
//     extension with a note about active insufficiency when the hip is flexed.
//
// Status: all four movements authored with the same structure as the elbow.
// All page locators UNVERIFIED (pageVerified:false). Needs physio review.

import type { RomMovement, RomMovementIndex } from '../types/rom';

/* ===========================================================================
 * FLEXION (femoro-tibial), 0 -> ~105 deg SHOWN in the lab, sagittal
 *
 * IMPORTANT: 105 deg is a MODEL/mesh limit, not the clinical ROM. The rig folds
 * the calf as a rigid block with no soft-tissue compression, so past ~110 deg the
 * calf mesh drives THROUGH the thigh. 105 deg is where this figure's calf meets its
 * thigh, so the lab stops there and reads clean. The TRUE active ROM is ~120 deg
 * with the hip extended (rectus femoris limit), ~140 deg with the hip flexed, and
 * ~160 deg passive (heel to buttock) -- stated in the overview so teaching stays
 * honest. See boneMap.ts knee-flexion for the interpenetration measurements.
 * ======================================================================== */
const flexion: RomMovement = {
  id: 'knee-flexion',
  name: 'Flexión',
  joint: 'Femorotibial',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 105 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'Flexión de la pierna sobre el muslo en el plano sagital. En el modelo el pliegue se muestra hasta unos 105 grados, donde la pantorrilla ya contacta el muslo; más allá, sin la compresión de los tejidos blandos, las mallas rígidas de pantorrilla y muslo se solaparían. En la persona la flexión activa llega a ~120 grados con la cadera extendida (el recto femoral, biarticular, la frena) y a ~140 grados con la cadera flexionada, y de forma pasiva a ~160 grados (talón al glúteo). El poplíteo "desbloquea" la rodilla extendida rotando la tibia internamente; luego los isquiotibiales lideran la flexión. El gastrocnemio asiste solo con el tobillo libre.',
  region: 'knee',
  rig: { axis: [1, 0, 0] },
  phases: [
    {
      startDeg: 0,
      endDeg: 20,
      label: 'Desbloqueo (inicio)',
      flag: {
        label: 'Desbloqueo',
        detail:
          'El poplíteo rota la tibia internamente y deshace el mecanismo de tornillo para que arranque la flexión.',
        tone: 'pearl',
      },
      description:
        'Desde la extensión bloqueada, el poplíteo rota la tibia internamente y deshace el mecanismo de tornillo, permitiendo que comience la flexión. Es el "llave de contacto" de la rodilla.',
      muscles: [
        {
          muscleId: 'popliteus',
          role: 'prime-mover',
          note: 'Desbloquea la rodilla: rota la tibia internamente para iniciar la flexión.',
        },
        { muscleId: 'biceps-femoris', role: 'assistant' },
        { muscleId: 'semitendinosus', role: 'assistant' },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      startDeg: 20,
      endDeg: 90,
      label: 'Rango medio',
      description:
        'Tramo de mayor demanda. Los isquiotibiales trabajan como motores de la flexión; el gastrocnemio asiste cuando el tobillo está libre. La cabeza corta del bíceps femoral, uniarticular, flexiona con independencia de la cadera.',
      muscles: [
        {
          muscleId: 'biceps-femoris',
          role: 'prime-mover',
          note: 'La cabeza corta flexiona la rodilla con independencia de la cadera.',
        },
        { muscleId: 'semitendinosus', role: 'prime-mover' },
        { muscleId: 'semimembranosus', role: 'prime-mover' },
        {
          muscleId: 'gastrocnemius',
          role: 'assistant',
          note: 'Flexor de rodilla solo con el tobillo libre.',
        },
        {
          muscleId: 'sartorius',
          role: 'assistant',
          note: 'Flexor débil de la pata de ganso.',
        },
        { muscleId: 'gracilis', role: 'assistant' },
      ],
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      startDeg: 90,
      endDeg: 105,
      label: 'Final',
      description:
        'Cerca de este punto la pantorrilla contacta el muslo (el modelo se detiene aquí para no atravesarlo). De pie (cadera extendida), la flexión activa real se frena hacia los 120 grados por la tensión del recto femoral (insuficiencia pasiva) y los isquiotibiales trabajan acortados (insuficiencia activa creciente). Con la cadera flexionada el recto femoral se relaja y el arco continúa hasta ~140 grados, limitado entonces por el choque de la pantorrilla con el muslo.',
      muscles: [
        { muscleId: 'biceps-femoris', role: 'prime-mover' },
        { muscleId: 'semitendinosus', role: 'assistant' },
        { muscleId: 'semimembranosus', role: 'assistant' },
        { muscleId: 'plantaris', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'popliteus',
      role: 'prime-mover',
      note: 'Desbloquea la rodilla: rota la tibia internamente en los primeros 20° y luego cede el paso.',
      curve: [
        { deg: 0, level: 1 },
        { deg: 20, level: 0.5 },
        { deg: 40, level: 0.25 },
        { deg: 105, level: 0.15 },
      ],
    },
    {
      muscleId: 'biceps-femoris',
      role: 'prime-mover',
      note: 'Motor de la flexión; la cabeza corta flexiona con independencia de la cadera.',
      curve: [
        { deg: 0, level: 0.3 },
        { deg: 20, level: 0.6 },
        { deg: 90, level: 1 },
        { deg: 105, level: 0.9 },
      ],
    },
    {
      muscleId: 'semitendinosus',
      role: 'prime-mover',
      note: 'Isquiotibial medial: motor de la flexión en el rango medio.',
      curve: [
        { deg: 0, level: 0.3 },
        { deg: 20, level: 0.6 },
        { deg: 90, level: 0.95 },
        { deg: 105, level: 0.7 },
      ],
    },
    {
      muscleId: 'semimembranosus',
      role: 'prime-mover',
      note: 'Isquiotibial medial: motor de la flexión, con creciente insuficiencia activa al final.',
      curve: [
        { deg: 10, level: 0.2 },
        { deg: 20, level: 0.55 },
        { deg: 90, level: 0.95 },
        { deg: 105, level: 0.7 },
      ],
    },
    {
      muscleId: 'gastrocnemius',
      role: 'assistant',
      note: 'Flexor de rodilla solo con el tobillo libre; aporte en el rango medio.',
      curve: [
        { deg: 0, level: 0.1 },
        { deg: 20, level: 0.35 },
        { deg: 90, level: 0.5 },
        { deg: 105, level: 0.4 },
      ],
    },
    {
      muscleId: 'sartorius',
      role: 'assistant',
      note: 'Flexor débil de la pata de ganso.',
      curve: [
        { deg: 0, level: 0.15 },
        { deg: 40, level: 0.35 },
        { deg: 105, level: 0.4 },
      ],
    },
    {
      muscleId: 'gracilis',
      role: 'assistant',
      note: 'Flexor débil de la pata de ganso.',
      curve: [
        { deg: 0, level: 0.15 },
        { deg: 40, level: 0.35 },
        { deg: 105, level: 0.4 },
      ],
    },
    {
      muscleId: 'plantaris',
      role: 'assistant',
      note: 'Aporte menor a la flexión en el rango final.',
      curve: [
        { deg: 60, level: 0.1 },
        { deg: 90, level: 0.25 },
        { deg: 105, level: 0.3 },
      ],
    },
  ],
};

/* ===========================================================================
 * EXTENSION (return from flexion), ~105 -> 0 deg SHOWN in the lab, sagittal
 *
 * Shares the flexion arc and STARTS at its flexed extreme (labStartAt 'max'), so
 * it opens on the same clean ~105 deg pose (calf just meeting the thigh), not an
 * over-folded angle where the calf mesh clips through. See the FLEXION header and
 * boneMap.ts knee-flexion.
 * ======================================================================== */
const extension: RomMovement = {
  id: 'knee-extension',
  name: 'Extensión',
  joint: 'Femorotibial',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 105 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Extensión de la pierna desde la flexión hasta la posición neutra (0 grados). El cuádriceps es el único extensor. En los últimos 30 grados aparece el mecanismo de tornillo: la tibia rota externamente de forma automática y bloquea la rodilla en bipedestación con bajo coste muscular. Un valor negativo indicaría genu recurvatum (hiperextensión). En el modelo el recorrido parte de la flexión de contacto pantorrilla-muslo (~105 grados, límite de la malla); en la persona la flexión de partida es de ~120 grados (cadera extendida) a ~140 grados (cadera flexionada).',
  region: 'knee',
  rig: { axis: [1, 0, 0] },
  // Lab: la extension recorre el MISMO arco que la flexion (0 = rodilla recta,
  // max = flexionada), arrancando en el extremo FLEXIONADO y volviendo a 0. La
  // pierna no "sube" mas alla de la posicion recta (sin patada hacia adelante).
  labStartAt: 'max',
  phases: [
    {
      startDeg: 0,
      endDeg: 30,
      label: 'Bloqueo final (mecanismo de tornillo)',
      // NOTE: the live "Mecanismo de tornillo" coupling card in RhythmReadout
      // (kneeCoupling.ts) already covers this sector richly, so no duplicate flag
      // here. The "extension lag" caution lives in the prose below.
      flag: {
        label: 'Extension lag',
        detail:
          'Los últimos 30° son los de peor palanca del cuádriceps; su debilidad deja un déficit de extensión terminal.',
        tone: 'warn',
      },
      description:
        'Los últimos ~30 grados son los más exigentes para TODO el cuádriceps: el brazo de palanca es desfavorable y es donde aparece el déficit de extensión ("extension lag") cuando el cuádriceps está débil. A la vez ocurre el mecanismo de tornillo: en los últimos 20-30 grados la tibia rota externamente unos 10-15 grados y tensa ambos ligamentos cruzados, bloqueando la rodilla. En bipedestación relajada los ligamentos sostienen la posición casi sin esfuerzo muscular. El vasto medial oblicuo no "extiende más" que el resto de los vientres: su papel es asegurar el rastreo medial de la rótula.',
      muscles: [
        {
          muscleId: 'vastus-medialis',
          role: 'prime-mover',
          note: 'Guía el rastreo medial de la rótula (frena el deslizamiento lateral). Activo en TODO el arco, no un extensor exclusivo del tramo final; su déficit favorece el maltracking lateral y el dolor femoropatelar.',
        },
        { muscleId: 'rectus-femoris', role: 'prime-mover' },
        { muscleId: 'vastus-lateralis', role: 'prime-mover' },
        { muscleId: 'vastus-intermedius', role: 'prime-mover' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 30,
      endDeg: 90,
      label: 'Rango medio',
      description:
        'Tramo de mayor ventaja mecánica del cuádriceps, que extiende contra la gravedad y la carga. Los cuatro vientres trabajan juntos transmitiendo fuerza por el tendón rotuliano a la tuberosidad tibial.',
      muscles: [
        { muscleId: 'rectus-femoris', role: 'prime-mover' },
        { muscleId: 'vastus-lateralis', role: 'prime-mover' },
        { muscleId: 'vastus-medialis', role: 'prime-mover' },
        { muscleId: 'vastus-intermedius', role: 'prime-mover' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 90,
      endDeg: 105,
      label: 'Inicio (desde flexión máxima)',
      description:
        'Al iniciar la extensión desde la flexión de partida (~105 grados en el modelo; ~120 de pie en la persona), el recto femoral está preestirado si la cadera está extendida; con la cadera flexionada sufre insuficiencia activa y pierde eficacia. Los vastos, monoarticulares, no dependen de la posición de la cadera.',
      muscles: [
        {
          muscleId: 'rectus-femoris',
          role: 'assistant',
          note: 'Insuficiencia activa con la cadera flexionada; eficaz con la cadera extendida.',
        },
        { muscleId: 'vastus-lateralis', role: 'prime-mover' },
        { muscleId: 'vastus-medialis', role: 'prime-mover' },
        { muscleId: 'vastus-intermedius', role: 'prime-mover' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'vastus-lateralis',
      role: 'prime-mover',
      note: 'Vasto monoarticular: extiende en todo el arco; máxima demanda en los últimos 30° (extension lag).',
      curve: [
        { deg: 0, level: 1 },
        { deg: 30, level: 0.95 },
        { deg: 90, level: 0.8 },
        { deg: 105, level: 0.65 },
      ],
    },
    {
      muscleId: 'vastus-medialis',
      role: 'prime-mover',
      note: 'Guía el rastreo medial de la rótula; activo en todo el arco, énfasis terminal.',
      curve: [
        { deg: 0, level: 1 },
        { deg: 30, level: 0.9 },
        { deg: 90, level: 0.8 },
        { deg: 105, level: 0.65 },
      ],
    },
    {
      muscleId: 'vastus-intermedius',
      role: 'prime-mover',
      note: 'Vasto profundo monoarticular: extiende junto al resto del cuádriceps.',
      curve: [
        { deg: 0, level: 0.95 },
        { deg: 90, level: 0.8 },
        { deg: 105, level: 0.65 },
      ],
    },
    {
      muscleId: 'rectus-femoris',
      role: 'prime-mover',
      note: 'Único cuádriceps biarticular; pierde eficacia con la cadera flexionada (insuficiencia activa).',
      curve: [
        { deg: 0, level: 0.9 },
        { deg: 30, level: 0.85 },
        { deg: 90, level: 0.75 },
        { deg: 105, level: 0.6 },
      ],
    },
  ],
};

/* ===========================================================================
 * TIBIAL INTERNAL ROTATION (knee flexed ~90 deg), 0 -> ~30 deg, transverse
 * ======================================================================== */
const internalRotation: RomMovement = {
  id: 'knee-internal-rotation',
  name: 'Rotación interna de la tibia',
  joint: 'Femorotibial',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 30 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Rotación de la tibia hacia dentro, disponible SOLO con la rodilla flexionada (la extensión la bloquea). Se evalúa con la rodilla a 90 grados. La lideran los músculos mediales: poplíteo, semitendinoso, semimembranoso y la pata de ganso (sartorio, gracilis). El rango interno es algo menor que el externo.',
  region: 'knee',
  rig: { axis: [0, 1, 0] },
  phases: [
    {
      startDeg: 0,
      endDeg: 15,
      label: 'Inicio',
      description:
        'El poplíteo inicia la rotación interna (es su acción de desbloqueo); el semimembranoso y el semitendinoso, mediales, se suman como motores.',
      muscles: [
        {
          muscleId: 'popliteus',
          role: 'prime-mover',
          note: 'Rotador interno primario; desbloquea la rodilla.',
        },
        { muscleId: 'semitendinosus', role: 'prime-mover' },
        { muscleId: 'semimembranosus', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 15,
      endDeg: 30,
      label: 'Rango final',
      flag: {
        label: 'Protección del LCA',
        detail:
          'La pata de ganso frena el valgo y la rotación externa forzada, protegiendo el ligamento cruzado anterior.',
        tone: 'pearl',
      },
      description:
        'La pata de ganso (sartorio + gracilis, con el semitendinoso) completa la rotación interna. Este grupo es además freno dinámico del valgo y de la rotación externa forzada, protegiendo el ligamento cruzado anterior.',
      muscles: [
        { muscleId: 'semitendinosus', role: 'prime-mover' },
        {
          muscleId: 'sartorius',
          role: 'assistant',
          note: 'Pata de ganso: rotador interno y freno dinámico del valgo.',
        },
        { muscleId: 'gracilis', role: 'assistant' },
        { muscleId: 'popliteus', role: 'stabilizer' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'popliteus',
      role: 'prime-mover',
      note: 'Rotador interno primario; desbloquea la rodilla e inicia la rotación.',
      curve: [
        { deg: 0, level: 0.9 },
        { deg: 15, level: 0.6 },
        { deg: 30, level: 0.4 },
      ],
    },
    {
      muscleId: 'semitendinosus',
      role: 'prime-mover',
      note: 'Medial: completa la rotación interna con la pata de ganso.',
      curve: [
        { deg: 0, level: 0.5 },
        { deg: 15, level: 0.8 },
        { deg: 30, level: 1 },
      ],
    },
    {
      muscleId: 'semimembranosus',
      role: 'assistant',
      note: 'Medial: asiste la rotación interna.',
      curve: [
        { deg: 0, level: 0.4 },
        { deg: 30, level: 0.7 },
      ],
    },
    {
      muscleId: 'sartorius',
      role: 'assistant',
      note: 'Pata de ganso: rotador interno y freno dinámico del valgo, en el rango final.',
      curve: [
        { deg: 10, level: 0.2 },
        { deg: 15, level: 0.4 },
        { deg: 30, level: 0.7 },
      ],
    },
    {
      muscleId: 'gracilis',
      role: 'assistant',
      note: 'Pata de ganso: rotador interno en el rango final.',
      curve: [
        { deg: 10, level: 0.2 },
        { deg: 30, level: 0.6 },
      ],
    },
  ],
};

/* ===========================================================================
 * TIBIAL EXTERNAL ROTATION (knee flexed ~90 deg), 0 -> ~40 deg, transverse
 * ======================================================================== */
const externalRotation: RomMovement = {
  id: 'knee-external-rotation',
  name: 'Rotación externa de la tibia',
  joint: 'Femorotibial',
  plane: 'Transversal',
  totalRangeDeg: { min: 0, max: 40 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Rotación de la tibia hacia fuera, disponible solo con la rodilla flexionada y evaluada a 90 grados. El único motor es el bíceps femoral, el isquiotibial lateral. El rango externo es mayor que el interno. En la extensión, esta rotación ocurre de forma automática y pasiva (mecanismo de tornillo), no por acción muscular.',
  region: 'knee',
  rig: { axis: [0, 1, 0] },
  phases: [
    {
      startDeg: 0,
      endDeg: 20,
      label: 'Inicio',
      description:
        'El bíceps femoral, único isquiotibial lateral, inicia y mantiene la rotación externa de la tibia con la rodilla flexionada.',
      muscles: [
        {
          muscleId: 'biceps-femoris',
          role: 'prime-mover',
          note: 'Único rotador externo activo de la tibia.',
        },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      startDeg: 20,
      endDeg: 40,
      label: 'Rango final',
      description:
        'El bíceps femoral completa el rango. Los rotadores internos (poplíteo, pata de ganso) actúan como antagonistas que frenan excéntricamente el final del movimiento y protegen las estructuras mediales.',
      muscles: [
        { muscleId: 'biceps-femoris', role: 'prime-mover' },
        {
          muscleId: 'popliteus',
          role: 'stabilizer',
          note: 'Antagonista: frena excéntricamente la rotación externa.',
        },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  activations: [
    {
      muscleId: 'biceps-femoris',
      role: 'prime-mover',
      note: 'Único rotador externo activo de la tibia; motor en todo el arco.',
      curve: [
        { deg: 0, level: 0.7 },
        { deg: 20, level: 0.9 },
        { deg: 40, level: 1 },
      ],
    },
    {
      muscleId: 'popliteus',
      role: 'stabilizer',
      note: 'Antagonista: frena excéntricamente el final de la rotación externa.',
      curve: [
        { deg: 20, level: 0.2 },
        { deg: 40, level: 0.5 },
      ],
    },
  ],
};

/**
 * Knee ROM movements, keyed by id. Same structure as ELBOW_ROM.
 */
export const KNEE_ROM: RomMovementIndex = {
  'knee-flexion': flexion,
  'knee-extension': extension,
  'knee-internal-rotation': internalRotation,
  'knee-external-rotation': externalRotation,
};

/** Convenience array for iterating/rendering all knee movements. */
export const KNEE_ROM_LIST: RomMovement[] = Object.values(KNEE_ROM);
