// src/data/hipPhases.ts
//
// The 7-phase pedagogical track for the HIP. See src/types/pedagogy.ts.
// Mirrors src/data/kneePhases.ts.
//
// AUTHORING / ENCODING RULE:
//   - User-facing strings: Latin American Spanish WITH accents and enie, UTF-8.
//   - Code, ids, keys, enum-like values and comments: ASCII only.
//
// STATUS:
//   - Phases 1-3 declare the ordered muscle ids + which MuscleContent field
//     groups to surface. The text comes from HIP_MUSCLES (derived from
//     muscles/hip.ts) at render time.
//   - The biomechanics phase carries one guided gesture (flexion).
//   - Phases 4-7 carry DRAFT content (standard textbook material structured for
//     teaching), pending expert review + page verification. Every locator stays
//     pageVerified:false.
//   - CameraView valid values: anterior, posterior, lateral-right, lateral-left,
//     superior, three-quarter. GuideStepMarker.kind uses 'none' (the arc markers
//     are shoulder-specific).

import type {
  RegionTrack,
  PerMusclePhase,
  TestsPhase,
  PathologyPhase,
  TreatmentPhase,
  CasePhase,
  GestureGuide,
} from '../types/pedagogy';

/* ---------------------------------------------------------------------------
 * Teaching sequence: flexors -> gluteal group -> adductors -> deep six.
 * ------------------------------------------------------------------------ */
const HIP_MUSCLE_ORDER: string[] = [
  'psoas-major',
  'iliacus',
  'rectus-femoris',
  'sartorius',
  'tensor-fasciae-latae',
  'pectineus',
  'gluteus-maximus',
  'gluteus-medius',
  'gluteus-minimus',
  'adductor-longus',
  'adductor-brevis',
  'adductor-magnus',
  'gracilis',
  'piriformis',
  'obturator-internus',
  'obturator-externus',
  'superior-gemellus',
  'inferior-gemellus',
  'quadratus-femoris',
];

/* ===========================================================================
 * GUIDED GESTURE (biomechanics phase) - draft content.
 * ======================================================================== */
