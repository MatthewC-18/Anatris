// src/data/cervicalPhases.ts
//
// The 7-phase pedagogical track for the CERVICAL spine. Analogue of
// elbowPhases.ts / shoulderPhases.ts.
//
// ENCODING: user-facing strings in Latin American Spanish WITH accents/enie,
// UTF-8 without BOM. ids/keys/enum-values/comments ASCII only.
//
// CONTENT DISCLAIMER: phases 4-7 (tests, pathology, treatment, case) are
// drafted from standard physiotherapy knowledge as a STARTING POINT. Tests and
// syndromes named are real and established; the wording of procedures and
// interpretations is draft copy. Every Citation is pageVerified:false until
// checked against the physical editions. Needs physiotherapist review.
//
// CRITICAL INVARIANT: each GestureGuide.movementId MUST equal the id of its
// RomMovement in cervicalRom.ts (cervical-flexion / cervical-extension /
// cervical-lateral-flexion / cervical-rotation). Verified in Node.

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
 * MUSCLE ORDER (superficial -> deep, craniocervical fine-control last)
 * ======================================================================== */
const CERVICAL_MUSCLE_ORDER: string[] = [
  'sternocleidomastoid',
  'levator-scapulae',
  'splenius-capitis',
  'splenius-cervicis',
  'scalenus-anterior',
  'scalenus-medius',
  'scalenus-posterior',
  'longus-capitis',
  'longus-colli',
  'longissimus-capitis',
  'longissimus-cervicis',
  'iliocostalis-cervicis',
  'spinalis-capitis',
  'spinalis-cervicis',
  'semispinalis-cervicis',
  'multifidus-cervicis',
  'interspinales-cervicis',
  'rectus-posterior-major-capitis',
  'rectus-posterior-minor-capitis',
  'obliquus-superior-capitis',
  'obliquus-inferior-capitis',
  'rectus-anterior-capitis',
  'rectus-lateralis-capitis',
];

/* ===========================================================================
 * GUIDED GESTURES (biomechanics phase). movementId === RomMovement.id.
 * ======================================================================== */
