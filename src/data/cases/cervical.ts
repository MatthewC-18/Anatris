// src/data/cases/cervical.ts
//
// Clinical cases for the cervical region. Split out of the old single
// clinicalCases.ts so each region's prose ships separately: the free region
// stays bundled, the paid ones are served by the entitlement-checked "content"
// edge function (see data/premiumStore.ts).
//
// Authoring rules unchanged: user-facing prose in Latin American Spanish
// (UTF-8 with accents); ids/keys ASCII. Clinical reasoning is AUTHORED content
// drafted from standard physiotherapy teaching -- verify before professional use.

import type { ClinicalCase } from '../../types/clinicalCase';

export const CERVICAL_CASES: ClinicalCase[] = [
  {
    id: 'cx-c6-radiculopathy',
    region: 'cervical',
    title: 'Dolor cervical irradiado al pulgar',
    level: 'intermedio',
    vignette:
      'Paciente de 47 años con dolor cervical que irradia por la cara lateral del antebrazo hasta el pulgar, con parestesias en esa zona y leve debilidad al flexionar el codo. El dolor aumenta al extender e inclinar la cabeza hacia el lado sintomático.',
    tags: ['Radiculopatía', 'C6', 'Spurling'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué raíz nerviosa corresponde mejor a este patrón (pulgar + flexión de codo)?',
        options: [
          { id: 'a', text: 'C6', correct: true },
          { id: 'b', text: 'C8', correct: false },
          { id: 'c', text: 'T1', correct: false },
          { id: 'd', text: 'C4', correct: false },
        ],
        explanation:
          'El dermatoma C6 cubre la cara lateral del antebrazo y el pulgar; la flexión del codo (bíceps, C5–C6) puede debilitarse. C8/T1 afectan el borde cubital y la mano; C4 no llega al pulgar.',
      },
      {
        id: 'q2',
        prompt: '¿Qué prueba reproduce el dolor radicular al cerrar el foramen?',
        options: [
          { id: 'a', text: 'Test de Spurling', correct: true },
          { id: 'b', text: 'Test de Thomas', correct: false },
          { id: 'c', text: 'Test de McMurray', correct: false },
          { id: 'd', text: 'Maniobra de Jobe', correct: false },
        ],
        explanation:
          'El test de Spurling (extensión + inclinación homolateral + compresión axial) estrecha el foramen y reproduce el dolor radicular. Thomas es de cadera, McMurray de menisco y Jobe de hombro.',
      },
    ],
    takeaway:
      'Dolor irradiado al pulgar con debilidad de flexión de codo orienta a radiculopatía C6; el test de Spurling apoya el origen radicular cervical.',
  },
];
