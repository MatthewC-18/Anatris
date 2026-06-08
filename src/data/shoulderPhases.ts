// src/data/shoulderPhases.ts
//
// The 7-phase pedagogical track for the SHOULDER. See src/types/pedagogy.ts.
//
// STATUS / AUTHORING NOTES (read before extending):
//   - Phases 1-3 (anatomy / biomechanics / palpation) are COMPLETE as data:
//     they only declare the ordered muscle ids and which MuscleContent field
//     groups to surface. The actual text comes from SHOULDER_MUSCLES at render
//     time, so there is nothing to translate or re-verify here.
//   - The biomechanics phase ALSO carries guided gestures (abduction, flexión,
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
//
// ENCODING / AUTHORING RULE:
//   - User-facing strings (name, intro/caption/answer/etc. text, title,
//     rangeLabel, finding, prompt, name, assesses/procedure/positiveSign, etc.):
//     Latin American Spanish WITH accents, enies and opening question marks,
//     UTF-8.
//   - Code, ids, keys, enum-like values (id, movementId, role, view, side,
//     scope, ref, *MuscleIds, *TestIds, *PathologyIds) and comments: ASCII.
//   - Editor ALWAYS UTF-8 without BOM.

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
  movementId: 'glenohumeral-abduction',
  name: 'Abducción',
  intro: {
    text: 'La abducción lleva el brazo lateralmente en el plano frontal. Es un gesto coordinado: el manguito centra la cabeza humeral, el deltoides eleva el brazo y la escápula rota hacia arriba para mantener la congruencia articular. Recorre los pasos para ver qué estructura domina en cada tramo del rango.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'setting-phase',
      title: 'Fase de ajuste',
      rangeLabel: '0-15 grados',
      caption: {
        text: 'El supraespinoso inicia la abducción y, junto con el resto del manguito, comprime y centra la cabeza humeral en la glenoides. En este primer tramo la escápula apenas se mueve (fase de ajuste): su posición es variable y todavia no contribuye al arco. Esta estabilizacion es la condición previa para que el deltoides pueda elevar el brazo sin que la cabeza ascienda contra el acromion.',
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
      rangeLabel: '15-30 grados',
      caption: {
        text: 'A partir de los ~15 grados la parte acromial (media) del deltoides se convierte en el motor principal de la abducción. El manguito sigue activo como depresor y centrador de la cabeza humeral: forma con el deltoides un par de fuerzas que evita el ascenso de la cabeza y el pinzamiento subacromial. En este tramo el aporte escapular todavia es escaso; el movimiento es predominantemente glenohumeral.',
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
        text: 'Superada la fase de ajuste, la escápula rota hacia arriba acompañando al húmero. Esta rotación no es un tramo aparte: ocurre a la vez que el deltoides sigue elevando el brazo. La proporción global del movimiento es de aproximadamente 2 a 1 (dos grados glenohumerales por cada grado escapular); de los ~180 grados de elevación total, alrededor de 120 son glenohumerales y 60 escapulares. El trapecio y el serrato anterior forman el par de fuerzas que produce esa rotación superior; sin ella, la elevación completa no es posible.',
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
      title: 'Elevación completa',
      rangeLabel: '90-180 grados',
      caption: {
        text: 'En el tramo final el deltoides y el supraespinoso completan la elevación mientras la rotación superior de la escápula, sostenida por trapecio y serrato, orienta la glenoides hacia arriba para mantener la congruencia y dejar espacio al troquíter. Un fallo del control escapular en esta fase reproduce el conflicto subacromial.',
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
  movementId: 'glenohumeral-flexion',
  name: 'Flexión',
  intro: {
    text: 'La flexión lleva el brazo hacia adelante en el plano sagital. Los flexores anteriores elevan el húmero mientras el manguito centra la cabeza y la escápula rota hacia arriba, igual que en la abducción, para mantener la congruencia en la elevación.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'initiation',
      title: 'Inicio de la flexión',
      rangeLabel: '0-60 grados',
      caption: {
        text: 'La parte clavicular (anterior) del deltoides y la cabeza clavicular del pectoral mayor inician la flexión. El coracobraquial asiste llevando el brazo adelante. El manguito centra la cabeza humeral desde el primer grado.',
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
      title: 'Elevación media',
      rangeLabel: '60-120 grados',
      caption: {
        text: 'El deltoides anterior sostiene la elevación mientras la escápula comienza su rotación superior. Igual que en la abducción, el trapecio y el serrato anterior forman el par de fuerzas que orienta la glenoides hacia arriba, condición necesaria para seguir elevando sin conflicto.',
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
      title: 'Flexión completa',
      rangeLabel: '120-180 grados',
      caption: {
        text: 'En el tramo final, la rotación superior de la escápula sostenida por trapecio y serrato permite alcanzar la posición por encima de la cabeza. La pérdida de control escapular aquí limita la elevación y favorece el pinzamiento.',
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
  movementId: 'glenohumeral-internal-rotation',
  name: 'Rotación interna',
  intro: {
    text: 'La rotación interna gira el húmero hacia adentro alrededor de su eje longitudinal. Es un movimiento esencialmente glenohumeral: el subescapular es el motor del manguito y los grandes rotadores internos (pectoral mayor, dorsal ancho, redondo mayor) aportan potencia cuando hay carga.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'cuff-driver',
      title: 'El subescapular como motor del manguito',
      rangeLabel: '0-45 grados',
      caption: {
        text: 'El subescapular es el único componente anterior del manguito y el principal rotador interno fino; además previene la traslación anterior de la cabeza humeral. Inicia y controla la rotación interna con precision, incluso sin carga externa.',
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
        text: 'Cuando se requiere fuerza, el pectoral mayor y el dorsal ancho se suman como rotadores internos potentes; el redondo mayor contribuye sobre todo contra resistencia, no en la rotación libre. El subescapular sigue centrando la cabeza humeral mientras estos generan el torque.',
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
    {
      id: 'clinical-relevance-ir',
      title: 'Relevancia clinica',
      rangeLabel: 'Sintesis',
      caption: {
        text: 'El subescapular cumple doble papel: rota internamente y, sobre todo, frena la traslación anterior de la cabeza humeral, por lo que es un estabilizador clave en la inestabilidad anterior. El predominio de los rotadores internos potentes (pectoral, dorsal) sobre los externos del manguito favorece la rotación interna en reposo y se asocia al conflicto subacromial: por eso, en el tratamiento, equilibrar ambos grupos es más importante que solo ganar fuerza interna.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'subscapularis', role: 'prime-mover' },
        { id: 'pectoralis-major', role: 'stabilizer' },
        { id: 'latissimus-dorsi', role: 'stabilizer' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const EXTERNAL_ROTATION_GUIDE: GestureGuide = {
  movementId: 'glenohumeral-external-rotation',
  name: 'Rotación externa',
  intro: {
    text: 'La rotación externa gira el húmero hacia afuera alrededor de su eje longitudinal. Depende casi por completo del infraespinoso y el redondo menor, los rotadores externos del manguito. Es un grupo pequeño pero clave para la estabilidad posterior y el gesto de lanzamiento.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'primary-rotators',
      title: 'Infraespinoso y redondo menor',
      rangeLabel: '0-45 grados',
      caption: {
        text: 'El infraespinoso es el principal rotador externo; el redondo menor lo asiste. Juntos refuerzan la cápsula posterior y centran la cabeza humeral mientras la giran hacia afuera. Son los únicos rotadores externos relevantes, por eso su debilidad se nota de inmediato.',
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
        text: 'Con el brazo en abducción, las fibras posteriores del deltoides pueden asistir la rotación externa; con el codo pegado al cuerpo su aporte es menor y discutido. El manguito posterior (infraespinoso y redondo menor) sigue siendo el motor principal en cualquier posición.',
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
    {
      id: 'clinical-relevance-er',
      title: 'Relevancia clinica',
      rangeLabel: 'Sintesis',
      caption: {
        text: 'Como solo dos músculos pequeños generan la rotación externa, su debilidad limita de inmediato el gesto y desplaza el equilibrio hacia los rotadores internos, más potentes. Esto importa especialmente en deportes de lanzamiento, donde la rotación externa controlada en abducción es decisiva, y en la prevención del conflicto: unos rotadores externos competentes ayudan a reorientar el troquíter y a mantener el espacio subacromial durante la elevación.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'infraspinatus', role: 'prime-mover' },
        { id: 'teres-minor', role: 'assistant' },
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
    text: 'La respuesta a un test no es solo positiva o negativa: importa cuánto sostiene el paciente la posición, contra cuánta resistencia, en qué parte del rango aparece el síntoma, y si cede por dolor o por debilidad real. Cada test incluye una guia de graduación para interpretar esos matices.',
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
        text: 'Brazo en el plano escapular a 90 grados, rotación interna completa (pulgar hacia abajo, como vaciando una lata); el evaluador aplica resistencia hacia abajo mientras el paciente intenta mantener la posición.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor, debilidad o ambos al resistir la elevación orientan a tendinopatía o rotura del supraespinoso.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        holdTime: {
          text: 'Se pide sostener la resistencia unos 5-10 segundos. Un brazo que cede de inmediato sugiere mayor compromiso que uno que se mantiene con molestia tolerable hasta el final.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        painVsWeakness: {
          text: 'Dolor sin pérdida de fuerza orienta a tendinopatía o pinzamiento; debilidad franca (el brazo cae aunque el paciente lo intente) orienta a rotura significativa del tendón. La debilidad indolora es la más sospechosa de desgarro completo.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        grades: [
          {
            finding: 'Leve: molestia al final del rango, fuerza conservada.',
            interpretation: {
              text: 'Compatible con irritación tendinosa o pinzamiento incipiente.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Moderada: dolor durante el sostenido con leve pérdida de fuerza.',
            interpretation: {
              text: 'Sugiere tendinopatía establecida o desgarro parcial.',
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
        text: 'Con la escápula estabilizada, el evaluador eleva pasivamente el brazo en flexión/rotación interna hasta el final del rango, comprimiendo el troquíter contra el acromion.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en el arco superior de la elevación pasiva indica pinzamiento.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'Es un test pasivo, así que valora dolor, no fuerza. El dolor que aparece antes en el rango sugiere un conflicto subacromial más irritable.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        grades: [
          {
            finding: 'Leve: dolor solo en el tope máximo de elevación.',
            interpretation: {
              text: 'Conflicto subacromial de bajo grado o por sobreuso.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: dolor temprano y aprensión a continuar el movimiento.',
            interpretation: {
              text: 'Pinzamiento más irritable; reevaluar tras infiltración (test de Neer modificado) ayuda a confirmar el origen subacromial.',
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
        text: 'Hombro y codo a 90 grados de flexión; el evaluador realiza rotación interna pasiva del hombro, llevando el troquíter bajo el ligamento coracoacromial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor durante la rotación interna indica pinzamiento subacromial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        grades: [
          {
            finding: 'Leve: molestia al final de la rotación interna.',
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
      name: 'Rotación externa resistida',
      assesses: {
        text: 'Infraespinoso y redondo menor (rotadores externos).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Codo a 90 grados pegado al cuerpo, antebrazo en posición neutra; el paciente realiza rotación externa contra resistencia del evaluador.',
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
          text: 'La debilidad marcada con poco dolor orienta a desgarro de los rotadores externos; el dolor con fuerza conservada, a tendinopatía.',
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
        text: 'El evaluador coloca pasivamente el hombro en rotación externa casi máxima con el codo a 90 grados y pide al paciente mantenerla.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Incapacidad de mantener la rotación externa (el antebrazo "cae" hacia la rotación interna) indica déficit de los rotadores externos.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        grades: [
          {
            finding: 'Leve: pequeño retraso (lag) de pocos grados.',
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
        text: 'Función del redondo menor.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Brazo en abducción a 90 grados en el plano escapular; se pide mantener la rotación externa contra resistencia.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Incapacidad de mantener la rotación externa en abducción orienta a lesión del redondo menor.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'La incapacidad suele ser por debilidad (déficit del redondo menor) más que por dolor; obliga a llevar la mano a la boca con el brazo, como un trompetista.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['teres-minor'],
    },
    {
      id: 'gerber-lift-off',
      name: 'Prueba de Gerber (lift-off)',
      assesses: {
        text: 'Función del subescapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Mano sobre la espalda baja (rotación interna); el paciente intenta separarla de la espalda contra resistencia del evaluador.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Incapacidad de separar la mano o de mantenerla separada orienta a lesión del subescapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        holdTime: {
          text: 'Tras separar la mano, se pide mantenerla alejada de la espalda. Si vuelve a caer hacia la espalda (lag) hay déficit; cuanto antes cae, mayor el compromiso.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        painVsWeakness: {
          text: 'La debilidad/lag indoloro orienta a rotura del subescapular; el dolor sin lag, a tendinopatía. Requiere rotación interna suficiente para alcanzar la posición (si no, usar belly-press).',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['subscapularis'],
    },
    {
      id: 'belly-press',
      name: 'Prueba de belly-press (presión abdominal)',
      assesses: {
        text: 'Función del subescapular cuando la rotación interna está limitada.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'La palma sobre el abdomen; el paciente presiona el vientre manteniendo el codo adelante (sin dejarlo caer hacia atras), lo que exige rotación interna activa.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Si el codo cae hacia atras y la muñeca se flexiona para compensar, el subescapular es deficitario.',
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
            finding: 'Marcada: el codo cae claramente atras y compensa con la muñeca.',
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
      name: 'Aprensión y recolocación (inestabilidad anterior)',
      assesses: {
        text: 'Inestabilidad glenohumeral anterior.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'En decúbito supino, hombro a 90 grados de abducción y rotación externa progresiva (aprensión). Si aparece aprensión, el evaluador aplica una fuerza posterior sobre la cabeza humeral (recolocación).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Sensación de que el hombro "se va a salir" en aprensión, que se alivia con la maniobra de recolocación, orienta a inestabilidad anterior.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'Lo relevante aquí no es dolor ni fuerza, sino la APRENSION (miedo a la luxación). El alivio con la recolocación confirma el origen anterior; el dolor posterior sin aprensión orienta más a conflicto interno.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        grades: [
          {
            finding: 'Leve: aprensión solo cerca del final del rango de rotación externa.',
            interpretation: {
              text: 'Inestabilidad anterior leve o microinestabilidad.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: aprensión temprana y franca con mínima rotación externa.',
            interpretation: {
              text: 'Inestabilidad anterior significativa, frecuente tras luxación previa.',
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
        text: 'Tendinopatía de la porcion larga del biceps.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Hombro en flexión a 90 grados, codo extendido y antebrazo supinado; se resiste la flexión del hombro.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en el surco intertubercular orienta a compromiso de la porcion larga del biceps.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'El hallazgo clave es el dolor localizado en el surco, no la debilidad. Dolor difuso inespecífico baja la utilidad del test.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      },
      targetMuscleIds: ['biceps-brachii'],
    },
    {
      id: 'yergason',
      name: 'Prueba de Yergason',
      assesses: {
        text: 'Porcion larga del biceps y estabilidad del tendón en el surco.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Codo a 90 grados, antebrazo pronado; el paciente realiza supinación resistida (y rotación externa) contra el evaluador.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en el surco intertubercular, o sensación de resalte del tendón, orientan a tendinopatía o inestabilidad de la porcion larga del biceps.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        grades: [
          {
            finding: 'Leve: dolor en el surco sin resalte.',
            interpretation: {
              text: 'Tendinopatía de la porcion larga del biceps.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Marcada: resalte palpable del tendón fuera del surco.',
            interpretation: {
              text: 'Sugiere inestabilidad o subluxación del tendón, a menudo con lesión del subescapular asociada.',
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
        text: 'Mientras el paciente eleva el brazo, el evaluador asiste manualmente la rotación superior y la basculación posterior de la escápula.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Si la asistencia escapular reduce el dolor o mejora el rango, la mecánica escapular está contribuyendo al síntoma.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'No mide fuerza: mide cuánto cambia el síntoma al corregir la escápula. Una gran mejoría orienta el tratamiento hacia el control escapular antes que hacia la estructura glenohumeral.',
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
        text: 'Desgarro parcial o completo de los tendones del manguito; el supraespinoso es el sitio más frecuente, a menudo en continuidad con el infraespinoso.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor lateral del hombro, debilidad para la elevación y la rotación externa, dificultad para dormir sobre el lado afecto. La debilidad indolora sugiere desgarro completo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['supraspinatus', 'infraspinatus', 'subscapularis', 'teres-minor'],
      relatedTestIds: ['jobe', 'external-rotation-resisted', 'external-rotation-lag-sign', 'gerber-lift-off'],
    },
    {
      id: 'subacromial-impingement',
      name: 'Síndrome de pinzamiento subacromial',
      description: {
        text: 'Compresion del tendón del supraespinoso y la bolsa subacromial en el espacio bajo el arco coracoacromial durante la elevación.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor en arco medio (60-120 grados) de la elevación, frecuente en trabajos y deportes con brazos por encima de la cabeza. A menudo coexiste con discinesia escapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['supraspinatus'],
      relatedTestIds: ['neer', 'hawkins-kennedy', 'jobe'],
    },
    {
      id: 'biceps-long-head-tendinopathy',
      name: 'Tendinopatía/rotura de la porcion larga del biceps',
      description: {
        text: 'Irritacion o rotura del tendón de la porcion larga del biceps en el surco intertubercular, con frecuencia asociada a patología del manguito o del subescapular.',
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
        text: 'Perdida de la contención anterior de la cabeza humeral, frecuente tras una luxación anterior; puede asociar lesión de Bankart y déficit del subescapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Aprensión al colocar el brazo en abducción y rotación externa (posición de lanzamiento); episodios de subluxación o luxación recidivante en pacientes jóvenes y deportistas.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['subscapularis'],
      relatedTestIds: ['apprehension-relocation'],
    },
    {
      id: 'scapular-dyskinesis',
      name: 'Discinesia escapular',
      description: {
        text: 'Alteracion del ritmo escapulohumeral por desequilibrio entre estabilizadores escapulares (trapecio inferior y serrato débiles; trapecio superior y pectoral menor sobreactivos/acortados).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Aleteo o protracción excesiva de la escápula durante la elevación; suele acompañar y perpetuar el pinzamiento subacromial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['serratus-anterior', 'trapezius', 'rhomboids', 'pectoralis-minor'],
      relatedTestIds: ['scapular-assistance'],
    },
    {
      id: 'axillary-nerve-palsy',
      name: 'Parálisis del nervio axilar',
      description: {
        text: 'Lesion del nervio axilar, típicamente por luxación glenohumeral o fractura del cuello quirúrgico del húmero, que denerva el deltoides (y el redondo menor).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Debilidad de la abducción, atrofia del deltoides (signo de la charretera) y pérdida de sensibilidad en la cara lateral del hombro.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['deltoid', 'teres-minor'],
    },
    {
      id: 'long-thoracic-nerve-palsy',
      name: 'Parálisis del nervio torácico largo (escápula alada)',
      description: {
        text: 'Lesion del nervio torácico largo que denerva el serrato anterior, con pérdida de su función estabilizadora y de rotación superior.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Escapula alada clásica: el borde medial se despega del tórax, especialmente al empujar contra una pared o elevar el brazo al frente; limitacion de la elevación completa.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['serratus-anterior'],
    },
    {
      id: 'adhesive-capsulitis',
      name: 'Capsulitis adhesiva (hombro congelado)',
      description: {
        text: 'Inflamacion y fibrosis progresiva de la cápsula glenohumeral que restringe el rango tanto activo como pasivo, en fases de dolor, rigidez y recuperacion.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      presentation: {
        text: 'Perdida global del rango, sobre todo de la rotación externa pasiva, con dolor difuso; más frecuente en mujeres de mediana edad y en diabéticos.',
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
    text: 'El tratamiento se razona por mecanismo, no por receta. Estos principios orientan qué priorizar, por qué y cuándo, según el cuadro predominante.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  principles: [
    {
      id: 'restore-scapulohumeral-rhythm',
      title: 'Restaurar el ritmo escapulohumeral',
      rationale: {
        text: 'Reequilibrar el par trapecio-serrato para recuperar la rotación superior escapular ANTES de cargar la elevación del brazo: sin una base escapular estable, fortalecer el manguito reproduce el conflicto.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      examples: [
        {
          text: 'Activación del trapecio inferior y del serrato anterior (empujes con protracción, ejercicios en cadena cerrada) e inhibición/elongación del trapecio superior y el pectoral menor.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      ],
      relatedPathologyIds: ['scapular-dyskinesis', 'subacromial-impingement'],
    },
    {
      id: 'cuff-strengthening-progression',
      title: 'Progresion de fuerza del manguito rotador',
      rationale: {
        text: 'Recuperar la función depresora y centradora del manguito para que el deltoides eleve sin ascenso de la cabeza humeral. Se progresa de isométricos indoloros a trabajo dinámico en rangos crecientes.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      examples: [
        {
          text: 'Rotaciones externas/internas con el codo pegado al cuerpo, progresando a posiciones de mayor abducción; control de la carga por dolor y por calidad del gesto, no solo por kilos.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      ],
      relatedPathologyIds: ['rotator-cuff-tear', 'subacromial-impingement'],
    },
    {
      id: 'restore-external-internal-balance',
      title: 'Equilibrar rotadores externos e internos',
      rationale: {
        text: 'El predominio de rotadores internos (pectoral, dorsal, subescapular) sobre los externos favorece la rotación interna en reposo y el conflicto; fortalecer los rotadores externos reorienta el troquíter en la elevación.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['subacromial-impingement', 'rotator-cuff-tear'],
    },
    {
      id: 'stage-dependent-capsulitis',
      title: 'Tratar la capsulitis según la fase',
      rationale: {
        text: 'En la fase dolorosa priman el control del dolor y la movilidad suave dentro de la tolerancia; en la fase rígida, la ganancia progresiva de rango (sobre todo rotación externa). Forzar en fase irritable empeora el cuadro.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['adhesive-capsulitis'],
    },
    {
      id: 'instability-neuromuscular-control',
      title: 'Control neuromuscular en inestabilidad',
      rationale: {
        text: 'Tras inestabilidad anterior, el objetivo es reforzar los estabilizadores dinámicos (manguito, sobre todo subescapular) y el control escapular para suplir la contención pasiva pérdida, evitando las posiciones de aprensión al inicio.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['anterior-instability'],
    },
    {
      id: 'load-management',
      title: 'Gestion de la carga y del gesto repetido',
      rationale: {
        text: 'En cuadros por sobreuso (trabajo o deporte con brazos elevados), modificar temporalmente el volumen y la altura del gesto permite que el tejido tolere la progresión; la educación sobre la actividad es parte del tratamiento.',
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
      title: 'Dolor en arco medio en pintor de 45 años',
      vignette: {
        text: 'Hombre de 45 años, pintor de profesión. Refiere dolor lateral del hombro derecho de 6 semanas, que aparece al elevar el brazo entre 60 y 120 grados y al pintar techos. Le cuesta dormir sobre ese lado. No recuerda un traumatismo. La fuerza global parece conservada pero con molestia.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      steps: [
        {
          id: 'hypothesis',
          prompt: '¿Qué hipótesis explica mejor un dolor en arco medio por gesto repetido por encima de la cabeza?',
          answer: {
            text: 'El patrón (arco doloroso 60-120 grados, gesto overhead, sin trauma) orienta a un pinzamiento subacromial del supraespinoso, posiblemente con discinesia escapular asociada por el trabajo mantenido en elevación.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['supraspinatus'],
        },
        {
          id: 'exam-plan',
          prompt: '¿Qué exploración confirma o descarta esa hipótesis?',
          answer: {
            text: 'Tests de pinzamiento (Neer, Hawkins-Kennedy) para reproducir el conflicto; Jobe para el supraespinoso; y el test de asistencia escapular para ver cuánto contribuye la mecánica escapular al síntoma.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['supraspinatus', 'serratus-anterior', 'trapezius'],
          testIds: ['neer', 'hawkins-kennedy', 'jobe', 'scapular-assistance'],
        },
        {
          id: 'interpret-grading',
          prompt: 'Jobe reproduce dolor en arco medio pero la fuerza se mantiene 10 segundos. ¿Qué sugiere esa graduación?',
          answer: {
            text: 'Dolor con fuerza conservada orienta a tendinopatía/pinzamiento más que a rotura: la respuesta es leve-moderada, no marcada. La ausencia de debilidad franca o caida del brazo aleja (sin descartar del todo) un desgarro completo.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['supraspinatus'],
          testIds: ['jobe'],
        },
        {
          id: 'treatment-reasoning',
          prompt: 'El test de asistencia escapular reduce claramente el dolor. ¿Por dónde empezar el tratamiento?',
          answer: {
            text: 'La mejoría con la asistencia escapular prioriza restaurar el ritmo escapulohumeral (activar trapecio inferior y serrato, elongar pectoral menor y trapecio superior) ANTES de cargar el manguito, junto con gestión de la carga del gesto de pintar techos.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['serratus-anterior', 'trapezius', 'pectoralis-minor'],
        },
        {
          id: 'reassessment',
          prompt: '¿Qué criterios indican que la progresión va bien?',
          answer: {
            text: 'Reducción del dolor nocturno, ampliacion del arco indoloro, mejor calidad del gesto escapular y tolerancia creciente a la actividad laboral. Si tras varias semanas persiste debilidad o el arco no mejora, reconsiderar desgarro e imagen.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          testIds: ['jobe', 'neer'],
        },
      ],
    },
    {
      id: 'anterior-instability-young-athlete',
      title: 'Aprensión en jugadora de voleibol de 22 años',
      vignette: {
        text: 'Mujer de 22 años, jugadora de voleibol, con un episodio previo de luxación anterior del hombro dominante hace 8 meses, reducida en urgencias. Ahora refiere sensación de que el hombro "se va a salir" al armar el remate (brazo en abducción y rotación externa) y evita esa posición. Rango completo, fuerza casi normal.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      steps: [
        {
          id: 'hypothesis',
          prompt: '¿Qué explica la aprensión en la posición de remate tras una luxación previa?',
          answer: {
            text: 'La posición de abducción + rotación externa es la de máxima tension anterior; la aprensión tras una luxación anterior orienta a inestabilidad anterior con posible déficit de la contención (lesión capsulolabral y/o subescapular).',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['subscapularis'],
        },
        {
          id: 'exam-plan',
          prompt: '¿Cómo confirmar el origen anterior y diferenciarlo de un conflicto interno?',
          answer: {
            text: 'Maniobra de aprensión seguida de recolocación: si la aprensión cede al empujar la cabeza humeral hacia atras, confirma inestabilidad anterior. Valorar también el subescapular (belly-press) como estabilizador anterior dinámico.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['subscapularis'],
          testIds: ['apprehension-relocation', 'belly-press'],
        },
        {
          id: 'interpret-grading',
          prompt: 'La aprensión aparece temprano, con poca rotación externa, y cede claramente con la recolocación. ¿Qué grado sugiere?',
          answer: {
            text: 'Aprensión precoz y franca indica inestabilidad anterior significativa; el alivio con la recolocación confirma el origen anterior. En una deportista joven con luxación previa, el riesgo de recidiva es alto.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          testIds: ['apprehension-relocation'],
        },
        {
          id: 'treatment-reasoning',
          prompt: '¿Qué prioriza el tratamiento conservador inicial?',
          answer: {
            text: 'Control neuromuscular: reforzar los estabilizadores dinámicos (manguito, en especial el subescapular) y el control escapular para suplir la contención pasiva, evitando al inicio las posiciones de aprensión y progresando hacia ellas de forma controlada.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['subscapularis', 'serratus-anterior'],
        },
        {
          id: 'reassessment',
          prompt: '¿Qué vigilar y cuándo derivar?',
          answer: {
            text: 'Vigilar la tolerancia creciente a la posición de remate sin aprensión y la ausencia de nuevos episodios. La recidiva en deportista joven, o la aprensión que no mejora, justifican valoracion quirurgica (reparacion capsulolabral).',
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
