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
          'Spurling cierra el foramen (extensión + inclinación homolateral + compresión axial) y por eso REPRODUCE el dolor radicular: es muy específico, así que un Spurling positivo pesa. La distracción cervical hace lo contrario (abre el foramen y ALIVIA), de modo que también apoya el origen radicular, pero no es la prueba que lo provoca. El ULNT mediano explora la mecanosensibilidad a lo largo del nervio y es sensible más que específico: sirve para descartar, no para confirmar un nivel. Y el Sharp-Purser no es una prueba radicular: busca inestabilidad atlantoaxial, otra pregunta y otra urgencia.',
      },
    ],
    takeaway:
      'Dolor irradiado al pulgar con debilidad de flexión de codo orienta a radiculopatía C6; el test de Spurling apoya el origen radicular cervical.',
  },
  // ---------------------------------------------------------------------------
  // LAS DOS PRESENTACIONES QUE FALTABAN.
  //
  // La region cervical tenia UN caso, la radiculopatia C6, y doce pruebas en su
  // biblioteca. Ocho de ellas -- las de mielopatia y las de estabilidad
  // cervical alta -- no aparecian en ningun razonamiento, y el caso que mas ve
  // un fisio, la cervicalgia mecanica sin signos neurologicos, no estaba.
  //
  // Son las dos que deciden algo distinto: una termina en ejercicio y la otra
  // en derivar sin tocar. Un alumno que solo ha visto la radiculopatia tiene
  // una sola rejilla para las tres.
  // ---------------------------------------------------------------------------
  {
    id: 'cx-mechanical-neck-pain',
    region: 'cervical',
    title: 'Cervicalgia de tres semanas en trabajo de oficina',
    level: 'básico',
    vignette:
      'Mujer de 34 años, administrativa, con dolor cervical bilateral de tres semanas que empeora al final de la jornada y mejora al moverse. No hay dolor por debajo del codo, ni hormigueos, ni pérdida de fuerza. La rotación activa hacia la derecha llega a 55° y molesta. No hubo traumatismo, no hay fiebre, ni pérdida de peso, ni dolor nocturno que la despierte.',
    tags: ['Cervicalgia mecánica', 'Sin banderas rojas', 'Ejercicio activo'],
    steps: [
      {
        id: 'q1',
        showsTest: 'cervical-rotation-limit',
        prompt:
          '¿Qué dato de esta historia es el que más aleja una radiculopatía cervical?',
        options: [
          {
            id: 'a',
            text: 'Que no haya dolor por debajo del codo ni déficit neurológico',
            correct: true,
          },
          { id: 'b', text: 'Que la rotación hacia el lado sintomático esté limitada a 55°', correct: false },
          { id: 'c', text: 'Que el dolor empeore al final de la jornada', correct: false },
          { id: 'd', text: 'Que tenga 34 años', correct: false },
        ],
        explanation:
          'Una radiculopatía se define por su DISTRIBUCIÓN y por el déficit: dolor o parestesias que siguen un dermatoma más allá del codo, con debilidad o reflejo alterado. Sin eso, el cuadro es mecánico. Cuidado con la rotación limitada: es un ítem sensible del clúster de Wainner y aquí parece apoyar la radiculopatía, pero aislada vale poco: un cuello que duele se mueve menos, radicular o no. Un ítem no es el clúster.',
      },
      {
        id: 'q2',
        showsTest: 'hoffmann',
        prompt: '¿Qué hallazgo nuevo cambiaría la conducta de inmediato?',
        options: [
          {
            id: 'a',
            text: 'Torpeza para abotonarse, objetos que se le caen y marcha insegura',
            correct: true,
          },
          { id: 'b', text: 'Crepitación al rotar el cuello', correct: false },
          { id: 'c', text: 'Contractura palpable del trapecio superior', correct: false },
          { id: 'd', text: 'Que el dolor aumente al cargar la mochila', correct: false },
        ],
        explanation:
          'Manos torpes y marcha insegura no son un cuello que duele: son la médula. Esa tríada obliga a buscar signos de primera neurona (Hoffmann, supinador invertido, Babinski) y a derivar, no a tratar. La crepitación y la contractura son hallazgos frecuentes y poco informativos; que el dolor suba con la carga es justamente lo esperable en un cuadro mecánico.',
      },
      {
        id: 'q3',
        prompt: 'Descartadas las banderas rojas, ¿por dónde empieza el tratamiento?',
        options: [
          {
            id: 'a',
            text: 'Ejercicio activo y educación sobre el dolor, con terapia manual como complemento',
            correct: true,
          },
          { id: 'b', text: 'Collarín blando y reposo relativo dos semanas', correct: false },
          { id: 'c', text: 'Manipulación cervical de alta velocidad como medida única', correct: false },
          { id: 'd', text: 'Resonancia antes de decidir cualquier tratamiento', correct: false },
        ],
        explanation:
          'En la cervicalgia mecánica el ejercicio activo y la educación son la base, y la terapia manual acompaña: alivia a corto plazo y por sí sola no sostiene el resultado. El collarín y el reposo van en contra de lo que hace falta, que es movimiento. La manipulación como medida única deja al paciente dependiente de la consulta. Y la imagen sin banderas rojas no cambia el plan: encuentra hallazgos degenerativos que también tiene la gente sin dolor.',
      },
    ],
    takeaway:
      'Sin dolor distal al codo, sin déficit y sin banderas rojas, es cervicalgia mecánica: ejercicio y educación, imagen no. Lo que hay que seguir vigilando son las manos y la marcha.',
  },
  {
    id: 'cx-myelopathy',
    region: 'cervical',
    title: 'Manos torpes y marcha insegura en varón de 68 años',
    level: 'avanzado',
    vignette:
      'Varón de 68 años que lleva ocho meses con torpeza progresiva en las dos manos: se le caen los objetos y no acierta con los botones. Camina con los pies más separados y ha tropezado dos veces. Hormigueo difuso en las dos manos, sin un dermatoma claro. El dolor cervical es leve. En la exploración los reflejos están exaltados en brazos y piernas.',
    tags: ['Mielopatía cervical', 'Primera neurona', 'Derivar'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué explica mejor el conjunto: dos manos, marcha y reflejos exaltados?',
        options: [
          { id: 'a', text: 'Mielopatía cervical por compresión medular', correct: true },
          { id: 'b', text: 'Radiculopatía C8 bilateral', correct: false },
          { id: 'c', text: 'Síndrome del túnel carpiano en las dos manos', correct: false },
          { id: 'd', text: 'Polineuropatía distal', correct: false },
        ],
        explanation:
          'Lo que señala la médula no es un síntoma, es la combinación: las DOS manos, la MARCHA y los reflejos EXALTADOS. Una raíz da un territorio y reflejos disminuidos, no exaltados. El túnel carpiano no afecta la marcha y respeta el territorio cubital. Una polineuropatía da hipoestesia en guante y calcetín con reflejos apagados. Hiperreflexia por encima y por debajo de la lesión es signo de primera neurona.',
      },
      {
        id: 'q2',
        showsTest: 'hoffmann',
        prompt: 'Las cuatro son pruebas cervicales. ¿Cuál grupo apoya esta hipótesis?',
        options: [
          { id: 'a', text: 'Signo de Hoffmann, supinador invertido y Babinski', correct: true },
          { id: 'b', text: 'Test de Spurling y distracción cervical', correct: false },
          { id: 'c', text: 'Test de tensión neural del MMSS, sesgo mediano', correct: false },
          { id: 'd', text: 'Test de Sharp-Purser y prueba del ligamento alar', correct: false },
        ],
        explanation:
          'Hoffmann, supinador invertido y Babinski buscan primera neurona, que es la hipótesis. Ninguno basta solo: el Hoffmann es específico pero poco sensible y aparece en personas sanas, así que lo que pesa es la suma con la clínica. Spurling y la distracción son pruebas RADICULARES: contestan otra pregunta. El ULNT explora mecanosensibilidad del nervio periférico. Y Sharp-Purser con el ligamento alar buscan inestabilidad atlantoaxial, que es una urgencia distinta y se plantea ante traumatismo o artritis inflamatoria, no ante esta historia.',
      },
      {
        id: 'q3',
        prompt: '¿Cuál es la conducta correcta en esta primera sesión?',
        options: [
          {
            id: 'a',
            text: 'Derivar para valoración médica e imagen, sin manipular ni traccionar el cuello',
            correct: true,
          },
          { id: 'b', text: 'Manipulación cervical para recuperar movilidad', correct: false },
          { id: 'c', text: 'Tracción cervical sostenida en camilla', correct: false },
          { id: 'd', text: 'Ejercicio de fuerza cervical progresivo y revisión en un mes', correct: false },
        ],
        explanation:
          'Una mielopatía progresiva es quirúrgica hasta que alguien demuestre lo contrario, y el pronóstico depende del tiempo: se deriva, con lo que se ha encontrado escrito. Manipular o traccionar un canal ya estrecho es el gesto que hay que evitar. Y el ejercicio progresivo con revisión en un mes no es inocuo aquí: regala un mes a un cuadro que avanza.',
      },
    ],
    takeaway:
      'Dos manos torpes + marcha insegura + hiperreflexia es médula, no cuello: se buscan signos de primera neurona y se deriva. Ninguna técnica cervical antes de la imagen.',
  },
];
