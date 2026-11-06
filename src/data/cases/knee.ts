// src/data/cases/knee.ts
//
// Clinical cases for the knee region. Split out of the old single
// clinicalCases.ts so each region's prose ships separately: the free region
// stays bundled, the paid ones are served by the entitlement-checked "content"
// edge function (see data/premiumStore.ts).
//
// Authoring rules unchanged: user-facing prose in Latin American Spanish
// (UTF-8 with accents); ids/keys ASCII. Clinical reasoning is AUTHORED content
// drafted from standard physiotherapy teaching -- verify before professional use.

import type { ClinicalCase } from '../../types/clinicalCase';

export const KNEE_CASES: ClinicalCase[] = [
  {
    id: 'kn-acl',
    region: 'knee',
    title: 'Giro con “pop” e inestabilidad',
    level: 'intermedio',
    vignette:
      'Futbolista de 24 años que, en un cambio de dirección con el pie fijo, sintió un “pop” seguido de derrame articular en pocas horas y sensación de que la rodilla “se va”.',
    tags: ['LCA', 'Pivot', 'Cuádriceps'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué estructura se lesiona con más probabilidad en este mecanismo de pivote sin contacto?',
        options: [
          { id: 'a', text: 'Ligamento cruzado anterior (LCA)', correct: true },
          { id: 'b', text: 'Ligamento cruzado posterior (LCP)', correct: false },
          { id: 'c', text: 'Tendón rotuliano', correct: false },
          { id: 'd', text: 'Cintilla iliotibial', correct: false },
        ],
        explanation:
          'El mecanismo sin contacto de desaceleración/pivote con derrame rápido es típico de rotura del LCA. El LCP suele lesionarse por traumatismo directo en la tibia proximal (mecanismo distinto).',
      },
      {
        id: 'q2',
        showsTest: 'lachman',
        prompt:
          'Las cuatro son pruebas de rodilla. ¿Cuál explora el LCA y es la que mejor rinde en una rodilla recién lesionada?',
        options: [
          { id: 'a', text: 'Test de Lachman', correct: true },
          { id: 'b', text: 'Cajón anterior', correct: false },
          { id: 'c', text: 'Pivot shift', correct: false },
          { id: 'd', text: 'Cajón posterior', correct: false },
        ],
        explanation:
          'Las tres primeras exploran el LCA y no dan lo mismo. Lachman tracciona la tibia a 20–30° de flexión, donde el isquiotibial no puede frenar el movimiento: es la más sensible y la que sigue sirviendo con la rodilla hinchada y defendida. El cajón anterior pide 90° de flexión, una posición que el paciente agudo no tolera y en la que los isquiotibiales enmascaran la traslación. El pivot shift es casi diagnóstico cuando sale positivo, pero necesita una rodilla relajada que una lesión de horas no da. Y el cajón posterior no es del LCA: explora el cruzado posterior, el ligamento de enfrente.',
      },
      {
        id: 'q3',
        prompt: 'En la rehabilitación temprana, ¿qué músculo es clave para la estabilidad dinámica anterior?',
        options: [
          { id: 'a', text: 'Cuádriceps (con control de isquiosurales como sinergistas del LCA)', correct: true },
          { id: 'b', text: 'Gastrocnemio aislado', correct: false },
          { id: 'c', text: 'Tibial anterior', correct: false },
          { id: 'd', text: 'Sóleo aislado', correct: false },
        ],
        explanation:
          'Recuperar fuerza y control del cuádriceps (evitando el déficit de extensión) es central; los isquiosurales actúan como agonistas del LCA limitando la traslación anterior. El trabajo neuromuscular reduce el riesgo de relesión.',
      },
    ],
    takeaway:
      'Pivote sin contacto + “pop” + derrame rápido + Lachman positivo = sospecha de rotura del LCA. La rehabilitación prioriza cuádriceps, isquiosurales y control neuromuscular.',
  },
  {
    id: 'kn-pfps',
    region: 'knee',
    title: 'Dolor anterior al bajar escaleras',
    level: 'básico',
    vignette:
      'Corredora de 29 años con dolor difuso en la cara anterior de la rodilla, peor al bajar escaleras, al ponerse en cuclillas y tras estar mucho tiempo sentada (“signo del cine”).',
    tags: ['Dolor femoropatelar', 'Cuádriceps', 'VMO'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Cuál es la hipótesis más probable?',
        options: [
          { id: 'a', text: 'Dolor femoropatelar (síndrome patelofemoral)', correct: true },
          { id: 'b', text: 'Rotura completa del LCP', correct: false },
          { id: 'c', text: 'Lesión meniscal en asa de balde', correct: false },
          { id: 'd', text: 'Trombosis venosa profunda', correct: false },
        ],
        explanation:
          'Dolor anterior difuso, peor al bajar escaleras/cuclillas y con el “signo del cine” (dolor tras sedestación prolongada) es típico del dolor femoropatelar, relacionado con el seguimiento de la rótula y la carga femoropatelar.',
      },
      {
        id: 'q2',
        prompt: '¿Qué enfoque de ejercicio es razonable de primera línea?',
        options: [
          { id: 'a', text: 'Fortalecer cuádriceps y musculatura de cadera (glúteos)', correct: true },
          { id: 'b', text: 'Reposo prolongado y evitar toda carga', correct: false },
          { id: 'c', text: 'Solo estiramiento de isquiosurales', correct: false },
          { id: 'd', text: 'Inmovilizar la rótula con yeso', correct: false },
        ],
        explanation:
          'La evidencia apoya el ejercicio combinado de rodilla (cuádriceps) y cadera (abductores/rotadores externos, glúteo medio/mayor) para mejorar el control del valgo dinámico y la carga femoropatelar.',
      },
    ],
    takeaway:
      'El dolor femoropatelar se reconoce por el patrón anterior con escaleras/cuclillas y “signo del cine”. El tratamiento base es ejercicio de cuádriceps + cadera, no reposo.',
  },
];
