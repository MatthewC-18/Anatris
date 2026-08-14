// src/data/neuro/cervical.ts
//
// UPPER-LIMB nerve roots (C4-T1): dermatome key point, key myotome and reflex,
// with a rig demo of the myotome where the model can reproduce it. Values follow
// the ASIA/ISNCSCI key points and Magee; verified:false until checked against
// the primary source (dermatome maps vary by author).
//
// Rig demos available for the upper limb: shoulder abduction, elbow flexion,
// elbow extension. Wrist/hand movements are not riggable, so those roots carry a
// demoNote instead (same honesty pattern as the orthopedic tests).

import type { NeuroSegmentSet } from '../../types/neuro';

const CITE = [
  { ref: 'asia', verified: false },
  { ref: 'magee', verified: false },
];

export const CERVICAL_NEURO: NeuroSegmentSet = {
  id: 'cervical',
  title: 'Raíces del miembro superior',
  subtitle: 'Dermatoma, miotoma y reflejo por raíz (C4 a T1)',
  figure: 'upper-limb',
  roots: [
    {
      // C4 is not a limb root -- it is the CAPE over the shoulder -- and ASIA
      // assigns it no key muscle, which is why the motor screen starts at C5 and
      // why this root was missing. For a SHOULDER module that absence shows: the
      // ASIA sensory key point for C4 is the acromioclavicular joint itself, and
      // pain referred to the cape is an everyday finding. It is here as a sensory
      // root, with the motor gap stated rather than papered over.
      id: 'C4',
      label: 'C4',
      dermatome: {
        area: 'Casquete del hombro: fosa supraclavicular y cabo del hombro, desde la base del cuello hasta la articulación acromioclavicular.',
        keyPoint: 'Articulación acromioclavicular (punto clave ASIA).',
        keyPointShort: 'Articulación acromioclavicular',
      },
      myotome: {
        action: 'Sin músculo clave en el cribado motor ASIA.',
        muscles:
          'C4 contribuye al diafragma (C3-C5) y a la elevación del hombro, pero ASIA no le asigna músculo clave: el cribado motor del miembro superior empieza en C5.',
      },
      // No reflex: C4 has no deep tendon reflex of its own.
      demoNote:
        'No hay demostración motora porque C4 no tiene músculo clave en el cribado ASIA. Su valor aquí es sensitivo: el casquete del hombro y el punto clave sobre la articulación acromioclavicular.',
      mimic: {
        nerve: 'Nervio supraclavicular (plexo cervical)',
        discriminator:
          'Los supraclaviculares son las ramas sensitivas de C3-C4 que llevan este territorio, así que el mapa cutáneo coincide; lo que separa la raíz es que C4 puede acompañarse de dolor cervical, y una lesión troncular no.',
      },
      pearl:
        'Dolor en el cabo del hombro sin déficit motor ni reflejo alterado: piensa en C4, y también en dolor referido diafragmático (C3-C5), que comparte exactamente este territorio.',
      cite: CITE,
    },
    {
      id: 'C5',
      label: 'C5',
      dermatome: {
        area: 'Cara lateral del brazo, sobre el deltoides.',
        keyPoint: 'Fosa antecubital, lado lateral (punto clave ASIA).',
        keyPointShort: 'Fosa antecubital lateral',
      },
      myotome: {
        action: 'Abducción del hombro y flexión de codo.',
        muscles: 'Deltoides y bíceps braquial.',
      },
      reflex: {
        name: 'Reflejo bicipital (C5 y C6)',
        elicitation:
          'Percute el tendón del bíceps sobre el pulgar del explorador en el pliegue del codo; respuesta: flexión de codo.',
      },
      demo: {
        movementId: 'glenohumeral-abduction',
        angleDeg: 100,
        side: 'R',
        highlightMuscleId: 'deltoid',
        // "C5 no hay flexión de codo": the myotome is deltoid AND biceps, and the
        // demo only ever abducted. The elbow now holds its flexion through the
        // arc, so both key muscles of the root are on screen at once.
        components: [{ movementId: 'elbow-flexion', angleDeg: 90 }],
      },
      mimic: {
        nerve: 'Nervio axilar',
        discriminator:
          'El axilar también debilita la abducción y adormece el hombro lateral, pero no toca el bíceps ni el reflejo bicipital, y el déficit sensitivo no baja del hombro.',
      },
      pearl:
        'Debilidad de abducción con dolor de hombro: distingue la raíz C5 de una lesión del manguito por el patrón sensitivo y el reflejo.',
      cite: CITE,
    },
    {
      id: 'C6',
      label: 'C6',
      dermatome: {
        area: 'Cara lateral del antebrazo hasta el pulgar.',
        keyPoint: 'Pulgar (punto clave ASIA).',
        keyPointShort: 'Pulgar',
      },
      myotome: {
        action: 'Extensión de muñeca (y flexión de codo).',
        muscles: 'Extensores radiales del carpo; braquiorradial y bíceps.',
      },
      reflex: {
        name: 'Reflejo braquiorradial o estilorradial (C6)',
        elicitation:
          'Percute la apófisis estiloides del radio con el antebrazo relajado; respuesta: flexión de codo y ligera supinación.',
      },
      demo: {
        // The KEY movement of this root, and the one it is tested by. It used to
        // carry a note saying the rig could not reproduce it; the wrist bone was
        // in the rig all along, it had simply never been mapped.
        movementId: 'wrist-extension',
        angleDeg: 60,
        side: 'R',
        // Elbow at 90 so the hand is in view and the wrist reads as a wrist,
        // rather than a hand turning at the end of a hanging arm.
        components: [{ movementId: 'elbow-flexion', angleDeg: 90 }],
        note: 'C6 comparte con C5 la flexión de codo; lo que se explora aquí es la extensión de muñeca, que es su movimiento clave.',
      },
      mimic: {
        nerve: 'Nervio mediano en el carpo (túnel carpiano)',
        discriminator:
          'El túnel carpiano adormece el pulgar igual que C6, pero se detiene en la muñeca: la sensibilidad del antebrazo lateral queda intacta y la flexión de codo conserva su fuerza.',
      },
      pearl:
        'C6 y C7 comparten territorio en la mano; apóyate en el dedo afectado (pulgar en C6, medio en C7) y en el reflejo.',
      cite: CITE,
    },
    {
      id: 'C7',
      label: 'C7',
      dermatome: {
        area: 'Cara posterior del antebrazo hasta el dedo medio.',
        keyPoint: 'Dedo medio (punto clave ASIA).',
        keyPointShort: 'Dedo medio',
      },
      myotome: {
        action: 'Extensión de codo (y flexión de muñeca).',
        muscles: 'Tríceps braquial; flexores del carpo.',
      },
      reflex: {
        name: 'Reflejo tricipital (C7)',
        elicitation:
          'Con el codo en semiflexión y relajado, percute el tendón del tríceps sobre el olécranon; respuesta: extensión de codo.',
      },
      demo: {
        movementId: 'elbow-extension',
        angleDeg: 120,
        side: 'R',
        note: 'El modelo parte del codo flexionado y lo estira: la extensión es el recorrido hacia 0°, no una posición doblada. La flexión de muñeca, secundaria en C7, no se muestra aquí.',
      },
      mimic: {
        nerve: 'Nervio radial',
        discriminator:
          'Una lesión radial baja debilita los extensores de muñeca y dedos con el tríceps y su reflejo conservados; en C7 el tríceps cede y el reflejo tricipital baja.',
      },
      pearl:
        'La raíz cervical más afectada. Un tríceps débil con reflejo tricipital disminuido orienta a C7.',
      cite: CITE,
    },
    {
      id: 'C8',
      label: 'C8',
      dermatome: {
        area: 'Cara medial del antebrazo hasta el meñique.',
        keyPoint: 'Dedo meñique (punto clave ASIA).',
        keyPointShort: 'Dedo meñique',
      },
      myotome: {
        action: 'Flexión de los dedos.',
        muscles: 'Flexor profundo de los dedos.',
      },
      demoNote:
        'El modelo llega hasta la muñeca, así que la flexión de los dedos no se puede reproducir aquí.',
      mimic: {
        nerve: 'Nervio cubital en el codo',
        discriminator:
          'El cubital respeta la sensibilidad del antebrazo medial, que viaja por el cutáneo medial del antebrazo: si el antebrazo medial también está dormido, el problema está en la raíz o en el plexo, no en el cubital.',
      },
      pearl:
        'C8 y T1 dan la fuerza intrínseca de la mano; explóralas con la pinza y la abducción de los dedos.',
      cite: CITE,
    },
    {
      id: 'T1',
      label: 'T1',
      dermatome: {
        area: 'Cara medial del codo y del brazo.',
        keyPoint: 'Cara medial de la fosa antecubital (punto clave ASIA).',
        keyPointShort: 'Fosa antecubital medial',
      },
      myotome: {
        action: 'Abducción y aducción de los dedos.',
        muscles: 'Músculos interóseos de la mano.',
      },
      demoNote:
        'La motricidad fina de la mano no se puede reproducir en el modelo.',
      pearl:
        'Debilidad intrínseca con signo de Froment o mano en garra: valora también el nervio cubital, no solo la raíz.',
      cite: CITE,
    },
  ],
  redFlags: [
    {
      label: 'Mielopatía cervical',
      detail:
        'Hiperreflexia, Hoffmann o Babinski presentes, marcha inestable, torpeza de manos o alteración de esfínteres. No es una radiculopatía: deriva.',
    },
    {
      label: 'Déficit motor progresivo',
      detail:
        'Fuerza que baja entre sesiones, o debilidad que abarca más de una raíz. Valoración médica sin esperar la evolución.',
    },
    {
      label: 'Bandera roja sistémica',
      detail:
        'Dolor nocturno que no cede con el reposo, pérdida de peso, fiebre o antecedente oncológico.',
    },
  ],
};
