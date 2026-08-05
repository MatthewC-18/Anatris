// src/data/clinicalCases.ts
//
// Registry of interactive clinical cases by region. Cases are AUTHORED content
// (clinical reasoning can't be auto-generated from the muscle table), drafted
// from standard physiotherapy teaching as a starting point — verify before any
// professional use. Adding a case = append to the right region array.
//
// Authoring rules: user-facing prose in Latin American Spanish (UTF-8 with
// accents); ids/keys ASCII.

import type { ClinicalCase } from '../types/clinicalCase';

const SHOULDER: ClinicalCase[] = [
  {
    id: 'sh-impingement',
    region: 'shoulder',
    title: 'Dolor en arco medio de abducción',
    level: 'básico',
    vignette:
      'Mujer de 45 años, pintora, con dolor en la cara lateral del hombro al elevar el brazo. Refiere un “arco doloroso” entre los 60° y 120° de abducción, que cede por encima y por debajo de ese rango. Sin antecedente traumático.',
    tags: ['Manguito rotador', 'Pinzamiento subacromial', 'Supraespinoso'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué estructura es la más probablemente implicada en un arco doloroso de 60–120°?',
        options: [
          { id: 'a', text: 'Tendón del supraespinoso', correct: true },
          { id: 'b', text: 'Cápsula posterior glenohumeral', correct: false },
          { id: 'c', text: 'Tendón del subescapular', correct: false },
          { id: 'd', text: 'Bíceps porción corta', correct: false },
        ],
        explanation:
          'El arco doloroso medio es clásico del pinzamiento subacromial: en ese rango el supraespinoso (y la bursa) se comprimen contra el acromion. El supraespinoso es el tendón del manguito más frecuentemente afectado.',
      },
      {
        id: 'q2',
        prompt: '¿Qué prueba ayuda a aislar el supraespinoso?',
        options: [
          { id: 'a', text: 'Maniobra de Jobe (lata vacía)', correct: true },
          { id: 'b', text: 'Test de Lachman', correct: false },
          { id: 'c', text: 'Signo de Froment', correct: false },
          { id: 'd', text: 'Test de Thomas', correct: false },
        ],
        explanation:
          'La maniobra de Jobe (lata vacía) carga selectivamente al supraespinoso: abducción a 90° en el plano de la escápula, rotación interna y resistencia descendente. Lachman es de rodilla, Froment de nervio cubital y Thomas de flexores de cadera.',
      },
      {
        id: 'q3',
        prompt: '¿Cuál es un objetivo inicial razonable del tratamiento conservador?',
        options: [
          { id: 'a', text: 'Recentrar la cabeza humeral fortaleciendo el manguito y mejorando el ritmo escapular', correct: true },
          { id: 'b', text: 'Inmovilización estricta 6 semanas', correct: false },
          { id: 'c', text: 'Potenciar solo el deltoides medio', correct: false },
          { id: 'd', text: 'Estiramiento agresivo en el rango doloroso', correct: false },
        ],
        explanation:
          'Sin desgarro completo, el manejo conservador busca descomprimir el espacio subacromial: fortalecer el manguito (depresores de la cabeza humeral) y los estabilizadores escapulares, evitando provocar dolor. La inmovilización prolongada y el deltoides aislado tienden a empeorar el pinzamiento.',
      },
    ],
    takeaway:
      'Arco doloroso medio + Jobe positivo orientan a pinzamiento del supraespinoso. El tratamiento prioriza recentrar la cabeza humeral (manguito + control escapular) antes que ganar rango a la fuerza.',
  },
  {
    id: 'sh-suprascapular',
    region: 'shoulder',
    title: 'Debilidad de rotación externa',
    level: 'intermedio',
    vignette:
      'Voleibolista de 22 años con pérdida de fuerza en la rotación externa del hombro dominante y atrofia visible en la fosa infraespinosa. No hay dolor significativo ni pérdida de sensibilidad cutánea.',
    tags: ['Infraespinoso', 'Nervio supraescapular', 'C5–C6'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué músculo explica mejor la debilidad de rotación externa con esa atrofia?',
        options: [
          { id: 'a', text: 'Infraespinoso', correct: true },
          { id: 'b', text: 'Redondo mayor', correct: false },
          { id: 'c', text: 'Pectoral mayor', correct: false },
          { id: 'd', text: 'Dorsal ancho', correct: false },
        ],
        explanation:
          'El infraespinoso es el principal rotador externo del manguito y ocupa la fosa infraespinosa; su atrofia es visible ahí. El redondo mayor, pectoral mayor y dorsal ancho son rotadores internos / aductores.',
      },
      {
        id: 'q2',
        prompt: '¿Qué nervio, atrapado en la escotadura espinoglenoidea, produciría debilidad aislada de rotación externa sin déficit sensitivo cutáneo?',
        options: [
          { id: 'a', text: 'Nervio supraescapular', correct: true },
          { id: 'b', text: 'Nervio axilar', correct: false },
          { id: 'c', text: 'Nervio musculocutáneo', correct: false },
          { id: 'd', text: 'Nervio torácico largo', correct: false },
        ],
        explanation:
          'El nervio supraescapular (C5–C6) inerva supraespinoso e infraespinoso. Atrapado en la escotadura espinoglenoidea afecta solo al infraespinoso, sin déficit sensitivo cutáneo (es esencialmente motor en ese punto). El axilar afectaría deltoides/redondo menor; el torácico largo, el serrato anterior.',
      },
    ],
    takeaway:
      'Atrofia infraespinosa + debilidad aislada de rotación externa sin déficit sensitivo sugiere atrapamiento del nervio supraescapular en la escotadura espinoglenoidea, típico en deportes de lanzamiento.',
  },
  {
    id: 'sh-cant-initiate',
    region: 'shoulder',
    title: 'No puede iniciar la abducción',
    level: 'intermedio',
    vignette:
      'Hombre de 60 años tras una caída sobre el hombro. Al pedirle que separe el brazo del cuerpo no logra iniciar el movimiento, pero si se le eleva pasivamente hasta ~30° puede continuar y sostenerlo.',
    tags: ['Supraespinoso', 'Deltoides', 'Desgarro del manguito'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué músculo es el principal iniciador de los primeros grados de abducción?',
        options: [
          { id: 'a', text: 'Supraespinoso', correct: true },
          { id: 'b', text: 'Deltoides medio', correct: false },
          { id: 'c', text: 'Trapecio superior', correct: false },
          { id: 'd', text: 'Subescapular', correct: false },
        ],
        explanation:
          'El supraespinoso inicia la abducción (~primeros 15°) y centra la cabeza humeral para que el deltoides actúe con ventaja. Por eso, si está roto, el paciente no puede iniciar, pero una vez superado ese tramo el deltoides toma el relevo.',
      },
      {
        id: 'q2',
        prompt: 'El paciente continúa el rango tras la ayuda inicial. ¿Qué confirma esto?',
        options: [
          { id: 'a', text: 'El deltoides (y su nervio axilar) están funcionales', correct: true },
          { id: 'b', text: 'Hay una luxación glenohumeral', correct: false },
          { id: 'c', text: 'El trapecio está paralizado', correct: false },
          { id: 'd', text: 'Hay lesión del plexo braquial completo', correct: false },
        ],
        explanation:
          'Que pueda continuar y sostener la abducción una vez iniciada indica que el deltoides y el nervio axilar funcionan; el problema está en el iniciador (supraespinoso). Es el patrón típico del desgarro del supraespinoso.',
      },
    ],
    takeaway:
      'Incapacidad de INICIAR la abducción con capacidad de continuarla tras ayuda pasiva apunta a desgarro del supraespinoso, con deltoides/axilar intactos.',
  },
];

