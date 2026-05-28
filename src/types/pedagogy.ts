// src/types/pedagogy.ts
//
// Type definitions for the 7-phase pedagogical track that is Anatris's core
// differentiator: teaching the student to REASON like a physiotherapist, in a
// deliberate order, rather than just browsing an atlas.
//
// THE 7 PHASES (fixed order):
//   1. anatomy        Anatomia        origin / insertion / innervation
//   2. biomechanics   Biomecanica     actions, force couples, ROM, synergies
//   3. palpation      Palpacion       how to locate and feel each muscle
//   4. tests          Tests clinicos  special tests, grouped, cross-muscle
//   5. pathology      Patologia       region-level injuries & syndromes
//   6. treatment      Tratamiento     intervention reasoning
//   7. case           Caso clinico    an integrative clinical case
//
// CORE DESIGN PRINCIPLE: phases REFERENCE existing content, they do not copy it.
//   - Phases 1-3 are PER-MUSCLE PROJECTIONS of fields that already live in
//     MuscleContent (src/data/shoulderMuscles.ts). They store WHICH muscles and
//     WHICH field groups to surface, never the text itself. Edit a muscle card
//     and these phases update automatically.
//   - Phases 4-7 are REGION-LEVEL and hold their own SourcedText content (tests,
//     syndromes, treatment, case). They may reference muscles by id to link back
//     to the 3D model and the muscle cards, but they introduce new material that
//     does not belong to any single muscle.
//
// All citations reuse the existing Citation / SourcedText types so the "source
// next to the claim" guarantee is identical across the whole app, and every new
// locator stays pageVerified:false until checked against the physical editions.
//
// Spanish for user-facing strings; English for code/identifiers.

import type { SourcedText } from './muscleContent';
import type { CameraView } from './anatomy';
import type { RomMuscleRole } from './rom';

/** The seven phases, in their fixed pedagogical order. */
export type PhaseId =
  | 'anatomy'
  | 'biomechanics'
  | 'palpation'
  | 'tests'
  | 'pathology'
  | 'treatment'
  | 'case';

/** Canonical ordering + display metadata for the phases. Single source of
 *  truth for tab order, numbering and labels. */
export const PHASE_ORDER: readonly PhaseId[] = [
  'anatomy',
  'biomechanics',
  'palpation',
  'tests',
  'pathology',
  'treatment',
  'case',
] as const;

export interface PhaseMeta {
  id: PhaseId;
  /** 1-based step number shown to the user. */
  step: number;
  /** User-facing label, Spanish. */
  label: string;
  /** One-line description of what this phase teaches, Spanish. */
  blurb: string;
  /** Whether the phase is walked muscle-by-muscle or shown region-wide. */
  scope: 'per-muscle' | 'region';
}

export const PHASE_META: Record<PhaseId, PhaseMeta> = {
  anatomy: {
    id: 'anatomy',
    step: 1,
    label: 'Anatomia',
    blurb: 'Origen, insercion e inervacion de cada musculo de la region.',
    scope: 'per-muscle',
  },
  biomechanics: {
    id: 'biomechanics',
    step: 2,
    label: 'Biomecanica',
    blurb: 'Acciones, pares de fuerzas y sinergias que mueven la region.',
    scope: 'per-muscle',
  },
  palpation: {
    id: 'palpation',
    step: 3,
    label: 'Palpacion',
    blurb: 'Como localizar y palpar cada musculo bajo la piel.',
    scope: 'per-muscle',
  },
  tests: {
    id: 'tests',
    step: 4,
    label: 'Tests clinicos',
    blurb: 'Pruebas especiales para valorar cada estructura.',
    scope: 'region',
  },
  pathology: {
    id: 'pathology',
    step: 5,
    label: 'Patologia',
    blurb: 'Lesiones y sindromes frecuentes de la region.',
    scope: 'region',
  },
  treatment: {
    id: 'treatment',
    step: 6,
    label: 'Tratamiento',
    blurb: 'Razonamiento de intervencion: que, por que y cuando.',
    scope: 'region',
  },
  case: {
    id: 'case',
    step: 7,
    label: 'Caso clinico',
    blurb: 'Un caso que integra todo el razonamiento de la region.',
    scope: 'region',
  },
};