const FLEXION_GUIDE: GestureGuide = {
  movementId: 'cervical-flexion',
  name: 'Flexión',
  intro: {
    text: 'La flexión del cuello es un movimiento de control fino: lo inician y modulan los flexores profundos (largo del cuello y de la cabeza), mientras el esternocleidomastoideo se suma como flexor potente una vez vencida la lordosis. Recorre los pasos para ver el reparto entre el control profundo y la potencia superficial.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'deep-flexors-initiate',
      title: 'Los flexores profundos inician',
      rangeLabel: 'Inicio (craneocervical)',
      caption: {
        text: 'El largo de la cabeza y el largo del cuello inician la flexión aplanando la lordosis cervical y controlando el asentimiento de la cabeza sobre el atlas. Son estabilizadores profundos clave: su reentrenamiento es central en la rehabilitación de la cervicalgia.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'longus-colli', role: 'prime-mover' },
        { id: 'longus-capitis', role: 'prime-mover' },
        { id: 'rectus-anterior-capitis', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'scm-power',
      title: 'El esternocleidomastoideo aporta potencia',
      rangeLabel: 'Rango medio-final',
      caption: {
        text: 'Una vez aplanada la lordosis, el esternocleidomastoideo se convierte en flexor potente del cuello. Si actúa antes de que los profundos estabilicen, tiende a aumentar la lordosis en lugar de flexionar: por eso en la cervicalgia se busca activar primero los profundos.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'sternocleidomastoid', role: 'prime-mover' },
        { id: 'longus-colli', role: 'assistant' },
        { id: 'scalenus-anterior', role: 'stabilizer' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const EXTENSION_GUIDE: GestureGuide = {
  movementId: 'cervical-extension',
  name: 'Extensión',
  intro: {
    text: 'La extensión es el rango cervical de mayor amplitud. Los suboccipitales controlan el ajuste fino de la charnela craneocervical, mientras la capa esplénica y el erector cervical extienden el cuello en todo su recorrido.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'suboccipitals-fine',
      title: 'Los suboccipitales ajustan la charnela',
      rangeLabel: 'Inicio (C0-C2)',
      caption: {
        text: 'El recto posterior mayor y menor y el oblicuo superior controlan la extensión fina de la articulación atlanto-occipital. Son ricos en husos neuromusculares: su papel es más propioceptivo que motor, clave en el control postural de la cabeza.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'rectus-posterior-major-capitis', role: 'prime-mover' },
        { id: 'rectus-posterior-minor-capitis', role: 'assistant' },
        { id: 'obliquus-superior-capitis', role: 'assistant' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'splenius-erector-extend',
      title: 'La capa esplénica y el erector extienden',
      rangeLabel: 'Rango medio-final',
      caption: {
        text: 'El esplenio de la cabeza y del cuello, junto al longísimo y el espinoso cervicales, extienden el cuello en todo su rango. El semiespinoso del cuello añade extensión y estabilización segmentaria.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'splenius-capitis', role: 'prime-mover' },
        { id: 'splenius-cervicis', role: 'prime-mover' },
        { id: 'longissimus-capitis', role: 'assistant' },
        { id: 'semispinalis-cervicis', role: 'assistant' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const LATERAL_FLEXION_GUIDE: GestureGuide = {
  movementId: 'cervical-lateral-flexion',
  name: 'Inclinación lateral',
  intro: {
    text: 'La inclinación lateral acerca la oreja al hombro. Es un movimiento acoplado: los músculos que la producen también rotan, por lo que rara vez ocurre de forma pura. Actúan los inclinadores ipsilaterales mientras el lado contrario frena excéntricamente.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'ipsilateral-benders',
      title: 'Los inclinadores ipsilaterales',
      rangeLabel: 'Todo el rango',
      caption: {
        text: 'El escaleno medio, el esternocleidomastoideo y el elevador de la escápula del mismo lado aproximan la oreja al hombro. El esplenio del cuello ipsilateral completa la inclinación; los músculos contralaterales controlan el retorno.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'scalenus-medius', role: 'prime-mover' },
        { id: 'sternocleidomastoid', role: 'assistant' },
        { id: 'levator-scapulae', role: 'assistant' },
        { id: 'splenius-cervicis', role: 'assistant' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const ROTATION_GUIDE: GestureGuide = {
  movementId: 'cervical-rotation',
  name: 'Rotación',
  intro: {
    text: 'Cerca de la mitad de la rotación cervical ocurre en la articulación atlanto-axial (C1-C2). Recorre los pasos para ver cómo el oblicuo inferior de la cabeza gira el atlas, y luego cómo la cervical baja completa el giro con un par de fuerzas entre el esplenio y el esternocleidomastoideo.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'atlantoaxial-rotation',
      title: 'La rotación en C1-C2',
      rangeLabel: 'Inicio (atlanto-axial)',
      caption: {
        text: 'El oblicuo inferior de la cabeza gira el atlas sobre el axis, llevando la cara al mismo lado. Es el rotador clave de la charnela, donde se concentra cerca del 50% de la rotación cervical total.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'obliquus-inferior-capitis', role: 'prime-mover' },
        { id: 'rectus-posterior-major-capitis', role: 'assistant' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'lower-cervical-rotation',
      title: 'El par de fuerzas de la cervical baja',
      rangeLabel: 'Rango medio-final',
      caption: {
        text: 'El esplenio del cuello gira la cara al mismo lado mientras el esternocleidomastoideo del lado opuesto tira en el mismo sentido: forman un par de fuerzas que completa la rotación. El semiespinoso y los multífidos aportan el componente rotatorio profundo contralateral.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'splenius-cervicis', role: 'prime-mover' },
        { id: 'sternocleidomastoid', role: 'prime-mover' },
        { id: 'semispinalis-cervicis', role: 'assistant' },
        { id: 'multifidus-cervicis', role: 'assistant' },
      ],
      view: 'superior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

/* ===========================================================================
 * PHASES 1-3 (per-muscle projections; reference MuscleContent, no text here)
 * ======================================================================== */
const anatomy: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: CERVICAL_MUSCLE_ORDER,
  fields: ['origin', 'insertion', 'innervation'],
};

const biomechanics: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: CERVICAL_MUSCLE_ORDER,
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
  muscleIds: CERVICAL_MUSCLE_ORDER,
  fields: ['palpation'],
};

/* ===========================================================================
 * PHASE 4 -- TESTS (region-level), with graded-response interpretation.
 * ======================================================================== */
const tests: TestsPhase = {
  scope: 'region',
  intro: {
    text: 'En la columna cervical, la exploración debe distinguir el dolor de origen mecánico (articular o muscular) del dolor de origen radicular (compresión de una raíz nerviosa). Varios tests reproducen o alivian los síntomas según el mecanismo, y su graduación orienta el diagnóstico diferencial.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  tests: [
    {
      id: 'spurling',
      name: 'Prueba de Spurling (compresión foraminal)',
      assesses: {
        text: 'Radiculopatía cervical por compresión de una raíz en el agujero de conjunción.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      procedure: {
        text: 'Con el paciente sentado, el evaluador lleva la cabeza a extensión, inclinación y ligera rotación hacia el lado sintomático y aplica una compresión axial suave sobre el vértex.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      positiveSign: {
        text: 'Reproducción del dolor o las parestesias que se irradian por el miembro superior siguiendo un dermatoma orienta a radiculopatía del lado comprimido.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'El hallazgo clave es el dolor o la parestesia que IRRADIA al brazo, no el dolor cervical local. Un dolor que se queda en el cuello sugiere origen mecánico, no radicular. Suspender la prueba en cuanto aparezcan síntomas radiculares.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
        grades: [
          {
            finding: 'Leve: parestesia distal solo con compresión mantenida.',
            interpretation: {
              text: 'Irritación radicular incipiente o foramen ligeramente reducido.',
              cite: [{ ref: 'dufour', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: dolor radicular inmediato con mínima compresión.',
            interpretation: {
              text: 'Compromiso radicular establecido; correlacionar con el dermatoma y la fuerza.',
              cite: [{ ref: 'dufour', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['multifidus-cervicis', 'semispinalis-cervicis'],
    },
    {
      id: 'cervical-distraction',
      name: 'Prueba de distracción cervical',
      assesses: {
        text: 'Alivio del dolor radicular al descomprimir el agujero de conjunción (test de confirmación, opuesto a Spurling).',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      procedure: {
        text: 'Con el paciente en decúbito supino o sentado, el evaluador toma la cabeza por el occipucio y el mentón y aplica una tracción axial suave y sostenida.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      positiveSign: {
        text: 'La disminución o desaparición del dolor radicular durante la tracción orienta a una causa compresiva foraminal.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'Es un test de ALIVIO: confirma origen radicular si los síntomas ceden. Un dolor que aumenta con la tracción sugiere causa muscular o ligamentosa, no compresiva.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
      },
      targetMuscleIds: [],
    },
    {
      id: 'craniocervical-flexion',
      name: 'Test de flexión craneocervical (flexores profundos)',
      assesses: {
        text: 'Capacidad de activación y resistencia de los flexores cervicales profundos (largo del cuello y de la cabeza).',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      procedure: {
        text: 'En decúbito supino, el paciente realiza un asentimiento suave (llevar el mentón hacia la garganta) sin activar el esternocleidomastoideo, manteniendo la posición de forma progresiva. Puede usarse un biofeedback de presión bajo la lordosis cervical.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      positiveSign: {
        text: 'La sustitución por el esternocleidomastoideo (la cabeza se levanta en vez de asentir) o la incapacidad de mantener el asentimiento indica déficit de control de los flexores profundos.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      grading: {
        holdTime: {
          text: 'Se valora la capacidad de mantener cada nivel de asentimiento. Un control deficiente cede pronto o recurre a los músculos superficiales para sostener la posición.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
        painVsWeakness: {
          text: 'No busca dolor sino CONTROL: la clave es que el movimiento sea fino y selectivo de los profundos, sin dominancia del esternocleidomastoideo.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
      },
      targetMuscleIds: ['longus-colli', 'longus-capitis'],
    },
  ],
};

/* ===========================================================================
 * PHASE 5 -- PATHOLOGY (region-level)
 * ======================================================================== */
const pathology: PathologyPhase = {
  scope: 'region',
  intro: {
    text: 'Las patologías cervicales abarcan desde el dolor mecánico y el latigazo hasta la radiculopatía por hernia o artrosis. Reconocer el patrón (mecánico, radicular o cefalea de origen cervical) guía la exploración y el tratamiento.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  pathologies: [
    {
      id: 'cervical-radiculopathy',
      name: 'Radiculopatía cervical',
      description: {
        text: 'Compresión o irritación de una raíz nerviosa cervical, con mayor frecuencia C6 o C7, por hernia discal o estenosis foraminal artrósica. Produce dolor, parestesias y debilidad siguiendo el dermatoma y el miotoma de la raíz afectada.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor cervical que irradia al miembro superior, con parestesias distales y, a veces, debilidad. El dolor suele agravarse con la extensión y la rotación hacia el lado afecto y aliviarse con la tracción.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['multifidus-cervicis', 'semispinalis-cervicis'],
      relatedTestIds: ['spurling', 'cervical-distraction'],
    },
    {
      id: 'whiplash',
      name: 'Latigazo cervical (esguince cervical)',
      description: {
        text: 'Lesión por aceleración-desaceleración brusca, típica del accidente de tráfico, que sobreestira los tejidos cervicales. Afecta a la musculatura, las cápsulas articulares y, con frecuencia, al control de los flexores profundos.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor y rigidez cervical de aparición diferida, cefalea, y a menudo déficit del control motor profundo con dominancia compensatoria del esternocleidomastoideo y los escalenos.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['sternocleidomastoid', 'longus-colli', 'scalenus-anterior'],
      relatedTestIds: ['craniocervical-flexion'],
    },
    {
      id: 'cervicogenic-headache',
      name: 'Cefalea cervicogénica',
      description: {
        text: 'Cefalea originada en las estructuras de la columna cervical alta (C0-C3), referida a la cabeza. Los suboccipitales y su conexión miodural con la duramadre tienen un papel destacado.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor de cabeza unilateral que parte de la región suboccipital y se proyecta hacia la frente o el ojo, agravado por posturas cervicales sostenidas y con limitación de la rotación cervical alta.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: [
        'rectus-posterior-minor-capitis',
        'rectus-posterior-major-capitis',
        'obliquus-inferior-capitis',
      ],
      relatedTestIds: [],
    },
    {
      id: 'mechanical-neck-pain',
      name: 'Cervicalgia mecánica',
      description: {
        text: 'Dolor cervical de origen mecánico, sin compromiso radicular, asociado con frecuencia a posturas mantenidas (cabeza adelantada) y sobrecarga de la musculatura posterior y el elevador de la escápula.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor y tensión cervical posterior, puntos dolorosos en el elevador de la escápula y el trapecio superior, que empeora al final del día y con el trabajo de escritorio.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['levator-scapulae', 'splenius-capitis', 'longus-colli'],
      relatedTestIds: ['craniocervical-flexion'],
    },
  ],
};

/* ===========================================================================
 * PHASE 6 -- TREATMENT (region-level)
 * ======================================================================== */
const treatment: TreatmentPhase = {
  scope: 'region',
  intro: {
    text: 'El tratamiento cervical razona sobre el patrón identificado: descomprimir y proteger la raíz en la radiculopatía, reeducar el control profundo en el latigazo y la cervicalgia, y abordar la charnela alta en la cefalea cervicogénica.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  principles: [
    {
      id: 'deep-flexor-retraining',
      title: 'Reeducación de los flexores profundos',
      rationale: {
        text: 'El largo del cuello y de la cabeza son estabilizadores profundos que se inhiben tras el latigazo y en la cervicalgia crónica, dejando que el esternocleidomastoideo y los escalenos dominen. Reentrenar el control profundo con el test de flexión craneocervical restaura la estabilidad segmentaria y descarga la musculatura superficial.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      examples: [
        {
          text: 'Asentimiento craneocervical suave en decúbito supino, progresando en tiempo de mantenimiento sin activar el esternocleidomastoideo.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
      ],
      relatedPathologyIds: ['whiplash', 'mechanical-neck-pain'],
    },
    {
      id: 'foraminal-decompression',
      title: 'Descompresión y protección radicular',
      rationale: {
        text: 'En la radiculopatía, las maniobras y posturas que abren el agujero de conjunción (tracción, evitar la extensión-rotación hacia el lado afecto) reducen la irritación de la raíz, mientras se preserva la movilidad sin provocar síntomas distales.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedPathologyIds: ['cervical-radiculopathy'],
    },
    {
      id: 'suboccipital-release',
      title: 'Abordaje de la charnela suboccipital',
      rationale: {
        text: 'En la cefalea cervicogénica, liberar la tensión suboccipital y recuperar la movilidad de la rotación alta (C1-C2) reduce la referencia dolorosa a la cabeza. El reentrenamiento de la propiocepción craneocervical complementa el abordaje.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedPathologyIds: ['cervicogenic-headache'],
    },
    {
      id: 'postural-reeducation',
      title: 'Reeducación postural',
      rationale: {
        text: 'Corregir la postura de cabeza adelantada descarga el elevador de la escápula y la musculatura extensora posterior, reduciendo la cervicalgia mecánica. Se combina con el fortalecimiento del control profundo y de los estabilizadores escapulares.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedPathologyIds: ['mechanical-neck-pain'],
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
      id: 'cervical-radiculopathy-case',
      title: 'Dolor cervical irradiado al brazo',
      vignette: {
        text: 'Un oficinista de 45 años consulta por dolor cervical de tres semanas que se irradia por la cara lateral del antebrazo hasta el pulgar, con hormigueo. El dolor empeora al mirar hacia arriba y al girar la cabeza hacia la derecha, y mejora cuando se sujeta la cabeza con las manos.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      steps: [
        {
          id: 'localize',
          prompt: '¿El patrón sugiere un origen mecánico o radicular, y qué raíz?',
          answer: {
            text: 'La irradiación distal siguiendo un dermatoma (cara lateral del antebrazo y pulgar) con parestesia orienta a radiculopatía, probablemente de C6. Que mejore al sujetar la cabeza (autodistracción) refuerza el origen compresivo foraminal.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: [],
          testIds: ['cervical-distraction'],
        },
        {
          id: 'confirm',
          prompt: '¿Qué pruebas confirman la hipótesis y qué se espera?',
          answer: {
            text: 'La prueba de Spurling (extensión, inclinación y rotación hacia la derecha con compresión axial) debería reproducir el dolor irradiado; la prueba de distracción debería aliviarlo. La combinación de un Spurling positivo y una distracción que alivia apoya con fuerza la radiculopatía.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: [],
          testIds: ['spurling', 'cervical-distraction'],
        },
        {
          id: 'reason-treatment',
          prompt: '¿Qué orientación de tratamiento inicial es coherente?',
          answer: {
            text: 'Descompresión y protección radicular: posturas y maniobras que abran el foramen, evitar la extensión-rotación hacia el lado sintomático, y tracción suave si alivia. En fases posteriores, reeducación del control profundo y postural para reducir la recurrencia.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: ['multifidus-cervicis', 'longus-colli'],
          testIds: [],
        },
      ],
    },
  ],
};

/* ===========================================================================
 * THE CERVICAL TRACK
 * ======================================================================== */
export const CERVICAL_TRACK: RegionTrack = {
  regionId: 'cervical',
  regionName: 'Cervical',
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
