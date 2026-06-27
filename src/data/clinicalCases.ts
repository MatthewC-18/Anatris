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

/** region id -> its clinical cases. Regions without cases simply omit the key. */
export const CLINICAL_CASES: Record<string, ClinicalCase[]> = {
  shoulder: SHOULDER,
  elbow: ELBOW,
  knee: KNEE,
  cervical: CERVICAL,
  lumbar: LUMBAR,
};

/** Cases for a region (empty array when none authored yet). */
export function casesForRegion(region: string | null): ClinicalCase[] {
  if (!region) return [];
  return CLINICAL_CASES[region] ?? [];
}
