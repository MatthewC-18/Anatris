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
        showsTest: 'spurling',
        prompt:
          'Las cuatro son pruebas cervicales. ¿Cuál reproduce el dolor radicular CERRANDO el foramen?',
        options: [
          { id: 'a', text: 'Test de Spurling', correct: true },
          { id: 'b', text: 'Distracción cervical', correct: false },
          { id: 'c', text: 'Test de tensión neural del MMSS, sesgo mediano', correct: false },
          { id: 'd', text: 'Test de Sharp-Purser', correct: false },
        ],
        explanation:
          'Spurling cierra el foramen (extensión + inclinación homolateral + compresión axial) y por eso REPRODUCE el dolor radicular: es muy específico, así que un Spurling positivo pesa. La distracción cervical hace lo contrario — abre el foramen y ALIVIA —, de modo que también apoya el origen radicular, pero no es la prueba que lo provoca. El ULNT mediano explora la mecanosensibilidad a lo largo del nervio y es sensible más que específico: sirve para descartar, no para confirmar un nivel. Y el Sharp-Purser no es una prueba radicular: busca inestabilidad atlantoaxial, otra pregunta y otra urgencia.',
      },
    ],
    takeaway:
      'Dolor irradiado al pulgar con debilidad de flexión de codo orienta a radiculopatía C6; el test de Spurling apoya el origen radicular cervical.',
  },
];
