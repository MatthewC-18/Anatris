// src/data/shoulderPhases.ts
//
// The 7-phase pedagogical track for the SHOULDER. See src/types/pedagogy.ts.
//
// STATUS / AUTHORING NOTES (read before extending):
//   - Phases 1-3 (anatomy / biomechanics / palpation) are COMPLETE as data:
//     they only declare the ordered muscle ids and which MuscleContent field
//     groups to surface. The actual text comes from SHOULDER_MUSCLES at render
//     time, so there is nothing to translate or re-verify here.
//   - Phases 4-7 (tests / pathology / treatment / case) are SEEDED, not
//     finished. The clinical tests below were lifted from the existing
//     `clinicalNotes` of the muscle cards (Jobe, Gerber, Hornblower, Speed...)
//     and restated as first-class ClinicalTest entities (resumen punto 5).
//     The remaining entries are structural placeholders to be filled with the
//     expert content pass.
//   - EVERY new locator stays pageVerified:false. Never invent a page.
//   - Muscle ids are kebab-case, aligned with SHOULDER_MUSCLES / shoulder.ts.
//   - User-facing text in Latin American Spanish. (This file uses unaccented
//     ASCII in code/comments per the project's encoding caution; accented
//     user-facing strings should be added the same controlled way the muscle
//     cards were — measure bytes before assuming.)

import type {
  RegionTrack,
  PerMusclePhase,
  TestsPhase,
  PathologyPhase,
  TreatmentPhase,
  CasePhase,
} from '../types/pedagogy';

/* ---------------------------------------------------------------------------
 * Ordered muscle ids for the per-muscle phases. Same order as the muscle cards
 * are grouped in shoulderMuscles.ts: cuff -> superficial movers -> scapulo-
 * thoracic -> biarticular. Adjust freely; this is the teaching sequence.
 * ------------------------------------------------------------------------ */
const SHOULDER_MUSCLE_ORDER: string[] = [
  // Rotator cuff
  'supraspinatus',
  'infraspinatus',
  'teres-minor',
  'subscapularis',
  // Superficial glenohumeral movers
  'deltoid',
  'pectoralis-major',
  'teres-major',
  'latissimus-dorsi',
  // Scapulothoracic movers
  'trapezius',
  'serratus-anterior',
  'rhomboids',
  'levator-scapulae',
  'pectoralis-minor',
  'subclavius',
  'omohyoid',
  // Biarticular arm muscles
  'biceps-brachii',
  'triceps-brachii',
  'coracobrachialis',
];

/* ===========================================================================
 * PHASE 1 — ANATOMY (per-muscle projection)
 * ======================================================================== */
const anatomy: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: SHOULDER_MUSCLE_ORDER,
  fields: ['origin', 'insertion', 'innervation'],
};

/* ===========================================================================
 * PHASE 2 — BIOMECHANICS (per-muscle projection)
 * ======================================================================== */
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
};

/* ===========================================================================
 * PHASE 3 — PALPATION (per-muscle projection)
 * ======================================================================== */
const palpation: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: SHOULDER_MUSCLE_ORDER,
  fields: ['palpation'],
};

/* ===========================================================================
 * PHASE 4 — TESTS (region-level). Seeded from existing card clinicalNotes.
 * ======================================================================== */
