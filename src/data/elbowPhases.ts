// src/data/elbowPhases.ts
//
// The 7-phase pedagogical track for the ELBOW. See src/types/pedagogy.ts.
// Mirrors the structure of src/data/shoulderPhases.ts exactly.
//
// AUTHORING / ENCODING RULE:
//   - User-facing `text` strings (text, title, name, intro, prompt, caption,
//     rangeLabel, finding, vignette, etc.): proper Latin American Spanish WITH
//     accents and enie, in UTF-8. This is product copy and must read correctly.
//   - Code, ids, keys, enum-like values (id, movementId, ref, role, view,
//     scope, *MuscleIds, *TestIds, kind, side) and comments: ASCII only.
//   - Editor MUST save as UTF-8 without BOM. Saving UTF-8 re-read as Latin-1 is
//     what produced the mojibake corruption cleaned up across the elbow data.
//
// STATUS / AUTHORING NOTES (read before extending):
//   - Phases 1-3 (anatomy / biomechanics / palpation) only declare the ordered
//     muscle ids and which MuscleContent field groups to surface. The text
//     comes from ELBOW_MUSCLES at render time.
//   - The biomechanics phase carries guided gestures (flexion, extension,
//     pronation, supination): step-by-step narrations that drive the live 3D
//     model (highlight by role + camera), the honest alternative to deforming
//     the rigid model.
//   - Phases 4-7 (tests / pathology / treatment / case) carry full DRAFT
//     content, standard textbook material structured for teaching, pending
//     (a) expert review and (b) page verification. EVERY locator stays
//     pageVerified:false. Never invent a page.
//   - Muscle ids are kebab-case, aligned with ELBOW_MUSCLES / muscles/elbow.ts.
//     Note the two epicondylar GROUP ids: 'common-flexor-pronator-origin' and
//     'common-extensor-origin'.

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
 * Ordered muscle ids for the per-muscle phases (teaching sequence):
 * flexors -> extensors -> prono-supination -> epicondylar groups.
 * ------------------------------------------------------------------------ */
const ELBOW_MUSCLE_ORDER: string[] = [
  'biceps-brachii',
  'brachialis',
  'brachioradialis',
  'triceps-brachii',
  'anconeus',
  'pronator-teres',
  'pronator-quadratus',
  'supinator',
  'common-flexor-pronator-origin',
  'common-extensor-origin',
];

/* ===========================================================================
 * GUIDED GESTURES (biomechanics phase)
 * ===========================================================================
 * Right side by default. Draft content (pageVerified:false).
 * ======================================================================== */