/* ===========================================================================
 * GUIDED GESTURE (optional enrichment for the biomechanics phase)
 * ===========================================================================
 *
 * A GestureGuide is a STEP-BY-STEP narration of a movement (e.g. abduction),
 * played alongside the live 3D model. Each step does three things at once,
 * reusing mechanisms the store already has:
 *   - lights the involved muscles by role (feeds setRomPhase -> romHighlight),
 *   - moves the camera to the most legible view (feeds requestView),
 *   - shows a clinical caption explaining what happens in that part of range.
 *
 * This is the honest alternative to deforming the rigid model: the movement is
 * NARRATED over the real, highlighted anatomy rather than faked with skinning.
 * It is OPTIONAL on a phase, so phases/regions without a guide are unaffected.
 */

/** One muscle's role within a guided step (matches the ROM role palette). */
export interface GuideStepMuscle {
  /** Muscle id (kebab-case, must exist in the region's content index). */
  id: string;
  /** Role in THIS step: prime-mover (amber), assistant (sky), stabilizer (violet). */
  role: RomMuscleRole;
}

/** A movement-direction marker drawn over the model during a step (optional).
 *  The 3D layer interprets these; data stays view-agnostic. */
export interface GuideStepMarker {
  /** Which arrow/axis to draw. 'abduction-arc' = curved arrow of the gesture;
   *  'gh-axis' = the glenohumeral rotation axis line. */
  kind: 'abduction-arc' | 'gh-axis' | 'none';
}

/** A single guided step. */
export interface GuideStep {
  /** Stable id, kebab-case. */
  id: string;
  /** Short title, e.g. "Fase de ajuste (0-15 grados)". Spanish. */
  title: string;
  /** Approximate range this step covers, e.g. "0-15 grados". Spanish, optional. */
  rangeLabel?: string;
  /** The clinical narration for this part of the range. */
  caption: SourcedText;
  /** Muscles to light up, by role. Drives setRomPhase. */
  muscles: GuideStepMuscle[];
  /** Camera view to request for this step. */
  view: CameraView;
  /** Side to isolate while teaching this gesture (keeps the scene readable). */
  side?: 'right' | 'left' | 'both';
  /** Optional movement marker to draw over the model. */
  marker?: GuideStepMarker;
}

/** A full guided gesture: an ordered sequence of steps under a named movement. */
export interface GestureGuide {
  /** Stable id used as the movementId for setRomPhase, e.g. "abduction". */
  movementId: string;
  /** User-facing gesture name, Spanish, e.g. "Abduccion". */
  name: string;
  /** Short framing shown before stepping through, Spanish. */
  intro: SourcedText;
  /** Ordered steps walked with Prev/Next. */
  steps: GuideStep[];
}

/* ===========================================================================
 * PHASES 1-3 - PER-MUSCLE PROJECTIONS (reference MuscleContent, no text here)
 * ======================================================================== */

/** Field groups of MuscleContent that a per-muscle phase surfaces. The UI maps
 *  each group to the concrete MuscleContent fields; the phase never duplicates
 *  the text. */
export type MuscleField =
  | 'origin'
  | 'insertion'
  | 'innervation'
  | 'actions'
  | 'biomechanics'
  | 'functionalPositions'
  | 'synergists'
  | 'antagonists'
  | 'palpation';

/** A per-muscle phase: an ordered list of muscle ids to walk through, plus the
 *  MuscleContent field groups to show for each. Optional `intro` adds a short
 *  region-level framing shown before the muscle walk-through. Optional `guides`
 *  add step-by-step gesture narrations (used by the biomechanics phase). */
export interface PerMusclePhase {
  scope: 'per-muscle';
  /** Ordered muscle ids (kebab-case, must exist in the region's content index). */
  muscleIds: string[];
  /** Which MuscleContent field groups this phase surfaces, in display order. */
  fields: MuscleField[];
  /** Optional region-level framing shown at the top of the phase. */
  intro?: SourcedText;
  /** Optional guided gesture narrations (biomechanics phase). Unused elsewhere. */
  guides?: GestureGuide[];
}

/* ===========================================================================
 * PHASE 4 - TESTS (region-level, cross-muscle)
 * ======================================================================== */

/** One interpretive grade of a test's response. The response to a clinical
 *  test is rarely binary: it varies in intensity and meaning ("hay casos y
 *  casos"). Each grade pairs an observed finding with what it suggests. */
export interface TestGrade {
  /** The observed response, e.g. "Dolor leve al final del rango, sin debilidad". */
  finding: string;
  /** What that response suggests clinically. */
  interpretation: SourcedText;
}

