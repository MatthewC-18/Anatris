// src/types/clinicalCase.ts
//
// Data model for interactive CLINICAL CASES — the feature that separates a
// physiotherapy study tool from a generic anatomy atlas. A case is a short
// patient vignette followed by a few guided multiple-choice steps that train
// CLINICAL REASONING (which structure, which nerve, which test, which first
// move), not just naming. Each step reveals an explanation so the student learns
// from a wrong answer.
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │ CLINICAL CONTENT DISCLAIMER                                                 │
// │ Cases are authored from standard physiotherapy reasoning as a teaching      │
// │ STARTING POINT. Before shipping in a professional product, every case must  │
// │ be verified against authoritative sources. They are educational, not        │
// │ diagnostic, and never replace clinical judgement.                           │
// └────────────────────────────────────────────────────────────────────────────┘
//
// All user-facing prose is Latin American Spanish; ids/keys stay ASCII.

/** Difficulty badge shown on the case card. */
export type CaseLevel = 'básico' | 'intermedio' | 'avanzado';

/** One answer option within a case step. Exactly one option is correct. */
export interface CaseOption {
  id: string;
  text: string;
  correct: boolean;
}

/** A single reasoning step: a question, options, and a teaching explanation. */
export interface CaseStep {
  id: string;
  /** The question posed at this step of the reasoning. */
  prompt: string;
  /** Options in authored order; exactly one has `correct: true`. */
  options: CaseOption[];
  /** Shown after answering (right or wrong) to teach the reasoning. */
  explanation: string;
}

/** A complete interactive clinical case for one region. */
export interface ClinicalCase {
  id: string;
  /** Owning region id (matches store.region / musclesByRegion keys). */
  region: string;
  title: string;
  level: CaseLevel;
  /** The patient scenario presented before the first step. */
  vignette: string;
  /** Short topic chips (e.g. "Manguito rotador", "C5–C6"). */
  tags: string[];
  /** The guided reasoning steps, in order. */
  steps: CaseStep[];
  /** The clinical pearl shown on completion. */
  takeaway: string;
}
