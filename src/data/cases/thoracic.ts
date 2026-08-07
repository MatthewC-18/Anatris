// src/data/cases/thoracic.ts
//
// Clinical cases for the thoracic region. Split out of the old single
// clinicalCases.ts so each region's prose ships separately: the free region
// stays bundled, the paid ones are served by the entitlement-checked "content"
// edge function (see data/premiumStore.ts).
//
// Authoring rules unchanged: user-facing prose in Latin American Spanish
// (UTF-8 with accents); ids/keys ASCII. Clinical reasoning is AUTHORED content
// drafted from standard physiotherapy teaching -- verify before professional use.

import type { ClinicalCase } from '../../types/clinicalCase';

export const THORACIC_CASES: ClinicalCase[] = [
  {
    id: 'th-compression-fracture',
    region: 'thoracic',
    title: 'Dorsalgia aguda en mujer de 72 años',
    level: 'intermedio',
    vignette:
      'Mujer de 72 años en tratamiento con corticoides por polimialgia. Refiere dorsalgia media de aparición brusca hace cinco días, tras un esfuerzo al levantar una maceta. El dolor es constante, empeora al incorporarse desde la cama y no tolera dormir en plano. No hay irradiación ni déficit neurológico. Ha perdido tres centímetros de talla en dos años.',
    tags: ['Bandera roja', 'Fractura vertebral', 'Osteoporosis'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Cuál es la hipótesis que hay que descartar ANTES de tratar?',
        options: [
          { id: 'a', text: 'Fractura vertebral por compresión osteoporótica', correct: true },
          { id: 'b', text: 'Hipercifosis postural', correct: false },
          { id: 'c', text: 'Disfunción costovertebral mecánica', correct: false },
          { id: 'd', text: 'Punto gatillo del romboides', correct: false },
        ],
        explanation:
          'La suma de edad avanzada, corticoterapia, pérdida de talla, inicio brusco tras un esfuerzo mínimo y dolor que no cede en reposo es un cuadro de banderas rojas para fractura vertebral por compresión. Las otras hipótesis son plausibles en dorsalgia crónica, no en este perfil.',
      },
      {
        id: 'q2',
        prompt: '¿Qué dos signos de exploración apoyan mejor esa sospecha?',
        options: [
          {
            id: 'a',
            text: 'Percusión con puño cerrado y signo del supino',
            correct: true,
          },
          { id: 'b', text: 'Prueba de Adams y expansión torácica', correct: false },
          { id: 'c', text: 'Maniobra de Adson y prueba de Roos', correct: false },
          { id: 'd', text: 'Test de Slump y Lasègue', correct: false },
        ],
        explanation:
          'La percusión con puño cerrado (dolor exquisito y puntual sobre una espinosa) y el signo del supino (no tolerar el decúbito plano) son los dos signos descritos para la fractura vertebral por compresión, ambos con especificidad alta. Adams cribar escoliosis, la expansión torácica valora espondiloartritis y Adson/Roos exploran el desfiladero torácico.',
      },
      {
        id: 'q3',
        prompt: '¿Cuál es la conducta correcta en la primera sesión?',
        options: [
          {
            id: 'a',
            text: 'Derivar para imagen antes de aplicar técnicas manuales sobre el segmento',
            correct: true,
          },
          { id: 'b', text: 'Manipulación torácica en decúbito prono', correct: false },
          { id: 'c', text: 'Estiramiento agresivo en extensión torácica', correct: false },
          { id: 'd', text: 'Masaje profundo del erector espinal y alta', correct: false },
        ],
        explanation:
          'Ante banderas rojas con dos signos positivos, la prioridad es la imagen. Cualquier técnica de alta velocidad o carga en extensión sobre un cuerpo vertebral fracturado puede agravar el colapso. El tratamiento activo llega después, y con el diagnóstico confirmado.',
      },
    ],
    takeaway:
      'En dorsalgia aguda del paciente mayor u osteoporótico, percusión con puño cerrado + signo del supino positivos obligan a imagen antes de tocar el segmento.',
  },
  {
    id: 'th-outlet',
    region: 'thoracic',
    title: 'Hormigueo en la mano al trabajar con los brazos elevados',
    level: 'avanzado',
    vignette:
      'Pintor de 38 años. Refiere hormigueo y pesadez en el brazo derecho tras veinte o treinta minutos trabajando con los brazos por encima de la cabeza. Las parestesias se concentran en el borde cubital de la mano. El dolor cervical es leve y la rotación cervical es completa e indolora. Postura de hombros adelantados y respiración costal alta.',
    tags: ['Desfiladero torácico', 'Escalenos', 'Diagnóstico diferencial'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué hallazgo aleja el diagnóstico de radiculopatía cervical?',
        options: [
          {
            id: 'a',
            text: 'La rotación cervical completa e indolora, con síntomas que dependen de la POSICIÓN DEL BRAZO',
            correct: true,
          },
          { id: 'b', text: 'La edad del paciente', correct: false },
          { id: 'c', text: 'La distribución en el borde cubital', correct: false },
          { id: 'd', text: 'La postura de hombros adelantados', correct: false },
        ],
        explanation:
          'En la radiculopatía cervical los síntomas se modifican con el movimiento del CUELLO (Spurling positivo, rotación limitada). Aquí el desencadenante es sostener el brazo elevado, lo que apunta a compresión en la salida del tórax. El territorio cubital es compatible con ambas (C8-T1), así que no discrimina.',
      },
      {
        id: 'q2',
        prompt: 'La prueba de Roos (EAST) reproduce los síntomas a los dos minutos. ¿Cómo lo interpretas?',
        options: [
          {
            id: 'a',
            text: 'Apoya la sospecha, pero es poco específica: hay que integrarla con la clínica y con los otros tests',
            correct: true,
          },
          { id: 'b', text: 'Confirma el diagnóstico por sí sola', correct: false },
          { id: 'c', text: 'Descarta el desfiladero torácico', correct: false },
          { id: 'd', text: 'Indica compresión del nervio mediano en la muñeca', correct: false },
        ],
        explanation:
          'Roos/EAST tiene sensibilidad alta y especificidad baja: muchos sujetos sanos refieren molestias al mantener la posición. Sirve sobre todo para DESCARTAR cuando es negativo y como pieza de un conjunto cuando es positivo. Compara siempre los dos lados: lo informativo es la asimetría.',
      },
      {
        id: 'q3',
        prompt: '¿Por dónde empieza el tratamiento conservador?',
        options: [
          {
            id: 'a',
            text: 'Reeducación respiratoria y postural, con trabajo de escalenos, pectoral menor y control escapular',
            correct: true,
          },
          { id: 'b', text: 'Inmovilización del hombro con cabestrillo', correct: false },
          { id: 'c', text: 'Fortalecimiento máximo del trapecio superior', correct: false },
          { id: 'd', text: 'Tracción cervical de alta carga', correct: false },
        ],
        explanation:
          'El desfiladero se estrecha con la respiración costal alta (escalenos hipertónicos elevando la primera costilla) y con la escápula en anteposición y descenso (pectoral menor corto). Devolver una respiración diafragmática y una posición escapular eficiente abre el espacio. Reforzar el trapecio superior cerraría aún más el desfiladero.',
      },
    ],
    takeaway:
      'Síntomas que dependen de la posición del BRAZO y no del cuello orientan al desfiladero torácico; los tests provocativos apoyan pero no confirman, y el tratamiento empieza por respiración y escápula.',
  },
];
