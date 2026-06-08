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
 * FLEXION (femoro-tibial), 0 -> ~140 deg, sagittal
 * ======================================================================== */
const flexion: RomMovement = {
  id: 'knee-flexion',
  name: 'Flexión',
  joint: 'Femorotibial',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 140 },
  rangeCite: [
    { ref: 'kapandji', pageVerified: false },
    { ref: 'oatis', pageVerified: false },
  ],
  overview:
    'Flexión de la pierna sobre el muslo en el plano sagital, hasta unos 140 grados de flexión activa (más con la cadera flexionada, que preestira los isquiotibiales). El poplíteo "desbloquea" la rodilla extendida rotando la tibia internamente; luego los isquiotibiales lideran la flexión. El gastrocnemio asiste solo con el tobillo libre.',
  region: 'knee',
  phases: [
    {
      startDeg: 0,
      endDeg: 20,
      label: 'Desbloqueo (inicio)',
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
      endDeg: 140,
      label: 'Final',
      description:
        'Al final del arco la flexión la limitan el contacto de la pantorrilla con el muslo y la tensión del cuádriceps (insuficiencia pasiva). Los isquiotibiales mantienen el esfuerzo en posición acortada (insuficiencia activa creciente).',
      muscles: [
        { muscleId: 'biceps-femoris', role: 'prime-mover' },
        { muscleId: 'semitendinosus', role: 'assistant' },
        { muscleId: 'semimembranosus', role: 'assistant' },
        { muscleId: 'plantaris', role: 'assistant' },
      ],
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * EXTENSION (return from flexion), ~140 -> 0 deg, sagittal
 * ======================================================================== */
const extension: RomMovement = {
  id: 'knee-extension',
  name: 'Extensión',
  joint: 'Femorotibial',
  plane: 'Sagital',
  totalRangeDeg: { min: 0, max: 140 },
  rangeCite: [{ ref: 'kapandji', pageVerified: false }],
  overview:
    'Extensión de la pierna desde la flexión hasta la posición neutra (0 grados). El cuádriceps es el único extensor. En los últimos 30 grados aparece el mecanismo de tornillo: la tibia rota externamente de forma automática y bloquea la rodilla en bipedestación con bajo coste muscular. Un valor negativo indicaría genu recurvatum (hiperextensión).',
  region: 'knee',
  phases: [
    {
      startDeg: 0,
      endDeg: 30,
      label: 'Bloqueo final (mecanismo de tornillo)',
      description:
        'Los últimos 30 grados son los más exigentes para el cuádriceps (brazo de palanca desfavorable). El vasto medial oblicuo asegura el rastreo medial de la rótula. La tibia rota externamente y bloquea la rodilla: en bipedestación relajada, los ligamentos sostienen la posición casi sin esfuerzo muscular.',
      muscles: [
        {
          muscleId: 'vastus-medialis',
          role: 'prime-mover',
          note: 'El VMO domina los últimos 30 grados y guía la rótula medialmente.',
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
      endDeg: 140,
      label: 'Inicio (desde flexión máxima)',
      description:
        'Al iniciar la extensión desde la flexión máxima, el recto femoral está preestirado si la cadera está extendida; con la cadera flexionada sufre insuficiencia activa y pierde eficacia. Los vastos, monoarticulares, no dependen de la posición de la cadera.',
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
