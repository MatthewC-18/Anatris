// src/data/anklePhases.ts
//
// The 7-phase pedagogical track for the ANKLE. See src/types/pedagogy.ts.
// Mirrors src/data/hipPhases.ts.
//
// Phases 1-3 reference the ankle muscle ids + MuscleContent field groups (text
// from ANKLE_MUSCLES, derived from muscles/ankle.ts). Phases 4-7 carry DRAFT
// content pending expert review + page verification (every locator
// pageVerified:false). CameraView valid: anterior, posterior, lateral-right,
// lateral-left, superior, three-quarter. GuideStepMarker.kind uses 'none'.

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
 * Teaching sequence: dorsiflexors -> triceps surae -> deep posterior -> fibularis.
 * ------------------------------------------------------------------------ */
const ANKLE_MUSCLE_ORDER: string[] = [
  'tibialis-anterior',
  'extensor-digitorum-longus',
  'extensor-hallucis-longus',
  'fibularis-tertius',
  'gastrocnemius',
  'soleus',
  'plantaris',
  'tibialis-posterior',
  'flexor-digitorum-longus',
  'flexor-hallucis-longus',
  'fibularis-longus',
  'fibularis-brevis',
];

/* ===========================================================================
 * GUIDED GESTURE (biomechanics phase) - draft.
 * ======================================================================== */