const ELBOW: ClinicalCase[] = [
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

const KNEE: ClinicalCase[] = [
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
        prompt: '¿Qué prueba clínica explora la integridad del LCA?',
        options: [
          { id: 'a', text: 'Test de Lachman', correct: true },
          { id: 'b', text: 'Maniobra de Jobe', correct: false },
          { id: 'c', text: 'Test de McMurray como prueba ligamentaria', correct: false },
          { id: 'd', text: 'Signo de Tinel', correct: false },
        ],
        explanation:
          'El test de Lachman (traslación anterior de la tibia a ~20–30° de flexión) es el más sensible para el LCA. McMurray evalúa meniscos, Jobe el supraespinoso y Tinel la irritabilidad de un nervio.',
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

const CERVICAL: ClinicalCase[] = [
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

const LUMBAR: ClinicalCase[] = [
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

const THORACIC: ClinicalCase[] = [
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

const HIP: ClinicalCase[] = [
  {
    id: 'hip-fai',
    region: 'hip',
    title: 'Dolor inguinal en futbolista de 24 años',
    level: 'intermedio',
    vignette:
      'Futbolista de 24 años con dolor inguinal derecho de seis meses, progresivo, sin traumatismo. Empeora al sentarse mucho rato, al entrar y salir del coche y en los cambios de dirección. Señala la ingle con la mano en pinza. En la exploración, la rotación interna de cadera en flexión de 90° es de 15° a la derecha y de 35° a la izquierda.',
    tags: ['Pinzamiento femoroacetabular', 'Labrum', 'FADIR'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué significa el signo de la C que hace el paciente con la mano?',
        options: [
          {
            id: 'a',
            text: 'Dolor intraarticular profundo de cadera',
            correct: true,
          },
          { id: 'b', text: 'Tendinopatía glútea lateral', correct: false },
          { id: 'c', text: 'Dolor referido lumbar', correct: false },
          { id: 'd', text: 'Hernia inguinal', correct: false },
        ],
        explanation:
          'El signo de la C (mano en pinza abrazando la cara lateral y anterior de la cadera) es un gesto característico del dolor intraarticular. Un dolor lateral puntual con el dedo apunta a tendinopatía glútea, y un dolor difuso lumbar se señala con la palma en la espalda.',
      },
      {
        id: 'q2',
        prompt: '¿Qué test provoca mejor el pinzamiento anterior?',
        options: [
          { id: 'a', text: 'FADIR (flexión, aducción y rotación interna)', correct: true },
          { id: 'b', text: 'Prueba de Ober', correct: false },
          { id: 'c', text: 'Signo de Trendelenburg', correct: false },
          { id: 'd', text: 'Prueba de Thomas', correct: false },
        ],
        explanation:
          'FADIR lleva el cuello femoral contra el reborde acetabular anterosuperior y comprime el labrum: es el test de provocación del pinzamiento anterior, muy sensible y poco específico. Ober valora la banda iliotibial, Trendelenburg los abductores y Thomas la longitud de los flexores.',
      },
      {
        id: 'q3',
        prompt: 'La asimetría de rotación interna (15° vs 35°) es el dato más objetivo. ¿Qué implica para el tratamiento?',
        options: [
          {
            id: 'a',
            text: 'Trabajar control lumbopélvico y fuerza de cadera evitando el rango de choque, sin forzar la rotación interna',
            correct: true,
          },
          { id: 'b', text: 'Estirar agresivamente la cadera en rotación interna forzada', correct: false },
          { id: 'c', text: 'Reposo deportivo absoluto durante tres meses', correct: false },
          { id: 'd', text: 'Fortalecer solo el psoas en rango máximo de flexión', correct: false },
        ],
        explanation:
          'La restricción es de origen ÓSEO (morfología cam), no de tejido blando: forzar la rotación interna repite el choque y agrava la lesión labral. El tratamiento conservador de referencia es fuerza de cadera y control lumbopélvico dentro de un rango libre de dolor, con adaptación del gesto deportivo.',
      },
    ],
    takeaway:
      'Dolor inguinal + signo de la C + asimetría de rotación interna en flexión = sospecha de pinzamiento femoroacetabular; se trabaja fuerza y control POR DEBAJO del rango de choque, no estirando contra el hueso.',
  },
  {
    id: 'hip-gluteal-tendinopathy',
    region: 'hip',
    title: 'Dolor lateral de cadera que no deja dormir',
    level: 'básico',
    vignette:
      'Mujer de 55 años con dolor en la cara lateral de la cadera izquierda desde hace cuatro meses. No puede dormir sobre ese lado ni cruzar las piernas. Duele al subir escaleras y al estar de pie mucho rato. La palpación del trocánter mayor es exquisitamente dolorosa. En apoyo monopodal izquierdo, la pelvis derecha desciende.',
    tags: ['Tendinopatía glútea', 'Trendelenburg', 'Glúteo medio'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué estructura explica mejor el cuadro?',
        options: [
          {
            id: 'a',
            text: 'Tendón del glúteo medio y menor en su inserción en el trocánter mayor',
            correct: true,
          },
          { id: 'b', text: 'Labrum acetabular', correct: false },
          { id: 'c', text: 'Bursa iliopectínea', correct: false },
          { id: 'd', text: 'Raíz L4', correct: false },
        ],
        explanation:
          'El dolor lateral sobre el trocánter con imposibilidad de tumbarse de ese lado es el cuadro clásico de la tendinopatía glútea (el antiguo "bursitis trocantérea": hoy sabemos que el tendón es la estructura dominante). El labrum da dolor inguinal y L4 daría irradiación por la cara anteromedial del muslo.',
      },
      {
        id: 'q2',
        prompt: 'La pelvis derecha desciende en apoyo monopodal izquierdo. ¿Cómo se llama y qué indica?',
        options: [
          {
            id: 'a',
            text: 'Signo de Trendelenburg positivo: insuficiencia de los abductores IZQUIERDOS',
            correct: true,
          },
          {
            id: 'b',
            text: 'Signo de Trendelenburg positivo: insuficiencia de los abductores derechos',
            correct: false,
          },
          { id: 'c', text: 'Signo de Thomas positivo', correct: false },
          { id: 'd', text: 'Signo de Ober positivo', correct: false },
        ],
        explanation:
          'El Trendelenburg se nombra por el lado de APOYO: si la pelvis del lado que cuelga (derecha) desciende, el fallo está en los abductores del lado que soporta (izquierda). Es un error frecuente y cambia por completo el objetivo del tratamiento.',
      },
      {
        id: 'q3',
        prompt: '¿Qué consejo empeoraría el cuadro?',
        options: [
          {
            id: 'a',
            text: 'Estirar la banda iliotibial cruzando la pierna por delante en aducción mantenida',
            correct: true,
          },
          { id: 'b', text: 'Dormir con una almohada entre las rodillas', correct: false },
          { id: 'c', text: 'Ejercicio isométrico de abducción de baja carga', correct: false },
          { id: 'd', text: 'Evitar estar de pie con la cadera "colgada" hacia un lado', correct: false },
        ],
        explanation:
          'La aducción COMPRIME el tendón glúteo contra el trocánter mayor: los estiramientos en aducción y dormir sin almohada entre las rodillas mantienen la compresión y perpetúan el dolor. El tratamiento va por evitar la compresión y cargar el tendón progresivamente.',
      },
    ],
    takeaway:
      'En el dolor lateral de cadera la clave es la COMPRESIÓN en aducción: quitarla (postura, almohada, evitar estiramientos en aducción) y cargar el tendón de forma progresiva.',
  },
];

const ANKLE: ClinicalCase[] = [
  {
    id: 'ankle-lateral-sprain',
    region: 'ankle',
    title: 'Esguince de tobillo en inversión',
    level: 'básico',
    vignette:
      'Jugadora de baloncesto de 21 años. Al caer de un rebote pisa el pie de una compañera y el tobillo derecho se va en inversión. Acude a las 48 horas con edema y hematoma por delante y por debajo del maléolo lateral. Puede apoyar y dar cuatro pasos, con dolor. No hay dolor a la palpación del borde posterior de los maléolos ni de la base del quinto metatarsiano.',
    tags: ['LPAA', 'Reglas de Ottawa', 'Propiocepción'],
    steps: [
      {
        id: 'q1',
        prompt: '¿Qué ligamento se lesiona primero en el mecanismo de inversión?',
        options: [
          { id: 'a', text: 'Peroneoastragalino anterior (LPAA)', correct: true },
          { id: 'b', text: 'Deltoideo', correct: false },
          { id: 'c', text: 'Peroneocalcáneo', correct: false },
          { id: 'd', text: 'Ligamento tibioperoneo anteroinferior', correct: false },
        ],
        explanation:
          'El peroneoastragalino anterior es el más débil y el primero en ceder en inversión con flexión plantar. El peroneocalcáneo se lesiona después, en esguinces más graves. El deltoideo es medial (mecanismo de eversión) y el tibioperoneo corresponde a la sindesmosis (rotación externa).',
      },
      {
        id: 'q2',
        prompt: 'Según los datos de la exploración, ¿está indicada la radiografía por las reglas de Ottawa?',
        options: [
          {
            id: 'a',
            text: 'No: puede apoyar cuatro pasos y no hay dolor óseo en los puntos clave',
            correct: true,
          },
          { id: 'b', text: 'Sí, porque hay hematoma', correct: false },
          { id: 'c', text: 'Sí, siempre tras un esguince deportivo', correct: false },
          { id: 'd', text: 'No se pueden aplicar en menores de 25 años', correct: false },
        ],
        explanation:
          'Las reglas de Ottawa indican radiografía si hay dolor óseo en el borde posterior o la punta de cualquier maléolo, en el escafoides o en la base del quinto metatarsiano, O si el paciente no puede dar cuatro pasos. Aquí no se cumple ninguno: son reglas muy sensibles, así que un negativo hace la fractura muy improbable. El edema y el hematoma no son criterio.',
      },
      {
        id: 'q3',
        prompt: '¿Cuál es el factor que más se asocia a la recidiva y hay que tratar sí o sí?',
        options: [
          {
            id: 'a',
            text: 'El déficit propioceptivo y la reacción tardía de los peroneos',
            correct: true,
          },
          { id: 'b', text: 'El tamaño del hematoma', correct: false },
          { id: 'c', text: 'La fuerza máxima del cuádriceps', correct: false },
          { id: 'd', text: 'La movilidad de la primera articulación metatarsofalángica', correct: false },
        ],
        explanation:
          'La inestabilidad crónica de tobillo se explica más por el déficit sensoriomotor (retardo del reflejo peroneo, mal control postural) que por la laxitud ligamentosa aislada. Por eso el trabajo propioceptivo y de fuerza de los peroneos es el pilar de la prevención de recidivas.',
      },
    ],
    takeaway:
      'Esguince lateral: LPAA primero, Ottawa para decidir la imagen y propiocepción + peroneos para evitar que se repita.',
  },
  {
    id: 'ankle-achilles',
    region: 'ankle',
    title: 'Dolor en el tendón de Aquiles en corredor',
    level: 'intermedio',
    vignette:
      'Corredor aficionado de 42 años que ha subido de 30 a 55 kilómetros semanales en un mes preparando una media maratón. Dolor y rigidez en el tercio medio del tendón de Aquiles derecho, peor al levantarse por la mañana, que mejora al calentar y reaparece al terminar. La dorsiflexión con la rodilla extendida es de 6°; con la rodilla flexionada, de 18°.',
    tags: ['Tendinopatía aquílea', 'Dorsiflexión', 'Carga progresiva'],
    steps: [
      {
        id: 'q1',
        prompt: 'La dorsiflexión mejora al flexionar la rodilla (6° a 18°). ¿Qué indica?',
        options: [
          {
            id: 'a',
            text: 'Retracción del gastrocnemio, que es biarticular y se destensa al flexionar la rodilla',
            correct: true,
          },
          { id: 'b', text: 'Retracción del sóleo', correct: false },
          { id: 'c', text: 'Bloqueo óseo de la mortaja tibioperoneoastragalina', correct: false },
          { id: 'd', text: 'Debilidad del tibial anterior', correct: false },
        ],
        explanation:
          'Es la prueba de Silfverskiöld. El gastrocnemio cruza rodilla y tobillo: al flexionar la rodilla se relaja y la dorsiflexión aumenta. Si la limitación NO cambiara con la rodilla flexionada, el responsable sería el sóleo (monoarticular) o un tope óseo.',
      },
      {
        id: 'q2',
        prompt: '¿Qué elemento de la historia es el más determinante en la génesis del cuadro?',
        options: [
          {
            id: 'a',
            text: 'El salto brusco de volumen de entrenamiento (de 30 a 55 km/semana en un mes)',
            correct: true,
          },
          { id: 'b', text: 'La edad del paciente', correct: false },
          { id: 'c', text: 'El horario del entrenamiento', correct: false },
          { id: 'd', text: 'La rigidez matutina', correct: false },
        ],
        explanation:
          'La tendinopatía es un problema de CARGA: el error de progresión es el factor modificable central. La rigidez matutina es un síntoma característico, no la causa; y la edad es un factor de riesgo de fondo que no se puede cambiar.',
      },
      {
        id: 'q3',
        prompt: '¿Cuál es la primera línea de tratamiento con mejor respaldo?',
        options: [
          {
            id: 'a',
            text: 'Ejercicio de carga progresiva del tríceps sural, ajustando el volumen de carrera',
            correct: true,
          },
          { id: 'b', text: 'Reposo completo hasta que desaparezca el dolor', correct: false },
          { id: 'c', text: 'Estiramiento pasivo intenso del tendón varias veces al día', correct: false },
          { id: 'd', text: 'Masaje transverso profundo como tratamiento único', correct: false },
        ],
        explanation:
          'La carga progresiva (isométrica al principio si duele mucho, luego excéntrica y de fuerza pesada lenta) es lo que remodela el tendón. El reposo completo lo debilita y el dolor vuelve al retomar la carrera; el estiramiento intenso añade compresión y tracción sin el estímulo de carga que el tendón necesita.',
      },
    ],
    takeaway:
      'Tendinopatía aquílea = problema de carga: corrige la progresión, mide la dorsiflexión con Silfverskiöld y trata con carga progresiva, no con reposo.',
  },
];

/** region id -> its clinical cases. Regions without cases simply omit the key. */
export const CLINICAL_CASES: Record<string, ClinicalCase[]> = {
  shoulder: SHOULDER,
  elbow: ELBOW,
  knee: KNEE,
  cervical: CERVICAL,
  thoracic: THORACIC,
  lumbar: LUMBAR,
  hip: HIP,
  ankle: ANKLE,
};

/** Cases for a region (empty array when none authored yet). */
export function casesForRegion(region: string | null): ClinicalCase[] {
  if (!region) return [];
  return CLINICAL_CASES[region] ?? [];
}
