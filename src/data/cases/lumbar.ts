// src/data/cases/lumbar.ts
//
// Clinical cases for the lumbar region. Split out of the old single
// clinicalCases.ts so each region's prose ships separately: the free region
// stays bundled, the paid ones are served by the entitlement-checked "content"
// edge function (see data/premiumStore.ts).
//
// Authoring rules unchanged: user-facing prose in Latin American Spanish
// (UTF-8 with accents); ids/keys ASCII. Clinical reasoning is AUTHORED content
// drafted from standard physiotherapy teaching -- verify before professional use.

import type { ClinicalCase } from '../../types/clinicalCase';

export const LUMBAR_CASES: ClinicalCase[] = [
  {
    id: 'lx-l5-radiculopathy',
    region: 'lumbar',
    title: 'Lumbalgia con caída del pie',
    level: 'intermedio',
    vignette:
      'Hombre de 40 años con lumbalgia irradiada por la cara posterolateral del muslo y pierna hasta el dorso del pie y el primer dedo. Tiene dificultad para caminar de talones y debilidad para extender el dedo gordo.',
    tags: ['Radiculopatía', 'L5', 'Extensor del hallux'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué raíz explica mejor la debilidad de extensión del dedo gordo y la marcha de talones?',
        options: [
          { id: 'a', text: 'L5', correct: true },
          { id: 'b', text: 'S1', correct: false },
          { id: 'c', text: 'L3', correct: false },
          { id: 'd', text: 'L1', correct: false },
        ],
        explanation:
          'L5 inerva el extensor largo del hallux y el tibial anterior (dorsiflexión); su afectación da debilidad para extender el dedo gordo y para caminar de talones, con dolor por el dermatoma L5 hasta el dorso del pie. S1 daría debilidad de flexión plantar (marcha de puntillas).',
      },
      {
        id: 'q2',
        prompt: '¿Qué prueba neural tensa la raíz y reproduce el dolor irradiado?',
        options: [
          { id: 'a', text: 'Elevación de la pierna recta (Lasègue / SLR)', correct: true },
          { id: 'b', text: 'Test de Spurling', correct: false },
          { id: 'c', text: 'Test de Lachman', correct: false },
          { id: 'd', text: 'Signo de Froment', correct: false },
        ],
        explanation:
          'La elevación de la pierna recta (SLR/Lasègue) tensa el nervio ciático y sus raíces lumbosacras, reproduciendo el dolor radicular. Spurling es cervical, Lachman de rodilla y Froment de nervio cubital.',
      },
    ],
    takeaway:
      'Debilidad de extensión del hallux + marcha de talones + dolor al dorso del pie sugieren radiculopatía L5; el SLR apoya el componente radicular.',
  },
];