const PLANTARFLEXION_GUIDE: GestureGuide = {
  movementId: 'ankle-plantarflexion',
  name: 'Flexión plantar',
  intro: {
    text: 'La flexión plantar (ponerse de puntillas, despegue de la marcha) la mueve el tríceps sural por el tendón de Aquiles. El sóleo domina el control postural lento; el gastrocnemio, biarticular, aporta la potencia rápida y pierde eficacia si la rodilla se flexiona.',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
  steps: [
    {
      id: 'triceps-surae-lift',
      title: 'El tríceps sural eleva el talón',
      rangeLabel: 'Inicio - medio (0-25 grados)',
      caption: {
        text: 'Gastrocnemio y sóleo tiran del calcáneo por el tendón de Aquiles y elevan el talón. Con la rodilla extendida el gastrocnemio trabaja al máximo; flexionada, cede protagonismo al sóleo.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'gastrocnemius', role: 'prime-mover' },
        { id: 'soleus', role: 'prime-mover' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'push-off',
      title: 'Despegue (push-off)',
      rangeLabel: 'Final (25-50 grados)',
      caption: {
        text: 'En el impulso final, los flexores largos del dedo gordo y de los dedos añaden agarre y estabilizan el antepié mientras el tríceps sural completa el empuje.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      muscles: [
        { id: 'gastrocnemius', role: 'prime-mover' },
        { id: 'flexor-hallucis-longus', role: 'assistant' },
        { id: 'flexor-digitorum-longus', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

/* ===========================================================================
 * PHASES 1-3.
 * ======================================================================== */
const anatomy: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: ANKLE_MUSCLE_ORDER,
  fields: ['origin', 'insertion', 'innervation'],
  intro: {
    text: 'Al tobillo y el pie los mueven cuatro compartimentos: los dorsiflexores anteriores, el tríceps sural (flexión plantar por el Aquiles), los flexores profundos posteriores (flexión plantar + inversión + arco) y los peroneos laterales (eversión). Reconoce primero de dónde viene y a dónde va cada uno.',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
};

const biomechanics: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: ANKLE_MUSCLE_ORDER,
  fields: ['actions', 'biomechanics'],
  guides: [PLANTARFLEXION_GUIDE],
  intro: {
    text: 'Dos ejes ordenan la biomecánica: el tobillo (talocrural) hace dorsi/flexión plantar en el plano sagital; la subastragalina hace inversión/eversión en el frontal. La flexión plantar supera con creces a la dorsiflexión, y el equilibrio invertores-evertores explica el esguince lateral.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
};

const palpation: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: ANKLE_MUSCLE_ORDER,
  fields: ['palpation', 'functionalPositions'],
  intro: {
    text: 'Referencias palpables: el tendón de Aquiles, el tendón del tibial anterior en el dorso, los tendones peroneos por detrás del maléolo lateral y el tendón del tibial posterior por detrás del maléolo medial (clave en la disfunción del tibial posterior).',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
};

/* ===========================================================================
 * PHASE 4 - TESTS. Draft.
 * ======================================================================== */
const tests: TestsPhase = {
  scope: 'region',
  intro: {
    text: 'La exploración del tobillo valora la estabilidad ligamentaria (cajón anterior, inclinación astragalina), la integridad del Aquiles (Thompson), la sindesmosis (squeeze, rotación externa/Kleiger) y la necesidad de radiografía (reglas de Ottawa).',
    cite: [{ ref: 'magee', pageVerified: false }],
  },
  tests: [
    {
      id: 'anterior-drawer-ankle',
      name: 'Cajón anterior de tobillo',
      assesses: {
        text: 'Integridad del ligamento peroneoastragalino anterior (LPAA), el más lesionado en el esguince por inversión.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      procedure: {
        text: 'Con el tobillo en ligera flexión plantar, se estabiliza la tibia y se tracciona el calcáneo/retropié hacia delante.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      positiveSign: {
        text: 'Desplazamiento anterior aumentado del astrágalo (a veces con hoyuelo de succión) frente al lado sano.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      targetMuscleIds: ['fibularis-longus', 'fibularis-brevis'],
    },
    {
      id: 'talar-tilt',
      name: 'Inclinación astragalina (talar tilt)',
      assesses: {
        text: 'Integridad del ligamento calcaneoperoneo (y del complejo lateral).',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      procedure: {
        text: 'Se invierte pasivamente el retropié en posición neutra, comparando la apertura con el lado contralateral.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      positiveSign: {
        text: 'Aumento de la inclinación/apertura lateral respecto al lado sano.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      targetMuscleIds: ['fibularis-brevis', 'tibialis-posterior'],
    },
    {
      id: 'thompson',
      name: 'Prueba de Thompson (Simmonds)',
      assesses: {
        text: 'Integridad del tendón calcáneo (de Aquiles).',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      procedure: {
        text: 'Paciente en decúbito prono con los pies fuera de la camilla; el explorador comprime la pantorrilla.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      positiveSign: {
        text: 'AUSENCIA de flexión plantar al comprimir la pantorrilla: rotura completa del Aquiles.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      targetMuscleIds: ['gastrocnemius', 'soleus'],
    },
    {
      id: 'kleiger',
      name: 'Prueba de rotación externa (Kleiger)',
      assesses: {
        text: 'Lesión de la sindesmosis tibiofibular (esguince alto) y del ligamento deltoideo.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      procedure: {
        text: 'Con la rodilla flexionada y el tobillo neutro, se aplica rotación externa al pie estabilizando la pierna.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en la sindesmosis anterolateral (o medial, deltoideo) reproducido con la rotación externa.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      targetMuscleIds: ['tibialis-posterior'],
    },
    {
      id: 'squeeze-test',
      name: 'Prueba de compresión (squeeze)',
      assesses: {
        text: 'Lesión de la sindesmosis tibiofibular (esguince alto).',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      procedure: {
        text: 'Se comprime la tibia y la fíbula juntas en el tercio medio de la pierna.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor referido distal en la sindesmosis al comprimir proximalmente.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      targetMuscleIds: ['fibularis-longus'],
    },
  ],
};

/* ===========================================================================
 * PHASE 5 - PATHOLOGY. Draft.
 * ======================================================================== */
const pathology: PathologyPhase = {
  scope: 'region',
  intro: {
    text: 'La patología del tobillo se agrupa en esguinces (lateral por inversión, alto/sindesmal), tendinopatías (Aquiles, tibial posterior, peroneos) y sobrecargas. La localización del dolor (lateral, medial, posterior) orienta el diagnóstico.',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
  pathologies: [
    {
      id: 'lateral-ankle-sprain',
      name: 'Esguince lateral de tobillo',
      description: {
        text: 'Lesión del complejo ligamentario lateral por inversión forzada; el ligamento peroneoastragalino anterior (LPAA) es el más afectado.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor y edema laterales tras un mecanismo de inversión; cajón anterior e inclinación astragalina positivos en grados mayores.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      relatedMuscleIds: ['fibularis-longus', 'fibularis-brevis'],
      relatedTestIds: ['anterior-drawer-ankle', 'talar-tilt'],
    },
    {
      id: 'achilles-tendinopathy',
      name: 'Tendinopatía / rotura del Aquiles',
      description: {
        text: 'Sobrecarga degenerativa (tendinopatía) o rotura del tendón calcáneo, frecuente en corredores y en el deporte recreativo de mediana edad.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor y engrosamiento posteriores; en la rotura, chasquido, debilidad de flexión plantar y Thompson positivo.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      relatedMuscleIds: ['gastrocnemius', 'soleus'],
      relatedTestIds: ['thompson'],
    },
    {
      id: 'ptt-dysfunction',
      name: 'Disfunción del tibial posterior (DTP)',
      description: {
        text: 'Insuficiencia del tibial posterior que provoca colapso progresivo del arco longitudinal medial (pie plano adquirido del adulto).',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor medial, aplanamiento del arco, signo de "demasiados dedos" y dificultad para el apoyo monopodal de puntillas.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      relatedMuscleIds: ['tibialis-posterior'],
    },
    {
      id: 'high-ankle-sprain',
      name: 'Esguince alto (sindesmal)',
      description: {
        text: 'Lesión de la sindesmosis tibiofibular por rotación externa/dorsiflexión forzada; recuperación más lenta que el esguince lateral.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor anterolateral por encima de la interlínea; squeeze y rotación externa (Kleiger) positivos.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      relatedMuscleIds: ['fibularis-longus'],
      relatedTestIds: ['squeeze-test', 'kleiger'],
    },
  ],
};

/* ===========================================================================
 * PHASE 6 - TREATMENT. Draft.
 * ======================================================================== */
const treatment: TreatmentPhase = {
  scope: 'region',
  intro: {
    text: 'El tratamiento del tobillo se apoya en la carga progresiva del tendón (Aquiles, tibial posterior), la reeducación propioceptiva y del equilibrio tras el esguince, y la recuperación de la dorsiflexión, cuya pérdida altera toda la cadena inferior.',
    cite: [{ ref: 'neumann', pageVerified: false }],
  },
  principles: [
    {
      id: 'progressive-tendon-loading',
      title: 'Carga progresiva del tendón',
      rationale: {
        text: 'En la tendinopatía aquílea y del tibial posterior, el ejercicio de carga controlada (excéntricos, isométricos, progresión a pliometría) es el tratamiento de referencia; el reposo total es contraproducente.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      relatedPathologyIds: ['achilles-tendinopathy', 'ptt-dysfunction'],
    },
    {
      id: 'proprioceptive-reeducation',
      title: 'Reeducación propioceptiva y del equilibrio',
      rationale: {
        text: 'Tras el esguince lateral, el entrenamiento de equilibrio (apoyo monopodal, superficies inestables) reduce la inestabilidad crónica y el riesgo de recidiva más que la inmovilización prolongada.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      relatedPathologyIds: ['lateral-ankle-sprain'],
    },
    {
      id: 'restore-dorsiflexion',
      title: 'Recuperar la dorsiflexión',
      rationale: {
        text: 'Una dorsiflexión limitada (tríceps sural corto) desplaza cargas a la rodilla, el antepié y la fascia plantar. Movilización talocrural y elongación del gastrocnemio/sóleo son prioritarias.',
        cite: [{ ref: 'neumann', pageVerified: false }],
      },
      relatedPathologyIds: ['achilles-tendinopathy'],
    },
  ],
};

/* ===========================================================================
 * PHASE 7 - CLINICAL CASE. Draft.
 * ======================================================================== */
const cases: CasePhase = {
  scope: 'region',
  cases: [
    {
      id: 'inversion-sprain',
      title: 'Esguince de tobillo en jugador de baloncesto',
      vignette: {
        text: 'Varón de 24 años que "se dobló" el tobillo al caer de un salto sobre el pie de un rival. Dolor y edema en la cara lateral, dificultad para apoyar. No hay dolor óseo a la palpación de los maléolos ni de la base del quinto metatarsiano.',
        cite: [{ ref: 'magee', pageVerified: false }],
      },
      steps: [
        {
          id: 'rule-out-fracture',
          prompt: '¿Necesita radiografía?',
          answer: {
            text: 'Las reglas de Ottawa: sin dolor óseo en los bordes posteriores de los maléolos, base del quinto metatarsiano ni navicular, y con capacidad de dar cuatro pasos, la fractura es muy improbable y la radiografía puede evitarse.',
            cite: [{ ref: 'magee', pageVerified: false }],
          },
        },
        {
          id: 'identify-structure',
          prompt: '¿Qué estructura se lesionó?',
          answer: {
            text: 'El mecanismo de inversión con dolor y edema laterales apunta al complejo ligamentario lateral, sobre todo el ligamento peroneoastragalino anterior. El cajón anterior y la inclinación astragalina cuantifican la laxitud.',
            cite: [{ ref: 'magee', pageVerified: false }],
          },
          muscleIds: ['fibularis-longus', 'fibularis-brevis'],
          testIds: ['anterior-drawer-ankle', 'talar-tilt'],
        },
        {
          id: 'plan',
          prompt: '¿Cómo enfocar la recuperación?',
          answer: {
            text: 'Control inicial del dolor y el edema con carga temprana protegida, fortalecimiento de los peroneos (evertores) y, sobre todo, reeducación propioceptiva y del equilibrio para prevenir la inestabilidad crónica y la recidiva.',
            cite: [{ ref: 'neumann', pageVerified: false }],
          },
          muscleIds: ['fibularis-longus', 'fibularis-brevis'],
        },
      ],
    },
  ],
};

/* ===========================================================================
 * THE ANKLE TRACK
 * ======================================================================== */
export const ANKLE_TRACK: RegionTrack = {
  regionId: 'ankle',
  regionName: 'Tobillo y pie',
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
