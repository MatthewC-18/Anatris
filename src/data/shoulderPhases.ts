// src/data/shoulderPhases.ts
//
// The 7-phase pedagogical track for the SHOULDER. See src/types/pedagogy.ts.
//
// STATUS / AUTHORING NOTES (read before extending):
//   - Phases 1-3 (anatomy / biomechanics / palpation) are COMPLETE as data:
//     they only declare the ordered muscle ids and which MuscleContent field
//     groups to surface. The actual text comes from SHOULDER_MUSCLES at render
//     time, so there is nothing to translate or re-verify here.
//   - The biomechanics phase ALSO carries guided gestures (abduction, flexion,
//     internal/external rotation): step-by-step narrations that drive the live
//     3D model (highlight by role + camera). They are DRAFT clinical content
//     like phases 4-7 (pageVerified:false). Use as a scaffold, not authority.
//   - Phases 4-7 (tests / pathology / treatment / case) now carry full DRAFT
//     content. It is standard, textbook-level material structured for teaching,
//     but it is a DRAFT pending two checks the project already tracks:
//       (a) expert review pass (resumen punto 3), and
//       (b) page verification of every citation (all pageVerified:false).
//     Treat it as a strong scaffold, not final clinical authority.
//   - Tests include a `grading` block (sustain time, pain-vs-weakness, graded
//     interpretation) per physio feedback: a test response is not binary.
//   - EVERY locator stays pageVerified:false. Never invent a page.
//   - Muscle ids are kebab-case, aligned with SHOULDER_MUSCLES / shoulder.ts.
//   - User-facing text in Latin American Spanish; code/comments ASCII.

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
 * Ordered muscle ids for the per-muscle phases (teaching sequence).
 * ------------------------------------------------------------------------ */
const SHOULDER_MUSCLE_ORDER: string[] = [
  'supraspinatus',
  'infraspinatus',
  'teres-minor',
  'subscapularis',
  'deltoid',
  'pectoralis-major',
  'teres-major',
  'latissimus-dorsi',
  'trapezius',
  'serratus-anterior',
  'rhomboids',
  'levator-scapulae',
  'pectoralis-minor',
  'subclavius',
  'omohyoid',
  'biceps-brachii',
  'triceps-brachii',
  'coracobrachialis',
];

/* ===========================================================================
 * GUIDED GESTURES (biomechanics phase)
 * ===========================================================================
 * Step-by-step narrations played alongside the live 3D model. Each step lights
 * its muscles by role (feeds setRomPhase), requests a camera view, and narrates
 * the biomechanics of that part of the range. Right side by default.
 *
 * CLINICAL NOTE: draft content structured from standard references; verify
 * before clinical use (pageVerified:false), like the rest of this file.
 * ======================================================================== */

