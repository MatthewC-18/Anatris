// src/data/lumbarPhases.ts
//
// The 7-phase pedagogical track for the LUMBAR spine. Analogue of
// elbowPhases.ts. See cervicalPhases.ts for the structure rationale.
//
// ENCODING: user-facing strings in Latin American Spanish WITH accents/enie,
// UTF-8 without BOM. ids/keys/enum-values/comments ASCII only.
//
// CONTENT DISCLAIMER: phases 4-7 drafted from standard physiotherapy knowledge.
// Tests/syndromes named are real; wording is draft. Every Citation is
// pageVerified:false. Needs physiotherapist review.
//
// NOTE on the hip link: true lumbar flexion/extension involves the lumbopelvic
// rhythm (glutes, hamstrings) which belong to the HIP region, not yet modelled.
// These phases teach the lumbar contribution; the hip coupling is noted in prose
// but its muscles are not referenced (they do not exist in this region's data).
//
// CRITICAL INVARIANT: each GestureGuide.movementId MUST equal the id of its
// RomMovement in lumbarRom.ts (lumbar-flexion / lumbar-extension /
// lumbar-lateral-flexion / lumbar-rotation). Verified in Node.

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
 * MUSCLE ORDER (superficial anterolateral -> deep posterior)
 * ======================================================================== */
const LUMBAR_MUSCLE_ORDER: string[] = [
  'external-oblique',
  'internal-oblique',
  'rectus-abdominis',
  'transversus-abdominis',
  'quadratus-lumborum',
  'psoas-major',
  'iliacus',
  'iliocostalis-lumborum',
  'multifidus-lumborum',
  'interspinales-lumborum',
  'intertransversarii',
];

/* ===========================================================================
 * GUIDED GESTURES (biomechanics phase). movementId === RomMovement.id.
 * ======================================================================== */
