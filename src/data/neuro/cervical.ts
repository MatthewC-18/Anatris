// src/data/neuro/cervical.ts
//
// UPPER-LIMB nerve roots (C5-T1): dermatome key point, key myotome and reflex,
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
  subtitle: 'Dermatoma, miotoma y reflejo por raíz (C5 a T1)',
  figure: 'upper-limb',
  roots: [
    {
      id: 'C5',
      label: 'C5',
      dermatome: {
        area: 'Cara lateral del brazo, sobre el deltoides.',
        keyPoint: 'Fosa antecubital, lado lateral (punto clave ASIA).',
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
        movementId: 'elbow-flexion',
        angleDeg: 120,
        side: 'R',
        note: 'En el modelo se muestra la flexión de codo (C5-C6); la extensión de muñeca no está riggeada.',
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
        note: 'El modelo recorre el arco flexión-extensión del codo (tríceps); la flexión de muñeca no está riggeada.',
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
      },
      myotome: {
        action: 'Flexión de los dedos.',
        muscles: 'Flexor profundo de los dedos.',
      },
      demoNote:
        'La flexión de los dedos no está riggeada en este modelo (la extremidad llega hasta muñeca).',
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
      },
      myotome: {
        action: 'Abducción y aducción de los dedos.',
        muscles: 'Músculos interóseos de la mano.',
      },
      demoNote:
        'La motricidad fina de la mano no está riggeada en este modelo.',
      pearl:
        'Debilidad intrínseca con signo de Froment o mano en garra: valora también el nervio cubital, no solo la raíz.',
      cite: CITE,
    },
  ],
};