const FLEXION_GUIDE: GestureGuide = {
  movementId: 'elbow-flexion',
  name: 'Flexión',
  intro: {
    text: 'La flexión del codo acerca el antebrazo al brazo. Tres flexores se reparten el trabajo según la posición del antebrazo: el braquial actúa siempre, el bíceps domina en supinación y el braquiorradial aparece en los movimientos rápidos o contra carga. Recorre los pasos para ver quién lidera en cada situación.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'brachialis-workhorse',
      title: 'El braquial, motor constante',
      rangeLabel: 'Todo el rango',
      caption: {
        text: 'El braquial es el flexor puro y constante del codo: al insertarse en el cúbito (que no rota), su acción no depende de la prono-supinación. Actúa en toda flexión, con el antebrazo pronado o supinado, por lo que se le considera el "caballo de tiro" de la flexión.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'brachialis', role: 'prime-mover' },
        { id: 'biceps-brachii', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'gh-axis' },
    },
    {
      id: 'biceps-supinated',
      title: 'El bíceps con el antebrazo supinado',
      rangeLabel: 'Flexión en supinación',
      caption: {
        text: 'Con el antebrazo supinado (palma arriba), el bíceps braquial se convierte en flexor potente, sumando además su componente supinador. Su eficacia como flexor es máxima en supinación y mínima en pronación, donde cede el protagonismo al braquial y al braquiorradial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'biceps-brachii', role: 'prime-mover' },
        { id: 'brachialis', role: 'assistant' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'brachioradialis-load',
      title: 'El braquiorradial en carga y velocidad',
      rangeLabel: 'Flexión rápida / resistida',
      caption: {
        text: 'El braquiorradial se activa sobre todo en la flexión rápida o contra carga, con el antebrazo en posición neutra (pulgar arriba). Su inserción muy distal en el radio le da un brazo de palanca largo que lo hace eficaz como flexor potente, aunque participa poco en la flexión lenta sin resistencia.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'brachioradialis', role: 'prime-mover' },
        { id: 'brachialis', role: 'assistant' },
        { id: 'biceps-brachii', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const EXTENSION_GUIDE: GestureGuide = {
  movementId: 'elbow-extension',
  name: 'Extensión',
  intro: {
    text: 'La extensión del codo aleja el antebrazo del brazo. El tríceps braquial es el motor principal y el ancóneo lo asiste y estabiliza. La cabeza larga del tríceps, biarticular, depende de la posición del hombro.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'triceps-main',
      title: 'El tríceps como extensor principal',
      rangeLabel: 'Todo el rango',
      caption: {
        text: 'Las tres cabezas del tríceps convergen en el olécranon y producen la extensión del codo. La cabeza medial es la trabajadora constante en cualquier grado de esfuerzo; las cabezas lateral y larga se suman cuando se requiere más fuerza. Es el músculo del empuje y de soportar el peso del cuerpo sobre los brazos.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'triceps-brachii', role: 'prime-mover' },
        { id: 'anconeus', role: 'assistant' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'gh-axis' },
    },
    {
      id: 'long-head-biarticular',
      title: 'La cabeza larga y el hombro',
      rangeLabel: 'Extensión con hombro flexionado',
      caption: {
        text: 'La cabeza larga cruza el hombro: con el hombro flexionado se preestira y aumenta su eficacia extensora del codo (relación longitud-tensión). Por eso los gestos de empuje por encima de la cabeza reclutan mejor la cabeza larga que los empujes con el brazo bajo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'triceps-brachii', role: 'prime-mover' },
        { id: 'anconeus', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'anconeus-stabilizer',
      title: 'El ancóneo, asistente y estabilizador',
      rangeLabel: 'Últimos grados',
      caption: {
        text: 'El ancóneo asiste al tríceps sobre todo en los últimos grados de extensión y, más importante, actúa de forma continua durante la prono-supinación para mantener congruente la articulación humero-cubital y tensar la cápsula posterior, evitando su pinzamiento.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'anconeus', role: 'prime-mover' },
        { id: 'triceps-brachii', role: 'assistant' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const PRONATION_GUIDE: GestureGuide = {
  movementId: 'elbow-pronation',
  name: 'Pronación',
  intro: {
    text: 'La pronación gira el antebrazo para llevar la palma hacia abajo, haciendo girar el radio sobre el cúbito. Dos pronadores se reparten el trabajo: el cuadrado inicia y mantiene, el redondo aporta fuerza y velocidad.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'quadratus-primary',
      title: 'El pronador cuadrado, pronador primario',
      rangeLabel: 'Todo el rango',
      caption: {
        text: 'El pronador cuadrado, profundo en el antebrazo distal, es el pronador primario: inicia el movimiento y actúa en toda pronación, con independencia de la carga. Además coapta la articulación radio-cubital distal, manteniendo unidos radio y cúbito durante la transmisión de cargas.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [{ id: 'pronator-quadratus', role: 'prime-mover' }],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'gh-axis' },
    },
    {
      id: 'teres-power',
      title: 'El pronador redondo en fuerza y velocidad',
      rangeLabel: 'Pronación rápida / resistida',
      caption: {
        text: 'El pronador redondo se suma cuando se requiere fuerza o velocidad. El nervio mediano pasa entre sus dos cabezas (humeral y cubital), punto donde puede quedar atrapado (síndrome del pronador redondo). Asiste además débilmente la flexión del codo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'pronator-teres', role: 'prime-mover' },
        { id: 'pronator-quadratus', role: 'assistant' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const SUPINATION_GUIDE: GestureGuide = {
  movementId: 'elbow-supination',
  name: 'Supinación',
  intro: {
    text: 'La supinación gira el antebrazo para llevar la palma hacia arriba. El supinador actúa siempre; el bíceps se suma cuando hace falta fuerza, sobre todo con el codo flexionado. Es el reparto inverso al de los flexores.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'supinator-constant',
      title: 'El supinador, motor constante',
      rangeLabel: 'Movimientos lentos',
      caption: {
        text: 'El supinador es el supinador constante en movimientos lentos y sin resistencia, con independencia de la posición del codo. El nervio interóseo posterior lo atraviesa por la arcada de Frohse, punto crítico de atrapamiento (síndrome del túnel radial).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [{ id: 'supinator', role: 'prime-mover' }],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'gh-axis' },
    },
    {
      id: 'biceps-power-supinator',
      title: 'El bíceps como supinador de fuerza',
      rangeLabel: 'Supinación resistida con codo flexionado',
      caption: {
        text: 'Cuando se necesita fuerza, el bíceps braquial se suma como supinador potente, sobre todo con el codo flexionado a 90 grados, donde su brazo de palanca para la supinación es máximo. Es el gesto de atornillar o girar un picaporte con esfuerzo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'biceps-brachii', role: 'prime-mover' },
        { id: 'supinator', role: 'assistant' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

/* ===========================================================================
 * PHASES 1-3 -- per-muscle projections
 * ======================================================================== */
const anatomy: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: ELBOW_MUSCLE_ORDER,
  fields: ['origin', 'insertion', 'innervation'],
};

const biomechanics: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: ELBOW_MUSCLE_ORDER,
  fields: [
    'actions',
    'biomechanics',
    'functionalPositions',
    'synergists',
    'antagonists',
  ],
  guides: [FLEXION_GUIDE, EXTENSION_GUIDE, PRONATION_GUIDE, SUPINATION_GUIDE],
};

const palpation: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: ELBOW_MUSCLE_ORDER,
  fields: ['palpation'],
};

/* ===========================================================================
 * PHASE 4 -- TESTS (region-level), each with graded-response interpretation.
 * ======================================================================== */
const tests: TestsPhase = {
  scope: 'region',
  intro: {
    text: 'La respuesta a un test no es solo positiva o negativa: importa dónde aparece el dolor, contra cuánta resistencia, y si el cuadro es tendinoso o nervioso. En el codo, varios síndromes de dolor lateral y medial se solapan, por lo que la graduación y los diagnósticos diferenciales son decisivos.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  tests: [
    {
      id: 'cozen',
      name: 'Prueba de Cozen (epicondilitis lateral)',
      assesses: {
        text: 'Tendinopatía del origen extensor común (codo de tenista).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Codo extendido, antebrazo pronado y puño cerrado; el paciente realiza extensión de muñeca contra resistencia mientras el evaluador palpa el epicóndilo lateral.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en el epicóndilo lateral al resistir la extensión de muñeca orienta a epicondilitis lateral.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'El hallazgo clave es el dolor localizado en el epicóndilo lateral, no la debilidad. Si predomina la debilidad indolora de la extensión de los dedos, sospechar un síndrome del interóseo posterior en vez de tendinopatía.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        grades: [
          {
            finding: 'Leve: molestia local solo con resistencia firme.',
            interpretation: {
              text: 'Tendinopatía lateral incipiente o por sobreuso reciente.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: dolor intenso e inmediato con mínima resistencia.',
            interpretation: {
              text: 'Tendinopatía lateral establecida; valorar tiempo de evolución y carga.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['common-extensor-origin'],
    },
    {
      id: 'mill',
      name: 'Prueba de Mill (epicondilitis lateral)',
      assesses: {
        text: 'Origen extensor común, complementaria a Cozen (estiramiento pasivo).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'El evaluador prona el antebrazo, flexiona la muñeca y extiende el codo de forma pasiva, estirando el grupo extensor.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en el epicóndilo lateral durante el estiramiento pasivo orienta a epicondilitis lateral.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'Es un test pasivo: valora dolor al estiramiento, no fuerza. Combinado con Cozen positivo aumenta la confianza diagnóstica.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['common-extensor-origin'],
    },
    {
      id: 'medial-epicondylitis-test',
      name: 'Prueba de epicondilitis medial (golfista)',
      assesses: {
        text: 'Tendinopatía del origen flexor-pronador común (codo del golfista).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Codo extendido, antebrazo supinado; el paciente realiza flexión de muñeca y pronación contra resistencia mientras el evaluador palpa el epicóndilo medial (epitróclea).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en la epitróclea al resistir la flexión de muñeca y la pronación orienta a epicondilitis medial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'Dolor local en la epitróclea con fuerza conservada orienta a tendinopatía. Si hay parestesias en el 4.o-5.o dedo, explorar el nervio cubital, que discurre por detrás de la epitróclea.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['common-flexor-pronator-origin'],
    },
    {
      id: 'tinel-cubital',
      name: 'Signo de Tinel en el túnel cubital',
      assesses: {
        text: 'Irritabilidad del nervio cubital en el canal epitroclear (síndrome del túnel cubital).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'El evaluador percute suavemente sobre el nervio cubital en el surco entre la epitróclea y el olécranon.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Parestesias u hormigueo irradiados al 4.o y 5.o dedo orientan a compromiso del nervio cubital en el codo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'En fases avanzadas se suman debilidad de la musculatura intrínseca de la mano y atrofia (signo de Froment). La debilidad indica compromiso motor más avanzado que las parestesias aisladas.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['common-flexor-pronator-origin'],
    },
    {
      id: 'elbow-flexion-test',
      name: 'Test de flexión del codo (túnel cubital)',
      assesses: {
        text: 'Compromiso del nervio cubital en el codo, complementario al Tinel.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'El paciente mantiene el codo en flexión máxima con la muñeca en extensión durante 1-3 minutos.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Aparición o aumento de parestesias en el territorio cubital durante la posición mantenida.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        holdTime: {
          text: 'Cuanto antes aparecen las parestesias durante la posición sostenida, más irritable es el nervio. La aparición en menos de un minuto sugiere mayor compromiso.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['common-flexor-pronator-origin'],
    },
    {
      id: 'biceps-hook-test',
      name: 'Hook test (rotura distal del bíceps)',
      assesses: {
        text: 'Integridad del tendón distal del bíceps braquial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Con el codo flexionado a 90 grados y el antebrazo supinado, el evaluador intenta enganchar con el dedo el borde lateral del tendón distal del bíceps en la flexura del codo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'La imposibilidad de enganchar un tendón tenso (no hay cuerda palpable) indica rotura distal completa del bíceps.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'La rotura distal se acompaña de debilidad de la supinación (más que de la flexión, que compensan braquial y braquiorradial) y a veces de la deformidad por retracción proximal del vientre.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['biceps-brachii'],
    },
    {
      id: 'resisted-supination',
      name: 'Supinación resistida (túnel radial)',
      assesses: {
        text: 'Síndrome del túnel radial / interóseo posterior; diferencial de epicondilitis lateral.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Con el codo extendido, el paciente realiza supinación del antebrazo contra resistencia; se localiza el dolor respecto al epicóndilo lateral.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor distal al epicóndilo lateral (3-4 cm, sobre el supinador) que aumenta con la supinación resistida orienta a compromiso del interóseo posterior más que a epicondilitis.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'La localización del dolor es la clave del diferencial: en la epicondilitis es sobre el epicóndilo; en el túnel radial es más distal. Si aparece debilidad de la extensión de los dedos sin déficit sensitivo, sospechar síndrome del interóseo posterior motor.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['supinator', 'common-extensor-origin'],
    },
    {
      id: 'valgus-stress-elbow',
      name: 'Estrés en valgo del codo',
      assesses: {
        text: 'Integridad del ligamento colateral cubital (medial) y estabilidad en valgo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Con el codo en ligera flexión (20-30 grados para liberar el olécranon), el evaluador aplica una fuerza en valgo mientras estabiliza el húmero.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Apertura excesiva del lado medial o dolor orientan a insuficiencia del ligamento colateral cubital, frecuente en lanzadores.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        grades: [
          {
            finding: 'Leve: dolor medial sin laxitud apreciable.',
            interpretation: {
              text: 'Sobrecarga en valgo o esguince del ligamento; frecuente por gesto repetido de lanzamiento.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: apertura medial franca respecto al lado sano.',
            interpretation: {
              text: 'Insuficiencia significativa del ligamento colateral cubital; en deportistas de lanzamiento puede requerir valoración quirúrgica.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['common-flexor-pronator-origin'],
    },
  ],
};

/* ===========================================================================
 * PHASE 5 -- PATHOLOGY (region-level).
 * ======================================================================== */
const pathology: PathologyPhase = {
  scope: 'region',
  pathologies: [
    {
      id: 'lateral-epicondylitis',
      name: 'Epicondilitis lateral (codo de tenista)',
      description: {
        text: 'Tendinopatía degenerativa del origen extensor común en el epicóndilo lateral, sobre todo del extensor radial corto del carpo, por sobreuso en extensión de muñeca y agarre.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor en el epicóndilo lateral que aumenta con el agarre y la extensión de muñeca resistida; frecuente en trabajos manuales y deportes de raqueta, no solo en tenistas.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['common-extensor-origin'],
      relatedTestIds: ['cozen', 'mill', 'resisted-supination'],
    },
    {
      id: 'medial-epicondylitis',
      name: 'Epicondilitis medial (codo del golfista)',
      description: {
        text: 'Tendinopatía del origen flexor-pronador común en la epitróclea por sobreuso en flexión de muñeca y pronación (golf, lanzamiento, trabajos de fuerza).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor en la epitróclea con la flexión de muñeca y la pronación resistidas. Hasta la mitad de los casos asocian síntomas del nervio cubital por su proximidad.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['common-flexor-pronator-origin', 'pronator-teres'],
      relatedTestIds: ['medial-epicondylitis-test', 'tinel-cubital'],
    },
    {
      id: 'cubital-tunnel-syndrome',
      name: 'Síndrome del túnel cubital',
      description: {
        text: 'Compresión o irritación del nervio cubital en el canal epitroclear, detrás del epicóndilo medial; es el segundo atrapamiento nervioso más frecuente del miembro superior tras el túnel del carpo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Parestesias en el 4.o y 5.o dedo, que empeoran con el codo flexionado mantenido (dormir, hablar por teléfono); en fases avanzadas, debilidad y atrofia de la musculatura intrínseca de la mano.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['common-flexor-pronator-origin'],
      relatedTestIds: ['tinel-cubital', 'elbow-flexion-test'],
    },
    {
      id: 'radial-tunnel-syndrome',
      name: 'Síndrome del túnel radial (interóseo posterior)',
      description: {
        text: 'Atrapamiento del nervio interóseo posterior (ramo profundo del radial) a su paso por el supinador, en la arcada de Frohse.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor lateral del codo más distal que en la epicondilitis (sobre el supinador), que aumenta con la supinación resistida. En la variante motora pura hay debilidad de la extensión de los dedos sin déficit sensitivo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['supinator', 'common-extensor-origin'],
      relatedTestIds: ['resisted-supination'],
    },
    {
      id: 'pronator-teres-syndrome',
      name: 'Síndrome del pronador redondo',
      description: {
        text: 'Compresión del nervio mediano entre las dos cabezas del pronador redondo en el antebrazo proximal.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor en el antebrazo proximal y parestesias en el territorio del mediano; a diferencia del túnel del carpo, el dolor es más proximal y puede afectar la palma (el ramo palmar nace por encima de la muñeca).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['pronator-teres'],
      relatedTestIds: [],
    },
    {
      id: 'distal-biceps-rupture',
      name: 'Rotura del tendón distal del bíceps',
      description: {
        text: 'Avulsión del tendón distal del bíceps de la tuberosidad del radio, típicamente por una carga excéntrica brusca en flexión (levantar un peso que cede).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor agudo anterior del codo, equimosis, debilidad sobre todo de la supinación y, a veces, retracción proximal del vientre. El hook test es negativo (no se engancha el tendón).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['biceps-brachii'],
      relatedTestIds: ['biceps-hook-test'],
    },
    {
      id: 'ucl-insufficiency',
      name: 'Insuficiencia del ligamento colateral cubital',
      description: {
        text: 'Esguince o insuficiencia crónica del ligamento colateral cubital (medial) por estrés en valgo repetido, clásico del gesto de lanzamiento por encima de la cabeza.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor medial del codo en la fase de aceleración del lanzamiento, pérdida de velocidad y, en casos avanzados, sensación de inestabilidad en valgo. El grupo flexor-pronador actúa como estabilizador dinámico de apoyo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['common-flexor-pronator-origin'],
      relatedTestIds: ['valgus-stress-elbow'],
    },
    {
      id: 'elbow-stiffness',
      name: 'Rigidez postraumática del codo',
      description: {
        text: 'Pérdida de rango (sobre todo de la extensión) tras inmovilización, fractura o luxación; el codo es especialmente propenso por la congruencia de sus articulaciones y la reacción capsular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Limitación de la extensión y/o flexión tras un periodo de inmovilización; el braquial, en contacto con la cápsula anterior, puede contribuir por contractura o miositis osificante.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['brachialis'],
      relatedTestIds: [],
    },
  ],
};

/* ===========================================================================
 * PHASE 6 -- TREATMENT (region-level).
 * ======================================================================== */
const treatment: TreatmentPhase = {
  scope: 'region',
  intro: {
    text: 'El tratamiento del codo se razona por mecanismo y por diagnóstico diferencial: muchos cuadros de dolor lateral y medial se parecen pero exigen enfoques distintos. Estos principios orientan qué priorizar según el cuadro predominante.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  principles: [
    {
      id: 'tendinopathy-load-management',
      title: 'Carga progresiva en las tendinopatías epicondíleas',
      rationale: {
        text: 'Las epicondilitis lateral y medial son degenerativas, no inflamatorias: responden mejor a la carga progresiva (sobre todo excéntrica) que al reposo prolongado. Se ajusta el volumen del gesto provocador y se progresa la carga por tolerancia, no por dolor cero.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      examples: [
        {
          text: 'Excéntricos de extensores de muñeca en la epicondilitis lateral; de flexores-pronadores en la medial; modificación temporal del gesto laboral o deportivo que la provoca.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      ],
      relatedPathologyIds: ['lateral-epicondylitis', 'medial-epicondylitis'],
    },
    {
      id: 'differentiate-lateral-pain',
      title: 'Diferenciar el dolor lateral antes de tratar',
      rationale: {
        text: 'El dolor lateral del codo puede ser tendinoso (epicondilitis) o nervioso (túnel radial). Tratar una tendinopatía con carga cuando el problema es un atrapamiento del interóseo posterior no mejora y puede empeorar; localizar el dolor (sobre el epicóndilo vs distal) guía el enfoque.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['lateral-epicondylitis', 'radial-tunnel-syndrome'],
    },
    {
      id: 'nerve-gliding-decompression',
      title: 'Manejo de los atrapamientos nerviosos',
      rationale: {
        text: 'En el túnel cubital y el del pronador, el objetivo inicial es reducir la compresión y la tensión del nervio: modificar posturas mantenidas (flexión del codo en el cubital), ejercicios de deslizamiento neural y educación. La debilidad o atrofia progresiva orienta a valoración quirúrgica.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['cubital-tunnel-syndrome', 'pronator-teres-syndrome'],
    },
    {
      id: 'restore-elbow-extension',
      title: 'Recuperar la extensión en la rigidez postraumática',
      rationale: {
        text: 'La extensión es lo que más cuesta recuperar y lo que más limita la función. Se prioriza la movilidad temprana dentro de la tolerancia y se vigila el braquial (contractura, miositis osificante); forzar de forma agresiva en fase irritable favorece la osificación.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['elbow-stiffness'],
    },
    {
      id: 'valgus-stability-throwers',
      title: 'Estabilidad en valgo del lanzador',
      rationale: {
        text: 'En la insuficiencia del ligamento colateral cubital, reforzar el grupo flexor-pronador como estabilizador dinámico medial y corregir la mecánica del lanzamiento descarga el ligamento. La inestabilidad franca en el deportista de alto nivel puede requerir reconstrucción.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['ucl-insufficiency'],
    },
    {
      id: 'surgical-referral-biceps',
      title: 'Derivación oportuna en la rotura distal del bíceps',
      rationale: {
        text: 'La rotura distal completa del bíceps suele tratarse de forma quirúrgica y precoz en pacientes activos para recuperar la fuerza de supinación; reconocerla a tiempo (hook test, debilidad de supinación) evita retrasos que dificultan la reparación.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['distal-biceps-rupture'],
    },
  ],
};

/* ===========================================================================
 * PHASE 7 -- CLINICAL CASES (region-level, integrative).
 * ======================================================================== */
const caseStudy: CasePhase = {
  scope: 'region',
  cases: [
    {
      id: 'lateral-elbow-pain-office-worker',
      title: 'Dolor lateral del codo en oficinista de 40 años',
      vignette: {
        text: 'Mujer de 40 años, trabaja muchas horas con ratón y teclado y los fines de semana juega al pádel. Refiere dolor en la cara lateral del codo derecho de 2 meses, que aumenta al agarrar objetos (la taza, el ratón) y al estirar el brazo. No recuerda un golpe.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      steps: [
        {
          id: 'hypothesis',
          prompt: '¿Qué hipótesis explica mejor un dolor lateral que aumenta con el agarre y la extensión de muñeca?',
          answer: {
            text: 'El patrón (dolor lateral, gesto repetido de agarre y extensión de muñeca, sin trauma) orienta a una epicondilitis lateral por sobrecarga del origen extensor común, sobre todo del extensor radial corto del carpo.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['common-extensor-origin'],
        },
        {
          id: 'exam-plan',
          prompt: '¿Qué exploración confirma la hipótesis y descarta el principal diferencial?',
          answer: {
            text: 'Cozen y Mill para reproducir el dolor en el epicóndilo lateral; y supinación resistida para descartar un síndrome del túnel radial, cuyo dolor es más distal sobre el supinador.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['common-extensor-origin', 'supinator'],
          testIds: ['cozen', 'mill', 'resisted-supination'],
        },
        {
          id: 'interpret-grading',
          prompt: 'Cozen reproduce dolor justo sobre el epicóndilo lateral y la supinación resistida no duele en la zona distal. ¿Qué confirma?',
          answer: {
            text: 'El dolor localizado en el epicóndilo (no distal) con Cozen positivo y supinación resistida negativa confirma la epicondilitis lateral y aleja el síndrome del túnel radial. El diferencial era clave porque cambia por completo el tratamiento.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['common-extensor-origin'],
          testIds: ['cozen', 'resisted-supination'],
        },
        {
          id: 'treatment-reasoning',
          prompt: '¿Por dónde empezar el tratamiento?',
          answer: {
            text: 'Carga progresiva del grupo extensor (ejercicio excéntrico de extensores de muñeca), modificación temporal de la carga del ratón y del pádel, y educación sobre la naturaleza degenerativa y la tolerancia. Se progresa por tolerancia, no buscando dolor cero ni reposo total.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['common-extensor-origin'],
        },
        {
          id: 'reassessment',
          prompt: '¿Qué indica que la progresión va bien y cuándo reconsiderar?',
          answer: {
            text: 'Menor dolor al agarrar, mejor tolerancia a la actividad y aumento de la carga sin recaída. Si tras semanas no mejora, reconsiderar el diferencial (túnel radial) o factores de carga no corregidos.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          testIds: ['cozen'],
        },
      ],
    },
    {
      id: 'medial-elbow-pain-thrower',
      title: 'Dolor medial del codo en lanzador de 19 años',
      vignette: {
        text: 'Varón de 19 años, lanzador de béisbol. Refiere dolor en la cara medial del codo dominante que aparece en la fase de aceleración del lanzamiento, con pérdida de velocidad. En las últimas semanas nota hormigueo intermitente en el 4.o y 5.o dedo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      steps: [
        {
          id: 'hypothesis',
          prompt: '¿Qué dos problemas, a menudo asociados, explican un dolor medial de lanzador con síntomas en el 4.o-5.o dedo?',
          answer: {
            text: 'El estrés en valgo repetido del lanzamiento sugiere insuficiencia del ligamento colateral cubital; el hormigueo en el 4.o-5.o dedo orienta a irritación asociada del nervio cubital en el túnel cubital, frecuente por la proximidad y el mismo mecanismo.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['common-flexor-pronator-origin'],
        },
        {
          id: 'exam-plan',
          prompt: '¿Qué exploración valora ambos problemas?',
          answer: {
            text: 'Estrés en valgo del codo para el ligamento colateral cubital; Tinel en el túnel cubital y test de flexión del codo para el nervio cubital; y valoración del grupo flexor-pronador como estabilizador dinámico medial.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['common-flexor-pronator-origin'],
          testIds: ['valgus-stress-elbow', 'tinel-cubital', 'elbow-flexion-test'],
        },
        {
          id: 'interpret-grading',
          prompt: 'El estrés en valgo duele sin gran apertura y el Tinel reproduce parestesias. ¿Qué sugiere?',
          answer: {
            text: 'Dolor en valgo sin laxitud franca orienta a sobrecarga/esguince del ligamento más que a rotura; el Tinel positivo confirma irritabilidad del nervio cubital. Es un cuadro de sobreuso en valgo con compromiso cubital asociado, no una rotura ligamentaria completa.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          testIds: ['valgus-stress-elbow', 'tinel-cubital'],
        },
        {
          id: 'treatment-reasoning',
          prompt: '¿Qué prioriza el tratamiento conservador inicial?',
          answer: {
            text: 'Reposo relativo del lanzamiento, reforzar el grupo flexor-pronador como estabilizador dinámico medial para descargar el ligamento, manejo del nervio cubital (evitar flexión mantenida, deslizamiento neural) y corrección de la mecánica del lanzamiento.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['common-flexor-pronator-origin'],
        },
        {
          id: 'reassessment',
          prompt: '¿Qué vigilar y cuándo derivar?',
          answer: {
            text: 'Vigilar la vuelta progresiva al lanzamiento sin dolor ni pérdida de velocidad y la resolución de las parestesias. La inestabilidad en valgo franca o los síntomas cubitales progresivos en un lanzador de alto nivel justifican valoración quirúrgica.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
        },
      ],
    },
  ],
};

/* ===========================================================================
 * THE ELBOW TRACK
 * ======================================================================== */
export const ELBOW_TRACK: RegionTrack = {
  regionId: 'elbow',
  regionName: 'Codo',
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