const FLEXION_GUIDE: GestureGuide = {
  movementId: 'lumbar-flexion',
  name: 'Flexión',
  intro: {
    text: 'La flexión lumbar la inicia la pared abdominal de forma concéntrica; superado el equilibrio, el erector lumbar y los multífidos controlan excéntricamente el descenso. En el cuerpo completo, la cadera añade el ritmo lumbopélvico, que aquí solo se nombra porque sus músculos pertenecen a otra región.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'abdominal-initiate',
      title: 'La pared abdominal inicia',
      rangeLabel: 'Inicio (motor abdominal)',
      caption: {
        text: 'El recto del abdomen aproxima el tórax a la pelvis y los oblicuos colaboran, borrando la lordosis lumbar e iniciando la flexión de forma concéntrica.',
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
      id: 'erector-eccentric',
      title: 'El erector lumbar frena',
      rangeLabel: 'Rango medio-final (control excéntrico)',
      caption: {
        text: 'Superado el punto de equilibrio, la gravedad mueve el tronco y el erector lumbar y los multífidos frenan excéntricamente el descenso, controlando la velocidad de la flexión.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'iliocostalis-lumborum', role: 'prime-mover' },
        { id: 'multifidus-lumborum', role: 'assistant' },
        { id: 'quadratus-lumborum', role: 'stabilizer' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const EXTENSION_GUIDE: GestureGuide = {
  movementId: 'lumbar-extension',
  name: 'Extensión',
  intro: {
    text: 'La extensión lumbar es un rango limitado por el contacto de las apófisis articulares y espinosas. El erector lumbar y los multífidos son los motores; el cuadrado lumbar fija la base.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'erector-multifidus-extend',
      title: 'El erector y los multífidos extienden',
      rangeLabel: 'Inicio-medio',
      caption: {
        text: 'El iliocostal lumbar y los multífidos extienden la columna concéntricamente, acentuando la lordosis lumbar. Los multífidos son el estabilizador segmentario dominante del raquis lumbar.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'iliocostalis-lumborum', role: 'prime-mover' },
        { id: 'multifidus-lumborum', role: 'prime-mover' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'ql-fixes-base',
      title: 'El cuadrado lumbar fija la base',
      rangeLabel: 'Final',
      caption: {
        text: 'Cerca del límite, el cuadrado lumbar asiste fijando la 12a costilla y la pelvis mientras las carillas y las apófisis espinosas se aproximan y topan.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'quadratus-lumborum', role: 'assistant' },
        { id: 'iliocostalis-lumborum', role: 'prime-mover' },
        { id: 'interspinales-lumborum', role: 'stabilizer' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const LATERAL_FLEXION_GUIDE: GestureGuide = {
  movementId: 'lumbar-lateral-flexion',
  name: 'Inclinación lateral',
  intro: {
    text: 'El cuadrado lumbar ipsilateral es el principal inclinador del raquis lumbar; los oblicuos y el erector lumbar del mismo lado colaboran, mientras el lado contrario controla excéntricamente el retorno.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'ql-bends',
      title: 'El cuadrado lumbar inclina',
      rangeLabel: 'Todo el rango',
      caption: {
        text: 'El cuadrado lumbar del lado hacia el que se inclina aproxima la caja torácica a la pelvis y produce la inclinación; el oblicuo externo ipsilateral colabora y los intertransversos estabilizan segmento a segmento.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'quadratus-lumborum', role: 'prime-mover' },
        { id: 'external-oblique', role: 'assistant' },
        { id: 'iliocostalis-lumborum', role: 'assistant' },
        { id: 'intertransversarii', role: 'stabilizer' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const ROTATION_GUIDE: GestureGuide = {
  movementId: 'lumbar-rotation',
  name: 'Rotación',
  intro: {
    text: 'La rotación lumbar es muy limitada: apenas 5-13 grados, porque la orientación casi sagital de las carillas lumbares la bloquea. Es el dato clínico clave de la región: la rotación del tronco vive en la columna torácica, no en la lumbar. Forzar rotación lumbar estresa el disco y las carillas.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'limited-rotation',
      title: 'La escasa rotación disponible',
      rangeLabel: 'Inicio',
      caption: {
        text: 'Los multífidos lumbares y los oblicuos cruzados generan la poca rotación disponible. La rotación está topada precozmente por el choque de las apófisis articulares.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'multifidus-lumborum', role: 'prime-mover' },
        { id: 'external-oblique', role: 'assistant' },
        { id: 'internal-oblique', role: 'assistant' },
      ],
      view: 'superior',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'facet-stop',
      title: 'El tope facetario',
      rangeLabel: 'Final',
      caption: {
        text: 'Al final del escaso rango, las carillas articulares contactan y bloquean la rotación. Es el límite anatómico que protege el disco lumbar; los estabilizadores controlan que no se fuerce más allá.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'multifidus-lumborum', role: 'prime-mover' },
        { id: 'intertransversarii', role: 'stabilizer' },
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
  muscleIds: LUMBAR_MUSCLE_ORDER,
  fields: ['origin', 'insertion', 'innervation'],
};

const biomechanics: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: LUMBAR_MUSCLE_ORDER,
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
  muscleIds: LUMBAR_MUSCLE_ORDER,
  fields: ['palpation'],
};

/* ===========================================================================
 * PHASE 4 -- TESTS (region-level)
 * ======================================================================== */
const tests: TestsPhase = {
  scope: 'region',
  intro: {
    text: 'La exploración lumbar distingue el dolor mecánico del dolor radicular (ciática) y valora el control de los estabilizadores profundos. Los tests de elevación de la pierna y la movilidad lumbar orientan el mecanismo; el control del transverso y los multífidos guía la rehabilitación.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  tests: [
    {
      id: 'slr-lasegue',
      name: 'Elevación de la pierna recta (Lasègue)',
      assesses: {
        text: 'Tensión radicular del nervio ciático, típica de la radiculopatía lumbar por hernia (L5-S1).',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      procedure: {
        text: 'En decúbito supino, el evaluador eleva el miembro inferior extendido de forma pasiva hasta que aparezcan síntomas, anotando el ángulo. La dorsiflexión del tobillo (maniobra de Bragard) sensibiliza la prueba.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      positiveSign: {
        text: 'Reproducción del dolor irradiado por la cara posterior del muslo y la pierna entre los 30 y 70 grados orienta a tensión radicular ciática. El dolor lumbar aislado no es un signo positivo.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'El hallazgo clave es el dolor RADICULAR que baja por la pierna, no el dolor lumbar ni la tensión isquiotibial. Un tirón posterior sin irradiación distal suele ser acortamiento isquiotibial, no compromiso radicular.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
        grades: [
          {
            finding: 'Dolor radicular a partir de 60-70 grados.',
            interpretation: {
              text: 'Tensión radicular leve o moderada; correlacionar con el resto de la exploración neurológica.',
              cite: [{ ref: 'dufour', pageVerified: false }],
            },
          },
          {
            finding: 'Dolor radicular precoz, entre 30 y 40 grados.',
            interpretation: {
              text: 'Mayor irritación radicular; sugiere compromiso más marcado de la raíz.',
              cite: [{ ref: 'dufour', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['multifidus-lumborum'],
    },
    {
      id: 'prone-instability',
      name: 'Test de inestabilidad en prono',
      assesses: {
        text: 'Contribución del control muscular profundo a la estabilidad lumbar (multífidos, transverso).',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      procedure: {
        text: 'El paciente en prono con el tronco sobre la camilla y los pies en el suelo: el evaluador aplica presión posteroanterior sobre el segmento doloroso, primero con las piernas relajadas y luego con el paciente elevando los pies (activando la musculatura).',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor con las piernas relajadas que DISMINUYE al activar la musculatura (pies elevados) sugiere una inestabilidad que mejora con el control muscular profundo.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'La clave es el CAMBIO del dolor con la activación: si la contracción muscular alivia, el control motor es un objetivo terapéutico prioritario. Si el dolor no cambia, el origen es probablemente otro.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
      },
      targetMuscleIds: ['multifidus-lumborum', 'transversus-abdominis'],
    },
    {
      id: 'abdominal-drawing-in',
      name: 'Maniobra de ahuecamiento abdominal (transverso)',
      assesses: {
        text: 'Capacidad de activación selectiva del transverso del abdomen, estabilizador central.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      procedure: {
        text: 'En decúbito supino o cuadrupedia, el paciente lleva el ombligo hacia dentro sin mover la pelvis ni la columna ni contener la respiración, manteniendo la activación. Puede guiarse con biofeedback de presión.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      positiveSign: {
        text: 'La sustitución por el recto del abdomen (la pared se abomba o la pelvis báscula) o la incapacidad de mantener el ahuecamiento indica un déficit de control del transverso.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'No busca dolor sino CONTROL selectivo: el ahuecamiento debe lograrse sin dominancia del recto del abdomen ni apnea. Es la base del reentrenamiento del control motor lumbopélvico.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
      },
      targetMuscleIds: ['transversus-abdominis'],
    },
  ],
};

/* ===========================================================================
 * PHASE 5 -- PATHOLOGY (region-level)
 * ======================================================================== */
const pathology: PathologyPhase = {
  scope: 'region',
  intro: {
    text: 'La región lumbar concentra buena parte de la carga asistencial en fisioterapia: la lumbalgia mecánica, la radiculopatía por hernia (ciática) y la estenosis del canal son los cuadros centrales. Distinguir el dolor mecánico del radicular y valorar el control profundo orienta el tratamiento.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  pathologies: [
    {
      id: 'mechanical-low-back-pain',
      name: 'Lumbalgia mecánica',
      description: {
        text: 'Dolor lumbar de origen mecánico, sin compromiso radicular, asociado con frecuencia a sobrecarga, control motor deficiente y atrofia o inhibición de los multífidos. Es el cuadro lumbar más frecuente.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor lumbar que varía con la postura y el movimiento, sin irradiación distal franca, a menudo con déficit del control de los estabilizadores profundos y dolor a la presión segmentaria.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['multifidus-lumborum', 'transversus-abdominis', 'quadratus-lumborum'],
      relatedTestIds: ['prone-instability', 'abdominal-drawing-in'],
    },
    {
      id: 'lumbar-radiculopathy',
      name: 'Radiculopatía lumbar (ciática)',
      description: {
        text: 'Compresión o irritación de una raíz lumbar o sacra, con mayor frecuencia L5 o S1, por hernia discal. Produce dolor irradiado por el trayecto del nervio ciático, con posibles parestesias y debilidad del miotoma.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor lumbar que irradia por la cara posterior o lateral del miembro inferior por debajo de la rodilla, agravado por la flexión y la sedestación, con Lasègue positivo.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['multifidus-lumborum'],
      relatedTestIds: ['slr-lasegue'],
    },
    {
      id: 'lumbar-stenosis',
      name: 'Estenosis del canal lumbar',
      description: {
        text: 'Estrechamiento del canal lumbar, habitualmente degenerativo, que comprime las estructuras nerviosas. Característicamente provoca claudicación neurógena: síntomas en las piernas al caminar o estar de pie que alivian al sentarse o flexionar el tronco.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor, pesadez o parestesias en las piernas al caminar o en bipedestación prolongada, que mejoran con la flexión lumbar (sentarse, inclinarse hacia delante, apoyarse en un carrito).',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['multifidus-lumborum', 'iliocostalis-lumborum'],
      relatedTestIds: [],
    },
  ],
};

/* ===========================================================================
 * PHASE 6 -- TREATMENT (region-level)
 * ======================================================================== */
const treatment: TreatmentPhase = {
  scope: 'region',
  intro: {
    text: 'El tratamiento lumbar razona sobre el patrón: reeducar el control profundo en la lumbalgia mecánica, descomprimir y graduar la carga en la radiculopatía, y favorecer las posturas en flexión que alivian la estenosis. La educación y el movimiento son transversales a todos.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  principles: [
    {
      id: 'motor-control-retraining',
      title: 'Reeducación del control motor profundo',
      rationale: {
        text: 'En la lumbalgia mecánica, los multífidos se atrofian e inhiben y el transverso pierde su activación anticipatoria. Reentrenar primero la activación selectiva (ahuecamiento abdominal, activación de multífidos) y progresar a tareas funcionales restaura la estabilidad segmentaria y reduce la recurrencia.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      examples: [
        {
          text: 'Ahuecamiento abdominal con biofeedback, activación de multífidos en cuadrupedia, progresando a control durante el movimiento de las extremidades.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
      ],
      relatedPathologyIds: ['mechanical-low-back-pain'],
    },
    {
      id: 'radicular-load-management',
      title: 'Descompresión y graduación de la carga radicular',
      rationale: {
        text: 'En la radiculopatía, modular las posturas y actividades que aumentan la tensión radicular (flexión sostenida, sedestación prolongada) y graduar progresivamente la carga reduce los síntomas, preservando el movimiento sin reproducir el dolor distal.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedPathologyIds: ['lumbar-radiculopathy'],
    },
    {
      id: 'flexion-bias-stenosis',
      title: 'Posturas en flexión para la estenosis',
      rationale: {
        text: 'En la estenosis, las posturas y ejercicios en ligera flexión lumbar abren el canal y alivian la claudicación neurógena. Se combinan con el acondicionamiento aeróbico (bicicleta, que se tolera por la postura flexionada) y el control del tronco.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedPathologyIds: ['lumbar-stenosis'],
    },
    {
      id: 'education-and-movement',
      title: 'Educación y movimiento',
      rationale: {
        text: 'En todo dolor lumbar, la educación sobre el buen pronóstico, evitar el reposo prolongado y mantener la actividad reduce el miedo al movimiento y mejora los resultados. El ejercicio activo es el eje del tratamiento.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedPathologyIds: ['mechanical-low-back-pain', 'lumbar-radiculopathy', 'lumbar-stenosis'],
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
      id: 'lumbar-radiculopathy-case',
      title: 'Lumbalgia con dolor que baja por la pierna',
      vignette: {
        text: 'Un repartidor de 38 años consulta por dolor lumbar de dos semanas tras cargar peso, que ahora baja por la cara posterior de la pierna izquierda hasta por debajo de la rodilla, con hormigueo. El dolor empeora al sentarse y al inclinarse hacia delante, y mejora al caminar y al tumbarse.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      steps: [
        {
          id: 'pattern',
          prompt: '¿El patrón sugiere dolor mecánico o radicular?',
          answer: {
            text: 'La irradiación por debajo de la rodilla con parestesia, que empeora con la flexión y la sedestación, orienta a radiculopatía (ciática), probablemente por hernia que aumenta su presión con la flexión. El dolor lumbar puro mecánico no suele bajar de la rodilla.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: [],
          testIds: ['slr-lasegue'],
        },
        {
          id: 'confirm',
          prompt: '¿Qué prueba lo confirma y qué se espera?',
          answer: {
            text: 'La elevación de la pierna recta (Lasègue) debería reproducir el dolor irradiado por la pierna izquierda en un rango medio, sensibilizándose con la dorsiflexión del tobillo. Conviene completar con la exploración neurológica del miotoma y los reflejos.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: [],
          testIds: ['slr-lasegue'],
        },
        {
          id: 'plan',
          prompt: '¿Qué orientación de tratamiento es coherente al inicio?',
          answer: {
            text: 'Modular las posturas que aumentan la tensión radicular (flexión sostenida, sedestación prolongada), graduar la carga y mantener la actividad con educación sobre el buen pronóstico. Más adelante, reeducar el control profundo para reducir la recurrencia.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: ['multifidus-lumborum', 'transversus-abdominis'],
          testIds: [],
        },
      ],
    },
  ],
};

/* ===========================================================================
 * THE LUMBAR TRACK
 * ======================================================================== */
export const LUMBAR_TRACK: RegionTrack = {
  regionId: 'lumbar',
  regionName: 'Lumbar',
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
