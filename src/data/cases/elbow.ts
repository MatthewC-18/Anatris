// src/data/cases/elbow.ts
//
// Clinical cases for the elbow region. Split out of the old single
// clinicalCases.ts so each region's prose ships separately: the free region
// stays bundled, the paid ones are served by the entitlement-checked "content"
// edge function (see data/premiumStore.ts).
//
// Authoring rules unchanged: user-facing prose in Latin American Spanish
// (UTF-8 with accents); ids/keys ASCII. Clinical reasoning is AUTHORED content
// drafted from standard physiotherapy teaching -- verify before professional use.

import type { ClinicalCase } from '../../types/clinicalCase';

export const ELBOW_CASES: ClinicalCase[] = [
  {
    id: 'el-lateral-epicondylalgia',
    region: 'elbow',
    title: 'Dolor en epicóndilo lateral',
    level: 'básico',
    vignette:
      'Oficinista de 38 años con dolor en la cara lateral del codo que empeora al agarrar objetos y al extender la muñeca contra resistencia. Dolor a la palpación justo distal al epicóndilo lateral.',
    tags: ['Epicondialgia lateral', 'Extensores de muñeca', 'ECRB'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué grupo muscular se origina en el epicóndilo lateral y reproduce el dolor?',
        options: [
          { id: 'a', text: 'Extensores de la muñeca y los dedos', correct: true },
          { id: 'b', text: 'Flexores de la muñeca', correct: false },
          { id: 'c', text: 'Pronadores del antebrazo', correct: false },
          { id: 'd', text: 'Intrínsecos de la mano', correct: false },
        ],
        explanation:
          'El “codo de tenista” (epicondialgia lateral) afecta el origen común de los extensores, en especial el extensor radial corto del carpo (ECRB). Por eso la extensión resistida de muñeca y el agarre reproducen el dolor.',
      },
      {
        id: 'q2',
        prompt: '¿Qué enfoque de carga tiene mejor evidencia en la fase de manejo?',
        options: [
          { id: 'a', text: 'Ejercicio de carga progresiva de los extensores (incluido excéntrico)', correct: true },
          { id: 'b', text: 'Reposo absoluto hasta que no duela nada', correct: false },
          { id: 'c', text: 'Estiramiento pasivo único, sin fortalecimiento', correct: false },
          { id: 'd', text: 'Inmovilización rígida 4 semanas', correct: false },
        ],
        explanation:
          'La tendinopatía responde mejor a carga progresiva y tolerable (el componente excéntrico es clásico) que al reposo absoluto, que tiende a desacondicionar el tendón. La carga guía la remodelación.',
      },
    ],
    takeaway:
      'Dolor lateral del codo con extensión resistida de muñeca dolorosa = epicondialgia lateral (origen de los extensores, ECRB). El pilar es la carga progresiva del tendón, no el reposo.',
  },
  {
    id: 'el-ulnar-nerve',
    region: 'elbow',
    title: 'Hormigueo en el meñique',
    level: 'intermedio',
    vignette:
      'Paciente de 50 años con parestesias en el meñique y mitad cubital del anular, que empeoran al mantener el codo muy flexionado (al hablar por teléfono o dormir). Refiere torpeza para separar los dedos.',
    tags: ['Nervio cubital', 'Túnel cubital', 'Froment'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué nervio pasa por detrás del epicóndilo medial y explica este patrón?',
        options: [
          { id: 'a', text: 'Nervio cubital', correct: true },
          { id: 'b', text: 'Nervio radial', correct: false },
          { id: 'c', text: 'Nervio mediano', correct: false },
          { id: 'd', text: 'Nervio musculocutáneo', correct: false },
        ],
        explanation:
          'El nervio cubital cruza el túnel cubital, detrás del epicóndilo medial. La flexión sostenida del codo lo tensa/comprime, dando parestesias en el territorio cubital (meñique y mitad del anular).',
      },
      {
        id: 'q2',
        prompt: 'La torpeza para separar los dedos se debe a debilidad de…',
        options: [
          { id: 'a', text: 'Los interóseos (intrínsecos inervados por el cubital)', correct: true },
          { id: 'b', text: 'El bíceps braquial', correct: false },
          { id: 'c', text: 'El extensor común de los dedos', correct: false },
          { id: 'd', text: 'El supinador', correct: false },
        ],
        explanation:
          'Los interóseos (abducción/aducción de los dedos) son intrínsecos inervados por el cubital; su debilidad explica la torpeza para separar los dedos y el signo de Froment positivo. El bíceps, extensor común y supinador no dependen del cubital.',
      },
    ],
    takeaway:
      'Parestesia cubital que empeora con la flexión del codo + debilidad de intrínsecos orientan a atrapamiento del nervio cubital en el túnel cubital.',
  },
];