/** Graded-response guidance for a test. All fields optional so existing tests
 *  remain valid while the expert pass fills them in. */
export interface TestGrading {
  /** How long the patient should sustain the position and what sustain time
   *  tells you (e.g. holds 10s vs. gives way at 2s). */
  holdTime?: SourcedText;
  /** Distinguishing pain-limited from true weakness, and what each implies. */
  painVsWeakness?: SourcedText;
  /** Interpretation by intensity of response (mild / moderate / marked). */
  grades?: TestGrade[];
}

/** A clinical special test. Pulls the per-test prose out of individual muscle
 *  cards into a first-class entity (resumen punto 5). */
export interface ClinicalTest {
  /** Stable id, kebab-case, e.g. "jobe", "gerber-lift-off". */
  id: string;
  /** User-facing name, e.g. "Prueba de Jobe (lata vacia)". */
  name: string;
  /** What the test assesses, Spanish. */
  assesses: SourcedText;
  /** How to perform it. */
  procedure: SourcedText;
  /** What a positive result means. */
  positiveSign: SourcedText;
  /** Graded-response interpretation: sustain time, pain-vs-weakness, grades.
   *  Optional; the "hay casos y casos" nuance physios asked for. */
  grading?: TestGrading;
  /** Muscle ids this test primarily targets (link back to cards & 3D). */
  targetMuscleIds: string[];
}

export interface TestsPhase {
  scope: 'region';
  intro?: SourcedText;
  tests: ClinicalTest[];
}

/* ===========================================================================
 * PHASE 5 - PATHOLOGY (region-level)
 * ======================================================================== */

export interface Pathology {
  id: string;
  name: string;
  /** Brief description / mechanism. */
  description: SourcedText;
  /** Typical presentation, optional. */
  presentation?: SourcedText;
  /** Muscle ids most involved (link back to cards & 3D). */
  relatedMuscleIds: string[];
  /** Tests (by ClinicalTest.id) useful for this pathology, optional. */
  relatedTestIds?: string[];
}

export interface PathologyPhase {
  scope: 'region';
  intro?: SourcedText;
  pathologies: Pathology[];
}

/* ===========================================================================
 * PHASE 6 - TREATMENT (region-level)
 * ======================================================================== */

export interface TreatmentPrinciple {
  id: string;
  title: string;
  rationale: SourcedText;
  /** Optional concrete examples / cues. */
  examples?: SourcedText[];
  /** Pathology ids (by Pathology.id) this principle targets, optional. */
  relatedPathologyIds?: string[];
}

export interface TreatmentPhase {
  scope: 'region';
  intro?: SourcedText;
  principles: TreatmentPrinciple[];
}

/* ===========================================================================
 * PHASE 7 - CLINICAL CASE (region-level, integrative)
 * ======================================================================== */

/** A single reasoning step in the case: a question posed to the student and the
 *  worked answer, optionally linking the structures involved. */
export interface CaseStep {
  id: string;
  /** The clinical question, Spanish. */
  prompt: string;
  /** The worked reasoning / answer. */
  answer: SourcedText;
  /** Muscle ids involved in this step, optional (link to cards & 3D). */
  muscleIds?: string[];
  /** Test ids relevant to this step, optional. */
  testIds?: string[];
}

export interface ClinicalCase {
  id: string;
  title: string;
  /** The presenting scenario, Spanish. */
  vignette: SourcedText;
  steps: CaseStep[];
}

export interface CasePhase {
  scope: 'region';
  cases: ClinicalCase[];
}

/* ===========================================================================
 * THE REGION TRACK - all seven phases for one region (e.g. the shoulder)
 * ======================================================================== */

/** Maps each PhaseId to its concrete phase payload. The per-muscle/region split
 *  is enforced by each phase's own `scope` discriminant. */
export interface RegionPhases {
  anatomy: PerMusclePhase;
  biomechanics: PerMusclePhase;
  palpation: PerMusclePhase;
  tests: TestsPhase;
  pathology: PathologyPhase;
  treatment: TreatmentPhase;
  case: CasePhase;
}

/** A complete pedagogical track for an anatomical region. */
export interface RegionTrack {
  /** Region id, e.g. "shoulder" (aligns with regiones.ts). */
  regionId: string;
  /** User-facing region name, e.g. "Hombro". */
  regionName: string;
  /** The id of the MuscleContentIndex this track's per-muscle phases reference. */
  phases: RegionPhases;
}
