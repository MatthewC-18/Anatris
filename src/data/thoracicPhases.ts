// src/data/thoracicPhases.ts
//
// The 7-phase pedagogical track for the THORACIC spine. Analogue of
// elbowPhases.ts. See cervicalPhases.ts for the structure rationale.
//
// ENCODING: user-facing strings in Latin American Spanish WITH accents/enie,
// UTF-8 without BOM. ids/keys/enum-values/comments ASCII only.
//
// CONTENT DISCLAIMER: phases 4-7 drafted from standard physiotherapy knowledge.
// Tests/syndromes named are real; wording is draft. Every Citation is
// pageVerified:false. Needs physiotherapist review.
//
// GUEST MUSCLES in the biomechanics guides: trunk flexion/rotation/lateral
// flexion recruit the abdominal wall and quadratus lumborum, which live in the
// lumbar sub-region but move the whole trunk. They are referenced here (light
// up in 3D, named via musclesForRomLookup) with a note that they belong to the
// lumbar region. This mirrors thoracicRom.ts.
//
// CRITICAL INVARIANT: each GestureGuide.movementId MUST equal the id of its
// RomMovement in thoracicRom.ts (thoracic-flexion / thoracic-extension /
// thoracic-lateral-flexion / thoracic-rotation). Verified in Node.

import type {
  PerMusclePhase,
  TestsPhase,
  PathologyPhase,
  TreatmentPhase,
  CasePhase,
  GestureGuide,
  RegionTrack,
} from '../types/pedagogy';

/* ===========================================================================
 * MUSCLE ORDER (superficial -> deep)
 * ======================================================================== */
const THORACIC_MUSCLE_ORDER: string[] = [
  'iliocostalis-thoracis',
  'longissimus-thoracis',
  'spinalis-thoracis',
  'semispinalis-thoracis',
  'multifidus-thoracis',
  'rotatores',
  'interspinales-thoracis',
];

/* ===========================================================================
 * GUIDED GESTURES (biomechanics phase). movementId === RomMovement.id.
 * ======================================================================== */