const tests: TestsPhase = {
  scope: 'region',
  tests: [
    {
      id: 'jobe',
      name: 'Prueba de Jobe (lata vacia)',
      assesses: {
        text: 'Integridad y dolor del supraespinoso.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Brazo en el plano escapular a 90 grados, rotacion interna (pulgar abajo); el evaluador aplica resistencia hacia abajo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor o debilidad al resistir la elevacion orienta a tendinopatia o rotura del supraespinoso.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      targetMuscleIds: ['supraspinatus'],
    },
    {
      id: 'gerber-lift-off',
      name: 'Prueba de Gerber (lift-off)',
      assesses: {
        text: 'Funcion del subescapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Mano sobre la espalda baja; el paciente intenta separarla de la espalda contra resistencia.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Incapacidad de separar la mano o dolor orienta a lesion del subescapular.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      targetMuscleIds: ['subscapularis'],
    },
    {
      id: 'hornblower',
      name: 'Signo de Hornblower (del trompetista)',
      assesses: {
        text: 'Funcion del redondo menor (rotadores externos).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Brazo en abduccion; se pide mantener la rotacion externa.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Incapacidad de mantener la rotacion externa orienta a lesion del redondo menor.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      targetMuscleIds: ['teres-minor'],
    },
    {
      id: 'speed',
      name: 'Prueba de Speed',
      assesses: {
        text: 'Tendinopatia de la porcion larga del biceps.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Hombro flexionado, codo extendido y antebrazo supinado; se resiste la flexion del hombro.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Dolor en el surco intertubercular orienta a compromiso de la porcion larga del biceps.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      targetMuscleIds: ['biceps-brachii'],
    },
    // TODO expert pass: belly-press, external rotation lag sign, Neer/Hawkins
    // (impingement), apprehension, etc.
  ],
};

/* ===========================================================================
 * PHASE 5 — PATHOLOGY (region-level). Seeded; expand in expert pass.
 * ======================================================================== */
const pathology: PathologyPhase = {
  scope: 'region',
  pathologies: [
    {
      id: 'rotator-cuff-tear',
      name: 'Rotura del manguito rotador',
      description: {
        text: 'Desgarro parcial o completo de los tendones del manguito; el supraespinoso es el sitio mas frecuente.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['supraspinatus', 'infraspinatus', 'subscapularis', 'teres-minor'],
      relatedTestIds: ['jobe', 'gerber-lift-off'],
    },
    {
      id: 'subacromial-impingement',
      name: 'Sindrome de pinzamiento subacromial',
      description: {
        text: 'Compresion del tendon del supraespinoso en el espacio subacromial durante la elevacion.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['supraspinatus'],
      relatedTestIds: ['jobe'],
    },
    {
      id: 'scapular-dyskinesis',
      name: 'Discinesia escapular',
      description: {
        text: 'Alteracion del ritmo escapulohumeral por desequilibrio entre estabilizadores escapulares.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedMuscleIds: ['serratus-anterior', 'trapezius', 'rhomboids', 'pectoralis-minor'],
    },
    // TODO expert pass: long-head biceps tendinopathy/rupture, anterior
    // instability, axillary nerve palsy, long thoracic nerve palsy, adhesive
    // capsulitis.
  ],
};

/* ===========================================================================
 * PHASE 6 — TREATMENT (region-level). Structural placeholder.
 * ======================================================================== */
const treatment: TreatmentPhase = {
  scope: 'region',
  principles: [
    {
      id: 'restore-scapulohumeral-rhythm',
      title: 'Restaurar el ritmo escapulohumeral',
      rationale: {
        text: 'Reequilibrar el par trapecio-serrato para recuperar la rotacion superior escapular antes de cargar la elevacion del brazo.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      relatedPathologyIds: ['scapular-dyskinesis', 'subacromial-impingement'],
    },
    // TODO expert pass: cuff strengthening progressions, ER/IR balance,
    // pectoralis minor lengthening, load management, return-to-sport criteria.
  ],
};

/* ===========================================================================
 * PHASE 7 — CLINICAL CASE (region-level). One seeded case.
 * ======================================================================== */
const caseStudy: CasePhase = {
  scope: 'region',
  cases: [
    {
      id: 'painful-arc-overhead-worker',
      title: 'Dolor en arco medio en trabajador de brazos elevados',
      vignette: {
        text: 'Paciente de 45 anos, pintor, con dolor lateral del hombro al elevar el brazo entre 60 y 120 grados, de semanas de evolucion.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      steps: [
        {
          id: 'localize',
          prompt: 'Que estructura explica mejor un arco doloroso medio?',
          answer: {
            text: 'El paso del supraespinoso bajo el arco coracoacromial durante la elevacion sugiere pinzamiento subacromial.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['supraspinatus'],
          testIds: ['jobe'],
        },
        // TODO expert pass: differential, exam plan, treatment reasoning,
        // reassessment criteria.
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