const ABDUCTION_GUIDE: GestureGuide = {
  movementId: 'abduction',
  name: 'Abduccion',
  intro: {
    text: 'La abduccion lleva el brazo lateralmente en el plano frontal. Es un gesto coordinado: el manguito centra la cabeza humeral, el deltoides eleva el brazo y la escapula rota hacia arriba para mantener la congruencia articular. Recorre los pasos para ver que estructura domina en cada tramo del rango.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'setting-phase',
      title: 'Fase de ajuste',
      rangeLabel: '0-15 grados',
      caption: {
        text: 'El supraespinoso inicia la abduccion y, junto con el resto del manguito, comprime y centra la cabeza humeral en la glenoides. Esta estabilizacion es la condicion previa para que el deltoides pueda elevar el brazo sin que la cabeza ascienda contra el acromion.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'supraspinatus', role: 'prime-mover' },
        { id: 'infraspinatus', role: 'stabilizer' },
        { id: 'subscapularis', role: 'stabilizer' },
        { id: 'teres-minor', role: 'stabilizer' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'gh-axis' },
    },
    {
      id: 'deltoid-takes-over',
      title: 'El deltoides toma el relevo',
      rangeLabel: '15-90 grados',
      caption: {
        text: 'A partir de los ~15 grados la parte acromial (media) del deltoides se convierte en el motor principal de la abduccion. El manguito sigue activo como depresor y centrador de la cabeza humeral: forma con el deltoides un par de fuerzas que evita el pinzamiento subacromial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'deltoid', role: 'prime-mover' },
        { id: 'supraspinatus', role: 'assistant' },
        { id: 'infraspinatus', role: 'stabilizer' },
        { id: 'subscapularis', role: 'stabilizer' },
      ],
      view: 'three-quarter',
      side: 'right',
      marker: { kind: 'abduction-arc' },
    },
    {
      id: 'scapulohumeral-rhythm',
      title: 'Ritmo escapulohumeral',
      rangeLabel: '30-90 grados',
      caption: {
        text: 'Superada la fase de ajuste, la escapula rota hacia arriba acompanando al humero, en una proporcion aproximada de 2 a 1 (dos grados glenohumerales por cada grado escapular). El trapecio y el serrato anterior forman el par de fuerzas que produce esa rotacion superior; sin ella, la elevacion completa no es posible.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'trapezius', role: 'prime-mover' },
        { id: 'serratus-anterior', role: 'prime-mover' },
        { id: 'deltoid', role: 'assistant' },
        { id: 'rhomboids', role: 'stabilizer' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'overhead',
      title: 'Elevacion completa',
      rangeLabel: '90-180 grados',
      caption: {
        text: 'En el tramo final el deltoides y el supraespinoso completan la elevacion mientras la rotacion superior de la escapula, sostenida por trapecio y serrato, orienta la glenoides hacia arriba para mantener la congruencia y dejar espacio al troquiter. Un fallo del control escapular en esta fase reproduce el conflicto subacromial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'deltoid', role: 'prime-mover' },
        { id: 'serratus-anterior', role: 'assistant' },
        { id: 'trapezius', role: 'assistant' },
        { id: 'supraspinatus', role: 'stabilizer' },
      ],
      view: 'three-quarter',
      side: 'right',
      marker: { kind: 'abduction-arc' },
    },
  ],
};

const FLEXION_GUIDE: GestureGuide = {
  movementId: 'flexion',
  name: 'Flexion',
  intro: {
    text: 'La flexion lleva el brazo hacia adelante en el plano sagital. Los flexores anteriores elevan el humero mientras el manguito centra la cabeza y la escapula rota hacia arriba, igual que en la abduccion, para mantener la congruencia en la elevacion.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'initiation',
      title: 'Inicio de la flexion',
      rangeLabel: '0-60 grados',
      caption: {
        text: 'La parte clavicular (anterior) del deltoides y la cabeza clavicular del pectoral mayor inician la flexion. El coracobraquial asiste llevando el brazo adelante. El manguito centra la cabeza humeral desde el primer grado.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'deltoid', role: 'prime-mover' },
        { id: 'pectoralis-major', role: 'assistant' },
        { id: 'coracobrachialis', role: 'assistant' },
        { id: 'supraspinatus', role: 'stabilizer' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'gh-axis' },
    },
    {
      id: 'mid-elevation',
      title: 'Elevacion media',
      rangeLabel: '60-120 grados',
      caption: {
        text: 'El deltoides anterior sostiene la elevacion mientras la escapula comienza su rotacion superior. El trapecio y el serrato anterior forman el par de fuerzas que orienta la glenoides hacia arriba, condicion necesaria para seguir elevando sin conflicto.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'deltoid', role: 'prime-mover' },
        { id: 'serratus-anterior', role: 'prime-mover' },
        { id: 'trapezius', role: 'assistant' },
        { id: 'infraspinatus', role: 'stabilizer' },
      ],
      view: 'three-quarter',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'overhead-flexion',
      title: 'Flexion completa',
      rangeLabel: '120-180 grados',
      caption: {
        text: 'En el tramo final, la rotacion superior de la escapula sostenida por trapecio y serrato permite alcanzar la posicion por encima de la cabeza. La perdida de control escapular aqui limita la elevacion y favorece el pinzamiento.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'deltoid', role: 'prime-mover' },
        { id: 'serratus-anterior', role: 'assistant' },
        { id: 'trapezius', role: 'assistant' },
        { id: 'supraspinatus', role: 'stabilizer' },
      ],
      view: 'three-quarter',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const INTERNAL_ROTATION_GUIDE: GestureGuide = {
  movementId: 'internal-rotation',
  name: 'Rotacion interna',
  intro: {
    text: 'La rotacion interna gira el humero hacia adentro alrededor de su eje longitudinal. Es un movimiento esencialmente glenohumeral: el subescapular es el motor del manguito y los grandes rotadores internos (pectoral mayor, dorsal ancho, redondo mayor) aportan potencia.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'cuff-driver',
      title: 'El subescapular como motor del manguito',
      rangeLabel: '0-45 grados',
      caption: {
        text: 'El subescapular es el unico componente anterior del manguito y el principal rotador interno fino; ademas previene la traslacion anterior de la cabeza humeral. Inicia y controla la rotacion interna con precision.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'subscapularis', role: 'prime-mover' },
        { id: 'infraspinatus', role: 'stabilizer' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'gh-axis' },
    },
    {
      id: 'power-rotators',
      title: 'Rotadores internos de potencia',
      rangeLabel: '45-90 grados',
      caption: {
        text: 'Cuando se requiere fuerza, el pectoral mayor, el dorsal ancho y el redondo mayor se suman como rotadores internos potentes. El subescapular sigue centrando la cabeza humeral mientras estos generan el torque.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'subscapularis', role: 'prime-mover' },
        { id: 'pectoralis-major', role: 'assistant' },
        { id: 'latissimus-dorsi', role: 'assistant' },
        { id: 'teres-major', role: 'assistant' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const EXTERNAL_ROTATION_GUIDE: GestureGuide = {
  movementId: 'external-rotation',
  name: 'Rotacion externa',
  intro: {
    text: 'La rotacion externa gira el humero hacia afuera alrededor de su eje longitudinal. Depende casi por completo del infraespinoso y el redondo menor, los rotadores externos del manguito. Es un grupo pequeno pero clave para la estabilidad posterior y el gesto de lanzamiento.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'primary-rotators',
      title: 'Infraespinoso y redondo menor',
      rangeLabel: '0-45 grados',
      caption: {
        text: 'El infraespinoso es el principal rotador externo; el redondo menor lo asiste. Juntos refuerzan la capsula posterior y centran la cabeza humeral mientras la giran hacia afuera. Son los unicos rotadores externos relevantes, por eso su debilidad se nota de inmediato.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'infraspinatus', role: 'prime-mover' },
        { id: 'teres-minor', role: 'assistant' },
        { id: 'subscapularis', role: 'stabilizer' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'gh-axis' },
    },
    {
      id: 'deltoid-posterior',
      title: 'Aporte del deltoides posterior',
      rangeLabel: '45-90 grados',
      caption: {
        text: 'En el rango final, las fibras posteriores del deltoides asisten la rotacion externa. El manguito posterior sigue siendo el motor principal; el control de este grupo es decisivo en deportes de lanzamiento y en la prevencion del pinzamiento.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'infraspinatus', role: 'prime-mover' },
        { id: 'teres-minor', role: 'assistant' },
        { id: 'deltoid', role: 'assistant' },
      ],
      view: 'posterior',
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
  muscleIds: SHOULDER_MUSCLE_ORDER,
  fields: ['origin', 'insertion', 'innervation'],
};

const biomechanics: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: SHOULDER_MUSCLE_ORDER,
  fields: [
    'actions',
    'biomechanics',
    'functionalPositions',
    'synergists',
    'antagonists',
  ],
  guides: [
    ABDUCTION_GUIDE,
    FLEXION_GUIDE,
    INTERNAL_ROTATION_GUIDE,
    EXTERNAL_ROTATION_GUIDE,
  ],
};

const palpation: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: SHOULDER_MUSCLE_ORDER,
  fields: ['palpation'],
};

/* ===========================================================================
 * PHASE 4 -- TESTS (region-level), each with graded-response interpretation.
 * ======================================================================== */
const tests: TestsPhase = {
  scope: 'region',
  intro: {
    text: 'La respuesta a un test no es solo positiva o negativa: importa cuanto sostiene el paciente la posicion, contra cuanta resistencia, en que parte del rango aparece el sintoma, y si cede por dolor o por debilidad real. Cada test incluye una guia de graduacion para interpretar esos matices.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  tests: [
    {
      id: 'jobe',
      name: 'Prueba de Jobe (lata vacia)',
      assesses: {
        text: 'Integridad y dolor del supraespinoso.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Brazo en el plano escapular a 90 grados, rotacion interna completa (pulgar hacia abajo, como vaciando una lata); el evaluador aplica resistencia hacia abajo mientras el paciente intenta mantener la posicion.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor, debilidad o ambos al resistir la elevacion orientan a tendinopatia o rotura del supraespinoso.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        holdTime: {
          text: 'Se pide sostener la resistencia unos 5-10 segundos. Un brazo que cede de inmediato sugiere mayor compromiso que uno que se mantiene con molestia tolerable hasta el final.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        painVsWeakness: {
          text: 'Dolor sin perdida de fuerza orienta a tendinopatia o pinzamiento; debilidad franca (el brazo cae aunque el paciente lo intente) orienta a rotura significativa del tendon. La debilidad indolora es la mas sospechosa de desgarro completo.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        grades: [
          {
            finding: 'Leve: molestia al final del rango, fuerza conservada.',
            interpretation: {
              text: 'Compatible con irritacion tendinosa o pinzamiento incipiente.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Moderada: dolor durante el sostenido con leve perdida de fuerza.',
            interpretation: {
              text: 'Sugiere tendinopatia establecida o desgarro parcial.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: el brazo cae, con o sin dolor.',
            interpretation: {
              text: 'Alta sospecha de rotura de espesor completo; la caida indolora es especialmente sugestiva.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['supraspinatus'],
    },
    {
      id: 'neer',
      name: 'Prueba de Neer (pinzamiento)',
      assesses: {
        text: 'Pinzamiento subacromial del supraespinoso y estructuras del espacio subacromial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Con la escapula estabilizada, el evaluador eleva pasivamente el brazo en flexion/rotacion interna hasta el final del rango, comprimiendo el troquiter contra el acromion.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en el arco superior de la elevacion pasiva indica pinzamiento.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'Es un test pasivo, asi que valora dolor, no fuerza. El dolor que aparece antes en el rango sugiere un conflicto subacromial mas irritable.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        grades: [
          {
            finding: 'Leve: dolor solo en el tope maximo de elevacion.',
            interpretation: {
              text: 'Conflicto subacromial de bajo grado o por sobreuso.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: dolor temprano y aprension a continuar el movimiento.',
            interpretation: {
              text: 'Pinzamiento mas irritable; reevaluar tras infiltracion (test de Neer modificado) ayuda a confirmar el origen subacromial.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['supraspinatus'],
    },
    {
      id: 'hawkins-kennedy',
      name: 'Prueba de Hawkins-Kennedy (pinzamiento)',
      assesses: {
        text: 'Pinzamiento subacromial, complementaria a Neer.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Hombro y codo a 90 grados de flexion; el evaluador realiza rotacion interna pasiva del hombro, llevando el troquiter bajo el ligamento coracoacromial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor durante la rotacion interna indica pinzamiento subacromial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        grades: [
          {
            finding: 'Leve: molestia al final de la rotacion interna.',
            interpretation: {
              text: 'Conflicto subacromial leve.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: dolor intenso y precoz.',
            interpretation: {
              text: 'Mayor irritabilidad subacromial; combinada con Neer positivo aumenta la sospecha.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['supraspinatus'],
    },
    {
      id: 'external-rotation-resisted',
      name: 'Rotacion externa resistida',
      assesses: {
        text: 'Infraespinoso y redondo menor (rotadores externos).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Codo a 90 grados pegado al cuerpo, antebrazo en posicion neutra; el paciente realiza rotacion externa contra resistencia del evaluador.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor o debilidad orientan a compromiso del infraespinoso/redondo menor.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        holdTime: {
          text: 'Mantener la resistencia 5-10 segundos; la fatiga progresiva (el brazo cede al sostener) sugiere mayor compromiso que un dolor puntual al inicio.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        painVsWeakness: {
          text: 'La debilidad marcada con poco dolor orienta a desgarro de los rotadores externos; el dolor con fuerza conservada, a tendinopatia.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['infraspinatus', 'teres-minor'],
    },
    {
      id: 'external-rotation-lag-sign',
      name: 'External rotation lag sign',
      assesses: {
        text: 'Rotura de los rotadores externos (infraespinoso, redondo menor).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'El evaluador coloca pasivamente el hombro en rotacion externa casi maxima con el codo a 90 grados y pide al paciente mantenerla.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Incapacidad de mantener la rotacion externa (el antebrazo "cae" hacia la rotacion interna) indica deficit de los rotadores externos.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        grades: [
          {
            finding: 'Leve: pequeno retraso (lag) de pocos grados.',
            interpretation: {
              text: 'Debilidad o desgarro parcial de los rotadores externos.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: lag amplio, el brazo cae claramente.',
            interpretation: {
              text: 'Sugiere rotura mayor del infraespinoso/redondo menor.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['infraspinatus', 'teres-minor'],
    },
    {
      id: 'hornblower',
      name: 'Signo de Hornblower (del trompetista)',
      assesses: {
        text: 'Funcion del redondo menor.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Brazo en abduccion a 90 grados en el plano escapular; se pide mantener la rotacion externa contra resistencia.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Incapacidad de mantener la rotacion externa en abduccion orienta a lesion del redondo menor.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'La incapacidad suele ser por debilidad (deficit del redondo menor) mas que por dolor; obliga a llevar la mano a la boca con el brazo, como un trompetista.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['teres-minor'],
    },
    {
      id: 'gerber-lift-off',
      name: 'Prueba de Gerber (lift-off)',
      assesses: {
        text: 'Funcion del subescapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Mano sobre la espalda baja (rotacion interna); el paciente intenta separarla de la espalda contra resistencia del evaluador.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Incapacidad de separar la mano o de mantenerla separada orienta a lesion del subescapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        holdTime: {
          text: 'Tras separar la mano, se pide mantenerla alejada de la espalda. Si vuelve a caer hacia la espalda (lag) hay deficit; cuanto antes cae, mayor el compromiso.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        painVsWeakness: {
          text: 'La debilidad/lag indoloro orienta a rotura del subescapular; el dolor sin lag, a tendinopatia. Requiere rotacion interna suficiente para alcanzar la posicion (si no, usar belly-press).',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['subscapularis'],
    },
    {
      id: 'belly-press',
      name: 'Prueba de belly-press (presion abdominal)',
      assesses: {
        text: 'Funcion del subescapular cuando la rotacion interna esta limitada.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'La palma sobre el abdomen; el paciente presiona el vientre manteniendo el codo adelante (sin dejarlo caer hacia atras), lo que exige rotacion interna activa.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Si el codo cae hacia atras y la muneca se flexiona para compensar, el subescapular es deficitario.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        grades: [
          {
            finding: 'Leve: el codo se retrasa ligeramente al presionar.',
            interpretation: {
              text: 'Debilidad parcial del subescapular.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: el codo cae claramente atras y compensa con la muneca.',
            interpretation: {
              text: 'Sugiere rotura significativa del subescapular.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['subscapularis'],
    },
    {
      id: 'apprehension-relocation',
      name: 'Aprension y recolocacion (inestabilidad anterior)',
      assesses: {
        text: 'Inestabilidad glenohumeral anterior.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'En decubito supino, hombro a 90 grados de abduccion y rotacion externa progresiva (aprension). Si aparece aprension, el evaluador aplica una fuerza posterior sobre la cabeza humeral (recolocacion).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Sensacion de que el hombro "se va a salir" en aprension, que se alivia con la maniobra de recolocacion, orienta a inestabilidad anterior.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'Lo relevante aqui no es dolor ni fuerza, sino la APRENSION (miedo a la luxacion). El alivio con la recolocacion confirma el origen anterior; el dolor posterior sin aprension orienta mas a conflicto interno.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        grades: [
          {
            finding: 'Leve: aprension solo cerca del final del rango de rotacion externa.',
            interpretation: {
              text: 'Inestabilidad anterior leve o microinestabilidad.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: aprension temprana y franca con minima rotacion externa.',
            interpretation: {
              text: 'Inestabilidad anterior significativa, frecuente tras luxacion previa.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['subscapularis'],
    },
    {
      id: 'speed',
      name: 'Prueba de Speed',
      assesses: {
        text: 'Tendinopatia de la porcion larga del biceps.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Hombro en flexion a 90 grados, codo extendido y antebrazo supinado; se resiste la flexion del hombro.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en el surco intertubercular orienta a compromiso de la porcion larga del biceps.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'El hallazgo clave es el dolor localizado en el surco, no la debilidad. Dolor difuso inespecifico baja la utilidad del test.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['biceps-brachii'],
    },
    {
      id: 'yergason',
      name: 'Prueba de Yergason',
      assesses: {
        text: 'Porcion larga del biceps y estabilidad del tendon en el surco.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Codo a 90 grados, antebrazo pronado; el paciente realiza supinacion resistida (y rotacion externa) contra el evaluador.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en el surco intertubercular, o sensacion de resalte del tendon, orientan a tendinopatia o inestabilidad de la porcion larga del biceps.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        grades: [
          {
            finding: 'Leve: dolor en el surco sin resalte.',
            interpretation: {
              text: 'Tendinopatia de la porcion larga del biceps.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: resalte palpable del tendon fuera del surco.',
            interpretation: {
              text: 'Sugiere inestabilidad o subluxacion del tendon, a menudo con lesion del subescapular asociada.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['biceps-brachii', 'subscapularis'],
    },
    {
      id: 'scapular-assistance',
      name: 'Test de asistencia escapular',
      assesses: {
        text: 'Contribucion de la discinesia escapular al dolor de hombro.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Mientras el paciente eleva el brazo, el evaluador asiste manualmente la rotacion superior y la basculacion posterior de la escapula.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Si la asistencia escapular reduce el dolor o mejora el rango, la mecanica escapular esta contribuyendo al sintoma.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'No mide fuerza: mide cuanto cambia el sintoma al corregir la escapula. Una gran mejoria orienta el tratamiento hacia el control escapular antes que hacia la estructura glenohumeral.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['serratus-anterior', 'trapezius'],
    },
  ],
};

/* ===========================================================================
 * PHASE 5 -- PATHOLOGY (region-level), expanded.
 * ======================================================================== */
const pathology: PathologyPhase = {
  scope: 'region',
  pathologies: [
    {
      id: 'rotator-cuff-tear',
      name: 'Rotura del manguito rotador',
      description: {
        text: 'Desgarro parcial o completo de los tendones del manguito; el supraespinoso es el sitio mas frecuente, a menudo en continuidad con el infraespinoso.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor lateral del hombro, debilidad para la elevacion y la rotacion externa, dificultad para dormir sobre el lado afecto. La debilidad indolora sugiere desgarro completo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['supraspinatus', 'infraspinatus', 'subscapularis', 'teres-minor'],
      relatedTestIds: ['jobe', 'external-rotation-resisted', 'external-rotation-lag-sign', 'gerber-lift-off'],
    },
    {
      id: 'subacromial-impingement',
      name: 'Sindrome de pinzamiento subacromial',
      description: {
        text: 'Compresion del tendon del supraespinoso y la bolsa subacromial en el espacio bajo el arco coracoacromial durante la elevacion.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor en arco medio (60-120 grados) de la elevacion, frecuente en trabajos y deportes con brazos por encima de la cabeza. A menudo coexiste con discinesia escapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['supraspinatus'],
      relatedTestIds: ['neer', 'hawkins-kennedy', 'jobe'],
    },
    {
      id: 'biceps-long-head-tendinopathy',
      name: 'Tendinopatia/rotura de la porcion larga del biceps',
      description: {
        text: 'Irritacion o rotura del tendon de la porcion larga del biceps en el surco intertubercular, con frecuencia asociada a patologia del manguito o del subescapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor anterior del hombro a la palpacion del surco; la rotura produce la deformidad en "Popeye" por descenso del vientre muscular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['biceps-brachii', 'subscapularis'],
      relatedTestIds: ['speed', 'yergason'],
    },
    {
      id: 'anterior-instability',
      name: 'Inestabilidad anterior del hombro',
      description: {
        text: 'Perdida de la contencion anterior de la cabeza humeral, frecuente tras una luxacion anterior; puede asociar lesion de Bankart y deficit del subescapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Aprension al colocar el brazo en abduccion y rotacion externa (posicion de lanzamiento); episodios de subluxacion o luxacion recidivante en pacientes jovenes y deportistas.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['subscapularis'],
      relatedTestIds: ['apprehension-relocation'],
    },
    {
      id: 'scapular-dyskinesis',
      name: 'Discinesia escapular',
      description: {
        text: 'Alteracion del ritmo escapulohumeral por desequilibrio entre estabilizadores escapulares (trapecio inferior y serrato debiles; trapecio superior y pectoral menor sobreactivos/acortados).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Aleteo o protraccion excesiva de la escapula durante la elevacion; suele acompanar y perpetuar el pinzamiento subacromial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['serratus-anterior', 'trapezius', 'rhomboids', 'pectoralis-minor'],
      relatedTestIds: ['scapular-assistance'],
    },
    {
      id: 'axillary-nerve-palsy',
      name: 'Paralisis del nervio axilar',
      description: {
        text: 'Lesion del nervio axilar, tipicamente por luxacion glenohumeral o fractura del cuello quirurgico del humero, que denerva el deltoides (y el redondo menor).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Debilidad de la abduccion, atrofia del deltoides (signo de la charretera) y perdida de sensibilidad en la cara lateral del hombro.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['deltoid', 'teres-minor'],
    },
    {
      id: 'long-thoracic-nerve-palsy',
      name: 'Paralisis del nervio toracico largo (escapula alada)',
      description: {
        text: 'Lesion del nervio toracico largo que denerva el serrato anterior, con perdida de su funcion estabilizadora y de rotacion superior.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Escapula alada clasica: el borde medial se despega del torax, especialmente al empujar contra una pared o elevar el brazo al frente; limitacion de la elevacion completa.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['serratus-anterior'],
    },
    {
      id: 'adhesive-capsulitis',
      name: 'Capsulitis adhesiva (hombro congelado)',
      description: {
        text: 'Inflamacion y fibrosis progresiva de la capsula glenohumeral que restringe el rango tanto activo como pasivo, en fases de dolor, rigidez y recuperacion.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Perdida global del rango, sobre todo de la rotacion externa pasiva, con dolor difuso; mas frecuente en mujeres de mediana edad y en diabeticos.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['subscapularis', 'infraspinatus'],
    },
  ],
};

/* ===========================================================================
 * PHASE 6 -- TREATMENT (region-level), reasoning principles.
 * ======================================================================== */
const treatment: TreatmentPhase = {
  scope: 'region',
  intro: {
    text: 'El tratamiento se razona por mecanismo, no por receta. Estos principios orientan que priorizar, por que y cuando, segun el cuadro predominante.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  principles: [
    {
      id: 'restore-scapulohumeral-rhythm',
      title: 'Restaurar el ritmo escapulohumeral',
      rationale: {
        text: 'Reequilibrar el par trapecio-serrato para recuperar la rotacion superior escapular ANTES de cargar la elevacion del brazo: sin una base escapular estable, fortalecer el manguito reproduce el conflicto.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      examples: [
        {
          text: 'Activacion del trapecio inferior y del serrato anterior (empujes con protraccion, ejercicios en cadena cerrada) e inhibicion/elongacion del trapecio superior y el pectoral menor.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      ],
      relatedPathologyIds: ['scapular-dyskinesis', 'subacromial-impingement'],
    },
    {
      id: 'cuff-strengthening-progression',
      title: 'Progresion de fuerza del manguito rotador',
      rationale: {
        text: 'Recuperar la funcion depresora y centradora del manguito para que el deltoides eleve sin ascenso de la cabeza humeral. Se progresa de isometricos indoloros a trabajo dinamico en rangos crecientes.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      examples: [
        {
          text: 'Rotaciones externas/internas con el codo pegado al cuerpo, progresando a posiciones de mayor abduccion; control de la carga por dolor y por calidad del gesto, no solo por kilos.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      ],
      relatedPathologyIds: ['rotator-cuff-tear', 'subacromial-impingement'],
    },
    {
      id: 'restore-external-internal-balance',
      title: 'Equilibrar rotadores externos e internos',
      rationale: {
        text: 'El predominio de rotadores internos (pectoral, dorsal, subescapular) sobre los externos favorece la rotacion interna en reposo y el conflicto; fortalecer los rotadores externos reorienta el troquiter en la elevacion.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['subacromial-impingement', 'rotator-cuff-tear'],
    },
    {
      id: 'stage-dependent-capsulitis',
      title: 'Tratar la capsulitis segun la fase',
      rationale: {
        text: 'En la fase dolorosa priman el control del dolor y la movilidad suave dentro de la tolerancia; en la fase rigida, la ganancia progresiva de rango (sobre todo rotacion externa). Forzar en fase irritable empeora el cuadro.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['adhesive-capsulitis'],
    },
    {
      id: 'instability-neuromuscular-control',
      title: 'Control neuromuscular en inestabilidad',
      rationale: {
        text: 'Tras inestabilidad anterior, el objetivo es reforzar los estabilizadores dinamicos (manguito, sobre todo subescapular) y el control escapular para suplir la contencion pasiva perdida, evitando las posiciones de aprension al inicio.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['anterior-instability'],
    },
    {
      id: 'load-management',
      title: 'Gestion de la carga y del gesto repetido',
      rationale: {
        text: 'En cuadros por sobreuso (trabajo o deporte con brazos elevados), modificar temporalmente el volumen y la altura del gesto permite que el tejido tolere la progresion; la educacion sobre la actividad es parte del tratamiento.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['subacromial-impingement', 'biceps-long-head-tendinopathy'],
    },
  ],
};

/* ===========================================================================
 * PHASE 7 -- CLINICAL CASES (region-level, integrative, detailed).
 * ======================================================================== */
const caseStudy: CasePhase = {
  scope: 'region',
  cases: [
    {
      id: 'painful-arc-overhead-worker',
      title: 'Dolor en arco medio en pintor de 45 anos',
      vignette: {
        text: 'Hombre de 45 anos, pintor de profesion. Refiere dolor lateral del hombro derecho de 6 semanas, que aparece al elevar el brazo entre 60 y 120 grados y al pintar techos. Le cuesta dormir sobre ese lado. No recuerda un traumatismo. La fuerza global parece conservada pero con molestia.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      steps: [
        {
          id: 'hypothesis',
          prompt: 'Que hipotesis explica mejor un dolor en arco medio por gesto repetido por encima de la cabeza?',
          answer: {
            text: 'El patron (arco doloroso 60-120 grados, gesto overhead, sin trauma) orienta a un pinzamiento subacromial del supraespinoso, posiblemente con discinesia escapular asociada por el trabajo mantenido en elevacion.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['supraspinatus'],
        },
        {
          id: 'exam-plan',
          prompt: 'Que exploracion confirma o descarta esa hipotesis?',
          answer: {
            text: 'Tests de pinzamiento (Neer, Hawkins-Kennedy) para reproducir el conflicto; Jobe para el supraespinoso; y el test de asistencia escapular para ver cuanto contribuye la mecanica escapular al sintoma.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['supraspinatus', 'serratus-anterior', 'trapezius'],
          testIds: ['neer', 'hawkins-kennedy', 'jobe', 'scapular-assistance'],
        },
        {
          id: 'interpret-grading',
          prompt: 'Jobe reproduce dolor en arco medio pero la fuerza se mantiene 10 segundos. Que sugiere esa graduacion?',
          answer: {
            text: 'Dolor con fuerza conservada orienta a tendinopatia/pinzamiento mas que a rotura: la respuesta es leve-moderada, no marcada. La ausencia de debilidad franca o caida del brazo aleja (sin descartar del todo) un desgarro completo.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['supraspinatus'],
          testIds: ['jobe'],
        },
        {
          id: 'treatment-reasoning',
          prompt: 'El test de asistencia escapular reduce claramente el dolor. Por donde empezar el tratamiento?',
          answer: {
            text: 'La mejoria con la asistencia escapular prioriza restaurar el ritmo escapulohumeral (activar trapecio inferior y serrato, elongar pectoral menor y trapecio superior) ANTES de cargar el manguito, junto con gestion de la carga del gesto de pintar techos.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['serratus-anterior', 'trapezius', 'pectoralis-minor'],
        },
        {
          id: 'reassessment',
          prompt: 'Que criterios indican que la progresion va bien?',
          answer: {
            text: 'Reduccion del dolor nocturno, ampliacion del arco indoloro, mejor calidad del gesto escapular y tolerancia creciente a la actividad laboral. Si tras varias semanas persiste debilidad o el arco no mejora, reconsiderar desgarro e imagen.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          testIds: ['jobe', 'neer'],
        },
      ],
    },
    {
      id: 'anterior-instability-young-athlete',
      title: 'Aprension en jugadora de voleibol de 22 anos',
      vignette: {
        text: 'Mujer de 22 anos, jugadora de voleibol, con un episodio previo de luxacion anterior del hombro dominante hace 8 meses, reducida en urgencias. Ahora refiere sensacion de que el hombro "se va a salir" al armar el remate (brazo en abduccion y rotacion externa) y evita esa posicion. Rango completo, fuerza casi normal.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      steps: [
        {
          id: 'hypothesis',
          prompt: 'Que explica la aprension en la posicion de remate tras una luxacion previa?',
          answer: {
            text: 'La posicion de abduccion + rotacion externa es la de maxima tension anterior; la aprension tras una luxacion anterior orienta a inestabilidad anterior con posible deficit de la contencion (lesion capsulolabral y/o subescapular).',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['subscapularis'],
        },
        {
          id: 'exam-plan',
          prompt: 'Como confirmar el origen anterior y diferenciarlo de un conflicto interno?',
          answer: {
            text: 'Maniobra de aprension seguida de recolocacion: si la aprension cede al empujar la cabeza humeral hacia atras, confirma inestabilidad anterior. Valorar tambien el subescapular (belly-press) como estabilizador anterior dinamico.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['subscapularis'],
          testIds: ['apprehension-relocation', 'belly-press'],
        },
        {
          id: 'interpret-grading',
          prompt: 'La aprension aparece temprano, con poca rotacion externa, y cede claramente con la recolocacion. Que grado sugiere?',
          answer: {
            text: 'Aprension precoz y franca indica inestabilidad anterior significativa; el alivio con la recolocacion confirma el origen anterior. En una deportista joven con luxacion previa, el riesgo de recidiva es alto.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          testIds: ['apprehension-relocation'],
        },
        {
          id: 'treatment-reasoning',
          prompt: 'Que prioriza el tratamiento conservador inicial?',
          answer: {
            text: 'Control neuromuscular: reforzar los estabilizadores dinamicos (manguito, en especial el subescapular) y el control escapular para suplir la contencion pasiva, evitando al inicio las posiciones de aprension y progresando hacia ellas de forma controlada.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['subscapularis', 'serratus-anterior'],
        },
        {
          id: 'reassessment',
          prompt: 'Que vigilar y cuando derivar?',
          answer: {
            text: 'Vigilar la tolerancia creciente a la posicion de remate sin aprension y la ausencia de nuevos episodios. La recidiva en deportista joven, o la aprension que no mejora, justifican valoracion quirurgica (reparacion capsulolabral).',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
        },
      ],
    },
  ],
};

/* ===========================================================================
 * THE SHOULDER TRACK
 * ======================================================================== */
export const SHOULDER_TRACK: RegionTrack = {
  regionId: 'shoulder',
  regionName: 'Hombro',
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