const FLEXION_GUIDE: GestureGuide = {
  movementId: 'thoracic-flexion',
  name: 'Flexión',
  intro: {
    text: 'La flexión del tronco no la produce la musculatura intrínseca del raquis: la inicia la pared abdominal de forma concéntrica, y luego el erector espinal torácico controla excéntricamente el descenso. Recorre los pasos para ver el cambio de motor a freno.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'abdominal-wall-initiates',
      title: 'La pared abdominal inicia',
      rangeLabel: 'Inicio (motor abdominal)',
      caption: {
        text: 'El recto del abdomen aproxima el tórax a la pelvis y los oblicuos colaboran, iniciando la flexión del tronco de forma concéntrica. Aunque la pared abdominal pertenece a la región lumbar, mueve todo el raquis y por eso aparece aquí.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'rectus-abdominis', role: 'prime-mover' },
        { id: 'external-oblique', role: 'assistant' },
        { id: 'internal-oblique', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'erector-eccentric-control',
      title: 'El erector frena excéntricamente',
      rangeLabel: 'Rango medio-final (control excéntrico)',
      caption: {
        text: 'Superado el punto de equilibrio, la gravedad mueve el tronco hacia delante y el erector espinal torácico se contrae excéntricamente para frenar el descenso, controlando su velocidad. Es el motor del control, no de la flexión.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'longissimus-thoracis', role: 'prime-mover' },
        { id: 'iliocostalis-thoracis', role: 'assistant' },
        { id: 'multifidus-thoracis', role: 'stabilizer' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const EXTENSION_GUIDE: GestureGuide = {
  movementId: 'thoracic-extension',
  name: 'Extensión',
  intro: {
    text: 'La extensión torácica es un rango limitado por las apófisis espinosas y la caja torácica. El erector espinal torácico endereza la cifosis de forma concéntrica, con el transversoespinoso asegurando cada segmento.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'erector-extends',
      title: 'El erector endereza la cifosis',
      rangeLabel: 'Inicio-medio',
      caption: {
        text: 'El longísimo, el iliocostal y el espinoso torácicos extienden la columna concéntricamente, enderezando la cifosis torácica desde la posición neutra.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'longissimus-thoracis', role: 'prime-mover' },
        { id: 'iliocostalis-thoracis', role: 'prime-mover' },
        { id: 'spinalis-thoracis', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'transversospinalis-segments',
      title: 'El transversoespinoso asegura el segmento',
      rangeLabel: 'Final',
      caption: {
        text: 'Cerca del límite, el semiespinoso y los multífidos torácicos aseguran la extensión segmentaria mientras las apófisis espinosas se aproximan y topan.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'semispinalis-thoracis', role: 'prime-mover' },
        { id: 'multifidus-thoracis', role: 'assistant' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const LATERAL_FLEXION_GUIDE: GestureGuide = {
  movementId: 'thoracic-lateral-flexion',
  name: 'Inclinación lateral',
  intro: {
    text: 'La inclinación lateral del tronco combina el erector espinal y el oblicuo externo ipsilaterales con la fijación lumbopélvica del cuadrado lumbar. Es un movimiento acoplado con la rotación.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'ipsilateral-trunk-benders',
      title: 'Los inclinadores ipsilaterales',
      rangeLabel: 'Todo el rango',
      caption: {
        text: 'El iliocostal y el longísimo torácicos del lado hacia el que se inclina producen la inclinación; el oblicuo externo ipsilateral aproxima la caja torácica a la pelvis y el cuadrado lumbar fija la base lumbopélvica. Los abdominales y el cuadrado lumbar viven en la región lumbar.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'iliocostalis-thoracis', role: 'prime-mover' },
        { id: 'external-oblique', role: 'assistant' },
        { id: 'quadratus-lumborum', role: 'stabilizer' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const ROTATION_GUIDE: GestureGuide = {
  movementId: 'thoracic-rotation',
  name: 'Rotación',
  intro: {
    text: 'La columna torácica es la región del raquis donde más rotación se produce: la orientación de sus carillas la favorece. El motor profundo es el transversoespinoso contralateral, pero el gran motor de la rotación del tronco son los oblicuos cruzados.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'deep-rotators',
      title: 'El motor profundo segmentario',
      rangeLabel: 'Inicio',
      caption: {
        text: 'Los rotadores y el semiespinoso torácico del lado opuesto inician la rotación segmento a segmento. Los rotadores son sobre todo órganos propioceptivos que afinan el movimiento más que generarlo.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'rotatores', role: 'prime-mover' },
        { id: 'semispinalis-thoracis', role: 'assistant' },
        { id: 'multifidus-thoracis', role: 'assistant' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'oblique-force-couple',
      title: 'El par de fuerzas de los oblicuos',
      rangeLabel: 'Rango medio-final (motor abdominal)',
      caption: {
        text: 'El oblicuo externo de un lado y el oblicuo interno del lado opuesto forman un par de fuerzas que gira la caja torácica: es el motor real de gestos como lanzar o girar el tronco. Ambos pertenecen a la región lumbar pero rotan todo el tronco.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'external-oblique', role: 'prime-mover' },
        { id: 'internal-oblique', role: 'prime-mover' },
        { id: 'semispinalis-thoracis', role: 'assistant' },
      ],
      view: 'superior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

/* ===========================================================================
 * PHASES 1-3 (per-muscle projections)
 * ======================================================================== */
const anatomy: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: THORACIC_MUSCLE_ORDER,
  fields: ['origin', 'insertion', 'innervation'],
};

const biomechanics: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: THORACIC_MUSCLE_ORDER,
  fields: [
    'actions',
    'biomechanics',
    'functionalPositions',
    'synergists',
    'antagonists',
  ],
  guides: [
    FLEXION_GUIDE,
    EXTENSION_GUIDE,
    LATERAL_FLEXION_GUIDE,
    ROTATION_GUIDE,
  ],
};

const palpation: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: THORACIC_MUSCLE_ORDER,
  fields: ['palpation'],
};

/* ===========================================================================
 * PHASE 4 -- TESTS (region-level)
 * ======================================================================== */
const tests: TestsPhase = {
  scope: 'region',
  intro: {
    text: 'La exploración torácica valora la movilidad (sobre todo la rotación y la extensión, a menudo reducidas), el dolor de origen costovertebral o costotransverso, y el control de la postura cifótica. El dolor torácico siempre obliga a descartar causas viscerales antes de atribuirlo al raquis.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  tests: [
    {
      id: 'thoracic-rotation-seated',
      name: 'Rotación torácica sentada',
      assesses: {
        text: 'Amplitud y simetría de la rotación torácica, con frecuencia limitada en la dorsalgia mecánica.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      procedure: {
        text: 'Sentado con los brazos cruzados sobre el pecho para fijar la cintura escapular, el paciente rota el tronco a cada lado mientras el evaluador estabiliza la pelvis y compara la amplitud.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      positiveSign: {
        text: 'Una asimetría marcada o reproducción del dolor con la rotación orienta a restricción segmentaria o dolor costovertebral del lado limitado.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'Distinguir la LIMITACIÓN indolora (rigidez/restricción segmentaria) del dolor reproducido (componente articular costovertebral). Fijar la pelvis es esencial para no confundir la rotación lumbar o de cadera con la torácica.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
      },
      targetMuscleIds: ['rotatores', 'semispinalis-thoracis'],
    },
    {
      id: 'costovertebral-springing',
      name: 'Presión posteroanterior costovertebral',
      assesses: {
        text: 'Dolor y movilidad de las articulaciones costovertebrales y costotransversas.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      procedure: {
        text: 'En decúbito prono, el evaluador aplica presiones posteroanteriores graduadas sobre las apófisis transversas y los ángulos costales, valorando el dolor y la rigidez segmentaria.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      positiveSign: {
        text: 'Reproducción del dolor local sobre una articulación costovertebral orienta a un síndrome costovertebral o una disfunción segmentaria.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'Valora dolor y rigidez por nivel, no fuerza. Un dolor reproducido de forma constante en un nivel concreto localiza la disfunción. Descartar primero causas viscerales o costales (fractura) ante dolor desproporcionado.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
      },
      targetMuscleIds: [],
    },
  ],
};

/* ===========================================================================
 * PHASE 5 -- PATHOLOGY (region-level)
 * ======================================================================== */
const pathology: PathologyPhase = {
  scope: 'region',
  intro: {
    text: 'Las patologías torácicas más frecuentes en fisioterapia son la dorsalgia mecánica, la hipercifosis postural y el síndrome costovertebral. El dolor torácico exige descartar causas viscerales antes de un diagnóstico mecánico.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  pathologies: [
    {
      id: 'mechanical-thoracic-pain',
      name: 'Dorsalgia mecánica',
      description: {
        text: 'Dolor torácico de origen articular o muscular, asociado con frecuencia a posturas mantenidas y a una rotación torácica reducida. Suele cursar con disfunción segmentaria y puntos dolorosos paravertebrales.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor interescapular o paravertebral que empeora con posturas sostenidas y mejora con el movimiento, a menudo con limitación de la rotación y la extensión torácicas.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['multifidus-thoracis', 'longissimus-thoracis', 'rotatores'],
      relatedTestIds: ['thoracic-rotation-seated', 'costovertebral-springing'],
    },
    {
      id: 'postural-hyperkyphosis',
      name: 'Hipercifosis postural',
      description: {
        text: 'Aumento de la curvatura cifótica torácica de origen postural, con debilidad y elongación de los extensores torácicos y acortamiento de la musculatura anterior. Frecuente en el trabajo de escritorio y en adolescentes.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Postura de espalda redondeada con hombros adelantados, fatiga y dolor de la musculatura extensora torácica, y reducción de la extensión torácica activa.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['longissimus-thoracis', 'iliocostalis-thoracis', 'spinalis-thoracis'],
      relatedTestIds: ['thoracic-rotation-seated'],
    },
    {
      id: 'costovertebral-syndrome',
      name: 'Síndrome costovertebral',
      description: {
        text: 'Disfunción dolorosa de las articulaciones costovertebrales o costotransversas, que puede referir dolor hacia la pared torácica anterior y simular dolor de origen visceral.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor torácico localizado que aumenta con la respiración profunda, la rotación y la presión sobre la articulación afecta; puede irradiar siguiendo el trayecto de la costilla.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['rotatores', 'multifidus-thoracis'],
      relatedTestIds: ['costovertebral-springing'],
    },
  ],
};

/* ===========================================================================
 * PHASE 6 -- TREATMENT (region-level)
 * ======================================================================== */
const treatment: TreatmentPhase = {
  scope: 'region',
  intro: {
    text: 'El tratamiento torácico combina la recuperación de la movilidad (rotación y extensión), el fortalecimiento de los extensores en la hipercifosis y el abordaje articular del síndrome costovertebral, siempre tras descartar causas viscerales.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  principles: [
    {
      id: 'restore-thoracic-mobility',
      title: 'Recuperación de la movilidad torácica',
      rationale: {
        text: 'La dorsalgia mecánica suele cursar con rotación y extensión torácicas reducidas. Recuperar la movilidad segmentaria con movilizaciones y ejercicios de rotación y extensión descarga la musculatura paravertebral y mejora el dolor.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      examples: [
        {
          text: 'Ejercicios de rotación torácica sentada con la pelvis fija, y extensión sobre un apoyo para movilizar los segmentos cifóticos.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
      ],
      relatedPathologyIds: ['mechanical-thoracic-pain'],
    },
    {
      id: 'strengthen-thoracic-extensors',
      title: 'Fortalecimiento de los extensores torácicos',
      rationale: {
        text: 'En la hipercifosis postural, los extensores torácicos están elongados y débiles. Su fortalecimiento, combinado con la reeducación postural y el estiramiento de la musculatura anterior, reduce la curvatura y la fatiga dolorosa.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedPathologyIds: ['postural-hyperkyphosis'],
    },
    {
      id: 'costovertebral-management',
      title: 'Abordaje del síndrome costovertebral',
      rationale: {
        text: 'En el síndrome costovertebral, la movilización articular del segmento afecto y las técnicas respiratorias reducen el dolor reproducido. Es imprescindible haber descartado causas viscerales y costales antes de iniciar el tratamiento mecánico.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedPathologyIds: ['costovertebral-syndrome'],
    },
  ],
};

/* ===========================================================================
 * PHASE 7 -- CLINICAL CASE (region-level, integrative)
 * ======================================================================== */
const caseStudy: CasePhase = {
  scope: 'region',
  cases: [
    {
      id: 'mechanical-thoracic-case',
      title: 'Dolor interescapular en teletrabajo',
      vignette: {
        text: 'Una diseñadora de 34 años consulta por dolor interescapular de seis semanas, que aparece tras horas frente al ordenador y mejora al moverse. No irradia al brazo ni se modifica con la respiración profunda. Refiere sensación de rigidez al girar el tronco hacia la izquierda.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      steps: [
        {
          id: 'rule-out',
          prompt: '¿Qué descartar primero y por qué el patrón parece mecánico?',
          answer: {
            text: 'El dolor torácico obliga a descartar causas viscerales y costovertebrales: que no cambie con la respiración profunda y no irradie reduce esa sospecha. Que empeore con la postura sostenida y mejore con el movimiento orienta a dorsalgia mecánica.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: [],
          testIds: ['costovertebral-springing'],
        },
        {
          id: 'assess-mobility',
          prompt: '¿Qué valorar para confirmar la restricción?',
          answer: {
            text: 'La rotación torácica sentada con la pelvis fija debería mostrar una asimetría con restricción hacia la izquierda. La presión posteroanterior localizaría el nivel con mayor rigidez sin dolor costovertebral reproducido franco.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: ['rotatores', 'multifidus-thoracis'],
          testIds: ['thoracic-rotation-seated', 'costovertebral-springing'],
        },
        {
          id: 'plan',
          prompt: '¿Qué orientación de tratamiento es coherente?',
          answer: {
            text: 'Recuperar la movilidad torácica en rotación y extensión, combinado con reeducación postural para descargar la musculatura paravertebral. El fortalecimiento de los extensores y la higiene postural del puesto reducen la recurrencia.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: ['longissimus-thoracis', 'multifidus-thoracis'],
          testIds: [],
        },
      ],
    },
  ],
};

/* ===========================================================================
 * THE THORACIC TRACK
 * ======================================================================== */
export const THORACIC_TRACK: RegionTrack = {
  regionId: 'thoracic',
  regionName: 'Torácica',
  phases: {
    anatomy,
    biomechanics,
    palpation,
    tests,
    pathology,
    treatment,
    case: caseStudy,
  },
};