const FLEXION_GUIDE: GestureGuide = {
  movementId: 'hip-flexion',
  name: 'Flexión',
  intro: {
    text: 'La flexión de cadera la lidera el iliopsoas (psoas mayor + ilíaco). El recto femoral, el sartorio y el tensor de la fascia lata asisten, y el rango depende de la rodilla: con ella extendida los isquiotibiales frenan hacia 90 grados; flexionada, se llega a ~120.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'iliopsoas-lead',
      title: 'El iliopsoas inicia la flexión',
      rangeLabel: 'Inicio (0-30 grados)',
      caption: {
        text: 'Desde la posición neutra, el iliopsoas (flexor más potente) tira del trocánter menor y lleva el muslo hacia delante. Sartorio, recto femoral y tensor de la fascia lata colaboran.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      muscles: [
        { id: 'psoas-major', role: 'prime-mover' },
        { id: 'iliacus', role: 'prime-mover' },
        { id: 'rectus-femoris', role: 'assistant' },
        { id: 'sartorius', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'knee-dependence',
      title: 'La rodilla decide el rango',
      rangeLabel: 'Rango medio-final (30-120 grados)',
      caption: {
        text: 'Con la rodilla extendida, la tensión de los isquiotibiales (biarticulares) frena la flexión cerca de 90 grados (insuficiencia pasiva). Al flexionar la rodilla, el recto femoral y los isquiotibiales se relajan y el arco continúa hasta ~120.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'psoas-major', role: 'prime-mover' },
        { id: 'iliacus', role: 'prime-mover' },
        { id: 'rectus-femoris', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

/* ===========================================================================
 * PHASES 1-3 - per-muscle projections.
 * ======================================================================== */
const anatomy: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: HIP_MUSCLE_ORDER,
  fields: ['origin', 'insertion', 'innervation'],
  intro: {
    text: 'A la cadera la mueven cuatro familias: los flexores (iliopsoas y ayudantes anteriores), el glúteo mayor con los abductores glúteos, el compartimento aductor medial y los seis rotadores externos profundos. Reconoce primero de dónde viene y a dónde va cada uno.',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
};

const biomechanics: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: HIP_MUSCLE_ORDER,
  fields: ['actions', 'biomechanics'],
  guides: [FLEXION_GUIDE],
  intro: {
    text: 'Dos ideas organizan la biomecánica de la cadera: es una enartrosis triaxial (seis movimientos) y su papel en carga es estabilizar la pelvis. El mecanismo abductor (glúteo medio/menor) mantiene la pelvis nivelada en apoyo monopodal; su fallo es el signo de Trendelenburg.',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
};

const palpation: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: HIP_MUSCLE_ORDER,
  fields: ['palpation', 'functionalPositions'],
  intro: {
    text: 'Referencias palpables de la cadera: la espina ilíaca anterosuperior (origen de sartorio y tensor de la fascia lata), el trocánter mayor (inserción de los glúteos y punto de la tendinopatía glútea), el tubérculo del aductor y el tendón del aductor largo en el pliegue inguinal.',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
};

/* ===========================================================================
 * PHASE 4 - TESTS (region-level). Draft; pageVerified:false.
 * ======================================================================== */
const tests: TestsPhase = {
  scope: 'region',
  intro: {
    text: 'La exploración de la cadera combina pruebas de pinzamiento (FADIR), de movilidad y dolor articular (FABER/Patrick), de acortamiento del flexor (Thomas), de la banda iliotibial (Ober) y del mecanismo abductor (Trendelenburg). Interpreta el grado y la reproducción del dolor del paciente, no solo el resultado binario.',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
  tests: [
    {
      id: 'faber-patrick',
      name: 'FABER (Patrick)',
      assesses: {
        text: 'Patología intraarticular de la cadera y de la articulación sacroilíaca (flexión + abducción + rotación externa).',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      procedure: {
        text: 'En decúbito supino, se coloca el tobillo del lado explorado sobre la rodilla contraria (posición en 4) y se presiona suavemente la rodilla y la EIAS contralateral hacia la camilla.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor inguinal sugiere origen coxofemoral; dolor glúteo/posterior orienta a la sacroilíaca. Rigidez que impide descender la rodilla indica restricción de la cadera.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      targetMuscleIds: ['piriformis', 'iliacus', 'psoas-major'],
    },
    {
      id: 'fadir',
      name: 'FADIR (pinzamiento anterior)',
      assesses: {
        text: 'Pinzamiento femoroacetabular (FAI) y lesión del labrum anterosuperior.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      procedure: {
        text: 'En decúbito supino, se lleva la cadera a 90 grados de flexión y se añade aducción y rotación interna.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      positiveSign: {
        text: 'Reproducción del dolor inguinal del paciente. Prueba sensible: un FADIR negativo hace poco probable el pinzamiento/labrum.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      targetMuscleIds: ['iliacus', 'psoas-major'],
    },
    {
      id: 'thomas',
      name: 'Prueba de Thomas',
      assesses: {
        text: 'Acortamiento (retracción) del iliopsoas y del recto femoral.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      procedure: {
        text: 'En decúbito supino al borde de la camilla, el paciente abraza una rodilla contra el pecho para aplanar la lordosis; se observa el muslo contralateral.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      positiveSign: {
        text: 'El muslo explorado se eleva de la camilla (iliopsoas corto). Si además la rodilla se extiende, sugiere acortamiento del recto femoral.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      targetMuscleIds: ['psoas-major', 'iliacus', 'rectus-femoris'],
    },
    {
      id: 'trendelenburg',
      name: 'Signo de Trendelenburg',
      assesses: {
        text: 'Competencia del mecanismo abductor (glúteo medio y menor).',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      procedure: {
        text: 'El paciente se sostiene en apoyo monopodal sobre la pierna explorada; se observa la pelvis desde atrás.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      positiveSign: {
        text: 'La pelvis cae hacia el lado que NO apoya (o el tronco se inclina hacia el lado de apoyo para compensar): insuficiencia del glúteo medio del lado de apoyo.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      targetMuscleIds: ['gluteus-medius', 'gluteus-minimus'],
    },
    {
      id: 'ober',
      name: 'Prueba de Ober',
      assesses: {
        text: 'Tensión/retracción de la banda iliotibial y del tensor de la fascia lata.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      procedure: {
        text: 'En decúbito lateral con la pierna inferior flexionada, se abduce y extiende la cadera superior con la rodilla a 90 grados y luego se deja caer en aducción.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      positiveSign: {
        text: 'El muslo permanece abducido y no desciende hacia la camilla: banda iliotibial / TFL retraídos.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      targetMuscleIds: ['tensor-fasciae-latae', 'gluteus-medius'],
    },
  ],
};

/* ===========================================================================
 * PHASE 5 - PATHOLOGY (region-level). Draft.
 * ======================================================================== */
const pathology: PathologyPhase = {
  scope: 'region',
  intro: {
    text: 'Los cuadros de dolor de cadera más frecuentes son intraarticulares (FAI/labrum, artrosis) o periarticulares (tendinopatía glútea, dolor inguinal de aductores, bursitis trocantérea). Localizar el dolor (inguinal vs lateral vs glúteo) orienta el diagnóstico.',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
  pathologies: [
    {
      id: 'fai',
      name: 'Pinzamiento femoroacetabular (FAI)',
      description: {
        text: 'Contacto anómalo entre el fémur proximal y el acetábulo (tipo cam, pincer o mixto) que daña el labrum y el cartílago. Cursa con dolor inguinal y rotación interna limitada.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor inguinal en flexión mantenida (sedestación, conducción) y en el gesto de flexión-aducción-rotación interna; FADIR reproduce el dolor.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      relatedMuscleIds: ['iliacus', 'psoas-major'],
      relatedTestIds: ['fadir', 'faber-patrick'],
    },
    {
      id: 'coxarthrosis',
      name: 'Coxartrosis (artrosis de cadera)',
      description: {
        text: 'Degeneración del cartílago coxofemoral. La pérdida temprana y selectiva de rotación interna y extensión es un signo sensible.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor inguinal mecánico, rigidez matutina breve, limitación capsular (rotación interna y extensión primero); FABER y FADIR suelen ser dolorosos.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      relatedMuscleIds: ['gluteus-medius', 'iliacus'],
      relatedTestIds: ['faber-patrick', 'fadir'],
    },
    {
      id: 'gluteal-tendinopathy',
      name: 'Tendinopatía glútea (dolor lateral de cadera)',
      description: {
        text: 'Sobrecarga por compresión y tracción de los tendones del glúteo medio/menor en el trocánter mayor; principal causa de dolor lateral de cadera (antes llamada "bursitis trocantérea").',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor lateral sobre el trocánter, peor al tumbarse sobre ese lado, al subir escaleras o en apoyo monopodal; puede asociar Trendelenburg.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      relatedMuscleIds: ['gluteus-medius', 'gluteus-minimus', 'tensor-fasciae-latae'],
      relatedTestIds: ['trendelenburg', 'ober'],
    },
    {
      id: 'adductor-related-groin-pain',
      name: 'Dolor inguinal de origen aductor',
      description: {
        text: 'Sobrecarga o lesión de la unión miotendinosa del aductor largo, típica de deportes con cambios de dirección y patada (fútbol). Parte del espectro de la "pubalgia del deportista".',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor inguinal medial que reproduce la aducción resistida y la palpación del origen púbico del aductor largo.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      relatedMuscleIds: ['adductor-longus', 'pectineus', 'gracilis'],
    },
  ],
};

/* ===========================================================================
 * PHASE 6 - TREATMENT (region-level). Draft.
 * ======================================================================== */
const treatment: TreatmentPhase = {
  scope: 'region',
  intro: {
    text: 'El tratamiento de la cadera se apoya en tres pilares: gestión de la carga (modificar los gestos que comprimen o traccionan), fortalecimiento del mecanismo abductor y de los extensores, y trabajo de movilidad selectiva sin forzar el pinzamiento.',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
  principles: [
    {
      id: 'load-management',
      title: 'Gestión de la carga',
      rationale: {
        text: 'En tendinopatía glútea y FAI, reducir la compresión (evitar aducción mantenida, cruzar las piernas, dormir sobre el lado doloroso) suele bajar el dolor antes que cualquier ejercicio.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      relatedPathologyIds: ['gluteal-tendinopathy', 'fai'],
    },
    {
      id: 'abductor-strengthening',
      title: 'Fortalecimiento del mecanismo abductor',
      rationale: {
        text: 'El glúteo medio y menor estabilizan la pelvis en carga. Su fortalecimiento progresivo (isométricos en abducción, apoyo monopodal controlado, puentes) mejora el Trendelenburg y descarga los tendones.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      relatedPathologyIds: ['gluteal-tendinopathy', 'coxarthrosis'],
    },
    {
      id: 'hip-extensor-power',
      title: 'Potencia de extensores y control del recto femoral',
      rationale: {
        text: 'El glúteo mayor es clave para incorporarse, subir escaleras y correr. Combinar su fortalecimiento con la flexibilización del iliopsoas/recto femoral (Thomas positivo) restaura la extensión y reduce la sobrecarga lumbar compensatoria.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      relatedPathologyIds: ['coxarthrosis'],
    },
  ],
};

/* ===========================================================================
 * PHASE 7 - CLINICAL CASE (integrative). Draft.
 * ======================================================================== */
const cases: CasePhase = {
  scope: 'region',
  cases: [
    {
      id: 'lateral-hip-pain',
      title: 'Dolor lateral de cadera en corredora',
      vignette: {
        text: 'Mujer de 52 años, corredora recreativa, con dolor lateral de cadera derecha de 3 meses. Empeora al tumbarse sobre ese lado y al subir escaleras. No refiere dolor inguinal. La palpación del trocánter mayor es dolorosa.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      steps: [
        {
          id: 'localize',
          prompt: '¿Qué orienta la localización del dolor?',
          answer: {
            text: 'El dolor LATERAL sobre el trocánter, sin dolor inguinal, aleja el origen intraarticular (FAI/artrosis, que dan dolor inguinal) y orienta a una causa periarticular: tendinopatía glútea.',
            cite: [{ ref: 'neumann', pageVerified: false }],
          },
          muscleIds: ['gluteus-medius', 'gluteus-minimus'],
        },
        {
          id: 'confirm',
          prompt: '¿Qué pruebas confirman la sospecha?',
          answer: {
            text: 'Dolor a la palpación del trocánter, dolor en apoyo monopodal (30 s) y posible Trendelenburg. El Ober valora la contribución de la banda iliotibial. Un FADIR/FABER negativos apoyan el origen no articular.',
            cite: [{ ref: 'magee', pageVerified: false }],
          },
          testIds: ['trendelenburg', 'ober', 'fadir'],
        },
        {
          id: 'plan',
          prompt: '¿Cómo enfocar el tratamiento?',
          answer: {
            text: 'Gestión de la carga (evitar aducción/compresión, ajustar el gesto de carrera y el decúbito), isométricos de abductores en posición neutra y progresión a fortalecimiento en cadena, evitando ejercicios que comprimen el tendón contra el trocánter (aducción mantenida).',
            cite: [{ ref: 'neumann', pageVerified: false }],
          },
          muscleIds: ['gluteus-medius', 'gluteus-minimus'],
          testIds: ['trendelenburg'],
        },
      ],
    },
  ],
};

/* ===========================================================================
 * THE HIP TRACK
 * ======================================================================== */
export const HIP_TRACK: RegionTrack = {
  regionId: 'hip',
  regionName: 'Cadera',
  phases: {
    anatomy,
    biomechanics,
    palpation,
    tests,
    pathology,
    treatment,
    case: cases,
  },
};
